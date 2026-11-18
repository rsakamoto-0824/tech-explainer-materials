// part2.tsx — 第2章（ベイズ推定のおさらい）、第3章（階層モデルを組み立てる）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DATA, fmt1, LARGE, LIKE, MU, POST, PRIOR, schoolByName, ScoreAxis, SMALL } from '../charts';
import { areaPath, C, Card, curvePath, linear, normalPdf, Reveal, RevealG, rise, Stage, Tex, track } from '../kit';
import { abs, type SceneProps, texColor } from './part1';

// ---------- 2T ベイズの定理 ----------
export const Scene2T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(120, 200, { width: 1680 })}>
    <Reveal at={cues[1]} style={{ fontSize: 38 }}>
      知りたいパラメータ <Tex tex="\theta" size={46} color={POST} /> を、1つの値ではなく<b>分布</b>で表す
    </Reveal>
    <Reveal at={cues[2]} style={{ marginTop: 16, display: 'flex', gap: 34 }}>
      <Card accent={PRIOR} style={{ flex: 1, padding: '10px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: PRIOR }}>事前分布</span>
          <Tex tex="p(\theta)" size={44} />
        </div>
        <div style={{ fontSize: 30, color: C.text2, marginTop: 4 }}>データを見る前の考え</div>
      </Card>
      <Card accent={LIKE} style={{ flex: 1, padding: '10px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: LIKE }}>尤度</span>
          <Tex tex="p(y\mid\theta)" size={44} />
        </div>
        <div style={{ fontSize: 30, color: C.text2, marginTop: 4 }}>θ のもとでの、データ y の出やすさ</div>
      </Card>
    </Reveal>
    <Reveal at={cues[3]} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 40 }}>
      <Tex
        tex={`${texColor(POST, 'p(\\theta\\mid y)')}=\\dfrac{${texColor(LIKE, 'p(y\\mid\\theta)')}\\,${texColor(PRIOR, 'p(\\theta)')}}{p(y)}\\;\\propto\\;${texColor(LIKE, 'p(y\\mid\\theta)')}\\,${texColor(PRIOR, 'p(\\theta)')}`}
        size={54}
      />
      <div style={{ fontSize: 34, lineHeight: 1.5 }}>
        <b style={{ color: POST }}>事後分布</b> は
        <br />
        尤度 × 事前分布 に比例
      </div>
    </Reveal>
    <Reveal at={cues[4]} style={{ marginTop: 18 }}>
      <Card style={{ padding: '14px 32px' }}>
        <div style={{ fontSize: 29, color: C.text2 }}>どちらも正規分布のとき（事前分布：平均 m₀、標準偏差 s₀）</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 50, marginTop: 4 }}>
          <Tex
            tex={`\\text{事後分布の平均}=\\dfrac{${texColor(LIKE, '\\frac{n}{\\sigma^2}')}\\,\\bar y+${texColor(PRIOR, '\\frac{1}{s_0^2}')}\\,m_0}{${texColor(LIKE, '\\frac{n}{\\sigma^2}')}+${texColor(PRIOR, '\\frac{1}{s_0^2}')}}`}
            size={42}
          />
          <Reveal at={cues[5]} style={{ fontSize: 30, lineHeight: 1.55 }}>
            <div>
              <span style={{ color: LIKE, fontWeight: 700 }}>n/σ²</span>：データの精度
            </div>
            <div>
              <span style={{ color: PRIOR, fontWeight: 700 }}>1/s₀²</span>：事前分布の精度
            </div>
            <div style={{ color: C.text2 }}>精度 ＝ 分散の逆数</div>
          </Reveal>
        </div>
      </Card>
    </Reveal>
  </div>
);

// ---------- 2V 事前分布と尤度から、事後分布を作る ----------
const PRIOR_MEAN = 60;
const PRIOR_SD = 8;
const BAYES_RANGE = { from: 30, to: 90 };
const BAYES_TICKS = [30, 40, 50, 60, 70, 80, 90];
const PANEL_TOP = 372;
const PANEL_BASE = 700;

/** 正規分布どうしの掛け算（事後分布の平均と標準偏差） */
const combine = (mean: number, sd: number) => {
  const precision = 1 / PRIOR_SD ** 2 + 1 / sd ** 2;
  return { mean: (PRIOR_MEAN / PRIOR_SD ** 2 + mean / sd ** 2) / precision, sd: 1 / Math.sqrt(precision) };
};

const BayesPanel: React.FC<{ name: string; left: number; width: number; maxDensity: number; times: [number, number, number] }> = ({ name, left, width, maxDensity, times }) => {
  const frame = useCurrentFrame();
  const school = schoolByName(name);
  const likeSd = DATA.sigmaHat / Math.sqrt(school.n);
  const post = combine(school.mean, likeSd);
  const sx = linear(BAYES_RANGE.from, BAYES_RANGE.to, left, left + width);
  const sy = linear(0, maxDensity, PANEL_BASE, PANEL_TOP);
  const { from, to } = BAYES_RANGE;
  const curves = [
    { at: times[0], mean: PRIOR_MEAN, sd: PRIOR_SD, color: PRIOR, label: `${PRIOR_MEAN}`, fill: 0.12, dash: '12 8' },
    { at: times[1], mean: school.mean, sd: likeSd, color: LIKE, label: fmt1(school.mean), fill: 0.18, dash: undefined },
    { at: times[2], mean: post.mean, sd: post.sd, color: POST, label: fmt1(post.mean), fill: 0.35, dash: undefined },
  ];
  // 尤度と事後分布の平均が近いときは、ラベルを線の左右に分けて重ならないようにする
  const close = Math.abs(post.mean - school.mean) < 4;
  const labelAnchor = (index: number) => (close && index === 1 ? 'end' : close && index === 2 ? 'start' : 'middle');
  const labelShift = (index: number) => (close && index === 1 ? -8 : close && index === 2 ? 8 : 0);
  return (
    <g>
      <RevealG at={times[0]}>
        <text x={left + width / 2} y={290} fill={name === 'C' ? SMALL : LARGE} fontSize={36} fontWeight={700} textAnchor="middle">
          {name} 校（{school.n}人）
        </text>
        <ScoreAxis sx={sx} y={PANEL_BASE} from={from} to={to} ticks={BAYES_TICKS} />
      </RevealG>
      {curves.map((curve, index) => {
        const shown = rise(frame, curve.at, 20);
        const f = (x: number) => normalPdf(x, curve.mean, curve.sd) * shown;
        const peak = Math.max(PANEL_TOP, sy(normalPdf(curve.mean, curve.mean, curve.sd)));
        return (
          <g key={index} opacity={shown}>
            <path d={areaPath(f, from, to, sx, sy, 240)} fill={curve.color} opacity={curve.fill} />
            <path d={curvePath(f, from, to, sx, sy, 240)} fill="none" stroke={curve.color} strokeWidth={4} strokeDasharray={curve.dash} />
            <line x1={sx(curve.mean)} x2={sx(curve.mean)} y1={PANEL_BASE} y2={peak} stroke={curve.color} strokeWidth={2} strokeDasharray="4 6" />
            <text x={sx(curve.mean) + labelShift(index)} y={peak - 14} fill={curve.color} fontSize={30} fontWeight={700} textAnchor={labelAnchor(index)} stroke={C.bg} strokeWidth={6} paintOrder="stroke">
              {curve.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const LEGEND = [
  { color: PRIOR, label: '事前分布（仮に 平均60・標準偏差8）', dash: true },
  { color: LIKE, label: '尤度（その学校のデータ）', dash: false },
  { color: POST, label: '事後分布', dash: false },
];

export const Scene2V: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <BayesPanel name="C" left={150} width={740} maxDensity={0.078} times={[cues[0], cues[1], cues[2]]} />
      <BayesPanel name="E" left={1030} width={740} maxDensity={0.2} times={[cues[3], cues[3] + 30, cues[3] + 70]} />
      {LEGEND.map((item, index) => (
        <RevealG key={item.label} at={cues[0] + index * 8}>
          <line x1={160 + index * 560} x2={210 + index * 560} y1={226} y2={226} stroke={item.color} strokeWidth={5} strokeDasharray={item.dash ? '12 8' : undefined} />
          <text x={222 + index * 560} y={236} fill={C.text2} fontSize={27}>
            {item.label}
          </text>
        </RevealG>
      ))}
    </Stage>
    <Reveal at={cues[4]} out={cues[5]} style={abs(300, 800, { width: 1320 })}>
      <Card style={{ padding: '14px 30px', fontSize: 34, textAlign: 'center' }}>
        データが<b style={{ color: SMALL }}>少ない</b>ほど事前分布に頼り、<b style={{ color: LARGE }}>多い</b>ほどデータに従う
      </Card>
    </Reveal>
    <Reveal at={cues[5]} style={abs(240, 800, { width: 1440 })}>
      <Card accent={MU} style={{ padding: '14px 30px', fontSize: 34, textAlign: 'center' }}>
        事前分布の平均と幅は？　→　<b style={{ color: MU }}>ほかの学校のデータから決める</b>（階層ベイズ）
      </Card>
    </Reveal>
  </>
);

// ---------- 3T 階層モデルを式で書く ----------
const LEVELS = [
  { step: '1段め', name: 'データ', tex: 'y_{ij}\\sim\\mathcal{N}(\\theta_j,\\ \\sigma^2)', note: '学校 j の生徒 i の点数', color: C.text2 },
  { step: '2段め', name: '学校', tex: '\\theta_j\\sim\\mathcal{N}(\\mu,\\ \\tau^2)', note: '8校に共通の分布から選ばれる', color: POST },
  { step: '3段め', name: '全体', tex: '\\mu,\\ \\tau,\\ \\sigma\\ \\sim\\ p(\\mu,\\tau,\\sigma)', note: '超事前分布', color: MU },
];

export const Scene3T: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const glow = rise(frame, cues[5], 20);
  const levelAt = [cues[1], cues[2], cues[4]];
  return (
    <div style={abs(140, 200, { width: 1640 })}>
      <Reveal at={cues[0]} style={{ fontSize: 34, color: C.text2 }}>
        <Tex tex="i" size={40} />：生徒の番号　　<Tex tex="j" size={40} />：学校の番号（A〜H の8校）
      </Reveal>
      {LEVELS.map((level, index) => (
        <React.Fragment key={level.step}>
          <Reveal at={levelAt[index]} style={{ marginTop: index === 2 ? 12 : 14 }}>
            <Card
              accent={index === 1 ? (glow > 0 ? POST : level.color) : level.color}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 34px',
                boxShadow: index === 1 ? `0 0 ${36 * glow}px ${POST}` : undefined,
              }}
            >
              <div style={{ width: 250 }}>
                <div style={{ fontSize: 28, color: C.muted }}>{level.step}</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: level.color === C.text2 ? C.text : level.color }}>{level.name}</div>
              </div>
              <div style={{ width: 700 }}>
                <Tex tex={level.tex} size={50} />
              </div>
              <div style={{ fontSize: 32, color: C.text2 }}>{level.note}</div>
            </Card>
          </Reveal>
          {index === 1 ? (
            <Reveal at={cues[3]} style={{ display: 'flex', gap: 60, fontSize: 32, margin: '10px 0 0 260px' }}>
              <span>
                <Tex tex="\mu" size={40} color={MU} />：学校全体の平均的な実力
              </span>
              <span>
                <Tex tex="\tau" size={40} color={MU} />：学校の間の実力のばらつき
              </span>
            </Reveal>
          ) : null}
        </React.Fragment>
      ))}
      <Reveal at={cues[5] + 10} style={{ marginTop: 20, fontSize: 34, textAlign: 'center' }}>
        2段めの分布 ＝ θ の<b style={{ color: POST }}>事前分布</b>。その平均 μ と幅 τ も、<b style={{ color: MU }}>データから一緒に推定</b>する
      </Reveal>
    </div>
  );
};

// ---------- 3V 階層の構造を図で見る ----------
const TREE = { topX: 960, topY: 290, thetaY: 515, dataY: 728, firstX: 300, stepX: 188 };
const thetaX = (index: number) => TREE.firstX + TREE.stepX * index;
const FLOW_DASH = 18;
const FLOW_SPEED = 2.4; // 1コマに進む画素

/** 情報の流れ。太い線の上を、点線が流れる */
const FlowPath: React.FC<{ points: [number, number][]; color: string; at: number }> = ({ points, color, at }) => {
  const frame = useCurrentFrame();
  const shown = rise(frame, at, 24);
  if (shown <= 0) return null;
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  const drawn = track(frame, [at, at + 40], [0, 1]);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.28 * shown} strokeDasharray={`${length * drawn} ${length}`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${FLOW_DASH} ${FLOW_DASH}`}
        strokeDashoffset={-(frame - at) * FLOW_SPEED}
        opacity={shown * drawn}
      />
    </g>
  );
};

export const Scene3V: React.FC<SceneProps> = ({ cues }) => {
  const eIndex = DATA.schools.findIndex((school) => school.name === 'E');
  const cIndex = DATA.schools.findIndex((school) => school.name === 'C');
  return (
    <Stage>
      {[
        { y: TREE.topY, label: '全体', at: cues[1] },
        { y: TREE.thetaY, label: '学校', at: cues[2] },
        { y: TREE.dataY, label: '生徒', at: cues[3] },
      ].map((row) => (
        <RevealG key={row.label} at={row.at}>
          <text x={110} y={row.y + 12} fill={C.muted} fontSize={30} fontWeight={700}>
            {row.label}
          </text>
        </RevealG>
      ))}
      <RevealG at={cues[1]}>
        <ellipse cx={TREE.topX} cy={TREE.topY} rx={120} ry={52} fill={C.bg} stroke={MU} strokeWidth={4} />
        <foreignObject x={TREE.topX - 120} y={TREE.topY - 52} width={240} height={104}>
          <div style={{ width: 240, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tex tex="\mu,\ \tau" size={50} />
          </div>
        </foreignObject>
      </RevealG>
      {DATA.schools.map((school, index) => (
        <g key={school.name}>
          <RevealG at={cues[2] + index * 4}>
            <line x1={TREE.topX} y1={TREE.topY + 52} x2={thetaX(index)} y2={TREE.thetaY - 48} stroke={C.axis} strokeWidth={3} />
            <circle cx={thetaX(index)} cy={TREE.thetaY} r={46} fill={C.bg} stroke={POST} strokeWidth={4} />
            <foreignObject x={thetaX(index) - 46} y={TREE.thetaY - 46} width={92} height={92}>
              <div style={{ width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tex tex={`\\theta_{\\mathrm{${school.name}}}`} size={40} />
              </div>
            </foreignObject>
          </RevealG>
          <RevealG at={cues[3] + index * 4}>
            <line x1={thetaX(index)} y1={TREE.thetaY + 46} x2={thetaX(index)} y2={TREE.dataY - 40} stroke={C.axis} strokeWidth={3} />
            <polygon points={`${thetaX(index)},${TREE.dataY - 34} ${thetaX(index) - 9},${TREE.dataY - 50} ${thetaX(index) + 9},${TREE.dataY - 50}`} fill={C.axis} />
            <rect x={thetaX(index) - 70} y={TREE.dataY - 34} width={140} height={68} rx={12} fill={C.panel} stroke={C.line} strokeWidth={2} />
            <text x={thetaX(index)} y={TREE.dataY + 11} fill={school.name === 'C' ? SMALL : school.name === 'E' ? LARGE : C.text} fontSize={30} fontWeight={700} textAnchor="middle">
              {school.n}人
            </text>
          </RevealG>
        </g>
      ))}
      <RevealG at={cues[3] + 40}>
        <text x={1830} y={TREE.thetaY + 120} fill={C.text2} fontSize={26} textAnchor="end">
          ↓ データが作られる向き
        </text>
      </RevealG>
      <FlowPath
        at={cues[4] + 10}
        color={LARGE}
        points={[
          [thetaX(eIndex), TREE.dataY - 34],
          [thetaX(eIndex), TREE.thetaY + 46],
          [thetaX(eIndex), TREE.thetaY - 46],
          [TREE.topX + 40, TREE.topY + 48],
        ]}
      />
      <FlowPath
        at={cues[5] + 10}
        color={SMALL}
        points={[
          [TREE.topX - 40, TREE.topY + 48],
          [thetaX(cIndex), TREE.thetaY - 46],
        ]}
      />
      <RevealG at={cues[4] + 30}>
        <text x={thetaX(eIndex) + 64} y={TREE.thetaY + 110} fill={LARGE} fontSize={30} fontWeight={700}>
          40人のデータ
        </text>
      </RevealG>
      <RevealG at={cues[5] + 40}>
        <rect x={560} y={252} width={260} height={56} rx={12} fill={C.panel} stroke={SMALL} strokeWidth={2} />
        <text x={690} y={291} fill={SMALL} fontSize={32} fontWeight={700} textAnchor="middle">
          情報を借りる
        </text>
      </RevealG>
    </Stage>
  );
};
