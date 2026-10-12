// 重ね合わせ × 仮想計測 (Virtual Metrology) × 機械学習
// Ocean Gradient + Mint theme
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
const SW = 13.333;
const SH = 7.5;

// Palette
const DEEP    = "065A82";
const TEAL    = "1C7293";
const MID     = "21295C";
const LIGHT   = "E8F1F5";
const PANEL   = "F4F8FB";
const WHITE   = "FFFFFF";
const GRAY    = "5B6770";
const ACCENT  = "14B8A6"; // mint — AI/ML feel
const WARN    = "F59E0B";

const HEADER_FONT = "Georgia";
const BODY_FONT   = "Calibri";

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: WHITE },
  objects: [
    { rect: { x: 0, y: 0, w: SW, h: 0.55, fill: { color: MID } } },
    { rect: { x: 0, y: 0.55, w: SW, h: 0.04, fill: { color: ACCENT } } },
    { text: {
        text: "Virtual Metrology × Machine Learning  |  Overlay Control",
        options: { x: 0.4, y: 0.07, w: 10.5, h: 0.4, fontSize: 11, fontFace: BODY_FONT, color: LIGHT, align: "left", valign: "middle" }
    }},
    { text: {
        text: "© 2026 Internal Technical Note",
        options: { x: 9.3, y: 0.07, w: 3.6, h: 0.4, fontSize: 10, fontFace: BODY_FONT, color: LIGHT, align: "right", valign: "middle" }
    }},
    { rect: { x: 0, y: SH - 0.25, w: SW, h: 0.25, fill: { color: MID } } },
  ],
  slideNumber: { x: 12.7, y: SH - 0.22, w: 0.5, h: 0.22, fontSize: 10, fontFace: BODY_FONT, color: LIGHT, align: "right" },
});

function addTitle(slide, text, subtitle) {
  slide.addText(text, {
    x: 0.5, y: 0.85, w: 12.3, h: 0.7,
    fontSize: 30, fontFace: HEADER_FONT, bold: true, color: MID, align: "left", valign: "middle", margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.55, w: 12.3, h: 0.4,
      fontSize: 14, fontFace: BODY_FONT, italic: true, color: GRAY, align: "left", valign: "middle", margin: 0,
    });
  }
}

function chapterChip(slide, label) {
  slide.addShape("ellipse", { x: 11.6, y: 0.78, w: 0.22, h: 0.22, fill: { color: ACCENT }, line: { color: ACCENT } });
  slide.addText(label, { x: 11.85, y: 0.74, w: 1.4, h: 0.3, fontSize: 11, fontFace: BODY_FONT, bold: true, color: MID, align: "left", valign: "middle" });
}

// =====================================================
// SLIDE 1 — Title
// =====================================================
{
  const s = pres.addSlide();
  s.background = { color: MID };

  // mint accent strip
  s.addShape("rect", { x: 0, y: 0, w: 0.18, h: SH, fill: { color: ACCENT }, line: { color: ACCENT } });
  // soft gradient feel: large translucent shapes
  s.addShape("ellipse", { x: 9.0, y: -3.0, w: 8.0, h: 8.0, fill: { color: DEEP }, line: { color: DEEP } });
  s.addShape("ellipse", { x: 10.5, y: 3.0, w: 6.0, h: 6.0, fill: { color: TEAL }, line: { color: TEAL } });

  // node-edge motif (data graph) — small circles + thin lines bottom right
  const nodes = [
    [9.6, 5.5], [10.8, 5.0], [11.7, 5.9], [10.5, 6.4], [12.3, 5.2], [11.0, 6.9],
  ];
  // edges
  const edges = [[0,1],[1,2],[2,3],[3,0],[2,4],[1,5],[3,5]];
  edges.forEach(([a,b]) => {
    s.addShape("line", {
      x: nodes[a][0], y: nodes[a][1], w: nodes[b][0]-nodes[a][0], h: nodes[b][1]-nodes[a][1],
      line: { color: ACCENT, width: 1 },
    });
  });
  nodes.forEach(([x,y]) => {
    s.addShape("ellipse", { x: x-0.1, y: y-0.1, w: 0.2, h: 0.2, fill: { color: ACCENT }, line: { color: ACCENT } });
  });

  s.addText("VIRTUAL METROLOGY × MACHINE LEARNING", {
    x: 0.7, y: 1.6, w: 9, h: 0.5, fontSize: 14, fontFace: BODY_FONT, color: ACCENT, bold: true, charSpacing: 6,
  });
  s.addText("重ね合わせ制御における\n仮想計測と機械学習", {
    x: 0.7, y: 2.2, w: 9, h: 2.4, fontSize: 44, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "top", margin: 0,
  });
  s.addText("具体事例 ・ 主要手法 ・ 運用上のポイント", {
    x: 0.7, y: 4.7, w: 9, h: 0.6, fontSize: 18, fontFace: BODY_FONT, italic: true, color: LIGHT, valign: "top",
  });
  s.addText("SK hynix × ASML  ／  KLA  ／  SPIE / EMLC 論文・USPTO 実装事例から", {
    x: 0.7, y: 5.5, w: 9, h: 0.5, fontSize: 14, fontFace: BODY_FONT, color: LIGHT,
  });
  s.addText("2026 年 6 月  ｜  社内技術リファレンス", {
    x: 0.7, y: 6.5, w: 9, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: LIGHT,
  });
}

// =====================================================
// SLIDE 2 — Agenda
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "アジェンダ", "本資料の流れ");
  chapterChip(s, "01");

  const items = [
    ["1", "Virtual Metrology (VM) とは", "目的・データソース"],
    ["2", "なぜ必要か", "計測の物理限界 / コスト / カバレッジ"],
    ["3", "具体事例 ①", "SK hynix × ASML (SPIE 9424, 2015)"],
    ["4", "具体事例 ②", "ASML EMLC2018 — NN による Overlay 予測"],
    ["5", "具体事例 ③", "KLA — Optical Inspection × ML 推定"],
    ["6", "主要 ML 手法の比較", "GBM / DNN / GP / kNN / Random Forest"],
    ["7", "Feature Engineering", "3 カテゴリの特徴量設計"],
    ["8", "Physics × ML ハイブリッド", "Zernike / Grid モデルとの結合"],
    ["9", "ドリフト検知と再学習", "MLOps 観点の運用"],
    ["10", "運用ベストプラクティス", "現場の 8 原則"],
    ["11", "アンチパターン", "失敗事例から学ぶ"],
    ["12", "まとめと展望", "Hybrid AI Metrology へ"],
  ];

  const cols = 3;
  const rows = 4;
  const cellW = 4.05;
  const cellH = 1.0;
  const x0 = 0.55;
  const y0 = 2.05;
  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + col * (cellW + 0.15);
    const y = y0 + row * (cellH + 0.15);
    s.addShape("rect", { x, y, w: cellW, h: cellH, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("rect", { x, y, w: 0.08, h: cellH, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(it[0], { x: x + 0.2, y: y + 0.1, w: 0.65, h: 0.8, fontSize: 26, fontFace: HEADER_FONT, bold: true, color: DEEP, valign: "middle", margin: 0 });
    s.addText(it[1], { x: x + 0.95, y: y + 0.1, w: cellW - 1.05, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0 });
    s.addText(it[2], { x: x + 0.95, y: y + 0.5, w: cellW - 1.05, h: 0.45, fontSize: 10.5, fontFace: BODY_FONT, color: GRAY, valign: "middle", margin: 0 });
  });
}

// =====================================================
// SLIDE 3 — VM とは
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "Virtual Metrology (VM) とは", "物理計測なしに「測ったことにする」推定技術");
  chapterChip(s, "02");

  // left: definition
  s.addText([
    { text: "定義\n", options: { bold: true, fontSize: 16, color: MID } },
    { text: "プロセスやスキャナの稼働データから、ウェーハの品質指標（ここでは Overlay）を計測せずに推定する技術。本来オフラインで測るべき指標を、装置センサ / FDC / Context データから ML で予測する。\n\n", options: { fontSize: 12.5, color: GRAY } },
    { text: "Overlay VM の典型タスク\n", options: { bold: true, fontSize: 16, color: MID } },
    { text: "・ロット中の数枚から、全ウェーハの Overlay マップを推定\n・露光前にスキャナログから当該ロットの Overlay 残差を予測\n・異常ロットを早期特定し、抜き取り検査へ誘導\n・Feedforward 制御へ予測値を流し込み、補正残差を低減", options: { fontSize: 12.5, color: GRAY } },
  ], { x: 0.55, y: 2.1, w: 6.5, h: 4.6, valign: "top", margin: 0, paraSpaceAfter: 6 });

  // right: data → model → output flow
  const baseX = 7.3, baseY = 2.1, w = 5.5, h = 4.6;
  s.addShape("rect", { x: baseX, y: baseY, w, h, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("VM の基本フロー", { x: baseX, y: baseY + 0.1, w, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, align: "center" });

  const boxes = [
    { label: "入力 (Sensors / Context)", desc: "FDC・スキャナログ・装置 ID", color: DEEP },
    { label: "ML モデル", desc: "GBM / DNN / GP …", color: ACCENT },
    { label: "出力 (Estimated Overlay)", desc: "全ウェーハの Overlay マップ", color: TEAL },
  ];
  let yy = baseY + 0.7;
  boxes.forEach((b, i) => {
    s.addShape("rect", { x: baseX + 0.5, y: yy, w: w - 1.0, h: 0.9, fill: { color: b.color }, line: { color: b.color } });
    s.addText(b.label, { x: baseX + 0.5, y: yy + 0.05, w: w - 1.0, h: 0.45, fontSize: 14, fontFace: BODY_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(b.desc, { x: baseX + 0.5, y: yy + 0.45, w: w - 1.0, h: 0.4, fontSize: 11, fontFace: BODY_FONT, color: LIGHT, align: "center", valign: "middle", margin: 0 });
    yy += 1.05;
    if (i < boxes.length - 1) {
      // arrow down
      s.addShape("line", { x: baseX + w/2 - 0.05, y: yy - 0.12, w: 0, h: 0.15, line: { color: MID, width: 2, endArrowType: "triangle" } });
    }
  });

  s.addText("従来「ウェーハの 3〜5 % を計測」だった枠を、推定で 100 % カバーする。", {
    x: baseX, y: baseY + h - 0.6, w, h: 0.5, fontSize: 11, fontFace: BODY_FONT, color: GRAY, italic: true, align: "center",
  });
}

// =====================================================
// SLIDE 4 — なぜ必要か (stats)
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "なぜ Overlay に VM が必要か", "「全部測る」「リアルタイムに測る」が物理的に難しい");
  chapterChip(s, "02");

  const stats = [
    { val: "≈ 5 %", fs: 56, lbl: "計測カバレッジ", note: "高生産ラインで実測される Overlay の典型割合。残り 95 % は装置の挙動から「推測」するしかない。" },
    { val: "数 日", fs: 56, lbl: "計測遅延", note: "オフライン計測サイクルが長く、R2R 補正が後手に回る。VM があれば数時間スケールへ短縮 (KLA 試算)。" },
    { val: "R² ≈ 0.80", fs: 40, lbl: "ASML EMLC 2018 の予測性能", note: "Non-correctable Overlay 成分について、NN ベース VM で達成された予測精度。" },
  ];
  const sx = [0.55, 4.85, 9.15];
  const sy = 2.15;
  const sw = 3.6, sh = 3.5;
  stats.forEach((st, i) => {
    s.addShape("rect", { x: sx[i], y: sy, w: sw, h: sh, fill: { color: DEEP }, line: { color: DEEP } });
    s.addShape("rect", { x: sx[i], y: sy, w: sw, h: 0.1, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(st.val, { x: sx[i] + 0.1, y: sy + 0.4, w: sw - 0.2, h: 1.5, fontSize: st.fs, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.lbl, { x: sx[i] + 0.2, y: sy + 2.0, w: sw - 0.4, h: 0.5, fontSize: 13, fontFace: BODY_FONT, bold: true, color: LIGHT, align: "center", valign: "middle", margin: 0 });
    s.addText(st.note, { x: sx[i] + 0.25, y: sy + 2.55, w: sw - 0.5, h: 0.85, fontSize: 11, fontFace: BODY_FONT, color: LIGHT, align: "center", valign: "top", margin: 0 });
  });

  s.addShape("rect", { x: 0.55, y: 6.0, w: 12.25, h: 0.9, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addShape("rect", { x: 0.55, y: 6.0, w: 0.1, h: 0.9, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("VM の役割は「物理計測の代替」ではなく「物理計測を疎にしても安全」にすること。ML 予測 + 物理計測の二刀流が大前提。", {
    x: 0.85, y: 6.05, w: 11.9, h: 0.8, fontSize: 13, fontFace: BODY_FONT, color: MID, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 5 — Case 1: SK hynix × ASML
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "具体事例 ①  ―  SK hynix × ASML (SPIE 9424, 2015)", "「インライン計測 + 機械学習」によるバーチャル Overlay");
  chapterChip(s, "03");

  // Left: scenario
  s.addShape("rect", { x: 0.55, y: 2.05, w: 5.9, h: 4.8, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("論文タイトル", { x: 0.75, y: 2.15, w: 5.5, h: 0.4, fontSize: 12, fontFace: BODY_FONT, bold: true, color: ACCENT });
  s.addText("Virtual overlay metrology for fault detection supported with integrated metrology and machine learning (SPIE 9424, 2015)", {
    x: 0.75, y: 2.5, w: 5.5, h: 0.9, fontSize: 12.5, fontFace: BODY_FONT, color: MID, italic: true, valign: "top",
  });

  s.addText("研究の枠組み", { x: 0.75, y: 3.5, w: 5.5, h: 0.4, fontSize: 12, fontFace: BODY_FONT, bold: true, color: ACCENT });
  s.addText([
    { text: "・SK hynix のインライン計測装置に NN ベースの VM を組み込み\n", options: { fontSize: 12, color: MID } },
    { text: "・スキャナの既知の寄与因子（ステージ、レンズ、レチクル等）を学習\n", options: { fontSize: 12, color: MID } },
    { text: "・露光した全ウェーハの Overlay ベクトルマップを近似する関数を獲得\n", options: { fontSize: 12, color: MID } },
    { text: "・標準集団から外れた Overlay シグネチャを持つロットを\n  オフライン計測へ自動誘導 (Excursion validation)", options: { fontSize: 12, color: MID } },
  ], { x: 0.75, y: 3.85, w: 5.5, h: 2.8, valign: "top", margin: 0, paraSpaceAfter: 5 });

  // Right: workflow diagram
  const rx = 6.65, ry = 2.05, rw = 6.18, rh = 4.8;
  s.addShape("rect", { x: rx, y: ry, w: rw, h: rh, fill: { color: MID }, line: { color: MID } });
  s.addText("運用フロー", { x: rx, y: ry + 0.15, w: rw, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ACCENT, align: "center" });

  const flow = [
    ["1", "ロット内 3〜5 枚を物理計測", "サンプリング計測で base を取る"],
    ["2", "NN モデルで全ウェーハを推定", "Trained function により Overlay マップを近似"],
    ["3", "シグネチャの分布をモニタ", "標準集団との Mahalanobis 距離を計算"],
    ["4", "外れ値ロットを抽出", "Excursion 候補を自動フラグ"],
    ["5", "オフライン計測で検証", "ML 予測の信頼性を物理で押さえる"],
  ];
  let yy = ry + 0.7;
  flow.forEach(([n, h, b]) => {
    s.addShape("ellipse", { x: rx + 0.35, y: yy, w: 0.55, h: 0.55, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(n, { x: rx + 0.35, y: yy, w: 0.55, h: 0.55, fontSize: 16, fontFace: HEADER_FONT, bold: true, color: MID, align: "center", valign: "middle", margin: 0 });
    s.addText(h, { x: rx + 1.05, y: yy - 0.02, w: rw - 1.2, h: 0.32, fontSize: 13, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(b, { x: rx + 1.05, y: yy + 0.3, w: rw - 1.2, h: 0.4, fontSize: 10.5, fontFace: BODY_FONT, color: LIGHT, valign: "top", margin: 0 });
    yy += 0.75;
  });

  s.addText("出典: Lee et al., SPIE 9424 (2015) / USPTO 10,964,566 ML on Overlay Virtual Metrology", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 6 — Case 2: ASML EMLC2018
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "具体事例 ②  ―  ASML EMLC 2018", "NN による Overlay 予測 ／ Fab Cycle Time 削減を狙った量産前提の VM");
  chapterChip(s, "03");

  // top: model summary
  s.addShape("rect", { x: 0.55, y: 2.05, w: 12.25, h: 1.8, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addShape("rect", { x: 0.55, y: 2.05, w: 0.1, h: 1.8, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("モデル：3 カテゴリの特徴量を入力する NN ベース VM", { x: 0.85, y: 2.15, w: 11.8, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: MID });
  // three feature columns
  const fx = [0.95, 5.05, 9.15];
  const features = [
    ["① 履歴 Overlay", "直前 Implant 層の計測値\n(下層シグネチャ)"],
    ["② Tool Fingerprint", "スキャナ + 各 Chuck の\n固有寄与パターン"],
    ["③ Context + APC", "Tool/Reticle/Process ID\n適用された APC 補正値"],
  ];
  features.forEach((f, i) => {
    s.addShape("rect", { x: fx[i], y: 2.6, w: 3.95, h: 1.15, fill: { color: WHITE }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("ellipse", { x: fx[i] + 0.15, y: 2.75, w: 0.45, h: 0.45, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText((i + 1).toString(), { x: fx[i] + 0.15, y: 2.75, w: 0.45, h: 0.45, fontSize: 14, fontFace: HEADER_FONT, bold: true, color: MID, align: "center", valign: "middle", margin: 0 });
    s.addText(f[0].replace(/^[①②③]\s/, ""), { x: fx[i] + 0.7, y: 2.7, w: 3.1, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0 });
    s.addText(f[1], { x: fx[i] + 0.7, y: 3.05, w: 3.1, h: 0.65, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
  });

  // bottom left: results
  s.addShape("rect", { x: 0.55, y: 4.05, w: 6.05, h: 2.8, fill: { color: DEEP }, line: { color: DEEP } });
  s.addText("性能（R² 値）", { x: 0.7, y: 4.15, w: 5.8, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ACCENT });
  s.addText("X 方向 Overlay", { x: 0.7, y: 4.5, w: 5.8, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: LIGHT });
  s.addShape("rect", { x: 0.7, y: 4.85, w: 4.5 * 0.65, h: 0.3, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addShape("rect", { x: 0.7 + 4.5 * 0.65, y: 4.85, w: 4.5 * 0.35, h: 0.3, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText("0.65", { x: 5.3, y: 4.85, w: 1.0, h: 0.3, fontSize: 12, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });

  s.addText("Y 方向 Overlay", { x: 0.7, y: 5.25, w: 5.8, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: LIGHT });
  s.addShape("rect", { x: 0.7, y: 5.6, w: 4.5 * 0.73, h: 0.3, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addShape("rect", { x: 0.7 + 4.5 * 0.73, y: 5.6, w: 4.5 * 0.27, h: 0.3, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText("0.73", { x: 5.3, y: 5.6, w: 1.0, h: 0.3, fontSize: 12, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });

  s.addText("Non-correctable のみ", { x: 0.7, y: 6.0, w: 5.8, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: LIGHT });
  s.addShape("rect", { x: 0.7, y: 6.35, w: 4.5 * 0.8, h: 0.3, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addShape("rect", { x: 0.7 + 4.5 * 0.8, y: 6.35, w: 4.5 * 0.2, h: 0.3, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText("0.80", { x: 5.3, y: 6.35, w: 1.0, h: 0.3, fontSize: 12, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });

  // bottom right: insights
  s.addShape("rect", { x: 6.75, y: 4.05, w: 6.05, h: 2.8, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("学び（Take-aways）", { x: 6.9, y: 4.15, w: 5.8, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID });
  const takes = [
    "Correctable は物理モデルで吸収済 → ML は Non-correctable の説明に集中",
    "3 カテゴリの特徴量を分離して持つことが性能のキモ",
    "Chuck 別 fingerprint を入れないと精度が頭打ちになる",
    "MATLAB / Python の物理モデルと ML を共通プラットフォームで扱う",
  ];
  s.addText(takes.map(t => ({ text: t, options: { bullet: { code: "25A0" }, fontSize: 12, color: MID, paraSpaceAfter: 5 } })), {
    x: 6.95, y: 4.5, w: 5.8, h: 2.3, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addText("出典: Hasibi et al., EMLC 2018 / MathWorks ユーザーストーリー (ASML)", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 7 — Case 3: KLA Optical Inspection × ML
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "具体事例 ③  ―  KLA Optical Inspection × ML", "USPTO 12,535,744 ― 光学検査画像から Overlay を推定");
  chapterChip(s, "03");

  // diagram on left
  const lx = 0.55, ly = 2.05, lw = 6.0, lh = 4.8;
  s.addShape("rect", { x: lx, y: ly, w: lw, h: lh, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("推定パイプライン", { x: lx, y: ly + 0.1, w: lw, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, align: "center" });

  // step boxes (vertical)
  const steps = [
    { label: "Optical Inspection 画像", color: DEEP },
    { label: "層別構造領域の自動セグメント", color: TEAL },
    { label: "層間オフセット推定 (ML)", color: ACCENT },
    { label: "Overlay マップ出力", color: MID },
  ];
  let yy = ly + 0.7;
  steps.forEach((b, i) => {
    s.addShape("rect", { x: lx + 0.7, y: yy, w: lw - 1.4, h: 0.7, fill: { color: b.color }, line: { color: b.color } });
    s.addText(b.label, { x: lx + 0.7, y: yy, w: lw - 1.4, h: 0.7, fontSize: 13, fontFace: BODY_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    yy += 0.85;
    if (i < steps.length - 1) {
      s.addShape("line", { x: lx + lw/2 - 0.05, y: yy - 0.18, w: 0, h: 0.15, line: { color: MID, width: 2, endArrowType: "triangle" } });
    }
  });

  // right: text bullets
  s.addText("特徴", { x: 6.75, y: 2.1, w: 6.1, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: MID });
  const klaPts = [
    ["Overlay 専用ターゲットに依存しない", "通常の光学検査画像から直接、層間ずれを推定。Overlay 計測点を増設せずに密なマップが得られる"],
    ["層ごとに別 ML モデル", "プロセス層が異なる構造の特徴ごとに、専用モデルを訓練。誤推定をスタックの影響から守る"],
    ["スループットを犠牲にしない", "既存検査の通り抜けデータで Overlay 情報を抽出 = サイクルタイム増えない"],
    ["異常検知と連動", "予測 Overlay が異常分布のとき、検査装置内で自動的に追加サンプリングを発動"],
  ];
  let py = 2.55;
  klaPts.forEach(([k, v]) => {
    s.addShape("rect", { x: 6.75, y: py, w: 0.06, h: 0.9, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(k, { x: 6.93, y: py, w: 5.9, h: 0.35, fontSize: 12.5, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0 });
    s.addText(v, { x: 6.93, y: py + 0.32, w: 5.9, h: 0.65, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
    py += 1.05;
  });

  s.addText("出典: USPTO 12,535,744『Overlay estimation based on optical inspection and machine learning』(KLA)", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 8 — ML methods comparison
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "主要 ML 手法の比較  ―  Overlay VM 文脈", "実装の重さと特性で使い分ける");
  chapterChip(s, "04");

  const header = ["手法", "強み", "弱み", "Overlay VM での出番"];
  const rows = [
    ["Gradient Boosting (XGBoost / LightGBM)", "表形式特徴量に強い／少量データでも安定", "外挿に弱い／空間構造を直接扱えない", "Lot 単位の集約特徴量から予測する標準ベースライン"],
    ["ニューラルネット (DNN / MLP)", "非線形・高次の相互作用に強い", "学習データ量と特徴設計に敏感", "ASML EMLC 2018 で採用。Non-correctable の予測"],
    ["畳み込み NN (CNN)", "空間マップを直接入力できる", "前処理 (リサンプル) が必要", "Overlay マップ画像や検査画像からの直接推定"],
    ["Gaussian Process (GP)", "予測値に不確実性を付与できる", "計算量がデータ点数の 3 乗で増加", "信頼区間を R2R に渡す Critical 層向け"],
    ["Random Forest / kNN", "実装が容易・解釈しやすい", "高次元で性能頭打ち", "プロトタイプ／ルールベース置換／フォールバック"],
    ["Hybrid (Physics + ML)", "物理モデルを Prior にして外挿に強い", "実装コストが高い", "Zernike / Grid モデル残差を ML で説明する本命構成"],
  ];
  const tableRows = [];
  tableRows.push(header.map(h => ({
    text: h, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 12, fontFace: BODY_FONT, align: "center", valign: "middle" }
  })));
  rows.forEach((r, i) => {
    const fill = i % 2 === 0 ? PANEL : WHITE;
    tableRows.push(r.map((c, j) => ({
      text: c,
      options: {
        bold: j === 0, color: MID, fill: { color: fill }, fontSize: 11, fontFace: BODY_FONT,
        align: "left", valign: "middle",
      }
    })));
  });
  s.addTable(tableRows, {
    x: 0.55, y: 2.1, w: 12.25,
    colW: [2.8, 3.0, 3.0, 3.45],
    rowH: 0.7,
    border: { type: "solid", color: LIGHT, pt: 0.5 },
    fontFace: BODY_FONT,
  });

  s.addText("どれか 1 つで完結する必要はない。ベースライン (GBM) → 本命 (NN / Hybrid) → 安全網 (Rule) の 3 階層で構築する。", {
    x: 0.55, y: 6.95, w: 12.25, h: 0.35, fontSize: 11, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 9 — Feature engineering
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "Feature Engineering  ―  特徴量の 3 カテゴリ", "ASML / KLA 系論文で共通して採用されている設計");
  chapterChip(s, "04");

  const cats = [
    {
      title: "① 履歴 Overlay",
      sub: "Layer history",
      bullets: [
        "直前 Implant 層の Overlay 計測値",
        "下層のグリッドシグネチャ",
        "Mahalanobis 距離での外れ度",
        "前ロットの残差 (時系列ラグ)",
      ],
      color: DEEP,
    },
    {
      title: "② 装置 Fingerprint",
      sub: "Tool / Chuck signature",
      bullets: [
        "スキャナ ID 別の固有寄与",
        "Chuck 1 / Chuck 2 の差分",
        "ステージ非線形成分",
        "レンズ収差 (Zernike) ログ",
      ],
      color: TEAL,
    },
    {
      title: "③ Context + APC",
      sub: "Recipe / Correction",
      bullets: [
        "Tool / Reticle / Process ID",
        "適用された APC 補正値",
        "メンテからの経過時間",
        "温度・湿度・Wafer 順序",
      ],
      color: MID,
    },
  ];
  const cx = [0.55, 4.85, 9.15];
  const cy = 2.1;
  const cw = 3.65, ch = 4.6;
  cats.forEach((c, i) => {
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: ch, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: 0.85, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.title, { x: cx[i] + 0.25, y: cy + 0.05, w: cw - 0.5, h: 0.45, fontSize: 17, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(c.sub, { x: cx[i] + 0.25, y: cy + 0.45, w: cw - 0.5, h: 0.35, fontSize: 11, fontFace: BODY_FONT, color: LIGHT, italic: true, valign: "middle", margin: 0 });

    s.addText(c.bullets.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 12.5, color: MID, paraSpaceAfter: 6 } })), {
      x: cx[i] + 0.3, y: cy + 1.0, w: cw - 0.6, h: ch - 1.1, fontFace: BODY_FONT, valign: "top", margin: 0,
    });
  });

  s.addShape("rect", { x: 0.55, y: 6.8, w: 12.25, h: 0.55, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("Tips：3 カテゴリを「同じテーブルに混ぜる」のではなく、グループ別の Embedding / 別ネットワーク枝に分けると Robust になる。", {
    x: 0.7, y: 6.8, w: 12.0, h: 0.55, fontSize: 12, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 10 — Physics × ML hybrid
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "Physics × ML ハイブリッド構成", "物理モデルの「説明できる部分」と ML の「説明できない部分」を分担");
  chapterChip(s, "04");

  // Left: equation-ish diagram
  s.addShape("rect", { x: 0.55, y: 2.1, w: 6.1, h: 4.6, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("構成のイメージ", { x: 0.55, y: 2.2, w: 6.1, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, align: "center" });

  // Overlay_total = Physical + Residual(ML)
  s.addShape("rect", { x: 0.85, y: 2.95, w: 5.5, h: 0.8, fill: { color: DEEP }, line: { color: DEEP } });
  s.addText("Overlay (実測) = 物理モデル + 残差 (ML)", { x: 0.85, y: 2.95, w: 5.5, h: 0.8, fontSize: 14, fontFace: BODY_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });

  // physical box
  s.addShape("rect", { x: 0.85, y: 4.0, w: 2.6, h: 1.2, fill: { color: WHITE }, line: { color: TEAL, width: 1.5 } });
  s.addText("物理モデル", { x: 0.85, y: 4.05, w: 2.6, h: 0.35, fontSize: 12, fontFace: BODY_FONT, bold: true, color: TEAL, align: "center" });
  s.addText("Grid (Lin/HO)\nZernike\nStage Distortion", { x: 0.95, y: 4.4, w: 2.4, h: 0.75, fontSize: 11, fontFace: BODY_FONT, color: MID, align: "center", valign: "top" });

  // residual ML box
  s.addShape("rect", { x: 3.75, y: 4.0, w: 2.6, h: 1.2, fill: { color: WHITE }, line: { color: ACCENT, width: 1.5 } });
  s.addText("残差 ML", { x: 3.75, y: 4.05, w: 2.6, h: 0.35, fontSize: 12, fontFace: BODY_FONT, bold: true, color: ACCENT, align: "center" });
  s.addText("GBM / DNN / GP\nContext + APC\nDrift 成分", { x: 3.85, y: 4.4, w: 2.4, h: 0.75, fontSize: 11, fontFace: BODY_FONT, color: MID, align: "center", valign: "top" });

  s.addText("物理が「説明できる部分」を先に引き、残った成分だけを ML に渡す。", {
    x: 0.85, y: 5.35, w: 5.6, h: 0.4, fontSize: 11.5, fontFace: BODY_FONT, italic: true, color: GRAY, align: "center",
  });
  s.addText("→ 学習データを節約／外挿に強い／解釈性が確保しやすい", {
    x: 0.85, y: 5.8, w: 5.6, h: 0.4, fontSize: 11.5, fontFace: BODY_FONT, italic: true, color: ACCENT, align: "center", bold: true,
  });

  // Right: why hybrid is better
  s.addShape("rect", { x: 6.85, y: 2.1, w: 5.95, h: 4.6, fill: { color: MID }, line: { color: MID } });
  s.addText("なぜハイブリッドが事実上の本命か", { x: 6.95, y: 2.2, w: 5.8, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ACCENT });
  const why = [
    "Pure ML は外挿で大きく外す。新しい装置・新ロットで安全マージンが取れない。",
    "物理モデルだけでは残った 20〜30 % の Non-correctable を説明できない (EMLC 2018)。",
    "残差だけを ML に渡せば、特徴量が一桁少なくて済み、過学習しにくい。",
    "解釈性：物理項は物理量で説明可能。ML 項は補助という位置づけにできる。",
    "プロセス変更時に物理パラメータだけ差し替えれば、ML をフル再学習せずに済むケースも多い。",
  ];
  s.addText(why.map(w => ({ text: w, options: { bullet: { code: "25A0" }, fontSize: 12, color: WHITE, paraSpaceAfter: 6 } })), {
    x: 7.05, y: 2.7, w: 5.65, h: 3.9, fontFace: BODY_FONT, valign: "top", margin: 0,
  });
}

// =====================================================
// SLIDE 11 — Drift detection & retraining (MLOps)
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "ドリフト検知と再学習  ―  MLOps 視点", "VM を「動かし続ける」ためのループ");
  chapterChip(s, "05");

  // top diagram: cycle
  const baseX = 0.55, baseY = 2.05, w = 12.25, h = 2.8;
  s.addShape("rect", { x: baseX, y: baseY, w, h, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
  s.addText("運用ループ", { x: baseX, y: baseY + 0.1, w: w, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, align: "center" });

  const cycle = [
    { n: "1", h: "予測", b: "VM が Overlay を推定" },
    { n: "2", h: "観測", b: "サンプリング物理計測" },
    { n: "3", h: "残差監視", b: "予測 vs 実測の誤差分布" },
    { n: "4", h: "ドリフト判定", b: "閾値超 / KS / PSI" },
    { n: "5", h: "再学習トリガ", b: "新データで学習更新" },
  ];
  const stepW = (w - 0.8) / 5;
  cycle.forEach((c, i) => {
    const x = baseX + 0.4 + i * stepW;
    s.addShape("rect", { x: x + 0.1, y: baseY + 0.7, w: stepW - 0.2, h: 1.85, fill: { color: WHITE }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("ellipse", { x: x + (stepW - 0.6) / 2, y: baseY + 0.85, w: 0.6, h: 0.6, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(c.n, { x: x + (stepW - 0.6) / 2, y: baseY + 0.85, w: 0.6, h: 0.6, fontSize: 18, fontFace: HEADER_FONT, bold: true, color: MID, align: "center", valign: "middle", margin: 0 });
    s.addText(c.h, { x: x + 0.1, y: baseY + 1.55, w: stepW - 0.2, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, align: "center", valign: "middle", margin: 0 });
    s.addText(c.b, { x: x + 0.15, y: baseY + 1.95, w: stepW - 0.3, h: 0.55, fontSize: 10.5, fontFace: BODY_FONT, color: GRAY, align: "center", valign: "top", margin: 0 });
    if (i < cycle.length - 1) {
      s.addShape("line", { x: x + stepW - 0.05, y: baseY + 1.15, w: 0.15, h: 0, line: { color: MID, width: 2, endArrowType: "triangle" } });
    }
  });

  // bottom: two columns
  s.addShape("rect", { x: 0.55, y: 5.1, w: 6.0, h: 1.85, fill: { color: DEEP }, line: { color: DEEP } });
  s.addText("ドリフト検知の典型シグナル", { x: 0.7, y: 5.2, w: 5.8, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ACCENT });
  const drift = [
    "予測 Overlay と実測の Bias が長期トレンドで増加",
    "Population Stability Index (PSI) > 0.2 のロット連続発生",
    "Context (Tool / Reticle) の構成変化",
    "信頼区間 (GP の σ) の異常拡大",
  ];
  s.addText(drift.map(t => ({ text: t, options: { bullet: { code: "25A0" }, fontSize: 11, color: WHITE, paraSpaceAfter: 3 } })), {
    x: 0.7, y: 5.6, w: 5.8, h: 1.3, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addShape("rect", { x: 6.8, y: 5.1, w: 6.0, h: 1.85, fill: { color: MID }, line: { color: MID } });
  s.addText("再学習トリガーの設計", { x: 6.95, y: 5.2, w: 5.8, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ACCENT });
  const retrain = [
    "定期トリガー (例: 週次) + イベントトリガー (大規模メンテ後)",
    "Context Key が新規追加 (新装置 / 新レチクル) は即時再学習",
    "再学習後の精度が劣化していたら自動ロールバック",
    "Shadow Deploy で本番並走 → 一定期間 OK で切替",
  ];
  s.addText(retrain.map(t => ({ text: t, options: { bullet: { code: "25A0" }, fontSize: 11, color: WHITE, paraSpaceAfter: 3 } })), {
    x: 6.95, y: 5.6, w: 5.8, h: 1.3, fontFace: BODY_FONT, valign: "top", margin: 0,
  });
}

// =====================================================
// SLIDE 12 — Operational best practices (8)
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "運用ベストプラクティス 8 原則", "VM をプロダクションに乗せる際の現場知");
  chapterChip(s, "05");

  const bp = [
    ["01", "物理計測を捨てない", "VM は「疎にする」もので「無くす」ものではない"],
    ["02", "Context Key を必ず分離", "Tool / Reticle / Process / Chuck で別系列を持つ"],
    ["03", "信頼度を出力する", "予測値だけでなく σ や PSI を一緒に R2R に渡す"],
    ["04", "新規 Context は予測しない", "未学習の組合せはルールベースのフォールバックへ"],
    ["05", "残差監視を常設", "予測 vs 実測の差を Bias / Variance に分けて見る"],
    ["06", "Shadow Deploy", "再学習モデルは即本番化せず並走で評価"],
    ["07", "物理モデルを Prior に", "Pure ML より Hybrid を選ぶ。外挿に効く"],
    ["08", "再学習をスケジュール化", "週次 / イベント / 性能劣化の 3 系統で発火"],
  ];

  const cols = 2, rows = 4;
  const cellW = 6.05, cellH = 1.05;
  const x0 = 0.55, y0 = 2.1;
  bp.forEach((b, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    const x = x0 + col * (cellW + 0.15);
    const y = y0 + row * (cellH + 0.15);
    s.addShape("rect", { x, y, w: cellW, h: cellH, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("rect", { x, y, w: 0.85, h: cellH, fill: { color: DEEP }, line: { color: DEEP } });
    s.addText(b[0], { x, y, w: 0.85, h: cellH, fontSize: 22, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(b[1], { x: x + 1.0, y: y + 0.12, w: cellW - 1.1, h: 0.4, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0 });
    s.addText(b[2], { x: x + 1.0, y: y + 0.52, w: cellW - 1.1, h: 0.5, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
  });
}

// =====================================================
// SLIDE 13 — Anti-patterns
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "アンチパターン  ―  よくある失敗", "「動いて見えるけど壊れている VM」のパターン");
  chapterChip(s, "05");

  const aps = [
    { t: "全特徴量を 1 つのテーブルに混ぜる", b: "Context が変わると一気に劣化。Embedding / 別枝に分けるべき。" },
    { t: "Pure ML のみで運用", b: "新装置・新レチクルで予測が外れる。物理モデルを Prior に。" },
    { t: "信頼度を捨てて点推定だけ流す", b: "R2R が VM の自信を区別できず、ノイズに過剰反応する。" },
    { t: "再学習をマニュアル運用", b: "属人化し、いつドリフトしたか追えなくなる。スケジュール化必須。" },
    { t: "物理計測を「無駄」と削減", b: "VM の正しさを誰も確認できない。物理計測は Ground Truth の砦。" },
    { t: "Shadow Deploy なしで本番置換", b: "再学習後にむしろ劣化するケースあり。並走 → 切替が原則。" },
  ];
  const cols = 2;
  const cellW = 6.05, cellH = 1.4;
  const x0 = 0.55, y0 = 2.1;
  aps.forEach((a, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + col * (cellW + 0.15);
    const y = y0 + row * (cellH + 0.15);
    s.addShape("rect", { x, y, w: cellW, h: cellH, fill: { color: PANEL }, line: { color: LIGHT, width: 0.5 } });
    s.addShape("rect", { x, y, w: 0.12, h: cellH, fill: { color: WARN }, line: { color: WARN } });
    // warning icon (simple "!" in circle)
    s.addShape("ellipse", { x: x + 0.3, y: y + 0.25, w: 0.55, h: 0.55, fill: { color: WARN }, line: { color: WARN } });
    s.addText("!", { x: x + 0.3, y: y + 0.25, w: 0.55, h: 0.55, fontSize: 22, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(a.t, { x: x + 1.05, y: y + 0.15, w: cellW - 1.15, h: 0.45, fontSize: 13, fontFace: BODY_FONT, bold: true, color: MID, valign: "middle", margin: 0 });
    s.addText(a.b, { x: x + 1.05, y: y + 0.6, w: cellW - 1.15, h: 0.75, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
  });
}

// =====================================================
// SLIDE 14 — 事例マッピング
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "事例マッピング  ―  どの場面でどれが効くか", "目的と手法の対応関係を一覧化");
  chapterChip(s, "06");

  const header = ["事例 / 出典", "目的", "主な手法", "効果"];
  const rows = [
    ["SK hynix × ASML (SPIE 9424, 2015)", "全ウェーハの Overlay 推定 + Excursion 検知", "NN による関数近似 + 異常検知", "サンプリング計測から全数推定／異常ロット早期発見"],
    ["ASML EMLC 2018", "Fab Cycle Time 削減 / Overlay 予測", "NN + 3 カテゴリ特徴量", "R² 0.65 (X) / 0.73 (Y) / 0.80 (Non-correctable)"],
    ["KLA USPTO 12,535,744", "光学検査画像から Overlay 推定", "層別 ML / セグメント + 回帰", "Overlay 専用ターゲット不要／密なマップ"],
    ["ASML USPTO 10,964,566", "Overlay VM の汎用フレーム", "NN ベース + Context 分離", "Implant / Scanner / APC を分けて扱う設計"],
    ["KLA Archer + AI", "計測マークの品質判定 / フィルタ", "画像分類 + 異常検知", "計測 S/N を保ち、補正の根拠を堅くする"],
    ["Hybrid (社内実装例)", "Non-correctable の残差説明", "Zernike + GBM ハイブリッド", "学習データを節約しつつ外挿性を確保"],
  ];
  const tableRows = [];
  tableRows.push(header.map(h => ({
    text: h, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 12, fontFace: BODY_FONT, align: "center", valign: "middle" }
  })));
  rows.forEach((r, i) => {
    const fill = i % 2 === 0 ? PANEL : WHITE;
    tableRows.push(r.map((c, j) => ({
      text: c,
      options: {
        bold: j === 0, color: MID, fill: { color: fill }, fontSize: 11, fontFace: BODY_FONT,
        align: "left", valign: "middle",
      }
    })));
  });
  s.addTable(tableRows, {
    x: 0.55, y: 2.1, w: 12.25,
    colW: [3.4, 2.85, 2.85, 3.15],
    rowH: 0.7,
    border: { type: "solid", color: LIGHT, pt: 0.5 },
    fontFace: BODY_FONT,
  });

  s.addText("どの事例も「物理計測を残す」「Context を分ける」「Hybrid 化する」の 3 点は共通している。", {
    x: 0.55, y: 6.95, w: 12.25, h: 0.35, fontSize: 11, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 15 — Closing
// =====================================================
{
  const s = pres.addSlide();
  s.background = { color: MID };
  s.addShape("rect", { x: 0, y: 0, w: 0.18, h: SH, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addShape("ellipse", { x: 9.0, y: -3.0, w: 8.0, h: 8.0, fill: { color: DEEP }, line: { color: DEEP } });

  s.addText("まとめと展望", {
    x: 0.7, y: 1.0, w: 12, h: 0.9, fontSize: 40, fontFace: HEADER_FONT, bold: true, color: WHITE, margin: 0,
  });
  s.addText("Hybrid AI Metrology へ", {
    x: 0.7, y: 1.95, w: 12, h: 0.5, fontSize: 18, fontFace: BODY_FONT, italic: true, color: LIGHT, margin: 0,
  });

  const closing = [
    "VM は「物理計測を疎に運用しつつ全数推定する」ための運用技術。物理計測を残すことが前提。",
    "公開された具体事例（SK hynix × ASML、ASML EMLC 2018、KLA USPTO）は、いずれも 3 カテゴリ特徴量 + NN/Hybrid の構成を取る。",
    "Non-correctable Overlay の説明 (R² ≈ 0.80) が ML 単独で達成された一方、Correctable は物理側で吸収するのが正攻法。",
    "MLOps 観点：ドリフト検知・再学習トリガー・Shadow Deploy をはじめから設計に組み込む。",
    "今後は Hybrid (Zernike + ML)、Multi-Tool 横断 VM、Confidence-aware R2R が主戦場になる。",
  ];
  s.addText(closing.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 15, color: WHITE, paraSpaceAfter: 10 } })), {
    x: 0.9, y: 2.8, w: 11.7, h: 3.7, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addText("ご清聴ありがとうございました", {
    x: 0.7, y: 6.5, w: 12, h: 0.5, fontSize: 14, fontFace: BODY_FONT, italic: true, color: LIGHT,
  });
}

pres.writeFile({ fileName: "overlay-virtual-metrology-ml.pptx" })
  .then(name => console.log("Wrote:", name))
  .catch(err => { console.error(err); process.exit(1); });
