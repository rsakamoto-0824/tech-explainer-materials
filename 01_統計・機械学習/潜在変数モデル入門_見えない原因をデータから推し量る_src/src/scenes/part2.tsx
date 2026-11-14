// part2.tsx — 第3章（混合ガウスモデル）、第4章（見えない z を推し量る）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { areaPath, C, Card, curvePath, GROUP_COLORS, mix, normalPdf, Reveal, RevealG, rise, Stage, Tex, track, XAxis, YAxis } from '../kit';
import { BIN_WIDTH, COUNT_TO_DENSITY, COUNTS_ALL, FINAL, HEIGHT, heightScales, mixture, resp2, weighted, X_MAX, X_MIN, X_TICKS, type MixtureParams } from '../model';
import type { SceneProps } from './part1';

const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left, top, ...extra });
const BLUE = C.blue;
const ORANGE = C.orange;
const texColor = (color: string, body: string) => `\\textcolor{${color}}{${body}}`;

/** ヒストグラム（確率密度の高さ） */
const DensityBars: React.FC<{ sx: (v: number) => number; sy: (v: number) => number; opacity?: number }> = ({ sx, sy, opacity = 1 }) => (
  <g opacity={opacity}>
    {COUNTS_ALL.map((count, bin) => {
      const x = sx(X_MIN + bin * BIN_WIDTH) + 2;
      const top = sy(count * COUNT_TO_DENSITY);
      return <rect key={bin} x={x} width={sx(X_MIN + BIN_WIDTH) - sx(X_MIN) - 4} y={top} height={sy(0) - top} fill="#55544f" />;
    })}
  </g>
);

/** 割合を掛けた2つの山と、その合計 */
const MixtureCurves: React.FC<{
  params: MixtureParams;
  sx: (v: number) => number;
  sy: (v: number) => number;
  scaleBy?: number[];
  sumOpacity?: number;
}> = ({ params, sx, sy, scaleBy = [1, 1], sumOpacity = 1 }) => (
  <g>
    {[0, 1].map((k) => (
      <path
        key={k}
        d={areaPath((x) => scaleBy[k] * weighted(params, k, x), X_MIN, X_MAX, sx, sy)}
        fill={GROUP_COLORS[k]}
        fillOpacity={0.16}
        stroke={GROUP_COLORS[k]}
        strokeWidth={4}
      />
    ))}
    <path d={curvePath((x) => mixture(params, x), X_MIN, X_MAX, sx, sy)} fill="none" stroke={C.text} strokeWidth={5} opacity={sumOpacity} />
  </g>
);

// ---------- 3T z を足し合わせて消す ----------
export const Scene3T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(160, 200, { width: 1600 })}>
    <Reveal at={cues[0]} dim={cues[1]} style={{ fontSize: 40, color: C.text2 }}>
      見えるのは x だけ　→　x だけの分布 <Tex tex="p(x)" size={46} color={C.text} /> がほしい
    </Reveal>
    <Reveal at={cues[1]} dim={cues[2]} style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 50 }}>
      <Tex tex="p(x)=\sum_{z}\,p(z)\,p(x\mid z)" size={62} />
      <span style={{ fontSize: 38, color: C.yellow, fontWeight: 700 }}>周辺化</span>
      <span style={{ fontSize: 34, color: C.text2 }}>z のすべての場合を足し合わせる</span>
    </Reveal>
    <Reveal at={cues[2]} style={{ marginTop: 44 }}>
      <Card accent={C.theory} style={{ padding: '30px 40px' }}>
        <Tex
          tex={`p(x)=${texColor(BLUE, '\\pi_1\\,\\mathcal{N}(x\\mid\\mu_1,\\sigma_1^2)')}+${texColor(ORANGE, '\\pi_2\\,\\mathcal{N}(x\\mid\\mu_2,\\sigma_2^2)')}`}
          size={66}
        />
        <div style={{ display: 'flex', fontSize: 34, marginTop: 14, color: C.text2 }}>
          <span style={{ marginLeft: 250, color: BLUE }}>グループ1から来る場合</span>
          <span style={{ marginLeft: 250, color: ORANGE }}>グループ2から来る場合</span>
        </div>
      </Card>
    </Reveal>
    <Reveal at={cues[3]} style={{ marginTop: 30, fontSize: 44, fontWeight: 700 }}>
      正規分布を混ぜ合わせる　＝　混合ガウスモデル
    </Reveal>
    <Reveal at={cues[4]} style={{ marginTop: 26, display: 'flex', gap: 70, fontSize: 40 }}>
      <span>
        <Tex tex="\pi" size={48} color={C.yellow} />　混ぜる割合
      </span>
      <span>
        <Tex tex="\mu" size={48} color={C.yellow} />　山の中心
      </span>
      <span>
        <Tex tex="\sigma" size={48} color={C.yellow} />　山の幅
      </span>
    </Reveal>
  </div>
);

// ---------- 3V 山を足し合わせる ----------
const PLOT = { left: 200, right: 1420, top: 250, bottom: 780 };
const DENSITY_TICKS = [0, 0.02, 0.04, 0.06, 0.08];

export const Scene3V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, sy } = heightScales(PLOT.left, PLOT.right, PLOT.top, PLOT.bottom, 0.09);
  // 割合を掛ける前（高さ1倍）→ 掛けたあと
  const applied = rise(frame, cues[1] + 20, 40);
  const end4 = cues[5] - 10;
  const weight1 = track(frame, [cues[4] + 20, cues[4] + 90, end4 - 60, end4], [FINAL.weights[0], 0.75, 0.75, FINAL.weights[0]]);
  const near = track(frame, [cues[5] + 20, cues[5] + 110], [0, 1]);
  const params: MixtureParams = {
    weights: [weight1, 1 - weight1],
    means: [mix(FINAL.means[0], 162.5, near), mix(FINAL.means[1], 167.5, near)],
    sds: FINAL.sds,
  };
  const scaleBy = params.weights.map((weight) => mix(1 / weight, 1, applied));
  const changed = Math.max(rise(frame, cues[4] + 10), 0);
  const histOpacity = rise(frame, cues[3]) * (1 - changed * (1 - rise(frame, end4 - 10)) ) * (1 - rise(frame, cues[5] + 10));
  return (
    <>
      <Stage>
        <YAxis sy={sy} x={PLOT.left} ticks={DENSITY_TICKS} y0={0} y1={0.09} label="確率密度" gridTo={PLOT.right} format={(v) => v.toFixed(2)} />
        <XAxis sx={sx} y={PLOT.bottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} label="身長 x（cm）" />
        <DensityBars sx={sx} sy={sy} opacity={histOpacity} />
        <MixtureCurves params={params} sx={sx} sy={sy} scaleBy={scaleBy} sumOpacity={rise(frame, cues[2])} />
      </Stage>
      <div style={abs(1470, 220, { width: 390 })}>
        <Reveal at={cues[0]} style={{ fontSize: 36, lineHeight: 1.7 }}>
          <div style={{ color: BLUE, fontWeight: 700 }}>━ グループ1の山</div>
          <div style={{ color: ORANGE, fontWeight: 700 }}>━ グループ2の山</div>
        </Reveal>
        <Reveal at={cues[2]} style={{ fontSize: 36, lineHeight: 1.7, fontWeight: 700 }}>
          ━ 合計 <Tex tex="p(x)" size={40} />
        </Reveal>
        <Reveal at={cues[1]} style={{ marginTop: 30 }}>
          <Card style={{ fontSize: 36, lineHeight: 1.7, padding: '18px 26px', fontVariantNumeric: 'tabular-nums' }}>
            <div>
              <Tex tex="\pi_1" size={40} color={BLUE} /> = {params.weights[0].toFixed(2)}
            </div>
            <div>
              <Tex tex="\pi_2" size={40} color={ORANGE} /> = {params.weights[1].toFixed(2)}
            </div>
            <div>
              <Tex tex="\mu_1" size={40} color={BLUE} /> = {params.means[0].toFixed(1)}
            </div>
            <div>
              <Tex tex="\mu_2" size={40} color={ORANGE} /> = {params.means[1].toFixed(1)}
            </div>
          </Card>
        </Reveal>
        <Reveal at={cues[5] + 110} style={{ marginTop: 26, fontSize: 32, color: C.yellow, lineHeight: 1.5 }}>
          山は1つに見えるが、グループは2つ
        </Reveal>
      </div>
    </>
  );
};

// ---------- 4T ベイズの定理と負担率 ----------
const NUM = C.yellow;
const DEN = '#4cc79b';

export const Scene4T: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 200, { width: 1640 })}>
    <Reveal at={cues[0]} dim={cues[1]} style={{ fontSize: 36, color: C.text2 }}>
      x を見て、見えない z を推し量る
    </Reveal>
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 0, height: 230 }}>
      <Reveal at={cues[4]}>
        <Tex tex="\gamma_k(x)\;=\;" size={58} color={C.violet} />
      </Reveal>
      <Reveal at={cues[1]}>
        <Tex
          tex={`\\;p(z=k\\mid x)\\;=\\;\\frac{${texColor(NUM, '\\displaystyle\\pi_k\\,\\mathcal{N}(x\\mid\\mu_k,\\sigma_k^2)')}}{${texColor(DEN, '\\displaystyle\\sum_{j}\\pi_j\\,\\mathcal{N}(x\\mid\\mu_j,\\sigma_j^2)')}}`}
          size={58}
        />
      </Reveal>
    </div>
    <Reveal at={cues[1]} style={{ fontSize: 34, color: C.text2, marginLeft: 330, marginTop: 16 }}>
      ↑ 事後確率（x が分かったあとの、z の確率）
    </Reveal>
    <div style={{ marginTop: 14, fontSize: 38, lineHeight: 1.55 }}>
      <Reveal at={cues[2]}>
        <b style={{ color: NUM }}>分子</b>　グループ k から、その x が出る確率（割合 × 山の高さ）
      </Reveal>
      <Reveal at={cues[3]}>
        <b style={{ color: DEN }}>分母</b>　すべてのグループの合計 ＝ <Tex tex="p(x)" size={46} />
      </Reveal>
      <Reveal at={cues[4]}>
        <b style={{ color: C.violet }}>負担率 γ</b>　その点を、各グループがどれだけ受け持つか
      </Reveal>
    </div>
    <Reveal at={cues[5]} style={{ marginTop: 18 }}>
      <Card accent={C.theory} style={{ fontSize: 38, display: 'flex', gap: 60, padding: '12px 34px' }}>
        <span style={{ color: C.muted }}>✕「グループ1です」</span>
        <span>○「グループ1の確率が 80%」</span>
      </Card>
    </Reveal>
  </div>
);

// ---------- 4C 168 cm の人で計算する ----------
const EXAMPLE_X = 168;
const heights168 = [0, 1].map((k) => normalPdf(EXAMPLE_X, FINAL.means[k], FINAL.sds[k]));
const joint168 = [0, 1].map((k) => weighted(FINAL, k, EXAMPLE_X));
const sum168 = joint168[0] + joint168[1];
const CALC_PLOT = { left: 130, right: 860, top: 250, bottom: 760 };
const COLS = [210, 200, 150, 200, 190];

const Cell: React.FC<{ width: number; children?: React.ReactNode; color?: string; bold?: boolean }> = ({ width, children, color, bold }) => (
  <div style={{ width, textAlign: 'center', color, fontWeight: bold ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
);

export const Scene4C: React.FC<SceneProps> = ({ cues }) => {
  const { sx, sy } = heightScales(CALC_PLOT.left, CALC_PLOT.right, CALC_PLOT.top, CALC_PLOT.bottom, 0.05);
  return (
    <>
      <Stage>
        <XAxis sx={sx} y={CALC_PLOT.bottom} ticks={[140, 160, 180]} x0={X_MIN} x1={X_MAX} label="身長 x（cm）" />
        <MixtureCurves params={FINAL} sx={sx} sy={sy} sumOpacity={0} />
        <RevealG at={cues[0]}>
          <line x1={sx(EXAMPLE_X)} x2={sx(EXAMPLE_X)} y1={CALC_PLOT.top} y2={CALC_PLOT.bottom} stroke={C.text} strokeWidth={3} strokeDasharray="10 8" />
          <text x={sx(EXAMPLE_X)} y={CALC_PLOT.top - 16} fill={C.text} fontSize={34} fontWeight={700} textAnchor="middle">
            168 cm
          </text>
        </RevealG>
        {[0, 1].map((k) => (
          <RevealG key={k} at={cues[k + 1]}>
            <circle cx={sx(EXAMPLE_X)} cy={sy(joint168[k])} r={12} fill={GROUP_COLORS[k]} stroke={C.bg} strokeWidth={3} />
            <text x={sx(EXAMPLE_X) + (k === 0 ? -22 : 24)} y={sy(joint168[k]) + (k === 0 ? -14 : 10)} fill={GROUP_COLORS[k]} fontSize={32} fontWeight={700} textAnchor={k === 0 ? 'end' : 'start'}>
              {joint168[k].toFixed(4)}
            </text>
          </RevealG>
        ))}
      </Stage>
      <div style={abs(920, 250, { width: 950, fontSize: 38 })}>
        <Reveal at={cues[0]} style={{ display: 'flex', color: C.muted, fontSize: 30, fontWeight: 600, borderBottom: `2px solid ${C.line}`, paddingBottom: 12 }}>
          <Cell width={COLS[0]} />
          <Cell width={COLS[1]}>山の高さ</Cell>
          <Cell width={COLS[2]}>× 割合 π</Cell>
          <Cell width={COLS[3]}>＝ 分子</Cell>
          <Cell width={COLS[4]}>負担率</Cell>
        </Reveal>
        {[0, 1].map((k) => (
          <Reveal key={k} at={cues[k + 1]} style={{ display: 'flex', alignItems: 'center', height: 110, borderBottom: `2px solid ${C.grid}` }}>
            <Cell width={COLS[0]} color={GROUP_COLORS[k]} bold>
              グループ{k + 1}
            </Cell>
            <Cell width={COLS[1]}>{heights168[k].toFixed(4)}</Cell>
            <Cell width={COLS[2]}>{FINAL.weights[k].toFixed(2)}</Cell>
            <Cell width={COLS[3]} bold>
              {joint168[k].toFixed(4)}
            </Cell>
            <Cell width={COLS[4]} color={GROUP_COLORS[k]} bold>
              <Reveal at={cues[4]} dy={0}>
                <span style={{ fontSize: 50 }}>{Math.round((100 * joint168[k]) / sum168)}%</span>
              </Reveal>
            </Cell>
          </Reveal>
        ))}
        <Reveal at={cues[3]} style={{ display: 'flex', alignItems: 'center', height: 100 }}>
          <Cell width={COLS[0]} color={C.text2}>
            合計（分母）
          </Cell>
          <Cell width={COLS[1]} />
          <Cell width={COLS[2]} />
          <Cell width={COLS[3]} bold>
            {sum168.toFixed(4)}
          </Cell>
          <Cell width={COLS[4]} />
        </Reveal>
        <Reveal at={cues[4]} style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', height: 70, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ width: `${(100 * joint168[0]) / sum168}%`, background: BLUE }} />
            <div style={{ flex: 1, background: ORANGE }} />
          </div>
          <div style={{ fontSize: 34, color: C.text2, marginTop: 14 }}>168 cm の人は、グループ2の可能性が高い</div>
        </Reveal>
      </div>
    </>
  );
};

// ---------- 4P 見る前の確率、見たあとの確率 ----------
const ProbBar: React.FC<{ share1: number; height?: number }> = ({ share1, height = 92 }) => {
  const percent1 = Math.round(100 * share1);
  return (
    <div style={{ display: 'flex', height, borderRadius: 14, overflow: 'hidden', fontSize: 40, fontWeight: 700, color: C.bg, width: 1000 }}>
      <div style={{ width: `${100 * share1}%`, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{percent1 >= 8 ? `${percent1}%` : ''}</div>
      <div style={{ flex: 1, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{percent1 <= 92 ? `${100 - percent1}%` : ''}</div>
    </div>
  );
};
const post1 = (x: number) => 1 - resp2(FINAL, x);

export const Scene4P: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(140, 200, { width: 1640 })}>
    <Reveal at={cues[0]} style={{ display: 'flex', gap: 50, fontSize: 36, fontWeight: 700, marginLeft: 560 }}>
      <span style={{ color: BLUE }}>■ グループ1</span>
      <span style={{ color: ORANGE }}>■ グループ2</span>
    </Reveal>
    <Reveal at={cues[1]} style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
      <div style={{ width: 560 }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>身長を見る前</div>
        <div style={{ fontSize: 34, color: C.text2 }}>事前確率 ＝ 混ぜる割合 π</div>
      </div>
      <ProbBar share1={FINAL.weights[0]} />
    </Reveal>
    <Reveal at={cues[2]} style={{ marginLeft: 1000, fontSize: 38, color: C.yellow, margin: '18px 0 18px 900px', fontWeight: 700 }}>
      ↓ 「168 cm」を見る
    </Reveal>
    <Reveal at={cues[2]} style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 560 }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>168 cm を見たあと</div>
        <div style={{ fontSize: 34, color: C.text2 }}>事後確率 ＝ 負担率 γ</div>
      </div>
      <ProbBar share1={post1(168)} />
    </Reveal>
    <Reveal at={cues[3]} style={{ marginTop: 34, fontSize: 38, color: C.text2 }}>
      データを見ると、確率が更新される。<b style={{ color: C.text }}>ベイズの定理は、この更新のルール</b>
    </Reveal>
    <Reveal at={cues[4]} style={{ display: 'flex', alignItems: 'center', marginTop: 40 }}>
      <div style={{ width: 560 }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>もし 155 cm なら</div>
        <div style={{ fontSize: 34, color: C.text2 }}>事後確率</div>
      </div>
      <ProbBar share1={post1(155)} />
    </Reveal>
  </div>
);

// ---------- 4V 負担率は身長でどう変わるか ----------
const TOP_PLOT = { left: 200, right: 1380, top: 240, bottom: 520 };
const BOTTOM_PLOT = { left: 200, right: 1380, top: 650, bottom: 808 };
const CROSSING_X = 164.5;

export const Scene4V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, sy } = heightScales(TOP_PLOT.left, TOP_PLOT.right, TOP_PLOT.top, TOP_PLOT.bottom, 0.045);
  const syResp = (value: number) => mix(BOTTOM_PLOT.bottom, BOTTOM_PLOT.top, value);
  const x = track(
    frame,
    [cues[2], cues[2] + 50, cues[3], cues[3] + 60, cues[4], cues[4] + 60, cues[5] + 20, cues[5] + 60, cues[6] - 20],
    [168, 150, 150, 180, 180, CROSSING_X, CROSSING_X, 145, 186],
  );
  const share2 = resp2(FINAL, x);
  const curveShown = rise(frame, cues[5], 40);
  return (
    <>
      <Stage>
        <XAxis sx={sx} y={TOP_PLOT.bottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} />
        <MixtureCurves params={FINAL} sx={sx} sy={sy} sumOpacity={0} />
        <line x1={sx(x)} x2={sx(x)} y1={TOP_PLOT.top} y2={mix(TOP_PLOT.bottom, BOTTOM_PLOT.bottom, curveShown)} stroke={C.text} strokeWidth={3} strokeDasharray="10 8" />
        {[0, 1].map((k) => (
          <circle key={k} cx={sx(x)} cy={sy(weighted(FINAL, k, x))} r={11} fill={GROUP_COLORS[k]} stroke={C.bg} strokeWidth={3} />
        ))}
        <text x={TOP_PLOT.left} y={TOP_PLOT.top - 24} fill={C.text2} fontSize={28}>
          割合を掛けた2つの山
        </text>
        <g opacity={curveShown}>
          <XAxis sx={sx} y={BOTTOM_PLOT.bottom} ticks={X_TICKS} x0={X_MIN} x1={X_MAX} label="身長 x（cm）" />
          <YAxis sy={syResp} x={BOTTOM_PLOT.left} ticks={[0, 0.5, 1]} y0={0} y1={1} gridTo={BOTTOM_PLOT.right} />
          <path d={curvePath((v) => resp2(FINAL, v), X_MIN, X_MAX, sx, syResp)} fill="none" stroke={ORANGE} strokeWidth={5} />
          <circle cx={sx(x)} cy={syResp(share2)} r={11} fill={ORANGE} stroke={C.bg} strokeWidth={3} />
          <text x={TOP_PLOT.left} y={BOTTOM_PLOT.top - 18} fill={C.text2} fontSize={28}>
            グループ2の負担率
          </text>
        </g>
      </Stage>
      <div style={abs(1450, 180, { width: 410 })}>
        <Reveal at={cues[0]}>
          <div style={{ fontSize: 34, color: C.text2 }}>いま見ている身長</div>
          <div style={{ fontSize: 60, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{x.toFixed(1)} cm</div>
        </Reveal>
        <Reveal at={cues[1]} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 34, color: C.text2, marginBottom: 6 }}>負担率</div>
          <div style={{ display: 'flex', height: 250, gap: 40, alignItems: 'flex-end', borderBottom: `2px solid ${C.axis}` }}>
            {[1 - share2, share2].map((share, k) => (
              <div key={k} style={{ width: 150, textAlign: 'center' }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: GROUP_COLORS[k], fontVariantNumeric: 'tabular-nums' }}>{Math.round(100 * share)}%</div>
                <div style={{ height: 180 * share, background: GROUP_COLORS[k], borderRadius: '8px 8px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 40, fontSize: 28, color: C.text2, marginTop: 8 }}>
            <span style={{ width: 150, textAlign: 'center' }}>グループ1</span>
            <span style={{ width: 150, textAlign: 'center' }}>グループ2</span>
          </div>
        </Reveal>
        <Reveal at={cues[6]} style={{ marginTop: 18 }}>
          <Card accent={C.yellow} style={{ fontSize: 30, padding: '10px 22px', lineHeight: 1.45 }}>
            大きいほうに振り分けたときの正解率
            <br />
            <b style={{ fontSize: 44 }}>{(100 * HEIGHT.accuracy).toFixed(1)}%</b>
          </Card>
        </Reveal>
      </div>
    </>
  );
};
