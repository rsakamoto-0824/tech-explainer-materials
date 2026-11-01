// scenes-intro.js — 第1章のはじめの場面（ガウス過程回帰の全体像、多変量正規分布）。
// 書き方は scenes-basic.js と同じ。同じ章の場面はファイルを読んだ順に並ぶので、gpr.html では scenes-basic.js より先に読む。
(() => {
  const { C, Plot, fmt, texNum, canvasText, legend, keyframes, ramp, rgba } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };
  const SAMPLE_COLORS = [C.blue, C.orange, C.aqua, C.violet];

  // ---------------------------------------------------------------- 第1章 全体像
  // 説明用のデータ（なめらかな関数 ＋ 小さなノイズ）
  const OVERVIEW_X = [0.5, 1.3, 2.1, 3.3, 3.9];
  const OVERVIEW_NOISE = G.standardNormals(OVERVIEW_X.length, 105);
  const OVERVIEW_Y = Float64Array.from(OVERVIEW_X, (x, i) => Math.sin(1.3 * x) + 0.4 * Math.cos(0.7 * x) - 0.2 + 0.05 * OVERVIEW_NOISE[i]);
  const OVERVIEW_KERNEL = G.rbf({ variance: 1, lengthScale: 0.8 });
  const OVERVIEW_NOISE_VARIANCE = 0.01;

  SCENES.push({
    id: '1G',
    chapter: 1,
    kind: 'visual',
    title: 'ガウス過程回帰の全体像',
    beats: [
      beat('まず、ガウス過程回帰の全体像です。やることは、大きく3つの段階に分かれます。', 7),
      beat('① 事前分布：カーネルを選ぶと「どんな関数がありそうか」が決まります。細い線は、そこから引いた関数の例です。', 11),
      beat('② データを観測したら、データの近くを通る関数だけを残します。この計算が、多変量正規分布の「条件付け」です。', 11),
      beat('③ 残った関数の平均が予測、ばらつきが不確かさです。データから離れると、帯が広がります。', 10),
      beat('カーネルの長さスケールなどの設定（ハイパーパラメータ）は、周辺尤度を最大にして、データから決めます。', 10),
      beat('第5章からは、カーネルを足したり掛けたりして、トレンドや周期などの仮定を組み込みます。', 9),
      beat('どの段階も、土台は多変量正規分布です。次は、その多変量正規分布から見ていきます。', 8),
    ],
    build(ui) {
      const grid = G.linspace(0, 5, 121);
      const model = G.fit(OVERVIEW_X, OVERVIEW_Y, OVERVIEW_KERNEL, OVERVIEW_NOISE_VARIANCE);
      const normals = (base) => SAMPLE_COLORS.map((_, k) => G.standardNormals(grid.length, base + k));
      const panels = [0, 1, 2].map((i) => new Plot({ x: 110 + i * 475, y: 230, w: 430, h: 270, xr: [0, 5], yr: [-2.8, 2.8] }));
      const notes = [
        { text: R`カーネル $k(x,x')$ で「どんな関数がありそうか」を決める（第1・2章）`, at: 1 },
        { text: '多変量正規分布の条件付けで、データを通る関数だけを残す（第3章）', at: 2 },
        { text: '予測平均 と ±2σ の帯。ハイパーパラメータは周辺尤度で決める（第3・4章）', at: 3 },
      ];
      notes.forEach((note, i) => ui.text(note.text, {
        x: panels[i].x, y: 560, w: 430, size: 21, color: C.text2, lh: 1.6, at: note.at, delay: 0.4,
        glow: i === 2 ? [{ from: 4, to: 5, color: C.yellow }] : undefined,
      }));
      ui.text('第5章〜：カーネルを組み立てる（周期・加法・質的変数・積）', { x: 110, y: 680, size: 24, weight: 700, at: 5, glow: [{ from: 5, to: 6, color: C.yellow }] });
      ui.text('土台はすべて多変量正規分布', { x: 890, y: 680, w: 600, size: 24, weight: 700, align: 'right', at: 6, color: C.yellow });
      return {
        grid,
        panels,
        prior: G.sampleFunctions(grid, OVERVIEW_KERNEL, normals(120)),
        posterior: G.posteriorSamples(model, grid, normals(130)),
        prediction: G.predict(model, grid),
      };
    },
    draw(ctx, s, st) {
      const titles = ['① 事前分布（データなし）', '② データで条件づける', '③ 予測：平均と不確かさ'];
      const appear = s.p(0, 0.8);
      ctx.globalAlpha = appear;
      st.panels.forEach((P, i) => {
        const focus = s.beat < 1 || s.beat > 3 || s.beat === i + 1 ? 1 : 0.45;
        ctx.save();
        ctx.globalAlpha *= focus;
        canvasText(ctx, titles[i], P.x, P.y - 22, TITLE);
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-2, 0, 2], xlabel: 'x' });
        if (i === 0) {
          st.prior.forEach((f, k) => P.line(ctx, st.grid, f, { color: SAMPLE_COLORS[k], width: 2, alpha: 0.85, upto: s.p(1, 1.8, k * 0.3) }));
        }
        if (i === 1) {
          st.posterior.forEach((f, k) => P.line(ctx, st.grid, f, { color: SAMPLE_COLORS[k], width: 2, alpha: 0.85, upto: s.p(2, 1.8, 0.8 + k * 0.3) }));
          P.dots(ctx, OVERVIEW_X, Array.from(OVERVIEW_Y), { color: C.yellow, r: 7, alpha: s.p(2, 0.6) });
        }
        if (i === 2) {
          const pred = st.prediction;
          const grow = s.p(3, 1.8);
          P.band(ctx, st.grid, Array.from(pred.mean, (m, j) => m - 2 * pred.sd[j]), Array.from(pred.mean, (m, j) => m + 2 * pred.sd[j]), { color: C.blue, alpha: 0.3, upto: grow });
          P.line(ctx, st.grid, pred.mean, { color: C.text, width: 3, upto: grow });
          P.dots(ctx, OVERVIEW_X, Array.from(OVERVIEW_Y), { color: C.yellow, r: 7, alpha: s.p(3, 0.6) });
        }
        ctx.restore();
        if (i < 2) canvasText(ctx, '→', P.x + P.w + 22, P.y + P.h / 2 + 14, { size: 40, color: C.muted, align: 'center', weight: 700 });
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（多変量正規分布）
  const MVN_RHO = 0.8;
  const MVN_KNOWN = 1;
  const conditionalMean = MVN_RHO * MVN_KNOWN;
  const conditionalVariance = 1 - MVN_RHO ** 2;

  SCENES.push({
    id: '1T-M',
    chapter: 1,
    kind: 'theory',
    title: '多変量正規分布 ― 平均ベクトルと共分散行列',
    beats: [
      beat(R`1つの値の正規分布は、平均 $\mu$ と分散 $\sigma^2$ で決まります。`, 7),
      beat('値が2つのときは、平均を並べた「平均ベクトル」と、分散と共分散を並べた「共分散行列」で決まります。', 10),
      beat(R`共分散を2つの標準偏差で割った $\rho$ が相関係数です。$\rho$ が 1 に近いほど、2つの値はそろって動きます。`, 10),
      beat(R`$n$ 個の値でも同じで、$n$ 次元の平均ベクトルと $n \times n$ の共分散行列で決まります。これが多変量正規分布です。`, 10),
      beat('大事な性質：一部の値だけを取り出しても正規分布のまま。独立な正規分布の和も、正規分布です。', 10),
      beat('一部の値が分かると、残りの値も正規分布になり、平均と分散がこの式で求まります。ガウス過程の予測は、この式をそのまま使います。', 12),
      beat(R`例：平均 0・分散 1・相関 0.8 の2つの値で、$f_1 = 1$ と分かると、$f_2$ は平均 ${fmt(conditionalMean, 1)}・分散 ${fmt(conditionalVariance, 2)} の正規分布になります。`, 11),
    ],
    build(ui) {
      ui.tex(R`f \sim \mathcal{N}(\mu,\ \sigma^2),\qquad p(f) = \frac{1}{\sqrt{2\pi\sigma^2}}\exp\!\left(-\frac{(f-\mu)^2}{2\sigma^2}\right)`, { x: LEFT_X, y: 130, size: 32 });
      ui.tex(R`\begin{bmatrix} f_1 \\ f_2 \end{bmatrix} \sim \mathcal{N}\!\left(\htmlClass{hlMu}{\begin{bmatrix} \mu_1 \\ \mu_2 \end{bmatrix}},\ \htmlClass{hlSigma}{\begin{bmatrix} \sigma_1^2 & \rho\,\sigma_1\sigma_2 \\ \rho\,\sigma_1\sigma_2 & \sigma_2^2 \end{bmatrix}}\right)`, {
        x: LEFT_X, y: 225, size: 32, at: 1,
        hl: [{ cls: 'hlMu', from: 1, to: 2, color: C.blue }, { cls: 'hlSigma', from: 1, to: 3, color: C.orange }],
      });
      ui.text('平均ベクトル', { x: LEFT_X + 140, y: 335, size: 20, color: C.blue, at: 1, delay: 0.6 });
      ui.text('共分散行列', { x: LEFT_X + 322, y: 335, size: 20, color: C.orange, at: 1, delay: 0.6 });
      ui.text(R`$\rho = \dfrac{\operatorname{Cov}(f_1, f_2)}{\sigma_1 \sigma_2}$：相関係数（$-1 \le \rho \le 1$）`, { x: LEFT_X + 30, y: 372, size: 24, color: C.text2, at: 2 });
      ui.tex(R`\mathbf{f} \sim \mathcal{N}(\boldsymbol{\mu},\ \Sigma),\qquad p(\mathbf{f}) \propto \exp\!\left(-\tfrac{1}{2}(\mathbf{f}-\boldsymbol{\mu})^{\top}\Sigma^{-1}(\mathbf{f}-\boldsymbol{\mu})\right)`, { x: LEFT_X, y: 455, size: 30, at: 3 });
      ui.tex(R`f_2 \mid f_1 \sim \mathcal{N}\!\big(\mu_2 + \Sigma_{21}\Sigma_{11}^{-1}(f_1 - \mu_1),\ \ \Sigma_{22} - \Sigma_{21}\Sigma_{11}^{-1}\Sigma_{12}\big)`, {
        x: LEFT_X, y: 560, size: 28, at: 5, glow: [{ from: 5, to: 6, color: C.yellow }],
      });
      ui.text('→ 第3章の予測の式は、この条件付きの式そのもの', { x: LEFT_X + 30, y: 640, size: 23, color: C.text2, at: 5, delay: 0.8 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 250, title: '大事な性質', at: 4 });
      [
        '① 一部を取り出しても正規分布（周辺分布）',
        '② 独立な正規分布の和も正規分布',
        '③ 一部が分かると、残りも正規分布（条件付き分布）',
      ].forEach((line, i) => ui.text(line, { x: CARD_X + 24, y: 188 + i * 58, size: 22, at: i < 2 ? 4 : 5, delay: i < 2 ? 0.3 + i * 0.6 : 0.3 }));
      ui.card({ x: CARD_X, y: 410, w: CARD_W, h: 270, title: R`例（$\mu = 0,\ \sigma_1^2 = \sigma_2^2 = 1,\ \rho = ${MVN_RHO}$）`, at: 6 });
      ui.text(R`$f_1 = ${MVN_KNOWN}$ と分かったとき`, { x: CARD_X + 24, y: 470, size: 23, at: 6, delay: 0.3 });
      ui.text(R`平均：$0 + ${MVN_RHO} \times ${MVN_KNOWN} = ${texNum(conditionalMean, 1)}$`, { x: CARD_X + 24, y: 530, size: 25, at: 6, delay: 0.8 });
      ui.text(R`分散：$1 - ${MVN_RHO}^2 = ${texNum(conditionalVariance, 2)}$`, { x: CARD_X + 24, y: 585, size: 25, at: 6, delay: 1.4 });
      ui.text(R`（標準偏差 ${fmt(Math.sqrt(conditionalVariance), 1)}。もとの 1 から縮む）`, { x: CARD_X + 24, y: 632, size: 21, color: C.text2, at: 6, delay: 1.8 });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（2変量正規分布と条件付け）
  const MVN_POINTS = 300;
  const MVN_SLICE_HALF_WIDTH = 0.15; // f₁ = 1 の線から、この幅の中にある点を「線の近くの点」とする
  const normalDensity = (x, mean, variance) => Math.exp(-((x - mean) ** 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);

  SCENES.push({
    id: '1V-M',
    chapter: 1,
    kind: 'visual',
    title: '2変量正規分布と、条件付き分布',
    beats: [
      beat(R`平均 0・分散 1 の2つの値 $(f_1, f_2)$ を、300 回取り出して平面に打ちました。相関は $\rho = 0$ です。`, 9),
      beat(R`$\rho = 0.8$ にすると、点は右上がりの楕円に集まります。$f_1$ が大きいと、$f_2$ も大きくなりやすい関係です。`, 10),
      beat(R`$\rho$ を負（−0.6）にすると右下がり。片方が大きいと、もう片方は小さくなりやすい関係です。`, 10),
      beat(R`$\rho = 0.8$ に戻して、$f_1 = 1$ と分かったとします。`, 7),
      beat(R`線の近くの点だけを見ると、$f_2$ は ${fmt(conditionalMean, 1)} のまわりに集まります。これが条件付き分布です。`, 10),
      beat(R`幅も、もとの分散 1 から ${fmt(conditionalVariance, 2)} に縮みます。相関が強いほど、分かった値から残りの値をよく言い当てられます。`, 11),
      beat('ガウス過程の予測は、これと同じ計算を、データの点と予測したい点の間で行うことです。', 9),
    ],
    build() {
      const z1 = G.standardNormals(MVN_POINTS, 151);
      const z2 = G.standardNormals(MVN_POINTS, 152);
      const fs = G.linspace(-3.5, 3.5, 281);
      return {
        z1, z2, fs,
        prior: fs.map((f) => normalDensity(f, 0, 1)),
        conditional: fs.map((f) => normalDensity(f, conditionalMean, conditionalVariance)),
        scatter: new Plot({ x: 150, y: 190, w: 500, h: 500, xr: [-3.5, 3.5], yr: [-3.5, 3.5] }),
        density: new Plot({ x: 820, y: 300, w: 680, h: 330, xr: [-3.5, 3.5], yr: [0, 0.75] }),
      };
    },
    draw(ctx, s, st) {
      const rho = keyframes(s.u, [[s.bt(1) + 0.4, 0], [s.bt(1) + 2.4, MVN_RHO], [s.bt(2) + 0.4, MVN_RHO], [s.bt(2) + 2.4, -0.6], [s.bt(3) + 0.2, -0.6], [s.bt(3) + 1.8, MVN_RHO]]);
      const c = Math.sqrt(1 - rho * rho);
      const P = st.scatter;
      const slice = s.p(3, 0.6, 1.6);
      const select = s.p(4, 0.6);
      ctx.globalAlpha = s.p(0, 0.8);
      canvasText(ctx, '2つの値の組を平面に打つ（300 回分）', P.x, P.y - 50, TITLE);
      // 右下は、どの ρ でも点がほとんど来ない（上は f₁ = 1 の線の説明と重なるため、ここに置く）
      canvasText(ctx, `相関 ρ = ${fmt(rho, 2)}`, P.x + P.w - 12, P.y + P.h - 16, { size: 22, color: C.yellow, align: 'right', weight: 700 });
      P.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'f₁', ylabel: 'f₂' });
      const near = [];
      for (let i = 0; i < MVN_POINTS; i++) {
        const f1 = st.z1[i];
        const f2 = rho * st.z1[i] + c * st.z2[i];
        const inSlice = Math.abs(f1 - MVN_KNOWN) < MVN_SLICE_HALF_WIDTH;
        if (inSlice) near.push(f2);
        const dim = inSlice ? 1 : 1 - 0.7 * select;
        P.dots(ctx, [f1], [f2], { color: inSlice && select > 0 ? C.yellow : C.muted, r: inSlice && select > 0 ? 4.5 : 3, alpha: 0.75 * dim, ring: null });
      }
      // 2σ の楕円（分散 1 なので、固有値は 1 ± ρ）
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const a = (k / 120) * Math.PI * 2;
        const u1 = 2 * Math.sqrt(1 + rho) * Math.cos(a);
        const u2 = 2 * Math.sqrt(Math.max(1 - rho, 0)) * Math.sin(a);
        const px = P.sx((u1 + u2) / Math.SQRT2);
        const py = P.sy((u1 - u2) / Math.SQRT2);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      canvasText(ctx, '点線：2σ の範囲', P.x + 12, P.y + 24, { size: 17, color: C.muted });
      if (slice > 0.001) {
        P.vline(ctx, MVN_KNOWN, { color: C.yellow, width: 2.5, dash: null, alpha: slice });
        P.label(ctx, `f₁ = ${MVN_KNOWN} と分かった`, MVN_KNOWN, 3.5, { dx: 10, dy: 22, size: 18, color: C.yellow, alpha: slice });
      }

      // 右: f₂ の分布（もとの分布と、条件付き分布）
      const D = st.density;
      const right = s.p(4, 0.8);
      if (right <= 0.001) return;
      ctx.save();
      ctx.globalAlpha *= right;
      canvasText(ctx, 'f₂ の分布', D.x, D.y - 50, TITLE);
      legend(ctx, [{ label: 'もとの分布 N(0, 1)', color: C.muted, dash: [8, 6] }, { label: `f₁ = 1 のとき N(${fmt(conditionalMean, 1)}, ${fmt(conditionalVariance, 2)})`, color: C.yellow }], D.x + 150, D.y - 52);
      D.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 0.25, 0.5, 0.75], xlabel: 'f₂', fmtY: (v) => fmt(v, 2) });
      D.line(ctx, st.fs, st.prior, { color: C.muted, width: 2.5, dash: [8, 6] });
      D.line(ctx, st.fs, st.conditional, { color: C.yellow, width: 3.5, upto: s.p(4, 1.5, 0.3) });
      // 線の近くの点の f₂（下の目盛りのような短い線）
      near.forEach((f2) => D.vline(ctx, f2, { color: C.yellow, width: 2, dash: null, from: 0, to: 0.06 }));
      const widthGlow = s.win(5, 6);
      if (widthGlow > 0.001) {
        const sd = Math.sqrt(conditionalVariance);
        D.band(ctx, [conditionalMean - 2 * sd, conditionalMean + 2 * sd], [0, 0], [0.75, 0.75], { color: C.yellow, alpha: 0.12 * widthGlow });
        D.label(ctx, `±2σ = ±${fmt(2 * sd, 1)}（もとは ±2）`, conditionalMean, 0.72, { align: 'center', size: 18, color: C.yellow, alpha: widthGlow });
      }
      ctx.restore();
    },
  });
})();
