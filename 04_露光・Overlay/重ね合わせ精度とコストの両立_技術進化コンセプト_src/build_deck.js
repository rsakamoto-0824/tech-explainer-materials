// 重ね合わせ精度とコストの両立：6つの技術観点による技術進化のコンセプトと具体案
// pptxgenjs でスライドを組み立てる。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// デモの数値は demo_results.json（demo_overlay_cost.py の出力）から読む。文献の数値は各スライドに出典を示す。

const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const BASE_DIR = __dirname;
const OUTPUT_PATH = process.argv[2] || path.join(BASE_DIR, 'deck_raw.pptx');
const demo = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'demo_results.json'), 'utf8'));

// ---- 定数 ----
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const FONT = 'BIZ UDGothic';
const DECK_DATE = '2026年9月28日';
const TITLE_FONT_SIZE = 22;
const BODY_FONT_SIZE = 13;
const SOURCE_Y = 6.97;
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
  gold: 'C8962E',
  goldTint: 'F8EDD5',
  goldDark: '8A6414',
  cmp1: 'C3C9D5',
  cmp2: '9AA3B5',
  cmp3: '5B6275',
};

// 6つの技術観点。色はスライド右上の目印・見出し・図の強調に使う
const DOMAINS = [
  { no: '①', name: '制御最適化', color: '2B59A3', tint: 'E3EAF6', role: '少ない自由度で効かせる' },
  { no: '②', name: '計測最適化', color: '12877A', tint: 'DCF0ED', role: '測る場所と頻度を絞る' },
  { no: '③', name: '傾向監視', color: 'B8791A', tint: 'F6EBD7', role: '変化の構造を知る' },
  { no: '④', name: '仮想測定', color: '7550B0', tint: 'ECE5F6', role: '測らずに知る' },
  { no: '⑤', name: '異常検知', color: 'BF3F36', tint: 'F7E1DF', role: '誤った補正を入れない' },
  { no: '⑥', name: '測定技術', color: '4D8A34', tint: 'E4F0DC', role: '1回の計測から多くを知る' },
];
const [D1, D2, D3, D4, D5, D6] = DOMAINS;

// ---- 参考文献（本文の出典は短縮形で示し、最後のスライドに一覧を載せる） ----
const REFERENCES = [
  { key: 'bozdog2026', short: 'Bozdog ほか（Micron・ASML, 2026）', text: 'Bozdog C. ほか（Micron・ASML）, "Beyond Overlay: Additional Parameters Extracted from Overlay Metrology Measurements," Proc. SPIE 13981, 139811Q (2026). doi:10.1117/12.3092351' },
  { key: 'ehrlich2025', short: 'Ehrlich ほか（KLA, 2025）', text: 'Ehrlich C. ほか（KLA）, "Cherry-picking: Automated model term selection for precise overlay and CD process control," Proc. SPIE 13426, 134260U (2025). doi:10.1117/12.3051064' },
  { key: 'mohammad2026', short: 'Mohammad ほか（KLA, 2026）', text: 'Mohammad S. N. ほか（KLA）, "Leveraging principal component analysis for overlay variation and root cause discovery in high-volume manufacturing," Proc. SPIE 13981, 139813U (2026). doi:10.1117/12.3090685' },
  { key: 'overcast2018', short: 'Overcast ほか（IM Flash, 2018）', text: 'Overcast M. ほか（IM Flash ほか）, "Understanding overlay signatures using machine learning on non-lithography context information," Proc. SPIE 10585, 105851U (2018). doi:10.1117/12.2303487' },
  { key: 'lee2017topo', short: 'Lee ほか（SK hynix, 2017a）', text: 'Lee H. ほか（SK hynix ほか）, "Topography based wafer clustering for wafer level overlay correction," Proc. SPIE 10145, 101450Q (2017). doi:10.1117/12.2259858' },
  { key: 'ham2024', short: 'Ham ほか（SK hynix, 2024）', text: 'Ham S. ほか（SK hynix ほか）, "Device overlay root cause process detection using patterned wafer geometry information," Proc. SPIE 12955, 129551D (2024). doi:10.1117/12.3008290' },
  { key: 'park2025', short: 'Park ほか（Gauss Labs, 2025）', text: 'Park W. ほか（Gauss Labs ほか）, "A Grid Mapping-based U-Net Algorithm for Photolithography Overlay Virtual Metrology," Proc. SPIE 13426, 134260K (2025). doi:10.1117/12.3051382' },
  { key: 'chiu2012', short: 'Chiu ほか（Nanya, 2012）', text: 'Chiu C.-F. ほか（Nanya ほか）, "Impacts of Overlay Correction Model and Metrology Sampling Scheme on Device Yield," Proc. SPIE 8324, 83241S (2012). doi:10.1117/12.916601' },
  { key: 'duclaux2020', short: 'Duclaux ほか（ST, 2020）', text: 'Duclaux B. ほか（STMicroelectronics）, "Run to run and model variability of overlay high order process corrections for mean intrafield signatures," Proc. SPIE 11325, 113251K (2020). doi:10.1117/12.2551062' },
  { key: 'schelcher2024', short: 'Schelcher ほか（imec, 2024）', text: 'Schelcher G. ほか（imec ほか）, "Feature grouping to enable edge placement error-aware process control in multi-feature logic use case," Proc. SPIE 12955, 129550O (2024). doi:10.1117/12.3010421' },
  { key: 'lee2026', short: 'Lee ほか（Samsung, 2026）', text: 'Lee H. J. ほか（Samsung ほか）, "Edge placement error-aware overlay optimization in an HVM FLASH multi-layer product stack," Proc. SPIE 13981, 139811C (2026). doi:10.1117/12.3089745' },
  { key: 'kwak2023', short: 'Kwak ほか（Samsung, 2023）', text: 'Kwak I. ほか（Samsung ほか）, "EPE-aware process optimization for scanner dose and overlay in DRAM use case," Proc. SPIE 12496, 124960N (2023). doi:10.1117/12.2658274' },
  { key: 'ko2025', short: 'Ko ほか（Samsung, 2025）', text: 'Ko B. ほか（Samsung ほか）, "Budget analysis on dual layer edge placement error in logic devices," Proc. SPIE 13426, 134260J (2025). doi:10.1117/12.3049046' },
  { key: 'klein2026', short: 'Klein・Gutman（KLA, 2026）', text: 'Klein D., Gutman N.（KLA）, "Overlay metrology performance specification challenge entering the sub-nanometer overlay era," Proc. SPIE 13981, 139813L (2026). doi:10.1117/12.3090660' },
  { key: 'park2018', short: 'Park ほか（SK hynix, 2018）', text: 'Park D.-K. ほか（SK hynix・ASML）, "Unique method for controlling device level overlay with high NA optical overlay technique using YieldStar in a DRAM HVM environment," Proc. SPIE 10585, 105850V (2018). doi:10.1117/12.2297094' },
  { key: 'lee2017hvm', short: 'Lee ほか（SK hynix, 2017b）', text: 'Lee H. ほか（SK hynix ほか）, "High-Volume Manufacturing Device Overlay Process Control," Proc. SPIE 10145, 101450D (2017). doi:10.1117/12.2257836' },
  { key: 'chang2022', short: 'Chang ほか（Macronix, 2022）', text: 'Chang L.-T. ほか（Macronix ほか）, "In device overlay control with multiple overlay metrology in 3D-NAND process," Proc. SPIE 12053, 120531P (2022). doi:10.1117/12.2613193' },
  { key: 'kim2024', short: 'Kim ほか（Samsung, 2024）', text: 'Kim M. ほか（Samsung）, "A few-shot machine learning-based OCD metrology algorithm with anomaly detection and wafer-level data augmentation," Proc. SPIE 12955, 129550U (2024). doi:10.1117/12.3009965' },
  { key: 'kim2026', short: 'Kim ほか（Gauss Labs, 2026）', text: 'Kim D. ほか（Gauss Labs ほか）, "A virtual metrology-driven tool-to-tool matching: Toward early anomaly detection and diagnosis," Proc. SPIE 13981, 1398107 (2026). doi:10.1117/12.3087531' },
  { key: 'ullah2013', short: 'Ullah ほか（Micron, 2013）', text: 'Ullah M. Z. ほか（Micron ほか）, "An Investigation of High-Order Process Correction Models and Techniques to Improve Overlay Control by Using Multiple-Pass Cascading Analysis at an Advanced Technology Node," Proc. SPIE 8681, 86813A (2013). doi:10.1117/12.2011448' },
  { key: 'huang2012', short: 'Huang ほか（Nanya, 2012）', text: 'Huang C.-Y. ほか（Nanya ほか）, "Overlay control methodology comparison: field-by-field and high-order methods," Proc. SPIE 8324, 832427 (2012). doi:10.1117/12.916427' },
  { key: 'ju2016', short: 'Ju ほか（SK hynix, 2016）', text: 'Ju J. ほか（SK hynix ほか）, "Application of Overlay Modeling and Control with Zernike Polynomials in an HVM Environment," Proc. SPIE 9778, 977825 (2016). doi:10.1117/12.2219739' },
  { key: 'vaglio2025', short: 'Vaglio Pret ほか（KLA, 2025）', text: 'Vaglio Pret A. ほか（KLA ほか）, "Compensation of lens aberration induced overlay by computational metrology," Proc. SPIE 13426, 134262V (2025). doi:10.1117/12.3051559' },
  { key: 'chen2018', short: 'Chen ほか（UMC, 2018）', text: 'Chen C. ほか（UMC ほか）, "Higher order intra-field alignment for intra-wafer lens and reticle heating control," Proc. SPIE 10585, 105851R (2018). doi:10.1117/12.2297358' },
  { key: 'kim2023', short: 'Kim ほか（SK hynix, 2023）', text: 'Kim H. ほか（SK hynix ほか）, "Enhancement of overlay metrology accuracy by multi-wavelength scatterometry with rotated quadrupole illumination," Proc. SPIE 12496, 1249620 (2023). doi:10.1117/12.2657678' },
  { key: 'cho2026', short: 'Cho ほか（Samsung, 2026）', text: 'Cho J.-Y. ほか（Samsung）, "Overcoming conventional limit of process variation by using virtual metrology with mass-based monitoring in V-NAND," Proc. SPIE 13981, 1398106 (2026). doi:10.1117/12.3085527' },
  { key: 'choi2026', short: 'Choi ほか（Gauss Labs, 2026）', text: 'Choi H. ほか（Gauss Labs ほか）, "GRACE: a gradient-based model-agnostic explainability framework for photolithography overlay virtual metrology," Proc. SPIE 13981, 1398138 (2026). doi:10.1117/12.3089595' },
  { key: 'graff2023', short: 'Graff ほか（2023）', text: 'Graff N., Hanasusanto G. A., Djurdjanović D., "Robust control of maximum photolithography overlay error in a pattern layer," CIRP Annals 72(1), 429–432 (2023). doi:10.1016/j.cirp.2023.03.015（抄録で確認）' },
  { key: 'boese2026', short: 'Boese ほか（KLA, 2026）', text: 'Boese S. ほか（KLA ほか）, "ML-Driven Context Monitoring for Inline CDU Error Analysis," Proc. SPIE 13981, 139810O (2026). doi:10.1117/12.3090700' },
  { key: 'doutt2023', short: 'Doutt ほか（Intel, 2023）', text: 'Doutt D. ほか（Intel ほか）, "Full wafer OCD metrology: increasing sampling rate without the cost of ownership penalty," Proc. SPIE 12496, 124960B (2023). doi:10.1117/12.2657471' },
];
const REF = Object.fromEntries(REFERENCES.map((r) => [r.key, r]));

function cite(...keys) {
  keys.forEach((k) => { if (!REF[k]) throw new Error(`参考文献のキーがありません: ${k}`); });
  return `出典：${keys.map((k) => REF[k].short).join('、')}`;
}

// ---- デモの数値 ----
const pct = (v) => `${Math.round(v * 100)}%`;
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

const EDGE = demo.edge_cpe;
const EB = EDGE.base;
const edgePointsCut = 1 - EB.edge_cpe.measured_points / EB.full_cpe.measured_points;
const edgeParamsCut = 1 - EB.edge_cpe.parameters / EB.full_cpe.parameters;
const widthByRadius = Object.fromEntries(EDGE.width_sweep.map((w) => [w.corner_radius_mm, w]));

const MR = demo.multirate;
const MH = MR.headline;
const uniformWorse = MH.half_uniform.error / MH.every_lot.error - 1;
const adaptiveWorse = MH.same_cost_adaptive.error / MH.every_lot.error - 1;
const sameErrorCut = MH.same_error_cost_reduction;

const RANGE = demo.expected_range;
const RANGE_OK = RANGE.cases.model_ok;
const RANGE_NG = RANGE.cases.edge_unmodeled;

const VM = demo.alignment_vm;
const vmAt = (marks) => VM.curve.find((c) => c.marks === marks);
const VM16 = vmAt(16);
const VM96 = vmAt(96);
// 学んだ形の推定が、多項式（5次）96点の誤差（+2%以内）に並ぶ最少の点数
const vmMatch = VM.curve.find((c) => c.latent <= VM96.poly5 * 1.02) || VM16;

const SK = demo.sankey;
function sankeyShare(filterFn, outcome) {
  let hit = 0;
  let total = 0;
  SK.routes.forEach((r) => {
    if (!filterFn(r.route)) return;
    total += r.count;
    if (r.outcome === outcome) hit += r.count;
  });
  return hit / total;
}
const shareEdgeB2 = sankeyShare((r) => r[1] === 'B2', '外周型');
const shareEdgeOther = sankeyShare((r) => r[1] !== 'B2', '外周型');
const shareSaddleA2C2 = sankeyShare((r) => r[0] === 'A2' && r[2] === 'C2', '鞍型');
const shareSaddleOther = sankeyShare((r) => !(r[0] === 'A2' && r[2] === 'C2'), '鞍型');

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせ精度とコストの両立：6つの技術観点による技術進化のコンセプトと具体案';
pres.lang = 'ja-JP';

let pageNumber = 0;

// ---- 文字の補助関数 ----

// "σ_{r}" を下付き、"x^{2}" を上付きのランに変換する
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
    if (content.includes('\n')) runs = toRuns(withBreaks(content.split('\n')));
    else runs = toRuns(content);
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

// 段落の配列を、箇条書き（または通常段落）のランに変換する
function paragraphs(items, { bullet = true, space = 6, indent = 14, color, fontSize, bold } = {}) {
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
    fontFace: FONT, fontSize: BODY_FONT_SIZE, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...textOptions,
  });
}

// 太字の見出し語 + 本文 の1段落
function lead(head, body, headColor) {
  const headOptions = { bold: true };
  if (headColor) headOptions.color = headColor;
  return [{ text: head, ...headOptions }, { text: body }];
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

// 始点・終点から、正の長さと回転角で線を描く（負の幅・高さを使わない）
function addLine(slide, x1, y1, x2, y2, { color = C.line, width = 1.5, dash, arrow = false, beginArrow = false } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const lineOptions = { color, width };
  if (dash) lineOptions.dashType = dash;
  if (arrow) lineOptions.endArrowType = 'triangle';
  if (beginArrow) lineOptions.beginArrowType = 'triangle';
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
    fill: { color }, line: { color: lineColor || color, width: lineColor ? 1 : 0.5 },
  });
}

// 色つきの小さなラベル
function addChip(slide, text, x, y, w, h, { fill = C.cmp3, color = C.white, fontSize = 10.5, bold = true, align = 'center', radius = 0.06 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: fill, width: 0.5 } });
  addText(slide, text, x + 0.03, y, w - 0.06, h, { fontSize, bold, color, align, valign: 'middle' });
}

// メモ由来か追加提案かを示す印
function addOriginTag(slide, kind, x, y) {
  if (kind === 'memo') addChip(slide, 'メモ', x, y, 0.56, 0.26, { fill: C.cmp3, fontSize: 9.5 });
  else addChip(slide, '追加', x, y, 0.56, 0.26, { fill: C.gold, fontSize: 9.5 });
}

// 点の列を折れ線で描く（点はスライド上のインチ座標）
function drawPolyline(slide, pts, { color = C.ink, width = 2, dash } = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - x0, 0.01);
  const h = Math.max(Math.max(...ys) - y0, 0.01);
  const line = { color, width };
  if (dash) line.dashType = dash;
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: x0, y: y0, w, h, points: pts.map(([x, y]) => ({ x: x - x0, y: y - y0 })), line,
  });
}

// 閉じた多角形を塗る
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

// 数値の軸を持つ折れ線図（系列ごとに別のX値を持てるよう、図形で描く）
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
    const pts = s.points.map(([x, y]) => [px(x), py(y)]);
    if (s.line !== false && pts.length > 1) drawPolyline(slide, pts, { color: s.color, width: s.width || 2, dash: s.dash });
    if (s.markers) pts.forEach(([x, y]) => addDot(slide, x, y, s.markerSize || 0.09, s.color, { lineColor: s.markerLine }));
  });
  return { px, py };
}

// 図の凡例（線・点・四角）
function addLegend(slide, items, x, y, { fontSize = 10.5, gap = 0.22, itemW } = {}) {
  let cx = x;
  items.forEach((item) => {
    if (item.kind === 'box') {
      addRect(slide, cx, y + 0.05, 0.22, 0.16, { fill: item.color, line: item.lineColor, transparency: item.transparency });
    } else if (item.kind === 'dot') {
      addDot(slide, cx + 0.11, y + 0.13, 0.12, item.color);
    } else {
      addLine(slide, cx, y + 0.13, cx + 0.3, y + 0.13, { color: item.color, width: 2.25, dash: item.dash });
    }
    const width = itemW || item.width || 1.4;
    addText(slide, item.label, cx + 0.36, y, width, 0.26, { fontSize, color: C.ink, valign: 'middle' });
    cx += 0.36 + width + gap;
  });
}

// ---- ウェーハの図 ----

const CIRCLE_POLYGON = Array.from({ length: 180 }, (_, i) => {
  const a = (2 * Math.PI * i) / 180;
  return [WAFER_RADIUS_MM * Math.cos(a), WAFER_RADIUS_MM * Math.sin(a)];
});

// 凸多角形でのクリップ（Sutherland–Hodgman）。座標は mm（上が +y）、clip は反時計回り
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

// ショットをウェーハの円で切り取って描く。style(shot) が {fill, transparency, line} を返す
function drawWafer(slide, cx, cy, radiusIn, shots, style, { outline = C.muted } = {}) {
  const scale = radiusIn / WAFER_RADIUS_MM;
  const toSlide = ([x, y]) => [cx + x * scale, cy - y * scale];
  shots.forEach((shot) => {
    const x0 = shot.x - SHOT_W_MM / 2;
    const x1 = shot.x + SHOT_W_MM / 2;
    const y0 = shot.y - SHOT_H_MM / 2;
    const y1 = shot.y + SHOT_H_MM / 2;
    const clipped = clipPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], CIRCLE_POLYGON);
    if (clipped.length < 3) return;
    const s = style(shot);
    drawPolygon(slide, clipped.map(toSlide), { fill: s.fill, transparency: s.transparency || 0, line: s.line || C.white, lineWidth: 0.75 });
  });
  slide.addShape(pres.shapes.OVAL, {
    x: cx - radiusIn, y: cy - radiusIn, w: radiusIn * 2, h: radiusIn * 2,
    line: { color: outline, width: 1.25 },
  });
  return { toSlide, scale };
}

// ---- スライド共通 ----

// 右上に6つの領域の目印を並べ、今どの領域の話かを示す
function addDomainTracker(slide, activeIndex) {
  const x0 = 10.28;
  const step = 0.44;
  const y = 0.5;
  DOMAINS.forEach((d, i) => {
    const active = i === activeIndex;
    const size = active ? 0.36 : 0.27;
    slide.addShape(pres.shapes.OVAL, {
      x: x0 + i * step - size / 2, y: y - size / 2, w: size, h: size,
      fill: { color: active ? d.color : d.tint }, line: { color: d.color, width: active ? 1.25 : 0.75 },
    });
    addText(slide, String(i + 1), x0 + i * step - size / 2, y - size / 2, size, size, {
      fontSize: active ? 12 : 9.5, bold: true, color: active ? C.white : d.color, align: 'center', valign: 'middle',
    });
  });
}

function newContentSlide(kicker, title, notes, { domainIndex } = {}) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  const domain = domainIndex !== undefined ? DOMAINS[domainIndex] : null;
  const accent = domain ? domain.color : C.goldDark;
  addDot(slide, MARGIN_X + 0.08, 0.5, 0.15, accent);
  addText(slide, kicker, MARGIN_X + 0.28, 0.35, 9.2, 0.3, { fontSize: 12, bold: true, color: accent, charSpacing: 1, valign: 'middle' });
  addText(slide, title, MARGIN_X, 0.72, CONTENT_W, 0.62, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (domain) addDomainTracker(slide, domainIndex);
  if (notes) slide.addNotes(notes.join('\n'));
  return slide;
}

// 出典（ページ番号の左側、2行まで）
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

// セルの文字をランに変換する（"\n" は段落内の改行、"_{}"・"^{}" は下付き・上付き）
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

// 提案カード：番号・見出し・本文・出典。kind は 'memo'（メモ由来）か 'add'（追加提案）
function addProposalCard(slide, x, y, w, h, { domain, kind, num, title, body, source, bodySize = 12, titleSize = 14 }) {
  addCard(slide, x, y, w, h, { fill: C.gray });
  addNode(slide, x + 0.32, y + 0.33, 0.4, domain.color, String(num), { fontSize: 12 });
  addText(slide, title, x + 0.62, y + 0.12, w - 1.35, 0.44, { fontSize: titleSize, bold: true, valign: 'middle' });
  addOriginTag(slide, kind, x + w - 0.68, y + 0.2);
  const sourceH = source ? 0.36 : 0;
  addText(slide, body, x + 0.22, y + 0.66, w - 0.42, h - 0.74 - sourceH, { fontSize: bodySize, lineSpacingMultiple: 1.05 });
  if (source) addText(slide, source, x + 0.22, y + h - 0.4, w - 0.42, 0.32, { fontSize: 8.5, color: C.muted, valign: 'bottom' });
}

// 下向きの凸な曲線（トレードオフ曲線）の点列。u は 0〜1 の「コスト」、戻り値は 0〜1 の「誤差」
function frontier(u, { floor, height, steep }) {
  return floor + height / (1 + steep * u);
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'OVERLAY ACCURACY × COST', 0.8, 1.15, 7.8, 0.35, { fontSize: 13, bold: true, color: 'E7C878', charSpacing: 2 });
  addText(slide, '重ね合わせ精度とコストの両立', 0.8, 1.6, 8.2, 0.95, { fontSize: 38, bold: true, color: C.white, valign: 'middle' });
  addText(slide, '6つの技術観点で進める、技術進化のコンセプトと具体案', 0.8, 2.62, 8.0, 0.5, { fontSize: 19, color: C.onDark });
  addText(slide, 'メモの論点を整理し、各領域に追加の提案を加えた。主要な仮説は合成データで考え方を確かめた', 0.8, 3.18, 8.1, 0.72, { fontSize: 13, color: C.onDarkSub, lineSpacingMultiple: 1.1 });

  // 6つの領域のチップ
  DOMAINS.forEach((d, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 2.5;
    const y = 4.25 + row * 0.56;
    addNode(slide, x + 0.2, y + 0.2, 0.4, d.color, String(i + 1), { fontSize: 12, lineColor: C.white });
    addText(slide, d.name, x + 0.5, y + 0.02, 1.9, 0.36, { fontSize: 14, bold: true, color: C.white, valign: 'middle' });
  });
  addText(slide, `${DECK_DATE}　｜　技術検討資料（メモの整理と追加提案）`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右側：トレードオフ曲線を動かす図
  const bx = 9.1;
  const by = 1.3;
  const bw = 3.5;
  const bh = 3.6;
  addLine(slide, bx, by + bh, bx + bw, by + bh, { color: C.onDarkSub, width: 1.25, arrow: true });
  addLine(slide, bx, by + bh, bx, by, { color: C.onDarkSub, width: 1.25, arrow: true });
  const toPt = (u, v) => [bx + 0.15 + u * (bw - 0.35), by + bh - v * (bh - 0.2)];
  const us = Array.from({ length: 41 }, (_, i) => i / 40);
  const now = us.map((u) => toPt(u, frontier(u, { floor: 0.22, height: 0.62, steep: 5 })));
  const goal = us.map((u) => toPt(u, frontier(u, { floor: 0.1, height: 0.5, steep: 7 })));
  drawPolyline(slide, now, { color: C.onDarkSub, width: 2.25, dash: 'dash' });
  drawPolyline(slide, goal, { color: 'E7C878', width: 3 });
  const a = toPt(0.45, frontier(0.45, { floor: 0.22, height: 0.62, steep: 5 }));
  const b = toPt(0.3, frontier(0.3, { floor: 0.1, height: 0.5, steep: 7 }));
  addLine(slide, a[0], a[1], b[0] + 0.08, b[1] - 0.06, { color: 'E7C878', width: 2, arrow: true });
  addText(slide, '今の曲線', bx + bw - 1.3, now[40][1] - 0.42, 1.3, 0.3, { fontSize: 11, color: C.onDarkSub, align: 'right' });
  addText(slide, '目指す曲線', bx + bw - 1.3, goal[40][1] + 0.08, 1.3, 0.3, { fontSize: 11, bold: true, color: 'E7C878', align: 'right' });
  addText(slide, 'コスト', bx + bw - 1.0, by + bh + 0.08, 1.0, 0.28, { fontSize: 11, color: C.onDarkSub, align: 'right' });
  addText(slide, '重ね合わせ誤差', bx + 0.12, by - 0.36, 2.2, 0.28, { fontSize: 11, color: C.onDarkSub });

  slide.addNotes([
    'この資料は、ラインの重ね合わせ精度とコストのトレードオフを改善するために、6つの技術観点から技術進化のコンセプトと具体案をまとめたものです。',
    '6つの観点は、制御最適化、計測最適化、傾向監視、仮想測定、異常検知、測定技術です。',
    '元になったメモの論点をすべて拾って具体化し、各領域にメモ以外の提案を追加しました。提案カードには、メモ由来か追加提案かの印を付けています。',
    '主要な仮説のうち4つは、合成データで考え方が成り立つかを確かめました。数値は合成データの例で、実際の効果は自社のデータで検証が必要です。',
    '右の図は、精度とコストのトレードオフ曲線を、曲線の上で動くのではなく、曲線そのものを左下へ動かすという、この資料の中心の考え方を表しています。',
  ].join('\n'));
}

// =====================================================================
// 2. 結論
// =====================================================================
{
  const slide = newContentSlide('結論', '結論：曲線の上を動くのではなく、トレードオフ曲線そのものを動かす', [
    '結論から説明します。重ね合わせ精度を上げたいとき、これまでは計測を増やす、補正の項を増やす、オプションを買うといった、コストを払って精度を買う動き方になりがちでした。これはトレードオフ曲線の上を動いているだけです。',
    'この資料で提案するのは、どこを、いつ、何を測って直すかを選ぶことで、曲線そのものを動かすことです。メモの言葉で言えば、必要な制御を必要最小限の計測で実現することです。',
    '選ぶ軸は、空間、時間、自由度の3つで、それを支えるのが、予測、守り、情報密度の3つです。右側に、6つの領域それぞれの役割を1行でまとめました。',
    '下の段は、合成データで考え方を確かめた結果です。外周だけCPEをかける案は、全ShotにCPEをかける案より計測点と補正の項を大きく減らしても誤差が同等以下でした。',
    '計測頻度を領域ごとに変える案は、計測を半分にしたときの誤差の悪化を小さくできました。過去に学んだ形を使う面内推定は、少ない点で多項式の多数点と同じ精度になりました。',
    'いずれも合成データの例なので、効果の大きさは実データで確かめる必要があります。',
  ]);
  // 左：考え方
  addCard(slide, MARGIN_X, 1.55, 5.75, 3.55, { fill: C.night });
  addText(slide, 'コンセプト', MARGIN_X + 0.3, 1.72, 3, 0.3, { fontSize: 12, bold: true, color: 'E7C878' });
  addText(slide, '必要な補正を、必要な場所に、\n必要なタイミングで、\n必要最小限の計測で', MARGIN_X + 0.3, 2.05, 5.25, 1.35, { fontSize: 21, bold: true, color: C.white, lineSpacingMultiple: 1.08 });
  addText(slide, '計測や機能を買い足して精度を上げる（曲線上の移動）のではなく、どこを・いつ・何を測って直すかを選び、予測と守りで支えて、曲線そのものを動かす。', MARGIN_X + 0.3, 3.5, 5.2, 0.85, { fontSize: 12.5, color: C.onDark, lineSpacingMultiple: 1.05 });
  addChip(slide, '選ぶ：空間・時間・自由度', MARGIN_X + 0.3, 4.52, 2.55, 0.36, { fill: 'E7C878', color: C.night, fontSize: 11.5 });
  addChip(slide, '支える：予測・守り・情報密度', MARGIN_X + 2.98, 4.52, 2.55, 0.36, { fill: C.nightCard, color: C.white, fontSize: 11.5 });

  // 右：6つの領域の役割
  const rx = 6.65;
  const rw = RIGHT_EDGE - rx;
  const roles = [
    '少ないkと外周だけのCPEで、効く所だけを直す',
    '変化の速い所は頻繁に、遅い所はまれに測る',
    '面内傾向を成分と工程経路に分け、直す単位を決める',
    '測っていない点・ウェーハを予測し、高次FFにつなぐ',
    '誤測定と装置異常を、補正の前で止める',
    '1回の計測からOVL以外も取り出し、SEMで直接見る',
  ];
  DOMAINS.forEach((d, i) => {
    const y = 1.55 + i * 0.6;
    addCard(slide, rx, y, rw, 0.52, { fill: d.tint });
    addNode(slide, rx + 0.3, y + 0.26, 0.36, d.color, String(i + 1), { fontSize: 11.5 });
    addText(slide, d.name, rx + 0.58, y, 1.3, 0.52, { fontSize: 13, bold: true, color: d.color, valign: 'middle' });
    addText(slide, roles[i], rx + 1.9, y, rw - 2.0, 0.52, { fontSize: 12, valign: 'middle' });
  });

  // 下：合成データでの確認
  addText(slide, '合成データでの確認（考え方の検証。効果の大きさは実データで要確認）', MARGIN_X, 5.3, 9, 0.3, { fontSize: 12, bold: true, color: C.muted });
  const stats = [
    [D1, `−${pct(edgePointsCut)}／−${pct(edgeParamsCut)}`, `外周だけCPE：全ShotにCPEより計測点／補正の項を削減。誤差は同等以下（${f2(EB.edge_cpe.all)} vs ${f2(EB.full_cpe.all)} nm）`],
    [D2, `+${pct(adaptiveWorse)}`, `領域別の計測頻度：計測を半分にしたときの誤差の悪化（一律に間引くと+${pct(uniformWorse)}）`],
    [D4, `${vmMatch.marks}点`, `学習した形で面内推定：多項式（5次）${VM96.marks}点と同等（${f2(vmMatch.latent)} vs ${f2(VM96.poly5)} nm）`],
  ];
  const sw = (CONTENT_W - 0.4) / 3;
  stats.forEach(([d, big, text], i) => {
    const x = MARGIN_X + i * (sw + 0.2);
    addCard(slide, x, 5.66, sw, 1.2, { fill: C.gray });
    addText(slide, big, x + 0.2, 5.74, sw - 0.4, 0.46, { fontSize: 20, bold: true, color: d.color, valign: 'middle' });
    addText(slide, text, x + 0.2, 6.2, sw - 0.36, 0.62, { fontSize: 10.5, color: C.ink });
  });
}

// =====================================================================
// 3. 背景：4種類のコスト
// =====================================================================
{
  const slide = newContentSlide('背景', '背景：精度を上げる打ち手は、どれも4種類のコストを増やす', [
    '背景として、重ね合わせ精度を上げる打ち手がどんなコストを伴うかを整理します。',
    '1つ目は補正機能のコストです。高次のkパラメータやCPEは装置メーカーのオプションで、使う項を増やすほど購入費がかかり、号機ごとにそろえる必要もあります。',
    '2つ目は計測のコストで、計測点とウェーハとロットの掛け算で増えます。計測装置の台数や時間だけでなく、結果待ちで補正が遅れることもコストです。',
    '3つ目は露光のコストです。アライメントのマークを増やすほど露光機の処理能力が落ちます。文献でも、1ショットに複数のマークを測るとスループットへの影響が大きいと述べられています。',
    '4つ目は品質のコストで、誤った補正や変化の見逃しは、再露光や歩留まり低下につながります。',
    '下の段が大事な点で、項や点や頻度を増やせば必ず良くなるわけではありません。高次の項は互いに似た形になって係数が不安定になり、不要な項は制御ループの安定性を下げます。つまり、増やす方向の打ち手には限界があり、選ぶ方向の打ち手が必要になります。',
  ]);
  const cards = [
    ['機能', '補正機能のコスト', '高次のkパラメータやCPEは装置メーカーのオプション。使う項を増やすほど購入費がかかり、号機ごとにそろえる必要もある。'],
    ['計測', '計測のコスト', '計測点×ウェーハ×ロットで増える。計測装置の台数・時間に加え、結果待ちで補正が遅れる時間もコストになる。'],
    ['露光', '露光のコスト', 'アライメントのマークを増やすほど、露光機の処理能力（スループット）が落ちる。1ショットに複数のマークは負担が大きい。'],
    ['品質', '品質のコスト', '誤った補正や変化の見逃しは、再露光（リワーク）や歩留まり低下につながる。まれな外れが大きな損失になる。'],
  ];
  const cw = (CONTENT_W - 0.6) / 4;
  cards.forEach(([icon, title, body], i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    addCard(slide, x, 1.55, cw, 2.45, { fill: C.gray });
    addNode(slide, x + 0.45, 1.98, 0.62, C.gold, icon, { fontSize: 13 });
    addText(slide, title, x + 0.88, 1.72, cw - 1.0, 0.52, { fontSize: 15, bold: true, valign: 'middle' });
    addText(slide, body, x + 0.22, 2.45, cw - 0.42, 1.45, { fontSize: 12, lineSpacingMultiple: 1.05 });
  });

  // 下左：自由度と誤差の関係（U字）
  const bx = MARGIN_X + 0.55;
  const by = 4.55;
  const bw = 4.6;
  const bh = 1.95;
  addText(slide, '重ね合わせ誤差', MARGIN_X, 4.2, 2.5, 0.28, { fontSize: 10.5, color: C.muted });
  addLine(slide, bx, by + bh, bx + bw, by + bh, { color: C.muted, width: 1, arrow: true });
  addLine(slide, bx, by + bh, bx, by, { color: C.muted, width: 1, arrow: true });
  const us = Array.from({ length: 41 }, (_, i) => i / 40);
  const curve = us.map((u) => [bx + 0.2 + u * (bw - 0.5), by + bh - (0.18 + 1.4 * Math.pow(u - 0.45, 2) + 0.5 * Math.exp(-6 * u)) * (bh - 0.15) * 0.95]);
  drawPolyline(slide, curve, { color: C.goldDark, width: 2.5 });
  addText(slide, '補正の自由度（項・点・頻度）', bx + bw - 3.2, by + bh + 0.06, 3.2, 0.26, { fontSize: 10.5, color: C.muted, align: 'right' });
  addText(slide, '少なすぎる：形を表せない', bx + 0.25, by + 0.05, 2.2, 0.26, { fontSize: 10.5, color: C.ink });
  addText(slide, '多すぎる：ノイズを拾って暴れる', bx + bw - 2.55, by + 0.3, 2.5, 0.26, { fontSize: 10.5, color: C.ink, align: 'right' });
  const lowest = curve.reduce((best, p) => (p[1] > best[1] ? p : best), curve[0]);
  addDot(slide, lowest[0], lowest[1], 0.13, C.goldDark);
  addText(slide, 'ちょうどよい所がある', lowest[0] - 1.0, lowest[1] + 0.08, 2.0, 0.26, { fontSize: 10.5, bold: true, color: C.goldDark, align: 'center' });

  // 下右：増やせば良くなるとは限らない
  const rx = 6.35;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 4.2, rw, 2.6, { fill: C.goldTint });
  addText(slide, '「増やせば良くなる」とは限らない', rx + 0.25, 4.32, rw - 0.5, 0.36, { fontSize: 14, bold: true, color: C.goldDark });
  addBullets(slide, [
    '高次の項は互いに似た形になり、係数が不安定になる。3次の項の組の22%で相関係数0.5超（線形の項は全組で0.25未満）',
    '不要な項は過学習を招き、制御ループの安定性を下げる。項は次数単位ではなく1つずつ選ぶのがよい',
    '高次補正・Shotごとの補正の効果は、増える計測と釣り合わせる必要がある。外周のShotの制御には特に密な計測が要る',
  ], rx + 0.25, 4.76, rw - 0.5, 1.95, { fontSize: 12, space: 5 });
  addSource(slide, `${cite('ullah2013', 'ehrlich2025', 'huang2012', 'lee2017topo')}（アライメントの点数とスループットの関係）`);
}

// =====================================================================
// 4. コンセプト：トレードオフ曲線を動かす
// =====================================================================
{
  const slide = newContentSlide('コンセプト', 'コンセプト：同じコストで高い精度を、同じ精度を低いコストで', [
    'この資料の中心の考え方を図にしました。横軸がコスト、縦軸が重ね合わせ誤差です。',
    '今の運用は、点線の曲線の上のどこかにあります。計測を増やしたりオプションを買ったりすると、曲線の上を右下へ動きます。逆にコストを削ると左上へ動きます。これは精度を買う、または手放すという動きで、トレードオフそのものは変わりません。',
    '技術進化で目指すのは、曲線そのものを左下へ動かすことです。そうすると、同じコストでより高い精度、あるいは同じ精度をより低いコストで実現できます。',
    '右側に、6つの領域がどの向きに曲線を動かすかをまとめました。制御最適化と異常検知は主に精度の側、計測最適化と仮想測定は主にコストの側、傾向監視と測定技術は両方に効きます。',
    '図は考え方を示す概念図で、数値の意味はありません。',
  ]);
  const bx = MARGIN_X + 0.6;
  const by = 1.85;
  const bw = 6.2;
  const bh = 4.55;
  addLine(slide, bx, by + bh, bx + bw, by + bh, { color: C.muted, width: 1.25, arrow: true });
  addLine(slide, bx, by + bh, bx, by, { color: C.muted, width: 1.25, arrow: true });
  addText(slide, '重ね合わせ誤差', bx - 0.55, by - 0.4, 2.5, 0.28, { fontSize: 11, color: C.muted });
  addText(slide, 'コスト（計測・装置オプション・スループット・品質）', bx + bw - 5.0, by + bh + 0.08, 5.0, 0.28, { fontSize: 11, color: C.muted, align: 'right' });
  const toPt = (u, v) => [bx + 0.25 + u * (bw - 0.5), by + bh - v * (bh - 0.25)];
  const nowShape = { floor: 0.22, height: 0.62, steep: 5 };
  const goalShape = { floor: 0.1, height: 0.5, steep: 7 };
  const us = Array.from({ length: 51 }, (_, i) => i / 50);
  drawPolyline(slide, us.map((u) => toPt(u, frontier(u, nowShape))), { color: C.cmp2, width: 2.5, dash: 'dash' });
  drawPolyline(slide, us.map((u) => toPt(u, frontier(u, goalShape))), { color: C.goldDark, width: 3 });
  const uA = 0.45;
  const vA = frontier(uA, nowShape);
  const vB = frontier(uA, goalShape);
  const uC = (goalShape.height / (vA - goalShape.floor) - 1) / goalShape.steep;
  const A = toPt(uA, vA);
  const B = toPt(uA, vB);
  const Cp = toPt(uC, vA);
  addLine(slide, A[0], A[1] + 0.1, B[0], B[1] - 0.12, { color: D1.color, width: 2.25, arrow: true });
  addLine(slide, A[0] - 0.1, A[1], Cp[0] + 0.12, Cp[1], { color: D2.color, width: 2.25, arrow: true });
  addDot(slide, A[0], A[1], 0.16, C.cmp3);
  addDot(slide, B[0], B[1], 0.16, C.goldDark);
  addDot(slide, Cp[0], Cp[1], 0.16, C.goldDark);
  // 点の近くには記号だけを置き、説明はグラフ右上の空いた所にまとめる
  addNode(slide, A[0] + 0.24, A[1] - 0.28, 0.28, C.cmp3, 'A', { fontSize: 10.5 });
  addNode(slide, B[0] - 0.3, B[1] + 0.24, 0.28, D1.color, 'B', { fontSize: 10.5 });
  addNode(slide, Cp[0] - 0.3, Cp[1] + 0.26, 0.28, D2.color, 'C', { fontSize: 10.5 });
  const nowEnd = toPt(1, frontier(1, nowShape));
  const goalEnd = toPt(1, frontier(1, goalShape));
  addText(slide, '今の曲線', nowEnd[0] - 1.2, nowEnd[1] - 0.36, 1.2, 0.26, { fontSize: 11, color: C.cmp3, align: 'right' });
  addText(slide, '目指す曲線', goalEnd[0] - 1.2, goalEnd[1] + 0.08, 1.2, 0.26, { fontSize: 11, bold: true, color: C.goldDark, align: 'right' });
  // 曲線の上の移動（今の曲線の左上の部分に沿わせる）
  const m1 = toPt(0.12, frontier(0.12, nowShape));
  const m2 = toPt(0.24, frontier(0.24, nowShape));
  addLine(slide, m1[0] + 0.16, m1[1] - 0.14, m2[0] + 0.16, m2[1] - 0.14, { color: C.cmp2, width: 1.5, arrow: true });
  addText(slide, '曲線上の移動＝精度を買う・手放す', m1[0] + 0.3, m1[1] - 0.45, 2.6, 0.26, { fontSize: 10.5, color: C.muted });
  // A・B・C の説明（グラフ右上の空いた所）
  const lx = bx + bw - 2.95;
  const ly = by + 0.02;
  addCard(slide, lx, ly, 2.9, 1.3, { fill: C.white, line: C.line });
  [['A', '今の運用点', C.cmp3], ['B', '同じコストで精度↑', D1.color], ['C', '同じ精度でコスト↓', D2.color]].forEach(([letter, text, color], i) => {
    addNode(slide, lx + 0.25, ly + 0.23 + i * 0.32, 0.25, color, letter, { fontSize: 10 });
    addText(slide, text, lx + 0.46, ly + 0.1 + i * 0.32, 2.35, 0.26, { fontSize: 11, bold: true, color, valign: 'middle' });
  });
  addText(slide, '概念図（数値なし）', lx + 0.2, ly + 1.02, 2.5, 0.24, { fontSize: 9.5, color: C.muted });

  // 右：6つの領域の効き方
  const rx = 7.75;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '6つの領域が曲線を動かす仕組み', rx, 1.55, rw, 0.34, { fontSize: 14, bold: true });
  const effects = [
    ['同じデータから、より多くの補正効果を得る', '精度'],
    ['同じ精度を、より少ない計測で得る', 'コスト'],
    ['直すべき成分と単位を見極め、無駄な自由度と計測を減らす', '両方'],
    ['計測の一部を予測で置き換える', 'コスト'],
    ['誤った補正による悪化と損失を防ぐ', '精度'],
    ['1回の計測から得る情報を増やす', '両方'],
  ];
  effects.forEach(([text, side], i) => {
    const y = 2.02 + i * 0.74;
    addCard(slide, rx, y, rw, 0.64, { fill: DOMAINS[i].tint });
    addNode(slide, rx + 0.3, y + 0.32, 0.36, DOMAINS[i].color, String(i + 1), { fontSize: 11.5 });
    addText(slide, text, rx + 0.6, y, rw - 1.5, 0.64, { fontSize: 11.5, valign: 'middle' });
    addChip(slide, side, rx + rw - 0.82, y + 0.18, 0.66, 0.28, { fill: side === '精度' ? D1.color : side === 'コスト' ? D2.color : C.goldDark, fontSize: 10 });
  });
}

// =====================================================================
// 5. 考え方：選択・適応・予測
// =====================================================================
{
  const slide = newContentSlide('考え方', '考え方：「一律・密・後追い」から「選択・適応・予測」へ', [
    'では、曲線をどう動かすか。6つの観点で、これまでとこれからを対比しました。',
    '最初の3行は選ぶ軸です。空間では、全面を同じ密度で測って同じ式で直すのをやめ、変化の大きい外周は密に測ってShotごとに直し、内側は疎に測ってウェーハ座標の式で直します。',
    '時間では、全ロット同じ頻度で測るのをやめ、変化の速い所は頻繁に、安定した所はまれに測ります。自由度では、使える項を全部使うのではなく、効く項だけを選びます。',
    '後ろの3行は支える軸です。予測では、測っていない点やウェーハを装置や工程のデータから予測します。守りでは、補正の前に誤測定や異常を止めます。情報密度では、1回の計測からOVL以外の情報も取り出します。',
    '選ぶことで浮いたコストを、予測、守り、情報密度に回すというのが全体の組み立てです。',
  ]);
  const header = [
    headCell('観点', C.cmp3),
    headCell('これまで（一律・密・後追い）', C.cmp2),
    headCell('これから（選択・適応・予測）', C.goldDark),
    headCell('主な領域', C.cmp3, { align: 'center' }),
  ];
  const rows = [
    ['空間：どこを', 'ウェーハ全面を同じ密度で測り、同じ式で直す', '変化の大きい外周は密に測ってShotごとに直す。内側は疎に測り、ウェーハ座標の式で直す', '① ②'],
    ['時間：いつ', '全ロット・全領域を同じ頻度で測る', '変化の速い領域・成分は頻繁に、安定した所はまれに測る。変化点やイベントの後だけ増やす', '② ①'],
    ['自由度：何を', '使える項はすべて使う。次数の単位で増やす', '効く項だけを選ぶ。成分を時定数で分け、固定の成分はFBから外す', '① ③'],
    ['予測：測らずに知る', '測った点・ウェーハの値だけで判断する', 'アライメント・形状・装置ログ・工程経路から、測っていない点・ウェーハを予測する', '④'],
    ['守り：誤りを入れない', '測った値をそのまま補正に使う', '補正の前に、誤測定・装置異常・想定外の補正値を止める', '⑤'],
    ['情報密度：1回で多く', 'OVLだけを、専用のターゲットで測る', '1回の計測からOVL以外も取り出す。SEMでデバイスを直接測る', '⑥'],
  ].map(([a, b, c, d], i) => [
    bodyCell(a, { bold: true, fill: { color: i < 3 ? C.goldTint : C.gray } }),
    bodyCell(b, { color: C.muted }),
    bodyCell(c),
    bodyCell(d, { align: 'center', bold: true }),
  ]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.55, CONTENT_W, [2.1, 3.7, 5.2, 1.13], { rowH: [0.42, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66], fontSize: 12 });
  addCard(slide, MARGIN_X, 6.1, CONTENT_W, 0.72, { fill: C.goldTint });
  addText(slide, [
    { text: 'メモの言葉では「必要な制御を、必要最小限の計測で」。', bold: true, color: C.goldDark },
    { text: '上の3行（空間・時間・自由度）を選ぶことで浮いたコストを、下の3行（予測・守り・情報密度）に回す。' },
  ], MARGIN_X + 0.25, 6.1, CONTENT_W - 0.5, 0.72, { fontSize: 12.5, valign: 'middle' });
}

// =====================================================================
// 6. 6つの領域の関係（制御ループ）
// =====================================================================
{
  const slide = newContentSlide('全体像', '6つの領域は、1つの制御ループの中でつながっている', [
    '6つの領域の関係を、制御ループの図にしました。',
    '上の段から、露光、計測、異常検知と進み、右下の仮想測定、下の制御最適化を通って、また露光に戻ります。これはロットやウェーハごとに回る速いループです。',
    '計測の段には、何で測るかという測定技術と、どこをいつ測るかという計測最適化が入ります。異常検知は、計測値を補正に使う前のゲートの役割です。仮想測定は、測っていない点やウェーハを補います。制御最適化が最終的な補正値を決めます。',
    '真ん中の傾向監視は、週や月の単位で回る遅いループです。データをためて、計測計画、補正モデルやゾーンの定義、異常検知のしきい値、仮想測定の学習データを見直します。',
    'つまり、傾向監視はループそのものの設計を更新する役割を持ちます。',
  ]);
  const nw = 2.45;
  const nh = 1.05;
  const top = 1.75;
  const bottom = 4.85;
  const xs = [0.95, 3.95, 6.95];
  const node = (x, y, title, sub, fill, color, chips) => {
    addCard(slide, x, y, nw, nh, { fill, line: color, lineWidth: 1.25 });
    addText(slide, title, x + 0.15, y + 0.1, nw - 0.3, 0.36, { fontSize: 13.5, bold: true, color, align: 'center' });
    addText(slide, sub, x + 0.15, y + 0.48, nw - 0.3, 0.5, { fontSize: 11, align: 'center' });
    if (chips) {
      chips.forEach((d, i) => addNode(slide, x + 0.28 + i * 0.36, y - 0.02, 0.3, d.color, String(DOMAINS.indexOf(d) + 1), { fontSize: 10 }));
    }
  };
  node(xs[0], top, '露光', '補正を適用して焼く', C.gray, C.cmp3);
  node(xs[1], top, '計測', '何で測るか（⑥）\nどこを・いつ測るか（②）', D6.tint, D6.color, [D6, D2]);
  node(xs[2], top, '⑤ 異常検知', '補正の前のゲート\n誤測定・異常を止める', D5.tint, D5.color);
  node(xs[2], bottom, '④ 仮想測定', '測っていない点・\nウェーハを補う', D4.tint, D4.color);
  node(xs[1], bottom, '① 制御最適化', '補正値を決める\n（少ないk・ゾーン）', D1.tint, D1.color);
  // 速いループの矢印
  addLine(slide, xs[0] + nw, top + nh / 2, xs[1] - 0.05, top + nh / 2, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, xs[1] + nw, top + nh / 2, xs[2] - 0.05, top + nh / 2, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, xs[2] + nw / 2, top + nh, xs[2] + nw / 2, bottom - 0.05, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, xs[2], bottom + nh / 2, xs[1] + nw + 0.05, bottom + nh / 2, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, xs[1], bottom + nh / 2, xs[0] + nw / 2, bottom + nh / 2, { color: C.cmp3, width: 2 });
  addLine(slide, xs[0] + nw / 2, bottom + nh / 2, xs[0] + nw / 2, top + nh + 0.05, { color: C.cmp3, width: 2, arrow: true });

  // 真ん中：傾向監視
  const mx = xs[1];
  const my = 3.2;
  addCard(slide, mx, my, nw, 1.0, { fill: D3.tint, line: D3.color, lineWidth: 1.5, dash: 'dash' });
  addText(slide, '③ 傾向監視', mx + 0.1, my + 0.08, nw - 0.2, 0.34, { fontSize: 13.5, bold: true, color: D3.color, align: 'center' });
  addText(slide, 'データをためて\nループの設計を見直す', mx + 0.1, my + 0.44, nw - 0.2, 0.5, { fontSize: 10.5, align: 'center' });
  addLine(slide, mx + nw / 2, my, mx + nw / 2, top + nh + 0.08, { color: D3.color, width: 1.5, dash: 'dash', arrow: true });
  addLine(slide, mx + nw / 2, my + 1.0, mx + nw / 2, bottom - 0.08, { color: D3.color, width: 1.5, dash: 'dash', arrow: true });
  addLine(slide, mx + nw, my + 0.3, xs[2] + 0.35, top + nh + 0.08, { color: D3.color, width: 1.5, dash: 'dash', arrow: true });
  addLine(slide, mx + nw, my + 0.7, xs[2] + 0.35, bottom - 0.08, { color: D3.color, width: 1.5, dash: 'dash', arrow: true });
  addText(slide, '計測計画', mx + nw / 2 + 0.08, top + nh + 0.2, 1.0, 0.24, { fontSize: 9.5, color: D3.color });
  addText(slide, 'モデル・ゾーン・経路グループ', mx + nw / 2 - 2.35, bottom - 0.5, 2.25, 0.24, { fontSize: 9.5, color: D3.color, align: 'right' });
  addText(slide, 'しきい値・既知の形', mx + nw + 0.5, my + 0.02, 1.25, 0.24, { fontSize: 9.5, color: D3.color });
  addText(slide, '学習データ', mx + nw + 0.5, my + 0.78, 1.0, 0.24, { fontSize: 9.5, color: D3.color });
  addLegend(slide, [
    { kind: 'line', color: C.cmp3, label: '速いループ（ロット・ウェーハごと）', width: 3.1 },
    { kind: 'line', color: D3.color, dash: 'dash', label: '遅いループ（週・月ごと）：③がループの設計を見直す', width: 4.4 },
  ], xs[0], 6.2, { fontSize: 10.5 });

  // 右：説明
  const rx = 9.85;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.75, rw, 2.2, { fill: C.gray });
  addText(slide, '速いループ', rx + 0.2, 1.87, rw - 0.4, 0.3, { fontSize: 13, bold: true, color: C.cmp3 });
  addText(slide, '測る→確かめる→補う→直す→焼く。①②④⑤⑥が毎回動く。計算の速さと安定性が大事で、入口には誤った補正を止めるゲート（⑤）を置く。', rx + 0.2, 2.24, rw - 0.4, 1.6, { fontSize: 12 });
  addCard(slide, rx, 4.15, rw, 2.2, { fill: D3.tint });
  addText(slide, '遅いループ', rx + 0.2, 4.27, rw - 0.4, 0.3, { fontSize: 13, bold: true, color: D3.color });
  addText(slide, '③がデータをためて、計測計画・モデル・しきい値・学習データを見直す。ループの「設計」を更新する役割で、見直しの結果は次のロットから速いループに反映される。', rx + 0.2, 4.64, rw - 0.4, 1.6, { fontSize: 12 });
}

// =====================================================================
// 7. 進化の道筋（ロードマップ）
// =====================================================================
{
  const slide = newContentSlide('進化の道筋', '進化の道筋：見える化と守り → 選択と適応 → 予測 → 統合', [
    '6つの領域をどの順番で進めるかを、4つのステップに分けました。',
    'ステップ1は見える化と守りです。外れ値に強い当てはめ、補正前のゲート、潜在成分の抽出とサンキー図など、今あるデータで始められ、失敗しても害の少ないものです。',
    'ステップ2は選択と適応です。効く項の選択、外周CPEのゾーン補正、領域別の計測密度と頻度など、ステップ1で分かった構造を使って、測り方と直し方を選びます。',
    'ステップ3は予測です。仮想測定を量産で使い、部分的なアライメントから面内を推定して高次のFFにつなげます。',
    'ステップ4は統合で、EPEを目的にした最適化や、SEMによるAEI・EPE制御など、工程や計測をまたいだ制御です。',
    '各ステップは、前のステップのデータと仕組みが前提になります。たとえば仮想測定には、統合したデータと誤測定の除外が欠かせません。',
  ]);
  const steps = [
    ['Step 1', '見える化と守り', 'D9DDE6'],
    ['Step 2', '選択と適応', 'E7D3A6'],
    ['Step 3', '予測', 'A77A1E'],
    ['Step 4', '統合', '6E4F0E'],
  ];
  const cells = [
    ['外れ値に強い当てはめ（ロバスト推定）', '効く項の選択、外周CPE＋内側ウェーハ補正', 'VMの予測値を使った高次FF', 'EPE・良品チップ数を目的にした最適化'],
    ['今の計測点の「効き」を過去データで評価', '領域別の計測密度と頻度', 'VMの不確かさで計測の要否を決める', '計測の価値に基づく自動配分'],
    ['潜在成分の抽出とサンキー図', '経路グループの定義、想定範囲の見積もり', '変化点・予兆の監視', '工程をまたぐ原因対策'],
    ['データの紐づけ（ウェーハ単位）', '未測定ウェーハの予測（オフライン評価）', '部分アライメントからの面内推定を量産へ', 'AEI・EPEの予測'],
    ['補正前ゲート（ルール＋統計）', '誤測定の自動除外', 'VMとの突き合わせで早期検知', '保留・再計測の自動判断'],
    ['計測誤差の内訳の把握（TMU・NZO）', '波長・ターゲットの最適化', 'OVL計測からの多項目抽出（Beyond OVL）', 'SEMによるAEI・EPE制御'],
  ];
  const header = [headCell('領域', C.cmp3), ...steps.map(([s, name, fill], i) => headCell(`${s}　${name}`, fill, { color: i < 2 ? C.ink : C.white }))];
  const rows = DOMAINS.map((d, i) => [
    bodyCell(`${d.no} ${d.name}`, { bold: true, color: d.color, fill: { color: d.tint } }),
    ...cells[i].map((t) => bodyCell(t)),
  ]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.55, CONTENT_W, [1.85, 2.57, 2.57, 2.57, 2.57], { rowH: [0.46, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66], fontSize: 11 });
  addLine(slide, MARGIN_X + 1.95, 6.25, RIGHT_EDGE - 0.1, 6.25, { color: C.goldDark, width: 2.5, arrow: true });
  addText(slide, '前のステップのデータと仕組みが、次のステップの前提になる（例：VMはデータの紐づけと誤測定の除外が前提。EPE制御はSEMのデータとVMが前提）', MARGIN_X + 1.95, 6.35, CONTENT_W - 2.0, 0.5, { fontSize: 11.5, color: C.goldDark });
}

// =====================================================================
// 8. メモの論点の整理
// =====================================================================
{
  const slide = newContentSlide('メモの整理', 'メモの論点の整理：14の論点と、具体化したスライド', [
    '元のメモを14の論点に分け、どの領域で扱い、どのスライドで具体化したかを一覧にしました。',
    '1から5は制御と計測の話で、少ないkパラメータ、ロバストな制御、外周だけCPE、時間軸でのサンプリング最適化です。',
    '6から8は傾向監視で、潜在的な面内傾向と経路グループ、サンキー図、補正パラメータのトレンドから出来栄えの想定範囲を見積もる話です。',
    '9と10は仮想測定、11は異常検知、12から14は測定技術です。',
    'メモの論点はすべて拾っています。以降のスライドでは、メモ由来の提案に灰色の「メモ」、追加の提案に金色の「追加」の印を付けています。',
  ]);
  const memo = [
    ['kパラメータはオプション費用がかかる → 少ないkで高い補正精度を実現する', '①', '9・10・11'],
    ['異常値や計測誤差にロバストな制御で、重ね合わせ精度を上げる', '① ⑤', '9・11・22'],
    ['領域や装置状態の経時変化に対し、必要な制御を必要最小限の計測で実現する', '① ②', '9・12・13'],
    ['最外周のShotだけCPEで補正し、それ以外はWaferレベル補正にする', '①', '9・10'],
    ['変化しやすい領域は高頻度、そうでない領域は低頻度でサンプリングしてFB制御する', '②', '12・13'],
    ['面内傾向は複数工程の積み重ね → 潜在的な成分を監視し、補正に必要な経路グループを定義する', '③', '15・16'],
    ['経路の監視にはサンキーダイアグラムによる可視化が有効', '③', '16'],
    ['面内・高次補正はPQCで全体を保証しにくい → 補正パラメータのトレンドから出来栄えの想定範囲を見積もる', '③', '17'],
    ['VM：Wafer歪み・アライメント・部分OVL・APC制御値・収差・真空系のデータで未測定領域を予測する', '④', '19'],
    ['部分的なアライメント計測から面内の推定値を返し、より高次のFFへ進化させる', '④', '19・20'],
    ['装置状態の異常、測定値の傾向異常、誤測定を検知し、誤った補正を未然に防ぐ', '⑤', '22・23'],
    ['計測精度の向上が、補正精度の向上につながる', '⑥', '24'],
    ['Beyond OVL：OVL以外の情報も1度の計測から取り出し、計測コストを総合で下げる', '⑥', '24・25'],
    ['SEMによるAEI計測でOPOを改善する。EPE制御にはSEM計測からの制御が欠かせない', '⑥', '24・25'],
  ];
  const header = [headCell('#', C.cmp3, { align: 'center' }), headCell('メモの論点（要約）', C.cmp3), headCell('領域', C.cmp3, { align: 'center' }), headCell('該当スライド', C.cmp3, { align: 'center' })];
  const rows = memo.map(([text, domain, slides], i) => [
    bodyCell(String(i + 1), { align: 'center', color: C.muted }),
    bodyCell(text),
    bodyCell(domain, { align: 'center', bold: true }),
    bodyCell(slides, { align: 'center' }),
  ]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.5, CONTENT_W, [0.45, 9.15, 1.0, 1.53], { rowH: 0.34, fontSize: 11 });
  addOriginTag(slide, 'memo', MARGIN_X, 6.72);
  addText(slide, 'メモ由来の提案', MARGIN_X + 0.62, 6.72, 1.6, 0.26, { fontSize: 10.5, valign: 'middle' });
  addOriginTag(slide, 'add', MARGIN_X + 2.3, 6.72);
  addText(slide, 'この資料での追加提案（各領域の3枚目）', MARGIN_X + 2.92, 6.72, 3.8, 0.26, { fontSize: 10.5, valign: 'middle' });
}

// =====================================================================
// 9. ① 制御最適化：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('① 制御最適化｜メモからの具体案', '少ないkで効かせ、外れ値に強く、外周だけを個別に直す', [
    '制御最適化について、メモの内容を4つの具体案にしました。',
    '1つ目は、少ないkで効かせることです。過去の密な計測データを使い、項を1つずつ足したときに残差がどれだけ減るかを比べて、効く項だけを選びます。オプションを買うかどうかは、残差の減りと費用の比で判断できます。項の選択は、交差検証つきのLassoで自動化した報告があり、Zernikeのような直交基底を使うと項どうしの干渉が減ります。',
    '2つ目は、外れ値や計測誤差に強い当てはめです。Huber推定などで外れ値の重みを下げ、計測の品質指標で点に重みを付けます。1回の更新幅に上限を設ければ、1ロットの異常で補正が大きく振れません。',
    '3つ目がメモの中心の案で、外周のShotだけをCPEで直し、内側はウェーハ座標の式で直します。合成データで確かめたところ、内側の式を内側の点だけで決めることが大事でした。外周の点を混ぜると、外周のずれに式が引っぱられて内側が悪くなります。',
    '4つ目は、領域ごとに更新の速さを変えることで、計測最適化の頻度の話と組になります。',
    '右の図は、合成データで使ったショット配置で、外周Shotと内側Shotの区分を示しています。',
  ], { domainIndex: 0 });
  const cw = 4.12;
  const ch = 2.5;
  const cards = [
    { title: '少ないkで効かせる', body: '過去の密な計測データで、項を1つずつ足したときの残差の減り方を比べ、効く項だけを選ぶ。オプションの購入は「残差の減り÷費用」で判断する。項の選択は交差検証つきのLassoで自動化でき、直交基底（Zernike）は項どうしの干渉を減らす。', source: cite('ehrlich2025', 'ju2016') },
    { title: '外れ値に強い当てはめ', body: 'Huber推定などで外れ値の重みを下げ、計測の品質指標で点に重みを付ける。補正値の1回の更新幅に上限を設け、1ロットの異常で補正が大きく振れないようにする（⑤と連携）。' },
    { title: '外周だけCPE、内側は式で', body: '変化の大きい最外周のShotだけをShotごとの補正（CPE）で直し、内側はウェーハ座標の式で直す。内側の式は内側の点だけで決め、外周のずれに引っぱられないようにする。外周の幅は③の監視で決める。', source: cite('huang2012') },
    { title: '領域ごとに更新の速さを変える', body: '外周は毎ロット速く追従し、内側はゆっくり更新する（EWMAの係数や更新間隔を領域別に）。②の計測頻度と組にして、変化の速い所にだけ計測と補正を集中させる。' },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 2) * (cw + 0.2);
    const y = 1.55 + Math.floor(i / 2) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D1, kind: 'memo', num: i + 1, ...card, bodySize: 11.5 });
  });
  // 右：ゾーンの図
  const cx = 11.05;
  const cy = 3.3;
  const radius = 1.55;
  drawWafer(slide, cx, cy, radius, EDGE.layout.shots, (s) => (s.edge ? { fill: D1.color, transparency: 15 } : { fill: 'D5DAE3' }));
  addLegend(slide, [{ kind: 'box', color: D1.color, label: `外周Shot（${EDGE.layout.edge_shot_count}）：CPE`, width: 2.2 }], 9.4, 5.1, { fontSize: 10.5 });
  addLegend(slide, [{ kind: 'box', color: 'D5DAE3', label: `内側Shot（${EDGE.layout.shot_count - EDGE.layout.edge_shot_count}）：ウェーハの式`, width: 2.6 }], 9.4, 5.45, { fontSize: 10.5 });
  addText(slide, `外周＝ショットの最も外側の角が半径${EDGE.assumptions.edge_shot_corner_radius_mm} mm以上（合成データの配置。26×33 mm、${EDGE.layout.shot_count}ショット）`, 9.4, 5.85, 3.35, 0.72, { fontSize: 9.5, color: C.muted });
}

// =====================================================================
// 10. ① 合成データ：外周だけCPE
// =====================================================================
{
  const slide = newContentSlide('① 制御最適化｜合成データでの確認', `外周だけCPEなら、計測点${pct(edgePointsCut)}・補正の項${pct(edgeParamsCut)}減で誤差は同等以下`, [
    'メモの外周だけCPEの案を、合成データで確かめました。',
    '合成データでは、外周に向かって急に大きくなる放射状のずれと、多項式で表せる2次から3次の形、ショットやマークごとのばらつき、計測のばらつきを重ねました。前のロットの2枚を測って補正値を作り、次のロットで補正後のずれを評価しています。',
    '左の図が外周だけCPEの案の計測点で、外周Shotは全点、内側は25Shotだけを測ります。',
    '中央のグラフを見ると、線形のみやウェーハ高次だけでは外周が大きく残ります。外周だけCPEと全ShotにCPEはどちらも外周を直せますが、外周だけCPEは内側の誤差が小さくなりました。内側に個別の補正をかけないので、計測のばらつきを補正に持ち込まないためです。',
    '表のとおり、外周だけCPEは全ShotにCPEより計測点が約4割、補正の項が約6割少なく、全体の誤差は同等以下でした。右のグラフのとおり、計測のばらつきが大きいほど差は広がります。',
    'なお、外周の幅は、ショットの角が140ミリ付近のときが最もよく、外周を部分Shotだけに狭めると悪化しました。外周の幅は傾向監視で決めるのがよいと考えます。',
    '前提は合成データの例です。実際の効果は自社のデータで確かめる必要があります。',
  ], { domainIndex: 0 });
  // 左：計測点の図
  const cx = 2.35;
  const cy = 3.3;
  const radius = 1.6;
  addText(slide, '外周だけCPEの計測点', MARGIN_X, 1.5, 3.6, 0.3, { fontSize: 12, bold: true });
  drawWafer(slide, cx, cy, radius, EDGE.layout.shots, (s) => {
    if (s.edge) return { fill: D1.color, transparency: 15 };
    if (s.measured_edge_cpe) return { fill: '8E99AE' };
    return { fill: 'E1E5EC' };
  });
  addLegend(slide, [{ kind: 'box', color: D1.color, label: '外周：全点を測りCPE', width: 2.4 }], MARGIN_X, 5.05, { fontSize: 10.5 });
  addLegend(slide, [{ kind: 'box', color: '8E99AE', label: '内側：25Shotを測り式を決める', width: 2.6 }], MARGIN_X, 5.37, { fontSize: 10.5 });
  addLegend(slide, [{ kind: 'box', color: 'E1E5EC', label: '内側：測らない（式で補正）', width: 2.6 }], MARGIN_X, 5.69, { fontSize: 10.5 });

  // 中央：棒グラフ
  const keys = ['linear', 'wafer_ho', 'edge_cpe', 'full_cpe'];
  const labels = ['線形のみ', 'ウェーハ高次', '外周だけCPE', '全ShotにCPE'];
  addText(slide, '補正後の|平均|+3σ（nm、次ロットで評価）', 4.1, 1.5, 4.9, 0.3, { fontSize: 12, bold: true });
  slide.addChart(pres.charts.BAR, [
    { name: '内側のShot', labels, values: keys.map((k) => EB[k].inner) },
    { name: '外周のShot', labels, values: keys.map((k) => EB[k].edge) },
  ], {
    x: 4.0, y: 1.8, w: 5.0, h: 2.85,
    barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60,
    chartColors: ['9AA3B5', D1.color],
    showLegend: true, legendPos: 't', legendFontSize: 10, legendFontFace: FONT,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', dataLabelFontSize: 9.5, dataLabelFontFace: FONT, dataLabelColor: C.ink,
    catAxisLabelFontSize: 10, catAxisLabelFontFace: FONT, catAxisLabelColor: C.ink,
    valAxisLabelFontSize: 9.5, valAxisLabelColor: C.muted, valAxisMinVal: 0, valAxisMaxVal: 7, valAxisMajorUnit: 1,
    valAxisLabelFormatCode: '0', valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: 'none' },
  });
  // 表
  const tableLabels = ['線形のみ', 'ウェーハ\n高次', '外周だけ\nCPE', '全Shotに\nCPE'];
  const header = [headCell('', C.cmp3), ...tableLabels.map((l, i) => headCell(l, i === 2 ? D1.color : C.cmp3, { align: 'center' }))];
  const row = (name, fn, fmt) => [bodyCell(name, { bold: true }), ...keys.map((k, i) => bodyCell(fmt(fn(EB[k])), { align: 'center', bold: i === 2, fill: { color: i === 2 ? D1.tint : C.white } }))];
  addTableBox(slide, [
    header,
    row('計測点／ウェーハ', (v) => v.measured_points, String),
    row('補正の項数', (v) => v.parameters, String),
    row('全体の|平均|+3σ', (v) => v.all, (v) => `${f2(v)} nm`),
  ], 4.0, 4.78, 5.0, [1.4, 0.9, 0.9, 0.9, 0.9], { rowH: [0.44, 0.3, 0.3, 0.3], fontSize: 10 });

  // 右：計測ノイズを変えたとき
  const noises = Object.keys(EDGE.noise_sweep).map(Number);
  addText(slide, '計測のばらつきを変えたとき', 9.35, 1.5, 3.4, 0.3, { fontSize: 12, bold: true });
  const seriesDefs = [
    { key: 'wafer_ho', color: 'B5BDCB', label: 'ウェーハ高次' },
    { key: 'full_cpe', color: C.cmp3, label: '全ShotにCPE' },
    { key: 'edge_cpe', color: D1.color, label: '外周だけCPE' },
  ];
  drawXYChart(slide, { x: 10.0, y: 2.15, w: 2.6, h: 1.9 }, {
    xMin: 0.2, xMax: 1.3, yMin: 1.5, yMax: 3.0, xTicks: noises, yTicks: [1.5, 2.0, 2.5, 3.0],
    xLabel: '計測のばらつき σ（nm）', yLabel: '全体の|平均|+3σ（nm）',
    xFmt: (v) => v.toFixed(1),
    series: seriesDefs.map((s) => ({ color: s.color, width: s.key === 'edge_cpe' ? 2.75 : 2, markers: true, points: noises.map((n) => [n, EDGE.noise_sweep[String(n)][s.key].all]) })),
  });
  seriesDefs.forEach((s, i) => addLegend(slide, [{ kind: 'line', color: s.color, label: s.label, width: 1.3 }], 9.35 + (i % 2) * 1.75, 4.72 + Math.floor(i / 2) * 0.28, { fontSize: 10 }));
  addBullets(slide, [
    `全ShotにCPEより計測点−${pct(edgePointsCut)}・補正の項−${pct(edgeParamsCut)}で、誤差は同等以下`,
    '内側に個別補正をかけないので、計測のばらつきを持ち込まない。ばらつきが大きいほど差が広がる',
    `外周の幅は角${EDGE.assumptions.edge_shot_corner_radius_mm} mm前後が最もよい。部分Shotだけに狭めると悪化（${f2(widthByRadius[140].all)}→${f2(widthByRadius[150].all)} nm）`,
  ], 9.35, 5.35, 3.4, 1.55, { fontSize: 10.5, space: 3 });
  const a = EDGE.assumptions;
  addSource(slide, `前提（合成データ）：外周に放射状のずれ（r = 150 mmで${a.edge_amplitude_nm} nm、内側へ${a.edge_decay_mm} mmで減衰）＋2〜3次の形（RMS ${a.wafer_high_order_rms_nm} nm）＋ショット・マークごとのばらつき、計測のばらつき σ = ${a.meas_noise_nm} nm。前ロット${a.wafers_measured_per_lot}枚の計測で次ロットを補正し、${a.trials}回の平均。CPEはShotごとの並進・倍率・回転（6項、マーク2点以下は並進のみ）。効果の大きさは実データで要検証`, { y: 6.9, h: 0.5, fontSize: 8 });
}

// =====================================================================
// 11. ① 追加提案
// =====================================================================
{
  const slide = newContentSlide('① 制御最適化｜追加提案', 'kを増やさずに精度を上げる、4つの追加提案', [
    '制御最適化について、メモ以外の提案を4つ加えます。いずれも、kパラメータを増やさずに精度を上げる方法です。',
    '1つ目は、何を最小にするかを変えることです。同じkでも、平均的な誤差ではなく、最大誤差やスペック内のチップ数を目的に補正値を決めると、歩留まりへの効き方が変わります。最大誤差を抑えるロバスト制御は線形計画として数秒で解け、工場のデータを使ったシミュレーションで従来の方法を上回ったと報告されています。EPEを目的にした最適化でも、良品チップ数が増えています。',
    '2つ目は、成分を時定数で分けることです。号機やチャック、レチクルに固有の固定の成分は、定期校正の固定値で直してFBから外します。ゆっくり動く成分は低頻度のFB、ウェーハごとに変わる成分はFFで直します。FBで推定する項が減るので、ノイズの持ち込みが減ります。',
    '3つ目は、カルマンフィルタのような状態推定型のR2Rです。計測のばらつきと変化の速さから更新の強さを自動で決め、測らなかったロットがあっても推定が続きます。少量多品種では、品種に共通の成分を共有して推定すれば、品種ごとに毎回測らなくて済みます。',
    '4つ目は、係数を安定させる当てはめ方です。高次の項は互いに似ていて係数が暴れやすいので、線形から高次へ段階的に当てはめる、直交基底を使う、といった工夫が有効です。Zernike基底でAPCを回した例では、線形項のばらつきが22パーセント、全体のばらつきが7パーセント減っています。',
  ], { domainIndex: 0 });
  const cw = (CONTENT_W - 0.2) / 2;
  const ch = 2.5;
  const cards = [
    { title: '目的を「平均」から「最悪点・良品チップ数」へ', body: '同じkでも、何を最小にするかで結果が変わる。RMSではなく最大誤差やスペック内のチップ数を目的に補正値を決める。最大誤差を抑えるロバスト制御は線形計画として数秒で解け、工場データのシミュレーションで従来法を上回った。EPEを目的にした最適化でも良品チップ数が増えた。', source: cite('graff2023', 'kwak2023', 'lee2026') },
    { title: '成分を時定数で分ける（固定・ゆっくり・毎回）', body: '号機・チャック・レチクル固有の固定成分は、定期校正の固定値で直してFBから外す。ゆっくり動く成分は低頻度のFB、ウェーハごとに変わる成分はFFで直す。FBで推定する項が減り、ノイズの持ち込みが減る。Shot内高次のR2Rは、ロット間のばらつきを小さく保つことが前提になる。', source: cite('duclaux2020') },
    { title: '状態推定型のR2R（カルマンフィルタ）', body: '計測のばらつきと変化の速さから、更新の強さを自動で決める。測らなかったロットがあっても推定が続くので、②の間引きと両立する。少量多品種では、品種に共通の成分を共有して推定し（階層ベイズ）、品種ごとに毎回測らなくてもよくする。' },
    { title: '段階的な当てはめ・直交基底で係数を安定させる', body: '高次の項は互いに似た形になり、係数が暴れる（3次の項の組の22%で相関0.5超）。線形→高次の順に当てはめるカスケード解析で安定性が上がった。Zernike基底でAPCを回すと、線形項のばらつきが22%、全体のばらつきが7%減った。', source: cite('ullah2013', 'ju2016') },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 2) * (cw + 0.2);
    const y = 1.55 + Math.floor(i / 2) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D1, kind: 'add', num: i + 1, ...card, bodySize: 12 });
  });
  addText(slide, '※ 3・4は、2と組み合わせると効果が大きい（FBで推定する項が少ないほど、状態推定も安定する）', MARGIN_X, 6.82, CONTENT_W, 0.3, { fontSize: 10.5, color: C.muted });
}

// =====================================================================
// 12. ② 計測最適化：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('② 計測最適化｜メモからの具体案', '測る場所と頻度を、変化の大きさと速さに合わせる', [
    '計測最適化について、メモの内容を具体化しました。空間と時間の2つの軸で、計測を必要な所に寄せます。',
    '空間では、外周Shotは全点を測り、内側は少数のShotで式を決めます。これは制御最適化のゾーン補正と組になります。',
    '時間では、領域や成分ごとに、ロット間の変化の大きさと、1回の計測のばらつきを過去データで求め、計測の間隔を決めます。変化の速い外周は毎ロット、安定した内側は数ロットに1回とします。',
    '間隔の決め方の目安として、カルマンフィルタで追うときの誤差の式を示しました。変化が速いほど間隔を短くし、計測のばらつきが大きいほど1回の計測の価値が下がります。',
    '右は計測計画の例で、外周は毎ロット、内側は4ロットに1回測ります。1ロットあたりの計測点は、全点を毎ロット測る場合の半分になります。次のスライドで、この効果を合成データで確かめます。',
  ], { domainIndex: 1 });
  const lw = 6.15;
  const blocks = [
    { title: '空間：変化の大きい所を密に', body: '外周Shotは全点を測り、内側は少数のShotで式を決める（①のゾーン補正と組）。1枚あたりの計測点を、効く場所へ寄せる。' },
    { title: '時間：変化の速い所を頻繁に', body: '領域・成分ごとに「ロット間の変化の大きさ」と「1回の計測のばらつき」を過去データで求め、計測の間隔を決める。変化の速い外周は毎ロット、安定した内側は数ロットに1回。' },
  ];
  blocks.forEach((b, i) => {
    const y = 1.55 + i * 1.62;
    addCard(slide, MARGIN_X, y, lw, 1.45, { fill: C.gray });
    addNode(slide, MARGIN_X + 0.32, y + 0.33, 0.4, D2.color, String(i + 1), { fontSize: 12 });
    addText(slide, b.title, MARGIN_X + 0.62, y + 0.12, lw - 1.4, 0.44, { fontSize: 14, bold: true, valign: 'middle' });
    addOriginTag(slide, 'memo', MARGIN_X + lw - 0.68, y + 0.2);
    addText(slide, b.body, MARGIN_X + 0.22, y + 0.64, lw - 0.44, 0.78, { fontSize: 12 });
  });
  const fy = 4.8;
  addCard(slide, MARGIN_X, fy, lw, 2.02, { fill: D2.tint });
  addText(slide, '間隔の決め方（目安）', MARGIN_X + 0.22, fy + 0.12, lw - 0.44, 0.32, { fontSize: 13, bold: true, color: D2.color });
  addText(slide, 'k ロットに1回測って追うときの補正の誤差（2乗平均）', MARGIN_X + 0.22, fy + 0.5, lw - 0.44, 0.3, { fontSize: 11.5 });
  addText(slide, '＝ P ＋ q（k ＋ 1）／ 2', MARGIN_X + 0.6, fy + 0.84, lw - 1.0, 0.38, { fontSize: 17, bold: true, color: D2.color });
  addText(slide, 'q：1ロットあたりの変化の分散　P：計測直後の推定の分散（計測のばらつきとqで決まる）。変化が速い（qが大きい）ほど k を小さくする', MARGIN_X + 0.22, fy + 1.3, lw - 0.44, 0.66, { fontSize: 10.5, color: C.muted });

  // 右：計測計画の例
  const gx = 7.05;
  addText(slide, '計測計画の例：外周は毎ロット、内側は4ロットに1回', gx, 1.55, RIGHT_EDGE - gx, 0.32, { fontSize: 13, bold: true });
  const lots = 12;
  const cell = 0.3;
  const cellGap = 0.035;
  const labelW = 1.62;
  const pts = MR.assumptions.points_per_measurement;
  addText(slide, 'ロット', gx, 2.02, labelW, 0.3, { fontSize: 10.5, color: C.muted });
  for (let j = 0; j < lots; j += 1) {
    addText(slide, String(j + 1), gx + labelW + j * (cell + cellGap), 2.02, cell, 0.3, { fontSize: 10, color: C.muted, align: 'center' });
  }
  [['外周Shot', pts.edge, 1, D2.color], ['内側Shot', pts.inner, 4, '6FA89F']].forEach(([name, points, every, color], r) => {
    const y = 2.38 + r * 0.56;
    addText(slide, `${name}（${points}点）`, gx, y, labelW, cell, { fontSize: 11, bold: true, valign: 'middle' });
    for (let j = 0; j < lots; j += 1) {
      const measured = j % every === 0;
      addRect(slide, gx + labelW + j * (cell + cellGap), y, cell, cell, { fill: measured ? color : C.white, line: measured ? color : C.line });
    }
  });
  addLegend(slide, [
    { kind: 'box', color: D2.color, label: '測る', width: 0.6 },
    { kind: 'box', color: C.white, lineColor: C.line, label: '測らない（前の推定を使う）', width: 2.4 },
  ], gx, 3.55, { fontSize: 10.5 });
  // 点数の比較
  const everyLot = pts.edge + pts.inner;
  const plan = pts.edge + pts.inner / 4;
  addCard(slide, gx, 4.1, RIGHT_EDGE - gx, 1.35, { fill: C.gray });
  addText(slide, '1ロットあたりの計測点', gx + 0.22, 4.2, 3, 0.3, { fontSize: 12, bold: true });
  addText(slide, `一律に毎ロット全点：${everyLot}点`, gx + 0.22, 4.55, 3.2, 0.36, { fontSize: 13, color: C.muted, valign: 'middle' });
  addText(slide, `領域別：${plan}点（半分）`, gx + 0.22, 4.93, 3.2, 0.4, { fontSize: 15, bold: true, color: D2.color, valign: 'middle' });
  addText(slide, '→ 誤差の増え方は次のスライド', gx + 3.1, 4.93, 2.45, 0.4, { fontSize: 10.5, color: D2.color, bold: true, valign: 'middle', align: 'right' });
  addText(slide, '変化の速さの差が小さいと効果が出ない。先に③で領域・成分ごとの変化の速さを測ってから、計画を決める。', gx, 5.65, RIGHT_EDGE - gx, 0.62, { fontSize: 11.5, color: C.ink });
}

// =====================================================================
// 13. ② 合成データ：時間軸のサンプリング
// =====================================================================
{
  const slide = newContentSlide('② 計測最適化｜合成データでの確認', `同じ半減でも、一律に間引くと誤差+${pct(uniformWorse)}、領域別なら+${pct(adaptiveWorse)}`, [
    '計測頻度を領域ごとに変える案を、合成データで確かめました。',
    '外周は1ロットあたりの変化が大きく、内側は小さいという前提で、それぞれの変化をカルマンフィルタで追ったときの、定常状態の補正の誤差を式で計算しました。',
    'グラフの横軸は1ロットあたりの計測点、縦軸は変化を追いきれないことによる誤差です。灰色は、外周も内側も同じ間隔で測る一律の案で、緑は、外周と内側の間隔の組み合わせのうち最もよいものをつないだ線です。',
    `毎ロット全点を測ると、計測点は${MH.every_lot.cost}点、誤差は${f2(MH.every_lot.error)}ナノメートルです。一律に2ロットに1回へ間引くと、計測点は半分になりますが、誤差は${pct(uniformWorse)}悪化します。領域別に、外周は毎ロット、内側は${MH.same_cost_adaptive.k_inner}ロットに1回にすると、同じ計測点で悪化は${pct(adaptiveWorse)}にとどまりました。`,
    `同じ誤差でよければ、領域別は計測点をさらに${pct(sameErrorCut)}減らせます。`,
    'ただし、効果は外周と内側の変化の速さの差で決まります。差が2倍以下ではほぼ効果がありません。また、内側をすでに間引いている外周だけCPEの計画では、時間の最適化の上乗せはほとんどありませんでした。空間と時間の最適化は一部が重なるので、先に傾向監視で変化の速さを測ってから、どちらを使うかを決めるのがよいと考えます。',
  ], { domainIndex: 1 });
  const box = { x: 1.35, y: 1.95, w: 6.35, h: 3.95 };
  const uni = MR.uniform;
  const ada = MR.adaptive;
  const { px, py } = drawXYChart(slide, box, {
    xMin: 0, xMax: 350, yMin: 0.7, yMax: 1.8, xTicks: [0, 50, 100, 150, 200, 250, 300, 350], yTicks: [0.8, 1.0, 1.2, 1.4, 1.6, 1.8],
    xLabel: '1ロットあたりの計測点', yLabel: '変化を追いきれない誤差（3σ換算、nm）',
    series: [
      { color: C.cmp2, width: 2, markers: true, points: uni.map((u) => [u.cost, u.error]) },
      { color: D2.color, width: 2.75, points: ada.map((a) => [a.cost, a.error]) },
    ],
  });
  const keyPoints = [
    ['A', MH.every_lot, '毎ロット全点', C.cmp3, -0.3],
    ['B', MH.half_uniform, '一律に2ロットに1回', C.cmp3, -0.3],
    ['C', MH.same_cost_adaptive, `領域別（内側${MH.same_cost_adaptive.k_inner}ロットに1回）`, D2.color, 0.3],
    ['D', MH.same_error_adaptive, `領域別（内側${MH.same_error_adaptive.k_inner}ロットに1回）`, D2.color, 0.3],
  ];
  keyPoints.forEach(([letter, p, , color, dy]) => {
    addDot(slide, px(p.cost), py(p.error), 0.15, color, { lineColor: C.white });
    addNode(slide, px(p.cost), py(p.error) + dy, 0.26, color, letter, { fontSize: 10 });
  });
  // 点の説明（グラフ右上の空いた所）
  const lx = px(175);
  const ly = py(1.78);
  const lw = px(350) - lx;
  addCard(slide, lx, ly, lw, 2.1, { fill: C.white, line: C.line });
  addText(slide, '主な点（領域別は外周を毎ロット測る）', lx + 0.15, ly + 0.06, lw - 0.3, 0.28, { fontSize: 10, bold: true, color: C.muted });
  keyPoints.forEach(([letter, p, label, color], i) => {
    const y = ly + 0.38 + i * 0.42;
    addNode(slide, lx + 0.28, y + 0.19, 0.26, color, letter, { fontSize: 10 });
    addText(slide, [{ text: label, bold: true, color, breakLine: true }, { text: `${Math.round(p.cost)}点／ロット・誤差 ${f2(p.error)} nm`, color: C.ink }], lx + 0.5, y, lw - 0.6, 0.4, { fontSize: 10, valign: 'middle' });
  });
  addLegend(slide, [
    { kind: 'line', color: C.cmp2, label: '一律（外周も内側も同じ間隔）', width: 2.6 },
    { kind: 'line', color: D2.color, label: '領域別（最もよい間隔の組み合わせ）', width: 3.0 },
  ], 1.35, 6.5, { fontSize: 10.5 });

  // 右：要点と感度
  const rx = 8.35;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 1.75, { fill: C.gray });
  addText(slide, '計測を半分にしたときの誤差の悪化', rx + 0.2, 1.65, rw - 0.4, 0.3, { fontSize: 12, bold: true });
  addText(slide, '一律', rx + 0.3, 2.05, 1.0, 0.42, { fontSize: 13, color: C.muted, valign: 'middle' });
  addText(slide, `+${pct(uniformWorse)}`, rx + 1.2, 2.0, 1.4, 0.5, { fontSize: 24, bold: true, color: C.cmp3, valign: 'middle' });
  addText(slide, '領域別', rx + 2.35, 2.05, 1.0, 0.42, { fontSize: 13, color: D2.color, valign: 'middle' });
  addText(slide, `+${pct(adaptiveWorse)}`, rx + 3.1, 2.0, 1.2, 0.5, { fontSize: 24, bold: true, color: D2.color, valign: 'middle' });
  addText(slide, `同じ誤差なら、領域別は計測点をさらに${pct(sameErrorCut)}減らせる（${MH.half_uniform.cost}→${Math.round(MH.same_error_adaptive.cost)}点）`, rx + 0.2, 2.62, rw - 0.4, 0.6, { fontSize: 11.5 });
  addText(slide, '変化の速さの比（外周÷内側）と効果', rx, 3.5, rw, 0.3, { fontSize: 12, bold: true });
  const header = [headCell('速さの比', C.cmp3, { align: 'center' }), headCell('同じ誤差での\n計測点の削減', D2.color, { align: 'center' }), headCell('同じ点数での\n誤差の改善', D2.color, { align: 'center' })];
  const rows = MR.ratio_sweep.map((r) => [
    bodyCell(`${r.ratio}倍`, { align: 'center', bold: true }),
    bodyCell(pct(r.same_error_cost_reduction), { align: 'center' }),
    bodyCell(pct(r.same_cost_error_reduction), { align: 'center' }),
  ]);
  addTableBox(slide, [header, ...rows], rx, 3.85, rw, [1.18, 1.6, 1.6], { rowH: [0.5, 0.27, 0.27, 0.27, 0.27, 0.27], fontSize: 10.5 });
  addText(slide, '差が2倍以下では効果がない。内側をすでに間引いた計画（外周だけCPE）でも上乗せはほぼない → 先に③で変化の速さを測る', rx, 5.8, rw, 0.75, { fontSize: 11, color: C.ink });
  const a = MR.assumptions;
  addSource(slide, `前提（合成データ）：1ロットあたりの変化（ランダムウォークの歩幅）外周${a.drift_step_nm.edge}・内側${a.drift_step_nm.inner} nm、1回の計測での推定のばらつき 外周${a.estimate_noise_nm.edge}・内側${a.estimate_noise_nm.inner} nm、計測点 外周${a.points_per_measurement.edge}・内側${a.points_per_measurement.inner}点。カルマンフィルタで追ったときの定常状態の誤差を式で計算し、点数（面積）で重み付け。間隔は1〜12ロット`, { y: 6.9, h: 0.5, fontSize: 8 });
}

// =====================================================================
// 14. ② 追加提案
// =====================================================================
{
  const slide = newContentSlide('② 計測最適化｜追加提案', '点の置き方・分担・要否の判断で、計測をさらに絞る', [
    '計測最適化について、メモ以外の提案を5つ加えます。',
    '1つ目は、補正モデルに合わせた点の配置です。実験計画法のD最適やI最適の考え方で、係数や予測のばらつきが最小になる点を選びます。最適化した50点の配置で全面960点とほぼ同じ補正ができ、計測時間が26パーセント減って歩留まりは同等だったという報告があります。計測誤差が補正へどれだけ伝わるかは、配置とモデルから事前に計算できます。',
    '2つ目は、ウェーハやロットの間で点を分担するローテーションです。1枚ごとに違う点を測り、数ロット分を合わせて密なマップを作ります。右下の図がそのイメージです。',
    '3つ目は、仮想測定の予測の不確かさで、測るかどうかを決めることです。PM後やレチクル交換後など、変化が起きやすいイベントの後は一時的に増やします。',
    '4つ目は、アライメントの点数も計測コストとして最適化することです。マークを増やすと露光のスループットが落ちるので、少ない点と仮想測定の面内推定を組み合わせます。',
    '5つ目は、計測の価値に応じた配分です。マージンの小さい層や、変化の起きやすいロットに計測を集中させます。まばらな計測から密に測ったのと同じ出力を得る手法も報告されています。',
  ], { domainIndex: 1 });
  const cw = 3.9;
  const ch = 2.5;
  const cards = [
    { title: 'モデルに合わせた点の配置', body: 'D最適・I最適の考え方で、係数や予測のばらつきが最小になる点を選ぶ。最適化した50点で全面960点とほぼ同じ補正ができ、計測時間26%減・歩留まり同等の報告がある。計測誤差が補正へ伝わる量は、配置とモデルから事前に計算できる。', source: cite('chiu2012', 'klein2026') },
    { title: '点をロット間で分担する', body: '1枚ごとに違う点を測り、数ロット分を合わせて密なマップを作る（ローテーション）。ゆっくり動く成分は、1枚を密に測らなくても学べる。右下の図を参照。' },
    { title: '不確かさで測るかを決める', body: '④の予測の不確かさが大きいロット・領域だけを実測する。PM後・レチクル交換後・新品種など、変化が起きやすいイベントの後は一時的に増やす。' },
    { title: 'アライメント点数も最適化', body: 'マークを増やすと露光のスループットが落ちるため、アライメントの点数は限られる。少ない点と④の面内推定を組み合わせ、高次補正に必要な情報を得る。', source: cite('chen2018', 'lee2017topo') },
    { title: '計測の価値で配分する', body: 'マージンの小さい層、変化の起きやすいロット、補正の効きが大きい領域に計測を集中させる。まばらな計測から、密に測ったのと同じ出力を得る手法も報告されている（全面OCD）。', source: cite('doutt2023') },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.22);
    const y = 1.55 + Math.floor(i / 3) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D2, kind: 'add', num: i + 1, ...card, bodySize: 11.5, titleSize: 13.5 });
  });
  // 6つ目のマス：ローテーションの図
  const x = MARGIN_X + 2 * (cw + 0.22);
  const y = 1.55 + ch + 0.2;
  addCard(slide, x, y, cw, ch, { fill: D2.tint });
  addText(slide, 'ローテーションの例', x + 0.2, y + 0.1, cw - 0.4, 0.3, { fontSize: 12, bold: true, color: D2.color });
  const centers = EDGE.layout.shots.filter((s) => s.marks >= 3);
  const r = 0.46;
  [0, 1, 2].forEach((k) => {
    const wx = x + 0.62 + k * 1.05;
    const wy = y + 1.05;
    slide.addShape(pres.shapes.OVAL, { x: wx - r, y: wy - r, w: 2 * r, h: 2 * r, fill: { color: C.white }, line: { color: C.muted, width: 0.75 } });
    centers.forEach((s, i) => {
      if (i % 3 !== k) return;
      addDot(slide, wx + (s.x / WAFER_RADIUS_MM) * r * 0.92, wy - (s.y / WAFER_RADIUS_MM) * r * 0.92, 0.055, D2.color);
    });
    addText(slide, `ロット${k + 1}`, wx - 0.45, wy + r + 0.04, 0.9, 0.24, { fontSize: 9.5, color: C.muted, align: 'center' });
  });
  addText(slide, '→ 合わせると全Shotを網羅', x + 0.2, y + 1.85, cw - 0.4, 0.3, { fontSize: 11, bold: true, color: D2.color });
  addText(slide, '各ロットは3分の1のShotだけを測る', x + 0.2, y + 2.13, cw - 0.4, 0.3, { fontSize: 10, color: C.muted });
}

// =====================================================================
// 15. ③ 傾向監視：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('③ 傾向監視｜メモからの具体案', '面内傾向を潜在成分に分け、工程経路とつないで「直す単位」を決める', [
    '傾向監視について、メモの内容を流れにしました。',
    '上の段は、メモの出発点です。重ね合わせの面内傾向は、成膜、CMP、エッチングなど、複数の工程の面内傾向が積み重なってできています。',
    '下の段が具体案の流れです。まず、主成分分析などで、ウェーハの間で一緒に動く面内の形、つまり潜在成分を取り出します。上位2成分で変動の60パーセント、4成分で75パーセントを説明できたという報告があります。',
    '次に、各ウェーハが通った号機やチャンバーと、成分の強さを突き合わせて、効いている工程を見つけます。機械学習で、影響の大きい非リソ工程の文脈を自動で見つけた例があります。',
    'そのうえで、同じ形を生む経路をまとめて経路グループとし、補正、計測、監視の単位にします。形状データでウェーハを群に分けて群ごとに補正した例では、平均と3シグマの和が最大31パーセント改善し、外周で効果が大きかったと報告されています。',
    '最後が監視と見積もりで、サンキー図での経路の監視と、補正パラメータの動きから出来栄えの想定範囲を見積もる方法を、続く2枚で説明します。',
  ], { domainIndex: 2 });
  // 上段：積み重ね
  const ty = 1.6;
  addText(slide, 'メモの出発点：OVLの面内傾向は、複数工程の面内傾向の積み重ね', MARGIN_X, ty, CONTENT_W, 0.3, { fontSize: 12.5, bold: true, color: D3.color });
  const parts = [['OVLの面内傾向', D3.color, C.white], ['＝'], ['成膜の傾向', D3.tint, C.ink], ['＋'], ['CMPの傾向', D3.tint, C.ink], ['＋'], ['エッチングの傾向', D3.tint, C.ink], ['＋'], ['露光機の傾向 …', D3.tint, C.ink]];
  let x = MARGIN_X;
  parts.forEach(([label, fill, color]) => {
    if (!fill) {
      addText(slide, label, x, ty + 0.42, 0.42, 0.56, { fontSize: 18, bold: true, color: C.muted, align: 'center', valign: 'middle' });
      x += 0.42;
      return;
    }
    const w = 2.05;
    addCard(slide, x, ty + 0.42, w, 0.56, { fill });
    addText(slide, label, x, ty + 0.42, w, 0.56, { fontSize: 12.5, bold: true, color, align: 'center', valign: 'middle' });
    x += w;
  });
  // 下段：4つのステップ
  const sy = 2.95;
  const sw = 2.88;
  const sh = 3.1;
  const steps = [
    { title: '潜在成分に分解', body: '主成分分析などで、ウェーハ間で一緒に動く面内の形（成分）を取り出す。報告例では上位2成分で変動の60%、4成分で75%を説明した。', source: cite('mohammad2026') },
    { title: '工程経路とつなぐ', body: '各ウェーハが通った号機・チャンバーと成分の強さを突き合わせ、効いている工程を見つける。影響の大きい非リソ工程の文脈を機械学習で自動抽出した例がある。', source: cite('overcast2018', 'boese2026') },
    { title: '経路をグループ化', body: '同じ形を生む経路をまとめ、補正・計測・監視の単位にする。形状データでウェーハを群分けした補正で|平均|+3σが最大31%改善し、外周で効果が大きかった。', source: cite('lee2017topo') },
    { title: '監視と見積もり', body: 'サンキー図で経路を監視する（次のスライド）。補正パラメータのロット間の動きから、測っていない点の出来栄えの想定範囲を見積もる（その次のスライド）。' },
  ];
  steps.forEach((s, i) => {
    const sx = MARGIN_X + i * (sw + 0.2);
    addCard(slide, sx, sy, sw, sh, { fill: C.gray });
    addNode(slide, sx + 0.32, sy + 0.33, 0.4, D3.color, String(i + 1), { fontSize: 12 });
    addText(slide, s.title, sx + 0.62, sy + 0.12, sw - 1.35, 0.44, { fontSize: 13.5, bold: true, valign: 'middle' });
    addOriginTag(slide, 'memo', sx + sw - 0.68, sy + 0.2);
    addText(slide, s.body, sx + 0.22, sy + 0.66, sw - 0.42, sh - 1.1, { fontSize: 11.5 });
    if (s.source) addText(slide, s.source, sx + 0.22, sy + sh - 0.42, sw - 0.42, 0.34, { fontSize: 8.5, color: C.muted, valign: 'bottom' });
    if (i < steps.length - 1) addLine(slide, sx + sw + 0.02, sy + sh / 2, sx + sw + 0.18, sy + sh / 2, { color: D3.color, width: 2, arrow: true });
  });
  addCard(slide, MARGIN_X, 6.22, CONTENT_W, 0.62, { fill: D3.tint });
  addText(slide, [
    { text: 'ポイント：', bold: true, color: D3.color },
    { text: '成分ごとに「どの工程が作り、どれだけ速く動くか」が分かれば、①の補正の単位、②の計測の頻度、⑤の既知の形が決まる。' },
  ], MARGIN_X + 0.25, 6.22, CONTENT_W - 0.5, 0.62, { fontSize: 12, valign: 'middle' });
}

// =====================================================================
// 16. ③ サンキー図
// =====================================================================
const OUTCOME_COLORS = { 外周型: D3.color, 鞍型: '6F7FA8', 良好: 'CDD3DE' };

function drawBand(slide, x1, y1, x2, y2, height, color) {
  const steps = 24;
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const s = 3 * t * t - 2 * t * t * t;
    const x = x1 + (x2 - x1) * t;
    top.push([x, y1 + (y2 - y1) * s]);
    bottom.push([x, y1 + height + (y2 - y1) * s]);
  }
  drawPolygon(slide, [...top, ...bottom.reverse()], { fill: color, transparency: 30 });
}

function drawAlluvial(slide, area) {
  const columns = [...SK.steps.map((s) => ({ name: s.name, nodes: s.nodes })), { name: '面内傾向（OVL）', nodes: SK.outcomes }];
  const outcomeIndex = Object.fromEntries(SK.outcomes.map((o, i) => [o, i]));
  const routes = SK.routes.map((r) => ({ path: [...r.route, r.outcome], outcome: r.outcome, count: r.count }));
  const total = routes.reduce((a, r) => a + r.count, 0);
  const nodeW = 0.62;
  const gap = 0.2;
  const maxNodes = Math.max(...columns.map((c) => c.nodes.length));
  const scale = (area.h - gap * (maxNodes - 1)) / total;
  const colX = columns.map((_, i) => area.x + (i * (area.w - nodeW)) / (columns.length - 1));
  const nodePos = columns.map((col, ci) => {
    const counts = col.nodes.map((n) => routes.filter((r) => r.path[ci] === n).reduce((a, r) => a + r.count, 0));
    const used = counts.reduce((a, c) => a + c * scale, 0) + gap * (col.nodes.length - 1);
    let y = area.y + (area.h - used) / 2;
    return col.nodes.map((n, ni) => {
      const pos = { name: n, y, h: counts[ni] * scale, count: counts[ni] };
      y += pos.h + gap;
      return pos;
    });
  });
  for (let ci = 0; ci < columns.length - 1; ci += 1) {
    const groups = {};
    routes.forEach((r) => {
      const key = `${r.path[ci]}|${r.path[ci + 1]}|${r.outcome}`;
      groups[key] = (groups[key] || 0) + r.count;
    });
    const links = Object.entries(groups).map(([k, c]) => {
      const [s, t, o] = k.split('|');
      return { s, t, o, c };
    });
    const srcIdx = (n) => columns[ci].nodes.indexOf(n);
    const tgtIdx = (n) => columns[ci + 1].nodes.indexOf(n);
    const outCursor = {};
    const inCursor = {};
    columns[ci].nodes.forEach((n, i) => { outCursor[n] = nodePos[ci][i].y; });
    columns[ci + 1].nodes.forEach((n, i) => { inCursor[n] = nodePos[ci + 1][i].y; });
    [...links].sort((a, b) => srcIdx(a.s) - srcIdx(b.s) || tgtIdx(a.t) - tgtIdx(b.t) || outcomeIndex[a.o] - outcomeIndex[b.o])
      .forEach((l) => { l.ys = outCursor[l.s]; outCursor[l.s] += l.c * scale; });
    [...links].sort((a, b) => tgtIdx(a.t) - tgtIdx(b.t) || srcIdx(a.s) - srcIdx(b.s) || outcomeIndex[a.o] - outcomeIndex[b.o])
      .forEach((l) => { l.yt = inCursor[l.t]; inCursor[l.t] += l.c * scale; });
    links.forEach((l) => drawBand(slide, colX[ci] + nodeW, l.ys, colX[ci + 1], l.yt, l.c * scale, OUTCOME_COLORS[l.o]));
  }
  columns.forEach((col, ci) => {
    addText(slide, col.name, colX[ci] - 0.6, area.y - 0.42, nodeW + 1.2, 0.3, { fontSize: 11.5, bold: true, color: C.ink, align: 'center' });
    nodePos[ci].forEach((n) => {
      const isOutcome = ci === columns.length - 1;
      addRect(slide, colX[ci], n.y, nodeW, n.h, { fill: isOutcome ? OUTCOME_COLORS[n.name] : C.cmp3 });
      if (isOutcome) addText(slide, `${n.name}（${n.count}）`, colX[ci] + nodeW + 0.08, n.y + n.h / 2 - 0.15, 1.3, 0.3, { fontSize: 11, bold: true, valign: 'middle' });
      else addText(slide, `${n.name}\n${n.count}枚`, colX[ci], n.y + n.h / 2 - 0.25, nodeW, 0.5, { fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle' });
    });
  });
}

{
  const slide = newContentSlide('③ 傾向監視｜サンキー図の例', 'サンキー図で、どの経路に傾向が集中しているかを一目で見る', [
    'メモにあった、サンキーダイアグラムによる経路の監視の例です。数値は合成データです。',
    '左から、成膜、CMP、エッチングの号機を通り、右端でウェーハの面内傾向を外周型、鞍型、良好に分けています。帯の太さはウェーハの枚数で、帯の色は最終的な面内傾向です。',
    `この例では、CMPのB2を通ったウェーハは外周型が${pct(shareEdgeB2)}で、それ以外の経路の${pct(shareEdgeOther)}より大きく偏っています。また、成膜A2とエッチングC2の組み合わせでは鞍型が${pct(shareSaddleA2C2)}で、それ以外の${pct(shareSaddleOther)}と比べて多くなっています。`,
    'こうした偏りから、経路グループを決めます。B2経由は外周の補正を強めて外周の計測を毎ロットにし、A2とC2の組み合わせは鞍型の成分を補正に加える、といった使い方です。',
    '注意点として、サンキー図は仮説を見つける道具です。偏りが偶然でないかは統計的な検定で、補正の効果はR2Rシミュレーションで確かめます。また、組み合わせの効果は1つの工程だけを見ても分からないので、成分と経路の対応は複数の工程を同時に見て調べます。',
  ], { domainIndex: 2 });
  drawAlluvial(slide, { x: MARGIN_X + 0.1, y: 2.05, w: 6.9, h: 4.05 });
  addLegend(slide, SK.outcomes.map((o) => ({ kind: 'box', color: OUTCOME_COLORS[o], label: o, width: 0.75 })), MARGIN_X + 0.1, 6.28, { fontSize: 10.5 });
  addText(slide, `合成データ（${SK.wafers}枚）。帯の太さ＝ウェーハ枚数、色＝最終的な面内傾向`, MARGIN_X + 0.1, 6.6, 7.5, 0.26, { fontSize: 10, color: C.muted, valign: 'middle' });

  const rx = 9.15;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 2.2, { fill: C.gray });
  addText(slide, '読み取り', rx + 0.2, 1.65, rw - 0.4, 0.3, { fontSize: 13, bold: true });
  addBullets(slide, [
    `CMPのB2を通ると外周型が${pct(shareEdgeB2)}（他の経路は${pct(shareEdgeOther)}）`,
    `成膜A2かつエッチングC2で鞍型が${pct(shareSaddleA2C2)}（他は${pct(shareSaddleOther)}）`,
    '組み合わせで効く経路は、1工程ずつ見ても分からない',
  ], rx + 0.2, 2.02, rw - 0.4, 1.65, { fontSize: 11.5, space: 4 });
  addText(slide, '経路グループの例', rx, 3.95, rw, 0.3, { fontSize: 13, bold: true, color: D3.color });
  const header = [headCell('グループ', D3.color), headCell('使い方', D3.color)];
  const rows = [
    ['G1：B2経由', '外周の補正を強め、外周を毎ロット測る'],
    ['G2：A2×C2', '鞍型の成分を補正の項に加える'],
    ['G3：その他', '共通の補正・通常の計測'],
  ].map(([a, b]) => [bodyCell(a, { bold: true }), bodyCell(b)]);
  addTableBox(slide, [header, ...rows], rx, 4.3, rw, [1.25, rw - 1.25], { rowH: [0.32, 0.5, 0.5, 0.5], fontSize: 10.5 });
  addText(slide, 'サンキー図は仮説を見つける道具。偏りは統計的な検定で、効果はR2Rシミュレーションで確かめる', rx, 6.2, rw, 0.62, { fontSize: 10.5, color: C.muted });
}

// =====================================================================
// 17. ③ 補正パラメータのトレンドから想定範囲
// =====================================================================
function lerpColor(a, b, t) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [0, 2, 4].map((i) => parseInt(b.slice(i, i + 2), 16));
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(Math.max(t, 0), 1)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

{
  const slide = newContentSlide('③ 傾向監視｜メモからの具体案', '補正パラメータのロット間の動きから、測らない点の想定範囲を見積もる', [
    'メモにあった、面内制御や高次補正では、PQCで全体を保証しにくいという課題への具体案です。',
    '考え方はこうです。高次の補正では、ロットごとに補正パラメータが変わります。前のロットの推定で次のロットを補正するので、次のロットに残るずれは、主にロット間でパラメータがどれだけ動くかで決まります。そこで、補正パラメータのロット間の変化の共分散を過去の記録から求め、それを式の各項の値を通して面内の全点へ伝えます。補正しきれないばらつきは、計測点の残差から見積もって足します。',
    'こうすると、測っていない点も含めて、出来栄えの想定範囲をマップにできます。中央の図は合成データでの例で、外周ほど範囲が広くなっています。',
    `合成データで確かめたところ、式で表せる変化だけのときは、測っていない点の残差のうち${(RANGE_OK.coverage.all * 100).toFixed(1)}パーセントが想定範囲に収まり、3シグマの理論値とほぼ一致しました。`,
    `一方、外周に式で表せない変化があると、外周で${(RANGE_NG.coverage.edge * 100).toFixed(1)}パーセントまで下がりました。つまり、式で表せない成分があると外周で範囲を過小評価します。外周は制御最適化の外周CPEや、異常検知の監視と組み合わせる必要があります。`,
  ], { domainIndex: 2 });
  // 左：考え方と式
  const lw = 4.55;
  addOriginTag(slide, 'memo', MARGIN_X, 1.58);
  addText(slide, '考え方', MARGIN_X + 0.66, 1.55, 3, 0.32, { fontSize: 13, bold: true, color: D3.color });
  addText(slide, '前ロットの推定で次ロットを補正するので、残るずれは「パラメータのロット間の動き」で決まる。その大きさを面内の全点へ伝えれば、測っていない点の範囲が分かる。', MARGIN_X, 1.95, lw, 1.1, { fontSize: 12 });
  addCard(slide, MARGIN_X, 3.1, lw, 1.62, { fill: D3.tint });
  addText(slide, '想定範囲（3σ）', MARGIN_X + 0.2, 3.18, lw - 0.4, 0.3, { fontSize: 11.5, bold: true, color: D3.color });
  addText(slide, [{ text: '＝ 3 √( j(x)^{T} Σ j(x) ＋ σ_{r}^{2} )' }], MARGIN_X + 0.35, 3.5, lw - 0.5, 0.45, { fontSize: 17, bold: true, color: D3.color });
  addText(slide, 'j(x)：位置xでの式の各項の値\nΣ：補正パラメータのロット間の変化の共分散\nσ_{r}：補正しきれないばらつき（計測点の残差から）', MARGIN_X + 0.2, 3.98, lw - 0.4, 0.72, { fontSize: 10.5 });
  const steps = ['補正パラメータを毎ロット記録', 'ロット間の変化の共分散を計算', '面内の全点へ伝えてマップ化', 'スペックを超える場所・ロットを警告'];
  steps.forEach((s, i) => {
    const y = 4.9 + i * 0.47;
    addNode(slide, MARGIN_X + 0.2, y + 0.2, 0.34, D3.color, String(i + 1), { fontSize: 11 });
    addText(slide, s, MARGIN_X + 0.48, y, lw - 0.5, 0.4, { fontSize: 12, valign: 'middle' });
  });
  // 中央：想定範囲のマップ
  const cx = 7.15;
  const cy = 3.75;
  const radius = 1.75;
  addText(slide, '想定範囲（3σ）のマップ（合成データ）', 5.4, 1.55, 3.6, 0.3, { fontSize: 12, bold: true, align: 'center' });
  const ranges = RANGE_OK.shot_range_nm;
  const rMin = Math.min(...ranges);
  const rMax = Math.max(...ranges);
  const shots = EDGE.layout.shots.map((s, i) => ({ ...s, range: ranges[i] }));
  const light = 'F8EEDC';
  const dark = '8A5A10';
  drawWafer(slide, cx, cy, radius, shots, (s) => ({ fill: lerpColor(light, dark, (s.range - rMin) / (rMax - rMin)) }));
  // 色の目盛り
  const legendY = 5.78;
  const nSteps = 5;
  for (let i = 0; i < nSteps; i += 1) {
    addRect(slide, 5.75 + i * 0.58, legendY, 0.58, 0.2, { fill: lerpColor(light, dark, i / (nSteps - 1)), line: C.white });
  }
  addText(slide, `${f1(rMin)} nm`, 5.45, legendY + 0.24, 1.0, 0.24, { fontSize: 10, color: C.muted });
  addText(slide, `${f1(rMax)} nm`, 7.8, legendY + 0.24, 1.0, 0.24, { fontSize: 10, color: C.muted, align: 'right' });
  addText(slide, 'Shot内で最も広い範囲', 6.2, legendY + 0.24, 1.9, 0.24, { fontSize: 9.5, color: C.muted, align: 'center' });

  // 右：確認結果
  const rx = 9.35;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '範囲に実際の残差が入った割合', rx, 1.55, rw, 0.3, { fontSize: 12.5, bold: true });
  addText(slide, '測っていない点で評価。3σの理論値は99.7%', rx, 1.87, rw, 0.26, { fontSize: 10, color: C.muted });
  const header = [headCell('ケース', D3.color), headCell('全体', D3.color, { align: 'center' }), headCell('外周', D3.color, { align: 'center' }), headCell('内側', D3.color, { align: 'center' })];
  const fmt = (v) => `${(v * 100).toFixed(1)}%`;
  const rows = [
    [bodyCell('式で表せる変化だけ', { bold: true }), bodyCell(fmt(RANGE_OK.coverage.all), { align: 'center' }), bodyCell(fmt(RANGE_OK.coverage.edge), { align: 'center' }), bodyCell(fmt(RANGE_OK.coverage.inner), { align: 'center' })],
    [bodyCell('外周に式で表せない変化', { bold: true }), bodyCell(fmt(RANGE_NG.coverage.all), { align: 'center' }), bodyCell(fmt(RANGE_NG.coverage.edge), { align: 'center', bold: true, color: D5.color }), bodyCell(fmt(RANGE_NG.coverage.inner), { align: 'center' })],
  ];
  addTableBox(slide, [header, ...rows], rx, 2.2, rw, [1.45, 0.66, 0.66, 0.61], { rowH: [0.32, 0.56, 0.56], fontSize: 10.5 });
  addCard(slide, rx, 3.85, rw, 2.45, { fill: C.gray });
  addBullets(slide, [
    '式で表せる変化なら、範囲の見積もりは理論どおりに当たる',
    '式で表せない成分があると、外周で範囲を過小評価する',
    '→ 外周は①の外周CPE・⑤の監視と組み合わせる。範囲の当たり率そのものも監視する',
  ], rx + 0.2, 4.0, rw - 0.4, 2.2, { fontSize: 11.5, space: 5 });
  const a = RANGE.assumptions;
  addSource(slide, `前提（合成データ）：ウェーハ座標の2〜3次の形がロットごとに変化（RMS ${a.drift_rms_nm} nm）、補正できないばらつき ${a.random_nm} nm。25Shot（${a.measured_points}点）を測って前ロットの推定で補正。${a.history_lots}ロットの記録から範囲を作り、続く${a.check_lots}ロットで確認（${a.trials}回）。式で表せない変化は外周の放射状のずれ（歩幅 ${a.edge_drift_nm} nm）`, { y: 6.9, h: 0.5, fontSize: 8 });
}

// =====================================================================
// 18. ③ 追加提案
// =====================================================================
{
  const slide = newContentSlide('③ 傾向監視｜追加提案', '残差・変化点・上流の形状も監視し、打ち手と投資の判断につなげる', [
    '傾向監視について、メモ以外の提案を4つ加えます。',
    '1つ目は、補正しきれない残差の成分を監視して、投資判断の根拠にすることです。残差の成分が増えてきたら、新しいkが必要なのか、上流の対策が必要なのかを判断します。制御最適化の費用対効果の評価とつながります。項の選択結果を監視すると、普段は現れない項を持つロットを異常として見つけられたという報告もあります。',
    '2つ目は、変化点の検知です。成分の強さや補正値が変わった時点を捉え、PMやレチクル交換、レシピ変更の記録と照合します。変化点の後はFBの履歴を切り替え、計測を一時的に増やします。',
    '3つ目は、上流のウェーハ形状で原因工程を探すことです。工程ごとのウェーハ形状を追跡し、重ね合わせの面内傾向と比べて原因工程を特定した例があります。最も安い補正は、ずれを作らないことです。',
    '4つ目は、号機やチャックの間の差を常時比べることです。仮想測定の予測を使うと、まばらな実測より早く号機やチャンバーのずれに気づけたという報告があります。',
  ], { domainIndex: 2 });
  const cw = (CONTENT_W - 0.2) / 2;
  const ch = 2.5;
  const cards = [
    { title: '補正しきれない残差を監視し、投資判断へ', body: '残差の成分が増えたら、新しいkが必要か、上流の対策が必要かを判断する（①の費用対効果とつなぐ）。項の選択結果を監視すると、普段は現れない項を持つロットを異常として見つけられた。', source: cite('ehrlich2025') },
    { title: '変化点を検知して「いつ変わったか」を捉える', body: '成分の強さや補正値の変化点（CUSUMなど）を検知し、PM・レチクル交換・レシピ変更の記録と照合する。変化点の後はFBの履歴を切り替え、計測を一時的に増やす（②）。' },
    { title: '上流のウェーハ形状で原因工程を探す', body: '工程ごとのウェーハ形状（PWG）を追跡し、OVLの面内傾向と比べて原因工程を特定した例がある。最も安い補正は「ずれを作らないこと」。原因の工程へ対策を返す。', source: cite('ham2024') },
    { title: '号機・チャック間の差を常時比べる', body: '同じ層を処理する号機・チャックの間で成分の差を定点監視し、差が広がったら校正する。VMの予測を使うと、まばらな実測より早く号機・チャンバーのずれに気づけた。', source: cite('kim2026') },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 2) * (cw + 0.2);
    const y = 1.55 + Math.floor(i / 2) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D3, kind: 'add', num: i + 1, ...card, bodySize: 12 });
  });
}

// =====================================================================
// 19. ④ 仮想測定：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('④ 仮想測定｜メモからの具体案', '装置と工程のデータで未測定を予測し、部分アライメントから高次FFへ', [
    '仮想測定について、メモの内容を具体化しました。',
    '左側は、測っていない領域を予測する仕組みです。入力は、メモにあったウェーハの歪み、露光機のアライメント情報、部分的な重ね合わせの計測値、APCの制御値、露光機の収差、真空系のパラメータに、傾向監視で決めた経路グループを加えました。',
    '予測モデルは、物理で説明できる部分、たとえばウェーハの形状から面内の歪み、収差からパターンのずれを先に計算し、残りをデータで学習する形がよいと考えます。予測には不確かさを付けます。アライメント、レベリング、レンズ、APCのデータを格子にまとめて深層学習で予測し、少ないデータで追加学習して精度を保った例があります。',
    '右側は、メモの2つ目の案で、部分的なアライメント計測から面内全体を推定し、より高次のFFへつなげる流れです。少ないマークを測り、過去に学んだ形を使って面内全体を推定し、ウェーハごとに高次の補正をかけます。',
    'アライメントの点数を増やさずにFFの次数を上げられるので、スループットを落としません。次のスライドで、この考え方を合成データで確かめます。',
  ], { domainIndex: 3 });
  const inputs = ['ウェーハの歪み・形状', '露光機のアライメント情報', '部分的なOVL計測値', 'APCの制御値（補正の履歴）', '露光機の収差（レンズ）', '真空系・チャックのパラメータ', '工程経路（③の経路グループ）'];
  addText(slide, '入力', MARGIN_X, 1.55, 0.6, 0.3, { fontSize: 12.5, bold: true, color: D4.color });
  addOriginTag(slide, 'memo', MARGIN_X + 0.62, 1.57);
  inputs.forEach((t, i) => {
    const y = 1.92 + i * 0.6;
    addCard(slide, MARGIN_X, y, 2.85, 0.5, { fill: i === 6 ? D3.tint : D4.tint });
    addText(slide, t, MARGIN_X + 0.12, y, 2.65, 0.5, { fontSize: 11.5, valign: 'middle' });
    addLine(slide, MARGIN_X + 2.87, y + 0.25, 3.72, 3.95, { color: D4.color, width: 1, arrow: i === 3 });
  });
  addCard(slide, 3.8, 2.75, 2.55, 2.4, { fill: D4.color });
  addText(slide, '予測モデル', 3.95, 2.87, 2.25, 0.34, { fontSize: 14, bold: true, color: C.white, align: 'center' });
  addText(slide, '物理で説明できる部分（形状→面内歪み、収差→パターンのずれ）を先に計算し、残りをデータで学習する。予測に不確かさを付ける', 3.98, 3.3, 2.2, 1.8, { fontSize: 11, color: C.white });
  addLine(slide, 6.37, 3.95, 6.72, 3.95, { color: D4.color, width: 2, arrow: true });
  const outputs = ['未測定の点・Shot・ウェーハのOVL', 'ウェーハごとの面内の歪みマップ', '予測の不確かさ（測るかの判断へ）'];
  addText(slide, '出力', 6.8, 2.35, 2.2, 0.3, { fontSize: 12.5, bold: true, color: D4.color });
  outputs.forEach((t, i) => {
    const y = 2.72 + i * 0.85;
    addCard(slide, 6.8, y, 2.2, 0.72, { fill: C.gray, line: D4.color });
    addText(slide, t, 6.92, y, 1.98, 0.72, { fontSize: 11, valign: 'middle' });
  });
  addText(slide, '例：多種のデータを格子にまとめて予測し、少ないデータの追加学習で長期間の精度を保った', 3.8, 5.3, 5.2, 0.62, { fontSize: 10.5, color: C.ink });
  addText(slide, cite('park2025'), 3.8, 5.92, 5.2, 0.3, { fontSize: 8.5, color: C.muted });

  // 右：部分アライメント→高次FF
  const rx = 9.35;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 5.2, { fill: D4.tint });
  addText(slide, '部分アライメント→高次FF', rx + 0.2, 1.65, rw - 0.95, 0.34, { fontSize: 13, bold: true, color: D4.color });
  addOriginTag(slide, 'memo', rx + rw - 0.72, 1.7);
  const flow = [
    ['少ないマークを測る', 'スループットを落とさない点数で測る'],
    ['学んだ形で面内全体を推定', '③の潜在成分（過去ウェーハの形）を使い、少ない点から全体を推定'],
    ['ウェーハごとに高次の補正', '推定した歪みマップから、そのウェーハに高次のFFをかける'],
  ];
  flow.forEach(([h, b], i) => {
    const y = 2.15 + i * 1.33;
    addCard(slide, rx + 0.2, y, rw - 0.4, 1.05, { fill: C.white, line: D4.color });
    addText(slide, h, rx + 0.35, y + 0.06, rw - 0.7, 0.34, { fontSize: 12.5, bold: true, color: D4.color });
    addText(slide, b, rx + 0.35, y + 0.4, rw - 0.7, 0.62, { fontSize: 11 });
    if (i < flow.length - 1) addLine(slide, rx + rw / 2, y + 1.07, rx + rw / 2, y + 1.3, { color: D4.color, width: 2, arrow: true });
  });
  addText(slide, 'アライメントの点数を増やさずに、FFの次数を上げる', rx + 0.2, 6.15, rw - 0.4, 0.5, { fontSize: 11.5, bold: true, color: D4.color });
}

// =====================================================================
// 20. ④ 合成データ：部分アライメントからの面内推定
// =====================================================================
{
  const slide = newContentSlide('④ 仮想測定｜合成データでの確認', `学習した形を使うと、${vmMatch.marks}点で多項式${VM96.marks}点並みの面内推定ができる`, [
    '部分的なアライメントから面内を推定する案を、合成データで確かめました。',
    '合成データでは、ウェーハの歪みを、外周の放射状のずれ、反りに伴う3次の歪み、3回対称の歪み、局所的な盛り上がりに伴う歪みの4つの形と、線形の成分、ばらつきの和としました。過去の200枚を密に測った記録から主成分分析で4つの形を学び、新しいウェーハを少ない点で測って面内全体を推定しました。',
    '左の図は16点の配置で、できるだけ散らばるように選んでいます。',
    `グラフの横軸は測った点の数、縦軸は推定した歪みで補正した後に残るずれです。多項式の当てはめは点が少ないと大きく外れ、5次の多項式でも${VM96.marks}点で${f2(VM96.poly5)}ナノメートルです。学んだ形を使う方法は、${vmMatch.marks}点で${f2(vmMatch.latent)}ナノメートルとほぼ同じ精度になりました。`,
    `ただし、過去にない形が現れると弱くなります。履歴にない局所的な歪みを加えると、${VM16.marks}点での誤差は${f2(VM16.latent_new)}ナノメートルに悪化しました。当てはめの残差で見分けると、誤報を${pct(VM.detection.false_alarm_rate)}に抑えて${pct(VM.detection.detection_rate)}を検知できました。検知したら計測を増やし、形を学び直す、という異常検知との組み合わせが前提になります。`,
  ], { domainIndex: 3 });
  // 左：16点の配置
  const cx = 2.25;
  const cy = 3.45;
  const radius = 1.55;
  addText(slide, `${VM16.marks}点の配置`, MARGIN_X, 1.5, 3.4, 0.3, { fontSize: 12, bold: true });
  const { toSlide } = drawWafer(slide, cx, cy, radius, EDGE.layout.shots, () => ({ fill: 'EEF0F4' }));
  VM.mark_order.slice(0, VM16.marks).forEach((p) => {
    const [sx, sy] = toSlide(p);
    addDot(slide, sx, sy, 0.13, D4.color, { lineColor: C.white });
  });
  addText(slide, '散らばるように選んだアライメントマーク。外周の点を多く含む', MARGIN_X, 5.2, 3.4, 0.55, { fontSize: 10.5, color: C.muted });

  // 中央：グラフ
  const marks = VM.curve.map((c) => c.marks);
  const box = { x: 4.65, y: 1.95, w: 4.45, h: 3.65 };
  const seriesDefs = [
    { key: 'linear', color: C.cmp1, label: '線形のみ（6項）' },
    { key: 'poly3', color: C.cmp2, label: '多項式3次（20項）' },
    { key: 'poly5', color: C.cmp3, label: '多項式5次（42項）' },
    { key: 'latent', color: D4.color, label: '学んだ形（線形＋4成分）', width: 3 },
    { key: 'latent_new', color: D4.color, dash: 'dash', label: '学んだ形・履歴にない形あり' },
  ];
  drawXYChart(slide, box, {
    xMin: 5, xMax: 110, xLog: true, yMin: 0.6, yMax: 3.2, xTicks: [6, 8, 12, 16, 24, 32, 48, 64, 96], yTicks: [0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0],
    xLabel: '測った点の数（対数目盛り）', yLabel: '推定で補正した後に残るずれ（|平均|+3σ、nm）',
    series: seriesDefs.map((s) => ({ color: s.color, dash: s.dash, width: s.width || 2, markers: !s.dash, markerSize: 0.08, points: VM.curve.map((c) => [c.marks, c[s.key]]) })),
  });
  seriesDefs.forEach((s, i) => addLegend(slide, [{ kind: 'line', color: s.color, dash: s.dash, label: s.label, width: 2.25 }], 4.05 + (i % 2) * 2.7, 6.08 + Math.floor(i / 2) * 0.27, { fontSize: 10 }));

  // 右：要点
  const rx = 9.55;
  const rw = RIGHT_EDGE - rx;
  const stats = [
    [`${VM16.marks}点での誤差`, `学んだ形 ${f2(VM16.latent)} nm／多項式5次 ${f2(VM16.poly5)} nm`, D4.color],
    ['多項式で同じ精度にするには', `5次で${VM96.marks}点が必要（${f2(VM96.poly5)} nm）`, C.cmp3],
    ['履歴にない形が出ると', `${f2(VM16.latent)} → ${f2(VM16.latent_new)} nm に悪化（${VM16.marks}点）`, D5.color],
    ['当てはめ残差で検知', `検知${pct(VM.detection.detection_rate)}・誤報${pct(VM.detection.false_alarm_rate)}（${VM.detection.marks}点）。検知したら計測を増やし、形を学び直す（⑤）`, D5.color],
  ];
  stats.forEach(([h, b, color], i) => {
    const y = 1.55 + i * 1.28;
    addCard(slide, rx, y, rw, 1.15, { fill: C.gray });
    addText(slide, h, rx + 0.2, y + 0.08, rw - 0.4, 0.3, { fontSize: 11.5, bold: true, color });
    addText(slide, b, rx + 0.2, y + 0.4, rw - 0.4, 0.72, { fontSize: 11 });
  });
  const a = VM.assumptions;
  addSource(slide, `前提（合成データ）：歪み＝4つの形（外周の放射状・反りの3次・3回対称・局所の盛り上がり、強さのばらつき ${a.latent_score_sd_nm.join('・')} nm）＋線形（${a.linear_sd_nm} nm）＋ショット・マークごとのばらつき、アライメントの計測ばらつき ${a.align_noise_nm} nm。履歴${a.history_wafers}枚から主成分分析で形を学び、${a.test_wafers}枚で評価。多項式は正則化の強さを履歴で選んだ。履歴にない形は局所の歪み（${a.new_bump_amplitude_nm} nm）`, { y: 6.9, h: 0.5, fontSize: 8 });
}

// =====================================================================
// 21. ④ 追加提案
// =====================================================================
{
  const slide = newContentSlide('④ 仮想測定｜追加提案', '不確かさ・物理モデル・答え合わせで、VMを信頼できる道具にする', [
    '仮想測定について、メモ以外の提案を5つ加えます。どれも、仮想測定を量産で信頼して使うための工夫です。',
    '1つ目は、予測に不確かさを付けることです。ガウス過程やアンサンブルで予測の幅を出し、幅が広いときだけ実測します。補正では、仮想測定の値を幅に応じた重みで使います。',
    '2つ目は、物理モデルとデータの組み合わせです。物理で説明できる部分を先に引き、残りを学習すると、少ないデータで外挿にも強くなります。レンズ収差の指紋から、計算でパターンのずれとNZOを予測する手法も報告されています。',
    '3つ目は、エッチング後のずれを予測することです。現像後の計測と工程データからエッチング後のずれを予測し、SEM計測の頻度を下げます。',
    '4つ目は、答え合わせと再学習の仕組みです。定期的に実測と比べて精度の劣化を検知し、PMや工程変更の後は再学習します。',
    '5つ目は、予測の根拠を示すことです。どの入力が効いたかを示す手法で、異常の検出性能が大きく上がった例があります。',
    '右下に、仮想測定を使う前に確認したい前提をまとめました。',
  ], { domainIndex: 3 });
  const cw = 3.9;
  const ch = 2.5;
  const cards = [
    { title: '予測に不確かさを付ける', body: 'ガウス過程やアンサンブルで予測の幅を出す。幅が広いときだけ実測し（②）、補正ではVMの値を幅に応じた重みで使う。' },
    { title: '物理モデルと学習の併用', body: '形状→面内歪み、収差→パターンのずれなど、物理で説明できる部分を先に引き、残りを学習する。レンズ収差の指紋から計算でパターンのずれとNZOを予測する手法もある。', source: cite('vaglio2025') },
    { title: 'エッチング後のずれを予測', body: 'ADIの計測と工程データからAEIのずれ（NZO）を予測し、SEM計測の頻度を下げる。⑥の「高頻度の光学×低頻度のSEM」と組にする。' },
    { title: '答え合わせと再学習の仕組み', body: '定期的に実測と比べ、精度の劣化（ドリフト）を検知する。PMや工程変更の後は再学習する。少ないデータで追加学習し、長期間の精度を保った例がある。', source: cite('park2025') },
    { title: '予測の根拠を示す', body: 'どの入力が効いたかを示し、現場の納得と原因調査に使う。VMの説明手法で、異常の検出性能が大きく上がった例がある。', source: cite('choi2026') },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.22);
    const y = 1.55 + Math.floor(i / 3) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D4, kind: 'add', num: i + 1, ...card, bodySize: 11.5, titleSize: 13.5 });
  });
  const x = MARGIN_X + 2 * (cw + 0.22);
  const y = 1.55 + ch + 0.2;
  addCard(slide, x, y, cw, ch, { fill: D4.tint });
  addText(slide, 'VMを使う前に確認したいこと', x + 0.2, y + 0.1, cw - 0.4, 0.3, { fontSize: 12, bold: true, color: D4.color });
  addBullets(slide, [
    'ウェーハIDで入力と実測を紐づけられる',
    '実測との答え合わせの頻度を決めている',
    '不確かさで使う・使わないを決める',
    '誤測定を学習データに入れない（⑤）',
    '予測が外れたときの戻し方（実測へ切替）',
  ], x + 0.2, y + 0.48, cw - 0.4, 1.95, { fontSize: 11.5, space: 4 });
}

// =====================================================================
// 22. ⑤ 異常検知：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('⑤ 異常検知｜メモからの具体案', '装置・測定値・誤測定を監視し、誤った補正を補正の前で止める', [
    '異常検知について、メモの内容を「補正前のゲート」という形に具体化しました。',
    '上の段がゲートの流れです。計測値は、誤測定のチェック、測定値の傾向のチェック、装置状態のチェック、補正値の妥当性のチェックを順に通ってから補正に使います。どこかで引っかかったら、点の除外、再計測、FBの保留、追加検査などに回します。',
    '下の段が4つのチェックの中身です。誤測定は、ターゲットの品質指標、近くの点やモデルとの食い違い、物理的にありえない値で見分けます。外周は誤測定が出やすい所です。',
    '測定値の傾向では、計測器のドリフトと工程の変化を分けて見ます。計測器のドリフトは基準ウェーハで確かめます。',
    '装置状態は、露光機のログを多変量で監視し、異常の間に露光したロットはFBから外して追加検査します。',
    '補正値の妥当性は、新しい補正値が、傾向監視で見積もった想定範囲を外れたら、自動では適用せずに保留して確認します。メモの「誤った補正を未然に防ぐ」を、この4段で実現します。',
  ], { domainIndex: 4 });
  const gates = ['誤測定', '測定値の傾向', '装置状態', '補正値の妥当性'];
  const gy = 1.62;
  addCard(slide, MARGIN_X, gy, 1.35, 0.9, { fill: C.gray, line: C.cmp2 });
  addText(slide, '計測値', MARGIN_X, gy, 1.35, 0.9, { fontSize: 13, bold: true, align: 'center', valign: 'middle' });
  const gw = 2.05;
  gates.forEach((g, i) => {
    const x = MARGIN_X + 1.65 + i * (gw + 0.32);
    addLine(slide, x - 0.3, gy + 0.45, x - 0.02, gy + 0.45, { color: D5.color, width: 2, arrow: true });
    addCard(slide, x, gy, gw, 0.9, { fill: D5.tint, line: D5.color });
    addText(slide, `チェック${i + 1}`, x, gy + 0.08, gw, 0.3, { fontSize: 10, color: D5.color, align: 'center', bold: true });
    addText(slide, g, x, gy + 0.36, gw, 0.44, { fontSize: 13, bold: true, align: 'center', valign: 'middle' });
    addLine(slide, x + gw / 2, gy + 0.92, x + gw / 2, gy + 1.28, { color: C.cmp2, width: 1.25, dash: 'dash', arrow: true });
  });
  const endX = MARGIN_X + 1.65 + 4 * (gw + 0.32) - 0.3;
  addLine(slide, endX, gy + 0.45, endX + 0.3, gy + 0.45, { color: D5.color, width: 2, arrow: true });
  addCard(slide, endX + 0.32, gy, RIGHT_EDGE - endX - 0.32, 0.9, { fill: D1.tint, line: D1.color });
  addText(slide, '補正へ', endX + 0.32, gy, RIGHT_EDGE - endX - 0.32, 0.9, { fontSize: 13, bold: true, color: D1.color, align: 'center', valign: 'middle' });
  addText(slide, 'それぞれのチェックの中身と、NGのときの動き', MARGIN_X + 1.65, gy + 1.3, 9.0, 0.3, { fontSize: 11, color: C.muted });
  // 4つのチェックの中身
  const cw = (CONTENT_W - 0.6) / 4;
  const ch = 3.55;
  const cards = [
    { title: '誤測定', body: 'ターゲットの品質指標（信号の強さ・非対称性など）、近くの点やモデルとの食い違い、物理的にありえない値で見分ける。外周は誤測定が出やすい。', ng: 'その点を除き、残りの点で当てはめる。除く点が多いときは再計測' },
    { title: '測定値の傾向', body: '計測器のドリフトと工程の変化を分けて見る。急な変化は③の変化点検知で捉える。', ng: '基準ウェーハで計測器を確認。原因が分かるまで補正の更新を保留' },
    { title: '装置状態', body: '露光機のログ（ステージ・レンズ温度・真空・チャック・アライメント信号）を多変量で監視する（T²統計量など）。', ng: 'そのロットをFBの計算から外し、追加検査。装置の復旧を確認' },
    { title: '補正値の妥当性', body: '新しい補正値が、③で見積もった想定範囲に入っているかを見る。更新幅の上限（①）と組み合わせる。', ng: '自動では適用せず、エンジニアが確認・承認してから適用' },
  ];
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    const y = 3.2;
    addCard(slide, x, y, cw, ch, { fill: C.gray });
    addNode(slide, x + 0.32, y + 0.33, 0.4, D5.color, String(i + 1), { fontSize: 12 });
    addText(slide, c.title, x + 0.62, y + 0.12, cw - 1.35, 0.44, { fontSize: 14, bold: true, valign: 'middle' });
    addOriginTag(slide, 'memo', x + cw - 0.68, y + 0.2);
    addText(slide, c.body, x + 0.22, y + 0.66, cw - 0.42, ch - 1.95, { fontSize: 12 });
    addCard(slide, x + 0.15, y + ch - 1.2, cw - 0.3, 1.05, { fill: C.white, line: D5.color });
    addText(slide, 'NGのとき', x + 0.3, y + ch - 1.14, cw - 0.6, 0.28, { fontSize: 10.5, bold: true, color: D5.color });
    addText(slide, c.ng, x + 0.3, y + ch - 0.84, cw - 0.6, 0.64, { fontSize: 11 });
  });
}

// =====================================================================
// 23. ⑤ 追加提案
// =====================================================================
{
  const slide = newContentSlide('⑤ 異常検知｜追加提案', '学習による除外・面内パターンの分類・コストで決めるしきい値', [
    '異常検知について、メモ以外の提案を5つ加えます。',
    '1つ目は、学習による誤測定の自動除外です。光学的な寸法計測で、測定誤差を含むデータを異常検知で自動的に除き、少ない参照データでも精度と再現性を保った例があります。同じ考え方を重ね合わせの計測点に使います。',
    '2つ目は、面内パターンでの分類です。傾向監視の潜在成分で、既知の形に分類し、既知なら原因と対策を示し、未知なら警告して計測を増やします。',
    '3つ目は、仮想測定や号機間の比較で早く気づくことです。',
    '4つ目は、しきい値を誤報と見逃しのコストで決めることです。右下の図のように、しきい値を下げると誤報が増え、上げると見逃しが増えます。誤報は不要な保留や再計測の費用、見逃しは誤った補正による歩留まりの損失です。両方の期待コストの和が最小になる所にしきい値を置き、誤報率を定期的に見直します。',
    '5つ目は、ルール、統計、学習の3段構えです。説明しやすいルールを先に置き、多変量の統計、学習モデルの順に重ねます。止めた理由は必ず記録します。',
  ], { domainIndex: 4 });
  const cw = 3.9;
  const ch = 2.5;
  const cards = [
    { title: '誤測定の自動除外（学習）', body: '測定誤差を含むデータを異常検知で自動的に除き、少ない参照データでも精度と再現性を保った例がある（OCD）。OVLの計測点にも同じ考え方を使う。', source: cite('kim2024') },
    { title: '面内パターンで分類する', body: '③の潜在成分で、既知の形（外周・チャック・クランプなど）に分類する。既知なら原因と対策を示し、未知なら警告して計測を増やす。' },
    { title: 'VMと号機間の比較', body: '実測とVMの差、号機・チャンバー間の不一致スコアで、まばらな実測より早く異常に気づく。', source: cite('kim2026') },
    { title: 'しきい値をコストで決める', body: '誤報＝不要な保留・再計測の費用、見逃し＝誤った補正による歩留まり損失。両方の期待コストの和が最小になる所にしきい値を置き、誤報率を定期的に見直す。' },
    { title: 'ルール・統計・学習の3段構え', body: '説明しやすいルールを先に、多変量の統計を次に、学習モデルは最後に重ねる。止めた理由は必ず記録し、後で見直せるようにする。' },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.22);
    const y = 1.55 + Math.floor(i / 3) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D5, kind: 'add', num: i + 1, ...card, bodySize: 11.5, titleSize: 13.5 });
  });
  // 6つ目のマス：コストで決めるしきい値の図
  const x = MARGIN_X + 2 * (cw + 0.22);
  const y = 1.55 + ch + 0.2;
  addCard(slide, x, y, cw, ch, { fill: D5.tint });
  addText(slide, 'しきい値と期待コスト（概念図）', x + 0.2, y + 0.1, cw - 0.4, 0.3, { fontSize: 12, bold: true, color: D5.color });
  const bx = x + 0.45;
  const by = y + 0.55;
  const bw = cw - 0.8;
  const bh = 1.45;
  addLine(slide, bx, by + bh, bx + bw, by + bh, { color: C.muted, width: 1, arrow: true });
  addLine(slide, bx, by + bh, bx, by, { color: C.muted, width: 1, arrow: true });
  const ts = Array.from({ length: 41 }, (_, i) => i / 40);
  const fa = ts.map((t) => 0.85 * Math.exp(-4 * t));
  const miss = ts.map((t) => 0.08 + 0.8 * t * t);
  const tot = ts.map((t, i) => fa[i] + miss[i]);
  const pt = (t, v) => [bx + 0.05 + t * (bw - 0.15), by + bh - v * (bh - 0.1) / 1.0];
  drawPolyline(slide, ts.map((t, i) => pt(t, fa[i])), { color: C.cmp2, width: 1.75 });
  drawPolyline(slide, ts.map((t, i) => pt(t, miss[i])), { color: C.cmp3, width: 1.75, dash: 'dash' });
  drawPolyline(slide, ts.map((t, i) => pt(t, Math.min(tot[i], 1.0))), { color: D5.color, width: 2.5 });
  const iMin = tot.indexOf(Math.min(...tot));
  const pMin = pt(ts[iMin], tot[iMin]);
  addDot(slide, pMin[0], pMin[1], 0.14, D5.color, { lineColor: C.white });
  addText(slide, '誤報', bx + 0.1, by + 0.02, 0.6, 0.22, { fontSize: 9.5, color: C.cmp3 });
  addText(slide, '見逃し', bx + bw - 0.7, by + bh - 0.72, 0.7, 0.22, { fontSize: 9.5, color: C.cmp3 });
  addText(slide, '合計が最小', pMin[0] - 0.4, pMin[1] - 0.3, 1.0, 0.22, { fontSize: 9.5, bold: true, color: D5.color });
  addText(slide, 'しきい値 →', bx + bw - 1.0, by + bh + 0.04, 1.0, 0.22, { fontSize: 9.5, color: C.muted, align: 'right' });
}

// =====================================================================
// 24. ⑥ 測定技術：メモからの具体案
// =====================================================================
{
  const slide = newContentSlide('⑥ 測定技術｜メモからの具体案', '計測の精度を上げ、1回の計測から多くを取り出し、デバイスを直接見る', [
    '測定技術について、メモの3つの論点を具体化しました。',
    '1つ目は、計測精度の向上が補正精度の向上につながるという点です。計測のばらつきは補正モデルを通って補正値に乗り、高次の式や少ない点ほど増幅されます。一方で、最近の報告では、計測の不確かさ、つまり精度とTISが制御指標に与える影響は5パーセント未満で、NZOの安定性へのTISの寄与は無視できるほどだとされています。どの精度を上げるべきか、ばらつきなのか、ターゲットとデバイスの差なのかを見極めることが大事です。',
    '2つ目は、メモにあったBeyond OVLです。MicronとASMLの報告では、重ね合わせ計測器の信号から、現像後には膜厚のマップ、エッチング後にはリセス深さ、ライナー膜厚、誘電体の高さ、底部のCDを、光学的な寸法計測と同程度の精度で取り出しました。学習用のウェーハは3から5枚で、別のロットにも使えました。重ね合わせの計測は点数が多いので、膜や形状の密なマップが得られ、仮想測定や異常検知の入力にもなります。',
    '3つ目は、SEMによるエッチング後の計測とEPE制御です。エッチング後のデバイスを直接測り、現像後との差を補正に入れることで、製品上の重ね合わせを改善します。EPEを目的にした露光量と重ね合わせの最適化で、良品チップ数が従来より増えた報告がDRAMとFLASHの両方であります。',
  ], { domainIndex: 5 });
  const cw = (CONTENT_W - 0.4) / 3;
  const ch = 4.2;
  const cols = [
    {
      title: '計測精度→補正精度',
      items: [
        '計測のばらつきは、補正モデルを通って補正値に乗る。高次の式や少ない点ほど増幅される',
        '一方で、計測の不確かさ（精度とTIS）が制御指標に与える影響は5%未満、NZOの安定性へのTISの寄与は無視できるほど、との報告もある',
        '→「ばらつき」を下げるのか、「代表性（ターゲットとデバイスの差）」を上げるのかを見極める',
      ],
      source: cite('klein2026'),
    },
    {
      title: 'Beyond OVL：1回で多くを',
      items: [
        'OVL計測器の信号には、使われていない情報が多い',
        'ADI：信号の波長依存（スイングカーブ）から膜厚のマップ',
        'AEI：瞳の対称な成分から、リセス深さ・ライナー膜厚・誘電体の高さ・底部CDをOCD並みに抽出（テストで3σ 0.2〜1.1 nm）',
        '3波長・学習用ウェーハ3〜5枚で別ロットにも汎化。密なマップは④⑤の入力にもなる',
      ],
      source: cite('bozdog2026'),
    },
    {
      title: 'SEMでAEI計測・EPE制御',
      items: [
        'エッチング後のデバイスを直接測り、ADIとの差（NZO）を補正に入れる。光学ADIは毎ロット、SEMはまれに測るハイブリッド制御が使われてきた',
        'EPE（OVLとCDのずれを合わせたエッジ位置の誤差）を目的にした露光量・OVLの最適化で、良品チップ数が従来より増えた（DRAM・FLASH）',
        'EPEの評価には、OVLとCDを同じ画像から測れる大視野のSEMが使われる',
      ],
      source: cite('lee2017hvm', 'kwak2023', 'lee2026', 'schelcher2024'),
    },
  ];
  cols.forEach((c, i) => {
    const x = MARGIN_X + i * (cw + 0.2);
    const y = 1.55;
    addCard(slide, x, y, cw, ch, { fill: C.gray });
    addNode(slide, x + 0.32, y + 0.33, 0.4, D6.color, String(i + 1), { fontSize: 12 });
    addText(slide, c.title, x + 0.62, y + 0.12, cw - 1.35, 0.44, { fontSize: 13.5, bold: true, valign: 'middle' });
    addOriginTag(slide, 'memo', x + cw - 0.68, y + 0.2);
    addBullets(slide, c.items, x + 0.22, y + 0.72, cw - 0.42, ch - 1.25, { fontSize: 11.5, space: 5 });
    addText(slide, c.source, x + 0.22, y + ch - 0.46, cw - 0.42, 0.4, { fontSize: 8.5, color: C.muted, valign: 'bottom' });
  });
  addCard(slide, MARGIN_X, 5.95, CONTENT_W, 0.88, { fill: D6.tint });
  addText(slide, [
    { text: '目指す姿：', bold: true, color: D6.color },
    { text: '光学計測は毎ロット・多項目（Beyond OVL）、SEMはまれにデバイスを直接測る（NZO・EPE）。その間を④の予測でつなぎ、①でEPEを目的に補正する。' },
  ], MARGIN_X + 0.25, 5.95, CONTENT_W - 0.5, 0.88, { fontSize: 12.5, valign: 'middle' });
}

// =====================================================================
// 25. ⑥ 追加提案
// =====================================================================
{
  const slide = newContentSlide('⑥ 測定技術｜追加提案', 'デバイス内計測・ハイブリッド計測・EPEの内訳で、計測を効かせる', [
    '測定技術について、メモ以外の提案を5つ加えます。',
    '1つ目は、デバイス内計測です。小さなスポットの光学計測でエッチング後のデバイスを直接測ると、CD-SEMより速く正確に指紋を捉えられ、制御に使ってデバイスの重ね合わせが36パーセント改善した例があります。',
    '2つ目は、高頻度の光学と低頻度のSEMの組み合わせです。SEMの頻度と点の置き方そのものを、計測最適化の考え方で決めます。高電圧のSEMや光学的な寸法計測で、埋もれた層のデバイスを測る例もあります。',
    '3つ目は、EPEの内訳で打ち手を決めることです。右下の図のように、2層のEPEは局所66パーセント、全体29パーセント、系統5パーセントという報告があります。重ね合わせやCDの制御で下げられるのは主に全体と系統の成分で、局所の成分はエッチングなどの工程の改善が必要です。',
    '4つ目は、波長や照明、ターゲットの最適化です。多波長と照明の工夫で残差が改善した例があり、Beyond OVLでも3波長で十分でした。',
    '5つ目は、ウェーハ形状や質量変化のように、全ウェーハを速く測れる計測を仮想測定の入力や監視に使うことです。',
  ], { domainIndex: 5 });
  const cw = 3.9;
  const ch = 2.5;
  const cards = [
    { title: 'デバイス内計測（IDM）', body: '小さなスポットの光学計測でエッチング後のデバイスを直接測ると、CD-SEMより速く正確に指紋を捉えられ、制御に使ってデバイスのOVLが36%改善した例がある（DRAM）。', source: cite('park2018') },
    { title: '高頻度の光学×低頻度のSEM', body: '光学ADIは毎ロット、SEMのAEIはまれに測ってNZOを更新する。SEMの頻度と点の置き方も②の考え方で決める。高電圧SEMや光学CD計測で埋もれた層を測る例もある。', source: cite('lee2017hvm', 'chang2022') },
    { title: 'EPEの内訳で打ち手を決める', body: '2層のEPEの内訳は局所66%・全体29%・系統5%という報告がある。OVL・CDの制御で下げられるのは主に全体と系統で、局所は工程（エッチングなど）の改善が要る。', source: cite('ko2025') },
    { title: '波長とターゲットの最適化', body: '多波長と照明の工夫で、工程によるターゲットの非対称の影響を下げ、残差が改善した例がある。Beyond OVLでも3波長で十分だった。', source: cite('kim2023', 'bozdog2026') },
    { title: '速く密な他の計測を使う', body: 'ウェーハ形状（PWG）や質量変化（MMT）など、全ウェーハを速く測れる計測を④の入力や③⑤の監視に使う。', source: cite('ham2024', 'cho2026') },
  ];
  cards.forEach((card, i) => {
    const x = MARGIN_X + (i % 3) * (cw + 0.22);
    const y = 1.55 + Math.floor(i / 3) * (ch + 0.2);
    addProposalCard(slide, x, y, cw, ch, { domain: D6, kind: 'add', num: i + 1, ...card, bodySize: 11.5, titleSize: 13.5 });
  });
  // 6つ目のマス：EPEの内訳
  const x = MARGIN_X + 2 * (cw + 0.22);
  const y = 1.55 + ch + 0.2;
  addCard(slide, x, y, cw, ch, { fill: D6.tint });
  addText(slide, '2層のEPEの内訳（報告例）', x + 0.2, y + 0.1, cw - 0.4, 0.3, { fontSize: 12, bold: true, color: D6.color });
  const parts = [['局所', 66, D6.color], ['全体', 29, '8DB77A'], ['系統', 5, 'C5DDB8']];
  const barX = x + 0.25;
  const barW = cw - 0.5;
  let cx = barX;
  parts.forEach(([name, v, color]) => {
    const w = (barW * v) / 100;
    addRect(slide, cx, y + 0.6, w, 0.5, { fill: color, line: C.white });
    if (v >= 20) addText(slide, `${name} ${v}%`, cx, y + 0.6, w, 0.5, { fontSize: 11, bold: true, color: v >= 50 ? C.white : C.ink, align: 'center', valign: 'middle' });
    cx += w;
  });
  addText(slide, '系統 5%', barX + barW - 0.9, y + 1.12, 0.9, 0.24, { fontSize: 10, color: C.muted, align: 'right' });
  addBullets(slide, [
    '局所：工程（エッチング等）の改善で下げる',
    '全体・系統：OVL・CDの制御で下げる',
  ], x + 0.25, y + 1.45, cw - 0.5, 0.9, { fontSize: 11, space: 3 });
}

// =====================================================================
// 26. 連携シナリオ
// =====================================================================
{
  const slide = newContentSlide('連携', 'つなげると効く：外周の歪みを例に、6つの領域を1本の流れにする', [
    '6つの領域は、単独で使うより、つなげて使うと効果が大きくなります。外周の歪みを例に、流れを示しました。',
    'まず傾向監視で、外周型の成分がCMPのB2経由で強いことが分かり、外周の幅と経路グループを決めます。',
    '次に計測最適化で、外周Shotは毎ロット全点、内側は少数のShotを数ロットに1回とし、B2経由のロットは外周を必ず測ります。',
    '異常検知で、誤測定が出やすい外周の点を除外してから使い、想定範囲を外れた補正値は保留します。',
    '仮想測定で、測らないロットやウェーハの外周を、アライメントや形状のデータと経路グループから予測します。',
    '制御最適化で、外周だけCPEと内側の少ないkで補正し、B2経由のウェーハには外周の補正を強めます。',
    '測定技術では、Beyond OVLの膜厚マップで外周の膜厚を監視し、原因のCMPへ対策を返します。これが上流へのフィードバックで、また傾向監視へつながります。',
    '精度、コスト、リスクのどれか1つではなく、組み合わせで曲線が動く、という点がこのスライドの要点です。',
  ]);
  const flow = [
    [D3, '外周型の成分がCMPのB2経由で強いと分かる（サンキー図）。外周の幅と経路グループを決める'],
    [D2, '外周Shotは毎ロット全点、内側は少数Shotを数ロットに1回。B2経由のロットは外周を必ず測る'],
    [D5, '誤測定が出やすい外周の点を、品質指標と近傍比較で除外してから使う。想定範囲外の補正値は保留'],
    [D4, '測らないロット・ウェーハの外周を、アライメント・形状データと経路グループから予測する'],
    [D1, '外周だけCPE＋内側はウェーハ座標の少ないk。B2経由のウェーハには外周の補正を強める'],
    [D6, 'Beyond OVLの膜厚マップで外周の膜厚を監視し、原因のCMPへ対策を返す'],
  ];
  const cw = 3.75;
  const ch = 1.78;
  const gapX = 0.44;
  const pos = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1]];
  const rows = [1.62, 3.9];
  flow.forEach(([d, text], i) => {
    const [col, row] = pos[i];
    const x = MARGIN_X + col * (cw + gapX);
    const y = rows[row];
    addCard(slide, x, y, cw, ch, { fill: d.tint, line: d.color });
    addNode(slide, x + 0.32, y + 0.32, 0.4, d.color, String(DOMAINS.indexOf(d) + 1), { fontSize: 12 });
    addText(slide, `${d.name}`, x + 0.62, y + 0.12, cw - 0.8, 0.4, { fontSize: 13.5, bold: true, color: d.color, valign: 'middle' });
    addText(slide, text, x + 0.22, y + 0.6, cw - 0.42, ch - 0.68, { fontSize: 11.5 });
    addText(slide, `STEP ${i + 1}`, x + cw - 1.0, y + 0.14, 0.85, 0.3, { fontSize: 9.5, bold: true, color: C.muted, align: 'right' });
  });
  const midY0 = rows[0] + ch / 2;
  const midY1 = rows[1] + ch / 2;
  addLine(slide, MARGIN_X + cw + 0.04, midY0, MARGIN_X + cw + gapX - 0.04, midY0, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, MARGIN_X + 2 * cw + gapX + 0.04, midY0, MARGIN_X + 2 * (cw + gapX) - 0.04, midY0, { color: C.cmp3, width: 2, arrow: true });
  const x3 = MARGIN_X + 2 * (cw + gapX) + cw / 2;
  addLine(slide, x3, rows[0] + ch + 0.03, x3, rows[1] - 0.03, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, MARGIN_X + 2 * (cw + gapX) - 0.04, midY1, MARGIN_X + 2 * cw + gapX + 0.04, midY1, { color: C.cmp3, width: 2, arrow: true });
  addLine(slide, MARGIN_X + cw + gapX - 0.04, midY1, MARGIN_X + cw + 0.04, midY1, { color: C.cmp3, width: 2, arrow: true });
  const x0 = MARGIN_X + cw / 2;
  addLine(slide, x0, rows[1] - 0.03, x0, rows[0] + ch + 0.03, { color: D3.color, width: 2, dash: 'dash', arrow: true });
  addText(slide, '上流への対策と監視へ戻る', x0 + 0.12, rows[0] + ch + 0.08, 2.6, 0.3, { fontSize: 10.5, bold: true, color: D3.color });
  addCard(slide, MARGIN_X, 5.95, CONTENT_W, 0.88, { fill: C.goldTint });
  addText(slide, [
    { text: '期待する効果：', bold: true, color: C.goldDark },
    { text: '精度（外周の残差↓）・コスト（計測点と補正の項↓）・リスク（誤った補正↓）。どれか1つではなく、組み合わせで曲線が動く。' },
  ], MARGIN_X + 0.25, 5.95, CONTENT_W - 0.5, 0.88, { fontSize: 12.5, valign: 'middle' });
}

// =====================================================================
// 27. 優先順位
// =====================================================================
{
  const slide = newContentSlide('優先順位', '優先順位：始めやすく効果の大きいものから着手する', [
    '提案の優先順位を、始めやすさと期待効果の2軸で整理しました。位置は目安で、自社のデータや装置機能を確認して見直す前提です。',
    '右上の、始めやすく効果の大きい領域には、補正前のゲート、ロバスト推定、kの費用対効果の評価、潜在成分とサンキー図、領域別の計測頻度の机上評価が入ります。どれも今あるデータで始められます。',
    '左上の、効果は大きいが準備が要る領域には、外周だけCPEの実機適用、部分アライメントからの高次FF、仮想測定の量産適用、SEMによるEPE制御、Beyond OVLが入ります。装置や計測器の機能、データ基盤の整備が前提になります。',
    '右側に、まず着手する5つと、準備して進めるものを挙げました。最初の一歩は、過去データの紐づけとR2Rシミュレーションの環境づくりです。これがあれば、ほかの提案の効果をまとめて机上で見積もれます。',
  ]);
  const bx = 1.2;
  const by = 1.75;
  const bw = 7.1;
  const bh = 4.55;
  addRect(slide, bx + bw / 2, by, bw / 2, bh / 2, { fill: C.goldTint });
  addRect(slide, bx, by, bw / 2, bh / 2, { fill: 'F1F3F7' });
  addLine(slide, bx, by + bh, bx + bw, by + bh, { color: C.muted, width: 1.25, arrow: true });
  addLine(slide, bx, by + bh, bx, by - 0.05, { color: C.muted, width: 1.25, arrow: true });
  addText(slide, '始めやすさ（データ・投資・体制）→', bx + bw - 4.0, by + bh + 0.08, 4.0, 0.26, { fontSize: 10.5, color: C.muted, align: 'right' });
  addText(slide, '期待効果（精度とコスト）', bx - 0.55, by - 0.4, 3.0, 0.26, { fontSize: 10.5, color: C.muted });
  addText(slide, 'まず着手', bx + bw - 1.6, by + 0.08, 1.5, 0.28, { fontSize: 11.5, bold: true, color: C.goldDark, align: 'right' });
  addText(slide, '準備して進める', bx + 0.1, by + 0.08, 1.8, 0.28, { fontSize: 11.5, bold: true, color: C.muted });
  // [領域, 始めやすさ, 期待効果, 名前, ラベルの向き]。ラベル同士・点と重ならないように置いている
  const items = [
    [0, 0.70, 0.88, 'kの費用対効果の評価', 'r'],
    [4, 0.86, 0.76, '補正前ゲート', 'l'],
    [1, 0.58, 0.68, '領域別の計測頻度（机上）', 'r'],
    [2, 0.76, 0.58, '潜在成分・サンキー図', 'l'],
    [0, 0.93, 0.51, 'ロバスト推定', 'l'],
    [3, 0.28, 0.92, '部分アライメント→高次FF', 'r'],
    [0, 0.44, 0.80, '外周だけCPE（実機）', 'l'],
    [5, 0.10, 0.70, 'SEMによるEPE制御', 'r'],
    [3, 0.34, 0.62, 'VMの量産適用', 'r'],
    [5, 0.16, 0.53, 'Beyond OVL', 'r'],
    [1, 0.68, 0.40, '点の配置・ローテーション', 'l'],
    [2, 0.56, 0.28, '想定範囲の見積もり', 'l'],
  ];
  items.forEach(([di, ux, vy, label, side]) => {
    const px = bx + ux * bw;
    const py = by + bh - vy * bh;
    addNode(slide, px, py, 0.28, DOMAINS[di].color, String(di + 1), { fontSize: 10 });
    if (side === 'r') addText(slide, label, px + 0.19, py - 0.14, 2.1, 0.28, { fontSize: 10.5, valign: 'middle' });
    else addText(slide, label, px - 2.29, py - 0.14, 2.1, 0.28, { fontSize: 10.5, valign: 'middle', align: 'right' });
  });
  addText(slide, '位置は目安（自社のデータ・装置機能を確認して見直す）', bx, by + bh + 0.38, 5.0, 0.26, { fontSize: 10, color: C.muted });

  const rx = 8.85;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 3.25, { fill: C.goldTint });
  addText(slide, 'まず着手する5つ（例）', rx + 0.2, 1.65, rw - 0.4, 0.32, { fontSize: 13, bold: true, color: C.goldDark });
  addBullets(slide, [
    '過去データの紐づけとR2Rシミュレーション環境',
    '補正前ゲート（⑤）とロバスト推定（①）',
    'kの費用対効果の評価（①、過去の密なデータ）',
    '潜在成分とサンキー図（③）',
    '領域別の計測密度・頻度の机上評価（②）',
  ], rx + 0.2, 2.05, rw - 0.4, 2.7, { fontSize: 11.5, space: 5 });
  addCard(slide, rx, 4.95, rw, 1.85, { fill: C.gray });
  addText(slide, '準備して進める', rx + 0.2, 5.05, rw - 0.4, 0.32, { fontSize: 13, bold: true, color: C.muted });
  addBullets(slide, [
    '外周だけCPE：装置の機能と設定の確認',
    'VM・高次FF：データ基盤が前提',
    'Beyond OVL・SEM EPE：計測器の機能と台数が前提',
  ], rx + 0.2, 5.43, rw - 0.4, 1.35, { fontSize: 11.5, space: 4 });
}

// =====================================================================
// 28. 評価指標と検証の進め方
// =====================================================================
{
  const slide = newContentSlide('評価と検証', '評価指標と検証：まず過去データのR2Rシミュレーションで見積もる', [
    '提案を評価する指標と、検証の進め方です。',
    '指標は、精度、コスト、リスクの3つに分けます。精度は製品上の重ね合わせを外周と内側に分けて見るほか、最大誤差や良品チップ数、NZOの安定性も見ます。コストは計測点と計測時間、購入するkオプションの数、アライメントのマーク数、リワーク率です。リスクは、保留や再計測の件数、見逃しの件数、仮想測定の予測誤差と、予測区間の当たり率です。',
    '検証は4段階で進めます。まず過去データを、ウェーハIDやロットIDで、重ね合わせ、アライメント、工程経路、装置ログと紐づけます。',
    '次に、過去の密なデータで補正と間引きの案を再現するR2Rシミュレーションで比べます。文献でも、補正方法やサンプリングの評価には、この方法が標準的に使われています。',
    'そのうえで1層と1号機で試行してA/B比較をし、効果とコストを見てから展開やオプションの投資を判断します。',
  ]);
  const header = [headCell('区分', C.cmp3, { align: 'center' }), headCell('評価指標', C.cmp3)];
  const rows = [
    ['精度', 'OPO（|平均|+3σ、外周・内側別）\n最大誤差・良品チップ数、NZOの安定性', D1],
    ['コスト', '計測点／ロットと計測装置の時間、購入するkオプションの数\nアライメントのマーク数（スループット）、リワーク率', D2],
    ['リスク', '保留・再計測の件数（誤報率）、見逃しの件数\nVMの予測誤差と予測区間の当たり率', D5],
  ].map(([a, b, d]) => [bodyCell(a, { bold: true, color: C.white, fill: { color: d.color }, align: 'center' }), bodyCell(b)]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, 6.1, [1.0, 5.1], { rowH: [0.38, 1.05, 1.05, 1.05], fontSize: 11.5 });
  addText(slide, '精度・コスト・リスクを同じ画面で追い、どれか1つだけを見て判断しない', MARGIN_X, 5.3, 6.1, 0.5, { fontSize: 11.5, color: C.muted });

  const rx = 7.1;
  const rw = RIGHT_EDGE - rx;
  const steps = [
    ['過去データの紐づけ', 'ウェーハID・ロットIDで、OVL・アライメント・工程経路・装置ログを紐づける'],
    ['R2Rシミュレーション', '過去の密なデータで、補正と間引きの案を再現して比べる（文献でも標準の評価方法）'],
    ['1層・1号機で試行', '条件をそろえたA/B比較で、効果と副作用を確かめる'],
    ['展開と投資の判断', '効果とコストを見て、他の層・号機への展開とオプション投資を決める'],
  ];
  steps.forEach(([h, b], i) => {
    const y = 1.6 + i * 1.2;
    addCard(slide, rx, y, rw, 1.02, { fill: i === 1 ? C.goldTint : C.gray });
    addNode(slide, rx + 0.35, y + 0.51, 0.46, i === 1 ? C.goldDark : C.cmp3, String(i + 1), { fontSize: 13 });
    addText(slide, h, rx + 0.75, y + 0.08, rw - 0.95, 0.34, { fontSize: 13, bold: true });
    addText(slide, b, rx + 0.75, y + 0.44, rw - 0.95, 0.56, { fontSize: 11 });
    if (i < steps.length - 1) addLine(slide, rx + 0.35, y + 1.02, rx + 0.35, y + 1.2, { color: C.cmp2, width: 1.5, arrow: true });
  });
  addSource(slide, `${cite('overcast2018', 'lee2017topo', 'ehrlich2025')}（いずれもR2Rシミュレーションで補正方法の効果を評価）`);
}

// =====================================================================
// 29. リスクと対策
// =====================================================================
{
  const slide = newContentSlide('リスクと対策', 'リスクと対策：自由度を減らす・予測に置き換えることの落とし穴', [
    '最後に、リスクと対策を整理します。この資料の提案は、自由度や計測を減らし、予測に置き換える方向なので、それ特有の落とし穴があります。',
    '間引きすぎると変化を見逃すので、変化点の検知、イベント時の計測の追加、定期的な密な計測で補います。',
    '係数が不安定になるおそれには、交差検証、正則化、段階的な当てはめ、更新幅の上限で対応します。',
    '仮想測定は時間とともに劣化するので、答え合わせと再学習、不確かさでの重み付けが必要です。履歴にない傾向が出たときは、当てはめ残差で検知して密な計測に切り替えます。',
    'データ基盤、運用の複雑さ、装置メーカーへの依存も、技術と同じくらい重要なリスクです。特に、ゾーンや頻度、経路グループの管理は、ルールを文書化し、ダッシュボードで見える化し、変更管理の手順を決めておく必要があります。',
  ]);
  const header = [headCell('リスク', C.cmp3), headCell('起きること', C.cmp3), headCell('対策', C.goldDark)];
  const rows = [
    ['間引きすぎ', '変化を見逃し、補正が遅れる', '変化点の検知、イベント時の計測の追加、定期的な密な計測（②③）'],
    ['係数の不安定・過学習', '補正が暴れ、かえって悪化する', '交差検証・正則化・段階的な当てはめ・更新幅の上限（①）'],
    ['VMの劣化（ドリフト）', '予測が外れたまま補正に使われる', '答え合わせと再学習、不確かさでの重み付け（④）'],
    ['履歴にない傾向', '学んだ形で表せず、誤差が増える', '当てはめ残差で検知し、密な計測へ切り替える（④⑤）'],
    ['データ基盤', '紐づけできない・処理が遅い', 'ウェーハID・ロットIDでの統合、処理時間の管理'],
    ['運用の複雑化', 'ゾーン・頻度・グループの管理が煩雑になる', 'ルールの文書化、ダッシュボード、変更管理の手順'],
    ['装置メーカーへの依存', '必要な機能やデータが使えない', '使える機能・データの確認を先に行い、代わりの手段を用意する'],
  ].map(([a, b, c]) => [bodyCell(a, { bold: true }), bodyCell(b, { color: C.muted }), bodyCell(c)]);
  addTableBox(slide, [header, ...rows], MARGIN_X, 1.6, CONTENT_W, [2.55, 4.0, 5.58], { rowH: [0.4, 0.64, 0.64, 0.64, 0.64, 0.64, 0.64, 0.64], fontSize: 12 });
}

// =====================================================================
// 30. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.7, 6, 0.6, { fontSize: 30, bold: true, color: C.white });
  const points = [
    ['目標は、トレードオフ曲線そのものを動かすこと', '空間・時間・自由度を「選び」、予測・守り・情報密度で「支える」。必要な補正を、必要な場所に、必要なタイミングで、必要最小限の計測で。'],
    ['メモの論点は、合成データでも考え方が成り立つ', `外周だけCPE（計測点−${pct(edgePointsCut)}・補正の項−${pct(edgeParamsCut)}で誤差は同等以下）、領域別の計測頻度（半減時の悪化 +${pct(uniformWorse)}→+${pct(adaptiveWorse)}）、補正パラメータの動きからの想定範囲、学んだ形による少数点の面内推定を確かめた。`],
    ['各領域に追加の提案を加えた', '目的関数（最悪点・良品チップ数）、時定数の分離、状態推定R2R、点の最適配置とローテーション、変化点と上流の形状、不確かさ付きVM、コストで決めるしきい値、デバイス内・ハイブリッド計測、EPEの内訳。'],
    ['次の一歩は、過去データの紐づけとR2Rシミュレーション', '効果の大きさは実データで決まる。まずは今あるデータで、ゲート・ロバスト推定・kの評価・潜在成分から始める。'],
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
    '1つ目、この資料の目標は、重ね合わせ精度とコストのトレードオフ曲線の上を動くのではなく、曲線そのものを動かすことです。そのために、空間、時間、自由度を選び、予測、守り、情報密度で支えます。',
    '2つ目、メモの主要な論点は、合成データでも考え方として成り立つことを確かめました。外周だけCPE、領域別の計測頻度、補正パラメータの動きからの想定範囲、学んだ形による少数点の面内推定です。',
    '3つ目、各領域に、メモ以外の提案を加えました。',
    '4つ目、次の一歩は、過去データの紐づけとR2Rシミュレーションです。効果の大きさは実データで決まるので、まずは今あるデータで始められる、補正前ゲート、ロバスト推定、kの費用対効果の評価、潜在成分の抽出から着手することを提案します。',
  ].join('\n'));
}

// =====================================================================
// 31. 用語集
// =====================================================================
{
  const slide = newContentSlide('付録', '用語集：この資料で使った主な言葉', [
    'この資料で使った主な言葉の意味をまとめました。',
    'PQCは、メモの用語をそのまま使っており、この資料では製品の出来栄えを保証するための計測と判定を指しています。',
    'kパラメータは、補正式の各項の係数のことで、並進、倍率、回転や高次の項などがあります。項の番号や式の形は装置メーカーごとに決まっています。',
  ]);
  const terms = [
    ['OVL（重ね合わせ）', '下の層のパターンに対する、上の層の位置のずれ'],
    ['OPO', '製品上の重ね合わせ（On-Product Overlay）'],
    ['|平均|+3σ', 'X・Y別に、平均の絶対値と3σを足した管理指標'],
    ['kパラメータ', '補正式の各項の係数（並進・倍率・回転・高次の項など）'],
    ['CPE', 'Shotごとに個別の補正値を持たせる補正（Correction Per Exposure）'],
    ['ウェーハレベル補正', 'ウェーハ座標の多項式で、面内全体を補正する'],
    ['FF／FB', '露光前の情報で直す前送り／露光後の計測を次に返す帰還'],
    ['APC・R2R', 'ロットごとに補正値を更新する制御（Run-to-Run）'],
    ['EWMA', '過去の値ほど重みを小さくして平均する更新の方法'],
    ['カルマンフィルタ', '変化の速さと計測のばらつきから、更新の強さを決める推定'],
    ['PQC', '本資料では、製品の出来栄えを保証する計測・判定（メモの用語）'],
  ];
  const terms2 = [
    ['VM（仮想測定）', '装置・工程のデータから、測っていない値を予測すること'],
    ['ADI／AEI', '現像後の計測／エッチング後の計測'],
    ['NZO', 'ADIとAEI（デバイス）のずれの差（Non-Zero Offset）'],
    ['EPE', 'パターンの端の位置の誤差。OVLとCDのずれなどを合わせた指標'],
    ['TMU・TIS', '計測の不確かさ（精度・TISなどの合計）／計測器が原因のずれ'],
    ['PWG', 'パターン付きウェーハの形状の計測'],
    ['潜在成分（主成分）', 'データから取り出した、ウェーハ間で一緒に動く面内の形'],
    ['サンキー図', '流れの量を帯の太さで表す図'],
    ['IDM', 'デバイス内計測（In-Device Metrology）'],
    ['OCD', '光の反射から寸法や形状を求める計測'],
    ['D最適・I最適', '係数・予測のばらつきが最小になる点の配置'],
  ];
  const half = (CONTENT_W - 0.3) / 2;
  [terms, terms2].forEach((list, k) => {
    const header = [headCell('用語', C.cmp3), headCell('意味', C.cmp3)];
    const rows = list.map(([a, b]) => [bodyCell(a, { bold: true }), bodyCell(b)]);
    addTableBox(slide, [header, ...rows], MARGIN_X + k * (half + 0.3), 1.55, half, [1.9, half - 1.9], { rowH: 0.43, fontSize: 11 });
  });
}

// =====================================================================
// 32〜33. 参考文献
// =====================================================================
function addReferenceSlide(title, refs, startIndex, notes) {
  const slide = newContentSlide('参考文献', title, notes);
  const runs = [];
  refs.forEach((r, i) => {
    runs.push({ text: `[${startIndex + i}] `, options: { bold: true, color: C.goldDark } });
    runs.push({ text: r.text, options: { breakLine: i < refs.length - 1 } });
  });
  slide.addText(runs, {
    x: MARGIN_X, y: 1.5, w: CONTENT_W, h: 5.4,
    fontFace: FONT, fontSize: 10.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP',
    paraSpaceAfter: 5,
  });
  return slide;
}

{
  const firstHalf = REFERENCES.slice(0, 15);
  const secondHalf = REFERENCES.slice(15);
  addReferenceSlide('参考文献（1/2）', firstHalf, 1, [
    'この資料で引用した文献の一覧です。本文では、著者名と所属、発表年の短い形で示しています。',
    'SPIEの論文は、手元の論文ライブラリにある公開論文で、本文を読んで数値を確認しました。',
  ]);
  const slide = addReferenceSlide('参考文献（2/2）', secondHalf, 16, [
    '参考文献の続きです。',
    'Graffほかの論文だけは本文を入手できず、出版社と大学の書誌・抄録で内容を確認しました。',
    '合成データのデモは、この資料のために作成したもので、生成元のスクリプトと数値は資料と同じフォルダの _src に置いています。',
  ]);
  addText(slide, '合成データのデモ：本資料のために作成（demo_overlay_cost.py → demo_results.json）。社内のデータは使っていない', MARGIN_X, 6.6, CONTENT_W, 0.3, { fontSize: 10, color: C.muted });
}

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => {
  console.log(`書き出し: ${file}（${pageNumber}枚）`);
});
