// 重ね合わせFF補正の8方式：グラレコ風（サマリー1枚＋詳細3枚）
//   手描き風の線（少し揺らした枠・矢印）、マーカーの色、蛍光ペン、手描きアイコンで描く。
//   中身（方式・文言・出典・ノート）は content.js、Waferのショット配置は draw_common.js を使う。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck_grareco.js <出力パス>

const path = require('path');
const pptxgen = require('pptxgenjs');
const { DECK_DATE, DECK_NAME, GROUPS, METHODS, PAGES, circled, notesFor } = require('./content');
const { shotCells, cellState } = require('./draw_common');

const OUTPUT_PATH = process.argv[2] || path.join(__dirname, 'deck_raw_grareco.pptx');

// ---- 定数 ----
// Office に同梱の丸ゴシック（Mac・Windows とも Office があれば使える）
const FONT = 'HG丸ｺﾞｼｯｸM-PRO';
const SLIDE_W = 13.333;
const MARGIN_X = 0.45;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;
const CONTENT_W = RIGHT_EDGE - MARGIN_X;
const TITLE_Y = 0.26;
const TITLE_H = 0.56;
const TITLE_FONT_SIZE = 26;
const LEAD_Y = 0.86;
const LEAD_H = 0.4;
const LEAD_FONT_SIZE = 12.5;
const BODY_TOP = 1.42;
const BODY_BOTTOM = 6.86;
const FOOTER_Y = 7.0;
const FOOTER_H = 0.28;
const FOOTER_FONT_SIZE = 9;
const RANDOM_SEED = 20261003;
const TOTAL_PAGES = 4;

const C = {
  ink: '33302E',
  sub: '6B6660',
  faint: 'B9B4AE',
  paper: 'FFFFFF',
  blue: '2F6DB5',
  green: '2E9466',
  orange: 'D9731C',
  red: 'C9443D',
  purple: '7E57B0',
  yellow: 'FFE36E',
  blueT: 'E4EEFA',
  greenT: 'E2F3E9',
  orangeT: 'FDEAD6',
  redT: 'FBE2E0',
  purpleT: 'EEE6F7',
  grayT: 'F0EFED',
  yellowT: 'FFF5C2',
};
const GROUP_COLOR = {
  A: { main: C.blue, tint: C.blueT },
  B: { main: C.green, tint: C.greenT },
  C: { main: C.orange, tint: C.orangeT },
};
// フローの箱の種類：塗りの色・線の色・手描きアイコン
const STEP = {
  process: { label: '工程・搬送', tint: C.grayT, color: '8E8984', icon: 'gear' },
  measure: { label: '計測', tint: C.blueT, color: C.blue, icon: 'loupe' },
  estimate: { label: '推定', tint: C.purpleT, color: C.purple, icon: 'spark' },
  calc: { label: '補正量の計算', tint: C.greenT, color: C.green, icon: 'equal' },
  scanner: { label: '露光機での補正・露光', tint: C.orangeT, color: C.orange, icon: 'sun' },
  physical: { label: '成膜による物理補正', tint: C.redT, color: C.red, icon: 'layers' },
};

// グラレコ風の短い言い回し（見出しは content.js と同じ）
const GR_LEAD = {
  summary: '露光の前にWaferを測って、その層の露光に反映する！（⑦は成膜で反りそのものを減らす）　計測の場所で3つに分かれる',
  A: '露光機のセンサーだけで、測って・計算して・補正する。点を増やすほど細かくなるけど、露光機の時間を使う',
  B: '露光機の外の専用機（Nikon Litho Booster）で先に細かく測り、補正量を露光機へ送る。露光機は止めない',
  C: 'KLA PWGでWafer表裏の形を測る。使い道は3つ：露光機で補正（⑥）、裏面の膜（⑦）、NZOの予測（⑧）',
};

// ---- 再現できる乱数（手描きの揺れに使う） ----
function mulberry32(seed) {
  let state = seed;
  return function random() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(RANDOM_SEED);
const jitter = (amount) => (random() * 2 - 1) * amount;

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせFF補正の8方式（グラレコ風）';
pres.lang = 'ja-JP';

// ---- 文字 ----
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

// 文字の幅の目安（全角は1文字＝文字サイズ、半角はその約0.55倍）。蛍光ペンの長さに使う
function textWidth(text, fontSize) {
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) < 0x2000 ? 0.55 : 1;
  return (units * fontSize) / 72;
}

// ---- 手描き風の部品 ----
// 点の列を自由図形で描く（close で塗りつぶし、stroke で線）
function addPath(slide, pts, { fill = null, stroke = null, width = 1.5, dash = null, close = false, transparency = 0 } = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - x0, 0.01);
  const h = Math.max(Math.max(...ys) - y0, 0.01);
  const points = pts.map(([x, y]) => ({ x: x - x0, y: y - y0 }));
  if (close) points.push({ close: true });
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: x0, y: y0, w, h, points,
    ...(fill ? { fill: { color: fill, transparency } } : {}),
    line: stroke ? { color: stroke, width, ...(dash ? { dashType: dash } : {}) } : { color: fill || C.paper, width: 0.25, transparency: 100 },
  });
}

function roughRectPoints(x, y, w, h, amount, segments = 4) {
  const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([cx, cy]) => [cx + jitter(amount), cy + jitter(amount)]);
  const pts = [];
  for (let k = 0; k < 4; k += 1) {
    const [ax, ay] = corners[k];
    const [bx, by] = corners[(k + 1) % 4];
    for (let s = 0; s < segments; s += 1) {
      const t = s / segments;
      const wobble = s ? amount * 0.4 : 0;
      pts.push([ax + (bx - ax) * t + jitter(wobble), ay + (by - ay) * t + jitter(wobble)]);
    }
  }
  return pts;
}

// 手描きの四角（塗りは少しずらし、線は書き始めを少し越えて終える）
function roughRect(slide, x, y, w, h, { fill = null, stroke = C.ink, width = 1.5, dash = null, amount = 0.03 } = {}) {
  if (fill) addPath(slide, roughRectPoints(x, y, w, h, amount * 0.5), { fill, close: true });
  if (stroke) {
    const pts = roughRectPoints(x, y, w, h, amount);
    const [sx, sy] = pts[0];
    const [nx, ny] = pts[1];
    pts.push([sx, sy], [sx + (nx - sx) * 0.3, sy + (ny - sy) * 0.3]);
    addPath(slide, pts, { stroke, width, dash });
  }
}

function roughEllipsePoints(cx, cy, rx, ry, amount, overshoot) {
  const n = 26;
  const start = random() * Math.PI * 2;
  const pts = [];
  for (let k = 0; k <= n + overshoot; k += 1) {
    const a = start + (k / n) * Math.PI * 2;
    const r = 1 + jitter(amount);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}

function roughCircle(slide, cx, cy, r, { fill = null, stroke = C.ink, width = 1.5, ry = null } = {}) {
  const rY = ry || r;
  if (fill) addPath(slide, roughEllipsePoints(cx, cy, r, rY, 0.015, 0), { fill, close: true });
  if (stroke) addPath(slide, roughEllipsePoints(cx, cy, r, rY, 0.03, 3), { stroke, width });
}

// 手描きの矢印（少し曲げた線＋V字の矢じり）
function roughArrow(slide, x1, y1, x2, y2, { color = C.ink, width = 1.75, bend = 0.06, head = 0.1, dash = null } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (x1 + x2) / 2 + (-dy / len) * bend;
  const cy = (y1 + y2) / 2 + (dx / len) * bend;
  const pts = [];
  for (let k = 0; k <= 10; k += 1) {
    const t = k / 10;
    const wobble = k > 0 && k < 10 ? 0.005 : 0;
    pts.push([
      (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2 + jitter(wobble),
      (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2 + jitter(wobble),
    ]);
  }
  addPath(slide, pts, { stroke: color, width, dash });
  const tl = Math.hypot(x2 - cx, y2 - cy) || 1;
  const ux = (x2 - cx) / tl;
  const uy = (y2 - cy) / tl;
  const wing = (sign) => {
    const a = 0.5 * sign;
    return [x2 - head * (ux * Math.cos(a) - uy * Math.sin(a)), y2 - head * (uy * Math.cos(a) + ux * Math.sin(a))];
  };
  addPath(slide, [wing(1), [x2, y2], wing(-1)], { stroke: color, width });
}

function roughLine(slide, x1, y1, x2, y2, { color = C.ink, width = 1.5, dash = null } = {}) {
  const pts = [];
  for (let k = 0; k <= 6; k += 1) {
    const t = k / 6;
    const wobble = k > 0 && k < 6 ? 0.006 : 0;
    pts.push([x1 + (x2 - x1) * t + jitter(wobble), y1 + (y2 - y1) * t + jitter(wobble)]);
  }
  addPath(slide, pts, { stroke: color, width, dash });
}

// 蛍光ペン（文字の下半分に引く）
function highlight(slide, x, y, w, h, color = C.yellow) {
  addPath(slide, [
    [x + jitter(0.02), y + h * 0.2 + jitter(0.02)],
    [x + w + jitter(0.03), y + jitter(0.02)],
    [x + w + jitter(0.02), y + h + jitter(0.02)],
    [x + jitter(0.02), y + h * 0.95 + jitter(0.02)],
  ], { fill: color, close: true, transparency: 20 });
}

// ---- 手描きアイコン（中心 cx, cy、大きさ s） ----
function doodle(slide, kind, cx, cy, s, color) {
  const w = 1.25;
  if (kind === 'loupe') {
    roughCircle(slide, cx - s * 0.12, cy - s * 0.12, s * 0.28, { stroke: color, width: w });
    roughLine(slide, cx + s * 0.08, cy + s * 0.08, cx + s * 0.4, cy + s * 0.4, { color, width: w + 0.5 });
  } else if (kind === 'spark') {
    roughLine(slide, cx, cy - s * 0.45, cx, cy + s * 0.45, { color, width: w });
    roughLine(slide, cx - s * 0.45, cy, cx + s * 0.45, cy, { color, width: w });
    roughLine(slide, cx - s * 0.25, cy - s * 0.25, cx + s * 0.25, cy + s * 0.25, { color, width: w });
    roughLine(slide, cx - s * 0.25, cy + s * 0.25, cx + s * 0.25, cy - s * 0.25, { color, width: w });
  } else if (kind === 'equal') {
    roughLine(slide, cx - s * 0.35, cy - s * 0.13, cx + s * 0.35, cy - s * 0.13, { color, width: w + 0.5 });
    roughLine(slide, cx - s * 0.35, cy + s * 0.13, cx + s * 0.35, cy + s * 0.13, { color, width: w + 0.5 });
  } else if (kind === 'sun') {
    roughCircle(slide, cx, cy, s * 0.18, { stroke: color, width: w });
    for (let k = 0; k < 8; k += 1) {
      const a = (k / 8) * Math.PI * 2;
      roughLine(slide, cx + Math.cos(a) * s * 0.28, cy + Math.sin(a) * s * 0.28, cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45, { color, width: w });
    }
  } else if (kind === 'gear') {
    roughCircle(slide, cx, cy, s * 0.22, { stroke: color, width: w });
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2;
      roughLine(slide, cx + Math.cos(a) * s * 0.24, cy + Math.sin(a) * s * 0.24, cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42, { color, width: w + 0.5 });
    }
  } else if (kind === 'layers') {
    [-0.25, 0, 0.25].forEach((dy) => roughLine(slide, cx - s * 0.4, cy + s * dy + s * 0.08, cx + s * 0.4, cy + s * dy - s * 0.08, { color, width: w + 0.25 }));
  } else if (kind === 'good') {
    roughCircle(slide, cx, cy, s * 0.36, { stroke: color, width: w + 0.5 });
  } else if (kind === 'warn') {
    addPath(slide, [[cx, cy - s * 0.4], [cx + s * 0.42, cy + s * 0.34], [cx - s * 0.42, cy + s * 0.34], [cx + jitter(0.01), cy - s * 0.4]], { stroke: color, width: w + 0.5 });
  } else if (kind === 'star') {
    const pts = [];
    for (let k = 0; k <= 10; k += 1) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
      const r = k % 2 === 0 ? s * 0.45 : s * 0.2;
      pts.push([cx + Math.cos(a) * r + jitter(0.006), cy + Math.sin(a) * r + jitter(0.006)]);
    }
    addPath(slide, pts, { stroke: color, width: w, fill: C.yellow, close: true });
  }
}

// 手描きのWafer（計測した所は●、推定する所は○）
function roughWafer(slide, kind, cx, cy, d, color) {
  const r = d / 2;
  if (kind === 'cvd') {
    const pts = [];
    for (let k = 0; k <= 12; k += 1) {
      const t = k / 12;
      pts.push([cx - r + t * d, cy - r * 0.55 + r * 0.32 * (1 - (2 * t - 1) ** 2) + jitter(0.004)]);
    }
    addPath(slide, pts, { stroke: C.ink, width: 2 });
    roughArrow(slide, cx, cy - r * 0.12, cx, cy + r * 0.2, { width: 1, head: 0.06, bend: 0 });
    roughLine(slide, cx - r, cy + r * 0.38, cx + r, cy + r * 0.38, { color: C.ink, width: 2 });
    roughRect(slide, cx - r, cy + r * 0.46, d, r * 0.18, { fill: C.red, stroke: null, amount: 0.006 });
    return;
  }
  roughCircle(slide, cx, cy, r, { fill: C.paper, stroke: C.ink, width: 1.25 });
  if (kind === 'shape' || kind === 'nzo') {
    roughCircle(slide, cx + r * 0.05, cy - r * 0.05, r * 0.66, { stroke: color, width: 1 });
    roughCircle(slide, cx + r * 0.1, cy - r * 0.1, r * 0.34, { stroke: color, width: 1, fill: C.yellowT });
    if (kind === 'nzo') {
      roughRect(slide, cx - r * 0.55, cy + r * 0.45, r * 1.1, r * 0.48, { fill: C.purple, stroke: null, amount: 0.006 });
      addText(slide, 'NZO', cx - r * 0.55, cy + r * 0.45, r * 1.1, r * 0.48, { fontSize: 7, bold: true, color: C.paper, align: 'center', valign: 'middle' });
    }
    return;
  }
  const { cells, few, shotW, shotH } = shotCells(d * 0.92);
  const dot = Math.min(shotW, shotH) * 0.62;
  cells.forEach((cell, k) => {
    const state = cellState(kind, cell, k, few);
    if (state === 'blank') return;
    const x = cx + cell.x0 + shotW / 2 - dot / 2;
    const y = cy + cell.y0 + shotH / 2 - dot / 2;
    slide.addShape(pres.shapes.OVAL, {
      x, y, w: dot, h: dot,
      fill: { color: state === 'measured' ? color : C.paper },
      line: { color: state === 'measured' ? color : C.purple, width: 0.75 },
    });
  });
}

function numberBadge(slide, index, cx, cy, r, color, tint) {
  roughCircle(slide, cx, cy, r, { fill: tint, stroke: color, width: 1.75 });
  addText(slide, String(index + 1), cx - r, cy - r, r * 2, r * 2, { fontSize: r > 0.2 ? 15 : 12, bold: true, color, align: 'center', valign: 'middle' });
}

function tagBadge(slide, tag, x, y, w, h, color) {
  roughRect(slide, x, y, w, h, { fill: C.paper, stroke: color, width: 1.25, amount: 0.012 });
  addText(slide, tag, x, y, w, h, { fontSize: 9.5, bold: true, color, align: 'center', valign: 'middle' });
}

// ---- 見出しと脚注 ----
function addTitle(slide, title, lead, groupKey = null) {
  let textX = MARGIN_X;
  if (groupKey) {
    const g = GROUP_COLOR[groupKey];
    roughCircle(slide, MARGIN_X + 0.3, TITLE_Y + TITLE_H / 2, 0.28, { fill: g.tint, stroke: g.main, width: 2 });
    addText(slide, groupKey, MARGIN_X + 0.02, TITLE_Y, 0.56, TITLE_H, { fontSize: 22, bold: true, color: g.main, align: 'center', valign: 'middle' });
    textX = MARGIN_X + 0.72;
  }
  const shown = groupKey ? title.replace(/^[ABC] /, '') : title;
  highlight(slide, textX - 0.04, TITLE_Y + TITLE_H * 0.5, Math.min(textWidth(shown, TITLE_FONT_SIZE) + 0.08, RIGHT_EDGE - textX - 1.6), TITLE_H * 0.42);
  addText(slide, shown, textX, TITLE_Y, RIGHT_EDGE - textX - 1.6, TITLE_H, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, DECK_DATE, RIGHT_EDGE - 1.6, TITLE_Y, 1.6, TITLE_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, align: 'right', valign: 'middle' });
  addText(slide, lead, MARGIN_X, LEAD_Y, CONTENT_W, LEAD_H, { fontSize: LEAD_FONT_SIZE, color: C.sub, valign: 'middle' });
}

function addFooter(slide, page, note) {
  addText(slide, note, MARGIN_X, FOOTER_Y, CONTENT_W - 2.6, FOOTER_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, valign: 'middle' });
  addText(slide, `${DECK_NAME}　${page} / ${TOTAL_PAGES}`, RIGHT_EDGE - 2.4, FOOTER_Y, 2.4, FOOTER_H, { fontSize: FOOTER_FONT_SIZE, color: C.sub, align: 'right', valign: 'middle' });
}

// ---- フローの箱（手描きの四角＋アイコン＋見出し＋説明） ----
const CHIP_GAP = 0.22;

function drawFlow(slide, steps, x, y, w, h) {
  const n = steps.length;
  const chipW = (w - (n - 1) * CHIP_GAP) / n;
  steps.forEach(([type, title, detail, opts = {}], k) => {
    const style = STEP[type];
    const chipX = x + k * (chipW + CHIP_GAP);
    roughRect(slide, chipX, y, chipW, h, {
      fill: opts.dashed ? C.paper : style.tint, stroke: style.color, width: 1.5, dash: opts.dashed ? 'dash' : null, amount: 0.02,
    });
    // アイコンは箱の右上の縁にシールのように貼る
    const badgeX = chipX + chipW - 0.14;
    roughCircle(slide, badgeX, y + 0.01, 0.12, { fill: C.paper, stroke: style.color, width: 1.25 });
    doodle(slide, style.icon, badgeX, y + 0.01, 0.17, style.color);
    addText(slide, [
      { text: title, options: { fontSize: 10.5, bold: true, color: C.ink, breakLine: true } },
      { text: detail, options: { fontSize: 9, color: C.sub } },
    ], chipX + 0.08, y + 0.1, chipW - 0.16, h - 0.14, { align: 'center', valign: 'middle', paraSpaceAfter: 2 });
    if (k < n - 1) roughArrow(slide, chipX + chipW + 0.03, y + h / 2, chipX + chipW + CHIP_GAP - 0.03, y + h / 2, { width: 1.5, head: 0.07, bend: 0.02 });
  });
}

// ---- 詳細スライドの「方式の帯」 ----
const LANE_PAD = 0.14;
const TALL_LANE_H = 2.2;

function drawLane(slide, groupKey, methodIndex, x, y, w, h) {
  const m = METHODS[methodIndex];
  const g = GROUP_COLOR[groupKey];
  roughRect(slide, x, y, w, h, { stroke: C.faint, width: 1, amount: 0.02 });
  const innerX = x + LANE_PAD;
  const innerW = w - LANE_PAD * 2;
  const tall = h >= TALL_LANE_H;

  // 見出し：番号・方式名・ひとこと・補正の細かさ
  const headY = y + 0.08;
  numberBadge(slide, methodIndex, innerX + 0.18, headY + 0.18, 0.18, g.main, g.tint);
  const nameW = textWidth(m.name, 15) + 0.1;
  addText(slide, m.name, innerX + 0.46, headY, nameW + 0.1, 0.36, { fontSize: 15, bold: true, valign: 'middle' });
  const catchX = innerX + 0.46 + nameW + 0.2;
  highlight(slide, catchX - 0.03, headY + 0.17, textWidth(m.catch, 12) + 0.06, 0.16);
  addText(slide, m.catch, catchX, headY, innerW - (catchX - innerX) - 1.1, 0.36, { fontSize: 12, bold: true, color: g.main, valign: 'middle' });
  tagBadge(slide, m.tag, x + w - LANE_PAD - 0.95, headY + 0.05, 0.95, 0.26, g.main);

  // プロセスフロー
  const textH = tall ? 0.62 : 0.46;
  const flowY = headY + 0.44;
  const flowH = h - (flowY - y) - textH - (tall ? 0.16 : 0.12);
  drawFlow(slide, m.flow, innerX, flowY, innerW, flowH);

  // 補正・利点・注意（利点は○、注意は△の手描き印）
  const textY = y + h - textH - 0.06;
  const colGap = 0.22;
  const colW = (innerW - colGap * 2) / 3;
  const fontSize = 10;
  addText(slide, [
    { text: '補正｜', options: { bold: true, color: g.main } },
    { text: m.correction },
  ], innerX, textY, colW, textH, { fontSize });
  [['good', m.merit, C.green], ['warn', m.caution, C.orange]].forEach(([icon, text, color], k) => {
    const colX = innerX + (k + 1) * (colW + colGap);
    doodle(slide, icon, colX + 0.1, textY + 0.1, 0.22, color);
    addText(slide, text, colX + 0.26, textY, colW - 0.26, textH, { fontSize });
  });
}

function drawLanes(slide, groupKey, x, y, w, h) {
  const gap = 0.14;
  const methods = GROUPS[groupKey].methods;
  const laneH = (h - gap * (methods.length - 1)) / methods.length;
  methods.forEach((methodIndex, k) => drawLane(slide, groupKey, methodIndex, x, y + k * (laneH + gap), w, laneH));
}

// ---- 詳細スライドの左パネル ----
const PANEL_W = 3.3;
const PANEL_PAD = 0.18;
const LANES_X = MARGIN_X + PANEL_W + 0.22;
const LANES_W = RIGHT_EDGE - LANES_X;

function drawPanelFrame(slide, groupKey) {
  const g = GROUP_COLOR[groupKey];
  roughRect(slide, MARGIN_X, BODY_TOP, PANEL_W, BODY_BOTTOM - BODY_TOP, { fill: g.tint, stroke: g.main, width: 1.75, amount: 0.02 });
  doodle(slide, 'star', MARGIN_X + PANEL_PAD + 0.13, BODY_TOP + 0.27, 0.3, C.orange);
  addText(slide, 'ここがポイント', MARGIN_X + PANEL_PAD + 0.36, BODY_TOP + 0.1, PANEL_W - PANEL_PAD * 2 - 0.36, 0.34, { fontSize: 14, bold: true, color: g.main, valign: 'middle' });
}

// 左パネルの事実（装置・測るもの・強み・課題）を手描きアイコン付きで並べる
function drawFacts(slide, groupKey, facts, y) {
  const icons = { 計測装置: ['gear', '8E8984'], 計測するもの: ['loupe', C.blue], 強み: ['good', C.green], 課題: ['warn', C.orange] };
  const x = MARGIN_X + PANEL_PAD;
  const w = PANEL_W - PANEL_PAD * 2;
  const rowH = (BODY_BOTTOM - 0.12 - y) / facts.length;
  facts.forEach(([label, text], k) => {
    const rowY = y + k * rowH;
    const [icon, color] = icons[label];
    doodle(slide, icon, x + 0.12, rowY + 0.13, 0.24, color);
    addText(slide, [
      { text: `${label}：`, options: { bold: true, color: GROUP_COLOR[groupKey].main } },
      { text },
    ], x + 0.32, rowY, w - 0.32, rowH, { fontSize: 10 });
  });
}

// 左パネル用の手描きの箱
function panelBox(slide, type, text, x, y, w, h, fontSize = 10) {
  const style = STEP[type];
  roughRect(slide, x, y, w, h, { fill: style.tint, stroke: style.color, width: 1.5, amount: 0.012 });
  addText(slide, text, x + 0.05, y, w - 0.1, h, { fontSize, bold: true, align: 'center', valign: 'middle' });
}

// 付箋（黄色い紙）
function stickyNote(slide, lines, x, y, w, h, fontSize = 10.5) {
  roughRect(slide, x, y, w, h, { fill: C.yellowT, stroke: 'D8C46A', width: 1, amount: 0.012 });
  addText(slide, lines.map((t, k) => ({ text: t, options: { breakLine: k < lines.length - 1, bold: k === 0 } })), x + 0.12, y + 0.04, w - 0.24, h - 0.08, { fontSize, valign: 'middle', paraSpaceAfter: 2 });
}

// ================= p.1 サマリー =================
function buildSummary() {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  addTitle(slide, PAGES.summary.title, GR_LEAD.summary);

  const frameGap = 0.25;
  const frameW = (CONTENT_W - frameGap * 2) / 3;
  const frameY = BODY_TOP;
  const frameH = 4.82;
  const itemTop = frameY + 1.34;
  const itemH = 0.8;
  const waferD = 0.6;

  ['A', 'B', 'C'].forEach((key, gi) => {
    const group = GROUPS[key];
    const g = GROUP_COLOR[key];
    const x = MARGIN_X + gi * (frameW + frameGap);
    roughRect(slide, x, frameY, frameW, frameH, { stroke: g.main, width: 2.25, amount: 0.025 });

    // 見出し：グループの文字・名前・ひとこと
    roughCircle(slide, x + 0.48, frameY + 0.42, 0.3, { fill: g.tint, stroke: g.main, width: 2 });
    addText(slide, group.letter, x + 0.18, frameY + 0.12, 0.6, 0.6, { fontSize: 24, bold: true, color: g.main, align: 'center', valign: 'middle' });
    addText(slide, group.name, x + 0.9, frameY + 0.12, frameW - 1.05, 0.38, { fontSize: 19, bold: true, valign: 'middle' });
    highlight(slide, x + 0.88, frameY + 0.6, Math.min(textWidth(group.catch, 12) + 0.06, frameW - 1.05), 0.16);
    addText(slide, group.catch, x + 0.9, frameY + 0.48, frameW - 1.05, 0.3, { fontSize: 12, bold: true, color: g.main, valign: 'middle' });
    addText(slide, group.sub, x + 0.2, frameY + 0.86, frameW - 0.4, 0.4, { fontSize: 10, color: C.sub, valign: 'middle' });

    group.methods.forEach((methodIndex, k) => {
      const m = METHODS[methodIndex];
      const y = itemTop + k * itemH;
      roughWafer(slide, m.icon, x + 0.22 + waferD / 2, y + waferD / 2 + 0.02, waferD, g.main);
      const textX = x + 0.22 + waferD + 0.18;
      const textW = x + frameW - 0.2 - textX;
      addText(slide, `${circled(methodIndex)} ${m.name}`, textX, y, textW - 0.9, 0.3, { fontSize: 13.5, bold: true, valign: 'middle' });
      tagBadge(slide, m.tag, x + frameW - 0.2 - 0.86, y + 0.03, 0.86, 0.24, g.main);
      addText(slide, m.catch, textX, y + 0.32, textW, 0.3, { fontSize: 11.5, bold: true, color: g.main, valign: 'middle' });
    });
    if (group.note) {
      stickyNote(slide, group.note, x + 0.22, itemTop + group.methods.length * itemH + 0.04, frameW - 0.44, 0.66, 10);
    }

    // 強み○・課題△
    const evalY = frameY + frameH - 0.98;
    roughLine(slide, x + 0.2, evalY - 0.1, x + frameW - 0.2, evalY - 0.1, { color: C.faint, width: 1, dash: 'dash' });
    [['good', group.strength, C.green], ['warn', group.issue, C.orange]].forEach(([icon, text, color], k) => {
      const rowY = evalY + k * 0.34;
      doodle(slide, icon, x + 0.32, rowY + 0.14, 0.24, color);
      addText(slide, text, x + 0.52, rowY, frameW - 0.72, 0.3, { fontSize: 10.5, valign: 'middle' });
    });
    addText(slide, `くわしくは p.${group.page}`, x + frameW - 1.75, frameY + frameH - 0.3, 1.3, 0.24, { fontSize: 9.5, color: g.main, bold: true, align: 'right', valign: 'middle' });
    roughArrow(slide, x + frameW - 0.42, frameY + frameH - 0.18, x + frameW - 0.16, frameY + frameH - 0.18, { color: g.main, width: 1.25, head: 0.06, bend: -0.03 });
  });

  // 共通の流れ（箱の色とアイコンの凡例を兼ねる）
  const flowY = frameY + frameH + 0.16;
  addText(slide, '共通の流れ', MARGIN_X, flowY, 1.05, 0.36, { fontSize: 11, bold: true, valign: 'middle' });
  const legend = [['measure', '計測'], ['estimate', '推定（③⑤⑧）'], ['calc', '補正量の計算'], ['scanner', '露光機での補正・露光']];
  const chipW = (text) => textWidth(text, 10.5) + 0.5;
  let lx = MARGIN_X + 1.1;
  legend.forEach(([type, text], k) => {
    const style = STEP[type];
    const w = chipW(text);
    roughRect(slide, lx, flowY, w, 0.36, { fill: style.tint, stroke: style.color, width: 1.5, amount: 0.01 });
    doodle(slide, style.icon, lx + 0.17, flowY + 0.18, 0.2, style.color);
    addText(slide, text, lx + 0.32, flowY, w - 0.36, 0.36, { fontSize: 10.5, bold: true, valign: 'middle' });
    lx += w;
    if (k < legend.length - 1) {
      roughArrow(slide, lx + 0.05, flowY + 0.18, lx + 0.3, flowY + 0.18, { width: 1.5, head: 0.07, bend: 0.02 });
      lx += 0.35;
    }
  });
  lx += 0.3;
  const physicalText = '成膜で物理補正（⑦）';
  const pw = chipW(physicalText);
  roughRect(slide, lx, flowY, pw, 0.36, { fill: STEP.physical.tint, stroke: STEP.physical.color, width: 1.5, amount: 0.01 });
  doodle(slide, 'layers', lx + 0.17, flowY + 0.18, 0.2, STEP.physical.color);
  addText(slide, physicalText, lx + 0.32, flowY, pw - 0.36, 0.36, { fontSize: 10.5, bold: true, valign: 'middle' });
  lx += pw + 0.35;
  [['measured', '測る所'], ['estimated', '推定する所']].forEach(([state, label]) => {
    slide.addShape(pres.shapes.OVAL, {
      x: lx, y: flowY + 0.11, w: 0.14, h: 0.14,
      fill: { color: state === 'measured' ? C.ink : C.paper }, line: { color: state === 'measured' ? C.ink : C.purple, width: 0.75 },
    });
    addText(slide, label, lx + 0.2, flowY, 1.0, 0.36, { fontSize: 10, color: C.sub, valign: 'middle' });
    lx += 0.2 + textWidth(label, 10) + 0.25;
  });
  if (lx > RIGHT_EDGE + 0.05) throw new Error(`凡例が右端を超えています: ${lx.toFixed(2)}`);

  addFooter(slide, 1, PAGES.summary.footer);
  slide.addNotes(notesFor('summary'));
}

// ================= p.2 A 露光機単独 =================
function buildScannerOnly() {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  addTitle(slide, PAGES.A.title, GR_LEAD.A, 'A');
  drawPanelFrame(slide, 'A');

  // 手描きの概念図：計測点数と補正の細かさ
  const px = MARGIN_X + PANEL_PAD;
  const ox = px + 0.42;
  const oy = BODY_TOP + 2.45;
  const axisW = PANEL_W - PANEL_PAD * 2 - 0.6;
  const axisH = 1.75;
  roughArrow(slide, ox, oy, ox + axisW, oy, { width: 1.5, bend: 0.01, head: 0.09 });
  roughArrow(slide, ox, oy, ox, oy - axisH, { width: 1.5, bend: -0.01, head: 0.09 });
  addText(slide, '測る点の数（＝時間）', ox, oy + 0.05, axisW, 0.24, { fontSize: 9.5, color: C.sub, align: 'center', valign: 'middle' });
  addText(slide, '補正の細かさ', px - 0.06, oy - axisH, 0.32, axisH, { fontSize: 9.5, color: C.sub, vert: 'vert270', align: 'center', valign: 'middle' });
  const g = GROUP_COLOR.A;
  const p1 = [ox + axisW * 0.16, oy - axisH * 0.2];
  const p2 = [ox + axisW * 0.84, oy - axisH * 0.72];
  const p3 = [ox + axisW * 0.42, oy - axisH * 0.8];
  roughArrow(slide, p1[0] + 0.2, p1[1] - 0.12, p2[0] - 0.22, p2[1] + 0.14, { color: C.faint, width: 1.25, dash: 'dash', bend: 0.08 });
  roughArrow(slide, p2[0] - 0.22, p2[1] - 0.06, p3[0] + 0.22, p3[1] - 0.02, { color: C.purple, width: 1.75, bend: 0.1 });
  numberBadge(slide, 0, p1[0], p1[1], 0.18, g.main, g.tint);
  numberBadge(slide, 1, p2[0], p2[1], 0.18, g.main, g.tint);
  numberBadge(slide, 2, p3[0], p3[1], 0.18, C.purple, C.purpleT);
  addText(slide, '推定で点を減らす！', p3[0] - 0.55, p3[1] - 0.52, 1.7, 0.26, { fontSize: 9.5, bold: true, color: C.purple, valign: 'middle' });
  addText(slide, '時間がかかる…', p2[0] - 1.25, p2[1] + 0.55, 1.3, 0.24, { fontSize: 9.5, color: C.sub, align: 'right', valign: 'middle' });

  drawFacts(slide, 'A', PAGES.A.facts, oy + 0.45);
  drawLanes(slide, 'A', LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 2, PAGES.A.footer);
  slide.addNotes(notesFor('A'));
}

// ================= p.3 B Litho Booster =================
function buildLithoBooster() {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  addTitle(slide, PAGES.B.title, GR_LEAD.B, 'B');
  drawPanelFrame(slide, 'B');

  // 手描きの流れ図：専用機で測る → 露光機へ送る
  const boxW = 2.05;
  const bx = MARGIN_X + PANEL_PAD + 0.05;
  let by = BODY_TOP + 0.58;
  const arrowH = 0.22;
  const boxes = [
    ['process', '前工程（成膜・エッチなど）', 0.36],
    ['measure', 'Litho Booster：細かく計測', 0.4],
    ['measure', '露光機：通常アライメント', 0.4],
    ['scanner', '合わせて露光', 0.36],
  ];
  const pos = [];
  boxes.forEach(([type, text, h], k) => {
    panelBox(slide, type, text, bx, by, boxW, h, 10);
    pos.push({ y: by, h });
    by += h;
    if (k < boxes.length - 1) {
      roughArrow(slide, bx + boxW / 2, by + 0.02, bx + boxW / 2, by + arrowH - 0.02, { width: 1.5, head: 0.07, bend: 0.01 });
      by += arrowH;
    }
  });
  // 補正量（FF）は点線の曲がった矢印で露光機へ
  const fromY = pos[1].y + pos[1].h / 2;
  const toY = pos[2].y + pos[2].h / 2;
  roughArrow(slide, bx + boxW + 0.04, fromY, bx + boxW + 0.04, toY, { color: C.green, width: 1.75, dash: 'dash', bend: -0.32, head: 0.08 });
  addText(slide, [{ text: '補正量', options: { breakLine: true } }, { text: '（FF）' }], bx + boxW + 0.32, fromY, MARGIN_X + PANEL_W - (bx + boxW + 0.32) - 0.04, toY - fromY, { fontSize: 9, bold: true, color: C.green, valign: 'middle' });

  const formulaY = by + 0.16;
  stickyNote(slide, PAGES.B.formula, MARGIN_X + PANEL_PAD, formulaY, PANEL_W - PANEL_PAD * 2, 0.7, 10);
  drawFacts(slide, 'B', PAGES.B.facts, formulaY + 0.84);

  // ④と⑤の使い分け（付箋）
  const choiceH = 0.74;
  drawLanes(slide, 'B', LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP - choiceH - 0.14);
  stickyNote(slide, [PAGES.B.choice.heading, ...PAGES.B.choice.lines], LANES_X, BODY_BOTTOM - choiceH, LANES_W, choiceH, 10.5);
  addFooter(slide, 3, PAGES.B.footer);
  slide.addNotes(notesFor('B'));
}

// ================= p.4 C Wafer歪み計測 =================
function buildWaferDistortion() {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  addTitle(slide, PAGES.C.title, GR_LEAD.C, 'C');
  drawPanelFrame(slide, 'C');

  // 手描きの反ったWaferを、表と裏から測る
  const px = MARGIN_X + PANEL_PAD;
  const pw = PANEL_W - PANEL_PAD * 2;
  const waferY = BODY_TOP + 1.3;
  const waferW = 1.9;
  const waferX = px + (pw - waferW) / 2;
  const bow = 0.16;
  const curve = [];
  for (let k = 0; k <= 16; k += 1) {
    const t = k / 16;
    curve.push([waferX + t * waferW, waferY - bow + bow * (2 * t - 1) ** 2 + jitter(0.004)]);
  }
  addPath(slide, curve, { stroke: C.ink, width: 4 });
  [-0.6, 0, 0.6].forEach((dx) => {
    const cx = waferX + waferW / 2 + dx;
    const t = (cx - waferX) / waferW;
    const surfaceY = waferY - bow + bow * (2 * t - 1) ** 2;
    roughArrow(slide, cx, waferY - bow - 0.36, cx, surfaceY - 0.06, { color: C.blue, width: 1.25, head: 0.06, bend: 0.01 });
    roughArrow(slide, cx, waferY + 0.36, cx, surfaceY + 0.07, { color: C.blue, width: 1.25, head: 0.06, bend: 0.01 });
  });
  addText(slide, '表の高さ', px, waferY - bow - 0.64, pw, 0.24, { fontSize: 9.5, bold: true, color: C.blue, align: 'center', valign: 'middle' });
  addText(slide, '裏の高さ（表も裏も全面で測る）', px, waferY + 0.38, pw, 0.24, { fontSize: 9.5, bold: true, color: C.blue, align: 'center', valign: 'middle' });

  let by = waferY + 0.68;
  roughArrow(slide, px + pw / 2, by, px + pw / 2, by + 0.2, { width: 1.5, head: 0.07, bend: 0.01 });
  by += 0.24;
  panelBox(slide, 'calc', '形の変化 → 面内歪み（IPD）', px + 0.12, by, pw - 0.24, 0.38, 10);
  by += 0.38;
  const useY = by + 0.3;
  const useW = (pw - 0.2) / 3;
  [['scanner', '⑥露光機', '高次補正'], ['physical', '⑦裏面膜', '反りを低減'], ['estimate', '⑧NZO', 'Waferごと']].forEach(([type, title, sub], k) => {
    const ux = px + k * (useW + 0.1);
    const style = STEP[type];
    roughArrow(slide, px + pw / 2, by + 0.03, ux + useW / 2, useY - 0.03, { width: 1.25, head: 0.06, bend: 0.02 });
    roughRect(slide, ux, useY, useW, 0.48, { fill: style.tint, stroke: style.color, width: 1.5, amount: 0.01 });
    addText(slide, [
      { text: title, options: { fontSize: 9.5, bold: true, breakLine: true } },
      { text: sub, options: { fontSize: 8, color: C.sub } },
    ], ux + 0.03, useY, useW - 0.06, 0.48, { align: 'center', valign: 'middle' });
  });

  drawFacts(slide, 'C', PAGES.C.facts, useY + 0.64);
  drawLanes(slide, 'C', LANES_X, BODY_TOP, LANES_W, BODY_BOTTOM - BODY_TOP);
  addFooter(slide, 4, PAGES.C.footer);
  slide.addNotes(notesFor('C'));
}

buildSummary();
buildScannerOnly();
buildLithoBooster();
buildWaferDistortion();

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}`));
