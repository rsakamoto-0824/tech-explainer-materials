// build-deck.cjs — 「動画で学ぶガウス過程回帰」にあわせたパワーポイントを pptxgenjs で組み立てる。
// 見た目は「技術レポートPowerPoint」テンプレート（濃紺の表紙とまとめ、白地の本文、淡い色のカード）に合わせる。
// 数値とグラフの線は動画と同じ計算（js/gp-math.js、js/short-data.js、同じ乱数の種）から取る。数式とカーネル行列の色の図は deck/make-assets.mjs が作った画像。
//   NODE_PATH="$(npm root -g)" node deck/build-deck.cjs out/deck_raw.pptx
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = process.argv[2] || path.join(ROOT, 'out', 'deck_raw.pptx');
const ASSET_DIR = path.join(__dirname, 'assets');
const ASSETS = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'assets.json'), 'utf8'));

// 動画と同じ計算の部品を読む（window が無ければ globalThis に置く作りになっている）
new Function(fs.readFileSync(path.join(ROOT, 'js', 'gp-math.js'), 'utf8'))();
new Function(fs.readFileSync(path.join(ROOT, 'js', 'short-data.js'), 'utf8'))();
const G = globalThis.GPM;
const D = globalThis.SHORT_DATA;

// ---- 定数（テンプレートの寸法・色・フォント） ----
const SLIDE_W = 13.333;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const FONT = 'BIZ UDGothic';
const DECK_NAME = '動画で学ぶガウス過程回帰';
const DECK_DATE = '2026年11月';
const C = {
  navy: '22223B', navy2: '34365A', slate: '4A4E69', muted: '6C6F7F', line: 'DADDE6', line2: 'BFC3D1', grid: 'E8EAF0',
  gray: 'F3F4F8', white: 'FFFFFF', onDark: 'A9ACC6', onDark2: 'D9DBEA',
  coral: 'E76F51', coralTint: 'FBE3DC', teal: '2A9D8F', tealTint: 'D8F0ED', purple: '8D6A9F', purpleTint: 'ECE3F1',
  gold: 'E9C46A', goldText: '9C7412', goldTint: 'FBF1D6',
};
// グラフの色は動画と同じ（明るい地用に検証した配色）。予測の平均と帯は青、引いた関数はオレンジ・青緑・紫の順
const DC = { mean: '2A78D6', orange: 'EB6834', aqua: '1BAF7A', violet: '6250D6', truth: '8A857A', data: C.navy, other: 'B9B2A3' };
const SAMPLE_COLORS = [DC.orange, DC.aqua, DC.violet];
const sampleColor = (i) => SAMPLE_COLORS[i] || DC.other;
const BAND_TRANSPARENCY = 80; // 動画の帯の濃さ（不透明度 0.2）に合わせる

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '動画で学ぶガウス過程回帰 ― 基礎から予測まで';
pres.lang = 'ja-JP';
let pageNumber = 0;

// ---- 数値の書式（マイナスは「−」） ----
const fmt = (v, digits = 2) => {
  const text = v.toFixed(digits);
  if (/^-0\.?0*$/.test(text)) return text.slice(1);
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
};

// ---- 文字（"σ_{f}" は下付き、"r^{2}" は上付きのランにする） ----
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
// ギリシャ文字の ν は、ゴシック体だと v と見分けにくいので、明朝系の斜体で書く
const NU_FONT = 'Times New Roman';
function splitNu(runs) {
  return runs.flatMap((run) => run.text.split(/(ν)/).filter(Boolean).map((part, i, parts) => {
    const options = part === 'ν' ? { ...run.options, fontFace: NU_FONT, italic: true } : { ...run.options };
    if (i < parts.length - 1) delete options.breakLine;
    return { text: part, options };
  }));
}
function toRuns(item, base = {}) {
  return splitNu(toRunsRaw(item, base));
}
function toRunsRaw(item, base = {}) {
  if (typeof item === 'string') return parseRich(item, base);
  if (Array.isArray(item)) return item.flatMap((part) => toRunsRaw(part, base));
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
// 数式の画像を倍率で置く。返り値は置いた大きさ
function addFormula(slide, key, x, y, { scale = 0.6, alt = key } = {}) {
  const a = asset(`formula-${key}`);
  const w = a.w * scale;
  const h = a.h * scale;
  slide.addImage({ path: path.join(ASSET_DIR, a.file), x, y, w, h, altText: alt });
  return { w, h };
}
const formulaSize = (key, scale = 0.6) => ({ w: asset(`formula-${key}`).w * scale, h: asset(`formula-${key}`).h * scale });
// 濃紺の帯に数式を置く（左寄せ、右に説明を書ける）
function formulaBar(slide, key, x, y, w, h, { scale = 0.6, note, noteW = 4.6, alt } = {}) {
  addCard(slide, x, y, w, h, { fill: C.navy, line: null, radius: 0.08 });
  const size = formulaSize(key, scale);
  const fx = note ? x + 0.35 : x + (w - size.w) / 2;
  addFormula(slide, key, fx, y + (h - size.h) / 2, { scale, alt });
  if (note) addText(slide, note, x + w - noteW - 0.35, y, noteW, h, { fontSize: 14, color: C.onDark2, valign: 'middle' });
}
// 強調の帯（山吹色の淡い地）
function calloutBar(slide, text, x, y, w, h, { fontSize = 16 } = {}) {
  addCard(slide, x, y, w, h, { fill: C.goldTint, line: null });
  addText(slide, text, x + 0.3, y, w - 0.6, h, { fontSize, bold: true, valign: 'middle' });
}
function numberedRow(slide, num, color, x, y, w, h, title, desc, { titleSize = 16, descSize = 13.5 } = {}) {
  addCard(slide, x, y, w, h, { fill: C.white });
  addCircle(slide, x + 0.42, y + h / 2, 0.46, color, String(num), { fontSize: 15 });
  addText(slide, title, x + 0.85, y + 0.1, w - 1.05, 0.38, { fontSize: titleSize, bold: true, valign: 'middle' });
  if (desc) addText(slide, desc, x + 0.85, y + 0.5, w - 1.05, h - 0.58, { fontSize: descSize, color: C.slate });
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

// ---- グラフ（曲線と帯は図形で描く。点の数が多い連続の曲線は、ネイティブのグラフより崩れにくい） ----
function plotFrame(slide, box, xr, yr, { xticks = [], yticks = [], fmtX = (v) => String(v), fmtY = (v) => fmt(v, 0), xlabel, ylabel, logX = false, axisColor = C.line2, labelColor = C.muted, grid = true } = {}) {
  const sx = (v) => box.x + (logX ? Math.log10(v / xr[0]) / Math.log10(xr[1] / xr[0]) : (v - xr[0]) / (xr[1] - xr[0])) * box.w;
  const sy = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h;
  if (grid) yticks.forEach((v) => addLine(slide, box.x, sy(v), box.x + box.w, sy(v), { color: C.grid, width: 0.75 }));
  if (yr[0] < 0 && yr[1] > 0) addLine(slide, box.x, sy(0), box.x + box.w, sy(0), { color: axisColor, width: 1 });
  addLine(slide, box.x, box.y, box.x, box.y + box.h, { color: axisColor, width: 1 });
  addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: axisColor, width: 1 });
  xticks.forEach((v) => addText(slide, fmtX(v), sx(v) - 0.5, box.y + box.h + 0.05, 1, 0.22, { fontSize: 10, color: labelColor, align: 'center' }));
  yticks.forEach((v) => addText(slide, fmtY(v), box.x - 0.6, sy(v) - 0.11, 0.52, 0.22, { fontSize: 10, color: labelColor, align: 'right' }));
  if (xlabel) addText(slide, xlabel, box.x + box.w - 2.5, box.y + box.h + 0.27, 2.5, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
  if (ylabel) addText(slide, ylabel, box.x + 0.08, box.y - 0.02, 2.6, 0.22, { fontSize: 10, color: C.slate });
  return { box, xr, yr, sx, sy };
}
// 枠だけの座標変換（軸を描かない小さな図や、表紙の図に使う）
const bareFrame = (box, xr, yr) => ({
  box, xr, yr,
  sx: (v) => box.x + ((v - xr[0]) / (xr[1] - xr[0])) * box.w,
  sy: (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h,
});
function polyline(slide, points, line, fill) {
  const minX = Math.min(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  const w = Math.max(Math.max(...points.map((p) => p[0])) - minX, 0.01);
  const h = Math.max(Math.max(...points.map((p) => p[1])) - minY, 0.01);
  const pts = points.map(([px, py]) => ({ x: px - minX, y: py - minY }));
  if (fill) pts.push({ close: true });
  const options = { x: minX, y: minY, w, h, points: pts };
  if (fill) options.fill = fill;
  if (line) options.line = line;
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, options);
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
    const line = { color, width };
    if (dash) line.dashType = dash;
    polyline(slide, seg, line, null);
  });
}
// 帯（下の線と上の線の間を塗る）。枠の外は枠の端で切る
function addBand(slide, P, xs, lower, upper, { color = DC.mean, transparency = BAND_TRANSPARENCY } = {}) {
  const clampY = (y) => Math.min(Math.max(y, P.yr[0]), P.yr[1]);
  const top = xs.map((x, i) => [P.sx(x), P.sy(clampY(upper[i]))]);
  const bottom = xs.map((x, i) => [P.sx(x), P.sy(clampY(lower[i]))]).reverse();
  polyline(slide, [...top, ...bottom], null, { color, transparency });
}
// 予測の平均と ±2σ の帯（動画の drawPrediction と同じ）
function addPrediction(slide, P, xs, pred, { color = DC.mean, width = 2.5, transparency = BAND_TRANSPARENCY, meanLine = true } = {}) {
  const mean = Array.from(pred.mean);
  const sd = Array.from(pred.sd);
  addBand(slide, P, xs, mean.map((m, i) => m - 2 * sd[i]), mean.map((m, i) => m + 2 * sd[i]), { color, transparency });
  if (meanLine) addCurve(slide, P, xs, mean, { color, width });
}
function addDots(slide, P, xs, ys, { color = DC.data, d = 0.11, ring = C.white } = {}) {
  xs.forEach((x, i) => slide.addShape(pres.shapes.OVAL, { x: P.sx(x) - d / 2, y: P.sy(ys[i]) - d / 2, w: d, h: d, fill: { color }, line: { color: ring || color, width: ring ? 0.75 : 0.25 } }));
}
const addData = (slide, P, d = 0.12) => addDots(slide, P, D.DATA_X, D.DATA_Y, { d });
// 凡例。kind: 'dot'（点）、'band'（帯）、それ以外は線
function legendRow(slide, items, x, y, { fontSize = 11, color = C.slate } = {}) {
  let cx = x;
  items.forEach((item) => {
    if (item.kind === 'dot') addCircle(slide, cx + 0.15, y + 0.11, 0.12, item.color);
    else if (item.kind === 'band') slide.addShape(pres.shapes.RECTANGLE, { x: cx, y: y + 0.03, w: 0.3, h: 0.16, fill: { color: item.color, transparency: BAND_TRANSPARENCY }, line: { color: item.color, width: 0.5, transparency: 60 } });
    else addLine(slide, cx, y + 0.11, cx + 0.3, y + 0.11, { color: item.color, width: item.width || 2.25, dash: item.dash });
    const w = textWidth(item.label, fontSize) + 0.1;
    addText(slide, item.label, cx + 0.38, y, w, 0.22, { fontSize, color });
    cx += 0.38 + w + 0.2;
  });
}
function textWidth(text, fontSize) {
  const em = fontSize / 72;
  return [...text].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1) * em, 0);
}
// 図の名前（枠の左上）
const panelTitle = (slide, text, x, y, w = 4, { color = C.navy, fontSize = 13 } = {}) => addText(slide, text, x, y, w, 0.26, { fontSize, bold: true, color });
function chartBase() {
  return {
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted, catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, catAxisLineShow: true, catAxisLineColor: C.line2, valAxisLineShow: false,
    valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: 'none' },
    dataLabelFontFace: FONT, titleFontFace: FONT, legendFontFace: FONT, titleColor: C.navy, titleFontSize: 12,
    legendFontSize: 10, legendColor: C.slate, dataLabelColor: C.navy, dataLabelFontSize: 11,
  };
}
function addTable(slide, header, rows, x, y, colW, { rowH = 0.42, fontSize = 13, highlight = {}, aligns = [] } = {}) {
  const cell = (text, options = {}) => ({ text: toRuns(String(text), { fontFace: FONT, fontSize, color: C.navy }), options: { valign: 'middle', margin: [0, 0.08, 0, 0.08], ...options } });
  const body = [header.map((h, c) => cell(h, { bold: true, fill: { color: C.gray }, color: C.navy, align: aligns[c] || 'left' }))];
  rows.forEach((row, r) => body.push(row.map((value, c) => cell(value, { fill: { color: highlight[r] || C.white }, bold: c === 0 || Boolean(highlight[r]), align: aligns[c] || 'left' }))));
  slide.addTable(body, { x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: FONT, fontSize, color: C.navy, autoPage: false });
}

// =====================================================================
// 計算（動画と同じ例・同じ乱数の種）
// =====================================================================
const XS = D.XS;
const X_TICKS = [0, 1, 2, 3, 4, 5, 6];
const Y_TICKS = [-2, -1, 0, 1, 2];
const YR = [-2.6, 2.6];
// 同じ乱数で引いた関数（動画の short-draw.js の samples と同じ）
function samples(xs, kernel, count, seed) {
  const normals = Array.from({ length: count }, (_, i) => G.standardNormals(xs.length, seed + i));
  return G.sampleFunctions(xs, kernel, normals, 1e-8).map((f) => Array.from(f));
}
const posteriorSamples = (model, xs, count, seed) => G.posteriorSamples(model, xs, Array.from({ length: count }, (_, i) => G.standardNormals(xs.length, seed + i)), 1e-8).map((f) => Array.from(f));
const PRIOR_SAMPLES = samples(XS, D.BEST_KERNEL, 5, 100);
const PRIOR_PRED = { mean: XS.map(() => 0), sd: XS.map(() => D.BEST.signal) };
const POSTERIOR = G.predict(D.BEST_MODEL, XS);
const POSTERIOR_SAMPLES = posteriorSamples(D.BEST_MODEL, XS, 5, 200);
const TRUTH = XS.map(D.truth);
// 第2章: 300組の正規乱数（動画の 2V と同じ種）
const CLOUD_N = 300;
const Z1 = Array.from(G.standardNormals(CLOUD_N, 31));
const Z2 = Array.from(G.standardNormals(CLOUD_N, 32));
const RHO = 0.8;
const GIVEN_F1 = 1;
const SLICE_HALF = 0.15;
const COND_MEAN = RHO * GIVEN_F1;
const COND_VAR = 1 - RHO * RHO;
const correlated = (rho) => Z1.map((z, i) => rho * z + Math.sqrt(1 - rho * rho) * Z2[i]);
const normalPdf = (x, mean, variance) => Math.exp(-((x - mean) ** 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
// 第3章
const UNIT_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
const RBF_TABLE = [0, 1, 2, 3].map((m) => ({ m, k: Math.exp(-(m * m) / 2) }));
function pairCloud([a, b], seed) {
  const rho = UNIT_KERNEL(a, b);
  const z1 = Array.from(G.standardNormals(CLOUD_N, seed));
  const z2 = Array.from(G.standardNormals(CLOUD_N, seed + 1));
  return { xs: z1, ys: z1.map((z, i) => rho * z + Math.sqrt(1 - rho * rho) * z2[i]), rho };
}
const NEAR = [1, 1.5];
const FAR = [1, 4];
const NEAR_CLOUD = pairCloud(NEAR, 41);
const FAR_CLOUD = pairCloud(FAR, 43);
const UNIT_SAMPLE = samples(XS, UNIT_KERNEL, 1, 300)[0];
const SHORT_ELL = 0.3;
const LONG_ELL = 2;
const SHORT_SAMPLES = samples(XS, G.rbf({ variance: 1, lengthScale: SHORT_ELL }), 3, 310);
const LONG_SAMPLES = samples(XS, G.rbf({ variance: 1, lengthScale: LONG_ELL }), 3, 310);
const MATRIX_ELLS = [0.5, 2];
const MATRIX_SAMPLES = MATRIX_ELLS.map((ell) => samples(XS, G.rbf({ variance: 1, lengthScale: ell }), 3, 320));
// 第4章
const NUS = [0.5, 1.5, 2.5, Infinity];
const NU_LABEL = ['ν = 1/2', 'ν = 3/2', 'ν = 5/2', 'ν = ∞（RBF）'];
const NU_SAMPLES = NUS.map((nu) => samples(XS, G.matern({ variance: 1, lengthScale: 1, nu }), 2, 400));
// 第5章
const ADD_ORDER = [3, 0, 5, 1, 6, 2, 4]; // 動画と同じ、離れた点から順に加える
const partialPrediction = (count) => {
  if (count === 0) return PRIOR_PRED;
  const idx = ADD_ORDER.slice(0, count);
  return G.predict(G.fit(idx.map((i) => D.DATA_X[i]), idx.map((i) => D.DATA_Y[i]), D.BEST_KERNEL, D.BEST_NOISE_VAR), XS);
};
const BUMPS = D.DATA_X.map((xi, i) => XS.map((x) => D.BEST_MODEL.alpha[i] * D.BEST_KERNEL(x, xi)));
const POSTERIOR_SAMPLES_5V = posteriorSamples(D.BEST_MODEL, XS, 3, 500);
const EX_X = [1, 2, 4];
const EX_Y = [0.9, 0.6, -0.7];
const EX_STAR = 3;
const EX_NOISE = 0.01;
const EX_MODEL = G.fit(EX_X, EX_Y, UNIT_KERNEL, EX_NOISE);
const EX_POINT = G.predict(EX_MODEL, [EX_STAR]);
const EX_MEAN = EX_POINT.mean[0];
const EX_VAR = EX_POINT.variance[0];
const EX_REDUCTION = UNIT_KERNEL(EX_STAR, EX_STAR) - EX_VAR;
const EX_XS = G.linspace(0, 5, 201);
const EX_CURVE = G.predict(EX_MODEL, EX_XS);
// 第6章
const SMALL_ELL = 0.2;
const LARGE_ELL = 3;
const ELLS = G.linspace(Math.log(0.15), Math.log(3.2), 140).map(Math.exp);
const LML_PARTS = ELLS.map((l) => G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR));
const predictWith = (l) => G.predict(G.fit(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR), XS);
const NOISE_LOW = 0.02;
const NOISE_HIGH = 0.6;
const predictWithNoise = (noise) => G.predict(G.fit(D.DATA_X, D.DATA_Y, D.BEST_KERNEL, noise * noise), XS);
// 第7章
const WIDE = D.XS_WIDE;
const WIDE_PRED = G.predict(D.BEST_MODEL, WIDE);
const COST_SIZES = [100, 1000, 10000];

// 標準の大きさのグラフの枠（x = 0〜6、y = −2.6〜2.6）
const fnFrame = (slide, box, { xticks = X_TICKS, yticks = Y_TICKS, xr = [0, 6], yr = YR, xlabel = 'x', ylabel } = {}) =>
  plotFrame(slide, box, xr, yr, { xticks, yticks, xlabel, ylabel });

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, '学習用資料 ｜ 統計・機械学習', MARGIN_X, 0.55, 8, 0.3, { fontSize: 12, color: C.onDark });
  addText(slide, lines(['動画で学ぶ', 'ガウス過程回帰']), MARGIN_X, 1.25, 6.4, 1.6, { fontSize: 44, bold: true, color: C.white, valign: 'middle' });
  addText(slide, '関数に正規分布を置き、データで条件づけて予測する', MARGIN_X, 3.0, 6.2, 0.45, { fontSize: 18, color: C.onDark2 });
  [
    [C.coral, '関数の分布と、カーネル'],
    [C.teal, '条件づけで求まる、予測の平均と不確かさの帯'],
    [C.purple, '周辺尤度と、実務での使い方'],
  ].forEach(([color, label], i) => {
    addCircle(slide, MARGIN_X + 0.12, 4.12 + i * 0.5, 0.18, color);
    addText(slide, label, MARGIN_X + 0.4, 4.0 + i * 0.5, 5.8, 0.26, { fontSize: 15, color: C.white });
  });
  // 右: 7点で条件づけた予測（濃紺の地に、明るい色で描く）
  const P = bareFrame({ x: 6.9, y: 1.2, w: 5.8, h: 4.6 }, [0, 6], [-2.3, 2.3]);
  addLine(slide, P.box.x, P.sy(0), P.box.x + P.box.w, P.sy(0), { color: C.navy2, width: 1 });
  addPrediction(slide, P, XS, POSTERIOR, { color: '7DB3F5', transparency: 72, width: 3 });
  ['F4A582', '6FD3A8', 'A99BF0'].forEach((color, i) => addCurve(slide, P, XS, POSTERIOR_SAMPLES[i], { color, width: 1.25 }));
  addCurve(slide, P, XS, Array.from(POSTERIOR.mean), { color: 'A9CCF8', width: 3 });
  addDots(slide, P, D.DATA_X, D.DATA_Y, { color: C.white, d: 0.15, ring: C.navy });
  addText(slide, '例：7点のデータで条件づけた予測の平均と ±2σ の帯、事後分布から引いた関数', 6.9, 5.95, 5.8, 0.25, { fontSize: 11, color: C.onDark, align: 'right' });
  addText(slide, `${DECK_DATE} ｜ 同名の解説動画にあわせた資料 ｜ 例の数値は動画と同じ計算（JavaScript）`, MARGIN_X, 6.75, 12, 0.3, { fontSize: 11, color: C.onDark });
  slide.addNotes([
    'この資料は、ガウス過程回帰を基礎から予測まで学ぶための教材です。同名の解説動画「動画で学ぶガウス過程回帰」と同じ構成・同じ例で説明します。',
    '右の図は、7点のデータで条件づけた予測です。太い線が予測の平均、帯が ±2σ の不確かさ、細い線が事後分布から引いた関数の例です。この図の作り方が資料全体のテーマです。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で学ぶこと
// =====================================================================
{
  const slide = contentSlide(null, 'この資料で学ぶこと', [
    '全体は7章です。第1・2章で全体像と、予測に使う道具の多変量正規分布を学びます。',
    '第3・4章でカーネル、第5・6章で予測の式とハイパーパラメータの決め方、第7章で実務での使い方と注意を学びます。',
  ]);
  addCard(slide, MARGIN_X, 1.5, CONTENT_W, 0.62, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.36, 1.81, 0.38, C.navy, '◎', { fontSize: 12 });
  addText(slide, 'ゴール：予測の平均と不確かさの帯がどう求まるかを説明でき、実務の手順に沿って使えるようになる', MARGIN_X + 0.7, 1.5, CONTENT_W - 0.9, 0.62, { fontSize: 15, bold: true, valign: 'middle' });
  const parts = [
    ['01', 'N', C.coral, '全体像と道具', 'ガウス過程回帰の考え方と使いどころ。多変量正規分布の条件づけ', '第1・2章 ｜ p.4–7'],
    ['02', 'k', C.teal, 'カーネル', 'ガウス過程の定義、RBF カーネルと長さスケール、Matérn カーネル', '第3・4章 ｜ p.8–12'],
    ['03', 'μ', C.purple, '予測とハイパーパラメータ', '予測の平均と分散の式、3点の計算例、周辺尤度とノイズ', '第5・6章 ｜ p.13–19'],
    ['04', '✓', C.goldText, '実務での使い方', '計算量、入力ごとの長さスケール、外挿、使い方の手順', '第7章 ｜ p.20–22'],
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
    '最初に要点を4つにまとめます。1つ目、ガウス過程は、関数そのものに正規分布を置きます。どの点を集めても、値の組は多変量正規分布です。',
    '2つ目、2点の値がどれだけ似ているかを、カーネルで決めます。カーネルが、関数のなめらかさや振れ幅を決めます。',
    '3つ目、データで条件づけると、予測の平均と不確かさの帯が式で求まります。データから離れるほど、帯は広がります。',
    '4つ目、長さスケールなどのハイパーパラメータは、周辺尤度を最大にして決めます。',
  ]);
  const cards = [
    ['①', C.coral, '関数に正規分布を置く', 'どの点を集めても、値の組は多変量正規分布。データを見る前の「関数の分布」'],
    ['②', C.teal, 'カーネル＝似ている度合い', '近い2点ほど値がそろう。カーネルが、なめらかさや振れ幅を決める'],
    ['③', C.purple, '条件づけて予測する', '予測の平均と不確かさの帯が式で出る。データから離れると帯が広がる'],
    ['④', C.goldText, 'ハイパーパラメータ', '長さスケール ℓ などは、周辺尤度を最大にして決める'],
  ];
  const w = (CONTENT_W - 0.3) / 2;
  const h = 2.5;
  cards.forEach(([glyph, color, title, body], i) => {
    const x = MARGIN_X + (i % 2) * (w + 0.3);
    const y = 1.6 + Math.floor(i / 2) * (h + 0.25);
    addCard(slide, x, y, w, h);
    addCircle(slide, x + 0.55, y + 0.55, 0.56, color, glyph, { fontSize: 17 });
    addText(slide, title, x + 0.95, y + 0.27, 2.85, 0.56, { fontSize: 16, bold: true, valign: 'middle' });
    addText(slide, body, x + 0.35, y + 1.1, 3.25, 1.2, { fontSize: 13.5, color: C.slate });
    // 右: 小さな図
    const box = { x: x + w - 1.95, y: y + 0.45, w: 1.7, h: 1.6 };
    const P = bareFrame(box, [0, 6], [-2.2, 2.2]);
    addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: C.line2, width: 1 });
    addLine(slide, box.x, box.y, box.x, box.y + box.h, { color: C.line2, width: 1 });
    if (i === 0) {
      addPrediction(slide, P, XS, PRIOR_PRED, { color: DC.truth, transparency: 88, meanLine: false });
      PRIOR_SAMPLES.slice(0, 3).forEach((ys, k) => addCurve(slide, P, XS, ys, { color: sampleColor(k), width: 1.5 }));
    } else if (i === 1) {
      const Q = bareFrame(box, [0, 3], [0, 1.15]);
      const rs = G.linspace(0, 3, 121);
      addCurve(slide, Q, rs, rs.map((r) => Math.exp(-(r * r) / 2)), { color: DC.mean, width: 2.25 });
      addText(slide, 'k(r)', box.x + 0.06, box.y - 0.02, 0.8, 0.22, { fontSize: 10, color: C.slate });
      addText(slide, '距離 r', box.x + box.w - 0.9, box.y + box.h + 0.02, 0.9, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
    } else if (i === 2) {
      addPrediction(slide, P, XS, POSTERIOR, { width: 2 });
      addDots(slide, P, D.DATA_X, D.DATA_Y, { d: 0.08 });
    } else {
      const Q = { sx: (v) => box.x + (Math.log(v / ELLS[0]) / Math.log(ELLS[ELLS.length - 1] / ELLS[0])) * box.w, sy: (v) => box.y + box.h - ((v + 12) / 8) * box.h, yr: [-12, -4] };
      addCurve(slide, Q, ELLS, LML_PARTS.map((p) => p.total), { color: DC.mean, width: 2.25 });
      addCircle(slide, Q.sx(D.BEST.lengthScale), Q.sy(D.BEST.value), 0.12, C.goldText);
      addText(slide, '最大', Q.sx(D.BEST.lengthScale) - 0.4, Q.sy(D.BEST.value) - 0.32, 0.8, 0.22, { fontSize: 10, color: C.navy, align: 'center', bold: true });
      addText(slide, 'ℓ', box.x + box.w - 0.4, box.y + box.h + 0.02, 0.4, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
    }
  });
}

// =====================================================================
// 4. 第1章 全体像
// =====================================================================
{
  const slide = contentSlide('01　ガウス過程回帰の全体像', '全体像 ― 関数の分布を、データで条件づける', [
    'まず全体像です。データを見る前、ガウス過程は、いろいろな形の関数を確率つきで考えます。左の線は、その中から引いた例です。',
    'ここに7点のデータが入ります。データの近くを通る関数だけが残るように、分布を条件づけます。これが、データを見たあとの事後分布です。',
    '残った関数の平均が予測、ばらつきの幅が不確かさです。データの近くでは帯が狭く、離れると広がります。',
  ]);
  const boxes = [{ x: 1.2, y: 1.95, w: 5.1, h: 3.15 }, { x: 7.45, y: 1.95, w: 5.1, h: 3.15 }];
  panelTitle(slide, '① データを見る前（事前分布）', boxes[0].x - 0.55, 1.55, 5);
  panelTitle(slide, '② データで条件づけたあと（事後分布）', boxes[1].x - 0.55, 1.55, 5.5);
  const P1 = fnFrame(slide, boxes[0], { ylabel: 'f(x)' });
  addPrediction(slide, P1, XS, PRIOR_PRED, { color: DC.truth, transparency: 88, meanLine: false });
  PRIOR_SAMPLES.forEach((ys, i) => addCurve(slide, P1, XS, ys, { color: sampleColor(i), width: 1.75 }));
  const P2 = fnFrame(slide, boxes[1], { ylabel: 'f(x)' });
  addPrediction(slide, P2, XS, POSTERIOR, { width: 2.75 });
  POSTERIOR_SAMPLES.slice(0, 3).forEach((ys, i) => addCurve(slide, P2, XS, ys, { color: sampleColor(i), width: 1 }));
  addCurve(slide, P2, XS, Array.from(POSTERIOR.mean), { color: DC.mean, width: 2.75 });
  addData(slide, P2);
  legendRow(slide, [{ color: sampleColor(0), label: '引いた関数の例' }, { kind: 'band', color: DC.truth, label: '事前の ±2σ' }], boxes[0].x - 0.55, 5.62);
  legendRow(slide, [{ color: DC.mean, label: '予測の平均' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { kind: 'dot', color: DC.data, label: 'データ（7点）' }], boxes[1].x - 0.55, 5.62);
  // 流れ
  const steps = ['事前分布（第3章）', 'データ（7点）', '条件づけ → 事後分布', '予測の平均と帯'];
  const stepW = 2.7;
  const gap = (CONTENT_W - stepW * 4) / 3;
  steps.forEach((text, i) => {
    const x = MARGIN_X + i * (stepW + gap);
    addCard(slide, x, 6.12, stepW, 0.62, { fill: C.gray, line: null });
    addCircle(slide, x + 0.32, 6.43, 0.36, C.navy, String(i + 1), { fontSize: 12 });
    addText(slide, text, x + 0.6, 6.12, stepW - 0.7, 0.62, { fontSize: 13, bold: true, valign: 'middle' });
    if (i < 3) addLine(slide, x + stepW + 0.08, 6.43, x + stepW + gap - 0.08, 6.43, { color: C.slate, width: 1.5, arrow: true });
  });
}

// =====================================================================
// 5. 第1章 関数そのものに確率を置く
// =====================================================================
{
  const slide = contentSlide('01　ガウス過程回帰の全体像', '関数そのものに確率を置く', [
    '回帰では、入力 x から出力 y を予測します。観測には、ノイズ ε が乗ります。',
    '多くの方法は、関数の形を決めて、パラメータを推定します。たとえば、直線や多項式です。ガウス過程回帰は形を決めません。関数そのものに、確率の分布を置きます。',
    'm(x) は平均の関数で、ふつうは 0 とします。k(x, x′) はカーネルで、2点の値の共分散を表します。データを見たあとの分布、つまり予測は、多変量正規分布の条件づけで求まります。',
    'ガウス過程回帰は、データが少ないとき、予測の不確かさも知りたいとき、関数の形が分からないときに向いています。実験の条件を選ぶベイズ最適化でも使われます。',
    '特に、少ない計測点から、面全体の値の分布を推定する面内推定に有効です。入力を面の上の2つの座標にすれば同じ仕組みで使え、測っていない場所の不確かさも分かります。',
  ]);
  const LW = 6.75;
  addCard(slide, MARGIN_X, 1.6, LW, 0.9, { fill: C.gray, line: null });
  const obs = formulaSize('obs', 0.55);
  addFormula(slide, 'obs', MARGIN_X + 0.25, 1.6 + (0.9 - obs.h) / 2, { scale: 0.55, alt: 'y = f(x) + ε' });
  addText(slide, '観測 ＝ 関数の値 ＋ ノイズ', MARGIN_X + 0.45 + obs.w, 1.6, LW - obs.w - 0.6, 0.9, { fontSize: 13, color: C.slate, valign: 'middle' });
  addText(slide, lines(['ふつうの回帰：形を決めてパラメータを推定', '（例：直線 f(x) = a + bx、多項式）']), MARGIN_X, 2.75, LW, 0.65, { fontSize: 14, paraSpaceAfter: 2 });
  formulaBar(slide, 'gp', MARGIN_X, 3.6, LW, 0.9, { scale: 0.6, note: 'ガウス過程回帰：形を決めず、関数そのものに分布を置く', noteW: 3.4, alt: 'f ~ GP(m(x), k(x, x′))' });
  addText(slide, lines(['m(x)：平均の関数（ふつうは 0）', 'k(x, x′)：カーネル ＝ 2点の値 f(x) と f(x′) の共分散']), MARGIN_X + 0.2, 4.75, LW - 0.2, 0.8, { fontSize: 14, paraSpaceAfter: 6 });
  calloutBar(slide, '→ 予測 ＝ 多変量正規分布の条件づけ（第2章・第5章）', MARGIN_X, 5.85, LW, 0.75, { fontSize: 15 });
  // 右: 使いどころ
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 1.6, RW, 5.0);
  addText(slide, '使いどころ', RX + 0.3, 1.75, RW - 0.6, 0.35, { fontSize: 16, bold: true });
  ['データが少ない（数十〜数千点）', '予測の不確かさも知りたい', '関数の形が分からない', '実験条件の探索（ベイズ最適化）'].forEach((text, i) => {
    addCircle(slide, RX + 0.42, 2.42 + i * 0.48, 0.1, C.slate);
    addText(slide, text, RX + 0.6, 2.29 + i * 0.48, RW - 0.85, 0.28, { fontSize: 14 });
  });
  addCard(slide, RX + 0.2, 4.3, RW - 0.4, 2.1, { fill: C.goldTint, line: null });
  addText(slide, '特に有効：面内推定', RX + 0.45, 4.45, RW - 0.9, 0.35, { fontSize: 16, bold: true, color: C.goldText });
  addText(slide, lines(['少ない計測点から、面全体の値の分布を推定する', '入力 x を面の上の2つの座標にすれば、同じ仕組みで使える', '測っていない場所の不確かさも分かる']), RX + 0.45, 4.9, RW - 0.9, 1.4, { fontSize: 13, paraSpaceAfter: 5 });
}

// =====================================================================
// 6. 第2章 多変量正規分布
// =====================================================================
{
  const slide = contentSlide('02　多変量正規分布 ― 条件づけの道具', '多変量正規分布と条件づけ', [
    '2つの値 f₁ と f₂ が、ともに正規分布に従い、相関があるとき、平均のベクトルと共分散行列で表します。ρ は相関係数で、−1 から 1 の値です。1 に近いほど、2つの値はそろって動きます。',
    '何個の値でも同じ形で、多変量正規分布と書きます。一部だけを取り出しても、正規分布のままです。',
    '大事なのは条件づけです。f₁ が分かったとき、f₂ の分布も正規分布で、平均と分散が式で求まります。',
    'たとえば ρ = 0.8 で f₁ = 1 と分かると、f₂ の平均は 0.8、分散は 1 から 0.36 に減ります。',
  ]);
  const LW = 7.3;
  addCard(slide, MARGIN_X, 1.6, LW, 1.25, { fill: C.gray, line: null });
  const bv = formulaSize('bivar', 0.62);
  addFormula(slide, 'bivar', MARGIN_X + 0.25, 1.6 + (1.25 - bv.h) / 2, { scale: 0.62, alt: '2変数の正規分布' });
  addText(slide, 'ρ：相関係数（−1 ≤ ρ ≤ 1）。1 に近いほど、そろって動く', MARGIN_X, 3.0, LW, 0.32, { fontSize: 14 });
  const mvn = formulaSize('mvn', 0.6);
  addFormula(slide, 'mvn', MARGIN_X + 0.1, 3.45, { scale: 0.6, alt: 'f ~ N(μ, Σ)' });
  addText(slide, '何個の値でも同じ形。一部を取り出しても正規分布（周辺分布）', MARGIN_X + mvn.w + 0.35, 3.45, LW - mvn.w - 0.35, mvn.h, { fontSize: 13, color: C.slate, valign: 'middle' });
  formulaBar(slide, 'cond', MARGIN_X, 4.25, LW, 0.95, { scale: 0.62, alt: 'f₂ | f₁ の条件付き分布' });
  calloutBar(slide, '条件づけ：分かった値に合わせて、平均が動き、分散が減る', MARGIN_X, 5.45, LW, 0.7);
  // 右: 数値例
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 1.6, RW, 4.55);
  addText(slide, '例（μ = 0、σ_{1} = σ_{2} = 1、ρ = 0.8）', RX + 0.3, 1.78, RW - 0.6, 0.35, { fontSize: 15, bold: true });
  addText(slide, 'f_{1} = 1 と分かったときの f_{2}', RX + 0.3, 2.2, RW - 0.6, 0.3, { fontSize: 13, color: C.slate });
  addTable(slide, ['', '平均', '分散'], [['f_{2}（知る前）', '0', '1'], [`f_{2} | f_{1} = ${GIVEN_F1}`, fmt(COND_MEAN, 1), fmt(COND_VAR, 2)]], RX + 0.3, 2.7, [1.95, 1.1, 1.1], { rowH: 0.5, fontSize: 14, highlight: { 1: C.goldTint }, aligns: ['left', 'center', 'center'] });
  addText(slide, lines([`平均：0 + 0.8 × (1 − 0) = ${fmt(COND_MEAN, 1)}`, `分散：(1 − 0.8^{2}) × 1 = ${fmt(COND_VAR, 2)}`]), RX + 0.3, 4.4, RW - 0.6, 0.75, { fontSize: 13, paraSpaceAfter: 6 });
  addText(slide, '→ 分かった値に引き寄せられ、幅が狭くなる', RX + 0.3, 5.3, RW - 0.6, 0.5, { fontSize: 13, bold: true, color: C.goldText });
}

// =====================================================================
// 7. 第2章 相関と条件づけを図で見る
// =====================================================================
{
  const slide = contentSlide('02　多変量正規分布 ― 条件づけの道具', '相関と条件づけを図で見る', [
    '平均 0、分散 1 の2つの値を、300回取り出して打ちました。相関が ρ = 0 なら、点は丸く広がります。ρ = 0.8 にすると右上がりの楕円に集まり、ρ を負にすると右下がりになります。',
    'ρ = 0.8 で、f₁ = 1 と分かったとします。縦の帯の中の点だけを見ると、f₂ は 0.8 のまわりに集まります。',
    '右は f₂ の分布です。灰色が知る前、青が知ったあと。平均が 0.8 に動き、幅が狭くなりました。これが、予測の仕組みです。',
  ]);
  const cloud = (box, rho, { slice = false, ticks = [-2, 0, 2], d = 0.05 } = {}) => {
    const P = plotFrame(slide, box, [-3.2, 3.2], [-3.2, 3.2], { xticks: ticks, yticks: ticks, fmtY: (v) => fmt(v, 0), fmtX: (v) => fmt(v, 0) });
    const ys = correlated(rho);
    if (slice) {
      slide.addShape(pres.shapes.RECTANGLE, { x: P.sx(GIVEN_F1 - SLICE_HALF), y: box.y, w: P.sx(GIVEN_F1 + SLICE_HALF) - P.sx(GIVEN_F1 - SLICE_HALF), h: box.h, fill: { color: C.gold, transparency: 55 }, line: { color: C.gold, width: 0.5 } });
    }
    const inSlice = (i) => slice && Math.abs(Z1[i] - GIVEN_F1) < SLICE_HALF;
    const inFrame = (i) => Math.abs(Z1[i]) <= 3.15 && Math.abs(ys[i]) <= 3.15;
    const outIdx = Z1.map((_, i) => i).filter((i) => inFrame(i) && !inSlice(i));
    const inIdx = Z1.map((_, i) => i).filter((i) => inFrame(i) && inSlice(i));
    addDots(slide, P, outIdx.map((i) => Z1[i]), outIdx.map((i) => ys[i]), { color: slice ? C.line2 : C.slate, d, ring: null });
    if (inIdx.length) addDots(slide, P, inIdx.map((i) => Z1[i]), inIdx.map((i) => ys[i]), { color: DC.mean, d: d * 1.5, ring: C.white });
    return P;
  };
  // 左: ρ = 0 と ρ = −0.6
  const small = [{ rho: 0, y: 1.95 }, { rho: -0.6, y: 4.45 }];
  small.forEach(({ rho, y }) => {
    cloud({ x: 1.15, y, w: 1.9, h: 1.9 }, rho, { d: 0.045 });
    panelTitle(slide, `ρ = ${rho === 0 ? '0' : fmt(rho, 1)}`, 0.6, y - 0.4, 2.5);
  });
  // 中央: ρ = 0.8 と f₁ = 1 の帯
  const big = { x: 4.1, y: 1.95, w: 4.35, h: 4.35 };
  cloud(big, RHO, { slice: true, ticks: [-3, -2, -1, 0, 1, 2, 3], d: 0.055 });
  panelTitle(slide, `ρ = ${RHO}：f₁ = ${GIVEN_F1} の帯の点（青）`, big.x - 0.55, 1.55, 5);
  addText(slide, 'f₁', big.x + big.w - 0.3, big.y + big.h + 0.25, 0.3, 0.22, { fontSize: 11, color: C.slate, align: 'right' });
  addText(slide, 'f₂', big.x + 0.08, big.y - 0.02, 0.4, 0.22, { fontSize: 11, color: C.slate });
  addText(slide, 'f₁', 1.15 + 1.9 - 0.3, 4.45 + 1.9 + 0.2, 0.3, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
  // 右: f₂ の分布（知る前と知ったあと）
  const pbox = { x: 9.35, y: 2.2, w: 3.35, h: 2.6 };
  panelTitle(slide, 'f₂ の分布', 8.85, 1.55, 3.8);
  const Q = plotFrame(slide, pbox, [-3, 3], [0, 0.75], { xticks: [-2, 0, 0.8, 2], fmtX: (v) => (v === 0.8 ? '0.8' : fmt(v, 0)), xlabel: 'f₂', grid: false });
  const fs2 = G.linspace(-3, 3, 181);
  addCurve(slide, Q, fs2, fs2.map((v) => normalPdf(v, 0, 1)), { color: DC.truth, width: 2.25 });
  addCurve(slide, Q, fs2, fs2.map((v) => normalPdf(v, COND_MEAN, COND_VAR)), { color: DC.mean, width: 2.75 });
  addLine(slide, Q.sx(COND_MEAN), pbox.y + 0.1, Q.sx(COND_MEAN), pbox.y + pbox.h, { color: DC.mean, width: 0.75, dash: 'dash' });
  legendRow(slide, [{ color: DC.truth, label: '知る前 N(0, 1)' }], 8.85, 5.35);
  legendRow(slide, [{ color: DC.mean, label: `知ったあと N(${fmt(COND_MEAN, 1)}, ${fmt(COND_VAR, 2)})` }], 8.85, 5.7);
  addText(slide, lines(['平均が 0.8 に動き、幅が狭くなる', '＝ 予測の仕組み']), 8.85, 6.1, 3.9, 0.6, { fontSize: 13, bold: true, color: C.goldText });
}

// =====================================================================
// 8. 第3章 ガウス過程とカーネル
// =====================================================================
{
  const slide = contentSlide('03　ガウス過程とカーネル', 'ガウス過程の定義と RBF カーネル', [
    'ガウス過程の定義です。どんな入力の組を選んでも、関数の値の組は多変量正規分布に従います。共分散行列の成分は、カーネルで決めます。',
    'よく使うのが RBF カーネルです。2点の距離 r が小さいほど、値が大きくなります。σ_f の2乗は関数の振れ幅、長さスケール ℓ は、どれだけ離れると似なくなるかを表します。',
    '距離が ℓ なら相関は 0.61、2ℓ なら 0.14、3ℓ なら 0.01。近い点ほど、値がそろって動きます。',
  ]);
  const LW = 7.4;
  addCard(slide, MARGIN_X, 1.6, LW, 1.4, { fill: C.gray, line: null });
  const gd = formulaSize('gpdef', 0.55);
  addFormula(slide, 'gpdef', MARGIN_X + 0.25, 1.6 + (1.4 - gd.h) / 2, { scale: 0.55, alt: 'f(x1..xn) ~ N(0, K)、K_ij = k(x_i, x_j)' });
  addText(slide, 'どんな点の組でも、値の組は多変量正規分布。共分散行列の成分をカーネルで決める', MARGIN_X, 3.12, LW, 0.32, { fontSize: 13, color: C.slate });
  formulaBar(slide, 'rbf', MARGIN_X, 3.6, LW, 0.95, { scale: 0.56, alt: 'RBF カーネル' });
  addText(slide, lines(['σ_{f}^{2}：振れ幅（f の分散）', 'ℓ：長さスケール（どれだけ離れると似なくなるか）']), MARGIN_X + 0.2, 4.75, LW - 0.2, 0.75, { fontSize: 14, paraSpaceAfter: 6 });
  calloutBar(slide, '近い点ほど、値がそろって動く → なめらかな関数', MARGIN_X, 5.75, LW, 0.7);
  // 右: k(r) と値の表
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 1.6, RW, 4.85);
  addText(slide, 'RBF カーネルの値（σ_{f} = 1）', RX + 0.3, 1.75, RW - 0.6, 0.35, { fontSize: 15, bold: true });
  const kbox = { x: RX + 0.75, y: 2.35, w: RW - 1.15, h: 1.45 };
  const K = plotFrame(slide, kbox, [0, 3.2], [0, 1.1], { xticks: [0, 1, 2, 3], fmtX: (v) => (v === 0 ? '0' : v === 1 ? 'ℓ' : `${v}ℓ`), yticks: [0, 0.5, 1], fmtY: (v) => fmt(v, 1), xlabel: '距離 r', grid: false });
  const rs = G.linspace(0, 3.2, 129);
  addCurve(slide, K, rs, rs.map((r) => Math.exp(-(r * r) / 2)), { color: DC.mean, width: 2.5 });
  RBF_TABLE.forEach(({ m, k }) => addCircle(slide, K.sx(m), K.sy(k), 0.11, C.goldText));
  addTable(slide, ['距離 r', 'k（相関）'], RBF_TABLE.map(({ m, k }) => [m === 0 ? '0' : m === 1 ? 'ℓ' : `${m}ℓ`, fmt(k, 3)]), RX + 0.4, 4.35, [1.6, 2.0], { rowH: 0.36, fontSize: 13, aligns: ['center', 'center'] });
}

// =====================================================================
// 9. 第3章 点の組から関数へ
// =====================================================================
{
  const slide = contentSlide('03　ガウス過程とカーネル', '点の組から関数へ ― 長さスケールが性質を決める', [
    `近い2点、x = ${NEAR[0]} と ${NEAR[1]} の値を300回引くと、細い楕円になります。相関は ${fmt(NEAR_CLOUD.rho, 2)} で、ほぼそろって動きます。離れた2点、x = ${FAR[0]} と ${FAR[1]} では、ほぼ丸くなります。相関は ${fmt(FAR_CLOUD.rho, 2)} で、ほとんど無関係です。`,
    '点を増やします。5点、20点と増やすと、近い点どうしがそろって動くので、つなぐと関数に見えます。',
    `長さスケールを小さくすると、すぐに似なくなるので、細かく揺れる関数になります（ℓ = ${SHORT_ELL}）。大きくすると、ゆっくり変わる関数になります（ℓ = ${LONG_ELL}）。ℓ が、関数の性質を決めます。`,
  ]);
  // 左: 2点の値の雲
  [[NEAR_CLOUD, NEAR, 1.95], [FAR_CLOUD, FAR, 4.6]].forEach(([cl, pair, y]) => {
    const box = { x: 1.15, y, w: 1.75, h: 1.75 };
    const P = plotFrame(slide, box, [-3.2, 3.2], [-3.2, 3.2], { xticks: [-2, 0, 2], yticks: [-2, 0, 2] });
    const keep = cl.xs.map((_, i) => i).filter((i) => Math.abs(cl.xs[i]) <= 3.15 && Math.abs(cl.ys[i]) <= 3.15);
    addDots(slide, P, keep.map((i) => cl.xs[i]), keep.map((i) => cl.ys[i]), { color: C.slate, d: 0.04, ring: null });
    panelTitle(slide, `x = ${pair[0]} と ${pair[1]}：相関 ${fmt(cl.rho, 2)}`, 0.6, y - 0.4, 3.2);
  });
  addText(slide, '横 f(x₁)、縦 f(x₂)。300回引いた値', 0.6, 6.7, 3.2, 0.25, { fontSize: 10, color: C.muted });
  // 右上: 点を増やすと関数になる
  const RX = 4.25;
  panelTitle(slide, '点を増やすと、関数に見える（ℓ = 1）', RX, 1.5, 6);
  const pick = (count) => Array.from({ length: count }, (_, i) => Math.round((i * (XS.length - 1)) / (count - 1)));
  [[5, '5 点'], [20, '20 点'], [XS.length, '241 点 → 関数']].forEach(([count, label], i) => {
    const box = { x: RX + 0.45 + i * 2.85, y: 2.25, w: 2.45, h: 1.5 };
    const P = plotFrame(slide, box, [0, 6], [-2.6, 2.6], { xticks: [0, 3, 6], yticks: [-2, 0, 2] });
    if (count === XS.length) addCurve(slide, P, XS, UNIT_SAMPLE, { color: DC.orange, width: 2 });
    else {
      const idx = pick(count);
      addCurve(slide, P, idx.map((k) => XS[k]), idx.map((k) => UNIT_SAMPLE[k]), { color: C.line2, width: 1 });
      addDots(slide, P, idx.map((k) => XS[k]), idx.map((k) => UNIT_SAMPLE[k]), { color: DC.orange, d: count === 5 ? 0.12 : 0.08 });
    }
    addText(slide, label, box.x, box.y - 0.3, 2.4, 0.22, { fontSize: 11, bold: true, color: C.slate });
  });
  // 右下: 長さスケール
  [[SHORT_SAMPLES, SHORT_ELL, '細かく揺れる'], [LONG_SAMPLES, LONG_ELL, 'ゆっくり変わる']].forEach(([ss, ell, desc], i) => {
    const box = { x: RX + 0.45 + i * 4.3, y: 4.55, w: 3.85, h: 1.75 };
    panelTitle(slide, `ℓ = ${ell}：${desc}`, box.x - 0.45, 4.15, 4);
    const P = plotFrame(slide, box, [0, 6], [-2.8, 2.8], { xticks: X_TICKS, yticks: [-2, 0, 2], xlabel: 'x' });
    ss.forEach((ys, k) => addCurve(slide, P, XS, ys, { color: sampleColor(k), width: 1.5 }));
  });
}

// =====================================================================
// 10. 第3章 カーネル行列を色で見る
// =====================================================================
{
  const slide = contentSlide('03　ガウス過程とカーネル', 'カーネル行列を色で見る', [
    '25個の点どうしのカーネルを、行列にして色で表しました。濃いほど値が大きく、対角は同じ点どうしなので、最大の1です。対角から離れるほど、つまり2点が離れるほど、薄くなります。',
    '右は、この行列から引いた関数です。長さスケールを 0.5 から 2 にすると、濃い帯が太くなります。離れた点どうしも、似た値をとるようになるからです。',
    '帯が細い行列からは細かく揺れる関数、太い行列からはゆっくり変わる関数が生まれます。カーネル行列が、関数の性質を決めています。',
  ]);
  const HEAT = 2.55;
  MATRIX_ELLS.forEach((ell, i) => {
    const x0 = MARGIN_X + i * 6.25;
    const y0 = 2.05;
    panelTitle(slide, `ℓ = ${ell}（${i === 0 ? '帯が細い' : '帯が太い'}）`, x0, 1.55, 5);
    const a = asset(`heat-${String(ell).replace('.', '')}`);
    slide.addImage({ path: path.join(ASSET_DIR, a.file), x: x0 + 0.3, y: y0, w: HEAT, h: HEAT, altText: `ℓ = ${ell} のカーネル行列（25点）` });
    slide.addShape(pres.shapes.RECTANGLE, { x: x0 + 0.3, y: y0, w: HEAT, h: HEAT, fill: { type: 'none' }, line: { color: C.line2, width: 0.75 } });
    addText(slide, '0', x0 + 0.3 - 0.1, y0 + HEAT + 0.04, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'center' });
    addText(slide, '6', x0 + 0.3 + HEAT - 0.1, y0 + HEAT + 0.04, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'center' });
    addText(slide, 'x′', x0 + 0.3 + HEAT / 2 - 0.2, y0 + HEAT + 0.04, 0.4, 0.2, { fontSize: 10, color: C.slate, align: 'center' });
    addText(slide, '0', x0 + 0.05, y0 - 0.02, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'right' });
    addText(slide, '6', x0 + 0.05, y0 + HEAT - 0.2, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'right' });
    addText(slide, 'x', x0 + 0.05, y0 + HEAT / 2 - 0.1, 0.2, 0.2, { fontSize: 10, color: C.slate, align: 'right' });
    const box = { x: x0 + 3.45, y: y0 + 0.2, w: 2.55, h: 2.15 };
    addText(slide, '引いた関数', box.x, y0 - 0.2, 2, 0.22, { fontSize: 11, bold: true, color: C.slate });
    const P = plotFrame(slide, box, [0, 6], [-2.8, 2.8], { xticks: [0, 2, 4, 6], yticks: [-2, 0, 2], xlabel: 'x' });
    MATRIX_SAMPLES[i].forEach((ys, k) => addCurve(slide, P, XS, ys, { color: sampleColor(k), width: 1.5 }));
  });
  // 色の目盛り
  const sc = asset('heat-scale');
  slide.addImage({ path: path.join(ASSET_DIR, sc.file), x: MARGIN_X + 0.3, y: 5.15, w: 2.55, h: 0.17, altText: '色の目盛り（0〜1）' });
  addText(slide, '0', MARGIN_X + 0.3 - 0.1, 5.35, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'center' });
  addText(slide, '1', MARGIN_X + 0.3 + 2.55 - 0.1, 5.35, 0.2, 0.2, { fontSize: 10, color: C.muted, align: 'center' });
  addText(slide, 'k(x, x′) の値（濃いほど大きい）', MARGIN_X + 3.0, 5.12, 4, 0.22, { fontSize: 10, color: C.slate });
  addCard(slide, MARGIN_X, 5.85, CONTENT_W, 0.75, { fill: C.navy, line: null });
  addText(slide, '帯が細い行列 → 細かく揺れる関数、太い行列 → ゆっくり変わる関数。カーネル行列が関数の性質を決める', MARGIN_X + 0.35, 5.85, CONTENT_W - 0.7, 0.75, { fontSize: 15, bold: true, color: C.white, valign: 'middle' });
}

// =====================================================================
// 11. 第4章 Matérn カーネル
// =====================================================================
{
  const slide = contentSlide('04　Matérn カーネル ― なめらかさを選ぶ', 'Matérn カーネル ― なめらかさを ν で選ぶ', [
    'RBF は、何回でも微分できる、とてもなめらかな関数を作ります。実際のデータは、もっとガタガタしていることがあります。',
    'Matérn カーネルは、なめらかさを ν で調整できます。よく使う ν が 1/2、3/2、5/2 では、式が簡単になります。',
    'ν が大きいほどなめらかで、関数は ν より小さい回数だけ微分できます。ν を無限大にすると RBF になります。',
    '迷ったら、ν が 3/2 か 5/2 から始めるのがふつうです。どれが良いかは、周辺尤度で比べられます。',
  ]);
  const LW = 7.4;
  addText(slide, 'RBF：何回でも微分できる（とてもなめらか）。実際のデータはもっとガタガタなことも', MARGIN_X, 1.6, CONTENT_W, 0.32, { fontSize: 14 });
  addCard(slide, MARGIN_X, 2.1, LW, 2.65, { fill: C.gray, line: null });
  [['matern12', 2.3], ['matern32', 3.0], ['matern52', 3.8]].forEach(([key, y]) => addFormula(slide, key, MARGIN_X + 0.3, y, { scale: 0.62, alt: key }));
  addText(slide, 'ν が大きいほどなめらか。ν → ∞ で RBF', MARGIN_X, 4.95, LW, 0.32, { fontSize: 14 });
  calloutBar(slide, '迷ったら ν = 3/2 か 5/2 から（周辺尤度で比べられる）', MARGIN_X, 5.55, LW, 0.7);
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 2.1, RW, 4.15);
  addText(slide, '微分できる回数', RX + 0.3, 2.25, RW - 0.6, 0.35, { fontSize: 15, bold: true });
  addTable(slide, ['ν', '関数の性質'], [['1/2', '0回（つながるが角がある）'], ['3/2', '1回'], ['5/2', '2回'], ['∞（RBF）', '何回でも']], RX + 0.25, 2.8, [1.1, 2.8], { rowH: 0.5, fontSize: 13, aligns: ['center', 'left'] });
  addText(slide, '関数は ν より小さい回数だけ微分できる', RX + 0.3, 5.45, RW - 0.6, 0.5, { fontSize: 12.5, color: C.slate });
}

// =====================================================================
// 12. 第4章 なめらかさの違い
// =====================================================================
{
  const slide = contentSlide('04　Matérn カーネル ― なめらかさを選ぶ', 'なめらかさの違い ― 同じ乱数で ν だけを変える', [
    '同じ乱数で、なめらかさだけを変えた関数です。ν が 1/2 では、細かく折れ曲がります。ν を 3/2、5/2 と大きくすると、なめらかになります。',
    'ν が無限大、つまり RBF がいちばんなめらかです。5/2 と RBF の差は、見た目ではわずかです。',
    'データがガタガタしていそうなら、小さめの ν を選びます。',
  ]);
  NUS.forEach((nu, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const box = { x: 1.15 + col * 6.2, y: 1.95 + row * 2.45, w: 5.4, h: 1.65 };
    panelTitle(slide, NU_LABEL[i], box.x - 0.55, box.y - 0.4, 4);
    const P = plotFrame(slide, box, [0, 6], [-2.8, 2.8], { xticks: X_TICKS, yticks: [-2, 0, 2], xlabel: row === 1 ? 'x' : undefined });
    NU_SAMPLES[i].forEach((ys, k) => addCurve(slide, P, XS, ys, { color: sampleColor(k), width: 1.6 }));
  });
  addText(slide, 'ガタガタ ← 小さい ν ／ 大きい ν → なめらか', MARGIN_X, 6.55, CONTENT_W, 0.3, { fontSize: 14, bold: true, color: C.slate, align: 'center' });
}

// =====================================================================
// 13. 第5章 予測の式
// =====================================================================
{
  const slide = contentSlide('05　予測の式 ― データで条件づける', '予測の式 ― 平均と分散', [
    'データの出力 y と、予測したい点の値 f* を並べると、多変量正規分布です。第2章の条件づけの式に当てはめると、予測の平均と分散が求まります。',
    '平均は、α = (K + σ_n² I)⁻¹ y を使うと、カーネルの山を重み α_i で足し合わせた形です。',
    '分散は、事前の分散から、データで分かった分を引いたものです。データに近い点ほど、大きく減ります。',
    '分散の式には y が入っていません。不確かさは、データの値ではなく、データの位置で決まります。',
  ]);
  const LW = 7.6;
  addCard(slide, MARGIN_X, 1.6, LW, 1.1, { fill: C.gray, line: null });
  const jt = formulaSize('joint', 0.58);
  addFormula(slide, 'joint', MARGIN_X + 0.25, 1.6 + (1.1 - jt.h) / 2, { scale: 0.58, alt: '[y; f*] の同時分布' });
  addText(slide, '同時分布', MARGIN_X + LW - 1.35, 1.6, 1.1, 1.1, { fontSize: 13, color: C.slate, valign: 'middle', align: 'right' });
  addCard(slide, MARGIN_X, 2.9, LW, 1.25, { fill: C.navy, line: null });
  addFormula(slide, 'mu', MARGIN_X + 0.3, 2.98, { scale: 0.6, alt: 'μ* = k*ᵀ(K + σn²I)⁻¹y' });
  addFormula(slide, 'var', MARGIN_X + 0.3, 3.55, { scale: 0.6, alt: 'σ*² = k(x*, x*) − k*ᵀ(K + σn²I)⁻¹k*' });
  addText(slide, '予測の平均と分散', MARGIN_X + LW - 2.25, 2.9, 2.0, 1.25, { fontSize: 13, color: C.onDark2, valign: 'middle', align: 'right' });
  const al = formulaSize('alpha', 0.55);
  addFormula(slide, 'alpha', MARGIN_X + 0.1, 4.3, { scale: 0.55, alt: 'μ*(x) = Σ α_i k(x, x_i)' });
  addText(slide, lines(['平均 ＝ データ点に置いたカーネルの山の、重みつきの和', '分散 ＝ 事前の分散 − データで分かった分（データに近いほど小さい）']), MARGIN_X + 0.1, 4.4 + al.h, LW - 0.1, 0.75, { fontSize: 13.5, paraSpaceAfter: 6 });
  calloutBar(slide, '分散に y は入らない → 不確かさはデータの「位置」で決まる', MARGIN_X, 6.1, LW, 0.65);
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 1.6, RW, 3.0);
  addText(slide, '記号', RX + 0.3, 1.75, RW - 0.6, 0.35, { fontSize: 15, bold: true });
  addTable(slide, ['', '意味'], [['K', 'データ点どうしのカーネル行列'], ['k_{*}', '予測点とデータ点のカーネル'], ['σ_{n}^{2}', '観測ノイズの分散']], RX + 0.25, 2.25, [0.8, 2.85], { rowH: 0.5, fontSize: 13, aligns: ['center', 'left'] });
  // 予測の標準偏差は、データの位置だけで決まる（7点の例）
  addCard(slide, RX, 4.8, RW, 1.95);
  addText(slide, '予測の標準偏差 σ_{*}(x)', RX + 0.3, 4.9, RW - 0.6, 0.3, { fontSize: 13, bold: true });
  const sbox = { x: RX + 0.75, y: 5.35, w: RW - 1.1, h: 0.95 };
  const SP = plotFrame(slide, sbox, [0, 6], [0, 0.75], { xticks: [0, 2, 4, 6], yticks: [0, 0.6], fmtY: (v) => fmt(v, 1), grid: false });
  addCurve(slide, SP, XS, Array.from(POSTERIOR.sd), { color: DC.mean, width: 2 });
  D.DATA_X.forEach((x) => addLine(slide, SP.sx(x), sbox.y + sbox.h - 0.08, SP.sx(x), sbox.y + sbox.h, { color: DC.data, width: 2 }));
  addText(slide, '｜ データの位置', sbox.x + sbox.w - 1.3, 4.92, 1.3, 0.25, { fontSize: 10, color: C.slate, align: 'right' });
}

// =====================================================================
// 14. 第5章 データを1点ずつ加える
// =====================================================================
{
  const slide = contentSlide('05　予測の式 ― データで条件づける', 'データを1点ずつ加える ― 帯が縮み、平均が引き寄せられる', [
    'データが1つもないときは、平均は 0、帯は事前の幅のままです。',
    'データを1点ずつ加えます。点の近くで帯が縮み、平均が点の方へ引き寄せられます。',
    '7点すべてで、予測の平均と帯が決まりました。点線は、データを作った真の関数です。',
  ]);
  [0, 1, 3, 7].forEach((count, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const box = { x: 1.15 + col * 6.2, y: 1.95 + row * 2.4, w: 5.4, h: 1.65 };
    panelTitle(slide, count === 0 ? 'データ 0 点（事前分布のまま）' : count === 7 ? 'データ 7 点（すべて）と真の関数' : `データ ${count} 点`, box.x - 0.55, box.y - 0.4, 5);
    const P = plotFrame(slide, box, [0, 6], YR, { xticks: X_TICKS, yticks: [-2, 0, 2], xlabel: row === 1 ? 'x' : undefined });
    addPrediction(slide, P, XS, partialPrediction(count), { width: 2.25 });
    if (count === 7) addCurve(slide, P, XS, TRUTH, { color: DC.truth, width: 1.5, dash: 'dash' });
    const idx = ADD_ORDER.slice(0, count);
    addDots(slide, P, idx.map((k) => D.DATA_X[k]), idx.map((k) => D.DATA_Y[k]), { d: 0.11 });
  });
  legendRow(slide, [{ color: DC.mean, label: '予測の平均' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { kind: 'dot', color: DC.data, label: 'データ' }, { color: DC.truth, dash: 'dash', width: 1.5, label: '真の関数' }], MARGIN_X, 6.55);
}

// =====================================================================
// 15. 第5章 平均はカーネルの山の和
// =====================================================================
{
  const slide = contentSlide('05　予測の式 ― データで条件づける', '平均はカーネルの山の和 ― 事後分布から関数を引く', [
    '平均は、各データ点に置いたカーネルの山を、重み α_i で足したものです。左の細い線が1つ1つの山、太い線がその和です。',
    '事後分布から関数を引くと、どれもデータの近くを通り、点の間でばらつきます。',
  ]);
  const boxes = [{ x: 1.2, y: 1.95, w: 5.1, h: 3.7 }, { x: 7.45, y: 1.95, w: 5.1, h: 3.7 }];
  panelTitle(slide, '山 α_{i} k(x, x_{i}) と、その和（予測の平均）', boxes[0].x - 0.55, 1.55, 5.6);
  panelTitle(slide, '事後分布から引いた関数', boxes[1].x - 0.55, 1.55, 5);
  const P1 = fnFrame(slide, boxes[0], { ylabel: 'f(x)' });
  addPrediction(slide, P1, XS, POSTERIOR, { transparency: 93, meanLine: false });
  BUMPS.forEach((ys, i) => addCurve(slide, P1, XS, ys, { color: sampleColor(i % 3), width: 1.25 }));
  addCurve(slide, P1, XS, Array.from(POSTERIOR.mean), { color: DC.mean, width: 3 });
  addData(slide, P1);
  const P2 = fnFrame(slide, boxes[1], { ylabel: 'f(x)' });
  addPrediction(slide, P2, XS, POSTERIOR, { width: 2.5 });
  POSTERIOR_SAMPLES_5V.forEach((ys, i) => addCurve(slide, P2, XS, ys, { color: sampleColor(i), width: 1.6 }));
  addData(slide, P2);
  legendRow(slide, [{ color: sampleColor(0), width: 1.25, label: 'αᵢ k(x, xᵢ)' }, { color: DC.mean, width: 3, label: '予測の平均（山の和）' }], boxes[0].x - 0.55, 6.2);
  legendRow(slide, [{ color: sampleColor(0), width: 1.6, label: '引いた関数' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { kind: 'dot', color: DC.data, label: 'データ' }], boxes[1].x - 0.55, 6.2);
}

// =====================================================================
// 16. 第5章 データ3点で計算してみる
// =====================================================================
{
  const slide = contentSlide('05　予測の式 ― データで条件づける', 'データ3点で計算してみる', [
    'データ3点で、実際に計算してみます。x = 1, 2, 4 の3点から、x* = 3 の値を予測します。カーネルは σ_f = 1、ℓ = 1 の RBF、ノイズの分散は 0.01 です。',
    `まず、データ点どうしのカーネル行列に、ノイズの分散を足します。近い1と2は ${fmt(UNIT_KERNEL(1, 2), 2)}、遠い1と4は ${fmt(UNIT_KERNEL(1, 4), 2)} です。`,
    '次に、重み α を連立方程式で求めます。α は、データ点ごとに置くカーネルの山の高さです。',
    `予測点とデータ点のカーネル k* を作り、α との内積をとると、予測の平均は ${fmt(EX_MEAN, 2)} です。`,
    `分散は、1 から ${fmt(EX_REDUCTION, 2)} を引いて ${fmt(EX_VAR, 2)}、標準偏差は ${fmt(Math.sqrt(EX_VAR), 2)} です。右の図の x = 3 の点が、この平均と帯に当たります。`,
  ]);
  addText(slide, lines([`データ：x = 1, 2, 4、y = ${EX_Y.map((v) => fmt(v, 1)).join(', ')}　予測する点：x_{*} = ${EX_STAR}`, `カーネル：RBF（σ_{f} = 1、ℓ = 1）、ノイズの分散 σ_{n}^{2} = ${EX_NOISE}`]), MARGIN_X, 1.55, 7.6, 0.65, { fontSize: 14, paraSpaceAfter: 4 });
  const rows = [['exK', 2.35, '① カーネル行列にノイズを足す'], ['exAlpha', 3.3, '② 重み α（連立方程式）'], ['exMean', 4.25, '③ k_{*} との内積 → 平均']];
  rows.forEach(([key, y, label]) => {
    addCircle(slide, MARGIN_X + 0.2, y + 0.4, 0.34, C.navy, label.slice(0, 1), { fontSize: 11 });
    addFormula(slide, key, MARGIN_X + 0.5, y, { scale: 0.53, alt: label });
    addText(slide, label.slice(2), MARGIN_X + 4.75, y + 0.2, 3.0, 0.4, { fontSize: 12.5, color: C.slate });
  });
  addCircle(slide, MARGIN_X + 0.2, 5.5, 0.34, C.navy, '④', { fontSize: 11 });
  addFormula(slide, 'exVar', MARGIN_X + 0.5, 5.32, { scale: 0.53, alt: '分散' });
  calloutBar(slide, `平均 μ_{*} = ${fmt(EX_MEAN, 3)}、標準偏差 σ_{*} = ${fmt(Math.sqrt(EX_VAR), 3)}`, MARGIN_X, 6.05, 7.6, 0.65, { fontSize: 15 });
  // 右: 予測の図
  const box = { x: 8.95, y: 2.0, w: 3.75, h: 3.1 };
  panelTitle(slide, 'この3点での予測', 8.4, 1.55, 4);
  const P = plotFrame(slide, box, [0, 5], [-2.2, 2.2], { xticks: [0, 1, 2, 3, 4, 5], yticks: [-2, -1, 0, 1, 2], xlabel: 'x' });
  addPrediction(slide, P, EX_XS, EX_CURVE, { width: 2.25 });
  addLine(slide, P.sx(EX_STAR), box.y, P.sx(EX_STAR), box.y + box.h, { color: C.goldText, width: 1, dash: 'dash' });
  addLine(slide, P.sx(EX_STAR), P.sy(EX_MEAN - 2 * Math.sqrt(EX_VAR)), P.sx(EX_STAR), P.sy(EX_MEAN + 2 * Math.sqrt(EX_VAR)), { color: C.goldText, width: 2.5 });
  addCircle(slide, P.sx(EX_STAR), P.sy(EX_MEAN), 0.14, C.goldText);
  addDots(slide, P, EX_X, EX_Y, { d: 0.13 });
  addText(slide, `x_{*} = ${EX_STAR}`, P.sx(EX_STAR) + 0.06, box.y + 0.04, 1, 0.22, { fontSize: 10, color: C.goldText, bold: true });
  legendRow(slide, [{ color: DC.mean, label: '平均' }, { kind: 'band', color: DC.mean, label: '±2σ' }, { kind: 'dot', color: DC.data, label: 'データ' }], 8.4, 5.6);
}

// =====================================================================
// 17. 第6章 ノイズとハイパーパラメータ
// =====================================================================
{
  const slide = contentSlide('06　ノイズとハイパーパラメータ', 'ハイパーパラメータを周辺尤度で決める', [
    'σ_n の2乗は、観測のばらつきです。0 にすると、平均はすべての点をちょうど通り、ばらつきまで関数とみなしてしまいます。',
    'カーネルの σ_f と ℓ、ノイズの σ_n を、まとめてハイパーパラメータと呼びます。予測の精度を大きく左右します。',
    '標準的な決め方は、周辺尤度の最大化です。周辺尤度は、そのハイパーパラメータで、手元のデータがどれだけ出やすいかを表します。',
    '第1項は当てはまりで、データをよく説明するほど大きくなります。第2項は複雑さの罰則で、何でも作れる柔らかいモデルほど小さくなります。2つの釣り合いで、ちょうどよいハイパーパラメータが選ばれます。最大化には、勾配を使う方法がよく使われます。',
  ]);
  addText(slide, 'σ_{n}^{2} ＝ 観測のばらつき。0 にすると、ばらつきまで関数とみなしてしまう', MARGIN_X, 1.6, CONTENT_W, 0.32, { fontSize: 14 });
  const th = formulaSize('theta', 0.6);
  addFormula(slide, 'theta', MARGIN_X + 0.1, 2.1, { scale: 0.6, alt: 'θ = (σf, ℓ, σn)' });
  addText(slide, 'ハイパーパラメータ（予測の精度を大きく左右する）', MARGIN_X + th.w + 0.4, 2.1, 6, th.h, { fontSize: 13, color: C.slate, valign: 'middle' });
  formulaBar(slide, 'lml', MARGIN_X, 2.85, CONTENT_W, 1.15, { scale: 0.68, alt: '対数周辺尤度 = 当てはまり + 複雑さの罰則 + 定数' });
  addText(slide, '周辺尤度 ＝ そのハイパーパラメータで、手元のデータがどれだけ出やすいか', MARGIN_X, 4.15, CONTENT_W, 0.32, { fontSize: 13.5, color: C.slate });
  const cw = (CONTENT_W - 0.3) / 2;
  [[DC.orange, '当てはまり', 'データをよく説明するほど大きい'], [DC.aqua, '複雑さの罰則', '何でも作れる柔らかいモデルほど小さい']].forEach(([color, title, desc], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 4.65, cw, 1.0);
    addCircle(slide, x + 0.45, 5.15, 0.5, color, String(i + 1), { fontSize: 15 });
    addText(slide, title, x + 0.9, 4.72, cw - 1.1, 0.4, { fontSize: 15, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.9, 5.12, cw - 1.1, 0.4, { fontSize: 13, color: C.slate });
  });
  calloutBar(slide, '2つの釣り合いで選ぶ（最大化には勾配を使う方法）', MARGIN_X, 5.95, CONTENT_W, 0.7);
}

// =====================================================================
// 18. 第6章 長さスケールを周辺尤度で選ぶ
// =====================================================================
{
  const slide = contentSlide('06　ノイズとハイパーパラメータ', '長さスケールを周辺尤度で選ぶ', [
    `長さスケールが小さすぎると（ℓ = ${SMALL_ELL}）、平均は点ごとに山を作り、点の間ですぐ 0 に戻ります。大きすぎると（ℓ = ${LARGE_ELL}）、平均はゆるやかすぎて、データの山と谷を表せません。`,
    `左下は、ℓ を動かしたときの対数周辺尤度です。最大になるのは ℓ ≈ ${fmt(D.BEST.lengthScale, 2)} で、このときの予測が上の右の図です。点線は真の関数です。選ばれた長さスケールの予測は、その大きな形をよくとらえています。`,
    '右下は、対数周辺尤度を2つの項に分けたものです。ℓ が小さいと当てはまりは良いのですが罰則が大きく、ℓ が大きいと罰則は小さくなるものの、当てはまりが急に悪くなります。',
  ]);
  const cases = [[SMALL_ELL, `ℓ = ${SMALL_ELL}：小さすぎる`], [LARGE_ELL, `ℓ = ${LARGE_ELL}：大きすぎる`], [D.BEST.lengthScale, `ℓ ≈ ${fmt(D.BEST.lengthScale, 2)}：周辺尤度が最大`]];
  cases.forEach(([ell, label], i) => {
    const box = { x: 1.1 + i * 4.1, y: 1.95, w: 3.45, h: 1.6 };
    panelTitle(slide, label, box.x - 0.5, 1.55, 4, { color: i === 2 ? C.goldText : C.navy });
    const P = plotFrame(slide, box, [0, 6], YR, { xticks: [0, 2, 4, 6], yticks: [-2, 0, 2] });
    addPrediction(slide, P, XS, predictWith(ell), { width: 2 });
    if (i === 2) addCurve(slide, P, XS, TRUTH, { color: DC.truth, width: 1.25, dash: 'dash' });
    addDots(slide, P, D.DATA_X, D.DATA_Y, { d: 0.09 });
  });
  // 下: 対数周辺尤度と2つの項
  const lbox = { x: 1.25, y: 4.4, w: 4.9, h: 1.65 };
  panelTitle(slide, '対数周辺尤度', 0.6, 4.0, 4);
  const L = plotFrame(slide, lbox, [ELLS[0], ELLS[ELLS.length - 1]], [-12, -4], { logX: true, xticks: [0.2, 0.5, 1, 2, 3], yticks: [-12, -8, -4], xlabel: '長さスケール ℓ（対数目盛り）' });
  addCurve(slide, L, ELLS, LML_PARTS.map((p) => p.total), { color: DC.mean, width: 2.5 });
  addLine(slide, L.sx(D.BEST.lengthScale), lbox.y, L.sx(D.BEST.lengthScale), lbox.y + lbox.h, { color: C.goldText, width: 1, dash: 'dash' });
  addCircle(slide, L.sx(D.BEST.lengthScale), L.sy(D.BEST.value), 0.13, C.goldText);
  addText(slide, `最大 ℓ ≈ ${fmt(D.BEST.lengthScale, 2)}`, L.sx(D.BEST.lengthScale) - 1.75, lbox.y + 0.06, 1.65, 0.22, { fontSize: 10, bold: true, color: C.goldText, align: 'right' });
  const pbox = { x: 7.45, y: 4.4, w: 4.9, h: 1.65 };
  panelTitle(slide, '2つの項に分ける', 6.85, 4.0, 4);
  const Q = plotFrame(slide, pbox, [ELLS[0], ELLS[ELLS.length - 1]], [-32, 10], { logX: true, xticks: [0.2, 0.5, 1, 2, 3], yticks: [-30, -20, -10, 0, 10], xlabel: '長さスケール ℓ（対数目盛り）' });
  addCurve(slide, Q, ELLS, LML_PARTS.map((p) => p.dataFit), { color: DC.orange, width: 2.25 });
  addCurve(slide, Q, ELLS, LML_PARTS.map((p) => p.complexity), { color: DC.aqua, width: 2.25 });
  addLine(slide, Q.sx(D.BEST.lengthScale), pbox.y, Q.sx(D.BEST.lengthScale), pbox.y + pbox.h, { color: C.goldText, width: 1, dash: 'dash' });
  legendRow(slide, [{ color: DC.orange, label: '当てはまり' }, { color: DC.aqua, label: '複雑さの罰則' }], 9.0, 4.02, { fontSize: 10.5 });
  legendRow(slide, [{ color: DC.mean, label: '予測の平均（上の図）' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { color: DC.truth, dash: 'dash', width: 1.25, label: '真の関数' }], 0.6, 6.72, { fontSize: 10.5 });
}

// =====================================================================
// 19. 第6章 ノイズの大きさ
// =====================================================================
{
  const slide = contentSlide('06　ノイズとハイパーパラメータ', 'ノイズの大きさ σ_{n} を変える', [
    `ノイズの大きさを変えてみます。σ_n を ${NOISE_LOW} と小さくすると、平均はすべての点を、ほぼちょうど通ります。σ_n を ${NOISE_HIGH} と大きくすると、点のずれをノイズとみなすので、平均はなだらかになり、帯も広がります。`,
    `周辺尤度で選んだ σ_n ≈ ${fmt(D.BEST.noise, 2)} は、その中間です。データを作ったノイズ ${fmt(D.NOISE_SD, 2)} に近い値が選ばれています。`,
    '測定のばらつきの大きさが分かっているときは、その値を参考に、ノイズの範囲を決めることもできます。',
  ]);
  const cases = [[NOISE_LOW, `σ_{n} = ${NOISE_LOW}：小さい`], [NOISE_HIGH, `σ_{n} = ${NOISE_HIGH}：大きい`], [D.BEST.noise, `σ_{n} ≈ ${fmt(D.BEST.noise, 2)}：周辺尤度で選んだ値`]];
  cases.forEach(([noise, label], i) => {
    const box = { x: 1.1 + i * 4.1, y: 1.95, w: 3.45, h: 2.2 };
    panelTitle(slide, label, box.x - 0.5, 1.55, 4, { color: i === 2 ? C.goldText : C.navy });
    const P = plotFrame(slide, box, [0, 6], YR, { xticks: [0, 2, 4, 6], yticks: [-2, 0, 2], xlabel: 'x' });
    addPrediction(slide, P, XS, predictWithNoise(noise), { width: 2 });
    addDots(slide, P, D.DATA_X, D.DATA_Y, { d: 0.09 });
  });
  legendRow(slide, [{ color: DC.mean, label: '予測の平均' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { kind: 'dot', color: DC.data, label: 'データ' }], MARGIN_X, 4.62, { fontSize: 10.5 });
  // 下: 選ばれた値と、ノイズの決め方
  addCard(slide, MARGIN_X, 5.05, 5.6, 1.75);
  addText(slide, 'この例で選ばれた値（周辺尤度の最大化）', MARGIN_X + 0.3, 5.15, 5, 0.3, { fontSize: 13, bold: true });
  addTable(slide, ['ℓ', 'σ_{f}', 'σ_{n}'], [[fmt(D.BEST.lengthScale, 2), fmt(D.BEST.signal, 2), `${fmt(D.BEST.noise, 2)}（真の値 ${fmt(D.NOISE_SD, 2)}）`]], MARGIN_X + 0.3, 5.6, [1.2, 1.2, 2.6], { rowH: 0.45, fontSize: 13, aligns: ['center', 'center', 'center'] });
  addCard(slide, MARGIN_X + 5.9, 5.05, CONTENT_W - 5.9, 1.75, { fill: C.goldTint, line: null });
  addText(slide, '測定のばらつきが分かっているとき', MARGIN_X + 6.2, 5.18, 5.5, 0.3, { fontSize: 14, bold: true, color: C.goldText });
  addText(slide, 'その値を参考に、ノイズ σ_{n} の範囲を決めることもできる。σ_{n} が小さすぎると、ばらつきまで関数とみなしてしまう', MARGIN_X + 6.2, 5.6, CONTENT_W - 6.5, 1.1, { fontSize: 13 });
}

// =====================================================================
// 20. 第7章 実務での注意
// =====================================================================
{
  const slide = contentSlide('07　実務での使い方と注意', '実務での注意 ― 計算量・入力ごとの長さスケール・外挿', [
    'データが n 点のとき、n 行 n 列の行列を扱います。計算量は n の3乗、記憶する量は n の2乗に比例します。数千点までは、ふつうのパソコンで計算できます。',
    '入力が複数あるときは、入力ごとに長さスケール ℓ_d を持たせます。ℓ_d が大きい入力ほど、出力への影響が小さいと読めます。',
    'データから離れた点では、予測は事前の平均に戻り、帯は事前の幅まで広がります。外挿は得意ではありません。',
  ]);
  numberedRow(slide, 1, C.coral, MARGIN_X, 1.6, CONTENT_W, 0.95, '計算量 ∝ n^{3}、記憶 ∝ n^{2}', 'n 点のデータで、n 行 n 列の行列を扱う');
  numberedRow(slide, 2, C.teal, MARGIN_X, 2.7, CONTENT_W, 0.95, '数千点までは、ふつうのパソコンで計算できる', 'データの数が増えると、計算時間は急に伸びる（p.21）');
  addCard(slide, MARGIN_X, 3.8, CONTENT_W, 1.75);
  addCircle(slide, MARGIN_X + 0.42, 4.67, 0.46, C.purple, '3', { fontSize: 15 });
  addText(slide, '入力が複数：入力ごとの長さスケール ℓ_{d}', MARGIN_X + 0.85, 3.9, 6, 0.38, { fontSize: 16, bold: true, valign: 'middle' });
  addFormula(slide, 'ard', MARGIN_X + 0.85, 4.32, { scale: 0.55, alt: '入力ごとの長さスケールを持つ RBF カーネル' });
  addText(slide, 'ℓ_{d} が大きい入力ほど、出力への影響が小さいと読める', MARGIN_X + 5.0, 4.4, CONTENT_W - 5.3, 0.9, { fontSize: 14, color: C.slate, valign: 'middle' });
  numberedRow(slide, 4, C.goldText, MARGIN_X, 5.7, CONTENT_W, 0.95, '外挿は苦手', 'データから離れると、予測は事前の平均と幅に戻る（p.21）');
}

// =====================================================================
// 21. 第7章 外挿と計算量
// =====================================================================
{
  const slide = contentSlide('07　実務での使い方と注意', '外挿と計算量', [
    'データの右側、x = 6 より先を見ます。データから離れるほど、平均は 0 に戻り、帯は事前の幅まで広がります。',
    '真の関数は、その先も揺れ続けていますが、予測にはそれを知るすべがありません。帯が広いのは、分からないという正直な答えです。',
    '右は、計算量の目安です。データが10倍になると、計算時間は約1000倍になります。1万点なら、100点のときの約100万倍です。',
  ]);
  const box = { x: 1.2, y: 1.95, w: 6.6, h: 3.9 };
  panelTitle(slide, 'データの外側（x > 6）の予測', 0.65, 1.55, 6);
  const P = plotFrame(slide, box, [0, D.EXTRA_MAX], YR, { xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], yticks: Y_TICKS, xlabel: 'x', ylabel: 'f(x)' });
  slide.addShape(pres.shapes.RECTANGLE, { x: P.sx(D.X_MAX), y: box.y, w: P.sx(D.EXTRA_MAX) - P.sx(D.X_MAX), h: box.h, fill: { color: C.gray }, line: { color: C.gray, width: 0.5 } });
  addPrediction(slide, P, WIDE, WIDE_PRED, { width: 2.5 });
  [1, -1].forEach((s) => addLine(slide, box.x, P.sy(2 * s * D.BEST.signal), box.x + box.w, P.sy(2 * s * D.BEST.signal), { color: DC.truth, width: 1, dash: 'sysDot' }));
  addText(slide, '事前の ±2σ', box.x + box.w - 1.3, P.sy(2 * D.BEST.signal) - 0.26, 1.25, 0.22, { fontSize: 10, color: C.slate, align: 'right' });
  addCurve(slide, P, WIDE, WIDE.map(D.truth), { color: DC.truth, width: 1.5, dash: 'dash' });
  addData(slide, P);
  addText(slide, 'データの外側', P.sx(7.5) - 0.8, box.y + box.h - 0.32, 1.6, 0.25, { fontSize: 11, color: C.muted, align: 'center' });
  legendRow(slide, [{ color: DC.mean, label: '予測の平均' }, { kind: 'band', color: DC.mean, label: '±2σ の帯' }, { color: DC.truth, dash: 'dash', width: 1.5, label: '真の関数' }, { kind: 'dot', color: DC.data, label: 'データ' }], 0.65, 6.45, { fontSize: 10.5 });
  // 右: 計算時間の比（ネイティブの棒グラフ、縦軸は対数）
  panelTitle(slide, '計算時間の目安（100点 ＝ 1、n^{3} に比例）', 8.3, 1.55, 4.6);
  const ratios = COST_SIZES.map((n) => (n / COST_SIZES[0]) ** 3);
  slide.addChart(pres.charts.BAR, [{ name: '計算時間の比', labels: COST_SIZES.map((n) => `${n.toLocaleString('en-US')} 点`), values: ratios }], {
    x: 8.3, y: 1.95, w: 4.4, h: 4.2, barDir: 'col', chartColors: [DC.mean], showLegend: false, showValue: true, dataLabelPosition: 'outEnd',
    dataLabelFormatCode: '#,##0', valAxisLogScaleBase: 10, valAxisMinVal: 1, valAxisMaxVal: 10000000, valAxisLabelFormatCode: '#,##0',
    barGapWidthPct: 60, ...chartBase(),
  });
  addText(slide, 'データが10倍 → 計算時間は約1000倍', 8.3, 6.3, 4.4, 0.35, { fontSize: 13, bold: true, color: C.goldText });
}

// =====================================================================
// 22. 第7章 使い方の手順
// =====================================================================
{
  const slide = contentSlide('07　実務での使い方と注意', '実務での使い方の手順', [
    '実務で使うときの手順をまとめます。まず、入力と出力を、平均 0、分散 1 に標準化します。',
    '次に、カーネルを選びます。迷ったら、Matérn の ν = 5/2 か、RBF から始めます。',
    'ハイパーパラメータは、周辺尤度の最大化で決めます。MATLAB の fitrgp や、Python の scikit-learn では、この最大化が、学習の関数の中で自動的に行われます。',
    '予測では、平均だけでなく帯も見ます。帯が広い場所は、データを足すと効果が大きい場所です。',
    '最後に、学習に使っていないデータで、予測の精度を確かめます。',
  ]);
  const STEPS = [
    ['標準化する', '入力と出力を、平均 0・分散 1 にそろえる'],
    ['カーネルを選ぶ', '迷ったら Matérn の ν = 5/2 か RBF から'],
    ['ハイパーパラメータを決める', '周辺尤度を最大化。MATLAB などでは関数の中で自動で計算される'],
    ['予測する', '平均だけでなく帯も見る。帯が広い場所はデータを足す候補'],
    ['確かめる', '学習に使っていないデータで、予測の精度を確かめる'],
  ];
  const colors = [C.coral, C.teal, C.purple, DC.mean, C.goldText];
  const LW = 7.5;
  STEPS.forEach(([title, desc], i) => numberedRow(slide, i + 1, colors[i], MARGIN_X, 1.6 + i * 1.03, LW, 0.9, title, desc, { titleSize: 15, descSize: 13 }));
  const RX = MARGIN_X + LW + 0.35;
  const RW = CONTENT_W - LW - 0.35;
  addCard(slide, RX, 1.6, RW, 4.92, { fill: C.gray, line: null });
  addText(slide, '計算できるツールの例', RX + 0.3, 1.78, RW - 0.6, 0.35, { fontSize: 16, bold: true });
  addCard(slide, RX + 0.25, 2.3, RW - 0.5, 1.1);
  addText(slide, [{ text: 'MATLAB：fitrgp', breakLine: true, bold: true, fontSize: 15 }, { text: 'Statistics and Machine Learning Toolbox', fontSize: 11.5, color: C.muted }], RX + 0.5, 2.3, RW - 1.0, 1.1, { valign: 'middle' });
  addCard(slide, RX + 0.25, 3.6, RW - 0.5, 1.1);
  addText(slide, [{ text: 'Python：scikit-learn', breakLine: true, bold: true, fontSize: 15 }, { text: 'GaussianProcessRegressor', fontSize: 12.5, color: C.slate }], RX + 0.5, 3.6, RW - 1.0, 1.1, { valign: 'middle' });
  addCard(slide, RX + 0.25, 4.9, RW - 0.5, 1.35, { fill: C.goldTint, line: null });
  addText(slide, lines(['どちらも、学習の関数', '（fitrgp、fit）の中で、', '周辺尤度の最大化まで自動で行う']), RX + 0.5, 4.9, RW - 0.8, 1.35, { fontSize: 13, bold: true, color: C.navy, valign: 'middle' });
}

// =====================================================================
// 23. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.navy };
  addText(slide, 'まとめ', MARGIN_X, 0.62, CONTENT_W, 0.75, { fontSize: 28, bold: true, color: C.white, valign: 'middle' });
  const items = [
    [C.coral, 'ガウス過程：どの点の組でも値は多変量正規分布 N(0, K)。K_{ij} = k(x_{i}, x_{j})'],
    [C.teal, 'カーネル：RBF の ℓ は「どれだけ離れると似なくなるか」。なめらかさは Matérn の ν で選ぶ'],
    [C.purple, '予測：平均 μ_{*} と分散 σ_{*}^{2} が式で求まる。不確かさはデータの位置で決まる'],
    [DC.mean, '予測の平均は、データ点に置いたカーネルの山の重みつきの和'],
    [C.gold, 'ハイパーパラメータ：周辺尤度（当てはまり＋複雑さの罰則）を最大化'],
    [C.slate, '実務：標準化 → カーネル選び → 周辺尤度 → 予測と帯 → 確かめる。計算量 n^{3} と外挿に注意'],
  ];
  items.forEach(([color, text], i) => {
    addCircle(slide, MARGIN_X + 0.3, 1.85 + i * 0.82, 0.46, color, String(i + 1), { fontSize: 14, color: color === C.gold ? C.navy : C.white });
    addText(slide, text, MARGIN_X + 0.75, 1.55 + i * 0.82, 6.65, 0.62, { fontSize: 13.5, color: C.white, valign: 'middle' });
  });
  addCard(slide, 8.1, 1.6, 4.63, 5.15, { fill: C.navy2, line: null });
  addCircle(slide, 8.6, 2.1, 0.55, C.teal, '✓', { fontSize: 16 });
  addText(slide, '使うときのチェック', 9.05, 1.82, 3.5, 0.55, { fontSize: 17, bold: true, color: C.white, valign: 'middle' });
  ['入力と出力を標準化したか', 'カーネルを選んだか（迷ったら Matérn 5/2 か RBF）', '周辺尤度で決めたか（ツールの中で自動）', '平均だけでなく帯も見たか', '学習に使っていないデータで確かめたか'].forEach((text, i) => {
    addCard(slide, 8.4, 2.75 + i * 0.78, 4.03, 0.62, { fill: C.navy, line: null });
    addText(slide, `${i + 1}　${text}`, 8.6, 2.75 + i * 0.78, 3.75, 0.62, { fontSize: 12, color: C.onDark2, valign: 'middle' });
  });
  footer(slide, { dark: true });
  slide.addNotes([
    'まとめです。ガウス過程回帰は、関数そのものに正規分布を置き、カーネルで2点の似ている度合いを決めます。',
    '予測は、多変量正規分布の条件づけで求まり、平均と不確かさの帯が式で出ます。',
    'ハイパーパラメータは周辺尤度で決め、手順に沿って、計算量と外挿に注意しながら使います。右のチェックを、使うときの確認に使ってください。',
  ].join('\n'));
}

// =====================================================================
// 24. 参考文献
// =====================================================================
{
  const slide = contentSlide(null, '参考文献', [
    'この資料の参考文献です。ガウス過程回帰の全体は、ラスムッセンとウィリアムズの教科書が標準的な文献です。',
    'Matérn カーネルはマテルンの本、空間データの補間との関係はスタインの本に基づきます。ツールは scikit-learn の論文と、MATLAB の fitrgp の説明書を挙げています。',
    '例の数値はすべて、説明用に式と乱数で作ったデータで計算したものです。',
  ]);
  const refs = [
    '[1] C. E. Rasmussen, C. K. I. Williams (2006). Gaussian Processes for Machine Learning. MIT Press.',
    '[2] B. Matérn (1986). Spatial Variation, 2nd ed. Lecture Notes in Statistics 36. Springer.',
    '[3] M. L. Stein (1999). Interpolation of Spatial Data: Some Theory for Kriging. Springer.',
    '[4] F. Pedregosa et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research 12, 2825–2830.',
    '[5] MathWorks. fitrgp — Fit a Gaussian process regression (GPR) model. Statistics and Machine Learning Toolbox documentation.',
  ];
  addText(slide, refs.map((text, i) => ({ text, breakLine: i < refs.length - 1 })), MARGIN_X, 1.6, CONTENT_W, 3.6, { fontSize: 13, paraSpaceAfter: 10, color: C.navy });
  addCard(slide, MARGIN_X, 5.85, CONTENT_W, 0.9, { fill: C.gray, line: null });
  addCircle(slide, MARGIN_X + 0.4, 6.3, 0.42, C.navy, 'i', { fontSize: 13 });
  addText(slide, `例のデータ（7点）は、y = sin(1.3x) + 0.35 cos(2.9x + 0.4) にノイズ（標準偏差 ${fmt(D.NOISE_SD, 2)}、種を固定した乱数）を加えて作った説明用のもので、実在のデータではない。数値は解説動画と同じ JavaScript の計算（gp-math.js、short-data.js）で求めた`, MARGIN_X + 0.8, 5.85, CONTENT_W - 1.0, 0.9, { fontSize: 12, valign: 'middle' });
}

pres.writeFile({ fileName: OUTPUT }).then((file) => console.log(`${file}（${pageNumber} 枚）`));
