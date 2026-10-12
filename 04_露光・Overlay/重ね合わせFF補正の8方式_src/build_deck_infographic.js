// 重ね合わせFF補正の8方式：インフォグラフィック風（サマリー1枚＋詳細3枚）
//   大きな数字、色の丸に入れたアイコン、太い線でつないだ手順で見せる。グループごとに1色、推定だけ琥珀色にする。
//   中身（方式・文言・出典・ノート）は content.js、ミニ図と線は draw_common.js を使う。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck_infographic.js <出力パス>

const path = require('path');
const pptxgen = require('pptxgenjs');
const { DECK_DATE, DECK_NAME, GROUPS, METHODS, PAGES, circled, notesFor } = require('./content');
const { createLineDrawer, createWaferIcons } = require('./draw_common');

const OUTPUT_PATH = process.argv[2] || path.join(__dirname, 'deck_raw_infographic.pptx');

// ---- 定数 ----
const FONT = 'BIZ UDGothic';
const NUMBER_FONT = 'Arial';
const SLIDE_W = 13.333;
const MARGIN_X = 0.45;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const CONTENT_W = RIGHT_EDGE - MARGIN_X;
const TITLE_Y = 0.24;
const TITLE_H = 0.62;
const TITLE_FONT_SIZE = 24;
const LEAD_Y = 0.92;
const LEAD_H = 0.36;
const LEAD_FONT_SIZE = 11.5;
const BODY_TOP = 1.42;
const BODY_BOTTOM = 6.86;
const FOOTER_Y = 7.0;
const FOOTER_H = 0.28;
const FOOTER_FONT_SIZE = 9;
const TOTAL_PAGES = 4;

const C = {
  ink: '1B2233',
  sub: '5A6478',
  light: 'F1F4F8',
  line: 'D5DBE5',
  white: 'FFFFFF',
  amber: 'B7791A',
  amberTint: 'FBEFD9',
  red: 'C8443C',
  gray: '7A8396',
  good: '2E8B57',
};
const GROUP_COLOR = {
  A: { main: '3A4FB8', tint: 'E6E9F7', mid: 'A9B3E3' },
  B: { main: '0F8F80', tint: 'DDF2EF', mid: '8FD0C7' },
  C: { main: 'D9661C', tint: 'FBE7D9', mid: 'F2B48A' },
};

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせFF補正の8方式（インフォグラフィック風）';
pres.lang = 'ja-JP';

// ---- 描画の補助関数 ----
function addText(slide, content, x, y, w, h, options = {}) {
  slide.addText(content, {
    x, y, w, h,
    fontFace: FONT,
    lang: 'ja-JP',
    color: C.ink,
    fontSize: 11,
    margin: 0,
    valign: 'top',
    isTextBox: true,
    ...options,
  });
}

function addRect(slide, x, y, w, h, fill, line = null) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 0.75 } : { color: fill, width: 0 },
  });
}

function addRoundRect(slide, x, y, w, h, fill, line = null, { radius = 0.08, dashed = false, lineWidth = 0.75 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: radius, fill: { color: fill },
    line: line ? { color: line, width: lineWidth, ...(dashed ? { dashType: 'dash' } : {}) } : { color: fill, width: 0 },
  });
}

const addLine = createLineDrawer(pres, C.sub);

function addCircle(slide, cx, cy, d, fill, line = null, { dashed = false, lineWidth = 1.25 } = {}) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill },
    line: line ? { color: line, width: lineWidth, ...(dashed ? { dashType: 'dash' } : {}) } : { color: fill, width: 0 },
  });
}

// グループごとのミニ図（計測した所はグループの色）
const WAFER_ICONS = Object.fromEntries(Object.entries(GROUP_COLOR).map(([key, g]) => [key, createWaferIcons({
  pres, addText, addRect, addRoundRect: (slide, x, y, w, h, fill, line, opts) => addRoundRect(slide, x, y, w, h, fill, line, opts), addLine,
  colors: {
    white: C.white, waferLine: C.line, cellLine: 'DDE2EA', measured: g.main, estimated: C.amberTint,
    shape: [g.tint, g.mid, g.main, C.ink], ink: C.ink, film: C.red, badge: C.amber,
  },
})]));

// ---- アイコン（色の丸の中に白で描く） ----
function iconGlyph(slide, kind, cx, cy, d, color = C.white, background = C.ink) {
  const s = d;
  if (kind === 'loupe') {
    const r = s * 0.2;
    slide.addShape(pres.shapes.OVAL, { x: cx - s * 0.08 - r, y: cy - s * 0.08 - r, w: r * 2, h: r * 2, line: { color, width: Math.max(1.25, s * 4) } });
    addLine(slide, cx + s * 0.07, cy + s * 0.07, cx + s * 0.24, cy + s * 0.24, { color, width: Math.max(1.75, s * 5), arrow: false });
  } else if (kind === 'star') {
    slide.addShape(pres.shapes.STAR_4_POINT, { x: cx - s * 0.27, y: cy - s * 0.27, w: s * 0.54, h: s * 0.54, fill: { color }, line: { color, width: 0 } });
  } else if (kind === 'sigma') {
    addText(slide, 'Σ', cx - s / 2, cy - s / 2, s, s, { fontFace: NUMBER_FONT, fontSize: s * 34, bold: true, color, align: 'center', valign: 'middle' });
  } else if (kind === 'sun') {
    slide.addShape(pres.shapes.SUN, { x: cx - s * 0.3, y: cy - s * 0.3, w: s * 0.6, h: s * 0.6, fill: { color }, line: { color, width: 0 } });
  } else if (kind === 'arrow') {
    slide.addShape(pres.shapes.RIGHT_ARROW, { x: cx - s * 0.28, y: cy - s * 0.2, w: s * 0.56, h: s * 0.4, fill: { color }, line: { color, width: 0 } });
  } else if (kind === 'target') {
    slide.addShape(pres.shapes.DONUT, { x: cx - s * 0.28, y: cy - s * 0.28, w: s * 0.56, h: s * 0.56, fill: { color }, line: { color, width: 0 } });
    addCircle(slide, cx, cy, s * 0.14, color);
  } else if (kind === 'gear') {
    slide.addShape(pres.shapes.GEAR_6, { x: cx - s * 0.3, y: cy - s * 0.3, w: s * 0.6, h: s * 0.6, fill: { color }, line: { color, width: 0 } });
  } else if (kind === 'layers') {
    [-0.17, 0, 0.17].forEach((dy) => addRoundRect(slide, cx - s * 0.27, cy + s * dy - s * 0.05, s * 0.54, s * 0.1, color, null, { radius: 0.02 }));
  } else if (kind === 'data') {
    slide.addShape(pres.shapes.CAN, { x: cx - s * 0.2, y: cy - s * 0.27, w: s * 0.4, h: s * 0.54, fill: { color }, line: { color, width: 0 } });
  } else if (kind === 'check') {
    addLine(slide, cx - s * 0.22, cy + s * 0.02, cx - s * 0.06, cy + s * 0.18, { color, width: Math.max(1.75, s * 6), arrow: false });
    addLine(slide, cx - s * 0.06, cy + s * 0.18, cx + s * 0.24, cy - s * 0.16, { color, width: Math.max(1.75, s * 6), arrow: false });
  } else if (kind === 'alert') {
    addText(slide, '!', cx - s / 2, cy - s / 2, s, s, { fontFace: NUMBER_FONT, fontSize: s * 40, bold: true, color, align: 'center', valign: 'middle' });
  } else if (kind === 'wafer') {
    addCircle(slide, cx, cy, s * 0.62, color);
    addCircle(slide, cx + s * 0.04, cy - s * 0.04, s * 0.4, background);
    addCircle(slide, cx + s * 0.07, cy - s * 0.07, s * 0.18, color);
  }
}

function iconCircle(slide, kind, cx, cy, d, fill, { dashed = false, outline = null } = {}) {
  if (dashed) {
    addCircle(slide, cx, cy, d, C.white, outline || fill, { dashed: true, lineWidth: 1.5 });
    iconGlyph(slide, kind, cx, cy, d, outline || fill);
  } else {
    addCircle(slide, cx, cy, d, fill);
    iconGlyph(slide, kind, cx, cy, d, C.white, fill);
  }
}

// 手順の種類からアイコンと色を決める
function stepLook(groupKey, [type, title, , opts = {}]) {
  const g = GROUP_COLOR[groupKey];
  if (opts.dashed) return { icon: 'data', fill: g.main, dashed: true };
  if (type === 'measure') return { icon: 'loupe', fill: g.main };
  if (type === 'estimate') return { icon: 'star', fill: C.amber };
  if (type === 'calc') return { icon: 'sigma', fill: g.main };
  if (type === 'process') return { icon: 'gear', fill: C.gray };
  if (type === 'physical') return { icon: 'layers', fill: C.red };
  if (title.includes('オフセット')) return { icon: 'target', fill: C.ink };
  if (title.includes('送')) return { icon: 'arrow', fill: C.ink };
  return { icon: 'sun', fill: C.ink };
}

function numberCircle(slide, index, cx, cy, d, fill) {
  addCircle(slide, cx, cy, d, fill);
  addText(slide, String(index + 1), cx - d / 2, cy - d / 2, d, d, { fontFace: NUMBER_FONT, fontSize: d * 34, bold: true, color: C.white, align: 'center', valign: 'middle' });
}

function tagPill(slide, tag, x, y, w, h, color) {
  addRoundRect(slide, x, y, w, h, C.white, color, { radius: h / 2, lineWidth: 1.25 });
  addText(slide, tag, x, y, w, h, { fontSize: 9, bold: true, color, align: 'center', valign: 'middle' });
}

function textWidth(text, fontSize) {
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) < 0x2000 ? 0.55 : 1;
  return (units * fontSize) / 72;
}

function addTitle(slide, title, lead, groupKey) {
  const g = GROUP_COLOR[groupKey];
  numberLetter(slide, groupKey, MARGIN_X + 0.34, TITLE_Y + TITLE_H / 2, 0.66, g.main);
  addText(slide, title.replace(/^[ABC] /, ''), MARGIN_X + 0.82, TITLE_Y, CONTENT_W - 2.4, TITLE_H, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, DECK_DATE, RIGHT_EDGE - 1.6, TITLE_Y, 1.6, TITLE_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, align: 'right', valign: 'middle' });
  addText(slide, lead, MARGIN_X, LEAD_Y, CONTENT_W, LEAD_H, { fontSize: LEAD_FONT_SIZE, color: C.sub, valign: 'middle' });
}

function numberLetter(slide, letter, cx, cy, d, fill) {
  addCircle(slide, cx, cy, d, fill);
  addText(slide, letter, cx - d / 2, cy - d / 2, d, d, { fontFace: NUMBER_FONT, fontSize: d * 36, bold: true, color: C.white, align: 'center', valign: 'middle' });
}

function addFooter(slide, page, note) {
  addText(slide, note, MARGIN_X, FOOTER_Y, CONTENT_W - 2.6, FOOTER_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, valign: 'middle' });
  addText(slide, `${DECK_NAME}　${page} / ${TOTAL_PAGES}`, RIGHT_EDGE - 2.4, FOOTER_Y, 2.4, FOOTER_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, align: 'right', valign: 'middle' });
}

// ---- 詳細スライドの「方式のブロック」：アイコンの丸を太い線でつないだ手順 ----
const BLOCK_PAD = 0.16;
const TALL_BLOCK_H = 2.2;

function drawBlock(slide, groupKey, methodIndex, x, y, w, h) {
  const m = METHODS[methodIndex];
  const g = GROUP_COLOR[groupKey];
  const tall = h >= TALL_BLOCK_H;
  addRoundRect(slide, x, y, w, h, C.light, null, { radius: 0.1 });
  const innerX = x + BLOCK_PAD;
  const innerW = w - BLOCK_PAD * 2;

  // 見出し
  const headY = y + 0.08;
  numberCircle(slide, methodIndex, innerX + 0.2, headY + 0.2, 0.4, g.main);
  addText(slide, [
    { text: m.name, options: { fontSize: 15, bold: true } },
    { text: `　${m.sub}`, options: { fontSize: 11, color: C.sub } },
  ], innerX + 0.52, headY, innerW - 1.6, 0.4, { valign: 'middle' });
  tagPill(slide, m.tag, x + w - BLOCK_PAD - 1.0, headY + 0.07, 1.0, 0.26, g.main);

  // 手順：等間隔の丸と、それをつなぐ太い線
  const n = m.flow.length;
  const slotW = innerW / n;
  const circleD = tall ? 0.54 : 0.5;
  const circleY = headY + 0.42 + circleD / 2 + 0.02;
  addLine(slide, innerX + slotW / 2, circleY, innerX + slotW * (n - 0.5), circleY, { color: g.mid, width: 5, arrow: false });
  m.flow.forEach((step, k) => {
    const cx = innerX + slotW * (k + 0.5);
    const look = stepLook(groupKey, step);
    iconCircle(slide, look.icon, cx, circleY, circleD, look.fill, { dashed: look.dashed });
    const labelY = circleY + circleD / 2 + 0.04;
    if (tall) {
      addText(slide, [
        { text: step[1], options: { fontSize: 10.5, bold: true, breakLine: true } },
        { text: step[2], options: { fontSize: 9, color: C.sub } },
      ], cx - slotW / 2 + 0.06, labelY, slotW - 0.12, 0.5, { align: 'center', paraSpaceAfter: 1 });
    } else {
      addText(slide, step[1], cx - slotW / 2 + 0.04, labelY, slotW - 0.08, 0.22, { fontSize: 10, bold: true, align: 'center' });
    }
  });

  // 補正・利点・注意
  const infoH = tall ? 0.5 : 0.36;
  const infoY = y + h - infoH - 0.08;
  const colGap = 0.2;
  const colW = (innerW - colGap * 2) / 3;
  const iconD = 0.3;
  [['target', g.main, m.correction], ['check', C.good, m.merit], ['alert', C.amber, m.caution]].forEach(([icon, color, text], k) => {
    const colX = innerX + k * (colW + colGap);
    iconCircle(slide, icon, colX + iconD / 2, infoY + iconD / 2, iconD, color);
    addText(slide, text, colX + iconD + 0.08, infoY, colW - iconD - 0.08, infoH, { fontSize: tall ? 10 : 9.5 });
  });
}

function drawBlocks(slide, groupKey, x, y, w, h) {
  const gap = 0.14;
  const methods = GROUPS[groupKey].methods;
  const blockH = (h - gap * (methods.length - 1)) / methods.length;
  methods.forEach((methodIndex, k) => drawBlock(slide, groupKey, methodIndex, x, y + k * (blockH + gap), w, blockH));
}

// ---- 詳細スライドの左の列 ----
const PANEL_W = 3.3;
const PANEL_PAD = 0.18;
const BLOCKS_X = MARGIN_X + PANEL_W + 0.22;
const BLOCKS_W = RIGHT_EDGE - BLOCKS_X;

function drawPanel(slide, groupKey, visual) {
  const g = GROUP_COLOR[groupKey];
  addRoundRect(slide, MARGIN_X, BODY_TOP, PANEL_W, BODY_BOTTOM - BODY_TOP, g.tint, null, { radius: 0.1 });
  const x = MARGIN_X + PANEL_PAD;
  const w = PANEL_W - PANEL_PAD * 2;
  addText(slide, 'ひと目で', x, BODY_TOP + 0.12, w, 0.3, { fontSize: 12, bold: true, color: g.main, valign: 'middle' });
  const factsY = visual(x, BODY_TOP + 0.5, w);
  addLine(slide, x, factsY, x + w, factsY, { color: g.mid, width: 1, arrow: false });
  addText(slide, 'ポイント', x, factsY + 0.1, w, 0.3, { fontSize: 12, bold: true, color: g.main, valign: 'middle' });
  const icons = { 計測装置: ['gear', C.gray], 計測するもの: ['loupe', g.main], 強み: ['check', C.good], 課題: ['alert', C.amber] };
  const facts = PAGES[groupKey].facts;
  const top = factsY + 0.48;
  const rowH = (BODY_BOTTOM - 0.1 - top) / facts.length;
  facts.forEach(([label, text], k) => {
    const rowY = top + k * rowH;
    const [icon, color] = icons[label];
    iconCircle(slide, icon, x + 0.18, rowY + 0.18, 0.36, color);
    addText(slide, [
      { text: label, options: { bold: true, color: g.main, breakLine: true } },
      { text },
    ], x + 0.46, rowY, w - 0.46, rowH, { fontSize: 10, paraSpaceAfter: 1 });
  });
}

// ミニ図を横に並べ、下に短い説明を付ける
function waferRow(slide, groupKey, items, x, y, w, d = 0.72) {
  const slot = w / items.length;
  items.forEach(([methodIndex, caption], k) => {
    const cx = x + slot * (k + 0.5);
    WAFER_ICONS[groupKey](slide, METHODS[methodIndex].icon, cx, y + d / 2, d);
    numberCircle(slide, methodIndex, cx - d / 2 + 0.06, y + 0.06, 0.26, GROUP_COLOR[groupKey].main);
    addText(slide, caption, cx - slot / 2, y + d + 0.06, slot, 0.24, { fontSize: 9.5, bold: true, align: 'center', valign: 'middle' });
  });
  return y + d + 0.34;
}

// ================= p.1 サマリー =================
function buildSummary() {
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  // 大きな「8」と見出し
  addText(slide, '8', MARGIN_X - 0.05, 0.08, 1.0, 1.15, { fontFace: NUMBER_FONT, fontSize: 92, bold: true, color: C.ink, align: 'center', valign: 'middle' });
  addText(slide, [
    { text: 'つの方式で見る', options: { fontSize: 14, color: C.sub, breakLine: true } },
    { text: '重ね合わせFF補正の全体像', options: { fontSize: 26, bold: true } },
  ], MARGIN_X + 1.0, 0.2, CONTENT_W - 2.6, 0.82, { valign: 'middle', paraSpaceAfter: 2 });
  addText(slide, DECK_DATE, RIGHT_EDGE - 1.6, 0.24, 1.6, 0.4, { fontSize: FOOTER_FONT_SIZE, color: C.sub, align: 'right', valign: 'middle' });
  addText(slide, PAGES.summary.lead, MARGIN_X + 1.0, 1.0, CONTENT_W - 1.0, 0.34, { fontSize: LEAD_FONT_SIZE, color: C.sub, valign: 'middle' });

  const colGap = 0.25;
  const colW = (CONTENT_W - colGap * 2) / 3;
  const colY = BODY_TOP + 0.08;
  const colH = 4.78;
  ['A', 'B', 'C'].forEach((key, gi) => {
    const group = GROUPS[key];
    const g = GROUP_COLOR[key];
    const x = MARGIN_X + gi * (colW + colGap);
    addRoundRect(slide, x, colY, colW, colH, C.light, null, { radius: 0.1 });

    // 見出し：アイコン・名前・方式の数
    const headIcon = { A: 'sun', B: 'loupe', C: 'wafer' }[key];
    iconCircle(slide, headIcon, x + 0.6, colY + 0.58, 0.82, g.main);
    addText(slide, `${group.letter}　${group.name}`, x + 1.15, colY + 0.16, colW - 1.3, 0.42, { fontSize: 17, bold: true, color: g.main, valign: 'middle' });
    addText(slide, [
      { text: String(group.methods.length), options: { fontFace: NUMBER_FONT, fontSize: 26, bold: true, color: C.ink } },
      { text: ' 方式', options: { fontSize: 12, color: C.ink } },
    ], x + 1.15, colY + 0.58, 1.3, 0.46, { valign: 'middle' });
    addText(slide, group.sub, x + 0.2, colY + 1.12, colW - 0.4, 0.42, { fontSize: 10, color: C.sub, valign: 'middle' });

    // 方式のカード
    const cardTop = colY + 1.62;
    const cardH = 0.7;
    group.methods.forEach((methodIndex, k) => {
      const m = METHODS[methodIndex];
      const cy = cardTop + k * (cardH + 0.1);
      addRoundRect(slide, x + 0.16, cy, colW - 0.32, cardH, C.white, null, { radius: 0.08 });
      numberCircle(slide, methodIndex, x + 0.16 + 0.34, cy + cardH / 2, 0.44, g.main);
      const textX = x + 0.16 + 0.68;
      addText(slide, m.name, textX, cy + 0.06, textWidth(m.name, 12.5) + 0.1, 0.3, { fontSize: 12.5, bold: true, valign: 'middle' });
      tagPill(slide, m.tag, textX + textWidth(m.name, 12.5) + 0.12, cy + 0.1, textWidth(m.tag, 9) + 0.24, 0.22, g.main);
      addText(slide, m.summary, textX, cy + 0.36, colW - 0.32 - 0.68 - 0.72, 0.28, { fontSize: 9.5, color: C.sub, valign: 'middle' });
      WAFER_ICONS[key](slide, m.icon, x + colW - 0.16 - 0.4, cy + cardH / 2, 0.52);
    });
    if (group.note) {
      const ny = cardTop + group.methods.length * (cardH + 0.1);
      addRoundRect(slide, x + 0.16, ny, colW - 0.32, cardH, C.white, g.main, { radius: 0.08, lineWidth: 1.25 });
      addText(slide, group.note.map((t, k) => ({ text: t, options: { breakLine: k < group.note.length - 1, bold: k === 1, color: k === 1 ? g.main : C.ink } })), x + 0.3, ny, colW - 0.6, cardH, { fontSize: 10, valign: 'middle' });
    }

    // 強み・課題
    const evalY = colY + colH - 0.86;
    [['check', C.good, group.strength], ['alert', C.amber, group.issue]].forEach(([icon, color, text], k) => {
      const rowY = evalY + k * 0.38;
      iconCircle(slide, icon, x + 0.34, rowY + 0.16, 0.3, color);
      addText(slide, text, x + 0.58, rowY, colW - 0.74, 0.32, { fontSize: 10.5, valign: 'middle' });
    });
  });

  // 共通の4ステップ
  const stepY = colY + colH + 0.2;
  addText(slide, '共通の4ステップ', MARGIN_X, stepY, 1.5, 0.4, { fontSize: 11, bold: true, valign: 'middle' });
  const steps = [['loupe', C.ink, '計測'], ['star', C.amber, '推定（③⑤⑧）'], ['sigma', C.ink, '補正量の計算'], ['sun', C.ink, '露光機で補正・露光']];
  const stepX0 = MARGIN_X + 1.6;
  const stepW = 1.95;
  addLine(slide, stepX0 + 0.2, stepY + 0.2, stepX0 + stepW * (steps.length - 1) + 0.2, stepY + 0.2, { color: C.line, width: 5, arrow: false });
  steps.forEach(([icon, color, label], k) => {
    const sx = stepX0 + k * stepW;
    iconCircle(slide, icon, sx + 0.2, stepY + 0.2, 0.4, color);
    addRect(slide, sx + 0.44, stepY + 0.06, textWidth(label, 10.5) + 0.12, 0.28, C.white);
    addText(slide, label, sx + 0.48, stepY, stepW - 0.5, 0.4, { fontSize: 10.5, bold: true, valign: 'middle' });
  });
  const px = stepX0 + stepW * steps.length + 0.1;
  iconCircle(slide, 'layers', px + 0.2, stepY + 0.2, 0.4, C.red);
  addText(slide, '⑦は成膜で物理補正', px + 0.48, stepY, 2.0, 0.4, { fontSize: 10.5, bold: true, color: C.red, valign: 'middle' });
  if (px + 0.48 + textWidth('⑦は成膜で物理補正', 10.5) > RIGHT_EDGE + 0.05) throw new Error('4ステップの帯が右端を超えています');

  addFooter(slide, 1, PAGES.summary.footer);
  slide.addNotes(notesFor('summary'));
}

// ================= p.2 A 露光機単独 =================
function buildScannerOnly() {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.A.title, PAGES.A.lead, 'A');
  drawPanel(slide, 'A', (x, y, w) => {
    const next = waferRow(slide, 'A', [[0, '少数点'], [1, '多点'], [2, '多点＋推定']], x, y, w);
    // 点数が増えるほど時間がかかる（③は推定で点数を抑える）
    addLine(slide, x + 0.2, next + 0.08, x + w - 0.2, next + 0.08, { color: GROUP_COLOR.A.main, width: 2.5 });
    addText(slide, '計測点数が増える＝計測時間が増える', x, next + 0.14, w, 0.24, { fontSize: 9.5, color: C.sub, align: 'center', valign: 'middle' });
    iconCircle(slide, 'star', x + 0.14, next + 0.56, 0.26, C.amber);
    addText(slide, '③は推定で、点数を増やさず細かく補正', x + 0.32, next + 0.42, w - 0.32, 0.28, { fontSize: 9.5, bold: true, color: C.amber, valign: 'middle' });
    return next + 0.86;
  });
  drawBlocks(slide, 'A', BLOCKS_X, BODY_TOP, BLOCKS_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 2, PAGES.A.footer);
  slide.addNotes(notesFor('A'));
}

// ================= p.3 B Litho Booster =================
function buildLithoBooster() {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.B.title, PAGES.B.lead, 'B');
  const g = GROUP_COLOR.B;
  drawPanel(slide, 'B', (x, y, w) => {
    const next = waferRow(slide, 'B', [[3, '全Shotを計測'], [4, '一部＋推定']], x, y, w, 0.62);
    // 最終の補正量＝露光機の線形項＋Litho Boosterの高次・Shot項
    addText(slide, PAGES.B.formula[0], x, next, w, 0.26, { fontSize: 10, bold: true, color: g.main, valign: 'middle' });
    const chipY = next + 0.28;
    const chipH = 0.3;
    addRoundRect(slide, x, chipY, w, chipH, C.white, g.main, { radius: 0.06 });
    addText(slide, PAGES.B.formula[1], x, chipY, w, chipH, { fontSize: 10, bold: true, align: 'center', valign: 'middle' });
    addText(slide, '＋', x, chipY + chipH, w, 0.2, { fontSize: 12, bold: true, color: g.main, align: 'center', valign: 'middle' });
    addRoundRect(slide, x, chipY + chipH + 0.2, w, chipH, g.main, null, { radius: 0.06 });
    addText(slide, PAGES.B.formula[2].replace(/^＋ /, ''), x, chipY + chipH + 0.2, w, chipH, { fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle' });
    return chipY + chipH * 2 + 0.34;
  });

  // ④と⑤の使い分け（2つのカード）
  const choiceH = 0.74;
  drawBlocks(slide, 'B', BLOCKS_X, BODY_TOP, BLOCKS_W, BODY_BOTTOM - BODY_TOP - choiceH - 0.14);
  const choiceY = BODY_BOTTOM - choiceH;
  const cardW = (BLOCKS_W - 0.2) / 2;
  PAGES.B.choice.lines.forEach((line, k) => {
    const cx = BLOCKS_X + k * (cardW + 0.2);
    addRoundRect(slide, cx, choiceY, cardW, choiceH, C.white, g.main, { radius: 0.08, lineWidth: 1.25 });
    numberCircle(slide, 3 + k, cx + 0.32, choiceY + choiceH / 2, 0.42, g.main);
    addText(slide, [
      { text: `${circled(3 + k)}を選ぶとき`, options: { bold: true, color: g.main, breakLine: true } },
      { text: line.replace(/^[④⑤]：/, '') },
    ], cx + 0.62, choiceY + 0.04, cardW - 0.74, choiceH - 0.08, { fontSize: 10, valign: 'middle', paraSpaceAfter: 1 });
  });
  addFooter(slide, 3, PAGES.B.footer);
  slide.addNotes(notesFor('B'));
}

// ================= p.4 C Wafer歪み計測 =================
function buildWaferDistortion() {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.C.title, PAGES.C.lead, 'C');
  const g = GROUP_COLOR.C;
  drawPanel(slide, 'C', (x, y, w) => {
    // PWGの形状 → 面内歪み → 3つの使い方
    addRoundRect(slide, x, y, w, 0.36, g.main, null, { radius: 0.06 });
    addText(slide, 'PWG：表裏の形状 → 面内歪み（IPD）', x, y, w, 0.36, { fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle' });
    const slot = w / 3;
    [0, 1, 2].forEach((k) => addLine(slide, x + w / 2, y + 0.38, x + slot * (k + 0.5), y + 0.56, { color: g.main, width: 1.25 }));
    return waferRow(slide, 'C', [[5, '露光機で補正'], [6, '裏面膜で低減'], [7, 'NZOを予測']], x, y + 0.6, w, 0.66) + 0.04;
  });
  drawBlocks(slide, 'C', BLOCKS_X, BODY_TOP, BLOCKS_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 4, PAGES.C.footer);
  slide.addNotes(notesFor('C'));
}

buildSummary();
buildScannerOnly();
buildLithoBooster();
buildWaferDistortion();

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}`));
