// scenes-fit.js — 第3章（ペナルティ）、第4章（識別の制約と有効自由度）、第5章（P-IRLS）。
// 図の曲線は、mgcv の X・S を使って gam-math.js でその場で計算する（λ を動かす図のため）。
(() => {
  const { C, Plot, fmt, canvasText, lerp, clamp, legend, rgba, roundRect, keyframes } = KIT;
  const X = GAMX;
  const M = GAMM;
  const DATA = GAMDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };

  const SINGLE = DATA.single;
  const WIDE = X.wide;
  const WIDE_K = DATA.wide.k;
  const OPT_LOG = X.log10(WIDE.sp); // REML で選ばれた λ（対数）
  const wideAtOpt = WIDE.fit(WIDE.sp);
  // λ を「a × 10^b」の形の TeX にする
  const lambdaTex = (log) => {
    const exponent = Math.floor(log + 1e-9);
    const mantissa = 10 ** (log - exponent);
    return R`\lambda = ${mantissa.toFixed(1)} \times 10^{${exponent}}`;
  };

  // ---------------------------------------------------------------- 第3章 理論
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '波打ちにペナルティをかける',
    beats: [
      beat('基底を多めに用意すると、最小二乗だけでは、データのばらつきまで追いかけて、波打った曲線になります。'),
      beat('そこで、当てはまりの悪さに、曲線の波打ちの大きさを足したものを、最小にします。波打ちは、2階微分の2乗の積分で測ります。', 11),
      beat('基底で表すと、この積分は、係数の2次形式 $\\beta^{\\mathsf T} S \\beta$ になります。S は、基底から前もって計算できる行列です。'),
      beat('λ を決めれば、係数は1回の連立方程式で求まります。普通の最小二乗の式に、λS を足しただけの形です。'),
      beat('直線は2階微分が 0 なので、ペナルティがかかりません。λ を大きくすると、曲線は直線に近づきます。'),
    ],
    build(ui) {
      ui.tex(R`\min_{\boldsymbol\beta}\ \ \htmlClass{hl-fit}{\|\boldsymbol y - X\boldsymbol\beta\|^2} \;+\; \lambda\, \htmlClass{hl-pen}{\int f''(x)^2\, dx}`, {
        x: LEFT_X, y: 116, size: 36, at: 1,
        hl: [{ cls: 'hl-fit', from: 1, to: 2, color: C.blue }, { cls: 'hl-pen', from: 1, to: 3, color: C.orange }],
      });
      ui.text(`<span style="color:${C.blue}">■</span> 当てはまりの悪さ　<span style="color:${C.orange}">■</span> 波打ちの大きさ　$\\lambda$：平滑化パラメータ`, { x: LEFT_X, y: 212, size: 22, color: C.text2, at: 1, delay: 0.4 });
      ui.text('基底が多い ＋ 最小二乗だけ → データのばらつきまで追いかける', { x: LEFT_X, y: 126, size: 27, weight: 700, color: C.red, until: 1 });
      ui.tex(R`\int f''(x)^2\, dx = \boldsymbol\beta^{\mathsf T} S\, \boldsymbol\beta, \qquad S_{kl} = \int b_k''(x)\, b_l''(x)\, dx`, { x: LEFT_X, y: 290, size: 31, at: 2 });
      ui.tex(R`\hat{\boldsymbol\beta} = \big(X^{\mathsf T} X + \htmlClass{hl-ls}{\lambda S}\big)^{-1} X^{\mathsf T} \boldsymbol y`, {
        x: LEFT_X, y: 420, size: 36, at: 3, hl: [{ cls: 'hl-ls', from: 3, to: 4 }], glow: [{ from: 3, to: 4 }],
      });
      ui.text('最小二乗の式に $\\lambda S$ を足しただけ', { x: 660, y: 440, size: 22, color: C.text2, at: 3, delay: 0.4 });
      ui.table({
        x: LEFT_X, y: 548, widths: [260, 420, 560], size: 23, rowH: 50, aligns: ['center', 'left', 'left'],
        header: ['$\\lambda$', '曲線', '理由'],
        rows: [
          ['$\\lambda \\to 0$', 'データを追いかけて波打つ', 'ペナルティが効かない（最小二乗と同じ）'],
          ['$\\lambda \\to \\infty$', '直線になる', '直線は $f\'\' = 0$ で、ペナルティが 0'],
        ],
        at: 4, rowDelay: 0.5, delay: 0.2,
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解: λ を動かす
  const SWEEP_BOX = { x: 100, y: 150, w: 860, h: 530 };
  const PANEL_X = 1050;
  const PANEL_W = 460;
  const SWEEP_SLIDER = { x: PANEL_X, y: 250, w: PANEL_W };
  const SLIDER_RANGE = [-8, 6];
  const SMALL_LOG = -8;
  const LARGE_LOG = 5;
  const rssRange = [WIDE.fit(10 ** SMALL_LOG).rss, WIDE.fit(10 ** 6).rss];
  const wiggleOf = (fit, lambda) => fit.penalty / lambda;
  const WIGGLE_LOG_RANGE = [-2, 6]; // 波打ちの大きさの棒は対数で描く
  function drawMeter(ctx, y, label, value, fraction, color, alpha) {
    canvasText(ctx, label, PANEL_X, y, { size: 19, color: C.text2, alpha });
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = rgba(C.text, 0.08);
    ctx.fillRect(PANEL_X, y + 14, PANEL_W, 18);
    ctx.fillStyle = color;
    ctx.fillRect(PANEL_X, y + 14, PANEL_W * clamp(fraction), 18);
    ctx.restore();
    canvasText(ctx, value, PANEL_X + PANEL_W, y, { size: 21, color: C.text, align: 'right', weight: 700, alpha });
  }
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: 'λ を動かして曲線を見る',
    beats: [
      beat(`基底を ${WIDE_K} 本に増やした例です。まず、λ をほぼ 0 にします。曲線はデータのばらつきを追いかけて、細かく波打ちます。`),
      beat('λ を大きくしていくと、波打ちが消えていきます。右の棒は、残差の2乗和と、波打ちの大きさです。', 10),
      beat('ほどよい λ では、真の関数に近い曲線になります。'),
      beat('さらに大きくすると、山までならされてしまいます。最後は直線になります。', 9),
      beat('λ は、当てはまりとなめらかさのつり合いを決める、ただ1つのつまみです。これをどう選ぶかは、第6章で扱います。'),
    ],
    build(ui) {
      const logAt = (u, bt) =>
        keyframes(u, [
          [bt(1) + 0.6, SMALL_LOG],
          [bt(2) - 0.6, OPT_LOG],
          [bt(3) + 0.6, OPT_LOG],
          [bt(4) - 1.2, LARGE_LOG],
          [bt(4) + 0.8, LARGE_LOG],
          [bt(4) + 3.6, OPT_LOG],
        ]);
      // build は場面のメソッドとして呼ばれるので、this.beatStarts で字幕の時刻が分かる
      const bt = (i) => this.beatStarts[i];
      ui.text('平滑化パラメータ（対数の目盛り）', { x: PANEL_X, y: 118, size: 19, color: C.text2 });
      ui.tex(lambdaTex(SMALL_LOG), { x: PANEL_X, y: 152, size: 29, slide: false, live: (u) => `$${lambdaTex(logAt(u, bt))}$` });
      ui.text(`基底 ${WIDE_K} 本（k = ${WIDE_K}）、データ ${SINGLE.n} 点`, { x: PANEL_X, y: 640, size: 19, color: C.muted });
      return { plot: X.singlePlot(SWEEP_BOX), logAt };
    },
    draw(ctx, s, st) {
      const log = st.logAt(s.u, s.bt);
      const lambda = 10 ** log;
      const fit = WIDE.fit(lambda);
      const alpha = s.p(0, 0.8);
      X.drawSingleData(ctx, st.plot, { alpha });
      st.plot.line(ctx, SINGLE.grid, WIDE.curve(fit.beta), { color: C.blue, width: 4, alpha, upto: s.p(0, 1.4, 0.4) });
      legend(ctx, [{ kind: 'dot', color: C.text2, label: 'データ' }, { color: C.orange, dash: [8, 6], label: '真の関数' }, { color: C.blue, label: 'ペナルティつきの当てはめ' }], SWEEP_BOX.x + 10, 742, { alpha, size: 17 });
      X.slider(ctx, SWEEP_SLIDER, log, SLIDER_RANGE, { alpha, ticks: [-8, -4, 0, 4], power: true });
      if (Math.abs(log - OPT_LOG) < 0.02 && s.beat >= 2) canvasText(ctx, 'REML で選ばれる値', SWEEP_SLIDER.x + ((OPT_LOG - SLIDER_RANGE[0]) / (SLIDER_RANGE[1] - SLIDER_RANGE[0])) * SWEEP_SLIDER.w, SWEEP_SLIDER.y - 22, { size: 17, color: C.yellow, align: 'center', alpha: s.beat === 2 ? s.p(2, 0.6) : s.p(4, 0.6, 3.6) });
      const meters = s.p(1, 0.8);
      drawMeter(ctx, 352, '当てはまりの悪さ（残差の2乗和）', fmt(fit.rss, 0), (fit.rss - rssRange[0] * 0.8) / (rssRange[1] - rssRange[0] * 0.8), C.blue, meters);
      const wiggle = wiggleOf(fit, lambda);
      drawMeter(ctx, 438, '波打ちの大きさ（2階微分の2乗の積分）', fmt(wiggle, wiggle >= 100 ? 0 : 1), (X.log10(Math.max(wiggle, 1e-9)) - WIGGLE_LOG_RANGE[0]) / (WIGGLE_LOG_RANGE[1] - WIGGLE_LOG_RANGE[0]), C.orange, meters);
      canvasText(ctx, '（棒は対数の目盛り）', PANEL_X + PANEL_W, 492, { size: 15, color: C.muted, align: 'right', alpha: meters });
      canvasText(ctx, '有効自由度（第4章）', PANEL_X, 560, { size: 19, color: C.text2, alpha: meters });
      canvasText(ctx, fmt(fit.edf, 1), PANEL_X + PANEL_W, 568, { size: 40, color: C.text, align: 'right', weight: 700, alpha: meters });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '識別の制約と有効自由度',
    beats: [
      beat('関数の和のモデルでは、1つの関数に定数を足し、別の関数から同じ定数を引いても、和は変わりません。このままでは、関数が1つに決まりません。', 11),
      beat('そこで mgcv は、それぞれの関数に、データの点での合計が 0 になる、という制約を付けます。制約は基底の作り直しで取り込むので、係数は k より1つ少ない9個になります。', 12),
      beat('次に、モデルの複雑さの測り方です。ペナルティがあると、係数の数は、実際の自由度を表しません。'),
      beat('代わりに使うのが、有効自由度です。行列 F の対角の和で定義します。F は、ペナルティで係数がどれだけ縮んだかを表す行列です。', 11),
      beat('λ が 0 なら、有効自由度は係数の数に等しく、λ を大きくすると減っていきます。1変数の項では、直線にあたる 1 が下限です。', 11),
    ],
    build(ui) {
      ui.tex(R`f_1(x_1) + f_2(x_2) = \big(f_1(x_1) + c\big) + \big(f_2(x_2) - c\big)`, { x: LEFT_X, y: 112, size: 30, dim: [[2, 5]] });
      ui.tex(R`\sum_{i=1}^{n} f_j(x_{ji}) = 0`, { x: LEFT_X, y: 196, size: 30, at: 1, glow: [{ from: 1, to: 2 }], dim: [[2, 5]] });
      ui.text('制約を基底の作り直しで取り込む → 項ごとの係数は $k - 1 = 9$ 個、定数は切片 $\\beta_0$ が受け持つ', { x: 400, y: 222, size: 22, color: C.text2, at: 1, delay: 0.4, dim: [[2, 5]] });
      ui.tex(R`\hat{\boldsymbol\beta} = F\, \tilde{\boldsymbol\beta}, \qquad \htmlClass{hl-f}{F = \big(X^{\mathsf T} X + \lambda S\big)^{-1} X^{\mathsf T} X}`, {
        x: LEFT_X, y: 352, size: 31, at: 3, hl: [{ cls: 'hl-f', from: 3, to: 4 }],
      });
      ui.text('$\\tilde{\\boldsymbol\\beta}$：ペナルティなしの係数', { x: 860, y: 366, size: 22, color: C.text2, at: 3, delay: 0.4 });
      ui.text('係数の数 ≠ 自由度（ペナルティで縮むため）', { x: LEFT_X, y: 300, size: 24, weight: 700, color: C.red, at: 2, until: 3 });
      ui.tex(R`\mathrm{edf} = \mathrm{tr}(F) = \sum_{k} F_{kk}`, { x: LEFT_X, y: 452, size: 34, at: 3, delay: 0.5, glow: [{ from: 3, to: 4 }] });
      ui.text('項ごとの有効自由度 ＝ $F$ の対角のうち、その項の係数の分の和', { x: 560, y: 470, size: 22, color: C.text2, at: 3, delay: 0.8 });
      ui.table({
        x: LEFT_X, y: 562, widths: [260, 520, 460], size: 23, rowH: 50, aligns: ['center', 'left', 'left'],
        header: ['$\\lambda$', '有効自由度', '1変数の項（k = 10）'],
        rows: [
          ['$\\lambda \\to 0$', '係数の数', '9'],
          ['$\\lambda \\to \\infty$', 'ペナルティのかからない成分の数', '1（直線）'],
        ],
        at: 4, rowDelay: 0.4, delay: 0.2,
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解: 成分ごとの縮み方
  const shrink = M.shrinkageBasis(WIDE.stats, M.totalPenalty(WIDE.info, [1]));
  const COMPONENTS = shrink.d.length;
  const UNPENALIZED = 2; // 定数と直線
  const BAR_BOX = { x: 110, y: 176, w: 860, h: 330 };
  const EDF_BOX = { x: 1090, y: 330, w: 420, h: 300 };
  const SHRINK_SLIDER = { x: 1090, y: 226, w: 420 };
  const SHAPE_PICKS = [0, 1, 2, 5, 14, COMPONENTS - 1]; // 形を描く成分
  const SHAPE_CELL = { y: 596, w: 128, h: 74 };
  const shapes = SHAPE_PICKS.map((k) => {
    const values = M.matVec(WIDE.Xp, shrink.directions[k]);
    const centre = (Math.max(...values) + Math.min(...values)) / 2;
    const half = (Math.max(...values) - Math.min(...values)) / 2;
    return values.map((v) => (half < 1e-9 ? 0 : (v - centre) / half));
  });
  const factorAt = (lambda) => shrink.d.map((d) => 1 / (1 + lambda * d));
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '成分ごとの縮み方と有効自由度',
    beats: [
      beat('基底をうまく取り直すと、ペナルティの効き方を、成分ごとに分けて見られます。棒の1本が1つの成分で、左ほどなだらか、右ほど細かい波です。', 11),
      beat('棒の高さは、その成分が、ペナルティなしの値の何倍に縮むかです。式は $1/(1+\\lambda d_k)$ で、$d_k$ は成分の波打ちの強さです。', 11),
      beat('λ を大きくすると、細かい波の成分から先に縮みます。左端の2本は、定数と直線で、縮みません。', 10),
      beat(`有効自由度は、この棒の高さの合計です。REML で選んだ λ では、${fmt(wideAtOpt.edf, 1)} です。${WIDE_K} 本の基底を使っていても、実質は約 ${Math.round(wideAtOpt.edf)} 個ぶんの自由度です。`, 12),
      beat('summary に出る edf は、この値を項ごとに出したものです。edf が 1 に近い項は、ほぼ直線だと読めます。'),
    ],
    build(ui) {
      const logAt = (u, bt) =>
        keyframes(u, [
          [bt(1) + 0.5, -8],
          [bt(1) + 3, -3],
          [bt(2) + 0.6, -3],
          [bt(3) - 1.5, 4],
          [bt(3) + 0.5, 4],
          [bt(3) + 3, OPT_LOG],
        ]);
      const bt = (i) => this.beatStarts[i];
      ui.text(`成分ごとの縮み率（基底 ${WIDE_K} 本の例）`, { x: BAR_BOX.x - 20, y: 112, size: 22, weight: 700 });
      ui.tex(R`\text{縮み率} = \frac{1}{1 + \lambda d_k}`, { x: 560, y: 100, size: 25, at: 1 });
      ui.tex(lambdaTex(-8), { x: SHRINK_SLIDER.x + 220, y: 136, size: 27, slide: false, live: (u) => `$${lambdaTex(logAt(u, bt))}$` });
      ui.text('平滑化パラメータ', { x: SHRINK_SLIDER.x, y: 150, size: 19, color: C.text2 });
      ui.text('成分の形（デムラー・ラインシュの基底）', { x: BAR_BOX.x - 20, y: 548, size: 18, color: C.muted, delay: 0.4 });
      return {
        logAt,
        barPlot: new Plot({ ...BAR_BOX, xr: [0.2, COMPONENTS + 0.8], yr: [0, 1.08] }),
        edfPlot: new Plot({ ...EDF_BOX, xr: [-8, 6], yr: [0, 42] }),
      };
    },
    draw(ctx, s, st) {
      const log = st.logAt(s.u, s.bt);
      const lambda = 10 ** log;
      const factors = factorAt(lambda);
      const total = factors.reduce((a, b) => a + b, 0);
      const alpha = s.p(0, 0.8);
      const plot = st.barPlot;
      plot.axes(ctx, { xticks: [1, 10, 20, 30, 40], yticks: [0, 0.5, 1], fmtY: (v) => fmt(v, v === 0.5 ? 1 : 0), alpha });
      canvasText(ctx, '成分の番号（左ほどなだらか）', plot.x + plot.w, plot.y + plot.h + 50, { size: 17, color: C.text2, align: 'right', alpha });
      const barW = (plot.w / (COMPONENTS + 0.6)) * 0.72;
      factors.forEach((value, k) => {
        const grow = s.p(0, 0.5, 0.2 + 0.02 * k);
        const top = plot.sy(value * grow);
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = k < UNPENALIZED ? C.orange : C.blue;
        ctx.fillRect(plot.sx(k + 1) - barW / 2, top, barW, plot.y + plot.h - top);
        ctx.restore();
      });
      if (s.beat >= 2) canvasText(ctx, '定数・直線（縮まない）', plot.sx(1) - 8, plot.y - 14, { size: 17, color: C.orange, alpha: s.p(2, 0.6, 3) });
      // 成分の形（選んだ成分だけ）
      SHAPE_PICKS.forEach((k, i) => {
        const cx = plot.sx(k + 1);
        const x0 = clamp(BAR_BOX.x - 20 + i * (SHAPE_CELL.w + 20), 0, 1500);
        const box = { x: x0, y: SHAPE_CELL.y, w: SHAPE_CELL.w, h: SHAPE_CELL.h };
        const mini = new Plot({ ...box, xr: [0, 1], yr: [-1.3, 1.3] });
        const a = alpha * s.p(0, 0.6, 0.8 + 0.12 * i);
        ctx.save();
        ctx.globalAlpha *= a;
        roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 6);
        ctx.fillStyle = rgba(C.text, 0.04);
        ctx.fill();
        ctx.strokeStyle = rgba(C.axis, 0.7);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, plot.y + plot.h + 34);
        ctx.lineTo(box.x + box.w / 2, box.y - 6);
        ctx.stroke();
        ctx.restore();
        mini.line(ctx, SINGLE.grid, shapes[i], { color: k < UNPENALIZED ? C.orange : C.aqua, width: 2.2, alpha: a });
        canvasText(ctx, `成分 ${k + 1}`, box.x + box.w / 2, box.y + box.h + 24, { size: 15, color: C.muted, align: 'center', alpha: a });
      });
      X.slider(ctx, SHRINK_SLIDER, log, [-8, 6], { alpha, ticks: [-8, -4, 0, 4], power: true });
      // 右下: 有効自由度の曲線
      if (s.beat >= 3) {
        const a = s.p(3, 0.8);
        const edfPlot = st.edfPlot;
        edfPlot.axes(ctx, { xticks: [-8, -4, 0, 4], yticks: [0, 10, 20, 30, 40], fmtX: X.NO_LABEL, ylabel: '有効自由度（棒の高さの合計）', alpha: a });
        X.powerTicks(ctx, edfPlot, [-8, -4, 0, 4], 'x', { alpha: a });
        canvasText(ctx, 'λ', edfPlot.x + edfPlot.w + 12, edfPlot.y + edfPlot.h + 6, { size: 18, alpha: a });
        edfPlot.line(ctx, WIDE.scan.logs, WIDE.scan.edf, { color: C.aqua, alpha: a, upto: s.p(3, 1.2, 0.3) });
        edfPlot.vline(ctx, OPT_LOG, { color: C.yellow, alpha: a * s.p(3, 0.6, 3) });
        edfPlot.dots(ctx, [log], [total], { color: C.yellow, r: 8, alpha: a });
        canvasText(ctx, `合計 ${fmt(total, 1)}`, edfPlot.x + edfPlot.w, edfPlot.y + 30, { size: 28, color: C.text, weight: 700, align: 'right', alpha: a });
      }
    },
  });

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: '正規分布以外へ：P-IRLS',
    beats: [
      beat('個数や割合のデータでは、残差の2乗和の代わりに、対数尤度を使います。対数尤度からペナルティを引いたものを、最大にします。', 11),
      beat('この問題は、1回では解けません。そこで、いまの推定値のまわりで、重みつきの最小二乗の問題に置きかえます。'),
      beat('置きかえには、作業用の応答 z と、重み w を使います。どちらも、いまの平均 μ から計算します。'),
      beat('z と w を固定すれば、前の章と同じ、ペナルティつきの最小二乗です。解いた係数で μ を更新し、z と w を作り直します。', 11),
      beat('これを、ペナルティつきの逸脱度が変わらなくなるまで繰り返します。P-IRLS、ペナルティつき反復再重みつき最小二乗法と呼びます。', 11),
      beat('正規分布で恒等リンクのときは、z は y そのもの、重みは 1 になり、1回で終わります。mgcv は、この最小二乗を QR 分解で安定に解きます。', 11),
    ],
    build(ui) {
      ui.tex(R`\max_{\boldsymbol\beta}\ \ \ell(\boldsymbol\beta) - \frac{1}{2} \sum_j \lambda_j\, \boldsymbol\beta^{\mathsf T} S_j \boldsymbol\beta`, { x: LEFT_X, y: 108, size: 32, dim: [[2, 6]] });
      ui.text('ペナルティつき対数尤度', { x: 620, y: 132, size: 22, color: C.text2, delay: 0.4, dim: [[2, 6]] });
      ui.tex(R`z_i = \eta_i + (y_i - \mu_i)\, g'(\mu_i), \qquad w_i = \frac{1}{V(\mu_i)\, g'(\mu_i)^2}`, { x: LEFT_X, y: 232, size: 30, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('$\\eta_i = X_i \\boldsymbol\\beta$：線形予測子　$V(\\mu)$：分散関数（ポアソンなら $V(\\mu) = \\mu$）', { x: LEFT_X, y: 318, size: 21, color: C.text2, at: 2, delay: 0.4 });
      ui.tex(R`\min_{\boldsymbol\beta}\ \ \sum_{i} w_i\, \big(z_i - X_i \boldsymbol\beta\big)^2 + \sum_j \lambda_j\, \boldsymbol\beta^{\mathsf T} S_j \boldsymbol\beta`, { x: LEFT_X, y: 388, size: 30, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text(`<span class="pill" style="background:${C.yellow}">反復</span>$\\mu$ → $z,\\ w$ → $\\hat{\\boldsymbol\\beta}$ → $\\mu$ → …　ペナルティつき逸脱度の変化が小さくなるまで`, { x: LEFT_X, y: 508, size: 24, at: 4, glow: [{ from: 4, to: 5 }] });
      seeThrough(ui.card({ x: CARD_X, y: 100, w: CARD_W, h: 210, title: '例', at: 5 }));
      ui.table({
        x: CARD_X + 14, y: 142, widths: [190, 180, 100], size: 20, rowH: 44,
        header: ['分布・リンク', '$z$', '$w$'],
        rows: [['正規・恒等', '$y$', '$1$'], ['ポアソン・対数', R`$\eta + (y - \mu)/\mu$`, R`$\mu$`]],
        at: 5, delay: 0.3, rowDelay: 0.3,
      });
      ui.text('・最小二乗は QR 分解で解く（正規方程式を直接解くより、丸め誤差に強い）<br>・REML・ML で正準リンク以外のときは、重みをニュートン法の形に取りかえる（Wood 2011）', { x: LEFT_X, y: 596, w: 1400, size: 20, color: C.text2, lh: 1.7, at: 5, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解: ポアソンの例
  const POIS = DATA.poisson;
  const poisInfo = M.penaltyInfo([POIS.S], [2], POIS.X[0].length);
  const poisSteps = M.pirlsPoisson(POIS.X, POIS.y, M.totalPenalty(poisInfo, [POIS.sp]));
  const ITERATIONS = poisSteps.length - 1;
  const poisCurves = poisSteps.map((step) => (step.beta ? M.matVec(POIS.Xp, step.beta) : null));
  const LINK_BOX = { x: 100, y: 176, w: 640, h: 470 };
  const RESPONSE_BOX = { x: 870, y: 176, w: 640, h: 470 };
  const maxWeight = Math.max(...poisSteps.slice(1).flatMap((step) => step.w));
  const ORDINAL = ['', '1回目', '2回目', '3回目', '4回目', '5回目', '6回目'];
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'ポアソンの例で反復を見る',
    beats: [
      beat('個数のデータの例です。右は、データと平均 μ の曲線です。左は、同じものを対数の目盛り、つまりリンク関数の目盛りで見たものです。', 11),
      beat('出発点では、μ をデータそのものに近い値にします。そこから、作業用の応答 z と重みを計算します。丸の大きさが重みです。', 11),
      beat('1回目の当てはめです。重みつきの、ペナルティつき最小二乗で、曲線が1本決まります。'),
      beat('曲線が変わると、z と重みも変わります。もう一度当てはめます。2回目、3回目と進むと、点も曲線も、ほとんど動かなくなります。', 11),
      beat(`この例では、${ITERATIONS} 回で収束しました。逸脱度は ${poisSteps.slice(1, 4).map((step) => fmt(step.deviance, 1)).join('、')} と下がって止まり、係数は mgcv の結果と一致します。`, 12),
    ],
    build(ui) {
      ui.text('対数の目盛り（線形予測子 η）', { x: LINK_BOX.x - 10, y: 118, size: 22, weight: 700 });
      ui.text('もとの目盛り（個数 y と平均 μ）', { x: RESPONSE_BOX.x - 10, y: 118, size: 22, weight: 700 });
      const positionAt = (u, bt) =>
        keyframes(u, [
          [bt(3) + 0.6, 1],
          [bt(3) + 2.4, 2],
          [bt(3) + 5, 2],
          [bt(3) + 6.8, 3],
          [bt(4) + 0.6, 3],
          [bt(4) + 2.2, ITERATIONS],
        ]);
      return {
        positionAt,
        link: new Plot({ ...LINK_BOX, xr: [0, 1], yr: [-4.2, 3.6] }),
        response: new Plot({ ...RESPONSE_BOX, xr: [0, 1], yr: [0, 19.5] }),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.8);
      const position = st.positionAt(s.u, s.bt);
      const low = Math.max(1, Math.floor(position));
      const high = Math.min(ITERATIONS, low + 1);
      const k = clamp(position - low);
      const mix = (key) => poisSteps[low][key].map((v, i) => lerp(v, poisSteps[high][key][i], k));
      const eta = poisCurves[low].map((v, i) => lerp(v, poisCurves[high][i], k));
      const xticks = { xticks: [0, 0.5, 1], fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0), xlabel: 'x' };
      st.link.axes(ctx, { ...xticks, yticks: [-4, -2, 0, 2], alpha });
      st.response.axes(ctx, { ...xticks, yticks: [0, 5, 10, 15], alpha });
      // 右: データと、真の平均
      X.scatter(ctx, st.response, POIS.x, POIS.y, { alpha: 0.55 * alpha, r: 3.2 });
      st.response.line(ctx, POIS.grid, POIS.etaTrue.map(Math.exp), { color: C.orange, width: 2.5, dash: [8, 6], alpha });
      st.link.line(ctx, POIS.grid, POIS.etaTrue, { color: C.orange, width: 2.5, dash: [8, 6], alpha });
      // 左: 作業用の応答 z（丸の大きさ = 重み）
      if (s.beat >= 1) {
        const a = s.p(1, 0.8, 0.4);
        const z = mix('z');
        const w = mix('w');
        ctx.save();
        st.link.clip(ctx);
        for (let i = 0; i < z.length; i++) {
          ctx.beginPath();
          ctx.arc(st.link.sx(POIS.x[i]), st.link.sy(z[i]), 1.6 + 7 * Math.sqrt(w[i] / maxWeight), 0, Math.PI * 2);
          ctx.fillStyle = rgba(C.aqua, 0.42 * a);
          ctx.fill();
        }
        ctx.restore();
      }
      if (s.beat >= 2) {
        const drawn = s.p(2, 1.4, 0.4);
        st.link.line(ctx, POIS.grid, eta, { color: C.blue, width: 4, upto: drawn });
        st.response.line(ctx, POIS.grid, eta.map(Math.exp), { color: C.blue, width: 4, upto: drawn });
        const shownIteration = Math.round(position);
        canvasText(ctx, `反復 ${ORDINAL[shownIteration]}`, LINK_BOX.x + LINK_BOX.w - 6, LINK_BOX.y + 24, { size: 24, color: C.text, weight: 700, align: 'right', alpha: s.p(2, 0.5) });
        // 逸脱度の列
        let cx = 110;
        canvasText(ctx, '逸脱度', cx, 740, { size: 20, color: C.text2, alpha: s.p(2, 0.5) });
        cx += 90;
        for (let m = 1; m <= ITERATIONS; m++) {
          const reached = position >= m - 0.02 ? 1 : 0;
          if (!reached) break;
          const text = `${ORDINAL[m]} ${fmt(poisSteps[m].deviance, 2)}`;
          canvasText(ctx, text, cx, 740, { size: 21, color: m === shownIteration ? C.yellow : C.text, weight: 700, alpha: s.p(2, 0.5) });
          cx += 222;
          if (m < ITERATIONS && position >= m + 0.98) canvasText(ctx, '→', cx - 44, 740, { size: 20, color: C.muted });
        }
      }
      legend(ctx, [{ kind: 'dot', color: C.aqua, label: '作業用の応答 z（大きさ＝重み）' }, { color: C.blue, label: '当てはめた曲線' }, { color: C.orange, dash: [8, 6], label: '真の平均' }], 110, 692, { alpha: s.p(1, 0.8), size: 17, gap: 26 });
      legend(ctx, [{ kind: 'dot', color: C.text2, label: 'データ（個数）' }], RESPONSE_BOX.x + 10, 692, { alpha, size: 17 });
    },
  });
})();
