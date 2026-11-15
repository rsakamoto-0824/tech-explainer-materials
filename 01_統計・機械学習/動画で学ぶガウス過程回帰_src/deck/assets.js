// assets.js — パワーポイントに貼る画像（数式と、カーネル行列の色の図）をページに描く。deck/make-assets.mjs が1つずつ撮って PNG にする。
// 3点の計算例の数値は、動画（scenes-b.js）と同じく gp-math.js で計算して式に入れる。
(() => {
  const { texNum, heatmapCanvas, seqColor } = KIT;
  const G = GPM;
  const root = document.getElementById('assets');
  const NAVY = '#22223B';
  const WHITE = '#FFFFFF';

  // ---- 3点の計算例（動画の 5T-2 と同じ値） ----
  const EX_X = [1, 2, 4];
  const EX_Y = [0.9, 0.6, -0.7];
  const EX_STAR = 3;
  const EX_NOISE = 0.01;
  const EX_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const EX_MODEL = G.fit(EX_X, EX_Y, EX_KERNEL, EX_NOISE);
  const EX_KY = EX_X.map((a, i) => EX_X.map((b, j) => EX_KERNEL(a, b) + (i === j ? EX_NOISE : 0)));
  const EX_KSTAR = EX_X.map((b) => EX_KERNEL(EX_STAR, b));
  const EX_POINT = G.predict(EX_MODEL, [EX_STAR]);
  const EX_MEAN = EX_POINT.mean[0];
  const EX_VAR = EX_POINT.variance[0];
  const EX_REDUCTION = EX_KERNEL(EX_STAR, EX_STAR) - EX_VAR;
  const matrixTex = (rows) => `\\begin{bmatrix} ${rows.map((row) => row.map((v) => texNum(v, 3)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
  const columnTex = (values) => matrixTex(values.map((v) => [v]));

  // ---- 数式（KaTeX）。color: 濃紺の帯の上は白、カードの上は濃紺 ----
  const R = String.raw;
  const FORMULAS = [
    ['obs', R`y = f(x) + \varepsilon,\qquad \varepsilon \sim \mathcal{N}(0,\ \sigma_n^2)`, NAVY],
    ['gp', R`f \sim \mathcal{GP}\big(m(x),\ k(x, x')\big)`, WHITE],
    ['bivar', R`\begin{bmatrix} f_1 \\ f_2 \end{bmatrix} \sim \mathcal{N}\!\left(\begin{bmatrix} \mu_1 \\ \mu_2 \end{bmatrix},\ \begin{bmatrix} \sigma_1^2 & \rho\,\sigma_1\sigma_2 \\ \rho\,\sigma_1\sigma_2 & \sigma_2^2 \end{bmatrix}\right)`, NAVY],
    ['mvn', R`\mathbf{f} \sim \mathcal{N}(\boldsymbol\mu,\ \Sigma)`, NAVY],
    ['cond', R`f_2 \mid f_1 \ \sim\ \mathcal{N}\!\Big(\mu_2 + \rho\,\tfrac{\sigma_2}{\sigma_1}(f_1 - \mu_1),\ \ (1 - \rho^2)\,\sigma_2^2\Big)`, WHITE],
    ['gpdef', R`\begin{bmatrix} f(x_1) \\ \vdots \\ f(x_n) \end{bmatrix} \sim \mathcal{N}(\mathbf{0},\ K),\qquad K_{ij} = k(x_i,\ x_j)`, NAVY],
    ['rbf', R`k(x, x') = \sigma_f^2 \exp\!\left(-\frac{r^2}{2\ell^2}\right),\qquad r = |x - x'|`, WHITE],
    ['matern12', R`\nu = \tfrac{1}{2}:\quad k = \sigma_f^2\, e^{-r/\ell}`, NAVY],
    ['matern32', R`\nu = \tfrac{3}{2}:\quad k = \sigma_f^2 \Big(1 + \tfrac{\sqrt{3}\,r}{\ell}\Big)\, e^{-\sqrt{3}\,r/\ell}`, NAVY],
    ['matern52', R`\nu = \tfrac{5}{2}:\quad k = \sigma_f^2 \Big(1 + \tfrac{\sqrt{5}\,r}{\ell} + \tfrac{5r^2}{3\ell^2}\Big)\, e^{-\sqrt{5}\,r/\ell}`, NAVY],
    ['joint', R`\begin{bmatrix} \mathbf{y} \\ f_* \end{bmatrix} \sim \mathcal{N}\!\left(\mathbf{0},\ \begin{bmatrix} K + \sigma_n^2 I & \mathbf{k}_* \\ \mathbf{k}_*^\top & k(x_*, x_*) \end{bmatrix}\right)`, NAVY],
    ['mu', R`\mu_* = \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, WHITE],
    ['var', R`\sigma_*^2 = k(x_*, x_*) - \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{k}_*`, WHITE],
    ['alpha', R`\mu_*(x) = \sum_{i=1}^{n} \alpha_i\, k(x, x_i),\qquad \boldsymbol\alpha = \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, NAVY],
    ['exK', R`K + \sigma_n^2 I = ${matrixTex(EX_KY)}`, NAVY],
    ['exAlpha', R`\boldsymbol\alpha = \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y} = ${columnTex(Array.from(EX_MODEL.alpha))}`, NAVY],
    ['exMean', R`\mathbf{k}_* = ${columnTex(EX_KSTAR)},\qquad \mu_* = \mathbf{k}_*^\top \boldsymbol\alpha = ${texNum(EX_MEAN, 3)}`, NAVY],
    ['exVar', R`\sigma_*^2 = 1 - \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{k}_* = 1 - ${texNum(EX_REDUCTION, 3)} = ${texNum(EX_VAR, 3)}`, NAVY],
    ['theta', R`\boldsymbol\theta = (\sigma_f,\ \ell,\ \sigma_n)`, NAVY],
    ['lml', R`\log p(\mathbf{y} \mid \boldsymbol\theta) = \underbrace{-\tfrac{1}{2}\,\mathbf{y}^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}}_{\text{当てはまり}}\ \underbrace{-\ \tfrac{1}{2}\log\big|K + \sigma_n^2 I\big|}_{\text{複雑さの罰則}}\ -\ \tfrac{n}{2}\log 2\pi`, WHITE],
    ['ard', R`k(\mathbf{x}, \mathbf{x}') = \sigma_f^2 \exp\!\left(-\sum_{d=1}^{D} \frac{(x_d - x'_d)^2}{2\ell_d^2}\right)`, NAVY],
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

  // ---- カーネル行列（25点どうし、動画の 3V-2 と同じ）。1マス1画素の絵を、ぼかさずに拡大する ----
  const MATRIX_N = 25;
  const MATRIX_XS = G.linspace(0, 6, MATRIX_N);
  const HEAT_SIZE_PX = 300;
  [0.5, 2].forEach((ell) => {
    const kernel = G.rbf({ variance: 1, lengthScale: ell });
    const small = heatmapCanvas(MATRIX_N, MATRIX_N, (i, j) => seqColor(kernel(MATRIX_XS[i], MATRIX_XS[j])));
    const canvas = document.createElement('canvas');
    canvas.className = 'heat';
    canvas.dataset.asset = `heat-${String(ell).replace('.', '')}`;
    canvas.width = HEAT_SIZE_PX * 2;
    canvas.height = HEAT_SIZE_PX * 2;
    canvas.style.width = `${HEAT_SIZE_PX}px`;
    canvas.style.height = `${HEAT_SIZE_PX}px`;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    root.appendChild(canvas);
  });
  // 色の目盛り（0 → 1）
  const scale = document.createElement('canvas');
  scale.className = 'heat';
  scale.dataset.asset = 'heat-scale';
  scale.width = 600;
  scale.height = 40;
  scale.style.width = '300px';
  scale.style.height = '20px';
  const sctx = scale.getContext('2d');
  for (let i = 0; i < scale.width; i++) {
    const [r, g, b] = seqColor(i / (scale.width - 1));
    sctx.fillStyle = `rgb(${r},${g},${b})`;
    sctx.fillRect(i, 0, 1, scale.height);
  }
  root.appendChild(scale);

  window.ASSETS_READY = true;
})();
