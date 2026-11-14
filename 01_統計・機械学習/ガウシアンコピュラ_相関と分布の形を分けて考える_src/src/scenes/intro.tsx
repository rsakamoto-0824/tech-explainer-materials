// はじめに（題名、ゴール）と第1章
import type React from 'react';
import {Interactive} from 'remotion';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, Histogram, histogram, PlotFrame, SvgText} from '../components/plot.tsx';
import {SAMPLES} from '../lib/data.ts';
import {crowdPdf, mean, normalPdf, waitPdf} from '../lib/stats.ts';
import {CHAPTERS} from '../script.ts';
import {CHAPTER_COLORS, COLOR, FONT, SIZE} from '../theme.ts';
import {mix, useLines} from '../timeline.ts';
import {blendPoints, format1, MiniCurve, MiniScatter, toPixels, UNIT_DOMAIN, UNIT_TICKS, WAIT_DOMAIN, WAIT_TICKS} from './shared.tsx';

const CROWD = SAMPLES.map((s) => s.crowd);
const WAIT = SAMPLES.map((s) => s.wait);
const U1 = SAMPLES.map((s) => s.u1);
const U2 = SAMPLES.map((s) => s.u2);
const BINS = 14;
const CROWD_COUNTS = histogram(CROWD, 0, 1, BINS);
const WAIT_COUNTS = histogram(WAIT, 0, 115, BINS);
const U1_COUNTS = histogram(U1, 0, 1, BINS);
const U2_COUNTS = histogram(U2, 0, 1, BINS);
const MAX_COUNT = Math.max(...CROWD_COUNTS, ...WAIT_COUNTS);

// 題名の場面：データの点が、順位だけの姿（コピュラ）へ変わる
export const S00: React.FC = () => {
  const {rise, sweep} = useLines();
  const rect = {x: 1190, y: 290, w: 500, h: 500};
  const dataPoints = toPixels(rect, UNIT_DOMAIN, WAIT_DOMAIN, CROWD, WAIT);
  const copulaPoints = toPixels(rect, UNIT_DOMAIN, UNIT_DOMAIN, U1, U2);
  const morph = sweep(2, 0.15, 0.6);
  const blendCounts = (a: number[], b: number[]) => a.map((count, i) => mix(count, b[i], morph));
  return (
    <>
      <Box x={SIZE.sideMargin} y={230} w={1040}>
        <Reveal line={0}>
          <Label color={COLOR.blue} size={40}>
            統計入門｜理論と図解で学ぶ
          </Label>
        </Reveal>
        <Reveal line={0} delay={6}>
          <Interactive.Div name="題名" style={{fontFamily: FONT, fontSize: 116, fontWeight: 800, color: COLOR.text, marginTop: 28, lineHeight: 1.2}}>
            ガウシアン
            <br />
            コピュラ
          </Interactive.Div>
        </Reveal>
        <Reveal line={0} delay={14}>
          <Interactive.Div name="副題" style={{fontFamily: FONT, fontSize: 48, fontWeight: 600, color: COLOR.subText, marginTop: 36, lineHeight: 1.5}}>
            「分布の形」と「つながり方」を
            <br />
            分けて考える
          </Interactive.Div>
        </Reveal>
      </Box>
      <Canvas>
        <g opacity={rise(0, 10)}>
          <PlotFrame rect={rect} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} />
          <Dots points={blendPoints(dataPoints, copulaPoints, morph)} r={4.5} />
          <g opacity={rise(1)}>
            <Histogram counts={blendCounts(CROWD_COUNTS, U1_COUNTS)} maxCount={MAX_COUNT} rect={{x: rect.x, y: 170, w: rect.w, h: 105}} side="top" color={COLOR.orange} />
            <Histogram counts={blendCounts(WAIT_COUNTS, U2_COUNTS)} maxCount={MAX_COUNT} rect={{x: rect.x + rect.w + 15, y: rect.y, w: 105, h: rect.h}} side="right" color={COLOR.orange} />
          </g>
          <SvgText x={rect.x + rect.w / 2} y={rect.y + rect.h + 34} size={SIZE.small} color={COLOR.text} weight={700}>
            {morph < 0.5 ? 'もとのデータ' : 'つながり方だけを取り出した姿'}
          </SvgText>
        </g>
      </Canvas>
    </>
  );
};

const GOALS = [
  ['コピュラは「分布の形」と「つながり方」を分けて扱う道具', COLOR.blue],
  ['ガウシアンコピュラの式と、乱数の作り方', COLOR.orange],
  ['使うときの落とし穴：すその依存性', COLOR.aqua],
] as const;

export const S01: React.FC = () => (
  <>
    {GOALS.map(([text, color], index) => (
      <Box key={text} x={SIZE.sideMargin} y={200 + index * 215} w={1060}>
        <Reveal line={index + 1}>
          <Card accent={color} style={{height: 185, display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{fontSize: 84, fontWeight: 800, color, width: 70, textAlign: 'center'}}>{index + 1}</div>
            <div style={{fontSize: 44, fontWeight: 700, lineHeight: 1.45}}>{text}</div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1220} y={200} w={610}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{padding: '24px 32px', height: 615}}>
          <div style={{fontSize: 36, fontWeight: 700, color: COLOR.subText, marginBottom: 14}}>全8章</div>
          {CHAPTERS.slice(1, 9).map((chapter, index) => (
            <div key={chapter} style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 35, fontWeight: 600, height: 64}}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: CHAPTER_COLORS[index + 1],
                  color: COLOR.backgroundDeep,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              {chapter}
            </div>
          ))}
        </Card>
      </Reveal>
    </Box>
  </>
);

const MINI_POINTS: [number, number][] = SAMPLES.slice(0, 110).map((s) => [s.crowd, Math.min(s.wait / 80, 1)]);
const MINI_COPULA: [number, number][] = SAMPLES.slice(0, 110).map((s) => [s.u1, s.u2]);

const Operator: React.FC<{x: number; line: number; children: React.ReactNode}> = ({x, line, children}) => (
  <Box x={x} y={265} w={90}>
    <Reveal line={line}>
      <div style={{fontFamily: FONT, fontSize: 90, fontWeight: 700, color: COLOR.subText, textAlign: 'center'}}>{children}</div>
    </Reveal>
  </Box>
);

export const S1T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={185} w={470}>
      <Reveal line={0}>
        <Card accent={COLOR.muted} style={{height: 300, display: 'flex', alignItems: 'center', gap: 26}}>
          <MiniScatter points={MINI_POINTS} size={130} color={COLOR.subText} />
          <div>
            <div style={{fontSize: 48, fontWeight: 800}}>同時分布</div>
            <Label style={{marginTop: 10}}>2変数の
              <br />
              振る舞い全体
            </Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Operator x={570} line={1}>
      ＝
    </Operator>
    <Box x={670} y={185} w={520}>
      <Reveal line={1}>
        <Card accent={COLOR.orange} style={{height: 300, display: 'flex', alignItems: 'center', gap: 26}}>
          <div>
            <MiniCurve f={crowdPdf} domain={[0, 1]} maxValue={1.9} width={150} height={70} color={COLOR.orange} />
            <MiniCurve f={waitPdf} domain={[0, 90]} maxValue={0.052} width={150} height={70} color={COLOR.orange} />
          </div>
          <div>
            <div style={{fontSize: 48, fontWeight: 800}}>周辺分布</div>
            <Label style={{marginTop: 10}}>変数ごとの
              <br />
              分布の形
            </Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Operator x={1200} line={2}>
      ＋
    </Operator>
    <Box x={1300} y={185} w={530}>
      <Reveal line={2}>
        <Card accent={COLOR.blue} style={{height: 300, display: 'flex', alignItems: 'center', gap: 26}}>
          <MiniScatter points={MINI_COPULA} size={150} />
          <div>
            <div style={{fontSize: 48, fontWeight: 800}}>依存構造</div>
            <Label style={{marginTop: 10}}>変数どうしの
              <br />
              つながり方
            </Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={515} w={850}>
      <Reveal line={3}>
        <Card accent={COLOR.muted} style={{height: 235, display: 'flex', alignItems: 'center', gap: 28}}>
          <MiniCurve f={normalPdf} domain={[-3.2, 3.2]} maxValue={0.42} width={170} height={110} color={COLOR.subText} />
          <div>
            <div style={{fontSize: 42, fontWeight: 800}}>多変量正規分布</div>
            <Label style={{marginTop: 8}}>つながりは相関係数で表せる</Label>
            <Label color={COLOR.warning} style={{marginTop: 4}}>
              ただし周辺分布はすべて正規分布
            </Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={515} w={850}>
      <Reveal line={4}>
        <Card accent={COLOR.orange} style={{height: 235, display: 'flex', alignItems: 'center', gap: 28}}>
          <div>
            <MiniCurve f={waitPdf} domain={[0, 90]} maxValue={0.052} width={170} height={84} color={COLOR.orange} />
            <MiniCurve f={crowdPdf} domain={[0, 1]} maxValue={1.9} width={170} height={84} color={COLOR.orange} />
          </div>
          <div>
            <div style={{fontSize: 42, fontWeight: 800}}>現実のデータ</div>
            <Label style={{marginTop: 8}}>右にすそが長い（待ち時間・損失額）</Label>
            <Label style={{marginTop: 4}}>0〜1 に収まる（割合）</Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={772} w={1740}>
      <Reveal line={5}>
        <div
          style={{
            height: 100,
            borderRadius: 16,
            backgroundColor: COLOR.blue,
            color: COLOR.backgroundDeep,
            fontFamily: FONT,
            fontSize: 46,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          形は自由に選び、つながり方は別に決める → コピュラ
        </div>
      </Reveal>
    </Box>
  </>
);

// 当てはめた正規分布の 95% の楕円
const MEAN_CROWD = mean(CROWD);
const MEAN_WAIT = mean(WAIT);
const covariance = (a: number[], ma: number, b: number[], mb: number) => mean(a.map((v, i) => (v - ma) * (b[i] - mb)));
const VAR_CROWD = covariance(CROWD, MEAN_CROWD, CROWD, MEAN_CROWD);
const VAR_WAIT = covariance(WAIT, MEAN_WAIT, WAIT, MEAN_WAIT);
const COV = covariance(CROWD, MEAN_CROWD, WAIT, MEAN_WAIT);
const CHI_SQUARE_95 = 5.991;
const ELLIPSE: [number, number][] = Array.from({length: 73}, (_, i) => {
  const angle = (2 * Math.PI * i) / 72;
  // コレスキー分解で、単位円を共分散の形に変える
  const l11 = Math.sqrt(VAR_CROWD);
  const l21 = COV / l11;
  const l22 = Math.sqrt(VAR_WAIT - l21 * l21);
  const radius = Math.sqrt(CHI_SQUARE_95);
  const cx = Math.cos(angle) * radius;
  const cy = Math.sin(angle) * radius;
  return [MEAN_CROWD + l11 * cx, MEAN_WAIT + l21 * cx + l22 * cy];
});

export const S1V: React.FC = () => {
  const {rise, sweep, currentLine} = useLines();
  const rect = {x: 680, y: 290, w: 660, h: 490};
  const shift = sweep(4, 0.02, 0.25);
  const yDomain: [number, number] = [mix(0, -45, shift), 115];
  const points = toPixels(rect, UNIT_DOMAIN, yDomain, CROWD, WAIT);
  const ellipse = toPixels(rect, UNIT_DOMAIN, yDomain, ELLIPSE.map((p) => p[0]), ELLIPSE.map((p) => p[1]));
  const zeroY = toPixels(rect, UNIT_DOMAIN, yDomain, [0], [0])[0][1];
  const focus = (line: number) => (currentLine === line ? 1 : 0.45);
  return (
    <>
      <Canvas>
        <PlotFrame rect={rect} xDomain={UNIT_DOMAIN} yDomain={yDomain} xTicks={UNIT_TICKS} yTicks={shift > 0.5 ? [0, 50, 100] : WAIT_TICKS} xLabel="混雑率" yLabel="待ち時間（分）" format={format1} />
        <clipPath id="s1v-clip">
          <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
        </clipPath>
        <g clipPath="url(#s1v-clip)" opacity={rise(0)}>
          <rect x={rect.x} y={zeroY} width={rect.w} height={400} fill={COLOR.warning} opacity={0.22 * shift} />
          <line x1={rect.x} x2={rect.x + rect.w} y1={zeroY} y2={zeroY} stroke={COLOR.subText} strokeWidth={2} opacity={shift} />
          <Dots points={points} />
          <polygon points={ellipse.map((p) => p.join(',')).join(' ')} fill="none" stroke={COLOR.warning} strokeWidth={5} strokeDasharray="14 10" opacity={rise(4, 20)} />
        </g>
        <g opacity={rise(1) * focus(1) * (1 - shift * 0.6)}>
          <Histogram counts={CROWD_COUNTS} maxCount={MAX_COUNT} rect={{x: rect.x, y: 175, w: rect.w, h: 100}} side="top" color={COLOR.orange} />
        </g>
        <g opacity={rise(2) * focus(2) * (1 - shift)}>
          <Histogram counts={WAIT_COUNTS} maxCount={MAX_COUNT} rect={{x: rect.x + rect.w + 14, y: rect.y, w: 110, h: rect.h}} side="right" color={COLOR.orange} />
        </g>
        <SvgText x={rect.x + rect.w / 2} y={zeroY + 104} size={SIZE.small} color={COLOR.warning} weight={700} opacity={rise(4, 30)}>
          待ち時間がマイナス？
        </SvgText>
      </Canvas>
      <Box x={SIZE.sideMargin} y={200} w={450}>
        <Reveal line={1}>
          <Card accent={COLOR.orange} style={{fontSize: 36, padding: '18px 26px'}}>
            <b>混雑率</b>
            <Label>0〜1 に収まる山の形</Label>
          </Card>
        </Reveal>
        <Reveal line={2} style={{marginTop: 26}}>
          <Card accent={COLOR.orange} style={{fontSize: 36, padding: '18px 26px'}}>
            <b>待ち時間</b>
            <Label>短い時間が多く、
              <br />
              長いほうへすそを引く
            </Label>
          </Card>
        </Reveal>
        <Reveal line={3} style={{marginTop: 26}}>
          <Card accent={COLOR.blue} style={{fontSize: 36, padding: '18px 26px'}}>
            <b>つながり</b>
            <Label>混んでいるほど
              <br />
              待ち時間が長い
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={1490} y={330} w={350}>
        <Reveal line={4}>
          <Card accent={COLOR.warning} style={{fontSize: 36, padding: '18px 26px'}}>
            <b>正規分布を
              <br />
              当てはめると</b>
            <Label>点線の楕円が、
              <br />
              ありえない範囲に
              <br />
              はみ出す
            </Label>
          </Card>
        </Reveal>
      </Box>
      <Box x={1490} y={800} w={380}>
        <Label color={COLOR.muted} size={26}>
          ※ 説明用の架空データ（400件）
        </Label>
      </Box>
    </>
  );
};
