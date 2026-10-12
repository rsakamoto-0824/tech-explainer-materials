// ベイズ最適化解説資料（PowerPoint）を pptxgenjs で生成する。
// 使い方: node build_deck.js <出力パス>
// 前提: demo_results.json（demo_bayesian_optimization.py の出力）と formulas/（render_formulas.py の出力）が同じフォルダにある。

const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const BASE_DIR = __dirname;
const OUTPUT_PATH = process.argv[2] || path.join(BASE_DIR, 'out', 'deck_raw.pptx');
const demo = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'demo_results.json'), 'utf8'));
const formulaSizes = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'formulas', 'formulas.json'), 'utf8'));

// ---- 定数 ----
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const FONT = 'BIZ UDGothic';
const CODE_FONT = 'Courier New';

const C = {
  night: '0E2A38',
  teal: '146C7C',
  tealLight: '7FB7BE',
  tealPale: 'CFE6E8',
  tint: 'ECF5F6',
  coral: 'E4572E',
  coralTint: 'FBE3DA',
  gold: 'D9A021',
  goldTint: 'F8EDD0',
  ink: '1C2B33',
  muted: '5B6B73',
  line: 'B7C6CC',
  grid: 'E3EAEC',
  gray: 'F1F4F5',
  randomGray: '8C99A0',
  white: 'FFFFFF',
  onDarkSub: 'CFE0E4',
};

const fmt2 = (v) => v.toFixed(2);
const pct1 = (v) => (v * 100).toFixed(1);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = 'ベイズ最適化入門';
pres.lang = 'ja-JP';

let pageNumber = 0;

// ---- 文字の補助関数 ----

// "x_{1}" の形を下付き文字のランに変換する
function parseRich(text, baseOptions = {}) {
  const runs = [];
  const pattern = /_\{([^}]*)\}/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), options: { ...baseOptions } });
    runs.push({ text: match[1], options: { ...baseOptions, subscript: true } });
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), options: { ...baseOptions } });
  return runs;
}

function toRuns(item, baseOptions = {}) {
  if (typeof item === 'string') return parseRich(item, baseOptions);
  if (Array.isArray(item)) return item.flatMap((part) => toRuns(part, baseOptions));
  // 改行指定は、下付き文字で分かれたランの最後だけに付ける
  const { text, breakLine, ...rest } = item;
  const runs = parseRich(text, { ...baseOptions, ...rest });
  if (breakLine && runs.length) runs[runs.length - 1].options.breakLine = true;
  return runs;
}

function addText(slide, content, x, y, w, h, options = {}) {
  const runs = typeof content === 'string' && !content.includes('_{') ? content : toRuns(content);
  slide.addText(runs, {
    x, y, w, h,
    fontFace: FONT, fontSize: 15, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...options,
  });
}

// 段落の配列を、箇条書き（または通常段落）のランに変換する
function paragraphs(items, { bullet = true, space = 8, indent = 16, color, fontSize, bold } = {}) {
  const runs = [];
  items.forEach((item, index) => {
    const base = {};
    if (color) base.color = color;
    if (fontSize) base.fontSize = fontSize;
    if (bold) base.bold = true;
    const itemRuns = toRuns(item, base);
    itemRuns.forEach((run, j) => {
      if (j === 0) {
        run.options.bullet = bullet ? { indent } : false;
        run.options.paraSpaceAfter = space;
      }
      if (j === itemRuns.length - 1 && index < items.length - 1) run.options.breakLine = true;
    });
    runs.push(...itemRuns);
  });
  return runs;
}

function addBullets(slide, items, x, y, w, h, options = {}) {
  const { bullet, space, indent, ...textOptions } = options;
  slide.addText(paragraphs(items, { bullet, space, indent, color: textOptions.color, fontSize: textOptions.fontSize }), {
    x, y, w, h,
    fontFace: FONT, fontSize: 15, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...textOptions,
  });
}

// ---- 図形の補助関数 ----

function addCard(slide, x, y, w, h, { fill = C.tint, line, radius = 0.1, shadow = false } = {}) {
  const options = {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill },
    line: line ? { color: line, width: 1 } : { color: fill, width: 0.5 },
  };
  if (shadow) options.shadow = { type: 'outer', color: '000000', opacity: 0.12, blur: 6, offset: 2, angle: 90 };
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, options);
}

function addRect(slide, x, y, w, h, fill, lineColor) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { color: lineColor || fill, width: lineColor ? 1 : 0.5 },
  });
}

// 始点・終点から、正の長さと回転角で線を描く（負の幅・高さを使わない）
function addLine(slide, x1, y1, x2, y2, { color = C.line, width = 1.5, dash, arrow = false } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const lineOptions = { color, width };
  if (dash) lineOptions.dashType = dash;
  if (arrow) lineOptions.endArrowType = 'triangle';
  slide.addShape(pres.shapes.LINE, {
    x: (x1 + x2) / 2 - length / 2, y: (y1 + y2) / 2, w: length, h: 0,
    rotate: angle, line: lineOptions,
  });
}

function addNode(slide, cx, cy, diameter, fill, label, { color = C.white, fontSize = 16, lineColor } = {}) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - diameter / 2, y: cy - diameter / 2, w: diameter, h: diameter,
    fill: { color: fill }, line: { color: lineColor || fill, width: lineColor ? 1.25 : 0.5 },
  });
  if (label) {
    addText(slide, label, cx - diameter / 2, cy - diameter / 2, diameter, diameter, {
      align: 'center', valign: 'middle', fontSize, bold: true, color,
    });
  }
}

function addFormula(slide, key, x, y, { scale = 1, alt = '' } = {}) {
  const size = formulaSizes[key];
  if (!size) throw new Error(`数式画像がありません: ${key}`);
  slide.addImage({
    path: path.join(BASE_DIR, 'formulas', size.file),
    x, y, w: size.w * scale, h: size.h * scale, altText: alt || key,
  });
  return { w: size.w * scale, h: size.h * scale };
}

function formulaSize(key, scale = 1) {
  const size = formulaSizes[key];
  return { w: size.w * scale, h: size.h * scale };
}

// ---- スライド共通 ----

function newContentSlide(kicker, title, notes) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  addText(slide, kicker, MARGIN_X, 0.36, 9, 0.3, { fontSize: 12, bold: true, color: C.teal, charSpacing: 1 });
  addText(slide, title, MARGIN_X, 0.64, CONTENT_W, 0.72, { fontSize: 28, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (notes) slide.addNotes(notes);
  return slide;
}

function addSource(slide, text) {
  addText(slide, text, MARGIN_X, 7.02, 10.8, 0.3, { fontSize: 9.5, color: C.muted });
}

function chartBase() {
  return {
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
    catAxisLineShow: true, catAxisLineColor: C.line,
    valAxisLineShow: false,
    valGridLine: { color: C.grid, size: 0.75 },
    catGridLine: { style: 'none' },
    dataLabelFontFace: FONT, titleFontFace: FONT, legendFontFace: FONT,
    catAxisTitleFontFace: FONT, valAxisTitleFontFace: FONT,
    titleColor: C.ink, titleFontSize: 13,
    legendFontSize: 11, legendColor: C.ink,
  };
}


// ---- ベイズ最適化の図の補助関数 ----

const Z95 = 1.96;               // 95%区間の幅（標準偏差の倍数）
const GRID_LABEL_STEP = 40;     // 201点の横軸のうち、ラベルを出す間隔（0.2 ごと）
const LOG_AXIS_FLOOR = 1e-4;    // 対数軸の下端（これ未満は下端に表示）

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
}

// 観測点を横軸の格子に置いた系列（該当しない点は空欄）
function pointsOnGrid(grid, xs, ys) {
  const step = grid[1] - grid[0];
  const values = grid.map(() => null);
  xs.forEach((x, k) => { values[Math.round((x - grid[0]) / step)] = ys[k]; });
  return values;
}

// ガウス過程の予測（95%区間の帯・予測平均・真の関数・観測点）を1つのグラフにする
function addGpChart(slide, box, { grid, mean, std, trueValues, obsX, obsY, nextX, title, yRange }) {
  const labels = grid.map((v) => v.toFixed(2));
  const lower = mean.map((m, i) => m - Z95 * std[i]);
  const width = std.map((s) => 2 * Z95 * s);
  const types = [
    { type: pres.charts.AREA, data: [{ name: '帯の下端', labels, values: lower }, { name: '95%区間', labels, values: width }], options: { barGrouping: 'stacked', chartColors: ['transparent', C.tealPale] } },
    { type: pres.charts.LINE, data: [{ name: '真の関数', labels, values: trueValues }], options: { chartColors: [C.randomGray], lineSize: 1.5, lineDash: 'dash', lineDataSymbol: 'none' } },
    { type: pres.charts.LINE, data: [{ name: '予測平均', labels, values: mean }], options: { chartColors: [C.teal], lineSize: 2.5, lineDataSymbol: 'none' } },
    { type: pres.charts.LINE, data: [{ name: '観測点', labels, values: pointsOnGrid(grid, obsX, obsY) }], options: { chartColors: [C.ink], lineSize: 0, lineDataSymbol: 'circle', lineDataSymbolSize: 7 } },
  ];
  if (nextX !== undefined) {
    const nextValues = pointsOnGrid(grid, [nextX], [yRange.min + (yRange.max - yRange.min) * 0.04]);
    types.push({ type: pres.charts.LINE, data: [{ name: '次の点', labels, values: nextValues }], options: { chartColors: [C.coral], lineSize: 0, lineDataSymbol: 'triangle', lineDataSymbolSize: 10 } });
  }
  slide.addChart(types, {
    ...box,
    ...chartBase(),
    showTitle: Boolean(title), title: title || '',
    catAxisLabelFrequency: GRID_LABEL_STEP, catAxisLabelRotate: 0, catAxisMajorTickMark: 'none',
    valAxisMinVal: yRange.min, valAxisMaxVal: yRange.max, valAxisMajorUnit: yRange.unit, valAxisLabelFormatCode: '0',
    showLegend: false, displayBlanksAs: 'gap',
  });
}

// グラフの外に置く凡例（帯・線・点を図形で描く）
function addLegend(slide, x, y, items, { gap = 0.25, fontSize = 11 } = {}) {
  let cx = x;
  items.forEach(({ label, kind, color, width }) => {
    if (kind === 'band') addRect(slide, cx, y + 0.07, 0.34, 0.18, color);
    if (kind === 'line') addLine(slide, cx, y + 0.16, cx + 0.34, y + 0.16, { color, width: 2.5 });
    if (kind === 'dash') addLine(slide, cx, y + 0.16, cx + 0.34, y + 0.16, { color, width: 1.5, dash: 'dash' });
    if (kind === 'dot') addNode(slide, cx + 0.17, y + 0.16, 0.13, color);
    if (kind === 'triangle') {
      slide.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: cx + 0.09, y: y + 0.07, w: 0.16, h: 0.16, fill: { color }, line: { color, width: 0.5 } });
    }
    addText(slide, label, cx + 0.42, y, width, 0.32, { fontSize, color: C.ink, valign: 'middle' });
    cx += 0.42 + width + gap;
  });
}

const GP_LEGEND = [
  { label: '予測平均', kind: 'line', color: C.teal, width: 0.85 },
  { label: '95%区間（不確かさ）', kind: 'band', color: C.tealPale, width: 1.75 },
  { label: '真の関数', kind: 'dash', color: C.randomGray, width: 0.85 },
  { label: '観測点', kind: 'dot', color: C.ink, width: 0.65 },
];

// 予測の帯と観測点を自由曲線で描く（表紙・まとめの装飾）
function addBandMotif(slide, box, gpDemo, { bandColor, lineColor, dotColor }) {
  const grid = demo.bo1d.grid;
  const upper = gpDemo.mean.map((m, i) => m + Z95 * gpDemo.std[i]);
  const lower = gpDemo.mean.map((m, i) => m - Z95 * gpDemo.std[i]);
  const yMax = Math.max(...upper);
  const yMin = Math.min(...lower);
  const toX = (v) => v * box.w;
  const toY = (v) => box.h - ((v - yMin) / (yMax - yMin)) * box.h;
  const bandPoints = [
    ...grid.map((g, i) => ({ x: toX(g), y: toY(upper[i]) })),
    ...grid.map((g, i) => ({ x: toX(g), y: toY(lower[i]) })).reverse(),
    { close: true },
  ];
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { ...box, points: bandPoints, fill: { color: bandColor }, line: { color: bandColor, width: 0.5 } });
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    ...box, points: grid.map((g, i) => ({ x: toX(g), y: toY(gpDemo.mean[i]) })),
    fill: { type: 'none' }, line: { color: lineColor, width: 2.25 },
  });
  gpDemo.obs_x.forEach((x, k) => addNode(slide, box.x + toX(x), box.y + toY(gpDemo.obs_y[k]), 0.16, dotColor));
}

const gpDemo = demo.gp_demo;
const bo1d = demo.bo1d;
const branin = demo.branin;
const FORRESTER_RANGE = { min: -10, max: 20, unit: 5 };

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, '機械学習 × 実験計画', 0.8, 1.35, 7, 0.4, { fontSize: 15, bold: true, color: C.tealLight, charSpacing: 2 });
  addText(slide, 'ベイズ最適化入門', 0.8, 1.8, 7.8, 1.0, { fontSize: 48, bold: true, color: C.white, valign: 'middle' });
  addText(slide, withBreaks(['少ない試行で、', '最適な条件を効率よく見つける']), 0.8, 3.0, 7.4, 1.1, { fontSize: 22, color: C.onDarkSub, lineSpacingMultiple: 1.15 });
  addText(slide, 'ガウス過程と獲得関数の仕組みから実務での使い方まで、合成データのデモとともに解説', 0.8, 4.45, 7.0, 0.8, { fontSize: 14, color: C.tealLight });
  addText(slide, '2026年9月22日', 0.8, 6.45, 4, 0.35, { fontSize: 13, color: C.onDarkSub });
  addBandMotif(slide, { x: 8.4, y: 1.7, w: 4.3, h: 3.4 }, gpDemo, { bandColor: '23505F', lineColor: C.tealLight, dotColor: C.coral });
  addText(slide, '予測（線）と不確かさ（帯）から、次に試す点を決める', 8.1, 5.4, 4.9, 0.6, { fontSize: 12, color: C.onDarkSub, align: 'center' });
  slide.addNotes([
    'この資料では、ベイズ最適化を基礎から解説します。',
    'ベイズ最適化は、1回の評価に時間や費用がかかる問題で、できるだけ少ない試行回数で最適な条件を見つけるための方法です。',
    '実験条件の最適化や、機械学習のハイパーパラメータ調整などで広く使われています。',
    '後半では、1次元の例で動きを追い、2次元のベンチマーク関数でランダム探索と比べるデモを行います。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で分かること
// =====================================================================
{
  const slide = newContentSlide('INTRODUCTION', 'この資料で分かること', [
    '全体は6つのパートです。',
    'まず、ベイズ最適化がどんな問題に向いていて、どういう考え方の方法なのかを説明します。',
    '次に、中心となる2つの部品、ガウス過程回帰と獲得関数を順に説明します。',
    'そのあとデモで、1次元の例で動き方を見て、2次元の例でランダム探索と性能を比べます。',
    '最後に、実務で出てくる拡張、注意点、ツールとコード例をまとめます。',
  ].join('\n'));
  const items = [
    ['ベイズ最適化とは', '評価に時間・費用がかかる最適化を、少ない回数で解く'],
    ['ガウス過程回帰', '予測と「不確かさ」を同時に出す代理モデル'],
    ['獲得関数', '探索と活用のバランスで、次の1点を選ぶ'],
    ['デモ', '1次元で動きを見る、2次元でランダム探索と比べる'],
    ['実務への拡張と注意点', 'ノイズ・制約・多目的・高次元、実験計画法との関係'],
    ['ツールと使い方', 'MATLAB・Python のツール、コード例、活用イメージ'],
  ];
  const colX = [MARGIN_X, 6.95];
  const rowY = [1.75, 3.15, 4.55];
  items.forEach(([title, desc], i) => {
    const x = colX[Math.floor(i / 3)];
    const y = rowY[i % 3];
    addNode(slide, x + 0.33, y + 0.42, 0.66, C.teal, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.9, y + 0.05, 4.9, 0.45, { fontSize: 19, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.9, y + 0.55, 4.9, 0.4, { fontSize: 14, color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.tint });
  addText(slide, '想定する読者：平均・分散・正規分布・回帰分析の基本を知っている人。この資料では「小さいほど良い値を最小化する」問題で説明します。',
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 3. 高コストなブラックボックス最適化
// =====================================================================
{
  const slide = newContentSlide('1  ベイズ最適化とは', '対象となる問題：評価に手間がかかるブラックボックス', [
    'ベイズ最適化が対象とするのは、条件 x を決めて評価すると結果 y が得られるけれど、その関係を表す式が分からない問題です。これをブラックボックス関数と呼びます。',
    '特徴は3つあります。1つ目は、1回の評価に時間や費用がかかることです。実験なら数時間から数日、シミュレーションでも数時間かかることがあります。',
    '2つ目は、式が分からないため、傾き、つまり勾配が使えないことです。3つ目は、同じ条件でも結果にばらつきがあることです。',
    'このような問題では、試せる回数が数十回程度に限られるので、1回1回をどこで試すかが非常に重要になります。',
  ].join('\n'));
  // 上：入力 → ブラックボックス → 出力
  const y = 1.7;
  const h = 1.25;
  addCard(slide, MARGIN_X, y, 3.2, h, { fill: C.tint });
  addText(slide, [{ text: '条件 x', bold: true, color: C.teal, fontSize: 17, breakLine: true }, { text: '温度・時間・圧力など', fontSize: 13 }], MARGIN_X, y, 3.2, h, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addCard(slide, 4.75, y - 0.1, 3.85, h + 0.2, { fill: C.night });
  addText(slide, [{ text: 'ブラックボックス f(x)', bold: true, color: C.white, fontSize: 17, breakLine: true }, { text: '実験・シミュレーション（中身の式は不明）', fontSize: 12.5, color: C.onDarkSub }], 4.75, y - 0.1, 3.85, h + 0.2, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addCard(slide, SLIDE_W - MARGIN_X - 3.2, y, 3.2, h, { fill: C.coralTint });
  addText(slide, [{ text: '評価値 y', bold: true, color: C.coral, fontSize: 17, breakLine: true }, { text: '寸法誤差・歩留まり・精度など', fontSize: 13 }], SLIDE_W - MARGIN_X - 3.2, y, 3.2, h, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addLine(slide, MARGIN_X + 3.25, y + h / 2, 4.7, y + h / 2, { color: C.ink, width: 2, arrow: true });
  addLine(slide, 8.65, y + h / 2, SLIDE_W - MARGIN_X - 3.25, y + h / 2, { color: C.ink, width: 2, arrow: true });

  const cards = [
    ['評価に時間・費用がかかる', '実験1回に数時間〜数日、シミュレーションでも数時間。試せる回数は数十回程度に限られる'],
    ['式が分からない', '入力と出力の関係式がないため、傾き（勾配）を使った最適化ができない'],
    ['結果にばらつきがある', '同じ条件でも、測定誤差や装置の状態で結果が少し変わる'],
  ];
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const cy = 3.35;
  const ch = 2.3;
  cards.forEach(([title, desc], i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, cy, cardW, ch, { fill: C.gray });
    addNode(slide, x + 0.45, cy + 0.45, 0.5, C.teal, String(i + 1), { fontSize: 16 });
    addText(slide, title, x + 0.85, cy + 0.2, cardW - 1.0, 0.5, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, cy + 0.9, cardW - 0.55, 1.3, { fontSize: 13.5 });
  });
  addText(slide, [
    { text: '使われる例：', bold: true, color: C.teal },
    { text: '工程条件の最適化、機械学習のハイパーパラメータ調整、材料・配合の探索、シミュレーションの設計パラメータ探索' },
  ], MARGIN_X, 5.95, CONTENT_W, 0.7, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 4. 従来の方法との比較
// =====================================================================
{
  const slide = newContentSlide('1  ベイズ最適化とは', 'よく使われる探索方法との比較', [
    '最適な条件を探す、よく使われる方法と比べます。',
    'グリッドサーチは全ての組み合わせを試す方法で、変数が増えると回数が爆発します。例えば5つの変数をそれぞれ10水準で調べると10万回です。',
    'ランダムサーチは、過去の結果を次に活かしません。',
    '実験計画法と応答曲面法は、計画した点をまとめて試し、2次式などで近似します。広く使われている方法ですが、近似式の形に結果が縛られ、途中の結果を見て計画を変えることは基本的にしません。',
    '勾配法や遺伝的アルゴリズムは、勾配が必要だったり、数百回以上の評価が必要だったりします。',
    'ベイズ最適化は、それまでの全ての結果を使って次の1点を選ぶので、少ない回数で良い条件にたどり着きやすいのが特長です。ただし変数が多すぎると苦手です。',
  ].join('\n'));
  const header = ['方法', '考え方', '評価回数', '弱点'];
  const rows = [
    ['グリッドサーチ', '各変数を等間隔に分け、全ての組み合わせを試す', '水準数の変数個乗（例：5変数×10水準で10万回）', '変数が増えると回数が爆発する'],
    ['ランダムサーチ', '範囲内でランダムに試す', '多い', '過去の結果を次に活かさない'],
    ['実験計画法＋応答曲面', '計画した点をまとめて試し、2次式などで近似する', '中程度', '近似式の形に縛られる。途中で計画を変えない'],
    ['勾配法', '傾きをたどって下っていく', '少〜中', '勾配が必要。局所解に止まる'],
    ['遺伝的アルゴリズム等', '候補の集団を少しずつ改良する', '多い（数百〜数千）', '1回の評価が高いと使えない'],
    ['ベイズ最適化', 'それまでの全結果から、次の1点を賢く選ぶ', '少ない（数十）', '変数が多い（目安20超）と苦手'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.teal } } })),
    ...rows.map((r, i) => r.map((cell, j) => ({
      text: cell, options: { bold: j === 0 || (i === 5 && j === 2), color: j === 0 ? C.teal : C.ink, fill: { color: i === 5 ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [2.55, 4.1, 2.85, 2.6],
    fontFace: FONT, fontSize: 13, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72],
  });
  addSource(slide, '出典：Bergstra & Bengio (2012)、Frazier (2018)。評価回数は目安');
}

// =====================================================================
// 5. ベイズ最適化の考え方
// =====================================================================
{
  const slide = newContentSlide('1  ベイズ最適化とは', 'ベイズ最適化の考え方：3つのステップをくり返す', [
    'ベイズ最適化の流れは、3つのステップのくり返しです。',
    'まず、これまでの評価結果から代理モデルを作ります。代理モデルは、まだ試していない条件での結果を予測し、同時にその予測にどれくらい自信がないか、つまり不確かさも出します。代表はガウス過程です。',
    '次に、獲得関数と呼ばれる基準で、次に試す点を1つ選びます。良い結果が出そうな場所と、まだよく分からない場所のバランスをとります。',
    'そして実際に評価し、結果をデータに加えて、また代理モデルを作り直します。',
    '名前の「ベイズ」は、関数についての事前の考えを、データで更新していくベイズの考え方に由来します。',
  ].join('\n'));
  const box = (x, y, w, h, num, title, desc, fill, color) => {
    addCard(slide, x, y, w, h, { fill });
    addNode(slide, x + 0.4, y + 0.42, 0.46, color, String(num), { fontSize: 15 });
    addText(slide, title, x + 0.75, y + 0.18, w - 0.9, 0.48, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.25, y + 0.7, w - 0.45, h - 0.75, { fontSize: 12.5, color: C.ink });
  };
  box(1.95, 1.65, 3.4, 1.3, 1, '代理モデルを作る', 'これまでの結果から、予測と不確かさを出す（ガウス過程）', C.tint, C.teal);
  box(4.2, 4.35, 2.95, 1.45, 2, '次の点を選ぶ', '獲得関数で「良さそう」と「分からない」のバランスをとる', C.coralTint, C.coral);
  box(0.6, 4.35, 2.95, 1.45, 3, '評価する', '実験・シミュレーションを1回行い、結果を加える', C.gray, C.muted);
  addLine(slide, 4.6, 2.98, 5.6, 4.32, { color: C.ink, width: 2, arrow: true });
  addLine(slide, 4.17, 5.07, 3.58, 5.07, { color: C.ink, width: 2, arrow: true });
  addLine(slide, 2.05, 4.32, 2.65, 2.98, { color: C.ink, width: 2, arrow: true });
  addText(slide, 'くり返す', 2.75, 3.4, 1.8, 0.5, { fontSize: 15, bold: true, color: C.teal, align: 'center', valign: 'middle' });
  addText(slide, '予算（回数）がなくなるまで、または改善が止まるまで', 0.6, 6.0, 6.55, 0.35, { fontSize: 11.5, color: C.muted, align: 'center' });

  const rx = 7.65;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '「次に何を試すか」を計算で決める', rx, 1.65, rw, 0.45, { fontSize: 18, bold: true, color: C.teal });
  addBullets(slide, [
    '評価結果を1つずつ代理モデルに反映し、次の1点を選ぶ',
    '良さそうな場所（活用）と、まだ分からない場所（探索）のバランスをとる',
    '名前の由来：関数についての事前の考え（事前分布）を、データで更新する',
    '1回の評価が高いほど、計算で賢く選ぶ価値が大きい',
  ], rx, 2.25, rw, 3.2, { fontSize: 14.5, space: 10 });
  addCard(slide, rx, 5.55, rw, 1.15, { fill: C.tint });
  const next = formulaSize('next');
  addFormula(slide, 'next', rx + 0.3, 5.55 + (1.15 - next.h) / 2, { alt: 'x_{n+1} = argmax_x alpha(x | D_n)' });
  addText(slide, 'α：獲得関数', rx + 0.45 + next.w, 5.55, rw - next.w - 0.6, 1.15, { fontSize: 12.5, color: C.muted, valign: 'middle' });
}

// =====================================================================
// 6. 代理モデルに必要なこと
// =====================================================================
{
  const slide = newContentSlide('2  ガウス過程回帰', '代理モデルに必要なのは「予測」と「不確かさ」', [
    'ベイズ最適化の代理モデルには、予測値だけでなく、その予測の不確かさが必要です。',
    '普通の回帰モデルは予測値だけを出すので、どこがまだよく分かっていないのかが分かりません。そのため、予測が良い場所ばかり試してしまい、試していない場所にある本当の最適点を見逃します。',
    'ガウス過程は、予測値と不確かさを同時に出せます。観測した点の近くでは不確かさが小さく、離れると大きくなるので、未探索の場所を見つけられます。',
    'また、少ないデータでも柔軟に当てはまり、数百点程度までなら計算も軽いので、ベイズ最適化の代理モデルとして最もよく使われています。',
    'ランダムフォレストや、Optuna の既定である TPE という方法が使われることもあります。',
  ].join('\n'));
  const cardW = (CONTENT_W - 0.4) / 2;
  const cy = 1.65;
  const ch = 2.75;
  const specs = [
    { x: MARGIN_X, fill: C.gray, color: C.muted, title: '普通の回帰モデル', out: '出力：予測値だけ', items: ['どこがまだ分かっていないかが分からない', '予測の良い場所ばかり試し、未探索の場所の最適点を見逃す'] },
    { x: MARGIN_X + cardW + 0.4, fill: C.tint, color: C.teal, title: 'ガウス過程回帰', out: '出力：予測値 ＋ 不確かさ', items: ['観測点の近くは不確かさが小さく、離れると大きい', '未探索で「当たりかもしれない」場所を見つけられる'] },
  ];
  specs.forEach((s) => {
    addCard(slide, s.x, cy, cardW, ch, { fill: s.fill });
    addText(slide, s.title, s.x + 0.3, cy + 0.2, cardW - 0.6, 0.45, { fontSize: 18, bold: true, color: s.color, valign: 'middle' });
    addText(slide, s.out, s.x + 0.3, cy + 0.7, cardW - 0.6, 0.4, { fontSize: 14.5, bold: true });
    addBullets(slide, s.items, s.x + 0.3, cy + 1.25, cardW - 0.6, 1.4, { fontSize: 14, space: 8 });
  });
  addText(slide, 'ガウス過程が代理モデルに向いている理由', MARGIN_X, 4.7, CONTENT_W, 0.4, { fontSize: 15, bold: true, color: C.teal });
  const chips = ['少ないデータでも柔軟に当てはまる', '予測の不確かさを出せる', 'データ数百点程度までなら計算が軽い'];
  const chipW = 3.85;
  const chipGap = (CONTENT_W - chipW * 3) / 2;
  chips.forEach((t, i) => {
    const x = MARGIN_X + i * (chipW + chipGap);
    addCard(slide, x, 5.2, chipW, 0.75, { fill: C.teal, radius: 0.08 });
    addText(slide, t, x + 0.2, 5.2, chipW - 0.4, 0.75, { fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle' });
  });
  addText(slide, 'ほかの代理モデル：ランダムフォレスト（SMAC）、TPE（Optuna の既定）など', MARGIN_X, 6.2, CONTENT_W, 0.35, { fontSize: 12.5, color: C.muted });
}

// =====================================================================
// 7. ガウス過程とは
// =====================================================================
{
  const prior = demo.prior;
  const slide = newContentSlide('2  ガウス過程回帰', 'ガウス過程：「関数そのもの」の確率分布', [
    'ガウス過程は、関数そのものについての確率分布です。',
    '入力が近い点どうしは出力も近い値になりやすい、つまり相関が高い、という性質だけを仮定し、関数の具体的な形は決めません。その「近さ」を決めるのが、次のスライドで説明するカーネルです。',
    '下のグラフは、データを見る前のガウス過程、つまり事前分布から関数を3本ずつ引いたものです。',
    '左は長さスケールが0.08と短い場合で、細かく上下する関数になります。右は0.3と長い場合で、ゆったりした関数になります。',
    'データを観測すると、この関数の集まりのうち、データに合うものだけが残ります。それが事後分布で、ガウス過程回帰の予測になります。',
  ].join('\n'));
  addCard(slide, MARGIN_X, 1.55, CONTENT_W, 0.75, { fill: C.tint });
  const gpDef = formulaSize('gp_def');
  addFormula(slide, 'gp_def', MARGIN_X + 0.4, 1.55 + (0.75 - gpDef.h) / 2, { alt: 'f(x) ~ GP(m(x), k(x, x\'))' });
  addText(slide, 'm(x)：平均関数（ふつうは 0 や定数）　k(x, x′)：カーネル（入力の近さ → 出力の相関）', MARGIN_X + 0.7 + gpDef.w, 1.55, CONTENT_W - gpDef.w - 1.0, 0.75, { fontSize: 13, color: C.ink, valign: 'middle' });
  const labels = prior.x.map((v) => v.toFixed(2));
  const colors = [C.teal, C.coral, C.gold];
  const chartW = 5.95;
  [['0.08', '長さスケール ℓ = 0.08（短い → 細かく変動）'], ['0.3', '長さスケール ℓ = 0.3（長い → ゆったり変化）']].forEach(([key, title], i) => {
    slide.addChart(pres.charts.LINE, prior.samples[key].map((values, k) => ({ name: `関数${k + 1}`, labels, values })), {
      x: MARGIN_X + i * (chartW + 0.2), y: 2.5, w: chartW, h: 3.6,
      ...chartBase(),
      chartColors: colors, lineSize: 2, lineDataSymbol: 'none',
      showTitle: true, title,
      catAxisLabelFrequency: 20, catAxisLabelRotate: 0, catAxisMajorTickMark: 'none',
      valAxisMinVal: -3, valAxisMaxVal: 3, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0',
      showLegend: false,
    });
  });
  addText(slide, '事前分布から引いた関数の例（各3本、Matérn 5/2 カーネル）。データを観測すると、データに合う関数だけが残る＝事後分布', MARGIN_X, 6.25, CONTENT_W, 0.45, { fontSize: 12.5, color: C.muted });
}

// =====================================================================
// 8. カーネルとハイパーパラメータ
// =====================================================================
{
  const slide = newContentSlide('2  ガウス過程回帰', 'カーネルとハイパーパラメータ', [
    'カーネルは、2つの入力がどれくらい近いかから、出力の相関を決める関数です。',
    '代表的なのは、ガウスカーネルとも呼ばれる RBF カーネルと、Matérn カーネルです。RBF は非常に滑らかな関数を仮定します。Matérn 5/2 はそれよりも滑らかさの仮定がゆるく、実際の現象に合いやすいため、ベイズ最適化の既定としてよく使われます。',
    'カーネルには、長さスケール、振幅、ノイズの大きさという3種類のハイパーパラメータがあります。',
    'これらは、データの周辺尤度が最大になるように自動で決めます。デモでもこの方法を使っています。',
    '変数ごとに長さスケールを持たせると、長さスケールが非常に長い変数は結果にほとんど効いていない、と読み取ることもできます。',
  ].join('\n'));
  const lx = MARGIN_X;
  const lw = 6.2;
  addText(slide, 'RBF（ガウス）カーネル', lx, 1.6, lw, 0.35, { fontSize: 14, bold: true, color: C.teal });
  addFormula(slide, 'rbf', lx + 0.2, 2.0, { alt: 'RBF kernel' });
  addText(slide, 'とても滑らかな関数を仮定する', lx + 0.2, 2.8, lw, 0.3, { fontSize: 12.5, color: C.muted });
  addText(slide, 'Matérn 5/2 カーネル（r = ‖x − x′‖）', lx, 3.3, lw, 0.35, { fontSize: 14, bold: true, color: C.teal });
  addFormula(slide, 'matern', lx + 0.2, 3.7, { scale: Math.min(1, (lw - 0.3) / formulaSize('matern').w), alt: 'Matern 5/2 kernel' });
  addText(slide, '滑らかさの仮定がゆるく、ベイズ最適化の既定によく使われる', lx + 0.2, 4.55, lw, 0.3, { fontSize: 12.5, color: C.muted });

  const rx = 7.1;
  const rw = SLIDE_W - MARGIN_X - rx;
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  slide.addTable([
    [{ text: 'ハイパーパラメータ', options: { bold: true, color: C.white, fill: { color: C.teal } } }, { text: '意味', options: { bold: true, color: C.white, fill: { color: C.teal } } }],
    [{ text: '長さスケール ℓ', options: { bold: true, color: C.teal } }, { text: 'どれだけ離れると相関がなくなるか。短いほど細かく変動する' }],
    [{ text: toRuns('振幅 σ_{f}'), options: { bold: true, color: C.teal } }, { text: '関数がどれくらい大きく上下するか' }],
    [{ text: toRuns('ノイズ σ_{n}'), options: { bold: true, color: C.teal } }, { text: '同じ条件で測ったときの結果のばらつき' }],
  ], {
    x: rx, y: 1.6, w: rw, colW: [1.95, rw - 1.95],
    fontFace: FONT, fontSize: 13, valign: 'middle', margin: cellMargin, color: C.ink,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.78, 0.6, 0.6],
  });
  addBullets(slide, [
    '変数ごとに ℓ を持たせると（ARD）、ℓ が非常に長い変数は「ほとんど効いていない」と読める',
  ], rx, 4.25, rw, 0.8, { fontSize: 13, space: 4 });

  addCard(slide, MARGIN_X, 5.2, CONTENT_W, 1.5, { fill: C.gray });
  addText(slide, 'ハイパーパラメータ θ は、周辺尤度が最大になるように自動で決める（デモも同じ）', MARGIN_X + 0.3, 5.3, CONTENT_W - 0.6, 0.35, { fontSize: 13.5, bold: true, color: C.teal });
  const ll = formulaSize('loglik');
  addFormula(slide, 'loglik', MARGIN_X + (CONTENT_W - ll.w) / 2, 5.78, { alt: 'log marginal likelihood' });
  addSource(slide, '出典：Rasmussen & Williams (2006)、Snoek, Larochelle & Adams (2012)');
}

// =====================================================================
// 9. デモ①：ガウス過程回帰
// =====================================================================
{
  const slide = newContentSlide('2  ガウス過程回帰', 'デモ①：5点の観測からガウス過程で予測する', [
    '最初のデモです。Forrester 関数という、ベイズ最適化の説明によく使われる1次元の関数を使います。点線が真の関数で、x がおよそ0.76のところに最小値があります。',
    '5つの点だけを観測し、ガウス過程で予測しました。緑の線が予測の平均、薄い帯が95%の区間、つまり不確かさです。',
    '観測した点では帯がほぼ0になり、点から離れるほど帯が広がっています。',
    '特に注目してほしいのは、真の最小値がある0.76付近です。この付近には観測がないので、予測の平均は真の谷を再現できていません。一方で帯が広く、「この辺りに何かあるかもしれない」ことを示しています。',
    'この不確かさの情報を使って次の点を選ぶのが、次のパートの獲得関数です。',
  ].join('\n'));
  addGpChart(slide, { x: MARGIN_X, y: 1.5, w: 8.0, h: 4.75 }, {
    grid: bo1d.grid, mean: gpDemo.mean, std: gpDemo.std, trueValues: gpDemo.true, obsX: gpDemo.obs_x, obsY: gpDemo.obs_y,
    title: 'Forrester 関数と、5点から推定したガウス過程', yRange: FORRESTER_RANGE,
  });
  addLegend(slide, MARGIN_X + 0.3, 6.35, GP_LEGEND);
  const rx = 8.95;
  const rw = SLIDE_W - MARGIN_X - rx;
  addFormula(slide, 'forrester', rx, 1.65, { scale: Math.min(1, rw / formulaSize('forrester').w), alt: 'Forrester function' });
  addText(slide, '0 ≤ x ≤ 1、最小値は x ≈ 0.757 で −6.02', rx, 2.1, rw, 0.3, { fontSize: 11.5, color: C.muted });
  addBullets(slide, [
    '観測点では帯（不確かさ）がほぼ 0',
    '観測点から離れるほど帯が広い',
    [{ text: '真の最小値（x ≈ 0.76）付近', bold: true }, 'は観測がなく、平均は谷を再現できない。帯が広く「何かあるかも」を示す'],
  ], rx, 2.6, rw, 3.0, { fontSize: 14, space: 10 });
  addCard(slide, rx, 5.5, rw, 1.2, { fill: C.tint });
  addText(slide, withBreaks(['学習された長さスケール', `ℓ ≈ ${gpDemo.kernel.match(/length_scale=([0-9.]+)/)[1]}`]), rx + 0.25, 5.5, rw - 0.5, 1.2, { fontSize: 14, bold: true, color: C.teal, valign: 'middle' });
  addSource(slide, '関数の出典：Forrester, Sóbester & Keane (2008)');
}

// =====================================================================
// 10. 事後分布の式
// =====================================================================
{
  const slide = newContentSlide('2  ガウス過程回帰', 'ガウス過程回帰の予測式', [
    'ガウス過程回帰の予測は、式で直接計算できます。',
    '予測の平均は、観測値 y を、カーネルで決まる重みで足し合わせたものです。新しい点に近い観測ほど大きな重みを持ちます。',
    '予測の分散は、事前の分散から「観測によって分かった分」を引いたものです。観測点の近くではたくさん引かれるので小さくなり、遠くではほとんど引かれないので事前の大きさに戻ります。これが帯の太さの正体です。',
    '計算の中心は、観測点どうしのカーネルを並べた行列 K の逆行列です。データ数 n の3乗に比例して計算が重くなるため、データが数千点を超える場合は近似手法を使います。ベイズ最適化では通常データが少ないので問題になりません。',
  ].join('\n'));
  const specs = [
    ['予測の平均', 'post_mean', '観測値 y を、カーネルで決まる重みで足し合わせたもの。新しい点に近い観測ほど重みが大きい'],
    ['予測の分散（不確かさ）', 'post_var', '事前の分散から「観測で分かった分」を引いたもの。観測点の近くでは小さく、遠くでは事前の大きさに戻る'],
  ];
  specs.forEach(([title, key, desc], i) => {
    const y = 1.65 + i * 1.95;
    addCard(slide, MARGIN_X, y, CONTENT_W, 1.75, { fill: i === 0 ? C.tint : C.coralTint });
    addText(slide, title, MARGIN_X + 0.3, y + 0.18, 4.5, 0.4, { fontSize: 15, bold: true, color: i === 0 ? C.teal : C.coral });
    addFormula(slide, key, MARGIN_X + 0.4, y + 0.75, { alt: title });
    addText(slide, desc, 5.6, y + 0.2, SLIDE_W - MARGIN_X - 5.9, 1.35, { fontSize: 14, valign: 'middle' });
  });
  const cellMargin = [0.04, 0.12, 0.04, 0.12];
  slide.addTable([
    [{ text: '記号', options: { bold: true, fill: { color: C.gray } } }, { text: '意味', options: { bold: true, fill: { color: C.gray } } }],
    [{ text: 'K', options: { bold: true, color: C.teal } }, { text: '観測点どうしのカーネルの値を並べた n × n 行列' }],
    [{ text: toRuns('k_{*}'), options: { bold: true, color: C.teal } }, { text: '新しい点 x と各観測点とのカーネルの値を並べたベクトル' }],
    [{ text: toRuns('σ_{n}²'), options: { bold: true, color: C.teal } }, { text: '観測ノイズの分散' }],
  ], {
    x: MARGIN_X, y: 5.6, w: 7.2, colW: [1.0, 6.2],
    fontFace: FONT, fontSize: 12, valign: 'middle', margin: cellMargin, color: C.ink,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.29,
  });
  addText(slide, withBreaks(['計算量はデータ数 n の3乗に比例。', 'ベイズ最適化ではデータが少ないので通常は問題ない']), 8.1, 5.6, SLIDE_W - MARGIN_X - 8.1, 1.15, { fontSize: 13, color: C.ink, valign: 'middle' });
  addSource(slide, '出典：Rasmussen & Williams (2006) 第2章');
}

// =====================================================================
// 11. 探索と活用
// =====================================================================
{
  const slide = newContentSlide('3  獲得関数', '探索と活用のトレードオフ', [
    '次の点を選ぶときには、2つの考え方のバランスが問題になります。',
    '1つは活用です。今の予測が良い場所の近くを試します。確実に少し改善できますが、まだ調べていない場所にもっと良い条件があっても見逃します。',
    'もう1つは探索です。予測の不確かさが大きい、まだよく分からない場所を試します。大きな発見があるかもしれませんが、外れることもあります。',
    '獲得関数は、この2つのバランスを1つの数値にまとめたものです。この後説明する PI は活用寄り、EI はバランス型、LCB は係数 κ で探索の度合いを調整できます。',
  ].join('\n'));
  const cardW = (CONTENT_W - 0.4) / 2;
  const cy = 1.65;
  const ch = 2.9;
  const specs = [
    { x: MARGIN_X, fill: C.tint, color: C.teal, title: '活用（exploitation）', what: '今の予測が良い場所の近くを試す', good: '確実に少しずつ改善できる', bad: '未探索の場所の、もっと良い条件を見逃す' },
    { x: MARGIN_X + cardW + 0.4, fill: C.coralTint, color: C.coral, title: '探索（exploration）', what: '不確かさが大きい、よく分からない場所を試す', good: '大きな改善が見つかる可能性がある', bad: '外れて、評価を無駄にすることもある' },
  ];
  specs.forEach((s) => {
    addCard(slide, s.x, cy, cardW, ch, { fill: s.fill });
    addText(slide, s.title, s.x + 0.3, cy + 0.2, cardW - 0.6, 0.45, { fontSize: 18, bold: true, color: s.color, valign: 'middle' });
    addText(slide, s.what, s.x + 0.3, cy + 0.75, cardW - 0.6, 0.45, { fontSize: 15, bold: true });
    addText(slide, [{ text: '良い点：', bold: true, color: s.color }, { text: s.good }], s.x + 0.3, cy + 1.35, cardW - 0.6, 0.6, { fontSize: 14 });
    addText(slide, [{ text: '悪い点：', bold: true, color: C.muted }, { text: s.bad }], s.x + 0.3, cy + 2.0, cardW - 0.6, 0.7, { fontSize: 14 });
  });
  // 活用 ↔ 探索 のものさし
  const sy = 5.35;
  const sx0 = 1.6;
  const sx1 = 11.7;
  addLine(slide, sx0, sy, sx1, sy, { color: C.line, width: 3 });
  addText(slide, '活用寄り', MARGIN_X, sy - 0.18, 0.95, 0.36, { fontSize: 12.5, bold: true, color: C.teal, align: 'right' });
  addText(slide, '探索寄り', sx1 + 0.1, sy - 0.18, 1.0, 0.36, { fontSize: 12.5, bold: true, color: C.coral });
  const marks = [['PI', 0.18, C.teal, '改善する確率'], ['EI', 0.5, C.ink, '改善量の期待値'], ['LCB', 0.78, C.coral, 'κ で調整']];
  marks.forEach(([name, pos, color, desc]) => {
    const mx = sx0 + (sx1 - sx0) * pos;
    addNode(slide, mx, sy, 0.62, color, name, { fontSize: name.length > 2 ? 12 : 14 });
    addText(slide, desc, mx - 1.1, sy + 0.4, 2.2, 0.32, { fontSize: 12, color: C.muted, align: 'center' });
  });
  addText(slide, '獲得関数＝この2つのバランスを1つの数値にしたもの（位置は目安）', MARGIN_X, 6.35, CONTENT_W, 0.35, { fontSize: 13, color: C.ink, align: 'center' });
}

// =====================================================================
// 12. 代表的な獲得関数
// =====================================================================
{
  const slide = newContentSlide('3  獲得関数', '代表的な獲得関数：PI・EI・LCB', [
    '代表的な獲得関数を3つ紹介します。この資料では最小化問題で書いています。f* は、これまでに見つかった最良の値です。',
    'PI は、今の最良値を改善する確率です。改善の「大きさ」を考えないので、ほんの少しの改善でも確実な場所を選びやすく、活用寄りになります。',
    'EI は、改善量の期待値です。改善する確率と改善の大きさの両方を考えるので、バランスが良く、最もよく使われます。ガウス過程の予測は正規分布なので、式で簡単に計算できます。',
    'LCB は、予測の平均から不確かさの κ 倍を引いた、楽観的な見積もりです。κ を大きくするほど探索寄りになります。最大化問題では UCB と呼びます。',
    'ξ は、改善とみなす最小の幅で、少し大きくすると探索寄りになります。デモでは EI の ξ を0.01、LCB の κ を2にしています。',
  ].join('\n'));
  const cards = [
    { title: 'PI（改善確率）', keys: ['pi'], desc: '今の最良値 f* を改善する確率。改善の大きさを見ないので活用寄り', src: 'Kushner (1964)' },
    { title: 'EI（期待改善量）', keys: ['ei_def'], desc: '改善量の期待値。確率と大きさの両方を考え、最もよく使われる。正規分布なので式で計算できる', src: 'Jones, Schonlau & Welch (1998)' },
    { title: 'LCB（信頼下限）', keys: ['lcb'], desc: '楽観的な見積もり。κ が大きいほど探索寄り。最大化問題では UCB と呼ぶ', src: 'Srinivas ほか (2010)' },
  ];
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const cy = 1.6;
  const ch = 3.65;
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, cy, cardW, ch, { fill: i === 1 ? C.coralTint : C.tint });
    addText(slide, c.title, x + 0.3, cy + 0.2, cardW - 0.6, 0.45, { fontSize: 17, bold: true, color: i === 1 ? C.coral : C.teal, valign: 'middle' });
    const size = formulaSize(c.keys[0]);
    const scale = Math.min(1, (cardW - 0.4) / size.w);
    addFormula(slide, c.keys[0], x + (cardW - size.w * scale) / 2, cy + 0.85 + (0.8 - size.h * scale) / 2, { scale, alt: c.title });
    addText(slide, c.desc, x + 0.3, cy + 1.8, cardW - 0.6, 1.3, { fontSize: 13.5 });
    addText(slide, `出典：${c.src}`, x + 0.3, cy + ch - 0.42, cardW - 0.6, 0.3, { fontSize: 10.5, color: C.muted });
  });
  addCard(slide, MARGIN_X, 5.45, CONTENT_W, 1.3, { fill: C.gray });
  addText(slide, 'EI の計算式（ガウス過程の予測 μ, σ を使う）', MARGIN_X + 0.3, 5.5, 5, 0.35, { fontSize: 12.5, bold: true, color: C.coral });
  addFormula(slide, 'ei', MARGIN_X + 0.35, 5.88, { scale: 0.95, alt: 'EI closed form' });
  addText(slide, withBreaks(['f*：これまでの最良値　ξ：改善とみなす最小幅', 'Φ, φ：標準正規分布の累積分布・密度', 'デモの設定：ξ = 0.01（EI）、κ = 2（LCB）']), 6.3, 5.5, SLIDE_W - MARGIN_X - 6.5, 1.2, { fontSize: 12, color: C.ink, valign: 'middle' });
}

// =====================================================================
// 13. デモ②：EI の形
// =====================================================================
{
  const snap = bo1d.snapshots[0];
  const slide = newContentSlide('3  獲得関数', 'デモ②：期待改善量（EI）で次の点を選ぶ', [
    `2つ目のデモです。Forrester 関数で、x = ${snap.obs_x.join('、')} の3点から始めます。`,
    '上のグラフはこの3点から作ったガウス過程、下のグラフは期待改善量 EI です。',
    '今の最良点は x = 0.1 で、ここは実は局所的な谷です。EI が高いのは、この最良点の両側、つまり左端と x = 0.24 付近です。予測の平均が低く、しかも観測がないので不確かさもある場所です。',
    'x が0.45より大きい区間は、予測の平均が高い、つまり悪いと見込まれているので、EI はほぼ0です。真の最小値がある0.76付近も、3点しかないこの時点では有望とは見なされていません。',
    `EI が最大になるのは x = ${snap.next_x.toFixed(2)} で、ここが次に試す点になります。三角の印の位置です。`,
  ].join('\n'));
  const chartX = MARGIN_X;
  const chartW = 8.0;
  addGpChart(slide, { x: chartX, y: 1.45, w: chartW, h: 2.95 }, {
    grid: bo1d.grid, mean: snap.mean, std: snap.std, trueValues: bo1d.true, obsX: snap.obs_x, obsY: snap.obs_y, nextX: snap.next_x,
    title: '3点から推定したガウス過程', yRange: FORRESTER_RANGE,
  });
  const labels = bo1d.grid.map((v) => v.toFixed(2));
  const eiMax = Math.max(...snap.ei);
  slide.addChart([
    { type: pres.charts.AREA, data: [{ name: 'EI', labels, values: snap.ei }], options: { chartColors: [C.coralTint] } },
    { type: pres.charts.LINE, data: [{ name: 'EI', labels, values: snap.ei }], options: { chartColors: [C.coral], lineSize: 2, lineDataSymbol: 'none' } },
    { type: pres.charts.LINE, data: [{ name: '最大の点', labels, values: pointsOnGrid(bo1d.grid, [snap.next_x], [eiMax]) }], options: { chartColors: [C.coral], lineSize: 0, lineDataSymbol: 'triangle', lineDataSymbolSize: 11 } },
  ], {
    x: chartX, y: 4.45, w: chartW, h: 2.15,
    ...chartBase(),
    showTitle: true, title: '期待改善量 EI（大きいほど試す価値が高い）',
    catAxisLabelFrequency: GRID_LABEL_STEP, catAxisLabelRotate: 0, catAxisMajorTickMark: 'none',
    valAxisMinVal: 0, valAxisLabelFormatCode: '0.0', showLegend: false, displayBlanksAs: 'gap',
  });
  addLegend(slide, chartX + 0.3, 6.65, [...GP_LEGEND.slice(0, 2), GP_LEGEND[3], { label: '次に試す点（EI 最大）', kind: 'triangle', color: C.coral, width: 1.9 }], { fontSize: 10.5, gap: 0.2 });
  const rx = 8.95;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    [{ text: '最良点 x = 0.1 ', bold: true }, 'は実は局所的な谷'],
    [{ text: 'EI が高い場所：', bold: true }, '最良点の両側（左端と x ≈ 0.24）。予測が低く、不確かさもある'],
    [{ text: 'x > 0.45：', bold: true }, '予測が高い（悪い）ので EI ≈ 0。真の最小値 0.76 付近も、まだ有望と見なされていない'],
  ], rx, 1.6, rw, 2.75, { fontSize: 13.5, space: 9 });
  addCard(slide, rx, 4.45, rw, 1.6, { fill: C.coralTint });
  addText(slide, [{ text: '次に試す点', fontSize: 13, breakLine: true }, { text: `x = ${snap.next_x.toFixed(2)}`, fontSize: 28, bold: true, color: C.coral }], rx + 0.25, 4.45, rw - 0.5, 1.6, { valign: 'middle', paraSpaceAfter: 2 });
}

// =====================================================================
// 14. デモ③：ベイズ最適化の進み方
// =====================================================================
{
  const hist = bo1d.history;
  const last = hist[hist.length - 1];
  const slide = newContentSlide('4  デモ', 'デモ③：局所解から抜け出し、真の最小値にたどり着く', [
    '3つ目のデモでは、先ほどの3点からベイズ最適化を10回くり返しました。',
    '左は開始時です。最良点は局所的な谷の x = 0.1 付近です。',
    '中央は6回目の後です。しばらくは局所的な谷の周りを調べて少しずつ改善しましたが、そこを調べ尽くすと、EI は観測のない x ≈ 0.7 付近を指すようになりました。三角の印です。',
    `右は10回目の後です。真の最小値の近く x = ${last.best_x.toFixed(3)} で ${last.best_y.toFixed(3)} を見つけました。真の最小値は x = 0.757 で −6.021 なので、合計 ${last.n_obs} 回の評価でほぼ到達しています。`,
    '下のグラフは、評価回数ごとの最良値の推移です。7回目の評価の後、未探索の区間に移ったところで大きく改善しているのが分かります。',
  ].join('\n'));
  const panelW = 3.95;
  const panelGap = (CONTENT_W - panelW * 3) / 2;
  const captions = [
    ['開始時（3点）', '最良点は局所的な谷（x ≈ 0.1）'],
    ['6回目の後（9点）', '谷の周りを調べ尽くし、EI は未探索の x ≈ 0.7 を指す'],
    ['10回目の後（13点）', `真の最小値の近く（x = ${last.best_x.toFixed(3)}、${last.best_y.toFixed(2)}）に到達`],
  ];
  bo1d.snapshots.forEach((snap, i) => {
    const x = MARGIN_X + i * (panelW + panelGap);
    addGpChart(slide, { x, y: 1.45, w: panelW, h: 2.75 }, {
      grid: bo1d.grid, mean: snap.mean, std: snap.std, trueValues: bo1d.true, obsX: snap.obs_x, obsY: snap.obs_y,
      nextX: i < 2 ? snap.next_x : undefined, title: captions[i][0], yRange: FORRESTER_RANGE,
    });
    addText(slide, captions[i][1], x + 0.1, 4.2, panelW - 0.2, 0.5, { fontSize: 12, color: C.ink, align: 'center' });
  });
  const labels = hist.map((h) => String(h.n_obs));
  slide.addChart([
    { type: pres.charts.LINE, data: [{ name: 'それまでの最良値', labels, values: hist.map((h) => h.best_y) }], options: { chartColors: [C.teal], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6 } },
    { type: pres.charts.LINE, data: [{ name: '真の最小値（−6.02）', labels, values: hist.map(() => -6.02074) }], options: { chartColors: [C.coral], lineSize: 1.5, lineDash: 'dash', lineDataSymbol: 'none' } },
  ], {
    x: MARGIN_X, y: 4.75, w: 8.3, h: 2.05,
    ...chartBase(),
    showTitle: true, title: '評価回数ごとの最良値',
    catAxisTitle: '評価回数', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontSize: 10.5,
    valAxisMinVal: -7, valAxisMaxVal: 0, valAxisMajorUnit: 2, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'r', legendFontSize: 10.5,
  });
  addLegend(slide, 9.15, 4.85, [GP_LEGEND[0], GP_LEGEND[3]], { fontSize: 10.5, gap: 0.2 });
  addLegend(slide, 9.15, 5.2, [GP_LEGEND[1]], { fontSize: 10.5 });
  addLegend(slide, 9.15, 5.55, [{ label: '次に試す点', kind: 'triangle', color: C.coral, width: 1.1 }, GP_LEGEND[2]], { fontSize: 10.5, gap: 0.2 });
  addCard(slide, 9.15, 6.0, SLIDE_W - MARGIN_X - 9.15, 0.75, { fill: C.tint });
  addText(slide, `合計 ${last.n_obs} 回の評価で、真の最小値（−6.021）にほぼ到達`, 9.3, 6.0, SLIDE_W - MARGIN_X - 9.45, 0.75, { fontSize: 12.5, bold: true, color: C.teal, valign: 'middle' });
}

// =====================================================================
// 15. デモ④：ランダム探索との比較
// =====================================================================
{
  const s = branin.summary;
  const evals = Array.from({ length: branin.n_budget }, (_, i) => String(i + 1));
  const clip = (arr) => arr.map((v) => Math.max(v, LOG_AXIS_FLOOR));
  const slide = newContentSlide('4  デモ', 'デモ④：2次元のベンチマークでランダム探索と比べる', [
    `4つ目のデモでは、2つの変数を持つ Branin 関数で、ベイズ最適化とランダム探索を比べました。Branin 関数は最適化の性能比較によく使われる関数で、最小値 ${branin.min_value} をとる点が3か所あります。`,
    `ベイズ最適化は、最初の ${branin.n_initial} 点をラテン超方格法で配置し、残りを EI または LCB で1点ずつ選びます。合計 ${branin.n_budget} 回の評価を、乱数を変えて ${branin.n_repeats} 回くり返し、中央値を比べました。`,
    'グラフの縦軸は、それまでに見つけた最良値と真の最小値との差で、対数目盛りです。小さいほど良い結果です。',
    `ベイズ最適化は、EI では評価 ${s['BO-EI'].median_evals_to_target} 回（中央値）で差が ${branin.target} 未満になり、${branin.n_repeats} 回すべてで到達しました。ランダム探索は ${branin.n_budget} 回かけても ${branin.n_repeats} 回中 ${s['ランダム探索'].n_reached} 回しか到達していません。`,
    `参考として、6 × 6 のグリッドで ${branin.grid.n_points} 回評価した場合の差は ${branin.grid.regret.toFixed(2)} でした。`,
  ].join('\n'));
  slide.addChart(pres.charts.LINE, [
    { name: 'ベイズ最適化（EI）', labels: evals, values: clip(s['BO-EI'].median) },
    { name: 'ベイズ最適化（LCB）', labels: evals, values: clip(s['BO-LCB'].median) },
    { name: 'ランダム探索', labels: evals, values: clip(s['ランダム探索'].median) },
  ], {
    x: MARGIN_X, y: 1.5, w: 7.7, h: 5.2,
    ...chartBase(),
    chartColors: [C.teal, C.gold, C.randomGray], lineSize: 2.5, lineDataSymbol: 'none',
    showTitle: true, title: `最良値と真の最小値の差（${branin.n_repeats} 回の中央値、対数目盛り）`,
    valAxisLogScaleBase: 10, valAxisMinVal: LOG_AXIS_FLOOR, valAxisMaxVal: 1000, valAxisLabelFormatCode: '0.####',
    catAxisTitle: '評価回数', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontSize: 11,
    catAxisLabelFrequency: 5, catAxisLabelRotate: 0,
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, `差が ${branin.target} 未満に届いた回数（${branin.n_repeats} 回中）`, rx, 1.6, rw, 0.35, { fontSize: 13, bold: true, color: C.teal });
  const rows = [
    ['ベイズ最適化（EI）', `${s['BO-EI'].n_reached} 回`, `中央値 ${s['BO-EI'].median_evals_to_target} 回目`, C.tint, C.teal],
    ['ベイズ最適化（LCB）', `${s['BO-LCB'].n_reached} 回`, `中央値 ${s['BO-LCB'].median_evals_to_target} 回目`, C.goldTint, C.gold],
    ['ランダム探索', `${s['ランダム探索'].n_reached} 回`, `${branin.n_budget} 回以内`, C.gray, C.muted],
  ];
  rows.forEach(([name, count, note, fill, color], i) => {
    const y = 2.05 + i * 0.95;
    addCard(slide, rx, y, rw, 0.82, { fill });
    addText(slide, withBreaks([name, note]), rx + 0.2, y, rw * 0.62, 0.82, { fontSize: 12, valign: 'middle', color: C.ink });
    addText(slide, count, rx + rw * 0.6, y, rw * 0.4 - 0.2, 0.82, { fontSize: 22, bold: true, color, align: 'right', valign: 'middle' });
  });
  addBullets(slide, [
    `${branin.n_budget} 回後の差の中央値：EI ${s['BO-EI'].final_median.toFixed(4)}、LCB ${s['BO-LCB'].final_median.toFixed(4)}、ランダム ${s['ランダム探索'].final_median.toFixed(2)}`,
    `参考：6 × 6 グリッド（${branin.grid.n_points} 回）の差は ${branin.grid.regret.toFixed(2)}`,
    `ベイズ最適化は最初の ${branin.n_initial} 点をラテン超方格法で配置`,
  ], rx, 4.95, rw, 1.8, { fontSize: 12.5, space: 6 });
  addSource(slide, `関数の定義：Surjanovic & Bingham, Virtual Library of Simulation Experiments。差が ${LOG_AXIS_FLOOR} 未満の値はグラフの下端に表示`);
}

// =====================================================================
// 16. デモ⑤：評価した点の分布
// =====================================================================
{
  const ex = branin.example_points;
  const slide = newContentSlide('4  デモ', 'デモ⑤：ベイズ最適化は有望な場所に評価を集中させる', [
    '前のデモのうち1回分について、評価した点の位置を示します。赤い輪が、最小値をとる3か所です。',
    '左のベイズ最適化では、最初の5点、灰色の点で全体をざっと調べたあと、3つの最小値の周りに評価が集まっています。3か所すべてを見つけている点にも注目してください。',
    '右のランダム探索は、範囲全体に均等に散らばっています。有望な場所を重点的に調べないため、最小値の近くに点が落ちる回数が少なくなります。',
    'ベイズ最適化は、それまでの結果から「どこが有望か」を学び、評価の予算をそこに集中させている、と言えます。',
  ].join('\n'));
  const mins = branin.minimizers;
  const axisRange = { xMin: -5, xMax: 10, yMin: 0, yMax: 15 };
  // 描画領域の位置を固定し、最小値の位置に輪を重ねる（点の重なりで隠れないように）
  const plotLayout = { x: 0.09, y: 0.12, w: 0.87, h: 0.68 };
  const drawMinimaRings = (box) => {
    mins.forEach(([mx, my]) => {
      const cx = box.x + box.w * (plotLayout.x + plotLayout.w * (mx - axisRange.xMin) / (axisRange.xMax - axisRange.xMin));
      const cy = box.y + box.h * (plotLayout.y + plotLayout.h * (1 - (my - axisRange.yMin) / (axisRange.yMax - axisRange.yMin)));
      slide.addShape(pres.shapes.OVAL, { x: cx - 0.17, y: cy - 0.17, w: 0.34, h: 0.34, fill: { type: 'none' }, line: { color: C.coral, width: 2.25 } });
    });
  };
  const scatter = (box, title, pointSets, colors) => {
    const xs = [];
    const groups = [];
    const ys = [];
    pointSets.forEach(([px, py], g) => px.forEach((v, k) => { xs.push(v); ys.push(py[k]); groups.push(g); }));
    const data = [{ name: 'X', values: xs }];
    pointSets.forEach(([, , name], g) => data.push({ name, values: ys.map((y, i) => (groups[i] === g ? y : null)) }));
    slide.addChart(pres.charts.SCATTER, data, {
      ...box,
      ...chartBase(),
      chartColors: colors,
      lineSize: 0, lineDataSymbol: 'circle', lineDataSymbolSize: 7, lineDataSymbolLineSize: 0.5, lineDataSymbolLineColor: C.white,
      showTitle: true, title,
      valAxisMinVal: axisRange.yMin, valAxisMaxVal: axisRange.yMax, valAxisMajorUnit: 5,
      catAxisMinVal: axisRange.xMin, catAxisMaxVal: axisRange.xMax,
      valAxisLabelFormatCode: '0', catGridLine: { style: 'none' }, valGridLine: { color: C.grid, size: 0.5 },
      valAxisCrossesAt: 'min', catAxisCrossesAt: 'min',
      showLegend: true, legendPos: 'b', legendFontSize: 10.5,
      layout: plotLayout,
    });
    drawMinimaRings(box);
  };
  const bo = ex['BO-EI'];
  const n0 = branin.n_initial;
  const chartW = 5.95;
  const chartH = 4.7;
  scatter({ x: MARGIN_X, y: 1.5, w: chartW, h: chartH }, 'ベイズ最適化（EI）が評価した40点', [
    [bo.x1.slice(0, n0), bo.x2.slice(0, n0), `初期点（${n0}点）`],
    [bo.x1.slice(n0), bo.x2.slice(n0), 'ベイズ最適化で選んだ点'],
  ], [C.randomGray, C.teal]);
  const rnd = ex['ランダム探索'];
  scatter({ x: MARGIN_X + chartW + 0.2, y: 1.5, w: chartW, h: chartH }, 'ランダム探索が評価した40点', [
    [rnd.x1, rnd.x2, '評価した点'],
  ], [C.randomGray]);

  addCard(slide, MARGIN_X, 6.3, CONTENT_W, 0.5, { fill: C.gray });
  slide.addShape(pres.shapes.OVAL, { x: MARGIN_X + 0.3, y: 6.44, w: 0.22, h: 0.22, fill: { type: 'none' }, line: { color: C.coral, width: 2 } });
  addText(slide, '最小値の位置（3か所）', MARGIN_X + 0.6, 6.3, 2.3, 0.5, { fontSize: 12.5, color: C.coral, bold: true, valign: 'middle' });
  addText(slide, 'ベイズ最適化は全体をざっと調べたあと、3つの最小値の周りに評価を集中させた。ランダム探索は範囲全体に散らばる。', MARGIN_X + 2.95, 6.3, CONTENT_W - 3.2, 0.5, { fontSize: 12.5, valign: 'middle' });
}

// =====================================================================
// 17. 全体の手順
// =====================================================================
{
  const slide = newContentSlide('5  実務への拡張と注意点', 'ベイズ最適化の手順', [
    '実務でベイズ最適化を使うときの手順をまとめます。',
    '最初に、最適化したい評価値を1つの数値として定義し、動かす変数とその範囲を決めます。ここが最も重要で、範囲の外は探索されません。',
    '次に、ラテン超方格法などで範囲全体に散らばるように初期点を数点から十数点決め、評価します。',
    'そして、ガウス過程を当てはめ、獲得関数が最大になる点を選んで評価する、をくり返します。',
    '最後に、予算がなくなるか改善が止まったら終了し、見つかった最良の条件で確認の実験を行います。',
  ].join('\n'));
  const steps = [
    ['目的と範囲を決める', ['最適化する評価値を1つの数値に。', '変数と範囲を決める（範囲外は探さない）']],
    ['初期点を評価する', ['ラテン超方格法などで範囲全体に', '散らばる数点〜十数点を試す']],
    ['ガウス過程を当てはめる', ['入力は 0〜1 に正規化。', 'ハイパーパラメータは周辺尤度で推定']],
    ['次の点を選ぶ', ['獲得関数（EI など）が最大の点。', '獲得関数の最大化も最適化問題']],
    ['評価してデータに加える', ['実験・シミュレーションを行い、', '結果を記録して 3 に戻る']],
    ['終了して確認する', ['予算切れ・改善の停滞で終了。', '最良の条件で確認実験を行う']],
  ];
  const boxW = 3.6;
  const gapX = (CONTENT_W - boxW * 3) / 2;
  const rowY = [1.7, 4.15];
  const boxH = 1.8;
  steps.forEach(([title, desc], i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = MARGIN_X + col * (boxW + gapX);
    const y = rowY[row];
    const loop = i >= 2 && i <= 4;
    addCard(slide, x, y, boxW, boxH, { fill: loop ? C.tint : C.gray });
    addNode(slide, x + 0.45, y + 0.48, 0.54, loop ? C.teal : C.muted, String(i + 1), { fontSize: 17 });
    addText(slide, title, x + 0.85, y + 0.22, boxW - 1.0, 0.52, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, withBreaks(desc), x + 0.3, y + 0.92, boxW - 0.45, 0.8, { fontSize: 12.5, color: C.muted });
    if (col < 2) addLine(slide, x + boxW + 0.05, y + boxH / 2, x + boxW + gapX - 0.05, y + boxH / 2, { color: C.teal, width: 1.75, arrow: true });
  });
  const x3 = MARGIN_X + 2 * (boxW + gapX) + boxW / 2;
  const x4 = MARGIN_X + boxW / 2;
  const midY = (rowY[0] + boxH + rowY[1]) / 2;
  addLine(slide, x3, rowY[0] + boxH + 0.03, x3, midY, { color: C.teal, width: 1.75 });
  addLine(slide, x3, midY, x4, midY, { color: C.teal, width: 1.75 });
  addLine(slide, x4, midY, x4, rowY[1] - 0.03, { color: C.teal, width: 1.75, arrow: true });
  addText(slide, '3 → 4 → 5 をくり返す（色付きの枠）', MARGIN_X, 6.2, CONTENT_W, 0.4, { fontSize: 13, color: C.teal, bold: true, align: 'center' });
}

// =====================================================================
// 18. 実務向けの拡張
// =====================================================================
{
  const slide = newContentSlide('5  実務への拡張と注意点', '実務でよく出てくる拡張', [
    '実務では、基本のベイズ最適化をそのまま使えない場面があり、そのための拡張が研究されています。',
    '結果にばらつきがある場合は、ガウス過程にノイズの項を入れ、最良点は観測値ではなく予測の平均で判断します。',
    '実行できない条件や品質の下限がある場合は、制約もガウス過程でモデル化し、制約を満たす確率を獲得関数に掛けます。',
    '複数の評価値を同時に良くしたい場合は多目的最適化で、トレードオフの最前線であるパレート解を求めます。',
    '装置が複数台あって同時に実験できる場合は、複数の点をまとめて選ぶバッチ型を使います。',
    '変数が多い場合や、安いシミュレーションと高い実験を組み合わせたい場合にも、専用の方法があります。',
  ].join('\n'));
  const items = [
    ['ノイズのある観測', '結果にばらつきがある', 'GP にノイズ項を入れる。最良点は観測値ではなく予測平均で判断する'],
    ['制約付き', '実行できない条件・品質の下限がある', '制約も GP でモデル化し、「制約を満たす確率」を獲得関数に掛ける'],
    ['多目的', '複数の評価値を同時に良くしたい', 'トレードオフの最前線（パレート解）を求める。例：EHVI'],
    ['バッチ（並列）', '複数の実験を同時に行える', '複数の点をまとめて選ぶ。例：q-EI。装置が複数台あるとき'],
    ['高次元・離散変数', '変数が多い、種類などカテゴリがある', '局所的に探す TuRBO、変数の絞り込み、カテゴリ用のカーネルや TPE'],
    ['多忠実度', '安いシミュレーションと高い実験がある', '安い評価で大まかに調べ、高い評価は有望な所だけに使う'],
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardH = 2.35;
  const rowY = [1.65, 4.2];
  items.forEach(([title, when, how], i) => {
    const x = MARGIN_X + (i % 3) * (cardW + gapX);
    const y = rowY[Math.floor(i / 3)];
    addCard(slide, x, y, cardW, cardH, { fill: C.tint });
    addText(slide, title, x + 0.3, y + 0.18, cardW - 0.6, 0.45, { fontSize: 16.5, bold: true, color: C.teal, valign: 'middle' });
    addText(slide, [{ text: '場面：', bold: true, color: C.muted }, { text: when }], x + 0.3, y + 0.7, cardW - 0.6, 0.55, { fontSize: 13 });
    addText(slide, [{ text: '方法：', bold: true, color: C.coral }, { text: how }], x + 0.3, y + 1.3, cardW - 0.6, 0.95, { fontSize: 13 });
  });
  addSource(slide, '出典：Shahriari ほか (2016)、Frazier (2018)、Eriksson ほか (2019)、Garnett (2023)');
}

// =====================================================================
// 19. 実務での注意点
// =====================================================================
{
  const slide = newContentSlide('5  実務への拡張と注意点', '実務での注意点', [
    '実務で使うときの注意点を6つにまとめます。',
    '1つ目は変数の数です。Frazier のチュートリアルでは、ベイズ最適化は20次元未満の連続変数の問題に最も向いているとされています。変数が多いときは、先に効く変数を絞り込みます。',
    '2つ目は範囲の設定で、範囲の外は決して探索されません。広すぎても効率が落ちます。桁が大きく変わる変数は対数をとってから使います。',
    '3つ目は初期点、4つ目はばらつきの扱いです。最良の結果が偶然良かっただけという可能性があるので、確認の実験は欠かせません。',
    '5つ目と6つ目は、獲得関数の最大化と停止の判断です。',
  ].join('\n'));
  const items = [
    ['変数の数', '連続変数で 20 次元未満が最も向いている（Frazier, 2018）。多いときは効く変数を先に絞る'],
    ['範囲の設定', '範囲の外は探索されない。広すぎると効率が落ちる。桁が変わる変数は対数をとる'],
    ['初期点', '少なすぎると GP の予測が当てにならない。範囲全体に散らばるように置く'],
    ['ばらつき', '最良値が偶然の可能性がある。ノイズを考慮し、最良の条件は確認実験で確かめる'],
    ['獲得関数の最大化', 'それ自体が最適化問題。候補点が少ないと、本当に EI が最大の点を逃す'],
    ['停止の判断', '予算を決めておく。改善の停滞や、EI の最大値が十分小さくなったことも目安になる'],
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardH = 2.1;
  const rowY = [1.65, 3.95];
  items.forEach(([title, desc], i) => {
    const x = MARGIN_X + (i % 3) * (cardW + gapX);
    const y = rowY[Math.floor(i / 3)];
    const important = i === 0 || i === 1;
    addCard(slide, x, y, cardW, cardH, { fill: important ? C.coralTint : C.gray });
    addNode(slide, x + 0.42, y + 0.42, 0.44, important ? C.coral : C.teal, '!', { fontSize: 16 });
    addText(slide, title, x + 0.78, y + 0.18, cardW - 0.95, 0.48, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 0.82, cardW - 0.55, 1.2, { fontSize: 13 });
  });
  addText(slide, [
    { text: '人の知見が効くところ：', bold: true, color: C.teal },
    { text: '評価値の定義、変数と範囲の選び方、安全・品質上の制約。ここはアルゴリズムでは決められない。' },
  ], MARGIN_X, 6.3, CONTENT_W, 0.5, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 20. 実験計画法との関係
// =====================================================================
{
  const slide = newContentSlide('5  実務への拡張と注意点', '実験計画法（DoE）との関係：対立ではなく組み合わせる', [
    '製造現場でなじみのある実験計画法との関係を整理します。',
    '実験計画法は、事前に実験の組み合わせをまとめて計画し、要因の効果を推定したり、応答曲面で最適点を求めたりします。',
    'ベイズ最適化は、1点ずつ結果を見ながら次を決め、最適点を早く見つけることに向いています。',
    '両者は対立するものではなく、組み合わせるのが実務的です。最初に実験計画法、例えばラテン超方格法や要因計画で広く調べ、その結果を初期点としてベイズ最適化で絞り込み、最後に確認実験をする、という流れです。',
  ].join('\n'));
  const header = ['観点', '実験計画法（応答曲面法など）', 'ベイズ最適化'];
  const rows = [
    ['計画の立て方', '事前にまとめて計画する', '1点ずつ、結果を見て次を決める'],
    ['主な目的', '要因の効果を推定し、現象を理解する', '最適な条件を少ない回数で見つける'],
    ['モデル', '多項式（2次式など）で近似', 'ガウス過程（形を仮定しない）'],
    ['向いている場面', 'まとめて実験できる。効果を説明したい', '1回が高く、順番に進められる'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  slide.addTable([
    header.map((h, j) => ({ text: h, options: { bold: true, color: j === 2 ? C.white : C.ink, fill: { color: j === 2 ? C.teal : C.gray } } })),
    ...rows.map((r) => r.map((cell, j) => ({
      text: cell, options: { bold: j === 0, color: j === 0 ? C.teal : C.ink, fill: { color: j === 2 ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [2.3, 4.9, 4.9],
    fontFace: FONT, fontSize: 14, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.6,
  });
  addText(slide, 'おすすめの組み合わせ方', MARGIN_X, 4.8, CONTENT_W, 0.4, { fontSize: 15, bold: true, color: C.teal });
  const flow = [
    ['実験計画法で広く調べる', 'ラテン超方格法・要因計画', C.gray, C.ink],
    ['ベイズ最適化で絞り込む', '上の結果を初期点に使う', C.tint, C.teal],
    ['確認実験', '最良の条件で再現性を確かめる', C.coralTint, C.coral],
  ];
  const fw = 3.6;
  const fgap = (CONTENT_W - fw * 3) / 2;
  flow.forEach(([title, desc, fill, color], i) => {
    const x = MARGIN_X + i * (fw + fgap);
    addCard(slide, x, 5.3, fw, 1.35, { fill });
    addText(slide, [{ text: title, bold: true, color, fontSize: 16, breakLine: true }, { text: desc, fontSize: 12.5, color: C.ink }], x + 0.2, 5.3, fw - 0.4, 1.35, { align: 'center', valign: 'middle', paraSpaceAfter: 4 });
    if (i < 2) addLine(slide, x + fw + 0.05, 5.975, x + fw + fgap - 0.05, 5.975, { color: C.teal, width: 2, arrow: true });
  });
  addSource(slide, '出典：McKay, Beckman & Conover (1979)（ラテン超方格法）、Jones, Schonlau & Welch (1998)');
}

// =====================================================================
// 21. ツール
// =====================================================================
{
  const slide = newContentSlide('6  ツールと使い方', '主なツール', [
    '主なツールをまとめました。',
    'MATLAB では、Statistics and Machine Learning Toolbox の bayesopt 関数で、ベイズ最適化を1つの関数で実行できます。制約や並列評価にも対応しています。',
    'Python では、scikit-learn はガウス過程だけを提供しているので、獲得関数は自分で書きます。この資料のデモはこの方法です。',
    'Optuna は既定では TPE という方法を使いますが、バージョン3.6からガウス過程を使う GPSampler が入りました。BoTorch と Ax は、多目的や並列などの新しい手法まで揃った本格的なライブラリです。',
    'scikit-optimize は手軽ですが、元のリポジトリが2024年にアーカイブされているので、新しく使うなら他の選択肢をおすすめします。',
    '会社の環境で使う場合は、MATLAB の該当ツールボックスのライセンスや、Python ライブラリを導入できるかを確認してください。',
  ].join('\n'));
  const header = ['環境', 'ツール', '特徴'];
  const rows = [
    ['MATLAB', 'bayesopt（Statistics and Machine Learning Toolbox）', '関数1つで実行できる。制約・並列評価にも対応'],
    ['Python', 'scikit-learn（GaussianProcessRegressor）', 'ガウス過程だけを提供。獲得関数は自分で書く（本資料のデモ）'],
    ['Python', 'Optuna', '既定は TPE。v3.6 からガウス過程の GPSampler がある'],
    ['Python', 'BoTorch / Ax', 'PyTorch ベース。多目的・並列・制約など新しい手法がそろう'],
    ['Python', 'bayesian-optimization', '小規模な問題向けの簡単なライブラリ'],
    ['Python', 'scikit-optimize', 'gp_minimize で手軽。元のリポジトリは 2024 年にアーカイブ'],
    ['R', 'DiceOptim、mlrMBO', 'EI による逐次最適化など'],
  ];
  const cellMargin = [0.04, 0.12, 0.04, 0.12];
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.teal } } })),
    ...rows.map((r, i) => r.map((cell, j) => ({
      text: cell, options: { bold: j < 2, color: j === 0 ? C.teal : C.ink, fill: { color: i === 0 ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [1.35, 5.0, 5.75],
    fontFace: FONT, fontSize: 13, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.56,
  });
  addText(slide, '会社の環境では、MATLAB のツールボックスのライセンスや、Python ライブラリの導入可否を事前に確認する', MARGIN_X, 6.25, CONTENT_W, 0.4, { fontSize: 12.5, color: C.muted });
  addSource(slide, '出典：MathWorks bayesopt ドキュメント、Optuna ドキュメント、各ライブラリの公開情報（2026年9月確認）');
}

// =====================================================================
// 22. コード例
// =====================================================================
{
  const slide = newContentSlide('6  ツールと使い方', 'コード例：Python（scikit-learn）と MATLAB（bayesopt）', [
    '左は scikit-learn を使った最小のコード例です。2つの変数を 0 から 1 に正規化し、候補点の中から EI が最大の点を選ぶ、を30回くり返します。このコードは、Branin 関数でそのまま動くことを確認しており、35回の評価で最小値との差が0.0004になりました。',
    '右は MATLAB の bayesopt を使う例です。optimizableVariable で変数と範囲を決め、評価関数を渡すだけで実行できます。こちらはこの環境では MATLAB を実行できないため、動作は確認していません。',
    'runExperiment の部分に、実験やシミュレーションの結果を返す関数を書きます。',
  ].join('\n'));
  const py = [
    'import numpy as np',
    'from scipy.stats import norm',
    'from sklearn.gaussian_process import GaussianProcessRegressor',
    'from sklearn.gaussian_process.kernels import ConstantKernel, Matern',
    '',
    'def expected_improvement(mean, std, best, xi=0.01):  # 最小化用',
    '    std = np.maximum(std, 1e-12)',
    '    z = (best - mean - xi) / std',
    '    return (best - mean - xi) * norm.cdf(z) + std * norm.pdf(z)',
    '',
    'kernel = ConstantKernel() * Matern(length_scale=[0.2, 0.2], nu=2.5)',
    'X, y = initial_X, f(initial_X)          # 初期点（0〜1に正規化）',
    'for _ in range(30):',
    '    gp = GaussianProcessRegressor(kernel, normalize_y=True,',
    '                                  n_restarts_optimizer=3).fit(X, y)',
    '    cand = np.random.rand(3000, 2)      # 候補点',
    '    mean, std = gp.predict(cand, return_std=True)',
    '    x_next = cand[np.argmax(expected_improvement(mean, std, y.min()))]',
    '    X, y = np.vstack([X, x_next]), np.append(y, f(x_next))  # 評価',
    'print(X[np.argmin(y)], y.min())',
  ];
  const mat = [
    "dose  = optimizableVariable('dose',  [20 40]);",
    "focus = optimizableVariable('focus', [-0.1 0.1]);",
    '% 小さいほど良い値を返す関数',
    'fun = @(t) runExperiment(t.dose, t.focus);',
    '',
    'results = bayesopt(fun, [dose, focus], ...',
    "    'AcquisitionFunctionName', ...",
    "    'expected-improvement-plus', ...",
    "    'MaxObjectiveEvaluations', 30);",
    'best = bestPoint(results)',
  ];
  const codeBlock = (x, y, w, h, title, lines, fontSize, note) => {
    addText(slide, title, x, y, w, 0.35, { fontSize: 14, bold: true, color: C.teal });
    addCard(slide, x, y + 0.4, w, h, { fill: '17252D', radius: 0.08 });
    slide.addText(lines.map((lineText, i) => ({
      text: lineText.length ? lineText : ' ',
      options: { breakLine: i < lines.length - 1, color: /^\s*(#|%)/.test(lineText) ? '9FC3C8' : 'E6EFF1' },
    })), {
      x: x + 0.22, y: y + 0.55, w: w - 0.35, h: h - 0.25,
      fontFace: CODE_FONT, fontSize, color: 'E6EFF1', margin: 0, valign: 'top',
      isTextBox: true, lang: 'ja-JP', lineSpacingMultiple: 1.0,
    });
    addText(slide, note, x, y + 0.45 + h, w, 0.5, { fontSize: 11.5, color: C.muted });
  };
  const matX = MARGIN_X + 6.75 + 0.3;
  const matW = SLIDE_W - MARGIN_X - matX;
  codeBlock(MARGIN_X, 1.5, 6.75, 4.55, 'Python（scikit-learn）', py, 10, 'Branin 関数で動作確認済み（35回の評価で最小値との差 0.0004）');
  codeBlock(matX, 1.5, matW, 2.85, 'MATLAB（bayesopt）', mat, 10, '未実行の例（この環境では MATLAB を実行できないため）');
  addCard(slide, matX, 5.3, matW, 1.25, { fill: C.gray });
  addText(slide, withBreaks(['runExperiment：実験・シミュレーションの結果を返す関数', '変数名（dose・focus）と範囲は説明用の例']), matX + 0.2, 5.3, matW - 0.4, 1.25, { fontSize: 12, valign: 'middle' });
}

// =====================================================================
// 23. 製造現場での活用イメージ
// =====================================================================
{
  const slide = newContentSlide('6  ツールと使い方', '製造現場での活用イメージ（想定例）', [
    '製造現場で使う場合の流れを想定例で示します。実データで検証したものではありません。',
    '例えば露光工程の条件出しで、寸法の目標値からのずれとばらつきを1つの評価値にまとめ、露光量やフォーカスなどを変数にします。',
    '安全や品質の制約を必ず範囲に反映したうえで、ラテン超方格法で8点ほど初期実験を行い、その後ベイズ最適化で1点ずつ条件を選びます。',
    '最後に、最良の条件で確認実験を行い、再現性を確かめます。',
    'ほかにも、シミュレーションのパラメータを実測に合わせる同定や、補正パラメータの調整などに応用できる可能性があります。',
  ].join('\n'));
  const steps = [
    ['評価値を決める', ['例：寸法の目標値', 'からのずれ＋', 'ばらつきを1つの', '数値にまとめる']],
    ['変数と範囲を決める', ['例：露光量・', 'フォーカス・', 'ベーク温度。', '安全・品質の制約', 'を範囲に入れる']],
    ['初期実験', ['ラテン超方格法で', '8点ほどを試す']],
    ['ベイズ最適化', ['1点ずつ（装置が', '複数ならまとめて）', '条件を選び、', '実験する']],
    ['確認実験', ['最良の条件で', '再現性を確かめる']],
  ];
  const stepW = 2.2;
  const gapX = (CONTENT_W - stepW * 5) / 4;
  const y = 1.65;
  const h = 3.1;
  steps.forEach(([title, desc], i) => {
    const x = MARGIN_X + i * (stepW + gapX);
    const key = i === 1;
    addCard(slide, x, y, stepW, h, { fill: key ? C.coralTint : C.tint });
    addNode(slide, x + stepW / 2, y + 0.55, 0.62, key ? C.coral : C.teal, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.12, y + 1.05, stepW - 0.24, 0.5, { fontSize: 15, bold: true, align: 'center', valign: 'middle' });
    addText(slide, withBreaks(desc), x + 0.2, y + 1.65, stepW - 0.3, 1.4, { fontSize: 12.5 });
    if (i < steps.length - 1) addLine(slide, x + stepW + 0.03, y + 0.55, x + stepW + gapX - 0.03, y + 0.55, { color: C.teal, width: 1.75, arrow: true });
  });
  addText(slide, [
    { text: 'ほかの応用候補：', bold: true, color: C.teal },
    { text: 'シミュレーションのパラメータを実測に合わせる（同定）、補正パラメータの調整、装置レシピの調整' },
  ], MARGIN_X, 4.95, CONTENT_W, 0.5, { fontSize: 13.5, valign: 'middle' });
  addCard(slide, MARGIN_X, 5.6, CONTENT_W, 1.15, { fill: C.coralTint });
  addText(slide, [
    { text: '注意', bold: true, color: C.coral, breakLine: true },
    { text: 'このスライドは適用の想定例で、実データでの検証は行っていない。変数名・点数は説明用。安全・品質上の制約は必ず探索範囲に反映する。' },
  ], MARGIN_X + 0.3, 5.6, CONTENT_W - 0.6, 1.15, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 24. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.6, 6, 0.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle' });
  const points = [
    'ベイズ最適化は、評価に時間・費用がかかる問題で、少ない回数で最適な条件を探す方法',
    '代理モデル（ガウス過程）で予測と不確かさを出し、獲得関数で次の1点を選ぶ、をくり返す',
    'EI などの獲得関数が、有望な場所（活用）と未知の場所（探索）のバランスをとる',
    `デモでは、ランダム探索が ${branin.n_repeats} 回中 ${branin.summary['ランダム探索'].n_reached} 回しか届かない精度に、EI は全回で中央値 ${branin.summary['BO-EI'].median_evals_to_target} 回で到達`,
    '変数は 20 未満が目安。評価値の定義と範囲の設定、確認実験が成否を分ける',
  ];
  points.forEach((p, i) => {
    const y = 1.7 + i * 1.0;
    addNode(slide, 1.15, y + 0.35, 0.56, C.tealLight, String(i + 1), { fontSize: 18, color: C.night });
    addText(slide, p, 1.7, y, 7.7, 0.75, { fontSize: 16, color: C.white, valign: 'middle' });
  });
  addBandMotif(slide, { x: 9.8, y: 2.3, w: 3.0, h: 2.6 }, gpDemo, { bandColor: '23505F', lineColor: C.tealLight, dotColor: C.coral });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。',
    'ベイズ最適化は、1回の評価に時間や費用がかかる問題で、少ない回数で最適な条件を探すための方法です。',
    'ガウス過程で予測と不確かさを出し、獲得関数で次の1点を選ぶ、というくり返しが基本です。',
    '獲得関数は、有望な場所と、まだよく分からない場所のバランスをとります。',
    'デモでは、ランダム探索ではほとんど届かない精度に、ベイズ最適化は少ない回数で到達しました。',
    '実務では、変数の数を絞り、評価値の定義と範囲の設定を丁寧に行い、最後に確認実験で確かめることが大切です。',
  ].join('\n'));
}

// =====================================================================
// 25. 参考文献
// =====================================================================
{
  const slide = newContentSlide('REFERENCES', '参考文献', [
    '本資料で参照した主な文献です。',
    '入門には Frazier のチュートリアルと、Shahriari らのレビューが読みやすく、より深く学ぶなら Garnett の教科書がまとまっています。',
    'ガウス過程そのものについては Rasmussen と Williams の教科書が定番で、無料で公開されています。',
  ].join('\n'));
  const refs = [
    'Kushner, H. J. (1964). A new method of locating the maximum point of an arbitrary multipeak curve in the presence of noise. Journal of Basic Engineering, 86(1), 97–106.',
    'Močkus, J., Tiesis, V., & Žilinskas, A. (1978). The application of Bayesian methods for seeking the extremum. Towards Global Optimization, 2, 117–129.',
    'McKay, M. D., Beckman, R. J., & Conover, W. J. (1979). A comparison of three methods for selecting values of input variables in the analysis of output from a computer code. Technometrics, 21(2), 239–245.',
    'Jones, D. R., Schonlau, M., & Welch, W. J. (1998). Efficient global optimization of expensive black-box functions. Journal of Global Optimization, 13(4), 455–492.',
    'Rasmussen, C. E., & Williams, C. K. I. (2006). Gaussian Processes for Machine Learning. MIT Press.',
    'Forrester, A. I. J., Sóbester, A., & Keane, A. J. (2008). Engineering Design via Surrogate Modelling: A Practical Guide. Wiley.',
    'Srinivas, N., Krause, A., Kakade, S. M., & Seeger, M. (2010). Gaussian process optimization in the bandit setting: No regret and experimental design. ICML 2010.',
    'Bergstra, J., & Bengio, Y. (2012). Random search for hyper-parameter optimization. Journal of Machine Learning Research, 13, 281–305.',
    'Snoek, J., Larochelle, H., & Adams, R. P. (2012). Practical Bayesian optimization of machine learning algorithms. Advances in Neural Information Processing Systems 25.',
    'Shahriari, B., Swersky, K., Wang, Z., Adams, R. P., & de Freitas, N. (2016). Taking the human out of the loop: A review of Bayesian optimization. Proceedings of the IEEE, 104(1), 148–175.',
    'Frazier, P. I. (2018). A tutorial on Bayesian optimization. arXiv:1807.02811.',
    'Eriksson, D., Pearce, M., Gardner, J., Turner, R. D., & Poloczek, M. (2019). Scalable global optimization via local Bayesian optimization. Advances in Neural Information Processing Systems 32.',
    'Garnett, R. (2023). Bayesian Optimization. Cambridge University Press.',
    'Surjanovic, S., & Bingham, D. Virtual Library of Simulation Experiments: Test Functions and Datasets. https://www.sfu.ca/~ssurjano/',
  ];
  addBullets(slide, refs, MARGIN_X, 1.5, CONTENT_W, 5.4, { fontSize: 11.5, space: 4, indent: 14, color: C.ink });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
