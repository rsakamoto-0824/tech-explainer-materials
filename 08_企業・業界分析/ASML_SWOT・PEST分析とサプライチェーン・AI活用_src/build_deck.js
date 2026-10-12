// ASML：SWOT分析・PEST分析、サプライチェーンの可視化、AI活用の状況
// pptxgenjs でスライドを組み立てる。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 数値はすべて公開資料からの引用で、出典は各スライドの下と参考文献スライドに示す（確認日 2026-10-10）。
// 「本資料の見方」「本資料で計算」と書いた配置・打ち手・比率は、出典の事実をもとにした整理で、出典そのものの記載ではない。
// 補助関数の多くは、同じフォルダにあるサムスン版（../Samsungイメージセンサー事業_SWOT・PEST分析_src/build_deck.js）と同じ。


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
const DECK_DATE = '2026年10月10日';
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
  // 露光の光の色。EUV（極端紫外光）を紫、DUV（深紫外光）を青で表す。資料全体のモチーフ（ウエハー）にも使う
  EUV: '6A3DB0',
  EUVLight: 'C9B6EA',
  DUV: '2F62C0',
  wafer: '9AA7C7',
  amber: 'B8741A',
  R: 'C0392B',
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
const PARTS = ['現在地', '供給網', 'AI活用', 'PEST', 'SWOT', '示唆'];
const PART = { NOW: 0, SUPPLY: 1, AI: 2, PEST: 3, SWOT: 4, IMPLICATION: 5 };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = 'ASMLのSWOT分析・PEST分析 ― サプライチェーンとAI活用';
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

// ウエハー（円板）と、その上に並ぶチップの小さな印。資料全体のモチーフ
function drawWafer(slide, x, y, size, { body = C.primary, die = C.EUVLight } = {}) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color: body }, line: { color: body, width: 0.5 } });
  const cell = size * 0.2;
  const gap = size * 0.06;
  const start = x + (size - (3 * cell + 2 * gap)) / 2;
  const top = y + (size - (3 * cell + 2 * gap)) / 2;
  // 円に収まる十字形の5区画をチップに見立てる
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].forEach(([c, r]) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: start + c * (cell + gap), y: top + r * (cell + gap), w: cell, h: cell,
      fill: { color: die }, line: { color: die, width: 0.25 },
    });
  });
}

// 大きな数字と説明のタイル
function addStat(slide, x, y, w, h, value, label, { color = C.primary, fill = C.gray, valueSize = 28, labelSize = 11 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addText(slide, value, x + 0.18, y + 0.1, w - 0.36, h * 0.52, { fontSize: valueSize, bold: true, color, valign: 'middle' });
  addText(slide, label, x + 0.18, y + h * 0.6, w - 0.36, h * 0.36, { fontSize: labelSize, color: C.muted, valign: 'top' });
}

// ---- スライド共通 ----

function addPartTracker(slide, activeIndex) {
  const w = 0.74;
  const h = 0.27;
  const gap = 0.05;
  const x0 = RIGHT_EDGE - (PARTS.length * w + (PARTS.length - 1) * gap);
  PARTS.forEach((part, i) => {
    const active = i === activeIndex;
    const x = x0 + i * (w + gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 0.33, w, h, rectRadius: 0.13,
      fill: { color: active ? C.primary : C.gray }, line: { color: active ? C.primary : C.line, width: 0.75 },
    });
    addText(slide, part, x, 0.33, w, h, { fontSize: 9, bold: active, color: active ? C.white : C.muted, align: 'center', valign: 'middle' });
  });
}

function newContentSlide(partIndex, kicker, title, notes, { accent = C.primary } = {}) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  drawWafer(slide, MARGIN_X, 0.35, 0.24);
  addText(slide, kicker, MARGIN_X + 0.36, 0.31, 6.9, 0.32, { fontSize: 12, bold: true, color: accent, charSpacing: 1, valign: 'middle' });
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
  addText(slide, 'ASMLへの影響', colX[2], 1.5, impactW, 0.28, { fontSize: 10.5, bold: true, color: C.muted });

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
  addText(slide, 'ASML ｜ SWOT & PEST ｜ SUPPLY CHAIN ｜ AI', 0.8, 1.2, 7.8, 0.35, { fontSize: 13, bold: true, color: C.primaryLight, charSpacing: 2 });
  addText(slide, withBreaks(['ASMLのSWOT分析・PEST分析', 'サプライチェーンとAI活用']), 0.8, 1.65, 7.9, 1.6, { fontSize: 34, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, 'AI需要で過去最高を更新する露光装置の独占企業は、\n地政学とサプライチェーンの制約をどう越えるか', 0.8, 3.5, 7.6, 0.9, { fontSize: 18, color: C.onDarkSub, lineSpacingMultiple: 1.1 });
  addText(slide, '決算発表・年次報告書・各国政府・調査会社・業界メディアの公開情報をもとに整理', 0.8, 4.6, 7.6, 0.4, { fontSize: 13, color: C.primaryLight });
  addText(slide, `${DECK_DATE}時点　｜　社内情報は使用していません`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右側：ウエハーと、その上に並ぶチップ。左上ほど明るく、露光の光が当たっている様子を表す
  const cx = 10.65;
  const cy = 3.25;
  const radius = 1.85;
  slide.addShape(pres.shapes.OVAL, {
    x: cx - radius - 0.12, y: cy - radius - 0.12, w: (radius + 0.12) * 2, h: (radius + 0.12) * 2,
    fill: { color: C.nightCard }, line: { color: C.nightLine, width: 1.5 },
  });
  const pitch = 0.36;
  const cell = 0.31;
  for (let r = -5; r <= 5; r += 1) {
    for (let c = -5; c <= 5; c += 1) {
      const x = cx + c * pitch - cell / 2;
      const y = cy + r * pitch - cell / 2;
      // チップの四隅がすべて円の内側に入るものだけを描く
      const corners = [[x, y], [x + cell, y], [x, y + cell], [x + cell, y + cell]];
      if (!corners.every(([px, py]) => Math.hypot(px - cx, py - cy) <= radius - 0.04)) continue;
      const dist = Math.hypot(c + 2.2, r + 2.2);
      const transparency = Math.min(78, Math.round(5 + dist * 10));
      slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w: cell, h: cell, fill: { color: C.EUV, transparency }, line: { color: C.nightCard, width: 0.25 },
      });
    }
  }
  addText(slide, 'ウエハー（直径300mmの円板）上のチップのイメージ\n露光装置が1区画ずつ回路の像を焼き付ける', cx - 2.3, cy + radius + 0.3, 4.6, 0.55, { fontSize: 10, color: C.onDarkSub, align: 'center' });

  slide.addNotes([
    'この資料では、オランダのASMLを、SWOT分析とPEST分析の2つの枠組みで整理します。あわせて、サプライチェーン、つまり部品の調達から顧客までのつながりを図にし、AIの活用状況もまとめます。',
    'ASMLは、半導体の回路をウエハーに焼き付ける「露光装置」の世界最大手です。最先端のEUV露光装置を作れるのは世界でASMLだけです。',
    '2025年の売上高は327億ユーロで過去最高でした。2026年は、AI向けの先端半導体への投資拡大を受けて、430億から450億ユーロへの増収を見込んでいます。',
    '一方で、米国による対中輸出規制の強化、2026年11月に期限を迎える米中の休戦、オランダの人材や電力の制約など、成長を縛る要因もあります。',
    '数値はすべて、ASMLの決算発表と年次報告書、各国政府、調査会社、業界メディアの公開情報から引用し、各スライドの下に出典を示しています。確認日は2026年10月10日です。社内の情報は使っていません。また、投資判断を目的とした資料ではありません。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料について
// =====================================================================
{
  const slide = newContentSlide(null, 'この資料について', '公開情報で、外部環境・事業の位置・供給網・AI活用を整理する', [
    'この資料の目的と前提です。',
    '対象は、オランダのフェルトホーフェンに本社を置くASMLの事業全体です。中心は露光装置で、ほかに計測・検査装置、計算機リソグラフィと呼ばれるソフトウェア、設置済み装置の保守とアップグレードがあります。',
    'ASMLの決算は暦年で、1月から12月までです。金額は米国会計基準の開示値で、通貨はユーロです。わかりやすさのため、億ユーロに直して示す箇所があります。',
    '情報源は、ASMLの決算発表、年次報告書、投資家向けの資料、オランダや米国、EUの政府の発表、調査会社のSEMI、業界メディアです。報道やアナリストの見方は、事実と区別できるように「報道」と書いています。',
    'なお、ASMLの2026年7月から9月の決算は10月14日に発表される予定で、この資料には反映していません。',
    '右側は分析の進め方です。現在地、サプライチェーン、AI活用を確認したうえで、PESTとSWOTで整理し、最後に打ち手と注目点をまとめます。',
  ]);
  const rows = [
    ['目的', 'ASMLを取り巻く外部環境（PEST）、強み・弱み・機会・脅威（SWOT）、サプライチェーン、AIの活用状況を整理し、今後の打ち手と注目点を考える材料にする'],
    ['対象', 'ASML（オランダ・フェルトホーフェン）の事業全体。露光装置（EUV・DUV）、計測・検査装置、計算機リソグラフィ、保守・アップグレード'],
    ['数値の扱い', '決算は暦年（1〜12月）、米国会計基準の開示値でユーロ建て。億ユーロに直した箇所あり。地域別は出荷先や顧客の所在地による'],
    ['情報源', 'ASMLの決算発表・年次報告書・投資家向け資料、各国政府とEU、SEMI、業界メディア。確認日：2026年10月10日'],
    ['注意', '社内情報は使っていない。報道は「報道」と明記。2026年7〜9月期の決算（10月14日予定）は未反映。投資判断を目的とするものではない'],
  ];
  rows.forEach(([label, text], i) => {
    const y = 1.55 + i * 1.03;
    addChip(slide, label, MARGIN_X, y + 0.04, 1.25, 0.36, { fill: C.primary, fontSize: 11.5 });
    addText(slide, text, MARGIN_X + 1.45, y, 5.0, 0.95, { fontSize: 12.5, lineSpacingMultiple: 1.05 });
  });

  const x0 = 7.45;
  const w = RIGHT_EDGE - x0;
  addText(slide, '分析の進め方', x0, 1.5, w, 0.35, { fontSize: 14, bold: true, color: C.primary });
  const steps = [
    ['現在地', '事業・業績・売上の中身・競合・技術の歩み・直近の出来事'],
    ['サプライチェーン', '部品の調達から顧客までのつながりと、集中のリスク'],
    ['AI活用', 'AIが生む需要と、製品・社内での活用、ミストラルAIとの提携'],
    ['PEST分析', '政治・経済・社会・技術の外部環境と、その影響の大きさ'],
    ['SWOT分析', '強み・弱み（内部）と機会・脅威（外部）、クロスSWOT'],
    ['示唆・注目点', 'ASMLの施策の評価と、今後見るべき指標'],
  ];
  const colors = [C.primary, C.DUV, C.EUV, PEST.E.color, SWOT.S.color, C.primary];
  steps.forEach(([head, desc], i) => {
    const y = 1.92 + i * 0.82;
    addCard(slide, x0, y, w, 0.68, { fill: C.gray });
    addCircle(slide, x0 + 0.38, y + 0.34, 0.4, colors[i], String(i + 1), { fontSize: 13 });
    addText(slide, head, x0 + 0.75, y + 0.05, w - 0.85, 0.3, { fontSize: 13, bold: true, color: colors[i] });
    addText(slide, desc, x0 + 0.75, y + 0.36, w - 0.85, 0.28, { fontSize: 10.5, color: C.muted });
    if (i < steps.length - 1) addLine(slide, x0 + 0.38, y + 0.68, x0 + 0.38, y + 0.82, { color: C.line, width: 1.25 });
  });
}

// =====================================================================
// 3. 要点
// =====================================================================
{
  const slide = newContentSlide(null, 'エグゼクティブサマリー', 'AIが追い風の独占企業。制約は供給網の一点集中と地政学', [
    '最初に結論をまとめます。',
    '上の4つの数字は、この資料の出発点です。2025年の売上高は327億ユーロで過去最高でした。2026年の見通しは、7月に2度目の引き上げを行い、430億から450億ユーロです。部品の調達では、光学系をカール・ツァイスSMTの1社に頼っており、2025年の購入額は約44億ユーロでした。AIの活用では、フランスのミストラルAIに13億ユーロを出資しています。',
    '現在地として、ASMLは最先端のEUV露光装置を作れる唯一の会社で、AI向けの先端ロジックやDRAMの投資が業績を押し上げています。',
    'サプライチェーンでは、部品は欧州、組み立てはオランダ、顧客は台湾・韓国・中国というように、各段階が特定の地域や会社に集中しています。',
    'AIは、需要の源であると同時に、装置の性能向上や社内の効率化に使われ始めています。',
    '外部環境では、AI投資が追い風、米国の対中規制強化や米中の休戦の期限、オランダの人材と電力の制約が逆風です。今後は、能力増強を計画どおり進められるか、そしてAI活用の成果を数字で示せるかが焦点です。',
  ]);
  const stats = [
    ['327億ユーロ', '2025年の売上高（過去最高、前年比+15.6%、粗利率52.8%）', C.primary],
    ['430〜450億', '2026年の売上高の見通し（ユーロ、7月に2度目の上方修正）', SWOT.O.color],
    ['約44億ユーロ', 'カール・ツァイスSMTからの購入額（2025年）。光学系の唯一の供給元', SWOT.W.color],
    ['13億ユーロ', 'ミストラルAIへの出資（2025年9月、約11%）。AI活用の要', C.EUV],
  ];
  const tileW = (CONTENT_W - 0.2 * 3) / 4;
  stats.forEach(([value, label, color], i) => {
    addStat(slide, MARGIN_X + i * (tileW + 0.2), 1.5, tileW, 1.3, value, label, { color, valueSize: 24, labelSize: 10.5 });
  });
  const messages = [
    ['現在地', C.primary, 'EUV露光装置を作れる世界で唯一の会社。AI向けの先端ロジックとDRAMの投資拡大で、2026年は3割超の増収を見込む'],
    ['供給網', C.DUV, '製品関連の約900社が部品を担い、光学系はツァイス1社に頼る。部品は欧州、組み立てはオランダ、顧客は台湾・韓国・中国に集中'],
    ['AI活用', C.EUV, 'AIは需要の源であり、装置の性能向上・研究開発・生産・保守の効率化にも使う。ミストラルAIとはソフトの信頼性やログ解析から活用を開始'],
    ['PEST・SWOT', PEST.E.color, '追い風はAI投資と顧客の長期計画。逆風は米国の対中規制強化、2026年11月に期限を迎える米中の休戦、オランダの人材・電力の制約'],
    ['示唆', SWOT.O.color, '供給網と一緒に能力を3割増やし、中国比率の低下を前提に成長を描けるか。AI活用の成果を数字で示せるかが次の試金石'],
  ];
  messages.forEach(([label, color, text], i) => {
    const y = 3.0 + i * 0.78;
    addCard(slide, MARGIN_X, y, CONTENT_W, 0.7, { fill: C.white, line: C.grid, lineWidth: 0.75 });
    addChip(slide, label, MARGIN_X + 0.15, y + 0.17, 1.35, 0.36, { fill: color, fontSize: 11 });
    addText(slide, text, MARGIN_X + 1.7, y + 0.04, CONTENT_W - 1.9, 0.62, { fontSize: 12, valign: 'middle' });
  });
  addSource(slide, '出所：ASML 2025年決算（2026-01-28）・2026年4〜6月期決算（2026-07-15）・年次報告書2025（2026-02-25）、ASMLとミストラルAIの発表（2025-09-09）\n購入額は年次報告書の関連当事者の注記による。まとめ方は本資料による');
}

// =====================================================================
// 4. 事業の概要
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ①　事業の概要', '露光装置の最大手で、最先端のEUVは世界で唯一の供給者', [
    'ASMLの事業の全体像です。',
    '露光装置は、光を使って回路の像をウエハーに焼き付ける装置で、半導体の製造で最も重要な工程の一つです。ASMLの中心は2種類あります。1つは波長13.5ナノメートルの極端紫外光を使うEUV露光装置で、最先端の半導体に使われます。もう1つは、より波長の長い深紫外光を使うDUV露光装置で、幅広い工程で使われます。',
    '2025年は、EUVを48台、DUVを279台販売しました。システムの売上はEUVが116億ユーロ、DUVが120億ユーロです。',
    'このほか、焼き付けた回路の位置ずれや欠陥を測る計測・検査装置、露光の条件をソフトウェアで最適化する計算機リソグラフィ、そして設置済みの装置の保守とアップグレードがあります。保守とアップグレードは82億ユーロで、売上の約4分の1を占める安定した収入源です。',
    '右側は会社の特徴です。売上の10%以上を占める顧客が4社あり、その合計は売上の61%にのぼります。',
  ]);
  const rows = tableRows(['事業', '中身', '2025年の規模'], [
    ['EUV露光装置（NXE、High NA の EXE）', '13.5nmの極端紫外光で最先端の回路を焼き付ける。世界でASMLだけが製造', '48台・116億ユーロ'],
    ['DUV露光装置（液浸 NXT、ドライ XT）', '波長193nm・248nmなどの光で、先端から成熟まで幅広い工程に使う', '279台・120億ユーロ'],
    ['計測・検査（YieldStar、HMI）', '焼き付けた回路の位置ずれや欠陥を、光や電子ビームで測る', '8.25億ユーロ'],
    ['計算機リソグラフィ', '露光の条件やマスクのパターンをソフトウェアで計算し、最適化する', '（非開示）'],
    ['保守・アップグレード', '設置済みの装置の保守、性能を上げる改造（Installed Base Management）', '82億ユーロ'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, MARGIN_X, 1.55, 7.6, [2.65, 3.4, 1.55], { fontSize: 10.5, rowH: [0.36, 0.78, 0.78, 0.66, 0.66, 0.78] });
  addText(slide, 'システム売上（245億ユーロ）の内訳\nEUV 48%、液浸DUV 42%、KrF 4%、ArFドライ 2%、i線 1%、計測・検査 3%', MARGIN_X, 5.75, 7.6, 0.6, { fontSize: 10.5, color: C.muted });

  const rx = 8.45;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '会社の特徴', rx, 1.5, rw, 0.32, { fontSize: 12.5, bold: true, color: C.primary });
  const facts = [
    ['1984年', '創業。本社はオランダのフェルトホーフェン'],
    ['4.4万人超', '従業員（2025年、143の国籍）。半数強がオランダ'],
    ['47億ユーロ', '研究開発費（2025年、売上の14.4%）'],
    ['61%', '売上の10%以上を占める顧客4社の合計（2025年）。最大の顧客だけで23.9%'],
  ];
  facts.forEach(([value, label], i) => {
    const y = 1.92 + i * 1.2;
    addCard(slide, rx, y, rw, 1.08, { fill: C.gray });
    addText(slide, value, rx + 0.18, y + 0.06, rw - 0.36, 0.44, { fontSize: 19, bold: true, color: C.EUV, valign: 'middle' });
    addText(slide, label, rx + 0.18, y + 0.52, rw - 0.36, 0.52, { fontSize: 10.5, valign: 'top' });
  });
  addSource(slide, '出所：ASML 投資家向け資料 2025年10〜12月期（2026-01-28）、年次報告書2025（戦略報告の章・全文）。オランダの比率は年次報告書の従業員数（23,707人／44,175人）から本資料で計算');
}

// =====================================================================
// 5. 業績の推移
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ②　業績', '売上は4年で1.8倍。2026年は3割超の増収を見込む', [
    '業績の推移です。数字はすべてASMLの開示値で、わかりやすさのため億ユーロに直しています。',
    '売上高は、2021年の186億ユーロから2025年の327億ユーロへ、4年で約1.8倍になりました。2023年から2024年は横ばいでしたが、2025年はAI向けの需要で再び伸びました。',
    '2026年の見通しは、1月には340億から390億ユーロでしたが、4月に360億から400億ユーロ、7月に430億から450億ユーロへと2度引き上げられました。グラフの薄い色の棒は、この見通しの中央値です。',
    '右のグラフは純利益で、2025年は96億ユーロでした。粗利率は50%台前半で安定しており、2026年は54%から56%の見通しです。',
    '下の3つのカードは、2025年の実績、2026年の見通しの変化、足元の4月から6月の決算のポイントです。',
  ]);
  const cats = ['2021年', '2022年', '2023年', '2024年', '2025年', '2026年予想'];
  const sales = [186, 212, 276, 283, 327, 440];
  const profit = [59, 56, 78, 76, 96];
  const margins = ['52.7%', '50.5%', '51.3%', '51.3%', '52.8%', '54〜56%'];
  const chartY = 1.85;
  const chartH = 2.85;
  const plot = { x: 0.04, y: 0.08, w: 0.92, h: 0.78 };
  // pptxgenjs はオプションのオブジェクトを書き換えることがあるので、グラフごとに新しく作る
  const commonOptions = () => ({
    y: chartY, h: chartH, barDir: 'col', barGapWidthPct: 55,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '#,##0', dataLabelFontSize: 10.5, dataLabelColor: C.ink,
    dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10.5, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, layout: { ...plot },
  });
  addText(slide, [
    { text: '売上高（億ユーロ）', bold: true, color: C.EUV, fontSize: 13 },
    { text: '　2026年は会社見通し（430〜450億）の中央値', color: C.muted, fontSize: 10 },
  ], MARGIN_X, 1.5, 6.6, 0.32, { valign: 'middle' });
  slide.addChart(pres.charts.BAR, [{ name: '売上高', labels: cats, values: sales }], {
    ...commonOptions(), x: MARGIN_X, w: 6.4,
    chartColors: [C.EUV, C.EUV, C.EUV, C.EUV, C.EUV, C.EUVLight], valAxisMinVal: 0, valAxisMaxVal: 500,
  });
  // 粗利率を売上高のグラフの下に、各棒の位置にそろえて書く
  const plotX = MARGIN_X + plot.x * 6.4;
  const plotW = plot.w * 6.4;
  margins.forEach((m, i) => {
    const cx = plotX + ((i + 0.5) * plotW) / cats.length;
    addText(slide, m, cx - 0.5, chartY + chartH + 0.02, 1.0, 0.26, { fontSize: 10, bold: true, color: C.EUV, align: 'center' });
  });
  addText(slide, '粗利率', MARGIN_X - 0.02, chartY + chartH + 0.02, 0.6, 0.26, { fontSize: 9, color: C.muted });

  const px = 7.35;
  const pw = RIGHT_EDGE - px;
  addText(slide, '純利益（億ユーロ）', px, 1.5, pw, 0.32, { fontSize: 13, bold: true, color: SWOT.S.color });
  slide.addChart(pres.charts.BAR, [{ name: '純利益', labels: cats.slice(0, 5), values: profit }], {
    ...commonOptions(), x: px, w: pw,
    chartColors: [SWOT.S.color], valAxisMinVal: 0, valAxisMaxVal: 120,
  });
  addText(slide, '純利益率：2021年31.6% → 2025年29.4%', px, chartY + chartH + 0.02, pw, 0.26, { fontSize: 10, color: C.muted });

  const cards = [
    ['2025年（過去最高）', '売上高327億ユーロ（+15.6%）、純利益96億ユーロ。10〜12月の受注は132億ユーロ（うちEUV 74億）で、年末の受注残は388億ユーロ'],
    ['2026年の見通し（2度の上方修正）', '1月：340〜390億 → 4月：360〜400億 → 7月：430〜450億ユーロ、粗利率54〜56%。7〜9月期は110〜120億ユーロの見通し'],
    ['足元（2026年4〜6月）', '売上高93億ユーロ・粗利率54.0%・純利益29億ユーロ。保守・アップグレードが28億ユーロと想定を上回った。EUVを16台販売'],
  ];
  const cardW = (CONTENT_W - 0.2 * 2) / 3;
  cards.forEach(([head, body], i) => {
    const x = MARGIN_X + i * (cardW + 0.2);
    addCard(slide, x, 5.3, cardW, 1.52, { fill: C.gray });
    addText(slide, head, x + 0.18, 5.4, cardW - 0.36, 0.34, { fontSize: 13, bold: true, color: C.primary });
    addText(slide, body, x + 0.18, 5.78, cardW - 0.36, 0.98, { fontSize: 11.5 });
  });
  addSource(slide, '出所：ASML 投資家向け資料 2025年10〜12月期（2026-01-28）・2026年4〜6月期（2026-07-15）、2025年決算・2026年1〜3月期・4〜6月期の決算発表。億ユーロへの換算と純利益率は本資料で計算');
}

// =====================================================================
// 6. 売上の中身と出荷先
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ③　売上の中身と出荷先', '中国向けが急減し、AI投資の中心の台湾・韓国向けが伸びた', [
    '売上の中身と、装置の出荷先の変化です。',
    '左は2025年の売上高327億ユーロの内訳です。ロジック半導体向けの装置が161億ユーロ、メモリ向けが84億ユーロ、そして保守・アップグレードが82億ユーロでした。',
    '右は、装置のシステム売上を出荷先の国・地域で分けた比率の推移です。2024年は中国が41%で最大でしたが、2025年は33%、2026年の4月から6月には14%まで下がりました。輸出規制の強化が背景にあります。',
    '代わりに伸びたのが、台湾と韓国です。AI向けの先端ロジックを作る台湾、AI向けのメモリを作る韓国への出荷が増え、2026年4月から6月は両国で7割を超えました。',
    'ASMLは、2026年の中国向けを総売上の約20%と見込んでいます。',
  ]);
  addText(slide, '2025年の売上高の内訳（億ユーロ）', MARGIN_X, 1.5, 5.4, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const labels = ['ロジック向けの装置', 'メモリ向けの装置', '保守・アップグレード'];
  const values = [161, 84, 82];
  const colors = [C.EUV, C.DUV, PEST.E.color];
  slide.addChart(pres.charts.DOUGHNUT, [{ name: '売上構成', labels, values }], {
    x: MARGIN_X, y: 1.85, w: 3.9, h: 3.9, holeSize: 58,
    chartColors: colors, showLegend: false, showPercent: true, showValue: false, showLabel: false,
    dataLabelColor: C.white, dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelFormatCode: '0%',
    dataBorder: { pt: 1.5, color: 'FFFFFF' },
  });
  addText(slide, '2025年\n売上高\n327億ユーロ', MARGIN_X + 0.95, 3.25, 2.0, 1.1, { fontSize: 12, bold: true, color: C.primary, align: 'center', valign: 'middle' });
  const legend = [['ロジック向けの装置', '161億ユーロ'], ['メモリ向けの装置', '84億ユーロ'], ['保守・アップグレード', '82億ユーロ']];
  legend.forEach(([name, amount], i) => {
    const y = 5.9 + i * 0.3;
    slide.addShape(pres.shapes.RECTANGLE, { x: MARGIN_X, y: y + 0.06, w: 0.18, h: 0.18, fill: { color: colors[i] }, line: { color: colors[i], width: 0.5 } });
    addText(slide, [{ text: `${name}　`, color: C.ink }, { text: amount, bold: true, color: colors[i] }], MARGIN_X + 0.28, y, 4.8, 0.3, { fontSize: 10.5, valign: 'middle' });
  });

  const rx = 5.75;
  const rw = RIGHT_EDGE - rx;
  addText(slide, 'システム売上の出荷先の比率（%）', rx, 1.5, rw, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const periods = ['2024年', '2025年', '26年1〜3月', '26年4〜6月'];
  const regionSeries = [
    { name: '中国', labels: periods, values: [41, 33, 19, 14] },
    { name: '韓国', labels: periods, values: [21, 25, 45, 43] },
    { name: '台湾', labels: periods, values: [11, 22, 23, 30] },
    { name: '米国', labels: periods, values: [17, 12, 12, 9] },
    { name: 'その他', labels: periods, values: [10, 8, 1, 4] },
  ];
  slide.addChart(pres.charts.BAR, regionSeries, {
    x: rx, y: 1.85, w: rw, h: 3.95, barDir: 'col', barGrouping: 'percentStacked', barGapWidthPct: 45,
    chartColors: [SWOT.T.color, C.DUV, C.EUV, PEST.E.color, 'B7BDCB'],
    // 2%未満の細い帯はラベルが収まらないので、条件付きの表示形式で数字を出さない
    showValue: true, dataLabelPosition: 'ctr', dataLabelFormatCode: '[<2]"";0', dataLabelFontSize: 10.5, dataLabelColor: C.white, dataLabelFontFace: FONT, dataLabelFontBold: true,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10.5, catAxisLabelColor: C.ink, catAxisLineColor: C.line,
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 'r', legendFontFace: FONT, legendFontSize: 10.5, legendColor: C.ink,
    // 「その他」の1%のラベルが上で切れないよう、描画領域の上に余白を取る
    layout: { x: 0.02, y: 0.06, w: 0.83, h: 0.83 },
  });
  addCard(slide, rx, 5.95, rw, 0.85, { fill: C.gray });
  addText(slide, [
    { text: '総売上で見ると（2025年）：', bold: true, color: C.primary },
    { text: '中国29.1%、台湾25.5%、韓国25.0%、米国12.5%、日本4.3%。2026年の中国向けは総売上の約20%の見通し' },
  ], rx + 0.18, 5.97, rw - 0.36, 0.8, { fontSize: 10.5, valign: 'middle' });
  addSource(slide, '出所：ASML 年次報告書2025（戦略報告の章・全文の地域別売上）、投資家向け資料（2025年10〜12月期、2026年1〜3月期、4〜6月期）、2026年4〜6月期の決算説明会\n総売上の地域別比率は年次報告書の金額から本資料で計算');
}

// =====================================================================
// 7. 市場でのポジションと競合
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ④　市場でのポジションと競合', '最先端のEUVは独占。競合は方式を変えて追い上げる', [
    '露光装置の市場での位置と競合です。',
    '最も重要なのは、最先端のEUV露光装置を作れるのが世界でASMLだけだという点です。EUVは開発に約20年かかり、商用に使われ始めたのは2019年です。さらに次の世代のHigh NA EUVもASMLだけが手がけており、2026年7月にはインテルが量産での使用を始めました。',
    'DUV露光装置では競合がいますが、中国は国産の液浸DUV装置の開発を急いでいると報じられています。',
    '方式そのものを変えて挑む動きもあります。中国はEUVの試作機を作ったと報じられました。キヤノンは、型を押し当てて回路を作るナノインプリントという方式の装置を出荷しています。米国では、新しい光源を開発するスタートアップのxLightに、政府が1.5億ドルの支援を決めました。',
    'いずれも、すぐにASMLの地位を脅かす段階ではありませんが、長期的には注意が必要です。',
  ]);
  const rows = tableRows(['分野', '主なプレーヤー', 'ASMLの立場・最近の動き'], [
    ['EUV（量産）', 'ASMLのみ。中国が深圳で試作機（EUV光は出せるが、チップはまだ作れていない、ロイター）', '2019年に商用化。2025年は48台を販売、2026年は低NA EUVを約65台出荷する計画'],
    ['High NA EUV', 'ASMLのみ', 'インテルが18Aで量産入り（2026年7月）。インテル・サムスン・SKハイニックスが先行、本格量産は2027〜28年（報道）'],
    ['DUV（液浸・ドライ）', 'ASMLが中心。中国は国産の液浸DUVを開発中（ロイターの報道）', '2026年は液浸DUVを約130台出荷する計画。2027年に能力を約30%増やす'],
    ['新しい方式', 'キヤノンのナノインプリント（2024年に米研究組織へ出荷）、xLightの自由電子レーザー光源（米政府が1.5億ドル）', '量産の主流はASMLの投影露光で、新方式は研究・試作の段階（本資料の見方）'],
  ], { fontSize: 11.5 });
  addTableBox(slide, rows, MARGIN_X, 1.55, 8.3, [1.55, 3.4, 3.35], { fontSize: 11.5, rowH: [0.4, 1.25, 1.2, 1.1, 1.3] });

  const rx = 9.15;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 5.25, { fill: SWOT.S.tint });
  addText(slide, '独占を支えるもの', rx + 0.2, 1.65, rw - 0.4, 0.34, { fontSize: 13, bold: true, color: SWOT.S.color });
  addBullets(slide, [
    lead('長い開発：', 'EUVは商用化まで約20年。装置は約180トンでバスほどの大きさ'),
    lead('共同開発の輪：', '光学系のツァイス、レーザーのトルンプ、光源のCymerと一体で開発'),
    lead('設置台数：', '設置済みの装置から保守・アップグレードの収入が続く（2025年82億ユーロ）'),
    lead('ソフトと計測：', '計算機リソグラフィと計測で、装置の性能を引き出す'),
  ], rx + 0.2, 2.15, rw - 0.4, 4.55, { fontSize: 12, space: 12 });
  addSource(slide, '出所：TechRepublic（2025-12-18、ロイターの報道の紹介）、ASML（2026-07-15 High NAの発表・決算説明会）、TrendForce（2026-02-16・08-25）、Canon（2024-09-26）、Tom\'s Hardware（2025-12-02）、Electro Optics（2018-06-14）、ASML 年次報告書2025');
}

// =====================================================================
// 8. 技術と事業の歩み
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑤　技術と事業の歩み', '買収と出資で、光源・計測・光学・AIを自らの陣営に取り込んできた', [
    'ASMLの技術と事業の歩みです。',
    'ASMLは1984年にオランダで創業しました。その後、ソフトウェアで露光を最適化するBrion、光源のCymer、電子ビーム検査のHMIを次々に買収しました。2017年には、光学系の唯一の供給元であるカール・ツァイスSMTの持株会社に24.9%を出資しています。',
    '2019年にEUVの商用利用が始まり、2025年には次世代のHigh NA EUVの量産機EXE:5200Bを出荷しました。同じ2025年に、フランスのAI企業ミストラルAIに出資しています。',
    '2026年には、インテルがHigh NA EUVで量産を始め、ASMLはアイントホーフェンで新しいキャンパスの建設を始めました。',
    'つまりASMLは、装置の中核となる技術を、買収や出資によって自社の陣営に取り込みながら、独占的な地位を築いてきたと言えます。',
  ]);
  const items = [
    ['1984', '創業（オランダ）'],
    ['2007', 'Brionを買収（計算機リソグラフィ）'],
    ['2013', 'Cymerを買収（光源）'],
    ['2016', 'HMIを買収（電子ビーム検査）'],
    ['2017', 'カール・ツァイスSMTの持株会社に24.9%出資'],
    ['2019', 'EUVの商用利用が始まる'],
    ['2025', 'High NAの量産機を出荷、ミストラルAIに出資'],
    ['2026', 'インテルがHigh NAで量産、新キャンパス着工'],
  ];
  const lineY = 3.05;
  const boxW = 2.45;
  const x0 = MARGIN_X + boxW / 2;
  const x1 = RIGHT_EDGE - boxW / 2;
  addLine(slide, MARGIN_X + 0.1, lineY, RIGHT_EDGE - 0.1, lineY, { color: C.line, width: 2 });
  const step = (x1 - x0) / (items.length - 1);
  items.forEach(([year, text], i) => {
    const cx = x0 + i * step;
    const color = i >= 6 ? C.EUV : (i >= 4 ? C.DUV : C.primary);
    addCircle(slide, cx, lineY, 0.2, color, '', {});
    const above = i % 2 === 0;
    const bx = cx - boxW / 2;
    const chipY = above ? 1.55 : 3.3;
    addChip(slide, year, cx - 0.42, chipY, 0.84, 0.3, { fill: color, fontSize: 11 });
    addText(slide, text, bx, chipY + 0.36, boxW, 0.9, { fontSize: 11, align: 'center' });
    addLine(slide, cx, above ? chipY + 1.2 : lineY + 0.1, cx, above ? lineY - 0.1 : chipY, { color: C.grid, width: 1 });
  });

  const cardY = 4.72;
  const cardH = 2.1;
  const cw = (CONTENT_W - 0.25) / 2;
  addCard(slide, MARGIN_X, cardY, cw, cardH, { fill: C.gray });
  addText(slide, 'EUVの世代交代', MARGIN_X + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: C.EUV });
  addBullets(slide, [
    lead('低NA（0.33）：', 'NXE:3800Eの販売が好調（2025年）。1回の露光で約13nmまで解像'),
    lead('High NA（0.55）：', 'EXE:5200Bは毎時175枚（EXE:5000比+60%）、約8nmまで解像'),
    lead('採算：', 'High NAは立ち上げ期で、2025年は粗利率を押し下げる要因に'),
  ], MARGIN_X + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  const rx = MARGIN_X + cw + 0.25;
  addCard(slide, rx, cardY, cw, cardH, { fill: C.gray });
  addText(slide, '事業の広がり', rx + 0.2, cardY + 0.1, cw - 0.4, 0.34, { fontSize: 13, bold: true, color: C.DUV });
  addBullets(slide, [
    lead('計測・検査：', '25本の電子ビームで検査するHMI eScan1100（単一ビームの10倍の速さ）'),
    lead('3D集積：', 'チップを積み重ねる工程向けのXT:260を初出荷（2025年）'),
    lead('保守・アップグレード：', '2025年は+26%の82億ユーロ。2026年は+30%超の見通し'),
  ], rx + 0.2, cardY + 0.5, cw - 0.4, cardH - 0.58, { fontSize: 11, space: 4 });
  addSource(slide, '出所：ASML 年次報告書2025（戦略報告の章・全文）、投資家向け資料（2026-01-28）、決算説明会（2026-07-15）、ASMLの発表（2025-09-09・2026-07-15・09-08）、\nTechRepublic（2025-12-18）、TrendForce（2026-02-16）');
}

// =====================================================================
// 9. 直近の出来事
// =====================================================================
{
  const slide = newContentSlide(PART.NOW, '現在地 ⑥　直近の出来事', 'この2年で、規制・AI・能力増強の動きが一気に重なった', [
    '2025年から2026年の主な出来事を時系列で並べました。右の列は、ASMLにとっての意味です。',
    '2025年は、オランダが輸出許可の対象を計測・検査装置に広げ、ASMLはHigh NAの量産機を初出荷し、ミストラルAIへの出資を決めました。秋には中国がレアアースの輸出規制を強めましたが、米中の合意で1年間、2026年11月10日まで停止されました。米国の50%ルールも同じ日まで停止されています。',
    '2026年に入ると、1月に過去最高の決算と約1,700人の削減を同時に発表しました。4月には米議会でMATCH法案が提出され、6月には米政府がEUV装置の中国流入を疑っていると報じられ、ASMLは否定しました。',
    '7月以降は、見通しの大幅な引き上げ、インテルのHigh NAでの量産、新キャンパスの着工と、拡大の動きが続いています。',
  ]);
  const rows = tableRows(['時期', '出来事', 'ASMLにとっての意味'], [
    ['2025年1月', 'オランダが輸出許可の対象を一部の計測・検査装置に拡大（4月施行）', '規制の範囲の拡大'],
    ['2025年4月', 'High NA EUVの量産機EXE:5200Bを初出荷', '次世代の立ち上げ'],
    ['2025年9月', 'ミストラルAIに13億ユーロを出資し、戦略的提携（約11%）', 'AI活用の本格化'],
    ['2025年10〜11月', '中国がレアアース等の輸出規制を強化 → 米中合意で2026年11月10日まで停止。米国の「50%ルール」も同日まで停止', '期限付きの休戦'],
    ['2026年1月', '2025年は過去最高（売上327億ユーロ）。技術・IT組織の簡素化で約1,700人の削減を発表', '好業績下の組織改革'],
    ['2026年4〜6月', '米議会にMATCH法案（液浸DUVと保守の対中禁止）。米政府がEUVの中国流入を疑い、ASMLは否定', '対中規制の圧力'],
    ['2026年7月', '2026年見通しを430〜450億ユーロに引き上げ。インテルがHigh NAで量産入り', 'AI需要と次世代'],
    ['2026年8〜9月', '米国がオランダにほぼ全面的な対中禁輸を求める構え（報道）。新キャンパス（BIC North）を着工', '規制と拡大の並走'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [1.65, 8.25, CONTENT_W - 9.9], { fontSize: 10.5, rowH: 0.56 });
  addSource(slide, '出所：オランダ政府（2025-01-15）、ASML 年次報告書2025・各決算発表・発表（2025-09-09、2026-07-15・09-08）、Clark Hill（2025-11-24）、Thompson Hine（2025-11-04）、DutchNews（2026-01-28・06-19）、The Motley Fool（2026-04-20）、TrendForce（2026-08-25）');
}

// =====================================================================
// 10. サプライチェーンの全体像
// =====================================================================
{
  const slide = newContentSlide(PART.SUPPLY, 'サプライチェーン ①　全体像', '部品は欧州、組み立てはオランダ、顧客はアジア。要所に代わりがない', [
    'ここからはサプライチェーン、つまり部品の調達から顧客までのつながりです。左から右へ、モノとお金の流れを図にしました。',
    '左端はサプライヤーです。ASMLは、製品に使う部品やモジュールを約900社から調達しています。このほかに、製品以外の物やサービスの取引先が約4,200社あります。中でも重要なのが、光学系を作るドイツのカール・ツァイスSMT、EUV光を作るためのレーザーを作るドイツのトルンプ、光源を作るASMLの子会社Cymerです。',
    '中央がASMLで、オランダを中心に、ドイツ、米国、韓国、台湾の拠点で組み立てと試験を行います。',
    '右側が顧客の半導体メーカーで、2025年の売上は中国、台湾、韓国でそれぞれ約4分の1ずつを占めました。その先には、AIのデータセンターやスマートフォン、パソコン、車などの最終製品があります。',
    '下の矢印は、設置済みの装置から得る保守とアップグレードの収入で、2025年は82億ユーロと売上の4分の1を占めます。一度装置を納めると、長く収入が続く仕組みです。',
  ]);
  const top = 1.55;
  const colH = 4.15;
  // 列の位置（左から：サプライヤー、ASML、顧客、最終需要）
  const cols = [
    { x: MARGIN_X, w: 3.55 },
    { x: 4.6, w: 2.9 },
    { x: 7.95, w: 2.55 },
    { x: 10.95, w: RIGHT_EDGE - 10.95 },
  ];
  const heads = [
    ['サプライヤー', '製品関連 約900社'],
    ['ASML', '組み立て・試験'],
    ['顧客（半導体メーカー）', '2025年の売上の所在地'],
    ['最終需要', 'チップの使い道'],
  ];
  const headColors = [SWOT.W.color, C.EUV, C.DUV, PEST.E.color];
  heads.forEach(([head, sub], i) => {
    const { x, w } = cols[i];
    addChip(slide, head, x, top, w, 0.4, { fill: headColors[i], fontSize: 12 });
    addText(slide, sub, x, top + 0.43, w, 0.26, { fontSize: 9.5, color: C.muted, align: 'center' });
  });
  // サプライヤーの主な供給元
  const suppliers = [
    ['光学系', 'カール・ツァイスSMT（独）', '唯一の供給元・24.9%出資'],
    ['EUV用レーザー', 'トルンプ（独）', 'CO2レーザー（約30kW）'],
    ['光源', 'Cymer（米・子会社）', '2013年に買収'],
    ['セラミック・光学', 'ASML Berlin（独）', '2020年に買収'],
    ['機構モジュール', 'VDL ETGなど（蘭）', 'フレームなど'],
  ];
  const sy = top + 0.78;
  const sh = 0.6;
  suppliers.forEach(([part, name, note], i) => {
    const y = sy + i * (sh + 0.08);
    addCard(slide, cols[0].x, y, cols[0].w, sh, { fill: SWOT.W.tint, line: i === 0 ? SWOT.W.color : SWOT.W.tint, lineWidth: i === 0 ? 1.5 : 0.5 });
    addText(slide, part, cols[0].x + 0.1, y, 1.2, sh, { fontSize: 9.5, bold: true, color: SWOT.W.color, valign: 'middle' });
    addText(slide, [{ text: name, bold: true, breakLine: true }, { text: note, color: C.muted }], cols[0].x + 1.3, y + 0.03, cols[0].w - 1.4, sh - 0.06, { fontSize: 9.5, valign: 'middle' });
  });
  addText(slide, 'ほかに製品以外の取引先 約4,200社', cols[0].x, sy + 5 * (sh + 0.08) - 0.02, cols[0].w, 0.26, { fontSize: 9.5, color: C.muted });

  // ASML
  const ax = cols[1].x;
  const aw = cols[1].w;
  addCard(slide, ax, sy, aw, 3.3, { fill: 'EEE8F8', line: C.EUV, lineWidth: 1.5 });
  addText(slide, '組み立て・試験の拠点', ax + 0.15, sy + 0.08, aw - 0.3, 0.3, { fontSize: 11, bold: true, color: C.EUV });
  addBullets(slide, [
    'オランダ：フェルトホーフェン（本社）、アイントホーフェン、オイルスホット',
    'ドイツ：ベルリン',
    '米国：ウィルトン、サンディエゴ',
    '韓国：平沢　台湾：林口・台南',
  ], ax + 0.15, sy + 0.42, aw - 0.3, 1.3, { fontSize: 9.5, space: 3 });
  addText(slide, [
    { text: '従業員 44,175人', bold: true, color: C.EUV, breakLine: true },
    { text: 'うちオランダが54%（本資料で計算）', color: C.ink, breakLine: true, paraSpaceAfter: 6 },
    { text: '研究開発費 47億ユーロ', bold: true, color: C.EUV, breakLine: true },
    { text: '計算機リソグラフィなどのソフトウェアも提供', color: C.ink },
  ], ax + 0.15, sy + 1.8, aw - 0.3, 1.4, { fontSize: 10 });

  // 顧客
  const regions = [['中国', 29.1], ['台湾', 25.5], ['韓国', 25.0], ['米国', 12.5], ['日本', 4.3], ['その他', 3.5]];
  const cx0 = cols[2].x;
  const cw = cols[2].w;
  const barMaxW = cw - 1.35;
  regions.forEach(([name, share], i) => {
    const y = sy + 0.05 + i * 0.44;
    addText(slide, name, cx0, y, 0.7, 0.34, { fontSize: 10.5, bold: true, valign: 'middle' });
    const bw = Math.max(0.05, (barMaxW * share) / 30);
    slide.addShape(pres.shapes.RECTANGLE, { x: cx0 + 0.72, y: y + 0.07, w: bw, h: 0.2, fill: { color: i === 0 ? SWOT.T.color : C.DUV }, line: { color: i === 0 ? SWOT.T.color : C.DUV, width: 0.5 } });
    addText(slide, `${share.toFixed(1)}%`, cx0 + 0.76 + bw, y, 0.6, 0.34, { fontSize: 9.5, color: C.ink, valign: 'middle' });
  });
  addCard(slide, cx0, sy + 2.75, cw, 0.55, { fill: C.gray });
  addText(slide, '売上の10%超の顧客4社で61%', cx0 + 0.1, sy + 2.75, cw - 0.2, 0.55, { fontSize: 10, bold: true, color: C.primary, valign: 'middle', align: 'center' });

  // 最終需要
  // 枠が細いので、意味の切れ目で改行する
  const uses = ['AIデータセンター\n（先端ロジック、\nHBMなどのDRAM）', 'スマートフォン・\nパソコン', '車・産業・IoT'];
  uses.forEach((text, i) => {
    const y = sy + i * 1.1;
    addCard(slide, cols[3].x, y, cols[3].w, 0.95, { fill: i === 0 ? PEST.E.tint : C.gray });
    addText(slide, text, cols[3].x + 0.12, y, cols[3].w - 0.24, 0.95, { fontSize: 10.5, bold: i === 0, color: i === 0 ? PEST.E.color : C.ink, valign: 'middle' });
  });

  // 列の間の矢印（モノの流れ）
  const arrowY = sy + 1.6;
  addLine(slide, cols[0].x + cols[0].w + 0.08, arrowY, cols[1].x - 0.08, arrowY, { color: C.muted, width: 2, arrow: true });
  addLine(slide, cols[1].x + cols[1].w + 0.08, arrowY, cols[2].x - 0.08, arrowY, { color: C.muted, width: 2, arrow: true });
  addLine(slide, cols[2].x + cols[2].w + 0.08, arrowY, cols[3].x - 0.08, arrowY, { color: C.muted, width: 2, arrow: true });
  // 下：保守・アップグレードの収入の流れ（顧客 → ASML）
  const loopY = top + colH + 0.3;
  addCard(slide, cols[1].x, loopY, cols[2].x + cols[2].w - cols[1].x, 0.62, { fill: PEST.E.tint });
  addLine(slide, cols[2].x + cols[2].w - 0.3, loopY + 0.43, cols[1].x + 0.3, loopY + 0.43, { color: PEST.E.color, width: 2, arrow: true });
  addText(slide, '保守・アップグレードの収入 82億ユーロ（2025年、売上の25%）', cols[1].x + 0.5, loopY + 0.02, cols[2].x + cols[2].w - cols[1].x - 1.0, 0.26, { fontSize: 10, bold: true, color: PEST.E.color, align: 'center', valign: 'middle' });
  addText(slide, 'ツァイスからの購入は年44億ユーロ\n（売上原価の約3割に相当、本資料で計算）', cols[0].x, loopY, cols[0].w, 0.62, { fontSize: 9.5, color: SWOT.W.color, bold: true, valign: 'middle' });
  addSource(slide, '出所：ASML 年次報告書2025（サプライヤー数、製造拠点、ツァイスとの関係と購入額、地域別売上）、Electro Optics（2018-06-14）、Homburger（2020-07-16）、FHI（2021-11-09）。比率は本資料で計算');
}

// =====================================================================
// 11. 主要サプライヤー
// =====================================================================
{
  const slide = newContentSlide(PART.SUPPLY, 'サプライチェーン ②　主要サプライヤー', 'EUVの心臓部は、出資・買収・共同開発で固めた少数の相手が担う', [
    '装置の中核を担う主なサプライヤーを、役割ごとに整理しました。',
    '最も重要なのは光学系です。レンズやミラーなどの光学系は、ドイツのカール・ツァイスSMTだけが作っており、ASMLとは独占的な取り決めがあります。ASMLは2017年にツァイスSMTの持株会社に24.9%を出資し、両社は「二つの会社、一つの事業」という考え方で一体的に運営しています。ツァイスの生産能力がASMLの装置の生産台数の上限を決めるほどで、2025年の購入額は約44億ユーロでした。ASMLはツァイスの設備投資に融資もしています。',
    'EUVの光を作る仕組みでは、ドイツのトルンプが大出力のCO2レーザーを供給しています。錫の小さな粒に毎秒5万回レーザーを当てて、EUV光を発生させます。光源そのものは、ASMLが2013年に買収した米国のCymerが中心です。',
    'ベルリンでは、2020年に買収した旧ベルリナー・グラスがセラミックや光学のモジュールを作っています。オランダのブレインポート地域には、VDL ETGのようにモジュールを作る会社が集まっています。',
    'ASMLは「単一調達・二重の能力」という方針をとっています。調達先は1社でも、その技術を社内でも理解しておくという考え方です。ただし、EUVの部品は特殊なため、複数の会社から調達するのは経済的に難しいとしています。',
  ]);
  const rows = tableRows(['担う部分', '主な供給元（所在地）', 'ASMLとの関係', '代わりのききやすさ'], [
    ['光学系（レンズ、ミラー、照明系、集光ミラー）', 'カール・ツァイスSMT（独オーバーコッヘン、ヴェッツラー）', '唯一の供給元で独占的な取り決め。持株会社に24.9%出資（2017年）。2025年の購入額44億ユーロ。設備投資向けに融資', '代わりなし。ツァイスの能力が装置の生産台数の上限'],
    ['EUV光を作るCO2レーザー', 'トルンプ（独ディッツィンゲン）', 'ASML・Cymer・ツァイスと共同開発。約30kWのパルスを毎秒5万回、錫の粒に当てる', '難しい（本資料の見方）'],
    ['光源（DUVのレーザー、EUV光源）', 'Cymer（米サンディエゴ）', '2013年に買収した子会社。ASMLの光源の中核拠点', '社内で確保'],
    ['セラミック・光学モジュール', 'ASML Berlin（旧ベルリナー・グラス、独）', '2020年に買収。EUV・DUVの重要部品', '社内で確保'],
    ['機構モジュール・フレーム', 'VDL ETG（蘭）などブレインポートの各社', '長年、各種モジュールを製造。DUVのフレームの移管とコスト削減で表彰（2021年）', '地域の供給網に依存'],
    ['その他の部品', '製品関連の約900社', '多くが単一の供給元。方針は「単一調達・二重の能力」', 'EUVは複数調達が経済的に難しい'],
  ], { fontSize: 10 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [2.45, 2.75, 4.3, CONTENT_W - 9.5], { fontSize: 10, rowH: [0.36, 0.95, 0.72, 0.6, 0.6, 0.78, 0.6] });
  addCard(slide, MARGIN_X, 6.25, CONTENT_W, 0.6, { fill: SWOT.W.tint });
  addText(slide, [
    { text: '年次報告書のリスク記述：', bold: true, color: SWOT.W.color },
    { text: '「ツァイスSMTが長期にわたり光学系を生産できなくなれば、ASMLは事実上、事業を続けられなくなる」' },
  ], MARGIN_X + 0.2, 6.25, CONTENT_W - 0.4, 0.6, { fontSize: 11, valign: 'middle' });
  addSource(slide, '出所：ASML 年次報告書2025（リスク要因、関連当事者の注記）、Electro Optics（2018-06-14）、Homburger（2020-07-16）、FHI（2021-11-09）。代わりのききやすさは本資料の評価', { y: 6.97 });
}

// =====================================================================
// 12. 地理的な集中
// =====================================================================
{
  const slide = newContentSlide(PART.SUPPLY, 'サプライチェーン ③　地理的な集中', '人と資産はオランダ、部品はドイツ、顧客はアジアに偏る', [
    'サプライチェーンを地図のように地域別に並べ、どこに何が集中しているかを示しました。',
    '左の欧州が、ASMLの心臓部です。オランダには従業員の半数強の約2.4万人が働き、工場や設備などの固定資産の約3分の2がオランダにあります。ドイツには、ツァイス、トルンプ、ASML Berlinという中核のサプライヤーが集まっています。',
    '中央の米国には、ウィルトンとサンディエゴの拠点があり、約8,200人が働いています。売上の約13%が米国の顧客向けです。',
    '右のアジアは、主に顧客の地域です。台湾、韓国、中国の3つで売上の約8割を占めます。台湾には約4,500人の従業員がいます。',
    '赤い印は主なリスクです。年次報告書が挙げる光学系の唯一の供給元、人材の確保、中国向けの輸出規制、台湾海峡や朝鮮半島の情勢に加え、報道されているオランダの電力網の混雑と、米国の対中規制の強化の動きがあります。モノが欧州からアジアへ一方向に流れる構造のため、どこか1か所が止まると全体に響きます。年次報告書も、組み立てと試験はすべて9つの拠点で行っており、大きな障害が起きても代わりの生産能力がない可能性があると書いています。',
  ]);
  const panelY = 1.55;
  const panelH = 4.45;
  const panels = [
    { x: MARGIN_X, w: 4.6, title: '欧州（中核）', color: C.EUV, tint: 'EEE8F8' },
    { x: 5.4, w: 2.75, title: '米国', color: C.DUV, tint: SWOT.O.tint },
    { x: 8.35, w: RIGHT_EDGE - 8.35, title: 'アジア（顧客）', color: PEST.E.color, tint: PEST.E.tint },
  ];
  panels.forEach((p) => {
    addCard(slide, p.x, panelY, p.w, panelH, { fill: p.tint });
    addChip(slide, p.title, p.x + 0.15, panelY + 0.12, p.w - 0.3, 0.36, { fill: p.color, fontSize: 12 });
  });
  // 欧州
  const eu = panels[0];
  addText(slide, 'オランダ', eu.x + 0.2, panelY + 0.6, 2.0, 0.3, { fontSize: 12.5, bold: true, color: C.EUV });
  addBullets(slide, [
    '本社・主力工場（フェルトホーフェンほか）',
    '従業員 23,707人（全体の54%）',
    '固定資産 142億ユーロ（全体の65%）',
    '周辺にモジュールのサプライヤー（ブレインポート）',
  ], eu.x + 0.2, panelY + 0.95, eu.w - 0.4, 1.3, { fontSize: 11, space: 5 });
  addText(slide, 'ドイツ', eu.x + 0.2, panelY + 2.35, 2.0, 0.3, { fontSize: 12.5, bold: true, color: C.EUV });
  addBullets(slide, [
    'カール・ツァイスSMT（光学系の唯一の供給元）',
    'トルンプ（EUV用CO2レーザー）',
    'ASML Berlin（セラミック・光学部品）',
  ], eu.x + 0.2, panelY + 2.7, eu.w - 0.4, 1.0, { fontSize: 11, space: 5 });
  addText(slide, '欧州の顧客向け売上は2%未満', eu.x + 0.2, panelY + 3.5, eu.w - 0.4, 0.3, { fontSize: 10, color: C.muted });
  // 米国
  const us = panels[1];
  addBullets(slide, [
    'ウィルトン（コネチカット）：製造',
    'サンディエゴ：Cymer、光源の中核拠点',
    '従業員 8,242人',
    '顧客向け売上 12.5%',
  ], us.x + 0.2, panelY + 0.65, us.w - 0.4, 2.2, { fontSize: 11, space: 8 });
  // アジア
  const asia = panels[2];
  const asiaRows = [
    ['台湾', '売上 25.5%。林口・台南に拠点\n従業員 4,548人'],
    ['韓国', '売上 25.0%。平沢に拠点'],
    ['中国', '売上 29.1%（2026年は約20%の見通し）\n輸出規制の対象'],
    ['日本', '売上 4.3%'],
  ];
  asiaRows.forEach(([name, text], i) => {
    const y = panelY + 0.6 + i * 0.78;
    addText(slide, name, asia.x + 0.2, y, 0.65, 0.66, { fontSize: 12.5, bold: true, color: PEST.E.color, valign: 'middle' });
    addText(slide, text, asia.x + 0.85, y, asia.w - 1.05, 0.66, { fontSize: 11, valign: 'middle' });
  });
  // モノの流れ
  addLine(slide, eu.x + eu.w + 0.04, panelY + 1.2, us.x - 0.04, panelY + 1.2, { color: C.muted, width: 2, arrow: true });
  addLine(slide, us.x + us.w + 0.04, panelY + 1.2, asia.x - 0.04, panelY + 1.2, { color: C.muted, width: 2, arrow: true });
  // リスクの印（各地域の枠の下部に置く）
  const chipY = panelY + panelH - 0.55;
  const risks = [
    [eu.x + 0.2, 2.0, '光学系の唯一の供給元'],
    [eu.x + 2.4, 2.0, 'オランダの電力網・人材'],
    [us.x + 0.2, us.w - 0.4, '米国の対中規制の強化'],
    [asia.x + 0.2, 1.9, '中国向けの輸出規制'],
    [asia.x + 2.28, 1.9, '台湾海峡・朝鮮半島'],
  ];
  risks.forEach(([x, w, text]) => {
    addChip(slide, `⚠ ${text}`, x, chipY, w, 0.36, { fill: SWOT.T.color, fontSize: 9.5 });
  });
  addText(slide, '赤い印は主なリスク（年次報告書・報道）', us.x + 0.15, chipY - 0.5, us.w - 0.3, 0.44, { fontSize: 9, color: C.muted, align: 'center', valign: 'bottom' });
  const noteY = panelY + panelH + 0.14;
  addCard(slide, MARGIN_X, noteY, CONTENT_W, 0.66, { fill: SWOT.T.tint });
  addText(slide, [
    { text: '年次報告書のリスク記述（要約）：', bold: true, color: SWOT.T.color },
    { text: '組み立て・試験はすべて、オランダ・ドイツ・米国・韓国・台湾の9拠点のクリーンルームで行う。大きな障害が起きた場合、代わりの生産能力がない可能性がある' },
  ], MARGIN_X + 0.2, noteY, CONTENT_W - 0.4, 0.66, { fontSize: 10.5, valign: 'middle' });
  addSource(slide, '出所：ASML 年次報告書2025（全文：地域別の売上と固定資産、国別の従業員数、製造拠点、リスク要因）、Electro Optics（2018-06-14）、Homburger（2020-07-16）、FHI（2021-11-09）、NL Times（2026-05-18）、The Motley Fool（2026-04-20）。比率は年次報告書の数値から本資料で計算');
}

// =====================================================================
// 13. サプライチェーンのリスクと対策
// =====================================================================
{
  const slide = newContentSlide(PART.SUPPLY, 'サプライチェーン ④　リスクと対策', '需要の急増に、供給網と拠点が追いつけるかが最大の課題', [
    'サプライチェーンのリスクと、ASMLの対策を整理しました。右端の列は、この資料としての見方です。',
    '1つ目は、光学系の唯一の供給元であるツァイスへの依存です。ASMLは出資と融資で関係を固めていますが、ツァイスの生産能力が装置全体の上限になる構造は変わりません。',
    '2つ目は、需要の急増です。2027年の低NA EUVはほぼ受注済みで、ASMLは2027年に低NA EUVと液浸DUVの能力を約30%増やし、2028年もさらに30%の増強を検討しています。サプライヤーも同時に能力を増やす必要があります。',
    '3つ目は、部品や材料の途絶です。過去にはサプライヤーの火災やサイバー攻撃もありました。中国のレアアースの輸出規制は、2026年11月10日まで停止されているだけです。',
    '4つ目は、生産拠点が集中するオランダの制約です。電力網の混雑や人材の確保が課題で、新キャンパスや政府の支援策はあるものの、送電網の増強が追いつくかが鍵です。',
    '5つ目は輸出規制で、中国向けの比率の低下を前提にした計画になっています。',
  ]);
  const rows = tableRows(['リスク', '具体的な状況', 'ASMLの対策', '残る課題（本資料の見方）'], [
    ['単一の供給元への依存', 'ツァイスが光学系を生産できなければ事業を続けられない（年次報告書）', '24.9%出資、共同の意思決定、融資や前払いで能力増強を支援', '光学系の能力が装置全体の上限'],
    ['需要の急増', '2027年の低NA EUVはほぼ受注済み。顧客は複数年の計画を共有', '2027年に低NA EUV・液浸DUVの能力を約30%増、2028年はさらに30%を検討', 'サプライヤーの同時増強。需要が反転したときの固定費'],
    ['部品・材料の途絶', 'サプライヤーの火災・サイバー攻撃・原材料不足の例。中国のレアアース規制は一時停止中', '「単一調達・二重の能力」。サプライヤーの監査と協業', '2026年11月10日の停止期限'],
    ['オランダへの集中', '電力網の混雑、技術人材の確保、住宅', '新キャンパス（2029年に第1期）、フロー工場、政府の25億ユーロの支援策', '送電網の増強の速さ。地域の受け入れ'],
    ['輸出規制', '中国向けは許可制。米国はDUVの保守まで止める法案を検討', '法令の順守。2026年の中国向けは売上の約20%を前提', '保守の禁止まで進むかどうか'],
  ], { fontSize: 10.5 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [2.0, 3.6, 3.65, CONTENT_W - 9.25], { fontSize: 10.5, rowH: [0.38, 0.96, 0.96, 0.96, 0.96, 0.96] });
  addSource(slide, '出所：ASML 年次報告書2025・決算説明会（2026-07-15）・新キャンパスの発表（2026-09-08）、Clark Hill（2025-11-24）、NL Times（2024-03-28・2026-05-18）、TrendForce（2026-08-25）');
}

// =====================================================================
// 14. AI活用の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.AI, 'AI活用 ①　全体像', 'AIは「需要の源」であり、製品と社内を変える「道具」でもある', [
    'ここからはAIの活用状況です。ASMLとAIの関係は、4つの層に分けると分かりやすくなります。',
    '1つ目は需要です。AIの計算に使う先端のロジック半導体や、HBMなどの大量のDRAMを作るために、顧客が設備投資を増やしています。ASMLは2026年に、メモリ向けの装置の売上が75%以上、先端ロジックのファウンドリー向けが25%以上伸びると見ています。',
    '2つ目は製品です。ナノメートル単位の精度が求められる露光では、千分の1度の温度の変化でも影響が出ます。ASMLは、こうしたウエハー上の外部要因の影響をAIモデルで評価し、露光装置や計測・検査装置の性能を高めようとしています。',
    '3つ目は社内です。研究開発の期間短縮、生産工程の順序の最適化、現場の技術者による装置の診断と予防保全、財務や人事などの管理部門の効率化に使っています。効率は、1人あたりの生産量で測っています。',
    '4つ目は提携と投資で、フランスのミストラルAIに13億ユーロを出資しました。',
    '一方で、年次報告書は、AIの導入が遅れたり効果が出なかったりするリスク、競合がより良いAI戦略をとるリスク、AIを使ったサイバー攻撃のリスクも挙げています。',
    '社内の備えとしては、2025年にAIの学習・活用プログラムを始め、7,800人を超える従業員が参加しました。行動規範を支える方針には「責任あるAI」も含まれています。',
  ]);
  const layers = [
    ['1', '需要の源', C.DUV, 'AI向けの先端ロジックとDRAM（HBMなど）の投資が装置需要を押し上げる。2026年はメモリ向けの装置の売上+75%超、先端ロジック（ファウンドリー）向け+25%超の見通し'],
    ['2', '製品への組み込み', C.EUV, 'ナノメートル単位の露光では千分の1度の温度変化も影響する。ウエハー上の外部要因をAIモデルで評価し、露光・計測・検査の性能を高める'],
    ['3', '社内の業務', PEST.E.color, '研究開発の期間短縮、生産工程の順序の最適化、現場での装置の診断と予防保全、財務・IT・人事・法務の効率化。効率は1人あたりの生産量で測る'],
    ['4', '提携と投資', SWOT.S.color, 'ミストラルAIに13億ユーロを出資（約11%）。ソフトウェアの開発を支える大規模言語モデルを持ち、ASMLの技術者の働き方を理解する相手と位置づけ'],
  ];
  layers.forEach(([no, head, color, body], i) => {
    const y = 1.55 + i * 1.05;
    addCard(slide, MARGIN_X, y, 8.75, 0.93, { fill: C.gray });
    addCircle(slide, MARGIN_X + 0.42, y + 0.465, 0.5, color, no, { fontSize: 15 });
    addText(slide, head, MARGIN_X + 0.8, y + 0.06, 2.2, 0.81, { fontSize: 14, bold: true, color, valign: 'middle' });
    addText(slide, body, MARGIN_X + 3.0, y + 0.06, 5.6, 0.81, { fontSize: 10.5, valign: 'middle' });
  });
  const rx = 9.6;
  const rw = RIGHT_EDGE - rx;
  addCard(slide, rx, 1.55, rw, 2.2, { fill: SWOT.T.tint });
  addText(slide, 'AIのリスク（年次報告書）', rx + 0.2, 1.65, rw - 0.4, 0.34, { fontSize: 12.5, bold: true, color: SWOT.T.color });
  addBullets(slide, [
    '導入が遅れる、費用に見合う効果が出ない',
    '競合がより効果的なAI戦略をとる',
    'AIを使った高度なサイバー攻撃',
    'アルゴリズムや学習データの欠陥',
    '法規制・倫理への対応',
  ], rx + 0.2, 2.07, rw - 0.4, 1.6, { fontSize: 11, space: 4 });
  addCard(slide, rx, 3.88, rw, 1.75, { fill: PEST.E.tint });
  addText(slide, '社内の備え（年次報告書）', rx + 0.2, 3.98, rw - 0.4, 0.34, { fontSize: 12.5, bold: true, color: PEST.E.color });
  addBullets(slide, [
    'AIの学習・活用プログラムを開始（2025年、7,800人超が参加）',
    '行動規範を支える方針に「責任あるAI」を含める',
  ], rx + 0.2, 4.4, rw - 0.4, 1.15, { fontSize: 11, space: 6 });
  addCard(slide, MARGIN_X, 5.85, CONTENT_W, 0.95, { fill: 'EEE8F8' });
  addText(slide, [
    { text: 'CFOの言葉（年次報告書2025）：', bold: true, color: C.EUV },
    { text: '「AIの恩恵を、自社のためにも顧客のためにも得るには、外部のパートナーとの協業が欠かせない」。生成AIの登場を受けて提携先を探し、ミストラルAIを選んだ' },
  ], MARGIN_X + 0.2, 5.87, CONTENT_W - 0.4, 0.9, { fontSize: 11, valign: 'middle' });
  addSource(slide, '出所：ASML 年次報告書2025（CFOインタビュー「AIを組織の中心に」、リスク要因、人材の育成、行動規範）、2026年4〜6月期の決算説明会（2026-07-15）、ASMLとミストラルAIの発表（2025-09-09）');
}

// =====================================================================
// 15. ミストラルAIとの提携
// =====================================================================
{
  const slide = newContentSlide(PART.AI, 'AI活用 ②　ミストラルAIとの戦略的提携', '装置メーカーとAI企業の異例の提携。成果はまだ数字で見えない', [
    'ASMLのAI活用の中心にある、フランスのミストラルAIとの提携です。',
    '2025年9月、ASMLはミストラルAIと長期の協業契約を結びました。ASMLの製品群、研究開発、業務でAIモデルをどう使えるかを一緒に探るものです。あわせて、ミストラルAIの資金調達を主導し、13億ユーロを出資して、完全希薄化後で約11%の株主になりました。ASMLのCFOがミストラルAIの戦略委員会に加わっています。',
    'ASMLのCEOは、これを従来の「売り手と買い手」の関係を超える提携だと説明しています。',
    '中央は、ミストラルAIが2026年4月に公表した最初の活用例です。ソフトウェアの信頼性を高め、問題を早く見つけるAIエージェント、装置の大量のログを分析して故障の原因を突き止める仕組み、技術文書の作成の自動化の3つです。',
    '右は評価です。13億ユーロは2025年の純利益の約14%にあたる大きな投資です。ただし、2026年10月時点で、開発期間の短縮などの成果は数字では公表されていません。今後、成果を示せるかが注目点です。',
  ]);
  const colW = (CONTENT_W - 0.4) / 3;
  const xs = [MARGIN_X, MARGIN_X + colW + 0.2, MARGIN_X + 2 * (colW + 0.2)];
  const heads = [['提携の中身（2025年9月）', C.EUV, 'EEE8F8'], ['最初の活用例（2026年4月）', C.DUV, SWOT.O.tint], ['評価と論点（本資料の見方）', SWOT.W.color, SWOT.W.tint]];
  heads.forEach(([head, color, tint], i) => {
    addCard(slide, xs[i], 1.55, colW, 5.25, { fill: tint });
    addText(slide, head, xs[i] + 0.2, 1.65, colW - 0.4, 0.36, { fontSize: 13, bold: true, color });
  });
  addBullets(slide, [
    lead('協業：', '製品群・研究開発・業務でのAIモデルの活用を長期で探る'),
    lead('出資：', 'シリーズCを主導し13億ユーロ。完全希薄化後で約11%'),
    lead('関与：', 'CFOが戦略委員会に参加し、戦略と技術に助言'),
    lead('ねらい：', '顧客により早く、より高性能な装置を届ける'),
    lead('CEO：', '「従来の売り手と買い手の関係を超える提携」'),
  ], xs[0] + 0.2, 2.15, colW - 0.4, 4.55, { fontSize: 12, space: 14 });
  const cases = [
    ['ソフトウェアの信頼性', 'AIエージェントで不具合を早期に見つける'],
    ['装置の診断', '大量のログを分析し、故障の原因を特定する'],
    ['技術文書', '開発の流れの中で製品文書の作成を自動化する'],
  ];
  cases.forEach(([head, body], i) => {
    const y = 2.15 + i * 1.15;
    addCard(slide, xs[1] + 0.2, y, colW - 0.4, 1.0, { fill: C.white, line: C.DUV, lineWidth: 1 });
    addText(slide, head, xs[1] + 0.35, y + 0.06, colW - 0.7, 0.32, { fontSize: 11.5, bold: true, color: C.DUV });
    addText(slide, body, xs[1] + 0.35, y + 0.4, colW - 0.7, 0.55, { fontSize: 10.5 });
  });
  addText(slide, 'ASMLは、ミストラルAIのモデルがソフトウェアのコーディングを支え、装置の開発で重要な役割を担うと説明（年次報告書）', xs[1] + 0.2, 5.65, colW - 0.4, 1.05, { fontSize: 9.5, color: C.muted });
  addBullets(slide, [
    lead('規模：', '13億ユーロは2025年の純利益の約14%（本資料で計算）'),
    lead('独自性：', '装置メーカーとAI企業の初の本格提携（ASML）'),
    lead('欧州の文脈：', '「技術とAIの主権」は年次報告書が挙げる大きな流れの一つ'),
    lead('課題：', '開発期間の短縮などの成果の数字は、2026年10月時点で見当たらない（本資料で確認した範囲）'),
  ], xs[2] + 0.2, 2.15, colW - 0.4, 4.55, { fontSize: 12, space: 14 });
  addSource(slide, '出所：ASMLとミストラルAIの発表（2025-09-09、Nasdaq掲載）、Mistral AI「ASML accelerates advanced semiconductor lithography with Mistral」（2026-04-24）、ASML 年次報告書2025。純利益比は本資料で計算');
}

// =====================================================================
// 16. AI需要と業績
// =====================================================================
{
  const slide = newContentSlide(PART.AI, 'AI活用 ③　AI需要が業績を動かす', 'AI投資の拡大で、2026年の見通しは半年で約2割上がった', [
    'AIによる需要が、ASMLの業績にどう表れているかです。',
    '左のグラフは、ASMLが2026年7月に示した、2026年の事業ごとの伸びの見通しです。最も大きいのはメモリ向けの装置の売上で、75%以上の伸びを見込んでいます。AI向けのHBMやDDRのメモリの値上がりを受けて、メモリメーカーが新工場を含む大型の投資をしているためです。EUVの装置の売上も45%以上伸びる見込みです。',
    '右上は、2026年の売上の見通しの変化です。1月の340億から390億ユーロが、7月には430億から450億ユーロになりました。中央値で見ると、365億から440億ユーロへ、半年で約2割上がったことになります。',
    '右下は、業界全体の動きです。半導体製造装置の業界団体SEMIは、2026年の前工程の装置の市場が23%伸びると予測し、TSMCは2026年の設備投資の計画を600億から640億ドルに引き上げました。',
    'ASMLは、AIの需要が露光の工程を増やし、より高度な露光装置への移行を早めているとも説明しています。',
  ]);
  addText(slide, '2026年の伸びの見通し（ASML、前年比）', MARGIN_X, 1.5, 6.3, 0.32, { fontSize: 13, bold: true, color: C.EUV });
  const cats = ['メモリ向けの装置', 'EUVの装置', '保守・アップグレード', '先端ロジック（ファウンドリー）向け', 'EUV以外の装置'];
  const growth = [75, 45, 30, 25, 25];
  slide.addChart(pres.charts.BAR, [{ name: '伸び', labels: cats, values: growth }], {
    x: MARGIN_X, y: 1.85, w: 6.3, h: 4.1, barDir: 'bar', barGapWidthPct: 45,
    catAxisOrientation: 'maxMin',
    chartColors: [C.DUV, C.EUV, PEST.E.color, C.primary, C.wafer],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '"+"0"%"', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10.5, catAxisLabelColor: C.ink, catAxisLineColor: C.line,
    valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 90, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false,
  });
  addText(slide, 'EUV以外の装置は「約25%」、ほかは「〜%超」の見通し（2026年7月時点）', MARGIN_X, 6.05, 6.3, 0.3, { fontSize: 10, color: C.muted });

  // 右上：2026年の売上見通しの変化（範囲を横棒で描く）
  const rx = 7.3;
  const rw = RIGHT_EDGE - rx;
  addText(slide, '2026年の売上の見通しの変化（億ユーロ）', rx, 1.5, rw, 0.32, { fontSize: 13, bold: true, color: C.primary });
  const scaleMin = 300;
  const scaleMax = 470;
  const barX = rx + 1.05;
  const barW = rw - 1.25;
  const toX = (v) => barX + ((v - scaleMin) / (scaleMax - scaleMin)) * barW;
  const guides = [['1月', 340, 390, C.wafer], ['4月', 360, 400, C.DUV], ['7月', 430, 450, C.EUV]];
  guides.forEach(([label, lo, hi, color], i) => {
    const y = 1.95 + i * 0.52;
    addText(slide, label, rx, y, 0.9, 0.36, { fontSize: 11, bold: true, valign: 'middle' });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: toX(lo), y: y + 0.06, w: toX(hi) - toX(lo), h: 0.24, rectRadius: 0.05, fill: { color }, line: { color, width: 0.5 } });
    addText(slide, `${lo}〜${hi}`, toX(hi) + 0.08, y, 1.0, 0.36, { fontSize: 10.5, bold: true, color, valign: 'middle' });
  });
  addLine(slide, barX, 3.55, barX + barW, 3.55, { color: C.line, width: 1 });
  [300, 350, 400, 450].forEach((v) => {
    addText(slide, String(v), toX(v) - 0.3, 3.58, 0.6, 0.24, { fontSize: 9, color: C.muted, align: 'center' });
  });

  // 右下：業界全体の動き
  addCard(slide, rx, 4.0, rw, 2.8, { fill: C.gray });
  addText(slide, '業界全体の動き', rx + 0.2, 4.08, rw - 0.4, 0.32, { fontSize: 12.5, bold: true, color: PEST.E.color });
  addBullets(slide, [
    lead('装置市場：', '前工程の装置は2026年に1,439億ドル（+23.1%）、DRAM向けは+39%（SEMI、2026年7月）'),
    lead('最大顧客：', 'TSMCが2026年の設備投資を600億〜640億ドルに引き上げ（従来520億〜560億ドル）'),
    lead('露光の比重：', 'AI需要で露光工程が増え、高度な露光装置への移行が早まる（ASML）'),
  ], rx + 0.2, 4.5, rw - 0.4, 2.25, { fontSize: 11.5, space: 10 });
  addSource(slide, '出所：ASML 2026年4〜6月期の決算説明会・決算発表（2026-07-15）、2025年決算（2026-01-28）、2026年1〜3月期決算（2026-04-15）、SEMI（2026-07-14）、TrendForce（2026-07-17）\n見通しの上昇率は本資料で計算');
}

// =====================================================================
// 17. PEST分析の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ①　全体像', '最大の追い風はAI投資、最大の逆風は米国の対中規制の強化', [
    'ここからPEST分析です。PESTは、政治（Politics）、経済（Economy）、社会（Society）、技術（Technology）の4つの視点で、会社の外側の大きな変化を整理する方法です。',
    '各項目の前の丸印は、ASMLにとって追い風なら緑のプラス、逆風なら赤のマイナス、両方の面があるものは黄色のプラスマイナスです。',
    '全体を見ると、最大の追い風は経済のAI投資で、装置市場の拡大と顧客の長期計画につながっています。技術でも、High NAの量産入りや露光工程の増加が追い風です。',
    '最大の逆風は政治で、米国の対中規制の強化、特に液浸DUVの輸出と保守を止めるMATCH法案です。2026年11月に期限を迎える米中の休戦も不確実です。',
    '社会では、オランダの人材と電力網の制約が、能力増強の足かせになり得ます。',
  ]);
  const quadrants = [
    [PEST.P, [
      ['−', '米国の対中規制の強化（MATCH法案）'],
      ['±', '米中の休戦の期限（2026年11月）'],
      ['±', '関税と通商合意（上限15%、IEEPA違法判決）'],
      ['＋', 'オランダ・EUの産業政策'],
    ]],
    [PEST.E, [
      ['＋', 'AI投資による装置市場の拡大（+23%）'],
      ['＋', '顧客の長期計画（TSMCの設備投資増）'],
      ['−', '中国需要の正常化（41%→14%）'],
      ['±', '顧客の集中と景気の循環'],
    ]],
    [PEST.S, [
      ['−', '技術人材の確保（30%ルールの縮小）'],
      ['−', '電力網の逼迫と地域の受け入れ'],
      ['±', '気候と省エネへの要請'],
      ['＋', '技術とAIの主権への関心'],
    ]],
    [PEST.T, [
      ['＋', 'High NAの量産入り'],
      ['＋', '露光工程の増加（DRAMのEUV化）'],
      ['−', '中国の国産化と新しい方式'],
      ['±', 'AIによる開発・製造の変化'],
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
// 18. PEST：政治
// =====================================================================
buildPestDetail(PEST.P, 'PEST分析 ②　政治（Politics）', '米国の対中規制の強化が最大の逆風。11月の休戦の期限も焦点',
  '法律・規制・政策・国際関係など、国や政府の動きが事業に与える影響を見る視点',
  [
    {
      sign: '−', factor: '米国の対中規制\nの強化',
      fact: '米議会の超党派議員がMATCH法案を提出（2026年4月）。液浸DUVの対中輸出と、中国で稼働中の装置の保守を禁じる内容で、国防予算法に盛り込まれる見通し。米国はオランダにほぼ全面的な禁輸を求める構え（報道、8月）',
      impact: '2026年の中国向けは売上の約20%。保守まで止まれば、装置の販売に加えて保守の収入にも響く',
    },
    {
      sign: '±', factor: '米中の休戦の\n期限',
      fact: '米中合意で、中国のレアアースの輸出規制と、米国の「50%ルール」（規制対象の企業が過半を持つ会社にも規制を広げる）は、いずれも1年間、2026年11月10日まで停止（ASMLの年次報告書）',
      impact: '延長されなければ、部品・材料の調達の遅れや、中国の顧客への規制の拡大のおそれ',
    },
    {
      sign: '±', factor: '関税と通商合意',
      fact: '米EUの共同声明（2025年8月）で半導体の関税の上限は15%。2026年1月に特定の半導体製品へ232条関税（25%）。2月に最高裁がIEEPA関税を違法と判断し、各国との合意の前提が揺らいだ',
      impact: '米国の顧客が装置を買う費用を左右する。関税は輸入する部品のコストも押し上げる（年次報告書）',
    },
    {
      sign: '＋', factor: 'オランダ・EUの\n産業政策',
      fact: 'オランダは25.1億ユーロの「ベートーベン計画」で地域と技術教育を支援（2024年）。新キャンパスの着工式に首相が出席（2026年9月）。EUはChips Act 2.0を提案（2026年6月）',
      impact: '国内での拡張と人材育成を後押し。オランダ政府は米国の法案に反対の働きかけを続ける（報道）',
    },
  ],
  '出所：The Motley Fool（2026-04-20）、TrendForce（2026-08-25）、Clark Hill（2025-11-24）、Thompson Hine（2025-11-04）、The Register（2025-08-21）、Sandler, Travis & Rosenberg、Skadden（2026-02-24）、ASML 年次報告書2025・新キャンパスの発表（2026-09-08）、NL Times（2024-03-28）、欧州委員会（2026-06-03）',
  [
    '政治の視点です。4つの要因を、事実とASMLへの影響に分けて示しています。',
    '1つ目は、最大の逆風である米国の対中規制の強化です。2026年4月に米議会で提出されたMATCH法案は、液浸DUVの対中輸出だけでなく、中国ですでに動いている装置の保守まで禁じる内容です。国防予算法に盛り込まれる見通しと報じられ、米国はオランダにも、ほぼ全面的な禁輸を求める構えだと伝えられています。',
    '2つ目は、2026年11月に期限を迎える米中の休戦です。中国のレアアースの輸出規制と、米国の50%ルールは、いずれも2025年秋の米中合意で一時的に止まっているだけです。',
    '3つ目は関税です。米国とEUの合意で半導体の関税の上限は15%とされましたが、2026年2月に米国の最高裁が一部の関税を違法と判断し、合意の前提が揺らいでいます。',
    '4つ目は追い風で、オランダ政府の支援策や、EUの新しい半導体政策です。オランダ政府は、米国の法案に反対する働きかけも続けていると報じられています。',
  ]);

// =====================================================================
// 19. PEST：経済
// =====================================================================
buildPestDetail(PEST.E, 'PEST分析 ③　経済（Economy）', 'AI投資が装置市場を押し上げる。中国の縮小を他地域が埋める',
  '景気・市場の成長・顧客の投資・価格など、お金の流れに関わる変化を見る視点',
  [
    {
      sign: '＋', factor: 'AI投資による\n装置市場の拡大',
      fact: 'SEMIは2026年の製造装置の世界販売を1,659億ドル（+23.2%）、前工程の装置を1,439億ドル（+23.1%）、DRAM向けを+39%と予測（2026年7月）。2028年は2,295億ドル',
      impact: '露光装置の需要を底上げ。ASMLは2026年の売上を3割超増やす見通し',
    },
    {
      sign: '＋', factor: '顧客の長期計画',
      fact: 'TSMCは2026年の設備投資を600億〜640億ドルに引き上げ。顧客は自らの顧客と長期契約を結び、複数年の計画をASMLと共有。2027年の低NA EUVはほぼ受注済み',
      impact: '先の需要が見えやすくなり、能力増強を決めやすい',
    },
    {
      sign: '−', factor: '中国需要の正常化',
      fact: '出荷先に占める中国の比率は41%（2024年）→33%（2025年）→14%（2026年4〜6月）。2026年は総売上の約20%の見通し',
      impact: '今は中国以外の伸びで吸収できている。規制がさらに強まれば下振れ',
    },
    {
      sign: '±', factor: '顧客の集中と\n景気の循環',
      fact: '売上の10%超の顧客4社で61%、最大の1社で23.9%（2025年）。半導体市場は循環的で、足元はAI向けのメモリの値上がりが投資を後押し',
      impact: '大口顧客の計画の変更や市況の反転で、業績が大きく振れやすい',
    },
  ],
  '出所：SEMI（2026-07-14）、TrendForce（2026-07-17）、ASML 2026年4〜6月期の決算説明会（2026-07-15）、投資家向け資料（2026-01-28・04-15・07-15）、年次報告書2025',
  [
    '経済の視点です。',
    '1つ目は、AI投資による装置市場の拡大です。業界団体のSEMIは、2026年の前工程の装置の市場が23%伸び、DRAM向けは39%伸びると予測しています。',
    '2つ目は、顧客の長期計画です。最大手のTSMCは2026年の設備投資を600億から640億ドルに引き上げました。顧客は自分の顧客と長期契約を結び、数年先までの計画をASMLと共有しています。そのため、2027年の低NA EUVはほぼ受注済みです。',
    '3つ目は逆風で、中国の需要の正常化です。中国の比率は2024年の41%から、2026年4月から6月には14%まで下がりました。今のところ、台湾や韓国の伸びで吸収できています。',
    '4つ目は両面のある要因で、顧客の集中と景気の循環です。上位4社で売上の6割を占めるため、大口顧客の計画が変わると業績が大きく動きます。',
  ]);

// =====================================================================
// 20. PEST：社会
// =====================================================================
buildPestDetail(PEST.S, 'PEST分析 ④　社会（Society）', 'オランダの人材と電力が、能力増強の速さを左右する',
  '人々の暮らし方・価値観・働き方・地域との関係など、社会の変化を見る視点',
  [
    {
      sign: '−', factor: '技術人材の確保',
      fact: '高度外国人材の税優遇（30%ルール）は2027年から27%に縮小し、対象の年収の下限も上がる。ASMLは技術開発への集中のため、技術・IT部門の管理職を中心に約1,700人を削減（主にオランダ）',
      impact: '従業員の半数強がオランダ。外国人材を呼びにくくなれば、開発と増強の足かせに',
    },
    {
      sign: '−', factor: '電力網の逼迫と\n地域の受け入れ',
      fact: '経済団体が送電網の混雑を「国家的な危機」として扱うよう要請（2026年5月）。ブレインポートが止まれば半導体装置の生産に響くと警告。新キャンパスは最大2万人分',
      impact: '工場の拡張の速さが電力と住宅に左右される。地域社会との調整も必要',
    },
    {
      sign: '±', factor: '気候と省エネ\nへの要請',
      fact: '2040年までに供給網を含む温室効果ガスの実質ゼロを目指す。EUV装置（NXE:3800E）のウエハー1枚あたりの電力は5.5kWh（目標5.1kWh）。主要サプライヤーの削減の約束は32%（2026年の目標75%）',
      impact: '省エネの装置は顧客への価値になる。供給網の排出削減は目標より遅れている',
    },
    {
      sign: '＋', factor: '技術とAIの主権',
      fact: '年次報告書は「技術とAIの主権」を社会の大きな流れの一つに挙げる。EUのChips Act 2.0は戦略的な依存を減らすことを目指す',
      impact: '欧州の戦略企業として政策の支援を受けやすい反面、各国の囲い込みにさらされる',
    },
  ],
  '出所：DutchNews（2026-09-08・01-28）、ASML 2025年決算（2026-01-28）・新キャンパスの発表（2026-09-08）・年次報告書2025、NL Times（2026-05-18）、欧州委員会（2026-06-03）',
  [
    '社会の視点です。',
    '1つ目は、技術人材の確保です。オランダは、高度な外国人材の税の優遇を2027年から縮小します。ASMLの従業員の半数強はオランダで働いており、外国から人材を呼びにくくなると、開発や能力増強の足かせになり得ます。一方でASMLは、技術開発に集中するため、管理職を中心に約1,700人を削減すると発表しています。',
    '2つ目は、電力網の逼迫と地域の受け入れです。オランダでは送電網が混雑し、新しい工場に電気を引くのが難しくなっています。経済団体は2026年5月、これを国家的な危機として扱うよう政府に求めました。',
    '3つ目は、気候と省エネへの要請です。ASMLは2040年までに供給網も含めて温室効果ガスを実質ゼロにする目標を掲げていますが、EUV装置の消費電力やサプライヤーの削減の約束は、目標に届いていません。',
    '4つ目は追い風で、技術やAIを自国・自地域で持とうとする「主権」への関心の高まりです。',
  ]);

// =====================================================================
// 21. PEST：技術
// =====================================================================
buildPestDetail(PEST.T, 'PEST分析 ⑤　技術（Technology）', 'High NAと露光工程の増加が追い風。挑戦者は方式を変えて来る',
  '技術の進化・新しい用途・代わりになる技術など、技術の変化を見る視点',
  [
    {
      sign: '＋', factor: 'High NAの量産入り',
      fact: 'インテルが18AでHigh NA EUVを使い量産（2026年7月、歩留まりは従来のEUVと同等）。本格的な量産利用は2027〜28年で、インテル・サムスン・SKハイニックスが先行。TSMCは1.4nm世代では採用しない方針（報道）',
      impact: '次の世代でも独占を続ける土台。ただし採用は顧客ごとに分かれ、立ち上げ期は粗利率を下げる',
    },
    {
      sign: '＋', factor: '露光工程の増加',
      fact: 'DRAMでは複数回の露光をEUVの1回に置き換える動きが進む。AI向けの先端ロジックとDRAMで露光の工程が増えている（ASML、2026年7月）',
      impact: 'EUVの台数と保守の需要を押し上げる',
    },
    {
      sign: '−', factor: '中国の国産化と\n新しい方式',
      fact: '中国がEUVの試作機を完成（ロイター、2025年12月）。国産の液浸DUVも開発中。米政府は新しい光源のxLightに1.5億ドルの支援を表明、キヤノンはナノインプリント装置を出荷',
      impact: '当面の脅威は小さいが、中国市場では国産品への置き換えが進むおそれ（本資料の見方）',
    },
    {
      sign: '±', factor: 'AIによる開発・\n製造の変化',
      fact: 'ASMLは研究開発・生産・保守・管理部門でAIを活用し、ミストラルAIと協業。年次報告書は、競合がより効果的なAI戦略をとるリスクや、AIを使ったサイバー攻撃のリスクを挙げる',
      impact: '開発の速さと保守の質を高める武器。使いこなせなければ競争力の差になる',
    },
  ],
  '出所：ASML（2026-07-15 High NAの発表・決算説明会）、TrendForce（2026-02-16・08-25）、TechRepublic（2025-12-18）、Tom\'s Hardware（2025-12-02）、Canon（2024-09-26）、ASML 年次報告書2025、Mistral AI（2026-04-24）',
  [
    '技術の視点です。',
    '1つ目は、次世代のHigh NA EUVの量産入りです。2026年7月、インテルがHigh NA EUVを使った量産を始めました。本格的な量産利用は2027年から2028年で、インテル、サムスン、SKハイニックスが先行すると報じられています。一方、最大手のTSMCは1.4ナノ世代では採用しない方針と報じられており、採用は顧客ごとに分かれています。',
    '2つ目は、露光工程の増加です。DRAMでは、これまで複数回に分けていた露光を、EUVの1回に置き換える動きが進んでいます。',
    '3つ目は逆風で、中国の国産化と新しい方式です。中国はEUVの試作機や国産の液浸DUVを開発中と報じられています。米国では新しい光源を開発するスタートアップを政府が支援し、キヤノンは別の方式の装置を出荷しています。',
    '4つ目は、AIによる開発や製造の変化です。ASMLにとって武器になる一方で、競合がより上手にAIを使えば差がつくリスクもあります。',
  ]);

// =====================================================================
// 22. PEST要因の影響度マップ
// =====================================================================
{
  const slide = newContentSlide(PART.PEST, 'PEST分析 ⑥　影響度マップ', '最重要の監視対象は、米国の対中規制と11月の休戦の期限', [
    'PESTで挙げた要因を、事業への影響の大きさと、先行きの不確実性の2つの軸で並べ直しました。出典の事実をもとにした、この資料としての定性的な評価です。',
    '右上は、影響が大きく、しかも先が読みにくい要因で、最も注意して見ておくべきものです。米国の対中規制の強化、2026年11月に期限を迎える米中の休戦、オランダの電力網と人材の制約がここに入ります。',
    '左上は、影響は大きいが方向がある程度見えている要因で、計画に織り込むべきものです。AI投資による装置市場の拡大、顧客の長期計画、中国の需要の正常化がここに入ります。',
    '右下のHigh NAの量産入り、中国の国産化と新しい方式、AIによる開発の変化は、影響はまだ中くらいですが、兆しを見張る必要があります。',
    '左下は、方向がはっきりしていて、定期的に確認すればよい要因です。',
  ]);
  const px = 1.2;
  const py = 1.55;
  const pw = 7.55;
  const ph = 4.75;
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
  addText(slide, '事業への影響', px - 0.62, py + ph / 2 - 0.5, 0.3, 1.0, { fontSize: 11, bold: true, color: C.primary, align: 'center', valign: 'middle', vert: 'eaVert' });
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
    [PEST.E, '＋', 'AI投資による装置市場の拡大', colLeftB, 2.12],
    [PEST.E, '＋', '顧客の長期計画', colLeftA, 2.72],
    [PEST.E, '−', '中国需要の正常化', colLeftB, 3.32],
    [PEST.P, '−', '米国の対中規制の強化', colRightA, 2.12],
    [PEST.P, '±', '米中の休戦の期限（11月）', colRightB, 2.72],
    [PEST.S, '−', 'オランダの電力網・人材', colRightA, 3.32],
    [PEST.T, '＋', '露光工程の増加', colLeftB, 4.45],
    [PEST.P, '＋', 'オランダ・EUの産業政策', colLeftA, 4.98],
    [PEST.P, '±', '関税と通商合意', colLeftB, 5.51],
    [PEST.S, '±', '気候と省エネへの要請', colLeftA, 6.04],
    [PEST.T, '＋', 'High NAの量産入り', colRightB, 4.45],
    [PEST.T, '−', '中国の国産化・新しい方式', colRightA, 4.98],
    [PEST.T, '±', 'AIによる開発の変化', colRightB, 5.51],
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
  addCard(slide, rx, 1.55, rw, 2.6, { fill: SWOT.T.tint });
  addText(slide, '最重要の監視対象（右上）', rx + 0.2, 1.65, rw - 0.4, 0.34, { fontSize: 13, bold: true, color: SWOT.T.color });
  addBullets(slide, [
    lead('対中規制：', 'MATCH法案が国防予算法に入るか、オランダが禁輸を広げるか'),
    lead('休戦の期限：', 'レアアース規制と50%ルールの停止が延長されるか（11月10日）'),
    lead('電力・人材：', '送電網の増強と外国人材の受け入れが、能力増強に追いつくか'),
  ], rx + 0.2, 2.08, rw - 0.4, 2.0, { fontSize: 11.5, space: 8 });
  addText(slide, '枠の色は視点', rx, 4.4, rw, 0.28, { fontSize: 11, bold: true, color: C.muted });
  Object.values(PEST).forEach((lens, i) => {
    const x = rx + (i % 2) * (rw / 2);
    const y = 4.72 + Math.floor(i / 2) * 0.36;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.05, w: 0.32, h: 0.22, rectRadius: 0.05, fill: { color: C.white }, line: { color: lens.color, width: 1.5 } });
    addText(slide, `${lens.ja}（${lens.key}）`, x + 0.4, y, rw / 2 - 0.45, 0.32, { fontSize: 10.5, valign: 'middle' });
  });
  addText(slide, '配置は、出典の事実をもとにした本資料の定性的な評価', rx, 5.55, rw, 0.6, { fontSize: 10, color: C.muted });
  addSource(slide, '出所：PEST分析 ②〜⑤ の各出典。配置は本資料による', { y: 7.05, h: 0.3 });
}

// =====================================================================
// 23. SWOT分析の全体像
// =====================================================================
{
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ①　全体像', '独占と陣営の強さが、集中と依存の弱さと表裏一体になっている', [
    'ここからSWOT分析です。SWOTは、会社の内側の強み（Strengths）と弱み（Weaknesses）、外側の機会（Opportunities）と脅威（Threats）を、4つのマスに整理する方法です。',
    '強みは、最先端の露光装置の独占、中核の技術を出資や買収で固めた陣営、設置台数が生む保守の収益、厚い財務力、そして先まで見える受注です。',
    '弱みは、光学系の唯一の供給元への依存、オランダへの拠点の集中、顧客の集中、組織の再編の負担、そして立ち上げ期の新製品の採算です。強みの裏返しになっている点が特徴です。',
    '機会は、AI向けの投資の継続、露光工程の増加、High NAの普及、保守とアップグレードの拡大、AIによる生産性の向上です。',
    '脅威は、米国の対中規制の強化、米中の休戦の期限、中国の国産化と新しい方式、規制の順守をめぐる疑い、オランダの制約と需要の反動です。',
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
    addText(slide, label, MARGIN_X, rowsY[i] + (qh - 0.9) / 2, 0.46, 0.9, { fontSize: 12.5, bold: true, color: C.white, align: 'center', valign: 'middle', vert: 'eaVert' });
  });
  const quadrants = [
    [SWOT.S, x1, rowsY[0], [
      'EUV・High NAを作れる世界で唯一の会社',
      '光学・光源・検査を出資と買収で固めた陣営',
      '保守・アップグレードの収益（売上の25%）',
      '厚い財務力（2025年の純利益96億ユーロ）',
      '先まで見える受注（2027年の低NA EUV）',
    ]],
    [SWOT.W, x2, rowsY[0], [
      '光学系はツァイスの1社に依存',
      'オランダに人と資産が集中（従業員の54%）',
      '顧客の集中（上位4社で売上の61%）',
      '組織の再編（約1,700人の削減）の負担',
      'High NAは立ち上げ期で粗利率を下げる',
    ]],
    [SWOT.O, x1, rowsY[1], [
      'AI向けの先端ロジック・DRAMの投資の継続',
      '露光工程の増加（DRAMのEUV化）',
      'High NAの普及（2027〜28年に本格量産）',
      '保守・アップグレードの拡大（+30%超）',
      'AIによる開発・保守の生産性の向上',
    ]],
    [SWOT.T, x2, rowsY[1], [
      '米国の対中規制の強化（保守の禁止も）',
      '米中の休戦の期限（2026年11月）',
      '中国の国産化と新しい方式',
      '規制の順守をめぐる米政府の疑い',
      'オランダの電力・人材の制約、需要の反動',
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
// 24. 強み
// =====================================================================
buildSwotDetail(SWOT.S, 'SWOT分析 ②　強み（Strengths）', '最先端の独占と、それを支える陣営・保守・財務の厚み',
  [
    { value: '48台', label: 'EUVの販売台数（2025年）。2026年は低NA EUVを約65台出荷する計画' },
    { value: '82億ユーロ', label: '保守・アップグレードの売上（2025年、+26%）。設置台数が生む安定収入', size: 26 },
    { value: '52.8%', label: '粗利率（2025年）。2026年は54〜56%の見通し' },
  ],
  [
    { head: '最先端の露光の独占', body: 'EUV、そして次世代のHigh NA EUVを作れるのは世界でASMLだけ。インテルがHigh NAでの量産を始め（2026年7月）、次の世代でも先行する' },
    { head: '中核の技術を固めた陣営', body: '光学系のツァイスに24.9%出資、光源のCymerと検査のHMIを買収、レーザーはトルンプと共同開発。部品の要所を出資・買収・長期の協業で押さえる' },
    { head: '設置台数が生む収益', body: '保守・アップグレードは82億ユーロで売上の25%（2025年）。顧客の能力増強に向けたアップグレードの需要も伸びる' },
    { head: '厚い財務力', body: '2025年の純利益は96億ユーロ、フリーキャッシュフローは110億ユーロ。株主に85億ユーロを還元しつつ、研究開発に47億ユーロを投じる' },
    { head: '先まで見える受注', body: '2025年末の受注残は388億ユーロ。2027年の低NA EUVはほぼ受注済みで、2028年分の受注も相当数が入っている' },
  ],
  '出所：ASML 年次報告書2025、投資家向け資料（2026-01-28）、2025年決算（2026-01-28）、2026年4〜6月期の決算説明会・High NAの発表（2026-07-15）、Electro Optics（2018-06-14）',
  [
    '強みを5つに整理しました。',
    '1つ目は、最先端の露光装置の独占です。EUVも、次世代のHigh NA EUVも、作れるのは世界でASMLだけです。',
    '2つ目は、中核の技術を自らの陣営に固めていることです。光学系のツァイスへの出資、光源のCymerや検査のHMIの買収、レーザーのトルンプとの共同開発によって、装置の要所を押さえています。',
    '3つ目は、設置台数が生む保守とアップグレードの収益で、売上の4分の1を占めます。',
    '4つ目は財務力です。2025年の純利益は96億ユーロで、株主への還元と大きな研究開発投資を両立しています。',
    '5つ目は、先まで見える受注です。2027年の低NA EUVはほぼ受注済みで、2028年分の受注も入り始めています。',
  ]);

// =====================================================================
// 25. 弱み
// =====================================================================
buildSwotDetail(SWOT.W, 'SWOT分析 ③　弱み（Weaknesses）', '強みの裏返しとして、依存と集中を抱える',
  [
    { value: '約3割', label: 'ツァイスからの購入額（44億ユーロ）が売上原価（154億ユーロ）に占める規模（2025年、本資料で計算）' },
    { value: '54%', label: 'オランダで働く従業員の比率（2025年末、本資料で計算）' },
    { value: '61%', label: '売上の10%超を占める顧客4社への売上の比率（2025年）' },
  ],
  [
    { head: '単一の供給元への依存', body: '光学系はツァイスだけが作り、その能力が装置の生産台数の上限になる。EUVの部品は特殊で、複数の会社から調達するのは経済的に難しい' },
    { head: '拠点の集中', body: '組み立ての中心はオランダで、従業員の54%、固定資産の65%が集まる。電力網や人材の制約が、そのまま生産の制約になる' },
    { head: '顧客の集中', body: '上位4社で売上の61%、最大の1社で23.9%（2025年）。大口顧客の投資計画の変更が、業績を大きく動かす' },
    { head: '組織の再編の負担', body: '技術開発への集中を強めるため、技術・IT部門の管理職を中心に約1,700人を削減（2026年1月）。再編の費用が4〜6月期の研究開発費を押し上げた' },
    { head: '新製品の採算', body: 'High NAは立ち上げ期で、2025年は粗利率を押し下げる要因に。1台約3.8億ドル（報道）と高く、TSMCは1.4nm世代での採用を見送る方針（報道）' },
  ],
  '出所：ASML 年次報告書2025（戦略報告の章・全文）、2025年決算（2026-01-28）、DutchNews（2026-01-28）、2026年4〜6月期の決算説明会（2026-07-15）、TrendForce（2026-02-16）',
  [
    '弱みです。多くは強みの裏返しになっています。',
    '1つ目は、単一の供給元への依存です。光学系はツァイスだけが作っており、ツァイスの生産能力がASMLの装置の生産台数の上限になります。購入額は売上原価の約3割に相当します。',
    '2つ目は拠点の集中です。従業員の54%、固定資産の65%がオランダにあり、オランダの電力網や人材の制約がそのまま生産の制約になります。',
    '3つ目は顧客の集中です。上位4社で売上の61%を占めます。',
    '4つ目は、組織の再編の負担です。管理職を中心に約1,700人を削減する再編は、移行期に負担が残ります。',
    '5つ目は、新製品のHigh NAの採算です。立ち上げ期で粗利率を押し下げており、価格も高いため、最大手のTSMCは当面の採用を見送る方針と報じられています。',
  ]);

// =====================================================================
// 26. 機会
// =====================================================================
buildSwotDetail(SWOT.O, 'SWOT分析 ④　機会（Opportunities）', 'AI投資の継続と露光工程の増加が、EUVの台数を押し上げる',
  [],
  [
    { head: 'AI向けの投資の継続', body: '顧客は先端ロジックとDRAMの能力を大きく増やしている。2026年はメモリ向けの装置の売上+75%超、先端ロジック（ファウンドリー）向け+25%超の見通し' },
    { head: '露光工程の増加', body: 'DRAMで複数回の露光をEUVの1回に置き換える動き。先端ロジックでも2nmの立ち上げが進み、顧客は1.4nmへの投資も計画' },
    { head: 'High NAの普及', body: '2027〜28年にインテル・サムスン・SKハイニックスの量産利用が始まる見通し（報道）。次の世代の売上の柱になり得る' },
    { head: '保守・アップグレードの拡大', body: '設置台数の増加と、顧客の能力増強に向けたアップグレードの需要で、2026年は+30%超の見通し' },
    { head: 'AIによる生産性の向上', body: 'ミストラルAIと、ソフトウェアの信頼性向上、ログ解析による故障原因の特定、文書の自動化から着手。開発の期間短縮をねらう' },
  ],
  '出所：ASML 2026年4〜6月期の決算説明会（2026-07-15）、TrendForce（2026-02-16）、Mistral AI（2026-04-24）、ASML 年次報告書2025、投資家向け資料（2026-01-28）',
  [
    '機会です。左のグラフは、EUVの台数の推移です。2024年と2025年は売上に計上した台数、2026年はASMLが7月に示した低NA EUVの出荷計画です。',
    '1つ目の機会は、AI向けの投資の継続です。メモリ向けの装置の売上は2026年に75%以上伸びる見通しです。',
    '2つ目は、露光工程の増加です。DRAMで複数回の露光をEUVの1回に置き換える動きなどで、EUVの台数が増えます。',
    '3つ目は、High NAの普及です。2027年から2028年に、インテル、サムスン、SKハイニックスの量産利用が始まると報じられています。',
    '4つ目は、保守とアップグレードの拡大、5つ目は、AIによる開発と保守の生産性の向上です。',
  ],
  {
    leftPanel: (slide, x, y, w, h) => {
      addCard(slide, x, y, w, h, { fill: SWOT.O.tint });
      addText(slide, 'EUVの台数', x + 0.18, y + 0.12, w - 0.36, 0.55, { fontSize: 13, bold: true, color: SWOT.O.color });
      const cats = ['2024年', '2025年', '2026年計画'];
      const units = [44, 48, 65];
      slide.addChart(pres.charts.BAR, [{ name: '台数', labels: cats, values: units }], {
        x: x + 0.1, y: y + 0.7, w: w - 0.2, h: 3.75, barDir: 'col', barGapWidthPct: 50,
        chartColors: [SWOT.O.color, SWOT.O.color, '9DB6E0'],
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"台"', dataLabelFontSize: 11, dataLabelColor: C.ink, dataLabelFontFace: FONT,
        catAxisLabelFontFace: FONT, catAxisLabelFontSize: 10, catAxisLabelColor: C.muted, catAxisLineColor: C.line,
        valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 80, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
        showLegend: false,
      });
      addText(slide, '2024・2025年は売上に計上した台数（High NAを含む）。2026年は低NA EUVの出荷計画', x + 0.18, y + 4.55, w - 0.36, 0.65, { fontSize: 10, color: C.muted });
    },
  });

// =====================================================================
// 27. 脅威
// =====================================================================
buildSwotDetail(SWOT.T, 'SWOT分析 ⑤　脅威（Threats）', '規制の強化と休戦の期限が、中国向けの事業を揺さぶる',
  [
    { value: '14%', label: '出荷先に占める中国の比率（2026年4〜6月）。2024年は41%' },
    { value: '2026年11月', label: '中国のレアアース規制の停止と、米国の50%ルールの停止が11月10日に期限', size: 24 },
    { value: '約20%', label: '2026年の中国向け売上の見通し（総売上比）。法案で販売・保守が止まるおそれ' },
  ],
  [
    { head: '米国の対中規制の強化', body: 'MATCH法案は液浸DUVの対中輸出と保守の禁止を求め、国防予算法に盛り込まれる見通し（報道）。米国はオランダにほぼ全面的な禁輸を求める構え' },
    { head: '米中の休戦の期限', body: '中国のレアアース規制の停止と、米国の50%ルールの停止は2026年11月10日に期限。再開すれば部品の調達や中国の顧客との取引に響く' },
    { head: '中国の国産化と新しい方式', body: '中国はEUVの試作機と国産の液浸DUVを開発中（ロイター）。米国では新しい光源のスタートアップを政府が支援' },
    { head: '規制の順守をめぐる疑い', body: '米政府がEUV装置の中国流入の疑いを伝えたと報道（2026年6月）。ASMLは否定し、証拠も公開されていないが、対中規制の議論を強める材料になっている（本資料の見方）' },
    { head: 'オランダの制約と需要の反動', body: '電力網の混雑と人材の確保が能力増強の足かせに。AI投資が一巡すれば、増やした能力が重荷になるおそれ（本資料の見方）' },
  ],
  '出所：ASML 投資家向け資料・決算説明会（2026-07-15）・年次報告書2025、The Motley Fool（2026-04-20）、TrendForce（2026-08-25）、Clark Hill（2025-11-24）、Thompson Hine（2025-11-04）、\nTechRepublic（2025-12-18）、Tom\'s Hardware（2025-12-02）、DutchNews（2026-06-19）、NL Times（2026-05-18）',
  [
    '脅威です。',
    '1つ目は、米国の対中規制の強化です。MATCH法案は、液浸DUVの輸出だけでなく、中国にある装置の保守まで止めることを求めています。保守まで止まれば、中国向けの収入は大きく減ります。',
    '2つ目は、2026年11月に期限を迎える米中の休戦です。中国のレアアースの規制が再開されれば、部品の調達に影響が出るおそれがあります。',
    '3つ目は、中国の国産化と新しい方式の台頭です。',
    '4つ目は、規制の順守をめぐる疑いです。米政府がEUV装置の中国への流入を疑っていると報じられ、ASMLは強く否定しています。証拠は公開されていませんが、規制強化の議論を強める材料になっています。',
    '5つ目は、オランダの制約と需要の反動です。AIへの投資が一巡したとき、増やした能力が重荷になるおそれもあります。この2点は、この資料としての見方です。',
  ]);

// =====================================================================
// 28. クロスSWOT
// =====================================================================
{
  const slide = newContentSlide(PART.SWOT, 'SWOT分析 ⑥　クロスSWOT', '攻めは「能力の3割増強」、守りは「中国比率の低下を前提にした計画」', [
    'クロスSWOTは、強み・弱みと、機会・脅威を掛け合わせて、打ち手の方向を考える方法です。ここに挙げた打ち手は、ASMLが公表している施策も含めて、この資料として整理したものです。',
    '左上の「強み×機会」は攻めの打ち手です。AI需要に合わせて能力を3割増やし、High NAを量産の柱に育て、AIで装置と保守を高度化します。',
    '右上の「弱み×機会」は、機会を使って弱みを補う打ち手です。サプライヤーと一緒に能力を増やして単一供給元の制約を和らげ、新キャンパスとフロー工場でオランダの生産性を上げ、AIで社内の生産性を上げて人材不足を補います。',
    '左下の「強み×脅威」は守りの打ち手です。技術と保守の力で規制下でも顧客の信頼を保ち、中国以外の顧客の長期計画で中国向けの減少を埋めます。',
    '右下の「弱み×脅威」は、最悪の組み合わせを避ける打ち手です。中国比率の低下を前提に計画し、休戦の期限に備えて部品や材料を確保し、電力や人材の制約に備えて拠点の分担を考えます。',
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
      ['AI需要に合わせて能力を3割増やし、', { text: 'EUVの独占を売上に変える', softBreakBefore: true }],
      ['High NAを量産の柱に育て、', { text: '次の世代の独占を固める', softBreakBefore: true }],
      ['AIで装置の性能と保守を高度化し、', { text: '設置台数からの収益を伸ばす', softBreakBefore: true }],
    ]],
    [xW, yO, 'WO：転換', SWOT.O, [
      ['サプライヤーと一緒に能力を増やし、', { text: '単一供給元の制約を和らげる', softBreakBefore: true }],
      ['新キャンパスとフロー工場で、', { text: 'オランダの生産性を上げる', softBreakBefore: true }],
      ['AIで社内の生産性を上げ、', { text: '人材不足を補う', softBreakBefore: true }],
    ]],
    [xS, yT, 'ST：守り', SWOT.T, [
      ['技術と保守の力を武器に、', { text: '規制下でも顧客の信頼を保つ', softBreakBefore: true }],
      ['中国以外の顧客の長期計画で、', { text: '中国向けの減少を埋める', softBreakBefore: true }],
      ['High NAと計算機リソグラフィで、', { text: '新しい方式や中国勢との差を保つ', softBreakBefore: true }],
    ]],
    [xW, yT, 'WT：回避', SWOT.T, [
      ['中国比率の低下を前提に、', { text: '規制強化の影響を計画に織り込む', softBreakBefore: true }],
      ['休戦の期限に備え、', { text: '部品・材料の在庫と代わりを確保する', softBreakBefore: true }],
      ['電力・人材の制約に備え、', { text: '国内外の拠点の分担を考える', softBreakBefore: true }],
    ]],
  ];
  cells.forEach(([x, y, head, lens, items]) => {
    addCard(slide, x, y, cellW, cellH, { fill: C.gray, line: C.grid, lineWidth: 0.75 });
    addText(slide, head, x + 0.2, y + 0.1, cellW - 0.4, 0.34, { fontSize: 13, bold: true, color: lens.color });
    addBullets(slide, items, x + 0.25, y + 0.52, cellW - 0.45, cellH - 0.6, { fontSize: 11.5, space: 6 });
  });
  addSource(slide, '出所：SWOT分析 ②〜⑤ の各出典、ASMLの公表施策（能力増強、新キャンパス、ミストラルAIとの提携など）。組み合わせと打ち手の整理は本資料による');
}

// =====================================================================
// 29. ASMLの打ち手の評価
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ①　ASMLの打ち手の評価', '方向は合っている。論点は、供給網と拠点が拡大に追いつくか', [
    'ASMLが公表している施策を、クロスSWOTのどこに当たるかと合わせて評価しました。右端の評価と論点は、この資料としての見方です。',
    '最も大きいのは、2027年に低NA EUVと液浸DUVの能力を約30%増やす計画です。AIの需要が続けば最大の効果がありますが、ツァイスをはじめとするサプライヤーが同じ速さで能力を増やせるか、需要が反転したときに固定費が重荷にならないかが論点です。',
    '新キャンパスとフロー工場は、生産性を上げる中長期の打ち手ですが、第1期の完成は2029年で、電力網や人材の制約が残ります。',
    'ミストラルAIとの提携は、開発の加速をねらう先行投資です。成果の数字はまだ見えません。',
    '組織の再編、High NAの量産化、中国比率の低下を前提にした計画も、それぞれ方向は合っていますが、移行期の負担や採用の広がり、規制の行方という課題が残ります。',
  ]);
  const rows = tableRows(['公表済みの施策', 'ねらい', '関係', '評価と論点（本資料の見方）'], [
    ['能力増強（2027年に低NA EUV・液浸DUVを約30%増、2028年もさらに30%を検討）', 'AI需要の取り込み', 'SO', '需要が続けば最大の効果。ツァイスなどのサプライヤーが追随できるか、需要の反転時の固定費'],
    ['新キャンパス（BIC North）とフロー工場（2029年に第1期、最大2万人分）', '生産性と規模の拡大', 'WO', '中長期の打ち手。電力網・人材・住宅の制約と、地域の受け入れが鍵'],
    ['ミストラルAIとの提携（13億ユーロ、約11%）', '開発の加速、製品の高度化', 'SO・WO', '欧州のAIの主権とも合う先行投資。成果の数字はまだ見えない'],
    ['技術・IT組織の簡素化（約1,700人削減）', '技術開発への集中', 'WO', '再編の費用は計上済み。移行期の混乱と人材の流出に注意'],
    ['High NAの量産化（インテルで量産入り）', '次の世代の独占', 'SO', '顧客ごとに採用が分かれる。立ち上げ期の粗利率の低さ'],
    ['中国比率の低下を前提にした計画（2026年は売上の約20%）', '規制リスクの抑制', 'ST・WT', 'MATCH法案で保守まで止まれば、前提の見直しが必要'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.6, 2.25, 0.95, CONTENT_W - 6.8], { fontSize: 11, rowH: [0.4, 0.85, 0.8, 0.72, 0.72, 0.72, 0.8] });
  addSource(slide, '出所：ASML 2026年4〜6月期の決算発表・決算説明会・High NAの発表（2026-07-15）、新キャンパスの発表（2026-09-08）、ミストラルAIとの発表（2025-09-09）、\n2025年決算（2026-01-28）、TrendForce（2026-08-25）。評価は本資料による');
}

// =====================================================================
// 30. 今後の注目点
// =====================================================================
{
  const slide = newContentSlide(PART.IMPLICATION, '示唆 ②　今後の注目点', 'これから1年で見るべき7つの指標', [
    '今後の注目点を、見るべき指標や出来事と、時期の目安で整理しました。',
    '最も近いのは、10月14日に予定されている2026年7月から9月の決算です。売上の見通しは110億から120億ユーロで、2027年の見方も注目されます。日付はASMLの投資家向けページで確認しました。',
    '11月には、中国のレアアース規制の停止と、米国の50%ルールの停止が期限を迎えます。延長されるかどうかで、部品の調達や中国の顧客との取引の前提が変わります。',
    '年末にかけては、MATCH法案が米国の国防予算法に入るか、オランダが禁輸を広げるかが焦点です。',
    'そのほか、High NAの採用の広がり、能力増強の進み具合、AI活用の成果、そして2027年6月10日の投資家向け説明会での中長期の見通しの更新を見ていく必要があります。',
    'これらの結果によって、この資料のSWOTの評価も変わるので、定期的に見直すことをおすすめします。',
  ]);
  const rows = tableRows(['注目点', '見るべき指標・出来事', '時期の目安', '関係'], [
    ['① 7〜9月期の決算', '売上（見通し110〜120億ユーロ）、粗利率、2027年の見方', '2026年10月14日（予定）', 'O・T'],
    ['② 米中の休戦の期限', 'レアアース規制の停止、50%ルールの停止が延長されるか', '2026年11月10日', 'T'],
    ['③ MATCH法案', '国防予算法への盛り込み、オランダの対応、保守の扱い', '2026年末〜', 'T'],
    ['④ High NAの採用', 'サムスン・SKハイニックスの量産利用、TSMCの判断', '2027〜28年', 'O'],
    ['⑤ 能力増強の進み具合', '低NA EUV・液浸DUVの出荷台数、ツァイスの能力', '2027年', 'O・W'],
    ['⑥ AI活用の成果', 'ミストラルAIとの協業の成果、1人あたりの生産量', '随時', 'O・W'],
    ['⑦ 中長期の見通し', '投資家向け説明会（Capital Markets Day）での見通しの更新', '2027年6月10日', 'O'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [2.8, 5.6, 2.83, CONTENT_W - 11.23], { fontSize: 11, rowH: 0.62 });
  addSource(slide, '出所：これまでのスライドの各出典。①の日付はASMLの投資家向けページ「Quarterly results」（2026-10-10閲覧）、⑦はASMLの2026年4〜6月期の決算発表による');
}

// =====================================================================
// 31. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  drawWafer(slide, 0.8, 0.82, 0.34, { body: C.EUV, die: C.EUVLight });
  addText(slide, 'まとめ', 1.27, 0.78, 6.0, 0.45, { fontSize: 16, bold: true, color: C.primaryLight, valign: 'middle' });
  addText(slide, '独占の強さを、供給網と規制の制約の中で成長に変えられるか', 0.8, 1.35, 11.7, 0.7, { fontSize: 26, bold: true, color: C.white, valign: 'middle' });
  const messages = [
    ['強さの源泉', 'EUVとHigh NAを作れる唯一の会社。ツァイス・トルンプ・Cymerとの陣営と、設置台数が生む保守の収益が土台。AIは需要の源であり、社内の武器でもある'],
    ['転換点', 'AI投資で2026年は3割超の増収を見込む。一方で、米国の対中規制の強化と11月に期限を迎える米中の休戦、オランダの人材・電力の制約が成長を縛る'],
    ['次の成長の条件', '供給網と一緒に能力を3割増やし、High NAを量産の柱に育て、AIで開発と保守の生産性を上げられるか。成果を数字で示せるかが試金石'],
  ];
  const circleColors = [C.EUV, C.DUV, PEST.E.color];
  messages.forEach(([head, body], i) => {
    const y = 2.35 + i * 1.3;
    addCard(slide, 0.8, y, 11.73, 1.12, { fill: C.nightCard, line: C.nightLine, lineWidth: 1 });
    addCircle(slide, 1.3, y + 0.56, 0.5, circleColors[i], String(i + 1), { fontSize: 16 });
    addText(slide, head, 1.75, y + 0.1, 2.3, 0.92, { fontSize: 16, bold: true, color: C.white, valign: 'middle' });
    addText(slide, body, 4.1, y + 0.1, 8.25, 0.92, { fontSize: 13, color: C.onDarkSub, valign: 'middle' });
  });
  addText(slide, '公開情報に基づく整理であり、将来の業績や株価を保証・予想するものではありません。', 0.8, 6.45, 11.7, 0.35, { fontSize: 11, color: C.primaryLight });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.primaryLight, align: 'right' });
  slide.addNotes([
    'まとめです。',
    '1つ目、ASMLの強さの源泉は、EUVとHigh NAを作れる唯一の会社であることです。それを、光学系のツァイス、レーザーのトルンプ、光源のCymerといった陣営と、設置済みの装置が生む保守の収益が支えています。AIは、需要の源であると同時に、ASML自身の開発や保守を変える武器でもあります。',
    '2つ目、2026年はAI投資を受けて3割を超える増収を見込む一方で、米国の対中規制の強化、11月に期限を迎える米中の休戦、オランダの人材と電力の制約が、成長を縛る要因になっています。',
    '3つ目、次の成長の条件は、サプライヤーと一緒に能力を3割増やし、High NAを量産の柱に育て、AIで開発と保守の生産性を上げられるかです。そして、その成果を数字で示せるかが試金石になると考えます。',
    'この資料は公開情報に基づく整理であり、将来の業績や株価を予想するものではありません。',
  ].join('\n'));
}

// =====================================================================
// 32. 用語集
// =====================================================================
{
  const slide = newContentSlide(null, '付録 ①　用語集', 'この資料に出てくる主な用語', [
    'この資料に出てくる専門用語の意味をまとめました。',
    '特に、EUV、High NA、保守・アップグレードの3つは、ASMLの事業を理解するうえで重要な言葉です。',
    'EUVは、波長がとても短い光を使うことで、細かい回路を1回の露光で焼き付けられる方式です。High NAは、そのEUVのレンズの光を集める力をさらに高めた次の世代の装置です。',
    '保守・アップグレードは、すでに顧客の工場にある装置の保守と性能を上げる改造の事業で、ASMLの売上の約4分の1を占めます。',
  ]);
  const rows = tableRows(['用語', '意味'], [
    ['露光装置（リソグラフィ）', '光で回路の像をウエハーに焼き付ける装置。半導体の細かさを決める重要な工程'],
    ['EUV / DUV', '波長13.5nmの極端紫外光 ／ 波長193nmなどの深紫外光。波長が短いほど細かく焼ける'],
    ['液浸（ArFi）', 'レンズとウエハーの間を水で満たし、より細かく焼けるようにしたDUVの方式'],
    ['NAとHigh NA', 'NA（開口数）はレンズが光を集める力。低NAは0.33、High NAは0.55で、より細かく焼ける'],
    ['計算機リソグラフィ', '光の回り込みなどを計算し、露光の条件やマスクの模様をソフトウェアで最適化する技術'],
    ['計測・検査', '焼き付けた回路の位置ずれや欠陥を、光や電子ビームで測ること'],
    ['保守・アップグレード（IBM）', '設置済みの装置の保守と性能を上げる改造の事業（Installed Base Management）'],
    ['受注残', '受注したが、まだ売上に計上していない金額'],
    ['MATCH法案', '米国の法案。液浸DUVの対中輸出と、中国にある装置の保守の禁止を同盟国にも求める'],
    ['50%ルール', '米国の規制対象の企業が50%以上を持つ会社にも、同じ規制を広げる仕組み'],
    ['大規模言語モデル／AIエージェント', '文章やプログラムを扱う生成AIの中核 ／ 目的に沿って作業を自律的に進めるAI'],
  ], { fontSize: 11 });
  addTableBox(slide, rows, MARGIN_X, 1.5, CONTENT_W, [3.6, CONTENT_W - 3.6], { fontSize: 11, rowH: 0.42 });
  addSource(slide, '出所：ASML 年次報告書2025、TrendForce（2026-02-16・08-25）、The Motley Fool（2026-04-20）、Thompson Hine（2025-11-04）、Mistral AI（2026-04-24）の説明をもとに本資料で平易に言い換えた');
}

// =====================================================================
// 33〜34. 参考文献
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
    runs.push({ text: `[${no}] ${publisher}（${date}） `, options: { bold: true, color: C.ink, paraSpaceAfter: 9 } });
    runs.push({ text: linkLabel(url), options: { color: C.link, hyperlink: { url } } });
    runs.push({ text: `　${title}`, options: { color: C.ink, breakLine: !last } });
  });
  slide.addText(runs, {
    x, y, w, h,
    fontFace: FONT, fontSize: 10.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true, lang: 'ja-JP',
  });
}

function buildReferenceSlide(no, refs, startNo, notes) {
  const slide = newContentSlide(null, `付録 ${no}　参考文献`, `参考文献（${startNo}〜${startNo + refs.length - 1}）`, notes);
  const half = Math.ceil(refs.length / 2);
  const colW = (CONTENT_W - 0.35) / 2;
  addReferenceColumn(slide, refs.slice(0, half), startNo, MARGIN_X, 1.5, colW, 5.4);
  addReferenceColumn(slide, refs.slice(half), startNo + half, MARGIN_X + colW + 0.35, 1.5, colW, 5.4);
  addSource(slide, '青字のドメイン名をクリックすると出典のページが開く（確認日 2026-10-10）。取得状況と保存先は生成元フォルダの「参考文献リンク.md」にまとめた', { y: 7.02, h: 0.3 });
  return slide;
}

const REF_SPLIT = 18;
buildReferenceSlide('②', REFERENCES.slice(0, REF_SPLIT), 1, [
  '参考文献の前半です。ASMLの決算発表、年次報告書、投資家向けの資料、ASMLとミストラルAIの発表、主要サプライヤーに関する資料、オランダ政府の発表と、輸出規制に関する報道です。',
  'ASMLのWebサイトの発表ページはスクリプトからの取得が拒否されたため、同じ内容をASMLの公式資料置き場のPDFや、発表を配信しているMFN、Nasdaqの掲載から保存しました。',
  '各項目の末尾にある青字のドメイン名をクリックすると、出典のページが開きます。取得状況と保存したファイルは、生成元フォルダの「参考文献リンク.md」にまとめています。',
]);
buildReferenceSlide('③', REFERENCES.slice(REF_SPLIT), REF_SPLIT + 1, [
  '参考文献の後半です。輸出規制と通商、オランダの事業環境、装置市場と顧客の投資、競合の技術に関する資料と、決算の発表日を確認したASMLの投資家向けページです。',
  '報道に基づく内容は、スライドの中で「報道」と書いて、事実と区別しています。',
]);

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
