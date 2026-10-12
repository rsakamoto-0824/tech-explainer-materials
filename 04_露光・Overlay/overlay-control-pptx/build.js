// 半導体リソグラフィー 重ね合わせ制御 ベストプラクティス
// Midnight Executive theme (navy + ice blue + white)
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const SW = 13.333;
const SH = 7.5;

// Palette
const NAVY = "1E2761";
const NAVY_DEEP = "121845";
const ICE = "CADCFC";
const ICE_DARK = "8FA8E0";
const WHITE = "FFFFFF";
const GRAY = "5A6478";
const ACCENT = "FFB454"; // amber accent for stats
const PANEL = "F5F7FC";

const HEADER_FONT = "Georgia";
const BODY_FONT = "Calibri";

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: WHITE },
  objects: [
    { rect: { x: 0, y: 0, w: SW, h: 0.55, fill: { color: NAVY } } },
    { rect: { x: 0, y: 0.55, w: SW, h: 0.04, fill: { color: ICE_DARK } } },
    { text: {
        text: "Overlay Control Best Practices  |  Semiconductor Lithography",
        options: { x: 0.4, y: 0.07, w: 10.5, h: 0.4, fontSize: 11, fontFace: BODY_FONT, color: ICE, align: "left", valign: "middle" }
    }},
    { text: {
        text: "© 2026 Internal Reference Material",
        options: { x: 9.3, y: 0.07, w: 3.6, h: 0.4, fontSize: 10, fontFace: BODY_FONT, color: ICE, align: "right", valign: "middle" }
    }},
    { rect: { x: 0, y: SH - 0.25, w: SW, h: 0.25, fill: { color: NAVY_DEEP } } },
  ],
  slideNumber: { x: 12.7, y: SH - 0.22, w: 0.5, h: 0.22, fontSize: 10, fontFace: BODY_FONT, color: ICE, align: "right" },
});

// helper to add a slide title (no underline accent line per skill guidance)
function addTitle(slide, text, subtitle) {
  slide.addText(text, {
    x: 0.5, y: 0.85, w: 12.3, h: 0.7,
    fontSize: 32, fontFace: HEADER_FONT, bold: true, color: NAVY, align: "left", valign: "middle", margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.55, w: 12.3, h: 0.4,
      fontSize: 14, fontFace: BODY_FONT, italic: true, color: GRAY, align: "left", valign: "middle", margin: 0,
    });
  }
}

function sectionMarker(slide, label) {
  // small filled circle + label in top-right
  slide.addShape("ellipse", { x: 11.6, y: 0.78, w: 0.22, h: 0.22, fill: { color: ACCENT }, line: { color: ACCENT } });
  slide.addText(label, { x: 11.85, y: 0.74, w: 1.4, h: 0.3, fontSize: 11, fontFace: BODY_FONT, bold: true, color: NAVY, align: "left", valign: "middle" });
}

// =====================================================
// SLIDE 1 — Title (dark)
// =====================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  // decorative wafer-like concentric arcs (top-left corner motif, kept above title)
  for (let i = 0; i < 5; i++) {
    s.addShape("ellipse", {
      x: -2.4 + i * 0.18, y: -2.4 + i * 0.18, w: 4.6 - i * 0.36, h: 4.6 - i * 0.36,
      fill: { type: "none" }, line: { color: ICE_DARK, width: 0.75 },
    });
  }
  // accent corner block
  s.addShape("rect", { x: 10.5, y: 0, w: 2.83, h: 7.5, fill: { color: NAVY_DEEP }, line: { color: NAVY_DEEP } });
  s.addShape("rect", { x: 10.5, y: 0, w: 0.08, h: 7.5, fill: { color: ACCENT }, line: { color: ACCENT } });

  s.addText("LITHOGRAPHY", { x: 1.2, y: 1.7, w: 9, h: 0.5, fontSize: 16, fontFace: BODY_FONT, color: ICE_DARK, bold: true, charSpacing: 8 });
  s.addText("半導体リソグラフィー\n重ね合わせ制御の\nベストプラクティス", {
    x: 1.2, y: 2.2, w: 9, h: 2.8,
    fontSize: 44, fontFace: HEADER_FONT, color: WHITE, bold: true, valign: "top", margin: 0,
  });
  s.addText("Feedforward × Feedback × Lot/Wafer/Shot 階層制御 ―\nASML・KLA・Nikon・Canon・IBM・SK Hynix・キオクシアの事例から", {
    x: 1.2, y: 5.3, w: 9, h: 1.0,
    fontSize: 16, fontFace: BODY_FONT, color: ICE, italic: true, valign: "top",
  });
  s.addText("2026 年 6 月  ｜  社内技術リファレンス", {
    x: 1.2, y: 6.6, w: 9, h: 0.4,
    fontSize: 12, fontFace: BODY_FONT, color: ICE_DARK,
  });
  // vertical caption on accent block
  s.addText("On-Product Overlay\nHolistic Process Control", {
    x: 10.8, y: 5.8, w: 2.4, h: 1.4,
    fontSize: 12, fontFace: BODY_FONT, color: ICE, italic: true, align: "right",
  });
}

// =====================================================
// SLIDE 2 — Agenda
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "アジェンダ", "本資料の構成と読み進めかた");
  sectionMarker(s, "01");

  const items = [
    ["1", "重ね合わせ制御の基礎", "Overlay とは / なぜ重要か"],
    ["2", "制御の階層構造", "Lot 間 / Wafer 間 / Shot 間"],
    ["3", "フィードフォワード vs フィードバック", "前工程情報の活用と後工程補正"],
    ["4", "主要プレイヤー別の事例", "ASML・KLA・Nikon・Canon"],
    ["5", "デバイスメーカーの実装", "IBM・SK Hynix・キオクシア"],
    ["6", "機械学習と仮想計測の応用", "Big Data 駆動の補正"],
    ["7", "ベストプラクティス総括", "現場に効く 10 の原則"],
    ["8", "まとめと今後の展望", "High-NA EUV 時代へ"],
  ];
  // 2 columns of 4
  const colX = [0.7, 7.0];
  const startY = 2.0;
  const cardW = 5.7;
  const cardH = 1.05;
  items.forEach((it, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const x = colX[col];
    const y = startY + row * (cardH + 0.18);
    s.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x, y, w: 0.1, h: cardH, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(it[0], { x: x + 0.25, y: y + 0.15, w: 0.7, h: 0.75, fontSize: 30, fontFace: HEADER_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(it[1], { x: x + 1.0, y: y + 0.12, w: cardW - 1.1, h: 0.45, fontSize: 16, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(it[2], { x: x + 1.0, y: y + 0.55, w: cardW - 1.1, h: 0.45, fontSize: 12, fontFace: BODY_FONT, color: GRAY, valign: "middle", margin: 0 });
  });
}

// =====================================================
// SLIDE 3 — 重ね合わせとは
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "重ね合わせ制御とは", "下層パターンに対して上層パターンを正確に位置合わせする技術");
  sectionMarker(s, "02");

  // left text
  s.addText([
    { text: "定義\n", options: { bold: true, fontSize: 16, color: NAVY } },
    { text: "リソグラフィー工程で前工程の下地パターンと、今工程で露光する新パターンとの相対位置誤差（オーバーレイ誤差）を最小化する制御技術。\n\n", options: { fontSize: 13, color: GRAY } },
    { text: "誤差の主な要因\n", options: { bold: true, fontSize: 16, color: NAVY } },
    { text: "・ウェーハの反り・応力（CMP / 成膜起因）\n・スキャナのステージ・レンズの誤差\n・レチクルのパターン位置誤差\n・温度変動・経時ドリフト\n・前工程の Etch / Anneal の非対称歪み", options: { fontSize: 13, color: GRAY } },
  ], { x: 0.6, y: 2.1, w: 6.3, h: 4.7, valign: "top", margin: 0, paraSpaceAfter: 4 });

  // right schematic
  const baseX = 7.4, baseY = 2.2, w = 5.4, h = 4.5;
  s.addShape("rect", { x: baseX, y: baseY, w: w, h: h, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
  s.addText("Overlay 誤差の概念", { x: baseX, y: baseY + 0.1, w: w, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY, align: "center" });

  // bottom layer rectangle
  s.addShape("rect", { x: baseX + 1.0, y: baseY + 1.0, w: 3.3, h: 1.1, fill: { color: ICE_DARK }, line: { color: NAVY, width: 1 } });
  s.addText("下層パターン (Layer N-1)", { x: baseX + 1.0, y: baseY + 1.25, w: 3.3, h: 0.6, fontSize: 11, fontFace: BODY_FONT, color: NAVY, align: "center", bold: true });

  // top layer rectangle offset
  s.addShape("rect", { x: baseX + 1.35, y: baseY + 2.4, w: 3.3, h: 1.1, fill: { color: ACCENT }, line: { color: NAVY, width: 1 } });
  s.addText("上層パターン (Layer N)", { x: baseX + 1.35, y: baseY + 2.65, w: 3.3, h: 0.6, fontSize: 11, fontFace: BODY_FONT, color: NAVY, align: "center", bold: true });

  // arrow + label
  s.addShape("line", { x: baseX + 2.6, y: baseY + 2.1, w: 0.4, h: 0.3, line: { color: NAVY, width: 1.5, endArrowType: "triangle" } });
  s.addText("ΔX, ΔY", { x: baseX + 3.1, y: baseY + 2.05, w: 1.5, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: NAVY, bold: true, italic: true });

  s.addText("先端ノードでは ΔX, ΔY を nm オーダーで管理する必要がある", {
    x: baseX + 0.3, y: baseY + h - 0.7, w: w - 0.6, h: 0.5,
    fontSize: 11, fontFace: BODY_FONT, color: GRAY, italic: true, align: "center",
  });
}

// =====================================================
// SLIDE 4 — なぜ重要か（数値で訴求）
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "なぜ重ね合わせ制御が極めて重要か", "歩留まりを直接決める最大のリミッター");
  sectionMarker(s, "02");

  // Three big stat callouts
  const stats = [
    { val: "< 2 nm", lbl: "3nm ノード要求オーバーレイ", note: "ロジック先端ノードでは Single Machine Overlay (SMO) を 2nm 未満に管理" },
    { val: "1/3", lbl: "オーバーレイ予算は CD 予算の 1/3 以下", note: "上層と下層の合計誤差が CD の 1/3 を超えるとパターン断線・ショートが急増" },
    { val: "≧ 30 %", lbl: "歩留損失の主要因の一つ", note: "EUV 多重露光ではオーバーレイ起因の不良が全歩留損失の 3 割以上を占めるケースも" },
  ];
  const sx = [0.55, 4.85, 9.15];
  const sy = 2.2;
  const sw = 3.6, sh = 3.4;
  stats.forEach((st, i) => {
    s.addShape("rect", { x: sx[i], y: sy, w: sw, h: sh, fill: { color: NAVY }, line: { color: NAVY } });
    s.addShape("rect", { x: sx[i], y: sy, w: sw, h: 0.1, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(st.val, { x: sx[i] + 0.1, y: sy + 0.4, w: sw - 0.2, h: 1.5, fontSize: 60, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.lbl, { x: sx[i] + 0.2, y: sy + 1.95, w: sw - 0.4, h: 0.6, fontSize: 13, fontFace: BODY_FONT, bold: true, color: ICE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.note, { x: sx[i] + 0.2, y: sy + 2.55, w: sw - 0.4, h: 0.75, fontSize: 11, fontFace: BODY_FONT, color: ICE_DARK, align: "center", valign: "top", margin: 0 });
  });

  // bottom takeaway
  s.addShape("rect", { x: 0.55, y: 6.0, w: 12.2, h: 0.9, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
  s.addShape("rect", { x: 0.55, y: 6.0, w: 0.1, h: 0.9, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("Take-away  ―  オーバーレイは「測れているだけ」では足りない。装置・計測・前工程の情報を統合し、ロット内さらにはウェーハ内・ショット内で能動補正することが、先端ノード歩留まりの分水嶺になる。", {
    x: 0.8, y: 6.05, w: 11.9, h: 0.8, fontSize: 13, fontFace: BODY_FONT, color: NAVY, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 5 — Lot / Wafer / Shot 階層
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "制御の階層構造  ―  Lot ／ Wafer ／ Shot", "粒度の異なる 3 つのループを重ねて誤差を削る");
  sectionMarker(s, "03");

  const tiers = [
    { name: "Lot 間", sub: "Lot-to-Lot", scope: "数十枚／ロット単位", method: "Run-to-Run (R2R) 制御\nEWMA・カルマンフィルタ", typical: "ドリフト、装置 ID 切替、レチクル交換、メンテ後の回復", color: "#1E2761" },
    { name: "Wafer 間", sub: "Wafer-to-Wafer", scope: "1 枚／ウェーハ単位", method: "ウェーハ計測フィードフォワード\n反り・応力マップ反映", typical: "ロット内ばらつき、CMP 不均一、3D NAND の応力", color: "#2C4DA0" },
    { name: "Shot 間", sub: "Shot-to-Shot", scope: "ショット (露光フィールド) 単位", method: "Per-exposure 補正\n高次グリッド・歪み補正", typical: "フィールド内歪み、レンズ収差、ステージ非線形", color: "#5B7BD6" },
  ];
  const ty = 2.2;
  const th = 1.4;
  tiers.forEach((t, i) => {
    const y = ty + i * (th + 0.18);
    // left color block (wider so labels fit on one line)
    s.addShape("rect", { x: 0.55, y, w: 3.0, h: th, fill: { color: t.color.replace("#","") }, line: { color: t.color.replace("#","") } });
    s.addText(t.name, { x: 0.7, y: y + 0.15, w: 2.8, h: 0.45, fontSize: 20, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(t.sub, { x: 0.7, y: y + 0.6, w: 2.8, h: 0.35, fontSize: 12, fontFace: BODY_FONT, color: ICE, italic: true, valign: "middle", margin: 0 });
    s.addText(t.scope, { x: 0.7, y: y + 0.95, w: 2.8, h: 0.35, fontSize: 10.5, fontFace: BODY_FONT, color: ICE_DARK, valign: "middle", margin: 0 });

    // right content panel
    s.addShape("rect", { x: 3.6, y, w: 9.2, h: th, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addText("主な補正手法", { x: 3.75, y: y + 0.1, w: 4.2, h: 0.35, fontSize: 11, fontFace: BODY_FONT, bold: true, color: GRAY });
    s.addText(t.method, { x: 3.75, y: y + 0.4, w: 4.2, h: 0.9, fontSize: 12, fontFace: BODY_FONT, color: NAVY, valign: "top", margin: 0 });

    s.addText("代表的な対象誤差", { x: 8.15, y: y + 0.1, w: 4.55, h: 0.35, fontSize: 11, fontFace: BODY_FONT, bold: true, color: GRAY });
    s.addText(t.typical, { x: 8.15, y: y + 0.4, w: 4.55, h: 0.9, fontSize: 12, fontFace: BODY_FONT, color: NAVY, valign: "top", margin: 0 });
  });

  s.addText("階層が深くなるほどリアルタイム性が要求される。先端ノードでは 3 階層の合わせ込みが必須。", {
    x: 0.6, y: 6.7, w: 12.2, h: 0.4, fontSize: 12, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 6 — Feedforward vs Feedback
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "フィードフォワード × フィードバック", "2 つのループは競合ではなく補完関係");
  sectionMarker(s, "03");

  // Two-column comparison
  const cards = [
    {
      title: "Feedforward（前送り）",
      sub: "下流処理に上流情報を渡す",
      bullets: [
        "ウェーハ形状計測 (KLA WaferSight 等) を露光直前にスキャナへ転送",
        "Etch 起因のスケーリング・回転を事前にバイアス",
        "新しいレチクル・新ロットでも初手から低残差",
        "Layer N の計測値を Layer N+1 の補正に活用",
      ],
      color: NAVY,
    },
    {
      title: "Feedback（後戻し）",
      sub: "計測結果で次ロットを補正",
      bullets: [
        "露光後のオーバーレイ計測値で次ロットの補正値を更新",
        "EWMA や R2R で長期ドリフトを抑制",
        "装置・レチクル・プロセス IDごとに別系列で管理",
        "計測遅延がある分、Lot 間スケールでの効きが中心",
      ],
      color: NAVY,
    },
  ];
  const cx = [0.55, 6.95];
  const cy = 2.1;
  const cw = 5.85, ch = 4.5;
  cards.forEach((c, i) => {
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: ch, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: 0.7, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.title, { x: cx[i] + 0.25, y: cy + 0.05, w: cw - 0.5, h: 0.4, fontSize: 18, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(c.sub, { x: cx[i] + 0.25, y: cy + 0.4, w: cw - 0.5, h: 0.3, fontSize: 11, fontFace: BODY_FONT, color: ICE, italic: true, valign: "middle", margin: 0 });

    s.addText(c.bullets.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 13, color: NAVY, paraSpaceAfter: 6 } })), {
      x: cx[i] + 0.3, y: cy + 0.9, w: cw - 0.6, h: ch - 1.05, valign: "top", fontFace: BODY_FONT, margin: 0,
    });
  });

  // bottom synthesis bar
  s.addShape("rect", { x: 0.55, y: 6.75, w: 12.25, h: 0.55, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("ベストプラクティス：Feedforward で初期残差を最小化 → Feedback で経時変化を吸収。両ループのゲインを別々にチューニングする。", {
    x: 0.7, y: 6.75, w: 12.0, h: 0.55, fontSize: 12, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 7 — ASML
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "ASML  ―  Holistic Lithography", "スキャナ＋計測＋ソフトを 1 つのループに統合");
  sectionMarker(s, "04");

  // left column: products
  s.addShape("rect", { x: 0.55, y: 2.1, w: 5.6, h: 4.7, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
  s.addText("Key Products / 技術", { x: 0.75, y: 2.2, w: 5.2, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY });
  const asmlItems = [
    ["TWINSCAN NXT / NXE", "i ライン〜ArF immersion〜EUV までの露光プラットフォーム"],
    ["YieldStar 1375F", "回折ベースのオーバーレイ計測。専用学習マークと ML で他層干渉に強い"],
    ["Litho InSight (LIS)", "YieldStar 計測値とスキャナログを Feedforward／Feedback に変換"],
    ["Overlay Optimizer 3", "高次補正と per-exposure 補正をスキャナへ流し込むソフト"],
    ["µDBF (micro DBF)", "オンプロダクトのフォーカス計測。スキャナと密に統合された Focus Map"],
  ];
  let yy = 2.7;
  asmlItems.forEach(([k, v]) => {
    s.addShape("ellipse", { x: 0.8, y: yy + 0.05, w: 0.18, h: 0.18, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(k, { x: 1.1, y: yy - 0.05, w: 5.0, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(v, { x: 1.1, y: yy + 0.27, w: 5.0, h: 0.55, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
    yy += 0.82;
  });

  // right column: practices
  s.addShape("rect", { x: 6.35, y: 2.1, w: 6.45, h: 4.7, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText("運用ベストプラクティス", { x: 6.55, y: 2.2, w: 6.1, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: ICE });
  const asmlPractices = [
    "Wafer-by-wafer Feedforward と Lot-to-Lot Feedback を同一フレームで運用（USPTO 11,221,561 等）。",
    "10/7nm 以降のマルチパターニングでは、Holistic Overlay 制御で per-exposure 高次補正を必須化。",
    "RegC（レチクル補正）と TWINSCAN 補正を共最適化し、Intra-field OPO を改善。",
    "YieldStar の ML マーク選択で、計測ノイズを抑え制御ループのゲインを上げる。",
    "Litho InSight で計測〜補正までを SECS/GEM に流し、Fab APC と連携。",
  ];
  s.addText(asmlPractices.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 12, color: WHITE, paraSpaceAfter: 6 } })), {
    x: 6.55, y: 2.65, w: 6.1, h: 4.0, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addText("出典: ASML 製品資料・SPIE 論文・USPTO 9,087,176 / 11,221,561 ほか", {
    x: 0.55, y: 6.95, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 8 — KLA
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "KLA  ―  5D Patterning Control", "計測の精度と密度で制御の素材を提供する");
  sectionMarker(s, "04");

  // top row: 3 product cards
  const kla = [
    { name: "Archer 600", desc: "イメージング型オーバーレイ計測。新光学と新ターゲットで sub-3nm を実現", icon: "OL" },
    { name: "ATL100", desc: "スキャトロメトリ型オーバーレイ。可変波長レーザと Homing™ で ≤7nm 量産向け", icon: "SC" },
    { name: "WaferSight PWG", desc: "ウェーハ形状計測。Wafer Shape を露光前にスキャナへ Feedforward", icon: "WS" },
  ];
  const kx = [0.55, 4.85, 9.15];
  const ky = 2.05;
  const kw = 3.65, kh = 2.0;
  kla.forEach((k, i) => {
    s.addShape("rect", { x: kx[i], y: ky, w: kw, h: kh, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("ellipse", { x: kx[i] + 0.25, y: ky + 0.3, w: 0.7, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(k.icon, { x: kx[i] + 0.25, y: ky + 0.3, w: 0.7, h: 0.7, fontSize: 12, fontFace: BODY_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(k.name, { x: kx[i] + 1.1, y: ky + 0.25, w: kw - 1.2, h: 0.45, fontSize: 16, fontFace: HEADER_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(k.desc, { x: kx[i] + 1.1, y: ky + 0.72, w: kw - 1.25, h: 1.2, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
  });

  // bottom: practices in dark panel
  s.addShape("rect", { x: 0.55, y: 4.3, w: 12.25, h: 2.6, fill: { color: NAVY }, line: { color: NAVY } });
  s.addShape("rect", { x: 0.55, y: 4.3, w: 0.1, h: 2.6, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("KLA に学ぶオーバーレイ制御の運用", { x: 0.85, y: 4.4, w: 11.5, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: ICE });
  const klaPractices = [
    "K-T Analyzer 9.0 で「全ウェーハ計測」を要さず、サンプリング計測から per-exposure のスキャナ補正値を生成 (In-line, On-product, Lot-by-Lot)。",
    "WaferSight PWG2 のウェーハ形状を露光直前にフィードフォワード。3D NAND の応力起因オーバーレイに特に有効。",
    "Nikon と共同で Scanner Match Maker (SMM) を開発し、Mix & Match 露光のオーバーレイを自動補正。",
    "計測の歩留損失要因（コラプス、マーク変形、スタック干渉）を ML/AI で除外し、補正の S/N を確保。",
  ];
  s.addText(klaPractices.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 12, color: WHITE, paraSpaceAfter: 5 } })), {
    x: 0.95, y: 4.85, w: 11.7, h: 1.95, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addText("出典: KLA IR Press Release・KLA 製品ページ・WaferSight PWG ブローシャ", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 9 — Nikon
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "Nikon  ―  Litho Booster / Grid Control", "スキャナの外側にもう 1 段の補正レイヤを置く");
  sectionMarker(s, "04");

  // diagram on the right: scanner box → Litho Booster → wafer with grid arrows
  const baseX = 7.0, baseY = 2.1, w = 5.8, h = 4.6;
  s.addShape("rect", { x: baseX, y: baseY, w: w, h: h, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
  s.addText("Litho Booster 概念図", { x: baseX, y: baseY + 0.1, w: w, h: 0.35, fontSize: 13, fontFace: BODY_FONT, bold: true, color: NAVY, align: "center" });

  s.addShape("rect", { x: baseX + 0.5, y: baseY + 0.7, w: 2.0, h: 1.1, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText("Scanner", { x: baseX + 0.5, y: baseY + 0.7, w: 2.0, h: 1.1, fontSize: 14, fontFace: BODY_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });

  s.addShape("rect", { x: baseX + 3.3, y: baseY + 0.7, w: 2.0, h: 1.1, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("Litho\nBooster", { x: baseX + 3.3, y: baseY + 0.7, w: 2.0, h: 1.1, fontSize: 13, fontFace: BODY_FONT, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });

  s.addShape("line", { x: baseX + 2.5, y: baseY + 1.25, w: 0.8, h: 0, line: { color: NAVY, width: 2, endArrowType: "triangle" } });

  // grid array
  const gx0 = baseX + 0.6, gy0 = baseY + 2.3;
  const cells = 5;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      s.addShape("rect", {
        x: gx0 + c * 0.85, y: gy0 + r * 0.35, w: 0.8, h: 0.3,
        fill: { color: WHITE }, line: { color: ICE_DARK, width: 0.5 },
      });
    }
  }
  s.addText("Linear / High-order / Local / Die-by-Die 補正", { x: baseX + 0.3, y: baseY + 4.15, w: w - 0.6, h: 0.35, fontSize: 11, fontFace: BODY_FONT, color: GRAY, italic: true, align: "center" });

  // left: text bullets
  s.addText("Nikon の重ね合わせ制御アプローチ", { x: 0.55, y: 2.1, w: 6.3, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY });
  const nikon = [
    { h: "スタンドアロン補正ステーション", b: "Litho Booster は露光直前に独立アライメント計測を行い、スキャナのスループットを下げずに密なマップを取得" },
    { h: "多段の Grid 補正モード", b: "Linear / High-order Global / Local Area / Die-by-Die の階層補正で、ウェーハ全域とショット内の両方をカバー" },
    { h: "Grid Control Mapping (GCM)", b: "現層のステージグリッドを下層シグネチャと一致させ、Mix & Match での残差を低減" },
    { h: "Stage Distortion Match (SDM)", b: "フィールド内の歪みを下層に合わせ込み、世代の違うスキャナ間の重ね合わせを揃える" },
    { h: "KLA との SMM 連携", b: "計測〜補正までを自動化し、Mix & Match の手作業を排除" },
  ];
  let ny = 2.55;
  nikon.forEach(n => {
    s.addShape("rect", { x: 0.55, y: ny, w: 0.06, h: 0.7, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(n.h, { x: 0.75, y: ny - 0.02, w: 6.0, h: 0.35, fontSize: 12, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(n.b, { x: 0.75, y: ny + 0.28, w: 6.0, h: 0.5, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
    ny += 0.82;
  });

  s.addText("出典: Nikon Precision (Litho Booster), KLA-Nikon SMM プレスリリース", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 10 — Canon
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "Canon  ―  HODC と NIL の高次補正", "FPA スキャナ と Nanoimprint で異なる戦略");
  sectionMarker(s, "04");

  // Two-column: FPA / NIL
  const cards = [
    {
      title: "FPA-6300ES6a (ArFi)",
      sub: "ArF Immersion スキャナ",
      bullets: [
        "Mix & Match Overlay ≤ 5nm を実現",
        "露光部・レチクル部の精密温度管理がポイント",
        "Toshiba (現キオクシア) と協業し 10nm μ+3σ を達成（Mix & Match モード）",
        "ストレージ系メモリ向け量産機として実績多数",
      ],
      color: NAVY,
    },
    {
      title: "FPA-1200NZ2C / NIL",
      sub: "Nanoimprint Lithography",
      bullets: [
        "i-MAT (Interferometric Moiré Alignment) で実時間ずれ検出",
        "HODC が K30 次までの歪み補正を発動",
        "ショットごとの Intra-field 補正で残差を抑える",
        "2018 年で SMO 2.5nm、Mix & Match 3.4nm を到達",
      ],
      color: NAVY,
    },
  ];
  const cx = [0.55, 6.95];
  const cy = 2.1;
  const cw = 5.85, ch = 4.0;
  cards.forEach((c, i) => {
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: ch, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x: cx[i], y: cy, w: cw, h: 0.7, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.title, { x: cx[i] + 0.25, y: cy + 0.05, w: cw - 0.5, h: 0.4, fontSize: 17, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(c.sub, { x: cx[i] + 0.25, y: cy + 0.4, w: cw - 0.5, h: 0.3, fontSize: 11, fontFace: BODY_FONT, color: ICE, italic: true, valign: "middle", margin: 0 });
    s.addText(c.bullets.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 12, color: NAVY, paraSpaceAfter: 5 } })), {
      x: cx[i] + 0.3, y: cy + 0.85, w: cw - 0.6, h: ch - 1.0, fontFace: BODY_FONT, valign: "top", margin: 0,
    });
  });

  // bottom takeaway
  s.addShape("rect", { x: 0.55, y: 6.25, w: 12.25, h: 0.85, fill: { color: NAVY }, line: { color: NAVY } });
  s.addShape("rect", { x: 0.55, y: 6.25, w: 0.1, h: 0.85, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("Canon の特徴：環境制御 (温調) と機械系の高次補正 (HODC) で残差を物理的に小さくしてから、ソフト補正に委ねる順序設計。NIL はマスクとウェーハを直接接触させる特性上、ショットごとの実時間補正が必須。", {
    x: 0.85, y: 6.25, w: 11.85, h: 0.85, fontSize: 11.5, fontFace: BODY_FONT, color: WHITE, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 11 — IBM
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "IBM  ―  産業強度の Lithography APC", "300mm Fab で R2R 制御の枠組みを業界に広めた先駆者");
  sectionMarker(s, "05");

  // left: text
  s.addText([
    { text: "IBM の貢献\n", options: { bold: true, fontSize: 16, color: NAVY } },
    { text: "IBM Center for Nanoelectronics (Albany) で、CD と Overlay を closed-loop で同時に維持する Lithography APC の業界標準的フレームを構築。SPIE 5044 (Industrial-strength Lithography APC) で枠組みを公開し、後の各社実装の基礎となった。\n\n", options: { fontSize: 12, color: GRAY } },
    { text: "技術ポイント\n", options: { bold: true, fontSize: 16, color: NAVY } },
    { text: "・露光ツールの入力 (用量・フォーカス・補正値) を R2R でクローズドループ制御\n・装置 ID、レチクル ID、プロセス ID を Context Key として系列を分離\n・EWMA を基本に外乱（メンテ・温度変化）を別系統で扱う\n・後年は ML による Virtual Metrology で計測サイクルを短縮", options: { fontSize: 12, color: GRAY } },
  ], { x: 0.55, y: 2.1, w: 6.5, h: 4.7, valign: "top", margin: 0 });

  // right: stylized timeline / flow
  const rx = 7.3, ry = 2.1, rw = 5.5, rh = 4.7;
  s.addShape("rect", { x: rx, y: ry, w: rw, h: rh, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText("APC 制御の流れ (IBM 型)", { x: rx, y: ry + 0.15, w: rw, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: ICE, align: "center" });

  const steps = [
    ["1", "露光", "Exposure with current recipe"],
    ["2", "計測", "Overlay & CD metrology"],
    ["3", "Context 分離", "Tool / Reticle / Process"],
    ["4", "EWMA 更新", "新しい補正値を計算"],
    ["5", "次ロットに適用", "Recipe を更新"],
  ];
  let sy2 = ry + 0.7;
  steps.forEach(([n, h, b]) => {
    s.addShape("ellipse", { x: rx + 0.3, y: sy2, w: 0.6, h: 0.6, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(n, { x: rx + 0.3, y: sy2, w: 0.6, h: 0.6, fontSize: 18, fontFace: HEADER_FONT, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });
    s.addText(h, { x: rx + 1.05, y: sy2, w: rw - 1.2, h: 0.32, fontSize: 13, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(b, { x: rx + 1.05, y: sy2 + 0.32, w: rw - 1.2, h: 0.4, fontSize: 10, fontFace: BODY_FONT, color: ICE, valign: "top", margin: 0 });
    sy2 += 0.78;
  });

  s.addText("出典: SPIE 5044『Industrial-strength Lithography APC』, IBM Center for Nanoelectronics 公開資料", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 12 — SK Hynix
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "SK Hynix  ―  High-NA EUV と DRAM への適用", "DRAM 業界で初めて High-NA EUV (EXE:5200B) を導入");
  sectionMarker(s, "05");

  // headline stat
  s.addShape("rect", { x: 0.55, y: 2.1, w: 5.5, h: 4.7, fill: { color: NAVY }, line: { color: NAVY } });
  s.addShape("rect", { x: 0.55, y: 2.1, w: 0.1, h: 4.7, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("High-NA EUV", { x: 0.85, y: 2.3, w: 5.0, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: ICE, bold: true });
  s.addText("× 1.7", { x: 0.85, y: 2.7, w: 5.0, h: 1.4, fontSize: 80, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
  s.addText("従来 EUV 比で 1.7 倍の解像度", { x: 0.85, y: 4.1, w: 5.0, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: ICE });
  s.addText("× 3", { x: 0.85, y: 4.55, w: 5.0, h: 1.2, fontSize: 64, fontFace: HEADER_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
  s.addText("ほぼ 3 倍のトランジスタ密度", { x: 0.85, y: 5.75, w: 5.0, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: ICE });
  s.addText("マルチパターニング段数の削減により Overlay 残差を構造的に低減", { x: 0.85, y: 6.2, w: 5.0, h: 0.55, fontSize: 11, fontFace: BODY_FONT, color: ICE_DARK, italic: true });

  // right: practices
  s.addText("DRAM 向け Overlay 制御の要点", { x: 6.35, y: 2.1, w: 6.45, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY });
  const skItems = [
    ["High-NA で多重露光を削減", "オーバーレイ誤差の原因となるリソ回数自体を減らす方が王道。"],
    ["M16 Fab (Icheon) で導入", "DRAM 業界初の EXE:5200B 設置。歩留まり改善と微細化を両立。"],
    ["Holistic 制御の踏襲", "ASML の YieldStar / LIS と KLA Archer を組合せ、Lot / Wafer / Shot を多層補正。"],
    ["3D NAND 向け応力対策", "ウェーハ反り計測を Feedforward。Etch 起因の非対称歪みを補正。"],
    ["世代別レシピ管理", "1a/1b/1c nm 世代ごとに別の Context で R2R 制御。"],
  ];
  let yy = 2.6;
  skItems.forEach(([k, v]) => {
    s.addShape("rect", { x: 6.35, y: yy, w: 6.45, h: 0.78, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x: 6.35, y: yy, w: 0.08, h: 0.78, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(k, { x: 6.5, y: yy + 0.05, w: 6.2, h: 0.32, fontSize: 12, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(v, { x: 6.5, y: yy + 0.36, w: 6.2, h: 0.4, fontSize: 10.5, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
    yy += 0.85;
  });

  s.addText("出典: SemiWiki, Dr. Robert Castellano (2025), ASML 公開発表", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 13 — Kioxia
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "キオクシア  ―  3D NAND と Overlay", "高アスペクトの応力下でいかに重ねるか");
  sectionMarker(s, "05");

  // 3D NAND stack motif
  const baseX = 0.55, baseY = 2.1, w = 5.4, h = 4.5;
  s.addShape("rect", { x: baseX, y: baseY, w, h, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
  s.addText("3D NAND の Overlay 課題", { x: baseX, y: baseY + 0.15, w: w, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY, align: "center" });

  // stack illustration: many horizontal layers
  const layers = 16;
  const lx = baseX + 0.7, ly = baseY + 0.8;
  for (let i = 0; i < layers; i++) {
    const col = i % 2 === 0 ? ICE_DARK : NAVY;
    s.addShape("rect", { x: lx, y: ly + i * 0.16, w: 4.0, h: 0.14, fill: { color: col }, line: { color: col } });
  }
  // channel hole arrow
  s.addShape("line", { x: lx + 2.0, y: ly - 0.15, w: 0, h: layers * 0.16 + 0.2, line: { color: ACCENT, width: 2 } });
  s.addText("数百層を積層→応力 / 反りで上層がずれる", {
    x: baseX + 0.3, y: baseY + 3.7, w: w - 0.6, h: 0.6,
    fontSize: 11, fontFace: BODY_FONT, italic: true, color: GRAY, align: "center", valign: "top",
  });

  // right: practices
  s.addText("キオクシアが採る制御戦略", { x: 6.15, y: 2.1, w: 6.7, h: 0.4, fontSize: 14, fontFace: BODY_FONT, bold: true, color: NAVY });
  const kio = [
    ["Wafer Shape Feedforward", "KLA WaferSight 系の形状データを露光前にスキャナへ転送し、応力起因の歪みを事前補正"],
    ["Mix & Match の徹底", "ArFi スキャナ (Canon FPA-6300ES6a 等) を世代横断で組合せ、Nikon GCM/SDM や KLA SMM で補正"],
    ["High-order Grid 補正", "ウェーハ全面のスケーリング・回転だけでなく、局所領域の補正値を別系列で更新"],
    ["世代間 APC レシピ継承", "BiCS 世代間で R2R 補正の初期値を継承し、立ち上げ期間を短縮"],
    ["EUV 導入の段階適用", "2024-2027 にかけて選択層へ EUV 採用。先行層を Feedforward の参照に活用"],
  ];
  let yy = 2.6;
  kio.forEach(([k, v]) => {
    s.addShape("rect", { x: 6.15, y: yy, w: 6.7, h: 0.78, fill: { color: NAVY }, line: { color: NAVY } });
    s.addShape("rect", { x: 6.15, y: yy, w: 0.08, h: 0.78, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(k, { x: 6.3, y: yy + 0.05, w: 6.5, h: 0.32, fontSize: 12, fontFace: BODY_FONT, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(v, { x: 6.3, y: yy + 0.36, w: 6.5, h: 0.4, fontSize: 10.5, fontFace: BODY_FONT, color: ICE, valign: "top", margin: 0 });
    yy += 0.85;
  });

  s.addText("出典: KLA WaferSight PWG2 (3D NAND 向け Wafer Shape 補正), Canon FPA-6300ES6a 製品資料 (旧東芝 / 現キオクシア事例)", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 9, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 14 — 機械学習・仮想計測
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "機械学習と仮想計測 (Virtual Metrology)", "「全数測れない」を「全数推定する」に置き換える");
  sectionMarker(s, "06");

  // three column "how it works"
  const items = [
    { h: "入力 (特徴量)", b: "・スキャナログ\n・適用された APC 補正値\n・装置 ID / レチクル ID\n・前工程の Context (Etch, CMP)\n・YieldStar / Archer の計測値" },
    { h: "モデル", b: "・Gradient Boosting / DNN\n・Gaussian Process で不確実性も推定\n・Context ごとに別モデル\n・物理モデル (Zernike, Grid) と組合せ" },
    { h: "出力 / 効果", b: "・サンプリングしていないウェーハの Overlay を推定\n・計測サイクル短縮 (KLA 試算で数日 → 数時間)\n・Feedforward への活用\n・異常検知・ドリフト早期検知" },
  ];
  const ix = [0.55, 4.85, 9.15];
  const iy = 2.1;
  const iw = 3.65, ih = 4.0;
  items.forEach((it, i) => {
    s.addShape("rect", { x: ix[i], y: iy, w: iw, h: ih, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x: ix[i], y: iy, w: iw, h: 0.6, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(it.h, { x: ix[i], y: iy, w: iw, h: 0.6, fontSize: 15, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(it.b, { x: ix[i] + 0.3, y: iy + 0.8, w: iw - 0.6, h: ih - 1.0, fontSize: 12, fontFace: BODY_FONT, color: NAVY, valign: "top", margin: 0 });
  });

  // bottom: caveat
  s.addShape("rect", { x: 0.55, y: 6.3, w: 12.25, h: 0.85, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText("注意：ML はあくまで「測れない部分の推定」に使い、最終判定は物理計測で押さえる。Context が変わると学習データが効かなくなるため、再学習トリガーをルール化することが必須。", {
    x: 0.85, y: 6.3, w: 11.85, h: 0.85, fontSize: 12, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0,
  });
}

// =====================================================
// SLIDE 15 — Best Practices (10)
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "現場に効くベストプラクティス 10", "ロジック／メモリ／3D NAND を横断する共通原則");
  sectionMarker(s, "07");

  const bp = [
    ["01", "階層を 3 段で設計", "Lot / Wafer / Shot のループを分けて持つ"],
    ["02", "Feedforward を先に効かす", "FB だけだと初期残差が残る。前工程情報を活かす"],
    ["03", "Context Key を必ず分離", "Tool / Reticle / Process ID で別系列に"],
    ["04", "EWMA はゲインを別チューニング", "FF と FB でゲインを別に持つ"],
    ["05", "ウェーハ形状を Feedforward", "応力起因歪みは計測で先取りする"],
    ["06", "高次補正を躊躇しない", "K30 次までの歪み補正を実装"],
    ["07", "Mix & Match は SMM/GCM で吸収", "世代違いスキャナを混ぜる前提で設計"],
    ["08", "ML は推定、物理は判定", "ML で全数推定、物理計測で抜き取り検証"],
    ["09", "計測の S/N を死守", "マーク選択と ML フィルタで計測精度を確保"],
    ["10", "Holistic に統合する", "装置・計測・APC・前工程をひとつのループで扱う"],
  ];

  const cols = 2, rows = 5;
  const cellW = 6.05, cellH = 0.85;
  const x0 = 0.55, y0 = 2.1;
  bp.forEach((b, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    const x = x0 + col * (cellW + 0.15);
    const y = y0 + row * (cellH + 0.12);
    s.addShape("rect", { x, y, w: cellW, h: cellH, fill: { color: PANEL }, line: { color: ICE_DARK, width: 0.5 } });
    s.addShape("rect", { x, y, w: 0.85, h: cellH, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(b[0], { x, y, w: 0.85, h: cellH, fontSize: 22, fontFace: HEADER_FONT, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(b[1], { x: x + 1.0, y: y + 0.08, w: cellW - 1.1, h: 0.35, fontSize: 12.5, fontFace: BODY_FONT, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(b[2], { x: x + 1.0, y: y + 0.42, w: cellW - 1.1, h: 0.4, fontSize: 10.5, fontFace: BODY_FONT, color: GRAY, valign: "top", margin: 0 });
  });
}

// =====================================================
// SLIDE 16 — 各社マッピング一覧
// =====================================================
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  addTitle(s, "各社の強み  ―  まとめマトリクス", "どの粒度・どの層で効くのかを一望");
  sectionMarker(s, "07");

  // Table
  const header = ["プレイヤー", "得意領域", "Lot間", "Wafer間", "Shot内", "代表ソリューション"];
  const rows = [
    ["ASML",      "装置×計測×APC 統合",    "◎", "◎", "◎", "Holistic Lithography / LIS"],
    ["KLA",       "Overlay/形状の高精度計測",  "◎", "◎", "○", "Archer 600 / WaferSight"],
    ["Nikon",     "Mix & Match と Grid 補正", "○", "◎", "◎", "Litho Booster / GCM / SDM"],
    ["Canon",     "温調と高次歪み補正",       "○", "◎", "◎", "FPA-6300ES6a / HODC / NIL"],
    ["IBM",       "APC フレーム設計",         "◎", "○", "○", "Industrial-strength APC"],
    ["SK Hynix",  "High-NA EUV 量産導入",     "◎", "◎", "○", "EXE:5200B + Holistic"],
    ["キオクシア", "3D NAND の応力対応",       "○", "◎", "○", "Wafer Shape FF + Mix & Match"],
  ];
  const tableRows = [];
  tableRows.push(header.map(h => ({
    text: h,
    options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: BODY_FONT, align: "center", valign: "middle" }
  })));
  rows.forEach((r, i) => {
    const fill = i % 2 === 0 ? PANEL : WHITE;
    tableRows.push(r.map((c, j) => ({
      text: c,
      options: {
        bold: j === 0,
        color: NAVY,
        fill: { color: fill },
        fontSize: 11.5,
        fontFace: BODY_FONT,
        align: j === 0 || j === 1 || j === 5 ? "left" : "center",
        valign: "middle",
      }
    })));
  });

  s.addTable(tableRows, {
    x: 0.55, y: 2.15, w: 12.25,
    colW: [1.5, 3.0, 1.0, 1.0, 1.0, 4.75],
    rowH: 0.55,
    border: { type: "solid", color: ICE_DARK, pt: 0.5 },
    fontFace: BODY_FONT,
  });

  s.addText("◎: 業界をリードする実装あり　○: 一定の実装あり。社内ニーズに応じて重み付けして組合せる。", {
    x: 0.55, y: 7.0, w: 12.25, h: 0.3, fontSize: 10, fontFace: BODY_FONT, italic: true, color: GRAY,
  });
}

// =====================================================
// SLIDE 17 — Closing
// =====================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape("rect", { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: ACCENT }, line: { color: ACCENT } });

  s.addText("まとめと展望", {
    x: 0.7, y: 1.0, w: 12, h: 0.9, fontSize: 40, fontFace: HEADER_FONT, bold: true, color: WHITE, margin: 0,
  });
  s.addText("High-NA EUV と AI 統合制御の時代へ", {
    x: 0.7, y: 1.95, w: 12, h: 0.5, fontSize: 18, fontFace: BODY_FONT, italic: true, color: ICE, margin: 0,
  });

  const closing = [
    "重ね合わせ制御は「精密に測る」だけでなく、「予測して先回りする」フェーズに入った。",
    "Feedforward × Feedback × Lot/Wafer/Shot の 3 階層を組合せた Holistic な設計が事実上の標準。",
    "計測 (KLA)・装置 (ASML / Nikon / Canon)・APC (IBM 系)・量産 (SK Hynix / キオクシア) が同一ループで連携する時代。",
    "High-NA EUV により多重露光は減るが、フィールドサイズ縮小で Shot 間補正の重要度はむしろ高まる。",
    "今後は ML / Virtual Metrology による「全数推定」と、物理計測による「節目の検証」の二刀流が決め手になる。",
  ];
  s.addText(closing.map(b => ({ text: b, options: { bullet: { code: "25A0" }, fontSize: 16, color: WHITE, paraSpaceAfter: 10 } })), {
    x: 0.9, y: 2.8, w: 11.7, h: 3.5, fontFace: BODY_FONT, valign: "top", margin: 0,
  });

  s.addText("ご清聴ありがとうございました", {
    x: 0.7, y: 6.4, w: 12, h: 0.5, fontSize: 14, fontFace: BODY_FONT, italic: true, color: ICE_DARK,
  });
}

pres.writeFile({ fileName: "overlay-control-best-practices.pptx" })
  .then(name => console.log("Wrote:", name))
  .catch(err => { console.error(err); process.exit(1); });
