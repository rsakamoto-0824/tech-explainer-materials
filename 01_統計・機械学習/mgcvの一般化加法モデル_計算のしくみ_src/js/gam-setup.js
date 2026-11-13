// gam-setup.js — 場面のファイル（scenes-*.js）で共通に使う計算と絵。
// 1変数の例（基底10本と40本）を「λ を入れると当てはめを返すモデル」にまとめ、散布図・矢印・箱の描き方を用意する。
window.GAMX = (() => {
  const { C, FONT, rgba, canvasText, roundRect, clamp, Plot, fmt } = KIT;
  const M = GAMM;
  const DATA = GAMDATA;

  const SINGLE_OFFSETS = [2]; // 切片の次の係数から滑らかな項が始まる（R の番号）
  const SCAN_COUNT = 241; // λ を対数で等間隔に動かす点の数
  const SCAN_LOG10_RANGE = [-8, 6];

  // ---- 1変数の例: mgcv の X・S から、λ を入れると当てはめを返すモデルを作る ----
  function gaussianModel(source, y) {
    const stats = M.gaussianStats(source.X, y);
    const info = M.penaltyInfo([source.S], SINGLE_OFFSETS, source.X[0].length);
    const fit = (lambda) => M.fitGaussian(stats, info, [lambda]);
    const curve = (beta) => M.matVec(source.Xp, beta);
    // λ を端から端まで動かした表（GCV・REML・有効自由度の曲線に使う）
    const [lo, hi] = SCAN_LOG10_RANGE;
    const logs = Array.from({ length: SCAN_COUNT }, (_, i) => lo + ((hi - lo) * i) / (SCAN_COUNT - 1));
    const rows = logs.map((v) => fit(10 ** v));
    const scan = { logs, edf: rows.map((r) => r.edf), gcv: rows.map((r) => r.gcv), reml: rows.map((r) => r.reml), rss: rows.map((r) => r.rss) };
    return { stats, info, fit, curve, scan, Xp: source.Xp, X: source.X, S: source.S, sp: source.sp, spGcv: source.spGcv, size: source.X[0].length };
  }
  const narrow = gaussianModel(DATA.single, DATA.single.y); // 基底10本（既定）
  const wide = gaussianModel(DATA.wide, DATA.single.y); // 基底40本
  const log10 = (v) => Math.log(v) / Math.LN10;

  // ---- 1変数の例のグラフ（データの点と、真の関数の破線） ----
  const SINGLE_Y_RANGE = [-6, 16];
  const singlePlot = (box) => new Plot({ ...box, xr: [0, 1], yr: SINGLE_Y_RANGE });
  function drawSingleData(ctx, plot, { alpha = 1, truth = 1, axes = true, dotAlpha = 0.5, r = 3 } = {}) {
    if (alpha <= 0) return;
    if (axes) plot.axes(ctx, { xticks: [0, 0.5, 1], yticks: [-5, 0, 5, 10, 15], xlabel: 'x', ylabel: 'y', alpha, fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0) });
    scatter(ctx, plot, DATA.single.x, DATA.single.y, { alpha: dotAlpha * alpha, r });
    if (truth > 0) plot.line(ctx, DATA.single.grid, DATA.single.truth, { color: C.orange, width: 2.5, dash: [8, 6], alpha: alpha * truth });
  }

  // ---- 絵の小道具 ----
  // 点の多い散布図（縁取りなしの小さな点）
  function scatter(ctx, plot, xs, ys, { color = C.text2, r = 2.6, alpha = 0.5 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    plot.clip(ctx);
    ctx.fillStyle = rgba(color, alpha);
    for (let i = 0; i < xs.length; i++) {
      ctx.beginPath();
      ctx.arc(plot.sx(xs[i]), plot.sy(ys[i]), r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function arrow(ctx, x1, y1, x2, y2, { color = C.muted, width = 2.5, alpha = 1, head = 11, dash = null } = {}) {
    if (alpha <= 0) return;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * head * 0.8, y2 - Math.sin(angle) * head * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(angle - 0.42) * head, y2 - Math.sin(angle - 0.42) * head);
    ctx.lineTo(x2 - Math.cos(angle + 0.42) * head, y2 - Math.sin(angle + 0.42) * head);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 流れ図の箱（題名＋説明の行）。glow（0〜1）で枠を光らせる
  function flowBox(ctx, box, title, lines, { color = C.blue, alpha = 1, glow = 0, titleSize = 23, lineSize = 17 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fillStyle = rgba(color, 0.1 + 0.16 * glow);
    ctx.fill();
    ctx.lineWidth = 2 + 1.5 * glow;
    ctx.strokeStyle = rgba(color, 0.55 + 0.45 * glow);
    ctx.stroke();
    const top = box.y + (box.h - (titleSize + lines.length * (lineSize + 9))) / 2 + titleSize - 2;
    canvasText(ctx, title, box.x + box.w / 2, top, { size: titleSize, weight: 700, color: C.text, align: 'center' });
    lines.forEach((line, i) => canvasText(ctx, line, box.x + box.w / 2, top + (i + 1) * (lineSize + 9) + 2, { size: lineSize, color: C.text2, align: 'center' }));
    ctx.restore();
  }
  // 横向きのつまみ（λ の位置を示す）
  function slider(ctx, { x, y, w }, value, [lo, hi], { color = C.yellow, alpha = 1, ticks = [], label, power = false, fmtTick = (v) => String(v) } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    for (const v of ticks) {
      const tx = x + ((v - lo) / (hi - lo)) * w;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, y - 6);
      ctx.lineTo(tx, y + 6);
      ctx.stroke();
      if (power) drawPower(ctx, tx, y + 30, v, { size: 15 });
      else canvasText(ctx, fmtTick(v), tx, y + 28, { size: 15, color: C.muted, align: 'center' });
    }
    const kx = x + clamp((value - lo) / (hi - lo)) * w;
    ctx.beginPath();
    ctx.arc(kx, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.bg;
    ctx.stroke();
    if (label) canvasText(ctx, label, x, y - 22, { size: 18, color: C.text2 });
    ctx.restore();
  }
  // 10 のべき乗の文字（10⁻³ など）。上付きのマイナスはフォントに無いことがあるので、小さい字を持ち上げて描く
  const POWER_EXPONENT_SCALE = 0.72;
  function drawPower(ctx, x, y, exponent, { size = 16, color = C.muted, align = 'center', alpha = 1 } = {}) {
    const text = String(exponent).replace('-', '−');
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const baseFont = `500 ${size}px ${FONT}`;
    const exponentFont = `500 ${size * POWER_EXPONENT_SCALE}px ${FONT}`;
    ctx.font = baseFont;
    const baseWidth = ctx.measureText('10').width;
    ctx.font = exponentFont;
    const width = baseWidth + 1 + ctx.measureText(text).width;
    const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    ctx.font = baseFont;
    ctx.fillText('10', left, y);
    ctx.font = exponentFont;
    ctx.fillText(text, left + baseWidth + 1, y - size * 0.42);
    ctx.restore();
  }
  // グラフの軸に 10 のべき乗の目盛りの文字を付ける（Plot.axes には fmtX: () => '' を渡しておく）
  function powerTicks(ctx, plot, exponents, axis = 'x', { alpha = 1, size = 16 } = {}) {
    for (const exponent of exponents) {
      if (axis === 'x') drawPower(ctx, plot.sx(exponent), plot.y + plot.h + 26, exponent, { size, alpha });
      else drawPower(ctx, plot.x - 10, plot.sy(exponent) + 5, exponent, { size, alpha, align: 'right' });
    }
  }
  const NO_LABEL = () => '';
  // 配列の中で、位置 position（小数）の値をなめらかに読む
  const sample = (values, position) => {
    const p = clamp(position, 0, values.length - 1);
    const low = Math.floor(p);
    const high = Math.min(values.length - 1, low + 1);
    return values[low] + (values[high] - values[low]) * (p - low);
  };

  return { narrow, wide, log10, singlePlot, drawSingleData, SINGLE_Y_RANGE, scatter, arrow, flowBox, slider, drawPower, powerTicks, NO_LABEL, sample, SCAN_LOG10_RANGE };
})();
