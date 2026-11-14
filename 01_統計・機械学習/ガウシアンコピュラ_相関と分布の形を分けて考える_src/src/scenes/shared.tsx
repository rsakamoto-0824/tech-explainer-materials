// 場面で共通に使う小さな部品と値
import type React from 'react';
import {makeScale, type Rect} from '../components/plot.tsx';
import {COLOR} from '../theme.ts';
import {mix} from '../timeline.ts';

export const UNIT_TICKS = [0, 0.5, 1];
export const Z_TICKS = [-2, 0, 2];
export const Z_DOMAIN: [number, number] = [-3.4, 3.4];
export const UNIT_DOMAIN: [number, number] = [0, 1];
export const WAIT_DOMAIN: [number, number] = [0, 115];
export const WAIT_TICKS = [0, 50, 100];

export const format1 = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

// 値の組を、枠 rect の中の画面座標にする
export const toPixels = (
  rect: Rect,
  xDomain: [number, number],
  yDomain: [number, number],
  xs: number[],
  ys: number[],
): [number, number][] => {
  const sx = makeScale(xDomain[0], xDomain[1], rect.x, rect.x + rect.w);
  const sy = makeScale(yDomain[0], yDomain[1], rect.y + rect.h, rect.y);
  return xs.map((x, i) => [sx(x), sy(ys[i])]);
};

// 2組の点のあいだを progress（0〜1）で移動する
export const blendPoints = (from: [number, number][], to: [number, number][], progress: number): [number, number][] =>
  from.map(([x, y], i) => [mix(x, to[i][0], progress), mix(y, to[i][1], progress)]);

// 小さな曲線の絵（カードの中のアイコン用）
export const MiniCurve: React.FC<{
  f: (x: number) => number;
  domain: [number, number];
  maxValue: number;
  width: number;
  height: number;
  color?: string;
}> = ({f, domain, maxValue, width, height, color = COLOR.blue}) => {
  const steps = 60;
  const pad = 6;
  const points = Array.from({length: steps + 1}, (_, i) => {
    const x = domain[0] + ((domain[1] - domain[0]) * i) / steps;
    return [pad + ((width - 2 * pad) * i) / steps, height - pad - (f(x) / maxValue) * (height - 2 * pad)];
  });
  const line = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} style={{display: 'block'}}>
      <path d={`${line} L${width - pad} ${height - pad} L${pad} ${height - pad} Z`} fill={color} opacity={0.28} />
      <path d={line} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={COLOR.muted} strokeWidth={2} />
    </svg>
  );
};

// 小さな散布図の絵（0〜1 の値の組を渡す）
export const MiniScatter: React.FC<{points: [number, number][]; size: number; color?: string}> = ({points, size, color = COLOR.blue}) => (
  <svg width={size} height={size} style={{display: 'block'}}>
    <rect x={1} y={1} width={size - 2} height={size - 2} fill={COLOR.backgroundDeep} stroke={COLOR.panelLine} strokeWidth={2} rx={6} />
    <g fill={color} opacity={0.8}>
      {points.map(([x, y], i) => (
        <circle key={i} cx={6 + x * (size - 12)} cy={size - 6 - y * (size - 12)} r={3} />
      ))}
    </g>
  </svg>
);
