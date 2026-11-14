// part3.tsx — 第5章（EM アルゴリズム）と、途中の整理。
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { areaPath, Arrow, blend, C, Card, curvePath, GROUP_COLORS, linear, mix, Reveal, RevealG, rise, Stage, Tex, track, XAxis, YAxis } from '../kit';
import { BIN_WIDTH, COUNT_TO_DENSITY, COUNTS_ALL, EM_HISTORY, HEIGHT, heightScales, lerpParams, mixture, resp2, weighted, X_MAX, X_MIN, X_TICKS } from '../model';
import type { SceneProps } from './part1';

const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });
const BLUE = C.blue;
const ORANGE = C.orange;
const texColor = (color: string, body: string) => `\\textcolor{${color}}{${body}}`;
const LAST_ITERATION = EM_HISTORY.length - 1;

// ---------- 5L 当てはまりの物差し ― 尤度 ----------
export const Scene5L: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(150, 200, { width: 1620 })}>
    <Reveal at={cues[0]} dim={cues[1]} style={{ fontSize: 36, color: C.text2, marginTop: -14 }}>
      パラメータ <Tex tex="\theta=(\pi,\ \mu,\ \sigma)" size={42} color={C.text} /> を、データから決めたい
    </Reveal>
    <Reveal at={cues[1]} dim={cues[2]} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 50 }}>
      <div style={{ width: 620 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.yellow }}>尤度</div>
        <div style={{ fontSize: 34, color: C.text2, lineHeight: 1.5 }}>いまのパラメータのもとで、手元のデータがどれくらい出やすいか</div>
      </div>
      <Tex tex="L(\theta)=\prod_{i=1}^{N}p(x_i)" size={52} />
    </Reveal>
    <Reveal at={cues[2]} dim={cues[4]} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 50 }}>
      <div style={{ width: 620 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.yellow }}>対数尤度</div>
        <div style={{ fontSize: 34, color: C.text2, lineHeight: 1.5 }}>掛け算を、対数で足し算にする。大きいほど当てはまりが良い</div>
      </div>
      <Tex tex="\log L(\theta)=\sum_{i=1}^{N}\log p(x_i)" size={52} />
    </Reveal>
    <Reveal at={cues[3]} dim={cues[4]} style={{ marginTop: 12, fontSize: 38 }}>
      <b style={{ color: C.yellow }}>最尤推定</b>　対数尤度がいちばん大きくなるパラメータを選ぶ
    </Reveal>
    <Reveal at={cues[4]} style={{ marginTop: 14 }}>
      <Card accent={C.theory} style={{ padding: '8px 34px 14px' }}>
        <Tex
          tex={`\\log L(\\theta)=\\sum_{i=1}^{N}\\log\\Bigl(${texColor(C.yellow, '\\pi_1\\,\\mathcal{N}(x_i\\mid\\mu_1,\\sigma_1^2)+\\pi_2\\,\\mathcal{N}(x_i\\mid\\mu_2,\\sigma_2^2)')}\\Bigr)`}
          size={46}
        />
        <div style={{ fontSize: 32, color: C.text2, marginTop: 2 }}>
          <span style={{ color: C.yellow }}>対数の中に足し算</span>がある　→　式を解いて、1回で答えを出すことができない
        </div>
      </Card>
    </Reveal>
  </div>
);

// ---------- 5T 鶏が先か、卵が先か ----------
export const Scene5T: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <RevealG at={cues[0]}>
        <Arrow x1={640} y1={330} x2={1270} y2={330} color={C.yellow} width={5} />
      </RevealG>
      <RevealG at={cues[1]}>
        <Arrow x1={1270} y1={610} x2={640} y2={610} color={C.violet} width={5} />
      </RevealG>
    </Stage>
    <Reveal at={cues[0]} style={abs(150, 280, { width: 480 })}>
      <Card style={{ height: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 40 }}>全員の z</div>
        <div style={{ fontSize: 36, color: C.text2, marginTop: 14 }}>どのグループか</div>
        <Reveal at={cues[2]} dy={0}>
          <div style={{ fontSize: 80, color: C.muted, fontWeight: 700 }}>？</div>
        </Reveal>
      </Card>
    </Reveal>
    <Reveal at={cues[0]} style={abs(1290, 280, { width: 480 })}>
      <Card style={{ height: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 40 }}>パラメータ</div>
        <div style={{ marginTop: 10 }}>
          <Tex tex="\pi,\ \mu,\ \sigma" size={50} />
        </div>
        <Reveal at={cues[2]} dy={0}>
          <div style={{ fontSize: 80, color: C.muted, fontWeight: 700 }}>？</div>
        </Reveal>
      </Card>
    </Reveal>
    <Reveal at={cues[0]} style={abs(640, 216, { width: 640, textAlign: 'center', fontSize: 34, lineHeight: 1.45 })}>
      z が分かれば、グループごとに
      <br />
      平均と標準偏差を計算できる
    </Reveal>
    <Reveal at={cues[1]} style={abs(640, 630, { width: 640, textAlign: 'center', fontSize: 34, lineHeight: 1.45 })}>
      パラメータが分かれば、
      <br />
      負担率で z を推し量れる
    </Reveal>
    <Reveal at={cues[3]} style={abs(640, 356, { width: 640, textAlign: 'center' })}>
      <span style={{ fontSize: 40, fontWeight: 700, color: C.yellow }}>M ステップ</span>
    </Reveal>
    <Reveal at={cues[3]} style={abs(640, 536, { width: 640, textAlign: 'center' })}>
      <span style={{ fontSize: 40, fontWeight: 700, color: C.violet }}>E ステップ</span>
    </Reveal>
    <Reveal at={cues[3]} style={abs(330, 770, { width: 1260 })}>
      <Card accent={C.theory} style={{ fontSize: 40, textAlign: 'center', padding: '16px 30px' }}>
        <b>EM アルゴリズム</b>　適当な値から出発して、2つを交互に繰り返す
      </Card>
    </Reveal>
  </>
);

// ---------- 5E E ステップと M ステップ ----------
export const Scene5E: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Reveal at={cues[1]} dim={cues[2]} style={abs(100, 200, { width: 800 })}>
      <Card accent={C.violet} style={{ height: 560 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.violet }}>E ステップ</div>
        <div style={{ fontSize: 34, color: C.text2, margin: '8px 0 40px', lineHeight: 1.5 }}>いまのパラメータで、全員の負担率を計算する</div>
        <Tex tex="\gamma_{ik}=\frac{\displaystyle\pi_k\,\mathcal{N}(x_i\mid\mu_k,\sigma_k^2)}{\displaystyle\sum_{j}\pi_j\,\mathcal{N}(x_i\mid\mu_j,\sigma_j^2)}" size={50} />
        <div style={{ fontSize: 30, color: C.muted, marginTop: 40 }}>i：人の番号　　k：グループの番号</div>
      </Card>
    </Reveal>
    <Reveal at={cues[2]} style={abs(940, 200, { width: 880 })}>
      <Card accent={C.yellow} style={{ height: 560 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.yellow }}>M ステップ</div>
        <div style={{ fontSize: 34, color: C.text2, margin: '8px 0 14px', lineHeight: 1.5 }}>負担率を重みにして、パラメータを計算し直す</div>
        <Reveal at={cues[3]} style={{ display: 'flex', alignItems: 'center', gap: 34, height: 130 }}>
          <Tex tex="\mu_k=\frac{\sum_i\gamma_{ik}\,x_i}{\sum_i\gamma_{ik}}" size={48} />
          <span style={{ fontSize: 32, color: C.text2 }}>重みつきの平均</span>
        </Reveal>
        <Reveal at={cues[4]} style={{ display: 'flex', alignItems: 'center', gap: 34, height: 120 }}>
          <Tex tex="\pi_k=\frac{1}{N}\sum_i\gamma_{ik}" size={48} />
          <span style={{ fontSize: 32, color: C.text2 }}>負担率の平均</span>
        </Reveal>
        <Reveal at={cues[4] + 60} style={{ display: 'flex', alignItems: 'center', gap: 34, height: 130 }}>
          <Tex tex="\sigma_k^2=\frac{\sum_i\gamma_{ik}\,(x_i-\mu_k)^2}{\sum_i\gamma_{ik}}" size={48} />
        </Reveal>
      </Card>
    </Reveal>
    <Reveal at={cues[5]} style={abs(100, 782, { width: 1720 })}>
      <Card accent={C.theory} style={{ fontSize: 38, padding: '14px 30px', display: 'flex', alignItems: 'center', gap: 40 }}>
        <span>繰り返しても、対数尤度は下がらない</span>
        <Tex tex="\log L(\theta^{\text{new}})\ \ge\ \log L(\theta^{\text{old}})" size={46} />
      </Card>
    </Reveal>
  </>
);

// ---------- 5V EM アルゴリズムを動かす ----------
const EM_PLOT = { left: 150, right: 1130, top: 200, bottom: 600 };
const STRIP = { top: 716, bottom: 816 };
const LL_PLOT = { left: 1320, right: 1840, top: 250, bottom: 600 };
const LL_RANGE = [-4.3, -3.5];
// 点を縦にばらして重なりを減らす（番号から決まる、いつも同じずれ）
const JITTER = HEIGHT.x.map((_, i) => ((i * 0.6180339887) % 1));

export const Scene5V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, sy } = heightScales(EM_PLOT.left, EM_PLOT.right, EM_PLOT.top, EM_PLOT.bottom, 0.06);
  const iteration = track(
    frame,
    [cues[2] + 20, cues[2] + 80, cues[3] + 10, cues[4] - 10, cues[5] - 10, cues[5] + 10, cues[5] + 90],
    [0, 1, 1, 20, 60, 60, LAST_ITERATION],
  );
  const lower = Math.floor(iteration);
  const upper = Math.min(LAST_ITERATION, lower + 1);
  const params = lerpParams(EM_HISTORY[lower], EM_HISTORY[upper], iteration - lower);
  const logLik = mix(EM_HISTORY[lower].logLik, EM_HISTORY[upper].logLik, iteration - lower);
  const colored = rise(frame, cues[1] + 10, 30);
  const sxIter = linear(0, LAST_ITERATION, LL_PLOT.left, LL_PLOT.right);
  const syLik = linear(LL_RANGE[0], LL_RANGE[1], LL_PLOT.bottom, LL_PLOT.top);
  const likPath = useMemo(() => EM_HISTORY.map((h, i) => `${i === 0 ? 'M' : 'L'}${sxIter(i).toFixed(1)} ${syLik(h.logLik).toFixed(1)}`), [sxIter, syLik]);
  const drawn = likPath.slice(0, Math.max(1, Math.floor(iteration) + 1)).join('') + `L${sxIter(iteration).toFixed(1)} ${syLik(logLik).toFixed(1)}`;
  return (
    <>
      <Stage>
        <XAxis sx={sx} y={EM_PLOT.bottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} />
        {COUNTS_ALL.map((count, bin) => {
          const top = sy(count * COUNT_TO_DENSITY);
          return <rect key={bin} x={sx(X_MIN + bin * BIN_WIDTH) + 2} width={sx(X_MIN + BIN_WIDTH) - sx(X_MIN) - 4} y={top} height={sy(0) - top} fill="#4a4a46" />;
        })}
        {[0, 1].map((k) => (
          <g key={k}>
            <path d={areaPath((x) => weighted(params, k, x), X_MIN, X_MAX, sx, sy)} fill={GROUP_COLORS[k]} fillOpacity={0.16} stroke={GROUP_COLORS[k]} strokeWidth={4} />
            <line x1={sx(params.means[k])} x2={sx(params.means[k])} y1={EM_PLOT.bottom} y2={sy(weighted(params, k, params.means[k]))} stroke={GROUP_COLORS[k]} strokeWidth={2} strokeDasharray="8 6" />
          </g>
        ))}
        <path d={curvePath((x) => mixture(params, x), X_MIN, X_MAX, sx, sy)} fill="none" stroke={C.text} strokeWidth={4} />
        {HEIGHT.x.map((x, i) => (
          <circle
            key={i}
            cx={sx(x)}
            cy={mix(STRIP.top, STRIP.bottom, JITTER[i])}
            r={6}
            fill={colored > 0 ? blend(BLUE, ORANGE, resp2(params, x)) : '#9a9992'}
            opacity={mix(0.75, 0.95, colored)}
          />
        ))}
        <text x={EM_PLOT.left} y={STRIP.top - 20} fill={C.text2} fontSize={28}>
          1人ずつの点（色 ＝ 負担率）
        </text>
        <text x={EM_PLOT.right} y={STRIP.bottom + 46} fill={C.text2} fontSize={28} textAnchor="end">
          身長 x（cm）
        </text>
        <g opacity={rise(frame, cues[4] - 30)}>
          <YAxis sy={syLik} x={LL_PLOT.left} ticks={[-4.2, -4.0, -3.8, -3.6]} y0={LL_RANGE[0]} y1={LL_RANGE[1]} gridTo={LL_PLOT.right} format={(v) => v.toFixed(1)} />
          <XAxis sx={sxIter} y={LL_PLOT.bottom} ticks={[0, 50, 100, 150]} x0={0} x1={LAST_ITERATION} label="繰り返しの回数" />
          <text x={LL_PLOT.left - 30} y={LL_PLOT.top - 22} fill={C.text2} fontSize={28}>
            対数尤度（1人あたり）
          </text>
          <path d={drawn} fill="none" stroke={C.yellow} strokeWidth={4} />
          <circle cx={sxIter(iteration)} cy={syLik(logLik)} r={9} fill={C.yellow} />
        </g>
      </Stage>
      <div style={abs(1300, 730, { width: 560, fontSize: 34, lineHeight: 1.6, fontVariantNumeric: 'tabular-nums' })}>
        <div>
          繰り返し <b style={{ fontSize: 46 }}>{Math.round(iteration)}</b> 回め
        </div>
        <div style={{ color: C.yellow }}>対数尤度 {logLik.toFixed(4)}</div>
      </div>
      <div style={abs(180, 206, { fontSize: 32, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' })}>
        <div style={{ color: BLUE, fontWeight: 700 }}>中心 {params.means[0].toFixed(1)} cm</div>
        <div style={{ color: ORANGE, fontWeight: 700 }}>中心 {params.means[1].toFixed(1)} cm</div>
      </div>
    </>
  );
};

// ---------- 5M 対数尤度の地形を登る ----------
const LAND = HEIGHT.landscape;
const MAP = { left: 300, top: 190, size: 590 };
const LAND_FLOOR = -3.9; // これより低い場所は、いちばん暗い色にする
const LAND_PEAK = Math.max(...LAND.grid.flat());
const LAND_STOPS = ['#15161c', '#25346b', '#2f6f9e', '#3fae8f', '#e8d24a'];

const landColor = (value: number) => {
  const k = Math.min(1, Math.max(0, (value - LAND_FLOOR) / (LAND_PEAK - LAND_FLOOR))) ** 2.2;
  const position = k * (LAND_STOPS.length - 1);
  const index = Math.min(LAND_STOPS.length - 2, Math.floor(position));
  return blend(LAND_STOPS[index], LAND_STOPS[index + 1], position - index);
};

/** 地形の色を、小さな画像にする（セルの数だけ四角を描くより軽い） */
const useLandscapeImage = () =>
  useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = LAND.cells;
    canvas.height = LAND.cells;
    const context = canvas.getContext('2d');
    if (!context) return '';
    LAND.grid.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        context.fillStyle = landColor(value);
        // 縦軸は上が大きい値なので、行を上下逆に置く
        context.fillRect(colIndex, LAND.cells - 1 - rowIndex, 1, 1);
      });
    });
    return canvas.toDataURL();
  }, []);

const pathUntil = (points: number[][], steps: number, sx: (v: number) => number, sy: (v: number) => number) => {
  const whole = Math.min(points.length - 1, Math.floor(steps));
  let d = '';
  for (let i = 0; i <= whole; i++) d += `${i === 0 ? 'M' : 'L'}${sx(points[i][0]).toFixed(1)} ${sy(points[i][1]).toFixed(1)}`;
  const next = points[Math.min(points.length - 1, whole + 1)];
  const k = steps - whole;
  const head = [mix(points[whole][0], next[0], k), mix(points[whole][1], next[1], k)];
  return { d: d + `L${sx(head[0]).toFixed(1)} ${sy(head[1]).toFixed(1)}`, head };
};

export const Scene5M: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const image = useLandscapeImage();
  const sx = linear(LAND.min, LAND.max, MAP.left, MAP.left + MAP.size);
  const sy = linear(LAND.min, LAND.max, MAP.top + MAP.size, MAP.top);
  const stepsA = track(frame, [cues[2] + 20, cues[3] - 10], [0, LAND.pathA.length - 1]);
  const stepsB = track(frame, [cues[4] + 60, cues[5] - 20], [0, LAND.pathB.length - 1]);
  const a = pathUntil(LAND.pathA, stepsA, sx, sy);
  const b = pathUntil(LAND.pathB, stepsB, sx, sy);
  const endA = LAND.pathA[LAND.pathA.length - 1];
  const endB = LAND.pathB[LAND.pathB.length - 1];
  const ticks = [150, 160, 170, 180];
  return (
    <>
      <Stage>
        <g opacity={rise(frame, cues[1] - 20, 30)}>
          <image href={image} x={MAP.left} y={MAP.top} width={MAP.size} height={MAP.size} preserveAspectRatio="none" />
        </g>
        <rect x={MAP.left} y={MAP.top} width={MAP.size} height={MAP.size} fill="none" stroke={C.axis} strokeWidth={2} />
        <XAxis sx={sx} y={MAP.top + MAP.size} ticks={ticks} x0={LAND.min} x1={LAND.max} />
        <YAxis sy={sy} x={MAP.left} ticks={ticks} y0={LAND.min} y1={LAND.max} />
        <text x={MAP.left + MAP.size / 2} y={MAP.top + MAP.size + 80} fill={BLUE} fontSize={30} fontWeight={700} textAnchor="middle">
          グループ1の中心（cm）
        </text>
        <text x={MAP.left - 100} y={MAP.top + MAP.size / 2} fill={ORANGE} fontSize={30} fontWeight={700} textAnchor="middle" transform={`rotate(-90 ${MAP.left - 100} ${MAP.top + MAP.size / 2})`}>
          グループ2の中心（cm）
        </text>
        <RevealG at={cues[2]}>
          <path d={a.d} fill="none" stroke={C.text} strokeWidth={4} />
          <circle cx={sx(LAND.pathA[0][0])} cy={sy(LAND.pathA[0][1])} r={9} fill={C.bg} stroke={C.text} strokeWidth={3} />
          <circle cx={sx(a.head[0])} cy={sy(a.head[1])} r={11} fill={C.text} />
          <text x={sx(LAND.pathA[0][0]) + 18} y={sy(LAND.pathA[0][1]) + 34} fill={C.text} fontSize={28}>
            出発点
          </text>
        </RevealG>
        <RevealG at={cues[3]}>
          <text x={sx(endA[0])} y={sy(endA[1]) - 24} fill={C.text} fontSize={32} fontWeight={700} textAnchor="middle">
            頂上
          </text>
        </RevealG>
        <RevealG at={cues[4] + 40}>
          <path d={b.d} fill="none" stroke={C.text} strokeWidth={4} strokeDasharray="10 7" />
          <circle cx={sx(LAND.pathB[0][0])} cy={sy(LAND.pathB[0][1])} r={9} fill={C.bg} stroke={C.text} strokeWidth={3} />
          <circle cx={sx(b.head[0])} cy={sy(b.head[1])} r={11} fill={C.text} />
          <text x={sx(LAND.pathB[0][0]) - 16} y={sy(LAND.pathB[0][1]) - 16} fill={C.text} fontSize={28} textAnchor="end">
            別の出発点
          </text>
        </RevealG>
        <RevealG at={cues[4]}>
          <text x={sx(endB[0])} y={sy(endB[1]) + 84} fill={C.text} fontSize={32} fontWeight={700} textAnchor="middle">
            もう1つの頂上
          </text>
        </RevealG>
        <RevealG at={cues[5]}>
          <line x1={sx(LAND.min)} y1={sy(LAND.min)} x2={sx(LAND.max)} y2={sy(LAND.max)} stroke={C.text2} strokeWidth={2} strokeDasharray="6 8" />
        </RevealG>
      </Stage>
      <div style={abs(1000, 190, { width: 860 })}>
        <Reveal at={cues[0]} style={{ fontSize: 32, color: C.text2, lineHeight: 1.6 }}>
          割合は 0.5 ずつ、幅は {LAND.sd} cm に固定して、
          <br />
          2つの山の中心だけを動かす
        </Reveal>
        <Reveal at={cues[1]} style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: C.text2 }}>
          対数尤度　低い
          <div style={{ width: 300, height: 30, borderRadius: 6, background: `linear-gradient(90deg, ${LAND_STOPS.join(',')})` }} />
          高い
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 22, fontSize: 34, lineHeight: 1.5 }}>
          <b>頂上</b>
          <br />
          グループ1 ＝ <span style={{ color: BLUE, fontWeight: 700 }}>{endA[0].toFixed(1)}</span>、グループ2 ＝ <span style={{ color: ORANGE, fontWeight: 700 }}>{endA[1].toFixed(1)}</span>
          <div style={{ fontSize: 30, color: C.text2 }}>{LAND.pathA.length - 1} 回の繰り返しで到着</div>
        </Reveal>
        <Reveal at={cues[4]} style={{ marginTop: 18, fontSize: 34, lineHeight: 1.5 }}>
          <b>もう1つの頂上</b>
          <br />
          グループ1 ＝ <span style={{ color: BLUE, fontWeight: 700 }}>{endB[0].toFixed(1)}</span>、グループ2 ＝ <span style={{ color: ORANGE, fontWeight: 700 }}>{endB[1].toFixed(1)}</span>
        </Reveal>
        <Reveal at={cues[5]} style={{ marginTop: 22 }}>
          <Card accent={C.yellow} style={{ fontSize: 34, lineHeight: 1.5, padding: '12px 28px' }}>
            番号が入れ替わっただけで、中身は同じ答え
            <br />
            <span style={{ color: C.text2 }}>番号そのものには、意味がない</span>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

// ---------- ここまでの整理 ----------
const RECAP = [
  { head: '潜在変数', body: 'データの裏に、見えないグループ z があると考えた' },
  { head: '混合ガウスモデル', body: 'z を足し合わせて、x の分布を作った' },
  { head: '負担率', body: 'x を見たあとの z の確率を、ベイズの定理で求めた' },
  { head: 'EM アルゴリズム', body: '負担率とパラメータを、交互に計算して決めた' },
];

export const Mid: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(180, 200, { width: 1560 })}>
    {RECAP.map((item, index) => (
      <Reveal key={item.head} at={cues[index + 1]} style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
        <div style={{ width: 70, fontSize: 48, fontWeight: 800, color: C.yellow }}>{index + 1}</div>
        <div style={{ width: 470, fontSize: 44, fontWeight: 700 }}>{item.head}</div>
        <div style={{ fontSize: 38, color: C.text2 }}>{item.body}</div>
      </Reveal>
    ))}
    <Reveal at={cues[4] + 150} style={{ marginTop: 40 }}>
      <Card accent={C.visual} style={{ fontSize: 42, textAlign: 'center' }}>
        次は、z が<b>連続の値</b>をとる場合
      </Card>
    </Reveal>
  </div>
);
