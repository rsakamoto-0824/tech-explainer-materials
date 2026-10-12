// サムスン電子のイメージセンサー事業：SWOT分析・PEST分析
// pptxgenjs でスライドを組み立てる。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 数値はすべて公開資料からの引用で、出典は各スライドの下と参考文献スライドに示す（確認日 2026-09-28）。
// 「本資料の評価」「本資料で計算」と書いた配置・打ち手・比率は、出典の事実をもとにした整理で、出典そのものの記載ではない。
// 補助関数と配色は、同じフォルダにあるソニー版（../Sonyイメージセンサー事業_SWOT・PEST分析_src/build_deck.js）と同じ。

const path = require('path');
const pptxgen = require('pptxgenjs');

const BASE_DIR = __dirname;
const OUTPUT_PATH = process.argv[2] || path.join(BASE_DIR, 'deck_raw.pptx');

// ---- 定数 ----
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN_X = 0.6;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const FONT = 'BIZ UDGothic';
const DECK_DATE = '2026年9月28日';
const TITLE_FONT_SIZE = 24;
const BODY_FONT_SIZE = 14;
const SOURCE_Y = 6.97;

const C = {
  night: '0E1320',
  nightCard: '1A2238',
  nightLine: '36426A',
  ink: '1A1E29',
  muted: '5A6172',
  line: 'C8CDD8',
  grid: 'E4E7EE',
  gray: 'F3F5F8',
  white: 'FFFFFF',
  primary: '1F2F52',
  primaryLight: 'B9C4DE',
  onDarkSub: 'CBD3E6',
  link: '2F62C0',
  // ベイヤー配列（カラーフィルター）の3色。資料全体のモチーフに使う
  R: 'D0463B',
  G: '2E9A5A',
  B: '2F62C0',
};

// 追い風（＋）・逆風（−）・両面（±）の色
const SIGN = {
  '＋': { color: '1E7B4F', label: '追い風' },
  '−': { color: 'B03444', label: '逆風' },
  '±': { color: '8A6A12', label: '両面' },
};

const SWOT = {
  S: { key: 'S', ja: '強み', en: 'Strengths', color: '1E7B4F', tint: 'E4F2EA' },
  W: { key: 'W', ja: '弱み', en: 'Weaknesses', color: 'A8640A', tint: 'FBEFDD' },
  O: { key: 'O', ja: '機会', en: 'Opportunities', color: '2457A8', tint: 'E3EBF8' },
  T: { key: 'T', ja: '脅威', en: 'Threats', color: 'B03444', tint: 'F8E3E6' },
};

const PEST = {
  P: { key: 'P', ja: '政治', en: 'Politics', color: '6A3E9E', tint: 'EFE8F7' },
  E: { key: 'E', ja: '経済', en: 'Economy', color: '0F7A83', tint: 'DFF1F2' },
  S: { key: 'S', ja: '社会', en: 'Society', color: 'B8522A', tint: 'FAE8DF' },
  T: { key: 'T', ja: '技術', en: 'Technology', color: '34489A', tint: 'E4E8F6' },
};

// 右上に出す資料の構成（今どこの話か）
const PARTS = ['現在地', 'PEST', 'SWOT', '示唆'];
const PART = { NOW: 0, PEST: 1, SWOT: 2, IMPLICATION: 3 };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = 'サムスン電子のイメージセンサー事業 SWOT分析・PEST分析';
pres.lang = 'ja-JP';

let pageNumber = 0;

// ---- 文字の補助関数 ----

function toRuns(item, baseOptions = {}) {
  if (typeof item === 'string') return [{ text: item, options: { ...baseOptions } }];
  if (Array.isArray(item)) return item.flatMap((part) => toRuns(part, baseOptions));
  const { text, ...rest } = item;
  return [{ text, options: { ...baseOptions, ...rest } }];
}

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
}

function addText(slide, content, x, y, w, h, options = {}) {
  let runs = content;
  if (typeof content === 'string' && content.includes('\n')) runs = toRuns(withBreaks(content.split('\n')));
  else if (typeof content !== 'string') runs = toRuns(content);
  slide.addText(runs, {
    x, y, w, h,
    fontFace: FONT, fontSize: BODY_FONT_SIZE, color: C.ink, margin: 0, valign: 'top',
    isTextBox: true, lang: 'ja-JP',
    ...options,
  });
}

// 段落の配列を、箇条書き（または通常段落）のランに変換する。bullet は各段落の先頭ランだけに付ける
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

// 太字の見出し語 + 本文 の1段落
function lead(head, body, headColor) {
  const headOptions = { bold: true };
  if (headColor) headOptions.color = headColor;
  return [{ text: head, ...headOptions }, { text: body }];
}

// ---- 図形の補助関数 ----

function addCard(slide, x, y, w, h, { fill = C.gray, line, radius = 0.08, lineWidth = 1 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill },
    line: line ? { color: line, width: lineWidth } : { color: fill, width: 0.5 },
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

function addCircle(slide, cx, cy, diameter, fill, label, { color = C.white, fontSize = 14, lineColor } = {}) {
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

// 色つきの小さなラベル
function addChip(slide, text, x, y, w, h, { fill = C.primary, color = C.white, fontSize = 11, bold = true, align = 'center', radius = 0.06 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: fill, width: 0.5 } });
  addText(slide, text, x + 0.04, y, w - 0.08, h, { fontSize, bold, color, align, valign: 'middle' });
}

// ＋・−・± の丸い印
function addSign(slide, sign, cx, cy, diameter = 0.26) {
  addCircle(slide, cx, cy, diameter, SIGN[sign].color, sign, { fontSize: 11 });
}

// ベイヤー配列（R G / G B）の小さな四角。資料全体のモチーフ
function drawBayer(slide, x, y, size, { gap = 0.02, transparency = 0 } = {}) {
  const cell = (size - gap) / 2;
  const colors = [[C.R, C.G], [C.G, C.B]];
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 2; c += 1) {
      const color = colors[r][c];
      slide.addShape(pres.shapes.RECTANGLE, {
        x: x + c * (cell + gap), y: y + r * (cell + gap), w: cell, h: cell,
        fill: { color, transparency }, line: { color, width: 0.25 },
      });
    }
  }
}

// 大きな数字と説明のタイル
function addStat(slide, x, y, w, h, value, label, { color = C.primary, fill = C.gray, valueSize = 28, labelSize = 11 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addText(slide, value, x + 0.18, y + 0.1, w - 0.36, h * 0.52, { fontSize: valueSize, bold: true, color, valign: 'middle' });
  addText(slide, label, x + 0.18, y + h * 0.6, w - 0.36, h * 0.36, { fontSize: labelSize, color: C.muted, valign: 'top' });
}

// ---- スライド共通 ----

function addPartTracker(slide, activeIndex) {
  const w = 0.8;
  const h = 0.27;
  const gap = 0.06;
  const x0 = RIGHT_EDGE - (PARTS.length * w + (PARTS.length - 1) * gap);
  PARTS.forEach((part, i) => {
    const active = i === activeIndex;
    const x = x0 + i * (w + gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 0.33, w, h, rectRadius: 0.13,
      fill: { color: active ? C.primary : C.gray }, line: { color: active ? C.primary : C.line, width: 0.75 },
    });
    addText(slide, part, x, 0.33, w, h, { fontSize: 9.5, bold: active, color: active ? C.white : C.muted, align: 'center', valign: 'middle' });
  });
}

function newContentSlide(partIndex, kicker, title, notes, { accent = C.primary } = {}) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  drawBayer(slide, MARGIN_X, 0.36, 0.22);
  addText(slide, kicker, MARGIN_X + 0.34, 0.31, 8.4, 0.32, { fontSize: 12, bold: true, color: accent, charSpacing: 1, valign: 'middle' });
  addText(slide, title, MARGIN_X, 0.68, CONTENT_W, 0.66, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (partIndex !== null) addPartTracker(slide, partIndex);
  if (notes) slide.addNotes(notes.join('\n'));
  return slide;
}

// 出典は2行まで入るようにする（ページ番号の左側）
function addSource(slide, text, { y = SOURCE_Y, h = 0.42, fontSize = 8.5 } = {}) {
  addText(slide, text, MARGIN_X, y, 11.55, h, { fontSize, color: C.muted, valign: 'top' });
}

function tableRows(header, rows, { headFill = C.primary, fontSize = 11, firstColBold = true, zebra = C.gray } = {}) {
  const head = header.map((text) => ({ text, options: { bold: true, color: C.white, fill: { color: headFill }, fontSize } }));
  const body = rows.map((row, i) => row.map((text, j) => ({
    text,
    options: { bold: firstColBold && j === 0, color: C.ink, fill: { color: i % 2 === 0 ? C.white : zebra }, fontSize },
  })));
  return [head, ...body];
}

function addTableBox(slide, rows, x, y, w, colW, { rowH, fontSize = 11 } = {}) {
  slide.addTable(rows, {
    x, y, w, colW, rowH,
    fontFace: FONT, fontSize, color: C.ink, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line },
    margin: [0.05, 0.09, 0.05, 0.09],
  });
}

// 見出しの丸（文字）と名前。PEST・SWOT の各象限で使う
function addLensHeader(slide, lens, x, y, { size = 0.44, fontSize = 15, sub = true } = {}) {
  addCircle(slide, x + size / 2, y + size / 2, size, lens.color, lens.key, { fontSize: 16 });
  addText(slide, [{ text: lens.ja, bold: true, color: lens.color, fontSize }, { text: sub ? `　${lens.en}` : '', color: C.muted, fontSize: 11 }],
    x + size + 0.14, y, 4.2, size, { valign: 'middle' });
}

// 符号つきの1行（PEST の全体像で使う）
function addSignedLine(slide, sign, text, x, y, w, { fontSize = 12, h = 0.36 } = {}) {
  addSign(slide, sign, x + 0.13, y + h / 2, 0.24);
  addText(slide, text, x + 0.36, y, w - 0.36, h, { fontSize, valign: 'middle' });
}

// PEST の詳細スライド：左に視点の説明、右に「要因｜事実｜影響」の4行
function buildPestDetail(lens, kicker, title, lensDesc, rows, source, notes) {
  const slide = newContentSlide(PART.PEST, kicker, title, notes, { accent: lens.color });
  // 左の帯：視点の説明
  const panelW = 2.05;
  addCard(slide, MARGIN_X, 1.5, panelW, 5.33, { fill: lens.tint });
  addText(slide, lens.key, MARGIN_X + 0.2, 1.62, 1.2, 1.0, { fontSize: 60, bold: true, color: lens.color, valign: 'middle' });
  addText(slide, lens.ja, MARGIN_X + 0.2, 2.68, 1.7, 0.42, { fontSize: 20, bold: true, color: lens.color });
  addText(slide, lens.en, MARGIN_X + 0.2, 3.1, 1.7, 0.3, { fontSize: 12, color: C.muted });
  addText(slide, lensDesc, MARGIN_X + 0.2, 3.55, panelW - 0.35, 1.9, { fontSize: 11.5, color: C.ink, lineSpacingMultiple: 1.1 });
  // 符号の凡例
  ['＋', '−', '±'].forEach((sign, i) => {
    addSign(slide, sign, MARGIN_X + 0.33, 5.72 + i * 0.34, 0.24);
    addText(slide, SIGN[sign].label, MARGIN_X + 0.55, 5.6 + i * 0.34, 1.3, 0.24, { fontSize: 10.5, color: C.muted, valign: 'middle' });
  });

  // 右：列見出し。各行は「要因｜事実｜影響」の3列で、右端に余白を残す
  const x0 = MARGIN_X + panelW + 0.2;
  const factorW = 2.4;
  const factW = 4.35;
  const colX = [x0, x0 + factorW, x0 + factorW + factW + 0.2];
  const impactW = RIGHT_EDGE - 0.15 - colX[2];
  addText(slide, '要因', colX[0] + 0.15, 1.5, factorW, 0.28, { fontSize: 10.5, bold: true, color: C.muted });
  addText(slide, '事実（数値は出典のとおり）', colX[1], 1.5, factW, 0.28, { fontSize: 10.5, bold: true, color: C.muted });
  addText(slide, 'サムスンへの影響', colX[2], 1.5, impactW, 0.28, { fontSize: 10.5, bold: true, color: C.muted });

  const rowH = 1.2;
  const gap = 0.08;
  rows.forEach((row, i) => {
    const y = 1.82 + i * (rowH + gap);
    addCard(slide, x0, y, RIGHT_EDGE - x0, rowH, { fill: i % 2 === 0 ? C.gray : C.white, line: C.grid, lineWidth: 0.75 });
    addSign(slide, row.sign, colX[0] + 0.28, y + 0.3, 0.28);
    addText(slide, row.factor, colX[0] + 0.52, y + 0.13, factorW - 0.62, rowH - 0.26, { fontSize: 12.5, bold: true, color: lens.color });
    addText(slide, row.fact, colX[1], y + 0.1, factW, rowH - 0.2, { fontSize: 10.5, valign: 'middle' });
    addText(slide, row.impact, colX[2], y + 0.1, impactW, rowH - 0.2, { fontSize: 10.5, valign: 'middle' });
  });
  addSource(slide, source);
  return slide;
}

// SWOT の詳細スライド：左に数字の帯、右に根拠つきの5項目
function buildSwotDetail(lens, kicker, title, stats, items, source, notes, { leftPanel } = {}) {
  const slide = newContentSlide(PART.SWOT, kicker, title, notes, { accent: lens.color });
  const panelW = 3.35;
  if (leftPanel) {
    leftPanel(slide, MARGIN_X, 1.5, panelW, 5.33);
  } else {
    const statH = (5.33 - 0.15 * (stats.length - 1)) / stats.length;
    stats.forEach((stat, i) => {
      addStat(slide, MARGIN_X, 1.5 + i * (statH + 0.15), panelW, statH, stat.value, stat.label,
        { color: lens.color, fill: lens.tint, valueSize: stat.size || 30, labelSize: 11 });
    });
  }
  const x0 = MARGIN_X + panelW + 0.3;
  const w = RIGHT_EDGE - x0;
  const itemH = (5.33 - 0.1 * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const y = 1.5 + i * (itemH + 0.1);
    addCircle(slide, x0 + 0.2, y + 0.22, 0.34, lens.color, String(i + 1), { fontSize: 12 });
    addText(slide, item.head, x0 + 0.5, y + 0.04, w - 0.5, 0.36, { fontSize: 13, bold: true, color: lens.color, valign: 'middle' });
    addText(slide, item.body, x0 + 0.5, y + 0.42, w - 0.5, itemH - 0.46, { fontSize: 11, color: C.ink });
  });
  addSource(slide, source);
  return slide;
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'SAMSUNG IMAGE SENSOR BUSINESS ｜ SWOT & PEST', 0.8, 1.2, 7.8, 0.35, { fontSize: 13, bold: true, color: C.primaryLight, charSpacing: 2 });
  addText(slide, withBreaks(['サムスン電子の', 'イメージセンサー事業', 'SWOT分析・PEST分析']), 0.8, 1.6, 7.9, 2.1, { fontSize: 34, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.02 });
  addText(slide, '世界2位の座が揺らぐ「ISOCELL」は、\nApple向けの米国生産で巻き返せるか', 0.8, 3.9, 7.6, 0.9, { fontSize: 18, color: C.onDarkSub, lineSpacingMultiple: 1.1 });
  addText(slide, '決算発表・各社の発表・調査会社・業界メディアの公開情報をもとに整理', 0.8, 4.95, 7.6, 0.4, { fontSize: 13, color: C.primaryLight });
  addText(slide, `${DECK_DATE}時点　｜　社内情報は使用していません`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右側：2億画素センサーの画素配列（同じ色の4×4＝16画素がまとまる Tetra²pixel）のモザイク。中心ほど濃く、光が当たっている様子を表す
  const cols = 8;
  const rows = 8;
  const cell = 0.36;
  const gap = 0.045;
  const gx = 8.95;
  const gy = 1.3;
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: gx - 0.2, y: gy - 0.2, w: gridW + 0.4, h: gridH + 0.4, rectRadius: 0.1,
    fill: { color: C.nightCard }, line: { color: C.nightLine, width: 1.25 },
  });
  const spotC = 4.3;
  const spotR = 3.2;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const blockR = Math.floor(r / 4);
      const blockC = Math.floor(c / 4);
      const color = blockR === 0 ? (blockC === 0 ? C.R : C.G) : (blockC === 0 ? C.G : C.B);
      const dist = Math.hypot(c - spotC, r - spotR);
      const transparency = Math.min(80, Math.round(6 + dist * 13));
      // 4×4 のまとまりの境目は少し広く空ける
      const x = gx + c * (cell + gap) + (blockC === 1 ? 0.06 : 0) - 0.03;
      const y = gy + r * (cell + gap) + (blockR === 1 ? 0.06 : 0) - 0.03;
      slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w: cell, h: cell,
        fill: { color, transparency }, line: { color: C.nightCard, width: 0.25 },
      });
    }
  }
  addText(slide, '2億画素センサーの画素配列のイメージ\n（同じ色の16画素をまとめて使う Tetra²pixel）', gx - 0.35, gy + gridH + 0.32, gridW + 0.7, 0.55, { fontSize: 10, color: C.onDarkSub, align: 'center' });

  slide.addNotes([
    'この資料では、韓国のサムスン電子のイメージセンサー事業を、PEST分析とSWOT分析の2つの枠組みで整理します。',
    'イメージセンサーは、スマートフォンやカメラ、車に載る「電子の目」にあたる半導体です。サムスンは「ISOCELL（アイソセル）」というブランドで展開し、長く世界2位の座にありました。',
    'しかし2025年は、調査会社によっては中国系のオムニビジョンに抜かれて3位とされるなど、2位の座が揺らいでいます。一方で、AppleがiPhone向けのセンサーをサムスンの米国工場で調達するという報道があり、巻き返しの機会も訪れています。',
    '右の図は、サムスンが得意とする2億画素センサーの画素の並び方のイメージです。同じ色の16個の画素をひとまとめにして、暗い場面では大きな画素として使います。',
    '数値はすべて、サムスンの決算発表、各社の発表、調査会社、業界メディアの公開情報から引用し、各スライドの下に出典を示しています。確認日は2026年9月28日です。社内の情報は使っていません。また、投資判断を目的とした資料ではありません。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料について
// =====================================================================
{
  const slide = newContentSlide(null, 'この資料について', '公開情報で、外部環境（PEST）と事業の位置（SWOT）を整理する', [
    'この資料の目的と前提です。',
    '対象は、サムスン電子の半導体部門（DS部門）の中にあるSystem LSI事業部が手がけるイメージセンサー「ISOCELL」です。事業部の中では、センサー事業チームが担っています。',
    'サムスンはイメージセンサー単独の売上や利益を公表していません。そのため、市場シェアの調査と、決算発表でのSystem LSI事業部についての説明から、事業の状況を読み取ります。',
    'サムスンの決算は暦年で、1月から12月までです。金額はウォン建ての開示値をそのまま使います。',
    '情報源は、サムスンの決算発表と製品発表、Yole GroupやIDCなどの調査会社、日経業界地図、業界メディア、米国と韓国の政府の発表です。報道やアナリストの推計は、事実と区別できるように「報道」「推計」と書いています。',
    '右側は分析の進め方です。現在地を確認し、PESTで外部環境、SWOTで強み・弱み・機会・脅威を整理し、クロスSWOTで打ち手の方向を考え、最後に今後の注目点をまとめます。',
  ]);
  const rows = [
    ['目的', 'サムスン電子のイメージセンサー事業を取り巻く外部環境（PEST）と、強み・弱み・機会・脅威（SWOT）を整理し、今後の打ち手と注目点を考える材料にする'],
    ['対象', 'サムスン電子のDS部門（半導体）System LSI事業部が手がけるイメージセンサー「ISOCELL（アイソセル）」。担い手は同事業部のセンサー事業チーム'],
    ['数値の扱い', 'イメージセンサー単独の売上・利益は非開示のため、調査会社のシェアと決算発表の説明で読む。決算は暦年（1〜12月）、金額はウォン建ての開示値'],
    ['情報源', 'サムスンの決算・製品発表、調査会社（Yole Group、IDC、TechInsightsほか）、日経業界地図、業界メディア、米韓政府の発表。確認日：2026年9月28日'],
    ['注意', '社内情報は使っていない。報道やアナリストの推計は「報道」「推計」と明記した。シェアは調査会社で定義が違う。投資判断を目的とするものではない'],
  ];
  rows.forEach(([label, text], i) => {
    const y = 1.55 + i * 1.03;
    addChip(slide, label, MARGIN_X, y + 0.04, 1.25, 0.36, { fill: C.primary, fontSize: 11.5 });
    addText(slide, text, MARGIN_X + 1.45, y, 5.0, 0.95, { fontSize: 12.5, lineSpacingMultiple: 1.05 });
  });

  // 右：分析の進め方
  const x0 = 7.45;
  const w = RIGHT_EDGE - x0;
  addText(slide, '分析の進め方', x0, 1.5, w, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const steps = [
    ['現在地', '事業の位置づけ・シェア・製品と技術・顧客・直近の出来事'],
    ['PEST分析', '政治・経済・社会・技術の外部環境と、その影響の大きさ'],
    ['SWOT分析', '強み・弱み（内部）と、機会・脅威（外部）'],
    ['クロスSWOT', '4つの組み合わせから、打ち手の方向を考える'],
    ['示唆・注目点', 'サムスンの施策の評価と、今後見るべき指標'],
  ];
  const colors = [C.primary, PEST.E.color, SWOT.S.color, SWOT.O.color, C.primary];
  steps.forEach(([head, desc], i) => {
    const y = 1.95 + i * 0.97;
    addCard(slide, x0, y, w, 0.8, { fill: C.gray });
    addCircle(slide, x0 + 0.4, y + 0.4, 0.44, colors[i], String(i + 1), { fontSize: 14 });
    addText(slide, head, x0 + 0.78, y + 0.08, w - 0.9, 0.32, { fontSize: 13.5, bold: true, color: colors[i] });
    addText(slide, desc, x0 + 0.78, y + 0.42, w - 0.9, 0.32, { fontSize: 11, color: C.muted });
    if (i < steps.length - 1) addLine(slide, x0 + 0.4, y + 0.8, x0 + 0.4, y + 0.97, { color: C.line, width: 1.25 });
  });
}

// =====================================================================
// 3. 要点
// =====================================================================
{
  const slide = newContentSlide(null, 'エグゼクティブサマリー', '2位の座が揺らぐ中、Apple向けの米国生産が反撃の足場になる', [
    '最初に結論をまとめます。',
    '上の4つの数字は、この資料の出発点です。日経業界地図によると、2025年のサムスンの世界シェアは13.2%で、オムニビジョンに抜かれて3位になりました。全社の利益はほぼすべてを半導体、特にメモリが稼いでいます。IDCは2026年のAndroidスマホの出荷が24.3%減ると予測しています。一方、アナリストは2027年までにiPhone向けセンサーの20〜30%をサムスンが取る可能性があると推計しています。',
    '外部環境では、メモリ高騰によるAndroidスマホの急減と、中国のスマホ大手が自国のセンサーを選ぶ動きが逆風です。米国の製造回帰とAppleの調達先の分散は、米国に工場を持つサムスンには追い風です。',
    'SWOTで見ると、強みは2億画素などの技術、自社のGalaxyという需要、メモリ由来の製造力と米国拠点です。弱みはシェアの低下、上位機種や車載での劣位、社内でメモリが優先されること、人材の流出です。',
    '示唆としては、Apple向けの3層積層センサーを量産で立ち上げて上位機種の実績を作れるか、そしてメモリの好況の中でもセンサーへの投資と人材を守れるかが焦点です。',
  ]);
  const stats = [
    ['13.2%', '2025年の世界シェア（日経業界地図）。OmniVisionに抜かれ3位に', C.B],
    ['99.7%', '全社の営業利益に占める半導体部門の比率（2026年4〜6月、本資料で計算）', C.primary],
    ['−24.3%', '2026年のAndroidスマホの出荷予測（IDC）。主な顧客層を直撃', SWOT.T.color],
    ['20〜30%', 'iPhone向けセンサー数量でサムスンが2027年までに得る比率（推計）', SWOT.O.color],
  ];
  const tileW = (CONTENT_W - 0.2 * 3) / 4;
  stats.forEach(([value, label, color], i) => {
    addStat(slide, MARGIN_X + i * (tileW + 0.2), 1.5, tileW, 1.3, value, label, { color, valueSize: 27, labelSize: 10.5 });
  });
  const messages = [
    ['現在地', C.primary, '長く世界2位だったが、シェアは2020〜21年の22%をピークに低下。2025年は売上が横ばい（Yole）で、13.2%の3位とする調査も（日経業界地図）。顧客は自社のGalaxyと、中国などのAndroidスマホが中心'],
    ['外部環境', PEST.E.color, 'メモリ高騰でAndroidスマホが急減（IDC）。中国のスマホ大手は自国のセンサーへ。一方、米国の製造回帰とAppleの調達先の分散は、米国に工場を持つサムスンに追い風'],
    ['SWOT', SWOT.S.color, '強みは2億画素・超微細画素の技術、自社Galaxyの需要、メモリ由来の製造力と米国拠点。弱みはシェアの低下、上位機種・車載での劣位、社内でのメモリ優先、人材の流出'],
    ['示唆', SWOT.O.color, 'Apple向けの3層積層センサーを量産で立ち上げ、上位機種の実績を作れるか。メモリの好況の中でも、センサーへの投資と人材を守れるかが鍵'],
  ];
  messages.forEach(([label, color, text], i) => {
    const y = 3.05 + i * 0.95;
    addCard(slide, MARGIN_X, y, CONTENT_W, 0.85, { fill: C.white, line: C.grid, lineWidth: 0.75 });
    addChip(slide, label, MARGIN_X + 0.15, y + 0.23, 1.25, 0.38, { fill: color, fontSize: 11.5 });
    addText(slide, text, MARGIN_X + 1.6, y + 0.06, CONTENT_W - 1.8, 0.73, { fontSize: 12.5, valign: 'middle' });
  });
  addSource(slide, '出所：日経業界地図2027年版（デジカメライフ 2026-08-21）、Yole Group（2026-08-03）、Samsung Electronics 2026年4〜6月期決算（2026-07-30）、IDC（2026-08-26）、Sammy Fans（2026-01-11、SemiAnalysisの推計を紹介）。要点のまとめ方は本資料による');
}

// =====================================================================
// 4. 事業の概要
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ①　事業の概要', 'イメージセンサーは、メモリ中心の巨大な半導体部門の中の一事業', [
    'サムスンのイメージセンサー事業が、会社の中のどこにあるかを示しました。',
    'サムスン電子は、半導体のDS部門と、スマホや家電などの完成品のDX部門に分かれます。イメージセンサーは、DS部門の中のSystem LSI事業部が手がけています。System LSIは、スマホの頭脳にあたるSoCなども扱う事業部です。',
    'ISOCELLの主な顧客は、同じ会社のスマホ事業が作るGalaxyと、Xiaomi・vivo・Motorolaなどの他社のスマホです。さらに、AppleのiPhone向けを米国テキサス州のオースティン工場で準備していると報じられています。',
    '右側は事業の特徴です。サムスンは2002年にイメージセンサーの生産を始めました。イメージセンサー単独の売上は公表していませんが、シェアから見るとオムニビジョンとほぼ同じ規模です。',
    'もう一つの特徴は、メモリと工程が近いことです。2018年にはDRAMのラインの一部をイメージセンサー用に転換し、逆に最近はセンサーの生産能力をメモリに振り向けたと指摘されています。',
  ]);
  // 左：体制図
  const lx = MARGIN_X;
  const lw = 6.3;
  addCard(slide, lx, 1.5, lw, 0.55, { fill: C.primary });
  addText(slide, 'サムスン電子（2026年4〜6月：売上高171.5兆ウォン、営業利益89.5兆ウォン）', lx + 0.2, 1.5, lw - 0.3, 0.55, { fontSize: 11, bold: true, color: C.white, valign: 'middle' });
  addLine(slide, lx + 1.9, 2.05, lx + 1.9, 2.25, { color: C.primary, width: 1.5 });
  addLine(slide, lx + 5.05, 2.05, lx + 5.05, 2.25, { color: C.primary, width: 1.5 });
  // DS部門
  const dsW = 3.8;
  addCard(slide, lx, 2.25, dsW, 1.3, { fill: C.gray, line: C.line, lineWidth: 0.75 });
  addText(slide, 'DS部門（半導体）', lx + 0.15, 2.32, dsW - 0.3, 0.34, { fontSize: 12.5, bold: true, color: C.primary });
  const dsUnits = [['メモリ', C.white, C.ink], ['System LSI', C.B, C.white], ['ファウンドリー', C.white, C.ink]];
  const unitW = (dsW - 0.3 - 0.2) / 3;
  dsUnits.forEach(([name, fill, color], i) => {
    const x = lx + 0.15 + i * (unitW + 0.1);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.78, w: unitW, h: 0.55, rectRadius: 0.06, fill: { color: fill }, line: { color: fill === C.white ? C.line : fill, width: 0.75 } });
    addText(slide, name, x, 2.78, unitW, 0.55, { fontSize: 10.5, bold: true, color, align: 'center', valign: 'middle' });
  });
  // DX部門
  const dxX = lx + dsW + 0.15;
  const dxW = lw - dsW - 0.15;
  addCard(slide, dxX, 2.25, dxW, 1.3, { fill: C.gray, line: C.line, lineWidth: 0.75 });
  addText(slide, 'DX部門（完成品）', dxX + 0.15, 2.32, dxW - 0.3, 0.34, { fontSize: 12.5, bold: true, color: C.primary });
  addText(slide, 'MX（スマホのGalaxy）・\nネットワーク／映像・家電', dxX + 0.15, 2.72, dxW - 0.3, 0.7, { fontSize: 11, color: C.ink });
  // System LSI → ISOCELL
  const lsiCx = lx + 0.15 + unitW + 0.1 + unitW / 2;
  addLine(slide, lsiCx, 3.33, lsiCx, 3.78, { color: C.B, width: 1.75, arrow: true });
  addCard(slide, lx, 3.8, lw, 0.62, { fill: SWOT.O.tint, line: C.B, lineWidth: 1.25 });
  addText(slide, [{ text: 'センサー事業チーム：', bold: true, color: C.B }, { text: 'イメージセンサー「ISOCELL（アイソセル）」', bold: true, color: C.ink }], lx + 0.2, 3.8, lw - 0.4, 0.62, { fontSize: 13, valign: 'middle' });
  // 顧客
  addText(slide, '主な顧客', lx, 4.6, lw, 0.3, { fontSize: 12, bold: true, color: C.muted });
  const customers = [
    ['自社', C.B, 'Galaxyのスマホ。最上位機のS26 Ultraでもカメラ5個中4個がISOCELL'],
    ['他社', '5A6172', 'Xiaomi・vivo・Motorolaなど、中国を中心としたAndroidスマホ（報道）'],
    ['新規', SWOT.O.color, 'AppleのiPhone向けを米オースティン工場で準備（報道）'],
  ];
  customers.forEach(([label, fill, text], i) => {
    const y = 4.95 + i * 0.63;
    addChip(slide, label, lx, y + 0.1, 0.8, 0.34, { fill, fontSize: 11 });
    addText(slide, text, lx + 0.95, y, lw - 0.95, 0.56, { fontSize: 11, valign: 'middle' });
  });

  // 右：事業の特徴
  const rx = 7.25;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '事業の特徴', rx, 1.5, rw, 0.32, { fontSize: 12.5, bold: true, color: C.primary });
  const facts = [
    ['2002年', 'イメージセンサーの生産を開始。2014年まではOmniVisionに次ぐ3位、2018年まではシェア20%未満だった'],
    ['非開示', 'イメージセンサー単独の売上・利益は公表していない。決算発表ではSystem LSI事業部の説明の中で触れる程度'],
    ['13%前後', '2025年の世界シェア。OmniVision（売上 約30億ドル、13%）とほぼ同じ規模（TSR・日経業界地図）'],
    ['メモリと近い', '工程がメモリに近く、2018年にDRAMのラインの一部をセンサー用に転換。最近は逆にセンサーの生産能力をメモリ（HBM）へ振り向けた（Yole）'],
  ];
  facts.forEach(([value, label], i) => {
    const y = 1.92 + i * 1.2;
    addCard(slide, rx, y, rw, 1.08, { fill: C.gray });
    addText(slide, value, rx + 0.18, y, 1.75, 1.08, { fontSize: 17, bold: true, color: C.B, valign: 'middle' });
    addText(slide, label, rx + 2.0, y + 0.06, rw - 2.15, 0.96, { fontSize: 11, valign: 'middle' });
  });
  addSource(slide, '出所：Samsung Electronics 2026年4〜6月期決算（2026-07-30）、GSMArena（2026-03-06）、TrendForce（2025-08-07、Business Koreaの報道を紹介）、MacRumors（2025-12-24）、THE ELEC（2021-08-13）、IT之家（2026-09-07、TSRの調査）、日経業界地図2027年版、Edaily（2018-04-26）、Yole Group（2024-07-03）');
}

// =====================================================================
// 5. 市場でのポジション
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ②　市場でのポジション', 'シェアは2020〜21年の22%がピーク。2025年は2位争いに', [
    'イメージセンサー市場でのサムスンの位置です。',
    '左のグラフは、フランスの調査会社Yole Groupによる、サムスンの世界シェアの推移です。2020年と2021年の22%がピークで、2022年と2023年は19%に下がりました。同じ期間に、首位のソニーは40%前後から45%に上げています。2024年以降、Yoleはサムスンのシェアの数値を公表していませんが、2025年は「売上がおおむね横ばい」としています。',
    '右は2025年の状況です。日経業界地図2027年版の出荷額ベースのシェアでは、サムスンは13.2%で、13.4%のオムニビジョンにわずかに抜かれて3位になりました。日本の調査会社テクノ・システム・リサーチも、オムニビジョンが初めてサムスンを上回ったとしています。一方、Yoleはサムスンが2位を維持したとしており、調査によって順位が分かれます。',
    '国・地域別で見ると、韓国勢のシェアは21%から17%に下がり、21%に伸びた中国勢に抜かれました。韓国勢の後退には、SK hynixの撤退も影響しています。',
  ]);
  // 左：Yole によるシェアの推移
  addText(slide, 'サムスンの世界シェアの推移（Yole、金額ベース）', MARGIN_X, 1.5, 6.0, 0.32, { fontSize: 13, bold: true, color: C.B });
  const years = ['2019年', '2020年', '2021年', '2022年', '2023年'];
  const samsungShares = [21, 22, 22, 19, 19];
  slide.addChart(pres.charts.BAR, [{ name: 'サムスンのシェア', labels: years, values: samsungShares }], {
    x: MARGIN_X, y: 1.85, w: 5.9, h: 3.55, barDir: 'col', barGapWidthPct: 60,
    chartColors: [C.B],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"', dataLabelFontSize: 12, dataLabelColor: C.ink, dataLabelFontFace: FONT, dataLabelFontBold: true,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 11, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
    valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 28, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, layout: { x: 0.04, y: 0.08, w: 0.92, h: 0.78 },
  });
  addCard(slide, MARGIN_X, 5.55, 5.9, 1.25, { fill: C.gray });
  addBullets(slide, [
    lead('参考（ソニー）：', '42%（2019年）→40%（2020年）→42%（2022年）→45%（2023年）→約50%（2025年）'),
    lead('2021年の値：', '「2022年は前年比3ポイント減の19%」から計算'),
    lead('2024〜25年：', 'Yoleは数値を公表せず、「売上は横ばい」とする'),
  ], MARGIN_X + 0.2, 5.63, 5.5, 1.12, { fontSize: 10.5, space: 3 });

  // 右：2025年のシェア（日経業界地図）と、調査による順位の違い
  const rx = 6.95;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '2025年の世界シェア（出荷額ベース、日経業界地図）', rx, 1.5, rw, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const cats = ['ソニー', 'オムニビジョン', 'サムスン', 'スマートセンス', 'ギャラクシーコア', 'その他'];
  const shares = [53.6, 13.4, 13.2, 5.6, 3.9, 10.3];
  slide.addChart(pres.charts.BAR, [{ name: 'シェア', labels: cats, values: shares }], {
    x: rx, y: 1.85, w: rw, h: 2.55, barDir: 'bar', barGapWidthPct: 40,
    catAxisOrientation: 'maxMin',
    chartColors: ['8A93A8', SWOT.T.color, C.B, 'C3C8D4', 'C3C8D4', 'D9DDE5'],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0"%"', dataLabelFontSize: 10.5, dataLabelColor: C.ink, dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10.5, catAxisLabelColor: C.ink, catAxisLineColor: C.line,
    valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 66, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false,
  });
  addText(slide, '2位はどこか：調査によって見方が分かれる', rx, 4.5, rw, 0.3, { fontSize: 12, bold: true, color: C.muted });
  const views = [
    ['Yole', C.B, '2位を維持。ただし売上はおおむね横ばい'],
    ['TSR', SWOT.T.color, 'OmniVision（約30億ドル・13%）が初めて上回り2位'],
    ['日経業界地図', SWOT.T.color, '13.2%（前年比−1.7ポイント）で3位に後退'],
  ];
  views.forEach(([label, fill, text], i) => {
    const y = 4.85 + i * 0.42;
    addChip(slide, label, rx, y + 0.03, 1.45, 0.32, { fill, fontSize: 10.5 });
    addText(slide, text, rx + 1.6, y, rw - 1.6, 0.38, { fontSize: 11, valign: 'middle' });
  });
  addCard(slide, rx, 6.18, rw, 0.62, { fill: SWOT.T.tint });
  addText(slide, [{ text: '地域別（Yole）：', bold: true, color: SWOT.T.color }, { text: '韓国勢は21%→17%に低下し、19%→21%に伸びた中国勢に抜かれた（2024→2025年）' }],
    rx + 0.15, 6.18, rw - 0.3, 0.62, { fontSize: 10.5, valign: 'middle' });
  addSource(slide, '出所：THE ELEC（2021-08-13）・EE Times Japan（2023-07-27・2024-07-04）によるYoleの調査、Yole Group（2025-07-28・2026-08-03）、EE Times Japan（2026-08-26）、日経業界地図2027年版（デジカメライフ 2026-08-21）、IT之家（2026-09-07、TSRの調査）');
}

// =====================================================================
// 6. 会社の中での位置づけ
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ③　会社の中での位置づけ', '全社の利益のほぼすべてを半導体が稼ぐ。主役はメモリ', [
    'サムスン電子の中で、イメージセンサー事業がどのような位置にあるかを見ます。',
    '左のグラフは2026年の部門別の営業利益です。4〜6月期は全社の営業利益89.5兆ウォンのうち、半導体のDS部門が89.2兆ウォンで、ほぼすべてを稼いでいます。その中心は、AI向けの需要と価格の上昇で過去最高を更新しているメモリです。一方、スマホのMX・ネットワーク事業は、部品のコスト高で0.7兆ウォンの赤字になりました。',
    '右は、決算発表でのSystem LSI事業部についての説明です。イメージセンサー単独の数字はありません。1〜3月期には、下期に2億画素センサーの顧客と製品群を広げる計画を示しました。4〜6月期は中国のスマホ需要の弱さの影響を受けながらも、普及価格帯向けの拡販で上半期の売上は過去最高になりました。',
    'メモリがこれだけ稼いでいると、設備や人材はメモリに向かいやすくなります。実際にYoleは、サムスンがセンサーの生産能力をメモリに振り向けたと指摘しています。これは後のSWOTで弱みとして取り上げます。',
  ]);
  addText(slide, '部門別の営業利益（兆ウォン、2026年）', MARGIN_X, 1.5, 6.0, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const quarters = ['1〜3月', '4〜6月'];
  slide.addChart(pres.charts.BAR, [
    { name: '全社', labels: quarters, values: [57.2, 89.5] },
    { name: 'DS部門（半導体）', labels: quarters, values: [53.7, 89.2] },
    { name: 'MX・ネットワーク（スマホ）', labels: quarters, values: [2.8, -0.7] },
  ], {
    x: MARGIN_X, y: 1.85, w: 6.0, h: 3.55, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 70, barOverlapPct: -10,
    chartColors: ['8A93A8', C.B, C.R],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 11.5, catAxisLabelColor: C.ink, catAxisLineColor: C.line,
    valAxisHidden: true, valAxisMinVal: -10, valAxisMaxVal: 100, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 'b', legendFontFace: FONT, legendFontSize: 10.5, legendColor: C.ink,
  });
  addCard(slide, MARGIN_X, 5.55, 6.0, 1.25, { fill: C.gray });
  addText(slide, [
    { text: '4〜6月：', bold: true, color: C.B },
    { text: '全社の営業利益の99.7%をDS部門が稼ぐ（本資料で計算）。スマホのMX・ネットワークは部品のコスト高で0.7兆ウォンの営業赤字' },
  ], MARGIN_X + 0.2, 5.62, 5.6, 1.1, { fontSize: 11.5, valign: 'middle' });

  const rx = 6.95;
  const rw = RIGHT_EDGE - rx;
  const cards = [
    ['System LSI（2026年1〜3月）', C.primary, C.gray, 'SoC（スマホの頭脳）の販売拡大で増益。4〜6月は普及価格帯（量産帯）のスマホ向けにSoCとセンサーを拡販し、下期は2億画素センサーの顧客と製品群を広げる計画'],
    ['System LSI（2026年4〜6月）', C.primary, C.gray, '最上位機の季節要因と中国のスマホ需要の弱さの影響を受けたが、量産帯向けSoC・センサーの拡販で売上を維持し、上半期は過去最高。下期も部品高と消費の弱さが続くとみて、センサーの競争力を強める'],
    ['メモリ優先の力学', SWOT.W.color, SWOT.W.tint, 'メモリはAI需要と価格上昇で過去最高（HBM4の出荷拡大など）。2023年ごろには、センサーの生産能力をメモリ（特にHBM）へ振り向けたと指摘されている（Yole）'],
  ];
  cards.forEach(([head, color, fill, body], i) => {
    const y = 1.5 + i * 1.8;
    addCard(slide, rx, y, rw, 1.68, { fill });
    addText(slide, head, rx + 0.2, y + 0.1, rw - 0.4, 0.34, { fontSize: 13, bold: true, color });
    addText(slide, body, rx + 0.2, y + 0.48, rw - 0.4, 1.12, { fontSize: 12.5 });
  });
  addSource(slide, '出所：Samsung Electronics 2026年1〜3月期決算（2026-04-30）・4〜6月期決算（2026-07-30）、Yole Group（2024-07-03）。比率は本資料で計算');
}

// =====================================================================
// 7. 製品と技術の歩み
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ④　製品と技術の歩み', '画素の微細化と高画素化で、業界の「初」を重ねてきた', [
    'サムスンのイメージセンサーの製品と技術の歩みです。',
    '2002年に生産を始め、2018年には、同じ会社のDRAMの生産ラインの一部をイメージセンサー用に転換しました。メモリと製造工程が近いことを生かした動きです。',
    '2021年には、業界で初めて2億画素のスマホ用センサーHP1を発表しました。1つ1つの画素を0.64マイクロメートルまで小さくし、暗い場面では16個の画素を1つにまとめて使う技術を組み合わせています。その後も、望遠カメラ用の2億画素センサー、0.5マイクロメートルの画素と、業界最小を更新してきました。',
    '同じ2021年には初の車載用センサー、2023年にはロボットやXR向けのセンサーも発表し、スマホ以外への展開も始めています。',
    '次の焦点は、3枚のウエハーを重ねる3層積層です。AppleのiPhone向けに、この構造のセンサーを米国で作ると報じられています。',
  ]);
  const items = [
    ['2002', 'イメージセンサーの生産を開始'],
    ['2018', 'DRAMのライン（華城11ライン）の一部をセンサー用に転換'],
    ['2021.7', '初の車載用 ISOCELL Auto 4AC（120dBのHDR）'],
    ['2021.9', '業界初の2億画素 HP1（画素 0.64µm）'],
    ['2023.12', 'ロボット・XR向け Vizion 63D（ToF）・931'],
    ['2024.6', '業界初の望遠用2億画素 HP9（0.56µm）'],
    ['2026.1', '0.5µm画素の2億画素HP5が\nCESイノベーションアワード'],
    ['2026〜27', 'Apple向け3層積層センサーを米国で生産（報道）'],
  ];
  const lineY = 3.05;
  const boxW = 2.45;
  const x0 = MARGIN_X + boxW / 2;
  const x1 = RIGHT_EDGE - boxW / 2;
  addLine(slide, MARGIN_X + 0.1, lineY, RIGHT_EDGE - 0.1, lineY, { color: C.line, width: 2 });
  const step = (x1 - x0) / (items.length - 1);
  items.forEach(([year, text], i) => {
    const cx = x0 + i * step;
    const future = i === items.length - 1;
    const color = future ? SWOT.O.color : (i >= 2 ? C.B : C.primary);
    addCircle(slide, cx, lineY, 0.2, color, '', {});
    const above = i % 2 === 0;
    const bx = cx - boxW / 2;
    const chipY = above ? 1.55 : 3.3;
    addChip(slide, year, cx - 0.5, chipY, 1.0, 0.3, { fill: color, fontSize: 11 });
    addText(slide, text, bx, chipY + 0.36, boxW, 0.9, { fontSize: 11, align: 'center' });
    addLine(slide, cx, above ? chipY + 1.2 : lineY + 0.1, cx, above ? lineY - 0.1 : chipY, { color: C.grid, width: 1 });
  });

  const cardY = 4.72;
  const cardH = 2.1;
  const cw = (CONTENT_W - 0.25) / 2;
  addCard(slide, MARGIN_X, cardY, cw, cardH, { fill: C.gray });
  addText(slide, '得意の型：画素を小さくして数を増やす', MARGIN_X + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: C.B });
  addBullets(slide, [
    lead('業界最小の更新：', '0.64µm（2021年）→0.56µm（2024年）→0.5µm（HP5）'),
    lead('Tetra²pixel：', '同じ色の16画素をまとめ、暗い場面では大きな画素として使う'),
    lead('小さな画素の工夫：', '画素の間を深い溝で仕切る構造（DTI）や高屈折率のレンズで、光を逃さない'),
  ], MARGIN_X + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  const rx = MARGIN_X + cw + 0.25;
  addCard(slide, rx, cardY, cw, cardH, { fill: C.gray });
  addText(slide, 'スマホ以外への広がりと次の焦点', rx + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: SWOT.O.color });
  addBullets(slide, [
    lead('車載：', 'Auto 4AC（周囲の確認・後方カメラ用）。電子ミラーや自動運転へ広げる計画'),
    lead('ロボット・XR：', 'Vizionシリーズ（2020年〜）。距離を測るToFと、動く物をゆがまず写す方式'),
    lead('3層積層：', '現行のISOCELLは2枚の貼り合わせ（報道）。Apple向けは3枚を重ねる構造（報道）'),
  ], rx + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  addSource(slide, '出所：THE ELEC（2021-08-13）、Edaily（2018-04-26）、Samsung Electronics（2021-07-13・09-02、2023-12-19、2024-06-27）、Samsung Semiconductor（2026-01-08）、TrendForce（2025-08-07、Business Koreaの報道を紹介）、MacRumors・9to5Mac（2025-12-24）');
}

// =====================================================================
// 8. 顧客とソニーとの比較
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑤　顧客とソニーとの比較', '自社のGalaxyとAndroidが柱。上位機種ではソニーに及ばない', [
    '顧客と、首位ソニーとの違いです。',
    '左は、2026年に発売されたサムスンの最上位機Galaxy S26 Ultraのカメラです。5つのカメラのうち4つがISOCELLですが、5倍の望遠カメラはソニー製です。また、主カメラのHP2は、2023年のS23 Ultraから同じセンサーが使われ続けています。自社の最上位機でも、すべてを自社のセンサーでそろえているわけではありません。',
    '他社の顧客は、Xiaomi、vivo、Motorolaなど、中国を中心としたAndroidのスマホメーカーです。',
    '右の表はソニーとの比較です。ソニーは大きなセンサーや積層型の技術で上位機種に強く、iPhoneのセンサーはほぼソニーが供給してきました。サムスンは2億画素などの高画素と、普及価格帯から中価格帯のスマホに強みがあります。',
    '社内での位置づけも違います。ソニーにとってイメージセンサーは成長投資の中心ですが、サムスンではメモリ中心の半導体部門の一事業です。',
  ]);
  // 左：Galaxy S26 Ultra のカメラ構成
  addText(slide, 'Galaxy S26 Ultra のカメラ（2026年）', MARGIN_X, 1.5, 5.4, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const phoneX = MARGIN_X + 0.1;
  const phoneY = 1.95;
  const phoneW = 1.45;
  const phoneH = 3.05;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: phoneX, y: phoneY, w: phoneW, h: phoneH, rectRadius: 0.18, fill: { color: C.nightCard }, line: { color: C.nightLine, width: 1.5 } });
  const cams = [
    ['1', '主カメラ', '2億画素 HP2', 'ISOCELL。2023年のS23 Ultraから据え置き', C.B],
    ['2', '超広角', '5,000万画素 JN3', 'ISOCELL', C.B],
    ['3', '3倍望遠', '1,000万画素 3LD', 'ISOCELL', C.B],
    ['4', '5倍望遠', '5,000万画素 IMX854', 'ソニー製', SWOT.W.color],
    ['5', '前面', '1,200万画素 3LU', 'ISOCELL', C.B],
  ];
  // 背面の4つ（縦に並ぶ）と、区切り線の下に前面の1つ
  cams.slice(0, 4).forEach(([no, , , , color], i) => {
    addCircle(slide, phoneX + 0.42, phoneY + 0.36 + i * 0.5, 0.38, color, no, { fontSize: 12, lineColor: C.nightLine });
  });
  addText(slide, '背面', phoneX + 0.78, phoneY + 0.22, 0.55, 0.28, { fontSize: 9.5, color: C.onDarkSub });
  addLine(slide, phoneX + 0.12, phoneY + 2.3, phoneX + phoneW - 0.12, phoneY + 2.3, { color: C.nightLine, width: 1 });
  addText(slide, '前面', phoneX + 0.78, phoneY + 2.5, 0.55, 0.28, { fontSize: 9.5, color: C.onDarkSub });
  addCircle(slide, phoneX + 0.42, phoneY + 2.64, 0.32, cams[4][4], cams[4][0], { fontSize: 10, lineColor: C.nightLine });
  const listX = phoneX + phoneW + 0.25;
  const listW = MARGIN_X + 5.5 - listX;
  cams.forEach(([no, role, sensor, maker, color], i) => {
    const y = 1.95 + i * 0.62;
    addCircle(slide, listX + 0.15, y + 0.2, 0.3, color, no, { fontSize: 10 });
    addText(slide, [{ text: `${role}　`, bold: true, color: C.ink }, { text: sensor, bold: true, color }], listX + 0.4, y, listW - 0.4, 0.3, { fontSize: 11.5, valign: 'middle' });
    addText(slide, maker, listX + 0.4, y + 0.29, listW - 0.4, 0.28, { fontSize: 10, color: C.muted, valign: 'middle' });
  });
  addCard(slide, MARGIN_X, 5.2, 5.5, 1.6, { fill: C.gray });
  addBullets(slide, [
    lead('自社機：', '5個中4個がISOCELL。ただし5倍望遠はソニー製'),
    lead('他社：', 'Xiaomi・vivo・Motorolaなど中国中心のAndroid（報道）'),
    lead('新規：', 'AppleのiPhone 18向け（報道・推計。確定ではない）'),
  ], MARGIN_X + 0.2, 5.35, 5.1, 1.4, { fontSize: 12, space: 8 });

  // 右：ソニーとの比較
  const rx = 6.35;
  const rw = RIGHT_EDGE - rx;
  addText(slide, 'ソニーとの比較', rx, 1.5, rw, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const rows = tableRows(['項目', 'サムスン（ISOCELL）', 'ソニー'], [
    ['2025年のシェア', '13.2%で3位（日経業界地図）。Yoleでは2位だが売上は横ばい', '53.6%（日経業界地図）、約50%（Yole）'],
    ['モバイル向け', 'ソニーに大きく離される', '57%で首位（Yole）'],
    ['得意分野', '2億画素・超微細画素。普及価格帯〜中価格帯', '大判・積層（3層積層をiPhone・OPPOに）、上位機種'],
    ['主な顧客', '自社Galaxy、Xiaomi・vivo・Motorolaなど', 'iPhoneはほぼソニーが供給（報道）、中国の上位機'],
    ['生産', '韓国の自社工場（メモリと工程が近い）。米オースティンでApple向けを準備（報道）', '日本の自社工場。合志市にTSMCとの合弁（2029年量産予定）'],
    ['社内での位置', 'メモリ中心の半導体部門の一事業。業績は非開示', '成長投資の中心。TSMCとの合弁に約4,650億円を拠出'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, rx, 1.9, rw, [1.5, 2.55, rw - 4.05], { fontSize: 10.5, rowH: [0.36, 0.78, 0.5, 0.78, 0.78, 0.95, 0.78] });
  addSource(slide, '出所：GSMArena（2026-03-06）、TrendForce（2025-08-07、Business Koreaの報道を紹介）、日経業界地図2027年版、Yole Group（2026-08-03）、EE Times Japan（2026-08-26）、MacRumors（2025-12-24）、SSS「TSMCとの合弁の確定契約」（2026-08-11）');
}

// =====================================================================
// 9. 直近の出来事
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑥　直近の出来事', 'この1年半で、顧客・競合・通商の動きが一気に進んだ', [
    'この1年半ほどの主な出来事を時系列で並べました。右の列は、それぞれがサムスンのイメージセンサー事業にとって何を意味するかの整理です。',
    '2025年は、同じ韓国のSK hynixがイメージセンサーから撤退しました。8月にはAppleがサムスンの米国工場でのチップ製造を発表し、iPhone用センサーではないかと報じられました。年末にかけて、オースティン工場で3層積層のセンサーのラインを準備しているという報道が続きました。',
    '通商面では、11月に米韓首脳が共同ファクトシートを出し、2026年に入ると米国の半導体関税の発動や、最高裁の関税違法判決が続きました。韓国では半導体特別法が成立しています。',
    '2026年4月には、System LSIの中核技術者の離職が相次いでいるという報道がありました。',
    '8月から9月にかけては、Yoleが中国勢の韓国勢超えを、日経業界地図などがオムニビジョンのサムスン超えを伝えました。IDCはAndroidスマホの大幅な減少を予測しています。逆風と追い風が同時に強まっている状況です。',
  ]);
  const rows = tableRows(['時期', '出来事', '事業にとっての意味'], [
    ['2025年3月', 'SK hynixがイメージセンサー事業から撤退し、AI向けメモリに集中', '韓国の競合が後退'],
    ['2025年8月', 'Appleが米国投資を6,000億ドルに拡大。サムスンのオースティン工場で新技術のチップ製造（iPhone用センサーとの報道）', '最大の商機'],
    ['2025年10〜12月', 'オースティンにApple向け3層積層センサーのラインを準備、2026年3月にも稼働（報道）。検査の協力会社も投資', '立ち上げ準備'],
    ['2025年11月', '米韓首脳の共同ファクトシート：相互関税は15%、半導体の232条関税は他の大口の国より不利にしない方針', '通商の見通し'],
    ['2026年1〜2月', '米国が特定の半導体に232条関税（25%）。韓国で半導体特別法が成立。米最高裁がIEEPA関税を違法と判断', '通商・産業政策'],
    ['2026年4月', 'System LSIの中核技術者の離職が相次ぐと報道。1〜3月期はメモリが過去最高の売上・利益', '人材と社内の力学'],
    ['2026年7〜8月', 'System LSIは上半期の売上が過去最高。Yoleは「サムスンの売上は横ばい、中国勢が韓国勢を抜いた」、IDCはAndroid −24.3%を予測', '逆風と追い風'],
    ['2026年8〜9月', '日経業界地図・TSRの調査で、OmniVisionがサムスンを上回り2位に（サムスンは13.2%）', '2位争い'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [1.6, 8.35, CONTENT_W - 9.95], { fontSize: 10.5, rowH: 0.56 });
  addSource(slide, '出所：TrendForce（2025-03-06・08-07）、Apple（2025-08-06）、MacRumors（2025-10-15・12-24）、The White House（2025-11-13）、Sandler, Travis & Rosenberg、The Korea Herald（2026-01-29）、Skadden（2026-02-24）、DIGITIMES（2026-04-16）、Samsung Electronics決算（2026-04-30・07-30）、Yole Group（2026-08-03）、IDC（2026-08-26）、日経業界地図2027年版、IT之家（2026-09-07）');
}

// =====================================================================
// 10. PEST分析の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ①　全体像', '逆風はAndroidの縮小と中国の国産化、追い風は米国の製造回帰', [
    'ここからPEST分析です。PESTは、政治（Politics）、経済（Economy）、社会（Society）、技術（Technology）の4つの視点で、会社の外側で起きている大きな変化を整理する方法です。',
    '各項目の前の丸印は、サムスンのイメージセンサー事業にとって追い風なら緑のプラス、逆風なら赤のマイナス、両方の面があるものは黄色のプラスマイナスです。',
    '全体を見ると、逆風の中心は、メモリ高騰によるAndroidスマホの急減と、中国のスマホ大手が自国のセンサーを選ぶ動きです。技術面では、競争の軸がソニーの得意な3D積層に移っていることも逆風です。',
    '追い風は、米国の製造回帰と、それに伴うAppleの米国内調達の動きです。米国に工場を持つサムスンには、ソニーにない武器になります。',
    '次のページから、4つの視点を1枚ずつ詳しく見ていきます。',
  ]);
  const quadrants = [
    [PEST.P, [
      ['＋', '米国の製造回帰（Appleが米国工場で調達）'],
      ['±', '米国の関税と米韓合意の行方'],
      ['−', '中国スマホ大手の国産センサー志向'],
      ['±', '韓国の半導体特別法（労働時間の例外は見送り）'],
    ]],
    [PEST.E, [
      ['−', 'メモリ高騰でAndroidスマホが急減（−24.3%）'],
      ['＋', '市場は単価で成長（2031年に303億ドル）'],
      ['−', 'メモリの好況が社内の資源を引き寄せる'],
      ['±', 'Galaxyは健闘、ただしスマホ事業は部品高'],
    ]],
    [PEST.S, [
      ['±', 'スマホの高価格化と買い替えの長期化'],
      ['＋', '写真・ズームの高画質化への期待'],
      ['＋', 'ロボット・XR・車の「目」の需要'],
      ['−', '技術人材の獲得競争と流出'],
    ]],
    [PEST.T, [
      ['±', '画素の微細化は0.5µmへ（限界に近づく）'],
      ['−', '競争軸は3D積層へ（ソニーが先行）'],
      ['＋', '3層積層でApple向けに参入（報道）'],
      ['−', '中国勢の高画素品と、LOFICなどの新構造'],
    ]],
  ];
  const qw = (CONTENT_W - 0.2) / 2;
  const qh = 2.55;
  quadrants.forEach(([lens, lines], i) => {
    const x = MARGIN_X + (i % 2) * (qw + 0.2);
    const y = 1.55 + Math.floor(i / 2) * (qh + 0.15);
    addCard(slide, x, y, qw, qh, { fill: lens.tint });
    addLensHeader(slide, lens, x + 0.2, y + 0.15);
    lines.forEach(([sign, text], j) => {
      addSignedLine(slide, sign, text, x + 0.25, y + 0.78 + j * 0.42, qw - 0.45, { fontSize: 12.5, h: 0.38 });
    });
  });
  let lx = RIGHT_EDGE - 4.1;
  ['＋', '−', '±'].forEach((sign) => {
    addSign(slide, sign, lx + 0.12, 7.14, 0.22);
    addText(slide, SIGN[sign].label, lx + 0.3, 7.02, 0.9, 0.24, { fontSize: 10, color: C.muted, valign: 'middle' });
    lx += 1.15;
  });
  addSource(slide, '出所：各詳細スライドに記載。整理と符号の付け方は本資料による', { y: 7.02, h: 0.3 });
}

// =====================================================================
// 11. PEST：政治
// =====================================================================
buildPestDetail(PEST.P, 'PEST分析 ②　政治（Politics）', '米国の製造回帰は追い風。中国の国産化と通商の揺れは逆風',
  '法律・規制・政策・国際関係など、国や政府の動きが事業に与える影響を見る視点',
  [
    {
      sign: '＋', factor: '米国の製造回帰\nとApple',
      fact: 'Appleは米国投資を6,000億ドルに拡大し、サムスンのオースティン工場で「世界で初めて使う新しいチップ製造技術」を立ち上げると発表（2025年8月）。iPhone用センサーとの報道が相次ぐ。テキサスの工場群には米CHIPS法の支援（最大47.45億ドル）も',
      impact: '米国に工場を持つことが、ソニーにない武器になる。ただし米国での量産の立ち上げとコストが課題（後工程は韓国の可能性）',
    },
    {
      sign: '±', factor: '関税と\n米韓合意',
      fact: '米韓首脳の共同ファクトシート（2025年11月）で相互関税は15%、半導体の232条関税は他の大口の国より不利にしない方針。2026年1月に特定の半導体へ232条関税（25%）。2月に最高裁がIEEPA関税を違法と判断し、合意の前提が揺らいだ',
      impact: 'センサーは主にアジアの端末組立向けで、直接の打撃は限られる。関税の枠組みが変わるたびに、顧客の調達先選びが揺れる',
    },
    {
      sign: '−', factor: '米中対立と\n中国の国産化',
      fact: 'HuaweiやHonorなど中国のスマホメーカーは、地政学リスクを避けて自国のセンサーメーカーに目を向ける（Yole、2024年）。中国勢は地域別シェアで韓国勢を抜いた（2025年）',
      impact: '中国のAndroidスマホはサムスンの重要な販路。国産化が進むほど、中低価格帯で置き換えられる',
    },
    {
      sign: '±', factor: '韓国の産業政策',
      fact: '半導体特別法が2026年1月に成立。大統領直属の委員会と特別会計で、メモリ・システム半導体・設計・製造などを総合的に支援。一方、研究開発職の週52時間の適用除外は見送られた',
      impact: '支援の枠組みは追い風だが、主眼はAI半導体とメモリ。センサーへの配分は見えにくく、労働時間の制約も残る',
    },
  ],
  '出所：Apple（2025-08-06）、TrendForce（2025-08-07）、NIST CHIPS、DIGITIMES（2025-08-11）、The White House（2025-11-13）、Sandler, Travis & Rosenberg、Skadden（2026-02-24）、Yole Group（2024-07-03）、EE Times Japan（2026-08-26）、The Korea Herald（2026-01-29）',
  [
    '政治の視点です。4つの要因を、事実とサムスンへの影響に分けて示しています。',
    '1つ目は追い風で、米国の製造回帰です。Appleは、サムスンのテキサス州オースティン工場で新しい技術のチップを作ると発表し、iPhone用のイメージセンサーではないかと報じられています。米国に工場を持つことは、日本で生産するソニーにない強みになります。ただし、後工程は韓国で行う可能性も報じられており、米国での量産の立ち上げには課題もあります。',
    '2つ目は関税と米韓の合意です。2025年11月の米韓首脳の共同ファクトシートでは、韓国製品の関税を15%とし、半導体の関税でも韓国を不利に扱わない方針が示されました。ところが2026年2月、米国の最高裁がこの種の関税の根拠となっていた法律の使い方を違法と判断し、合意の前提が揺らいでいます。',
    '3つ目は逆風で、中国のスマホメーカーが自国のセンサーを選ぶ動きです。中国のAndroidスマホはサムスンの重要な販路なので、影響は小さくありません。',
    '4つ目は韓国の半導体特別法です。国の支援の枠組みができた一方で、研究開発職の労働時間の例外は見送られました。',
  ]);

// =====================================================================
// 12. PEST：経済
// =====================================================================
buildPestDetail(PEST.E, 'PEST分析 ③　経済（Economy）', 'メモリ高騰がAndroidを直撃。社内ではメモリの好況が資源を引き寄せる',
  '景気・市場の成長・価格・コストなど、お金の流れに関わる変化を見る視点',
  [
    {
      sign: '−', factor: 'Androidスマホ\nの急減',
      fact: 'IDCは2026年のスマホ出荷を前年比−16.7%と予測（過去最大）。Androidは−24.3%、iOSは−1.3%。DRAM・NANDの価格は前年比300%超。100ドル未満の機種（2025年に約1.7億台）は存続の危機',
      impact: '外部顧客の中心である中国などのAndroid、特に普及価格帯が最も縮む。量産帯に力を入れる方針には逆風',
    },
    {
      sign: '＋', factor: '付加価値型の\n市場成長',
      fact: 'センサー市場は2025年に253億ドル（+9%）で過去最高、2031年に303億ドル（年3.1%）の見通し（Yole）。TSRは2026年を横ばいと予想',
      impact: '量より単価で伸びる市場。2億画素や望遠用など単価の高い製品を伸ばせるかが鍵',
    },
    {
      sign: '−', factor: 'メモリの好況と\n社内の資源配分',
      fact: '2026年4〜6月は全社の営業利益89.5兆ウォンのうちDS部門が89.2兆ウォン。メモリはAI需要と価格上昇で過去最高。2023年ごろにはセンサーの生産能力をメモリ（HBM）へ振り向けた（Yole）',
      impact: 'メモリの利益率が高いほど、設備と人材はメモリに向かう。センサーへの投資を社内で説明し続ける必要がある',
    },
    {
      sign: '±', factor: 'Galaxyの健闘と\n部品コスト高',
      fact: 'IDCはサムスンのスマホが2026年にシェアを伸ばすと予測（メモリの確保、Galaxy S26、中価格帯）。一方、スマホ事業（MX・ネットワーク）は4〜6月に0.7兆ウォンの営業赤字（部品のコスト高）',
      impact: '自社の需要は底堅いが、Galaxy側のコスト削減の圧力は強い。センサーの価格や採用にも波及し得る',
    },
  ],
  '出所：IDC（2026-05-26・08-26）、Yole Group（2024-07-03・2026-08-03）、EE Times Japan（2026-08-26）、IT之家（2026-09-07、TSRの調査）、Samsung Electronics 2026年4〜6月期決算（2026-07-30）',
  [
    '経済の視点です。',
    '最大の逆風は、Androidスマホの急減です。AI向けのデータセンターがメモリを大量に使うため、DRAMやNANDの価格が大きく上がり、スマホの価格が上がって出荷が減っています。IDCは、2026年にAndroidが24.3%減る一方、iPhoneは1.3%減にとどまると予測しています。サムスンの外部の顧客は中国などのAndroidが中心で、特に普及価格帯が大きく縮むことは痛手です。',
    '一方で、センサー市場全体は、台数よりも1個あたりの単価の上昇で成長する形に変わっています。2億画素のような単価の高い製品を伸ばせれば、追い風にできます。',
    '3つ目は、サムスン社内の事情です。メモリが過去最高の利益を上げており、全社の営業利益のほぼすべてを半導体部門が稼いでいます。こうなると、設備や人材はメモリに向かいやすくなります。',
    '4つ目は両面のある要因です。サムスンのスマホはAndroidの中では健闘し、シェアを伸ばす見通しですが、スマホ事業自体は部品のコスト高で赤字になりました。自社の需要は底堅い一方、コスト削減の圧力は強まっています。',
  ]);

// =====================================================================
// 13. PEST：社会
// =====================================================================
buildPestDetail(PEST.S, 'PEST分析 ④　社会（Society）', '安いスマホの時代が終わり、高画質と「機械の目」への期待が高まる',
  '人々の暮らし方・価値観・働き方など、社会の変化を見る視点',
  [
    {
      sign: '±', factor: '高価格化と\n買い替えの長期化',
      fact: 'スマホの平均価格は2026年に581ドル（+27.6%）。価格に敏感な市場から安い機種が消え、多くの人は同じ端末を長く使い、買い替え時に高い価格を払うことになる（IDC）',
      impact: '台数は減り、1台あたりの価値は上がる。普及価格帯の比重が高いサムスンには逆風、上位品には追い風',
    },
    {
      sign: '＋', factor: '写真・動画と\nズームへの期待',
      fact: 'スマホのカメラの画質への期待が高まり、主カメラと望遠などのサブカメラの差を縮めることが業界の新しい方向（サムスン、2024年）。望遠用の2億画素センサー（HP9・HP5）を投入',
      impact: '1台に複数の高画素センサーを載せる流れは、2億画素に強いサムスンに合う',
    },
    {
      sign: '＋', factor: 'ロボット・XR\nと車の安全',
      fact: 'ロボットやXRの「機械の目」として、距離を測るToFや動く物をゆがまず写すセンサー（Vizion）を展開。2023年の車載カメラモジュールは2.36億個、1台あたり約3個（Yole）',
      impact: 'スマホ以外の需要の柱の候補。ただし車載ではOmniVisionやソニーが先行し、実績づくりが課題',
    },
    {
      sign: '−', factor: '技術人材の\n獲得競争',
      fact: 'System LSIの中核技術者の離職が相次ぎ、ExynosとISOCELLの開発に空白が生じる懸念（DIGITIMES、2026年4月）。半導体特別法では研究開発職の週52時間の例外は見送り',
      impact: '画素の開発は経験の蓄積が効く分野。人材の流出は製品の世代交代の遅れにつながる恐れ',
    },
  ],
  '出所：IDC（2026-08-26）、Samsung Electronics（2024-06-27・2023-12-19）、Samsung Semiconductor（2026-01-08）、Yole Group（2025-07-28）、DIGITIMES（2026-04-16）、The Korea Herald（2026-01-29）',
  [
    '社会の視点です。',
    '1つ目は、スマホの高価格化です。IDCによると、2026年のスマホの平均価格は581ドルと、1年で27.6%上がります。安いスマホが店頭から消え、多くの人は端末を長く使うようになります。普及価格帯の比重が高いサムスンには逆風ですが、高性能な上位品には追い風です。',
    '2つ目は、写真や動画、特にズームの画質への期待です。サムスン自身が、主カメラと望遠カメラの差を縮めることが業界の新しい方向だと述べ、望遠用の2億画素センサーを出しています。',
    '3つ目は、ロボットやXR、車の安全です。機械が周りを見るためのセンサーの需要が広がります。ただし車載では、オムニビジョンやソニーが先行しています。',
    '4つ目は逆風で、技術人材の獲得競争です。2026年4月には、System LSIの中核技術者の離職が相次いでいると報じられました。センサーの画素の開発は経験がものを言う分野なので、影響が心配されます。',
  ]);

// =====================================================================
// 14. PEST：技術
// =====================================================================
buildPestDetail(PEST.T, 'PEST分析 ⑤　技術（Technology）', '微細化の限界が近づき、勝負は3D積層と画素の新しい構造へ',
  '技術の進化・新しい用途・代わりになる技術など、技術の変化を見る視点',
  [
    {
      sign: '±', factor: '画素の微細化',
      fact: '0.64µm（HP1、2021年）→0.56µm（HP9、2024年）→0.5µm（HP5）と業界最小を更新。画素が小さいほど届く光が減るため、0.5µmでは新しい材料と構造で感度を補った（サムスン）',
      impact: 'サムスンの得意技。ただし微細化だけで差をつけるのは難しくなっている（本資料の見方）',
    },
    {
      sign: '−', factor: '3D積層への\n競争軸の移動',
      fact: '競争軸は画素の微細化から3D集積へ移りつつある（Yole）。ソニーはiPhone・OPPO向けに3層積層を採用し「重要な節目」と評された。現行のISOCELLは2枚の貼り合わせ（報道）',
      impact: '積層の実績ではソニーが先行。サムスンは3層積層の量産で追い付けるかが焦点',
    },
    {
      sign: '＋', factor: '3層積層と\nハイブリッド接合',
      fact: 'Apple向けのセンサーは、3枚のウエハーをハイブリッド接合で重ねる3層積層と報道。画素の密度を上げ、読み出しの高速化や暗所の画質の改善を狙う（MacRumors・9to5Mac）',
      impact: '量産できれば上位機種の実績になり、他の顧客への展開の足掛かりになる',
    },
    {
      sign: '−', factor: '中国勢と\n新しい画素技術',
      fact: '中国のOmniVision・SmartSens・GalaxyCoreは、ソニーやサムスンと競うハイエンド品を開発（Yole、2024年）。ソニーは1回の露光で100dBを写すLOFIC搭載センサーを2026年夏に量産',
      impact: '上からはソニーの新技術、下からは中国勢の高画素品に挟まれ、2億画素の優位が薄れる恐れ',
    },
  ],
  '出所：Samsung Electronics（2021-09-02・2024-06-27）、Samsung Semiconductor（2026-01-08）、Yole Group（2024-07-03）、EE Times Japan（2026-08-26）、TrendForce（2025-08-07）、MacRumors・9to5Mac（2025-12-24）、SSS「LOFIC搭載センサー」（2026-06-17）',
  [
    '技術の視点です。',
    '1つ目は画素の微細化です。サムスンは、画素の大きさを0.64マイクロメートル、0.56マイクロメートル、0.5マイクロメートルと小さくし、業界最小を更新してきました。ただ、画素が小さいほど届く光が減るため、0.5マイクロメートルでは新しい材料や構造で感度を補う必要がありました。微細化だけで差をつけるのは、だんだん難しくなっています。',
    '2つ目は逆風で、競争の軸が3D積層、つまりチップを重ねる技術に移っていることです。Yoleは、ソニーがiPhoneやOPPO向けに3層積層を採用したことを業界の重要な節目と評価しています。報道によると、今のISOCELLは2枚の貼り合わせです。',
    '3つ目は追い風で、サムスンがApple向けに3層積層のセンサーを作ると報じられていることです。量産で成功すれば、上位機種での実績になります。',
    '4つ目は、中国勢の高画素品と、ソニーのLOFICのような新しい画素の構造です。サムスンは上と下から挟まれる形になっています。',
  ]);

// =====================================================================
// 15. PEST要因の影響度マップ
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ⑥　影響度マップ', '最重要の監視対象は、Apple向けの立ち上げと中国の国産化', [
    'PESTで挙げた要因を、事業への影響の大きさと、先行きの不確実性の2つの軸で並べ直しました。これは出典の事実をもとにした、この資料としての定性的な評価です。',
    '右上は、影響が大きく、しかも先が読みにくい要因で、最も注意して見ておくべきものです。Apple向けの米国生産の立ち上げ、中国のスマホ大手の国産化、米国の関税と米韓合意の行方がここに入ります。',
    '左上は、影響は大きいが方向がある程度見えている要因で、計画に織り込むべきものです。Androidスマホの急減、メモリ優先の社内の資源配分、3D積層への競争軸の移動がここに入ります。',
    '右下の人材の流出、ロボットや車載の需要、中国勢の高画素品は、影響はまだ中くらいですが、兆しを見張る必要があります。',
    '左下の高画質化、市場の付加価値型の成長、韓国の半導体特別法、スマホの高価格化は、方向がはっきりしていて、定期的に確認すればよい要因です。',
  ]);
  const px = 1.2;
  const py = 1.55;
  const pw = 7.55;
  const ph = 4.95;
  slide.addShape(pres.shapes.RECTANGLE, { x: px, y: py, w: pw, h: ph, fill: { color: C.white }, line: { color: C.line, width: 1 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: px + pw / 2, y: py, w: pw / 2, h: ph / 2, fill: { color: SWOT.T.tint }, line: { color: SWOT.T.tint, width: 0.5 } });
  addLine(slide, px + pw / 2, py, px + pw / 2, py + ph, { color: C.line, width: 1, dash: 'dash' });
  addLine(slide, px, py + ph / 2, px + pw, py + ph / 2, { color: C.line, width: 1, dash: 'dash' });
  const corner = [
    ['計画に織り込む', px + 0.1, py + 0.06, 'left'],
    ['最重要の監視対象', px + pw - 3.1, py + 0.06, 'right'],
    ['定期的に確認', px + 0.1, py + ph / 2 + 0.05, 'left'],
    ['兆しを見張る', px + pw - 3.1, py + ph / 2 + 0.05, 'right'],
  ];
  corner.forEach(([text, x, y, align]) => addText(slide, text, x, y, 3.0, 0.28, { fontSize: 10.5, bold: true, color: C.muted, align }));
  addLine(slide, px - 0.3, py + ph, px - 0.3, py + 0.1, { color: C.primary, width: 1.5, arrow: true });
  addText(slide, '事業への影響', px - 0.62, py + 1.6, 0.3, 1.8, { fontSize: 11, bold: true, color: C.primary, align: 'center', valign: 'middle', vert: 'eaVert' });
  addText(slide, '大', px - 0.62, py + 0.25, 0.3, 0.28, { fontSize: 10.5, bold: true, color: C.primary, align: 'center' });
  addText(slide, '小', px - 0.62, py + ph - 0.3, 0.3, 0.28, { fontSize: 10.5, bold: true, color: C.primary, align: 'center' });
  addLine(slide, px, py + ph + 0.25, px + pw - 0.1, py + ph + 0.25, { color: C.primary, width: 1.5, arrow: true });
  addText(slide, '低', px, py + ph + 0.3, 0.3, 0.28, { fontSize: 10.5, bold: true, color: C.primary });
  addText(slide, '先行きの不確実性（右ほど読みにくい）', px + 2.0, py + ph + 0.3, 3.6, 0.28, { fontSize: 11, bold: true, color: C.primary, align: 'center' });
  addText(slide, '高', px + pw - 0.5, py + ph + 0.3, 0.3, 0.28, { fontSize: 10.5, bold: true, color: C.primary, align: 'right' });

  // 要因の枠の中心（インチ）。枠が象限の境目をまたがないよう、左右それぞれ2列・上下3〜4段に置く
  const colLeftA = px + 1.25;
  const colLeftB = px + 2.35;
  const colRightA = px + pw / 2 + 1.23;
  const colRightB = px + pw - 1.2;
  const factors = [
    [PEST.E, '−', 'Androidスマホの急減', colLeftB, 2.12],
    [PEST.E, '−', 'メモリ優先の社内の資源配分', colLeftA, 2.72],
    [PEST.T, '−', '3D積層への競争軸の移動', colLeftB, 3.32],
    [PEST.P, '＋', 'Apple向けの米国生産', colRightA, 2.12],
    [PEST.P, '−', '中国スマホ大手の国産化', colRightB, 2.72],
    [PEST.P, '±', '米国の関税・米韓合意の行方', colRightA, 3.32],
    [PEST.S, '＋', '写真・ズームの高画質化', colLeftB, 4.6],
    [PEST.E, '＋', '市場の付加価値型成長', colLeftA, 5.17],
    [PEST.P, '±', '韓国の半導体特別法', colLeftB, 5.74],
    [PEST.S, '±', 'スマホの高価格化', colLeftA, 6.26],
    [PEST.S, '−', '技術人材の流出', colRightB, 4.6],
    [PEST.S, '＋', 'ロボット・XR・車載の需要', colRightA, 5.17],
    [PEST.T, '−', '中国勢の高画素品・新構造', colRightB, 5.74],
  ];
  const boxW = 2.2;
  const boxH = 0.42;
  factors.forEach(([lens, sign, text, cx, cy]) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx - boxW / 2, y: cy - boxH / 2, w: boxW, h: boxH, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: lens.color, width: 1.5 },
    });
    addSign(slide, sign, cx - boxW / 2 + 0.2, cy, 0.22);
    addText(slide, text, cx - boxW / 2 + 0.36, cy - boxH / 2, boxW - 0.42, boxH, { fontSize: 9.5, valign: 'middle' });
  });

  const rx = 9.15;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 2.95, { fill: SWOT.T.tint });
  addText(slide, '最重要の監視対象（右上）', rx + 0.2, 1.65, rw - 0.4, 0.34, { fontSize: 13, bold: true, color: SWOT.T.color });
  addBullets(slide, [
    lead('Apple向け米国生産：', 'オースティンの量産と歩留まり、iPhone 18での採用範囲'),
    lead('中国の国産化：', '中国スマホ大手の調達先と、中国勢の上位品の広がり'),
    lead('通商：', '232条関税の対象と、米韓合意の運用（IEEPA違憲判決の後）'),
  ], rx + 0.2, 2.05, rw - 0.4, 2.35, { fontSize: 11, space: 6 });
  addText(slide, '枠の色は視点', rx, 4.7, rw, 0.28, { fontSize: 11, bold: true, color: C.muted });
  Object.values(PEST).forEach((lens, i) => {
    const x = rx + (i % 2) * (rw / 2);
    const y = 5.02 + Math.floor(i / 2) * 0.36;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.05, w: 0.32, h: 0.22, rectRadius: 0.05, fill: { color: C.white }, line: { color: lens.color, width: 1.5 } });
    addText(slide, `${lens.ja}（${lens.key}）`, x + 0.4, y, rw / 2 - 0.45, 0.32, { fontSize: 10.5, valign: 'middle' });
  });
  addText(slide, '配置は、出典の事実をもとにした本資料の定性的な評価', rx, 5.85, rw, 0.6, { fontSize: 10, color: C.muted });
  addSource(slide, '出所：PEST分析 ②〜⑤ の各出典。配置は本資料による', { y: 7.05, h: 0.3 });
}

// =====================================================================
// 16. SWOT分析の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ①　全体像', '「業界初」の技術を持ちながら、シェアと社内の優先度で後退している', [
    'ここからSWOT分析です。SWOTは、会社の内側の強み（Strengths）と弱み（Weaknesses）、外側の機会（Opportunities）と脅威（Threats）を、4つのマスに整理する方法です。',
    '強みは、2億画素や超微細画素で業界初を重ねてきた技術、自社のGalaxyという需要、メモリと工程が近い自社工場、米国の工場、そして全社の資金力です。',
    '弱みは、シェアの低下、上位機種や車載での劣位、社内でメモリが優先されること、技術者の離職、外部の顧客が中国などのAndroidに偏っていることです。',
    '機会は、AppleのiPhone向けの供給、米国の製造回帰、2億画素の広がり、スマホ以外の需要、市場の付加価値型の成長です。',
    '脅威は、中国勢の台頭、Androidスマホの急減、ソニーの技術の先行、メモリ逼迫の波及、通商政策の揺れです。',
    '次のページから、それぞれの根拠を詳しく見ていきます。',
  ]);
  const colW = (CONTENT_W - 0.6 - 0.15) / 2;
  const x1 = MARGIN_X + 0.6;
  const x2 = x1 + colW + 0.15;
  addText(slide, 'プラス要因（活かす）', x1, 1.48, colW, 0.3, { fontSize: 12, bold: true, color: C.muted, align: 'center' });
  addText(slide, 'マイナス要因（備える）', x2, 1.48, colW, 0.3, { fontSize: 12, bold: true, color: C.muted, align: 'center' });
  const qh = 2.42;
  const rowsY = [1.85, 1.85 + qh + 0.12];
  ['内部環境', '外部環境'].forEach((label, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: MARGIN_X, y: rowsY[i], w: 0.46, h: qh, rectRadius: 0.06, fill: { color: C.primary }, line: { color: C.primary, width: 0.5 },
    });
    addText(slide, label, MARGIN_X, rowsY[i], 0.46, qh, { fontSize: 12.5, bold: true, color: C.white, align: 'center', valign: 'middle', vert: 'eaVert' });
  });
  const quadrants = [
    [SWOT.S, x1, rowsY[0], [
      '2億画素・超微細画素で「業界初」を重ねる技術',
      '自社Galaxyの需要（S26 Ultraは5個中4個）',
      'メモリと工程が近い自社工場と量産の知見',
      '米国（オースティン）に工場を持つ',
      '全社の資金力（4〜6月の営業利益89.5兆ウォン）',
    ]],
    [SWOT.W, x2, rowsY[0], [
      'シェアは22%（2020〜21年）から13%台へ',
      '上位機種・車載で劣位（モバイルはソニー57%）',
      '社内ではメモリが優先（能力をHBMへ）',
      '中核技術者の離職（2026年の報道）',
      '外部の顧客が中国などのAndroidに偏る',
    ]],
    [SWOT.O, x1, rowsY[1], [
      'iPhone向け供給（2027年までに20〜30%の推計）',
      '米国の製造回帰と、米国製の部品への需要',
      '2億画素の普及価格帯・望遠への広がり',
      'ロボット・XR・車載などスマホ以外の需要',
      '付加価値型の市場成長（2031年に303億ドル）',
    ]],
    [SWOT.T, x2, rowsY[1], [
      '中国勢の台頭（OmniVisionが2位に）',
      'Androidスマホの急減（2026年 −24.3%）',
      'ソニーの技術先行（3層積層・LOFIC・合弁）',
      'メモリ逼迫による部品コスト高と供給リスク',
      '通商政策の揺れ（関税・合意の前提）',
    ]],
  ];
  quadrants.forEach(([lens, x, y, items]) => {
    addCard(slide, x, y, colW, qh, { fill: lens.tint });
    addLensHeader(slide, lens, x + 0.2, y + 0.13, { size: 0.42 });
    addBullets(slide, items, x + 0.3, y + 0.68, colW - 0.5, qh - 0.75, { fontSize: 12, space: 5, color: C.ink });
  });
  addSource(slide, '出所：SWOT分析 ②〜⑤ の各出典。分類は本資料による');
}

// =====================================================================
// 17. 強み
// =====================================================================
buildSwotDetail(SWOT.S, 'SWOT分析 ②　強み（Strengths）', '「業界初」の技術、自社の需要、製造力と米国拠点がそろう',
  [
    { value: '0.5µm', label: '2億画素センサーで業界最小の画素（HP5、CES 2026 イノベーションアワード受賞）' },
    { value: '5個中4個', label: 'Galaxy S26 Ultraのカメラのうち、自社のISOCELLの数（残る1個はソニー製）', size: 28 },
    { value: '89.5兆ウォン', label: '全社の営業利益（2026年4〜6月、過去最高）。投資の原資は厚い', size: 24 },
  ],
  [
    { head: '高画素・超微細画素の技術', body: '業界初の2億画素（HP1、2021年）、業界初の望遠用2億画素（HP9、2024年）、0.5µm画素（HP5）。16画素を束ねるTetra²pixelで暗い場面にも強い' },
    { head: '自社Galaxyという需要', body: 'S26 Ultraでは主カメラ・超広角・3倍望遠・前面がISOCELL。IDCは、サムスンのスマホがAndroidの落ち込みに逆らって2026年にシェアを伸ばすと予測' },
    { head: 'メモリ由来の製造力', body: 'メモリの設計・製造の知見を生かして事業を伸ばした（THE ELEC）。2018年にはDRAMのラインの一部をセンサー用に転換するなど、生産能力を柔軟に動かせる' },
    { head: '米国の拠点', body: '1996年から米国で半導体を製造し、テキサス州オースティンに工場を持つ。Apple向けのセンサーのラインを準備中（報道）で、米国の製造回帰の流れに乗りやすい' },
    { head: '資金力と部門横断の技術', body: '全社の営業利益は過去最高。半導体部門にはメモリ・ファウンドリー・後工程の技術があり、3層積層などの新しい構造に生かせる可能性がある' },
  ],
  '出所：Samsung Electronics（2021-09-02・2024-06-27・2026-07-30）、Samsung Semiconductor（2026-01-08）、GSMArena（2026-03-06）、IDC（2026-05-26）、THE ELEC（2021-08-13）、Edaily（2018-04-26）、NIST CHIPS、MacRumors（2025-12-24）',
  [
    '強みを5つに整理しました。',
    '1つ目は技術です。業界で初めての2億画素センサー、初めての望遠用の2億画素センサー、そして0.5マイクロメートルという業界最小の画素と、画素を小さくして数を増やす技術で先頭を走ってきました。',
    '2つ目は、自社のGalaxyという需要です。最上位機のS26 Ultraでは、5つのカメラのうち4つがISOCELLです。また、IDCはAndroid全体が落ち込む中でも、サムスンのスマホはシェアを伸ばすと予測しています。',
    '3つ目はメモリ由来の製造力です。サムスンはメモリで培った設計と製造の知見を生かしてセンサー事業を伸ばしてきました。DRAMのラインをセンサー用に転換した例もあります。',
    '4つ目は米国の拠点です。サムスンは1996年から米国で半導体を作っており、オースティン工場でApple向けのラインを準備していると報じられています。',
    '5つ目は資金力です。全社の営業利益は過去最高で、半導体部門にはメモリやファウンドリー、後工程の技術もあります。これを新しい構造のセンサーに生かせる可能性があります。ただし最後の点は、この資料としての見方です。',
  ]);

// =====================================================================
// 18. 弱み
// =====================================================================
buildSwotDetail(SWOT.W, 'SWOT分析 ③　弱み（Weaknesses）', 'シェアの低下と、社内での優先度の低さが続く',
  [
    { value: '22%→13.2%', label: 'シェアのピーク（2020〜21年、Yole）から2025年（日経業界地図）へ。調査の違いに注意', size: 24 },
    { value: '57%', label: 'モバイル向けでのソニーのシェア（2025年、Yole）。上位機種ではソニーが優位' },
    { value: '99.7%', label: '全社の営業利益に占める半導体部門の比率（2026年4〜6月、本資料で計算）。稼ぎ頭はメモリ' },
  ],
  [
    { head: 'シェアの低下と売上の停滞', body: 'シェアは2020〜21年の22%から、2022〜23年は19%（Yole）。2025年は売上がおおむね横ばいで（Yole）、日経業界地図では13.2%の3位。スマホ用センサーの出荷台数（2024年）でも中国勢2社に次ぐ' },
    { head: '上位機種での劣位', body: 'モバイル向けはソニーが57%で大きく引き離す（Yole）。自社の最上位機S26 Ultraでも5倍望遠はソニー製で、主カメラのHP2は2023年のS23 Ultraから据え置き' },
    { head: '社内での優先度', body: 'センサーの生産能力をメモリ（特にHBM）へ振り向けた（Yole、2024年）。メモリが全社の利益のほぼすべてを稼ぐ中、センサーの業績は開示もされていない' },
    { head: '人材の流出', body: 'System LSIの中核技術者の離職が続き、ExynosとISOCELLの開発に空白が生じる懸念（DIGITIMES、2026年4月）。画素開発は経験の蓄積が効く分野' },
    { head: '顧客層の偏りと車載の出遅れ', body: '外部の顧客はXiaomi・vivo・Motorolaなど中国を中心としたAndroid（報道）。普及価格帯を伸ばす方針は、市場が最も縮む価格帯と重なる。車載への参入は2021年' },
  ],
  '出所：THE ELEC（2021-08-13）、EE Times Japan（2023-07-27・2024-07-04・2025-05-28）、Yole Group（2024-07-03・2026-08-03）、日経業界地図2027年版、GSMArena（2026-03-06）、Samsung Electronics（2021-07-13・2026-07-30）、DIGITIMES（2026-04-16）、TrendForce（2025-08-07）',
  [
    '弱みです。',
    '1つ目はシェアの低下です。Yoleの調査では、2020年と2021年の22%がピークで、その後は19%に下がりました。2025年は売上がおおむね横ばいで、日経業界地図では13.2%の3位です。ただし、調査会社によって定義が違うので、数字の単純な比較には注意が必要です。スマホ用センサーの出荷台数でも、2024年は中国のギャラクシーコアとオムニビジョンがソニーに次ぐ2位と3位でした。',
    '2つ目は上位機種での劣位です。スマホなどモバイル向けではソニーが57%を占めます。自社の最上位機でさえ、5倍の望遠カメラにはソニー製を使い、主カメラのセンサーは2023年から変わっていません。',
    '3つ目は社内での優先度です。メモリが全社の利益のほぼすべてを稼ぐ中で、センサーの生産能力がメモリに振り向けられたと指摘されています。',
    '4つ目は人材の流出、5つ目は顧客層の偏りと車載の出遅れです。サムスンが力を入れる普及価格帯は、メモリ高騰で最も縮む価格帯でもあります。',
  ]);

// =====================================================================
// 19. 機会
// =====================================================================
buildSwotDetail(SWOT.O, 'SWOT分析 ④　機会（Opportunities）', 'iPhone向けと米国の製造回帰が、上位市場への入り口になる',
  [],
  [
    { head: 'AppleのiPhone向け供給', body: 'Appleがサムスンのオースティン工場で新技術のチップ製造を発表（2025年8月）。iPhone 18向けの3層積層センサーとの報道。2027年までにiPhone向け数量の20〜30%、年10億〜15億ドルとの推計' },
    { head: '米国の製造回帰', body: '関税政策と製造回帰で「米国での製造」の重みが増した（EE Times Japan）。Appleの判断は、米国での部品調達と調達先の多様化の方針に沿う（Business Koreaの報道）' },
    { head: '2億画素の広がり', body: '2026年下期に2億画素センサーの顧客と製品群を広げる計画。望遠用のHP9・HP5で、主カメラ以外にも2億画素が載る流れ' },
    { head: 'スマホ以外の需要', body: 'ロボット・XR向けのVizion、車載のAuto（電子ミラーや自動運転へ広げる計画）。車載カメラは2023年に2.36億個、1台あたり約3個（Yole）' },
    { head: '付加価値型の市場成長', body: '市場は2025年の253億ドルから2031年に303億ドルへ（Yole）。単価の高い製品に移るほど、高画素・積層の技術が生きる' },
  ],
  '出所：Apple（2025-08-06）、MacRumors（2025-12-24）、Sammy Fans（2026-01-11、SemiAnalysisの推計を紹介）、EE Times Japan（2026-01-15・2023-07-27・2024-07-04・2026-08-26）、TrendForce（2025-08-07）、Samsung Electronics（2026-04-30・2021-07-13・2023-12-19）、Yole Group（2025-07-28）',
  [
    '機会です。左のグラフは、Yoleが発表してきたイメージセンサー市場の規模です。2022年の約213億ドルから、2025年は253億ドルと過去最高になり、2031年には303億ドルに達する見通しです。',
    '1つ目の機会は、AppleのiPhone向けの供給です。Appleはサムスンの米国工場での新しいチップ製造を発表し、iPhone 18向けのセンサーではないかと報じられています。アナリストの推計では、2027年までにiPhone向けの20〜30%をサムスンが取る可能性があります。これは報道と推計で、確定した事実ではない点に注意してください。',
    '2つ目は米国の製造回帰です。関税などを背景に、米国で作ることの価値が上がっています。',
    '3つ目は2億画素の広がりです。サムスンは2026年の下期に、2億画素センサーの顧客と製品群を広げる計画です。',
    '4つ目はスマホ以外の需要、5つ目は市場の付加価値型の成長です。',
  ],
  {
    leftPanel: (slide, x, y, w, h) => {
      addCard(slide, x, y, w, h, { fill: SWOT.O.tint });
      addText(slide, 'イメージセンサー市場の\n規模（億ドル、Yole）', x + 0.18, y + 0.12, w - 0.36, 0.55, { fontSize: 12, bold: true, color: SWOT.O.color });
      const cats = ['2022年', '2023年', '2024年', '2025年', '2031年予測'];
      const sizes = [212.9, 217.9, 232, 253, 303];
      slide.addChart(pres.charts.BAR, [{ name: '市場規模', labels: cats, values: sizes }], {
        x: x + 0.1, y: y + 0.7, w: w - 0.2, h: 3.35, barDir: 'col', barGapWidthPct: 50,
        chartColors: [SWOT.O.color, SWOT.O.color, SWOT.O.color, SWOT.O.color, '9DB6E0'],
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '#,##0', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
        catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9.5, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
        valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 350, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
        showLegend: false,
      });
      addText(slide, '各年のYoleの発表から（2022年は212.9億、2023年は217.9億ドル）。2031年は予測', x + 0.18, y + 4.15, w - 0.36, 0.7, { fontSize: 9.5, color: C.muted });
    },
  });

// =====================================================================
// 20. 脅威
// =====================================================================
buildSwotDetail(SWOT.T, 'SWOT分析 ⑤　脅威（Threats）', '中国勢の台頭とAndroidの縮小に、ソニーの技術先行が重なる',
  [
    { value: '13.4%', label: 'OmniVisionの世界シェア（2025年、日経業界地図）。サムスン（13.2%）を上回った' },
    { value: '+105.7%', label: '中国SmartSensの売上の伸び（2024年、Yole）', size: 28 },
    { value: '−24.3%', label: '2026年のAndroidスマホの出荷予測（IDC、2026年8月）', size: 28 },
  ],
  [
    { head: '中国勢の台頭', body: 'OmniVision・SmartSens・GalaxyCore・Gpixelが伸び、中国勢は地域別で韓国勢を抜いた（Yole）。OmniVisionは車載で首位。中国のスマホ大手は自国のセンサーへ' },
    { head: 'Androidスマホの急減', body: '2026年はAndroidが−24.3%、100ドル未満の機種は存続の危機（IDC）。中国のスマホ需要の弱さは、2026年4〜6月期のSystem LSIの業績にも表れた' },
    { head: 'ソニーの技術先行と投資', body: '3層積層の採用（Yole）、LOFIC搭載センサーの量産（2026年夏）、TSMCとの合弁（2029年量産予定）。上位機種での差がさらに広がる恐れ' },
    { head: 'メモリ逼迫の波及', body: 'AI向けの需要でメモリの供給が逼迫し、センサーのウエハーの割り当てや積層構造、カメラモジュールの計画に影響し得る（Yole）。スマホメーカーの部品コストも上がる' },
    { head: '通商と調達の不確実性', body: 'IEEPA違憲判決で各国との合意の前提が揺らぎ、次の関税は不透明（Skadden）。iPhoneでの比率は性能・効率・価格で見直されるとの報道も（流出データが情報源）' },
  ],
  '出所：日経業界地図2027年版、Yole Group（2024-07-03・2025-07-28・2026-08-03）、EE Times Japan（2026-08-26）、IDC（2026-08-26）、Samsung Electronics（2026-07-30）、SSS（2026-06-17・08-11）、Skadden（2026-02-24）、Sammy Fans（2026-07-03）',
  [
    '脅威です。',
    '1つ目は中国勢の台頭です。オムニビジョン、スマートセンス、ギャラクシーコアなどが伸び、中国勢は地域別のシェアで韓国勢を抜きました。オムニビジョンは車載で首位です。さらに中国のスマホ大手は、自国のセンサーを選ぶ傾向を強めています。',
    '2つ目はAndroidスマホの急減です。2026年はAndroidが24.3%減る見通しで、安い機種ほど厳しくなります。サムスンの4〜6月期の決算でも、中国のスマホ需要の弱さが挙げられています。',
    '3つ目は、首位ソニーの技術の先行と投資です。3層積層、1回の撮影で明暗差の大きい場面を写せるLOFIC、TSMCとの合弁と、次々に手を打っています。',
    '4つ目はメモリ逼迫の波及です。メモリが足りなくなると、センサーの製造やカメラの計画にも影響が出る可能性があります。',
    '5つ目は通商と調達の不確実性です。iPhoneでのサムスン製の比率は、性能や価格で見直されるという報道もあります。ただしこの報道の情報源は流出データで、信頼性ははっきりしません。',
  ]);

// =====================================================================
// 21. クロスSWOT
// =====================================================================
{
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ⑥　クロスSWOT', '攻めは「Apple実績の横展開」、守りは「普及価格帯の選別」', [
    'クロスSWOTは、強み・弱みと、機会・脅威を掛け合わせて、打ち手の方向を考える方法です。ここに挙げた打ち手は、サムスンが公表している計画や報道も含めて、この資料として整理したものです。',
    '左上の「強み×機会」は攻めの打ち手です。Apple向けに3層積層のセンサーを量産で立ち上げ、その実績を他の上位機種の顧客にも広げること、2億画素を望遠や普及価格帯に広げること、米国の工場を生かすことです。',
    '右上の「弱み×機会」は、機会を使って弱みを補う打ち手です。Apple向けの実績で上位機種での劣位を埋め、ロボットや車載を育ててAndroidへの偏りを下げます。Appleという大口の外部顧客は、社内でセンサーへの投資を説得する材料にもなります。',
    '左下の「強み×脅威」は守りの打ち手です。Galaxyと組んで自社機のカメラの世代交代を主導し、技術の先行で中国勢との価格競争を避けます。',
    '右下の「弱み×脅威」は、最悪の組み合わせを避ける打ち手です。縮む普及価格帯では採算で製品と顧客を選び、技術者の流出を止め、メモリの好況の中でもセンサーの生産能力を確保することです。',
  ]);
  const cornerW = 1.3;
  const cellW = (CONTENT_W - cornerW - 0.24) / 2;
  const headH = 0.5;
  const cellH = 2.3;
  const xS = MARGIN_X + cornerW + 0.12;
  const xW = xS + cellW + 0.12;
  const yO = 1.5 + headH + 0.1;
  const yT = yO + cellH + 0.12;
  addChip(slide, '強み（S）を活かす', xS, 1.5, cellW, headH, { fill: SWOT.S.color, fontSize: 13 });
  addChip(slide, '弱み（W）を補う', xW, 1.5, cellW, headH, { fill: SWOT.W.color, fontSize: 13 });
  addChip(slide, '機会（O）', MARGIN_X, yO, cornerW, cellH, { fill: SWOT.O.color, fontSize: 13 });
  addChip(slide, '脅威（T）', MARGIN_X, yT, cornerW, cellH, { fill: SWOT.T.color, fontSize: 13 });
  const cells = [
    // 2行になる項目は、意味の切れ目で改行する（softBreakBefore は段落内の改行）
    [xS, yO, 'SO：攻め', SWOT.O, [
      ['Apple向けに3層積層の量産を立ち上げ、', { text: 'その実績を他の上位機種の顧客へ広げる', softBreakBefore: true }],
      ['2億画素を望遠・普及価格帯へ広げ、', { text: '1台あたりの搭載数を増やす', softBreakBefore: true }],
      ['米国の工場を生かし、', { text: '米国での調達を重視する顧客を開拓する', softBreakBefore: true }],
    ]],
    [xW, yO, 'WO：転換', SWOT.O, [
      ['Apple向けの実績で、', { text: '上位機種での劣位を埋める', softBreakBefore: true }],
      ['ロボット・XR・車載を育て、', { text: 'Androidスマホへの偏りを下げる', softBreakBefore: true }],
      ['Appleという大口の外部顧客を足場に、', { text: '社内でセンサー投資の説得力を高める', softBreakBefore: true }],
    ]],
    [xS, yT, 'ST：守り', SWOT.T, [
      ['Galaxyと組み、', { text: '自社機のカメラの世代交代を主導する', softBreakBefore: true }],
      ['2億画素・超微細画素の先行で、', { text: '中国勢との価格競争を避ける', softBreakBefore: true }],
      ['メモリ部門の資金と技術を、', { text: '3D積層などの新しい構造に振り向ける', softBreakBefore: true }],
    ]],
    [xW, yT, 'WT：回避', SWOT.T, [
      ['縮む普及価格帯では、', { text: '採算を見て製品と顧客を選ぶ', softBreakBefore: true }],
      ['処遇と開発体制を見直し、', { text: '技術者の流出を止める', softBreakBefore: true }],
      ['メモリの好況の中でも、', { text: 'センサーの生産能力と投資枠を確保する', softBreakBefore: true }],
    ]],
  ];
  cells.forEach(([x, y, head, lens, items]) => {
    addCard(slide, x, y, cellW, cellH, { fill: C.gray, line: C.grid, lineWidth: 0.75 });
    addText(slide, head, x + 0.2, y + 0.1, cellW - 0.4, 0.34, { fontSize: 13, bold: true, color: lens.color });
    addBullets(slide, items, x + 0.25, y + 0.52, cellW - 0.45, cellH - 0.6, { fontSize: 11.5, space: 6 });
  });
  addSource(slide, '出所：SWOT分析 ②〜⑤ の各出典、サムスンの公表計画（2億画素の顧客拡大など）と報道（Apple向けの米国生産）。組み合わせと打ち手の整理は本資料による');
}

// =====================================================================
// 22. サムスンの打ち手の評価
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ①　サムスンの打ち手の評価', '方向は合っているが、最大の賭けはApple向けの量産立ち上げ', [
    'サムスンが公表している計画や、報じられている動きを、クロスSWOTのどこに当たるかと合わせて評価しました。',
    '最も大きいのは、Apple向けの3層積層センサーの米国生産です。成功すれば、上位機種での実績と米国の製造回帰への対応を同時に得られます。一方で、量産の歩留まり、iPhoneでどこまで使われるか、後工程をどこで行うかが論点です。ここは報道に基づく部分で、サムスンもAppleも製品名を公表していません。',
    '2億画素の顧客拡大と超微細画素は、サムスンの強みに合った打ち手です。ただし普及価格帯は市場が最も縮む価格帯で、中国勢と競う領域でもあります。',
    'スマホ以外への展開は製品がそろってきましたが、車載ではオムニビジョンやソニーが先行しています。',
    'メモリ優先の資源配分は、全社としては合理的です。ただ、センサーのシェア低下や人材の流出の遠因になっている可能性があります。',
    '表の右端の評価と論点は、この資料としての見方です。',
  ]);
  const rows = tableRows(['公表・報道された施策', 'ねらい', '関係', '評価と論点（本資料の見方）'], [
    [[{ text: 'Apple向け3層積層センサーの米国生産', options: { breakLine: true } }, { text: '（オースティン、報道）' }], '上位機種での実績づくりと、米国の製造回帰への対応', 'SO・WO',
      [{ text: '最大の賭け。量産の歩留まり、iPhoneでの採用範囲、', options: { breakLine: true } }, { text: '後工程の場所（韓国の可能性）が論点。', options: { breakLine: true } }, { text: '比率は性能・価格で見直されるとの報道も' }]],
    ['2億画素の顧客と製品群の拡大（2026年下期の計画）', '普及価格帯・望遠への展開と、1台あたりの搭載数の増加', 'SO', '技術の強みに合う。ただし普及価格帯は市場が最も縮み、中国勢と競う価格帯。採算の見極めが要る'],
    ['超微細画素の開発（HP5、0.5µm）', '同じ大きさでより多い画素数と、薄いカメラ', 'SO・ST',
      [{ text: '業界最小を更新。ただし微細化だけでは差がつきにくく、', options: { breakLine: true } }, { text: '積層などとの組み合わせが鍵' }]],
    ['スマホ以外への展開（車載のAuto、ロボット・XRのVizion）', 'スマホ依存の低減', 'WO', '製品はそろえたが、車載はOmniVision・ソニーが先行。採用実績と顧客の開拓はこれから'],
    ['メモリ優先の資源配分（能力をHBMへ）', '全社の利益の最大化', 'W', '全社としては合理的。ただしシェア低下や人材流出の遠因になり得る'],
    ['System LSIの立て直し（次世代の最上位機向けSoCを受注、上半期は過去最高の売上）', '事業部全体の収益改善', 'W', 'SoCの受注は明るい材料。センサーは「競争力を強める」との方針にとどまり、具体策は見えにくい'],
  ], { fontSize: 10 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.5, 2.7, 0.8, CONTENT_W - 7.0], { fontSize: 10, rowH: [0.36, 0.86, 0.72, 0.6, 0.72, 0.72, 0.86] });
  addSource(slide, '出所：Apple（2025-08-06）、MacRumors（2025-12-24）、DIGITIMES（2025-08-11・2026-04-16）、Sammy Fans（2026-07-03）、Samsung Electronics 決算（2026-04-30・07-30）・製品発表、Samsung Semiconductor（2026-01-08）、Yole Group（2024-07-03・2026-08-03）。評価は本資料による');
}

// =====================================================================
// 23. 今後の注目点
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ②　今後の注目点', 'これから1〜2年で見るべき7つの指標', [
    '今後の注目点を、見るべき指標や出来事と、時期の目安で整理しました。',
    '最も重要なのは、Apple向けの立ち上げです。iPhone 18シリーズで、サムスン製のセンサーがどの機種・どのカメラに使われるかは、分解調査などで確かめられるはずです。',
    '次に、シェアと2位争いです。Yoleは例年7月から8月に調査結果を発表しているので、2026年のシェアは2027年夏ごろに分かると見込まれます。これは例年の傾向からの推定です。',
    '3つ目はスマホ市況とメモリ価格、4つ目は社内の資源配分と人材です。サムスンは例年、年末に組織と人事を見直すので、センサーの体制がどうなるかに注目です。これも例年からの推定です。',
    '5つ目以降は、2億画素の広がり、中国勢の動き、米国の通商政策です。',
    'これらの結果によって、この資料のSWOTの評価も変わるので、定期的に見直すことをおすすめします。',
  ]);
  const rows = tableRows(['注目点', '見るべき指標・出来事', '時期の目安', '関係'], [
    ['① Apple向けの立ち上げ', 'iPhone 18シリーズでのサムスン製センサーの採用（分解調査）、オースティンの量産', '2026年秋〜2027年春', 'O'],
    ['② シェアと2位争い', 'Yoleの次の調査、日経業界地図・TSRの順位、サムスンの売上の伸び', '2027年夏ごろ（例年からの推定）', 'W・T'],
    ['③ スマホ市況とメモリ価格', 'IDCなどの出荷予測、Androidの落ち込み、Galaxyの販売と部品コスト', '2026年10月〜2027年', 'T'],
    ['④ 社内の資源配分と人材', 'センサーへの投資と生産能力、System LSIの組織と人事', '年末の組織改編（例年からの推定）', 'W'],
    ['⑤ 2億画素の広がり', '普及価格帯・望遠での採用機種数、HP5など新製品の搭載', '2026年下期〜', 'O'],
    ['⑥ 中国勢の動き', 'OmniVision・SmartSensの上位品、中国スマホ大手の調達', '随時', 'T'],
    ['⑦ 米国の通商政策', '232条関税の対象拡大、米韓合意の運用（IEEPA違憲判決の後）', '随時', 'T・O'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [2.8, 5.6, 2.83, CONTENT_W - 11.23], { fontSize: 11, rowH: 0.62 });
  addSource(slide, '出所：これまでのスライドの各出典。時期の目安のうち「推定」とあるものは本資料による');
}

// =====================================================================
// 24. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  drawBayer(slide, 0.8, 0.85, 0.3);
  addText(slide, 'まとめ', 1.25, 0.78, 6.0, 0.45, { fontSize: 16, bold: true, color: C.primaryLight, valign: 'middle' });
  addText(slide, '「業界初」の技術を、上位市場の実績に変えられるか', 0.8, 1.35, 11.7, 0.7, { fontSize: 26, bold: true, color: C.white, valign: 'middle' });
  const messages = [
    ['現在地', '2億画素・超微細画素で業界初を重ね、自社のGalaxyという需要も持つ。一方でシェアは2020〜21年の22%から下がり、2025年は2位争いに（Yole：2位、日経業界地図・TSR：3位）'],
    ['転換点', '2026〜2027年は、Androidスマホの急減と中国の国産化という逆風と、iPhone向け供給（報道）という追い風が同時に来る。社内ではメモリの好況が資源を引き寄せる'],
    ['巻き返しの条件', 'Apple向けの3層積層を量産で立ち上げて上位機種の実績を作り、2億画素の強みを新しい用途に広げられるか。メモリの好況の中でも、センサーへの投資と人材を守れるかが鍵'],
  ];
  messages.forEach(([head, body], i) => {
    const y = 2.35 + i * 1.3;
    addCard(slide, 0.8, y, 11.73, 1.12, { fill: C.nightCard, line: C.nightLine, lineWidth: 1 });
    addCircle(slide, 1.3, y + 0.56, 0.5, [C.R, C.G, C.B][i], String(i + 1), { fontSize: 16 });
    addText(slide, head, 1.75, y + 0.1, 2.3, 0.92, { fontSize: 16, bold: true, color: C.white, valign: 'middle' });
    addText(slide, body, 4.1, y + 0.1, 8.25, 0.92, { fontSize: 13, color: C.onDarkSub, valign: 'middle' });
  });
  addText(slide, '公開情報に基づく整理であり、将来の業績や株価を保証・予想するものではありません。', 0.8, 6.45, 11.7, 0.35, { fontSize: 11, color: C.primaryLight });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.primaryLight, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '1つ目、サムスンのイメージセンサー事業は、2億画素や超微細画素で業界初を重ねてきた技術と、自社のGalaxyという需要を持っています。しかしシェアは2020年から2021年の22%をピークに下がり、2025年は調査によって2位とも3位ともされる、2位争いの状況です。',
    '2つ目、2026年から2027年は、Androidスマホの急減と中国のスマホ大手の国産化という逆風と、AppleのiPhone向けの供給という追い風が同時に来る転換点です。iPhone向けは報道と推計の段階で、確定した事実ではありません。また社内では、メモリの好況が設備や人材を引き寄せています。',
    '3つ目、巻き返しの条件は、Apple向けの3層積層センサーを量産で立ち上げて上位機種の実績を作り、2億画素の強みを新しい用途に広げられるかです。そのためには、メモリの好況の中でも、センサーへの投資と人材を守れるかが鍵になると考えます。',
    'この資料は公開情報に基づく整理であり、将来の業績や株価を予想するものではありません。',
  ].join('\n'));
}

// =====================================================================
// 25. 用語集
// =====================================================================
{
  const slide = newContentSlide(null, '付録 ①　用語集', 'この資料に出てくる主な用語', [
    'この資料に出てくる専門用語の意味をまとめました。',
    '特に、2億画素、Tetra²pixel、3層積層の3つは、サムスンのイメージセンサーの戦略を理解するうえで重要な言葉です。',
    '2億画素のセンサーは細部まで写せる一方で、1つ1つの画素が小さくなります。そこで暗い場面では、同じ色の16個の画素をまとめて1つの大きな画素として使うのが、Tetra²pixelです。',
    '3層積層は、画素や回路を作った3枚のウエハーを重ねて貼り合わせる構造で、Apple向けのセンサーに使われると報じられています。',
  ]);
  const rows = tableRows(['用語', '意味'], [
    ['CMOSイメージセンサー（CIS）', '光を電気信号に変える半導体。スマホやカメラ、車の「目」にあたる'],
    ['ISOCELL（アイソセル）', 'サムスンのイメージセンサーのブランド名'],
    ['DS部門 / System LSI / MX', 'サムスン電子の半導体部門 ／ その中でSoCやイメージセンサーを手がける事業部 ／ スマホ（Galaxy）の事業'],
    ['画素とµm', 'センサーの光を受ける1つ1つの点。µm（マイクロメートル）は1mmの1000分の1'],
    ['2億画素（200MP）', '2億個の画素をもつセンサー。細部まで写せ、切り出してズームにも使える'],
    ['Tetra²pixel', '同じ色の画素を4×4＝16個まとめ、暗い場面では1つの大きな画素として使う技術'],
    ['積層型 / 3層積層', '画素と回路を別々のウエハーで作って貼り合わせる構造 ／ 3枚を重ねる構造'],
    ['ハイブリッド接合', 'ウエハー同士を、配線の銅と絶縁膜の両方で直接つなぐ貼り合わせの技術'],
    ['HBM', 'AI向けの高速なメモリ。DRAMのチップを積み重ねて作る'],
    ['ToF / グローバルシャッター', '光の往復時間で距離を測る技術 ／ 全画素を同時に露光し、動く物をゆがまずに写す方式'],
    ['LOFIC', '画素にためきれない電荷を横の容量にためる構造。明暗差の大きい場面を1回の撮影で写せる'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.6, CONTENT_W - 3.6], { fontSize: 11, rowH: 0.42 });
  addSource(slide, '出所：Samsung Electronics（2021-09-02・2023-12-19・2024-06-27）、Samsung Semiconductor（2026-01-08）、9to5Mac（2025-12-24）、SSS「LOFIC搭載センサー」（2026-06-17）の説明をもとに本資料で平易に言い換えた');
}

// =====================================================================
// 26〜27. 参考文献
// =====================================================================
// 参考文献は references.json が正本（Zotero の登録一覧・参考文献リンク.md も同じファイルから作る）
const REFERENCES = require(path.join(BASE_DIR, 'references.json')).references
  .filter((ref) => ref.inDeck)
  .map((ref) => [ref.publisher, ref.title, ref.dateLabel, ref.url]);

// リンクは英字のドメイン名に付ける（和文にリンクを付けると、LibreOffice の確認画像で別の字体に置き換わるため）
function linkLabel(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function addReferenceColumn(slide, refs, startNo, x, y, w, h) {
  const runs = [];
  refs.forEach(([publisher, title, date, url], i) => {
    const no = startNo + i;
    const last = i === refs.length - 1;
    // ドメイン名は見出しの直後に置き、行末で途中改行されないようにする
    runs.push({ text: `[${no}] ${publisher}（${date}） `, options: { bold: true, color: C.ink, paraSpaceAfter: 5 } });
    runs.push({ text: linkLabel(url), options: { color: C.link, hyperlink: { url } } });
    runs.push({ text: `　${title}`, options: { color: C.ink, breakLine: !last } });
  });
  slide.addText(runs, {
    x, y, w, h,
    fontFace: FONT, fontSize: 9.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP',
  });
}

function buildReferenceSlide(no, refs, startNo, notes) {
  const slide = newContentSlide(null, `付録 ${no}　参考文献`, `参考文献（${startNo}〜${startNo + refs.length - 1}）`, notes);
  const half = Math.ceil(refs.length / 2);
  const colW = (CONTENT_W - 0.35) / 2;
  addReferenceColumn(slide, refs.slice(0, half), startNo, MARGIN_X, 1.5, colW, 5.4);
  addReferenceColumn(slide, refs.slice(half), startNo + half, MARGIN_X + colW + 0.35, 1.5, colW, 5.4);
  addSource(slide, '青字のドメイン名をクリックすると出典のページが開く（確認日 2026-09-28）。取得状況と保存先は生成元フォルダの「参考文献リンク.md」にまとめた', { y: 7.02, h: 0.3 });
  return slide;
}

const REF_SPLIT = 21;
buildReferenceSlide('②', REFERENCES.slice(0, REF_SPLIT), 1, [
  '参考文献の前半です。サムスン電子の決算発表と製品発表、Yole Groupなどの調査会社によるシェアの調査、韓国の報道です。',
  'シェアは調査会社ごとに定義が違うので、この資料では出典を分けて示しています。',
  '各項目の末尾にある青字のドメイン名をクリックすると、出典のページが開きます。',
  '取得状況と保存したファイルは、生成元フォルダの「参考文献リンク.md」にまとめています。',
]);
buildReferenceSlide('③', REFERENCES.slice(REF_SPLIT), REF_SPLIT + 1, [
  '参考文献の後半です。韓国の報道の続き、スマホ市場の予測、AppleとSamsungに関する発表と報道、通商・産業政策、競合のソニーの発表です。',
  'AppleのSamsung製センサー採用は、Appleの公式発表では「新しいチップ製造技術」とだけ書かれており、イメージセンサーであるという点は報道とアナリストの推計です。',
  '米国商務省の発表はスクリプトからの取得が拒否されたため、同じ内容をまとめた米国立標準技術研究所（NIST）のページを保存して使いました。',
]);

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
