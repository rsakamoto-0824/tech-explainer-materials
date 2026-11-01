// scenes-kernel.js — 発展編の場面（第5〜8章と第10〜11章: 組み合わせ規則、周期カーネル、加法カーネル、積カーネル、まとめ）。
// 第9章（質的変数）は scenes-categorical.js。並び順は engine.js が章の番号でそろえる。
// 書き方は scenes-basic.js と同じ。表や字幕に出す数値は、ここで実際に計算した値を使う。
(() => {
  const { W, C, SERIES, Plot, fmt, texNum, canvasText, legend, seqColor, divColor, heatmapCanvas, drawImage, drawMatrixHeat, colorBar, keyframes, ramp, lerp, clamp, rgba } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const TITLE = { size: 21, color: C.text, weight: 700 };

  // 発展編で共通に使うカーネル（周期 p = 1）と、第7章の例のデータ（example-data.js。想定質問の動画と共通）
  const { PERIOD, TREND_KERNEL, SEASON_KERNEL, ADDITIVE_KERNEL, trendTruth, seasonTruth, DECOMP_X, DECOMP_Y, DECOMP_NOISE_VARIANCE, DECOMP_MODEL } = EXAMPLE_DATA.decomposition;
  const UNIT_PERIODIC = G.periodic({ variance: 1, lengthScale: 1, period: PERIOD });
  const UNIT_RBF = G.rbf({ variance: 1, lengthScale: 1 });

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: 'カーネルは足せる・掛けられる',
    beats: [
      beat('ここから発展編です。カーネルは、組み合わせて新しいカーネルを作れます。'),
      beat('正定値のカーネルどうしの和と積は、やはり正定値で、カーネルとして使えます。'),
      beat('和は「独立な2つの関数の足し算」に対応します。共分散が足し算になるからです。'),
      beat('直感的には、和は「どちらかの見方で似ていれば似ている」、積は「両方の見方で似ているときだけ似ている」です。', 11),
      beat('行列で見ると、和は要素ごとの足し算、積は要素ごとの掛け算（アダマール積）です。'),
      beat('この規則を使って、周期カーネルと加法カーネルを具体的に計算していきます。', 6),
    ],
    build(ui) {
      ui.text(R`$k_1,\ k_2$ がカーネル（正定値）なら`, { x: LEFT_X, y: 130, size: 26, color: C.text2 });
      ui.tex(R`k_1 + k_2,\qquad k_1\,k_2,\qquad c\,k_1\ \ (c > 0)\quad \text{もカーネル}`, { x: LEFT_X, y: 180, size: 42, at: 1 });
      ui.tex(R`f = f_1 + f_2,\ \ f_1 \perp f_2\quad\Longrightarrow\quad \operatorname{Cov}\big(f(x), f(x')\big) = k_1(x,x') + k_2(x,x')`, { x: LEFT_X, y: 285, size: 34, at: 2 });
      ui.card({ x: LEFT_X, y: 380, w: 660, h: 200, title: R`和 $\ k_1 + k_2$`, at: 3, accent: C.aqua });
      ui.text('どちらかの見方で似ていれば、似ている（OR）', { x: LEFT_X + 30, y: 440, size: 26, at: 3, delay: 0.3 });
      ui.text('例：トレンド ＋ 季節変動、入力ごとの効果の足し算', { x: LEFT_X + 30, y: 500, size: 23, color: C.text2, at: 3, delay: 0.6 });
      ui.card({ x: LEFT_X + 700, y: 380, w: 660, h: 200, title: R`積 $\ k_1\, k_2$`, at: 3, delay: 1.5, accent: C.violet });
      ui.text('両方の見方で似ているときだけ、似ている（AND）', { x: LEFT_X + 730, y: 440, size: 26, at: 3, delay: 1.8 });
      ui.text('例：季節の形がゆっくり変わる、入力の交互作用', { x: LEFT_X + 730, y: 500, size: 23, color: C.text2, at: 3, delay: 2.1 });
      ui.tex(R`K = K_1 + K_2\ \ (\text{要素ごとの和}),\qquad K = K_1 \odot K_2\ \ (\text{要素ごとの積})`, { x: LEFT_X, y: 625, size: 34, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'カーネルの形と、そこから生まれる関数',
    beats: [
      beat(R`上の段がカーネルの形 $k(0, x')$、下の段がそのカーネルから引いた関数のサンプルです。`),
      beat('RBF はなめらかなだけ。周期カーネルは、一定の間隔ごとに相関が 1 に戻ります。'),
      beat('和：周期的な揺れに、ゆっくりした変化が足されます（季節変動 ＋ トレンド）。'),
      beat('積：近い周期どうしだけが似ているので、くり返しの形が少しずつ変わります（局所周期）。', 9),
    ],
    build() {
      const kernels = [
        { title: 'RBF（ℓ = 1）', k: UNIT_RBF, color: C.blue, focus: [1] },
        { title: '周期（p = 1, ℓ = 1）', k: UNIT_PERIODIC, color: C.orange, focus: [1] },
        { title: '和：RBF（ℓ = 3）＋ 周期', k: ADDITIVE_KERNEL, color: C.aqua, focus: [2] },
        { title: '積：RBF（ℓ = 3）× 周期', k: G.product(TREND_KERNEL, UNIT_PERIODIC), color: C.violet, focus: [3] },
      ];
      const lags = G.linspace(-3, 3, 241);
      const grid = G.linspace(0, 6, 240);
      const normals = [G.standardNormals(grid.length, 551)];
      kernels.forEach((item, i) => {
        item.shape = lags.map((v) => item.k(0, v));
        item.sample = G.sampleFunctions(grid, item.k, normals)[0];
        const x = 100 + i * 360;
        item.top = new Plot({ x, y: 200, w: 310, h: 170, xr: [-3, 3], yr: [-0.05, 1.6] });
        item.bottom = new Plot({ x, y: 470, w: 310, h: 210, xr: [0, 6], yr: [-3, 3] });
      });
      return { kernels, lags, grid };
    },
    draw(ctx, s, st) {
      st.kernels.forEach((item, i) => {
        const appear = s.p(0, 0.8, 0.3 + i * 0.5);
        const focus = s.beat <= 0 ? 1 : item.focus.includes(s.beat) ? 1 : 0.32;
        ctx.save();
        ctx.globalAlpha = appear * focus;
        canvasText(ctx, item.title, item.top.x, item.top.y - 48, TITLE);
        item.top.axes(ctx, { xticks: [-3, 0, 3], yticks: [0, 1], xlabel: "x′", ylabel: 'k(0, x′)' });
        item.top.line(ctx, st.lags, item.shape, { color: item.color, width: 3 });
        item.bottom.axes(ctx, { xticks: [0, 2, 4, 6], yticks: [-2, 0, 2], xlabel: 'x', ylabel: 'サンプル f(x)' });
        item.bottom.line(ctx, st.grid, item.sample, { color: item.color, width: 2.5, upto: s.p(0, 2, 1 + i * 0.5) });
        ctx.restore();
      });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（導出）
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '周期カーネル ― 円に写してから RBF',
    beats: [
      beat(R`周期カーネルの式です。$p$ が周期、$\ell$ が1周期の中での長さスケールです。`),
      beat(R`この式は、$x$ を円周上の点 $\mathbf{u}(x)$ に写してから RBF を計算したものです。$x$ が $p$ 進むと円を1周します。`, 11),
      beat(R`円の上の2点の距離（弦の長さ）の2乗は、三角関数の公式で $4\sin^2(\pi r/p)$ になります。`, 9),
      beat('これを RBF の式に入れると、周期カーネルの式がそのまま出てきます。'),
      beat(R`$r$ が周期 $p$ の整数倍のとき $\sin$ が 0 になり、$k$ は最大値 $\sigma_f^2$ に戻ります。1周期ずれた点は同じ値を取ります。`, 11),
    ],
    build(ui) {
      ui.tex(R`k_{\mathrm{Per}}(x,x') = \sigma_f^2 \exp\!\left(-\frac{2\sin^2\!\big(\pi\,|x-x'|\,/\,\htmlClass{hlP}{p}\big)}{\htmlClass{hlE}{\ell}^{2}}\right)`, {
        x: LEFT_X, y: 125, size: 44,
        hl: [{ cls: 'hlP', from: 0, to: 1, color: C.orange }, { cls: 'hlE', from: 0, to: 1, color: C.blue }],
      });
      ui.text(R`$p$：周期　　$\ell$：1周期の中での長さスケール　　$r = |x - x'|$`, { x: LEFT_X + 30, y: 250, size: 25, color: C.text2 });
      ui.tex(R`\mathbf{u}(x) = \Big(\cos\frac{2\pi x}{p},\ \sin\frac{2\pi x}{p}\Big)`, { x: LEFT_X, y: 315, size: 38, at: 1 });
      ui.tex(R`\|\mathbf{u}(x)-\mathbf{u}(x')\|^2 = 2 - 2\cos\frac{2\pi r}{p} = \htmlClass{hlC}{4\sin^2\frac{\pi r}{p}}`, {
        x: LEFT_X, y: 410, size: 38, at: 2, hl: [{ cls: 'hlC', from: 2, to: 4, color: C.yellow }],
      });
      ui.tex(R`\exp\!\left(-\frac{\|\mathbf{u}-\mathbf{u}'\|^2}{2\ell^2}\right) = \exp\!\left(-\frac{\htmlClass{hlC2}{4\sin^2(\pi r/p)}}{2\ell^2}\right) = \exp\!\left(-\frac{2\sin^2(\pi r/p)}{\ell^2}\right)`, {
        x: LEFT_X, y: 510, size: 36, at: 3, hl: [{ cls: 'hlC2', from: 3, to: 4, color: C.yellow }],
      });
      ui.tex(R`r = p,\ 2p,\ \dots\ \ \Longrightarrow\ \ \sin\frac{\pi r}{p} = 0\ \ \Longrightarrow\ \ k = \sigma_f^2`, {
        x: LEFT_X, y: 640, size: 36, at: 4, glow: [{ from: 4, color: C.yellow }],
      });
    },
    // 右上に、円と弦の小さな図（式の意味を見せる）
    draw(ctx, s) {
      const show = s.p(1, 0.8);
      if (show <= 0) return;
      const cx = 1340;
      const cy = 330;
      const radius = 120;
      const angleA = 0.35;
      const r = 0.3;
      const angleB = angleA + 2 * Math.PI * r;
      const pa = [cx + radius * Math.cos(angleA), cy - radius * Math.sin(angleA)];
      const pb = [cx + radius * Math.cos(angleB), cy - radius * Math.sin(angleB)];
      ctx.globalAlpha = show;
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      const chord = s.p(2, 0.8);
      ctx.save();
      ctx.globalAlpha *= chord;
      ctx.strokeStyle = C.yellow;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(...pa);
      ctx.lineTo(...pb);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(...pa);
      ctx.moveTo(cx, cy);
      ctx.lineTo(...pb);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 34, -angleB, -angleA);
      ctx.stroke();
      canvasText(ctx, '2πr / p', cx + 6, cy - 44, { size: 18, color: C.text2 });
      canvasText(ctx, '弦の長さ = 2 sin(πr / p)', cx, cy + radius + 50, { size: 20, color: C.text, align: 'center' });
      ctx.restore();
      for (const [p, label] of [[pa, 'u(x)'], [pb, "u(x′)"]]) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 8, 0, Math.PI * 2);
        ctx.fillStyle = C.text;
        ctx.fill();
        canvasText(ctx, label, p[0] + (p[0] > cx ? 14 : -14), p[1] - 10, { size: 19, color: C.text2, align: p[0] > cx ? 'left' : 'right' });
      }
      canvasText(ctx, '半径 1 の円', cx, cy - radius - 22, { size: 18, color: C.muted, align: 'center' });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（らせん → 円）
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: 'x 軸を円柱に巻きつける',
    poster: 26,
    beats: [
      beat(R`x 軸（周期 $p = 1$）を、ひもだと思ってください。2つの点 $x$ と $x'$ の間の距離を $r$ とします。`),
      beat('このひもを、1周の長さが p の円柱に巻きつけます。横から見ると、ひもは波の形に見えます。', 9),
      beat(R`真上から見ると、ひもは1つの円に重なります。$x$ と $x + p$、$x + 2p$ は円の上で同じ点です。`, 10),
      beat(R`$x'$ を動かすと、円の上の弦の長さが伸び縮みし、それに合わせてカーネルの値が上下します。`, 12),
      beat(R`ふつうの RBF（点線）は $r$ とともに 0 に向かいますが、周期カーネルは $r = 1, 2, 3$ で 1 に戻ります。`, 10),
    ],
    build(ui) {
      ui.tex(R`x \;\longmapsto\; \mathbf{u}(x) = \big(\cos 2\pi x,\ \sin 2\pi x\big)`, { x: 940, y: 230, size: 34, at: 1, until: 3 });
      ui.text('x と x + p は、円の上で同じ点', { x: 940, y: 330, size: 28, at: 2, until: 3, glow: [{ from: 2, to: 3, color: C.yellow }] });
      ui.text(R`そのため $k(x, x + p) = \sigma_f^2$（相関 1）`, { x: 940, y: 390, size: 26, color: C.text2, at: 2, delay: 1, until: 3 });
      const rs = G.linspace(0, 3, 301);
      return {
        rs,
        periodicCurve: rs.map((r) => UNIT_PERIODIC(0, r)),
        rbfCurve: rs.map((r) => UNIT_RBF(0, r)),
        plot: new Plot({ x: 930, y: 190, w: 570, h: 300, xr: [0, 3], yr: [0, 1.1] }),
      };
    },
    draw(ctx, s, st) {
      const X_REF = 0.2;
      const CX = 460;
      const CY = 440;
      const coil = s.p(1, 3, 0.4);
      const turn = s.p(2, 3.5, 0.3);
      const zoom = lerp(1, 1.35, turn);
      const radius = 140 * coil * zoom;
      const axisScale = 230;
      const yaw = (turn * Math.PI) / 2;
      const pitch = 0.34 * coil * (1 - turn);
      const rNow = s.u < s.bt(3) ? 0.45 : keyframes(s.u, [[s.bt(3), 0.45], [s.bt(3) + 0.8, 0]]) + 3 * ramp(s.u, s.bt(3) + 0.8, s.bt(3) + 10.5);
      const project = (x) => {
        const theta = 2 * Math.PI * (x / PERIOD);
        const X = (x - 1.5) * axisScale;
        const Y = radius * Math.cos(theta);
        const Z = radius * Math.sin(theta);
        const X1 = X * Math.cos(yaw) - Z * Math.sin(yaw);
        const Z1 = X * Math.sin(yaw) + Z * Math.cos(yaw);
        const Y2 = Y * Math.cos(pitch) + Z1 * Math.sin(pitch);
        const depth = -Y * Math.sin(pitch) + Z1 * Math.cos(pitch);
        return { x: CX + X1, y: CY - Y2, depth };
      };

      // らせん: 奥から順に描く（手前の線が上に重なるように）
      const N = 540;
      const segments = [];
      for (let i = 0; i < N; i++) {
        const xa = (3 * i) / N;
        const xb = (3 * (i + 1)) / N;
        const a = project(xa);
        const b = project(xb);
        segments.push({ a, b, depth: (a.depth + b.depth) / 2, color: SERIES[Math.min(2, Math.floor(xa))] });
      }
      segments.sort((p, q) => p.depth - q.depth);
      const maxDepth = Math.max(1, radius);
      ctx.lineCap = 'round';
      for (const seg of segments) {
        ctx.globalAlpha = lerp(0.35, 1, clamp((seg.depth / maxDepth + 1) / 2));
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 目盛り（巻きつける前だけ）
      const tickAlpha = 1 - turn;
      for (const v of [0, 1, 2, 3]) {
        const p = project(v);
        canvasText(ctx, v === 1 ? '1 (= p)' : String(v), p.x, p.y + 34, { size: 17, color: C.muted, align: 'center', alpha: tickAlpha });
      }
      canvasText(ctx, '1周目', CX - 1.0 * axisScale, CY - 200, { size: 18, color: C.text2, align: 'center', alpha: tickAlpha * (1 - coil * 0.4) });
      canvasText(ctx, '2周目', CX, CY - 200, { size: 18, color: C.text2, align: 'center', alpha: tickAlpha * (1 - coil * 0.4) });
      canvasText(ctx, '3周目', CX + 1.0 * axisScale, CY - 200, { size: 18, color: C.text2, align: 'center', alpha: tickAlpha * (1 - coil * 0.4) });

      // x とその1周・2周先（同じ位置になる）、x′
      const ref = project(X_REF);
      [1, 2].forEach((k) => {
        const g = project(X_REF + k);
        ctx.beginPath();
        ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 3;
        ctx.stroke();
        canvasText(ctx, k === 1 ? 'x + p' : 'x + 2p', g.x, g.y - 20, { size: 19, color: C.text, align: 'center', alpha: 1 - turn });
      });
      const other = project(X_REF + rNow);
      if (turn > 0.98) {
        ctx.save();
        ctx.setLineDash([9, 7]);
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ref.x, ref.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(ref.x, ref.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = C.text;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(other.x, other.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      canvasText(ctx, turn > 0.9 ? 'x = x + p = x + 2p' : 'x', ref.x + 16, ref.y - 16, { size: 20, color: C.text, weight: 700 });
      canvasText(ctx, "x′", other.x + 16, other.y + 26, { size: 20, color: C.yellow, weight: 700 });

      // 右: r とカーネルの値
      const show = s.p(3, 0.8);
      if (show > 0) {
        const P = st.plot;
        ctx.save();
        ctx.globalAlpha = show;
        canvasText(ctx, '距離 r とカーネルの値', P.x, P.y - 52, TITLE);
        legend(ctx, [{ label: '周期カーネル', color: C.orange }, { label: 'RBF（比較）', color: C.blue, dash: [8, 6] }], P.x, P.y - 20, { alpha: 1 });
        P.axes(ctx, { xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], yticks: [0, 0.5, 1], xlabel: 'r', fmtX: (v) => String(v), fmtY: (v) => String(v) });
        const upto = rNow / 3;
        P.line(ctx, st.rs, st.periodicCurve, { color: C.orange, width: 3.5, upto });
        P.line(ctx, st.rs, st.rbfCurve, { color: C.blue, width: 3, dash: [8, 6], alpha: s.p(4, 0.8) });
        const kNow = UNIT_PERIODIC(0, rNow);
        P.dots(ctx, [rNow], [kNow], { color: C.yellow, r: 8 });
        const sin2 = Math.sin(Math.PI * rNow) ** 2;
        canvasText(ctx, `r = ${fmt(rNow, 2)}`, P.x, P.y + P.h + 90, { size: 24, color: C.text, weight: 700 });
        canvasText(ctx, `弦の長さの2乗 = 4 sin²(πr) = ${fmt(4 * sin2, 3)}`, P.x, P.y + P.h + 134, { size: 23, color: C.text2 });
        canvasText(ctx, `k = exp(−弦² / 2) = exp(−2 sin²(πr)) = ${fmt(kNow, 3)}`, P.x, P.y + P.h + 176, { size: 23, color: C.text2 });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（数値で計算）
  SCENES.push({
    id: '6T-2',
    chapter: 6,
    kind: 'theory',
    title: '周期カーネルを数値で計算する',
    beats: [
      beat(R`$p = 1,\ \ell = 1,\ \sigma_f^2 = 1$ で、距離 $r$ ごとに値を計算してみます。`),
      beat(R`$r = 0.25$ では $\sin(\pi/4) = 0.707$、2乗して 0.5、$\exp(-2 \times 0.5) = 0.368$ です。`, 9),
      beat(R`半周期 $r = 0.5$ で最小の 0.135、1周期 $r = 1$ で再び 1 に戻ります。$r = 1.25$ は $r = 0.25$ と同じ値です。`, 11),
      beat(R`$\ell$ は谷の深さを決めます。$r = 0.5$ で、$\ell = 0.5$ なら 0.0003、$\ell = 2$ なら 0.607 です。`, 9),
      beat(R`5点 $x = 0,\ 0.25,\ 0.5,\ 1,\ 1.25$ の行列では、$x = 0$ と $x = 1$ の行が完全に同じになります。`, 10),
      beat(R`このままでは $K$ は逆行列を持ちません。観測ノイズ $\sigma_n^2$ を対角に足すことで、予測の式が計算できます。`, 10),
    ],
    build(ui) {
      const rows = [
        [0, '0'], [0.25, R`\pi/4`], [0.5, R`\pi/2`], [0.75, R`3\pi/4`], [1, R`\pi`], [1.25, R`5\pi/4`],
      ].map(([r, angle]) => {
        const sine = Math.sin(Math.PI * r);
        return [String(r), `$${angle}$`, fmt(sine, 3), fmt(sine * sine, 3), fmt(UNIT_PERIODIC(0, r), 3)];
      });
      ui.table({
        x: LEFT_X, y: 128, widths: [110, 120, 170, 130, 150], size: 25, rowH: 46,
        header: ['$r$', R`$\pi r/p$`, R`$\sin(\pi r/p)$`, R`$\sin^2$`, '$k$'],
        rows,
        rowAt: [0, 1, 2, 2, 2, 2],
        rowDelay: 0,
        glowRows: {
          1: [{ from: 1, to: 2, color: C.yellow }, { from: 2, to: 3, color: C.aqua }],
          2: [{ from: 2, to: 3, color: C.yellow }],
          4: [{ from: 2, to: 3, color: C.yellow }],
          5: [{ from: 2, to: 3, color: C.aqua }],
        },
      });

      ui.card({ x: 840, y: 128, w: 670, h: 280, title: R`半周期 $r = 0.5$ での値と $\ell$`, at: 3 });
      [0.5, 1, 2].forEach((ell, i) => {
        const k = G.periodic({ variance: 1, lengthScale: ell, period: 1 })(0, 0.5);
        ui.text(R`$\ell = ${ell}$：　$\exp(-2 \cdot 1 / ${texNum(ell * ell, 2)}) = ${texNum(k, 4)}$`, { x: 870, y: 190 + i * 60, size: 26, at: 3, delay: 0.4 + i * 0.6 });
      });
      ui.text('ℓ が小さいほど、半周期ずれた点は無関係に近づく', { x: 870, y: 370, size: 21, color: C.text2, at: 3, delay: 2.2 });

      const xs = [0, 0.25, 0.5, 1, 1.25];
      const K = G.gram(xs, xs, UNIT_PERIODIC);
      const cell = (v) => (Math.abs(v - 1) < 1e-12 ? '1' : texNum(v, 3));
      const body = K.map((row, i) => Array.from(row).map((v) => (i === 0 || i === 3 ? R`\htmlClass{hlRow}{${cell(v)}}` : cell(v))).join(' & ')).join(' \\\\ ');
      ui.text(R`$x = (0,\ 0.25,\ 0.5,\ 1,\ 1.25)$ のとき`, { x: LEFT_X, y: 470, size: 24, color: C.text2, at: 4 });
      ui.tex(R`K = \begin{bmatrix} ${body} \end{bmatrix}`, { x: LEFT_X + 20, y: 515, size: 28, at: 4, hl: [{ cls: 'hlRow', from: 4, color: C.yellow, pad: 3 }] });
      const detK = G.determinant(K);
      const detKy = G.determinant(G.withDiagonal(K, 0.01));
      const [mantissa, exponent] = detKy.toExponential(2).split('e');
      ui.text(R`$\det K = ${texNum(Math.abs(detK) < 1e-12 ? 0 : detK, 0)}$（1行目と4行目が同じ）`, { x: 780, y: 540, size: 27, at: 4, delay: 1 });
      ui.text(R`$\det(K + 0.01\,I) = ${mantissa} \times 10^{${Number(exponent)}} > 0$`, { x: 780, y: 610, size: 27, at: 5, glow: [{ from: 5, color: C.aqua }] });
    },
  });

  // 第6章の外挿の例（真の関数は説明用に作った周期関数）
  const periodicTruth = (x) => 0.9 * Math.sin(2 * Math.PI * x) + 0.45 * Math.cos(4 * Math.PI * x + 0.6);
  const EXTRAP_X = G.linspace(0.05, 1.95, 12);
  const EXTRAP_NOISE = G.standardNormals(EXTRAP_X.length, 611);
  const EXTRAP_Y = Float64Array.from(EXTRAP_X, (x, i) => periodicTruth(x) + 0.05 * EXTRAP_NOISE[i]);

  // ---------------------------------------------------------------- 第6章 図解（行列・サンプル・外挿）
  SCENES.push({
    id: '6V-2',
    chapter: 6,
    kind: 'visual',
    title: '周期カーネルの行列・サンプル・外挿',
    beats: [
      beat('周期カーネルの行列です。対角だけでなく、1周期ずつずれた位置にも明るい帯が現れます。', 9),
      beat(R`サンプルは完全にくり返す関数になります。1周期の中の形は $\ell$ が決めます。`),
      beat(R`$\ell$ を小さくすると、1周期の中の形が複雑になります。`, 7),
      beat(R`外挿で比べます。区間 $[0, 2]$ にだけデータがある状態から、その先を予測します。`),
      beat('RBF（上）は、データがない所で平均 0 に戻り、帯も広がります。', 7),
      beat('周期カーネル（下）は、学んだ1周期の形をそのまま先へくり返し、帯も細いままです。', 8),
      beat('ただし、それは「周期が続く」と仮定したからです。仮定が外れていれば、自信を持って外します。', 9),
    ],
    build() {
      const heatGrid = G.linspace(0, 3, 75);
      const sampleGrid = G.linspace(0, 4, 200);
      const predGrid = G.linspace(0, 5, 300);
      const rbfModel = G.fit(EXTRAP_X, EXTRAP_Y, G.rbf({ variance: 1, lengthScale: 0.25 }), 0.0025);
      const perModel = G.fit(EXTRAP_X, EXTRAP_Y, G.periodic({ variance: 1, lengthScale: 0.8, period: 1 }), 0.0025);
      return {
        heatGrid, sampleGrid, predGrid,
        normals: [621, 622, 623].map((seed) => G.standardNormals(sampleGrid.length, seed)),
        rbfPred: G.predict(rbfModel, predGrid),
        perPred: G.predict(perModel, predGrid),
        truth: predGrid.map(periodicTruth),
        heatBuffer: document.createElement('canvas'),
        samplePlot: new Plot({ x: 650, y: 175, w: 850, h: 320, xr: [0, 4], yr: [-3, 3] }),
        shapePlot: new Plot({ x: 650, y: 580, w: 850, h: 120, xr: [0, 4], yr: [0, 1.05] }),
        top: new Plot({ x: 110, y: 175, w: 1380, h: 225, xr: [0, 5], yr: [-2.4, 2.4] }),
        bottom: new Plot({ x: 110, y: 480, w: 1380, h: 225, xr: [0, 5], yr: [-2.4, 2.4] }),
      };
    },
    draw(ctx, s, st) {
      const partA = 1 - s.p(3, 0.6);
      const partB = s.p(3, 0.6, 0.3);
      if (partA > 0.001) {
        ctx.globalAlpha = partA;
        const ell = keyframes(s.u, [[s.bt(2), 1], [s.bt(2) + 3, 0.35]], { log: true });
        const kernel = G.periodic({ variance: 1, lengthScale: ell, period: 1 });
        const m = st.heatGrid.length;
        const image = heatmapCanvas(m, m, (i, j) => seqColor(kernel(st.heatGrid[i], st.heatGrid[j])), st.heatBuffer);
        canvasText(ctx, 'カーネル行列 K（x = 0〜3）', 100, 170, TITLE);
        drawImage(ctx, image, 100, 205, 450, 450);
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(99.5, 204.5, 451, 451);
        canvasText(ctx, 'x = 0', 100, 680, { size: 16, color: C.muted });
        canvasText(ctx, 'x = 3', 550, 680, { size: 16, color: C.muted, align: 'right' });

        const P = st.samplePlot;
        const show = s.p(1, 0.6);
        ctx.save();
        ctx.globalAlpha *= show;
        canvasText(ctx, '周期カーネルからのサンプル', P.x, P.y - 48, TITLE);
        canvasText(ctx, `ℓ = ${fmt(ell, 2)}`, P.x + P.w, P.y - 46, { size: 30, color: C.yellow, align: 'right', weight: 800 });
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [-2, 0, 2], xlabel: 'x' });
        [1, 2, 3].forEach((v) => P.vline(ctx, v, { alpha: 0.4 }));
        G.sampleFunctions(st.sampleGrid, kernel, st.normals).forEach((f, k) => P.line(ctx, st.sampleGrid, f, { color: SERIES[k], width: 3, upto: s.p(1, 2) }));
        const Q = st.shapePlot;
        canvasText(ctx, 'カーネルの形 k(r)', Q.x, Q.y - 16, { size: 18, color: C.text2 });
        Q.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [0, 1], xlabel: 'r' });
        const rs = G.linspace(0, 4, 240);
        Q.line(ctx, rs, rs.map((r) => kernel(0, r)), { color: C.orange, width: 3 });
        ctx.restore();
      }
      if (partB > 0.001) {
        ctx.globalAlpha = partB;
        const panels = [
          { plot: st.top, pred: st.rbfPred, title: 'RBF（ℓ = 0.25）', at: 4 },
          { plot: st.bottom, pred: st.perPred, title: '周期カーネル（p = 1, ℓ = 0.8）', at: 5 },
        ];
        panels.forEach(({ plot: P, pred, title, at }) => {
          canvasText(ctx, title, P.x, P.y - 18, TITLE);
          P.shade(ctx, 0, 2, { color: C.text, alpha: 0.05 });
          P.label(ctx, 'データのある区間', 1, 2.4, { dy: 24, align: 'center', size: 16, color: C.muted });
          P.label(ctx, '外挿（データなし）', 3.5, 2.4, { dy: 24, align: 'center', size: 16, color: C.muted });
          P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-2, 0, 2], xlabel: 'x' });
          P.line(ctx, st.predGrid, st.truth, { color: C.muted, width: 2, dash: [6, 6], alpha: 0.8 });
          const upto = s.p(at, 3);
          P.band(ctx, st.predGrid, Array.from(pred.mean, (m, i) => m - 2 * pred.sd[i]), Array.from(pred.mean, (m, i) => m + 2 * pred.sd[i]), { color: C.blue, alpha: 0.26, upto });
          P.line(ctx, st.predGrid, pred.mean, { color: C.text, width: 3.5, upto });
          P.dots(ctx, EXTRAP_X, Array.from(EXTRAP_Y), { color: C.yellow, r: 7 });
        });
        legend(ctx, [
          { label: '予測平均', color: C.text },
          { label: '±2σ', color: C.blue, kind: 'band' },
          { label: '真の関数', color: C.muted, width: 2, dash: [6, 6] },
        ], 900, st.top.y - 22);
        const warn = s.p(6, 0.6);
        if (warn > 0) {
          const P = st.bottom;
          ctx.save();
          ctx.globalAlpha *= warn;
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(P.sx(2.05), P.y + 4, P.sx(5) - P.sx(2.05) - 4, P.h - 8);
          ctx.restore();
          P.label(ctx, '「周期が続く」という仮定の上の予測', 3.5, -2.4, { dy: -14, align: 'center', size: 19, color: C.text, alpha: warn });
        }
      }
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（構造の足し算）
  const additiveRows = [0, 0.5, 1, 3, 3.5].map((r) => ({ r, k1: TREND_KERNEL(0, r), k2: SEASON_KERNEL(0, r) }));
  const rowOf = (r) => additiveRows.find((row) => row.r === r);
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '加法カーネル① トレンド ＋ 季節',
    beats: [
      beat('加法カーネルは、関数を「独立な部品の和」と考えるところから出てきます。'),
      beat(R`「独立」とは、$f_1$ の値を知っても、$f_2$ について何も分からないということです。トレンドと季節が、別々の原因で動くイメージです。`, 11),
      beat(R`独立なら、掛けた値の平均は、平均どうしの積になります。平均は 0 なので、$f_1$ と $f_2$ の共分散は、どの2点の組でも 0 です。`, 11),
      beat('和の共分散を展開すると、交差する項は、いま見た理由で 0 になり、2つの共分散だけが残ります。', 10),
      beat('もし部品どうしが連動していたら、交差する項が残り、カーネルは単純な和になりません。足し算は「独立」という仮定に支えられています。', 11),
      beat('したがってカーネルも和になります。ここではトレンド用の RBF と、季節用の周期カーネルを足します。', 9),
      beat(R`数値で確かめます。$r = 0.5$ では、トレンドは強く連動（${fmt(rowOf(0.5).k1, 3)}）、季節は逆位相で弱い（${fmt(rowOf(0.5).k2, 3)}）。`, 10),
      beat(R`$r = 1$ では季節が1周して 0.5 に戻り、合計 ${fmt(rowOf(1).k1 + rowOf(1).k2, 3)}。$r = 3$ でもトレンドが残り ${fmt(rowOf(3).k1 + rowOf(3).k2, 3)} です。`, 10),
      beat(R`$n$ 点の行列も、それぞれのカーネル行列を要素ごとに足すだけです。`, 7),
    ],
    build(ui) {
      ui.tex(R`f(x) = \textcolor{${C.blue}}{f_1(x)} + \textcolor{${C.orange}}{f_2(x)},\qquad \textcolor{${C.blue}}{f_1 \sim \mathcal{GP}(0, k_1)},\ \ \textcolor{${C.orange}}{f_2 \sim \mathcal{GP}(0, k_2)}\ \ \text{（独立）}`, { x: LEFT_X, y: 128, size: 34 });
      ui.tex(R`\operatorname{Cov}(f, f') = \operatorname{Cov}(f_1, f_1') + \underbrace{\operatorname{Cov}(f_1, f_2') + \operatorname{Cov}(f_2, f_1')}_{=\,0\ \text{（独立）}} + \operatorname{Cov}(f_2, f_2')`, { x: LEFT_X, y: 200, size: 31, at: 3 });
      ui.text(R`（$f = f(x),\ f' = f(x')$ と略記）`, { x: LEFT_X + 1140, y: 214, size: 20, color: C.muted, at: 3 });
      // 「独立」の意味と、交差する項が 0 になる理由（カーネルの式が出る前に消す）
      ui.card({ x: LEFT_X, y: 330, w: 1420, h: 270, title: '「独立」とは', at: 1, until: 5 });
      ui.text(R`$f_1$ の値を知っても、$f_2$ の分布は変わらない（トレンドと季節は、別々の原因で動く）`, { x: LEFT_X + 30, y: 385, size: 25, at: 1, delay: 0.3, until: 5 });
      ui.tex(R`\mathbb{E}\big[f_1(x)\, f_2(x')\big] = \mathbb{E}\big[f_1(x)\big]\ \mathbb{E}\big[f_2(x')\big] = 0 \times 0 = 0\quad\Longrightarrow\quad \operatorname{Cov}\big(f_1(x),\, f_2(x')\big) = 0`, {
        x: LEFT_X + 30, y: 445, size: 30, at: 2, until: 5, glow: [{ from: 2, to: 3, color: C.yellow }],
      });
      ui.text('独立なら「積の平均 ＝ 平均の積」。平均は 0 なので、どの2点の組でも共分散は 0', { x: LEFT_X + 30, y: 505, size: 22, color: C.text2, at: 2, delay: 0.6, until: 5 });
      ui.text(R`部品どうしが連動していると、交差する項が残る → $k \neq k_1 + k_2$`, { x: LEFT_X + 30, y: 550, size: 24, color: C.orange, at: 4, until: 5 });
      ui.tex(R`k(x,x') = \textcolor{${C.blue}}{k_1(x,x')} + \textcolor{${C.orange}}{k_2(x,x')}`, { x: LEFT_X, y: 335, size: 42, at: 5, glow: [{ from: 5, to: 6, color: C.yellow }] });
      ui.text(R`$k_1$：RBF（$\sigma^2 = 1,\ \ell = 3$）… ゆっくりしたトレンド`, { x: LEFT_X + 20, y: 430, size: 25, color: C.text2, at: 5, delay: 0.6 });
      ui.text(R`$k_2$：周期（$\sigma^2 = 0.5,\ p = 1,\ \ell = 1$）… 季節変動`, { x: LEFT_X + 20, y: 476, size: 25, color: C.text2, at: 5, delay: 1.2 });
      ui.tex(R`K = K_1 + K_2\qquad (K_{ij} = k_1(x_i, x_j) + k_2(x_i, x_j))`, { x: LEFT_X, y: 610, size: 36, at: 8, glow: [{ from: 8, color: C.yellow }] });

      ui.card({ x: 900, y: 315, w: 610, h: 270, title: '計算例（2点の距離 $r$ ごと）', at: 6 });
      ui.table({
        x: 920, y: 365, widths: [90, 150, 150, 180], size: 24, rowH: 40, at: 6,
        header: ['$r$', '$k_1$', '$k_2$', '$k = k_1 + k_2$'],
        rows: additiveRows.map(({ r, k1, k2 }) => [String(r), fmt(k1, 3), fmt(k2, 3), `<b>${fmt(k1 + k2, 3)}</b>`]),
        rowAt: [6, 6, 7, 7, 7],
        rowDelay: 0,
        glowRows: { 1: [{ from: 6, to: 7, color: C.yellow }], 2: [{ from: 7, to: 8, color: C.yellow }], 3: [{ from: 7, to: 8, color: C.yellow }] },
      });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（行列の和・サンプルの和）
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '行列の足し算、関数の足し算',
    beats: [
      beat(R`x = 0〜4 の60点で、トレンドの行列 $K_1$ と季節の行列 $K_2$ を計算しました。`),
      beat(R`$K_1$ は太い帯、$K_2$ は周期ごとの縞。要素ごとに足すと、縞の入った太い帯 $K$ になります。`, 10),
      beat(R`1行だけ取り出すと、$x = 2$ との相関です。ゆっくり下がる $k_1$ に、周期的な $k_2$ が上乗せされています。`, 11),
      beat(R`サンプルでも同じです。$f_1$（トレンド）と $f_2$（季節）を別々に引きます。`),
      beat(R`2つを足すと、加法カーネルのサンプル $f$ になります。$f_1$ の上に $f_2$ の揺れが乗った形です。`, 9),
      beat(R`$K_1 + K_2$ から直接引いたサンプル（細い線）も、$f_1 + f_2$ と同じ分布に従います。`, 9),
    ],
    build() {
      const grid = G.linspace(0, 4, 60);
      const K1 = G.gram(grid, grid, TREND_KERNEL);
      const K2 = G.gram(grid, grid, SEASON_KERNEL);
      const sampleGrid = G.linspace(0, 6, 240);
      const z = (seed) => [G.standardNormals(sampleGrid.length, seed)];
      return {
        grid, K1, K2,
        row: grid.findIndex((x) => x >= 2),
        sampleGrid,
        f1: G.sampleFunctions(sampleGrid, TREND_KERNEL, z(711))[0],
        f2: G.sampleFunctions(sampleGrid, SEASON_KERNEL, z(712))[0],
        direct: G.sampleFunctions(sampleGrid, ADDITIVE_KERNEL, [713, 714, 715].map((seed) => G.standardNormals(sampleGrid.length, seed))),
        slice: new Plot({ x: 110, y: 590, w: 1080, h: 130, xr: [0, 4], yr: [0, 1.6] }),
        samplePlot: new Plot({ x: 110, y: 175, w: 1380, h: 520, xr: [0, 6], yr: [-3.2, 3.2] }),
        buffer: document.createElement('canvas'),
      };
    },
    draw(ctx, s, st) {
      const partA = 1 - s.p(3, 0.6);
      const partB = s.p(3, 0.6, 0.3);
      const MAX = 1.5;
      const SIZE = 300;
      const Y0 = 200;
      if (partA > 0.001) {
        ctx.globalAlpha = partA;
        const rowMark = s.p(2, 0.5) > 0.5 ? st.row : null;
        canvasText(ctx, 'K₁（RBF：トレンド）', 110, Y0 - 18, TITLE);
        drawMatrixHeat(ctx, 110, Y0, SIZE, st.K1, MAX, { rowMark });
        canvasText(ctx, '＋', 455, Y0 + SIZE / 2 + 16, { size: 44, color: C.text, align: 'center', weight: 700 });
        canvasText(ctx, 'K₂（周期：季節）', 500, Y0 - 18, TITLE);
        drawMatrixHeat(ctx, 500, Y0, SIZE, st.K2, MAX, { rowMark });
        const build = s.p(1, 2.5, 0.3);
        if (build > 0) {
          ctx.save();
          ctx.globalAlpha *= s.p(1, 0.5);
          canvasText(ctx, '＝', 845, Y0 + SIZE / 2 + 16, { size: 44, color: C.text, align: 'center', weight: 700 });
          canvasText(ctx, 'K ＝ K₁ ＋ K₂', 890, Y0 - 18, TITLE);
          const sum = st.K1.map((row, i) => Array.from(row, (v, j) => v + build * st.K2[i][j]));
          drawMatrixHeat(ctx, 890, Y0, SIZE, sum, MAX, { rowMark });
          ctx.restore();
        }
        colorBar(ctx, 1240, Y0, 20, SIZE, (v) => seqColor(v / MAX), { min: 0, max: MAX, ticks: [0, 0.5, 1, 1.5], label: '値' });

        const sliceAlpha = s.p(2, 0.8, 0.3);
        if (sliceAlpha > 0) {
          const P = st.slice;
          ctx.save();
          ctx.globalAlpha *= sliceAlpha;
          canvasText(ctx, '黄色の行（x = 2 との相関）', P.x, P.y - 20, { size: 19, color: C.text2 });
          legend(ctx, [{ label: 'k₁', color: C.blue }, { label: 'k₂', color: C.orange }, { label: 'k = k₁ + k₂', color: C.text }], P.x + 330, P.y - 22);
          P.axes(ctx, { xticks: [0, 1, 2, 3, 4], yticks: [0, 0.5, 1, 1.5], xlabel: "x′", fmtY: (v) => String(v) });
          const xs = G.linspace(0, 4, 240);
          P.line(ctx, xs, xs.map((x) => TREND_KERNEL(2, x)), { color: C.blue, width: 3 });
          P.line(ctx, xs, xs.map((x) => SEASON_KERNEL(2, x)), { color: C.orange, width: 3 });
          P.line(ctx, xs, xs.map((x) => ADDITIVE_KERNEL(2, x)), { color: C.text, width: 3.5, upto: s.p(2, 2, 1) });
          ctx.restore();
        }
      }
      if (partB > 0.001) {
        ctx.globalAlpha = partB;
        const P = st.samplePlot;
        const lift = s.p(4, 2.5, 0.3);
        canvasText(ctx, '部品ごとのサンプルと、その和', P.x, P.y - 48, TITLE);
        legend(ctx, [
          { label: 'f₁（トレンド）', color: C.blue },
          { label: 'f₂（季節）', color: C.orange },
          { label: 'f = f₁ + f₂', color: C.text },
        ], P.x + 380, P.y - 50);
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'x' });
        const directAlpha = s.p(5, 1);
        st.direct.forEach((f) => P.line(ctx, st.sampleGrid, f, { color: C.text2, width: 1.5, alpha: 0.45 * directAlpha }));
        P.line(ctx, st.sampleGrid, st.f1, { color: C.blue, width: 3, upto: s.p(3, 2, 0.5) });
        P.line(ctx, st.sampleGrid, st.f2, { color: C.orange, width: 3, upto: s.p(3, 2, 1.5), alpha: lerp(1, 0.35, lift) });
        if (lift > 0) {
          const moving = Array.from(st.f2, (v, i) => v + lift * st.f1[i]);
          P.line(ctx, st.sampleGrid, moving, { color: C.text, width: 3.5 });
        }
      }
    },
  });

  // 第7章の分解の例で、外挿の値を計算する点
  const DECOMP_XSTAR = 5.5;

  // ---------------------------------------------------------------- 第7章 理論（予測の分解）
  SCENES.push({
    id: '7T-2',
    chapter: 7,
    kind: 'theory',
    title: '加法モデルの予測は、部品ごとに分解できる',
    beats: [
      beat(R`加法カーネルで予測するとき、重み $\boldsymbol{\alpha}$ は、足し合わせた行列で1回だけ計算します。`),
      beat(R`$\mathbf{k}_*$ も部品ごとに分かれるので、予測平均はトレンドの寄与と季節の寄与に分解できます。`, 9),
      beat(R`部品 $f_j$ だけの予測平均は、$\mathbf{k}_{j*}$ と、共通の $\boldsymbol{\alpha}$ の内積です。`),
      beat(R`部品ごとの不確かさも、$k_j$ だけを使って、同じ形の式で計算できます。`),
      beat('ただし部品どうしは事後に相関するため、部品の分散を足しても、全体の分散にはなりません。', 9),
      beat(R`次の図解のデータで、外挿点 $x_* = ${DECOMP_XSTAR}$ を計算した値です。$\mu_{1*}$ と $\mu_{2*}$ を足すと $\mu_*$ になります。`, 11),
    ],
    build(ui) {
      ui.tex(R`\htmlClass{hlAlpha}{\boldsymbol{\alpha}} = (K_1 + K_2 + \sigma_n^2 I)^{-1}\mathbf{y}`, { x: LEFT_X, y: 125, size: 38, hl: [{ cls: 'hlAlpha', from: 0, to: 3, color: C.yellow }] });
      ui.text('← α は全体で1回だけ計算', { x: 720, y: 140, size: 24, color: C.text2, delay: 0.6 });
      ui.tex(R`\mu_* = (\mathbf{k}_{1*} + \mathbf{k}_{2*})^{\top}\boldsymbol{\alpha} = \underbrace{\textcolor{${C.blue}}{\mathbf{k}_{1*}^{\top}\boldsymbol{\alpha}}}_{\mu_{1*}\ \text{（トレンド）}} + \underbrace{\textcolor{${C.orange}}{\mathbf{k}_{2*}^{\top}\boldsymbol{\alpha}}}_{\mu_{2*}\ \text{（季節）}}`, { x: LEFT_X, y: 205, size: 36, at: 1 });
      ui.tex(R`\mathbb{E}\big[f_j(x_*) \mid \mathbf{y}\big] = \mathbf{k}_{j*}^{\top}\,(K + \sigma_n^2 I)^{-1}\mathbf{y}`, { x: LEFT_X, y: 345, size: 32, at: 2 });
      ui.tex(R`\operatorname{Var}\big[f_j(x_*) \mid \mathbf{y}\big] = k_j(x_*, x_*) - \mathbf{k}_{j*}^{\top}(K + \sigma_n^2 I)^{-1}\mathbf{k}_{j*}`, { x: LEFT_X, y: 410, size: 32, at: 3 });
      ui.tex(R`\operatorname{Cov}\big[f_1, f_2 \mid \mathbf{y}\big] = -\,\mathbf{k}_{1*}^{\top}(K + \sigma_n^2 I)^{-1}\mathbf{k}_{2*}\ \ \Longrightarrow\ \ \operatorname{Var}[f] = \operatorname{Var}[f_1] + \operatorname{Var}[f_2] + 2\operatorname{Cov}[f_1, f_2]`, { x: LEFT_X, y: 480, size: 28, at: 4 });

      // 図解のデータで実際に計算した値
      const xs = [DECOMP_XSTAR];
      const all = G.predict(DECOMP_MODEL, xs);
      const p1 = G.predict(DECOMP_MODEL, xs, TREND_KERNEL);
      const p2 = G.predict(DECOMP_MODEL, xs, SEASON_KERNEL);
      const covariance = (all.variance[0] - p1.variance[0] - p2.variance[0]) / 2;
      ui.card({ x: LEFT_X, y: 565, w: 1420, h: 185, title: R`図解のデータ（37点）で $x_* = ${DECOMP_XSTAR}$ を計算`, at: 5 });
      ui.text(R`平均：　$\mu_{1*} = ${texNum(p1.mean[0], 3)}$　＋　$\mu_{2*} = ${texNum(p2.mean[0], 3)}$　＝　$\mu_* = \mathbf{${texNum(all.mean[0], 3)}}$`, { x: LEFT_X + 30, y: 620, size: 27, at: 5, delay: 0.4 });
      ui.text(R`分散：　$${texNum(p1.variance[0], 3)} + ${texNum(p2.variance[0], 3)} + 2 \times (${texNum(covariance, 3)}) = ${texNum(all.variance[0], 3)}$　（部品の分散は大きいが、合計は小さい）`, { x: LEFT_X + 30, y: 680, size: 25, color: C.text2, at: 5, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（データの分解）
  SCENES.push({
    id: '7V-2',
    chapter: 7,
    kind: 'visual',
    title: 'トレンドと季節に分解する',
    beats: [
      beat('トレンドと季節変動が重なったデータです。x = 0〜4.5 で観測し、6 まで予測します。'),
      beat('加法カーネル（RBF ＋ 周期）の予測です。データの外でも、季節の揺れを保ったまま伸びていきます。', 9),
      beat(R`同じ $\boldsymbol{\alpha}$ を使ってトレンド部分 $\mathbf{k}_{1*}^{\top}\boldsymbol{\alpha}$ だけを取り出すと、ゆっくりした変化が現れます。`, 10),
      beat(R`季節部分 $\mathbf{k}_{2*}^{\top}\boldsymbol{\alpha}$ を取り出すと、1周期の揺れが現れます。点線は、データを作った真の部品です。`, 10),
      beat(R`$x = ${DECOMP_XSTAR}$ で、2つの部品の値を足すと、上の予測と一致します。`, 8),
      beat('比較として RBF だけの予測（紫の点線）を重ねると、データの外ではすぐに平均 0 へ戻ってしまいます。', 9),
      beat('部品ごとの帯は合計の帯より広めです。一定の高さをどちらの部品が受け持つかは、データだけでは決まらないためです。', 11),
    ],
    build() {
      const grid = G.linspace(0, 6, 300);
      const rbfOnly = G.fit(DECOMP_X, DECOMP_Y, G.rbf({ variance: 1, lengthScale: 0.3 }), DECOMP_NOISE_VARIANCE);
      return {
        grid,
        all: G.predict(DECOMP_MODEL, grid),
        trend: G.predict(DECOMP_MODEL, grid, TREND_KERNEL),
        season: G.predict(DECOMP_MODEL, grid, SEASON_KERNEL),
        rbf: G.predict(rbfOnly, grid),
        atStar: {
          all: G.predict(DECOMP_MODEL, [DECOMP_XSTAR]).mean[0],
          trend: G.predict(DECOMP_MODEL, [DECOMP_XSTAR], TREND_KERNEL).mean[0],
          season: G.predict(DECOMP_MODEL, [DECOMP_XSTAR], SEASON_KERNEL).mean[0],
        },
        top: new Plot({ x: 110, y: 170, w: 1380, h: 270, xr: [0, 6], yr: [-2, 2] }),
        left: new Plot({ x: 110, y: 530, w: 650, h: 175, xr: [0, 6], yr: [-1.6, 1.6] }),
        right: new Plot({ x: 840, y: 530, w: 650, h: 175, xr: [0, 6], yr: [-1.6, 1.6] }),
      };
    },
    draw(ctx, s, st) {
      const bandOf = (p) => [Array.from(p.mean, (m, i) => m - 2 * p.sd[i]), Array.from(p.mean, (m, i) => m + 2 * p.sd[i])];
      const T = st.top;
      canvasText(ctx, 'データと予測（加法カーネル）', T.x, T.y - 18, TITLE);
      legend(ctx, [
        { label: '予測平均', color: C.text },
        { label: '±2σ', color: C.blue, kind: 'band' },
        { label: 'データ', color: C.yellow, kind: 'dot' },
      ], T.x + 360, T.y - 22);
      T.shade(ctx, 4.5, 6, { color: C.text, alpha: 0.05 });
      T.label(ctx, '外挿', 5.25, 2, { dy: 24, align: 'center', size: 17, color: C.muted });
      T.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [-2, -1, 0, 1, 2], xlabel: 'x' });
      const fitUpto = s.p(1, 3);
      T.band(ctx, st.grid, ...bandOf(st.all), { color: C.blue, alpha: 0.26, upto: fitUpto });
      T.line(ctx, st.grid, st.all.mean, { color: C.text, width: 3.5, upto: fitUpto });
      T.line(ctx, st.grid, st.rbf.mean, { color: C.violet, width: 3, dash: [9, 7], alpha: s.p(5, 1) });
      T.dots(ctx, DECOMP_X, Array.from(DECOMP_Y), { color: C.yellow, r: 6, ring: null, alpha: s.p(0, 0.8) });

      const parts = [
        { plot: st.left, pred: st.trend, truth: trendTruth, color: C.blue, title: 'トレンド部分 μ₁ = k₁*ᵀα', at: 2 },
        { plot: st.right, pred: st.season, truth: seasonTruth, color: C.orange, title: '季節部分 μ₂ = k₂*ᵀα', at: 3 },
      ];
      parts.forEach(({ plot: P, pred, truth, color, title, at }) => {
        const show = s.p(at, 0.6);
        if (show <= 0) return;
        ctx.save();
        ctx.globalAlpha *= show;
        canvasText(ctx, title, P.x, P.y - 18, TITLE);
        P.shade(ctx, 4.5, 6, { color: C.text, alpha: 0.05 });
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [-1, 0, 1], xlabel: 'x' });
        const bandEmphasis = s.win(6, undefined, 0.6);
        P.band(ctx, st.grid, ...bandOf(pred), { color, alpha: lerp(0.18, 0.34, bandEmphasis), upto: s.p(at, 2.5) });
        P.line(ctx, st.grid, st.grid.map(truth), { color: C.muted, width: 2, dash: [6, 6], alpha: s.p(3, 0.8) });
        P.line(ctx, st.grid, pred.mean, { color, width: 3.5, upto: s.p(at, 2.5) });
        ctx.restore();
      });

      const check = s.win(4, 5);
      if (check > 0) {
        const m1 = st.atStar.trend;
        const m2 = st.atStar.season;
        ctx.save();
        ctx.globalAlpha *= check;
        [T, st.left, st.right].forEach((P) => P.vline(ctx, DECOMP_XSTAR, { color: C.yellow }));
        st.left.dots(ctx, [DECOMP_XSTAR], [m1], { color: C.blue, r: 8 });
        st.right.dots(ctx, [DECOMP_XSTAR], [m2], { color: C.orange, r: 8 });
        T.dots(ctx, [DECOMP_XSTAR], [st.atStar.all], { color: C.text, r: 8 });
        canvasText(ctx, `${fmt(m1, 3)} ＋ ${fmt(m2, 3)} ＝ ${fmt(m1 + m2, 3)}`, T.sx(DECOMP_XSTAR) - 16, T.y + 40, { size: 23, color: C.text, weight: 700, align: 'right' });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第8章 理論（入力次元の足し算）
  const HALF_RBF = G.rbf({ variance: 0.5, lengthScale: 1 });
  const dimRows = [[1, 1], [0, 3], [3, 3]].map(([a, b]) => {
    const k1 = UNIT_RBF(0, a);
    const k2 = UNIT_RBF(0, b);
    return { point: [a, b], k1, k2, add: 0.5 * k1 + 0.5 * k2, prod: k1 * k2 };
  });
  SCENES.push({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: '加法カーネル② 入力の次元ごとに足す',
    beats: [
      beat('入力が複数あるときの「加法」は、入力の次元ごとのカーネルを足すことです。'),
      beat(R`これは関数を $f_1(x_1) + f_2(x_2)$ と、それぞれの入力だけに依存する部品の和で表すことに当たります。`, 10),
      beat('ふつうの多次元 RBF は、次元ごとのカーネルの積です。指数の中の和が、外では積になります。', 9),
      beat(R`数値で比べます。(0, 0) と (1, 1) では、加法 ${fmt(dimRows[0].add, 3)}、積 ${fmt(dimRows[0].prod, 3)} です。`),
      beat(R`(0, 0) と (0, 3) では差が大きく、加法は ${fmt(dimRows[1].add, 3)}、積は ${fmt(dimRows[1].prod, 3)}。$x_1$ が同じなら、加法では $x_2$ が遠くても $f_1$ を共有します。`, 12),
      beat(R`加法は交互作用を表せない代わりに、少ないデータでも遠くまで予測できます。必要なら2次の項 $k_1 k_2$ を足します。`, 10),
    ],
    build(ui) {
      ui.text(R`入力が2つ $\ \mathbf{x} = (x_1, x_2)$ のとき（例：平面上の座標、温度と圧力など）`, { x: LEFT_X, y: 125, size: 25, color: C.text2 });
      ui.tex(R`\text{加法：}\ k_{\mathrm{add}}(\mathbf{x},\mathbf{x}') = k_1(x_1,x_1') + k_2(x_2,x_2')\quad\Longleftrightarrow\quad f(\mathbf{x}) = f_1(x_1) + f_2(x_2)`, { x: LEFT_X, y: 185, size: 34, glow: [{ from: 0, to: 2, color: C.aqua }] });
      ui.tex(R`\text{積：}\ k_{\mathrm{prod}}(\mathbf{x},\mathbf{x}') = k_1(x_1,x_1')\,k_2(x_2,x_2') = \sigma^2\exp\!\Big(-\frac{(x_1-x_1')^2}{2\ell_1^2}-\frac{(x_2-x_2')^2}{2\ell_2^2}\Big)`, { x: LEFT_X, y: 270, size: 34, at: 2, glow: [{ from: 2, to: 3, color: C.violet }] });
      ui.text(R`計算例：各次元 RBF（$\ell = 1$）。全体の分散をそろえるため、加法は $\tfrac12 k_1 + \tfrac12 k_2$`, { x: LEFT_X, y: 395, size: 23, color: C.text2, at: 3 });
      ui.table({
        x: LEFT_X, y: 440, widths: [210, 120, 120, 200, 150], size: 25, rowH: 46, at: 3,
        header: [R`$\mathbf{x} = (0,0)$ と $\mathbf{x}'$`, '$k_1$', '$k_2$', R`加法 $\tfrac12 k_1 + \tfrac12 k_2$`, R`積 $k_1 k_2$`],
        rows: dimRows.map(({ point, k1, k2, add, prod }) => [`(${point.join(', ')})`, fmt(k1, 3), fmt(k2, 3), `<b>${fmt(add, 3)}</b>`, `<b>${fmt(prod, prod < 0.001 ? 5 : 3)}</b>`]),
        rowAt: [3, 4, 4],
        rowDelay: 0,
        glowRows: { 0: [{ from: 3, to: 4, color: C.yellow }], 1: [{ from: 4, to: 5, color: C.yellow }] },
      });
      ui.card({ x: 940, y: 395, w: 570, h: 330, title: '加法カーネルの長所と短所', at: 5 });
      [
        '＋ 入力ごとの効果を別々に学ぶので、遠くまで予測できる',
        '＋ データが少なくても安定しやすい',
        R`− 交互作用（$x_1$ と $x_2$ の組み合わせの効果）は表せない`,
        R`→ 必要なら $k_1 + k_2 + k_1 k_2$ のように2次の項を足す（Duvenaud ら, 2011）`,
      ].forEach((line, i) => ui.text(line, { x: 965, y: 450 + i * 64, w: 520, size: 21, lh: 1.4, at: 5, delay: 0.4 + i * 0.6, color: i === 3 ? C.text2 : C.text }));
    },
  });

  // 第8章の例: 真の関数は加法（説明用に作ったもの）。データは L 字の2本の線の上だけ
  const surfaceTruth = (a, b) => Math.sin(1.3 * a) + 0.8 * Math.cos(1.1 * b);
  const L_POINTS = [];
  G.linspace(-3, 3, 12).forEach((v) => L_POINTS.push([v, -2.5]));
  G.linspace(-3, 3, 12).forEach((v) => {
    if (Math.abs(v + 2.5) > 0.3) L_POINTS.push([-2.5, v]);
  });
  const L_NOISE = G.standardNormals(L_POINTS.length, 801);
  const L_Y = Float64Array.from(L_POINTS, (p, i) => surfaceTruth(p[0], p[1]) + 0.05 * L_NOISE[i]);

  // ---------------------------------------------------------------- 第8章 図解（2次元）
  SCENES.push({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: '加法と積を2次元で比べる',
    beats: [
      beat('点 (0, 0) と平面上の各点とのカーネルの値を、色で表しました。左が加法、右が積です。'),
      beat(R`積は (0, 0) の周りだけが明るい丸。加法は十字形で、$x_1$ か $x_2$ のどちらかが同じなら相関が残ります。`, 10),
      beat(R`サンプルで見ると、加法は横縞と縦縞を重ねた「格子柄」になります。上と左の曲線が $f_1$ と $f_2$ です。`, 10),
      beat('積カーネルのサンプルは、方向に関係のない、丸いまだら模様になります。', 7),
      beat('データが L 字の2本の線の上にしかない場合を考えます。左が真の関数です。'),
      beat('積カーネル（中央）は、データから離れた右上で、平均 0 に戻ってしまいます。', 8),
      beat(R`加法カーネル（右）は、線の上で学んだ $f_1$ と $f_2$ を組み合わせて、データのない右上まで予測できます。`, 10),
      beat('ただし真の関数に交互作用があると、加法カーネルはそれを表せません。データの性質に合わせて選びます。', 9),
    ],
    build() {
      const n = 80;
      const axis = G.linspace(-3, 3, n);
      const kernelAdd = (a, b) => HALF_RBF(a[0], b[0]) + HALF_RBF(a[1], b[1]);
      const kernelProd = (a, b) => UNIT_RBF(a[0], b[0]) * UNIT_RBF(a[1], b[1]);
      // 行 i が x2（上が大きい）、列 j が x1
      const cellPoint = (i, j) => [axis[j], axis[n - 1 - i]];
      const addMap = heatmapCanvas(n, n, (i, j) => seqColor(kernelAdd([0, 0], cellPoint(i, j))));
      const prodMap = heatmapCanvas(n, n, (i, j) => seqColor(kernelProd([0, 0], cellPoint(i, j))));

      // サンプル: 加法は1次元サンプルの和、積はクロネッカー積 L Z Lᵀ
      const m = 60;
      const sAxis = G.linspace(-3, 3, m);
      const SAMPLE_ELL = 0.8;
      const halfSample = G.rbf({ variance: 0.5, lengthScale: SAMPLE_ELL });
      const f1 = G.sampleFunctions(sAxis, halfSample, [G.standardNormals(m, 878)])[0];
      const f2 = G.sampleFunctions(sAxis, halfSample, [G.standardNormals(m, 873)])[0];
      const Lchol = G.cholesky(G.withDiagonal(G.gram(sAxis, sAxis, G.rbf({ variance: 1, lengthScale: SAMPLE_ELL })), 1e-6), { lenient: true });
      const Z = Array.from({ length: m }, (_, r) => G.standardNormals(m, 900 + r));
      const LZ = Z.map((_, i) => Float64Array.from({ length: m }, (__, b) => {
        let total = 0;
        for (let a = 0; a <= i; a++) total += Lchol[i][a] * Z[a][b];
        return total;
      }));
      const prodSample = LZ.map((row) => Float64Array.from({ length: m }, (_, j) => {
        let total = 0;
        for (let b = 0; b <= j; b++) total += row[b] * Lchol[j][b];
        return total;
      }));
      const SAMPLE_RANGE = 2.2;
      const addSampleMap = heatmapCanvas(m, m, (i, j) => divColor(clamp((f1[j] + f2[m - 1 - i]) / SAMPLE_RANGE, -1, 1)));
      const prodSampleMap = heatmapCanvas(m, m, (i, j) => divColor(clamp(prodSample[m - 1 - i][j] / SAMPLE_RANGE, -1, 1)));

      // L 字データからの予測
      const q = 60;
      const qAxis = G.linspace(-3, 3, q);
      const qPoints = [];
      for (let i = 0; i < q; i++) for (let j = 0; j < q; j++) qPoints.push([qAxis[j], qAxis[q - 1 - i]]);
      const fitAdd = G.fit(L_POINTS, L_Y, (a, b) => G.rbf({ variance: 1, lengthScale: 1.2 })(a[0], b[0]) + G.rbf({ variance: 1, lengthScale: 1.2 })(a[1], b[1]), 0.0025);
      const fitProd = G.fit(L_POINTS, L_Y, (a, b) => G.rbf({ variance: 1, lengthScale: 1.2 })(a[0], b[0]) * G.rbf({ variance: 1, lengthScale: 1.2 })(a[1], b[1]), 0.0025);
      const predAdd = G.predict(fitAdd, qPoints, fitAdd.kernel, { withVariance: false }).mean;
      const predProd = G.predict(fitProd, qPoints, fitProd.kernel, { withVariance: false }).mean;
      const RANGE = 1.9;
      const toMap = (values) => heatmapCanvas(q, q, (i, j) => divColor(clamp(values[i * q + j] / RANGE, -1, 1)));
      return {
        addMap, prodMap, addSampleMap, prodSampleMap, sAxis, f1, f2,
        truthMap: toMap(qPoints.map(([a, b]) => surfaceTruth(a, b))),
        predAddMap: toMap(predAdd),
        predProdMap: toMap(predProd),
        RANGE, SAMPLE_RANGE,
      };
    },
    draw(ctx, s, st) {
      const partA = 1 - s.p(2, 0.6);
      const partB = s.win(2, 4);
      const partC = s.p(4, 0.6, 0.3);
      const map = (img, x, y, size, title, alpha = 1, smooth = true) => {
        ctx.save();
        ctx.globalAlpha *= alpha;
        canvasText(ctx, title, x, y - 18, TITLE);
        drawImage(ctx, img, x, y, size, size, { smooth });
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
        canvasText(ctx, '−3', x, y + size + 22, { size: 15, color: C.muted });
        canvasText(ctx, 'x₁', x + size / 2, y + size + 26, { size: 18, color: C.text2, align: 'center' });
        canvasText(ctx, '3', x + size, y + size + 22, { size: 15, color: C.muted, align: 'right' });
        canvasText(ctx, 'x₂', x - 14, y + size / 2, { size: 18, color: C.text2, align: 'right' });
        ctx.restore();
      };
      if (partA > 0.001) {
        ctx.globalAlpha = partA;
        const SIZE = 440;
        map(st.addMap, 230, 205, SIZE, '加法 ½k₁(x₁) ＋ ½k₂(x₂)');
        map(st.prodMap, 830, 205, SIZE, '積 k₁(x₁) k₂(x₂)');
        colorBar(ctx, 1320, 205, 20, SIZE, (v) => seqColor(v), { min: 0, max: 1, ticks: [0, 0.5, 1], label: 'k((0,0), x)' });
        [[230, 205], [830, 205]].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x + SIZE / 2, y + SIZE / 2, 7, 0, Math.PI * 2);
          ctx.fillStyle = C.yellow;
          ctx.fill();
        });
        const cross = s.win(1, 2);
        if (cross > 0) {
          ctx.save();
          ctx.globalAlpha *= cross;
          ctx.setLineDash([8, 6]);
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 2;
          ctx.strokeRect(230 + SIZE / 2 - 18, 205, 36, SIZE);
          ctx.strokeRect(230, 205 + SIZE / 2 - 18, SIZE, 36);
          ctx.restore();
          canvasText(ctx, 'x₁ = 0 の列', 230 + SIZE / 2 + 26, 236, { size: 18, color: C.text, alpha: cross });
          canvasText(ctx, 'x₂ = 0 の行', 236, 205 + SIZE / 2 - 26, { size: 18, color: C.text, alpha: cross });
        }
      }
      if (partB > 0.001) {
        ctx.globalAlpha = partB;
        const SIZE = 400;
        const AX = 250;
        const AY = 260;
        map(st.addSampleMap, AX, AY, SIZE, '', 1);
        canvasText(ctx, '加法カーネルのサンプル', AX - 140, 160, TITLE);
        // 上に f1(x1)、左に f2(x2)
        const top = new Plot({ x: AX, y: AY - 86, w: SIZE, h: 72, xr: [-3, 3], yr: [-1.6, 1.6] });
        top.line(ctx, st.sAxis, st.f1, { color: C.blue, width: 3 });
        canvasText(ctx, 'f₁(x₁)', AX + SIZE + 10, AY - 40, { size: 18, color: C.text2 });
        ctx.save();
        ctx.strokeStyle = C.orange;
        ctx.lineWidth = 3;
        ctx.beginPath();
        st.sAxis.forEach((v, i) => {
          const px = AX - 95 + (st.f2[i] / 1.6) * 36;
          const py = AY + SIZE - ((v + 3) / 6) * SIZE;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
        canvasText(ctx, 'f₂(x₂)', AX - 95, AY + SIZE + 50, { size: 18, color: C.text2, align: 'center' });
        const prodAlpha = s.p(3, 0.8);
        map(st.prodSampleMap, 900, AY, SIZE, '積カーネルのサンプル', prodAlpha);
        colorBar(ctx, 1360, AY, 20, SIZE, (v) => divColor(v / st.SAMPLE_RANGE), { min: -st.SAMPLE_RANGE, max: st.SAMPLE_RANGE, ticks: [-2, 0, 2], digits: 0, label: 'f の値' });
      }
      if (partC > 0.001) {
        ctx.globalAlpha = partC;
        const SIZE = 380;
        const Y = 215;
        const xs = [100, 600, 1100];
        map(st.truthMap, xs[0], Y, SIZE, '真の関数（データは L 字の線上）');
        map(st.predProdMap, xs[1], Y, SIZE, '積カーネルの予測', s.p(5, 0.8));
        map(st.predAddMap, xs[2], Y, SIZE, '加法カーネルの予測', s.p(6, 0.8));
        const toScreen = (x0, [a, b]) => [x0 + ((a + 3) / 6) * SIZE, Y + SIZE - ((b + 3) / 6) * SIZE];
        xs.forEach((x0, k) => {
          const alpha = k === 0 ? 1 : s.p(4 + k, 0.8);
          L_POINTS.forEach((p) => {
            const [px, py] = toScreen(x0, p);
            ctx.save();
            ctx.globalAlpha *= alpha;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = C.yellow;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = C.bg;
            ctx.stroke();
            ctx.restore();
          });
        });
        const far = s.win(5, 7);
        if (far > 0) {
          [xs[1], xs[2]].forEach((x0, k) => {
            ctx.save();
            ctx.globalAlpha *= far * (k === 0 ? 1 : s.p(6, 0.8));
            ctx.strokeStyle = C.yellow;
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x0 + SIZE * 0.5, Y + 6, SIZE * 0.5 - 6, SIZE * 0.5 - 6);
            ctx.restore();
          });
          canvasText(ctx, 'データのない右上', xs[1] + SIZE * 0.75, Y + SIZE * 0.25 + 6, { size: 18, color: C.text, align: 'center', alpha: far });
        }
        colorBar(ctx, 1505, Y, 18, SIZE, (v) => divColor(v / st.RANGE), { min: -st.RANGE, max: st.RANGE, ticks: [-1.5, 0, 1.5], label: '' });
      }
    },
  });

  // ---------------------------------------------------------------- 第9章 理論（局所周期）
  const LONG_RBF = TREND_KERNEL;
  const productRows = [1, 3, 6].map((r) => ({ r, per: UNIT_PERIODIC(0, r), rbf: LONG_RBF(0, r) }));
  SCENES.push({
    id: '10T',
    chapter: 10,
    kind: 'theory',
    title: '積カーネル ― 局所周期',
    beats: [
      beat('最後に、積を使った例です。周期カーネルに長い RBF を掛けたものを、局所周期カーネルと呼びます。', 9),
      beat(R`掛けた RBF のために、周期がずれるほど相関が弱まります。$r = 1$ で ${fmt(productRows[0].per * productRows[0].rbf, 3)}、$r = 6$ で ${fmt(productRows[2].per * productRows[2].rbf, 3)} です。`, 10),
      beat('つまり「近い周期どうしは同じ形、遠い周期は違ってよい」という仮定になります。'),
      beat('季節の形が毎年同じなら和、少しずつ変わるなら積、と仮定に合わせて組み立てます。'),
    ],
    build(ui) {
      ui.tex(R`k_{\mathrm{LocPer}}(x,x') = k_{\mathrm{Per}}(x,x')\cdot k_{\mathrm{RBF}}(x,x')`, { x: LEFT_X, y: 135, size: 42 });
      ui.text(R`周期 $p = 1,\ \ell = 1$ ／ 掛ける RBF は長さスケール $\ell = 3$`, { x: LEFT_X + 30, y: 225, size: 24, color: C.text2 });
      ui.table({
        x: LEFT_X, y: 290, widths: [100, 180, 200, 200], size: 25, rowH: 48, at: 1,
        header: ['$r$', R`$k_{\mathrm{Per}}$`, R`$k_{\mathrm{RBF}}\ (\ell = 3)$`, '積'],
        rows: productRows.map(({ r, per, rbf }) => [String(r), fmt(per, 3), fmt(rbf, 3), `<b>${fmt(per * rbf, 3)}</b>`]),
        rowDelay: 0.6,
        glowRows: { 0: [{ from: 1, to: 2, color: C.yellow }], 2: [{ from: 1, to: 2, color: C.yellow }] },
      });
      ui.text('近い周期どうしは同じ形、遠い周期は違ってよい', { x: LEFT_X, y: 520, size: 30, weight: 700, at: 2, glow: [{ from: 2, to: 3, color: C.violet }] });
      ui.card({ x: 900, y: 290, w: 610, h: 300, title: '使い分け', at: 3 });
      [
        R`季節の形が毎年同じ → 和 $\ k_{\mathrm{RBF}} + k_{\mathrm{Per}}$`,
        R`季節の形が少しずつ変わる → 積 $\ k_{\mathrm{RBF}} \cdot k_{\mathrm{Per}}$`,
        R`両方ある → $k_{\mathrm{RBF}} + k_{\mathrm{RBF}} \cdot k_{\mathrm{Per}} + \cdots$`,
      ].forEach((line, i) => ui.text(line, { x: 925, y: 350 + i * 70, size: 24, at: 3, delay: 0.4 + i * 0.7 }));
    },
  });

  // ---------------------------------------------------------------- 第9章 図解
  SCENES.push({
    id: '10V',
    chapter: 10,
    kind: 'visual',
    title: '周期だけ・和・積のサンプル',
    beats: [
      beat('上から、周期だけ・和・積のカーネルと、そのサンプルです（周期 p = 1）。'),
      beat('周期だけ：まったく同じ形がくり返します。', 6),
      beat('和：同じ形の揺れが、ゆっくり上下するトレンドに乗ります。', 7),
      beat('積：揺れの形そのものが、周期ごとに少しずつ変わっていきます。', 8),
    ],
    build() {
      const grid = G.linspace(0, 8, 320);
      const lags = G.linspace(0, 6, 240);
      const z = [G.standardNormals(grid.length, 931)];
      const rows = [
        { title: '周期だけ', k: UNIT_PERIODIC, color: C.orange },
        { title: '和：½RBF ＋ ½周期', k: G.sum(G.rbf({ variance: 0.5, lengthScale: 3 }), G.periodic({ variance: 0.5, lengthScale: 1, period: 1 })), color: C.aqua },
        { title: '積：RBF × 周期', k: G.product(LONG_RBF, UNIT_PERIODIC), color: C.violet },
      ];
      rows.forEach((row, i) => {
        const y = 180 + i * 200;
        row.shape = lags.map((r) => row.k(0, r));
        row.sample = G.sampleFunctions(grid, row.k, z)[0];
        row.kPlot = new Plot({ x: 110, y, w: 380, h: 125, xr: [0, 6], yr: [-0.05, 1.1] });
        row.sPlot = new Plot({ x: 600, y, w: 900, h: 125, xr: [0, 8], yr: [-2.8, 2.8] });
        row.last = i === 2;
      });
      return { rows, grid, lags };
    },
    draw(ctx, s, st) {
      st.rows.forEach((row, i) => {
        const appear = s.p(0, 0.8, i * 0.6);
        const focus = s.beat <= 0 || s.beat === i + 1 ? 1 : 0.35;
        ctx.save();
        ctx.globalAlpha = appear * focus;
        canvasText(ctx, row.title, row.kPlot.x, row.kPlot.y - 14, TITLE);
        row.kPlot.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [0, 1], xlabel: row.last ? 'r' : undefined });
        row.kPlot.line(ctx, st.lags, row.shape, { color: row.color, width: 3 });
        row.sPlot.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8], yticks: [-2, 0, 2], xlabel: row.last ? 'x' : undefined });
        [1, 2, 3, 4, 5, 6, 7].forEach((v) => row.sPlot.vline(ctx, v, { alpha: 0.3 }));
        row.sPlot.line(ctx, st.grid, row.sample, { color: row.color, width: 3, upto: s.p(0, 2.5, 0.4 + i * 0.6) });
        ctx.restore();
      });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '11',
    chapter: 11,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat(R`まとめです。ガウス過程は、カーネルという「似ている度合いの計算」で、関数の性質を指定する方法でした。なめらかさは Matérn の $\nu$ で選べます。`, 10),
      beat('予測は α と k* の内積。周期カーネルは円への写像、加法カーネルは部品の足し算、質的変数は一致カーネルの足し算として計算できます。', 11),
      beat('カーネルの和と積を組み合わせれば、データについての仮定を、そのまま式に書けます。'),
    ],
    build(ui) {
      const points = [
        [0, R`ガウス過程は関数の上の正規分布（有限個の点では多変量正規分布）。カーネル $k(x,x')$ が2点の連動を決める`],
        [0, R`Matérn はなめらかさ $\nu$ を選べる（$m$ 回微分できる $\iff \nu > m$）。スペクトル密度で見ると $\nu \to \infty$ で RBF`],
        [0, R`予測平均 $\mu_* = \mathbf{k}_*^{\top}\boldsymbol{\alpha}$（カーネルの山の重ね合わせ）。分散はデータの位置だけで決まる`],
        [1, R`周期カーネル ＝ $x$ を円に写してから RBF。1周期ずれた点は相関 1`],
        [1, R`加法カーネル ＝ 独立な部品の和。$K$ も予測平均も、部品ごとの足し算に分解できる`],
        [1, R`入力次元の加法 ＝ $f_1(x_1) + f_2(x_2)$。交互作用なしと引き換えに、遠くまで予測できる`],
        [1, R`質的変数 ＝ 一致カーネルを足す。ずれは $\sigma_c^2 \sum_{i \in c} \alpha_i$、データの少ないカテゴリほど 0 へ縮む`],
        [2, R`和は OR、積は AND。仮定をカーネルの式として組み立てる`],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 124 + i * 50, size: 25, at, delay: (i % 3) * 0.6 }));
      ui.text('参考文献：C. E. Rasmussen & C. K. I. Williams, Gaussian Processes for Machine Learning, MIT Press, 2006 ／ D. Duvenaud, H. Nickisch & C. E. Rasmussen, Additive Gaussian Processes, NeurIPS 2011 ／ D. Duvenaud, Automatic Model Construction with Gaussian Processes, PhD thesis, 2014', {
        x: LEFT_X, y: 600, w: 1420, size: 17, color: C.muted, lh: 1.5, at: 2, delay: 1,
      });
    },
  });

  // ---------------------------------------------------------------- おわり（動画の終わりが分かるように、最後に1枚置く）
  SCENES.push({
    id: 'end',
    chapter: 12,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、ガウス過程回帰の解説は終わりです。よくある質問への答えは、別の動画にまとめています。', 9)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 220, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 380, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('ガウス過程回帰 ― カーネルの計算を、式と図で交互に理解する', { x: 0, y: 480, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
      ui.text('よくある質問は、別の動画「ガウス過程回帰 想定質問と回答」で解説しています', { x: 0, y: 560, w: W, align: 'center', size: 24, color: C.text2, delay: 1.2 });
    },
  });
})();
