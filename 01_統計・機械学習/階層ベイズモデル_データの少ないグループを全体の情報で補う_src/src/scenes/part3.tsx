// part3.tsx — 第4章（縮約の式を読む）と、ここまでの整理。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DATA, declutter, fmt1, highlightColor, LARGE, LARGE_NAMES, LIKE, MU, polyline, POST, PRIOR, RAW, schoolByName, SMALL, SMALL_NAMES } from '../charts';
import { areaPath, C, Card, curvePath, linear, mix, Reveal, RevealG, rise, Stage, Tex, track, XAxis, YAxis } from '../kit';
import { abs, type SceneProps, texColor } from './part1';

// 第4章で使う値（第5章の MCMC で求めた事後分布の中央値）
const SIGMA = DATA.post.sigma.median;
const TAU = DATA.post.tau.median;
const MU_HAT = DATA.post.mu.median;
const shrinkWeight = (n: number) => SIGMA ** 2 / n / (SIGMA ** 2 / n + TAU ** 2);

// ---------- 4T 縮約の式 ----------
export const Scene4T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(120, 200, { width: 1680 })}>
    <Reveal at={cues[0]} style={{ fontSize: 34, color: C.text2 }}>
      <Tex tex="\mu,\ \tau,\ \sigma" size={40} /> が分かっているとき、学校 j の θ の事後分布の平均は？
    </Reveal>
    <Reveal at={cues[1]} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 34 }}>
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        <div>
          <span style={{ color: PRIOR, fontWeight: 700 }}>事前分布</span> ← 2段めの <Tex tex="\mathcal{N}(\mu,\tau^2)" size={36} />
        </div>
        <div>
          <span style={{ color: LIKE, fontWeight: 700 }}>尤度</span> ← 学校 j の平均点 <Tex tex="\bar y_j" size={36} />
        </div>
      </div>
      <div style={{ fontSize: 40, color: C.muted }}>⇒</div>
      <Tex
        tex={`\\tilde\\theta_j=\\dfrac{${texColor(LIKE, '\\frac{n_j}{\\sigma^2}')}\\,\\bar y_j+${texColor(PRIOR, '\\frac{1}{\\tau^2}')}\\,\\mu}{${texColor(LIKE, '\\frac{n_j}{\\sigma^2}')}+${texColor(PRIOR, '\\frac{1}{\\tau^2}')}}`}
        size={40}
      />
      <div style={{ fontSize: 26, color: C.text2 }}>（第2章の式で m₀ → μ、s₀ → τ）</div>
    </Reveal>
    <Reveal at={cues[2]} style={{ marginTop: 12 }}>
      <Card accent={POST} style={{ display: 'flex', alignItems: 'center', gap: 60, padding: '12px 40px' }}>
        <Tex tex={`\\tilde\\theta_j=(1-B_j)\\,${texColor(RAW, '\\bar y_j')}+B_j\\,${texColor(MU, '\\mu')}`} size={54} />
        <div style={{ fontSize: 32, lineHeight: 1.5 }}>
          学校の平均点と、全体の平均 μ の
          <br />
          <b>重みつき平均</b>
        </div>
      </Card>
    </Reveal>
    <Reveal at={cues[3]} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 50 }}>
      <Tex tex="B_j=\dfrac{\sigma^2/n_j}{\sigma^2/n_j+\tau^2}" size={48} />
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        <div>
          <Tex tex="\sigma^2/n_j" size={36} />：平均点のぶれ（人数が少ないほど大きい）
        </div>
        <div>
          <Tex tex="\tau^2" size={36} />：学校の間のばらつき
        </div>
      </div>
    </Reveal>
    <div style={{ marginTop: 14, display: 'flex', gap: 28 }}>
      <Reveal at={cues[4]} style={{ flex: 1.25 }}>
        <Card accent={SMALL} style={{ padding: '12px 26px', fontSize: 29, lineHeight: 1.5, height: 124 }}>
          <b style={{ color: SMALL }}>縮約（シュリンケージ）</b>
          <br />
          人数 <Tex tex="n_j" size={34} /> が少ない → <Tex tex="B_j\to 1" size={34} /> → μ へ引き寄せる
        </Card>
      </Reveal>
      <Reveal at={cues[5]} style={{ flex: 1 }}>
        <Card style={{ padding: '12px 26px', fontSize: 29, lineHeight: 1.5, height: 124 }}>
          <div>
            <Tex tex="\tau\to 0" size={34} />：<Tex tex="B_j=1" size={34} />　<b style={{ color: C.orange }}>まとめて</b>
          </div>
          <div>
            <Tex tex="\tau\to\infty" size={34} />：<Tex tex="B_j=0" size={34} />　<b style={{ color: C.blue }}>別々</b>
          </div>
        </Card>
      </Reveal>
    </div>
  </div>
);

// ---------- 4K τ を動かすと、推定値はどう変わるか ----------
const TK = { left: 230, right: 1490, top: 240, bottom: 600, from: 46, to: 76, tauMax: 30, densBase: 838, densHeight: 150 };
const TK_TICKS = [50, 60, 70];
const TAU_TICKS = [0, 5, 10, 15, 20, 25, 30];
const LABEL_GAP = 30;

export const Scene4K: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const profile = DATA.tauProfile;
  const sx = linear(0, TK.tauMax, TK.left, TK.right);
  const sy = linear(TK.from, TK.to, TK.bottom, TK.top);
  const tauNow = track(frame, [cues[2] + 10, cues[2] + 130], [0, TK.tauMax]);
  const focus = rise(frame, cues[3], 20);
  // τ ＝ 0 の点（格子の最初の行）は、線を伸ばす前から見せておく
  const visible = profile.filter((row) => row.tau <= Math.max(tauNow, profile[0].tau) + 1e-6);
  const last = profile[profile.length - 1];
  const labelY = declutter(last.theta.map((value) => sy(value) + 9), LABEL_GAP);
  // τ の事後分布（格子で計算したもの）の中央値と 95% 区間
  const step = profile[1].tau - profile[0].tau;
  let mass = 0;
  const cut = { lo: 0, mid: 0, hi: 0 };
  for (const row of profile) {
    mass += row.density * step;
    if (!cut.lo && mass >= 0.025) cut.lo = row.tau;
    if (!cut.mid && mass >= 0.5) cut.mid = row.tau;
    if (!cut.hi && mass >= 0.975) cut.hi = row.tau;
  }
  const maxDensity = Math.max(...profile.map((row) => row.density));
  const dy = linear(0, maxDensity, TK.densBase, TK.densBase - TK.densHeight);
  const densityAt = (tau: number) => {
    const index = Math.min(profile.length - 1, Math.round(tau / step));
    return profile[index].density;
  };
  const densShown = rise(frame, cues[4], 24);
  const guide = rise(frame, cues[5], 20);
  const midIndex = Math.round(cut.mid / step);
  return (
    <Stage>
      <RevealG at={cues[0]}>
        <YAxis sy={sy} x={TK.left} ticks={TK_TICKS} y0={TK.from} y1={TK.to} label="推定値（点）" gridTo={TK.right} />
        <line x1={TK.left} x2={TK.right} y1={TK.bottom} y2={TK.bottom} stroke={C.axis} strokeWidth={2} />
        <XAxis sx={sx} y={TK.densBase} ticks={TAU_TICKS} x0={0} x1={TK.tauMax} />
        <foreignObject x={TK.right + 14} y={TK.densBase - 30} width={60} height={60}>
          <Tex tex="\tau" size={38} color={C.text2} />
        </foreignObject>
        <text x={TK.right} y={TK.top - 18} fill={C.text2} fontSize={26} textAnchor="end">
          σ ＝ {fmt1(DATA.sigmaHat)} に固定
        </text>
      </RevealG>
      {DATA.schools.map((school, j) => {
        const color = highlightColor(school.name, C.text2);
        const dim = SMALL_NAMES.includes(school.name) || LARGE_NAMES.includes(school.name) ? 1 : mix(1, 0.3, focus);
        const points = visible.map((row) => [sx(row.tau), sy(row.theta[j])] as [number, number]);
        const end = points[points.length - 1];
        return (
          <g key={school.name} opacity={rise(frame, cues[0] + 10, 16) * dim}>
            {points.length > 1 ? <path d={polyline(points)} fill="none" stroke={color} strokeWidth={SMALL_NAMES.includes(school.name) || LARGE_NAMES.includes(school.name) ? 5 : 3.5} /> : null}
            {end ? <circle cx={end[0]} cy={end[1]} r={6} fill={color} /> : null}
            <g opacity={rise(frame, cues[2] + 120, 16)}>
              <line x1={TK.right} x2={TK.right + 12} y1={sy(last.theta[j])} y2={labelY[j] - 9} stroke={color} strokeWidth={2} />
              <text x={TK.right + 18} y={labelY[j]} fill={color} fontSize={26} fontWeight={700}>
                {school.name} 校 <tspan fill={C.text2} fontWeight={400}>{school.n}人</tspan>
              </text>
            </g>
          </g>
        );
      })}
      <RevealG at={cues[1] + 10} out={cues[2] + 60}>
        <text x={TK.left + 24} y={sy(profile[0].mu) - 30} fill={C.orange} fontSize={30} fontWeight={700}>
          τ ＝ 0：全員の平均 {fmt1(profile[0].mu)}（まとめて）
        </text>
      </RevealG>
      <RevealG at={cues[2] + 120}>
        <text x={TK.right - 10} y={TK.top + 34} fill={C.blue} fontSize={28} fontWeight={700} textAnchor="end">
          右へ行くほど、各学校の平均点（別々）→
        </text>
      </RevealG>
      <g opacity={densShown}>
        <path d={areaPath((tau) => densityAt(tau), 0, TK.tauMax, sx, dy, 300)} fill={POST} opacity={0.25} />
        <path d={areaPath((tau) => (tau >= cut.lo && tau <= cut.hi ? densityAt(tau) : 0), 0, TK.tauMax, sx, dy, 300)} fill={POST} opacity={0.35} />
        <path d={curvePath((tau) => densityAt(tau), 0, TK.tauMax, sx, dy, 300)} fill="none" stroke={POST} strokeWidth={3} />
        <text x={sx(cut.hi) + 16} y={TK.densBase - 60} fill={POST} fontSize={28} fontWeight={700}>
          τ の事後分布
        </text>
      </g>
      <g opacity={guide}>
        <line x1={sx(cut.mid)} x2={sx(cut.mid)} y1={TK.top} y2={TK.densBase} stroke={POST} strokeWidth={3} strokeDasharray="10 8" />
        {DATA.schools.map((school, j) => (
          <circle key={school.name} cx={sx(cut.mid)} cy={sy(profile[midIndex].theta[j])} r={9} fill={POST} stroke={C.bg} strokeWidth={2} />
        ))}
        <text x={sx(cut.mid) + 14} y={TK.bottom - 14} fill={POST} fontSize={28} fontWeight={700}>
          データが支持する τ
        </text>
      </g>
    </Stage>
  );
};

// ---------- 4V 人数と縮約の強さ ----------
const BV = { left: 230, right: 1300, top: 250, bottom: 790, nMax: 45 };
const N_TICKS = [0, 10, 20, 30, 40];
const B_TICKS = [0, 0.25, 0.5, 0.75, 1];

export const Scene4V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sx = linear(0, BV.nMax, BV.left, BV.right);
  const sy = linear(0, 1, BV.bottom, BV.top);
  const draw = track(frame, [cues[1], cues[1] + 60], [0.6, BV.nMax]);
  const halfN = SIGMA ** 2 / TAU ** 2;
  const focusC = rise(frame, cues[2], 16);
  const focusE = rise(frame, cues[3], 16);
  const c = schoolByName('C');
  const e = schoolByName('E');
  return (
    <>
      <Stage>
        <RevealG at={cues[0]}>
          <YAxis sy={sy} x={BV.left} ticks={B_TICKS} y0={0} y1={1} label="縮約の強さ B" gridTo={BV.right} format={(v) => v.toFixed(2)} />
          <XAxis sx={sx} y={BV.bottom} ticks={N_TICKS} x0={0} x1={BV.nMax} />
          <text x={BV.right} y={BV.bottom + 78} fill={C.text2} fontSize={28} textAnchor="end">
            人数 n →
          </text>
        </RevealG>
        <path d={curvePath(shrinkWeight, 0.6, Math.max(0.61, draw), sx, sy, 200)} fill="none" stroke={POST} strokeWidth={5} opacity={rise(frame, cues[1], 10)} />
        {DATA.schools.map((school) => {
          const color = highlightColor(school.name, C.text2);
          const isC = school.name === 'C';
          const isE = school.name === 'E';
          const big = isC ? focusC : isE ? focusE : 0;
          return (
            <RevealG key={school.name} at={cues[1] + 20 + (school.n / BV.nMax) * 40}>
              <circle cx={sx(school.n)} cy={sy(shrinkWeight(school.n))} r={9 + 6 * big} fill={color} stroke={C.bg} strokeWidth={2} />
              <text x={sx(school.n) + (school.name === 'G' ? 14 : 12)} y={sy(shrinkWeight(school.n)) + (school.name === 'G' ? 32 : -16)} fill={color} fontSize={26} fontWeight={700}>
                {school.name}
              </text>
            </RevealG>
          );
        })}
        <RevealG at={cues[4]}>
          <line x1={BV.left} x2={sx(halfN)} y1={sy(0.5)} y2={sy(0.5)} stroke={MU} strokeWidth={3} strokeDasharray="10 8" />
          <line x1={sx(halfN)} x2={sx(halfN)} y1={sy(0.5)} y2={BV.bottom} stroke={MU} strokeWidth={3} strokeDasharray="10 8" />
          <text x={sx(halfN) + 70} y={sy(0.64)} fill={MU} fontSize={30} fontWeight={700}>
            n ＝ σ²/τ² ≈ {halfN.toFixed(1)}人で、B ＝ 0.5
          </text>
        </RevealG>
      </Stage>
      <div style={abs(1400, 250, { width: 440 })}>
        <Reveal at={cues[0]}>
          <Card style={{ padding: '18px 24px' }}>
            <Tex tex="B=\dfrac{\sigma^2/n}{\sigma^2/n+\tau^2}" size={40} />
            <div style={{ fontSize: 28, color: C.text2, marginTop: 8 }}>
              τ ≈ {fmt1(TAU)}　σ ≈ {fmt1(SIGMA)}
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 22 }}>
          <Card accent={SMALL} style={{ padding: '16px 24px', fontSize: 30, lineHeight: 1.5 }}>
            <b style={{ color: SMALL }}>C 校（{c.n}人）</b>
            <div>
              B ≈ <b style={{ fontSize: 40 }}>{shrinkWeight(c.n).toFixed(2)}</b>
            </div>
            <div style={{ color: C.text2, fontSize: 27 }}>半分以上、全体の平均へ</div>
          </Card>
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 22 }}>
          <Card accent={LARGE} style={{ padding: '16px 24px', fontSize: 30, lineHeight: 1.5 }}>
            <b style={{ color: LARGE }}>E 校（{e.n}人）</b>
            <div>
              B ≈ <b style={{ fontSize: 40 }}>{shrinkWeight(e.n).toFixed(2)}</b>
            </div>
            <div style={{ color: C.text2, fontSize: 27 }}>ほとんど自分の平均点のまま</div>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

// ---------- 4E C 校で計算してみる ----------
const NUMBER_LINE = { left: 520, right: 1400, from: 58, to: 76, y: 790 };
const NUMBER_TICKS = [60, 65, 70, 75];

export const Scene4E: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const c = schoolByName('C');
  const e = schoolByName('E');
  const meanC = c.scores.reduce((a, b) => a + b, 0) / c.n;
  const meanE = e.scores.reduce((a, b) => a + b, 0) / e.n;
  const varC = SIGMA ** 2 / c.n;
  const varE = SIGMA ** 2 / e.n;
  const bC = shrinkWeight(c.n);
  const bE = shrinkWeight(e.n);
  const estC = (1 - bC) * meanC + bC * MU_HAT;
  const estE = (1 - bE) * meanE + bE * MU_HAT;
  const sx = linear(NUMBER_LINE.from, NUMBER_LINE.to, NUMBER_LINE.left, NUMBER_LINE.right);
  const slide = track(frame, [cues[3] + 30, cues[3] + 80], [0, 1]);
  const lineY = NUMBER_LINE.y;
  const chips = [
    { tex: `\\bar y_{\\mathrm{C}}=${fmt1(meanC)}`, color: RAW },
    { tex: `n_{\\mathrm{C}}=${c.n}`, color: RAW },
    { tex: `\\sigma\\approx${SIGMA.toFixed(2)}`, color: C.text2 },
    { tex: `\\tau\\approx${TAU.toFixed(2)}`, color: C.text2 },
    { tex: `\\mu\\approx${MU_HAT.toFixed(2)}`, color: MU },
  ];
  return (
    <>
      <div style={abs(120, 205, { width: 1680 })}>
        <Reveal at={cues[1]} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {chips.map((chip) => (
            <Card key={chip.tex} accent={chip.color} style={{ padding: '8px 22px' }}>
              <Tex tex={chip.tex} size={38} />
            </Card>
          ))}
          <span style={{ fontSize: 24, color: C.text2, marginLeft: 6, whiteSpace: 'nowrap' }}>σ・τ・μ は第5章の MCMC の中央値</span>
        </Reveal>
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 44 }}>
          <Reveal at={cues[2]}>
            <Tex tex={`\\dfrac{\\sigma^2}{n_{\\mathrm{C}}}\\approx${fmt1(varC)},\\quad \\tau^2\\approx${fmt1(TAU ** 2)}`} size={46} />
          </Reveal>
          <Reveal at={cues[2] + 60}>
            <Tex tex={`\\Rightarrow\\quad B_{\\mathrm{C}}=\\dfrac{${fmt1(varC)}}{${fmt1(varC)}+${fmt1(TAU ** 2)}}\\approx ${bC.toFixed(2)}`} size={46} />
          </Reveal>
        </div>
        <Reveal at={cues[3]} style={{ marginTop: 22 }}>
          <Card accent={POST} style={{ display: 'inline-block', padding: '14px 30px' }}>
            <Tex tex={`\\tilde\\theta_{\\mathrm{C}}=(1-B_{\\mathrm{C}})\\times ${fmt1(meanC)}+B_{\\mathrm{C}}\\times ${fmt1(MU_HAT)}\\approx ${texColor(POST, fmt1(estC))}`} size={44} />
          </Card>
        </Reveal>
        <Reveal at={cues[4]} style={{ marginTop: 22, fontSize: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
          <b style={{ color: LARGE }}>E 校（{e.n}人）</b>
          <Tex tex={`\\sigma^2/n_{\\mathrm{E}}\\approx${fmt1(varE)},\\quad B_{\\mathrm{E}}\\approx${bE.toFixed(2)},\\quad ${fmt1(meanE)}\\ \\to\\ ${texColor(POST, fmt1(estE))}`} size={40} />
        </Reveal>
      </div>
      <Stage>
        <RevealG at={cues[3] + 20}>
          <line x1={sx(NUMBER_LINE.from)} x2={sx(NUMBER_LINE.to)} y1={lineY} y2={lineY} stroke={C.axis} strokeWidth={2} />
          {NUMBER_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={sx(tick)} x2={sx(tick)} y1={lineY} y2={lineY + 10} stroke={C.axis} strokeWidth={2} />
              <text x={sx(tick)} y={lineY + 36} fill={C.muted} fontSize={22} textAnchor="middle">
                {tick}
              </text>
            </g>
          ))}
          <line x1={sx(MU_HAT)} x2={sx(MU_HAT)} y1={lineY - 34} y2={lineY} stroke={MU} strokeWidth={4} />
          <text x={sx(MU_HAT)} y={lineY - 46} fill={MU} fontSize={28} fontWeight={700} textAnchor="middle">
            μ {fmt1(MU_HAT)}
          </text>
          <circle cx={sx(meanC)} cy={lineY} r={12} fill={C.bg} stroke={RAW} strokeWidth={3.5} />
          <text x={sx(meanC)} y={lineY - 30} fill={RAW} fontSize={28} fontWeight={700} textAnchor="middle">
            平均点 {fmt1(meanC)}
          </text>
          {slide > 0 ? <circle cx={mix(sx(meanC), sx(estC), slide)} cy={lineY} r={12} fill={POST} /> : null}
        </RevealG>
        <RevealG at={cues[3] + 80}>
          <text x={sx(estC)} y={lineY - 30} fill={POST} fontSize={30} fontWeight={800} textAnchor="middle">
            {fmt1(estC)}
          </text>
        </RevealG>
      </Stage>
    </>
  );
};

// ---------- ここまでの整理 ----------
const RECAP = [
  { head: '共通の分布から選ばれる', body: '各グループのパラメータ θ は、共通の分布 N(μ, τ²) から。その分布もデータから推定する', color: POST },
  { head: '重みつき平均で、全体へ引き寄せる', body: 'データの少ないグループほど、全体の平均 μ へ強く引き寄せられる（縮約）', color: SMALL },
  { head: '後半：すべてをまとめて推定する', body: 'μ と τ も含めて MCMC で計算し、結果を確かめる', color: MU },
];

export const Mid: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 220, { width: 1600 })}>
    {RECAP.map((item, index) => (
      <Reveal key={item.head} at={cues[index + 1]} style={{ marginBottom: 28 }}>
        <Card accent={item.color} style={{ padding: '26px 40px', borderStyle: index === 2 ? 'dashed' : 'solid' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: item.color }}>{item.head}</div>
          <div style={{ fontSize: 34, color: C.text2, marginTop: 8 }}>{item.body}</div>
        </Card>
      </Reveal>
    ))}
  </div>
);
