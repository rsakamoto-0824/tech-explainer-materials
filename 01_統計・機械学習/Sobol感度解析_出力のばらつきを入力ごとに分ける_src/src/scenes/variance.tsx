// 第2章（分散で測る一次効果）と第3章（分散分解）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, SCATTER} from '../lib/data.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {ISHIGAMI_PARTS} from './intro.tsx';
import {Chip, format2, formatPi, INPUT_COLORS, PI_DOMAIN, PI_TICKS, toPixels} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

// 式と説明を横に並べる行
const FormulaRow: React.FC<{line: number; tex: string; note: string; size?: number; noteColor?: string}> = ({
  line,
  tex,
  note,
  size = 44,
  noteColor = COLOR.subText,
}) => (
  <Reveal line={line}>
    <div style={{display: 'flex', alignItems: 'center', gap: 30, height: 140}}>
      <div style={{width: 400}}>
        <Tex tex={tex} size={size} color={COLOR.text} />
      </div>
      <Label color={noteColor} size={30}>
        {note}
      </Label>
    </div>
  </Reveal>
);

export const S2T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={175} w={900}>
      <FormulaRow line={0} tex={raw`V = \mathrm{Var}(Y)`} note="全体のばらつき" />
      <FormulaRow line={1} tex={raw`E[\,Y \mid X_i\,]`} note="Xᵢ を固定したときの Y の平均" />
      <FormulaRow line={2} tex={raw`\mathrm{Var}_{X_i}\big(E[\,Y \mid X_i\,]\big)`} note="Xᵢ だけで説明できるばらつき" />
      <Reveal line={3}>
        <Card accent={B} style={{marginTop: 10, display: 'flex', alignItems: 'center', gap: 40, height: 175, width: 880}}>
          <Tex tex={raw`S_i = \dfrac{\mathrm{Var}_{X_i}\big(E[\,Y \mid X_i\,]\big)}{\mathrm{Var}(Y)}`} size={48} />
          <div>
            <div style={{fontSize: 38, fontWeight: 800, color: B}}>一次効果</div>
            <Label>0 ≦ Sᵢ ≦ 1</Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={1030} y={175} w={800}>
      <Reveal line={4}>
        <Card accent={O} style={{height: 230}}>
          <Label>例</Label>
          <div style={{marginTop: 4}}>
            <Tex tex={raw`Y = \textcolor{${B}}{2}X_1 + \textcolor{${O}}{1}\,X_2`} size={42} />
          </div>
          <div style={{marginTop: 14}}>
            <Tex tex={raw`S_1 = \tfrac{\textcolor{${B}}{2}^2}{2^2 + 1^2} = 0.8,\quad S_2 = 0.2`} size={38} />
          </div>
        </Card>
      </Reveal>
      <Reveal line={5}>
        <Card accent={COLOR.muted} style={{marginTop: 22, height: 190}}>
          <Label>全分散の公式</Label>
          <div style={{marginTop: 12}}>
            <Tex
              tex={raw`\mathrm{Var}(Y) = \underbrace{\mathrm{Var}\big(E[Y\mid X_i]\big)}_{X_i\text{ で説明}} + \underbrace{E\big[\mathrm{Var}(Y\mid X_i)\big]}_{\text{残り}}`}
              size={30}
            />
          </div>
        </Card>
      </Reveal>
      <Reveal line={6}>
        <Card accent={H} style={{marginTop: 22, height: 200}}>
          <Tex tex={raw`S_i = 1 - \dfrac{E\big[\mathrm{Var}(Y\mid X_i)\big]}{\mathrm{Var}(Y)}`} size={34} />
          <Label color={H} style={{marginTop: 6}}>
            Xᵢ が分かると、ばらつきが平均で何割減るか
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

// ---- 図解：石上関数の散布図 ----
const Y_DOMAIN: [number, number] = [-12, 19];
const Y_TICKS = [-10, 0, 10];
const PANEL_W = 450;
const PANEL_H = 400;
const PANEL_Y = 300;
const PANEL_XS = [200, 790, 1380];
const COLUMNS = [0, 1, 2].map((i) => SCATTER.xs.map((x) => x[i]));
const NAMES = ['X₁', 'X₂', 'X₃'];

export const ISHIGAMI_TEX = raw`Y = \textcolor{${B}}{\sin X_1} + \textcolor{${O}}{7\sin^2 X_2} + \textcolor{${A}}{0.1\,X_3^4 \sin X_1}`;

export const S2V: React.FC = () => {
  const {rise, sweep} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={1740}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <Label color={COLOR.text} size={36}>
              石上関数
            </Label>
            <Tex tex={ISHIGAMI_TEX} size={42} color={COLOR.text} />
            <Label>X₁, X₂, X₃ は −π〜π で均等</Label>
          </div>
        </Reveal>
      </Box>
      <Canvas>
        {[0, 1, 2].map((i) => {
          const rect = {x: PANEL_XS[i], y: PANEL_Y, w: PANEL_W, h: PANEL_H};
          const sx = makeScale(-Math.PI, Math.PI, rect.x, rect.x + rect.w);
          const sy = makeScale(Y_DOMAIN[0], Y_DOMAIN[1], rect.y + rect.h, rect.y);
          const bins = SCATTER.perInput[i].bins;
          const drawn = sweep(2, 0.05, 0.75);
          const shown = Math.max(2, Math.round(drawn * bins.length));
          const linePath = bins
            .slice(0, shown)
            .map((b, k) => `${k === 0 ? 'M' : 'L'}${sx(b.center).toFixed(1)} ${sy(b.mean).toFixed(1)}`)
            .join(' ');
          const focusX3 = i === 2 ? rise(4) : 0;
          return (
            <g key={i} opacity={rise(1, i * 6)}>
              <PlotFrame
                rect={rect}
                xDomain={PI_DOMAIN}
                yDomain={Y_DOMAIN}
                xTicks={PI_TICKS}
                yTicks={Y_TICKS}
                xLabel={NAMES[i]}
                yLabel={i === 0 ? 'Y' : undefined}
                format={(v) => (Math.abs(v) > 3 && Math.abs(v) < 3.2 ? formatPi(v) : String(v).replace('-', '−'))}
              />
              <Dots points={toPixels(rect, PI_DOMAIN, Y_DOMAIN, COLUMNS[i], SCATTER.ys)} r={3} color={INPUT_COLORS[i]} opacity={0.45} />
              <path d={linePath} fill="none" stroke={H} strokeWidth={6} strokeLinejoin="round" opacity={rise(2)} />
              {/* X3 の両端の広がり */}
              {i === 2 ? (
                <g opacity={rise(5)}>
                  {[-1, 1].map((side) => (
                    <g key={side}>
                      <line
                        x1={sx(side * 2.85)}
                        x2={sx(side * 2.85)}
                        y1={sy(16)}
                        y2={sy(-9)}
                        stroke={COLOR.text}
                        strokeWidth={4}
                        strokeDasharray="8 6"
                      />
                    </g>
                  ))}
                  <SvgText x={rect.x + rect.w / 2} y={sy(16.5)} size={28} color={COLOR.text} weight={700}>
                    両端で広がる
                  </SvgText>
                </g>
              ) : null}
              <rect x={rect.x - 6} y={rect.y - 6} width={rect.w + 12} height={rect.h + 12} rx={10} fill="none" stroke={H} strokeWidth={4} opacity={focusX3} />
            </g>
          );
        })}
      </Canvas>
      {[0, 1, 2].map((i) => (
        <Box key={i} x={PANEL_XS[i] - 20} y={790} w={PANEL_W + 40}>
          <Reveal line={i === 2 ? 4 : 3} delay={i === 1 ? 8 : 0}>
            <div style={{textAlign: 'center', fontFamily: FONT, color: COLOR.text, fontSize: 34, fontWeight: 700, whiteSpace: 'nowrap'}}>
              区間平均 <span style={{color: H}}>{format2(SCATTER.perInput[i].firstEstimate)}</span>
              <span style={{color: COLOR.subText, fontSize: 30, marginLeft: 24}}>正確な値 {format2(ISHIGAMI.first[i])}</span>
            </div>
          </Reveal>
        </Box>
      ))}
      <Box x={PANEL_XS[0]} y={248} w={1600}>
        <Reveal line={2}>
          <Label color={H} size={30}>
            ── 区間ごとの Y の平均（条件付き期待値の形）
          </Label>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 第3章 ----

export const S3T: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={175} w={1740}>
        <Reveal line={0}>
          <div style={{textAlign: 'center'}}>
            <Tex
              tex={raw`f(X) = \textcolor{${COLOR.subText}}{f_0} + \textcolor{${B}}{\sum_i f_i(X_i)} + \textcolor{${A}}{\sum_{i<j} f_{ij}(X_i, X_j)} + \cdots + f_{12\cdots d}(X_1,\ldots,X_d)`}
              size={45}
              color={COLOR.text}
            />
          </div>
        </Reveal>
        <Reveal line={1}>
          <div style={{display: 'flex', justifyContent: 'center', gap: 40, marginTop: 18}}>
            <Chip color={COLOR.subText}>f₀：全体の平均</Chip>
            <Chip color={B}>fᵢ：Xᵢ だけによる部分</Chip>
            <Chip color={A}>fᵢⱼ：2つの組み合わせ＝交互作用</Chip>
          </div>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={400} w={840}>
        <Reveal line={2}>
          <Card accent={COLOR.muted} style={{height: 450}}>
            <Label>各項の作り方</Label>
            <div style={{marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14}}>
              <Tex tex={raw`f_0 = E[Y]`} size={38} />
              <Tex tex={raw`f_i = E[Y\mid X_i] - f_0`} size={38} />
              <Tex tex={raw`f_{ij} = E[Y\mid X_i, X_j] - f_i - f_j - f_0`} size={38} />
            </div>
            <Label color={COLOR.highlight} style={{marginTop: 26}} size={34}>
              → どの項も平均 0、互いに無相関
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={990} y={400} w={840}>
        <Reveal line={3}>
          <Card accent={B} style={{height: 210}}>
            <Label>分散分解</Label>
            <div style={{marginTop: 14}}>
              <Tex tex={raw`V = \sum_i V_i + \sum_{i<j} V_{ij} + \cdots + V_{12\cdots d}`} size={40} />
            </div>
          </Card>
        </Reveal>
        <Reveal line={4}>
          <Card accent={A} style={{marginTop: 24, height: 216}}>
            <Tex tex={raw`1 = \sum_i S_i + \sum_{i<j} S_{ij} + \cdots`} size={40} />
            <div style={{marginTop: 18, display: 'flex', gap: 30, alignItems: 'center', opacity: rise(5)}}>
              <Label color={COLOR.text}>項の数</Label>
              <Tex tex={raw`2^d - 1`} size={38} color={COLOR.warning} />
              <Label>d = 10 なら 1023 個</Label>
            </div>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// 図解：分散の内訳の帯
const BAR_X = 160;
const BAR_W = 1600;
const BAR_H = 110;

const StackedBar: React.FC<{y: number; parts: {label: string; share: number; color: string; line: number}[]; title: string; opacity?: number}> = ({
  y,
  parts,
  title,
  opacity = 1,
}) => {
  const {rise} = useLines();
  let cursor = 0;
  return (
    <g opacity={opacity}>
      <SvgText x={BAR_X} y={y - 34} anchor="start" size={SIZE.small} color={COLOR.text} weight={700}>
        {title}
      </SvgText>
      <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} rx={10} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} />
      {parts.map((part) => {
        const x = BAR_X + cursor * BAR_W;
        const w = part.share * BAR_W;
        cursor += part.share;
        const grow = rise(part.line, 0, 24);
        return (
          <g key={part.label} opacity={grow}>
            <rect x={x + 3} y={y + 3} width={Math.max(0, w * grow - 6)} height={BAR_H - 6} rx={8} fill={part.color} />
            <SvgText x={x + w / 2} y={y + BAR_H / 2} size={44} color={COLOR.backgroundDeep} weight={800}>
              {`${Math.round(part.share * 100)}%`}
            </SvgText>
            <SvgText x={x + w / 2} y={y + BAR_H + 36} size={32} color={part.color} weight={700}>
              {part.label}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
};

const ZERO_TERMS = ['X₃だけ', 'X₁とX₂', 'X₂とX₃', 'X₁とX₂とX₃'];

export const S3V: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={1740}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <Tex tex={ISHIGAMI_TEX} size={42} color={COLOR.text} />
            <Label>分散 V = {ISHIGAMI.total.toFixed(2)}（式から正確に計算）</Label>
          </div>
        </Reveal>
      </Box>
      <Canvas>
        <StackedBar
          y={330}
          title="石上関数の分散の内訳"
          opacity={rise(0)}
          parts={ISHIGAMI_PARTS.map((part, index) => ({...part, line: index < 2 ? 1 : 2}))}
        />
        <StackedBar
          y={660}
          title="Y = X₁ × X₂ の分散の内訳"
          opacity={rise(4)}
          parts={[{label: 'X₁とX₂の交互作用（一次効果はどちらも 0）', share: 1, color: COLOR.aqua, line: 4}]}
        />
      </Canvas>
      <Box x={BAR_X} y={515} w={BAR_W}>
        <Reveal line={3}>
          <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
            <Label color={COLOR.text}>ゼロの項：</Label>
            {ZERO_TERMS.map((term) => (
              <Chip key={term} color={COLOR.muted} size={30}>
                {term} ＝ 0
              </Chip>
            ))}
          </div>
        </Reveal>
      </Box>
    </>
  );
};
