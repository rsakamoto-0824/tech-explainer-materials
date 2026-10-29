// scenes-categorical.js — 第9章「加法カーネル③ 質的変数」の場面。
// 質的変数（装置、ロットなど）のカーネルと、加法カーネルで「カテゴリごとのずれ」を推定する計算。
// 書き方は scenes-basic.js と同じ。表や字幕の数値は、ここで計算した値を使う。
(() => {
  const { C, SERIES, Plot, fmt, texNum, canvasText, legend, seqColor, drawMatrixHeat, colorBar, rgba } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const TITLE = { size: 21, color: C.text, weight: 700 };

  // 入力は [x, カテゴリ]。x のカーネルと、カテゴリのカーネル（一致カーネル δ）を組み合わせる
  const CATEGORIES = ['A', 'B', 'C'];
  const CATEGORY_VARIANCE = 0.25; // σ_c²
  const X_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const INDIVIDUAL_KERNEL = G.rbf({ variance: 0.3, lengthScale: 0.6 });
  const same = (a, b) => (a === b ? 1 : 0);
  const xOnlyKernel = (a, b) => X_KERNEL(a[0], b[0]);
  const additiveKernel = (a, b) => X_KERNEL(a[0], b[0]) + CATEGORY_VARIANCE * same(a[1], b[1]);
  const productKernel = (a, b) => X_KERNEL(a[0], b[0]) * same(a[1], b[1]);
  const sharedIndividualKernel = (a, b) => X_KERNEL(a[0], b[0]) + INDIVIDUAL_KERNEL(a[0], b[0]) * same(a[1], b[1]);

  // 例のデータ: 3台の装置。共通の形にずれが乗る（真の関数は説明用に作ったもの）。C はデータが3点だけ
  const sharedShape = (x) => 0.8 * Math.sin(1.3 * x) + 0.25 * x - 0.2;
  const TRUE_OFFSETS = { A: 0.5, B: -0.1, C: -0.6 };
  const DEMO_POINTS = [
    ...G.linspace(0.1, 3.9, 10).map((x) => [x, 'A']),
    ...G.linspace(0.3, 3.7, 9).map((x) => [x, 'B']),
    ...[0.2, 0.7, 1.2].map((x) => [x, 'C']),
  ];
  const DEMO_NOISE = G.standardNormals(DEMO_POINTS.length, 951);
  const DEMO_Y = Float64Array.from(DEMO_POINTS, ([x, c], i) => sharedShape(x) + TRUE_OFFSETS[c] + 0.06 * DEMO_NOISE[i]);
  const DEMO_NOISE_VARIANCE = 0.06 ** 2;
  const DEMO_MODEL = G.fit(DEMO_POINTS, DEMO_Y, additiveKernel, DEMO_NOISE_VARIANCE);
  // カテゴリ c のずれの推定 = σ_c² ×（そのカテゴリのデータの α の合計）
  const offsetOf = (c) => CATEGORY_VARIANCE * DEMO_POINTS.reduce((total, p, i) => total + (p[1] === c ? DEMO_MODEL.alpha[i] : 0), 0);
  const centered = (values) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.map((v) => v - mean);
  };
  const ESTIMATED_OFFSETS = centered(CATEGORIES.map(offsetOf));
  const TRUE_CENTERED = centered(CATEGORIES.map((c) => TRUE_OFFSETS[c]));
  const countOf = (c) => DEMO_POINTS.filter((p) => p[1] === c).length;

  // 小さな行列（カテゴリ×カテゴリ）を、色と数字で描く。数字はマスに収まるよう 0.77 → .77 と書く
  const shortNumber = (v) => (v === 1 ? '1' : v === 0 ? '0' : `.${String(Math.round(v * 100)).padStart(2, '0')}`);
  function drawCategoryMatrix(ctx, x, y, size, M, alpha) {
    const n = M.length;
    const cell = size / n;
    ctx.save();
    ctx.globalAlpha *= alpha;
    M.forEach((row, i) =>
      row.forEach((v, j) => {
        const [r, g, b] = seqColor(v);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + j * cell + 1, y + i * cell + 1, cell - 2, cell - 2);
        canvasText(ctx, shortNumber(v), x + j * cell + cell / 2, y + i * cell + cell / 2 + 5, { size: 14, color: v > 0.55 ? C.bg : C.text, align: 'center', weight: 600 });
      }),
    );
    CATEGORIES.forEach((c, k) => canvasText(ctx, c, x - 10, y + k * cell + cell / 2 + 5, { size: 16, color: C.muted, align: 'right' }));
    ctx.restore();
  }

  // ---------------------------------------------------------------- 第9章 理論（質的変数のカーネル）
  const EXCHANGEABLE_RHO = 0.5;
  // 共領域化の例: B = W Wᵀ + diag(κ)。対角が 1 になるように κ = 1 − w² とした
  const ICM_W = [0.9, 0.85, 0.15];
  const ICM_B = ICM_W.map((wi, i) => ICM_W.map((wj, j) => wi * wj + (i === j ? 1 - wi * wi : 0)));
  const MATRIX_EXAMPLES = [
    CATEGORIES.map((_, i) => CATEGORIES.map((__, j) => same(i, j))),
    CATEGORIES.map((_, i) => CATEGORIES.map((__, j) => EXCHANGEABLE_RHO + (1 - EXCHANGEABLE_RHO) * same(i, j))),
    ICM_B,
  ];
  SCENES.push({
    id: '9T',
    chapter: 9,
    kind: 'theory',
    title: '質的変数をカーネルで扱う',
    beats: [
      beat('質的変数は、装置やロットのように、値の大小や距離を持たない入力です。'),
      beat(R`そこでカーネルは「同じカテゴリか、違うか」で決めます。いちばん単純なのが、同じなら $\sigma_c^2$、違えば 0 の一致カーネルです。`, 10),
      beat(R`違うカテゴリにも少し相関を持たせるのが、交換可能カーネルです。$\rho$ が、カテゴリどうしの似ている度合いです。`, 9),
      beat(R`カテゴリの組ごとに相関を変えたいときは、行列 $B$ を学ぶ共領域化を使います。$B$ は正定値になるよう $WW^{\top}$ の形で作ります。`, 11),
      beat('よく使う「one-hot にして RBF」は、違うカテゴリの距離がどれも同じなので、交換可能カーネルと同じになります。', 10),
    ],
    build(ui) {
      ui.text(R`質的変数 $c$：装置、ロット、Scan の向き、Mark の種類など（値の大小や距離がない）`, { x: LEFT_X, y: 125, size: 25, color: C.text2 });
      [
        { label: '一致カーネル', tex: R`k_c(c,c') = \sigma_c^2\,\delta_{cc'},\qquad \delta_{cc'} = \begin{cases} 1 & (c = c') \\ 0 & (c \neq c') \end{cases}`, at: 1, y: 185 },
        { label: '交換可能カーネル', tex: R`k_c(c,c') = \sigma_c^2\big(\rho + (1-\rho)\,\delta_{cc'}\big),\qquad 0 \le \rho \le 1`, at: 2, y: 330 },
        { label: '共領域化（ICM）', tex: R`k_c(c,c') = B_{cc'},\qquad B = WW^{\top} + \operatorname{diag}(\boldsymbol{\kappa})`, at: 3, y: 470 },
      ].forEach(({ label, tex, at, y }) => {
        ui.text(label, { x: LEFT_X, y: y + 10, size: 25, weight: 700, at, glow: [{ from: at, to: at + 1, color: C.yellow }] });
        ui.tex(tex, { x: LEFT_X + 250, y, size: 32, at });
      });
      ui.card({ x: LEFT_X, y: 590, w: 1060, h: 165, title: 'one-hot ＋ RBF ＝ 交換可能カーネル', at: 4 });
      ui.tex(R`\|\mathbf{e}_A - \mathbf{e}_B\|^2 = \|(1,0,0) - (0,1,0)\|^2 = 2\ \ \Longrightarrow\ \ \exp\!\Big(-\frac{2}{2\ell^2}\Big) = e^{-1/\ell^2} = \rho`, { x: LEFT_X + 30, y: 632, size: 30, at: 4, delay: 0.4 });
      ui.text('違うカテゴリの組はどれも同じ距離なので、相関はすべて同じ ρ になる', { x: LEFT_X + 30, y: 706, size: 21, color: C.text2, at: 4, delay: 1 });
    },
    draw(ctx, s) {
      const SIZE = 102;
      const labels = ['一致（σ² = 1）', `交換可能（ρ = ${EXCHANGEABLE_RHO}）`, '共領域化 B の例'];
      [185, 330, 470].forEach((y, i) => {
        const alpha = s.p(i + 1, 0.6, 0.3);
        if (alpha <= 0) return;
        canvasText(ctx, labels[i], 1310, y - 2, { size: 17, color: C.text2, alpha });
        drawCategoryMatrix(ctx, 1340, y + 10, SIZE, MATRIX_EXAMPLES[i], alpha);
      });
    },
  });

  // ---------------------------------------------------------------- 第9章 図解（行列とサンプル）
  SCENES.push({
    id: '9V',
    chapter: 9,
    kind: 'visual',
    title: 'カテゴリつきの行列と、そこから生まれる関数',
    beats: [
      beat('3つのカテゴリ A・B・C に、x = 0〜4 の20点ずつを並べた行列です。カテゴリごとにブロックになります。'),
      beat('左は加法です。x のカーネルに、同じカテゴリのときだけ一定の値が足され、対角のブロックが一様に明るくなります。', 10),
      beat('中央は積です。違うカテゴリの組は 0 になり、ブロック対角の行列になります。'),
      beat('右は、共通の関数にカテゴリごとの関数を足した形です。全体の模様に、対角ブロックの模様が重なります。', 9),
      beat('サンプルでは、加法は同じ形の曲線が上下にずれ、積はばらばらの曲線になります。'),
      beat('共通＋個別では、似た形をしながら、カテゴリごとに少しずつ違う曲線になります。'),
    ],
    build(ui) {
      const xs = G.linspace(0, 4, 20);
      const points = CATEGORIES.flatMap((c) => xs.map((x) => [x, c]));
      const sampleX = G.linspace(0, 4, 100);
      const samplePoints = CATEGORIES.flatMap((c) => sampleX.map((x) => [x, c]));
      const normals = [G.standardNormals(samplePoints.length, 961)];
      const kernels = [
        { k: additiveKernel },
        { k: productKernel },
        { k: sharedIndividualKernel },
      ];
      kernels.forEach((item, i) => {
        item.K = G.gram(points, points, item.k);
        const f = G.sampleFunctions(samplePoints, item.k, normals)[0];
        item.curves = CATEGORIES.map((_, c) => Array.from(f.slice(c * sampleX.length, (c + 1) * sampleX.length)));
        const x0 = 95 + i * 470;
        item.heat = { x: x0 + 70, y: 205, size: 270 };
        item.plot = new Plot({ x: x0, y: 560, w: 400, h: 150, xr: [0, 4], yr: [-3, 3] });
      });
      // 見出し（出る字幕と、ほかの図に注目する間は暗くする字幕の範囲）
      [
        { text: R`加法　$k_x + \sigma_c^2\,\delta$`, at: 0, dim: [[2, 4], [5]] },
        { text: R`積　$k_x \times \delta$`, at: 2, dim: [[3, 4], [5]] },
        { text: R`共通＋個別　$k_x + k_h \times \delta$`, at: 3, dim: [[4, 5]] },
      ].forEach(({ text, at, dim }, i) => ui.text(text, { x: kernels[i].heat.x, y: 146, size: 22, weight: 700, at, dim }));
      return { kernels, sampleX };
    },
    draw(ctx, s, st) {
      const MAX = 1.3;
      const FOCUS = { 0: [0, 1, 2], 1: [0], 2: [1], 3: [2], 4: [0, 1], 5: [2] };
      const appearBeat = [0, 2, 3];
      const focusOf = (i) => (FOCUS[s.beat] || [0, 1, 2]).includes(i) ? 1 : 0.32;
      st.kernels.forEach((item, i) => {
        const appear = s.p(appearBeat[i], 0.6);
        if (appear <= 0) return;
        const { x, y, size } = item.heat;
        ctx.save();
        ctx.globalAlpha = appear * focusOf(i);
        drawMatrixHeat(ctx, x, y, size, item.K, MAX);
        ctx.strokeStyle = 'rgba(240,239,236,0.55)';
        ctx.lineWidth = 1.5;
        [1, 2].forEach((k) => {
          ctx.beginPath();
          ctx.moveTo(x + (k * size) / 3, y);
          ctx.lineTo(x + (k * size) / 3, y + size);
          ctx.moveTo(x, y + (k * size) / 3);
          ctx.lineTo(x + size, y + (k * size) / 3);
          ctx.stroke();
        });
        CATEGORIES.forEach((c, k) => {
          canvasText(ctx, c, x + ((k + 0.5) * size) / 3, y - 8, { size: 17, color: C.text2, align: 'center', weight: 700 });
          canvasText(ctx, c, x - 10, y + ((k + 0.5) * size) / 3 + 6, { size: 17, color: C.text2, align: 'right', weight: 700 });
        });
        ctx.restore();

        const sampleAlpha = s.p(4, 0.8);
        if (sampleAlpha <= 0) return;
        const P = item.plot;
        ctx.save();
        ctx.globalAlpha = sampleAlpha * focusOf(i);
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [-2, 0, 2], xlabel: 'x' });
        item.curves.forEach((f, c) => P.line(ctx, st.sampleX, f, { color: SERIES[c], width: 3, upto: s.p(4, 2, 0.4) }));
        ctx.restore();
      });
      colorBar(ctx, 1445, 205, 18, 270, (v) => seqColor(v / MAX), { min: 0, max: MAX, ticks: [0, 0.5, 1], label: 'k' });
      const sampleAlpha = s.p(4, 0.8);
      if (sampleAlpha > 0) legend(ctx, CATEGORIES.map((c, k) => ({ label: `カテゴリ ${c}`, color: SERIES[k] })), 95, 532, { alpha: sampleAlpha });
    },
  });

  // ---------------------------------------------------------------- 第9章 理論（ずれの推定）
  const sameDiffRows = [0, 1, 3].map((r) => [String(r), fmt(X_KERNEL(0, r) + CATEGORY_VARIANCE, 3), fmt(X_KERNEL(0, r), 3)]);
  const SHRINK_NOISE_VARIANCE = 0.09;
  const shrinkRows = [1, 3, 10].map((n) => [String(n), fmt((n * CATEGORY_VARIANCE) / (n * CATEGORY_VARIANCE + SHRINK_NOISE_VARIANCE), 3)]);
  SCENES.push({
    id: '9T-2',
    chapter: 9,
    kind: 'theory',
    title: '加法カーネルで「カテゴリのずれ」を推定する',
    beats: [
      beat(R`質的変数を加法カーネルで入れると、関数を「全カテゴリ共通の形 $g(x)$」と「カテゴリごとのずれ $h(c)$」の和と考えることになります。`, 11),
      beat(R`数値で見ると、同じカテゴリなら、x が離れても $\sigma_c^2 = ${CATEGORY_VARIANCE}$ の相関が残ります。共通のずれを共有するからです。`, 10),
      beat(R`予測を分解すると、あるカテゴリのずれは、$\sigma_c^2$ に、そのカテゴリのデータの $\alpha_i$ の合計を掛けた値です。`, 10),
      beat(R`共通の形 $g(x)$ は、カテゴリに関係なく、すべてのデータの $\alpha_i$ とカーネルの山から計算します。`, 9),
      beat(R`ずれは、データの少ないカテゴリほど 0 側へ縮みます。変量効果の推定と同じで、$\sigma_c^2 \to \infty$ でダミー変数（固定効果）と一致します。`, 12),
      beat(R`形もカテゴリで違うなら、共通の関数に「x のカーネル × 一致カーネル」を足し、$g(x) + h_c(x)$ とします。`, 10),
      beat('次の図解のデータで推定したずれです。平均を引いて比べると、データが3点しかないカテゴリ C も、真の値に近く推定できています。', 11),
    ],
    build(ui) {
      ui.tex(R`f(x, c) = \underbrace{g(x)}_{\text{共通の形}} + \underbrace{h(c)}_{\text{カテゴリのずれ}},\qquad k = k_x(x,x') + \sigma_c^2\,\delta_{cc'}`, { x: LEFT_X, y: 120, size: 34 });
      ui.text(R`$k_x$：RBF（$\ell = 1$）、$\sigma_c^2 = ${CATEGORY_VARIANCE}$`, { x: LEFT_X, y: 238, size: 22, color: C.text2, at: 1 });
      ui.table({
        x: LEFT_X, y: 275, widths: [90, 200, 200], size: 24, rowH: 42, at: 1,
        header: ['$r$', '同じカテゴリ', '違うカテゴリ'],
        rows: sameDiffRows,
        rowDelay: 0.5,
        glowRows: { 2: [{ from: 1, to: 2, color: C.yellow }] },
      });
      ui.tex(R`\mu_h(c) = \sum_i \sigma_c^2\,\delta_{c\,c_i}\,\alpha_i = \sigma_c^2 \sum_{i:\,c_i = c} \alpha_i`, { x: 700, y: 240, size: 32, at: 2, glow: [{ from: 2, to: 3, color: C.yellow }] });
      ui.tex(R`\mu_g(x) = \sum_{i} \alpha_i\, k_x(x, x_i)\qquad (\text{全カテゴリのデータ})`, { x: 700, y: 335, size: 32, at: 3 });

      ui.card({ x: LEFT_X, y: 470, w: 640, h: 280, title: R`縮み方（x を除いた簡単な場合、$\sigma_n^2 = ${SHRINK_NOISE_VARIANCE}$）`, at: 4 });
      ui.tex(R`\mathbb{E}\big[h(c)\mid\mathbf{y}\big] = \frac{n_c\,\sigma_c^2}{n_c\,\sigma_c^2 + \sigma_n^2}\;\bar{y}_c`, { x: LEFT_X + 30, y: 520, size: 30, at: 4, delay: 0.3 });
      ui.table({
        x: LEFT_X + 30, y: 610, widths: [210, 210], size: 22, rowH: 34, at: 4, delay: 0.8,
        header: ['データ数 $n_c$', '掛かる割合'],
        rows: shrinkRows,
        rowDelay: 0.4,
      });
      ui.text(R`$\sigma_c^2 \to \infty$ で割合は 1（ダミー変数と同じ）`, { x: 520, y: 650, w: 200, size: 19, lh: 1.4, color: C.text2, at: 4, delay: 2 });

      ui.tex(R`k = k_g(x,x') + k_h(x,x')\,\delta_{cc'}\ \Longrightarrow\ f(x,c) = g(x) + h_c(x)`, { x: 780, y: 470, size: 28, at: 5, glow: [{ from: 5, to: 6, color: C.violet }] });
      ui.card({ x: 780, y: 545, w: 730, h: 205, title: '次の図解のデータで推定したずれ（平均を引いた値）', at: 6 });
      ui.table({
        x: 800, y: 590, widths: [140, 130, 210, 210], size: 23, rowH: 38, at: 6, delay: 0.3,
        header: ['カテゴリ', 'データ数', '推定', '真の値'],
        rows: CATEGORIES.map((c, k) => [c, String(countOf(c)), fmt(ESTIMATED_OFFSETS[k], 3), fmt(TRUE_CENTERED[k], 3)]),
        rowDelay: 0.4,
        glowRows: { 2: [{ from: 6, color: C.aqua }] },
      });
    },
  });

  // ---------------------------------------------------------------- 第9章 図解（データの少ないカテゴリ）
  SCENES.push({
    id: '9V-2',
    chapter: 9,
    kind: 'visual',
    title: 'データの少ないカテゴリを予測する',
    beats: [
      beat('3台の装置 A・B・C で測ったデータです。装置ごとに一定のずれがあり、C は x が小さい所の3点しかありません。', 10),
      beat('左：カテゴリを無視すると、1本の曲線しか引けず、装置ごとのずれを表せません。帯は細いのに、外れています。', 10),
      beat('中央：カテゴリごとに別々の GP（積）では、C はデータのない所で平均 0 に戻り、帯も広がります。', 9),
      beat('右：加法カーネルでは、A と B から学んだ共通の形に C のずれを足すので、データのない所の C も当たります。', 10),
      beat('下の棒は、推定したずれと真のずれです。ずれ全体の高さは共通の形と分けられないため、平均を引いて比べています。', 11),
    ],
    build(ui) {
      const grid = G.linspace(0, 4, 120);
      const models = [
        { title: R`カテゴリを無視　$k_x$ だけ`, kernel: xOnlyKernel, at: 1, dim: [[2, 4]] },
        { title: R`カテゴリごとに別々　$k_x \times \delta$`, kernel: productKernel, at: 2, dim: [[1, 2], [3, 4]] },
        { title: R`加法　$k_x + \sigma_c^2\,\delta$`, kernel: additiveKernel, at: 3, dim: [[1, 3]] },
      ];
      models.forEach((m, i) => {
        const model = m.kernel === additiveKernel ? DEMO_MODEL : G.fit(DEMO_POINTS, DEMO_Y, m.kernel, DEMO_NOISE_VARIANCE);
        m.predictions = CATEGORIES.map((c) => G.predict(model, grid.map((x) => [x, c]), m.kernel));
        m.plot = new Plot({ x: 95 + i * 485, y: 200, w: 420, h: 300, xr: [0, 4], yr: [-2, 2] });
        ui.text(m.title, { x: m.plot.x, y: 152, size: 21, weight: 700, dim: m.dim });
      });
      return { grid, models, truthC: grid.map((x) => sharedShape(x) + TRUE_OFFSETS.C) };
    },
    draw(ctx, s, st) {
      legend(ctx, [
        ...CATEGORIES.map((c, k) => ({ label: `装置 ${c}`, color: SERIES[k] })),
        { label: 'C の真の値', color: C.text2, width: 2, dash: [6, 6] },
        { label: 'C の ±2σ', color: C.aqua, kind: 'band' },
      ], 95, 118);
      const columnsX = CATEGORIES.map((c) => DEMO_POINTS.filter((p) => p[1] === c));
      st.models.forEach((m, i) => {
        const P = m.plot;
        const fit = s.p(m.at, 2.5);
        const focus = s.beat <= 0 || s.beat === m.at || s.beat >= 4 ? 1 : 0.4;
        ctx.save();
        ctx.globalAlpha = focus;
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [-2, -1, 0, 1, 2], xlabel: 'x' });
        P.shade(ctx, 1.3, 4, { color: C.aqua, alpha: 0.05 });
        P.line(ctx, st.grid, st.truthC, { color: C.text2, width: 2, dash: [6, 6], alpha: s.p(1, 0.6) });
        if (fit > 0) {
          const curves = i === 0 ? [m.predictions[0]] : m.predictions;
          const band = i === 0 ? m.predictions[0] : m.predictions[2];
          P.band(ctx, st.grid, Array.from(band.mean, (v, k) => v - 2 * band.sd[k]), Array.from(band.mean, (v, k) => v + 2 * band.sd[k]), { color: i === 0 ? C.text : C.aqua, alpha: 0.2, upto: fit });
          curves.forEach((p, k) => P.line(ctx, st.grid, p.mean, { color: i === 0 ? C.text : SERIES[k], width: 3, upto: fit }));
        }
        columnsX.forEach((points, k) => P.dots(ctx, points.map((p) => p[0]), points.map((p) => DEMO_Y[DEMO_POINTS.indexOf(p)]), { color: SERIES[k], r: 6 }));
        ctx.restore();
      });
      canvasText(ctx, 'C のデータがない区間', st.models[2].plot.sx(2.65), st.models[2].plot.y + 22, { size: 16, color: C.muted, align: 'center' });

      // 下: ずれの推定（塗り）と真の値（枠）。平均を引いて比べる
      const bars = s.p(4, 0.8);
      if (bars > 0) {
        const X0 = 1080;
        const Y0 = 655;
        const UNIT = 95;
        ctx.save();
        ctx.globalAlpha = bars;
        canvasText(ctx, 'ずれ（平均を引いた値）', X0, 575, TITLE);
        legend(ctx, [{ label: '推定', color: C.text2, kind: 'band' }, { label: '真の値', color: C.text, width: 2 }], X0 + 250, 573, { size: 16, gap: 20 });
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(X0, Y0);
        ctx.lineTo(X0 + 420, Y0);
        ctx.stroke();
        CATEGORIES.forEach((c, k) => {
          const cx = X0 + 70 + k * 140;
          const est = ESTIMATED_OFFSETS[k];
          const tru = TRUE_CENTERED[k];
          ctx.fillStyle = rgba(SERIES[k], 0.85);
          ctx.fillRect(cx - 34, Math.min(Y0, Y0 - est * UNIT), 30, Math.abs(est) * UNIT);
          ctx.strokeStyle = C.text;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 4, Math.min(Y0, Y0 - tru * UNIT), 30, Math.abs(tru) * UNIT);
          canvasText(ctx, c, cx, Y0 + (est >= 0 ? 24 : -est * UNIT + 24), { size: 17, color: C.text2, align: 'center', weight: 700 });
          canvasText(ctx, fmt(est, 2), cx - 19, est >= 0 ? Y0 - est * UNIT - 8 : Y0 - est * UNIT + 44, { size: 14, color: C.text2, align: 'center' });
        });
        ctx.restore();
      }
    },
  });
})();
