// はじめに（題名、ポイント）と第1章（大域的感度解析と例題）
import type React from 'react';
import {Interactive} from 'remotion';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, PlotFrame} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, makeRandomPoints, SCATTER} from '../lib/data.ts';
import {CHAPTERS, LAST_NUMBERED_CHAPTER, VIDEO_SUBTITLE, VIDEO_TITLE} from '../script.ts';
import {CHAPTER_COLORS, COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {
  Chip,
  format2,
  formatAxis,
  INPUT_COLORS,
  INPUT_NAMES,
  ISHIGAMI_TEX,
  MiniSquare,
  NumberBadge,
  PI_DOMAIN,
  PI_TICKS,
  SCATTER_RECTS,
  toPixels,
  VIEWPOINTS,
  Y_DOMAIN,
  Y_TICKS,
} from './shared.tsx';

// 題名の場面：右に、5つの見方と6つの手法が順に並ぶ
export const S00: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={250} w={1000}>
        <Reveal line={0}>
          <Label color={COLOR.blue} size={40}>
            統計入門｜理論と図解で学ぶ
          </Label>
        </Reveal>
        <Reveal line={0} delay={6}>
          <Interactive.Div name="題名" style={{fontFamily: FONT, fontSize: 124, fontWeight: 800, color: COLOR.text, marginTop: 28, lineHeight: 1.2}}>
            {VIDEO_TITLE}
          </Interactive.Div>
        </Reveal>
        <Reveal line={0} delay={14}>
          <Interactive.Div name="副題" style={{fontFamily: FONT, fontSize: 50, fontWeight: 600, color: COLOR.subText, marginTop: 40, lineHeight: 1.5}}>
            {VIDEO_SUBTITLE}
          </Interactive.Div>
        </Reveal>
      </Box>
      <Box x={1170} y={210} w={660}>
        {VIEWPOINTS.map((item, index) => (
          <div key={item.view} style={{opacity: rise(1, index * 8), translate: `${(1 - rise(1, index * 8)) * 30}px 0px`, marginBottom: 22}}>
            <Card accent={item.color} style={{display: 'flex', alignItems: 'center', gap: 26, padding: '18px 28px', height: 112}}>
              <div style={{fontSize: 30, fontWeight: 700, color: item.color, width: 140, whiteSpace: 'nowrap'}}>{item.view}</div>
              <div style={{fontSize: 38, fontWeight: 800, whiteSpace: 'nowrap'}}>{item.methods}</div>
            </Card>
          </div>
        ))}
      </Box>
    </>
  );
};

const POINTS = [
  {title: '手法は「何を感度とみなすか」で分かれる', sub: '傾き・要素効果・分散・分布・微分', color: COLOR.blue},
  {title: '計算回数が少ないほど、分かることも限られる', sub: '数百回から1万回以上まで', color: COLOR.orange},
  {title: '入力が多いときは、ふるい分けてから分散で', sub: 'Morris法・DGSM → Sobol法', color: COLOR.aqua},
];

export const S01: React.FC = () => (
  <>
    {POINTS.map((point, index) => (
      <Box key={point.title} x={SIZE.sideMargin} y={200 + index * 215} w={1080}>
        <Reveal line={index + 1}>
          <Card accent={point.color} style={{height: 185, display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{fontSize: 84, fontWeight: 800, color: point.color, width: 70, textAlign: 'center'}}>{index + 1}</div>
            <div>
              <div style={{fontSize: 42, fontWeight: 700, lineHeight: 1.4, whiteSpace: 'nowrap'}}>{point.title}</div>
              <Label style={{marginTop: 8}}>{point.sub}</Label>
            </div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1230} y={200} w={600}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{padding: '24px 30px', height: 615}}>
          <div style={{fontSize: 36, fontWeight: 700, color: COLOR.subText, marginBottom: 14}}>全{LAST_NUMBERED_CHAPTER}章</div>
          {CHAPTERS.slice(1, LAST_NUMBERED_CHAPTER + 1).map((chapter, index) => (
            <div key={chapter} style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 31, fontWeight: 600, height: 72, whiteSpace: 'nowrap'}}>
              <NumberBadge color={CHAPTER_COLORS[index + 1]}>{index + 1}</NumberBadge>
              {chapter}
            </div>
          ))}
        </Card>
      </Reveal>
    </Box>
  </>
);

// ---- 第1章 ----

const GLOBAL_PREVIEW = makeRandomPoints(60, 5);

const STEPS = ['入力の分布を決める', '入力の組を作る', 'モデルを計算する', '感度の指標を求める'];
const STEP_DIFFERS = [false, true, false, true];
const PURPOSES = [
  {title: '順位をつける', sub: 'どの入力が一番効くか', color: COLOR.blue},
  {title: 'ふるい分ける', sub: '効かない入力を固定する', color: COLOR.orange},
  {title: '中身を調べる', sub: '曲がり・交互作用・分布の形', color: COLOR.aqua},
];

export const S1T: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={170} w={1740}>
        <Reveal line={0}>
          <Card accent={COLOR.muted} style={{display: 'flex', alignItems: 'center', gap: 40, height: 210}}>
            <div style={{flex: 1}}>
              <div style={{fontSize: 40, fontWeight: 800}}>感度解析</div>
              <Label style={{marginTop: 8}} color={COLOR.text}>
                入力の不確かさが、出力の不確かさにどう伝わるか
              </Label>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: rise(1)}}>
              <div style={{textAlign: 'center'}}>
                <MiniSquare size={130}>
                  <line x1={25} x2={105} y1={65} y2={65} stroke={COLOR.subText} strokeWidth={4} />
                  <line x1={65} x2={65} y1={25} y2={105} stroke={COLOR.subText} strokeWidth={4} />
                  <circle cx={65} cy={65} r={9} fill={COLOR.subText} />
                </MiniSquare>
                <Label size={26}>局所的（1点のまわり）</Label>
              </div>
              <div style={{fontSize: 46, color: COLOR.subText}}>→</div>
              <div style={{textAlign: 'center'}}>
                <MiniSquare size={130} points={GLOBAL_PREVIEW} color={COLOR.blue} />
                <Label size={26} color={COLOR.blue}>
                  大域的（範囲全体）
                </Label>
              </div>
            </div>
          </Card>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={420} w={1740}>
        <Reveal line={2}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            {STEPS.map((step, index) => (
              <div key={step} style={{display: 'flex', alignItems: 'center', gap: 18}}>
                <div
                  style={{
                    width: 380,
                    height: 130,
                    borderRadius: 16,
                    border: `3px solid ${STEP_DIFFERS[index] && rise(3) > 0.5 ? COLOR.highlight : COLOR.panelLine}`,
                    backgroundColor: COLOR.panel,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT,
                    color: COLOR.text,
                  }}
                >
                  <div style={{fontSize: 26, color: COLOR.muted, fontWeight: 700}}>{`手順${index + 1}`}</div>
                  <div style={{fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap'}}>{step}</div>
                  {STEP_DIFFERS[index] ? (
                    <div style={{fontSize: 24, color: COLOR.highlight, fontWeight: 700, opacity: rise(3)}}>手法で違う</div>
                  ) : null}
                </div>
                {index < STEPS.length - 1 ? <div style={{fontSize: 44, color: COLOR.subText}}>→</div> : null}
              </div>
            ))}
          </div>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={610} w={1740}>
        <Reveal line={4}>
          <div style={{display: 'flex', gap: 30}}>
            {PURPOSES.map((purpose) => (
              <Card key={purpose.title} accent={purpose.color} style={{flex: 1, height: 230}}>
                <Label size={28}>目的</Label>
                <div style={{fontSize: 42, fontWeight: 800, marginTop: 4}}>{purpose.title}</div>
                <Label style={{marginTop: 12}} color={COLOR.text}>
                  {purpose.sub}
                </Label>
              </Card>
            ))}
          </div>
        </Reveal>
      </Box>
    </>
  );
};

// 図解：石上関数の散布図
const SCATTER_PIXELS = [0, 1, 2].map((i) =>
  toPixels(
    SCATTER_RECTS[i],
    PI_DOMAIN,
    Y_DOMAIN,
    SCATTER.xs.map((x) => x[i]),
    SCATTER.ys,
  ),
);

export const S1V: React.FC = () => {
  const {rise, currentLine} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={1740}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <Tex tex={ISHIGAMI_TEX} size={46} color={COLOR.text} />
            <Label>石上関数（Ishigami & Homma 1990）</Label>
          </div>
        </Reveal>
        <Reveal line={1}>
          <Label style={{marginTop: 4}}>X₁, X₂, X₃ は −π〜π で均等にばらつく ／ 1000組</Label>
        </Reveal>
      </Box>
      <Canvas>
        {SCATTER_RECTS.map((rect, i) => {
          const focused = currentLine === i + 2;
          const dim = currentLine >= 2 && currentLine <= 4 && !focused ? 0.35 : 1;
          return (
            <g key={i} opacity={rise(1, i * 6) * dim}>
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
              <Dots points={SCATTER_PIXELS[i]} r={3.5} color={INPUT_COLORS[i]} opacity={0.6} />
              {focused ? (
                <rect x={rect.x - 6} y={rect.y - 6} width={rect.w + 12} height={rect.h + 12} rx={10} fill="none" stroke={COLOR.highlight} strokeWidth={4} />
              ) : null}
            </g>
          );
        })}
        {/* X3 の両端の広がり */}
        <g opacity={rise(4) * (currentLine === 4 ? 1 : 0)}>
          {[-1, 1].map((side) => {
            const rect = SCATTER_RECTS[2];
            const x = side < 0 ? rect.x + 8 : rect.x + rect.w - 78;
            return <rect key={side} x={x} y={rect.y + 8} width={70} height={rect.h - 16} rx={8} fill="none" stroke={COLOR.highlight} strokeWidth={3} strokeDasharray="10 7" />;
          })}
        </g>
      </Canvas>
      <Box x={SIZE.sideMargin} y={760} w={1740}>
        <Reveal line={5}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <Label color={COLOR.text} size={36}>
              正解（分散で測った総合効果）
            </Label>
            {ISHIGAMI.totalEffect.map((value, i) => (
              <Chip key={i} color={INPUT_COLORS[i]} size={36}>
                {`${INPUT_NAMES[i]}  ${format2(value)}`}
              </Chip>
            ))}
          </div>
        </Reveal>
      </Box>
    </>
  );
};
