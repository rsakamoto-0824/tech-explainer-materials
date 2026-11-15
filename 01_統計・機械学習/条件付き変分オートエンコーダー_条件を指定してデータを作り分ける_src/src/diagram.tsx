// diagram.tsx — VAE と CVAE の構成図（データ → エンコーダ → z → デコーダ → 復元）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Arrow, C, mix, rise } from './kit';
import { SvgTex } from './plots';

const NEVER = 1e9;
const X_NODE = 150;
const ENCODER = { left: 300, right: 560 };
const STATS = { left: 640, right: 830 };
const Z_NODE = 960;
const DECODER = { left: 1110, right: 1370 };
const XHAT_NODE = 1520;
const NODE_HALF = 58;
const WIDE_HALF = 135; // 台形の広い側の、高さの半分
const NARROW_HALF = 72;
const CONDITION_DROP = 250; // z から条件 c の箱までの下がり幅
const COND = '#e0a52a';

export type DiagramTimes = {
  x: number;
  encoder: number;
  stats: number;
  z: number;
  decoder: number;
  xhat: number;
  /** 復元を x に近づける、の矢印 */
  loss?: number;
  /** 条件 c（CVAE のときだけ） */
  condition?: number;
  toEncoder?: number;
  toDecoder?: number;
  /** 作るとき：エンコーダ側を薄くして、z を事前分布から選ぶ */
  generate?: number;
};

const Box: React.FC<{ cx: number; cy: number; tex: string; caption: string; color?: string }> = ({ cx, cy, tex, caption, color = C.text }) => (
  <g>
    <rect x={cx - NODE_HALF} y={cy - NODE_HALF} width={NODE_HALF * 2} height={NODE_HALF * 2} rx={16} fill={C.panel} stroke={color} strokeWidth={4} />
    <SvgTex x={cx} y={cy} tex={tex} size={52} w={NODE_HALF * 2} />
    <text x={cx} y={cy - NODE_HALF - 18} fill={C.text2} fontSize={28} textAnchor="middle">
      {caption}
    </text>
  </g>
);

const Trapezoid: React.FC<{ left: number; right: number; cy: number; narrowing: boolean; color: string; name: string; tex: string }> = ({ left, right, cy, narrowing, color, name, tex }) => {
  const leftHalf = narrowing ? WIDE_HALF : NARROW_HALF;
  const rightHalf = narrowing ? NARROW_HALF : WIDE_HALF;
  return (
    <g>
      <polygon points={`${left},${cy - leftHalf} ${right},${cy - rightHalf} ${right},${cy + rightHalf} ${left},${cy + leftHalf}`} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={4} strokeLinejoin="round" />
      <text x={(left + right) / 2} y={cy - 12} fill={C.text} fontSize={34} fontWeight={700} textAnchor="middle">
        {name}
      </text>
      <SvgTex x={(left + right) / 2} y={cy + 30} tex={tex} size={32} w={right - left} h={60} />
    </g>
  );
};

export const ArchDiagram: React.FC<{ cy: number; dx?: number; times: DiagramTimes; conditional?: boolean }> = ({ cy, dx = 180, times, conditional = false }) => {
  const frame = useCurrentFrame();
  const show = (at: number | undefined) => rise(frame, at ?? NEVER);
  const generating = show(times.generate);
  const encoderSide = mix(1, 0.2, generating);
  const conditionY = cy + CONDITION_DROP;
  const encoderMid = (ENCODER.left + ENCODER.right) / 2;
  const decoderMid = (DECODER.left + DECODER.right) / 2;
  return (
    <g transform={`translate(${dx} 0)`}>
      <g opacity={show(times.x) * encoderSide}>
        <Box cx={X_NODE} cy={cy} tex="x" caption="データ" />
        <Arrow x1={X_NODE + NODE_HALF + 6} y1={cy} x2={ENCODER.left - 8} y2={cy} />
      </g>
      <g opacity={show(times.encoder) * encoderSide}>
        <Trapezoid left={ENCODER.left} right={ENCODER.right} cy={cy} narrowing color={C.violet} name="エンコーダ" tex={conditional ? `q_\\phi(z\\mid x,\\textcolor{${COND}}{c})` : 'q_\\phi(z\\mid x)'} />
      </g>
      <g opacity={show(times.stats) * encoderSide}>
        <Arrow x1={ENCODER.right + 6} y1={cy} x2={STATS.left - 8} y2={cy} />
        <rect x={STATS.left} y={cy - 84} width={STATS.right - STATS.left} height={168} rx={16} fill={C.panel} stroke={C.violet} strokeWidth={3} />
        <SvgTex x={STATS.left + 40} y={cy - 40} tex="\mu" size={46} w={60} />
        <SvgTex x={STATS.left + 40} y={cy + 40} tex="\sigma" size={46} w={60} />
        <text x={STATS.left + 120} y={cy - 31} fill={C.text2} fontSize={24} textAnchor="middle">
          平均
        </text>
        <text x={STATS.left + 120} y={cy + 49} fill={C.text2} fontSize={24} textAnchor="middle">
          標準偏差
        </text>
        <text x={(STATS.left + STATS.right) / 2} y={cy - 102} fill={C.text2} fontSize={28} textAnchor="middle">
          z の分布
        </text>
        <Arrow x1={STATS.right + 6} y1={cy} x2={Z_NODE - NODE_HALF - 8} y2={cy} />
      </g>
      <g opacity={show(times.z)}>
        <circle cx={Z_NODE} cy={cy} r={NODE_HALF} fill={C.bg} stroke={C.text} strokeWidth={4} />
        <SvgTex x={Z_NODE} y={cy} tex="z" size={52} w={NODE_HALF * 2} />
        <text x={Z_NODE} y={cy + NODE_HALF + 40} fill={C.text2} fontSize={28} textAnchor="middle" opacity={conditional ? 0 : 1}>
          潜在変数
        </text>
      </g>
      <g opacity={show(times.decoder)}>
        <Arrow x1={Z_NODE + NODE_HALF + 6} y1={cy} x2={DECODER.left - 8} y2={cy} />
        <Trapezoid left={DECODER.left} right={DECODER.right} cy={cy} narrowing={false} color={C.aqua} name="デコーダ" tex={conditional ? `p_\\theta(x\\mid z,\\textcolor{${COND}}{c})` : 'p_\\theta(x\\mid z)'} />
      </g>
      <g opacity={show(times.xhat)}>
        <Arrow x1={DECODER.right + 6} y1={cy} x2={XHAT_NODE - NODE_HALF - 8} y2={cy} />
        <Box cx={XHAT_NODE} cy={cy} tex="\hat{x}" caption={generating > 0.5 ? '作られたデータ' : '復元したデータ'} color={C.aqua} />
      </g>
      {/* 復元を、もとの x に近づける */}
      <g opacity={show(times.loss) * (1 - generating)}>
        <path d={`M${XHAT_NODE} ${cy - NODE_HALF - 56} L${XHAT_NODE} ${cy - 215} L${X_NODE} ${cy - 215} L${X_NODE} ${cy - NODE_HALF - 70}`} fill="none" stroke={C.yellow} strokeWidth={4} strokeDasharray="12 9" />
        <polygon points={`${X_NODE},${cy - NODE_HALF - 56} ${X_NODE - 11},${cy - NODE_HALF - 78} ${X_NODE + 11},${cy - NODE_HALF - 78}`} fill={C.yellow} />
        <rect x={(X_NODE + XHAT_NODE) / 2 - 190} y={cy - 243} width={380} height={56} rx={28} fill={C.bg} />
        <text x={(X_NODE + XHAT_NODE) / 2} y={cy - 203} fill={C.yellow} fontSize={34} fontWeight={700} textAnchor="middle">
          もとの x に近づける
        </text>
      </g>
      {/* 作るとき：z を事前分布から選ぶ */}
      <g opacity={generating}>
        <SvgTex x={Z_NODE} y={cy - 190} tex="z\sim\mathcal{N}(0,I)" size={40} color={C.yellow} w={320} h={60} />
        <text x={Z_NODE} y={cy - 232} fill={C.yellow} fontSize={30} fontWeight={700} textAnchor="middle">
          乱数で選ぶ
        </text>
        <Arrow x1={Z_NODE} y1={cy - 156} x2={Z_NODE} y2={cy - NODE_HALF - 8} color={C.yellow} />
      </g>
      {/* 条件 c */}
      {conditional ? (
        <>
          <g opacity={show(times.condition)}>
            <rect x={Z_NODE - NODE_HALF} y={conditionY - NODE_HALF} width={NODE_HALF * 2} height={NODE_HALF * 2} rx={16} fill={C.panel} stroke={COND} strokeWidth={5} />
            <SvgTex x={Z_NODE} y={conditionY} tex="c" size={56} color={COND} w={NODE_HALF * 2} />
            <text x={Z_NODE} y={conditionY + NODE_HALF + 40} fill={COND} fontSize={30} fontWeight={700} textAnchor="middle">
              条件
            </text>
          </g>
          <g opacity={show(times.toEncoder) * encoderSide}>
            <line x1={Z_NODE - NODE_HALF - 6} y1={conditionY} x2={encoderMid} y2={conditionY} stroke={COND} strokeWidth={5} />
            <Arrow x1={encoderMid} y1={conditionY + 2} x2={encoderMid} y2={cy + (WIDE_HALF + NARROW_HALF) / 2 + 10} color={COND} width={5} />
          </g>
          <g opacity={show(times.toDecoder)}>
            <line x1={Z_NODE + NODE_HALF + 6} y1={conditionY} x2={decoderMid} y2={conditionY} stroke={COND} strokeWidth={5} />
            <Arrow x1={decoderMid} y1={conditionY + 2} x2={decoderMid} y2={cy + (WIDE_HALF + NARROW_HALF) / 2 + 10} color={COND} width={5} />
          </g>
        </>
      ) : null}
    </g>
  );
};
