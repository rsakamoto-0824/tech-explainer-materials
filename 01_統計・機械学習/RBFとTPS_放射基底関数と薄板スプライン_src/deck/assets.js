// assets.js — パワーポイントに貼る画像（数式と、斜めから見た面など）をページに描く。deck/make-assets.mjs が1つずつ撮って PNG にする。
// 計算と描画は動画と同じ部品（kit.js・rbf-math.js・view3d.js）を使う。図の背景は資料の濃紺にそろえる。
(() => {
  const { clamp, colorRamp, heatmapCanvas } = KIT;
  const M = RBFM;
  const V3 = VIEW3D;
  const root = document.getElementById('assets');
  const NAVY = '#22223B';
  const WHITE = '#FFFFFF';

  // ---- 数式（KaTeX）。color: 濃紺の帯の上は白、カードの上は濃紺 ----
  const R = String.raw;
  const FORMULAS = [
    ['rbf', R`s(\mathbf{x}) = \sum_{j=1}^{n} w_j\,\varphi(\lVert \mathbf{x} - \mathbf{x}_j \rVert)`, WHITE],
    ['interp', R`s(\mathbf{x}_i) = y_i \quad (i = 1, \dots, n)`, NAVY],
    ['system', R`\Phi\mathbf{w} = \mathbf{y},\qquad \Phi_{ij} = \varphi(\lVert \mathbf{x}_i - \mathbf{x}_j \rVert)`, NAVY],
    ['poly', R`s(\mathbf{x}) = \sum_{j=1}^{n} w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + c_0 + c_1 x + c_2 y`, WHITE],
    ['constraints', R`\sum_j w_j = 0,\qquad \sum_j w_j x_j = 0,\qquad \sum_j w_j y_j = 0`, NAVY],
    ['block', R`\begin{bmatrix} \Phi & P \\ P^\top & 0 \end{bmatrix}\begin{bmatrix}\mathbf{w}\\ \mathbf{c}\end{bmatrix} = \begin{bmatrix}\mathbf{y}\\ \mathbf{0}\end{bmatrix},\quad P = \begin{bmatrix} 1 & x_1 & y_1\\ \vdots & \vdots & \vdots \\ 1 & x_n & y_n\end{bmatrix}`, NAVY],
    ['second1d', R`s''(x) = 6\sum_j w_j \lvert x - x_j \rvert = 6\Bigl( x\sum_j w_j - \sum_j w_j x_j \Bigr) = 0`, NAVY],
    ['energy', R`J[f] = \iint_{\mathbb{R}^2} \left( f_{xx}^2 + 2 f_{xy}^2 + f_{yy}^2 \right) dx\,dy`, WHITE],
    ['tpsSolution', R`f(\mathbf{x}) = \sum_j w_j\, r_j^2 \log r_j + c_0 + c_1 x + c_2 y`, NAVY],
    ['green', R`\Delta^2 \bigl( r^2 \log r \bigr) = 8\pi\,\delta`, NAVY],
    ['tpsEnergy', R`J = 8\pi \sum_j w_j\, y_j`, NAVY],
    ['scale', R`\varphi(ar) = a^2\varphi(r) + a^2\log a\cdot r^2`, NAVY],
    ['smoothObjective', R`\min_f\ \sum_{i=1}^{n} \bigl( y_i - f(\mathbf{x}_i) \bigr)^2 + \lambda\, J[f]`, WHITE],
    ['smoothBlock', R`\begin{bmatrix} \Phi + 8\pi\lambda I & P \\ P^\top & 0 \end{bmatrix}\begin{bmatrix}\mathbf{w}\\ \mathbf{c}\end{bmatrix} = \begin{bmatrix}\mathbf{y}\\ \mathbf{0}\end{bmatrix}`, NAVY],
    ['multi', R`s(\mathbf{x}) = \sum_{j=1}^{n} w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + c_0 + c_1 x_1 + \cdots + c_d x_d`, WHITE],
    ['distance', R`\lVert\mathbf{x}-\mathbf{x}_j\rVert = \sqrt{(x_1 - x_{j1})^2 + \cdots + (x_d - x_{jd})^2}`, NAVY],
    ['p3', R`P = \begin{bmatrix} 1 & x_{11} & x_{12} & x_{13} \\ \vdots & \vdots & \vdots & \vdots \\ 1 & x_{n1} & x_{n2} & x_{n3} \end{bmatrix}`, NAVY],
    ['r2', R`r^2 = \sum_{k=1}^{d} (x_k - x'_k)^2`, NAVY],
    ['linearized', R`\varphi(r) \approx a + b\,r^2`, NAVY],
    ['cancel', R`\sum_j w_j r_j^2 = \sum_j w_j \bigl( \lVert\mathbf{x}\rVert^2 - 2\,\mathbf{x}\cdot\mathbf{x}_j + \lVert\mathbf{x}_j\rVert^2 \bigr) = \sum_j w_j \lVert\mathbf{x}_j\rVert^2`, NAVY],
    ['scaledDistance', R`r^2 = \sum_{k=1}^{d} \left( \frac{x_k - x'_k}{\ell_k} \right)^2`, WHITE],
  ];
  const FORMULA_SIZE_PX = 30;
  FORMULAS.forEach(([id, tex, color]) => {
    const node = document.createElement('div');
    node.className = 'formula';
    node.dataset.asset = `formula-${id}`;
    node.style.color = color;
    node.style.fontSize = `${FORMULA_SIZE_PX}px`;
    node.innerHTML = katex.renderToString(`\\displaystyle ${tex}`, { throwOnError: true, strict: 'ignore' });
    root.appendChild(node);
  });

  // ---- 図（キャンバス）。DPR 倍で描いて、CSS の大きさで表示する ----
  const DPR = 2;
  function figure(id, w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.className = 'figure';
    canvas.dataset.asset = id;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  }

  // 2次元の例（14点）と、動画と同じ色の目盛り
  const DOMAIN = [-1.1, 1.1];
  const GRID_N = 40;
  const TPS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.thinPlate(), { degree: 1 });
  const EPS_2D = 1.6;
  const GAUSS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(EPS_2D));
  const zColor = V3.heightColor(-0.7, 1.25);
  const pins = () => M.DATA2_P.map(([x, y], j) => ({ x, y, z: M.DATA2_Y[j], head: `rgb(${zColor(M.DATA2_Y[j]).map(Math.round).join(',')})` }));
  const view = (w, h, extra = {}) => new V3.View({ cx: w / 2, cy: h / 2 + 30, scale: Math.min(w, h) * 0.36, azimuth: -0.62, elevation: 0.52, zScale: 0.55, zBase: -0.9, ...extra });
  const surface = (f, xr = DOMAIN, n = GRID_N) => V3.sampleGrid(f, xr, xr, n);
  function plate(ctx, w, h, grid, { color = zColor, xr = DOMAIN, frame = null, extra = {} } = {}) {
    const v = view(w, h, extra);
    V3.drawFloor(ctx, v, xr, xr, { step: xr[1] > 1.5 ? 1 : 0.5, frame });
    V3.drawScene(ctx, v, { grid, color, pins: pins(), headRadius: Math.max(5, w / 110) });
  }

  // 表紙
  figure('figure-cover', 960, 800, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.at([x, y])), { extra: { scale: 300, cy: h / 2 + 40 } }));

  // 第1章: 3つの方法
  const nearest = M.nearest(M.DATA2_P, M.DATA2_Y);
  const idw = M.inverseDistance(M.DATA2_P, M.DATA2_Y);
  const METHOD_W = 640;
  const METHOD_H = 520;
  figure('figure-nearest', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => nearest([x, y]))));
  figure('figure-idw', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => idw([x, y]))));
  figure('figure-tps', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.at([x, y]))));

  // 第2章: 同心円の等高線を持つ山（ガウス型）
  figure('figure-radial', 520, 520, (ctx, w, h) => {
    const size = Math.min(w, h) - 40;
    const x0 = (w - size) / 2;
    const y0 = (h - size) / 2;
    // 0 は資料の濃紺に沈み、大きいほど明るい青
    const ramp = colorRamp([[0, NAVY], [0.3, '#0d366b'], [0.62, '#2a78d6'], [1, '#b7d3f6']]);
    const image = heatmapCanvas(128, 128, (i, j) => ramp(Math.exp(-((j - 63.5) ** 2 + (i - 63.5) ** 2) / 40 ** 2)));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, x0, y0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    [0.8, 0.5, 0.25, 0.1].forEach((level) => {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.sqrt(-Math.log(level)) * 40 * (size / 128), 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = '#E9C46A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + size * 0.3 * Math.cos(-0.6), h / 2 + size * 0.3 * Math.sin(-0.6));
    ctx.stroke();
  });

  // 第5章: 平面 → TPS → 曲げの密度
  const ENERGY_COLOR_MAX = 40;
  const energyLevel = (e) => clamp(Math.sqrt(e / ENERGY_COLOR_MAX));
  const step = (DOMAIN[1] - DOMAIN[0]) / GRID_N;
  const energyAt = (second) => Array.from({ length: GRID_N }, (_, i) => Array.from({ length: GRID_N }, (_, j) => M.energyDensity(second([DOMAIN[0] + step * (j + 0.5), DOMAIN[0] + step * (i + 0.5)]))));
  const energyTps = energyAt((p) => M.secondDerivativesThinPlate(TPS2, p));
  const energyGauss = energyAt((p) => M.secondDerivativesGaussian(GAUSS2, EPS_2D, p));
  figure('figure-plane', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.polyAt([x, y]))));
  figure('figure-plate', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.at([x, y]))));
  figure('figure-energy', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.at([x, y])), { color: (z, x, y, i, j) => V3.energyRamp(energyLevel(energyTps[i][j])) }));
  figure('figure-energy-gauss', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => GAUSS2.at([x, y])), { color: (z, x, y, i, j) => V3.energyRamp(energyLevel(energyGauss[i][j])) }));

  // 第6章: 外側まで広げて並べる
  const FAR = [-2.2, 2.2];
  const FRAME = { xr: [-1, 1], yr: [-1, 1] };
  const wide = { scale: 98, cy: 290 };
  figure('figure-wide-gauss', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => GAUSS2.at([x, y]), FAR, 36), { xr: FAR, frame: FRAME, extra: { ...wide, zBase: -1.0 } }));
  figure('figure-wide-tps', METHOD_W, METHOD_H, (ctx, w, h) => plate(ctx, w, h, surface((x, y) => TPS2.at([x, y]), FAR, 36), { xr: FAR, frame: FRAME, extra: { ...wide, zBase: -1.0 } }));

  window.ASSETS_READY = true;
})();
