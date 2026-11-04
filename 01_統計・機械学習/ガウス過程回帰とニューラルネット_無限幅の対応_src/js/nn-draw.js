// nn-draw.js — 場面のファイルで共通に使う、ネットの図・ヒストグラム・楕円の描き方と、何度も使う計算結果（ガウス過程回帰の平均、学習したネットの束）。
(() => {
  const { C, rgba, canvasText, clamp } = KIT;
  const M = NNM;

  // ---- 色の役割（場面をまたいで同じにする）----
  const COLOR = {
    nngp: C.blue, // NNGP カーネルのガウス過程回帰（式）
    ntk: C.orange, // NTK の式
    mean: C.yellow, // ネットの束の平均
    net: C.text2, // 1つ1つのネット（細い線）
    data: C.text, // データ点
    positive: C.red, // 正の重み
    negative: C.blue, // 負の重み
  };

  // ---- ネットの図: 入力 x → 隠れ層 → 出力 f(x)。線の色は重みの符号、太さは大きさ ----
  // net が null なら重みの色をつけずに灰色で描く。units は描くユニットの数（net の幅以下）
  function drawNetwork(ctx, box, net, { units = 5, alpha = 1, edgeAlpha = 1, unitLabel = true, glowUnit = null, inputLabel = 'x', outputLabel = 'f(x)' } = {}) {
    if (alpha <= 0) return;
    const inX = box.x + 46;
    const outX = box.x + box.w - 56;
    const midX = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const gap = Math.min(70, (box.h - 70) / Math.max(1, units - 1));
    const hy = (j) => cy + (j - (units - 1) / 2) * gap;
    const weightStyle = (value) => ({
      color: value === null ? C.axis : value > 0 ? COLOR.positive : COLOR.negative,
      width: value === null ? 1.5 : 0.8 + 2.6 * clamp(Math.abs(value) / 2),
    });
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineCap = 'round';
    for (let j = 0; j < units; j++) {
      const inStyle = weightStyle(net ? net.w[j] : null);
      const outStyle = weightStyle(net ? net.v[j] : null);
      ctx.globalAlpha = alpha * edgeAlpha;
      ctx.strokeStyle = inStyle.color;
      ctx.lineWidth = inStyle.width;
      ctx.beginPath();
      ctx.moveTo(inX + 24, cy);
      ctx.lineTo(midX - 20, hy(j));
      ctx.stroke();
      ctx.strokeStyle = outStyle.color;
      ctx.lineWidth = outStyle.width;
      ctx.beginPath();
      ctx.moveTo(midX + 20, hy(j));
      ctx.lineTo(outX - 30, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    // 隠れユニット（中に ReLU の形）
    for (let j = 0; j < units; j++) {
      const y = hy(j);
      ctx.beginPath();
      ctx.arc(midX, y, 19, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.lineWidth = glowUnit === j ? 3 : 1.6;
      ctx.strokeStyle = glowUnit === j ? C.yellow : C.text2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX - 12, y + 6);
      ctx.lineTo(midX, y + 6);
      ctx.lineTo(midX + 11, y - 8);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = C.text;
      ctx.stroke();
    }
    // 入力と出力
    const node = (x, label, r) => {
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.text;
      ctx.stroke();
      canvasText(ctx, label, x, cy + 7, { size: 20, color: C.text, align: 'center', weight: 700 });
    };
    node(inX, inputLabel, 24);
    node(outX, outputLabel, 30);
    if (unitLabel) {
      canvasText(ctx, '入力', inX, box.y + box.h - 4, { size: 17, color: C.muted, align: 'center' });
      canvasText(ctx, `隠れ層（幅 ${units}）`, midX, box.y + box.h - 4, { size: 17, color: C.muted, align: 'center' });
      canvasText(ctx, '出力', outX, box.y + box.h - 4, { size: 17, color: C.muted, align: 'center' });
    }
    ctx.restore();
    return { inX, outX, midX, cy, hy };
  }

  // ---- ヒストグラム: 値の列 → 区間ごとの密度 ----
  function histogram(values, min, max, binWidth) {
    const count = Math.round((max - min) / binWidth);
    const density = new Array(count).fill(0);
    for (const v of values) {
      const i = Math.floor((v - min) / binWidth);
      if (i >= 0 && i < count) density[i] += 1;
    }
    return { min, binWidth, density: density.map((c) => c / (values.length * binWidth)) };
  }
  // Plot の上に棒を描く（棒の間に 2px のすき間）。top を超える棒は上で切り、切ったことが分かるように印をつける
  function drawHistogram(ctx, P, hist, { color = C.blue, alpha = 1, top = Infinity } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    hist.density.forEach((d, i) => {
      if (d <= 0) return;
      const x0 = P.sx(hist.min + i * hist.binWidth) + 1;
      const x1 = P.sx(hist.min + (i + 1) * hist.binWidth) - 1;
      const yTop = P.sy(Math.min(d, top));
      ctx.fillStyle = rgba(color, 0.6);
      ctx.fillRect(x0, yTop, x1 - x0, P.sy(0) - yTop);
      if (d > top) {
        ctx.fillStyle = C.text;
        ctx.beginPath();
        ctx.moveTo((x0 + x1) / 2, yTop - 12);
        ctx.lineTo(x0 - 3, yTop - 2);
        ctx.lineTo(x1 + 3, yTop - 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }
  // 2つのヒストグラムの間を k で補間（幅を変える動きをなめらかにする）
  const blendHistogram = (a, b, k) => ({ min: a.min, binWidth: a.binWidth, density: a.density.map((d, i) => d + (b.density[i] - d) * k) });

  // ---- 2次元の正規分布の楕円（中心 0、共分散 cov、k シグマ）----
  function drawCovEllipse(ctx, P, cov, { k = 2, color = C.yellow, width = 2.5, alpha = 1, dash = null } = {}) {
    if (alpha <= 0) return;
    const l11 = Math.sqrt(cov[0][0]);
    const l21 = cov[0][1] / l11;
    const l22 = Math.sqrt(Math.max(0, cov[1][1] - l21 * l21));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
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

  // ---- 何度も使う計算結果（最初に使うときに1回だけ計算する）----
  const memo = (fn) => {
    let value;
    let done = false;
    return () => {
      if (!done) {
        value = fn();
        done = true;
      }
      return value;
    };
  };
  const grid = M.GRID;
  const gpNoiseFree = memo(() => M.gpPosterior(M.nngp, grid));
  const gpNoisy = memo(() => M.gpPosterior(M.nngp, grid, M.NOISE_VAR));
  const ntkMean = memo(() => M.gpPosterior(M.ntk, grid).mean);
  // 第5章: 幅 1000 のネット 200 個を、最後の層だけ勾配流で学習する。時刻 t の関数を返す関数の列と、平均の式
  const LAST_LAYER_WIDTH = 1000;
  const LAST_LAYER_NETS = 200;
  const lastLayer = memo(() => {
    const random = M.makeRandom(5150);
    const nets = Array.from({ length: LAST_LAYER_NETS }, () => M.lastLayerTrajectory(M.randomNet(LAST_LAYER_WIDTH, random), grid));
    const formula = M.meanTrajectory(M.nngp, grid);
    return { width: LAST_LAYER_WIDTH, count: LAST_LAYER_NETS, nets, formula };
  });
  // 束の平均
  function averageOf(lines) {
    const mean = new Array(lines[0].length).fill(0);
    for (const line of lines) for (let i = 0; i < line.length; i++) mean[i] += line[i] / lines.length;
    return mean;
  }

  window.NNDRAW = { COLOR, drawNetwork, histogram, drawHistogram, blendHistogram, drawCovEllipse, gpNoiseFree, gpNoisy, ntkMean, lastLayer, averageOf };
})();
