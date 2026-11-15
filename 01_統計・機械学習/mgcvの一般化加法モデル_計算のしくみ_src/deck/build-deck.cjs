// build-deck.cjs — mgcv の一般化加法モデルの解説動画にあわせたパワーポイントを pptxgenjs で組み立てる。
// 見た目は「技術レポートPowerPoint」テンプレート（濃紺の表紙とまとめ、白地の本文、淡い色のカード）に合わせる。
// 数値は動画と同じもの（js/gam-data.js ＝ mgcv の計算結果、js/gam-math.js ＝ 再計算）から取る。
// 数式と、点の多い図（4変数の散布図、REML の面、表紙の図）は deck/make-assets.mjs が作った画像。ほかのグラフは図形と PowerPoint のグラフで描く。
//   NODE_PATH="$(npm root -g)" node deck/build-deck.cjs out/deck_raw.pptx
// 共通の部品（文字・図形・グラフの枠・表）は、RBF と TPS の資料の build-deck.cjs と同じもの。
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = process.argv[2] || path.join(ROOT, 'out', 'deck_raw.pptx');
const ASSET_DIR = path.join(__dirname, 'assets');
const ASSETS = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'assets.json'), 'utf8'));

// 動画と同じデータと計算の部品を読む（どちらも globalThis に置かれる）
['gam-data.js', 'gam-math.js'].forEach((file) => new Function(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'))());
const D = globalThis.GAMDATA;
const M = globalThis.GAMM;

// ---- 定数（テンプレートの寸法・色・フォント） ----
const SLIDE_W = 13.333;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const FONT = 'BIZ UDGothic';
const DECK_NAME = 'mgcv の一般化加法モデル';
const DECK_DATE = '2026年11月';
const C = {
  navy: '22223B', navy2: '34365A', slate: '4A4E69', muted: '6C6F7F', line: 'DADDE6', line2: 'BFC3D1', grid: 'E8EAF0',
  gray: 'F3F4F8', white: 'FFFFFF', onDark: 'A9ACC6', onDark2: 'D9DBEA',
  coral: 'E76F51', coralTint: 'FBE3DC', teal: '2A9D8F', tealTint: 'D8F0ED', purple: '8D6A9F', purpleTint: 'ECE3F1',
  gold: 'E9C46A', goldText: '9C7412', goldTint: 'FBF1D6',
};
const FIT_COLOR = C.teal; // 推定した関数
const TRUTH_COLOR = C.coral; // 真の関数
const REML_COLOR = C.teal;
const GCV_COLOR = C.purple;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = 'mgcv の一般化加法モデル ― gam() の中で行われる計算';
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
    const w = [...item.label].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 0.158 : 0.088), 0) + 0.12;
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

// ---- この資料で足した部品 ----
const CODE_FONT = 'Courier New';
const log10 = (v) => Math.log(v) / Math.LN10;
const column = (matrix, k) => matrix.map((row) => row[k]);
const HALF_TICK = (v) => (v === 0.5 ? '0.5' : String(v));
// 目盛りの文字を出さない小さなグラフの枠
function miniFrame(slide, box, xr, yr, { zero = true, fill = C.gray } = {}) {
  addCard(slide, box.x - 0.06, box.y - 0.06, box.w + 0.12, box.h + 0.12, { fill, line: null, radius: 0.05 });
  const sx = (v) => box.x + ((v - xr[0]) / (xr[1] - xr[0])) * box.w;
  const sy = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h;
  if (zero) addLine(slide, box.x, sy(0), box.x + box.w, sy(0), { color: C.line2, width: 0.75 });
  return { box, xr, yr, sx, sy };
}
// 点の多い散布図（縁取りなしの小さな丸）
function addPoints(slide, P, xs, ys, { color = C.slate, d = 0.055, transparency = 45 } = {}) {
  xs.forEach((x, i) => {
    const y = ys[i];
    if (y < P.yr[0] || y > P.yr[1]) return;
    slide.addShape(pres.shapes.OVAL, { x: P.sx(x) - d / 2, y: P.sy(y) - d / 2, w: d, h: d, fill: { color, transparency }, line: { type: 'none' } });
  });
}
// 帯（上の線と下の線で囲んだ面）
function addBand(slide, P, xs, lower, upper, color, transparency = 65) {
  const clampY = (v) => Math.min(Math.max(v, P.yr[0]), P.yr[1]);
  const outline = [...xs.map((x, i) => [P.sx(x), P.sy(clampY(upper[i]))]), ...xs.map((x, i) => [P.sx(x), P.sy(clampY(lower[i]))]).reverse()];
  const minX = Math.min(...outline.map((p) => p[0]));
  const minY = Math.min(...outline.map((p) => p[1]));
  const w = Math.max(...outline.map((p) => p[0])) - minX;
  const h = Math.max(Math.max(...outline.map((p) => p[1])) - minY, 0.01);
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: minX, y: minY, w, h, points: [...outline.map(([px, py]) => ({ x: px - minX, y: py - minY })), { close: true }], fill: { color, transparency }, line: { type: 'none' } });
}
// R のコードや出力（等幅）
function codeBox(slide, codeLines, x, y, w, h, { fontSize = 13, fill = C.navy, color = C.white } = {}) {
  addCard(slide, x, y, w, h, { fill, line: null });
  slide.addText(codeLines.map((text, i) => ({ text, options: { breakLine: i < codeLines.length - 1 } })), {
    x: x + 0.25, y: y + 0.12, w: w - 0.5, h: h - 0.24, fontFace: CODE_FONT, fontSize, color, margin: 0, valign: 'middle', isTextBox: true, lang: 'en-US',
  });
}
// 題名つきのカード
function titledCard(slide, x, y, w, h, title, { fill = C.gray, titleSize = 15 } = {}) {
  addCard(slide, x, y, w, h, { fill, line: null });
  addText(slide, title, x + 0.3, y + 0.16, w - 0.6, 0.36, { fontSize: titleSize, bold: true, valign: 'middle' });
}
// 10 のべき乗の目盛り（上付きのラン）
const power = (exponent) => `10^{${String(exponent).replace('-', '−')}}`;
// 大きな数を「4万6千」のように書く
const roughJapanese = (value) => {
  const man = Math.floor(value / 10000);
  const sen = Math.round((value - man * 10000) / 1000);
  return `${man}万${sen ? `${sen}千` : ''}`;
};

// =====================================================================
// 計算（動画と同じ例）
// =====================================================================
const MAIN = D.main;
const SINGLE = D.single;
const POIS = D.poisson;
const TWO = D.two;
const VERSION = D.mgcvVersion.replace(/\.(\d+)$/, '-$1');
// 1変数の例: mgcv の X・S から、λ を入れると当てはめを返すモデルを作る（js/gam-setup.js と同じ）
function gaussianModel(source) {
  const stats = M.gaussianStats(source.X, SINGLE.y);
  const info = M.penaltyInfo([source.S], [2], source.X[0].length);
  const fit = (lambda) => M.fitGaussian(stats, info, [lambda]);
  return { stats, info, fit, curve: (beta) => M.matVec(source.Xp, beta), sp: source.sp, spGcv: source.spGcv, size: source.X[0].length, Xp: source.Xp };
}
const NARROW = gaussianModel(D.single);
const WIDE = gaussianModel(D.wide);
const WIDE_K = D.wide.k;
const narrowFit = NARROW.fit(NARROW.sp);
const wideOpt = WIDE.fit(WIDE.sp);
const SCAN_LOGS = range(-8, 6, 140);
const SCAN = SCAN_LOGS.map((v) => WIDE.fit(10 ** v));
const gcvFloor = WIDE.fit(1e-8).gcv; // λ → 0 での GCV の値（頭打ち）
const shrink = M.shrinkageBasis(WIDE.stats, M.totalPenalty(WIDE.info, [1]));
const shrinkAtOpt = shrink.d.map((d) => 1 / (1 + WIDE.sp * d));
const poisInfo = M.penaltyInfo([POIS.S], [2], POIS.X[0].length);
const poisSteps = M.pirlsPoisson(POIS.X, POIS.y, M.totalPenalty(poisInfo, [POIS.sp]));
const poisLast = poisSteps[poisSteps.length - 1];
const poisIterations = poisSteps.length - 1;
const twoStats = { XtX: TWO.XtX, Xty: TWO.Xty, yty: TWO.yty, n: TWO.n };
const twoInfo = M.penaltyInfo(TWO.S, TWO.off, TWO.Xty.length);
const newtonPath = M.newtonReml(twoStats, twoInfo, TWO.initialSp);
const STUDY = D.repeats.smooth;
const sorted = (values) => values.slice().sort((a, b) => a - b);
const median = (values) => sorted(values)[Math.floor(values.length / 2)];
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const medianReml = median(STUDY.edfReml);
const outliersGcv = STUDY.edfGcv.filter((v) => v > 2 * medianReml).length;
const outliersReml = STUDY.edfReml.filter((v) => v > 2 * medianReml).length;
const gcvWins = STUDY.mseGcv.filter((v, i) => v < STUDY.mseReml[i]).length;
const insideShare = MAIN.terms.map((term) => term.truth.filter((v, i) => Math.abs(v - term.fit[i]) <= 2 * term.se[i]).length / term.truth.length);
const kError = D.kStudy.map((item) => Math.sqrt(item.fit.reduce((sum, v, i) => sum + (v - SINGLE.truth[i]) ** 2, 0) / item.fit.length));
const eigenRatio = SINGLE.eigenAbs[10] / SINGLE.eigenAbs[0];
const lambdaRatio = TWO.sp[0] / TWO.sp[1];
const SINGLE_Y = [-6, 16];
const singleAxes = { xticks: [0, 0.5, 1], yticks: [0, 5, 10, 15], fmtX: HALF_TICK };
const dataLegend = [{ dot: true, color: C.slate, label: 'データ' }, { color: TRUTH_COLOR, dash: 'dash', label: '真の関数' }];

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, '学習用資料 ｜ 統計モデリング・R', MARGIN_X, 0.55, 8, 0.3, { fontSize: 12, color: C.onDark });
  addText(slide, 'mgcv の一般化加法モデル', MARGIN_X, 1.45, 6.4, 1.0, { fontSize: 38, bold: true, color: C.white, valign: 'middle' });
  addText(slide, 'gam() の中で行われる計算', MARGIN_X, 2.6, 6.4, 0.5, { fontSize: 20, color: C.onDark2 });
  addText(slide, '基底・ペナルティ・P-IRLS・REML を、式と図で追う', MARGIN_X, 3.15, 6.4, 0.45, { fontSize: 16, color: C.onDark });
  [
    [C.teal, '関数は「基底 × 係数」の和、波打ちはペナルティで抑える'],
    [C.coral, '係数は P-IRLS、平滑化パラメータ λ は REML か GCV'],
    [C.gold, '有効自由度・帯・p 値の読み方と、実務での使い方'],
  ].forEach(([color, label], i) => {
    addCircle(slide, MARGIN_X + 0.12, 4.42 + i * 0.5, 0.18, color);
    addText(slide, label, MARGIN_X + 0.4, 4.3 + i * 0.5, 6.2, 0.26, { fontSize: 15, color: C.white });
  });
  addFigure(slide, 'cover', 7.0, 0.95, 5.9, '4つの説明変数について推定した滑らかな関数と帯');
  addText(slide, '例：4つの説明変数の滑らかな関数（線）と、不確かさの帯。破線は真の関数', 6.6, 5.9, 6.3, 0.25, { fontSize: 11, color: C.onDark, align: 'right' });
  addText(slide, `${DECK_DATE} ｜ 同名の解説動画にあわせた資料 ｜ 図の数値は mgcv ${VERSION} で計算`, MARGIN_X, 6.75, 12, 0.3, { fontSize: 11, color: C.onDark });
  slide.addNotes([
    'この資料は、R のパッケージ mgcv で一般化加法モデルを当てはめるとき、gam() の中で行われる計算を学ぶための教材です。同名の解説動画と同じ構成・同じ例で説明します。',
    '右の図は、例のデータで推定した4つの滑らかな関数です。線が推定した関数、帯がその不確かさ、破線がデータを作るときに使った真の関数です。この線と帯がどう計算されるかが、資料全体のテーマです。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で学ぶこと
// =====================================================================
{
  const slide = contentSlide(null, 'この資料で学ぶこと', [
    '全体は4部・8章です。第1部で、gam() が当てはめるモデルと、計算の全体の流れを見ます。',
    '第2部で、関数を基底と係数で表すこと、波打ちをペナルティで抑えること、有効自由度を学びます。第3部が計算の中心で、係数を解く P-IRLS と、平滑化パラメータ λ を選ぶ GCV・REML・ニュートン法です。',
    '第4部は、不確かさの帯と summary() の読み方、そして実務での使い方です。',
  ]);
  addCard(slide, MARGIN_X, 1.5, CONTENT_W, 0.62, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.36, 1.81, 0.38, C.navy, '◎', { fontSize: 12 });
  addText(slide, 'ゴール：gam() の1行の中で何が計算されているかを説明でき、出力（edf・帯・p 値）と引数（method・k）の意味が分かる', MARGIN_X + 0.7, 1.5, CONTENT_W - 0.9, 0.62, { fontSize: 15, bold: true, valign: 'middle' });
  const parts = [
    ['01', 'g', C.coral, 'モデルと全体の流れ', 'gam() が当てはめるモデル、例のデータ、計算の4つの段階', '第1章 ｜ p.4–6'],
    ['02', 'S', C.teal, '基底とペナルティ', '基底と係数、薄板回帰スプライン、波打ちのペナルティ、識別の制約と有効自由度', '第2〜4章 ｜ p.7–14'],
    ['03', 'λ', C.purple, '係数と λ の計算', 'P-IRLS で係数を解く。GCV・REML で λ を選び、ニュートン法で探す', '第5・6章 ｜ p.15–21'],
    ['04', '±', C.goldText, '結果の読み方と実務', '不確かさの帯、summary() の読み方、method・k・select などの使い方', '第7・8章 ｜ p.22–26'],
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
    '最初に要点を4つにまとめます。1つ目、滑らかな関数は、基底関数と係数の積の和で表します。mgcv の既定の基底は、薄板回帰スプラインです。',
    '2つ目、波打ちはペナルティで抑えます。平滑化パラメータ λ が大きいほど、曲線は直線に近づきます。',
    '3つ目、係数は P-IRLS で解きます。重みつきで、ペナルティつきの最小二乗を、収束するまで繰り返します。',
    '4つ目、λ は REML か GCV で選びます。外側で λ を更新し、内側で係数を解く、入れ子の計算です。',
  ]);
  const points = [
    ['Σ', C.teal, '① 関数は「基底 × 係数」の和', 'f(x) = Σ β_{k} b_{k}(x)。関数を求める問題が、係数 β を求める問題になる', '既定の基底は薄板回帰スプライン（bs = "tp"、k = 10）'],
    ['S', C.coral, '② 波打ちはペナルティで抑える', '‖y − Xβ‖^{2} + λ β^{T}Sβ を最小にする', 'λ が大きいほど直線に近づく。有効自由度で複雑さを測る'],
    ['w', C.purple, '③ 係数は P-IRLS で解く', '重みつき・ペナルティつきの最小二乗を、収束するまで繰り返す', '正規分布・恒等リンクなら1回で終わる'],
    ['λ', C.goldText, '④ λ は REML か GCV で選ぶ', 'log λ の上のニュートン法。外側で λ、内側で係数を解く入れ子の計算', 'gam() の既定は GCV。method = "REML" が勧められている'],
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
// 4. 第1章 gam() が当てはめるモデル
// =====================================================================
{
  const slide = contentSlide('01　gam() の1行が行う計算', 'gam() が当てはめるモデル', [
    '一般化加法モデル（GAM）は、目的変数の平均を、説明変数ごとの滑らかな関数の和で表します。リンク関数 g と分布を選べるので、正規分布のほかに、個数や割合のデータにも使えます。',
    'mgcv では、s() で囲んだ変数が滑らかな関数になります。関数の形は、データから決めます。',
    '決めるものは3つです。関数の形を決める係数 β、なめらかさを決める平滑化パラメータ λ、ばらつきの大きさを表す尺度 φ です。この3つを mgcv がどう計算するかを、順に見ていきます。',
  ]);
  formulaBar(slide, 'model', MARGIN_X, 1.55, CONTENT_W, 1.0, { scale: 0.6, note: '平均 μ_{i} = E[y_{i}] を、変数ごとの滑らかな関数の和で表す。y_{i} は指数型分布族', noteW: 4.6, alt: 'g(mu_i) = beta_0 + f_0(x_0i) + … + f_3(x_3i)' });
  codeBox(slide, ['library(mgcv)', 'b <- gam(y ~ s(x0) + s(x1) + s(x2) + s(x3),', '         data = dat, method = "REML")'], MARGIN_X, 2.8, 6.7, 1.3, { fontSize: 15 });
  addText(slide, 's( )：滑らかな関数にする項。関数の形はデータから決める', MARGIN_X, 4.2, 6.7, 0.3, { fontSize: 13, color: C.slate });
  addTable(slide, ['データ', '分布', 'リンク関数 g'], [['連続値', '正規', '恒等'], ['個数', 'ポアソン', '対数'], ['割合', '二項', 'ロジット']], 7.6, 2.8, [1.5, 1.7, 1.93], { rowH: 0.4 });
  const unknowns = [
    ['β', C.teal, '係数', '関数の形を決める'],
    ['λ', C.coral, '平滑化パラメータ', '関数ごとのなめらかさを決める'],
    ['φ', C.purple, '尺度パラメータ', 'ばらつきの大きさ（正規分布なら分散）'],
  ];
  addText(slide, '決めるものは3つ', MARGIN_X, 4.75, 6, 0.32, { fontSize: 15, bold: true });
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  unknowns.forEach(([glyph, color, title, desc], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 5.2, cw, 1.6);
    addCircle(slide, x + 0.6, 6.0, 0.7, color, glyph, { fontSize: 22 });
    addText(slide, title, x + 1.2, 5.45, cw - 1.4, 0.4, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, desc, x + 1.2, 5.9, cw - 1.4, 0.7, { fontSize: 13, color: C.slate });
  });
}

// =====================================================================
// 5. 第1章 例のデータ
// =====================================================================
{
  const slide = contentSlide('01　gam() の1行が行う計算', '例：4つの説明変数のデータ', [
    `例として、mgcv の関数 gamSim で作った ${MAIN.n} 点のデータを使います。説明変数は x0 から x3 の4つです。点は、目的変数 y を、それぞれの説明変数に対して並べたものです。ばらつきが大きく、形は見えにくいです。`,
    'gam を実行すると、変数ごとの滑らかな関数が求まります。緑の線が推定した関数、帯がその不確かさ、橙の破線が、データを作るときに使った真の関数です。x3 は、真の効果が 0 の変数です。',
    '曲がり方は、変数ごとに違います。x2 は細かく曲がり、x3 はほぼ平らです。この違いを決めているのが、平滑化パラメータ λ です。',
  ]);
  const figureH = addFigure(slide, 'data4', MARGIN_X, 1.45, CONTENT_W, '4つの説明変数のデータと、推定した関数、帯、真の関数');
  legendRow(slide, [{ dot: true, color: C.slate, label: `データ（${MAIN.n} 点）` }, { color: FIT_COLOR, width: 2.5, label: '推定した関数（帯は ±2×標準誤差）' }, { color: TRUTH_COLOR, dash: 'dash', label: '真の関数' }], MARGIN_X + 0.4, 1.45 + figureH + 0.02);
  const cw = (CONTENT_W - 0.3 * 3) / 4;
  MAIN.terms.forEach((term, j) => {
    const x = MARGIN_X + j * (cw + 0.3);
    const strong = j >= 2;
    addCard(slide, x, 5.95, cw, 0.85, { fill: strong ? C.tealTint : C.gray, line: null });
    addText(slide, `s(x${j})`, x + 0.2, 5.95, 0.9, 0.85, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, `有効自由度 ${fmt(MAIN.edf[j], 2)}`, x + 1.05, 5.95, cw - 1.15, 0.85, { fontSize: 14, valign: 'middle' });
  });
  addText(slide, `乱数（種を固定）で作った説明用のデータ。真の関数は gamSim(1)（Gu と Wahba の例）と同じ`, MARGIN_X + 4.2, 7.08, 6.5, 0.25, { fontSize: 9, color: C.muted, align: 'right' });
}

// =====================================================================
// 6. 第1章 計算の全体の流れ
// =====================================================================
{
  const slide = contentSlide('01　gam() の1行が行う計算', '計算の全体の流れ ― 4つの段階', [
    'gam の計算は、大きく4つの段階に分かれます。',
    '① まず、s() の項ごとに基底を作り、モデル行列 X とペナルティの行列 S を用意します。これは1回だけです。',
    '② 次に、λ を仮に決めて、係数 β を解きます。ペナルティつきの重みつき最小二乗を繰り返す、P-IRLS という方法です。③ その結果から REML などの基準を計算し、基準が良くなる向きに λ を更新します。② と ③ を、収束するまで繰り返します。',
    `④ 最後に、係数、その共分散行列、有効自由度などを出力します。この例では、λ の更新は ${MAIN.outerIter} 回で収束しました。`,
  ]);
  const box = (x, y, w, h, fill, title, body, chapter) => {
    addCard(slide, x, y, w, h, { fill, line: null });
    addText(slide, title, x + 0.2, y + 0.15, w - 0.4, 0.4, { fontSize: 16, bold: true, align: 'center', valign: 'middle' });
    addText(slide, body, x + 0.2, y + 0.6, w - 0.4, h - 0.7, { fontSize: 12.5, color: C.slate, align: 'center' });
    if (chapter) addText(slide, chapter, x, y + h + 0.06, w, 0.25, { fontSize: 11, color: C.muted, align: 'center' });
  };
  box(MARGIN_X, 3.25, 1.95, 1.3, C.gray, '式とデータ', 'y ~ s(x0) + …');
  box(3.05, 3.25, 2.6, 1.3, C.purpleTint, '① 基底を作る', lines(['モデル行列 X', 'ペナルティの行列 S']), '第2章（1回だけ）');
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.2, y: 1.65, w: 3.7, h: 4.55, rectRadius: 0.12, fill: { type: 'none' }, line: { color: C.gold, width: 1.5, dashType: 'dash' } });
  box(6.55, 1.95, 3.0, 1.3, C.tealTint, '② 係数 β を解く', 'P-IRLS（λ は固定）', null);
  box(6.55, 4.55, 3.0, 1.3, C.coralTint, '③ λ を更新する', 'REML・GCV、ニュートン法', null);
  addText(slide, '第3〜5章', 9.0, 1.72, 0.85, 0.22, { fontSize: 10, color: C.muted, align: 'right' });
  addText(slide, '第6章', 9.0, 5.9, 0.85, 0.22, { fontSize: 10, color: C.muted, align: 'right' });
  addText(slide, '収束するまで繰り返す', 6.2, 6.26, 3.7, 0.3, { fontSize: 13, bold: true, color: C.goldText, align: 'center' });
  box(10.45, 3.25, 2.28, 1.3, C.goldTint, '④ 出力', lines(['係数、共分散行列', '有効自由度、p 値']), '第7章');
  addLine(slide, 2.6, 3.9, 3.0, 3.9, { arrow: true, color: C.slate });
  addLine(slide, 5.7, 3.7, 6.5, 2.9, { arrow: true, color: C.slate });
  addLine(slide, 7.55, 3.3, 7.55, 4.5, { arrow: true, color: C.teal, width: 2 });
  addLine(slide, 8.55, 4.5, 8.55, 3.3, { arrow: true, color: C.coral, width: 2 });
  addText(slide, 'β の推定値', 6.3, 3.75, 1.2, 0.25, { fontSize: 11, color: C.slate, align: 'right' });
  addText(slide, '新しい λ', 8.65, 3.75, 1.2, 0.25, { fontSize: 11, color: C.slate });
  addLine(slide, 9.95, 3.9, 10.4, 3.9, { arrow: true, color: C.slate });
  addCard(slide, MARGIN_X, 6.62, CONTENT_W, 0.4, { fill: C.gray, line: null });
  addText(slide, `例の4変数のモデル：係数 ${MAIN.coefCount} 個、λ は4つ、λ の更新は ${MAIN.outerIter} 回で収束`, MARGIN_X + 0.3, 6.62, CONTENT_W - 0.6, 0.4, { fontSize: 13, valign: 'middle', align: 'center' });
}

// =====================================================================
// 7. 第2章 関数を基底と係数で表す
// =====================================================================
{
  const slide = contentSlide('02　基底', '関数を基底と係数で表す', [
    '滑らかな関数を計算機で扱うために、あらかじめ決めた基底関数 b_k の、重みつきの和で表します。未知なのは、重みである係数 β だけです。関数を求める問題が、係数を求める問題に変わります。',
    'データの点で基底関数の値を計算して並べると、行列 X になります。関数の値は、X と β の積です。項が複数あるときは、項ごとの行列を横に並べます。モデル全体が、係数について線形の式になります。',
    `mgcv の既定の基底は、薄板回帰スプラインです。基底の数 k の既定値は 10 で、例の4変数のモデルでは、係数は全部で ${MAIN.coefCount} 個です。`,
  ]);
  formulaBar(slide, 'basis', MARGIN_X, 1.55, CONTENT_W, 1.15, { scale: 0.6, note: lines(['b_{k}：基底関数（先に決めておく）', 'β_{k}：係数（データから決める）']), noteW: 5.4, alt: 'f(x) = Σ β_k b_k(x)' });
  titledCard(slide, MARGIN_X, 2.95, 6.3, 1.8, 'データの点で並べると、行列 X になる');
  addFormula(slide, 'design', MARGIN_X + 0.3, 3.55, { scale: 0.56, alt: 'f = Xβ, X_ik = b_k(x_i)' });
  addText(slide, '行＝データの点、列＝基底関数', MARGIN_X + 0.3, 4.3, 5.6, 0.3, { fontSize: 12.5, color: C.slate });
  titledCard(slide, MARGIN_X, 4.95, 6.3, 1.85, '項が複数あるときは、横に並べる');
  addFormula(slide, 'stacked', MARGIN_X + 0.3, 5.55, { scale: 0.56, alt: 'g(μ) = [1 X0 X1 X2 X3] β' });
  addText(slide, 'モデル全体が、係数について線形の式になる', MARGIN_X + 0.3, 6.35, 5.6, 0.3, { fontSize: 12.5, color: C.slate });
  titledCard(slide, 7.2, 2.95, 5.53, 3.85, 'mgcv の既定（s(x) と書いたとき）', { fill: C.tealTint });
  [['bs = "tp"', '薄板回帰スプライン'], ['k = 10', '基底の数（自由度の上限）'], ['例の係数', `1 + 9 × 4 = ${MAIN.coefCount} 個`]].forEach(([key, value], i) => {
    addCard(slide, 7.5, 3.6 + i * 0.85, 4.93, 0.7, { fill: C.white, line: null });
    addText(slide, key, 7.7, 3.6 + i * 0.85, 1.5, 0.7, { fontSize: 14, bold: true, valign: 'middle' });
    addText(slide, value, 9.2, 3.6 + i * 0.85, 3.1, 0.7, { fontSize: 14, valign: 'middle' });
  });
  addText(slide, '9 = k − 1。1つ減る理由は第4章（識別の制約）', 7.5, 6.25, 4.93, 0.3, { fontSize: 12, color: C.slate });
}

// =====================================================================
// 8. 第2章 基底関数に係数を掛けて足す
// =====================================================================
{
  const basisCount = NARROW.size - 1;
  const contribution = Array.from({ length: basisCount }, (_, k) => column(NARROW.Xp, k + 1).map((v) => v * narrowFit.beta[k + 1]));
  const peak = Math.max(...contribution.flat().map(Math.abs));
  const slide = contentSlide('02　基底', '基底関数に係数を掛けて足す', [
    `1変数の例で見ます。点は ${SINGLE.n} 個のデータ、橙の破線は真の関数です。左は、mgcv が作った ${basisCount} 本の基底関数に、係数を掛けたものです。なだらかなものから、細かく波打つものまであります。`,
    '係数の絶対値が大きい基底ほど、曲線に強く効きます。切片に、係数を掛けた基底を1本ずつ足していくと、右の緑の曲線になります。',
    `${basisCount} 本すべてを足したものが、推定した関数です。係数をどう決めるかが、次の章の話です。`,
  ]);
  addText(slide, `係数を掛けた基底 β_{k} b_{k}(x)（${basisCount} 本、縦の目盛りは共通）`, MARGIN_X, 1.5, 5.6, 0.3, { fontSize: 13, bold: true });
  contribution.forEach((values, k) => {
    const boxK = { x: MARGIN_X + 0.06 + (k % 3) * 1.86, y: 1.98 + Math.floor(k / 3) * 1.62, w: 1.6, h: 1.1 };
    const P = miniFrame(slide, boxK, [0, 1], [-peak * 1.1, peak * 1.1]);
    addCurve(slide, P, SINGLE.grid, values, { color: FIT_COLOR, width: 1.75 });
    addText(slide, `β_{${k + 1}} = ${fmt(narrowFit.beta[k + 1], 2)}`, boxK.x, boxK.y + boxK.h + 0.09, boxK.w, 0.24, { fontSize: 11, color: C.slate, align: 'center' });
  });
  addText(slide, `＋ 切片 ${fmt(narrowFit.beta[0], 2)}`, MARGIN_X, 6.8, 5.6, 0.25, { fontSize: 12, color: C.slate });
  addLine(slide, 6.25, 4.0, 6.75, 4.0, { arrow: true, color: C.slate, width: 2 });
  addText(slide, '足す', 6.2, 3.62, 0.6, 0.25, { fontSize: 12, color: C.slate, align: 'center' });
  const P = plotFrame(slide, { x: 7.6, y: 1.75, w: 5.0, h: 4.3 }, [0, 1], SINGLE_Y, { ...singleAxes, xlabel: 'x' });
  addPoints(slide, P, SINGLE.x, SINGLE.y);
  addCurve(slide, P, SINGLE.grid, SINGLE.truth, { color: TRUTH_COLOR, width: 1.75, dash: 'dash' });
  addCurve(slide, P, SINGLE.grid, NARROW.curve(narrowFit.beta), { color: FIT_COLOR, width: 2.75 });
  legendRow(slide, [...dataLegend, { color: FIT_COLOR, width: 2.75, label: `切片 ＋ ${basisCount} 本の和` }], 7.6, 6.55);
}

// =====================================================================
// 9. 第2章 薄板回帰スプライン
// =====================================================================
{
  const slide = contentSlide('02　基底', '薄板回帰スプライン（bs = "tp"）', [
    '薄板スプラインは、当てはまりの悪さと、曲がりの大きさの和を最小にする関数です。1変数では、3次の平滑化スプラインと同じものです。その解は、データの点ごとに置いた、距離の関数 η の和に、直線を足した形になります。',
    'ただし、係数がデータの数 n だけあり、計算量は n の3乗に比例します。データが多いと使えません。',
    'そこで mgcv は、η を並べた行列 E を固有値分解し、絶対値の大きい固有値を k 個だけ残します。これが薄板回帰スプラインです。節点の位置を決めなくてよく、2変数以上の滑らかな関数にも、同じ作り方が使えます。',
  ]);
  titledCard(slide, MARGIN_X, 1.55, 7.5, 1.55, '薄板スプライン：当てはまりの悪さ ＋ 曲がりの大きさを最小に');
  addFormula(slide, 'tpsObjective', MARGIN_X + 0.3, 2.12, { scale: 0.5, alt: 'min Σ (y_i − f(x_i))² + λ ∫ f″(x)² dx' });
  titledCard(slide, MARGIN_X, 3.3, 7.5, 1.7, '解の形：点ごとの関数 η の和 ＋ 直線（1変数のとき）');
  addFormula(slide, 'tpsSolution', MARGIN_X + 0.3, 3.86, { scale: 0.46, alt: 'f(x) = Σ δ_i η(|x − x_i|) + α_0 + α_1 x, η(r) = r³/12' });
  addText(slide, '係数が n 個 → 計算量は O(n^{3})。データが多いと使えない', MARGIN_X + 0.3, 4.58, 6.9, 0.3, { fontSize: 13, bold: true, color: C.coral });
  addCard(slide, MARGIN_X, 5.2, 7.5, 1.6, { fill: C.navy, line: null });
  addFormula(slide, 'eigen', MARGIN_X + 0.3, 5.35, { scale: 0.5, alt: 'E_ij = η(|x_i − x_j|), E = U D Uᵀ ≈ U_k D_k U_kᵀ' });
  addText(slide, '絶対値の大きい固有値を k 個だけ残す（Wood 2003）→ 係数は n 個から k 個に', MARGIN_X + 0.3, 6.25, 6.9, 0.4, { fontSize: 13, color: C.onDark2, valign: 'middle' });
  titledCard(slide, 8.4, 1.55, 4.33, 5.25, '薄板回帰スプラインの特徴', { fill: C.tealTint });
  [
    ['節点がいらない', '節点（knot）の位置を選ばなくてよい'],
    ['多変数も同じ', 's(x, z) のような2変数以上も、同じ作り方'],
    ['切り詰めの影響が最小', '切り詰めによる変化が最も小さい基底'],
    ['点が多いとき', '一部の点（既定で最大 2000 点）から作る'],
  ].forEach(([title, desc], i) => {
    addCard(slide, 8.65, 2.15 + i * 1.12, 3.83, 0.98, { fill: C.white, line: null });
    addText(slide, title, 8.85, 2.2 + i * 1.12, 3.5, 0.36, { fontSize: 14, bold: true, valign: 'middle' });
    addText(slide, desc, 8.85, 2.58 + i * 1.12, 3.5, 0.5, { fontSize: 12, color: C.slate });
  });
}

// =====================================================================
// 10. 第2章 固有値で基底を切り詰める
// =====================================================================
{
  const KEPT = 10;
  const SHOWN = 30;
  const slide = contentSlide('02　基底', '固有値で基底を切り詰める', [
    `データの点ごとに置いた関数 η は、${SINGLE.n} 点あるので ${SINGLE.n} 本あります。この関数の値を並べた、${SINGLE.n} 行 ${SINGLE.n} 列の行列を固有値分解します。左の棒は、固有値の絶対値を大きい順に並べたものです。縦軸は対数です。`,
    `固有値は急に小さくなります。大きい方から ${KEPT} 個だけを残します。11 番目は、1番目の約 ${Math.round(1 / eigenRatio / 1000)} 千分の1 です。`,
    '残した固有ベクトルから作った基底が、右です。定数と直線の2本と、曲がりを表す8本で、合わせて 10 本です。同じ手順を別に計算して、mgcv の基底と同じ空間になることを確かめました。mgcv は、ランチョス法で、必要な固有値だけを求めます。',
  ]);
  addText(slide, `行列 E の固有値の絶対値（大きい順に ${SHOWN} 個、縦軸は対数）`, MARGIN_X, 1.5, 6.2, 0.3, { fontSize: 13, bold: true });
  const yr = [-6.2, 0.6];
  const P = plotFrame(slide, { x: 1.3, y: 2.0, w: 5.3, h: 3.6 }, [0.2, SHOWN + 0.8], yr, { xticks: [1, 10, 20, 30], yticks: [-6, -4, -2, 0], fmtY: () => '', xlabel: '大きい順の番号' });
  [-6, -4, -2, 0].forEach((e) => addText(slide, power(e), 0.68, P.sy(e) - 0.11, 0.54, 0.22, { fontSize: 10, color: C.muted, align: 'right' }));
  const barW = (5.3 / (SHOWN + 0.6)) * 0.7;
  SINGLE.eigenAbs.slice(0, SHOWN).forEach((value, i) => {
    const top = P.sy(Math.max(yr[0], log10(value)));
    slide.addShape(pres.shapes.RECTANGLE, { x: P.sx(i + 1) - barW / 2, y: top, w: barW, h: Math.max(P.sy(yr[0]) - top, 0.01), fill: { color: i < KEPT ? C.coral : C.line2 }, line: { type: 'none' } });
  });
  addLine(slide, P.sx(KEPT + 0.5), 2.0, P.sx(KEPT + 0.5), 5.6, { color: C.coral, width: 1.25, dash: 'dash' });
  addText(slide, `ここまで残す（${KEPT} 個）`, P.sx(KEPT + 0.5) + 0.1, 2.05, 2.4, 0.28, { fontSize: 12, bold: true, color: C.coral });
  addText(slide, `切り詰めた基底（k = ${KEPT}）`, 7.4, 1.5, 5.3, 0.3, { fontSize: 13, bold: true });
  const raw = Array.from({ length: KEPT }, (_, k) => column(SINGLE.rawBasis, k));
  const order = [KEPT - 2, KEPT - 1, ...Array.from({ length: KEPT - 2 }, (_, k) => k)]; // 定数・直線を先頭に
  order.forEach((k, position) => {
    const values = raw[k];
    const span = Math.max(...values) - Math.min(...values);
    const centre = (Math.max(...values) + Math.min(...values)) / 2;
    const polynomial = position < 2;
    const boxK = { x: 7.46 + (position % 2) * 2.72, y: 1.98 + Math.floor(position / 2) * 0.76, w: 2.45, h: 0.56 };
    const Pk = miniFrame(slide, boxK, [0, 1], [-1.3, 1.3], { zero: false, fill: polynomial ? C.coralTint : C.gray });
    addCurve(slide, Pk, SINGLE.grid, values.map((v) => (span < 1e-9 ? 0 : (v - centre) / (span / 2))), { color: polynomial ? C.coral : FIT_COLOR, width: 1.75 });
    if (polynomial) addText(slide, position === 0 ? '定数' : '直線', boxK.x + 0.05, boxK.y - 0.02, 0.8, 0.22, { fontSize: 10, color: C.slate });
  });
  addText(slide, '定数と直線の2本 ＋ 曲がりを表す8本 ＝ 10 本', 7.4, 5.8, 5.3, 0.26, { fontSize: 12, color: C.slate });
  addCard(slide, MARGIN_X, 6.15, CONTENT_W, 0.7, { fill: C.navy, line: null });
  addText(slide, `別に計算した基底と、mgcv の基底は同じ空間（ずれは相対値で ${power(Math.ceil(Math.log10(SINGLE.spanGap)))} 以下）。mgcv はランチョス法で必要な固有値だけを求める`, MARGIN_X + 0.35, 6.15, CONTENT_W - 0.7, 0.7, { fontSize: 13, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 11. 第3章 波打ちにペナルティをかける
// =====================================================================
{
  const slide = contentSlide('03　ペナルティ', '波打ちにペナルティをかける', [
    '基底を多めに用意すると、最小二乗だけでは、データのばらつきまで追いかけて、波打った曲線になります。そこで、当てはまりの悪さに、曲線の波打ちの大きさを足したものを、最小にします。波打ちは、2階微分の2乗の積分で測ります。',
    '基底で表すと、この積分は、係数の2次形式になります。S は、基底から前もって計算できる行列です。λ を決めれば、係数は1回の連立方程式で求まります。普通の最小二乗の式に、λS を足しただけの形です。',
    '直線は2階微分が 0 なので、ペナルティがかかりません。λ を大きくすると、曲線は直線に近づきます。',
  ]);
  formulaBar(slide, 'penalized', MARGIN_X, 1.55, CONTENT_W, 1.15, { scale: 0.6, note: lines(['当てはまりの悪さ ＋ λ × 波打ちの大きさ', 'λ：平滑化パラメータ']), noteW: 4.8, alt: 'min ‖y − Xβ‖² + λ ∫ f″(x)² dx' });
  titledCard(slide, MARGIN_X, 2.95, 6.3, 1.85, '波打ちの大きさ ＝ 係数の2次形式');
  addFormula(slide, 'penaltyMatrix', MARGIN_X + 0.3, 3.5, { scale: 0.44, alt: '∫ f″² dx = βᵀSβ' });
  addText(slide, 'S は、基底から前もって計算できる行列', MARGIN_X + 0.3, 4.35, 5.7, 0.3, { fontSize: 12.5, color: C.slate });
  titledCard(slide, 7.2, 2.95, 5.53, 1.85, 'λ を決めれば、1回の連立方程式で解ける', { fill: C.coralTint });
  addFormula(slide, 'solution', 7.5, 3.55, { scale: 0.56, alt: 'β̂ = (XᵀX + λS)⁻¹ Xᵀy' });
  addText(slide, '最小二乗の式に λS を足しただけ', 7.5, 4.35, 4.9, 0.3, { fontSize: 12.5, color: C.slate });
  addTable(slide, ['λ', '曲線', '理由'], [
    ['λ → 0', 'データを追いかけて波打つ', 'ペナルティが効かない（最小二乗と同じ）'],
    ['λ → ∞', '直線になる', '直線は 2階微分が 0 で、ペナルティがかからない'],
  ], MARGIN_X, 5.1, [2.0, 4.3, 5.83], { rowH: 0.5, fontSize: 14 });
}

// =====================================================================
// 12. 第3章 λ を動かして曲線を見る
// =====================================================================
{
  const cases = [
    { lambda: 1e-8, title: 'λ = 10^{−8}（ほぼ 0）', note: 'データのばらつきを追いかけて波打つ', fill: C.coralTint },
    { lambda: WIDE.sp, title: `λ = ${fmt(WIDE.sp, 3)}（REML が選ぶ値）`, note: '真の関数に近い', fill: C.tealTint },
    { lambda: 1e4, title: 'λ = 10^{4}', note: '山までならされて、直線になる', fill: C.gray },
  ].map((item) => ({ ...item, fit: WIDE.fit(item.lambda) }));
  const slide = contentSlide('03　ペナルティ', 'λ を動かして曲線を見る', [
    `基底を ${WIDE_K} 本に増やした例です。λ をほぼ 0 にすると、曲線はデータのばらつきを追いかけて、細かく波打ちます。`,
    'λ を大きくしていくと、波打ちが消えていきます。ほどよい λ では、真の関数に近い曲線になります。さらに大きくすると、山までならされてしまい、最後は直線になります。',
    'λ は、当てはまりとなめらかさのつり合いを決める、ただ1つのつまみです。これをどう選ぶかは、第6章で扱います。',
  ]);
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  cases.forEach((item, i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addText(slide, item.title, x, 1.5, cw, 0.32, { fontSize: 14, bold: true, align: 'center' });
    const P = plotFrame(slide, { x: x + 0.55, y: 1.95, w: cw - 0.75, h: 2.55 }, [0, 1], SINGLE_Y, singleAxes);
    addPoints(slide, P, SINGLE.x, SINGLE.y, { d: 0.045 });
    addCurve(slide, P, SINGLE.grid, SINGLE.truth, { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
    addCurve(slide, P, SINGLE.grid, WIDE.curve(item.fit.beta), { color: FIT_COLOR, width: 2.5 });
    addCard(slide, x, 5.2, cw, 1.6, { fill: item.fill, line: null });
    addText(slide, item.note, x + 0.25, 5.28, cw - 0.5, 0.36, { fontSize: 13.5, bold: true, valign: 'middle' });
    const wiggle = item.fit.penalty / item.lambda;
    [['残差の2乗和', fmt(item.fit.rss, 0)], ['波打ちの大きさ', wiggle >= 100 ? fmt(wiggle, 0) : fmt(wiggle, 4)], ['有効自由度', fmt(item.fit.edf, 1)]].forEach(([label, value], r) => {
      addText(slide, label, x + 0.25, 5.7 + r * 0.34, 2.2, 0.3, { fontSize: 12.5, color: C.slate, valign: 'middle' });
      addText(slide, value, x + cw - 1.75, 5.7 + r * 0.34, 1.5, 0.3, { fontSize: 13.5, bold: true, align: 'right', valign: 'middle' });
    });
  });
  legendRow(slide, [...dataLegend, { color: FIT_COLOR, width: 2.5, label: `ペナルティつきの当てはめ（基底 ${WIDE_K} 本）` }], MARGIN_X + 0.4, 4.86);
}

// =====================================================================
// 13. 第4章 識別の制約と有効自由度
// =====================================================================
{
  const slide = contentSlide('04　識別の制約と有効自由度', '識別の制約と有効自由度', [
    '関数の和のモデルでは、1つの関数に定数を足し、別の関数から同じ定数を引いても、和は変わりません。このままでは、関数が1つに決まりません。そこで mgcv は、それぞれの関数に、データの点での合計が 0 になる、という制約を付けます。制約は基底の作り直しで取り込むので、係数は k より1つ少ない9個になります。',
    '次に、モデルの複雑さの測り方です。ペナルティがあると、係数の数は、実際の自由度を表しません。代わりに使うのが、有効自由度です。行列 F の対角の和で定義します。F は、ペナルティで係数がどれだけ縮んだかを表す行列です。',
    'λ が 0 なら、有効自由度は係数の数に等しく、λ を大きくすると減っていきます。1変数の項では、直線にあたる 1 が下限です。',
  ]);
  titledCard(slide, MARGIN_X, 1.55, 6.3, 2.35, '識別の制約：合計を 0 にそろえる');
  addText(slide, 'f_{1} + c と f_{2} − c は、和が同じで区別できない', MARGIN_X + 0.3, 2.08, 5.7, 0.3, { fontSize: 13 });
  addFormula(slide, 'constraint', MARGIN_X + 0.3, 2.42, { scale: 0.5, alt: 'Σ f_j(x_ji) = 0' });
  addText(slide, '→ 項ごとの係数は k − 1 = 9 個。定数は切片が受け持つ', MARGIN_X + 0.3, 3.45, 5.7, 0.3, { fontSize: 12.5, color: C.slate });
  addCard(slide, 7.2, 1.55, 5.53, 2.35, { fill: C.navy, line: null });
  addText(slide, '有効自由度（edf）：モデルの複雑さ', 7.5, 1.71, 4.9, 0.36, { fontSize: 15, bold: true, color: C.white, valign: 'middle' });
  addFormula(slide, 'edf', 7.5, 2.25, { scale: 0.56, alt: 'edf = tr(F) = Σ F_kk' });
  addText(slide, '項ごとの値 ＝ F の対角のうち、その項の係数の分の和', 7.5, 3.4, 4.9, 0.3, { fontSize: 12.5, color: C.onDark2 });
  addCard(slide, MARGIN_X, 4.1, CONTENT_W, 1.15, { fill: C.gray, line: null });
  addFormula(slide, 'shrinkMatrix', MARGIN_X + 0.3, 4.36, { scale: 0.5, alt: 'β̂ = F β̃, F = (XᵀX + λS)⁻¹ XᵀX' });
  addText(slide, lines(['β̃：ペナルティなしの係数', 'F：ペナルティで係数がどれだけ縮んだかを表す行列']), 7.5, 4.1, 5.0, 1.15, { fontSize: 13, color: C.slate, valign: 'middle' });
  addTable(slide, ['λ', '有効自由度', '1変数の項（k = 10）'], [
    ['λ → 0', '係数の数に等しい', '9'],
    ['λ → ∞', 'ペナルティのかからない成分の数', '1（直線）'],
  ], MARGIN_X, 5.5, [2.0, 5.8, 4.33], { rowH: 0.43, fontSize: 14 });
}

// =====================================================================
// 14. 第4章 成分ごとの縮み方と有効自由度
// =====================================================================
{
  const count = shrink.d.length;
  const labels = shrinkAtOpt.map((_, k) => String(k + 1));
  const slide = contentSlide('04　識別の制約と有効自由度', '成分ごとの縮み方と有効自由度', [
    '基底をうまく取り直すと、ペナルティの効き方を、成分ごとに分けて見られます。棒の1本が1つの成分で、左ほどなだらか、右ほど細かい波です。棒の高さは、その成分が、ペナルティなしの値の何倍に縮むかです。',
    'λ を大きくすると、細かい波の成分から先に縮みます。左端の2本は、定数と直線で、縮みません。',
    `有効自由度は、この棒の高さの合計です。REML で選んだ λ では、${fmt(wideOpt.edf, 1)} です。${WIDE_K} 本の基底を使っていても、実質は約 ${Math.round(wideOpt.edf)} 個ぶんの自由度です。summary に出る edf は、この値を項ごとに出したものです。`,
  ]);
  slide.addChart(pres.charts.BAR, [
    { name: '縮まない成分（定数・直線）', labels, values: shrinkAtOpt.map((v, k) => (k < 2 ? v : 0)) },
    { name: '縮む成分', labels, values: shrinkAtOpt.map((v, k) => (k < 2 ? 0 : v)) },
  ], {
    x: MARGIN_X, y: 1.45, w: 7.7, h: 4.45, ...chartBase(), barDir: 'col', barGrouping: 'stacked', barGapWidthPct: 40, chartColors: [C.coral, C.teal],
    showTitle: true, title: `成分ごとの縮み率（基底 ${WIDE_K} 本、REML で選んだ λ = ${fmt(WIDE.sp, 3)}）`,
    valAxisMinVal: 0, valAxisMaxVal: 1, valAxisMajorUnit: 0.25, valAxisLabelFormatCode: '0.00', showLegend: true, legendPos: 'b',
    catAxisTitle: '成分の番号（左ほどなだらか、右ほど細かい波）', showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: C.muted, catAxisLabelFrequency: 5,
  });
  addText(slide, '有効自由度（棒の高さの合計）と λ', 8.75, 1.5, 4.0, 0.3, { fontSize: 13, bold: true });
  const P = plotFrame(slide, { x: 9.35, y: 2.0, w: 3.2, h: 2.5 }, [-8, 6], [0, 42], { xticks: [-8, -4, 0, 4], yticks: [0, 10, 20, 30, 40], fmtX: () => '' });
  [-8, -4, 0, 4].forEach((e) => addText(slide, power(e), P.sx(e) - 0.5, 4.56, 1, 0.22, { fontSize: 10, color: C.muted, align: 'center' }));
  addText(slide, 'λ', 12.55, 4.56, 0.2, 0.22, { fontSize: 11, color: C.slate });
  addCurve(slide, P, SCAN_LOGS, SCAN.map((fit) => fit.edf), { color: FIT_COLOR, width: 2.25 });
  addLine(slide, P.sx(log10(WIDE.sp)), 2.0, P.sx(log10(WIDE.sp)), 4.5, { color: C.coral, width: 1, dash: 'dash' });
  addDots(slide, P, [log10(WIDE.sp)], [wideOpt.edf], { color: C.coral, d: 0.15 });
  addCard(slide, 8.75, 4.95, 3.98, 0.95, { fill: C.tealTint, line: null });
  addText(slide, fmt(wideOpt.edf, 1), 8.95, 4.95, 1.2, 0.95, { fontSize: 28, bold: true, valign: 'middle' });
  addText(slide, `${count} 本の基底でも、実質は約 ${Math.round(wideOpt.edf)} 個ぶんの自由度`, 10.15, 4.95, 2.45, 0.95, { fontSize: 12.5, color: C.slate, valign: 'middle' });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.8, { fill: C.gray, line: null });
  addFormula(slide, 'shrinkFactor', MARGIN_X + 0.3, 6.12, { scale: 0.42, alt: '縮み率 = 1 / (1 + λ d_k)' });
  addText(slide, 'd_{k}：成分の波打ちの強さ。λ を大きくすると、細かい波の成分から先に縮む。summary の edf は、この合計を項ごとに出したもの', 3.2, 6.05, 9.3, 0.8, { fontSize: 13, valign: 'middle' });
}

// =====================================================================
// 15. 第5章 P-IRLS
// =====================================================================
{
  const slide = contentSlide('05　P-IRLS', '正規分布以外へ：P-IRLS', [
    '個数や割合のデータでは、残差の2乗和の代わりに、対数尤度を使います。対数尤度からペナルティを引いたものを、最大にします。この問題は、1回では解けません。そこで、いまの推定値のまわりで、重みつきの最小二乗の問題に置きかえます。',
    '置きかえには、作業用の応答 z と、重み w を使います。どちらも、いまの平均 μ から計算します。z と w を固定すれば、前の章と同じ、ペナルティつきの最小二乗です。解いた係数で μ を更新し、z と w を作り直します。',
    'これを、ペナルティつきの逸脱度が変わらなくなるまで繰り返します。P-IRLS、ペナルティつき反復再重みつき最小二乗法と呼びます。正規分布で恒等リンクのときは、z は y そのもの、重みは 1 になり、1回で終わります。mgcv は、この最小二乗を QR 分解で安定に解きます。',
  ]);
  formulaBar(slide, 'penLik', MARGIN_X, 1.55, CONTENT_W, 1.05, { scale: 0.52, note: 'ペナルティつき対数尤度を最大にする。1回では解けないので、重みつきの最小二乗に置きかえて繰り返す', noteW: 6.2, alt: 'max ℓ(β) − ½ Σ λ_j βᵀS_jβ' });
  const step = (num, y, h, color, title) => {
    addCard(slide, MARGIN_X, y, 7.6, h);
    addCircle(slide, MARGIN_X + 0.42, y + 0.38, 0.46, color, String(num), { fontSize: 15 });
    addText(slide, title, MARGIN_X + 0.85, y + 0.14, 6.6, 0.48, { fontSize: 14, bold: true, valign: 'middle' });
  };
  step(1, 2.8, 1.5, C.teal, 'いまの平均 μ から、作業用の応答 z と重み w を作る');
  addFormula(slide, 'working', MARGIN_X + 0.85, 3.42, { scale: 0.44, alt: 'z_i = η_i + (y_i − μ_i) g′(μ_i), w_i = 1 / (V(μ_i) g′(μ_i)²)' });
  step(2, 4.42, 1.5, C.coral, 'z と w を固定して、ペナルティつきの重みつき最小二乗を解く');
  addFormula(slide, 'pwls', MARGIN_X + 0.85, 5.02, { scale: 0.44, alt: 'min Σ w_i (z_i − X_iβ)² + Σ λ_j βᵀS_jβ' });
  step(3, 6.04, 0.78, C.purple, '係数で μ を更新して ① へ。ペナルティつき逸脱度が変わらなくなるまで');
  addText(slide, '例：z と w の形', 8.5, 2.8, 4.2, 0.3, { fontSize: 14, bold: true });
  addTable(slide, ['分布・リンク', 'z', 'w'], [['正規・恒等', 'y', '1'], ['ポアソン・対数', 'η + (y − μ)/μ', 'μ']], 8.5, 3.18, [1.75, 1.75, 0.73], { rowH: 0.42, fontSize: 12.5 });
  addCard(slide, 8.5, 4.62, 4.23, 2.2, { fill: C.tealTint, line: null });
  addBullets(slide, [
    'η_{i} = X_{i}β：線形予測子、V(μ)：分散関数（ポアソンなら V(μ) = μ）',
    '正規分布・恒等リンクなら、1回で終わる',
    '最小二乗は QR 分解で解く（丸め誤差に強い）',
    'REML・ML で正準リンク以外のときは、重みをニュートン法の形に取りかえる（Wood 2011）',
  ], 8.7, 4.74, 3.85, 2.0, { fontSize: 11.5, space: 4 });
}

// =====================================================================
// 16. 第5章 ポアソンの例
// =====================================================================
{
  const maxWeight = Math.max(...poisLast.w);
  const slide = contentSlide('05　P-IRLS', 'ポアソンの例で反復を見る', [
    '個数のデータの例です。右は、データと平均 μ の曲線です。左は、同じものを対数の目盛り、つまりリンク関数の目盛りで見たものです。',
    '出発点では、μ をデータそのものに近い値にします。そこから、作業用の応答 z と重みを計算します。丸の大きさが重みです。重みつきの、ペナルティつき最小二乗で、曲線が1本決まります。曲線が変わると、z と重みも変わるので、もう一度当てはめます。',
    `この例では、${poisIterations} 回で収束しました。逸脱度は ${poisSteps.slice(1, 4).map((s) => fmt(s.deviance, 1)).join('、')} と下がって止まり、係数は mgcv の結果と一致します。`,
  ]);
  addText(slide, '対数の目盛り（線形予測子 η）：収束したときの z と曲線', MARGIN_X, 1.5, 6.0, 0.3, { fontSize: 13, bold: true });
  const L = plotFrame(slide, { x: 1.3, y: 2.0, w: 4.9, h: 3.2 }, [0, 1], [-4.2, 3.6], { xticks: [0, 0.5, 1], yticks: [-4, -2, 0, 2], fmtX: HALF_TICK, fmtY: (v) => fmt(v, 0), xlabel: 'x' });
  POIS.x.forEach((x, i) => {
    const d = 0.03 + 0.11 * Math.sqrt(poisLast.w[i] / maxWeight);
    slide.addShape(pres.shapes.OVAL, { x: L.sx(x) - d / 2, y: L.sy(poisLast.z[i]) - d / 2, w: d, h: d, fill: { color: C.purple, transparency: 50 }, line: { type: 'none' } });
  });
  addCurve(slide, L, POIS.grid, POIS.etaTrue, { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
  addCurve(slide, L, POIS.grid, M.matVec(POIS.Xp, poisLast.beta), { color: FIT_COLOR, width: 2.5 });
  addText(slide, 'もとの目盛り（個数 y と平均 μ）', 6.95, 1.5, 5.7, 0.3, { fontSize: 13, bold: true });
  const Rp = plotFrame(slide, { x: 7.65, y: 2.0, w: 4.9, h: 3.2 }, [0, 1], [0, 19.5], { xticks: [0, 0.5, 1], yticks: [0, 5, 10, 15], fmtX: HALF_TICK, xlabel: 'x' });
  addPoints(slide, Rp, POIS.x, POIS.y, { d: 0.06 });
  addCurve(slide, Rp, POIS.grid, POIS.etaTrue.map(Math.exp), { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
  addCurve(slide, Rp, POIS.grid, M.matVec(POIS.Xp, poisLast.beta).map(Math.exp), { color: FIT_COLOR, width: 2.5 });
  legendRow(slide, [{ dot: true, color: C.purple, label: '作業用の応答 z（大きさ＝重み）' }, { color: FIT_COLOR, width: 2.5, label: '当てはめた曲線' }, { color: TRUTH_COLOR, dash: 'dash', label: '真の平均' }, { dot: true, color: C.slate, label: 'データ（個数）' }], MARGIN_X + 0.4, 5.72);
  addText(slide, '逸脱度', MARGIN_X, 6.1, 1.1, 0.72, { fontSize: 14, bold: true, valign: 'middle' });
  const cw = (CONTENT_W - 1.1 - 0.25 * (poisIterations - 1)) / poisIterations;
  poisSteps.slice(1).forEach((s, i) => {
    const x = MARGIN_X + 1.1 + i * (cw + 0.25);
    const lastStep = i === poisIterations - 1;
    addCard(slide, x, 6.1, cw, 0.72, { fill: lastStep ? C.tealTint : C.gray, line: null });
    addText(slide, `${i + 1}回目`, x + 0.2, 6.1, 0.9, 0.72, { fontSize: 13, color: C.slate, valign: 'middle' });
    addText(slide, fmt(s.deviance, 2), x + 1.0, 6.1, cw - 1.2, 0.72, { fontSize: 17, bold: true, valign: 'middle', align: 'right' });
  });
}

// =====================================================================
// 17. 第6章 GCV と REML
// =====================================================================
{
  const slide = contentSlide('06　平滑化パラメータ λ を選ぶ', 'λ を選ぶ基準：GCV と REML', [
    '残る問題は、λ の選び方です。mgcv には、大きく分けて2つの基準があります。1つ目は GCV、一般化交差検証です。データを1点ずつ抜いて予測したときの誤差を、近似する量です。分母に有効自由度が入り、複雑なモデルほど不利になります。',
    '2つ目は REML です。ペナルティを、係数の事前分布とみなします。すると λ は、事前分布の分散を決めるパラメータになります。係数を積分して消した尤度、つまり周辺尤度を作り、それを最大にする λ を選びます。正規分布以外では、積分をラプラス近似で計算します。',
    'gam の既定は GCV です。ただし作者の Wood は論文で、REML のほうが誤差が小さく、極端な波打ちが起きにくいと報告しています。method = "REML" と指定します。',
  ]);
  const w = (CONTENT_W - 0.3) / 2;
  titledCard(slide, MARGIN_X, 1.55, w, 4.1, 'GCV：一般化交差検証（予測の誤差を小さく）', { fill: C.purpleTint });
  addFormula(slide, 'gcv', MARGIN_X + 0.3, 2.15, { scale: 0.5, alt: 'V_g = n ‖y − μ̂‖² / (n − edf)²' });
  addBullets(slide, [
    'データを1点ずつ抜いて予測したときの誤差を、近似する量',
    '分母に有効自由度（edf）が入り、複雑なモデルほど不利になる',
    'gam( ) の既定（method = "GCV.Cp"）。尺度 φ が既知の分布では UBRE を使う',
  ], MARGIN_X + 0.3, 3.45, w - 0.6, 2.0, { fontSize: 13 });
  titledCard(slide, MARGIN_X + w + 0.3, 1.55, w, 4.1, 'REML：制限付き最尤（周辺尤度を大きく）', { fill: C.tealTint });
  addFormula(slide, 'prior', MARGIN_X + w + 0.6, 2.1, { scale: 0.46, alt: 'β ~ N(0, φ S_λ⁻)' });
  addFormula(slide, 'reml', MARGIN_X + w + 0.6, 2.62, { scale: 0.385, alt: 'V_r = D_p/(2φ) − ℓ_s + (log|XᵀWX + S_λ| − log|S_λ|₊)/2 − (M_p/2) log(2πφ)' });
  addBullets(slide, [
    'ペナルティ ＝ 係数の事前分布。λ は事前分布の分散を決める',
    '係数を積分して消した周辺尤度を最大にする（正規分布以外はラプラス近似）',
    'D_{p}：ペナルティつき逸脱度、M_{p}：ペナルティのかからない係数の数',
  ], MARGIN_X + w + 0.6, 3.6, w - 0.6, 1.9, { fontSize: 13 });
  addCard(slide, MARGIN_X, 5.85, CONTENT_W, 0.95, { fill: C.navy, line: null });
  addText(slide, 'gam の既定は GCV。Wood (2011) は、REML のほうが誤差が小さく、極端な波打ちが起きにくいと報告 → method = "REML" と指定する', MARGIN_X + 0.35, 5.85, CONTENT_W - 0.7, 0.95, { fontSize: 15, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 18. 第6章 GCV と REML の曲線
// =====================================================================
{
  const slide = contentSlide('06　平滑化パラメータ λ を選ぶ', 'GCV と REML の曲線', [
    `基底が ${WIDE_K} 本の例で、λ を端から端まで動かして、2つの基準を計算しました。どちらも、小さいほど良い量です。λ が小さすぎても、大きすぎても、基準は大きくなります。その間に谷があります。`,
    `谷の底が、選ばれる λ です。この例では、GCV と REML で、ほぼ同じ λ が選ばれました。有効自由度は、どちらも約 ${fmt(wideOpt.edf, 1)} です。破線は mgcv が選んだ λ で、この資料で計算した谷の底と一致します。`,
    '違うのは、λ が小さい側の形です。GCV は、ある高さで頭打ちになります。REML は、λ を小さくするほど、大きくなり続けます。小さすぎる λ を、REML のほうが強く避けます。',
  ]);
  const panel = (x, title, color, values, yr, yticks, mgcvLambda, valueAtMin) => {
    addText(slide, title, x - 0.7, 1.5, 5.6, 0.3, { fontSize: 14, bold: true, color });
    const P = plotFrame(slide, { x, y: 2.0, w: 4.9, h: 3.0 }, [-8, 6], yr, { xticks: [-8, -4, 0, 4], yticks, fmtX: () => '' });
    [-8, -4, 0, 4].forEach((e) => addText(slide, power(e), P.sx(e) - 0.5, 5.06, 1, 0.22, { fontSize: 10, color: C.muted, align: 'center' }));
    addText(slide, 'λ', x + 4.95, 5.06, 0.2, 0.22, { fontSize: 11, color: C.slate });
    addCurve(slide, P, SCAN_LOGS, values, { color, width: 2.5 });
    addLine(slide, P.sx(log10(mgcvLambda)), 2.0, P.sx(log10(mgcvLambda)), 5.0, { color: C.slate, width: 1, dash: 'dash' });
    addDots(slide, P, [log10(mgcvLambda)], [valueAtMin], { color: C.navy, d: 0.15 });
    return P;
  };
  const G = panel(1.3, 'GCV', GCV_COLOR, SCAN.map((f) => f.gcv), [3.7, 9.2], [4, 6, 8], WIDE.spGcv, WIDE.fit(WIDE.spGcv).gcv);
  addText(slide, `λ → 0 で ${fmt(gcvFloor, 2)} に頭打ち`, G.sx(-7.6), G.sy(6.9), 2.6, 0.26, { fontSize: 12, bold: true });
  addLine(slide, G.sx(-6.0), G.sy(6.5), G.sx(-6.6), G.sy(5.35), { color: C.navy, width: 1, arrow: true });
  const Rm = panel(7.65, 'REML', REML_COLOR, SCAN.map((f) => f.reml), [415, 670], [450, 550, 650], WIDE.sp, wideOpt.reml);
  addText(slide, '小さくするほど大きくなり続ける', Rm.sx(-5.2), Rm.sy(650), 3.0, 0.26, { fontSize: 12, bold: true });
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  [
    [C.gray, `${WIDE.spGcv.toFixed(4)} ／ ${WIDE.sp.toFixed(4)}`, `GCV と REML が選んだ λ（mgcv と一致）。有効自由度は約 ${fmt(wideOpt.edf, 1)}`],
    [C.purpleTint, 'GCV', 'λ が小さい側で頭打ち。小さすぎる λ との差が小さい'],
    [C.tealTint, 'REML', '小さすぎる λ を強く避ける。極端な波打ちが起きにくい'],
  ].forEach(([fill, big, small], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 5.55, cw, 1.25, { fill, line: null });
    addText(slide, big, x + 0.25, 5.62, cw - 0.5, 0.42, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, small, x + 0.25, 6.06, cw - 0.5, 0.66, { fontSize: 12, color: C.slate });
  });
}

// =====================================================================
// 19. 第6章 データを作り直して比べる
// =====================================================================
{
  const BIN = 0.5;
  const EDF_RANGE = [2, 15];
  const bins = Math.round((EDF_RANGE[1] - EDF_RANGE[0]) / BIN);
  const histogram = (values) => {
    const counts = new Array(bins).fill(0);
    values.forEach((v) => counts[Math.min(bins - 1, Math.max(0, Math.floor((v - EDF_RANGE[0]) / BIN)))]++);
    return counts;
  };
  const labels = Array.from({ length: bins }, (_, i) => String(EDF_RANGE[0] + i * BIN));
  const WORST = STUDY.worst;
  const R = D.repeats;
  const slide = contentSlide('06　平滑化パラメータ λ を選ぶ', 'データを作り直して比べる', [
    `この違いを確かめるため、データを ${R.count} 回作り直して、選ばれた有効自由度を比べました。真の関数は、山が1つの、なだらかな曲線です。REML が選んだ有効自由度は、${Math.round(medianReml)} のまわりに集まります。最大でも ${fmt(Math.max(...STUDY.edfReml), 1)} です。`,
    `GCV も、ほとんどは同じあたりです。しかし、ときどき大きく外れます。REML の中央値の2倍を超えたのは、${R.count} 回のうち ${outliersGcv} 回で、最大は ${fmt(Math.max(...STUDY.edfGcv), 1)} でした。`,
    `右は、GCV がいちばん外れた回です。GCV の曲線は波打っています。真の関数との平均二乗誤差は、${R.count} 回の平均で、REML が ${fmt(mean(STUDY.mseReml), 3)}、GCV が ${fmt(mean(STUDY.mseGcv), 3)} でした。ただし、GCV のほうが誤差の小さい回も ${gcvWins} 回あります。この条件での結果である点に注意します。`,
  ]);
  slide.addChart(pres.charts.BAR, [
    { name: 'REML', labels, values: histogram(STUDY.edfReml) },
    { name: 'GCV', labels, values: histogram(STUDY.edfGcv) },
  ], {
    x: MARGIN_X, y: 1.45, w: 7.3, h: 4.25, ...chartBase(), barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 30, chartColors: [REML_COLOR, GCV_COLOR],
    showTitle: true, title: `選ばれた有効自由度の分布（${R.count} 回）`, showLegend: true, legendPos: 'b', valAxisMinVal: 0,
    catAxisTitle: '有効自由度（幅 0.5 の区間の下端）', showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: C.muted, catAxisLabelFrequency: 2,
    valAxisTitle: '回数', showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: C.muted,
  });
  addText(slide, `GCV がいちばん外れた回（${WORST.index} 回目）`, 8.3, 1.5, 4.4, 0.3, { fontSize: 13, bold: true });
  const P = plotFrame(slide, { x: 8.85, y: 2.0, w: 3.7, h: 2.9 }, [0, 1], [-6, 9], { xticks: [0, 0.5, 1], yticks: [-5, 0, 5], fmtX: HALF_TICK, fmtY: (v) => fmt(v, 0) });
  addPoints(slide, P, WORST.x, WORST.y, { d: 0.05 });
  addCurve(slide, P, SINGLE.grid, WORST.truth, { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
  addCurve(slide, P, SINGLE.grid, WORST.fitReml, { color: REML_COLOR, width: 2.5 });
  addCurve(slide, P, SINGLE.grid, WORST.fitGcv, { color: GCV_COLOR, width: 2.5 });
  legendRow(slide, [{ color: REML_COLOR, width: 2.5, label: `REML（edf ${fmt(WORST.edfReml, 1)}）` }, { color: GCV_COLOR, width: 2.5, label: `GCV（edf ${fmt(WORST.edfGcv, 1)}）` }], 8.4, 5.3);
  const cw = (CONTENT_W - 0.3 * 2) / 3;
  [
    [C.tealTint, `最大 ${fmt(Math.max(...STUDY.edfReml), 1)} ／ ${fmt(Math.max(...STUDY.edfGcv), 1)}`, '有効自由度の最大（REML ／ GCV）'],
    [C.purpleTint, `${outliersGcv} 回 ／ ${outliersReml} 回`, `REML の中央値の2倍を超えた回数（GCV ／ REML、${R.count} 回中）`],
    [C.gray, `${fmt(mean(STUDY.mseReml), 3)} ／ ${fmt(mean(STUDY.mseGcv), 3)}`, `平均二乗誤差の平均（REML ／ GCV）。GCV のほうが良い回も ${gcvWins} 回`],
  ].forEach(([fill, big, small], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 5.9, cw, 0.92, { fill, line: null });
    addText(slide, big, x + 0.2, 5.9, 1.75, 0.92, { fontSize: 15, bold: true, valign: 'middle' });
    addText(slide, small, x + 1.95, 5.9, cw - 2.1, 0.92, { fontSize: 11, color: C.slate, valign: 'middle' });
  });
  addText(slide, `条件：y = 2 sin(πx) ＋ ノイズ（標準偏差 ${R.noiseSd}）、${R.n} 点、k = ${R.k}。この条件での結果`, MARGIN_X + 4.2, 7.08, 6.5, 0.25, { fontSize: 9, color: C.muted, align: 'right' });
}

// =====================================================================
// 20. 第6章 ニュートン法
// =====================================================================
{
  const slide = contentSlide('06　平滑化パラメータ λ を選ぶ', 'λ が複数あるとき：ニュートン法', [
    '滑らかな項が複数あると、λ も項の数だけあります。例の4変数では4つです。格子で探すと、組み合わせが多すぎます。mgcv は、λ の対数を変数にして、ニュートン法で基準を最小にします。勾配とヘッセ行列を使って、谷底へ一気に近づく方法です。',
    '計算は入れ子になります。外側で λ を更新し、内側では、その λ のもとで、P-IRLS で係数を解き直します。',
    '難しいのは微分です。λ を動かすと、係数の推定値も動きます。mgcv は、陰関数の微分を使って、この動きも含めた勾配とヘッセ行列を、厳密に計算します。谷が平らな向きでは、ヘッセ行列をそのまま使えません。固有値を直し、1歩の大きさに上限を付けて、安定に進めます。',
  ]);
  formulaBar(slide, 'newton', MARGIN_X, 1.55, CONTENT_W, 1.05, { scale: 0.56, note: lines(['g：勾配、H：ヘッセ行列', 'λ の対数の上で、基準（REML・GCV）を最小にする']), noteW: 5.6, alt: 'ρ_j = log λ_j, ρ ← ρ − H⁻¹g' });
  addTable(slide, ['', '動かすもの', '方法'], [
    ['外側', 'ρ = log λ（と尺度 φ）', 'ニュートン法で REML・GCV を最小にする'],
    ['内側', '係数 β', 'その λ のもとで、P-IRLS で係数を解き直す'],
  ], MARGIN_X, 2.85, [1.5, 4.2, 6.43], { rowH: 0.45, fontSize: 14 });
  titledCard(slide, MARGIN_X, 4.45, 7.5, 2.37, '難しいのは微分：λ を動かすと、係数の推定値も動く');
  addFormula(slide, 'implicit', MARGIN_X + 0.3, 5.0, { scale: 0.48, alt: 'dV_r/dρ_j = ∂V_r/∂ρ_j + (∂V_r/∂β̂ᵀ)(dβ̂/dρ_j)' });
  addText(slide, '係数の微分は、係数が満たす式（ペナルティつき尤度の勾配 ＝ 0）を ρ_{j} で微分して求める（陰関数の微分）。勾配とヘッセ行列を厳密に計算する', MARGIN_X + 0.3, 6.0, 6.9, 0.7, { fontSize: 12.5, color: C.slate });
  titledCard(slide, 8.4, 4.45, 4.33, 2.37, '安定に進める工夫', { fill: C.goldTint });
  addBullets(slide, ['ヘッセ行列が正定値でなければ、固有値を直す', '1歩の大きさに上限を付ける', '悪くなったら歩幅を半分にする'], 8.7, 5.05, 3.8, 1.6, { fontSize: 13 });
}

// =====================================================================
// 21. 第6章 REML の面とニュートン法の道筋
// =====================================================================
{
  const slide = contentSlide('06　平滑化パラメータ λ を選ぶ', 'REML の面とニュートン法の道筋', [
    '滑らかな項を2つにしたモデルで、REML の値を色で描きました。横軸が x1 の λ、縦軸が x2 の λ です。明るいところほど REML が小さく、良いところです。白い丸が出発点で、mgcv が、行列の大きさのつり合いから決める初期値です。',
    `ニュートン法の1歩目で、x2 の λ が大きく下がります。1歩の大きさの上限まで進んでいます。2歩目からは、谷底のまわりで細かく寄せていき、${newtonPath.length - 1} 回で動かなくなりました。`,
    `着いた点は、mgcv の出した λ と一致します。x2 の λ は、x1 の約 ${Math.round(lambdaRatio / 10) * 10} 分の1 です。x2 のほうが細かく曲がることを表しています。`,
  ]);
  const figureH = addFigure(slide, 'surface', MARGIN_X, 1.45, 5.75, 'REML の値の面と、ニュートン法の道筋');
  addText(slide, '明るいところほど REML が小さい（良い）。線は最小からの差が同じ点', MARGIN_X, 1.45 + figureH + 0.02, 5.75, 0.25, { fontSize: 10, color: C.muted });
  addText(slide, 'ニュートン法の道筋（y ~ s(x1) + s(x2) のモデル）', 6.75, 1.5, 5.9, 0.3, { fontSize: 14, bold: true });
  addTable(slide, ['反復', 'x_{1} の項の λ', 'x_{2} の項の λ', 'REML'], newtonPath.map((stepItem, i) => [
    i === 0 ? '出発点' : `${i} 回目`, Math.exp(stepItem.rho[0]).toPrecision(3), Math.exp(stepItem.rho[1]).toPrecision(3), fmt(stepItem.reml, 2),
  ]), 6.75, 1.9, [1.2, 1.6, 1.6, 1.58], { rowH: 0.38, fontSize: 12.5, highlight: { [newtonPath.length - 1]: C.tealTint } });
  const y0 = 1.9 + 0.38 * (newtonPath.length + 1) + 0.25;
  [
    [C.coralTint, '1歩目', 'x_{2} の λ が大きく下がる。1歩の大きさの上限（log λ で 5）まで進む'],
    [C.tealTint, '収束', `着いた点は mgcv の λ と一致。x_{2} の λ は x_{1} の約 ${Math.round(lambdaRatio / 10) * 10} 分の1 ＝ x_{2} のほうが細かく曲がる`],
  ].forEach(([fill, title, body], i) => {
    addCard(slide, 6.75, y0 + i * 1.0, 5.98, 0.85, { fill, line: null });
    addText(slide, title, 6.95, y0 + i * 1.0, 0.9, 0.85, { fontSize: 14, bold: true, valign: 'middle' });
    addText(slide, body, 7.85, y0 + i * 1.0, 4.75, 0.85, { fontSize: 12, color: C.slate, valign: 'middle' });
  });
  addText(slide, `この道筋は、勾配とヘッセ行列を差分で求めた再計算。mgcv は尺度 φ も同時に動かし、${TWO.outerIter} 回で収束した`, 6.75, y0 + 2.0, 5.98, 0.45, { fontSize: 11, color: C.muted });
}

// =====================================================================
// 22. 第7章 推定の不確かさ
// =====================================================================
{
  const slide = contentSlide('07　不確かさと summary() の読み方', '推定の不確かさ', [
    '係数の推定値だけでなく、その不確かさも必要です。mgcv は、ここでもペナルティを事前分布とみなす、ベイズの見方を使います。係数の事後分布は、近似的に正規分布になります。平均は推定値、共分散行列は、当てはめで使った行列の逆行列に、尺度 φ を掛けたものです。',
    '関数の標準誤差は、この共分散行列から計算します。plot で描かれる帯は、推定値の上下に、標準誤差の2倍をとったものです。この帯は、関数全体でならして見たときに、約 95% の割合で真の関数を含む、という性質があります。',
    'ただし、λ を既知の値として扱った結果です。λ の推定の不確かさも入れたいときは、unconditional = TRUE を指定します。',
  ]);
  formulaBar(slide, 'posterior', MARGIN_X, 1.55, CONTENT_W, 1.1, { scale: 0.5, note: 'ペナルティを事前分布とみなす（ベイズの見方）。事前分布 × 尤度 → 事後分布', noteW: 4.4, alt: 'β | y ~ N(β̂, V_β), V_β = (XᵀWX + S_λ)⁻¹ φ' });
  titledCard(slide, MARGIN_X, 2.9, 7.2, 1.85, '関数の標準誤差と、plot の帯');
  addFormula(slide, 'se', MARGIN_X + 0.3, 3.45, { scale: 0.46, alt: 'se(f̂(x)) = √(b(x)ᵀ V_β b(x)), 帯 = f̂(x) ± 2 se' });
  addText(slide, 'b(x)：点 x での基底関数の値を並べたベクトル', MARGIN_X + 0.3, 4.32, 6.6, 0.3, { fontSize: 12.5, color: C.slate });
  titledCard(slide, 8.1, 2.9, 4.63, 1.85, '帯の性質', { fill: C.tealTint });
  addText(slide, '関数全体でならすと、約 95% の割合で真の関数を含む（点ごとに 95% ではない）', 8.4, 3.42, 4.05, 0.9, { fontSize: 13 });
  addText(slide, 'Nychka (1988)、Marra & Wood (2012)', 8.4, 4.36, 4.05, 0.26, { fontSize: 10.5, color: C.muted });
  titledCard(slide, MARGIN_X, 4.95, 7.2, 1.87, '注意：λ を既知の値として扱った結果', { fill: C.coralTint });
  codeBox(slide, ['plot(b, unconditional = TRUE)'], MARGIN_X + 0.3, 5.5, 4.4, 0.55, { fontSize: 13 });
  addText(slide, 'λ の推定の不確かさも入れた帯になる', MARGIN_X + 0.3, 6.2, 6.6, 0.3, { fontSize: 12.5, color: C.slate });
  titledCard(slide, 8.1, 4.95, 4.63, 1.87, 'mgcv での場所');
  addText(slide, lines(['共分散行列 V_{β}：b$Vp', '係数ごとの有効自由度：b$edf', '行列 XᵀWX + S_{λ} は、P-IRLS の最後の反復で解いた連立方程式の行列']), 8.4, 5.47, 4.05, 1.3, { fontSize: 12, color: C.slate, paraSpaceAfter: 3 });
}

// =====================================================================
// 23. 第7章 4つの関数と帯
// =====================================================================
{
  const lambdaText = (value) => (value >= 1000 ? `約 ${roughJapanese(value)}` : value >= 0.1 ? fmt(value, 2) : fmt(value, 4));
  const slide = contentSlide('07　不確かさと summary() の読み方', '4つの関数と帯', [
    '例の4変数のモデルの結果です。緑の線が推定した関数、帯が標準誤差の2倍、橙の破線が真の関数です。真の関数は、ほぼ全域で帯の中に入っています。データの少ない両端では、帯が広がります。',
    `x2 は、λ が ${fmt(MAIN.sp[2], 3)} と小さく、有効自由度は ${fmt(MAIN.edf[2], 1)} です。細かい山を表すのに、自由度を多く使っています。`,
    `x3 は、λ が約 ${roughJapanese(MAIN.sp[3])} と非常に大きく、有効自由度は ${fmt(MAIN.edf[3], 1)} です。ほぼ水平な直線まで縮められました。真の効果が 0 であることと合っています。`,
  ]);
  const cw = (CONTENT_W - 0.3 * 3) / 4;
  MAIN.terms.forEach((term, j) => {
    const x = MARGIN_X + j * (cw + 0.3);
    addText(slide, `s(x${j})`, x, 1.5, cw, 0.32, { fontSize: 15, bold: true, align: 'center' });
    const P = plotFrame(slide, { x: x + 0.55, y: 1.95, w: cw - 0.7, h: 2.75 }, [0, 1], [-6.5, 7.5], { xticks: [0, 0.5, 1], yticks: [-5, 0, 5], fmtX: HALF_TICK, fmtY: (v) => fmt(v, 0) });
    addBand(slide, P, term.grid, term.fit.map((v, i) => v - 2 * term.se[i]), term.fit.map((v, i) => v + 2 * term.se[i]), FIT_COLOR);
    addCurve(slide, P, term.grid, term.truth, { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
    addCurve(slide, P, term.grid, term.fit, { color: FIT_COLOR, width: 2.5 });
    addCard(slide, x, 5.5, cw, 1.3, { fill: j === 2 ? C.tealTint : j === 3 ? C.goldTint : C.gray, line: null });
    [['λ', lambdaText(MAIN.sp[j])], ['有効自由度', fmt(MAIN.edf[j], 2)], ['真の関数が帯の中', `${Math.round(insideShare[j] * 100)}%`]].forEach(([label, value], r) => {
      addText(slide, label, x + 0.2, 5.58 + r * 0.38, 1.6, 0.34, { fontSize: 12, color: C.slate, valign: 'middle' });
      addText(slide, value, x + cw - 1.45, 5.58 + r * 0.38, 1.25, 0.34, { fontSize: 13.5, bold: true, align: 'right', valign: 'middle' });
    });
  });
  legendRow(slide, [{ color: FIT_COLOR, width: 2.5, label: '推定した関数（帯は ±2×標準誤差）' }, { color: TRUTH_COLOR, dash: 'dash', label: '真の関数' }], MARGIN_X + 0.4, 5.08);
}

// =====================================================================
// 24. 第7章 summary() の読み方
// =====================================================================
{
  const summaryLines = MAIN.summaryText.filter((line, i, all) => !line.startsWith('Signif.') && line !== '---' && !(line === '' && (i === 0 || all[i - 1] === '' || all[i - 1] === '---')));
  const pX3 = MAIN.sTable[3][3];
  const slide = contentSlide('07　不確かさと summary() の読み方', 'summary() の読み方', [
    'summary の出力です。上の表は切片、下の表が滑らかな項です。edf は、第4章で見た有効自由度です。1 に近ければ直線、大きいほど複雑な曲線です。',
    `p-value は、その関数が全体として 0 かどうかの検定です。x3 は ${fmt(pX3, 2)} で、効果があるとは言えません。値は近似なので、0.05 の近くでは慎重に読みます。`,
    `下の行の -REML は、最小にした REML の値です。Scale est. は尺度 φ の推定値で、${fmt(MAIN.scale, 2)} です。データを作ったときの分散は ${MAIN.noiseSd ** 2} でした。R-sq と Deviance explained は、当てはまりの良さです。この出力の数値は、どれも、ここまでの章の計算から出てきたものです。`,
  ]);
  codeBox(slide, summaryLines.map((line) => (line === '' ? ' ' : line)), MARGIN_X, 1.5, 7.6, 5.3, { fontSize: 12.5 });
  [
    [C.teal, 'edf', '有効自由度（第4章）', '行列 F の対角の和。1 に近い → 直線、大きい → 複雑な曲線'],
    [C.coral, 'p-value', '関数が 0 かどうかの検定', `近似の検定（Wood 2013）。s(x3) は ${fmt(pX3, 3)} で、効果があるとは言えない`],
    [C.purple, '-REML ／ Scale est.', '最小にした REML と、尺度 φ', `REML の値（第6章）と、尺度 φ の推定値 ${fmt(MAIN.scale, 2)}（真の分散は ${MAIN.noiseSd ** 2}）`],
    [C.goldText, 'R-sq.(adj) ／ Deviance explained', '当てはまりの良さ', '自由度を調整した決定係数と、説明できた逸脱度の割合'],
  ].forEach(([color, key, title, body], i) => {
    const y = 1.5 + i * 1.34;
    addCard(slide, 8.5, y, 4.23, 1.2);
    addCircle(slide, 8.85, y + 0.33, 0.36, color, String(i + 1), { fontSize: 12 });
    addText(slide, key, 9.15, y + 0.1, 3.45, 0.26, { fontSize: 12, bold: true, color, valign: 'middle', fontFace: CODE_FONT });
    addText(slide, title, 9.15, y + 0.36, 3.45, 0.28, { fontSize: 13, bold: true, valign: 'middle' });
    addText(slide, body, 8.7, y + 0.68, 3.9, 0.5, { fontSize: 11, color: C.slate });
  });
}

// =====================================================================
// 25. 第8章 実務での使い方
// =====================================================================
{
  const slide = contentSlide('08　実務での使い方と注意', '実務での使い方', [
    '最後に、実務での使い方をまとめます。λ の選び方は、method = "REML" を指定するのが基本です。基底の数 k は、大きめに取ります。k は自由度の上限で、実際のなめらかさは λ が決めるからです。足りているかは、gam.check で確かめます。',
    '効果のない変数を落としたいときは、select = TRUE を使います。直線の成分にもペナルティがかかり、項をまるごと 0 に縮められます。',
    '変数どうしの交互作用は、te や ti で表します。単位の違う変数を組み合わせるときに向いた、テンソル積の基底です。データが大きいときは、bam を使います。計算の手順を工夫して、メモリと時間を節約した関数です。',
  ]);
  const rows = [
    [C.teal, 'λ の選び方', 'method = "REML"', '極端な波打ちが起きにくい'],
    [C.coral, '基底の数', 's(x, k = 20)、gam.check(b)', 'k は自由度の上限。なめらかさは λ が決める'],
    [C.purple, '効かない項を縮める', 'select = TRUE', '直線の成分にもペナルティ → 項をまるごと 0 にできる'],
    [C.goldText, '交互作用', 'te(x, z)、ti(x, z)', '単位の違う変数は、テンソル積の基底で'],
    [C.slate, '大きなデータ', 'bam(..., discrete = TRUE)', 'メモリと時間を節約する計算手順'],
  ];
  addText(slide, 'やること', MARGIN_X + 0.85, 1.5, 3.0, 0.3, { fontSize: 12, bold: true, color: C.muted });
  addText(slide, '書き方', 4.6, 1.5, 3.6, 0.3, { fontSize: 12, bold: true, color: C.muted });
  addText(slide, '理由', 8.6, 1.5, 4.0, 0.3, { fontSize: 12, bold: true, color: C.muted });
  rows.forEach(([color, what, code, why], i) => {
    const y = 1.88 + i * 0.99;
    addCard(slide, MARGIN_X, y, CONTENT_W, 0.85);
    addCircle(slide, MARGIN_X + 0.42, y + 0.425, 0.46, color, String(i + 1), { fontSize: 15 });
    addText(slide, what, MARGIN_X + 0.85, y, 3.0, 0.85, { fontSize: 15, bold: true, valign: 'middle' });
    addCard(slide, 4.5, y + 0.16, 3.8, 0.53, { fill: C.gray, line: null });
    addText(slide, code, 4.65, y + 0.16, 3.5, 0.53, { fontSize: 12.5, valign: 'middle', fontFace: CODE_FONT });
    addText(slide, why, 8.6, y, 4.0, 0.85, { fontSize: 13, color: C.slate, valign: 'middle' });
  });
}

// =====================================================================
// 26. 第8章 k が足りているかを確かめる
// =====================================================================
{
  const K = D.kStudy;
  const slide = contentSlide('08　実務での使い方と注意', 'k が足りているかを確かめる', [
    `1変数の例で、k を ${K.map((item) => item.k).join('、')} と変えて当てはめました。下の表は、gam.check が出す値です。k が ${K[0].k} では、山の形を表しきれません。有効自由度は ${fmt(K[0].edf, 2)} で、上限の ${K[0].kPrime} に張りついています。p 値も ${fmt(K[0].pValue, 2)} と小さく、k の不足を示しています。`,
    `k を ${K[1].k} にすると、形が合います。有効自由度は ${fmt(K[1].edf, 1)} で、上限の ${K[1].kPrime} に近い値です。${K[2].k} と ${K[3].k} では、曲線はほとんど変わりません。有効自由度も ${fmt(K[2].edf, 1)} と ${fmt(K[3].edf, 1)} で、ほぼ同じです。`,
    'k が十分に大きければ、結果は k にほとんどよりません。有効自由度が上限に近いときは、k を増やして確かめます。',
  ]);
  const labelW = 2.33;
  const colW = (CONTENT_W - labelW) / 4;
  K.forEach((item, j) => {
    const x = MARGIN_X + labelW + j * colW;
    const P = plotFrame(slide, { x: x + 0.5, y: 1.55, w: colW - 0.7, h: 2.6 }, [0, 1], SINGLE_Y, singleAxes);
    addBand(slide, P, SINGLE.grid, item.fit.map((v, i) => v - 2 * item.se[i]), item.fit.map((v, i) => v + 2 * item.se[i]), FIT_COLOR);
    addCurve(slide, P, SINGLE.grid, SINGLE.truth, { color: TRUTH_COLOR, width: 1.5, dash: 'dash' });
    addCurve(slide, P, SINGLE.grid, item.fit, { color: FIT_COLOR, width: 2.5 });
  });
  addText(slide, lines(['推定した関数（帯は ±2×標準誤差）と、真の関数（破線）', 'データの点は省略']), MARGIN_X, 2.2, labelW - 0.3, 1.4, { fontSize: 11.5, color: C.slate });
  addTable(slide, ['', ...K.map((item) => `k = ${item.k}`)], [
    ['上限 k − 1', ...K.map((item) => String(item.kPrime))],
    ['有効自由度', ...K.map((item) => fmt(item.edf, 2))],
    ['k-index', ...K.map((item) => fmt(item.kIndex, 2))],
    ['p 値', ...K.map((item) => fmt(item.pValue, 2))],
    ['真の関数との差', ...K.map((_, j) => fmt(kError[j], 2))],
  ], MARGIN_X, 4.5, [labelW, colW, colW, colW, colW], { rowH: 0.34, fontSize: 12.5 });
  addCard(slide, MARGIN_X, 6.62, CONTENT_W, 0.4, { fill: C.coralTint, line: null });
  addText(slide, `k = ${K[0].k}：有効自由度 ${fmt(K[0].edf, 2)} が上限 ${K[0].kPrime} に張りつき、p 値も ${fmt(K[0].pValue, 2)} → k の不足。k が十分に大きければ、結果は k にほとんどよらない`, MARGIN_X + 0.3, 6.62, CONTENT_W - 0.6, 0.4, { fontSize: 12.5, bold: true, valign: 'middle' });
}

// =====================================================================
// 27. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, 'まとめ', MARGIN_X, 0.62, CONTENT_W, 0.75, { fontSize: 28, bold: true, color: C.white, valign: 'middle' });
  const items = [
    [C.teal, '滑らかな関数 ＝ 基底 × 係数の和。既定は薄板回帰スプライン（固有値で k 個に切り詰めた基底）'],
    [C.coral, '係数は ‖y − Xβ‖^{2} + λ β^{T}Sβ を最小にして解く。正規分布以外は P-IRLS で繰り返す'],
    [C.purple, 'λ は REML か GCV で選ぶ。log λ のニュートン法（外側で λ、内側で係数）'],
    [C.goldText, '有効自由度 tr(F)・帯・p 値は、同じ行列 X^{T}WX + S_{λ} から計算される'],
    [C.slate, '注意：帯は λ を固定した結果、p 値は近似。k が足りているかは gam.check で確かめる'],
  ];
  items.forEach(([color, text], i) => {
    addCircle(slide, MARGIN_X + 0.3, 1.95 + i * 0.98, 0.5, color, String(i + 1), { fontSize: 15 });
    addText(slide, text, MARGIN_X + 0.75, 1.62 + i * 0.98, 6.6, 0.7, { fontSize: 15, color: C.white, valign: 'middle' });
  });
  addCard(slide, 8.0, 1.6, 4.73, 5.15, { fill: C.navy2, line: null });
  addCircle(slide, 8.5, 2.1, 0.55, C.teal, '✓', { fontSize: 16 });
  addText(slide, '使うときのチェック', 8.95, 1.82, 3.6, 0.55, { fontSize: 17, bold: true, color: C.white, valign: 'middle' });
  ['method = "REML" を指定したか', 'k は十分か（gam.check、edf と上限）', 'edf と帯で、関数の形を確かめたか', 'p 値を、近似として読んでいるか', '分布とリンク関数はデータに合うか'].forEach((text, i) => {
    addCard(slide, 8.3, 2.75 + i * 0.78, 4.13, 0.62, { fill: C.navy, line: null });
    addText(slide, `${i + 1}　${text}`, 8.5, 2.75 + i * 0.78, 3.85, 0.62, { fontSize: 13, color: C.onDark2, valign: 'middle' });
  });
  footer(slide, { dark: true });
  slide.addNotes([
    'まとめです。mgcv は、滑らかな関数を、基底と係数で表します。既定の基底は、固有値で切り詰めた、薄板回帰スプラインです。係数は、波打ちのペナルティを足した最小二乗で解きます。正規分布以外では、これを P-IRLS で繰り返します。',
    '平滑化パラメータ λ は、REML か GCV で選びます。対数の上のニュートン法で、外側で λ、内側で係数を解く、入れ子の計算です。',
    '有効自由度、帯、p 値は、どれも同じ行列から計算されます。帯は λ を固定した結果で、p 値は近似である点に注意します。右のチェックを、使うときの確認に使ってください。',
  ].join('\n'));
}

// =====================================================================
// 28. 参考文献
// =====================================================================
{
  const slide = contentSlide(null, '参考文献', [
    'この資料の参考文献です。薄板回帰スプラインは Wood の 2003 年の論文、REML とニュートン法による平滑化パラメータの推定は 2011 年の論文に基づきます。',
    'p 値は Wood の 2013 年の論文、帯の性質は Nychka の論文と、Marra と Wood の論文です。全体は Wood の教科書にまとまっています。',
    `図の数値は mgcv ${VERSION} で計算し、この資料の計算と一致することを確かめました。例のデータは、説明用に乱数で作った合成データです。`,
  ]);
  const refs = [
    '[1] S. N. Wood (2003). Thin plate regression splines. Journal of the Royal Statistical Society: Series B 65(1), 95–114.',
    '[2] S. N. Wood (2011). Fast stable restricted maximum likelihood and marginal likelihood estimation of semiparametric generalized linear models. Journal of the Royal Statistical Society: Series B 73(1), 3–36.',
    '[3] S. N. Wood (2013). On p-values for smooth components of an extended generalized additive model. Biometrika 100(1), 221–228.',
    '[4] G. Marra, S. N. Wood (2012). Coverage properties of confidence intervals for generalized additive model components. Scandinavian Journal of Statistics 39(1), 53–74.',
    '[5] D. Nychka (1988). Bayesian confidence intervals for smoothing splines. Journal of the American Statistical Association 83(404), 1134–1143.',
    '[6] S. N. Wood (2017). Generalized Additive Models: An Introduction with R, 2nd ed. CRC Press.',
  ];
  addText(slide, refs.map((text, i) => ({ text, breakLine: i < refs.length - 1 })), MARGIN_X, 1.6, CONTENT_W, 4.2, { fontSize: 13, paraSpaceAfter: 10, color: C.navy });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.75, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.4, 6.425, 0.42, C.navy, 'i', { fontSize: 13 });
  addText(slide, `図の数値は mgcv ${VERSION}（${D.rVersion.replace(/ \(.*$/, '')}、webR）で計算した。例のデータは、gamSim の関数（Gu と Wahba の例）をもとに乱数（種を固定）で作った合成データで、実在のデータではない`, MARGIN_X + 0.8, 6.05, CONTENT_W - 1.0, 0.75, { fontSize: 12.5, valign: 'middle' });
}

pres.writeFile({ fileName: OUTPUT }).then((file) => console.log(`${file}（${pageNumber} 枚）`));
