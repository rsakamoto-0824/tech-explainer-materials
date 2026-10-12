// 因果フォレスト解説資料（PowerPoint）を pptxgenjs で生成する。
// 使い方: node build_deck.js <出力パス>
// 前提: demo_results.json（demo_causal_forest.py の出力）と formulas/（render_formulas.py の出力）が同じフォルダにある。

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
  forestDark: '17352A',
  forest: '2E6B4A',
  moss: '8DB87A',
  mossLight: 'CFE3C6',
  tint: 'EEF5EF',
  treat: 'D9642B',
  treatTint: 'FBE7DC',
  control: '3F6A8F',
  controlTint: 'E0EAF3',
  ink: '1F2A24',
  muted: '5E6B63',
  line: 'B9C6BD',
  grid: 'E3E8E4',
  gray: 'F2F4F3',
  white: 'FFFFFF',
  onDarkSub: 'D5E6DA',
};

const fmt2 = (v) => v.toFixed(2);
const pct1 = (v) => (v * 100).toFixed(1);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '因果フォレスト入門';
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

// 丸い節点と枝で描く木（表紙・まとめの装飾）
function addTreeMotif(slide, cx, top, scale, { lineColor, nodeColor, leafColors }) {
  const levelGap = 0.95 * scale;
  const root = [cx, top];
  const mids = [[cx - 0.9 * scale, top + levelGap], [cx + 0.9 * scale, top + levelGap]];
  const leaves = [
    [cx - 1.35 * scale, top + levelGap * 2], [cx - 0.45 * scale, top + levelGap * 2],
    [cx + 0.45 * scale, top + levelGap * 2], [cx + 1.35 * scale, top + levelGap * 2],
  ];
  const lineWidth = 1.75 * scale;
  mids.forEach((m) => addLine(slide, root[0], root[1], m[0], m[1], { color: lineColor, width: lineWidth }));
  leaves.forEach((leaf, i) => {
    const parent = mids[i < 2 ? 0 : 1];
    addLine(slide, parent[0], parent[1], leaf[0], leaf[1], { color: lineColor, width: lineWidth });
  });
  addNode(slide, root[0], root[1], 0.36 * scale, nodeColor);
  mids.forEach((m) => addNode(slide, m[0], m[1], 0.3 * scale, nodeColor));
  leaves.forEach((leaf, i) => addNode(slide, leaf[0], leaf[1], 0.34 * scale, leafColors[i % leafColors.length]));
}

// ---- スライド共通 ----

function newContentSlide(kicker, title, notes) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  addText(slide, kicker, MARGIN_X, 0.36, 9, 0.3, { fontSize: 12, bold: true, color: C.forest, charSpacing: 1 });
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

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.forestDark };
  addText(slide, '機械学習 × 因果推論', 0.8, 1.35, 7, 0.4, { fontSize: 15, bold: true, color: C.moss, charSpacing: 2 });
  addText(slide, '因果フォレスト入門', 0.8, 1.8, 7.8, 1.0, { fontSize: 48, bold: true, color: C.white, valign: 'middle' });
  addText(slide, [
    { text: '「平均でどれだけ効くか」から', breakLine: true },
    { text: '「誰に・どんな条件で効くか」へ' },
  ], 0.8, 3.0, 7.6, 1.1, { fontSize: 22, color: C.onDarkSub, lineSpacingMultiple: 1.15 });
  addText(slide, 'Causal Forest の考え方・仕組み・使い方を、合成データのデモとともに解説', 0.8, 4.45, 7.4, 0.7, {
    fontSize: 14, color: C.moss,
  });
  addText(slide, '2026年9月22日', 0.8, 6.45, 4, 0.35, { fontSize: 13, color: C.onDarkSub });

  addTreeMotif(slide, 10.55, 1.55, 1.05, { lineColor: '4F7D63', nodeColor: C.moss, leafColors: [C.treat, C.mossLight, C.control, C.treat] });
  addTreeMotif(slide, 9.0, 3.95, 0.72, { lineColor: '3E6A52', nodeColor: '6E9E66', leafColors: [C.mossLight, C.treat, C.mossLight, C.control] });
  addTreeMotif(slide, 11.75, 4.35, 0.62, { lineColor: '3E6A52', nodeColor: '6E9E66', leafColors: [C.control, C.mossLight, C.treat, C.mossLight] });
  slide.addNotes([
    'この資料では、因果フォレスト（Causal Forest）を基礎から解説します。',
    '因果フォレストは、ある施策（処置）の効果が「対象の条件によってどう違うか」を推定する機械学習の手法です。',
    'スタンフォード大学の Wager と Athey が2018年に理論をまとめ、2019年に一般化ランダムフォレストとして拡張されました。',
    '後半では、真の効果が分かっている合成データで実際に動かし、どこまで正しく推定できるかを確かめます。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で分かること
// =====================================================================
{
  const slide = newContentSlide('INTRODUCTION', 'この資料で分かること', [
    '全体は6つのパートに分かれています。',
    '前半で「なぜ効果の違いを知りたいのか」と因果推論の基本を押さえ、中盤で決定木から因果フォレストへ段階的に仕組みを説明します。',
    '後半は、観察データで使うときの工夫、合成データでのデモ、実務での注意点です。',
    '数式は最小限にし、式が出てくるところでは言葉で意味を補足します。',
  ].join('\n'));
  const items = [
    ['なぜ効果の「違い」を知りたいのか', '平均効果だけでは判断を誤る場面'],
    ['因果推論の基本', '潜在的結果と、推定に必要な3つの前提'],
    ['決定木から因果フォレストへ', '分割の基準、正直な推定、フォレスト化'],
    ['観察データへの対応', '交絡を取り除く「直交化」と、結果の検証'],
    ['デモ：合成データで確かめる', '真の効果が分かるデータで精度を確認'],
    ['実務での使い方と注意点', '他手法との比較、ツール、落とし穴'],
  ];
  const colX = [MARGIN_X, 6.95];
  const rowY = [1.75, 3.15, 4.55];
  items.forEach(([title, desc], i) => {
    const x = colX[Math.floor(i / 3)];
    const y = rowY[i % 3];
    addNode(slide, x + 0.33, y + 0.42, 0.66, C.forest, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.9, y + 0.05, 4.9, 0.45, { fontSize: 19, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.9, y + 0.55, 4.9, 0.4, { fontSize: 14, color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.tint });
  addText(slide, '想定する読者：回帰分析やランダムフォレストを聞いたことがある人。数式は最小限にし、式の意味を言葉で補います。',
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14, valign: 'middle', color: C.ink });
}

// =====================================================================
// 3. 平均効果だけでは見えないもの
// =====================================================================
{
  const quartiles = demo.true_quartile_means;
  const overall = quartiles.reduce((a, b) => a + b, 0) / quartiles.length;
  const slide = newContentSlide('1  なぜ必要か', '平均効果だけでは見えないもの', [
    `右のグラフは、後半のデモで使う合成データ（評価用1,000件）の真の効果です。`,
    `全体の平均効果は約${fmt2(overall)}とプラスですが、効果の小さい順に4等分すると、群1の平均は${fmt2(quartiles[0])}とマイナスです。`,
    `個別に見ると、約${pct1(demo.share_negative_true)}%の対象で効果がマイナス、つまり逆効果になっています。`,
    '平均だけを見て「全員に適用」と決めると、この人たちには損をさせてしまいます。',
    '因果フォレストは、このような条件ごとの効果の違いを、データから推定するための方法です。',
  ].join('\n'));
  addText(slide, `平均 +${fmt2(overall)} でも、約${Math.round(demo.share_negative_true * 100)}%の対象では逆効果`,
    MARGIN_X, 1.65, 5.9, 0.9, { fontSize: 20, bold: true, color: C.forest });
  addBullets(slide, [
    '施策（処置）の効果は、対象の条件によって違うことが多い',
    '平均効果（ATE）だけを見ると「全員に適用」が最善に見える',
    '条件ごとの効果（CATE）が分かれば、「効く対象にだけ適用する」「逆効果の原因を調べる」といった判断ができる',
    '因果フォレストは、この条件ごとの効果を機械学習で推定する方法',
  ], MARGIN_X, 2.75, 5.9, 3.6, { fontSize: 15, space: 12 });

  slide.addChart(pres.charts.BAR, [{
    name: '真の効果', labels: ['全体の平均', '群1', '群2', '群3', '群4'],
    values: [overall, ...quartiles],
  }], {
    x: 6.75, y: 1.6, w: 5.95, h: 4.75, barDir: 'col',
    ...chartBase(),
    chartColors: [C.forest],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 12, dataLabelColor: C.ink,
    showTitle: true, title: '真の処置効果の平均（合成データ）',
    valAxisMinVal: -1, valAxisMaxVal: 3, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0.0',
    catAxisLabelFontSize: 12, barGapWidthPct: 60, showLegend: false,
  });
  addText(slide, '群1〜4：真の効果が小さい順に対象を4等分（各250件）。デモと同じ合成データ。', 6.75, 6.4, 5.95, 0.4, {
    fontSize: 11, color: C.muted,
  });
}

// =====================================================================
// 4. 基本の用語と記号
// =====================================================================
{
  const slide = newContentSlide('2  因果推論の基本', '基本の用語と記号', [
    'この資料で使う記号をまとめます。右端の列は、製造工程に当てはめた場合の例です。',
    '処置 W は「施策を受けたかどうか」を 1 と 0 で表します。結果 Y は処置の後に測る値、共変量 X は処置の前から決まっている対象の属性です。',
    'ATE は全体の平均効果、CATE は「条件 X = x の対象に限った平均効果」です。因果フォレストが推定したいのはこの CATE、τ(x) です。',
    '傾向スコア e(x) は、条件 x の対象が処置を受ける確率で、観察データで交絡を調整するときに使います。',
  ].join('\n'));
  const header = ['記号', '名前', '意味', '例：製造工程の場合'];
  const rows = [
    ['W', '処置（トリートメント）', '施策を受けたら 1、受けなければ 0', '新しい補正レシピを適用したロット＝1'],
    ['Y', '結果（アウトカム）', '処置の後に測る値', '歩留まり（%）'],
    ['X', '共変量（特徴量）', '処置の前から決まっている対象の属性', '装置、製品、層、前工程の測定値'],
    ['ATE', '平均処置効果', '全体で平均した効果', '全ロット平均での歩留まり改善量'],
    ['CATE  τ(x)', '条件付き平均処置効果', '条件 X = x の対象での平均的な効果', '装置A・配線層のロットでの改善量'],
    ['e(x)', '傾向スコア', '条件 X = x の対象が処置を受ける確率', 'その条件のロットにレシピが適用される確率'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  const tableRows = [
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.forest } } })),
    ...rows.map((r, i) => r.map((cell, j) => ({
      text: cell,
      options: {
        bold: j <= 1, color: j === 0 ? C.forest : C.ink,
        fill: { color: i === 4 ? C.tint : C.white },
      },
    }))),
  ];
  slide.addTable(tableRows, {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [1.45, 2.55, 4.1, 4.0],
    fontFace: FONT, fontSize: 13.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.5,
  });
  const fy = 5.35;
  addCard(slide, MARGIN_X, fy, CONTENT_W, 1.35, { fill: C.gray });
  addText(slide, 'ATE', MARGIN_X + 0.3, fy + 0.2, 1.0, 0.4, { fontSize: 15, bold: true, color: C.forest, valign: 'middle' });
  addFormula(slide, 'ate', MARGIN_X + 1.2, fy + 0.21, { alt: 'ATE: tau = E[Y(1) - Y(0)]' });
  addText(slide, 'CATE', 6.9, fy + 0.2, 1.1, 0.4, { fontSize: 15, bold: true, color: C.forest, valign: 'middle' });
  addFormula(slide, 'cate', 8.0, fy + 0.21, { alt: 'CATE: tau(x) = E[Y(1) - Y(0) | X = x]' });
  addText(slide, 'Y(1)、Y(0) は「処置した場合／しなかった場合の結果」（次のスライド）', MARGIN_X + 0.3, fy + 0.82, 11, 0.35, {
    fontSize: 12.5, color: C.muted,
  });
}

// =====================================================================
// 5. 因果推論の根本問題
// =====================================================================
{
  const slide = newContentSlide('2  因果推論の基本', '因果推論の根本問題：片方の結果しか見えない', [
    '同じロットについて、「レシピを適用した場合の歩留まり Y(1)」と「適用しなかった場合の歩留まり Y(0)」の両方を考えます。これを潜在的結果と呼びます。',
    'しかし実際に観測できるのは、どちらか一方だけです。表の「？」は、原理的に観測できない値です。',
    'そのため、個々のロットの効果 Y(1) − Y(0) には正解データがありません。ここが普通の予測問題と大きく違う点です。',
    'そこで、条件 X が似ている対象を集め、処置ありの平均と処置なしの平均を比べる、という発想を取ります。因果フォレストは、この「似ている対象の集め方」をデータから学ぶ方法だと言えます。',
  ].join('\n'));
  const header = ['ロット', '処置 W', 'Y(1)\n適用した場合', 'Y(0)\n適用しない場合', '個別の効果'];
  const lots = [['L01', 1, '92'], ['L02', 0, '88'], ['L03', 1, '95'], ['L04', 0, '90'], ['L05', 1, '89']];
  const cellMargin = [0.04, 0.1, 0.04, 0.1];
  const tableRows = [
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.forest }, align: 'center' } })),
    ...lots.map(([lot, w, value]) => {
      const observed = { text: value, options: { bold: true, fill: { color: w === 1 ? C.treatTint : C.controlTint }, color: w === 1 ? C.treat : C.control } };
      const missing = { text: '？', options: { color: '9AA59E', fill: { color: C.gray } } };
      return [
        { text: lot, options: { bold: true } },
        { text: String(w), options: {} },
        w === 1 ? observed : missing,
        w === 0 ? observed : missing,
        { text: '？', options: { color: '9AA59E', fill: { color: C.gray } } },
      ];
    }),
  ];
  slide.addTable(tableRows, {
    x: MARGIN_X, y: 1.75, w: 6.7, colW: [0.95, 1.05, 1.6, 1.75, 1.35],
    fontFace: FONT, fontSize: 14, align: 'center', valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.white, pt: 1.5 }, rowH: 0.62,
  });
  addText(slide, '例：歩留まり（%）。数値は説明用の架空の値', MARGIN_X, 5.6, 6.7, 0.35, { fontSize: 11.5, color: C.muted });
  addNode(slide, MARGIN_X + 0.15, 6.2, 0.24, C.treat);
  addText(slide, '処置群で観測', MARGIN_X + 0.38, 6.05, 2, 0.3, { fontSize: 12, color: C.ink, valign: 'middle' });
  addNode(slide, MARGIN_X + 2.2, 6.2, 0.24, C.control);
  addText(slide, '対照群で観測', MARGIN_X + 2.43, 6.05, 2, 0.3, { fontSize: 12, color: C.ink, valign: 'middle' });

  const rx = 7.75;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, [{ text: '同じ対象の「処置した結果」と', breakLine: true }, { text: '「しなかった結果」は同時に見られない' }], rx, 1.7, rw, 1.0, {
    fontSize: 18, bold: true, color: C.forest,
  });
  addBullets(slide, [
    'Y(1)、Y(0) を潜在的結果と呼ぶ（Rubin, 1974）',
    '観測できるのは一方だけ → 個別の効果には正解データがない',
    '条件 X が似た対象を集め、処置ありと処置なしの平均を比べる',
  ], rx, 2.85, rw, 2.3, { fontSize: 15, space: 10 });
  addCard(slide, rx, 5.2, rw, 1.45, { fill: C.tint });
  addText(slide, [
    { text: '因果フォレストの発想', bold: true, color: C.forest, breakLine: true },
    { text: '「似ている対象」をどう集めるかを、データから学ぶ' },
  ], rx + 0.25, 5.2, rw - 0.5, 1.45, { fontSize: 15, valign: 'middle', paraSpaceAfter: 4 });
}

// =====================================================================
// 6. 推定に必要な3つの前提
// =====================================================================
{
  const slide = newContentSlide('2  因果推論の基本', '効果を推定するための3つの前提', [
    '観測できない反事実を推定するには、いくつかの前提が必要です。',
    '1つ目は無交絡です。処置の決まり方と結果の両方に影響する要因が、すべて X に含まれている、という前提です。これが崩れると、効果が過大や過小に見えます。重要なのは、この前提はデータだけでは検証できないことです。',
    '2つ目は重なりです。どの条件にも、処置を受けた対象と受けなかった対象の両方がいる必要があります。',
    '3つ目は SUTVA で、ある対象の処置が他の対象の結果に影響しないこと、処置の中身が1種類であることです。',
    'ランダム化実験なら1と2は設計で満たせますが、観察データではドメイン知識で吟味する必要があります。',
  ].join('\n'));
  const cardW = 3.85;
  const gap = (CONTENT_W - cardW * 3) / 2;
  const cardY = 1.65;
  const cardH = 4.35;
  const cards = [
    {
      name: '無交絡（条件付き独立）', formula: 'unconf', alt: '{Y(1), Y(0)} independent of W given X',
      body: '処置の決まり方と結果の両方に影響する要因が、すべて X に入っている',
      risk: '崩れると：効果が過大・過小に見える。データからは検証できない',
    },
    {
      name: '重なり（オーバーラップ）', formula: 'overlap', alt: '0 < e(x) = P(W=1 | X=x) < 1',
      body: 'どの条件にも、処置ありと処置なしの対象が両方いる',
      risk: '崩れると：比べる相手がいない領域では外挿になり、推定が不安定',
    },
    {
      name: 'SUTVA（相互干渉なし）', formula: null,
      body: 'ある対象の処置が、他の対象の結果に影響しない。処置の中身は1種類',
      risk: '崩れると：例）同じ装置を共有するロット間で影響が波及する',
    },
  ];
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (cardW + gap);
    addCard(slide, x, cardY, cardW, cardH, { fill: C.tint });
    addNode(slide, x + 0.55, cardY + 0.55, 0.62, C.forest, String(i + 1), { fontSize: 20 });
    addText(slide, c.name, x + 1.0, cardY + 0.3, cardW - 1.15, 0.5, { fontSize: 15.5, bold: true, valign: 'middle' });
    const formulaY = cardY + 1.15;
    if (c.formula) {
      const size = formulaSize(c.formula);
      addFormula(slide, c.formula, x + (cardW - size.w) / 2, formulaY + (0.5 - size.h) / 2, { alt: c.alt });
    } else {
      addText(slide, '結果は自分の処置だけで決まる', x + 0.3, formulaY, cardW - 0.6, 0.5, {
        fontSize: 14, align: 'center', valign: 'middle', color: C.ink,
      });
    }
    addText(slide, c.body, x + 0.3, cardY + 1.85, cardW - 0.6, 1.2, { fontSize: 15 });
    addRect(slide, x + 0.3, cardY + 3.1, cardW - 0.6, 0.012, C.line);
    addText(slide, c.risk, x + 0.3, cardY + 3.25, cardW - 0.6, 0.95, { fontSize: 13, color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.6, { fill: C.gray });
  addText(slide, 'ランダム化実験（A/Bテスト）なら ① と ② は設計で満たせる。観察データでは、① をドメイン知識で吟味する必要がある。',
    MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.6, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 7. 決定木のおさらい
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', 'おさらい①：決定木（予測のための木）', [
    '因果フォレストの土台になる決定木を振り返ります。',
    '決定木は、条件で次々にデータを2つに分け、最後にたどり着いた葉の平均値を予測値にします。',
    '分け方は、葉の中の Y のばらつき、つまり予測誤差が最も小さくなるように選びます。',
    '1本の木は分かりやすい反面、データが少し変わるだけで形が大きく変わるという弱点があります。この弱点を補うのが次のランダムフォレストです。',
    '図の数値は説明用の架空の値です。',
  ].join('\n'));
  const box = (x, y, w, h, label, { fill = C.white, line = C.forest, color = C.ink, bold = true, fontSize = 14 } = {}) => {
    addCard(slide, x, y, w, h, { fill, line, radius: 0.08 });
    addText(slide, label, x + 0.1, y, w - 0.2, h, { fontSize, bold, color, align: 'center', valign: 'middle' });
  };
  const root = { x: 2.1, y: 1.75, w: 3.0, h: 0.75 };
  const left = { x: 0.8, y: 3.35, w: 2.7, h: 0.75 };
  const right = { x: 4.1, y: 3.3, w: 2.5, h: 0.95 };
  const leaf1 = { x: 0.6, y: 5.0, w: 1.75, h: 0.95 };
  const leaf2 = { x: 2.65, y: 5.0, w: 1.75, h: 0.95 };
  const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  const edge = (from, to, label, labelDx) => {
    const [fx] = center(from);
    const [tx] = center(to);
    addLine(slide, fx, from.y + from.h, tx, to.y, { color: C.line, width: 1.75 });
    addText(slide, label, (fx + tx) / 2 + labelDx, (from.y + from.h + to.y) / 2 - 0.17, 0.8, 0.34, {
      fontSize: 12, color: C.muted, align: labelDx < 0 ? 'right' : 'left',
    });
  };
  edge(root, left, 'はい', -0.95);
  edge(root, right, 'いいえ', 0.15);
  edge(left, leaf1, 'はい', -0.95);
  edge(left, leaf2, 'いいえ', 0.15);
  box(root.x, root.y, root.w, root.h, '前工程の測定値 ≤ 3.2 ?');
  box(left.x, left.y, left.w, left.h, '装置 = A ?');
  box(right.x, right.y, right.w, right.h, '葉③  予測 Y = 86.4', { fill: C.tint, line: C.tint, color: C.forest });
  box(leaf1.x, leaf1.y, leaf1.w, leaf1.h, '葉①  92.1', { fill: C.tint, line: C.tint, color: C.forest });
  box(leaf2.x, leaf2.y, leaf2.w, leaf2.h, '葉②  89.5', { fill: C.tint, line: C.tint, color: C.forest });
  addText(slide, '葉の値＝葉に入ったデータの Y の平均（数値は架空）', 0.6, 6.15, 6.2, 0.35, { fontSize: 11.5, color: C.muted });

  const rx = 7.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    [{ text: '条件で次々にデータを2つに分ける', bold: true }],
    [{ text: '分け方の基準：', bold: true }, '葉の中の Y のばらつき（予測誤差）が最も小さくなる分割を選ぶ'],
    [{ text: '予測値：', bold: true }, '新しいデータがたどり着いた葉の Y の平均'],
    [{ text: '弱点：', bold: true }, '1本の木は、データが少し変わるだけで形が大きく変わる（不安定）'],
  ], rx, 1.8, rw, 3.3, { fontSize: 15.5, space: 16 });
  addCard(slide, rx, 5.15, rw, 1.3, { fill: C.tint });
  addText(slide, [
    { text: '因果木では', bold: true, color: C.forest, breakLine: true },
    { text: 'この「分け方の基準」と「葉の値」を、効果を推定する形に置き換える（次の2枚）' },
  ], rx + 0.25, 5.15, rw - 0.5, 1.3, { fontSize: 14, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 8. ランダムフォレスト
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', 'おさらい②：ランダムフォレスト', [
    'ランダムフォレストは、データの一部をランダムに取り出して木を作る、という作業を何百回も繰り返し、全部の木の予測を平均する方法です。',
    'さらに、分割に使う特徴量の候補もランダムに絞ることで、木どうしが似すぎないようにします。',
    '多数の木を平均することで、1本の木の不安定さが打ち消されます。',
    '因果フォレストは、この仕組みはそのままに、木が当てる対象を「結果 Y」から「処置効果 τ(x)」に置き換えたものです。',
  ].join('\n'));
  // 左：図
  addCard(slide, 0.6, 3.05, 1.7, 1.5, { fill: C.forest, radius: 0.12 });
  addText(slide, [{ text: '学習', breakLine: true }, { text: 'データ' }], 0.6, 3.05, 1.7, 1.5, {
    fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle',
  });
  const sampleY = [1.75, 3.35, 4.95];
  const sampleLabels = ['サンプル 1', 'サンプル 2', 'サンプル B'];
  sampleY.forEach((y, i) => {
    addLine(slide, 2.3, 3.8, 2.95, y + 0.45, { color: C.line, width: 1.5, arrow: true });
    addCard(slide, 3.0, y, 1.6, 0.9, { fill: C.tint });
    addText(slide, sampleLabels[i], 3.0, y, 1.6, 0.9, { fontSize: 13.5, bold: true, align: 'center', valign: 'middle', color: C.forest });
    addLine(slide, 4.65, y + 0.45, 5.2, y + 0.45, { color: C.line, width: 1.5, arrow: true });
    // 小さな木
    const tx = 5.95;
    const ty = y + 0.1;
    addLine(slide, tx, ty + 0.12, tx - 0.4, ty + 0.62, { color: C.forest, width: 1.25 });
    addLine(slide, tx, ty + 0.12, tx + 0.4, ty + 0.62, { color: C.forest, width: 1.25 });
    addNode(slide, tx, ty + 0.12, 0.24, C.forest);
    addNode(slide, tx - 0.4, ty + 0.62, 0.24, C.moss);
    addNode(slide, tx + 0.4, ty + 0.62, 0.24, C.moss);
    addLine(slide, 6.6, y + 0.45, 7.25, 3.8, { color: C.line, width: 1.5, arrow: true });
  });
  addText(slide, '⋮', 3.0, 4.3, 1.6, 0.6, { fontSize: 18, color: C.muted, align: 'center', valign: 'middle' });
  addNode(slide, 7.75, 3.8, 1.0, C.treat, '平均', { fontSize: 16 });
  addText(slide, 'B 本の木（数百〜数千本）', 3.0, 6.0, 4.0, 0.35, { fontSize: 12, color: C.muted });

  const rx = 8.75;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    'データの一部をランダムに取り出して木を作る、を何百回も繰り返す',
    '分割に使う特徴量の候補もランダムに絞り、木どうしを似せない',
    '多数の木の予測を平均し、1本の木の不安定さを抑える',
    [{ text: '因果フォレスト＝', bold: true, color: C.forest }, { text: 'この仕組みで「効果」を推定する', bold: true, color: C.forest }],
  ], rx, 1.75, rw, 4.9, { fontSize: 15, space: 14 });
  addSource(slide, '出典：Breiman (2001)');
}

// =====================================================================
// 9. 予測の木と因果木の違い
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', '予測の木と因果木の違い', [
    '予測のための木と因果木を比べます。',
    '最も大きな違いは分割の基準です。予測の木は子ノードの中で Y が揃うように分けますが、因果木は子ノードの間で効果の差が大きくなるように分けます。',
    '葉の推定値も、Y の平均ではなく「処置群の平均 − 対照群の平均」になります。',
    '下の式は、一般化ランダムフォレストで使われる分割の基準です。左右の効果の差の2乗に、左右のデータ数の積を掛けています。差が大きく、しかも片方に偏らない分割ほど高く評価されます。',
    '実際の実装では、この基準を毎回正確に計算すると重いので、勾配を使った近似で高速化しています。',
  ].join('\n'));
  const rows = [
    ['目的', '結果 Y を当てる', '処置効果 τ(x) を当てる'],
    ['分割の基準', '子ノード内の Y のばらつきを小さくする', '子ノード間で効果の差を大きくする'],
    ['葉の推定値', '葉に入ったデータの Y の平均', '処置群の Y の平均 − 対照群の Y の平均'],
    ['正解データ', 'Y が観測されている', 'τ は観測されない（正解なしで学ぶ）'],
    ['葉に必要なもの', '最低限のデータ数', '処置群と対照群の両方のデータ'],
  ];
  const cellMargin = [0.05, 0.14, 0.05, 0.14];
  const tableRows = [
    [
      { text: '', options: { fill: { color: C.white } } },
      { text: '予測のための木（回帰木）', options: { bold: true, color: C.ink, fill: { color: C.gray } } },
      { text: '因果木', options: { bold: true, color: C.white, fill: { color: C.forest } } },
    ],
    ...rows.map(([k, a, b]) => [
      { text: k, options: { bold: true, color: C.forest } },
      { text: a, options: { color: C.ink } },
      { text: b, options: { color: C.ink, bold: k === '分割の基準', fill: { color: C.tint } } },
    ]),
  ];
  slide.addTable(tableRows, {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [2.1, 5.0, 5.0],
    fontFace: FONT, fontSize: 14.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.56,
  });
  const fy = 5.2;
  addCard(slide, MARGIN_X, fy, CONTENT_W, 1.55, { fill: C.gray });
  const split = formulaSize('split');
  addFormula(slide, 'split', MARGIN_X + 0.35, fy + (1.55 - split.h) / 2, { alt: 'Delta(C_L, C_R) = n_L n_R / n_P^2 * (tau_L - tau_R)^2' });
  addText(slide, [
    { text: '因果木の分割基準（一般化ランダムフォレスト）', bold: true, color: C.forest, breakLine: true },
    { text: '左右の子ノードで効果の差が大きく、しかも両側のデータ数が偏らない分割ほど高く評価する。n は各ノードのデータ数。' },
  ], MARGIN_X + 0.35 + split.w + 0.45, fy + 0.2, CONTENT_W - split.w - 1.15, 1.15, { fontSize: 14, valign: 'middle', paraSpaceAfter: 4 });
  addSource(slide, '出典：Athey & Imbens (2016)、Athey, Tibshirani & Wager (2019)');
}

// =====================================================================
// 10. 葉の中で効果を推定する
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', '葉の中で効果を推定する', [
    '因果木の葉の中では、何をしているかを図にしました。',
    '葉に入った対象は、分割の条件によって X が似ています。無交絡の前提の下では、葉の中の処置群と対照群は「小さな実験」の2つの群とみなせます。',
    'そこで、処置群の Y の平均から対照群の Y の平均を引いたものを、その葉の効果とします。',
    'この計算には葉の中に両方の群が必要なので、実装では葉ごとに最小のデータ数を設けます。',
    '新しい対象の効果は、その対象がたどり着く葉の値で推定します。',
  ].join('\n'));
  const boxX = 0.6;
  const boxY = 1.6;
  const boxW = 6.4;
  const boxH = 4.95;
  addCard(slide, boxX, boxY, boxW, boxH, { fill: C.gray });
  addText(slide, 'ある葉（条件 X が似た対象の集まり）', boxX + 0.3, boxY + 0.2, boxW - 0.6, 0.35, { fontSize: 13.5, bold: true, color: C.muted });
  // 縦軸
  const axisX = boxX + 0.8;
  const axisTop = boxY + 0.8;
  const axisBottom = boxY + boxH - 0.75;
  addLine(slide, axisX, axisBottom, axisX, axisTop, { color: C.muted, width: 1.25, arrow: true });
  addText(slide, '結果 Y', axisX - 0.62, axisTop - 0.05, 0.55, 0.35, { fontSize: 12, color: C.muted, align: 'right' });
  // 決まった乱数で点を配置する
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const controlX = boxX + 2.1;
  const treatX = boxX + 4.2;
  const controlMean = boxY + 3.35;
  const treatMean = boxY + 2.15;
  const dot = 0.17;
  for (let i = 0; i < 9; i += 1) {
    const cy = controlMean + (rand() - 0.5) * 1.5;
    const cx = controlX + (rand() - 0.5) * 0.9;
    addNode(slide, cx, cy, dot, C.control);
    const ty = treatMean + (rand() - 0.5) * 1.5;
    const tx = treatX + (rand() - 0.5) * 0.9;
    addNode(slide, tx, ty, dot, C.treat);
  }
  addLine(slide, controlX - 0.65, controlMean, controlX + 0.65, controlMean, { color: C.control, width: 2.5 });
  addLine(slide, treatX - 0.65, treatMean, treatX + 0.65, treatMean, { color: C.treat, width: 2.5 });
  addLine(slide, controlX + 0.65, controlMean, treatX - 0.65, controlMean, { color: C.control, width: 1, dash: 'dash' });
  // 差の矢印
  const diffX = treatX + 0.95;
  addLine(slide, treatX + 0.65, controlMean, diffX + 0.15, controlMean, { color: C.control, width: 1, dash: 'dash' });
  addLine(slide, diffX, controlMean, diffX, treatMean + 0.03, { color: C.forest, width: 2, arrow: true });
  const tauHat = formulaSize('tauhat');
  addFormula(slide, 'tauhat', diffX + 0.12, (controlMean + treatMean) / 2 - tauHat.h / 2, { alt: 'tau hat' });
  addText(slide, '対照群 W=0', controlX - 0.8, axisBottom + 0.12, 1.6, 0.35, { fontSize: 13, bold: true, color: C.control, align: 'center' });
  addText(slide, '処置群 W=1', treatX - 0.8, axisBottom + 0.12, 1.6, 0.35, { fontSize: 13, bold: true, color: C.treat, align: 'center' });
  addText(slide, '平均', controlX - 1.2, controlMean - 0.17, 0.5, 0.34, { fontSize: 11.5, color: C.control, align: 'right' });
  addText(slide, '平均', treatX - 1.2, treatMean - 0.17, 0.5, 0.34, { fontSize: 11.5, color: C.treat, align: 'right' });

  const rx = 7.5;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.05, { fill: C.tint });
  const leaf = formulaSize('leaf');
  addFormula(slide, 'leaf', rx + (rw - leaf.w) / 2, 1.6 + (1.05 - leaf.h) / 2, { alt: 'tau_leaf = mean Y treated - mean Y control' });
  addBullets(slide, [
    '葉の中の対象は X が似ている → 無交絡の前提の下で「小さな実験」とみなせる',
    '葉の効果 ＝ 処置群の平均 − 対照群の平均',
    '葉には処置群・対照群の両方が必要（葉ごとに最小のデータ数を設ける）',
    '新しい対象 x の効果は、x がたどり着く葉の値で推定する',
  ], rx, 2.95, rw, 3.7, { fontSize: 15, space: 12 });
}

// =====================================================================
// 11. 正直な推定（Honesty）
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', '「正直な」推定：分割用と推定用でデータを分ける', [
    '因果フォレストの重要な工夫の一つが、正直な推定、英語で Honesty です。',
    '木を作るときに、分割を決めるデータと、葉の効果を計算するデータを分けます。',
    '同じデータで両方を行うと、たまたま効果の差が大きく見えた場所を選んで分割し、その同じデータで効果を測ることになります。結果として効果の違いを過大に見積もり、信頼区間も狭くなりすぎます。',
    'データを分ければ、分割の選び方によるバイアスが推定値に入りません。そのため信頼区間の理論が成り立ちます。',
    '代わりに、それぞれに使えるデータが半分になるので、推定のばらつきは大きくなります。',
  ].join('\n'));
  const barY = 1.7;
  const half = CONTENT_W / 2;
  addRect(slide, MARGIN_X, barY, half - 0.04, 0.7, C.forest);
  addRect(slide, MARGIN_X + half + 0.04, barY, half - 0.04, 0.7, C.moss);
  addText(slide, 'サンプル A：木の形（どこで分割するか）を決める', MARGIN_X + 0.25, barY, half - 0.5, 0.7, {
    fontSize: 15, bold: true, color: C.white, valign: 'middle',
  });
  addText(slide, 'サンプル B：葉の効果を推定する', MARGIN_X + half + 0.3, barY, half - 0.5, 0.7, {
    fontSize: 15, bold: true, color: C.ink, valign: 'middle',
  });
  addText(slide, '各木に与えられたデータを、ランダムに半分ずつに分ける', MARGIN_X, barY + 0.78, CONTENT_W, 0.32, {
    fontSize: 12, color: C.muted, align: 'center',
  });
  const cardY = 2.95;
  const cardH = 3.1;
  const cardW = (CONTENT_W - 0.4) / 2;
  const cardsSpec = [
    {
      x: MARGIN_X, mark: '×', markColor: 'A3453A', fill: C.gray,
      title: '同じデータで分割と推定を行うと',
      items: ['「たまたま差が大きく見える場所」で分割してしまう', 'その同じデータで効果を測るため、効果の違いを過大に見積もる', '信頼区間が狭すぎ、実際より自信過剰になる'],
    },
    {
      x: MARGIN_X + cardW + 0.4, mark: '○', markColor: C.forest, fill: C.tint,
      title: '正直な推定（Honesty）では',
      items: ['分割を選ぶデータと効果を測るデータが別 → 選び方のバイアスが入らない', '葉の推定値が偏らず、信頼区間の理論が成り立つ', '代償：それぞれに使えるデータが減り、ばらつきが増える'],
    },
  ];
  cardsSpec.forEach((c) => {
    addCard(slide, c.x, cardY, cardW, cardH, { fill: c.fill });
    addNode(slide, c.x + 0.55, cardY + 0.55, 0.6, c.markColor, c.mark, { fontSize: 22 });
    addText(slide, c.title, c.x + 1.05, cardY + 0.3, cardW - 1.3, 0.5, { fontSize: 17, bold: true, valign: 'middle' });
    addBullets(slide, c.items, c.x + 0.4, cardY + 1.1, cardW - 0.75, cardH - 1.25, { fontSize: 14.5, space: 10 });
  });
  addText(slide, 'Athey & Imbens (2016) が因果木に導入し、Wager & Athey (2018) が因果フォレストの理論（信頼区間）の前提とした。',
    MARGIN_X, 6.3, CONTENT_W, 0.45, { fontSize: 13, color: C.muted });
}

// =====================================================================
// 12. 因果フォレスト＝正直な因果木をたくさん平均
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', '因果フォレスト：正直な因果木を多数育てて平均する', [
    '因果フォレストの手順を5つのステップで示します。',
    'まずデータから一部を重複なしで抜き出します。これをサブサンプルと呼び、既定では半分を使います。',
    '次にサブサンプルを A と B に分け、A で木の形を決め、B で葉の効果を計算します。これを何千本も繰り返し、最後に平均します。',
    'Wager と Athey は、この方法で作った推定値が、データが十分に多いと正規分布に近づくことを示しました。そのため、各点の効果に信頼区間を付けられます。',
    'ばらつきの大きさは、木をいくつかの小さなグループに分けて、グループ間のばらつきから推定します。',
  ].join('\n'));
  const steps = [
    ['サブサンプル抽出', ['重複なしで一部を', '取り出す（例：50%）']],
    ['A と B に分ける', ['正直な推定のため、', '半分ずつに分ける']],
    ['A で因果木を育てる', ['効果の差が大きく', 'なる分割を選ぶ']],
    ['B で葉の効果を計算', ['処置群の平均 −', '対照群の平均']],
    ['B 本の木を平均', ['各木の推定効果を', '平均する']],
  ];
  const stepW = 2.14;
  const stepGap = (CONTENT_W - stepW * 5) / 4;
  const stepY = 1.7;
  const stepH = 1.75;
  steps.forEach(([title, desc], i) => {
    const x = MARGIN_X + i * (stepW + stepGap);
    const last = i === steps.length - 1;
    addCard(slide, x, stepY, stepW, stepH, { fill: last ? C.forest : C.tint });
    addNode(slide, x + 0.38, stepY + 0.4, 0.46, last ? C.white : C.forest, String(i + 1), { fontSize: 15, color: last ? C.forest : C.white });
    addText(slide, title, x + 0.15, stepY + 0.72, stepW - 0.3, 0.4, { fontSize: 14, bold: true, color: last ? C.white : C.ink });
    addText(slide, desc.map((line, j) => ({ text: line, breakLine: j < desc.length - 1 })), x + 0.15, stepY + 1.1, stepW - 0.3, 0.6, { fontSize: 12, color: last ? C.onDarkSub : C.muted });
    if (!last) addLine(slide, x + stepW + 0.04, stepY + stepH / 2, x + stepW + stepGap - 0.04, stepY + stepH / 2, { color: C.forest, width: 1.75, arrow: true });
  });
  addText(slide, '② 〜 ④ を B 回（例：2,000本）繰り返す', MARGIN_X + stepW + stepGap, stepY + stepH + 0.08, stepW * 3 + stepGap * 2, 0.35, {
    fontSize: 12.5, color: C.muted, align: 'center',
  });

  const by = 4.1;
  const leftW = 5.6;
  addCard(slide, MARGIN_X, by, leftW, 2.65, { fill: C.gray });
  addText(slide, '推定値は正規分布に近づく（Wager & Athey, 2018）', MARGIN_X + 0.3, by + 0.2, leftW - 0.6, 0.4, { fontSize: 14.5, bold: true, color: C.forest });
  const normal = formulaSize('normal');
  addFormula(slide, 'normal', MARGIN_X + (leftW - normal.w) / 2, by + 0.72, { alt: '(tau_hat(x) - tau(x)) / sigma_hat(x) converges to N(0,1)' });
  const ci = formulaSize('ci');
  const ciLabelW = 1.95;
  const ciX = MARGIN_X + (leftW - ciLabelW - ci.w) / 2;
  addText(slide, '→ 95%信頼区間：', ciX, by + 1.8, ciLabelW, 0.45, { fontSize: 15, bold: true, valign: 'middle' });
  addFormula(slide, 'ci', ciX + ciLabelW, by + 1.8 + (0.45 - ci.h) / 2, { alt: 'tau_hat(x) +- 1.96 sigma_hat(x)' });
  addBullets(slide, [
    'サブサンプルは「重複なしの抽出」。通常のランダムフォレストの復元抽出と違い、理論のために必要',
    '推定値のばらつき（標準誤差）は、木を小さなグループに分け、グループ間のばらつきから推定する',
    '既定値の例（R の grf）：木 2,000 本、サブサンプル 50%、葉の最小データ数 5',
  ], MARGIN_X + leftW + 0.45, by + 0.05, CONTENT_W - leftW - 0.45, 2.65, { fontSize: 14.5, space: 12 });
  addSource(slide, '出典：Wager & Athey (2018)、Athey, Tibshirani & Wager (2019)、grf 公式リファレンス');
}

// =====================================================================
// 13. 適応的な近傍としての見方
// =====================================================================
{
  const slide = newContentSlide('3  決定木から因果フォレストへ', '見方を変える：フォレストは「似た対象」への重み付け', [
    '因果フォレストの働きは、重み付けとして見るとよく分かります。',
    '推定したい点 x について、学習データの各点が、各木で x と同じ葉に入った割合を重み α として計算します。',
    '左の図では、効果に関係する x1 の方向でだけ近い点が大きな重みを持ち、効果に無関係な x4 の方向にはほとんど影響されません。',
    'k近傍法のように全ての方向で距離を測ると、無関係な特徴量が多いほど近傍がぼやけますが、因果フォレストは効果の違いに関係する方向を学ぶので、この問題に強くなります。',
    'この見方を一般化したのが、Athey、Tibshirani、Wager の一般化ランダムフォレスト、GRF です。',
  ].join('\n'));
  const px = 0.6;
  const py = 1.6;
  const pw = 6.2;
  const ph = 5.0;
  addCard(slide, px, py, pw, ph, { fill: C.gray });
  const plotX0 = px + 0.75;
  const plotX1 = px + pw - 0.3;
  const plotY0 = py + 0.7;
  const plotY1 = py + ph - 0.75;
  const targetU = 0.55;
  const bandHalf = 0.09;
  const toX = (u) => plotX0 + u * (plotX1 - plotX0);
  const toY = (v) => plotY1 - v * (plotY1 - plotY0);
  slide.addShape(pres.shapes.RECTANGLE, {
    x: toX(targetU - bandHalf * 1.6), y: plotY0, w: (plotX1 - plotX0) * bandHalf * 3.2, h: plotY1 - plotY0,
    fill: { color: C.mossLight, transparency: 35 }, line: { color: C.mossLight, width: 0.5, transparency: 35 },
  });
  addLine(slide, plotX0, plotY1, plotX1 + 0.1, plotY1, { color: C.muted, width: 1.25, arrow: true });
  addLine(slide, plotX0, plotY1, plotX0, plotY0 - 0.1, { color: C.muted, width: 1.25, arrow: true });
  addText(slide, 'x_{1}（効果に関係する特徴量）', plotX0, plotY1 + 0.1, plotX1 - plotX0, 0.35, { fontSize: 12.5, color: C.muted, align: 'center' });
  addText(slide, 'x_{4}（効果に無関係な特徴量）', px + 0.3, py + 0.2, 3.2, 0.32, { fontSize: 12.5, color: C.muted });
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i += 1) {
    const u = 0.03 + rand() * 0.94;
    const v = 0.04 + rand() * 0.92;
    const weight = Math.exp(-(((u - targetU) / bandHalf) ** 2));
    const d = 0.07 + 0.25 * weight;
    addNode(slide, toX(u), toY(v), d, weight > 0.2 ? C.forest : 'B7C2BB');
  }
  const targetV = 0.5;
  addNode(slide, toX(targetU), toY(targetV), 0.3, C.treat, '', { lineColor: C.white });
  const labelX = toX(targetU) - 2.35;
  const labelY = toY(targetV) - 0.2;
  addCard(slide, labelX, labelY, 1.75, 0.4, { fill: C.white, line: C.treat, radius: 0.06 });
  addText(slide, '推定したい点 x', labelX, labelY, 1.75, 0.4, { fontSize: 12.5, bold: true, color: C.treat, align: 'center', valign: 'middle' });
  addLine(slide, labelX + 1.75, labelY + 0.2, toX(targetU) - 0.17, toY(targetV), { color: C.treat, width: 1.25 });
  addText(slide, '円の大きさ＝重み α_{i}(x)', px + pw - 2.9, py + 0.2, 2.6, 0.32, { fontSize: 12, color: C.muted, align: 'right' });

  const rx = 7.2;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.25, { fill: C.tint });
  const weights = formulaSize('weights');
  addFormula(slide, 'weights', rx + (rw - weights.w) / 2, 1.6 + (1.25 - weights.h) / 2, { alt: 'alpha_i(x) = 1/B sum_b 1{X_i in L_b(x)} / |L_b(x)|' });
  addBullets(slide, [
    'α_{i}(x)：学習データ i が、各木で x と同じ葉 L_{b}(x) に入った割合',
    '効果の違いに関係する方向（x_{1}）でだけ「近い」と判定される',
    '無関係な特徴量（x_{4}）が多くても近傍がぼやけにくい（k近傍法との違い）',
    '推定効果は、この重みで集めた対象から計算する（一般化ランダムフォレスト）',
  ], rx, 3.1, rw, 3.6, { fontSize: 14.5, space: 11 });
  addText(slide, '図は概念図（点の配置は説明用）', px, py + ph + 0.05, pw, 0.3, { fontSize: 10.5, color: C.muted });
  addSource(slide, '出典：Athey, Tibshirani & Wager (2019)');
}

// =====================================================================
// 14. 観察データへの対応：直交化
// =====================================================================
{
  const slide = newContentSlide('4  観察データへの対応', '観察データへの対応：残差どうしで効果を推定する', [
    '観察データでは、処置を受けるかどうかが X によって偏っていることが普通です。例えば x2 が大きい対象ほど処置を受けやすく、しかも Y ももともと高い場合、単純に比べると効果を過大評価します。',
    'そこで、まず X から Y を予測するモデル m と、X から処置の確率を予測するモデル e を作ります。',
    '次に、実際の Y と W からそれぞれの予測値を引いた「残差」を作り、残差どうしの関係から効果を推定します。X で説明できる部分を先に取り除くので、交絡の影響を受けにくくなります。',
    'これは Robinson が1988年に示した考え方で、R-learner とも呼ばれます。grf の因果フォレストはこの残差の上で木を育てます。',
    'm と e は交差適合で作ります。これは、自分自身を学習に使っていないモデルで予測値を作ることで、過学習の影響を避けるためです。',
  ].join('\n'));
  addCard(slide, MARGIN_X, 1.6, CONTENT_W, 0.75, { fill: C.treatTint });
  addText(slide, [
    { text: '問題：', bold: true, color: C.treat },
    { text: '交絡。例）x_{2} が大きい対象ほど処置されやすく、Y ももともと高い → 単純比較では効果を過大評価' },
  ], MARGIN_X + 0.3, 1.6, CONTENT_W - 0.6, 0.75, { fontSize: 14.5, valign: 'middle' });

  // 左：流れ図
  const box = (x, y, w, h, lines, fill, color) => {
    addCard(slide, x, y, w, h, { fill });
    addText(slide, lines, x + 0.1, y, w - 0.2, h, { fontSize: 13, align: 'center', valign: 'middle', color, bold: true });
  };
  const fy1 = 2.75;
  const fy2 = 4.3;
  box(0.6, 3.25, 0.85, 1.3, [{ text: '特徴量', breakLine: true }, { text: 'X' }], C.forest, C.white);
  box(1.8, fy1, 2.05, 1.0, [{ text: '結果のモデル', breakLine: true }, { text: 'm(X) ≈ E[Y|X]' }], C.tint, C.ink);
  box(1.8, fy2, 2.05, 1.0, [{ text: '処置のモデル', breakLine: true }, { text: 'e(X) ≈ P(W=1|X)' }], C.tint, C.ink);
  box(4.15, fy1, 1.55, 1.0, [{ text: '残差', breakLine: true }, { text: 'Y − m(X)' }], C.gray, C.ink);
  box(4.15, fy2, 1.55, 1.0, [{ text: '残差', breakLine: true }, { text: 'W − e(X)' }], C.gray, C.ink);
  addLine(slide, 1.45, 3.6, 1.78, fy1 + 0.5, { color: C.forest, width: 1.5, arrow: true });
  addLine(slide, 1.45, 4.2, 1.78, fy2 + 0.5, { color: C.forest, width: 1.5, arrow: true });
  addLine(slide, 3.85, fy1 + 0.5, 4.13, fy1 + 0.5, { color: C.forest, width: 1.5, arrow: true });
  addLine(slide, 3.85, fy2 + 0.5, 4.13, fy2 + 0.5, { color: C.forest, width: 1.5, arrow: true });
  addLine(slide, 5.7, fy1 + 0.5, 5.93, 3.7, { color: C.forest, width: 1.5, arrow: true });
  addLine(slide, 5.7, fy2 + 0.5, 5.93, 4.15, { color: C.forest, width: 1.5, arrow: true });
  box(5.95, 3.3, 1.3, 1.25, [{ text: '因果', breakLine: true }, { text: 'フォレスト' }], C.treat, C.white);
  addText(slide, '因果フォレストは、2つの残差の上で木を分割し、効果を推定する', 0.6, 5.45, 6.7, 0.32, { fontSize: 11.5, color: C.muted });

  // 右：式
  const rx = 7.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '考え方（Robinson, 1988）', rx, 2.65, rw, 0.35, { fontSize: 13.5, bold: true, color: C.forest });
  addFormula(slide, 'robinson', rx, 3.02, { alt: 'Y - m(X) = tau(X) (W - e(X)) + epsilon' });
  addText(slide, '因果フォレストでの推定値（R-learner 型）', rx, 3.65, rw, 0.35, { fontSize: 13.5, bold: true, color: C.forest });
  const rl = formulaSize('rlearner', 0.95);
  addFormula(slide, 'rlearner', rx, 4.02, { scale: 0.95, alt: 'tau_hat(x) = sum alpha_i (Y_i - m_hat)(W_i - e_hat) / sum alpha_i (W_i - e_hat)^2' });
  addBullets(slide, [
    `「X で説明できる部分」を先に除くので、交絡の影響を受けにくい`,
    'm と e の予測値は交差適合（自分を学習に使っていないモデルで予測）で作る',
    'm と e の多少の誤差は、効果の推定に一次の影響を与えない（直交性）',
  ], MARGIN_X, 5.95, CONTENT_W, 1.0, { fontSize: 13.5, space: 3 });
  if (rl.w > rw) throw new Error('rlearner の数式が枠からはみ出します');
}

// =====================================================================
// 15. アルゴリズムの全体像
// =====================================================================
{
  const slide = newContentSlide('4  観察データへの対応', 'アルゴリズムの全体像', [
    'ここまでの要素をつなげると、因果フォレストは6つのステップで動きます。',
    '1と2は局外モデル、英語でニューサンスモデルと呼ばれ、結果と処置の確率をそれぞれ予測します。ここは普通のランダムフォレストなどで構いません。',
    '3で残差を作り、4で正直な因果木を多数育てます。',
    '5で各点の重みを計算し、6で効果と信頼区間を出力します。',
    'R の grf パッケージの causal_forest 関数も、Python の EconML の CausalForestDML も、この流れを1回の呼び出しで実行します。',
  ].join('\n'));
  const steps = [
    ['結果のモデル m(x)', ['Y を X から予測する', '（ランダムフォレスト等、交差適合）']],
    ['処置のモデル e(x)', ['処置を受ける確率（傾向スコア）を', 'X から予測する']],
    ['残差をつくる', ['Y − m(X) と W − e(X) を計算する']],
    ['正直な因果木を多数育てる', ['サブサンプルごとに、', '効果の差が大きくなる分割で木を作る']],
    ['近傍の重み α_{i}(x)', ['各木で x と同じ葉に入った', '割合を求める']],
    ['効果と信頼区間を出力', ['推定効果、信頼区間、', 'ATE、変数重要度']],
  ];
  const boxW = 3.6;
  const gapX = (CONTENT_W - boxW * 3) / 2;
  const rowY = [1.7, 4.15];
  const boxH = 1.75;
  steps.forEach(([title, desc], i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = MARGIN_X + col * (boxW + gapX);
    const y = rowY[row];
    const isForestStep = i >= 3;
    addCard(slide, x, y, boxW, boxH, { fill: isForestStep ? C.tint : C.gray });
    addNode(slide, x + 0.45, y + 0.48, 0.54, isForestStep ? C.forest : C.muted, String(i + 1), { fontSize: 17 });
    addText(slide, title, x + 0.85, y + 0.22, boxW - 1.0, 0.52, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc.map((line, j) => ({ text: line, breakLine: j < desc.length - 1 })), x + 0.3, y + 0.9, boxW - 0.45, 0.8, { fontSize: 12.5, color: C.muted });
    if (col < 2) addLine(slide, x + boxW + 0.05, y + boxH / 2, x + boxW + gapX - 0.05, y + boxH / 2, { color: C.forest, width: 1.75, arrow: true });
  });
  // 3 → 4 への折り返し
  const x3 = MARGIN_X + 2 * (boxW + gapX) + boxW / 2;
  const x4 = MARGIN_X + boxW / 2;
  const midY = (rowY[0] + boxH + rowY[1]) / 2;
  addLine(slide, x3, rowY[0] + boxH + 0.03, x3, midY, { color: C.forest, width: 1.75 });
  addLine(slide, x3, midY, x4, midY, { color: C.forest, width: 1.75 });
  addLine(slide, x4, midY, x4, rowY[1] - 0.03, { color: C.forest, width: 1.75, arrow: true });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.6, { fill: C.gray });
  addText(slide, '① ② は局外（ニューサンス）モデル。grf の causal_forest()、EconML の CausalForestDML は、この流れを一括で実行する。',
    MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.6, { fontSize: 13, valign: 'middle' });
}

// =====================================================================
// 16. 何が得られるか
// =====================================================================
{
  const slide = newContentSlide('4  観察データへの対応', '因果フォレストから得られるもの', [
    '因果フォレストからは、個別の効果だけでなく、さまざまな要約が得られます。',
    '個別の効果には信頼区間が付きますが、1件ごとの値は誤差が大きいので、群や方針の単位で使うのが基本です。',
    '平均処置効果は、二重頑健なスコアを使って、全体や部分集団について推定できます。',
    '変数重要度は、どの特徴量が分割に多く使われたかを示し、効果の違いに関わる候補を探すのに使えます。',
    '最良線形射影は、推定された効果を特徴量の線形式で要約し、係数の検定を行う方法です。',
    'さらに、効果の違いが本当にあるかの検定や、誰に処置すべきかという方針の評価もできます。カード下の小さな文字は、R の grf での関数名です。',
  ].join('\n'));
  const items = [
    ['個別の効果と信頼区間', '各対象の推定効果と95%信頼区間。1件ごとの値は誤差が大きいので、群や方針の単位で使う', 'predict(cf, estimate.variance = TRUE)'],
    ['平均処置効果（ATE）', '二重頑健（AIPW）スコアで、全体や部分集団の平均効果を推定する', 'average_treatment_effect(cf)'],
    ['変数重要度', 'どの特徴量が分割に多く使われたか。効果の違いに関わる候補を探す', 'variable_importance(cf)'],
    ['最良線形射影（BLP）', 'τ(x) を特徴量の線形式で要約し、係数を検定する', 'best_linear_projection(cf, X)'],
    ['異質性の検定', '効果の違いが本当にあるのかを確かめる', 'test_calibration(cf)'],
    ['方針の評価', '推定効果の高い順に処置したときの利得（RATE・TOC曲線）', 'rank_average_treatment_effect()'],
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardH = 2.35;
  const rowY = [1.65, 4.3];
  items.forEach(([title, desc, fn], i) => {
    const x = MARGIN_X + (i % 3) * (cardW + gapX);
    const y = rowY[Math.floor(i / 3)];
    addCard(slide, x, y, cardW, cardH, { fill: i === 0 ? C.tint : C.gray });
    addNode(slide, x + 0.42, y + 0.42, 0.44, C.forest, String(i + 1), { fontSize: 14 });
    addText(slide, title, x + 0.78, y + 0.18, cardW - 0.95, 0.48, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 0.8, cardW - 0.55, 1.05, { fontSize: 13 });
    addText(slide, fn, x + 0.3, y + cardH - 0.45, cardW - 0.5, 0.3, { fontSize: 10.5, color: C.muted, fontFace: CODE_FONT });
  });
  addSource(slide, '関数名は R の grf パッケージ。Python の EconML では effect_interval()、ate_、feature_importances_ などに相当');
}

// =====================================================================
// 17. 検証の考え方
// =====================================================================
{
  const slide = newContentSlide('4  観察データへの対応', '効果の違いは本物か？ 検証の考え方', [
    '因果フォレストは、データに効果の違いがなくても、ノイズから違いがあるように見える推定値を出すことがあります。そのため、違いが本物かを確かめる手順が欠かせません。',
    '検証の基本は、二重頑健スコア、ガンマです。結果のモデルか傾向スコアのモデルのどちらかが正しければ、平均すると真の効果に一致するという性質があります。',
    '1つ目は群別の比較です。推定された効果の大きさで対象を4群ほどに分け、各群のガンマの平均を計算します。群の順に効果が大きくなっていれば、違いは本物らしいと言えます。後半のデモでもこれを行います。',
    '2つ目は grf の較正検定、3つ目は RATE と呼ばれる、推定効果の高い順に処置したときの利得を測る方法です。',
    'いずれも、推定に使っていないデータで評価することが大切です。',
  ].join('\n'));
  addCard(slide, MARGIN_X, 1.6, CONTENT_W, 1.5, { fill: C.gray });
  const dr = formulaSize('drscore');
  addFormula(slide, 'drscore', MARGIN_X + 0.3, 1.6 + (1.5 - dr.h) / 2, { alt: 'AIPW score Gamma_i' });
  addText(slide, [
    { text: '二重頑健（AIPW）スコア Γ_{i}', bold: true, color: C.forest, breakLine: true },
    { text: '結果のモデルと傾向スコアのモデルのどちらか一方が正しければ、平均すると真の効果に一致する' },
  ], MARGIN_X + 0.3 + dr.w + 0.35, 1.72, CONTENT_W - dr.w - 0.95, 1.26, { fontSize: 13, valign: 'middle', paraSpaceAfter: 4 });

  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardY = 3.35;
  const cardH = 2.65;
  const methods = [
    ['群別の比較', '推定効果の大きさで対象を4群に分け、各群で Γ の平均（群の効果）を計算。群の順に効果が大きくなれば、違いは本物らしい', 'デモで実施'],
    ['較正の検定', '「平均の予測」の係数が1に近いか、「違いの予測」の係数が正で有意か、を回帰で確かめる', 'grf：test_calibration()'],
    ['RATE・TOC 曲線', '推定効果の高い順に処置したとき、ランダムに処置するより平均効果がどれだけ高いかを測る', 'Yadlowsky ほか (2025)'],
  ];
  methods.forEach(([title, desc, tag], i) => {
    const x = MARGIN_X + i * (cardW + gapX);
    addCard(slide, x, cardY, cardW, cardH, { fill: C.tint });
    addNode(slide, x + 0.42, cardY + 0.42, 0.46, C.forest, String(i + 1), { fontSize: 15 });
    addText(slide, title, x + 0.8, cardY + 0.18, cardW - 1.0, 0.48, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, cardY + 0.82, cardW - 0.55, 1.35, { fontSize: 13.5 });
    addText(slide, tag, x + 0.3, cardY + cardH - 0.45, cardW - 0.5, 0.3, { fontSize: 11, color: C.forest, bold: true });
  });
  addText(slide, [
    { text: '大切なこと：', bold: true, color: C.treat },
    { text: '評価には推定に使っていないデータ（OOB予測や検証用データ）を使う。同じデータで作って同じデータで評価すると、違いを過大に見てしまう。' },
  ], MARGIN_X, 6.15, CONTENT_W, 0.65, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 18. デモの設定
// =====================================================================
{
  const s = demo.settings;
  const slide = newContentSlide('5  デモ', 'デモ：真の効果が分かる合成データで試す', [
    'ここからは、真の効果が分かっている合成データで、因果フォレストを実際に動かした結果です。',
    '特徴量は6つで、効果の大きさを決めるのは x1 だけです。x1 が小さいと効果はマイナス、大きいとプラスになります。',
    '一方、x2 は処置の受けやすさと結果の両方に影響する交絡因子です。x2 が大きいほど処置を受けやすく、Y も高くなります。x3 は結果だけに影響し、x4 から x6 は何にも関係しないノイズです。',
    `学習用に${s.n_train.toLocaleString()}件、評価用に${s.n_test.toLocaleString()}件を作り、Python の EconML ${demo.econml_version} の CausalForestDML で推定しました。`,
    'この計算はこのMacで実行したもので、乱数の種を固定しているので同じ結果を再現できます。',
  ].join('\n'));
  // 左：因果関係の図
  const gx = 0.6;
  const gy = 1.6;
  const gw = 5.9;
  const gh = 5.1;
  addCard(slide, gx, gy, gw, gh, { fill: C.gray });
  addText(slide, 'データの因果関係', gx + 0.3, gy + 0.2, 3, 0.35, { fontSize: 13.5, bold: true, color: C.muted });
  const pos = {
    x2: [gx + 2.95, gy + 1.25], W: [gx + 1.3, gy + 2.85], Y: [gx + 4.6, gy + 2.85],
    x1: [gx + 2.95, gy + 4.0], x3: [gx + 5.25, gy + 1.25],
  };
  const r = 0.36;
  const arrowBetween = (a, b, opts = {}) => {
    const [ax, ay] = pos[a];
    const [bx, by] = pos[b];
    const d = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / d;
    const uy = (by - ay) / d;
    addLine(slide, ax + ux * (r + 0.03), ay + uy * (r + 0.03), bx - ux * (r + 0.06), by - uy * (r + 0.06), { color: C.ink, width: 1.75, arrow: true, ...opts });
  };
  arrowBetween('x2', 'W');
  arrowBetween('x2', 'Y');
  arrowBetween('W', 'Y', { color: C.treat, width: 2.5 });
  arrowBetween('x3', 'Y');
  const midWY = [(pos.W[0] + pos.Y[0]) / 2, pos.W[1]];
  addLine(slide, pos.x1[0], pos.x1[1] - r - 0.03, midWY[0], midWY[1] + 0.12, { color: C.forest, width: 1.75, dash: 'dash', arrow: true });
  addNode(slide, pos.x2[0], pos.x2[1], r * 2, C.muted, 'x_{2}', { fontSize: 16 });
  addNode(slide, pos.x3[0], pos.x3[1], r * 2, 'A7B2AB', 'x_{3}', { fontSize: 16 });
  addNode(slide, pos.W[0], pos.W[1], r * 2, C.treat, 'W', { fontSize: 18 });
  addNode(slide, pos.Y[0], pos.Y[1], r * 2, C.control, 'Y', { fontSize: 18 });
  addNode(slide, pos.x1[0], pos.x1[1], r * 2, C.forest, 'x_{1}', { fontSize: 16 });
  addText(slide, [{ text: '交絡：処置の受けやすさと', breakLine: true }, { text: '結果の両方に影響' }], gx + 0.25, pos.x2[1] - 0.3, 2.3, 0.6, { fontSize: 11.5, color: C.ink, align: 'right' });
  addText(slide, '効果の大きさを変える', pos.x1[0] + 0.12, pos.x1[1] - 0.7, 2.4, 0.32, { fontSize: 11.5, color: C.forest, bold: true });
  addText(slide, 'x_{4}〜x_{6}：どこにも影響しないノイズ', gx + 0.3, gy + gh - 0.45, gw - 0.6, 0.32, { fontSize: 11.5, color: C.muted });

  // 右：設定
  const rx = 6.9;
  const rw = SLIDE_W - MARGIN_X - rx;
  const labelW = 1.35;
  const rowsF = [['真の効果', 'demo_tau', 1.6], ['処置の確率', 'demo_e', 2.45], ['結果', 'demo_y', 3.3]];
  rowsF.forEach(([label, key, y]) => {
    const size = formulaSize(key);
    const rowH = key === 'demo_y' ? 0.55 : 0.8;
    addText(slide, label, rx, y, labelW, rowH, { fontSize: 13.5, bold: true, color: C.forest, valign: 'middle' });
    addFormula(slide, key, rx + labelW, y + (rowH - size.h) / 2, { alt: label });
  });
  addBullets(slide, [
    '特徴量 x_{1}〜x_{6}：それぞれ −1〜1 の一様分布',
    `学習 ${s.n_train.toLocaleString()} 件、評価 ${s.n_test.toLocaleString()} 件（評価データは推定に使わない）`,
    `処置を受けた割合 ${Math.round(s.treated_share_train * 100)}%、傾向スコアの範囲 ${fmt2(s.propensity_range_train[0])}〜${fmt2(s.propensity_range_train[1])}`,
    `EconML ${demo.econml_version} の CausalForestDML：木 ${s.n_trees.toLocaleString()} 本、正直な推定、サブサンプル 50%、葉の最小 ${s.econml_min_samples_leaf} 件、5分割の交差適合`,
    '局外モデル（m、e）：ランダムフォレスト',
  ], rx, 4.05, rw, 2.75, { fontSize: 13.5, space: 7 });
}

// =====================================================================
// 19. 結果①：平均効果
// =====================================================================
{
  const a = demo.ate;
  const ratio = a.naive / a.true;
  const slide = newContentSlide('5  デモ', '結果①：単純比較は交絡で大きく外れる', [
    `まず全体の平均効果です。処置群の平均から対照群の平均を引いただけの単純比較は ${fmt2(a.naive)} で、真の値 ${fmt2(a.true)} の約${ratio.toFixed(1)}倍になりました。`,
    'x2 が大きい対象ほど処置を受けやすく、もともと Y も高いため、単純比較はその差まで効果に含めてしまったのです。',
    `因果フォレストの二重頑健な平均効果は ${fmt2(a.forest)}、95%信頼区間は ${fmt2(a.forest_ci[0])} から ${fmt2(a.forest_ci[1])} で、真の値を含んでいます。`,
    '残差化によって x2 の影響を取り除けたことが分かります。ただし、これは x2 がデータに含まれているからで、もし x2 を測っていなければ、どの手法でも正しく推定できません。',
  ].join('\n'));
  const cards = [
    { label: '単純比較', sub: '処置群の平均 − 対照群の平均', value: fmt2(a.naive), note: `真の値の約${ratio.toFixed(1)}倍`, fill: C.gray, color: C.muted },
    { label: '因果フォレスト', sub: '二重頑健な平均処置効果', value: fmt2(a.forest), note: `95%信頼区間 ${fmt2(a.forest_ci[0])}〜${fmt2(a.forest_ci[1])}`, fill: C.tint, color: C.forest },
    { label: '真の平均効果', sub: '学習データ（合成データなので既知）', value: fmt2(a.true), note: 'シミュレーションだから分かる値', fill: C.treatTint, color: C.treat },
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (cardW + gapX);
    addCard(slide, x, 1.6, cardW, 2.55, { fill: c.fill });
    addText(slide, c.label, x + 0.3, 1.75, cardW - 0.6, 0.4, { fontSize: 16, bold: true, color: C.ink });
    addText(slide, c.sub, x + 0.3, 2.13, cardW - 0.6, 0.35, { fontSize: 12, color: C.muted });
    addText(slide, c.value, x + 0.3, 2.45, cardW - 0.6, 1.0, { fontSize: 54, bold: true, color: c.color, valign: 'middle' });
    addText(slide, c.note, x + 0.3, 3.55, cardW - 0.6, 0.4, { fontSize: 13, color: C.ink });
  });
  // 数直線
  const lx0 = 1.3;
  const lx1 = 12.2;
  const ly = 5.2;
  const vMin = 0;
  const vMax = 2.5;
  const toX = (v) => lx0 + ((v - vMin) / (vMax - vMin)) * (lx1 - lx0);
  addLine(slide, lx0, ly, lx1, ly, { color: C.muted, width: 1.25 });
  [0, 0.5, 1.0, 1.5, 2.0, 2.5].forEach((v) => {
    addLine(slide, toX(v), ly - 0.06, toX(v), ly + 0.06, { color: C.muted, width: 1 });
    addText(slide, v.toFixed(1), toX(v) - 0.3, ly + 0.12, 0.6, 0.3, { fontSize: 11, color: C.muted, align: 'center' });
  });
  addRect(slide, toX(a.forest_ci[0]), ly - 0.14, toX(a.forest_ci[1]) - toX(a.forest_ci[0]), 0.28, C.mossLight);
  addLine(slide, toX(a.true), ly - 0.55, toX(a.true), ly + 0.5, { color: C.treat, width: 2, dash: 'dash' });
  addNode(slide, toX(a.forest), ly, 0.22, C.forest);
  addNode(slide, toX(a.naive), ly, 0.22, C.muted);
  addText(slide, '真の値', toX(a.true) - 1.3, ly - 0.62, 1.2, 0.3, { fontSize: 12, bold: true, color: C.treat, align: 'right' });
  addText(slide, '因果フォレスト（帯は95%信頼区間）', toX(a.forest_ci[1]) + 0.12, ly - 0.5, 3.5, 0.3, { fontSize: 12, bold: true, color: C.forest });
  addText(slide, '単純比較', toX(a.naive) - 0.6, ly - 0.5, 1.2, 0.3, { fontSize: 12, bold: true, color: C.muted, align: 'center' });
  addText(slide, '平均処置効果', lx0, ly + 0.42, 3, 0.3, { fontSize: 11, color: C.muted });
  addText(slide, 'x_{2} が大きい対象ほど処置されやすく、Y ももともと高い。単純比較はその差まで効果に含めてしまう。因果フォレストは残差化で x_{2} の影響を取り除いた。',
    MARGIN_X, 6.2, CONTENT_W, 0.6, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 20. 結果②：x1 に沿った効果
// =====================================================================
{
  const q = demo.cate_quality;
  const cov = demo.coverage_by_region;
  const slide = newContentSlide('5  デモ', '結果②：x_{1} に沿った効果の変化を再現できた', [
    '次に、条件ごとの効果です。x1 以外の特徴量を 0 に固定し、x1 だけを動かしたときの推定値を描きました。オレンジが真の効果、緑が推定値、点線が95%信頼区間です。',
    'x1 がマイナスの側で効果がマイナス、プラスの側でプラスになる形を、よく捉えています。',
    `評価データ1,000件全体で見ると、推定と真の効果の相関は ${q.correlation.toFixed(2)}、誤差の大きさを表す RMSE は ${fmt2(q.rmse)} でした。`,
    `一方、95%信頼区間が真の値を含む割合は ${pct1(q.coverage95)}% で、名目の95%をやや下回りました。内訳を見ると、効果が急に変わる x1 が −0.3〜0.3 の範囲では ${pct1(cov.steep)}%、それ以外では ${pct1(cov.flat)}% でした。`,
    '急な変化の付近では、近くの対象を平均することで推定がなまり、偏りが残るためです。信頼区間は目安として使い、過信しないことが大切です。',
  ].join('\n'));
  const labels = demo.curve.x1.map((v) => v.toFixed(2));
  slide.addChart([
    {
      type: pres.charts.LINE,
      data: [
        { name: '真の効果', labels, values: demo.curve.true },
        { name: '推定値', labels, values: demo.curve.hat },
      ],
      options: { chartColors: [C.treat, C.forest], lineSize: 3, lineDataSymbol: 'none' },
    },
    {
      type: pres.charts.LINE,
      data: [
        { name: '95%信頼区間（下限）', labels, values: demo.curve.lower },
        { name: '95%信頼区間（上限）', labels, values: demo.curve.upper },
      ],
      options: { chartColors: [C.moss, C.moss], lineSize: 1.5, lineDash: 'dash', lineDataSymbol: 'none' },
    },
  ], {
    x: 0.6, y: 1.55, w: 7.9, h: 5.2,
    ...chartBase(),
    showTitle: true, title: '処置効果 τ(x) と推定値（x2〜x6 を 0 に固定）',
    catAxisLabelFrequency: 5, catAxisTitle: 'x1（効果を左右する特徴量）', showCatAxisTitle: true,
    catAxisTitleColor: C.muted, catAxisTitleFontSize: 11,
    valAxisTitle: '処置効果', showValAxisTitle: true, valAxisTitleColor: C.muted, valAxisTitleFontSize: 11,
    valAxisMinVal: -1.5, valAxisMaxVal: 3, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: '0.0',
    catAxisLabelPos: 'low', catAxisLabelRotate: 0,
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.9;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '評価データ 1,000 件での精度', rx, 1.65, rw, 0.4, { fontSize: 14.5, bold: true, color: C.forest });
  const stats = [
    ['推定と真の効果の相関', q.correlation.toFixed(2)],
    ['RMSE（誤差の大きさ）', fmt2(q.rmse)],
    ['95%信頼区間が真の値を含む割合', `${pct1(q.coverage95)}%`],
  ];
  stats.forEach(([label, value], i) => {
    const y = 2.15 + i * 1.05;
    addCard(slide, rx, y, rw, 0.92, { fill: i === 2 ? C.treatTint : C.tint });
    addText(slide, label, rx + 0.2, y, rw * 0.58, 0.92, { fontSize: 13, valign: 'middle' });
    addText(slide, value, rx + rw * 0.58, y, rw * 0.42 - 0.2, 0.92, { fontSize: 24, bold: true, color: i === 2 ? C.treat : C.forest, align: 'right', valign: 'middle' });
  });
  addText(slide, [
    { text: `効果が急に変わる |x_{1}| < 0.3 では ${pct1(cov.steep)}%、それ以外では ${pct1(cov.flat)}%。`, breakLine: true },
    { text: '急な変化の付近は、平均化で推定がなまり偏りが残る。' },
  ], rx, 5.35, rw, 1.35, { fontSize: 12.5, color: C.ink, paraSpaceAfter: 4 });
}

// =====================================================================
// 21. 結果③：群別の効果と変数重要度
// =====================================================================
{
  const g = demo.groups;
  const fi = demo.feature_importance;
  const slide = newContentSlide('5  デモ', '結果③：群別の効果と、効果を左右する変数', [
    '左のグラフは、推定された効果の大きさで評価データを4つの群に分け、群ごとに3つの値を比べたものです。',
    '緑は推定効果の平均、薄い緑は推定に使っていない評価データで計算した二重頑健スコアの平均、オレンジは真の効果の平均です。',
    '薄い緑の値は、実務でも計算できる検証用の値です。群1から群4に向かって順に大きくなっており、効果の違いが本物であることを裏付けています。',
    `右のグラフは変数重要度です。x1 が ${pct1(fi[0])}% を占め、効果を左右する変数を正しく見つけています。`,
    `なお、推定効果がマイナスとなった対象は ${pct1(demo.share_negative_hat)}% で、真の値の ${pct1(demo.share_negative_true)}% に近い値でした。そのうち信頼区間の上限までマイナスで、逆効果とほぼ言い切れるのは ${pct1(demo.share_negative_hat_significant)}% です。`,
  ].join('\n'));
  const labels = ['群1（推定効果 小）', '群2', '群3', '群4（推定効果 大）'];
  slide.addChart(pres.charts.BAR, [
    { name: '推定効果の平均', labels, values: g.map((x) => x.cate_mean) },
    { name: '二重頑健スコアの平均（検証）', labels, values: g.map((x) => x.dr_mean) },
    { name: '真の効果の平均', labels, values: g.map((x) => x.true_mean) },
  ], {
    x: 0.6, y: 1.55, w: 6.9, h: 4.65, barDir: 'col', barGrouping: 'clustered',
    ...chartBase(),
    chartColors: [C.forest, C.moss, C.treat],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 9.5, dataLabelColor: C.ink,
    showTitle: true, title: '推定効果で4群に分けたときの各群の効果（評価データ）',
    valAxisMinVal: -1, valAxisMaxVal: 3, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0.0',
    catAxisLabelFontSize: 10.5, barGapWidthPct: 70,
    showLegend: true, legendPos: 'b',
  });
  addText(slide, '各群 250 件。二重頑健スコアは、推定に使っていない評価データで計算（実務でも使える検証）。', 0.6, 6.3, 6.9, 0.45, {
    fontSize: 11, color: C.muted,
  });
  const names = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'];
  slide.addChart(pres.charts.BAR, [{
    name: '変数重要度', labels: [...names].reverse(), values: [...fi].reverse().map((v) => v * 100),
  }], {
    x: 7.85, y: 1.55, w: 4.85, h: 3.35, barDir: 'bar',
    ...chartBase(),
    chartColors: [C.forest],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0"%"', dataLabelFontSize: 10, dataLabelColor: C.ink,
    showTitle: true, title: '変数重要度（%）',
    valAxisMinVal: 0, valAxisMaxVal: 110, valAxisMajorUnit: 25, valAxisHidden: true,
    valGridLine: { style: 'none' }, catAxisLabelFontSize: 11, barGapWidthPct: 45, showLegend: false,
  });
  addCard(slide, 7.85, 5.05, 4.85, 1.7, { fill: C.tint });
  addText(slide, [
    { text: `推定効果がマイナス：${pct1(demo.share_negative_hat)}%`, bold: true, breakLine: true },
    { text: `（真の値 ${pct1(demo.share_negative_true)}%）`, color: C.muted, breakLine: true },
    { text: `信頼区間の上限までマイナス：${pct1(demo.share_negative_hat_significant)}%`, bold: true, color: C.treat },
  ], 8.1, 5.05, 4.4, 1.7, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 22. 他の手法との比較
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '条件ごとの効果を推定する他の手法との比較', [
    '条件ごとの効果、CATE を推定する方法は、因果フォレスト以外にもいくつかあります。',
    'S-learner と T-learner は、普通の予測モデルを使って処置ありと処置なしの予測の差を取る、手軽な方法です。ただし、S-learner は効果が 0 に縮みやすく、T-learner は群の大きさが偏ると不安定になります。',
    'X-learner や DR-learner は、これらを改良した方法です。',
    '因果フォレストの強みは、信頼区間と変数重要度が得られることと、無関係な変数が多くても比較的強いことです。一方、多くのデータが必要で、滑らかな関数の推定や、データのない領域への外挿は苦手です。',
    '実務では、複数の手法で結果が大きく変わらないかを確かめるのも有効です。',
  ].join('\n'));
  const header = ['手法', '考え方', '長所', '注意点'];
  const rows = [
    ['S-learner', '処置 W を特徴量の1つとして1つのモデルで学習し、W=1 と W=0 の予測の差をとる', '手軽', '正則化で効果が 0 に縮みやすい'],
    ['T-learner', '処置群と対照群で別々にモデルを作り、予測の差をとる', '手軽で直感的', '片方の群が少ないと偏る。差がノイズを拾いやすい'],
    ['X-learner', 'T-learner の結果から個別効果の代理値を作り、傾向スコアで重み付けして統合', '群の大きさが偏っていても強い', '手順が多い'],
    ['DR-learner', '二重頑健スコア Γ を目的変数にして回帰する', '局外モデルの誤差に強い', '傾向スコアが 0 や 1 に近いと不安定'],
    ['因果フォレスト', '残差化したデータで、効果の差が大きくなるように木を分割し、平均する', '信頼区間と変数重要度が得られる。無関係な変数に強い', '多くのデータが必要。滑らかな関数や外挿は苦手'],
    ['BART', 'ベイズ的な木の和で結果をモデル化し、差をとる', '不確実性を事後分布で表せる', '計算が重い。事前分布の設定に依存'],
  ];
  const cellMargin = [0.05, 0.12, 0.05, 0.12];
  const tableRows = [
    header.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.forest } } })),
    ...rows.map((r) => {
      const highlight = r[0] === '因果フォレスト';
      return r.map((cell, j) => ({
        text: cell,
        options: { bold: j === 0, color: j === 0 ? C.forest : C.ink, fill: { color: highlight ? C.tint : C.white } },
      }));
    }),
  ];
  slide.addTable(tableRows, {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [1.75, 4.45, 2.95, 2.95],
    fontFace: FONT, fontSize: 12.5, valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.74, 0.74, 0.74, 0.74, 0.74, 0.74],
  });
  addSource(slide, '出典：Künzel ほか (2019)、Kennedy (2023)、Hill (2011)、Wager & Athey (2018)、Nie & Wager (2021)');
}

// =====================================================================
// 23. 実務での注意点
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '実務での注意点', [
    '実務で使うときの注意点を6つにまとめました。',
    '最も重要なのは1つ目です。無交絡の前提はデータから検証できません。処置がどう決まったかを関係者に確認し、判断材料になった変数を X に入れる必要があります。',
    '2つ目もよくある失敗で、処置の影響を受けた後の変数を X に入れると、効果の一部が消えてしまいます。',
    '3つ目の重なりは、傾向スコアの分布を処置群と対照群で比べて確認します。',
    '4つ目と5つ目はデータ量と精度の問題です。効果の違いの推定は平均効果の推定よりずっと難しく、1件ごとの値は誤差が大きいので、群や方針の単位で使います。',
    '6つ目として、違いを見つけるデータと確かめるデータを分け、見つけた条件は追加の実験で確認するのが理想です。',
  ].join('\n'));
  const items = [
    ['無交絡は検証できない', '処置の決まり方を関係者に確認し、判断材料を X に入れる。感度分析で「未測定の交絡がどれほどあれば結論が変わるか」を見る'],
    ['処置後の変数を X に入れない', '処置の影響を受けた変数（処置後の中間測定値など）を入れると、効果の一部が消えてしまう'],
    ['重なりを確認する', '傾向スコア ê(x) の分布を処置群と対照群で比べる。0 や 1 に近い領域は解釈を控える'],
    ['データ量が必要', '効果の「違い」の推定は、平均効果の推定よりずっと難しい。少ないデータで出た違いは偶然の可能性が高い'],
    ['個別の値を過信しない', '1件ごとの推定効果は誤差が大きい。群や方針の単位で使い、信頼区間を必ず見る'],
    ['探索と確認を分ける', '違いを見つけるデータと確かめるデータを分ける。見つけた条件は追加の実験で確認する'],
  ];
  const cardW = 3.85;
  const gapX = (CONTENT_W - cardW * 3) / 2;
  const cardH = 2.1;
  const rowY = [1.65, 3.95];
  items.forEach(([title, desc], i) => {
    const x = MARGIN_X + (i % 3) * (cardW + gapX);
    const y = rowY[Math.floor(i / 3)];
    addCard(slide, x, y, cardW, cardH, { fill: i < 2 ? C.treatTint : C.gray });
    addNode(slide, x + 0.42, y + 0.42, 0.44, i < 2 ? C.treat : C.forest, '!', { fontSize: 16 });
    addText(slide, title, x + 0.78, y + 0.18, cardW - 0.95, 0.48, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.3, y + 0.82, cardW - 0.55, 1.2, { fontSize: 13 });
  });
  addText(slide, [
    { text: '特に ① ② はデータを集める段階で決まる。', bold: true, color: C.treat },
    { text: '分析を始める前に、処置の決まり方と変数の測定時点を確認する。' },
  ], MARGIN_X, 6.3, CONTENT_W, 0.5, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 24. 実装ツール
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '実装ツール：R の grf と Python の EconML', [
    '因果フォレストの代表的な実装は2つです。',
    '1つは、Wager や Athey らが開発している R の grf パッケージです。因果フォレストの学習から、平均効果、検定、方針評価まで一通りそろっています。',
    'もう1つは、Microsoft 発の Python ライブラリ EconML の CausalForestDML です。局外モデルに好きな機械学習モデルを指定できます。',
    '下の表は grf の主な設定と既定値です。多くの場合は既定値のままで構いません。',
    '会社の Windows と Python の環境で使う場合は EconML が候補になりますが、社内でライブラリを導入できるかは事前に確認が必要です。',
  ].join('\n'));
  const cardW = (CONTENT_W - 0.4) / 2;
  const cardY = 1.6;
  const cardH = 3.55;
  const tools = [
    {
      title: 'R：grf パッケージ', sub: 'Athey・Tibshirani・Wager ら',
      rows: [
        ['causal_forest(X, Y, W)', '学習'],
        ['predict(cf, estimate.variance = TRUE)', '個別の効果と分散'],
        ['average_treatment_effect(cf)', '二重頑健な ATE'],
        ['test_calibration(cf)', '異質性の検定'],
        ['rank_average_treatment_effect(...)', 'RATE による評価'],
        ['variable_importance(cf)', '変数重要度'],
      ],
    },
    {
      title: 'Python：EconML', sub: 'Microsoft 発・PyWhy プロジェクト',
      rows: [
        ['CausalForestDML(model_y, model_t, ...)', '局外モデルを指定'],
        ['.fit(Y, T, X=X)', '学習（T が処置）'],
        ['.effect(X) / .effect_interval(X)', '効果と信頼区間'],
        ['.ate_ / .ate_stderr_', 'ATE と標準誤差'],
        ['.feature_importances_', '変数重要度'],
        ['.summary() / .shap_values(X)', '要約・SHAP 値'],
      ],
    },
  ];
  tools.forEach((t, i) => {
    const x = MARGIN_X + i * (cardW + 0.4);
    addCard(slide, x, cardY, cardW, cardH, { fill: C.tint });
    addText(slide, t.title, x + 0.3, cardY + 0.18, cardW - 0.6, 0.45, { fontSize: 17, bold: true, color: C.forest, valign: 'middle' });
    addText(slide, t.sub, x + 0.3, cardY + 0.6, cardW - 0.6, 0.3, { fontSize: 11.5, color: C.muted });
    t.rows.forEach(([code, desc], j) => {
      const y = cardY + 1.0 + j * 0.41;
      addText(slide, code, x + 0.3, y, cardW * 0.66, 0.36, { fontSize: 11, fontFace: CODE_FONT, color: C.ink, valign: 'middle' });
      addText(slide, desc, x + 0.3 + cardW * 0.66, y, cardW * 0.34 - 0.5, 0.36, { fontSize: 12, color: C.muted, valign: 'middle' });
    });
  });
  const params = [
    ['木の本数', 'num.trees', '2000'],
    ['サブサンプルの割合', 'sample.fraction', '0.5'],
    ['葉の最小データ数', 'min.node.size', '5'],
    ['正直な推定', 'honesty', 'TRUE'],
    ['正直な推定の分割比', 'honesty.fraction', '0.5'],
    ['パラメータ自動調整', 'tune.parameters', '"none"'],
  ];
  const ty = 5.3;
  addText(slide, 'grf の主な設定と既定値', MARGIN_X, ty, 4, 0.35, { fontSize: 13.5, bold: true, color: C.forest });
  const cellMargin = [0.03, 0.08, 0.03, 0.08];
  const tableRows = [
    params.map((p) => ({ text: p[0], options: { bold: true, color: C.ink, fill: { color: C.gray }, fontSize: 11.5 } })),
    params.map((p) => ({ text: p[1], options: { fontFace: CODE_FONT, fontSize: 10.5, color: C.ink } })),
    params.map((p) => ({ text: p[2], options: { fontFace: CODE_FONT, fontSize: 10.5, color: C.forest, bold: true } })),
  ];
  slide.addTable(tableRows, {
    x: MARGIN_X, y: ty + 0.38, w: CONTENT_W, colW: Array(6).fill(CONTENT_W / 6),
    fontFace: FONT, align: 'center', valign: 'middle', margin: cellMargin,
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.34, 0.3, 0.3],
  });
  addSource(slide, '出典：grf 公式リファレンス（causal_forest）、EconML ドキュメント。会社 PC への導入可否は要確認');
}

// =====================================================================
// 25. Python コード例
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', 'Python（EconML）での最小コード例', [
    'デモで使ったものとほぼ同じ、最小のコード例です。',
    'model_y と model_t が局外モデルで、それぞれ結果と処置の確率を予測します。ランダムフォレスト以外に、勾配ブースティングなども指定できます。',
    '処置が 0 と 1 の場合は discrete_treatment を True にします。',
    '注意点として、EconML では処置を T、調整だけに使う変数を W と書きます。この資料では処置を W と書いてきたので、記号の違いに気を付けてください。',
    'effect で個別の効果、effect_interval で信頼区間、ate_ で二重頑健な平均効果が得られます。',
  ].join('\n'));
  const code = [
    'from econml.dml import CausalForestDML',
    'from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor',
    '',
    'est = CausalForestDML(',
    '    model_y=RandomForestRegressor(min_samples_leaf=10),   # m(x)',
    '    model_t=RandomForestClassifier(min_samples_leaf=10),  # e(x)',
    '    discrete_treatment=True,  # 処置が 0/1',
    '    n_estimators=2000,        # 木の本数',
    '    min_samples_leaf=5,       # 葉の最小データ数',
    '    max_samples=0.5,          # サブサンプルの割合',
    '    honest=True,              # 正直な推定',
    '    cv=5,                     # 交差適合の分割数',
    '    random_state=0,',
    ')',
    'est.fit(Y, T, X=X)            # Y:結果  T:処置  X:特徴量',
    '',
    'tau_hat = est.effect(X_test)                            # 個別の効果',
    'lower, upper = est.effect_interval(X_test, alpha=0.05)  # 95%信頼区間',
    'print(est.ate_, est.ate_stderr_)                        # 平均効果',
    'print(est.feature_importances_)                         # 変数重要度',
  ];
  const codeX = MARGIN_X;
  const codeY = 1.6;
  const codeW = 8.55;
  const codeH = 4.7;
  addCard(slide, codeX, codeY, codeW, codeH, { fill: '1E2A24', radius: 0.08 });
  slide.addText(code.map((lineText, i) => ({
    text: lineText.length ? lineText : ' ',
    options: { breakLine: i < code.length - 1, color: lineText.trim().startsWith('#') ? '9FB8A6' : 'E8F0EA' },
  })), {
    x: codeX + 0.3, y: codeY + 0.22, w: codeW - 0.5, h: codeH - 0.4,
    fontFace: CODE_FONT, fontSize: 11.5, color: 'E8F0EA', margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP', lineSpacingMultiple: 1.05,
  });
  const rx = codeX + codeW + 0.35;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'ポイント', rx, 1.6, rw, 0.4, { fontSize: 16, bold: true, color: C.forest });
  addBullets(slide, [
    'model_y・model_t は局外モデル。勾配ブースティングなども使える',
    '処置が 0/1 なら discrete_treatment=True',
    [{ text: '記号に注意：', bold: true, color: C.treat }, 'EconML では処置を T、調整だけに使う変数を W と書く'],
    '効果の違いを見たい特徴量を X に入れる',
  ], rx, 2.1, rw, 4.6, { fontSize: 13, space: 12 });
}

// =====================================================================
// 26. 製造現場での活用イメージ
// =====================================================================
{
  const slide = newContentSlide('6  実務での使い方', '製造現場での活用イメージ（想定例）', [
    '最後に、製造現場で使う場合の流れを想定例として示します。実データで検証したものではありません。',
    '例えば「新しい補正レシピの効果が、装置や製品、層によって違うか」という問いを立てます。',
    'データは、レシピを適用したかどうか、結果の指標、処置の前から決まっている条件だけを X にして整えます。',
    '観察データで特に重要なのが3番目です。誰が何を見て適用を決めたかを確認します。エンジニアの判断で決まっている場合、その判断材料が記録されていないと、無交絡の前提が崩れます。',
    '推定と検証の後、効果が大きい条件に優先して適用し、逆効果の条件は原因を調べます。可能なら、一部のロットをランダムに割り当てた試験で確かめるのが最も確実です。',
  ].join('\n'));
  const steps = [
    ['問いを決める', '例：新しい補正レシピの効果は、装置・製品・層によって違うか'],
    ['データを整える', '処置（適用の有無）、結果、処置の前から決まっている条件だけを X にする'],
    ['割り当て経緯の確認', '誰が・何を見て適用を決めたか。判断材料を X に入れる'],
    ['推定と検証', '因果フォレストで条件ごとの効果を推定し、群別比較や較正検定で違いを確かめる'],
    ['判断と確認実験', '効く条件に優先適用。逆効果の条件は原因を調査。可能ならランダム割り当ての試験で確認'],
  ];
  const stepW = 2.2;
  const gapX = (CONTENT_W - stepW * 5) / 4;
  const y = 1.7;
  const h = 3.4;
  steps.forEach(([title, desc], i) => {
    const x = MARGIN_X + i * (stepW + gapX);
    const key = i === 2;
    addCard(slide, x, y, stepW, h, { fill: key ? C.treatTint : C.tint });
    addNode(slide, x + stepW / 2, y + 0.55, 0.62, key ? C.treat : C.forest, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.15, y + 1.05, stepW - 0.3, 0.5, { fontSize: 15, bold: true, align: 'center', valign: 'middle' });
    addText(slide, desc, x + 0.2, y + 1.65, stepW - 0.4, 1.8, { fontSize: 13, color: C.ink });
    if (i < steps.length - 1) addLine(slide, x + stepW + 0.03, y + 0.55, x + stepW + gapX - 0.03, y + 0.55, { color: C.forest, width: 1.75, arrow: true });
  });
  addCard(slide, MARGIN_X, 5.55, CONTENT_W, 1.2, { fill: C.gray });
  addText(slide, [
    { text: '注意', bold: true, color: C.treat, breakLine: true },
    { text: 'このスライドは適用の想定例で、実データでの検証は行っていない。適用がエンジニアの判断で決まっている場合、その判断材料が記録されていないと無交絡の前提が崩れる。' },
  ], MARGIN_X + 0.3, 5.55, CONTENT_W - 0.6, 1.2, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 27. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.forestDark };
  addText(slide, 'まとめ', 0.8, 0.6, 6, 0.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle' });
  const points = [
    '因果フォレストは、条件ごとの処置効果 τ(x) を推定するランダムフォレスト',
    '効果の差が大きくなるように分割し、「正直な推定」で偏りを抑える',
    '多数の木を平均し、各点の効果に信頼区間まで付けられる',
    '観察データでは残差化（直交化）で交絡を調整する。ただし無交絡の前提はデータから検証できない',
    '結果は群や方針の単位で使い、別のデータや実験で確かめる',
  ];
  points.forEach((p, i) => {
    const y = 1.75 + i * 0.98;
    addNode(slide, 1.15, y + 0.33, 0.56, C.moss, String(i + 1), { fontSize: 18, color: C.forestDark });
    addText(slide, p, 1.7, y, 7.4, 0.7, { fontSize: 17, color: C.white, valign: 'middle' });
  });
  addTreeMotif(slide, 11.0, 2.2, 0.95, { lineColor: '4F7D63', nodeColor: C.moss, leafColors: [C.treat, C.mossLight, C.control, C.treat] });
  addTreeMotif(slide, 10.2, 4.6, 0.6, { lineColor: '3E6A52', nodeColor: '6E9E66', leafColors: [C.mossLight, C.treat, C.mossLight, C.control] });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '因果フォレストは、ランダムフォレストの仕組みを使って、条件ごとの処置効果を推定する方法です。',
    '効果の差が大きくなるように分割し、分割と推定で別のデータを使う「正直な推定」によって、偏りを抑えます。多数の木を平均することで、各点の効果に信頼区間まで付けられます。',
    '観察データでは、残差化によって交絡を調整しますが、無交絡の前提そのものはデータから検証できないことを忘れないでください。',
    '推定結果は、1件ごとではなく群や方針の単位で使い、別のデータや実験で確かめる、という使い方が基本です。',
  ].join('\n'));
}

// =====================================================================
// 28. 参考文献
// =====================================================================
{
  const slide = newContentSlide('REFERENCES', '参考文献', [
    '本資料で参照した主な文献と、ソフトウェアの公式情報です。',
    '因果フォレストの理論は Wager & Athey (2018)、一般化ランダムフォレストは Athey, Tibshirani & Wager (2019) が中心です。',
    '実データへの応用例としては Athey & Wager (2019) が読みやすく、grf の使い方の流れも分かります。',
  ].join('\n'));
  const refs = [
    'Rubin, D. B. (1974). Estimating causal effects of treatments in randomized and nonrandomized studies. Journal of Educational Psychology, 66(5), 688–701.',
    'Robinson, P. M. (1988). Root-N-consistent semiparametric regression. Econometrica, 56(4), 931–954.',
    'Breiman, L. (2001). Random forests. Machine Learning, 45(1), 5–32.',
    'Hill, J. L. (2011). Bayesian nonparametric modeling for causal inference. Journal of Computational and Graphical Statistics, 20(1), 217–240.',
    'Athey, S., & Imbens, G. (2016). Recursive partitioning for heterogeneous causal effects. PNAS, 113(27), 7353–7360.',
    'Wager, S., & Athey, S. (2018). Estimation and inference of heterogeneous treatment effects using random forests. JASA, 113(523), 1228–1242.',
    'Athey, S., Tibshirani, J., & Wager, S. (2019). Generalized random forests. The Annals of Statistics, 47(2), 1148–1178.',
    'Athey, S., & Wager, S. (2019). Estimating treatment effects with causal forests: An application. Observational Studies, 5, 37–51.',
    'Künzel, S. R., Sekhon, J. S., Bickel, P. J., & Yu, B. (2019). Metalearners for estimating heterogeneous treatment effects using machine learning. PNAS, 116(10), 4156–4165.',
    'Nie, X., & Wager, S. (2021). Quasi-oracle estimation of heterogeneous treatment effects. Biometrika, 108(2), 299–319.',
    'Kennedy, E. H. (2023). Towards optimal doubly robust estimation of heterogeneous causal effects. Electronic Journal of Statistics, 17(2), 3008–3049.',
    'Yadlowsky, S., Fleming, S., Shah, N., Brunskill, E., & Wager, S. (2025). Evaluating treatment prioritization rules via rank-weighted average treatment effects. JASA, 120(549), 38–51.',
  ];
  addBullets(slide, refs, MARGIN_X, 1.55, CONTENT_W, 4.75, { fontSize: 12, space: 6, indent: 14, color: C.ink });
  addText(slide, [
    { text: 'ソフトウェア：', bold: true, color: C.forest },
    { text: 'grf（https://grf-labs.github.io/grf/）、EconML（https://github.com/py-why/EconML）', color: C.ink },
  ], MARGIN_X, 6.4, CONTENT_W, 0.4, { fontSize: 11.5 });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
