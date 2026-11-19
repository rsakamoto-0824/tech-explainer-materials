// 画面の色・文字・大きさ。グラフの3色（青・オレンジ・青緑）は、背景 #0e1626 の上で色覚の違いも含めて検証済み
export const COLOR = {
  background: '#0e1626',
  backgroundDeep: '#0a101d',
  panel: '#16213a',
  panelLine: '#2c3b5e',
  grid: '#24314f',
  text: '#f2f5fa',
  subText: '#b4c0d4',
  muted: '#7887a3',
  blue: '#4a94ee',
  orange: '#e56a35',
  aqua: '#22ad7c',
  highlight: '#f2c14e',
  warning: '#e66767',
};

// 章ごとの見出しの色（青・オレンジ・青緑を順に使う）
export const CHAPTER_COLORS = [
  COLOR.blue,
  COLOR.blue,
  COLOR.orange,
  COLOR.aqua,
  COLOR.blue,
  COLOR.orange,
  COLOR.aqua,
  COLOR.blue,
  COLOR.orange,
  COLOR.aqua,
];

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

export const SIZE = {
  width: 1920,
  height: 1080,
  sideMargin: 90,
  headerHeight: 150,
  captionTop: 892,
  captionHeight: 150,
  heading: 54,
  body: 42,
  small: 34,
  axisLabel: 30,
  tick: 26,
  caption: 44,
};
