// グラフの部品（SVG）。場面は 1920×1080 の <svg> の中に、画面の座標で直接置く
import type React from 'react';
import {memo} from 'react';
import {COLOR, FONT, SIZE} from '../theme.ts';

export type Scale = (value: number) => number;
export const makeScale = (d0: number, d1: number, r0: number, r1: number): Scale => (value) =>
  r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);

export type Rect = {x: number; y: number; w: number; h: number};

export const Canvas: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={SIZE.width} height={SIZE.height} viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} style={{position: 'absolute', left: 0, top: 0}}>
    {children}
  </svg>
);

export const SvgText: React.FC<{
  x: number;
  y: number;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  opacity?: number;
  rotate?: number;
  children: React.ReactNode;
}> = ({x, y, size = SIZE.tick, color = COLOR.subText, anchor = 'middle', weight = 500, opacity = 1, rotate, children}) => (
  <text
    x={x}
    y={y}
    fontFamily={FONT}
    fontSize={size}
    fontWeight={weight}
    fill={color}
    textAnchor={anchor}
    dominantBaseline="central"
    opacity={opacity}
    transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
  >
    {children}
  </text>
);

// グラフの枠：地、目盛り線、目盛りの数字、軸の名前
export const PlotFrame: React.FC<{
  rect: Rect;
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks?: number[];
  yTicks?: number[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  titleColor?: string;
  format?: (value: number) => string;
  opacity?: number;
}> = ({rect, xDomain, yDomain, xTicks = [], yTicks = [], xLabel, yLabel, title, titleColor = COLOR.text, format = String, opacity = 1}) => {
  const sx = makeScale(xDomain[0], xDomain[1], rect.x, rect.x + rect.w);
  const sy = makeScale(yDomain[0], yDomain[1], rect.y + rect.h, rect.y);
  const inside = (value: number, [lo, hi]: [number, number]) => value >= lo - 1e-9 && value <= hi + 1e-9;
  return (
    <g opacity={opacity}>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} rx={6} />
      {xTicks.filter((t) => inside(t, xDomain)).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={rect.y} y2={rect.y + rect.h} stroke={COLOR.grid} strokeWidth={1.5} />
          <SvgText x={sx(t)} y={rect.y + rect.h + 24}>
            {format(t)}
          </SvgText>
        </g>
      ))}
      {yTicks.filter((t) => inside(t, yDomain)).map((t) => (
        <g key={`y${t}`}>
          <line x1={rect.x} x2={rect.x + rect.w} y1={sy(t)} y2={sy(t)} stroke={COLOR.grid} strokeWidth={1.5} />
          <SvgText x={rect.x - 14} y={sy(t)} anchor="end">
            {format(t)}
          </SvgText>
        </g>
      ))}
      {xLabel ? (
        <SvgText x={rect.x + rect.w / 2} y={rect.y + rect.h + 62} size={SIZE.axisLabel} color={COLOR.text}>
          {xLabel}
        </SvgText>
      ) : null}
      {yLabel ? (
        <SvgText x={rect.x - 78} y={rect.y + rect.h / 2} size={SIZE.axisLabel} color={COLOR.text} rotate={-90}>
          {yLabel}
        </SvgText>
      ) : null}
      {title ? (
        <SvgText x={rect.x + rect.w / 2} y={rect.y - 30} size={SIZE.small} color={titleColor} weight={700}>
          {title}
        </SvgText>
      ) : null}
    </g>
  );
};

// 点の集まり（画面の座標で渡す）。動かない点は memo で描き直しを省く
export const Dots = memo(
  ({points, r = 4.5, color = COLOR.blue, opacity = 0.75}: {points: [number, number][]; r?: number; color?: string; opacity?: number}) => (
    <g fill={color} opacity={opacity}>
      {points.map(([px, py], index) => (
        <circle key={index} cx={px} cy={py} r={r} />
      ))}
    </g>
  ),
);

// 目立たせる1点（まわりに地の色の輪を付ける）
export const Marker: React.FC<{x: number; y: number; r?: number; color?: string; opacity?: number}> = ({
  x,
  y,
  r = 12,
  color = COLOR.highlight,
  opacity = 1,
}) => <circle cx={x} cy={y} r={r} fill={color} stroke={COLOR.backgroundDeep} strokeWidth={4} opacity={opacity} />;

export const histogram = (values: number[], lo: number, hi: number, bins: number) => {
  const counts = new Array<number>(bins).fill(0);
  for (const value of values) {
    const index = Math.floor(((value - lo) / (hi - lo)) * bins);
    if (index >= 0 && index < bins) counts[index]++;
  }
  return counts;
};

// ヒストグラム。side = 'top' は rect の下端から上へ、'right' は左端から右へ、'bottom' は上端から下へ、'left' は右端から左へ伸ばす
export const Histogram: React.FC<{
  counts: number[];
  maxCount: number;
  rect: Rect;
  side: 'top' | 'right' | 'bottom' | 'left';
  color?: string;
  opacity?: number;
  grow?: number;
}> = ({counts, maxCount, rect, side, color = COLOR.blue, opacity = 0.85, grow = 1}) => {
  const horizontal = side === 'top' || side === 'bottom';
  const step = (horizontal ? rect.w : rect.h) / counts.length;
  const gap = 2;
  return (
    <g fill={color} opacity={opacity}>
      {counts.map((count, index) => {
        const length = (count / maxCount) * (horizontal ? rect.h : rect.w) * grow;
        if (side === 'top') return <rect key={index} x={rect.x + index * step + gap / 2} y={rect.y + rect.h - length} width={step - gap} height={length} />;
        if (side === 'bottom') return <rect key={index} x={rect.x + index * step + gap / 2} y={rect.y} width={step - gap} height={length} />;
        // 縦向きは、値が大きいほど上になるように下から並べる
        const top = rect.y + rect.h - (index + 1) * step + gap / 2;
        if (side === 'right') return <rect key={index} x={rect.x} y={top} width={length} height={step - gap} />;
        return <rect key={index} x={rect.x + rect.w - length} y={top} width={length} height={step - gap} />;
      })}
    </g>
  );
};

// 関数の曲線を折れ線の path にする
export const curvePath = (f: (x: number) => number, x0: number, x1: number, sx: Scale, sy: Scale, steps = 120) =>
  Array.from({length: steps + 1}, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / steps;
    return `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`;
  }).join(' ');

export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; opacity?: number}> = ({
  x1,
  y1,
  x2,
  y2,
  color = COLOR.subText,
  width = 5,
  opacity = 1,
}) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 20;
  const bx = x2 - Math.cos(angle) * head;
  const by = y2 - Math.sin(angle) * head;
  const nx = -Math.sin(angle) * head * 0.55;
  const ny = Math.cos(angle) * head * 0.55;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`} fill={color} />
    </g>
  );
};
