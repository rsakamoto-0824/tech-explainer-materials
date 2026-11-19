// はじめに（題名、ポイント）と第1章（1つずつ動かす方法の落とし穴）
import type React from 'react';
import {Interactive} from 'remotion';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, Histogram, histogram, makeScale, Marker, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, makeRandomPoints, PRODUCT} from '../lib/data.ts';
import {CHAPTERS, LAST_NUMBERED_CHAPTER, VIDEO_SUBTITLE, VIDEO_TITLE} from '../script.ts';
import {CHAPTER_COLORS, COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {divergingColor, INPUT_COLORS, MiniSquare, NumberBadge} from './shared.tsx';

// 分散の内訳（石上関数）。題名の場面と第3章で使う
export const ISHIGAMI_PARTS = [
  {label: 'X₁だけ', share: ISHIGAMI.first[0], color: INPUT_COLORS[0]},
  {label: 'X₂だけ', share: ISHIGAMI.first[1], color: INPUT_COLORS[1]},
  {label: 'X₁とX₃の交互作用', share: ISHIGAMI.s13, color: INPUT_COLORS[2]},
];

// 題名の場面：右に、分散が入力ごとに分かれていく帯
export const S00: React.FC = () => {
  const {rise, sweep} = useLines();
  const barX = 1230;
  const barY = 250;
  const barW = 170;
  const barH = 560;
  const split = sweep(1, 0.1, 0.7);
  let cursor = 0;
  return (
    <>
      <Box x={SIZE.sideMargin} y={250} w={1060}>
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
          <Interactive.Div name="副題" style={{fontFamily: FONT, fontSize: 52, fontWeight: 600, color: COLOR.subText, marginTop: 40, lineHeight: 1.5}}>
            {VIDEO_SUBTITLE}
          </Interactive.Div>
        </Reveal>
      </Box>
      <Canvas>
        <g opacity={rise(0, 10)}>
          <SvgText x={barX + barW / 2} y={barY - 40} size={SIZE.small} color={COLOR.text} weight={700}>
            出力の分散
          </SvgText>
          <rect x={barX} y={barY} width={barW} height={barH} rx={10} fill={COLOR.subText} opacity={0.35 * (1 - split)} />
          {ISHIGAMI_PARTS.map((part) => {
            const top = barY + cursor * barH;
            const height = part.share * barH;
            cursor += part.share;
            return (
              <g key={part.label} opacity={split}>
                <rect x={barX} y={top + 3} width={barW} height={height - 6} rx={8} fill={part.color} />
                <SvgText x={barX + barW + 30} y={top + height / 2 - 18} anchor="start" size={34} color={COLOR.text} weight={700}>
                  {part.label}
                </SvgText>
                <SvgText x={barX + barW + 30} y={top + height / 2 + 22} anchor="start" size={34} color={part.color} weight={800}>
                  {`${Math.round(part.share * 100)}%`}
                </SvgText>
              </g>
            );
          })}
        </g>
      </Canvas>
    </>
  );
};

const POINTS = [
  {title: '感度 ＝ 出力の分散のうち、各入力が説明する割合', color: COLOR.blue},
  {title: '一次効果と総合効果の差で、交互作用が分かる', color: COLOR.orange},
  {title: '行列の列を入れかえて、指数をまとめて推定する', color: COLOR.aqua},
];

export const S01: React.FC = () => (
  <>
    {POINTS.map((point, index) => (
      <Box key={point.title} x={SIZE.sideMargin} y={200 + index * 215} w={1080}>
        <Reveal line={index + 1}>
          <Card accent={point.color} style={{height: 185, display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{fontSize: 84, fontWeight: 800, color: point.color, width: 70, textAlign: 'center'}}>{index + 1}</div>
            <div style={{fontSize: 43, fontWeight: 700, lineHeight: 1.45}}>{point.title}</div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1230} y={200} w={600}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{padding: '24px 30px', height: 615}}>
          <div style={{fontSize: 36, fontWeight: 700, color: COLOR.subText, marginBottom: 14}}>全{LAST_NUMBERED_CHAPTER}章</div>
          {CHAPTERS.slice(1, LAST_NUMBERED_CHAPTER + 1).map((chapter, index) => (
            <div key={chapter} style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 33, fontWeight: 600, height: 72, whiteSpace: 'nowrap'}}>
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

const UNIFORM_PREVIEW = makeRandomPoints(70, 5);

// 小さな一様分布の箱（入力のばらつきの絵）
const UniformIcon: React.FC<{color: string}> = ({color}) => (
  <svg width={110} height={56} style={{display: 'block'}}>
    <rect x={8} y={14} width={94} height={34} fill={color} opacity={0.5} rx={3} />
    <line x1={2} x2={108} y1={48} y2={48} stroke={COLOR.muted} strokeWidth={2} />
  </svg>
);

export const S1T: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      {/* 入力 → モデル → 出力 */}
      <Box x={SIZE.sideMargin} y={175} w={1740}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 34, fontFamily: FONT, color: COLOR.text}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {['X₁', 'X₂', 'X₃'].map((name, i) => (
                <div key={name} style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 36, fontWeight: 700}}>
                  <span style={{width: 60}}>{name}</span>
                  <UniformIcon color={INPUT_COLORS[i]} />
                </div>
              ))}
            </div>
            <div style={{fontSize: 70, color: COLOR.subText}}>→</div>
            <Card accent={COLOR.muted} style={{padding: '22px 40px', textAlign: 'center'}}>
              <div style={{fontSize: 46, fontWeight: 800}}>モデル Y = f(X)</div>
              <Label style={{marginTop: 6}}>シミュレーション・回帰式など</Label>
            </Card>
            <div style={{fontSize: 70, color: COLOR.subText}}>→</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <span style={{fontSize: 40, fontWeight: 800}}>Y</span>
              <svg width={200} height={110}>
                <path d="M5 105 C 50 105, 60 15, 100 15 C 140 15, 150 105, 195 105 Z" fill={COLOR.highlight} opacity={0.55} />
                <line x1={0} x2={200} y1={105} y2={105} stroke={COLOR.muted} strokeWidth={2} />
              </svg>
            </div>
            <Label color={COLOR.highlight} size={36}>
              入力の不確かさが
              <br />
              出力にどう伝わるか
            </Label>
          </div>
        </Reveal>
      </Box>
      {/* 局所感度 */}
      <Box x={SIZE.sideMargin} y={420} w={850}>
        <Reveal line={2}>
          <Card accent={COLOR.subText} style={{height: 440}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
              <MiniSquare size={170}>
                <line x1={30} x2={140} y1={85} y2={85} stroke={COLOR.highlight} strokeWidth={4} />
                <line x1={85} x2={85} y1={30} y2={140} stroke={COLOR.highlight} strokeWidth={4} />
                <circle cx={85} cy={85} r={10} fill={COLOR.highlight} stroke={COLOR.backgroundDeep} strokeWidth={3} />
              </MiniSquare>
              <div>
                <div style={{fontSize: 42, fontWeight: 800}}>局所感度</div>
                <Label style={{marginTop: 4}}>基準の点から1つずつ動かす</Label>
                <div style={{marginTop: 14}}>
                  <Tex tex="\left.\dfrac{\partial Y}{\partial X_i}\right|_{\,x = x^{0}}" size={44} />
                </div>
              </div>
            </div>
            <div style={{marginTop: 22, opacity: rise(3)}}>
              <Label color={COLOR.warning} size={33}>
                ✕ 基準の点の近くしか見ない
              </Label>
              <Label color={COLOR.warning} size={33} style={{marginTop: 6}}>
                ✕ 入力どうしの交互作用を見落とす
              </Label>
            </div>
          </Card>
        </Reveal>
      </Box>
      {/* 大域的感度 */}
      <Box x={980} y={420} w={850}>
        <Reveal line={4}>
          <Card accent={COLOR.blue} style={{height: 440}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
              <MiniSquare size={170} points={UNIFORM_PREVIEW} />
              <div>
                <div style={{fontSize: 42, fontWeight: 800}}>大域的感度解析</div>
                <Label style={{marginTop: 4}}>入力を範囲全体でばらつかせる</Label>
              </div>
            </div>
            <div style={{marginTop: 30, fontSize: 38, fontWeight: 700, lineHeight: 1.5}}>
              <span style={{color: COLOR.blue}}>Sobol感度解析</span>
              <br />
              ＝ 分散にもとづく代表的な方法
            </div>
          </Card>
        </Reveal>
      </Box>
    </>
  );
};

// 図解：Y = X1 × X2 の色の地図と、1つずつ動かしたときの道のり
const HEAT_CELLS = 36;
const HEAT_RECT = {x: 230, y: 265, w: 520, h: 520};
const HIST_RECT = {x: 1150, y: 260, w: 600, h: 420};
const PRODUCT_BINS = 24;
const PRODUCT_COUNTS = histogram(PRODUCT.ys, -1, 1, PRODUCT_BINS);
const PRODUCT_MAX = Math.max(...PRODUCT_COUNTS);

export const S1V: React.FC = () => {
  const {rise, sweep} = useLines();
  const sx = makeScale(-1, 1, HEAT_RECT.x, HEAT_RECT.x + HEAT_RECT.w);
  const sy = makeScale(-1, 1, HEAT_RECT.y + HEAT_RECT.h, HEAT_RECT.y);
  const cell = HEAT_RECT.w / HEAT_CELLS;
  // 行2の前半で X1 を、後半で X2 を動かす
  const moveX1 = sweep(2, 0.1, 0.45);
  const moveX2 = sweep(2, 0.55, 0.9);
  const x1 = moveX1 < 1 ? Math.sin(moveX1 * Math.PI * 2) * 0.9 : 0;
  const x2 = moveX1 >= 1 ? Math.sin(moveX2 * Math.PI * 2) * 0.9 : 0;
  const samples = rise(4, 0, 40);
  const shownCount = Math.round(samples * 400);
  const samplePoints: [number, number][] = PRODUCT.xs.slice(0, shownCount).map(([a, b]) => [sx(a), sy(b)]);
  return (
    <>
      <Box x={SIZE.sideMargin} y={170} w={900}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <Tex tex="Y = X_1 \times X_2" size={46} color={COLOR.text} />
            <Label>X₁, X₂ は −1〜1 で均等にばらつく</Label>
          </div>
        </Reveal>
      </Box>
      <Canvas>
        <g opacity={rise(1)}>
          {Array.from({length: HEAT_CELLS}, (_, i) =>
            Array.from({length: HEAT_CELLS}, (_, j) => {
              const a = -1 + ((i + 0.5) * 2) / HEAT_CELLS;
              const b = -1 + ((j + 0.5) * 2) / HEAT_CELLS;
              return (
                <rect
                  key={`${i}-${j}`}
                  x={HEAT_RECT.x + i * cell}
                  y={HEAT_RECT.y + HEAT_RECT.h - (j + 1) * cell}
                  width={cell + 0.5}
                  height={cell + 0.5}
                  fill={divergingColor(a * b)}
                />
              );
            }),
          )}
          <rect x={HEAT_RECT.x} y={HEAT_RECT.y} width={HEAT_RECT.w} height={HEAT_RECT.h} fill="none" stroke={COLOR.panelLine} strokeWidth={2} />
          <SvgText x={HEAT_RECT.x + HEAT_RECT.w / 2} y={HEAT_RECT.y + HEAT_RECT.h + 34} size={SIZE.axisLabel} color={COLOR.text}>
            X₁
          </SvgText>
          <SvgText x={HEAT_RECT.x - 40} y={HEAT_RECT.y + HEAT_RECT.h / 2} size={SIZE.axisLabel} color={COLOR.text}>
            X₂
          </SvgText>
          {[-1, 1].map((v) => (
            <g key={v}>
              <SvgText x={sx(v)} y={HEAT_RECT.y + HEAT_RECT.h + 34}>
                {v === -1 ? '−1' : '1'}
              </SvgText>
              <SvgText x={HEAT_RECT.x - 22} y={sy(v)} anchor="end">
                {v === -1 ? '−1' : '1'}
              </SvgText>
            </g>
          ))}
          <rect x={HEAT_RECT.x + HEAT_RECT.w + 40} y={HEAT_RECT.y + HEAT_RECT.h - 92} width={26} height={26} rx={4} fill={COLOR.orange} />
          <SvgText x={HEAT_RECT.x + HEAT_RECT.w + 80} y={HEAT_RECT.y + HEAT_RECT.h - 79} anchor="start" size={28} color={COLOR.text} weight={700}>
            Y 大
          </SvgText>
          <rect x={HEAT_RECT.x + HEAT_RECT.w + 40} y={HEAT_RECT.y + HEAT_RECT.h - 46} width={26} height={26} rx={4} fill={COLOR.blue} />
          <SvgText x={HEAT_RECT.x + HEAT_RECT.w + 80} y={HEAT_RECT.y + HEAT_RECT.h - 33} anchor="start" size={28} color={COLOR.text} weight={700}>
            Y 小
          </SvgText>
        </g>
        {/* 1つずつ動かす */}
        <g opacity={rise(2) * (1 - rise(4))}>
          <line x1={sx(-0.9)} x2={sx(0.9)} y1={sy(0)} y2={sy(0)} stroke={COLOR.highlight} strokeWidth={3} strokeDasharray="10 8" opacity={moveX1 > 0 ? 1 : 0} />
          <line x1={sx(0)} x2={sx(0)} y1={sy(-0.9)} y2={sy(0.9)} stroke={COLOR.highlight} strokeWidth={3} strokeDasharray="10 8" opacity={moveX2 > 0 ? 1 : 0} />
          <Marker x={sx(x1)} y={sy(x2)} r={14} />
          <SvgText x={HEAT_RECT.x + HEAT_RECT.w + 40} y={HEAT_RECT.y + 60} anchor="start" size={36} color={COLOR.highlight} weight={800}>
            {`Y = ${(x1 * x2).toFixed(2).replace('-0.00', '0.00')}`}
          </SvgText>
        </g>
        <Dots points={samplePoints} r={4.5} color={COLOR.highlight} opacity={0.75 * samples} />
        {/* 右：同時にばらつかせたときの Y の分布 */}
        <g opacity={rise(4)}>
          <PlotFrame
            rect={HIST_RECT}
            xDomain={[-1, 1]}
            yDomain={[0, PRODUCT_MAX * 1.1]}
            xTicks={[-1, -0.5, 0, 0.5, 1]}
            xLabel="Y の値"
            title="2つを同時にばらつかせたときの Y"
            format={(v) => String(v).replace('-', '−')}
          />
          <Histogram
            counts={PRODUCT_COUNTS}
            maxCount={PRODUCT_MAX * 1.1}
            rect={HIST_RECT}
            side="top"
            color={COLOR.highlight}
            grow={rise(4, 10, 30)}
          />
        </g>
      </Canvas>
      {/* 1つずつ動かした判定 */}
      <Box x={1000} y={330} w={830}>
        <Reveal line={3} style={{opacity: rise(3) * (1 - rise(4))}}>
          <Card accent={COLOR.warning}>
            <div style={{fontSize: 38, fontWeight: 800}}>1つずつ動かす方法の判定</div>
            <div style={{marginTop: 16, fontSize: 40, fontWeight: 700}}>
              X₁ の効果 ＝ <span style={{color: COLOR.warning}}>0</span>
              <br />
              X₂ の効果 ＝ <span style={{color: COLOR.warning}}>0</span>
            </div>
          </Card>
        </Reveal>
      </Box>
      <Box x={1000} y={790} w={830}>
        <Reveal line={5}>
          <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
            <Tex tex="\mathrm{Var}(Y) = 1/9 \approx 0.11 > 0" size={42} color={COLOR.text} />
            <Label color={COLOR.highlight}>→ 分散に注目する</Label>
          </div>
        </Reveal>
      </Box>
    </>
  );
};
