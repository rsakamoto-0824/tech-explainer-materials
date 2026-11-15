// part2.tsx — 第3章（条件 c を入れる）、第4章（何を最大にするのか）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ArchDiagram } from '../diagram';
import { areaPath, C, Card, curvePath, linear, normalPdf, Reveal, RevealG, rise, Stage, Tex, track, XAxis } from '../kit';
import { GROUP_COLORS3 } from '../plots';
import { abs, COND, texColor, type SceneProps } from './part1';

const c = texColor(COND, 'c');

// ---------- 3T 条件 c を入力に加える ----------
const ROWS = [
  { name: 'デコーダ', before: 'p_\\theta(x\\mid z)', after: `p_\\theta(x\\mid z,\\,${c})`, color: C.aqua },
  { name: 'エンコーダ', before: 'q_\\phi(z\\mid x)', after: `q_\\phi(z\\mid x,\\,${c})`, color: C.violet },
  { name: '事前分布', before: 'p(z)', after: `p(z\\mid ${c})=\\mathcal{N}(0,\\,I)`, color: C.text2 },
];

export const Scene3T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 205, { width: 1640 })}>
    <Reveal at={cues[0]} style={{ fontSize: 42 }}>
      作りたい種類を、<span style={{ color: COND, fontWeight: 700 }}>条件</span> <Tex tex={c} size={52} /> として、モデルに直接わたす
    </Reveal>
    <div style={{ marginTop: 14, display: 'flex', fontSize: 32, color: C.muted, paddingLeft: 36 }}>
      <span style={{ width: 280 }} />
      <span style={{ width: 420 }}>VAE</span>
      <span style={{ width: 110 }} />
      <span style={{ color: COND, fontWeight: 700 }}>CVAE</span>
    </div>
    {ROWS.map((row, index) => (
      <Reveal key={row.name} at={cues[index + 1]} style={{ marginTop: 10 }}>
        <Card accent={row.color} style={{ display: 'flex', alignItems: 'center', padding: '10px 36px' }}>
          <div style={{ width: 280, fontSize: 44, fontWeight: 700, color: row.color }}>{row.name}</div>
          <div style={{ width: 420 }}>
            <Tex tex={row.before} size={48} color={C.text2} />
          </div>
          <div style={{ width: 110, fontSize: 44, color: C.muted }}>→</div>
          <Tex tex={row.after} size={52} />
        </Card>
      </Reveal>
    ))}
    <Reveal at={cues[4]} style={{ marginTop: 16, fontSize: 36, color: C.text2 }}>
      形は VAE と同じ。どの分布にも「<span style={{ color: COND }}>c が与えられたとき</span>」が付いただけ
    </Reveal>
    <Reveal at={cues[5]} style={{ marginTop: 8, display: 'flex', gap: 60, fontSize: 40, fontWeight: 700 }}>
      <span>
        <Tex tex={c} size={50} />　種類を受け持つ
      </span>
      <span>
        <Tex tex="z" size={50} />　種類以外の違いを受け持つ
      </span>
    </Reveal>
  </div>
);

// ---------- 3V CVAE の構成図 ----------
const ONE_HOT = [0, 1, 0];

export const Scene3V: React.FC<SceneProps> = ({ cues }) => (
  <>
    <Stage>
      <ArchDiagram
        cy={425}
        conditional
        times={{ x: 0, encoder: 0, stats: 0, z: 0, decoder: 0, xhat: 0, condition: cues[0] + 30, toEncoder: cues[1], toDecoder: cues[2], generate: cues[5] }}
      />
    </Stage>
    <Reveal at={cues[3]} out={cues[5]} style={abs(150, 718, { width: 600 })}>
      <Card accent={COND} style={{ padding: '12px 28px' }}>
        <div style={{ fontSize: 32, color: C.text2 }}>ワンホット表現（グループ2 の場合）</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 40 }}>
          <Tex tex={`${c}=`} size={48} />
          {ONE_HOT.map((value, index) => (
            <span
              key={index}
              style={{
                width: 74,
                height: 74,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 44,
                background: value ? GROUP_COLORS3[index] : C.bg,
                color: value ? C.bg : C.muted,
                border: `3px solid ${GROUP_COLORS3[index]}`,
              }}
            >
              {value}
            </span>
          ))}
        </div>
      </Card>
    </Reveal>
    <Reveal at={cues[4]} out={cues[5]} style={abs(1460, 610, { width: 400 })}>
      <Card style={{ padding: '18px 28px', fontSize: 34, lineHeight: 1.6 }}>
        <div style={{ color: C.text2 }}>学習に使うデータ</div>
        <div style={{ fontSize: 40 }}>
          <Tex tex={`(x,\\;${c})`} size={48} /> の組
        </div>
        <div style={{ color: C.text2, fontSize: 27, whiteSpace: 'nowrap' }}>＝ ラベルの付いたデータ</div>
      </Card>
    </Reveal>
    <Reveal at={cues[5] + 15} style={abs(150, 720, { width: 640, fontSize: 40, fontWeight: 700, color: C.yellow, lineHeight: 1.5 })}>
      作るとき
      <br />
      ほしい c を指定する
    </Reveal>
  </>
);

// ---------- 4T 対数尤度の下限 ----------
const RECON = C.aqua;
const KL = C.orange;
const RECON_TEX = texColor(RECON, `\\mathbb{E}_{q_\\phi(z\\mid x,c)}\\big[\\log p_\\theta(x\\mid z,c)\\big]`);
const KL_TEX = texColor(KL, `D_{\\mathrm{KL}}\\big(q_\\phi(z\\mid x,c)\\,\\big\\|\\,p(z)\\big)`);
const LEVEL = { left: 1400, right: 1640, bottom: 870 };

export const Scene4T: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  // 下限が上がると、その上にある対数尤度も上がる
  const lift = track(frame, [cues[5] + 20, cues[5] + 120], [0, 1]);
  const boundY = LEVEL.bottom - 40 - 90 * lift;
  const likelihoodY = boundY - 70 + 22 * lift;
  return (
    <>
      <div style={abs(140, 205, { width: 1640 })}>
        <Reveal at={cues[1]} dim={cues[3]} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <Tex tex={`\\log p_\\theta(x\\mid ${c})`} size={64} />
          <span style={{ fontSize: 38, color: C.text2 }}>条件 c のもとで、データ x が出てくる確率の対数（対数尤度）</span>
        </Reveal>
        <Reveal at={cues[2]} dim={cues[3]} style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Tex tex={`=\\;\\log\\int p_\\theta(x\\mid z,${c})\\,p(z)\\,dz`} size={56} />
          <span style={{ fontSize: 38, color: C.orange, fontWeight: 700 }}>✕ 積分が計算できない</span>
        </Reveal>
        <Reveal at={cues[3]} style={{ marginTop: 34 }}>
          <Card accent={C.theory} style={{ padding: '30px 34px' }}>
            <Tex tex={`\\log p_\\theta(x\\mid ${c})\\;\\ge\\;${RECON_TEX}\\;-\\;${KL_TEX}`} size={44} />
            <div style={{ position: 'relative', height: 56, marginTop: 10, fontSize: 36, fontWeight: 700, opacity: rise(frame, cues[4]) }}>
              <span style={{ position: 'absolute', left: 640, translate: '-50% 0', color: RECON }}>再構成の項</span>
              <span style={{ position: 'absolute', left: 1270, translate: '-50% 0', color: KL }}>KL の項</span>
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[3] + 30} style={{ marginTop: 26, fontSize: 40 }}>
          右辺 ＝ <span style={{ color: C.theory, fontWeight: 700 }}>変分下限（ELBO）</span>
          <span style={{ color: C.text2 }}>　Evidence Lower BOund</span>
        </Reveal>
      </div>
      <Stage>
        <RevealG at={cues[5]}>
          <line x1={LEVEL.left} x2={LEVEL.right} y1={likelihoodY} y2={likelihoodY} stroke={C.text} strokeWidth={5} />
          <text x={LEVEL.left - 16} y={likelihoodY + 10} fill={C.text} fontSize={30} textAnchor="end">
            対数尤度
          </text>
          <rect x={LEVEL.left} y={boundY} width={LEVEL.right - LEVEL.left} height={LEVEL.bottom - boundY} fill={C.theory} fillOpacity={0.3} />
          <line x1={LEVEL.left} x2={LEVEL.right} y1={boundY} y2={boundY} stroke={C.theory} strokeWidth={5} />
          <text x={LEVEL.left - 16} y={boundY + 10} fill={C.theory} fontSize={30} fontWeight={700} textAnchor="end">
            下限
          </text>
          <text x={LEVEL.right + 16} y={(boundY + likelihoodY) / 2 + 10} fill={C.text2} fontSize={26}>
            すき間は 0 以上
          </text>
        </RevealG>
      </Stage>
    </>
  );
};

// ---------- 4K 2つの項の意味 ----------
export const Scene4K: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 205, { width: 1640 })}>
    <Reveal at={cues[1]}>
      <Card accent={RECON} style={{ padding: '22px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <span style={{ fontSize: 42, fontWeight: 700, color: RECON, width: 260 }}>再構成の項</span>
          <Tex tex={RECON_TEX} size={50} />
        </div>
        <div style={{ fontSize: 36, color: C.text2, marginTop: 10 }}>エンコーダが選んだ z と、条件 c から、もとの x をどれだけ正確に復元できるか</div>
        <Reveal at={cues[2]} style={{ display: 'flex', alignItems: 'center', gap: 34, marginTop: 14 }}>
          <span style={{ fontSize: 36 }}>正規分布を仮定すると</span>
          <Tex tex={`=\\;-\\,\\frac{\\lVert x-\\hat{x}\\rVert^2}{2\\sigma_x^2}+\\text{定数}`} size={48} />
          <span style={{ fontSize: 36, color: C.yellow, fontWeight: 700 }}>二乗誤差</span>
        </Reveal>
      </Card>
    </Reveal>
    <Reveal at={cues[3]} style={{ marginTop: 26 }}>
      <Card accent={KL} style={{ padding: '22px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <span style={{ fontSize: 42, fontWeight: 700, color: KL, width: 260 }}>KL の項</span>
          <Tex tex={KL_TEX} size={50} />
        </div>
        <div style={{ fontSize: 36, color: C.text2, marginTop: 10 }}>エンコーダが出す z の分布と、事前分布との、ずれの大きさ（大きいほど罰）</div>
        <Reveal at={cues[4]} style={{ display: 'flex', alignItems: 'center', gap: 34, marginTop: 14 }}>
          <span style={{ fontSize: 36 }}>どちらも正規分布なので</span>
          <Tex tex={`=\\;\\frac{1}{2}\\sum_{j}\\big(\\mu_j^2+\\sigma_j^2-1-\\ln\\sigma_j^2\\big)`} size={48} />
        </Reveal>
      </Card>
    </Reveal>
  </div>
);

// ---------- 4V KL の項は、分布を事前分布へ引き寄せる ----------
const PLOT = { left: 160, right: 1240, top: 250, bottom: 790 };
const Z_MIN = -4.5;
const Z_MAX = 4.5;
const DENSITY_MAX = 1.45;
const klOf = (mean: number, sd: number) => 0.5 * (mean * mean + sd * sd - 1 - Math.log(sd * sd));
const NARROW = [
  { mean: -2.2, color: GROUP_COLORS3[0] },
  { mean: 0.3, color: GROUP_COLORS3[1] },
  { mean: 2.4, color: GROUP_COLORS3[2] },
];
const NARROW_SD = 0.3;

export const Scene4V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const sx = linear(Z_MIN, Z_MAX, PLOT.left, PLOT.right);
  const sy = linear(0, DENSITY_MAX, PLOT.bottom, PLOT.top);
  const mean = track(frame, [cues[1], cues[1] + 50, cues[2] + 10, cues[2] + 60, cues[3] + 5, cues[3] + 50], [1.3, 0, 0, 2, 2, 0]);
  const sd = track(frame, [cues[1], cues[1] + 50, cues[3] + 50, cues[3] + 100], [0.6, 1, 1, 0.3]);
  const single = 1 - rise(frame, cues[4]);
  // データごとの細い分布が、事前分布のほうへ引き戻される
  const pull = track(frame, [cues[4] + 200, cues[4] + 290], [0, 1]);
  return (
    <>
      <Stage>
        <XAxis sx={sx} y={PLOT.bottom} ticks={[-4, -2, 0, 2, 4]} x0={Z_MIN} x1={Z_MAX} label="z" />
        <path d={areaPath((z) => normalPdf(z, 0, 1), Z_MIN, Z_MAX, sx, sy)} fill="#8f8e86" fillOpacity={0.28} stroke="#b5b4ab" strokeWidth={4} />
        <g opacity={single}>
          <path d={areaPath((z) => normalPdf(z, mean, sd), Z_MIN, Z_MAX, sx, sy, 300)} fill={C.violet} fillOpacity={0.25} stroke={C.violet} strokeWidth={5} />
          <line x1={sx(mean)} x2={sx(mean)} y1={PLOT.bottom} y2={sy(normalPdf(mean, mean, sd))} stroke={C.violet} strokeWidth={2} strokeDasharray="8 8" />
        </g>
        <g opacity={1 - single}>
          {NARROW.map((item) => {
            const itemMean = item.mean * (1 - 0.55 * pull);
            const itemSd = NARROW_SD + 0.3 * pull;
            return <path key={item.mean} d={curvePath((z) => normalPdf(z, itemMean, itemSd), Z_MIN, Z_MAX, sx, sy, 300)} fill="none" stroke={item.color} strokeWidth={5} />;
          })}
          <g opacity={rise(frame, cues[4] + 190)}>
            <text x={sx(-2.9)} y={sy(0.62)} fill={C.yellow} fontSize={56} textAnchor="middle">
              →
            </text>
            <text x={sx(3.1)} y={sy(0.62)} fill={C.yellow} fontSize={56} textAnchor="middle">
              ←
            </text>
          </g>
        </g>
      </Stage>
      <div style={abs(1290, 240, { width: 520 })}>
        <Reveal at={cues[0]} style={{ fontSize: 34, lineHeight: 1.7 }}>
          <div style={{ color: '#b5b4ab', fontWeight: 700 }}>
            ━ 事前分布 <Tex tex="\mathcal{N}(0,1)" size={36} />
          </div>
          <div style={{ color: C.violet, fontWeight: 700, opacity: single }}>━ エンコーダの出す分布</div>
        </Reveal>
        <Reveal at={cues[0] + 20} out={cues[4]} style={{ marginTop: 24 }}>
          <Card style={{ fontSize: 40, lineHeight: 1.7, padding: '20px 30px', fontVariantNumeric: 'tabular-nums' }}>
            <div>
              平均 <Tex tex="\mu" size={42} /> = {mean.toFixed(1)}
            </div>
            <div>
              標準偏差 <Tex tex="\sigma" size={42} /> = {sd.toFixed(1)}
            </div>
            <div style={{ color: KL, fontWeight: 700, fontSize: 52 }}>KL = {klOf(mean, sd).toFixed(2)}</div>
          </Card>
        </Reveal>
      </div>
      <div style={abs(1290, 330, { width: 580 })}>
        <Reveal at={cues[4]} style={{ fontSize: 36, lineHeight: 1.6 }}>
          <div style={{ color: RECON, fontWeight: 700 }}>復元を良くしたい</div>
          <div>細くして、データごとに離す</div>
        </Reveal>
        <Reveal at={cues[4] + 190} style={{ fontSize: 36, lineHeight: 1.6, marginTop: 24 }}>
          <div style={{ color: KL, fontWeight: 700 }}>KL の項</div>
          <div>事前分布のほうへ引き戻す</div>
        </Reveal>
        <Reveal at={cues[5]} style={{ fontSize: 36, lineHeight: 1.6, marginTop: 24, color: C.yellow, fontWeight: 700 }}>
          事前分布から選んだ z でも、
          <br />
          デコーダがうまく働く
        </Reveal>
      </div>
    </>
  );
};
