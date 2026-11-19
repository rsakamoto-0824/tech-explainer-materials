// 第6章（精度を上げる工夫と注意点）、第7章（実務での使い方）、まとめ
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {makeRandomPoints, PRECOMPUTED, SIX, SOBOL_POINTS, UNIFORM_POINTS} from '../lib/data.ts';
import {REFERENCES, VOICE_CREDIT} from '../script.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {format2, MiniSquare, NumberBadge} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

const MINI_RANDOM = makeRandomPoints(64, 7);
const MINI_SOBOL = SOBOL_POINTS.slice(0, 64) as [number, number][];

export const S6T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={180} w={850}>
      <Reveal line={1}>
        <Card accent={B} style={{height: 330}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
            <NumberBadge color={B}>1</NumberBadge>
            <div style={{fontSize: 40, fontWeight: 800}}>準乱数（Sobol列）を使う</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 20}}>
            <div style={{textAlign: 'center'}}>
              <MiniSquare size={150} points={MINI_RANDOM} color={COLOR.subText} />
              <Label size={26} style={{marginTop: 4}}>
                乱数
              </Label>
            </div>
            <div style={{fontSize: 50, color: COLOR.subText}}>→</div>
            <div style={{textAlign: 'center'}}>
              <MiniSquare size={150} points={MINI_SOBOL} color={B} />
              <Label size={26} style={{marginTop: 4}} color={B}>
                Sobol列
              </Label>
            </div>
            <Label size={30} style={{marginLeft: 10}}>
              むらなく埋まる
              <br />→ 少ない回数で安定
            </Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={180} w={850}>
      <Reveal line={2}>
        <Card accent={O} style={{height: 330}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
            <NumberBadge color={O}>2</NumberBadge>
            <div style={{fontSize: 40, fontWeight: 800}}>ブートストラップで信頼区間</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 26, fontFamily: FONT}}>
            {[1, 2, 3, 4, 5].map((row) => (
              <span key={row} style={{fontSize: 30, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: `2px solid ${COLOR.panelLine}`}}>
                {row}
              </span>
            ))}
            <span style={{fontSize: 40, color: COLOR.subText}}>→</span>
            {[2, 2, 5, 1, 4].map((row, i) => (
              <span key={i} style={{fontSize: 30, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: `2px solid ${O}`}}>
                {row}
              </span>
            ))}
          </div>
          <Label size={30} style={{marginTop: 20}}>
            計算済みの行を重複を許して選び直し、
            <br />
            指数を何度も計算しなおす（計算の追加なし）
          </Label>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={545} w={850}>
      <Reveal line={3}>
        <Card accent={COLOR.muted} style={{height: 300}}>
          <div style={{fontSize: 38, fontWeight: 800}}>小さな指数は負になることも</div>
          <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 24}}>
            <Tex tex={raw`\hat S_3 = -0.002`} size={42} color={COLOR.text} />
            <Label color={H}>→ 0 とみなす</Label>
          </div>
          <Label style={{marginTop: 16}}>真の値は 0 以上。推定のぶれで負になる</Label>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={545} w={850}>
      <Reveal line={4}>
        <Card accent={COLOR.warning} style={{height: 300}}>
          <div style={{fontSize: 38, fontWeight: 800}}>前提：入力は互いに独立</div>
          <Label style={{marginTop: 18}} color={COLOR.text}>
            分散分解の式は、独立のときだけ成り立つ
          </Label>
          <Label style={{marginTop: 10}} color={COLOR.warning}>
            相関のある入力には、そのままでは使えない
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

// ---- 図解：乱数と Sobol 列、推定の収束 ----
const SQUARE = 440;
const SQUARE_Y = 250;
const SQUARE_XS = [330, 1150];
const GRID = 16;

// 16×16 のマスのうち、点が1つも入らないマスの数
const emptyCells = (points: number[][]) => {
  const filled = new Set(points.map(([x, y]) => `${Math.floor(x * GRID)}-${Math.floor(y * GRID)}`));
  return GRID * GRID - filled.size;
};
const EMPTY = [emptyCells(UNIFORM_POINTS), emptyCells(SOBOL_POINTS)];

const FAN_RECTS = [
  {x: 270, y: 240, w: 640, h: 380},
  {x: 1130, y: 240, w: 640, h: 380},
];
const N_LOG_DOMAIN: [number, number] = [4, 13];
const N_TICKS = [4, 6, 8, 10, 12];
const FAN_Y: [number, number] = [0, 0.5];

export const S6V: React.FC = () => {
  const {rise, sweep} = useLines();
  const squares = 1 - rise(2);
  const fans = rise(2);
  const drawn = sweep(2, 0.1, 0.8);
  const fanSeries = [PRECOMPUTED.fans.random, PRECOMPUTED.fans.sobol];
  const logN = PRECOMPUTED.sampleSizes.map((n) => Math.log2(n));
  const i1024 = PRECOMPUTED.sampleSizes.indexOf(1024);
  const boot = PRECOMPUTED.bootstrap;
  return (
    <>
      <Canvas>
        {/* 点の並び */}
        <g opacity={squares}>
          {[UNIFORM_POINTS, SOBOL_POINTS].map((points, k) => {
            const x0 = SQUARE_XS[k];
            const rect = {x: x0, y: SQUARE_Y, w: SQUARE, h: SQUARE};
            const pixels: [number, number][] = points.map(([x, y]) => [x0 + x * SQUARE, SQUARE_Y + SQUARE - y * SQUARE]);
            return (
              <g key={k} opacity={rise(0, k * 8)}>
                <rect {...rect} width={SQUARE} height={SQUARE} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} rx={6} />
                <g opacity={rise(1)}>
                  {Array.from({length: GRID - 1}, (_, i) => (
                    <g key={i}>
                      <line x1={x0 + ((i + 1) * SQUARE) / GRID} x2={x0 + ((i + 1) * SQUARE) / GRID} y1={SQUARE_Y} y2={SQUARE_Y + SQUARE} stroke={COLOR.grid} strokeWidth={1} />
                      <line y1={SQUARE_Y + ((i + 1) * SQUARE) / GRID} y2={SQUARE_Y + ((i + 1) * SQUARE) / GRID} x1={x0} x2={x0 + SQUARE} stroke={COLOR.grid} strokeWidth={1} />
                    </g>
                  ))}
                </g>
                <Dots points={pixels} r={5} color={k === 0 ? COLOR.subText : B} opacity={0.9} />
                <SvgText x={x0 + SQUARE / 2} y={SQUARE_Y - 34} size={36} color={k === 0 ? COLOR.text : B} weight={800}>
                  {k === 0 ? '普通の乱数（256点）' : 'Sobol列（256点）'}
                </SvgText>
                <SvgText x={x0 + SQUARE / 2} y={SQUARE_Y + SQUARE + 40} size={32} color={H} weight={700} opacity={rise(1)}>
                  {`点のないマス ${EMPTY[k]} / ${GRID * GRID}`}
                </SvgText>
              </g>
            );
          })}
        </g>
        {/* 推定の収束（20回ずつ） */}
        <g opacity={fans}>
          {FAN_RECTS.map((rect, k) => {
            const sx = makeScale(N_LOG_DOMAIN[0], N_LOG_DOMAIN[1], rect.x, rect.x + rect.w);
            const sy = makeScale(FAN_Y[0], FAN_Y[1], rect.y + rect.h, rect.y);
            const shown = Math.max(2, Math.ceil(drawn * logN.length));
            const color = k === 0 ? COLOR.subText : B;
            return (
              <g key={k}>
                <PlotFrame
                  rect={rect}
                  xDomain={N_LOG_DOMAIN}
                  yDomain={FAN_Y}
                  xTicks={N_TICKS}
                  yTicks={[0, 0.2, 0.4]}
                  format={(v) => (v >= 4 && Number.isInteger(v) && v !== 0 ? String(2 ** v) : String(v))}
                  xLabel="N（対数目盛り）"
                  yLabel={k === 0 ? 'X₃ の総合効果' : undefined}
                  title={k === 0 ? '普通の乱数' : 'Sobol列'}
                  titleColor={k === 0 ? COLOR.text : B}
                />
                <line x1={rect.x} x2={rect.x + rect.w} y1={sy(PRECOMPUTED.truth)} y2={sy(PRECOMPUTED.truth)} stroke={COLOR.text} strokeWidth={3} strokeDasharray="10 8" />
                {fanSeries[k].map((series, r) => (
                  <path
                    key={r}
                    d={series
                      .slice(0, shown)
                      .map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(logN[i]).toFixed(1)} ${sy(Math.min(0.5, Math.max(0, v))).toFixed(1)}`)
                      .join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    opacity={0.55}
                  />
                ))}
                <SvgText x={rect.x + rect.w - 12} y={sy(PRECOMPUTED.truth) - 22} anchor="end" size={26} color={COLOR.text}>
                  {`正確な値 ${format2(PRECOMPUTED.truth)}`}
                </SvgText>
                <g opacity={rise(3)}>
                  <line x1={sx(10)} x2={sx(10)} y1={rect.y} y2={rect.y + rect.h} stroke={H} strokeWidth={3} />
                  <SvgText x={sx(10) + 10} y={rect.y + 30} anchor="start" size={28} color={H} weight={700}>
                    {`誤差 ${(k === 0 ? PRECOMPUTED.rmse.random : PRECOMPUTED.rmse.sobol)[i1024].toFixed(3)}`}
                  </SvgText>
                </g>
              </g>
            );
          })}
        </g>
      </Canvas>
      <Box x={SIZE.sideMargin} y={700} w={1740}>
        <Reveal line={4}>
          <Card accent={O} style={{padding: '16px 34px', display: 'flex', alignItems: 'center', gap: 40}}>
            <Label color={COLOR.text} size={32}>
              N = {boot.n}（Sobol列）
              <br />
              95% 信頼区間
            </Label>
            <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.6}}>
              X₃ の総合効果 {format2(boot.totalEffect[2])}
              <span style={{color: COLOR.subText}}>
                {' '}
                ［{format2(boot.totalEffectInterval[2][0])}, {format2(boot.totalEffectInterval[2][1])}］
              </span>
              <br />
              X₃ の一次効果 <span style={{color: H}}>{boot.first[2].toFixed(3).replace('-', '−')}</span>
              <span style={{color: COLOR.subText}}>
                {' '}
                ［{format2(boot.firstInterval[2][0])}, {format2(boot.firstInterval[2][1])}］
              </span>
            </div>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 第7章 ----
const STEPS = [
  '入力と、ばらつきの範囲・分布を決める',
  'Sobol列で A・B と入れかえた行列を作る',
  'すべての組でモデルを計算する',
  '一次効果・総合効果を信頼区間つきで求める',
  '小さい入力を固定し、差から交互作用を調べる',
];

const CODE = `from SALib.sample import sobol as sampler
from SALib.analyze import sobol

problem = {"num_vars": 3,
           "names": ["x1", "x2", "x3"],
           "bounds": [[-3.14, 3.14]] * 3}
X = sampler.sample(problem, 1024)
Y = model(X)            # モデルを計算
Si = sobol.analyze(problem, Y)
print(Si["S1"], Si["ST"])`;

export const S7T: React.FC = () => (
  <>
    {STEPS.map((step, index) => (
      <Box key={step} x={SIZE.sideMargin} y={180 + index * 128} w={900}>
        <Reveal line={index + 1}>
          <Card accent={index === 0 ? H : COLOR.blue} style={{height: 112, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px'}}>
            <NumberBadge color={index === 0 ? H : B} size={54}>
              {index + 1}
            </NumberBadge>
            <div style={{fontSize: 36, fontWeight: 700, whiteSpace: 'nowrap'}}>{step}</div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1050} y={180} w={780}>
      <Reveal line={6}>
        <Card accent={A} style={{height: 200}}>
          <div style={{fontSize: 36, fontWeight: 800}}>計算が重いときは代わりのモデル</div>
          <Label style={{marginTop: 12}} size={31}>
            少ない計算でガウス過程回帰などを作り、
            <br />
            その上で感度解析をする
          </Label>
        </Card>
      </Reveal>
      <Reveal line={7}>
        <Card accent={O} style={{marginTop: 22, padding: '18px 26px'}}>
          <Label color={O} size={30}>
            Python のライブラリ SALib
          </Label>
          <pre
            style={{
              margin: '10px 0 0',
              fontFamily: 'Menlo, Monaco, monospace',
              fontSize: 22,
              lineHeight: 1.45,
              color: COLOR.text,
              whiteSpace: 'pre',
            }}
          >
            {CODE}
          </pre>
        </Card>
      </Reveal>
    </Box>
  </>
);

// 図解：一次効果と総合効果の散布図で読む
const READ_RECT = {x: 280, y: 205, w: 560, h: 560};
const READ_DOMAIN: [number, number] = [0, 0.8];
const SIX_NAMES = ['X₁', 'X₂', 'X₃', 'X₄', 'X₅', 'X₆'];

export const S7V: React.FC = () => {
  const {rise} = useLines();
  const sx = makeScale(0, 0.8, READ_RECT.x, READ_RECT.x + READ_RECT.w);
  const sy = makeScale(0, 0.8, READ_RECT.y + READ_RECT.h, READ_RECT.y);
  // 行ごとに注目する入力
  const focus = (i: number) => (i === 1 ? rise(1) : i === 0 || i === 2 ? rise(2) : rise(3));
  const dimOthers = rise(1) * (1 - rise(4));
  const fixedShare = SIX.totalEffect[3] + SIX.totalEffect[4] + SIX.totalEffect[5];
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame
            rect={READ_RECT}
            xDomain={READ_DOMAIN}
            yDomain={READ_DOMAIN}
            xTicks={[0, 0.2, 0.4, 0.6, 0.8]}
            yTicks={[0, 0.2, 0.4, 0.6, 0.8]}
            format={(v) => v.toFixed(1)}
            xLabel="一次効果"
            yLabel="総合効果"
          />
          <line x1={sx(0)} y1={sy(0)} x2={sx(0.8)} y2={sy(0.8)} stroke={COLOR.muted} strokeWidth={3} strokeDasharray="10 8" />
          <SvgText x={sx(0.66)} y={sy(0.74)} size={26} color={COLOR.muted} rotate={-45}>
            対角線（交互作用なし）
          </SvgText>
          {/* 原点のまわり：固定の候補 */}
          <circle cx={sx(0)} cy={sy(0)} r={70} fill={H} opacity={0.12 + 0.18 * rise(3)} />
          {SIX.first.map((first, i) => {
            const total = SIX.totalEffect[i];
            const active = focus(i);
            const opacity = 1 - dimOthers * 0.7 * (1 - active);
            const color = i === 1 ? O : i === 0 || i === 2 ? A : H;
            return (
              <g key={i} opacity={opacity}>
                {total - first > 0.02 ? (
                  <line x1={sx(first)} x2={sx(first)} y1={sy(first)} y2={sy(total)} stroke={A} strokeWidth={4} strokeDasharray="6 5" opacity={rise(2)} />
                ) : null}
                <circle cx={sx(first)} cy={sy(total)} r={14} fill={color} stroke={COLOR.backgroundDeep} strokeWidth={3} />
                {i < 3 ? (
                  <SvgText x={sx(first) + 26} y={sy(total)} anchor="start" size={32} color={COLOR.text} weight={800}>
                    {SIX_NAMES[i]}
                  </SvgText>
                ) : null}
              </g>
            );
          })}
          <SvgText x={sx(0) + 92} y={sy(0) - 40} anchor="start" size={30} color={H} weight={800}>
            X₄〜X₆
          </SvgText>
        </g>
      </Canvas>
      <Box x={1000} y={210} w={830}>
        <Reveal line={0}>
          <Card accent={COLOR.muted} style={{padding: '16px 28px'}}>
            <Label>入力が6つのモデル（どれも −1〜1 で均等）</Label>
            <div style={{marginTop: 8}}>
              <Tex tex={raw`Y = 2X_1 + 1.5X_2 + 3X_1X_3 + 0.3X_4 + 0.1X_5 + 0.1X_6`} size={29} />
            </div>
          </Card>
        </Reveal>
        <Reveal line={1}>
          <Card accent={O} style={{marginTop: 18, padding: '14px 28px'}}>
            <div style={{fontSize: 34, fontWeight: 700}}>対角線の上：X₂ は単独で効く</div>
          </Card>
        </Reveal>
        <Reveal line={2}>
          <Card accent={A} style={{marginTop: 18, padding: '14px 28px'}}>
            <div style={{fontSize: 34, fontWeight: 700}}>対角線より上：X₁・X₃ は交互作用あり</div>
            <Label style={{marginTop: 4}} size={30}>
              X₃ は一次効果 0、X₁ との組み合わせだけで効く
            </Label>
          </Card>
        </Reveal>
        <Reveal line={3}>
          <Card accent={H} style={{marginTop: 18, padding: '14px 28px'}}>
            <div style={{fontSize: 34, fontWeight: 700}}>原点の近く：X₄〜X₆ は固定の候補</div>
          </Card>
        </Reveal>
        <Reveal line={4}>
          <div style={{marginTop: 22, fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLOR.text, whiteSpace: 'nowrap'}}>
            固定して失う分散 約 <span style={{color: H}}>{Math.round(fixedShare * 100)}%</span> → 入力は 6 → 3
          </div>
        </Reveal>
      </Box>
    </>
  );
};

// ---- まとめ ----
const SUMMARY = [
  {title: '出力の分散を、入力ごと・組み合わせごとに分ける', color: COLOR.subText},
  {title: '一次効果：その入力だけで説明できる割合', color: B},
  {title: '総合効果：交互作用も含めて、その入力が関わる割合', color: O},
  {title: '差 ＝ 交互作用、総合効果が小さい入力は固定', color: A},
  {title: '行列の列の入れかえで推定、Sobol列と信頼区間', color: H},
];

export const S8A: React.FC = () => (
  <>
    {SUMMARY.map((item, index) => (
      <Box key={item.title} x={SIZE.sideMargin} y={180 + index * 136} w={1150}>
        <Reveal line={index + 1}>
          <Card accent={item.color} style={{height: 120, display: 'flex', alignItems: 'center', padding: '0 30px'}}>
            <div style={{fontSize: 37, fontWeight: 700, whiteSpace: 'nowrap'}}>{item.title}</div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1330} y={180} w={500}>
      <Reveal line={5}>
        <Card accent={COLOR.muted} style={{height: 660, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <div style={{fontSize: 46, fontWeight: 800, lineHeight: 1.5, whiteSpace: 'nowrap'}}>
            ご視聴
            <br />
            ありがとう
            <br />
            ございました
          </div>
          <Label style={{marginTop: 40}} size={28}>
            音声：{VOICE_CREDIT}
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

export const S8B: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={170} w={1740}>
      <Reveal line={0}>
        <Card accent={COLOR.muted} style={{padding: '24px 36px'}}>
          {REFERENCES.map((reference) => (
            <div key={reference} style={{fontSize: 26, lineHeight: 1.45, color: COLOR.subText, marginTop: 10}}>
              {reference}
            </div>
          ))}
          <div style={{fontSize: 28, color: COLOR.text, marginTop: 26, fontWeight: 600}}>音声：{VOICE_CREDIT}</div>
        </Card>
      </Reveal>
    </Box>
  </>
);
