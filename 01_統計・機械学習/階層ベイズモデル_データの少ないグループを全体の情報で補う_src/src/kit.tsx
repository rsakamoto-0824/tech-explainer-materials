// kit.tsx — 場面で共通に使う小道具（色、時間の補間、数式、現れ方、グラフの枠）。
import katex from 'katex';
import React, { useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FONT = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif";

// 色は、これまでの解説動画と同じ、暗い背景用のパレット
export const C = {
  bg: '#1a1a19',
  panel: '#222220',
  line: '#3a3a37',
  grid: '#2c2c2a',
  axis: '#6b6a64',
  text: '#f0efec',
  text2: '#c3c2b7',
  muted: '#8f8e86',
  blue: '#3987e5',
  orange: '#d95926',
  aqua: '#199e70',
  yellow: '#e0a52a',
  violet: '#9085e9',
  theory: '#9085e9',
  visual: '#199e70',
};
export const GROUP_COLORS = [C.blue, C.orange];

// ---- 時間の補間 ----
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const APPEAR_FRAMES = 16;

/** at コマめから dur コマかけて 0 → 1 */
export const rise = (frame: number, at: number, dur = APPEAR_FRAMES) =>
  interpolate(frame, [at, at + dur], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });

/** コマの列と値の列の間を、なめらかにつなぐ */
export const track = (frame: number, frames: number[], values: number[]) =>
  interpolate(frame, frames, values, { ...CLAMP, easing: Easing.inOut(Easing.cubic) });

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** いま何番めの字幕か（0 始まり） */
export const stepAt = (frame: number, cues: number[]) => {
  let step = 0;
  for (let i = 0; i < cues.length; i++) if (frame >= cues[i]) step = i;
  return step;
};

// ---- 数式 ----
export const Tex: React.FC<{ tex: string; size?: number; color?: string; block?: boolean; style?: React.CSSProperties }> = ({
  tex,
  size = 44,
  color,
  block = false,
  style,
}) => {
  const html = useMemo(() => katex.renderToString(tex, { throwOnError: false, displayMode: block, strict: false }), [tex, block]);
  return <span style={{ fontSize: size, color, whiteSpace: 'nowrap', ...style }} dangerouslySetInnerHTML={{ __html: html }} />;
};

// ---- 現れ方 ----
/** at コマめに、下から少し上がりながら現れる。dim のコマで薄くなり、out のコマで消える */
export const Reveal: React.FC<{
  at: number;
  dim?: number;
  out?: number;
  dy?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dim, out, dy = 22, style, children }) => {
  const frame = useCurrentFrame();
  const shown = rise(frame, at) * (out === undefined ? 1 : 1 - rise(frame, out));
  const dimmed = dim === undefined ? 0 : rise(frame, dim);
  return (
    <div style={{ opacity: shown * mix(1, 0.38, dimmed), translate: `0px ${(1 - shown) * dy}px`, ...style }}>{children}</div>
  );
};

/** SVG の中で、at コマめに現れるグループ */
export const RevealG: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const frame = useCurrentFrame();
  const opacity = rise(frame, at) * (out === undefined ? 1 : 1 - rise(frame, out));
  return <g opacity={opacity}>{children}</g>;
};

// ---- 箱 ----
export const Card: React.FC<{ style?: React.CSSProperties; accent?: string; children: React.ReactNode }> = ({ style, accent, children }) => (
  <div
    style={{
      background: C.panel,
      border: `2px solid ${accent ?? C.line}`,
      borderRadius: 22,
      padding: '26px 34px',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Pill: React.FC<{ color: string; children: React.ReactNode; size?: number }> = ({ color, children, size = 30 }) => (
  <span
    style={{
      display: 'inline-block',
      background: color,
      color: C.bg,
      fontWeight: 700,
      fontSize: size,
      borderRadius: 999,
      padding: '4px 22px',
      letterSpacing: '0.06em',
    }}
  >
    {children}
  </span>
);

// ---- グラフ ----
export type Scale = (value: number) => number;
export const linear = (d0: number, d1: number, r0: number, r1: number): Scale => (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);

export const normalPdf = (x: number, mean: number, sd: number) => Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

/** 関数 f のグラフを、SVG の path の文字列にする */
export const curvePath = (f: (x: number) => number, x0: number, x1: number, sx: Scale, sy: Scale, samples = 160) => {
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    d += `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`;
  }
  return d;
};

/** 曲線の下を塗るための path */
export const areaPath = (f: (x: number) => number, x0: number, x1: number, sx: Scale, sy: Scale, samples = 160) =>
  `${curvePath(f, x0, x1, sx, sy, samples)}L${sx(x1).toFixed(1)} ${sy(0).toFixed(1)}L${sx(x0).toFixed(1)} ${sy(0).toFixed(1)}Z`;

export const AXIS_FONT = 26;

/** 横軸（目盛りと名前） */
export const XAxis: React.FC<{ sx: Scale; y: number; ticks: number[]; label?: string; x0: number; x1: number; format?: (v: number) => string }> = ({
  sx,
  y,
  ticks,
  label,
  x0,
  x1,
  format = String,
}) => (
  <g>
    <line x1={sx(x0)} x2={sx(x1)} y1={y} y2={y} stroke={C.axis} strokeWidth={2} />
    {ticks.map((tick) => (
      <g key={tick}>
        <line x1={sx(tick)} x2={sx(tick)} y1={y} y2={y + 10} stroke={C.axis} strokeWidth={2} />
        <text x={sx(tick)} y={y + 40} fill={C.text2} fontSize={AXIS_FONT} textAnchor="middle">
          {format(tick)}
        </text>
      </g>
    ))}
    {label ? (
      <text x={(sx(x0) + sx(x1)) / 2} y={y + 82} fill={C.text2} fontSize={AXIS_FONT + 2} textAnchor="middle">
        {label}
      </text>
    ) : null}
  </g>
);

/** 縦軸（目盛りと名前） */
export const YAxis: React.FC<{ sy: Scale; x: number; ticks: number[]; label?: string; y0: number; y1: number; format?: (v: number) => string; gridTo?: number }> = ({
  sy,
  x,
  ticks,
  label,
  y0,
  y1,
  format = String,
  gridTo,
}) => (
  <g>
    <line x1={x} x2={x} y1={sy(y0)} y2={sy(y1)} stroke={C.axis} strokeWidth={2} />
    {ticks.map((tick) => (
      <g key={tick}>
        {gridTo !== undefined ? <line x1={x} x2={gridTo} y1={sy(tick)} y2={sy(tick)} stroke={C.grid} strokeWidth={1.5} /> : null}
        <line x1={x - 10} x2={x} y1={sy(tick)} y2={sy(tick)} stroke={C.axis} strokeWidth={2} />
        <text x={x - 18} y={sy(tick) + 9} fill={C.text2} fontSize={AXIS_FONT} textAnchor="end">
          {format(tick)}
        </text>
      </g>
    ))}
    {label ? (
      <text x={x} y={sy(y1) - 22} fill={C.text2} fontSize={AXIS_FONT + 2} textAnchor="middle">
        {label}
      </text>
    ) : null}
  </g>
);

/** 画面いっぱいの SVG */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0, fontFamily: FONT }}>
    {children}
  </svg>
);

/** 2色の間の色（負担率で点を塗るときに使う） */
export const blend = (hexA: string, hexB: string, k: number) => {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(hexA);
  const b = parse(hexB);
  return `rgb(${a.map((v, i) => Math.round(mix(v, b[i], k))).join(',')})`;
};

/** 矢印（線と三角） */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dashed?: boolean }> = ({
  x1,
  y1,
  x2,
  y2,
  color = C.text2,
  width = 4,
  dashed = false,
}) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 20;
  const bx = x2 - head * Math.cos(angle);
  const by = y2 - head * Math.sin(angle);
  const px = (head / 2) * Math.sin(angle);
  const py = (-head / 2) * Math.cos(angle);
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '10 8' : undefined} />
      <polygon points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={color} />
    </g>
  );
};

/** 変数の丸。潜在変数は白抜き、観測変数は塗る（グラフィカルモデルの書き方） */
export const VarNode: React.FC<{ x: number; y: number; r?: number; label: string; observed?: boolean; color?: string }> = ({
  x,
  y,
  r = 58,
  label,
  observed = false,
  color = C.text,
}) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={observed ? '#4a4a46' : C.bg} stroke={color} strokeWidth={4} />
    <foreignObject x={x - r} y={y - r} width={r * 2} height={r * 2}>
      <div style={{ width: r * 2, height: r * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <Tex tex={label} size={r * 0.9} />
      </div>
    </foreignObject>
  </g>
);
