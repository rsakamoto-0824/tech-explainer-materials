// short-draw.js — 場面のファイルで共通に使う、色の役割と描き方（予測の帯、データ点、楕円、正規分布の形）。
(() => {
  const { C, rgba, canvasText } = KIT;
  const G = GPM;

  // 色の役割（場面をまたいで同じにする）。サンプルの色は固定の順番で使い、4本目からは灰色
  const COLOR = {
    mean: C.blue, // 予測の平均と帯
    data: C.text, // データ点
    truth: C.muted, // 真の関数（点線）
    prior: C.muted, // 事前分布の帯
    samples: [C.orange, C.aqua, C.violet],
    other: '#b9b2a3',
  };
  const sampleColor = (i) => COLOR.samples[i] || COLOR.other;

  // 予測の平均と ±2σ の帯
  function drawPrediction(ctx, P, xs, pred, { alpha = 1, bandAlpha = 0.2, width = 3.5, upto = 1, color = COLOR.mean } = {}) {
    if (alpha <= 0) return;
    const lower = Array.from(pred.mean, (m, i) => m - 2 * pred.sd[i]);
    const upper = Array.from(pred.mean, (m, i) => m + 2 * pred.sd[i]);
    P.band(ctx, xs, lower, upper, { color, alpha: bandAlpha * alpha, upto });
    P.line(ctx, xs, Array.from(pred.mean), { color, width, alpha, upto });
  }
  // データ点（濃い点に地の色の縁）
  function drawData(ctx, P, xs, ys, { alpha = 1, r = 7 } = {}) {
    P.dots(ctx, xs, ys, { color: COLOR.data, r, alpha, ring: C.bg });
  }
  // 2次元の正規分布の楕円（中心 0、共分散 cov、k シグマ）
  function drawEllipse(ctx, P, cov, { k = 2, color = C.blue, width = 2.5, alpha = 1 } = {}) {
    if (alpha <= 0) return;
    const l11 = Math.sqrt(cov[0][0]);
    const l21 = cov[0][1] / l11;
    const l22 = Math.sqrt(Math.max(0, cov[1][1] - l21 * l21));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = (2 * Math.PI * i) / 120;
      const ux = k * Math.cos(t);
      const uy = k * Math.sin(t);
      const x = l11 * ux;
      const y = l21 * ux + l22 * uy;
      if (i === 0) ctx.moveTo(P.sx(x), P.sy(y));
      else ctx.lineTo(P.sx(x), P.sy(y));
    }
    ctx.stroke();
    ctx.restore();
  }
  const normalPdf = (x, mean, variance) => Math.exp(-((x - mean) ** 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);

  // 同じ乱数で引いた関数（kernel を変えても乱数は同じなので、形の違いだけが比べられる）
  function samples(xs, kernel, count, seed) {
    const normals = Array.from({ length: count }, (_, i) => G.standardNormals(xs.length, seed + i));
    return G.sampleFunctions(xs, kernel, normals, 1e-8).map((f) => Array.from(f));
  }
  // 枠の右上に、図の名前（小さな見出し）を書く
  const panelTitle = (ctx, P, text, alpha = 1) => canvasText(ctx, text, P.x, P.y - 14, { size: 20, color: C.text, weight: 700, alpha });
  const tint = (hex, alpha) => rgba(hex, alpha);

  window.SDRAW = { COLOR, sampleColor, drawPrediction, drawData, drawEllipse, normalPdf, samples, panelTitle, tint };
})();
