// 潜在変数モデル解説資料（PowerPoint）を pptxgenjs で生成する。
// 使い方: node build_deck.js <出力パス>
// 前提: demo_results.json（demo_latent_variable.py の出力）と formulas/（render_formulas.py の出力）が同じフォルダにある。

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
  night: '1B1A3A',
  indigo: '3B3F8C',
  peri: '9AA3DD',
  periLight: 'D5D9F2',
  tint: 'EEF0FA',
  amber: 'D98A2B',
  amberTint: 'FBEBD8',
  teal: '2A8C8C',
  tealTint: 'DDF0EF',
  ink: '1E2233',
  muted: '5C6275',
  line: 'B9BFD3',
  grid: 'E4E7F0',
  gray: 'F2F3F7',
  ambiguous: 'B8BCC8',
  white: 'FFFFFF',
  onDarkSub: 'D6D9F0',
};
// 3つの成分（クラスタ）の色
const CLUSTER_COLORS = [C.indigo, C.amber, C.teal];

const fmt2 = (v) => v.toFixed(2);
const pct1 = (v) => (v * 100).toFixed(1);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '潜在変数モデル入門';
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
  addText(slide, kicker, MARGIN_X, 0.36, 9, 0.3, { fontSize: 12, bold: true, color: C.indigo, charSpacing: 1 });
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


// ---- グラフィカルモデルの補助関数 ----

// 潜在変数（観測できない）＝白抜きの丸、観測変数＝塗りつぶした丸
function latentNode(slide, cx, cy, d, label, { fontSize = 16, color = C.indigo, fill = C.white } = {}) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: { color, width: 2 },
  });
  if (label) addText(slide, label, cx - d / 2, cy - d / 2, d, d, { align: 'center', valign: 'middle', fontSize, bold: true, color });
}

function observedNode(slide, cx, cy, d, label, { fontSize = 16, fill = C.indigo, color = C.white } = {}) {
  addNode(slide, cx, cy, d, fill, label, { fontSize, color });
}

// 2つの円の縁どうしを矢印で結ぶ
function arrowBetween(slide, a, b, radiusA, radiusB, options = {}) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / d;
  const uy = (b[1] - a[1]) / d;
  addLine(slide, a[0] + ux * (radiusA + 0.03), a[1] + uy * (radiusA + 0.03), b[0] - ux * (radiusB + 0.05), b[1] - uy * (radiusB + 0.05), {
    color: C.ink, width: 1.5, arrow: true, ...options,
  });
}

function addNotationLegend(slide, x, y) {
  latentNode(slide, x + 0.14, y + 0.15, 0.26, '');
  addText(slide, '潜在変数（観測できない）', x + 0.36, y, 2.6, 0.3, { fontSize: 11.5, color: C.muted, valign: 'middle' });
  observedNode(slide, x + 3.0, y + 0.15, 0.26, '');
  addText(slide, '観測変数', x + 3.22, y, 1.4, 0.3, { fontSize: 11.5, color: C.muted, valign: 'middle' });
}

// 所属ごとに系列を分けた散布図（該当しない点は空欄にする）
function addGroupScatter(slide, box, xs, ys, groups, names, colors, title, axisRange) {
  const data = [{ name: 'X', values: xs }];
  names.forEach((name, g) => data.push({ name, values: ys.map((y, i) => (groups[i] === g ? y : null)) }));
  slide.addChart(pres.charts.SCATTER, data, {
    ...box,
    ...chartBase(),
    chartColors: colors,
    lineSize: 0, lineDataSymbol: 'circle', lineDataSymbolSize: 5, lineDataSymbolLineSize: 0.5, lineDataSymbolLineColor: C.white,
    showTitle: true, title,
    valAxisMinVal: axisRange.yMin, valAxisMaxVal: axisRange.yMax, valAxisMajorUnit: 2,
    catAxisMinVal: axisRange.xMin, catAxisMaxVal: axisRange.xMax,
    valAxisLabelFormatCode: '0', catGridLine: { style: 'none' }, valGridLine: { color: C.grid, size: 0.5 },
    valAxisCrossesAt: 'min', catAxisCrossesAt: 'min',
    showLegend: true, legendPos: 'b', legendFontSize: 10.5,
  });
}

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
}

const LOADING_TO_WIDTH = 4.5; // 因子負荷量 → 矢印の太さ（pt）
const gmm = demo.gmm;
const fa = demo.fa;

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, '統計 × 機械学習', 0.8, 1.35, 7, 0.4, { fontSize: 15, bold: true, color: C.peri, charSpacing: 2 });
  addText(slide, '潜在変数モデル入門', 0.8, 1.8, 7.8, 1.0, { fontSize: 48, bold: true, color: C.white, valign: 'middle' });
  addText(slide, withBreaks(['「見えない原因」で', 'データの構造を説明する']), 0.8, 3.0, 7.6, 1.1, {
    fontSize: 22, color: C.onDarkSub, lineSpacingMultiple: 1.15,
  });
  addText(slide, '因子分析・混合モデル・EMアルゴリズムから深層生成モデルまで、合成データのデモとともに解説', 0.8, 4.45, 7.2, 0.8, {
    fontSize: 14, color: C.peri,
  });
  addText(slide, '2026年9月22日', 0.8, 6.45, 4, 0.35, { fontSize: 13, color: C.onDarkSub });

  // 右：z から x への生成を表すグラフィカルモデル
  const z = [10.6, 2.2];
  const xs = [[9.0, 4.6], [10.07, 4.6], [11.13, 4.6], [12.2, 4.6]];
  xs.forEach((p) => arrowBetween(slide, z, p, 0.55, 0.3, { color: '6D74B8', width: 1.75 }));
  latentNode(slide, z[0], z[1], 1.1, 'z', { fontSize: 30, color: C.peri, fill: C.night });
  xs.forEach((p, i) => observedNode(slide, p[0], p[1], 0.6, `x_{${i + 1}}`, { fontSize: 15, fill: C.peri, color: C.night }));
  addText(slide, '見えない変数 z が、観測できる x を生み出すと考える', 8.2, 5.35, 4.9, 0.6, { fontSize: 12, color: C.onDarkSub, align: 'center' });
  slide.addNotes([
    'この資料では、潜在変数モデルを基礎から解説します。',
    '潜在変数モデルは、直接は観測できない変数を仮定して、観測データのばらつきや構造を説明する統計モデルの総称です。',
    '因子分析や混合ガウスモデルのような古典的なモデルから、変分オートエンコーダのような深層生成モデルまで、同じ枠組みで理解できます。',
    '後半では合成データで実際に推定を行い、真の値をどこまで復元できるかを確かめます。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で分かること
// =====================================================================
{
  const slide = newContentSlide('INTRODUCTION', 'この資料で分かること', [
    '全体は6つのパートです。',
    '最初に潜在変数とは何か、モデルの基本形と分類を押さえます。',
    '次に、推定の中心となる EM アルゴリズムと、その裏にある ELBO という考え方を説明します。',
    '中盤では、混合ガウスモデルと因子分析を、合成データのデモとともに詳しく見ます。',
    '後半は、構造方程式モデリング、時系列の潜在変数モデル、変分オートエンコーダなどの発展的なモデルと、実務での使い方です。',
  ].join('\n'));
  const items = [
    ['潜在変数とは', '観測できない変数で、データの背後の構造を表す'],
    ['モデルの基本形と分類', 'p(x) = ∫ p(x|z) p(z) dz と、4つの型'],
    ['推定の考え方', 'EM アルゴリズム、ELBO、変分推論'],
    ['代表的なモデルとデモ', '混合ガウスモデルと因子分析を合成データで実行'],
    ['発展的なモデル', 'SEM、HMM・状態空間モデル、VAE、トピックモデル'],
    ['実務での使い方', '選び方、注意点、ツール、コード例'],
  ];
  const colX = [MARGIN_X, 6.95];
  const rowY = [1.75, 3.15, 4.55];
  items.forEach(([title, desc], i) => {
    const x = colX[Math.floor(i / 3)];
    const y = rowY[i % 3];
    addNode(slide, x + 0.33, y + 0.42, 0.66, C.indigo, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.9, y + 0.05, 4.9, 0.45, { fontSize: 19, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.9, y + 0.55, 4.9, 0.4, { fontSize: 14, color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.tint });
  addText(slide, '想定する読者：平均・分散・正規分布・回帰分析の基本を知っている人。数式は最小限にし、式の意味を言葉で補います。',
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 3. 潜在変数とは
// =====================================================================
{
  const slide = newContentSlide('1  潜在変数とは', '潜在変数とは：直接は測れない「背後の変数」', [
    '潜在変数とは、直接は測れないけれども、観測データの背後にあると仮定する変数のことです。',
    '例えば「学力」そのものは測れませんが、各教科のテスト得点の背後にあって、得点のばらつきを生み出していると考えられます。',
    '同じように、顧客のタイプは購買履歴に、文書の話題は単語に、装置の状態はセンサーの値に表れます。',
    '潜在変数モデルは、「z が分かれば x のばらつきが説明できる」という形でデータをモデル化します。',
    'この資料の図では、白抜きの丸を潜在変数、塗りつぶした丸を観測変数として描きます。',
  ].join('\n'));
  addText(slide, withBreaks(['観測データの背後にあると仮定する、', '測れない変数 z']), MARGIN_X, 1.65, 5.6, 1.0, {
    fontSize: 20, bold: true, color: C.indigo,
  });
  addBullets(slide, [
    [{ text: '観測変数 x：', bold: true }, '実際に測れる値（テスト得点など）'],
    [{ text: '潜在変数 z：', bold: true }, '測れないが、x の値を生み出す原因として仮定する'],
    'z が分かれば x のばらつきが説明できる、という形でデータをモデル化する',
  ], MARGIN_X, 2.85, 5.6, 2.7, { fontSize: 15, space: 12 });
  addNotationLegend(slide, MARGIN_X, 6.2);
  addText(slide, '（この資料の図の表記）', MARGIN_X + 4.35, 6.2, 1.8, 0.3, { fontSize: 11, color: C.muted, valign: 'middle' });

  const examples = [
    ['学力・能力', '各教科のテスト得点'],
    ['顧客のタイプ', '購買履歴、閲覧行動'],
    ['文書の話題', '文書に出てくる単語'],
    ['装置の状態', '複数のセンサーの測定値'],
  ];
  const ex = 6.75;
  addText(slide, '潜在変数 z', ex, 1.65, 2.3, 0.35, { fontSize: 13, bold: true, color: C.muted, align: 'center' });
  addText(slide, '観測できるもの x', ex + 3.2, 1.65, 2.75, 0.35, { fontSize: 13, bold: true, color: C.muted, align: 'center' });
  examples.forEach(([latent, observed], i) => {
    const y = 2.15 + i * 1.08;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: ex, y, w: 2.3, h: 0.8, rectRadius: 0.4, fill: { color: C.white }, line: { color: C.indigo, width: 2 },
    });
    addText(slide, latent, ex, y, 2.3, 0.8, { fontSize: 15, bold: true, color: C.indigo, align: 'center', valign: 'middle' });
    addLine(slide, ex + 2.38, y + 0.4, ex + 3.12, y + 0.4, { color: C.ink, width: 1.75, arrow: true });
    addCard(slide, ex + 3.2, y, 2.75, 0.8, { fill: C.indigo, radius: 0.1 });
    addText(slide, observed, ex + 3.3, y, 2.55, 0.8, { fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle' });
  });
}

// =====================================================================
// 4. なぜ潜在変数を使うのか
// =====================================================================
{
  const slide = newContentSlide('1  潜在変数とは', 'なぜ潜在変数を使うのか', [
    '潜在変数を使う理由は、大きく4つあります。',
    '1つ目は要約です。多数の観測変数を、少数の潜在変数で表します。',
    '2つ目は構造の発見です。データに隠れたグループや、複数の変数に共通する要因を見つけます。',
    '3つ目は測定誤差の分離です。観測値は真の値に誤差が加わったものと考え、誤差を取り除いた関係を調べます。構造方程式モデリングの考え方です。',
    '4つ目は生成と補完です。データの生成過程をモデル化するので、新しいデータを生成したり、欠けた値を補ったりできます。',
  ].join('\n'));
  const cards = [
    ['要約（次元削減）', '多数の観測変数を、少数の潜在変数で表す', ['例：多数の計測項目', '→ 2〜3個の因子']],
    ['構造の発見', 'データに隠れたグループや共通の要因を見つける', ['例：顧客の型、', '不良のモード']],
    ['測定誤差の分離', '観測値＝真の値＋誤差と考え、誤差を除いた関係を調べる', ['例：構造方程式', 'モデリング（SEM）']],
    ['生成と補完', '生成の仕組みをモデル化し、新しいデータの生成や欠測の補完に使う', ['例：変分オート', 'エンコーダ（VAE）']],
  ];
  const cardW = 2.85;
  const gap = (CONTENT_W - cardW * 4) / 3;
  const y = 1.7;
  const h = 4.6;
  cards.forEach(([title, desc, example], i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, y, cardW, h, { fill: C.tint });
    addNode(slide, x + 0.55, y + 0.6, 0.66, C.indigo, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.3, y + 1.15, cardW - 0.6, 0.5, { fontSize: 17, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 1.75, cardW - 0.6, 1.5, { fontSize: 14.5 });
    addCard(slide, x + 0.25, y + h - 1.15, cardW - 0.5, 0.9, { fill: C.white, radius: 0.08 });
    addText(slide, withBreaks(example), x + 0.4, y + h - 1.15, cardW - 0.8, 0.9, { fontSize: 12.5, color: C.muted, valign: 'middle' });
  });
  addText(slide, 'どの目的でも「観測できない z を仮定し、x との関係を確率モデルで書く」という点は共通している。',
    MARGIN_X, 6.45, CONTENT_W, 0.4, { fontSize: 14, color: C.ink });
}

// =====================================================================
// 5. 基本の形
// =====================================================================
{
  const slide = newContentSlide('2  基本形と分類', 'モデルの基本形：z を通して x の分布を表す', [
    '潜在変数モデルの基本形です。',
    'まず z がある分布 p(z) に従って決まり、次に z に応じて x が p(x|z) に従って出てくる、という生成の仕組みを考えます。',
    'z は観測できないので、x の分布は z について積分、あるいは和をとった形になります。これを周辺尤度と呼び、パラメータの推定ではこれを大きくします。',
    'また、x を観測した後で z がどうだったかを推定するのが事後分布 p(z|x) で、ベイズの定理で求めます。',
    'パラメータ θ を求めることを学習、事後分布を求めることを推論と呼び分けます。',
  ].join('\n'));
  // 左：グラフィカルモデル
  const gx = MARGIN_X;
  const gy = 1.6;
  addCard(slide, gx, gy, 4.6, 5.1, { fill: C.gray });
  addText(slide, 'グラフィカルモデル', gx + 0.3, gy + 0.2, 3.5, 0.35, { fontSize: 13, bold: true, color: C.muted });
  const plate = { x: gx + 0.9, y: gy + 0.9, w: 2.6, h: 3.4 };
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: plate.x, y: plate.y, w: plate.w, h: plate.h, rectRadius: 0.12, fill: { color: C.white }, line: { color: C.line, width: 1.25 },
  });
  const zPos = [plate.x + plate.w / 2, plate.y + 0.95];
  const xPos = [plate.x + plate.w / 2, plate.y + 2.45];
  arrowBetween(slide, zPos, xPos, 0.4, 0.4, { width: 2 });
  latentNode(slide, zPos[0], zPos[1], 0.8, 'z', { fontSize: 22 });
  observedNode(slide, xPos[0], xPos[1], 0.8, 'x', { fontSize: 22 });
  addText(slide, 'N 個のデータ', plate.x + plate.w - 1.6, plate.y + plate.h - 0.4, 1.5, 0.3, { fontSize: 11.5, color: C.muted, align: 'right' });
  const thetaPos = [gx + 4.05, xPos[1]];
  addNode(slide, thetaPos[0], thetaPos[1], 0.16, C.ink);
  addLine(slide, thetaPos[0] - 0.1, thetaPos[1], xPos[0] + 0.45, xPos[1], { color: C.ink, width: 1.25, arrow: true });
  addText(slide, 'θ', thetaPos[0] - 0.15, thetaPos[1] - 0.5, 0.3, 0.3, { fontSize: 15, bold: true, align: 'center' });
  addText(slide, '四角の枠は「N 回くり返す」ことを表す（プレート表記）。θ はパラメータ', gx + 0.3, gy + 4.45, 4.0, 0.55, { fontSize: 11, color: C.muted });

  // 右：式と3つの分布
  const rx = 5.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.05, { fill: C.tint });
  addText(slide, '周辺尤度', rx + 0.3, 1.6, 1.3, 1.05, { fontSize: 14, bold: true, color: C.indigo, valign: 'middle' });
  const marginal = formulaSize('marginal');
  addFormula(slide, 'marginal', rx + 1.7, 1.6 + (1.05 - marginal.h) / 2, { alt: 'p(x) = integral p(x|z) p(z) dz' });
  addText(slide, 'z が離散（グループ番号など）なら、積分は和になる', rx + 0.3, 2.7, rw - 0.6, 0.3, { fontSize: 12, color: C.muted });
  const rows = [
    ['p(z)', '事前分布', '潜在変数がどうばらつくかの仮定'],
    ['p(x|z)', '観測モデル', 'z が決まったときの x の出方'],
    ['p(z|x)', '事後分布', 'x を見た後の z の推定（ベイズの定理）'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  slide.addTable(rows.map((r) => r.map((cell, j) => ({
    text: cell, options: { bold: j < 2, color: j === 0 ? C.indigo : C.ink, fontFace: FONT },
  }))), {
    x: rx, y: 3.15, w: rw, colW: [1.35, 1.75, rw - 3.1],
    fontFace: FONT, fontSize: 14.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.55,
  });
  const post = formulaSize('posterior');
  addFormula(slide, 'posterior', rx + 0.3, 4.95, { alt: 'p(z|x) = p(x|z) p(z) / p(x)' });
  addBullets(slide, [
    [{ text: '学習：', bold: true }, 'パラメータ θ を推定する（周辺尤度を大きくする）'],
    [{ text: '推論：', bold: true }, '事後分布 p(z|x) を求める'],
  ], rx + 0.3 + post.w + 0.45, 4.95, rw - post.w - 0.75, 1.6, { fontSize: 14.5, space: 10 });
}

// =====================================================================
// 6. 変数の型による分類
// =====================================================================
{
  const slide = newContentSlide('2  基本形と分類', '観測変数と潜在変数の型で、モデルを4つに分ける', [
    '潜在変数モデルは、観測変数と潜在変数が、連続か離散かによって4つに整理できます。',
    '両方が連続なら因子分析です。観測が連続で潜在変数が離散、つまりグループ番号なら、混合ガウスモデルや潜在プロファイル分析になります。',
    '観測が離散、例えばテストの正誤で、潜在変数が連続の能力なら項目反応理論です。両方が離散なら潜在クラス分析です。',
    'この整理は Bartholomew らの教科書に基づくもので、見た目の違うモデルが同じ枠組みの仲間であることが分かります。',
  ].join('\n'));
  const gx = 3.1;
  const gy = 2.25;
  const cellW = 4.75;
  const cellH = 2.0;
  const gap = 0.12;
  addText(slide, '潜在変数 z', gx, 1.6, cellW * 2 + gap, 0.3, { fontSize: 14, bold: true, color: C.muted, align: 'center' });
  ['連続', '離散'].forEach((label, j) => {
    addCard(slide, gx + j * (cellW + gap), 1.9, cellW, 0.3, { fill: C.periLight, radius: 0.05 });
    addText(slide, label, gx + j * (cellW + gap), 1.9, cellW, 0.3, { fontSize: 13, bold: true, color: C.indigo, align: 'center', valign: 'middle' });
  });
  addText(slide, '観測変数 x', MARGIN_X, gy + cellH - 0.2, 1.2, 0.4, { fontSize: 14, bold: true, color: C.muted, align: 'center' });
  ['連続', '離散'].forEach((label, i) => {
    addCard(slide, 1.95, gy + i * (cellH + gap), 1.0, cellH, { fill: C.periLight, radius: 0.05 });
    addText(slide, label, 1.95, gy + i * (cellH + gap), 1.0, cellH, { fontSize: 13, bold: true, color: C.indigo, align: 'center', valign: 'middle' });
  });
  const cells = [
    ['因子分析・確率的主成分分析', '例：テスト得点の背後にある能力の因子', C.tint],
    ['混合ガウスモデル・潜在プロファイル分析', '例：測定値からデータをグループに分ける', C.amberTint],
    ['項目反応理論（IRT）', '例：問題ごとの正誤から受験者の能力を測る', C.tint],
    ['潜在クラス分析', '例：アンケート回答から回答者の型を見つける', C.amberTint],
  ];
  cells.forEach(([name, example, fill], k) => {
    const i = Math.floor(k / 2);
    const j = k % 2;
    const x = gx + j * (cellW + gap);
    const y = gy + i * (cellH + gap);
    addCard(slide, x, y, cellW, cellH, { fill });
    addText(slide, name, x + 0.3, y + 0.3, cellW - 0.6, 0.7, { fontSize: 16, bold: true, color: j === 0 ? C.indigo : C.amber, valign: 'middle' });
    addText(slide, example, x + 0.3, y + 1.05, cellW - 0.6, 0.7, { fontSize: 13.5, color: C.ink });
  });
  addSource(slide, '出典：Bartholomew, Knott & Moustaki (2011) の分類に基づく');
}

// =====================================================================
// 7. 代表的なモデルの地図
// =====================================================================
{
  const slide = newContentSlide('2  基本形と分類', '代表的な潜在変数モデルの一覧', [
    '代表的な潜在変数モデルを一覧にしました。',
    '上の4つが基本的なモデル、SEM は潜在変数どうしの関係を調べるモデルです。',
    'HMM と状態空間モデルは、潜在変数が時間とともに変わる時系列のモデルで、HMM は離散の状態、状態空間モデルは連続の状態を扱います。',
    'トピックモデルは文書、変分オートエンコーダは画像などの高次元データを対象にします。',
    'このうち混合ガウスモデルと因子分析は後半のデモで実際に推定し、その他も順に説明します。',
  ].join('\n'));
  const header = ['モデル', '潜在変数 z', '観測変数 x', '主な用途'];
  const rows = [
    ['因子分析', '連続（共通因子）', '連続', '心理尺度、多変量データの要約と解釈'],
    ['確率的主成分分析（PPCA）', '連続', '連続', '次元削減、欠測の補完'],
    ['混合ガウスモデル（GMM）', '離散（所属する成分）', '連続', 'クラスタリング、密度推定、異常検知'],
    ['潜在クラス分析（LCA）', '離散（クラス）', '離散', 'アンケートの回答パターンの分類'],
    ['構造方程式モデリング（SEM）', '連続', '連続・順序', '潜在変数どうしの関係（仮説）の検証'],
    ['隠れマルコフモデル（HMM）', '離散（時間で変わる状態）', '連続・離散', '音声認識、装置状態の推定'],
    ['状態空間モデル', '連続（時間で変わる状態）', '連続', '追跡、時系列の平滑化・予測'],
    ['トピックモデル（LDA）', '離散（話題）', '離散（単語）', '文書の分類・要約'],
    ['変分オートエンコーダ（VAE）', '連続（多次元）', '画像など高次元', 'データ生成、表現学習、異常検知'],
  ];
  const demoRows = new Set([0, 2]);
  const cellMargin = [0.04, 0.12, 0.04, 0.12];
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.indigo } } })),
    ...rows.map((r, i) => r.map((cell, j) => ({
      text: cell, options: { bold: j === 0, color: j === 0 ? C.indigo : C.ink, fill: { color: demoRows.has(i) ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.55, w: CONTENT_W, colW: [3.55, 2.75, 1.85, 3.95],
    fontFace: FONT, fontSize: 13, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.49,
  });
  addText(slide, '色付きの行は後半のデモで実際に推定するモデル', MARGIN_X, 6.55, CONTENT_W, 0.3, { fontSize: 11.5, color: C.muted });
}

// =====================================================================
// 8. 推定の難しさ
// =====================================================================
{
  const slide = newContentSlide('3  推定の考え方', '推定の難しさ：対数の中に「和」が入る', [
    '潜在変数モデルの推定がなぜ難しいのかを、混合ガウスモデルで見てみます。',
    'z が観測できないので、対数尤度は、対数の中に成分についての和が入った形になります。この形では、パラメータごとに分けて最大化できず、式で直接解けません。',
    '一方、もし z、つまり各点がどの成分から来たかが分かっていれば、対数の中の和が消えます。すると、成分ごとに平均と分散を計算するだけで答えが出ます。',
    'そこで、z を推定することと、パラメータを更新することを交互にくり返す、というのが次に説明する EM アルゴリズムの発想です。',
  ].join('\n'));
  const cardW = (CONTENT_W - 0.4) / 2;
  const cardY = 1.65;
  const cardH = 3.9;
  const specs = [
    {
      x: MARGIN_X, fill: C.amberTint, color: C.amber, title: 'z が分からない（実際の状況）', key: 'loglik',
      alt: 'log p(X|theta) = sum_i log sum_k pi_k N(x_i | mu_k, Sigma_k)',
      items: ['対数の中に成分 k についての和がある', 'パラメータごとに分けて最大化できず、式で直接は解けない'],
    },
    {
      x: MARGIN_X + cardW + 0.4, fill: C.tint, color: C.indigo, title: 'もし z が分かれば（完全データ）', key: 'complete',
      alt: 'complete data log likelihood',
      items: ['z_{ik}：点 i が成分 k から来たら 1、それ以外は 0', '和が対数の外に出る → 成分ごとの平均・分散を計算するだけ'],
    },
  ];
  specs.forEach((s) => {
    addCard(slide, s.x, cardY, cardW, cardH, { fill: s.fill });
    addText(slide, s.title, s.x + 0.3, cardY + 0.2, cardW - 0.6, 0.45, { fontSize: 17, bold: true, color: s.color, valign: 'middle' });
    const size = formulaSize(s.key);
    const scale = Math.min(1, (cardW - 0.5) / size.w);
    addFormula(slide, s.key, s.x + (cardW - size.w * scale) / 2, cardY + 0.95, { scale, alt: s.alt });
    addBullets(slide, s.items, s.x + 0.35, cardY + 2.05, cardW - 0.7, 1.7, { fontSize: 14.5, space: 10 });
  });
  addCard(slide, MARGIN_X, 5.8, CONTENT_W, 0.9, { fill: C.indigo });
  addText(slide, '→ 「z を推定する」と「パラメータを更新する」を交互にくり返す ＝ EM アルゴリズム',
    MARGIN_X + 0.3, 5.8, CONTENT_W - 0.6, 0.9, { fontSize: 17, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 9. EM アルゴリズム
// =====================================================================
{
  const slide = newContentSlide('3  推定の考え方', 'EM アルゴリズム：E ステップと M ステップのくり返し', [
    'EM アルゴリズムの流れです。Dempster、Laird、Rubin が1977年に一般的な形で示しました。',
    'まず適当な初期値から始めます。',
    'E ステップでは、今のパラメータを使って、各データの潜在変数の事後分布を計算します。混合ガウスモデルでは、点 i が成分 k から来た確率 γ で、責任度と呼びます。',
    'M ステップでは、この責任度を重みにして、パラメータを更新します。重み付きの平均や分散を計算するだけです。',
    'この2つを、対数尤度の増え方が十分小さくなるまでくり返します。',
  ].join('\n'));
  const bx = 0.9;
  const bw = 5.0;
  const box = (y, h, title, desc, fill, color) => {
    addCard(slide, bx, y, bw, h, { fill });
    addText(slide, title, bx + 0.3, y + 0.12, bw - 0.6, 0.4, { fontSize: 16, bold: true, color });
    if (desc) addText(slide, desc, bx + 0.3, y + 0.55, bw - 0.6, h - 0.6, { fontSize: 13.5, color: C.ink });
  };
  box(1.65, 0.62, 'パラメータ θ の初期値を決める', null, C.gray, C.ink);
  box(2.65, 1.35, 'E ステップ（Expectation）', '今の θ で、z の事後分布（責任度 γ）を計算する', C.tint, C.indigo);
  box(4.4, 1.35, 'M ステップ（Maximization）', 'γ を重みにして、θ を更新する（重み付き平均・分散）', C.amberTint, C.amber);
  box(6.1, 0.62, '対数尤度がほぼ増えなくなったら終了', null, C.gray, C.ink);
  const cx = bx + bw / 2;
  addLine(slide, cx, 2.29, cx, 2.63, { color: C.ink, width: 1.75, arrow: true });
  addLine(slide, cx, 4.02, cx, 4.38, { color: C.ink, width: 1.75, arrow: true });
  addLine(slide, cx, 5.77, cx, 6.08, { color: C.ink, width: 1.75, arrow: true });
  // M → E へ戻るループ
  const loopX = bx + bw + 0.35;
  addLine(slide, bx + bw + 0.02, 5.07, loopX, 5.07, { color: C.indigo, width: 1.75 });
  addLine(slide, loopX, 5.07, loopX, 3.32, { color: C.indigo, width: 1.75 });
  addLine(slide, loopX, 3.32, bx + bw + 0.04, 3.32, { color: C.indigo, width: 1.75, arrow: true });
  addText(slide, 'くり返す', loopX + 0.08, 4.0, 0.45, 1.0, { fontSize: 12, bold: true, color: C.indigo, valign: 'middle' });

  const rx = 7.1;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '混合ガウスモデルの場合', rx, 1.65, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  addText(slide, 'E ステップ：責任度', rx, 2.15, rw, 0.3, { fontSize: 12.5, color: C.muted });
  addFormula(slide, 'resp', rx + 0.2, 2.45, { alt: 'gamma_ik = pi_k N(x_i|mu_k,Sigma_k) / sum_j pi_j N(x_i|mu_j,Sigma_j)' });
  addText(slide, 'M ステップ：更新（共分散も同様に重み付きで計算）', rx, 3.6, rw, 0.3, { fontSize: 12.5, color: C.muted });
  addFormula(slide, 'mstep', rx + 0.2, 3.9, { alt: 'mu_k = sum gamma x / sum gamma, pi_k = 1/N sum gamma' });
  addBullets(slide, [
    'γ_{ik} は「点 i が成分 k から来た確率」。1つに決めず確率で持つ',
    '各反復で対数尤度は下がらない（次のスライド）',
  ], rx, 5.25, rw, 1.5, { fontSize: 14, space: 8 });
  addSource(slide, '出典：Dempster, Laird & Rubin (1977)、Bishop (2006) 第9章');
}

// =====================================================================
// 10. ELBO
// =====================================================================
{
  const slide = newContentSlide('3  推定の考え方', 'なぜ EM で尤度が上がるのか：ELBO（証拠下界）', [
    'EM アルゴリズムで尤度が上がる理由を、ELBO という量で説明します。',
    '任意の分布 q(z) を使うと、対数尤度は、ELBO と呼ばれる下界 L と、KL ダイバージェンスの和に分解できます。KL は0以上なので、L は常に対数尤度以下です。',
    'E ステップでは q を真の事後分布にします。すると KL が0になり、L が対数尤度にぴったり接します。',
    'M ステップでは、q を固定したまま L を大きくするようにパラメータを動かします。L が上がり、KL も0以上なので、対数尤度はそれ以上に上がります。',
    'このため、各反復で対数尤度は決して下がりません。ただし、たどり着くのは局所的な最大値で、全体の最大値とは限りません。',
    '左の棒グラフは、この関係を表した概念図です。',
  ].join('\n'));
  const decomposition = formulaSize('elbo_decomp');
  addCard(slide, MARGIN_X, 1.55, CONTENT_W, 0.8, { fill: C.tint });
  addFormula(slide, 'elbo_decomp', MARGIN_X + (CONTENT_W - decomposition.w) / 2, 1.55 + (0.8 - decomposition.h) / 2, { alt: 'log p(x|theta) = L(q,theta) + KL(q || p(z|x,theta))' });

  // 左：概念図（棒の高さは説明用）
  const baseY = 6.35;
  const barW = 1.15;
  const bars = [
    { x: 1.2, elbo: 1.55, kl: 0.8, label: withBreaks(['① 現在']) },
    { x: 3.25, elbo: 2.35, kl: 0, label: withBreaks(['② E ステップ後', '（KL = 0）']) },
    { x: 5.3, elbo: 2.95, kl: 0.55, label: withBreaks(['③ M ステップ後', '（L と尤度が上がる）']) },
  ];
  const oldTop = baseY - 2.35;
  addLine(slide, 0.9, oldTop, 6.9, oldTop, { color: C.muted, width: 1, dash: 'dash' });
  addText(slide, '最初の対数尤度', 0.9, oldTop - 0.32, 2.0, 0.3, { fontSize: 11, color: C.muted });
  bars.forEach((b) => {
    addRect(slide, b.x, baseY - b.elbo, barW, b.elbo, C.indigo);
    if (b.kl > 0) addRect(slide, b.x, baseY - b.elbo - b.kl, barW, b.kl, C.amber);
    addText(slide, 'L', b.x, baseY - b.elbo, barW, b.elbo, { fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle' });
    if (b.kl > 0) addText(slide, 'KL', b.x, baseY - b.elbo - b.kl, barW, b.kl, { fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle' });
    addText(slide, b.label, b.x - 0.45, baseY + 0.06, barW + 0.9, 0.55, { fontSize: 11.5, color: C.ink, align: 'center' });
  });
  addLine(slide, 0.9, baseY, 6.9, baseY, { color: C.ink, width: 1 });
  addText(slide, '棒の全体 ＝ 対数尤度 log p(x|θ)（概念図）', 0.9, 2.6, 5, 0.3, { fontSize: 11.5, color: C.muted });

  const rx = 7.5;
  const rw = SLIDE_W - MARGIN_X - rx;
  addFormula(slide, 'elbo_def', rx, 2.7, { scale: Math.min(1, rw / formulaSize('elbo_def').w), alt: 'L(q,theta) = E_q[log p(x,z|theta) - log q(z)]' });
  addBullets(slide, [
    'KL ≥ 0 なので、L は常に対数尤度の下界',
    [{ text: 'E ステップ：', bold: true, color: C.indigo }, 'q を事後分布にする → KL = 0 で L が尤度に接する'],
    [{ text: 'M ステップ：', bold: true, color: C.amber }, 'q を固定して L を最大化 → 尤度はそれ以上に上がる'],
    '尤度は各反復で下がらないが、たどり着くのは局所的な最大値',
  ], rx, 3.3, rw, 3.4, { fontSize: 14.5, space: 11 });
  addSource(slide, '出典：Neal & Hinton (1998)、Bishop (2006) 9.4節');
}

// =====================================================================
// 11. 事後分布が計算できないとき
// =====================================================================
{
  const slide = newContentSlide('3  推定の考え方', '事後分布が計算できないときの方法', [
    'EM アルゴリズムの E ステップには、潜在変数の事後分布が必要です。混合ガウスモデルや因子分析では正確に計算できますが、モデルが複雑になると計算できなくなります。',
    'その場合の代表的な方法が3つあります。',
    '変分推論は、事後分布を扱いやすい分布で近似し、ELBO を最大化します。速い反面、近似による偏りが残ります。',
    'MCMC は、事後分布からサンプルを多数発生させて近似します。正確ですが計算が重くなります。',
    '償却推論は、データから近似事後分布を出力するニューラルネットワークを学習する方法で、変分オートエンコーダで使われます。',
  ].join('\n'));
  addCard(slide, MARGIN_X, 1.6, CONTENT_W, 0.75, { fill: C.gray });
  addText(slide, 'EM の E ステップには事後分布 p(z|x) が必要。モデルが複雑になると、これを正確に計算できない。',
    MARGIN_X + 0.3, 1.6, CONTENT_W - 0.6, 0.75, { fontSize: 15, valign: 'middle' });
  const cards = [
    ['変分推論', '事後分布を扱いやすい分布 q で近似し、ELBO を最大化する', '速い。近似による偏りが残る', 'トピックモデル（LDA）'],
    ['MCMC', '事後分布からサンプルを多数発生させ、その集まりで近似する', '正確。計算が重い', 'ベイズ推定（Stan など）'],
    ['償却推論', 'x から q(z|x) を出すニューラルネット（エンコーダ）を学習する', '新しいデータでも一度の計算で推論できる', '変分オートエンコーダ（VAE）'],
  ];
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const y = 2.65;
  const h = 4.0;
  cards.forEach(([title, desc, feature, example], i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, y, cardW, h, { fill: C.tint });
    addNode(slide, x + 0.5, y + 0.5, 0.56, C.indigo, String(i + 1), { fontSize: 17 });
    addText(slide, title, x + 0.95, y + 0.25, cardW - 1.1, 0.5, { fontSize: 18, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 1.0, cardW - 0.6, 1.2, { fontSize: 14.5 });
    addText(slide, [{ text: '特徴：', bold: true, color: C.amber }, { text: feature }], x + 0.3, y + 2.3, cardW - 0.6, 0.8, { fontSize: 13.5 });
    addText(slide, [{ text: '使われる例：', bold: true, color: C.muted }, { text: example, color: C.muted }], x + 0.3, y + 3.15, cardW - 0.6, 0.6, { fontSize: 12.5 });
  });
  addSource(slide, '出典：Blei, Kucukelbir & McAuliffe (2017)、Kingma & Welling (2014)');
}

// =====================================================================
// 12. 混合ガウスモデル
// =====================================================================
{
  const slide = newContentSlide('4  代表的なモデルとデモ', '混合ガウスモデル：データを「確率つき」でグループに分ける', [
    '混合ガウスモデルは、データが K 個の正規分布の混ざり合いから生まれたと考えるモデルです。',
    '生成の仕組みとしては、まず確率 π に従ってどの成分から出すかを選び、これが潜在変数 z です。次に、選んだ成分の正規分布から x を出します。',
    'よく使われる k-means と比べると、違いは主に3つです。k-means は各点を1つのグループに決めますが、混合ガウスモデルは確率で持ちます。また、k-means は丸いクラスタを想定しますが、混合ガウスモデルは楕円の形や大きさも推定します。',
    'k-means は、混合ガウスモデルで共分散を等しい球形にし、その大きさを0に近づけた極限とみなせます。',
  ].join('\n'));
  addCard(slide, MARGIN_X, 1.6, 5.7, 1.3, { fill: C.tint });
  const gmmSize = formulaSize('gmm');
  addFormula(slide, 'gmm', MARGIN_X + (5.7 - gmmSize.w) / 2, 1.6 + (1.3 - gmmSize.h) / 2, { alt: 'p(x) = sum_k pi_k N(x | mu_k, Sigma_k)' });
  addText(slide, 'データの生まれ方（生成モデル）', MARGIN_X, 3.15, 5.7, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  addBullets(slide, [
    [{ text: '① ', bold: true }, '成分 k を確率 π_{k} で選ぶ（これが潜在変数 z）'],
    [{ text: '② ', bold: true }, '選んだ成分の正規分布 N(μ_{k}, Σ_{k}) から x を出す'],
  ], MARGIN_X, 3.6, 3.4, 1.8, { fontSize: 14.5, space: 10, bullet: false });
  // 小さなグラフィカルモデル
  const zp = [MARGIN_X + 4.55, 3.85];
  const xp = [MARGIN_X + 4.55, 5.1];
  arrowBetween(slide, zp, xp, 0.33, 0.33, { width: 1.75 });
  latentNode(slide, zp[0], zp[1], 0.66, 'z');
  observedNode(slide, xp[0], xp[1], 0.66, 'x');
  addText(slide, 'π', zp[0] - 1.05, zp[1] - 0.18, 0.4, 0.36, { fontSize: 15, bold: true, align: 'center', valign: 'middle' });
  addLine(slide, zp[0] - 0.65, zp[1], zp[0] - 0.36, zp[1], { color: C.ink, width: 1.25, arrow: true });
  addText(slide, 'μ, Σ', xp[0] - 1.25, xp[1] - 0.18, 0.6, 0.36, { fontSize: 14, bold: true, align: 'center', valign: 'middle' });
  addLine(slide, xp[0] - 0.65, xp[1], xp[0] - 0.36, xp[1], { color: C.ink, width: 1.25, arrow: true });

  const rx = 6.75;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'k-means との違い', rx, 1.6, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  const rows = [
    ['所属', '1つに決める（ハード）', '確率で持つ（ソフト）'],
    ['クラスタの形', '丸い・同じ大きさを想定', '楕円の形・大きさも推定'],
    ['推定方法', '中心との距離を最小化', 'EM で尤度を最大化'],
    ['数の選び方', 'エルボー法など', 'BIC などの情報量規準'],
  ];
  slide.addTable([
    [
      { text: '', options: { fill: { color: C.white } } },
      { text: 'k-means', options: { bold: true, fill: { color: C.gray } } },
      { text: '混合ガウスモデル', options: { bold: true, color: C.white, fill: { color: C.indigo } } },
    ],
    ...rows.map(([k, a, b]) => [
      { text: k, options: { bold: true, color: C.indigo } },
      { text: a, options: {} },
      { text: b, options: { fill: { color: C.tint } } },
    ]),
  ], {
    x: rx, y: 2.05, w: rw, colW: [1.3, 2.35, rw - 3.65],
    fontFace: FONT, fontSize: 12.5, valign: 'middle', margin: cellMargin, color: C.ink,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.62,
  });
  addCard(slide, rx, 5.35, rw, 1.3, { fill: C.gray });
  addText(slide, 'k-means は、混合ガウスモデルで共分散を等しい球形にし、その大きさを 0 に近づけた極限とみなせる。',
    rx + 0.25, 5.35, rw - 0.5, 1.3, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 13. デモ①：GMM と k-means
// =====================================================================
{
  const s = gmm.scatter;
  const slide = newContentSlide('4  代表的なモデルとデモ', 'デモ①：細長いクラスタでは混合ガウスモデルが有利', [
    `ここからデモです。3つの正規分布から ${gmm.n} 点の合成データを作りました。2つは斜めに細長く、1つは丸い分布です。`,
    `左は、NumPy で実装した EM アルゴリズムで混合ガウスモデルを推定した結果です。真の所属との一致率は ${pct1(gmm.em_accuracy)}% でした。`,
    `右の k-means は ${pct1(gmm.kmeans_accuracy)}% です。丸いクラスタを想定するため、細長い分布の端の点を、丸いクラスタに取り込んでしまっています。`,
    `なお、真のパラメータを知っていても、分布が重なっているため一致率は ${pct1(gmm.oracle_accuracy)}% が上限です。混合ガウスモデルはほぼその上限に達しています。`,
    `左の灰色の点は、どの成分の確率も0.9未満で、どちらとも言い切れない点です。全体の ${pct1(gmm.share_ambiguous)}% あり、確率で持つことの意味が分かります。`,
  ].join('\n'));
  const threshold = 0.9;
  const emGroups = s.em_label.map((g, i) => (s.max_resp[i] < threshold ? 3 : g));
  const axisRange = { xMin: -4, xMax: 7, yMin: -4, yMax: 7 };
  const chartW = 5.95;
  const chartH = 4.55;
  addGroupScatter(slide, { x: MARGIN_X, y: 1.55, w: chartW, h: chartH }, s.x, s.y, emGroups,
    ['成分1', '成分2', '成分3', 'あいまい（最大の確率 < 0.9）'], [...CLUSTER_COLORS, C.ambiguous],
    `混合ガウスモデル（EM）：一致率 ${pct1(gmm.em_accuracy)}%`, axisRange);
  addGroupScatter(slide, { x: MARGIN_X + chartW + 0.2, y: 1.55, w: chartW, h: chartH }, s.x, s.y, gmm.kmeans_label,
    ['クラスタ1', 'クラスタ2', 'クラスタ3'], CLUSTER_COLORS,
    `k-means：一致率 ${pct1(gmm.kmeans_accuracy)}%`, axisRange);
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.62, { fill: C.gray });
  addText(slide, `一致率＝真の所属との一致（番号の入れ替えを考慮）。分布が重なっているため、真のパラメータを使っても ${pct1(gmm.oracle_accuracy)}% が上限。`,
    MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.62, { fontSize: 13, valign: 'middle' });
}

// =====================================================================
// 14. デモ②：EM の収束と局所解
// =====================================================================
{
  const rs = gmm.random_starts;
  const worst = Math.min(...rs.finals);
  const slide = newContentSlide('4  代表的なモデルとデモ', 'デモ②：EM の収束の様子と、初期値による局所解', [
    `EM アルゴリズムの各反復で、1点あたりの平均対数尤度がどう変わったかを示します。最初の数回で大きく上がり、${gmm.n_iter} 回で収束しました。理論どおり、一度も下がっていません。`,
    `最終的な値は ${gmm.final_loglik.toFixed(4)} で、scikit-learn の GaussianMixture の結果 ${gmm.sklearn_loglik.toFixed(4)} とほぼ一致しました。`,
    `下の表は、推定した混合比と平均を真の値と比べたものです。よく復元できています。`,
    `一方、初期値を変えて ${rs.n} 回推定すると、${rs.n_worse} 回は ${worst.toFixed(3)} という悪い局所解で止まりました。実務では、初期値を変えて何度も推定し、最も尤度の高い結果を選ぶ必要があります。`,
  ].join('\n'));
  const labels = gmm.history.map((_, i) => String(i));
  slide.addChart(pres.charts.LINE, [{ name: '平均対数尤度', labels, values: gmm.history }], {
    x: MARGIN_X, y: 1.55, w: 6.9, h: 3.2,
    ...chartBase(),
    chartColors: [C.indigo], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 5,
    showTitle: true, title: 'EM の反復ごとの平均対数尤度（1点あたり）',
    catAxisTitle: '反復回数', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontSize: 11,
    catAxisLabelFrequency: 4, catAxisLabelRotate: 0,
    valAxisMinVal: -4.6, valAxisMaxVal: -3.4, valAxisMajorUnit: 0.2, valAxisLabelFormatCode: '0.0',
    showLegend: false,
  });
  const header = ['', '混合比（真）', '混合比（推定）', '平均（真）', '平均（推定）'];
  const fmtMean = (m) => `(${m[0].toFixed(2)}, ${m[1].toFixed(2)})`;
  const rows = [0, 1, 2].map((k) => [
    `成分${k + 1}`, gmm.true.weights[k].toFixed(2), gmm.estimated.weights[k].toFixed(2), fmtMean(gmm.true.means[k]), fmtMean(gmm.estimated.means[k]),
  ]);
  const cellMargin = [0.03, 0.08, 0.03, 0.08];
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, fill: { color: C.gray }, color: C.ink } })),
    ...rows.map((r) => r.map((cell, j) => ({
      text: cell, options: { bold: j === 0, color: j === 0 ? CLUSTER_COLORS[rows.indexOf(r)] : C.ink, fill: { color: j === 2 || j === 4 ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 4.95, w: 6.9, colW: [1.0, 1.3, 1.4, 1.55, 1.65],
    fontFace: FONT, fontSize: 12.5, align: 'center', valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.4,
  });
  const rx = 7.95;
  const rw = SLIDE_W - MARGIN_X - rx;
  const stats = [
    ['収束までの反復', `${gmm.n_iter} 回`, C.tint, C.indigo],
    ['最終の平均対数尤度', gmm.final_loglik.toFixed(4), C.tint, C.indigo],
    [`初期値 ${rs.n} 通りのうち悪い局所解`, `${rs.n_worse} 回`, C.amberTint, C.amber],
  ];
  stats.forEach(([label, value, fill, color], i) => {
    const y = 1.6 + i * 1.0;
    addCard(slide, rx, y, rw, 0.85, { fill });
    addText(slide, label, rx + 0.2, y, rw * 0.6, 0.85, { fontSize: 13, valign: 'middle' });
    addText(slide, value, rx + rw * 0.55, y, rw * 0.45 - 0.2, 0.85, { fontSize: 22, bold: true, color, align: 'right', valign: 'middle' });
  });
  addBullets(slide, [
    `scikit-learn の結果（${gmm.sklearn_loglik.toFixed(4)}）とほぼ一致`,
    `悪い局所解の対数尤度は ${worst.toFixed(3)}。初期値を変えて何度も推定し、最も尤度の高い結果を採用する`,
  ], rx, 4.75, rw, 2.0, { fontSize: 13.5, space: 8 });
}

// =====================================================================
// 15. デモ③：成分数の選択
// =====================================================================
{
  const bic = gmm.bic;
  const best = bic.reduce((a, b) => (b.bic < a.bic ? b : a));
  const bestAic = bic.reduce((a, b) => (b.aic < a.aic ? b : a));
  const aic3 = bic.find((b) => b.k === 3).aic;
  const aic4 = bic.find((b) => b.k === 4).aic;
  const slide = newContentSlide('4  代表的なモデルとデモ', 'デモ③：成分の数 K を情報量規準で選ぶ', [
    '混合ガウスモデルでは、成分の数 K を事前に決める必要があります。同じデータに K = 1 から 7 までのモデルを当てはめ、情報量規準を比べました。',
    'BIC は、当てはまりの良さに、パラメータ数に応じた罰則を加えた量で、小さいほど良いモデルです。',
    `BIC は K = ${best.k} で最小になり、真の成分数 3 を正しく選べました。`,
    `AIC も K = ${bestAic.k} で最小ですが、K = 4 との差が ${(aic4 - aic3).toFixed(1)} と小さく、BIC ほどはっきりしません。一般に AIC は BIC より多めの成分数を選びやすい傾向があります。`,
    '実務では、情報量規準で候補を絞ったうえで、各成分が解釈できるかも合わせて決めます。',
  ].join('\n'));
  const labels = bic.map((b) => `K=${b.k}`);
  slide.addChart(pres.charts.LINE, [
    { name: 'BIC', labels, values: bic.map((b) => b.bic) },
    { name: 'AIC', labels, values: bic.map((b) => b.aic) },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.4, h: 5.15,
    ...chartBase(),
    chartColors: [C.indigo, C.peri], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
    showTitle: true, title: '成分数ごとの情報量規準（小さいほど良い）',
    valAxisMinVal: 4000, valAxisMaxVal: 5400, valAxisMajorUnit: 200, valAxisLabelFormatCode: '#,##0',
    showLegend: true, legendPos: 'b', catAxisLabelFontSize: 12,
  });
  const rx = 8.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.0, { fill: C.tint });
  const bicSize = formulaSize('bic');
  addFormula(slide, 'bic', rx + (rw - bicSize.w) / 2, 1.6 + (1.0 - bicSize.h) / 2, { alt: 'BIC = -2 log L + p log N' });
  addText(slide, 'L：最大尤度　p：パラメータ数　N：データ数', rx, 2.68, rw, 0.3, { fontSize: 11.5, color: C.muted });
  addCard(slide, rx, 3.15, rw, 1.25, { fill: C.amberTint });
  addText(slide, [{ text: 'BIC が最小', fontSize: 13, breakLine: true }, { text: `K = ${best.k}`, fontSize: 30, bold: true, color: C.amber }], rx + 0.25, 3.15, rw - 0.5, 1.25, { valign: 'middle', paraSpaceAfter: 2 });
  addBullets(slide, [
    '真の成分数 3 を正しく選べた',
    `AIC も K = ${bestAic.k} で最小だが、K = 4 との差は ${(aic4 - aic3).toFixed(1)} と小さい`,
    '候補を絞ったら、各成分が解釈できるかも合わせて決める',
  ], rx, 4.6, rw, 2.2, { fontSize: 13.5, space: 8 });
  addSource(slide, '出典：Schwarz (1978)');
}

// =====================================================================
// 16. 因子分析
// =====================================================================
{
  const slide = newContentSlide('4  代表的なモデルとデモ', '因子分析：多くの変数を少数の共通因子で説明する', [
    '因子分析は、多数の観測変数の相関を、少数の共通因子で説明するモデルです。1904年のスピアマンの研究にさかのぼる、最も古い潜在変数モデルの一つです。',
    '各観測変数は、共通因子に因子負荷量を掛けたものと、その変数だけに固有の独自因子の和で表されます。独自因子には測定誤差も含まれます。',
    'このモデルから、観測変数の共分散行列は、因子負荷量の積と独自分散の和になります。',
    '注意点として、因子負荷量は回転しても同じ共分散を再現するので、一意に決まりません。そこで、バリマックス回転などで解釈しやすい向きに回します。',
  ].join('\n'));
  // 左：パス図
  const gx = MARGIN_X;
  const gy = 1.6;
  const gw = 5.9;
  addCard(slide, gx, gy, gw, 5.15, { fill: C.gray });
  const f1 = [gx + 1.65, gy + 1.05];
  const f2 = [gx + 4.25, gy + 1.05];
  const xsPos = [0, 1, 2, 3, 4, 5].map((i) => [gx + 0.6 + i * 0.94, gy + 3.35]);
  // デモの真の負荷量のうち 0.5 以上のものを、大きさに比例した太さで描く
  fa.true_loadings.forEach((row, v) => row.forEach((loading, f) => {
    if (loading < 0.5) return;
    arrowBetween(slide, f === 0 ? f1 : f2, xsPos[v], 0.45, 0.3, { width: loading * LOADING_TO_WIDTH, color: f === 0 ? C.indigo : C.amber });
  }));
  latentNode(slide, f1[0], f1[1], 0.9, 'f_{1}', { fontSize: 18 });
  latentNode(slide, f2[0], f2[1], 0.9, 'f_{2}', { fontSize: 18, color: C.amber });
  xsPos.forEach((p, i) => {
    observedNode(slide, p[0], p[1], 0.6, `x_{${i + 1}}`, { fontSize: 14 });
    const e = [p[0], p[1] + 1.05];
    arrowBetween(slide, e, p, 0.18, 0.3, { width: 1.25, color: C.muted });
    latentNode(slide, e[0], e[1], 0.36, '', { color: C.muted });
  });
  addText(slide, '独自因子 ε（各変数に固有のばらつき・測定誤差）', gx + 0.3, gy + 4.65, gw - 0.6, 0.3, { fontSize: 11.5, color: C.muted });
  addText(slide, '共通因子', gx + 0.3, gy + 0.2, 2, 0.3, { fontSize: 12, bold: true, color: C.muted });
  addText(slide, withBreaks(['矢印の太さ＝デモの真の因子負荷量', '（0.5 以上のみ表示）']), gx + gw - 3.3, gy + 0.15, 3.05, 0.5, { fontSize: 11, color: C.muted, align: 'right' });

  const rx = 6.85;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.35, { fill: C.tint });
  addFormula(slide, 'fa', rx + 0.25, 1.72, { scale: Math.min(1, (rw - 0.5) / formulaSize('fa').w), alt: 'x = mu + Lambda f + epsilon' });
  addText(slide, '共分散の構造', rx + 0.25, 2.3, 1.6, 0.45, { fontSize: 12.5, color: C.muted, valign: 'middle' });
  addFormula(slide, 'fa_cov', rx + 1.9, 2.33, { alt: 'Sigma = Lambda Lambda^T + Psi' });
  addBullets(slide, [
    [{ text: '共通因子 f：', bold: true }, '複数の変数に共通して効く要因'],
    [{ text: '因子負荷量 Λ：', bold: true }, '各因子が各変数にどれだけ効くか'],
    [{ text: '独自分散 Ψ：', bold: true }, '因子で説明できない各変数のばらつき'],
    [{ text: '回転の不定性：', bold: true }, 'Λ を回転しても共分散は同じ → バリマックス回転などで解釈しやすい向きにする'],
  ], rx, 3.2, rw, 2.7, { fontSize: 14, space: 9 });
  addFormula(slide, 'rotation', rx + 0.3, 5.75, { alt: '(Lambda R)(Lambda R)^T = Lambda Lambda^T' });
  addSource(slide, '出典：Spearman (1904)、Kaiser (1958)');
}

// =====================================================================
// 17. デモ④：因子分析
// =====================================================================
{
  const slide = newContentSlide('4  代表的なモデルとデモ', 'デモ④：因子分析で真の因子負荷量を復元できた', [
    `次は因子分析のデモです。2つの因子から6つの観測変数を ${fa.n.toLocaleString()} 件生成しました。x1 から x3 は主に因子1、x4 から x6 は主に因子2 の影響を受けます。`,
    '左のグラフは、相関行列の固有値です。1を超えるのは最初の2つだけで、因子数を2とする目安、カイザー基準と一致します。',
    `右の表は、scikit-learn の FactorAnalysis で2因子を推定し、バリマックス回転した結果です。真の負荷量との差は最大でも ${fa.max_abs_error.toFixed(2)} でした。`,
    '因子の順番と符号は回転の不定性で決まらないため、真の値に合わせて並べ替えています。実データでは真の値がないので、負荷量の大きい変数の共通点から因子を解釈します。',
  ].join('\n'));
  const eig = fa.eigenvalues;
  const eigLabels = eig.map((_, i) => `第${i + 1}`);
  slide.addChart([
    { type: pres.charts.BAR, data: [{ name: '固有値', labels: eigLabels, values: eig }], options: { chartColors: [C.indigo], barGapWidthPct: 60 } },
    { type: pres.charts.LINE, data: [{ name: '基準（固有値 = 1）', labels: eigLabels, values: eig.map(() => 1) }], options: { chartColors: [C.amber], lineSize: 2, lineDash: 'dash', lineDataSymbol: 'none' } },
  ], {
    x: MARGIN_X, y: 1.55, w: 5.2, h: 4.4,
    ...chartBase(),
    showTitle: true, title: '相関行列の固有値（スクリープロット）',
    valAxisMinVal: 0, valAxisMaxVal: 2.5, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: '0.0',
    showValue: false, showLegend: true, legendPos: 'b',
  });
  addText(slide, '1 を超えるのは 2 つ → 因子数 2 の目安', MARGIN_X, 6.05, 5.2, 0.35, { fontSize: 13, bold: true, color: C.indigo, align: 'center' });

  const header = ['変数', '真 F1', '推定 F1', '真 F2', '推定 F2', '独自分散\n（真）', '独自分散\n（推定）'];
  const cellMargin = [0.03, 0.06, 0.03, 0.06];
  const highlight = (v) => Math.abs(v) >= 0.5;
  const rows = fa.true_loadings.map((t, i) => {
    const e = fa.est_loadings[i];
    const cells = [`x${i + 1}`, t[0], e[0], t[1], e[1], fa.true_uniqueness[i], fa.est_uniqueness[i]];
    return cells.map((v, j) => {
      if (j === 0) return { text: v, options: { bold: true, color: C.indigo } };
      const isLoading = j >= 1 && j <= 4;
      const factorColor = j <= 2 ? C.indigo : C.amber;
      return {
        text: Number(v).toFixed(2),
        options: {
          color: isLoading && highlight(v) ? C.white : C.ink,
          bold: isLoading && highlight(v),
          fill: { color: isLoading && highlight(v) ? factorColor : (j % 2 === 0 ? C.tint : C.white) },
        },
      };
    });
  });
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, fill: { color: C.gray }, color: C.ink } })),
    ...rows,
  ], {
    x: 6.15, y: 1.6, w: SLIDE_W - MARGIN_X - 6.15, colW: [0.75, 0.85, 0.95, 0.85, 0.95, 1.1, 1.13],
    fontFace: FONT, fontSize: 12.5, align: 'center', valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.5,
  });
  addBullets(slide, [
    `真の負荷量との差は最大 ${fa.max_abs_error.toFixed(2)}（データ ${fa.n.toLocaleString()} 件）`,
    '濃い色は負荷量 0.5 以上。x1〜x3 が因子1、x4〜x6 が因子2 に対応した',
    '因子の順番と符号は決まらないため、真の値に合わせて並べ替えた',
  ], 6.15, 5.3, SLIDE_W - MARGIN_X - 6.15, 1.5, { fontSize: 13, space: 5 });
}

// =====================================================================
// 18. 主成分分析との違い
// =====================================================================
{
  const slide = newContentSlide('4  代表的なモデルとデモ', '主成分分析（PCA）・確率的 PCA・因子分析の違い', [
    '因子分析とよく混同される主成分分析との違いを整理します。',
    '主成分分析は、データの分散が最大になる方向を順に取る方法で、確率モデルではなく、誤差という考え方もありません。',
    'Tipping と Bishop は、主成分分析を潜在変数モデルとして書き直した確率的主成分分析を示しました。全ての変数に同じ大きさの誤差を仮定すると、最尤解が主成分分析と一致します。',
    '因子分析は、変数ごとに違う大きさの誤差を認める点が確率的主成分分析と違います。',
    '目的で使い分けると、データの圧縮や可視化なら主成分分析、背後の要因を解釈したいなら因子分析、が基本です。',
  ].join('\n'));
  const header = ['観点', '主成分分析（PCA）', '確率的 PCA（PPCA）', '因子分析（FA）'];
  const rows = [
    ['考え方', '分散が最大の方向を順に取る', 'PCA を潜在変数モデルとして表す', '共通因子＋独自因子で相関を説明する'],
    ['誤差の扱い', 'モデルに誤差はない', '全変数で同じ大きさの誤差 σ²', '変数ごとに違う大きさの誤差 Ψ'],
    ['尤度', 'なし', 'あり（EM でも推定できる）', 'あり'],
    ['回転', 'しない（成分は一意）', '回転の不定性がある', '回転して解釈する'],
    ['主な目的', '次元削減・可視化', '次元削減・欠測の補完・確率的な扱い', '背後の要因の解釈'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  slide.addTable([
    header.map((h, j) => ({ text: h, options: { bold: true, color: j === 3 ? C.white : C.ink, fill: { color: j === 3 ? C.indigo : C.gray } } })),
    ...rows.map((r) => r.map((cell, j) => ({
      text: cell, options: { bold: j === 0, color: j === 0 ? C.indigo : C.ink, fill: { color: j === 3 ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [1.7, 3.3, 3.55, 3.55],
    fontFace: FONT, fontSize: 13.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.62,
  });
  addCard(slide, MARGIN_X, 5.55, CONTENT_W, 1.2, { fill: C.gray });
  addText(slide, '確率的 PCA', MARGIN_X + 0.3, 5.55, 1.6, 1.2, { fontSize: 14, bold: true, color: C.indigo, valign: 'middle' });
  const ppca = formulaSize('ppca');
  addFormula(slide, 'ppca', MARGIN_X + 1.95, 5.55 + (1.2 - ppca.h) / 2, { alt: 'x = W z + mu + epsilon, epsilon ~ N(0, sigma^2 I)' });
  addText(slide, '誤差を全変数で同じ σ² と置くと、最尤解が PCA と一致する。誤差を変数ごとの Ψ にしたものが因子分析。',
    MARGIN_X + 2.2 + ppca.w, 5.55, CONTENT_W - ppca.w - 2.5, 1.2, { fontSize: 13, valign: 'middle' });
  addSource(slide, '出典：Tipping & Bishop (1999)、Bishop (2006) 第12章');
}

// =====================================================================
// 19. 構造方程式モデリング
// =====================================================================
{
  const slide = newContentSlide('5  発展的なモデル', '構造方程式モデリング（SEM）：潜在変数どうしの関係を調べる', [
    '構造方程式モデリング、SEM は、因子分析と回帰分析を組み合わせたモデルです。',
    '左の図は架空の例です。「工程の安定性」という潜在変数を3つの測定値で、「製品の品質」という潜在変数を3つの指標で測り、安定性が品質に与える影響を推定します。',
    '潜在変数と観測変数の関係を測定モデル、潜在変数どうしの関係を構造モデルと呼びます。測定誤差を分けて扱えるのが利点です。',
    'モデルとデータの合い方は、CFI や RMSEA などの適合度指標で評価します。よく使われる目安は、Hu と Bentler による CFI 0.95 以上、RMSEA 0.06 以下です。',
    '注意点として、矢印の向きは分析者の仮説です。適合度が良くても、因果関係がデータで証明されたことにはなりません。',
  ].join('\n'));
  const gx = MARGIN_X;
  const gy = 1.6;
  const gw = 7.0;
  const gh = 5.15;
  addCard(slide, gx, gy, gw, gh, { fill: C.gray });
  const xi = [gx + 1.95, gy + 2.35];
  const eta = [gx + 5.05, gy + 2.35];
  const leftObs = ['温度の変動', '圧力の変動', 'アラーム件数'].map((t, i) => ({ t, p: [gx + 0.95 + i * 1.0, gy + 4.25] }));
  const rightObs = ['寸法の精度', '外観の良品率', '歩留まり'].map((t, i) => ({ t, p: [gx + 4.05 + i * 1.0, gy + 4.25] }));
  [...leftObs.map((o) => [xi, o.p]), ...rightObs.map((o) => [eta, o.p])].forEach(([a, b]) => arrowBetween(slide, a, b, 0.6, 0.3, { width: 1.5 }));
  arrowBetween(slide, xi, eta, 0.62, 0.62, { width: 3, color: C.amber });
  latentNode(slide, xi[0], xi[1], 1.25, '', {});
  latentNode(slide, eta[0], eta[1], 1.25, '', {});
  addText(slide, withBreaks(['工程の', '安定性']), xi[0] - 0.6, xi[1] - 0.45, 1.2, 0.9, { fontSize: 14, bold: true, color: C.indigo, align: 'center', valign: 'middle' });
  addText(slide, withBreaks(['製品の', '品質']), eta[0] - 0.6, eta[1] - 0.45, 1.2, 0.9, { fontSize: 14, bold: true, color: C.indigo, align: 'center', valign: 'middle' });
  addText(slide, '構造モデル', (xi[0] + eta[0]) / 2 - 0.8, xi[1] - 0.72, 1.6, 0.35, { fontSize: 13, bold: true, color: C.amber, align: 'center' });
  [...leftObs, ...rightObs].forEach((o) => {
    observedNode(slide, o.p[0], o.p[1], 0.6, '');
    addText(slide, o.t, o.p[0] - 0.5, o.p[1] + 0.36, 1.0, 0.55, { fontSize: 10.5, color: C.ink, align: 'center' });
  });
  addText(slide, '測定モデル', gx + 0.25, gy + 3.2, 1.3, 0.3, { fontSize: 12, bold: true, color: C.muted });
  addText(slide, '例（架空）：工程の安定性が製品の品質に与える影響', gx + 0.3, gy + 0.2, gw - 0.6, 0.35, { fontSize: 13, bold: true, color: C.muted });

  const rx = 8.0;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    [{ text: '測定モデル：', bold: true }, '潜在変数と観測変数の関係（因子分析の部分）'],
    [{ text: '構造モデル：', bold: true }, '潜在変数どうしの関係（回帰の部分）'],
    [{ text: '利点：', bold: true }, '測定誤差を分けて、潜在変数間の関係を推定できる'],
    [{ text: '適合度：', bold: true }, 'CFI 0.95 以上、RMSEA 0.06 以下などが目安（Hu & Bentler, 1999）'],
  ], rx, 1.65, rw, 3.6, { fontSize: 14, space: 10 });
  addCard(slide, rx, 5.35, rw, 1.4, { fill: C.amberTint });
  addText(slide, [
    { text: '注意', bold: true, color: C.amber, breakLine: true },
    { text: '矢印の向きは分析者の仮説。適合度が良くても、因果関係が証明されたわけではない。' },
  ], rx + 0.25, 5.35, rw - 0.5, 1.4, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 3 });
  addSource(slide, '出典：Bollen (1989)、Hu & Bentler (1999)。ツール：R の lavaan、Python の semopy');
}

// =====================================================================
// 20. 時系列の潜在変数モデル
// =====================================================================
{
  const slide = newContentSlide('5  発展的なモデル', '時系列の潜在変数モデル：HMM と状態空間モデル', [
    '潜在変数が時間とともに変わるモデルです。',
    '各時刻の隠れた状態 z が、前の時刻の状態に応じて変わり、各時刻の観測 x はその時刻の状態から出てくる、と考えます。',
    '状態が離散の場合が隠れマルコフモデル、HMM です。例えば装置の正常、劣化、故障前といった状態を、センサー値から推定します。EM アルゴリズムの一種であるバウム・ウェルチ法で学習し、ビタビ法で最も確からしい状態の列を求めます。',
    '状態が連続の場合が状態空間モデルです。線形で正規分布なら、カルマンフィルタで状態を逐次推定できます。非線形の場合は粒子フィルタなどを使います。',
  ].join('\n'));
  const gy = 1.6;
  addCard(slide, MARGIN_X, gy, CONTENT_W, 2.55, { fill: C.gray });
  const T = 5;
  const startX = 2.2;
  const stepX = 2.15;
  const zY = gy + 0.75;
  const xY = gy + 1.85;
  for (let t = 0; t < T; t += 1) {
    const zx = startX + t * stepX;
    if (t < T - 1) arrowBetween(slide, [zx, zY], [zx + stepX, zY], 0.33, 0.33, { width: 1.75, color: C.indigo });
    arrowBetween(slide, [zx, zY], [zx, xY], 0.33, 0.3, { width: 1.5 });
    const label = t === T - 1 ? 'T' : String(t + 1);
    latentNode(slide, zx, zY, 0.66, `z_{${label}}`, { fontSize: 14 });
    observedNode(slide, zx, xY, 0.6, `x_{${label}}`, { fontSize: 14 });
  }
  addText(slide, '⋯', startX + 3.5 * stepX - 0.3, zY - 0.25, 0.6, 0.5, { fontSize: 18, color: C.muted, align: 'center', valign: 'middle' });
  addText(slide, '隠れた状態', MARGIN_X + 0.25, zY - 0.17, 1.2, 0.34, { fontSize: 12, bold: true, color: C.indigo });
  addText(slide, '観測', MARGIN_X + 0.25, xY - 0.17, 1.2, 0.34, { fontSize: 12, bold: true, color: C.muted });
  const hmm = formulaSize('hmm');
  addFormula(slide, 'hmm', MARGIN_X + (CONTENT_W - hmm.w) / 2, 4.3, { alt: 'p(x_1:T, z_1:T) = p(z_1) prod p(z_t|z_t-1) prod p(x_t|z_t)' });
  const cardW = (CONTENT_W - 0.4) / 2;
  const cardY = 5.1;
  const specs = [
    ['隠れマルコフモデル（HMM）', '状態 z が離散', '例：装置の「正常／劣化／故障前」をセンサー値から推定。学習はバウム・ウェルチ法（EM の一種）、状態列の推定はビタビ法'],
    ['状態空間モデル', '状態 z が連続', '例：真の値や位置を、ノイズを含む観測から推定。線形・正規ならカルマンフィルタ、非線形なら粒子フィルタなど'],
  ];
  specs.forEach(([title, tag, desc], i) => {
    const x = MARGIN_X + i * (cardW + 0.4);
    addCard(slide, x, cardY, cardW, 1.7, { fill: i === 0 ? C.tint : C.amberTint });
    addText(slide, [{ text: title, bold: true, color: i === 0 ? C.indigo : C.amber }, { text: `　${tag}`, color: C.muted, fontSize: 12.5 }], x + 0.25, cardY + 0.12, cardW - 0.5, 0.42, { fontSize: 15.5, valign: 'middle' });
    addText(slide, desc, x + 0.25, cardY + 0.58, cardW - 0.5, 1.05, { fontSize: 13 });
  });
  addSource(slide, '出典：Rabiner (1989)、Kalman (1960)');
}

// =====================================================================
// 21. 変分オートエンコーダ
// =====================================================================
{
  const slide = newContentSlide('5  発展的なモデル', '深層潜在変数モデル：変分オートエンコーダ（VAE）', [
    '変分オートエンコーダ、VAE は、観測モデル p(x|z) をニューラルネットワークで表した潜在変数モデルです。Kingma と Welling が2014年に発表しました。',
    'エンコーダは、データ x から潜在変数の近似事後分布 q(z|x) を出力します。これが先ほど説明した償却推論です。デコーダは、z から x を生成します。',
    '学習では ELBO を最大化します。ELBO は、z から元のデータをどれだけ再現できるかという項と、近似事後分布が事前分布からどれだけ離れているかという罰則の項に分かれます。',
    'サンプリングを含む計算に勾配を通すため、z を平均と標準偏差と標準正規乱数で表す、再パラメータ化という工夫を使います。',
    '用途は、データの生成、低次元の表現学習、そして再構成誤差を使った異常検知などです。',
  ].join('\n'));
  const y0 = 1.75;
  const h = 2.3;
  const cy = y0 + h / 2;
  // x → エンコーダ → z → デコーダ → x̂
  observedNode(slide, 1.25, cy, 0.95, 'x', { fontSize: 22 });
  addCard(slide, 2.15, y0 + 0.35, 2.55, h - 0.7, { fill: C.tint, line: C.indigo });
  addText(slide, [{ text: 'エンコーダ', bold: true, color: C.indigo, breakLine: true }, { text: 'q_{φ}(z|x)', color: C.ink }], 2.15, y0 + 0.35, 2.55, h - 0.7, { fontSize: 15, align: 'center', valign: 'middle', paraSpaceAfter: 4 });
  latentNode(slide, 6.1, cy, 1.1, 'z', { fontSize: 24 });
  addCard(slide, 7.5, y0 + 0.35, 2.55, h - 0.7, { fill: C.amberTint, line: C.amber });
  addText(slide, [{ text: 'デコーダ', bold: true, color: C.amber, breakLine: true }, { text: 'p_{θ}(x|z)', color: C.ink }], 7.5, y0 + 0.35, 2.55, h - 0.7, { fontSize: 15, align: 'center', valign: 'middle', paraSpaceAfter: 4 });
  observedNode(slide, 11.05, cy, 0.95, '', { fill: C.peri });
  addText(slide, '再構成', 10.55, cy - 0.2, 1.0, 0.4, { fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle' });
  addLine(slide, 1.76, cy, 2.12, cy, { color: C.ink, width: 1.75, arrow: true });
  addLine(slide, 4.72, cy, 5.5, cy, { color: C.ink, width: 1.75, arrow: true });
  addLine(slide, 6.7, cy, 7.47, cy, { color: C.ink, width: 1.75, arrow: true });
  addLine(slide, 10.07, cy, 10.52, cy, { color: C.ink, width: 1.75, arrow: true });
  addText(slide, 'ニューラルネット', 2.15, y0 + h - 0.3, 2.55, 0.3, { fontSize: 11, color: C.muted, align: 'center' });
  addText(slide, 'ニューラルネット', 7.5, y0 + h - 0.3, 2.55, 0.3, { fontSize: 11, color: C.muted, align: 'center' });
  addText(slide, '償却推論', 2.15, y0, 2.55, 0.32, { fontSize: 12, bold: true, color: C.indigo, align: 'center' });
  addText(slide, '生成モデル', 7.5, y0, 2.55, 0.32, { fontSize: 12, bold: true, color: C.amber, align: 'center' });

  addCard(slide, MARGIN_X, 4.35, CONTENT_W, 1.15, { fill: C.gray });
  const vae = formulaSize('vae');
  addFormula(slide, 'vae', MARGIN_X + 0.35, 4.35 + 0.15, { alt: 'L = E_q[log p(x|z)] - KL(q(z|x) || p(z))' });
  addText(slide, [{ text: '第1項：', bold: true }, { text: 'データをどれだけ再現できるか（再構成）', breakLine: true }, { text: '第2項：', bold: true }, { text: '事前分布 p(z) からの離れ具合（罰則）' }],
    MARGIN_X + 0.6 + vae.w, 4.35, CONTENT_W - vae.w - 0.9, 1.15, { fontSize: 13, valign: 'middle' });
  addText(slide, '学習する量（ELBO）', MARGIN_X + 0.35, 4.35 + 0.72, 3, 0.3, { fontSize: 11.5, color: C.muted });
  addBullets(slide, [
    [{ text: '再パラメータ化：', bold: true }, 'z を平均と標準偏差と乱数で表し、サンプリングを含む計算に勾配を通す'],
    [{ text: '用途：', bold: true }, 'データの生成、低次元の表現学習、再構成誤差による異常検知'],
  ], MARGIN_X, 5.7, 8.3, 1.2, { fontSize: 13.5, space: 6 });
  addFormula(slide, 'reparam', 9.05, 5.78, { scale: 0.95, alt: 'z = mu(x) + sigma(x) * epsilon' });
  addSource(slide, '出典：Kingma & Welling (2014)');
}

// =====================================================================
// 22. その他のモデル
// =====================================================================
{
  const slide = newContentSlide('5  発展的なモデル', 'その他の代表的なモデル', [
    'ここまでに扱わなかった、代表的なモデルを3つ紹介します。',
    '潜在クラス分析は、アンケートのようなカテゴリの回答パターンを、少数の型の混ざり合いとして表します。混合ガウスモデルのカテゴリデータ版と言えます。',
    '項目反応理論は、テストの各問題の正誤から、受験者の能力という連続の潜在変数を推定します。式の a は問題の識別力、b は難しさを表します。',
    'トピックモデル LDA は、各文書を複数の話題の混ざり合い、各話題を単語の出やすさの分布として表します。推定には変分推論やギブスサンプリングが使われます。',
  ].join('\n'));
  const cards = [
    ['潜在クラス分析（LCA）', 'z：離散（回答者の型）　x：離散（回答）', 'カテゴリの回答パターンを、少数の「型」の混ざり合いとして表す。混合ガウスモデルのカテゴリ版', null, '例：アンケートから回答者のタイプを分ける'],
    ['項目反応理論（IRT）', 'z：連続（能力 θ）　x：離散（正誤）', '各問題の正答確率を、能力 θ と問題の識別力 a・難しさ b で表す', 'irt', '例：テストの採点、尺度の開発'],
    ['トピックモデル（LDA）', 'z：離散（話題）　x：離散（単語）', '文書を「話題の混ざり合い」、話題を「単語の出やすさの分布」として表す', null, '例：大量の文書・報告書の分類'],
  ];
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const y = 1.65;
  const h = 5.05;
  cards.forEach(([title, types, desc, formulaKey, example], i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, y, cardW, h, { fill: C.tint });
    addText(slide, title, x + 0.3, y + 0.25, cardW - 0.6, 0.5, { fontSize: 17, bold: true, color: C.indigo, valign: 'middle' });
    addText(slide, types, x + 0.3, y + 0.8, cardW - 0.6, 0.55, { fontSize: 12, color: C.muted });
    addText(slide, desc, x + 0.3, y + 1.45, cardW - 0.6, 1.4, { fontSize: 14 });
    if (formulaKey) {
      const size = formulaSize(formulaKey, 0.95);
      addFormula(slide, formulaKey, x + (cardW - size.w) / 2, y + 2.95, { scale: 0.95, alt: 'P(correct|theta) = 1 / (1 + exp(-a(theta - b)))' });
    }
    addCard(slide, x + 0.25, y + h - 1.2, cardW - 0.5, 0.95, { fill: C.white, radius: 0.08 });
    addText(slide, example, x + 0.4, y + h - 1.2, cardW - 0.8, 0.95, { fontSize: 13, color: C.ink, valign: 'middle' });
  });
  addSource(slide, '出典：Blei, Ng & Jordan (2003)、Bartholomew, Knott & Moustaki (2011)');
}

// =====================================================================
// 23. モデルの選び方
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '目的からモデルを選ぶ', [
    '目的からモデルを選ぶための早見表です。',
    '多数の変数の背後にある要因を解釈したいなら因子分析、解釈よりも次元の圧縮が目的なら主成分分析や確率的主成分分析です。',
    '連続値のデータをグループに分けたいなら混合ガウスモデル、アンケートのようなカテゴリの回答なら潜在クラス分析です。',
    '潜在変数どうしの関係を仮説として確かめたいなら SEM、時間とともに変わる状態を推定したいなら HMM か状態空間モデルです。',
    '画像など高次元のデータの生成や異常検知には VAE が候補になります。',
  ].join('\n'));
  const rows = [
    ['多数の変数を少数の要因にまとめ、要因を解釈したい', '因子分析（探索的 → 確認的）'],
    ['解釈より、次元を減らして圧縮・可視化したい', '主成分分析、確率的 PCA'],
    ['連続値のデータをグループに分けたい', '混合ガウスモデル'],
    ['アンケートなどカテゴリの回答を型に分けたい', '潜在クラス分析'],
    ['潜在変数どうしの関係を、仮説として確かめたい', '構造方程式モデリング（SEM）'],
    ['時間とともに変わる、隠れた状態を推定したい', 'HMM（離散）、状態空間モデル（連続）'],
    ['画像など高次元データの生成・異常検知をしたい', '変分オートエンコーダ（VAE）'],
  ];
  const leftW = 6.9;
  const rightX = MARGIN_X + leftW + 0.75;
  const rightW = SLIDE_W - MARGIN_X - rightX;
  addText(slide, '目的', MARGIN_X, 1.55, leftW, 0.32, { fontSize: 13, bold: true, color: C.muted });
  addText(slide, 'まず検討するモデル', rightX, 1.55, rightW, 0.32, { fontSize: 13, bold: true, color: C.muted });
  rows.forEach(([purpose, model], i) => {
    const y = 1.95 + i * 0.7;
    addCard(slide, MARGIN_X, y, leftW, 0.58, { fill: C.gray, radius: 0.06 });
    addText(slide, purpose, MARGIN_X + 0.25, y, leftW - 0.4, 0.58, { fontSize: 14, valign: 'middle' });
    addLine(slide, MARGIN_X + leftW + 0.08, y + 0.29, rightX - 0.08, y + 0.29, { color: C.indigo, width: 1.75, arrow: true });
    addCard(slide, rightX, y, rightW, 0.58, { fill: C.indigo, radius: 0.06 });
    addText(slide, model, rightX + 0.25, y, rightW - 0.4, 0.58, { fontSize: 14, bold: true, color: C.white, valign: 'middle' });
  });
}

// =====================================================================
// 24. 実務での注意点
// =====================================================================
{
  const rs = gmm.random_starts;
  const slide = newContentSlide('6  実務での使い方', '実務での注意点', [
    '潜在変数モデルを実務で使うときの注意点を6つにまとめました。',
    '1つ目は識別可能性です。因子の回転や成分の番号の入れ替えをしても尤度が変わらないので、番号や向きそのものに意味はありません。',
    `2つ目は局所解です。デモでも ${rs.n} 回中 ${rs.n_worse} 回、悪い解で止まりました。初期値を変えて何度も推定します。`,
    '3つ目は数の決め方で、情報量規準や固有値などで候補を絞り、解釈できるかで決めます。',
    '4つ目が特に重要で、潜在変数に付けた名前は分析者が付けたものにすぎず、その実在や因果関係を保証しません。',
    '5つ目は分布の仮定、6つ目はデータ量です。仮定が外れたりデータが少なかったりすると、推定が不安定になります。',
  ].join('\n'));
  const items = [
    ['識別可能性', '因子の回転や成分の番号の入れ替えで、同じ尤度になる。番号や向きそのものに意味はない'],
    ['局所解と初期値', `EM は初期値しだいで悪い解に止まる（デモでは ${rs.n} 回中 ${rs.n_worse} 回）。初期値を変えて何度も推定する`],
    ['数の決め方', '成分数・因子数は、BIC、交差検証、固有値などで候補を絞り、解釈できるかで決める'],
    ['名前の付けすぎ', '潜在変数の「名前」は分析者が付けたもの。実在や因果関係を保証しない'],
    ['分布の仮定', '正規分布などの仮定が外れると、余計な成分が出たり推定がゆがむ。残差や適合度を確認する'],
    ['データ量', '潜在変数やパラメータが多いほど、多くのデータが必要。少ないデータでは推定が不安定になる'],
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardH = 2.25;
  const rowY = [1.65, 4.1];
  items.forEach(([title, desc], i) => {
    const x = MARGIN_X + (i % 3) * (cardW + gapX);
    const y = rowY[Math.floor(i / 3)];
    const important = i === 3;
    addCard(slide, x, y, cardW, cardH, { fill: important ? C.amberTint : C.gray });
    addNode(slide, x + 0.42, y + 0.42, 0.44, important ? C.amber : C.indigo, '!', { fontSize: 16 });
    addText(slide, title, x + 0.78, y + 0.18, cardW - 0.95, 0.48, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 0.82, cardW - 0.55, 1.35, { fontSize: 13 });
  });
  addText(slide, [
    { text: '特に ④：', bold: true, color: C.amber },
    { text: '「劣化因子」「品質因子」などの名前が、実際の物理現象と対応するかは、技術的な確認が必要。' },
  ], MARGIN_X, 6.45, CONTENT_W, 0.4, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 25. ツール
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '主なツール（Python と R）', [
    '主なモデルごとに、Python と R の代表的なツールをまとめました。',
    'Python では scikit-learn に、混合ガウスモデル、因子分析、主成分分析、トピックモデルが入っており、多くの場合はこれで足ります。',
    'SEM は Python なら semopy、R なら lavaan が定番です。潜在クラス分析は Python の StepMix や R の poLCA があります。',
    'HMM は hmmlearn、状態空間モデルは statsmodels、VAE は PyTorch で実装するのが一般的です。',
    '会社の環境で使う場合は、scikit-learn 以外のライブラリを導入できるか、事前に確認してください。',
  ].join('\n'));
  const header = ['モデル', 'Python', 'R'];
  const rows = [
    ['混合ガウスモデル', 'scikit-learn：GaussianMixture', 'mclust'],
    ['因子分析', 'scikit-learn：FactorAnalysis、factor_analyzer', 'psych：fa()'],
    ['主成分分析', 'scikit-learn：PCA', 'stats：prcomp()'],
    ['構造方程式モデリング', 'semopy', 'lavaan'],
    ['潜在クラス分析', 'StepMix', 'poLCA'],
    ['隠れマルコフモデル', 'hmmlearn', 'depmixS4'],
    ['状態空間モデル', 'statsmodels（tsa.statespace）', 'KFAS'],
    ['トピックモデル', 'scikit-learn：LatentDirichletAllocation、gensim', 'topicmodels'],
    ['変分オートエンコーダ', 'PyTorch など', 'torch'],
  ];
  const cellMargin = [0.04, 0.12, 0.04, 0.12];
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.indigo } } })),
    ...rows.map((r) => r.map((cell, j) => ({
      text: cell,
      options: { bold: j === 0, color: j === 0 ? C.indigo : C.ink, fill: { color: j === 1 && cell.startsWith('scikit-learn') ? C.tint : C.white } },
    }))),
  ], {
    x: MARGIN_X, y: 1.55, w: CONTENT_W, colW: [3.0, 5.9, 3.2],
    fontFace: FONT, fontSize: 13.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.47,
  });
  addText(slide, '色付きのセルは scikit-learn に含まれる機能。会社の PC で scikit-learn 以外を導入できるかは要確認', MARGIN_X, 6.35, CONTENT_W, 0.4, { fontSize: 12, color: C.muted });
}

// =====================================================================
// 26. Python コード例
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', 'Python（scikit-learn）での最小コード例', [
    'scikit-learn を使った最小のコード例です。デモの計算も、照合用にこれと同じ関数を使っています。',
    '混合ガウスモデルでは、成分数を変えて複数のモデルを作り、BIC が最小のものを選びます。n_init で初期値を変えて複数回推定するのが、局所解への対策です。',
    'predict は最も確率の高い成分、predict_proba は各成分の確率、つまり責任度を返します。',
    '因子分析は、変数の単位をそろえるために標準化してから行います。rotation で回転の方法を指定でき、components_ の転置が因子負荷量です。',
  ].join('\n'));
  const code = [
    'from sklearn.mixture import GaussianMixture',
    'from sklearn.decomposition import FactorAnalysis',
    '',
    '# 混合ガウスモデル：成分数を BIC で選ぶ',
    'models = [GaussianMixture(n_components=k, covariance_type="full",',
    '                          n_init=5, random_state=0).fit(X)',
    '          for k in range(1, 8)]',
    'best = min(models, key=lambda m: m.bic(X))',
    'labels = best.predict(X)        # 最も確率の高い成分',
    'resp = best.predict_proba(X)    # 責任度（各成分の確率）',
    '',
    '# 因子分析：2因子、バリマックス回転（X_std は標準化済み）',
    'fa = FactorAnalysis(n_components=2, rotation="varimax").fit(X_std)',
    'loadings = fa.components_.T     # 因子負荷量（変数 × 因子）',
    'uniqueness = fa.noise_variance_ # 独自分散',
    'scores = fa.transform(X_std)    # 因子得点',
  ];
  const codeX = MARGIN_X;
  const codeY = 1.6;
  const codeW = 8.55;
  const codeH = 4.2;
  addCard(slide, codeX, codeY, codeW, codeH, { fill: '1E2233', radius: 0.08 });
  slide.addText(code.map((lineText, i) => ({
    text: lineText.length ? lineText : ' ',
    options: { breakLine: i < code.length - 1, color: lineText.trim().startsWith('#') ? 'A9B0DC' : 'E8EAF6' },
  })), {
    x: codeX + 0.3, y: codeY + 0.22, w: codeW - 0.5, h: codeH - 0.4,
    fontFace: CODE_FONT, fontSize: 11.5, color: 'E8EAF6', margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP', lineSpacingMultiple: 1.05,
  });
  const rx = codeX + codeW + 0.35;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'ポイント', rx, 1.6, rw, 0.4, { fontSize: 16, bold: true, color: C.indigo });
  addBullets(slide, [
    'n_init で初期値を変えて複数回推定し、局所解を避ける',
    'predict_proba で責任度（確率）を取り出せる',
    '因子分析は標準化してから行う',
    'components_.T が因子負荷量（変数 × 因子）',
  ], rx, 2.1, rw, 4.6, { fontSize: 13, space: 12 });
  addCard(slide, MARGIN_X, 6.05, codeW, 0.7, { fill: C.gray });
  addText(slide, 'X：データ（行＝サンプル、列＝変数）の NumPy 配列。会社の PC で scikit-learn を使えるかは要確認',
    MARGIN_X + 0.25, 6.05, codeW - 0.5, 0.7, { fontSize: 12, valign: 'middle' });
}

// =====================================================================
// 27. 製造現場での活用イメージ
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '製造現場での活用イメージ（想定例）', [
    '製造現場で使う場合の想定例を3つ示します。実データで検証したものではありません。',
    '1つ目は因子分析です。ショット内の多数の測定点のように、相関の強い多数の計測項目の背後にある少数の共通要因を取り出し、要因ごとに管理します。',
    '2つ目は混合ガウスモデルによる異常検知です。正常時のデータの分布を混合ガウスモデルで表し、その分布の下で尤度が低いウェーハやロットを異常の候補として拾います。',
    '3つ目は隠れマルコフモデルです。装置のログから、正常と劣化といった隠れた状態の移り変わりを推定し、保守の時期を判断する材料にします。',
    'いずれも、潜在変数に付けた名前が実際の物理現象と対応するかは、技術的な確認が欠かせません。',
  ].join('\n'));
  const cards = [
    ['因子分析', '多数の計測項目を少数の要因に', '相関の強い多数の測定値（例：ショット内の多数の測定点）の背後にある少数の共通要因を取り出し、要因ごとに監視・管理する'],
    ['混合ガウスモデル', '正常分布からの外れを検出', '正常時のデータの分布を混合ガウスモデルで表し、その下での尤度が低いウェーハ・ロットを異常の候補として拾う'],
    ['隠れマルコフモデル', '装置の隠れた状態を推定', '装置ログから「正常／劣化」などの隠れた状態の移り変わりを推定し、保守の時期を判断する材料にする'],
  ];
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const y = 1.65;
  const h = 3.55;
  cards.forEach(([title, sub, desc], i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, y, cardW, h, { fill: C.tint });
    addNode(slide, x + 0.5, y + 0.5, 0.56, C.indigo, String(i + 1), { fontSize: 17 });
    addText(slide, title, x + 0.95, y + 0.25, cardW - 1.1, 0.5, { fontSize: 17, bold: true, valign: 'middle' });
    addText(slide, sub, x + 0.3, y + 1.0, cardW - 0.6, 0.4, { fontSize: 13.5, bold: true, color: C.indigo });
    addText(slide, desc, x + 0.3, y + 1.5, cardW - 0.6, 2.1, { fontSize: 13.5 });
  });
  addCard(slide, MARGIN_X, 5.65, CONTENT_W, 1.1, { fill: C.amberTint });
  addText(slide, [
    { text: '注意', bold: true, color: C.amber, breakLine: true },
    { text: 'このスライドは適用の想定例で、実データでの検証は行っていない。潜在変数に付けた名前（例：「劣化」）が実際の物理現象と対応するかは、技術的な確認が必要。' },
  ], MARGIN_X + 0.3, 5.65, CONTENT_W - 0.6, 1.1, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 28. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.6, 6, 0.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle' });
  const points = [
    '潜在変数モデルは、観測できない z を仮定して、観測データ x のばらつきや構造を説明する',
    '基本形は p(x) = ∫ p(x|z) p(z) dz。z と x が連続か離散かで、因子分析・混合モデルなどに分かれる',
    '推定の中心は EM アルゴリズム。E ステップで z を推定し、M ステップでパラメータを更新する',
    '事後分布が計算できない複雑なモデルは、変分推論・MCMC・VAE の償却推論で扱う',
    '局所解・識別可能性・数の選択に注意し、潜在変数の名前を過信しない',
  ];
  points.forEach((p, i) => {
    const y = 1.7 + i * 1.0;
    addNode(slide, 1.15, y + 0.35, 0.56, C.peri, String(i + 1), { fontSize: 18, color: C.night });
    addText(slide, p, 1.7, y, 7.6, 0.75, { fontSize: 16.5, color: C.white, valign: 'middle' });
  });
  const z = [11.0, 2.6];
  const xs = [[9.9, 4.6], [11.0, 4.6], [12.1, 4.6]];
  xs.forEach((p) => arrowBetween(slide, z, p, 0.5, 0.3, { color: '6D74B8', width: 1.75 }));
  latentNode(slide, z[0], z[1], 1.0, 'z', { fontSize: 26, color: C.peri, fill: C.night });
  xs.forEach((p, i) => observedNode(slide, p[0], p[1], 0.6, `x_{${i + 1}}`, { fontSize: 14, fill: C.peri, color: C.night }));
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '潜在変数モデルは、観測できない変数を仮定して、観測データのばらつきや構造を説明するモデルの総称です。',
    '基本形は、z を通して x の分布を表す式で、z と x が連続か離散かによって、因子分析や混合モデルなどに分かれます。',
    '推定の中心は EM アルゴリズムで、事後分布が計算できない複雑なモデルでは、変分推論、MCMC、VAE の償却推論を使います。',
    '実務では、局所解、識別可能性、成分数や因子数の選択に注意し、潜在変数に付けた名前を過信しないことが大切です。',
  ].join('\n'));
}

// =====================================================================
// 29. 参考文献
// =====================================================================
{
  const slide = newContentSlide('REFERENCES', '参考文献', [
    '本資料で参照した主な文献です。',
    '全体を通した教科書としては、機械学習の立場から Bishop の Pattern Recognition and Machine Learning の第9章と第12章、統計の立場から Bartholomew らの教科書が読みやすいです。',
    'EM アルゴリズムは Dempster ら、ELBO の見方は Neal と Hinton、変分推論の全体像は Blei らのレビューが基本文献です。',
  ].join('\n'));
  const refs = [
    'Spearman, C. (1904). "General intelligence," objectively determined and measured. American Journal of Psychology, 15(2), 201–292.',
    'Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. Psychometrika, 23(3), 187–200.',
    'Kalman, R. E. (1960). A new approach to linear filtering and prediction problems. Journal of Basic Engineering, 82(1), 35–45.',
    'Dempster, A. P., Laird, N. M., & Rubin, D. B. (1977). Maximum likelihood from incomplete data via the EM algorithm. JRSS Series B, 39(1), 1–38.',
    'Schwarz, G. (1978). Estimating the dimension of a model. The Annals of Statistics, 6(2), 461–464.',
    'Bollen, K. A. (1989). Structural Equations with Latent Variables. Wiley.',
    'Rabiner, L. R. (1989). A tutorial on hidden Markov models and selected applications in speech recognition. Proceedings of the IEEE, 77(2), 257–286.',
    'Neal, R. M., & Hinton, G. E. (1998). A view of the EM algorithm that justifies incremental, sparse, and other variants. In Learning in Graphical Models (pp. 355–368). Springer.',
    'Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1–55.',
    'Tipping, M. E., & Bishop, C. M. (1999). Probabilistic principal component analysis. JRSS Series B, 61(3), 611–622.',
    'Blei, D. M., Ng, A. Y., & Jordan, M. I. (2003). Latent Dirichlet allocation. Journal of Machine Learning Research, 3, 993–1022.',
    'Bishop, C. M. (2006). Pattern Recognition and Machine Learning. Springer.（第9章・第12章）',
    'Bartholomew, D. J., Knott, M., & Moustaki, I. (2011). Latent Variable Models and Factor Analysis: A Unified Approach (3rd ed.). Wiley.',
    'Kingma, D. P., & Welling, M. (2014). Auto-encoding variational Bayes. International Conference on Learning Representations (ICLR).',
    'Blei, D. M., Kucukelbir, A., & McAuliffe, J. D. (2017). Variational inference: A review for statisticians. JASA, 112(518), 859–877.',
  ];
  addBullets(slide, refs, MARGIN_X, 1.5, CONTENT_W, 5.4, { fontSize: 12, space: 4, indent: 14, color: C.ink });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
