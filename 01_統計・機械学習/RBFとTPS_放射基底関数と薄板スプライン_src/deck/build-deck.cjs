// build-deck.cjs — RBF と TPS の解説動画にあわせたパワーポイントを pptxgenjs で組み立てる。
// 見た目は「技術レポートPowerPoint」テンプレート（濃紺の表紙とまとめ、白地の本文、淡い色のカード）に合わせる。
// 数値は動画と同じ計算（js/rbf-math.js、js/multi-data.js）から取る。数式と斜めから見た面は deck/make-assets.mjs が作った画像。
//   NODE_PATH="$(npm root -g)" node deck/build-deck.cjs out/deck_raw.pptx
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = process.argv[2] || path.join(ROOT, 'out', 'deck_raw.pptx');
const ASSET_DIR = path.join(__dirname, 'assets');
const ASSETS = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'assets.json'), 'utf8'));

// 動画と同じ計算の部品を読む（rbf-math.js は window が無ければ globalThis に置く）
new Function(fs.readFileSync(path.join(ROOT, 'js', 'rbf-math.js'), 'utf8'))();
const M = globalThis.RBFM;
globalThis.window = {};
new Function(fs.readFileSync(path.join(ROOT, 'js', 'multi-data.js'), 'utf8'))();
const D = globalThis.window.MULTI_DATA;

// ---- 定数（テンプレートの寸法・色・フォント） ----
const SLIDE_W = 13.333;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const FONT = 'BIZ UDGothic';
const DECK_NAME = 'RBF と TPS 入門';
const DECK_DATE = '2026年11月';
const C = {
  navy: '22223B', navy2: '34365A', slate: '4A4E69', muted: '6C6F7F', line: 'DADDE6', line2: 'BFC3D1', grid: 'E8EAF0',
  gray: 'F3F4F8', white: 'FFFFFF', onDark: 'A9ACC6', onDark2: 'D9DBEA',
  coral: 'E76F51', coralTint: 'FBE3DC', teal: '2A9D8F', tealTint: 'D8F0ED', purple: '8D6A9F', purpleTint: 'ECE3F1',
  gold: 'E9C46A', goldText: '9C7412', goldTint: 'FBF1D6',
};
const GAUSS_COLOR = C.teal;
const TPS_COLOR = C.coral;
const PLANE_COLOR = C.slate;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = 'RBF と TPS 入門 ― 放射基底関数による補間と薄板スプライン';
pres.lang = 'ja-JP';
let pageNumber = 0;

// ---- 数値の書式 ----
const fmt = (v, digits = 2) => {
  const text = v.toFixed(digits);
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
};
const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sci = (v) => {
  if (v < 100) return fmt(v, v < 10 ? 1 : 0);
  const e = Math.floor(Math.log10(v));
  return `${(v / 10 ** e).toFixed(1)} × 10${String(e).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`;
};
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// ---- 文字（"w_{j}" は下付き、"r^{2}" は上付きのランにする） ----
function parseRich(text, base = {}) {
  const runs = [];
  const pattern = /([_^])\{([^}]*)\}/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), options: { ...base } });
    runs.push({ text: match[2], options: { ...base, [match[1] === '_' ? 'subscript' : 'superscript']: true } });
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), options: { ...base } });
  return runs;
}
function toRuns(item, base = {}) {
  if (typeof item === 'string') return parseRich(item, base);
  if (Array.isArray(item)) return item.flatMap((part) => toRuns(part, base));
  const { text, breakLine, ...rest } = item;
  const runs = parseRich(text, { ...base, ...rest });
  if (breakLine && runs.length) runs[runs.length - 1].options.breakLine = true;
  return runs;
}
function addText(slide, content, x, y, w, h, options = {}) {
  slide.addText(toRuns(content), {
    x, y, w, h, fontFace: FONT, fontSize: 15, color: C.navy, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP',
    ...options,
  });
}
const lines = (items) => items.map((text, i) => ({ text, breakLine: i < items.length - 1 }));
function addBullets(slide, items, x, y, w, h, { fontSize = 14, color = C.navy, space = 6 } = {}) {
  const runs = [];
  items.forEach((item, index) => {
    const itemRuns = toRuns(item, { color, fontSize });
    itemRuns[0].options.bullet = { indent: 14 };
    itemRuns[0].options.paraSpaceAfter = space;
    if (index < items.length - 1) itemRuns[itemRuns.length - 1].options.breakLine = true;
    runs.push(...itemRuns);
  });
  slide.addText(runs, { x, y, w, h, fontFace: FONT, fontSize, color, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP' });
}

// ---- 図形 ----
function addCard(slide, x, y, w, h, { fill = C.white, line = C.line, radius = 0.08 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: line || fill, width: line ? 1 : 0.5 },
  });
}
// 始点・終点から、正の長さと回転角で線を描く（負の幅・高さを使わない）
function addLine(slide, x1, y1, x2, y2, { color = C.line2, width = 1.25, dash, arrow = false } = {}) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  let angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const line = { color, width };
  if (dash) line.dashType = dash;
  if (arrow) line.endArrowType = 'triangle';
  slide.addShape(pres.shapes.LINE, { x: (x1 + x2) / 2 - length / 2, y: (y1 + y2) / 2, w: Math.max(length, 0.001), h: 0, rotate: angle, line });
}
function addCircle(slide, cx, cy, d, fill, label, { color = C.white, fontSize = 15, line } = {}) {
  slide.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: { color: line || fill, width: line ? 1.25 : 0.5 } });
  if (label !== undefined) addText(slide, label, cx - d / 2, cy - d / 2, d, d, { align: 'center', valign: 'middle', fontSize, bold: true, color });
}
function asset(key) {
  const a = ASSETS[key];
  if (!a) throw new Error(`画像がありません: ${key}（node deck/make-assets.mjs を先に実行）`);
  return a;
}
// 数式の画像を、高さ（インチ）か倍率で置く。返り値は置いた大きさ
function addFormula(slide, key, x, y, { scale = 0.6, alt = key } = {}) {
  const a = asset(`formula-${key}`);
  const w = a.w * scale;
  const h = a.h * scale;
  slide.addImage({ path: path.join(ASSET_DIR, a.file), x, y, w, h, altText: alt });
  return { w, h };
}
const formulaSize = (key, scale = 0.6) => ({ w: asset(`formula-${key}`).w * scale, h: asset(`formula-${key}`).h * scale });
function addFigure(slide, key, x, y, w, alt) {
  const a = asset(`figure-${key}`);
  const h = (w * a.h) / a.w;
  slide.addImage({ path: path.join(ASSET_DIR, a.file), x, y, w, h, altText: alt || key });
  return h;
}
// 濃紺の帯に数式を置く（左寄せ、右に説明を書ける）
function formulaBar(slide, key, x, y, w, h, { scale = 0.6, note, noteW = 4.6, alt } = {}) {
  addCard(slide, x, y, w, h, { fill: C.navy, line: null, radius: 0.08 });
  const size = formulaSize(key, scale);
  const fx = note ? x + 0.35 : x + (w - size.w) / 2;
  addFormula(slide, key, fx, y + (h - size.h) / 2, { scale, alt });
  if (note) addText(slide, note, x + w - noteW - 0.35, y, noteW, h, { fontSize: 14, color: C.onDark2, valign: 'middle' });
}
function numberedRow(slide, num, color, x, y, w, h, title, desc, { titleSize = 15, descSize = 13 } = {}) {
  addCard(slide, x, y, w, h, { fill: C.white });
  addCircle(slide, x + 0.42, y + h / 2, 0.46, color, String(num), { fontSize: 15 });
  if (desc) {
    addText(slide, title, x + 0.85, y + 0.1, w - 1.05, 0.38, { fontSize: titleSize, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.85, y + 0.48, w - 1.05, h - 0.55, { fontSize: descSize, color: C.slate });
  } else {
    addText(slide, title, x + 0.85, y, w - 1.05, h, { fontSize: titleSize, valign: 'middle' });
  }
}

// ---- スライドの共通部品（章ラベル、題名、フッター） ----
function footer(slide, { dark = false } = {}) {
  const color = dark ? C.onDark : C.muted;
  addText(slide, DECK_NAME, MARGIN_X, 7.08, 4, 0.25, { fontSize: 9, color });
  addText(slide, String(pageNumber), SLIDE_W - MARGIN_X - 1, 7.08, 1, 0.25, { fontSize: 10, color, align: 'right' });
}
function contentSlide(kicker, title, notes) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  if (kicker) addText(slide, kicker, MARGIN_X, 0.3, 8, 0.3, { fontSize: 12, bold: true, color: C.muted });
  addText(slide, title, MARGIN_X, 0.62, CONTENT_W, 0.75, { fontSize: 28, bold: true, valign: 'middle' });
  footer(slide);
  slide.addNotes(notes.join('\n'));
  return slide;
}

// ---- グラフ（曲線は図形で描く。点の数が多い連続の曲線は、ネイティブのグラフより崩れにくい） ----
function plotFrame(slide, box, xr, yr, { xticks = [], yticks = [], fmtX = (v) => String(v), fmtY = (v) => String(v), xlabel, logX = false } = {}) {
  const sx = (v) => box.x + (logX ? Math.log10(v / xr[0]) / Math.log10(xr[1] / xr[0]) : (v - xr[0]) / (xr[1] - xr[0])) * box.w;
  const sy = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h;
  yticks.forEach((v) => addLine(slide, box.x, sy(v), box.x + box.w, sy(v), { color: C.grid, width: 0.75 }));
  if (yr[0] < 0 && yr[1] > 0) addLine(slide, box.x, sy(0), box.x + box.w, sy(0), { color: C.line2, width: 1 });
  addLine(slide, box.x, box.y, box.x, box.y + box.h, { color: C.line2, width: 1 });
  addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: C.line2, width: 1 });
  xticks.forEach((v) => addText(slide, fmtX(v), sx(v) - 0.5, box.y + box.h + 0.06, 1, 0.22, { fontSize: 10, color: C.muted, align: 'center' }));
  yticks.forEach((v) => addText(slide, fmtY(v), box.x - 0.62, sy(v) - 0.11, 0.54, 0.22, { fontSize: 10, color: C.muted, align: 'right' }));
  if (xlabel) addText(slide, xlabel, box.x + box.w - 2.5, box.y + box.h + 0.3, 2.5, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
  return { box, xr, yr, sx, sy, logX };
}
// 範囲の外に出る部分は、境界で切って別の線にする
function addCurve(slide, P, xs, ys, { color = C.navy, width = 2, dash } = {}) {
  const [y0, y1] = P.yr;
  const inside = (y) => Number.isFinite(y) && y >= y0 && y <= y1;
  const segments = [];
  let current = [];
  const push = (x, y) => current.push([P.sx(x), P.sy(Math.min(Math.max(y, y0), y1))]);
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (inside(y)) {
      if (!current.length && i > 0 && Number.isFinite(ys[i - 1])) {
        const edge = ys[i - 1] > y1 ? y1 : y0;
        push(xs[i - 1] + ((edge - ys[i - 1]) / (y - ys[i - 1])) * (xs[i] - xs[i - 1]), edge);
      }
      push(xs[i], y);
    } else if (current.length) {
      if (Number.isFinite(y)) {
        const edge = y > y1 ? y1 : y0;
        push(xs[i - 1] + ((edge - ys[i - 1]) / (y - ys[i - 1])) * (xs[i] - xs[i - 1]), edge);
      }
      if (current.length > 1) segments.push(current);
      current = [];
    }
  }
  if (current.length > 1) segments.push(current);
  segments.forEach((seg) => {
    const minX = Math.min(...seg.map((p) => p[0]));
    const minY = Math.min(...seg.map((p) => p[1]));
    const w = Math.max(Math.max(...seg.map((p) => p[0])) - minX, 0.01);
    const h = Math.max(Math.max(...seg.map((p) => p[1])) - minY, 0.01);
    const line = { color, width };
    if (dash) line.dashType = dash;
    slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: minX, y: minY, w, h, points: seg.map(([px, py]) => ({ x: px - minX, y: py - minY })), fill: { type: 'none' }, line });
  });
}
function addDots(slide, P, xs, ys, { color = C.navy, d = 0.11, ring = C.white } = {}) {
  xs.forEach((x, i) => slide.addShape(pres.shapes.OVAL, { x: P.sx(x) - d / 2, y: P.sy(ys[i]) - d / 2, w: d, h: d, fill: { color }, line: { color: ring, width: 0.75 } }));
}
function legendRow(slide, items, x, y, { fontSize = 11 } = {}) {
  let cx = x;
  items.forEach((item) => {
    if (item.dot) addCircle(slide, cx + 0.12, y + 0.11, 0.12, item.color);
    else addLine(slide, cx, y + 0.11, cx + 0.3, y + 0.11, { color: item.color, width: item.width || 2.25, dash: item.dash });
    const w = 0.12 * item.label.length + 0.3;
    addText(slide, item.label, cx + 0.38, y, w, 0.22, { fontSize, color: C.slate });
    cx += 0.38 + w + 0.15;
  });
}
function chartBase() {
  return {
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted, catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, catAxisLineShow: true, catAxisLineColor: C.line2, valAxisLineShow: false,
    valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: 'none' },
    dataLabelFontFace: FONT, titleFontFace: FONT, legendFontFace: FONT, titleColor: C.navy, titleFontSize: 12,
    legendFontSize: 10, legendColor: C.slate, dataLabelColor: C.navy, dataLabelFontSize: 10,
  };
}
// 組み合わせグラフ用の折れ線 1 系列（線種を系列ごとに指定するため。lineDash に配列を渡すとファイルが壊れる）
function lineSeries(name, labels, values, color, { dash = 'solid', size = 6 } = {}) {
  return { type: pres.charts.LINE, data: [{ name, labels, values }], options: { chartColors: [color], lineSize: 2.5, lineDash: dash, lineDataSymbol: 'circle', lineDataSymbolSize: size } };
}
function addTable(slide, header, rows, x, y, colW, { rowH = 0.42, fontSize = 13, highlight = {} } = {}) {
  const cell = (text, options = {}) => ({ text: toRuns(String(text), { fontFace: FONT, fontSize, color: C.navy }), options: { valign: 'middle', margin: [0, 0.08, 0, 0.08], ...options } });
  const body = [header.map((h) => cell(h, { bold: true, fill: { color: C.gray }, color: C.navy }))];
  rows.forEach((row, r) => body.push(row.map((value, c) => cell(value, { fill: { color: highlight[r] || C.white }, bold: c === 0 || Boolean(highlight[r]) }))));
  slide.addTable(body, { x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: FONT, fontSize, color: C.navy, autoPage: false });
}

// =====================================================================
// 計算（動画と同じ例）
// =====================================================================
const X1 = M.DATA1_X.map((x) => [x]);
const EPS_DEMO = 0.7;
const gaussDemo = M.fit(X1, M.DATA1_Y, M.BASIS.gaussian(EPS_DEMO));
const cubicDemo = M.fit(X1, M.DATA1_Y, M.BASIS.cubic(), { degree: 1 });
const lineGauss = M.fit(X1, M.LINE1_Y, M.BASIS.gaussian(EPS_DEMO));
const lineCubic = M.fit(X1, M.LINE1_Y, M.BASIS.cubic(), { degree: 1 });
const EPS_CASES = [4, 0.7, 0.1].map((eps) => {
  const phi = M.BASIS.gaussian(eps);
  const model = M.fit(X1, M.DATA1_Y, phi);
  return { eps, model, cond: M.conditionNumber(M.kernelMatrix(X1, phi)), maxWeight: Math.max(...model.w.map(Math.abs)) };
});
const TPS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.thinPlate(), { degree: 1 });
const EPS_2D = 1.6;
const GAUSS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(EPS_2D));
const ENERGY_TPS = M.thinPlateEnergy(TPS2);
const ENERGY_GAUSS = M.bendingEnergyNumeric((p) => M.secondDerivativesGaussian(GAUSS2, EPS_2D, p), 5, 0.02);
const DEMO3_PHI = M.kernelMatrix([0, 1, 3].map((x) => [x]), M.BASIS.gaussian(1));
const CV_LOGS = range(-6, 3, 180);
const CV_VALUES = CV_LOGS.map((k) => M.leaveOneOutError(M.NOISY_X, M.NOISY_Y, 10 ** k));
const CV_BEST_INDEX = CV_VALUES.indexOf(Math.min(...CV_VALUES));
const LAMBDA_BEST = 10 ** CV_LOGS[CV_BEST_INDEX];
const cvAt = (lambda) => M.leaveOneOutError(M.NOISY_X, M.NOISY_Y, lambda);
const histogram = (d) => D.histograms.find((h) => h.d === d);
const unit = (scale) => D.units.find((u) => u.scale === scale);
const gaussFixedWorst = Math.max(...D.errors.map((e) => e.gaussFixed));

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, '学習用資料 ｜ 補間・空間統計', MARGIN_X, 0.55, 8, 0.3, { fontSize: 12, color: C.onDark });
  addText(slide, 'RBF と TPS 入門', MARGIN_X, 1.45, 6.6, 1.0, { fontSize: 44, bold: true, color: C.white, valign: 'middle' });
  addText(slide, '放射基底関数による補間と、薄板スプライン', MARGIN_X, 2.6, 6.4, 0.5, { fontSize: 20, color: C.onDark2 });
  addText(slide, '散らばった点から、なめらかな面を作る', MARGIN_X, 3.15, 6.4, 0.45, { fontSize: 16, color: C.onDark });
  [
    [C.teal, 'RBF 補間：距離だけで決まる山を足す'],
    [C.coral, 'TPS：曲げエネルギーが最小の板'],
    [C.purple, '説明変数が3つ以上のときの挙動'],
  ].forEach(([color, label], i) => {
    addCircle(slide, MARGIN_X + 0.12, 4.42 + i * 0.5, 0.18, color);
    addText(slide, label, MARGIN_X + 0.4, 4.3 + i * 0.5, 5.8, 0.26, { fontSize: 15, color: C.white });
  });
  addFigure(slide, 'cover', 6.6, 0.95, 6.3, '14本のピンに張った TPS の面');
  addText(slide, '例：14本のピンに張った TPS の面', 6.6, 6.3, 6.3, 0.25, { fontSize: 11, color: C.onDark, align: 'right' });
  addText(slide, `${DECK_DATE} ｜ 同名の解説動画にあわせた資料 ｜ 例の数値は動画と同じ計算（JavaScript）`, MARGIN_X, 6.75, 12, 0.3, { fontSize: 11, color: C.onDark });
  slide.addNotes([
    'この資料は、RBF（放射基底関数）による補間と、TPS（薄板スプライン）を学ぶための教材です。同名の解説動画と同じ構成・同じ例で説明します。',
    '右の図は、散らばった14本のピンに TPS の板を張ったものです。すべてのピンの先を通る、なめらかな面になっています。この面の作り方と、RBF と TPS の関係が資料全体のテーマです。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で学ぶこと
// =====================================================================
{
  const slide = contentSlide(null, 'この資料で学ぶこと', [
    '全体は4部・8章です。第1部で補間の問題と RBF 補間の考え方、第2部で基底関数の種類と多項式の項を学びます。',
    '第3部が中心で、TPS が曲げエネルギー最小の板であること、そして RBF と TPS の関係を整理します。第4部は、ノイズがあるときの平滑化と、説明変数が3つ以上のときの挙動です。',
  ]);
  addCard(slide, MARGIN_X, 1.5, CONTENT_W, 0.62, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.36, 1.81, 0.38, C.navy, '◎', { fontSize: 12 });
  addText(slide, 'ゴール：RBF と TPS の関係を説明でき、問題に合わせて基底関数・平滑化・変数の扱いを選べるようになる', MARGIN_X + 0.7, 1.5, CONTENT_W - 0.9, 0.62, { fontSize: 15, bold: true, valign: 'middle' });
  const parts = [
    ['01', 'Σ', C.coral, '補間と RBF', '散らばった点の補間の問題、RBF 補間の式と、1次元での組み立て', '第1・2章 ｜ p.4–7'],
    ['02', 'φ', C.teal, '基底関数と多項式', 'ガウスと多重調和スプライン、幅 ε の影響、平面を再現する多項式の項', '第3・4章 ｜ p.8–11'],
    ['03', 'J', C.purple, 'TPS と RBF の関係', '曲げエネルギー最小の板、形と理由、系統図、ガウスとの使い分け', '第5・6章 ｜ p.12–17'],
    ['04', 'd', C.goldText, '平滑化と多変数', 'ノイズがあるときの平滑化 λ と、説明変数が3つ以上のときの挙動', '第7・8章 ｜ p.18–25'],
  ];
  const cardW = (CONTENT_W - 0.3 * 3) / 4;
  parts.forEach(([num, glyph, color, title, desc, pages], i) => {
    const x = MARGIN_X + i * (cardW + 0.3);
    addCard(slide, x, 2.4, cardW, 4.3);
    addCircle(slide, x + 0.6, 3.0, 0.66, color, glyph, { fontSize: 20 });
    addText(slide, num, x + cardW - 1.1, 2.6, 0.85, 0.5, { fontSize: 28, bold: true, color: C.line2, align: 'right' });
    addText(slide, title, x + 0.3, 3.6, cardW - 0.6, 0.75, { fontSize: 17, bold: true });
    addText(slide, desc, x + 0.3, 4.4, cardW - 0.6, 1.7, { fontSize: 13, color: C.slate });
    addText(slide, pages, x + 0.3, 6.2, cardW - 0.6, 0.3, { fontSize: 11, color: C.muted });
  });
}

// =====================================================================
// 3. この資料のポイント
// =====================================================================
{
  const slide = contentSlide(null, 'この資料のポイント ― 4つの要点', [
    '最初に要点を4つにまとめます。1つ目、RBF 補間は、各点に距離だけで決まる山を置き、重みをつけて足し合わせる方法です。',
    '2つ目、TPS は RBF の一種で、基底関数 r² log r に平面を足したものです。3つ目、TPS は、すべての点を通る面の中で曲げエネルギーが最小のもので、幅のパラメータがありません。',
    '4つ目、ガウス RBF は幅 ε の調整が必要で点の外では 0 に戻り、TPS は外側で平面に沿います。説明変数が3つ以上では標準化が必要で、変数が増えるほど平面に近づきます。',
  ]);
  const points = [
    ['Σ', C.teal, '① RBF 補間 ＝ 距離の山を足す', '各点に、距離 r だけで決まる山 φ(r) を置き、重み w_{j} を掛けて足す', '重みは連立方程式 Φw = y で決まる'],
    ['⊂', C.coral, '② TPS は RBF の一種', 'φ(r) = r^{2} log r に平面（1次式）を足した RBF が TPS（薄板スプライン）', 'TPS ⊂ 多重調和スプライン ⊂ RBF 補間'],
    ['J', C.purple, '③ TPS ＝ 曲げエネルギー最小の板', '全点を通る面の中で、板の曲げエネルギー J[f] が最小', '幅のパラメータがなく、調整がいらない'],
    ['d', C.goldText, '④ 使い分けと、3変数以上', 'ガウスは幅 ε しだいで、点の外では 0 へ戻る。TPS は外側で平面に沿う', '3変数以上では標準化が必要で、変数が増えるほど平面に近づく'],
  ];
  const w = (CONTENT_W - 0.3) / 2;
  points.forEach(([glyph, color, title, body, note], i) => {
    const x = MARGIN_X + (i % 2) * (w + 0.3);
    const y = 1.6 + Math.floor(i / 2) * 2.65;
    addCard(slide, x, y, w, 2.4);
    addCircle(slide, x + 0.6, y + 0.6, 0.6, color, glyph, { fontSize: 19 });
    addText(slide, title, x + 1.1, y + 0.3, w - 1.3, 0.6, { fontSize: 18, bold: true, valign: 'middle' });
    addText(slide, body, x + 0.35, y + 1.1, w - 0.7, 0.7, { fontSize: 14 });
    addText(slide, note, x + 0.35, y + 1.8, w - 0.7, 0.4, { fontSize: 12.5, color: C.muted });
  });
}

// =====================================================================
// 4. 第1章 補間の問題
// =====================================================================
{
  const slide = contentSlide('01　補間の問題', '補間の問題 ― 散らばった点から面を作る', [
    'データ点が n 個あります。すべての点を通るなめらかな関数 s を作るのが補間です。',
    '点が格子の上にあれば、各方向のスプラインを掛け合わせる方法が使えます。しかし実際のデータは、ばらばらに散らばっていることが多いのです。',
    '決まった基底、たとえば 1、x、y の平面で3点を通そうとすると、3点が一直線に並んだとき面が1つに決まりません。2次元以上では、どんな決まった基底でも、点の並び方によっては解けなくなります（マイルフーバー・カーチスの定理）。',
    'そこで、基底をデータ点の位置に合わせて作ります。これが RBF の発想です。',
  ]);
  addCard(slide, MARGIN_X, 1.6, 6.4, 1.3, { fill: C.gray, line: null });
  addText(slide, 'データ (x_{i}, y_{i})（i = 1, …, n）、x_{i} は d 次元の点', MARGIN_X + 0.3, 1.72, 5.9, 0.3, { fontSize: 14 });
  addFormula(slide, 'interp', MARGIN_X + 0.2, 2.08, { scale: 0.55, alt: 's(x_i) = y_i' });
  addText(slide, '補間の条件：すべての点を通る', MARGIN_X + 3.0, 2.2, 3.2, 0.3, { fontSize: 13, color: C.muted });
  // 格子と散布の点
  const panel = (x, label, desc, points) => {
    addCard(slide, x, 3.15, 3.05, 2.05);
    points.forEach(([px, py]) => addCircle(slide, x + 1.525 + px * 1.2, 4.17 - py * 0.82, 0.11, C.navy));
    addText(slide, label, x, 5.3, 3.05, 0.3, { fontSize: 14, bold: true, align: 'center' });
    addText(slide, desc, x, 5.6, 3.05, 0.3, { fontSize: 12, color: C.slate, align: 'center' });
  };
  const lattice = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) lattice.push([-1 + i * 0.5, -1 + j * (2 / 3)]);
  panel(MARGIN_X, '格子の点', '各方向のスプラインでよい', lattice);
  panel(MARGIN_X + 3.35, '散らばった点（散布）', '格子を前提にした方法が使えない', M.DATA2_P);
  // 決まった基底では解けない例
  addCard(slide, 7.35, 1.6, 5.38, 4.3, { fill: C.coralTint, line: null });
  addText(slide, '決まった基底では解けない例', 7.65, 1.8, 4.8, 0.35, { fontSize: 16, bold: true });
  addText(slide, '平面 s(x, y) = c_{0} + c_{1}x + c_{2}y で3点を通す', 7.65, 2.3, 4.8, 0.3, { fontSize: 14 });
  // 一直線の3点と、その直線のまわりに回せる面（横から見た図）
  const cx = 10.04;
  const cy = 3.35;
  [-25, 0, 25].forEach((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    addLine(slide, cx - 1.6 * Math.cos(rad), cy - 1.6 * Math.sin(rad), cx + 1.6 * Math.cos(rad), cy + 1.6 * Math.sin(rad), { color: i === 1 ? C.coral : C.line2, width: i === 1 ? 2.5 : 1.5, dash: i === 1 ? undefined : 'dash' });
  });
  [-1, 0, 1].forEach((k) => addCircle(slide, cx + k * 0.9, cy, 0.18, C.navy));
  addText(slide, '一直線の3点を通る面は、その直線のまわりに回せる', 7.65, 4.0, 4.8, 0.3, { fontSize: 12, color: C.slate, align: 'center' });
  addText(slide, lines(['→ 面が1つに決まらない', 'マイルフーバー・カーチスの定理：2次元以上では、どんな決まった基底でも、点の並び方によっては解けない']), 7.65, 4.45, 4.8, 1.3, { fontSize: 13.5, paraSpaceAfter: 6 });
  addCard(slide, MARGIN_X, 6.1, CONTENT_W, 0.7, { fill: C.navy, line: null });
  addText(slide, '→ 基底を、データ点の位置に合わせて作る。これが RBF（放射基底関数）補間の発想', MARGIN_X + 0.35, 6.1, CONTENT_W - 0.7, 0.7, { fontSize: 16, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 5. 第1章 3つの方法
// =====================================================================
{
  const slide = contentSlide('01　補間の問題', '散らばった点に面を張る ― 3つの方法を比べる', [
    '例のデータは、正方形の中に散らばった14個の点です。棒の高さが各点の値です。',
    'いちばん近い点の値を使う最近傍は、全点を通りますが階段状で、なめらかではありません。',
    '距離の逆数で重みをつけて平均する逆距離加重は、点の上で平らになり、でこぼこした面になります。',
    'RBF 補間（ここでは TPS）なら、すべての点を通る、なめらかな面になります。',
  ]);
  const items = [
    ['nearest', '最近傍', 'いちばん近い点の値 → 階段状で、なめらかでない', C.muted],
    ['idw', '逆距離加重（IDW）', '距離²の逆数で重みをつけた平均 → 点の上で平ら', C.muted],
    ['tps', 'RBF 補間（TPS）', 'r^{2} log r ＋ 平面 → 全点を通り、なめらか', C.teal],
  ];
  const w = (CONTENT_W - 0.3 * 2) / 3;
  items.forEach(([key, title, desc, color], i) => {
    const x = MARGIN_X + i * (w + 0.3);
    const h = addFigure(slide, key, x, 1.6, w, `${title}の面`);
    addCircle(slide, x + 0.14, 1.75 + h + 0.15, 0.16, color);
    addText(slide, title, x + 0.32, 1.6 + h + 0.15, w - 0.3, 0.32, { fontSize: 16, bold: true });
    addText(slide, desc, x, 1.6 + h + 0.55, w, 0.55, { fontSize: 13, color: C.slate });
  });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.6, { fill: C.gray, line: null });
  addText(slide, '例：[−1, 1]² に散らばった14点。値は「傾いた平面 ＋ 山 ＋ 谷」の式で作った説明用のデータ', MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.6, { fontSize: 13, color: C.slate, valign: 'middle' });
}

// =====================================================================
// 6. 第2章 RBF 補間の式
// =====================================================================
{
  const slide = contentSlide('02　RBF 補間', 'RBF 補間 ― 距離の関数を足し合わせる', [
    '放射基底関数とは、中心からの距離 r だけで値が決まる関数 φ(r) です。同じ距離ならどの向きでも同じ値で、等高線は同心円になります。',
    'RBF 補間では、データ点を中心に φ を置き、重み w を掛けて足し合わせます。すべての点を通る条件を書くと、重みの連立方程式 Φw = y になります。',
    '未知数も式も n 個ずつなので、Φ に逆行列があれば重みがただ1つに決まります。距離しか使わないので、何次元でも同じ式で書けます。',
  ]);
  formulaBar(slide, 'rbf', MARGIN_X, 1.55, 7.55, 1.2, { scale: 0.62, note: '各点 x_{j} に山 φ を置き、重み w_{j} を掛けて足す', noteW: 3.0, alt: 's(x) = Σ w_j φ(‖x − x_j‖)' });
  const steps = [
    [C.teal, '各点を中心に φ を置く', 'φ(r) は中心からの距離 r だけで決まる（等高線は同心円）'],
    [C.coral, '重み w_{j} を掛けて足す', 'すべての点を通る条件 s(x_{i}) = y_{i} を書く'],
    [C.purple, '連立方程式 Φw = y を解く', 'Φ_{ij} = φ(‖x_{i} − x_{j}‖)：点どうしの距離だけで決まる行列'],
  ];
  steps.forEach(([color, title, desc], i) => numberedRow(slide, i + 1, color, MARGIN_X, 3.0 + i * 1.02, 7.55, 0.9, title, desc));
  addText(slide, '未知数 n 個・式 n 個 → Φ に逆行列があれば、重みがただ1つに決まる。距離しか使わないので、何次元でも同じ式', MARGIN_X, 6.15, 7.55, 0.65, { fontSize: 13.5, bold: true, color: C.teal });
  addFigure(slide, 'radial', 9.15, 1.55, 2.9, 'ガウス型の山（同心円の等高線）');
  addText(slide, 'ガウス型 φ(r) = e^{−r²}（等高線は同心円）', 8.45, 4.5, 4.28, 0.3, { fontSize: 12, color: C.slate, align: 'center' });
  addText(slide, '3点 x = 0, 1, 3 のときの Φ', 8.45, 4.95, 4.28, 0.3, { fontSize: 13, bold: true });
  addTable(slide, ['', 'x = 0', 'x = 1', 'x = 3'], DEMO3_PHI.map((row, i) => [`x = ${[0, 1, 3][i]}`, ...row.map((v) => v.toFixed(3))]), 8.45, 5.3, [1.0, 1.09, 1.09, 1.1], { rowH: 0.34, fontSize: 12 });
}

// =====================================================================
// 7. 第2章 1次元で組み立てる
// =====================================================================
{
  const slide = contentSlide('02　RBF 補間', '1次元で組み立てる ― 山を足すと全点を通る', [
    '1次元の7点で組み立てます。まず各点を中心にガウス型の山を置き、連立方程式を解いて求めた重みを掛けます。',
    '重みが負の山は、下向きの谷になります。重みをつけた7つの山を足すと、すべての点をぴったり通る曲線になります。',
    '右のグラフが各点の重みです。山を足すだけで補間ができることが分かります。',
  ]);
  const P = plotFrame(slide, { x: 1.2, y: 1.85, w: 7.0, h: 4.2 }, [-0.5, 10], [-0.8, 2.4], { xticks: [0, 2, 4, 6, 8, 10], yticks: [-0.5, 0, 0.5, 1, 1.5, 2], fmtY: (v) => fmt(v, 1), xlabel: 'x' });
  const xs = range(-0.5, 10, 300);
  M.DATA1_X.forEach((xj, j) => addCurve(slide, P, xs, xs.map((x) => gaussDemo.w[j] * Math.exp(-((EPS_DEMO * (x - xj)) ** 2))), { color: GAUSS_COLOR, width: 1.25 }));
  addCurve(slide, P, xs, xs.map((x) => gaussDemo.at([x])), { color: TPS_COLOR, width: 3 });
  addDots(slide, P, M.DATA1_X, M.DATA1_Y, { d: 0.14 });
  legendRow(slide, [{ color: GAUSS_COLOR, label: '重みをつけた山 wⱼφ', width: 1.25 }, { color: TPS_COLOR, label: '山の合計（補間）', width: 3 }, { dot: true, color: C.navy, label: 'データ点' }], 1.2, 1.5);
  slide.addChart(pres.charts.BAR, [{ name: '重み', labels: M.DATA1_X.map((x) => `x=${x}`), values: [...gaussDemo.w].map((v) => Number(v.toFixed(2))) }], {
    x: 8.7, y: 1.5, w: 4.03, h: 3.3, ...chartBase(), barDir: 'col', chartColors: [GAUSS_COLOR], showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00',
    showTitle: true, title: '重み w（Φw = y の解）', showLegend: false, valAxisMinVal: -0.5, valAxisMaxVal: 2.0, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: '0.0',
  });
  addCard(slide, 8.7, 5.05, 4.03, 1.25, { fill: C.gray, line: null });
  addText(slide, lines(['ガウス型 φ(r) = e^{−(εr)²}、ε = 0.7', '負の重みの山は、下向きの谷になる']), 8.95, 5.05, 3.6, 1.25, { fontSize: 13, valign: 'middle', paraSpaceAfter: 4 });
}

// =====================================================================
// 8. 第3章 基底関数の種類
// =====================================================================
{
  const slide = contentSlide('03　基底関数の種類', '基底関数の種類 ― 幅 ε を持つ仲間と、持たない仲間', [
    'よく使う基底関数は、大きく2つの仲間に分かれます。ガウスや多重二次は、幅を決める形状パラメータ ε を持ち、ε が大きいほど山が細くなります。',
    'r³ や r² log r は多重調和スプラインと呼ばれる仲間で、ε がありません。最後の r² log r が TPS の基底関数です。',
    'ガウスなどの正定値の関数なら、点がすべて異なれば Φ は必ず逆行列を持ちます。多重調和スプラインは条件付き正定値で、そのままでは解けないことがあり、多項式の項を足して使います。',
  ]);
  addTable(slide, ['名前', 'φ(r)', '幅 ε', '性質'], [
    ['ガウス', 'exp(−(εr)^{2})', 'あり', '正定値'],
    ['逆多重二次', '1 / √(1 + (εr)^{2})', 'あり', '正定値'],
    ['多重二次', '√(1 + (εr)^{2})', 'あり', '条件付き正定値'],
    ['3乗（多重調和）', 'r^{3}', 'なし', '条件付き正定値'],
    ['薄板スプライン（TPS）', 'r^{2} log r', 'なし', '条件付き正定値'],
  ], MARGIN_X, 1.6, [2.45, 2.25, 0.95, 2.0], { rowH: 0.52, fontSize: 13.5, highlight: { 4: C.goldTint } });
  addCard(slide, MARGIN_X, 4.95, 3.7, 1.85, { fill: C.tealTint, line: null });
  addText(slide, lines(['正定値', '点がすべて異なれば、Φ は必ず逆行列を持つ（必ず解ける）']), MARGIN_X + 0.3, 5.1, 3.15, 1.6, { fontSize: 13.5, paraSpaceAfter: 6 });
  addCard(slide, MARGIN_X + 3.95, 4.95, 3.7, 1.85, { fill: C.coralTint, line: null });
  addText(slide, lines(['条件付き正定値', 'そのままでは解けないことがある → 多項式の項を足して使う（第4章）']), MARGIN_X + 4.25, 5.1, 3.15, 1.6, { fontSize: 13.5, paraSpaceAfter: 6 });
  // 右: 関数の形
  const rsA = range(0, 3, 200);
  addText(slide, 'ε あり（ε = 1）', 9.0, 1.5, 3.7, 0.3, { fontSize: 13, bold: true });
  const PA = plotFrame(slide, { x: 9.3, y: 2.15, w: 3.4, h: 1.55 }, [0, 3], [0, 3.2], { xticks: [0, 1, 2, 3], yticks: [0, 1, 2, 3], xlabel: 'r' });
  addCurve(slide, PA, rsA, rsA.map(M.BASIS.gaussian(1)), { color: C.teal, width: 2.25 });
  addCurve(slide, PA, rsA, rsA.map(M.BASIS.inverseMultiquadric(1)), { color: C.coral, width: 2.25 });
  addCurve(slide, PA, rsA, rsA.map(M.BASIS.multiquadric(1)), { color: C.purple, width: 2.25 });
  legendRow(slide, [{ color: C.teal, label: 'ガウス' }, { color: C.coral, label: '逆多重二次' }, { color: C.purple, label: '多重二次' }], 9.0, 1.82, { fontSize: 10 });
  const rsB = range(0, 2, 200);
  addText(slide, 'ε なし（多重調和スプライン）', 9.0, 4.25, 3.7, 0.3, { fontSize: 13, bold: true });
  const PB = plotFrame(slide, { x: 9.3, y: 4.9, w: 3.4, h: 1.55 }, [0, 2], [-0.5, 3], { xticks: [0, 1, 2], yticks: [0, 1, 2, 3], xlabel: 'r' });
  addCurve(slide, PB, rsB, rsB.map(M.BASIS.cubic()), { color: C.purple, width: 2.25 });
  addCurve(slide, PB, rsB, rsB.map(M.BASIS.thinPlate()), { color: C.goldText, width: 2.5 });
  legendRow(slide, [{ color: C.purple, label: 'r³' }, { color: C.goldText, label: 'r² log r（TPS）' }], 9.0, 4.57, { fontSize: 10 });
}

// =====================================================================
// 9. 第3章 幅 ε の影響
// =====================================================================
{
  const slide = contentSlide('03　基底関数の種類', '幅 ε の影響 ― 精度と安定性の取り合い', [
    'ガウス RBF で幅 ε を変えた補間です。ε が大きく山が細いと、点と点の間で 0 に落ち、とげのような曲線になります。',
    'ε を小さく、山を太くすると曲線はなめらかになります。しかし重みが巨大になり、行列 Φ の条件数が急に大きくなって、計算が不安定になります。',
    '条件数が 10 の k 乗なら、計算で約 k 桁の精度を失います。精度と安定性の取り合いで、ガウス RBF では ε の選び方が結果を大きく左右します。',
  ]);
  const titles = ['ε = 4（山が細い）', 'ε = 0.7', 'ε = 0.1（山が太い）'];
  const notes = ['点の間で 0 に落ちて「とげ」になる', 'ほどよい幅', 'なめらかだが、重みが巨大で不安定'];
  const xs = range(-0.5, 10, 300);
  EPS_CASES.forEach((c, i) => {
    const x0 = MARGIN_X + i * 4.12;
    addText(slide, titles[i], x0, 1.55, 3.8, 0.3, { fontSize: 14, bold: true });
    const P = plotFrame(slide, { x: x0 + 0.45, y: 2.0, w: 3.4, h: 2.0 }, [-0.5, 10], [-1, 2.5], { xticks: [0, 5, 10], yticks: [-1, 0, 1, 2] });
    addCurve(slide, P, xs, xs.map((x) => c.model.at([x])), { color: GAUSS_COLOR, width: 2.25 });
    addDots(slide, P, M.DATA1_X, M.DATA1_Y, { d: 0.11 });
    const fill = i === 0 ? C.gray : i === 1 ? C.tealTint : C.coralTint;
    addCard(slide, x0, 4.55, 3.85, 1.45, { fill, line: null });
    addText(slide, sci(c.cond), x0 + 0.25, 4.62, 3.4, 0.6, { fontSize: 26, bold: true, color: i === 2 ? C.coral : C.navy, valign: 'middle' });
    addText(slide, lines([`条件数 cond(Φ)　最大の重み ${sci(c.maxWeight)}`, notes[i]]), x0 + 0.25, 5.22, 3.45, 0.75, { fontSize: 11.5, color: C.slate, paraSpaceAfter: 3 });
  });
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.62, { fill: C.navy, line: null });
  addText(slide, '条件数 10^{k} → 計算で約 k 桁の精度を失う（倍精度の数は約16桁）。ガウス RBF では ε の選び方が結果を左右する', MARGIN_X + 0.35, 6.2, CONTENT_W - 0.7, 0.62, { fontSize: 14, color: C.white, valign: 'middle', bold: true });
}

// =====================================================================
// 10. 第4章 多項式の項
// =====================================================================
{
  const slide = contentSlide('04　多項式の項', '多項式の項 ― 平面を正しく再現する', [
    '多重調和スプラインには、低い次数の多項式を足します。2次元の TPS なら平面 c0 + c1x + c2y です。',
    '未知数が3つ増えるので条件も3つ足します。重みの和が 0、重みと座標を掛けた和も 0 です。まとめるとブロックの形の連立方程式になります。',
    'すべての点が一直線上に並んでいなければ、解はただ1つに決まります。データが平面の上にあれば重みはすべて 0 になり、補間の結果はその平面そのものです。',
  ]);
  formulaBar(slide, 'poly', MARGIN_X, 1.55, CONTENT_W, 1.15, { scale: 0.6, note: 'TPS は平面 c_{0} + c_{1}x + c_{2}y を足す', noteW: 4.3, alt: 's(x) = Σ w_j φ + c0 + c1 x + c2 y' });
  addText(slide, '未知数が3つ増えた分、条件を3つ足す', MARGIN_X, 2.95, 7.2, 0.3, { fontSize: 14, bold: true });
  addFormula(slide, 'constraints', MARGIN_X, 3.3, { scale: 0.5, alt: 'Σ w_j = 0, Σ w_j x_j = 0, Σ w_j y_j = 0' });
  addText(slide, 'まとめると、ブロックの形の連立方程式になる', MARGIN_X, 4.0, 7.2, 0.3, { fontSize: 14, bold: true });
  addFormula(slide, 'block', MARGIN_X, 4.35, { scale: 0.5, alt: '[Φ P; Pᵀ 0][w; c] = [y; 0]' });
  addCard(slide, 8.0, 2.95, 4.73, 2.7, { fill: C.gray, line: null });
  addText(slide, '1次元（r³ ＋ 直線）で確かめる', 8.3, 3.1, 4.2, 0.32, { fontSize: 15, bold: true });
  addFormula(slide, 'second1d', 8.25, 3.55, { scale: 0.46, alt: "s''(x) = 6 Σ w_j |x − x_j| = 0（データの外側）" });
  addText(slide, 'データの外側（x がどの x_{j} より大きい）では s″ = 0 → 曲がらない直線になる。条件が、遠くでの山の影響を打ち消す', 8.3, 4.2, 4.2, 1.3, { fontSize: 13, color: C.slate });
  addCard(slide, MARGIN_X, 5.95, 5.9, 0.85, { fill: C.tealTint, line: null });
  addText(slide, '点がすべて一直線上に並んでいなければ、解はただ1つ', MARGIN_X + 0.3, 5.95, 5.4, 0.85, { fontSize: 14, valign: 'middle' });
  addCard(slide, MARGIN_X + 6.23, 5.95, 5.9, 0.85, { fill: C.goldTint, line: null });
  addText(slide, 'データが平面の上 → w = 0、補間はその平面そのもの', MARGIN_X + 6.53, 5.95, 5.4, 0.85, { fontSize: 14, valign: 'middle', bold: true });
}

// =====================================================================
// 11. 第4章 多項式の効果
// =====================================================================
{
  const slide = contentSlide('04　多項式の項', '多項式の項の効果（1次元）― 点の外側で差が出る', [
    '左は、直線の上に並んだデータです。ガウス RBF だけだと点の間でたわみ、点の外では 0 に戻ってしまい、直線を再現できません。r³ に直線を足すと直線そのものが出てきます。',
    '右は一般のデータです。点の外側で、ガウスは 0 へ戻り、r³ ＋ 直線はまっすぐ伸びていきます。',
    'この r³ ＋ 直線の曲線は自然3次スプラインと同じもので、TPS の1次元版にあたります。',
  ]);
  legendRow(slide, [{ color: GAUSS_COLOR, label: 'ガウス RBF（ε = 0.7、多項式なし）' }, { color: TPS_COLOR, label: 'r³ ＋ 直線（自然3次スプライン）' }, { dot: true, color: C.navy, label: 'データ点' }], MARGIN_X, 1.52);
  const xs = range(-3, 13, 400);
  const panel = (x0, title, values, yr, yticks, gauss, cubic) => {
    addText(slide, title, x0, 1.95, 5.8, 0.3, { fontSize: 14, bold: true });
    const P = plotFrame(slide, { x: x0 + 0.5, y: 2.45, w: 5.3, h: 3.25 }, [-3, 13], yr, { xticks: [0, 4, 8, 12], yticks, xlabel: 'x' });
    // 点の外側を薄く塗る
    [[-3, M.DATA1_X[0]], [M.DATA1_X[M.DATA1_X.length - 1], 13]].forEach(([a, b]) => slide.addShape(pres.shapes.RECTANGLE, { x: P.sx(a), y: P.box.y, w: P.sx(b) - P.sx(a), h: P.box.h, fill: { color: C.gray }, line: { color: C.gray, width: 0.5 } }));
    plotFrame(slide, P.box, [-3, 13], yr, { yticks });
    addCurve(slide, P, xs, xs.map((x) => gauss.at([x])), { color: GAUSS_COLOR, width: 2.5 });
    addCurve(slide, P, xs, xs.map((x) => cubic.at([x])), { color: TPS_COLOR, width: 2.5 });
    addDots(slide, P, M.DATA1_X, values, { d: 0.13 });
    addText(slide, '点の外側', P.sx(-2.95), P.box.y + 0.06, 1.0, 0.22, { fontSize: 10, color: C.muted });
  };
  panel(MARGIN_X, '直線の上のデータ', M.LINE1_Y, [-1.6, 2.6], [-1, 0, 1, 2], lineGauss, lineCubic);
  panel(MARGIN_X + 6.3, '一般のデータ（点の外側も見る）', M.DATA1_Y, [-1.6, 4.4], [-1, 0, 1, 2, 3, 4], gaussDemo, cubicDemo);
  addCard(slide, MARGIN_X, 6.2, CONTENT_W, 0.62, { fill: C.coralTint, line: null });
  addText(slide, 'r³ ＋ 直線の曲線は自然3次スプラインと同じもの ＝ TPS の1次元版。直線のデータでは重みがすべて 0 になる', MARGIN_X + 0.3, 6.2, CONTENT_W - 0.6, 0.62, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 12. 第5章 TPS
// =====================================================================
{
  const slide = contentSlide('05　TPS（薄板スプライン）', 'TPS ― 曲げエネルギーが最小の板', [
    'TPS（薄板スプライン）は、名前のとおり、薄い金属の板を各点の高さにピンで留めた形です。',
    '板を曲げるエネルギー J は、2階微分の2乗の積分です。平面なら 0、強く曲げるほど大きくなります。すべての点を通る関数の中で、この曲げエネルギーを最小にするものが TPS です。',
    '解くと、答えは r² log r を重みつきで足し、平面を加えた形になります。RBF 補間そのものです（デュション、1977年）。r² log r は板の1点に力をかけたときのたわみの形で、重み w はピンが板を押す力です。',
    '板は宙に浮いているので、力の合計もモーメントの合計も 0 です。これが第4章の重みの条件の意味です。',
  ]);
  formulaBar(slide, 'energy', MARGIN_X, 1.55, CONTENT_W, 1.05, { scale: 0.6, note: '2階微分（曲がり具合）の2乗の積分。平面なら 0', noteW: 5.2, alt: 'J[f] = ∬ (f_xx² + 2f_xy² + f_yy²) dx dy' });
  numberedRow(slide, 1, C.coral, MARGIN_X, 2.85, 7.15, 0.75, '全点を通る関数の中で、曲げエネルギー J[f] を最小にする');
  addCard(slide, MARGIN_X, 3.75, 7.15, 1.55);
  addCircle(slide, MARGIN_X + 0.42, 4.15, 0.46, C.teal, '2', { fontSize: 15 });
  addText(slide, '答えは RBF 補間の形（デュション、1977年）', MARGIN_X + 0.85, 3.85, 6.1, 0.38, { fontSize: 15, valign: 'middle' });
  addFormula(slide, 'tpsSolution', MARGIN_X + 0.75, 4.32, { scale: 0.5, alt: 'f(x) = Σ w_j r_j² log r_j + c0 + c1 x + c2 y' });
  numberedRow(slide, 3, C.purple, MARGIN_X, 5.45, 7.15, 1.35, '重みの条件 ＝ 力とモーメントのつり合い', 'Σ w_{j} = 0（力の合計）、Σ w_{j} x_{j} = Σ w_{j} y_{j} = 0（モーメントの合計）→ 板はつり合って動かない');
  addCard(slide, 8.05, 2.85, 4.68, 1.6, { fill: C.tealTint, line: null });
  addText(slide, '基本解（1点を押したときの形）', 8.3, 2.95, 4.2, 0.3, { fontSize: 14, bold: true });
  addFormula(slide, 'green', 8.25, 3.3, { scale: 0.55, alt: 'Δ²(r² log r) = 8πδ' });
  addText(slide, 'w_{j} ＝ ピンが板を押す力', 8.3, 3.95, 4.2, 0.3, { fontSize: 13, color: C.slate });
  addCard(slide, 8.05, 4.6, 4.68, 1.3, { fill: C.purpleTint, line: null });
  addText(slide, lines(['1次元版', '∫ f″(x)^{2} dx を最小 → 自然3次スプライン（|r|^{3} ＋ 直線、第4章の曲線）']), 8.3, 4.7, 4.2, 1.15, { fontSize: 13, paraSpaceAfter: 4 });
  addCard(slide, 8.05, 6.05, 4.68, 0.75, { fill: C.goldTint, line: null });
  addText(slide, 'TPS の曲げエネルギー', 8.3, 6.05, 2.0, 0.75, { fontSize: 12.5, bold: true, valign: 'middle' });
  addFormula(slide, 'tpsEnergy', 10.25, 6.08, { scale: 0.62, alt: 'J = 8π Σ w_j y_j' });
}

// =====================================================================
// 13. 第5章 ピンに板を張る
// =====================================================================
{
  const slide = contentSlide('05　TPS（薄板スプライン）', 'ピンに板を張る ― 曲げエネルギーを比べる', [
    '14本のピンに TPS の板を張ります。まず平面の部分、そこへ r² log r を重みつきで足していくと、板がしなってすべてのピンの先を通ります。',
    '3つ目の図は、板の色を曲げエネルギーの密度に変えたものです。明るいところほど強く曲がっています。山と谷のあいだで強く曲がり、外側はほぼ平らです。',
    `同じピンを通るガウス RBF の面と比べると、曲げエネルギーは TPS が ${fmt(ENERGY_TPS, 0)}、ガウスが ${fmt(ENERGY_GAUSS, 0)} です。ε はガウスの曲げエネルギーがいちばん小さくなる値にしています。すべての点を通る面の中で、TPS の曲げエネルギーがいちばん小さくなります。`,
  ]);
  const w = 2.95;
  [['plane', '① 平面の部分 c_{0} + c_{1}x + c_{2}y'], ['plate', '② ＋ Σ w_{j} r_{j}^{2} log r_{j} → 全ピンを通る'], ['energy', '③ 色 ＝ 曲げの密度（明るいほど強く曲がる）']].forEach(([key, caption], i) => {
    const x = MARGIN_X + i * (w + 0.15);
    const h = addFigure(slide, key, x, 1.55, w, caption);
    addText(slide, caption, x, 1.6 + h, w, 0.5, { fontSize: 12, color: C.slate });
  });
  slide.addChart(pres.charts.BAR, [
    { name: 'TPS', labels: ['曲げエネルギー J'], values: [Number(ENERGY_TPS.toFixed(1))] },
    { name: `ガウス RBF（ε = ${EPS_2D}）`, labels: ['曲げエネルギー J'], values: [Number(ENERGY_GAUSS.toFixed(1))] },
  ], {
    x: 9.95, y: 1.45, w: 2.78, h: 3.15, ...chartBase(), barDir: 'col', barGrouping: 'clustered', chartColors: [TPS_COLOR, GAUSS_COLOR],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', showLegend: true, legendPos: 'b', valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25,
    showTitle: true, title: '曲げエネルギー J',
  });
  addCard(slide, MARGIN_X, 4.75, 6.1, 2.05, { fill: C.gray, line: null });
  addText(slide, lines([
    `TPS：J = 8π Σ w_{j} y_{j} = ${fmt(ENERGY_TPS, 1)}`,
    '（数値積分でも 48.9 で一致）',
    'ピンのまわりや山と谷のあいだで強く曲がり、外側はほぼ平ら',
  ]), MARGIN_X + 0.3, 4.9, 5.6, 1.8, { fontSize: 13.5, paraSpaceAfter: 5 });
  const gh = addFigure(slide, 'energy-gauss', 6.95, 4.75, 2.5, 'ガウス RBF の曲げの密度');
  addText(slide, lines([`ガウス RBF（ε = ${EPS_2D}）：J = ${fmt(ENERGY_GAUSS, 1)}`, 'ε は、ガウスの J が最小になるあたりの値', '→ 全点を通る面の中で TPS が最小']), 9.6, 4.85, 3.13, gh - 0.1, { fontSize: 12.5, paraSpaceAfter: 5 });
}

// =====================================================================
// 14. 第6章 形と理由
// =====================================================================
{
  const slide = contentSlide('06　RBF と TPS の関係', 'RBF と TPS の関係 ― 形と理由', [
    'RBF 補間は、基底関数 φ と多項式 p を選んで使う枠組みです。φ に r² log r、p に平面を選んだものが TPS で、TPS は RBF の特別な場合です。',
    '逆に、曲げエネルギー最小という条件から出発すると、答えは必ずこの RBF の形になります。形は RBF、理由はエネルギー最小。2つの見方が同じ答えに行き着きます。',
    'この考え方を次元に合わせて広げたのが多重調和スプラインです。また TPS には幅のパラメータがなく、全部の座標を同じ倍率で変えても、増えた分は平面の項に吸収されて同じ面になります。',
  ]);
  addCard(slide, MARGIN_X, 1.55, CONTENT_W, 0.95, { fill: C.navy, line: null });
  addText(slide, lines(['RBF 補間 ＝ 基底関数 φ と多項式 p を選んで使う「枠組み」', 'φ = r^{2} log r、p ＝ 平面 → TPS（RBF の特別な場合）']), MARGIN_X + 0.35, 1.55, CONTENT_W - 0.7, 0.95, { fontSize: 15, color: C.white, valign: 'middle', bold: true, paraSpaceAfter: 2 });
  const cw = 5.55;
  addCard(slide, MARGIN_X, 2.75, cw, 1.75, { fill: C.tealTint, line: null });
  addText(slide, lines(['RBF から見ると ＝ 形', 'φ を各点に置いて足す', 's(x) = Σ w_{j} φ(r_{j}) + p(x)']), MARGIN_X + 0.35, 2.9, cw - 0.7, 1.5, { fontSize: 14, paraSpaceAfter: 5 });
  addCard(slide, SLIDE_W - MARGIN_X - cw, 2.75, cw, 1.75, { fill: C.coralTint, line: null });
  addText(slide, lines(['TPS から見ると ＝ 理由', '曲げエネルギー J[f] が最小になる面', '答えは r^{2} log r ＋ 平面']), SLIDE_W - MARGIN_X - cw + 0.35, 2.9, cw - 0.7, 1.5, { fontSize: 14, paraSpaceAfter: 5 });
  addCircle(slide, SLIDE_W / 2, 3.62, 0.62, C.navy, '⇄', { fontSize: 20 });
  addText(slide, '→ 2つの見方が、同じ答えに行き着く', MARGIN_X, 4.6, CONTENT_W, 0.35, { fontSize: 15, bold: true, align: 'center', color: C.navy });
  addText(slide, '多重調和スプライン（2階微分のエネルギー）', MARGIN_X, 5.05, 6.6, 0.3, { fontSize: 13, bold: true });
  addTable(slide, ['次元 d', 'φ(r)', '名前'], [['1', 'r^{3}', '自然3次スプライン'], ['2', 'r^{2} log r', '薄板スプライン（TPS）'], ['3', 'r', '3次元の多重調和']], MARGIN_X, 5.4, [1.2, 1.9, 3.5], { rowH: 0.33, fontSize: 12, highlight: { 1: C.goldTint } });
  addCard(slide, 7.55, 5.05, 5.18, 1.75, { fill: C.gray, line: null });
  addText(slide, 'スケール不変（全部の座標を同じ倍率で）', 7.8, 5.15, 4.7, 0.3, { fontSize: 13, bold: true });
  addFormula(slide, 'scale', 7.75, 5.5, { scale: 0.5, alt: 'φ(ar) = a² φ(r) + a² log a · r²' });
  addText(slide, '増えた r^{2} の分は平面の項に吸収 → 同じ面（幅の調整がいらない理由）', 7.8, 6.05, 4.75, 0.65, { fontSize: 12, color: C.slate });
}

// =====================================================================
// 15. 第6章 系統図
// =====================================================================
{
  const slide = contentSlide('06　RBF と TPS の関係', 'RBF の系統図', [
    'いちばん上が、RBF 補間という枠組みです。左の枝は幅 ε を持つ基底関数で、ガウス RBF 補間はノイズなしのガウス過程回帰の平均と同じ式になり、基底関数が共分散にあたります。',
    '右の枝は多重調和スプラインです。次元ごとに基底関数が決まり、2次元の r² log r が TPS です。',
    '右の枝の根拠が、曲げエネルギー最小という変分原理です。ノイズがあるときの平滑化は、ガウス過程回帰のノイズの分散に対応します。',
  ]);
  const root = { x: 4.17, y: 1.5, w: 5.0, h: 0.95 };
  const left = { x: MARGIN_X, y: 2.95, w: 5.6, h: 1.85 };
  const right = { x: SLIDE_W - MARGIN_X - 5.6, y: 2.95, w: 5.6, h: 1.85 };
  const gp = { x: MARGIN_X, y: 5.25, w: 5.0, h: 1.55 };
  const energy = { x: SLIDE_W - MARGIN_X - 5.0, y: 5.25, w: 5.0, h: 1.55 };
  const mid = (root.y + root.h + left.y) / 2;
  addLine(slide, SLIDE_W / 2, root.y + root.h, SLIDE_W / 2, mid, { color: C.slate, width: 1.75 });
  addLine(slide, left.x + left.w / 2, mid, right.x + right.w / 2, mid, { color: C.slate, width: 1.75 });
  addLine(slide, left.x + left.w / 2, mid, left.x + left.w / 2, left.y, { color: C.teal, width: 1.75 });
  addLine(slide, right.x + right.w / 2, mid, right.x + right.w / 2, right.y, { color: C.coral, width: 1.75 });
  addLine(slide, gp.x + gp.w / 2, left.y + left.h, gp.x + gp.w / 2, gp.y, { color: C.teal, width: 1.75 });
  addLine(slide, energy.x + energy.w / 2, right.y + right.h, energy.x + energy.w / 2, energy.y, { color: C.coral, width: 1.75 });
  addLine(slide, gp.x + gp.w, gp.y + 0.75, energy.x, energy.y + 0.75, { color: C.slate, width: 1.5, dash: 'dash' });
  addText(slide, lines(['平滑化 λ', '↔ ノイズの分散']), gp.x + gp.w, gp.y + 0.2, energy.x - gp.x - gp.w, 0.5, { fontSize: 11, color: C.slate, align: 'center' });
  addCard(slide, root.x, root.y, root.w, root.h, { line: C.navy });
  addText(slide, lines(['RBF 補間（枠組み）', 's(x) = Σ w_{j} φ(‖x − x_{j}‖) + p(x)']), root.x + 0.3, root.y, root.w - 0.6, root.h, { fontSize: 14, valign: 'middle', align: 'center', paraSpaceAfter: 3 });
  addCard(slide, left.x, left.y, left.w, left.h, { fill: C.tealTint, line: null });
  addText(slide, '幅 ε を持つ（正定値など）', left.x + 0.3, left.y + 0.12, left.w - 0.6, 0.35, { fontSize: 15, bold: true });
  addBullets(slide, ['ガウス　exp(−(εr)^{2})', '逆多重二次　1 / √(1 + (εr)^{2})', '多重二次　√(1 + (εr)^{2})'], left.x + 0.35, left.y + 0.55, left.w - 0.6, 1.25, { fontSize: 13, space: 4 });
  addCard(slide, right.x, right.y, right.w, right.h, { fill: C.coralTint, line: null });
  addText(slide, '多重調和スプライン（ε なし ＋ 多項式）', right.x + 0.3, right.y + 0.12, right.w - 0.6, 0.35, { fontSize: 15, bold: true });
  addBullets(slide, ['1次元　r^{3} → 自然3次スプライン', { text: '2次元　r^{2} log r → TPS（薄板スプライン）', bold: true }, '3次元　r'], right.x + 0.35, right.y + 0.55, right.w - 0.6, 1.25, { fontSize: 13, space: 4 });
  addCard(slide, gp.x, gp.y, gp.w, gp.h, { line: C.teal });
  addText(slide, lines(['ガウス過程回帰・クリギング', 'ガウス RBF 補間 ＝ ノイズなしのガウス過程回帰の平均（φ ＝ 共分散のカーネル）']), gp.x + 0.3, gp.y + 0.12, gp.w - 0.6, gp.h - 0.2, { fontSize: 13, paraSpaceAfter: 5 });
  addCard(slide, energy.x, energy.y, energy.w, energy.h, { line: C.coral });
  addText(slide, lines(['変分原理（エネルギー最小）', '曲げエネルギー J[f] を最小にする関数 → r^{2} log r ＋ 平面（デュション、1977年）']), energy.x + 0.3, energy.y + 0.12, energy.w - 0.6, energy.h - 0.2, { fontSize: 13, paraSpaceAfter: 5 });
}

// =====================================================================
// 16. 第6章 並べて比べる
// =====================================================================
{
  const slide = contentSlide('06　RBF と TPS の関係', 'ガウス RBF と TPS を並べる ― 点の外側で差が出る', [
    '同じ14点で、ガウス RBF と TPS の面を並べます。データのある白い点線の枠の内側では、どちらもよく似た面です。',
    '外側へ広げると、ガウスは点から離れると 0 へ戻り、TPS は平面に沿って伸びていきます。',
    'ガウスは ε を変えると面の形が変わりますが、TPS には調整するものがありません。',
  ]);
  const w = (CONTENT_W - 0.3) / 2;
  [['wide-gauss', `ガウス RBF（ε = ${EPS_2D}）`, '点から離れると 0 に戻る。ε を変えると形が変わる', GAUSS_COLOR], ['wide-tps', 'TPS', '平面に沿って伸びる。調整するものがない', TPS_COLOR]].forEach(([key, title, desc, color], i) => {
    const x = MARGIN_X + i * (w + 0.3);
    const h = addFigure(slide, key, x, 1.5, w, title);
    addCircle(slide, x + 0.14, 1.68 + h, 0.16, color);
    addText(slide, title, x + 0.32, 1.55 + h, w - 0.3, 0.3, { fontSize: 15, bold: true });
    addText(slide, desc, x + 0.32, 1.88 + h, w - 0.3, 0.3, { fontSize: 13, color: C.slate });
  });
}

// =====================================================================
// 17. 第6章 使い分け
// =====================================================================
{
  const slide = contentSlide('06　RBF と TPS の関係', 'ガウス RBF と TPS の使い分け', [
    '使い分けを表にまとめます。ガウス RBF は幅 ε が結果を大きく左右し、点から離れると 0 に戻ります。何回でも微分できるなめらかさを持ちます。',
    'TPS は調整するものがなく、平面を足せば解け、点から離れると平面に沿います。点の上では2階微分が log で発散します。',
    '何回でも微分できるなめらかさや局所的な山が欲しいならガウス、調整なしでなだらかで自然な面が欲しいなら TPS が向いています。',
  ]);
  addTable(slide, ['', 'ガウス RBF', 'TPS'], [
    ['調整するもの', '幅 ε（結果を大きく左右）', 'なし（スケール不変）'],
    ['解けるか', '必ず解ける（正定値）', '平面を足せば解ける（一直線でなければ）'],
    ['点から離れると', '0 に戻る', '平面に沿って伸びる'],
    ['なめらかさ', '何回でも微分できる', '点の上で2階微分が log で発散'],
    ['計算の安定性', 'ε が小さいと不安定', '比較的安定'],
    ['向く用途', '局所的な山、カーネル法', '地形や面内分布など、なだらかな面'],
  ], MARGIN_X, 1.6, [2.4, 4.86, 4.87], { rowH: 0.62, fontSize: 14 });
  addCard(slide, MARGIN_X, 6.1, CONTENT_W, 0.7, { fill: C.navy, line: null });
  addText(slide, '何回でも微分できるなめらかさや局所的な山 → ガウス。調整なしで、なだらかで自然な面 → TPS', MARGIN_X + 0.35, 6.1, CONTENT_W - 0.7, 0.7, { fontSize: 15, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 18. 第7章 平滑化 TPS
// =====================================================================
{
  const slide = contentSlide('07　平滑化 TPS', '平滑化 TPS ― ノイズがあるとき', [
    '実際のデータには測定のばらつき（ノイズ）があります。全点を通すと、ノイズまで拾って面が波打ちます。',
    'そこで、点からのずれと曲げエネルギーの和を最小にします。λ はどちらを重く見るかを決める重みです。答えの形は同じで、Φ の対角に 8πλ を足すだけです。',
    'λ が 0 なら全点を通る補間、λ を大きくすると曲げられなくなり、最後は最小二乗の平面になります。λ は交差検証などでデータから選びます。ガウス過程回帰でいえば、ノイズの分散にあたります。',
  ]);
  formulaBar(slide, 'smoothObjective', MARGIN_X, 1.55, CONTENT_W, 1.2, { scale: 0.6, note: '点からのずれ ＋ λ × 曲げエネルギー', noteW: 4.2, alt: 'min Σ (y_i − f(x_i))² + λ J[f]' });
  addText(slide, 'λ は、点からのずれと曲げのどちらを重く見るかを決める重み', MARGIN_X, 3.0, 7.0, 0.3, { fontSize: 14, bold: true });
  addFormula(slide, 'smoothBlock', MARGIN_X, 3.45, { scale: 0.56, alt: '[Φ + 8πλI P; Pᵀ 0][w; c] = [y; 0]' });
  addText(slide, '答えの形は同じ。Φ の対角に 8πλ を足すだけ', MARGIN_X, 4.2, 7.0, 0.3, { fontSize: 14, color: C.slate });
  [[C.gray, 'λ = 0：全点を通る補間（ノイズも拾う）'], [C.gray, 'λ → ∞：曲げられない → 最小二乗の平面'], [C.purpleTint, '1次元では Σ(y_{i} − f(x_{i}))^{2} + λ ∫ f″^{2} dx → 平滑化スプライン（対角に 12λ）']].forEach(([fill, text], i) => {
    addCard(slide, 7.8, 3.0 + i * 0.9, 4.93, 0.78, { fill, line: null });
    addText(slide, text, 8.05, 3.0 + i * 0.9, 4.5, 0.78, { fontSize: 13, valign: 'middle' });
  });
  addCard(slide, MARGIN_X, 5.85, CONTENT_W, 0.95, { fill: C.tealTint, line: null });
  addText(slide, lines(['λ は交差検証（1点抜き、GCV など）でデータから選ぶ', 'ガウス過程回帰でいえば、λ はノイズの分散にあたる']), MARGIN_X + 0.35, 5.85, CONTENT_W - 0.7, 0.95, { fontSize: 14, valign: 'middle', paraSpaceAfter: 3 });
}

// =====================================================================
// 19. 第7章 λ を変える
// =====================================================================
{
  const cvSmall = cvAt(1e-6);
  const cvBest = CV_VALUES[CV_BEST_INDEX];
  const cvLarge = cvAt(1e3);
  const slide = contentSlide('07　平滑化 TPS', 'λ を変える ― 1点抜き交差検証で選ぶ', [
    `ノイズを含む ${M.NOISY_X.length} 個の点です。点線がもとのなめらかな関数です。`,
    'λ がほぼ 0 では全点を通るため、ノイズを拾って波打ちます。λ を大きくすると曲げにくくなり、ノイズをならした曲線になります。さらに大きくすると最小二乗の直線になり、山や谷が消えてしまいます。',
    `右は1点抜き交差検証の誤差です。λ が約 ${fmt(LAMBDA_BEST, 2)} で最小になり、もとの関数に近い曲線が選ばれます。`,
  ]);
  legendRow(slide, [{ color: C.navy, label: 'もとの関数', dash: 'dash', width: 1.5 }, { color: C.line2, label: 'λ ≈ 0（補間）' }, { color: TPS_COLOR, label: `λ ≈ ${fmt(LAMBDA_BEST, 2)}（最小）`, width: 3 }, { color: PLANE_COLOR, label: 'λ = 1000（直線）' }], MARGIN_X, 1.52);
  const P = plotFrame(slide, { x: 1.15, y: 2.0, w: 6.9, h: 4.1 }, [0, 10], [-1.2, 2.8], { xticks: [0, 2, 4, 6, 8, 10], yticks: [-1, 0, 1, 2], xlabel: 'x' });
  const xs = range(0, 10, 400);
  addCurve(slide, P, xs, xs.map(M.curve1D), { color: C.navy, width: 1.5, dash: 'dash' });
  [[1e-6, C.line2, 1.75], [1e3, PLANE_COLOR, 2], [LAMBDA_BEST, TPS_COLOR, 3]].forEach(([lambda, color, width]) => {
    const model = M.smoothingSpline1D(M.NOISY_X, M.NOISY_Y, lambda);
    addCurve(slide, P, xs, xs.map((x) => model.at([x])), { color, width });
  });
  addDots(slide, P, M.NOISY_X, M.NOISY_Y, { d: 0.11 });
  addText(slide, '1点抜き交差検証の誤差 CV(λ)', 8.55, 1.95, 4.2, 0.3, { fontSize: 13, bold: true });
  const Q = plotFrame(slide, { x: 9.15, y: 2.45, w: 3.55, h: 2.2 }, [-6, 3], [0, 0.4], { xticks: [-6, -3, 0, 3], yticks: [0, 0.2, 0.4], fmtX: (v) => `10${String(v).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`, fmtY: (v) => fmt(v, 1), xlabel: 'λ' });
  addCurve(slide, Q, CV_LOGS, CV_VALUES, { color: C.teal, width: 2.5 });
  addLine(slide, Q.sx(CV_LOGS[CV_BEST_INDEX]), Q.box.y, Q.sx(CV_LOGS[CV_BEST_INDEX]), Q.box.y + Q.box.h, { color: C.goldText, width: 1.5, dash: 'dash' });
  addDots(slide, Q, [CV_LOGS[CV_BEST_INDEX]], [cvBest], { color: TPS_COLOR, d: 0.14 });
  addCard(slide, 8.55, 5.35, 4.18, 1.45, { fill: C.coralTint, line: null });
  addText(slide, lines([`λ ≈ ${fmt(LAMBDA_BEST, 2)} で最小（CV ${fmt(cvBest, 3)}）`, `λ ≈ 0：CV ${fmt(cvSmall, 3)} ／ λ = 1000：CV ${fmt(cvLarge, 3)}`]), 8.8, 5.35, 3.8, 1.45, { fontSize: 13.5, valign: 'middle', paraSpaceAfter: 5 });
}

// =====================================================================
// 20. 第8章 式はそのまま
// =====================================================================
{
  const slide = contentSlide('08　説明変数が3つ以上のとき', '説明変数が3つ以上 ― 式はそのまま使える', [
    'ここからは、説明変数が3つ以上の場合です。式はそのままで、距離を d 個の変数で計算し、平面の項を1次式に広げるだけです。',
    '行列 Φ は点の数 n だけで決まり、d が増えても大きくなりません。増えるのは P の列だけです。解ける条件は、点が d+1 個以上あり、すべてが1つの超平面の上に乗っていないことです。',
    'r² log r に1次式を足した形は、どの次元でも必ず解けます。ただし、2階微分のエネルギー最小という意味は、2次元のときだけのものです。',
  ]);
  formulaBar(slide, 'multi', MARGIN_X, 1.55, CONTENT_W, 1.15, { scale: 0.6, note: 'd：説明変数の数　n：データ点の数', noteW: 3.6, alt: 's(x) = Σ w_j φ + c0 + c1 x1 + … + cd xd' });
  addFormula(slide, 'distance', MARGIN_X, 2.9, { scale: 0.5, alt: '‖x − x_j‖ = √((x1 − xj1)² + … + (xd − xjd)²)' });
  const rows = [
    [C.teal, 'Φ は n × n のまま（d によらない）', '増えるのは P の列だけ（n × (d+1)）'],
    [C.coral, '解ける条件', '点が d+1 個以上で、すべてが1つの超平面に乗っていない'],
    [C.purple, 'r^{2} log r ＋ 1次式は、どの次元でも必ず解ける', '条件付き正定値。ただし「板」の意味は2次元だけ'],
  ];
  rows.forEach(([color, title, desc], i) => numberedRow(slide, i + 1, color, MARGIN_X, 3.42 + i * 0.98, 7.4, 0.88, title, desc, { descSize: 12 }));
  addCard(slide, 8.35, 2.9, 4.38, 3.1, { fill: C.gray, line: null });
  addText(slide, '3変数の例', 8.6, 3.0, 3.9, 0.3, { fontSize: 14, bold: true });
  addFormula(slide, 'p3', 8.55, 3.45, { scale: 0.52, alt: 'P = [1 x11 x12 x13; …; 1 xn1 xn2 xn3]' });
  addText(slide, '未知数：重み n 個 ＋ 平面の項 4 個', 8.6, 5.4, 3.9, 0.35, { fontSize: 13, color: C.slate });
  addCard(slide, MARGIN_X, 6.38, CONTENT_W, 0.5, { fill: C.coralTint, line: null });
  addText(slide, 'ただし「2階微分のエネルギー最小」という意味は、2次元のときだけのもの（次のページ）', MARGIN_X + 0.3, 6.38, CONTENT_W - 0.6, 0.5, { fontSize: 13.5, bold: true, valign: 'middle' });
}

// =====================================================================
// 21. 第8章 基底は次元で変わる
// =====================================================================
{
  const slide = contentSlide('08　説明変数が3つ以上のとき', 'エネルギーに対応する基底は、次元で変わる', [
    '2階微分のエネルギーに対応する基底関数、つまり1点を押したときの形は、次元によって r³、r² log r、r、log r、1/r と変わります。',
    'd が 4 以上では基底が r = 0 で無限大になります。細いとげを立ててもエネルギーがほとんど増えず、点を通すという条件が効かなくなるためです。',
    'エネルギー最小の意味を保つには、微分の階数 m を d/2 より大きくします。すると多項式の項が急に増え、d = 10 では 3003 個になります。そこで実際には、r² log r や r に1次式を足した形のまま使うことが多いです。',
  ]);
  const curves = [
    [1, (r) => r ** 3, C.purple, 'd = 1：r³'], [2, (r) => r * r * Math.log(r), C.goldText, 'd = 2：r² log r'], [3, (r) => r, C.teal, 'd = 3：r'],
    [4, (r) => -Math.log(r), C.coral, 'd = 4：−log r'], [5, (r) => 1 / r, C.navy, 'd = 5：1/r'],
  ];
  legendRow(slide, curves.slice(0, 3).map(([, , color, label]) => ({ color, label })), MARGIN_X, 1.52);
  legendRow(slide, curves.slice(3).map(([, , color, label]) => ({ color, label })), MARGIN_X, 1.82);
  const P = plotFrame(slide, { x: 1.15, y: 2.3, w: 5.6, h: 3.8 }, [0, 2.2], [-1, 4], { xticks: [0, 1, 2], yticks: [-1, 0, 1, 2, 3, 4], xlabel: 'r' });
  const rs = range(0.003, 2.2, 400);
  curves.forEach(([, f, color]) => addCurve(slide, P, rs, rs.map(f), { color, width: 2.25 }));
  addText(slide, 'r → 0 で無限大（d ≥ 4）', P.sx(0.42), P.box.y + 0.08, 2.4, 0.25, { fontSize: 11.5, bold: true, color: C.coral });
  addText(slide, '1点を押したときの形（2階微分のエネルギーに対応する基底、定数倍は省略）', MARGIN_X, 6.45, 6.5, 0.3, { fontSize: 11, color: C.muted });
  addText(slide, 'エネルギー最小を保つときの m と多項式の項数', 7.35, 1.55, 5.38, 0.3, { fontSize: 13, bold: true });
  addTable(slide, ['変数 d', '階数 m', 'φ(r)', '多項式の項数'], [['2', '2', 'r^{2} log r', '3'], ['3', '2', 'r', '4'], ['4', '3', 'r^{2} log r', '15'], ['5', '3', 'r', '21'], ['6', '4', 'r^{2} log r', '84'], ['10', '6', 'r^{2} log r', '3003']], 7.35, 1.95, [1.15, 1.15, 1.5, 1.58], { rowH: 0.4, fontSize: 13, highlight: { 5: C.coralTint } });
  addText(slide, '条件：m > d/2（偶数次元は r^{2} log r、奇数次元は r）', 7.35, 4.85, 5.38, 0.3, { fontSize: 13, bold: true });
  addCard(slide, 7.35, 5.35, 5.38, 1.45, { fill: C.goldTint, line: null });
  addText(slide, '実際には r^{2} log r や r に1次式を足した形のまま使うことが多い（解くことはできるが、板の話ではなくなる）', 7.6, 5.35, 4.9, 1.45, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 22. 第8章 距離がそろう
// =====================================================================
{
  const nearest2 = histogram(2).nearestRatio;
  const nearest50 = histogram(50).nearestRatio;
  const slide = contentSlide('08　説明変数が3つ以上のとき', '距離がそろう ― 次元の呪い', [
    '変数が増えると、点どうしの距離がそろいます。標準化した変数なら、距離のばらつきは平均のおよそ 1/√(2d) になります。空間を同じ細かさで埋める点の数も、1軸10点なら 10 の d 乗個です。',
    '距離がそろう範囲では、φ(r) は r² の1次式に近づきます。すると第4章の重みの条件で、x を含む項が打ち消し合い、定数だけが残ります。',
    '結果として TPS は「平面 ＋ 点のまわりだけの山」に近づきます。ガウスは ε を固定したままだと 0 に戻ります。',
  ]);
  addFormula(slide, 'r2', MARGIN_X, 1.5, { scale: 0.45, alt: 'r² = Σ (x_k − x′_k)²' });
  addText(slide, lines(['標準化した独立な変数では', '距離の平均 ≈ √(2d)、標準偏差 ÷ 平均 ≈ 1/√(2d)']), 2.25, 1.55, 5.5, 0.6, { fontSize: 13.5, paraSpaceAfter: 2 });
  numberedRow(slide, 1, C.teal, MARGIN_X, 2.35, 7.3, 0.72, '距離がそろう範囲では φ(r) ≈ a + b r^{2}');
  addCard(slide, MARGIN_X, 3.2, 7.3, 1.7);
  addCircle(slide, MARGIN_X + 0.42, 3.58, 0.46, C.coral, '2', { fontSize: 15 });
  addText(slide, '第4章の条件 Σ w_{j} = 0、Σ w_{j} x_{j} = 0 で、x を含む項が消える', MARGIN_X + 0.85, 3.3, 6.3, 0.55, { fontSize: 14, valign: 'middle' });
  addFormula(slide, 'cancel', MARGIN_X + 0.3, 3.95, { scale: 0.42, alt: 'Σ w_j r_j² = Σ w_j ‖x_j‖²（定数）' });
  addCard(slide, MARGIN_X, 5.05, 7.3, 1.75, { fill: C.navy, line: null });
  addCircle(slide, MARGIN_X + 0.42, 5.5, 0.46, C.purple, '3', { fontSize: 15 });
  addText(slide, [{ text: 's(x) ≈ 平面 ＋ 点のまわりだけの山', fontSize: 19, bold: true, breakLine: true }, { text: 'ガウスは ε 固定のままだと 0 に戻る（第6章の「外側」と同じ）' }], MARGIN_X + 0.85, 5.15, 6.3, 1.55, { fontSize: 13.5, color: C.white, valign: 'middle', paraSpaceAfter: 6 });
  addText(slide, '同じ細かさで埋める点の数（1軸10点）', 8.2, 1.55, 4.53, 0.3, { fontSize: 13, bold: true });
  addTable(slide, ['変数 d', '点の数'], [['2', '100'], ['3', '1,000'], ['5', '10万'], ['10', '100億']], 8.2, 1.95, [1.8, 2.73], { rowH: 0.4, fontSize: 13, highlight: { 3: C.coralTint } });
  addCard(slide, 8.2, 4.25, 4.53, 2.55, { fill: C.tealTint, line: null });
  addText(slide, `${fmt(nearest50, 2)} 倍`, 8.45, 4.4, 4.0, 0.75, { fontSize: 34, bold: true, color: C.teal, valign: 'middle' });
  addText(slide, `d = 50 では、いちばん近い点でも平均距離の ${fmt(nearest50, 2)} 倍離れている（d = 2 では ${fmt(nearest2, 2)} 倍）。ほとんどの場所が「点の外側」になる`, 8.45, 5.2, 4.05, 1.5, { fontSize: 13 });
}

// =====================================================================
// 23. 第8章 平面に近づく
// =====================================================================
{
  const slide = contentSlide('08　説明変数が3つ以上のとき', '変数を増やすと、TPS は平面に近づく', [
    `点の数は ${D.pointCount} 個のまま、変数を増やします。左は点どうしの距離の分布で、平均距離を 1 にそろえています。変数が増えるほど分布は細くなります。`,
    '右は、データ点 A から新しい点 Q までの値です。d = 2 では TPS はもとの関数をなめらかに追います。d = 50 では、TPS は A を離れると平面に沿うようになり、A のまわりだけの山が残ります。',
    'ε を固定したガウスは点を離れるとすぐ 0 に戻ります。第6章で見た外側の振る舞いが、ほぼ全体の振る舞いになるのです。',
  ]);
  const labels = histogram(2).density.map((_, i) => (i % 10 === 0 ? (i * D.histBin).toFixed(1) : ''));
  [[2, 1.55], [50, 4.25]].forEach(([d, y]) => {
    slide.addChart(pres.charts.BAR, [{ name: `d = ${d}`, labels, values: histogram(d).density }], {
      x: MARGIN_X, y, w: 6.0, h: 2.5, ...chartBase(), barDir: 'col', chartColors: [C.teal], barGapWidthPct: 15, showLegend: false,
      showTitle: true, title: `d = ${d}：点どうしの距離の分布（いちばん近い点 ÷ 平均距離 = ${fmt(histogram(d).nearestRatio, 2)}）`,
      valAxisMinVal: 0, valAxisMaxVal: 4.4, valAxisMajorUnit: 2, valAxisLabelFormatCode: '0', catAxisTitle: '距離 ÷ 平均距離', showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: C.muted,
    });
  });
  legendRow(slide, [{ color: C.navy, label: 'もとの関数', dash: 'dash', width: 1.5 }, { color: PLANE_COLOR, label: '平面' }, { color: TPS_COLOR, label: 'TPS', width: 3 }, { color: GAUSS_COLOR, label: `ガウス（ε = ${D.fixedEps}）` }], 7.2, 1.52);
  const ts = histogram(2).section.tps.map((_, i, all) => i / (all.length - 1));
  [[2, 2.25], [50, 4.75]].forEach(([d, y]) => {
    const h = histogram(d);
    addText(slide, `d = ${d}：データ点 A から新しい点 Q まで`, 7.2, y - 0.38, 5.5, 0.3, { fontSize: 13, bold: true });
    const P = plotFrame(slide, { x: 7.75, y, w: 4.95, h: 1.6 }, [0, 1], [-3, 3], { xticks: [0, 1], yticks: [-2, 0, 2], fmtX: (v) => (v === 0 ? 'A（データ点）' : 'Q（新しい点）') });
    addCurve(slide, P, ts, h.section.truth, { color: C.navy, width: 1.5, dash: 'dash' });
    addCurve(slide, P, ts, h.section.plane, { color: PLANE_COLOR, width: 2 });
    addCurve(slide, P, ts, h.section.gauss, { color: GAUSS_COLOR, width: 2 });
    addCurve(slide, P, ts, h.section.tps, { color: TPS_COLOR, width: 3 });
  });
}

// =====================================================================
// 24. 第8章 尺度と関係のない変数
// =====================================================================
{
  const slide = contentSlide('08　説明変数が3つ以上のとき', '変数の尺度と、関係のない変数', [
    '距離は全部の変数を足し合わせます。単位の違う変数は尺度 ℓ で割ってそろえます。ふつうは標準偏差で割る標準化をします。',
    '第6章のスケール不変は、全部の座標を同じ倍率で変えるときだけの話です。変数ごとに単位が違えば、TPS でも尺度が隠れた調整項目になります。',
    '距離には関係のない変数もそのまま入ります。RBF は効く変数を自分では選べません。変数を選ぶか、ガウス過程回帰のように変数ごとの尺度を学習します。',
  ]);
  formulaBar(slide, 'scaledDistance', MARGIN_X, 1.55, CONTENT_W, 1.3, { scale: 0.5, note: 'ℓ_{k}：変数 k の尺度（ふつうは標準偏差 ＝ 標準化）', noteW: 5.5, alt: 'r² = Σ ((x_k − x′_k)/ℓ_k)²' });
  const w = (CONTENT_W - 0.3) / 2;
  addCard(slide, MARGIN_X, 3.1, w, 1.85, { fill: C.coralTint, line: null });
  addText(slide, lines(['スケール不変は「全部の座標を同じ倍率」のときだけ', '変数ごとに単位が違う → TPS でも尺度 ℓ_{k} が隠れた調整項目になる']), MARGIN_X + 0.35, 3.25, w - 0.7, 1.6, { fontSize: 14, paraSpaceAfter: 8 });
  addCard(slide, MARGIN_X + w + 0.3, 3.1, w, 1.85, { fill: C.purpleTint, line: null });
  addText(slide, lines(['距離には、関係のない変数もそのまま入る', 'RBF は、効く変数を自分では選べない']), MARGIN_X + w + 0.65, 3.25, w - 0.7, 1.6, { fontSize: 14, paraSpaceAfter: 8 });
  addText(slide, '3変数以上で使うときの対策', MARGIN_X, 5.15, 6, 0.3, { fontSize: 14, bold: true });
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  [[C.teal, '標準化して、単位をそろえる'], [C.coral, '関係のない変数を外す'], [C.purple, '変数ごとの尺度 ℓ_{k} を学習する（ガウス過程回帰の ARD）']].forEach(([color, text], i) => numberedRow(slide, i + 1, color, MARGIN_X + i * (cw + 0.3), 5.55, cw, 1.2, text, null, { titleSize: 14 }));
}

// =====================================================================
// 25. 第8章 誤差で確かめる
// =====================================================================
{
  const base = unit(1).tps;
  const demo = unit(100).tps;
  const slide = contentSlide('08　説明変数が3つ以上のとき', '誤差で確かめる ― 単位と関係のない変数の影響', [
    `3変数のうち1つだけ単位を 100 倍にすると、平面は変わりませんが、TPS の誤差は ${fmt(base, 2)} から ${fmt(demo, 2)} へ、約 ${fmt(demo / base, 1)} 倍になります。`,
    '右は、効く変数が2つだけの関数に関係のない変数を足した結果です。変数が増えるほど TPS の誤差は平面に近づき、d が 10〜15 のあたりで並びます。',
    `ガウスは ε 固定だと誤差が ${fmt(gaussFixedWorst, 1)} まで悪化します。ε を距離の中央値に合わせると、この例では変数が少ないうちは TPS より良く、多いと同じく平面の誤差に近づきます。3変数以上では、標準化し、関係のない変数を外し、平面（線形回帰）の誤差と比べて効果を確かめることが大切です。`,
  ]);
  const unitLabels = D.units.map((u) => `×${u.scale}`);
  slide.addChart([
    lineSeries('TPS', unitLabels, D.units.map((u) => u.tps), TPS_COLOR),
    lineSeries('平面（線形回帰）', unitLabels, D.units.map((u) => u.plane), PLANE_COLOR, { dash: 'dash', size: 5 }),
  ], {
    x: MARGIN_X, y: 1.5, w: 5.9, h: 4.35, ...chartBase(), showTitle: true, title: '1つの変数の単位だけを変える（3変数、誤差 RMSE）',
    valAxisMinVal: 0, valAxisMaxVal: 0.9, valAxisMajorUnit: 0.3, valAxisLabelFormatCode: '0.0', showLegend: true, legendPos: 'b',
    catAxisTitle: '変数 x₃ の単位の倍率', showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: C.muted,
  });
  const dimLabels = D.errors.map((e) => String(e.d));
  slide.addChart([
    lineSeries('TPS', dimLabels, D.errors.map((e) => e.tps), TPS_COLOR),
    lineSeries('平面（線形回帰）', dimLabels, D.errors.map((e) => e.plane), PLANE_COLOR, { dash: 'dash', size: 5 }),
    lineSeries(`ガウス（ε = ${D.fixedEps} 固定）`, dimLabels, D.errors.map((e) => e.gaussFixed), C.navy, { size: 5 }),
    lineSeries('ガウス（ε ＝ 1 ÷ 距離の中央値）', dimLabels, D.errors.map((e) => e.gaussScaled), GAUSS_COLOR, { size: 5 }),
  ], {
    x: 6.83, y: 1.5, w: 5.9, h: 4.35, ...chartBase(), showTitle: true, title: '関係のない変数を足す（効く変数は2つ、誤差 RMSE）',
    valAxisMinVal: 0, valAxisMaxVal: 1.4, valAxisMajorUnit: 0.2, valAxisLabelFormatCode: '0.0', showLegend: true, legendPos: 'b',
    catAxisTitle: '変数の数 d', showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: C.muted,
  });
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  [[C.coralTint, `${fmt(base, 2)} → ${fmt(demo, 2)}`, `1つの単位を100倍で約 ${fmt(demo / base, 1)} 倍`], [C.gray, 'd = 10〜15', 'TPS の誤差が平面と並ぶ'], [C.tealTint, `${fmt(gaussFixedWorst, 1)}`, 'ε 固定のガウスの誤差（0 を予測）']].forEach(([fill, big, small], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 6.0, cw, 0.82, { fill, line: null });
    addText(slide, big, x + 0.25, 6.0, 1.9, 0.82, { fontSize: 18, bold: true, valign: 'middle' });
    addText(slide, small, x + 2.15, 6.0, cw - 2.3, 0.82, { fontSize: 12, color: C.slate, valign: 'middle' });
  });
  addText(slide, `点 ${D.pointCount} 個、新しい点 ${D.testCount} 個、${D.repeats} 回の平均。乱数（種を固定）で作った説明用のデータ`, MARGIN_X + 4.2, 7.08, 6.5, 0.25, { fontSize: 9, color: C.muted, align: 'right' });
}

// =====================================================================
// 26. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, 'まとめ', MARGIN_X, 0.62, CONTENT_W, 0.75, { fontSize: 28, bold: true, color: C.white, valign: 'middle' });
  const items = [
    [C.coral, 'RBF 補間は、距離だけで決まる山を重みつきで足す方法。重みは連立方程式で、何次元でも同じ式'],
    [C.teal, 'ガウスなどは幅 ε が必要。大きいと「とげ」、小さいと条件数が大きく不安定'],
    [C.purple, 'TPS ＝ r^{2} log r ＋ 平面の RBF ＝ 曲げエネルギー最小の板。調整なしで、外側は平面に沿う'],
    [C.goldText, 'ノイズには平滑化 λ（0 で補間、∞ で最小二乗の平面）。ガウス過程回帰と同じ枠組み'],
    [C.slate, '説明変数が3つ以上：式はそのまま解けるが、標準化が必要。変数が増えるほど「平面 ＋ 点のまわりの山」に近づく'],
  ];
  items.forEach(([color, text], i) => {
    addCircle(slide, MARGIN_X + 0.3, 1.95 + i * 0.98, 0.5, color, String(i + 1), { fontSize: 15 });
    addText(slide, text, MARGIN_X + 0.75, 1.62 + i * 0.98, 6.6, 0.7, { fontSize: 15, color: C.white, valign: 'middle' });
  });
  addCard(slide, 8.0, 1.6, 4.73, 5.15, { fill: C.navy2, line: null });
  addCircle(slide, 8.5, 2.1, 0.55, C.teal, '✓', { fontSize: 16 });
  addText(slide, '使うときのチェック', 8.95, 1.82, 3.6, 0.55, { fontSize: 17, bold: true, color: C.white, valign: 'middle' });
  ['変数を標準化したか（単位をそろえる）', '関係のない変数を外したか', 'ガウスなら ε を距離に合わせたか', 'ノイズがあるなら λ を交差検証で選んだか', '平面（線形回帰）の誤差と比べたか'].forEach((text, i) => {
    addCard(slide, 8.3, 2.75 + i * 0.78, 4.13, 0.62, { fill: C.navy, line: null });
    addText(slide, `${i + 1}　${text}`, 8.5, 2.75 + i * 0.78, 3.85, 0.62, { fontSize: 13, color: C.onDark2, valign: 'middle' });
  });
  footer(slide, { dark: true });
  slide.addNotes([
    'まとめです。RBF 補間は、距離だけで決まる山を重みつきで足し合わせる方法です。ガウスなどは幅 ε の調整が必要です。',
    'TPS は r² log r に平面を足した RBF で、曲げエネルギーが最小の板です。調整がいらず、外側では平面に沿います。',
    'ノイズには平滑化を使います。説明変数が3つ以上なら標準化し、変数が増えるほど平面に近づくことに注意します。右のチェックを、使うときの確認に使ってください。',
  ].join('\n'));
}

// =====================================================================
// 27. 参考文献
// =====================================================================
{
  const slide = contentSlide(null, '参考文献', [
    'この資料の参考文献です。TPS の変分原理はデュションの論文、多重二次はハーディの論文が出発点です。',
    '幅 ε の精度と安定性の取り合いはシャバックの論文、高次元で問題がほぼ線形になることはエル・カルーイの論文、最近傍の距離がそろうことはベイヤーらの論文に基づきます。',
    '例の数値はすべて、説明用に式と乱数で作ったデータで計算したものです。',
  ]);
  const refs = [
    '[1] J. Duchon (1977). Splines minimizing rotation-invariant semi-norms in Sobolev spaces. Lecture Notes in Mathematics 571, 85–100.',
    '[2] R. L. Hardy (1971). Multiquadric equations of topography and other irregular surfaces. Journal of Geophysical Research 76(8), 1905–1915.',
    '[3] J. C. Mairhuber (1956). On Haar\'s theorem concerning Chebychev approximation problems having unique solutions. Proceedings of the AMS 7, 609–615.',
    '[4] R. Schaback (1995). Error estimates and condition numbers for radial basis function interpolation. Advances in Computational Mathematics 3, 251–264.',
    '[5] G. Wahba (1990). Spline Models for Observational Data. SIAM.',
    '[6] H. Wendland (2005). Scattered Data Approximation. Cambridge University Press.',
    '[7] G. E. Fasshauer (2007). Meshfree Approximation Methods with MATLAB. World Scientific.',
    '[8] N. El Karoui (2010). The spectrum of kernel random matrices. The Annals of Statistics 38(1), 1–50.',
    '[9] K. Beyer, J. Goldstein, R. Ramakrishnan, U. Shaft (1999). When is "nearest neighbor" meaningful? ICDT\'99, LNCS 1540, 217–235.',
  ];
  addText(slide, refs.map((text, i) => ({ text, breakLine: i < refs.length - 1 })), MARGIN_X, 1.6, CONTENT_W, 4.3, { fontSize: 12, paraSpaceAfter: 7, color: C.navy });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.75, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.4, 6.425, 0.42, C.navy, 'i', { fontSize: 13 });
  addText(slide, '例の数値は、説明用に式と乱数（種を固定）で作ったデータで、解説動画と同じ JavaScript の計算（rbf-math.js、make-data.mjs）で求めた。実在のデータではない', MARGIN_X + 0.8, 6.05, CONTENT_W - 1.0, 0.75, { fontSize: 12.5, valign: 'middle' });
}

pres.writeFile({ fileName: OUTPUT }).then((file) => console.log(`${file}（${pageNumber} 枚）`));
