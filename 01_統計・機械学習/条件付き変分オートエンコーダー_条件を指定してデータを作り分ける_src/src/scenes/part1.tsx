// part1.tsx — 題名、ポイント、第1章（VAE のおさらい）、第2章（VAE では作り分けられない）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ArchDiagram } from '../diagram';
import { Arrow, C, Card, Pill, Reveal, RevealG, rise, Stage, Tex } from '../kit';
import { boxScales, DATA, DATA_RANGE, DataDots, GROUP_COLORS3, GROUP_NAMES, LATENT_RANGE, LatentDots, PlotFrame, PriorRings, type Box } from '../plots';

export type SceneProps = { cues: number[] };

export const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });
export const COND = C.yellow; // 条件 c の色
export const texColor = (color: string, body: string) => `\\textcolor{${color}}{${body}}`;
export const DATA_TICKS = [-2, -1, 0, 1, 2];
export const LATENT_TICKS = [-2, 0, 2];
export const OUTSIDE_COLOR = '#e0a52a'; // どのグループにも入らなかった点

// ---------- 題名 ----------
export const Intro: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(0, 0, { width: 1920, height: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' })}>
    <Reveal at={cues[0]} style={{ fontSize: 40, color: C.text2, letterSpacing: '0.08em' }}>
      CVAE　Conditional Variational Autoencoder
    </Reveal>
    <Reveal at={cues[0] + 6} style={{ fontSize: 104, fontWeight: 800, marginTop: 14 }}>
      条件付き変分オートエンコーダー
    </Reveal>
    <Reveal at={cues[1]} style={{ fontSize: 50, color: COND, fontWeight: 700, marginTop: 26 }}>
      条件を指定して、データを作り分ける
    </Reveal>
    <Reveal at={cues[1] + 20} style={{ marginTop: 50, display: 'flex', alignItems: 'center', gap: 26, fontSize: 40 }}>
      <Card accent={COND} style={{ padding: '14px 30px' }}>
        条件 <Tex tex="c" size={46} color={COND} />
      </Card>
      <span style={{ color: C.muted }}>＋</span>
      <Card style={{ padding: '14px 30px' }}>
        乱数 <Tex tex="z" size={46} />
      </Card>
      <span style={{ color: C.muted }}>→</span>
      <Card accent={C.aqua} style={{ padding: '14px 30px' }}>
        デコーダ
      </Card>
      <span style={{ color: C.muted }}>→</span>
      <Card style={{ padding: '14px 30px' }}>
        新しいデータ <Tex tex="x" size={46} />
      </Card>
    </Reveal>
    <Reveal at={cues[2]} style={{ marginTop: 54, display: 'flex', alignItems: 'center', gap: 22, fontSize: 38, color: C.text2 }}>
      <Pill color={C.theory}>理論</Pill>と<Pill color={C.visual}>図解</Pill>を交互に　全7章
    </Reveal>
  </div>
);

// ---------- ポイント ----------
const POINTS = [
  { head: '両方に条件 c を加える', body: 'VAE のエンコーダとデコーダの入力に、条件 c を足したもの' },
  { head: 'z には種類以外の違いが残る', body: '種類は c が受け持つので、z は残りの違いだけを表す' },
  { head: '作るときは c を指定する', body: 'c を指定し、z を乱数で選んで、デコーダに通す' },
];

export const Points: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 210, { width: 1600 })}>
    {POINTS.map((point, index) => (
      <Reveal key={index} at={cues[index + 1]} style={{ marginBottom: 30 }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '30px 40px' }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: COND, width: 70, textAlign: 'center' }}>{index + 1}</div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 700 }}>{point.head}</div>
            <div style={{ fontSize: 36, color: C.text2, marginTop: 8 }}>{point.body}</div>
          </div>
        </Card>
      </Reveal>
    ))}
  </div>
);

// ---------- 1T VAE の3つの部品 ----------
const PARTS = [
  { name: '事前分布', tex: 'p(z)=\\mathcal{N}(0,\\,I)', note: 'z は、平均 0・分散 1 の正規分布から選ぶ', color: C.text2 },
  { name: 'デコーダ', tex: 'p_\\theta(x\\mid z)', note: 'z を受け取って、データ x を作る', color: C.aqua },
  { name: 'エンコーダ', tex: 'q_\\phi(z\\mid x)', note: 'x を見て、z のありそうな場所を、分布で答える', color: C.violet },
];

export const Scene1T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 205, { width: 1640 })}>
    <Reveal at={cues[0]} style={{ fontSize: 40, color: C.text2 }}>
      VAE ＝ 変分オートエンコーダー（Variational Autoencoder）
    </Reveal>
    <Reveal at={cues[1]} style={{ marginTop: 22, display: 'flex', gap: 90, fontSize: 42 }}>
      <span>
        <Tex tex="x" size={52} />　データ（観測できる）
      </span>
      <span>
        <Tex tex="z" size={52} />　潜在変数（見えない）
      </span>
    </Reveal>
    <div style={{ marginTop: 34 }}>
      {PARTS.map((part, index) => (
        <Reveal key={part.name} at={cues[index + 2]} style={{ marginBottom: 22 }}>
          <Card accent={part.color} style={{ display: 'flex', alignItems: 'center', padding: '22px 36px' }}>
            <div style={{ width: 300, fontSize: 46, fontWeight: 700, color: part.color }}>{part.name}</div>
            <div style={{ width: 500 }}>
              <Tex tex={part.tex} size={54} />
            </div>
            <div style={{ fontSize: 36, color: C.text2 }}>{part.note}</div>
          </Card>
        </Reveal>
      ))}
    </div>
  </div>
);

// ---------- 1V VAE の構成図 ----------
export const Scene1V: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <ArchDiagram
        cy={560}
        times={{ x: cues[0], encoder: cues[1], stats: cues[1] + 20, z: cues[2], decoder: cues[2] + 20, xhat: cues[2] + 40, loss: cues[3], generate: cues[4] }}
      />
    </Stage>
    <Reveal at={cues[4] + 20} style={abs(0, 790, { width: 1920, textAlign: 'center', fontSize: 40, color: C.yellow, fontWeight: 700 })}>
      作るときは、エンコーダを使わない
    </Reveal>
  </>
);

// ---------- 2V VAE でデータを作ってみる ----------
const BOX_2V: Box = { left: 150, top: 222, size: 640 };
const VAE_SAMPLES = DATA.vae.samples;
const SHARE_LABELS = [
  { name: 'グループ1の近く', value: 28, color: GROUP_COLORS3[0] },
  { name: 'グループ2の近く', value: 25, color: GROUP_COLORS3[1] },
  { name: 'グループ3の近く', value: 32, color: GROUP_COLORS3[2] },
  { name: 'どれからも外れた', value: 16, color: OUTSIDE_COLOR },
];
const GENERATE_FRAMES = 110; // 白い点が出そろうまで

export const GeneratedDots: React.FC<{ scales: ReturnType<typeof boxScales>; shown: number; markOutside: number }> = ({ scales, shown, markOutside }) => (
  <g>
    {VAE_SAMPLES.slice(0, Math.round(shown * VAE_SAMPLES.length)).map((sample, index) => (
      <circle
        key={index}
        cx={scales.sx(sample.x)}
        cy={scales.sy(sample.y)}
        r={sample.c < 0 ? 5 + 2 * markOutside : 5}
        fill={sample.c < 0 && markOutside > 0.5 ? OUTSIDE_COLOR : C.text}
        stroke={C.bg}
        strokeWidth={1.5}
      />
    ))}
  </g>
);

export const Scene2V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const scales = boxScales(BOX_2V, DATA_RANGE);
  const gray = rise(frame, cues[2] + 10, 30);
  const shown = rise(frame, cues[3] + 20, GENERATE_FRAMES);
  const markOutside = rise(frame, cues[4] + 200, 20);
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_2V} range={DATA_RANGE} ticks={DATA_TICKS} xLabel="x_1" yLabel="x_2" />
        <DataDots scales={scales} opacity={rise(frame, cues[0], 30) * (1 - 0.45 * rise(frame, cues[3]))} gray={gray} />
        <GeneratedDots scales={scales} shown={shown} markOutside={markOutside} />
      </Stage>
      <div style={abs(870, 215, { width: 920 })}>
        <Reveal at={cues[0] + 20} out={cues[2]} style={{ fontSize: 38, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', gap: 34, fontWeight: 700 }}>
            {GROUP_NAMES.map((name, index) => (
              <span key={name} style={{ color: GROUP_COLORS3[index] }}>
                ● {name}
              </span>
            ))}
          </div>
          <div style={{ color: C.text2, marginTop: 6 }}>600個の点（説明用に乱数で作成）</div>
        </Reveal>
        <Reveal at={cues[1]} out={cues[2]} style={{ marginTop: 28 }}>
          <Card style={{ fontSize: 38, lineHeight: 1.8 }}>
            <div>
              グループの番号　＝　<b>どの数字か</b>（種類）
            </div>
            <div>
              円弧の中での位置　＝　<b>筆跡</b>（種類以外の違い）
            </div>
          </Card>
        </Reveal>
      </div>
      <div style={abs(870, 215, { width: 920 })}>
        <Reveal at={cues[2]} style={{ fontSize: 40, fontWeight: 700 }}>
          VAE を学習<span style={{ color: C.text2, fontWeight: 400 }}>（グループの番号は教えない）</span>
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 16, fontSize: 36, display: 'flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap' }}>
          <Tex tex="z\sim\mathcal{N}(0,I)" size={40} />
          <span>を450個 → デコーダ →</span>
          <span style={{ fontWeight: 700 }}>○ 作られた点</span>
        </Reveal>
        <div style={{ marginTop: 30 }}>
          {SHARE_LABELS.map((share, index) => {
            const at = cues[4] + 20 + index * 55;
            return (
              <Reveal key={share.name} at={at} style={{ display: 'flex', alignItems: 'center', marginBottom: 14, fontSize: 36 }}>
                <span style={{ width: 330, color: share.color, fontWeight: 700 }}>{share.name}</span>
                <span style={{ display: 'inline-block', height: 34, width: share.value * 13 * rise(frame, at, 30), background: share.color, borderRadius: 6 }} />
                <span style={{ marginLeft: 16, fontVariantNumeric: 'tabular-nums' }}>{share.value}%</span>
              </Reveal>
            );
          })}
        </div>
        <Reveal at={cues[5]} style={{ marginTop: 22, fontSize: 42, fontWeight: 700, color: C.yellow }}>
          どのグループが出るかは、乱数しだい
        </Reveal>
      </div>
    </>
  );
};

// ---------- 2L VAE の潜在空間 ----------
const BOX_LATENT: Box = { left: 170, top: 232, size: 550 };
const BOX_OUTPUT: Box = { left: 1190, top: 232, size: 550 };
const DROP_FRAMES = 150;
const ISLAND_LABELS = [
  [2.05, 2.35],
  [-1.2, 2.35],
  [-1.6, -2.5],
]; // 島の名前を書く位置（z の座標）。点と重ならない場所を選んだ

export const Scene2L: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const latentScales = boxScales(BOX_LATENT, LATENT_RANGE);
  const outputScales = boxScales(BOX_OUTPUT, DATA_RANGE);
  const dropped = Math.round(rise(frame, cues[2] + 15, DROP_FRAMES) * 150);
  const markOutside = rise(frame, cues[2] + 250, 20);
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_LATENT} range={LATENT_RANGE} ticks={LATENT_TICKS} xLabel="z_1" yLabel="z_2" title="潜在空間（z の平面）" />
        <PlotFrame box={BOX_OUTPUT} range={DATA_RANGE} ticks={DATA_TICKS} xLabel="x_1" yLabel="x_2" title="データの平面" />
        <LatentDots scales={latentScales} latents={DATA.vae.latents} opacity={rise(frame, cues[0] + 20, 40)} />
        <DataDots scales={outputScales} opacity={0.4 * rise(frame, cues[0])} radius={4} />
        <RevealG at={cues[1]}>
          {ISLAND_LABELS.map((label, index) => (
            <text key={index} x={latentScales.sx(label[0])} y={latentScales.sy(label[1])} fill={GROUP_COLORS3[index]} fontSize={30} fontWeight={700} textAnchor="middle">
              {GROUP_NAMES[index]}
            </text>
          ))}
        </RevealG>
        <PriorRings scales={latentScales} opacity={rise(frame, cues[2])} />
        {VAE_SAMPLES.slice(0, dropped).map((sample, index) => {
          const outside = sample.c < 0 && markOutside > 0.5;
          const fill = outside ? OUTSIDE_COLOR : C.text;
          return (
            <g key={index}>
              <circle cx={latentScales.sx(sample.z[0])} cy={latentScales.sy(sample.z[1])} r={outside ? 8 : 5.5} fill={fill} stroke={C.bg} strokeWidth={1.5} />
              <circle cx={outputScales.sx(sample.x)} cy={outputScales.sy(sample.y)} r={outside ? 8 : 5.5} fill={fill} stroke={C.bg} strokeWidth={1.5} />
            </g>
          );
        })}
        <RevealG at={cues[2]}>
          <Arrow x1={790} y1={520} x2={1120} y2={520} color={C.aqua} width={5} />
          <text x={955} y={495} fill={C.aqua} fontSize={34} fontWeight={700} textAnchor="middle">
            デコーダ
          </text>
          <text x={955} y={570} fill={C.text2} fontSize={28} textAnchor="middle">
            ○ 乱数で選んだ z
          </text>
          <text x={955} y={610} fill={OUTSIDE_COLOR} fontSize={28} textAnchor="middle" opacity={markOutside}>
            ● すき間に落ちた z
          </text>
        </RevealG>
      </Stage>
      <Reveal at={cues[3]} style={abs(0, 836, { width: 1920, textAlign: 'center', fontSize: 38, fontWeight: 700, color: C.yellow })}>
        「グループの違い」と「グループの中での違い」が、z の中で混ざっている
      </Reveal>
    </>
  );
};
