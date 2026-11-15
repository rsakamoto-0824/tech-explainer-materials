// 第5章（乱数の作り方）、第6章（形の着せ替え）、第7章（データへの当てはめ）
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Arrow, Canvas, Dots, Marker, PlotFrame, SvgText, type Rect} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {LOG_CORRELATION, RANK_U1, RANK_U2, RAW_CORRELATION, SAMPLES, SCORE1, SCORE2, SCORE_CORRELATION, TRACKED} from '../lib/data.ts';
import {crowdPdf, normalPdf, waitPdf} from '../lib/stats.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {mix, useLines} from '../timeline.ts';
import {blendPoints, format1, MiniCurve, toPixels, UNIT_DOMAIN, UNIT_TICKS, WAIT_DOMAIN, WAIT_TICKS, Z_DOMAIN, Z_TICKS} from './shared.tsx';

const Z1 = SAMPLES.map((s) => s.z1);
const Z2 = SAMPLES.map((s) => s.z2);
const U1 = SAMPLES.map((s) => s.u1);
const U2 = SAMPLES.map((s) => s.u2);
const CROWD = SAMPLES.map((s) => s.crowd);
const WAIT = SAMPLES.map((s) => s.wait);

const STEP_COLORS = [COLOR.blue, COLOR.orange, COLOR.aqua];

const StepCard: React.FC<{step: number; title: string; tex: string; children?: React.ReactNode}> = ({step, title, tex, children}) => (
  <Card accent={STEP_COLORS[step - 1]} style={{height: 375, padding: '24px 30px'}}>
    <div
      style={{
        display: 'inline-block',
        backgroundColor: STEP_COLORS[step - 1],
        color: COLOR.backgroundDeep,
        fontSize: 30,
        fontWeight: 800,
        padding: '4px 20px',
        borderRadius: 8,
      }}
    >
      ステップ{step}
    </div>
    <div style={{fontSize: 42, fontWeight: 800, marginTop: 12}}>{title}</div>
    <div style={{marginTop: 8, height: 128, display: 'flex', alignItems: 'center'}}>
      <Tex tex={tex} size={44} />
    </div>
    {children}
  </Card>
);

const Banner: React.FC<{color: string; children: React.ReactNode}> = ({color, children}) => (
  <div
    style={{
      height: 96,
      borderRadius: 16,
      backgroundColor: color,
      color: COLOR.backgroundDeep,
      fontFamily: FONT,
      fontSize: 42,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

const STEP_X = [SIZE.sideMargin, 680, 1270];

export const S5T: React.FC = () => (
  <>
    <Box x={STEP_X[0]} y={185} w={560}>
      <Reveal line={1}>
        <StepCard step={1} title="相関つきの正規乱数" tex="z=L\varepsilon,\quad R=LL^{\top}">
          <Reveal line={2}>
            <Label color={COLOR.text} size={30}>
              L：R をコレスキー分解した三角行列
            </Label>
          </Reveal>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={STEP_X[1]} y={185} w={560}>
      <Reveal line={3}>
        <StepCard step={2} title="0〜1 に直す" tex="u_i=\Phi(z_i)">
          <Label color={COLOR.text} size={30}>
            u はガウシアンコピュラに従う
          </Label>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={STEP_X[2]} y={185} w={560}>
      <Reveal line={4}>
        <StepCard step={3} title="ほしい分布に直す" tex="x_i=F_i^{-1}(u_i)">
          <Label color={COLOR.text} size={30}>
            F：ほしい周辺分布
          </Label>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={588} w={1740}>
      <Reveal line={5}>
        <Banner color={COLOR.aqua}>周辺分布は思いどおり ＋ つながり方はガウシアンコピュラ</Banner>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={708} w={1740}>
      <Reveal line={6}>
        <Card accent={COLOR.blue} style={{height: 150, display: 'flex', alignItems: 'center', gap: 50, padding: '10px 34px'}}>
          <Label color={COLOR.text}>2変数のステップ1</Label>
          <Tex tex="z_1=\varepsilon_1,\qquad z_2=\rho\,\varepsilon_1+\sqrt{1-\rho^2}\;\varepsilon_2" size={46} />
          <Label>ε は独立な標準正規乱数</Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

// 3つ並べる枠（左・中央・右）
const PANELS: Rect[] = [
  {x: 120, y: 255, w: 430, h: 430},
  {x: 690, y: 255, w: 430, h: 430},
  {x: 1340, y: 255, w: 430, h: 430},
];
const PANEL_CENTER_Y = PANELS[0].y + PANELS[0].h / 2;
const Z_POINTS = toPixels(PANELS[0], Z_DOMAIN, Z_DOMAIN, Z1, Z2);
const U_POINTS = toPixels(PANELS[1], UNIT_DOMAIN, UNIT_DOMAIN, U1, U2);
const X_POINTS = toPixels(PANELS[2], UNIT_DOMAIN, WAIT_DOMAIN, CROWD, WAIT);
const TRACKED_Z = toPixels(PANELS[0], Z_DOMAIN, Z_DOMAIN, [TRACKED.z1], [TRACKED.z2])[0];
const TRACKED_U = toPixels(PANELS[1], UNIT_DOMAIN, UNIT_DOMAIN, [TRACKED.u1], [TRACKED.u2])[0];
const TRACKED_X = toPixels(PANELS[2], UNIT_DOMAIN, WAIT_DOMAIN, [TRACKED.crowd], [TRACKED.wait])[0];

const PanelArrow: React.FC<{from: number; to: number; label: string; opacity: number}> = ({from, to, label, opacity}) => (
  <g opacity={opacity}>
    <Arrow x1={from} y1={PANEL_CENTER_Y} x2={to} y2={PANEL_CENTER_Y} color={COLOR.text} width={7} />
    <SvgText x={(from + to) / 2} y={PANEL_CENTER_Y - 44} size={SIZE.small} color={COLOR.text} weight={700}>
      {label}
    </SvgText>
  </g>
);

export const S5V: React.FC = () => {
  const {rise, sweep} = useLines();
  const toU = sweep(1, 0.1, 0.6);
  const toX = sweep(2, 0.1, 0.5);
  const tracked = rise(3);
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame rect={PANELS[0]} xDomain={Z_DOMAIN} yDomain={Z_DOMAIN} xTicks={Z_TICKS} yTicks={Z_TICKS} title="ステップ1：正規乱数 z" />
          <Dots points={Z_POINTS} />
        </g>
        <g opacity={rise(1)}>
          <PanelArrow from={562} to={618} label="Φ" opacity={1} />
          <PlotFrame rect={PANELS[1]} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={[0, 1]} title="ステップ2：0〜1 の u" format={format1} />
          <Dots points={blendPoints(Z_POINTS, U_POINTS, toU)} />
        </g>
        <g opacity={rise(2)}>
          <PanelArrow from={1142} to={1220} label="逆関数" opacity={1} />
          <PlotFrame rect={PANELS[2]} xDomain={UNIT_DOMAIN} yDomain={WAIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={WAIT_TICKS} xLabel="混雑率" yLabel="待ち時間（分）" title="ステップ3：できあがったデータ" format={format1} />
          <Dots points={blendPoints(U_POINTS, X_POINTS, toX)} />
        </g>
        <Marker x={TRACKED_Z[0]} y={TRACKED_Z[1]} opacity={tracked} />
        <Marker x={TRACKED_U[0]} y={TRACKED_U[1]} opacity={rise(3, 40)} />
        <Marker x={TRACKED_X[0]} y={TRACKED_X[1]} opacity={rise(4, 80)} />
      </Canvas>
      <Box x={PANELS[0].x} y={742} w={PANELS[0].w} style={{textAlign: 'center'}}>
        <Reveal line={3}>
          <Tex tex={`z=(${TRACKED.z1.toFixed(1)},\\ ${TRACKED.z2.toFixed(1)})`} size={46} color={COLOR.highlight} />
        </Reveal>
      </Box>
      <Box x={PANELS[1].x} y={742} w={PANELS[1].w} style={{textAlign: 'center'}}>
        <Reveal line={3} delay={40}>
          <Tex tex={`u=(${TRACKED.u1.toFixed(2)},\\ ${TRACKED.u2.toFixed(2)})`} size={46} color={COLOR.highlight} />
          <Label size={28}>下から 88% と 73% の位置</Label>
        </Reveal>
      </Box>
      <Box x={PANELS[2].x - 60} y={772} w={PANELS[2].w + 120} style={{textAlign: 'center'}}>
        <Reveal line={4} delay={80}>
          <Label color={COLOR.highlight} size={38}>
            混雑率 {TRACKED.crowd.toFixed(2)}、待ち時間 約{Math.round(TRACKED.wait)}分
          </Label>
        </Reveal>
      </Box>
    </>
  );
};

export const S6T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={185} w={1020}>
      <Reveal line={1}>
        <Card accent={COLOR.aqua} style={{height: 300}}>
          <div style={{fontSize: 42, fontWeight: 800}}>単調に増える変換をしても、コピュラは同じ</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 40, marginTop: 14}}>
            <Tex tex="X\ \longrightarrow\ g(X)" size={50} />
            <Label>例：対数をとる、単位を変える</Label>
          </div>
          <Reveal line={2}>
            <Label color={COLOR.aqua} style={{marginTop: 16}}>
              変わるのは値の大きさだけ。順位は変わらない
            </Label>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={510} w={1020}>
      <Reveal line={3}>
        <Card accent={COLOR.orange} style={{height: 350}}>
          <div style={{fontSize: 40, fontWeight: 800}}>待ち時間の対数をとると…</div>
          <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', rowGap: 18, marginTop: 22, alignItems: 'center', fontSize: 40, fontWeight: 700}}>
            <div>相関係数</div>
            <div>
              {RAW_CORRELATION.toFixed(2)} → {LOG_CORRELATION.toFixed(2)}
              <span style={{color: COLOR.warning, fontSize: 34, marginLeft: 30}}>変わる</span>
            </div>
            <div>コピュラ</div>
            <div>
              そのまま
              <span style={{color: COLOR.aqua, fontSize: 34, marginLeft: 30}}>変わらない</span>
            </div>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={1150} y={185} w={680}>
      <Reveal line={4}>
        <Card accent={COLOR.blue} style={{height: 300}}>
          <div style={{fontSize: 42, fontWeight: 800}}>コピュラ ＝</div>
          <div style={{fontSize: 40, fontWeight: 700, marginTop: 10, lineHeight: 1.5}}>
            分布の形に左右されない
            <br />
            純粋なつながり方
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={1150} y={510} w={680}>
      <Reveal line={5}>
        <Card accent={COLOR.blue} style={{height: 350}}>
          <div style={{fontSize: 40, fontWeight: 800}}>1つのコピュラに</div>
          <div style={{fontSize: 40, fontWeight: 800}}>いろいろな周辺分布を着せられる</div>
          <div style={{display: 'flex', gap: 22, marginTop: 26}}>
            <MiniCurve f={normalPdf} domain={[-3.2, 3.2]} maxValue={0.42} width={185} height={120} color={COLOR.orange} />
            <MiniCurve f={waitPdf} domain={[0, 90]} maxValue={0.052} width={185} height={120} color={COLOR.orange} />
            <MiniCurve f={crowdPdf} domain={[0, 1]} maxValue={1.9} width={185} height={120} color={COLOR.orange} />
          </div>
        </Card>
      </Reveal>
    </Box>
  </>
);

// 4つ並べる枠：コピュラと、3通りの周辺分布
const DRESS_PANELS: Rect[] = [0, 1, 2, 3].map((index) => ({x: 110 + index * 445, y: 290, w: 390, h: 390}));
const EXP_DOMAIN: [number, number] = [0, 5.5];
const toExp = (u: number) => -Math.log(1 - u);
const DRESS_SOURCE = toPixels(DRESS_PANELS[0], UNIT_DOMAIN, UNIT_DOMAIN, U1, U2);
const DRESSED = [
  toPixels(DRESS_PANELS[1], Z_DOMAIN, Z_DOMAIN, Z1, Z2),
  toPixels(DRESS_PANELS[2], EXP_DOMAIN, EXP_DOMAIN, U1.map(toExp), U2.map(toExp)),
  toPixels(DRESS_PANELS[3], UNIT_DOMAIN, WAIT_DOMAIN, CROWD, WAIT),
];
const UNDRESSED = [1, 2, 3].map((index) => toPixels(DRESS_PANELS[index], UNIT_DOMAIN, UNIT_DOMAIN, U1, U2));
const DRESS_TITLES = ['正規 × 正規', '指数 × 指数', '混雑率 × 待ち時間'];

export const S6V: React.FC = () => {
  const {rise, sweep} = useLines();
  // 5行目で順位に戻し、6行目でもう一度着せる
  const undress = sweep(4, 0.4, 0.75) - sweep(5, 0.05, 0.45);
  return (
    <Canvas>
      <g opacity={rise(0)}>
        <PlotFrame rect={DRESS_PANELS[0]} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={UNIT_TICKS} title="コピュラ（ρ = 0.7）" format={format1} />
        <Dots points={DRESS_SOURCE} />
      </g>
      {DRESSED.map((target, index) => {
        const rect = DRESS_PANELS[index + 1];
        const fly = sweep(index + 1, 0.05, 0.5);
        const points = blendPoints(blendPoints(DRESS_SOURCE, target, fly), UNDRESSED[index], Math.max(0, undress));
        return (
          <g key={DRESS_TITLES[index]} opacity={rise(index + 1)}>
            <PlotFrame rect={rect} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} title={DRESS_TITLES[index]} />
            <clipPath id={`dress-clip-${index}`}>
              <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
            </clipPath>
            {/* 飛んでいる途中は枠の外も通るので、着いてから枠で切り取る */}
            <g clipPath={fly >= 0.999 ? `url(#dress-clip-${index})` : undefined}>
              <Dots points={points} color={COLOR.orange} />
            </g>
          </g>
        );
      })}
      <g opacity={Math.max(0, undress)}>
        <SvgText x={DRESS_PANELS[2].x + DRESS_PANELS[2].w / 2} y={760} size={42} color={COLOR.text} weight={700}>
          順位に直すと、3つとも同じコピュラ
        </SvgText>
      </g>
      <g opacity={rise(5, 20)}>
        <SvgText x={SIZE.width / 2} y={790} size={44} color={COLOR.text} weight={700}>
          散布図の見た目 ＝ 周辺分布 × コピュラ
        </SvgText>
      </g>
      <g opacity={rise(1) * (1 - Math.max(0, undress)) * (1 - rise(5, 20))}>
        <SvgText x={SIZE.width / 2} y={760} size={SIZE.small} color={COLOR.subText}>
          同じ点（同じ順位）に、違う周辺分布を着せている
        </SvgText>
      </g>
    </Canvas>
  );
};

export const S7T: React.FC = () => (
  <>
    <Box x={STEP_X[0]} y={185} w={560}>
      <Reveal line={1}>
        <StepCard step={1} title="順位に直す" tex="u_i=\dfrac{r_i}{n+1}">
          <Label color={COLOR.text} size={30}>
            r は順位、n はデータの数
          </Label>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={STEP_X[1]} y={185} w={560}>
      <Reveal line={2}>
        <StepCard step={2} title="正規スコアに直す" tex="z_i=\Phi^{-1}(u_i)">
          <Label color={COLOR.text} size={30}>
            0〜1 の値を、正規分布の値に
          </Label>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={STEP_X[2]} y={185} w={560}>
      <Reveal line={3}>
        <StepCard step={3} title="相関係数を計算" tex="\hat{R}=\mathrm{corr}(z)">
          <Label color={COLOR.text} size={30}>
            これが相関行列 R の推定値
          </Label>
        </StepCard>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={590} w={850}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{height: 270, padding: '20px 30px'}}>
          <div style={{fontSize: 38, fontWeight: 800}}>別の方法：ケンドールの順位相関 τ から</div>
          <div style={{marginTop: 22, textAlign: 'center'}}>
            <Tex tex="\rho=\sin\!\left(\dfrac{\pi\,\tau}{2}\right)" size={50} />
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={590} w={850}>
      <Reveal line={5}>
        <Card accent={COLOR.orange} style={{height: 270, padding: '20px 30px'}}>
          <div style={{fontSize: 38, fontWeight: 800}}>周辺分布は、変数ごとに別に当てはめる</div>
          <Label style={{marginTop: 10}}>ヒストグラムを見て、合う分布を選ぶ</Label>
          <Reveal line={6}>
            <Label color={COLOR.aqua} style={{marginTop: 22}} size={36}>
              順位だけを使う → 外れ値や分布のゆがみに強い
            </Label>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
  </>
);

const FIT_DATA = toPixels(PANELS[0], UNIT_DOMAIN, WAIT_DOMAIN, CROWD, WAIT);
const FIT_U = toPixels(PANELS[1], UNIT_DOMAIN, UNIT_DOMAIN, RANK_U1, RANK_U2);
const FIT_Z = toPixels({...PANELS[2], x: 1300}, Z_DOMAIN, Z_DOMAIN, SCORE1, SCORE2);

export const S7V: React.FC = () => {
  const {rise, sweep} = useLines();
  const toU = sweep(2, 0.05, 0.35);
  const toZ = sweep(2, 0.45, 0.8);
  const zRect = {...PANELS[2], x: 1300};
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame rect={PANELS[0]} xDomain={UNIT_DOMAIN} yDomain={WAIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={WAIT_TICKS} xLabel="混雑率" title="データ（400件）" format={format1} />
          <Dots points={FIT_DATA} />
        </g>
        <g opacity={rise(2)}>
          <PanelArrow from={562} to={618} label="順位" opacity={1} />
          <PlotFrame rect={PANELS[1]} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={[0, 1]} title="ステップ1：順位 u" format={format1} />
          <Dots points={blendPoints(FIT_DATA, FIT_U, toU)} opacity={mix(0.75, 0.3, toZ)} />
        </g>
        <g opacity={rise(2, 0) * (toZ > 0 ? 1 : 0)}>
          <PanelArrow from={1142} to={1240} label="逆関数" opacity={1} />
          <PlotFrame rect={zRect} xDomain={Z_DOMAIN} yDomain={Z_DOMAIN} xTicks={Z_TICKS} yTicks={Z_TICKS} title="ステップ2：正規スコア z" />
          <Dots points={blendPoints(FIT_U, FIT_Z, toZ)} />
        </g>
      </Canvas>
      <Box x={PANELS[0].x - 40} y={772} w={PANELS[0].w + 80} style={{textAlign: 'center'}}>
        <Reveal line={1}>
          <Label color={COLOR.text} size={40}>
            相関係数 {RAW_CORRELATION.toFixed(2)}
          </Label>
          <Label size={28} color={COLOR.warning}>
            分布の形のゆがみに影響される
          </Label>
        </Reveal>
      </Box>
      <Box x={zRect.x - 40} y={772} w={zRect.w + 80} style={{textAlign: 'center'}}>
        <Reveal line={3}>
          <Label color={COLOR.highlight} size={40}>
            ステップ3：相関係数 {SCORE_CORRELATION.toFixed(2)}
          </Label>
          <Label size={28}>作るときに使った 0.7 に近い</Label>
        </Reveal>
      </Box>
      <Box x={PANELS[1].x - 60} y={772} w={PANELS[1].w + 120} style={{textAlign: 'center'}}>
        <Reveal line={4}>
          <Label color={COLOR.aqua} size={30}>
            推定した R ＋ 周辺分布
            <br />→ よく似たデータを作れる
          </Label>
        </Reveal>
      </Box>
    </>
  );
};
