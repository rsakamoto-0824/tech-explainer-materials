// scenes-select.js — 第6章（平滑化パラメータ λ の選び方：GCV・REML、繰り返しの比較、ニュートン法、REML の面）。
// GCV・REML の曲線と面は gam-math.js で計算し、谷の底が mgcv の λ と一致することを tools/check-math.mjs で確かめている。
(() => {
  const { C, Plot, fmt, canvasText, lerp, clamp, legend, rgba, keyframes, seqColor, heatmapCanvas, drawImage } = KIT;
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
  const COLOR_GCV = C.violet;
  const COLOR_REML = C.aqua;

  const SINGLE = DATA.single;
  const WIDE = X.wide;
  const WIDE_K = DATA.wide.k;
  const SCAN = WIDE.scan;
  const LOG_REML = X.log10(WIDE.sp);
  const LOG_GCV = X.log10(WIDE.spGcv);
  const atReml = WIDE.fit(WIDE.sp);
  const atGcv = WIDE.fit(WIDE.spGcv);
  // 表から谷の底（この動画の計算での最小の位置）を探す
  const argmin = (values) => values.indexOf(Math.min(...values));
  const ownMin = { gcv: SCAN.logs[argmin(SCAN.gcv)], reml: SCAN.logs[argmin(SCAN.reml)] };

  // ---------------------------------------------------------------- 第6章 理論
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: 'λ を選ぶ基準：GCV と REML',
    beats: [
      beat('残る問題は、λ の選び方です。mgcv には、大きく分けて2つの基準があります。'),
      beat('1つ目は GCV、一般化交差検証です。データを1点ずつ抜いて予測したときの誤差を、近似する量です。分母に有効自由度が入り、複雑なモデルほど不利になります。', 12),
      beat('2つ目は REML です。ペナルティを、係数の事前分布とみなします。すると λ は、事前分布の分散を決めるパラメータになります。', 11),
      beat('係数を積分して消した尤度、つまり周辺尤度を作り、それを最大にする λ を選びます。正規分布以外では、積分をラプラス近似で計算します。', 11),
      beat('gam の既定は GCV です。ただし作者の Wood は論文で、REML のほうが誤差が小さく、極端な波打ちが起きにくいと報告しています。method = "REML" と指定します。', 12),
    ],
    build(ui) {
      ui.text(`<span class="pill" style="background:${COLOR_GCV}">GCV</span>一般化交差検証（予測の誤差を小さく）`, { x: LEFT_X, y: 112, size: 25, weight: 700, at: 1 });
      ui.tex(R`\mathcal{V}_g(\lambda) = \frac{n\, \|\boldsymbol y - \hat{\boldsymbol\mu}\|^2}{\big(n - \htmlClass{hl-edf}{\mathrm{edf}}\big)^2}`, { x: LEFT_X, y: 168, size: 31, at: 1, hl: [{ cls: 'hl-edf', from: 1, to: 2 }] });
      ui.text('gam( ) の既定（method = "GCV.Cp"）。尺度 $\\phi$ が既知の分布では UBRE を使う', { x: 560, y: 196, w: 880, size: 20, color: C.text2, at: 1, delay: 0.5 });
      ui.text(`<span class="pill" style="background:${COLOR_REML}">REML</span>制限付き最尤（周辺尤度を大きく）`, { x: LEFT_X, y: 318, size: 25, weight: 700, at: 2 });
      ui.tex(R`\boldsymbol\beta \sim N\big(\boldsymbol 0,\ \phi\, S_\lambda^{-}\big), \qquad S_\lambda = \textstyle\sum_j \lambda_j S_j`, { x: LEFT_X, y: 376, size: 28, at: 2, delay: 0.3 });
      ui.text('ペナルティ ＝ 係数の事前分布（$\\lambda$ が大きいほど、波打つ成分の分散が小さい）', { x: 700, y: 386, size: 20, color: C.text2, at: 2, delay: 0.6 });
      ui.tex(R`\mathcal{V}_r(\lambda) = \frac{D_p}{2\phi} - \ell_s + \frac{\log |X^{\mathsf T} W X + S_\lambda| - \log |S_\lambda|_{+}}{2} - \frac{M_p}{2} \log(2\pi\phi)`, { x: LEFT_X, y: 464, size: 27, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text('周辺尤度の対数の符号を変えたもの（小さいほど良い）。$D_p$：ペナルティつき逸脱度、$\\ell_s$：飽和モデルの対数尤度、$M_p$：ペナルティのかからない係数の数、$|\\cdot|_+$：0 でない固有値の積（Wood 2011）', { x: LEFT_X, y: 552, w: 1420, size: 19, color: C.text2, lh: 1.6, at: 3, delay: 0.5 });
      ui.text('<div class="code">b &lt;- <span class="kw">gam</span>(y ~ <span class="kw">s</span>(x0) + <span class="kw">s</span>(x1), data = dat, method = <span class="str">"REML"</span>)</div>', { x: LEFT_X, y: 650, size: 22, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解: GCV と REML の曲線
  const CURVE_X = 120;
  const CURVE_W = 600;
  const GCV_BOX = { x: CURVE_X, y: 168, w: CURVE_W, h: 200 };
  const REML_BOX = { x: CURVE_X, y: 448, w: CURVE_W, h: 200 };
  const FIT_BOX = { x: 880, y: 168, w: 640, h: 440 };
  const LOG_RANGE = [-8, 6];
  const LOG_TICKS = [-8, -4, 0, 4];
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: 'GCV と REML の曲線',
    beats: [
      beat(`基底が ${WIDE_K} 本の例で、λ を端から端まで動かして、2つの基準を計算します。どちらも、小さいほど良い量です。`, 10),
      beat('λ が小さすぎても、大きすぎても、基準は大きくなります。その間に谷があります。', 9),
      beat(`谷の底が、選ばれる λ です。この例では、GCV と REML で、ほぼ同じ λ が選ばれました。有効自由度は、どちらも約 ${fmt(atReml.edf, 1)} です。`, 11),
      beat('違うのは、λ が小さい側の形です。GCV は、ある高さで頭打ちになります。REML は、λ を小さくするほど、大きくなり続けます。小さすぎる λ を、REML のほうが強く避けます。', 13),
      beat('黄色の縦線は、mgcv が選んだ λ です。この動画で計算した谷の底と、一致します。'),
    ],
    build(ui) {
      ui.text(`<span class="pill" style="background:${COLOR_GCV}">GCV</span>`, { x: CURVE_X - 10, y: 112, size: 22 });
      ui.text(`<span class="pill" style="background:${COLOR_REML}">REML</span>`, { x: CURVE_X - 10, y: 392, size: 22 });
      ui.text('その λ での当てはめ', { x: FIT_BOX.x - 10, y: 112, size: 22, weight: 700 });
      ui.text(`mgcv の λ：GCV ${WIDE.spGcv.toFixed(4)}、REML ${WIDE.sp.toFixed(4)}<br>この動画の計算の谷の底と、4桁まで一致`, { x: FIT_BOX.x - 10, y: 668, size: 20, color: C.text2, lh: 1.6, at: 4, delay: 0.4 });
      const logAt = (u, bt) =>
        keyframes(u, [
          [bt(0) + 1.2, -8],
          [bt(0) + 8, 6],
          [bt(1) + 0.5, 6],
          [bt(1) + 3.5, -8],
          [bt(1) + 6.5, 2],
          [bt(2) + 0.3, 2],
          [bt(2) + 2.2, LOG_REML],
          [bt(3) + 0.8, LOG_REML],
          [bt(3) + 4.5, -8],
          [bt(3) + 9, -8],
          [bt(4) + 0.2, -8],
          [bt(4) + 2.4, LOG_REML],
        ]);
      return {
        logAt,
        gcv: new Plot({ ...GCV_BOX, xr: LOG_RANGE, yr: [3.7, 9.2] }),
        reml: new Plot({ ...REML_BOX, xr: LOG_RANGE, yr: [415, 670] }),
        fit: X.singlePlot(FIT_BOX),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.8);
      const log = st.logAt(s.u, s.bt);
      const fit = WIDE.fit(10 ** log);
      // 最初の字幕では、動いていく λ の位置まで曲線を描く（点と線の先頭をそろえる）
      const drawn = s.beat === 0 ? clamp((log - LOG_RANGE[0]) / (LOG_RANGE[1] - LOG_RANGE[0])) : 1;
      const panels = [
        { plot: st.gcv, values: SCAN.gcv, color: COLOR_GCV, value: fit.gcv, yticks: [4, 6, 8], minLog: ownMin.gcv, mgcvLog: LOG_GCV, digits: 2 },
        { plot: st.reml, values: SCAN.reml, color: COLOR_REML, value: fit.reml, yticks: [450, 550, 650], minLog: ownMin.reml, mgcvLog: LOG_REML, digits: 1 },
      ];
      panels.forEach(({ plot, values, color, value, yticks, mgcvLog, digits }) => {
        plot.axes(ctx, { xticks: LOG_TICKS, yticks, fmtX: X.NO_LABEL, alpha });
        X.powerTicks(ctx, plot, LOG_TICKS, 'x', { alpha });
        canvasText(ctx, 'λ', plot.x + plot.w + 12, plot.y + plot.h + 6, { size: 18, alpha });
        plot.line(ctx, SCAN.logs, values, { color, alpha, upto: drawn });
        if (s.beat >= 4) plot.vline(ctx, mgcvLog, { color: C.yellow, width: 2.5, alpha: s.p(4, 0.6, 2.4) });
        if (s.beat >= 2) plot.vline(ctx, mgcvLog, { color: C.text2, alpha: s.p(2, 0.6, 2.2) * (s.beat >= 4 ? 1 - s.p(4, 0.6, 2.4) : 1) });
        plot.dots(ctx, [log], [value], { color: C.yellow, r: 8, alpha });
        canvasText(ctx, fmt(value, digits), plot.x + plot.w, plot.y - 20, { size: 23, color: C.text, weight: 700, align: 'right', alpha });
      });
      if (s.beat >= 3) {
        const a = s.win(3, 4);
        X.arrow(ctx, st.gcv.sx(-5.2), st.gcv.sy(6.9), st.gcv.sx(-6.6), st.gcv.sy(5.35), { color: C.yellow, alpha: a });
        canvasText(ctx, '頭打ちになる', st.gcv.sx(-5.1), st.gcv.sy(7.1), { size: 19, color: C.text, alpha: a });
        X.arrow(ctx, st.reml.sx(-4.2), st.reml.sy(640), st.reml.sx(-7), st.reml.sy(625), { color: C.yellow, alpha: a });
        canvasText(ctx, '大きくなり続ける', st.reml.sx(-4), st.reml.sy(634), { size: 19, color: C.text, alpha: a });
      }
      X.drawSingleData(ctx, st.fit, { alpha });
      st.fit.line(ctx, SINGLE.grid, WIDE.curve(fit.beta), { color: C.blue, width: 4, alpha });
      canvasText(ctx, `有効自由度 ${fmt(fit.edf, 1)}`, FIT_BOX.x + FIT_BOX.w - 6, FIT_BOX.y + 26, { size: 22, color: C.text, weight: 700, align: 'right', alpha });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解: データを作り直して比べる
  const REPEATS = DATA.repeats;
  const STUDY = REPEATS.smooth;
  const WORST = STUDY.worst;
  const BIN_WIDTH = 0.5;
  const EDF_RANGE = [2, 15];
  const BIN_COUNT = Math.round((EDF_RANGE[1] - EDF_RANGE[0]) / BIN_WIDTH);
  const histogram = (values) => {
    const counts = new Array(BIN_COUNT).fill(0);
    values.forEach((v) => counts[clamp(Math.floor((v - EDF_RANGE[0]) / BIN_WIDTH), 0, BIN_COUNT - 1)]++);
    return counts;
  };
  const histReml = histogram(STUDY.edfReml);
  const histGcv = histogram(STUDY.edfGcv);
  const HIST_MAX = Math.ceil(Math.max(...histReml, ...histGcv) / 20) * 20;
  const median = (values) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const medianReml = median(STUDY.edfReml);
  const outlierLimit = 2 * medianReml;
  const outliersGcv = STUDY.edfGcv.filter((v) => v > outlierLimit).length;
  const outliersReml = STUDY.edfReml.filter((v) => v > outlierLimit).length;
  const gcvWins = STUDY.mseGcv.filter((v, i) => v < STUDY.mseReml[i]).length;
  const HIST_X = 120;
  const HIST_W = 640;
  const HIST_REML_BOX = { x: HIST_X, y: 168, w: HIST_W, h: 190 };
  const HIST_GCV_BOX = { x: HIST_X, y: 440, w: HIST_W, h: 190 };
  const WORST_BOX = { x: 900, y: 168, w: 620, h: 400 };
  function drawHistogram(ctx, plot, counts, color, alpha, grow) {
    plot.axes(ctx, { xticks: [2, 4, 6, 8, 10, 12, 14], yticks: [0, HIST_MAX / 2, HIST_MAX], xlabel: '選ばれた有効自由度', alpha });
    counts.forEach((count, i) => {
      if (!count) return;
      const x0 = plot.sx(EDF_RANGE[0] + i * BIN_WIDTH) + 1;
      const x1 = plot.sx(EDF_RANGE[0] + (i + 1) * BIN_WIDTH) - 1;
      const top = plot.sy(count * grow);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x0, Math.min(top, plot.y + plot.h - 2), x1 - x0, Math.max(2, plot.y + plot.h - top));
      ctx.restore();
    });
  }
  SCENES.push({
    id: '6V2',
    chapter: 6,
    kind: 'visual',
    title: 'データを作り直して比べる',
    beats: [
      beat(`この違いを確かめるため、データを ${REPEATS.count} 回作り直して、選ばれた有効自由度を比べました。真の関数は、山が1つの、なだらかな曲線です。`, 11),
      beat(`REML が選んだ有効自由度は、${Math.round(medianReml)} のまわりに集まります。最大でも ${fmt(Math.max(...STUDY.edfReml), 1)} です。`, 9),
      beat(`GCV も、ほとんどは同じあたりです。しかし、ときどき大きく外れます。REML の中央値の2倍を超えたのは、${REPEATS.count} 回のうち ${outliersGcv} 回で、最大は ${fmt(Math.max(...STUDY.edfGcv), 1)} でした。`, 13),
      beat(`右は、GCV がいちばん外れた回です。GCV の曲線は波打っています。真の関数との平均二乗誤差は、${REPEATS.count} 回の平均で、REML が ${fmt(mean(STUDY.mseReml), 3)}、GCV が ${fmt(mean(STUDY.mseGcv), 3)} でした。`, 14),
    ],
    build(ui) {
      ui.text(`<span class="pill" style="background:${COLOR_REML}">REML</span>${REPEATS.count} 回の分布`, { x: HIST_X - 10, y: 112, size: 22 });
      ui.text(`<span class="pill" style="background:${COLOR_GCV}">GCV</span>${REPEATS.count} 回の分布`, { x: HIST_X - 10, y: 384, size: 22, at: 2 });
      ui.text(`GCV がいちばん外れた回（${WORST.index} 回目）`, { x: WORST_BOX.x - 10, y: 112, size: 22, weight: 700, at: 3 });
      ui.text(`条件：$y = 2\\sin(\\pi x) + $ ノイズ（標準偏差 ${REPEATS.noiseSd}）、${REPEATS.n} 点、k = ${REPEATS.k}。この条件での結果`, { x: HIST_X - 10, y: 700, w: 760, size: 18, color: C.muted });
      ui.text(`${REPEATS.count} 回の平均二乗誤差の平均：REML ${fmt(mean(STUDY.mseReml), 3)}、GCV ${fmt(mean(STUDY.mseGcv), 3)}<br>GCV のほうが誤差の小さい回も ${gcvWins} 回ある`, { x: WORST_BOX.x - 10, y: 650, w: 640, size: 20, color: C.text2, lh: 1.6, at: 3, delay: 0.6 });
      return {
        reml: new Plot({ ...HIST_REML_BOX, xr: EDF_RANGE, yr: [0, HIST_MAX * 1.05] }),
        gcv: new Plot({ ...HIST_GCV_BOX, xr: EDF_RANGE, yr: [0, HIST_MAX * 1.05] }),
        worst: new Plot({ ...WORST_BOX, xr: [0, 1], yr: [-6, 9] }),
      };
    },
    draw(ctx, s, st) {
      drawHistogram(ctx, st.reml, histReml, COLOR_REML, s.p(0, 0.8), s.p(1, 1.2, 0.2));
      if (s.beat >= 2) {
        const a = s.p(2, 0.8);
        drawHistogram(ctx, st.gcv, histGcv, COLOR_GCV, a, s.p(2, 1.2, 0.3));
        st.gcv.vline(ctx, outlierLimit, { color: C.yellow, alpha: a * s.p(2, 0.6, 3) });
        canvasText(ctx, `REML の中央値の2倍 → ${outliersGcv} 回（REML は ${outliersReml} 回）`, st.gcv.sx(outlierLimit) + 10, st.gcv.y + 24, { size: 18, color: C.text, alpha: a * s.p(2, 0.6, 3) });
      }
      if (s.beat >= 3) {
        const a = s.p(3, 0.8);
        const plot = st.worst;
        plot.axes(ctx, { xticks: [0, 0.5, 1], yticks: [-5, 0, 5], xlabel: 'x', alpha: a, fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0) });
        X.scatter(ctx, plot, WORST.x, WORST.y, { alpha: 0.5 * a, r: 3 });
        plot.line(ctx, SINGLE.grid, WORST.truth, { color: C.orange, width: 2.5, dash: [8, 6], alpha: a });
        plot.line(ctx, SINGLE.grid, WORST.fitReml, { color: COLOR_REML, width: 3.5, alpha: a, upto: s.p(3, 1.2, 0.4) });
        plot.line(ctx, SINGLE.grid, WORST.fitGcv, { color: COLOR_GCV, width: 3.5, alpha: a, upto: s.p(3, 1.2, 1.2) });
        legend(ctx, [{ color: COLOR_REML, label: `REML（edf ${fmt(WORST.edfReml, 1)}）` }, { color: COLOR_GCV, label: `GCV（edf ${fmt(WORST.edfGcv, 1)}）` }, { color: C.orange, dash: [8, 6], label: '真の関数' }], WORST_BOX.x + 6, 628, { alpha: a, size: 17, gap: 22 });
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論: ニュートン法
  SCENES.push({
    id: '6T2',
    chapter: 6,
    kind: 'theory',
    title: 'λ が複数あるとき：ニュートン法',
    beats: [
      beat('滑らかな項が複数あると、λ も項の数だけあります。例の4変数では4つです。格子で探すと、組み合わせが多すぎます。'),
      beat('mgcv は、λ の対数を変数にして、ニュートン法で基準を最小にします。勾配とヘッセ行列を使って、谷底へ一気に近づく方法です。', 11),
      beat('計算は入れ子になります。外側で λ を更新し、内側では、その λ のもとで、P-IRLS で係数を解き直します。'),
      beat('難しいのは微分です。λ を動かすと、係数の推定値も動きます。mgcv は、陰関数の微分を使って、この動きも含めた勾配とヘッセ行列を、厳密に計算します。', 12),
      beat('谷が平らな向きでは、ヘッセ行列をそのまま使えません。固有値を直し、1歩の大きさに上限を付けて、安定に進めます。', 11),
    ],
    build(ui) {
      ui.text('$\\lambda$ は項ごとに1つ。10 点ずつの格子でも、4つなら $10^4$ 通り', { x: LEFT_X, y: 116, size: 25, weight: 700, color: C.red, dim: [[1, 5]] });
      ui.tex(R`\rho_j = \log \lambda_j, \qquad \boldsymbol\rho \;\leftarrow\; \boldsymbol\rho - H^{-1} \boldsymbol g`, { x: LEFT_X, y: 196, size: 33, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`\boldsymbol g = \frac{\partial \mathcal{V}_r}{\partial \boldsymbol\rho}, \qquad H = \frac{\partial^2 \mathcal{V}_r}{\partial \boldsymbol\rho\, \partial \boldsymbol\rho^{\mathsf T}}`, { x: 760, y: 186, size: 26, color: C.text2, at: 1, delay: 0.4 });
      ui.table({
        x: LEFT_X, y: 322, widths: [200, 420, 620], size: 23, rowH: 52, aligns: ['center', 'left', 'left'],
        header: ['', '動かすもの', '方法'],
        rows: [
          ['外側', R`$\boldsymbol\rho = \log \boldsymbol\lambda$（と尺度 $\phi$）`, 'ニュートン法で REML・GCV を最小に'],
          ['内側', R`係数 $\boldsymbol\beta$`, R`P-IRLS で $\hat{\boldsymbol\beta}(\boldsymbol\rho)$ を解き直す`],
        ],
        at: 2, rowDelay: 0.5, delay: 0.2,
      });
      ui.tex(R`\frac{d \mathcal{V}_r}{d \rho_j} = \frac{\partial \mathcal{V}_r}{\partial \rho_j} + \frac{\partial \mathcal{V}_r}{\partial \hat{\boldsymbol\beta}^{\mathsf T}}\, \htmlClass{hl-implicit}{\frac{d \hat{\boldsymbol\beta}}{d \rho_j}}`, {
        x: LEFT_X, y: 510, size: 29, at: 3, hl: [{ cls: 'hl-implicit', from: 3, to: 4 }],
      });
      ui.text('$\\hat{\\boldsymbol\\beta}$ は $\\boldsymbol\\rho$ の関数。その微分は、$\\hat{\\boldsymbol\\beta}$ が満たす式（ペナルティつき尤度の勾配 ＝ 0）を $\\rho_j$ で微分して求める', { x: 640, y: 520, w: 880, size: 20, color: C.text2, lh: 1.6, at: 3, delay: 0.4 });
      ui.text('安定に進める工夫：ヘッセ行列が正定値でなければ固有値を直す ／ 1歩の大きさに上限 ／ 悪くなったら歩幅を半分に', { x: LEFT_X, y: 664, w: 1420, size: 21, color: C.text2, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解: REML の面とニュートン法の道筋
  const TWO = DATA.two;
  const twoStats = { XtX: TWO.XtX, Xty: TWO.Xty, yty: TWO.yty, n: TWO.n };
  const twoInfo = M.penaltyInfo(TWO.S, TWO.off, TWO.Xty.length);
  const newtonPath = M.newtonReml(twoStats, twoInfo, TWO.initialSp);
  const NEWTON_STEPS = newtonPath.length - 1;
  const pathLog10 = newtonPath.map((step) => step.rho.map((v) => v / Math.LN10));
  const SURFACE_BOX = { x: 130, y: 196, w: 540, h: 474 };
  const SURFACE_X_RANGE = [-3, 3]; // log10 λ（x1 の項）
  const SURFACE_Y_RANGE = [-5, 2]; // log10 λ（x2 の項）
  const SURFACE_N = 64;
  const surfaceAxis = (range) => Array.from({ length: SURFACE_N }, (_, i) => range[0] + ((range[1] - range[0]) * i) / (SURFACE_N - 1));
  const surfaceXs = surfaceAxis(SURFACE_X_RANGE);
  const surfaceYs = surfaceAxis(SURFACE_Y_RANGE);
  const surface = surfaceYs.map((ly) => surfaceXs.map((lx) => M.fitGaussian(twoStats, twoInfo, [10 ** lx, 10 ** ly]).reml));
  const surfaceMin = newtonPath[NEWTON_STEPS].reml;
  const surfaceMax = Math.max(...surface.flat());
  // 色は「最小からの差」の対数で決める（谷底の近くを細かく見せる）
  const surfaceLevel = (value) => Math.log1p(Math.max(0, value - surfaceMin)) / Math.log1p(surfaceMax - surfaceMin);
  const CONTOUR_GAPS = [0.5, 2, 5, 10, 20, 40, 70];
  // 等高線（マーチングスクエア。線分の集まりを返す）
  function contourSegments(level) {
    const segments = [];
    const cross = (a, b, pa, pb) => {
      const k = (level - a) / (b - a);
      return [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k];
    };
    for (let i = 0; i < SURFACE_N - 1; i++) {
      for (let j = 0; j < SURFACE_N - 1; j++) {
        const corners = [[j, i], [j + 1, i], [j + 1, i + 1], [j, i + 1]];
        const values = corners.map(([cj, ci]) => surface[ci][cj]);
        const points = [];
        for (let e = 0; e < 4; e++) {
          const a = values[e];
          const b = values[(e + 1) % 4];
          if (a < level !== b < level) points.push(cross(a, b, corners[e], corners[(e + 1) % 4]));
        }
        for (let p = 0; p + 1 < points.length; p += 2) segments.push([points[p], points[p + 1]]);
      }
    }
    return segments;
  }
  const contours = CONTOUR_GAPS.map((gap) => contourSegments(surfaceMin + gap));
  const TERM_BOXES = [
    { x: 800, y: 196, w: 320, h: 250 },
    { x: 1200, y: 196, w: 320, h: 250 },
  ];
  const TERM_COLUMNS = [TWO.off[0] - 1, TWO.off[1] - 1]; // 項の最初の係数の位置
  const TERM_SIZE = TWO.S[0].length;
  const termCurve = (beta, term) => TWO.Xp.map((row) => { let total = 0; for (let c = 0; c < TERM_SIZE; c++) total += row[TERM_COLUMNS[term] + c] * beta[TERM_COLUMNS[term] + c]; return total; });
  const lambdaRatio = TWO.sp[0] / TWO.sp[1];
  SCENES.push({
    id: '6V3',
    chapter: 6,
    kind: 'visual',
    title: 'REML の面とニュートン法の道筋',
    beats: [
      beat('滑らかな項を2つにしたモデルで、REML の値を色で描きました。横軸が x1 の λ、縦軸が x2 の λ です。明るいところほど REML が小さく、良いところです。', 12),
      beat('白い丸が出発点です。mgcv が、行列の大きさのつり合いから決める初期値です。'),
      beat('ニュートン法の1歩目で、x2 の λ が大きく下がります。1歩の大きさの上限まで進んでいます。', 9),
      beat(`2歩目からは、谷底のまわりで細かく寄せていきます。${NEWTON_STEPS} 回で動かなくなりました。右は、その時点の2つの関数です。`, 11),
      beat(`着いた点は、mgcv の出した λ と一致します。x2 の λ は、x1 の約 ${Math.round(lambdaRatio / 10) * 10} 分の1 です。x2 のほうが細かく曲がることを表しています。`, 12),
    ],
    build(ui) {
      ui.text('REML の値（$y \\sim s(x_1) + s(x_2)$ のモデル）', { x: SURFACE_BOX.x - 30, y: 108, size: 22, weight: 700 });
      ui.text('その時点の関数', { x: TERM_BOXES[0].x - 10, y: 108, size: 22, weight: 700, at: 1 });
      ui.text(`この道筋は、勾配とヘッセ行列を差分で求めた再計算です。mgcv は尺度 $\\phi$ も同時に動かし、${TWO.outerIter} 回で収束しました`, { x: TERM_BOXES[0].x - 10, y: 690, w: 740, size: 18, color: C.muted, lh: 1.5, at: 3, delay: 0.6 });
      const positionAt = (u, bt) =>
        keyframes(u, [
          [bt(2) + 0.8, 0],
          [bt(2) + 3.2, 1],
          [bt(3) + 0.6, 1],
          ...Array.from({ length: NEWTON_STEPS - 1 }, (_, i) => [[bt(3) + 0.6 + 1.6 * (i + 1) - 0.5, i + 1], [bt(3) + 0.6 + 1.6 * (i + 1) + 0.4, i + 2]]).flat(),
        ]);
      return {
        positionAt,
        image: heatmapCanvas(SURFACE_N, SURFACE_N, (i, j) => seqColor(1 - 0.92 * surfaceLevel(surface[SURFACE_N - 1 - i][j]))),
        plot: new Plot({ ...SURFACE_BOX, xr: SURFACE_X_RANGE, yr: SURFACE_Y_RANGE }),
        terms: TERM_BOXES.map((box, i) => new Plot({ ...box, xr: [0, 1], yr: i === 0 ? [-4, 5] : [-6, 7] })),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.8);
      const plot = st.plot;
      drawImage(ctx, st.image, plot.x, plot.y, plot.w, plot.h, { smooth: true, alpha });
      ctx.save();
      plot.clip(ctx);
      ctx.globalAlpha *= alpha * 0.55;
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.2;
      const px = (j) => plot.x + (j / (SURFACE_N - 1)) * plot.w;
      const py = (i) => plot.y + plot.h - (i / (SURFACE_N - 1)) * plot.h;
      contours.forEach((segments) => {
        ctx.beginPath();
        segments.forEach(([a, b]) => {
          ctx.moveTo(px(a[0]), py(a[1]));
          ctx.lineTo(px(b[0]), py(b[1]));
        });
        ctx.stroke();
      });
      ctx.restore();
      plot.axes(ctx, { xticks: [-2, 0, 2], yticks: [-4, -2, 0, 2], fmtX: X.NO_LABEL, fmtY: X.NO_LABEL, alpha, zero: false });
      X.powerTicks(ctx, plot, [-2, 0, 2], 'x', { alpha });
      X.powerTicks(ctx, plot, [-4, -2, 0, 2], 'y', { alpha });
      canvasText(ctx, 'x₁ の項の λ', plot.x + plot.w, plot.y + plot.h + 54, { size: 18, color: C.text2, align: 'right', alpha });
      canvasText(ctx, 'x₂ の項の λ', plot.x - 30, plot.y - 14, { size: 18, color: C.text2, alpha });

      const position = s.beat >= 2 ? st.positionAt(s.u, s.bt) : 0;
      const whole = Math.floor(position);
      const at = (index) => pathLog10[Math.min(NEWTON_STEPS, index)];
      const current = at(whole).map((v, i) => lerp(v, at(whole + 1)[i], position - whole));
      if (s.beat >= 1) {
        const a = s.p(1, 0.6);
        // 通ってきた道筋
        ctx.save();
        plot.clip(ctx);
        ctx.globalAlpha *= a;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= whole; i++) {
          const [lx, ly] = at(i);
          if (i) ctx.lineTo(plot.sx(lx), plot.sy(ly));
          else ctx.moveTo(plot.sx(lx), plot.sy(ly));
        }
        ctx.lineTo(plot.sx(current[0]), plot.sy(current[1]));
        ctx.stroke();
        ctx.restore();
        for (let i = 0; i <= whole; i++) plot.dots(ctx, [at(i)[0]], [at(i)[1]], { color: i === 0 ? C.text : C.yellow, r: i === 0 ? 8 : 6, alpha: a });
        plot.dots(ctx, [current[0]], [current[1]], { color: C.yellow, r: 8, alpha: a });
        canvasText(ctx, '出発点', plot.sx(at(0)[0]) + 14, plot.sy(at(0)[1]) - 10, { size: 18, color: C.text, alpha: a });
        if (s.beat >= 4) {
          const b = s.p(4, 0.6);
          ctx.save();
          ctx.globalAlpha *= b;
          ctx.strokeStyle = C.text;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(plot.sx(X.log10(TWO.sp[0])), plot.sy(X.log10(TWO.sp[1])), 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          canvasText(ctx, 'mgcv の λ', plot.sx(X.log10(TWO.sp[0])) + 22, plot.sy(X.log10(TWO.sp[1])) + 34, { size: 18, color: C.text, alpha: b });
        }
        // 右: その時点の当てはめ
        const lambdas = current.map((v) => 10 ** v);
        const fit = M.fitGaussian(twoStats, twoInfo, lambdas);
        st.terms.forEach((termPlot, i) => {
          termPlot.axes(ctx, { xticks: [0, 0.5, 1], yticks: i === 0 ? [-4, 0, 4] : [-5, 0, 5], xlabel: `x${X.sub(i + 1)}`, alpha: a, fmtX: (v) => fmt(v, v === 0.5 ? 1 : 0) });
          termPlot.line(ctx, i === 0 ? TWO.grid1 : TWO.grid2, i === 0 ? TWO.truth1 : TWO.truth2, { color: C.orange, width: 2.5, dash: [8, 6], alpha: a });
          termPlot.line(ctx, i === 0 ? TWO.grid1 : TWO.grid2, termCurve(fit.beta, i), { color: C.blue, width: 3.5, alpha: a });
          canvasText(ctx, `s(x${i + 1})`, termPlot.x + termPlot.w / 2, termPlot.y - 16, { size: 20, color: C.text, weight: 700, align: 'center', alpha: a });
        });
        const shown = Math.round(position);
        const row = (label, value, y) => {
          canvasText(ctx, label, TERM_BOXES[0].x, y, { size: 21, color: C.text2, alpha: a });
          canvasText(ctx, value, TERM_BOXES[0].x + 420, y, { size: 23, color: C.text, weight: 700, align: 'right', alpha: a });
        };
        row('ニュートン法の反復', `${shown} 回目`, 540);
        row('x₁ の項の λ', lambdas[0].toPrecision(3), 580);
        row('x₂ の項の λ', lambdas[1].toPrecision(3), 620);
        row('REML', fmt(fit.reml, 2), 660);
        canvasText(ctx, `有効自由度  ${fmt(fit.edfEach.slice(TERM_COLUMNS[0], TERM_COLUMNS[0] + TERM_SIZE).reduce((p, q) => p + q, 0), 2)} ／ ${fmt(fit.edfEach.slice(TERM_COLUMNS[1], TERM_COLUMNS[1] + TERM_SIZE).reduce((p, q) => p + q, 0), 2)}`, TERM_BOXES[1].x + TERM_BOXES[1].w, 540, { size: 21, color: C.text2, align: 'right', alpha: a });
      }
    },
  });
})();
