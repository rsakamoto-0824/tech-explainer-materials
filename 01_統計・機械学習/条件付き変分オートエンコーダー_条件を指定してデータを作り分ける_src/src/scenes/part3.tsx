// part3.tsx — 第5章（学習のしかた）、ここまでの整理、第6章の前半（条件を指定して作る）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Arrow, C, Card, linear, mix, Reveal, RevealG, rise, Stage, Tex, track } from '../kit';
import { boxScales, DATA, DATA_RANGE, DataDots, GROUP_COLORS3, GROUP_NAMES, LATENT_RANGE, PlotFrame, PriorRings, SvgTex, type Box } from '../plots';
import { abs, COND, DATA_TICKS, LATENT_TICKS, type SceneProps } from './part1';

// ---------- 5T 再パラメータ化 ----------
const NODE = { mu: { x: 1150, y: 370 }, sigma: { x: 1150, y: 550 }, eps: { x: 1150, y: 730 }, times: { x: 1370, y: 640 }, plus: { x: 1550, y: 460 }, z: { x: 1750, y: 460 } };
const SMALL_R = 46;

const Circle: React.FC<{ x: number; y: number; tex: string; color?: string; filled?: boolean }> = ({ x, y, tex, color = C.text, filled = false }) => (
  <g>
    <circle cx={x} cy={y} r={SMALL_R} fill={filled ? C.panel : C.bg} stroke={color} strokeWidth={4} />
    <SvgTex x={x} y={y} tex={tex} size={44} w={SMALL_R * 2} color={color} />
  </g>
);

/** 2つの丸の間を、丸のふちからふちまで結ぶ矢印 */
const Link: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; color?: string; dashed?: boolean; offset?: number }> = ({ from, to, color, dashed, offset = 0 }) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  const gap = SMALL_R + 8;
  // offset で、行きと帰りの矢印を少し横にずらす
  const ox = -uy * offset;
  const oy = ux * offset;
  return <Arrow x1={from.x + ux * gap + ox} y1={from.y + uy * gap + oy} x2={to.x - ux * gap + ox} y2={to.y - uy * gap + oy} color={color} dashed={dashed} />;
};

export const Scene5T: React.FC<SceneProps> = ({ cues }) => (
  <>
    <div style={abs(120, 205, { width: 900 })}>
      <Reveal at={cues[0]} style={{ fontSize: 36, color: C.text2, whiteSpace: 'nowrap' }}>
        下限が大きくなる向きに、重みを動かす（勾配法）
      </Reveal>
      <Reveal at={cues[1]} dim={cues[2]} style={{ marginTop: 26 }}>
        <Card accent={C.orange} style={{ padding: '20px 30px' }}>
          <Tex tex="z\sim\mathcal{N}(\mu,\,\sigma^2)" size={56} />
          <div style={{ fontSize: 36, color: C.orange, fontWeight: 700, marginTop: 8 }}>✕ 「乱数で選ぶ」操作は、微分できない</div>
        </Card>
      </Reveal>
      <Reveal at={cues[2]} style={{ marginTop: 26 }}>
        <Card accent={C.theory} style={{ padding: '20px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <Tex tex="\varepsilon\sim\mathcal{N}(0,\,I)" size={52} />
            <span style={{ fontSize: 34, color: C.text2 }}>先にノイズを選ぶ</span>
          </div>
          <Reveal at={cues[3]} style={{ display: 'flex', alignItems: 'center', gap: 30, marginTop: 14 }}>
            <Tex tex="z=\mu+\sigma\odot\varepsilon" size={64} />
            <span style={{ fontSize: 34, color: C.text2 }}>分布はもとと同じ</span>
          </Reveal>
        </Card>
      </Reveal>
      <Reveal at={cues[5]} style={{ marginTop: 22, fontSize: 44, fontWeight: 700, color: C.yellow, whiteSpace: 'nowrap' }}>
        再パラメータ化<span style={{ fontSize: 30, fontWeight: 400, marginLeft: 20 }}>reparameterization trick</span>
      </Reveal>
    </div>
    <Stage>
      <RevealG at={cues[3]}>
        <Circle x={NODE.mu.x} y={NODE.mu.y} tex="\mu" color={C.violet} filled />
        <Circle x={NODE.sigma.x} y={NODE.sigma.y} tex="\sigma" color={C.violet} filled />
        <Circle x={NODE.eps.x} y={NODE.eps.y} tex="\varepsilon" color={C.text2} />
        <Circle x={NODE.times.x} y={NODE.times.y} tex="\times" />
        <Circle x={NODE.plus.x} y={NODE.plus.y} tex="+" />
        <Circle x={NODE.z.x} y={NODE.z.y} tex="z" />
        <Link from={NODE.sigma} to={NODE.times} />
        <Link from={NODE.eps} to={NODE.times} color={C.muted} />
        <Link from={NODE.mu} to={NODE.plus} />
        <Link from={NODE.times} to={NODE.plus} />
        <Link from={NODE.plus} to={NODE.z} />
        <text x={NODE.mu.x} y={NODE.mu.y - 62} fill={C.violet} fontSize={28} textAnchor="middle">
          エンコーダの出力
        </text>
        <text x={NODE.z.x} y={NODE.z.y - 66} fill={C.text2} fontSize={28} textAnchor="middle">
          デコーダへ
        </text>
      </RevealG>
      <RevealG at={cues[4]}>
        <text x={NODE.eps.x} y={NODE.eps.y + 86} fill={C.text2} fontSize={30} textAnchor="middle">
          乱数は外から入るだけ
        </text>
      </RevealG>
      <RevealG at={cues[5]}>
        <Link from={NODE.z} to={NODE.plus} color={C.orange} dashed offset={18} />
        <Link from={NODE.plus} to={NODE.mu} color={C.orange} dashed offset={18} />
        <Link from={NODE.plus} to={NODE.times} color={C.orange} dashed offset={18} />
        <Link from={NODE.times} to={NODE.sigma} color={C.orange} dashed offset={18} />
        <text x={1580} y={790} fill={C.orange} fontSize={32} fontWeight={700} textAnchor="middle">
          ⇠ 誤差を逆向きに伝える
        </text>
      </RevealG>
    </Stage>
  </>
);

// ---------- 5V 学習が進む様子 ----------
const BOX_5V: Box = { left: 140, top: 222, size: 640 };
const SNAPSHOTS = DATA.cvae.snapshots;
const HISTORY = DATA.cvae.history;
const LOSS = { left: 960, right: 1760, top: 290, bottom: 760 };
const EPOCH_TICKS = [0, 3, 10, 40, 150, 600];
const LOSS_TICKS = [0.1, 1, 10, 100];
const RECON = C.aqua;
const KL = C.orange;

export const Scene5V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const scales = boxScales(BOX_5V, DATA_RANGE);
  // 学習の進み具合：0 → 1 → 2 → 3 → 4 が、エポック 0, 3, 10, 40, 600 に当たる
  const stage = track(frame, [cues[2] + 20, cues[2] + 80, cues[2] + 150, cues[2] + 210, cues[3] + 10, cues[3] + 50, cues[3] + 60, cues[3] + 120], [0, 1, 1, 2, 2, 3, 3, 4]);
  const lower = Math.min(Math.floor(stage), SNAPSHOTS.length - 2);
  const blend = stage - lower;
  const epoch = Math.round(mix(SNAPSHOTS[lower].epoch, SNAPSHOTS[lower + 1].epoch, blend));
  const rmse = HISTORY.reduce((best, item) => (Math.abs(item.epoch - epoch) < Math.abs(best.epoch - epoch) ? item : best)).rmse;
  // 損失のグラフは、横軸（エポック+1）も縦軸も対数
  const ex = (value: number) => linear(0, Math.log10(601), LOSS.left, LOSS.right)(Math.log10(value + 1));
  const ly = (value: number) => linear(-1, 2.3, LOSS.bottom, LOSS.top)(Math.log10(Math.max(value, 0.1)));
  const drawn = rise(frame, cues[4] + 20, 120);
  const visible = HISTORY.filter((item) => ex(item.epoch) <= LOSS.left + (LOSS.right - LOSS.left) * drawn);
  const linePath = (key: 'recon' | 'kl') => visible.map((item, index) => `${index === 0 ? 'M' : 'L'}${ex(item.epoch).toFixed(1)} ${ly(item[key]).toFixed(1)}`).join('');
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_5V} range={DATA_RANGE} ticks={DATA_TICKS} xLabel="x_1" yLabel="x_2" />
        <DataDots scales={scales} opacity={0.3 * rise(frame, cues[0], 30)} radius={4} />
        <g opacity={rise(frame, cues[1])}>
          {SNAPSHOTS[lower].recon.map((from, index) => {
            const to = SNAPSHOTS[lower + 1].recon[index];
            return (
              <circle
                key={index}
                cx={scales.sx(mix(from[0], to[0], blend))}
                cy={scales.sy(mix(from[1], to[1], blend))}
                r={6}
                fill={GROUP_COLORS3[DATA.snapshotClasses[index]]}
                stroke={C.text}
                strokeWidth={1.5}
              />
            );
          })}
        </g>
        <RevealG at={cues[4]}>
          <line x1={LOSS.left} x2={LOSS.right} y1={LOSS.bottom} y2={LOSS.bottom} stroke={C.axis} strokeWidth={2} />
          <line x1={LOSS.left} x2={LOSS.left} y1={LOSS.bottom} y2={LOSS.top} stroke={C.axis} strokeWidth={2} />
          {EPOCH_TICKS.map((tick) => (
            <text key={tick} x={ex(tick)} y={LOSS.bottom + 38} fill={C.text2} fontSize={26} textAnchor="middle">
              {tick}
            </text>
          ))}
          {LOSS_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={LOSS.left} x2={LOSS.right} y1={ly(tick)} y2={ly(tick)} stroke={C.grid} strokeWidth={1.5} />
              <text x={LOSS.left - 14} y={ly(tick) + 9} fill={C.text2} fontSize={26} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          <text x={(LOSS.left + LOSS.right) / 2} y={LOSS.bottom + 82} fill={C.text2} fontSize={28} textAnchor="middle">
            エポック（対数の目盛り）
          </text>
          <text x={LOSS.left} y={LOSS.top - 22} fill={C.text2} fontSize={28} textAnchor="middle">
            損失
          </text>
          <path d={linePath('recon')} fill="none" stroke={RECON} strokeWidth={5} />
          <path d={linePath('kl')} fill="none" stroke={KL} strokeWidth={5} />
          <text x={LOSS.right} y={LOSS.top + 20} fill={RECON} fontSize={32} fontWeight={700} textAnchor="end">
            ━ 再構成の項
          </text>
          <text x={LOSS.right} y={LOSS.top + 66} fill={KL} fontSize={32} fontWeight={700} textAnchor="end">
            ━ KL の項
          </text>
        </RevealG>
      </Stage>
      <Reveal at={cues[1]} style={abs(160, 236, { fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums' })}>
        <span style={{ marginLeft: 70 }}>エポック {epoch}</span>
        <span style={{ marginLeft: 30, color: C.text2, fontWeight: 400 }}>ずれの平均 {rmse.toFixed(2)}</span>
      </Reveal>
      <Reveal at={cues[0]} out={cues[4]} style={abs(880, 240, { width: 900, fontSize: 38, lineHeight: 1.7 })}>
        <div style={{ fontWeight: 700 }}>
          CVAE を学習
          <div style={{ color: COND, fontSize: 34 }}>グループの番号を、条件 c として入れる</div>
        </div>
        <Reveal at={cues[1]} style={{ marginTop: 20 }}>
          <Card style={{ fontSize: 36, lineHeight: 1.7 }}>
            <div>
              <span style={{ color: C.muted }}>● うすい点</span>　もとのデータ
            </div>
            <div>
              <b>◉ 濃い点</b>　復元した150個
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[3] + 100} style={{ marginTop: 24, fontSize: 40, color: C.yellow, fontWeight: 700 }}>
          復元のずれの平均　2.13 → 0.12
        </Reveal>
      </Reveal>
      <Reveal at={cues[5] + 60} style={abs(1340, 420, { width: 440, fontSize: 34, lineHeight: 1.5, color: C.yellow, fontWeight: 700 })}>
        KL が 0 にならない
        <br />＝ z が情報を運んでいる
      </Reveal>
    </>
  );
};

// ---------- ここまでの整理 ----------
const MID = [
  { head: 'CVAE ＝ VAE ＋ 条件 c', body: 'エンコーダとデコーダの両方に、c を入力として加える' },
  { head: '学習 ＝ 下限を大きくする', body: '復元の正確さ（再構成の項）と、事前分布とのずれ（KL の項）' },
  { head: 'このあと：条件を指定して作る', body: '学習したデコーダに、c と、乱数で選んだ z を入れる' },
];

export const Mid: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 220, { width: 1600 })}>
    {MID.map((item, index) => (
      <Reveal key={index} at={cues[index + 1]} style={{ marginBottom: 30 }}>
        <Card style={{ padding: '30px 40px' }}>
          <div style={{ fontSize: 52, fontWeight: 700 }}>{item.head}</div>
          <div style={{ fontSize: 36, color: C.text2, marginTop: 8 }}>{item.body}</div>
        </Card>
      </Reveal>
    ))}
  </div>
);

// ---------- 6V 条件を指定して、作り分ける ----------
const BOX_6V: Box = { left: 140, top: 222, size: 640 };
const BOX_Z: Box = { left: 1410, top: 430, size: 370 };
const SAMPLES = DATA.cvae.samples;
const SHARED = DATA.cvae.sharedLatent;
const APPEAR_SPAN = 110;
const MOVE_FRAMES = 50;

export const Scene6V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const scales = boxScales(BOX_6V, DATA_RANGE);
  const zScales = boxScales(BOX_Z, LATENT_RANGE);
  // 条件：0 → 1 → 2（グループ1 → 2 → 3）。同じ z のまま、条件だけ変える
  const condition = track(frame, [cues[3] + 60, cues[3] + 60 + MOVE_FRAMES, cues[4] + 10, cues[4] + 10 + MOVE_FRAMES], [0, 1, 1, 2]);
  const lower = Math.min(Math.floor(condition), 1);
  const blend = condition - lower;
  const active = Math.round(condition);
  const shown = Math.round(rise(frame, cues[1] + 60, APPEAR_SPAN) * SHARED.length);
  return (
    <>
      <Stage>
        <PlotFrame box={BOX_6V} range={DATA_RANGE} ticks={DATA_TICKS} xLabel="x_1" yLabel="x_2" />
        <DataDots scales={scales} opacity={0.4 * rise(frame, cues[0], 30)} radius={4} />
        {SHARED.slice(0, shown).map((_, index) => {
          const from = SAMPLES[lower][index];
          const to = SAMPLES[lower + 1][index];
          return <circle key={index} cx={scales.sx(mix(from[0], to[0], blend))} cy={scales.sy(mix(from[1], to[1], blend))} r={6} fill={C.text} stroke={C.bg} strokeWidth={1.5} />;
        })}
        <RevealG at={cues[1]}>
          <PlotFrame box={BOX_Z} range={LATENT_RANGE} ticks={LATENT_TICKS} xLabel="z_1" yLabel="z_2" />
          <PriorRings scales={zScales} />
          {SHARED.slice(0, shown).map((latent, index) => (
            <circle key={index} cx={zScales.sx(latent[0])} cy={zScales.sy(latent[1])} r={4.5} fill={C.text} />
          ))}
        </RevealG>
      </Stage>
      <div style={abs(860, 222, { width: 940 })}>
        <Reveal at={cues[0]} style={{ fontSize: 38, color: C.text2 }}>
          使うのは、学習したデコーダだけ
        </Reveal>
        <Reveal at={cues[1]} style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontSize: 40, color: COND, fontWeight: 700 }}>条件 c ＝</span>
          {GROUP_NAMES.map((name, index) => (
            <span
              key={name}
              style={{
                fontSize: 38,
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: 14,
                border: `4px solid ${GROUP_COLORS3[index]}`,
                background: active === index ? GROUP_COLORS3[index] : 'transparent',
                color: active === index ? C.bg : GROUP_COLORS3[index],
                opacity: active === index ? 1 : 0.5,
              }}
            >
              {name}
            </span>
          ))}
        </Reveal>
        <Reveal at={cues[1] + 30} style={{ marginTop: 60, width: 520, fontSize: 36, lineHeight: 1.6 }}>
          <div>
            <Tex tex="z\sim\mathcal{N}(0,I)" size={42} /> を150個
          </div>
          <div style={{ color: C.text2, fontSize: 32 }}>同じ z を、3つの条件で使う →</div>
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 34, width: 500 }}>
          <Card style={{ fontSize: 34, lineHeight: 1.6, padding: '18px 26px' }}>
            <div style={{ color: C.text2 }}>指定したグループに入った数</div>
            <div style={{ fontSize: 50, fontWeight: 700, color: GROUP_COLORS3[active] }}>150 / 150</div>
          </Card>
        </Reveal>
      </div>
      <Reveal at={cues[5]} style={abs(860, 852, { width: 960, fontSize: 38, fontWeight: 700, color: C.yellow })}>
        同じ z でも、条件を変えれば、別のグループになる
      </Reveal>
    </>
  );
};
