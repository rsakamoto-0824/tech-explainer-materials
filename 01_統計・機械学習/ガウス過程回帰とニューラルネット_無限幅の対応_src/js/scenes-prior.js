// scenes-prior.js — はじめに、この動画のポイント、第1〜3章（2つのモデル、幅を広げる、NNGP カーネル）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値（分散、相関係数など）は手で書かず、nn-math.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, canvasText, keyframes, lerp, clamp, legend, seqColor, heatmapCanvas, drawImage, roundRect, rgba } = KIT;
  const M = NNM;
  const D = NNDRAW;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;

  const sampleXs = (a, b, count) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  const PLOT_XS = sampleXs(-3, 3, 240); // 幅の狭いネットの折れ線を描く点
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const netFunction = (net, xs = PLOT_XS) => xs.map((x) => M.netAt(net, x));

  // ---- 第2章のヒストグラム: x = 1 での出力 f(1) を、幅ごとに2万個のネットで集める ----
  const HIST_X = 1;
  const HIST_WIDTHS = [1, 3, 10, 100];
  const HIST_SAMPLES = 20000;
  const HIST_RANGE = [-6, 6];
  const HIST_BIN = 0.25;
  const HIST_TOP = 0.62; // これより高い棒は上で切る
  const HISTS = HIST_WIDTHS.map((width, i) => {
    const random = M.makeRandom(300 + i);
    const values = [];
    for (let m = 0; m < HIST_SAMPLES; m++) {
      let s = 0;
      for (let j = 0; j < width; j++) {
        const w = random.normal();
        const a = random.normal();
        const v = random.normal();
        s += v * M.relu(M.SIGMA_W * w * HIST_X + M.SIGMA_A * a);
      }
      values.push(M.outputScale(width) * s);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const zeroShare = values.filter((v) => v === 0).length / values.length;
    return { width, variance, zeroShare, hist: D.histogram(values, HIST_RANGE[0], HIST_RANGE[1], HIST_BIN) };
  });
  const HIST_VAR = M.nngp(HIST_X, HIST_X); // 式の分散（どの幅でも同じ）
  const normalPdf = (x, variance) => Math.exp((-x * x) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
  const PDF_XS = sampleXs(HIST_RANGE[0], HIST_RANGE[1], 240);
  const PDF_YS = PDF_XS.map((x) => normalPdf(x, HIST_VAR));
  // 連続の番号 index（0〜3）のときのヒストグラム（となりの幅の間を補間）
  const histAt = (index) => {
    const i = clamp(Math.floor(index), 0, HISTS.length - 1);
    const j = Math.min(HISTS.length - 1, i + 1);
    return D.blendHistogram(HISTS[i].hist, HISTS[j].hist, index - i);
  };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('ガウス過程回帰とニューラルネットの関係を、式と図を使って解説します。', 7),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('全部で7章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('ガウス過程回帰とニューラルネット', { x: 0, y: 92, w: W, align: 'center', size: 70, weight: 800 });
      ui.text('無限に広いネットはガウス過程になり、その期待値はガウス過程回帰の式と一致する', { x: 0, y: 200, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, {
          x: left ? 130 : 830,
          y: 296 + (left ? i : i - 4) * 52,
          size: 24,
          delay: 0.6 + 0.12 * i,
        });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 130, y: 540, size: 24, at: 1 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>図で見る`, { x: 130, y: 588, size: 24, at: 1, delay: 0.2 });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 830, y: 540, size: 24, at: 2 });
      ui.text('例のデータは説明用に式で作った6点です。図の数値は、乱数（種を固定）で作ったネットで計算しました', { x: 830, y: 594, w: 680, size: 20, color: C.muted, at: 2, delay: 0.4, lh: 1.5 });
    },
  });

  // ---------------------------------------------------------------- この動画のポイント
  const POINT_CARDS = [
    { x: 90, y: 116 },
    { x: 810, y: 116 },
    { x: 90, y: 436 },
    { x: 810, y: 436 },
  ];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 300;
  const FIG = { dx: 410, dy: 52, w: 262, h: 220 }; // カードの中の図の場所
  const K_HEAT_N = 60;
  const K_HEAT_RANGE = [-3, 3];
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① 重みを乱数で決めたネットは、ランダムな関数を作ります。幅を無限に広げると、中心極限定理でガウス過程になります。', 10),
      beat('② そのカーネルは、活性化関数や重みの分散など、ネットの形で決まります。ReLU なら式で書けます。', 9),
      beat('③ 無限に広いネットをベイズ推論すると、事後分布がガウス過程回帰と一致します。予測の期待値も同じ式です。', 10),
      beat('④ 勾配降下法で学習したネットも、初期値について平均すると、カーネル回帰の式と一致します。幅が無限、二乗誤差、小さな学習率などが条件です。', 12),
      beat('この関係を、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① ランダムな重み → ガウス過程', R`重みを乱数で決めたネットは、ランダムな関数を作る。幅 $H \to \infty$ で、中心極限定理によりガウス過程になる`],
        ['② カーネルはネットの形で決まる', R`$K(x,x') = \sigma_v^2\,\mathbb{E}[\phi(u)\phi(u')]$<br>活性化関数・重みの分散・層の数で決まる。ReLU なら式で書ける`],
        ['③ ベイズ推論：事後分布が一致', '無限に広いネットのベイズ推論 ＝ NNGP カーネルのガウス過程回帰。予測の期待値も分散も同じ式'],
        ['④ 勾配降下法：平均が一致', '初期値を変えて学習したネットの平均 ＝ カーネル回帰の式。最後の層だけなら NNGP、全部の層なら NTK'],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: POINT_CARD_W, h: POINT_CARD_H, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 26, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 86, w: 360, size: 21, lh: 1.65, color: C.text2, at: k, delay: 0.3 });
      });
      // ② のカーネルの色の図
      const max = M.nngp(K_HEAT_RANGE[1], K_HEAT_RANGE[1]);
      const at = (i) => K_HEAT_RANGE[0] + ((K_HEAT_RANGE[1] - K_HEAT_RANGE[0]) * (i + 0.5)) / K_HEAT_N;
      const heat = heatmapCanvas(K_HEAT_N, K_HEAT_N, (i, j) => seqColor(M.nngp(at(K_HEAT_N - 1 - i), at(j)) / max));
      // ④ の束（最後の層だけ学習し終えたネット）
      const L = D.lastLayer();
      const trained = L.nets.map((f) => f(Infinity));
      return { heat, trained: trained.slice(0, 24), trainedMean: D.averageOf(trained) };
    },
    draw(ctx, s, state) {
      const fig = (i) => ({ x: POINT_CARDS[i].x + FIG.dx, y: POINT_CARDS[i].y + FIG.dy, w: FIG.w, h: FIG.h });
      const grid = M.GRID;

      // ① ヒストグラムが正規分布に近づく
      const a1 = s.p(1, 0.8, 0.4);
      if (a1 > 0) {
        const f = fig(0);
        const P = new Plot({ x: f.x, y: f.y + 10, w: f.w, h: f.h - 40, xr: [-5, 5], yr: [0, HIST_TOP] });
        ctx.save();
        ctx.globalAlpha = a1;
        const index = keyframes(s.u, [[s.bt(1) + 1.2, 0], [s.bt(1) + 6, 3]]);
        D.drawHistogram(ctx, P, histAt(index), { color: D.COLOR.nngp, top: HIST_TOP });
        P.line(ctx, PDF_XS, PDF_YS, { color: C.text, width: 2, dash: [6, 5] });
        P.hline(ctx, 0, { color: C.axis, dash: null, width: 1 });
        const width = HIST_WIDTHS[Math.round(index)];
        canvasText(ctx, `幅 H = ${width}`, f.x + f.w / 2, f.y + f.h - 2, { size: 18, color: C.text2, align: 'center', weight: 700 });
        ctx.restore();
      }

      // ② カーネルの色の図
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const f = fig(1);
        const size = 190;
        const x0 = f.x + (f.w - size) / 2 + 8;
        const y0 = f.y + 4;
        drawImage(ctx, state.heat, x0, y0, size, size, { alpha: a2, smooth: true });
        ctx.save();
        ctx.globalAlpha = a2;
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(x0 - 0.5, y0 - 0.5, size + 1, size + 1);
        canvasText(ctx, 'x′', x0 + size / 2, y0 + size + 24, { size: 17, color: C.text2, align: 'center' });
        canvasText(ctx, 'x', x0 - 12, y0 + size / 2 + 6, { size: 17, color: C.text2, align: 'right' });
        ctx.restore();
      }

      // ③ ガウス過程回帰（ノイズあり）の平均と帯
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const f = fig(2);
        const P = new Plot({ ...f, xr: [-4, 4], yr: [-3, 3] });
        const gp = D.gpNoisy();
        ctx.save();
        ctx.globalAlpha = a3;
        P.band(ctx, grid, gp.mean.map((m, i) => m - 2 * gp.sd[i]), gp.mean.map((m, i) => m + 2 * gp.sd[i]), { color: D.COLOR.nngp, alpha: 0.25 });
        P.line(ctx, grid, gp.mean, { color: D.COLOR.nngp, width: 3, upto: s.p(3, 1.6, 0.8) });
        P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 5, color: D.COLOR.data });
        ctx.restore();
      }

      // ④ 学習したネットの束、平均、式
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const f = fig(3);
        const P = new Plot({ ...f, xr: [-4, 4], yr: [-3, 3] });
        ctx.save();
        ctx.globalAlpha = a4;
        state.trained.forEach((line) => P.line(ctx, grid, line, { color: D.COLOR.net, width: 1, alpha: 0.35 }));
        P.line(ctx, grid, state.trainedMean, { color: D.COLOR.mean, width: 3.5, upto: s.p(4, 1.6, 1.0) });
        P.line(ctx, grid, D.gpNoiseFree().mean, { color: D.COLOR.nngp, width: 2.5, dash: [7, 6], alpha: s.p(4, 0.8, 2.4) });
        P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 5, color: D.COLOR.data });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（2つのモデル）
  const NET_CARD_NET = M.randomNet(5, M.makeRandom(41));
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: CHAPTERS[0],
    beats: [
      beat(R`ガウス過程回帰は、関数 $f$ そのものに正規分布を置きます。平均は 0、共分散はカーネル $k(x, x')$ です。`, 9),
      beat(R`データ $\mathbf{y}$ を見たあとの予測の期待値は、$k(x)^\top (K + \sigma_n^2 I)^{-1}\mathbf{y}$ でした。`, 8),
      beat(R`一方、隠れ層が1つのニューラルネットは、$H$ 個のユニットの出力に重みを掛けて足します。$H$ を幅と呼びます。`, 9),
      beat(R`学習の前、重みは乱数で決めます。どれも独立な標準正規分布で、出力には $\sigma_v/\sqrt{H}$ を掛けます。`, 9),
      beat('重みが乱数なら、ネットが作る関数も乱数です。この「関数の分布」は、どんな分布でしょうか。', 8),
    ],
    build(ui) {
      ui.tex(R`f \sim \mathcal{GP}\big(0,\ k(x, x')\big)`, { x: LEFT_X, y: 128, size: 34 });
      ui.text('ガウス過程：関数そのものに正規分布を置く', { x: LEFT_X + 360, y: 136, size: 22, color: C.text2, delay: 0.6 });
      ui.tex(R`\mathbb{E}[f(x) \mid \mathbf{y}] = k(x)^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, { x: LEFT_X, y: 204, size: 32, at: 1 });
      ui.text('予測の期待値（事後平均）。$K$ はデータ点どうしのカーネル行列', { x: LEFT_X, y: 270, size: 21, color: C.text2, at: 1, delay: 0.6 });
      ui.tex(R`f(x) = \frac{\sigma_v}{\sqrt{H}} \sum_{j=1}^{H} v_j\,\phi(\sigma_w w_j x + \sigma_a a_j)`, { x: LEFT_X, y: 340, size: 32, at: 2 });
      ui.text(R`$\phi(u) = \max(0, u)$（ReLU）、$H$ ＝ 幅（隠れユニットの数）`, { x: LEFT_X, y: 446, size: 22, at: 2, delay: 0.6 });
      ui.tex(R`w_j,\ a_j,\ v_j \sim \mathcal{N}(0, 1)\quad\text{（すべて独立）}`, { x: LEFT_X, y: 514, size: 30, at: 3 });
      ui.text(R`学習の前の初期値。$1/\sqrt{H}$ を掛けるので、幅を広げても出力の大きさは変わらない`, { x: LEFT_X, y: 574, w: 880, size: 21, color: C.text2, at: 3, delay: 0.6 });
      ui.text('→ 重みが乱数なら、関数も乱数。その分布は？', { x: LEFT_X, y: 664, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      seeThrough(ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 250, title: 'ガウス過程回帰（ノイズなし）', at: 0 }));
      seeThrough(ui.card({ x: CARD_X, y: 400, w: CARD_W, h: 340, title: 'ニューラルネット（隠れ層1つ）', at: 2 }));
    },
    draw(ctx, s) {
      const a = s.p(0, 0.6, 0.3);
      if (a > 0) {
        const P = new Plot({ x: CARD_X + 50, y: 180, w: 420, h: 170, xr: [-4, 4], yr: [-3, 3] });
        const gp = D.gpNoiseFree();
        const grid = M.GRID;
        ctx.save();
        ctx.globalAlpha = a;
        P.hline(ctx, 0, { color: C.axis, dash: null, width: 1 });
        P.band(ctx, grid, gp.mean.map((m, i) => m - 2 * gp.sd[i]), gp.mean.map((m, i) => m + 2 * gp.sd[i]), { color: D.COLOR.nngp, alpha: 0.25 * s.p(1, 0.8) });
        P.line(ctx, grid, gp.mean, { color: D.COLOR.nngp, width: 3, upto: s.p(1, 1.6, 0.4) });
        P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 5, color: D.COLOR.data });
        ctx.restore();
      }
      const b = s.p(2, 0.6, 0.3);
      if (b > 0) {
        D.drawNetwork(ctx, { x: CARD_X + 24, y: 450, w: CARD_W - 48, h: 280 }, s.u >= s.bt(3) ? NET_CARD_NET : null, { units: 5, alpha: b, edgeAlpha: lerp(0.6, 1, s.p(3, 0.6)) });
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（ランダムな重み → ランダムな関数）
  const DRAW_COUNT = 30;
  const DRAW_INTERVAL = 0.2; // 秒
  const DRAW_WIDTH = 5;
  // 1回目は、5つの折れ目がすべて図の範囲に入るネット（種 40）。2回目からは種 7 の乱数で引く
  const FEATURED_SEED = 40;
  const DRAWS = (() => {
    const random = M.makeRandom(7);
    return Array.from({ length: DRAW_COUNT }, (_, k) => {
      const net = M.randomNet(DRAW_WIDTH, k === 0 ? M.makeRandom(FEATURED_SEED) : random);
      return { net, ys: netFunction(net) };
    });
  })();
  const FEATURED = DRAWS[0].net;
  const UNIT_LINES = Array.from({ length: DRAW_WIDTH }, (_, j) => PLOT_XS.map((x) => M.outputScale(DRAW_WIDTH) * FEATURED.v[j] * M.unitAt(FEATURED, j, x)));
  const VALUE_X = 1; // 値を集める x
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: 'ランダムな重み → ランダムな関数',
    beats: [
      beat('幅 5 のネットで、重みを乱数で決めました。線の色は重みの符号（赤が正、青が負）、太さは大きさです。', 9),
      beat('ReLU のユニットは、それぞれ折れ線を1本作ります。0 より下を切り落とした、ちょうつがいの形です。', 9),
      beat('それらを足すと、折れ曲がった関数が1本できます。これが、このネットの出力です。', 8),
      beat('重みを引き直すたびに、別の関数ができます。30回引くと、関数の束になります。', 9),
      beat(R`同じ $x$ での値を集めると、ばらつきが見えます。この分布が、幅を広げるとどうなるかを、次の章で見ます。`, 9),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const box = { x: 70, y: 150, w: 660, h: 540 };
      const P = new Plot({ x: 860, y: 150, w: 650, h: 520, xr: [-3, 3], yr: [-5, 5] });
      const a0 = s.p(0, 0.6, 0.2);
      // 引き直しの何回目か（第4字幕から）
      const drawIndex = s.u < s.bt(3) + 0.5 ? 0 : Math.min(DRAW_COUNT - 1, Math.floor((s.u - s.bt(3) - 0.5) / DRAW_INTERVAL));
      const drawing = s.u >= s.bt(3) + 0.5;
      // 第2字幕: ユニットを順に光らせる
      const unitStep = s.u >= s.bt(1) && s.u < s.bt(2) ? Math.floor((s.u - s.bt(1) - 0.6) / 1.0) : null;
      const glowUnit = unitStep !== null && unitStep >= 0 && unitStep < DRAW_WIDTH ? unitStep : null;
      D.drawNetwork(ctx, box, DRAWS[drawIndex].net, { units: DRAW_WIDTH, alpha: a0, glowUnit });
      legend(ctx, [{ color: D.COLOR.positive, label: '正の重み' }, { color: D.COLOR.negative, label: '負の重み' }], box.x + 40, box.y + box.h + 50, { alpha: a0 });

      P.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-4, -2, 0, 2, 4], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      // ユニットごとの折れ線
      const unitsAlpha = s.p(1, 0.6, 0.4) * (1 - 0.65 * s.p(2, 0.8)) * (1 - s.p(3, 0.6));
      UNIT_LINES.forEach((ys, j) => {
        const show = clamp((s.u - s.bt(1) - 0.6 - j * 1.0) / 0.5);
        if (show > 0 && unitsAlpha > 0) P.line(ctx, PLOT_XS, ys, { color: FEATURED.v[j] > 0 ? D.COLOR.positive : D.COLOR.negative, width: 2.5, alpha: unitsAlpha * show });
      });
      // 足した関数
      const sumAlpha = s.p(2, 0.4, 0.2) * (drawing ? 0 : 1);
      if (sumAlpha > 0) P.line(ctx, PLOT_XS, DRAWS[0].ys, { color: D.COLOR.mean, width: 3.5, upto: s.p(2, 1.6, 0.3), alpha: sumAlpha });
      // 引き直した関数の束
      if (drawing) {
        for (let k = 0; k < drawIndex; k++) P.line(ctx, PLOT_XS, DRAWS[k].ys, { color: D.COLOR.net, width: 1.3, alpha: 0.4 });
        P.line(ctx, PLOT_XS, DRAWS[drawIndex].ys, { color: D.COLOR.mean, width: 3 });
        canvasText(ctx, `${drawIndex + 1} 回目`, P.x + 16, P.y + 24, { size: 20, color: C.text2, weight: 700 });
      }
      // x = 1 での値
      const a4 = s.p(4, 0.6, 0.3);
      if (a4 > 0) {
        P.vline(ctx, VALUE_X, { color: C.text, alpha: a4 });
        const iX = PLOT_XS.findIndex((x) => x >= VALUE_X - 1e-9);
        P.dots(ctx, DRAWS.map(() => VALUE_X), DRAWS.map((d) => d.ys[iX]), { r: 5, color: C.text, alpha: a4 });
        P.label(ctx, `x = ${VALUE_X} での値`, VALUE_X, 4.6, { dx: 12, size: 19, color: C.text, alpha: a4 });
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（中心極限定理）
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: CHAPTERS[1],
    beats: [
      beat(R`入力 $x$ を1つ決めます。出力 $f(x)$ は、$H$ 個の項 $z_j$ の和を、$\sqrt{H}$ で割ったものです。`, 8),
      beat('重みはユニットごとに独立なので、各項は独立で、同じ分布に従います。平均は 0 です。', 8),
      beat(R`中心極限定理から、$H \to \infty$ で $f(x)$ は正規分布に近づきます。$\sqrt{H}$ で割るので、分散は一定のままです。`, 10),
      beat(R`入力が何点あっても同じです。多変量の中心極限定理で、$(f(x_1), \dots, f(x_n))$ は多変量正規分布になります。`, 10),
      beat('どの点の組でも多変量正規分布。これがガウス過程の定義そのものです。無限に広いネットは、ガウス過程です（ニール 1996）。', 10),
    ],
    build(ui) {
      ui.tex(R`f(x) = \frac{1}{\sqrt{H}} \sum_{j=1}^{H} z_j,\qquad z_j = \sigma_v\, v_j\,\phi(\sigma_w w_j x + \sigma_a a_j)`, { x: LEFT_X, y: 124, size: 29 });
      ui.text(R`$z_1, \dots, z_H$ は独立で同じ分布。$v_j$ の平均が 0 なので $\mathbb{E}[z_j] = 0$`, { x: LEFT_X, y: 236, size: 23, at: 1 });
      ui.tex(R`f(x)\ \xrightarrow{\ H \to \infty\ }\ \mathcal{N}\big(0,\ \mathrm{Var}[z_j]\big)`, { x: LEFT_X, y: 312, size: 32, at: 2 });
      ui.text(R`中心極限定理。$1/\sqrt{H}$ のおかげで、分散は幅によらず一定`, { x: LEFT_X, y: 384, size: 22, color: C.text2, at: 2, delay: 0.6 });
      ui.tex(R`\big(f(x_1), \dots, f(x_n)\big)\ \xrightarrow{\ H \to \infty\ }\ \mathcal{N}(\mathbf{0},\ K)`, { x: LEFT_X, y: 456, size: 30, at: 3 });
      ui.tex(R`K_{ik} = \mathrm{Cov}\big[z_j(x_i),\ z_j(x_k)\big]`, { x: LEFT_X + 40, y: 528, size: 26, at: 3, delay: 0.5 });
      ui.text('→ どの点の組でも多変量正規分布 ＝ ガウス過程（ニール 1996）', { x: LEFT_X, y: 640, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 320, title: R`出力に掛ける数で、$H \to \infty$ の姿が変わる`, at: 2 });
      ui.table({
        x: CARD_X + 20, y: 190, widths: [130, 330], aligns: ['center', 'left'], size: 21, rowH: 56,
        header: ['掛ける数', R`$H \to \infty$ のとき`],
        rows: [
          [R`$1/H$`, '0 に縮む（ばらつきが消える）'],
          [R`$1/\sqrt{H}$`, '正規分布（ばらつきが残る）'],
          ['$1$', R`分散が $H$ 倍になり発散`],
        ],
        at: 2, rowDelay: 0.4, delay: 0.6,
        glowRows: [null, [{ from: 2 }], null],
      });
      ui.card({ x: CARD_X, y: 480, w: CARD_W, h: 260, title: 'ニール（1996）', at: 4 });
      ui.text('隠れ層1つのネットで、重みの分布を決めて幅を無限にすると、ガウス過程になることを示した。ベイズ推論の研究から生まれた結果', { x: CARD_X + 24, y: 534, w: CARD_W - 48, size: 21, lh: 1.6, color: C.text2, at: 4, delay: 0.4 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（ヒストグラムと関数の例）
  const SAMPLE_WIDTHS = [3, 30, 1000];
  const SAMPLE_COUNT = 8;
  const SAMPLES = SAMPLE_WIDTHS.map((width, i) => {
    const random = M.makeRandom(900 + i);
    return Array.from({ length: SAMPLE_COUNT }, () => netFunction(M.randomNet(width, random)));
  });
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '幅を広げると、正規分布に近づく',
    beats: [
      beat(R`左は、$x = 1$ での出力 $f(1)$ を、2万個のネットで集めたヒストグラムです。幅 1 では、0 に鋭いとがりがあり、正規分布（点線）とは違います。`, 11),
      beat('幅を 3、10 と広げると、とがりが消えて、正規分布に近づきます。', 8),
      beat('幅 100 では、ほぼ正規分布です。分散は、どの幅でも 2 のまま。変わるのは、分布の形だけです。', 9),
      beat('右は、ネットが作る関数の例です。幅 3 では、数本の折れ線を足しただけの形です。', 8),
      beat('幅 30、1000 と広げると、なめらかな曲線に近づきます。これが、ガウス過程から引いた関数の姿です。', 9),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 200, w: 620, h: 440, xr: HIST_RANGE, yr: [0, HIST_TOP] });
      const a0 = s.p(0, 0.6, 0.2);
      const index = keyframes(s.u, [[s.bt(1), 0], [s.bt(1) + 1.6, 1], [s.bt(1) + 3.6, 1], [s.bt(1) + 5.2, 2], [s.bt(2), 2], [s.bt(2) + 1.6, 3]]);
      const nearest = HISTS[Math.round(index)];
      ctx.save();
      ctx.globalAlpha = a0;
      P.axes(ctx, { xticks: [-6, -4, -2, 0, 2, 4, 6], yticks: [0, 0.2, 0.4, 0.6], fmtY: (v) => fmt(v, 1), xlabel: 'f(1)', ylabel: '密度' });
      D.drawHistogram(ctx, P, histAt(index), { color: D.COLOR.nngp, top: HIST_TOP });
      P.line(ctx, PDF_XS, PDF_YS, { color: C.text, width: 2.5, dash: [7, 6] });
      canvasText(ctx, `幅 H = ${nearest.width}`, P.x + 16, P.y + 30, { size: 30, color: C.text, weight: 800 });
      canvasText(ctx, `分散 ${fmt(nearest.variance, 2)}（式では ${fmt(HIST_VAR, 2)}）`, P.x + 16, P.y + 66, { size: 20, color: C.text2 });
      const spike = clamp(1 - index);
      if (spike > 0) P.label(ctx, `↑ 約${Math.round(HISTS[0].zeroShare * 100)}%が 0 ちょうど`, 0, HIST_TOP, { dx: 14, dy: 22, size: 18, color: C.text, alpha: spike });
      ctx.restore();
      legend(ctx, [{ kind: 'band', color: D.COLOR.nngp, label: '2万個のネット' }, { color: C.text, dash: [7, 6], label: `正規分布 N(0, ${fmt(HIST_VAR, 0)})` }], P.x, P.y + P.h + 70, { alpha: a0 });

      // 右: 幅ごとの関数の例
      SAMPLE_WIDTHS.forEach((width, i) => {
        const a = i === 0 ? s.p(3, 0.6, 0.3) : s.p(4, 0.6, 0.3 + (i - 1) * 1.4);
        if (a <= 0) return;
        const Q = new Plot({ x: 900, y: 160 + i * 200, w: 600, h: 150, xr: [-3, 3], yr: [-4, 4] });
        ctx.save();
        ctx.globalAlpha = a;
        Q.axes(ctx, { xticks: i === 2 ? [-3, -2, -1, 0, 1, 2, 3] : [], yticks: [-3, 0, 3] });
        SAMPLES[i].forEach((ys, k) => Q.line(ctx, PLOT_XS, ys, { color: k === 0 ? D.COLOR.mean : D.COLOR.net, width: k === 0 ? 2.6 : 1.4, alpha: k === 0 ? 1 : 0.55 }));
        canvasText(ctx, `幅 H = ${width}`, Q.x + Q.w, Q.y - 8, { size: 20, color: C.text, align: 'right', weight: 700 });
        ctx.restore();
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（NNGP カーネル）
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: CHAPTERS[2],
    beats: [
      beat(R`ガウス過程を決めるのはカーネル、つまり2点の出力の共分散です。$K(x, x') = \sigma_v^2\,\mathbb{E}[\phi(u)\,\phi(u')]$ です。`, 10),
      beat(R`期待値は、1つのユニットの重み $w, a$ についての平均です。幅によらないので、有限の幅でも、共分散はこの式のとおりです。`, 10),
      beat(R`ReLU では、この期待値が式で求まります。ベクトル $\mathbf{z} = (\sigma_a, \sigma_w x)$ のなす角 $\psi$ を使う、アークコサイン・カーネルです。`, 11),
      beat(R`$x = x'$ とおくと、分散は $x^2$ とともに大きくなります。原点から離れるほど値がばらつく、定常でないカーネルです。`, 10),
      beat('層が深いときも、前の層のカーネルから次の層のカーネルを、同じ形の式で順に計算できます（リーほか、マシューズほか 2018）。', 10),
    ],
    build(ui) {
      ui.tex(R`K(x, x') = \mathrm{Cov}\big[f(x), f(x')\big] = \sigma_v^2\,\mathbb{E}_{w, a}\big[\phi(u)\,\phi(u')\big]`, { x: LEFT_X, y: 124, size: 29 });
      ui.text(R`$u = \sigma_w w x + \sigma_a a$、$u' = \sigma_w w x' + \sigma_a a$（同じユニットの重み）`, { x: LEFT_X, y: 192, size: 21, color: C.text2, delay: 0.6 });
      ui.text(R`1つのユニットの重みについての平均 → どの幅 $H$ でも正確（変わるのは分布の形だけ）`, { x: LEFT_X, y: 246, size: 22, at: 1 });
      ui.tex(R`K(x, x') = \frac{\sigma_v^2}{2\pi}\,\lVert\mathbf{z}\rVert\,\lVert\mathbf{z}'\rVert\,\big(\sin\psi + (\pi - \psi)\cos\psi\big)`, { x: LEFT_X, y: 318, size: 29, at: 2 });
      ui.text(R`$\mathbf{z} = (\sigma_a,\ \sigma_w x)$、$\psi$ ＝ $\mathbf{z}$ と $\mathbf{z}'$ のなす角（アークコサイン・カーネル、チョ・ソール 2009）`, { x: LEFT_X, y: 400, w: 900, size: 21, color: C.text2, at: 2, delay: 0.6 });
      ui.tex(R`K(x, x) = \tfrac{1}{2}\,\sigma_v^2\,\big(\sigma_a^2 + \sigma_w^2 x^2\big)`, { x: LEFT_X, y: 470, size: 29, at: 3 });
      ui.text('原点から離れるほど分散が大きい（定常でない）', { x: LEFT_X + 430, y: 478, size: 21, color: C.text2, at: 3, delay: 0.6 });
      ui.tex(R`K^{(l+1)}(x, x') = \sigma_b^2 + \sigma_w^2\,\mathbb{E}_{g \sim \mathcal{GP}(0,\,K^{(l)})}\big[\phi(g(x))\,\phi(g(x'))\big]`, { x: LEFT_X, y: 562, size: 27, at: 4 });
      ui.text('深いネット：前の層のカーネルから、次の層のカーネルを順に計算（リーほか 2018、マシューズほか 2018）', { x: LEFT_X, y: 640, w: 900, size: 21, color: C.text2, at: 4, delay: 0.6 });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 270, title: 'この動画の設定' });
      ui.table({
        x: CARD_X + 20, y: 180, widths: [150, 310], aligns: ['center', 'left'], size: 21, rowH: 50,
        header: ['記号', '値'],
        rows: [
          [R`$\sigma_w,\ \sigma_a$`, '1, 1'],
          [R`$\sigma_v^2$`, '2（He の初期化に当たる）'],
          ['活性化関数', 'ReLU'],
        ],
        at: 0, rowDelay: 0.3, delay: 0.6,
      });
      ui.card({ x: CARD_X, y: 430, w: CARD_W, h: 310, title: 'ほかの活性化関数', at: 2 });
      ui.table({
        x: CARD_X + 20, y: 480, widths: [150, 310], aligns: ['center', 'left'], size: 21, rowH: 52,
        header: ['活性化関数', 'カーネル'],
        rows: [
          ['ReLU', 'アークコサイン（この動画）'],
          ['erf（S字形）', 'アークサイン（ウィリアムズ）'],
          ['そのほか', '数値積分で計算する'],
        ],
        at: 2, rowDelay: 0.4, delay: 1.0,
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（点の雲とカーネルの形）
  const CLOUD_COUNT = 600;
  const CLOUD_WIDTH = 1000;
  const CLOUD_X = [0, 1];
  const CLOUD = (() => {
    const random = M.makeRandom(2718);
    return Array.from({ length: CLOUD_COUNT }, () => {
      const net = M.randomNet(CLOUD_WIDTH, random);
      return CLOUD_X.map((x) => M.netAt(net, x));
    });
  })();
  const CLOUD_COV = [
    [M.nngp(0, 0), M.nngp(0, 1)],
    [M.nngp(1, 0), M.nngp(1, 1)],
  ];
  const CLOUD_CORR = (() => {
    const n = CLOUD.length;
    const mx = CLOUD.reduce((a, p) => a + p[0], 0) / n;
    const my = CLOUD.reduce((a, p) => a + p[1], 0) / n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    CLOUD.forEach(([x, y]) => {
      sxx += (x - mx) ** 2;
      syy += (y - my) ** 2;
      sxy += (x - mx) * (y - my);
    });
    return sxy / Math.sqrt(sxx * syy);
  })();
  const FORMULA_CORR = CLOUD_COV[0][1] / Math.sqrt(CLOUD_COV[0][0] * CLOUD_COV[1][1]);
  // カーネルの形: 3つの x について K(x, x′)。点は、乱数の重み（ユニット）での平均
  const KERNEL_X = [-2, 0, 2];
  const KERNEL_COLORS = [C.blue, C.aqua, C.violet];
  const KERNEL_XS = sampleXs(-3, 3, 240);
  const MC_XS = sampleXs(-3, 3, 12);
  const MC_UNITS = 40000;
  const MC_K = (() => {
    const random = M.makeRandom(1618);
    const sums = KERNEL_X.map(() => MC_XS.map(() => 0));
    for (let s = 0; s < MC_UNITS; s++) {
      const w = random.normal();
      const a = random.normal();
      const unit = (x) => M.relu(M.SIGMA_W * w * x + M.SIGMA_A * a);
      const left = KERNEL_X.map(unit);
      MC_XS.forEach((x, k) => {
        const right = unit(x);
        left.forEach((l, i) => (sums[i][k] += M.SIGMA_V2 * l * right));
      });
    }
    return sums.map((row) => row.map((v) => v / MC_UNITS));
  })();
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: 'カーネルの式と、乱数のネットを比べる',
    beats: [
      beat(R`幅 1000 のネットを 600 個作り、$x = 0$ と $x = 1$ での出力の組を、1個1点で打ちました。`, 9),
      beat(`式のカーネルから計算した楕円（2シグマ）に、点の雲がちょうど収まります。相関係数は、式で ${fmt(FORMULA_CORR, 3)}、点の雲で ${fmt(CLOUD_CORR, 3)} です。`, 11),
      beat(R`右は、$x'$ を動かしたときの $K(x, x')$ です。線は式、点は乱数の重みで平均した値で、よく一致します。`, 10),
      beat(R`点線の $K(x', x')$ は、原点から離れるほど大きくなります。ガウスカーネル（RBF）と違い、遠くの点との相関も 0 に戻りません。`, 11),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 130, y: 170, w: 500, h: 500, xr: [-4, 4], yr: [-5, 5] });
      const a0 = s.p(0, 0.6, 0.2);
      ctx.save();
      ctx.globalAlpha = a0;
      P.axes(ctx, { xticks: [-4, -2, 0, 2, 4], yticks: [-4, -2, 0, 2, 4], xlabel: 'f(0)', ylabel: 'f(1)' });
      const shown = Math.round(CLOUD_COUNT * s.lin(0, 3, 0.6));
      P.dots(ctx, CLOUD.slice(0, shown).map((p) => p[0]), CLOUD.slice(0, shown).map((p) => p[1]), { r: 3, color: C.text2, alpha: 0.6, ring: null });
      ctx.restore();
      const a1 = s.p(1, 0.8, 0.3);
      D.drawCovEllipse(ctx, P, CLOUD_COV, { color: D.COLOR.mean, width: 3, alpha: a1 });
      if (a1 > 0) {
        legend(ctx, [{ color: D.COLOR.mean, label: '式の楕円（2シグマ）' }], P.x, P.y + P.h + 70, { alpha: a1 });
        canvasText(ctx, `相関係数　式 ${fmt(FORMULA_CORR, 3)} ／ 点の雲 ${fmt(CLOUD_CORR, 3)}`, P.x + 250, P.y + P.h + 76, { size: 20, color: C.text, alpha: a1 });
      }

      // 右: カーネルの形
      const a2 = s.p(2, 0.6, 0.2);
      if (a2 <= 0) return;
      const Q = new Plot({ x: 830, y: 170, w: 660, h: 480, xr: [-3, 3], yr: [0, 10.5] });
      ctx.save();
      ctx.globalAlpha = a2;
      Q.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 2, 4, 6, 8, 10], xlabel: "x′", ylabel: "K(x, x′)" });
      KERNEL_X.forEach((x0, i) => {
        const grow = s.p(2, 1.4, 0.4 + i * 0.5);
        Q.line(ctx, KERNEL_XS, KERNEL_XS.map((x) => M.nngp(x0, x)), { color: KERNEL_COLORS[i], width: 3, upto: grow });
        Q.dots(ctx, MC_XS, MC_K[i], { r: 5, color: KERNEL_COLORS[i], alpha: s.p(2, 0.6, 2.2) });
      });
      const a3 = s.p(3, 0.8, 0.3);
      Q.line(ctx, KERNEL_XS, KERNEL_XS.map((x) => M.nngp(x, x)), { color: C.text, width: 2.5, dash: [7, 6], alpha: a3 });
      ctx.restore();
      legend(ctx, [...KERNEL_X.map((x0, i) => ({ color: KERNEL_COLORS[i], label: `x = ${fmt(x0, 0)}` })), { kind: 'dot', color: C.text2, label: '乱数での平均' }], Q.x, Q.y + Q.h + 70, { alpha: a2, gap: 24 });
      if (a3 > 0) legend(ctx, [{ color: C.text, dash: [7, 6], label: "K(x′, x′)（分散）" }], Q.x + 250, Q.y + 30, { alpha: a3 });
    },
  });
})();
