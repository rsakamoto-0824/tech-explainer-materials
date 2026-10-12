// 情報量規準（AIC・BIC）と変数選択の解説資料（PowerPoint）を pptxgenjs で生成する。
// 使い方: node build_deck.js <出力パス>
// 前提: demo_results.json（demo_information_criteria.py の出力）と formulas/（render_formulas.py の出力）が同じフォルダにある。

const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const BASE_DIR = __dirname;
const OUTPUT_PATH = process.argv[2] || path.join(BASE_DIR, 'deck_raw.pptx');
const demo = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'demo_results.json'), 'utf8'));
const formulaSizes = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'formulas', 'formulas.json'), 'utf8'));

// ---- 定数 ----
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const FONT = 'BIZ UDGothic';
const CODE_FONT = 'Courier New';
const DECK_DATE = '2026年9月26日';

// AIC は橙、BIC は青緑で全スライドをそろえる
const C = {
  night: '1C1B3A',
  indigo: '2F3470',
  indigoLight: '9EA5E0',
  tint: 'EEEFF7',
  aic: 'D9702A',
  aicTint: 'FCEBDD',
  bic: '1C8584',
  bicTint: 'D8EFEE',
  ink: '1E1C33',
  muted: '5E6275',
  line: 'B9BDD0',
  grid: 'E4E6EF',
  gray: 'F2F3F7',
  neutral: '8A8FA8',
  white: 'FFFFFF',
  onDarkSub: 'CDD0EA',
  motifDark: '34336A',
};

const fmt1 = (v) => v.toFixed(1);
const fmt2 = (v) => v.toFixed(2);
const fmt3 = (v) => v.toFixed(3);
const pct0 = (v) => Math.round(v * 100);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '情報量規準 AIC・BIC と変数選択';
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

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
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

// 数式をカードの中央に置く
function addFormulaCard(slide, key, x, y, w, h, { fill = C.tint, scale = 1, alt = '' } = {}) {
  addCard(slide, x, y, w, h, { fill });
  const size = formulaSize(key, scale);
  addFormula(slide, key, x + (w - size.w) / 2, y + (h - size.h) / 2, { scale, alt });
}

// 点列を自由曲線で描く（xs, ys はデータ座標。range で表示範囲を指定）
function addCurve(slide, box, xs, ys, range, { color = C.ink, width = 2, dash, fill } = {}) {
  const toX = (v) => ((v - range.xMin) / (range.xMax - range.xMin)) * box.w;
  const toY = (v) => box.h - ((v - range.yMin) / (range.yMax - range.yMin)) * box.h;
  const points = xs.map((x, i) => ({ x: toX(x), y: toY(ys[i]) }));
  if (fill) {
    points.push({ x: toX(xs[xs.length - 1]), y: box.h }, { x: toX(xs[0]), y: box.h }, { close: true });
  }
  const line = { color, width };
  if (dash) line.dashType = dash;
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    ...box, points, fill: fill ? { color: fill, transparency: 35 } : { type: 'none' }, line,
  });
  return { toX: (v) => box.x + toX(v), toY: (v) => box.y + toY(v) };
}

// 折れ線を滑らかにする（Catmull-Rom 補間）
function smooth(xs, ys, perSegment = 12) {
  const outX = [];
  const outY = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[Math.max(i - 1, 0)]; const y0 = ys[Math.max(i - 1, 0)];
    const x1 = xs[i]; const y1 = ys[i];
    const x2 = xs[i + 1]; const y2 = ys[i + 1];
    const x3 = xs[Math.min(i + 2, xs.length - 1)]; const y3 = ys[Math.min(i + 2, ys.length - 1)];
    for (let s = 0; s < perSegment; s += 1) {
      const t = s / perSegment;
      const t2 = t * t; const t3 = t2 * t;
      const cr = (p0, p1, p2, p3) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      outX.push(cr(x0, x1, x2, x3));
      outY.push(cr(y0, y1, y2, y3));
    }
  }
  outX.push(xs[xs.length - 1]);
  outY.push(ys[ys.length - 1]);
  return { xs: outX, ys: outY };
}

function addCodeCard(slide, x, y, w, h, title, code, { fontSize = 11 } = {}) {
  addCard(slide, x, y, w, h, { fill: C.night, radius: 0.08 });
  addText(slide, title, x + 0.25, y + 0.15, w - 0.5, 0.35, { fontSize: 13, bold: true, color: C.indigoLight });
  slide.addText(code, {
    x: x + 0.25, y: y + 0.6, w: w - 0.5, h: h - 0.75,
    fontFace: CODE_FONT, fontSize, color: C.white, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP', lineSpacingMultiple: 1.05,
  });
}

// ---- スライド共通 ----

function newContentSlide(kicker, title, notes) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  addText(slide, kicker, MARGIN_X, 0.36, 9, 0.3, { fontSize: 12, bold: true, color: C.indigo, charSpacing: 1 });
  addText(slide, title, MARGIN_X, 0.64, CONTENT_W, 0.72, { fontSize: 28, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (notes) slide.addNotes(notes.join('\n'));
  return slide;
}

function addSource(slide, text) {
  addText(slide, text, MARGIN_X, 7.02, 11.0, 0.3, { fontSize: 9.5, color: C.muted });
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
    catAxisTitleColor: C.muted, valAxisTitleColor: C.muted,
    catAxisTitleFontSize: 11, valAxisTitleFontSize: 11,
    titleColor: C.ink, titleFontSize: 13,
    legendFontSize: 11, legendColor: C.ink,
  };
}

// 組み合わせグラフ用の折れ線 1 系列（線種を系列ごとに指定するため）
function dashedLine(name, labels, values, color, dash, symbolSize) {
  return {
    type: pres.charts.LINE,
    data: [{ name, labels, values }],
    options: { chartColors: [color], lineSize: 2.6, lineDash: dash, lineDataSymbol: 'circle', lineDataSymbolSize: symbolSize },
  };
}

// 番号付きの見出しと説明（カード）
function addNumberedCard(slide, x, y, w, h, num, title, desc, { fill = C.gray, color = C.indigo, descSize = 13 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addNode(slide, x + 0.42, y + 0.42, 0.46, color, String(num), { fontSize: 15 });
  addText(slide, title, x + 0.8, y + 0.17, w - 0.95, 0.5, { fontSize: 15.5, bold: true, valign: 'middle' });
  addText(slide, desc, x + 0.3, y + 0.8, w - 0.55, h - 0.9, { fontSize: descSize });
}

// ---- デモの値 ----
const overfit = demo.overfit;
const optimism = demo.optimism;
const selection = demo.selection;
const prediction = demo.prediction;
const example = demo.example;
const bySize = example.allsubsets.by_size;
const top5 = example.allsubsets.aic_top5;
const importance = example.allsubsets.aic_importance;
const settings = demo.settings;
const selRow = (n) => selection.rows.find((r) => r.n === n);
const optRow = (n, k) => optimism.rows.find((r) => r.n === n && r.k === k);
const overfitRow = (d) => overfit.rows[d];
const minBy = (rows, key) => rows.reduce((a, b) => (b[key] < a[key] ? b : a));

// 表紙・まとめ用の図：変数の数ごとの −2logL（下がり続ける）と AIC・BIC（U字）
function addCriteriaMotif(slide, box, { fitColor, dotColor = C.white, labelColor }) {
  const sizes = bySize.map((b) => b.size);
  const fit = bySize.map((b) => -2 * b.loglik);
  const aic = bySize.map((b) => b.aic);
  const bic = bySize.map((b) => b.bic);
  const range = { xMin: 0, xMax: 8, yMin: Math.min(...fit) - 10, yMax: Math.max(...bic) + 5 };
  const sFit = smooth(sizes, fit);
  const sAic = smooth(sizes, aic);
  const sBic = smooth(sizes, bic);
  addCurve(slide, box, sFit.xs, sFit.ys, range, { color: fitColor, width: 1.75, dash: 'dash' });
  addCurve(slide, box, sAic.xs, sAic.ys, range, { color: C.aic, width: 3 });
  const map = addCurve(slide, box, sBic.xs, sBic.ys, range, { color: C.bic, width: 3 });
  const aicMin = minBy(bySize, 'aic');
  const bicMin = minBy(bySize, 'bic');
  addNode(slide, map.toX(aicMin.size), map.toY(aicMin.aic), 0.2, C.aic, '', { lineColor: dotColor });
  addNode(slide, map.toX(bicMin.size), map.toY(bicMin.bic), 0.2, C.bic, '', { lineColor: dotColor });
  if (labelColor) {
    addText(slide, 'BIC', box.x + box.w + 0.08, map.toY(bic[8]) - 0.15, 0.6, 0.3, { fontSize: 12, bold: true, color: C.bic, valign: 'middle' });
    addText(slide, 'AIC', box.x + box.w + 0.08, map.toY(aic[8]) - 0.2, 0.6, 0.3, { fontSize: 12, bold: true, color: C.aic, valign: 'middle' });
    addText(slide, '−2logL', box.x + box.w + 0.08, map.toY(fit[8]) + 0.02, 0.8, 0.3, { fontSize: 11, color: labelColor, valign: 'middle' });
  }
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, '統計モデリング × 変数選択', 0.8, 1.35, 7, 0.4, { fontSize: 15, bold: true, color: C.indigoLight, charSpacing: 2 });
  addText(slide, withBreaks(['情報量規準 AIC・BIC と', '変数選択']), 0.8, 1.85, 7.8, 1.7, { fontSize: 42, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, '「当てはまり」と「複雑さ」をどう天びんにかけるか', 0.8, 3.75, 7.4, 0.5, { fontSize: 20, color: C.onDarkSub });
  addText(slide, '理論（KL情報量・ラプラス近似）から、変数選択での使い方と注意点まで、シミュレーションとともに解説', 0.8, 4.45, 7.0, 0.8, { fontSize: 14, color: C.indigoLight });
  addText(slide, DECK_DATE, 0.8, 6.45, 4, 0.35, { fontSize: 13, color: C.onDarkSub });
  addCriteriaMotif(slide, { x: 8.5, y: 1.6, w: 3.7, h: 3.6 }, { fitColor: C.indigoLight, labelColor: C.onDarkSub });
  addText(slide, '変数の数（0〜8）', 8.5, 5.3, 3.7, 0.3, { fontSize: 11, color: C.onDarkSub, align: 'center' });
  addText(slide, '当てはまり（−2logL）は下がり続けるが、罰則を足すと最小点が現れる', 8.4, 5.7, 4.5, 0.6, { fontSize: 12, color: C.onDarkSub, align: 'center' });
  slide.addNotes([
    'この資料では、赤池情報量規準AICと、ベイズ情報量規準BICを、理論から実際の使い方まで解説します。',
    'どちらも、統計モデルの当てはまりの良さと、モデルの複雑さのバランスを数値で評価するための指標です。',
    '重回帰分析でどの説明変数を使うかを決める、いわゆる変数選択で特によく使われます。',
    '右の図は、後で使う合成データの例です。変数を増やすほど当てはまりの指標は下がり続けますが、罰則を足したAICとBICには最小点が現れます。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で分かること
// =====================================================================
{
  const slide = newContentSlide('INTRODUCTION', 'この資料で分かること', [
    '全体は6つのパートです。',
    'まず、なぜモデル選択が必要なのか、情報量規準がどんな形をしているのかを確認します。',
    '次に、AICとBICをそれぞれ理論から導きます。AICはカルバック・ライブラー情報量、BICはベイズの事後確率が出発点です。',
    'そのあと、2つの違いをシミュレーションで比べ、変数選択での具体的な使い方を説明します。',
    '最後に、実務でよくある落とし穴と、使い分けの目安、コード例をまとめます。',
  ]);
  const items = [
    ['モデル選択の基本', '過学習と、「当てはまり＋罰則」という共通の形'],
    ['AIC（赤池情報量規準）', 'KL情報量と、最大対数尤度の偏りの補正'],
    ['BIC（ベイズ情報量規準）', 'モデルの事後確率と、ラプラス近似'],
    ['AIC と BIC の比較', '罰則の強さ・目的・性質の違いをデモで確認'],
    ['変数選択への利用', '全組み合わせ・ステップワイズ・Lasso との組み合わせ'],
    ['注意点と使い分け', 'よくある落とし穴、選び方の目安、コード例'],
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
  addText(slide, '想定する読者：平均・分散・正規分布・回帰分析・最尤推定の基本を知っている人。数式の導出は「流れ」が分かる粒度で示します。',
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 3. なぜモデル選択が必要か
// =====================================================================
{
  const best = overfit.best_degree;
  const d0 = overfitRow(0);
  const dMax = overfitRow(overfit.rows.length - 1);
  const dBest = overfitRow(best.test_rmse);
  const slide = newContentSlide('1  モデル選択の基本', '複雑なモデルほど「手元のデータには」よく合う', [
    'まず、なぜモデル選択が必要なのかを、多項式回帰の例で見ます。',
    `データは30点で、真の関数はサイン波に直線を足したもの、誤差の標準偏差は${overfit.noise_sd}です。`,
    `次数を0から12まで上げていくと、学習に使ったデータでの誤差、グレーの線は${fmt2(d0.train_rmse)}から${fmt2(dMax.train_rmse)}まで下がり続けます。`,
    `しかし、新しいデータでの誤差、紫の線は${best.test_rmse}次で最小の${fmt3(dBest.test_rmse)}になり、そのあとは悪くなります。12次では${fmt2(dMax.test_rmse)}です。`,
    'つまり、手元のデータへの当てはまりだけでモデルを選ぶと、必ず一番複雑なモデルが選ばれてしまいます。これを過学習と呼びます。',
    '知りたいのは新しいデータへの当てはまりなので、それを手元のデータから見積もる方法が必要です。その代表が、情報量規準と交差検証です。',
  ]);
  const labels = overfit.rows.map((r) => String(r.degree));
  slide.addChart(pres.charts.LINE, [
    { name: '学習データでの誤差', labels, values: overfit.rows.map((r) => r.train_rmse) },
    { name: '新しいデータでの誤差', labels, values: overfit.rows.map((r) => r.test_rmse) },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.5, h: 5.3, ...chartBase(),
    chartColors: [C.neutral, C.indigo], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
    showTitle: true, title: '多項式の次数と誤差（RMSE、学習データ30点）',
    showCatAxisTitle: true, catAxisTitle: '多項式の次数', showValAxisTitle: true, valAxisTitle: 'RMSE',
    valAxisMinVal: 0, valAxisMaxVal: 0.8, valAxisMajorUnit: 0.2, valAxisLabelFormatCode: '0.0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.5;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    `学習データでの誤差は次数とともに下がり続ける（${fmt2(d0.train_rmse)} → ${fmt2(dMax.train_rmse)}）`,
    `新しいデータでの誤差は ${best.test_rmse} 次で最小（${fmt3(dBest.test_rmse)}）、その後は悪化`,
    '手元のデータへの当てはまりだけで選ぶと、最も複雑なモデルが選ばれる（過学習）',
  ], rx, 1.7, rw, 3.0, { fontSize: 15, space: 12 });
  addCard(slide, rx, 4.75, rw, 1.95, { fill: C.tint });
  addText(slide, '必要なもの', rx + 0.25, 4.9, rw - 0.5, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  addText(slide, '「新しいデータへの当てはまり」を手元のデータから見積もる方法。代表が情報量規準（AIC・BIC）と交差検証',
    rx + 0.25, 5.3, rw - 0.5, 1.3, { fontSize: 14 });
  addSource(slide, `合成データ：y = sin(2πx) + 0.5x + 誤差（標準偏差 ${overfit.noise_sd}）、学習 ${overfit.n_train} 点・評価 2000 点`);
}

// =====================================================================
// 4. 情報量規準の共通の形
// =====================================================================
{
  const slide = newContentSlide('1  モデル選択の基本', '情報量規準は「当てはまりの悪さ ＋ 複雑さの罰則」', [
    '情報量規準は、どれも同じ形をしています。',
    '1つ目の項はマイナス2かける最大対数尤度で、当てはまりの悪さを表します。よく当てはまるほど小さくなります。',
    '2つ目の項は罰則で、推定するパラメータの数kと、データ数nで決まります。複雑なモデルほど大きくなります。',
    '2つの項の合計が最も小さいモデルを選びます。',
    '規準ごとの違いは罰則の形だけです。AICは2k、BICはk log n です。小さい標本用のAICc、罰則がAICとBICの中間のHQCもあります。',
    'なぜこの罰則になるのかは、AICとBICで出発点が全く違います。それをこのあと順に説明します。',
  ]);
  const formula = formulaSize('ic_general');
  addFormulaCard(slide, 'ic_general', MARGIN_X, 1.55, CONTENT_W, formula.h + 0.5, { alt: 'IC = -2 log L(θ̂) + penalty(k, n)' });
  const by = 1.55 + formula.h + 0.75;
  const bw = 5.6;
  const bh = 1.55;
  addCard(slide, MARGIN_X, by, bw, bh, { fill: C.gray });
  addText(slide, '当てはまりの悪さ：−2 log L', MARGIN_X + 0.3, by + 0.18, bw - 0.6, 0.4, { fontSize: 16, bold: true, color: C.indigo });
  addText(slide, 'L は最大尤度。データによく合うほど小さい。パラメータを増やすと（入れ子のモデルでは）必ず小さくなる',
    MARGIN_X + 0.3, by + 0.65, bw - 0.6, 0.85, { fontSize: 13.5 });
  addText(slide, '＋', MARGIN_X + bw, by, CONTENT_W - 2 * bw, bh, { fontSize: 32, bold: true, color: C.muted, align: 'center', valign: 'middle' });
  const rx2 = SLIDE_W - MARGIN_X - bw;
  addCard(slide, rx2, by, bw, bh, { fill: C.gray });
  addText(slide, '複雑さの罰則：penalty(k, n)', rx2 + 0.3, by + 0.18, bw - 0.6, 0.4, { fontSize: 16, bold: true, color: C.indigo });
  addText(slide, 'k は推定するパラメータの数、n はデータ数。パラメータが多いほど大きい。合計が最小のモデルを選ぶ',
    rx2 + 0.3, by + 0.65, bw - 0.6, 0.85, { fontSize: 13.5 });

  const ty = by + bh + 0.35;
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.indigo } } });
  const rows = [
    [{ t: 'AIC', c: C.aic }, '2k', '赤池（1973, 1974）', '予測のよさ（KL情報量）'],
    [{ t: 'AICc', c: C.aic }, '2k ＋ 2k(k＋1)/(n−k−1)', 'Sugiura（1978）、Hurvich & Tsai（1989）', 'AIC の小標本補正'],
    [{ t: 'BIC', c: C.bic }, 'k log n', 'Schwarz（1978）', 'モデルの事後確率'],
    [{ t: 'HQC', c: C.muted }, '2k log(log n)', 'Hannan & Quinn（1979）', 'AIC と BIC の中間'],
  ];
  slide.addTable([
    ['規準', '罰則', '提案', '考え方'].map(head),
    ...rows.map((r) => [
      { text: r[0].t, options: { bold: true, color: r[0].c } },
      { text: r[1] }, { text: r[2] }, { text: r[3] },
    ]),
  ], {
    x: MARGIN_X, y: ty, w: CONTENT_W, colW: [1.5, 3.4, 4.1, 3.133],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.4,
  });
}

// =====================================================================
// 5. 尤度と最大対数尤度の復習
// =====================================================================
{
  const fit = bySize.map((b) => -2 * b.loglik);
  const slide = newContentSlide('1  モデル選択の基本', '復習：最大対数尤度と、パラメータ数 k の数え方', [
    '情報量規準の1つ目の項に出てくる最大対数尤度を復習します。',
    '尤度は、パラメータを決めたときに、手元のデータが得られる確率の大きさです。これを最大にするパラメータが最尤推定値で、そのときの対数尤度が最大対数尤度です。',
    '誤差が正規分布に従う線形回帰では、マイナス2かける最大対数尤度は、nかける残差平方和をnで割った値の対数に、定数を足したものになります。',
    'パラメータ数kには、切片と各係数に加えて、誤差の分散も数えます。ただし、ソフトによって分散を数えないものがあり、後で注意点として取り上げます。',
    `右のグラフは、後で使う合成データで、変数の数ごとに最もよく当てはまるモデルの値を示したものです。変数を増やすと、${fmt1(fit[0])}から${fmt1(fit[8])}まで必ず下がります。`,
    'このため、当てはまりだけでは変数を増やすほど良く見えてしまい、罰則が必要になります。',
  ]);
  const lw = 6.3;
  addText(slide, '最大対数尤度', MARGIN_X, 1.6, lw, 0.4, { fontSize: 16, bold: true, color: C.indigo });
  const f1 = formulaSize('loglik_def');
  addFormula(slide, 'loglik_def', MARGIN_X + 0.2, 2.05, { alt: 'log L(θ̂) = max Σ log f(y_i | θ)' });
  addText(slide, '誤差が正規分布の線形回帰では', MARGIN_X, 2.05 + f1.h + 0.2, lw, 0.4, { fontSize: 16, bold: true, color: C.indigo });
  const f2y = 2.05 + f1.h + 0.65;
  const f2 = formulaSize('loglik_normal');
  addFormula(slide, 'loglik_normal', MARGIN_X + 0.2, f2y, { scale: 0.95, alt: '-2 log L = n log(RSS/n) + n(1 + log 2π)' });
  addBullets(slide, [
    'RSS：残差平方和。第2項はモデルによらない定数',
    'k ＝ 切片 ＋ 係数の数 ＋ 1（誤差の分散）',
    '変数を加えると RSS は増えない → −2logL は必ず下がる',
  ], MARGIN_X, f2y + f2.h + 0.3, lw, 1.5, { fontSize: 14.5, space: 9 });
  addCard(slide, MARGIN_X, 5.7, lw, 1.0, { fill: C.tint });
  addText(slide, '当てはまりだけで比べると、変数を増やすほど良く見える → 複雑さの罰則が必要',
    MARGIN_X + 0.25, 5.7, lw - 0.5, 1.0, { fontSize: 14, bold: true, color: C.indigo, valign: 'middle' });

  const labels = bySize.map((b) => String(b.size));
  slide.addChart(pres.charts.BAR, [{ name: '−2logL', labels, values: fit }], {
    x: 7.2, y: 1.55, w: SLIDE_W - MARGIN_X - 7.2, h: 5.2, ...chartBase(), barDir: 'col',
    chartColors: [C.indigo], barGapWidthPct: 45,
    showTitle: true, title: '変数の数ごとの最良モデルの −2logL（n=100）',
    showCatAxisTitle: true, catAxisTitle: 'モデルに入れた変数の数', showValAxisTitle: false,
    valAxisMinVal: 250, valAxisMaxVal: 450, valAxisMajorUnit: 50, valAxisLabelFormatCode: '0',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0', dataLabelFontSize: 10, dataLabelColor: C.ink,
    showLegend: false,
  });
}

// =====================================================================
// 6. KL情報量
// =====================================================================
{
  const slide = newContentSlide('2  AIC（赤池情報量規準）', 'AIC の出発点：真の分布との「近さ」を KL 情報量で測る', [
    'ここからAICの理論です。赤池先生の出発点は、モデルの良さを、真の分布との近さで測ることでした。',
    'データを生み出している真の分布をg、モデルの分布をfとします。gとfの近さを測る代表的な量が、カルバック・ライブラー情報量、KL情報量です。',
    'KL情報量は0以上で、2つの分布が一致するときだけ0になります。小さいほどモデルが真の分布に近いことを意味します。',
    '式の第1項は真の分布だけで決まるので、どのモデルでも同じです。したがって、KL情報量を小さくすることは、第2項、期待対数尤度を大きくすることと同じです。',
    '期待対数尤度は、真の分布から新しく取ったデータに対する、モデルの対数尤度の平均です。つまり、AICは新しいデータへの予測の良さを目指す規準です。',
    'ただし真の分布は分からないので、手元のデータで見積もる必要があります。ここに落とし穴があり、次のスライドで説明します。',
  ]);
  // 左：真の分布とモデルの分布の図
  const box = { x: MARGIN_X + 0.2, y: 1.75, w: 5.4, h: 2.8 };
  const xs = [];
  for (let i = 0; i <= 120; i += 1) xs.push(i / 10);
  // 真の分布：右に裾の長いガンマ分布（形状3・尺度1）
  const gamma = (x) => (x <= 0 ? 0 : (x * x * Math.exp(-x)) / 2);
  const normal = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const range = { xMin: 0, xMax: 12, yMin: 0, yMax: 0.36 };
  addCurve(slide, box, xs, xs.map(gamma), range, { color: C.ink, width: 2.5, fill: C.grid });
  addCurve(slide, box, xs, xs.map((x) => normal(x, 3, 1.73)), range, { color: C.aic, width: 2.5 });
  addCurve(slide, box, xs, xs.map((x) => normal(x, 5, 1.2)), range, { color: C.neutral, width: 2, dash: 'dash' });
  addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: C.line, width: 1 });
  const legend = [['真の分布 g（未知）', C.ink, null], ['モデル f_{1}：近い', C.aic, null], ['モデル f_{2}：遠い', C.neutral, 'dash']];
  legend.forEach(([label, color, dash], i) => {
    const lx = MARGIN_X + 0.2 + i * 2.0;
    addLine(slide, lx, 4.83, lx + 0.35, 4.83, { color, width: 2.5, dash });
    addText(slide, label, lx + 0.43, 4.68, 1.7, 0.3, { fontSize: 11.5, bold: true, color, valign: 'middle' });
  });
  addBullets(slide, [
    'KL 情報量は 0 以上。g と f が一致するときだけ 0',
    '小さいほど、モデルが真の分布に近い',
  ], MARGIN_X, 5.3, 5.8, 1.2, { fontSize: 14, space: 6 });

  // 右：式の流れ
  const rx = 6.95;
  const rw = SLIDE_W - MARGIN_X - rx;
  const fkl = formulaSize('kl', 0.95);
  addFormulaCard(slide, 'kl', rx, 1.6, rw, fkl.h + 0.4, { scale: 0.95, alt: 'D_KL(g||f) = E_g[log g(Z)] - E_g[log f(Z|θ)]' });
  addText(slide, '第1項はモデルによらず一定。したがって', rx, 1.6 + fkl.h + 0.55, rw, 0.35, { fontSize: 14 });
  addText(slide, 'KL 情報量が最小 ⇔ 期待対数尤度が最大', rx, 1.6 + fkl.h + 0.95, rw, 0.4, { fontSize: 17, bold: true, color: C.aic });
  const ey = 1.6 + fkl.h + 1.5;
  const fe = formulaSize('expected_ll');
  addCard(slide, rx, ey, rw, fe.h + 0.9, { fill: C.aicTint });
  addFormula(slide, 'expected_ll', rx + 0.3, ey + 0.2, { alt: 'E_g[log f(Z|θ̂)]' });
  addText(slide, '＝ 真の分布から新しく取ったデータ Z に対する、推定したモデルの対数尤度の平均（予測のよさ）',
    rx + 0.3, ey + 0.3 + fe.h, rw - 0.6, 0.6, { fontSize: 13 });
  addCard(slide, rx, 5.55, rw, 1.1, { fill: C.gray });
  addText(slide, [
    { text: '問題：', bold: true, color: C.indigo },
    { text: 'g は未知なので手元のデータで見積もるしかない。単純に最大対数尤度 log L で代用すると、偏り（バイアス）が生じる' },
  ], rx + 0.3, 5.55, rw - 0.6, 1.1, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 7. 最大対数尤度の偏り
// =====================================================================
{
  const ks = [2, 4, 6, 8, 10];
  const labels = ks.map((k) => `k=${k}`);
  const slide = newContentSlide('2  AIC（赤池情報量規準）', '最大対数尤度は「楽観的」：偏りはおよそ k', [
    '期待対数尤度を、手元のデータの最大対数尤度で見積もると、何が起きるかを確かめます。',
    'パラメータは、手元のデータに最もよく合うように決めています。そのため、同じデータで当てはまりを評価すると、新しいデータで評価したときより良く見えます。この差を偏り、バイアスと呼びます。',
    `シミュレーションで偏りを測りました。正規分布の線形回帰を${optimism.reps}回くり返し、パラメータ数kを2から10まで変えています。`,
    `データ数が100のとき、橙の棒は、kが2のとき${fmt1(optRow(100, 2).simulated)}、10のとき${fmt1(optRow(100, 10).simulated)}で、偏りはほぼパラメータ数kに等しくなります。`,
    `一方、データ数が20と少ないときは、kが10で${fmt1(optRow(20, 10).simulated)}と、kよりかなり大きくなります。これが後で説明するAICcの必要性につながります。`,
    'つまり、最大対数尤度からkを引けば、期待対数尤度の偏りのない見積もりになります。これにマイナス2をかけたものがAICです。',
  ]);
  slide.addChart([
    {
      type: pres.charts.BAR,
      data: [
        { name: 'シミュレーション（n=100）', labels, values: ks.map((k) => optRow(100, k).simulated) },
        { name: 'シミュレーション（n=20）', labels, values: ks.map((k) => optRow(20, k).simulated) },
      ],
      options: { barGrouping: 'clustered', chartColors: [C.aic, C.neutral], barGapWidthPct: 60 },
    },
    {
      type: pres.charts.LINE,
      data: [{ name: 'パラメータ数 k（AIC の補正量）', labels, values: ks }],
      options: { chartColors: [C.ink], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 7 },
    },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.4, h: 5.3, ...chartBase(), barDir: 'col',
    showTitle: true, title: '最大対数尤度の偏り b（4000回の平均）',
    valAxisMinVal: 0, valAxisMaxVal: 25, valAxisMajorUnit: 5, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '偏りの定義', rx, 1.6, rw, 0.35, { fontSize: 15, bold: true, color: C.indigo });
  const fb = formulaSize('bias_def', 0.95);
  addFormula(slide, 'bias_def', rx, 2.0, { scale: 0.95, alt: 'b = E[log L(θ̂; y) - n E_Z log f(Z|θ̂)]' });
  addText(slide, '手元のデータでの当てはまり − 新しいデータでの当てはまり', rx, 2.1 + fb.h, rw, 0.6, { fontSize: 12.5, color: C.muted });
  addBullets(slide, [
    `n=100：偏り ≈ k（k=10 で ${fmt1(optRow(100, 10).simulated)}）`,
    `n=20：k より大きい（k=10 で ${fmt1(optRow(20, 10).simulated)}）→ 小標本では AICc`,
    'log L − k が、期待対数尤度の偏りのない見積もりになる',
  ], rx, 3.05, rw, 2.3, { fontSize: 14.5, space: 10 });
  addCard(slide, rx, 5.45, rw, 1.25, { fill: C.aicTint });
  addText(slide, [
    { text: 'AIC ＝ −2 ×（log L − k）', bold: true, color: C.aic, breakLine: true },
    { text: '「楽観的な分」を差し引いた当てはまり', fontSize: 13 },
  ], rx + 0.3, 5.45, rw - 0.6, 1.25, { fontSize: 16, valign: 'middle', paraSpaceAfter: 4 });
  addSource(slide, '設定：正規線形回帰（誤差分散1）、k ＝ 係数の数（切片含む）＋ 誤差分散。新しいデータでの期待対数尤度は真の分布から解析的に計算');
}

// =====================================================================
// 8. AICの導出（概略）
// =====================================================================
{
  const slide = newContentSlide('2  AIC（赤池情報量規準）', 'AIC の導出（概略）：偏りを 3 つに分けて評価する', [
    'なぜ偏りがkになるのかを、導出の流れで説明します。',
    'KL情報量の意味で最も良いパラメータをシータスターとします。偏りを、シータスターを経由して3つの部分に分けます。',
    '1つ目は、手元のデータ上で、最尤推定値とシータスターの対数尤度の差です。最尤推定値のまわりで2次近似すると、期待値はトレースIJ逆行列の半分になります。',
    '2つ目は、シータスターという固定したパラメータでの、手元のデータと新しいデータの差です。どちらも同じ分布からのデータなので、期待値は0です。',
    '3つ目は、新しいデータ上で、シータスターと最尤推定値の差です。推定値がずれている分だけ新しいデータでは損をし、これも期待値はトレースIJ逆行列の半分です。',
    '合計すると偏りはトレースIJ逆行列です。Jは対数尤度の2階微分、Iは1階微分の積の期待値で、モデルが正しければIとJは等しくなり、トレースは単位行列のトレース、つまりkになります。',
    'モデルが正しいと仮定しない場合は、トレースを推定して使うTIC、竹内情報量規準があります。ただし推定が不安定なので、実務ではAICが使われることが多いです。',
  ]);
  const fd = formulaSize('bias_decomp', 0.95);
  addFormulaCard(slide, 'bias_decomp', MARGIN_X, 1.5, CONTENT_W, fd.h + 0.35, { scale: 0.95, alt: 'b = b1 + b2 + b3 ≈ tr(IJ^-1)/2 + 0 + tr(IJ^-1)/2 = tr(IJ^-1)' });
  const cy = 1.5 + fd.h + 0.55;
  const cw = (CONTENT_W - 0.5) / 3;
  const ch = 2.2;
  const cards = [
    ['b_{1}：手元のデータ上', '最尤推定値と θ* の対数尤度の差。推定値のまわりで 2 次近似すると期待値は ½ tr(IJ⁻¹)。推定値はデータに合わせすぎている'],
    ['b_{2}：θ* を固定', 'θ* は固定の値なので、手元のデータと新しいデータの対数尤度の差は、期待値が 0'],
    ['b_{3}：新しいデータ上', '推定値が θ* からずれている分、新しいデータでは当てはまりが落ちる。期待値は ½ tr(IJ⁻¹)'],
  ];
  cards.forEach(([title, desc], i) => {
    addNumberedCard(slide, MARGIN_X + i * (cw + 0.25), cy, cw, ch, i + 1, title, desc, { fill: C.gray, color: C.aic, descSize: 14 });
  });
  addText(slide, 'θ*：KL 情報量を最小にするパラメータ（データが無限にあるときの最尤推定値）', MARGIN_X, cy + ch + 0.12, CONTENT_W, 0.3, { fontSize: 12, color: C.muted });
  const by = cy + ch + 0.55;
  const fij = formulaSize('ij_def', 0.9);
  addFormula(slide, 'ij_def', MARGIN_X + 0.1, by, { scale: 0.9, alt: 'J = -E[∂²log f], I = E[∂log f ∂log f^T]' });
  const bx = MARGIN_X + fij.w + 0.6;
  addCard(slide, bx, by - 0.05, SLIDE_W - MARGIN_X - bx, fij.h + 0.1, { fill: C.aicTint });
  const fk = formulaSize('bias_k', 0.9);
  addFormula(slide, 'bias_k', bx + 0.25, by - 0.05 + (fij.h + 0.1 - fk.h) / 2, { scale: 0.9, alt: 'I = J => b = tr(I_k) = k' });
  addText(slide, 'モデルが正しければ偏りは k。正しいと仮定しない版が TIC（竹内, 1976）', bx + 0.35 + fk.w, by - 0.05, SLIDE_W - MARGIN_X - bx - fk.w - 0.5, fij.h + 0.1, { fontSize: 13, valign: 'middle' });
  addSource(slide, '導出の詳細：小西・北川（2004）『情報量規準』、Burnham & Anderson（2002）7章');
}

// =====================================================================
// 9. AICの定義と読み方
// =====================================================================
{
  const slide = newContentSlide('2  AIC（赤池情報量規準）', 'AIC の定義と読み方', [
    'AICの定義は、マイナス2かける最大対数尤度に、2kを足したものです。1973年に赤池弘次先生が提案しました。',
    'マイナス2をかけるのは、歴史的に尤度比検定のカイ二乗統計量と単位をそろえるためです。値が小さいほど良いモデルです。',
    '読み方の注意が3つあります。AICの値そのものには意味がなく、同じデータで比べたモデル間の差だけに意味があります。',
    'Burnham と Anderson の目安では、最小のモデルとの差デルタが2以下なら、そのモデルも十分に支持されます。4から7ならかなり弱く、10を超えればほぼ支持されません。',
    'さらに、デルタから赤池重みを計算できます。候補の中でそのモデルが最も良いモデルである確からしさ、と解釈され、複数のモデルを重み付き平均するモデル平均化にも使います。',
  ]);
  const lw = 5.5;
  addCard(slide, MARGIN_X, 1.55, lw, 2.0, { fill: C.aic });
  const fa = formulaSize('aic_white');
  addFormula(slide, 'aic_white', MARGIN_X + (lw - fa.w) / 2, 1.8, { alt: 'AIC = -2 log L(θ̂) + 2k' });
  addText(slide, 'Akaike Information Criterion（赤池, 1973）', MARGIN_X, 1.9 + fa.h + 0.15, lw, 0.4, { fontSize: 13, color: C.white, align: 'center' });
  addBullets(slide, [
    '小さいほど良い。値そのものではなく、同じデータで比べた「差」だけに意味がある',
    '−2 倍は、尤度比検定のカイ二乗統計量と単位をそろえるため',
    '目指すのは「新しいデータへの予測のよさ」',
  ], MARGIN_X, 3.85, lw, 2.8, { fontSize: 14.5, space: 10 });

  const rx = 6.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '最小のモデルとの差 Δ の目安', rx, 1.55, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.aic } } });
  slide.addTable([
    [head('Δ = AIC − AIC最小'), head('そのモデルへの支持')],
    [{ text: '0 〜 2', options: { bold: true } }, { text: '十分にある（最良と区別しにくい）' }],
    [{ text: '4 〜 7', options: { bold: true } }, { text: 'かなり弱い' }],
    [{ text: '10 超', options: { bold: true } }, { text: 'ほぼない' }],
  ], {
    x: rx, y: 2.0, w: rw, colW: [2.3, rw - 2.3],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.42, fill: { color: C.white },
  });
  addText(slide, '赤池重み（Akaike weight）', rx, 4.0, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const fw = formulaSize('akaike_weight', 0.95);
  addFormulaCard(slide, 'akaike_weight', rx, 4.45, rw, fw.h + 0.3, { fill: C.aicTint, scale: 0.95, alt: 'w_i = exp(-Δ_i/2) / Σ exp(-Δ_j/2)' });
  addText(slide, '候補の中で「そのモデルが最良」である相対的な確からしさ。モデル平均化や変数の重要度に使う',
    rx, 4.6 + fw.h + 0.3, rw, 0.7, { fontSize: 13 });
  addSource(slide, '目安：Burnham & Anderson（2002）Model Selection and Multimodel Inference, p.70');
}

// =====================================================================
// 10. AICc
// =====================================================================
{
  const best = overfit.best_degree;
  const slide = newContentSlide('2  AIC（赤池情報量規準）', '小標本では AICc：AIC は複雑なモデルを選びすぎる', [
    'AICの導出は、データ数nが大きいことを前提にしています。nに比べてパラメータ数kが大きいと、偏りの補正が足りず、AICは複雑なモデルを選びすぎます。',
    'そのための補正がAICcです。AICに、2kかけるk足す1を、n引くk引く1で割った項を足します。正規線形回帰では、この補正で偏りが正確に補正されます。',
    `先ほどのシミュレーションでも、n=20、k=10の偏り${fmt1(optRow(20, 10).simulated)}は、AICcの理論値${fmt1(optRow(20, 10).aicc_theory)}とほぼ一致しました。`,
    `右のグラフは、最初に見た多項式回帰、データ30点の例です。AICは${best.aic}次を選んでしまいますが、AICcとBICは${best.aicc}次を選びます。新しいデータで最も良かったのは${best.test_rmse}次でした。`,
    'Burnham と Anderson は、nをkで割った値が40より小さいときはAICcを使うよう勧めています。nが大きければAICcはAICに一致するので、迷ったら常にAICcを使ってもかまいません。',
  ]);
  const lw = 5.3;
  const fc = formulaSize('aicc');
  addFormulaCard(slide, 'aicc', MARGIN_X, 1.55, lw, fc.h + 0.4, { fill: C.aicTint, alt: 'AICc = AIC + 2k(k+1)/(n-k-1)' });
  addBullets(slide, [
    'n に比べて k が大きいと、2k の補正では足りない',
    '正規線形回帰では、偏り n·k/(n−k−1) を正確に補正する形',
    `シミュレーション（n=20, k=10）：偏り ${fmt1(optRow(20, 10).simulated)}、理論値 ${fmt1(optRow(20, 10).aicc_theory)}`,
    'n が大きいと AIC に一致する',
  ], MARGIN_X, 1.55 + fc.h + 0.65, lw, 2.8, { fontSize: 14, space: 9 });
  addCard(slide, MARGIN_X, 5.75, lw, 0.95, { fill: C.gray });
  addText(slide, [{ text: '目安：', bold: true, color: C.indigo }, { text: 'n / k < 40 なら AICc を使う（Burnham & Anderson）' }],
    MARGIN_X + 0.25, 5.75, lw - 0.5, 0.95, { fontSize: 14, valign: 'middle' });

  const labels = overfit.rows.map((r) => String(r.degree));
  const cx = 6.25;
  // 線種は系列ごとに別の折れ線として重ねて指定する（lineDash に配列を渡すと不正な値が書き出され、PowerPoint が修復対象にする）
  slide.addChart([
    dashedLine('AIC', labels, overfit.rows.map((r) => r.aic), C.aic, 'solid', 6),
    dashedLine('AICc', labels, overfit.rows.map((r) => r.aicc), '8E3B0E', 'dash', 6),
    dashedLine('BIC', labels, overfit.rows.map((r) => r.bic), C.bic, 'solid', 6),
  ], {
    x: cx, y: 1.55, w: SLIDE_W - MARGIN_X - cx, h: 4.45, ...chartBase(),
    showTitle: true, title: '多項式回帰（n=30）での各規準の値',
    showCatAxisTitle: true, catAxisTitle: '多項式の次数',
    valAxisMinVal: 10, valAxisMaxVal: 70, valAxisMajorUnit: 10, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
  const chips = [
    [`AIC → ${best.aic} 次`, C.aic], [`AICc → ${best.aicc} 次`, '8E3B0E'], [`BIC → ${best.bic} 次`, C.bic], [`新しいデータで最良 → ${best.test_rmse} 次`, C.indigo],
  ];
  const chipW = (SLIDE_W - MARGIN_X - cx - 0.3) / 4;
  chips.forEach(([t, color], i) => {
    const x = cx + i * (chipW + 0.1);
    addCard(slide, x, 6.15, chipW, 0.55, { fill: color, radius: 0.08 });
    addText(slide, t, x + 0.05, 6.15, chipW - 0.1, 0.55, { fontSize: i === 3 ? 11 : 12.5, bold: true, color: C.white, align: 'center', valign: 'middle' });
  });
}

// =====================================================================
// 11. BICの出発点
// =====================================================================
{
  const slide = newContentSlide('3  BIC（ベイズ情報量規準）', 'BIC の出発点：データから見た「モデルの事後確率」', [
    'ここからBICです。BICは、ベイズの考え方でモデルを選ぶところから出発します。',
    '候補のモデルごとに事前確率を置き、データを見たあとのモデルの事後確率を、ベイズの定理で計算します。事後確率が最大のモデルを選ぶ、というのが基本方針です。',
    '事前確率がどのモデルも同じなら、比べるのは周辺尤度、モデルのエビデンスとも呼ばれる量です。これは、パラメータの事前分布で尤度を平均したものです。',
    '周辺尤度には、自動的に複雑さへの罰則が含まれています。右の図のように、複雑なモデルは色々なデータを説明できる代わりに、確率を広く薄くばらまきます。',
    '単純すぎるモデルは観測データを説明できず、複雑すぎるモデルは確率が薄まるので、ちょうどよいモデルの周辺尤度が最大になります。これをベイズのオッカムの剃刀と呼びます。',
    '問題は、この積分が一般には計算できないことです。そこで、nが大きいときの近似を使います。',
  ]);
  const lw = 6.0;
  addText(slide, 'モデルの事後確率（ベイズの定理）', MARGIN_X, 1.6, lw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const fp = formulaSize('bayes_post', 0.95);
  addFormula(slide, 'bayes_post', MARGIN_X + 0.2, 2.05, { scale: 0.95, alt: 'P(M_i|y) = p(y|M_i)P(M_i) / Σ p(y|M_j)P(M_j)' });
  addText(slide, '事前確率 P(M) が等しければ、周辺尤度（エビデンス）の比較になる', MARGIN_X, 2.15 + fp.h, lw, 0.4, { fontSize: 13.5 });
  const fe = formulaSize('evidence', 0.95);
  addFormulaCard(slide, 'evidence', MARGIN_X, 2.75 + fp.h, lw, fe.h + 0.4, { fill: C.bicTint, scale: 0.95, alt: 'p(y|M) = ∫ p(y|θ,M) π(θ|M) dθ' });
  addBullets(slide, [
    '尤度を、パラメータの事前分布 π で平均したもの',
    '複雑さへの罰則が自動的に含まれる（ベイズのオッカムの剃刀）',
    'ただし積分は一般に計算できない → n が大きいときの近似へ',
  ], MARGIN_X, 3.45 + fp.h + fe.h, lw, 2.2, { fontSize: 14, space: 8 });

  // 右：周辺尤度の図（MacKay の図にならった概念図）
  const rx = 7.2;
  const box = { x: rx + 0.1, y: 2.0, w: SLIDE_W - MARGIN_X - rx - 0.2, h: 3.3 };
  addText(slide, '考えられるデータ全体に対する周辺尤度 p(y|M)（概念図）', rx, 1.55, SLIDE_W - MARGIN_X - rx, 0.35, { fontSize: 13, bold: true, color: C.ink });
  const xs = [];
  for (let i = 0; i <= 100; i += 1) xs.push(i / 100);
  const normal = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const range = { xMin: 0, xMax: 1, yMin: 0, yMax: 5.2 };
  addCurve(slide, box, xs, xs.map((x) => normal(x, 0.2, 0.08)), range, { color: C.neutral, width: 2.5 });
  addCurve(slide, box, xs, xs.map((x) => normal(x, 0.42, 0.16)), range, { color: C.bic, width: 3 });
  addCurve(slide, box, xs, xs.map((x) => normal(x, 0.55, 0.45) * 0.93), range, { color: C.aic, width: 2.5, dash: 'dash' });
  addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: C.line, width: 1 });
  const obsX = box.x + 0.47 * box.w;
  addLine(slide, obsX, box.y + 0.2, obsX, box.y + box.h, { color: C.ink, width: 1.5, dash: 'dash' });
  addText(slide, '観測データ', obsX - 0.6, box.y + box.h + 0.05, 1.2, 0.3, { fontSize: 12, bold: true, align: 'center' });
  addText(slide, '単純すぎ', box.x + 0.02, box.y + 0.1, 1.2, 0.3, { fontSize: 12, bold: true, color: C.neutral });
  addText(slide, 'ちょうどよい', obsX + 0.05, box.y + 0.95, 1.6, 0.3, { fontSize: 12, bold: true, color: C.bic });
  addText(slide, '複雑すぎ（広く薄い）', box.x + box.w - 1.9, box.y + 2.35, 1.9, 0.3, { fontSize: 12, bold: true, color: C.aic });
  addText(slide, '確率の合計はどれも 1。広く説明できるモデルほど、1 つのデータへの確率は薄まる',
    rx, 5.85, SLIDE_W - MARGIN_X - rx, 0.7, { fontSize: 12.5, color: C.muted });
  addSource(slide, '図の考え方：MacKay（1992）Bayesian interpolation');
}

// =====================================================================
// 12. ラプラス近似からBICへ
// =====================================================================
{
  const slide = newContentSlide('3  BIC（ベイズ情報量規準）', 'ラプラス近似で周辺尤度を近似すると BIC になる', [
    '周辺尤度の積分を、ラプラス近似で計算します。流れは4段階です。',
    '1つ目。nが大きいと、尤度は最尤推定値のまわりに鋭いピークを持ちます。そこで対数尤度を最尤推定値のまわりで2次式、つまり正規分布の形で近似します。',
    '2つ目。すると積分はガウス積分になり、ピークの高さ、つまり最大尤度と、ピークの幅の積で表せます。幅は、2階微分の行列の行列式で決まります。',
    '3つ目。2階微分の行列は、1データあたりの情報行列のn倍なので、その行列式はnのk乗に比例します。対数をとると、マイナス2分のk log n という項が出てきます。',
    '4つ目。nによらない項、つまり事前分布や1データあたりの情報行列の項は、nが大きいときには無視できます。残った式にマイナス2をかけたものがBICです。',
    'ポイントは、log n の罰則が、パラメータが増えるほどピークの幅が相対的に狭くなる、つまり事前分布の広さに比べて尤度が集中する度合いから来ていることです。',
    'また、事前分布の影響が消えるので、事前分布を決めなくても使えます。一方で、これは近似なので、nが小さいときは精度が落ちます。',
  ]);
  const steps = [
    ['対数尤度を 2 次で近似', '最尤推定値のまわりで、尤度を正規分布の形とみなす'],
    ['ガウス積分で計算', '周辺尤度 ≈ ピークの高さ（最大尤度）× ピークの幅'],
    ['幅は n^(−k/2) で縮む', '|nĴ| ＝ n^k |Ĵ| なので、対数で −(k/2) log n'],
    ['n によらない項を無視', '事前分布や Ĵ の項は O(1)。−2 倍すると BIC'],
  ];
  const lw = 5.9;
  const sh = 1.1;
  steps.forEach(([title, desc], i) => {
    const y = 1.55 + i * (sh + 0.2);
    addCard(slide, MARGIN_X, y, lw, sh, { fill: i === 3 ? C.bicTint : C.gray });
    addNode(slide, MARGIN_X + 0.45, y + sh / 2, 0.5, C.bic, String(i + 1), { fontSize: 16 });
    addText(slide, title, MARGIN_X + 0.9, y + 0.12, lw - 1.1, 0.42, { fontSize: 15.5, bold: true, valign: 'middle' });
    addText(slide, desc, MARGIN_X + 0.9, y + 0.55, lw - 1.1, 0.45, { fontSize: 13 });
  });
  const rx = 6.9;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'ラプラス近似（Ĵ：1 データあたりの情報行列）', rx, 1.6, rw, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  const fl = formulaSize('laplace', 0.95);
  addFormulaCard(slide, 'laplace', rx, 2.0, rw, fl.h + 0.4, { fill: C.gray, scale: 0.95, alt: 'p(y|M) ≈ L(θ̂) π(θ̂) (2π)^(k/2) |nĴ|^(-1/2)' });
  addText(slide, '対数をとり、n とともに大きくなる項だけ残す', rx, 2.6 + fl.h, rw, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  const fll = formulaSize('laplace_log', 0.95);
  addFormulaCard(slide, 'laplace_log', rx, 3.0 + fl.h, rw, fll.h + 0.35, { fill: C.gray, scale: 0.95, alt: 'log p(y|M) = log L(θ̂) - (k/2) log n + O(1)' });
  const by = 3.6 + fl.h + fll.h;
  addCard(slide, rx, by, rw, 1.3, { fill: C.bic });
  const fb = formulaSize('bic_white', 0.8);
  addFormula(slide, 'bic_white', rx + (rw - fb.w) / 2, by + 0.2, { scale: 0.8, alt: 'BIC = -2 log L(θ̂) + k log n' });
  addText(slide, '＝ −2 × log p(y|M) の近似', rx, by + 0.3 + fb.h, rw, 0.4, { fontSize: 13, color: C.white, align: 'center' });
  addText(slide, '事前分布を決めなくても使えるが、あくまで n が大きいときの近似', rx, by + 1.45, rw, 0.4, { fontSize: 12.5, color: C.muted });
}

// =====================================================================
// 13. BICの定義と読み方
// =====================================================================
{
  const slide = newContentSlide('3  BIC（ベイズ情報量規準）', 'BIC の定義と読み方', [
    'BICの定義は、マイナス2かける最大対数尤度に、k log n を足したものです。1978年にSchwarzが提案したので、シュワルツ情報量規準、SICやSBCとも呼ばれます。',
    'AICと同じく小さいほど良く、値の差だけに意味があります。',
    'BICの差からは、2つのモデルの周辺尤度の比、ベイズファクターの近似が得られます。BICの差がそのまま、2 log ベイズファクターになります。',
    'Kass と Raftery の目安では、BICの差が2未満ならほとんど差がなく、2から6で肯定的な証拠、6から10で強い証拠、10を超えると非常に強い証拠とされます。',
    'また、全ての候補の事前確率が等しいとすれば、BICからモデルの事後確率の近似が計算できます。形はAICの赤池重みと同じです。',
  ]);
  const lw = 5.5;
  addCard(slide, MARGIN_X, 1.55, lw, 2.0, { fill: C.bic });
  const fb = formulaSize('bic_white', 0.9);
  addFormula(slide, 'bic_white', MARGIN_X + (lw - fb.w) / 2, 1.8, { scale: 0.9, alt: 'BIC = -2 log L(θ̂) + k log n' });
  addText(slide, 'Bayesian Information Criterion（Schwarz, 1978）', MARGIN_X, 1.9 + fb.h + 0.15, lw, 0.4, { fontSize: 13, color: C.white, align: 'center' });
  addBullets(slide, [
    '小さいほど良い。AIC と同じく差だけに意味がある',
    'SIC・SBC（Schwarz 情報量規準）とも呼ばれる',
    '目指すのは「事後確率が最大のモデル」＝ データを生んだモデルの特定',
  ], MARGIN_X, 3.85, lw, 1.9, { fontSize: 14.5, space: 10 });
  const fbf = formulaSize('bayes_factor', 0.95);
  addFormulaCard(slide, 'bayes_factor', MARGIN_X, 5.75, lw, fbf.h + 0.45, { fill: C.bicTint, scale: 0.95, alt: '2 log B12 ≈ BIC2 - BIC1' });

  const rx = 6.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'BIC の差（≈ 2 log ベイズファクター）の目安', rx, 1.55, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.bic } } });
  slide.addTable([
    [head('ΔBIC'), head('良いほうのモデルを支持する証拠')],
    [{ text: '0 〜 2', options: { bold: true } }, { text: 'ほとんど差がない' }],
    [{ text: '2 〜 6', options: { bold: true } }, { text: '肯定的' }],
    [{ text: '6 〜 10', options: { bold: true } }, { text: '強い' }],
    [{ text: '10 超', options: { bold: true } }, { text: '非常に強い' }],
  ], {
    x: rx, y: 2.0, w: rw, colW: [1.8, rw - 1.8],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.42, fill: { color: C.white },
  });
  addText(slide, 'モデルの事後確率の近似（事前確率が等しいとき）', rx, 4.4, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const fp = formulaSize('bic_post', 0.95);
  addFormulaCard(slide, 'bic_post', rx, 4.85, rw, fp.h + 0.3, { fill: C.bicTint, scale: 0.95, alt: 'P(M_i|y) ≈ exp(-BIC_i/2) / Σ exp(-BIC_j/2)' });
  addSource(slide, '目安：Kass & Raftery（1995）Bayes factors, JASA 90(430)');
}

// =====================================================================
// 14. 罰則の強さの違い
// =====================================================================
{
  const ns = [5, 8, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const labels = ns.map(String);
  const slide = newContentSlide('4  AIC と BIC の比較', '罰則の強さ：n ≥ 8 では BIC のほうが厳しい', [
    'ここからAICとBICを比べます。まず罰則の強さです。',
    'パラメータを1つ増やしたときの罰則の増え方は、AICでは常に2、BICでは log n です。log n が2を超えるのは、nがイーの2乗、約7.4より大きいときなので、データが8個以上あれば、BICのほうが罰則が厳しくなります。',
    'nが100なら4.6で、AICの2.3倍、nが1000なら6.9です。データが増えるほど差が開きます。',
    '右の表は、変数を1つ追加するかどうかを、尤度比検定として見たときの有意水準です。AICは、マイナス2 log L が2より大きく下がれば変数を加えるので、有意水準約16パーセントの検定に相当します。',
    'BICは、nが100なら約3パーセント、1000なら約0.9パーセントの検定に相当し、nが増えるほど厳しくなります。',
    'つまりAICは緩やかに変数を入れ、BICは確かな変数だけを入れる、という性格の違いがあります。',
  ]);
  slide.addChart(pres.charts.LINE, [
    { name: 'AIC：2', labels, values: ns.map(() => 2) },
    { name: 'BIC：log n', labels, values: ns.map((n) => Math.log(n)) },
  ], {
    x: MARGIN_X, y: 1.55, w: 6.7, h: 5.2, ...chartBase(),
    chartColors: [C.aic, C.bic], lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
    showTitle: true, title: 'パラメータ 1 つあたりの罰則',
    showCatAxisTitle: true, catAxisTitle: 'データ数 n（等間隔ではない）',
    valAxisMinVal: 0, valAxisMaxVal: 9, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0',
    showValue: false, showLegend: true, legendPos: 'b',
  });
  const rx = 7.75;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '変数を 1 つ加えるか？ を検定として見ると', rx, 1.6, rw, 0.4, { fontSize: 15, bold: true, color: C.indigo });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.indigo } } });
  // 自由度 1 のカイ二乗分布の上側確率（罰則を超える確率）
  const rows = [
    ['AIC', '2', '15.7%', C.aic],
    ['BIC（n=100）', '4.61', '3.2%', C.bic],
    ['BIC（n=1000）', '6.91', '0.86%', C.bic],
    ['BIC（n=10000）', '9.21', '0.24%', C.bic],
  ];
  slide.addTable([
    [head('規準'), head('必要な改善幅'), head('有意水準')],
    ...rows.map((r) => [{ text: r[0], options: { bold: true, color: r[3] } }, { text: r[1], options: { align: 'center' } }, { text: r[2], options: { align: 'center' } }]),
  ], {
    x: rx, y: 2.05, w: rw, colW: [1.75, 1.8, rw - 3.55],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.42,
  });
  addBullets(slide, [
    'AIC：有意水準 約16% の緩い検定で変数を入れる',
    'BIC：n が増えるほど厳しくなる',
  ], rx, 4.35, rw, 1.0, { fontSize: 14, space: 8 });
  const fg = formulaSize('overfit_gap');
  addCard(slide, rx, 5.4, rw, 1.3, { fill: C.tint });
  addFormula(slide, 'overfit_gap', rx + 0.3, 5.55, { alt: 'AIC - BIC = k(2 - log n)' });
  addText(slide, 'log n > 2（n ≥ 8）なら、k が大きいモデルほど BIC で不利', rx + 0.3, 5.65 + fg.h, rw - 0.6, 0.5, { fontSize: 12.5 });
  addSource(slide, '有意水準は、入れ子のモデルで変数 1 つを加えるときの尤度比検定（自由度 1 のカイ二乗分布）として計算');
}

// =====================================================================
// 15. 目的の違い
// =====================================================================
{
  const slide = newContentSlide('4  AIC と BIC の比較', '目的の違い：「予測」の AIC、「真のモデルの特定」の BIC', [
    'AICとBICの違いは、罰則の強さというより、目的の違いとして理解するのが大切です。',
    'AICは、新しいデータへの予測が最も良いモデルを目指します。BICは、事後確率が最大のモデル、つまりデータを生んだモデルそのものを特定することを目指します。',
    '理論的な性質も違います。真のモデルが候補の中にあるとき、BICはデータが増えれば確率1で真のモデルを選びます。これを一致性と呼びます。',
    'AICは、データがいくら増えても、余分な変数を含む大きめのモデルを選ぶ確率が残ります。つまり一致性がありません。',
    '一方、真のモデルが候補の中にない、あるいは小さな効果が無数にあるような現実的な状況では、AICは予測誤差が最小のモデルに近づきます。これを漸近有効性と呼びます。BICは小さめのモデルを選び、予測では損をすることがあります。',
    'Yangの2005年の論文は、一致性と、予測の最適性を同時に満たす規準は作れないことを示しました。どちらが正しいかではなく、目的に応じて選ぶものです。',
  ]);
  const head = (t, color) => ({ text: t, options: { bold: true, color: C.white, fill: { color } } });
  const rows = [
    ['目指すもの', '新しいデータへの予測が最もよいモデル', '事後確率が最大のモデル（データを生んだモデル）'],
    ['理論の土台', 'KL 情報量・期待対数尤度の偏り補正', '周辺尤度・ラプラス近似'],
    ['罰則', '2k', 'k log n'],
    ['真のモデルが候補にあるとき', 'n が増えても、大きめのモデルを選ぶ確率が残る（一致性なし）', 'n が増えると確率 1 で真のモデルを選ぶ（一致性）'],
    ['真のモデルが候補にない・小さな効果が多いとき', '予測誤差が最小のモデルに近づく（漸近有効性）', '小さめのモデルを選び、予測では不利になりうる'],
    ['選ぶモデルの傾向', '大きめ（変数を多めに残す）', '小さめ（確かな変数だけ残す）'],
    ['向いている目的', '予測・制御・補正モデル', '要因の特定・解釈・構造の同定'],
  ];
  slide.addTable([
    [head('観点', C.indigo), head('AIC', C.aic), head('BIC', C.bic)],
    ...rows.map((r, i) => [
      { text: r[0], options: { bold: true, color: C.indigo, fill: { color: C.tint } } },
      { text: r[1], options: { fill: { color: i === 6 ? C.aicTint : C.white }, bold: i === 6 } },
      { text: r[2], options: { fill: { color: i === 6 ? C.bicTint : C.white }, bold: i === 6 } },
    ]),
  ], {
    x: MARGIN_X, y: 1.5, w: CONTENT_W, colW: [3.1, 4.52, 4.513],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.42, 0.55, 0.5, 0.42, 0.62, 0.72, 0.5, 0.5],
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.gray });
  addText(slide, [{ text: 'Yang（2005）：', bold: true, color: C.indigo }, { text: '一致性と予測の最適性（ミニマックス率）を同時に満たす規準は作れない。どちらが正しいかではなく、目的で選ぶ' }],
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 13.5, valign: 'middle' });
  addSource(slide, '出典：Shibata（1980）、Yang（2005）、Burnham & Anderson（2002）6章');
}

// =====================================================================
// 16. デモ①：真のモデルを選ぶ確率
// =====================================================================
{
  const labels = selection.rows.map((r) => String(r.n));
  const r100 = selRow(100);
  const r2000 = selRow(2000);
  const slide = newContentSlide('4  AIC と BIC の比較', 'デモ①：真のモデルを選べる確率（一致性の確認）', [
    'シミュレーションで、一致性の違いを確かめます。',
    `候補の説明変数は8個で、互いに相関${settings.predictor_corr}を持たせています。本当に効いているのはx1、x2、x3の3つで、係数はそれぞれ1.0、0.7、0.5です。`,
    `全256通りの組み合わせから、AICとBICそれぞれで最小のモデルを選び、x1からx3のちょうど3変数を選べた割合を調べました。データ数ごとに${selection.reps}回くり返しています。`,
    `BICは、データが増えるほど正解率が上がり、nが2000では${pct0(r2000.bic.p_exact)}パーセントです。これが一致性です。`,
    `AICは、nが増えても正解率が${pct0(r2000.aic.p_exact)}パーセント前後で頭打ちになります。右の内訳を見ると、失敗のほとんどは、真の3変数に余分な変数を加えた、選びすぎです。`,
    `ただし、nが30のようにデータが少ないときは、BICは必要な変数を落とす、選び足りないが${pct0(selRow(30).bic.p_under)}パーセントあります。`,
  ]);
  slide.addChart(pres.charts.LINE, [
    { name: 'AIC', labels, values: selection.rows.map((r) => r.aic.p_exact * 100) },
    { name: 'BIC', labels, values: selection.rows.map((r) => r.bic.p_exact * 100) },
  ], {
    x: MARGIN_X, y: 1.55, w: 6.6, h: 4.5, ...chartBase(),
    chartColors: [C.aic, C.bic], lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 8,
    showTitle: true, title: '真の 3 変数をちょうど選べた割合（%）',
    showCatAxisTitle: true, catAxisTitle: 'データ数 n',
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: '0',
    showValue: true, dataLabelPosition: 't', dataLabelFormatCode: '0', dataLabelFontSize: 10,
    showLegend: true, legendPos: 'b',
  });
  const rx = 7.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  const cats = ['AIC（n=30）', 'BIC（n=30）', 'AIC（n=100）', 'BIC（n=100）', 'AIC（n=2000）', 'BIC（n=2000）'];
  const pick = [['aic', 30], ['bic', 30], ['aic', 100], ['bic', 100], ['aic', 2000], ['bic', 2000]];
  slide.addChart(pres.charts.BAR, [
    { name: '正解', labels: cats, values: pick.map(([c, n]) => selRow(n)[c].p_exact * 100) },
    { name: '選びすぎ', labels: cats, values: pick.map(([c, n]) => selRow(n)[c].p_over * 100) },
    { name: '選び足りない', labels: cats, values: pick.map(([c, n]) => selRow(n)[c].p_under * 100) },
  ], {
    x: rx, y: 1.55, w: rw, h: 4.5, ...chartBase(), barDir: 'bar', barGrouping: 'stacked',
    chartColors: [C.indigo, C.aic, C.neutral], barGapWidthPct: 40,
    showTitle: true, title: '選んだモデルの内訳（%）',
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25, valAxisLabelFormatCode: '0',
    catAxisOrientation: 'maxMin', catAxisLabelFontSize: 10.5,
    showValue: true, dataLabelPosition: 'ctr', dataLabelFormatCode: '0', dataLabelColor: C.white, dataLabelFontSize: 9.5,
    showLegend: true, legendPos: 'b',
  });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.6, { fill: C.tint });
  addText(slide, `n=100 の正解率：AIC ${pct0(r100.aic.p_exact)}%・BIC ${pct0(r100.bic.p_exact)}%。平均の変数の数は AIC ${fmt2(r100.aic.mean_size)}・BIC ${fmt2(r100.bic.mean_size)}（真は 3）`,
    MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.6, { fontSize: 13.5, valign: 'middle' });
  addSource(slide, `設定：候補 8 変数（相関 ${settings.predictor_corr}）、真の係数 x1=1.0・x2=0.7・x3=0.5、誤差の標準偏差 1。全 256 モデルから選択、各 n で ${selection.reps} 回`);
}

// =====================================================================
// 17. デモ②：予測誤差
// =====================================================================
{
  const sp = prediction.scenarios.sparse;
  const de = prediction.scenarios.dense;
  const cats = ['少数の大きな効果（x1〜x3 だけ）', '多数の小さな効果（8 変数すべて）'];
  const slide = newContentSlide('4  AIC と BIC の比較', 'デモ②：予測の精度では AIC が勝つこともある', [
    '次に、予測の精度で比べます。データ数は60で、選んだモデルで新しいデータを予測したときの誤差を比べました。',
    'グラフの値は、予測値と真の平均値との平均二乗誤差です。小さいほど予測が正確です。',
    `左は、効いている変数が3つだけの場合です。BICが${fmt3(sp.excess_mse.bic)}、AICが${fmt3(sp.excess_mse.aic)}で、BICのほうが正確です。余分な変数を入れないことが予測にも効いています。`,
    `右は、8つ全ての変数が、少しずつ効いている場合です。今度はAICが${fmt3(de.excess_mse.aic)}、BICが${fmt3(de.excess_mse.bic)}で、AICのほうが正確です。BICは小さな効果の変数を落としすぎてしまいます。`,
    `さらにこの場合は、全ての変数を入れたモデルが${fmt3(de.excess_mse.full)}で最も正確でした。小さな効果がたくさんあるなら、変数を落とさずに、リッジ回帰のように係数を縮める方法も有力です。`,
    '現実のデータは、多くの場合、右のように小さな効果がたくさんある状況に近いと言われます。予測が目的ならAICが推奨される理由の1つです。',
  ]);
  slide.addChart(pres.charts.BAR, [
    { name: 'AIC で選んだモデル', labels: cats, values: [sp.excess_mse.aic, de.excess_mse.aic] },
    { name: 'BIC で選んだモデル', labels: cats, values: [sp.excess_mse.bic, de.excess_mse.bic] },
    { name: '全変数モデル', labels: cats, values: [sp.excess_mse.full, de.excess_mse.full] },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.3, h: 5.2, ...chartBase(), barDir: 'col', barGrouping: 'clustered',
    chartColors: [C.aic, C.bic, C.neutral], barGapWidthPct: 70,
    showTitle: true, title: '予測の平均二乗誤差（小さいほど良い、n=60、300 回の平均）',
    valAxisMinVal: 0, valAxisMaxVal: 0.3, valAxisMajorUnit: 0.05, valAxisLabelFormatCode: '0.00',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.000', dataLabelFontSize: 10.5, dataLabelColor: C.ink,
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.3;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 2.35, { fill: C.bicTint });
  addText(slide, '少数の大きな効果', rx + 0.25, 1.75, rw - 0.5, 0.4, { fontSize: 15, bold: true, color: C.bic });
  addText(slide, `BIC が有利（${fmt3(sp.excess_mse.bic)} ＜ ${fmt3(sp.excess_mse.aic)}）。余分な変数を入れないことが予測にも効く。平均の変数の数 AIC ${fmt1(sp.mean_size.aic)}・BIC ${fmt1(sp.mean_size.bic)}`,
    rx + 0.25, 2.2, rw - 0.5, 1.65, { fontSize: 14.5 });
  addCard(slide, rx, 4.15, rw, 2.55, { fill: C.aicTint });
  addText(slide, '多数の小さな効果', rx + 0.25, 4.3, rw - 0.5, 0.4, { fontSize: 15, bold: true, color: C.aic });
  addText(slide, `AIC が有利（${fmt3(de.excess_mse.aic)} ＜ ${fmt3(de.excess_mse.bic)}）。BIC は小さな効果を落としすぎる。全変数モデル（${fmt3(de.excess_mse.full)}）が最良で、縮小推定（リッジなど）も有力`,
    rx + 0.25, 4.75, rw - 0.5, 1.9, { fontSize: 14.5 });
  addSource(slide, `設定：候補 8 変数（相関 ${settings.predictor_corr}）、誤差の標準偏差 1。右の場合の真の係数 ${settings.true_coef_dense.join('・')}。誤差は予測値と真の平均の差の二乗平均`);
}

// =====================================================================
// 18. ほかの規準との関係
// =====================================================================
{
  const slide = newContentSlide('4  AIC と BIC の比較', 'ほかの規準・方法との関係', [
    'AICとBICの仲間や、関係の深い方法をまとめます。',
    'マローズのCpは、線形回帰で誤差分散が既知のとき、AICと本質的に同じ基準になります。',
    '交差検証との関係も重要です。1つ抜き交差検証は、nが大きいときAICと同じモデルを選ぶことが、Stoneによって示されています。一方、BICのように一致性を持たせるには、抜き出す割合を大きくする必要があり、Shaoが示しています。',
    'HQCは、罰則が2k log log n で、一致性を持つ最も緩い罰則として知られています。',
    'TICは、モデルが正しいと仮定しないAICの一般形です。',
    '混合分布やニューラルネットのように、パラメータと分布が1対1に対応しない、特異モデルと呼ばれるモデルでは、AICとBICの導出の前提が崩れます。そのため、渡辺澄夫先生のWAICやWBICが使われます。',
    '変数の候補が非常に多い場合は、BICでも選びすぎるので、組み合わせの数を考慮したEBICが提案されています。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.indigo } } });
  const rows = [
    ['Mallows の Cp', '線形回帰で、誤差分散が既知なら AIC と同等', 'AIC 型', 'Mallows（1973）'],
    ['1 つ抜き交差検証（LOOCV）', 'n が大きいとき AIC と同じモデルを選ぶ', 'AIC 型', 'Stone（1977）'],
    ['抜き出す割合が大きい交差検証', '一致性を持たせるには、検証に使う割合を 1 に近づける必要', 'BIC 型', 'Shao（1993）'],
    ['HQC', '罰則 2k log(log n)。一致性を持つ最も緩い罰則', '中間', 'Hannan & Quinn（1979）'],
    ['TIC', 'モデルが正しいと仮定しない AIC（罰則 2tr(IJ⁻¹) を推定）', 'AIC 型', '竹内（1976）'],
    ['WAIC・WBIC', '混合分布・ニューラルネットなどの特異モデルでも使える', 'AIC 型・BIC 型', '渡辺（2010, 2013）'],
    ['EBIC', '候補の変数が非常に多いとき、組み合わせの数も罰する', 'BIC 型', 'Chen & Chen（2008）'],
  ];
  slide.addTable([
    [head('規準・方法'), head('関係・特徴'), head('性格'), head('文献')],
    ...rows.map((r) => [
      { text: r[0], options: { bold: true, color: C.indigo } },
      { text: r[1] },
      { text: r[2], options: { align: 'center', color: r[2].startsWith('AIC') ? C.aic : (r[2] === 'BIC 型' ? C.bic : C.muted), bold: true } },
      { text: r[3], options: { fontSize: 12 } },
    ]),
  ], {
    x: MARGIN_X, y: 1.55, w: CONTENT_W, colW: [3.2, 5.0, 1.6, 2.333],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.42, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56],
  });
  const fcp = formulaSize('cp', 0.9);
  const fh = formulaSize('hqc', 0.95);
  const fy = 6.2;
  addFormula(slide, 'cp', MARGIN_X + 0.2, fy - 0.1, { scale: 0.9, alt: 'Cp = RSS_p/σ̂² - n + 2p' });
  addFormula(slide, 'hqc', MARGIN_X + fcp.w + 1.0, fy + (fcp.h - fh.h) / 2 - 0.1, { scale: 0.95, alt: 'HQC = -2 log L + 2k log log n' });
}

// =====================================================================
// 19. 変数選択の全体像
// =====================================================================
{
  const slide = newContentSlide('5  変数選択への利用', '変数選択の全体像：候補を作り、規準で選ぶ', [
    'ここから、情報量規準を変数選択に使う方法です。',
    '流れは4段階です。まず候補となるモデルの集まりを作り、それぞれを最尤推定して情報量規準を計算し、最小のモデルを選び、最後に検証データや確認実験で確かめます。',
    '候補の作り方は、大きく3つあります。',
    '1つ目は全ての組み合わせを試す方法です。確実ですが、候補の変数がp個なら2のp乗通りあり、pが20なら約100万通り、30なら約10億通りになります。',
    '2つ目はステップワイズ法、変数を1つずつ増やしたり減らしたりする方法です。計算は速いですが、最良の組み合わせを見つける保証はありません。',
    '3つ目は、Lassoなどの正則化で候補の列を作り、その中から情報量規準で選ぶ方法です。変数が多い場合に向いています。',
  ]);
  const flow = ['候補モデルを作る', '規準を計算する', '最小のモデルを選ぶ', '検証・確認実験で確かめる'];
  const fw = 2.75;
  const gap = (CONTENT_W - fw * 4) / 3;
  flow.forEach((t, i) => {
    const x = MARGIN_X + i * (fw + gap);
    addCard(slide, x, 1.6, fw, 0.85, { fill: i === 3 ? C.gray : C.indigo, radius: 0.08 });
    addText(slide, t, x + 0.15, 1.6, fw - 0.3, 0.85, { fontSize: 14, bold: true, color: i === 3 ? C.indigo : C.white, align: 'center', valign: 'middle' });
    if (i < 3) addLine(slide, x + fw + 0.05, 2.025, x + fw + gap - 0.05, 2.025, { color: C.ink, width: 2, arrow: true });
  });
  const cards = [
    ['全組み合わせ探索', '全 2^p 通りのモデルで規準を計算する', ['最良のモデルが確実に見つかる', 'p=8 で 256 通り、p=20 で約 105 万通り、p=30 で約 10 億通り'], '目安：p ≲ 15〜20'],
    ['ステップワイズ法', '変数を 1 つずつ加える・除く', ['計算が速い', '最良の組み合わせの保証はない（局所解）'], '目安：p が数十まで'],
    ['正則化（Lasso）＋ 規準', '正則化の強さを変えて候補の列を作り、規準で 1 つ選ぶ', ['変数が多くても計算できる', '自由度を「非ゼロ係数の数」で数える'], '目安：p が多い場合'],
  ];
  const cw = (CONTENT_W - 0.5) / 3;
  cards.forEach(([title, sub, items, foot], i) => {
    const x = MARGIN_X + i * (cw + 0.25);
    const y = 2.8;
    addCard(slide, x, y, cw, 3.9, { fill: C.gray });
    addNode(slide, x + 0.45, y + 0.45, 0.5, C.indigo, String(i + 1), { fontSize: 16 });
    addText(slide, title, x + 0.85, y + 0.2, cw - 1.0, 0.5, { fontSize: 16.5, bold: true, valign: 'middle' });
    addText(slide, sub, x + 0.3, y + 0.85, cw - 0.55, 0.7, { fontSize: 13, color: C.muted });
    addBullets(slide, items, x + 0.3, y + 1.6, cw - 0.55, 1.6, { fontSize: 13.5, space: 8 });
    addText(slide, foot, x + 0.3, y + 3.3, cw - 0.55, 0.4, { fontSize: 13, bold: true, color: C.indigo });
  });
}

// =====================================================================
// 20. デモ③：全組み合わせ探索
// =====================================================================
{
  const labels = bySize.map((b) => String(b.size));
  const aicMin = minBy(bySize, 'aic');
  const bicMin = minBy(bySize, 'bic');
  const next = bySize[aicMin.size + 1];
  const slide = newContentSlide('5  変数選択への利用', 'デモ③：全組み合わせ探索で、変数の数ごとの最良モデルを比べる', [
    `合成データ1組、データ数${example.n}で、全組み合わせ探索を行いました。真に効いているのは、x1、x2、x3の3つです。`,
    '横軸は変数の数、縦軸は、その数の中で最も当てはまりの良いモデルの値です。',
    'グレーの当てはまりの項、マイナス2 log L は変数を増やすほど下がり続けますが、罰則を足したAICとBICは、どちらも3変数で最小になりました。選ばれたのは、正解のx1、x2、x3です。',
    `違いは、最小点から右側の上がり方です。4変数に増やすと、AICは${fmt2(next.aic - aicMin.aic)}しか増えませんが、BICは${fmt2(next.bic - bicMin.bic)}増えます。AICは曲線が平らで、余分な変数を入れても大きく損をしないため、データが少し変わると選びすぎが起きやすいのです。`,
    '全組み合わせの数は、変数8個で256通りでした。',
  ]);
  slide.addChart([
    dashedLine('−2logL', labels, bySize.map((b) => -2 * b.loglik), C.neutral, 'dash', 7),
    dashedLine('AIC', labels, bySize.map((b) => b.aic), C.aic, 'solid', 7),
    dashedLine('BIC', labels, bySize.map((b) => b.bic), C.bic, 'solid', 7),
  ], {
    x: MARGIN_X, y: 1.55, w: 7.5, h: 5.25, ...chartBase(),
    showTitle: true, title: `変数の数ごとの最良モデル（全 ${example.allsubsets.n_models} 通り、n=${example.n}）`,
    showCatAxisTitle: true, catAxisTitle: 'モデルに入れた変数の数',
    valAxisMinVal: 280, valAxisMaxVal: 440, valAxisMajorUnit: 20, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.5;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 1.55, { fill: C.tint });
  addText(slide, '選ばれたモデル', rx + 0.25, 1.72, rw - 0.5, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  addText(slide, [
    { text: `AIC：${aicMin.vars.join('・')}`, color: C.aic, bold: true, breakLine: true },
    { text: `BIC：${bicMin.vars.join('・')}`, color: C.bic, bold: true, breakLine: true },
    { text: '（真に効くのは x1・x2・x3）', fontSize: 12.5, color: C.muted },
  ], rx + 0.25, 2.1, rw - 0.5, 1.0, { fontSize: 15, paraSpaceAfter: 2 });
  addText(slide, '最小点から 1 変数増やしたときの増加', rx, 3.45, rw, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.indigo } } });
  slide.addTable([
    [head(''), head('3 変数'), head('4 変数'), head('増加')],
    [{ text: 'AIC', options: { bold: true, color: C.aic } }, fmt1(aicMin.aic), fmt1(next.aic), { text: `＋${fmt2(next.aic - aicMin.aic)}`, options: { bold: true } }],
    [{ text: 'BIC', options: { bold: true, color: C.bic } }, fmt1(bicMin.bic), fmt1(next.bic), { text: `＋${fmt2(next.bic - bicMin.bic)}`, options: { bold: true } }],
  ].map((row) => row.map((cell) => (typeof cell === 'string' ? { text: cell, options: { align: 'center' } } : { ...cell, options: { align: 'center', ...cell.options } }))), {
    x: rx, y: 3.85, w: rw, colW: [0.9, 1.05, 1.05, rw - 3.0],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.06, 0.04, 0.06],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.4,
  });
  addText(slide, 'AIC は最小点のまわりが平らで、余分な変数を入れても損が小さい → データが少し変わると選びすぎやすい',
    rx, 5.2, rw, 1.3, { fontSize: 13.5 });
}

// =====================================================================
// 21. Δ と赤池重み
// =====================================================================
{
  const slide = newContentSlide('5  変数選択への利用', '「最良の 1 つ」を信じすぎない：Δ と赤池重み', [
    '同じデータで、AICの小さい順に上位5つのモデルを並べました。',
    `最良のモデルとの差デルタは、2位から5位まで全て2未満です。つまり、Burnham と Anderson の目安では、これらのモデルも最良のモデルと区別できません。`,
    `赤池重みで見ると、最良のモデルでも${pct0(top5[0].weight)}パーセントしかありません。256通りのモデルに確からしさが分散しているためです。`,
    '右のグラフは、各変数を含むモデルの赤池重みを合計した値で、変数の重要度として使われます。x1からx3はほぼ1で、どのモデルにも必ず入っています。',
    `x4からx8も、${fmt2(Math.min(...importance.slice(3)))}から${fmt2(Math.max(...importance.slice(3)))}程度の重みを持っていますが、これは効いているというより、入れても入れなくても大差ないことを表しています。`,
    'このように、1つのモデルだけを見るのではなく、差が小さいモデルがいくつあるかを確かめることが大切です。予測では、複数のモデルを重みで平均するモデル平均化も有力です。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.aic } } });
  const tw = 6.6;
  slide.addTable([
    [head('順位'), head('変数'), head('AIC'), head('Δ'), head('赤池重み')],
    ...top5.map((m, i) => [
      { text: String(i + 1), options: { align: 'center', bold: true } },
      { text: m.vars.join('・') },
      { text: fmt2(m.aic), options: { align: 'center' } },
      { text: fmt2(m.delta), options: { align: 'center', bold: true } },
      { text: `${(m.weight * 100).toFixed(1)}%`, options: { align: 'center' } },
    ]),
  ], {
    x: MARGIN_X, y: 1.6, w: tw, colW: [0.8, 2.3, 1.2, 1.0, 1.3],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.45,
  });
  addBullets(slide, [
    '2〜5 位はすべて Δ < 2：最良のモデルと区別できない',
    `最良のモデルでも赤池重みは ${pct0(top5[0].weight)}%`,
    '差の小さいモデルがいくつあるかを必ず確かめる。予測ではモデル平均化も有力',
  ], MARGIN_X, 4.6, tw, 2.1, { fontSize: 14.5, space: 10 });

  const cx = 7.6;
  const labels = importance.map((_, j) => `x${j + 1}`);
  slide.addChart(pres.charts.BAR, [{ name: '変数の重要度', labels, values: importance }], {
    x: cx, y: 1.55, w: SLIDE_W - MARGIN_X - cx, h: 5.2, ...chartBase(), barDir: 'col',
    chartColors: [C.indigo, C.indigo, C.indigo, C.neutral, C.neutral, C.neutral, C.neutral, C.neutral], barGapWidthPct: 45,
    showTitle: true, title: '変数の重要度（含むモデルの赤池重みの合計）',
    valAxisMinVal: 0, valAxisMaxVal: 1.1, valAxisMajorUnit: 0.2, valAxisLabelFormatCode: '0.0',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 10.5, dataLabelColor: C.ink,
    showLegend: false,
  });
  addSource(slide, `デモ③と同じデータ（n=${example.n}、全 ${example.allsubsets.n_models} モデル）`);
}

// =====================================================================
// 22. ステップワイズ法
// =====================================================================
{
  const stepsAic = example.stepwise.aic;
  const stepsBic = example.stepwise.bic;
  const slide = newContentSlide('5  変数選択への利用', 'ステップワイズ法：1 変数ずつ加える・除く', [
    '変数が多くて全組み合わせを試せないときに使われるのが、ステップワイズ法です。',
    'ここで示すのは、加える方向と除く方向の両方を試す、変数増減法です。現在のモデルから、変数を1つ加えるか、1つ除くかの全ての候補について規準を計算し、最も規準が下がる操作を行います。どの操作でも下がらなくなったら終わりです。',
    'デモのデータでは、AICでもBICでも、x1、x3、x2の順に加えられ、3変数のモデルで止まりました。全組み合わせ探索と同じ結果です。',
    '注意点が3つあります。1つ目は、1つずつしか動かないので、全体で最良の組み合わせを見つける保証がないことです。特に変数どうしの相関が強いと、途中で間違った道に入ることがあります。',
    '2つ目は、選んだ後の係数のp値や信頼区間が、実際より楽観的になることです。選ぶ過程で、たまたま効いて見えた変数が残るためです。',
    '3つ目は、R言語のstep関数やMATLABのstepwiselm関数では、既定値がAICやp値の場合があることです。BICで選ぶには、それぞれ設定が必要です。',
  ]);
  // 左：手順
  const lw = 5.2;
  const flow = [
    ['開始', '切片だけのモデル（または全変数モデル）'],
    ['候補を評価', '1 つ加える／除く操作をすべて試す'],
    ['最良の操作を実行', '規準が最も下がる操作を 1 つ行う'],
    ['終了判定', 'どの操作でも規準が下がらなければ終わり'],
  ];
  flow.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.02;
    addCard(slide, MARGIN_X, y, lw, 0.82, { fill: i === 3 ? C.tint : C.gray });
    addNode(slide, MARGIN_X + 0.4, y + 0.41, 0.44, C.indigo, String(i + 1), { fontSize: 14 });
    addText(slide, t, MARGIN_X + 0.8, y + 0.06, lw - 1.0, 0.36, { fontSize: 14.5, bold: true, valign: 'middle' });
    addText(slide, d, MARGIN_X + 0.8, y + 0.42, lw - 1.0, 0.36, { fontSize: 12.5, color: C.muted });
    if (i < 3) addLine(slide, MARGIN_X + 0.4, y + 0.84, MARGIN_X + 0.4, y + 1.0, { color: C.ink, width: 1.5, arrow: true });
  });
  addText(slide, '改善があれば 2 に戻る', MARGIN_X + lw - 2.4, 5.62, 2.4, 0.3, { fontSize: 12, bold: true, color: C.indigo, align: 'right' });

  // 右：デモの手順の表
  const rx = 6.3;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'デモ③のデータでの動き', rx, 1.55, rw, 0.35, { fontSize: 14.5, bold: true, color: C.indigo });
  const head = (t, color = C.indigo) => ({ text: t, options: { bold: true, color: C.white, fill: { color } } });
  slide.addTable([
    [head('ステップ'), head('操作'), head('AIC', C.aic), head('BIC', C.bic)],
    ...stepsAic.map((s, i) => [
      { text: String(i), options: { align: 'center' } },
      { text: s.action },
      { text: fmt2(s.value), options: { align: 'center' } },
      { text: fmt2(stepsBic[i].value), options: { align: 'center' } },
    ]),
  ], {
    x: rx, y: 1.95, w: rw, colW: [1.1, 2.6, 1.365, 1.368],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.4,
  });
  addText(slide, `どちらも ${stepsAic[stepsAic.length - 1].vars.join('・')} で停止（全組み合わせ探索と同じ結果）`, rx, 4.05, rw, 0.35, { fontSize: 13 });
  addCard(slide, rx, 4.6, rw, 1.85, { fill: C.aicTint });
  addText(slide, '注意点', rx + 0.25, 4.7, rw - 0.5, 0.35, { fontSize: 14, bold: true, color: C.aic });
  addBullets(slide, [
    '全体で最良の組み合わせの保証はない（相関が強いと道を誤る）',
    '選んだ後の p 値・信頼区間は楽観的になる',
    '既定の規準はソフトで違う（R の step() は AIC。BIC は k = log(n) を指定）',
  ], rx + 0.25, 5.1, rw - 0.5, 1.3, { fontSize: 13, space: 5 });
}

// =====================================================================
// 23. Lasso＋情報量規準
// =====================================================================
{
  const lasso = example.lasso;
  const rows = lasso.rows;
  const labels = rows.map((r) => String(r.df));
  const slide = newContentSlide('5  変数選択への利用', 'Lasso と組み合わせる：正則化パス上で規準を最小にする', [
    '3つ目の方法は、Lassoとの組み合わせです。',
    'Lassoは、係数の絶対値の合計に罰則をかけて推定する方法で、罰則の強さラムダを大きくすると、効きの弱い変数の係数から順にちょうど0になります。',
    'ラムダを大きい値から小さい値へ動かすと、変数が1つずつ入ってくるモデルの列ができます。これを正則化パスと呼びます。このパス上の各モデルで情報量規準を計算し、最小のものを選びます。',
    'このとき、パラメータ数kの代わりに、0でない係数の数を自由度として使えることが、Zou、Hastie、Tibshiraniによって示されています。',
    `デモのデータでは、AICもBICも、0でない係数が${lasso.best.aic.df}個、x1、x2、x3のモデルを選びました。scikit-learnのLassoLarsICでも同じ結果でした。`,
    'Lassoは係数を0の方向に縮めるので、選んだ変数で改めて最小二乗法を当てはめ直すこともあります。また、変数の数がデータ数より多い場合は、誤差分散の推定が難しいので、交差検証やEBICを使います。',
  ]);
  const lw = 5.6;
  const fl = formulaSize('lasso', 0.9);
  addFormulaCard(slide, 'lasso', MARGIN_X, 1.55, lw, fl.h + 0.4, { fill: C.tint, scale: 0.9, alt: 'β̂(λ) = argmin (1/2n)||y - Xβ||² + λ||β||_1' });
  addBullets(slide, [
    'λ を大きくすると、弱い変数の係数から順に 0 になる',
    'λ を動かすと、変数が 1 つずつ入るモデルの列（正則化パス）ができる',
    'パス上の各モデルで規準を計算し、最小を選ぶ',
    '自由度 k ＝ 0 でない係数の数（Zou, Hastie & Tibshirani, 2007）',
  ], MARGIN_X, 1.55 + fl.h + 0.65, lw, 2.9, { fontSize: 14, space: 9 });
  addCard(slide, MARGIN_X, 5.55, lw, 1.15, { fill: C.gray });
  addText(slide, [
    { text: '結果：', bold: true, color: C.indigo },
    { text: `AIC・BIC とも ${lasso.best.aic.vars.join('・')}（λ=${fmt3(lasso.best.aic.alpha)}）。scikit-learn の LassoLarsIC も同じ（${lasso.sklearn.bic.vars.join('・')}）` },
  ], MARGIN_X + 0.25, 5.55, lw - 0.5, 1.15, { fontSize: 13.5, valign: 'middle' });

  const cx = 6.55;
  slide.addChart(pres.charts.LINE, [
    { name: 'AIC', labels, values: rows.map((r) => r.aic) },
    { name: 'BIC', labels, values: rows.map((r) => r.bic) },
  ], {
    x: cx, y: 1.55, w: SLIDE_W - MARGIN_X - cx, h: 5.2, ...chartBase(),
    chartColors: [C.aic, C.bic], lineSize: 2.75, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
    showTitle: true, title: '正則化パス上の AIC・BIC（左ほど λ が大きい）',
    showCatAxisTitle: true, catAxisTitle: '0 でない係数の数',
    valAxisMinVal: 290, valAxisMaxVal: 440, valAxisMajorUnit: 25, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
}

// =====================================================================
// 24. 回帰以外への適用
// =====================================================================
{
  const slide = newContentSlide('5  変数選択への利用', '線形回帰以外でも使える：尤度があればよい', [
    'AICとBICは、最尤推定するモデルであれば、線形回帰以外にもそのまま使えます。',
    'ロジスティック回帰などの一般化線形モデルでは、マイナス2 log L はデビアンスと呼ばれる量になり、変数選択にそのまま使えます。',
    '時系列モデルでは、ARモデルやARIMAモデルの次数の選択に使われます。そもそもAICは、赤池先生が時系列モデルの次数選択のために考えたものです。',
    '混合ガウスモデルのクラスター数や、因子分析の因子の数の選択にも使われ、特にBICがよく使われます。ただし、これらは特異モデルなので、理論的にはWBICのほうが適切な場合があります。',
    'どのモデルでも、パラメータ数kに何を数えるか、例えば分散や、混合比率を数えるかを確認し、比べるモデルの間でそろえることが大切です。',
  ]);
  const cards = [
    ['一般化線形モデル', 'ロジスティック回帰・ポアソン回帰など', '−2logL はデビアンス（に定数を足したもの）。変数選択にそのまま使える'],
    ['時系列モデル', 'AR・ARMA・ARIMA の次数', 'AIC はもともと自己回帰モデルの次数選択のために考えられた（赤池）'],
    ['混合分布・クラスタリング', '混合ガウスモデルの成分の数', 'BIC がよく使われる。特異モデルなので理論的には WBIC が適切な場合も'],
    ['因子分析・構造方程式モデル', '因子の数・モデル構造の比較', '適合度指標と併用。k に何を数えるか（分散・共分散）をそろえる'],
  ];
  const cw = (CONTENT_W - 0.3) / 2;
  const ch = 2.0;
  cards.forEach(([title, sub, desc], i) => {
    const x = MARGIN_X + (i % 2) * (cw + 0.3);
    const y = 1.6 + Math.floor(i / 2) * (ch + 0.25);
    addCard(slide, x, y, cw, ch, { fill: C.gray });
    addNode(slide, x + 0.45, y + 0.45, 0.5, i === 2 ? C.bic : C.indigo, String(i + 1), { fontSize: 16 });
    addText(slide, title, x + 0.85, y + 0.2, cw - 1.0, 0.5, { fontSize: 16.5, bold: true, valign: 'middle' });
    addText(slide, sub, x + 0.3, y + 0.85, cw - 0.55, 0.4, { fontSize: 13.5, bold: true, color: C.indigo });
    addText(slide, desc, x + 0.3, y + 1.25, cw - 0.55, 0.7, { fontSize: 13.5 });
  });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.55, { fill: C.tint });
  addText(slide, '共通の条件：最尤推定していること、k に何を数えるかを比べるモデル間でそろえること',
    MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.55, { fontSize: 14, valign: 'middle', bold: true, color: C.indigo });
}

// =====================================================================
// 25. よくある落とし穴
// =====================================================================
{
  const slide = newContentSlide('6  注意点と使い分け', 'よくある落とし穴', [
    '実務でよくある落とし穴を6つ挙げます。',
    '1つ目。比べるモデルは、全く同じデータで推定する必要があります。変数によって欠測値がある場合、変数を入れ替えるとデータ数が変わってしまい、比較できなくなります。',
    '2つ目。目的変数を対数変換したモデルと、変換していないモデルは、そのままでは比べられません。尤度の単位が違うからです。比べるには、変換のヤコビアンの補正が必要です。',
    '3つ目。ソフトによって、定数項の扱いや、誤差分散をkに数えるかどうかが違います。例えばデモのデータの全変数モデルでは、この資料の定義では308.53、PythonのstatsmodelsとMATLABでは306.53でした。同じソフトの中で比べれば、差は同じなので問題ありません。',
    '4つ目。AICの値そのものには意味がありません。値が300だから良い、悪いとは言えません。',
    '5つ目。選んだ後のモデルで計算したp値や信頼区間は、選択の過程を無視しているので、楽観的になります。',
    '6つ目。候補に入れていない変数は選べませんし、選ばれた変数が原因であるとは限りません。変数選択は因果関係を示すものではありません。',
  ]);
  const items = [
    ['同じデータで比べる', '欠測値のある変数を入れ替えると n が変わり、比較できない。先に欠測を処理して n をそろえる'],
    ['目的変数の変換に注意', 'y と log y のモデルは尤度の単位が違う。比べるには変換のヤコビアンを補正する'],
    ['ソフトで値が違う', `定数や、誤差分散を k に数えるかが違う。デモの全変数モデル：本資料 ${fmt2(bySize[8].aic)}、statsmodels・MATLAB 306.53`],
    ['値そのものに意味はない', '「AIC = 300 だから良い」とは言えない。同じデータの候補間の差だけを見る'],
    ['選択後の p 値は楽観的', '選ぶ過程で「たまたま効いて見えた」変数が残る。検証データや確認実験で確かめる'],
    ['因果関係は示さない', '候補にない変数は選べない。選ばれた変数が原因とは限らない（交絡・相関）'],
  ];
  const cw = (CONTENT_W - 0.5) / 3;
  const ch = 2.4;
  items.forEach(([title, desc], i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.25);
    const y = 1.6 + Math.floor(i / 3) * (ch + 0.25);
    addNumberedCard(slide, x, y, cw, ch, i + 1, title, desc, { fill: i === 2 ? C.aicTint : C.gray, color: C.indigo, descSize: 14.5 });
  });
}

// =====================================================================
// 26. 使い分けガイド
// =====================================================================
{
  const slide = newContentSlide('6  注意点と使い分け', '使い分けの目安：まず「何のために選ぶか」を決める', [
    '使い分けの目安をまとめます。まず、何のためにモデルを選ぶのかを決めることが出発点です。',
    '予測や、装置の補正モデルのように、当てることが目的なら、AICを使います。データ数がパラメータ数の40倍より少なければAICcにします。交差検証も併用すると安心です。',
    'どの要因が効いているのかを知りたい、解釈したいという目的なら、BICが向いています。',
    '候補の変数が数十以上ある、あるいはデータ数より多い場合は、Lassoと交差検証、またはEBICを使います。',
    '混合分布やニューラルネットなど、特異モデルでは、WAICやWBICを検討します。',
    'どの場合も、AICとBICを両方計算してみるのがおすすめです。同じモデルが選ばれれば安心できます。違うモデルが選ばれたら、その差の変数について、効果の大きさや専門知識から検討します。最後は、検証データや確認実験で確かめます。',
  ]);
  addCard(slide, MARGIN_X, 1.6, 3.0, 3.95, { fill: C.indigo });
  addText(slide, withBreaks(['何のために', 'モデルを選ぶ？']), MARGIN_X, 1.6, 3.0, 3.95, { fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle' });
  const branches = [
    ['予測・補正モデルを作りたい', 'AIC（n/k<40 は AICc）＋交差検証', C.aic, C.aicTint],
    ['効いている要因を特定・解釈したい', 'BIC', C.bic, C.bicTint],
    ['候補の変数が非常に多い（p ≳ 数十、p > n）', 'Lasso ＋ 交差検証、または EBIC', C.indigo, C.tint],
    ['混合分布・ニューラルネットなど', 'WAIC・WBIC', C.muted, C.gray],
  ];
  const bx = 4.3;
  const bh = 0.85;
  branches.forEach(([q, a, color, fill], i) => {
    const y = 1.6 + i * (bh + 0.18);
    addLine(slide, MARGIN_X + 3.05, 3.575, bx - 0.05, y + bh / 2, { color: C.line, width: 1.5, arrow: true });
    addCard(slide, bx, y, 4.3, bh, { fill: C.gray });
    addText(slide, q, bx + 0.2, y, 4.0, bh, { fontSize: 13.5, bold: true, valign: 'middle' });
    addLine(slide, bx + 4.35, y + bh / 2, bx + 4.75, y + bh / 2, { color: C.ink, width: 1.5, arrow: true });
    addCard(slide, bx + 4.8, y, SLIDE_W - MARGIN_X - bx - 4.8, bh, { fill });
    addText(slide, a, bx + 5.0, y, SLIDE_W - MARGIN_X - bx - 5.2, bh, { fontSize: 14.5, bold: true, color, valign: 'middle' });
  });
  addText(slide, 'どの場合も共通の手順', MARGIN_X, 5.8, CONTENT_W, 0.35, { fontSize: 14, bold: true, color: C.indigo });
  const common = ['AIC と BIC を両方計算', '一致すれば安心', '違えば差の変数を効果の大きさ・専門知識で検討', '検証データ・確認実験で確かめる'];
  const cw = (CONTENT_W - 0.3 * 3) / 4;
  common.forEach((t, i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 6.2, cw, 0.6, { fill: C.tint, radius: 0.08 });
    addText(slide, t, x + 0.1, 6.2, cw - 0.2, 0.6, { fontSize: 12.5, bold: true, align: 'center', valign: 'middle' });
    if (i < 3) addLine(slide, x + cw + 0.03, 6.5, x + cw + 0.27, 6.5, { color: C.ink, width: 1.5, arrow: true });
  });
}

// =====================================================================
// 27. コード例
// =====================================================================
{
  const slide = newContentSlide('6  注意点と使い分け', 'コード例：MATLAB と Python', [
    'コード例です。どちらも、デモ③と同じデータを使い、実際に動かして結果を確かめています。',
    'MATLABでは、fitlm関数で当てはめたモデルの、ModelCriterionプロパティに、AIC、AICc、BICなどが入っています。stepwiselm関数で、Criterionにbicを指定すると、BICによる変数増減法になります。結果は、x1、x2、x3のモデルでした。',
    'Pythonでは、statsmodelsのols関数で当てはめると、aicとbicという属性で値が取れます。ここでは全組み合わせを試しています。結果は、AICもBICもx1、x2、x3でした。',
    'なお、MATLABとstatsmodelsは、誤差分散をパラメータ数に数えないので、この資料の定義より値が2小さくなります。モデル間の差は同じなので、選ばれるモデルは変わりません。',
    'Rでは、AIC関数とBIC関数で計算でき、変数増減法はstep関数に、BICの場合は k イコール log n を指定します。',
  ]);
  const matlabCode = [
    "T = readtable('example_data.csv');",
    '',
    '% 全変数モデルの情報量規準',
    "full = fitlm(T, 'y ~ x1+x2+x3+x4+x5+x6+x7+x8');",
    'disp(full.ModelCriterion)   % AIC・AICc・BIC',
    '',
    '% 変数増減法（BIC）',
    "mdl = stepwiselm(T, 'constant', ...",
    "    'ResponseVar', 'y', 'Upper', 'linear', ...",
    "    'Criterion', 'bic', 'Verbose', 0);",
    'disp(mdl.Formula)',
    '% → y ~ 1 + x1 + x2 + x3',
  ].join('\n');
  const pythonCode = [
    'import itertools',
    'import pandas as pd',
    'import statsmodels.formula.api as smf',
    '',
    'df = pd.read_csv("example_data.csv")',
    'cands = [f"x{j}" for j in range(1, 9)]',
    'results = []',
    'for r in range(len(cands) + 1):',
    '    for vs in itertools.combinations(cands, r):',
    '        f = "y ~ " + (" + ".join(vs) if vs else "1")',
    '        fit = smf.ols(f, data=df).fit()',
    '        results.append((fit.aic, fit.bic, vs))',
    '',
    'print(min(results, key=lambda t: t[0])[2])  # AIC',
    'print(min(results, key=lambda t: t[1])[2])  # BIC',
    "# → ('x1', 'x2', 'x3') ともに",
  ].join('\n');
  const cw = (CONTENT_W - 0.3) / 2;
  addCodeCard(slide, MARGIN_X, 1.5, cw, 4.45, 'MATLAB（Statistics and Machine Learning Toolbox）', matlabCode, { fontSize: 12.5 });
  addCodeCard(slide, MARGIN_X + cw + 0.3, 1.5, cw, 4.45, 'Python（statsmodels）', pythonCode, { fontSize: 12 });
  addCard(slide, MARGIN_X, 6.1, CONTENT_W, 0.7, { fill: C.aicTint });
  addText(slide, [
    { text: '注意：', bold: true, color: C.aic },
    { text: 'MATLAB と statsmodels は誤差分散を k に数えないため、本資料の定義より値が 2 小さい（306.53 と 308.53）。差は同じなので選択結果は同じ。R は AIC()・BIC()、step(model, k = log(n)) で BIC' },
  ], MARGIN_X + 0.3, 6.1, CONTENT_W - 0.6, 0.7, { fontSize: 12.5, valign: 'middle' });
  addSource(slide, 'MATLAB R2022b と Python（statsmodels 0.15.0）で実行して結果を確認。データはデモ③と同じ（example_data.csv）');
}

// =====================================================================
// 28. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.6, 6, 0.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle' });
  const r2000 = selRow(2000);
  const points = [
    '情報量規準は「当てはまりの悪さ（−2logL）＋ 複雑さの罰則」。値の差だけに意味がある',
    'AIC（2k）は、最大対数尤度の楽観的な偏り ≈ k を補正した「予測のよさ」の規準。小標本では AICc',
    'BIC（k log n）は、周辺尤度をラプラス近似した「事後確率」の規準。n ≥ 8 で AIC より厳しい',
    `BIC は一致性（デモ：n=2000 で正解率 ${pct0(r2000.bic.p_exact)}%）、AIC は予測向き（小さな効果が多いと有利）`,
    '変数選択は全組み合わせ・ステップワイズ・Lasso で候補を作り、Δ・赤池重みと検証で確かめる',
  ];
  points.forEach((p, i) => {
    const y = 1.65 + i * 1.02;
    addNode(slide, 1.15, y + 0.37, 0.56, C.indigoLight, String(i + 1), { fontSize: 18, color: C.night });
    addText(slide, p, 1.7, y, 7.8, 0.78, { fontSize: 15.5, color: C.white, valign: 'middle' });
  });
  addCriteriaMotif(slide, { x: 9.8, y: 2.2, w: 2.5, h: 2.8 }, { fitColor: C.indigoLight, labelColor: C.onDarkSub });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '情報量規準は、当てはまりの悪さに複雑さの罰則を足したもので、同じデータで比べたモデル間の差だけに意味があります。',
    'AICは、最大対数尤度が楽観的になる分、およそkを補正したもので、新しいデータへの予測の良さを目指します。データが少ないときはAICcを使います。',
    'BICは、モデルの周辺尤度をラプラス近似したもので、事後確率が最大のモデルを目指します。データが8個以上あれば、AICより罰則が厳しくなります。',
    'BICは真のモデルを特定する一致性を持ち、AICは予測に向いています。どちらが正しいかではなく、目的で選びます。',
    '変数選択では、全組み合わせ、ステップワイズ、Lassoで候補を作って規準で選び、差の小さいモデルがないかを確かめ、最後は検証データや確認実験で確かめることが大切です。',
  ].join('\n'));
}

// =====================================================================
// 29. 参考文献
// =====================================================================
{
  const slide = newContentSlide('REFERENCES', '参考文献', [
    '本資料で参照した主な文献です。',
    '日本語で理論を詳しく学ぶなら、小西・北川の『情報量規準』が定番です。',
    '実務での使い方、特にデルタや赤池重み、モデル平均化については、Burnham と Anderson の本が詳しいです。',
    'BICとベイズファクターについては、Kass と Raftery の論文が読みやすいです。',
  ]);
  const refsLeft = [
    'Akaike, H. (1973). Information theory and an extension of the maximum likelihood principle. 2nd International Symposium on Information Theory, 267–281.',
    'Akaike, H. (1974). A new look at the statistical model identification. IEEE Transactions on Automatic Control, 19(6), 716–723.',
    'Schwarz, G. (1978). Estimating the dimension of a model. Annals of Statistics, 6(2), 461–464.',
    'Sugiura, N. (1978). Further analysis of the data by Akaike\'s information criterion and the finite corrections. Communications in Statistics – Theory and Methods, 7(1), 13–26.',
    'Hurvich, C. M., & Tsai, C.-L. (1989). Regression and time series model selection in small samples. Biometrika, 76(2), 297–307.',
    'Hannan, E. J., & Quinn, B. G. (1979). The determination of the order of an autoregression. JRSS B, 41(2), 190–195.',
    '竹内啓 (1976). 情報統計量の分布とモデルの適切さの規準. 数理科学, 153, 12–18.',
    'Mallows, C. L. (1973). Some comments on Cp. Technometrics, 15(4), 661–675.',
    'Stone, M. (1977). An asymptotic equivalence of choice of model by cross-validation and Akaike\'s criterion. JRSS B, 39(1), 44–47.',
    'Shibata, R. (1980). Asymptotically efficient selection of the order of the model for estimating parameters of a linear process. Annals of Statistics, 8(1), 147–164.',
  ];
  const refsRight = [
    'MacKay, D. J. C. (1992). Bayesian interpolation. Neural Computation, 4(3), 415–447.',
    'Shao, J. (1993). Linear model selection by cross-validation. JASA, 88(422), 486–494.',
    'Kass, R. E., & Raftery, A. E. (1995). Bayes factors. JASA, 90(430), 773–795.',
    'Burnham, K. P., & Anderson, D. R. (2002). Model Selection and Multimodel Inference (2nd ed.). Springer.',
    '小西貞則・北川源四郎 (2004). 情報量規準. 朝倉書店.',
    'Yang, Y. (2005). Can the strengths of AIC and BIC be shared? Biometrika, 92(4), 937–950.',
    'Zou, H., Hastie, T., & Tibshirani, R. (2007). On the "degrees of freedom" of the lasso. Annals of Statistics, 35(5), 2173–2192.',
    'Chen, J., & Chen, Z. (2008). Extended Bayesian information criteria for model selection with large model spaces. Biometrika, 95(3), 759–771.',
    'Watanabe, S. (2010). Asymptotic equivalence of Bayes cross validation and widely applicable information criterion in singular learning theory. JMLR, 11, 3571–3594.',
    'Watanabe, S. (2013). A widely applicable Bayesian information criterion. JMLR, 14, 867–897.',
  ];
  const cw = (CONTENT_W - 0.4) / 2;
  addBullets(slide, refsLeft, MARGIN_X, 1.5, cw, 5.4, { fontSize: 12, space: 7, indent: 12, color: C.ink });
  addBullets(slide, refsRight, MARGIN_X + cw + 0.4, 1.5, cw, 5.4, { fontSize: 12, space: 7, indent: 12, color: C.ink });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
