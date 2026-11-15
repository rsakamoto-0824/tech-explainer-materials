// fonts.ts — 数式（KaTeX）の文字を、描き始める前に読み込む。
import 'katex/dist/katex.min.css';
import { continueRender, delayRender } from 'remotion';

const KATEX_FONTS = [
  '20px KaTeX_Main',
  'bold 20px KaTeX_Main',
  'italic 20px KaTeX_Main',
  'italic 20px KaTeX_Math',
  '20px KaTeX_AMS',
  '20px KaTeX_Caligraphic',
  '20px KaTeX_Size1',
  '20px KaTeX_Size2',
  '20px KaTeX_Size3',
  '20px KaTeX_Size4',
];

const handle = delayRender('KaTeX の文字を読み込む');
Promise.all(KATEX_FONTS.map((font) => document.fonts.load(font)))
  .catch(() => undefined)
  .then(() => continueRender(handle));
