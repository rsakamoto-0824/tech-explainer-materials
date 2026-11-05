// scenes-tps.js — 第5〜7章（TPS、RBF と TPS の関係、平滑化 TPS）、まとめ、おわり。書き方は scenes-basic.js と同じ。
// 曲げエネルギー・交差検証の誤差などの数値は、rbf-math.js で計算した値を表示する（読み上げ原稿にも同じ値を書いている）。
(() => {
  const { W, C, Plot, fmt, canvasText, keyframes, rgba, clamp, legend } = KIT;
  const M = RBFM;
  const V3 = VIEW3D;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };
  const GAUSS_COLOR = C.blue;
  const POLY_COLOR = C.orange;
  const sampleXs = (a, b, count = 360) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };

  // ---- 2次元の例（14点）の TPS とガウス RBF ----
  const DOMAIN = [-1.1, 1.1];
  const GRID_N = 40;
  const TPS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.thinPlate(), { degree: 1 });
  const EPS_2D = 1.6; // 比べるガウス RBF の幅（この例で曲げエネルギーが小さくなるあたり）
  const GAUSS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(EPS_2D));
  const ENERGY_TPS = M.thinPlateEnergy(TPS2);
  // ガウスの面は点から離れると 0 になるので、[−5, 5]² の数値積分で十分
  const ENERGY_HALF_WIDTH = 5;
  const ENERGY_STEP = 0.02;
  const ENERGY_GAUSS = M.bendingEnergyNumeric((p) => M.secondDerivativesGaussian(GAUSS2, EPS_2D, p), ENERGY_HALF_WIDTH, ENERGY_STEP);
  const Z_LO = -0.7;
  const Z_HI = 1.25;
  const zColor = V3.heightColor(Z_LO, Z_HI);
  const pinsFor = (top = 1) => M.DATA2_P.map(([x, y], j) => ({ x, y, z: M.DATA2_Y[j], top, head: `rgb(${zColor(M.DATA2_Y[j]).map(Math.round).join(',')})` }));

  // 曲げエネルギーの密度を色にする（平方根の目盛り。ピンの真上では log² で大きくなるので、上の方は切る）
  const ENERGY_COLOR_MAX = 40;
  const energyLevel = (e) => clamp(Math.sqrt(e / ENERGY_COLOR_MAX));
  const quadEnergy = (second, xr, n) => {
    const step = (xr[1] - xr[0]) / n;
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => M.energyDensity(second([xr[0] + step * (j + 0.5), xr[0] + step * (i + 0.5)]))));
  };
  const ENERGY_GRID_TPS = quadEnergy((p) => M.secondDerivativesThinPlate(TPS2, p), DOMAIN, GRID_N);
  const ENERGY_GRID_GAUSS = quadEnergy((p) => M.secondDerivativesGaussian(GAUSS2, EPS_2D, p), DOMAIN, GRID_N);
  const mixColor = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  // ---------------------------------------------------------------- 第5章 理論（曲げエネルギー）
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: 'TPS ― 曲げエネルギーが最小の板',
    beats: [
      beat('TPS（薄板スプライン）は、名前のとおり、薄い金属の板を各点の高さにピンで留めた形です。', 8),
      beat(R`板を曲げるエネルギー $J[f]$ は、2階微分の2乗の積分。平面なら 0、強く曲げるほど大きくなります。`, 9),
      beat('すべての点を通る関数の中で、この曲げエネルギーを最小にするもの。それが TPS です。', 8),
      beat(R`解くと、答えは $r^2\log r$ を重みつきで足し、平面を加えた形。RBF 補間そのものです（デュション、1977年）。`, 11),
      beat(R`$r^2\log r$ は、板の1点に力をかけたときのたわみの形。重み $w_j$ は、ピンが板を押す力にあたります。`, 10),
      beat('板は宙に浮いているので、力の合計もモーメントの合計も 0。これが、第4章の重みの条件の意味です。', 10),
    ],
    build(ui) {
      ui.text('薄い金属の板を、各点の高さにピンで留めた形', { x: LEFT_X, y: 126, size: 26, weight: 700 });
      ui.tex(R`J[f] = \iint_{\mathbb{R}^2} \left( f_{xx}^2 + 2 f_{xy}^2 + f_{yy}^2 \right) dx\,dy`, { x: LEFT_X, y: 186, size: 34, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text('曲げエネルギー：2階微分（曲がり具合）の2乗の積分。平面なら 0', { x: LEFT_X + 20, y: 284, size: 22, color: C.text2, at: 1, delay: 0.6 });
      ui.tex(R`\min_{f}\ J[f]\qquad \text{ただし}\ \ f(\mathbf{x}_i) = y_i\ \ (i = 1, \dots, n)`, { x: LEFT_X, y: 336, size: 30, at: 2 });
      ui.tex(R`\Longrightarrow\quad f(\mathbf{x}) = \sum_j w_j\, r_j^2 \log r_j + c_0 + c_1 x + c_2 y`, { x: LEFT_X, y: 406, size: 32, at: 3, glow: [{ from: 3, to: 4, color: C.yellow }] });
      ui.text(R`答え ＝ RBF 補間（$\varphi = r^2\log r$ ＋ 平面）`, { x: LEFT_X + 20, y: 490, size: 23, color: C.yellow, weight: 700, at: 3, delay: 0.6 });
      ui.tex(R`\Delta^2 \bigl( r^2 \log r \bigr) = 8\pi\,\delta`, { x: LEFT_X, y: 552, size: 30, at: 4 });
      ui.text(R`1点に力をかけたときの板のたわみ（基本解）。$w_j$ ＝ ピンが板を押す力`, { x: LEFT_X + 330, y: 556, w: 560, size: 21, color: C.text2, at: 4, delay: 0.5 });
      ui.text(R`力の合計 $\sum_j w_j = 0$、モーメントの合計 $\sum_j w_j x_j = \sum_j w_j y_j = 0$ → 板はつり合って動かない`, { x: LEFT_X, y: 640, w: 900, size: 22, at: 5, lh: 1.5 });

      ui.card({ x: CARD_X + 40, y: 126, w: CARD_W - 40, h: 300, title: '1次元版', at: 2 });
      ui.tex(R`\min \int f''(x)^2\, dx`, { x: CARD_X + 76, y: 180, size: 28, at: 2, delay: 0.4 });
      ui.text(R`→ 自然3次スプライン<br>（$\lvert r\rvert^3$ ＋ 直線、第4章の曲線）`, { x: CARD_X + 76, y: 250, size: 21, color: C.text2, at: 2, delay: 0.8 });
      ui.text('2次元で同じことをしたものが TPS', { x: CARD_X + 76, y: 352, size: 21, color: C.yellow, at: 2, delay: 1.2 });
      ui.card({ x: CARD_X + 40, y: 452, w: CARD_W - 40, h: 160, title: 'TPS の曲げエネルギー', at: 4 });
      ui.tex(R`J = 8\pi \sum_j w_j\, y_j`, { x: CARD_X + 76, y: 510, size: 28, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（ピンに板を張る）
  const POLY_GRID = V3.sampleGrid((x, y) => TPS2.polyAt([x, y]), DOMAIN, DOMAIN, GRID_N);
  const TPS_GRID = V3.sampleGrid((x, y) => TPS2.at([x, y]), DOMAIN, DOMAIN, GRID_N);
  const GAUSS_GRID = V3.sampleGrid((x, y) => GAUSS2.at([x, y]), DOMAIN, DOMAIN, GRID_N);
  const BARS = { x: 1180, y: 636, w: 300, h: 30, gap: 52, max: Math.ceil(Math.max(ENERGY_TPS, ENERGY_GAUSS) / 10) * 10 };
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'ピンに、TPS の板を張る',
    beats: [
      beat(R`14本のピンに TPS の板を張ります。まず平面の部分 $c_0 + c_1x + c_2y$ です。`, 8),
      beat(R`そこへ $r^2\log r$ を重みつきで足していくと、板がしなって、すべてのピンの先を通ります。`, 9),
      beat('板の色を、曲げエネルギーの密度に変えます。明るいところほど強く曲がっています。山と谷のあいだで強く曲がり、外側はほぼ平らです。', 10),
      beat(R`同じピンを通るガウス RBF の面と、曲げエネルギーを比べます。$\varepsilon$ は、ガウスの曲げエネルギーがいちばん小さくなる値にしています。`, 10),
      beat(`TPS は ${fmt(ENERGY_TPS, 0)}、ガウス RBF は ${fmt(ENERGY_GAUSS, 0)}。すべての点を通る面の中で、TPS の曲げエネルギーがいちばん小さくなっています。`, 10),
    ],
    build(ui) {
      const X = 1010;
      ui.text(R`平面の部分 $p(\mathbf{x}) = c_0 + c_1x + c_2y$`, { x: X, y: 128, size: 23, until: 3 });
      ui.text(R`＋ $\sum_j w_j\, r_j^2\log r_j$ → すべてのピンを通る`, { x: X, y: 178, size: 23, at: 1, until: 3 });
      ui.text(R`板の色 ＝ 曲げエネルギーの密度 $f_{xx}^2 + 2f_{xy}^2 + f_{yy}^2$`, { x: X, y: 246, w: 500, size: 21, color: C.text2, at: 2, until: 3 });
      ui.text(R`同じピンを通るガウス RBF（$\varepsilon = ${EPS_2D}$）`, { ...TITLE, x: X, y: 128, at: 3 });
      ui.text('曲げエネルギー $J$', { ...TITLE, x: X, y: 590, at: 3 });
      ui.text('TPS', { x: X, y: BARS.y - 2, size: 22, weight: 700, at: 3 });
      ui.text(`ガウス RBF`, { x: X, y: BARS.y + BARS.gap - 2, size: 22, weight: 700, at: 3 });
      ui.text(R`（$\varepsilon$ はガウスの $J$ が最小になるあたり）`, { x: X + 330, y: 590, size: 17, color: C.muted, at: 3 });
    },
    draw(ctx, s) {
      const view = new V3.View({ cx: 490, cy: 470, scale: 250, azimuth: -0.62 + 0.012 * s.u, elevation: 0.52, zScale: 0.55, zBase: -0.9 });
      const plate = s.p(1, 3.0, 0.3);
      const grid = V3.blendGrid(POLY_GRID, TPS_GRID, plate);
      const energyK = s.p(2, 1.2);
      const color = (z, x, y, i, j) => mixColor(zColor(z), V3.energyRamp(energyLevel(ENERGY_GRID_TPS[i][j])), energyK);
      ctx.globalAlpha = 1;
      V3.drawFloor(ctx, view, DOMAIN, DOMAIN, { alpha: s.p(0, 0.6) });
      V3.drawScene(ctx, view, { grid, color, alpha: s.p(0, 1.0, 0.4), pins: pinsFor(s.p(0, 1.0)), headRadius: 9 });
      V3.rampBar(ctx, V3.energyRamp, 60, 560, 18, 160, { labels: [[0, '0'], [1, `${ENERGY_COLOR_MAX} 以上`]], title: '曲げの密度', alpha: energyK });

      // 比べるガウス RBF の面（同じ色の目盛り）
      const g = s.p(3, 0.8);
      if (g <= 0) return;
      const small = new V3.View({ cx: 1255, cy: 400, scale: 118, azimuth: -0.62 + 0.012 * s.u, elevation: 0.52, zScale: 0.55, zBase: -0.9 });
      const gColor = (z, x, y, i, j) => V3.energyRamp(energyLevel(ENERGY_GRID_GAUSS[i][j]));
      ctx.save();
      ctx.globalAlpha = g;
      V3.drawFloor(ctx, small, DOMAIN, DOMAIN, { step: 1.1 });
      V3.drawScene(ctx, small, { grid: GAUSS_GRID, color: gColor, pins: pinsFor(), headRadius: 5, mesh: false });
      ctx.restore();
      // エネルギーの棒
      const grow = s.p(4, 1.6);
      [[ENERGY_TPS, POLY_COLOR], [ENERGY_GAUSS, GAUSS_COLOR]].forEach(([value, barColor], i) => {
        const y = BARS.y + i * BARS.gap;
        ctx.save();
        ctx.globalAlpha = g;
        ctx.fillStyle = '#2a2a27';
        ctx.fillRect(BARS.x, y, BARS.w, BARS.h);
        ctx.fillStyle = barColor;
        ctx.fillRect(BARS.x, y, (BARS.w * value * grow) / BARS.max, BARS.h);
        ctx.restore();
        canvasText(ctx, fmt(value * grow, 0), BARS.x + (BARS.w * value * grow) / BARS.max + 10, y + 23, { size: 22, color: C.text, weight: 700, alpha: grow });
      });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（RBF と TPS の関係）
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: 'RBF と TPS の関係 ― 形と理由',
    beats: [
      beat(R`RBF と TPS の関係を整理します。RBF 補間は、基底関数 $\varphi$ と多項式 $p$ を選んで使う「枠組み」です。`, 9),
      beat(R`$\varphi$ に $r^2\log r$、$p$ に平面を選んだものが TPS。TPS は RBF の特別な場合です。`, 9),
      beat('逆に、曲げエネルギー最小という条件から出発すると、答えは必ずこの RBF の形になります。形は RBF、理由はエネルギー最小。2つの見方が同じ答えに行き着きます。', 13),
      beat(R`この考え方を次元に合わせて広げたのが多重調和スプライン。1次元では $r^3$、2次元では $r^2\log r$、3次元では $r$ になります。`, 11),
      beat('TPS には幅のパラメータがありません。全部の座標を同じ倍率で変えても、増えた分は平面の項に吸収され、同じ面になります。', 10),
    ],
    build(ui) {
      ui.tex(R`s(\mathbf{x}) = \sum_j w_j\,\htmlClass{hlPhi}{\varphi}(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + \htmlClass{hlP}{p(\mathbf{x})}`, {
        x: LEFT_X, y: 124, size: 36,
        hl: [{ cls: 'hlPhi', from: 1, to: 2, color: C.yellow }, { cls: 'hlP', from: 1, to: 2, color: C.yellow }],
      });
      ui.text(R`RBF 補間 ＝ 基底関数 $\varphi$ と多項式 $p$ を選ぶ「枠組み」`, { x: LEFT_X + 20, y: 204, size: 23, color: C.text2, delay: 0.6 });
      ui.tex(R`\varphi(r) = r^2\log r,\quad p(\mathbf{x}) = c_0 + c_1x + c_2y \quad\Longrightarrow\quad \text{TPS}`, { x: LEFT_X, y: 262, size: 30, at: 1 });
      ui.text('TPS は RBF の特別な場合', { x: LEFT_X + 20, y: 322, size: 24, weight: 700, color: C.yellow, at: 1, delay: 0.6 });
      // 2つの見方
      ui.card({ x: LEFT_X, y: 386, w: 410, h: 132, title: 'RBF から見ると ＝ 形', accent: C.blue, at: 2 });
      ui.text(R`$\varphi$ を各点に置いて足す`, { x: LEFT_X + 24, y: 446, size: 22, at: 2 });
      ui.card({ x: LEFT_X + 490, y: 386, w: 410, h: 132, title: 'TPS から見ると ＝ 理由', accent: C.orange, at: 2, delay: 0.5 });
      ui.text(R`曲げエネルギー $J[f]$ が最小`, { x: LEFT_X + 514, y: 446, size: 22, at: 2, delay: 0.5 });
      ui.text('⇄', { x: LEFT_X + 425, y: 426, size: 40, weight: 700, at: 2, delay: 0.8 });
      ui.text('→ 同じ答えに行き着く', { x: LEFT_X + 300, y: 530, size: 23, weight: 700, color: C.yellow, at: 2, delay: 1.2 });
      ui.text('スケール不変：全部の座標を $a$ 倍しても同じ面（幅の調整がいらない理由）', { x: LEFT_X, y: 604, size: 23, at: 4 });
      ui.tex(R`\varphi(ar) = a^2\varphi(r) + a^2\log a\cdot r^2\ \ \to\ \ \text{増えた } r^2 \text{ の分は平面に吸収}`, { x: LEFT_X, y: 652, size: 24, at: 4, delay: 0.6 });

      ui.card({ x: CARD_X + 20, y: 124, w: CARD_W - 20, h: 400, title: '多重調和スプライン（2階微分のエネルギー）', at: 3 });
      ui.table({
        x: CARD_X + 40, y: 178, widths: [90, 150, 210], aligns: ['center', 'center', 'left'], size: 21, rowH: 56,
        header: ['次元', R`$\varphi(r)$`, '名前'],
        rows: [
          ['1', R`$r^3$`, '自然3次スプライン'],
          ['2', R`$r^2\log r$`, `<b style="color:${C.yellow}">薄板スプライン（TPS）</b>`],
          ['3', R`$r$`, '（3次元の多重調和）'],
        ],
        at: 3, rowDelay: 0.4, glowRows: [null, [{ from: 3, color: C.yellow }], null],
      });
      ui.text('どれも「多項式 ＋ 重みの条件」とセット', { x: CARD_X + 44, y: 440, size: 20, color: C.text2, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（家系図）
  const TREE = {
    root: { x: 520, y: 118, w: 560, h: 104 },
    left: { x: 90, y: 290, w: 640, h: 210 },
    right: { x: 870, y: 290, w: 640, h: 210 },
    gp: { x: 90, y: 570, w: 600, h: 170 },
    energy: { x: 910, y: 570, w: 600, h: 170 },
  };
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: 'RBF の家系図',
    beats: [
      beat('関係を家系図にまとめます。いちばん上が、RBF 補間という枠組みです。', 7),
      beat(R`左の枝は、幅 $\varepsilon$ を持つ基底関数。ガウス RBF 補間は、ノイズなしのガウス過程回帰の平均と同じ式で、基底関数が共分散にあたります。`, 13),
      beat(R`右の枝は、多重調和スプライン。次元ごとに基底関数が決まり、2次元の $r^2\log r$ が TPS です。`, 10),
      beat('右の枝の根拠が、曲げエネルギー最小という変分原理。ノイズがあるときの平滑化は、ガウス過程回帰のノイズの分散に対応します。', 12),
    ],
    build(ui) {
      const t = TREE;
      ui.card({ ...t.root, title: 'RBF 補間（枠組み）', accent: C.text2 });
      ui.tex(R`s(\mathbf{x}) = \sum_j w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + p(\mathbf{x})`, { x: t.root.x + 30, y: t.root.y + 50, size: 26 });
      ui.card({ ...t.left, title: R`幅 $\varepsilon$ を持つ（正定値など）`, accent: C.blue, at: 1 });
      [R`ガウス　$e^{-(\varepsilon r)^2}$`, R`逆多重二次　$1/\sqrt{1+(\varepsilon r)^2}$`, R`多重二次　$\sqrt{1+(\varepsilon r)^2}$`].forEach((text, i) =>
        ui.text(text, { x: t.left.x + 30, y: t.left.y + 60 + i * 46, size: 22, at: 1, delay: 0.3 + 0.2 * i, glow: i === 0 ? [{ from: 1, to: 2, color: C.blue }] : [] }),
      );
      ui.card({ ...t.gp, title: 'ガウス過程回帰・クリギング', accent: C.blue, at: 1, delay: 1.2 });
      ui.text(R`ガウス RBF 補間 ＝ ノイズなしのガウス過程回帰の平均<br>（$\varphi$ ＝ 共分散のカーネル）`, { x: t.gp.x + 30, y: t.gp.y + 62, w: 550, size: 21, color: C.text2, at: 1, delay: 1.5 });
      ui.card({ ...t.right, title: R`多重調和スプライン（$\varepsilon$ なし ＋ 多項式）`, accent: C.orange, at: 2 });
      [R`1次元　$r^3$　→ 自然3次スプライン`, R`2次元　$r^2\log r$　→ <b>TPS（薄板スプライン）</b>`, R`3次元　$r$`].forEach((text, i) =>
        ui.text(text, { x: t.right.x + 30, y: t.right.y + 60 + i * 46, size: 22, at: 2, delay: 0.3 + 0.2 * i, glow: i === 1 ? [{ from: 2, color: C.yellow }] : [] }),
      );
      ui.card({ ...t.energy, title: '変分原理（エネルギー最小）', accent: C.orange, at: 3 });
      ui.text(R`曲げエネルギー $J[f]$ を最小にする関数<br>→ $r^2\log r$ ＋ 平面（デュション、1977年）`, { x: t.energy.x + 30, y: t.energy.y + 62, w: 550, size: 21, color: C.text2, at: 3, delay: 0.3 });
      ui.text(R`平滑化 $\lambda$<br>↔ ノイズの分散`, { x: 690, y: 618, w: 220, align: 'center', size: 19, color: C.text2, at: 3, delay: 1.0 });
    },
    draw(ctx, s) {
      const t = TREE;
      const line = (points, alpha, color = C.axis, dash = null) => {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
      };
      const rootBottom = t.root.y + t.root.h;
      const mid = (rootBottom + t.left.y) / 2;
      const cx = t.root.x + t.root.w / 2;
      const leftX = t.left.x + t.left.w / 2;
      const rightX = t.right.x + t.right.w / 2;
      line([[cx, rootBottom], [cx, mid], [leftX, mid], [leftX, t.left.y]], s.p(1, 0.6), rgba(C.blue, 0.9));
      line([[cx, rootBottom], [cx, mid], [rightX, mid], [rightX, t.right.y]], s.p(2, 0.6), rgba(C.orange, 0.9));
      line([[t.gp.x + t.gp.w / 2, t.left.y + t.left.h], [t.gp.x + t.gp.w / 2, t.gp.y]], s.p(1, 0.6, 1.2), rgba(C.blue, 0.9));
      line([[t.energy.x + t.energy.w / 2, t.right.y + t.right.h], [t.energy.x + t.energy.w / 2, t.energy.y]], s.p(3, 0.6), rgba(C.orange, 0.9));
      line([[t.gp.x + t.gp.w, t.gp.y + 40], [t.energy.x, t.energy.y + 40]], s.p(3, 0.6, 0.8), C.text2, [8, 7]);
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（ガウス RBF と TPS を並べる）
  const COMPARE_N = 36;
  const FAR = 2.2;
  const DATA_FRAME = { xr: [-1, 1], yr: [-1, 1] };
  const S6V2 = {
    id: '6V2',
    chapter: 6,
    kind: 'visual',
    title: 'ガウス RBF と TPS を並べる',
    beats: [
      beat('同じ14点で、ガウス RBF と TPS の面を並べます。データのある白い枠の内側では、どちらもよく似た面です。', 10),
      beat('外側へ広げます。ガウスは点から離れると 0 へ戻り、TPS は平面に沿って伸びていきます。', 10),
      beat(R`ガウスは $\varepsilon$ を変えると、面の形が変わります。TPS には、調整するものがありません。`, 10),
      beat('使い分けを、表にまとめます。', 4),
      beat('何回でも微分できるなめらかさや、局所的な山が欲しいならガウス。調整なしで、なだらかで自然な面が欲しいなら TPS が向いています。', 12),
    ],
    build(ui) {
      ui.text(R`ガウス RBF（$\varepsilon$ を変えられる）`, { ...TITLE, x: 120, y: 120, until: 3 });
      ui.text('TPS（調整するものがない）', { ...TITLE, x: 900, y: 120, until: 3 });
      ui.table({
        x: 110, y: 130, widths: [250, 565, 565], aligns: ['left', 'left', 'left'], size: 22, rowH: 66,
        header: ['', `<span style="color:${C.blue}">ガウス RBF</span>`, `<span style="color:${C.orange}">TPS</span>`],
        rows: [
          ['調整するもの', R`幅 $\varepsilon$（結果を大きく左右）`, 'なし（スケール不変）'],
          ['解けるか', '必ず解ける（正定値）', '平面を足せば解ける（一直線でなければ）'],
          ['点から離れると', '0 に戻る', '平面に沿って伸びる'],
          ['なめらかさ', '何回でも微分できる', '点の上で2階微分が log で発散'],
          ['計算の安定性', R`$\varepsilon$ が小さいと不安定`, '比較的安定'],
          ['向く用途', '局所的な山、カーネル法', '地形や面内分布など、なだらかな面'],
        ],
        at: 3, rowDelay: 0.35, glowRows: [[{ from: 4, color: C.yellow }], null, null, null, null, [{ from: 4, color: C.yellow }]],
      });
    },
    draw(ctx, s) {
      const show = s.p(0, 0.6) * (1 - s.p(3, 0.8));
      if (show <= 0) return;
      const bt = s.bt;
      const range = keyframes(s.u, [[bt(1) + 0.3, 1.05], [bt(1) + 3.5, FAR]]);
      const eps = keyframes(s.u, [[bt(2) + 0.3, EPS_2D], [bt(2) + 2.6, 3.0], [bt(2) + 5.2, 1.0], [bt(2) + 7.5, EPS_2D]], { log: true });
      const gauss = eps === EPS_2D ? GAUSS2 : M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(eps));
      const xr = [-range, range];
      const azimuth = -0.62 + 0.01 * s.u;
      const make = (cx) => new V3.View({ cx, cy: 450, scale: 118, azimuth, elevation: 0.5, zScale: 0.55, zBase: -1.0 });
      [[make(420), (x, y) => gauss.at([x, y])], [make(1190), (x, y) => TPS2.at([x, y])]].forEach(([view, f]) => {
        ctx.save();
        ctx.globalAlpha = show;
        V3.drawFloor(ctx, view, [-FAR, FAR], [-FAR, FAR], { step: 1, frame: DATA_FRAME });
        V3.drawScene(ctx, view, { grid: V3.sampleGrid(f, xr, xr, COMPARE_N), color: zColor, pins: pinsFor(), headRadius: 6 });
        ctx.restore();
      });
      canvasText(ctx, `ε = ${fmt(eps, 2)}`, 420, 740, { size: 22, color: C.text, weight: 700, align: 'center', alpha: show * s.win(2) });
      canvasText(ctx, '白い点線 ＝ データのある範囲', 800, 740, { size: 18, color: C.muted, align: 'center', alpha: show * s.p(1, 0.6) * (1 - s.win(2)) });
    },
  };
  SCENES.push(S6V2);

  // ---------------------------------------------------------------- 第7章 理論（平滑化 TPS）
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '平滑化 TPS ― ノイズがあるとき',
    beats: [
      beat('実際のデータには、測定のばらつき（ノイズ）があります。全点を通すと、ノイズまで拾って、面が波打ちます。', 10),
      beat(R`そこで「点からのずれ」と「曲げエネルギー」の和を最小にします。$\lambda$ は、どちらを重く見るかを決める重みです。`, 10),
      beat(R`答えの形は同じ。$\Phi$ の対角に $8\pi\lambda$ を足すだけです。`, 7),
      beat(R`$\lambda = 0$ なら全点を通る補間。$\lambda$ を大きくすると曲げられなくなり、最後は最小二乗の平面になります。`, 10),
      beat(R`$\lambda$ は交差検証などで、データから選びます。ガウス過程回帰でいえば、ノイズの分散にあたります。`, 9),
    ],
    build(ui) {
      ui.text('測定のばらつき（ノイズ）→ 全点を通すと、ノイズまで拾って波打つ', { x: LEFT_X, y: 126, size: 24 });
      ui.tex(R`\min_f\ \underbrace{\sum_{i=1}^{n} \bigl( y_i - f(\mathbf{x}_i) \bigr)^2}_{\text{点からのずれ}} + \lambda\, \underbrace{J[f]}_{\text{曲げエネルギー}}`, { x: LEFT_X, y: 190, size: 34, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`\begin{bmatrix} \Phi + \htmlClass{hlDiag}{8\pi\lambda I} & P \\ P^\top & 0 \end{bmatrix}\begin{bmatrix}\mathbf{w}\\ \mathbf{c}\end{bmatrix} = \begin{bmatrix}\mathbf{y}\\ \mathbf{0}\end{bmatrix}`, {
        x: LEFT_X, y: 360, size: 30, at: 2, hl: [{ cls: 'hlDiag', from: 2, to: 3, color: C.yellow }],
      });
      ui.text(R`答えの形は同じ。$\Phi$ の対角に $8\pi\lambda$ を足すだけ`, { x: LEFT_X + 520, y: 400, w: 400, size: 22, color: C.text2, at: 2, delay: 0.6 });
      ui.text(R`$\lambda = 0$：補間（全点を通る）`, { x: LEFT_X, y: 520, size: 24, at: 3 });
      ui.text(R`$\lambda \to \infty$：曲げられない → 最小二乗の平面`, { x: LEFT_X + 440, y: 520, size: 24, at: 3, delay: 0.6 });
      ui.text(R`$\lambda$ は交差検証（1点抜き、GCV など）でデータから選ぶ`, { x: LEFT_X, y: 600, size: 24, at: 4 });
      ui.text(R`ガウス過程回帰でいえば、$\lambda$ はノイズの分散にあたる`, { x: LEFT_X, y: 648, size: 24, color: C.yellow, weight: 700, at: 4, delay: 0.6 });

      ui.card({ x: CARD_X + 60, y: 126, w: CARD_W - 60, h: 200, title: '1次元では', at: 3 });
      ui.tex(R`\sum_i \bigl(y_i - f(x_i)\bigr)^2 + \lambda\! \int f''(x)^2 dx`, { x: CARD_X + 84, y: 180, size: 22, at: 3, delay: 0.3 });
      ui.text(R`平滑化スプライン（対角に $12\lambda$）`, { x: CARD_X + 84, y: 262, size: 20, color: C.text2, at: 3, delay: 0.7 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（λ を変える）
  const P7 = new Plot({ x: 120, y: 150, w: 900, h: 560, xr: [0, 10], yr: [-1.2, 2.8] });
  const PCV = new Plot({ x: 1140, y: 190, w: 360, h: 300, xr: [-6, 3], yr: [0, 0.4] });
  const XS7 = sampleXs(0, 10, 500);
  const TRUE_CURVE = XS7.map(M.curve1D);
  const CV_STEP = 0.05;
  const CV_LOGS = Array.from({ length: Math.round(9 / CV_STEP) + 1 }, (_, i) => -6 + i * CV_STEP);
  const CV_VALUES = CV_LOGS.map((k) => M.leaveOneOutError(M.NOISY_X, M.NOISY_Y, 10 ** k));
  const CV_BEST = CV_LOGS[CV_VALUES.indexOf(Math.min(...CV_VALUES))];
  const LAMBDA_BEST = 10 ** CV_BEST;
  const LAMBDA_MIN = 1e-6;
  const LAMBDA_MAX = 1e3;
  const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const lambdaText = (lambda) => {
    if (lambda >= 0.01) return lambda < 10 ? fmt(lambda, 2) : fmt(lambda, 0);
    const exponent = Math.floor(Math.log10(lambda));
    return `${(lambda / 10 ** exponent).toFixed(1)} × 10${String(exponent).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`;
  };
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: R`$\lambda$ を変える（1次元の平滑化スプライン）`,
    beats: [
      beat(`ノイズを含む ${M.NOISY_X.length} 個の点です。点線が、もとのなめらかな関数です。`, 7),
      beat(R`$\lambda$ がほぼ 0 では全点を通るため、ノイズを拾って波打ちます。`, 7),
      beat(R`$\lambda$ を大きくすると曲げにくくなり、ノイズをならした、なめらかな曲線になります。`, 8),
      beat('さらに大きくすると、最後は最小二乗の直線になります。これでは山や谷が消えてしまいます。', 9),
      beat(R`右は1点抜き交差検証の誤差です。$\lambda \approx ${fmt(LAMBDA_BEST, 2)}$ で最小になり、もとの関数に近い曲線が選ばれます。`, 11),
    ],
    build(ui) {
      ui.text(R`1点抜き交差検証の誤差 $\mathrm{CV}(\lambda)$`, { ...TITLE, x: 1140, y: 132, at: 1 });
      ui.text(R`$\log_{10}\lambda$`, { x: 1420, y: 530, size: 18, color: C.text2, at: 1 });
    },
    draw(ctx, s) {
      const a = s.p(0, 0.6);
      P7.axes(ctx, { xticks: [0, 2, 4, 6, 8, 10], yticks: [-1, 0, 1, 2], xlabel: 'x', alpha: a });
      P7.line(ctx, XS7, TRUE_CURVE, { color: C.text2, width: 2, dash: [8, 7], alpha: a });
      const bt = s.bt;
      const lambda = keyframes(s.u, [[bt(2) + 0.3, LAMBDA_MIN], [bt(2) + 4.5, LAMBDA_BEST], [bt(3) + 0.3, LAMBDA_BEST], [bt(3) + 4.8, LAMBDA_MAX], [bt(4) + 0.3, LAMBDA_MAX], [bt(4) + 3.8, LAMBDA_BEST]], { log: true });
      const c = s.p(1, 0.8);
      if (c > 0) {
        const model = M.smoothingSpline1D(M.NOISY_X, M.NOISY_Y, lambda);
        P7.line(ctx, XS7, XS7.map((x) => model.at([x])), { color: POLY_COLOR, width: 4, alpha: c });
      }
      P7.dots(ctx, M.NOISY_X, M.NOISY_Y, { r: 6, color: C.text, alpha: a });
      legend(ctx, [{ color: C.text2, dash: [8, 7], width: 2, label: 'もとの関数' }, { color: POLY_COLOR, label: '平滑化スプライン' }], 140, 128, { alpha: a, size: 17 });
      if (c <= 0) return;
      canvasText(ctx, `λ = ${lambdaText(lambda)}`, P7.x + P7.w - 12, P7.y + 30, { size: 26, color: C.text, weight: 700, align: 'right', alpha: c });
      // 交差検証の誤差
      PCV.axes(ctx, { xticks: [-6, -3, 0, 3], yticks: [0, 0.2, 0.4], fmtY: (v) => fmt(v, 1), alpha: c });
      PCV.line(ctx, CV_LOGS, CV_VALUES, { color: C.aqua, width: 3, alpha: c });
      const best = s.p(4, 0.6, 0.4);
      PCV.vline(ctx, CV_BEST, { color: C.yellow, alpha: best });
      canvasText(ctx, `最小 λ ≈ ${fmt(LAMBDA_BEST, 2)}`, PCV.sx(CV_BEST) + 8, PCV.y + 22, { size: 17, color: C.yellow, weight: 700, alpha: best });
      const logLambda = Math.log10(lambda);
      const cvNow = M.leaveOneOutError(M.NOISY_X, M.NOISY_Y, lambda);
      ctx.save();
      ctx.globalAlpha = c;
      ctx.beginPath();
      ctx.arc(PCV.sx(logLambda), PCV.sy(Math.min(cvNow, 0.4)), 8, 0, Math.PI * 2);
      ctx.fillStyle = POLY_COLOR;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.bg;
      ctx.stroke();
      ctx.restore();
      canvasText(ctx, `CV = ${fmt(cvNow, 3)}`, PCV.x, PCV.y + PCV.h + 100, { size: 22, color: C.text, weight: 700, alpha: c });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '9',
    chapter: 9,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat(R`まとめです。RBF 補間は、距離だけで決まる山を、重みつきで足し合わせる方法。ガウスなどは、幅 $\varepsilon$ の調整が必要です。`, 11),
      beat(R`TPS は、$r^2\log r$ に平面を足した RBF で、曲げエネルギーが最小の板。調整がいらず、外側では平面に沿います。`, 11),
      beat('ノイズには平滑化を使います。説明変数が3つ以上なら標準化し、変数が増えるほど平面に近づくことに注意します。', 10),
    ],
    build(ui) {
      const points = [
        [0, R`RBF 補間 $s(\mathbf{x}) = \sum_j w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + p(\mathbf{x})$：距離の山を足す。重みは連立方程式、何次元でも同じ式`],
        [0, R`ガウスなどは幅 $\varepsilon$ が必要。大きいと「とげ」、小さいと条件数が大きく不安定`],
        [1, R`多重調和スプライン（$r^3$、$r^2\log r$）は多項式を足す。重みの条件 ＝ 力とモーメントのつり合い`],
        [1, R`TPS ＝ $\varphi = r^2\log r$ ＋ 平面の RBF ＝ 曲げエネルギー最小の板。調整なし・スケール不変`],
        [2, R`ノイズには平滑化 $\lambda$（0 で補間、∞ で最小二乗の平面）。ガウス過程回帰と同じ枠組み`],
        [2, '説明変数が3つ以上：式はそのまま解ける。標準化が必要で、変数が増えるほど「平面 ＋ 点のまわりの山」に近づく'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 124 + i * 62, size: 25, at, delay: (i % 2) * 0.6 }));
      ui.text('参考文献：J. Duchon, Splines minimizing rotation-invariant semi-norms in Sobolev spaces, Lecture Notes in Math. 571, Springer, 1977, 85–100 ／ R. L. Hardy, Multiquadric equations of topography and other irregular surfaces, J. Geophys. Res. 76 (1971) 1905–1915 ／ G. Wahba, Spline Models for Observational Data, SIAM, 1990 ／ H. Wendland, Scattered Data Approximation, Cambridge Univ. Press, 2005 ／ G. E. Fasshauer, Meshfree Approximation Methods with MATLAB, World Scientific, 2007 ／ N. El Karoui, The spectrum of kernel random matrices, Ann. Statist. 38 (2010) 1–50 ／ K. Beyer et al., When is "nearest neighbor" meaningful?, ICDT 1999, LNCS 1540, 217–235', {
        x: LEFT_X, y: 520, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 2, delay: 1,
      });
      ui.text('例のデータは、説明用に式と乱数（種を固定）で作ったものです', { x: LEFT_X, y: 712, size: 16, color: C.muted, at: 2, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、RBF と TPS の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('RBF と TPS ― 距離の山を足す枠組みと、曲げエネルギー最小の板', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
