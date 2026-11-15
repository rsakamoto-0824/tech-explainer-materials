// 数式（KaTeX）。フォントの読み込みが終わるまで、書き出しを待たせる
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type React from 'react';
import {useMemo} from 'react';
import {continueRender, delayRender} from 'remotion';

const KATEX_FONTS = [
  '16px KaTeX_Main',
  'bold 16px KaTeX_Main',
  'italic 16px KaTeX_Main',
  'italic 16px KaTeX_Math',
  '16px KaTeX_Size1',
  '16px KaTeX_Size2',
  '16px KaTeX_Size3',
  '16px KaTeX_Size4',
  '16px KaTeX_AMS',
];

if (typeof document !== 'undefined') {
  const handle = delayRender('KaTeX のフォントを読み込む');
  Promise.all(KATEX_FONTS.map((font) => document.fonts.load(font)))
    .catch(() => undefined)
    .then(() => continueRender(handle));
}

export const Tex: React.FC<{tex: string; size?: number; color?: string; style?: React.CSSProperties}> = ({
  tex,
  size = 48,
  color,
  style,
}) => {
  const html = useMemo(() => katex.renderToString(tex, {throwOnError: true, displayMode: false, output: 'html'}), [tex]);
  return <span style={{fontSize: size, color, whiteSpace: 'nowrap', ...style}} dangerouslySetInnerHTML={{__html: html}} />;
};
