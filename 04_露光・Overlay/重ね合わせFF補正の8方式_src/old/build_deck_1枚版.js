// 重ね合わせFF（フィードフォワード）補正の8方式：必要な計測とプロセスフロー（1枚資料）
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 方式の中身は METHODS、出典は REFERENCES（発表者ノートへ書き出す）を直す。

const path = require('path');
const pptxgen = require('pptxgenjs');

const OUTPUT_PATH = process.argv[2] || path.join(__dirname, 'deck_raw.pptx');

// ---- 定数 ----
const FONT = 'BIZ UDGothic';
const DECK_DATE = '2026年10月3日';
const MARGIN_X = 0.35;
const SLIDE_W = 13.333;
const RIGHT_EDGE = SLIDE_W - MARGIN_X;

const TITLE_Y = 0.25;
const LEAD_Y = 0.7;
const HEADER_Y = 1.12;
const HEADER_H = 0.3;
const ROWS_TOP = 1.48;
const ROWS_BOTTOM = 6.9;
const ROW_GAP = 0.04;
const GROUP_GAP = 0.12;
const LEGEND_Y = 6.99;
const NOTE_Y = 7.22;

const CELL_FONT_SIZE = 9;
const CHIP_FONT_SIZE = 8.5;
const NAME_FONT_SIZE = 12;
const SMALL_FONT_SIZE = 8.5;

// 列の位置（インチ）
const COL = {
  band: { x: MARGIN_X, w: 0.42 },
  name: { x: 0.82, w: 2.0 },
  icon: { x: 2.87, w: 0.6 },
  measure: { x: 3.55, w: 1.8 },
  flow: { x: 5.43, w: 4.1 },
  correction: { x: 9.61, w: 1.42 },
  note: { x: 11.11, w: RIGHT_EDGE - 11.11 },
};
const CHIP_GAP = 0.17;
const NUMBER_D = 0.3;
const ICON_D = 0.56;
// 句読点のぶら下がりで列からはみ出さないよう、文字の箱は列幅より少し狭くする
const TEXT_SLACK = 0.1;

const C = {
  ink: '1C2230',
  muted: '5B6275',
  line: 'C9CED9',
  rowA: 'FFFFFF',
  rowB: 'F4F6F9',
  band: '2B3550',
  header: '2B3550',
  white: 'FFFFFF',
  teal: '12877A',
  tealTint: 'DCF0ED',
  tealMid: '8CCFC4',
  tealDeep: '4BAA9C',
  gold: 'C8962E',
  goldTint: 'F8EDD5',
  goldLine: 'E2C887',
  goldDark: '6B4E10',
  estTint: 'F1D9A2',
  navy: '24365E',
  terra: 'B8645A',
  terraTint: 'F3DCD8',
  gray: 'EEF0F4',
  grayText: '3A4256',
  waferLine: '9AA3B5',
};

// フローの箱の種類（色と凡例の名前）
const STEP = {
  process: { label: '工程・搬送', fill: C.gray, text: C.grayText, border: C.line },
  measure: { label: '計測', fill: C.teal, text: C.white, border: C.teal },
  estimate: { label: '推定', fill: C.gold, text: C.white, border: C.gold },
  calc: { label: '補正量の計算', fill: C.goldTint, text: C.goldDark, border: C.goldLine },
  scanner: { label: '露光機での補正・露光', fill: C.navy, text: C.white, border: C.navy },
  physical: { label: '成膜による物理補正', fill: C.terra, text: C.white, border: C.terra },
};

// ---- 方式の一覧（ユーザー指定の8方式・この順番） ----
// icon: few=少数点 / many=多点 / manyEst=多点＋推定 / all=全Shot / partEst=一部＋推定 / shape=形状の全面計測 / cvd=裏面成膜 / nzo=形状＋NZO
const GROUPS = [
  { label: ['露光機内の', 'アライメント計測'], rows: [0, 1, 2] },
  { label: ['専用アライメント機', '（Litho Booster）'], rows: [3, 4] },
  { label: ['Wafer形状計測', '（PWG）'], rows: [5, 6, 7] },
];

const METHODS = [
  {
    name: '低次補正',
    sub: '通常のアライメント計測',
    icon: 'few',
    measure: '露光機のアライメントセンサーで、数〜十数Shotのマーク位置を計測',
    flow: [
      ['process', '露光機に搬入'],
      ['measure', 'アライメント計測（少数点）'],
      ['calc', '線形モデルで補正量を計算'],
      ['scanner', '低次補正して露光'],
    ],
    tag: '低次',
    correction: 'Wafer・Shotの線形成分（シフト・倍率・回転・直交度）',
    note: '全方式の土台。スループットへの影響が最小。非線形な歪みは残る',
  },
  {
    name: '高次補正',
    sub: '多点アライメント計測',
    icon: 'many',
    measure: '同じ露光機内のセンサーで、計測点を数十点以上に増やす',
    flow: [
      ['process', '露光機に搬入'],
      ['measure', '多点アライメント計測'],
      ['calc', '高次の多項式で補正量を計算'],
      ['scanner', '高次補正して露光'],
    ],
    tag: '高次',
    correction: 'Waferごとの高次成分（3次以上の多項式）',
    note: 'Waferごとの非線形な歪みに追従。計測時間が増え、スループットが下がる',
  },
  {
    name: '推定＋高次補正',
    sub: '多点アライメント＋未測定領域の推定',
    icon: 'manyEst',
    measure: '多点アライメント計測＋推定用の履歴データ（過去のアライメント・重ね合わせ実績）',
    flow: [
      ['process', '露光機に搬入'],
      ['measure', '多点アライメント計測'],
      ['estimate', '未測定領域を推定'],
      ['calc', '推定した全面から補正量を計算'],
      ['scanner', '高次補正して露光'],
    ],
    tag: '高次',
    correction: '推定で補った全面の歪みから高次・Shotごとの補正量',
    note: '計測点を増やさずに補正を細かくできる。推定誤差の監視が必要',
  },
  {
    name: '全Shot補正',
    sub: 'Litho Boosterで全Shotを計測',
    icon: 'all',
    measure: '露光機外の専用機（Nikon Litho Booster）で全Shot・Shot内多点を計測',
    flow: [
      ['measure', '専用機で全Shotを計測'],
      ['calc', '高次・Shotごとの補正量を計算'],
      ['scanner', '露光機へ送る（FF）'],
      ['measure', '露光機で線形項を計測'],
      ['scanner', '線形項と合わせて露光'],
    ],
    tag: '全Shot',
    correction: '高次（グリッド）＋Shotごとのシフト・倍率・回転',
    note: '露光機のスループットを落とさず高密度に計測。専用機の導入とチャック差の管理が必要',
  },
  {
    name: '推定＋全Shot補正',
    sub: 'Litho Boosterで一部計測＋推定',
    icon: 'partEst',
    measure: 'Litho Boosterで一部のShotを計測し、推定用の履歴データを加える',
    flow: [
      ['measure', '専用機で一部のShotを計測'],
      ['estimate', '未測定のShotを推定'],
      ['calc', '全Shotの補正量を計算'],
      ['scanner', '露光機へ送る（FF）'],
      ['scanner', '線形項を測り、合わせて露光'],
    ],
    tag: '全Shot',
    correction: '推定で補った全Shotの補正量（高次＋Shotごと）',
    note: '専用機の処理枚数を増やせ、全Waferに適用しやすい。推定誤差の監視が必要',
  },
  {
    name: '高次補正',
    sub: 'PWGによるWafer歪み計測',
    icon: 'shape',
    measure: 'KLA PWGでWafer表裏の形状を全面計測（成膜・エッチなどの工程の前後）',
    flow: [
      ['measure', '工程前にPWGで計測'],
      ['process', '成膜・エッチなど'],
      ['measure', '工程後にPWGで計測'],
      ['calc', '形状変化→面内歪み→補正量'],
      ['scanner', '露光機へ送り、高次補正して露光'],
    ],
    tag: '高次',
    correction: '形状由来の面内歪み（IPD）を高次・Shotごとに補正',
    note: 'マークに頼らず全面の歪みが分かる。形状から歪みへの換算の精度に依存',
  },
  {
    name: '物理補正',
    sub: '裏面CVDによるWafer歪み補正',
    icon: 'cvd',
    measure: 'PWGなどでWaferの反り・形状を計測（成膜の前後）',
    flow: [
      ['measure', 'PWGで反りを計測'],
      ['calc', '裏面膜の厚さ・応力を計算'],
      ['physical', '裏面にCVDで成膜'],
      ['measure', '形状を再計測して確認'],
      ['scanner', '露光（残りは露光機で補正）'],
    ],
    tag: '物理',
    correction: '裏面膜の応力で反り・歪みそのものを減らす',
    note: '露光機の補正範囲やチャック吸着の限界を超える反りに有効。成膜工程とコストが増える',
  },
  {
    name: 'NZO補正',
    sub: 'PWGによるWafer歪み計測',
    icon: 'nzo',
    measure: 'PWGで形状を計測。予測モデル作りにADI・AEI（エッチ後）の重ね合わせ実績を使う',
    flow: [
      ['calc', '事前：予測モデルを作成', { dashed: true }],
      ['measure', 'PWGで形状を計測'],
      ['estimate', 'WaferごとのNZOを予測'],
      ['scanner', '目標オフセットを更新して送る'],
      ['scanner', '露光'],
    ],
    tag: 'オフセット',
    correction: 'WaferごとのNZOを露光の目標オフセットに反映',
    note: '固定値だったNZOをWaferごとに変えられる。AEI計測でのモデルの定期検証が必要',
  },
];

const HEADERS = [
  { col: 'name', text: '方式', x: COL.name.x, w: COL.name.w },
  { col: 'icon', text: '計測範囲', x: COL.icon.x - 0.04, w: COL.icon.w + 0.08 },
  { col: 'measure', text: '必要な計測（どこで・何を）', x: COL.measure.x, w: COL.measure.w },
  { col: 'flow', text: 'プロセスフロー（左から右へ）', x: COL.flow.x, w: COL.flow.w },
  { col: 'correction', text: '補正の内容', x: COL.correction.x, w: COL.correction.w },
  { col: 'note', text: '特徴・注意', x: COL.note.x, w: COL.note.w },
];

// ---- 出典（発表者ノートに書き出す） ----
const REFERENCES = [
  'Nikon Precision, "Litho Booster Standalone Alignment Station"（全Shotの補正項をFFし、露光機の線形項と合わせる。事例 16点→626点）https://www.nikonprecision.com/products-and-technology/alignment-stations/litho-booster/',
  '"Feed-forward alignment correction for advanced overlay process control using a standalone alignment station \'Litho Booster\'," Proc. SPIE 10585, 105852Z (2018). doi:10.1117/12.2297300',
  'KLA, PWG5 製品資料（反り・両面形状・面内変位・応力の計測）https://www.kla.com/documents/products/brochures/KLA-PWG5-Product-Brochure.pdf',
  'Wafer-shape based in-plane distortion predictions using superfast 4G metrology, Proc. SPIE 10145 (2017)（形状から面内歪み IPD を予測しFF補正に使う）',
  'Patterned wafer geometry grouping for improved overlay control, Semiconductor Digest (2018) https://sst.semiconductor-digest.com/2018/07/patterned-wafer-geometry-grouping-for-improved-overlay-control/',
  'KLA, WO2018140534A1 "Overlay control with non-zero offset prediction"（NZO＝ADIとAEIの重ね合わせの差）https://patents.google.com/patent/WO2018140534A1/en',
  '"Contribution of optical overlay target design to non-zero offset stability," Proc. SPIE 13426, 134260F (2025). doi:10.1117/12.3060359',
  'Lam Research, VECTOR DT（裏面に応力を打ち消す膜を成膜するPECVD）ニュースリリース 2019-08-07 https://www.globenewswire.com/news-release/2019/08/07/1898426/0/en/Lam-Research-Adds-Global-Wafer-Stress-Management-Solutions-to-Portfolio-for-3D-NAND-Scaling.html',
];

// ---- プレゼンテーション ----
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせFF補正の8方式：必要な計測とプロセスフロー';
pres.lang = 'ja-JP';

const slide = pres.addSlide();
slide.background = { color: C.white };

function addText(content, x, y, w, h, options = {}) {
  slide.addText(content, {
    x, y, w, h,
    fontFace: FONT,
    lang: 'ja-JP',
    color: C.ink,
    fontSize: CELL_FONT_SIZE,
    margin: 0,
    valign: 'middle',
    isTextBox: true,
    ...options,
  });
}

function addRect(x, y, w, h, fill, line = null, extra = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: line ? { color: line, width: 0.75, ...(extra.dash ? { dashType: extra.dash } : {}) } : { color: fill, width: 0 },
  });
}

// 右向きの矢印（正の長さの水平線で描く）
function addArrow(x, y, length) {
  slide.addShape(pres.shapes.LINE, {
    x, y, w: length, h: 0,
    line: { color: C.muted, width: 1, endArrowType: 'triangle' },
  });
}

// ---- タイトルとリード文 ----
addText('重ね合わせFF補正の8方式：必要な計測とプロセスフロー', MARGIN_X, TITLE_Y, SLIDE_W - MARGIN_X * 2 - 1.6, 0.42, {
  fontSize: 22, bold: true, valign: 'middle',
});
addText(DECK_DATE, RIGHT_EDGE - 1.6, TITLE_Y, 1.6, 0.42, { fontSize: SMALL_FONT_SIZE, color: C.muted, align: 'right' });
addText('FF（フィードフォワード）補正：露光の前にそのWaferを計測し、結果をその層の露光（⑦は裏面の成膜）に反映する制御。計測の場所（露光機内／専用アライメント機／形状計測機）と、未測定の領域を推定するかどうかで分かれる', MARGIN_X, LEAD_Y, SLIDE_W - MARGIN_X * 2, 0.38, {
  fontSize: 10.5, color: C.muted,
});

// ---- 表の見出し ----
addRect(COL.name.x, HEADER_Y, RIGHT_EDGE - COL.name.x, HEADER_H, C.header);
HEADERS.forEach((h) => {
  addText(h.text, h.x, HEADER_Y, h.w, HEADER_H, {
    color: C.white, bold: true, fontSize: CELL_FONT_SIZE, align: h.col === 'icon' ? 'center' : 'left',
  });
});

// ---- 行の位置を求める（グループの間だけ少し広く空ける） ----
const nGapsInGroup = GROUPS.reduce((s, g) => s + g.rows.length - 1, 0);
const rowH = (ROWS_BOTTOM - ROWS_TOP - nGapsInGroup * ROW_GAP - (GROUPS.length - 1) * GROUP_GAP) / METHODS.length;
const rowY = [];
let cursorY = ROWS_TOP;
GROUPS.forEach((g, gi) => {
  g.rows.forEach((r, k) => {
    rowY[r] = cursorY;
    cursorY += rowH + (k < g.rows.length - 1 ? ROW_GAP : 0);
  });
  if (gi < GROUPS.length - 1) cursorY += GROUP_GAP;
});

// ---- 計測範囲のミニ図 ----
const SHOT_W = 0.062;
const SHOT_H = 0.078;
const ICON_INSET = 0.012;

// Wafer円の中に入るShotの一覧（四隅が円の内側にあるもの）
function shotCells() {
  const r = ICON_D / 2 - ICON_INSET;
  const cells = [];
  for (let i = -5; i < 5; i += 1) {
    for (let j = -4; j < 4; j += 1) {
      const x0 = i * SHOT_W;
      const y0 = j * SHOT_H;
      const corners = [[x0, y0], [x0 + SHOT_W, y0], [x0, y0 + SHOT_H], [x0 + SHOT_W, y0 + SHOT_H]];
      if (corners.every(([cx, cy]) => Math.hypot(cx, cy) <= r)) cells.push({ i, j, x0, y0 });
    }
  }
  return cells;
}
const CELLS = shotCells();

// 少数点のアライメントで計測するShot（中心から見て8方向）
function fewSelected() {
  const targets = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * 0.17, Math.sin(a) * 0.17];
  });
  const chosen = new Set();
  targets.forEach(([tx, ty]) => {
    let best = null;
    CELLS.forEach((c, k) => {
      const d = Math.hypot(c.x0 + SHOT_W / 2 - tx, c.y0 + SHOT_H / 2 - ty);
      if (!best || d < best.d) best = { k, d };
    });
    chosen.add(best.k);
  });
  return chosen;
}
const FEW = fewSelected();

function cellState(kind, cell, k) {
  const checker = (cell.i + cell.j + 100) % 2 === 0;
  const third = (cell.i + 2 * cell.j + 300) % 3 === 0;
  switch (kind) {
    case 'few': return FEW.has(k) ? 'measured' : 'blank';
    case 'many': return checker ? 'measured' : 'blank';
    case 'manyEst': return checker ? 'measured' : 'estimated';
    case 'all': return 'measured';
    case 'partEst': return third ? 'measured' : 'estimated';
    default: return 'blank';
  }
}

function drawWaferOutline(cx, cy) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - ICON_D / 2, y: cy - ICON_D / 2, w: ICON_D, h: ICON_D,
    fill: { color: C.white }, line: { color: C.waferLine, width: 0.75 },
  });
}

function drawShotIcon(kind, cx, cy) {
  drawWaferOutline(cx, cy);
  const fills = { measured: C.teal, estimated: C.estTint, blank: C.white };
  CELLS.forEach((cell, k) => {
    const state = cellState(kind, cell, k);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx + cell.x0, y: cy + cell.y0, w: SHOT_W, h: SHOT_H,
      fill: { color: fills[state] }, line: { color: 'D5DAE3', width: 0.25 },
    });
  });
}

// 形状の全面計測（等高線のような同心円）
function drawShapeIcon(cx, cy) {
  [[1.0, C.tealTint], [0.74, C.tealMid], [0.48, C.tealDeep], [0.22, C.teal]].forEach(([s, color], k) => {
    const d = ICON_D * s;
    slide.addShape(pres.shapes.OVAL, {
      x: cx - d / 2 + (k ? 0.02 * s : 0), y: cy - d / 2 - (k ? 0.02 * s : 0), w: d, h: d,
      fill: { color }, line: k ? { color, width: 0 } : { color: C.waferLine, width: 0.75 },
    });
  });
}

// 裏面成膜：反ったWafer → 裏面膜で平らにする（横から見た図）
function drawCvdIcon(cx, cy) {
  const w = 0.52;
  const x0 = cx - w / 2;
  const bowTop = cy - 0.25;
  const bowDepth = 0.07;
  const pts = [];
  const N = 12;
  for (let k = 0; k <= N; k += 1) {
    const t = k / N;
    pts.push({ x: t * w, y: bowDepth * (1 - (2 * t - 1) ** 2) });
  }
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: x0, y: bowTop, w, h: bowDepth + 0.01, points: pts, line: { color: C.grayText, width: 1.75 },
  });
  slide.addShape(pres.shapes.LINE, {
    x: cx - 0.045, y: cy - 0.06, w: 0.09, h: 0, rotate: 90,
    line: { color: C.muted, width: 0.75, endArrowType: 'triangle' },
  });
  addRect(x0, cy + 0.07, w, 0.03, C.grayText);
  addRect(x0, cy + 0.105, w, 0.045, C.terra);
  addText('裏面膜', x0 - 0.05, cy + 0.155, w + 0.1, 0.12, { fontSize: 6.5, color: C.terra, align: 'center', bold: true });
}

function drawNzoIcon(cx, cy) {
  drawShapeIcon(cx, cy);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx - 0.2, y: cy + 0.13, w: 0.4, h: 0.15, rectRadius: 0.04,
    fill: { color: C.gold }, line: { color: C.white, width: 0.75 },
  });
  addText('NZO', cx - 0.2, cy + 0.13, 0.4, 0.15, { fontSize: 7, bold: true, color: C.white, align: 'center' });
}

function drawIcon(kind, cx, cy) {
  if (kind === 'shape') drawShapeIcon(cx, cy);
  else if (kind === 'cvd') drawCvdIcon(cx, cy);
  else if (kind === 'nzo') drawNzoIcon(cx, cy);
  else drawShotIcon(kind, cx, cy);
}

// ---- フローの箱 ----
function drawFlow(steps, y, h) {
  const n = steps.length;
  const chipW = (COL.flow.w - (n - 1) * CHIP_GAP) / n;
  steps.forEach(([type, text, opts = {}], k) => {
    const style = STEP[type];
    const x = COL.flow.x + k * (chipW + CHIP_GAP);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: chipW, h, rectRadius: 0.06,
      fill: { color: opts.dashed ? C.white : style.fill },
      line: { color: style.border, width: opts.dashed ? 1 : 0.75, ...(opts.dashed ? { dashType: 'dash' } : {}) },
    });
    addText(text, x + 0.03, y, chipW - 0.06, h, {
      fontSize: CHIP_FONT_SIZE, color: opts.dashed ? style.text : style.text, align: 'center', bold: type !== 'process' && type !== 'calc',
    });
    if (k < n - 1) addArrow(x + chipW + 0.02, y + h / 2, CHIP_GAP - 0.04);
  });
}

// ---- 各行 ----
METHODS.forEach((m, r) => {
  const y = rowY[r];
  addRect(COL.name.x, y, RIGHT_EDGE - COL.name.x, rowH, r % 2 === 0 ? C.rowA : C.rowB, 'E1E4EA');

  // 番号と方式名
  slide.addShape(pres.shapes.OVAL, {
    x: COL.name.x + 0.06, y: y + rowH / 2 - NUMBER_D / 2, w: NUMBER_D, h: NUMBER_D,
    fill: { color: C.band }, line: { color: C.band, width: 0 },
  });
  addText(String(r + 1), COL.name.x + 0.06, y + rowH / 2 - NUMBER_D / 2, NUMBER_D, NUMBER_D, {
    fontSize: 11, bold: true, color: C.white, align: 'center',
  });
  const nameX = COL.name.x + 0.06 + NUMBER_D + 0.08;
  addText([
    { text: m.name, options: { fontSize: NAME_FONT_SIZE, bold: true, breakLine: true } },
    { text: m.sub, options: { fontSize: SMALL_FONT_SIZE, color: C.muted } },
  ], nameX, y + 0.03, COL.name.x + COL.name.w - nameX, rowH - 0.06, { paraSpaceAfter: 1 });

  // 計測範囲のミニ図
  drawIcon(m.icon, COL.icon.x + COL.icon.w / 2, y + rowH / 2);

  // 必要な計測
  addText(m.measure, COL.measure.x, y + 0.03, COL.measure.w - TEXT_SLACK, rowH - 0.06);

  // プロセスフロー
  const chipH = rowH - 0.14;
  drawFlow(m.flow, y + (rowH - chipH) / 2, chipH);

  // 補正の内容（先頭に補正の細かさの印）
  addText([
    { text: `【${m.tag}】`, options: { bold: true, color: C.navy } },
    { text: m.correction },
  ], COL.correction.x, y + 0.03, COL.correction.w - TEXT_SLACK, rowH - 0.06);

  // 特徴・注意
  addText(m.note, COL.note.x, y + 0.03, COL.note.w - TEXT_SLACK, rowH - 0.06);
});

// ---- グループの帯（縦書きの見出し） ----
GROUPS.forEach((g) => {
  const top = rowY[g.rows[0]];
  const last = g.rows[g.rows.length - 1];
  const bottom = rowY[last] + rowH;
  addRect(COL.band.x, top, COL.band.w, bottom - top, C.band);
  addText([
    { text: g.label[0], options: { breakLine: true } },
    { text: g.label[1] },
  ], COL.band.x, top, COL.band.w, bottom - top, {
    vert: 'vert270', color: C.white, bold: true, fontSize: SMALL_FONT_SIZE, align: 'center',
  });
});

// ---- 凡例 ----
let legendX = MARGIN_X;
const LEGEND_CHIP_W = 0.26;
const LEGEND_H = 0.17;
Object.values(STEP).forEach((s) => {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: legendX, y: LEGEND_Y + 0.02, w: LEGEND_CHIP_W, h: LEGEND_H - 0.04, rectRadius: 0.03,
    fill: { color: s.fill }, line: { color: s.border, width: 0.75 },
  });
  const labelW = 0.13 * s.label.length + 0.1;
  addText(s.label, legendX + LEGEND_CHIP_W + 0.06, LEGEND_Y, labelW, LEGEND_H, { fontSize: SMALL_FONT_SIZE, color: C.muted });
  legendX += LEGEND_CHIP_W + 0.06 + labelW + 0.12;
});
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: legendX, y: LEGEND_Y + 0.02, w: LEGEND_CHIP_W, h: LEGEND_H - 0.04, rectRadius: 0.03,
  fill: { color: C.white }, line: { color: C.goldLine, width: 1, dashType: 'dash' },
});
addText('事前の準備', legendX + LEGEND_CHIP_W + 0.06, LEGEND_Y, 0.8, LEGEND_H, { fontSize: SMALL_FONT_SIZE, color: C.muted });
legendX += LEGEND_CHIP_W + 0.06 + 0.8 + 0.25;
[[C.teal, '計測するShot'], [C.estTint, '推定するShot']].forEach(([color, label]) => {
  addRect(legendX, LEGEND_Y + 0.025, 0.11, 0.12, color, 'D5DAE3');
  addText(label, legendX + 0.16, LEGEND_Y, 1.0, LEGEND_H, { fontSize: SMALL_FONT_SIZE, color: C.muted });
  legendX += 0.16 + 1.0 + 0.05;
});

addText('IPD：面内歪み（In-Plane Distortion）　NZO：Non-Zero Offset＝現像後に計測マークで測る重ね合わせ（ADI）と、エッチ後のデバイス上の重ね合わせ（AEI）の差　点数・装置名は代表例。出典と補足は発表者ノート', MARGIN_X, NOTE_Y, SLIDE_W - MARGIN_X * 2, 0.2, {
  fontSize: SMALL_FONT_SIZE, color: C.muted,
});

// ---- 発表者ノート ----
const notes = [
  '【この資料の要点】重ね合わせのFF補正を、計測の場所（露光機内のアライメント／専用アライメント機 Litho Booster／Wafer形状計測 PWG）と、未測定の領域を推定するかどうかで8方式に整理した。',
  '',
  ...METHODS.map((m, r) => `${String.fromCharCode(0x2460 + r)} ${m.name}（${m.sub}）：計測＝${m.measure}。流れ＝${m.flow.map((s) => s[1]).join(' → ')}。補正＝${m.correction}。特徴＝${m.note}`),
  '',
  '【補足】',
  '・Litho Booster は Nikon の専用アライメント機。露光機の外で高密度に計測し、高次・Shotごとの補正項を露光機へ送る。露光機では通常のアライメントで線形項を測り、両者を合わせて露光する（Nikon の製品説明）。',
  '・PWG は KLA の形状計測機。工程の前後の形状変化から面内歪み（IPD）を予測し、露光機へFFする使い方が報告されている。',
  '・NZO は、ADI（現像後・計測マーク）とAEI（エッチ後・デバイス上）の重ね合わせの差。通常は APC で固定値として入れる。⑧はPWGの形状からWaferごとのNZOを予測して入れる方式。形状からNZOを予測する公開事例は、この資料の作成時に確認できていない。',
  '・裏面CVDは、表面の膜の応力でできた反りを、裏面に打ち消す応力の膜を付けて減らす（例：Lam Research VECTOR DT）。',
  '・各方式の点数（数〜十数Shot、数十点以上など）は代表的な目安で、装置・工程・製品で変わる。',
  '',
  '【出典】',
  ...REFERENCES.map((ref, k) => `[${k + 1}] ${ref}`),
];
slide.addNotes(notes.join('\n'));

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}`));
