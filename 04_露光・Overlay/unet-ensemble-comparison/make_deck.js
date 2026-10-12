// U-Netアンサンブル構成比較資料を生成するスクリプト
const pptxgen = require("pptxgenjs");

// ===== 定数（色・サイズ・フォント）=====
const COLOR_DEEP = "21295C";     // 濃紺（背景・強調）
const COLOR_MAIN = "065A82";     // メインブルー
const COLOR_SUB = "1C7293";      // サブティール
const COLOR_ACCENT = "F2A65A";   // アクセント（オレンジ）
const COLOR_WHITE = "FFFFFF";
const COLOR_TEXT = "222B38";
const COLOR_MUTED = "6B7785";
const COLOR_LIGHT = "EDF2F6";    // カード背景

const FONT = "Meiryo";

const SLIDE_W_IN = 13.33;
const SLIDE_H_IN = 7.5;
const MARGIN_IN = 0.6;

const TITLE_SIZE_PT = 30;
const HEAD_SIZE_PT = 16;
const BODY_SIZE_PT = 13;
const SMALL_SIZE_PT = 11;
const CAPTION_SIZE_PT = 10;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Claude Code";
pres.title = "U-Netアンサンブル構成比較";

// ===== 共通パーツ =====

// 中身のスライド（明るい背景）にタイトルを置く
function addSlideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: MARGIN_IN, y: 0.35, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.65,
    fontFace: FONT, fontSize: TITLE_SIZE_PT, bold: true, color: COLOR_DEEP, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN_IN, y: 1.02, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.35,
      fontFace: FONT, fontSize: SMALL_SIZE_PT, color: COLOR_MUTED, margin: 0,
    });
  }
}

// ブロック図の箱
function addBlock(slide, opts) {
  const fill = opts.fill || COLOR_MAIN;
  slide.addShape(pres.ShapeType.roundRect, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: fill }, rectRadius: 0.08,
    line: { color: opts.line || fill, width: 1 },
    shadow: { type: "outer", angle: 90, blur: 6, offset: 0.04, opacity: 0.18, color: "000000" },
  });
  slide.addText(opts.text, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fontFace: FONT, fontSize: opts.size || SMALL_SIZE_PT, bold: opts.bold !== false,
    color: opts.color || COLOR_WHITE, align: "center", valign: "middle", margin: 0.02,
  });
}

// 矢印（水平・垂直）
function addArrow(slide, x, y, w, h, color) {
  slide.addShape(pres.ShapeType.line, {
    x, y, w, h,
    line: { color: color || COLOR_MUTED, width: 2, endArrowType: "triangle" },
  });
}

// 説明用の小さなラベル
function addLabel(slide, text, x, y, w, opts) {
  slide.addText(text, {
    x, y, w, h: (opts && opts.h) || 0.28,
    fontFace: FONT, fontSize: (opts && opts.size) || CAPTION_SIZE_PT,
    color: (opts && opts.color) || COLOR_MUTED,
    align: (opts && opts.align) || "center", margin: 0, italic: !!(opts && opts.italic),
  });
}

// 「ねらい / 論点」のカード（各構成スライドの下段）
function addNoteCards(slide, cards, y) {
  const gap = 0.3;
  const total = SLIDE_W_IN - MARGIN_IN * 2;
  const w = (total - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, i) => {
    const x = MARGIN_IN + i * (w + gap);
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w, h: 1.35, fill: { color: COLOR_LIGHT }, rectRadius: 0.06,
      line: { color: COLOR_LIGHT, width: 1 },
    });
    slide.addShape(pres.ShapeType.ellipse, {
      x: x + 0.18, y: y + 0.18, w: 0.32, h: 0.32,
      fill: { color: card.accent ? COLOR_ACCENT : COLOR_MAIN }, line: { color: "FFFFFF", width: 0 },
    });
    slide.addText(card.mark, {
      x: x + 0.18, y: y + 0.18, w: 0.32, h: 0.32,
      fontFace: FONT, fontSize: 10, bold: true, color: COLOR_WHITE,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(card.title, {
      x: x + 0.6, y: y + 0.16, w: w - 0.78, h: 0.36,
      fontFace: FONT, fontSize: 12, bold: true, color: COLOR_DEEP, valign: "middle", margin: 0,
    });
    slide.addText(card.body, {
      x: x + 0.22, y: y + 0.58, w: w - 0.44, h: 0.65,
      fontFace: FONT, fontSize: SMALL_SIZE_PT, color: COLOR_TEXT, valign: "top", margin: 0,
    });
  });
}

// ===== 1. タイトル =====
{
  const s = pres.addSlide();
  s.background = { color: COLOR_DEEP };
  s.addText("U-Netアンサンブル構成の比較検討", {
    x: 1.0, y: 2.2, w: 11.3, h: 0.9,
    fontFace: FONT, fontSize: 40, bold: true, color: COLOR_WHITE, margin: 0,
  });
  s.addText("Twin / Boosting / Bagging / Stacking / Multi-Layer U-Net", {
    x: 1.0, y: 3.15, w: 11.3, h: 0.5,
    fontFace: FONT, fontSize: 18, color: "9FC3D8", margin: 0,
  });
  s.addText("ネットワーク構成案と性能比較の進め方", {
    x: 1.0, y: 3.75, w: 11.3, h: 0.4,
    fontFace: FONT, fontSize: 13, color: "9FC3D8", margin: 0, italic: true,
  });
  ["Twin U-Net", "Boosting", "Bagging", "Stacking", "Multi-Layer"].forEach((t, i) => {
    const w = 2.1, gap = 0.22;
    const x = 1.0 + i * (w + gap);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 4.7, w, h: 0.55,
      fill: { color: i === 4 ? COLOR_ACCENT : COLOR_SUB }, rectRadius: 0.08,
      line: { color: i === 4 ? COLOR_ACCENT : COLOR_SUB, width: 1 },
    });
    s.addText(t, {
      x, y: 4.7, w, h: 0.55, fontFace: FONT, fontSize: 12, bold: true,
      color: i === 4 ? COLOR_DEEP : COLOR_WHITE, align: "center", valign: "middle", margin: 0,
    });
  });
  s.addNotes("目的：単一U-Netに対して、5つの組み合わせ方の効果を同一条件で比較する。");
}

// ===== 2. 全体像 =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "検討する5つの構成", "共通のU-Netブロックを、どう組み合わせるかだけを変えて比較する");

  const items = [
    { no: "0", name: "Single U-Net（基準）", desc: "1本のU-Netで直接予測。すべての比較の基準線。" },
    { no: "1", name: "Twin U-Net", desc: "2本のU-Netを並列に置き、役割を分けて出力を統合する。" },
    { no: "2", name: "Boosting U-Net", desc: "1本目の残差（誤差）を2本目が学習し、足し合わせる。" },
    { no: "3", name: "Bagging U-Net", desc: "データを再抽出して複数本を独立学習し、平均する。" },
    { no: "4", name: "Stacking U-Net", desc: "各U-Netの予測値を特徴量として、メタモデルが最終予測。" },
    { no: "5", name: "Multi-Layer U-Net（本命）", desc: "予測値＋Raw特徴量をSkip Connectionで最終層へ直結。" },
  ];
  const cardW = 3.95, cardH = 1.9, gapX = 0.35, gapY = 0.35;
  items.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MARGIN_IN + col * (cardW + gapX);
    const y = 1.65 + row * (cardH + gapY);
    const isMain = it.no === "5";
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: cardW, h: cardH,
      fill: { color: isMain ? COLOR_DEEP : COLOR_LIGHT }, rectRadius: 0.07,
      line: { color: isMain ? COLOR_ACCENT : "D8E1E8", width: isMain ? 2 : 1 },
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5,
      fill: { color: isMain ? COLOR_ACCENT : COLOR_MAIN }, line: { color: COLOR_WHITE, width: 0 },
    });
    s.addText(it.no, {
      x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fontFace: FONT, fontSize: 16, bold: true,
      color: isMain ? COLOR_DEEP : COLOR_WHITE, align: "center", valign: "middle", margin: 0,
    });
    s.addText(it.name, {
      x: x + 0.9, y: y + 0.24, w: cardW - 1.15, h: 0.5,
      fontFace: FONT, fontSize: 14, bold: true,
      color: isMain ? COLOR_WHITE : COLOR_DEEP, valign: "middle", margin: 0,
    });
    s.addText(it.desc, {
      x: x + 0.3, y: y + 0.9, w: cardW - 0.6, h: 0.85,
      fontFace: FONT, fontSize: SMALL_SIZE_PT,
      color: isMain ? "CFE0EC" : COLOR_TEXT, valign: "top", margin: 0,
    });
  });
  s.addText("※ U-Netブロックの中身（層数・チャネル数・損失関数）は全構成で共通にし、組み合わせ方の差だけを見る", {
    x: MARGIN_IN, y: 6.15, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.35,
    fontFace: FONT, fontSize: CAPTION_SIZE_PT, color: COLOR_MUTED, margin: 0, italic: true,
  });
  s.addNotes("構成の差だけを見るため、U-Net単体の設計は固定する。");
}

// ===== 3. 共通のU-Netブロック =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "共通部品：U-Netブロック", "全構成で同じ骨格を使う。Encoder–Decoder＋Skip Connection");

  const encY = 1.9, boxW = 1.35, boxH = 0.62;
  const enc = ["入力\n(Raw特徴量)", "Enc1", "Enc2", "Enc3"];
  const dec = ["Dec3", "Dec2", "Dec1", "出力\n(予測値)"];

  enc.forEach((t, i) => {
    addBlock(s, {
      x: 1.1 + i * 1.75, y: encY, w: boxW, h: boxH,
      text: t, fill: i === 0 ? COLOR_DEEP : COLOR_MAIN, size: 10,
    });
    if (i < enc.length - 1) addArrow(s, 1.1 + i * 1.75 + boxW, encY + boxH / 2, 0.4, 0, COLOR_MAIN);
  });
  // ボトルネック
  addBlock(s, { x: 1.1 + 3 * 1.75 + 1.75, y: encY, w: boxW, h: boxH, text: "Bottleneck", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 10 });
  addArrow(s, 1.1 + 3 * 1.75 + boxW, encY + boxH / 2, 0.4, 0, COLOR_MAIN);

  const decY = 3.55;
  dec.forEach((t, i) => {
    const x = 1.1 + (3 - i) * 1.75;
    addBlock(s, {
      x: x, y: decY, w: boxW, h: boxH,
      text: t, fill: i === dec.length - 1 ? COLOR_DEEP : COLOR_SUB, size: 10,
    });
  });
  // Bottleneck → Dec3（縦に降りてから左へ）
  const bnX = 1.1 + 4 * 1.75 + boxW / 2;
  s.addShape(pres.ShapeType.line, {
    x: bnX, y: encY + boxH, w: 0, h: decY + boxH / 2 - (encY + boxH),
    line: { color: COLOR_ACCENT, width: 2 },
  });
  addArrow(s, bnX, decY + boxH / 2, -(bnX - (1.1 + 3 * 1.75 + boxW)), 0, COLOR_ACCENT);
  // Dec間の矢印（右から左）
  for (let i = 0; i < 3; i++) {
    const xRight = 1.1 + (3 - i) * 1.75;
    addArrow(s, xRight, decY + boxH / 2, -0.4, 0, COLOR_SUB);
  }
  // Skip Connection（Enc→Dec の縦線）
  for (let i = 1; i <= 3; i++) {
    const x = 1.1 + i * 1.75 + boxW / 2;
    s.addShape(pres.ShapeType.line, {
      x, y: encY + boxH, w: 0, h: decY - encY - boxH,
      line: { color: COLOR_ACCENT, width: 1.5, dashType: "dash", endArrowType: "triangle" },
    });
  }
  addLabel(s, "破線＝Skip Connection（Encoderの情報をDecoderへ直結）", 1.1, decY + boxH + 0.18, 7.0, { align: "left", color: COLOR_ACCENT, italic: true, size: 11 });

  addNoteCards(s, [
    { mark: "1", title: "入力", body: "Shot座標・Mark座標などのRaw特徴量をマップ状に配置" },
    { mark: "2", title: "出力", body: "計測値X・Yの予測値（またはZernike係数）" },
    { mark: "3", title: "固定条件", body: "層数・チャネル数・損失関数・学習率は全構成で共通", accent: true },
  ], 5.4);
  s.addNotes("U-Net単体の中身。以降のスライドではこれを1つの箱として描く。");
}

// ===== 4. Twin U-Net =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "構成1：Twin U-Net", "2本のU-Netを並列に置き、役割を分けて統合する");

  addBlock(s, { x: 0.8, y: 2.6, w: 1.7, h: 1.1, text: "入力\nRaw特徴量", fill: COLOR_DEEP, size: 11 });
  addArrow(s, 2.5, 3.15, 0.6, 0, COLOR_MUTED);

  addBlock(s, { x: 3.3, y: 1.95, w: 2.6, h: 1.0, text: "U-Net A\n（例：計測値X用）", fill: COLOR_MAIN, size: 11 });
  addBlock(s, { x: 3.3, y: 3.35, w: 2.6, h: 1.0, text: "U-Net B\n（例：計測値Y用）", fill: COLOR_SUB, size: 11 });
  s.addShape(pres.ShapeType.line, { x: 3.1, y: 3.15, w: 0, h: -0.7, line: { color: COLOR_MUTED, width: 2 } });
  s.addShape(pres.ShapeType.line, { x: 3.1, y: 3.15, w: 0, h: 0.7, line: { color: COLOR_MUTED, width: 2 } });
  addArrow(s, 3.1, 2.45, 0.2, 0, COLOR_MUTED);
  addArrow(s, 3.1, 3.85, 0.2, 0, COLOR_MUTED);

  addArrow(s, 5.9, 2.45, 0.9, 0.7, COLOR_MAIN);
  addArrow(s, 5.9, 3.85, 0.9, -0.7, COLOR_SUB);
  addBlock(s, { x: 6.9, y: 2.75, w: 2.0, h: 0.8, text: "統合層\n(Concat + Conv)", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 11 });
  addArrow(s, 8.9, 3.15, 0.6, 0, COLOR_MUTED);
  addBlock(s, { x: 9.6, y: 2.75, w: 2.0, h: 0.8, text: "最終予測", fill: COLOR_DEEP, size: 12 });

  addLabel(s, "2本は重みを共有しない（独立学習）／損失は統合後の出力で計算", 3.3, 4.55, 6.0, { align: "left", italic: true });

  addNoteCards(s, [
    { mark: "◎", title: "ねらい", body: "X系・Y系など性質の違う出力を別ネットに分担させ、干渉を減らす" },
    { mark: "△", title: "論点", body: "統合層の設計次第で片方に引きずられる。学習コストは約2倍" },
    { mark: "!", title: "確認項目", body: "共有Encoder版との差、統合を単純平均にした場合との差", accent: true },
  ], 5.5);
  s.addNotes("Twin U-Netは2本のU-Netの並列。統合層の設計が肝。");
}

// ===== 5. Boosting =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "構成2：U-Netによるブースティング", "前段の残差（誤差）を次段が学習し、予測を足し上げる");

  const y = 2.3, h = 0.95, w = 2.3;
  addBlock(s, { x: 0.7, y: y + 0.55, w: 1.5, h: h, text: "入力\nRaw特徴量", fill: COLOR_DEEP, size: 11 });

  const stages = [
    { x: 2.7, label: "U-Net #1", sub: "y を予測", fill: COLOR_MAIN },
    { x: 5.5, label: "U-Net #2", sub: "残差 r1 = y − ŷ1 を予測", fill: COLOR_SUB },
    { x: 8.3, label: "U-Net #3", sub: "残差 r2 を予測", fill: COLOR_SUB },
  ];
  stages.forEach((st, i) => {
    addBlock(s, { x: st.x, y: y + 0.35, w: w, h: h, text: st.label, fill: st.fill, size: 13 });
    addLabel(s, st.sub, st.x - 0.15, y + 1.4, w + 0.3, { size: CAPTION_SIZE_PT });
    if (i < stages.length - 1) addArrow(s, st.x + w, y + 0.82, 0.5, 0, COLOR_MUTED);
  });
  addArrow(s, 2.2, y + 1.02, 0.5, -0.2, COLOR_MUTED);

  // 出力の足し合わせ
  addBlock(s, { x: 11.0, y: y + 0.35, w: 1.7, h: h, text: "Σ 加算\n最終予測", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 12 });
  addArrow(s, 10.6, y + 0.82, 0.4, 0, COLOR_MUTED);
  stages.forEach((st) => {
    s.addShape(pres.ShapeType.line, {
      x: st.x + w / 2, y: y + 1.78, w: 0, h: y + 0.35 + h + 0.85 - (y + 1.78),
      line: { color: COLOR_ACCENT, width: 1.5, dashType: "dash" },
    });
    s.addShape(pres.ShapeType.line, {
      x: st.x + w / 2, y: y + 0.35 + h + 0.85, w: 11.85 - (st.x + w / 2), h: 0,
      line: { color: COLOR_ACCENT, width: 1.5, dashType: "dash" },
    });
  });
  addArrow(s, 11.85, y + 0.35 + h + 0.85, 0, -0.85, COLOR_ACCENT);
  addLabel(s, "ŷ = ŷ1 + η·ŷ2 + η·ŷ3　（η：学習率相当の縮小係数）", 2.7, y + 2.45, 7.0, { align: "left", color: COLOR_ACCENT, italic: true, size: 11 });

  addNoteCards(s, [
    { mark: "◎", title: "ねらい", body: "1本では取り切れない系統的な残差（高次成分）を段階的に削る" },
    { mark: "△", title: "論点", body: "残差はノイズ寄りになりやすく過学習しやすい。段数は2〜3段から" },
    { mark: "!", title: "確認項目", body: "段数ごとの検証RMSE推移、縮小係数ηの感度", accent: true },
  ], 5.5);
  s.addNotes("残差ブースティング。段数を増やすほど過学習リスクが上がる。");
}

// ===== 6. Bagging =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "構成3：U-Netによるバギング", "データを再抽出してN本を独立学習し、予測を平均する");

  addBlock(s, { x: 0.7, y: 2.75, w: 1.7, h: 1.0, text: "学習データ", fill: COLOR_DEEP, size: 12 });

  const subY = [1.75, 2.65, 3.55, 4.45];
  const names = ["Subset 1", "Subset 2", "Subset 3", "Subset N"];
  subY.forEach((yy, i) => {
    addBlock(s, { x: 3.0, y: yy, w: 1.7, h: 0.65, text: names[i], fill: COLOR_LIGHT, color: COLOR_TEXT, size: 10 });
    addBlock(s, { x: 5.3, y: yy, w: 2.0, h: 0.65, text: "U-Net #" + (i + 1), fill: i === 3 ? COLOR_SUB : COLOR_MAIN, size: 11 });
    addArrow(s, 4.7, yy + 0.33, 0.5, 0, COLOR_MUTED);
    addArrow(s, 2.4, 3.25, 0.55, yy + 0.33 - 3.25, COLOR_MUTED);
    addArrow(s, 7.3, yy + 0.33, 1.1, 3.25 - (yy + 0.33), COLOR_MAIN);
  });
  addBlock(s, { x: 8.5, y: 2.9, w: 1.9, h: 0.7, text: "平均 / 中央値", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 12 });
  addArrow(s, 10.4, 3.25, 0.5, 0, COLOR_MUTED);
  addBlock(s, { x: 11.0, y: 2.9, w: 1.7, h: 0.7, text: "最終予測", fill: COLOR_DEEP, size: 12 });
  addLabel(s, "Bootstrap抽出はWafer単位で行う（同一Waferの点を分割しない）", 3.0, 5.3, 6.5, { align: "left", italic: true });

  addNoteCards(s, [
    { mark: "◎", title: "ねらい", body: "初期値・データ揺らぎによる分散を平均で抑え、予測を安定させる" },
    { mark: "△", title: "論点", body: "バイアスは減らない。学習コストはN倍、推論もN回必要" },
    { mark: "!", title: "確認項目", body: "N=3/5/10でのRMSE飽和点、予測ばらつき（標準偏差）の可視化", accent: true },
  ], 5.7);
  s.addNotes("バギングは分散低減が目的。Waferをまたぐリークを防ぐため分割単位に注意。");
}

// ===== 7. Stacking =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "構成4：Stacking（AutoGluon型）", "各U-Netの予測値を「特徴量」として、メタモデルが最終予測を出す");

  addBlock(s, { x: 0.7, y: 2.7, w: 1.6, h: 1.0, text: "入力\nRaw特徴量", fill: COLOR_DEEP, size: 11 });

  const baseY = [1.85, 2.85, 3.85];
  const baseNames = ["U-Net A", "U-Net B", "U-Net C"];
  baseNames.forEach((n, i) => {
    addBlock(s, { x: 2.9, y: baseY[i], w: 2.1, h: 0.7, text: n, fill: COLOR_MAIN, size: 12 });
    addArrow(s, 2.3, 3.2, 0.55, baseY[i] + 0.35 - 3.2, COLOR_MUTED);
    addArrow(s, 5.0, baseY[i] + 0.35, 0.9, 3.2 - (baseY[i] + 0.35), COLOR_MAIN);
  });
  addLabel(s, "Level-0（ベースモデル）", 2.9, 4.68, 2.1, { color: COLOR_MAIN });

  addBlock(s, { x: 6.0, y: 2.85, w: 2.2, h: 0.7, text: "予測値を特徴量化\n(Out-of-Fold)", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 10 });
  addArrow(s, 8.2, 3.2, 0.6, 0, COLOR_MUTED);
  addBlock(s, { x: 8.9, y: 2.7, w: 2.1, h: 1.0, text: "メタモデル\n(Level-1)", fill: COLOR_SUB, size: 12 });
  addArrow(s, 11.0, 3.2, 0.5, 0, COLOR_MUTED);
  addBlock(s, { x: 11.5, y: 2.85, w: 1.3, h: 0.7, text: "最終\n予測", fill: COLOR_DEEP, size: 11 });

  addLabel(s, "※ 予測値は必ずOut-of-Fold（学習に使っていない分割）で作る。そうしないとメタモデルがリークで過信する",
    MARGIN_IN, 5.15, SLIDE_W_IN - MARGIN_IN * 2, { align: "left", color: COLOR_ACCENT, italic: true, size: 11 });

  addNoteCards(s, [
    { mark: "◎", title: "ねらい", body: "各モデルの得意領域をメタモデルが重み付けして使い分ける" },
    { mark: "△", title: "論点", body: "Raw特徴量がメタモデルに届かず、情報が予測値だけに圧縮される" },
    { mark: "!", title: "確認項目", body: "メタモデルの種類（線形／GBDT／小U-Net）による差", accent: true },
  ], 5.6);
  s.addNotes("Stackingの弱点＝Raw情報の欠落。これが次のMulti-Layer U-Netの動機になる。");
}

// ===== 8. Multi-Layer U-Net（本命）=====
{
  const s = pres.addSlide();
  s.background = { color: COLOR_DEEP };
  s.addText("構成5：Multi-Layer U-Net（本命案）", {
    x: MARGIN_IN, y: 0.35, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.65,
    fontFace: FONT, fontSize: TITLE_SIZE_PT, bold: true, color: COLOR_WHITE, margin: 0,
  });
  s.addText("U-Netの予測値を特徴量として使いつつ、Raw特徴量もSkip Connectionで最終予測へ直結する", {
    x: MARGIN_IN, y: 1.02, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.35,
    fontFace: FONT, fontSize: SMALL_SIZE_PT, color: "9FC3D8", margin: 0,
  });

  // 入力
  addBlock(s, { x: 0.7, y: 2.9, w: 1.6, h: 1.0, text: "入力\nRaw特徴量", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 11 });

  // Level-0
  const l0Y = [1.9, 2.85, 3.8];
  ["U-Net A", "U-Net B", "U-Net C"].forEach((n, i) => {
    addBlock(s, { x: 3.0, y: l0Y[i], w: 2.0, h: 0.65, text: n, fill: COLOR_MAIN, size: 12 });
    addArrow(s, 2.3, 3.4, 0.65, l0Y[i] + 0.33 - 3.4, "9FC3D8");
    addArrow(s, 5.0, l0Y[i] + 0.33, 1.0, 3.4 - (l0Y[i] + 0.33), COLOR_SUB);
  });
  addLabel(s, "Level-0：U-Net群", 3.0, 4.55, 2.0, { color: "9FC3D8" });

  // 結合層
  addBlock(s, { x: 6.2, y: 2.9, w: 2.3, h: 1.0, text: "特徴量結合\nConcat", fill: COLOR_SUB, size: 12 });
  addLabel(s, "予測値 ＋ Raw特徴量", 6.2, 2.52, 2.3, { color: "9FC3D8" });

  // Skip Connection（入力→結合層へ直結）
  s.addShape(pres.ShapeType.line, {
    x: 1.5, y: 3.9, w: 0, h: 1.55, line: { color: COLOR_ACCENT, width: 2.5 },
  });
  s.addShape(pres.ShapeType.line, {
    x: 1.5, y: 5.45, w: 5.85, h: 0, line: { color: COLOR_ACCENT, width: 2.5 },
  });
  addArrow(s, 7.35, 5.45, 0, -1.55, COLOR_ACCENT);
  s.addText("Skip Connection：Raw特徴量を圧縮せず最終層へ", {
    x: 1.6, y: 5.5, w: 5.6, h: 0.3,
    fontFace: FONT, fontSize: 11, bold: true, color: COLOR_ACCENT, margin: 0,
  });

  // Level-1 → 出力
  addArrow(s, 8.5, 3.4, 0.6, 0, "9FC3D8");
  addBlock(s, { x: 9.15, y: 2.9, w: 2.0, h: 1.0, text: "最終予測層\n(Level-1)", fill: COLOR_MAIN, size: 12 });
  addArrow(s, 11.15, 3.4, 0.45, 0, "9FC3D8");
  addBlock(s, { x: 11.6, y: 3.05, w: 1.15, h: 0.7, text: "最終\n予測", fill: COLOR_ACCENT, color: COLOR_DEEP, size: 11 });

  s.addText("Stackingとの違い：メタモデルの入力が「予測値だけ」ではなく「予測値＋Raw特徴量」になる。予測値が外れた領域でもRaw情報から復帰できる。", {
    x: MARGIN_IN, y: 6.15, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.6,
    fontFace: FONT, fontSize: 13, color: COLOR_WHITE, margin: 0,
  });
  s.addNotes("本命案。AutoGluonのstackingにResNet的なskipを足した形。end-to-end学習と段階学習の両方を試す。");
}

// ===== 9. 比較表 =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "構成別の特徴まとめ", "何を減らしにいく手法なのかで整理する");

  const rows = [
    [
      { text: "構成", options: { bold: true } },
      { text: "主な効果", options: { bold: true } },
      { text: "学習コスト", options: { bold: true } },
      { text: "主なリスク", options: { bold: true } },
    ],
    ["Single U-Net（基準）", "―（比較の基準）", "×1", "表現力不足"],
    ["Twin U-Net", "出力ごとの分業", "×2", "統合層の設計依存"],
    ["Boosting", "バイアス低減", "×段数", "残差の過学習"],
    ["Bagging", "分散低減", "×N", "バイアスは残る"],
    ["Stacking", "モデルの使い分け", "×(N+1)", "Raw情報の欠落・リーク"],
    ["Multi-Layer U-Net", "使い分け＋Raw情報保持", "×(N+1)", "パラメータ増・実装複雑"],
  ];
  const tableRows = rows.map((r, i) =>
    r.map((c) => {
      const text = typeof c === "string" ? c : c.text;
      const isHead = i === 0;
      const isMain = rows[i][0] === "Multi-Layer U-Net";
      return {
        text,
        options: {
          bold: isHead || isMain,
          color: isHead ? COLOR_WHITE : (isMain ? COLOR_DEEP : COLOR_TEXT),
          fill: { color: isHead ? COLOR_DEEP : (isMain ? "FCE7CE" : (i % 2 ? COLOR_WHITE : "F5F8FA")) },
        },
      };
    })
  );
  s.addTable(tableRows, {
    x: MARGIN_IN, y: 1.7, w: SLIDE_W_IN - MARGIN_IN * 2,
    colW: [3.4, 3.3, 1.9, 3.53],
    rowH: 0.52, fontFace: FONT, fontSize: 12,
    border: { type: "solid", color: "D8E1E8", pt: 1 },
    valign: "middle", margin: 0.08,
  });
  s.addText("Boostingはバイアス、Baggingは分散を狙う。両者は排他ではないため、Multi-Layer U-Netの中で併用する案も検討対象。", {
    x: MARGIN_IN, y: 6.0, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.5,
    fontFace: FONT, fontSize: SMALL_SIZE_PT, color: COLOR_MUTED, margin: 0, italic: true,
  });
  s.addNotes("この表は仮説。実測で埋め直す。");
}

// ===== 10. 比較実験の条件 =====
{
  const s = pres.addSlide();
  addSlideTitle(s, "性能比較の条件", "構成以外の条件をそろえないと、差が構成の効果か分からない");

  const left = [
    { t: "データ分割", b: "Wafer単位でGroup K-Fold（同一Waferを学習と検証に分けない）" },
    { t: "評価指標", b: "計測値X・Yそれぞれの RMSE を主指標。副指標に最大残差・|3σ|" },
    { t: "固定条件", b: "U-Net本体の構造・損失関数・最適化手法・エポック数・乱数seed" },
  ];
  const right = [
    { t: "比較の基準", b: "Single U-Net を基準線とし、改善幅（%）で比較する" },
    { t: "ばらつき評価", b: "seedを3〜5通り変えて平均±標準偏差で報告する" },
    { t: "計算コスト", b: "学習時間・推論時間・パラメータ数も併記し、費用対効果で判断" },
  ];
  const colW = 5.9;
  [left, right].forEach((col, ci) => {
    const x = MARGIN_IN + ci * (colW + 0.53);
    col.forEach((item, i) => {
      const y = 1.75 + i * 1.5;
      s.addShape(pres.ShapeType.roundRect, {
        x, y, w: colW, h: 1.25, fill: { color: COLOR_LIGHT }, rectRadius: 0.06,
        line: { color: "D8E1E8", width: 1 },
      });
      s.addShape(pres.ShapeType.ellipse, {
        x: x + 0.25, y: y + 0.22, w: 0.38, h: 0.38,
        fill: { color: ci === 0 ? COLOR_MAIN : COLOR_SUB }, line: { color: COLOR_WHITE, width: 0 },
      });
      s.addText(String(ci * 3 + i + 1), {
        x: x + 0.25, y: y + 0.22, w: 0.38, h: 0.38, fontFace: FONT, fontSize: 12, bold: true,
        color: COLOR_WHITE, align: "center", valign: "middle", margin: 0,
      });
      s.addText(item.t, {
        x: x + 0.75, y: y + 0.2, w: colW - 1.0, h: 0.42,
        fontFace: FONT, fontSize: 14, bold: true, color: COLOR_DEEP, valign: "middle", margin: 0,
      });
      s.addText(item.b, {
        x: x + 0.3, y: y + 0.66, w: colW - 0.6, h: 0.5,
        fontFace: FONT, fontSize: SMALL_SIZE_PT, color: COLOR_TEXT, valign: "top", margin: 0,
      });
    });
  });
  s.addText("差が小さい場合は「構成を増やす価値なし」と結論づけてよい。改善幅と計算コストをセットで判断する。", {
    x: MARGIN_IN, y: 6.35, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.5,
    fontFace: FONT, fontSize: 12, color: COLOR_MUTED, margin: 0, italic: true,
  });
  s.addNotes("公平な比較の条件。ここを崩すと結論が使えなくなる。");
}

// ===== 11. 進め方 =====
{
  const s = pres.addSlide();
  s.background = { color: COLOR_DEEP };
  s.addText("進め方（案）", {
    x: MARGIN_IN, y: 0.6, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.7,
    fontFace: FONT, fontSize: TITLE_SIZE_PT, bold: true, color: COLOR_WHITE, margin: 0,
  });

  const steps = [
    { n: "STEP 1", t: "基準線をつくる", b: "Single U-Netを実装し、評価スクリプトとデータ分割を固定する" },
    { n: "STEP 2", t: "単純な2案を試す", b: "BaggingとTwin U-Netを実装。効果が出るかを早めに見極める" },
    { n: "STEP 3", t: "積み上げ系を試す", b: "BoostingとStackingを実装。Out-of-Fold処理を作り込む" },
    { n: "STEP 4", t: "本命を実装", b: "Multi-Layer U-Netを実装し、STEP1〜3の結果と比較する" },
  ];
  const w = 2.95, gap = 0.28;
  steps.forEach((st, i) => {
    const x = MARGIN_IN + i * (w + gap);
    const isLast = i === steps.length - 1;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.0, w, h: 2.4,
      fill: { color: isLast ? COLOR_ACCENT : "2E3A6E" }, rectRadius: 0.08,
      line: { color: isLast ? COLOR_ACCENT : "3D4B84", width: 1 },
    });
    s.addText(st.n, {
      x: x + 0.3, y: 2.25, w: w - 0.6, h: 0.35,
      fontFace: FONT, fontSize: 11, bold: true,
      color: isLast ? COLOR_DEEP : "9FC3D8", margin: 0,
    });
    s.addText(st.t, {
      x: x + 0.3, y: 2.65, w: w - 0.6, h: 0.8,
      fontFace: FONT, fontSize: 17, bold: true,
      color: isLast ? COLOR_DEEP : COLOR_WHITE, valign: "top", margin: 0,
    });
    s.addText(st.b, {
      x: x + 0.3, y: 3.28, w: w - 0.6, h: 1.0,
      fontFace: FONT, fontSize: SMALL_SIZE_PT,
      color: isLast ? "3A2F1E" : "CFE0EC", valign: "top", margin: 0,
    });
    if (i < steps.length - 1) {
      s.addShape(pres.ShapeType.line, {
        x: x + w, y: 3.2, w: gap, h: 0,
        line: { color: "9FC3D8", width: 2, endArrowType: "triangle" },
      });
    }
  });

  s.addText("次の確認事項：入力とするRaw特徴量の定義、正解ラベル（計測値そのものか、Zernike係数か）、使用可能なLot数", {
    x: MARGIN_IN, y: 5.0, w: SLIDE_W_IN - MARGIN_IN * 2, h: 0.6,
    fontFace: FONT, fontSize: 13, color: COLOR_WHITE, margin: 0,
  });
  s.addNotes("実装順序。基準線を先に固めるのが最重要。");
}

pres.writeFile({ fileName: "U-Netアンサンブル構成比較.pptx" }).then((f) => console.log("created:", f));
