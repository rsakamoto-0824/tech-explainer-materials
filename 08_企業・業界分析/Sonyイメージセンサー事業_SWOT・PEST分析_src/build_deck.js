// ソニーのイメージセンサー事業：SWOT分析・PEST分析
// pptxgenjs でスライドを組み立てる。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 数値はすべて公開資料からの引用で、出典は各スライドの下と参考文献スライドに示す（確認日 2026-09-27）。
// 「本資料の評価」と書いた配置や打ち手は、出典の事実をもとにした整理で、出典そのものの記載ではない。

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
const DECK_DATE = '2026年9月27日';
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
pres.title = 'ソニーのイメージセンサー事業 SWOT分析・PEST分析';
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
  addText(slide, 'ソニーへの影響', colX[2], 1.5, impactW, 0.28, { fontSize: 10.5, bold: true, color: C.muted });

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
  addText(slide, 'SONY IMAGE SENSOR BUSINESS ｜ SWOT & PEST', 0.8, 1.2, 7.8, 0.35, { fontSize: 13, bold: true, color: C.primaryLight, charSpacing: 2 });
  addText(slide, withBreaks(['ソニーのイメージセンサー事業', 'SWOT分析・PEST分析']), 0.8, 1.65, 7.9, 1.8, { fontSize: 36, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, '世界シェア約5割の首位事業は、スマホ市場の縮小と\n競争の変化にどう向き合うか', 0.8, 3.65, 7.6, 0.9, { fontSize: 18, color: C.onDarkSub, lineSpacingMultiple: 1.1 });
  addText(slide, '決算資料・各社の発表・調査会社・業界メディアの公開情報をもとに整理', 0.8, 4.72, 7.6, 0.4, { fontSize: 13, color: C.primaryLight });
  addText(slide, `${DECK_DATE}時点　｜　社内情報は使用していません`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右側：画素とカラーフィルター（ベイヤー配列）のモザイク。中心ほど濃く、光が当たっている様子を表す
  const cols = 8;
  const rows = 7;
  const cell = 0.42;
  const gap = 0.05;
  const gx = 8.85;
  const gy = 1.35;
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: gx - 0.2, y: gy - 0.2, w: gridW + 0.4, h: gridH + 0.4, rectRadius: 0.1,
    fill: { color: C.nightCard }, line: { color: C.nightLine, width: 1.25 },
  });
  const spotC = 4.6;
  const spotR = 2.6;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const color = r % 2 === 0 ? (c % 2 === 0 ? C.R : C.G) : (c % 2 === 0 ? C.G : C.B);
      const dist = Math.hypot(c - spotC, r - spotR);
      const transparency = Math.min(82, Math.round(8 + dist * 15));
      slide.addShape(pres.shapes.RECTANGLE, {
        x: gx + c * (cell + gap), y: gy + r * (cell + gap), w: cell, h: cell,
        fill: { color, transparency }, line: { color: C.nightCard, width: 0.25 },
      });
    }
  }
  addText(slide, '画素とカラーフィルター（ベイヤー配列）のイメージ', gx - 0.2, gy + gridH + 0.35, gridW + 0.4, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'center' });

  slide.addNotes([
    'この資料では、ソニーグループのイメージセンサー事業を、PEST分析とSWOT分析の2つの枠組みで整理します。',
    'イメージセンサーは、スマートフォンやカメラ、車に載る「電子の目」にあたる半導体で、ソニーは世界シェア約5割の首位です。',
    '2025年度は過去最高の業績でしたが、2026年はメモリ価格の高騰によるスマホ市場の縮小や、最大顧客の調達先分散の報道など、転換点を迎えています。',
    '数値はすべて、ソニーの決算資料、各社の発表、調査会社、業界メディアの公開情報から引用し、各スライドの下に出典を示しています。確認日は2026年9月27日です。',
    '社内の情報は使っていません。また、投資判断を目的とした資料ではありません。',
  ]);
}

// =====================================================================
// 2. この資料について
// =====================================================================
{
  const slide = newContentSlide(null, 'この資料について', '公開情報で、外部環境（PEST）と事業の位置（SWOT）を整理する', [
    'この資料の目的と前提です。',
    '対象は、ソニーグループの「イメージング＆センシング・ソリューション」分野、略してI&SS分野です。事業の担い手はソニーセミコンダクタソリューションズと、その製造子会社です。',
    '年度はソニーの会計年度で、4月から翌年3月までです。たとえば2025年度は、2025年4月から2026年3月までを指します。',
    '情報源は、ソニーが米国SECに提出している決算説明資料の英語版、ソニーセミコンダクタソリューションズと経済産業省の発表、Yole GroupやIDCなどの調査会社、業界メディアです。',
    '報道やアナリストの推計は、事実と区別できるように「報道」「推計」と書いています。',
    '右側は分析の進め方です。現在地を確認し、PESTで外部環境、SWOTで強み・弱み・機会・脅威を整理し、クロスSWOTで打ち手の方向を考え、最後に今後の注目点をまとめます。',
  ]);
  const rows = [
    ['目的', 'ソニーのイメージセンサー事業を取り巻く外部環境（PEST）と、強み・弱み・機会・脅威（SWOT）を整理し、今後の打ち手と注目点を考える材料にする'],
    ['対象', 'ソニーグループの「イメージング＆センシング・ソリューション（I&SS）」分野。担い手はソニーセミコンダクタソリューションズ（SSS）と製造子会社'],
    ['年度・金額', 'ソニーの会計年度（4月〜翌3月）。例：2025年度＝2025年4月〜2026年3月。金額は国際会計基準（IFRS）の開示値'],
    ['情報源', 'ソニーの決算説明資料（米国SEC提出の英語版）、SSS・経済産業省の発表、調査会社（Yole Group、IDCほか）、業界メディア。確認日：2026年9月27日'],
    ['注意', '社内情報は使っていない。報道やアナリストの推計は「報道」「推計」と明記した。投資判断を目的とするものではない'],
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
    ['現在地', '業績・シェア・売上構成・技術の歩み・直近の出来事'],
    ['PEST分析', '政治・経済・社会・技術の外部環境と、その影響の大きさ'],
    ['SWOT分析', '強み・弱み（内部）と、機会・脅威（外部）'],
    ['クロスSWOT', '4つの組み合わせから、打ち手の方向を考える'],
    ['示唆・注目点', 'ソニーの施策の評価と、今後見るべき指標'],
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
  const slide = newContentSlide(null, 'エグゼクティブサマリー', '首位の座は盤石に見えるが、2026〜27年は転換点になる', [
    '最初に結論をまとめます。',
    '上の4つの数字は、この資料の出発点です。ソニーのシェアは外部調査でも約5割に達し、2025年度は売上高2兆1,515億円、営業利益3,573億円と過去最高でした。一方で、IDCは2026年のスマホ出荷が過去最大の16.7%減になると予測しています。',
    '外部環境では、メモリ高騰によるスマホ市場の縮小、米国の製造回帰や日中関係などの地政学が逆風です。政府の支援、車の安全規制、フィジカルAIは追い風です。',
    'SWOTで見ると、強みは技術・規模・収益力、弱みはスマホと特定顧客への依存、九州への生産集中、重い設備投資です。',
    '示唆としては、TSMCとの合弁で技術の先行と投資負担の軽減を両立しながら、車載やフィジカルAIで顧客と用途を分散できるかが焦点です。2027年度からの次期中期計画が試金石になります。',
  ]);
  const stats = [
    ['約50%', 'CMOSイメージセンサーの世界シェア（2025年、Yole）', C.B],
    ['2兆1,515億円', '2025年度の売上高（前年比+20%、過去最高）', C.primary],
    ['3,573億円', '2025年度の営業利益（前年比+37%、過去最高）', SWOT.S.color],
    ['−16.7%', '2026年のスマホ出荷の予測（IDC、過去最大の減少）', SWOT.T.color],
  ];
  const tileW = (CONTENT_W - 0.2 * 3) / 4;
  stats.forEach(([value, label, color], i) => {
    addStat(slide, MARGIN_X + i * (tileW + 0.2), 1.5, tileW, 1.3, value, label, { color, valueSize: 27, labelSize: 10.5 });
  });
  const messages = [
    ['現在地', C.primary, '世界シェア約5割の首位。2025年度は売上高・営業利益とも過去最高。けん引役は、大手顧客向けを中心としたスマホ用センサーの大判化（高付加価値化）'],
    ['外部環境', PEST.E.color, '2026年はメモリ高騰でスマホ出荷が過去最大の落ち込み（IDC）。米国の製造回帰や日中関係など地政学の不確実性も高い。一方、経済安全保障の政府支援・車の安全規制・フィジカルAIは追い風'],
    ['SWOT', SWOT.S.color, '強みは技術・規模・収益力。弱みはスマホと特定顧客への依存、九州への生産集中、重い設備投資。機会は大判化の再加速と車載・フィジカルAI、脅威はAppleの調達先分散（報道）と中国勢の台頭'],
    ['示唆', SWOT.O.color, 'TSMCとの合弁（ファブライト化）で「技術の先行」と「投資負担の軽減」を両立し、車載・フィジカルAIで顧客と用途を分散できるか。2027〜2029年度の次期中期計画が試金石'],
  ];
  messages.forEach(([label, color, text], i) => {
    const y = 3.05 + i * 0.95;
    addCard(slide, MARGIN_X, y, CONTENT_W, 0.85, { fill: C.white, line: C.grid, lineWidth: 0.75 });
    addChip(slide, label, MARGIN_X + 0.15, y + 0.23, 1.25, 0.38, { fill: color, fontSize: 11.5 });
    addText(slide, text, MARGIN_X + 1.6, y + 0.06, CONTENT_W - 1.8, 0.73, { fontSize: 12.5, valign: 'middle' });
  });
  addSource(slide, '出所：Yole Group（2026-08-03）、ソニーグループ FY2025決算説明資料（2026-05-08）、IDC（2026-08-26）。要点のまとめ方は本資料による');
}

// =====================================================================
// 4. 事業の概要
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ①　事業の概要', 'ソニーの半導体事業は、イメージセンサーが売上の9割を占める', [
    'ソニーの半導体事業の全体像です。',
    'ソニーグループの中で、イメージセンサーを中心とする半導体事業は「I&SS分野」と呼ばれます。2025年度のI&SS分野の売上高2兆1,515億円のうち、1兆9,832億円、つまり約9割がイメージセンサーです。',
    '開発・設計・販売はソニーセミコンダクタソリューションズ、生産はソニーセミコンダクタマニュファクチャリングが担い、主な工場は九州と東北にあります。',
    '最近は外部との合弁が増えています。TSMCとは熊本県合志市で次世代センサーの合弁会社を作り、2029年の量産を予定しています。三菱電機とは工場向けのAIビジョンセンサーの合弁を、2026年10月から始める予定です。',
    '右の表は、2024年の事業説明会で示された3つの事業領域です。スマホ向けが成長のけん引役、カメラや産業向けが稼ぎ頭、車載などが将来の柱という位置付けです。',
  ]);
  // 左：体制図
  const lx = MARGIN_X;
  const lw = 6.1;
  addCard(slide, lx, 1.5, lw, 0.55, { fill: C.primary });
  addText(slide, 'ソニーグループ　I&SS分野（イメージング＆センシング・ソリューション）', lx + 0.2, 1.5, lw - 0.3, 0.55, { fontSize: 11, bold: true, color: C.white, valign: 'middle' });
  addLine(slide, lx + 1.55, 2.05, lx + 1.55, 2.3, { color: C.primary, width: 1.5 });
  addLine(slide, lx + 4.6, 2.05, lx + 4.6, 2.3, { color: C.primary, width: 1.5 });
  const boxes = [
    [lx, 'ソニーセミコンダクタ\nソリューションズ（SSS）', '研究開発・設計・販売\n本社：神奈川県厚木市'],
    [lx + 3.1, 'ソニーセミコンダクタ\nマニュファクチャリング', '生産（前工程・後工程）\n本社：熊本県菊陽町'],
  ];
  boxes.forEach(([x, head, desc]) => {
    addCard(slide, x, 2.3, 3.0, 1.45, { fill: C.gray, line: C.line, lineWidth: 0.75 });
    addText(slide, head, x + 0.15, 2.38, 2.7, 0.62, { fontSize: 12.5, bold: true, color: C.primary });
    addText(slide, desc, x + 0.15, 3.02, 2.7, 0.66, { fontSize: 11, color: C.ink });
  });
  addText(slide, '外部との合弁・出資', lx, 3.95, lw, 0.3, { fontSize: 12, bold: true, color: C.muted });
  const partners = [
    ['TSMC', 'Advanced Vision Semiconductor Manufacturing（熊本県合志市）：スマホ向け次世代センサー。2029年量産予定。ソニーが単独の支配株主'],
    ['三菱電機', 'Advanced Vision Solutions：工場向けAIビジョンセンサー。出資比率 三菱電機60%・SSS 40%。2026年10月開始予定'],
    ['JASM', 'TSMCの熊本子会社（ソニーも出資）。隣接地からロジック半導体を供給'],
  ];
  partners.forEach(([name, text], i) => {
    const y = 4.3 + i * 0.8;
    addChip(slide, name, lx, y + 0.06, 1.05, 0.34, { fill: SWOT.O.color, fontSize: 11 });
    addText(slide, text, lx + 1.2, y, lw - 1.2, 0.75, { fontSize: 11 });
  });

  // 右：3つの事業領域と主な数字
  const rx = 7.1;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '3つの事業領域（2024年の事業説明会）', rx, 1.5, rw, 0.32, { fontSize: 12.5, bold: true, color: C.primary });
  const domainRows = tableRows(['領域', '主な製品', '方針'], [
    ['成長けん引', 'モバイル（スマホ）用イメージセンサー', '成長投資を続け、全体をけん引'],
    ['収益', 'カメラ用、産業・社会インフラ用センサー', '競争力を保ち、収益を最大化'],
    ['戦略', '車載用センサー、システムソリューション、OLEDマイクロディスプレイ、半導体レーザー', '将来の柱として戦略的に投資'],
  ], { fontSize: 10.5 });
  addTableBox(slide, domainRows, rx, 1.88, rw, [1.05, 2.55, rw - 3.6], { fontSize: 10.5 });
  const facts = [
    ['1兆9,832億円', '2025年度のイメージセンサー売上（I&SS分野の約92%）'],
    ['月15.8万枚', 'ウエハー生産能力（2026年4〜6月の平均）'],
    ['九州・東北', '熊本・長崎・大分・鹿児島・山形・宮城に生産拠点。合志市に新工場'],
  ];
  facts.forEach(([value, label], i) => {
    const y = 4.3 + i * 0.8;
    addText(slide, value, rx, y, 2.25, 0.7, { fontSize: 19, bold: true, color: C.B, valign: 'middle' });
    addText(slide, label, rx + 2.35, y, rw - 2.35, 0.7, { fontSize: 11, valign: 'middle' });
  });
  addSource(slide, '出所：ソニーグループ決算資料（2026-05-08・07-31、SEC提出版）、SSS「拠点一覧」「TSMCとの合弁の確定契約」（2026-08-11）「三菱電機との合弁」（2026-07-22）、EE Times Japan（2024-06-03・2026-05-18・04-17）');
}

// =====================================================================
// 5. 業績の推移
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ②　業績', '4年で売上は2倍に。2025年度は売上・利益とも過去最高', [
    'I&SS分野の業績の推移です。数字はすべてソニーの開示値で、国際会計基準（IFRS）に統一するため2021年度から示しています。',
    '売上高は2021年度の1兆764億円から2025年度の2兆1,515億円へ、4年でほぼ2倍になりました。営業利益も1,556億円から3,573億円に増え、利益率は16.6%です。',
    '2023年度は新製品の歩留まり問題などで減益でしたが、その後は回復しています。',
    '2026年度の見通しは、7月時点で売上高2兆1,100億円、営業利益4,200億円です。スマホ向けは若干の減収を見込む一方、前年度の一時費用がなくなるため増益の計画です。薄い色の棒が予想です。',
    'なお、7月28日の熊本地震の影響は、この見通しには織り込まれていません。',
  ]);
  const cats = ['21年度', '22年度', '23年度', '24年度', '25年度', '26年度予想'];
  const sales = [10764, 14022, 16027, 17990, 21515, 21100];
  const profit = [1556, 2122, 1935, 2611, 3573, 4200];
  const chartY = 1.85;
  const chartH = 2.85;
  const plot = { x: 0.04, y: 0.06, w: 0.92, h: 0.8 };
  // pptxgenjs はオプションのオブジェクトを書き換えることがあるので、グラフごとに新しく作る
  const commonOptions = () => ({
    y: chartY, h: chartH, barDir: 'col', barGapWidthPct: 55,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '#,##0', dataLabelFontSize: 10.5, dataLabelColor: C.ink,
    dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10.5, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, layout: { ...plot },
  });
  addText(slide, '売上高（億円）', MARGIN_X, 1.5, 5.9, 0.32, { fontSize: 13, bold: true, color: C.B });
  slide.addChart(pres.charts.BAR, [{ name: '売上高', labels: cats, values: sales }], {
    ...commonOptions(), x: MARGIN_X, w: 5.9,
    chartColors: [C.B, C.B, C.B, C.B, C.B, 'A9BFE6'], valAxisMinVal: 0, valAxisMaxVal: 25000,
  });
  const px = 6.85;
  const pw = RIGHT_EDGE - px;
  addText(slide, '営業利益（億円）と営業利益率', px, 1.5, pw, 0.32, { fontSize: 13, bold: true, color: SWOT.S.color });
  slide.addChart(pres.charts.BAR, [{ name: '営業利益', labels: cats, values: profit }], {
    ...commonOptions(), x: px, w: pw,
    chartColors: [SWOT.S.color, SWOT.S.color, SWOT.S.color, SWOT.S.color, SWOT.S.color, 'A8D8BC'], valAxisMinVal: 0, valAxisMaxVal: 5000,
  });
  // 営業利益率をグラフの下に、各棒の位置にそろえて書く
  const margins = profit.map((p, i) => `${((p / sales[i]) * 100).toFixed(1)}%`);
  const plotX = px + plot.x * pw;
  const plotW = plot.w * pw;
  margins.forEach((m, i) => {
    const cx = plotX + ((i + 0.5) * plotW) / cats.length;
    addText(slide, m, cx - 0.45, chartY + chartH + 0.02, 0.9, 0.26, { fontSize: 10.5, bold: true, color: SWOT.S.color, align: 'center' });
  });
  addText(slide, '利益率', px - 0.02, chartY + chartH + 0.02, 0.5, 0.26, { fontSize: 9, color: C.muted });

  const cards = [
    ['2025年度（過去最高）', '売上高2兆1,515億円（+20%）、営業利益3,573億円（+37%）。モバイル向けの増収・製品構成の改善・数量増が寄与。イスラエル子会社の持分売却損199億円などの一時費用を吸収'],
    ['2026年度の見通し（7月時点）', '売上高2兆1,100億円（−2%）、営業利益4,200億円（+18%）。モバイル全体は若干の減収を想定。一時費用がなくなり増益。熊本地震の影響は織り込まず'],
    ['足元（2026年4〜6月）', '売上高5,127億円（+26%）、営業利益1,222億円（+125%）で、第1四半期の過去最高。台数は微増だが、顧客・製品構成の改善と円安（利益+232億円）が寄与'],
  ];
  const cardW = (CONTENT_W - 0.2 * 2) / 3;
  cards.forEach(([head, body], i) => {
    const x = MARGIN_X + i * (cardW + 0.2);
    addCard(slide, x, 5.12, cardW, 1.72, { fill: C.gray });
    addText(slide, head, x + 0.18, 5.22, cardW - 0.36, 0.34, { fontSize: 13, bold: true, color: C.primary });
    addText(slide, body, x + 0.18, 5.6, cardW - 0.36, 1.18, { fontSize: 11.5 });
  });
  addSource(slide, '出所：ソニーグループ 決算短信・決算説明資料（SEC提出版：2023-04-28、2025-05-14、2026-05-08、2026-07-31）。I&SS分野の売上高はセグメント間取引を含む。前年比は本資料で計算');
}

// =====================================================================
// 6. 市場でのポジション
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ③　市場でのポジション', '世界シェアは約5割で、2位以下を大きく引き離す', [
    'イメージセンサー市場での位置です。',
    '左のグラフは、日経業界地図2027年版に載った2025年の出荷額ベースのシェアです。ソニーが53.6%で、2位のオムニビジョンと3位のサムスン電子はそれぞれ13%台です。調査会社によって数値は少し違い、フランスのYole Groupの調査ではソニーは約50%です。いずれにしても、2位の約4倍の規模です。',
    '右側はYoleの調査のポイントです。2025年の市場規模は253億ドルで過去最高、スマホなどモバイル向けに限るとソニーのシェアは57%です。',
    '地域別では日本勢が51%、中国勢が21%で、中国勢が韓国勢を抜いて2位になりました。',
    '用途別に見ると構図が違い、車載はオムニビジョンが首位、セキュリティは中国勢が強く、産業用ではソニーが優位です。ソニーが圧倒的なのは主にモバイルと産業、写真用だと分かります。',
  ]);
  const cats = ['ソニー', 'オムニビジョン（中国）', 'サムスン電子（韓国）', 'スマートセンス（中国）', 'ギャラクシーコア（中国）', 'その他'];
  const shares = [53.6, 13.4, 13.2, 5.6, 3.9, 10.3];
  addText(slide, 'CMOSイメージセンサーの世界シェア（2025年、出荷額ベース）', MARGIN_X, 1.5, 6.4, 0.32, { fontSize: 13, bold: true, color: C.primary });
  slide.addChart(pres.charts.BAR, [{ name: 'シェア', labels: cats, values: shares }], {
    x: MARGIN_X, y: 1.85, w: 6.3, h: 4.25, barDir: 'bar', barGapWidthPct: 45,
    catAxisOrientation: 'maxMin',
    chartColors: [C.G, '8A93A8', '8A93A8', '8A93A8', '8A93A8', 'C3C8D4'],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0"%"', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 11, catAxisLabelColor: C.ink, catAxisLineColor: C.line,
    valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 65, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false,
  });
  addText(slide, '日経業界地図2027年版による。調査会社により数値は異なる（Yoleではソニー約50%）', MARGIN_X, 6.15, 6.3, 0.5, { fontSize: 10, color: C.muted });

  // 右：Yole の調査のポイント
  const rx = 7.2;
  const rw = RIGHT_EDGE - rx;
  addText(slide, 'Yole Group の調査（2026年8月発表）', rx, 1.5, rw, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const tileW = (rw - 0.2) / 2;
  addStat(slide, rx, 1.9, tileW, 1.05, '約50%', 'ソニーのシェア（全体）', { color: C.G, valueSize: 24, labelSize: 10.5 });
  addStat(slide, rx + tileW + 0.2, 1.9, tileW, 1.05, '57%', 'ソニーのシェア（モバイル向け）', { color: C.G, valueSize: 24, labelSize: 10.5 });
  addStat(slide, rx, 3.08, rw, 0.95, '253億ドル', '2025年の市場規模（前年比+9%、過去最高）', { color: C.B, valueSize: 22, labelSize: 10.5 });

  // 地域別シェアの帯グラフ（図形で描く）
  addText(slide, '地域別のシェア（2025年）', rx, 4.15, rw, 0.28, { fontSize: 11.5, bold: true, color: C.muted });
  const regions = [['日本', 51, C.G], ['中国', 21, C.R], ['韓国', 17, '8A93A8'], ['北米', 5, 'B7BDCB'], ['欧州', 5, 'D4D8E1']];
  const total = regions.reduce((s, r) => s + r[1], 0);
  let bx = rx;
  regions.forEach(([name, value, color]) => {
    const segW = (rw * value) / total;
    slide.addShape(pres.shapes.RECTANGLE, { x: bx, y: 4.47, w: segW, h: 0.42, fill: { color }, line: { color: C.white, width: 1 } });
    if (value >= 15) addText(slide, `${name} ${value}%`, bx, 4.47, segW, 0.42, { fontSize: 10.5, bold: true, color: C.white, align: 'center', valign: 'middle' });
    bx += segW;
  });
  addText(slide, '右端の2つは北米5%・欧州5%（Yoleの地域別シェア）', rx, 4.92, rw, 0.26, { fontSize: 9.5, color: C.muted });
  addBullets(slide, [
    lead('車載：', 'OmniVisionが首位。ソニーは高解像度のADAS・ビューイング用で拡大'),
    lead('セキュリティ：', 'SmartSens・OmniVisionが主導'),
    lead('産業用：', 'ソニーが優位。写真用はソニーとキヤノンが中心'),
  ], rx, 5.28, rw, 1.45, { fontSize: 11, space: 4 });
  addSource(slide, '出所：日経業界地図2027年版（デジカメライフ 2026-08-21 の紹介による）、Yole Group「CIS industry: Sony extends its lead as China overtakes South Korea」（2026-08-03）、EE Times Japan（2026-08-26）');
}

// =====================================================================
// 7. 売上構成と顧客
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ④　売上構成と顧客', 'センサー売上の約8割がスマホ向け。大手顧客の動きが業績を左右する', [
    '売上の中身です。',
    '2025年度のI&SS分野の売上高2兆1,515億円のうち、スマホなどモバイル向けのイメージセンサーが1兆5,611億円で、全体の約73%、イメージセンサー売上に限ると約79%を占めます。',
    'ソニーは決算説明で「大手顧客」という言い方をし、社名を明かしていませんが、業界ではApple向けとの見方が一般的です。Yoleも、2025年のソニーの成長要因としてApple関連の需要を挙げています。',
    '中国のスマホ大手のハイエンド機種も重要な顧客です。ただし2024年はこの領域で競争が激しくなり、ソニーのシェアが横ばいにとどまりました。',
    'モバイル以外では、自社のαシリーズを含むデジタルカメラ、車載、工場や社会インフラ向けの産業用があります。',
  ]);
  const labels = ['モバイル向けイメージセンサー', 'その他のイメージセンサー', 'イメージセンサー以外など'];
  const values = [15611, 4221, 1683];
  const colors = [C.B, C.G, 'B7BDCB'];
  slide.addChart(pres.charts.DOUGHNUT, [{ name: '売上構成', labels, values }], {
    x: MARGIN_X, y: 1.55, w: 4.3, h: 4.3, holeSize: 58,
    chartColors: colors, showLegend: false, showPercent: true, showValue: false, showLabel: false,
    dataLabelColor: C.white, dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelFormatCode: '0%',
    dataBorder: { pt: 1.5, color: 'FFFFFF' },
  });
  addText(slide, '2025年度\nI&SS分野の売上高\n2兆1,515億円', MARGIN_X + 1.05, 3.12, 2.2, 1.2, { fontSize: 12, bold: true, color: C.primary, align: 'center', valign: 'middle' });
  // 凡例（金額つき）
  const legend = [
    ['モバイル向けイメージセンサー', '1兆5,611億円'],
    ['その他のイメージセンサー（デジカメ・車載・産業など）', '4,221億円'],
    ['イメージセンサー以外・セグメント間取引など', '1,683億円'],
  ];
  legend.forEach(([name, amount], i) => {
    const y = 5.95 + i * 0.3;
    slide.addShape(pres.shapes.RECTANGLE, { x: MARGIN_X, y: y + 0.06, w: 0.18, h: 0.18, fill: { color: colors[i] }, line: { color: colors[i], width: 0.5 } });
    addText(slide, [{ text: `${name}　`, color: C.ink }, { text: amount, bold: true, color: colors[i] === 'B7BDCB' ? C.muted : colors[i] }],
      MARGIN_X + 0.28, y, 5.6, 0.3, { fontSize: 10.5, valign: 'middle' });
  });

  const rx = 6.35;
  const rw = RIGHT_EDGE - rx;
  const points = [
    ['センサー売上の約79%がスマホ向け', 'イメージセンサー売上1兆9,832億円のうち、モバイル向けが1兆5,611億円（2025年度）。スマホ市場の動きがそのまま業績に響く構造'],
    ['業績を左右する「大手顧客」', 'ソニーは社名を明かしていないが、Apple向けとの見方が一般的（EE Times Japan）。Yoleも2025年の成長要因に「Apple関連の需要」を挙げる'],
    ['中国のハイエンドスマホも重要', '大判センサーを採用する主要顧客。ただし2024年はこの領域で競争が激しくなり、ソニーのシェアは横ばい（53%）にとどまった'],
    ['モバイル以外の顧客', 'デジタルカメラ（自社のαを含む）、車載（主要自動車メーカー20社の9割が採用する見通し、2026年度）、産業・社会インフラ（工場の検査など）'],
  ];
  points.forEach(([head, body], i) => {
    const y = 1.5 + i * 1.33;
    addCard(slide, rx, y, rw, 1.2, { fill: i === 1 ? SWOT.W.tint : C.gray });
    addText(slide, head, rx + 0.2, y + 0.08, rw - 0.4, 0.36, { fontSize: 13, bold: true, color: i === 1 ? SWOT.W.color : C.primary });
    addText(slide, body, rx + 0.2, y + 0.46, rw - 0.4, 0.7, { fontSize: 11 });
  });
  addSource(slide, '出所：ソニーグループ 2025年度決算補足資料（EE Times Japan 2026-05-18 の記事による）、Yole Group（2026-08-03）、EE Times Japan（2025-06-13・07-07）。構成比は本資料で計算');
}

// =====================================================================
// 8. 技術の歩み
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑤　技術の歩み', '業界の節目となる技術を自ら生み、量産してきた', [
    'ソニーのイメージセンサー技術の歩みです。',
    '2004年、当時世界一だったCCDへの増産投資をやめて、CMOSに集中すると決めたのが出発点です。その後、光を配線の裏側から当てる裏面照射型（2009年）、画素と回路を別々のチップで作って貼り合わせる積層型（2012年）、チップ同士を銅で直接つなぐCu-Cu接続（2015年）を、いずれも他社に先駆けて量産しました。',
    '2021年には、画素の中の受光部とトランジスタを別の層に分ける2層トランジスタ画素を開発しました。2026年には、明暗差の大きい場面を1回の撮影で写せるLOFICという構造のスマホ用センサーを量産します。',
    '下の左は、今後の技術の方向です。ソニーは、微細化という「ヨコ」の高密度化と、多層化という「タテ」の高密度化で、5つの特性を底上げするとしています。',
    '右はセンシングへの広がりです。カラー画像以外の情報を捉えるセンサーや、センサーの中でAI処理をするセンサーも手掛けています。',
  ]);
  const items = [
    ['2004', 'CCDへの増産投資をやめ、CMOSに集中すると決断'],
    ['2009', '裏面照射型CMOSを商品化（感度 約2倍）'],
    ['2012', '積層型CMOSを商品化（画素と回路を別チップで作り貼り合わせ）'],
    ['2015', 'Cu-Cu接続を他社に先駆け実用化'],
    ['2021', '2層トランジスタ画素を開発（飽和信号量 約2倍）'],
    ['〜2025', '3層積層のセンサーがiPhone・OPPO向けに（Yoleは業界の節目と評価）'],
    ['2026', 'LOFIC搭載のスマホ用センサーを量産へ（1回の露光で100dB）'],
    ['2029', 'TSMCとの合弁で先端プロセスのスマホ用センサーを量産（予定）'],
  ];
  const lineY = 3.05;
  const boxW = 2.45;
  // 両端の文字枠が余白に収まるように、最初と最後の点の位置を決める
  const x0 = MARGIN_X + boxW / 2;
  const x1 = RIGHT_EDGE - boxW / 2;
  addLine(slide, MARGIN_X + 0.1, lineY, RIGHT_EDGE - 0.1, lineY, { color: C.line, width: 2 });
  const step = (x1 - x0) / (items.length - 1);
  items.forEach(([year, text], i) => {
    const cx = x0 + i * step;
    const future = i === items.length - 1;
    const color = future ? SWOT.O.color : (i >= 5 ? C.G : C.B);
    addCircle(slide, cx, lineY, 0.2, color, '', {});
    const above = i % 2 === 0;
    const bx = cx - boxW / 2;
    const chipY = above ? 1.55 : 3.3;
    addChip(slide, year, cx - 0.42, chipY, 0.84, 0.3, { fill: color, fontSize: 11 });
    addText(slide, text, bx, chipY + 0.36, boxW, 0.9, { fontSize: 11, align: 'center' });
    addLine(slide, cx, above ? chipY + 1.2 : lineY + 0.1, cx, above ? lineY - 0.1 : chipY, { color: C.grid, width: 1 });
  });

  // 下：これからの技術の方向
  const cardY = 4.72;
  const cardH = 2.1;
  const cw = (CONTENT_W - 0.25) / 2;
  addCard(slide, MARGIN_X, cardY, cw, cardH, { fill: C.gray });
  addText(slide, '高密度化の2つの方向（2025年〜）', MARGIN_X + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: C.B });
  addBullets(slide, [
    lead('ヨコ（微細化）：', '画素側に22〜28nm相当の装置群、ロジックは12nmを導入予定（時期は非公表）'),
    lead('タテ（多層化）：', '2層トランジスタ画素、3層積層、受光部の2層化（可視光と赤外を同時に撮る）も検討'),
    lead('ねらい：', '感度・ダイナミックレンジ・解像度・読み出し速度・消費電力の5特性を底上げ'),
  ], MARGIN_X + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  const rx = MARGIN_X + cw + 0.25;
  addCard(slide, rx, cardY, cw, cardH, { fill: C.gray });
  addText(slide, 'センシングへの広がり', rx + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: C.G });
  addBullets(slide, [
    lead('距離を測る：', 'ToF・SPAD（車載LiDARなど）'),
    lead('見えない光を写す：', 'SWIR（短波長赤外）・偏光・UV・マルチスペクトル'),
    lead('動きだけを捉える：', 'イベントベースビジョンセンサー（EVS）'),
    lead('センサー内でAI処理：', 'IMX500（2020年）。画像を外に出さずに結果だけを出力'),
  ], rx + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  addSource(slide, '出所：SSS「ソニーの半導体の歴史/沿革」「2層トランジスタ画素」（2021-12-16）「LOFIC搭載センサー」（2026-06-17）「インテリジェントビジョンセンサー」、EE Times Japan（2025-06-19・2026-05-14・2026-08-26）、Yole Group（2026-08-03）');
}

// =====================================================================
// 9. 2025〜2026年の主な出来事
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑥　直近の出来事', 'この1年半で、顧客・競合・生産体制に大きな動きが重なった', [
    'この1年半ほどの主な出来事を時系列で並べました。右の列は、それぞれが事業にとって何を意味するかの整理です。',
    '2025年は、韓国のSK hynixがイメージセンサーから撤退した一方、Appleが米国でSamsungとチップ製造を進めると発表し、iPhone用センサーの調達先が分かれるという報道が出ました。',
    '2026年に入ると、米国の半導体関税や中国の対日輸出規制など、通商と地政学の動きが相次ぎました。',
    'ソニーは4月に政府の助成を得て、5月にTSMCとの合弁を基本合意し、8月に確定契約を結びました。7月には熊本地震で主力工場が一時止まりました。',
    '8月には、Yoleがソニーのシェア約5割を、IDCが2026年のスマホ出荷の過去最大の減少を発表しています。追い風と逆風が同時に強まっている状況です。',
  ]);
  const rows = tableRows(['時期', '出来事', '事業にとっての意味'], [
    ['2025年3月', 'SK hynixがイメージセンサー事業から撤退し、AI向けメモリに集中', '韓国勢の後退'],
    ['2025年6月', 'ソニーが「金額シェア60%」目標の数年遅れを表明。高密度化の方針を示す', '目標は維持'],
    ['2025年8月', 'Appleが米国投資を6,000億ドルに拡大。Samsungのオースティン工場で新技術のチップ製造（iPhone用センサーとの報道）', '最大顧客の調達先分散'],
    ['2026年1〜2月', '米国が半導体に232条関税（25%）を発動。米最高裁がIEEPA関税を違法と判断。中国が対日輸出規制を強化', '通商・地政学のリスク'],
    ['2026年4月', '経産省が合志市の新工場（月1万枚、2029年5月供給開始）に最大600億円を助成', '経済安全保障の支援'],
    ['2026年5月', '2025年度は売上・利益とも過去最高。TSMCとの合弁で基本合意（ファブライト化の第一歩）', '生産体制の転換'],
    ['2026年7月', '三菱電機とAIビジョンセンサーの合弁に合意。28日の熊本地震で熊本の主力工場が一時停止', '新領域／災害リスク'],
    ['2026年8月', 'TSMCとの合弁の確定契約（総額約7,470億円、2029年量産）。Yoleがソニーのシェア約50%、IDCが2026年のスマホ出荷−16.7%と発表', '転換点'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [1.45, 8.35, CONTENT_W - 9.8], { fontSize: 10.5, rowH: 0.56 });
  addSource(slide, '出所：TrendForce（2025-03-06・08-07）、EE Times Japan（2025-06-13・2026-04-17・07-31・08-12・08-26）、Apple（2025-08-06）、Sandler, Travis & Rosenberg、Skadden（2026-02-24）、TMI総合法律事務所（2026）、SSS各発表、IDC（2026-08-26）');
}

// =====================================================================
// 10. PEST分析の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ①　全体像', '逆風はスマホ市場と地政学、追い風は政策・安全規制・フィジカルAI', [
    'ここからPEST分析です。PESTは、政治（Politics）、経済（Economy）、社会（Society）、技術（Technology）の4つの視点で、会社の外側で起きている大きな変化を整理する方法です。',
    '各項目の前の丸印は、ソニーにとって追い風なら緑のプラス、逆風なら赤のマイナス、両方の面があるものは黄色のプラスマイナスです。',
    '全体を見ると、逆風の中心は、メモリ高騰によるスマホ市場の縮小と、米国の製造回帰や日中関係などの地政学です。',
    '追い風は、経済安全保障の政府支援、車の安全規制、動画需要、人手不足による自動化、フィジカルAIなどです。',
    '次のページから、4つの視点を1枚ずつ詳しく見ていきます。',
  ]);
  const quadrants = [
    [PEST.P, [
      ['−', '米国の関税・製造回帰（Appleの米国内調達の動き）'],
      ['−', '日中関係の緊張と中国の半導体国産化'],
      ['＋', '経済安全保障の支援（新工場に最大600億円）'],
      ['＋', '車の安全規制（EUでドライバー監視を義務化）'],
    ]],
    [PEST.E, [
      ['−', 'メモリ高騰で、2026年のスマホ出荷が大幅減'],
      ['＋', '市場は数量より付加価値（大判化）で成長'],
      ['±', '円安の追い風と、円高に戻るリスク'],
      ['−', 'エネルギー・物流費と巨額の設備投資'],
    ]],
    [PEST.S, [
      ['＋', '動画中心の情報発信と、カメラへの期待'],
      ['＋', '人手不足による省人化・自動化の需要'],
      ['＋', '交通安全・見守りへの関心の高まり'],
      ['±', 'プライバシーと地域社会（地下水・人材）への配慮'],
    ]],
    [PEST.T, [
      ['＋', '微細化と多層化による高密度化'],
      ['＋', 'フィジカルAI・ロボットのセンシング需要'],
      ['±', 'AI画像処理の進化（センサーを補う／求める）'],
      ['−', '競合の3層積層・中国勢の追い上げ、メモリ逼迫'],
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
  // 凡例
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
buildPestDetail(PEST.P, 'PEST分析 ②　政治（Politics）', '米国の製造回帰と日中関係が逆風、国の支援と安全規制が追い風',
  '法律・規制・政策・国際関係など、国や政府の動きが事業に与える影響を見る視点',
  [
    {
      sign: '−', factor: '米国の通商政策',
      fact: '半導体製品への232条関税（25%）が2026年1月に発動。IEEPAに基づく関税は2月に最高裁が違法と判断。日米合意で日本は関税の上限15%、半導体でも他国より不利に扱わないとされた',
      impact: 'センサーは主にアジアの端末組立向けで、直接の打撃は限られる。ただし課税が最終製品に広がったり、米国内生産を求められたりすると、顧客の調達先選びが変わる',
    },
    {
      sign: '−', factor: '米国の製造回帰\nとApple',
      fact: 'Appleは米国投資を6,000億ドルに拡大し、Samsungのオースティン工場で「世界で初めて使う新技術」によるチップ製造を進めると発表（2025年8月）。iPhone用センサーとの報道が相次ぐ',
      impact: '最大顧客の一部がSamsungへ移る可能性。ソニーは「米国での自社量産はハードルが高い」とし、パートナーとの共同投資などを検討中（2025年11月）',
    },
    {
      sign: '−', factor: '日中関係と\n中国の国産化',
      fact: '中国は2026年1月に対日デュアルユース品目の輸出規制を強化し、2月に日本企業40社を輸出管理リスト等に追加。中国のセンサー各社は国内のファウンドリーやモジュール会社と組み、シェアを21%に伸ばした',
      impact: '中国スマホ大手向け販売での競争や調達方針の変化、材料調達への波及に注意が必要',
    },
    {
      sign: '＋', factor: '経済安全保障と\n安全規制',
      fact: '経産省は経済安全保障推進法に基づき、合志市の新工場（月1万枚、2029年5月供給開始、総投資約1,800億円）に最大約600億円を助成。EUは2024年からフルモデルチェンジ車、2026年から全新規登録車にドライバー監視（DMS）を義務化',
      impact: '国内投資のリスクを下げる。車載・車室内カメラの需要を押し上げる',
    },
  ],
  '出所：Sandler, Travis & Rosenberg「Section 232 Tariffs on Semiconductors」、Skadden（2026-02-24）、米議会調査局 IN12608（2026-01-30）、Apple（2025-08-06）、EE Times Japan（2025-10-02・11-11、2026-04-17）、TMI総合法律事務所（2026）、Yole Group、経済産業省（2026-04-17）',
  [
    '政治の視点です。4つの要因を、事実とソニーへの影響に分けて示しています。',
    '1つ目は米国の通商政策です。2026年1月に半導体への関税が発動し、2月には別の法律に基づく関税を最高裁が違法と判断しました。日本は日米合意で関税の上限が15%とされています。センサーの多くはアジアで組み立てるスマホ向けなので、直接の影響は限られますが、顧客の調達の考え方には影響します。',
    '2つ目がより大きな論点で、米国の製造回帰です。AppleはSamsungの米国工場で新しいチップを作ると発表し、iPhone用センサーではないかと報じられています。ソニー自身は、米国での自社量産はハードルが高いと説明しています。',
    '3つ目は日中関係です。中国の輸出規制の強化や、中国のセンサーメーカーの伸びは、中国のスマホ大手との取引に影響し得ます。',
    '一方、経済安全保障の観点で国がイメージセンサーの国内生産を支援していること、EUなどの車の安全規制は追い風です。',
  ]);

// =====================================================================
// 12. PEST：経済
// =====================================================================
{
  const slide = buildPestDetail(PEST.E, 'PEST分析 ③　経済（Economy）', 'メモリ高騰でスマホは縮小。ただし市場は「量」から「単価」の成長へ',
    '景気・市場の成長・価格・為替・コストなど、お金の流れに関わる変化を見る視点',
    [
      {
        sign: '−', factor: 'スマホ市場の縮小',
        fact: 'IDCは2026年のスマホ出荷を約10億台・前年比−16.7%と予測（過去最大の落ち込み）。DRAM・NANDの価格は前年比300%超上昇。Androidは−24.3%、iOSは−1.3%',
        impact: 'ソニーは2026年度のモバイル向けを若干の減収と想定。iOSが底堅いのは相対的に有利だが、下期はハイエンド機種にも波及する恐れ',
      },
      {
        sign: '＋', factor: '付加価値型の\n市場成長',
        fact: 'センサー市場は2025年に253億ドル（+9%）で過去最高。2026年は微減、2031年に303億ドル（年3.1%成長）の見通し。数量の伸び（年1.9%）を単価の伸びが上回る（Yole）',
        impact: '大判化・積層などの高付加価値品に強いソニーに合う成長の形。ただし「量」の伸びは小さい',
      },
      {
        sign: '±', factor: '為替',
        fact: '2026年4〜6月は為替の影響で売上+406億円・営業利益+232億円（ソニー）。7月時点の想定は1ドル＝約153円（2026年7月〜2027年3月）',
        impact: '円安は利益を押し上げてきた。円高に振れると逆風になる',
      },
      {
        sign: '−', factor: 'コストと\n投資負担',
        fact: 'TSMCとの合弁への拠出は総額約7,470億円（ソニー約4,650億円）。2026年の米国とイランの衝突で原油・輸送費が上昇（IDC）',
        impact: '巨額投資の回収には需要の読みが重要。合弁とファブライト化で投資負担の平準化を図る',
      },
    ],
    '出所：IDC（2026-05-26・08-26）、Yole Group（2026-08-03）・EE Times Japan（2026-08-26）、ソニーグループ Q1 FY2026決算説明資料（2026-07-31）、EE Times Japan（2026-07-31・08-12）',
    [
      '経済の視点です。',
      '最大の逆風は、スマホ市場の縮小です。AI向けのデータセンターがメモリを大量に使うため、DRAMやNANDの価格が大きく上がり、スマホの価格が上がって出荷が減っています。IDCは2026年の出荷が前年より16.7%減ると予測しました。',
      '注目点は、Androidが24%減るのに対し、iPhoneのiOSは1%程度の減少にとどまる見通しであることです。大手顧客の比率が高いソニーには相対的に有利ですが、ソニー自身も下期はハイエンド機種に影響が及ぶと見ています。',
      '一方で、センサー市場全体は、台数よりも1個あたりの単価の上昇で成長する形に変わっています。大判で高性能なセンサーに強いソニーにとっては、合った成長の形です。',
      '為替は、円安が利益を押し上げてきた一方、円高に戻ると逆風になります。また、合弁への拠出など投資の規模が大きく、需要の読みを誤らないことが重要です。',
    ]);
}

// =====================================================================
// 13. PEST：社会
// =====================================================================
buildPestDetail(PEST.S, 'PEST分析 ④　社会（Society）', '動画・自動化・安全への関心がセンサーの需要を広げる',
  '人々の暮らし方・価値観・人口構成・地域との関係など、社会の変化を見る視点',
  [
    {
      sign: '＋', factor: '動画中心の\n情報発信',
      fact: 'モバイルの通信量のうち動画は年約24%増（2023〜2029年度、ソニーの見通し）。メインカメラだけでなくサブカメラの画質にも期待が高まる。ハンドヘルド型など新しい動画撮影スタイルのカメラ市場も拡大（ソニー、2025年11月）',
      impact: 'センサーの大判化と動画性能の向上を後押し。デジカメ向けセンサーの増収にもつながる',
    },
    {
      sign: '＋', factor: '人手不足と\n省人化',
      fact: '製造現場の省人化・無人化のニーズが高まる。三菱電機とSSSが工場向けAIビジョンセンサーの合弁「Advanced Vision Solutions」を設立（出資比率60:40、2026年10月開始予定）',
      impact: '産業用センサーとエッジAIの需要が広がる。ソニーの優位な産業用の延長で事業化できる',
    },
    {
      sign: '＋', factor: '交通安全への\n関心',
      fact: '事故防止のため、ドライバーの状態監視を求める規制・評価（EU、NCAP）が広がる。車室内カメラは年15%以上の成長見込み（SSS調べ）',
      impact: '車の外（ADAS）に加え、車室内でも需要。ソニーは2025年に車室内用センサーへ初参入',
    },
    {
      sign: '±', factor: 'プライバシーと\n地域社会',
      fact: 'カメラ映像のプライバシーへの配慮が求められ、センサー内でAI処理して画像を外に出さない方式（IMX500）もある。熊本都市圏は水道水のほぼ全量が地下水で、菊陽町の工業用水は2023年の444万トンから2027年に1,244万トンへ増える見込み',
      impact: '画像を外に出さない設計は差別化の余地。工場の拡張には地下水の涵養など地域との共生が前提',
    },
  ],
  '出所：EE Times Japan（2024-06-03・2025-10-02・11-11・2026-07-23）、SSS「三菱電機との合弁」（2026-07-22）「インテリジェントビジョンセンサー」、地方経済総合研究所「熊本の水資源と半導体産業」（2025-11-05）',
  [
    '社会の視点です。',
    '1つ目は、動画を中心とした情報発信の広がりです。ソニーは、スマホの通信量のうち動画が年24%ほど増えると見ています。動画では、写真のように後から画像処理で補うのが難しく、センサーそのものの性能が効きます。これがセンサーの大判化を後押ししています。',
    '2つ目は人手不足です。工場の省人化・無人化のために、カメラとAIで現場を見る需要が増えています。ソニーは三菱電機と合弁会社を作り、2026年10月から事業を始める予定です。',
    '3つ目は交通安全です。ドライバーの居眠りやわき見を検知するカメラが規制で求められるようになり、車室内カメラの市場が伸びています。',
    '4つ目は両面のある要因です。カメラ映像のプライバシーへの配慮が求められる一方、画像を外に出さずにセンサー内で処理する技術は強みになり得ます。また、熊本の工場の拡張では、地下水など地域との共生が欠かせません。',
  ]);

// =====================================================================
// 14. PEST：技術
// =====================================================================
buildPestDetail(PEST.T, 'PEST分析 ⑤　技術（Technology）', '3D集積とフィジカルAIが次の競争軸。AIとメモリは両刃の剣',
  '技術の進化・新しい用途・代わりになる技術など、技術の変化を見る視点',
  [
    {
      sign: '＋', factor: '高密度化\n（ヨコ×タテ）',
      fact: '画素側は22〜28nm相当の装置群、ロジックは12nmを導入予定（時期は非公表）。2層トランジスタ画素・3層積層などの多層化も進む（SSSのCTO）',
      impact: '感度・ダイナミックレンジ・解像度・速度・消費電力の5特性を底上げ。TSMCとの合弁で実現を早める',
    },
    {
      sign: '−', factor: '3D集積の競争',
      fact: '競争軸は画素の微細化から3D集積へ移り、ロジックやメモリを積み重ねる方向（Yole）。Samsungも3層積層のセンサーをiPhone向けに米国で作ると報じられた',
      impact: 'ソニーが先行する領域に競合が追い付く可能性。量産の歩留まりが勝負を分ける',
    },
    {
      sign: '＋', factor: 'フィジカルAIと\nマルチセンシング',
      fact: '距離（ToF・SPAD）、見えない光（SWIR）、動き（EVS）とカラー画像を組み合わせる。車は「早く立ち上がったフィジカルAI」、ロボットは市場の立ち上がり方がまだ不透明（SSSのCTO）',
      impact: '新しい事業の柱の候補。センサー群とシステムでの提案力が問われる',
    },
    {
      sign: '±', factor: 'AI画像処理と\nメモリ',
      fact: '静止画はAI処理で補えても、動画はセンサーの特性が画質に直結する（ソニー、2024年）。AI向けの需要でメモリが逼迫し、積層構造やカメラモジュールの計画に影響し得る（Yole）',
      impact: 'AIはセンサーの価値を高めもするが、差を見えにくくもする。メモリ市況は供給とコストの両面のリスク',
    },
  ],
  '出所：EE Times Japan（2024-06-03・2025-06-19・2026-05-14・05-15・08-26）、Yole Group（2026-08-03）、MacRumors（2025-12-24）',
  [
    '技術の視点です。',
    '1つ目は、ソニー自身が進める高密度化です。回路を細かくする「ヨコ」と、層を重ねる「タテ」の両方で、センサーの基本性能を底上げしようとしています。TSMCとの合弁は、この先端プロセスを取り込む手段でもあります。',
    '2つ目は逆風で、競争の軸が3D集積に移り、競合も追い上げていることです。Samsungが3層積層のセンサーを米国で作るという報道もあります。こうした複雑な構造では、量産で歩留まりを確保できるかが勝負を分けます。',
    '3つ目は、ロボットなどのフィジカルAIです。距離や動きなど、カラー画像以外の情報を組み合わせて世界を捉える需要が広がります。ただし、ロボットの市場がどう立ち上がるかはまだ不透明だと、ソニーのCTO自身が述べています。',
    '4つ目は両面のある要因です。AIの画像処理は、センサーの性能差を補ってしまう面と、より良い元データを求める面の両方があります。また、AI向けのメモリ需要は、センサーの部材の供給とコストのリスクにもなります。',
  ]);

// =====================================================================
// 15. PEST要因の影響度マップ
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ⑥　影響度マップ', '最重要の監視対象は、Appleの調達動向と中国勢・日中関係', [
    'PESTで挙げた要因を、事業への影響の大きさと、先行きの不確実性の2つの軸で並べ直しました。これは出典の事実をもとにした、この資料としての定性的な評価です。',
    '右上は、影響が大きく、しかも先が読みにくい要因で、最も注意して見ておくべきものです。Appleの調達先の分散、日中関係や中国の国産化、そして為替がここに入ります。',
    '左上は、影響は大きいが方向がある程度見えている要因で、計画に織り込むべきものです。スマホ市場の縮小、付加価値型の市場成長、高密度化の進展がここに入ります。',
    '右下のフィジカルAIやメモリ逼迫は、まだ影響は中くらいですが、兆しを見張る必要があります。',
    '左下の動画需要、安全規制、人手不足、政府支援は、方向がはっきりしている追い風で、定期的に確認すればよい要因です。',
  ]);
  const px = 1.2;
  const py = 1.55;
  const pw = 7.55;
  const ph = 4.95;
  slide.addShape(pres.shapes.RECTANGLE, { x: px, y: py, w: pw, h: ph, fill: { color: C.white }, line: { color: C.line, width: 1 } });
  // 右上の象限を薄く塗る
  slide.addShape(pres.shapes.RECTANGLE, { x: px + pw / 2, y: py, w: pw / 2, h: ph / 2, fill: { color: SWOT.T.tint }, line: { color: SWOT.T.tint, width: 0.5 } });
  addLine(slide, px + pw / 2, py, px + pw / 2, py + ph, { color: C.line, width: 1, dash: 'dash' });
  addLine(slide, px, py + ph / 2, px + pw, py + ph / 2, { color: C.line, width: 1, dash: 'dash' });
  // 象限の名前。下の2つは中央線のすぐ下に置き、要因の枠と重ならないようにする
  const corner = [
    ['計画に織り込む', px + 0.1, py + 0.06, 'left'],
    ['最重要の監視対象', px + pw - 3.1, py + 0.06, 'right'],
    ['定期的に確認', px + 0.1, py + ph / 2 + 0.05, 'left'],
    ['兆しを見張る', px + pw - 3.1, py + ph / 2 + 0.05, 'right'],
  ];
  corner.forEach(([text, x, y, align]) => addText(slide, text, x, y, 3.0, 0.28, { fontSize: 10.5, bold: true, color: C.muted, align }));
  // 軸
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
    [PEST.E, '−', 'スマホ市場の縮小', colLeftB, 2.12],
    [PEST.E, '＋', '市場の付加価値型成長', colLeftA, 2.72],
    [PEST.T, '＋', '高密度化・3D集積の進展', colLeftB, 3.32],
    [PEST.P, '−', 'Appleの調達先分散', colRightA, 2.12],
    [PEST.P, '−', '日中関係・中国の国産化', colRightB, 2.72],
    [PEST.E, '±', '為替（円高への反転）', colRightA, 3.32],
    [PEST.S, '＋', '動画需要の拡大', colLeftB, 4.6],
    [PEST.P, '＋', '車の安全規制（DMS義務化）', colLeftA, 5.17],
    [PEST.S, '＋', '人手不足と省人化', colLeftB, 5.74],
    [PEST.P, '＋', '政府の支援（経済安全保障）', colLeftA, 6.26],
    [PEST.T, '＋', 'フィジカルAI・ロボット', colRightB, 4.6],
    [PEST.T, '−', 'メモリ逼迫による供給リスク', colRightA, 5.17],
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

  // 右：読み方と凡例
  const rx = 9.15;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 2.95, { fill: SWOT.T.tint });
  addText(slide, '最重要の監視対象（右上）', rx + 0.2, 1.65, rw - 0.4, 0.34, { fontSize: 13, bold: true, color: SWOT.T.color });
  addBullets(slide, [
    lead('Appleの調達先分散：', 'iPhone 18（2027年）以降でSamsung製の比率がどこまで上がるか'),
    lead('日中関係・中国勢：', '中国スマホ大手の調達方針と、中国勢の国産化の速さ'),
    lead('為替：', '円高に振れると、ここ数年の増益要因が逆に働く'),
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
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ①　全体像', '技術・規模の強みと、スマホ・特定顧客への依存が表裏一体', [
    'ここからSWOT分析です。SWOTは、会社の内側の強み（Strengths）と弱み（Weaknesses）、外側の機会（Opportunities）と脅威（Threats）を、4つのマスに整理する方法です。',
    '強みは、世界シェア約5割の規模、業界の節目を作ってきた技術、高い収益力、大手顧客と作り込む開発体制です。',
    '弱みは、センサー売上の約79%がスマホ向けであることや、特定の大手顧客への依存、九州への生産集中、重い設備投資です。強みの裏返しになっている点が特徴です。',
    '機会は、大判化の再加速、車載、フィジカルAI、TSMCとの合弁や政府支援です。',
    '脅威は、Appleの調達先分散の報道、中国勢の台頭、スマホ市場の縮小、地政学や災害です。',
    '次のページから、それぞれの根拠を詳しく見ていきます。',
  ]);
  const colW = (CONTENT_W - 0.6 - 0.15) / 2;
  const x1 = MARGIN_X + 0.6;
  const x2 = x1 + colW + 0.15;
  addText(slide, 'プラス要因（活かす）', x1, 1.48, colW, 0.3, { fontSize: 12, bold: true, color: C.muted, align: 'center' });
  addText(slide, 'マイナス要因（備える）', x2, 1.48, colW, 0.3, { fontSize: 12, bold: true, color: C.muted, align: 'center' });
  const qh = 2.42;
  const rowsY = [1.85, 1.85 + qh + 0.12];
  // 行の見出しは縦書きにする
  ['内部環境', '外部環境'].forEach((label, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: MARGIN_X, y: rowsY[i], w: 0.46, h: qh, rectRadius: 0.06, fill: { color: C.primary }, line: { color: C.primary, width: 0.5 },
    });
    addText(slide, label, MARGIN_X, rowsY[i], 0.46, qh, { fontSize: 12.5, bold: true, color: C.white, align: 'center', valign: 'middle', vert: 'eaVert' });
  });
  const quadrants = [
    [SWOT.S, x1, rowsY[0], [
      '世界シェア約5割、モバイル向けは57%（Yole）',
      '積層・2層画素・LOFICなど先端技術を量産',
      '高い収益力（2025年度の営業利益率16.6%）',
      '大手顧客・中国大手と作り込む開発体制',
      '用途をまたぐ技術の循環と、量産・復旧の力',
    ]],
    [SWOT.W, x2, rowsY[0], [
      'センサー売上の約79%がスマホ向け',
      '特定の大手顧客への依存（業績が連動）',
      '生産拠点が九州に集中（地震で停止）',
      '垂直統合ゆえの重い設備投資と資本効率',
      '車載は後発、中低価格帯は中国勢が優勢',
    ]],
    [SWOT.O, x1, rowsY[1], [
      'センサー大判化の再加速（2027年度〜）',
      '車載の多眼化とドライバー監視の義務化',
      'フィジカルAI・工場の自動化（三菱電機と合弁）',
      'TSMCとの合弁と政府支援で先端化・供給力',
      '付加価値型の市場成長（2031年に303億ドル）',
    ]],
    [SWOT.T, x2, rowsY[1], [
      'AppleのSamsung製センサー併用（報道）',
      '中国勢の台頭（シェア21%、国産化）',
      '2026年のスマホ出荷−16.7%（IDC）',
      'メモリ逼迫・関税・日中関係などの地政学',
      '自然災害と、為替（円高）への反転',
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
buildSwotDetail(SWOT.S, 'SWOT分析 ②　強み（Strengths）', '規模・技術・収益力がそろった「一強」の土台',
  [
    { value: '約50%', label: '世界シェア（2025年、Yole）。日経業界地図では53.6%で、2位の約4倍' },
    { value: '57%', label: 'モバイル向けのシェア（2025年、Yole）' },
    { value: '16.6%', label: '営業利益率（2025年度）。2026年度は19.9%の計画' },
  ],
  [
    { head: '規模と地位', body: '世界シェアは約50%（Yole）〜53.6%（日経業界地図）。モバイル・産業・写真用で首位級。規模が大きいほど、最先端品の開発費と設備投資を回収しやすい' },
    { head: '業界の節目を作ってきた技術', body: '裏面照射型（2009）→積層型（2012）→Cu-Cu接続（2015）→2層トランジスタ画素（2021）→LOFIC（2026）。Yoleも今後の3D積層の代表例にソニーを挙げる' },
    { head: '収益力と投資余力', body: '2025年度の営業利益は3,573億円、調整後OIBDAは6,588億円。2026年度はさらに4,200億円への増益を見込む' },
    { head: '顧客と作り込む開発力', body: '最先端の大判センサーを大手顧客や中国大手と共同で作り込む。「5つの特性をバランスよく製品に仕上げることが強み」（SSSのCFO、2025年）' },
    { head: '技術の循環と量産・復旧の力', body: 'スマホ・車載・産業で生まれた技術を相互に展開（CTO）。ウエハー生産能力は月15.8万枚。2026年の地震では約3週間で操業水準へ戻す見込み（2016年は約3か月）' },
  ],
  '出所：Yole Group（2026-08-03）、日経業界地図2027年版（デジカメライフ 2026-08-21）、ソニーグループ決算説明資料（2026-05-08・07-31）、SSS「沿革」「熊本地震 第2報」、EE Times Japan（2025-06-13・2026-05-15・07-31）',
  [
    '強みを5つに整理しました。',
    '1つ目は規模と地位です。世界シェアは約5割で、2位の約4倍です。最先端のセンサーは開発費も設備投資も大きいので、たくさん売れる会社ほど回収しやすく、さらに次の開発に投資できるという好循環があります。',
    '2つ目は技術です。裏面照射型、積層型、2層トランジスタ画素など、業界の節目となる技術を自ら生み、量産してきました。',
    '3つ目は収益力です。2025年度の営業利益率は16.6%で、2026年度は約20%の計画です。',
    '4つ目は、顧客と作り込む開発力です。スマホメーカーと共同で、次の機種のためのセンサーを作り込んでいます。',
    '5つ目は、用途をまたいで技術を回す仕組みと、量産・復旧の力です。2026年の熊本地震では、2016年の経験を生かし、約3週間で操業水準に戻す見込みを示しました。',
  ]);

// =====================================================================
// 18. 弱み
// =====================================================================
buildSwotDetail(SWOT.W, 'SWOT分析 ③　弱み（Weaknesses）', '強みの裏返しとして、依存と集中のリスクを抱える',
  [
    { value: '約79%', label: 'イメージセンサー売上に占めるスマホ（モバイル）向けの比率（2025年度）' },
    { value: '約3か月', label: '2016年の熊本地震で、熊本の工場が稼働水準に戻るまでの期間' },
    { value: '2014年', label: '車載用センサーの商品化の発表。業界では後発' },
  ],
  [
    { head: 'スマホへの依存', body: '2025年度のイメージセンサー売上1兆9,832億円のうち、モバイル向けが1兆5,611億円（約79%）。スマホ市場の変動がそのまま業績に響く' },
    { head: '特定顧客への集中', body: '「大手顧客」向けの出荷が業績を左右する。2024年は主要顧客の販売が想定を下回り、中国ハイエンドでの競争激化もあって、シェアが横ばい（53%）にとどまった' },
    { head: '生産の地理的な集中', body: '前工程の主力拠点が九州（熊本・長崎・大分・鹿児島）に集中。2016年と2026年に熊本の主力工場が地震で止まった' },
    { head: '重い投資と資本効率', body: '研究開発から製造まで自社で行う垂直統合型で、設備投資が重い。2023年度は新製品の歩留まり問題が経営に大きく影響。第5次中計では設備投資を前中計の約7割に抑える' },
    { head: '車載・中低価格帯での劣位', body: '車載はOmniVisionが首位（Yole）。セキュリティや中低価格のスマホでは中国勢が強い。米国内に生産拠点がなく、「米国での自社量産はハードルが高い」（ソニー）' },
  ],
  '出所：ソニーグループ 2025年度決算補足資料（EE Times Japan 2026-05-18 による）、EE Times Japan（2024-06-03・2025-06-13・10-02・11-11・2026-07-31）、SSS「熊本地震 第1報・第2報」、Yole Group（2026-08-03）',
  [
    '弱みです。多くは強みの裏返しになっています。',
    '1つ目はスマホへの依存です。イメージセンサー売上の約79%がスマホ向けなので、スマホ市場が縮むと業績に直接響きます。',
    '2つ目は特定顧客への集中です。大手顧客の新機種の売れ行きが業績を左右します。実際、2024年は主要顧客の販売が想定を下回り、シェアが伸びませんでした。',
    '3つ目は生産拠点の集中です。主力の工場が九州に集まっているため、地震などの災害の影響を受けやすい構造です。2016年の熊本地震では、元の稼働水準に戻るまで約3か月かかりました。',
    '4つ目は投資の重さです。工場を自前で持つため設備投資の負担が大きく、2023年度には新製品の歩留まり問題が経営に大きく影響しました。',
    '5つ目は、車載や中低価格帯での劣位です。車載はオムニビジョンが首位で、ソニーの参入は2014年と後発でした。',
  ]);

// =====================================================================
// 19. 機会
// =====================================================================
buildSwotDetail(SWOT.O, 'SWOT分析 ④　機会（Opportunities）', 'スマホの「大判化」と、車載・フィジカルAIに成長の余地',
  [],
  [
    { head: '大判化の再加速', body: 'ソニーは次期中計（2027〜2029年度）の期間に、センサー大判化の再加速で成長軌道に戻ると説明。市場も数量より単価で伸びる（Yole：2031年に303億ドル）' },
    { head: '車載の多眼化と安全規制', body: '1台あたりのカメラは約8個（2024〜25年度発売車）から約12個（2027〜28年度）へ（ソニー予測）。車室内カメラは年15%以上の成長。2026年度には主要自動車メーカー20社の9割がソニー製を採用する見通し' },
    { head: 'フィジカルAI・工場の自動化', body: '「フィジカルAIによってセンサー需要が大きく拡大する可能性」（十時CEO）。三菱電機と工場向けAIビジョンセンサーの合弁。産業用ではソニーが優位（Yole）' },
    { head: '先端化と供給力の拡張', body: 'TSMCとの合弁で先端プロセスを取り込み、自社工場の能力に縛られていた供給の上限を引き上げる。国も合志市の新工場に最大600億円を助成' },
    { head: 'デジタルカメラと新しい撮影スタイル', body: '2026年度はデジカメ向けセンサーの増収を見込む（ソニー）。ハンドヘルド型など新しい動画撮影スタイルのカメラ市場も広がる' },
  ],
  '出所：EE Times Japan（2024-06-03・2025-07-07・10-02・2026-05-08・05-18・08-26）、ソニーグループ FY2025決算説明資料（2026-05-08）、Yole Group（2026-08-03）、経済産業省（2026-04-17）',
  [
    '機会です。左のグラフは、ソニー自身が示している車載用センサーの金額シェアで、2021年度の9%から2024年度には37%まで伸び、2026年度に43%を目指しています。',
    '1つ目の機会は、スマホ用センサーの大判化の再加速です。ソニーは、2026年度はいったん減速するものの、2027年度からの次期中計の期間には再び成長軌道に戻ると説明しています。',
    '2つ目は車載です。1台の車に載るカメラの数が増え、車室内のカメラも規制で増えます。主要自動車メーカーの9割がソニー製を採用する見通しです。',
    '3つ目はフィジカルAIと工場の自動化です。十時CEOは、フィジカルAIでセンサー需要が大きく伸びる可能性に言及しています。',
    '4つ目は、TSMCとの合弁と国の支援による先端化と供給力の拡張、5つ目はデジタルカメラです。',
  ],
  {
    leftPanel: (slide, x, y, w, h) => {
      addCard(slide, x, y, w, h, { fill: SWOT.O.tint });
      addText(slide, '車載用センサーの\n金額シェア（ソニー調べ）', x + 0.18, y + 0.12, w - 0.36, 0.55, { fontSize: 12, bold: true, color: SWOT.O.color });
      const cats = ['21年度', '22年度', '23年度', '24年度', '26年度目標'];
      const shares = [9, 25, 32, 37, 43];
      slide.addChart(pres.charts.BAR, [{ name: 'シェア', labels: cats, values: shares }], {
        x: x + 0.1, y: y + 0.7, w: w - 0.2, h: 3.35, barDir: 'col', barGapWidthPct: 50,
        chartColors: [SWOT.O.color, SWOT.O.color, SWOT.O.color, SWOT.O.color, '9DB6E0'],
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
        catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9.5, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
        valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 50, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
        showLegend: false,
      });
      addText(slide, '200万画素以上・車室内用を除く市場での金額シェア（ソニー調べ）。25年度の値は開示なし', x + 0.18, y + 4.15, w - 0.36, 0.7, { fontSize: 9.5, color: C.muted });
    },
  });

// =====================================================================
// 20. 脅威
// =====================================================================
buildSwotDetail(SWOT.T, 'SWOT分析 ⑤　脅威（Threats）', '最大顧客の調達先分散と中国勢の台頭が同時に進む',
  [
    { value: '20〜30%', label: '2027年までにSamsungが得る可能性があるiPhone向けセンサー数量の比率（SemiAnalysisの推計、報道）', size: 26 },
    { value: '21%', label: '中国勢のシェア（2025年、Yole）。韓国勢（17%）を抜いて2位に' },
    { value: '−16.7%', label: '2026年のスマホ出荷の予測（IDC、2026年8月）', size: 28 },
  ],
  [
    { head: '最大顧客の調達先分散', body: 'AppleはSamsungのオースティン工場で新技術のチップ製造を進める（2025年8月発表）。iPhone 18向けの3層積層センサーとの報道。約10年続いたとされるソニーの独占供給が崩れる可能性' },
    { head: '中国勢の台頭', body: '中国勢のシェアは21%で韓国を抜き2位（Yole）。OmniVisionは車載で首位、SmartSensは主要各社で最も勢いがある。国内のファウンドリーやモジュール会社と組み、コストと開発の速さを高める' },
    { head: 'スマホ市場の縮小', body: '2026年は過去最大の落ち込み（IDC）。ソニーも2026年度の下期には、メモリ市況の影響がハイエンド機種の出荷にも及ぶと想定' },
    { head: '供給網と地政学', body: 'AI向けメモリの逼迫が積層型センサーの供給リスクに（Yole）。ロジック側はTSMCに委託。米国の関税や日中関係の緊張も続く' },
    { head: '災害と為替', body: '熊本の主力工場は2016年・2026年と地震で停止。円安の追い風（2026年4〜6月の営業利益+232億円）は、円高になれば逆回転する' },
  ],
  '出所：Apple（2025-08-06）、MacRumors（2025-12-24）、Sammy Fans（2026-01-11、SemiAnalysisの推計を紹介）、EE Times Japan（2026-01-15・05-08・07-31）、Yole Group（2026-08-03）、IDC（2026-08-26）、ソニーグループ決算説明資料（2026-07-31）',
  [
    '脅威です。',
    '1つ目は、最大顧客とみられるAppleの調達先の分散です。AppleはSamsungの米国工場での新しいチップ製造を発表し、iPhone 18向けのセンサーではないかと報じられています。アナリストの推計では、2027年までにiPhone向けの20〜30%をSamsungが取る可能性があるとされます。これは報道と推計で、確定した事実ではない点に注意してください。',
    '2つ目は中国勢の台頭です。中国勢は地域別シェアで韓国を抜いて2位になり、車載ではオムニビジョンが首位です。',
    '3つ目はスマホ市場の縮小、4つ目はメモリや地政学を含む供給網のリスクです。',
    '5つ目は災害と為替です。熊本の工場は10年間で2度、地震で止まりました。また、ここ数年の利益には円安の効果も含まれています。',
  ]);

// =====================================================================
// 21. クロスSWOT
// =====================================================================
{
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ⑥　クロスSWOT', '攻めは「技術の横展開」、守りは「分散」が鍵になる', [
    'クロスSWOTは、強み・弱みと、機会・脅威を掛け合わせて、打ち手の方向を考える方法です。ここに挙げた打ち手は、ソニーが公表している施策も含めて、この資料として整理したものです。',
    '左上の「強み×機会」は攻めの打ち手です。スマホで培った技術を車載やロボットに広げ、TSMCとの合弁で高密度化を早めて、2027年度からの大判化の再加速を取り込むことです。',
    '右上の「弱み×機会」は、機会を使って弱みを補う打ち手です。車載・産業・フィジカルAIを伸ばしてスマホ依存を下げ、合弁によるファブライト化で投資の重さを和らげます。',
    '左下の「強み×脅威」は守りの打ち手です。技術の先行で、ハイエンド機種の主要サプライヤーの地位を守り、中国勢とは価格競争を避けます。',
    '右下の「弱み×脅威」は、最悪の組み合わせを避ける打ち手です。生産拠点の分散や災害への備え、米国での供給手段の検討、固定費の管理が挙げられます。',
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
      ['2層画素やLOFICなどの技術を、', { text: 'スマホから車載・ロボットへ展開する', softBreakBefore: true }],
      ['TSMCとの合弁で高密度化を早め、', { text: '2027年度からの大判化の再加速を取り込む', softBreakBefore: true }],
      ['産業用の優位を土台に、工場向けAIビジョン', { text: '（三菱電機との合弁）を事業化する', softBreakBefore: true }],
    ]],
    [xW, yO, 'WO：転換', SWOT.O, [
      ['車載・産業・フィジカルAIを伸ばし、', { text: 'スマホ依存を下げる（車載シェア43%目標）', softBreakBefore: true }],
      ['ファブライト化で投資の負担を分け合い、', { text: '資本効率を上げる', softBreakBefore: true }],
      '国の助成を使い、新工場の投資リスクを下げる',
    ]],
    [xS, yT, 'ST：守り', SWOT.T, [
      ['大判・3層積層・LOFICの先行で、', { text: 'ハイエンド機種の主要サプライヤーの地位を守る', softBreakBefore: true }],
      ['画質のノウハウが効く上位機種に集中し、', { text: '中国勢との価格競争を避ける', softBreakBefore: true }],
      ['中国大手や車載など顧客の幅を広げ、', { text: '特定顧客への集中を和らげる', softBreakBefore: true }],
    ]],
    [xW, yT, 'WT：回避', SWOT.T, [
      '生産拠点の分散とBCP（耐震化・代替生産）を強める',
      ['米国での供給手段を検討し続ける', { text: '（パートナーとの共同投資など）', softBreakBefore: true }],
      ['為替・メモリ市況の変動を前提に、', { text: '固定費と投資を機動的に管理する', softBreakBefore: true }],
    ]],
  ];
  cells.forEach(([x, y, head, lens, items]) => {
    addCard(slide, x, y, cellW, cellH, { fill: C.gray, line: C.grid, lineWidth: 0.75 });
    addText(slide, head, x + 0.2, y + 0.1, cellW - 0.4, 0.34, { fontSize: 13, bold: true, color: lens.color });
    addBullets(slide, items, x + 0.25, y + 0.52, cellW - 0.45, cellH - 0.6, { fontSize: 11.5, space: 6 });
  });
  addSource(slide, '出所：SWOT分析 ②〜⑤ の各出典、ソニーの公表施策（TSMCとの合弁、三菱電機との合弁、車載シェア目標など）。組み合わせと打ち手の整理は本資料による');
}

// =====================================================================
// 22. ソニーの打ち手の評価
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ①　ソニーの打ち手の評価', '公表済みの施策は方向が合っている。論点は実行と残るリスク', [
    'ソニーがすでに公表している施策を、クロスSWOTのどこに当たるかと合わせて評価しました。',
    '最も大きいのはTSMCとの合弁です。先端プロセスによる高密度化、供給力の拡張、投資負担の軽減という3つのねらいがあり、攻めと転換の両方に効きます。一方で、差別化の源泉である画素側の製造に初めて外部が関わるため、技術の管理が論点になります。',
    '高密度化は量産の時期が公表されておらず、2023年度に起きた歩留まり問題の教訓を生かせるかが鍵です。',
    '車載は2026年度の黒字化目標、フィジカルAIは市場の立ち上がり方の見極めが試金石です。',
    '低収益事業の整理と固定費の管理、災害への備えも進んでいますが、九州への生産集中という構造そのものは残ります。',
    '表の右端の評価と論点は、この資料としての見方です。',
  ]);
  const rows = tableRows(['公表済みの施策', 'ねらい', '関係', '評価と論点（本資料の見方）'], [
    [[{ text: 'TSMCとの合弁', options: { breakLine: true } }, { text: '（2029年量産、出資総額 約7,470億円）' }], '先端プロセスでの高密度化、供給力の拡張、投資負担の軽減（ファブライト化の第一歩）', 'SO・WO', '差別化の源泉である画素側の製造に初めて外部が関わる。技術の管理と主導権（ソニーが単独の支配株主）、需要に応じた段階的な投資が鍵'],
    ['高密度化（画素22〜28nm相当・ロジック12nm・多層化）', '5つの特性の底上げと動画性能の向上', 'SO・ST', '量産の時期は非公表。2023年度の歩留まり問題の教訓を生かし、立ち上げを安定させられるか'],
    ['車載の拡大（シェア43%目標、車室内へ参入）', 'スマホ依存の低減と将来の柱づくり', 'WO', '2026年度の黒字化目標が試金石。首位OmniVisionとの競争'],
    ['フィジカルAI・工場の自動化（三菱電機との合弁、2025年9月にインテリジェントシステム開発部門を新設）', '新しい事業の柱づくり', 'SO・WO', '市場の立ち上がり方はまだ不透明（CTO）。小さく始めて育てる段階'],
    ['低収益事業の整理（イスラエル子会社の持分売却、ディスプレイ事業の減損）と固定費の管理', '収益性の改善', 'W', '2026年度は一時費用がなくなり増益。研究開発費も抑える計画'],
    ['災害への備え（耐震化、パートナーとの連携）', '災害時の早期復旧', 'WT', '2026年の地震は約3週間での復旧を見込む（2016年は約3か月）。ただし九州への生産集中は残る'],
  ], { fontSize: 10 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.5, 2.7, 0.8, CONTENT_W - 7.0], { fontSize: 10, rowH: [0.36, 0.86, 0.72, 0.6, 0.86, 0.72, 0.72] });
  addSource(slide, '出所：SSS「TSMCとの合弁の確定契約」（2026-08-11）、EE Times Japan（2024-06-03・2025-06-19・07-07・2026-05-08・05-15・07-31・08-12）、ソニーグループ FY2025決算説明資料（2026-05-08）。評価は本資料による');
}

// =====================================================================
// 23. 今後の注目点
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ②　今後の注目点', 'これから1〜3年で見るべき7つの指標', [
    '今後の注目点を、見るべき指標や出来事と、時期の目安で整理しました。',
    '最も重要なのは、大手顧客の調達動向です。iPhone 18シリーズで、Samsung製のセンサーがどの範囲で使われるかが、ソニーのモバイル売上に直接響きます。',
    '次に、スマホ市況とメモリ価格です。2026年度の下期に、ハイエンド機種まで影響が広がるかを見ます。',
    '3つ目は次期中期経営計画です。2027年度から2029年度の成長率や設備投資、ファブライト化の具体策が示されるはずです。発表時期は、例年の傾向からの推定です。',
    '4つ目以降は、TSMCとの合弁の立ち上げ、車載の黒字化、中国勢と日中関係、米国の通商政策です。',
    'これらの結果によって、この資料のSWOTの評価も変わるので、定期的に見直すことをおすすめします。',
  ]);
  const rows = tableRows(['注目点', '見るべき指標・出来事', '時期の目安', '関係'], [
    ['① 大手顧客の調達', 'iPhone 18でのSamsung製センサーの採用範囲、ソニーのモバイル売上', '2026年秋〜2027年', 'T'],
    ['② スマホ市況とメモリ価格', 'IDCなどの出荷予測、ソニーの下期のモバイル売上', '2026年10月〜2027年3月', 'T・O'],
    ['③ 次期中期経営計画', '2027〜2029年度の成長率、設備投資、ファブライト化の中身', '2027年春ごろ（例年からの推定）', 'O・W'],
    ['④ TSMCとの合弁の立ち上げ', '当局の許認可、政府支援の規模、量産の開始', '2026〜2029年', 'O'],
    ['⑤ 車載の収益化', '車載事業の黒字化、金額シェア43%の達成', '2026年度の決算', 'O・W'],
    ['⑥ 中国勢と日中関係', '中国勢のシェア、輸出規制の範囲、中国スマホ大手の調達', '随時', 'T'],
    ['⑦ 米国の通商政策', '232条関税の対象拡大、日米合意の運用、Appleの米国調達', '随時', 'T'],
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
  addText(slide, '「一強」の土台を、次の成長の形に作り替えられるか', 0.8, 1.35, 11.7, 0.7, { fontSize: 26, bold: true, color: C.white, valign: 'middle' });
  const messages = [
    ['強さの源泉', '大判・高付加価値のセンサー × 大手顧客との作り込み × 量産力。2025年度は過去最高の業績で、シェアも外部調査で約5割に達した'],
    ['転換点', '2026〜2027年は、スマホ市場の縮小、最大顧客の調達先分散（報道）、中国勢の台頭が重なる。強みの裏返しである「依存」と「集中」が試される'],
    ['次の成長の条件', 'TSMCとの合弁による先端化と投資の効率化、車載・フィジカルAIによる用途と顧客の分散を、同時に進められるか。次期中期計画（2027〜2029年度）が試金石'],
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
    '1つ目、ソニーのイメージセンサー事業の強さは、大判で付加価値の高いセンサーを、大手顧客と作り込み、大量に安定して作れることにあります。その結果、2025年度は過去最高の業績となり、外部調査でもシェアが約5割に達しました。',
    '2つ目、しかし2026年から2027年は、スマホ市場の縮小、最大顧客とみられるAppleの調達先分散の報道、中国勢の台頭が重なる転換点です。強みの裏返しである、スマホや特定顧客への依存、九州への生産集中が試されます。',
    '3つ目、次の成長の条件は、TSMCとの合弁による先端化と投資の効率化、そして車載やフィジカルAIによる用途と顧客の分散を、同時に進められるかです。2027年度からの次期中期計画が、その答えを示す場になると考えます。',
    'この資料は公開情報に基づく整理であり、将来の業績や株価を予想するものではありません。',
  ].join('\n'));
}

// =====================================================================
// 25. 用語集
// =====================================================================
{
  const slide = newContentSlide(null, '付録 ①　用語集', 'この資料に出てくる主な用語', [
    'この資料に出てくる専門用語の意味をまとめました。',
    '特に、積層型、大判化、ファブライトの3つは、ソニーの戦略を理解するうえで重要な言葉です。',
    '積層型は、画素のチップと信号処理のチップを別々に作って貼り合わせる構造で、ソニーの競争力の中心です。',
    '大判化は、センサーの面積を大きくすることで、画質が上がり、1個あたりの単価も上がります。',
    'ファブライトは、工場への投資を減らし、製造の一部を外部に任せる経営のことで、TSMCとの合弁はその第一歩と位置付けられています。',
  ]);
  const rows = tableRows(['用語', '意味'], [
    ['CMOSイメージセンサー（CIS）', '光を電気信号に変える半導体。スマホやカメラ、車の「目」にあたる'],
    ['裏面照射型', '配線の裏側から光を当て、光を受ける面積を広げて感度を高めた構造'],
    ['積層型', '画素のチップと信号処理回路のチップを別々に作り、貼り合わせた構造'],
    ['2層トランジスタ画素', '画素の中の受光部（フォトダイオード）とトランジスタを別の層に分けた構造'],
    ['LOFIC', '画素にためきれない電荷を横の容量にためる構造。明暗差の大きい場面を1回の撮影で写せる'],
    ['大判化', 'センサーの面積（光学サイズ）を大きくすること。画質が上がり、単価も上がる'],
    ['ADAS / DMS', '先進運転支援システム ／ ドライバーの居眠りやわき見を検知する監視システム'],
    ['フィジカルAI', 'ロボットや車など、現実の世界で見て、判断して、動くAI'],
    ['IDM（垂直統合型） / ファブライト', '設計から製造まで自社で行うメーカー ／ 工場への投資を減らし製造の一部を外部に任せる経営'],
    ['ToF・SPAD / SWIR / EVS', '光の往復時間で距離を測る技術 ／ 短波長赤外線を写すセンサー ／ 動きだけを捉えるセンサー'],
    ['I&SS分野 / SSS', 'ソニーの「イメージング＆センシング・ソリューション」分野 ／ ソニーセミコンダクタソリューションズ'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.6, CONTENT_W - 3.6], { fontSize: 11, rowH: 0.42 });
  addSource(slide, '出所：SSS「沿革」「2層トランジスタ画素」「LOFIC搭載センサー」、EE Times Japan（2025-10-02・2026-05-08）の説明をもとに本資料で平易に言い換えた');
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
  addSource(slide, '青字のドメイン名をクリックすると出典のページが開く（確認日 2026-09-27）。取得状況と保存先は生成元フォルダの「参考文献リンク.md」にまとめた', { y: 7.02, h: 0.3 });
  return slide;
}

const REF_SPLIT = 25;
buildReferenceSlide('②', REFERENCES.slice(0, REF_SPLIT), 1, [
  '参考文献の前半です。ソニーグループの決算資料、ソニーセミコンダクタソリューションズの発表、経済産業省、調査会社の資料、AppleとSamsungに関する発表と報道です。',
  'ソニーの決算資料は、ソニーが米国の証券取引委員会（SEC）に提出している英語版を参照しました。日本語版の決算資料と数値は同じです。',
  '各項目の末尾にある青字のドメイン名をクリックすると、出典のページが開きます。',
  '取得状況と保存したファイルは、生成元フォルダの「参考文献リンク.md」にまとめています。',
]);
buildReferenceSlide('③', REFERENCES.slice(REF_SPLIT), REF_SPLIT + 1, [
  '参考文献の後半です。AppleとSamsungに関する報道の続き、SK hynixの撤退の報道、通商・地政学の解説、地域の水資源の調査、業界メディアのEE Times Japanの記事です。',
  'AppleのSamsung製センサー採用は、Appleの公式発表では「新しいチップ製造技術」とだけ書かれており、イメージセンサーであるという点は報道とアナリストの推計です。',
  'EE Times Japanの記事は、ソニーの事業説明会や決算説明会での発言を確認するために使いました。',
]);

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
