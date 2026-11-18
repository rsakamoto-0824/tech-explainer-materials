// part1.tsx — 題名、ポイント、第1章（例題：学校ごとの平均点）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DATA, fmt1, highlightColor, LARGE, POST, RAW, schoolByName, ScoreAxis, SMALL, TRUE } from '../charts';
import { Arrow, C, Card, linear, mix, Pill, Reveal, RevealG, rise, Stage, Tex } from '../kit';

export type SceneProps = { cues: number[] };

export const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });
export const texColor = (color: string, body: string) => `\\textcolor{${color}}{${body}}`;

// ---------- 題名 ----------
const MINI_THETAS = 5;
const MiniTree: React.FC<{ at: number }> = ({ at }) => {
  const top = { x: 360, y: 46 };
  const xs = Array.from({ length: MINI_THETAS }, (_, i) => 80 + i * 140);
  return (
    <svg width={720} height={250} viewBox="0 0 720 250">
      <RevealG at={at}>
        <ellipse cx={top.x} cy={top.y} rx={78} ry={36} fill={C.bg} stroke={C.yellow} strokeWidth={3} />
        <text x={top.x} y={top.y + 11} fill={C.text} fontSize={32} textAnchor="middle" fontStyle="italic">
          μ, τ
        </text>
      </RevealG>
      {xs.map((x, i) => (
        <RevealG key={i} at={at + 10 + i * 4}>
          <line x1={top.x} y1={top.y + 36} x2={x} y2={130} stroke={C.axis} strokeWidth={2.5} />
          <circle cx={x} cy={150} r={26} fill={C.bg} stroke={POST} strokeWidth={3} />
          <text x={x} y={160} fill={C.text} fontSize={28} textAnchor="middle" fontStyle="italic">
            θ
          </text>
          <line x1={x} y1={176} x2={x} y2={200} stroke={C.axis} strokeWidth={2.5} />
          {Array.from({ length: 2 + ((i * 3) % 5) }, (_, k) => (
            <circle key={k} cx={x - 30 + ((k * 13) % 60)} cy={214 + (k % 2) * 16} r={5} fill={C.text2} />
          ))}
        </RevealG>
      ))}
    </svg>
  );
};

export const Intro: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(0, 0, { width: 1920, height: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' })}>
    <Reveal at={cues[0]} style={{ fontSize: 40, color: C.text2, letterSpacing: '0.08em' }}>
      Hierarchical Bayesian Model
    </Reveal>
    <Reveal at={cues[0] + 6} style={{ fontSize: 112, fontWeight: 800, marginTop: 10 }}>
      階層ベイズモデル
    </Reveal>
    <Reveal at={cues[1]} style={{ fontSize: 50, color: C.yellow, fontWeight: 700, marginTop: 20 }}>
      データの少ないグループを、全体の情報で補う
    </Reveal>
    <div style={{ marginTop: 34 }}>
      <MiniTree at={cues[1] + 20} />
    </div>
    <Reveal at={cues[2]} style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 22, fontSize: 38, color: C.text2 }}>
      <Pill color={C.theory}>理論</Pill>と<Pill color={C.visual}>図解</Pill>を交互に　全7章
    </Reveal>
  </div>
);

// ---------- ポイント ----------
const POINTS = [
  { head: '事前分布も、データから学ぶ', body: 'グループごとのパラメータの分布を、決め打ちせずに推定する' },
  { head: '少ないグループほど、全体へ引き寄せる', body: '推定値は、グループの平均と全体の平均の重みつき平均（縮約）' },
  { head: '引き寄せる強さ τ も、データが決める', body: 'グループの間のばらつき τ を、一緒に推定する' },
];

export const Points: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 210, { width: 1600 })}>
    {POINTS.map((point, index) => (
      <Reveal key={index} at={cues[index + 1]} style={{ marginBottom: 30 }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '30px 40px' }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: C.yellow, width: 70, textAlign: 'center' }}>{index + 1}</div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 700 }}>{point.head}</div>
            <div style={{ fontSize: 36, color: C.text2, marginTop: 8 }}>{point.body}</div>
          </div>
        </Card>
      </Reveal>
    ))}
  </div>
);

// ---------- 1V 8つの学校のテストの点数 ----------
const STRIP = { left: 200, columnWidth: 160, top: 235, bottom: 760, from: 20, to: 100 };
const STRIP_TICKS = [20, 40, 60, 80, 100];
const JITTER_PX = 46;
const jitter = (i: number, j: number) => {
  const value = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

export const Scene1V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sy = linear(STRIP.from, STRIP.to, STRIP.bottom, STRIP.top);
  const right = STRIP.left + STRIP.columnWidth * DATA.schools.length;
  const meanShown = rise(frame, cues[2], 20);
  const focus = rise(frame, cues[3], 20);
  return (
    <>
      <Stage>
        {STRIP_TICKS.map((tick) => (
          <g key={tick}>
            <line x1={STRIP.left - 10} x2={right} y1={sy(tick)} y2={sy(tick)} stroke={C.grid} strokeWidth={1.5} />
            <text x={STRIP.left - 22} y={sy(tick) + 9} fill={C.text2} fontSize={26} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        <text x={STRIP.left - 22} y={STRIP.top - 22} fill={C.text2} fontSize={26} textAnchor="end">
          点
        </text>
        {DATA.schools.map((school, j) => {
          const cx = STRIP.left + STRIP.columnWidth * (j + 0.5);
          const isFocus = school.name === 'C' || school.name === 'G';
          const dim = isFocus ? 1 : mix(1, 0.28, focus);
          const appear = rise(frame, cues[0] + 12 + j * 7, 18);
          const color = highlightColor(school.name, C.text2);
          const emphasize = (school.name === 'C' || school.name === 'E') ? rise(frame, cues[1] + 10, 14) : 0;
          return (
            <g key={school.name} opacity={dim}>
              <g opacity={appear}>
                {school.scores.map((score, i) => (
                  <circle key={i} cx={cx + jitter(i, j) * JITTER_PX} cy={sy(score)} r={7} fill={color} opacity={0.75} />
                ))}
              </g>
              <g opacity={meanShown}>
                <line x1={cx - 58} x2={cx + 58} y1={sy(school.mean)} y2={sy(school.mean)} stroke={RAW} strokeWidth={6} strokeLinecap="round" />
              </g>
              <text x={cx} y={STRIP.bottom + 48} fill={C.text} fontSize={38} fontWeight={700} textAnchor="middle" opacity={appear}>
                {school.name}
              </text>
              {emphasize > 0 ? (
                <rect x={cx - 52} y={STRIP.bottom + 62} width={104} height={40} rx={10} fill={color} opacity={0.25 * emphasize} />
              ) : null}
              <text x={cx} y={STRIP.bottom + 92} fill={color} fontSize={28 + 4 * emphasize} fontWeight={emphasize > 0 ? 700 : 400} textAnchor="middle" opacity={appear}>
                {school.n}人
              </text>
            </g>
          );
        })}
        {['C', 'G'].map((name) => {
          const j = DATA.schools.findIndex((school) => school.name === name);
          const school = DATA.schools[j];
          const cx = STRIP.left + STRIP.columnWidth * (j + 0.5);
          const above = name === 'C';
          return (
            <RevealG key={name} at={cues[2] + 24}>
              <text x={cx} y={sy(school.mean) + (above ? -22 : 44)} fill={SMALL} fontSize={34} fontWeight={800} textAnchor="middle" stroke={C.bg} strokeWidth={6} paintOrder="stroke">
                {fmt1(school.mean)}
              </text>
            </RevealG>
          );
        })}
      </Stage>
      <div style={abs(1530, 240, { width: 330 })}>
        <Reveal at={cues[1]} style={{ marginBottom: 20 }}>
          <Card style={{ padding: '18px 24px', fontSize: 30, lineHeight: 1.55 }}>
            <div style={{ color: C.text2 }}>受験した人数</div>
            <div style={{ fontWeight: 700 }}>
              <span style={{ color: SMALL }}>3人</span> 〜 <span style={{ color: LARGE }}>40人</span>
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[2]} style={{ marginBottom: 20 }}>
          <Card style={{ padding: '18px 24px', fontSize: 30, lineHeight: 1.55 }}>
            <div style={{ color: C.text2 }}>
              <span style={{ display: 'inline-block', width: 34, height: 6, background: RAW, verticalAlign: 'middle', marginRight: 10 }} />
              平均点
            </div>
            <div>
              最高 <b style={{ color: SMALL }}>C 校 72.3</b>
            </div>
            <div>
              最低 <b style={{ color: SMALL }}>G 校 49.5</b>
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[4]}>
          <Card accent={POST} style={{ padding: '18px 24px', fontSize: 30, lineHeight: 1.5 }}>
            <Tex tex="\theta_j" size={46} color={POST} />
            <div style={{ fontWeight: 700, marginTop: 4 }}>学校 j の本当の実力</div>
            <div style={{ color: C.text2, fontSize: 26, marginTop: 4 }}>生徒をたくさん集めたときの平均点</div>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

// ---------- 1T すぐに思いつく推定は2通り ----------
const SEPARATE_ROWS = [
  { name: 'C', n: 3 },
  { name: 'E', n: 40 },
];

export const Scene1T: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const marker = rise(frame, cues[5] + 12, 30);
  return (
    <>
      <div style={abs(110, 205, { width: 1700, display: 'flex', gap: 40 })}>
        <Reveal at={cues[0]} style={{ flex: 1 }}>
          <Card accent={C.blue} style={{ height: 545 }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: C.blue }}>① 別々に推定</div>
            <div style={{ fontSize: 30, color: C.text2, marginTop: 4 }}>学校ごとの平均点を、そのまま使う</div>
            <div style={{ marginTop: 18 }}>
              <Tex tex="\hat\theta_j=\bar y_j" size={58} />
            </div>
            <Reveal at={cues[1]} style={{ marginTop: 12, fontSize: 32, display: 'flex', alignItems: 'center', gap: 18, whiteSpace: 'nowrap' }}>
              <span>ぶれ（標準誤差）</span>
              <Tex tex="\dfrac{\sigma}{\sqrt{n_j}}" size={46} />
              <span style={{ color: C.text2, fontSize: 26 }}>
                <Tex tex="\sigma\approx 13.6" size={32} />：学校の中のばらつき
              </span>
            </Reveal>
            <Reveal at={cues[2]} style={{ marginTop: 10 }}>
              {SEPARATE_ROWS.map((row) => (
                <div key={row.name} style={{ display: 'flex', alignItems: 'baseline', gap: 20, fontSize: 34, lineHeight: 1.55 }}>
                  <span style={{ width: 230, color: highlightColor(row.name), fontWeight: 700 }}>
                    {row.name} 校（{row.n}人）
                  </span>
                  <span>
                    標準誤差 <b style={{ fontSize: 40 }}>{(DATA.sigmaHat / Math.sqrt(row.n)).toFixed(1)}</b> 点
                  </span>
                </div>
              ))}
            </Reveal>
          </Card>
        </Reveal>
        <Reveal at={cues[3]} style={{ flex: 1 }}>
          <Card accent={C.orange} style={{ height: 545 }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: C.orange }}>② まとめて推定</div>
            <div style={{ fontSize: 30, color: C.text2, marginTop: 4 }}>{DATA.N}人全員の平均を、どの学校にも使う</div>
            <div style={{ marginTop: 18 }}>
              <Tex tex={`\\hat\\theta_j=\\bar y=${fmt1(DATA.pooledMean)}`} size={58} />
            </div>
            <Reveal at={cues[4]} style={{ marginTop: 26, fontSize: 34, lineHeight: 1.6 }}>
              <div>
                <span style={{ color: C.aqua, fontWeight: 700 }}>○</span> ぶれない
              </div>
              <div>
                <span style={{ color: C.orange, fontWeight: 700 }}>×</span> 学校の間の違いを、すべて無視する
              </div>
            </Reveal>
          </Card>
        </Reveal>
      </div>
      <Reveal at={cues[5]} style={abs(210, 772, { width: 1500 })}>
        <div style={{ position: 'relative', height: 110 }}>
          <div style={{ position: 'absolute', left: 140, right: 140, top: 30, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${C.blue}, ${C.orange})` }} />
          <div style={{ position: 'absolute', left: 0, top: 14, fontSize: 32, color: C.blue, fontWeight: 700 }}>別々</div>
          <div style={{ position: 'absolute', right: 0, top: 14, fontSize: 32, color: C.orange, fontWeight: 700 }}>まとめて</div>
          <div style={{ position: 'absolute', left: `${mix(14, 46, marker)}%`, top: 12, width: 46, height: 46, borderRadius: 23, background: POST, border: `4px solid ${C.bg}` }} />
          <div style={{ position: 'absolute', left: `${mix(14, 46, marker) - 6}%`, top: 66, fontSize: 32, color: POST, fontWeight: 700, whiteSpace: 'nowrap' }}>階層ベイズ：データで選ぶ</div>
        </div>
      </Reveal>
    </>
  );
};

// ---------- 1C もう一度テストをしたら ----------
const LINE = { left: 360, right: 1640, from: 30, to: 90 };
const LINE_TICKS = [30, 40, 50, 60, 70, 80, 90];
const LINE_Y = { C: 455, E: 735 };
const DOT_ROWS = 3;

export const Scene1C: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sx = linear(LINE.from, LINE.to, LINE.left, LINE.right);
  const resampleC = DATA.resample.find((r) => r.name === 'C')!;
  const resampleE = DATA.resample.find((r) => r.name === 'E')!;
  const plan = [
    { r: resampleC, y: LINE_Y.C, start: cues[1] + 40, span: 120, bracketAt: cues[2] },
    { r: resampleE, y: LINE_Y.E, start: cues[3], span: 70, bracketAt: cues[3] + 80 },
  ];
  const observedC = schoolByName('C').mean;
  return (
    <Stage>
      {plan.map(({ r, y, start, span, bracketAt }) => (
        <g key={r.name}>
          <RevealG at={cues[0]}>
            <ScoreAxis sx={sx} y={y} from={LINE.from} to={LINE.to} ticks={LINE_TICKS} />
            <text x={LINE.left - 40} y={y - 6} fill={highlightColor(r.name, C.text)} fontSize={38} fontWeight={700} textAnchor="end">
              {r.name} 校
            </text>
            <text x={LINE.left - 40} y={y + 36} fill={C.text2} fontSize={30} textAnchor="end">
              {r.n}人
            </text>
          </RevealG>
          <RevealG at={cues[1]}>
            <line x1={sx(r.theta)} x2={sx(r.theta)} y1={y - 176} y2={y} stroke={TRUE} strokeWidth={4} strokeDasharray="10 7" />
            <text x={sx(r.theta)} y={y - 188} fill={TRUE} fontSize={28} fontWeight={700} textAnchor="middle">
              本当の実力 {fmt1(r.theta)}
            </text>
          </RevealG>
          {r.means.map((value, k) => {
            const shown = rise(frame, start + (span * k) / r.means.length, 8);
            return (
              <circle
                key={k}
                cx={sx(value)}
                cy={y - 26 - (k % DOT_ROWS) * 24 - (1 - shown) * 30}
                r={10}
                fill={highlightColor(r.name, C.text)}
                opacity={shown * 0.85}
              />
            );
          })}
          <RevealG at={bracketAt}>
            <path
              d={`M${sx(r.min)} ${y - 108} v-12 H${sx(r.max)} v12`}
              fill="none"
              stroke={C.text}
              strokeWidth={3}
            />
            <text x={(sx(r.min) + sx(r.max)) / 2} y={y - 130} fill={C.text} fontSize={30} fontWeight={700} textAnchor="middle">
              {fmt1(r.min)} 〜 {fmt1(r.max)}
            </text>
          </RevealG>
        </g>
      ))}
      <RevealG at={cues[1] + 6}>
        <text x={LINE.right} y={222} fill={C.text2} fontSize={28} textAnchor="end">
          ● ＝ テストをやり直したときの平均点（{DATA.resample[0].means.length}回）
        </text>
      </RevealG>
      <RevealG at={cues[4]}>
        <circle cx={sx(observedC)} cy={LINE_Y.C} r={16} fill="none" stroke={C.yellow} strokeWidth={5} />
        <Arrow x1={sx(observedC) + 150} y1={LINE_Y.C + 64} x2={sx(observedC) + 22} y2={LINE_Y.C + 12} color={C.yellow} width={3} />
        <text x={sx(observedC) + 160} y={LINE_Y.C + 82} fill={C.yellow} fontSize={30} fontWeight={700}>
          手元のデータ {fmt1(observedC)}（1位）
        </text>
      </RevealG>
      <RevealG at={cues[5]}>
        <rect x={560} y={820} width={800} height={64} rx={14} fill={C.panel} stroke={POST} strokeWidth={2} />
        <text x={960} y={864} fill={C.text} fontSize={34} fontWeight={700} textAnchor="middle">
          少ないデータを、ほかの情報で補えないか？
        </text>
      </RevealG>
    </Stage>
  );
};
