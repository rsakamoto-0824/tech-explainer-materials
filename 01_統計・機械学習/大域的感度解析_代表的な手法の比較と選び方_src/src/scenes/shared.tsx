// 場面で共通に使う小さな部品と値
import type React from 'react';
import {makeScale, type Rect} from '../components/plot.tsx';
import {COLOR, FONT} from '../theme.ts';

export const PI_DOMAIN: [number, number] = [-Math.PI, Math.PI];
export const PI_TICKS = [-Math.PI, 0, Math.PI];
export const formatPi = (value: number) => (Math.abs(value) < 1e-9 ? '0' : value > 0 ? 'π' : '−π');
export const format2 = (value: number) => value.toFixed(2).replace('-', '−');

// 入力ごとの色（X1 青、X2 オレンジ、X1×X3 などの交互作用は青緑）
export const INPUT_COLORS = [COLOR.blue, COLOR.orange, COLOR.aqua];

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

// 2色のあいだの色（t = 0〜1）
const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const mixColor = (from: string, to: string, t: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const clamped = Math.min(1, Math.max(0, t));
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * clamped)).join(',')})`;
};

// −1〜1 の値を、青（負）・地の色（0）・オレンジ（正）の色にする
export const divergingColor = (value: number) =>
  value >= 0 ? mixColor(COLOR.panel, COLOR.orange, value) : mixColor(COLOR.panel, COLOR.blue, -value);

// 小さな正方形の点の絵（0〜1 の値の組を渡す）
export const MiniSquare: React.FC<{
  points?: [number, number][];
  size: number;
  color?: string;
  children?: React.ReactNode;
}> = ({points = [], size, color = COLOR.blue, children}) => (
  <svg width={size} height={size} style={{display: 'block', flexShrink: 0}}>
    <rect x={1} y={1} width={size - 2} height={size - 2} fill={COLOR.backgroundDeep} stroke={COLOR.panelLine} strokeWidth={2} rx={6} />
    <g fill={color} opacity={0.85}>
      {points.map(([x, y], i) => (
        <circle key={i} cx={6 + x * (size - 12)} cy={size - 6 - y * (size - 12)} r={3} />
      ))}
    </g>
    {children}
  </svg>
);

// 丸い番号
export const NumberBadge: React.FC<{color: string; size?: number; children: React.ReactNode}> = ({color, size = 46, children}) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      color: COLOR.backgroundDeep,
      fontFamily: FONT,
      fontSize: size * 0.6,
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {children}
  </span>
);

// 角の丸い小さな札
export const Chip: React.FC<{color: string; filled?: boolean; size?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  color,
  filled = false,
  size = 34,
  style,
  children,
}) => (
  <span
    style={{
      display: 'inline-block',
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      padding: '6px 22px',
      borderRadius: 40,
      border: `3px solid ${color}`,
      backgroundColor: filled ? color : 'transparent',
      color: filled ? COLOR.backgroundDeep : COLOR.text,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

// 石上関数の式と、出力の目盛り
export const ISHIGAMI_TEX = String.raw`Y = \sin X_1 + 7\sin^2 X_2 + 0.1\,X_3^4 \sin X_1`;
export const Y_DOMAIN: [number, number] = [-12, 19];
export const Y_TICKS = [-10, 0, 10];
export const INPUT_NAMES = ['X₁', 'X₂', 'X₃'];
export const formatSigned = (value: number) => String(value).replace('-', '−');

// 手法の5つの見方（傾き・要素効果・分散・分布・微分）と、その色
export const VIEWPOINTS = [
  {view: '傾き', methods: '回帰・相関（SRC・PRCC）', color: COLOR.subText},
  {view: '要素効果', methods: 'Morris法', color: COLOR.highlight},
  {view: '分散', methods: 'Sobol法・FAST', color: COLOR.blue},
  {view: '分布', methods: 'PAWN・δ', color: COLOR.orange},
  {view: '微分', methods: 'DGSM', color: COLOR.aqua},
];

// 3つの入力の散布図を横に並べる位置
export const SCATTER_RECTS: Rect[] = [0, 1, 2].map((i) => ({x: 200 + i * 570, y: 300, w: 460, h: 340}));

// π の目盛りは π、それ以外は数字で表す（横軸が −π〜π、縦軸が Y の図で共通に使う）
export const formatAxis = (value: number) => (Math.abs(Math.abs(value) - Math.PI) < 1e-6 ? formatPi(value) : formatSigned(value));
