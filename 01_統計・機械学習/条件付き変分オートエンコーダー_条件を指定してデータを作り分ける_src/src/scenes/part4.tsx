// part4.tsx — 第6章の後半（潜在空間の比較、z を動かす）、第7章（使いどころと注意）、まとめ。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, Card, Reveal, RevealG, rise, Stage, Tex, track } from '../kit';
import { boxScales, DATA, DATA_RANGE, DataDots, GROUP_COLORS3, GROUP_NAMES, LATENT_RANGE, LatentDots, PlotFrame, PriorRings, type Box } from '../plots';
import { abs, COND, DATA_TICKS, LATENT_TICKS, texColor, type SceneProps } from './part1';

// ---------- 6L 潜在空間を VAE とくらべる ----------
const BOX_VAE: Box = { left: 250, top: 262, size: 520 };
const BOX_CVAE: Box = { left: 1150, top: 262, size: 520 };

const CenterMarks: React.FC<{ box: Box; means: number[][] }> = ({ box, means }) => {
  const scales = boxScales(box, LATENT_RANGE);
  return (
    <g>
      {means.map((mean, index) => (
        <g key={index} transform={`translate(${scales.sx(mean[0])} ${scales.sy(mean[1])})`}>
          <path d="M-16 0 L16 0 M0 -16 L0 16" stroke={C.bg} strokeWidth={10} />
          <path d="M-16 0 L16 0 M0 -16 L0 16" stroke={GROUP_COLORS3[index]} strokeWidth={5} />
          <path d="M-16 0 L16 0 M0 -16 L0 16" stroke={C.text} strokeWidth={1.5} />
        </g>
      ))}
    </g>
  );
};

export const Scene6L: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_VAE} range={LATENT_RANGE} ticks={LATENT_TICKS} xLabel="z_1" yLabel="z_2" title="VAE の潜在空間" />
        <PlotFrame box={BOX_CVAE} range={LATENT_RANGE} ticks={LATENT_TICKS} xLabel="z_1" yLabel="z_2" title="CVAE の潜在空間" />
        <LatentDots scales={boxScales(BOX_VAE, LATENT_RANGE)} latents={DATA.vae.latents} opacity={rise(frame, cues[0] + 10, 30)} radius={4.5} />
        <LatentDots scales={boxScales(BOX_CVAE, LATENT_RANGE)} latents={DATA.cvae.latents} opacity={rise(frame, cues[2], 30)} radius={4.5} />
        <RevealG at={cues[1]}>
          <CenterMarks box={BOX_VAE} means={DATA.vae.classMeans} />
        </RevealG>
        <RevealG at={cues[2] + 60}>
          <CenterMarks box={BOX_CVAE} means={DATA.cvae.classMeans} />
        </RevealG>
        <PriorRings scales={boxScales(BOX_CVAE, LATENT_RANGE)} opacity={rise(frame, cues[4])} />
        <PriorRings scales={boxScales(BOX_VAE, LATENT_RANGE)} opacity={rise(frame, cues[4])} />
      </Stage>
      <div style={abs(790, 300, { width: 340, textAlign: 'center' })}>
        <Reveal at={cues[0]} style={{ fontSize: 30, lineHeight: 1.6, fontWeight: 700 }}>
          {GROUP_NAMES.map((name, index) => (
            <div key={name} style={{ color: GROUP_COLORS3[index] }}>
              ● {name}
            </div>
          ))}
          <div style={{ color: C.text2, fontWeight: 400 }}>＋ グループの中心</div>
        </Reveal>
        <Reveal at={cues[1]} style={{ marginTop: 34, fontSize: 32, color: C.text2 }}>
          ← 島に分かれる
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 14, fontSize: 32, color: C.text2 }}>
          1つに重なる →
        </Reveal>
        <Reveal at={cues[4]} style={{ marginTop: 34, fontSize: 28, color: C.text2 }}>
          点線：事前分布の目安
        </Reveal>
      </div>
      <Reveal at={cues[3]} out={cues[4]} style={abs(0, 838, { width: 1920, textAlign: 'center', fontSize: 40, fontWeight: 700, color: C.yellow })}>
        グループの違いは c が運ぶので、z に書き込む必要がない
      </Reveal>
      <Reveal at={cues[4]} style={abs(0, 838, { width: 1920, textAlign: 'center', fontSize: 40, fontWeight: 700, color: C.yellow })}>
        どのグループも原点のまわり → どの z でも、指定したグループの点になる
      </Reveal>
    </>
  );
};

// ---------- 6S z を動かすと、何が変わるか ----------
const BOX_6S: Box = { left: 140, top: 222, size: 640 };
const SWEEPS = DATA.cvae.sweeps;
const SWEEP_RANGE = DATA.settings.sweepRange;
const SWEEP_PERIOD = 150; // z が端から端まで行って戻るまで
const SLIDER = { left: 980, right: 1700 };

const pathOf = (pointsXY: number[][], scales: ReturnType<typeof boxScales>) => pointsXY.map((p, index) => `${index === 0 ? 'M' : 'L'}${scales.sx(p[0]).toFixed(1)} ${scales.sy(p[1]).toFixed(1)}`).join('');

/** 道の上の、割合 k（0〜1）の位置 */
const along = (pointsXY: number[][], k: number) => {
  const position = k * (pointsXY.length - 1);
  const lower = Math.min(Math.floor(position), pointsXY.length - 2);
  const blend = position - lower;
  return [pointsXY[lower][0] + (pointsXY[lower + 1][0] - pointsXY[lower][0]) * blend, pointsXY[lower][1] + (pointsXY[lower + 1][1] - pointsXY[lower][1]) * blend];
};

const Slider: React.FC<{ y: number; name: string; value: number; active: number }> = ({ y, name, value, active }) => {
  const x = SLIDER.left + ((value + SWEEP_RANGE) / (2 * SWEEP_RANGE)) * (SLIDER.right - SLIDER.left);
  return (
    <g opacity={0.35 + 0.65 * active}>
      <foreignObject x={SLIDER.left - 110} y={y - 34} width={90} height={70}>
        <Tex tex={name} size={46} />
      </foreignObject>
      <line x1={SLIDER.left} x2={SLIDER.right} y1={y} y2={y} stroke={C.axis} strokeWidth={6} strokeLinecap="round" />
      {[-2, -1, 0, 1, 2].map((tick) => {
        const tx = SLIDER.left + ((tick + SWEEP_RANGE) / (2 * SWEEP_RANGE)) * (SLIDER.right - SLIDER.left);
        return (
          <g key={tick}>
            <line x1={tx} x2={tx} y1={y - 12} y2={y + 12} stroke={C.axis} strokeWidth={3} />
            <text x={tx} y={y + 46} fill={C.text2} fontSize={26} textAnchor="middle">
              {tick}
            </text>
          </g>
        );
      })}
      <circle cx={x} cy={y} r={20} fill={C.text} stroke={C.bg} strokeWidth={4} />
      <text x={SLIDER.right + 30} y={y + 12} fill={C.text} fontSize={36} fontWeight={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(1)}
      </text>
    </g>
  );
};

export const Scene6S: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const scales = boxScales(BOX_6S, DATA_RANGE);
  const second = frame >= cues[3] ? 1 : 0; // 動かしている成分（0 = z1、1 = z2）
  const start = second ? cues[3] + 30 : cues[0] + 150;
  const phase = Math.max(frame - start, 0) / SWEEP_PERIOD;
  // 行って戻る動き（-2 → 2 → -2）
  const wave = frame < start ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
  const moving = wave;
  const value = -SWEEP_RANGE + 2 * SWEEP_RANGE * moving;
  const emphasis = (group: number) => {
    if (second) return group === 1 ? 1 : 0.45;
    if (frame >= cues[2]) return group === 0 ? 0.45 : 1;
    if (frame >= cues[1]) return group === 0 ? 1 : 0.45;
    return 1;
  };
  const switched = rise(frame, cues[3], 12);
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_6S} range={DATA_RANGE} ticks={DATA_TICKS} xLabel="x_1" yLabel="x_2" />
        <DataDots scales={scales} opacity={0.3 * rise(frame, cues[0], 30)} radius={4} />
        <g opacity={rise(frame, cues[0] + 100)}>
          {SWEEPS[second].map((pointsXY, group) => {
            const [x, y] = along(pointsXY, moving);
            return (
              <g key={group} opacity={emphasis(group)}>
                <path d={pathOf(pointsXY, scales)} fill="none" stroke={C.text} strokeWidth={5} strokeLinecap="round" />
                <circle cx={scales.sx(x)} cy={scales.sy(y)} r={15} fill={GROUP_COLORS3[group]} stroke={C.text} strokeWidth={4} />
              </g>
            );
          })}
        </g>
        <RevealG at={cues[0]}>
          <Slider y={420} name="z_1" value={second ? 0 : value} active={1 - switched} />
          <Slider y={560} name="z_2" value={second ? value : 0} active={switched} />
        </RevealG>
      </Stage>
      <div style={abs(870, 222, { width: 940 })}>
        <Reveal at={cues[0]} style={{ fontSize: 38, lineHeight: 1.5 }}>
          条件 c を固定して、z の片方だけを動かす
          <div style={{ color: C.text2, fontSize: 32 }}>（もう片方は 0 のまま）</div>
        </Reveal>
      </div>
      <div style={abs(870, 650, { width: 940, fontSize: 36, lineHeight: 1.7 })}>
        <Reveal at={cues[1]} out={cues[3]}>
          <div>
            <b style={{ color: GROUP_COLORS3[0] }}>グループ1</b>　円弧に沿って、端から端まで動く
          </div>
          <Reveal at={cues[2]}>
            <div>
              <b style={{ color: GROUP_COLORS3[2] }}>グループ3</b>　円弧に沿って動く（向きは逆）
            </div>
            <div>
              <b style={{ color: GROUP_COLORS3[1] }}>グループ2</b>　ほとんど動かない
            </div>
          </Reveal>
        </Reveal>
      </div>
      <div style={abs(870, 650, { width: 940, fontSize: 36, lineHeight: 1.7 })}>
        <Reveal at={cues[3]}>
          <div>
            <b style={{ color: GROUP_COLORS3[1] }}>グループ2</b>　今度は、円弧に沿って大きく動く
          </div>
        </Reveal>
        <Reveal at={cues[4]} style={{ color: C.yellow, fontWeight: 700 }}>
          z ＝ 円弧の中での位置（種類以外の違い）
        </Reveal>
        <Reveal at={cues[5]} style={{ color: C.text2 }}>
          どの成分が表すかは、条件ごとにそろうとは限らない
        </Reveal>
      </div>
    </>
  );
};

// ---------- 7T 条件 c に使えるもの ----------
const c = texColor(COND, 'c');
const CONDITIONS = [
  { head: '種類のラベル', example: '数字の種類、製品の型式', how: 'ワンホット表現で入力' },
  { head: '連続の値', example: '温度、圧力、時刻', how: '数値をそのまま入力' },
  { head: '画像・文章', example: '欠けた画像、説明文', how: '特徴に変えてから入力' },
];

export const Scene7T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 215, { width: 1640 })}>
    <div style={{ display: 'flex', gap: 28 }}>
      {CONDITIONS.map((item, index) => (
        <Reveal key={item.head} at={cues[[0, 1, 2][index]] + (index === 0 ? 150 : 0)} style={{ flex: 1 }}>
          <Card accent={COND} style={{ height: 250, padding: '24px 30px' }}>
            <div style={{ fontSize: 46, fontWeight: 700, color: COND }}>{item.head}</div>
            <div style={{ fontSize: 34, marginTop: 12 }}>{item.example}</div>
            <div style={{ fontSize: 30, color: C.text2, marginTop: 12 }}>{item.how}</div>
          </Card>
        </Reveal>
      ))}
    </div>
    <Reveal at={cues[3]} style={{ marginTop: 40 }}>
      <Card style={{ padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ width: 760 }}>
          <div style={{ fontSize: 40, fontWeight: 700, whiteSpace: 'nowrap' }}>1つの入力に、答えが何通りもある問題</div>
          <div style={{ fontSize: 28, color: C.text2, marginTop: 8, whiteSpace: 'nowrap' }}>CVAE の最初の論文（Sohn ほか、2015年）のねらい</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 40 }}>
          <span style={{ border: `4px solid ${COND}`, borderRadius: 14, padding: '10px 26px' }}>
            入力 <Tex tex={c} size={46} />
          </span>
          <div style={{ lineHeight: 1.5 }}>
            {[1, 2, 3].map((index) => (
              <Reveal key={index} at={cues[4] + (index - 1) * 40} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Tex tex={'\\xrightarrow{\\;z_' + index + '\\;}'} size={40} color={C.text2} />
                <span>答えの候補 {index}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </Card>
    </Reveal>
  </div>
);

// ---------- 7C 使うときの注意 ----------
const CAUTIONS = [
  { head: '条件の付いたデータが必要', body: '学習で見ていない条件を指定しても、良い結果は期待できない', more: '' },
  { head: '事後崩壊（posterior collapse）', body: 'デコーダが強すぎると、z を無視して、条件だけから作るようになる', more: '対策の例：KL の項の重みを、学習の初めは小さくする' },
  { head: '画像では、ぼやけやすい', body: '細かさが必要なら、ほかの生成モデルも候補になる', more: '' },
];

export const Scene7C: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 210, { width: 1600 })}>
    {CAUTIONS.map((item, index) => (
      <Reveal key={index} at={cues[[1, 2, 4][index]]} style={{ marginBottom: 22 }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '22px 36px' }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: C.orange, width: 60, textAlign: 'center' }}>{index + 1}</div>
          <div>
            <div style={{ fontSize: 46, fontWeight: 700 }}>{item.head}</div>
            <div style={{ fontSize: 34, color: C.text2, marginTop: 6 }}>{item.body}</div>
            {item.more ? (
              <Reveal at={cues[3]} style={{ fontSize: 34, color: C.yellow, marginTop: 6 }}>
                {item.more}
              </Reveal>
            ) : null}
          </div>
        </Card>
      </Reveal>
    ))}
  </div>
);

// ---------- まとめ ----------
const SUMMARY = [
  'CVAE ＝ VAE のエンコーダとデコーダの両方に、条件 c を加えたモデル',
  '学習では、再構成の項と KL の項を合わせた、変分下限を大きくする',
  '条件が種類を運ぶので、潜在空間では種類の違いが消えて、1つにまとまる',
  '作るときは、c を指定し、z を標準正規分布から選んで、デコーダに通す',
];
const REFERENCES = [
  'D. P. Kingma, M. Welling, Auto-Encoding Variational Bayes, ICLR 2014',
  'K. Sohn, H. Lee, X. Yan, Learning Structured Output Representation using Deep Conditional Generative Models, NeurIPS 2015',
  'D. P. Kingma, S. Mohamed, D. J. Rezende, M. Welling, Semi-Supervised Learning with Deep Generative Models, NeurIPS 2014',
];

export const Summary: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const shrink = track(frame, [cues[5], cues[5] + 20], [0, 1]);
  return (
    <div style={abs(140, 190, { width: 1640 })}>
      {SUMMARY.map((text, index) => (
        <Reveal key={index} at={cues[index + 1]} style={{ marginBottom: 14 - 4 * shrink }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 26, padding: `${20 - 6 * shrink}px 32px` }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: COND }}>{index + 1}</span>
            <span style={{ fontSize: 38, fontWeight: 600 }}>{text}</span>
          </Card>
        </Reveal>
      ))}
      <Reveal at={cues[5]} style={{ marginTop: 14, fontSize: 26, lineHeight: 1.5, color: C.text2 }}>
        <div style={{ color: C.text, fontWeight: 700, fontSize: 30 }}>参考文献</div>
        {REFERENCES.map((reference) => (
          <div key={reference}>・{reference}</div>
        ))}
        <div style={{ marginTop: 10, color: C.text, fontSize: 30 }}>
          <b>読み上げ音声</b>　VOICEVOX:四国めたん　／　図の数値は、説明用の合成データで学習した結果です
        </div>
      </Reveal>
    </div>
  );
};
