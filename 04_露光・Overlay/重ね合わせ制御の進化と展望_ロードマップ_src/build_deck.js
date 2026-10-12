// 半導体リソグラフィーの重ね合わせ（Overlay）制御：進化の歴史と今後の展望（ロードマップ）
// pptxgenjs でスライドを組み立てる。
// 使い方: NODE_PATH="$(npm root -g)" node build_deck.js <出力パス>
// 数値はすべて公開資料からの引用で、出典は各スライドの下と参考文献スライドに示す（確認日 2026-09-26）。

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
const DECK_DATE = '2026年9月26日';
const TITLE_FONT_SIZE = 24;
const BODY_FONT_SIZE = 14;
const SOURCE_Y = 6.97;

const C = {
  night: '151937',
  nightCard: '232A5C',
  primary: '2E3D8F',
  primaryLight: 'AFB9EE',
  tint: 'ECEEFA',
  ink: '1B1E33',
  muted: '5E6379',
  line: 'C4C8D8',
  grid: 'E4E6EF',
  gray: 'F3F4F8',
  neutral: '8D92A6',
  white: 'FFFFFF',
  onDarkSub: 'D2D7F4',
  gold: 'B97A12',
  goldTint: 'F8ECD3',
  alert: 'B0413A',
  alertTint: 'F7E2DF',
};

// 時代ごとの色。古い時代ほど長い波長（赤寄り）、新しい時代ほど短い波長（紫寄り）にして、露光波長の短波長化と重ねる
const ERAS = [
  { no: '①', years: '1960〜1977年', start: '1960', name: '目と手で合わせる', color: 'A8483F', tint: 'F5E3E0' },
  { no: '②', years: '1978〜1989年', start: '1978', name: 'ステッパーと統計的アライメント', color: 'B86F1F', tint: 'F7EAD9' },
  { no: '③', years: '1990〜2005年', start: '1990', name: 'スキャナー・2ステージ・APC', color: '557F34', tint: 'E5EFDC' },
  { no: '④', years: '2006〜2016年', start: '2006', name: '液浸・多重パターニングと高次補正', color: '1D7A93', tint: 'DCEEF3' },
  { no: '⑤', years: '2017〜2025年', start: '2017', name: 'EUV量産と製品上の重ね合わせ', color: '3450A6', tint: 'E1E6F6' },
  { no: '→', years: '2026〜2035年', start: '2026', name: 'サブnm・3D集積・工程横断', color: '7646AD', tint: 'EEE6F7' },
];
const [E1, E2, E3, E4, E5, FUTURE] = ERAS;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Claude Code';
pres.title = '重ね合わせ（Overlay）制御の進化と展望：ロードマップ';
pres.lang = 'ja-JP';

let pageNumber = 0;

// ---- 文字の補助関数 ----

// "T_{x}" の形を下付き文字のランに変換する
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

function withBreaks(lines) {
  return lines.map((line, j) => ({ text: line, breakLine: j < lines.length - 1 }));
}

function addText(slide, content, x, y, w, h, options = {}) {
  let runs = content;
  if (typeof content === 'string') {
    if (content.includes('\n')) runs = toRuns(withBreaks(content.split('\n')));
    else if (content.includes('_{')) runs = toRuns(content);
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

function addCard(slide, x, y, w, h, { fill = C.tint, line, radius = 0.08, dash, lineWidth = 1 } = {}) {
  const options = {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill },
    line: line ? { color: line, width: lineWidth } : { color: fill, width: 0.5 },
  };
  if (dash) options.line.dashType = dash;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, options);
}

// 枠線だけの角丸四角
function addFrame(slide, x, y, w, h, { color = C.line, width = 1, dash, radius = 0.08 } = {}) {
  const line = { color, width };
  if (dash) line.dashType = dash;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, line });
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

function addNode(slide, cx, cy, diameter, fill, label, { color = C.white, fontSize = 14, lineColor } = {}) {
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

// 色つきの小さなラベル（年や分類）
function addChip(slide, text, x, y, w, h, { fill = C.primary, color = C.white, fontSize = 11, bold = true, align = 'center', radius = 0.06 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: fill, width: 0.5 } });
  addText(slide, text, x + 0.04, y, w - 0.08, h, { fontSize, bold, color, align, valign: 'middle' });
}

// 重ね合わせターゲット（Box-in-Box）の記号：外枠が下の層、中の四角が上の層。中の四角を少しずらして「ずれ」を表す
function drawTarget(slide, x, y, size, { outer = C.primary, inner = C.primary, lineWidth = 1.25, ratio = 0.5, shiftX = 0.1, shiftY = -0.08, innerTransparency = 20, ghost } = {}) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w: size, h: size, line: { color: outer, width: lineWidth } });
  const s = size * ratio;
  const baseX = x + (size - s) / 2;
  const baseY = y + (size - s) / 2;
  if (ghost) {
    slide.addShape(pres.shapes.RECTANGLE, { x: baseX, y: baseY, w: s, h: s, line: { color: ghost, width: 1, dashType: 'dash' } });
  }
  slide.addShape(pres.shapes.RECTANGLE, {
    x: baseX + shiftX * size, y: baseY + shiftY * size, w: s, h: s,
    fill: { color: inner, transparency: innerTransparency }, line: { color: inner, width: 0.75 },
  });
  return { idealX: baseX + s / 2, idealY: baseY + s / 2, actualX: baseX + shiftX * size + s / 2, actualY: baseY + shiftY * size + s / 2 };
}

// 番号付きの見出しと説明（カード）
function addNumberedCard(slide, x, y, w, h, num, title, desc, { fill = C.gray, color = C.primary, descSize = 13, titleSize = 15 } = {}) {
  addCard(slide, x, y, w, h, { fill });
  addNode(slide, x + 0.4, y + 0.4, 0.44, color, String(num), { fontSize: 14 });
  addText(slide, title, x + 0.76, y + 0.16, w - 0.9, 0.5, { fontSize: titleSize, bold: true, valign: 'middle' });
  addText(slide, desc, x + 0.3, y + 0.76, w - 0.55, h - 0.86, { fontSize: descSize });
}

// 年のチップ＋本文の1行（年表）
function addTimelineItem(slide, x, y, w, year, text, era, { chipW = 1.05, fontSize = 13, h = 0.8 } = {}) {
  addChip(slide, year, x, y + 0.02, chipW, 0.34, { fill: era.color, fontSize: 11.5 });
  addText(slide, text, x + chipW + 0.18, y, w - chipW - 0.18, h, { fontSize });
}

// ---- スライド共通 ----

// 右上に6つの時代の点を並べ、今どの時代の話かを示す
function addEraTracker(slide, activeIndex) {
  const x0 = 10.35;
  const step = 0.4;
  const y = 0.47;
  addLine(slide, x0, y, x0 + step * (ERAS.length - 1), y, { color: C.line, width: 1 });
  ERAS.forEach((era, i) => {
    const active = i === activeIndex;
    const d = active ? 0.26 : 0.15;
    slide.addShape(pres.shapes.OVAL, {
      x: x0 + i * step - d / 2, y: y - d / 2, w: d, h: d,
      fill: { color: era.color, transparency: active ? 0 : 55 }, line: { color: active ? C.white : era.color, width: active ? 1.5 : 0.5 },
    });
  });
  const era = ERAS[activeIndex];
  addText(slide, era === FUTURE ? '展望' : `時代${era.no}`, x0 + step * (ERAS.length - 1) + 0.22, y - 0.14, 0.75, 0.28, { fontSize: 10.5, bold: true, color: era.color });
}

function newContentSlide(kicker, title, notes, { era, eraIndex } = {}) {
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.white };
  const accent = era ? era.color : C.primary;
  drawTarget(slide, MARGIN_X, 0.4, 0.2, { outer: accent, inner: accent, lineWidth: 1.25, innerTransparency: 25 });
  addText(slide, kicker, MARGIN_X + 0.32, 0.35, 8.8, 0.3, { fontSize: 12, bold: true, color: accent, charSpacing: 1 });
  addText(slide, title, MARGIN_X, 0.68, CONTENT_W, 0.66, { fontSize: TITLE_FONT_SIZE, bold: true, valign: 'middle' });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.muted, align: 'right' });
  if (eraIndex !== undefined) addEraTracker(slide, eraIndex);
  if (notes) slide.addNotes(notes.join('\n'));
  return slide;
}

// 出典は2行まで入るようにする（ページ番号の左側）
function addSource(slide, text, { y = SOURCE_Y, h = 0.42, fontSize = 8.5 } = {}) {
  addText(slide, text, MARGIN_X, y, 11.55, h, { fontSize, color: C.muted, valign: 'top' });
}

// 表の共通設定
function tableRows(header, rows, { headFill = C.primary, fontSize = 11.5, firstColBold = true, zebra = C.gray } = {}) {
  const head = header.map((text) => ({ text, options: { bold: true, color: C.white, fill: { color: headFill }, fontSize } }));
  const body = rows.map((row, i) => row.map((text, j) => ({
    text,
    options: { bold: firstColBold && j === 0, color: C.ink, fill: { color: i % 2 === 0 ? C.white : zebra }, fontSize },
  })));
  return [head, ...body];
}

function addTableBox(slide, rows, x, y, w, colW, { rowH, fontSize = 11.5 } = {}) {
  slide.addTable(rows, {
    x, y, w, colW, rowH,
    fontFace: FONT, fontSize, color: C.ink, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line },
    margin: [0.04, 0.08, 0.04, 0.08],
  });
}

// =====================================================================
// 1. 表紙
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'LITHOGRAPHY OVERLAY CONTROL ROADMAP', 0.8, 1.2, 7.8, 0.35, { fontSize: 13, bold: true, color: C.primaryLight, charSpacing: 2 });
  addText(slide, withBreaks(['重ね合わせ（Overlay）制御の', '進化と展望']), 0.8, 1.65, 8.0, 1.75, { fontSize: 38, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 1.05 });
  addText(slide, '半導体リソグラフィーの60年を5つの時代で振り返り、\n2035年までを見通すロードマップ', 0.8, 3.62, 7.6, 0.9, { fontSize: 18, color: C.onDarkSub, lineSpacingMultiple: 1.1 });
  addText(slide, '露光装置・アライメント・補正モデル・計測・要求値の5つの流れで整理', 0.8, 4.68, 7.3, 0.4, { fontSize: 13, color: C.primaryLight });
  addText(slide, `${DECK_DATE}　｜　公開情報（論文・業界ロードマップ・各社発表）に基づく技術解説`, 0.8, 6.45, 9.0, 0.35, { fontSize: 12, color: C.onDarkSub });

  // 右側：重ね合わせターゲットの大きな図
  const t = drawTarget(slide, 9.35, 1.25, 2.8, { outer: C.primaryLight, inner: FUTURE.color, lineWidth: 3, ratio: 0.48, shiftX: 0.09, shiftY: -0.07, innerTransparency: 10, ghost: C.onDarkSub });
  addLine(slide, t.idealX, t.idealY, t.actualX, t.actualY, { color: 'F2C14E', width: 2.5, arrow: true });
  addText(slide, '下の層（前の工程）', 9.35, 4.12, 2.8, 0.3, { fontSize: 11, color: C.onDarkSub, align: 'center' });
  addText(slide, '上の層（今回の露光）', 10.6, 0.88, 2.2, 0.3, { fontSize: 11, color: C.onDarkSub, align: 'right' });
  addText(slide, 'ずれ', t.actualX + 0.15, t.actualY + 0.25, 0.6, 0.3, { fontSize: 11, bold: true, color: 'F2C14E' });

  // 右下：時代の点（この資料の構成）
  const x0 = 8.95;
  const step = 0.74;
  const y = 5.35;
  addText(slide, '5つの時代とこれから', x0 - 0.3, y - 0.62, 4.5, 0.3, { fontSize: 11, color: C.primaryLight });
  addLine(slide, x0, y, x0 + step * 5, y, { color: C.primaryLight, width: 1 });
  ERAS.forEach((era, i) => {
    addNode(slide, x0 + i * step, y, 0.34, era.color, era.no === '→' ? '' : era.no, { fontSize: 11, lineColor: C.white });
    addText(slide, i === 5 ? '2026〜' : era.start, x0 + i * step - 0.35, y + 0.26, 0.7, 0.28, { fontSize: 10, color: C.onDarkSub, align: 'center' });
  });

  slide.addNotes([
    'この資料では、半導体リソグラフィーの重ね合わせ制御、つまり前の工程で作った下の層のパターンに、次の層をどれだけ正確に重ねられるかという技術の歴史と今後を、ロードマップとして整理します。',
    '1960年代の手作業の位置合わせから、2020年代のEUV、そして貼り合わせや縦積みの時代までを、5つの時代に分けて振り返ります。',
    '数値はすべて公開されている論文、業界ロードマップ、装置メーカーの発表から引用し、各スライドの下に出典を示しています。',
    '装置の仕様値と、製品上で求められる値は定義が違うので、比べるときは目安として見てください。',
  ].join('\n'));
}

// =====================================================================
// 2. この資料の見方
// =====================================================================
{
  const slide = newContentSlide('この資料の見方', '3つの問いと5つの流れで、60年の変化を整理する', [
    'この資料は3つの問いで構成しています。1つ目は歴史で、各時代に何が重ね合わせを良くしたのかを見ます。',
    '2つ目は現在地で、2026年時点の装置の性能と製品に求められる値、そして新しく使われるようになった管理指標を確認します。',
    '3つ目は展望で、High-NA EUV、裏面配線とCFET、貼り合わせ、EPEという新しい指標、計測とAIの5つのテーマを取り上げます。',
    'ロードマップは、露光装置、アライメントとステージ、補正モデルと制御、計測、要求と課題の5つの流れで整理しています。',
    '装置の仕様値と製品上の要求値は測る条件が違うため、同じグラフに載せる場合も目安として比べます。',
  ]);
  const cardW = 6.0;
  const cards = [
    ['歴史：何が重ね合わせを良くしてきたか', '1960〜2025年を5つの時代に分け、装置・アライメント・補正モデル・計測の変化を追う（スライド4〜16）'],
    ['現在地：2026年はどこまで来たか', '装置の号機間性能、製品上の要求値、新しい管理指標（OPO・NZO・EPE）を数字で確認する（スライド5・17）'],
    ['展望：2035年に向けて何が変わるか', 'High-NA、裏面配線とCFET、貼り合わせ、EPE制御、計測とAIの5テーマと、今後のロードマップ（スライド18〜24）'],
  ];
  cards.forEach(([title, desc], i) => {
    addNumberedCard(slide, MARGIN_X, 1.6 + i * 1.72, cardW, 1.55, i + 1, title, desc, { fill: C.gray, color: C.primary, descSize: 13.5 });
  });

  const rx = 7.0;
  const rw = RIGHT_EDGE - rx;
  addText(slide, 'ロードマップの5つの流れ', rx, 1.6, rw, 0.36, { fontSize: 15, bold: true });
  const lanes = [
    ['露光装置', 'どう焼くか：密着 → ステッパー → スキャナー → 液浸 → EUV'],
    ['アライメント・ステージ', '露光の前に、下の層をどう測って合わせるか'],
    ['補正モデル・制御', 'ずれをどんな式で表し、どこで・いつ直すか'],
    ['計測', 'ずれをどう測るか：目盛り → 専用ターゲット → デバイス'],
    ['要求・課題', '何nmが求められ、何が難しくなったか'],
  ];
  lanes.forEach(([name, desc], i) => {
    const y = 2.08 + i * 0.64;
    addChip(slide, name, rx, y, 2.05, 0.46, { fill: C.primary, fontSize: 11.5 });
    addText(slide, desc, rx + 2.2, y, rw - 2.2, 0.46, { fontSize: 12.5, valign: 'middle' });
  });
  addCard(slide, rx, 5.4, rw, 1.35, { fill: C.goldTint });
  addText(slide, '数値の読み方', rx + 0.22, 5.5, rw - 0.4, 0.32, { fontSize: 13, bold: true, color: C.gold });
  addText(slide, '装置の仕様値（号機間の重ね合わせ MMO など）と、製品上の要求値（ウェハ上の3σ）は定義が異なる。比較は目安として扱い、出典は各スライドの下に示す。', rx + 0.22, 5.85, rw - 0.44, 0.85, { fontSize: 12 });
}

// =====================================================================
// 3. 基本：合わせる・測る・直す
// =====================================================================
{
  const slide = newContentSlide('基本', '重ね合わせ制御とは：「合わせる・測る・直す」のくり返し', [
    '重ね合わせ誤差とは、下の層のパターンに対して、上の層のパターンがどれだけずれているかを表す量で、X方向とY方向の2つの成分を持ちます。',
    'ずれはウェハの場所ごとに違うので、たくさんの点で測って、平均とばらつき、特に3σで評価します。ITRSでは、ウェハ上の重ね合わせ値の標準偏差の3倍を指標にしていました。',
    '制御の流れは、露光の前に下の層のマークを測って合わせるアライメント、補正しながらの露光、現像後やエッチング後の計測、ずれを成分に分けるモデル化、そして次のロットやウェハへの補正値の更新、のくり返しです。',
    '露光前に測って直すのを前送り（フィードフォワード）、露光後に測って次に反映するのをフィードバックと呼びます。',
    'この60年の進化は、合わせる、測る、直すの3つがそれぞれ細かく、速く、広くなってきた歴史だと言えます。',
  ]);
  // 左：ずれの模式図
  const px = MARGIN_X;
  const py = 1.6;
  addCard(slide, px, py, 4.25, 3.2, { fill: C.gray });
  addText(slide, '重ね合わせ誤差のイメージ', px + 0.2, py + 0.12, 3.8, 0.3, { fontSize: 12, bold: true, color: C.muted });
  // 下の層（配線）
  [0.55, 1.35, 2.15, 2.95].forEach((dx) => {
    slide.addShape(pres.shapes.RECTANGLE, { x: px + dx, y: py + 0.62, w: 0.42, h: 2.1, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
  });
  // 上の層（ビア）：本来の位置（点線）と実際の位置
  [0.55, 1.35, 2.15, 2.95].forEach((dx, i) => {
    const yy = py + 0.95 + (i % 2) * 0.9;
    slide.addShape(pres.shapes.RECTANGLE, { x: px + dx + 0.03, y: yy, w: 0.36, h: 0.36, line: { color: C.muted, width: 0.75, dashType: 'dash' } });
    slide.addShape(pres.shapes.RECTANGLE, { x: px + dx + 0.03 + 0.16, y: yy - 0.1, w: 0.36, h: 0.36, fill: { color: FUTURE.color, transparency: 20 }, line: { color: FUTURE.color, width: 0.75 } });
  });
  addLine(slide, px + 3.16, py + 2.03, px + 3.34, py + 1.93, { color: C.gold, width: 2.25, arrow: true });
  addText(slide, 'ずれ（dx, dy）', px + 2.55, py + 2.4, 1.6, 0.3, { fontSize: 11.5, bold: true, color: C.gold, align: 'right' });
  addText(slide, '灰色：下の層　紫：上の層　点線：本来の位置', px + 0.2, py + 2.82, 3.9, 0.3, { fontSize: 10.5, color: C.muted });

  addBullets(slide, [
    'X・Yの2成分を持つ「位置ずれ」。ウェハ上のすべての点で決まる',
    '平均とばらつき（3σ）で評価する。ITRSは「ウェハ上の重ね合わせ値の標準偏差の3倍」を指標にした',
    'ずれが大きいと、上下の配線やビアがつながらない・隣とショートするといった不良につながる',
  ], px, 5.0, 4.25, 1.9, { fontSize: 12.5, space: 6 });

  // 右：制御ループ
  const bx = 5.2;
  const bw = 1.72;
  const gap = 0.23;
  const by = 1.62;
  const bh = 1.25;
  const steps = [
    ['① アライメント', '露光前に下の層のマークを測る'],
    ['② 露光', 'ステージ・レチクル・レンズで補正して焼く'],
    ['③ 計測', '現像後（ADI）やエッチング後（AEI）に測る'],
    ['④ モデル化', '線形・高次・ショットごとの成分に分ける'],
  ];
  steps.forEach(([head, body], i) => {
    const x = bx + i * (bw + gap);
    addCard(slide, x, by, bw, bh, { fill: C.tint, line: C.primaryLight });
    addText(slide, head, x + 0.12, by + 0.1, bw - 0.24, 0.3, { fontSize: 13, bold: true, color: C.primary });
    addText(slide, body, x + 0.12, by + 0.44, bw - 0.24, bh - 0.5, { fontSize: 11.5 });
    if (i < steps.length - 1) addLine(slide, x + bw + 0.02, by + bh / 2, x + bw + gap - 0.02, by + bh / 2, { color: C.primary, width: 1.75, arrow: true });
  });
  // ⑤ 更新（フィードバック）
  const fx = 8.55;
  const fw = 2.7;
  const fy = 3.35;
  const fh = 0.95;
  addCard(slide, fx, fy, fw, fh, { fill: C.goldTint, line: 'E3C98F' });
  addText(slide, '⑤ 補正値の更新', fx + 0.15, fy + 0.08, fw - 0.3, 0.3, { fontSize: 13, bold: true, color: C.gold });
  addText(slide, '次のロット・次のウェハへ（フィードバック）', fx + 0.15, fy + 0.42, fw - 0.3, 0.45, { fontSize: 11.5 });
  const step4cx = bx + 3 * (bw + gap) + bw / 2;
  const step2cx = bx + 1 * (bw + gap) + bw / 2;
  addLine(slide, step4cx, by + bh, step4cx, fy + fh / 2, { color: C.gold, width: 1.75 });
  addLine(slide, step4cx, fy + fh / 2, fx + fw + 0.02, fy + fh / 2, { color: C.gold, width: 1.75, arrow: true });
  addLine(slide, fx - 0.02, fy + fh / 2, step2cx, fy + fh / 2, { color: C.gold, width: 1.75 });
  addLine(slide, step2cx, fy + fh / 2, step2cx, by + bh + 0.02, { color: C.gold, width: 1.75, arrow: true });
  // 前送り（フィードフォワード）の注記
  addText(slide, '①→② 前送り（フィードフォワード）：露光前に測った値でその場で直す', bx, fy + 1.05, 7.5, 0.3, { fontSize: 11.5, color: C.primary, bold: true });

  // 下：3つの進化の軸
  const axes = [
    ['「合わせる」の進化', '目視 → 統計的アライメント（一部のショット）→ 全ウェハの高密度計測'],
    ['「測る」の進化', '目盛りを読む → 専用ターゲット → デバイスそのもの・貼り合わせ後'],
    ['「直す」の進化', '位置・回転 → 高次・ショットごと → 露光機の外（成膜・貼り合わせ・設計）'],
  ];
  const aw = (RIGHT_EDGE - bx - 0.3) / 3;
  axes.forEach(([head, body], i) => {
    const x = bx + i * (aw + 0.15);
    addCard(slide, x, 4.95, aw, 1.85, { fill: C.gray });
    addText(slide, head, x + 0.18, 5.07, aw - 0.36, 0.34, { fontSize: 13.5, bold: true, color: C.primary });
    addText(slide, body, x + 0.18, 5.47, aw - 0.36, 1.25, { fontSize: 12 });
  });
  addSource(slide, '出典：ITRS 2007 Lithography（重ね合わせの定義）。図は説明のための模式図。');
}

// =====================================================================
// 4. 全体ロードマップ
// =====================================================================
{
  const slide = newContentSlide('全体像｜1960〜2035年', '全体ロードマップ：「目で合わせる」から「工程をまたいで直す」へ', [
    'このスライドが全体のロードマップです。横軸が時代、縦に5つの流れを並べています。',
    '1960年代から70年代は、人が顕微鏡で見てマスクとウェハを合わせる時代でした。1978年にステッパーが登場し、ショットごとに縮小して焼くようになると、統計的なアライメントであるEGAが生まれます。',
    '1990年代にはスキャナーと2ステージが登場し、露光と計測を並行できるようになり、ロットをまたいで補正するAPCが広がりました。',
    '2000年代後半は液浸と多重パターニングで要求が急に厳しくなり、高次補正やショットごとの補正、回折型の計測が導入されました。',
    '2017年以降はEUVの量産期で、装置の号機間性能は1nmを切り、製品上の重ね合わせやNZO、EPEといった新しい指標で管理する時代になっています。',
    'これからは、High-NAの継ぎ合わせ、裏面配線、貼り合わせといったウェハの変形との戦いになり、露光機の外まで含めた協調制御が鍵になると整理しています。右端の列は各社の計画と予測を含みます。',
  ]);
  const labelW = 1.2;
  const gridX = MARGIN_X + labelW + 0.08;
  const colW = (RIGHT_EDGE - gridX) / ERAS.length;
  const headY = 1.42;
  const headH = 0.66;
  const laneY0 = 2.15;
  const laneH = 0.93;
  ERAS.forEach((era, i) => {
    const x = gridX + i * colW;
    slide.addShape(pres.shapes.PENTAGON, { x: x + 0.02, y: headY, w: colW - 0.02, h: headH, fill: { color: era.color }, line: { color: era.color, width: 0.5 } });
    addText(slide, [
      { text: `${era === FUTURE ? '展望' : era.no} ${era.years}`, bold: true, fontSize: 10.5, breakLine: true },
      { text: era.name, fontSize: 9 },
    ], x + 0.1, headY + 0.03, colW - 0.32, headH - 0.06, { color: C.white, valign: 'middle' });
  });
  const lanes = [
    ['露光装置', [
      '密着・近接露光（1965〜）\n等倍投影 Micralign（1973）',
      'ステッパー DSW 4800（1978、10倍縮小）\nNSR-1010G（1980、5倍）',
      'スキャナー Micrascan（1990）\n2ステージ TWINSCAN（2001出荷）',
      'ArF液浸（2004〜）、NA 1.35へ\nエンコーダ式ステージ（2008〜）',
      'EUV：NXE:3400B（2017）\n→ NXE:3800E（2024）\nナノインプリント（2023）',
      'High-NA EUVの量産適用\nNXE:4000F（計画）\nHyper-NAは2030年以降の選択肢',
    ]],
    ['アライメント\nステージ', [
      '顕微鏡で見て手で合わせる\n自動アライナー（1970）',
      'レーザー干渉計ステージ\nEGA：一部のショットから最小二乗で推定（1988）',
      '露光中に別のステージで計測（2ステージ）',
      '高次のウェハアライメント（HOWA）\nエンコーダでステージ位置を測る',
      '多波長（最大12色）\n露光前に全ウェハを計測（2018〜）',
      '貼り合わせ歪みを測って前送り（2027〜）',
    ]],
    ['補正モデル\n・制御', [
      '位置と回転（ウェハ全体を一括）',
      '線形：ウェハ6項＋ショット6項',
      'ロット間フィードバック（APC）\n号機間のマッチング',
      '高次多項式（HOPC）\nショットごとの補正（CPE）',
      'ウェハごとの前送り\nNZOを含む製品上の制御\nEPE基準の最適化',
      '継ぎ目・貼り合わせを含む補正\n工程をまたぐ協調制御（予測）',
    ]],
    ['計測', [
      '光学バーニア（目盛りを読む）',
      'バーニアでレンズの像位置ずれを評価（1982）',
      '光学像のBox-in-Box（長く標準）',
      '格子型 AIM（2003）\n回折型 DBO（2008〜）',
      'デバイス内・エッチング後の計測\n電子線（SEM）を基準に',
      'サブnmの確度とNZO安定性\n赤外で貼り合わせ後を計測\n仮想計測（VM）',
    ]],
    ['要求・課題', [
      'マスク接触による欠陥\n→ 投影方式へ',
      'ショットに分けて焼く\n→ レンズ歪み・ショット配列の管理',
      '号機ごとのくせ（Mix & Match）',
      '多重パターニングで予算が急減\n45nm世代10〜15nm → 32nm世代で5nm未満',
      'EUVとDUVの混用\n要求 3.6nm（2018）→ 2.4nm（2022）',
      '1.5〜1.6nm（2030年代、IRDS）\n「1nmを大きく下回る」制御（KLA・imec）',
    ]],
  ];
  lanes.forEach(([label, cells], r) => {
    const y = laneY0 + r * laneH;
    addCard(slide, MARGIN_X, y + 0.03, labelW, laneH - 0.08, { fill: C.gray, radius: 0.06 });
    addText(slide, label, MARGIN_X + 0.08, y + 0.03, labelW - 0.16, laneH - 0.08, { fontSize: 11, bold: true, align: 'center', valign: 'middle', color: C.ink });
    cells.forEach((text, i) => {
      const x = gridX + i * colW;
      addCard(slide, x + 0.03, y + 0.03, colW - 0.06, laneH - 0.08, { fill: ERAS[i].tint, radius: 0.05 });
      addText(slide, text, x + 0.1, y + 0.08, colW - 0.2, laneH - 0.16, { fontSize: 9.5, valign: 'middle', lineSpacingMultiple: 1.0 });
    });
  });
  // 未来の列は計画・予測を含むことを点線で示す
  const fx = gridX + 5 * colW;
  addFrame(slide, fx - 0.005, laneY0 - 0.02, colW + 0.01, laneH * lanes.length + 0.02, { color: FUTURE.color, width: 1.25, dash: 'dash', radius: 0.05 });
  addSource(slide, '出典：Mack (2005)、Kato (2007)、MacMillen & Ryden (1982)、Slonaker et al. (1988)、Adel et al. (2007)、ITRS 2007、IRDS 2021、ASML・Nikon・Canon・KLAの公表資料、Katz et al. (2026) ほか。右端の列（点線）は計画・予測を含む。', { y: 6.84 });
}

// =====================================================================
// 5. 要求値と装置性能の推移（対数目盛りのグラフを図形で描く）
// =====================================================================
{
  const slide = newContentSlide('数値の推移｜要求値と装置性能', '要求値と装置性能：15年で要求は約1/5、装置の号機間値は1nmを切った', [
    'このグラフは、縦軸を対数目盛りにして、製品上で求められる重ね合わせの値と、装置の重ね合わせ性能の推移を並べたものです。',
    '点線は、2007年のITRSが示したDRAMの要求値の見通しで、2007年の13nmから2022年の2.3nmまで下がる予測でした。',
    '実線は、2021年のIRDSが示した最小要求値で、2018年の3.6nmから2034年の1.5nmへ下がります。',
    '記号は装置の仕様や実績で、ASMLのEUVの号機間重ね合わせは2017年の2.0nmから2024年の0.9nmへ、High-NAのEXE:5200Bでは0.8nm未満になっています。',
    'ただし、装置の値は決められた条件での試験値で、製品上の値とは違います。たとえばNXE:3800Eは号機間0.9nmに対して製品上1.5nmと公表されています。比べるときは定義に注意してください。',
  ]);
  const plot = { x: 1.3, y: 1.72, w: 6.95, h: 4.5 };
  const xMin = 2005;
  const xMax = 2035;
  const yMin = 0.5;
  const yMax = 20;
  const toX = (year) => plot.x + ((year - xMin) / (xMax - xMin)) * plot.w;
  const toY = (v) => plot.y + (plot.h * Math.log(yMax / v)) / Math.log(yMax / yMin);

  slide.addShape(pres.shapes.RECTANGLE, { ...plot, fill: { color: 'FBFBFD' }, line: { color: C.line, width: 0.75 } });
  [0.5, 1, 2, 5, 10, 20].forEach((v) => {
    addLine(slide, plot.x, toY(v), plot.x + plot.w, toY(v), { color: C.grid, width: 0.75 });
    addText(slide, String(v), plot.x - 0.5, toY(v) - 0.13, 0.42, 0.26, { fontSize: 10, color: C.muted, align: 'right', valign: 'middle' });
  });
  [2010, 2015, 2020, 2025, 2030].forEach((yr) => addLine(slide, toX(yr), plot.y, toX(yr), plot.y + plot.h, { color: C.grid, width: 0.75 }));
  [2005, 2010, 2015, 2020, 2025, 2030, 2035].forEach((yr) => {
    addText(slide, String(yr), toX(yr) - 0.3, plot.y + plot.h + 0.06, 0.6, 0.26, { fontSize: 10, color: C.muted, align: 'center' });
  });
  addText(slide, '重ね合わせ（nm、対数目盛り）', MARGIN_X, 1.4, 3.2, 0.28, { fontSize: 10.5, color: C.muted, bold: true });
  addText(slide, '年', plot.x + plot.w - 0.35, plot.y + plot.h + 0.3, 0.4, 0.26, { fontSize: 10, color: C.muted, align: 'right' });

  // 要求値の折れ線
  const polyline = (pairs, color, width, dash) => {
    const points = pairs.map(([yr, v]) => ({ x: toX(yr) - plot.x, y: toY(v) - plot.y }));
    const line = { color, width };
    if (dash) line.dashType = dash;
    slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { ...plot, points, line });
    pairs.forEach(([yr, v]) => {
      const d = 0.085;
      slide.addShape(pres.shapes.OVAL, { x: toX(yr) - d / 2, y: toY(v) - d / 2, w: d, h: d, fill: { color }, line: { color, width: 0.5 } });
    });
  };
  const itrs2007 = [[2007, 13], [2008, 11.3], [2009, 10.0], [2010, 9.0], [2011, 8.0], [2012, 7.1], [2013, 6.4], [2014, 5.7], [2015, 5.1], [2016, 4.5], [2017, 4.0], [2018, 3.6], [2019, 3.2], [2020, 2.8], [2021, 2.5], [2022, 2.3]];
  const irds2021 = [[2018, 3.6], [2020, 3.0], [2022, 2.4], [2025, 2.0], [2028, 1.6], [2031, 1.6], [2034, 1.5]];
  polyline(itrs2007, C.gold, 2, 'dash');
  polyline(irds2021, C.alert, 2.5);
  addText(slide, 'ITRS 2007の見通し（DRAM）', toX(2008.2), toY(13) - 0.12, 2.6, 0.26, { fontSize: 10, bold: true, color: C.gold });
  addText(slide, 'IRDS 2021の最小要求', toX(2027.2), toY(1.6) - 0.36, 2.0, 0.26, { fontSize: 10, bold: true, color: C.alert });

  // 装置の点（ASML EUV：四角、ASML ArF液浸：ひし形、Nikon ArF液浸：三角）
  const MARK = {
    euv: { shape: pres.shapes.RECTANGLE, color: E5.color, size: 0.15 },
    duv: { shape: pres.shapes.DIAMOND, color: E4.color, size: 0.2 },
    nikon: { shape: pres.shapes.ISOSCELES_TRIANGLE, color: E3.color, size: 0.19 },
  };
  const tools = [
    { kind: 'duv', year: 2009, v: 2.5, label: 'NXT:1950i 2.5', lx: 2009.45, lv: 2.5 },
    { kind: 'nikon', year: 2009, v: 2.0, label: 'NSR-S620D <2', lx: 2009.45, lv: 2.0 },
    { kind: 'nikon', year: 2015, v: 2.3, label: 'NSR-S630D <2.3', lx: 2015.0, lv: 3.15, anchor: 'center' },
    { kind: 'duv', year: 2015, v: 2.0, label: 'NXT:1980Di 約2', lx: 2015.0, lv: 1.55, anchor: 'center' },
    { kind: 'euv', year: 2017, v: 2.0, label: 'NXE:3400B 2.0', lx: 2017.6, lv: 1.45, leader: true },
    { kind: 'euv', year: 2021, v: 1.1, label: 'NXE:3600D ≤1.1', lx: 2016.2, lv: 0.9, anchor: 'right', leader: true },
    { kind: 'duv', year: 2022, v: 1.3, label: 'NXT:2100i 1.3', lx: 2026.3, lv: 1.24, leader: true },
    { kind: 'euv', year: 2023, v: 1.1, label: 'EXE:5000 1.1', lx: 2026.3, lv: 1.03, leader: true },
    { kind: 'nikon', year: 2023, v: 2.1, label: 'NSR-S636E ≤2.1', lx: 2024.0, lv: 2.75, leader: true },
    { kind: 'euv', year: 2024, v: 0.9, label: 'NXE:3800E ≤0.9', lx: 2026.3, lv: 0.84, leader: true },
    { kind: 'euv', year: 2025, v: 0.8, label: 'EXE:5200B <0.8', lx: 2026.3, lv: 0.69, leader: true },
  ];
  tools.forEach((t) => {
    const m = MARK[t.kind];
    const cx = toX(t.year);
    const cy = toY(t.v);
    const lx = toX(t.lx);
    const ly = toY(t.lv);
    const labelW = 1.35;
    if (t.leader) {
      const ex = t.anchor === 'right' ? lx + 0.02 : lx - 0.02;
      addLine(slide, cx, cy, ex, ly, { color: C.neutral, width: 0.6 });
    }
    slide.addShape(m.shape, { x: cx - m.size / 2, y: cy - m.size / 2, w: m.size, h: m.size, fill: { color: m.color }, line: { color: C.white, width: 0.75 } });
    let tx = lx;
    if (t.anchor === 'right') tx = lx - labelW;
    if (t.anchor === 'center') tx = lx - labelW / 2;
    addText(slide, t.label, tx, ly - 0.11, labelW, 0.22, { fontSize: 9, color: C.ink, align: t.anchor || 'left', valign: 'middle' });
  });

  // 凡例
  const lgx = toX(2019.3);
  const lgy = plot.y + 0.14;
  addCard(slide, lgx, lgy, toX(2034.6) - lgx, 1.5, { fill: C.white, line: C.line, radius: 0.05 });
  const legend = [
    ['line-dash', C.gold, '要求：ITRS 2007（DRAM、当時の見通し）'],
    ['line', C.alert, '要求：IRDS 2021（全デバイスの最小要求）'],
    ['euv', E5.color, '装置：ASML EUV（号機間 MMO）'],
    ['duv', E4.color, '装置：ASML ArF液浸'],
    ['nikon', E3.color, '装置：Nikon ArF液浸'],
  ];
  legend.forEach(([kind, color, text], i) => {
    const y = lgy + 0.17 + i * 0.26;
    const x = lgx + 0.15;
    if (kind === 'line' || kind === 'line-dash') {
      addLine(slide, x, y, x + 0.36, y, { color, width: 2.25, dash: kind === 'line-dash' ? 'dash' : undefined });
    } else {
      const m = MARK[kind];
      slide.addShape(m.shape, { x: x + 0.18 - m.size / 2, y: y - m.size / 2, w: m.size, h: m.size, fill: { color }, line: { color: C.white, width: 0.5 } });
    }
    addText(slide, text, x + 0.48, y - 0.12, 3.0, 0.24, { fontSize: 9.5, valign: 'middle' });
  });

  // 右：読み取りのポイント
  const rx = 8.75;
  const rw = RIGHT_EDGE - rx;
  const cards = [
    { fill: C.goldTint, color: C.gold, head: '製品上の要求（3σ）', big: '13 → 2.4 nm', body: '2007年（65nm世代DRAM、ITRS 2007）から2022年（IRDS 2021）へ。15年で約1/5' },
    { fill: E5.tint, color: E5.color, head: 'EUV装置の号機間重ね合わせ', big: '2.0 → 0.9 nm', body: 'NXE:3400B（2017）→ NXE:3800E（2024）。High-NAのEXE:5200Bは0.8nm未満' },
    { fill: C.alertTint, color: C.alert, head: '定義の違いに注意', big: '0.9 と 1.5 nm', body: '同じNXE:3800Eでも号機間は0.9nm以下、製品上は1.5nm以下（ASML 2024）' },
  ];
  cards.forEach((c, i) => {
    const y = 1.62 + i * 1.66;
    addCard(slide, rx, y, rw, 1.5, { fill: c.fill });
    addText(slide, c.head, rx + 0.2, y + 0.1, rw - 0.4, 0.28, { fontSize: 12, bold: true, color: c.color });
    addText(slide, c.big, rx + 0.2, y + 0.38, rw - 0.4, 0.5, { fontSize: 24, bold: true, color: c.color, valign: 'middle' });
    addText(slide, c.body, rx + 0.2, y + 0.9, rw - 0.4, 0.56, { fontSize: 11 });
  });
  addSource(slide, '出典：ITRS 2007 Lithography（Table LITH3a/b）、IRDS 2021 Lithography（Table LITH-1）、ASML（2008年・2015年の発表、NXE:3400B製品ページ、2024 Investor Day）、Bits&Chips (2025)、Kohno et al. (2010)、Matsuyama (2015)、Nikon NSR-S636E製品ページ。装置値は各社の公表値（定義は各社資料による）、年は発表・初出荷の年。', { y: 6.72, h: 0.5, fontSize: 8.5 });
}

// =====================================================================
// 6. 時代① 1960〜1977年
// =====================================================================
{
  const slide = newContentSlide(`時代① ${E1.years}`, '目と手で合わせた時代：密着露光から等倍投影へ', [
    '最初の時代は、1960年代から70年代です。この頃は、マスクとウェハを重ねるか少し離して置き、ウェハ全体を一度に露光していました。',
    '1965年にKulicke & Soffaが最初の市販の密着露光装置を出し、1970年にはComputervisionと組んで初めての自動アライナーを開発しました。',
    '密着露光はマスクを傷めたりウェハを汚したりする問題があり、1973年には少し離して露光する近接露光や、Perkin-ElmerのMicralignのような等倍の投影露光が登場します。Micralignは2000台以上売れました。',
    '重ね合わせの面では、ウェハ全体を一度に露光するため、合わせられるのは主に全体の位置と回転でした。場所ごとのずれを直す手段はほとんどなかった時代です。',
  ], { era: E1, eraIndex: 0 });
  const items = [
    ['1961', 'マスク製作用のステップ＆リピート装置（フォトリピーター）をGCA/David W. Mannが販売'],
    ['1965', 'Kulicke & Soffaが初めての市販の密着露光装置（コンタクトアライナー）を発売'],
    ['1970', 'K&SとComputervisionが初めての自動アライナーを開発'],
    ['1973', '近接露光（プロキシミティ）機能つきのアライナー（Kasper）と、等倍投影のMicralign（Perkin-Elmer、NA 0.167）が登場。Micralignは2000台以上販売'],
  ];
  items.forEach(([year, text], i) => addTimelineItem(slide, MARGIN_X, 1.65 + i * 0.86, 6.1, year, text, E1, { fontSize: 13 }));

  // 右：露光方式の模式図
  const panel = (x, title, sub) => {
    addCard(slide, x, 1.6, 2.72, 3.45, { fill: C.gray });
    addText(slide, title, x + 0.15, 1.7, 2.42, 0.32, { fontSize: 13, bold: true, color: E1.color, align: 'center' });
    addText(slide, sub, x + 0.15, 4.25, 2.42, 0.72, { fontSize: 11, align: 'center' });
  };
  const ax = 7.05;
  panel(ax, '密着・近接露光', 'マスクとウェハを重ねて（または少し離して）一括で露光');
  // 光
  [0.6, 1.1, 1.6, 2.1].forEach((dx) => addLine(slide, ax + dx, 2.15, ax + dx, 2.65, { color: C.gold, width: 1.5, arrow: true }));
  slide.addShape(pres.shapes.RECTANGLE, { x: ax + 0.35, y: 2.75, w: 2.0, h: 0.16, fill: { color: '6B7089' }, line: { color: '6B7089', width: 0.5 } });
  addText(slide, 'マスク', ax + 0.35, 2.93, 2.0, 0.24, { fontSize: 10, color: C.muted, align: 'center' });
  slide.addShape(pres.shapes.RECTANGLE, { x: ax + 0.35, y: 3.35, w: 2.0, h: 0.2, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
  addText(slide, 'ウェハ（全体を一度に露光）', ax + 0.1, 3.6, 2.5, 0.26, { fontSize: 10, color: C.muted, align: 'center' });
  addText(slide, '人が顕微鏡でマークを見て位置と回転を合わせる', ax + 0.15, 3.86, 2.42, 0.4, { fontSize: 10, color: E1.color, align: 'center' });

  const bxp = 10.0;
  panel(bxp, '等倍投影（Micralign）', 'マスクを離し、鏡の光学系で等倍に投影して走査');
  slide.addShape(pres.shapes.RECTANGLE, { x: bxp + 0.35, y: 2.15, w: 2.0, h: 0.16, fill: { color: '6B7089' }, line: { color: '6B7089', width: 0.5 } });
  addText(slide, 'マスク', bxp + 0.35, 2.33, 2.0, 0.22, { fontSize: 10, color: C.muted, align: 'center' });
  addCard(slide, bxp + 0.6, 2.62, 1.5, 0.5, { fill: E1.tint, line: E1.color, radius: 0.2 });
  addText(slide, '反射光学系（等倍）', bxp + 0.6, 2.62, 1.5, 0.5, { fontSize: 10, align: 'center', valign: 'middle' });
  slide.addShape(pres.shapes.RECTANGLE, { x: bxp + 0.35, y: 3.35, w: 2.0, h: 0.2, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
  addLine(slide, bxp + 0.5, 3.72, bxp + 2.2, 3.72, { color: E1.color, width: 1.5, arrow: true });
  addText(slide, '走査して全面を露光', bxp + 0.35, 3.8, 2.0, 0.26, { fontSize: 10, color: E1.color, align: 'center' });

  // 下：重ね合わせへの影響
  addCard(slide, MARGIN_X, 5.3, CONTENT_W, 1.5, { fill: E1.tint });
  addText(slide, '重ね合わせへの影響', MARGIN_X + 0.25, 5.4, 4, 0.32, { fontSize: 14, bold: true, color: E1.color });
  addBullets(slide, [
    'ウェハ全体を一度に露光するので、合わせられるのは主に全体の位置と回転。場所ごとのずれを直す手段はほとんどなかった',
    'マスクとウェハの接触はマスクを傷め、ウェハを汚す原因に（Kato 2007）→ マスクを離して露光する近接・投影方式へ',
  ], MARGIN_X + 0.25, 5.78, CONTENT_W - 0.5, 1.0, { fontSize: 12.5, space: 4 });
  addSource(slide, '出典：Kato (2007) Chronology of Lithography Milestones、Mack (2005) Milestones in Optical Lithography Tool Suppliers。図は模式図。');
}

// =====================================================================
// 7. 時代② 1978〜1989年
// =====================================================================
{
  const slide = newContentSlide(`時代② ${E2.years}`, 'ステッパーと統計的アライメント：ショットごとに縮小して焼く', [
    '2つ目の時代は、1978年のステッパーの登場から始まります。GCAのDSW 4800は、10倍の縮小レンズでショットごとに焼く、最初に成功したステッパーでした。',
    'ステッパーは投影アライナーより欠陥が少なく、重ね合わせ性能も大きく向上し、256K DRAMの世代で主流になりました。',
    '1980年にはニコンが日本初の市販ステッパーNSR-1010Gを出し、1984年には、レーザー干渉計ステージと自動アライメントによる重ね合わせ精度の高さなどでGCAに並びました。1985年に最初の製品を出したASMLも、創業時の最大の強みはアライメント系でした。',
    'この時代の重要な発明が、ニコンのEGAです。すべてのショットを測るのではなく、一部のサンプルショットのマークを測り、最小二乗法でウェハ全体のショット配列を表す6つのパラメータを推定します。',
    'この平行移動、倍率、回転の線形モデルは、今の補正モデルでも1次の項として残っています。',
  ], { era: E2, eraIndex: 1 });
  const items = [
    ['1978', 'GCA DSW 4800：最初に成功したステッパー（g線・10倍縮小・NA 0.28・10mm角）'],
    ['1980', 'Nikon NSR-1010G：日本初の市販ステッパー（5倍縮小、解像度1µm）'],
    ['1982', 'レンズの像位置ずれを、平行移動・回転・倍率・台形・歪曲で表すモデル（バーニアで測定）'],
    ['1984', 'Nikonがレーザー干渉計ステージと自動アライメントで重ね合わせ精度を高め、GCAに並ぶ'],
    ['1985', 'ASML PAS 2000：創業時の最大の技術的な強みはアライメント系'],
  ];
  items.forEach(([year, text], i) => addTimelineItem(slide, MARGIN_X, 1.62 + i * 0.73, 6.05, year, text, E2, { fontSize: 12.5, chipW: 1.1, h: 0.7 }));

  // 右：EGAの模式図
  const cx = 8.45;
  const cy = 3.35;
  const r = 1.42;
  addText(slide, 'EGA（Enhanced Global Alignment）の考え方', 6.95, 1.55, 5.8, 0.3, { fontSize: 13, bold: true, color: E2.color });
  slide.addShape(pres.shapes.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { color: C.gray }, line: { color: C.neutral, width: 1.25 } });
  const shot = 0.33;
  const shots = [];
  for (let i = -5; i <= 4; i += 1) {
    for (let j = -5; j <= 4; j += 1) {
      const sx = cx + i * shot;
      const sy = cy + j * shot;
      const corners = [[sx, sy], [sx + shot, sy], [sx, sy + shot], [sx + shot, sy + shot]];
      if (corners.every(([qx, qy]) => Math.hypot(qx - cx, qy - cy) < r - 0.04)) shots.push({ sx, sy, mx: sx + shot / 2, my: sy + shot / 2 });
    }
  }
  const sampleTargets = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62];
  });
  const sampleSet = new Set(sampleTargets.map(([tx, ty]) => {
    let best = 0;
    shots.forEach((s, k) => {
      if (Math.hypot(s.mx - tx, s.my - ty) < Math.hypot(shots[best].mx - tx, shots[best].my - ty)) best = k;
    });
    return best;
  }));
  shots.forEach((s, k) => {
    const isSample = sampleSet.has(k);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: s.sx + 0.015, y: s.sy + 0.015, w: shot - 0.03, h: shot - 0.03,
      fill: { color: isSample ? E2.color : C.white }, line: { color: isSample ? E2.color : C.line, width: 0.5 },
    });
  });
  addText(slide, '■ 例：8つのサンプルショットだけ測る', 6.95, 4.88, 3.15, 0.3, { fontSize: 10.5, color: E2.color });

  // 右端：線形モデルの式
  const fx = 10.2;
  const fw = RIGHT_EDGE - fx;
  addCard(slide, fx, 1.95, fw, 3.3, { fill: E2.tint });
  addText(slide, '最小二乗で6つのパラメータを推定', fx + 0.15, 2.05, fw - 0.3, 0.5, { fontSize: 12, bold: true, color: E2.color });
  addText(slide, ['dx = T_{x} + M_{x}·X − R_{x}·Y', { text: '', breakLine: false }], fx + 0.15, 2.6, fw - 0.3, 0.32, { fontSize: 13, bold: true });
  addText(slide, 'dy = T_{y} + M_{y}·Y + R_{y}·X', fx + 0.15, 2.95, fw - 0.3, 0.32, { fontSize: 13, bold: true });
  addBullets(slide, [
    'T：平行移動',
    'M：倍率（伸び縮み）',
    'R：回転（R_{x} ≠ R_{y} は直交度のずれ）',
    'X, Y：ショットの位置',
  ], fx + 0.15, 3.42, fw - 0.3, 1.7, { fontSize: 11, space: 3, indent: 12 });

  addCard(slide, MARGIN_X, 5.4, CONTENT_W, 1.5, { fill: E2.tint });
  addText(slide, '重ね合わせへの影響', MARGIN_X + 0.25, 5.46, 4, 0.32, { fontSize: 14, bold: true, color: E2.color });
  addBullets(slide, [
    'ステッパーは投影アライナーより欠陥が少なく、重ね合わせ性能も大きく向上。256K DRAM世代で主流になった（Kato 2007）',
    'EGAは一部のショットを測るだけで、全ショットを測る方式に近い精度を、一括アライメントに近い速さで実現した（Slonaker et al. 1988）',
    'ショットの配列やレンズの歪みを「式」で表して管理する時代に。この線形モデルは今の補正モデルの1次の項として残っている',
  ], MARGIN_X + 0.25, 5.8, CONTENT_W - 0.5, 1.08, { fontSize: 12, space: 2 });
  addSource(slide, '出典：Mack (2005)、Kato (2007)、MacMillen & Ryden (1982) Proc. SPIE 334、Slonaker et al. (1988) Proc. SPIE 922、US 4,780,617・US 5,493,402 A（Nikon）。式の記号は本資料での表記。');
}

// =====================================================================
// 8. 時代③ 1990〜2005年
// =====================================================================
{
  const slide = newContentSlide(`時代③ ${E3.years}`, 'スキャナー・2ステージ・APC：測る時間を生み、ロットをまたいで直す', [
    '3つ目の時代は、1990年から2005年ごろです。1990年にSVGLがステップ＆スキャン方式のMicrascanを出し、1995年から97年にかけてニコン、ASML、キヤノンもスキャナーを出しました。',
    '2000年にASMLが発表したTWINSCANは、ウェハステージを2つ持ち、片方で露光している間に、もう片方でアライメントと面の高さの計測を行います。これで、スループットを落とさずに計測点を増やせるようになりました。',
    '制御の面では、ウェハ6項とショット6項の線形モデルで、露光機のステージとレチクルの自由度を使って補正するのが標準でした。',
    'さらに、ロットごとの計測結果を重み付き移動平均などでならして次のロットに反映する、APCと呼ばれるフィードバック制御が広がりました。',
    '一方で、違う号機で露光した層どうしを重ねるミックス・アンド・マッチでは、号機ごとのくせが大きな誤差要因になりました。',
  ], { era: E3, eraIndex: 2 });
  const items = [
    ['1990', 'SVGL Micrascan：業界初のステップ＆スキャン（スキャナー）'],
    ['1995〜97', 'Nikon NSR-S201A（1995）、ASML PAS 5500/500・Canon FPA-4000ES1（1997）とスキャナーが続く'],
    ['2000', 'ASML TWINSCAN：2つのウェハステージ。片方で露光中に、もう片方でアライメントと面形状を計測。初号機は2001年にTSMCへ'],
    ['標準', '線形モデル（ウェハ6項＋ショット6項）を、露光機のステージとレチクルの自由度で直す'],
    ['APC', 'ロットごとの計測結果を、重み付き移動平均などでならして次のロットに反映'],
  ];
  items.forEach(([year, text], i) => addTimelineItem(slide, MARGIN_X, 1.62 + i * 0.74, 6.1, year, text, E3, { fontSize: 12.5, chipW: 1.1, h: 0.72 }));

  // 右上：2ステージ
  const lx = 6.95;
  addText(slide, '2ステージ：露光と計測を並行する', lx, 1.55, 5.8, 0.3, { fontSize: 13, bold: true, color: E3.color });
  const stage = (x, title, body, fill) => {
    addCard(slide, x, 1.95, 2.3, 2.05, { fill, line: E3.color });
    addText(slide, title, x + 0.12, 2.02, 2.06, 0.3, { fontSize: 12.5, bold: true, color: E3.color, align: 'center' });
    slide.addShape(pres.shapes.OVAL, { x: x + 0.72, y: 2.36, w: 0.86, h: 0.86, fill: { color: C.white }, line: { color: C.neutral, width: 1 } });
    addText(slide, body, x + 0.12, 3.28, 2.06, 0.66, { fontSize: 10.5, align: 'center' });
  };
  stage(lx, '露光側', 'ウェハAを、補正値を使って露光', E3.tint);
  stage(10.43, '計測側', 'ウェハBのアライメントマークと面の高さを計測', C.gray);
  addLine(slide, 9.35, 2.62, 10.35, 2.62, { color: E3.color, width: 1.75, beginArrow: true, arrow: true });
  addText(slide, '終わったら\nステージごと\n入れ替え', 9.27, 2.75, 1.18, 0.7, { fontSize: 9.5, color: E3.color, align: 'center' });

  // 右下：APCのループ
  addText(slide, 'APC（ロット間フィードバック）', lx, 4.18, 5.8, 0.3, { fontSize: 13, bold: true, color: E3.color });
  const chips = [['ロットN', '露光・計測'], ['APC', '重み付き移動平均でならす'], ['ロットN+1', '補正して露光']];
  const cw = 1.72;
  chips.forEach(([head, body], i) => {
    const x = lx + i * (cw + 0.33);
    addCard(slide, x, 4.55, cw, 0.8, { fill: i === 1 ? E3.tint : C.gray, line: i === 1 ? E3.color : undefined });
    addText(slide, [{ text: head, bold: true, breakLine: true, color: E3.color }, { text: body, fontSize: 10.5 }], x + 0.1, 4.58, cw - 0.2, 0.74, { fontSize: 12, align: 'center', valign: 'middle' });
    if (i < chips.length - 1) addLine(slide, x + cw + 0.03, 4.95, x + cw + 0.3, 4.95, { color: E3.color, width: 1.5, arrow: true });
  });

  addCard(slide, MARGIN_X, 5.55, CONTENT_W, 1.25, { fill: E3.tint });
  addText(slide, '重ね合わせへの影響', MARGIN_X + 0.25, 5.63, 4, 0.32, { fontSize: 14, bold: true, color: E3.color });
  addBullets(slide, [
    '計測に使える時間が増え、スループットを落とさずにアライメントの点数を増やせるようになった',
    '違う号機で重ねるMix & Matchでは、号機ごとのステージ格子やショット内の歪みの違いが大きな誤差要因に（Adel et al. 2007）',
  ], MARGIN_X + 0.25, 6.0, CONTENT_W - 0.5, 0.8, { fontSize: 12.5, space: 3 });
  addSource(slide, '出典：Mack (2005)、Kato (2007)、ASML (2021) TWINSCAN: 20 years of lithography innovation、Adel et al. (2007) Proc. SPIE 6827、Ju et al. (2016) Proc. SPIE 9778（APCの説明）。');
}

// =====================================================================
// 9. 時代④ 2006〜2016年
// =====================================================================
{
  const slide = newContentSlide(`時代④ ${E4.years}`, '液浸・多重パターニングと高次補正：線形モデルの限界を超える', [
    '4つ目の時代は2006年から2016年ごろで、ArF液浸と多重パターニングの時代です。',
    'KLAの2007年の論文によると、45nmハーフピッチ世代の重ね合わせ予算は10〜15nmでしたが、32nm世代でダブルパターニングを使うと5nmを下回るとされました。1つの層を2回の露光で作るので、2回の間のずれがそのまま線幅の誤差になるためです。',
    'この要求に応えるため、ウェハ全体やショット内の高次の多項式補正、そしてショットごとに補正値を変えるCPEが導入されました。南亜科技の2009年の報告では、CPEと高次補正で70%改善し、5〜6nmに達しています。',
    '装置側では、ステージの位置をエンコーダで測るようになり、ASMLのNXT:1950iは2.5nm、ニコンのNSR-S620Dは2nm未満の重ね合わせを実現しました。',
    '計測では、格子型のAIMターゲットや、回折を使うYieldStarが登場し、小さなターゲットを高密度に測れるようになりました。',
    '2009年にはASMLが、計算リソグラフィ、露光、工程制御をまとめて最適化するホリスティック・リソグラフィを打ち出しています。',
  ], { era: E4, eraIndex: 3 });
  // 左：予算の急減（横棒）
  const lx = MARGIN_X;
  addText(slide, '重ね合わせ予算の目安（3σ）', lx, 1.58, 4.4, 0.3, { fontSize: 13, bold: true, color: E4.color });
  const scale = 0.23;
  const barX = lx + 0.1;
  const rows = [
    { label: '45nm世代（2007年ごろ量産）', from: 10, to: 15, text: '10〜15 nm' },
    { label: '40nm世代（ITRS 2008）', to: 8, text: '8 nm' },
    { label: '32nm世代（ITRS 2008）', to: 6.4, text: '6.4 nm' },
    { label: '32nm世代＋ダブルパターニング', to: 5, text: '5 nm未満', dashed: true },
  ];
  rows.forEach((row, i) => {
    const y = 2.0 + i * 0.78;
    addText(slide, row.label, barX, y, 4.3, 0.26, { fontSize: 11 });
    const solidTo = row.from || row.to;
    if (row.dashed) {
      slide.addShape(pres.shapes.RECTANGLE, { x: barX, y: y + 0.3, w: row.to * scale, h: 0.3, fill: { color: E4.tint }, line: { color: E4.color, width: 1.25, dashType: 'dash' } });
    } else {
      slide.addShape(pres.shapes.RECTANGLE, { x: barX, y: y + 0.3, w: solidTo * scale, h: 0.3, fill: { color: E4.color }, line: { color: E4.color, width: 0.5 } });
      if (row.from) slide.addShape(pres.shapes.RECTANGLE, { x: barX + row.from * scale, y: y + 0.3, w: (row.to - row.from) * scale, h: 0.3, fill: { color: E4.color, transparency: 60 }, line: { color: E4.color, width: 0.5 } });
    }
    addText(slide, row.text, barX + row.to * scale + 0.1, y + 0.28, 1.2, 0.34, { fontSize: 11.5, bold: true, color: E4.color, valign: 'middle' });
  });
  addCard(slide, lx, 5.2, 4.45, 1.6, { fill: E4.tint });
  addText(slide, 'なぜ急に厳しくなったか', lx + 0.2, 5.28, 4.1, 0.3, { fontSize: 13, bold: true, color: E4.color });
  addText(slide, 'ダブルパターニングでは1つの層を2回の露光で作る。2回の間のずれが、そのままスペースの幅の誤差になり、CDの予算に重ね合わせが入り込む（ITRS 2007）。', lx + 0.2, 5.62, 4.1, 1.15, { fontSize: 11.5 });

  // 右：2×2のカード
  const gx = 5.35;
  const gw = (RIGHT_EDGE - gx - 0.2) / 2;
  const gh = 2.55;
  const cards = [
    ['高次・ショットごとの補正', '線形で残る成分を、高次多項式（HOPC・ショット内のiHOPC）とショットごとの補正（CPE）で直す。CPE＋iHOPCで重ね合わせ70%改善、平均＋3σで5〜6nm（Huang et al. 2009）。'],
    ['露光機のソフトでの補正', 'Nikon Overlay Master：グリッド5次・ショット3次まで補正し、1ロットの号機間で2.3nm未満（NSR-S630D、Matsuyama 2015）。'],
    ['ステージをエンコーダで測る', 'NXT:1950i（2008年発表）はエンコーダ格子板でステージ位置制御50%向上、2.5nm。NSR-S620D（2009年出荷）は干渉計＋エンコーダで2nm未満（ASML 2008、Kohno et al. 2010）。'],
    ['計測：格子と回折', '格子型ターゲットのAIM（2003）、回折を使うYieldStar（初号機は2008年に出荷）。2009年、ASMLは計算リソ・露光・工程制御をまとめる「ホリスティック・リソグラフィ」を提唱（EDN 2003、ASML 2010、Maas et al. 2011）。'],
  ];
  cards.forEach(([head, body], k) => {
    const x = gx + (k % 2) * (gw + 0.2);
    const y = 1.6 + Math.floor(k / 2) * (gh + 0.12);
    addCard(slide, x, y, gw, gh, { fill: C.gray });
    addChip(slide, String(k + 1), x + 0.2, y + 0.2, 0.36, 0.36, { fill: E4.color, fontSize: 12, radius: 0.18 });
    addText(slide, head, x + 0.68, y + 0.17, gw - 0.85, 0.42, { fontSize: 14, bold: true, color: E4.color, valign: 'middle' });
    addText(slide, body, x + 0.22, y + 0.72, gw - 0.44, gh - 0.85, { fontSize: 13 });
  });
  addSource(slide, '出典：Adel et al. (2007) Proc. SPIE 6827、Huang et al. (2009) Proc. SPIE 7272（ITRS 2008の値を引用）、ITRS 2007、Matsuyama (2015) Adv. Opt. Techn. 4、ASML (2008・2010・沿革)、Kohno et al. (2010) Proc. SPIE 7640、EDN (2003)、Maas et al. (2011) Proc. SPIE 7985。');
}

// =====================================================================
// 10. 時代⑤ 2017〜2025年（装置）
// =====================================================================
{
  const slide = newContentSlide(`時代⑤ ${E5.years}｜装置`, 'EUV量産期の装置：号機間の重ね合わせは1nmを切った', [
    '5つ目の時代は2017年から2025年で、EUVが量産に使われるようになった時代です。',
    'ASMLのEUV装置の号機間重ね合わせは、2017年のNXE:3400Bの2.0nmから、2021年のNXE:3600Dの1.1nm、2024年のNXE:3800Eの0.9nmへと改善しました。High-NAのEXE:5200Bでは0.8nm未満が仕様で、Intelの受入検査では0.7nmと報じられています。',
    'EUVは一部の層だけに使うため、ArF液浸との混用が前提になります。NXT:1980DiはEUVとの混用を前提に設計され、NXT:2100iではアライメントの色数を4色から12色に増やしました。',
    'ニコンは露光前に全ウェハの格子歪みを測るインラインのアライメント局iASを載せ、キヤノンはナノインプリント装置を製品化しました。',
    '表の右端のように、同じ装置でも号機間の値と製品上の値は違います。これが次のスライドの製品上の重ね合わせの話につながります。',
  ], { era: E5, eraIndex: 4 });
  const header = ['装置', '登場', '号機間', '補足'];
  addText(slide, 'EUV（ASML）', MARGIN_X, 1.55, 6, 0.3, { fontSize: 13, bold: true, color: E5.color });
  addTableBox(slide, tableRows(header, [
    ['NXE:3400B', '2017', '2.0 nm', '同一チャック 1.4 nm'],
    ['NXE:3600D', '2021', '≤1.1 nm', '製品上 ≤1.7 nm'],
    ['EXE:5000（High-NA）', '2023', '1.1 nm', '最初のHigh-NA（開発用）'],
    ['NXE:3800E', '2024', '≤0.9 nm', '製品上 ≤1.5 nm'],
    ['EXE:5200B（High-NA）', '2025', '<0.8 nm', 'Intelの受入検査で0.7 nm'],
  ], { headFill: E5.color, fontSize: 11 }), MARGIN_X, 1.9, 6.25, [2.15, 0.7, 1.0, 2.4], { rowH: 0.42, fontSize: 11 });

  const tx = 7.1;
  addText(slide, 'ArF液浸・ナノインプリント', tx, 1.55, 5.6, 0.3, { fontSize: 13, bold: true, color: E4.color });
  addTableBox(slide, tableRows(header, [
    ['NXT:1980Di', '2015', '約2 nm', 'EUVとの混用を前提に設計'],
    ['NSR-S635E', '2018', '—', '露光前に全ウェハを計測（iAS）'],
    ['NXT:2100i', '2022', '1.3 nm', 'アライメントを4色→12色に'],
    ['NSR-S636E', '2023', '≤2.1 nm', 'iASを強化'],
    ['FPA-1200NZ2C', '2023', '—', 'ナノインプリント、最小線幅14 nm'],
  ], { headFill: E4.color, fontSize: 11 }), tx, 1.9, RIGHT_EDGE - tx, [1.55, 0.65, 0.85, 2.58], { rowH: 0.42, fontSize: 11 });

  addCard(slide, MARGIN_X, 4.7, 7.2, 2.1, { fill: E5.tint });
  addText(slide, '表の読み方', MARGIN_X + 0.22, 4.8, 4, 0.3, { fontSize: 13.5, bold: true, color: E5.color });
  addBullets(slide, [
    '号機間（MMO）は、決められた試験条件で2台の装置を重ねたときの値。製品上（Product overlay）は製品に近い条件の値で、同じNXE:3800Eでも0.9 nmと1.5 nmで違う',
    'EUVは一部の層だけに使うため、ArF液浸との混用（Mix & Match）が前提。装置どうしのくせを合わせる技術が重要になった',
  ], MARGIN_X + 0.22, 5.15, 6.8, 1.6, { fontSize: 12, space: 5 });
  addCard(slide, 8.0, 4.7, RIGHT_EDGE - 8.0, 2.1, { fill: C.gray });
  addText(slide, 'その他の動き', 8.22, 4.8, 4, 0.3, { fontSize: 13.5, bold: true, color: E5.color });
  addBullets(slide, [
    'ナノインプリントは全面ショットで号機間2 nmを実証（部分ショットは課題）（IRDS 2022）',
    'ニコンは2018年からアライメント局の技術を提供（Nikon 2025）',
  ], 8.22, 5.15, RIGHT_EDGE - 8.44, 1.6, { fontSize: 12, space: 5 });
  addSource(slide, '出典：ASML（NXE:3400B製品ページ、Annual Report 2021、2022年第3四半期決算、2024年上半期報告、2024 Investor Day、2015年の発表、NXT:2100i製品ページ、High-NA解説記事 2024）、Bits&Chips (2025)、Nikon（NSR-S635E・NSR-S636E、2025年の発表）、Canon (2023)、IRDS 2022 Lithography。「登場」は発表・初出荷の年。');
}

// =====================================================================
// 11. 時代⑤ 2017〜2025年（指標と計測）
// =====================================================================
{
  const slide = newContentSlide(`時代⑤ ${E5.years}｜指標と計測`, '製品上の重ね合わせを直接管理する：NZO・デバイス内計測・前送り', [
    'EUV量産期のもう1つの大きな変化は、装置の試験値ではなく、製品上の重ね合わせを直接管理するようになったことです。',
    '現像後に専用のターゲットを光学で測る値と、エッチング後にデバイスそのものを電子線などで測る値には、系統的な差が出ます。これをNZO、非ゼロオフセットと呼び、補正値に上乗せして、その安定性を監視します。',
    'SK hynixとASMLの報告では、エッチング後のデバイス内計測で制御することで、DRAM量産でデバイスの重ね合わせが36%改善しました。',
    'また、ウェハの反りや歪みを露光前に測って前送りする方法や、裏面に膜をつけて反りを打ち消す方法など、露光機の外で直す手段も増えました。',
    'さらに、非リソ工程の文脈を機械学習で分析したり、重ね合わせとCDをまとめたEPEで最適化したりする取り組みが始まっています。',
  ], { era: E5, eraIndex: 4 });
  // 左：ADIとAEIの差（NZO）
  const lx = MARGIN_X;
  const lw = 5.3;
  addCard(slide, lx, 1.6, lw, 2.05, { fill: C.gray });
  addChip(slide, '現像後（ADI）', lx + 0.2, 1.75, 1.7, 0.36, { fill: E5.color, fontSize: 11.5 });
  drawTarget(slide, lx + 0.45, 2.35, 0.95, { outer: C.neutral, inner: E5.color, lineWidth: 1.5, innerTransparency: 25 });
  addText(slide, 'スクライブ線上の専用ターゲットを光学で測る。速く、多くの点を測れる', lx + 1.7, 2.3, lw - 1.9, 1.1, { fontSize: 12 });

  addCard(slide, lx, 4.25, lw, 2.05, { fill: C.gray });
  addChip(slide, 'エッチング後（AEI）', lx + 0.2, 4.4, 1.95, 0.36, { fill: E5.color, fontSize: 11.5 });
  // デバイスパターン（配線とビア）
  [0, 0.28, 0.56].forEach((dy) => slide.addShape(pres.shapes.RECTANGLE, { x: lx + 0.4, y: 4.98 + dy, w: 1.05, h: 0.14, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } }));
  [0.5, 0.9].forEach((dx) => slide.addShape(pres.shapes.OVAL, { x: lx + dx, y: 5.22, w: 0.2, h: 0.2, fill: { color: E5.color, transparency: 15 }, line: { color: E5.color, width: 0.5 } }));
  addText(slide, 'デバイスそのものを電子線（SEM）などで測る。実際のずれに近いが、測れる点は少ない', lx + 1.7, 4.95, lw - 1.9, 1.2, { fontSize: 12 });

  addLine(slide, lx + 0.9, 3.7, lx + 0.9, 4.2, { color: C.alert, width: 2, arrow: true, beginArrow: true });
  addText(slide, [{ text: '差 ＝ NZO（非ゼロオフセット）', breakLine: true }, { text: '補正値に上乗せし、その安定性を監視する', fontSize: 10.5 }], lx + 1.15, 3.68, lw - 1.2, 0.54, { fontSize: 11.5, bold: true, color: C.alert, valign: 'middle' });

  // 右：3つのカード
  const rx = 6.25;
  const rw = RIGHT_EDGE - rx;
  const cards = [
    ['デバイス内・エッチング後の計測', 'DRAM量産で、デバイス内計測（IDM）で制御するとデバイスの重ね合わせが36%改善（Park et al. 2018）。3D NANDでは高加速SEMとSCDの値でNZOを補正し、ショット内の高次補正に使う（Chang et al. 2022）。'],
    ['ウェハ形状を測って前送り', 'パターン付きウェハの形状（反り・歪み）を露光機へ前送り（KLA PWG2 2017、PWG5 2020）。裏面に膜をつけて反りを打ち消す装置も（Lam VECTOR DT、2019）。'],
    ['データとEPEで最適化', '非リソ工程（エッチング装置など）の文脈がずれを生む → 機械学習で特定（Daniel et al. 2018）。重ね合わせとCDをまとめたEPEで最適化すると規格内のダイが増える（Kwak et al. 2023）。'],
  ];
  cards.forEach(([head, body], i) => {
    const y = 1.6 + i * 1.6;
    addCard(slide, rx, y, rw, 1.48, { fill: i === 0 ? E5.tint : C.gray });
    addText(slide, head, rx + 0.22, y + 0.1, rw - 0.44, 0.32, { fontSize: 13.5, bold: true, color: E5.color });
    addText(slide, body, rx + 0.22, y + 0.46, rw - 0.44, 1.0, { fontSize: 11.5 });
  });
  addText(slide, '管理の中心となる指標：製品上の重ね合わせ（OPO）、補正後の残差、NZOとその安定性（Klein & Gutman 2026）', MARGIN_X, 6.45, CONTENT_W, 0.32, { fontSize: 12, bold: true, color: E5.color });
  addSource(slide, '出典：Klein & Gutman (2026) Proc. SPIE 13981、Park et al. (2018) Proc. SPIE 10585、Chang et al. (2022) Proc. SPIE 12053、KLA（PWG2・PWG5）、Lam Research (2019)、Daniel et al. (2018) Proc. SPIE 10585、Kwak et al. (2023) Proc. SPIE 12496。');
}

// =====================================================================
// 12. 補正モデルの進化（階段図）
// =====================================================================
{
  const slide = newContentSlide('横断テーマ｜補正モデル', '補正モデルの進化：自由度を増やし、ノイズと折り合いをつける', [
    'ここからは、時代をまたいだテーマ別の流れを見ます。まずは補正モデルです。',
    '最初は位置と回転だけでしたが、EGAの時代にウェハ6項とショット6項の線形モデルになりました。',
    '2000年代後半には、3次までの多項式でウェハとショットそれぞれ20項を使う高次モデルや、ショットごとに線形の補正値を持つ方法が使われるようになります。',
    '今では、1ショットあたり33項や38項を持つCPEのような、非常に自由度の高いモデルも使われています。',
    'ただし、項を増やすほど計測のノイズに敏感になります。KLAの2026年の報告では、1ショット25点、精度0.1nmの条件で、3項のモデルは安定でも、21項のモデルは加えた誤差とほぼ同じだけ係数が動きました。',
    'そのため、サンプリングの設計と、Lassoと交差検証のような項の選択を組み合わせることが欠かせません。',
  ]);
  const steps = [
    { era: E1, head: '位置・回転', period: '〜1970年代', body: 'ウェハ全体を一括で合わせる' },
    { era: E2, head: '線形 6＋6項', period: '1980〜2000年代', body: 'ウェハ6項（平行移動・倍率・回転）＋ショット6項。EGA・APCの基本形' },
    { era: E4, head: '高次多項式', period: '2007年〜', body: '例：3次まででウェハ・ショット各20項。製品ごとに調整（HOPC）' },
    { era: E4, head: 'ショットごと', period: '2009年〜', body: '各ショットで線形6項を持つ（CPE）。サンプリングが大幅に増える' },
    { era: E5, head: '高次×ショットごと', period: '2015年〜', body: 'CPE33・CPE38（1ショット33・38項）。ニコンはグリッド5次・ショット3次まで' },
    { era: FUTURE, head: 'データ駆動', period: '2016年〜', body: 'Zernike・主成分分析・機械学習。EPE基準での最適化' },
  ];
  const n = steps.length;
  const gap = 0.14;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const bottom = 5.3;
  steps.forEach((s, i) => {
    const h = 1.55 + i * 0.44;
    const x = MARGIN_X + i * (w + gap);
    const y = bottom - h;
    addCard(slide, x, y, w, h, { fill: s.era.tint });
    addChip(slide, s.head, x, y, w, 0.44, { fill: s.era.color, fontSize: 12.5, radius: 0.06 });
    addText(slide, s.period, x + 0.12, y + 0.52, w - 0.24, 0.26, { fontSize: 10.5, bold: true, color: s.era.color });
    addText(slide, s.body, x + 0.12, y + 0.8, w - 0.24, h - 0.88, { fontSize: 11 });
  });
  addLine(slide, MARGIN_X + 0.2, 1.75, MARGIN_X + 5.6, 1.75, { color: C.muted, width: 1.5, arrow: true });
  addText(slide, '補正できる成分（自由度）が増える', MARGIN_X + 0.2, 1.43, 5.4, 0.28, { fontSize: 11.5, bold: true, color: C.muted });

  addCard(slide, MARGIN_X, 5.5, CONTENT_W, 1.3, { fill: C.alertTint });
  addText(slide, '自由度の代償', MARGIN_X + 0.25, 5.58, 3.0, 0.3, { fontSize: 13.5, bold: true, color: C.alert });
  addBullets(slide, [
    '項を増やすほど計測ノイズに敏感：1ショット25点・精度0.1 nmのとき、3項のモデルは安定だが、21項のモデルは加えた誤差とほぼ同じだけ係数が動く（Klein & Gutman 2026）',
    '対策：サンプリングの設計と、項の選択（Lassoと計測に合わせた交差検証）をセットで行う（Ehrlich et al. 2025）。直交する基底（Zernike）で項どうしの相関を減らす方法も（Ju et al. 2016）',
  ], MARGIN_X + 0.25, 5.92, CONTENT_W - 0.5, 0.9, { fontSize: 11.5, space: 3 });
  addSource(slide, '出典：Adel et al. (2007)、Huang et al. (2009)、Matsuyama (2015)、Klein & Gutman (2026)、Ehrlich et al. (2025) Proc. SPIE 13426、Ju et al. (2016)、Mohammad et al. (2026)、Park et al. (2025)。期間は本資料での目安。');
}

// =====================================================================
// 13. 計測の進化
// =====================================================================
{
  const slide = newContentSlide('横断テーマ｜計測', '計測の進化：目盛りを読む → 格子で測る → デバイスを測る', [
    '次は計測の流れです。1980年代初めの論文では、光学バーニアという目盛りを読んでレンズの歪みを評価していました。',
    'その後、四角い枠の中に四角を置くBox-in-Boxを光学像で自動計測するのが、長く標準になりました。',
    '2003年には格子型のAIMターゲットが登場し、より密で頑丈なターゲットで多くの情報が取れるようになりました。',
    '2008年ごろからは、回折した光の強さの差からずれを求める回折型の計測が広がり、小さなターゲットをデバイスの近くに置けるようになりました。',
    '2018年ごろからはエッチング後のデバイスそのものを測るデバイス内計測や電子線計測、2024年には貼り合わせたウェハを赤外光で測る方法も報告されています。',
    '正しさの考え方も、装置のくせや総合不確かさから、NZOの安定性や、制御にどれだけ影響するかで仕様を決める方向に変わってきています。',
  ]);
  const cards = [
    { era: E1, name: '光学バーニア', year: '〜1980年代', body: '2つの目盛りのずれを読む。レンズの像位置ずれの評価にも使われた（MacMillen & Ryden 1982）' },
    { era: E3, name: 'Box-in-Box', year: '〜2000年代初め', body: '四角の中の四角を光学像で自動計測。長く標準のターゲットだった（EDN 2003）' },
    { era: E4, name: '格子型（AIM）', year: '2003年〜', body: '格子状の密なターゲット。Box-in-Boxより精度が9%良い例（Adel et al. 2007）' },
    { era: E4, name: '回折型（DBO）', year: '2008年〜', body: '回折光の強さの差からずれを求める。小さなターゲットでデバイスの近くへ（Maas et al. 2011）' },
    { era: E5, name: 'デバイス内・電子線', year: '2018年〜', body: 'エッチング後にデバイスを直接測る。DRAM量産で36%改善（Park et al. 2018）' },
    { era: FUTURE, name: '赤外（IR）', year: '2024年〜', body: '貼り合わせた後、シリコン越しに測る（Goto et al. 2024）' },
  ];
  const n = cards.length;
  const gap = 0.14;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const top = 1.55;
  const h = 3.3;
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (w + gap);
    addCard(slide, x, top, w, h, { fill: C.gray });
    // 図（各ターゲット）
    const gx = x + w / 2;
    const gy = top + 0.62;
    const col = c.era.color;
    if (i === 0) {
      for (let k = 0; k < 7; k += 1) {
        addLine(slide, gx - 0.6 + k * 0.2, gy - 0.35, gx - 0.6 + k * 0.2, gy - 0.02, { color: C.neutral, width: 1.5 });
        addLine(slide, gx - 0.6 + k * 0.215, gy + 0.02, gx - 0.6 + k * 0.215, gy + 0.35, { color: col, width: 1.5 });
      }
    } else if (i === 1) {
      drawTarget(slide, gx - 0.4, gy - 0.4, 0.8, { outer: C.neutral, inner: col, lineWidth: 1.5, innerTransparency: 25 });
    } else if (i === 2) {
      [[-1, -1, 'v'], [1, -1, 'h'], [-1, 1, 'h'], [1, 1, 'v']].forEach(([sx, sy, dir]) => {
        const qx = gx + sx * 0.22 - 0.18;
        const qy = gy + sy * 0.22 - 0.18;
        for (let k = 0; k < 3; k += 1) {
          if (dir === 'v') slide.addShape(pres.shapes.RECTANGLE, { x: qx + k * 0.13, y: qy, w: 0.07, h: 0.36, fill: { color: k % 2 ? C.neutral : col }, line: { color: C.white, width: 0.25 } });
          else slide.addShape(pres.shapes.RECTANGLE, { x: qx, y: qy + k * 0.13, w: 0.36, h: 0.07, fill: { color: k % 2 ? C.neutral : col }, line: { color: C.white, width: 0.25 } });
        }
      });
    } else if (i === 3) {
      [-0.3, 0.3].forEach((ox, side) => {
        for (let k = 0; k < 4; k += 1) {
          slide.addShape(pres.shapes.RECTANGLE, { x: gx + ox - 0.26 + k * 0.14, y: gy - 0.05, w: 0.07, h: 0.34, fill: { color: C.neutral }, line: { color: C.neutral, width: 0.25 } });
          slide.addShape(pres.shapes.RECTANGLE, { x: gx + ox - 0.26 + k * 0.14 + (side ? -0.03 : 0.03), y: gy - 0.35, w: 0.07, h: 0.26, fill: { color: col }, line: { color: col, width: 0.25 } });
        }
      });
    } else if (i === 4) {
      [0, 0.22].forEach((dy) => slide.addShape(pres.shapes.RECTANGLE, { x: gx - 0.55, y: gy + 0.05 + dy, w: 1.1, h: 0.1, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.25 } }));
      slide.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: gx - 0.18, y: gy - 0.45, w: 0.36, h: 0.45, flipV: true, fill: { color: col, transparency: 40 }, line: { color: col, width: 0.5 } });
    } else {
      slide.addShape(pres.shapes.RECTANGLE, { x: gx - 0.6, y: gy - 0.3, w: 1.2, h: 0.24, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
      slide.addShape(pres.shapes.RECTANGLE, { x: gx - 0.6, y: gy - 0.04, w: 1.2, h: 0.24, fill: { color: 'DADDE8' }, line: { color: 'B5BACD', width: 0.5 } });
      addLine(slide, gx, gy - 0.5, gx, gy + 0.4, { color: col, width: 2, arrow: true });
    }
    addText(slide, c.name, x + 0.1, top + 1.18, w - 0.2, 0.32, { fontSize: 13, bold: true, color: col, align: 'center' });
    addChip(slide, c.year, x + 0.25, top + 1.55, w - 0.5, 0.3, { fill: col, fontSize: 10.5 });
    addText(slide, c.body, x + 0.14, top + 1.95, w - 0.28, h - 2.0, { fontSize: 11 });
  });

  addText(slide, '「正しさ（確度）」の考え方も変わった', MARGIN_X, 5.05, 8, 0.32, { fontSize: 13.5, bold: true, color: C.primary });
  const flow = [
    ['精度・TIS', '計測装置のくせ（向きを変えると値がずれる）を抑える'],
    ['総合不確かさ（TMU）・多波長', 'ターゲットの非対称の影響を、複数の波長で減らす（Kim et al. 2023）'],
    ['NZOの安定性・制御への影響', 'TMU 0.3 nm以下では制御指標への寄与は5%未満。仕様は制御への効き方で決める（Klein & Gutman 2026）'],
  ];
  const fw = (CONTENT_W - 0.5) / 3;
  flow.forEach(([head, body], i) => {
    const x = MARGIN_X + i * (fw + 0.25);
    addCard(slide, x, 5.45, fw, 1.35, { fill: i === 2 ? C.tint : C.gray, line: i === 2 ? C.primaryLight : undefined });
    addText(slide, head, x + 0.18, 5.52, fw - 0.36, 0.3, { fontSize: 12.5, bold: true, color: C.primary });
    addText(slide, body, x + 0.18, 5.85, fw - 0.36, 0.9, { fontSize: 11 });
    if (i < 2) addLine(slide, x + fw + 0.02, 6.12, x + fw + 0.23, 6.12, { color: C.primary, width: 1.5, arrow: true });
  });
  addSource(slide, '出典：MacMillen & Ryden (1982)、EDN (2003)、Adel et al. (2007)、Maas et al. (2011)、Park et al. (2018)、Goto et al. (2024) Proc. SPIE 12955、Kim et al. (2023) Proc. SPIE 12496、Klein & Gutman (2026)。年は本資料での目安。図は模式図。');
}

// =====================================================================
// 14. アライメントとステージの進化
// =====================================================================
{
  const slide = newContentSlide('横断テーマ｜アライメントとステージ', 'アライメントとステージ：「露光前に測る」が高密度化し、前送りが主役に', [
    'アライメントとステージの流れです。人が顕微鏡で見て合わせる時代から、1970年の自動アライナー、1980年代のレーザー干渉計ステージと自動アライメントへと進みました。',
    '1988年のEGAで、一部のショットから統計的に全体を推定する考え方が生まれ、2001年の2ステージで、露光と並行して多くの点を測れるようになりました。',
    '2008年から09年には、ステージの位置を、測定光の通り道が短いエンコーダで測る方式が入り、2018年以降は露光前に全ウェハを高密度に測るアライメント局や、12色のアライメントセンサーが登場しています。',
    '2027年にはニコンが、貼り合わせで生じるウェハ歪みを測って露光機に前送りするLitho Booster 1000を発売する予定です。',
    '注意点として、アライメントで直せる成分を、APCの前送りでもう一度直してしまう二重補正を避ける工夫が特許でも示されています。',
  ]);
  const nodes = [
    { era: E1, year: '1960年代', text: '顕微鏡で見て\n手で合わせる' },
    { era: E1, year: '1970', text: '自動アライナー\n（K&S・Computervision）' },
    { era: E2, year: '1984', text: 'レーザー干渉計ステージ\n＋自動アライメント（Nikon）' },
    { era: E2, year: '1988', text: 'EGA：一部のショット\nから統計的に推定' },
    { era: E3, year: '2001', text: '2ステージ：露光と\n並行して計測' },
    { era: E4, year: '2008〜09', text: 'エンコーダで\nステージ位置を測る' },
    { era: E5, year: '2018〜22', text: '全ウェハの事前計測（iAS）\n12色アライメント' },
    { era: FUTURE, year: '2027〜', text: '貼り合わせ歪みを\n測って前送り' },
  ];
  const x0 = 1.15;
  const x1 = RIGHT_EDGE - 0.55;
  const y = 3.05;
  const step = (x1 - x0) / (nodes.length - 1);
  addLine(slide, x0, y, x1 + 0.3, y, { color: C.line, width: 2.5, arrow: true });
  nodes.forEach((nd, i) => {
    const cx = x0 + i * step;
    addNode(slide, cx, y, 0.34, nd.era.color, '', { lineColor: C.white });
    const up = i % 2 === 0;
    const ty = up ? 1.62 : 3.38;
    // 両端の点はラベルの枠がスライドからはみ出さないように幅を狭める
    const half = Math.min(1.2, cx - 0.25, SLIDE_W - 0.25 - cx);
    addText(slide, nd.year, cx - half, ty, half * 2, 0.3, { fontSize: 12.5, bold: true, color: nd.era.color, align: 'center' });
    addText(slide, nd.text, cx - half, ty + 0.32, half * 2, 0.9, { fontSize: 11, align: 'center' });
    addLine(slide, cx, up ? y - 0.2 : y + 0.2, cx, up ? ty + 1.1 : ty - 0.05, { color: nd.era.color, width: 0.75, dash: 'dash' });
  });

  const cw = (CONTENT_W - 0.3) / 2;
  addCard(slide, MARGIN_X, 4.75, cw, 2.05, { fill: C.tint });
  addText(slide, '変化の方向', MARGIN_X + 0.22, 4.85, cw - 0.4, 0.32, { fontSize: 13.5, bold: true, color: C.primary });
  addBullets(slide, [
    '測る点が「数点 → 一部のショット → 全ウェハの高密度」へ増えた',
    '光の色（波長）を増やし、マークの形の崩れに強くした（NXT:2100iは4色→12色）',
    'ステージの位置を、測定光の通り道が短いエンコーダで測る（NXT:1950iは位置制御50%向上、NSR-S620Dは干渉計と併用）',
  ], MARGIN_X + 0.22, 5.22, cw - 0.44, 1.55, { fontSize: 12, space: 4 });
  const rx = MARGIN_X + cw + 0.3;
  addCard(slide, rx, 4.75, cw, 2.05, { fill: C.goldTint });
  addText(slide, '注意：二重補正を避ける', rx + 0.22, 4.85, cw - 0.4, 0.32, { fontSize: 13.5, bold: true, color: C.gold });
  addBullets(slide, [
    'アライメントで直せる成分を、前の層の重ね合わせから予測した前送りから差し引く（US 10,444,639 B2）',
    'ウェハごとの前送りとロット間のフィードバックを組み合わせる（US 11,221,561 B2）',
  ], rx + 0.22, 5.22, cw - 0.44, 1.55, { fontSize: 12, space: 4 });
  addSource(slide, '出典：Kato (2007)、Mack (2005)、Slonaker et al. (1988)、ASML (2008・2021、NXT:2100i製品ページ)、Kohno et al. (2010)、Nikon（NSR-S635E、Litho Booster 1000：2025年・2026年の発表）、KLA特許 US 10,444,639 B2（2019）・US 11,221,561 B2（2022）。');
}

// =====================================================================
// 15. 直す場所は露光機の外へ（同心円）
// =====================================================================
{
  const slide = newContentSlide('横断テーマ｜補正の手段', '直す場所は露光機の外へ：リソセル・工場・設計まで', [
    '補正の手段、つまりどこで直すかも広がってきました。',
    '中心は露光機で、ステージ、レチクル、レンズ、そして熱によるレンズやレチクルの変形の補正があります。',
    'その外側がリソセルで、アライメント専用局、計測装置、塗布現像装置があります。',
    'さらに工場全体では、ウェハの形状を測って前送りしたり、裏面に膜をつけて反りを打ち消したり、マスクの描画位置の誤差を測って前送りしたり、貼り合わせ装置の条件を調整したりします。',
    '一番外側は設計とプロセスで、自己整合のプロセスを使って、そもそも重ね合わせの許容量を広げる方法です。IRDSではFSAVがピッチ20nmから必要になるとしています。',
  ]);
  const cx = 3.55;
  const cy = 4.2;
  const rings = [
    { w: 5.9, h: 5.0, fill: FUTURE.tint, line: FUTURE.color, label: '設計・プロセス', ly: 0.16 },
    { w: 4.6, h: 3.85, fill: E5.tint, line: E5.color, label: '工場全体', ly: 0.16 },
    { w: 3.3, h: 2.7, fill: E4.tint, line: E4.color, label: 'リソセル', ly: 0.14 },
    { w: 1.95, h: 1.55, fill: C.white, line: C.primary, label: '露光機', ly: 0 },
  ];
  rings.forEach((rg) => {
    slide.addShape(pres.shapes.OVAL, { x: cx - rg.w / 2, y: cy - rg.h / 2, w: rg.w, h: rg.h, fill: { color: rg.fill }, line: { color: rg.line, width: 1.25 } });
  });
  rings.forEach((rg, i) => {
    if (i === rings.length - 1) {
      addText(slide, '露光機', cx - 0.8, cy - 0.35, 1.6, 0.35, { fontSize: 14, bold: true, color: C.primary, align: 'center', valign: 'middle' });
      addText(slide, 'ステージ・レチクル\nレンズ・熱補正', cx - 0.85, cy, 1.7, 0.5, { fontSize: 9.5, align: 'center' });
    } else {
      addText(slide, rg.label, cx - 1.2, cy - rg.h / 2 + rg.ly, 2.4, 0.32, { fontSize: 13, bold: true, color: rg.line, align: 'center' });
    }
  });

  const rx = 7.0;
  const rw = RIGHT_EDGE - rx;
  const rows = [
    { color: C.primary, head: '露光機', body: 'ステージ・レチクル・レンズで補正。レンズやレチクルの熱による変形も予測して直す（Matsuyama 2015）' },
    { color: E4.color, head: 'リソセル', body: 'アライメント専用局で全ウェハを事前計測（Nikon、2018年〜）、重ね合わせ計測装置、塗布現像装置' },
    { color: E5.color, head: '工場全体', body: 'ウェハ形状の前送り（KLA PWG）、裏面の膜で応力を打ち消す（Lam 2019）、マスク描画位置の誤差を事前に測る（van Haren et al. 2019）、貼り合わせ装置の補正（Goto et al. 2024）' },
    { color: FUTURE.color, head: '設計・プロセス', body: '自己整合プロセス（SAB・FSAV）で重ね合わせの許容量を広げる。FSAVはピッチ20 nmから必要（IRDS 2023）' },
  ];
  let y = 1.6;
  rows.forEach((r) => {
    const h = r.head === '工場全体' ? 1.45 : 1.02;
    addCard(slide, rx, y, rw, h, { fill: C.gray });
    addChip(slide, r.head, rx + 0.18, y + 0.15, 1.45, 0.36, { fill: r.color, fontSize: 11.5 });
    addText(slide, r.body, rx + 1.8, y + 0.12, rw - 1.98, h - 0.2, { fontSize: 11.5 });
    y += h + 0.14;
  });
  addSource(slide, '出典：Matsuyama (2015)、Nikon (2025)、KLA（PWG2・PWG5）、Lam Research (2019)、van Haren et al. (2019) Proc. SPIE 11178、Goto et al. (2024)、IRDS 2023 Lithography。図は模式図。');
}

// =====================================================================
// 16. 制御ループは多層に
// =====================================================================
{
  const slide = newContentSlide('横断テーマ｜制御ループ', '制御ループは多層に：速さの違う補正を組み合わせる', [
    '制御ループは、速さの違う補正を組み合わせる多層の構造になっています。',
    '一番速いのは露光中の補正で、レンズやレチクルが熱で変形する影響を予測して直します。',
    '次がショットごとの補正、ウェハごとの前送り、ロットごとのフィードバックです。',
    '最近は、層や工程をまたいで、複数の層をまとめてEPEで最適化したり、貼り合わせ装置へフィードバックしたりする取り組みも出ています。',
    '組み合わせるときの注意点は、同じ成分を2つのループで二重に直さないことです。KLAの特許では、アライメントで直せる成分を前送りの補正から差し引く方法が示されています。',
  ]);
  const rows = [
    { era: E4, scale: '露光中', what: 'レンズ・レチクルの熱による変形を予測して補正', src: 'Matsuyama (2015)' },
    { era: E4, scale: 'ショットごと', what: 'ショットごとの補正値（CPE）。ショット内の高次成分も', src: 'Huang et al. (2009)' },
    { era: E5, scale: 'ウェハごと', what: 'アライメントやウェハ形状を露光前に測って前送り（FF）', src: 'US 11,221,561 B2、KLA PWG' },
    { era: E3, scale: 'ロットごと', what: 'APCのフィードバック（重み付き移動平均で次のロットへ）', src: 'Ju et al. (2016)' },
    { era: FUTURE, scale: '層・工程をまたぐ', what: '複数の層をEPEでまとめて最適化／貼り合わせ装置へのフィードバック', src: 'Lee et al. (2026)、Goto et al. (2024)' },
  ];
  const tx = 1.45;
  const rowH = 0.78;
  const y0 = 1.6;
  addLine(slide, MARGIN_X + 0.35, y0 + 0.1, MARGIN_X + 0.35, y0 + rowH * rows.length - 0.1, { color: C.muted, width: 2, arrow: true });
  addText(slide, '速い', MARGIN_X, y0 - 0.02, 0.7, 0.26, { fontSize: 10.5, bold: true, color: C.muted, align: 'center' });
  addText(slide, '遅い・広い', MARGIN_X - 0.1, y0 + rowH * rows.length - 0.05, 1.0, 0.26, { fontSize: 10.5, bold: true, color: C.muted, align: 'center' });
  rows.forEach((r, i) => {
    const y = y0 + i * rowH;
    addChip(slide, r.scale, tx, y + 0.08, 1.9, rowH - 0.16, { fill: r.era.color, fontSize: 12.5 });
    addCard(slide, tx + 2.05, y + 0.08, 6.1, rowH - 0.16, { fill: r.era.tint });
    addText(slide, r.what, tx + 2.22, y + 0.08, 5.8, rowH - 0.16, { fontSize: 12.5, valign: 'middle' });
    addText(slide, r.src, tx + 8.3, y + 0.08, RIGHT_EDGE - tx - 8.3, rowH - 0.16, { fontSize: 10.5, color: C.muted, valign: 'middle' });
  });
  addCard(slide, MARGIN_X, 5.7, CONTENT_W, 1.1, { fill: C.goldTint });
  addText(slide, '組み合わせるときの注意', MARGIN_X + 0.25, 5.78, 4, 0.3, { fontSize: 13.5, bold: true, color: C.gold });
  addText(slide, '同じ成分を2つのループで二重に直さない。アライメントで直せる成分は、前の層から予測した前送りの補正から差し引く（US 10,444,639 B2）。ループの速さと重み（ならし方）を別々に決める。', MARGIN_X + 0.25, 6.1, CONTENT_W - 0.5, 0.66, { fontSize: 12 });
  addSource(slide, '出典：Matsuyama (2015)、Huang et al. (2009)、KLA特許 US 11,221,561 B2・US 10,444,639 B2、KLA（PWG）、Ju et al. (2016)、Lee et al. (2026) Proc. SPIE 13981、Goto et al. (2024)。');
}

// =====================================================================
// 17. 2026年の現在地
// =====================================================================
{
  const slide = newContentSlide('現在地｜2026年', '2026年の現在地：数字で見る重ね合わせ制御', [
    '2026年時点の現在地を数字でまとめました。',
    'IRDS 2021では、製品上の最小要求は2025年に2.0nm、2028年に1.6nmです。',
    '装置は、EUVのNXE:3800Eで号機間0.9nm、製品上1.5nm、High-NAのEXE:5200Bでは受入検査で0.7nmと報じられています。IntelはHigh-NA装置を18Aの一部の層の量産に使い始めたと報道されています。',
    'デバイスでは、GAAと裏面電源を使うIntel 18Aの最初の製品が2025年に発売され、TSMCのA16は2026年末までに量産を始める予定です。',
    '貼り合わせの分野では、貼り合わせ面で100nm未満、貼り合わせ後の露光では10nm未満という、桁の違う要求が並んでいます。',
    '計測では、総合不確かさ0.3nm以下なら制御指標への影響は5%未満と報告され、NZOの安定性が重要な指標になっています。',
  ]);
  const rows = [
    ['製品上の要求（最小）', '2025年 2.0 nm → 2028年 1.6 nm（3σ）', 'IRDS 2021'],
    ['EUV装置', 'NXE:3800E：号機間 ≤0.9 nm、製品上 ≤1.5 nm', 'ASML 2024'],
    ['High-NA EUV', 'EXE:5200B：受入検査で0.7 nm・175枚/時（2025年12月）。Intel 18Aの一部の層で量産に使用（2026年7月）', 'Bits&Chips 2025、SiliconANGLE 2026'],
    ['ArF液浸', 'NXT:2100i：号機間 1.3 nm、NSR-S636E：号機間 ≤2.1 nm', 'ASML、Nikon'],
    ['デバイス構造', 'GAA＋裏面電源：Intel 18Aの最初の製品を2025年に発売。TSMC A16は2026年末までに量産開始の予定', 'Intel 10-K、TrendForce 2024'],
    ['貼り合わせ', '貼り合わせ面の製品上重ね合わせ100 nm未満を目標にAPC。貼り合わせ後の露光には10 nm未満', 'Goto et al. 2024、Ip et al. 2023'],
    ['計測', 'TMU 0.3 nm以下で制御指標への寄与は5%未満。NZOの安定性が主要な管理指標', 'Klein & Gutman 2026'],
  ];
  addTableBox(slide, tableRows(['項目', '2026年時点の状況', '出典'], rows, { headFill: C.primary, fontSize: 12 }), MARGIN_X, 1.55, CONTENT_W, [2.2, 7.3, 2.633], { rowH: 0.58, fontSize: 12 });
  addText(slide, '同じ「重ね合わせ」でも、装置の試験値（号機間）・製品上の値・貼り合わせ面の値では桁が違う。比べるときは定義をそろえる。', MARGIN_X, 6.35, CONTENT_W, 0.32, { fontSize: 12, bold: true, color: C.primary });
  addSource(slide, '出典：IRDS 2021 Lithography、ASML 2024 Investor Day、Bits&Chips (2025-12-16)、SiliconANGLE (2026-07-15)、ASML NXT:2100i製品ページ、Nikon NSR-S636E製品ページ、Intel 10-K（2025年度）、TrendForce (2024-11-26)、Goto et al. (2024)、Ip et al. (2023) Proc. SPIE 12496、Klein & Gutman (2026)。');
}

// =====================================================================
// 18. 展望① High-NA：継ぎ合わせと混用
// =====================================================================
{
  const slide = newContentSlide('展望①｜ロジック・High-NA', 'High-NA：半分の露光範囲を継ぎ合わせ、低NAと混ぜて使う', [
    '展望の1つ目は、High-NA EUVです。High-NAでは、1回に露光できる範囲が従来の26×33mmから26×16.5mmへ半分になります。',
    'そのため、大きなチップは2回に分けて露光し、継ぎ目で正確に合わせる必要があります。',
    'また、全面露光の低NA装置で作った層にHigh-NAの層を重ねると、レンズの歪み、露光範囲、縦と横で倍率が違う結像、号機の違いから系統的なずれが出るため、アライメントモデルや装置間マッチングの強化が必要です。',
    'ASMLの計画では、EXE:5200B/CとNXE:4000Fが号機間0.8nm未満で、さらにNA 0.75のHyper-NAも2030年以降の選択肢に挙がっています。',
    '一方IBMは、より短い波長を低NAで使えば、全面露光のまま微細化できるという別の道も提案しています。',
  ], { eraIndex: 5 });
  // 左：露光範囲の比較
  const s = 0.1; // 1 mm = 0.1 inch
  const fx = 1.0;
  const fy = 1.95;
  addText(slide, '低NA（全面）', fx, 1.55, 2.6, 0.3, { fontSize: 12.5, bold: true, color: E5.color, align: 'center' });
  slide.addShape(pres.shapes.RECTANGLE, { x: fx, y: fy, w: 26 * s, h: 33 * s, fill: { color: E5.tint }, line: { color: E5.color, width: 1.5 } });
  addText(slide, '26 × 33 mm', fx, fy + 1.5, 26 * s, 0.3, { fontSize: 12, bold: true, color: E5.color, align: 'center' });
  const hx = 4.1;
  addText(slide, 'High-NA（半分）×2', hx - 0.1, 1.55, 2.8, 0.3, { fontSize: 12.5, bold: true, color: FUTURE.color, align: 'center' });
  slide.addShape(pres.shapes.RECTANGLE, { x: hx, y: fy, w: 26 * s, h: 16.5 * s, fill: { color: FUTURE.tint }, line: { color: FUTURE.color, width: 1.5 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: hx + 0.05, y: fy + 16.5 * s, w: 26 * s, h: 16.5 * s, fill: { color: FUTURE.tint }, line: { color: FUTURE.color, width: 1.5 } });
  addText(slide, '26 × 16.5 mm', hx, fy + 0.65, 26 * s, 0.3, { fontSize: 12, bold: true, color: FUTURE.color, align: 'center' });
  addText(slide, '26 × 16.5 mm', hx + 0.05, fy + 2.3, 26 * s, 0.3, { fontSize: 12, bold: true, color: FUTURE.color, align: 'center' });
  addLine(slide, hx - 0.15, fy + 16.5 * s, hx + 26 * s + 0.2, fy + 16.5 * s, { color: C.alert, width: 2, dash: 'dash' });
  addText(slide, '継ぎ目：ここで正確に合わせる', hx - 0.2, fy + 33 * s + 0.1, 3.0, 0.3, { fontSize: 11, bold: true, color: C.alert, align: 'center' });
  addText(slide, '図は露光範囲の比率を表す模式図（ずれは誇張）', MARGIN_X, 5.75, 6.0, 0.28, { fontSize: 10, color: C.muted });

  const rx = 7.1;
  const rw = RIGHT_EDGE - rx;
  addBullets(slide, [
    lead('露光範囲が半分に：', '26×16.5 mmになり、大きなチップは2回に分けて継ぎ合わせる（IRDS 2021）'),
    lead('混用で出る系統的なずれ：', '全面露光の低NAの層にHigh-NAの層を重ねると、レンズの歪み・露光範囲・縦横で倍率が違う結像（アナモルフィック）・号機の違いからずれが出る（Katz et al. 2026）'),
    lead('対策：', '高度なアライメントモデル、装置の校正、装置間マッチングの強化（Katz et al. 2026）'),
    lead('装置の計画：', 'EXE:5200B/C・NXE:4000Fは号機間0.8 nm未満。NA 0.75のHyper-NAは2030年以降の選択肢（ASML 2024）'),
    lead('別の道：', '2.5〜4.5 nmの短い波長を低NA・全面露光（26×33 mm）で使う提案（Gabor et al. 2026）'),
  ], rx, 1.62, rw, 3.6, { fontSize: 12.5, space: 8 });
  // 数字で見る High-NA
  const nums = [
    ['1回の露光面積', '858→429 mm²', 'IRDS 2021'],
    ['号機間の重ね合わせ', '0.8 nm未満', 'EXE:5200B/C（ASML）'],
    ['受入検査の実績', '0.7 nm', 'EXE:5200B・Intel（2025）'],
  ];
  const nw = (rw - 0.3) / 3;
  nums.forEach(([head, big, src], i) => {
    const x = rx + i * (nw + 0.15);
    addCard(slide, x, 5.3, nw, 1.5, { fill: FUTURE.tint });
    addText(slide, head, x + 0.12, 5.37, nw - 0.24, 0.3, { fontSize: 10.5, bold: true, color: FUTURE.color, align: 'center' });
    addText(slide, big, x + 0.05, 5.7, nw - 0.1, 0.5, { fontSize: 16, bold: true, color: FUTURE.color, align: 'center', valign: 'middle' });
    addText(slide, src, x + 0.1, 6.25, nw - 0.2, 0.45, { fontSize: 9.5, color: C.muted, align: 'center' });
  });
  addSource(slide, '出典：IRDS 2021 Lithography（Table LITH-1）、Katz et al. (2026) Proc. SPIE 13981、ASML 2024 Investor Day、Bits&Chips (2025)、Gabor et al. (2026) Proc. SPIE 13979。');
}

// =====================================================================
// 19. 展望② 裏面配線とCFET
// =====================================================================
{
  const slide = newContentSlide('展望②｜ロジック・裏面配線とCFET', '裏面配線とCFET：貼り合わせで生じるウェハ変形との戦い', [
    '展望の2つ目は、トランジスタの縦積みと裏面配線です。',
    '裏面電源配線では、表側にトランジスタと配線を作った後、支持ウェハに貼り合わせて裏返し、薄く削ってから裏側に露光します。このとき、表側のパターンに正確に合わせる必要があります。',
    'TELとIBMの報告では、貼り合わせ後の露光には10nm未満の重ね合わせが求められ、貼り合わせで生じる歪みが、到達できる重ね合わせを大きく左右します。',
    '対策としては、ウェハの形状計測、高密度のサンプリング、前送り、高度なモデル化が挙げられています。',
    'さらにnMOSとpMOSを縦に積むCFETでは、サブnmのずれでもチャネルの不整合につながるため、より厳しい制御が必要になります。',
  ], { eraIndex: 5 });
  // 左：工程の模式図（3ステップ）
  const steps = [
    { title: '① 表側をつくる', desc: 'トランジスタと配線' },
    { title: '② 貼り合わせて裏返す', desc: '支持ウェハに貼り薄く削る' },
    { title: '③ 裏側に露光', desc: '表側のパターンに合わせる' },
  ];
  const sx = MARGIN_X;
  const sw = 1.95;
  steps.forEach((st, i) => {
    const x = sx + i * (sw + 0.2);
    addCard(slide, x, 1.6, sw, 3.45, { fill: C.gray });
    addText(slide, st.title, x + 0.1, 1.68, sw - 0.2, 0.3, { fontSize: 12, bold: true, color: FUTURE.color, align: 'center' });
    addText(slide, st.desc, x + 0.1, 1.98, sw - 0.2, 0.3, { fontSize: 10.5, align: 'center' });
    const wx = x + 0.3;
    const ww = sw - 0.6;
    if (i === 0) {
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.35, w: ww, h: 0.6, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.1, w: ww, h: 0.25, fill: { color: E5.color, transparency: 20 }, line: { color: E5.color, width: 0.5 } });
      addText(slide, 'デバイス層', wx, 2.8, ww, 0.26, { fontSize: 10, color: E5.color, align: 'center' });
      addText(slide, 'シリコン', wx, 3.5, ww, 0.3, { fontSize: 10, color: C.muted, align: 'center' });
    } else if (i === 1) {
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.55, w: ww, h: 0.6, fill: { color: 'DADDE8' }, line: { color: 'B5BACD', width: 0.5 } });
      addText(slide, '支持ウェハ', wx, 3.7, ww, 0.3, { fontSize: 10, color: C.muted, align: 'center' });
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.3, w: ww, h: 0.25, fill: { color: E5.color, transparency: 20 }, line: { color: E5.color, width: 0.5 } });
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.1, w: ww, h: 0.2, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
      addText(slide, '薄く削ったシリコン', wx - 0.1, 2.8, ww + 0.2, 0.26, { fontSize: 10, color: C.muted, align: 'center' });
      addLine(slide, wx - 0.12, 3.43, wx + 0.12, 3.43, { color: C.alert, width: 1.5, arrow: true, beginArrow: true });
      addLine(slide, wx + ww - 0.12, 3.43, wx + ww + 0.12, 3.43, { color: C.alert, width: 1.5, arrow: true, beginArrow: true });
    } else {
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.55, w: ww, h: 0.6, fill: { color: 'DADDE8' }, line: { color: 'B5BACD', width: 0.5 } });
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.3, w: ww, h: 0.25, fill: { color: E5.color, transparency: 20 }, line: { color: E5.color, width: 0.5 } });
      slide.addShape(pres.shapes.RECTANGLE, { x: wx, y: 3.1, w: ww, h: 0.2, fill: { color: 'C9CDDC' }, line: { color: 'B5BACD', width: 0.5 } });
      [0.12, 0.42, 0.72].forEach((dx) => slide.addShape(pres.shapes.RECTANGLE, { x: wx + dx, y: 2.92, w: 0.18, h: 0.18, fill: { color: FUTURE.color }, line: { color: FUTURE.color, width: 0.5 } }));
      [2.45, 2.55, 2.65].forEach((lx) => addLine(slide, wx + (lx - 2.45) * 3 + 0.2, 2.35, wx + (lx - 2.45) * 3 + 0.2, 2.85, { color: C.gold, width: 1.5, arrow: true }));
      addText(slide, '裏面の電源配線', wx - 0.15, 3.85 + 0.35, ww + 0.3, 0.26, { fontSize: 10, color: FUTURE.color, align: 'center' });
    }
    if (i < steps.length - 1) addLine(slide, x + sw + 0.02, 3.3, x + sw + 0.18, 3.3, { color: C.muted, width: 1.5, arrow: true });
  });
  addText(slide, '赤い矢印：貼り合わせ・薄化で生じる面内の歪み（模式図）', sx, 5.12, 6.2, 0.28, { fontSize: 10, color: C.alert });
  addCard(slide, sx, 5.5, 6.25, 1.3, { fill: FUTURE.tint });
  addText(slide, [
    { text: '合わせ方の変化：', bold: true, color: FUTURE.color },
    { text: '「下の層に合わせる」から、「貼り合わせで変形した下の層を測ってから合わせる」へ。前送りと高密度の計測が前提になる（Katz et al. 2026の対策から整理）' },
  ], sx + 0.2, 5.55, 5.85, 1.2, { fontSize: 12, valign: 'middle' });

  const rx = 7.1;
  const rw = RIGHT_EDGE - rx;
  addBullets(slide, [
    lead('新しい課題：', '裏面電源配線（BSPDN）は貼り合わせ・薄化・露光を含み、パターン付きウェハの変形が問題になる（Katz et al. 2026）'),
    lead('必要な精度：', '貼り合わせ時の歪みが、到達できる重ね合わせを大きく左右する（Ip et al. 2023）'),
    lead('対策：', 'ウェハ形状の計測、高密度サンプリング、前送り、高度なモデル化（Katz et al. 2026）'),
    lead('CFET：', 'nMOSとpMOSの縦積み。わずかなずれがチャネルの不整合などにつながる（Katz et al. 2026）'),
    lead('量産の状況：', 'Intel 18A（PowerVia）は2025年に最初の製品を発売。TSMC A16（Super Power Rail）は2026年末までに量産開始の予定（Intel、TrendForce）'),
  ], rx, 1.62, rw, 3.6, { fontSize: 12.5, space: 8 });
  const nums = [
    ['10 nm未満', '貼り合わせ後の露光に求められる重ね合わせ', 'Ip et al. 2023'],
    ['サブnm', 'CFETで不良につながりうるずれの大きさ', 'Katz et al. 2026'],
  ];
  const nw = (rw - 0.15) / 2;
  nums.forEach(([big, head, src], i) => {
    const x = rx + i * (nw + 0.15);
    addCard(slide, x, 5.3, nw, 1.5, { fill: C.gray });
    addText(slide, big, x + 0.1, 5.36, nw - 0.2, 0.5, { fontSize: 20, bold: true, color: FUTURE.color, align: 'center', valign: 'middle' });
    addText(slide, head, x + 0.15, 5.88, nw - 0.3, 0.5, { fontSize: 11, align: 'center' });
    addText(slide, src, x + 0.15, 6.4, nw - 0.3, 0.3, { fontSize: 9.5, color: C.muted, align: 'center' });
  });
  addSource(slide, '出典：Katz et al. (2026)、Ip et al. (2023) Proc. SPIE 12496、Intel 10-K（2025年度）、TrendForce (2024-11-26)。図は模式図。');
}

// =====================================================================
// 20. 展望③ メモリと3D集積：貼り合わせ
// =====================================================================
{
  const slide = newContentSlide('展望③｜メモリ・3D集積', 'メモリと3D集積：貼り合わせの重ね合わせを制御ループに入れる', [
    '展望の3つ目は、メモリと3D集積での貼り合わせです。',
    '3D NANDでは、キオクシアとWestern DigitalがCMOSとメモリセルを別々のウェハで作って貼り合わせるCBA技術を開発しています。',
    '貼り合わせ面の重ね合わせを100nm未満にするには、貼り合わせ装置のアライメント改善に加えて、貼り合わせ後の計測に基づくAPCのフィードバックが必要とされ、赤外光で貼り合わせ直後に測る方法が報告されています。',
    'ハイブリッドボンディングの接続ピッチはサブµmに向かっており、露光の情報、面内歪み、重ね合わせ、貼り合わせ装置の調整つまみを組み合わせたAPCが検討されています。',
    'DRAMでも、4F²構造と貼り合わせ、2030年ごろには縦型DRAMが主流になる見通しが示されています。',
    'ニコンは、貼り合わせで生じる歪みを測って露光機へ前送りするアライメント局を2027年に発売する予定です。',
  ], { eraIndex: 5 });
  // 左：貼り合わせの制御ループ（計測 → 貼り合わせ → 赤外計測 → APC → 貼り合わせ装置へ戻す）
  const nw = 1.85;
  const nh = 1.15;
  const ny = 1.75;
  const nx = [0.6, 2.68, 4.76];
  const row = [
    ['貼り合わせ前の計測', 'ウェハ形状・面内歪み（IPD）'],
    ['貼り合わせ装置', '位置合わせ・補正つまみ'],
    ['直後に赤外で計測', 'シリコン越しに重ね合わせ'],
  ];
  row.forEach(([head, body], i) => {
    addCard(slide, nx[i], ny, nw, nh, { fill: i === 2 ? FUTURE.tint : C.gray, line: i === 2 ? FUTURE.color : undefined });
    addText(slide, head, nx[i] + 0.08, ny + 0.1, nw - 0.16, 0.34, { fontSize: 11.5, bold: true, color: FUTURE.color, align: 'center' });
    addText(slide, body, nx[i] + 0.1, ny + 0.48, nw - 0.2, 0.6, { fontSize: 10.5, align: 'center' });
    if (i < row.length - 1) addLine(slide, nx[i] + nw + 0.03, ny + nh / 2, nx[i + 1] - 0.03, ny + nh / 2, { color: FUTURE.color, width: 1.75, arrow: true });
  });
  const apcY = 3.45;
  const apcH = 0.95;
  addCard(slide, nx[1], apcY, nw, apcH, { fill: C.goldTint, line: 'E3C98F' });
  addText(slide, [{ text: 'APC', bold: true, breakLine: true, color: C.gold }, { text: '装置の条件を更新', fontSize: 11 }], nx[1] + 0.1, apcY + 0.05, nw - 0.2, apcH - 0.1, { fontSize: 13, align: 'center', valign: 'middle' });
  const irCx = nx[2] + nw / 2 - 0.3;
  addLine(slide, irCx, ny + nh + 0.02, irCx, apcY + apcH / 2, { color: C.gold, width: 1.75 });
  addLine(slide, irCx, apcY + apcH / 2, nx[1] + nw + 0.03, apcY + apcH / 2, { color: C.gold, width: 1.75, arrow: true });
  addLine(slide, nx[1] + nw / 2, apcY - 0.02, nx[1] + nw / 2, ny + nh + 0.03, { color: C.gold, width: 1.75, arrow: true });
  addText(slide, 'フィードバック', nx[0] + 0.3, 3.1, 1.6, 0.3, { fontSize: 11, bold: true, color: C.gold, align: 'right' });
  // 貼り合わせ後の露光への前送り
  const ffX = nx[2] + nw - 0.35;
  addLine(slide, ffX, ny + nh + 0.02, ffX, 4.78, { color: FUTURE.color, width: 1.75, arrow: true });
  addText(slide, '前送り', ffX - 0.85, 4.2, 0.78, 0.3, { fontSize: 11, bold: true, color: FUTURE.color, align: 'right' });
  addCard(slide, MARGIN_X, 4.82, nx[2] + nw - MARGIN_X, 1.3, { fill: FUTURE.tint });
  addText(slide, [{ text: '貼り合わせ後の露光へ前送り：', bold: true, color: FUTURE.color }, { text: 'ウェハの歪みを測って露光機へ補正値を送るアライメント局（Nikon Litho Booster 1000、2027年1月発売予定）' }], MARGIN_X + 0.2, 4.87, nx[2] + nw - MARGIN_X - 0.4, 1.2, { fontSize: 12, valign: 'middle' });
  addText(slide, '図は論文の制御の流れをまとめた模式図', MARGIN_X, 6.25, 5.8, 0.28, { fontSize: 10, color: C.muted });

  const rx = 6.95;
  const rw = RIGHT_EDGE - rx;
  addBullets(slide, [
    lead('3D NAND：', 'CMOSとメモリセルを別々に作って貼り合わせるCBA（Kioxia・WD）。貼り合わせ面で100 nm未満には、装置の位置合わせ改善とAPCのフィードバックが必要（Goto et al. 2024）'),
    lead('計測：', '赤外光で貼り合わせ直後に測り、裏面除去後の可視光計測で確度を確認（Goto et al. 2024）'),
    lead('ハイブリッドボンディング：', '接続ピッチはサブµmへ。露光の情報・面内歪み・重ね合わせ・貼り合わせ装置のつまみを組み合わせてAPC（Roy et al. 2024）'),
    lead('DRAM：', '4F²＋貼り合わせ、2030年ごろには縦型DRAMが主流になる見通し。厚く不透明な膜で光学信号が弱まる（Katz et al. 2026）'),
  ], rx, 1.62, rw, 3.6, { fontSize: 12.5, space: 8 });
  const nums = [
    ['100 nm未満', '貼り合わせ面の製品上重ね合わせの目標', 'Goto et al. 2024'],
    ['サブµm', 'ハイブリッドボンディングの接続ピッチ', 'Roy et al. 2024'],
    ['9 µm未満', 'Intel Foveros Directの銅接続ピッチ', 'Katz et al. 2026'],
  ];
  const cw3 = (rw - 0.3) / 3;
  nums.forEach(([big, head, src], i) => {
    const x = rx + i * (cw3 + 0.15);
    addCard(slide, x, 4.82, cw3, 1.3, { fill: C.gray });
    addText(slide, big, x + 0.08, 4.86, cw3 - 0.16, 0.44, { fontSize: 17, bold: true, color: FUTURE.color, align: 'center', valign: 'middle' });
    addText(slide, head, x + 0.1, 5.32, cw3 - 0.2, 0.5, { fontSize: 10.5, align: 'center' });
    addText(slide, src, x + 0.1, 5.8, cw3 - 0.2, 0.28, { fontSize: 9, color: C.muted, align: 'center' });
  });
  addSource(slide, '出典：Goto et al. (2024) Proc. SPIE 12955、Roy et al. (2024) Proc. SPIE 12955、Katz et al. (2026)、Nikon (2026-07-29)。図は模式図。');
}

// =====================================================================
// 21. 展望④ EPEへ
// =====================================================================
{
  const slide = newContentSlide('展望④｜管理指標', '指標は「重ね合わせ」から「エッジ配置誤差（EPE）」へ', [
    '展望の4つ目は、管理指標の変化です。これからは重ね合わせ単体ではなく、エッジ配置誤差、EPEで管理する流れが強まります。',
    'EPEは、パターンの端が狙った位置からどれだけずれたかを表す量で、重ね合わせ、CDのばらつき、局所的なばらつきがまとめて効きます。IRDS 2023では、EPEの予算のうち重ね合わせが約40%、LERが約25%という推定が紹介されています。',
    'サムスンやimecの報告では、露光量と重ね合わせの補正を、EPEが最大になる所を小さくするように最適化すると、規格内に入るダイの割合が増えました。DRAMのシミュレーションでは最大5.4%、ロジックのシミュレーションでは2%の増加です。',
    '2026年には3D NANDの量産データで、複数層をまとめて最適化すると、補正なしに比べて規格内のダイが29〜32%増えたと報告されています。ただしこれは2枚のウェハの平均で自己補正した結果で、より大きなデータでの確認が必要とされています。',
    'IBMのロードマップでは、EPEを今の約3nmから約1.2nmへ下げることを目標にしています。',
    'また、自己整合のプロセスを使って、そもそも重ね合わせの許容量を広げる工夫も併用されます。',
  ], { eraIndex: 5 });
  // 左：EPE予算のドーナツグラフ（IRDS 2023 の推定）
  addText(slide, 'EPE予算の内訳（推定の一例）', MARGIN_X, 1.55, 4.6, 0.3, { fontSize: 13, bold: true, color: FUTURE.color });
  slide.addChart(pres.charts.DOUGHNUT, [{ name: 'EPE予算', labels: ['重ね合わせ', 'LER', 'その他'], values: [40, 25, 35] }], {
    x: MARGIN_X, y: 1.9, w: 3.3, h: 3.3,
    holeSize: 58,
    chartColors: [FUTURE.color, E4.color, 'C4C8D8'],
    showLegend: false, showTitle: false,
    showPercent: true, showValue: false, showLabel: false,
    dataLabelColor: C.white, dataLabelFontSize: 12, dataLabelFontFace: FONT, dataLabelFontBold: true,
  });
  addText(slide, 'EPE', MARGIN_X + 1.15, 3.33, 1.0, 0.45, { fontSize: 18, bold: true, color: FUTURE.color, align: 'center', valign: 'middle' });
  const legend = [[FUTURE.color, '重ね合わせ 40%'], [E4.color, 'LER（線の縁の荒れ）25%'], ['C4C8D8', 'その他 35%']];
  legend.forEach(([color, text], i) => {
    slide.addShape(pres.shapes.RECTANGLE, { x: MARGIN_X + 3.45, y: 2.72 + i * 0.42, w: 0.22, h: 0.22, fill: { color }, line: { color, width: 0.5 } });
    addText(slide, text, MARGIN_X + 3.78, 2.66 + i * 0.42, 2.4, 0.34, { fontSize: 11.5, valign: 'middle' });
  });
  addText(slide, 'IRDS 2023が紹介する数値シミュレーションの推定。「その他」は残りの割合', MARGIN_X, 5.3, 6.0, 0.5, { fontSize: 10, color: C.muted });
  // 左下：EPEの模式図
  addCard(slide, MARGIN_X, 5.75, 6.0, 1.05, { fill: C.gray });
  addText(slide, [{ text: 'EPE（Edge Placement Error）：', bold: true, color: FUTURE.color }, { text: 'パターンの端が狙った位置からどれだけずれたか。重ね合わせ・CDのばらつき・局所ばらつきがまとめて効く' }], MARGIN_X + 0.2, 5.82, 5.6, 0.92, { fontSize: 11.5, valign: 'middle' });

  const rx = 6.95;
  const rw = RIGHT_EDGE - rx;
  addBullets(slide, [
    lead('不良との相関：', 'EPEは重ね合わせやCDの個別指標より、パターン不良との相関が強い（Kwak et al. 2023）'),
    lead('EPE基準の最適化：', '露光量と重ね合わせのサブレシピで、ダイごとの最大EPEを小さくし、規格内のダイ（Dies in Spec）を増やす'),
    lead('目標：', 'IBMのロードマップはEPEを今の約3.0 nmから約1.2 nmへ（Gabor et al. 2026）'),
    lead('避ける工夫：', '自己整合（SAB・FSAV）で重ね合わせの許容量を広げる。FSAVはピッチ20 nmから必要（IRDS 2023）'),
  ], rx, 1.62, rw, 3.3, { fontSize: 12.5, space: 8 });
  addCard(slide, rx, 4.95, rw, 1.85, { fill: FUTURE.tint });
  addText(slide, 'EPE基準の最適化の報告例（規格内ダイの増え方）', rx + 0.2, 5.02, rw - 0.4, 0.3, { fontSize: 12, bold: true, color: FUTURE.color });
  const results = [
    ['DRAM（シミュレーション）', '最大 +5.4%', 'Kwak et al. 2023'],
    ['ロジック（シミュレーション、最大EPE −0.3 nm）', '+2%', 'Schelcher et al. 2024'],
    ['3D NAND量産データ（補正なし比、2ウェハで自己補正）', '+29〜32%', 'Lee et al. 2026'],
  ];
  results.forEach(([what, val, src], i) => {
    const y = 5.38 + i * 0.46;
    addText(slide, what, rx + 0.2, y, 3.0, 0.42, { fontSize: 10.5, valign: 'middle' });
    addText(slide, val, rx + 3.25, y, 1.1, 0.42, { fontSize: 12, bold: true, color: FUTURE.color, valign: 'middle' });
    addText(slide, src, rx + 4.4, y, rw - 4.5, 0.42, { fontSize: 9.5, color: C.muted, valign: 'middle' });
  });
  addSource(slide, '出典：IRDS 2023 Lithography、Kwak et al. (2023) Proc. SPIE 12496、Schelcher et al. (2024) Proc. SPIE 12955、Lee et al. (2026) Proc. SPIE 13981、Gabor et al. (2026)。');
}

// =====================================================================
// 22. 展望⑤ 計測とデータ
// =====================================================================
{
  const slide = newContentSlide('展望⑤｜計測・データ・AI', '計測とデータ：サブnm時代は「測り方」と「使い方」が勝負', [
    '展望の5つ目は、計測とデータの使い方です。',
    'KLAの2026年の報告では、総合不確かさが0.3nm以下の範囲では、制御指標への影響は5%未満でした。計測の仕様を、装置の数字だけでなく、制御にどれだけ効くかで決める方向に変わってきています。',
    '一方、光学の計測値とデバイス上の値の差であるNZOを安定に保つことが重要で、厚い膜や金属の多い積層では信号が弱くなるという課題があります。',
    '全部を測れない分は、仮想計測で補う取り組みが進んでいます。アライメント、レベリング、レンズ、APCのデータを格子状にそろえてU-Netで予測し、継続学習で経時変化に追従する方法などです。',
    'ただし、機械学習は測れない所の推定に使い、判定や再学習の基準は物理的な計測で持つことが大切です。これはこの資料からの提案です。',
  ], { eraIndex: 5 });
  // 左：仮想計測の流れ
  const inputs = ['アライメント', 'レベリング', 'レンズ', 'APC'];
  inputs.forEach((t, i) => addChip(slide, t, MARGIN_X, 1.75 + i * 0.62, 1.5, 0.46, { fill: C.gray, color: C.ink, fontSize: 11.5 }));
  inputs.forEach((_, i) => addLine(slide, MARGIN_X + 1.52, 1.98 + i * 0.62, 2.55, 2.9, { color: C.neutral, width: 1 }));
  addCard(slide, 2.6, 2.3, 1.85, 1.2, { fill: FUTURE.tint, line: FUTURE.color });
  addText(slide, [{ text: '仮想計測', bold: true, breakLine: true, color: FUTURE.color }, { text: 'U-Netなど', fontSize: 10.5 }], 2.65, 2.35, 1.75, 1.1, { fontSize: 13.5, align: 'center', valign: 'middle' });
  addLine(slide, 4.47, 2.9, 4.95, 2.9, { color: FUTURE.color, width: 1.75, arrow: true });
  addCard(slide, 5.0, 2.3, 1.55, 1.2, { fill: C.gray });
  addText(slide, '補正・\n異常検知', 5.05, 2.35, 1.45, 1.1, { fontSize: 12.5, bold: true, align: 'center', valign: 'middle' });
  addCard(slide, 2.6, 4.15, 3.95, 0.95, { fill: C.goldTint });
  addText(slide, '物理計測で検証し、再学習の基準を持つ（本資料の提案）', 2.75, 4.2, 3.65, 0.85, { fontSize: 11.5, bold: true, color: C.gold, valign: 'middle' });
  addLine(slide, 3.5, 4.12, 3.5, 3.53, { color: C.gold, width: 1.5, arrow: true });
  addText(slide, '多くのデータを格子状にそろえて学習し、継続学習で経時変化に追従（Park et al. 2025）', MARGIN_X, 5.2, 6.0, 0.45, { fontSize: 10.5, color: C.muted });

  const rx = 6.95;
  const rw = RIGHT_EDGE - rx;
  addBullets(slide, [
    lead('計測の仕様：', '装置の数字より「制御への効き方」で決める方向へ（Klein & Gutman 2026）'),
    lead('NZOの安定：', '光学（ADI）とデバイス上の値（AEI・電子線）の差を安定に保つ。厚い膜・金属の多い積層では信号が弱まる（Katz et al. 2026）'),
    lead('仮想計測：', 'アライメント・レベリング・レンズ・APCのデータからずれを予測（Park et al. 2025）。予測の根拠を示す手法も（Choi et al. 2026）'),
    lead('原因分析：', '主成分分析で変動の主なパターンを取り出し、工程の文脈と結び付ける（Mohammad et al. 2026）。非リソ工程の影響も機械学習で特定（Daniel et al. 2018）'),
  ], rx, 1.62, rw, 3.9, { fontSize: 12.5, space: 8 });
  const nums = [
    ['0.3 nm以下', '総合不確かさ（TMU）がこの範囲なら、制御指標への寄与は5%未満', 'Klein & Gutman 2026'],
    ['60%・75%', '主成分分析の上位2モード・4モードで説明できた変動の割合', 'Mohammad et al. 2026'],
    ['36%', 'エッチング後のデバイス内計測で制御したときの改善（DRAM量産）', 'Park et al. 2018'],
  ];
  const cw3 = (CONTENT_W - 0.4) / 3;
  nums.forEach(([big, body, src], i) => {
    const x = MARGIN_X + i * (cw3 + 0.2);
    addCard(slide, x, 5.72, cw3, 1.12, { fill: FUTURE.tint });
    addText(slide, big, x + 0.15, 5.77, 1.75, 1.02, { fontSize: 19, bold: true, color: FUTURE.color, valign: 'middle' });
    addText(slide, body, x + 1.9, 5.8, cw3 - 2.05, 0.72, { fontSize: 10.5, valign: 'middle' });
    addText(slide, src, x + 1.9, 6.5, cw3 - 2.05, 0.28, { fontSize: 9, color: C.muted });
  });
  addSource(slide, '出典：Klein & Gutman (2026)、Katz et al. (2026)、Park et al. (2025) Proc. SPIE 13426、Choi et al. (2026) Proc. SPIE 13981、Mohammad et al. (2026) Proc. SPIE 13981、Daniel et al. (2018)、Park et al. (2018)。');
}

// =====================================================================
// 23. これからのロードマップ（2026〜2035年）
// =====================================================================
{
  const slide = newContentSlide('展望｜2026〜2035年', 'これからのロードマップ：計画・予測・見通しを分けて見る', [
    'これからのロードマップを、発表済みの計画、中期の予測、長期の見通しの3つに分けて整理しました。',
    '2027年ごろまでは、High-NA EUVの量産適用、GAAと裏面電源の量産、貼り合わせ歪みの前送りが中心です。',
    '2028年から2030年は、ASMLのNXE:4000Fや、DRAMの4F²と貼り合わせ、縦型DRAMへの移行が予想され、IRDSの要求値は1.6nmです。',
    '2031年以降は、CFETやHyper-NAが検討されており、IRDSでは1.5nm前後ですが、KLAとimecは1nmを大きく下回る制御が必要になると指摘しています。',
    '右に行くほど不確かさが大きいので、実現時期は変わりうるものとして見てください。一部の項目は、この資料での整理による予測です。',
  ], { eraIndex: 5 });
  const cols = [
    { head: '2026〜2027年', sub: '発表済みの計画', fill: 'E5DBF2' },
    { head: '2028〜2030年', sub: '中期の予測', fill: 'EEE6F7' },
    { head: '2031〜2035年', sub: '長期の見通し・研究', fill: 'F5F0FA' },
  ];
  const labelW = 1.6;
  const gx = MARGIN_X + labelW + 0.1;
  const cw = (RIGHT_EDGE - gx) / cols.length;
  cols.forEach((c, i) => {
    const x = gx + i * cw;
    slide.addShape(pres.shapes.PENTAGON, { x: x + 0.02, y: 1.45, w: cw - 0.02, h: 0.6, fill: { color: FUTURE.color, transparency: i * 25 }, line: { color: FUTURE.color, width: 0.5 } });
    addText(slide, [{ text: c.head, bold: true, fontSize: 13, breakLine: true }, { text: c.sub, fontSize: 10.5 }], x + 0.15, 1.47, cw - 0.5, 0.56, { color: C.white, valign: 'middle' });
  });
  const lanes = [
    ['露光技術', [
      'High-NA EUV（EXE:5200B/C）の量産適用。Intel 14Aのリスク生産は2027年の計画',
      'NXE:4000F（号機間<0.8 nm、250枚/時以上）※ASMLの計画',
      'Hyper-NA（NA 0.75）は2030年以降の選択肢。短波長・低NAの全面露光の研究（IBM）',
    ]],
    ['デバイス・集積', [
      'GAA＋裏面電源（Intel 18A、TSMC A16）の量産',
      'DRAMの4F²＋貼り合わせ。2030年ごろに縦型DRAMが主流に（KLA・imec）',
      'CFET（縦積みトランジスタ）。IBMのnanostack時代（金属ピッチ16 nm以下）',
    ]],
    ['要求値（IRDS 2021）', [
      '2.0 nm（2025年の値）',
      '1.6 nm（2028年）',
      '1.6 nm（2031年）→ 1.5 nm（2034年）。KLA・imecは「1 nmを大きく下回る」制御を指摘',
    ]],
    ['補正・制御', [
      'ウェハごとの前送り。貼り合わせ歪みを測って露光へ前送り（2027年〜）',
      '継ぎ目（半分の露光範囲）と低NA／High-NAの混用を考えた補正。EPE基準の多層最適化',
      '成膜・貼り合わせ・露光をまたぐ協調制御 ※本資料の予測',
    ]],
    ['計測・データ', [
      'NZOの安定性の管理。赤外による貼り合わせ後の計測',
      'サブnmの確度、デバイス内の高密度計測、仮想計測の本格利用 ※予測',
      '厚い積層・不透明な膜を通して測る（3D DRAM など）※予測',
    ]],
  ];
  const y0 = 2.15;
  const lh = 0.9;
  lanes.forEach(([label, cells], r) => {
    const y = y0 + r * lh;
    addCard(slide, MARGIN_X, y + 0.03, labelW, lh - 0.08, { fill: C.gray, radius: 0.06 });
    addText(slide, label, MARGIN_X + 0.08, y + 0.03, labelW - 0.16, lh - 0.08, { fontSize: 11.5, bold: true, align: 'center', valign: 'middle' });
    cells.forEach((text, i) => {
      const x = gx + i * cw;
      addCard(slide, x + 0.03, y + 0.03, cw - 0.06, lh - 0.08, { fill: cols[i].fill, radius: 0.05 });
      addText(slide, text, x + 0.14, y + 0.07, cw - 0.28, lh - 0.14, { fontSize: 10.5, valign: 'middle' });
    });
  });
  addSource(slide, '出典：ASML 2024 Investor Day、Bits&Chips (2025)、Intel 10-K（2025年度）、TrendForce (2024)、Nikon (2026)、IRDS 2021、Katz et al. (2026)、Gabor et al. (2026)。2028年以降は各社の計画・論文の見通しを含み、実現時期は変わりうる。「※本資料の予測」は出典の傾向からの整理。', { y: 6.72, h: 0.5, fontSize: 8.5 });
}

// =====================================================================
// 24. 実務への示唆
// =====================================================================
{
  const slide = newContentSlide('実務への示唆', '今から備えておきたい5つのこと', [
    '実務への示唆を5つにまとめました。',
    '1つ目は、指標をそろえることです。製品上の重ね合わせや残差だけでなく、NZOの安定性や、EPEの規格内ダイの割合まで見ます。',
    '2つ目は、モデルの項を選ぶことです。項を増やせば良いわけではなく、サンプリングの設計と、Lassoや交差検証による項の選択をセットで行います。',
    '3つ目は、データをつなぐことです。アライメント、レベリング、レンズ、APC、非リソ工程の情報を、ウェハやショットの単位で結び付けて残しておくと、原因の分析や仮想計測に使えます。',
    '4つ目は、工程をまたぐ仕組みです。ウェハの形状、応力、貼り合わせ、マスクの情報を露光に前送りできるようにしておきます。',
    '5つ目は、推定と判定を分けることです。これはこの資料からの提案です。',
    '各カードの下の白い枠は、すぐに試せる具体例で、この資料での提案です。',
  ]);
  const items = [
    ['指標をそろえる', '製品上の重ね合わせ・残差に加え、NZOの安定性と、EPEの規格内ダイの割合まで見る', '例：OPOの3σ、補正後の残差、NZOの日ごとの変動、規格内ダイの割合を同じ表で追う', 'Klein & Gutman 2026、Kwak et al. 2023'],
    ['モデルは項を選ぶ', '項を増やすほどノイズに弱い。サンプリングの設計と、項の選択（Lasso・交差検証）をセットで', '例：1ショットの計測点数と項数を比べ、項を増やす前にノイズの影響を見積もる', 'Klein & Gutman 2026、Ehrlich et al. 2025'],
    ['データをつなぐ', 'アライメント・レベリング・レンズ・APC・非リソ工程の文脈を、ウェハ・ショット単位で結び付けて残す', '例：ロット・ウェハ・ショット・マーク座標と、装置・チャック・レチクル・前工程の装置を同じキーで結ぶ', 'Park et al. 2025、Daniel et al. 2018'],
    ['工程をまたぐ', 'ウェハ形状・応力・貼り合わせ・マスク位置の情報を、露光へ前送りできる仕組みを作る', '例：成膜後のウェハ形状、貼り合わせ後の歪み、マスクの位置誤差マップを前送りの入力にする', 'KLA PWG、Goto et al. 2024、van Haren et al. 2019'],
    ['推定と判定を分ける', '仮想計測や機械学習は「測れない所の推定」に使い、判定と再学習の基準は物理計測で持つ', '例：予測誤差を実測で定期的に確かめ、ずれたら再学習する基準を先に決めておく', '本資料の提案'],
  ];
  const n = items.length;
  const gap = 0.16;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  items.forEach(([head, body, example, src], i) => {
    const x = MARGIN_X + i * (w + gap);
    const era = ERAS[i + 1];
    addCard(slide, x, 1.6, w, 4.4, { fill: C.gray });
    addNode(slide, x + 0.42, 2.05, 0.52, era.color, String(i + 1), { fontSize: 16 });
    addText(slide, head, x + 0.2, 2.45, w - 0.4, 0.52, { fontSize: 14.5, bold: true, color: era.color, valign: 'middle' });
    addText(slide, body, x + 0.2, 3.0, w - 0.4, 1.35, { fontSize: 12 });
    addCard(slide, x + 0.12, 4.35, w - 0.24, 1.15, { fill: C.white, radius: 0.06 });
    addText(slide, example, x + 0.22, 4.4, w - 0.44, 1.05, { fontSize: 10.5, color: C.ink, valign: 'middle' });
    addText(slide, src, x + 0.2, 5.55, w - 0.4, 0.42, { fontSize: 9, color: C.muted, valign: 'middle' });
  });
  addCard(slide, MARGIN_X, 6.12, CONTENT_W, 0.68, { fill: C.tint });
  addText(slide, '共通する考え方：誤差の出どころを分けて、直せる場所で、直せる速さで直す', MARGIN_X + 0.25, 6.12, CONTENT_W - 0.5, 0.68, { fontSize: 14, bold: true, color: C.primary, valign: 'middle' });
}

// =====================================================================
// 25. まとめ
// =====================================================================
{
  const slide = pres.addSlide();
  pageNumber += 1;
  slide.background = { color: C.night };
  addText(slide, 'まとめ', 0.8, 0.7, 6, 0.6, { fontSize: 30, bold: true, color: C.white });
  const messages = [
    [E2.color, '歴史は「自由度を広げる」歴史', '目と手 → 線形（ウェハ6項＋ショット6項）→ 高次・ショットごと → ウェハごとの前送り → 工程をまたぐ補正へ'],
    [E4.color, '要求は約1/5に、指標は製品へ', '要求は2007年の13 nmから2022年の2.4 nmへ、2030年代は1.5 nm前後（ITRS 2007・IRDS 2021）。指標は装置の試験値 → 製品上（OPO）・NZO → EPEへ'],
    [FUTURE.color, 'これからの主役はウェハの変形と継ぎ目', '貼り合わせ・裏面配線・High-NAの継ぎ合わせに、前送りと工程横断の制御、計測とデータの統合で立ち向かう'],
  ];
  messages.forEach(([color, head, body], i) => {
    const y = 1.5 + i * 1.45;
    addNode(slide, 1.2, y + 0.45, 0.62, color, String(i + 1), { fontSize: 20, lineColor: C.white });
    addText(slide, head, 1.8, y + 0.05, 10.6, 0.5, { fontSize: 20, bold: true, color: C.white, valign: 'middle' });
    addText(slide, body, 1.8, y + 0.62, 10.6, 0.8, { fontSize: 14, color: C.onDarkSub });
  });
  drawTarget(slide, 11.55, 0.65, 0.9, { outer: C.primaryLight, inner: FUTURE.color, lineWidth: 2, innerTransparency: 10 });
  // 下：6つの時代を一言で
  const keywords = ['目と手', 'EGA・線形', '2ステージ・APC', '高次・CPE', 'OPO・NZO', '工程横断'];
  const sx0 = 1.4;
  const sStep = (SLIDE_W - 2.8) / (ERAS.length - 1);
  const sy = 6.15;
  addLine(slide, sx0, sy, sx0 + sStep * (ERAS.length - 1), sy, { color: C.primaryLight, width: 1 });
  ERAS.forEach((era, i) => {
    const cx = sx0 + i * sStep;
    addNode(slide, cx, sy, 0.3, era.color, '', { lineColor: C.white });
    addText(slide, `${i === 5 ? '2026〜' : era.start}　${keywords[i]}`, cx - 1.0, sy + 0.2, 2.0, 0.3, { fontSize: 11, color: C.onDarkSub, align: 'center' });
  });
  addText(slide, String(pageNumber), SLIDE_W - 1.1, 7.05, 0.5, 0.3, { fontSize: 10, color: C.onDarkSub, align: 'right' });
  slide.addNotes([
    'まとめです。重ね合わせ制御の歴史は、補正の自由度を広げてきた歴史です。目と手で合わせる時代から、線形モデル、高次とショットごとの補正、ウェハごとの前送り、そして工程をまたぐ補正へと進んできました。',
    '要求値は、2007年の13nmから2022年の2.4nmまで下がり、2030年代には1.5nm前後が求められます。指標も、装置の試験値から、製品上の値、NZO、そしてEPEへと変わっています。',
    'これからは、貼り合わせ、裏面配線、High-NAの継ぎ合わせによるウェハの変形が主な課題になり、前送りと工程をまたぐ制御、そして計測とデータの統合が鍵になります。',
  ].join('\n'));
}

// =====================================================================
// 26. 用語集
// =====================================================================
{
  const slide = newContentSlide('用語集', '用語集：この資料で使った主な言葉', [
    'この資料で使った主な用語をまとめました。略語が多い分野なので、必要に応じて参照してください。',
    'OPOは製品上の重ね合わせ、MMOやDCOは装置の試験値で、定義が違う点に注意してください。',
    'NZOは、現像後の光学計測とエッチング後のデバイス上の値との系統的な差です。',
  ]);
  const left = [
    ['OPO', '製品上の重ね合わせ（On-Product Overlay）。補正後に製品ウェハ上に残るずれ'],
    ['MMO / DCO', '号機間／同じチャックでの重ね合わせ性能（装置の試験値）'],
    ['ADI / AEI', '現像後の検査／エッチング後の検査'],
    ['NZO', '非ゼロオフセット。ADIの光学計測とAEIのデバイス上の値との系統的な差'],
    ['TIS / TMU', '計測装置のくせによるずれ／総合的な計測の不確かさ'],
    ['EGA', '一部のショットを測り、最小二乗でショット配列を推定するアライメント'],
    ['APC（R2R）', 'ロットごとに補正値を更新する工程制御'],
    ['HOPC / iHOPC', 'ウェハ全体／ショット内の高次の補正'],
    ['CPE', 'ショットごとの補正（Correction Per Exposure）'],
  ];
  const right = [
    ['HOWA', '高次のウェハアライメント'],
    ['DBO / μDBO', '回折を使う重ね合わせ計測／その小型ターゲット'],
    ['AIM', '格子型の像計測ターゲット（Advanced Imaging Metrology）'],
    ['IDM', 'デバイス内計測。エッチング後にデバイスのパターンを測る'],
    ['EPE', 'エッジ配置誤差。重ね合わせ・CD・局所ばらつきをまとめた指標'],
    ['BSPDN', '裏面電源配線（Backside Power Delivery Network）'],
    ['CFET', 'nMOSとpMOSを縦に積むトランジスタ'],
    ['W2W / D2W', 'ウェハどうし／チップとウェハの貼り合わせ'],
    ['VM', '仮想計測。装置のデータから計測値を推定する'],
  ];
  const cw = (CONTENT_W - 0.3) / 2;
  addTableBox(slide, tableRows(['用語', '意味'], left, { fontSize: 11 }), MARGIN_X, 1.55, cw, [1.45, cw - 1.45], { rowH: 0.5, fontSize: 11 });
  addTableBox(slide, tableRows(['用語', '意味'], right, { fontSize: 11 }), MARGIN_X + cw + 0.3, 1.55, cw, [1.45, cw - 1.45], { rowH: 0.5, fontSize: 11 });
}

// =====================================================================
// 27・28. 参考文献
// =====================================================================
const REFERENCES = [
  // 歴史・ロードマップ
  'Mack, C. A. (2005). Milestones in Optical Lithography Tool Suppliers. lithoguru.com',
  'Kato, A. (2007). Chronology of Lithography Milestones, Version 0.9. lithoguru.com',
  'MacMillen, D., & Ryden, W. D. (1982). Analysis of image field placement deviations of a 5x microlithographic reduction lens. Proc. SPIE 334, 78–89. doi:10.1117/12.933563',
  'Slonaker, S., et al. (1988). Enhanced global alignment for production optical lithography. Proc. SPIE 922, 73–81. doi:10.1117/12.968404',
  'Nikon. US 4,780,617 (1988); US 5,493,402 A. EGA alignment method（EGAの方法）',
  'ITRS (2007). International Technology Roadmap for Semiconductors 2007: Lithography',
  'IRDS (2021, 2022, 2023). International Roadmap for Devices and Systems: Lithography. IEEE',
  'Adel, M., et al. (2007). The challenges of transitioning from linear to high-order overlay control in advanced lithography. Proc. SPIE 6827, 682722. doi:10.1117/12.778457',
  'Huang, C.-Y., et al. (2009). Using intrafield high-order correction to achieve overlay requirement beyond sub-40nm node. Proc. SPIE 7272, 72720I. doi:10.1117/12.813628',
  'Kohno, H., et al. (2010). Latest performance of immersion scanner S620D with the Streamlign platform for the double patterning generation. Proc. SPIE 7640, 76401O. doi:10.1117/12.846485',
  'Maas, J., et al. (2011). YieldStar: a new metrology platform for advanced lithography control. Proc. SPIE 7985, 79850H. doi:10.1117/12.896902',
  'Matsuyama, T. (2015). Exposure tool control for advanced semiconductor lithography. Adv. Opt. Techn. 4(4), 285–296. doi:10.1515/aot-2015-0026',
  'Ju, J., et al. (2016). Application of overlay modeling and control with Zernike polynomials in an HVM environment. Proc. SPIE 9778, 977825. doi:10.1117/12.2219739',
  'van de Kerkhof, M., et al. (2017). Enabling sub-10nm node lithography: presenting the NXE:3400B EUV scanner. Proc. SPIE 10143, 101430D. doi:10.1117/12.2258025',
  'Park, D.-K., et al. (2018). Unique method for controlling device level overlay with high-NA optical overlay technique using YieldStar in a DRAM HVM environment. Proc. SPIE 10585, 105850V. doi:10.1117/12.2297094',
  'Daniel, D., et al. (2018). Understanding overlay signatures using machine learning on non-lithography context information. Proc. SPIE 10585, 105851U. doi:10.1117/12.2303487',
  'van Haren, R., et al. (2019). The impact of the reticle and wafer alignment mark placement accuracy on the intra-field mask-to-mask overlay. Proc. SPIE 11178, 111780R. doi:10.1117/12.2535900',
  'Chang, L.-T., et al. (2022). In device overlay control with multiple overlay metrology in 3D-NAND process. Proc. SPIE 12053, 120531P. doi:10.1117/12.2613193',
];
const REFERENCES_2 = [
  'Ip, N., et al. (2023). Overlay performance in permanent bonded wafer integration schemes. Proc. SPIE 12496, 1249618. doi:10.1117/12.2654679',
  'Kwak, I., et al. (2023). EPE-aware process optimization for scanner dose and overlay in DRAM use case. Proc. SPIE 12496, 124960N. doi:10.1117/12.2658274',
  'Goto, T., et al. (2024). Advanced overlay metrology for wafer bonding applications. Proc. SPIE 12955, 129550T. doi:10.1117/12.3010317',
  'Roy, N. A. K., et al. (2024). Advanced processing control for wafer-to-wafer hybrid bonding. Proc. SPIE 12955, 129551Q. doi:10.1117/12.3010036',
  'Schelcher, G., et al. (2024). Feature grouping to enable edge placement error-aware process control in multi-feature logic use case. Proc. SPIE 12955, 129550O. doi:10.1117/12.3010421',
  'Park, W., et al. (2025). A grid mapping-based U-net algorithm for photolithography overlay virtual metrology. Proc. SPIE 13426, 134260K. doi:10.1117/12.3051382',
  'Ehrlich, C., et al. (2025). Cherry-picking: automated model term selection for precise overlay and CD process control. Proc. SPIE 13426, 134260U. doi:10.1117/12.3051064',
  'Gabor, A., et al. (2026). IBM lithography roadmap: shorter-wavelength lithography, resist and mask requirements to reduce stochastic defects. Proc. SPIE 13979, 139790R. doi:10.1117/12.3091000',
  'Katz, S., et al. (2026). Optical overlay metrology challenges in next-gen semiconductor nodes. Proc. SPIE 13981, 139811A. doi:10.1117/12.3090568',
  'Klein, D., & Gutman, N. (2026). Overlay metrology performance specification challenge entering the sub-nanometer overlay era. Proc. SPIE 13981, 139813L. doi:10.1117/12.3090660',
  'Lee, H. J., et al. (2026). Edge placement error-aware through-stack overlay optimization for a FLASH multilayer product stack. Proc. SPIE 13981, 139811C. doi:10.1117/12.3089745',
  'Mohammad, S. N., et al. (2026). Leveraging principal component analysis for overlay variation and root cause discovery in high-volume manufacturing. Proc. SPIE 13981, 139813U. doi:10.1117/12.3090685',
  'Choi, H., et al. (2026). GRACE: a gradient-based model-agnostic explainability framework for photolithography overlay virtual metrology. Proc. SPIE 13981, 1398138. doi:10.1117/12.3089595',
  'Kim, H.-S., et al. (2023). Enhancement of overlay metrology accuracy by multi-wavelength scatterometry with rotated quadrupole illumination. Proc. SPIE 12496, 1249620. doi:10.1117/12.2657678',
  'KLA特許：US 10,444,639 B2 (2019) Layer-to-layer feedforward overlay control with alignment corrections／US 11,221,561 B2 (2022) Wafer-by-wafer overlay feedforward and lot-to-lot feedback control',
  'ASML：沿革、NXT:1950i発表 (2008)、ホリスティック・リソグラフィ (2010)、NXT:1980Di発表 (2015)、TWINSCAN 20年 (2021)、Annual Report 2021、2022年第3四半期決算、2024年上半期報告、NXE:3400B・NXT:2000i/2050i/2100i製品ページ、2024 Investor Day（SEC Form 6-K Ex. 99.4）、High-NA解説 (2024)',
  'Nikon：NSR-S635E (2018)、NSR-S636E製品ページ、Litho Booster 1000 (2025-12-11、2026-07-29)／Canon：FPA-1200NZ2C (2023-10-13)／KLA：PWG2 (2017)・PWG5 (2020)／Lam Research (2019-08-07)',
  '報道ほか：EDN (2003-02-19) Archer AIM、Bits&Chips (2025-12-16) EXE:5200B、SiliconANGLE (2026-07-15)、TrendForce (2024-11-26) TSMC A16、Intel 10-K（2025年度）',
];
[[REFERENCES, '参考文献（1/2）：歴史・装置・制御'], [REFERENCES_2, '参考文献（2/2）：最近の研究・各社資料']].forEach(([list, title], k) => {
  const slide = newContentSlide('参考文献', title, [
    '本資料で参照した主な文献と資料です。数値は、それぞれの出典の記載を引用しています。',
    'ウェブの資料は2026年9月26日に確認した内容です。URLは生成元フォルダの参考文献リンク一覧にまとめています。',
  ]);
  const half = Math.ceil(list.length / 2);
  const cw = (CONTENT_W - 0.4) / 2;
  addBullets(slide, list.slice(0, half), MARGIN_X, 1.55, cw, 5.35, { fontSize: 9.5, space: 5, indent: 10, color: C.ink });
  addBullets(slide, list.slice(half), MARGIN_X + cw + 0.4, 1.55, cw, 5.35, { fontSize: 9.5, space: 5, indent: 10, color: C.ink });
  if (k === 1) addText(slide, '確認日：2026年9月26日', MARGIN_X, 7.0, 4, 0.3, { fontSize: 9, color: C.muted });
});

pres.writeFile({ fileName: OUTPUT_PATH }).then((file) => console.log(`書き出し: ${file}（${pageNumber} 枚）`));
