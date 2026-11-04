// scenes-faq.js — 想定質問の動画（faq.html）の場面。本編の補足として、よくある質問に式と図で答える。
// 中心は「加法カーネルの部品が、事後に相関すること」とその影響（Q1〜Q3）。表や字幕の数値は、ここで計算した値を使う。
// 書き方は scenes-basic.js と同じ。chapter は質問の番号、chapterLabel・part で見出しの「Q1」「想定質問」を出す。
(() => {
  const { W, C, Plot, fmt, texNum, canvasText, legend, keyframes } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };
  const PART = '想定質問';
  const PAIR_DASHES = [null, [12, 7], [3, 6]]; // 同じ組の f₁ と f₂ は同じ線の種類で描く

  const QUESTIONS = [
    '加法カーネルの部品は、なぜ事後に相関するのか',
    '事後の相関は、何に影響するのか',
    '質的変数のずれでも、同じことが起きるのか',
    '周辺尤度とは、何か',
    'ガンマ関数とは、何か',
    'RBF と Matérn は、どちらを使えばよいか',
    R`ノイズ $\sigma_n^2$ は、何のためにあるのか`,
    'データが多いと、なぜ計算が重いのか',
  ];
  const question = (n, extra = {}) => ({ chapter: n, chapterLabel: `Q${n}`, part: PART, ...extra });

  // ---------------------------------------------------------------- 題名と質問の一覧
  SCENES.push({
    id: 'Q0',
    chapter: 0,
    kind: 'title',
    title: '想定質問と回答',
    beats: [
      beat('ガウス過程回帰の解説動画について、想定される質問と、その答えをまとめました。', 7),
      beat('とくに、加法カーネルの部品が、データを見たあとに相関する点と、その影響を詳しく見ていきます。', 9),
    ],
    build(ui) {
      ui.text('ガウス過程回帰　想定質問と回答', { x: 0, y: 110, w: W, align: 'center', size: 64, weight: 800 });
      ui.text('本編の補足：よくある質問に、式と図で答える', { x: 0, y: 210, w: W, align: 'center', size: 30, color: C.text2, delay: 0.3 });
      QUESTIONS.forEach((q, i) => ui.text(`<span class="toc-num">Q${i + 1}</span>${q}`, {
        x: 400, y: 295 + i * 54, size: 27, delay: 0.6 + 0.15 * i,
        glow: i < 3 ? [{ from: 1, color: C.yellow }] : undefined,
      }));
    },
  });

  // ---------------------------------------------------------------- Q1 理論（なぜ事後に相関するのか）
  // 1点だけの例: 事前の分散 k₁, k₂、ノイズ σ_n²、観測 y。(f₁, f₂, y) の多変量正規分布を y で条件づける
  const ONE = { k1: 1, k2: 0.5, noise: 0.01, y: 1 };
  const oneTotal = ONE.k1 + ONE.k2 + ONE.noise;
  const ONE_POST = {
    mean1: (ONE.k1 / oneTotal) * ONE.y,
    mean2: (ONE.k2 / oneTotal) * ONE.y,
    var1: ONE.k1 - ONE.k1 ** 2 / oneTotal,
    var2: ONE.k2 - ONE.k2 ** 2 / oneTotal,
    cov: -(ONE.k1 * ONE.k2) / oneTotal,
  };
  ONE_POST.rho = ONE_POST.cov / Math.sqrt(ONE_POST.var1 * ONE_POST.var2);
  ONE_POST.varSum = ONE_POST.var1 + ONE_POST.var2 + 2 * ONE_POST.cov;

  SCENES.push({
    id: 'Q1T',
    ...question(1),
    kind: 'theory',
    title: QUESTIONS[0],
    beats: [
      beat(R`加法モデル $y = f_1 + f_2 + \varepsilon$ では、2つの部品は事前には独立です。ところが、データを見たあとは相関します。`, 10),
      beat('データが教えてくれるのは「和」だけだからです。和が分かっても、どちらがいくら受け持つかは決まりません。', 10),
      beat(R`例えば $y = 1$ なら、$f_1$ が大きければ $f_2$ は小さいはず。「片方が上がれば、片方が下がる」負の相関が生まれます。`, 10),
      beat(R`1点だけで計算します。$f_1, f_2, y$ を並べると多変量正規分布です。$k_1 = ${ONE.k1}$、$k_2 = ${ONE.k2}$、$\sigma_n^2 = ${ONE.noise}$ とします。`, 10),
      beat(R`第1章の条件付きの式から、事後の共分散は $-k_1 k_2 / (k_1 + k_2 + \sigma_n^2) = ${texNum(ONE_POST.cov, 3)}$、相関係数は ${fmt(ONE_POST.rho, 3)} です。`, 11),
      beat(R`一方、和 $f_1 + f_2$ の分散は ${fmt(ONE_POST.varSum, 4)} と、とても小さい。部品は不確かでも、和はよく分かっています。`, 10),
      beat(R`データが多いときも同じ形で、事後の共分散は $-\mathbf{k}_1^{\top}(K + \sigma_n^2 I)^{-1}\mathbf{k}_2$ です。`, 9),
    ],
    build(ui) {
      ui.tex(R`y = \textcolor{${C.blue}}{f_1} + \textcolor{${C.orange}}{f_2} + \varepsilon,\qquad f_1 \perp f_2\ \ \text{（事前は独立）}`, { x: LEFT_X, y: 128, size: 34 });
      ui.text('データが教えるのは「和」だけ → 分け方は決まらない', { x: LEFT_X, y: 210, size: 27, weight: 700, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.text(R`$y = 1$ なら：$f_1$ が大きい ⇔ $f_2$ が小さい（負の相関）`, { x: LEFT_X + 20, y: 268, size: 25, color: C.text2, at: 2 });
      ui.tex(R`\begin{bmatrix} f_1 \\ f_2 \\ y \end{bmatrix} \sim \mathcal{N}\!\left(\mathbf{0},\ \begin{bmatrix} k_1 & 0 & k_1 \\ 0 & k_2 & k_2 \\ k_1 & k_2 & k_1 + k_2 + \sigma_n^2 \end{bmatrix}\right)`, { x: LEFT_X, y: 330, size: 28, at: 3 });
      ui.tex(R`\operatorname{Cov}[f_1, f_2 \mid y] = 0 - \frac{k_1\, k_2}{k_1 + k_2 + \sigma_n^2} < 0`, { x: LEFT_X, y: 500, size: 30, at: 4, glow: [{ from: 4, to: 5, color: C.yellow }] });
      ui.tex(R`\operatorname{Cov}\big[f_1(x), f_2(x') \mid \mathbf{y}\big] = -\,\mathbf{k}_1(x)^{\top}(K + \sigma_n^2 I)^{-1}\,\mathbf{k}_2(x')`, { x: LEFT_X, y: 620, size: 28, at: 6, glow: [{ from: 6, color: C.yellow }] });

      ui.card({ x: CARD_X, y: 330, w: CARD_W, h: 360, title: R`1点の例（$k_1 = ${ONE.k1},\ k_2 = ${ONE.k2},\ \sigma_n^2 = ${ONE.noise}$）`, at: 3 });
      ui.text(R`$y = ${ONE.y}$ を観測したあと`, { x: CARD_X + 24, y: 385, size: 22, color: C.text2, at: 3, delay: 0.4 });
      ui.table({
        x: CARD_X + 16, y: 425, widths: [290, 160], size: 23, rowH: 44, at: 4, aligns: ['left', 'right'],
        header: ['', '値'],
        rows: [
          [R`$f_1$ の分散`, fmt(ONE_POST.var1, 3)],
          [R`$f_2$ の分散`, fmt(ONE_POST.var2, 3)],
          ['共分散', fmt(ONE_POST.cov, 3)],
          ['相関係数', fmt(ONE_POST.rho, 3)],
          [R`和 $f_1 + f_2$ の分散`, `<b>${fmt(ONE_POST.varSum, 4)}</b>`],
        ],
        rowAt: [4, 4, 4, 4, 5],
        rowDelay: 0,
        glowRows: { 2: [{ from: 4, to: 5, color: C.yellow }], 3: [{ from: 4, to: 5, color: C.yellow }], 4: [{ from: 5, to: 6, color: C.aqua }] },
      });
    },
  });

  // ---------------------------------------------------------------- Q1 図解（1点の部品の値を打つ）
  const ONE_POINTS = 300;
  // 事後の 2×2 共分散のコレスキー分解（点を動かす先）
  const ONE_L11 = Math.sqrt(ONE_POST.var1);
  const ONE_L21 = ONE_POST.cov / ONE_L11;
  const ONE_L22 = Math.sqrt(Math.max(ONE_POST.var2 - ONE_L21 ** 2, 0));
  const ONE_INTERVALS = [
    { label: 'f₁（部品1）', mean: ONE_POST.mean1, sd: Math.sqrt(ONE_POST.var1), color: C.blue },
    { label: 'f₂（部品2）', mean: ONE_POST.mean2, sd: Math.sqrt(ONE_POST.var2), color: C.orange },
    { label: 'f₁ + f₂（和）', mean: ONE_POST.mean1 + ONE_POST.mean2, sd: Math.sqrt(ONE_POST.varSum), color: C.text },
  ];

  SCENES.push({
    id: 'Q1V',
    ...question(1),
    kind: 'visual',
    title: '事後の相関を図で見る（1点の例）',
    poster: 14,
    beats: [
      beat(R`左は、1点での部品の値 $(f_1, f_2)$ を 300 回取り出したものです。事前は独立なので、楕円は軸に沿っています。`, 10),
      beat(R`$y = 1$ を観測すると、点は $f_1 + f_2 = 1$ の線（黄色の点線）の近くに集まります。`, 9),
      beat('線は右下がり。f₁ が大きい点ほど f₂ が小さい、強い負の相関です。線に沿った方向は、データでは決まりません。', 10),
      beat(R`右は事後の ±2σ の範囲です。$f_1$ と $f_2$ は、それぞれ幅が広いままです。`, 8),
      beat(R`ところが、和 $f_1 + f_2$ の範囲はとても狭い。和はデータで決まり、分け方だけが決まらないのです。`, 10),
    ],
    build() {
      return {
        z1: G.standardNormals(ONE_POINTS, 1101),
        z2: G.standardNormals(ONE_POINTS, 1102),
        scatter: new Plot({ x: 150, y: 190, w: 500, h: 500, xr: [-3, 3], yr: [-3, 3] }),
        intervals: new Plot({ x: 900, y: 300, w: 600, h: 260, xr: [-1.5, 2.5], yr: [0, 3] }),
      };
    },
    draw(ctx, s, st) {
      const P = st.scatter;
      const toPosterior = s.p(1, 2.2, 0.3);
      ctx.globalAlpha = s.p(0, 0.8);
      canvasText(ctx, '1点での部品の値 (f₁, f₂)（300 回分）', P.x, P.y - 50, TITLE);
      canvasText(ctx, toPosterior < 0.5 ? '事前（独立）' : `事後（y = ${ONE.y}）`, P.x + P.w - 12, P.y + 30, { size: 22, color: C.yellow, align: 'right', weight: 700 });
      P.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'f₁', ylabel: 'f₂' });
      const lineAlpha = s.p(1, 0.8);
      if (lineAlpha > 0.001) {
        ctx.save();
        ctx.globalAlpha *= lineAlpha;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        ctx.moveTo(P.sx(-1.5), P.sy(ONE.y + 1.5));
        ctx.lineTo(P.sx(3), P.sy(ONE.y - 3));
        ctx.stroke();
        ctx.restore();
        P.label(ctx, `f₁ + f₂ = ${ONE.y}`, 2.2, ONE.y - 2.2, { dx: 8, dy: -10, size: 18, color: C.yellow, alpha: lineAlpha });
      }
      // 点 = 平均 + M z。M は事前の対角 diag(√k₁, √k₂) から、事後のコレスキー分解 L へ動かす（2σ の楕円も同じ M で描く）
      const M = [
        [(1 - toPosterior) * Math.sqrt(ONE.k1) + toPosterior * ONE_L11, 0],
        [toPosterior * ONE_L21, (1 - toPosterior) * Math.sqrt(ONE.k2) + toPosterior * ONE_L22],
      ];
      const center = [toPosterior * ONE_POST.mean1, toPosterior * ONE_POST.mean2];
      const transform = (a, b) => [center[0] + M[0][0] * a, center[1] + M[1][0] * a + M[1][1] * b];
      for (let i = 0; i < ONE_POINTS; i++) {
        const [f1, f2] = transform(st.z1[i], st.z2[i]);
        P.dots(ctx, [f1], [f2], { color: C.muted, r: 3, alpha: 0.75, ring: null });
      }
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const angle = (k / 120) * Math.PI * 2;
        const [f1, f2] = transform(2 * Math.cos(angle), 2 * Math.sin(angle));
        if (k === 0) ctx.moveTo(P.sx(f1), P.sy(f2));
        else ctx.lineTo(P.sx(f1), P.sy(f2));
      }
      ctx.stroke();
      ctx.restore();
      canvasText(ctx, '点線：2σ の範囲', P.x + 12, P.y + 30, { size: 17, color: C.muted });

      // 右: 事後の ±2σ（部品ごとと、和）
      const show = s.p(3, 0.8);
      if (show <= 0.001) return;
      const I = st.intervals;
      ctx.save();
      ctx.globalAlpha *= show;
      canvasText(ctx, `事後の平均と ±2σ の範囲（y = ${ONE.y}）`, I.x, I.y - 50, TITLE);
      I.axes(ctx, { xticks: [-1, 0, 1, 2], yticks: [], xlabel: '値', zero: false });
      ONE_INTERVALS.forEach((row, k) => {
        const yv = 2.5 - k;
        const appear = k < 2 ? 1 : s.p(4, 0.8);
        const glow = k === 2 ? s.win(4) : 0;
        ctx.save();
        ctx.globalAlpha *= appear;
        canvasText(ctx, row.label, I.x - 16, I.sy(yv) + 6, { size: 20, color: C.text2, align: 'right' });
        ctx.strokeStyle = row.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(I.sx(row.mean - 2 * row.sd), I.sy(yv));
        ctx.lineTo(I.sx(row.mean + 2 * row.sd), I.sy(yv));
        ctx.stroke();
        I.dots(ctx, [row.mean], [yv], { color: row.color, r: 8 });
        canvasText(ctx, `${fmt(row.mean, 2)} ± ${fmt(2 * row.sd, 2)}`, I.sx(row.mean + 2 * row.sd) + 16, I.sy(yv) + 6, { size: 19, color: glow > 0 ? C.yellow : C.text2, weight: 600 });
        ctx.restore();
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- Q2 理論（何に影響するのか）
  const { TREND_KERNEL, SEASON_KERNEL, DECOMP_X, DECOMP_Y, DECOMP_MODEL } = EXAMPLE_DATA.decomposition;
  const PART_KERNELS = [TREND_KERNEL, SEASON_KERNEL];
  const Q2_X = 2;
  const q2Parts = G.partsPosterior(DECOMP_MODEL, [Q2_X], PART_KERNELS);
  const Q2 = { var1: q2Parts.covariance(0, 0, 0, 0), var2: q2Parts.covariance(1, 0, 1, 0), cov: q2Parts.covariance(0, 0, 1, 0) };
  Q2.varSum = Q2.var1 + Q2.var2 + 2 * Q2.cov;
  Q2.varTotal = G.predict(DECOMP_MODEL, [Q2_X]).variance[0];

  SCENES.push({
    id: 'Q2T',
    ...question(2),
    kind: 'theory',
    title: QUESTIONS[1],
    beats: [
      beat('影響の1つ目は、不確かさの足し算です。全体の分散は、部品の分散の和に、共分散の2倍を足したものです。', 10),
      beat(R`共分散が負なので、全体は部品の分散の和より小さくなります。本編第7章のデータで $x = ${Q2_X}$ を計算すると、部品は${fmt(Q2.var1, 3) === fmt(Q2.var2, 3) ? `どちらも ${fmt(Q2.var1, 3)}` : ` ${fmt(Q2.var1, 3)} と ${fmt(Q2.var2, 3)}`}、全体は ${fmt(Q2.varSum, 4)} です。`, 12),
      beat('2つ目。部品の帯を足し合わせて全体の帯を作ると、不確かさを大きく見積もりすぎます。全体の帯は、全体のカーネルで計算します。', 11),
      beat('3つ目。部品のサンプルは「片方が上がれば片方が下がる」組で出てきます。部品を別々に引いて足すと、この組が崩れます。', 11),
      beat('4つ目。一定の高さのように、どちらの部品でも表せる成分は、データでは分けられません。部品の値は、この分からなさを含めて読みます。', 11),
      beat('データから離れると、部品はそれぞれ事前の独立に近づき、負の相関は弱まります。', 8),
    ],
    build(ui) {
      ui.tex(R`\operatorname{Var}[f_1 + f_2] = \operatorname{Var}[f_1] + \operatorname{Var}[f_2] + 2\,\htmlClass{hlCov}{\operatorname{Cov}[f_1, f_2]}`, {
        x: LEFT_X, y: 128, size: 34, hl: [{ cls: 'hlCov', from: 1, to: 2, color: C.yellow }],
      });
      [
        { text: '① 合計の不確かさは、部品の不確かさの和より小さい', at: 0, delay: 0.8 },
        { text: '② 部品の帯を足して、全体の帯にしない', at: 2 },
        { text: '③ 部品のサンプルは、組のまま引く（別々に引かない）', at: 3 },
        { text: '④ どちらの部品でも表せる成分（一定の高さなど）は分けられない', at: 4 },
        { text: '⑤ データから離れると、相関は弱まる（事前の独立に近づく）', at: 5 },
      ].forEach((item, i) => ui.text(item.text, { x: LEFT_X, y: 250 + i * 82, size: 26, at: item.at, delay: item.delay ?? 0, glow: [{ from: item.at, to: item.at + 1, color: C.yellow }] }));

      ui.card({ x: CARD_X, y: 230, w: CARD_W, h: 330, title: R`本編第7章のデータ（$x = ${Q2_X}$）`, at: 1 });
      ui.table({
        x: CARD_X + 16, y: 285, widths: [300, 150], size: 23, rowH: 44, at: 1, delay: 0.3, aligns: ['left', 'right'],
        header: ['', '値'],
        rows: [
          [R`$\operatorname{Var}[f_1]$（トレンド）`, fmt(Q2.var1, 3)],
          [R`$\operatorname{Var}[f_2]$（季節）`, fmt(Q2.var2, 3)],
          [R`$2\operatorname{Cov}[f_1, f_2]$`, fmt(2 * Q2.cov, 3)],
          [R`$\operatorname{Var}[f_1 + f_2]$`, `<b>${fmt(Q2.varSum, 4)}</b>`],
        ],
        rowDelay: 0.4,
        glowRows: { 2: [{ from: 1, to: 2, color: C.yellow }], 3: [{ from: 1, to: 2, color: C.aqua }] },
      });
      ui.text(R`全体のカーネルで直接計算しても ${fmt(Q2.varTotal, 4)}（同じ値）`, { x: CARD_X + 24, y: 510, size: 20, color: C.text2, at: 1, delay: 2 });
    },
  });

  // ---------------------------------------------------------------- Q2 図解（部品を組で引く、相関の大きさ）
  const Q2_GRID = G.linspace(0, 9, 121);
  const Q2_PAIRS = 3;
  const Q2_FAR_X = 9;
  // 字幕に出す相関係数（データのある x = 2 と、データから離れた x = 9）
  const q2Rho = (() => {
    const { covariance } = G.partsPosterior(DECOMP_MODEL, [Q2_X, Q2_FAR_X], PART_KERNELS);
    const rhoAt = (i) => covariance(0, i, 1, i) / Math.sqrt(covariance(0, i, 0, i) * covariance(1, i, 1, i));
    return { inside: rhoAt(0), far: rhoAt(1) };
  })();

  SCENES.push({
    id: 'Q2V',
    ...question(2),
    kind: 'visual',
    title: '部品を組で引いたサンプルと、相関の大きさ',
    beats: [
      beat('本編第7章と同じデータで、トレンド f₁ と季節 f₂ を、事後分布から同時に引きました。線の種類が同じものが1組です。', 11),
      beat('組ごとに見ると、トレンドが上にずれた組では、季節が下にずれています。ずれは、ほぼ一定の高さです。', 10),
      beat('2つを足すと、どの組もほぼ同じ曲線になり、データの上を通ります。', 8),
      beat(R`下は、各 $x$ での $f_1$ と $f_2$ の事後の相関係数です。データのある範囲では ${fmt(q2Rho.inside, 3)} 前後の、強い負の相関です。`, 11),
      beat(R`データから離れると相関は弱まり、$x = ${Q2_FAR_X}$ では ${fmt(q2Rho.far, 2)} です。外挿では、部品の分け方だけでなく、和そのものも不確かになります。`, 11),
    ],
    build() {
      const { means, covariance } = G.partsPosterior(DECOMP_MODEL, Q2_GRID, PART_KERNELS);
      const rho = Q2_GRID.map((_, i) => covariance(0, i, 1, i) / Math.sqrt(covariance(0, i, 0, i) * covariance(1, i, 1, i)));
      const normals = Array.from({ length: Q2_PAIRS }, (_, k) => G.standardNormals(2 * Q2_GRID.length, 1200 + k));
      return {
        means,
        rho,
        pairs: G.samplePartsPosterior(DECOMP_MODEL, Q2_GRID, PART_KERNELS, normals),
        top: new Plot({ x: 110, y: 175, w: 1390, h: 320, xr: [0, 9], yr: [-2.2, 2.2] }),
        bottom: new Plot({ x: 110, y: 590, w: 1390, h: 120, xr: [0, 9], yr: [-1.05, 0.05] }),
      };
    },
    draw(ctx, s, st) {
      const T = st.top;
      const sumAlpha = s.p(2, 1.2);
      ctx.globalAlpha = s.p(0, 0.8);
      canvasText(ctx, '部品を組で引いた事後サンプル（同じ線の種類が1組）', T.x, T.y - 46, TITLE);
      legend(ctx, [
        { label: 'f₁（トレンド）', color: C.blue },
        { label: 'f₂（季節）', color: C.orange },
        { label: 'f₁ + f₂', color: C.text },
        { label: 'データ', color: C.yellow, kind: 'dot' },
      ], T.x + 640, T.y - 48);
      T.shade(ctx, 4.5, 9, { color: C.text, alpha: 0.05 });
      T.label(ctx, 'データなし（外挿）', 6.75, 2.2, { dy: 24, align: 'center', size: 17, color: C.muted });
      T.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], yticks: [-2, -1, 0, 1, 2], xlabel: 'x' });
      st.pairs.forEach(([f1, f2], k) => {
        const dash = PAIR_DASHES[k];
        const fade = 1 - 0.75 * sumAlpha;
        T.line(ctx, Q2_GRID, f1, { color: C.blue, width: 2.5, dash, alpha: fade, upto: s.p(0, 2, 0.5 + 0.4 * k) });
        T.line(ctx, Q2_GRID, f2, { color: C.orange, width: 2.5, dash, alpha: fade, upto: s.p(0, 2, 0.7 + 0.4 * k) });
        if (sumAlpha > 0.001) T.line(ctx, Q2_GRID, Array.from(f1, (v, i) => v + f2[i]), { color: C.text, width: 3, dash, alpha: sumAlpha });
      });
      T.dots(ctx, DECOMP_X, Array.from(DECOMP_Y), { color: C.yellow, r: 4.5, ring: null, alpha: s.p(2, 0.8) });

      // 下: f₁(x) と f₂(x) の事後の相関係数
      const B = st.bottom;
      const show = s.p(3, 0.8);
      if (show <= 0.001) return;
      ctx.save();
      ctx.globalAlpha *= show;
      canvasText(ctx, '各 x での f₁ と f₂ の事後の相関係数', B.x, B.y - 30, TITLE);
      B.shade(ctx, 4.5, 9, { color: C.text, alpha: 0.05 });
      B.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], yticks: [-1, -0.5, 0], xlabel: 'x', fmtY: (v) => fmt(v, 1) });
      B.line(ctx, Q2_GRID, st.rho, { color: C.violet, width: 3.5, upto: s.p(3, 2, 0.3) });
      const far = s.win(4);
      if (far > 0.001) {
        const last = st.rho[st.rho.length - 1];
        B.dots(ctx, [Q2_FAR_X], [last], { color: C.yellow, r: 7, alpha: far });
        B.label(ctx, `x = ${Q2_FAR_X} で ${fmt(last, 2)}`, Q2_FAR_X, last, { dx: -14, dy: -12, align: 'right', size: 18, color: C.yellow, weight: 600, alpha: far });
      }
      ctx.restore();
    },
  });
  // ---------------------------------------------------------------- Q3 理論（質的変数のずれ）
  const { CATEGORIES, CATEGORY_VARIANCE, X_KERNEL, same, DEMO_POINTS, DEMO_MODEL } = EXAMPLE_DATA.categorical;
  const shapeKernel = (a, b) => X_KERNEL(a[0], b[0]);
  const offsetKernel = (a, b) => CATEGORY_VARIANCE * same(a[1], b[1]);
  // ずれ h(c) は「カテゴリ c の点」での offsetKernel の部品。共通の形 g は x = 2 の点で見る（カテゴリは関係しない）
  const Q3_INPUTS = [...CATEGORIES.map((c) => [Q2_X, c]), [Q2_X, 'A']];
  const q3 = G.partsPosterior(DEMO_MODEL, Q3_INPUTS, [shapeKernel, offsetKernel]);
  const offsetSd = (k) => Math.sqrt(q3.covariance(1, k, 1, k));
  const offsetCorr = (k, l) => q3.covariance(1, k, 1, l) / (offsetSd(k) * offsetSd(l));
  const differenceSd = (k, l) => Math.sqrt(q3.covariance(1, k, 1, k) + q3.covariance(1, l, 1, l) - 2 * q3.covariance(1, k, 1, l));
  const shapeOffsetCorr = q3.covariance(0, 3, 1, 0) / (Math.sqrt(q3.covariance(0, 3, 0, 3)) * offsetSd(0));
  const Q3 = { sdA: offsetSd(0), sdC: offsetSd(2), diffAB: differenceSd(0, 1), diffAC: differenceSd(0, 2), corrAB: offsetCorr(0, 1), shapeOffsetCorr };

  SCENES.push({
    id: 'Q3T',
    ...question(3),
    kind: 'theory',
    title: QUESTIONS[2],
    beats: [
      beat(R`起きます。本編第9章の $f(x, c) = g(x) + h(c)$ でも、共通の形 $g$ とカテゴリのずれ $h$ は、事後に相関します。`, 10),
      beat(R`$g$ を全体に上げて、すべての $h$ を同じだけ下げても、同じデータを説明できるからです。`, 9),
      beat(R`第9章のデータで計算すると、$g(${Q2_X})$ と $h(\mathrm{A})$ の相関係数は ${fmt(Q3.shapeOffsetCorr, 3)}。ずれどうし、$h(\mathrm{A})$ と $h(\mathrm{B})$ は ${fmt(Q3.corrAB, 3)} です。`, 12),
      beat(R`そのため、ずれ1つずつの標準偏差は ${fmt(Q3.sdA, 2)} と大きいのに、差 $h(\mathrm{A}) - h(\mathrm{B})$ の標準偏差は ${fmt(Q3.diffAB, 3)} と小さくなります。`, 12),
      beat('装置どうしの比較、つまりずれの差は、データでしっかり決まります。決まらないのは、全体の高さをどこに置くかだけです。', 10),
      beat('本編の第9章で、ずれの平均を引いて比べたのは、このためです。', 7),
    ],
    build(ui) {
      ui.tex(R`f(x, c) = \textcolor{${C.blue}}{g(x)} + \textcolor{${C.orange}}{h(c)},\qquad k = k_x(x, x') + \sigma_c^2\,\delta_{cc'}`, { x: LEFT_X, y: 128, size: 34 });
      ui.tex(R`g(x) + a,\ \ h(c) - a\ \ \text{でも和は同じ}\ \Longrightarrow\ \text{全体の高さ } a \text{ はデータで決まらない}`, { x: LEFT_X, y: 230, size: 28, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.text('ずれの「差」は決まる ／ 全体の高さは決まらない', { x: LEFT_X, y: 470, size: 28, weight: 700, at: 4, glow: [{ from: 4, to: 5, color: C.yellow }] });
      ui.text('→ ずれは、平均を引いて（差で）比べる', { x: LEFT_X + 20, y: 540, size: 26, color: C.text2, at: 5 });

      ui.card({ x: CARD_X - 60, y: 320, w: CARD_W + 60, h: 400, title: '本編第9章のデータ（3台の装置）', at: 2 });
      ui.table({
        x: CARD_X - 44, y: 375, widths: [340, 180], size: 23, rowH: 44, at: 2, aligns: ['left', 'right'],
        header: ['', '値'],
        rows: [
          [R`$g(${Q2_X})$ と $h(\mathrm{A})$ の相関係数`, fmt(Q3.shapeOffsetCorr, 3)],
          [R`$h(\mathrm{A})$ と $h(\mathrm{B})$ の相関係数`, fmt(Q3.corrAB, 3)],
          [R`$h(\mathrm{A})$ の標準偏差`, fmt(Q3.sdA, 3)],
          [R`$h(\mathrm{C})$ の標準偏差（3点だけ）`, fmt(Q3.sdC, 3)],
          [R`$h(\mathrm{A}) - h(\mathrm{B})$ の標準偏差`, `<b>${fmt(Q3.diffAB, 3)}</b>`],
          [R`$h(\mathrm{A}) - h(\mathrm{C})$ の標準偏差`, `<b>${fmt(Q3.diffAC, 3)}</b>`],
        ],
        rowAt: [2, 2, 3, 3, 3, 3],
        rowDelay: 0,
        glowRows: { 4: [{ from: 3, to: 5, color: C.aqua }], 5: [{ from: 3, to: 5, color: C.aqua }] },
      });
    },
  });

  // ---------------------------------------------------------------- Q4 理論（周辺尤度とは）
  SCENES.push({
    id: 'Q4T',
    ...question(4),
    kind: 'theory',
    title: QUESTIONS[3],
    beats: [
      beat(R`尤度は「パラメータ $\theta$ を決めたとき、手元のデータ $\mathbf{y}$ がどれだけ出やすいか」です。大きいほど、データをよく説明できます。`, 10),
      beat(R`ガウス過程では、関数の値 $\mathbf{f}$ そのものは分かりません。そこで、ありうる $\mathbf{f}$ すべてについて平均します。これが「周辺」の意味です。`, 11),
      beat(R`第1章の多変量正規分布の性質から、この平均は計算できます。$\mathbf{y}$ は、平均 0、共分散 $K + \sigma_n^2 I$ の正規分布になります。`, 10),
      beat('つまり周辺尤度は、カーネルが作るデータの分布の、手元のデータでの高さです。対数をとると、本編第4章の式になります。', 10),
      beat('関数を1つに決めて当てはめると、柔らかいモデルほど有利です。平均すると、何でも作れるモデルは確率が薄まり、自然に罰が入ります。', 11),
    ],
    build(ui) {
      ui.text('尤度 ＝ パラメータを決めたときの、手元のデータの出やすさ', { x: LEFT_X, y: 128, size: 28, weight: 700, glow: [{ from: 0, to: 1, color: C.yellow }] });
      ui.tex(R`p(\mathbf{y}\mid X, \theta) = \int \underbrace{p(\mathbf{y}\mid \mathbf{f})}_{\text{ノイズの出方}}\ \underbrace{p(\mathbf{f}\mid X, \theta)}_{\text{カーネルが作る関数}}\ d\mathbf{f}`, { x: LEFT_X, y: 200, size: 32, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.tex(R`p(\mathbf{y}\mid X, \theta) = \mathcal{N}\big(\mathbf{y}\ \big|\ \mathbf{0},\ K_{\theta} + \sigma_n^2 I\big)`, { x: LEFT_X, y: 360, size: 34, at: 2, glow: [{ from: 2, to: 3, color: C.yellow }] });
      ui.text('＝ カーネルが作るデータの分布の、手元のデータでの高さ', { x: LEFT_X + 20, y: 435, size: 25, color: C.text2, at: 3 });
      ui.tex(R`\log p(\mathbf{y}\mid X, \theta) = \underbrace{-\tfrac12\, \mathbf{y}^{\top}K_y^{-1}\mathbf{y}}_{\text{当てはまり}}\ \underbrace{-\ \tfrac12 \log|K_y|}_{\text{複雑さの罰則}}\ -\ \tfrac{n}{2}\log 2\pi`, { x: LEFT_X, y: 500, size: 30, at: 3, delay: 0.6 });
      ui.text('関数を1つに決めずに平均する → 何でも作れるモデルは確率が薄まり、自然に罰が入る', { x: LEFT_X, y: 650, size: 25, weight: 700, at: 4, glow: [{ from: 4, color: C.yellow }] });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 240, title: '言葉の意味', at: 0, delay: 0.6 });
      ui.table({
        x: CARD_X + 16, y: 180, widths: [100, 360], size: 22, rowH: 44, at: 0, aligns: ['left', 'left'],
        header: ['言葉', '意味'],
        rows: [
          ['尤度', 'データの出やすさ'],
          ['周辺', R`関数 $\mathbf{f}$ について平均する`],
          ['最大化', R`データが最も出やすい $\theta$ を選ぶ`],
        ],
        rowAt: [0, 1, 3],
        glowRows: { 1: [{ from: 1, to: 2, color: C.yellow }] },
      });
    },
  });

  // ---------------------------------------------------------------- Q4 図解（2点のデータで周辺尤度を見る）
  // データは2点だけ。2つの値の組 (y₁, y₂) を平面の1点とみなすと、周辺尤度は N(0, K + σ_n² I) のその点での高さになる
  const ML_X = [0, 1];
  const ML_Y = [1.0, 0.4];
  const ML_NOISE = 0.01;
  const ML_SMALL = 0.2;
  const ML_LARGE = 5;
  const ML_POINTS = 200;
  const ML_COLORS = [C.blue, C.orange, C.aqua, C.violet, C.red]; // 右上の関数と、左の平面の色つきの点（同じ乱数）
  const mlKernel = (ell) => G.rbf({ variance: 1, lengthScale: ell });
  const mlDensity = (ell) => Math.exp(G.logMarginalLikelihood(ML_X, Float64Array.from(ML_Y), mlKernel(ell), ML_NOISE).total);
  const ML_ELLS = G.linspace(Math.log(0.1), Math.log(10), 241).map(Math.exp);
  const ML_CURVE = ML_ELLS.map(mlDensity);
  const ML_BEST = ML_ELLS[ML_CURVE.indexOf(Math.max(...ML_CURVE))];
  // 関数を引く x。先頭を x = 0, 1 にすると、コレスキー分解の性質で、その2点の値が左の平面の点と同じ乱数で決まる
  const ML_SAMPLE_X = [...ML_X, ...G.linspace(-0.5, 1.5, 81).filter((x) => Math.abs(x) > 1e-9 && Math.abs(x - 1) > 1e-9)];
  const ML_ORDER = ML_SAMPLE_X.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const ML_ORDER_X = ML_ORDER.map(([x]) => x);

  SCENES.push({
    id: 'Q4V',
    ...question(4),
    kind: 'visual',
    title: '周辺尤度を図で見る（データ2点の例）',
    beats: [
      beat(R`データは2点だけで、$x = 0$ で $${fmt(ML_Y[0], 1)}$、$x = 1$ で $${fmt(ML_Y[1], 1)}$ です。右上は、カーネルから引いた関数の例です。`, 9),
      beat(R`各関数の $x = 0$ と $x = 1$ での値の組を、左の平面に1点として打ちます。${ML_POINTS} 本分打つと、点の雲になります。`, 10),
      beat(R`$\ell = ${ML_SMALL}$ では2つの値がほぼ無関係で、雲は丸く広がります。何でも作れる分、データ（黄色）のまわりの点は少なめです。`, 11),
      beat(R`$\ell = ${ML_LARGE}$ では関数がほぼ平らで、雲は斜めの細い帯になります。データが帯から外れ、周辺尤度はとても低くなります。`, 11),
      beat(R`その間の $\ell \approx ${fmt(ML_BEST, 1)}$ で、雲がデータをちょうど包み、周辺尤度が最大になります。この $\ell$ を選びます。`, 10),
      beat('柔らかすぎるモデルは確率が薄く広がり、硬すぎるモデルはデータを作れません。本編第4章の、2つの項の釣り合いです。', 10),
    ],
    build() {
      const z = G.standardNormals(4 * ML_POINTS, 1401);
      const pointNormals = Array.from({ length: ML_POINTS }, (_, i) => [z[4 * i], z[4 * i + 1]]);
      const curveNormals = ML_COLORS.map((_, k) => {
        const normals = G.standardNormals(ML_SAMPLE_X.length, 1410 + k);
        normals[0] = pointNormals[k][0];
        normals[1] = pointNormals[k][1];
        return normals;
      });
      return {
        pointNormals,
        curveNormals,
        noise: Array.from({ length: ML_POINTS }, (_, i) => [z[4 * i + 2], z[4 * i + 3]].map((v) => v * Math.sqrt(ML_NOISE))),
        plane: new Plot({ x: 140, y: 200, w: 460, h: 460, xr: [-3, 3], yr: [-3, 3] }),
        funcs: new Plot({ x: 800, y: 190, w: 700, h: 200, xr: [-0.5, 1.5], yr: [-3, 3] }),
        curve: new Plot({ x: 800, y: 500, w: 700, h: 180, xr: [0.1, 10], yr: [0, 0.15], logx: true }),
      };
    },
    draw(ctx, s, st) {
      const ell = keyframes(s.u, [[s.bt(3), ML_SMALL], [s.bt(3) + 4, ML_LARGE], [s.bt(4), ML_LARGE], [s.bt(4) + 3, ML_BEST]], { log: true });
      const kernel = mlKernel(ell);

      // 右上: カーネルから引いた関数（x = 0, 1 の値に点を打つ）
      const F = st.funcs;
      ctx.globalAlpha = s.p(0, 0.8);
      canvasText(ctx, `カーネルから引いた関数の例（ℓ = ${fmt(ell, 2)}）`, F.x, F.y - 30, TITLE);
      F.axes(ctx, { xticks: [-0.5, 0, 0.5, 1, 1.5], yticks: [-2, 0, 2], xlabel: 'x', fmtX: (v) => fmt(v, 1) });
      ML_X.forEach((x) => F.vline(ctx, x, { color: C.muted, alpha: 0.6 }));
      const curves = G.sampleFunctions(ML_SAMPLE_X, kernel, st.curveNormals);
      const valueDots = s.p(1, 0.6);
      curves.forEach((f, k) => {
        F.line(ctx, ML_ORDER_X, ML_ORDER.map(([, i]) => f[i]), { color: ML_COLORS[k], width: 2.5, upto: s.p(0, 1.5, 0.3 + 0.2 * k) });
        F.dots(ctx, ML_X, [f[0], f[1]], { color: ML_COLORS[k], r: 5, alpha: valueDots });
      });
      F.dots(ctx, ML_X, ML_Y, { color: C.yellow, r: 8 });

      // 左: (y₁, y₂) の平面。点の雲 = カーネルが作るデータ、点線 = 2σ の範囲
      const P = st.plane;
      const planeAlpha = s.p(1, 0.8);
      if (planeAlpha > 0.001) {
        ctx.save();
        ctx.globalAlpha *= planeAlpha;
        canvasText(ctx, `x = 0 と x = 1 の値の組（${ML_POINTS} 本分）`, P.x, P.y - 50, TITLE);
        canvasText(ctx, `ℓ = ${fmt(ell, 2)}`, P.x + P.w - 12, P.y + 30, { size: 22, color: C.yellow, align: 'right', weight: 700 });
        P.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'y₁（x = 0 の値）', ylabel: 'y₂（x = 1 の値）' });
        const values = G.sampleFunctions(ML_X, kernel, st.pointNormals);
        const count = Math.round(ML_POINTS * s.p(1, 2.5, 0.6));
        ctx.save();
        P.clip(ctx); // 端の点がグラフの外（目盛り）に出ないように
        for (let i = ML_COLORS.length; i < count; i++) {
          P.dots(ctx, [values[i][0] + st.noise[i][0]], [values[i][1] + st.noise[i][1]], { color: C.muted, r: 3, alpha: 0.75, ring: null });
        }
        ML_COLORS.forEach((color, k) => P.dots(ctx, [values[k][0] + st.noise[k][0]], [values[k][1] + st.noise[k][1]], { color, r: 6 }));
        ctx.restore();
        // 2σ の範囲: 共分散 K + σ_n² I（2×2）のコレスキー分解で円を写す
        const diagonal = kernel(0, 0) + ML_NOISE;
        const L11 = Math.sqrt(diagonal);
        const L21 = kernel(0, 1) / L11;
        const L22 = Math.sqrt(Math.max(diagonal - L21 ** 2, 0));
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= 120; k++) {
          const angle = (k / 120) * Math.PI * 2;
          const a = 2 * Math.cos(angle);
          const b = 2 * Math.sin(angle);
          const [u, v] = [L11 * a, L21 * a + L22 * b];
          if (k === 0) ctx.moveTo(P.sx(u), P.sy(v));
          else ctx.lineTo(P.sx(u), P.sy(v));
        }
        ctx.stroke();
        ctx.restore();
        canvasText(ctx, '点線：2σ の範囲', P.x + 12, P.y + 30, { size: 17, color: C.muted });
        P.dots(ctx, [ML_Y[0]], [ML_Y[1]], { color: C.yellow, r: 9 });
        P.label(ctx, 'データ', ML_Y[0], ML_Y[1], { dx: 14, dy: 6, size: 19, color: C.yellow, weight: 700 });
        ctx.restore();
      }

      // 右下: 周辺尤度（データの点での高さ）と ℓ
      const Q = st.curve;
      const curveAlpha = s.p(2, 0.8);
      if (curveAlpha <= 0.001) return;
      ctx.save();
      ctx.globalAlpha *= curveAlpha;
      canvasText(ctx, '周辺尤度 p(y | ℓ)：データの点での分布の高さ', Q.x, Q.y - 30, TITLE);
      Q.axes(ctx, { xticks: [0.1, 0.3, 1, 3, 10], yticks: [0, 0.05, 0.1, 0.15], xlabel: 'ℓ（対数目盛）', fmtX: (v) => String(v), fmtY: (v) => fmt(v, 2) });
      Q.line(ctx, ML_ELLS, ML_CURVE, { color: C.text, width: 3, upto: s.p(2, 2, 0.3) });
      const value = mlDensity(ell);
      Q.vline(ctx, ell, { color: C.yellow, dash: null, width: 2 });
      Q.dots(ctx, [ell], [value], { color: C.yellow, r: 8 });
      Q.label(ctx, fmt(value, 3), ell, value, { dx: 12, dy: -12, size: 19, color: C.yellow, weight: 600 });
      const bestAlpha = s.p(4, 0.6, 3);
      if (bestAlpha > 0.001) Q.label(ctx, '最大', ML_BEST, mlDensity(ML_BEST), { dx: -14, dy: -12, align: 'right', size: 19, color: C.text, weight: 700, alpha: bestAlpha });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- Q5 理論（ガンマ関数とは）
  const gamma = (z) => Math.exp(G.logGamma(z));

  SCENES.push({
    id: 'Q5T',
    ...question(5),
    kind: 'theory',
    title: QUESTIONS[4],
    beats: [
      beat(R`ガンマ関数は、階乗 $n! = 1 \times 2 \times \cdots \times n$ を、整数でない数にも、なめらかにつないだ関数です。`, 10),
      beat(R`正の整数では $\Gamma(n) = (n-1)!$ で、例えば $\Gamma(4) = 3! = 6$ です。また、$\Gamma(z+1) = z\,\Gamma(z)$ が成り立ちます。`, 11),
      beat(R`半整数でも値が決まり、$\Gamma(1/2) = \sqrt{\pi} \approx ${fmt(gamma(0.5), 3)}$ です。Matérn の $\nu = 1/2,\ 3/2,\ 5/2$ では、表の値になります。`, 11),
      beat(R`Matérn カーネルの係数 $2^{1-\nu}/\Gamma(\nu)$ は、距離 $r = 0$ で $k = \sigma_f^2$ になるように、高さをそろえるためのものです。`, 11),
      beat(R`$\nu = 1/2,\ 3/2,\ 5/2$ では式が簡単になり、ガンマ関数もベッセル関数も出てきません。手で計算する必要はありません。`, 10),
    ],
    build(ui) {
      ui.tex(R`\Gamma(z) = \int_0^{\infty} t^{\,z-1}\, e^{-t}\, dt`, { x: LEFT_X, y: 128, size: 36 });
      ui.text(R`階乗 $n!$ を、整数でない数にもなめらかにつないだ関数`, { x: LEFT_X + 20, y: 225, size: 25, color: C.text2 });
      ui.tex(R`\Gamma(n) = (n-1)!,\qquad \Gamma(z+1) = z\,\Gamma(z)`, { x: LEFT_X, y: 295, size: 32, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.tex(R`k_{\nu}(r) = \sigma_f^2\, \htmlClass{hlCoef}{\frac{2^{1-\nu}}{\Gamma(\nu)}} \left(\frac{\sqrt{2\nu}\, r}{\ell}\right)^{\!\nu} K_{\nu}\!\left(\frac{\sqrt{2\nu}\, r}{\ell}\right)`, {
        x: LEFT_X, y: 395, size: 30, at: 3, hl: [{ cls: 'hlCoef', from: 3, to: 4, color: C.orange }],
      });
      ui.tex(R`z^{\nu} K_{\nu}(z) \to 2^{\nu-1}\,\Gamma(\nu)\ \ (z \to 0)\quad\Longrightarrow\quad k_{\nu}(0) = \sigma_f^2`, { x: LEFT_X, y: 535, size: 28, at: 3, delay: 0.8 });
      ui.text(R`$\nu = 1/2,\ 3/2,\ 5/2$：簡単な式になり、ガンマ関数は出てこない`, { x: LEFT_X, y: 645, size: 25, weight: 700, at: 4, glow: [{ from: 4, color: C.yellow }] });

      ui.card({ x: CARD_X + 80, y: 128, w: CARD_W - 80, h: 400, title: 'ガンマ関数の値', at: 1 });
      ui.table({
        x: CARD_X + 96, y: 180, widths: [120, 260], size: 22, rowH: 40, at: 1, aligns: ['left', 'right'],
        header: ['$z$', R`$\Gamma(z)$`],
        rows: [
          ...[1, 2, 3, 4].map((n) => [String(n), `${fmt(gamma(n), 0)}（= ${n - 1}!）`]),
          ['1/2', R`$\sqrt{\pi} \approx ${fmt(gamma(0.5), 3)}$`],
          ['3/2', fmt(gamma(1.5), 3)],
          ['5/2', fmt(gamma(2.5), 3)],
        ],
        rowAt: [1, 1, 1, 1, 2, 2, 2],
        glowRows: { 4: [{ from: 2, to: 3, color: C.yellow }], 5: [{ from: 2, to: 3, color: C.yellow }], 6: [{ from: 2, to: 3, color: C.yellow }] },
      });
    },
  });

  // ---------------------------------------------------------------- Q5 図解（ガンマ関数のグラフと、Matérn の高さ合わせ）
  const GAMMA_GRID = G.linspace(0.12, 4.6, 300);
  const GAMMA_INTEGERS = [
    { z: 1, label: '0! = 1', dx: 0, dy: -16, align: 'center' },
    { z: 2, label: '1! = 1', dx: 0, dy: 30, align: 'center' },
    { z: 3, label: '2! = 2', dx: 14, dy: 22, align: 'left' },
    { z: 4, label: '3! = 6', dx: -16, dy: 6, align: 'right' },
  ];
  const GAMMA_HALVES = [
    { z: 0.5, dx: 12, dy: -12, align: 'left' },
    { z: 1.5, dx: 0, dy: 30, align: 'center' },
    { z: 2.5, dx: -14, dy: -12, align: 'right' },
    { z: 3.5, dx: -14, dy: -8, align: 'right' },
  ];
  // Matérn の係数を除いた部分 z^ν K_ν(z) の r = 0 での高さは 2^{ν−1} Γ(ν)。係数を掛けると 1 になる
  const HEIGHT_CASES = [
    { nu: 0.5, label: 'ν = 1/2', color: C.blue },
    { nu: 1.5, label: 'ν = 3/2', color: C.orange },
    { nu: 2.5, label: 'ν = 5/2', color: C.aqua },
  ].map((c) => ({ ...c, height: 2 ** (c.nu - 1) * gamma(c.nu) }));

  SCENES.push({
    id: 'Q5V',
    ...question(5),
    kind: 'visual',
    title: 'ガンマ関数のグラフと、Matérn の高さ合わせ',
    beats: [
      beat(R`左はガンマ関数のグラフです。白い点は整数での値で、階乗と一致します。例えば $\Gamma(4) = 3! = 6$ です。`, 10),
      beat(R`点の間もなめらかにつながり、黄色の半整数でも値が決まります。Matérn で使う $\nu$ での値です。`, 9),
      beat(R`右は、Matérn の式から係数 $2^{1-\nu}/\Gamma(\nu)$ を除いた部分です。$r = 0$ での高さが、$\nu$ ごとに違います。`, 10),
      beat(R`係数を掛けると、どれも $r = 0$ で 1 にそろいます。ガンマ関数は、この高さ合わせのために入っています。`, 10),
    ],
    build() {
      const rhoGrid = G.linspace(0, 3, 200);
      return {
        rhoGrid,
        gammaValues: GAMMA_GRID.map(gamma),
        correlations: HEIGHT_CASES.map((c) => rhoGrid.map(G.maternCorrelation(c.nu))),
        gammaPlot: new Plot({ x: 110, y: 190, w: 620, h: 480, xr: [0, 4.6], yr: [0, 7] }),
        heightPlot: new Plot({ x: 880, y: 190, w: 620, h: 480, xr: [0, 3], yr: [0, 4] }),
      };
    },
    draw(ctx, s, st) {
      // 左: ガンマ関数。白 = 整数（階乗）、黄 = 半整数
      const P = st.gammaPlot;
      ctx.globalAlpha = s.p(0, 0.8);
      canvasText(ctx, 'ガンマ関数 Γ(z)', P.x, P.y - 50, TITLE);
      P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [0, 1, 2, 3, 4, 5, 6, 7], xlabel: 'z' });
      P.line(ctx, GAMMA_GRID, st.gammaValues, { color: C.text2, width: 3, upto: s.p(1, 2) });
      GAMMA_INTEGERS.forEach((p, i) => {
        const appear = s.p(0, 0.6, 0.6 + 0.4 * i);
        P.dots(ctx, [p.z], [gamma(p.z)], { color: C.text, r: 8, alpha: appear });
        P.label(ctx, p.label, p.z, gamma(p.z), { dx: p.dx, dy: p.dy, align: p.align, size: 18, color: C.text, weight: 600, alpha: appear });
      });
      GAMMA_HALVES.forEach((p, i) => {
        const appear = s.p(1, 0.6, 1.5 + 0.3 * i);
        P.dots(ctx, [p.z], [gamma(p.z)], { color: C.yellow, r: 8, alpha: appear });
        P.label(ctx, fmt(gamma(p.z), 3), p.z, gamma(p.z), { dx: p.dx, dy: p.dy, align: p.align, size: 18, color: C.yellow, weight: 600, alpha: appear });
      });
      legend(ctx, [{ label: '整数（階乗）', color: C.text, kind: 'dot' }], P.x + 200, P.y - 50, { size: 17 });
      legend(ctx, [{ label: '半整数（1/2, 3/2, 5/2, 7/2）', color: C.yellow, kind: 'dot' }], P.x + 370, P.y - 50, { size: 17, alpha: s.p(1, 0.6, 1.5) });

      // 右: 係数を除いた部分 → 係数を掛けたあと
      const show = s.p(2, 0.8);
      if (show <= 0.001) return;
      const H = st.heightPlot;
      const scaled = s.p(3, 2, 0.3);
      ctx.save();
      ctx.globalAlpha *= show;
      canvasText(ctx, scaled < 0.5 ? 'Matérn の式から、係数を除いた部分' : '係数を掛けたあと（どれも r = 0 で 1）', H.x, H.y - 50, TITLE);
      H.axes(ctx, { xticks: [0, 1, 2, 3], yticks: [0, 1, 2, 3, 4], xlabel: 'r / ℓ' });
      if (scaled > 0.001) H.hline(ctx, 1, { color: C.yellow, alpha: scaled });
      canvasText(ctx, 'r = 0 での高さ', H.x + H.w - 12, H.y + 30, { size: 19, color: C.text2, align: 'right', weight: 700 });
      HEIGHT_CASES.forEach((c, i) => {
        const height = c.height + (1 - c.height) * scaled;
        H.line(ctx, st.rhoGrid, st.correlations[i].map((v) => v * height), { color: c.color, width: 3.5, upto: s.p(2, 1.6, 0.3 + 0.3 * i) });
        canvasText(ctx, `${c.label}：${fmt(height, 3)}`, H.x + H.w - 12, H.y + 62 + 30 * i, { size: 19, color: c.color, align: 'right', weight: 600 });
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- Q6 理論（RBF と Matérn）
  SCENES.push({
    id: 'Q6T',
    ...question(6),
    kind: 'theory',
    title: QUESTIONS[5],
    beats: [
      beat(R`迷ったら、Matérn の $\nu = 3/2$ か $5/2$ から始めるのがふつうです。RBF は「何回でも微分できる」という、とても強い仮定です。`, 11),
      beat(R`データが本当になめらかなら、どちらでも予測はほぼ同じです。$\nu \ge 7/2$ では、RBF とほとんど区別できません。`, 10),
      beat(R`ガタガタした動きのあるデータに RBF を使うと、それを表すために長さスケール $\ell$ が小さく推定され、データの間で予測が平均に戻りやすくなります。`, 12),
      beat('決めきれないときは、候補ごとに周辺尤度を比べるか、一部のデータを隠して、予測の当たり具合を比べます。', 10),
    ],
    build(ui) {
      ui.text(R`迷ったら Matérn（$\nu = 3/2$ か $5/2$）から`, { x: LEFT_X, y: 135, size: 30, weight: 700, glow: [{ from: 0, to: 1, color: C.yellow }] });
      ui.text(R`なめらかなデータ → どれでもほぼ同じ（$\nu \ge 7/2$ は RBF とほぼ同じ）`, { x: LEFT_X, y: 230, size: 26, at: 1 });
      ui.text(R`ガタガタしたデータに RBF → $\ell$ が小さく推定され、予測が平均に戻りやすい`, { x: LEFT_X, y: 310, size: 26, at: 2 });
      ui.text('比べ方：周辺尤度 ／ 一部のデータを隠して予測の当たり具合（交差検証）', { x: LEFT_X, y: 390, size: 26, at: 3 });
      ui.card({ x: LEFT_X, y: 470, w: 1420, h: 240, title: 'カーネルが仮定するなめらかさ', at: 0, delay: 0.6 });
      ui.table({
        x: LEFT_X + 24, y: 520, widths: [300, 330, 700], size: 24, rowH: 42, at: 0, delay: 0.9, aligns: ['left', 'left', 'left'],
        header: ['カーネル', '微分できる回数', '合うデータの例'],
        rows: [
          [R`Matérn $\nu = 1/2$`, '0 回', '細かくガタガタ揺れる測定値'],
          [R`Matérn $\nu = 3/2,\ 5/2$`, '1 回、2 回', 'ふつうの物理量（迷ったらここ）'],
          [R`RBF（$\nu = \infty$）`, '何回でも', 'とてもなめらかな変化'],
        ],
        rowDelay: 0.3,
        glowRows: { 1: [{ from: 0, to: 1, color: C.yellow }] },
      });
    },
  });

  // ---------------------------------------------------------------- Q7 理論（ノイズ σ_n²）
  // 説明用のデータ（なめらかな関数 ＋ 標準偏差 0.2 のばらつき）。x が 0.1 しか離れていない組を入れて、σ_n² ≈ 0 のうねりを見せる
  const NOISE_X = [0.3, 0.9, 1.0, 1.8, 2.4, 2.5, 3.3, 3.9, 4.0, 4.5];
  const NOISE_DRAW = G.standardNormals(NOISE_X.length, 1301);
  const NOISE_Y = Float64Array.from(NOISE_X, (x, i) => Math.sin(1.2 * x) + 0.2 * NOISE_DRAW[i]);
  const NOISE_KERNEL = G.rbf({ variance: 1, lengthScale: 0.6 });
  const NOISE_CASES = [
    { label: 'σ_n² ≈ 0（データをすべて通る）', noise: 1e-6, color: C.orange },
    { label: 'σ_n² = 0.04（ばらつきを許す）', noise: 0.04, color: C.aqua },
  ];

  SCENES.push({
    id: 'Q7T',
    ...question(7),
    kind: 'theory',
    title: QUESTIONS[6],
    beats: [
      beat(R`$\sigma_n^2$ は観測のばらつきです。0 にすると、予測平均はすべてのデータ点をちょうど通ります。`, 9),
      beat('ばらつきのあるデータでそうすると、ばらつきまで関数とみなし、データの間で大きくうねる予測になります。', 10),
      beat(R`同じ $x$ のデータが2つあると、$K$ の2つの行が同じになり、逆行列を計算できません。$\sigma_n^2$ を足すと計算できます。`, 11),
      beat(R`$\sigma_n^2$ も、ほかのハイパーパラメータと一緒に、周辺尤度で決めるのが標準です。`, 8),
    ],
    build(ui) {
      ui.tex(R`\boldsymbol{\alpha} = (K + \htmlClass{hlN}{\sigma_n^2} I)^{-1}\mathbf{y}`, { x: LEFT_X, y: 135, size: 38, hl: [{ cls: 'hlN', from: 0, color: C.yellow }] });
      ui.text(R`$\sigma_n^2$：観測のばらつき（ノイズの分散）`, { x: LEFT_X + 20, y: 220, size: 25, color: C.text2 });
      ui.text(R`$\sigma_n^2 = 0$ → データをすべて通る → ばらつきまで追いかけてうねる`, { x: LEFT_X, y: 300, size: 25, at: 1 });
      ui.text(R`同じ $x$ が2つ → $K$ に同じ行 → 逆行列がない`, { x: LEFT_X, y: 380, size: 25, at: 2 });
      ui.text(R`$\sigma_n^2 > 0$ を対角に足すと、計算できる`, { x: LEFT_X + 20, y: 425, size: 23, color: C.text2, at: 2, delay: 0.5 });
      ui.text(R`$\sigma_n^2$ も周辺尤度で決める`, { x: LEFT_X, y: 505, size: 25, weight: 700, at: 3, glow: [{ from: 3, color: C.yellow }] });
      const grid = G.linspace(0, 4.8, 241);
      return {
        grid,
        fits: NOISE_CASES.map((c) => G.predict(G.fit(NOISE_X, NOISE_Y, NOISE_KERNEL, c.noise), grid, NOISE_KERNEL, { withVariance: false }).mean),
        plots: NOISE_CASES.map((_, i) => new Plot({ x: 960, y: 175 + i * 290, w: 540, h: 200, xr: [0, 4.8], yr: [-3, 3] })),
      };
    },
    draw(ctx, s, st) {
      NOISE_CASES.forEach((c, i) => {
        const show = i === 0 ? s.p(0, 0.8) : s.p(1, 0.8);
        if (show <= 0.001) return;
        const P = st.plots[i];
        ctx.save();
        ctx.globalAlpha = show;
        canvasText(ctx, c.label, P.x, P.y - 18, TITLE);
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [-2, 0, 2], xlabel: i === 1 ? 'x' : undefined });
        P.line(ctx, st.grid, st.grid.map((x) => Math.sin(1.2 * x)), { color: C.muted, width: 2, dash: [6, 6] });
        P.line(ctx, st.grid, st.fits[i], { color: c.color, width: 3, upto: s.p(i === 0 ? 0 : 1, 1.8, 0.4) });
        P.dots(ctx, NOISE_X, Array.from(NOISE_Y), { color: C.yellow, r: 6 });
        ctx.restore();
      });
      legend(ctx, [{ label: 'データを作った関数', color: C.muted, dash: [6, 6] }, { label: 'データ', color: C.yellow, kind: 'dot' }], 960, 735, { size: 16, gap: 22 });
    },
  });

  // ---------------------------------------------------------------- Q8 理論（計算量）
  const COST_ROWS = [100, 1000, 10000].map((n) => ({ n, relative: (n / 100) ** 3, memoryMb: (n * n * 8) / 1e6 }));

  SCENES.push({
    id: 'Q8T',
    ...question(8),
    kind: 'theory',
    title: QUESTIONS[7],
    beats: [
      beat(R`学習にも予測にも、$n \times n$ の行列 $K + \sigma_n^2 I$ のコレスキー分解が必要です。計算量は $n^3$、記憶する量は $n^2$ に比例します。`, 11),
      beat(R`$n$ が 10 倍になると、計算時間は約 1000 倍です。数千点を超えると、そのままでは重くなります。`, 9),
      beat('そのときは、代表点を使う近似（誘導点法）や、格子などの構造を使う方法、データの間引きを検討します。', 10),
    ],
    build(ui) {
      ui.tex(R`K + \sigma_n^2 I = L L^{\top}\qquad \text{計算量 } O(n^3),\ \ \text{記憶 } O(n^2)`, { x: LEFT_X, y: 135, size: 36 });
      ui.card({ x: LEFT_X, y: 250, w: 900, h: 260, title: R`データ数 $n$ と、計算の重さ`, at: 1 });
      ui.table({
        x: LEFT_X + 24, y: 305, widths: [200, 330, 330], size: 24, rowH: 44, at: 1, delay: 0.3,
        header: ['$n$', '計算時間（n = 100 を 1）', R`行列の記憶（8 バイト × $n^2$）`],
        rows: COST_ROWS.map((r) => [r.n.toLocaleString('en-US'), `${r.relative.toLocaleString('en-US')} 倍`, r.memoryMb < 1 ? `${fmt(r.memoryMb * 1000, 0)} KB` : `${fmt(r.memoryMb, 0)} MB`]),
        rowDelay: 0.4,
        glowRows: { 2: [{ from: 1, to: 2, color: C.yellow }] },
      });
      ui.text('対策：代表点で近似する（誘導点法）／ 格子などの構造を使う ／ データを間引く', { x: LEFT_X, y: 580, size: 26, weight: 700, at: 2, glow: [{ from: 2, color: C.yellow }] });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: 'QS',
    chapter: 9,
    chapterLabel: '',
    part: PART,
    kind: 'summary',
    title: '想定質問のまとめ',
    beats: [
      beat('まとめです。加法カーネルの部品は、データが「和」しか教えないため、事後に負の相関を持ちます。', 9),
      beat('部品の帯やサンプルを扱うときは、この相関を含めて計算し、分けられない成分があることを前提に読みます。', 10),
      beat('周辺尤度は、手元のデータの出やすさ。ガンマ関数は、階乗をなめらかにつないだ関数です。ほかの答えも、ここにまとめました。', 10),
    ],
    build(ui) {
      const points = [
        [0, '加法カーネルの部品は、データで「和」しか分からないため、事後に負の相関を持つ'],
        [0, '部品の分散を足しても、全体の分散にはならない（負の共分散で打ち消し合う）。全体の帯は全体で計算'],
        [1, '部品のサンプルは組で引く。一定の高さなど、どちらの部品でも表せる成分は分けられない'],
        [1, '質的変数：ずれの差は決まるが、全体の高さは決まらない → 平均を引いて比べる'],
        [2, '周辺尤度：カーネルが作るデータの中での、手元のデータの出やすさ。最大にしてハイパーパラメータを決める'],
        [2, R`ガンマ関数：階乗をなめらかにつないだ関数。Matérn では $r = 0$ の高さをそろえる係数に使う`],
        [2, R`RBF と Matérn：迷ったら $\nu = 3/2$・$5/2$。$\nu \ge 7/2$ は RBF とほぼ同じ`],
        [2, R`$\sigma_n^2$ は観測のばらつき。0 にするとうねる・計算できないことがある。周辺尤度で決める`],
        [2, R`計算量は $n^3$。数千点を超えたら近似を検討する`],
      ];
      const orderInBeat = points.map(([at], i) => points.slice(0, i).filter(([before]) => before === at).length);
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 125 + i * 58, size: 25, at, delay: orderInBeat[i] * 0.5 }));
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'Qend',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、想定質問の解説は終わりです。', 7)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 220, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 380, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('本編：ガウス過程回帰 ― カーネルの計算を、式と図で交互に理解する', { x: 0, y: 480, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
