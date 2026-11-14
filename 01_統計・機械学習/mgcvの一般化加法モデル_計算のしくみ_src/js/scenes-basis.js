// scenes-basis.js — はじめに、この動画のポイント、第1章（gam() が行う計算の全体）、第2章（基底と薄板回帰スプライン）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値は手で書かず、gam-data.js（mgcv の計算結果）か gam-math.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, canvasText, lerp, clamp, legend, rgba, roundRect } = KIT;
  const X = GAMX;
  const DATA = GAMDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const SUBSCRIPT = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const sub = (number) => String(number).split('').map((d) => SUBSCRIPT[d]).join('');
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };

  const SINGLE = DATA.single;
  const MAIN = DATA.main;
  const NARROW = X.narrow;
  const WIDE = X.wide;
  const narrowFit = NARROW.fit(NARROW.sp);
  const wideFit = WIDE.fit(WIDE.sp);
  const column = (matrix, k) => matrix.map((row) => row[k]);

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('R のパッケージ mgcv で一般化加法モデルを当てはめるときの計算を、式と図を使って解説します。', 8),
      beat('全部で8章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('mgcv の一般化加法モデル', { x: 0, y: 84, w: W, align: 'center', size: 72, weight: 800 });
      ui.text('gam() の中で行われる計算 ― 基底・ペナルティ・P-IRLS・REML', { x: 0, y: 192, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      ui.text(`R パッケージ mgcv ${DATA.mgcvVersion.replace(/\.(\d+)$/, '-$1')}（S. N. Wood）の計算を追う。図の数値は mgcv で計算したもの`, { x: 0, y: 246, w: W, align: 'center', size: 20, color: C.muted, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, { x: left ? 150 : 850, y: 312 + (left ? i : i - 4) * 52, size: 24, delay: 0.6 + 0.12 * i });
      });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 150, y: 550, size: 24, at: 1 });
      ui.text('例のデータは説明用に乱数で作ったものです。計算の手順を JavaScript で書き直し、mgcv の結果と一致することを確かめています', { x: 150, y: 600, w: 760, size: 20, color: C.muted, at: 1, delay: 0.4, lh: 1.5 });
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
  const FIG = { dx: 424, dy: 60, w: 248, h: 200 };
  const POINT_LAMBDAS = [1e-7, null, 1e3]; // null = REML で選んだ値
  const CYCLE_LABELS = ['z, w', 'β', 'μ'];
  const CYCLE_SECONDS = 0.9;
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① 滑らかな関数は、基底関数と係数の積の和で表します。mgcv の既定の基底は、薄板回帰スプラインです。', 10),
      beat('② 波打ちは、ペナルティで抑えます。平滑化パラメータ λ が大きいほど、曲線は直線に近づきます。', 10),
      beat('③ 係数は P-IRLS で解きます。重みつきで、ペナルティつきの最小二乗を、収束するまで繰り返します。', 10),
      beat('④ λ は、REML か GCV で選びます。外側で λ を更新し、内側で係数を解く、入れ子の計算です。', 10),
      beat('この4つを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 関数は「基底 × 係数」の和', R`$f(x) = \sum_k \beta_k\, b_k(x)$<br>既定の基底は薄板回帰スプライン<br>（bs = "tp"、k = 10）`],
        ['② 波打ちはペナルティで抑える', R`$\|y - X\beta\|^2 + \lambda\, \beta^{\mathsf T} S \beta$ を最小に<br>$\lambda$ が大きいほど直線に近づく`],
        ['③ 係数は P-IRLS で解く', '重みつき・ペナルティつきの最小二乗を、収束するまで繰り返す'],
        ['④ $\\lambda$ は REML か GCV で選ぶ', R`$\log \lambda$ の上のニュートン法<br>外側で $\lambda$、内側で係数を解く`],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: POINT_CARD_W, h: POINT_CARD_H, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 26, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 86, w: 376, size: 21, lh: 1.65, color: C.text2, at: k, delay: 0.3 });
      });
      const figBox = (i) => ({ x: POINT_CARDS[i].x + FIG.dx, y: POINT_CARDS[i].y + FIG.dy, w: FIG.w, h: FIG.h });
      const scan = WIDE.scan;
      return {
        basisPlot: new Plot({ ...figBox(0), xr: [0, 1], yr: [-2.4, 2.4] }),
        basis: Array.from({ length: NARROW.size - 1 }, (_, k) => column(NARROW.Xp, k + 1)),
        curvePlot: X.singlePlot(figBox(1)),
        curves: POINT_LAMBDAS.map((lambda) => WIDE.curve(WIDE.fit(lambda ?? WIDE.sp).beta)),
        cycleBox: figBox(2),
        remlPlot: new Plot({ ...figBox(3), xr: [-6, 4], yr: [425, 510] }),
        scan,
      };
    },
    draw(ctx, s, st) {
      const BASIS_COLORS = [C.blue, C.aqua, C.violet, C.orange, C.yellow, C.red, C.blue, C.aqua, C.violet];
      if (s.beat >= 1) {
        const alpha = s.p(1, 0.8, 0.3);
        st.basisPlot.axes(ctx, { alpha, zero: true });
        st.basis.forEach((values, k) => st.basisPlot.line(ctx, SINGLE.grid, values, { color: BASIS_COLORS[k], width: 2, alpha: alpha * 0.9, upto: s.p(1, 1.2, 0.3 + 0.08 * k) }));
      }
      if (s.beat >= 2) {
        const alpha = s.p(2, 0.8, 0.3);
        st.curvePlot.axes(ctx, { alpha });
        X.scatter(ctx, st.curvePlot, SINGLE.x, SINGLE.y, { alpha: 0.35 * alpha, r: 1.6 });
        const colors = [C.red, C.blue, C.text2];
        st.curves.forEach((curve, i) => st.curvePlot.line(ctx, SINGLE.grid, curve, { color: colors[i], width: i === 1 ? 3 : 2, alpha, upto: s.p(2, 1.2, 0.4 + 0.5 * i) }));
      }
      if (s.beat >= 3) {
        const alpha = s.p(3, 0.8, 0.3);
        const box = st.cycleBox;
        const center = [box.x + box.w / 2, box.y + box.h / 2 + 6];
        const radius = 74;
        const nodes = CYCLE_LABELS.map((label, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
          return { label, x: center[0] + radius * Math.cos(angle), y: center[1] + radius * Math.sin(angle) };
        });
        const active = Math.floor(Math.max(0, s.u - s.bt(3) - 0.8) / CYCLE_SECONDS) % 3;
        nodes.forEach((node, i) => {
          const next = nodes[(i + 1) % 3];
          const dx = next.x - node.x;
          const dy = next.y - node.y;
          const len = Math.hypot(dx, dy);
          X.arrow(ctx, node.x + (dx / len) * 36, node.y + (dy / len) * 36, next.x - (dx / len) * 36, next.y - (dy / len) * 36, { alpha, color: i === active ? C.yellow : C.muted });
        });
        nodes.forEach((node, i) => {
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
          ctx.fillStyle = rgba(C.yellow, i === active ? 0.3 : 0.08);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = i === active ? C.yellow : C.axis;
          ctx.stroke();
          ctx.restore();
          canvasText(ctx, node.label, node.x, node.y + 7, { size: 19, color: C.text, align: 'center', weight: 700, alpha });
        });
      }
      if (s.beat >= 4) {
        const alpha = s.p(4, 0.8, 0.3);
        const plot = st.remlPlot;
        plot.axes(ctx, { alpha, xticks: [-6, -2, 2], fmtX: X.NO_LABEL });
        X.powerTicks(ctx, plot, [-6, -2, 2], 'x', { alpha, size: 15 });
        canvasText(ctx, 'λ', plot.x + plot.w + 10, plot.y + plot.h + 6, { size: 17, alpha });
        plot.line(ctx, st.scan.logs, st.scan.reml, { color: C.aqua, alpha, upto: s.p(4, 1.4, 0.4) });
        const dot = s.p(4, 0.5, 1.7);
        plot.dots(ctx, [X.log10(WIDE.sp)], [wideFit.reml], { color: C.yellow, r: 7, alpha: alpha * dot });
        plot.label(ctx, 'REML', -5.6, 500, { size: 15, color: C.text2, alpha });
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: 'gam() が当てはめるモデル',
    beats: [
      beat('一般化加法モデル（GAM）は、目的変数の平均を、説明変数ごとの滑らかな関数の和で表します。'),
      beat('リンク関数 g と分布を選べるので、正規分布のほかに、個数や割合のデータにも使えます。'),
      beat('mgcv では、s() で囲んだ変数が滑らかな関数になります。関数の形は、データから決めます。'),
      beat('決めるものは3つです。関数の形を決める係数 β、なめらかさを決める平滑化パラメータ λ、ばらつきの大きさを表す尺度 φ です。', 11),
      beat('この3つを mgcv がどう計算するかを、順に見ていきます。'),
    ],
    build(ui) {
      ui.tex(R`g(\mu_i) = \beta_0 + f_0(x_{0i}) + f_1(x_{1i}) + f_2(x_{2i}) + f_3(x_{3i})`, { x: LEFT_X, y: 116, size: 34 });
      ui.tex(R`\mu_i = \mathrm{E}[y_i],\qquad y_i \sim \text{指数型分布族}`, { x: LEFT_X, y: 196, size: 27, color: C.text2, at: 1 });
      seeThrough(ui.card({ x: CARD_X, y: 108, w: CARD_W, h: 222, title: '分布とリンク関数の例', at: 1, delay: 0.3 }));
      ui.table({
        x: CARD_X + 16, y: 150, widths: [158, 150, 160], size: 20, rowH: 40,
        header: ['データ', '分布', 'リンク g'],
        rows: [['連続値', '正規', '恒等'], ['個数', 'ポアソン', '対数'], ['割合', '二項', 'ロジット']],
        at: 1, delay: 0.4, rowDelay: 0.15,
      });
      ui.text('<div class="code"><span class="kw">library</span>(mgcv)\nb &lt;- <span class="kw">gam</span>(y ~ <span class="kw">s</span>(x0) + <span class="kw">s</span>(x1) + <span class="kw">s</span>(x2) + <span class="kw">s</span>(x3),\n         data = dat, method = <span class="str">"REML"</span>)</div>', { x: LEFT_X, y: 282, size: 24, at: 2 });
      ui.text('s( )：滑らかな関数にする項', { x: LEFT_X + 4, y: 432, size: 21, color: C.text2, at: 2, delay: 0.4 });
      ui.table({
        x: LEFT_X, y: 488, widths: [130, 330, 700], size: 23, rowH: 52, aligns: ['center', 'left', 'left'],
        header: ['記号', '名前', '決めるもの'],
        rows: [
          [R`$\boldsymbol\beta$`, '係数', '関数の形'],
          [R`$\lambda_j$`, '平滑化パラメータ', '関数ごとのなめらかさ'],
          [R`$\phi$`, '尺度パラメータ', 'ばらつきの大きさ（正規分布なら分散）'],
        ],
        at: 3, rowDelay: 0.5, delay: 0.2,
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解: 例のデータ
  const TERM_PANEL = { x0: 100, gap: 372, y: 178, w: 300, h: 420 };
  const TERM_Y_RANGE = [-12, 12];
  const termPlots = MAIN.terms.map((term, j) => new Plot({ x: TERM_PANEL.x0 + TERM_PANEL.gap * j, y: TERM_PANEL.y, w: TERM_PANEL.w, h: TERM_PANEL.h, xr: [0, 1], yr: TERM_Y_RANGE }));
  const centeredY = MAIN.y.map((v) => v - MAIN.intercept);
  // 4つの項を並べて描く（第1章と第7章で使う）
  function drawTermPanels(ctx, { alpha = 1, dots = 0.4, fit = 0, band = 0, truth = 0, plots = termPlots, yticks = [-10, 0, 10] } = {}) {
    MAIN.terms.forEach((term, j) => {
      const plot = plots[j];
      plot.axes(ctx, { xticks: [0, 0.5, 1], yticks, xlabel: `x${sub(j)}`, alpha, fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0) });
      if (dots > 0) X.scatter(ctx, plot, MAIN.x[j], centeredY, { alpha: dots * alpha, r: 2.4 });
      if (band > 0) plot.band(ctx, term.grid, term.fit.map((v, i) => v - 2 * term.se[i] * band), term.fit.map((v, i) => v + 2 * term.se[i] * band), { color: C.blue, alpha: 0.3 * alpha });
      if (truth > 0) plot.line(ctx, term.grid, term.truth, { color: C.orange, width: 2.5, dash: [8, 6], alpha: alpha * truth });
      if (fit > 0) plot.line(ctx, term.grid, term.fit, { color: C.blue, width: 3.5, alpha, upto: fit });
    });
  }
  window.GAMX.drawTermPanels = drawTermPanels;
  window.GAMX.sub = sub;
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '例：4つの説明変数のデータ',
    beats: [
      beat(`例として、mgcv の関数 gamSim で作った ${MAIN.n} 点のデータを使います。説明変数は x0 から x3 の4つです。`),
      beat('点は、目的変数 y を、それぞれの説明変数に対して並べたものです。ばらつきが大きく、形は見えにくいです。'),
      beat('gam を実行すると、変数ごとの滑らかな関数が求まります。青い線が推定した関数、帯がその不確かさです。'),
      beat('橙の破線は、データを作るときに使った真の関数です。x3 は、真の効果が 0 の変数です。'),
      beat('曲がり方は、変数ごとに違います。x2 は細かく曲がり、x3 はほぼ平らです。この違いを決めているのが、平滑化パラメータ λ です。', 11),
    ],
    build(ui) {
      MAIN.terms.forEach((term, j) => {
        const x = TERM_PANEL.x0 + TERM_PANEL.gap * j;
        ui.text(`s(x${j})`, { x, y: 118, w: TERM_PANEL.w, align: 'center', size: 25, weight: 700, delay: 0.1 * j });
        ui.text(`有効自由度 ${fmt(MAIN.edf[j], 2)}`, { x, y: 664, w: TERM_PANEL.w, align: 'center', size: 21, color: C.text2, at: 4, delay: 0.15 * j, glow: j >= 2 ? [{ from: 4 }] : [] });
      });
      ui.text('y − 切片', { x: 28, y: 132, size: 17, color: C.muted });
    },
    draw(ctx, s) {
      drawTermPanels(ctx, { alpha: s.p(0, 0.8), dots: 0.42, fit: s.beat >= 2 ? s.p(2, 1.6, 0.3) : 0, band: s.beat >= 2 ? s.p(2, 1, 1.4) : 0, truth: s.beat >= 3 ? s.p(3, 0.8) : 0 });
      if (s.beat >= 2) {
        legend(ctx, [{ color: C.blue, label: '推定した関数' }, { color: C.blue, kind: 'band', label: '±2×標準誤差' }, ...(s.beat >= 3 ? [{ color: C.orange, dash: [8, 6], label: '真の関数' }] : [])], 540, 730, { alpha: s.p(2, 0.8), size: 18 });
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 図解: 計算の全体の流れ
  const FLOW = {
    input: { x: 70, y: 300, w: 200, h: 120 },
    basis: { x: 340, y: 300, w: 270, h: 120 },
    beta: { x: 700, y: 176, w: 330, h: 124 },
    lambda: { x: 700, y: 430, w: 330, h: 124 },
    output: { x: 1200, y: 300, w: 330, h: 120 },
  };
  const LOOP_FRAME = { x: 668, y: 128, w: 394, h: 468 };
  const LOOP_SECONDS = 2.4;
  SCENES.push({
    id: '1F',
    chapter: 1,
    kind: 'visual',
    title: '計算の全体の流れ',
    beats: [
      beat('gam の計算は、大きく4つの段階に分かれます。'),
      beat('① まず、s() の項ごとに基底を作り、モデル行列 X とペナルティの行列 S を用意します。これは1回だけです。'),
      beat('② 次に、λ を仮に決めて、係数 β を解きます。ペナルティつきの重みつき最小二乗を繰り返す、P-IRLS という方法です。', 11),
      beat('③ その結果から REML などの基準を計算し、基準が良くなる向きに λ を更新します。② と ③ を、収束するまで繰り返します。', 11),
      beat(`④ 最後に、係数、その共分散行列、有効自由度などを出力します。この例では、λ の更新は ${MAIN.outerIter} 回で収束しました。`, 10),
    ],
    build(ui) {
      const tag = (text, box, at) => ui.text(text, { x: box.x, y: box.y + box.h + 12, w: box.w, align: 'center', size: 19, color: C.muted, at, delay: 0.4 });
      tag('第2章', FLOW.basis, 1);
      ui.text('第3〜5章', { x: FLOW.beta.x + FLOW.beta.w + 44, y: FLOW.beta.y + 46, size: 19, color: C.muted, at: 2, delay: 0.4 });
      ui.text('第6章', { x: FLOW.lambda.x + FLOW.lambda.w + 44, y: FLOW.lambda.y + 46, size: 19, color: C.muted, at: 3, delay: 0.4 });
      tag('第7章', FLOW.output, 4);
      ui.text('収束するまで繰り返す', { x: LOOP_FRAME.x, y: LOOP_FRAME.y + LOOP_FRAME.h + 12, w: LOOP_FRAME.w, align: 'center', size: 21, color: C.yellow, weight: 700, at: 3, delay: 0.5 });
      ui.text(`例の4変数のモデル：係数 ${MAIN.coefCount} 個、λ は4つ、λ の更新 ${MAIN.outerIter} 回`, { x: 0, y: 690, w: W, align: 'center', size: 23, color: C.text2, at: 4, delay: 0.6 });
    },
    draw(ctx, s) {
      const F = FLOW;
      const mid = (box) => box.y + box.h / 2;
      const shown = (i) => (s.beat >= i ? s.p(i, 0.7) : 0);
      const all = s.p(0, 0.8);
      const dimmed = (i) => Math.max(0.3 * all, shown(i));
      X.flowBox(ctx, F.input, '式とデータ', ['y ~ s(x0) + …'], { color: C.muted, alpha: all });
      X.flowBox(ctx, F.basis, '① 基底を作る', ['モデル行列 X', 'ペナルティの行列 S'], { color: C.violet, alpha: dimmed(1), glow: s.win(1, 2) });
      X.flowBox(ctx, F.beta, '② 係数 β を解く', ['P-IRLS（λ は固定）'], { color: C.blue, alpha: dimmed(2), glow: s.win(2, 3) });
      X.flowBox(ctx, F.lambda, '③ λ を更新する', ['REML・GCV、ニュートン法'], { color: C.aqua, alpha: dimmed(3), glow: s.win(3, 4) });
      X.flowBox(ctx, F.output, '④ 出力', ['係数、共分散行列', '有効自由度、p 値'], { color: C.orange, alpha: dimmed(4), glow: s.win(4) });
      X.arrow(ctx, F.input.x + F.input.w + 8, mid(F.input), F.basis.x - 8, mid(F.basis), { alpha: dimmed(1) });
      X.arrow(ctx, F.basis.x + F.basis.w + 8, mid(F.basis) - 20, F.beta.x - 8, mid(F.beta) + 20, { alpha: dimmed(2) });
      // ② と ③ の往復
      const loopAlpha = dimmed(3);
      X.arrow(ctx, F.beta.x + 110, F.beta.y + F.beta.h + 8, F.beta.x + 110, F.lambda.y - 8, { alpha: loopAlpha, color: C.blue });
      X.arrow(ctx, F.lambda.x + 220, F.lambda.y - 8, F.lambda.x + 220, F.beta.y + F.beta.h + 8, { alpha: loopAlpha, color: C.aqua });
      canvasText(ctx, 'β の推定値', F.beta.x + 96, 372, { size: 17, color: C.text2, align: 'right', alpha: shown(3) });
      canvasText(ctx, '新しい λ', F.lambda.x + 234, 372, { size: 17, color: C.text2, alpha: shown(3) });
      if (s.beat >= 3) {
        ctx.save();
        ctx.globalAlpha *= shown(3);
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = rgba(C.yellow, 0.75);
        ctx.lineWidth = 2;
        roundRect(ctx, LOOP_FRAME.x, LOOP_FRAME.y, LOOP_FRAME.w, LOOP_FRAME.h, 20);
        ctx.stroke();
        ctx.restore();
        // 往復する光の粒
        const phase = ((s.u - s.bt(3)) % LOOP_SECONDS) / LOOP_SECONDS;
        const down = phase < 0.5;
        const k = down ? phase * 2 : (phase - 0.5) * 2;
        const y0 = F.beta.y + F.beta.h + 8;
        const y1 = F.lambda.y - 8;
        const px = down ? F.beta.x + 110 : F.lambda.x + 220;
        const py = down ? lerp(y0, y1, k) : lerp(y1, y0, k);
        ctx.save();
        ctx.globalAlpha *= shown(3) * (s.beat === 3 ? 1 : 1 - s.p(4, 0.5));
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = C.yellow;
        ctx.shadowColor = C.yellow;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
      }
      X.arrow(ctx, LOOP_FRAME.x + LOOP_FRAME.w + 10, mid(F.output), F.output.x - 8, mid(F.output), { alpha: dimmed(4) });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: '関数を基底と係数で表す',
    beats: [
      beat('滑らかな関数を計算機で扱うために、あらかじめ決めた基底関数 $b_k$ の、重みつきの和で表します。'),
      beat('未知なのは、重みである係数 β だけです。関数を求める問題が、係数を求める問題に変わります。'),
      beat('データの点で基底関数の値を計算して並べると、行列 X になります。関数の値は、X と β の積です。'),
      beat('項が複数あるときは、項ごとの行列を横に並べます。モデル全体が、係数について線形の式になります。'),
      beat(`mgcv の既定の基底は、薄板回帰スプラインです。基底の数 k の既定値は 10 で、例の4変数のモデルでは、係数は全部で ${MAIN.coefCount} 個です。`, 11),
    ],
    build(ui) {
      ui.tex(R`f(x) = \sum_{k=1}^{K} \htmlClass{hl-beta}{\beta_k}\; \htmlClass{hl-basis}{b_k(x)}`, {
        x: LEFT_X, y: 112, size: 38,
        hl: [{ cls: 'hl-basis', from: 0, to: 1, color: C.aqua }, { cls: 'hl-beta', from: 1, to: 2, color: C.yellow }],
      });
      ui.text(`<span style="color:${C.aqua}">■</span> 基底関数 $b_k$：先に決めておく　<span style="color:${C.yellow}">■</span> 係数 $\\beta_k$：データから決める`, { x: 480, y: 142, size: 22, color: C.text2, delay: 0.4 });
      ui.tex(R`\boldsymbol f = \begin{pmatrix} f(x_1) \\ \vdots \\ f(x_n) \end{pmatrix} = X \boldsymbol\beta, \qquad X_{ik} = b_k(x_i)`, { x: LEFT_X, y: 256, size: 31, at: 2 });
      ui.text('行＝データの点、列＝基底関数', { x: 760, y: 306, size: 21, color: C.text2, at: 2, delay: 0.4 });
      ui.tex(R`g(\boldsymbol\mu) = \underbrace{\big[\; \mathbf{1} \;\; X_0 \;\; X_1 \;\; X_2 \;\; X_3 \;\big]}_{X}\; \boldsymbol\beta`, { x: LEFT_X, y: 448, size: 31, at: 3 });
      ui.text('切片と、項ごとの行列を横に並べる', { x: 620, y: 470, size: 21, color: C.text2, at: 3, delay: 0.4 });
      seeThrough(ui.card({ x: CARD_X + 40, y: 420, w: CARD_W - 40, h: 270, title: 'mgcv の既定（s(x) と書いたとき）', at: 4, accent: C.theory }));
      ui.text(`bs = "tp"　薄板回帰スプライン<br>k = 10　　基底の数（自由度の上限）<br>例の係数：1 + 9 × 4 = ${MAIN.coefCount} 個`, { x: CARD_X + 68, y: 474, size: 23, lh: 1.9, at: 4, delay: 0.3 });
      ui.text('9 = k − 1（1つ減る理由は第4章）', { x: CARD_X + 68, y: 632, size: 19, color: C.muted, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解: 基底関数の重みつきの和
  const BASIS_COUNT = NARROW.size - 1;
  const CELL = { x0: 76, y0: 150, w: 172, h: 150, gapX: 18, gapY: 44 };
  const SUM_BOX = { x: 760, y: 150, w: 760, h: 520 };
  const narrowBasis = Array.from({ length: BASIS_COUNT }, (_, k) => column(NARROW.Xp, k + 1));
  const basisPeak = narrowBasis.map((values) => Math.max(...values.map(Math.abs)));
  const narrowCoef = narrowFit.beta;
  const contribution = narrowBasis.map((values, k) => values.map((v) => v * narrowCoef[k + 1]));
  const contributionPeak = Math.max(...contribution.flat().map(Math.abs));
  const ADD_SECONDS = 7.5;
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '基底関数に係数を掛けて足す',
    beats: [
      beat(`1変数の例で見ます。点は ${SINGLE.n} 個のデータ、橙の破線は真の関数です。`),
      beat(`左は、mgcv が作った ${BASIS_COUNT} 本の基底関数です。なだらかなものから、細かく波打つものまであります。`),
      beat('それぞれに係数を掛けます。係数の絶対値が大きい基底ほど、曲線に強く効きます。'),
      beat('切片に、係数を掛けた基底を1本ずつ足していくと、青い曲線ができていきます。', 10),
      beat(`${BASIS_COUNT} 本すべてを足したものが、推定した関数です。係数をどう決めるかが、次の章の話です。`),
    ],
    build(ui) {
      ui.text('基底関数 $b_k(x)$', { x: CELL.x0, y: 106, size: 22, weight: 700, at: 1, until: 2 });
      ui.text('係数を掛けたもの $\\beta_k b_k(x)$', { x: CELL.x0, y: 106, size: 22, weight: 700, at: 2 });
      return { plot: X.singlePlot(SUM_BOX) };
    },
    draw(ctx, s, st) {
      X.drawSingleData(ctx, st.plot, { alpha: s.p(0, 0.8) });
      const scaled = s.beat >= 2 ? s.p(2, 1.4, 0.3) : 0;
      const added = s.beat >= 3 ? clamp(s.lin(3, ADD_SECONDS, 0.6)) * BASIS_COUNT : 0;
      if (s.beat >= 1) {
        narrowBasis.forEach((values, k) => {
          const col = k % 3;
          const row = Math.floor(k / 3);
          const box = { x: CELL.x0 + col * (CELL.w + CELL.gapX), y: CELL.y0 + row * (CELL.h + CELL.gapY), w: CELL.w, h: CELL.h };
          const plot = new Plot({ ...box, xr: [0, 1], yr: [-1.2, 1.2] });
          const alpha = s.p(1, 0.6, 0.08 * k);
          const active = s.beat === 3 && added > k && added <= k + 1;
          ctx.save();
          ctx.globalAlpha *= alpha;
          roundRect(ctx, box.x - 6, box.y - 6, box.w + 12, box.h + 12, 8);
          ctx.fillStyle = rgba(active ? C.yellow : C.text, active ? 0.12 : 0.03);
          ctx.fill();
          if (active) {
            ctx.strokeStyle = C.yellow;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
          plot.hline(ctx, 0, { color: C.axis, dash: null, width: 1, alpha });
          // 形だけを見せる高さ（基底ごとにそろえる）から、係数を掛けた共通の高さへ移す
          const shown = values.map((v, i) => lerp(v / basisPeak[k], contribution[k][i] / contributionPeak, scaled));
          plot.line(ctx, SINGLE.grid, shown, { color: scaled > 0.5 ? C.blue : C.aqua, width: 2.5, alpha, upto: s.p(1, 1, 0.08 * k) });
          canvasText(ctx, `b${sub(k + 1)}`, box.x + 4, box.y + 14, { size: 16, color: C.text2, alpha });
          if (s.beat >= 2) canvasText(ctx, `β${sub(k + 1)} = ${fmt(narrowCoef[k + 1], 2)}`, box.x + box.w - 2, box.y + box.h + 22, { size: 16, color: C.text2, align: 'right', alpha: scaled });
        });
      }
      if (s.beat >= 3) {
        // 部分和: 切片 + 先頭から added 本ぶん（途中の1本は少しずつ足す）
        const whole = Math.floor(added);
        const partial = SINGLE.grid.map((_, i) => {
          let total = narrowCoef[0];
          for (let k = 0; k < whole; k++) total += contribution[k][i];
          if (whole < BASIS_COUNT) total += contribution[whole][i] * (added - whole);
          return total;
        });
        st.plot.line(ctx, SINGLE.grid, partial, { color: C.blue, width: 4, alpha: s.p(3, 0.5) });
        const label = whole >= BASIS_COUNT ? `切片 + ${BASIS_COUNT} 本すべて` : `切片 + ${whole} 本`;
        canvasText(ctx, label, SUM_BOX.x + SUM_BOX.w - 8, SUM_BOX.y + 26, { size: 21, color: C.text, align: 'right', weight: 700, alpha: s.p(3, 0.5) });
      }
      legend(ctx, [{ kind: 'dot', color: C.text2, label: 'データ' }, { color: C.orange, dash: [8, 6], label: '真の関数' }, ...(s.beat >= 3 ? [{ color: C.blue, label: '基底の和' }] : [])], SUM_BOX.x + 10, 736, { alpha: s.p(0, 0.8), size: 17 });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論: 薄板回帰スプライン
  SCENES.push({
    id: '2T2',
    chapter: 2,
    kind: 'theory',
    title: '薄板回帰スプライン（bs = "tp"）',
    beats: [
      beat('薄板スプラインは、当てはまりの悪さと、曲がりの大きさの和を最小にする関数です。1変数では、3次の平滑化スプラインと同じものです。', 11),
      beat('その解は、データの点ごとに置いた、距離の関数 η の和に、直線を足した形になります。'),
      beat('ただし、係数がデータの数 n だけあり、計算量は n の3乗に比例します。データが多いと使えません。'),
      beat('そこで mgcv は、η を並べた行列 E を固有値分解し、絶対値の大きい固有値を k 個だけ残します。これが薄板回帰スプラインです。', 11),
      beat('節点の位置を決めなくてよく、2変数以上の滑らかな関数にも、同じ作り方が使えます。'),
    ],
    build(ui) {
      ui.tex(R`\min_{f}\ \sum_{i=1}^{n} \big(y_i - f(x_i)\big)^2 + \lambda \int f''(x)^2\, dx`, { x: LEFT_X, y: 108, size: 31, dim: [[1, 5]] });
      ui.tex(R`f(x) = \sum_{i=1}^{n} \delta_i\, \eta\big(|x - x_i|\big) + \alpha_0 + \alpha_1 x`, { x: LEFT_X, y: 232, size: 31, at: 1, dim: [[3, 5]] });
      ui.tex(R`\eta(r) = \tfrac{1}{12}\, r^3 \quad \text{（1変数のとき）}`, { x: 640, y: 258, size: 24, color: C.text2, at: 1, delay: 0.4, dim: [[3, 5]] });
      ui.text(`係数は $n$ 個 → 計算量は $O(n^3)$`, { x: LEFT_X, y: 372, size: 27, color: C.red, weight: 700, at: 2, glow: [{ from: 2, to: 3, color: C.red }] });
      ui.tex(R`E_{ij} = \eta\big(|x_i - x_j|\big), \qquad E = U D\, U^{\mathsf T} \;\approx\; \htmlClass{hl-trunc}{U_k D_k U_k^{\mathsf T}}`, {
        x: LEFT_X, y: 462, size: 31, at: 3, hl: [{ cls: 'hl-trunc', from: 3, to: 4 }],
      });
      ui.text('絶対値の大きい固有値を $k$ 個だけ残す（Wood 2003）。係数は $n$ 個から $k$ 個に減る', { x: LEFT_X, y: 548, size: 22, color: C.text2, at: 3, delay: 0.4 });
      seeThrough(ui.card({ x: CARD_X, y: 108, w: CARD_W, h: 300, title: '薄板回帰スプラインの特徴', at: 4, accent: C.theory }));
      ui.text('・節点（knot）の位置を選ばなくてよい<br>・s(x, z) のような2変数以上も同じ作り方<br>・切り詰めによる変化が最も小さい基底<br>・点が多いときは、一部の点（既定で最大 2000 点）から作る', { x: CARD_X + 26, y: 160, w: CARD_W - 52, size: 21, lh: 1.75, at: 4, delay: 0.3 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解: 固有値で基底を切り詰める
  const ETA_BOX = { x: 86, y: 196, w: 400, h: 440 };
  const EIGEN_BOX = { x: 590, y: 196, w: 420, h: 440 };
  const RAW_CELL = { x0: 1096, y0: 184, w: 196, h: 76, gapX: 20, gapY: 18 };
  const ETA_CENTERS = SINGLE.x.slice().sort((a, b) => a - b).filter((_, i) => i % 17 === 8); // 200点のうち12点
  const eta = (r) => r ** 3 / 12;
  const EIGEN_SHOWN = 30;
  const KEPT = 10;
  const rawBasis = Array.from({ length: KEPT }, (_, k) => column(SINGLE.rawBasis, k));
  const rawSpan = rawBasis.map((values) => Math.max(...values) - Math.min(...values));
  // 定数と直線（ペナルティのかからない2本）を先頭に、曲がりを表す8本をその後ろに並べる
  const rawOrder = [...rawBasis.keys()].sort((a, b) => (a >= KEPT - 2) - (b >= KEPT - 2) || a - b);
  const rawShown = [KEPT - 2, KEPT - 1, ...rawOrder.filter((k) => k < KEPT - 2)];
  const eigenRatio = SINGLE.eigenAbs[KEPT] / SINGLE.eigenAbs[0];
  SCENES.push({
    id: '2V2',
    chapter: 2,
    kind: 'visual',
    title: '固有値で基底を切り詰める',
    beats: [
      beat(`左は、データの点ごとに置いた関数 η です。${SINGLE.n} 点あるので、${SINGLE.n} 本あります。ここでは、一部だけを描いています。`),
      beat(`この関数の値を並べた、${SINGLE.n} 行 ${SINGLE.n} 列の行列を固有値分解します。棒は、固有値の絶対値を大きい順に並べたものです。縦軸は対数です。`, 11),
      beat(`固有値は急に小さくなります。大きい方から ${KEPT} 個だけを残します。11 番目は、1番目の約 ${Math.round(1 / eigenRatio / 1000)} 千分の1 です。`, 10),
      beat('残した固有ベクトルから作った基底が、右です。定数と直線の2本と、曲がりを表す8本で、合わせて 10 本です。', 10),
      beat('同じ手順を別に計算して、mgcv の基底と同じ空間になることを確かめました。mgcv は、ランチョス法で、必要な固有値だけを求めます。', 11),
    ],
    build(ui) {
      ui.text(`データの点ごとの関数 $\\eta(|x - x_i|)$`, { x: ETA_BOX.x - 6, y: 116, size: 22, weight: 700 });
      ui.text(`${SINGLE.n} 本（描いているのは ${ETA_CENTERS.length} 本）`, { x: ETA_BOX.x - 6, y: 152, size: 18, color: C.muted, delay: 0.3 });
      ui.text('行列 $E$ の固有値の絶対値', { x: EIGEN_BOX.x - 6, y: 116, size: 22, weight: 700, at: 1 });
      ui.text(`大きい順に ${EIGEN_SHOWN} 個（縦軸は対数）`, { x: EIGEN_BOX.x - 6, y: 152, size: 18, color: C.muted, at: 1, delay: 0.3 });
      ui.text(`切り詰めた基底（k = ${KEPT}）`, { x: RAW_CELL.x0 - 6, y: 116, size: 22, weight: 700, at: 3 });
      ui.text(`別に計算した基底と mgcv の基底のずれ：相対値で $10^{${Math.ceil(Math.log10(SINGLE.spanGap))}}$ 以下（計算の丸め誤差の範囲）`, { x: EIGEN_BOX.x - 6, y: 712, w: 900, size: 20, color: C.text2, at: 4, delay: 0.4 });
      return {
        etaPlot: new Plot({ ...ETA_BOX, xr: [0, 1], yr: [0, 0.085] }),
        eigenPlot: new Plot({ ...EIGEN_BOX, xr: [0.2, EIGEN_SHOWN + 0.8], yr: [-6.2, 0.6] }),
      };
    },
    draw(ctx, s, st) {
      const alpha0 = s.p(0, 0.8);
      st.etaPlot.axes(ctx, { xticks: [0, 0.5, 1], xlabel: 'x', alpha: alpha0, fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0) });
      ETA_CENTERS.forEach((center, i) => {
        st.etaPlot.line(ctx, SINGLE.grid, SINGLE.grid.map((x) => eta(Math.abs(x - center))), { color: i % 2 ? C.aqua : C.blue, width: 2, alpha: alpha0 * 0.85, upto: s.p(0, 1.2, 0.3 + 0.1 * i) });
        st.etaPlot.dots(ctx, [center], [0], { color: C.text2, r: 4, alpha: alpha0 });
      });
      if (s.beat >= 1) {
        const plot = st.eigenPlot;
        const alpha = s.p(1, 0.8);
        plot.axes(ctx, { xticks: [1, 10, 20, 30], yticks: [-6, -4, -2, 0], fmtY: X.NO_LABEL, xlabel: '大きい順の番号', alpha });
        X.powerTicks(ctx, plot, [-6, -4, -2, 0], 'y', { alpha });
        const keep = s.beat >= 2 ? s.p(2, 0.8, 0.4) : 0;
        SINGLE.eigenAbs.slice(0, EIGEN_SHOWN).forEach((value, i) => {
          const grow = s.p(1, 0.6, 0.3 + 0.04 * i);
          const x0 = plot.sx(i + 1) - 5;
          const yTop = plot.sy(lerp(-6.2, X.log10(value), grow));
          const kept = i < KEPT;
          ctx.save();
          ctx.globalAlpha *= alpha * (kept ? 1 : lerp(1, 0.3, keep));
          ctx.fillStyle = kept ? (keep > 0.5 ? C.yellow : C.blue) : C.blue;
          ctx.fillRect(x0, yTop, 10, plot.y + plot.h - yTop);
          ctx.restore();
        });
        if (keep > 0) {
          plot.vline(ctx, KEPT + 0.5, { color: C.yellow, alpha: keep, width: 2 });
          canvasText(ctx, `ここまで残す（${KEPT} 個）`, plot.sx(KEPT + 0.5) + 10, plot.y + 30, { size: 18, color: C.text, alpha: keep });
        }
      }
      if (s.beat >= 3) {
        rawShown.forEach((k, position) => {
          const col = position % 2;
          const row = Math.floor(position / 2);
          const box = { x: RAW_CELL.x0 + col * (RAW_CELL.w + RAW_CELL.gapX), y: RAW_CELL.y0 + row * (RAW_CELL.h + RAW_CELL.gapY), w: RAW_CELL.w, h: RAW_CELL.h };
          const values = rawBasis[k];
          const flat = rawSpan[k] < 1e-9;
          const centre = (Math.max(...values) + Math.min(...values)) / 2;
          const half = flat ? 1 : rawSpan[k] / 2;
          const plot = new Plot({ ...box, xr: [0, 1], yr: [-1.25, 1.25] });
          const alpha = s.p(3, 0.6, 0.1 * position);
          const polynomial = position < 2;
          ctx.save();
          ctx.globalAlpha *= alpha;
          roundRect(ctx, box.x - 5, box.y - 5, box.w + 10, box.h + 10, 8);
          ctx.fillStyle = rgba(polynomial ? C.orange : C.text, polynomial ? 0.1 : 0.03);
          ctx.fill();
          ctx.restore();
          plot.line(ctx, SINGLE.grid, values.map((v) => (flat ? 0 : (v - centre) / half)), { color: polynomial ? C.orange : C.aqua, width: 2.5, alpha, upto: s.p(3, 0.9, 0.1 * position) });
          if (polynomial) canvasText(ctx, position === 0 ? '定数' : '直線', box.x + 6, box.y + 18, { size: 16, color: C.text2, alpha });
        });
      }
    },
  });
})();
