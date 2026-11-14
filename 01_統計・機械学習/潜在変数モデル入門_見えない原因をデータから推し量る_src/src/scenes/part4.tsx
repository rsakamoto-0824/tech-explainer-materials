// part4.tsx — 第6章（連続の潜在変数）、第7章（仲間）、第8章（注意）、まとめ。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Arrow, C, Card, linear, mix, Reveal, RevealG, rise, Stage, Tex, track, VarNode, XAxis, YAxis } from '../kit';
import { HEIGHT, SCORE } from '../model';
import type { SceneProps } from './part1';

const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });

// ---------- 6T z が連続の値をとるモデル ----------
export const Scene6T: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <RevealG at={cues[1]}>
        <VarNode x={330} y={330} r={76} label="z" />
        <text x={330} y={228} fill={C.text} fontSize={36} fontWeight={700} textAnchor="middle">
          理系の力
        </text>
        <Arrow x1={290} y1={400} x2={215} y2={560} />
        <Arrow x1={370} y1={400} x2={445} y2={560} />
        <VarNode x={190} y={640} r={76} label="x_1" observed />
        <VarNode x={470} y={640} r={76} label="x_2" observed />
        <text x={190} y={770} fill={C.text2} fontSize={34} textAnchor="middle">
          数学の点数
        </text>
        <text x={470} y={770} fill={C.text2} fontSize={34} textAnchor="middle">
          理科の点数
        </text>
      </RevealG>
    </Stage>
    <div style={abs(700, 200, { width: 1140 })}>
      <Reveal at={cues[0]} dim={cues[1]} style={{ fontSize: 40, lineHeight: 1.6 }}>
        <b style={{ color: C.yellow }}>離散</b>の z　グループの番号（1, 2, …）
      </Reveal>
      <Reveal at={cues[1]} style={{ fontSize: 40, lineHeight: 1.6 }}>
        <b style={{ color: C.yellow }}>連続</b>の z　大きさを表す1つの数（例：理系の力）
      </Reveal>
      <Reveal at={cues[2]} style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 40 }}>
        <span style={{ fontSize: 38, fontWeight: 700, color: C.yellow, width: 190 }}>第1段階</span>
        <Tex tex="z\sim\mathcal{N}(0,\ 1)" size={56} />
      </Reveal>
      <Reveal at={cues[3]} style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 40 }}>
        <span style={{ fontSize: 38, fontWeight: 700, color: C.yellow, width: 190 }}>第2段階</span>
        <Tex
          tex="\begin{pmatrix}x_1\\x_2\end{pmatrix}=\begin{pmatrix}\mu_1\\\mu_2\end{pmatrix}+\begin{pmatrix}w_1\\w_2\end{pmatrix}z+\begin{pmatrix}\varepsilon_1\\\varepsilon_2\end{pmatrix}"
          size={50}
        />
      </Reveal>
      <Reveal at={cues[3]} style={{ display: 'flex', fontSize: 30, color: C.text2, marginTop: 8, marginLeft: 232 }}>
        <span style={{ width: 150 }}>点数</span>
        <span style={{ width: 150 }}>平均</span>
        <span style={{ width: 196 }}>係数 × z</span>
        <span>ノイズ</span>
      </Reveal>
      <Reveal at={cues[4]} style={{ marginTop: 30, fontSize: 38 }}>
        2つの点数を、1つの数 z で説明する　→　<b>データの要約</b>
      </Reveal>
      <Reveal at={cues[5]} style={{ marginTop: 22 }}>
        <Card accent={C.theory} style={{ fontSize: 40, padding: '14px 30px' }}>
          この形のモデル ＝ <b>因子分析</b>、<b>確率的な主成分分析</b>
        </Card>
      </Reveal>
    </div>
  </>
);

// ---------- 6V 2つの点数を1つの z で説明する ----------
const SCATTER = { left: 250, top: 240, size: 560 };
const Z_RANGE = 3;
const NOISE_SDS = 2; // ノイズの円の半径（標準偏差の何倍か）
const mu = SCORE.mean;
const w = SCORE.loading;
const axis = SCORE.axis;
const noiseVariance = SCORE.noiseSd ** 2;
const wNorm2 = w[0] ** 2 + w[1] ** 2;
const posteriorZ = (p: number[]) => (w[0] * (p[0] - mu[0]) + w[1] * (p[1] - mu[1])) / (wNorm2 + noiseVariance);
// 推し量る例に使う人: 直線から離れていて、中心からも少し離れている人
const PERSON = (() => {
  let best = SCORE.points[0];
  let bestScore = -1;
  for (const p of SCORE.points) {
    const along = axis[0] * (p[0] - mu[0]) + axis[1] * (p[1] - mu[1]);
    const across = Math.abs(-axis[1] * (p[0] - mu[0]) + axis[0] * (p[1] - mu[1]));
    if (along > 8 && along < 20 && across > bestScore && across < 14) {
      best = p;
      bestScore = across;
    }
  }
  return best;
})();
const personAlong = axis[0] * (PERSON[0] - mu[0]) + axis[1] * (PERSON[1] - mu[1]);
const personFoot = [mu[0] + axis[0] * personAlong, mu[1] + axis[1] * personAlong];
const personZ = posteriorZ(PERSON);

export const Scene6V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sx = linear(0, 100, SCATTER.left, SCATTER.left + SCATTER.size);
  const sy = linear(0, 100, SCATTER.top + SCATTER.size, SCATTER.top);
  const z = track(
    frame,
    [cues[2] + 60, cues[2] + 120, cues[3], cues[3] + 70, cues[3] + 90, cues[4] - 30, cues[4], cues[5] - 20, cues[5] + 40],
    [0, 1, 1, 2.2, 2.2, -2.2, 0.6, 0.6, personZ],
  );
  const center = [mu[0] + w[0] * z, mu[1] + w[1] * z];
  const lineEnds = [-Z_RANGE, Z_RANGE].map((value) => [mu[0] + w[0] * value, mu[1] + w[1] * value]);
  const pointsShown = rise(frame, cues[0] + 20, 40);
  const noiseShown = rise(frame, cues[4]) * (1 - rise(frame, cues[5]));
  const inferring = rise(frame, cues[5] + 10);
  const dimPoints = mix(1, 0.35, inferring);
  const ticks = [0, 20, 40, 60, 80, 100];
  const sliderX = linear(-Z_RANGE, Z_RANGE, 0, 620);
  return (
    <>
      <Stage>
        <XAxis sx={sx} y={SCATTER.top + SCATTER.size} ticks={ticks} x0={0} x1={100} label="数学の点数" />
        <YAxis sy={sy} x={SCATTER.left} ticks={ticks} y0={0} y1={100} label="理科の点数" />
        <g opacity={pointsShown * dimPoints}>
          {SCORE.points.map((p, i) => (
            <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={6} fill="#a09f97" opacity={0.8} />
          ))}
        </g>
        <RevealG at={cues[2]}>
          <line x1={sx(lineEnds[0][0])} y1={sy(lineEnds[0][1])} x2={sx(lineEnds[1][0])} y2={sy(lineEnds[1][1])} stroke={C.text} strokeWidth={5} />
        </RevealG>
        <g opacity={noiseShown}>
          <circle cx={sx(center[0])} cy={sy(center[1])} r={(NOISE_SDS * SCORE.noiseSd * SCATTER.size) / 100} fill={C.aqua} fillOpacity={0.22} stroke={C.aqua} strokeWidth={3} />
          <text x={sx(center[0]) + 100} y={sy(center[1]) + 70} fill="#4cc79b" fontSize={30}>
            ノイズ ε の広がり
          </text>
        </g>
        <RevealG at={cues[2] + 50}>
          <circle cx={sx(center[0])} cy={sy(center[1])} r={14} fill={C.yellow} stroke={C.bg} strokeWidth={3} />
        </RevealG>
        <RevealG at={cues[5] + 10}>
          <circle cx={sx(PERSON[0])} cy={sy(PERSON[1])} r={12} fill={C.orange} stroke={C.bg} strokeWidth={3} />
          <line x1={sx(PERSON[0])} y1={sy(PERSON[1])} x2={sx(personFoot[0])} y2={sy(personFoot[1])} stroke={C.orange} strokeWidth={3} strokeDasharray="8 6" />
          <text x={sx(PERSON[0]) + 20} y={sy(PERSON[1]) + 10} fill={C.orange} fontSize={30} fontWeight={700}>
            ある人の点数
          </text>
        </RevealG>
      </Stage>
      <div style={abs(1010, 190, { width: 840 })}>
        <Reveal at={cues[0]} style={{ fontSize: 30, color: C.muted }}>
          300人・乱数で作った合成データ
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 36, color: C.text2 }}>潜在変数 z</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: C.yellow, fontVariantNumeric: 'tabular-nums' }}>
            z = {z >= 0 ? '+' : '−'}
            {Math.abs(z).toFixed(2)}
          </div>
          <svg width={700} height={90} viewBox="-40 0 700 90">
            <line x1={0} x2={620} y1={30} y2={30} stroke={C.axis} strokeWidth={6} strokeLinecap="round" />
            {[-3, -2, -1, 0, 1, 2, 3].map((tick) => (
              <text key={tick} x={sliderX(tick)} y={80} fill={C.text2} fontSize={26} textAnchor="middle">
                {tick}
              </text>
            ))}
            <circle cx={sliderX(z)} cy={30} r={17} fill={C.yellow} />
          </svg>
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 20, fontSize: 36, lineHeight: 1.7, fontVariantNumeric: 'tabular-nums' }}>
          <div>
            数学の中心　{mu[0].toFixed(1)} + {w[0].toFixed(1)} × z ＝ <b>{center[0].toFixed(1)}</b> 点
          </div>
          <div>
            理科の中心　{mu[1].toFixed(1)} + {w[1].toFixed(1)} × z ＝ <b>{center[1].toFixed(1)}</b> 点
          </div>
        </Reveal>
        <Reveal at={cues[5] + 60} style={{ marginTop: 26, fontSize: 34, lineHeight: 1.6 }}>
          数学 {PERSON[0].toFixed(0)} 点・理科 {PERSON[1].toFixed(0)} 点の人
          <br />→ z の推定値は <b style={{ color: C.yellow }}>{personZ.toFixed(2)}</b>
          <span style={{ fontSize: 28, color: C.text2 }}>（垂線の足より、少し中心寄り）</span>
        </Reveal>
        <Reveal at={cues[6]} style={{ marginTop: 22 }}>
          <Card accent={C.yellow} style={{ fontSize: 34, padding: '14px 26px' }}>
            推定した z と本当の z の相関　<b style={{ fontSize: 44 }}>{SCORE.zCorrelation.toFixed(2)}</b>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

// ---------- 7V 潜在変数モデルの地図 ----------
const MapCell: React.FC<{ at: number; head: string; sub: string; accent?: string }> = ({ at, head, sub, accent }) => (
  <Reveal at={at} style={{ flex: 1 }}>
    <Card accent={accent} style={{ height: 150, padding: '16px 30px' }}>
      <div style={{ fontSize: 42, fontWeight: 700 }}>{head}</div>
      <div style={{ fontSize: 30, color: C.text2, marginTop: 8 }}>{sub}</div>
    </Card>
  </Reveal>
);

export const Scene7V: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(100, 180, { width: 1720 })}>
    <Reveal at={cues[0]} style={{ display: 'flex', gap: 24, marginLeft: 330, fontSize: 36, fontWeight: 700, color: C.yellow, marginBottom: 12 }}>
      <div style={{ flex: 1, textAlign: 'center' }}>z が離散（グループ）</div>
      <div style={{ flex: 1, textAlign: 'center' }}>z が連続（大きさ）</div>
    </Reveal>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Reveal at={cues[0]} style={{ width: 306, fontSize: 34, fontWeight: 700, color: C.yellow, lineHeight: 1.4 }}>
        データが
        <br />
        1件ずつ独立
      </Reveal>
      <MapCell at={cues[1]} head="混合モデル" sub="この動画の前半（身長の例）" accent={C.blue} />
      <MapCell at={cues[2]} head="因子分析・主成分分析" sub="この動画の後半（点数の例）" accent={C.blue} />
    </div>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 20 }}>
      <Reveal at={cues[3]} style={{ width: 306, fontSize: 34, fontWeight: 700, color: C.yellow, lineHeight: 1.4 }}>
        時間の順に並ぶ
        <div style={{ fontSize: 26, color: C.text2, fontWeight: 400 }}>z が前の z に左右される</div>
      </Reveal>
      <MapCell at={cues[3] + 150} head="隠れマルコフモデル" sub="音声認識、状態の切り替わり" />
      <MapCell at={cues[3] + 230} head="状態空間モデル" sub="z を推し量る計算 ＝ カルマンフィルター" />
    </div>
    <div style={{ display: 'flex', gap: 24, marginTop: 30 }}>
      <MapCell at={cues[5]} head="トピックモデル" sub="z ＝ 文書の裏にある話題" />
      <MapCell at={cues[6]} head="変分オートエンコーダ（VAE）" sub="z から x を作る部分が、ニューラルネットワーク" />
    </div>
    <Reveal at={cues[7]} style={{ marginTop: 20, fontSize: 38, textAlign: 'center' }}>
      共通の形：<b>「z を選び、x を作る」</b>物語 ＋ <b>「x から z を推し量る」</b>計算
    </Reveal>
  </div>
);

// ---------- 8T 3つの注意 ----------
const CAUTIONS = [
  { head: 'グループの数 K は、自分で決める', body: 'K を増やすほど当てはまりは良くなる。当てはまりだけでは選べない' },
  { head: '出発点によって、答えが変わることがある', body: '出発点を変えて何度か実行し、対数尤度がいちばん大きい結果を選ぶ' },
  { head: 'z の意味は、人が付ける', body: '「z は理系の力」などの名前は、結果を見て付けるもの。モデルは教えてくれない' },
];

export const Scene8T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 200, { width: 1640 })}>
    {CAUTIONS.map((caution, index) => (
      <Reveal key={caution.head} at={cues[index + 1]} style={{ marginBottom: 28 }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '24px 36px' }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: C.yellow, width: 70, lineHeight: 1 }}>{index + 1}</div>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{caution.head}</div>
            <div style={{ fontSize: 34, color: C.text2, marginTop: 8 }}>{caution.body}</div>
          </div>
        </Card>
      </Reveal>
    ))}
  </div>
);

// ---------- 8V グループの数 K を選ぶ ----------
const BIC_ROWS = HEIGHT.bic;
const LEFT_CHART = { left: 200, right: 860, top: 250, bottom: 600 };
const RIGHT_CHART = { left: 1100, right: 1760, top: 250, bottom: 600 };
const BEST_K = BIC_ROWS.reduce((best, row) => (row.bic < best.bic ? row : best)).k;

const KChart: React.FC<{
  box: typeof LEFT_CHART;
  values: number[];
  range: number[];
  ticks: number[];
  title: string;
  color: string;
  highlight?: number;
}> = ({ box, values, range, ticks, title, color, highlight }) => {
  const sx = linear(0.5, 5.5, box.left, box.right);
  const sy = linear(range[0], range[1], box.bottom, box.top);
  return (
    <g>
      <YAxis sy={sy} x={box.left} ticks={ticks} y0={range[0]} y1={range[1]} gridTo={box.right} />
      <XAxis sx={sx} y={box.bottom} ticks={[1, 2, 3, 4, 5]} x0={0.5} x1={5.5} label="グループの数 K" />
      <text x={box.left - 40} y={box.top - 26} fill={C.text} fontSize={34} fontWeight={700}>
        {title}
      </text>
      <path d={values.map((value, i) => `${i === 0 ? 'M' : 'L'}${sx(i + 1)} ${sy(value)}`).join('')} fill="none" stroke={color} strokeWidth={4} />
      {values.map((value, i) => (
        <g key={i}>
          <circle cx={sx(i + 1)} cy={sy(value)} r={highlight === i + 1 ? 16 : 10} fill={color} stroke={highlight === i + 1 ? C.text : 'none'} strokeWidth={4} />
          <text x={sx(i + 1)} y={sy(value) - 24} fill={C.text2} fontSize={26} textAnchor="middle">
            {value.toFixed(0)}
          </text>
        </g>
      ))}
    </g>
  );
};

export const Scene8V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const best = frame >= cues[3] ? BEST_K : undefined;
  return (
    <>
      <Stage>
        <RevealG at={cues[1]}>
          <KChart box={LEFT_CHART} values={BIC_ROWS.map((row) => row.logLik)} range={[-1445, -1405]} ticks={[-1440, -1430, -1420, -1410]} title="対数尤度（大きいほど当てはまりが良い）" color={C.blue} />
        </RevealG>
        <RevealG at={cues[2]}>
          <KChart box={RIGHT_CHART} values={BIC_ROWS.map((row) => row.bic)} range={[2860, 2920]} ticks={[2860, 2880, 2900, 2920]} title="BIC（小さいほど良い）" color={C.orange} highlight={best} />
        </RevealG>
      </Stage>
      <Reveal at={cues[2]} out={cues[4] - 6} style={abs(200, 730, { width: 1560, textAlign: 'center' })}>
        <Tex tex="\mathrm{BIC}=-2\log L+(\text{パラメータの数})\times\log N" size={52} />
        <div style={{ fontSize: 30, color: C.text2, marginTop: 6 }}>当てはまりの悪さ ＋ パラメータの数に応じた罰（N はデータの件数）</div>
      </Reveal>
      <Reveal at={cues[3]} style={abs(1336, 528)}>
        <span style={{ fontSize: 34, fontWeight: 700, color: C.text }}>K = {BEST_K} が最小</span>
      </Reveal>
      <Reveal at={cues[4]} style={abs(200, 716, { width: 1560 })}>
        <div style={{ fontSize: 32, color: C.text2, marginBottom: 12 }}>出発点を30通り試したとき、対数尤度の低い答えに着いた回数</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {BIC_ROWS.map((row) => (
            <Card key={row.k} accent={row.k === 2 || row.k === 3 ? C.yellow : undefined} style={{ flex: 1, padding: '10px 20px', textAlign: 'center', fontSize: 32 }}>
              K = {row.k}　<b style={{ fontSize: 44 }}>{row.worseStarts}</b> 回
            </Card>
          ))}
        </div>
      </Reveal>
    </>
  );
};

// ---------- まとめ ----------
const SUMMARY = [
  '潜在変数 ＝ データの裏にある、観測できない変数',
  'モデルは「z を選ぶ → x を作る」の2段階で書く',
  '見えない z は、ベイズの定理で、確率として推し量る',
  'パラメータは、EM アルゴリズム（E ステップと M ステップの繰り返し）で決める',
  '離散の z → 混合モデル、連続の z → 因子分析。時間を入れると、隠れマルコフモデル・状態空間モデル',
];
const REFERENCES = [
  'Dempster, Laird, Rubin (1977) Maximum likelihood from incomplete data via the EM algorithm',
  'Tipping, Bishop (1999) Probabilistic principal component analysis',
  'Schwarz (1978) Estimating the dimension of a model',
  'Bishop (2006) Pattern Recognition and Machine Learning, 第9章・第12章',
];

export const Summary: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 170, { width: 1640 })}>
    {SUMMARY.map((text, index) => (
      <Reveal key={text} at={cues[index + 1]} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
        <div style={{ width: 66, fontSize: 44, fontWeight: 800, color: C.yellow }}>{index + 1}</div>
        <div style={{ fontSize: 38, lineHeight: 1.45, flex: 1 }}>{text}</div>
      </Reveal>
    ))}
    <Reveal at={cues[6]} style={{ marginTop: 20 }}>
      <Card accent={C.theory} style={{ fontSize: 42, textAlign: 'center', fontWeight: 700, padding: '16px 30px' }}>
        見えないものを、確率の言葉で扱う
      </Card>
      <div style={{ marginTop: 16, fontSize: 24, color: C.muted, lineHeight: 1.5 }}>
        参考文献：{REFERENCES.join(' ／ ')}
      </div>
    </Reveal>
  </div>
);
