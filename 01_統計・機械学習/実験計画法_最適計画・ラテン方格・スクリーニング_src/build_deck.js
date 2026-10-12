// 実験計画法（D最適・I最適・ラテン方格・スクリーニング）の解説資料（PowerPoint）を pptxgenjs で生成する。
// 使い方: node build_deck.js <出力パス>
// 前提: demo_results.json（demo_doe.py の出力）と formulas/（render_formulas.py の出力）が同じフォルダにある。

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

// D 最適は赤茶、I 最適は青で全スライドをそろえる
const C = {
  night: '13261E',
  primary: '1F5C45',
  primaryLight: '9CC9B4',
  tint: 'EAF3EE',
  dopt: 'B9502F',
  doptTint: 'F8E2D9',
  iopt: '2A6F97',
  ioptTint: 'DCEBF4',
  gold: 'C38D1E',
  goldTint: 'F7ECD2',
  ink: '16241D',
  muted: '56675F',
  line: 'B5C4BC',
  grid: 'E1E8E4',
  gray: 'F2F5F3',
  neutral: '8C9A93',
  white: 'FFFFFF',
  onDarkSub: 'CFE3D8',
};
// ラテン方格の処理 A〜D の色
const TRT_COLORS = ['2A6F97', 'B9502F', 'C38D1E', '5B8C5A'];

const fmt1 = (v) => v.toFixed(1);
const fmt2 = (v) => v.toFixed(2);
const fmt3 = (v) => v.toFixed(3);
const pct0 = (v) => Math.round(v * 100);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '実験計画法：最適計画・ラテン方格・スクリーニング';
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
  addText(slide, title, x + 0.25, y + 0.15, w - 0.5, 0.35, { fontSize: 13, bold: true, color: C.primaryLight });
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
  addText(slide, kicker, MARGIN_X, 0.36, 9, 0.3, { fontSize: 12, bold: true, color: C.primary, charSpacing: 1 });
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
function addNumberedCard(slide, x, y, w, h, num, title, desc, { fill = C.gray, color = C.primary, descSize = 13 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addNode(slide, x + 0.42, y + 0.42, 0.46, color, String(num), { fontSize: 15 });
  addText(slide, title, x + 0.8, y + 0.17, w - 0.95, 0.5, { fontSize: 15.5, bold: true, valign: 'middle' });
  addText(slide, desc, x + 0.3, y + 0.8, w - 0.55, h - 0.9, { fontSize: descSize });
}

// ---- デモの値 ----
const latin = demo.latin;
const lsEx = latin.example;
const screening = demo.screening;
const pb = screening.pb12;
const dsd = screening.dsd4;
const opt = demo.optimal;
const sq = opt.square;
const con = opt.constrained;
const TRT_LETTERS = ['A', 'B', 'C', 'D'];
const fmtP = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));

// ---- 実験計画の図の補助関数 ----

// ラテン方格を色つきの格子で描く
function drawLatinSquare(slide, x, y, cell, square, { rowLabel = '日', colLabel = '装置', labels = true, fontSize = 18, dark = false } = {}) {
  const n = square.length;
  const offset = labels ? 0.75 : 0;
  if (labels) {
    square[0].forEach((_, j) => addText(slide, `${colLabel}${j + 1}`, x + offset + j * cell, y, cell, 0.35, { fontSize: 12, bold: true, color: dark ? C.onDarkSub : C.muted, align: 'center', valign: 'middle' }));
    square.forEach((_, i) => addText(slide, `${rowLabel}${i + 1}`, x, y + 0.4 + i * cell, offset - 0.1, cell, { fontSize: 12, bold: true, color: dark ? C.onDarkSub : C.muted, align: 'right', valign: 'middle' }));
  }
  const top = y + (labels ? 0.4 : 0);
  square.forEach((row, i) => row.forEach((k, j) => {
    const cx = x + offset + j * cell;
    const cy = top + i * cell;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx + 0.03, y: cy + 0.03, w: cell - 0.06, h: cell - 0.06,
      fill: { color: TRT_COLORS[k] }, line: { color: TRT_COLORS[k], width: 0.5 },
    });
    addText(slide, TRT_LETTERS[k], cx, cy, cell, cell, { fontSize, bold: true, color: C.white, align: 'center', valign: 'middle' });
  }));
  return { w: offset + n * cell, h: (labels ? 0.4 : 0) + n * cell };
}

// ±1 の計画行列を色つきの格子で描く（+ は濃い色、− は薄い色）
function drawSignGrid(slide, x, y, cellW, cellH, design, headers, { plus = C.primary, minus = C.tint, zero = C.goldTint, fontSize = 11 } = {}) {
  // 行番号（実験の番号）を左に付ける
  design.forEach((_, i) => addText(slide, String(i + 1), x - 0.38, y + 0.32 + i * cellH, 0.3, cellH, { fontSize: 10, color: C.muted, align: 'right', valign: 'middle' }));
  headers.forEach((h, j) => addText(slide, h, x + j * cellW, y, cellW, 0.3, { fontSize: 11, bold: true, color: C.muted, align: 'center', valign: 'middle' }));
  design.forEach((row, i) => row.forEach((v, j) => {
    const fill = v > 0 ? plus : (v < 0 ? minus : zero);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x + j * cellW + 0.02, y: y + 0.32 + i * cellH + 0.02, w: cellW - 0.04, h: cellH - 0.04,
      fill: { color: fill }, line: { color: fill, width: 0.5 },
    });
    addText(slide, v > 0 ? '+' : (v < 0 ? '−' : '0'), x + j * cellW, y + 0.32 + i * cellH, cellW, cellH, {
      fontSize, bold: true, color: v > 0 ? C.white : C.ink, align: 'center', valign: 'middle',
    });
  }));
}

// 実験領域（[-1,1]^2、制約つきも可）と設計点を描く
function drawDesignPanel(slide, box, points, color, { title, constraint, fill = C.gray } = {}) {
  const toX = (v) => box.x + ((v + 1) / 2) * box.w;
  const toY = (v) => box.y + box.h - ((v + 1) / 2) * box.h;
  if (constraint !== undefined) {
    // x1 + x2 ≤ c の多角形
    const c = constraint;
    const verts = [[-1, -1], [1, -1], [1, c - 1], [c - 1, 1], [-1, 1]];
    slide.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: C.white }, line: { color: C.line, width: 1, dashType: 'dash' } });
    slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
      ...box,
      points: [...verts.map(([u, v]) => ({ x: toX(u) - box.x, y: toY(v) - box.y })), { close: true }],
      fill: { color: fill }, line: { color: C.neutral, width: 1.25 },
    });
  } else {
    slide.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: fill }, line: { color: C.neutral, width: 1.25 } });
  }
  [-0.5, 0, 0.5].forEach((v) => {
    addLine(slide, toX(v), box.y, toX(v), box.y + box.h, { color: C.grid, width: 0.75 });
    addLine(slide, box.x, toY(v), box.x + box.w, toY(v), { color: C.grid, width: 0.75 });
  });
  points.forEach((pt) => {
    const d = 0.26;
    addNode(slide, toX(pt.x1), toY(pt.x2), d, color, '', { lineColor: C.white });
    if (pt.count > 1) {
      const lx = pt.x1 > 0.5 ? toX(pt.x1) - 0.62 : toX(pt.x1) + 0.16;
      const ly = pt.x2 > 0.5 ? toY(pt.x2) + 0.08 : toY(pt.x2) - 0.36;
      addText(slide, `×${pt.count}`, lx, ly, 0.46, 0.28, { fontSize: 12, bold: true, color, align: pt.x1 > 0.5 ? 'right' : 'left' });
    }
  });
  addText(slide, '−1', box.x - 0.2, box.y + box.h + 0.2, 0.4, 0.25, { fontSize: 10, color: C.muted, align: 'center' });
  addText(slide, '1', box.x + box.w - 0.2, box.y + box.h + 0.2, 0.4, 0.25, { fontSize: 10, color: C.muted, align: 'center' });
  addText(slide, 'x_{1}', box.x + box.w / 2 - 0.3, box.y + box.h + 0.2, 0.6, 0.28, { fontSize: 11, color: C.muted, align: 'center' });
  addText(slide, 'x_{2}', box.x - 0.62, box.y + box.h / 2 - 0.14, 0.35, 0.28, { fontSize: 11, color: C.muted, align: 'right' });
  if (title) addText(slide, title, box.x - 0.2, box.y - 0.5, box.w + 0.4, 0.38, { fontSize: 15, bold: true, color, align: 'center', valign: 'middle' });
}

// 楕円（信頼領域のイメージ）
function addEllipse(slide, cx, cy, rx, ry, angleDeg, { color, fill }) {
  const pts = [];
  const a = (angleDeg * Math.PI) / 180;
  for (let t = 0; t <= 64; t += 1) {
    const th = (2 * Math.PI * t) / 64;
    const ux = rx * Math.cos(th);
    const uy = ry * Math.sin(th);
    pts.push({ x: ux * Math.cos(a) - uy * Math.sin(a), y: ux * Math.sin(a) + uy * Math.cos(a) });
  }
  const r = Math.max(rx, ry);
  const box = { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    ...box, points: [...pts.map((p) => ({ x: p.x + r, y: p.y + r })), { close: true }],
    fill: fill ? { color: fill, transparency: 30 } : { type: 'none' }, line: { color, width: 2 },
  });
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, '実験計画法（DOE）', 0.8, 1.35, 7, 0.4, { fontSize: 15, bold: true, color: C.primaryLight, charSpacing: 2 });
  addText(slide, withBreaks(['最適計画・ラテン方格・', 'スクリーニング']), 0.8, 1.85, 8.0, 1.7, { fontSize: 40, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, '少ない実験で、知りたいことを正確に知るための計画の立て方', 0.8, 3.75, 7.6, 0.5, { fontSize: 19, color: C.onDarkSub });
  addText(slide, 'D最適計画・I最適計画、ラテン方格法、スクリーニング実験計画を、原理から使い分けまで合成データのデモとともに解説', 0.8, 4.45, 7.2, 0.8, { fontSize: 14, color: C.primaryLight });
  addText(slide, DECK_DATE, 0.8, 6.45, 4, 0.35, { fontSize: 13, color: C.onDarkSub });
  drawLatinSquare(slide, 9.0, 1.7, 0.78, lsEx.square, { labels: false, fontSize: 20 });
  addText(slide, '4×4 ラテン方格：どの行・列にも A〜D が 1 回ずつ', 8.4, 5.05, 4.4, 0.6, { fontSize: 12, color: C.onDarkSub, align: 'center' });
  slide.addNotes([
    'この資料では、実験計画法のうち、D最適計画とI最適計画、ラテン方格法、スクリーニング実験計画の4つを解説します。',
    'どれも、限られた実験回数で、知りたいことをできるだけ正確に知るための計画の立て方です。',
    'ラテン方格法は、日や装置のような、実験結果に影響するけれど調べたいわけではない要因を、うまく打ち消すための古典的な計画です。',
    'スクリーニング実験計画は、多くの候補の中から効いている因子を少ない実験で見つけるための計画です。',
    'D最適計画とI最適計画は、計算機を使って、目的に合わせた最適な実験点を探す方法です。',
    '右の図は、後で使うラテン方格の例です。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料で分かること
// =====================================================================
{
  const slide = newContentSlide('INTRODUCTION', 'この資料で分かること', [
    '全体は6つのパートです。',
    'まず、実験計画法の基本と、計画行列から推定の精度が決まるという考え方を確認します。',
    '次に、古典的な計画として、ラテン方格法とスクリーニング実験計画を説明します。',
    'そのあと、計算機で計画を作る最適計画の考え方と、代表的なD最適計画とI最適計画を、デモで比べます。',
    '最後に、実務での流れ、選び方、よくある落とし穴、コード例をまとめます。',
  ]);
  const items = [
    ['実験計画法の基本', '因子・水準・3 原則、計画行列と推定精度'],
    ['ラテン方格法', '2 つの局外因子を同時にブロックとして扱う'],
    ['スクリーニング実験計画', '一部実施要因・PB 計画・確定的スクリーニング'],
    ['最適計画の考え方', '情報行列と、D・A・G・I などの最適性規準'],
    ['D 最適計画と I 最適計画', '推定の精度か、予測の精度か。デモで比較'],
    ['使い分けと実務', '逐次実験の流れ、選び方、落とし穴、コード例'],
  ];
  const colX = [MARGIN_X, 6.95];
  const rowY = [1.75, 3.15, 4.55];
  items.forEach(([title, desc], i) => {
    const x = colX[Math.floor(i / 3)];
    const y = rowY[i % 3];
    addNode(slide, x + 0.33, y + 0.42, 0.66, C.primary, String(i + 1), { fontSize: 20 });
    addText(slide, title, x + 0.9, y + 0.05, 4.9, 0.45, { fontSize: 19, bold: true, valign: 'middle' });
    addText(slide, desc, x + 0.9, y + 0.55, 4.9, 0.4, { fontSize: 14, color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.tint });
  addText(slide, '想定する読者：平均・分散・回帰分析・分散分析の基本を知っている人。行列の式は「何を小さくしているか」が分かる粒度で示します。',
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 3. 実験計画法とは
// =====================================================================
{
  const slide = newContentSlide('1  実験計画法の基本', '実験計画法：どの条件で何回実験するかを先に決める', [
    '実験計画法は、どの条件で、何回、どの順番で実験するかを、データを取る前に決めるための方法です。',
    '実験で意図的に変える要因を因子、因子の設定値を水準、測る結果を応答と呼びます。',
    'また、調べたいわけではないけれど結果に影響する要因、例えば日によるばらつきや装置の違いを、局外因子やノイズ因子と呼びます。',
    '因子を1つずつ変える実験では、交互作用、つまり因子の組み合わせで効き方が変わる現象を見逃し、実験回数も多くなります。',
    '実験計画法では、複数の因子を同時に変える計画を使い、少ない回数で主効果と交互作用を推定します。',
  ]);
  const y = 1.75;
  const h = 1.35;
  addCard(slide, MARGIN_X, y, 3.3, h, { fill: C.tint });
  addText(slide, [{ text: '因子 x（水準を変える）', bold: true, color: C.primary, fontSize: 16, breakLine: true }, { text: '温度・時間・圧力・材料など', fontSize: 13 }], MARGIN_X, y, 3.3, h, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addCard(slide, 4.85, y - 0.05, 3.6, h + 0.1, { fill: C.night });
  addText(slide, [{ text: '工程・装置', bold: true, color: C.white, fontSize: 17, breakLine: true }, { text: '実験 1 回ごとに結果が出る', fontSize: 12.5, color: C.onDarkSub }], 4.85, y - 0.05, 3.6, h + 0.1, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addCard(slide, SLIDE_W - MARGIN_X - 3.3, y, 3.3, h, { fill: C.doptTint });
  addText(slide, [{ text: '応答 y（測る結果）', bold: true, color: C.dopt, fontSize: 16, breakLine: true }, { text: '寸法・歩留まり・特性値など', fontSize: 13 }], SLIDE_W - MARGIN_X - 3.3, y, 3.3, h, { align: 'center', valign: 'middle', paraSpaceAfter: 3 });
  addLine(slide, MARGIN_X + 3.35, y + h / 2, 4.8, y + h / 2, { color: C.ink, width: 2, arrow: true });
  addLine(slide, 8.5, y + h / 2, SLIDE_W - MARGIN_X - 3.35, y + h / 2, { color: C.ink, width: 2, arrow: true });

  const terms = [
    ['水準', '因子の設定値（例：温度 150℃・170℃ の 2 水準）'],
    ['主効果', '因子 1 つの水準を変えたときの応答の変化'],
    ['交互作用', '因子の組み合わせで効き方が変わること（例：高温のときだけ時間が効く）'],
    ['局外因子', '調べたくはないが結果に影響する要因（日・装置・ロット）'],
  ];
  const cw = (CONTENT_W - 0.3) / 2;
  terms.forEach(([t, d], i) => {
    const x = MARGIN_X + (i % 2) * (cw + 0.3);
    const ty = 3.5 + Math.floor(i / 2) * 1.2;
    addCard(slide, x, ty, cw, 1.0, { fill: C.gray });
    addText(slide, t, x + 0.25, ty, 1.5, 1.0, { fontSize: 16, bold: true, color: C.primary, valign: 'middle' });
    addText(slide, d, x + 1.75, ty, cw - 2.0, 1.0, { fontSize: 13.5, valign: 'middle' });
  });
  addText(slide, [{ text: '1 因子ずつ変える実験の弱点：', bold: true, color: C.dopt }, { text: '交互作用を見逃す。因子が多いと実験回数が増える。→ 複数の因子を同時に変える計画を使う' }],
    MARGIN_X, 5.95, CONTENT_W, 0.7, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 4. フィッシャーの3原則
// =====================================================================
{
  const slide = newContentSlide('1  実験計画法の基本', 'フィッシャーの 3 原則：反復・無作為化・局所管理', [
    '実験計画法の基本は、フィッシャーが示した3つの原則です。',
    '1つ目の反復は、同じ条件で複数回実験することです。誤差の大きさを見積もるために必要です。',
    '2つ目の無作為化は、実験の順番や割り付けをランダムにすることです。時間とともに変わる装置の状態など、気づいていない要因の影響が、特定の条件に偏るのを防ぎます。',
    '3つ目の局所管理は、ブロック化とも呼ばれ、日や装置のように条件がそろったまとまりの中で比較することです。まとまりの違いを誤差から取り除けるので、精度が上がります。',
    'このあと説明するラテン方格法は、局所管理を2つの方向、例えば日と装置に同時に行う計画です。',
  ]);
  const items = [
    ['反復', '同じ条件で複数回行う', '誤差の大きさを見積もれる。平均をとると精度が上がる'],
    ['無作為化', '順序・割り付けをランダムに', '気づいていない要因（装置の経時変化など）の偏りを防ぐ'],
    ['局所管理（ブロック化）', 'そろったまとまりの中で比べる', '日・装置などの違いを誤差から取り除き、精度を上げる'],
  ];
  const cw = (CONTENT_W - 0.5) / 3;
  items.forEach(([t, what, why], i) => {
    const x = MARGIN_X + i * (cw + 0.25);
    const y = 1.7;
    addCard(slide, x, y, cw, 3.6, { fill: i === 2 ? C.goldTint : C.gray });
    addNode(slide, x + cw / 2, y + 0.7, 0.8, i === 2 ? C.gold : C.primary, String(i + 1), { fontSize: 24 });
    addText(slide, t, x + 0.2, y + 1.25, cw - 0.4, 0.5, { fontSize: 19, bold: true, align: 'center', valign: 'middle' });
    addText(slide, what, x + 0.3, y + 1.9, cw - 0.6, 0.6, { fontSize: 14, bold: true, color: C.primary, align: 'center' });
    addText(slide, why, x + 0.3, y + 2.55, cw - 0.6, 0.95, { fontSize: 13.5, align: 'center' });
  });
  addCard(slide, MARGIN_X, 5.65, CONTENT_W, 1.0, { fill: C.tint });
  addText(slide, [
    { text: 'ラテン方格法 ＝ 局所管理を 2 方向に行う計画。', bold: true, color: C.primary },
    { text: '例：「日」と「装置」の 2 つの局外因子を同時にブロックとして扱い、処理（条件）の比較から取り除く' },
  ], MARGIN_X + 0.3, 5.65, CONTENT_W - 0.6, 1.0, { fontSize: 14.5, valign: 'middle' });
  addSource(slide, '出典：Fisher（1935）The Design of Experiments');
}

// =====================================================================
// 5. 線形モデルと計画行列
// =====================================================================
{
  const slide = newContentSlide('1  実験計画法の基本', '計画行列 X を決めると、データを取る前に精度が決まる', [
    '実験計画を数式で見てみます。応答を因子の線形モデルで表すと、yイコールXベータ足すイプシロンと書けます。Xは計画行列で、1行が1回の実験、列がモデルの各項です。',
    '最小二乗法で係数を推定すると、その分散は、シグマ2乗かける、Xの転置Xの逆行列になります。',
    '同じように、ある条件xでの予測値の分散も、Xの転置Xの逆行列を使って書けます。',
    'ここで大事なのは、どちらの式にも、応答yが入っていないことです。つまり、計画行列Xを決めた時点で、データを取る前に、推定や予測の精度が決まります。',
    'Xの転置Xを情報行列と呼びます。これをできるだけ「大きく」するように実験点を選ぶのが、後で説明する最適計画の考え方です。',
    '右の表は、2因子2水準の要因計画の計画行列です。各列が互いに直交しているので、情報行列は対角行列になり、各係数を独立に最も精度よく推定できます。',
  ]);
  const lw = 6.4;
  const fl = formulaSize('linear_model');
  addText(slide, '線形モデル', MARGIN_X, 1.6, lw, 0.35, { fontSize: 15, bold: true, color: C.primary });
  addFormula(slide, 'linear_model', MARGIN_X + 0.2, 2.0, { alt: 'y = Xβ + ε' });
  addText(slide, '係数の推定値の分散', MARGIN_X, 2.2 + fl.h, lw, 0.35, { fontSize: 15, bold: true, color: C.primary });
  const fv = formulaSize('var_beta');
  addFormula(slide, 'var_beta', MARGIN_X + 0.2, 2.6 + fl.h, { alt: 'Var(β̂) = σ²(XᵀX)⁻¹' });
  addText(slide, '条件 x での予測値の分散', MARGIN_X, 2.8 + fl.h + fv.h, lw, 0.35, { fontSize: 15, bold: true, color: C.primary });
  const fp = formulaSize('pred_var');
  addFormula(slide, 'pred_var', MARGIN_X + 0.2, 3.2 + fl.h + fv.h, { alt: 'Var(ŷ(x)) = σ² f(x)ᵀ(XᵀX)⁻¹f(x)' });
  addCard(slide, MARGIN_X, 3.55 + fl.h + fv.h + fp.h, lw, 1.3, { fill: C.doptTint });
  addText(slide, [
    { text: 'どちらの式にも応答 y が入っていない', bold: true, color: C.dopt, breakLine: true },
    { text: '→ 計画 X を決めた時点で精度が決まる。XᵀX（情報行列）を「大きく」するのが最適計画', fontSize: 13.5 },
  ], MARGIN_X + 0.3, 3.55 + fl.h + fv.h + fp.h, lw - 0.6, 1.3, { fontSize: 15, valign: 'middle', paraSpaceAfter: 4 });

  const rx = 7.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '例：2 因子・2 水準の要因計画（4 回）', rx, 1.6, rw, 0.35, { fontSize: 15, bold: true, color: C.primary });
  const design = [[1, -1, -1, 1], [1, 1, -1, -1], [1, -1, 1, -1], [1, 1, 1, 1]];
  drawSignGrid(slide, rx + 0.4, 2.05, 1.05, 0.55, design, ['切片', 'x1', 'x2', 'x1x2']);
  addText(slide, '行 ＝ 実験 1 回、列 ＝ モデルの項', rx, 4.65, rw, 0.35, { fontSize: 12.5, color: C.muted });
  addBullets(slide, [
    '列どうしが直交 → XᵀX ＝ 4I（対角）',
    '各係数を独立に、最も精度よく推定できる',
  ], rx, 5.1, rw, 1.4, { fontSize: 14, space: 8 });
}

// =====================================================================
// 6. ラテン方格とは
// =====================================================================
{
  const slide = newContentSlide('2  ラテン方格法', 'ラテン方格：どの行・どの列にも、各処理が 1 回ずつ', [
    'ラテン方格法は、2つの局外因子を同時にブロックとして扱う計画です。',
    '例えば、4つの処理条件AからDを比べたいけれど、実験する日と使う装置によっても結果が変わる、という状況を考えます。',
    '左の図のように、行を日、列を装置とした4かける4のマス目に、どの行にもどの列にも、AからDが1回ずつ入るように割り付けます。これがラテン方格です。',
    'こうすると、どの処理も、全ての日と全ての装置を1回ずつ経験するので、日と装置の影響が処理の比較に偏って入りません。',
    '3つの因子を4水準ずつ全て組み合わせると64回必要ですが、ラテン方格なら16回で済みます。',
    'モデルは、全体平均に、行の効果、列の効果、処理の効果を足したものです。ただし、行・列・処理の間に交互作用がないことを前提にしています。',
    '実際に使うときは、標準的な方格の行・列・文字をランダムに並べ替えて、無作為化します。',
  ]);
  const size = drawLatinSquare(slide, MARGIN_X, 1.65, 0.95, lsEx.square);
  addText(slide, '行 ＝ 日（局外因子 1）、列 ＝ 装置（局外因子 2）、文字 ＝ 処理（調べたい因子）', MARGIN_X, 1.75 + size.h, size.w + 0.3, 0.6, { fontSize: 12.5, color: C.muted });
  const rx = 6.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    'どの処理も、すべての日・すべての装置を 1 回ずつ経験する → 日・装置の影響が処理の比較に偏らない',
    '3 因子 × 4 水準の全組み合わせ 64 回が、16 回で済む',
    '前提：行・列・処理の間に交互作用がない',
    '使うときは、行・列・文字をランダムに並べ替える（無作為化）',
  ], rx, 1.7, rw, 3.2, { fontSize: 14.5, space: 10 });
  addText(slide, 'モデル（ρ：行、γ：列、τ：処理の効果）', rx, 4.95, rw, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const fm = formulaSize('latin_model');
  addFormulaCard(slide, 'latin_model', rx, 5.35, rw, fm.h + 0.4, { fill: C.goldTint, alt: 'y_ijk = μ + ρ_i + γ_j + τ_k + ε_ijk' });
}

// =====================================================================
// 7. ラテン方格の分散分析
// =====================================================================
{
  const anova = lsEx.anova;
  const trt = anova[2];
  const slide = newContentSlide('2  ラテン方格法', '解析：分散分析で行・列の変動を取り除く', [
    `前のスライドの方格で、合成データを作って分散分析しました。処理の効果は、AからDでマイナス${fmt2(latin.settings.example_d * 0.75)}からプラス${fmt2(latin.settings.example_d * 0.75)}まで、誤差の標準偏差は${latin.settings.noise_sd}です。`,
    '全体の変動を、行、列、処理、誤差の4つに分けます。自由度は、行・列・処理がそれぞれ3、誤差が6です。',
    `処理のF値は${fmt2(trt.f)}、p値は${fmtP(trt.p)}で、5パーセント水準で処理の差があると判断できます。`,
    `ところが、同じデータを、日と装置を無視して、処理だけの一元配置分散分析で解析すると、p値は${fmtP(lsEx.oneway_p)}になり、差を見逃します。`,
    '日と装置による変動が誤差に混ざり、誤差が大きく見積もられてしまうためです。ブロック化の効果がよく分かる例です。',
    'なお、4かける4の方格では誤差の自由度が6しかないので、検出力を上げたいときは方格を複数くり返します。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary }, align: 'center' } });
  const rows = anova.map((r, i) => [
    { text: r.source, options: { bold: true, color: i === 2 ? C.dopt : C.ink } },
    { text: fmt2(r.ss), options: { align: 'center' } },
    { text: String(r.df), options: { align: 'center' } },
    { text: r.ms !== undefined ? fmt3(r.ms) : '', options: { align: 'center' } },
    { text: r.f !== undefined ? fmt2(r.f) : '', options: { align: 'center', bold: i === 2 } },
    { text: r.p !== undefined ? fmtP(r.p) : '', options: { align: 'center', bold: i === 2, color: i === 2 ? C.dopt : C.ink } },
  ].map((cell) => ({ ...cell, options: { ...cell.options, fill: { color: i === 2 ? C.doptTint : C.white } } })));
  const tw = 7.3;
  slide.addTable([['変動要因', '平方和', '自由度', '平均平方', 'F 値', 'p 値'].map(head), ...rows], {
    x: MARGIN_X, y: 1.65, w: tw, colW: [1.9, 1.1, 0.9, 1.2, 1.0, 1.2],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.46,
  });
  addText(slide, `処理の平均：${lsEx.trt_means.map((m, k) => `${TRT_LETTERS[k]} ${fmt2(m)}`).join('、')}`, MARGIN_X, 4.6, tw, 0.35, { fontSize: 13, color: C.muted });
  addBullets(slide, [
    '全体の変動を、行・列・処理・誤差に分ける',
    '4×4 では誤差の自由度が 6 しかない → 検出力を上げるには方格をくり返す',
  ], MARGIN_X, 5.15, tw, 1.4, { fontSize: 14, space: 8 });

  const rx = 8.35;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '同じデータで、処理の p 値を比べると', rx, 1.65, rw, 0.4, { fontSize: 14.5, bold: true, color: C.primary });
  const cards = [
    ['ラテン方格として解析', fmtP(trt.p), '差があると判断できる', C.primary, C.tint],
    ['日・装置を無視した一元配置', fmtP(lsEx.oneway_p), '差を見逃す（日・装置の変動が誤差に混ざる）', C.neutral, C.gray],
  ];
  cards.forEach(([t, p, d, color, fill], i) => {
    const y = 2.15 + i * 2.2;
    addCard(slide, rx, y, rw, 1.95, { fill });
    addText(slide, t, rx + 0.25, y + 0.15, rw - 0.5, 0.35, { fontSize: 13.5, bold: true, color });
    addText(slide, `p ＝ ${p}`, rx + 0.25, y + 0.55, rw - 0.5, 0.65, { fontSize: 30, bold: true, color, valign: 'middle' });
    addText(slide, d, rx + 0.25, y + 1.25, rw - 0.5, 0.6, { fontSize: 12.5 });
  });
  addSource(slide, `合成データ：処理効果 ${latin.settings.trt_pattern.map((v) => fmt2(v * latin.settings.example_d)).join('・')}、誤差の標準偏差 ${latin.settings.noise_sd}。Python（statsmodels）と MATLAB（anovan）で同じ結果を確認`);
}

// =====================================================================
// 8. デモ：検出力
// =====================================================================
{
  const power = latin.power;
  const labels = power.map((r) => fmt2(r.d));
  const at = (d) => power.find((r) => Math.abs(r.d - d) < 1e-9);
  const slide = newContentSlide('2  ラテン方格法', 'デモ：ブロック化で検出力がどれだけ上がるか', [
    `ラテン方格として解析した場合と、日と装置を無視した場合で、処理の差を検出できる確率、つまり検出力を比べました。処理効果の大きさを変えながら、それぞれ${latin.settings.reps}回くり返しています。`,
    `処理効果の倍率が1のとき、ラテン方格の検出力は${pct0(at(1).latin)}パーセントですが、無視した場合は${pct0(at(1).oneway)}パーセントしかありません。`,
    `倍率1.5では、ラテン方格が${pct0(at(1.5).latin)}パーセント、無視した場合が${pct0(at(1.5).oneway)}パーセントです。`,
    `また、効果がない、倍率0のときに誤って差ありと判断する確率は、ラテン方格ではちょうど5パーセントですが、無視した場合は${pct0(at(0).oneway)}パーセントで、検定が保守的になりすぎています。`,
    '同じ16回の実験でも、計画と解析で局外因子を扱うかどうかで、結論が大きく変わります。',
  ]);
  slide.addChart([
    dashedLine('ラテン方格として解析', labels, power.map((r) => r.latin * 100), C.primary, 'solid', 7),
    dashedLine('日・装置を無視（一元配置）', labels, power.map((r) => r.oneway * 100), C.neutral, 'dash', 7),
  ], {
    x: MARGIN_X, y: 1.55, w: 7.6, h: 5.2, ...chartBase(),
    showTitle: true, title: `処理の差を検出できた割合（%、各 ${latin.settings.reps} 回）`,
    showCatAxisTitle: true, catAxisTitle: '処理効果の大きさ（倍率 d）',
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary }, align: 'center' } });
  slide.addTable([
    [head('倍率 d'), head('ラテン方格'), head('無視')],
    ...[0, 1, 1.5, 2].map((d) => [
      { text: fmt2(d), options: { align: 'center', bold: true } },
      { text: `${pct0(at(d).latin)}%`, options: { align: 'center', color: C.primary, bold: true } },
      { text: `${pct0(at(d).oneway)}%`, options: { align: 'center', color: C.muted } },
    ]),
  ], {
    x: rx, y: 1.7, w: rw, colW: [1.2, 1.5, rw - 2.7],
    fontFace: FONT, fontSize: 14, color: C.ink, valign: 'middle', margin: [0.04, 0.08, 0.04, 0.08],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.45,
  });
  addBullets(slide, [
    '同じ 16 回の実験でも、局外因子を扱うかで結論が変わる',
    `効果がないとき（d=0）の誤判定：ラテン方格 ${pct0(at(0).latin)}%、無視 ${pct0(at(0).oneway)}%（保守的すぎる）`,
  ], rx, 4.25, rw, 2.4, { fontSize: 14, space: 10 });
  addSource(slide, `設定：行の効果 ${latin.settings.row_effects.join('・')}、列の効果 ${latin.settings.col_effects.join('・')}、処理効果 d ×（${latin.settings.trt_pattern.join('・')}）、誤差の標準偏差 ${latin.settings.noise_sd}、有意水準 5%`);
}

// =====================================================================
// 9. 発展と注意点・ラテン超方格との違い
// =====================================================================
{
  const slide = newContentSlide('2  ラテン方格法', '発展形と注意点、「ラテン超方格法」との違い', [
    'ラテン方格の発展形と注意点、そして名前の似たラテン超方格法との違いをまとめます。',
    'グレコ・ラテン方格は、2つのラテン方格を重ねたもので、3つの局外因子を扱えます。直交表との関係も深く、例えば4水準の直交表は、ラテン方格の組から作れます。',
    '注意点は、処理の数と行・列の数が同じでなければならないこと、交互作用がないことを前提にしていること、そして小さい方格では誤差の自由度が少ないことです。',
    'ラテン超方格法は、名前は似ていますが目的が違います。シミュレーションや計算機実験で、多数の入力変数の範囲を均等に埋めるためのサンプリング方法です。各変数の範囲をn等分し、それぞれの区間から1点ずつ取ります。',
    'ラテン方格法は、局外因子の影響を打ち消して処理を比べるための計画で、ラテン超方格法は、入力空間を効率よく探索するための点の置き方です。',
  ]);
  const cw = (CONTENT_W - 0.3) / 2;
  const cardsL = [
    ['グレコ・ラテン方格', '2 つの直交するラテン方格を重ね、3 つの局外因子を扱う。直交表とも関係が深い'],
    ['方格のくり返し', '4×4 では誤差の自由度が 6。複数の方格を使うと検出力が上がる'],
    ['前提と制約', '処理数 ＝ 行数 ＝ 列数。行・列・処理の交互作用がないこと'],
  ];
  cardsL.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.2;
    addCard(slide, MARGIN_X, y, cw, 1.05, { fill: C.gray });
    addText(slide, t, MARGIN_X + 0.25, y + 0.1, cw - 0.5, 0.35, { fontSize: 15, bold: true, color: C.primary });
    addText(slide, d, MARGIN_X + 0.25, y + 0.5, cw - 0.5, 0.5, { fontSize: 13 });
  });
  const rx = MARGIN_X + cw + 0.3;
  addCard(slide, rx, 1.6, cw, 3.45, { fill: C.goldTint });
  addText(slide, '名前が似ているが別物：ラテン超方格法（LHS）', rx + 0.25, 1.72, cw - 0.5, 0.4, { fontSize: 15, bold: true, color: C.gold });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.gold } } });
  slide.addTable([
    [head(''), head('ラテン方格法'), head('ラテン超方格法')],
    [{ text: '目的', options: { bold: true } }, '局外因子を除いて処理を比べる', '入力空間を均等に埋める'],
    [{ text: '使う場面', options: { bold: true } }, '実験（日・装置のばらつき）', 'シミュレーション・計算機実験'],
    [{ text: '置き方', options: { bold: true } }, '各行・各列に各処理 1 回', '各変数の範囲を n 等分し各区間 1 点'],
  ], {
    x: rx + 0.25, y: 2.25, w: cw - 0.5, colW: [1.1, (cw - 1.6) / 2, (cw - 1.6) / 2],
    fontFace: FONT, fontSize: 12, color: C.ink, valign: 'middle', margin: [0.04, 0.08, 0.04, 0.08],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.38, 0.62, 0.62, 0.62], fill: { color: C.white },
  });
  addCard(slide, MARGIN_X, 5.35, CONTENT_W, 1.3, { fill: C.tint });
  addText(slide, [
    { text: '使いどころ：', bold: true, color: C.primary },
    { text: '「日」「装置」「ロット」「作業者」など、結果に効くが調べたいわけではない要因が 2 つあり、処理（条件）の数とそれらの水準数がそろうとき。3 つあればグレコ・ラテン方格' },
  ], MARGIN_X + 0.3, 5.35, CONTENT_W - 0.6, 1.3, { fontSize: 14, valign: 'middle' });
  addSource(slide, '出典：Montgomery（2019）4章、McKay, Beckman & Conover（1979）');
}

// =====================================================================
// 10. スクリーニングとは
// =====================================================================
{
  const slide = newContentSlide('3  スクリーニング実験計画', 'スクリーニング：多くの候補から、効く因子を少ない回数で見つける', [
    'ここからスクリーニング実験計画です。開発の初期には、効いているかもしれない因子の候補が10個以上あることがよくあります。',
    '全ての組み合わせを試すと、2水準でも11因子なら2048回必要です。そこで、効いている少数の因子を、少ない回数で見つけるのがスクリーニング実験です。',
    'スクリーニングが成り立つのは、経験的に知られた3つの原則があるからです。',
    '1つ目は効果のスパース性で、多くの候補のうち、実際に大きく効くのは少数だということです。',
    '2つ目は階層性で、主効果は2因子交互作用より大きく、2因子交互作用は3因子交互作用より大きいことが多い、ということです。',
    '3つ目は遺伝性で、交互作用が効くときは、その交互作用に関わる因子の主効果も効いていることが多い、ということです。',
    'これらの原則を前提に、交互作用の一部を諦めて、主効果を少ない回数で推定するのがスクリーニング計画です。',
  ]);
  // 左：候補から少数へ
  const lx = MARGIN_X;
  const factors = 'ABCDEFGHJKL'.split('');
  factors.forEach((f, i) => {
    const active = ['A', 'D', 'G'].includes(f);
    addNode(slide, lx + 0.35 + i * 0.5, 2.0, 0.42, active ? C.dopt : C.neutral, f, { fontSize: 13 });
  });
  addText(slide, '候補の因子 11 個（全組み合わせなら 2^11 ＝ 2048 回）', lx, 2.35, 6, 0.35, { fontSize: 12.5, color: C.muted });
  addLine(slide, lx + 2.9, 2.85, lx + 2.9, 3.55, { color: C.ink, width: 2, arrow: true });
  addCard(slide, lx + 1.0, 3.65, 3.8, 0.8, { fill: C.primary });
  addText(slide, 'スクリーニング実験（例：12 回）', lx + 1.0, 3.65, 3.8, 0.8, { fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle' });
  addLine(slide, lx + 2.9, 4.5, lx + 2.9, 5.2, { color: C.ink, width: 2, arrow: true });
  ['A', 'D', 'G'].forEach((f, i) => addNode(slide, lx + 2.4 + i * 0.5, 5.55, 0.46, C.dopt, f, { fontSize: 14 }));
  addText(slide, '効いている少数の因子 → 次の実験で詳しく調べる', lx, 5.95, 6, 0.35, { fontSize: 12.5, color: C.muted });

  const rx = 6.9;
  const rw = SLIDE_W - MARGIN_X - rx;
  const principles = [
    ['効果のスパース性', '大きく効く因子は、候補のうち少数'],
    ['階層性', '主効果 ＞ 2 因子交互作用 ＞ 3 因子交互作用'],
    ['遺伝性', '交互作用が効くなら、関わる因子の主効果も効いていることが多い'],
  ];
  addText(slide, 'スクリーニングを支える 3 つの原則', rx, 1.6, rw, 0.4, { fontSize: 15, bold: true, color: C.primary });
  principles.forEach(([t, d], i) => {
    addNumberedCard(slide, rx, 2.1 + i * 1.45, rw, 1.3, i + 1, t, d, { fill: C.gray, color: C.primary, descSize: 13.5 });
  });
  addSource(slide, '出典：Wu & Hamada（2009）、Box, Hunter & Hunter（2005）');
}

// =====================================================================
// 11. 2水準一部実施要因計画
// =====================================================================
{
  const frac = screening.frac7_4;
  const slide = newContentSlide('3  スクリーニング実験計画', '2 水準一部実施要因計画：交絡と分解能', [
    '最も基本的なスクリーニング計画が、2水準の一部実施要因計画です。',
    '左の表は、7つの因子を8回で調べる、2の7マイナス4乗計画です。A、B、Cの3因子で全ての組み合わせ8通りを作り、残りのDからGを、Dイコール AかけるB、のように、ABの交互作用の列に割り当てています。',
    'この割り当てを生成子と呼び、そこから定義関係 I イコール ABD イコール ACE…が決まります。',
    'その代わり、例えばDの主効果と、ABの交互作用は、同じ列になって区別できません。これを交絡、または別名関係と呼びます。この計画では、Aの主効果は、BD、CE、FGの交互作用と交絡しています。',
    '交絡の度合いを表すのが分解能です。分解能3では主効果と2因子交互作用が交絡、分解能4では主効果は2因子交互作用と交絡しないが2因子交互作用どうしは交絡、分解能5では主効果も2因子交互作用もそれぞれ区別できます。',
    'スクリーニングでは分解能3や4がよく使われます。交絡の相手を把握しておくことが、結果を正しく読むための前提です。',
  ]);
  drawSignGrid(slide, MARGIN_X + 0.35, 1.6, 0.62, 0.5, frac, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  addText(slide, '生成子：D＝AB、E＝AC、F＝BC、G＝ABC', MARGIN_X, 6.05, 4.8, 0.35, { fontSize: 13, bold: true, color: C.primary });
  addText(slide, '8 回で 7 因子（全組み合わせは 128 回）', MARGIN_X, 6.4, 4.8, 0.35, { fontSize: 12.5, color: C.muted });

  const rx = 5.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '定義関係（3 文字の語だけを抜粋）', rx, 1.6, rw, 0.35, { fontSize: 14.5, bold: true, color: C.primary });
  const fd = formulaSize('defining');
  addFormulaCard(slide, 'defining', rx, 2.0, rw, fd.h + 0.35, { alt: 'I = ABD = ACE = BCF = ABCG' });
  addText(slide, [
    { text: '交絡（別名）の例：', bold: true, color: C.dopt },
    { text: 'A ＝ BD ＝ CE ＝ FG（A の主効果は、これらの交互作用と区別できない）' },
  ], rx, 2.55 + fd.h, rw, 0.7, { fontSize: 13.5 });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  slide.addTable([
    [head('分解能'), head('交絡のようす'), head('用途')],
    [{ text: 'III', options: { bold: true, align: 'center' } }, '主効果と 2 因子交互作用が交絡', 'スクリーニング（交互作用は小さいと仮定）'],
    [{ text: 'IV', options: { bold: true, align: 'center' } }, '主効果は 2 因子交互作用と交絡しない。2 因子交互作用どうしは交絡', 'スクリーニング（主効果を確実に）'],
    [{ text: 'V', options: { bold: true, align: 'center' } }, '主効果・2 因子交互作用がそれぞれ区別できる', '特性把握・交互作用の推定'],
  ], {
    x: rx, y: 3.55 + fd.h, w: rw, colW: [1.0, 3.6, rw - 4.6],
    fontFace: FONT, fontSize: 12.5, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.38, 0.6, 0.75, 0.6],
  });
  addSource(slide, '出典：Box & Hunter（1961）、Montgomery（2019）8章');
}

// =====================================================================
// 12. Plackett–Burman
// =====================================================================
{
  const partial = pb.partial_alias_abs_corr.filter((v) => v > 0);
  const slide = newContentSlide('3  スクリーニング実験計画', 'Plackett–Burman 計画：4 の倍数の回数で最大 N−1 因子', [
    '一部実施要因計画は、実験回数が8、16、32と2のべき乗に限られます。その間を埋めるのが、PlackettとBurmanが1946年に提案した計画です。',
    '実験回数は4の倍数で、12回なら11因子、20回なら19因子まで調べられます。左の図は12回の計画で、全ての列が互いに直交しているので、主効果を独立に推定できます。',
    `一部実施要因計画との大きな違いは交絡のしかたです。2のべき乗の計画では、主効果と交互作用は完全に交絡するか、全く交絡しないかのどちらかです。`,
    `12回のPlackett–Burman計画では、主効果の列と2因子交互作用の列の相関が、プラスマイナス${fmt2(partial[0])}か0になります。これを部分交絡と呼びます。1つの交互作用の影響は薄まりますが、多くの主効果に少しずつ混ざります。`,
    '交互作用が小さいことを前提に、多くの因子の主効果を少ない回数で調べたいときに向いています。',
  ]);
  const cellW = 0.43;
  const cellH = 0.36;
  drawSignGrid(slide, MARGIN_X + 0.35, 1.6, cellW, cellH, pb.design, pb.factors, { fontSize: 10 });
  addText(slide, '12 回・11 因子（濃い色 ＝ 高水準 +、薄い色 ＝ 低水準 −）', MARGIN_X, 6.35, 5.4, 0.35, { fontSize: 12, color: C.muted });

  const rx = 6.35;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    '実験回数は 4 の倍数（12・20・24…）。2 のべき乗の間を埋める',
    '全列が直交：主効果を独立に推定できる',
    `部分交絡：主効果と 2 因子交互作用の相関が ±${fmt2(partial[0])} または 0（12 回の場合）`,
  ], rx, 1.65, rw, 2.5, { fontSize: 14.5, space: 10 });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  slide.addTable([
    [head(''), head('一部実施要因計画'), head('Plackett–Burman')],
    [{ text: '実験回数', options: { bold: true } }, '8・16・32…（2 のべき乗）', '12・20・24…（4 の倍数）'],
    [{ text: '交絡', options: { bold: true } }, '完全に交絡するか、しないか', '部分交絡（薄く広く混ざる）'],
    [{ text: '向く場面', options: { bold: true } }, '交絡の相手を明確にしたい', '回数を細かく決めたい'],
  ], {
    x: rx, y: 4.3, w: rw, colW: [1.2, (rw - 1.2) / 2, (rw - 1.2) / 2],
    fontFace: FONT, fontSize: 12.5, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.52,
  });
  addSource(slide, '出典：Plackett & Burman（1946）。相関はデモで 12 回計画から計算');
}

// =====================================================================
// 13. 確定的スクリーニング計画
// =====================================================================
{
  const corr = dsd.corr;
  const slide = newContentSlide('3  スクリーニング実験計画', '確定的スクリーニング計画（DSD）：3 水準で曲がりも見つける', [
    '確定的スクリーニング計画は、JonesとNachtsheimが2011年に提案した、比較的新しい3水準のスクリーニング計画です。',
    '作り方は、会議行列と呼ばれる行列Cと、その符号を反転したマイナスC、そして中心点1つを縦に並べるだけです。m個の因子に対して、2m足す1回の実験になります。',
    '左の表は4因子9回の例です。各行に0が1つずつあり、3水準になっています。',
    'デモで相関を計算すると、主効果どうし、主効果と2因子交互作用、主効果と2次の項の相関は全て0でした。つまり、主効果は交互作用や曲がりの影響を受けずに推定できます。',
    `一方、2因子交互作用どうしは最大${fmt2(corr.fi_fi)}の相関があり、全ての交互作用を同時に推定することはできません。`,
    '2水準の計画では、応答の曲がり、つまり2次の効果を見つけられませんが、確定的スクリーニング計画では見つけられるのが大きな利点です。',
  ]);
  drawSignGrid(slide, MARGIN_X + 0.35, 1.6, 0.7, 0.44, dsd.design, ['x1', 'x2', 'x3', 'x4'], { fontSize: 11 });
  // 構造 [C; −C; 0]
  const bx = MARGIN_X + 3.4;
  const blocks = [['C（会議行列）', 1.92 - 0.02, 1.76], ['−C（符号反転）', 3.68, 1.76], ['中心点', 5.44, 0.44]];
  blocks.forEach(([t, y, h]) => {
    addCard(slide, bx, y, 1.55, h - 0.04, { fill: C.goldTint, line: C.gold });
    addText(slide, t, bx, y, 1.55, h - 0.04, { fontSize: 12, bold: true, color: C.gold, align: 'center', valign: 'middle' });
  });
  addText(slide, 'm 因子 → 2m＋1 回', MARGIN_X, 6.1, 5, 0.35, { fontSize: 13.5, bold: true, color: C.primary });

  const rx = 5.9;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, 'デモで計算した相関（絶対値の最大）', rx, 1.6, rw, 0.35, { fontSize: 14.5, bold: true, color: C.primary });
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  const fmtC = (v) => (Math.abs(v) < 1e-9 ? '0' : fmt2(v));
  slide.addTable([
    [head('組み合わせ'), head('相関'), head('意味')],
    ['主効果 ↔ 主効果', fmtC(corr.main_main), '互いに独立に推定できる'],
    ['主効果 ↔ 2 因子交互作用', fmtC(corr.main_2fi), '交互作用に惑わされない'],
    ['主効果 ↔ 2 次の項', fmtC(corr.main_quad), '曲がりに惑わされない'],
    ['2 因子交互作用どうし', fmtC(corr.fi_fi), '全部は同時に推定できない'],
  ].map((row, i) => (i === 0 ? row : row.map((c, j) => ({ text: c, options: { align: j === 1 ? 'center' : 'left', bold: j === 1, color: j === 1 && c !== '0' ? C.dopt : C.ink } })))), {
    x: rx, y: 2.0, w: rw, colW: [2.6, 0.9, rw - 3.5],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.45,
  });
  addBullets(slide, [
    '3 水準なので、応答の曲がり（2 次の効果）も検出できる',
    '効く因子が少数（目安 3 つ以下）なら、同じデータで 2 次モデルまで当てはめられることも',
  ], rx, 4.5, rw, 1.6, { fontSize: 14, space: 9 });
  addSource(slide, '出典：Jones & Nachtsheim（2011）。相関はデモの 4 因子・9 回計画から計算');
}

// =====================================================================
// 14. デモ：PB12 スクリーニング
// =====================================================================
{
  const order = pb.effects.map((e, i) => ({ f: pb.factors[i], e })).sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
  const labels = order.map((o) => o.f);
  const slide = newContentSlide('3  スクリーニング実験計画', 'デモ：Plackett–Burman 12 回で 11 因子をふるい分ける', [
    `12回のPlackett–Burman計画で、11因子のうち、A、D、Gの3つだけが効く合成データを作りました。真の効果は、Aが${fmt1(pb.true_effects.A)}、Dがマイナス${fmt1(-pb.true_effects.D)}、Gが${fmt1(pb.true_effects.G)}、誤差の標準偏差は${pb.noise_sd}です。`,
    '各因子の効果は、高水準の平均から低水準の平均を引いた値です。グラフは、効果の絶対値を大きい順に並べたものです。',
    '反復がないので、誤差の大きさを直接は見積もれません。そこで、Lenthの方法を使います。効果の大部分はゼロに近いという、スパース性を利用して、小さい効果のばらつきから擬似標準誤差、PSEを計算します。',
    `PSEは${fmt2(pb.pse)}で、個別の判定限界MEは${fmt2(pb.me)}でした。これを超えたのは、${pb.active_me.join('、')}で、真に効く3因子をちょうど見つけられました。`,
    `11因子を同時に判定するときの厳しめの限界SMEは${fmt2(pb.sme)}で、これを超えたのは${pb.active_sme.join('、')}だけです。スクリーニングの段階では、見逃しを避けるため、MEを目安に候補を残すことが多いです。`,
  ]);
  slide.addChart([
    { type: pres.charts.BAR, data: [{ name: '|効果|', labels, values: order.map((o) => Math.abs(o.e)) }], options: { chartColors: [C.primary], barGapWidthPct: 40 } },
    { type: pres.charts.LINE, data: [{ name: `ME（${fmt2(pb.me)}）`, labels, values: labels.map(() => pb.me) }], options: { chartColors: [C.dopt], lineSize: 2, lineDash: 'dash', lineDataSymbol: 'none' } },
    { type: pres.charts.LINE, data: [{ name: `SME（${fmt2(pb.sme)}）`, labels, values: labels.map(() => pb.sme) }], options: { chartColors: [C.gold], lineSize: 2, lineDash: 'dash', lineDataSymbol: 'none' } },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.4, h: 5.2, ...chartBase(), barDir: 'col',
    showTitle: true, title: '推定した効果の絶対値（大きい順）と判定限界',
    valAxisMinVal: 0, valAxisMaxVal: 4.5, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: '0.0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary }, align: 'center' } });
  slide.addTable([
    [head('因子'), head('真の効果'), head('推定値')],
    ...['A', 'D', 'G'].map((f) => [
      { text: f, options: { align: 'center', bold: true, color: C.dopt } },
      { text: fmt1(pb.true_effects[f]), options: { align: 'center' } },
      { text: fmt2(pb.effects[pb.factors.indexOf(f)]), options: { align: 'center', bold: true } },
    ]),
  ], {
    x: rx, y: 1.65, w: rw, colW: [1.2, 1.6, rw - 2.8],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.04, 0.08, 0.04, 0.08],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.42,
  });
  addText(slide, 'Lenth の擬似標準誤差（c：推定した効果）', rx, 3.6, rw, 0.35, { fontSize: 13, bold: true, color: C.primary });
  const fl1 = formulaSize('lenth_pse', 0.9);
  addFormula(slide, 'lenth_pse', rx, 4.0, { scale: 0.9, alt: 'PSE = 1.5 median{|c_j| : |c_j| < 2.5 s0}' });
  const fl2 = formulaSize('lenth_s0', 0.9);
  addFormula(slide, 'lenth_s0', rx, 4.05 + fl1.h, { scale: 0.9, alt: 's0 = 1.5 median|c_j|' });
  const fl = { h: fl1.h + fl2.h + 0.05 };
  addBullets(slide, [
    `ME（${fmt2(pb.me)}）を超えた：${pb.active_me.join('・')}`,
    `SME（${fmt2(pb.sme)}、11 因子同時）を超えた：${pb.active_sme.join('・')}`,
    '反復がなくても、スパース性を使って誤差を見積もれる',
  ], rx, 4.2 + fl.h, rw, 2.2, { fontSize: 13.5, space: 7 });
  addSource(slide, `合成データ：真に効くのは A・D・G だけ、誤差の標準偏差 ${pb.noise_sd}。効果 ＝ 高水準の平均 − 低水準の平均。判定は Lenth（1989）の方法`);
}

// =====================================================================
// 15. スクリーニング計画の比較
// =====================================================================
{
  const slide = newContentSlide('3  スクリーニング実験計画', 'スクリーニング計画の比較（7 因子の場合）', [
    '7因子を調べる場合で、スクリーニング計画を比べます。',
    '分解能3の一部実施要因計画は8回と最も少ないですが、主効果と2因子交互作用が完全に交絡します。',
    '分解能4にすると16回になり、主効果は2因子交互作用と交絡しなくなります。分解能3の計画に、全ての符号を反転した計画を追加する、フォールドオーバーでも作れます。',
    'Plackett–Burman計画は12回で、部分交絡になります。',
    '確定的スクリーニング計画は15回で、主効果は交互作用とも2次の項とも独立に推定でき、曲がりも検出できます。',
    'どれを選ぶかは、実験回数の制約と、交互作用や曲がりがどれくらいありそうかで決めます。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  const rows = [
    ['一部実施要因（分解能 III）', '8', '2', '完全に交絡', '検出できない', '交互作用が小さいと確信できるとき'],
    ['一部実施要因（分解能 IV）', '16', '2', '交絡しない（2 因子交互作用どうしは交絡）', '中心点を足せば有無だけ', '主効果を確実に知りたいとき。III のフォールドオーバーでも作れる'],
    ['Plackett–Burman', '12', '2', '部分交絡（相関 ±1/3）', '検出できない', '因子が多く、回数を細かく決めたいとき'],
    ['確定的スクリーニング（DSD）', '15', '3', '交絡しない', '因子ごとに検出できる', '曲がりがありそう。効く因子が少なければ最適化まで'],
  ];
  slide.addTable([
    ['計画', '回数', '水準', '主効果と 2 因子交互作用', '曲がり（2 次の効果）', '向く場面'].map(head),
    ...rows.map((r) => r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? C.primary : C.ink, align: j === 1 || j === 2 ? 'center' : 'left' } }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [2.8, 0.8, 0.8, 2.75, 2.1, 2.883],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.05, 0.1, 0.05, 0.1],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.8, 0.95, 0.8, 0.95],
  });
  addCard(slide, MARGIN_X, 5.9, CONTENT_W, 0.8, { fill: C.tint });
  addText(slide, [{ text: '選び方の目安：', bold: true, color: C.primary }, { text: '回数の制約と、「交互作用・曲がりがどれくらいありそうか」で決める。迷ったら、主効果を交絡させない分解能 IV か DSD' }],
    MARGIN_X + 0.3, 5.9, CONTENT_W - 0.6, 0.8, { fontSize: 14, valign: 'middle' });
  addSource(slide, '出典：Montgomery（2019）、Jones & Nachtsheim（2011）。DSD は 7 因子で 2×7＋1 ＝ 15 回');
}

// =====================================================================
// 16. なぜ最適計画か
// =====================================================================
{
  const slide = newContentSlide('4  最適計画の考え方', 'なぜ最適計画か：古典的な計画が使いにくい場面', [
    'ここから最適計画です。これまでの要因計画や中心複合計画は、決まった形の表から選ぶ計画です。',
    'しかし実務では、その形がそのまま使えない場面がよくあります。',
    '1つ目は、実験できる領域に制約がある場合です。例えば、温度も時間も高くすると材料が焼けてしまうので、その組み合わせは実験できない、というような場合です。',
    '2つ目は、実験回数が予算や時間で決まっていて、表の回数と合わない場合です。',
    '3つ目は、2水準と3水準の因子や、カテゴリの因子が混ざっている場合です。',
    '4つ目は、2次の項の一部だけを入れたいなど、特殊なモデルを使いたい場合です。',
    '5つ目は、すでに取ったデータに、実験を追加したい場合です。',
    '最適計画は、モデルと実験領域と回数を決めると、ある基準で最も良い実験点の組を、計算機で探して作ります。',
  ]);
  const cases = [
    ['実験領域に制約がある', '例：高温かつ長時間は焼けるので実験できない'],
    ['実験回数が決まっている', '予算や時間で 11 回まで、など表の回数と合わない'],
    ['水準数・種類が混ざる', '2 水準・3 水準・カテゴリ因子（材料の種類など）'],
    ['特殊なモデルを使いたい', '2 次の項の一部だけ、特定の交互作用だけ、など'],
    ['既存データに追加したい', 'すでにある実験結果を活かして、足りない点だけ足す'],
  ];
  const cw = (CONTENT_W - 0.5) / 3;
  cases.forEach(([t, d], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN_X + col * (cw + 0.25);
    const y = 1.65 + row * 2.0;
    addNumberedCard(slide, x, y, cw, 1.75, i + 1, t, d, { fill: C.gray, color: C.primary, descSize: 13.5 });
  });
  const x6 = MARGIN_X + 2 * (cw + 0.25);
  addCard(slide, x6, 3.65, cw, 1.75, { fill: C.primary });
  addText(slide, [
    { text: '最適計画', bold: true, fontSize: 17, breakLine: true },
    { text: 'モデル・領域・回数を決めると、基準で最も良い実験点の組を計算機で探す', fontSize: 13.5 },
  ], x6 + 0.3, 3.65, cw - 0.6, 1.75, { color: C.white, valign: 'middle', paraSpaceAfter: 6 });
  addCard(slide, MARGIN_X, 5.75, CONTENT_W, 0.9, { fill: C.tint });
  addText(slide, [{ text: '最適計画に必要な入力：', bold: true, color: C.primary }, { text: '① モデル（どの項を推定するか）　② 実験領域（制約を含む）　③ 実験回数　④ 最適性の基準（D・I など）' }],
    MARGIN_X + 0.3, 5.75, CONTENT_W - 0.6, 0.9, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 17. 最適性規準の一覧
// =====================================================================
{
  const slide = newContentSlide('4  最適計画の考え方', '最適性の基準：情報行列 XᵀX をどう「大きく」するか', [
    '最適計画では、情報行列Xの転置Xを大きくしたいのですが、行列の大きさの測り方はいくつもあり、それぞれが最適性の基準になります。アルファベット1文字で呼ばれるので、アルファベット最適性とも言います。',
    'D最適は、情報行列の行列式を最大にします。係数の推定の精度を全体として高める基準で、最もよく使われます。',
    'A最適は、係数の分散の合計を最小にします。',
    'E最適は、最も精度の悪い方向の分散を小さくします。',
    'G最適は、実験領域の中で予測分散が最大になる点の値を最小にします。最悪の場所での予測を良くする基準です。',
    'I最適は、実験領域全体で平均した予測分散を最小にします。V最適とも呼ばれ、応答曲面で予測や最適条件探しをしたいときに向いています。',
    'このうち、特によく使われるのがD最適とI最適で、この後詳しく説明します。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  const rows = [
    ['D 最適', '|XᵀX| を最大化', '係数の同時信頼領域の体積を最小にする', '因子の効果を推定したい（スクリーニング・特性把握）', C.dopt, C.doptTint],
    ['A 最適', 'tr[(XᵀX)⁻¹] を最小化', '係数の分散の合計を最小にする', '各係数を平均的に精度よく', C.ink, C.white],
    ['E 最適', '(XᵀX) の最小固有値を最大化', '最も精度の悪い方向を改善する', '特定の方向の推定が悪くなるのを避けたい', C.ink, C.white],
    ['G 最適', '領域内の予測分散の最大値を最小化', '最悪の場所での予測を良くする', '領域のどこでも一定以上の予測精度がほしい', C.ink, C.white],
    ['I 最適（V 最適）', '領域で平均した予測分散を最小化', '領域全体の平均的な予測を良くする', '応答曲面で予測・最適条件を探したい', C.iopt, C.ioptTint],
  ];
  slide.addTable([
    ['基準', '何を最適化するか', '意味', '向く目的'].map(head),
    ...rows.map((r) => r.slice(0, 4).map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? r[4] : C.ink, fill: { color: r[5] } } }))),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [2.1, 3.3, 3.2, 3.533],
    fontFace: FONT, fontSize: 13.5, color: C.ink, valign: 'middle', margin: [0.05, 0.12, 0.05, 0.12],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.72, 0.62, 0.72, 0.72, 0.72],
  });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.72, { fill: C.gray });
  addText(slide, [{ text: '実務で主に使うのは D と I。', bold: true, color: C.primary }, { text: '「効果を推定したい」なら D、「予測したい・最適条件を探したい」なら I' }],
    MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.72, { fontSize: 14.5, valign: 'middle' });
  addSource(slide, '出典：Atkinson, Donev & Tobias（2007）、Goos & Jones（2011）');
}

// =====================================================================
// 18. D最適計画
// =====================================================================
{
  const sqD = sq.D;
  const slide = newContentSlide('5  D 最適計画と I 最適計画', 'D 最適計画：係数の信頼領域をいちばん小さくする', [
    'D最適計画は、情報行列の行列式を最大にする計画です。Dは行列式、Determinantの頭文字です。',
    '係数の推定値の同時信頼領域は、楕円体の形をしています。その体積は、情報行列の行列式の平方根に反比例します。つまり、行列式を最大にすることは、係数の信頼楕円体を最も小さくすることです。',
    '右の図のように、楕円が小さいほど、係数の値を狭い範囲に絞り込めます。',
    '2つの計画を比べるときは、D効率を使います。行列式の比をパラメータ数p分の1乗したもので、例えばD効率が0.9なら、同じ精度を得るのに約1.1倍の実験回数が必要、という目安になります。',
    'D最適計画には、実験領域の端、つまり境界に点を置きやすいという特徴があります。端の点ほど係数の推定に効くためです。',
    'また、因子の単位や尺度を変えても最適な計画が変わらない、という便利な性質もあります。',
  ]);
  const lw = 6.3;
  addCard(slide, MARGIN_X, 1.6, lw, 1.3, { fill: C.dopt });
  const fd = formulaSize('d_crit_white');
  addFormula(slide, 'd_crit_white', MARGIN_X + 0.35, 1.6 + (1.3 - fd.h) / 2, { alt: 'max |XᵀX|' });
  addText(slide, '情報行列の行列式（Determinant）を最大化', MARGIN_X + 0.6 + fd.w, 1.6, lw - fd.w - 0.8, 1.3, { fontSize: 15, bold: true, color: C.white, valign: 'middle' });
  addBullets(slide, [
    '係数の同時信頼楕円体の体積 ∝ 1 / √|XᵀX| → 行列式最大 ＝ 楕円体最小',
    '実験領域の境界（端）に点を置きやすい',
    '因子の単位・尺度を変えても最適な計画は変わらない',
  ], MARGIN_X, 3.15, lw, 2.1, { fontSize: 14.5, space: 10 });
  addText(slide, '2 つの計画の比較：D 効率（p：パラメータ数）', MARGIN_X, 5.2, lw, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const fe = formulaSize('d_eff', 0.85);
  addFormula(slide, 'd_eff', MARGIN_X + 0.2, 5.6, { scale: 0.85, alt: 'D_eff = (|X1ᵀX1| / |X2ᵀX2|)^(1/p)' });
  addText(slide, 'D 効率 0.9 ⇒ 同じ精度に約 1.1 倍の回数が必要', MARGIN_X + 0.4 + fe.w, 5.6, lw - fe.w - 0.4, fe.h, { fontSize: 12.5, color: C.muted, valign: 'middle' });

  // 右：信頼楕円のイメージ
  const rx = 7.4;
  const rw = SLIDE_W - MARGIN_X - rx;
  addText(slide, '係数 (β_{1}, β_{2}) の信頼領域のイメージ', rx, 1.6, rw, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const bx = rx + 0.2;
  const by = 2.1;
  const bw = rw - 0.4;
  const bh = 3.6;
  slide.addShape(pres.shapes.RECTANGLE, { x: bx, y: by, w: bw, h: bh, fill: { color: C.gray }, line: { color: C.line, width: 0.75 } });
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  addEllipse(slide, cx, cy, 2.1, 0.95, -30, { color: C.neutral });
  addEllipse(slide, cx, cy, 0.9, 0.55, -30, { color: C.dopt, fill: C.doptTint });
  addNode(slide, cx, cy, 0.14, C.ink, '');
  addText(slide, '|XᵀX| が小さい計画', bx + 0.1, by + 0.1, 2.6, 0.3, { fontSize: 12, bold: true, color: C.neutral });
  addText(slide, 'D 最適計画', cx + 0.55, cy + 0.35, 1.6, 0.3, { fontSize: 12.5, bold: true, color: C.dopt });
  addText(slide, '真の係数に近い値へ、狭く絞り込める', rx, 5.85, rw, 0.4, { fontSize: 13, color: C.muted, align: 'center' });
  addSource(slide, '出典：Kiefer & Wolfowitz（1960）、Atkinson, Donev & Tobias（2007）');
}

// =====================================================================
// 19. I最適計画
// =====================================================================
{
  const slide = newContentSlide('5  D 最適計画と I 最適計画', 'I 最適計画：領域全体の平均的な予測精度をいちばん良くする', [
    'I最適計画は、実験領域全体で平均した予測分散を最小にする計画です。Iは積分、Integratedの頭文字です。',
    '予測分散は、条件xでの予測値の分散で、計画行列から計算できます。これを実験領域R全体で積分して平均した値を最小にします。',
    'この平均は、モーメント行列Mを使うと、Xの転置Xの逆行列とMの積のトレースという形で簡単に計算できます。Mは、モデルの項の2乗や積を、領域全体で平均したものです。',
    '予測分散を比べるときは、実験回数nをかけた、尺度化予測分散、SPVをよく使います。回数の違う計画どうしを公平に比べるためです。',
    'I最適計画は、領域の中心付近にも点を置く傾向があります。中心付近の予測を良くすることが、領域全体の平均を下げるのに効くためです。',
    '応答曲面を作って、予測したり、最適な条件を探したりするのが目的なら、I最適計画が向いています。',
  ]);
  const lw = 7.2;
  addText(slide, 'I 最適の基準（R：実験領域、f(x)：モデルの項）', MARGIN_X, 1.6, lw, 0.35, { fontSize: 15, bold: true, color: C.iopt });
  const fi = formulaSize('i_crit', 0.95);
  addFormulaCard(slide, 'i_crit', MARGIN_X, 2.0, lw, fi.h + 0.4, { fill: C.ioptTint, scale: 0.95, alt: 'min (1/|R|)∫ f(x)ᵀ(XᵀX)⁻¹f(x) dx = tr[(XᵀX)⁻¹M]' });
  const my = 2.0 + fi.h + 0.6;
  addText(slide, 'モーメント行列（項の 2 乗・積の領域平均）', MARGIN_X, my, lw, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const fm = formulaSize('moment', 0.95);
  addFormula(slide, 'moment', MARGIN_X + 0.2, my + 0.4, { scale: 0.95, alt: 'M = (1/|R|)∫ f(x)f(x)ᵀ dx' });
  const sy = my + 0.6 + fm.h;
  addText(slide, '尺度化予測分散（回数 n の違う計画を公平に比べる）', MARGIN_X, sy, lw, 0.35, { fontSize: 14, bold: true, color: C.primary });
  addFormula(slide, 'spv', MARGIN_X + 0.2, sy + 0.4, { scale: 0.95, alt: 'SPV(x) = n f(x)ᵀ(XᵀX)⁻¹f(x)' });

  const rx = 8.2;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 4.0, { fill: C.gray });
  addText(slide, 'D 最適との違い', rx + 0.3, 1.75, rw - 0.6, 0.4, { fontSize: 16, bold: true, color: C.iopt });
  addBullets(slide, [
    'D：係数の精度 → I：予測の精度',
    'D は端に点を置きやすい。I は中心付近にも点を置く',
    '応答曲面で予測・最適条件を探すなら I',
    'I は実験領域 R の指定が結果に効く（制約も含めて正しく指定する）',
  ], rx + 0.3, 2.3, rw - 0.6, 3.2, { fontSize: 14, space: 12 });
  addSource(slide, '出典：Goos & Jones（2011）、Jones & Goos（2012）');
}

// =====================================================================
// 20. 探索アルゴリズム
// =====================================================================
{
  const slide = newContentSlide('5  D 最適計画と I 最適計画', '最適計画の作り方：点を 1 つずつ入れ替えて改善する', [
    '最適計画は、式で一度に解けるものではなく、計算機で探索して作ります。代表的な方法が交換法です。',
    'まず、実験できる点の候補を用意します。例えば、各因子をマイナス1から1まで0.1刻みにした格子の点です。制約がある場合は、制約を満たす点だけを候補にします。',
    '次に、候補からランダムに、実験回数分の点を選んで、初期の計画にします。',
    'そして、計画の点を1つずつ取り出し、候補のどの点と入れ替えると基準が最も良くなるかを調べて、良くなるなら入れ替えます。',
    '全ての点で入れ替えても改善しなくなったら終わりです。',
    'この方法は局所的な最適解で止まることがあるので、初期の計画を変えて何十回もくり返し、最も良い結果を採用します。今回のデモでは40回くり返しました。',
    '候補の格子を使わずに、座標を1つずつ動かす座標交換法もあり、MATLABのcordexch関数やJMPなどで使われています。',
  ]);
  const steps = [
    ['候補点を用意', `実験できる点の集合（デモ：0.1 刻みの格子、制約を満たす点だけ）`],
    ['初期計画を選ぶ', '候補から n 点をランダムに選ぶ'],
    ['1 点ずつ入れ替え', '計画の各点について、基準が最も良くなる候補点と交換'],
    ['改善がなければ終了', 'どの点を入れ替えても良くならなければ止める'],
    ['何度もくり返す', `初期計画を変えて数十回（デモ：${opt.n_starts} 回）行い、最良を採用`],
  ];
  const lw = 7.0;
  steps.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.0;
    addCard(slide, MARGIN_X, y, lw, 0.82, { fill: i === 4 ? C.tint : C.gray });
    addNode(slide, MARGIN_X + 0.42, y + 0.41, 0.46, C.primary, String(i + 1), { fontSize: 15 });
    addText(slide, t, MARGIN_X + 0.85, y + 0.05, 2.4, 0.72, { fontSize: 15, bold: true, valign: 'middle' });
    addText(slide, d, MARGIN_X + 3.2, y + 0.05, lw - 3.4, 0.72, { fontSize: 13, valign: 'middle' });
    if (i < 4) addLine(slide, MARGIN_X + 0.42, y + 0.84, MARGIN_X + 0.42, y + 0.98, { color: C.ink, width: 1.5, arrow: true });
  });
  const rx = 8.1;
  const rw = SLIDE_W - MARGIN_X - rx;
  addCard(slide, rx, 1.6, rw, 2.35, { fill: C.goldTint });
  addText(slide, '注意：局所解', rx + 0.25, 1.72, rw - 0.5, 0.35, { fontSize: 15, bold: true, color: C.gold });
  addText(slide, '1 点ずつの交換では、それ以上良くならない「局所的な最適」で止まることがある。初期計画を変えて何度も試すのが基本',
    rx + 0.25, 2.15, rw - 0.5, 1.7, { fontSize: 13.5 });
  addCard(slide, rx, 4.15, rw, 2.5, { fill: C.gray });
  addText(slide, '主な方法', rx + 0.25, 4.27, rw - 0.5, 0.35, { fontSize: 15, bold: true, color: C.primary });
  addBullets(slide, [
    '点交換法（Fedorov, 1972）：候補点と交換',
    '座標交換法（Meyer & Nachtsheim, 1995）：座標を 1 つずつ動かす。MATLAB cordexch・JMP など',
  ], rx + 0.25, 4.7, rw - 0.5, 1.9, { fontSize: 13, space: 8 });
}

// =====================================================================
// 21. デモ①：点配置の比較
// =====================================================================
{
  const slide = newContentSlide('5  D 最適計画と I 最適計画', `デモ①：2 因子・2 次モデル・${opt.n_runs} 回の D 最適と I 最適`, [
    `2つの因子x1、x2について、2次のモデル、つまり切片、1次の項2つ、交互作用、2乗の項2つの、6つの係数を持つモデルを考え、${opt.n_runs}回の実験の最適計画を作りました。`,
    'D最適計画は、4つの角と辺の中点付近に点を置き、角の点をくり返しています。中心は1点だけです。',
    'I最適計画は、角と辺の中点に1点ずつ、中心に4点を置きました。中心の点を増やすことで、領域の中心付近の予測を良くしています。',
    '実はこのI最適計画は、中心点を4つにした面心複合計画と全く同じでした。古典的な応答曲面計画が、予測の意味で最適だったことが分かります。',
    'D最適計画の辺の点は、ちょうど中点ではなく0.1だけずれた位置が最適でした。ただし、中点に置いてもD効率は99.8パーセントで、実務上の差はありません。',
  ]);
  const fq = formulaSize('quad_model', 0.9);
  addFormula(slide, 'quad_model', (SLIDE_W - fq.w) / 2, 1.5, { scale: 0.9, alt: 'y = β0 + β1x1 + β2x2 + β12x1x2 + β11x1² + β22x2² + ε' });
  const panelW = 3.4;
  const gap = (CONTENT_W - panelW * 3) / 2;
  const py = 2.55;
  const panels = [
    ['D 最適計画', sq.D.points, C.dopt, C.doptTint],
    ['I 最適計画', sq.I.points, C.iopt, C.ioptTint],
    ['面心複合計画（中心 4 点）', sq.CCD.points, C.primary, C.tint],
  ];
  panels.forEach(([t, pts, color, fill], i) => {
    const x = MARGIN_X + 0.3 + i * (panelW + gap);
    drawDesignPanel(slide, { x: x + 0.2, y: py, w: panelW - 0.9, h: panelW - 0.9 }, pts, color, { title: t, fill });
  });
  addText(slide, '「×2」「×4」は同じ点でのくり返し回数', MARGIN_X, 5.62, CONTENT_W, 0.3, { fontSize: 12, color: C.muted, align: 'center' });
  addCard(slide, MARGIN_X, 6.0, CONTENT_W, 0.7, { fill: C.gray });
  addText(slide, [
    { text: 'D：', bold: true, color: C.dopt }, { text: '角をくり返し、中心は 1 点。' },
    { text: '　I：', bold: true, color: C.iopt }, { text: '中心に 4 点。今回の I 最適計画は、中心 4 点の面心複合計画と一致した' },
  ], MARGIN_X + 0.3, 6.0, CONTENT_W - 0.6, 0.7, { fontSize: 14, valign: 'middle' });
}

// =====================================================================
// 22. デモ②：予測分散の比較
// =====================================================================
{
  // 横軸のラベルは 0.25 ごとだけ表示する
  const labels = sq.D.fds.fraction.map((f) => (Math.abs(f * 4 - Math.round(f * 4)) < 1e-9 ? fmt2(f) : ' '));
  const slide = newContentSlide('5  D 最適計画と I 最適計画', 'デモ②：推定の精度と予測の精度を比べる', [
    '2つの計画を、推定と予測の両面で比べます。',
    '左のグラフは、FDS図、Fraction of Design Space プロットです。実験領域の中の点での尺度化予測分散を小さい順に並べ、横軸に領域の割合をとったものです。曲線が低く平らなほど、領域の広い範囲で予測が良いことを表します。',
    `I最適計画の青い線は、領域の大部分でD最適計画より低くなっています。平均の予測分散は、I最適が${fmt2(sq.I.avg_spv)}、D最適が${fmt2(sq.D.avg_spv)}です。`,
    `一方、D効率で見ると、D最適を1としたとき、I最適は${fmt3(sq.I.d_eff)}です。係数の推定の精度ではD最適が勝ります。`,
    `領域内の最大の予測分散は、D最適が${fmt2(sq.D.max_spv)}、I最適が${fmt2(sq.I.max_spv)}で、大きな差はありません。予測分散が大きくなるのは領域の角で、I最適は角の点が少ない分、角での予測が少し悪くなります。`,
    'このように、どちらの計画も一方の意味で最適で、もう一方では少し劣ります。目的に合わせて選ぶことが大切です。',
  ]);
  slide.addChart([
    dashedLine('D 最適計画', labels, sq.D.fds.spv, C.dopt, 'solid', 5),
    dashedLine('I 最適計画（＝面心複合計画・中心 4 点）', labels, sq.I.fds.spv, C.iopt, 'solid', 5),
  ], {
    x: MARGIN_X, y: 1.55, w: 7.3, h: 5.2, ...chartBase(),
    showTitle: true, title: 'FDS 図：尺度化予測分散（SPV）を小さい順に並べたもの',
    showCatAxisTitle: true, catAxisTitle: '実験領域の割合', showValAxisTitle: true, valAxisTitle: 'SPV',
    catAxisLabelRotate: 0, valAxisMinVal: 0, valAxisMaxVal: 10, valAxisMajorUnit: 2, valAxisLabelFormatCode: '0',
    showLegend: true, legendPos: 'b',
  });
  const rx = 8.25;
  const rw = SLIDE_W - MARGIN_X - rx;
  const head = (t, color = C.primary) => ({ text: t, options: { bold: true, color: C.white, fill: { color }, align: 'center' } });
  slide.addTable([
    [head('指標'), head('D 最適', C.dopt), head('I 最適', C.iopt)],
    [{ text: 'D 効率（大が良）', options: { bold: true } }, { text: fmt3(sq.D.d_eff), options: { align: 'center', bold: true, color: C.dopt } }, { text: fmt3(sq.I.d_eff), options: { align: 'center' } }],
    [{ text: '平均 SPV（小が良）', options: { bold: true } }, { text: fmt2(sq.D.avg_spv), options: { align: 'center' } }, { text: fmt2(sq.I.avg_spv), options: { align: 'center', bold: true, color: C.iopt } }],
    [{ text: '最大 SPV（小が良）', options: { bold: true } }, { text: fmt2(sq.D.max_spv), options: { align: 'center' } }, { text: fmt2(sq.I.max_spv), options: { align: 'center' } }],
  ], {
    x: rx, y: 1.7, w: rw, colW: [2.25, (rw - 2.25) / 2, (rw - 2.25) / 2],
    fontFace: FONT, fontSize: 13, color: C.ink, valign: 'middle', margin: [0.04, 0.08, 0.04, 0.08],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: 0.5,
  });
  addBullets(slide, [
    'I 最適は、領域の大部分で予測分散が小さい（曲線が低い）',
    `D 最適は、係数の推定で勝る（I 最適の D 効率は ${fmt3(sq.I.d_eff)}）`,
    'どちらも一方で最適、もう一方で少し劣る → 目的で選ぶ',
  ], rx, 4.05, rw, 2.6, { fontSize: 13.5, space: 9 });
  addSource(slide, `SPV ＝ ${opt.n_runs} × f(x)ᵀ(XᵀX)⁻¹f(x)（誤差分散 1）。FDS 図は領域内の一様な 4000 点から計算（Zahran, Anderson-Cook & Myers, 2003）`);
}

// =====================================================================
// 23. デモ③：制約のある領域
// =====================================================================
{
  const slide = newContentSlide('5  D 最適計画と I 最適計画', `デモ③：制約のある領域（x1 ＋ x2 ≤ ${opt.constraint_sum}）での最適計画`, [
    `最適計画の本領は、制約のある領域で発揮されます。ここでは、x1とx2の和が${opt.constraint_sum}以下、という制約を加えました。例えば、温度と時間をどちらも高くすると材料が焼けてしまう、という状況です。`,
    '右上の角が切り取られた五角形が、実験できる領域です。面心複合計画は角の点がこの領域の外に出てしまうので、そのままでは使えません。',
    'D最適計画は、五角形の頂点や辺の上に点を置き、いくつかの頂点をくり返しています。中心付近には1点だけです。',
    'I最適計画は、頂点と辺に加えて、領域の中心付近に点を集めています。中心の位置も、制約に合わせて左下に寄っています。',
    '古典的な計画を無理に当てはめるより、モデルと領域を指定して最適計画を作るほうが、効率よく情報を得られます。',
  ]);
  const panelW = 3.3;
  const py = 2.1;
  const lx = MARGIN_X + 0.6;
  drawDesignPanel(slide, { x: lx, y: py, w: panelW, h: panelW }, con.D.points, C.dopt, { title: 'D 最適計画', constraint: opt.constraint_sum, fill: C.doptTint });
  drawDesignPanel(slide, { x: lx + panelW + 1.1, y: py, w: panelW, h: panelW }, con.I.points, C.iopt, { title: 'I 最適計画', constraint: opt.constraint_sum, fill: C.ioptTint });
  addText(slide, '色のついた五角形 ＝ 実験できる領域（右上の角は実験できない）', MARGIN_X, 5.95, 8.5, 0.35, { fontSize: 12.5, color: C.muted, align: 'center' });
  const rx = 9.6;
  const rw = SLIDE_W - MARGIN_X - rx;
  addBullets(slide, [
    '面心複合計画は角の点が領域外 → そのままでは使えない',
    'D：頂点・辺に置き、頂点をくり返す（中心付近は 1 点）',
    'I：中心付近にも集める（中心も制約に合わせて左下へ）',
    `平均 SPV：D ${fmt2(con.D.avg_spv)}、I ${fmt2(con.I.avg_spv)}`,
  ], rx, 1.7, rw, 4.3, { fontSize: 13.5, space: 12 });
  addSource(slide, `候補点は制約を満たす 0.1 刻みの格子点。${opt.n_runs} 回・2 次モデル。「×2」は同じ点でのくり返し回数`);
}

// =====================================================================
// 24. D最適とI最適の使い分け・注意点
// =====================================================================
{
  const slide = newContentSlide('5  D 最適計画と I 最適計画', 'D 最適と I 最適の使い分け、最適計画の注意点', [
    'D最適とI最適の使い分けと、最適計画全般の注意点をまとめます。',
    'D最適は、因子の効果を推定したい段階、つまりスクリーニングや特性把握に向いています。I最適は、応答曲面を作って予測したり、最適条件を探したりする段階に向いています。',
    '最適計画の最大の注意点は、モデルに依存することです。指定したモデルに対して最適なだけで、実際にはもっと複雑な関係、例えば3次の曲がりがあると、それを検出できないことがあります。',
    'そのため、モデルの係数の数ぎりぎりではなく、数回の余裕を持たせる、中心点などで反復を入れて誤差と当てはまりの悪さを確認できるようにする、といった工夫が必要です。',
    'また、計画ができたら、D効率やFDS図で、候補の計画と比べて確かめます。',
    'モデルに自信がないときは、候補になる項も考慮するベイズD最適計画や、複数のモデルを考慮する方法もあります。',
  ]);
  const cw = (CONTENT_W - 0.3) / 2;
  const specs = [
    ['D 最適計画', C.dopt, C.doptTint, ['目的：因子の効果（係数）を精度よく推定', '段階：スクリーニング・特性把握', '点の置き方：境界・角が多い']],
    ['I 最適計画', C.iopt, C.ioptTint, ['目的：領域全体で精度よく予測', '段階：応答曲面・最適条件の探索', '点の置き方：中心付近にも置く']],
  ];
  specs.forEach(([t, color, fill, items], i) => {
    const x = MARGIN_X + i * (cw + 0.3);
    addCard(slide, x, 1.6, cw, 2.2, { fill });
    addText(slide, t, x + 0.3, 1.72, cw - 0.6, 0.4, { fontSize: 17, bold: true, color });
    addBullets(slide, items, x + 0.3, 2.2, cw - 0.6, 1.5, { fontSize: 14, space: 6 });
  });
  addText(slide, '最適計画の注意点', MARGIN_X, 4.05, CONTENT_W, 0.35, { fontSize: 15, bold: true, color: C.primary });
  const cautions = [
    ['モデルに依存する', '指定したモデルに対して最適なだけ。想定外の曲がりや交互作用は検出できないことがある'],
    ['回数に余裕を持たせる', '係数の数ぎりぎりにせず数回足す。反復を入れて誤差・当てはまりの悪さを確認できるように'],
    ['計画を比べて確かめる', 'D 効率・FDS 図で候補の計画と比べる。モデルに自信がなければベイズ D 最適なども'],
  ];
  const w3 = (CONTENT_W - 0.5) / 3;
  cautions.forEach(([t, d], i) => {
    addNumberedCard(slide, MARGIN_X + i * (w3 + 0.25), 4.5, w3, 2.15, i + 1, t, d, { fill: C.gray, color: C.gold, descSize: 13 });
  });
}

// =====================================================================
// 25. 逐次実験の流れ
// =====================================================================
{
  const slide = newContentSlide('6  使い分けと実務', '実務の流れ：スクリーニング → 特性把握 → 最適化 → 確認', [
    '実務では、1回の大きな実験で全てを決めるのではなく、段階的に実験を進める、逐次実験が基本です。',
    '最初は、多くの候補から効く因子を絞るスクリーニングです。一部実施要因計画、Plackett–Burman計画、確定的スクリーニング計画を使います。局外因子がはっきりしていれば、ブロック化やラテン方格も組み合わせます。',
    '次に、絞った因子について、交互作用も含めて効き方を詳しく調べる特性把握です。分解能5以上の一部実施要因計画や要因計画、D最適計画を使います。',
    'そして、応答曲面を作って最適な条件を探す最適化です。中心複合計画やI最適計画を使います。',
    '最後に、見つけた条件で実際に実験し、予測どおりの結果が出るかを確かめる確認実験を必ず行います。',
    '前の段階のデータは、D最適計画などで実験を追加する形で、次の段階に活かせます。',
  ]);
  const stages = [
    ['スクリーニング', '効く因子を見つける', '一部実施要因（III・IV）\nPlackett–Burman\n確定的スクリーニング', '因子 10 個以上 → 3〜5 個'],
    ['特性把握', '効き方・交互作用を知る', '一部実施要因（V 以上）\n要因計画\nD 最適計画', '主効果・交互作用'],
    ['最適化', '最適な条件を探す', '中心複合計画\nI 最適計画\n（制約があれば最適計画）', '応答曲面・最適条件'],
    ['確認', '予測どおりか確かめる', '最適条件での\nくり返し実験', '予測区間に入るか'],
  ];
  const cw = 2.8;
  const gap = (CONTENT_W - cw * 4) / 3;
  stages.forEach(([t, purpose, designs, out], i) => {
    const x = MARGIN_X + i * (cw + gap);
    const colors = [C.primary, C.dopt, C.iopt, C.gold];
    addCard(slide, x, 1.65, cw, 0.8, { fill: colors[i], radius: 0.08 });
    addText(slide, t, x, 1.65, cw, 0.8, { fontSize: 18, bold: true, color: C.white, align: 'center', valign: 'middle' });
    if (i < 3) addLine(slide, x + cw + 0.05, 2.05, x + cw + gap - 0.05, 2.05, { color: C.ink, width: 2, arrow: true });
    addCard(slide, x, 2.65, cw, 3.2, { fill: C.gray });
    addText(slide, purpose, x + 0.2, 2.8, cw - 0.4, 0.4, { fontSize: 14, bold: true, color: colors[i] });
    addText(slide, '使う計画', x + 0.2, 3.3, cw - 0.4, 0.3, { fontSize: 11.5, color: C.muted });
    addText(slide, designs, x + 0.2, 3.62, cw - 0.4, 1.3, { fontSize: 13.5, lineSpacingMultiple: 1.1 });
    addText(slide, '得るもの', x + 0.2, 4.95, cw - 0.4, 0.3, { fontSize: 11.5, color: C.muted });
    addText(slide, out, x + 0.2, 5.25, cw - 0.4, 0.5, { fontSize: 13.5, bold: true });
  });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.65, { fill: C.tint });
  addText(slide, '局外因子（日・装置・ロット）があれば、どの段階でもブロック化・ラテン方格を組み合わせる。前の段階のデータは最適計画で追加して活かす',
    MARGIN_X + 0.3, 6.05, CONTENT_W - 0.6, 0.65, { fontSize: 13.5, valign: 'middle' });
}

// =====================================================================
// 26. 手法の選び方
// =====================================================================
{
  const slide = newContentSlide('6  使い分けと実務', '手法の選び方の目安', [
    '状況ごとに、どの計画を選ぶかの目安をまとめます。',
    '比べたい処理があって、日と装置のような局外因子が2つあるなら、ラテン方格法です。1つならブロック計画、3つならグレコ・ラテン方格です。',
    '候補の因子が多く、主効果を絞りたいなら、スクリーニング計画です。交互作用が小さいと言えるなら分解能3やPlackett–Burman、主効果を確実に知りたいなら分解能4、曲がりもありそうなら確定的スクリーニング計画です。',
    '因子が絞れていて、制約や回数の条件がない応答曲面なら、中心複合計画やボックス・ベーンケン計画が使えます。',
    '実験領域に制約がある、回数が決まっている、カテゴリの因子がある、既存データに追加したい、という場合は最適計画です。効果の推定が目的ならD最適、予測や最適条件探しが目的ならI最適を選びます。',
  ]);
  const head = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } });
  const rows = [
    ['処理を比べたい。局外因子が 2 つ（日・装置など）', 'ラテン方格法（1 つならブロック計画、3 つならグレコ・ラテン方格）', C.gold],
    ['候補が多い。交互作用は小さいと言える', '一部実施要因（分解能 III）・Plackett–Burman', C.primary],
    ['候補が多い。主効果を確実に知りたい', '一部実施要因（分解能 IV）', C.primary],
    ['候補が多い。曲がりもありそう', '確定的スクリーニング計画（DSD）', C.primary],
    ['因子が絞れた。制約なしで応答曲面', '中心複合計画・ボックス・ベーンケン計画（I 最適計画も有力）', C.iopt],
    ['制約・回数固定・カテゴリ因子・追加実験。効果を推定', 'D 最適計画', C.dopt],
    ['同上。予測・最適条件を探す', 'I 最適計画', C.iopt],
  ];
  slide.addTable([
    [head('状況'), head('推奨する計画')],
    ...rows.map((r) => [{ text: r[0] }, { text: r[1], options: { bold: true, color: r[2] } }]),
  ], {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, colW: [5.6, CONTENT_W - 5.6],
    fontFace: FONT, fontSize: 14, color: C.ink, valign: 'middle', margin: [0.05, 0.14, 0.05, 0.14],
    border: { type: 'solid', color: C.grid, pt: 0.75 }, rowH: [0.45, 0.62, 0.58, 0.58, 0.58, 0.62, 0.62, 0.58],
  });
  addText(slide, '迷ったら：目的（比較・ふるい分け・推定・予測）→ 制約の有無 → 回数、の順に決める', MARGIN_X, 6.35, CONTENT_W, 0.35, { fontSize: 13.5, bold: true, color: C.primary });
}

// =====================================================================
// 27. よくある落とし穴
// =====================================================================
{
  const slide = newContentSlide('6  使い分けと実務', 'よくある落とし穴', [
    '実務でよくある落とし穴を6つ挙げます。',
    '1つ目は、無作為化をしないことです。計画表の順番のまま実験すると、装置の経時変化などが特定の因子の効果に見えてしまいます。',
    '2つ目は、局外因子を無視することです。ラテン方格のデモで見たように、日や装置の変動が誤差に混ざり、効果を見逃します。',
    '3つ目は、交絡の読み違いです。一部実施要因計画で効いたと見えた主効果が、実は交絡している交互作用の効果かもしれません。',
    '4つ目は、水準の範囲の決め方です。狭すぎると効果が誤差に埋もれ、広すぎると実験できない条件や、モデルで表せない曲がりが入ります。',
    '5つ目は、最適計画のモデル依存を忘れることです。',
    '6つ目は、確認実験をしないことです。最適条件は予測にすぎないので、必ず実際に確かめます。',
  ]);
  const items = [
    ['無作為化しない', '計画表の順に実験すると、装置の経時変化などが因子の効果に見える'],
    ['局外因子を無視する', '日・装置の変動が誤差に混ざり、効果を見逃す（ラテン方格のデモ）'],
    ['交絡を読み違える', '効いて見えた主効果が、交絡した交互作用かもしれない。別名表を確認'],
    ['水準の範囲が不適切', '狭すぎると効果が埋もれ、広すぎると実験不能・想定外の曲がり'],
    ['最適計画を過信する', '指定したモデルに対して最適なだけ。回数の余裕と反復を持たせる'],
    ['確認実験をしない', '最適条件は予測にすぎない。実際に実験して予測区間に入るか確かめる'],
  ];
  const cw = (CONTENT_W - 0.5) / 3;
  const ch = 2.4;
  items.forEach(([title, desc], i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.25);
    const y = 1.6 + Math.floor(i / 3) * (ch + 0.25);
    addNumberedCard(slide, x, y, cw, ch, i + 1, title, desc, { fill: C.gray, color: C.primary, descSize: 14.5 });
  });
}

// =====================================================================
// 28. コード例
// =====================================================================
{
  const slide = newContentSlide('6  使い分けと実務', 'コード例：MATLAB と Python', [
    'コード例です。どちらも実際に動かして結果を確かめています。',
    'MATLABでは、fracfact関数で一部実施要因計画を、生成子を文字列で指定して作れます。cordexch関数は座標交換法でD最適計画を作ります。2因子、12回、2次モデルを指定すると、デモとほぼ同じ計画が得られ、行列式の対数は10.32でした。デモの計画は10.33で、D効率は99.8パーセントです。',
    'ラテン方格の分散分析はanovan関数でできます。',
    'Pythonでは、pyDOE3というライブラリで、Plackett–Burman計画や一部実施要因計画、ラテン超方格などを作れます。分散分析はstatsmodelsで行えます。',
    'なお、I最適計画は、MATLABやPythonの標準的な関数にはありません。JMPなどの専用ソフトを使うか、このデモのように交換法を自分で書く必要があります。',
  ]);
  const matlabCode = [
    '% 2^(7-4) 一部実施要因計画',
    "X = fracfact('a b c ab ac bc abc');",
    '',
    '% D最適計画：2因子・2次モデル・12回',
    "[dD, XD] = cordexch(2, 12, 'quadratic', ...",
    "                    'tries', 50);",
    "log(det(XD' * XD))   % → 10.320",
    '',
    '% ラテン方格の分散分析',
    "T = readtable('latin_square.csv');",
    'p = anovan(T.y, {T.row, T.col, T.trt}, ...',
    "    'display', 'off')  % 処理 p = 0.011",
  ].join('\n');
  const pythonCode = [
    'import pandas as pd',
    'import statsmodels.api as sm',
    'import statsmodels.formula.api as smf',
    'from pyDOE3 import pbdesign',
    '',
    'X = pbdesign(11)   # PB計画：12回・11因子',
    '',
    '# ラテン方格の分散分析',
    'df = pd.read_csv("latin_square.csv")',
    'fit = smf.ols("y ~ C(row) + C(col) + C(trt)",',
    '              data=df).fit()',
    'print(sm.stats.anova_lm(fit, typ=2))',
    '# → C(trt) の p = 0.011',
  ].join('\n');
  const cw = (CONTENT_W - 0.3) / 2;
  addCodeCard(slide, MARGIN_X, 1.5, cw, 4.4, 'MATLAB（Statistics and Machine Learning Toolbox）', matlabCode, { fontSize: 12.5 });
  addCodeCard(slide, MARGIN_X + cw + 0.3, 1.5, cw, 4.4, 'Python（pyDOE3・statsmodels）', pythonCode, { fontSize: 12.5 });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.7, { fill: C.goldTint });
  addText(slide, [
    { text: '注意：', bold: true, color: C.gold },
    { text: 'I 最適計画は MATLAB・Python の標準関数にはない。JMP などの専用ソフトを使うか、デモのように交換法を書く（生成元の demo_doe.py に実装あり）' },
  ], MARGIN_X + 0.3, 6.05, CONTENT_W - 0.6, 0.7, { fontSize: 13, valign: 'middle' });
  addSource(slide, 'MATLAB R2022b と Python（pyDOE3 1.6.2・statsmodels 0.15.0）で実行して結果を確認。データはデモのラテン方格（latin_square.csv）');
}

// =====================================================================
// 29. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.6, 6, 0.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle' });
  const at1 = latin.power.find((r) => r.d === 1);
  const points = [
    '計画行列 X を決めた時点で、推定・予測の精度が決まる。最適計画は情報行列 XᵀX を「大きく」する',
    `ラテン方格法は 2 つの局外因子を同時にブロック化する（デモ：検出力 ${pct0(at1.latin)}% 対 無視すると ${pct0(at1.oneway)}%）`,
    'スクリーニングは効果のスパース性を前提に、一部実施要因・PB・DSD で少数の効く因子を見つける',
    'D 最適は係数の推定、I 最適は領域全体の予測を良くする。制約・回数・カテゴリ因子があるときに強い',
    'スクリーニング → 特性把握 → 最適化 → 確認実験と、段階的に進める',
  ];
  points.forEach((p, i) => {
    const y = 1.65 + i * 1.02;
    addNode(slide, 1.15, y + 0.37, 0.56, C.primaryLight, String(i + 1), { fontSize: 18, color: C.night });
    addText(slide, p, 1.7, y, 8.0, 0.78, { fontSize: 15.5, color: C.white, valign: 'middle' });
  });
  drawLatinSquare(slide, 10.3, 2.3, 0.6, lsEx.square, { labels: false, fontSize: 15 });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.02, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '実験計画法では、計画行列を決めた時点で、推定や予測の精度が決まります。最適計画は、情報行列を大きくするように実験点を選びます。',
    'ラテン方格法は、日や装置などの2つの局外因子を同時にブロック化して、処理の比較から取り除く計画です。デモでは、局外因子を無視すると効果をほとんど見逃しました。',
    'スクリーニングは、効く因子は少数という原則を前提に、一部実施要因計画、Plackett–Burman計画、確定的スクリーニング計画で、少ない回数で効く因子を見つけます。',
    'D最適計画は係数の推定を、I最適計画は領域全体の予測を良くする計画で、制約や回数の条件があるときに特に役立ちます。',
    '実務では、スクリーニング、特性把握、最適化、確認実験と、段階的に進めることが大切です。',
  ].join('\n'));
}

// =====================================================================
// 30. 参考文献
// =====================================================================
{
  const slide = newContentSlide('REFERENCES', '参考文献', [
    '本資料で参照した主な文献です。',
    '実験計画法全体の教科書としては、Montgomeryの本や、Box、Hunter、Hunterの本が定番です。',
    '最適計画については、Goos と Jones の本が事例中心で読みやすく、理論はAtkinsonらの本が詳しいです。',
  ]);
  const refsLeft = [
    'Fisher, R. A. (1935). The Design of Experiments. Oliver & Boyd.',
    'Plackett, R. L., & Burman, J. P. (1946). The design of optimum multifactorial experiments. Biometrika, 33(4), 305–325.',
    'Kiefer, J., & Wolfowitz, J. (1960). The equivalence of two extremum problems. Canadian Journal of Mathematics, 12, 363–366.',
    'Box, G. E. P., & Hunter, J. S. (1961). The 2^(k−p) fractional factorial designs. Technometrics, 3(3), 311–351.',
    'Fedorov, V. V. (1972). Theory of Optimal Experiments. Academic Press.',
    'McKay, M. D., Beckman, R. J., & Conover, W. J. (1979). A comparison of three methods for selecting values of input variables in the analysis of output from a computer code. Technometrics, 21(2), 239–245.',
    'Lenth, R. V. (1989). Quick and easy analysis of unreplicated factorials. Technometrics, 31(4), 469–473.',
    'Meyer, R. K., & Nachtsheim, C. J. (1995). The coordinate-exchange algorithm for constructing exact optimal experimental designs. Technometrics, 37(1), 60–69.',
  ];
  const refsRight = [
    'Zahran, A., Anderson-Cook, C. M., & Myers, R. H. (2003). Fraction of design space to assess prediction capability of response surface designs. Journal of Quality Technology, 35(4), 377–386.',
    'Box, G. E. P., Hunter, J. S., & Hunter, W. G. (2005). Statistics for Experimenters (2nd ed.). Wiley.',
    'Atkinson, A. C., Donev, A. N., & Tobias, R. D. (2007). Optimum Experimental Designs, with SAS. Oxford University Press.',
    'Wu, C. F. J., & Hamada, M. S. (2009). Experiments: Planning, Analysis, and Optimization (2nd ed.). Wiley.',
    'Goos, P., & Jones, B. (2011). Optimal Design of Experiments: A Case Study Approach. Wiley.',
    'Jones, B., & Nachtsheim, C. J. (2011). A class of three-level designs for definitive screening in the presence of second-order effects. Journal of Quality Technology, 43(1), 1–15.',
    'Jones, B., & Goos, P. (2012). I-optimal versus D-optimal split-plot response surface designs. Journal of Quality Technology, 44(2), 85–101.',
    'Montgomery, D. C. (2019). Design and Analysis of Experiments (10th ed.). Wiley.',
  ];
  const cw = (CONTENT_W - 0.4) / 2;
  addBullets(slide, refsLeft, MARGIN_X, 1.5, cw, 5.4, { fontSize: 13, space: 9, indent: 12, color: C.ink });
  addBullets(slide, refsRight, MARGIN_X + cw + 0.4, 1.5, cw, 5.4, { fontSize: 13, space: 9, indent: 12, color: C.ink });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
