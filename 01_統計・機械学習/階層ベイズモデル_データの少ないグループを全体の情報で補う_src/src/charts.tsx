// charts.tsx — 学校のデータと、いくつもの場面で使うグラフの部品。
import React from 'react';
import { Arrow, C, linear, mix, type Scale } from './kit';
import data from './data.json';

export const DATA = data;
export type School = (typeof data.schools)[number];

// 色の役目（どの場面でも同じにする）
export const RAW = C.text; // 学校ごとの平均点（○）
export const POST = C.violet; // 階層ベイズの推定値（●）
export const MU = C.yellow; // 全体の平均 μ
export const TRUE = C.aqua; // 本当の実力（★）
export const PRIOR = '#9a9990'; // 事前分布
export const LIKE = C.blue; // 尤度
export const SMALL = C.orange; // 人数の少ない学校を目立たせる色
export const LARGE = C.blue; // 人数の多い学校を目立たせる色
export const CHAIN_COLORS = [C.blue, C.orange, C.aqua, C.yellow];

export const schoolByName = (name: string) => data.schools.find((school) => school.name === name)!;
/** 人数の少ない順 */
export const SCHOOLS_BY_N = [...data.schools].sort((a, b) => a.n - b.n);
export const SMALL_NAMES = ['C', 'G'];
export const LARGE_NAMES = ['E', 'B'];
export const highlightColor = (name: string, fallback = C.text2) => (SMALL_NAMES.includes(name) ? SMALL : LARGE_NAMES.includes(name) ? LARGE : fallback);

export const fmt1 = (value: number) => value.toFixed(1);

/** 星の形（本当の値の印） */
export const Star: React.FC<{ x: number; y: number; r?: number; color?: string; opacity?: number }> = ({ x, y, r = 13, color = TRUE, opacity = 1 }) => {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push(`${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return <polygon points={points.join(' ')} fill={color} stroke={C.bg} strokeWidth={1.5} opacity={opacity} />;
};

/** 点の列から、折れ線の path の文字列を作る */
export const polyline = (points: [number, number][]) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

/** ラベルが重ならないように、縦の位置を少しずつずらす（並び順は保つ） */
export const declutter = (positions: number[], minGap: number) => {
  const order = positions.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) if (order[k].y - order[k - 1].y < minGap) order[k].y = order[k - 1].y + minGap;
  // 下へずれた分の半分だけ、全体を上へ戻す
  const shift = (order.reduce((acc, item) => acc + item.y, 0) - [...positions].reduce((a, b) => a + b, 0)) / order.length;
  const result = new Array(positions.length);
  order.forEach((item) => (result[item.i] = item.y - shift));
  return result as number[];
};

// ---- 点数の横軸（いくつもの場面で使う） ----
export const ScoreAxis: React.FC<{ sx: Scale; y: number; from: number; to: number; ticks: number[]; label?: string; gridTop?: number }> = ({ sx, y, from, to, ticks, label = '点', gridTop }) => (
  <g>
    {gridTop !== undefined
      ? ticks.map((tick) => <line key={`g${tick}`} x1={sx(tick)} x2={sx(tick)} y1={gridTop} y2={y} stroke={C.grid} strokeWidth={1.5} />)
      : null}
    <line x1={sx(from)} x2={sx(to)} y1={y} y2={y} stroke={C.axis} strokeWidth={2} />
    {ticks.map((tick) => (
      <g key={tick}>
        <line x1={sx(tick)} x2={sx(tick)} y1={y} y2={y + 9} stroke={C.axis} strokeWidth={2} />
        <text x={sx(tick)} y={y + 36} fill={C.text2} fontSize={24} textAnchor="middle">
          {tick}
        </text>
      </g>
    ))}
    <text x={sx(to) + 18} y={y + 8} fill={C.text2} fontSize={24}>
      {label}
    </text>
  </g>
);

// ---- 学校ごとの行のグラフ（平均点 ○ → 推定値 ●）----
export type RowLayout = { left: number; right: number; top: number; rowHeight: number; from: number; to: number; labelX: number };
export type RowItem = { name: string; n: number; raw: number; post: number; truth?: number; lo?: number; hi?: number };

export const rowScales = (layout: RowLayout) => ({
  sx: linear(layout.from, layout.to, layout.left, layout.right),
  rowY: (index: number) => layout.top + layout.rowHeight * (index + 0.5),
});

/**
 * move: 0 で平均点の位置、1 で推定値の位置まで点が動く。arrow: 矢印の濃さ。
 * focus: 名前を書いた学校だけを濃く、ほかを薄くする（focusAmount が 1 のとき）
 */
export const ShrinkRows: React.FC<{
  layout: RowLayout;
  items: RowItem[];
  move: number;
  arrow: number;
  rowsShown?: number;
  interval?: number;
  truth?: number;
  focus?: string[];
  focusAmount?: number;
  labelSize?: number;
  dotRadius?: number;
}> = ({ layout, items, move, arrow, rowsShown = 1, interval = 0, truth = 0, focus = [], focusAmount = 0, labelSize = 30, dotRadius = 11 }) => {
  const { sx, rowY } = rowScales(layout);
  return (
    <g>
      {items.map((item, index) => {
        const y = rowY(index);
        const dim = focus.length > 0 && !focus.includes(item.name) ? mix(1, 0.3, focusAmount) : 1;
        const x = mix(sx(item.raw), sx(item.post), move);
        const showArrow = Math.abs(sx(item.post) - sx(item.raw)) > 26;
        return (
          <g key={item.name} opacity={rowsShown * dim}>
            <line x1={layout.left} x2={layout.right} y1={y} y2={y} stroke={C.grid} strokeWidth={1.5} />
            <text x={layout.labelX} y={y + 10} fill={highlightColor(item.name, C.text)} fontSize={labelSize} fontWeight={700} textAnchor="end">
              {item.name} 校
              <tspan fill={C.text2} fontWeight={400} fontSize={labelSize * 0.85}>
                {`　${item.n}人`}
              </tspan>
            </text>
            {interval > 0 && item.lo !== undefined && item.hi !== undefined ? (
              <line x1={sx(item.lo)} x2={mix(sx(item.lo), sx(item.hi), interval)} y1={y} y2={y} stroke={POST} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
            ) : null}
            {arrow > 0 && showArrow ? (
              <g opacity={arrow}>
                <Arrow x1={sx(item.raw)} y1={y} x2={sx(item.post) + Math.sign(sx(item.raw) - sx(item.post)) * (dotRadius + 4)} y2={y} color={POST} width={3} />
              </g>
            ) : null}
            <circle cx={sx(item.raw)} cy={y} r={dotRadius} fill={C.bg} stroke={RAW} strokeWidth={3.5} />
            {move > 0 ? <circle cx={x} cy={y} r={dotRadius} fill={POST} opacity={Math.min(1, move * 3)} /> : null}
            {truth > 0 && item.truth !== undefined ? <Star x={sx(item.truth)} y={y - 1} r={15} opacity={truth} /> : null}
          </g>
        );
      })}
    </g>
  );
};

/** ヒストグラム（密度）。bars の高さは maxDensity を基準にする */
export const Histogram: React.FC<{
  hist: { from: number; width: number; density: number[] };
  sx: Scale;
  baseline: number;
  height: number;
  maxDensity: number;
  color: string;
  grow?: number;
  highlight?: [number, number];
}> = ({ hist, sx, baseline, height, maxDensity, color, grow = 1, highlight }) => (
  <g>
    {hist.density.map((density, index) => {
      const x0 = hist.from + index * hist.width;
      const x1 = x0 + hist.width;
      const h = (density / maxDensity) * height * grow;
      const inside = highlight ? x1 > highlight[0] && x0 < highlight[1] : true;
      return <rect key={index} x={sx(x0) + 0.5} y={baseline - h} width={Math.max(0, sx(x1) - sx(x0) - 1)} height={h} fill={color} opacity={inside ? 0.9 : 0.35} />;
    })}
  </g>
);
