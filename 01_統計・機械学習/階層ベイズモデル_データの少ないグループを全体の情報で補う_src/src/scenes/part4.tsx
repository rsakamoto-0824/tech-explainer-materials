// part4.tsx — 第5章（MCMC で計算する）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { CHAIN_COLORS, DATA, fmt1, Histogram, LIKE, MU, polyline, POST, SMALL } from '../charts';
import { C, Card, curvePath, linear, normalPdf, Reveal, RevealG, rise, Stage, Tex, track, XAxis, YAxis } from '../kit';
import { abs, type SceneProps, texColor } from './part1';

// ---------- 5T すべてのパラメータの事後分布 ----------
const PARAMS = ['\\theta_{\\mathrm{A}}', '\\theta_{\\mathrm{B}}', '\\cdots', '\\theta_{\\mathrm{H}}', '\\mu', '\\tau', '\\sigma'];

export const Scene5T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(120, 200, { width: 1680 })}>
    <Reveal at={cues[0]} style={{ fontSize: 34, color: C.text2 }}>
      実際には、μ と τ も分からない
    </Reveal>
    <Reveal at={cues[1]} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 34, marginRight: 10 }}>パラメータ 11個：</span>
      {PARAMS.map((tex) => (
        <span key={tex} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRadius: 12, padding: '2px 16px' }}>
          <Tex tex={tex} size={40} />
        </span>
      ))}
    </Reveal>
    <Reveal at={cues[2]} style={{ marginTop: 30 }}>
      <Card style={{ padding: '24px 30px' }}>
        <Tex
          tex={`p(\\theta,\\mu,\\tau,\\sigma\\mid y)\\ \\propto\\ ${texColor(LIKE, '\\underbrace{\\prod_{j}\\prod_{i}\\mathcal{N}(y_{ij}\\mid\\theta_j,\\sigma^2)}_{\\text{データの尤度（1段め）}}')}\\ ${texColor(POST, '\\underbrace{\\prod_{j}\\mathcal{N}(\\theta_j\\mid\\mu,\\tau^2)}_{\\text{学校の分布（2段め）}}')}\\ ${texColor(MU, '\\underbrace{p(\\mu,\\tau,\\sigma)}_{\\text{超事前分布（3段め）}}')}`}
          size={40}
        />
      </Card>
    </Reveal>
    <div style={{ marginTop: 26, display: 'flex', gap: 30 }}>
      <Reveal at={cues[3]} style={{ flex: 1 }}>
        <Card accent={SMALL} style={{ padding: '18px 28px', fontSize: 30, lineHeight: 1.5, height: 170 }}>
          <b style={{ color: SMALL }}>11次元の積分</b>が必要
          <br />
          手計算では、きちんとした分布にできない
        </Card>
      </Reveal>
      <Reveal at={cues[4]} style={{ flex: 1.15 }}>
        <Card accent={C.aqua} style={{ padding: '18px 28px', fontSize: 30, lineHeight: 1.5, height: 170 }}>
          <b style={{ color: C.aqua }}>MCMC</b>
          <span style={{ fontSize: 24, color: C.text2 }}>（マルコフ連鎖モンテカルロ法）</span>
          <br />
          事後分布から標本を多数取り出す
        </Card>
      </Reveal>
      <Reveal at={cues[5]} style={{ flex: 1.15 }}>
        <Card style={{ padding: '18px 28px', fontSize: 30, lineHeight: 1.5, height: 170 }}>
          標本を<b>数えるだけ</b>で求まる
          <div style={{ color: C.text2 }}>・平均　・95% 区間</div>
          <div style={{ color: C.text2 }}>・C 校が1位である確率</div>
        </Card>
      </Reveal>
    </div>
  </div>
);

// ---------- 5G ギブスサンプリングの動き ----------
const TOY = { cx: 600, cy: 548, half: 315, range: 3 };
const MOVE_FRAMES = 6;

export const Scene5G: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { rho, path, samples } = DATA.toy;
  const sx = linear(-TOY.range, TOY.range, TOY.cx - TOY.half, TOY.cx + TOY.half);
  const sy = linear(-TOY.range, TOY.range, TOY.cy + TOY.half, TOY.cy - TOY.half);
  const unit = TOY.half / TOY.range;
  const condSd = Math.sqrt(1 - rho ** 2);
  // いま何本めの移動まで描くか（小数は、その移動の途中）
  const progress = (() => {
    if (frame < cues[2] + 10) return 0;
    if (frame < cues[3]) return track(frame, [cues[2] + 30, cues[2] + 60], [0, 1]);
    if (frame < cues[4]) return 1 + track(frame, [cues[3] + 20, cues[3] + 50], [0, 1]);
    return 2 + Math.min(path.length - 3, Math.max(0, (frame - cues[4] - 10) / MOVE_FRAMES));
  })();
  const whole = Math.floor(progress);
  const part = progress - whole;
  const drawn: [number, number][] = path.slice(0, whole + 1).map(([x, y]) => [sx(x), sy(y)]);
  if (whole + 1 < path.length && part > 0) {
    const [x0, y0] = path[whole];
    const [x1, y1] = path[whole + 1];
    drawn.push([sx(x0 + (x1 - x0) * part), sy(y0 + (y1 - y0) * part)]);
  }
  const head = drawn[drawn.length - 1];
  const shownSamples = Math.round(track(frame, [cues[5] + 10, cues[5] + 150], [0, samples.length]));
  // 条件付き分布の山（1回めは横、2回めは縦）
  const bumpH = rise(frame, cues[2] + 6, 16) * (1 - rise(frame, cues[3], 12));
  const bumpV = rise(frame, cues[3] + 6, 16) * (1 - rise(frame, cues[4], 12));
  const [startX, startY] = path[0];
  const [firstX] = path[1];
  const BUMP_HEIGHT = 120;
  const clipId = 'toy-plot-clip';
  return (
    <>
      <Stage>
        <defs>
          <clipPath id={clipId}>
            <rect x={TOY.cx - TOY.half} y={TOY.cy - TOY.half} width={TOY.half * 2} height={TOY.half * 2} rx={10} />
          </clipPath>
        </defs>
        <rect x={TOY.cx - TOY.half} y={TOY.cy - TOY.half} width={TOY.half * 2} height={TOY.half * 2} rx={10} fill="#1e1e1c" stroke={C.line} strokeWidth={2} />
        <line x1={sx(0)} x2={sx(0)} y1={TOY.cy - TOY.half} y2={TOY.cy + TOY.half} stroke={C.grid} strokeWidth={2} />
        <line x1={TOY.cx - TOY.half} x2={TOY.cx + TOY.half} y1={sy(0)} y2={sy(0)} stroke={C.grid} strokeWidth={2} />
        <RevealG at={cues[1]}>
          {[1, 2, 3].map((r) => (
            <ellipse
              key={r}
              cx={sx(0)}
              cy={sy(0)}
              rx={r * Math.sqrt(1 + rho) * unit}
              ry={r * Math.sqrt(1 - rho) * unit}
              transform={`rotate(-45 ${sx(0)} ${sy(0)})`}
              fill={C.violet}
              fillOpacity={0.1}
              stroke={C.violet}
              strokeWidth={2.5}
              opacity={1 - 0.25 * (r - 1)}
            />
          ))}
        </RevealG>
        <g>
          {samples.slice(0, shownSamples).map(([x, y], index) => (
            <circle key={index} cx={sx(x)} cy={sy(y)} r={4.5} fill={C.aqua} opacity={0.7} />
          ))}
        </g>
        {bumpH > 0 ? (
          <g opacity={bumpH} clipPath={`url(#${clipId})`}>
            <line x1={TOY.cx - TOY.half} x2={TOY.cx + TOY.half} y1={sy(startY)} y2={sy(startY)} stroke={C.yellow} strokeWidth={2} strokeDasharray="8 6" />
            <path
              d={curvePath((x) => normalPdf(x, rho * startY, condSd) * condSd * Math.sqrt(2 * Math.PI), -TOY.range, TOY.range, sx, (v) => sy(startY) + v * BUMP_HEIGHT, 200)}
              fill="none"
              stroke={C.yellow}
              strokeWidth={4}
            />
          </g>
        ) : null}
        {bumpV > 0 ? (
          <g opacity={bumpV} clipPath={`url(#${clipId})`}>
            <line x1={sx(firstX)} x2={sx(firstX)} y1={TOY.cy - TOY.half} y2={TOY.cy + TOY.half} stroke={C.yellow} strokeWidth={2} strokeDasharray="8 6" />
            <path
              d={(() => {
                let d = '';
                for (let i = 0; i <= 200; i++) {
                  const y = -TOY.range + (2 * TOY.range * i) / 200;
                  const v = normalPdf(y, rho * firstX, condSd) * condSd * Math.sqrt(2 * Math.PI);
                  d += `${i === 0 ? 'M' : 'L'}${(sx(firstX) - v * BUMP_HEIGHT).toFixed(1)} ${sy(y).toFixed(1)}`;
                }
                return d;
              })()}
              fill="none"
              stroke={C.yellow}
              strokeWidth={4}
            />
          </g>
        ) : null}
        <RevealG at={cues[2]}>
          <circle cx={sx(startX)} cy={sy(startY)} r={11} fill={C.bg} stroke={C.text} strokeWidth={4} />
          <text x={sx(startX) + 4} y={sy(startY) - 22} fill={C.text} fontSize={26} fontWeight={700}>
            出発点
          </text>
        </RevealG>
        {drawn.length > 1 ? <path d={polyline(drawn)} fill="none" stroke={C.text} strokeWidth={3.5} strokeLinejoin="round" /> : null}
        {drawn.length > 1 ? <circle cx={head[0]} cy={head[1]} r={9} fill={C.yellow} /> : null}
        <text x={TOY.cx + TOY.half - 12} y={sy(0) - 12} fill={C.muted} fontSize={26} textAnchor="end">
          横
        </text>
        <text x={sx(0) + 12} y={TOY.cy - TOY.half + 32} fill={C.muted} fontSize={26}>
          縦
        </text>
      </Stage>
      <div style={abs(1010, 235, { width: 820 })}>
        <Reveal at={cues[1]} style={{ fontSize: 32, color: C.text2, marginBottom: 22 }}>
          例：相関のある2次元の正規分布（相関 {rho}）
        </Reveal>
        {[
          { at: cues[2], text: '縦の値を固定して、横の値を、その条件のもとでの分布から選ぶ' },
          { at: cues[3], text: '横の値を固定して、縦の値を選ぶ' },
          { at: cues[4], text: 'これを交互に繰り返す' },
        ].map((step, index) => (
          <Reveal key={index} at={step.at} style={{ marginBottom: 18 }}>
            <Card accent={index < 2 ? C.yellow : C.line} style={{ display: 'flex', gap: 22, alignItems: 'center', padding: '16px 26px' }}>
              <span style={{ fontSize: 46, fontWeight: 800, color: C.yellow }}>{index + 1}</span>
              <span style={{ fontSize: 32, lineHeight: 1.45 }}>{step.text}</span>
            </Card>
          </Reveal>
        ))}
        <Reveal at={cues[5]} style={{ marginTop: 10, fontSize: 32, lineHeight: 1.5 }}>
          <span style={{ color: C.aqua, fontWeight: 700 }}>●</span> 集めた点は、もとの分布の形に広がる
        </Reveal>
      </div>
    </>
  );
};

// ---------- 5C 階層モデルでのギブスサンプリング ----------
const CONDITIONALS = [
  {
    tex: '\\theta_j\\mid\\cdots\\ \\sim\\ \\mathcal{N}\\!\\left(\\tilde\\theta_j,\\ \\left(\\tfrac{n_j}{\\sigma^2}+\\tfrac{1}{\\tau^2}\\right)^{-1}\\right)',
    note: '平均は、第4章の縮約の式',
    color: POST,
  },
  { tex: '\\mu\\mid\\cdots\\ \\sim\\ \\mathcal{N}\\!\\left(\\bar\\theta,\\ \\tau^2/J\\right)', note: '8校の θ の平均が中心', color: MU },
  { tex: '\\tau^2\\mid\\cdots\\ \\sim\\ \\text{逆ガンマ}\\!\\left(\\tfrac{J-1}{2},\\ \\tfrac{1}{2}\\textstyle\\sum_j(\\theta_j-\\mu)^2\\right)', note: '正の値だけをとる分布', color: C.text2 },
  { tex: '\\sigma^2\\mid\\cdots\\ \\sim\\ \\text{逆ガンマ}\\!\\left(\\tfrac{N}{2},\\ \\tfrac{1}{2}\\textstyle\\sum_j\\sum_i(y_{ij}-\\theta_j)^2\\right)', note: '', color: C.text2 },
];

export const Scene5C: React.FC<SceneProps> = ({ cues }) => {
  const at = [cues[1], cues[2], cues[3], cues[3] + 40];
  return (
    <div style={abs(120, 200, { width: 1680 })}>
      <Reveal at={cues[0]} style={{ fontSize: 33, color: C.text2 }}>
        ほかを固定したときの、1つずつの分布（条件付き分布）
      </Reveal>
      {CONDITIONALS.map((item, index) => (
        <Reveal key={index} at={at[index]} style={{ marginTop: 14 }}>
          <Card accent={item.color === C.text2 ? C.line : item.color} style={{ display: 'flex', alignItems: 'center', padding: '12px 30px', height: 104 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: C.yellow, width: 70 }}>{index + 1}</span>
            <div style={{ width: 1100 }}>
              <Tex tex={item.tex} size={40} />
            </div>
            <span style={{ fontSize: 28, color: C.text2 }}>{item.note}</span>
          </Card>
        </Reveal>
      ))}
      <div style={{ marginTop: 22, display: 'flex', gap: 28 }}>
        <Reveal at={cues[4]} style={{ flex: 1 }}>
          <Card accent={C.yellow} style={{ padding: '14px 26px', fontSize: 32, height: 120, display: 'flex', alignItems: 'center' }}>
            1 → 2 → 3 → 4 を、何千回も繰り返す
          </Card>
        </Reveal>
        <Reveal at={cues[5]} style={{ flex: 1.2 }}>
          <Card style={{ padding: '12px 26px', fontSize: 27, lineHeight: 1.5, height: 120 }}>
            <div>
              事前分布：μ は一様、τ は 0 以上で一様、σ は log σ が一様
            </div>
            <div style={{ color: C.text2 }}>
              {DATA.settings.iterations}回 × {DATA.settings.chains}本（はじめの{DATA.settings.burnIn}回は捨てる）
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
};

// ---------- 5H 標本の動きと、事後分布 ----------
const TRACE = { left: 190, right: 980, iterations: DATA.traces[0].length };
const MU_BOX = { top: 245, bottom: 480, from: 25, to: 100 };
const TAU_BOX = { top: 575, bottom: 810, from: 0, to: 45 };
const HIST = { left: 1110, right: 1790 };
const HIST_HEIGHT = 200;

const TracePlot: React.FC<{ box: typeof MU_BOX; key2: 'mu' | 'tau'; ticks: number[]; label: string; upto: number }> = ({ box, key2, ticks, label, upto }) => {
  const sx = linear(0, TRACE.iterations - 1, TRACE.left, TRACE.right);
  const sy = linear(box.from, box.to, box.bottom, box.top);
  return (
    <g>
      <rect x={TRACE.left} y={box.top} width={TRACE.right - TRACE.left} height={box.bottom - box.top} fill="#1e1e1c" stroke={C.line} strokeWidth={2} />
      <YAxis sy={sy} x={TRACE.left} ticks={ticks} y0={box.from} y1={box.to} />
      <foreignObject x={TRACE.left - 120} y={(box.top + box.bottom) / 2 - 30} width={60} height={60}>
        <Tex tex={label} size={40} color={C.text} />
      </foreignObject>
      {DATA.traces.map((trace, chain) => {
        const points = trace.slice(0, Math.max(1, Math.round(upto))).map((step, i) => [sx(i), sy(Math.min(box.to, step[key2]))] as [number, number]);
        return (
          <g key={chain}>
            <path d={polyline(points)} fill="none" stroke={CHAIN_COLORS[chain]} strokeWidth={2.2} opacity={0.85} />
            <circle cx={points[0][0]} cy={points[0][1]} r={7} fill={CHAIN_COLORS[chain]} />
          </g>
        );
      })}
    </g>
  );
};

export const Scene5H: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const upto = track(frame, [cues[0] + 20, cues[1] + 90], [1, TRACE.iterations]);
  const grow = rise(frame, cues[2] + 10, 40);
  const muSx = linear(DATA.hist.mu.from, DATA.hist.mu.from + DATA.hist.mu.width * DATA.hist.mu.density.length, HIST.left, HIST.right);
  const tauSx = linear(DATA.hist.tau.from, DATA.hist.tau.from + DATA.hist.tau.width * DATA.hist.tau.density.length, HIST.left, HIST.right);
  const { mu, tau } = DATA.post;
  const muMax = Math.max(...DATA.hist.mu.density);
  const tauMax = Math.max(...DATA.hist.tau.density);
  return (
    <Stage>
      <RevealG at={cues[0]}>
        <TracePlot box={MU_BOX} key2="mu" ticks={[30, 50, 70, 90]} label="\mu" upto={upto} />
        <TracePlot box={TAU_BOX} key2="tau" ticks={[0, 10, 20, 30, 40]} label="\tau" upto={upto} />
        <text x={TRACE.right} y={TAU_BOX.bottom + 40} fill={C.text2} fontSize={26} textAnchor="end">
          繰り返しの回数（はじめの{TRACE.iterations}回）→
        </text>
        {CHAIN_COLORS.map((color, chain) => (
          <g key={chain}>
            <line x1={TRACE.left + chain * 150} x2={TRACE.left + chain * 150 + 34} y1={222} y2={222} stroke={color} strokeWidth={5} />
            <text x={TRACE.left + chain * 150 + 42} y={231} fill={C.text2} fontSize={24}>
              連鎖{chain + 1}
            </text>
          </g>
        ))}
      </RevealG>
      <RevealG at={cues[2]}>
        <text x={HIST.left} y={MU_BOX.top - 10} fill={C.text} fontSize={30} fontWeight={700}>
          μ の事後分布
        </text>
        <Histogram hist={DATA.hist.mu} sx={muSx} baseline={MU_BOX.bottom} height={HIST_HEIGHT} maxDensity={muMax} color={MU} grow={grow} highlight={frame >= cues[3] ? [mu.lo, mu.hi] : undefined} />
        <XAxis sx={muSx} y={MU_BOX.bottom} ticks={[50, 60, 70, 80]} x0={50} x1={80} />
        <text x={HIST.left} y={TAU_BOX.top - 10} fill={C.text} fontSize={30} fontWeight={700}>
          τ の事後分布
        </text>
        <Histogram hist={DATA.hist.tau} sx={tauSx} baseline={TAU_BOX.bottom} height={HIST_HEIGHT} maxDensity={tauMax} color={C.violet} grow={grow} highlight={frame >= cues[4] ? [tau.lo, tau.hi] : undefined} />
        <XAxis sx={tauSx} y={TAU_BOX.bottom} ticks={[0, 5, 10, 15, 20, 25]} x0={0} x1={25} />
        <text x={HIST.right} y={MU_BOX.top - 10} fill={C.text2} fontSize={24} textAnchor="end">
          標本 {DATA.sampleCount.toLocaleString()}個
        </text>
      </RevealG>
      <RevealG at={cues[3]}>
        <line x1={muSx(mu.mean)} x2={muSx(mu.mean)} y1={MU_BOX.bottom} y2={MU_BOX.bottom - HIST_HEIGHT - 10} stroke={C.text} strokeWidth={3} />
        <text x={muSx(mu.mean) + 12} y={MU_BOX.bottom - HIST_HEIGHT + 4} fill={C.text} fontSize={28} fontWeight={700}>
          平均 {fmt1(mu.mean)}
        </text>
        <text x={HIST.right} y={MU_BOX.top + 30} fill={MU} fontSize={26} textAnchor="end">
          95%：{fmt1(mu.lo)}〜{fmt1(mu.hi)}
        </text>
      </RevealG>
      <RevealG at={cues[4]}>
        <line x1={tauSx(tau.median)} x2={tauSx(tau.median)} y1={TAU_BOX.bottom} y2={TAU_BOX.bottom - HIST_HEIGHT - 10} stroke={C.text} strokeWidth={3} />
        <text x={tauSx(tau.median) + 12} y={TAU_BOX.bottom - HIST_HEIGHT + 4} fill={C.text} fontSize={28} fontWeight={700}>
          中央値 {fmt1(tau.median)}
        </text>
        <text x={HIST.right} y={TAU_BOX.top + 30} fill={C.violet} fontSize={26} textAnchor="end">
          95%：{fmt1(tau.lo)}〜{fmt1(tau.hi)}
        </text>
      </RevealG>
      <RevealG at={cues[5]}>
        <rect x={HIST.left + 300} y={TAU_BOX.top + 60} width={380} height={56} rx={12} fill={C.panel} stroke={C.aqua} strokeWidth={2} />
        <foreignObject x={HIST.left + 300} y={TAU_BOX.top + 60} width={380} height={56}>
          <div style={{ width: 380, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.aqua, fontSize: 28, fontWeight: 700 }}>
            <Tex tex={`\\hat{R}:\\ \\mu\\ ${DATA.rhat.mu.toFixed(2)}\\quad \\tau\\ ${DATA.rhat.tau.toFixed(2)}`} size={30} color={C.aqua} />
          </div>
        </foreignObject>
      </RevealG>
    </Stage>
  );
};
