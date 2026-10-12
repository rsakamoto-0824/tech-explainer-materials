// 重ね合わせFF（フィードフォワード）補正の8方式：サマリー1枚＋詳細3枚
//   p.1 サマリー（A 露光機単独／B Litho Booster／C Wafer歪み計測）
//   p.2 A 露光機単独（①低次 ②高次 ③推定＋高次）
//   p.3 B Litho Booster（④全Shot ⑤推定＋全Shot）
//   p.4 C Wafer歪み計測（⑥高次 ⑦裏面CVD ⑧NZO）
// 標準版。中身（方式・文言・出典・ノート）は content.js、ミニ図と線は draw_common.js にある。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>

const path = require('path');
const pptxgen = require('pptxgenjs');
const { DECK_DATE, DECK_NAME, GROUPS, METHODS, PAGES, circled, notesFor } = require('./content');
const { createLineDrawer, createWaferIcons } = require('./draw_common');

const OUTPUT_PATH = process.argv[2] || path.join(__dirname, 'deck_raw.pptx');

// ---- 定数 ----
const FONT = 'BIZ UDGothic';
const SLIDE_W = 13.333;
const MARGIN_X = 0.45;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const CONTENT_W = RIGHT_EDGE - MARGIN_X;

const TITLE_Y = 0.3;
const TITLE_H = 0.5;
const TITLE_FONT_SIZE = 24;
const LEAD_Y = 0.82;
const LEAD_H = 0.42;
const LEAD_FONT_SIZE = 12;
const BODY_TOP = 1.38;
const BODY_BOTTOM = 6.85;
const FOOTER_Y = 7.0;
const FOOTER_H = 0.28;
const FOOTER_FONT_SIZE = 9;

const C = {
  ink: '1C2230',
  muted: '5B6275',
  line: 'C9CED9',
  frame: 'E1E4EA',
  card: 'F6F7F9',
  panel: 'EEF1F7',
  navy: '24365E',
  band: '2B3550',
  onDark: 'FFFFFF',
  onDarkSub: 'D5DCEA',
  white: 'FFFFFF',
  teal: '12877A',
  tealTint: 'DCF0ED',
  tealMid: '8CCFC4',
  tealDeep: '4BAA9C',
  gold: 'A4741B',
  goldTint: 'F8EDD5',
  goldLine: 'E2C887',
  goldDark: '6B4E10',
  estTint: 'F1D9A2',
  terra: 'A9554B',
  gray: 'EEF0F4',
  grayText: '3A4256',
  waferLine: '9AA3B5',
  cellLine: 'D5DAE3',
};

// フローの箱の種類（色と凡例の名前）。detail は箱の中の小さい説明文の色
const STEP = {
  process: { label: '工程・搬送', fill: C.gray, text: C.grayText, detail: C.muted, border: C.line },
  measure: { label: '計測', fill: C.teal, text: C.white, detail: 'E3F4F1', border: C.teal },
  estimate: { label: '推定', fill: C.gold, text: C.white, detail: 'FBF0DA', border: C.gold },
  calc: { label: '補正量の計算', fill: C.goldTint, text: C.goldDark, detail: '7A6234', border: C.goldLine },
  scanner: { label: '露光機での補正・露光', fill: C.navy, text: C.white, detail: 'DCE3F0', border: C.navy },
  physical: { label: '成膜による物理補正', fill: C.terra, text: C.white, detail: 'FBE6E2', border: C.terra },
};

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせFF補正の8方式：必要な計測とプロセスフロー';
pres.lang = 'ja-JP';
const TOTAL_PAGES = 4;

// ---- 描画の補助関数（slide を受け取る） ----
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

function addRect(slide, x, y, w, h, fill, line = null, lineOptions = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: line ? { color: line, width: 0.75, ...lineOptions } : { color: fill, width: 0 },
  });
}

function addRoundRect(slide, x, y, w, h, fill, line, { radius = 0.06, dashed = false, lineWidth = 0.75 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill },
    line: { color: line, width: lineWidth, ...(dashed ? { dashType: 'dash' } : {}) },
  });
}

const addLine = createLineDrawer(pres, C.muted);

function addNumberCircle(slide, index, x, y, d, fill = C.band) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  addText(slide, String(index + 1), x, y, d, d, { fontSize: d > 0.32 ? 13 : 11, bold: true, color: C.white, align: 'center', valign: 'middle' });
}

function addTagPill(slide, tag, x, y, w = 0.82, h = 0.24) {
  addRoundRect(slide, x, y, w, h, C.white, C.navy, { radius: 0.12, lineWidth: 1 });
  addText(slide, tag, x, y, w, h, { fontSize: 9.5, bold: true, color: C.navy, align: 'center', valign: 'middle' });
}

function addTitle(slide, title, lead) {
  addText(slide, title, MARGIN_X, TITLE_Y, CONTENT_W - 1.6, TITLE_H, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, DECK_DATE, RIGHT_EDGE - 1.6, TITLE_Y, 1.6, TITLE_H, { fontSize: FOOTER_FONT_SIZE, color: C.muted, align: 'right', valign: 'middle' });
  addText(slide, lead, MARGIN_X, LEAD_Y, CONTENT_W, LEAD_H, { fontSize: LEAD_FONT_SIZE, color: C.muted, valign: 'middle' });
}

function addFooter(slide, page, note) {
  addText(slide, note, MARGIN_X, FOOTER_Y, CONTENT_W - 2.6, FOOTER_H, { fontSize: FOOTER_FONT_SIZE, color: C.muted, valign: 'middle' });
  addText(slide, `${DECK_NAME}　${page} / ${TOTAL_PAGES}`, RIGHT_EDGE - 2.4, FOOTER_Y, 2.4, FOOTER_H, {
    fontSize: FOOTER_FONT_SIZE, color: C.muted, align: 'right', valign: 'middle',
  });
}

// ---- 計測範囲のミニ図 ----
const drawIcon = createWaferIcons({
  pres, addText, addRect, addRoundRect, addLine,
  colors: {
    white: C.white, waferLine: C.waferLine, cellLine: C.cellLine, measured: C.teal, estimated: C.estTint,
    shape: [C.tealTint, C.tealMid, C.tealDeep, C.teal], ink: C.grayText, film: C.terra, badge: C.gold,
  },
});

// ---- フローの箱（見出し＋説明） ----
const CHIP_GAP = 0.2;
const CHIP_TITLE_SIZE = 10;
const CHIP_DETAIL_SIZE = 9;

function drawFlow(slide, steps, x, y, w, h) {
  const n = steps.length;
  const chipW = (w - (n - 1) * CHIP_GAP) / n;
  steps.forEach(([type, title, detail, opts = {}], k) => {
    const style = STEP[type];
    const chipX = x + k * (chipW + CHIP_GAP);
    addRoundRect(slide, chipX, y, chipW, h, opts.dashed ? C.white : style.fill, style.border, { dashed: !!opts.dashed, lineWidth: opts.dashed ? 1.25 : 0.75 });
    addText(slide, [
      { text: title, options: { fontSize: CHIP_TITLE_SIZE, bold: true, color: style.text, breakLine: true } },
      { text: detail, options: { fontSize: CHIP_DETAIL_SIZE, color: opts.dashed ? C.muted : style.detail } },
    ], chipX + 0.06, y + 0.04, chipW - 0.12, h - 0.08, { align: 'center', valign: 'middle', paraSpaceAfter: 2 });
    if (k < n - 1) addLine(slide, chipX + chipW + 0.03, y + h / 2, chipX + chipW + CHIP_GAP - 0.03, y + h / 2, { width: 1.25 });
  });
}

// ---- 詳細スライドの「方式の帯」 ----
const LANE_PAD = 0.14;
const TALL_LANE_H = 2.2;

function drawLane(slide, methodIndex, x, y, w, h) {
  const m = METHODS[methodIndex];
  addRect(slide, x, y, w, h, C.card, C.frame);
  const innerX = x + LANE_PAD;
  const innerW = w - LANE_PAD * 2;

  // 見出し：番号・方式名・補足・補正の細かさ
  const tall = h >= TALL_LANE_H;
  const headY = y + (tall ? 0.1 : 0.08);
  addNumberCircle(slide, methodIndex, innerX, headY, 0.32);
  addText(slide, [
    { text: m.name, options: { fontSize: 14, bold: true } },
    { text: `　${m.sub}`, options: { fontSize: 11, color: C.muted } },
  ], innerX + 0.42, headY, innerW - 1.4, 0.32, { valign: 'middle' });
  addTagPill(slide, m.tag, x + w - LANE_PAD - 0.95, headY + 0.04, 0.95);

  // プロセスフロー（背の高い帯では文字の欄を広げる）
  const textH = tall ? 0.62 : 0.46;
  const flowY = headY + 0.4;
  const flowH = h - (flowY - y) - textH - (tall ? 0.16 : 0.12);
  drawFlow(slide, m.flow, innerX, flowY, innerW, flowH);

  // 補正の内容・利点・注意
  const textY = y + h - textH - 0.06;
  const colGap = 0.22;
  const colW = (innerW - colGap * 2) / 3;
  [['補正', m.correction, C.navy], ['利点', m.merit, C.teal], ['注意', m.caution, C.terra]].forEach(([label, text, color], k) => {
    addText(slide, [
      { text: `${label}｜`, options: { bold: true, color } },
      { text },
    ], innerX + k * (colW + colGap), textY, colW, textH, { fontSize: tall ? 10.5 : 10, valign: 'top' });
  });
}

function drawLanes(slide, group, x, y, w, h) {
  const gap = 0.14;
  const n = group.methods.length;
  const laneH = (h - gap * (n - 1)) / n;
  group.methods.forEach((methodIndex, k) => drawLane(slide, methodIndex, x, y + k * (laneH + gap), w, laneH));
}

// ---- 詳細スライドの左パネル（共通の前提） ----
const PANEL_W = 3.25;
const PANEL_PAD = 0.16;
const LANES_X = MARGIN_X + PANEL_W + 0.25;
const LANES_W = RIGHT_EDGE - LANES_X;

function drawPanelFrame(slide, heading) {
  addRect(slide, MARGIN_X, BODY_TOP, PANEL_W, BODY_BOTTOM - BODY_TOP, C.panel);
  addText(slide, heading, MARGIN_X + PANEL_PAD, BODY_TOP + 0.12, PANEL_W - PANEL_PAD * 2, 0.3, { fontSize: 13, bold: true, valign: 'middle' });
}

function drawFacts(slide, facts, y, fontSize = 10.5) {
  const runs = [];
  facts.forEach(([label, text], k) => {
    runs.push({ text: `${label}：`, options: { bold: true, color: C.navy } });
    runs.push({ text, options: { breakLine: k < facts.length - 1 } });
  });
  addText(slide, runs, MARGIN_X + PANEL_PAD, y, PANEL_W - PANEL_PAD * 2, BODY_BOTTOM - y - 0.12, { fontSize, paraSpaceAfter: 6 });
}

// 小さな箱（左パネルの図用）
function panelBox(slide, type, text, x, y, w, h, fontSize = 10) {
  const style = STEP[type];
  addRoundRect(slide, x, y, w, h, style.fill, style.border);
  addText(slide, text, x + 0.05, y, w - 0.1, h, { fontSize, bold: true, color: style.text, align: 'center', valign: 'middle' });
}

// ================= p.1 サマリー =================
function buildSummary() {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.summary.title, PAGES.summary.lead);

  const cardGap = 0.25;
  const cardW = (CONTENT_W - cardGap * 2) / 3;
  const cardY = BODY_TOP;
  const cardH = 4.95;
  const headerH = 0.82;
  const itemTop = cardY + headerH + 0.62;
  const itemH = 0.76;
  const iconD = 0.58;

  ['A', 'B', 'C'].forEach((key, gi) => {
    const g = GROUPS[key];
    const x = MARGIN_X + gi * (cardW + cardGap);
    addRect(slide, x, cardY, cardW, cardH, C.card, C.frame);
    addRect(slide, x, cardY, cardW, headerH, C.band);
    addText(slide, [
      { text: `${g.letter}　${g.name}`, options: { fontSize: 18, bold: true, color: C.onDark, breakLine: true } },
      { text: g.sub, options: { fontSize: 10, color: C.onDarkSub } },
    ], x + 0.18, cardY + 0.08, cardW - 0.36, headerH - 0.16, { valign: 'middle', paraSpaceAfter: 3 });

    addText(slide, [
      { text: '計測：', options: { bold: true, color: C.navy } },
      { text: g.measureTarget },
    ], x + 0.18, cardY + headerH + 0.12, cardW - 0.36, 0.42, { fontSize: 10.5, valign: 'middle' });

    g.methods.forEach((methodIndex, k) => {
      const m = METHODS[methodIndex];
      const y = itemTop + k * itemH;
      drawIcon(slide, m.icon, x + 0.18 + iconD / 2, y + iconD / 2 + 0.02, iconD);
      const textX = x + 0.18 + iconD + 0.16;
      const textW = x + cardW - 0.18 - textX;
      addText(slide, `${circled(methodIndex)} ${m.name}`, textX, y, textW - 0.92, 0.26, { fontSize: 12.5, bold: true, valign: 'middle' });
      addTagPill(slide, m.tag, x + cardW - 0.18 - 0.86, y + 0.02, 0.86, 0.22);
      addText(slide, m.summary, textX, y + 0.28, textW, 0.42, { fontSize: 10.5, color: C.ink });
    });
    if (g.note) {
      const noteY = itemTop + g.methods.length * itemH + 0.04;
      addRect(slide, x + 0.18, noteY, cardW - 0.36, 0.62, C.white, C.navy);
      addText(slide, g.note.map((line, k) => ({ text: line, options: { breakLine: k < g.note.length - 1 } })), x + 0.3, noteY, cardW - 0.6, 0.62, { fontSize: 10, color: C.navy, bold: true, valign: 'middle' });
    }

    const evalY = cardY + cardH - 1.0;
    slide.addShape(pres.shapes.LINE, { x: x + 0.18, y: evalY - 0.08, w: cardW - 0.36, h: 0, line: { color: C.frame, width: 0.75 } });
    addText(slide, [
      { text: '強み｜', options: { bold: true, color: C.teal } },
      { text: g.strength, options: { breakLine: true } },
      { text: '課題｜', options: { bold: true, color: C.terra } },
      { text: g.issue },
    ], x + 0.18, evalY, cardW - 0.36, 0.78, { fontSize: 10.5, paraSpaceAfter: 4 });
    addText(slide, `詳細 → p.${g.page}`, x + cardW - 1.4, cardY + cardH - 0.3, 1.22, 0.22, { fontSize: 9.5, bold: true, color: C.navy, align: 'right', valign: 'middle' });
  });

  // 共通の流れ（詳細スライドの箱の色の凡例を兼ねる）
  const flowY = cardY + cardH + 0.15;
  addText(slide, '共通の流れ', MARGIN_X, flowY, 1.0, 0.34, { fontSize: 10.5, bold: true, valign: 'middle' });
  const legendSteps = [
    ['measure', '計測'],
    ['estimate', '推定（③⑤⑧）'],
    ['calc', '補正量の計算'],
    ['scanner', '露光機での補正・露光'],
  ];
  const legendW = (text) => 0.14 * text.length + 0.25;
  let lx = MARGIN_X + 1.05;
  legendSteps.forEach(([type, text], k) => {
    const w = legendW(text);
    panelBox(slide, type, text, lx, flowY, w, 0.34, 10);
    lx += w;
    if (k < legendSteps.length - 1) {
      addLine(slide, lx + 0.04, flowY + 0.17, lx + 0.26, flowY + 0.17, { width: 1.25 });
      lx += 0.3;
    }
  });
  lx += 0.3;
  const physicalText = '成膜による物理補正（⑦）';
  panelBox(slide, 'physical', physicalText, lx, flowY, legendW(physicalText), 0.34, 10);
  lx += legendW(physicalText) + 0.4;
  [[C.teal, '計測するShot'], [C.estTint, '推定するShot']].forEach(([color, label]) => {
    addRect(slide, lx, flowY + 0.1, 0.13, 0.15, color, C.cellLine);
    addText(slide, label, lx + 0.19, flowY, 1.0, 0.34, { fontSize: 9.5, color: C.muted, valign: 'middle' });
    lx += 0.19 + 1.05;
  });
  if (lx > RIGHT_EDGE + 0.05) throw new Error(`凡例が右端を超えています: ${lx.toFixed(2)}`);

  addFooter(slide, 1, PAGES.summary.footer);

  slide.addNotes(notesFor('summary'));
}

// ================= p.2 A 露光機単独 =================
function buildScannerOnly() {
  const g = GROUPS.A;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.A.title, PAGES.A.lead);
  drawPanelFrame(slide, '共通の前提');

  // 概念図：計測点数と補正の細かさ
  const px = MARGIN_X + PANEL_PAD;
  const chartTop = BODY_TOP + 0.55;
  const ox = px + 0.42;
  const oy = chartTop + 1.95;
  const axisW = PANEL_W - PANEL_PAD * 2 - 0.55;
  const axisH = 1.8;
  addText(slide, '計測点数と補正の細かさ（概念図）', px, chartTop - 0.08, PANEL_W - PANEL_PAD * 2, 0.24, { fontSize: 9.5, color: C.muted, valign: 'middle' });
  addLine(slide, ox, oy, ox + axisW, oy, { color: C.grayText, width: 1 });
  addLine(slide, ox, oy, ox, oy - axisH, { color: C.grayText, width: 1 });
  addText(slide, '計測点数（＝計測時間）', ox, oy + 0.04, axisW, 0.22, { fontSize: 9.5, color: C.grayText, align: 'center', valign: 'middle' });
  addText(slide, '補正の細かさ', px - 0.04, oy - axisH, 0.3, axisH, { fontSize: 9.5, color: C.grayText, vert: 'vert270', align: 'center', valign: 'middle' });
  const pointD = 0.34;
  const pts = [
    { index: 0, x: ox + axisW * 0.16, y: oy - axisH * 0.2, fill: C.band },
    { index: 1, x: ox + axisW * 0.84, y: oy - axisH * 0.74, fill: C.band },
    { index: 2, x: ox + axisW * 0.46, y: oy - axisH * 0.8, fill: C.gold },
  ];
  addLine(slide, pts[0].x + 0.17, pts[0].y - 0.1, pts[1].x - 0.17, pts[1].y + 0.12, { color: C.line, width: 1, dash: 'dash' });
  addLine(slide, pts[1].x - 0.19, pts[1].y - 0.05, pts[2].x + 0.2, pts[2].y + 0.0, { color: C.gold, width: 1.5 });
  pts.forEach((p) => addNumberCircle(slide, p.index, p.x - pointD / 2, p.y - pointD / 2, pointD, p.fill));
  addText(slide, '推定で点数を減らす', pts[2].x - 0.55, pts[2].y + 0.2, 1.5, 0.22, { fontSize: 9, bold: true, color: C.gold, valign: 'middle' });
  addText(slide, 'スループットが下がる', pts[1].x - 1.15, pts[1].y + 0.62, 1.4, 0.22, { fontSize: 9, color: C.muted, align: 'right', valign: 'middle' });

  drawFacts(slide, PAGES.A.facts, oy + 0.42);

  drawLanes(slide, g, LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 2, PAGES.A.footer);

  slide.addNotes(notesFor('A'));
}

// ================= p.3 B Litho Booster =================
function buildLithoBooster() {
  const g = GROUPS.B;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.B.title, PAGES.B.lead);
  drawPanelFrame(slide, '共通の前提');

  // 処理の流れ（縦）とFFのデータの流れ
  const boxW = 2.1;
  const bx = MARGIN_X + PANEL_PAD + 0.12;
  let by = BODY_TOP + 0.55;
  const arrowH = 0.2;
  const boxes = [
    ['process', '前工程（成膜・エッチなど）', 0.36],
    ['measure', 'Litho Booster：高密度に計測', 0.4],
    ['measure', '露光機：通常アライメント', 0.4],
    ['scanner', '合成して露光', 0.36],
  ];
  const boxPos = [];
  boxes.forEach(([type, text, h], k) => {
    panelBox(slide, type, text, bx, by, boxW, h, 10);
    boxPos.push({ y: by, h });
    by += h;
    if (k < boxes.length - 1) {
      addLine(slide, bx + boxW / 2, by + 0.02, bx + boxW / 2, by + arrowH - 0.02, { width: 1.25 });
      by += arrowH;
    }
  });
  addText(slide, 'Waferを搬送', bx + boxW / 2 + 0.08, boxPos[1].y + boxPos[1].h, 1.0, arrowH, { fontSize: 8.5, color: C.muted, valign: 'middle' });
  // 補正量のデータ（FF）：Litho Booster の右から露光機の右へ点線でつなぐ
  const sideX = bx + boxW + 0.22;
  const fromY = boxPos[1].y + boxPos[1].h / 2;
  const toY = boxPos[2].y + boxPos[2].h / 2;
  addLine(slide, bx + boxW, fromY, sideX, fromY, { color: C.navy, width: 1.25, dash: 'dash', arrow: false });
  addLine(slide, sideX, fromY, sideX, toY, { color: C.navy, width: 1.25, dash: 'dash', arrow: false });
  addLine(slide, sideX, toY, bx + boxW + 0.02, toY, { color: C.navy, width: 1.25, dash: 'dash' });
  addText(slide, [
    { text: '補正量', options: { breakLine: true } },
    { text: '（FF）' },
  ], sideX + 0.05, fromY, MARGIN_X + PANEL_W - sideX - 0.08, toY - fromY, { fontSize: 8.5, bold: true, color: C.navy, valign: 'middle' });

  // 補正量の合成
  const formulaY = by + 0.16;
  addRect(slide, MARGIN_X + PANEL_PAD, formulaY, PANEL_W - PANEL_PAD * 2, 0.64, C.white, C.navy);
  addText(slide, [
    { text: PAGES.B.formula[0], options: { bold: true, breakLine: true } },
    { text: PAGES.B.formula[1], options: { breakLine: true } },
    { text: PAGES.B.formula[2], options: {} },
  ], MARGIN_X + PANEL_PAD + 0.1, formulaY + 0.03, PANEL_W - PANEL_PAD * 2 - 0.2, 0.58, { fontSize: 10, color: C.navy, valign: 'middle' });

  drawFacts(slide, PAGES.B.facts, formulaY + 0.78);

  // ④と⑤の使い分け（帯の下に置く）
  const choiceH = 0.72;
  drawLanes(slide, g, LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP - choiceH - 0.14);
  const choiceY = BODY_BOTTOM - choiceH;
  addRect(slide, LANES_X, choiceY, LANES_W, choiceH, C.white, C.navy);
  addText(slide, [
    { text: PAGES.B.choice.heading, options: { bold: true, color: C.navy, breakLine: true } },
    { text: PAGES.B.choice.lines[0], options: { breakLine: true } },
    { text: PAGES.B.choice.lines[1] },
  ], LANES_X + LANE_PAD, choiceY + 0.04, LANES_W - LANE_PAD * 2, choiceH - 0.08, { fontSize: 10.5, valign: 'middle', paraSpaceAfter: 1 });
  addFooter(slide, 3, PAGES.B.footer);

  slide.addNotes(notesFor('B'));
}

// ================= p.4 C Wafer歪み計測 =================
function buildWaferDistortion() {
  const g = GROUPS.C;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  addTitle(slide, PAGES.C.title, PAGES.C.lead);
  drawPanelFrame(slide, '共通の前提');

  // PWGの計測：反ったWaferを表と裏から測る
  const px = MARGIN_X + PANEL_PAD;
  const pw = PANEL_W - PANEL_PAD * 2;
  const waferY = BODY_TOP + 1.25;
  const waferW = 1.9;
  const waferX = px + (pw - waferW) / 2;
  const bow = 0.16;
  const points = [];
  for (let k = 0; k <= 16; k += 1) {
    const t = k / 16;
    points.push({ x: t * waferW, y: bow * (2 * t - 1) ** 2 });
  }
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: waferX, y: waferY - bow, w: waferW, h: bow + 0.01, points, line: { color: C.grayText, width: 4 },
  });
  // 表面と裏面の高さを測る矢印（Waferの曲がりに合わせて矢印の先を変える）
  [-0.6, 0, 0.6].forEach((dx) => {
    const cx = waferX + waferW / 2 + dx;
    const t = (cx - waferX) / waferW;
    const surfaceY = waferY - bow + bow * (2 * t - 1) ** 2;
    addLine(slide, cx, waferY - bow - 0.36, cx, surfaceY - 0.05, { color: C.teal, width: 1 });
    addLine(slide, cx, waferY + 0.36, cx, surfaceY + 0.06, { color: C.teal, width: 1 });
  });
  addText(slide, '表面の高さ', px, waferY - bow - 0.62, pw, 0.22, { fontSize: 9, color: C.teal, bold: true, align: 'center', valign: 'middle' });
  addText(slide, '裏面の高さ（表裏を全面で計測）', px, waferY + 0.38, pw, 0.22, { fontSize: 9, color: C.teal, bold: true, align: 'center', valign: 'middle' });

  let by = waferY + 0.66;
  addLine(slide, px + pw / 2, by, px + pw / 2, by + 0.2, { width: 1.25 });
  by += 0.22;
  panelBox(slide, 'calc', '形状の変化 → 面内歪み（IPD）', px + 0.15, by, pw - 0.3, 0.38, 10);
  by += 0.38;
  // 3つの使い方に分かれる
  const useY = by + 0.28;
  const useW = (pw - 0.2) / 3;
  [['scanner', '⑥露光機', '高次補正'], ['physical', '⑦裏面膜', '反りを低減'], ['estimate', '⑧NZO', 'Waferごと']].forEach(([type, title, sub], k) => {
    const ux = px + k * (useW + 0.1);
    const style = STEP[type];
    addLine(slide, px + pw / 2, by + 0.02, ux + useW / 2, useY - 0.02, { width: 1 });
    addRoundRect(slide, ux, useY, useW, 0.46, style.fill, style.border);
    addText(slide, [
      { text: title, options: { fontSize: 9.5, bold: true, color: style.text, breakLine: true } },
      { text: sub, options: { fontSize: 8, color: style.detail } },
    ], ux + 0.03, useY, useW - 0.06, 0.46, { align: 'center', valign: 'middle' });
  });

  drawFacts(slide, PAGES.C.facts, useY + 0.62);

  drawLanes(slide, g, LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 4, PAGES.C.footer);

  slide.addNotes(notesFor('C'));
}

buildSummary();
buildScannerOnly();
buildLithoBooster();
buildWaferDistortion();

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}`));
