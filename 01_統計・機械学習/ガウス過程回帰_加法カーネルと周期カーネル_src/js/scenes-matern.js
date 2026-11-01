// scenes-matern.js — 第2章の後半（Matérn カーネル: なめらかさ ν の効き方と、ν → ∞ で RBF になる理由）。
// 場面の書き方は scenes-basic.js と同じ。第2章なので、engine.js が 2T・2V のあとに並べる。
(() => {
  const { C, Plot, fmt, canvasText, legend, keyframes, ramp, rgba } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };

  // 比べる ν。RBF（ν = ∞）はどの場面でも白の点線にする
  const NU_CASES = [
    { nu: 0.5, label: 'ν = 1/2（指数カーネル）', tex: R`\nu = 1/2`, color: C.blue },
    { nu: 1.5, label: 'ν = 3/2', tex: R`\nu = 3/2`, color: C.orange },
    { nu: 2.5, label: 'ν = 5/2', tex: R`\nu = 5/2`, color: C.aqua },
    { nu: Infinity, label: 'ν = ∞（RBF）', tex: R`\nu = \infty`, color: C.text, dash: [10, 7] },
  ];
  const RBF_STYLE = { color: C.text, dash: [10, 7] };
  // 2V-3 で ν を動かしていく Matérn の色
  const MOVING_COLOR = C.violet;

  // RBF との差の最大値 max_r |k_ν(r) − k_RBF(r)|（ℓ = 1、r は 0〜6 を細かく調べる）
  const MAX_DIFF_GRID = G.linspace(0, 6, 1201);
  const RBF_CORRELATION = G.maternCorrelation(Infinity);
  function maxDiffFromRbf(nu) {
    const k = G.maternCorrelation(nu);
    return Math.max(...MAX_DIFF_GRID.map((r) => Math.abs(k(r) - RBF_CORRELATION(r))));
  }

  // ν の表示（半整数は分数で書く）
  function nuText(nu) {
    for (const [value, text] of [[0.5, '1/2'], [1.5, '3/2'], [2.5, '5/2'], [3.5, '7/2']]) if (Math.abs(nu - value) < 0.004) return text;
    return nu < 10 ? fmt(nu, 2) : fmt(nu, 0);
  }

  // 目盛りの指数（−5 → ⁻⁵）
  const SUPERSCRIPT_DIGITS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const superscript = (value) => [...String(value)].map((ch) => SUPERSCRIPT_DIGITS[ch]).join('');

  // 等間隔の格子なら、カーネル行列は「距離の番号」だけで決まる。距離ごとに1回だけ計算して行列を作る
  function sampleOnUniformGrid(grid, correlation, z, jitter = 1e-6) {
    const step = grid[1] - grid[0];
    const byLag = grid.map((_, lag) => correlation(lag * step));
    const K = grid.map((_, i) => Float64Array.from(grid, (_, j) => byLag[Math.abs(i - j)] + (i === j ? jitter : 0)));
    return G.multiplyLower(G.cholesky(K, { lenient: true }), z);
  }

  // ---------------------------------------------------------------- 第2章 理論（Matérn）
  SCENES.push({
    id: '2T-2',
    chapter: 2,
    kind: 'theory',
    title: R`Matérn カーネル ― なめらかさ $\nu$`,
    beats: [
      beat('RBF のサンプルは、何回でも微分できるほどなめらかです。実際のデータは、もっとガタガタしていることがあります。'),
      beat(R`そこで使うのが Matérn（マターン）カーネルです。$\sigma_f^2$ と $\ell$ に加えて、なめらかさを決める $\nu$（ニュー）を持ちます。`, 10),
      beat(R`$K_\nu$ は変形ベッセル関数、$\Gamma$ はガンマ関数です。$\nu$ が 1/2、3/2、5/2 のときは、簡単な式になります。`, 10),
      beat(R`$\nu = 1/2$ は指数カーネル $\exp(-r/\ell)$ です。$r = 0$ で山の頂上がとがっています。`),
      beat(R`$\nu = 3/2,\ 5/2$ は「多項式 × 指数」の形です。$\nu$ を大きくしていくと、行き着く先は RBF です。`, 9),
      beat(R`$r = 0.5$ で比べると、$\nu = 1/2$ は 0.607、RBF は 0.882。$\nu$ が小さいほど、近くの点でも相関が早く下がります。`, 11),
      beat(R`$m$ 回微分できるのは $\nu > m$ のとき。$\nu = 1/2$ は 0 回、3/2 は 1 回、5/2 は 2 回、RBF は何回でも微分できます。`, 11),
      beat(R`実務では $\nu = 3/2$ か $5/2$ がよく使われます。$\nu$ は決め打ちにして、$\sigma_f^2$ と $\ell$ を周辺尤度で決めるのがふつうです。`, 11),
    ],
    build(ui) {
      ui.tex(R`k_{\nu}(r) = \sigma_f^2\, \frac{2^{1-\nu}}{\htmlClass{hlG}{\Gamma(\nu)}} \left(\frac{\sqrt{2\nu}\, r}{\ell}\right)^{\!\nu} \htmlClass{hlK}{K_{\nu}}\!\left(\frac{\sqrt{2\nu}\, r}{\ell}\right)`, {
        x: LEFT_X, y: 150, size: 38,
        glow: [{ from: 1, to: 2, color: C.yellow }],
        hl: [{ cls: 'hlG', from: 2, to: 3, color: C.orange }, { cls: 'hlK', from: 2, to: 3, color: C.blue }],
      });
      ui.text(R`$\nu$：なめらかさ（大きいほどなめらか）　$r = |x - x'|$`, { x: LEFT_X + 30, y: 272, size: 24, color: C.text2, at: 1 });
      ui.text(R`$K_\nu$：変形ベッセル関数　$\Gamma$：ガンマ関数`, { x: LEFT_X + 30, y: 310, size: 24, color: C.text2, at: 2 });

      const forms = [
        R`\sigma_f^2 \exp\!\left(-\frac{r}{\ell}\right)`,
        R`\sigma_f^2 \left(1 + \frac{\sqrt{3}\, r}{\ell}\right) \exp\!\left(-\frac{\sqrt{3}\, r}{\ell}\right)`,
        R`\sigma_f^2 \left(1 + \frac{\sqrt{5}\, r}{\ell} + \frac{5 r^2}{3 \ell^2}\right) \exp\!\left(-\frac{\sqrt{5}\, r}{\ell}\right)`,
        R`\sigma_f^2 \exp\!\left(-\frac{r^2}{2\ell^2}\right) = k_{\mathrm{RBF}}`,
      ];
      const formGlow = [
        [{ from: 3, to: 4, color: C.blue }],
        [{ from: 4, to: 5, color: C.orange }, { from: 7, color: C.orange }],
        [{ from: 4, to: 5, color: C.aqua }, { from: 7, color: C.aqua }],
        [{ from: 4, to: 5, color: C.text2 }],
      ];
      NU_CASES.forEach((c, i) => {
        const y = 378 + i * 86;
        const at = i < 3 ? 2 : 4;
        const delay = i < 3 ? 0.5 + i * 0.5 : 1.2;
        const label = i < 3 ? c.tex : R`\nu \to \infty`;
        ui.tex(label, { x: LEFT_X, y: y + 18, size: 28, color: c.color, at, delay });
        ui.tex(forms[i], { x: LEFT_X + 175, y, size: 28, at, delay, glow: formGlow[i] });
      });
      ui.text('← 指数カーネル', { x: LEFT_X + 450, y: 394, size: 22, color: C.blue, at: 3 });

      // 右: 計算例と、微分できる回数
      ui.card({ x: CARD_X, y: 150, w: CARD_W, h: 290, title: R`計算例（$\sigma_f^2 = 1,\ \ell = 1$）`, at: 5 });
      const distances = [0.5, 1, 2];
      ui.table({
        x: CARD_X + 16, y: 205, widths: [170, 100, 100, 100], size: 22, rowH: 42, at: 5,
        header: ['', '$r = 0.5$', '$r = 1$', '$r = 2$'],
        rows: NU_CASES.map((c) => [c.nu === Infinity ? R`RBF（$\nu = \infty$）` : `$${c.tex}$`, ...distances.map((r) => fmt(G.maternCorrelation(c.nu)(r), 3))]),
        rowDelay: 0.4,
        glowRows: { 0: [{ from: 5, to: 6, color: C.yellow }], 3: [{ from: 5, to: 6, color: C.yellow }] },
      });
      ui.card({ x: CARD_X, y: 465, w: CARD_W, h: 215, title: '微分できる回数（平均2乗の意味で）', at: 6 });
      ui.table({
        x: CARD_X + 16, y: 520, widths: [115, 115, 115, 125], size: 22, rowH: 42, at: 6,
        header: NU_CASES.map((c) => `$${c.tex}$`),
        rows: [['0 回', '1 回', '2 回', '何回でも']],
        rowDelay: 0.3,
      });
      ui.text(R`$m$ 回微分できる $\iff \nu > m$`, { x: CARD_X + 24, y: 618, size: 23, at: 6, delay: 0.8 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（Matérn）
  // 拡大する範囲（x = 2〜2.25。全体 0〜5 の 20 分の 1）。この範囲だけ細かい格子を足して、拡大しても線が角ばらないようにする
  const ZOOM_RANGE = [2, 2.25];
  const COARSE_STEP = 0.025;
  const FINE_STEP = 0.0025;
  // 対角に足す小さな値。ふつうの 1e-6（標準偏差 0.001 の揺れ）だと、拡大したときに
  // なめらかなはずの ν = 5/2 や RBF の線まで細かく揺れて見えるため、ここだけ小さくする
  const ZOOM_JITTER = 1e-10;

  SCENES.push({
    id: '2V-2',
    chapter: 2,
    kind: 'visual',
    title: R`$\nu$ を変えたときの形とサンプル`,
    beats: [
      beat(R`上から $\nu = 1/2,\ 3/2,\ 5/2,\ \infty$（RBF）。左がカーネルの形、右が事前分布からのサンプルです。乱数は4つとも同じです。`, 10),
      beat(R`左は $x - x'$ の関数として描いています。$\nu = 1/2$ は頂上がとがり、$\nu$ が大きいほど頂上が丸くなります。`, 10),
      beat(R`この違いが、サンプルのなめらかさに出ます。$\nu = 1/2$ はギザギザ、$\nu = 5/2$ と RBF はなめらかです。`, 9),
      beat(R`$x = 2$〜$2.25$ の狭い範囲を、拡大してみます。`, 7),
      beat(R`拡大しても、$\nu = 1/2$ はギザギザのままです。どこまで拡大しても、なめらかになりません。これが「微分できない」ということです。`, 11),
      beat(R`$\nu = 3/2$ 以上は、拡大するとなめらかな曲線になり、直線に近づきます。接線が引ける、つまり微分できるということです。`, 11),
      beat(R`もとの範囲に戻ります。$\nu$ は「どこまで細かく見ても、なめらかか」を決めるパラメータです。`, 9),
    ],
    build() {
      const coarse = G.linspace(0, 5, Math.round(5 / COARSE_STEP) + 1);
      const fine = G.linspace(ZOOM_RANGE[0], ZOOM_RANGE[1], Math.round((ZOOM_RANGE[1] - ZOOM_RANGE[0]) / FINE_STEP) + 1);
      // 重なる点は1つにまとめる（同じ点が2つあると行列が特異になる）
      const grid = [...new Map([...coarse, ...fine].map((x) => [x.toFixed(6), x])).values()].sort((a, b) => a - b);
      const z = G.standardNormals(grid.length, 2238);
      const lags = G.linspace(-3, 3, 241);
      const rows = NU_CASES.map((c, i) => {
        const kernel = G.matern({ nu: c.nu });
        const y = 165 + i * 148;
        const sample = G.sampleFunctions(grid, kernel, [z], ZOOM_JITTER)[0];
        const inWindow = sample.filter((_, j) => grid[j] >= ZOOM_RANGE[0] - 1e-9 && grid[j] <= ZOOM_RANGE[1] + 1e-9);
        const low = Math.min(...inWindow);
        const high = Math.max(...inWindow);
        const pad = Math.max(0.15 * (high - low), 0.01);
        return {
          ...c,
          shape: lags.map((d) => kernel(0, d)),
          sample,
          zoomY: [low - pad, high + pad],
          kPlot: new Plot({ x: 110, y, w: 330, h: 95, xr: [-3, 3], yr: [-0.05, 1.1] }),
          sBox: { x: 560, y, w: 940, h: 95 },
        };
      });
      return { rows, grid, lags, rbfShape: lags.map((d) => RBF_CORRELATION(d)) };
    },
    draw(ctx, s, st) {
      // 拡大: 幅は対数で補間する（一定の速さで寄っていくように見せる）
      const zoom = keyframes(s.u, [[s.bt(3) + 1.2, 0], [s.bt(3) + 4.2, 1], [s.bt(6) + 0.3, 1], [s.bt(6) + 2.8, 0]]);
      const center = 2.5 + (2.125 - 2.5) * zoom;
      const width = Math.exp(Math.log(5) + (Math.log(0.25) - Math.log(5)) * zoom);
      const xr = [center - width / 2, center + width / 2];
      const windowShade = s.win(3, 6) * (1 - zoom);

      st.rows.forEach((row, i) => {
        const appear = s.p(0, 0.8, i * 0.5);
        if (appear <= 0.001) return;
        ctx.save();
        ctx.globalAlpha = appear;
        const last = i === st.rows.length - 1;
        canvasText(ctx, row.label, row.kPlot.x, row.kPlot.y - 14, { ...TITLE, color: row.color });

        // 左: カーネルの形（x − x′ の関数。ν が有限の行には RBF を薄い点線で重ねる）
        const K = row.kPlot;
        K.axes(ctx, { xticks: last ? [-3, 0, 3] : [], yticks: [0, 1], xlabel: last ? 'x − x′' : undefined });
        if (row.nu !== Infinity) K.line(ctx, st.lags, st.rbfShape, { ...RBF_STYLE, width: 2, alpha: 0.45 * s.p(1, 0.8) });
        K.line(ctx, st.lags, row.shape, { color: row.color, width: 3, dash: row.dash });
        const peakGlow = s.win(1, 2);
        if (peakGlow > 0.001) {
          ctx.save();
          ctx.globalAlpha *= peakGlow;
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(K.sx(0), K.sy(1), 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 右: サンプル（拡大に合わせて x と y の範囲を動かす）
        const yr = [-2.8 + (row.zoomY[0] + 2.8) * zoom, 2.8 + (row.zoomY[1] - 2.8) * zoom];
        const P = new Plot({ ...row.sBox, xr, yr });
        const ticks = zoom < 0.5 ? [0, 1, 2, 3, 4, 5] : [2, 2.05, 2.1, 2.15, 2.2, 2.25];
        P.axes(ctx, {
          xticks: last ? ticks : [], yticks: zoom < 0.5 ? [-2, 0, 2] : [], xlabel: last ? 'x' : undefined,
          fmtX: (v) => fmt(v, zoom < 0.5 ? 0 : 2), alpha: 1 - Math.min(1, 4 * Math.min(zoom, 1 - zoom)),
        });
        if (windowShade > 0.001) P.shade(ctx, ZOOM_RANGE[0], ZOOM_RANGE[1], { color: C.yellow, alpha: 0.22 * windowShade });
        P.line(ctx, st.grid, row.sample, { color: row.color, width: 2.5, dash: row.dash, upto: s.p(0, 2.5, 0.4 + i * 0.5) });
        const focus = s.beat === 4 ? (i === 0 ? 1 : 0) : s.beat === 5 ? (i > 0 ? 1 : 0) : 0;
        if (focus > 0 && zoom > 0.9) {
          ctx.strokeStyle = rgba(C.yellow, 0.9);
          ctx.lineWidth = 2;
          ctx.strokeRect(P.x - 8, P.y - 8, P.w + 16, P.h + 16);
        }
        ctx.restore();
      });
      if (zoom > 0.02) {
        canvasText(ctx, `拡大中：x = ${fmt(xr[0], 2)}〜${fmt(xr[1], 2)}`, 1500, 140, { size: 20, color: C.yellow, align: 'right', weight: 700, alpha: Math.min(1, zoom * 3) });
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（スペクトル密度）
  // 右に描く「細かさの違う波」と「RBF の p(ω)」（カードの背景はキャンバスに描く。DOM のカードは不透明で、絵が隠れるため）
  const WAVE_CASES = [
    { omega: 0.5, label: 'ω = 0.5（ゆっくりした波）' },
    { omega: 2, label: 'ω = 2' },
    { omega: 6, label: 'ω = 6（細かい波）' },
  ];
  const SPECTRUM_EXAMPLES = [
    { lengthScale: 1, label: 'ℓ = 1', color: C.text },
    { lengthScale: 2, label: 'ℓ = 2（ゆっくりした波が中心）', color: C.orange },
  ];
  function drawPanel(ctx, x, y, w, h, title) {
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = '#3a3a37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    canvasText(ctx, title, x + 24, y + 38, { size: 21, color: C.text2, weight: 700 });
  }

  SCENES.push({
    id: '2T-S',
    chapter: 2,
    kind: 'theory',
    title: 'スペクトル密度 ― カーネルを波に分ける',
    beats: [
      beat(R`$\nu \to \infty$ で RBF になる理由を見る前に、「スペクトル密度」という道具を説明します。`, 7),
      beat(R`距離だけで決まるカーネル $k(r)$ は、いろいろな細かさの波 $\cos(\omega r)$ を、重み $p(\omega)$ で足し合わせて作れます。`, 10),
      beat(R`$\omega$ は波の細かさ（角周波数）です。$\omega$ が小さいとゆっくり、大きいと短い距離で細かく上下する波になります。`, 10),
      beat(R`$p(\omega)$ は「どの細かさの波を、どれだけ混ぜるか」の配分です。これをスペクトル密度と呼びます。`, 9),
      beat(R`$p(\omega)$ は 0 以上で、面積は 1。確率密度と同じ形なので「波の細かさの分布」と見られます（ボホナーの定理）。`, 11),
      beat(R`$r = 0$ ではどの波も $\cos 0 = 1$ なので $k(0) = \sigma_f^2$。$r$ が増えると波どうしが打ち消し合い、$k(r)$ は小さくなります。`, 11),
      beat(R`例：RBF の $p(\omega)$ は、平均 0・分散 $1/\ell^2$ の正規分布。$\ell$ が大きいほど、ゆっくりした波が中心になります。`, 10),
      beat('細かい波の重みが大きいほど関数はガタガタに、ゆっくりした波に集中するほど、なめらかになります。', 9),
    ],
    build(ui) {
      ui.text('カーネル ＝ いろいろな細かさの波の重ね合わせ', { x: LEFT_X, y: 128, size: 28, weight: 700, glow: [{ from: 0, to: 1, color: C.yellow }] });
      ui.tex(R`k(r) = \sigma_f^2 \int_{-\infty}^{\infty} \htmlClass{hlP}{p(\omega)}\, \htmlClass{hlW}{\cos(\omega r)}\, d\omega`, {
        x: LEFT_X, y: 192, size: 36, at: 1,
        hl: [{ cls: 'hlW', from: 1, to: 3, color: C.blue }, { cls: 'hlP', from: 3, to: 5, color: C.orange }],
      });
      ui.text(R`$\omega$：波の細かさ（角周波数）。大きいほど細かい`, { x: LEFT_X + 30, y: 305, size: 24, color: C.text2, at: 2 });
      ui.text(R`$p(\omega)$：スペクトル密度（どの細かさの波を、どれだけ混ぜるか）`, { x: LEFT_X + 30, y: 347, size: 24, color: C.text2, at: 3 });
      ui.tex(R`p(\omega) \ge 0,\qquad \int_{-\infty}^{\infty} p(\omega)\, d\omega = 1`, { x: LEFT_X, y: 405, size: 28, at: 4 });
      ui.text('（ボホナーの定理）', { x: LEFT_X + 470, y: 425, size: 22, color: C.text2, at: 4, delay: 0.5 });
      ui.tex(R`k(0) = \sigma_f^2 \int p(\omega)\cdot 1\, d\omega = \sigma_f^2`, { x: LEFT_X, y: 500, size: 28, at: 5 });
      ui.tex(R`p_{\mathrm{RBF}}(\omega) = \frac{\ell}{\sqrt{2\pi}} \exp\!\left(-\frac{\ell^2 \omega^2}{2}\right)`, { x: LEFT_X, y: 580, size: 28, at: 6 });
      ui.text(R`正規分布（分散 $1/\ell^2$）`, { x: LEFT_X + 470, y: 598, size: 22, color: C.text2, at: 6, delay: 0.5 });
      ui.text('細かい波が多い → ガタガタ ／ ゆっくりした波だけ → なめらか', { x: LEFT_X, y: 680, size: 25, weight: 700, at: 7, glow: [{ from: 7, color: C.yellow }] });
      return {
        rs: G.linspace(0, 6, 241),
        omegas: G.linspace(0, 4, 161),
        wavePlots: WAVE_CASES.map((_, i) => new Plot({ x: CARD_X + 40, y: 222 + i * 74, w: 420, h: 48, xr: [0, 6], yr: [-1.15, 1.15] })),
        spectrumPlot: new Plot({ x: CARD_X + 60, y: 512, w: 400, h: 135, xr: [0, 4], yr: [0, 0.85] }),
      };
    },
    draw(ctx, s, st) {
      const waves = s.win(2);
      if (waves > 0.001) {
        ctx.save();
        ctx.globalAlpha = waves;
        drawPanel(ctx, CARD_X, 140, CARD_W, 300, '細かさの違う波 cos(ωr)');
        WAVE_CASES.forEach((w, i) => {
          const P = st.wavePlots[i];
          canvasText(ctx, w.label, P.x, P.y - 6, { size: 17, color: C.text2 });
          P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
          P.line(ctx, st.rs, st.rs.map((r) => Math.cos(w.omega * r)), { color: C.blue, width: 2.5, upto: s.p(2, 1.2, 0.3 + i * 0.4) });
        });
        canvasText(ctx, 'r →', CARD_X + CARD_W - 30, 432, { size: 17, color: C.muted, align: 'right' });
        ctx.restore();
      }
      const spectrum = s.win(6);
      if (spectrum > 0.001) {
        ctx.save();
        ctx.globalAlpha = spectrum;
        drawPanel(ctx, CARD_X, 462, CARD_W, 240, 'RBF の p(ω)');
        const P = st.spectrumPlot;
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [], xlabel: 'ω' });
        SPECTRUM_EXAMPLES.forEach((e, i) => {
          const p = G.maternSpectralDensity({ nu: Infinity, lengthScale: e.lengthScale });
          P.line(ctx, st.omegas, st.omegas.map(p), { color: e.color, width: 3, upto: s.p(6, 1.2, 0.4 + i * 0.6) });
        });
        SPECTRUM_EXAMPLES.forEach((e, i) => legend(ctx, [{ label: e.label, color: e.color }], CARD_X + 210, 548 + i * 30, { size: 16 }));
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（波を足してカーネルを作る）
  // k_Ω(r) = σ_f² ∫_{−Ω}^{Ω} p(ω) cos(ωr) dω（Ω まで足した途中の形）を、先に Ω ごとに積分しておく
  const PARTIAL_OMEGA_MAX = 40;
  const PARTIAL_OMEGA_STEP = 0.01;
  const PARTIAL_R = G.linspace(0, 3, 121);
  function cumulativeKernel(spectrum) {
    const omegas = G.linspace(0, PARTIAL_OMEGA_MAX, Math.round(PARTIAL_OMEGA_MAX / PARTIAL_OMEGA_STEP) + 1);
    return PARTIAL_R.map((r) => {
      const cumulative = new Float64Array(omegas.length);
      let previous = spectrum(0);
      for (let j = 1; j < omegas.length; j++) {
        const current = spectrum(omegas[j]) * Math.cos(omegas[j] * r);
        // 左右対称なので 0〜Ω を2倍する（台形則）
        cumulative[j] = cumulative[j - 1] + PARTIAL_OMEGA_STEP * (previous + current);
        previous = current;
      }
      return cumulative;
    });
  }
  // r ∈ [−3, 3] の形（r ≥ 0 の値を左右に折り返す）
  function partialKernel(cumulative, omegaMax) {
    const position = Math.min(omegaMax, PARTIAL_OMEGA_MAX) / PARTIAL_OMEGA_STEP;
    const j = Math.floor(position);
    const frac = position - j;
    const half = cumulative.map((c) => (j + 1 < c.length ? c[j] + frac * (c[j + 1] - c[j]) : c[c.length - 1]));
    return [...half.slice(1).reverse(), ...half];
  }
  const SYMMETRIC_R = [...PARTIAL_R.slice(1).reverse().map((r) => -r), ...PARTIAL_R];
  const ROUGH_COLOR = C.blue;

  SCENES.push({
    id: '2V-S',
    chapter: 2,
    kind: 'visual',
    title: '波を足して、カーネルを作る',
    beats: [
      beat(R`RBF（$\ell = 1$）のスペクトル密度 $p(\omega)$ です。横軸 $\omega$ が波の細かさ、高さがその波の重みです。`, 9),
      beat(R`下は、いま足している波 $\cos(\omega r)$。$\omega$ が小さいとゆっくり、大きいと細かく揺れます。`, 9),
      beat(R`$\omega$ の小さい方から、重みを掛けた波を足していきます。塗った範囲までを足したものが、右の線です。`, 10),
      beat('ゆっくりした波だけでは、幅の広い山です。細かい波まで足すと、RBF の形にぴったり重なります。', 10),
      beat(R`$r = 0$ では、どの波も 1。足した高さは塗った面積の合計で、全部足すと 1 になります。`, 9),
      beat(R`次に、裾の重い $p(\omega)$（Matérn、$\nu = 1/2$）に替えます。細かい波の重みが、遠くまで残っています。`, 10),
      beat(R`細かい波をどんどん足しても、とがった頂上を作るには、さらに細かい波が必要です。これがガタガタしたサンプルの正体です。`, 11),
      beat('スペクトル密度は「波の細かさの配分」。裾が軽いほどなめらか、重いほどガタガタな関数になります。', 9),
    ],
    build() {
      const rbfSpectrum = G.maternSpectralDensity({ nu: Infinity });
      const roughSpectrum = G.maternSpectralDensity({ nu: 0.5 });
      const omegas = G.linspace(0, 8, 321);
      return {
        omegas,
        rbfDensity: omegas.map(rbfSpectrum),
        roughDensity: omegas.map(roughSpectrum),
        rbfCumulative: cumulativeKernel(rbfSpectrum),
        roughCumulative: cumulativeKernel(roughSpectrum),
        rbfShape: SYMMETRIC_R.map((r) => RBF_CORRELATION(Math.abs(r))),
        roughShape: SYMMETRIC_R.map((r) => Math.exp(-Math.abs(r))),
        pPlot: new Plot({ x: 110, y: 190, w: 620, h: 220, xr: [0, 8], yr: [0, 0.45] }),
        wPlot: new Plot({ x: 110, y: 540, w: 620, h: 160, xr: [-3, 3], yr: [-1.2, 1.2] }),
        kPlot: new Plot({ x: 880, y: 190, w: 620, h: 510, xr: [-3, 3], yr: [-0.25, 1.1] }),
      };
    },
    draw(ctx, s, st) {
      // Ω: 足した範囲。前半は RBF を 0 → 4、後半は ν = 1/2 を 1 → 40（対数で）
      const omegaRbf = keyframes(s.u, [[s.bt(2) + 0.5, 0.02], [s.bt(2) + 4, 0.8], [s.bt(3) + 0.5, 0.8], [s.bt(3) + 4, 4]]);
      const omegaRough = keyframes(s.u, [[s.bt(5) + 1.5, 1], [s.bt(6) + 0.5, 3], [s.bt(6) + 6.5, PARTIAL_OMEGA_MAX]], { log: true });
      const mix = s.p(5, 1.5);
      const omegaMax = mix < 0.5 ? omegaRbf : omegaRough;
      const sumShown = s.p(2, 0.6, 0.3);
      const appear = s.p(0, 0.8);
      ctx.globalAlpha = appear;

      // 左上: p(ω)。Ω まで塗る
      const P = st.pPlot;
      const density = st.rbfDensity.map((v, i) => v + mix * (st.roughDensity[i] - v));
      canvasText(ctx, `スペクトル密度 p(ω)：${mix < 0.5 ? 'RBF（ℓ = 1）' : 'Matérn（ν = 1/2）'}`, P.x, P.y - 46, TITLE);
      P.axes(ctx, { xticks: [0, 2, 4, 6, 8], yticks: [0, 0.2, 0.4], xlabel: 'ω（波の細かさ）', fmtY: (v) => fmt(v, 1) });
      if (sumShown > 0.001) {
        const upto = Math.min(omegaMax, 8);
        const xs = st.omegas.filter((w) => w <= upto);
        P.band(ctx, xs, xs.map(() => 0), xs.map((_, i) => density[i]), { color: C.yellow, alpha: 0.35 * sumShown });
        const label = omegaMax > 8 ? `ω ≤ ${fmt(omegaMax, 0)} まで足した` : `ω ≤ ${fmt(omegaMax, 2)} まで足した`;
        canvasText(ctx, label, P.x + P.w, P.y - 16, { size: 19, color: C.yellow, align: 'right', weight: 600, alpha: sumShown });
      }
      P.line(ctx, st.omegas, density, { color: mix < 0.5 ? C.text : ROUGH_COLOR, width: 3 });
      if (s.win(5, 7) > 0.001) {
        P.shade(ctx, 4, 8, { color: C.yellow, alpha: 0.1 * s.win(5, 7) });
        canvasText(ctx, '裾（細かい波）が残る', P.sx(6), P.y + 26, { size: 18, color: C.yellow, align: 'center', alpha: s.win(5, 7) });
      }

      // 左下: いま足している波 cos(ωr)
      const waveOmega = s.beat === 1 ? keyframes(s.u, [[s.bt(1) + 0.5, 0.5], [s.bt(1) + 5, 6]], { log: true }) : Math.max(omegaMax, 0.3);
      const W = st.wPlot;
      const wave = s.p(1, 0.6);
      if (wave > 0.001) {
        ctx.save();
        ctx.globalAlpha *= wave;
        canvasText(ctx, `いま足している波 cos(ωr)（ω = ${fmt(waveOmega, waveOmega < 10 ? 1 : 0)}）`, W.x, W.y - 30, TITLE);
        W.axes(ctx, { xticks: [-3, 0, 3], yticks: [-1, 0, 1], xlabel: 'r' });
        const rs = G.linspace(-3, 3, 1201);
        W.line(ctx, rs, rs.map((r) => Math.cos(waveOmega * r)), { color: C.blue, width: 2.5 });
        ctx.restore();
      }

      // 右: 足した結果 k_Ω(r) と、全部足した形
      const K = st.kPlot;
      canvasText(ctx, '波を足した結果 k(r)', K.x, K.y - 46, TITLE);
      K.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 0.5, 1], xlabel: 'r', fmtY: (v) => fmt(v, 1) });
      K.line(ctx, SYMMETRIC_R, st.rbfShape, { ...RBF_STYLE, width: 2.5, alpha: 1 - mix });
      K.line(ctx, SYMMETRIC_R, st.roughShape, { color: ROUGH_COLOR, width: 2.5, dash: [10, 7], alpha: mix });
      if (sumShown > 0.001) {
        const rbfPart = partialKernel(st.rbfCumulative, omegaMax);
        const roughPart = partialKernel(st.roughCumulative, omegaMax);
        const partial = mix < 0.5 ? rbfPart : roughPart;
        K.line(ctx, SYMMETRIC_R, partial, { color: C.yellow, width: 3.5, alpha: sumShown * (1 - 2 * Math.min(mix, 1 - mix)) });
        const peak = partial[PARTIAL_R.length - 1];
        const peakGlow = s.win(4, 5);
        if (peakGlow > 0.001) {
          K.dots(ctx, [0], [peak], { color: C.yellow, r: 8, alpha: peakGlow });
          K.label(ctx, `k(0) = 塗った面積 = ${fmt(peak, 3)}`, 0, peak, { dx: 16, dy: -12, size: 19, color: C.yellow, weight: 600, alpha: peakGlow });
        }
        if (mix > 0.5) {
          const gap = s.win(6);
          K.label(ctx, `頂上 ${fmt(peak, 3)}（全部足すと 1）`, 0, peak, { dx: 16, dy: -12, size: 19, color: C.yellow, weight: 600, alpha: gap });
        }
      }
      legend(ctx, [
        { label: '足した結果', color: C.yellow },
        mix < 0.5 ? { label: 'RBF（全部足した形）', ...RBF_STYLE } : { label: '指数カーネル（ν = 1/2）', color: ROUGH_COLOR, dash: [10, 7] },
      ], K.x + 260, K.y - 48);
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（ν → ∞）
  const DIFF_CASES = [0.5, 1.5, 2.5, 3.5, 10, 100];

  SCENES.push({
    id: '2T-3',
    chapter: 2,
    kind: 'theory',
    title: R`$\nu \to \infty$ で RBF になる理由`,
    beats: [
      beat(R`$\nu$ を大きくすると、Matérn カーネルは RBF カーネルに近づき、$\nu \to \infty$ の極限で一致します（$\ell$ は同じまま）。`, 10),
      beat(R`前の図解で見たとおり、距離だけで決まるカーネルは、波 $\cos(\omega r)$ を重み $p(\omega)$（スペクトル密度）で平均したものです。`, 11),
      beat(R`$p(\omega)$ は面積 1 の確率密度の形です（ボホナーの定理）。2つのカーネルを比べるには、$p(\omega)$ を比べればよいわけです。`, 11),
      beat(R`RBF の $p(\omega)$ は正規分布、Matérn の $p(\omega)$ は自由度 $2\nu$ の t 分布です。`, 8),
      beat(R`t 分布は、自由度を無限大にすると正規分布になります。$(1 + a/\nu)^{-\nu} \to e^{-a}$ を使うと、式でも確かめられます。`, 11),
      beat(R`重み $p(\omega)$ が一致するので、それで平均したカーネルも一致します。これが「$\nu \to \infty$ で RBF」の理由です。`, 10),
      beat(R`有限の $\nu$ では t 分布の裾が重く、細かい波が残ります。$m$ 回微分できるのは、$\omega^{2m}$ の平均が有限な $\nu > m$ のときだけです。`, 12),
      beat(R`RBF との差の最大値は、$\nu = 1/2$ で 0.288、5/2 で 0.084、10 で 0.023、100 で 0.002。ほぼ $0.23/\nu$ の速さで小さくなります。`, 12),
      beat(R`実務上は、$\nu \ge 7/2$ になると、RBF とほとんど同じになります。`, 8),
    ],
    build(ui) {
      // 最初の字幕では結論だけを見せる（同じ場所に、次の字幕から波の重ね合わせの式が出る）
      ui.tex(R`\lim_{\nu \to \infty} k_{\nu}(r) = \sigma_f^2 \exp\!\left(-\frac{r^2}{2\ell^2}\right) = k_{\mathrm{RBF}}(r)`, {
        x: LEFT_X, y: 150, size: 40, until: 1, glow: [{ from: 0, color: C.yellow }],
      });
      ui.tex(R`k(r) = \sigma_f^2 \int_{-\infty}^{\infty} \htmlClass{hlP}{p(\omega)}\, \htmlClass{hlW}{\cos(\omega r)}\, d\omega`, {
        x: LEFT_X, y: 140, size: 38, at: 1,
        hl: [{ cls: 'hlW', from: 1, to: 2, color: C.blue }, { cls: 'hlP', from: 1, to: 3, color: C.orange }],
      });
      ui.text(R`$\omega$：波の細かさ（角周波数）　$p(\omega)$：スペクトル密度（面積 1）`, { x: LEFT_X + 30, y: 242, size: 24, color: C.text2, at: 2 });
      ui.tex(R`\text{RBF：}\ \ p(\omega) \propto \exp\!\left(-\frac{\ell^2 \omega^2}{2}\right)`, { x: LEFT_X, y: 300, size: 32, at: 3 });
      ui.text('正規分布（分散 1/ℓ²）', { x: LEFT_X + 560, y: 314, size: 22, color: C.text2, at: 3 });
      ui.tex(R`\text{Matérn：}\ \ p_{\nu}(\omega) \propto \left(1 + \frac{\ell^2 \omega^2}{2\nu}\right)^{-(\nu + \frac{1}{2})}`, { x: LEFT_X, y: 386, size: 32, at: 3, delay: 0.8 });
      ui.text(R`自由度 $2\nu$ の t 分布`, { x: LEFT_X + 560, y: 404, size: 22, color: C.text2, at: 3, delay: 0.8 });
      ui.tex(R`\left(1 + \frac{\ell^2 \omega^2}{2\nu}\right)^{-(\nu + \frac{1}{2})} = \underbrace{\left(1 + \frac{a}{\nu}\right)^{-\nu}}_{\to\ e^{-a}}\ \underbrace{\left(1 + \frac{a}{\nu}\right)^{-\frac{1}{2}}}_{\to\ 1} \xrightarrow{\ \nu \to \infty\ } \exp\!\left(-\frac{\ell^2 \omega^2}{2}\right)`, {
        x: LEFT_X, y: 492, size: 29, at: 4,
      });
      ui.text(R`$a = \ell^2 \omega^2 / 2$　（$(1 + a/n)^{n} \to e^{a}$ と同じ形）`, { x: LEFT_X + 30, y: 610, size: 22, color: C.text2, at: 4, delay: 0.6 });
      ui.text(R`よって $p_\nu(\omega) \to p_{\mathrm{RBF}}(\omega)$、$k_\nu(r) \to k_{\mathrm{RBF}}(r)$`, {
        x: LEFT_X, y: 664, size: 27, at: 5, glow: [{ from: 5, to: 6, color: C.yellow }],
      });

      // 右: 裾の重さと微分の回数 → RBF との差の表
      ui.card({ x: CARD_X, y: 140, w: CARD_W, h: 205, title: '裾の重さと、微分できる回数', at: 6 });
      ui.text(R`t 分布の裾：$p_\nu(\omega) \propto |\omega|^{-(2\nu + 1)}$`, { x: CARD_X + 24, y: 198, size: 22, at: 6, delay: 0.3 });
      ui.text(R`$\omega^{2m}$ の平均が有限 $\iff 2m < 2\nu$`, { x: CARD_X + 24, y: 244, size: 22, at: 6, delay: 0.9 });
      ui.text(R`$\iff$ $m$ 回微分できる（$\nu > m$）`, { x: CARD_X + 24, y: 290, size: 22, at: 6, delay: 1.5 });

      ui.card({ x: CARD_X, y: 362, w: CARD_W, h: 376, title: R`RBF との差　$\max_r |k_\nu(r) - k_{\mathrm{RBF}}(r)|$`, at: 7 });
      ui.table({
        x: CARD_X + 24, y: 416, widths: [130, 150, 150], size: 22, rowH: 42, at: 7,
        header: ['$\\nu$', '差の最大値', R`$\nu \times$ 差`],
        rows: DIFF_CASES.map((nu) => {
          const diff = maxDiffFromRbf(nu);
          return [nuText(nu), fmt(diff, 3), fmt(nu * diff, 3)];
        }),
        rowDelay: 0.4,
        glowRows: { 3: [{ from: 8, color: C.yellow }], 4: [{ from: 8, color: C.yellow }], 5: [{ from: 8, color: C.yellow }] },
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（ν → ∞）
  SCENES.push({
    id: '2V-3',
    chapter: 2,
    kind: 'visual',
    title: R`$\nu$ を $\infty$ に近づける`,
    beats: [
      beat(R`左上はカーネルの形、右上はスペクトル密度（縦は対数）、下はサンプルです。白い点線が RBF（$\nu = \infty$）、紫が Matérn です。`, 11),
      beat(R`$\nu = 1/2$ では、カーネルの頂上がとがり、スペクトルの裾が高い周波数まで残っています。サンプルはギザギザです。`, 10),
      beat(R`$\nu$ を 3/2、5/2 と大きくすると、裾が下がって細かい波が減り、サンプルがなめらかになります。`, 10),
      beat(R`$\nu = 10$ では、カーネルの差は最大でも 0.023。サンプルも RBF のものとほぼ重なります。`, 9),
      beat(R`$\nu = 100$ では差は 0.002。スペクトルも正規分布の形にそろい、見分けがつきません。`, 9),
      beat(R`RBF は「$\nu = \infty$ の Matérn」です。なめらかすぎる仮定が合わないときは、有限の $\nu$ を選びます。`, 9),
    ],
    build() {
      const grid = G.linspace(0, 5, 101);
      const z = G.standardNormals(grid.length, 2307);
      const lags = G.linspace(-3, 3, 241);
      const omegas = G.linspace(0, 8, 241);
      const rbfSpectrum = G.maternSpectralDensity({ nu: Infinity });
      return {
        grid, z, lags, omegas,
        rbfShape: lags.map((d) => RBF_CORRELATION(d)),
        rbfLogSpectrum: omegas.map((w) => Math.log10(rbfSpectrum(w))),
        rbfSample: sampleOnUniformGrid(grid, RBF_CORRELATION, z),
        kPlot: new Plot({ x: 110, y: 185, w: 600, h: 220, xr: [-3, 3], yr: [-0.05, 1.1] }),
        pPlot: new Plot({ x: 880, y: 185, w: 620, h: 220, xr: [0, 8], yr: [-10, 0] }),
        sPlot: new Plot({ x: 110, y: 535, w: 1390, h: 175, xr: [0, 5], yr: [-2.8, 2.8] }),
        cache: {},
      };
    },
    draw(ctx, s, st) {
      const nu = keyframes(
        s.u,
        [[s.bt(2) + 0.8, 0.5], [s.bt(2) + 2.8, 1.5], [s.bt(2) + 4.3, 1.5], [s.bt(2) + 6.3, 2.5], [s.bt(3) + 0.6, 2.5], [s.bt(3) + 3.6, 10], [s.bt(4) + 0.6, 10], [s.bt(4) + 3.6, 100]],
        { log: true },
      );
      // 同じ ν を何度も描くとき（止まっている間）は計算し直さない
      if (st.cache.nu !== nu) {
        const correlation = G.maternCorrelation(nu);
        const spectrum = G.maternSpectralDensity({ nu });
        st.cache = {
          nu,
          shape: st.lags.map((d) => correlation(Math.abs(d))),
          logSpectrum: st.omegas.map((w) => Math.log10(spectrum(w))),
          sample: sampleOnUniformGrid(st.grid, correlation, st.z),
        };
        st.cache.maxDiff = Math.max(...st.cache.shape.map((v, i) => Math.abs(v - st.rbfShape[i])));
      }
      const cur = st.cache;
      const appear = s.p(0, 0.8);
      ctx.globalAlpha = appear;

      // 左上: カーネルの形と、RBF との差（塗り）
      const K = st.kPlot;
      canvasText(ctx, 'カーネルの形（横軸は x − x′）', K.x, K.y - 46, TITLE);
      K.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 0.5, 1], xlabel: 'x − x′', fmtY: (v) => fmt(v, 1) });
      K.band(ctx, st.lags, cur.shape.map((v, i) => Math.min(v, st.rbfShape[i])), cur.shape.map((v, i) => Math.max(v, st.rbfShape[i])), { color: C.yellow, alpha: 0.3 });
      K.line(ctx, st.lags, st.rbfShape, { ...RBF_STYLE, width: 2.5 });
      K.line(ctx, st.lags, cur.shape, { color: MOVING_COLOR, width: 3 });
      canvasText(ctx, `RBF との差の最大値 ${fmt(cur.maxDiff, 3)}`, K.x + K.w, K.y - 16, { size: 19, color: C.yellow, align: 'right', weight: 600 });

      // 右上: スペクトル密度（log10）
      const P = st.pPlot;
      canvasText(ctx, 'スペクトル密度 p(ω)（縦は対数）', P.x, P.y - 46, TITLE);
      P.axes(ctx, { xticks: [0, 2, 4, 6, 8], yticks: [-10, -5, 0], xlabel: 'ω（波の細かさ）', fmtY: (v) => (v === 0 ? '1' : `10${superscript(v)}`), zero: false });
      P.line(ctx, st.omegas, st.rbfLogSpectrum, { ...RBF_STYLE, width: 2.5 });
      P.line(ctx, st.omegas, cur.logSpectrum, { color: MOVING_COLOR, width: 3 });
      const tailGlow = s.win(1, 3);
      if (tailGlow > 0.001) P.shade(ctx, 4, 8, { color: C.yellow, alpha: 0.12 * tailGlow });
      if (tailGlow > 0.001) canvasText(ctx, '裾（細かい波）', P.sx(6), P.y + 24, { size: 18, color: C.yellow, align: 'center', alpha: tailGlow });

      // 下: サンプル（同じ乱数）
      const S = st.sPlot;
      canvasText(ctx, '事前分布からのサンプル（同じ乱数、ℓ = 1）', S.x, S.y - 40, TITLE);
      S.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-2, 0, 2], xlabel: 'x' });
      S.line(ctx, st.grid, st.rbfSample, { ...RBF_STYLE, width: 2.5 });
      S.line(ctx, st.grid, cur.sample, { color: MOVING_COLOR, width: 3 });
      legend(ctx, [{ label: 'Matérn（ν を動かす）', color: MOVING_COLOR }, { label: 'RBF（ν = ∞）', ...RBF_STYLE }], S.x + 520, S.y - 46);

      // ν の表示（大きく）
      canvasText(ctx, `ν = ${nuText(nu)}`, 1500, 140, { size: 34, color: MOVING_COLOR, align: 'right', weight: 800 });
    },
  });
})();
