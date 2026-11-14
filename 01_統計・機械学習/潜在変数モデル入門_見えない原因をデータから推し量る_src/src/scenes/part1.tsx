// part1.tsx — 題名、ポイント、第1章（潜在変数とは何か）、第2章（データが生まれる物語）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import {
  Arrow,
  C,
  Card,
  curvePath,
  GROUP_COLORS,
  linear,
  mix,
  normalPdf,
  Pill,
  Reveal,
  RevealG,
  rise,
  Stage,
  Tex,
  track,
  VarNode,
  XAxis,
  YAxis,
} from '../kit';
import { BIN_WIDTH, COUNTS_ALL, COUNTS_GROUP, HEIGHT, heightScales, X_MAX, X_MIN, X_TICKS } from '../model';
import { CHAPTERS } from '../script';

export type SceneProps = { cues: number[] };

const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });

// ---------- 題名 ----------
export const Intro: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const shrink = rise(frame, cues[2], 24);
  return (
    <>
      <div style={abs(0, mix(250, 90, shrink), { width: 1920, textAlign: 'center' })}>
        <div style={{ fontSize: mix(128, 92, shrink), fontWeight: 800, letterSpacing: '0.04em' }}>潜在変数モデル入門</div>
        <Reveal at={cues[0] + 20}>
          <div style={{ fontSize: mix(56, 44, shrink), color: C.text2, marginTop: 18 }}>見えない原因を、データから推し量る</div>
        </Reveal>
      </div>
      <Stage>
        <g opacity={1 - shrink}>
          <RevealG at={cues[0] + 40}>
            <VarNode x={820} y={640} label="z" />
            <Arrow x1={885} y1={640} x2={1035} y2={640} />
            <VarNode x={1100} y={640} label="x" observed />
            <text x={820} y={745} fill={C.text2} fontSize={32} textAnchor="middle">
              見えない原因
            </text>
            <text x={1100} y={745} fill={C.text2} fontSize={32} textAnchor="middle">
              データ
            </text>
          </RevealG>
        </g>
      </Stage>
      <Reveal at={cues[2] + 10} style={abs(190, 340, { width: 1540 })}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 30, alignItems: 'center', fontSize: 36, color: C.text2 }}>
          <Pill color={C.theory}>理論</Pill>式で確かめる
          <span style={{ width: 40 }} />
          <Pill color={C.visual}>図解</Pill>グラフで確かめる
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 70, rowGap: 22 }}>
          {CHAPTERS.map((chapter, index) => (
            <div key={chapter} style={{ fontSize: 42, display: 'flex', gap: 22, alignItems: 'baseline' }}>
              <span style={{ color: C.muted, fontWeight: 700, width: 44 }}>{index + 1}</span>
              <span>{chapter}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </>
  );
};

// ---------- この動画のポイント ----------
const PointCard: React.FC<{ at: number; no: number; head: string; children: React.ReactNode }> = ({ at, no, head, children }) => (
  <Reveal at={at} style={{ flex: 1 }}>
    <Card style={{ height: 620 }}>
      <div style={{ fontSize: 76, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{no}</div>
      <div style={{ fontSize: 44, fontWeight: 700, margin: '20px 0 26px', lineHeight: 1.4, height: 124 }}>{head}</div>
      {children}
    </Card>
  </Reveal>
);

export const Points: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(80, 190, { width: 1760, display: 'flex', gap: 36 })}>
    <PointCard at={cues[1]} no={1} head="潜在変数 ＝ 観測できない変数">
      <svg width={500} height={300} viewBox="0 0 500 300">
        <VarNode x={130} y={110} label="z" />
        <Arrow x1={195} y1={110} x2={305} y2={110} />
        <VarNode x={370} y={110} label="x" observed />
        <text x={130} y={220} fill={C.text2} fontSize={32} textAnchor="middle">
          見えない
        </text>
        <text x={370} y={220} fill={C.text2} fontSize={32} textAnchor="middle">
          見える
        </text>
      </svg>
    </PointCard>
    <PointCard at={cues[2]} no={2} head="「z を選ぶ → x を作る」の物語">
      <div style={{ fontSize: 38, lineHeight: 1.5 }}>
        <div style={{ border: `2px solid ${C.line}`, borderRadius: 14, padding: '14px 22px' }}>① z を選ぶ</div>
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 40 }}>↓</div>
        <div style={{ border: `2px solid ${C.line}`, borderRadius: 14, padding: '14px 22px' }}>② z に応じて x を作る</div>
      </div>
    </PointCard>
    <PointCard at={cues[3]} no={3} head="見えない z は、確率で推し量る">
      <div style={{ fontSize: 34, color: C.text2, marginBottom: 14 }}>x を見たあとの z の確率</div>
      <div style={{ display: 'flex', height: 76, borderRadius: 12, overflow: 'hidden', fontSize: 36, fontWeight: 700 }}>
        <div style={{ width: '13%', background: C.blue }} />
        <div style={{ width: '87%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg }}>87%</div>
      </div>
      <div style={{ fontSize: 32, color: C.text2, marginTop: 18 }}>ベイズの定理で求める</div>
    </PointCard>
  </div>
);

// ---------- 1T 観測変数と潜在変数 ----------
const EXAMPLES = [
  { latent: '学力', observed: 'テストの点数' },
  { latent: '病気', observed: '症状' },
  { latent: '客の好み', observed: '買い物の記録' },
];

export const Scene1T: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <RevealG at={cues[0]}>
        <VarNode x={330} y={640} r={84} label="x" observed />
        <text x={330} y={775} fill={C.text} fontSize={42} fontWeight={700} textAnchor="middle">
          観測変数
        </text>
        <text x={330} y={826} fill={C.text2} fontSize={32} textAnchor="middle">
          データに記録されている
        </text>
      </RevealG>
      <RevealG at={cues[1]}>
        <VarNode x={330} y={300} r={84} label="z" />
        <text x={480} y={290} fill={C.text} fontSize={42} fontWeight={700}>
          潜在変数
        </text>
        <text x={480} y={340} fill={C.text2} fontSize={32}>
          記録されていない
        </text>
        <Arrow x1={330} y1={392} x2={330} y2={548} />
        <text x={356} y={484} fill={C.text2} fontSize={32}>
          x の出方を左右する
        </text>
      </RevealG>
    </Stage>
    <div style={abs(900, 200, { width: 940 })}>
      <Reveal at={cues[2]}>
        <div style={{ display: 'flex', fontSize: 34, color: C.muted, fontWeight: 600, marginBottom: 14 }}>
          <span style={{ width: 360, textAlign: 'center' }}>見えない z</span>
          <span style={{ width: 120 }} />
          <span style={{ width: 400, textAlign: 'center' }}>見える x</span>
        </div>
      </Reveal>
      {EXAMPLES.map((example, index) => (
        <Reveal key={example.latent} at={index === 0 ? cues[2] : cues[3] + (index - 1) * 75} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 42, fontWeight: 600 }}>
            <div style={{ width: 360, textAlign: 'center', border: `3px dashed ${C.text2}`, borderRadius: 60, padding: '14px 0' }}>{example.latent}</div>
            <div style={{ width: 120, textAlign: 'center', color: C.muted, fontSize: 52 }}>→</div>
            <div style={{ width: 400, textAlign: 'center', background: '#4a4a46', borderRadius: 60, padding: '16px 0' }}>{example.observed}</div>
          </div>
        </Reveal>
      ))}
      <Reveal at={cues[4]} style={{ marginTop: 30 }}>
        <Card accent={C.theory} style={{ fontSize: 36, lineHeight: 1.5, padding: '18px 30px' }}>
          <b>潜在変数モデル</b>
          <br />
          見えない z をモデルの中に置き、x と一緒に考える
        </Card>
      </Reveal>
    </div>
  </>
);

// ---------- 1V 身長のデータ ----------
const HIST_BOX = { left: 220, right: 1700, top: 300, bottom: 770 };
const COUNT_MAX = 50;

export const Scene1V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sx = linear(X_MIN, X_MAX, HIST_BOX.left, HIST_BOX.right);
  const sy = linear(0, COUNT_MAX, HIST_BOX.bottom, HIST_BOX.top);
  const grow = rise(frame, cues[0] + 10, 40);
  const split = rise(frame, cues[4], 30);
  const barWidth = sx(X_MIN + BIN_WIDTH) - sx(X_MIN) - 4;
  const overallMean = HEIGHT.x.reduce((a, b) => a + b, 0) / HEIGHT.n;
  const overallSd = Math.sqrt(HEIGHT.x.reduce((a, b) => a + (b - overallMean) ** 2, 0) / HEIGHT.n);
  const singleNormal = (x: number) => HEIGHT.n * BIN_WIDTH * normalPdf(x, overallMean, overallSd);
  return (
    <>
      <Stage>
        <YAxis sy={sy} x={HIST_BOX.left} ticks={[0, 10, 20, 30, 40, 50]} y0={0} y1={COUNT_MAX} label="人数" gridTo={HIST_BOX.right} />
        <XAxis sx={sx} y={HIST_BOX.bottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} label="身長（cm）" />
        {COUNTS_ALL.map((count, bin) => {
          const x = sx(X_MIN + bin * BIN_WIDTH) + 2;
          const lower = COUNTS_GROUP[0][bin];
          return (
            <g key={bin}>
              <rect x={x} width={barWidth} y={sy(count * grow)} height={sy(0) - sy(count * grow)} fill="#77766f" />
              <g opacity={split}>
                <rect x={x} width={barWidth} y={sy(lower)} height={sy(0) - sy(lower)} fill={C.blue} />
                <rect x={x} width={barWidth} y={sy(count)} height={sy(lower) - sy(count)} fill={C.orange} />
              </g>
            </g>
          );
        })}
        <RevealG at={cues[1] + 60} out={cues[2]}>
          <text x={sx(159)} y={sy(38)} fill={C.yellow} fontSize={34} textAnchor="middle">
            山
          </text>
          <Arrow x1={sx(159)} y1={sy(37)} x2={sx(159)} y2={sy(33.5)} color={C.yellow} />
          <text x={sx(171)} y={sy(49)} fill={C.yellow} fontSize={34} textAnchor="middle">
            山
          </text>
          <Arrow x1={sx(171)} y1={sy(48)} x2={sx(171)} y2={sy(44.5)} color={C.yellow} />
        </RevealG>
        <RevealG at={cues[2]} out={cues[4]}>
          <path d={curvePath(singleNormal, X_MIN, X_MAX, sx, sy)} fill="none" stroke={C.text} strokeWidth={5} strokeDasharray="14 10" />
          <text x={sx(178)} y={sy(41)} fill={C.text} fontSize={32}>
            正規分布1つ
          </text>
          <text x={sx(178)} y={sy(41) + 42} fill={C.text2} fontSize={28}>
            平均 {overallMean.toFixed(1)}・標準偏差 {overallSd.toFixed(1)}
          </text>
        </RevealG>
        <RevealG at={cues[4]}>
          <text x={sx(146)} y={sy(30)} fill={C.blue} fontSize={36} fontWeight={700} textAnchor="middle">
            低いグループ
          </text>
          <text x={sx(184)} y={sy(30)} fill={C.orange} fontSize={36} fontWeight={700} textAnchor="middle">
            高いグループ
          </text>
        </RevealG>
      </Stage>
      <Reveal at={cues[0]} style={abs(1260, 846, { fontSize: 28, color: C.muted })}>
        大人400人・乱数で作った合成データ
      </Reveal>
      <Reveal at={cues[3]} style={abs(240, 196, { fontSize: 36, color: C.text2 })}>
        2つのグループが混ざっている（どちらかは記録なし）
      </Reveal>
      <Reveal at={cues[5]} style={abs(1270, 176)}>
        <Card accent={C.yellow} style={{ fontSize: 38, padding: '14px 28px' }}>
          グループの番号 ＝ 潜在変数 <Tex tex="z" size={42} />
        </Card>
      </Reveal>
    </>
  );
};

// ---------- 2T 「z を選ぶ → x を作る」 ----------
export const Scene2T: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <RevealG at={cues[1]}>
        <VarNode x={250} y={330} r={78} label="z" />
      </RevealG>
      <RevealG at={cues[2]}>
        <Arrow x1={250} y1={416} x2={250} y2={544} />
        <VarNode x={250} y={630} r={78} label="x" observed />
      </RevealG>
    </Stage>
    <div style={abs(430, 215, { width: 1400 })}>
      <Reveal at={cues[1]} dim={cues[4]}>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.yellow }}>第1段階　z を決める</div>
        <div style={{ fontSize: 34, color: C.text2, margin: '2px 0 0' }}>グループ k を、確率 π で選ぶ</div>
        <Tex tex="p(z=k)=\pi_k" size={50} />
      </Reveal>
      <Reveal at={cues[2]} dim={cues[4]} style={{ marginTop: 22 }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.yellow }}>第2段階　z に応じて x を作る</div>
        <div style={{ fontSize: 34, color: C.text2, margin: '2px 0 0' }}>グループ k の正規分布から、身長を1つ取り出す</div>
        <Tex tex="p(x\mid z=k)=\mathcal{N}(x\mid \mu_k,\ \sigma_k^2)" size={50} />
      </Reveal>
      <Reveal at={cues[4]} style={{ marginTop: 24 }}>
        <Card accent={C.theory} style={{ display: 'flex', alignItems: 'center', gap: 40, padding: '10px 34px' }}>
          <span style={{ fontSize: 40, fontWeight: 700 }}>同時分布</span>
          <Tex tex="p(x,\ z)=p(z)\,p(x\mid z)" size={54} />
        </Card>
      </Reveal>
      <Reveal at={cues[5]} style={{ marginTop: 14, fontSize: 36, color: C.text2 }}>
        データの作り方を確率で書いたモデル ＝ <b style={{ color: C.text }}>生成モデル</b>
      </Reveal>
    </div>
  </>
);

// ---------- 2G 丸と矢印で書く ----------
const LEGEND = [
  { head: '白い丸', body: '潜在変数（観測できない）' },
  { head: '塗った丸', body: '観測変数（データにある）' },
  { head: '矢印', body: 'z の値が、x の出方を決める' },
  { head: '四角い枠', body: '同じことを N 回繰り返す' },
];

export const Scene2G: React.FC<SceneProps> = ({ cues }) => {
  const legendAt = [cues[1], cues[1] + 80, cues[2], cues[3]];
  return (
    <>
      <Stage>
        <RevealG at={cues[0]}>
          <VarNode x={480} y={340} r={88} label="z_i" />
          <VarNode x={480} y={660} r={88} label="x_i" observed />
        </RevealG>
        <RevealG at={cues[0] + 20}>
          <Arrow x1={480} y1={436} x2={480} y2={564} width={5} />
        </RevealG>
        <RevealG at={cues[3]}>
          <rect x={300} y={210} width={360} height={600} rx={18} fill="none" stroke={C.text2} strokeWidth={3} />
          <foreignObject x={560} y={740} width={90} height={60}>
            <div style={{ color: C.text2, textAlign: 'right' }}>
              <Tex tex="N" size={44} />
            </div>
          </foreignObject>
        </RevealG>
      </Stage>
      <div style={abs(860, 240, { width: 960 })}>
        {LEGEND.map((item, index) => (
          <Reveal key={item.head} at={legendAt[index]} style={{ display: 'flex', alignItems: 'baseline', gap: 30, marginBottom: 38 }}>
            <span style={{ fontSize: 44, fontWeight: 700, width: 250, color: C.yellow }}>{item.head}</span>
            <span style={{ fontSize: 40 }}>{item.body}</span>
          </Reveal>
        ))}
        <Reveal at={cues[4]} style={{ marginTop: 20 }}>
          <Card accent={C.theory} style={{ fontSize: 38 }}>
            教科書や論文では、<b>白い丸が潜在変数</b>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

// ---------- 2V 物語を動かしてみる ----------
const DOT_BIN = 1; // 点を積む区間の幅（cm）
const DOT_RADIUS = 6.5;
const DOT_STACK = (() => {
  const levels = new Map<number, number>();
  return HEIGHT.x.map((x) => {
    const bin = Math.floor(x / DOT_BIN);
    const level = levels.get(bin) ?? 0;
    levels.set(bin, level + 1);
    return { center: (bin + 0.5) * DOT_BIN, level };
  });
})();
const SAMPLE_BOX = { left: 420, right: 1820, curveTop: 190, curveBottom: 430, stackBottom: 830 };
const SLOW_SAMPLES = 30;

export const Scene2V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, sy } = heightScales(SAMPLE_BOX.left, SAMPLE_BOX.right, SAMPLE_BOX.curveTop + 20, SAMPLE_BOX.curveBottom, 0.09);
  const truth = HEIGHT.truth;
  // 取り出した点の数（小数部分は、落ちている途中）
  const shown = track(frame, [cues[2], cues[2] + 40, cues[3], cues[4], cues[4] + 100], [0, 1, 1, SLOW_SAMPLES, HEIGHT.n]);
  const chosen = rise(frame, cues[1] + 20);
  const hide = rise(frame, cues[5] + 30, 30);
  const latest = Math.min(HEIGHT.n - 1, Math.max(0, Math.ceil(shown) - 1));
  const currentGroup = HEIGHT.group[latest];
  const picking = frame >= cues[1] && shown < HEIGHT.n;
  return (
    <>
      <Stage>
        {[0, 1].map((k) => {
          const active = picking && currentGroup === k ? chosen : 0;
          return (
            <g key={k} opacity={mix(0.45, 1, active) * (1 - 0.6 * hide)}>
              <path
                d={curvePath((x) => normalPdf(x, truth.means[k], truth.sds[k]), X_MIN, X_MAX, sx, sy)}
                fill={GROUP_COLORS[k]}
                fillOpacity={0.12 + 0.25 * active}
                stroke={GROUP_COLORS[k]}
                strokeWidth={4}
              />
              <text x={sx(truth.means[k])} y={SAMPLE_BOX.curveTop + 6} fill={GROUP_COLORS[k]} fontSize={34} fontWeight={700} textAnchor="middle">
                グループ{k + 1}
              </text>
            </g>
          );
        })}
        <line x1={SAMPLE_BOX.left} x2={SAMPLE_BOX.right} y1={SAMPLE_BOX.curveBottom} y2={SAMPLE_BOX.curveBottom} stroke={C.axis} strokeWidth={2} />
        <XAxis sx={sx} y={SAMPLE_BOX.stackBottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} />
        {HEIGHT.x.map((x, i) => {
          const progress = Math.min(1, Math.max(0, shown - i));
          if (progress <= 0) return null;
          const stackY = SAMPLE_BOX.stackBottom - DOT_RADIUS - 2 - DOT_STACK[i].level * DOT_RADIUS * 2;
          const cx = mix(sx(x), sx(DOT_STACK[i].center), progress);
          const cy = mix(SAMPLE_BOX.curveBottom, stackY, progress * progress);
          return <circle key={i} cx={cx} cy={cy} r={DOT_RADIUS} fill={hide > 0.5 ? '#9a9992' : GROUP_COLORS[HEIGHT.group[i]]} opacity={0.95} />;
        })}
        <text x={SAMPLE_BOX.right} y={SAMPLE_BOX.stackBottom + 78} fill={C.text2} fontSize={28} textAnchor="end">
          身長 x（cm）
        </text>
      </Stage>
      <div style={abs(80, 200, { width: 320 })}>
        <Reveal at={cues[1]}>
          <div style={{ fontSize: 38, fontWeight: 700, color: C.yellow }}>① z を選ぶ</div>
          <div style={{ fontSize: 30, color: C.text2, marginTop: 6 }}>確率 1/2 ずつ</div>
          {picking ? (
            <div style={{ fontSize: 40, marginTop: 14, opacity: chosen, color: GROUP_COLORS[currentGroup], fontWeight: 700 }}>グループ{currentGroup + 1}</div>
          ) : (
            <div style={{ height: 74 }} />
          )}
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 60 }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: C.yellow }}>② x を作る</div>
          <div style={{ fontSize: 30, color: C.text2, marginTop: 6 }}>その分布から1つ</div>
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 70 }}>
          <div style={{ fontSize: 34, color: C.text2 }}>取り出した数</div>
          <div style={{ fontSize: 64, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.floor(shown)}</div>
        </Reveal>
      </div>
      <Reveal at={cues[5] + 30} style={abs(470, 470)}>
        <Card accent={C.yellow} style={{ fontSize: 38, padding: '14px 28px' }}>
          見えるのは x だけ（z は見えない）
        </Card>
      </Reveal>
    </>
  );
};
