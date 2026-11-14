// 第2章（確率積分変換）と第3章（コピュラとスクラーの定理）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Arrow, Canvas, curvePath, Dots, Histogram, histogram, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {SAMPLES} from '../lib/data.ts';
import {waitCdf, waitPdf} from '../lib/stats.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {mix, useLines} from '../timeline.ts';
import {blendPoints, format1, MiniCurve, toPixels, UNIT_DOMAIN, UNIT_TICKS, WAIT_DOMAIN, WAIT_TICKS} from './shared.tsx';

const CROWD = SAMPLES.map((s) => s.crowd);
const WAIT = SAMPLES.map((s) => s.wait);
const U1 = SAMPLES.map((s) => s.u1);
const U2 = SAMPLES.map((s) => s.u2);
const U_INDEPENDENT = SAMPLES.map((s) => s.uIndependent);

const FormulaCard: React.FC<{label: string; tex: string; accent: string; height: number; children?: React.ReactNode}> = ({
  label,
  tex,
  accent,
  height,
  children,
}) => (
  <Card accent={accent} style={{height, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
    <Label color={COLOR.subText}>{label}</Label>
    <div style={{marginTop: 6}}>
      <Tex tex={tex} size={50} />
    </div>
    {children}
  </Card>
);

export const S2T: React.FC = () => {
  const sx = makeScale(0, 100, 70, 560);
  const sy = makeScale(0, 1, 250, 30);
  return (
    <>
      <Box x={SIZE.sideMargin} y={185} w={1060}>
        <Reveal line={0}>
          <FormulaCard label="累積分布関数" tex="F(x)=P(X\le x)" accent={COLOR.blue} height={205}>
            <Reveal line={1}>
              <Label color={COLOR.text} style={{marginTop: 6}}>
                値が x 以下になる確率。0 から 1 へ増えていく
              </Label>
            </Reveal>
          </FormulaCard>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={412} w={1060}>
        <Reveal line={2}>
          <FormulaCard label="確率積分変換" tex="U=F(X)\ \sim\ \mathrm{Uniform}(0,1)" accent={COLOR.orange} height={205}>
            <Reveal line={3}>
              <Label color={COLOR.text} style={{marginTop: 6}}>
                値を「下から何％の位置か」という順位に直す
              </Label>
            </Reveal>
          </FormulaCard>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={639} w={1060}>
        <Reveal line={4}>
          <FormulaCard label="逆向き（逆関数）" tex="X=F^{-1}(U)" accent={COLOR.aqua} height={205}>
            <Label color={COLOR.text} style={{marginTop: 6}}>
              一様分布の u から、もとの分布の値に戻る
            </Label>
          </FormulaCard>
        </Reveal>
      </Box>
      <Box x={1210} y={185} w={620}>
        <Reveal line={1}>
          <Card accent={COLOR.blue} style={{height: 340, padding: '14px 20px'}}>
            <svg width={580} height={310}>
              <line x1={70} x2={560} y1={250} y2={250} stroke={COLOR.muted} strokeWidth={2} />
              <line x1={70} x2={70} y1={30} y2={250} stroke={COLOR.muted} strokeWidth={2} />
              <line x1={70} x2={560} y1={30} y2={30} stroke={COLOR.grid} strokeWidth={2} strokeDasharray="8 8" />
              <path d={curvePath(waitCdf, 0, 100, sx, sy)} fill="none" stroke={COLOR.blue} strokeWidth={5} />
              <SvgText x={44} y={30}>1</SvgText>
              <SvgText x={44} y={250}>0</SvgText>
              <SvgText x={315} y={286} size={30} color={COLOR.text}>x</SvgText>
              <SvgText x={420} y={120} size={32} color={COLOR.text} weight={700}>F(x)</SvgText>
            </svg>
          </Card>
        </Reveal>
      </Box>
      <Box x={1210} y={550} w={620}>
        <Reveal line={5}>
          <Card accent={COLOR.aqua} style={{height: 294, padding: '20px 24px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{textAlign: 'center'}}>
                <MiniCurve f={waitPdf} domain={[0, 90]} maxValue={0.052} width={210} height={120} color={COLOR.orange} />
                <Label style={{marginTop: 8}}>どんな分布も</Label>
              </div>
              <div style={{fontFamily: FONT, color: COLOR.text, textAlign: 'center', fontSize: 30, fontWeight: 700, lineHeight: 1.2}}>
                <Tex tex="F" size={34} />
                <div style={{fontSize: 56}}>⇄</div>
                <Tex tex="F^{-1}" size={34} />
              </div>
              <div style={{textAlign: 'center'}}>
                <MiniCurve f={() => 1} domain={[0, 1]} maxValue={1.6} width={210} height={120} color={COLOR.blue} />
                <Label style={{marginTop: 8}}>一様分布</Label>
              </div>
            </div>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

const STRIP_COUNT = 70;
const STRIP_WAIT = WAIT.filter((w) => w < 98).slice(0, STRIP_COUNT);
const GUIDE_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];
const WAIT_HIST = histogram(WAIT, 0, 100, 20);
const U_HIST = histogram(U2, 0, 1, 10);

export const S2V: React.FC = () => {
  const {rise, sweep} = useLines();
  const rect = {x: 500, y: 215, w: 960, h: 470};
  const sx = makeScale(0, 100, rect.x, rect.x + rect.w);
  const sy = makeScale(0, 1, rect.y + rect.h, rect.y);
  const back = sweep(4, 0.1, 0.85);
  const up = sweep(1, 0.3, 0.6) * (1 - Math.min(1, back * 2 - 1 < 0 ? 0 : back * 2 - 1));
  const left = sweep(1, 0.68, 0.98) * (1 - Math.min(1, back * 2));
  const points: [number, number][] = STRIP_WAIT.map((w) => [mix(sx(w), rect.x, left), mix(sy(0), sy(waitCdf(w)), up)]);
  const guides = rise(2);
  return (
    <>
      <Canvas>
        <PlotFrame rect={rect} xDomain={[0, 100]} yDomain={UNIT_DOMAIN} xTicks={[0, 20, 40, 60, 80, 100]} yTicks={[0, 0.25, 0.5, 0.75, 1]} format={(v) => (v > 1 || v === 0 || v === 1 ? String(v) : v.toFixed(2))} />
        <SvgText x={rect.x + rect.w + 44} y={rect.y + rect.h + 24} anchor="start" size={SIZE.axisLabel} color={COLOR.text}>
          待ち時間（分）
        </SvgText>
        <SvgText x={rect.x - 10} y={rect.y - 34} anchor="start" size={SIZE.axisLabel} color={COLOR.text}>
          u = F(x)
        </SvgText>
        <path d={curvePath(waitCdf, 0, 100, sx, sy)} fill="none" stroke={COLOR.blue} strokeWidth={5} opacity={rise(1)} />
        <SvgText x={sx(62)} y={sy(0.86)} size={SIZE.small} color={COLOR.text} weight={700} opacity={rise(1)}>
          累積分布関数 F
        </SvgText>
        <g opacity={guides * 0.9 * (1 - back)} stroke={COLOR.highlight} strokeWidth={2.5} strokeDasharray="7 7" fill="none">
          {GUIDE_INDEXES.map((index) => {
            const w = [4, 8, 12, 16, 50, 60, 70, 80][index];
            return <path key={index} d={`M${sx(w)} ${sy(0)} L${sx(w)} ${sy(waitCdf(w))} L${rect.x} ${sy(waitCdf(w))}`} />;
          })}
        </g>
        <Histogram counts={WAIT_HIST} maxCount={Math.max(...WAIT_HIST)} rect={{x: rect.x, y: rect.y + rect.h + 50, w: rect.w, h: 120}} side="bottom" color={COLOR.orange} opacity={0.85 * rise(0)} />
        <Histogram counts={U_HIST} maxCount={Math.max(...U_HIST) * 1.5} rect={{x: 250, y: rect.y, w: 150, h: rect.h}} side="left" color={COLOR.aqua} opacity={0.85 * rise(3)} />
        <g opacity={rise(0)}>
          <Dots points={points} r={7} color={COLOR.orange} opacity={0.9} />
        </g>
        <SvgText x={300} y={rect.y - 34} size={SIZE.small} color={COLOR.text} weight={700} opacity={rise(3)}>
          均等（一様分布）
        </SvgText>
        <g opacity={back > 0 ? 1 : 0}>
          <Arrow x1={rect.x + 40} y1={sy(0.5)} x2={sx(13.86) - 14} y2={sy(0.5)} color={COLOR.aqua} />
          <Arrow x1={sx(13.86)} y1={sy(0.5) + 14} x2={sx(13.86)} y2={sy(0) - 14} color={COLOR.aqua} />
        </g>
      </Canvas>
      <Box x={1490} y={330} w={345}>
        <Reveal line={2}>
          <Card accent={COLOR.highlight} style={{fontSize: 34, padding: '14px 18px'}}>
            <Label color={COLOR.text} size={30}>
              点が多いところほど
              <br />
              間隔が引きのばされる
            </Label>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

export const S3T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={185} w={830}>
      <Reveal line={0}>
        <Card accent={COLOR.orange} style={{height: 275}}>
          <Label>2つの変数を、それぞれ順位に直す</Label>
          <div style={{marginTop: 6}}>
            <Tex tex="U_1=F_1(X_1),\quad U_2=F_2(X_2)" size={46} />
          </div>
          <Reveal line={1}>
            <div style={{display: 'flex', gap: 40, marginTop: 14}}>
              <Label color={COLOR.text}>形の情報 → 消える</Label>
              <Label color={COLOR.blue}>つながり → 残る</Label>
            </div>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={482} w={830}>
      <Reveal line={2}>
        <Card accent={COLOR.blue} style={{height: 265}}>
          <div style={{fontSize: 44, fontWeight: 800}}>コピュラ</div>
          <Label>周辺分布がすべて一様分布の、同時分布関数</Label>
          <div style={{marginTop: 10}}>
            <Tex tex="C(u_1,u_2)=P(U_1\le u_1,\ U_2\le u_2)" size={42} />
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={960} y={185} w={870}>
      <Reveal line={3}>
        <Card accent={COLOR.aqua} style={{height: 562}}>
          <div style={{fontSize: 44, fontWeight: 800}}>スクラーの定理</div>
          <div style={{marginTop: 30, textAlign: 'center'}}>
            <Tex tex={`H(x_1,x_2)=\\textcolor{${COLOR.blue}}{C}\\big(\\textcolor{${COLOR.orange}}{F_1}(x_1),\\,\\textcolor{${COLOR.orange}}{F_2}(x_2)\\big)`} size={47} />
          </div>
          <div style={{marginTop: 34, display: 'grid', gridTemplateColumns: '170px 1fr', rowGap: 10, alignItems: 'center'}}>
            <Tex tex="H" size={40} />
            <Label color={COLOR.text}>同時分布</Label>
            <Tex tex={`\\textcolor{${COLOR.blue}}{C}`} size={40} />
            <Label color={COLOR.text}>コピュラ（つながり方）</Label>
            <Tex tex={`\\textcolor{${COLOR.orange}}{F_1,F_2}`} size={40} />
            <Label color={COLOR.text}>周辺分布（分布の形）</Label>
          </div>
          <Reveal line={4}>
            <Label color={COLOR.aqua} style={{marginTop: 26}}>
              周辺分布が連続なら、C はただ1つに決まる
            </Label>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={772} w={1740}>
      <Reveal line={5}>
        <div
          style={{
            height: 100,
            borderRadius: 16,
            backgroundColor: COLOR.aqua,
            color: COLOR.backgroundDeep,
            fontFamily: FONT,
            fontSize: 46,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          好きな周辺分布 × 好きなコピュラ → 新しい同時分布
        </div>
      </Reveal>
    </Box>
  </>
);

const BINS = 14;
const CROWD_COUNTS = histogram(CROWD, 0, 1, BINS);
const WAIT_COUNTS = histogram(WAIT, 0, 115, BINS);
const U1_COUNTS = histogram(U1, 0, 1, BINS);
const U2_COUNTS = histogram(U2, 0, 1, BINS);
const MAX_COUNT = Math.max(...CROWD_COUNTS, ...WAIT_COUNTS);

export const S3V: React.FC = () => {
  const {rise, sweep} = useLines();
  const leftRect = {x: 230, y: 305, w: 500, h: 460};
  const rightRect = {x: 1150, y: 305, w: 460, h: 460};
  const dataPoints = toPixels(leftRect, UNIT_DOMAIN, WAIT_DOMAIN, CROWD, WAIT);
  const copulaPoints = toPixels(rightRect, UNIT_DOMAIN, UNIT_DOMAIN, U1, U2);
  const independentPoints = toPixels(rightRect, UNIT_DOMAIN, UNIT_DOMAIN, U1, U_INDEPENDENT);
  const fly = sweep(1, 0.15, 0.75);
  const scatter = sweep(4, 0.1, 0.6);
  const moving = blendPoints(blendPoints(dataPoints, copulaPoints, fly), independentPoints, scatter);
  const cx = rightRect.x + rightRect.w / 2;
  const cy = rightRect.y + rightRect.h / 2;
  return (
    <Canvas>
      <g opacity={rise(0)}>
        <PlotFrame rect={leftRect} xDomain={UNIT_DOMAIN} yDomain={WAIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={WAIT_TICKS} xLabel="混雑率" yLabel="待ち時間（分）" format={format1} />
        <Histogram counts={CROWD_COUNTS} maxCount={MAX_COUNT} rect={{x: leftRect.x, y: 195, w: leftRect.w, h: 96}} side="top" color={COLOR.orange} />
        <Histogram counts={WAIT_COUNTS} maxCount={MAX_COUNT} rect={{x: leftRect.x + leftRect.w + 12, y: leftRect.y, w: 96, h: leftRect.h}} side="right" color={COLOR.orange} />
        <Dots points={dataPoints} opacity={mix(0.75, 0.3, fly)} />
      </g>
      <g opacity={rise(1)}>
        <Arrow x1={860} y1={cy} x2={1010} y2={cy} color={COLOR.text} width={7} />
        <SvgText x={935} y={cy - 44} size={SIZE.small} color={COLOR.text} weight={700}>
          順位に直す
        </SvgText>
        <PlotFrame rect={rightRect} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={UNIT_TICKS} xLabel="混雑率の順位" yLabel="待ち時間の順位" format={format1} />
        <Dots points={moving} />
      </g>
      <g opacity={rise(2)}>
        <Histogram counts={U1_COUNTS} maxCount={MAX_COUNT} rect={{x: rightRect.x, y: 195, w: rightRect.w, h: 96}} side="top" color={COLOR.aqua} />
        <Histogram counts={U2_COUNTS} maxCount={MAX_COUNT} rect={{x: rightRect.x + rightRect.w + 12, y: rightRect.y, w: 96, h: rightRect.h}} side="right" color={COLOR.aqua} />
      </g>
      <g opacity={rise(3) * (1 - scatter)}>
        <ellipse cx={cx} cy={cy} rx={300} ry={125} fill="none" stroke={COLOR.highlight} strokeWidth={5} strokeDasharray="14 10" transform={`rotate(-45 ${cx} ${cy})`} />
      </g>
      <SvgText x={1760} y={cy - 24} size={SIZE.small} color={COLOR.text} weight={700} opacity={rise(3) * (1 - scatter)} anchor="middle">
        これが
      </SvgText>
      <SvgText x={1760} y={cy + 24} size={SIZE.small} color={COLOR.highlight} weight={700} opacity={rise(3) * (1 - scatter)} anchor="middle">
        コピュラ
      </SvgText>
      <SvgText x={1770} y={cy} size={SIZE.small} color={COLOR.text} weight={700} opacity={scatter} anchor="middle">
        独立
      </SvgText>
    </Canvas>
  );
};
