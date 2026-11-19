// 第4章（分散で測る：Sobol法とFAST）、第5章（分布で測る：PAWNとδ）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, PRECOMPUTED} from '../lib/data.ts';
import {ishigami, toIshigamiInput} from '../lib/sobol.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {Chip, format2, INPUT_COLORS, INPUT_NAMES, mixColor} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

// 小さな行列の絵（A・B・AB_i）
const MatrixIcon: React.FC<{label: string; colors: string[]}> = ({label, colors}) => (
  <div style={{textAlign: 'center'}}>
    <svg width={96} height={110} style={{display: 'block'}}>
      {colors.map((color, k) => (
        <rect key={k} x={6 + k * 29} y={6} width={25} height={98} rx={4} fill={color} opacity={0.75} />
      ))}
    </svg>
    <div style={{fontFamily: FONT, fontSize: 28, fontWeight: 700, color: COLOR.text}}>{label}</div>
  </div>
);

// 周波数の違う3本の波の絵
const WavesIcon: React.FC = () => (
  <svg width={300} height={170} style={{display: 'block'}}>
    {[3, 7, 12].map((w, k) => {
      const y0 = 30 + k * 55;
      const d = Array.from({length: 121}, (_, j) => `${j === 0 ? 'M' : 'L'}${(10 + j * 2.33).toFixed(1)} ${(y0 - 20 * Math.sin((w * j * Math.PI) / 60)).toFixed(1)}`).join(' ');
      return <path key={k} d={d} fill="none" stroke={INPUT_COLORS[k]} strokeWidth={4} />;
    })}
  </svg>
);

// 周波数の成分の絵（山がいくつか立つ）
const SpectrumIcon: React.FC = () => (
  <svg width={260} height={150} style={{display: 'block'}}>
    <line x1={8} x2={252} y1={140} y2={140} stroke={COLOR.muted} strokeWidth={2} />
    {Array.from({length: 40}, (_, k) => {
      const tall = k === 6 || k === 12 ? 110 : k === 18 ? 40 : k === 2 ? 70 : 6 + ((k * 7) % 9);
      const color = k === 6 || k === 12 || k === 18 ? B : k <= 3 ? O : COLOR.muted;
      return <rect key={k} x={10 + k * 6} y={140 - tall} width={4} height={tall} fill={color} />;
    })}
  </svg>
);

export const S4T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={175} w={860}>
      <Card accent={B} style={{height: 330}}>
        <Reveal line={0}>
          <div style={{fontSize: 34, fontWeight: 800, whiteSpace: 'nowrap'}}>感度 ＝ 分散のうち各入力が説明する割合</div>
        </Reveal>
        <Reveal line={1}>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 22}}>
            <Label color={COLOR.text} style={{width: 150}}>
              一次効果
            </Label>
            <Tex tex={raw`S_i = \dfrac{\mathrm{Var}\big(E[Y \mid X_i]\big)}{\mathrm{Var}(Y)}`} size={33} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 12}}>
            <Label color={COLOR.text} style={{width: 150}}>
              総合効果
            </Label>
            <Tex tex={raw`S_{Ti} = \dfrac{E\big[\mathrm{Var}(Y \mid X_{\sim i})\big]}{\mathrm{Var}(Y)}`} size={33} />
          </div>
        </Reveal>
      </Card>
    </Box>
    <Box x={980} y={175} w={850}>
      <Reveal line={2}>
        <Card accent={B} style={{height: 330}}>
          <div style={{fontSize: 36, fontWeight: 800}}>Sobol法：列を入れかえた行列で推定</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 16}}>
            <MatrixIcon label="A" colors={[B, B, B]} />
            <MatrixIcon label="B" colors={[O, O, O]} />
            <MatrixIcon label="AB₁" colors={[O, B, B]} />
            <div>
              <Tex tex={raw`N(d + 2)\ \text{回}`} size={38} />
              <Label size={26} style={{marginTop: 10}} color={H}>
                くわしくは
                <br />
                「Sobol感度解析」の動画で
              </Label>
            </div>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={535} w={1740}>
      <Reveal line={3}>
        <Card accent={A} style={{height: 330, display: 'flex', gap: 40}}>
          <div style={{width: 520}}>
            <div style={{fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap'}}>FAST：違う周波数で動かす</div>
            <div style={{marginTop: 12}}>
              <WavesIcon />
            </div>
          </div>
          <div style={{flex: 1}}>
            <Tex tex={raw`x_i(s) = \tfrac{1}{2} + \tfrac{1}{\pi}\arcsin\big(\sin(\omega_i s)\big)`} size={34} />
            <Reveal line={4}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 14}}>
                <SpectrumIcon />
                <div>
                  <Label color={B}>ωᵢ とその倍の成分 → 一次効果</Label>
                  <Reveal line={5}>
                    <Label color={O} style={{marginTop: 10}}>
                      eFAST：低い周波数以外 → 総合効果
                    </Label>
                    <Tex tex={raw`S_{Ti} = 1 - \dfrac{\text{低い周波数の成分}}{\mathrm{Var}(Y)}`} size={30} style={{marginTop: 8}} />
                  </Reveal>
                </div>
              </div>
            </Reveal>
          </div>
        </Card>
      </Reveal>
    </Box>
  </>
);

// ---- 図解：eFAST の探索曲線と周波数の成分 ----
const FAST = PRECOMPUTED.fast;
const EX = FAST.example;
const WINDOW = (2 * Math.PI) / 8; // 探索曲線のうち、最初の 1/8 だけを描く
const WAVE_X0 = 200;
const WAVE_W = 680;
const WAVE_ROWS = [0, 1, 2].map((i) => ({y: 235 + i * 95, h: 70}));
const Y_RECT = {x: WAVE_X0, y: 560, w: WAVE_W, h: 230};
const curveUnit = (i: number, s: number) => 0.5 + Math.asin(Math.sin(EX.omegas[i] * s + EX.phases[i])) / Math.PI;
const WAVE_STEPS = 600;
const SPEC_RECT = {x: 1090, y: 230, w: 720, h: 330};
const POWER_TOTAL = 2 * EX.power.reduce((s, v) => s + v, 0);
const SHARES = EX.power.map((p) => (2 * p) / POWER_TOTAL);
const OWN_FREQS = new Set([1, 2, 3, 4].map((p) => p * EX.omegaMax));
const LOW_LIMIT = Math.floor(EX.omegaMax / 2);
const freqColor = (freq: number) => (OWN_FREQS.has(freq) ? B : freq <= LOW_LIMIT ? O : A);
const shareOf = (test: (freq: number) => boolean) => SHARES.reduce((s, v, k) => (test(k + 1) ? s + v : s), 0);
const OWN_SHARE = shareOf((f) => OWN_FREQS.has(f));
const LOW_SHARE = shareOf((f) => f <= LOW_LIMIT);
const SPEC_MAX = 0.45;

export const S4V: React.FC = () => {
  const {rise, sweep, currentLine} = useLines();
  const draw = sweep(0, 0.1, 0.7);
  const drawY = sweep(1, 0.05, 0.6);
  const sx = (s: number) => WAVE_X0 + (s / WINDOW) * WAVE_W;
  const specX = makeScale(0, EX.power.length, SPEC_RECT.x, SPEC_RECT.x + SPEC_RECT.w);
  const specY = makeScale(0, SPEC_MAX, SPEC_RECT.y + SPEC_RECT.h, SPEC_RECT.y);
  const yScale = makeScale(-12, 19, Y_RECT.y + Y_RECT.h, Y_RECT.y);
  const focus = (freq: number) => {
    const color = freqColor(freq);
    if (currentLine === 2) return color === B ? 1 : 0.25;
    if (currentLine === 3) return color === B ? 0.3 : 1;
    return 1;
  };
  const wavePath = (value: (s: number) => number, progress: number) =>
    Array.from({length: Math.max(2, Math.round(WAVE_STEPS * progress))}, (_, j) => {
      const s = (WINDOW * j) / WAVE_STEPS;
      return `${j === 0 ? 'M' : 'L'}${sx(s).toFixed(1)} ${value(s).toFixed(1)}`;
    }).join(' ');
  return (
    <>
      <Canvas>
        {WAVE_ROWS.map((row, i) => (
          <g key={i} opacity={rise(0, i * 5)}>
            <rect x={WAVE_X0} y={row.y} width={WAVE_W} height={row.h} rx={6} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} />
            <path d={wavePath((s) => row.y + row.h - curveUnit(i, s) * row.h, draw)} fill="none" stroke={INPUT_COLORS[i]} strokeWidth={4} />
            <SvgText x={WAVE_X0 - 20} y={row.y + row.h / 2} anchor="end" size={30} color={COLOR.text} weight={700}>
              {INPUT_NAMES[i]}
            </SvgText>
            <SvgText x={WAVE_X0 + WAVE_W + 16} y={row.y + row.h / 2} anchor="start" size={24} color={COLOR.subText}>
              {`ω = ${EX.omegas[i]}`}
            </SvgText>
          </g>
        ))}
        <g opacity={rise(1)}>
          <rect x={Y_RECT.x} y={Y_RECT.y} width={Y_RECT.w} height={Y_RECT.h} rx={6} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} />
          <path
            d={wavePath((s) => yScale(ishigami(toIshigamiInput([0, 1, 2].map((i) => curveUnit(i, s))))), drawY)}
            fill="none"
            stroke={H}
            strokeWidth={3}
          />
          <SvgText x={WAVE_X0 - 20} y={Y_RECT.y + Y_RECT.h / 2} anchor="end" size={30} color={COLOR.text} weight={700}>
            Y
          </SvgText>
          <SvgText x={WAVE_X0 + WAVE_W / 2} y={Y_RECT.y + Y_RECT.h + 30} size={26} color={COLOR.subText}>
            探索曲線の上を進む → （最初の 1/8 を表示）
          </SvgText>
        </g>
        <g opacity={rise(2) * (1 - rise(4))}>
          <PlotFrame
            rect={SPEC_RECT}
            xDomain={[0, EX.power.length]}
            yDomain={[0, SPEC_MAX]}
            xTicks={[0, 64, 128, 192, 256]}
            yTicks={[0, 0.2, 0.4]}
            xLabel="周波数"
            yLabel="分散の割合"
            title="出力 Y の周波数の成分"
          />
          {SHARES.map((share, k) => {
            const freq = k + 1;
            const h = Math.max(0, specY(0) - specY(Math.min(share, SPEC_MAX)));
            return h < 0.4 ? null : (
              <rect key={k} x={specX(freq) - 3} y={specY(0) - h} width={6} height={h} fill={freqColor(freq)} opacity={focus(freq)} />
            );
          })}
        </g>
      </Canvas>
      <Box x={1000} y={665} w={830} style={{opacity: 1 - rise(4)}}>
        <Reveal line={2}>
          <div style={{display: 'flex', gap: 14, flexWrap: 'wrap'}}>
            <Chip color={B} size={28}>{`X₁ の周波数 ${Math.round(OWN_SHARE * 100)}% → S₁`}</Chip>
            <span style={{opacity: rise(3)}}>
              <Chip color={O} size={28}>{`低い周波数 ${Math.round(LOW_SHARE * 100)}%`}</Chip>
            </span>
          </div>
        </Reveal>
        <Reveal line={3}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 12}}>
            <Chip color={A} size={28}>{`交互作用 ${Math.round((1 - OWN_SHARE - LOW_SHARE) * 100)}%`}</Chip>
            <Label color={COLOR.text} size={30}>{`総合効果 ＝ 1 − ${format2(LOW_SHARE)} ＝ ${format2(FAST.totalEffect[0])}`}</Label>
          </div>
        </Reveal>
      </Box>
      {/* 3つの入力の結果（eFAST と Sobol 法） */}
      <Box x={1000} y={300} w={830} style={{opacity: rise(4)}}>
        <Card accent={COLOR.muted} style={{padding: '16px 26px', backgroundColor: COLOR.backgroundDeep}}>
          <ResultTable />
        </Card>
      </Box>
    </>
  );
};

const RESULT_ROWS = [
  {label: 'eFAST', cost: FAST.cost, first: FAST.first, total: FAST.totalEffect, line: 4},
  {label: 'Sobol法', cost: PRECOMPUTED.sobol.cost, first: PRECOMPUTED.sobol.first, total: PRECOMPUTED.sobol.totalEffect, line: 5},
  {label: '正確な値', cost: 0, first: ISHIGAMI.first, total: ISHIGAMI.totalEffect, line: 5},
];

const ResultTable: React.FC = () => {
  const {rise} = useLines();
  const cell = {width: 84, textAlign: 'right' as const};
  return (
    <div style={{fontFamily: FONT, color: COLOR.text, fontSize: 28, fontWeight: 700}}>
      <div style={{display: 'flex', gap: 6, color: COLOR.subText, fontSize: 24}}>
        <span style={{width: 220}} />
        <span style={{width: 264}}>一次効果 X₁ X₂ X₃</span>
        <span style={{width: 264}}>総合効果 X₁ X₂ X₃</span>
      </div>
      {RESULT_ROWS.map((row) => (
        <div key={row.label} style={{display: 'flex', gap: 6, marginTop: 6, opacity: rise(row.line)}}>
          <span style={{width: 220, whiteSpace: 'nowrap'}}>
            {row.label}
            <span style={{fontSize: 20, color: COLOR.muted, marginLeft: 6}}>{row.cost ? `${row.cost}回` : ''}</span>
          </span>
          {row.first.map((v, i) => (
            <span key={`f${i}`} style={{...cell, color: INPUT_COLORS[i]}}>
              {format2(Math.max(0, v))}
            </span>
          ))}
          {row.total.map((v, i) => (
            <span key={`t${i}`} style={{...cell, color: INPUT_COLORS[i]}}>
              {format2(v)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

// ---- 第5章 ----

// 分散が同じで形の違う2つの分布の絵
const bell = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const ShapeIcon: React.FC<{f: (x: number) => number; color: string}> = ({f, color}) => {
  const d = Array.from({length: 101}, (_, j) => {
    const x = -3 + (6 * j) / 100;
    return `${j === 0 ? 'M' : 'L'}${(10 + j * 2.2).toFixed(1)} ${(95 - 80 * f(x)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={240} height={100} style={{display: 'block'}}>
      <path d={`${d} L230 95 L10 95 Z`} fill={color} opacity={0.5} />
      <line x1={5} x2={235} y1={95} y2={95} stroke={COLOR.muted} strokeWidth={2} />
    </svg>
  );
};

// 密度のずれ（面積）と、累積分布の差（縦の最大）の絵
const DensityIcon: React.FC = () => {
  const path = (m: number, s: number, k: number) =>
    Array.from({length: 101}, (_, j) => {
      const x = -3 + (6 * j) / 100;
      return `${j === 0 ? 'M' : 'L'}${(10 + j * 3).toFixed(1)} ${(130 - k * bell(x, m, s)).toFixed(1)}`;
    }).join(' ');
  return (
    <svg width={320} height={140} style={{display: 'block'}}>
      <path d={`${path(0, 1, 100)} L310 130 L10 130 Z`} fill={COLOR.subText} opacity={0.25} />
      <path d={`${path(0.4, 0.6, 115)} L310 130 L10 130 Z`} fill={O} opacity={0.35} />
      <path d={path(0, 1, 100)} fill="none" stroke={COLOR.text} strokeWidth={3} />
      <path d={path(0.4, 0.6, 115)} fill="none" stroke={O} strokeWidth={3} />
      <line x1={5} x2={315} y1={130} y2={130} stroke={COLOR.muted} strokeWidth={2} />
    </svg>
  );
};
const CdfIcon: React.FC = () => {
  const cdf = (x: number, m: number, s: number) => 1 / (1 + Math.exp(-(x - m) / (0.6 * s)));
  const path = (m: number, s: number) =>
    Array.from({length: 101}, (_, j) => {
      const x = -3 + (6 * j) / 100;
      return `${j === 0 ? 'M' : 'L'}${(10 + j * 3).toFixed(1)} ${(130 - 115 * cdf(x, m, s)).toFixed(1)}`;
    }).join(' ');
  const gapX = 10 + 50 * 3 - 18;
  return (
    <svg width={320} height={140} style={{display: 'block'}}>
      <path d={path(0, 1)} fill="none" stroke={COLOR.text} strokeWidth={3} />
      <path d={path(0.5, 0.5)} fill="none" stroke={O} strokeWidth={3} />
      <line x1={gapX} x2={gapX} y1={130 - 115 * cdf(-0.36, 0, 1)} y2={130 - 115 * cdf(-0.36, 0.5, 0.5)} stroke={H} strokeWidth={4} />
      <line x1={5} x2={315} y1={130} y2={130} stroke={COLOR.muted} strokeWidth={2} />
    </svg>
  );
};

export const S5T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={170} w={1740}>
      <Reveal line={0}>
        <Card accent={COLOR.muted} style={{display: 'flex', alignItems: 'center', gap: 40, height: 175}}>
          <div style={{width: 640}}>
            <div style={{fontSize: 36, fontWeight: 800}}>分散 ＝ ばらつきの大きさを1つの数で</div>
            <Label style={{marginTop: 8}} color={COLOR.warning} size={29}>
              偏り・山が2つ → 分散だけでは捉えきれない
            </Label>
          </div>
          <div style={{textAlign: 'center'}}>
            <ShapeIcon f={(x) => bell(x, 0, 1)} color={COLOR.subText} />
          </div>
          <div style={{textAlign: 'center'}}>
            <ShapeIcon f={(x) => 0.9 * (bell(x, -1.35, 0.45) + bell(x, 1.35, 0.45))} color={O} />
          </div>
          <Label>分散は同じ</Label>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={370} w={1740}>
      <Reveal line={1}>
        <Label color={H} size={36}>
          入力を固定したとき、出力の分布の形がどれだけ変わるか ＝ モーメントによらない方法
        </Label>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={440} w={860}>
      <Reveal line={2}>
        <Card accent={O} style={{height: 330}}>
          <div style={{fontSize: 34, fontWeight: 800}}>Borgonovo の δ（2007）</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 10}}>
            <DensityIcon />
            <Label size={26}>
              ずれの面積を
              <br />
              Xᵢ について平均
            </Label>
          </div>
          <Tex tex={raw`\delta_i = \tfrac{1}{2}\,E_{X_i}\!\Big[\textstyle\int |f_Y(y) - f_{Y\mid X_i}(y)|\,dy\Big]`} size={32} style={{marginTop: 6}} />
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={440} w={850}>
      <Reveal line={3}>
        <Card accent={B} style={{height: 330}}>
          <div style={{fontSize: 34, fontWeight: 800}}>PAWN（Pianosi & Wagener 2015）</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 10}}>
            <CdfIcon />
            <Label size={26}>
              累積分布の縦の差の
              <br />
              最大 ＝ KS距離
            </Label>
          </div>
          <Tex tex={raw`T_i = \underset{X_i}{\mathrm{median}}\ \max_y \big|F_Y(y) - F_{Y\mid X_i}(y)\big|`} size={32} style={{marginTop: 6}} />
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={800} w={1740}>
      <Reveal line={4}>
        <Label color={COLOR.text} size={32}>
          特別な入力の組は不要 → すでにある入力と出力のデータから計算できる
        </Label>
      </Reveal>
    </Box>
  </>
);

// ---- 図解：X3 で分けた累積分布 ----
const PAWN = PRECOMPUTED.pawn;
const CDF_RECT = {x: 200, y: 230, w: 760, h: 520};
const PAWN_RECT = {x: 1200, y: 250, w: 560, h: 300};

export const S5V: React.FC = () => {
  const {rise, sweep, currentLine} = useLines();
  const grid = PAWN.grid;
  const lo = grid[0];
  const hi = grid[grid.length - 1];
  const sx = makeScale(lo, hi, CDF_RECT.x, CDF_RECT.x + CDF_RECT.w);
  const sy = makeScale(0, 1, CDF_RECT.y + CDF_RECT.h, CDF_RECT.y);
  const cdfPath = (values: number[]) => values.map((v, k) => `${k === 0 ? 'M' : 'L'}${sx(grid[k]).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const slices = PAWN.conditionalX3.length;
  const spread = (k: number) => Math.abs(k - (slices - 1) / 2) / ((slices - 1) / 2); // 0 = 真ん中、1 = 端
  const sliceOpacity = (k: number) => {
    const shown = rise(1, k * 4);
    if (currentLine === 2) return shown * (k === 0 || k === slices - 1 || k === 4 || k === 5 ? 1 : 0.2);
    return shown * 0.85;
  };
  const bx = (i: number) => PAWN_RECT.x + 90 + i * 170;
  const by = makeScale(0, 0.5, PAWN_RECT.y + PAWN_RECT.h, PAWN_RECT.y);
  const grow = sweep(3, 0.05, 0.5);
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame
            rect={CDF_RECT}
            xDomain={[lo, hi]}
            yDomain={[0, 1]}
            xTicks={[-10, 0, 10]}
            yTicks={[0, 0.5, 1]}
            xLabel="Y の値"
            yLabel="累積分布"
            format={(v) => String(v).replace('-', '−')}
          />
          {PAWN.conditionalX3.map((cdf, k) => (
            <path key={k} d={cdfPath(cdf)} fill="none" stroke={mixColor(A, O, spread(k))} strokeWidth={3.5} opacity={sliceOpacity(k)} />
          ))}
          <path d={cdfPath(PAWN.overall)} fill="none" stroke={COLOR.text} strokeWidth={6} />
        </g>
        <g opacity={rise(1)}>
          {[
            {label: 'X₃ が0に近い区間', color: A},
            {label: 'X₃ が両端の区間', color: O},
          ].map((item, k) => (
            <g key={item.label}>
              <line x1={CDF_RECT.x + 30} x2={CDF_RECT.x + 80} y1={CDF_RECT.y + 40 + k * 44} y2={CDF_RECT.y + 40 + k * 44} stroke={item.color} strokeWidth={6} />
              <SvgText x={CDF_RECT.x + 95} y={CDF_RECT.y + 40 + k * 44} anchor="start" size={27} color={COLOR.text} weight={700}>
                {item.label}
              </SvgText>
            </g>
          ))}
          <line x1={CDF_RECT.x + 30} x2={CDF_RECT.x + 80} y1={CDF_RECT.y + 128} y2={CDF_RECT.y + 128} stroke={COLOR.text} strokeWidth={6} />
          <SvgText x={CDF_RECT.x + 95} y={CDF_RECT.y + 128} anchor="start" size={27} color={COLOR.text} weight={700}>
            全体
          </SvgText>
        </g>
        <g opacity={rise(3)}>
          <PlotFrame rect={PAWN_RECT} xDomain={[0, 1]} yDomain={[0, 0.5]} yTicks={[0, 0.2, 0.4]} title="KS距離の中央値（PAWN）" format={(v) => String(v)} />
          {PAWN.median.map((value, i) => {
            const h = (by(0) - by(value)) * grow;
            return (
              <g key={i}>
                <rect x={bx(i) - 45} y={by(0) - h} width={90} height={h} rx={6} fill={INPUT_COLORS[i]} opacity={currentLine === 4 && i !== 2 ? 0.35 : 1} />
                <SvgText x={bx(i)} y={by(0) - h - 24} size={30} color={COLOR.text} weight={800}>
                  {format2(value)}
                </SvgText>
                <SvgText x={bx(i)} y={by(0) + 30} size={28} color={COLOR.text} weight={700}>
                  {INPUT_NAMES[i]}
                </SvgText>
              </g>
            );
          })}
        </g>
      </Canvas>
      <Box x={1110} y={640} w={720}>
        <Reveal line={4}>
          <Card accent={A} style={{padding: '16px 26px'}}>
            <div style={{fontSize: 32, fontWeight: 800}}>X₃：一次効果 ≈ 0 でも PAWN は 0.10</div>
            <Label style={{marginTop: 6}} size={28}>
              分散を使わずに、分布の形の変化を捉えた
            </Label>
          </Card>
        </Reveal>
        <Reveal line={5}>
          <Label color={COLOR.warning} size={28} style={{marginTop: 14}}>
            ✕ 分散の割合ではない（足して1にならない）
          </Label>
        </Reveal>
      </Box>
    </>
  );
};
