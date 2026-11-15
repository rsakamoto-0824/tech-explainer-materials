// plots.tsx — 点のグラフ（データの平面と潜在空間）で共通に使う部品。
import React from 'react';
import { C, linear, Tex, type Scale } from './kit';
import data from './data.json';

export const DATA = data;
export const GROUP_COLORS3 = [C.blue, C.orange, C.aqua];
export const GROUP_NAMES = ['グループ1', 'グループ2', 'グループ3'];
export const DATA_RANGE = 2.2; // データの平面で描く範囲（±）
export const LATENT_RANGE = 3; // 潜在空間で描く範囲（±）
export const GRAY_DOT = '#77766f';

export type Box = { left: number; top: number; size: number };
export type Scales = { sx: Scale; sy: Scale };

export const boxScales = (box: Box, range: number): Scales => ({
  sx: linear(-range, range, box.left, box.left + box.size),
  sy: linear(-range, range, box.top + box.size, box.top),
});

/** 正方形の枠と、目盛りの線、軸の名前 */
export const PlotFrame: React.FC<{ box: Box; range: number; ticks: number[]; xLabel: string; yLabel: string; title?: string }> = ({ box, range, ticks, xLabel, yLabel, title }) => {
  const { sx, sy } = boxScales(box, range);
  return (
    <g>
      <rect x={box.left} y={box.top} width={box.size} height={box.size} fill="#1e1e1c" stroke={C.line} strokeWidth={2} rx={10} />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={sx(tick)} x2={sx(tick)} y1={box.top} y2={box.top + box.size} stroke={tick === 0 ? C.axis : C.grid} strokeWidth={tick === 0 ? 2 : 1.5} />
          <line x1={box.left} x2={box.left + box.size} y1={sy(tick)} y2={sy(tick)} stroke={tick === 0 ? C.axis : C.grid} strokeWidth={tick === 0 ? 2 : 1.5} />
          <text x={sx(tick)} y={box.top + box.size + 30} fill={C.muted} fontSize={24} textAnchor="middle">
            {tick}
          </text>
          <text x={box.left - 12} y={sy(tick) + 8} fill={C.muted} fontSize={24} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      <foreignObject x={box.left + box.size - 70} y={box.top + box.size - 62} width={70} height={60}>
        <Tex tex={xLabel} size={30} color={C.text2} />
      </foreignObject>
      <foreignObject x={box.left + 12} y={box.top + 2} width={70} height={60}>
        <Tex tex={yLabel} size={30} color={C.text2} />
      </foreignObject>
      {title ? (
        <text x={box.left + box.size / 2} y={box.top - 16} fill={C.text} fontSize={32} fontWeight={700} textAnchor="middle">
          {title}
        </text>
      ) : null}
    </g>
  );
};

/** 600個のデータ点。gray = 1 のとき、グループの色を消して灰色にする */
export const DataDots: React.FC<{ scales: Scales; opacity?: number; gray?: number; radius?: number }> = ({ scales, opacity = 1, gray = 0, radius = 5 }) => (
  <g opacity={opacity}>
    {DATA.points.map((point, index) => (
      <g key={index}>
        <circle cx={scales.sx(point.x)} cy={scales.sy(point.y)} r={radius} fill={GROUP_COLORS3[point.c]} opacity={1 - gray} />
        {gray > 0 ? <circle cx={scales.sx(point.x)} cy={scales.sy(point.y)} r={radius} fill={GRAY_DOT} opacity={gray} /> : null}
      </g>
    ))}
  </g>
);

/** 潜在空間の点（エンコーダが出した平均）。グループの色で塗る */
export const LatentDots: React.FC<{ scales: Scales; latents: number[][]; opacity?: number; radius?: number }> = ({ scales, latents, opacity = 1, radius = 5 }) => (
  <g opacity={opacity}>
    {latents.map((latent, index) => (
      <circle key={index} cx={scales.sx(latent[0])} cy={scales.sy(latent[1])} r={radius} fill={GROUP_COLORS3[DATA.points[index].c]} fillOpacity={0.85} />
    ))}
  </g>
);

/** 事前分布（標準正規分布）の目安として、半径1と2の円を点線で描く */
export const PriorRings: React.FC<{ scales: Scales; opacity?: number }> = ({ scales, opacity = 1 }) => (
  <g opacity={opacity}>
    {[1, 2].map((radius) => (
      <circle key={radius} cx={scales.sx(0)} cy={scales.sy(0)} r={scales.sx(radius) - scales.sx(0)} fill="none" stroke={C.text2} strokeWidth={2} strokeDasharray="8 8" opacity={0.6} />
    ))}
  </g>
);

/** SVG の中に数式を置く（中心の位置で指定） */
export const SvgTex: React.FC<{ x: number; y: number; tex: string; size?: number; color?: string; w?: number; h?: number }> = ({ x, y, tex, size = 36, color = C.text, w = 360, h = 90 }) => (
  <foreignObject x={x - w / 2} y={y - h / 2} width={w} height={h}>
    <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      <Tex tex={tex} size={size} />
    </div>
  </foreignObject>
);
