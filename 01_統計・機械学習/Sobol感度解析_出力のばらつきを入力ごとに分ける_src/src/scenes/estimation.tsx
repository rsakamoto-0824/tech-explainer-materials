// 第4章（総合効果と交互作用）と第5章（推定のしかた）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, MATRICES, MATRIX_ROWS} from '../lib/data.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {format2, mixColor} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

// 入力が3つのときの、分散分解の7つの項
const TERMS = [['1'], ['2'], ['3'], ['1', '2'], ['1', '3'], ['2', '3'], ['1', '2', '3']];
const SUBSCRIPT: Record<string, string> = {'1': '₁', '2': '₂', '3': '₃'};
const termLabel = (term: string[]) => `S${term.map((t) => SUBSCRIPT[t]).join('')}`;

export const S4T: React.FC = () => {
  const {rise} = useLines();
  const highlight = rise(0, 10);
  return (
    <>
      <Box x={SIZE.sideMargin} y={175} w={1000}>
        <Reveal line={0}>
          <Card accent={A} style={{height: 170}}>
            <Tex tex={raw`S_{Ti} = S_i + \sum_{j \ne i} S_{ij} + \sum_{j<k} S_{ijk} + \cdots`} size={44} />
            <Label style={{marginTop: 10}}>Xᵢ が関わるすべての項の合計</Label>
          </Card>
        </Reveal>
        <Reveal line={1}>
          <div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 26}}>
            <Tex tex={raw`X_{\sim i}`} size={46} color={COLOR.text} />
            <Label color={COLOR.text}>：Xᵢ 以外のすべての入力 → 固定する</Label>
          </div>
        </Reveal>
        <Reveal line={2}>
          <Card accent={O} style={{marginTop: 24, height: 200, display: 'flex', alignItems: 'center'}}>
            <Tex
              tex={raw`S_{Ti} = \dfrac{E\big[\mathrm{Var}(Y \mid X_{\sim i})\big]}{\mathrm{Var}(Y)} = 1 - \dfrac{\mathrm{Var}\big(E[Y \mid X_{\sim i}]\big)}{\mathrm{Var}(Y)}`}
              size={36}
            />
          </Card>
        </Reveal>
      </Box>
      <Box x={1170} y={175} w={660}>
        <Reveal line={0}>
          <Card accent={COLOR.muted} style={{height: 380}}>
            <Label>入力が3つのとき（i = 1）</Label>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 18}}>
              {TERMS.map((term) => {
                const inTotal = term.includes('1');
                const isFirst = term.length === 1 && term[0] === '1';
                const color = isFirst ? B : inTotal ? A : COLOR.panelLine;
                return (
                  <div
                    key={term.join('')}
                    style={{
                      fontFamily: FONT,
                      fontSize: 38,
                      fontWeight: 800,
                      padding: '10px 22px',
                      borderRadius: 12,
                      border: `3px solid ${inTotal ? mixColor(COLOR.panelLine, color, highlight) : COLOR.panelLine}`,
                      color: inTotal ? COLOR.text : COLOR.muted,
                      backgroundColor: isFirst ? `rgba(74, 148, 238, ${0.25 * highlight})` : 'transparent',
                    }}
                  >
                    {termLabel(term)}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop: 26, opacity: highlight}}>
              <Label color={B} size={32}>
                ■ 一次効果 <Tex tex="S_1" size={34} />
              </Label>
              <Label color={A} size={32} style={{marginTop: 6}}>
                ■ 総合効果 <Tex tex="S_{T1}" size={34} /> ＝ 縁取りの4つの合計
              </Label>
            </div>
          </Card>
        </Reveal>
      </Box>
      <Box x={1170} y={585} w={660}>
        <Reveal line={3}>
          <Card accent={H} style={{height: 125, padding: '18px 30px'}}>
            <div style={{fontSize: 36, fontWeight: 800}}>
              <Tex tex={raw`S_{Ti} \approx 0`} size={38} /> → 定数に固定してよい
            </div>
            <Label style={{marginTop: 4}}>入力を絞りこむ根拠</Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={745} w={1740}>
        <Reveal line={4}>
          <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
            <Tex tex={raw`S_{Ti} - S_i`} size={46} color={A} />
            <Label color={COLOR.text} size={38}>
              ＝ Xᵢ が関わる交互作用の大きさ
            </Label>
          </div>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 図解：一次効果と総合効果の棒グラフ ----
const CHART = {x: 240, y: 230, w: 900, h: 540};
const GROUP_W = CHART.w / 3;
const BAR_W = 120;

export const S4V: React.FC = () => {
  const {rise} = useLines();
  const sy = makeScale(0, 0.7, CHART.y + CHART.h, CHART.y);
  const grow = rise(0, 6, 30);
  const focus = [rise(2), rise(1), rise(3)];
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame rect={CHART} xDomain={[0, 3]} yDomain={[0, 0.7]} yTicks={[0, 0.2, 0.4, 0.6]} format={(v) => v.toFixed(1)} yLabel="感度指数" />
          {[0, 1, 2].map((i) => {
            const cx = CHART.x + GROUP_W * (i + 0.5);
            const first = ISHIGAMI.first[i];
            const total = ISHIGAMI.totalEffect[i];
            const gapVisible = focus[i] * (total - first > 0.01 ? 1 : 0);
            return (
              <g key={i}>
                <rect x={cx - BAR_W - 8} y={sy(first * grow)} width={BAR_W} height={sy(0) - sy(first * grow)} fill={B} rx={4} />
                <rect x={cx + 8} y={sy(total * grow)} width={BAR_W} height={sy(0) - sy(total * grow)} fill={O} rx={4} />
                <SvgText x={cx - BAR_W / 2 - 8} y={sy(first * grow) - 24} size={32} color={COLOR.text} weight={700}>
                  {format2(first)}
                </SvgText>
                <SvgText x={cx + BAR_W / 2 + 8} y={sy(total * grow) - 24} size={32} color={COLOR.text} weight={700}>
                  {format2(total)}
                </SvgText>
                <SvgText x={cx} y={CHART.y + CHART.h + 36} size={36} color={COLOR.text} weight={800}>
                  {`X${['₁', '₂', '₃'][i]}`}
                </SvgText>
                {/* 注目の枠 */}
                <rect
                  x={cx - BAR_W - 24}
                  y={CHART.y + 8}
                  width={BAR_W * 2 + 48}
                  height={CHART.h - 8}
                  rx={10}
                  fill="none"
                  stroke={H}
                  strokeWidth={4}
                  opacity={focus[i] * (1 - (i === 1 ? rise(2) : i === 0 ? rise(3) : rise(4)))}
                />
                {/* 交互作用の分（総合効果 − 一次効果） */}
                <g opacity={gapVisible}>
                  <rect x={cx + 8} y={sy(total)} width={BAR_W} height={sy(first) - sy(total)} fill="none" stroke={A} strokeWidth={5} strokeDasharray="10 6" />
                </g>
              </g>
            );
          })}
        </g>
      </Canvas>
      <Box x={1220} y={230} w={610}>
        <Reveal line={0}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            <Label color={B} size={36}>
              ■ 一次効果 <Tex tex="S_i" size={38} />
            </Label>
            <Label color={O} size={36}>
              ■ 総合効果 <Tex tex="S_{Ti}" size={38} />
            </Label>
          </div>
        </Reveal>
        <Reveal line={1}>
          <Card accent={O} style={{marginTop: 24, padding: '16px 26px'}}>
            <div style={{fontSize: 33, fontWeight: 700}}>X₂：同じ値 → 単独で効く</div>
          </Card>
        </Reveal>
        <Reveal line={2}>
          <Card accent={A} style={{marginTop: 16, padding: '16px 26px'}}>
            <div style={{fontSize: 33, fontWeight: 700}}>X₁：差 {format2(ISHIGAMI.s13)} は X₃ との交互作用</div>
          </Card>
        </Reveal>
        <Reveal line={3}>
          <Card accent={COLOR.warning} style={{marginTop: 16, padding: '16px 26px'}}>
            <div style={{fontSize: 33, fontWeight: 700}}>X₃：一次効果 0 でも効く</div>
          </Card>
        </Reveal>
        <Reveal line={4}>
          <Card accent={COLOR.muted} style={{marginTop: 16, padding: '16px 26px'}}>
            <div style={{fontSize: 33, fontWeight: 700}}>
              総合効果の合計 {format2(ISHIGAMI.totalEffect.reduce((s, v) => s + v, 0))} ＞ 1
            </div>
            <Label size={28} style={{marginTop: 4}}>
              交互作用を両方の入力で数えるため
            </Label>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 第5章：行列の模式図 ----
const SCHEMA_ROWS = 6;
const SCHEMA_COLS = 4;
const SCHEMA_CELL = 46;

const SchemaMatrix: React.FC<{x: number; y: number; name: string; columnColors: string[]; opacity?: number}> = ({x, y, name, columnColors, opacity = 1}) => (
  <g opacity={opacity}>
    {Array.from({length: SCHEMA_ROWS}, (_, r) =>
      columnColors.map((color, c) => (
        <rect
          key={`${r}-${c}`}
          x={x + c * SCHEMA_CELL}
          y={y + r * SCHEMA_CELL}
          width={SCHEMA_CELL - 4}
          height={SCHEMA_CELL - 4}
          rx={4}
          fill={color}
          opacity={0.75}
        />
      )),
    )}
    <SvgText x={x + (SCHEMA_COLS * SCHEMA_CELL) / 2} y={y + SCHEMA_ROWS * SCHEMA_CELL + 34} size={36} color={COLOR.text} weight={800}>
      {name}
    </SvgText>
  </g>
);

export const S5T: React.FC = () => {
  const {rise} = useLines();
  const top = 200;
  return (
    <>
      <Canvas>
        <SchemaMatrix x={170} y={top} name="A" columnColors={[B, B, B, B]} opacity={rise(1)} />
        <SchemaMatrix x={420} y={top} name="B" columnColors={[O, O, O, O]} opacity={rise(1, 6)} />
        <SchemaMatrix x={760} y={top} name="ABi" columnColors={[B, O, B, B]} opacity={rise(2)} />
        <g opacity={rise(1)}>
          <SvgText x={150} y={top + (SCHEMA_ROWS * SCHEMA_CELL) / 2} anchor="end" size={30}>
            N行
          </SvgText>
          <SvgText x={170 + (SCHEMA_COLS * SCHEMA_CELL) / 2} y={top - 26} size={28}>
            d列（入力）
          </SvgText>
        </g>
        <g opacity={rise(2)}>
          <rect x={760 + SCHEMA_CELL - 3} y={top - 8} width={SCHEMA_CELL + 2} height={SCHEMA_ROWS * SCHEMA_CELL + 12} fill="none" stroke={H} strokeWidth={4} rx={6} />
          <SvgText x={760 + SCHEMA_CELL * 1.5} y={top - 26} size={28} color={H} weight={700}>
            i 列目だけ B
          </SvgText>
        </g>
      </Canvas>
      <Box x={1080} y={185} w={750}>
        <Reveal line={3}>
          <Card accent={COLOR.muted} style={{height: 300}}>
            <div style={{fontSize: 36, fontWeight: 700, lineHeight: 1.7}}>
              <span style={{color: B}}>A</span> と <span style={{color: H}}>ABi</span>：Xᵢ だけが違う
              <br />
              <span style={{color: O}}>B</span> と <span style={{color: H}}>ABi</span>：Xᵢ だけが同じ
            </div>
            <Label style={{marginTop: 10}}>この関係から、指数を推定する</Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={545} w={1110}>
        <Reveal line={4}>
          <Card accent={B} style={{height: 140, display: 'flex', alignItems: 'center', gap: 26, padding: '16px 30px'}}>
            <Label color={B} size={32}>
              一次効果
              <br />
              Saltelli
            </Label>
            <Tex tex={raw`S_i \approx \frac{1}{NV}\sum_{j=1}^{N} f(B)_j \big(f(A_B^{(i)})_j - f(A)_j\big)`} size={38} />
          </Card>
        </Reveal>
        <Reveal line={4} delay={20}>
          <Card accent={O} style={{marginTop: 18, height: 140, display: 'flex', alignItems: 'center', gap: 26, padding: '16px 30px'}}>
            <Label color={O} size={32}>
              総合効果
              <br />
              Jansen
            </Label>
            <Tex tex={raw`S_{Ti} \approx \frac{1}{2NV}\sum_{j=1}^{N} \big(f(A)_j - f(A_B^{(i)})_j\big)^2`} size={38} />
          </Card>
        </Reveal>
      </Box>
      <Box x={1250} y={545} w={580}>
        <Reveal line={5}>
          <Card accent={H} style={{height: 298}}>
            <Label>モデルの計算回数</Label>
            <div style={{marginTop: 10}}>
              <Tex tex={raw`N \times (d + 2)`} size={52} color={H} />
            </div>
            <div style={{marginTop: 18, fontSize: 32, fontWeight: 600, lineHeight: 1.5}}>
              d = 10、N = 1000 なら
              <br />
              1000 × 12 ＝ <span style={{color: H, fontWeight: 800}}>12,000 回</span>
            </div>
          </Card>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={850} w={1100}>
        <Reveal line={4} delay={30}>
          <Label size={26}>V：f(A) と f(B) をあわせた分散。出力は平均を引いてから使う</Label>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 図解：8行の行列で列を入れかえる ----
const CELL_W = 58;
const CELL_H = 50;
const GRID_TOP = 260;
const BLOCK_XS = [110, 470, 830, 1190, 1550];
const NAMES = ['A', 'B', 'AB1', 'AB2', 'AB3'];

// 値（0〜1）を、色の濃さにする
const cellColor = (base: string, value: number) => mixColor(COLOR.backgroundDeep, base, 0.25 + 0.75 * value);

export const S5V: React.FC = () => {
  const {rise, sweep} = useLines();
  const slide = sweep(1, 0.1, 0.6);
  const outputs = rise(3);
  const compare = rise(4);
  // 出力が大きく変わった行（|f(AB3) − f(A)| が 3 より大きい）
  const changed = MATRICES.outA.map((v, j) => Math.abs(MATRICES.outAB3[j] - v) > 3);
  const blockOpacity = (index: number) =>
    index < 2 ? rise(0, index * 6) : index === 2 ? rise(1) : rise(2, (index - 3) * 8);
  return (
    <Canvas>
      {NAMES.map((name, index) => {
        const x0 = BLOCK_XS[index];
        const matrix = index === 0 ? MATRICES.unitA : index === 1 ? MATRICES.unitB : MATRICES.swapped(index - 2);
        const swappedColumn = index >= 2 ? index - 2 : -1;
        const dim = compare * (index === 0 || index === 4 ? 0 : 0.7);
        const out = index === 0 ? MATRICES.outA : index === 4 ? MATRICES.outAB3 : null;
        return (
          <g key={name} opacity={blockOpacity(index) * (1 - dim)}>
            {matrix.map((row, r) =>
              row.map((value, c) => {
                const fromB = index === 1 || c === swappedColumn;
                // AB1 の入れかわる列は、B の位置から滑ってくる
                const slideOffset = index === 2 && c === 0 ? (1 - slide) * (BLOCK_XS[1] - BLOCK_XS[2]) : 0;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={x0 + c * CELL_W + slideOffset}
                    y={GRID_TOP + r * CELL_H}
                    width={CELL_W - 5}
                    height={CELL_H - 5}
                    rx={5}
                    fill={cellColor(fromB ? O : B, value)}
                  />
                );
              }),
            )}
            {['X₁', 'X₂', 'X₃'].map((label, c) => (
              <SvgText key={label} x={x0 + c * CELL_W + CELL_W / 2 - 2} y={GRID_TOP - 24} size={26} color={c === swappedColumn ? H : COLOR.subText} weight={700}>
                {label}
              </SvgText>
            ))}
            <SvgText x={x0 + (3 * CELL_W) / 2} y={GRID_TOP + MATRIX_ROWS * CELL_H + 34} size={38} color={COLOR.text} weight={800}>
              {name}
            </SvgText>
            {/* 出力の列 */}
            <g opacity={outputs}>
              <SvgText x={x0 + 3 * CELL_W + 62} y={GRID_TOP - 24} size={26} color={H} weight={700}>
                f
              </SvgText>
              {out
                ? out.map((v, r) => (
                    <SvgText key={r} x={x0 + 3 * CELL_W + 62} y={GRID_TOP + r * CELL_H + CELL_H / 2 - 2} size={26} color={COLOR.text} weight={600}>
                      {v.toFixed(1)}
                    </SvgText>
                  ))
                : Array.from({length: MATRIX_ROWS}, (_, r) => (
                    <SvgText key={r} x={x0 + 3 * CELL_W + 62} y={GRID_TOP + r * CELL_H + CELL_H / 2 - 2} size={26} color={COLOR.muted}>
                      ・
                    </SvgText>
                  ))}
            </g>
          </g>
        );
      })}
      {/* A と AB3 で出力が大きく変わった行 */}
      <g opacity={compare}>
        {changed.map((isChanged, r) =>
          isChanged ? (
            <g key={r}>
              {[0, 4].map((index) => (
                <rect
                  key={index}
                  x={BLOCK_XS[index] - 8}
                  y={GRID_TOP + r * CELL_H - 4}
                  width={3 * CELL_W + 110}
                  height={CELL_H + 3}
                  rx={8}
                  fill="none"
                  stroke={H}
                  strokeWidth={4}
                />
              ))}
            </g>
          ) : null,
        )}
        <SvgText x={(BLOCK_XS[0] + BLOCK_XS[4]) / 2 + 150} y={GRID_TOP + MATRIX_ROWS * CELL_H + 100} size={34} color={H} weight={700}>
          X₃ だけが違うのに、出力が大きく変わる行がある
        </SvgText>
      </g>
      <g opacity={outputs * (1 - compare)}>
        <SvgText x={SIZE.width / 2} y={GRID_TOP + MATRIX_ROWS * CELL_H + 100} size={36} color={H} weight={700}>
          {`N 行の行列が5つ → モデルの計算は 5N 回`}
        </SvgText>
      </g>
      <g opacity={rise(0) * (1 - outputs)}>
        <SvgText x={SIZE.width / 2} y={GRID_TOP + MATRIX_ROWS * CELL_H + 100} size={30} color={COLOR.subText}>
          {`マスの色が濃いほど、入力の値が大きい（N = ${MATRIX_ROWS} の例）`}
        </SvgText>
      </g>
    </Canvas>
  );
};
