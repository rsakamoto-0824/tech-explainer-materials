// 全場面に共通の部品：背景、見出し、進み具合の帯、字幕、現れる動き、カード
import type React from 'react';
import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {CHAPTERS} from '../script.ts';
import {CHAPTER_COLORS, COLOR, FONT, SIZE} from '../theme.ts';
import {SCENE_LAYOUTS, TOTAL_FRAMES, useLines} from '../timeline.ts';

export const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: COLOR.background,
      backgroundImage: `radial-gradient(ellipse at 50% 35%, #152342 0%, ${COLOR.background} 55%, ${COLOR.backgroundDeep} 100%)`,
    }}
  />
);

// 画面上端の進み具合の帯（章の区切りに印を付ける）
export const ProgressBar: React.FC<{sceneFrom: number}> = ({sceneFrom}) => {
  const frame = useCurrentFrame();
  const progress = (sceneFrom + frame) / TOTAL_FRAMES;
  const chapterStarts = SCENE_LAYOUTS.filter(
    (layout, index) => index > 0 && layout.def.chapter !== SCENE_LAYOUTS[index - 1].def.chapter,
  ).map((layout) => layout.from / TOTAL_FRAMES);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: SIZE.width, height: 8, backgroundColor: COLOR.grid}}>
      <div style={{width: `${progress * 100}%`, height: 8, backgroundColor: COLOR.blue}} />
      {chapterStarts.map((start) => (
        <div
          key={start}
          style={{position: 'absolute', left: `${start * 100}%`, top: 0, width: 3, height: 8, backgroundColor: COLOR.background}}
        />
      ))}
    </div>
  );
};

// 見出し：章番号の札、「理論」「図解」の札、場面の題名
export const Header: React.FC = () => {
  const {layout} = useLines();
  const frame = useCurrentFrame();
  const {chapter, kind, title} = layout.def;
  const color = CHAPTER_COLORS[chapter];
  const chapterLabel = chapter >= 1 && chapter <= 8 ? `第${chapter}章` : CHAPTERS[chapter];
  return (
    <div
      style={{
        position: 'absolute',
        left: SIZE.sideMargin,
        top: 44,
        width: SIZE.width - SIZE.sideMargin * 2,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        fontFamily: FONT,
        opacity: interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      }}
    >
      <div
        style={{
          backgroundColor: color,
          color: COLOR.backgroundDeep,
          fontSize: 32,
          fontWeight: 700,
          padding: '8px 22px',
          borderRadius: 10,
          whiteSpace: 'nowrap',
        }}
      >
        {chapterLabel}
      </div>
      {kind ? (
        <div
          style={{
            border: `3px solid ${color}`,
            color: COLOR.text,
            fontSize: 30,
            fontWeight: 600,
            padding: '6px 20px',
            borderRadius: 10,
            whiteSpace: 'nowrap',
          }}
        >
          {kind}
        </div>
      ) : null}
      <Interactive.Div name="場面の題名" style={{color: COLOR.text, fontSize: 54, fontWeight: 700, whiteSpace: 'nowrap'}}>
        {title}
      </Interactive.Div>
    </div>
  );
};

// 字幕を2行以内に収める。句読点の後ろで折り返し、収まらなければ文字を小さくする
const CAPTION_TEXT_WIDTH = SIZE.width - 300 - 100;
const CAPTION_FONT_SIZES = [SIZE.caption, 40, 36, 32];
const splitCaption = (text: string, maxChars: number) => {
  const segments = text.match(/[^、。]+[、。]?/g) ?? [text];
  const lines: string[] = [];
  let current = '';
  for (const segment of segments) {
    if (current && (current + segment).length > maxChars) {
      lines.push(current);
      current = '';
    }
    current += segment;
  }
  if (current) lines.push(current);
  return lines;
};
const layoutCaption = (text: string) => {
  for (const fontSize of CAPTION_FONT_SIZES) {
    const maxChars = Math.floor(CAPTION_TEXT_WIDTH / fontSize);
    const lines = splitCaption(text, maxChars);
    if (lines.length <= 2 && lines.every((line) => line.length <= maxChars)) return {fontSize, lines};
  }
  return {fontSize: 32, lines: splitCaption(text, 60)};
};

// 字幕（いま読んでいる行を出す）
export const Caption: React.FC = () => {
  const {layout, currentLine, frame} = useLines();
  if (currentLine < 0) return null;
  const {fontSize, lines} = layoutCaption(layout.def.lines[currentLine].text);
  const start = layout.lineStarts[currentLine];
  return (
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: SIZE.captionTop,
        width: SIZE.width - 300,
        height: SIZE.captionHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8, 13, 24, 0.82)',
        border: `2px solid ${COLOR.panelLine}`,
        borderRadius: 18,
        boxSizing: 'border-box',
        fontFamily: FONT,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        color: COLOR.text,
        whiteSpace: 'nowrap',
        opacity: interpolate(frame, [start, start + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      }}
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
};

// 行 line が始まったら、下からふわっと現れる
export const Reveal: React.FC<{
  line: number;
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({line, delay = 0, style, children}) => {
  const {rise} = useLines();
  const progress = rise(line, delay);
  return <div style={{opacity: progress, translate: `0px ${(1 - progress) * 24}px`, ...style}}>{children}</div>;
};

// 行 line を読んでいるあいだだけ明るくする度合い（0〜1）。以降は少し落ち着かせる
export const Card: React.FC<{
  accent?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({accent = COLOR.blue, style, children}) => (
  <div
    style={{
      backgroundColor: COLOR.panel,
      border: `2px solid ${COLOR.panelLine}`,
      borderLeft: `10px solid ${accent}`,
      borderRadius: 16,
      padding: '22px 34px',
      boxSizing: 'border-box',
      fontFamily: FONT,
      color: COLOR.text,
      fontSize: SIZE.body,
      lineHeight: 1.45,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{color?: string; size?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  color = COLOR.subText,
  size = SIZE.small,
  style,
  children,
}) => <div style={{fontFamily: FONT, fontSize: size, color, fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap', ...style}}>{children}</div>;

// 絶対位置に置く箱
export const Box: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({x, y, w, h, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, ...style}}>{children}</div>
);
