// scenes-basic.js — 基礎編の場面（はじめに、第1〜4章）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
(() => {
  const { W, C, SERIES, CHAPTERS, Plot, fmt, texNum, texFactor, canvasText, legend, seqColor, heatmapCanvas, drawImage, keyframes, ramp, lerp, rgba } = KIT;
  const G = GPM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('ガウス過程回帰（GPR）を、基礎から発展まで順に見ていきます。'),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('後半の主役は、加法カーネルと周期カーネルの具体的な計算です。', 6),
    ],
    build(ui) {
      ui.text('ガウス過程回帰', { x: 0, y: 110, w: W, align: 'center', size: 78, weight: 800 });
      ui.text('カーネルの計算を、式と図で交互に理解する', { x: 0, y: 222, w: W, align: 'center', size: 34, color: C.text2, delay: 0.3 });
      ui.text('基礎編', { x: 210, y: 318, size: 22, color: C.muted, weight: 700, at: 1 });
      ui.text('発展編', { x: 840, y: 318, size: 22, color: C.muted, weight: 700, at: 1 });
      CHAPTERS.forEach((title, i) => {
        const basic = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, {
          x: basic ? 210 : 840,
          y: 362 + (basic ? i : i - 4) * 52,
          size: 26,
          at: 1,
          delay: 0.12 * i,
          glow: i >= 5 && i <= 8 ? [{ from: 2, color: C.yellow }] : undefined,
        });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 210, y: 610, size: 24, at: 1, delay: 1.4 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>グラフで見る`, { x: 210, y: 656, size: 24, at: 1, delay: 1.6 });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: 'ガウス過程とは ― 関数の上の確率分布',
    beats: [
      beat('ガウス過程は「関数そのもの」に確率分布を置く道具です。'),
      beat(R`決めるものは2つ。平均関数 $m(x)$ と、カーネル $k(x,x')$ です。平均は 0 とすることが多いです。`),
      beat('どんな有限個の点を取っても、その関数値の組は多変量正規分布に従います。'),
      beat(R`その共分散行列 $K$ の各要素を、カーネルが計算します。`),
      beat('つまりカーネルは、2点の関数値がどれだけ連動するかを決める関数です。'),
      beat('次の図解で、2点 → 多数の点 → 関数、と点を増やしていきます。', 5.5),
    ],
    build(ui) {
      ui.tex(R`f(x) \sim \mathcal{GP}\big(\,\htmlClass{hlM}{m(x)},\ \htmlClass{hlK1}{k(x,x')}\,\big)`, {
        x: LEFT_X, y: 150, size: 46,
        hl: [{ cls: 'hlM', from: 1, to: 2, color: C.blue }, { cls: 'hlK1', from: 1, to: 2, color: C.orange }],
      });
      ui.text(R`$m(x)$：平均関数（ふつうは 0）`, { x: LEFT_X + 30, y: 240, size: 26, color: C.text2, at: 1 });
      ui.text(R`$k(x,x')$：共分散関数 ＝ カーネル`, { x: LEFT_X + 30, y: 284, size: 26, color: C.text2, at: 1, delay: 0.4 });
      ui.tex(R`\begin{bmatrix} f(x_1)\\ \vdots \\ f(x_n)\end{bmatrix} \sim \mathcal{N}\!\left(\mathbf{0},\ K\right),\qquad \htmlClass{hlKij}{K_{ij} = k(x_i, x_j)}`, {
        x: LEFT_X, y: 360, size: 38, at: 2,
        hl: [{ cls: 'hlKij', from: 3, to: 4, color: C.yellow }],
      });
      ui.tex(R`\operatorname{Cov}\big(f(x),\, f(x')\big) = k(x,x')`, {
        x: LEFT_X, y: 575, size: 42, at: 4,
        glow: [{ from: 4, to: 5, color: C.yellow }],
      });
      ui.card({ x: CARD_X, y: 150, w: CARD_W, h: 360, title: '考え方', at: 2 });
      const steps = [
        '1点の値 → 正規分布',
        R`2点の値 → 2変量正規分布`,
        R`$n$ 点の値 → $n$ 変量正規分布`,
        '点を限りなく増やす → 関数の分布',
      ];
      steps.forEach((s, i) => ui.text(s, { x: CARD_X + 32, y: 215 + i * 66, size: 25, at: 2, delay: 0.5 + i * 0.7 }));
    },
  });

  // ---------------------------------------------------------------- 第1章 図解
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '2点から関数へ',
    beats: [
      beat(R`左は x 軸上の2点 $x_1, x_2$ での関数値、右はその2つの値の組を平面に打ったものです。`, 8),
      beat('2点が近いと相関が強く、点の組は右上がりの細長い楕円に集まります。左では2つの値がほぼ同じです。'),
      beat(R`$x_2$ を遠ざけると、カーネルの値（相関）が下がり、楕円は丸くなります。2つの値はばらばらに動きます。`, 10),
      beat('近い点ほど値が似る ― この性質を、カーネルが一手に決めています。', 7),
      beat('今度は点を増やします。5点でも、同じ規則で多変量正規分布から値を取り出せます。'),
      beat('15点、100点と増やすと、点の並びがなめらかな曲線に見えてきます。', 8),
      beat('これが「関数の上の確率分布」です。色ごとに1本の関数が、事前分布からのサンプルです。'),
    ],
    build() {
      const kernel = G.rbf({ variance: 1, lengthScale: 1 });
      const grid = G.linspace(0, 5, 101);
      return {
        kernel,
        z1: G.standardNormals(300, 101),
        z2: G.standardNormals(300, 102),
        grid,
        samples: G.sampleFunctions(grid, kernel, [211, 212, 213].map((seed) => G.standardNormals(grid.length, seed))),
        subsets: {
          5: [10, 30, 50, 70, 90],
          15: Array.from({ length: 15 }, (_, i) => Math.round(5 + (i * 90) / 14)),
          101: grid.map((_, i) => i),
        },
        left: new Plot({ x: 110, y: 205, w: 640, h: 470, xr: [0, 5], yr: [-3.2, 3.2] }),
        right: new Plot({ x: 1000, y: 205, w: 470, h: 470, xr: [-3.5, 3.5], yr: [-3.5, 3.5] }),
        full: new Plot({ x: 110, y: 170, w: 1380, h: 500, xr: [0, 5], yr: [-3.2, 3.2] }),
      };
    },
    draw(ctx, s, st) {
      const X1 = 1.5;
      const x2 = keyframes(s.u, [[s.bt(2) + 0.6, 1.65], [s.bt(2) + 7, 4.0], [s.bt(3) + 0.4, 4.0], [s.bt(3) + 2.4, 2.5]]);
      const rho = st.kernel(X1, x2);
      const partA = 1 - s.p(4, 0.6);
      const partB = s.p(4, 0.6, 0.4);
      const ticksY = [-3, -2, -1, 0, 1, 2, 3];

      if (partA > 0.001) {
        ctx.globalAlpha = partA;
        const L = st.left;
        const P = st.right;
        canvasText(ctx, '関数として見る：x 軸上の2点の値', L.x, L.y - 76, { size: 21, color: C.text, weight: 700 });
        canvasText(ctx, '2つの値の組を平面に打つ（300 回分）', P.x, P.y - 76, { size: 21, color: C.text, weight: 700 });
        L.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: ticksY, xlabel: 'x', ylabel: 'f(x)' });
        L.vline(ctx, X1);
        L.vline(ctx, x2);
        L.label(ctx, 'x₁', X1, -3.2, { dy: -10, align: 'center', size: 19, color: C.text2 });
        L.label(ctx, 'x₂', x2, -3.2, { dy: -10, align: 'center', size: 19, color: C.text2 });
        P.axes(ctx, { xticks: ticksY, yticks: ticksY, xlabel: 'f(x₁)', ylabel: 'f(x₂)' });
        const c = Math.sqrt(1 - rho * rho);
        const sx = [];
        const sy = [];
        for (let i = 3; i < 300; i++) {
          sx.push(st.z1[i]);
          sy.push(rho * st.z1[i] + c * st.z2[i]);
        }
        P.dots(ctx, sx, sy, { color: C.muted, r: 2.6, alpha: 0.6, ring: null });
        // 2σ の楕円: 固有ベクトル (1,1)/√2 と (1,−1)/√2、固有値 1±ρ
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
        for (let k = 0; k < 3; k++) {
          const f1 = st.z1[k];
          const f2 = rho * st.z1[k] + c * st.z2[k];
          L.line(ctx, [X1, x2], [f1, f2], { color: SERIES[k], width: 2.5, alpha: 0.8 });
          L.dots(ctx, [X1, x2], [f1, f2], { color: SERIES[k], r: 8 });
          P.dots(ctx, [f1], [f2], { color: SERIES[k], r: 9 });
        }
        canvasText(ctx, `距離 |x₂ − x₁| = ${fmt(x2 - X1, 2)}　　相関 k(x₁, x₂) = ${fmt(rho, 3)}`, P.x + P.w, P.y - 44, { size: 19, color: C.yellow, align: 'right', weight: 600 });
        canvasText(ctx, '点線：2σ の範囲', P.x + 12, P.y + 22, { size: 17, color: C.muted });
      }

      if (partB > 0.001) {
        ctx.globalAlpha = partB;
        const F = st.full;
        const stages = [
          { n: 5, t: s.bt(4) + 0.8 },
          { n: 15, t: s.bt(5) + 0.3 },
          { n: 101, t: s.bt(5) + 4 },
        ];
        const current = stages.filter((g) => s.u >= g.t).pop() || stages[0];
        const appear = ramp(s.u, current.t, current.t + 0.6);
        const lineProgress = s.p(6, 1.8);
        canvasText(ctx, `事前分布からのサンプル（RBF カーネル、ℓ = 1）`, F.x, F.y - 44, { size: 21, color: C.text, weight: 700 });
        canvasText(ctx, `点の数 n = ${current.n}`, F.x + F.w, F.y - 44, { size: 22, color: C.text, align: 'right', weight: 700 });
        F.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: ticksY, xlabel: 'x', ylabel: 'f(x)' });
        const idx = st.subsets[current.n];
        if (current.n <= 15) idx.forEach((i) => F.vline(ctx, st.grid[i], { alpha: 0.35 * appear }));
        const radius = current.n === 5 ? 9 : current.n === 15 ? 7 : 3.5;
        for (let k = 0; k < 3; k++) {
          F.line(ctx, st.grid, st.samples[k], { color: SERIES[k], width: 3, upto: lineProgress });
          F.dots(ctx, idx.map((i) => st.grid[i]), idx.map((i) => st.samples[k][i]), {
            color: SERIES[k], r: radius, alpha: appear * (1 - 0.85 * lineProgress), ring: current.n === 101 ? null : C.bg,
          });
        }
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: 'RBF カーネルの計算',
    beats: [
      beat(R`最もよく使うのが RBF カーネル（ガウスカーネル）です。2点の距離 $r = |x - x'|$ だけで決まります。`),
      beat(R`$\sigma_f^2$ は関数の縦の振れ幅を決めます。$r = 0$ のとき、$k$ は $\sigma_f^2$ になります。`),
      beat(R`$\ell$ は長さスケール。$r$ が $\ell$ と同じくらいになると、相関は大きく下がります。`),
      beat(R`$\sigma_f^2 = 1,\ \ell = 1$ で計算すると、$r = 1$ で 0.607、$r = 2$ で 0.135、$r = 3$ でほぼ 0 です。`, 10),
      beat(R`3点 $x = 0, 1, 3$ なら、すべての組み合わせを計算して 3×3 の行列 $K$ を作ります。`),
      beat(R`$K$ は対称で、対角はすべて $\sigma_f^2$。カーネルは、この行列が必ず正定値になる関数でなければなりません。`, 10),
    ],
    build(ui) {
      ui.tex(R`k_{\mathrm{RBF}}(x,x') = \htmlClass{hlS}{\sigma_f^2}\, \exp\!\left(-\frac{(x-x')^2}{2\,\htmlClass{hlL}{\ell}^{2}}\right)`, {
        x: LEFT_X, y: 150, size: 46,
        hl: [{ cls: 'hlS', from: 1, to: 2, color: C.blue }, { cls: 'hlL', from: 2, to: 3, color: C.orange }],
      });
      ui.text(R`$\sigma_f^2$：縦の振れ幅（分散）`, { x: LEFT_X + 30, y: 270, size: 26, color: C.text2, at: 1 });
      ui.text(R`$\ell$：横の長さスケール（どれだけ離れると似なくなるか）`, { x: LEFT_X + 30, y: 314, size: 26, color: C.text2, at: 2 });

      const kernel = G.rbf({ variance: 1, lengthScale: 1 });
      ui.card({ x: CARD_X, y: 150, w: CARD_W, h: 340, title: R`計算例（$\sigma_f^2 = 1,\ \ell = 1$）`, at: 3 });
      const distances = [0, 0.5, 1, 2, 3];
      ui.table({
        x: CARD_X + 24, y: 210, widths: [130, 150, 170], size: 24, rowH: 44, at: 3,
        header: ['$r$', R`$r^2/2\ell^2$`, '$k$'],
        rows: distances.map((r) => [String(r), String((r * r) / 2), fmt(kernel(0, r), 3)]),
        rowDelay: 0.6,
        glowRows: { 2: [{ from: 3, to: 4, color: C.yellow }], 3: [{ from: 3, to: 4, color: C.yellow }] },
      });

      const xs = [0, 1, 3];
      const K = G.gram(xs, xs, kernel);
      const cell = (v) => (v === 1 ? '1' : texNum(v, 3));
      ui.text(R`3点 $x = (0,\ 1,\ 3)$ のとき`, { x: LEFT_X, y: 410, size: 26, color: C.text2, at: 4 });
      ui.tex(R`K = \begin{bmatrix} ${K.map((row) => Array.from(row).map(cell).join(' & ')).join(' \\\\ ')} \end{bmatrix}`, { x: LEFT_X + 30, y: 460, size: 36, at: 4 });
      ui.text(R`対称・対角は $\sigma_f^2$・正定値（どんな $\mathbf{v} \neq \mathbf{0}$ でも $\mathbf{v}^{\top} K\, \mathbf{v} > 0$）`, {
        x: LEFT_X, y: 640, size: 26, at: 5, glow: [{ from: 5, color: C.yellow }],
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: 'カーネル行列と長さスケール',
    beats: [
      beat('6つの点について、すべての組み合わせでカーネルを計算し、行列を埋めていきます。', 9),
      beat('対角（同じ点どうし）は 1。離れた組ほど値が小さくなり、色が暗くなります。'),
      beat(R`点を 60 個に増やすと、行列は対角に沿った明るい帯になります。帯の幅が $\ell$ です。`),
      beat(R`$\ell = 0.3$：帯が細く、近くの点としか連動しないので、関数は細かく揺れます。`),
      beat(R`$\ell$ を大きくしていくと、帯が太くなり、関数はゆっくり変化するようになります。`, 9),
      beat(R`$\ell = 3$：遠くの点まで強く連動し、ほぼ直線に近い、なめらかな関数になります。`),
      beat(R`サンプルは $K = LL^{\top}$（コレスキー分解）と標準正規乱数 $\mathbf{z}$ から $\mathbf{f} = L\mathbf{z}$ で作っています。`, 9),
    ],
    build() {
      const xs6 = [0, 0.5, 1, 2, 3, 4.5];
      return {
        xs6,
        K6: G.gram(xs6, xs6, G.rbf()),
        heatGrid: G.linspace(0, 5, 60),
        sampleGrid: G.linspace(0, 5, 100),
        normals: [301, 302, 303].map((seed) => G.standardNormals(100, seed)),
        line: new Plot({ x: 760, y: 330, w: 700, h: 10, xr: [-0.2, 4.8], yr: [0, 1] }),
        samplePlot: new Plot({ x: 660, y: 170, w: 840, h: 330, xr: [0, 5], yr: [-3, 3] }),
        kernelPlot: new Plot({ x: 660, y: 580, w: 840, h: 130, xr: [0, 5], yr: [0, 1.05] }),
        heatBuffer: document.createElement('canvas'),
      };
    },
    draw(ctx, s, st) {
      const partA = 1 - s.p(2, 0.6);
      const partB = s.p(2, 0.6, 0.3);
      const n = st.xs6.length;
      const CELL = 74;
      const OX = 150;
      const OY = 200;

      if (partA > 0.001) {
        ctx.globalAlpha = partA;
        const fillStart = s.bt(0) + 0.8;
        const perCell = 0.17;
        const shown = Math.min(n * n, Math.floor((s.u - fillStart) / perCell) + 1);
        canvasText(ctx, 'カーネル行列 K（6×6）', OX, OY - 52, { size: 21, color: C.text, weight: 700 });
        for (let i = 0; i < n; i++) {
          canvasText(ctx, fmt(st.xs6[i], 1), OX - 14, OY + i * CELL + CELL / 2 + 6, { size: 17, color: C.muted, align: 'right' });
          canvasText(ctx, fmt(st.xs6[i], 1), OX + i * CELL + CELL / 2, OY - 12, { size: 17, color: C.muted, align: 'center' });
        }
        for (let c = 0; c < n * n; c++) {
          const i = Math.floor(c / n);
          const j = c % n;
          const v = st.K6[i][j];
          const a = ramp(s.u, fillStart + c * perCell, fillStart + c * perCell + 0.25);
          ctx.strokeStyle = C.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(OX + j * CELL, OY + i * CELL, CELL, CELL);
          if (a <= 0) continue;
          const [r, g, b] = seqColor(v);
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(OX + j * CELL + 1, OY + i * CELL + 1, CELL - 2, CELL - 2);
          canvasText(ctx, v === 1 ? '1' : fmt(v, 3), OX + j * CELL + CELL / 2, OY + i * CELL + CELL / 2 + 6, {
            size: 17, color: v > 0.55 ? C.bg : C.text, align: 'center', weight: 600, alpha: a,
          });
        }
        const diagGlow = s.win(1, 2);
        if (diagGlow > 0) {
          ctx.save();
          ctx.globalAlpha *= diagGlow;
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 3;
          for (let i = 0; i < n; i++) ctx.strokeRect(OX + i * CELL + 2, OY + i * CELL + 2, CELL - 4, CELL - 4);
          ctx.restore();
        }
        // いま計算している組を、右の数直線で見せる
        const L = st.line;
        canvasText(ctx, '計算している2点', L.x, 250, { size: 21, color: C.text, weight: 700 });
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.lineTo(L.x + L.w, L.y);
        ctx.stroke();
        for (const v of [0, 1, 2, 3, 4]) canvasText(ctx, String(v), L.sx(v), L.y + 30, { size: 16, color: C.muted, align: 'center' });
        st.xs6.forEach((x) => {
          ctx.beginPath();
          ctx.arc(L.sx(x), L.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = C.text2;
          ctx.fill();
        });
        if (shown >= 1 && s.u < fillStart + n * n * perCell + 0.6) {
          const c = shown - 1;
          const i = Math.floor(c / n);
          const j = c % n;
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 3;
          ctx.strokeRect(OX + j * CELL + 2, OY + i * CELL + 2, CELL - 4, CELL - 4);
          const xa = L.sx(st.xs6[i]);
          const xb = L.sx(st.xs6[j]);
          ctx.beginPath();
          ctx.moveTo(xa, L.y);
          ctx.quadraticCurveTo((xa + xb) / 2, L.y - 40 - Math.abs(xb - xa) * 0.25, xb, L.y);
          ctx.stroke();
          for (const px of [xa, xb]) {
            ctx.beginPath();
            ctx.arc(px, L.y, 9, 0, Math.PI * 2);
            ctx.fillStyle = C.yellow;
            ctx.fill();
          }
          const r = Math.abs(st.xs6[i] - st.xs6[j]);
          const text = i === j ? `同じ点（r = 0）→ k = 1` : `r = |${fmt(st.xs6[i], 1)} − ${fmt(st.xs6[j], 1)}| = ${fmt(r, 1)}　→　k = exp(−r²/2) = ${fmt(st.K6[i][j], 3)}`;
          canvasText(ctx, text, L.x, L.y + 90, { size: 22, color: C.text });
        }
      }

      if (partB > 0.001) {
        ctx.globalAlpha = partB;
        const ell = keyframes(s.u, [[s.bt(3), 1], [s.bt(3) + 1.5, 0.3], [s.bt(4) + 0.5, 0.3], [s.bt(4) + 7, 3], [s.bt(6), 3], [s.bt(6) + 1.5, 1]], { log: true });
        const kernel = G.rbf({ variance: 1, lengthScale: ell });
        const HX = 100;
        const HY = 210;
        const HS = 450;
        const m = st.heatGrid.length;
        const image = heatmapCanvas(m, m, (i, j) => seqColor(kernel(st.heatGrid[i], st.heatGrid[j])), st.heatBuffer);
        canvasText(ctx, `カーネル行列 K（60×60）`, HX, HY - 42, { size: 21, color: C.text, weight: 700 });
        drawImage(ctx, image, HX, HY, HS, HS);
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(HX - 0.5, HY - 0.5, HS + 1, HS + 1);
        canvasText(ctx, 'x = 0', HX, HY + HS + 24, { size: 16, color: C.muted });
        canvasText(ctx, 'x = 5', HX + HS, HY + HS + 24, { size: 16, color: C.muted, align: 'right' });

        const P = st.samplePlot;
        const samples = G.sampleFunctions(st.sampleGrid, kernel, st.normals);
        canvasText(ctx, '事前分布からのサンプル', P.x, P.y - 42, { size: 21, color: C.text, weight: 700 });
        canvasText(ctx, `ℓ = ${fmt(ell, 2)}`, P.x + P.w, P.y - 40, { size: 30, color: C.yellow, align: 'right', weight: 800 });
        P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'x' });
        samples.forEach((f, k) => P.line(ctx, st.sampleGrid, f, { color: SERIES[k], width: 3 }));

        const Q = st.kernelPlot;
        const rs = G.linspace(0, 5, 120);
        canvasText(ctx, 'カーネルの形 k(r)', Q.x, Q.y - 16, { size: 18, color: C.text2 });
        Q.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [0, 1], xlabel: 'r = |x − x′|' });
        Q.line(ctx, rs, rs.map((r) => kernel(0, r)), { color: C.text, width: 3 });
        Q.vline(ctx, Math.min(ell, 5), { color: C.yellow, alpha: 0.9 });
        Q.label(ctx, 'r = ℓ', Math.min(ell, 4.7), 1.0, { dx: 8, size: 16, color: C.text2 });
      }
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（予測の式）
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '予測の式 ― 正規分布の条件付け',
    beats: [
      beat(R`観測値 $y$ は、関数値 $f(x)$ に平均 0、分散 $\sigma_n^2$ のノイズが乗ったものと考えます。`),
      beat(R`観測 $\mathbf{y}$ と、予測したい点 $x_*$ の値 $f_*$ を並べると、これも1つの多変量正規分布になります。`, 10),
      beat(R`正規分布の条件付きの公式を使うと、予測の平均 $\mu_*$ はこの形になります。`),
      beat(R`予測の分散 $\sigma_*^2$ は、事前の分散 $k_{**}$ から、データで説明できた分を引いたものです。`, 10),
      beat(R`$\boldsymbol{\alpha} = (K + \sigma_n^2 I)^{-1}\mathbf{y}$ と置くと、予測平均はカーネルの山 $k(x_*, x_i)$ を $\alpha_i$ で重ねた和になります。`, 11),
      beat(R`分散の式に $\mathbf{y}$ は入っていません。不確かさは、データの「位置」だけで決まります。`),
    ],
    build(ui) {
      ui.tex(R`y_i = f(x_i) + \varepsilon_i,\qquad \varepsilon_i \sim \mathcal{N}(0,\ \sigma_n^2)`, { x: LEFT_X, y: 130, size: 38 });
      ui.tex(R`\begin{bmatrix}\mathbf{y}\\ f_*\end{bmatrix} \sim \mathcal{N}\!\left(\mathbf{0},\ \begin{bmatrix} K+\sigma_n^2 I & \mathbf{k}_* \\ \mathbf{k}_*^{\top} & k_{**}\end{bmatrix}\right)`, { x: LEFT_X, y: 218, size: 38, at: 1 });
      ui.text(R`$\mathbf{k}_* = \big(k(x_*,x_1), \dots, k(x_*,x_n)\big)^{\top}$、　$k_{**} = k(x_*, x_*)$`, { x: LEFT_X + 700, y: 250, size: 24, color: C.text2, at: 1, delay: 0.6 });
      ui.tex(R`\mu_* = \mathbf{k}_*^{\top}\,\htmlClass{hlA1}{(K+\sigma_n^2 I)^{-1}\mathbf{y}}`, {
        x: LEFT_X, y: 375, size: 42, at: 2, hl: [{ cls: 'hlA1', from: 4, to: 5, color: C.yellow }],
      });
      ui.tex(R`\htmlClass{hlV}{\sigma_*^2 = k_{**} - \mathbf{k}_*^{\top}(K+\sigma_n^2 I)^{-1}\mathbf{k}_*}`, {
        x: LEFT_X, y: 470, size: 42, at: 3, hl: [{ cls: 'hlV', from: 5, color: C.blue }],
      });
      ui.tex(R`\htmlClass{hlA2}{\boldsymbol{\alpha} = (K+\sigma_n^2 I)^{-1}\mathbf{y}}\quad\Longrightarrow\quad \mu(x_*) = \sum_{i=1}^{n} \alpha_i\, k(x_*, x_i)`, {
        x: LEFT_X, y: 585, size: 42, at: 4, hl: [{ cls: 'hlA2', from: 4, to: 5, color: C.yellow }],
      });
      ui.text('予測平均', { x: 900, y: 390, size: 24, color: C.muted, at: 2 });
      ui.text('予測の分散（不確かさ）', { x: 900, y: 485, size: 24, color: C.muted, at: 3 });
    },
  });

  // 第3章の図解で使うデータ（真の関数は説明用に作ったもの）
  const trueCurve = (x) => 1.2 * Math.sin(1.3 * x) - 0.3 * x + 0.4;
  const POSTERIOR_X = [1.0, 3.2, 2.1, 0.3, 1.6, 2.7];
  const POSTERIOR_NOISE = G.standardNormals(POSTERIOR_X.length, 501);
  const POSTERIOR_Y = POSTERIOR_X.map((x, i) => trueCurve(x) + 0.1 * POSTERIOR_NOISE[i]);

  // ---------------------------------------------------------------- 第3章 図解（データを足す）
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: 'データを足すと予測が変わる',
    beats: [
      beat(R`データがない状態です。白い線が平均 0、帯が ±2σ（約 95%）の範囲、細い線はサンプルです。`),
      beat('1点観測すると、その近くでは帯が細くなり、サンプルはその点の近くを通るようになります。'),
      beat('点を増やすごとに、平均がデータをなめらかにつなぎ、帯が細くなっていきます。', 9.5),
      beat('データから離れた右側では、帯は事前の幅（±2）に戻ります。分からない所は、分からないと示します。', 9),
      beat(R`データ点の上でも帯の幅は 0 になりません。観測にノイズ（$\sigma_n = 0.1$）があると考えるからです。`),
    ],
    build() {
      const kernel = G.rbf({ variance: 1, lengthScale: 0.8 });
      const grid = G.linspace(0, 5, 200);
      const normals = [521, 522, 523].map((seed) => G.standardNormals(grid.length, seed));
      const stages = [];
      for (let n = 0; n <= POSTERIOR_X.length; n++) {
        if (n === 0) {
          stages.push({ mean: grid.map(() => 0), sd: grid.map(() => 1), samples: G.sampleFunctions(grid, kernel, normals) });
          continue;
        }
        const model = G.fit(POSTERIOR_X.slice(0, n), Float64Array.from(POSTERIOR_Y.slice(0, n)), kernel, 0.01);
        const p = G.predict(model, grid);
        stages.push({ mean: p.mean, sd: p.sd, samples: G.posteriorSamples(model, grid, normals) });
      }
      return { grid, stages, plot: new Plot({ x: 110, y: 170, w: 1380, h: 520, xr: [0, 5], yr: [-3, 3] }) };
    },
    draw(ctx, s, st) {
      const times = [s.bt(0), s.bt(1) + 0.3, s.bt(2) + 0.3, s.bt(2) + 3.3, s.bt(2) + 6.3, s.bt(3) + 0.3, s.bt(3) + 3.3];
      let n = 0;
      times.forEach((t, i) => {
        if (s.u >= t) n = i;
      });
      const k = n === 0 ? 1 : lerp(0, 1, ramp(s.u, times[n], times[n] + 0.8));
      const from = st.stages[Math.max(0, n - 1)];
      const to = st.stages[n];
      const mix = (a, b) => Array.from(a, (v, i) => lerp(v, b[i], k));
      const mean = mix(from.mean, to.mean);
      const sd = mix(from.sd, to.sd);
      const P = st.plot;
      canvasText(ctx, `観測した点の数 n = ${n}`, P.x + P.w, P.y - 40, { size: 24, color: C.text, align: 'right', weight: 700 });
      legend(ctx, [
        { label: '予測平均 μ(x)', color: C.text },
        { label: '±2σ の帯', color: C.blue, kind: 'band' },
        { label: '事後サンプル', color: C.text2, width: 1.5 },
      ], P.x, P.y - 44);
      P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'x' });
      P.band(ctx, st.grid, mean.map((m, i) => m - 2 * sd[i]), mean.map((m, i) => m + 2 * sd[i]), { color: C.blue, alpha: 0.26 });
      for (let j = 0; j < 3; j++) P.line(ctx, st.grid, mix(from.samples[j], to.samples[j]), { color: C.text2, width: 1.5, alpha: 0.55 });
      P.line(ctx, st.grid, mean, { color: C.text, width: 3.5 });
      if (n > 0) {
        P.dots(ctx, POSTERIOR_X.slice(0, n), POSTERIOR_Y.slice(0, n), { color: C.yellow, r: 8 });
        const pulse = ramp(s.u, times[n], times[n] + 0.9);
        if (pulse < 1) {
          ctx.save();
          ctx.globalAlpha *= 1 - pulse;
          ctx.strokeStyle = C.yellow;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(P.sx(POSTERIOR_X[n - 1]), P.sy(POSTERIOR_Y[n - 1]), 10 + pulse * 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      const farAlpha = s.win(3, 4);
      if (farAlpha > 0) {
        P.shade(ctx, 3.6, 5, { color: C.blue, alpha: 0.08 * farAlpha });
        P.label(ctx, 'データのない区間', 4.3, 2.75, { align: 'center', size: 19, color: C.text2, alpha: farAlpha });
      }
      const noteAlpha = s.p(4, 0.6);
      if (noteAlpha > 0) {
        const xi = POSTERIOR_X[0];
        const gi = Math.round((xi / 5) * (st.grid.length - 1));
        const top = mean[gi] + 2 * sd[gi];
        ctx.save();
        ctx.globalAlpha *= noteAlpha;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(P.sx(xi) + 10, P.sy(top) - 6);
        ctx.lineTo(P.sx(xi) + 70, P.sy(top) - 70);
        ctx.stroke();
        ctx.restore();
        P.label(ctx, `この点での幅 ±2σ = ±${fmt(2 * sd[gi], 2)}（0 ではない）`, xi, top, { dx: 76, dy: -76, size: 19, color: C.text, alpha: noteAlpha });
      }
    },
  });

  // 第3章の計算例（3点）。理論と図解で同じ数値を使う
  const EXAMPLE_X = [0, 1, 3];
  const EXAMPLE_Y = Float64Array.from([0.5, 1.0, -0.6]);
  const EXAMPLE_NOISE = 0.01;
  const EXAMPLE_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const EXAMPLE_MODEL = G.fit(EXAMPLE_X, EXAMPLE_Y, EXAMPLE_KERNEL, EXAMPLE_NOISE);
  const EXAMPLE_XSTAR = 2;

  // ---------------------------------------------------------------- 第3章 理論（3点で計算）
  SCENES.push({
    id: '3T-2',
    chapter: 3,
    kind: 'theory',
    title: '3点で実際に計算する',
    beats: [
      beat(R`具体的に計算します。データは $x = 0, 1, 3$ の3点、$y = 0.5,\ 1.0,\ -0.6$ です。`),
      beat(R`まず $K$ の対角に $\sigma_n^2 = 0.01$ を足した行列を作ります。カーネルは RBF（$\sigma_f^2 = 1,\ \ell = 1$）です。`, 10),
      beat(R`この行列で $\mathbf{y}$ を解いて $\boldsymbol{\alpha}$ を求めます。$\alpha_i$ は、各データ点の「山の高さ」になります。`, 9),
      beat(R`予測したい点 $x_* = 2$ と、各データ点とのカーネル $\mathbf{k}_*$ を計算します。`),
      beat(R`予測平均 $\mu_*$ は、$\mathbf{k}_*$ と $\boldsymbol{\alpha}$ の内積です。`),
      beat(R`分散も同じ $\mathbf{k}_*$ から計算します。$x_* = 2$ はデータ 1 と 3 の間なので、事前の 1 からかなり小さくなります。`, 11),
    ],
    build(ui) {
      const Ky = G.withDiagonal(G.gram(EXAMPLE_X, EXAMPLE_X, EXAMPLE_KERNEL), EXAMPLE_NOISE);
      const alpha = EXAMPLE_MODEL.alpha;
      const kStar = EXAMPLE_X.map((x) => EXAMPLE_KERNEL(EXAMPLE_XSTAR, x));
      const p = G.predict(EXAMPLE_MODEL, [EXAMPLE_XSTAR]);
      const mat = (M) => M.map((row) => Array.from(row).map((v) => texNum(v, 3)).join(' & ')).join(' \\\\ ');
      const vec = (v) => Array.from(v).map((x) => texNum(x, 3)).join(' \\\\ ');

      ui.text(R`データ $\ x = (0,\ 1,\ 3)$、$\ \mathbf{y} = (0.5,\ 1.0,\ -0.6)^{\top}$`, { x: LEFT_X, y: 125, size: 26 });
      ui.text(R`カーネル RBF（$\sigma_f^2 = 1,\ \ell = 1$）、ノイズ $\sigma_n^2 = 0.01$`, { x: LEFT_X + 720, y: 125, size: 26, color: C.text2 });
      ui.tex(R`K + \sigma_n^2 I = \begin{bmatrix} ${mat(Ky)} \end{bmatrix}`, { x: LEFT_X + 44, y: 195, size: 31, at: 1 });
      ui.tex(R`\boldsymbol{\alpha} = (K+\sigma_n^2 I)^{-1}\mathbf{y} = \begin{bmatrix} ${vec(alpha)} \end{bmatrix}`, {
        x: LEFT_X + 744, y: 195, size: 31, at: 2, glow: [{ from: 2, to: 3, color: C.yellow }],
      });
      ui.tex(R`\mathbf{k}_* = \big(k(2,0),\ k(2,1),\ k(2,3)\big)^{\top} = (${kStar.map((v) => texNum(v, 3)).join(',\\ ')})^{\top}`, { x: LEFT_X + 44, y: 380, size: 31, at: 3 });
      ui.tex(R`\mu_* = \mathbf{k}_*^{\top}\boldsymbol{\alpha} = ${kStar.map((v, i) => `${texNum(v, 3)}\\times${texFactor(alpha[i], 3)}`).join(' + ')} = \mathbf{${texNum(p.mean[0], 3)}}`, {
        x: LEFT_X + 44, y: 470, size: 31, at: 4, glow: [{ from: 4, to: 5, color: C.yellow }],
      });
      [['①', 0, 205, 1], ['②', 700, 205, 2], ['③', 0, 390, 3], ['④', 0, 480, 4], ['⑤', 0, 575, 5]].forEach(([mark, dx, y, at]) =>
        ui.text(mark, { x: LEFT_X + dx, y, size: 30, color: C.yellow, weight: 700, at }),
      );
      const explained = 1 - p.variance[0];
      ui.tex(R`\sigma_*^2 = k_{**} - \mathbf{k}_*^{\top}(K+\sigma_n^2 I)^{-1}\mathbf{k}_* = 1 - ${texNum(explained, 3)} = \mathbf{${texNum(p.variance[0], 3)}}\quad(\sigma_* = ${texNum(p.sd[0], 3)})`, {
        x: LEFT_X + 44, y: 565, size: 31, at: 5, glow: [{ from: 5, color: C.blue }],
      });
      ui.text('実際の計算では逆行列を作らず、コレスキー分解 $K + \\sigma_n^2 I = LL^{\\top}$ を使って解きます。', { x: LEFT_X, y: 670, size: 22, color: C.muted, at: 5, delay: 1 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（山の重ね合わせ）
  SCENES.push({
    id: '3V-2',
    chapter: 3,
    kind: 'visual',
    title: '予測平均 ＝ カーネルの山の重ね合わせ',
    beats: [
      beat(R`3つのデータ点です。1点ごとに、その点を中心とするカーネルの山 $k(x, x_i)$ を用意します。`),
      beat(R`山の高さを $\alpha_i$ 倍します。$\alpha_i$ が負なら、下向きの山になります。`),
      beat(R`3つの山を足し合わせると、予測平均 $\mu(x)$ の曲線になります。`),
      beat(R`$x_* = 2$ では、3つの山の値を足すと、さきほど計算した $\mu_* = ${texNum(G.predict(EXAMPLE_MODEL, [EXAMPLE_XSTAR]).mean[0], 3)}$ と一致します。`, 10),
      beat('データから遠い所では、どの山も 0 に近いので、予測平均も 0 に戻ります。RBF の予測は外挿が苦手です。', 10),
      beat('帯（±2σ）を重ねると、データの近くで細く、離れると広がるのが分かります。'),
    ],
    build() {
      const grid = G.linspace(-1.5, 5, 260);
      const bumps = EXAMPLE_X.map((xi) => grid.map((x) => EXAMPLE_KERNEL(x, xi)));
      const p = G.predict(EXAMPLE_MODEL, grid);
      return { grid, bumps, p, plot: new Plot({ x: 110, y: 170, w: 1380, h: 520, xr: [-1.5, 5], yr: [-1.6, 2.2] }) };
    },
    draw(ctx, s, st) {
      const P = st.plot;
      const alpha = EXAMPLE_MODEL.alpha;
      P.axes(ctx, { xticks: [-1, 0, 1, 2, 3, 4, 5], yticks: [-1, 0, 1, 2], xlabel: 'x' });
      legend(ctx, [
        ...EXAMPLE_X.map((x, i) => ({ label: `α${'₁₂₃'[i]} k(x, ${x})`, color: SERIES[i] })),
        { label: '予測平均 μ(x)', color: C.text },
      ], P.x, P.y - 44);
      const scale = s.p(1, 2);
      const sumProgress = s.p(2, 2.5, 0.3);
      const bandAlpha = s.p(5, 1);
      const mean = Array.from(st.p.mean);
      P.band(ctx, st.grid, mean.map((m, i) => m - 2 * st.p.sd[i]), mean.map((m, i) => m + 2 * st.p.sd[i]), { color: C.blue, alpha: 0.24 * bandAlpha });
      EXAMPLE_X.forEach((xi, i) => {
        const appear = s.p(0, 0.8, 1 + i * 1.2);
        const height = lerp(1, alpha[i], scale);
        const ys = st.bumps[i].map((v) => v * height);
        P.line(ctx, st.grid, ys, { color: SERIES[i], width: 3, alpha: appear * (1 - 0.45 * sumProgress), dash: scale < 1 ? [10, 7] : null });
        const peak = height;
        P.label(ctx, `α${'₁₂₃'[i]} = ${fmt(lerp(1, alpha[i], scale), 3)}`, xi, peak, { dx: 0, dy: peak >= 0 ? -14 : 30, align: 'center', size: 18, color: C.text2, alpha: appear * s.p(1, 0.6) });
      });
      P.line(ctx, st.grid, mean, { color: C.text, width: 4, upto: sumProgress });
      P.dots(ctx, EXAMPLE_X, Array.from(EXAMPLE_Y), { color: C.yellow, r: 8, alpha: s.p(0, 0.6) });

      const star = s.win(3, 4);
      if (star > 0) {
        P.vline(ctx, EXAMPLE_XSTAR, { color: C.yellow, alpha: star });
        const parts = EXAMPLE_X.map((xi, i) => alpha[i] * EXAMPLE_KERNEL(EXAMPLE_XSTAR, xi));
        parts.forEach((v, i) => P.dots(ctx, [EXAMPLE_XSTAR], [v], { color: SERIES[i], r: 8, alpha: star }));
        const mu = parts.reduce((a, b) => a + b, 0);
        P.dots(ctx, [EXAMPLE_XSTAR], [mu], { color: C.text, r: 9, alpha: star });
        const text = `x* = 2：${parts.map((v) => fmt(v, 3)).join(' + ').replace(/\+ −/g, '− ')} = ${fmt(mu, 3)}`;
        canvasText(ctx, text, P.sx(EXAMPLE_XSTAR) + 20, P.y + 40, { size: 22, color: C.text, weight: 600, alpha: star });
      }
      const far = s.win(4, 5);
      if (far > 0) {
        P.shade(ctx, -1.5, -0.8, { color: C.orange, alpha: 0.1 * far });
        P.shade(ctx, 4.3, 5, { color: C.orange, alpha: 0.1 * far });
        P.label(ctx, '平均 0 に戻る', 4.65, 1.6, { align: 'center', size: 19, color: C.text, alpha: far });
        P.label(ctx, '平均 0 に戻る', -1.15, 1.6, { align: 'center', size: 19, color: C.text, alpha: far });
      }
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '周辺尤度でハイパーパラメータを決める',
    beats: [
      beat(R`$\sigma_f,\ \ell,\ \sigma_n$ などのハイパーパラメータ $\theta$ は、周辺尤度を最大にするように決めるのが標準です。`, 9),
      beat(R`第1項は、データへの当てはまり。モデルが硬すぎてデータを説明できないと、大きく悪化します。`),
      beat(R`第2項は、複雑さの罰則。何でも表せる柔らかいモデルほど $|K_y|$ が大きく、罰が重くなります。`, 10),
      beat('2つが釣り合う点が θ の推定値です。勾配法で最大化します。局所解があるので、初期値を変えて何度か試します。', 11),
      beat(R`計算はコレスキー分解 $K_y = LL^{\top}$ で行います。行列式も解も $L$ から求まり、計算量は $O(n^3)$ です。`, 10),
    ],
    build(ui) {
      ui.tex(R`\log p(\mathbf{y}\mid X, \theta) = \underbrace{-\tfrac12\, \mathbf{y}^{\top}K_y^{-1}\mathbf{y}}_{\htmlClass{hlFit}{\text{当てはまり}}}\ \underbrace{-\ \tfrac12 \log|K_y|}_{\htmlClass{hlCx}{\text{複雑さの罰則}}}\ -\ \tfrac{n}{2}\log 2\pi`, {
        x: LEFT_X, y: 150, size: 42,
        hl: [{ cls: 'hlFit', from: 1, to: 2, color: C.blue }, { cls: 'hlCx', from: 2, to: 3, color: C.orange }],
      });
      ui.text(R`$K_y = K + \sigma_n^2 I$、　$\theta = (\sigma_f,\ \ell,\ \sigma_n)$`, { x: LEFT_X + 30, y: 310, size: 26, color: C.text2 });
      ui.tex(R`\theta^{\star} = \arg\max_{\theta}\ \log p(\mathbf{y}\mid X, \theta)`, { x: LEFT_X, y: 400, size: 40, at: 3, glow: [{ from: 3, to: 4, color: C.yellow }] });
      ui.tex(R`\log|K_y| = 2\sum_{i} \log L_{ii},\qquad K_y^{-1}\mathbf{y} = L^{-\top}\big(L^{-1}\mathbf{y}\big)`, { x: LEFT_X, y: 540, size: 36, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解
  const LML_X = G.linspace(0.2, 4.8, 10);
  const LML_NOISE = G.standardNormals(10, 401);
  const LML_Y = Float64Array.from(LML_X, (x, i) => Math.sin(1.4 * x) + 0.3 * Math.cos(3 * x) + 0.1 * LML_NOISE[i]);
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '長さスケール ℓ と周辺尤度',
    beats: [
      beat(R`10点のデータで、$\ell$ だけを動かして周辺尤度の2つの項を計算しました（$\sigma_f = 1,\ \sigma_n = 0.1$ で固定）。`, 10),
      beat(R`$\ell$ が小さいと、複雑さの項（オレンジ）が低く、合計（白）は伸びません。予測は点の間ですぐ 0 に戻ります。`, 11),
      beat(R`$\ell$ が大きすぎると、関数が硬くなってデータを通れず、当てはまりの項（青）が急に悪くなります。`, 10),
      beat(R`合計が最大になる $\ell$ で、データの通り方となめらかさの釣り合いが取れます。`, 9),
    ],
    build() {
      const ells = G.linspace(Math.log(0.05), Math.log(10), 220).map(Math.exp);
      const terms = ells.map((ell) => G.logMarginalLikelihood(LML_X, LML_Y, G.rbf({ variance: 1, lengthScale: ell }), 0.01));
      let best = 0;
      terms.forEach((t, i) => {
        if (t.total > terms[best].total) best = i;
      });
      return {
        ells, terms, bestEll: ells[best],
        curve: new Plot({ x: 110, y: 180, w: 680, h: 480, xr: [0.05, 10], yr: [-40, 22], logx: true }),
        fitPlot: new Plot({ x: 900, y: 180, w: 600, h: 480, xr: [0, 5], yr: [-2.6, 2.6] }),
        grid: G.linspace(0, 5, 160),
      };
    },
    draw(ctx, s, st) {
      const P = st.curve;
      const ell = keyframes(s.u, [[s.bt(1), 0.08], [s.bt(1) + 4, 0.08], [s.bt(2), 0.08], [s.bt(2) + 5, 6], [s.bt(3), 6], [s.bt(3) + 2.5, st.bestEll]], { log: true });
      const draw = s.p(0, 2.5, 0.5);
      canvasText(ctx, '対数周辺尤度の内訳（定数項は省略）', P.x, P.y - 60, { size: 21, color: C.text, weight: 700 });
      legend(ctx, [
        { label: '当てはまり', color: C.blue },
        { label: '複雑さの罰則', color: C.orange },
        { label: '合計', color: C.text },
      ], P.x, P.y - 24);
      P.axes(ctx, { xticks: [0.1, 0.3, 1, 3, 10], yticks: [-40, -20, 0, 20], xlabel: 'ℓ（対数目盛）', fmtX: (v) => String(v) });
      P.line(ctx, st.ells, st.terms.map((t) => t.dataFit), { color: C.blue, width: 3, upto: draw });
      P.line(ctx, st.ells, st.terms.map((t) => t.complexity), { color: C.orange, width: 3, upto: draw });
      P.line(ctx, st.ells, st.terms.map((t) => t.dataFit + t.complexity), { color: C.text, width: 4, upto: draw });
      const markerAlpha = s.p(1, 0.6);
      if (markerAlpha > 0) {
        P.vline(ctx, ell, { color: C.yellow, alpha: markerAlpha, dash: null, width: 2 });
        P.label(ctx, `ℓ = ${fmt(ell, 2)}`, ell, 22, { dx: 8, dy: 22, size: 19, color: C.text, alpha: markerAlpha });
        const bestAlpha = s.p(3, 0.6, 2.5);
        if (bestAlpha > 0) {
          const t = st.terms.reduce((a, b) => (b.dataFit + b.complexity > a.dataFit + a.complexity ? b : a));
          P.dots(ctx, [st.bestEll], [t.dataFit + t.complexity], { color: C.yellow, r: 9, alpha: bestAlpha });
          P.label(ctx, '最大', st.bestEll, t.dataFit + t.complexity, { dx: 14, dy: -12, size: 19, color: C.text, alpha: bestAlpha });
        }

        const F = st.fitPlot;
        const model = G.fit(LML_X, LML_Y, G.rbf({ variance: 1, lengthScale: ell }), 0.01);
        const p = G.predict(model, st.grid);
        canvasText(ctx, `この ℓ での予測（ℓ = ${fmt(ell, 2)}）`, F.x, F.y - 60, { size: 21, color: C.text, weight: 700, alpha: markerAlpha });
        ctx.save();
        ctx.globalAlpha *= markerAlpha;
        F.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-2, -1, 0, 1, 2], xlabel: 'x' });
        F.band(ctx, st.grid, Array.from(p.mean, (m, i) => m - 2 * p.sd[i]), Array.from(p.mean, (m, i) => m + 2 * p.sd[i]), { color: C.blue, alpha: 0.26 });
        F.line(ctx, st.grid, p.mean, { color: C.text, width: 3.5 });
        F.dots(ctx, LML_X, Array.from(LML_Y), { color: C.yellow, r: 7 });
        ctx.restore();
      }
    },
  });
})();
