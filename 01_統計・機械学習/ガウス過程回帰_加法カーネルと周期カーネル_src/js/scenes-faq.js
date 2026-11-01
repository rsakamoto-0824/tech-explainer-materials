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
    'RBF と Matérn は、どちらを使えばよいか',
    'ノイズ σ_n² は、何のためにあるのか',
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
        x: 400, y: 320 + i * 56, size: 28, delay: 0.6 + 0.15 * i,
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

  // ---------------------------------------------------------------- Q4 理論（RBF と Matérn）
  SCENES.push({
    id: 'Q4T',
    ...question(4),
    kind: 'theory',
    title: QUESTIONS[3],
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

  // ---------------------------------------------------------------- Q5 理論（ノイズ σ_n²）
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
    id: 'Q5T',
    ...question(5),
    kind: 'theory',
    title: 'ノイズ $\\sigma_n^2$ は、何のためにあるのか',
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

  // ---------------------------------------------------------------- Q6 理論（計算量）
  const COST_ROWS = [100, 1000, 10000].map((n) => ({ n, relative: (n / 100) ** 3, memoryMb: (n * n * 8) / 1e6 }));

  SCENES.push({
    id: 'Q6T',
    ...question(6),
    kind: 'theory',
    title: QUESTIONS[5],
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
    chapter: 7,
    chapterLabel: '',
    part: PART,
    kind: 'summary',
    title: '想定質問のまとめ',
    beats: [
      beat('まとめです。加法カーネルの部品は、データが「和」しか教えないため、事後に負の相関を持ちます。', 9),
      beat('部品の帯やサンプルを扱うときは、この相関を含めて計算し、分けられない成分があることを前提に読みます。', 10),
    ],
    build(ui) {
      const points = [
        [0, '加法カーネルの部品は、データで「和」しか分からないため、事後に負の相関を持つ'],
        [0, '部品の分散を足しても、全体の分散にはならない（負の共分散で打ち消し合う）。全体の帯は全体で計算'],
        [1, '部品のサンプルは組で引く。一定の高さなど、どちらの部品でも表せる成分は分けられない'],
        [1, '質的変数：ずれの差は決まるが、全体の高さは決まらない → 平均を引いて比べる'],
        [1, R`RBF と Matérn：迷ったら $\nu = 3/2$・$5/2$。$\nu \ge 7/2$ は RBF とほぼ同じ`],
        [1, R`$\sigma_n^2$ は観測のばらつき。0 にするとうねる・計算できないことがある。周辺尤度で決める`],
        [1, R`計算量は $n^3$。数千点を超えたら近似を検討する`],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 130 + i * 62, size: 25, at, delay: (i % 4) * 0.5 }));
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'Qend',
    chapter: 8,
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
