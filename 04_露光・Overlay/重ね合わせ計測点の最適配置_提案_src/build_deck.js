// 計測点の配置を補正式に合わせて最適化する：D最適・I最適による重ね合わせ計測サンプリングの提案
// 親資料「重ね合わせ精度とコストの両立」スライド14（②計測最適化・追加提案①）の詳細。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 数値は demo_results.json（demo_sampling_design.py の出力）から読む。文献の数値は各スライドに出典を示す。

const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const BASE_DIR = __dirname;
const OUTPUT_PATH = process.argv[2] || path.join(BASE_DIR, 'deck_raw.pptx');
const demo = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'demo_results.json'), 'utf8'));

// ---- 定数 ----
const SLIDE_W = 13.333;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const FONT = 'BIZ UDGothic';
const DECK_DATE = '2026年9月28日';
const TITLE_FONT_SIZE = 22;
const BODY_FONT_SIZE = 13;
const SOURCE_Y = 6.97;
const SHOT_HALF_W = 13;
const SHOT_HALF_H = 16.5;
const WAFER_RADIUS_MM = 150;
const SHOT_W_MM = 26;
const SHOT_H_MM = 33;

const C = {
  night: '16213E',
  nightCard: '223058',
  ink: '1C2230',
  muted: '5B6275',
  line: 'C9CED9',
  grid: 'E6E9F0',
  gray: 'F3F5F8',
  white: 'FFFFFF',
  onDark: 'E3E8F4',
  onDarkSub: 'AEB8D3',
  teal: '12877A',
  tealTint: 'DCF0ED',
  tealDark: '0B5E55',
  gold: 'C8962E',
  goldTint: 'F8EDD5',
  goldDark: '8A6414',
  bad: 'B8645A',
  badTint: 'F6E3E0',
  cmp1: 'C3C9D5',
  cmp2: '9AA3B5',
  cmp3: '5B6275',
  dopt: '6F7FA8',
};
// 配置ごとの色（どの図でも同じにする）
const DESIGN = {
  I: { label: 'I最適', color: C.teal },
  D: { label: 'D最適', color: C.dopt },
  grid: { label: 'Shot端を含む格子', color: C.cmp3 },
  stride: { label: '端が抜けた格子', color: C.bad },
  spread: { label: '散らばるように選ぶ', color: C.cmp2 },
  random: { label: 'ランダム（中央値）', color: C.cmp1 },
};
const HEAT_LOW = 'FBF6EA';
const HEAT_HIGH = '8A4B14';

// ---- 参考文献 ----
const REFERENCES = [
  { key: 'adel2007', short: 'Adel ほか（KLA, 2007）', text: 'Adel M. ほか（KLA ほか）, "The challenges of transitioning from linear to high-order overlay control in advanced lithography," Proc. SPIE 6827, 682722 (2007). doi:10.1117/12.778457' },
  { key: 'huang2009', short: 'Huang ほか（Nanya, 2009）', text: 'Huang C.-Y. ほか（Nanya ほか）, "Using Intra-Field High Order Correction to Achieve Overlay Requirement beyond Sub-40nm Node," Proc. SPIE 7272, 72720I (2009). doi:10.1117/12.813628' },
  { key: 'chiu2012', short: 'Chiu ほか（Nanya, 2012）', text: 'Chiu C.-F. ほか（Nanya ほか）, "Impacts of Overlay Correction Model and Metrology Sampling Scheme on Device Yield," Proc. SPIE 8324, 83241S (2012). doi:10.1117/12.916601' },
  { key: 'huang2012', short: 'Huang ほか（Nanya, 2012）', text: 'Huang C.-Y. ほか（Nanya ほか）, "Overlay control methodology comparison: field-by-field and high-order methods," Proc. SPIE 8324, 832427 (2012). doi:10.1117/12.916427' },
  { key: 'ullah2013', short: 'Ullah ほか（Micron, 2013）', text: 'Ullah M. Z. ほか（Micron ほか）, "An Investigation of High-Order Process Correction Models and Techniques to Improve Overlay Control by Using Multiple-Pass Cascading Analysis at an Advanced Technology Node," Proc. SPIE 8681, 86813A (2013). doi:10.1117/12.2011448' },
  { key: 'chen2018', short: 'Chen ほか（UMC, 2018）', text: 'Chen C. ほか（UMC ほか）, "Higher order intra-field alignment for intra-wafer lens and reticle heating control," Proc. SPIE 10585, 105851R (2018). doi:10.1117/12.2297358' },
  { key: 'duclaux2020', short: 'Duclaux ほか（ST, 2020）', text: 'Duclaux B. ほか（STMicroelectronics）, "Run to run and model variability of overlay high order process corrections for mean intrafield signatures," Proc. SPIE 11325, 113251K (2020). doi:10.1117/12.2551062' },
  { key: 'chang2022', short: 'Chang ほか（Macronix, 2022）', text: 'Chang L.-T. ほか（Macronix ほか）, "In device overlay control with multiple overlay metrology in 3D-NAND process," Proc. SPIE 12053, 120531P (2022). doi:10.1117/12.2613193' },
  { key: 'ehrlich2025', short: 'Ehrlich ほか（KLA, 2025）', text: 'Ehrlich C. ほか（KLA）, "Cherry-picking: Automated model term selection for precise overlay and CD process control," Proc. SPIE 13426, 134260U (2025). doi:10.1117/12.3051064' },
  { key: 'klein2026', short: 'Klein・Gutman（KLA, 2026）', text: 'Klein D., Gutman N.（KLA）, "Overlay metrology performance specification challenge entering the sub-nanometer overlay era," Proc. SPIE 13981, 139813L (2026). doi:10.1117/12.3090660' },
];
const REF = Object.fromEntries(REFERENCES.map((r) => [r.key, r]));
function cite(...keys) {
  keys.forEach((k) => { if (!REF[k]) throw new Error(`参考文献のキーがありません: ${k}`); });
  return `出典：${keys.map((k) => REF[k].short).join('、')}`;
}

// ---- デモの数値 ----
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);
const pct = (v) => `${Math.round(v * 100)}%`;
const INTRA = demo.intrafield.models;
const ASML = INTRA.ASML;
const CANON = INTRA.Canon;
const NIKON = INTRA.Nikon;
const curveAt = (model, n) => model.curve.find((c) => c.n === n);
const gridAt = (model, layout) => model.grid.find((g) => g.layout === layout).kappa;
const cutRatio = (nSame) => 1 - nSame / 77;
const WAFER = demo.wafer;
const WAFER_BASE = WAFER.curve.find((c) => c.n === WAFER.baseline_shots);
const waferKappaCut = 1 - WAFER_BASE.I / WAFER_BASE.spread;
const waferShotCut = 1 - WAFER.n_same_as_baseline / WAFER.baseline_shots;
const waferPointCut = 1 - WAFER.n_same_points / WAFER.baseline_points;
const CAND = demo.candidates.sets;
const ROB = demo.robustness;
const PRIOR = demo.prior;
const nikon28 = curveAt(NIKON, 28);
const nikonGrid28 = gridAt(NIKON, '4×7');
const perimeterWorse = CAND.perimeter.models.Nikon.curve.find((c) => c.n === 40).I / CAND.full.models.Nikon.curve.find((c) => c.n === 40).I - 1;
const perimeterWorseAsml = CAND.perimeter.models.ASML.curve.find((c) => c.n === 40).I / CAND.full.models.ASML.curve.find((c) => c.n === 40).I - 1;
const dieWorse = CAND.die_scribe.models.Nikon.curve.find((c) => c.n === 40).I / CAND.full.models.Nikon.curve.find((c) => c.n === 40).I - 1;
const maxOf = (arr) => Math.max(...arr);
// 総誤差で格子とI最適が入れ替わる計測ばらつき σ：取り残し_g^2 + σ^2κ_g^2 = 取り残し_i^2 + σ^2κ_i^2
function crossoverSigma(a, b) {
  const num = b.bias ** 2 - a.bias ** 2;
  const den = a.kappa ** 2 - b.kappa ** 2;
  return num > 0 && den > 0 ? Math.sqrt(num / den) : null;
}
const crossNikon = crossoverSigma(ROB.intrafield.Nikon.grid77, ROB.intrafield.Nikon.I77);
const crossAsml = crossoverSigma(ROB.intrafield.ASML.grid77, ROB.intrafield.ASML.I77);
const gridCutMin = Math.min(...[ASML, NIKON].map((m) => cutRatio(m.n_same_as_grid77)));
const gridCutMax = Math.max(...[ASML, CANON, NIKON].map((m) => cutRatio(m.n_same_as_grid77)));
const strideCutMin = Math.min(...[ASML, CANON, NIKON].map((m) => cutRatio(m.n_same_as_stride77)));
const strideCutMax = Math.max(...[ASML, CANON, NIKON].map((m) => cutRatio(m.n_same_as_stride77)));

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '計測点の配置を補正式に合わせて最適化する：D最適・I最適による重ね合わせ計測サンプリングの提案';
pres.lang = 'ja-JP';
let pageNumber = 0;

// ---- 文字の補助関数 ----
function parseRich(text, baseOptions = {}) {
  const runs = [];
  const pattern = /([_^])\{([^}]*)\}/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), options: { ...baseOptions } });
    const script = match[1] === '_' ? { subscript: true } : { superscript: true };
    runs.push({ text: match[2], options: { ...baseOptions, ...script } });
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), options: { ...baseOptions } });
  return runs;
}

function toRuns(item, baseOptions = {}) {
  if (typeof item === 'string') return parseRich(item, baseOptions);
  if (Array.isArray(item)) return item.flatMap((part) => toRuns(part, baseOptions));
  const { text, breakLine, ...rest } = item;
  const runs = parseRich(text, { ...baseOptions, ...rest });
  if (breakLine && runs.length) runs[runs.length - 1].options.breakLine = true;
  return runs;
}

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
}

function addText(slide, content, x, y, w, h, options = {}) {
  let runs = content;
  if (typeof content === 'string') {
    runs = content.includes('\n') ? toRuns(withBreaks(content.split('\n'))) : toRuns(content);
  } else {
    runs = toRuns(content);
  }
  slide.addText(runs, {
    x, y, w, h,
    fontFace: FONT, fontSize: BODY_FONT_SIZE, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...options,
  });
}

function paragraphs(items, { bullet = true, space = 6, indent = 14, color, fontSize } = {}) {
  const runs = [];
  items.forEach((item, index) => {
    const base = {};
    if (color) base.color = color;
    if (fontSize) base.fontSize = fontSize;
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
    fontFace: FONT, fontSize: BODY_FONT_SIZE, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...textOptions,
  });
}

// ---- 図形の補助関数 ----
function addCard(slide, x, y, w, h, { fill = C.gray, line, radius = 0.08, dash, lineWidth = 1 } = {}) {
  const options = {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill },
    line: line ? { color: line, width: lineWidth } : { color: fill, width: 0.5 },
  };
  if (dash) options.line.dashType = dash;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, options);
}

function addRect(slide, x, y, w, h, { fill = C.gray, line, lineWidth = 0.75, transparency } = {}) {
  const fillOptions = { color: fill };
  if (transparency !== undefined) fillOptions.transparency = transparency;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: fillOptions, line: line ? { color: line, width: lineWidth } : { color: fill, width: 0.5 },
  });
}

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

function addNode(slide, cx, cy, diameter, fill, label, { color = C.white, fontSize = 13, lineColor } = {}) {
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

function addDot(slide, cx, cy, diameter, color, { lineColor } = {}) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - diameter / 2, y: cy - diameter / 2, w: diameter, h: diameter,
    fill: { color }, line: { color: lineColor || color, width: lineColor ? 0.75 : 0.5 },
  });
}

function addChip(slide, text, x, y, w, h, { fill = C.cmp3, color = C.white, fontSize = 10.5, bold = true, align = 'center', radius = 0.06 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: fill, width: 0.5 } });
  addText(slide, text, x + 0.03, y, w - 0.06, h, { fontSize, bold, color, align, valign: 'middle' });
}

// 点の列を折れ線で描く（塗りなしは fill を渡さず、<a:noFill/> を明示させる）
function drawPolyline(slide, pts, { color = C.ink, width = 2, dash } = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - x0, 0.01);
  const h = Math.max(Math.max(...ys) - y0, 0.01);
  const line = { color, width };
  if (dash) line.dashType = dash;
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: x0, y: y0, w, h, points: pts.map(([x, y]) => ({ x: x - x0, y: y - y0 })), line });
}

function drawPolygon(slide, pts, { fill, transparency = 0, line, lineWidth = 0.5 } = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - x0, 0.01);
  const h = Math.max(Math.max(...ys) - y0, 0.01);
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: x0, y: y0, w, h,
    points: [...pts.map(([x, y]) => ({ x: x - x0, y: y - y0 })), { close: true }],
    fill: { color: fill, transparency },
    line: line ? { color: line, width: lineWidth } : { color: fill, width: 0.25, transparency: 100 },
  });
}

// 数値の軸を持つ折れ線図（系列ごとに X 値が違ってよい。対数目盛りも可）
function drawXYChart(slide, box, opts) {
  const {
    xMin, xMax, yMin, yMax, xTicks, yTicks, xLog = false, xLabel, yLabel, series,
    xFmt = (v) => String(v), yFmt = (v) => v.toFixed(1),
  } = opts;
  const px = (v) => box.x + (xLog
    ? (Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin))
    : (v - xMin) / (xMax - xMin)) * box.w;
  const py = (v) => box.y + box.h - ((v - yMin) / (yMax - yMin)) * box.h;
  yTicks.forEach((v) => {
    addLine(slide, box.x, py(v), box.x + box.w, py(v), { color: C.grid, width: 0.75 });
    addText(slide, yFmt(v), box.x - 0.6, py(v) - 0.12, 0.52, 0.24, { fontSize: 10, color: C.muted, align: 'right', valign: 'middle' });
  });
  xTicks.forEach((v) => {
    addLine(slide, px(v), box.y + box.h, px(v), box.y + box.h + 0.05, { color: C.muted, width: 0.75 });
    addText(slide, xFmt(v), px(v) - 0.35, box.y + box.h + 0.08, 0.7, 0.22, { fontSize: 10, color: C.muted, align: 'center' });
  });
  addLine(slide, box.x, box.y + box.h, box.x + box.w, box.y + box.h, { color: C.muted, width: 1 });
  addLine(slide, box.x, box.y, box.x, box.y + box.h, { color: C.muted, width: 1 });
  if (xLabel) addText(slide, xLabel, box.x, box.y + box.h + 0.34, box.w, 0.26, { fontSize: 10.5, color: C.muted, align: 'center' });
  if (yLabel) addText(slide, yLabel, box.x - 0.6, box.y - 0.36, box.w + 0.6, 0.26, { fontSize: 10.5, color: C.muted });
  series.forEach((s) => {
    // 表示範囲の外の点は描かない（上端に張り付けると誤解を招くため）
    const pts = s.points.filter(([, y]) => y !== null && Number.isFinite(y) && y >= yMin - 1e-9 && y <= yMax + 1e-9).map(([x, y]) => [px(x), py(y)]);
    if (s.line !== false && pts.length > 1) drawPolyline(slide, pts, { color: s.color, width: s.width || 2, dash: s.dash });
    if (s.markers) pts.forEach(([x, y]) => addDot(slide, x, y, s.markerSize || 0.09, s.color, { lineColor: s.markerLine }));
  });
  return { px, py };
}

function addLegend(slide, items, x, y, { fontSize = 10.5, gap = 0.2 } = {}) {
  let cx = x;
  items.forEach((item) => {
    if (item.kind === 'box') addRect(slide, cx, y + 0.05, 0.22, 0.16, { fill: item.color, line: item.lineColor });
    else if (item.kind === 'dot') addDot(slide, cx + 0.11, y + 0.13, 0.13, item.color);
    else addLine(slide, cx, y + 0.13, cx + 0.3, y + 0.13, { color: item.color, width: 2.25, dash: item.dash });
    const width = item.width || 1.4;
    addText(slide, item.label, cx + 0.36, y, width, 0.26, { fontSize, color: C.ink, valign: 'middle' });
    cx += 0.36 + width + gap;
  });
}

function lerpColor(a, b, t) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [0, 2, 4].map((i) => parseInt(b.slice(i, i + 2), 16));
  const u = Math.min(Math.max(t, 0), 1);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * u).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ---- Shotの図 ----
// box：Shotの枠（インチ）。座標は mm（Shot中心が原点、上が +y）
function shotMapper(box) {
  return {
    toX: (mm) => box.x + ((mm + SHOT_HALF_W) / (2 * SHOT_HALF_W)) * box.w,
    toY: (mm) => box.y + ((SHOT_HALF_H - mm) / (2 * SHOT_HALF_H)) * box.h,
  };
}

function drawShotFrame(slide, box, { fill = C.white, line = C.muted } = {}) {
  addRect(slide, box.x, box.y, box.w, box.h, { fill, line, lineWidth: 1 });
}

function drawShotPoints(slide, box, points, { color = C.teal, size = 0.1 } = {}) {
  const { toX, toY } = shotMapper(box);
  points.forEach(([x, y]) => addDot(slide, toX(x), toY(y), size, color, { lineColor: C.white }));
}

// Shot内の予測のぶれ（27×34の評価点）を、2×2のまとまりの最大値で14×17のマスにして塗る
function drawShotHeatmap(slide, box, values, vmin, vmax) {
  const nx = demo.intrafield.eval_grid[0];
  const ny = demo.intrafield.eval_grid[1];
  const bx = Math.ceil(nx / 2);
  const by = Math.ceil(ny / 2);
  const cw = box.w / bx;
  const ch = box.h / by;
  for (let j = 0; j < by; j += 1) {
    for (let i = 0; i < bx; i += 1) {
      let v = -Infinity;
      for (let dj = 0; dj < 2; dj += 1) {
        for (let di = 0; di < 2; di += 1) {
          const ix = 2 * i + di;
          const iy = 2 * j + dj;
          if (ix < nx && iy < ny) v = Math.max(v, values[iy * nx + ix]);
        }
      }
      const t = (v - vmin) / (vmax - vmin);
      // 行 j は下（y = -16.5 mm）から数えるので、上から描く位置は by - 1 - j
      addRect(slide, box.x + i * cw, box.y + (by - 1 - j) * ch, cw + 0.004, ch + 0.004, { fill: lerpColor(HEAT_LOW, HEAT_HIGH, t) });
    }
  }
  addRect(slide, box.x, box.y, box.w, box.h, { fill: C.white, transparency: 100, line: C.muted, lineWidth: 1 });
}

function addHeatLegend(slide, x, y, w, vmin, vmax, label) {
  const steps = 6;
  for (let i = 0; i < steps; i += 1) addRect(slide, x + (i * w) / steps, y, w / steps, 0.16, { fill: lerpColor(HEAT_LOW, HEAT_HIGH, i / (steps - 1)), line: C.white });
  addText(slide, f2(vmin), x - 0.05, y + 0.18, 0.6, 0.22, { fontSize: 9.5, color: C.muted });
  addText(slide, f2(vmax), x + w - 0.55, y + 0.18, 0.6, 0.22, { fontSize: 9.5, color: C.muted, align: 'right' });
  if (label) addText(slide, label, x + 0.5, y + 0.18, w - 1.0, 0.22, { fontSize: 9.5, color: C.muted, align: 'center' });
}

// ---- ウェーハの図 ----
const CIRCLE_POLYGON = Array.from({ length: 180 }, (_, i) => {
  const a = (2 * Math.PI * i) / 180;
  return [WAFER_RADIUS_MM * Math.cos(a), WAFER_RADIUS_MM * Math.sin(a)];
});

function clipPolygon(subject, clip) {
  let output = subject;
  for (let i = 0; i < clip.length && output.length; i += 1) {
    const [ax, ay] = clip[i];
    const [bx, by] = clip[(i + 1) % clip.length];
    const inside = ([px, py]) => (bx - ax) * (py - ay) - (by - ay) * (px - ax) >= 0;
    const intersect = ([px, py], [qx, qy]) => {
      const a1 = by - ay; const b1 = ax - bx; const c1 = a1 * ax + b1 * ay;
      const a2 = qy - py; const b2 = px - qx; const c2 = a2 * px + b2 * py;
      const det = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    const input = output;
    output = [];
    input.forEach((cur, j) => {
      const prev = input[(j + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) output.push(intersect(prev, cur));
        output.push(cur);
      } else if (inside(prev)) {
        output.push(intersect(prev, cur));
      }
    });
  }
  return output;
}

function drawWafer(slide, cx, cy, radiusIn, shots, style) {
  const scale = radiusIn / WAFER_RADIUS_MM;
  const toSlide = ([x, y]) => [cx + x * scale, cy - y * scale];
  shots.forEach((shot, index) => {
    const x0 = shot.x - SHOT_W_MM / 2;
    const x1 = shot.x + SHOT_W_MM / 2;
    const y0 = shot.y - SHOT_H_MM / 2;
    const y1 = shot.y + SHOT_H_MM / 2;
    const clipped = clipPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], CIRCLE_POLYGON);
    if (clipped.length < 3) return;
    const s = style(shot, index);
    drawPolygon(slide, clipped.map(toSlide), { fill: s.fill, line: C.white, lineWidth: 0.75 });
  });
  slide.addShape(pres.shapes.OVAL, { x: cx - radiusIn, y: cy - radiusIn, w: radiusIn * 2, h: radiusIn * 2, line: { color: C.muted, width: 1.25 } });
  return { toSlide };
}

// ---- スライド共通 ----
function newContentSlide(kicker, title, notes) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  addDot(slide, MARGIN_X + 0.08, 0.5, 0.15, C.teal);
  addText(slide, kicker, MARGIN_X + 0.28, 0.35, 9.2, 0.3, { fontSize: 12, bold: true, color: C.teal, charSpacing: 1, valign: 'middle' });
  addChip(slide, '② 計測最適化｜追加提案①', RIGHT_EDGE - 2.75, 0.34, 2.75, 0.32, { fill: C.tealTint, color: C.tealDark, fontSize: 10.5 });
  addText(slide, title, MARGIN_X, 0.72, CONTENT_W, 0.62, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (notes) slide.addNotes(notes.join('\n'));
  return slide;
}

function addSource(slide, text, { y = SOURCE_Y, h = 0.42, fontSize = 8.5 } = {}) {
  addText(slide, text, MARGIN_X, y, 11.55, h, { fontSize, color: C.muted, valign: 'top' });
}

function addTableBox(slide, rows, x, y, w, colW, { rowH, fontSize = 11.5 } = {}) {
  slide.addTable(rows, {
    x, y, w, colW, rowH,
    fontFace: FONT, fontSize, color: C.ink, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line },
    margin: [0.04, 0.08, 0.04, 0.08],
  });
}

function cellRuns(text) {
  if (typeof text !== 'string') return text;
  return text.includes('\n') ? toRuns(withBreaks(text.split('\n'))) : toRuns(text);
}
function headCell(text, fill = C.cmp3, options = {}) {
  return { text: cellRuns(text), options: { bold: true, color: C.white, fill: { color: fill }, ...options } };
}
function bodyCell(text, options = {}) {
  return { text: cellRuns(text), options: { color: C.ink, ...options } };
}

// 番号つきの見出しカード
function addStepCard(slide, x, y, w, h, num, title, body, { color = C.teal, fill = C.gray, titleSize = 13.5, bodySize = 11.5 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addNode(slide, x + 0.32, y + 0.33, 0.4, color, String(num), { fontSize: 12 });
  addText(slide, title, x + 0.62, y + 0.12, w - 0.75, 0.44, { fontSize: titleSize, bold: true, valign: 'middle' });
  addText(slide, body, x + 0.22, y + 0.64, w - 0.42, h - 0.72, { fontSize: bodySize });
}

function gridPoints(nx, ny) {
  const pts = [];
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      pts.push([-SHOT_HALF_W + (2 * SHOT_HALF_W * i) / (nx - 1), -SHOT_HALF_H + (2 * SHOT_HALF_H * j) / (ny - 1)]);
    }
  }
  return pts;
}

function stridePoints() {
  const xs = Array.from({ length: 14 }, (_, i) => -SHOT_HALF_W + (2 * SHOT_HALF_W * i) / 13).filter((_, i) => i % 2 === 0);
  const ys = Array.from({ length: 22 }, (_, j) => -SHOT_HALF_H + (2 * SHOT_HALF_H * j) / 21).filter((_, j) => j % 2 === 0);
  return ys.flatMap((y) => xs.map((x) => [x, y]));
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'OVERLAY SAMPLING DESIGN', 0.8, 1.15, 7.8, 0.35, { fontSize: 13, bold: true, color: 'E7C878', charSpacing: 2 });
  addText(slide, '計測点の配置を、\n補正式に合わせて最適化する', 0.8, 1.55, 8.3, 1.6, { fontSize: 36, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, 'D最適・I最適による重ね合わせ計測サンプリングの提案', 0.8, 3.25, 8.0, 0.5, { fontSize: 19, color: C.onDark });
  addText(slide, '親資料「重ね合わせ精度とコストの両立」スライド14（②計測最適化・追加提案①「モデルに合わせた点の配置」）の詳細', 0.8, 3.85, 7.9, 0.72, { fontSize: 13, color: C.onDarkSub, lineSpacingMultiple: 1.1 });
  addChip(slide, '計測前に計算できる倍率κで、配置を採点・最適化する', 0.8, 4.85, 5.6, 0.42, { fill: C.nightCard, color: 'E7C878', fontSize: 13 });
  addText(slide, `${DECK_DATE}　｜　技術提案資料（合成データによる試算を含む）`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右：Shotの枠と、I最適の配置（Nikon式・28点）と格子
  const box = { x: 9.55, y: 1.25, w: 2.75, h: 2.75 * (SHOT_H_MM / SHOT_W_MM) };
  addRect(slide, box.x, box.y, box.w, box.h, { fill: C.nightCard, line: C.onDarkSub, lineWidth: 1.25 });
  const { toX, toY } = shotMapper(box);
  gridPoints(4, 7).forEach(([x, y]) => addDot(slide, toX(x), toY(y), 0.1, C.nightCard, { lineColor: C.onDarkSub }));
  NIKON.layouts['28'].I.forEach(([x, y]) => addDot(slide, toX(x), toY(y), 0.13, 'E7C878', { lineColor: C.night }));
  addText(slide, 'Nikon式・28点のI最適配置（金）と格子（白い輪）', 9.1, box.y + box.h + 0.1, 3.7, 0.5, { fontSize: 10.5, color: C.onDarkSub, align: 'center' });
  slide.addNotes([
    'この資料は、親資料「重ね合わせ精度とコストの両立」のスライド14、計測最適化の追加提案①「モデルに合わせた点の配置」を、詳しい提案にまとめたものです。',
    '提案の中身は、Shot内のマークの位置やウェーハ上のどのShotを測るかを、経験則ではなく、補正式から計算して決めることです。',
    '計算の基準には、ノイズが補正に乗る倍率κを使います。κは計測値を使わず、点の置き方と補正式だけで決まるので、計測する前に配置を採点し、最適化できます。',
    '数値は合成データでの試算です。以前のShot高次補正の検討と同じ条件で計算しており、以前の結果も再現できることを確かめています。',
    '右の図は、Nikon式で28点を置くときのI最適の配置（金色）と、等間隔の格子（白い輪）です。点の置き方だけで、ノイズの乗り方が変わります。',
  ].join('\n'));
}

// =====================================================================
// 2. 要旨
// =====================================================================
{
  const slide = newContentSlide('要旨', '要旨：計測点の置き方を計算で決め、同じ精度をより少ない点で得る', [
    '提案の要旨です。',
    '提案するのは、Shot内のマークの位置と、ウェーハ上で測るShotの選び方を、補正式から計算して決めることです。基準は、ノイズが補正に乗る倍率κで、計測する前に計算できます。',
    `合成データでは、Shot内で、Shot端を含む等間隔の格子77点と同じκを、ASML式は${ASML.n_same_as_grid77}点、Nikon式は${NIKON.n_same_as_grid77}点、Canon式は${CANON.n_same_as_grid77}点で得られました。端が抜けた格子のように偏った配置と比べると、点数を${pct(strideCutMin)}から${pct(strideCutMax)}減らせます。`,
    `ウェーハ面内では、同じ${WAFER.baseline_shots}Shotでκが${pct(waferKappaCut)}小さくなり、同じκなら${WAFER.n_same_as_baseline}Shotで足ります。`,
    'ただし正直に言うと、Shot端を含む等間隔の格子は、もともとかなり良い配置です。効果が大きいのは、点が少ないとき、置ける場所に制約があるとき、今の配置に偏りがあるとき、そしてウェーハ面内のShotの選び方です。',
    'やることは4段階で、今の配置のκの計算から始めます。この段階は計測データがいらないので、すぐに始められます。',
  ]);
  const lx = MARGIN_X;
  const lw = 6.4;
  addStepCard(slide, lx, 1.55, lw, 1.45, 1, '提案', 'Shot内のマーク位置と、ウェーハ上で測るShotを、補正式から計算して決める。基準は「ノイズが補正に乗る倍率κ」で、計測する前に計算できる。');
  addStepCard(slide, lx, 3.15, lw, 1.45, 2, 'なぜ今か', '高次の補正ほど点数が要り、置き方の影響も大きい。経験則では足りず、サンプリングの最適化が必須になる（KLA 2007）。計測器の仕様より効く（KLA 2026）。');
  addStepCard(slide, lx, 4.75, lw, 1.95, 3, 'やること', '①今の配置のκを計算（計測データ不要）→ ②制約つきで最適化 → ③過去データでR2Rシミュレーション → ④1層で試行。計算は1回数秒で、社内の環境（MATLAB・Python）で動く。');

  const rx = 7.25;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '効果（合成データでの試算）', rx, 1.55, rw, 0.32, { fontSize: 13, bold: true, color: C.tealDark });
  const tiles = [
    [`−${pct(gridCutMin)}〜−${pct(gridCutMax)}`, `Shot内の点数：Shot端を含む格子（77点）と同じκに必要な点数（ASML式${ASML.n_same_as_grid77}点・Nikon式${NIKON.n_same_as_grid77}点・Canon式${CANON.n_same_as_grid77}点）`],
    [`−${pct(strideCutMin)}〜−${pct(strideCutMax)}`, 'Shot内の点数：端が抜けた格子（77点）と同じκに必要な点数'],
    [`−${pct(waferShotCut)}`, `ウェーハ面内のShot数：散らばるように選んだ${WAFER.baseline_shots}Shotと同じκ（${WAFER.baseline_shots}→${WAFER.n_same_as_baseline}Shot）`],
  ];
  tiles.forEach(([big, text], i) => {
    const y = 1.95 + i * 1.18;
    addCard(slide, rx, y, rw, 1.06, { fill: C.tealTint });
    addText(slide, big, rx + 0.2, y + 0.06, 2.3, 0.94, { fontSize: 21, bold: true, color: C.tealDark, valign: 'middle' });
    addText(slide, text, rx + 2.45, y + 0.08, rw - 2.6, 0.92, { fontSize: 11, valign: 'middle' });
  });
  addCard(slide, rx, 5.55, rw, 1.15, { fill: C.goldTint });
  addText(slide, [
    { text: '正直な注意：', bold: true, color: C.goldDark },
    { text: 'Shot端を含む等間隔の格子は、もともと良い配置。効果が大きいのは、点が少ない・置ける場所に制約がある・今の配置に偏りがある場合と、ウェーハ面内のShot選び。' },
  ], rx + 0.2, 5.6, rw - 0.4, 1.05, { fontSize: 11.5, valign: 'middle' });
}

// =====================================================================
// 3. 背景
// =====================================================================
{
  const slide = newContentSlide('背景', '背景：高次の補正ほど点数が要り、点の置き方の影響も大きくなる', [
    '背景です。補正式の項を増やすと、同じ精度を保つのに必要な計測点も増えます。',
    'KLAの2026年の報告では、補正の精度は、おおむね計測の精度に、項数を点数で割った値の平方根をかけたものになるとしています。項数を2倍にすれば、同じ精度に必要な点数も2倍です。',
    `以前の検討でも、同じ77点で、線形は${f2(PRIOR.Linear.kappa)}、ASML式は${f2(PRIOR.ASML.kappa)}、Nikon式は${f2(PRIOR.Nikon.kappa)}と、項が増えるほどノイズが補正に乗る倍率が大きくなっていました。`,
    '一方で、点の置き方も補正の精度を左右します。KLAの2007年の論文は、高次の制御では経験則で点を選ぶのでは足りず、サンプリングの最適化が必須になると結論しています。',
    'STの2020年の報告では、ASMLのツールで、計測レイアウトの正規化モデル不確かさnMU、つまり計測のばらつきに対する補正のばらつきの比を計算し、レイアウトを最適化しています。nMUの高いマスクセットほど仕様外のロットが多かったとも報告しています。',
    'KLAの2026年の報告は、計測器の仕様を詰めるより、制御レシピの構成とサンプリングの最適化を優先すべきだとしています。',
  ]);
  // 左：目安の式と以前の検討のκ
  const lx = MARGIN_X;
  const lw = 5.6;
  addCard(slide, lx, 1.55, lw, 2.0, { fill: C.tealTint });
  addText(slide, '補正のぶれの目安', lx + 0.25, 1.65, lw - 0.5, 0.3, { fontSize: 12.5, bold: true, color: C.tealDark });
  addText(slide, '補正のぶれ ≈ 計測のばらつき × √（項数 ÷ 点数）', lx + 0.25, 2.02, lw - 0.5, 0.45, { fontSize: 16, bold: true, color: C.tealDark });
  addText(slide, '項数を2倍にすると、同じぶれに必要な点数も2倍になる。ただしこれは平均的な目安で、実際は点の置き方で変わる（→ κ）', lx + 0.25, 2.55, lw - 0.5, 0.9, { fontSize: 11.5 });
  addText(slide, '以前の検討：同じ77点（Shot端を含む7×11格子）でのκ', lx, 3.78, lw, 0.3, { fontSize: 12, bold: true });
  const bars = [['線形（6項）', PRIOR.Linear.kappa], ['ASML式（15項）', PRIOR.ASML.kappa], ['Nikon式（27項）', PRIOR.Nikon.kappa]];
  const maxBar = 0.45;
  bars.forEach(([name, v], i) => {
    const y = 4.2 + i * 0.52;
    addText(slide, name, lx, y, 1.75, 0.4, { fontSize: 11.5, valign: 'middle' });
    addRect(slide, lx + 1.8, y + 0.08, ((lw - 2.6) * v) / maxBar, 0.26, { fill: i === 0 ? C.cmp2 : C.teal });
    addText(slide, f2(v), lx + 1.85 + ((lw - 2.6) * v) / maxBar, y, 0.6, 0.4, { fontSize: 11.5, bold: true, valign: 'middle' });
  });
  addText(slide, '項が増えるほど、ノイズが補正に乗る倍率κが大きくなる', lx, 5.8, lw, 0.3, { fontSize: 11, color: C.muted });
  // 右：文献の結論
  const rx = 6.55;
  const rw = RIGHT_EDGE - rx;
  const quotes = [
    ['KLA ほか（2007）', '線形の時代は経験則で点を選べたが、高次の制御ではサンプリングの最適化が必須になる。残差を下げるほど、必要な点数は急に増える'],
    ['ST（2020）', '計測レイアウトはShot内高次補正のばらつきに直接影響する。ASMLのTLOでnMU（σ_{model}÷σ_{measure}）を計算して配置を最適化した。nMUの高いマスクほど仕様外のロットが多かった'],
    ['KLA（2026）', '計測器の仕様を詰めるより、制御レシピの構成とサンプリングの最適化を優先すべき。計測誤差が補正に伝わる量は、サンプリングとモデルから予測できる'],
  ];
  quotes.forEach(([head, body], i) => {
    const y = 1.55 + i * 1.72;
    addCard(slide, rx, y, rw, 1.58, { fill: C.gray });
    addText(slide, head, rx + 0.22, y + 0.1, rw - 0.44, 0.3, { fontSize: 12.5, bold: true, color: C.tealDark });
    addText(slide, body, rx + 0.22, y + 0.46, rw - 0.44, 1.08, { fontSize: 11.5 });
  });
  addSource(slide, cite('klein2026', 'adel2007', 'duclaux2020'));
}

// =====================================================================
// 4. 位置づけ
// =====================================================================
{
  const slide = newContentSlide('位置づけ', '位置づけ：親資料の追加提案①を、以前の検討につなげて具体化する', [
    'この提案の位置づけです。',
    '左は親資料のスライド14にある追加提案①で、D最適・I最適の考え方で、係数や予測のばらつきが最小になる点を選ぶというものでした。',
    '中央は、以前のShot高次補正の検討で分かっていたことです。補正誤差の2乗は、補正式で表せない取り残しの2乗と、計測のばらつきσの2乗にκの2乗をかけたものの和になります。κは点の配置と補正式だけで決まります。',
    `今回、以前と同じ条件でκを計算し直したところ、線形${f3(PRIOR.Linear.kappa)}、ASML式${f3(PRIOR.ASML.kappa)}、Nikon式${f3(PRIOR.Nikon.kappa)}となり、以前の値と0.00001未満の差で一致しました。`,
    '以前の検討では点数と正則化でκを下げることを考えましたが、今回は点の置き方でκを下げます。正則化と組み合わせることもできます。',
  ]);
  const cw = (CONTENT_W - 0.8) / 3;
  const y = 1.6;
  const h = 4.6;
  // 親資料
  addCard(slide, MARGIN_X, y, cw, h, { fill: C.gray });
  addText(slide, '親資料 スライド14 の追加提案①', MARGIN_X + 0.22, y + 0.12, cw - 0.44, 0.34, { fontSize: 12.5, bold: true, color: C.muted });
  addText(slide, 'モデルに合わせた点の配置', MARGIN_X + 0.22, y + 0.52, cw - 0.44, 0.36, { fontSize: 14, bold: true });
  addText(slide, 'D最適・I最適の考え方で、係数や予測のばらつきが最小になる点を選ぶ。最適化した50点で全面960点とほぼ同じ補正ができ、計測時間26%減・歩留まり同等の報告がある。計測誤差が補正へ伝わる量は、配置とモデルから事前に計算できる。', MARGIN_X + 0.22, y + 0.98, cw - 0.44, 2.6, { fontSize: 11.5 });
  addText(slide, cite('chiu2012', 'klein2026'), MARGIN_X + 0.22, y + h - 0.5, cw - 0.44, 0.4, { fontSize: 8.5, color: C.muted, valign: 'bottom' });
  // 以前の検討
  const mx = MARGIN_X + cw + 0.4;
  addCard(slide, mx, y, cw, h, { fill: C.tealTint });
  addText(slide, '以前の検討（Shot高次補正の点数・ノイズ・正則化）', mx + 0.22, y + 0.12, cw - 0.44, 0.6, { fontSize: 12.5, bold: true, color: C.tealDark });
  addText(slide, '補正誤差^{2} ＝ 取り残し^{2} ＋ σ^{2}κ^{2}', mx + 0.22, y + 0.8, cw - 0.44, 0.4, { fontSize: 15, bold: true, color: C.tealDark });
  addBullets(slide, [
    'κ：ノイズが補正に乗る倍率。点の配置と補正式だけで決まる',
    `Shot端を含む7×11格子（77点）のκ：線形${f2(PRIOR.Linear.kappa)}・ASML式${f2(PRIOR.ASML.kappa)}・Nikon式${f2(PRIOR.Nikon.kappa)}`,
    '同じ77点でも、Shot端を含む配置の方がよい',
    'L2正則化で、必要な点数を減らせる',
  ], mx + 0.22, y + 1.35, cw - 0.44, 2.6, { fontSize: 11.5, space: 5 });
  addText(slide, `照合：今回の計算で以前のκを再現（差0.00001未満）`, mx + 0.22, y + h - 0.5, cw - 0.44, 0.4, { fontSize: 10.5, bold: true, color: C.tealDark, valign: 'bottom' });
  // 今回
  const rx = mx + cw + 0.4;
  addCard(slide, rx, y, cw, h, { fill: C.white, line: C.teal, lineWidth: 1.5 });
  addText(slide, '今回の提案', rx + 0.22, y + 0.12, cw - 0.44, 0.34, { fontSize: 12.5, bold: true, color: C.teal });
  addText(slide, 'κを「点の置き方」で下げる', rx + 0.22, y + 0.52, cw - 0.44, 0.36, { fontSize: 14, bold: true });
  addBullets(slide, [
    'Shot内：どの位置にマーク（ターゲット）を置き、どれを測るか',
    'ウェーハ面内：どのShotを測るか',
    '置ける場所・点数・必ず測る点などの制約の中で、κが最小になる配置を計算で選ぶ',
    '正則化（以前の検討）や、親資料の他の提案と組み合わせられる',
  ], rx + 0.22, y + 0.98, cw - 0.44, 3.0, { fontSize: 11.5, space: 5 });
  addLine(slide, MARGIN_X + cw + 0.04, y + h / 2, mx - 0.04, y + h / 2, { color: C.teal, width: 2, arrow: true });
  addLine(slide, mx + cw + 0.04, y + h / 2, rx - 0.04, y + h / 2, { color: C.teal, width: 2, arrow: true });
  addText(slide, '以前の検討：高次補正の回帰手法と、計測点数・計測ノイズ・L2正則化の評価（2026年9月）', MARGIN_X, 6.4, CONTENT_W, 0.3, { fontSize: 10, color: C.muted });
}

// =====================================================================
// 5. 基本①：1次元の例
// =====================================================================
function lineFitBand(points) {
  // 直線 y = a + b x の当てはめで、x での予測の分散（σ=1）と、[-1, 1] で平均したκ
  const n = points.length;
  const sx = points.reduce((a, x) => a + x, 0);
  const sxx = points.reduce((a, x) => a + x * x, 0);
  const det = n * sxx - sx * sx;
  const varAt = (x) => (sxx - 2 * sx * x + n * x * x) / det;
  const xs = Array.from({ length: 81 }, (_, i) => -1 + i / 40);
  const kappa = Math.sqrt(xs.reduce((a, x) => a + varAt(x), 0) / xs.length);
  return { varAt, xs, kappa };
}

{
  const slide = newContentSlide('基本①', '基本①：同じ4点でも、置き方で補正のぶれが変わる', [
    '基本の考え方を、1次元の簡単な例で説明します。4点を測って直線を当てはめる場面です。',
    '左は4点を中央に集めた場合、中央は等間隔に置いた場合、右は両端に寄せた場合です。帯は、計測のばらつきによって当てはめた直線がどれだけぶれるかを表しています。',
    '中央に集めると、傾きがほとんど決まらないので、両端で大きくぶれます。等間隔や両端に寄せると、ぶれは小さくなります。',
    '同じ4点でも、置き方で補正のぶれが何倍も変わるということです。ぶれの大きさは、点の位置と式だけで決まり、計測値にはよりません。',
    'ただし、両端に寄せる置き方は、式が正しい、つまり本当に直線であるという前提で最もよいものです。途中に曲がりがあると、両端だけでは気付けません。この点は後のスライドで扱います。',
  ]);
  const cases = [
    ['中央に集める', [-0.15, -0.05, 0.05, 0.15]],
    ['等間隔', [-1, -1 / 3, 1 / 3, 1]],
    ['両端に寄せる', [-1, -0.9, 0.9, 1]],
  ];
  const pw = 3.75;
  cases.forEach(([name, pts], k) => {
    const x0 = MARGIN_X + k * (pw + 0.44);
    const box = { x: x0 + 0.2, y: 2.05, w: pw - 0.35, h: 2.7 };
    addCard(slide, x0, 1.55, pw, 4.35, { fill: C.gray });
    addText(slide, name, x0 + 0.2, 1.62, pw - 0.4, 0.34, { fontSize: 13.5, bold: true, color: k === 0 ? C.bad : C.tealDark });
    const band = lineFitBand(pts);
    const yRange = 3.2;
    const toX = (v) => box.x + ((v + 1) / 2) * box.w;
    const toY = (v) => box.y + box.h / 2 - (Math.min(Math.max(v, -yRange), yRange) / yRange) * (box.h / 2);
    const upper = band.xs.map((x) => [toX(x), toY(0.3 * x + 2 * Math.sqrt(band.varAt(x)) * 0.6)]);
    const lower = band.xs.map((x) => [toX(x), toY(0.3 * x - 2 * Math.sqrt(band.varAt(x)) * 0.6)]);
    addRect(slide, box.x, box.y, box.w, box.h, { fill: C.white, line: C.line });
    drawPolygon(slide, [...upper, ...lower.reverse()], { fill: k === 0 ? C.badTint : C.tealTint });
    drawPolyline(slide, band.xs.map((x) => [toX(x), toY(0.3 * x)]), { color: C.ink, width: 1.5 });
    pts.forEach((x) => addDot(slide, toX(x), toY(0.3 * x), 0.14, k === 0 ? C.bad : C.teal, { lineColor: C.white }));
    addText(slide, `κ ＝ ${f2(band.kappa)}`, x0 + 0.2, 4.9, pw - 0.4, 0.42, { fontSize: 18, bold: true, color: k === 0 ? C.bad : C.tealDark, align: 'center' });
    addText(slide, '帯：計測のばらつきによる直線のぶれ（±2σ）', x0 + 0.2, 5.38, pw - 0.4, 0.42, { fontSize: 10, color: C.muted, align: 'center' });
  });
  addCard(slide, MARGIN_X, 6.05, CONTENT_W, 0.72, { fill: C.goldTint });
  addText(slide, [
    { text: '要点：', bold: true, color: C.goldDark },
    { text: 'ぶれは点の位置と式だけで決まり、計測値によらない。ただし「両端に寄せる」は式が正しい（直線である）前提で最良。途中の曲がりには気付けない（→ スライド16）。' },
  ], MARGIN_X + 0.25, 6.05, CONTENT_W - 0.5, 0.72, { fontSize: 12, valign: 'middle' });
}

// =====================================================================
// 6. 基本②：κ
// =====================================================================
{
  const slide = newContentSlide('基本②', '基本②：ノイズが補正に乗る倍率κは、計測する前に計算できる', [
    'この提案の基準である、ノイズが補正に乗る倍率κの説明です。',
    'κは、点の配置と補正式から、補正したときの予測のばらつきを計算し、評価したい範囲、たとえばShot全体で平均して、計測のばらつきσで割ったものです。X方向とY方向の式の平均を取ります。計測値は一切使いません。',
    'このため、今の配置の採点、候補の配置の比較、そして最適化の目的として使えます。補正誤差の2乗は、取り残しの2乗とσの2乗にκの2乗をかけたものの和なので、κが小さいほど、同じ計測のばらつきでも補正誤差が小さくなります。',
    '業界でも同じ考え方が使われています。STの報告にある、ASMLのツールのnMUは、補正のばらつきを計測のばらつきで割ったもので、κと同じ種類の量です。KLAの報告の、項数と点数の比の平方根という目安は、κを平均的に見積もったものです。κは、点の置き方まで含めて正確に計算したものと言えます。',
  ]);
  // 左：計算の流れ
  const steps = [
    ['点の配置', 'マークの位置（Shot内）\n測るShot（ウェーハ面内）'],
    ['補正式', 'メーカーの式の項\n（使っているkだけ）'],
    ['予測のばらつき', '面内の各点で、補正が\n計測ノイズでどれだけぶれるか'],
    ['κ', '面内で平均し、\n計測のばらつきσで割る'],
  ];
  steps.forEach(([h, b], i) => {
    const y = 1.6 + i * 1.12;
    const fill = i === 3 ? C.teal : C.tealTint;
    addCard(slide, MARGIN_X, y, 3.35, 0.95, { fill });
    addText(slide, h, MARGIN_X + 0.2, y + 0.06, 3.0, 0.34, { fontSize: 13.5, bold: true, color: i === 3 ? C.white : C.tealDark });
    addText(slide, b, MARGIN_X + 0.2, y + 0.4, 3.0, 0.52, { fontSize: 10.5, color: i === 3 ? C.white : C.ink });
    if (i < 3) addLine(slide, MARGIN_X + 1.68, y + 0.96, MARGIN_X + 1.68, y + 1.1, { color: C.teal, width: 2, arrow: true });
  });
  addText(slide, '計測値は使わない', MARGIN_X, 6.1, 3.35, 0.3, { fontSize: 12, bold: true, color: C.tealDark, align: 'center' });
  // 中央：式と使い方
  const mx = 4.3;
  const mw = 4.35;
  addCard(slide, mx, 1.6, mw, 1.9, { fill: C.gray });
  addText(slide, 'κの式', mx + 0.22, 1.7, mw - 0.44, 0.3, { fontSize: 12.5, bold: true, color: C.tealDark });
  addText(slide, 'κ^{2} ＝（面内で平均した予測の分散）÷ σ^{2}', mx + 0.22, 2.08, mw - 0.44, 0.4, { fontSize: 14, bold: true });
  addText(slide, 'X・Yの式でそれぞれ計算して平均する。以前の検討と同じ定義（評価点はShot内の約1 mm間隔の27×34点）', mx + 0.22, 2.55, mw - 0.44, 0.9, { fontSize: 11 });
  addText(slide, '使い方', mx, 3.7, mw, 0.3, { fontSize: 12.5, bold: true });
  addBullets(slide, [
    '今の配置を採点する（悪い配置を見つける）',
    '候補の配置を比べる（点数・場所・制約）',
    '最適化の目的にする（κが最小の配置を探す）',
    '補正誤差^{2} ＝ 取り残し^{2} ＋ σ^{2}κ^{2}：κが小さいほど、同じ計測のばらつきでも補正誤差が小さい',
  ], mx, 4.05, mw, 2.6, { fontSize: 11.5, space: 5 });
  // 右：業界の同じ考え方
  const rx = 9.0;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.6, rw, 2.35, { fill: C.goldTint });
  addText(slide, 'ASMLのTLO：nMU', rx + 0.2, 1.7, rw - 0.4, 0.3, { fontSize: 12.5, bold: true, color: C.goldDark });
  addText(slide, 'nMU ＝ σ_{model} ÷ σ_{measure}。計測レイアウトの採点に使い、Shot内高次補正のレイアウトを最適化した（ST 2020）。κと同じ種類の量', rx + 0.2, 2.05, rw - 0.4, 1.8, { fontSize: 11 });
  addCard(slide, rx, 4.1, rw, 2.35, { fill: C.goldTint });
  addText(slide, 'KLAの目安', rx + 0.2, 4.2, rw - 0.4, 0.3, { fontSize: 12.5, bold: true, color: C.goldDark });
  addText(slide, 'モデルの精度 ≈ 計測の精度 × √（項数 ÷ 点数）（KLA 2026）。κはこの目安を、点の置き方まで含めて正確にしたもの', rx + 0.2, 4.55, rw - 0.4, 1.8, { fontSize: 11 });
  addSource(slide, cite('duclaux2020', 'klein2026'));
}

// =====================================================================
// 7. 最適化の基準
// =====================================================================
{
  const a77 = curveAt(ASML, 77);
  const gridMax = maxOf(ASML.maps.grid77);
  const slide = newContentSlide('最適化の基準', '最適化の基準：補正に使うならI最適を基本に、最悪点をD最適で確かめる', [
    '最適化の基準にはいくつかの種類があります。',
    'D最適は、補正式の係数、つまりkパラメータの推定のばらつきをまとめて小さくする基準です。kの監視や比較に向いています。',
    'I最適は、面内で平均した補正のぶれ、つまりκを最小にする基準です。補正は面内のすべての点に効くので、補正に使うならI最適を基本にします。',
    'G最適は、面内で最も大きいぶれを最小にする基準です。外周など最悪の点を保証したいときに使います。理論上、D最適は最悪点のぶれも小さくなる性質があります。',
    `表の右端は、ASML式・77点での試算です。I最適はκが${f3(a77.I)}で最も小さく、D最適は最悪点が${f2(a77.D_max)}で最も小さくなりました。Shot端を含む格子は、κ${f3(ASML.grid77_kappa)}、最悪点${f2(gridMax)}です。`,
    'そこで、I最適で配置を作り、最悪点をD最適や格子と比べて確かめる、という使い方を提案します。',
  ]);
  const header = [headCell('基準', C.cmp3), headCell('何を小さくするか', C.cmp3), headCell('向いている用途', C.cmp3), headCell('試算：ASML式・77点', C.teal, { align: 'center' })];
  const rows = [
    [bodyCell('I最適', { bold: true, color: C.teal }), bodyCell('面内で平均した補正のぶれ（κ）'), bodyCell('補正（面内のすべての点に効く）→ 基本'), bodyCell(`κ ${f3(a77.I)}・最悪点 ${f2(a77.I_max)}`, { align: 'center', bold: true, fill: { color: C.tealTint } })],
    [bodyCell('D最適', { bold: true, color: C.dopt }), bodyCell('kパラメータの推定のばらつき（まとめて）'), bodyCell('kの監視・比較。最悪点のぶれも小さくなりやすい'), bodyCell(`κ ${f3(a77.D)}・最悪点 ${f2(a77.D_max)}`, { align: 'center' })],
    [bodyCell('G最適', { bold: true }), bodyCell('面内で最も大きい補正のぶれ'), bodyCell('外周など最悪点を保証したいとき'), bodyCell('D最適の最悪点で確認', { align: 'center', color: C.muted })],
    [bodyCell('経験則', { bold: true, color: C.cmp3 }), bodyCell('（なし）格子・散らばり'), bodyCell('簡単で、式によらない'), bodyCell(`格子：κ ${f3(ASML.grid77_kappa)}・最悪点 ${f2(gridMax)}`, { align: 'center' })],
  ];
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [1.4, 3.6, 4.1, 3.03], { rowH: [0.42, 0.72, 0.72, 0.72, 0.72], fontSize: 12 });
  addCard(slide, MARGIN_X, 5.2, CONTENT_W, 1.45, { fill: C.tealTint });
  addText(slide, '提案する使い方', MARGIN_X + 0.25, 5.28, 5, 0.3, { fontSize: 13, bold: true, color: C.tealDark });
  addBullets(slide, [
    'I最適で配置を作る（補正の平均的なぶれを最小にする）',
    '最悪点（κマップの最大値）をD最適・今の配置と比べて確かめ、外周などの要求に合うかを見る',
    'D最適・I最適の一般的な説明は、既存資料「実験計画法（最適計画・ラテン方格・スクリーニング）」のスライド16〜24',
  ], MARGIN_X + 0.25, 5.62, CONTENT_W - 0.5, 1.0, { fontSize: 11.5, space: 3 });
  addText(slide, '最悪点：Shot内の評価点での予測の標準偏差の最大値 ÷ σ', MARGIN_X, 6.72, CONTENT_W, 0.26, { fontSize: 9.5, color: C.muted });
}

// =====================================================================
// 8. 最適化の手順
// =====================================================================
{
  const slide = newContentSlide('手順', '最適化の手順：候補・補正式・制約を決め、点交換法でκを最小にする', [
    '最適化の手順です。5つのステップで進めます。',
    '1つ目は候補の場所です。レチクルや計測レシピから、置けるターゲットの一覧を作ります。ウェーハの外周は半径150ミリ未満に限り、品質の悪いターゲットは除きます。',
    '2つ目は補正式で、使っているメーカーの式と、実際に使っているkの項を決めます。ウェーハ面内の式の次数も決めます。',
    '3つ目は制約で、点数、Shotあたりの点数、必ず測る点、測定時間などです。',
    '4つ目が最適化で、点交換法を使います。配置の点を1つずつ、候補の中でκが最も小さくなる点に入れ替えることを、改善がなくなるまでくり返します。初期値を変えて何回か行い、最もよい結果を使います。',
    '5つ目は評価と採用で、κ、κのマップの最悪点、1点欠けたときの悪化、補正式にない形があるときの取り残しを見て、今の配置と比べます。',
    '計算は軽く、今回の試算では、Shot内の918個の候補から77点を選ぶのに1回0.2秒ほどでした。MATLABならD最適はcandexch関数が使えます。',
  ]);
  const steps = [
    ['候補の場所', '置けるターゲットの一覧（レチクル・計測レシピから）。外周は半径150 mm未満、品質の悪いターゲットは除く'],
    ['補正式', 'メーカーの式と、使っているkの項。ウェーハ面内の式の次数'],
    ['制約', '点数、Shotあたりの点数、必ず測る点、測定時間'],
    ['最適化', '点交換法：点を1つずつ、κが最も下がる候補に入れ替える。初期値を変えて数回行う'],
    ['評価と採用', 'κ・最悪点・1点欠けたとき・式にない形の取り残しを、今の配置と比べる'],
  ];
  const cw = (CONTENT_W - 0.8) / 5;
  steps.forEach(([h, b], i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    addStepCard(slide, x, 1.6, cw, 2.75, i + 1, h, b, { fill: i === 3 ? C.tealTint : C.gray, bodySize: 11 });
    if (i < steps.length - 1) addLine(slide, x + cw + 0.02, 2.95, x + cw + 0.18, 2.95, { color: C.teal, width: 2, arrow: true });
  });
  // 点交換法の図
  const bx = MARGIN_X;
  addCard(slide, bx, 4.55, 6.4, 2.15, { fill: C.white, line: C.line });
  addText(slide, '点交換法のイメージ', bx + 0.2, 4.62, 4, 0.3, { fontSize: 12, bold: true, color: C.tealDark });
  const shotBox = { x: bx + 0.35, y: 5.0, w: 1.25, h: 1.25 * (SHOT_H_MM / SHOT_W_MM) };
  drawShotFrame(slide, shotBox);
  const { toX, toY } = shotMapper(shotBox);
  [[-13, -16.5], [13, -16.5], [-13, 16.5], [13, 16.5], [0, 0], [-6, 8]].forEach(([x, y], i) => addDot(slide, toX(x), toY(y), 0.11, i === 5 ? C.bad : C.teal, { lineColor: C.white }));
  addDot(slide, toX(13), toY(4), 0.11, C.gold, { lineColor: C.white });
  addLine(slide, toX(-6) + 0.06, toY(8), toX(13) - 0.07, toY(4) + 0.02, { color: C.gold, width: 1.5, arrow: true, dash: 'dash' });
  addBullets(slide, [
    '赤の点を外したとき、どの候補（金）を入れるとκが最も下がるかを全候補で計算する',
    '下がるなら入れ替える。すべての点で改善がなくなるまでくり返す',
    '1点入れ替えたときのκは、行列の公式で速く計算できる（付録）',
  ], bx + 2.0, 5.0, 4.25, 1.65, { fontSize: 11, space: 4 });
  const rx = 7.2;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 4.55, rw, 2.15, { fill: C.goldTint });
  addText(slide, '計算の重さとツール', rx + 0.2, 4.62, rw - 0.4, 0.3, { fontSize: 12, bold: true, color: C.goldDark });
  addBullets(slide, [
    '軽い：Shot内の918候補から77点を選ぶのに1回約0.2秒（今回の試算、Python）',
    'MATLAB：D最適は candexch 関数が使える。I最適は同じ手順を数十行で書ける',
    '社内の環境（MATLAB・Python）で動く。装置メーカーのツール（ASMLのTLOなど）があれば併用する',
  ], rx + 0.2, 4.98, rw - 0.4, 1.7, { fontSize: 11, space: 4 });
}

// =====================================================================
// 9. 対象の補正式
// =====================================================================
{
  const slide = newContentSlide('対象の補正式', '対象の補正式：式の項が違えば、最適な配置も違う', [
    '最適化の対象にする補正式です。式の項が違えば、最適な配置も変わります。',
    'ウェーハ面内は、ウェーハ座標の3次の式で、X方向とY方向にそれぞれ10項、計20項です。',
    'Shot内は、露光機メーカーごとの式を、項も係数番号もそのまま使います。ASML式はxとyのそれぞれに3次まであり、合わせて15項です。各方向に4段以上の位置が要ります。',
    'Canon式は16項ですが、xは1次の項しかありません。このため、x方向は両端に点を寄せるのが有利で、等間隔の格子は点を無駄にしやすくなります。',
    'Nikon式は27項で、yに6次まであります。y方向に7段以上の位置が要り、点数が少ないと置き方の影響が特に大きくなります。',
    '新しいkのオプションを使い始めたときなど、式の項が変わったら、配置も計算し直す必要があります。',
  ]);
  const header = [headCell('補正式', C.cmp3), headCell('dx の項', C.cmp3), headCell('dy の項', C.cmp3), headCell('項数', C.cmp3, { align: 'center' }), headCell('配置の考え方', C.teal)];
  const rows = [
    ['ウェーハ面内（3次）', '1・X・Y・X^{2}・XY・Y^{2}・X^{3}・X^{2}Y・XY^{2}・Y^{3}', 'dx と同じ10項', '20', '外周のShotの寄与が大きい'],
    ['ASML式', 'k1・k3 x・k5 y・k7 x^{2}・k11 y^{2}・k13 x^{3}・k19 y^{3}', 'k2・k4 y・k6 x・k8 y^{2}・k10 xy・k12 x^{2}・k14 y^{3}・k16 xy^{2}', '15', 'x・yとも3次：各方向に4段以上'],
    ['Canon式', 'k1・k3 x・k5 y・k9 xy・k11 y^{2}・k17 xy^{2}・k19 y^{3}・k27 xy^{3}', 'k2・k4 y・k6 x・k8 y^{2}・k10 xy・k14 y^{3}・k16 xy^{2}・k24 xy^{3}', '16', 'xは1次だけ：x方向は両端に寄せる'],
    ['Nikon式', 'k1・k3 x・k5 y・k7 x^{2}・k9 xy・k11 y^{2}・k13 x^{3}・k17 xy^{2}・k19 y^{3}・k29 y^{4}・k41 y^{5}・k55 y^{6}', 'k2・k4 y・k6 x・k8 y^{2}・k10 xy・k12 x^{2}・k14 y^{3}・k16 xy^{2}・k18 x^{2}y・k22 y^{4}・k24 xy^{3}・k32 y^{5}・k34 xy^{4}・k44 y^{6}・k46 xy^{5}', '27', 'yに6次：y方向に7段以上。点が少ないと影響大'],
  ].map(([a, b, c, d, e], i) => [
    bodyCell(a, { bold: true }), bodyCell(b, { fontSize: 10 }), bodyCell(c, { fontSize: 10 }), bodyCell(d, { align: 'center', bold: true }),
    bodyCell(e, { fill: { color: i === 2 ? C.tealTint : C.white } }),
  ]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [1.75, 3.6, 3.9, 0.7, 2.18], { rowH: [0.4, 0.62, 0.72, 0.72, 1.12], fontSize: 11 });
  addCard(slide, MARGIN_X, 5.45, CONTENT_W, 0.95, { fill: C.goldTint });
  addBullets(slide, [
    'Shot内の式は、露光機メーカーごとの補正式のとおり（項・係数番号・変数・符号を変えない）。x・y はShot中心基準の座標',
    '使っていないkの項は式から外して計算する。新しいkのオプションを使い始めたら、配置も計算し直す（最適な配置は式で変わる）',
  ], MARGIN_X + 0.25, 5.57, CONTENT_W - 0.5, 0.8, { fontSize: 11.5, space: 4 });
}

// =====================================================================
// 10. 合成データ①：配置の比較（Nikon式・28点）
// =====================================================================
{
  const randomKappa = NIKON.layouts['28'].random_kappa;
  const slide = newContentSlide('合成データ①　Shot内の配置の比較', `Nikon式・28点では、置き方だけでκが${f2(nikon28.I)}〜${f2(randomKappa)}まで変わる`, [
    'ここから合成データでの試算です。まずShot内で、Nikon式に28点を置く場合の配置を比べました。',
    `左から、Shot端を含む4×7の格子、中心から散らばるように順に選んだ配置、ランダムに選んだ配置の例、I最適の配置です。κは、格子${f3(nikonGrid28)}、散らばり${f3(nikon28.spread)}、ランダムの例${f3(randomKappa)}、I最適${f3(nikon28.I)}でした。`,
    `I最適は格子よりκが${pct(1 - nikon28.I / nikonGrid28)}小さく、ランダムな置き方の3分の1程度です。I最適は、x方向は両端と±5〜7ミリ付近に寄せ、y方向は7段前後に分けています。Nikon式はyに6次まであり、xは3次までなので、この置き方になります。`,
    'ランダムな置き方は、ターゲットを置ける場所の都合で配置が決まっている場合に近いと考えられます。点が少なく項の多い式ほど、置き方の差が大きくなります。',
    `参考までに、D最適のκは${f3(nikon28.D)}でした。`,
  ]);
  const panels = [
    [`格子（4×7）`, gridPoints(4, 7), nikonGrid28, DESIGN.grid.color],
    ['散らばるように選ぶ', NIKON.layouts['28'].spread, nikon28.spread, DESIGN.spread.color],
    ['ランダムの例', NIKON.layouts['28'].random, randomKappa, C.bad],
    ['I最適', NIKON.layouts['28'].I, nikon28.I, DESIGN.I.color],
  ];
  const pw = 2.85;
  panels.forEach(([name, pts, kappa, color], i) => {
    const x = MARGIN_X + i * (pw + 0.24);
    addCard(slide, x, 1.55, pw, 4.6, { fill: i === 3 ? C.tealTint : C.gray });
    addText(slide, name, x + 0.15, 1.62, pw - 0.3, 0.34, { fontSize: 13, bold: true, align: 'center', color: i === 3 ? C.tealDark : C.ink });
    const bw = 2.1;
    const box = { x: x + (pw - bw) / 2, y: 2.05, w: bw, h: bw * (SHOT_H_MM / SHOT_W_MM) };
    drawShotFrame(slide, box);
    drawShotPoints(slide, box, pts, { color, size: 0.12 });
    addText(slide, `κ ＝ ${f3(kappa)}`, x + 0.15, 4.85, pw - 0.3, 0.42, { fontSize: 18, bold: true, align: 'center', color: i === 3 ? C.tealDark : (i === 2 ? C.bad : C.ink) });
    addText(slide, i === 3 ? `格子より${pct(1 - kappa / nikonGrid28)}小さい` : (i === 0 ? '基準' : `格子の${f2(kappa / nikonGrid28)}倍`), x + 0.15, 5.3, pw - 0.3, 0.3, { fontSize: 11, align: 'center', color: C.muted });
  });
  addCard(slide, MARGIN_X, 6.28, CONTENT_W, 0.5, { fill: C.goldTint });
  addText(slide, '点が少なく項の多い式ほど、置き方の差が大きい。ターゲットを置ける場所の都合で決めた配置（ランダムに近い）は特に危ない', MARGIN_X + 0.25, 6.28, CONTENT_W - 0.5, 0.5, { fontSize: 11.5, valign: 'middle' });
}

// =====================================================================
// 11. 合成データ②：点数とκ
// =====================================================================
{
  const slide = newContentSlide('合成データ②　点数とκ', '点数とκ：I最適は格子より少し、経験則の配置よりはっきり良い', [
    '点数とκの関係です。左がASML式、右がNikon式で、横軸は点数を対数目盛りで、縦軸はκです。',
    '灰色の点がShot端を含む等間隔の格子、薄い灰色の線がランダムに置いた場合の中央値、中くらいの灰色が散らばるように選んだ配置、青がD最適、緑がI最適です。',
    'I最適はどの点数でも最も小さく、格子と比べると少しだけ良く、散らばりやランダムと比べるとはっきり良くなっています。',
    '特にNikon式で点が少ない場面では、ランダムに置くとκが非常に大きくなり、補正がほとんど使えない状態になります。格子の4×5点は、Nikon式では推定そのものができません。',
    'Shot端を含む格子は、もともとI最適に近い、良い配置だと言えます。',
  ]);
  const panels = [['ASML式（15項）', ASML, [0.2, 1.4]], ['Nikon式（27項）', NIKON, [0.3, 2.2]]];
  const pw = (CONTENT_W - 0.4) / 2;
  panels.forEach(([name, model, [yMin, yMax]], k) => {
    const x0 = MARGIN_X + k * (pw + 0.4);
    addText(slide, name, x0, 1.5, pw, 0.3, { fontSize: 13, bold: true });
    const box = { x: x0 + 0.75, y: 2.2, w: pw - 1.0, h: 3.35 };
    const ticks = yMax > 2 ? [0.4, 0.8, 1.2, 1.6, 2.0] : [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
    const pts = (key) => model.curve.map((c) => [c.n, c[key]]);
    const { px, py } = drawXYChart(slide, box, {
      xMin: 14, xMax: 90, xLog: true, yMin, yMax, xTicks: [16, 20, 28, 40, 54, 77], yTicks: ticks,
      xLabel: 'Shot内の点数（対数目盛り）', yLabel: 'κ（ノイズが補正に乗る倍率）', yFmt: (v) => v.toFixed(1),
      series: [
        { color: DESIGN.random.color, width: 2, dash: 'dash', points: pts('random_median') },
        { color: DESIGN.spread.color, width: 2, points: pts('spread') },
        { color: DESIGN.D.color, width: 2, points: pts('D') },
        { color: DESIGN.I.color, width: 3, markers: true, markerSize: 0.08, points: pts('I') },
      ],
    });
    model.grid.filter((g) => Number.isFinite(g.kappa) && g.points <= 90 && g.points >= 14).forEach((g) => {
      addDot(slide, px(g.points), py(g.kappa), 0.13, DESIGN.grid.color, { lineColor: C.white });
    });
    if (model === NIKON) {
      const off = model.curve.filter((c) => c.random_median > yMax).map((c) => `${c.n}点で${c.random_median >= 10 ? Math.round(c.random_median) : f2(c.random_median)}`);
      addText(slide, `格子4×5（20点）は推定できない。ランダムは範囲外（${off.join('・')}）`, x0, box.y + box.h + 0.62, pw, 0.26, { fontSize: 9.5, color: C.bad });
    }
  });
  addLegend(slide, [
    { kind: 'dot', color: DESIGN.grid.color, label: 'Shot端を含む格子', width: 1.75 },
    { kind: 'line', color: DESIGN.random.color, dash: 'dash', label: 'ランダム（中央値）', width: 1.75 },
    { kind: 'line', color: DESIGN.spread.color, label: '散らばるように選ぶ', width: 1.75 },
    { kind: 'line', color: DESIGN.D.color, label: 'D最適', width: 0.8 },
    { kind: 'line', color: DESIGN.I.color, label: 'I最適', width: 0.8 },
  ], MARGIN_X + 0.4, 6.5, { fontSize: 10.5 });
}

// =====================================================================
// 12. 合成データ③：同じκに必要な点数
// =====================================================================
{
  const models = [['ASML式', ASML], ['Canon式', CANON], ['Nikon式', NIKON]];
  const slide = newContentSlide('合成データ③　同じκに必要な点数', `今の配置（77点）と同じκを、I最適なら${pct(gridCutMin)}〜${pct(strideCutMax)}少ない点で`, [
    '今の配置と同じκを得るのに、I最適なら何点で足りるかを計算しました。今の配置は77点で、3種類を想定しています。',
    '1つ目はShot端を含む等間隔の格子、2つ目は中心から散らばるように選んだ配置、3つ目は以前の検討で使った、格子を1点おきに間引いて右端と上端が抜けた配置です。',
    `Shot端を含む格子と比べると、ASML式は${ASML.n_same_as_grid77}点、Nikon式は${NIKON.n_same_as_grid77}点で同じκになり、削減は1割弱です。格子はもともと良い配置だからです。`,
    `Canon式は${CANON.n_same_as_grid77}点で足り、${pct(cutRatio(CANON.n_same_as_grid77))}減らせます。Canon式はxが1次だけなので、x方向の中ほどの点が無駄になっているためです。実際、Canon式に28点を置くI最適では、すべての点がShotの左右の端に並びました。`,
    `端が抜けた格子と比べると、ASML式${ASML.n_same_as_stride77}点、Canon式${CANON.n_same_as_stride77}点、Nikon式${NIKON.n_same_as_stride77}点で足り、${pct(strideCutMin)}から${pct(strideCutMax)}減らせます。今の配置に端の抜けや偏りがあるほど、最適化の効果が大きくなります。`,
  ]);
  const labels = models.map(([n]) => n);
  slide.addChart(pres.charts.BAR, [
    { name: 'Shot端を含む格子と比べて', labels, values: models.map(([, m]) => Math.round(cutRatio(m.n_same_as_grid77) * 100)) },
    { name: '散らばりと比べて', labels, values: models.map(([, m]) => Math.round(cutRatio(m.n_same_as_spread77) * 100)) },
    { name: '端が抜けた格子と比べて', labels, values: models.map(([, m]) => Math.round(cutRatio(m.n_same_as_stride77) * 100)) },
  ], {
    x: MARGIN_X, y: 1.55, w: 7.2, h: 4.75,
    barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 55,
    chartColors: [DESIGN.grid.color, DESIGN.spread.color, DESIGN.stride.color],
    showLegend: true, legendPos: 't', legendFontSize: 10.5, legendFontFace: FONT,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"', dataLabelFontSize: 10.5, dataLabelFontFace: FONT, dataLabelColor: C.ink,
    catAxisLabelFontSize: 12, catAxisLabelFontFace: FONT, catAxisLabelColor: C.ink,
    valAxisLabelFontSize: 10, valAxisLabelColor: C.muted, valAxisMinVal: 0, valAxisMaxVal: 50, valAxisMajorUnit: 10,
    valAxisLabelFormatCode: '0"%"', valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: 'none' },
    showValAxisTitle: true, valAxisTitle: '点数の削減（I最適）', valAxisTitleFontSize: 10.5, valAxisTitleColor: C.muted, valAxisTitleFontFace: FONT,
  });
  const rx = 8.1;
  const rw = RIGHT_EDGE - rx;
  const header = [headCell('今の配置（77点）', C.cmp3), ...labels.map((l) => headCell(l, C.teal, { align: 'center' }))];
  const rowOf = (name, key) => [bodyCell(name, { bold: true }), ...models.map(([, m]) => bodyCell(`${m[key]}点`, { align: 'center' }))];
  addText(slide, '同じκに必要な点数（I最適）', rx, 1.55, rw, 0.3, { fontSize: 12.5, bold: true });
  addTableBox(slide, [header, rowOf('Shot端を含む格子', 'n_same_as_grid77'), rowOf('散らばり', 'n_same_as_spread77'), rowOf('端が抜けた格子', 'n_same_as_stride77')],
    rx, 1.92, rw, [1.75, 0.96, 0.96, 0.96], { rowH: 0.42, fontSize: 11 });
  addCard(slide, rx, 3.85, rw, 2.45, { fill: C.gray });
  addBullets(slide, [
    'Shot端を含む格子はもともと良い配置。ASML式・Nikon式では1割弱の削減',
    'Canon式はxが1次だけで、格子のx方向の中ほどの点が無駄になる → 3割減',
    '端の抜けや偏りがある配置からは、4割前後減らせる',
  ], rx + 0.2, 4.0, rw - 0.4, 2.2, { fontSize: 11.5, space: 5 });
  addText(slide, '端が抜けた格子：14×22の格子を1点おきに間引いた7×11点（右端・上端を含まない）。以前の検討で使った配置', MARGIN_X, 6.45, CONTENT_W, 0.3, { fontSize: 10, color: C.muted });
}

// =====================================================================
// 13. 合成データ④：どこにノイズが乗るか
// =====================================================================
{
  const maps = [
    ['Shot端を含む格子（77点）', NIKON.maps.grid77, gridPoints(7, 11), DESIGN.grid.color, NIKON.grid77_kappa],
    ['端が抜けた格子（77点）', NIKON.maps.stride77, stridePoints(), DESIGN.stride.color, NIKON.stride77_kappa],
    ['I最適（77点）', NIKON.maps.I77, NIKON.layouts['77'].I, DESIGN.I.color, curveAt(NIKON, 77).I],
  ];
  const vmin = Math.min(...maps.map((m) => Math.min(...m[1])));
  const vmax = Math.max(...maps.map((m) => Math.max(...m[1])));
  const slide = newContentSlide('合成データ④　どこにノイズが乗るか', 'ノイズはShotの端に乗る。端が抜けると、その辺のぶれが大きくなる', [
    'Shot内のどこにノイズが乗るかを、Nikon式・77点で色分けしました。色が濃いほど、計測のばらつきが補正に大きく乗る場所です。',
    '左のShot端を含む格子では、ぶれの大きい場所はShotの四隅と端に限られます。',
    `中央の端が抜けた格子では、右端と上端に点がないため、そこでぶれが大きくなり、最悪点は${f2(maxOf(NIKON.maps.stride77))}と、端を含む格子の${f2(maxOf(NIKON.maps.stride77) / maxOf(NIKON.maps.grid77))}倍になりました。`,
    '右のI最適は、全体のぶれを平均的に最も小さくする配置です。',
    'このように、κのマップを見ると、配置のどこが弱いかが分かります。外周のShotの端など、特に精度が要る場所があれば、そこに点を足す判断にも使えます。',
  ]);
  const pw = 3.9;
  maps.forEach(([name, values, pts, color, kappa], i) => {
    const x = MARGIN_X + i * (pw + 0.22);
    addText(slide, name, x, 1.52, pw, 0.3, { fontSize: 12.5, bold: true, align: 'center', color: i === 1 ? C.bad : (i === 2 ? C.tealDark : C.ink) });
    const bw = 2.85;
    const box = { x: x + (pw - bw) / 2, y: 1.9, w: bw, h: bw * (SHOT_H_MM / SHOT_W_MM) * 0.97 };
    drawShotHeatmap(slide, box, values, vmin, vmax);
    drawShotPoints(slide, box, pts, { color, size: 0.07 });
    addText(slide, `κ ${f3(kappa)}　最悪点 ${f2(maxOf(values))}`, x, box.y + box.h + 0.08, pw, 0.3, { fontSize: 11.5, bold: true, align: 'center' });
  });
  addHeatLegend(slide, MARGIN_X + 3.0, 6.08, 6.0, vmin, vmax, '予測のぶれ ÷ σ（色が濃いほどノイズが乗る）');
  addText(slide, 'Nikon式。点は計測点、色は2×2の評価点のまとまりでの最大値', MARGIN_X, 6.6, CONTENT_W, 0.26, { fontSize: 10, color: C.muted, align: 'center' });
}

// =====================================================================
// 14. 合成データ⑤：置ける場所の制約
// =====================================================================
{
  const sets = [['full', 'Shot全面に置ける'], ['perimeter', 'Shot外周のスクライブだけ'], ['die_scribe', 'ダイ間のスクライブもある']];
  const at40 = (set, model) => CAND[set].models[model].curve.find((c) => c.n === 40);
  const slide = newContentSlide('合成データ⑤　置ける場所の制約', `置ける場所が外周だけだとκが${pct(perimeterWorse)}悪化。ダイ間のスクライブでほぼ解消`, [
    'ターゲットを置ける場所に制約がある場合を比べました。点数は40点で、Nikon式の配置を図に示しています。',
    '左はShot全面のどこにでも置ける場合、中央はShotの外周のスクライブにしか置けない場合、右は例として2×3個のダイがあり、ダイの間のスクライブにも置ける場合です。薄い線が置ける場所、緑の点がI最適で選んだ40点です。',
    `外周だけの場合、Shotの中央に点を置けないため、最適化してもκは全面の場合より、Nikon式で${pct(perimeterWorse)}、ASML式で${pct(perimeterWorseAsml)}大きくなります。`,
    `ダイ間のスクライブにも置ける場合は、全面の場合とほぼ同じで、差は${pct(dieWorse)}でした。`,
    'このことから、レチクルを設計する段階で、ダイの間のスクライブやデバイスの中にターゲットを置けるようにしておくことが、計測点を減らすうえで効くと言えます。Macronixの報告も、スクライブのマークは数が少なく偏りがあるため、デバイス内の計測で補ってShot内高次補正を実現しています。',
    'また、制約がある場合も、候補の中から計算で選ぶと、散らばるように選ぶより良くなります。',
  ]);
  const pw = 3.0;
  sets.forEach(([key, name], i) => {
    const x = MARGIN_X + i * (pw + 0.22);
    addCard(slide, x, 1.55, pw, 4.2, { fill: C.gray });
    addText(slide, name, x + 0.1, 1.62, pw - 0.2, 0.3, { fontSize: 12, bold: true, align: 'center' });
    const bw = 1.95;
    const box = { x: x + (pw - bw) / 2, y: 2.02, w: bw, h: bw * (SHOT_H_MM / SHOT_W_MM) };
    drawShotFrame(slide, box, { fill: key === 'full' ? C.tealTint : C.white });
    const { toX, toY } = shotMapper(box);
    if (key !== 'full') {
      const xs = key === 'perimeter' ? [-13, 13] : [-13, 0, 13];
      const ys = key === 'perimeter' ? [-16.5, 16.5] : [-16.5, -5.5, 5.5, 16.5];
      xs.forEach((xv) => addLine(slide, toX(xv), toY(16.5), toX(xv), toY(-16.5), { color: '7FC4BA', width: 4 }));
      ys.forEach((yv) => addLine(slide, toX(-13), toY(yv), toX(13), toY(yv), { color: '7FC4BA', width: 4 }));
    }
    drawShotPoints(slide, box, CAND[key].models.Nikon.layout40, { color: C.tealDark, size: 0.09 });
    const nik = at40(key, 'Nikon');
    const asm = at40(key, 'ASML');
    addText(slide, `Nikon式 κ ${f3(nik.I)}\nASML式 κ ${f3(asm.I)}`, x + 0.1, 4.62, pw - 0.2, 0.62, { fontSize: 12, bold: true, align: 'center' });
    addText(slide, key === 'full' ? '（基準）' : `全面より Nikon式+${pct(nik.I / at40('full', 'Nikon').I - 1)}`, x + 0.1, 5.28, pw - 0.2, 0.3, { fontSize: 10.5, align: 'center', color: key === 'perimeter' ? C.bad : C.muted });
  });
  const rx = MARGIN_X + 3 * (pw + 0.22);
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 4.2, { fill: C.goldTint });
  addText(slide, '提案', rx + 0.2, 1.65, rw - 0.4, 0.3, { fontSize: 13, bold: true, color: C.goldDark });
  addBullets(slide, [
    'レチクルの設計段階で、ダイ間のスクライブやデバイス内にもターゲットを置けるようにする',
    '制約がある場合も、候補の中から計算で選ぶ（散らばるように選ぶより良い）',
    `例：外周だけ・Nikon式40点で、散らばり κ ${f3(CAND.perimeter.models.Nikon.curve.find((c) => c.n === 40).spread)} → I最適 ${f3(at40('perimeter', 'Nikon').I)}`,
  ], rx + 0.2, 2.02, rw - 0.4, 3.6, { fontSize: 11.5, space: 6 });
  addCard(slide, MARGIN_X, 5.9, CONTENT_W, 0.85, { fill: C.gray });
  addText(slide, [
    { text: '報告例：', bold: true, color: C.tealDark },
    { text: 'スクライブのマークは数が少なく偏りがあり、Shot内高次補正が難しい。高電圧SEMや光学CD計測でデバイス内を密に測り、スクライブの計測と組み合わせてShot内高次補正を実現した（Macronix 2022）' },
  ], MARGIN_X + 0.25, 5.9, CONTENT_W - 0.5, 0.85, { fontSize: 11.5, valign: 'middle' });
  addText(slide, `${cite('chang2022')}。ダイ間のスクライブは2×3ダイの例（x＝0 mm、y＝±5.5 mm）`, MARGIN_X, 6.8, CONTENT_W, 0.26, { fontSize: 8.5, color: C.muted });
}

// =====================================================================
// 15. 合成データ⑥：ウェーハ面内のShot選び
// =====================================================================
{
  const shots = WAFER.shots;
  const slide = newContentSlide('合成データ⑥　ウェーハ面内のShot選び', `ウェーハ面内は、同じ${WAFER.baseline_shots}Shotでκが${pct(waferKappaCut)}小さく、同じκなら${WAFER.n_same_as_baseline}Shotで足りる`, [
    'ウェーハ面内で、3次の式を当てはめるためにどのShotを測るかを比べました。候補は、有効なマークが3つ以上あるShotで、親資料の通常の計測と同じ条件です。各Shotの有効なマークをすべて測ります。',
    `左は、中心から散らばるように${WAFER.baseline_shots}Shotを選んだ場合、中央はI最適で${WAFER.baseline_shots}Shotを選んだ場合です。色はShotごとの予測のぶれで、濃いほどノイズが乗ります。点は測るShotです。`,
    `I最適は外周のShotを多めに、中ほども適度に選び、κは${f3(WAFER_BASE.spread)}から${f3(WAFER_BASE.I)}へ${pct(waferKappaCut)}小さくなりました。計測点はほぼ同じです。`,
    `同じκなら、I最適は${WAFER.n_same_as_baseline}Shot、${WAFER.n_same_points}点で足り、Shotは${pct(waferShotCut)}、計測点は${pct(waferPointCut)}減ります。`,
    '右のグラフのとおり、どのShot数でもI最適が最も小さく、ランダムに選ぶと大きくばらつきます。Shot数が少ないほど差が大きくなります。',
  ]);
  const maps = [['散らばるように選ぶ', WAFER.maps.spread25, WAFER.chosen[String(WAFER.baseline_shots)].spread, WAFER_BASE.spread],
    ['I最適', WAFER.maps.I25, WAFER.chosen[String(WAFER.baseline_shots)].I, WAFER_BASE.I]];
  const vmin = Math.min(...maps.map((m) => Math.min(...m[1])));
  const vmax = Math.max(...maps.map((m) => Math.max(...m[1])));
  maps.forEach(([name, values, chosen, kappa], i) => {
    const cx = MARGIN_X + 1.55 + i * 3.35;
    addText(slide, `${name}（${WAFER.baseline_shots}Shot）`, cx - 1.6, 1.52, 3.2, 0.3, { fontSize: 12.5, bold: true, align: 'center', color: i === 1 ? C.tealDark : C.ink });
    const { toSlide } = drawWafer(slide, cx, 3.45, 1.5, shots, (s, idx) => ({ fill: lerpColor(HEAT_LOW, HEAT_HIGH, (values[idx] - vmin) / (vmax - vmin)) }));
    chosen.forEach((u) => {
      const [sx, sy] = toSlide([shots[u].x, shots[u].y]);
      addDot(slide, sx, sy, 0.09, i === 1 ? C.teal : C.cmp3, { lineColor: C.white });
    });
    addText(slide, `κ ${f3(kappa)}　最悪 ${f2(Math.max(...values))}`, cx - 1.6, 5.05, 3.2, 0.3, { fontSize: 12, bold: true, align: 'center' });
  });
  addHeatLegend(slide, MARGIN_X + 0.3, 5.55, 5.9, vmin, vmax, 'Shotごとの予測のぶれ ÷ σ（最大値）');
  addText(slide, `点：測るShot。散らばり${WAFER.baseline_points}点・I最適${WAFER_BASE.points.I}点`, MARGIN_X, 6.0, 6.5, 0.26, { fontSize: 10, color: C.muted, align: 'center' });
  // 右：Shot数とκ
  const box = { x: 8.05, y: 2.3, w: 4.45, h: 3.0 };
  addText(slide, 'Shot数とκ', 7.45, 1.52, 5, 0.3, { fontSize: 12.5, bold: true });
  const pts = (key) => WAFER.curve.map((c) => [c.n, c[key]]);
  drawXYChart(slide, box, {
    xMin: 8, xMax: 42, yMin: 0.2, yMax: 1.2, xTicks: [10, 16, 20, 25, 30, 40], yTicks: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
    xLabel: '測るShot数', yLabel: 'κ（ウェーハ面内）',
    series: [
      { color: DESIGN.random.color, width: 2, dash: 'dash', points: pts('random_median') },
      { color: DESIGN.spread.color, width: 2.25, markers: true, markerSize: 0.07, points: pts('spread') },
      { color: DESIGN.D.color, width: 2, points: pts('D') },
      { color: DESIGN.I.color, width: 3, markers: true, markerSize: 0.08, points: pts('I') },
    ],
  });
  addLegend(slide, [
    { kind: 'line', color: DESIGN.random.color, dash: 'dash', label: 'ランダム（中央値）', width: 1.6 },
    { kind: 'line', color: DESIGN.spread.color, label: '散らばり', width: 0.8 },
  ], 7.45, 5.95, { fontSize: 10 });
  addLegend(slide, [
    { kind: 'line', color: DESIGN.D.color, label: 'D最適', width: 0.8 },
    { kind: 'line', color: DESIGN.I.color, label: 'I最適', width: 0.8 },
  ], 7.45, 6.25, { fontSize: 10 });
  addCard(slide, 10.05, 2.45, 2.4, 0.78, { fill: C.tealTint });
  addText(slide, `同じκなら\n${WAFER.baseline_shots}→${WAFER.n_same_as_baseline}Shot（${WAFER.baseline_points}→${WAFER.n_same_points}点）`, 10.12, 2.47, 2.28, 0.74, { fontSize: 11.5, bold: true, color: C.tealDark, align: 'center', valign: 'middle' });
  addText(slide, `前提：ウェーハ座標の3次の式（${WAFER.model_terms}項）、候補は有効なマークが3つ以上の${WAFER.pool_count}Shot（26×33 mm、1Shot 4マーク）、評価点は半径150 mm未満の5 mm格子`, MARGIN_X, 6.72, CONTENT_W, 0.3, { fontSize: 9, color: C.muted });
}

// =====================================================================
// 16. 合成データ⑦：式にない形
// =====================================================================
{
  const sig = ROB.sigma;
  const nik = ROB.intrafield.Nikon;
  const wf = ROB.wafer;
  const slide = newContentSlide('合成データ⑦　補正式にない形があるとき', 'Shot内では格子の方が取り残しが小さい。ウェーハ面内はI最適がどちらでも有利', [
    'ここまでは、補正式が正しいという前提での比較でした。実際には、補正式で表せない形、つまり取り残しがあります。そこで、式にない高次の形が評価点でのRMSで0.3ナノメートルあるとして、取り残しを含めた補正誤差を計算しました。',
    `左はShot内・Nikon式・77点です。I最適は点を端や特定の位置に寄せるため、式にない形の取り残しが、格子の${f3(nik.grid77.bias)}に対して${f3(nik.I77.bias)}と大きくなりました。`,
    `このため、計測のばらつきσが約${f2(crossNikon)}ナノメートルより小さいと格子が有利で、大きいとI最適が有利になります。ASML式でも入れ替わりは約${f2(crossAsml)}ナノメートルでした。端が抜けた格子は、どのσでも最も悪くなりました。`,
    `右はウェーハ面内・${WAFER.baseline_shots}Shotです。I最適は取り残しも散らばりと同程度で、どのσでもI最適が有利でした。`,
    '結論として、Shot内では、採用する前に、過去データの取り残しとσを使って、格子とI最適を補正誤差の合計で比べるべきです。ウェーハ面内では、I最適をそのまま使えます。',
  ]);
  const pw = (CONTENT_W - 0.5) / 2;
  const intraSeries = [
    ['grid77', DESIGN.grid.color, DESIGN.grid.label], ['stride77', DESIGN.stride.color, DESIGN.stride.label], ['I77', DESIGN.I.color, 'I最適'],
  ];
  const waferSeries = [['spread25', DESIGN.spread.color, '散らばり'], ['D25', DESIGN.D.color, 'D最適'], ['I25', DESIGN.I.color, 'I最適']];
  [[`Shot内・Nikon式・77点`, nik, intraSeries, [0.4, 2.4]], [`ウェーハ面内・${WAFER.baseline_shots}Shot`, wf, waferSeries, [0.2, 1.8]]].forEach(([name, data, series, [yMin, yMax]], k) => {
    const x0 = MARGIN_X + k * (pw + 0.5);
    addText(slide, name, x0, 1.5, pw, 0.3, { fontSize: 13, bold: true });
    const box = { x: x0 + 0.75, y: 2.15, w: pw - 1.0, h: 2.9 };
    drawXYChart(slide, box, {
      xMin: 0.1, xMax: 1.6, yMin, yMax, xTicks: [0.2, 0.5, 1.0, 1.5], yTicks: yMax > 2 ? [0.4, 0.8, 1.2, 1.6, 2.0, 2.4] : [0.2, 0.6, 1.0, 1.4, 1.8],
      xLabel: '計測のばらつき σ（nm）', yLabel: '取り残しを含む補正誤差（3σ、nm）', xFmt: (v) => v.toFixed(1),
      series: series.map(([key, color]) => ({ color, width: key.startsWith('I') ? 3 : 2, markers: true, markerSize: 0.07, points: sig.map((s, i) => [s, data[key].total_3sigma[i]]) })),
    });
    addLegend(slide, series.map(([, color, label]) => ({ kind: 'line', color, label, width: label.length > 6 ? 1.6 : 0.8 })), x0 + 0.2, 5.75, { fontSize: 10 });
    const text = k === 0
      ? `取り残し：格子 ${f3(data.grid77.bias)}・I最適 ${f3(data.I77.bias)} nm。σ約${f2(crossNikon)} nm未満なら格子が有利`
      : `取り残し：散らばり ${f3(data.spread25.bias)}・I最適 ${f3(data.I25.bias)} nm。どのσでもI最適が有利`;
    addText(slide, text, x0 + 0.2, 6.08, pw - 0.3, 0.3, { fontSize: 11, bold: true, color: k === 0 ? C.goldDark : C.tealDark });
  });
  addText(slide, `前提：式にない形＝Shot内は6次までの式にない項、ウェーハ面内は4〜5次の項。評価点でのRMS ${ROB.bias_rms_nm} nm（X・Yそれぞれ）の正規乱数とし、取り残しの期待値を式で計算`, MARGIN_X, 6.55, CONTENT_W, 0.4, { fontSize: 9, color: C.muted });
}

// =====================================================================
// 17. 合成データ⑧：点が欠けたとき
// =====================================================================
{
  const as = ROB.intrafield.ASML.small_n;
  const nk = ROB.intrafield.Nikon.small_n;
  const factors = Object.keys(as).map((n) => ({ n: Number(n), ...as[n] }));
  const factorsN = Object.keys(nk).map((n) => ({ n: Number(n), ...nk[n] }));
  const worst = Math.max(...factors.map((f) => f.drop_max));
  const slide = newContentSlide('合成データ⑧　計測点が欠けたとき', `項数ぎりぎりの点数では、1点欠けるとκが最大${Math.round(worst)}倍に。項数の2倍を目安に`, [
    '計測点が1つ欠けたとき、たとえばターゲットの不良や誤測定で除外したときに、κがどれだけ悪くなるかを調べました。',
    `I最適で、点数を式の項数ぎりぎりにすると、ASML式の${factors[0].n}点では、1点欠けただけでκが最大${Math.round(factors[0].drop_max)}倍になりました。残りの点で式が決まりにくくなるためです。`,
    `項数の1.5倍では最大${f2(factors[1].drop_max)}倍、2倍では${f2(factors[2].drop_max)}倍、3倍では${f2(factors[3].drop_max)}倍と、予備の点があるほど強くなります。Nikon式でも同じ傾向でした。`,
    `77点の配置では、格子もI最適も、1点欠けてもκの悪化は2%程度でした。ウェーハ面内では、散らばりの${WAFER.baseline_shots}Shotは1Shot欠けると最大${pct(ROB.wafer.spread25.drop_max - 1)}悪くなる一方、I最適は${pct(ROB.wafer.I25.drop_max - 1)}でした。`,
    '目安として、Shot内の点数は、X・Yの式の多い方の項数の2倍以上にすることを提案します。点を減らしすぎると、欠けたときの悪化が大きくなるからです。',
  ]);
  const header = [headCell('点数の目安', C.cmp3), ...factors.map((f) => headCell(f.factor === 1 ? '項数＋1点' : `項数の${f.factor}倍`, C.cmp3, { align: 'center' }))];
  const rowFor = (name, list) => [
    bodyCell(name, { bold: true }),
    ...list.map((f) => bodyCell(`${f.n}点\nκ ${f2(f.kappa)}・最大${f.drop_max >= 10 ? Math.round(f.drop_max) : f2(f.drop_max)}倍`, {
      align: 'center', bold: f.drop_max > 1.3, color: f.drop_max > 1.3 ? C.bad : C.ink, fill: { color: f.drop_max > 1.3 ? C.badTint : C.white },
    })),
  ];
  addText(slide, 'I最適の配置で1点欠けたときのκの悪化（最大）', MARGIN_X, 1.55, 8, 0.3, { fontSize: 12.5, bold: true });
  addTableBox(slide, [header, rowFor('ASML式（多い方8項）', factors), rowFor('Nikon式（多い方15項）', factorsN)], MARGIN_X, 1.92, 8.0, [2.0, 1.5, 1.5, 1.5, 1.5], { rowH: [0.42, 0.72, 0.72], fontSize: 11 });
  addText(slide, '77点の配置・ウェーハ面内（1点・1Shot欠けたとき）', MARGIN_X, 4.1, 8, 0.3, { fontSize: 12.5, bold: true });
  const rows2 = [
    [bodyCell('Shot内・ASML式77点', { bold: true }), bodyCell(`格子 最大${f2(ROB.intrafield.ASML.grid77.drop_max)}倍`, { align: 'center' }), bodyCell(`I最適 最大${f2(ROB.intrafield.ASML.I77.drop_max)}倍`, { align: 'center' })],
    [bodyCell('Shot内・Nikon式77点', { bold: true }), bodyCell(`格子 最大${f2(ROB.intrafield.Nikon.grid77.drop_max)}倍`, { align: 'center' }), bodyCell(`I最適 最大${f2(ROB.intrafield.Nikon.I77.drop_max)}倍`, { align: 'center' })],
    [bodyCell(`ウェーハ面内・${WAFER.baseline_shots}Shot`, { bold: true }), bodyCell(`散らばり 最大${f2(ROB.wafer.spread25.drop_max)}倍`, { align: 'center', color: C.bad }), bodyCell(`I最適 最大${f2(ROB.wafer.I25.drop_max)}倍`, { align: 'center' })],
  ];
  addTableBox(slide, [[headCell('配置', C.cmp3), headCell('比べる配置', C.cmp3, { align: 'center' }), headCell('I最適', C.teal, { align: 'center' })], ...rows2], MARGIN_X, 4.47, 8.0, [2.8, 2.6, 2.6], { rowH: 0.4, fontSize: 11 });
  const rx = 9.0;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 4.55, { fill: C.tealTint });
  addText(slide, '提案する目安', rx + 0.2, 1.65, rw - 0.4, 0.3, { fontSize: 13, bold: true, color: C.tealDark });
  addBullets(slide, [
    'Shot内の点数は、X・Yの式の多い方の項数の2倍以上にする（ASML式16点・Nikon式30点以上）',
    '最適化の評価で、1点欠けたときのκも必ず確かめる',
    '誤測定で点を除く運用（親資料⑤）と組み合わせるときは、特に予備の点を持つ',
  ], rx + 0.2, 2.05, rw - 0.4, 3.9, { fontSize: 11.5, space: 6 });
}

// =====================================================================
// 18. 使い分け
// =====================================================================
{
  const slide = newContentSlide('使い分け', '使い分け：格子のままでよい場面と、最適化が効く場面', [
    '合成データの結果をまとめて、使い分けの目安にしました。',
    'Shot内で点数が十分あり、Shot端を含む格子にできる場合は、格子のままでよく、κで確認するだけで十分です。I最適にしても削減は1割弱で、式にない形が大きい場合はかえって不利になることもあります。',
    '一方、式が格子に合っていない場合、たとえばCanon式のようにxが1次だけの場合や、今の配置に端の抜けや偏りがある場合は、I最適にすると点数を3割から4割減らせます。',
    '点が少ない場合もI最適が効きますが、1点欠けたときの悪化に注意し、予備の点を持ちます。',
    'ターゲットを置ける場所に制約がある場合は、候補の中でI最適にしたうえで、ダイ間のスクライブへのターゲットの追加を検討します。',
    'ウェーハ面内のShot選びは、I最適をそのまま使えます。',
  ]);
  const header = [headCell('場面', C.cmp3), headCell('おすすめ', C.teal), headCell('根拠（合成データ）', C.cmp3)];
  const rows = [
    ['Shot内・点数が十分で、Shot端を含む格子にできる', '格子のまま。κとκマップで確認だけ', `I最適でも点数は${pct(gridCutMin)}〜${pct(cutRatio(ASML.n_same_as_grid77))}減（ASML式・Nikon式）。式にない形が大きいと格子が有利`],
    ['Shot内・式が格子に合っていない（Canon式のように片方向が1次など）', 'I最適にする', `同じκで点数${pct(cutRatio(CANON.n_same_as_grid77))}減（Canon式）`],
    ['Shot内・今の配置に端の抜けや偏りがある', 'I最適にする', `同じκで点数${pct(strideCutMin)}〜${pct(strideCutMax)}減`],
    ['Shot内・点が少ない（項数の2倍前後）', 'I最適＋予備の点', `Nikon式28点で格子よりκ${pct(1 - nikon28.I / nikonGrid28)}減。項数ぎりぎりは欠けに弱い`],
    ['ターゲットを置ける場所に制約がある', '候補の中でI最適。ターゲットの追加も検討', `外周だけだとκ+${pct(perimeterWorse)}。ダイ間スクライブでほぼ解消`],
    ['ウェーハ面内のShot選び', 'I最適をそのまま使う', `同じκでShot${pct(waferShotCut)}減。取り残し・欠けにも強い`],
  ].map(([a, b, c], i) => [bodyCell(a, { bold: true }), bodyCell(b, { bold: true, color: i === 0 ? C.cmp3 : C.tealDark, fill: { color: i === 0 ? C.gray : C.tealTint } }), bodyCell(c)]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [4.3, 3.1, 4.73], { rowH: [0.42, 0.7, 0.7, 0.6, 0.6, 0.6, 0.6], fontSize: 11.5 });
  addText(slide, 'どの場面でも、採用前に過去データでR2Rシミュレーションを行い、補正後の残差で確かめる（スライド21）', MARGIN_X, 6.1, CONTENT_W, 0.35, { fontSize: 12, bold: true, color: C.goldDark });
}

// =====================================================================
// 19. 業界の報告例
// =====================================================================
{
  const slide = newContentSlide('業界の報告例', '業界の報告例：サンプリングを最適化して、計測を減らしても精度を保つ', [
    '業界の報告例をまとめました。',
    'KLAほかの2007年の論文は、線形から高次の制御への移行で、経験則ではなくサンプリングの最適化が必須になると結論しています。3次のウェーハの式には最低11のフィールドが要り、ランダムに選んだ100通りの計画と、幾何の情報とモデルの項から最適化した計画を比べています。',
    'Nanyaの2009年の報告は、ウェーハの中心は高次補正、外周はCPEとし、CPEのサンプリングを最適化することで、計測時間を50%以上減らしながら、許容できる精度を保ったとしています。',
    'Nanyaの2012年の報告は、最適化した50点の計測マップで、全面960点とほぼ同じ補正ができ、計測時間を26%減らしても、デバイスの歩留まりは全面の計測と同等だったとしています。',
    'STの2020年の報告は、ASMLのツールでnMUを計算し、Shot内高次補正の計測レイアウトを最適化しました。ターゲットを置ける場所の制約の中でも改善の余地があったとしています。',
    'Macronixの2022年の報告と、KLAの2026年の報告も、この提案の考え方を支えています。',
  ]);
  const header = [headCell('報告', C.cmp3), headCell('内容', C.cmp3), headCell('主な結果', C.teal)];
  const rows = [
    ['KLA ほか（2007）', '線形から高次の制御への移行と、サンプリング', '高次では経験則でなく最適化が必須。3次のウェーハの式には最低11フィールド。ランダム100通りと最適化した計画を比較'],
    ['Nanya（2009）', '中心は高次補正・外周はCPE、CPEのサンプリング最適化', '計測時間を50%以上削減し、許容できる精度を維持'],
    ['Nanya（2012）', '最適化した計測マップでの補正と、デバイスの歩留まり', '50点で全面960点とほぼ同じ補正。計測時間26%減、歩留まりは同等'],
    ['ST（2020）', 'ASMLのTLOでnMUを計算し、Shot内の計測レイアウトを最適化', 'レイアウトはモデルのばらつきに直接影響。nMUの高いマスクで仕様外が多い。制約の中でも改善の余地'],
    ['Macronix（2022）', 'スクライブの計測と、デバイス内の密な計測の組み合わせ', 'スクライブのマークは少なく偏る → デバイス内で補い、Shot内高次補正を実現'],
    ['KLA（2026）', '計測の不確かさが補正に伝わる量の予測', '精度の寄与は制御指標の5%未満。サンプリングとレシピ構成の最適化を優先すべき'],
  ].map(([a, b, c]) => [bodyCell(a, { bold: true }), bodyCell(b), bodyCell(c)]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [2.1, 4.6, 5.43], { rowH: [0.42, 0.74, 0.62, 0.62, 0.74, 0.62, 0.62], fontSize: 11.5 });
  addSource(slide, cite('adel2007', 'huang2009', 'chiu2012', 'duclaux2020', 'chang2022', 'klein2026'));
}

// =====================================================================
// 20. 効果の見積もり方
// =====================================================================
{
  const slide = newContentSlide('効果の見積もり方', '効果の見積もり方：点数の削減を計測時間に、κの改善を補正誤差に換算する', [
    '効果の見積もり方です。',
    '計測時間の削減は、減らせる点数に、1点あたりの計測時間と、計測するウェーハの数をかけて見積もります。Shot間の移動時間は、測るShot数で別に見積もります。',
    '補正誤差の改善は、補正誤差の2乗が取り残しの2乗とσの2乗にκの2乗をかけたものの和になる式に、今のκと最適化後のκを入れて計算します。取り残しとσは、過去データの残差から見積もれます。',
    '右は合成データでの例です。実際の効果は、自社の計測時間、σ、取り残しの大きさで決まるので、Step 1とStep 3で計算します。',
    '文献では、最適化したサンプリングで計測時間が26%減ったという報告や、50%以上減ったという報告があります。',
  ]);
  const lx = MARGIN_X;
  const lw = 6.2;
  addCard(slide, lx, 1.55, lw, 2.1, { fill: C.tealTint });
  addText(slide, '計測時間の削減', lx + 0.22, 1.65, lw - 0.44, 0.3, { fontSize: 13, bold: true, color: C.tealDark });
  addText(slide, '≈（今の点数 − 最適化後の点数）× 1点あたりの計測時間 × 計測するウェーハ数', lx + 0.22, 2.02, lw - 0.44, 0.7, { fontSize: 13, bold: true });
  addText(slide, 'Shot間の移動時間は、測るShot数で別に見積もる（Shot数が減れば移動も減る）', lx + 0.22, 2.85, lw - 0.44, 0.7, { fontSize: 11 });
  addCard(slide, lx, 3.8, lw, 2.1, { fill: C.tealTint });
  addText(slide, '補正誤差の改善', lx + 0.22, 3.9, lw - 0.44, 0.3, { fontSize: 13, bold: true, color: C.tealDark });
  addText(slide, '補正誤差^{2} ＝ 取り残し^{2} ＋ σ^{2}κ^{2}', lx + 0.22, 4.27, lw - 0.44, 0.45, { fontSize: 15, bold: true });
  addText(slide, '今のκと最適化後のκを入れて比べる。取り残しとσは、過去データの補正後の残差から見積もる', lx + 0.22, 4.8, lw - 0.44, 0.9, { fontSize: 11 });
  addText(slide, `文献：計測時間26%減（${REF.chiu2012.short}）、50%以上減（${REF.huang2009.short}）`, lx, 6.1, lw, 0.5, { fontSize: 11, color: C.muted });
  // 右：合成データでの例
  const rx = 7.1;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '合成データでの例', rx, 1.55, rw, 0.3, { fontSize: 13, bold: true });
  const header = [headCell('場面', C.cmp3), headCell('今', C.cmp3, { align: 'center' }), headCell('最適化後', C.teal, { align: 'center' }), headCell('削減', C.teal, { align: 'center' })];
  const rows = [
    ['Shot内・ASML式（格子と同じκ）', '77点', `${ASML.n_same_as_grid77}点`, pct(cutRatio(ASML.n_same_as_grid77))],
    ['Shot内・Canon式（格子と同じκ）', '77点', `${CANON.n_same_as_grid77}点`, pct(cutRatio(CANON.n_same_as_grid77))],
    ['Shot内・Nikon式（端が抜けた格子と同じκ）', '77点', `${NIKON.n_same_as_stride77}点`, pct(cutRatio(NIKON.n_same_as_stride77))],
    [`ウェーハ面内（散らばり${WAFER.baseline_shots}Shotと同じκ）`, `${WAFER.baseline_points}点`, `${WAFER.n_same_points}点`, pct(waferPointCut)],
  ].map(([a, b, c, d]) => [bodyCell(a, { bold: true }), bodyCell(b, { align: 'center' }), bodyCell(c, { align: 'center', bold: true }), bodyCell(`−${d}`, { align: 'center', bold: true, color: C.tealDark })]);
  addTableBox(slide, [header, ...rows], rx, 1.92, rw, [2.75, 0.8, 1.05, 1.03], { rowH: [0.42, 0.62, 0.62, 0.62, 0.62], fontSize: 11 });
  addCard(slide, rx, 4.95, rw, 1.65, { fill: C.goldTint });
  addText(slide, '実際の効果は、自社の1点あたりの計測時間・σ・取り残しで決まる。Step 1（κの計算）とStep 3（過去データでのR2Rシミュレーション）で見積もる', rx + 0.2, 5.02, rw - 0.4, 1.5, { fontSize: 11.5, valign: 'middle' });
}

// =====================================================================
// 21. 進め方
// =====================================================================
{
  const slide = newContentSlide('進め方', '進め方：今の配置の診断から始め、机上評価と試行を経て展開する', [
    '進め方です。5つのステップで進めます。',
    'Step 1は今の配置の診断です。すべての層と補正式について、今の配置のκとκのマップを計算し、端の抜けや偏りを洗い出します。計測データはいらないので、すぐに始められます。',
    'Step 2は最適な配置の作成です。候補と制約を整理し、I最適とD最適の配置を作って、今の配置と比べます。',
    'Step 3は過去データでの確認です。過去の密な計測データを使ってR2Rシミュレーションを行い、補正後の残差、R2Rの安定性、取り残しを比べます。',
    'Step 4は1層での試行です。条件をそろえたA/B比較で効果を確かめ、配置を変えた直後のR2Rの変動も監視します。',
    'Step 5は展開と見直しです。層や製品に広げ、補正式やkのオプション、レチクルが変わったときには配置を計算し直します。',
  ]);
  const steps = [
    ['今の配置の診断', '全層・全補正式で、今の配置のκとκマップを計算。端の抜け・偏りを洗い出す', '成果物：配置の採点表\nデータ：不要'],
    ['最適配置の作成', '候補と制約を整理し、I最適・D最適を作る。今の配置と比べる', '成果物：配置案と比較表\nデータ：候補の一覧'],
    ['過去データで確認', '過去の密な計測データでR2Rシミュレーション。残差・安定性・取り残しを比べる', '成果物：評価レポート\nデータ：過去の密な計測'],
    ['1層で試行', '条件をそろえたA/B比較。配置を変えた直後のR2Rの変動も監視する', '成果物：試行の結果\n承認：レシピ変更'],
    ['展開と見直し', '層・製品へ広げる。式・kのオプション・レチクルが変わったら再計算する', '成果物：配置の管理ルール'],
  ];
  const cw = (CONTENT_W - 0.8) / 5;
  steps.forEach(([h, b, d], i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    addCard(slide, x, 1.6, cw, 4.35, { fill: i === 0 ? C.tealTint : C.gray });
    addChip(slide, `Step ${i + 1}`, x + 0.2, 1.72, 0.95, 0.32, { fill: C.teal, fontSize: 11 });
    addText(slide, h, x + 0.2, 2.15, cw - 0.4, 0.42, { fontSize: 13.5, bold: true });
    addText(slide, b, x + 0.2, 2.62, cw - 0.4, 1.8, { fontSize: 11 });
    addCard(slide, x + 0.12, 4.55, cw - 0.24, 1.25, { fill: C.white, line: C.line });
    addText(slide, d, x + 0.22, 4.6, cw - 0.44, 1.15, { fontSize: 10.5, color: C.tealDark, valign: 'middle' });
    if (i < steps.length - 1) addLine(slide, x + cw + 0.02, 3.2, x + cw + 0.18, 3.2, { color: C.teal, width: 2, arrow: true });
  });
  addCard(slide, MARGIN_X, 6.1, CONTENT_W, 0.65, { fill: C.goldTint });
  addText(slide, [
    { text: '最初の一歩：', bold: true, color: C.goldDark },
    { text: 'Step 1は計測データが要らず、候補の座標と補正式があればすぐにできる。まず今の配置のκを計算し、改善の余地が大きい層を見つける。' },
  ], MARGIN_X + 0.25, 6.1, CONTENT_W - 0.5, 0.65, { fontSize: 12, valign: 'middle' });
}

// =====================================================================
// 22. 必要なもの
// =====================================================================
{
  const slide = newContentSlide('必要なもの', '必要なもの：候補の一覧・補正式・過去データ・計算ツール・体制', [
    '必要なものを4つにまとめました。',
    'データとして、ターゲットの候補の座標と、使える・使えないの情報、今の計測レシピの配置、そして過去の密な計測データが要ります。密な計測データは、Step 3のR2Rシミュレーションに使います。',
    '補正式は、使っているメーカーの式と、実際に使っているkの項、ウェーハ面内の式の次数です。',
    'ツールは、社内の環境で動くMATLABかPythonで作ります。計算は軽く、専用の計算機はいりません。装置メーカーのツール、たとえばASMLのTLOが使えるなら、併用して結果を突き合わせます。',
    '体制としては、計測とリソのエンジニア、計測レシピを変更するときの承認が必要です。',
  ]);
  const cards = [
    ['データ', ['ターゲットの候補の座標と、使える・使えない（品質）', '今の計測レシピの配置', '過去の密な計測データ（R2Rシミュレーション用）']],
    ['補正式', ['使っているメーカーの式と、実際に使っているkの項', 'ウェーハ面内の式の次数', 'CPE・ゾーン補正の有無']],
    ['計算ツール', ['社内の環境で動く MATLAB または Python（点交換法・κ・κマップ）', '計算は軽く、専用の計算機は不要', '装置メーカーのツール（ASMLのTLOなど）があれば併用して突き合わせる']],
    ['体制', ['計測・リソのエンジニア（候補の整理と評価）', '計測レシピ変更の承認', '試行する層の担当']],
  ];
  const cw = (CONTENT_W - 0.6) / 4;
  cards.forEach(([h, items], i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    addCard(slide, x, 1.6, cw, 3.7, { fill: i === 2 ? C.tealTint : C.gray });
    addNode(slide, x + 0.4, 2.05, 0.5, C.teal, String(i + 1), { fontSize: 14 });
    addText(slide, h, x + 0.78, 1.8, cw - 0.9, 0.5, { fontSize: 15, bold: true, valign: 'middle' });
    addBullets(slide, items, x + 0.22, 2.6, cw - 0.44, 2.6, { fontSize: 11.5, space: 7 });
  });
  addCard(slide, MARGIN_X, 5.5, CONTENT_W, 0.8, { fill: C.goldTint });
  addText(slide, [
    { text: '社内の環境で動かす：', bold: true, color: C.goldDark },
    { text: 'ツールは社内のMATLAB・Pythonで動く形で作る。計算に使うのは候補の座標と補正式だけなので、社外へデータを出す必要はない。' },
  ], MARGIN_X + 0.25, 5.5, CONTENT_W - 0.5, 0.8, { fontSize: 11.5, valign: 'middle' });
}

// =====================================================================
// 23. 判定の基準・KPI
// =====================================================================
{
  const slide = newContentSlide('判定の基準', '判定の基準：κで選び、残差と安定性で確かめ、計測時間で効果を測る', [
    '判定の基準です。',
    '配置を選ぶ段階では、κの平均と最悪点で採点し、取り残しを含めた補正誤差と、1点欠けたときの悪化も確かめます。',
    '過去データで確かめる段階と試行の段階では、補正後の残差、つまり平均の絶対値と3シグマの和と、ロット間の補正値のばらつき、つまりR2Rの安定性を見ます。STの報告では、計測レイアウトがロット間のばらつきに影響していました。',
    '効果は、計測点数と計測時間で測ります。',
    '採用の条件は、今と同じか小さい残差で点数を減らせること、または同じ点数で残差が下がることです。',
  ]);
  const header = [headCell('指標', C.cmp3), headCell('何を見るか', C.cmp3), headCell('いつ見るか', C.cmp3, { align: 'center' })];
  const rows = [
    ['κ（平均・最悪点）', '配置の良さ。計測前に計算できる', 'Step 1・2'],
    ['取り残しを含む補正誤差', '補正式にない形への強さ（スライド16）', 'Step 2・3'],
    ['1点欠けたときのκ', '計測点の欠けへの強さ（スライド17）', 'Step 2'],
    ['補正後の残差（|平均|+3σ）', '実際の精度（外周・内側別も）', 'Step 3・4'],
    ['ロット間の補正値のばらつき', 'R2Rの安定性（レイアウトが影響する：ST 2020）', 'Step 3・4'],
    ['計測点数・計測時間', 'コスト（効果の大きさ）', 'Step 4・5'],
  ].map(([a, b, c], i) => [bodyCell(a, { bold: true }), bodyCell(b), bodyCell(c, { align: 'center', fill: { color: i < 3 ? C.tealTint : C.white } })]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, 8.3, [3.0, 3.9, 1.4], { rowH: [0.42, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], fontSize: 11.5 });
  const rx = 9.2;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.6, rw, 4.0, { fill: C.goldTint });
  addText(slide, '採用の条件', rx + 0.2, 1.7, rw - 0.4, 0.3, { fontSize: 13, bold: true, color: C.goldDark });
  addBullets(slide, [
    '今と同じか小さい残差で、点数（計測時間）を減らせる',
    'または、同じ点数で残差が下がる',
    'ロット間の補正値のばらつきが増えない',
    '1点欠けたときの悪化が小さい（目安：1割以内）',
  ], rx + 0.2, 2.08, rw - 0.4, 3.4, { fontSize: 11.5, space: 6 });
  addSource(slide, cite('duclaux2020'));
}

// =====================================================================
// 24. リスクと対策
// =====================================================================
{
  const slide = newContentSlide('リスクと対策', 'リスクと対策：式が合っていない・点が欠ける・配置を変えた直後の変動', [
    'リスクと対策です。',
    '1つ目は、補正式にない形がある場合で、I最適はかえって不利になることがあります。過去データの取り残しとσを使って、格子とI最適を補正誤差の合計で比べます。',
    '2つ目は、ターゲットの品質で、外周の誤測定などがあります。品質の悪いターゲットは候補から外すか、重みを下げます。',
    '3つ目は点の欠けで、項数の2倍以上の点を置き、欠けたときのκを事前に確かめます。',
    '4つ目は、配置を変えた直後のR2Rの変動です。STの報告では、計測レイアウトがロット間のばらつきに影響していました。切り替えは段階的に行い、切り替え時には補正の履歴の扱いを決めておきます。',
    '5つ目は、補正式やkのオプションの変更で、最適な配置は式で変わるので、変わったら計算し直します。',
    '6つ目は、号機や計測器の間の差です。同じ配置で号機間を比べ、Shot内高次補正を使う重要な層では、STの報告のように計測器を限定することも考えます。',
  ]);
  const header = [headCell('リスク', C.cmp3), headCell('起きること', C.cmp3), headCell('対策', C.teal)];
  const rows = [
    ['補正式にない形がある', 'I最適がかえって不利になる（Shot内）', '取り残しとσを使い、格子とI最適を補正誤差の合計で比べる'],
    ['ターゲットの品質', '外周の誤測定などで、選んだ点が使えない', '品質の悪いターゲットは候補から外す・重みを下げる（親資料⑤）'],
    ['計測点の欠け', '項数ぎりぎりだと、1点欠けで大きく悪化', '項数の2倍以上の点を置く。欠けたときのκを事前に確かめる'],
    ['配置を変えた直後の変動', 'ロット間の補正値がばらつく（ST 2020）', '段階的に切り替え、切り替え時の補正の履歴の扱いを決める'],
    ['補正式・kのオプションの変更', '最適な配置が変わる', '式が変わったら計算し直す。配置の管理ルールに入れる'],
    ['号機・計測器の間の差', '同じ配置でも号機・計測器で結果が違う', '同じ配置で号機間を比べる。重要な層は計測器を限定する（ST 2020）'],
  ].map(([a, b, c]) => [bodyCell(a, { bold: true }), bodyCell(b, { color: C.muted }), bodyCell(c)]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [2.8, 4.1, 5.23], { rowH: [0.42, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66], fontSize: 11.5 });
  addSource(slide, cite('duclaux2020'));
}

// =====================================================================
// 25. 組み合わせ
// =====================================================================
{
  const slide = newContentSlide('組み合わせ', '親資料の他の提案や、以前の検討と組み合わせると効果が重なる', [
    '親資料の他の提案や、以前の検討と組み合わせると、効果が重なります。',
    '以前の検討の正則化とは、正則化を入れたκで配置を最適化すれば、同時に使えます。',
    '制御最適化の外周だけCPEとは、内側のウェーハの式の点をI最適にし、外周は全点を測る形で組み合わせます。Nanyaの2009年の報告でも、中心は高次補正、外周はCPEとし、サンプリングを最適化して計測時間を50%以上減らしています。',
    '計測最適化の時間方向の頻度とは、まず配置を決め、そのあと頻度を決めます。ローテーションでは、各ロットの点もI最適にできます。',
    '少ないkで効かせる提案とは、先に項を選び、そのあと配置を最適化します。項が変われば配置も変わります。',
    '仮想測定とは、予測の不確かさが大きい場所に点を置く、という同じ考え方でつながります。アライメントのマークの選び方にも同じ計算が使えます。',
  ]);
  const cards = [
    ['正則化（以前の検討）', 'L2正則化で必要な点数が減る。正則化を入れたκで配置を最適化すれば同時に使える'],
    ['外周だけCPE（①）', '内側のウェーハの式の点をI最適にし、外周は全点を測る。中心は高次補正・外周はCPEで計測時間50%以上減の報告（Nanya 2009）'],
    ['時間方向の頻度（②）', '配置を決めてから頻度を決める。ローテーションの各ロットの点もI最適にできる'],
    ['少ないkで効かせる（①）', '先に項を選び（交差検証つきLassoなど）、そのあと配置を最適化する。項が変われば配置も変わる'],
    ['仮想測定（④）', '予測の不確かさが大きい場所に点を置く。κマップと同じ考え方'],
    ['アライメント（②追加④）', '露光機のアライメントマークの選び方にも同じ計算が使える。点数はスループットに効く（UMC 2018）'],
  ];
  const cw = (CONTENT_W - 0.4) / 3;
  const ch = 2.3;
  cards.forEach(([h, b], i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.2);
    const y = 1.6 + Math.floor(i / 3) * (ch + 0.2);
    addStepCard(slide, x, y, cw, ch, i + 1, h, b, { fill: i === 0 ? C.tealTint : C.gray, bodySize: 11.5 });
  });
  addSource(slide, cite('huang2009', 'ehrlich2025', 'chen2018'));
}

// =====================================================================
// 26. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.7, 6, 0.6, { fontSize: 30, bold: true, color: C.white });
  const points = [
    ['計測点の置き方を、補正式から計算して決める', '基準はノイズが補正に乗る倍率κ。計測値を使わず、点の配置と補正式だけで計算できる（以前の検討のκを再現して確認済み）。'],
    ['効果は場面で違う', `Shot端を含む格子はもともと良く、I最適でも1割弱の削減。式が格子に合わない場合（Canon式−${pct(cutRatio(CANON.n_same_as_grid77))}）、端の抜けや偏りがある場合（−${pct(strideCutMin)}〜−${pct(strideCutMax)}）、ウェーハ面内のShot選び（Shot−${pct(waferShotCut)}）で大きく効く。`],
    ['採用前に、取り残しと欠けを確かめる', `Shot内では式にない形があると格子が有利な場合がある（σ約${f2(crossNikon)} nm以下）。点数は項数の2倍以上を目安にする。`],
    ['次の一歩は、今の配置のκの計算', '計測データは不要。改善の余地が大きい層を見つけ、過去データのR2Rシミュレーション、1層での試行へ進む。'],
  ];
  points.forEach(([h, b], i) => {
    const y = 1.6 + i * 1.3;
    addNode(slide, 1.1, y + 0.3, 0.52, 'E7C878', String(i + 1), { color: C.night, fontSize: 15 });
    addText(slide, h, 1.6, y, 10.9, 0.44, { fontSize: 17, bold: true, color: C.white, valign: 'middle' });
    addText(slide, b, 1.6, y + 0.46, 10.9, 0.78, { fontSize: 12.5, color: C.onDark });
  });
  addText(slide, '合成データの数値は考え方の確認用。効果の大きさは自社のデータで検証が必要', 0.8, 6.85, 11, 0.3, { fontSize: 11, color: C.onDarkSub });
  slide.addNotes([
    'まとめです。',
    '1つ目、計測点の置き方を、経験則ではなく補正式から計算して決めることを提案します。基準のκは計測値を使わずに計算でき、以前の検討の値も再現できています。',
    '2つ目、効果は場面で違います。Shot端を含む格子はもともと良い配置なので、そこからの削減は1割弱です。補正式が格子に合っていない場合、今の配置に端の抜けや偏りがある場合、ウェーハ面内のShot選びでは、大きな効果があります。',
    '3つ目、採用する前に、補正式にない形の取り残しと、計測点が欠けたときの悪化を確かめます。点数は項数の2倍以上を目安にします。',
    '4つ目、次の一歩は、今の配置のκの計算です。計測データがいらないので、すぐに始められます。',
  ].join('\n'));
}

// =====================================================================
// 27. 付録：数式
// =====================================================================
{
  const slide = newContentSlide('付録', '付録：κ・最適化の基準・点交換法の式', [
    '付録として、計算に使った式をまとめました。',
    '予測の分散は、補正式の項を並べたベクトルと、計測点の設計行列から計算します。κの2乗は、評価点で平均した予測の分散を、X方向とY方向の式で平均したものです。',
    'D最適は情報行列の行列式を最大に、I最適は情報行列の逆行列と評価点の行列の積のトレースを最小に、G最適は予測の分散の最大値を最小にします。',
    '点交換法では、1点を外した行列の逆行列から、候補を1つ加えたときのI最適の値を、行列の公式で一度に計算できます。',
    '取り残しは、式にない項の係数を正規乱数としたときの期待値を、式で計算しました。',
  ]);
  const rows = [
    ['予測の分散', 'Var[補正(x)] ＝ σ^{2} f(x)^{T}(X^{T}X)^{-1}f(x)　（f：補正式の項のベクトル、X：計測点の設計行列）'],
    ['κ', 'κ^{2} ＝（1/2）Σ_{軸} tr((X^{T}X)^{-1}W)、W ＝（1/G）Σ_{g} f(x_{g})f(x_{g})^{T}　（G：評価点の数、軸：X・Y）'],
    ['D最適', 'det(X^{T}X) を最大にする（X・Yの式の積）'],
    ['I最適', 'tr((X^{T}X)^{-1}W) を最小にする（X・Yの式の和）＝ κを最小にする'],
    ['G最適', '評価点での f(x)^{T}(X^{T}X)^{-1}f(x) の最大値を最小にする'],
    ['点交換法', 'A ＝ 1点を外した X^{T}X、u ＝ A^{-1}f_{j} のとき、候補 j を加えた I の値 ＝ tr(A^{-1}W) − u^{T}Wu ÷（1 ＋ f_{j}^{T}u）'],
    ['取り残し', 'E[取り残し^{2}] ＝ s^{2}‖T_{eval} − E(X^{T}X)^{-1}X^{T}T‖^{2} ÷ G　（T：式にない項の行列、s：係数の大きさ）'],
  ].map(([a, b]) => [bodyCell(a, { bold: true }), bodyCell(b)]);
  addTableBox(slide, [[headCell('項目', C.cmp3), headCell('式', C.cmp3)], ...rows], MARGIN_X, 1.6, CONTENT_W, [1.6, 10.53], { rowH: [0.42, 0.62, 0.62, 0.5, 0.5, 0.5, 0.62, 0.62], fontSize: 12 });
  addText(slide, '計算の実装：demo_sampling_design.py（生成元フォルダ）。D最適・I最適の一般的な説明は、既存資料「実験計画法（最適計画・ラテン方格・スクリーニング）」', MARGIN_X, 6.35, CONTENT_W, 0.4, { fontSize: 10.5, color: C.muted });
}

// =====================================================================
// 28. 付録：用語集
// =====================================================================
{
  const slide = newContentSlide('付録', '用語集：この資料で使った主な言葉', [
    'この資料で使った主な言葉の意味をまとめました。',
    'κは、この資料の中心の量で、ノイズが補正に乗る倍率です。ASMLのTLOのnMUと同じ種類の量です。',
  ]);
  const terms = [
    ['κ（カッパ）', 'ノイズが補正に乗る倍率。面内で平均した予測の標準偏差 ÷ 計測のばらつきσ'],
    ['κマップ・最悪点', '面内の各点での予測のぶれ ÷ σ。その最大値が最悪点'],
    ['取り残し', '補正式で表せない形。補正しても残る誤差'],
    ['D最適', 'kパラメータの推定のばらつきをまとめて小さくする配置'],
    ['I最適', '面内で平均した補正のぶれ（κ）を最小にする配置'],
    ['G最適', '面内で最も大きい補正のぶれを最小にする配置'],
    ['点交換法', '点を1つずつ、基準が最もよくなる候補に入れ替えて改善する方法'],
  ];
  const terms2 = [
    ['Shot端を含む格子', 'Shotの端から端まで等間隔に置いた点の格子'],
    ['散らばるように選ぶ', '中心から、既に選んだ点から最も遠い点を順に選ぶ経験則'],
    ['nMU', '正規化モデル不確かさ。σ_{model} ÷ σ_{measure}（ASMLのTLO）'],
    ['iHOPC', 'Shot内の高次の補正（intrafield High Order Process Correction）'],
    ['CPE', 'Shotごとに個別の補正値を持たせる補正（Correction Per Exposure）'],
    ['R2Rシミュレーション', '過去のデータで、補正と計測の方法を再現して比べること'],
    ['スクライブ', 'ダイやShotの間の、ターゲットを置く細い領域'],
  ];
  const half = (CONTENT_W - 0.3) / 2;
  [terms, terms2].forEach((list, k) => {
    const rows = list.map(([a, b]) => [bodyCell(a, { bold: true }), bodyCell(b)]);
    addTableBox(slide, [[headCell('用語', C.cmp3), headCell('意味', C.cmp3)], ...rows], MARGIN_X + k * (half + 0.3), 1.6, half, [1.95, half - 1.95], { rowH: 0.56, fontSize: 11 });
  });
}

// =====================================================================
// 29. 付録：参考文献
// =====================================================================
{
  const slide = newContentSlide('付録', '参考文献', [
    'この資料で引用した文献の一覧です。いずれも手元の論文ライブラリにある公開論文で、本文を読んで内容と数値を確認しました。',
    '合成データの試算は、この資料のために作成したもので、生成元のスクリプトと数値は資料と同じフォルダの _src に置いています。',
  ]);
  const runs = [];
  REFERENCES.forEach((r, i) => {
    runs.push({ text: `[${i + 1}] `, options: { bold: true, color: C.goldDark } });
    runs.push({ text: r.text, options: { breakLine: i < REFERENCES.length - 1 } });
  });
  slide.addText(runs, {
    x: MARGIN_X, y: 1.55, w: CONTENT_W, h: 4.7,
    fontFace: FONT, fontSize: 10.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP', paraSpaceAfter: 6,
  });
  addText(slide, '親資料：重ね合わせ精度とコストの両立_技術進化コンセプトと具体案.pptx（スライド14）。以前の検討：Shot高次補正の回帰手法と、計測点数・計測ノイズ・L2正則化の評価（2026年9月）。既存資料：実験計画法（最適計画・ラテン方格・スクリーニング）', MARGIN_X, 6.3, CONTENT_W, 0.5, { fontSize: 10, color: C.muted });
  addText(slide, '合成データの試算：本資料のために作成（demo_sampling_design.py → demo_results.json）。社内のデータは使っていない', MARGIN_X, 6.78, CONTENT_W, 0.26, { fontSize: 10, color: C.muted });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => {
  console.log(`書き出し: ${file}（${pageNumber}枚）`);
});
