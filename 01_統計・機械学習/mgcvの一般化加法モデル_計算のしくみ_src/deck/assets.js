// assets.js — パワーポイントに貼る画像（数式と、点の多い図）をページに描く。deck/make-assets.mjs が1つずつ撮って画像にする。
// 数値は動画と同じもの（js/gam-data.js ＝ mgcv の計算結果、js/gam-math.js ＝ 再計算）を使う。
// 画像にするのは、数式と、図形で描くと重くなる図（400点 × 4枚の散布図、REML の面）だけ。ほかのグラフは build-deck.cjs が図形とグラフで描く。
(() => {
  const M = GAMM;
  const DATA = GAMDATA;
  const root = document.getElementById('assets');
  const NAVY = '#22223B';
  const WHITE = '#FFFFFF';
  const COLOR = { slate: '#4A4E69', muted: '#6C6F7F', line: '#BFC3D1', grid: '#E8EAF0', coral: '#E76F51', teal: '#2A9D8F', gold: '#E9C46A', onDark: '#A9ACC6' };
  const FONT = '"BIZ UDGothic", "Hiragino Sans", sans-serif';

  // ---- 数式（KaTeX）。濃紺の帯の上は白、カードの上は濃紺 ----
  const R = String.raw;
  const FORMULAS = [
    ['model', R`g(\mu_i) = \beta_0 + f_0(x_{0i}) + f_1(x_{1i}) + f_2(x_{2i}) + f_3(x_{3i})`, WHITE],
    ['basis', R`f(x) = \sum_{k=1}^{K} \beta_k\, b_k(x)`, WHITE],
    ['design', R`\boldsymbol f = X \boldsymbol\beta, \qquad X_{ik} = b_k(x_i)`, NAVY],
    ['stacked', R`g(\boldsymbol\mu) = \big[\; \mathbf{1} \;\; X_0 \;\; X_1 \;\; X_2 \;\; X_3 \;\big]\, \boldsymbol\beta`, NAVY],
    ['tpsObjective', R`\min_{f}\ \sum_{i=1}^{n} \big(y_i - f(x_i)\big)^2 + \lambda \int f''(x)^2\, dx`, NAVY],
    ['tpsSolution', R`f(x) = \sum_{i=1}^{n} \delta_i\, \eta\big(|x - x_i|\big) + \alpha_0 + \alpha_1 x, \qquad \eta(r) = \tfrac{1}{12}\, r^3`, NAVY],
    ['eigen', R`E_{ij} = \eta\big(|x_i - x_j|\big), \qquad E = U D\, U^{\mathsf T} \;\approx\; U_k D_k U_k^{\mathsf T}`, WHITE],
    ['penalized', R`\min_{\boldsymbol\beta}\ \ \|\boldsymbol y - X\boldsymbol\beta\|^2 \;+\; \lambda \int f''(x)^2\, dx`, WHITE],
    ['penaltyMatrix', R`\int f''(x)^2\, dx = \boldsymbol\beta^{\mathsf T} S\, \boldsymbol\beta, \qquad S_{kl} = \int b_k''(x)\, b_l''(x)\, dx`, NAVY],
    ['solution', R`\hat{\boldsymbol\beta} = \big(X^{\mathsf T} X + \lambda S\big)^{-1} X^{\mathsf T} \boldsymbol y`, NAVY],
    ['constraint', R`\sum_{i=1}^{n} f_j(x_{ji}) = 0`, NAVY],
    ['shrinkMatrix', R`\hat{\boldsymbol\beta} = F\, \tilde{\boldsymbol\beta}, \qquad F = \big(X^{\mathsf T} X + \lambda S\big)^{-1} X^{\mathsf T} X`, NAVY],
    ['edf', R`\mathrm{edf} = \mathrm{tr}(F) = \sum_{k} F_{kk}`, WHITE],
    ['shrinkFactor', R`\text{縮み率} = \frac{1}{1 + \lambda d_k}`, NAVY],
    ['penLik', R`\max_{\boldsymbol\beta}\ \ \ell(\boldsymbol\beta) - \frac{1}{2} \sum_j \lambda_j\, \boldsymbol\beta^{\mathsf T} S_j \boldsymbol\beta`, WHITE],
    ['working', R`z_i = \eta_i + (y_i - \mu_i)\, g'(\mu_i), \qquad w_i = \frac{1}{V(\mu_i)\, g'(\mu_i)^2}`, NAVY],
    ['pwls', R`\min_{\boldsymbol\beta}\ \ \sum_{i} w_i\, \big(z_i - X_i \boldsymbol\beta\big)^2 + \sum_j \lambda_j\, \boldsymbol\beta^{\mathsf T} S_j \boldsymbol\beta`, NAVY],
    ['gcv', R`\mathcal{V}_g(\lambda) = \frac{n\, \|\boldsymbol y - \hat{\boldsymbol\mu}\|^2}{\big(n - \mathrm{edf}\big)^2}`, NAVY],
    ['prior', R`\boldsymbol\beta \sim N\big(\boldsymbol 0,\ \phi\, S_\lambda^{-}\big)`, NAVY],
    ['reml', R`\mathcal{V}_r(\lambda) = \frac{D_p}{2\phi} - \ell_s + \frac{\log |X^{\mathsf T} W X + S_\lambda| - \log |S_\lambda|_{+}}{2} - \frac{M_p}{2} \log(2\pi\phi)`, NAVY],
    ['newton', R`\rho_j = \log \lambda_j, \qquad \boldsymbol\rho \;\leftarrow\; \boldsymbol\rho - H^{-1} \boldsymbol g`, WHITE],
    ['implicit', R`\frac{d \mathcal{V}_r}{d \rho_j} = \frac{\partial \mathcal{V}_r}{\partial \rho_j} + \frac{\partial \mathcal{V}_r}{\partial \hat{\boldsymbol\beta}^{\mathsf T}}\, \frac{d \hat{\boldsymbol\beta}}{d \rho_j}`, NAVY],
    ['posterior', R`\boldsymbol\beta \mid \boldsymbol y \;\sim\; N\big(\hat{\boldsymbol\beta},\ V_\beta\big), \qquad V_\beta = \big(X^{\mathsf T} W X + S_\lambda\big)^{-1} \phi`, WHITE],
    ['se', R`\mathrm{se}\big(\hat f(x)\big) = \sqrt{\boldsymbol b(x)^{\mathsf T}\, V_\beta\, \boldsymbol b(x)}, \qquad \text{帯} = \hat f(x) \pm 2\, \mathrm{se}`, NAVY],
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
  function figure(id, w, h, background, draw) {
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
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  }
  const text = (ctx, value, x, y, { size = 14, color = COLOR.muted, align = 'left', weight = 400 } = {}) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  };
  // グラフの枠（データ座標 → 画面座標）
  function frame(ctx, box, xr, yr, { xticks = [], yticks = [], axis = COLOR.line, grid = COLOR.grid, label = COLOR.muted, size = 13 } = {}) {
    const sx = (v) => box.x + ((v - xr[0]) / (xr[1] - xr[0])) * box.w;
    const sy = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h;
    ctx.lineWidth = 1;
    yticks.forEach((v) => {
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(box.x, sy(v));
      ctx.lineTo(box.x + box.w, sy(v));
      ctx.stroke();
      text(ctx, String(v).replace('-', '−'), box.x - 8, sy(v) + 5, { size, color: label, align: 'right' });
    });
    ctx.strokeStyle = axis;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y);
    ctx.lineTo(box.x, box.y + box.h);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.stroke();
    xticks.forEach((v) => text(ctx, String(v), sx(v), box.y + box.h + 20, { size, color: label, align: 'center' }));
    return { sx, sy };
  }
  function curve(ctx, P, xs, ys, { color, width = 2.5, dash = [] }) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(P.sx(x), P.sy(ys[i])) : ctx.moveTo(P.sx(x), P.sy(ys[i]))));
    ctx.stroke();
    ctx.restore();
  }
  function band(ctx, P, xs, lower, upper, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    xs.forEach((x, i) => ctx.lineTo(P.sx(x), P.sy(upper[i])));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(P.sx(xs[i]), P.sy(lower[i]));
    ctx.closePath();
    ctx.fill();
  }

  const MAIN = DATA.main;
  const SUBSCRIPT = ['₀', '₁', '₂', '₃'];

  // 表紙の図: 4つの関数と帯（濃紺の地）
  figure('figure-cover', 640, 520, NAVY, (ctx, w, h) => {
    MAIN.terms.forEach((term, j) => {
      const box = { x: 46 + (j % 2) * 310, y: 34 + Math.floor(j / 2) * 250, w: 262, h: 186 };
      const P = frame(ctx, box, [0, 1], [-6.5, 7.5], { yticks: [-5, 0, 5], xticks: [0, 0.5, 1], axis: '#5A5D80', grid: '#34365A', label: COLOR.onDark, size: 12 });
      band(ctx, P, term.grid, term.fit.map((v, i) => v - 2 * term.se[i]), term.fit.map((v, i) => v + 2 * term.se[i]), 'rgba(42,157,143,0.38)');
      curve(ctx, P, term.grid, term.truth, { color: COLOR.gold, width: 2, dash: [7, 5] });
      curve(ctx, P, term.grid, term.fit, { color: '#7FD6CB', width: 3 });
      text(ctx, `s(x${SUBSCRIPT[j]})`, box.x + 8, box.y + 18, { size: 15, color: WHITE, weight: 700 });
    });
  });

  // 例の4変数のデータ: 点（y − 切片）、推定した関数、帯、真の関数（白地）
  figure('figure-data4', 1220, 400, WHITE, (ctx) => {
    const centered = MAIN.y.map((v) => v - MAIN.intercept);
    MAIN.terms.forEach((term, j) => {
      const box = { x: 56 + j * 300, y: 40, w: 240, h: 300 };
      const P = frame(ctx, box, [0, 1], [-12, 12], { yticks: [-10, 0, 10], xticks: [0, 0.5, 1] });
      ctx.fillStyle = 'rgba(74,78,105,0.34)';
      MAIN.x[j].forEach((x, i) => {
        ctx.beginPath();
        ctx.arc(P.sx(x), P.sy(centered[i]), 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
      band(ctx, P, term.grid, term.fit.map((v, i) => v - 2 * term.se[i]), term.fit.map((v, i) => v + 2 * term.se[i]), 'rgba(42,157,143,0.30)');
      curve(ctx, P, term.grid, term.truth, { color: COLOR.coral, width: 2.2, dash: [7, 5] });
      curve(ctx, P, term.grid, term.fit, { color: COLOR.teal, width: 3.2 });
      text(ctx, `s(x${SUBSCRIPT[j]})`, box.x + box.w / 2, 26, { size: 17, color: NAVY, align: 'center', weight: 700 });
      text(ctx, `x${SUBSCRIPT[j]}`, box.x + box.w, box.y + box.h + 40, { size: 14, color: COLOR.slate, align: 'right' });
    });
    text(ctx, 'y − 切片', 8, 26, { size: 13, color: COLOR.muted });
  });

  // REML の面（2項のモデル）と、ニュートン法の道筋（白地）
  figure('figure-surface', 600, 540, WHITE, (ctx) => {
    const TWO = DATA.two;
    const stats = { XtX: TWO.XtX, Xty: TWO.Xty, yty: TWO.yty, n: TWO.n };
    const info = M.penaltyInfo(TWO.S, TWO.off, TWO.Xty.length);
    const path = M.newtonReml(stats, info, TWO.initialSp).map((step) => step.rho.map((v) => v / Math.LN10));
    const xr = [-3, 3];
    const yr = [-5, 2];
    const N = 90;
    const axis = (range) => Array.from({ length: N }, (_, i) => range[0] + ((range[1] - range[0]) * i) / (N - 1));
    const xs = axis(xr);
    const ys = axis(yr);
    const surface = ys.map((ly) => xs.map((lx) => M.fitGaussian(stats, info, [10 ** lx, 10 ** ly]).reml));
    const lowest = M.fitGaussian(stats, info, TWO.sp).reml;
    const highest = Math.max(...surface.flat());
    const level = (value) => Math.log1p(Math.max(0, value - lowest)) / Math.log1p(highest - lowest);
    // 色: 谷底（良い）は淡い黄、遠いほど濃紺
    const stops = [[0, [251, 241, 214]], [0.35, [127, 214, 203]], [0.7, [42, 120, 140]], [1, [34, 34, 59]]];
    const colorAt = (t) => {
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
          return stops[i - 1][1].map((c, j) => Math.round(c + (stops[i][1][j] - c) * k));
        }
      }
      return stops[stops.length - 1][1];
    };
    const box = { x: 78, y: 30, w: 480, h: 440 };
    const image = document.createElement('canvas');
    image.width = N;
    image.height = N;
    const ictx = image.getContext('2d');
    const pixels = ictx.createImageData(N, N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const [r, g, b] = colorAt(level(surface[N - 1 - i][j]));
        const p = (i * N + j) * 4;
        pixels.data[p] = r;
        pixels.data[p + 1] = g;
        pixels.data[p + 2] = b;
        pixels.data[p + 3] = 255;
      }
    }
    ictx.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, box.x, box.y, box.w, box.h);
    const sx = (v) => box.x + ((v - xr[0]) / (xr[1] - xr[0])) * box.w;
    const sy = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0])) * box.h;
    // 等高線（最小からの差が一定の線）
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    const px = (j) => box.x + (j / (N - 1)) * box.w;
    const py = (i) => box.y + box.h - (i / (N - 1)) * box.h;
    [0.5, 2, 5, 10, 20, 40, 70].forEach((gap) => {
      const target = lowest + gap;
      ctx.beginPath();
      for (let i = 0; i < N - 1; i++) {
        for (let j = 0; j < N - 1; j++) {
          const corners = [[j, i], [j + 1, i], [j + 1, i + 1], [j, i + 1]];
          const values = corners.map(([cj, ci]) => surface[ci][cj]);
          const points = [];
          for (let e = 0; e < 4; e++) {
            const a = values[e];
            const b = values[(e + 1) % 4];
            if (a < target !== b < target) {
              const k = (target - a) / (b - a);
              const [pa, pb] = [corners[e], corners[(e + 1) % 4]];
              points.push([pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k]);
            }
          }
          for (let p = 0; p + 1 < points.length; p += 2) {
            ctx.moveTo(px(points[p][0]), py(points[p][1]));
            ctx.lineTo(px(points[p + 1][0]), py(points[p + 1][1]));
          }
        }
      }
      ctx.stroke();
    });
    // 軸と目盛り（10 のべき乗）
    ctx.strokeStyle = COLOR.line;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    const power = (exponent, x, y, align) => {
      const label = String(exponent).replace('-', '−');
      ctx.font = `400 14px ${FONT}`;
      const baseWidth = ctx.measureText('10').width;
      ctx.font = `400 10px ${FONT}`;
      const total = baseWidth + 1 + ctx.measureText(label).width;
      const left = align === 'center' ? x - total / 2 : x - total;
      text(ctx, '10', left, y, { size: 14 });
      text(ctx, label, left + baseWidth + 1, y - 6, { size: 10 });
    };
    [-2, 0, 2].forEach((v) => power(v, sx(v), box.y + box.h + 22, 'center'));
    [-4, -2, 0, 2].forEach((v) => power(v, box.x - 8, sy(v) + 5, 'right'));
    text(ctx, 'x₁ の項の λ', box.x + box.w, box.y + box.h + 50, { size: 15, color: COLOR.slate, align: 'right' });
    text(ctx, 'x₂ の項の λ', 8, 20, { size: 15, color: COLOR.slate });
    // 道筋
    ctx.strokeStyle = COLOR.coral;
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach(([lx, ly], i) => (i ? ctx.lineTo(sx(lx), sy(ly)) : ctx.moveTo(sx(lx), sy(ly))));
    ctx.stroke();
    path.forEach(([lx, ly], i) => {
      ctx.beginPath();
      ctx.arc(sx(lx), sy(ly), i === 0 ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? WHITE : COLOR.coral;
      ctx.fill();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    text(ctx, '出発点', sx(path[0][0]) + 14, sy(path[0][1]) - 8, { size: 15, color: WHITE, weight: 700 });
    text(ctx, '1歩目', sx(path[1][0]) + 14, sy(path[1][1]) - 8, { size: 14, color: NAVY });
    const last = path[path.length - 1];
    text(ctx, '収束（mgcv の λ と一致）', sx(last[0]) - 14, sy(last[1]) + 32, { size: 14, color: NAVY, align: 'center', weight: 700 });
  });

  window.ASSETS_READY = true;
})();
