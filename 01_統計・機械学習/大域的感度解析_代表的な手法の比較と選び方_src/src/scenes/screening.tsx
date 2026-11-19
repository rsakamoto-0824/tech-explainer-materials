// 第2章（回帰と相関で測る）、第3章（Morris法でふるい分ける）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, makeScale, Marker, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {MORRIS_PICTURE, PRECOMPUTED, SCATTER} from '../lib/data.ts';
import {COLOR, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {Chip, format2, formatAxis, INPUT_COLORS, INPUT_NAMES, PI_DOMAIN, PI_TICKS, toPixels, Y_DOMAIN, Y_TICKS} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

// 単調な曲線と、山の形の曲線の小さな絵
const CurveIcon: React.FC<{path: string; ok: boolean}> = ({path, ok}) => (
  <svg width={150} height={100} style={{display: 'block'}}>
    <rect x={1} y={1} width={148} height={98} rx={8} fill={COLOR.backgroundDeep} stroke={COLOR.panelLine} strokeWidth={2} />
    <path d={path} fill="none" stroke={ok ? A : COLOR.warning} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

export const S2T: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={175} w={860}>
        <Card accent={B} style={{height: 450}}>
          <Reveal line={0}>
            <div style={{fontSize: 36, fontWeight: 800}}>直線の式を当てはめる</div>
            <div style={{marginTop: 14}}>
              <Tex tex={raw`Y \approx b_0 + b_1 X_1 + b_2 X_2 + \cdots`} size={40} />
            </div>
          </Reveal>
          <Reveal line={1}>
            <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 22}}>
              <div style={{fontSize: 34, fontWeight: 800, color: B, whiteSpace: 'nowrap'}}>標準化回帰係数</div>
              <Tex tex={raw`\mathrm{SRC}_i = b_i \dfrac{\sigma_{X_i}}{\sigma_Y}`} size={40} />
            </div>
            <Label style={{marginTop: 4}} size={28}>
              平均0・標準偏差1にそろえて回帰 → 入力どうしで比べられる
            </Label>
          </Reveal>
          <Reveal line={2}>
            <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 22}}>
              <Tex tex={raw`\textstyle\sum_i \mathrm{SRC}_i^2 = R^2`} size={40} color={H} />
              <Label size={28}>（入力が独立のとき）</Label>
            </div>
          </Reveal>
          <div style={{opacity: rise(3), marginTop: 14}}>
            <Label color={COLOR.warning} size={30}>
              ✕ R² が小さい → 直線が合っていない → 信用できない
            </Label>
          </div>
        </Card>
      </Box>
      <Box x={980} y={175} w={850}>
        <Reveal line={4}>
          <Card accent={O} style={{height: 450}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
              <div style={{fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap'}}>偏順位相関係数</div>
              <Chip color={O} size={30}>
                PRCC
              </Chip>
            </div>
            <Label style={{marginTop: 12}} color={COLOR.text}>
              順位に置きかえ、ほかの入力の影響を除いた相関
            </Label>
            <div style={{display: 'flex', gap: 40, marginTop: 30}}>
              <div style={{textAlign: 'center'}}>
                <CurveIcon path="M15 85 C 60 85, 70 20, 135 15" ok />
                <Label size={28} color={A} style={{marginTop: 6}}>
                  ○ 曲がっても単調
                </Label>
              </div>
              <div style={{textAlign: 'center'}}>
                <CurveIcon path="M15 85 C 45 85, 50 15, 75 15 C 100 15, 105 85, 135 85" ok={false} />
                <Label size={28} color={COLOR.warning} style={{marginTop: 6}}>
                  ✕ 上がって下がる
                </Label>
              </div>
            </div>
          </Card>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={660} w={1740}>
        <Reveal line={5}>
          <Card accent={COLOR.muted} style={{display: 'flex', alignItems: 'center', gap: 40, height: 150}}>
            <div style={{fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap'}}>計算回数：数百〜1000回</div>
            <Label color={COLOR.text}>入力の数によらない</Label>
            <Label color={H}>既存の実験データにも使える</Label>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 図解：回帰直線と R² ----
const REG_RECTS = [0, 1, 2].map((i) => ({x: 200 + i * 570, y: 255, w: 460, h: 300}));
const REG_PIXELS = [0, 1, 2].map((i) =>
  toPixels(
    REG_RECTS[i],
    PI_DOMAIN,
    Y_DOMAIN,
    SCATTER.xs.map((x) => x[i]),
    SCATTER.ys,
  ),
);
const REG = PRECOMPUTED.regression;

export const S2V: React.FC = () => {
  const {rise, sweep} = useLines();
  const draw = sweep(0, 0.2, 0.9);
  return (
    <>
      <Canvas>
        {REG_RECTS.map((rect, i) => {
          const sx = makeScale(PI_DOMAIN[0], PI_DOMAIN[1], rect.x, rect.x + rect.w);
          const sy = makeScale(Y_DOMAIN[0], Y_DOMAIN[1], rect.y + rect.h, rect.y);
          const {slope, intercept} = SCATTER.perInput[i];
          const x0 = -Math.PI;
          const x1 = -Math.PI + 2 * Math.PI * draw;
          const labelLine = i === 0 ? 1 : 2;
          return (
            <g key={i} opacity={rise(0, i * 5)}>
              <PlotFrame
                rect={rect}
                xDomain={PI_DOMAIN}
                yDomain={Y_DOMAIN}
                xTicks={PI_TICKS}
                yTicks={Y_TICKS}
                format={formatAxis}
                xLabel={INPUT_NAMES[i]}
                yLabel={i === 0 ? 'Y' : undefined}
              />
              <Dots points={REG_PIXELS[i]} r={3} color={INPUT_COLORS[i]} opacity={0.45} />
              <line x1={sx(x0)} y1={sy(intercept + slope * x0)} x2={sx(x1)} y2={sy(intercept + slope * x1)} stroke={H} strokeWidth={6} strokeLinecap="round" />
              <g opacity={rise(labelLine)}>
                <rect x={rect.x + rect.w / 2 - 130} y={rect.y - 62} width={260} height={50} rx={25} fill={COLOR.backgroundDeep} stroke={H} strokeWidth={2} />
                <SvgText x={rect.x + rect.w / 2} y={rect.y - 37} size={32} color={COLOR.text} weight={800}>
                  {`SRC = ${format2(REG.src[i])}`}
                </SvgText>
              </g>
            </g>
          );
        })}
      </Canvas>
      <Box x={SIZE.sideMargin} y={665} w={830}>
        <Reveal line={3}>
          <Card accent={H} style={{height: 200}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <div style={{fontSize: 38, fontWeight: 800, whiteSpace: 'nowrap'}}>{`決定係数 R² = ${format2(REG.r2)}`}</div>
              <Label color={COLOR.warning}>約2割しか説明できない</Label>
            </div>
            <svg width={740} height={46} style={{display: 'block', marginTop: 16}}>
              <rect x={0} y={6} width={740} height={34} rx={17} fill={COLOR.backgroundDeep} stroke={COLOR.panelLine} strokeWidth={2} />
              <rect x={0} y={6} width={740 * REG.r2 * rise(3, 6, 30)} height={34} rx={17} fill={H} />
            </svg>
            <Label style={{marginTop: 6, opacity: rise(5)}} color={H} size={30}>
              → R² を必ず確かめる。小さければ別の手法へ
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={980} y={665} w={850}>
        <Reveal line={4}>
          <Card accent={O} style={{height: 200}}>
            <div style={{fontSize: 36, fontWeight: 800}}>順位にした PRCC</div>
            <div style={{display: 'flex', gap: 18, marginTop: 18}}>
              {REG.prcc.map((value, i) => (
                <Chip key={i} color={INPUT_COLORS[i]} size={34}>
                  {`${INPUT_NAMES[i]}  ${format2(Math.abs(value) < 0.005 ? 0 : value)}`}
                </Chip>
              ))}
            </div>
            <Label style={{marginTop: 12}} size={28}>
              山の形（X₂）は、順位にしても拾えない
            </Label>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 第3章 ----
const GRID_RECT = {x: 170, y: 330, w: 460, h: 460};
const LEVELS = 4;
const levelPixel = (rect: {x: number; y: number; w: number; h: number}, u: number, v: number): [number, number] => [
  rect.x + u * rect.w,
  rect.y + rect.h - v * rect.h,
];

// 4段の格子の点
const LevelGrid: React.FC<{rect: {x: number; y: number; w: number; h: number}}> = ({rect}) => (
  <g>
    <rect x={rect.x - 30} y={rect.y - 30} width={rect.w + 60} height={rect.h + 60} rx={10} fill={COLOR.panel} stroke={COLOR.panelLine} strokeWidth={2} />
    {Array.from({length: LEVELS}, (_, i) => (
      <g key={i}>
        <line x1={rect.x} x2={rect.x + rect.w} y1={rect.y + (i * rect.h) / (LEVELS - 1)} y2={rect.y + (i * rect.h) / (LEVELS - 1)} stroke={COLOR.grid} strokeWidth={2} />
        <line y1={rect.y} y2={rect.y + rect.h} x1={rect.x + (i * rect.w) / (LEVELS - 1)} x2={rect.x + (i * rect.w) / (LEVELS - 1)} stroke={COLOR.grid} strokeWidth={2} />
      </g>
    ))}
    {Array.from({length: LEVELS}, (_, i) =>
      Array.from({length: LEVELS}, (_, j) => {
        const [px, py] = levelPixel(rect, i / (LEVELS - 1), j / (LEVELS - 1));
        return <circle key={`${i}-${j}`} cx={px} cy={py} r={7} fill={COLOR.muted} />;
      }),
    )}
  </g>
);

// 道のりを、進み具合 progress（0〜1）まで描く
const TrajectoryPath: React.FC<{points: number[][]; rect: {x: number; y: number; w: number; h: number}; color: string; progress: number}> = ({
  points,
  rect,
  color,
  progress,
}) => {
  const steps = points.length - 1;
  const shown = progress * steps;
  const pixels = points.map(([u, v]) => levelPixel(rect, u, v));
  const segments = [];
  for (let s = 0; s < steps; s++) {
    const part = Math.min(1, Math.max(0, shown - s));
    if (part <= 0) continue;
    const [ax, ay] = pixels[s];
    const [bx, by] = pixels[s + 1];
    segments.push(<line key={s} x1={ax} y1={ay} x2={ax + (bx - ax) * part} y2={ay + (by - ay) * part} stroke={color} strokeWidth={7} strokeLinecap="round" />);
  }
  return (
    <g opacity={progress > 0 ? 1 : 0}>
      {segments}
      <Marker x={pixels[0][0]} y={pixels[0][1]} r={13} color={color} />
    </g>
  );
};

export const S3T: React.FC = () => {
  const {rise, sweep} = useLines();
  const single = MORRIS_PICTURE[2].points;
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={1740}>
        <Reveal line={0}>
          <Card accent={H} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '16px 34px'}}>
            <div style={{fontSize: 38, fontWeight: 800, whiteSpace: 'nowrap'}}>Morris法</div>
            <Label color={COLOR.text}>少ない計算で、効かない入力をふるい落とす（Morris 1991）</Label>
          </Card>
        </Reveal>
      </Box>
      <Canvas>
        <g opacity={rise(1)}>
          <LevelGrid rect={GRID_RECT} />
          <TrajectoryPath points={single} rect={GRID_RECT} color={H} progress={sweep(1, 0.4, 0.95)} />
          <SvgText x={GRID_RECT.x + GRID_RECT.w / 2} y={GRID_RECT.y + GRID_RECT.h + 60} size={30} color={COLOR.text} weight={700}>
            4段の格子・幅 Δ = 2/3
          </SvgText>
          <SvgText x={GRID_RECT.x - 60} y={GRID_RECT.y + GRID_RECT.h / 2} size={30} color={COLOR.text}>
            X₂
          </SvgText>
          <SvgText x={GRID_RECT.x + GRID_RECT.w / 2} y={GRID_RECT.y - 55} size={30} color={COLOR.text}>
            X₁
          </SvgText>
        </g>
      </Canvas>
      <Box x={840} y={300} w={990}>
        <Reveal line={2}>
          <Card accent={H} style={{height: 175}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
              <div style={{fontSize: 34, fontWeight: 800, whiteSpace: 'nowrap'}}>要素効果</div>
              <Tex tex={raw`EE_i = \dfrac{f(\ldots, x_i + \Delta, \ldots) - f(\ldots, x_i, \ldots)}{\Delta}`} size={31} />
            </div>
            <Label size={28} style={{marginTop: 8}}>
              幅が大きく、始める点は範囲全体から選ぶ
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={840} y={495} w={990}>
        <Reveal line={3}>
          <Card accent={B} style={{height: 120, display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{fontSize: 34, fontWeight: 800, whiteSpace: 'nowrap'}}>道のり r 本</div>
            <Tex tex={raw`\text{計算回数} = r\,(d + 1)`} size={38} />
            <Label size={28}>d は入力の数</Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={840} y={635} w={990}>
        <Reveal line={4}>
          <Card accent={O} style={{height: 230}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
              <Tex tex={raw`\mu^*_i = \tfrac{1}{r}\textstyle\sum |EE_i|`} size={38} />
              <Tex tex={raw`\sigma_i = \mathrm{sd}(EE_i)`} size={38} />
            </div>
            <div style={{display: 'flex', gap: 40, marginTop: 18}}>
              <Label color={COLOR.text}>μ* ＝ 効きの大きさ</Label>
              <Label color={COLOR.text}>σ ＝ 場所で効き方が変わる度合い</Label>
            </div>
            <Label color={O} size={28} style={{marginTop: 8}}>
              σ が大きい ← 曲がり または 交互作用
            </Label>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 図解：道のりと μ*–σ の図 ----
const PICTURE_RECT = {x: 190, y: 300, w: 400, h: 400};
const PICTURE_COLORS = [H, B, O, A];
const MS_RECT = {x: 920, y: 215, w: 620, h: 470};
const MS_DOMAIN: [number, number] = [0, 10];
const MS_Y_DOMAIN: [number, number] = [0, 12];
const MORRIS = PRECOMPUTED.morris;

export const S3V: React.FC = () => {
  const {rise, sweep, currentLine} = useLines();
  const sx = makeScale(MS_DOMAIN[0], MS_DOMAIN[1], MS_RECT.x, MS_RECT.x + MS_RECT.w);
  const sy = makeScale(MS_Y_DOMAIN[0], MS_Y_DOMAIN[1], MS_RECT.y + MS_RECT.h, MS_RECT.y);
  const highlight = (i: number) => (currentLine === 2 ? (i < 2 ? 1 : 0.3) : currentLine === 3 ? (i === 2 ? 1 : 0.3) : 1);
  const reasons = ['', '曲がり', '交互作用'];
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <LevelGrid rect={PICTURE_RECT} />
          {MORRIS_PICTURE.map((trajectory, k) => (
            <TrajectoryPath key={k} points={trajectory.points} rect={PICTURE_RECT} color={PICTURE_COLORS[k]} progress={sweep(0, 0.15 + k * 0.18, 0.3 + k * 0.18)} />
          ))}
          <SvgText x={PICTURE_RECT.x + PICTURE_RECT.w / 2} y={PICTURE_RECT.y + PICTURE_RECT.h + 70} size={30} color={COLOR.text} weight={700}>
            入力が2つのときの道のり（4本）
          </SvgText>
        </g>
        <g opacity={rise(1)}>
          <PlotFrame
            rect={MS_RECT}
            xDomain={MS_DOMAIN}
            yDomain={MS_Y_DOMAIN}
            xTicks={[0, 2, 4, 6, 8, 10]}
            yTicks={[0, 4, 8, 12]}
            xLabel="μ*（効きの大きさ）"
            yLabel="σ（効き方のばらつき）"
            title="石上関数：50本・計算200回"
          />
          {MORRIS.muStar.map((mu, i) => (
            <g key={i} opacity={highlight(i)}>
              <Marker x={sx(mu)} y={sy(MORRIS.sigma[i])} r={18} color={INPUT_COLORS[i]} />
              <SvgText x={sx(mu) + (i === 1 ? -34 : 34)} y={sy(MORRIS.sigma[i]) + (i === 0 ? 32 : -36)} anchor={i === 1 ? 'end' : 'start'} size={34} color={COLOR.text} weight={800}>
                {INPUT_NAMES[i]}
              </SvgText>
            </g>
          ))}
          <g opacity={rise(3) * (currentLine === 3 ? 1 : 0)}>
            <SvgText x={sx(MORRIS.muStar[2])} y={sy(MORRIS.sigma[2]) + 60} size={30} color={A} weight={800}>
              {`μ* = ${MORRIS.muStar[2].toFixed(1)}`}
            </SvgText>
          </g>
          <g opacity={rise(4)}>
            {[1, 2].map((i) => (
              <g key={i}>
                <rect x={sx(MORRIS.muStar[i]) - 78} y={sy(MORRIS.sigma[i]) - 118} width={156} height={46} rx={23} fill={COLOR.backgroundDeep} stroke={INPUT_COLORS[i]} strokeWidth={3} />
                <SvgText x={sx(MORRIS.muStar[i])} y={sy(MORRIS.sigma[i]) - 95} size={28} color={COLOR.text} weight={700}>
                  {reasons[i]}
                </SvgText>
              </g>
            ))}
          </g>
        </g>
      </Canvas>
      <Box x={1590} y={240} w={250}>
        <Reveal line={1}>
          <Card accent={COLOR.muted} style={{padding: '16px 20px'}}>
            {MORRIS.muStar.map((mu, i) => (
              <div key={i} style={{fontSize: 27, fontWeight: 700, color: INPUT_COLORS[i], whiteSpace: 'nowrap', lineHeight: 1.6}}>
                {`${INPUT_NAMES[i]} ${mu.toFixed(1)} / ${MORRIS.sigma[i].toFixed(1)}`}
              </div>
            ))}
            <Label size={22} style={{marginTop: 4}}>
              μ* / σ
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={920} y={812} w={910}>
        <Reveal line={5}>
          <Label color={H} size={32}>
            → 順位とふるい分けに使う（分散の割合ではない）
          </Label>
        </Reveal>
      </Box>
    </>
  );
};
