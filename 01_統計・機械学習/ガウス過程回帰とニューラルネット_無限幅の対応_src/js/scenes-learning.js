// scenes-learning.js — 第4〜7章（ベイズ推論、勾配降下法 ①②、一致する条件と限界）、まとめ、おわり。
// 書き方は scenes-prior.js と同じ。全部の層を学習した結果は時間がかかるので、tools/make-data.mjs で前もって計算した js/nn-data.js を使う。
(() => {
  const { C, CHAPTERS, Plot, fmt, canvasText, keyframes, lerp, clamp, legend, rgba } = KIT;
  const M = NNM;
  const D = NNDRAW;
  const DATA = NN_DATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const GRID = M.GRID;
  const IN_DATA = [M.DATA_X[0], M.DATA_X[M.DATA_X.length - 1]];
  // 関数を描く大きなグラフ（第4〜6章で同じ位置）
  const BIG = { x: 110, y: 150, w: 980, h: 540 };
  const bigPlot = (yr = [-3.5, 3.5]) => new Plot({ ...BIG, xr: [M.GRID_MIN, M.GRID_MAX], yr });
  const bigAxes = (ctx, P, alpha) => P.axes(ctx, { xticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'x', ylabel: 'f(x)', alpha });
  const READ_X = 1170; // 右側の読み取り値の位置
  const maxGap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const lower = (mean, sd) => mean.map((m, i) => m - 2 * sd[i]);
  const upper = (mean, sd) => mean.map((m, i) => m + 2 * sd[i]);
  // カードの背景を透明にする（カードの中にキャンバスの図を描くため）
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const shadeOutside = (ctx, P, alpha) => {
    P.shade(ctx, M.GRID_MIN, IN_DATA[0], { alpha: 0.05 * alpha });
    P.shade(ctx, IN_DATA[1], M.GRID_MAX, { alpha: 0.05 * alpha });
  };

  // ---------------------------------------------------------------- 第4章 理論（ベイズ推論）
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: CHAPTERS[3],
    beats: [
      beat(R`ベイズ推論では、重み $\boldsymbol\theta$ に事前分布を置き、データを見たあとの事後分布 $p(\boldsymbol\theta \mid \mathbf{y})$ で予測します。`, 9),
      beat('重みは何千、何万個もあり、事後分布は複雑です。ふつうはマルコフ連鎖モンテカルロ法などで、近似的にサンプルを取ります。', 10),
      beat('関数で見ると、話は簡単になります。無限に広いネットの事前分布はガウス過程。観測ノイズが正規分布なら、事後分布もガウス過程です。', 11),
      beat(R`つまり、無限に広いネットのベイズ推論は、NNGP カーネル $K$ を使ったガウス過程回帰そのものです。予測の期待値も分散も、同じ式になります。`, 11),
      beat(R`条件は、幅が無限であること、重みの事前分布の分散が $1/H$ に比例すること、観測ノイズが正規分布であることです。`, 10),
    ],
    build(ui) {
      ui.tex(R`p(\boldsymbol\theta \mid \mathbf{y}) \propto p(\mathbf{y} \mid \boldsymbol\theta)\, p(\boldsymbol\theta)`, { x: LEFT_X, y: 124, size: 32 });
      ui.text('事後分布 ∝ データの出やすさ × 事前分布', { x: LEFT_X + 380, y: 134, size: 22, color: C.text2, delay: 0.6 });
      ui.text('重みは何千〜何万個。事後分布は山がいくつもあり複雑 → MCMC などで近似', { x: LEFT_X, y: 206, size: 22, at: 1 });
      ui.tex(R`\boldsymbol\theta \sim \mathcal{N}(\mathbf{0}, I)\ \xrightarrow{\ H \to \infty\ }\ f \sim \mathcal{GP}(0,\ K)\ \xrightarrow{\ \mathbf{y}\ \text{で条件づけ}\ }\ f \mid \mathbf{y}\ \text{もガウス過程}`, { x: LEFT_X, y: 290, size: 26, at: 2 });
      ui.tex(R`\mathbb{E}[f(x) \mid \mathbf{y}] = K(x, X)\,\big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, { x: LEFT_X, y: 384, size: 30, at: 3 });
      ui.tex(R`\mathrm{Var}[f(x) \mid \mathbf{y}] = K(x, x) - K(x, X)\,\big(K + \sigma_n^2 I\big)^{-1}K(X, x)`, { x: LEFT_X, y: 452, size: 28, at: 3, delay: 0.5 });
      ui.text(R`＝ NNGP カーネル $K$ のガウス過程回帰そのもの`, { x: LEFT_X, y: 526, size: 23, at: 3, delay: 1.0 });
      ui.text(R`条件：幅 $H \to \infty$、重みの事前分布の分散 ∝ $1/H$、正規分布の観測ノイズ`, { x: LEFT_X, y: 630, w: 900, size: 25, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 300, title: '2つの見方', at: 0 });
      ui.table({
        x: CARD_X + 20, y: 180, widths: [80, 190, 190], size: 21, rowH: 54,
        header: ['', '重みの空間', '関数の空間'],
        rows: [
          ['事前', R`$\boldsymbol\theta \sim \mathcal{N}(\mathbf{0}, I)$`, R`$\mathcal{GP}(0, K)$`],
          ['事後', '複雑（MCMC）', 'ガウス過程（式）'],
          ['予測', '近似', '式で正確'],
        ],
        at: 0, rowAt: [0, 2, 3], delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（幅を広げると事後分布が近づく）
  // 隠れ層を乱数で固定し、最後の層の重みだけをベイズ推論する（この場合は事後分布が式で求まる）
  const BAYES_WIDTHS = [3, 30, 300, 3000];
  const BAYES = BAYES_WIDTHS.map((width, i) => {
    const posterior = M.featurePosterior(M.randomNet(width, M.makeRandom(4100 + i)), GRID, M.NOISE_VAR);
    return { width, ...posterior };
  });
  const bayesAt = (index) => {
    const i = clamp(Math.floor(index), 0, BAYES.length - 1);
    const j = Math.min(BAYES.length - 1, i + 1);
    const k = index - i;
    return { mean: BAYES[i].mean.map((v, g) => lerp(v, BAYES[j].mean[g], k)), sd: BAYES[i].sd.map((v, g) => lerp(v, BAYES[j].sd[g], k)) };
  };
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '幅を広げると、ベイズ推論の答えが近づく',
    beats: [
      beat(R`データは6点です。青の点線と帯は、NNGP カーネルのガウス過程回帰の、事後平均とプラスマイナス2シグマです（$\sigma_n^2 = 0.01$）。`, 11),
      beat('幅 3 のネットで、隠れ層を乱数で固定し、最後の層の重みをベイズ推論しました。黄色が事後平均と帯です。折れ線で、帯の形も違います。', 11),
      beat('幅を 30、300 と広げると、事後平均と帯が、ガウス過程回帰に近づきます。', 9),
      beat('幅 3000 では、ほとんど重なります。右の数値は、表示した範囲での、平均のずれの最大値です。', 9),
      beat('幅が無限なら、ぴったり一致します。全部の重みをベイズ推論しても、同じガウス過程回帰になります。', 9),
    ],
    build() {
      return { gp: D.gpNoisy() };
    },
    draw(ctx, s, state) {
      const P = bigPlot([-3, 3]);
      const a0 = s.p(0, 0.6, 0.2);
      const gp = state.gp;
      ctx.save();
      ctx.globalAlpha = a0;
      bigAxes(ctx, P, 1);
      P.band(ctx, GRID, lower(gp.mean, gp.sd), upper(gp.mean, gp.sd), { color: D.COLOR.nngp, alpha: 0.22 });
      P.line(ctx, GRID, gp.mean, { color: D.COLOR.nngp, width: 3, dash: [8, 6] });
      ctx.restore();
      const a1 = s.p(1, 0.6, 0.4);
      const index = keyframes(s.u, [[s.bt(2), 0], [s.bt(2) + 1.4, 1], [s.bt(2) + 3.6, 1], [s.bt(2) + 5.0, 2], [s.bt(3), 2], [s.bt(3) + 1.4, 3]]);
      const nearest = BAYES[Math.round(index)];
      if (a1 > 0) {
        const net = bayesAt(index);
        ctx.save();
        ctx.globalAlpha = a1;
        P.band(ctx, GRID, lower(net.mean, net.sd), upper(net.mean, net.sd), { color: D.COLOR.mean, alpha: 0.18 });
        P.line(ctx, GRID, net.mean, { color: D.COLOR.mean, width: 3 });
        ctx.restore();
        canvasText(ctx, `幅 H = ${nearest.width}`, READ_X, 230, { size: 36, color: C.text, weight: 800, alpha: a1 });
        canvasText(ctx, '平均のずれの最大値', READ_X, 300, { size: 20, color: C.text2, alpha: s.p(3, 0.6) });
        canvasText(ctx, fmt(maxGap(nearest.mean, gp.mean), 3), READ_X, 352, { size: 40, color: C.text, weight: 800, alpha: s.p(3, 0.6) });
      }
      P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 6, color: D.COLOR.data, alpha: a0 });
      legend(ctx, [{ color: D.COLOR.nngp, dash: [8, 6], label: 'ガウス過程回帰（NNGP）' }, { color: D.COLOR.mean, label: '幅 H のネット（最後の層をベイズ推論）' }], BIG.x, BIG.y + BIG.h + 70, { alpha: a0 });
      const a4 = s.p(4, 0.6, 0.3);
      if (a4 > 0) canvasText(ctx, '幅 → ∞ で一致', READ_X, 450, { size: 30, color: C.yellow, weight: 800, alpha: a4 });
    },
  });

  // ---------------------------------------------------------------- 第5章 理論（最後の層だけを学習）
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: CHAPTERS[4],
    beats: [
      beat('次は、ベイズ推論ではなく、ふつうの学習です。二乗誤差を、勾配降下法で小さくします。まず、最後の層の重みだけを学習します。', 10),
      beat(R`このとき出力は重み $\mathbf{v}$ の1次式で、線形回帰と同じです。学習率を小さくして収束まで学習すると、データを通る解のうち、初期値 $\mathbf{v}_0$ に最も近い解に着きます。`, 12),
      beat(R`学習後の関数は、学習前の関数 $f_0$ に、データでのずれを打ち消す修正を足したものです。$K_H$ は、この幅のネットのカーネルです。`, 11),
      beat(R`初期値について期待値をとると、$f_0$ の平均は 0 なので、修正の項だけが残ります。幅が無限なら、ノイズなしのガウス過程回帰の事後平均です。`, 11),
      beat('ばらつきも一致します。分散は事後分散と同じ式で、学習した1つ1つのネットが、事後分布からのサンプルになっています。', 10),
    ],
    build(ui) {
      ui.tex(R`L(\mathbf{v}) = \tfrac{1}{2}\sum_{i=1}^{n}\big(f(x_i) - y_i\big)^2,\qquad f(x) = \boldsymbol\varphi(x)^\top\mathbf{v}`, { x: LEFT_X, y: 124, size: 29 });
      ui.text(R`隠れ層の出力 $\boldsymbol\varphi(x)$ は初期値のまま固定。学習するのは最後の層の重み $\mathbf{v}$ だけ`, { x: LEFT_X, y: 206, w: 900, size: 21, color: C.text2, delay: 0.6 });
      ui.text(R`勾配降下法で収束まで学習 → データを通る解のうち、初期値 $\mathbf{v}_0$ に最も近い解`, { x: LEFT_X, y: 258, w: 900, size: 22, at: 1 });
      ui.tex(R`f_\infty(x) = f_0(x) + K_H(x, X)\,K_H^{-1}\big(\mathbf{y} - f_0(X)\big)`, { x: LEFT_X, y: 328, size: 30, at: 2 });
      ui.text(R`$f_0$ ＝ 学習前の関数、$K_H(x, x') = \boldsymbol\varphi(x)^\top\boldsymbol\varphi(x')$ ＝ 幅 $H$ のカーネル`, { x: LEFT_X, y: 392, size: 21, color: C.text2, at: 2, delay: 0.6 });
      ui.tex(R`\mathbb{E}_{\mathbf{v}_0}\big[f_\infty(x)\big] = K_H(x, X)\,K_H^{-1}\mathbf{y}\ \xrightarrow{\ H \to \infty\ }\ K(x, X)\,K^{-1}\mathbf{y}`, { x: LEFT_X, y: 458, size: 29, at: 3 });
      ui.text(R`＝ ガウス過程回帰の事後平均（$\sigma_n^2 = 0$）`, { x: LEFT_X, y: 528, size: 23, at: 3, delay: 0.6 });
      ui.tex(R`\mathrm{Var}\big[f_\infty(x)\big]\ \to\ K(x, x) - K(x, X)\,K^{-1}K(X, x)`, { x: LEFT_X, y: 594, size: 28, at: 4 });
      ui.text('＝ 事後分散。学習した1つ1つのネットが、事後分布のサンプル', { x: LEFT_X, y: 662, size: 24, weight: 700, color: C.yellow, at: 4, delay: 0.5, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 330, title: '2種類の期待値', at: 3 });
      ui.text('ベイズ推論：事後分布での平均', { x: CARD_X + 24, y: 184, size: 22, at: 3, delay: 0.4 });
      ui.text('ここ：初期値の乱数での平均（多数のネットを学習して平均）', { x: CARD_X + 24, y: 236, w: CARD_W - 48, size: 22, lh: 1.5, at: 3, delay: 0.8 });
      ui.text('意味は違うが、幅が無限なら同じ式になる', { x: CARD_X + 24, y: 340, w: CARD_W - 48, size: 22, weight: 700, color: C.yellow, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（学習の様子）
  const SHOWN_NETS = 40;
  const T_START = 0.01; // 学習の進み ηt（対数で動かす）
  const T_MID = 3;
  const T_END = 3000;
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '最後の層だけを学習したネットの平均',
    beats: [
      beat('幅 1000 のネットを 200 個、別々の乱数で初期化しました。灰色の線は、そのうち 40 個の、学習前の関数です。', 10),
      beat('最後の層だけを学習すると、線はデータ点に向かって動きます。まず大きな形が、次に細かい形が合っていきます。', 10),
      beat(R`黄色の線は 200 個の平均、青の点線は式 $K(x,X)K^{-1}(I - e^{-\eta K t})\mathbf{y}$ です。学習の途中でも、ずっと重なっています。`, 11),
      beat('学習が終わると、線はすべてデータ点を通ります。平均は、ガウス過程回帰の事後平均と一致します。', 9),
      beat('線のばらつき（黄色の細い点線）も、事後分布のプラスマイナス2シグマの帯と重なります。データから離れるほど、ばらつきは大きくなります。', 11),
    ],
    build() {
      const L = D.lastLayer();
      const final = L.nets.map((f) => f(Infinity));
      const mean = D.averageOf(final);
      const sd = mean.map((m, g) => Math.sqrt(final.reduce((acc, line) => acc + (line[g] - m) ** 2, 0) / final.length));
      return { L, finalMean: mean, finalSd: sd, gp: D.gpNoiseFree() };
    },
    draw(ctx, s, state) {
      const { L, gp } = state;
      const P = bigPlot();
      const a0 = s.p(0, 0.6, 0.2);
      const start = s.bt(1) + 0.4;
      const t = s.u < start ? 0 : keyframes(s.u, [[start, T_START], [s.bt(2) - 0.2, T_MID], [s.bt(2) + 0.6, T_MID], [s.bt(3) - 0.2, T_END]], { log: true });
      const lines = L.nets.map((f) => f(t));
      const mean = D.averageOf(lines);
      const formula = L.formula(t);
      ctx.save();
      ctx.globalAlpha = a0;
      bigAxes(ctx, P, 1);
      const a4 = s.p(4, 0.8, 0.3);
      if (a4 > 0) P.band(ctx, GRID, lower(gp.mean, gp.sd), upper(gp.mean, gp.sd), { color: D.COLOR.nngp, alpha: 0.25 * a4 });
      for (let k = 0; k < SHOWN_NETS; k++) P.line(ctx, GRID, lines[k], { color: D.COLOR.net, width: 1.2, alpha: 0.38 });
      ctx.restore();
      const a2 = s.p(2, 0.6, 0.2);
      P.line(ctx, GRID, mean, { color: D.COLOR.mean, width: 4, alpha: a2 });
      P.line(ctx, GRID, formula, { color: D.COLOR.nngp, width: 2.5, dash: [8, 6], alpha: a2 });
      if (a4 > 0) {
        P.line(ctx, GRID, upper(state.finalMean, state.finalSd), { color: D.COLOR.mean, width: 1.8, dash: [3, 5], alpha: a4 });
        P.line(ctx, GRID, lower(state.finalMean, state.finalSd), { color: D.COLOR.mean, width: 1.8, dash: [3, 5], alpha: a4 });
      }
      P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 6, color: D.COLOR.data, alpha: a0 });

      // 右: 学習の進みと、平均と式のずれ
      canvasText(ctx, '学習の進み', READ_X, 220, { size: 20, color: C.text2, alpha: a0 });
      canvasText(ctx, `ηt = ${t < 1 ? fmt(t, 2) : t < 100 ? fmt(t, 1) : fmt(t, 0)}`, READ_X, 268, { size: 34, color: C.text, weight: 800, alpha: a0 });
      canvasText(ctx, '（学習率 × ステップ数）', READ_X, 302, { size: 17, color: C.muted, alpha: a0 });
      if (a2 > 0) {
        canvasText(ctx, '平均と式のずれの最大値', READ_X, 380, { size: 20, color: C.text2, alpha: a2 });
        canvasText(ctx, fmt(maxGap(mean, formula), 3), READ_X, 430, { size: 38, color: C.text, weight: 800, alpha: a2 });
      }
      const items = [{ color: D.COLOR.net, label: `ネット（${SHOWN_NETS} 個を表示）` }];
      if (a2 > 0) items.push({ color: D.COLOR.mean, label: `${L.count} 個の平均` }, { color: D.COLOR.nngp, dash: [8, 6], label: '式（NNGP）' });
      legend(ctx, items, BIG.x, BIG.y + BIG.h + 70, { alpha: a0 });
      if (a4 > 0) legend(ctx, [{ kind: 'band', color: D.COLOR.nngp, label: '事後分布 ±2σ' }, { color: D.COLOR.mean, dash: [3, 5], label: 'ネットの ±2σ' }], READ_X, 520, { alpha: a4, gap: 20 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（全部の層を学習すると NTK）
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: CHAPTERS[5],
    beats: [
      beat('全部の層を学習すると、出力は重みの1次式ではありません。ところが幅が広いと、1つ1つの重みはほとんど動きません。多くの重みが少しずつ動くだけで、出力は十分に変わるからです。', 13),
      beat(R`そこで、初期値のまわりで1次近似します。重み全体を $\boldsymbol\theta$ とすると、ネットは、勾配 $\nabla_{\boldsymbol\theta} f_0(x)$ を特徴量とする線形モデルになります。`, 11),
      beat(R`この線形モデルのカーネルが NTK（ニューラル・タンジェント・カーネル）$\Theta$ です。勾配の内積で、タンジェントは接線という意味です（ジャコほか 2018）。`, 12),
      beat('勾配の内積は、重みを少し動かしたとき、2点の出力がどれだけ同じ向きに動くかを表します。大きいほど、一緒に動きます。', 10),
      beat(R`ReLU の隠れ層1つでは、$\Theta$ は NNGP カーネル $K$ に、内側の重みとしきい値で微分した項を足したものです。`, 10),
    ],
    build(ui) {
      ui.text('全部の層を学習：出力は重みの1次式ではない', { x: LEFT_X, y: 120, size: 23 });
      ui.text('→ しかし幅が広いと、1つ1つの重みはほとんど動かない', { x: LEFT_X, y: 162, size: 23, delay: 0.8 });
      ui.tex(R`f_t(x) \approx f_0(x) + \nabla_{\boldsymbol\theta} f_0(x)^\top\,(\boldsymbol\theta_t - \boldsymbol\theta_0)`, { x: LEFT_X, y: 222, size: 30, at: 1 });
      ui.text(R`初期値のまわりの1次近似 → 勾配 $\nabla_{\boldsymbol\theta} f_0(x)$ を特徴量とする線形モデル`, { x: LEFT_X, y: 282, size: 21, color: C.text2, at: 1, delay: 0.6 });
      ui.tex(R`\Theta(x, x') = \nabla_{\boldsymbol\theta} f(x)^\top\,\nabla_{\boldsymbol\theta} f(x') = \sum_{p} \frac{\partial f(x)}{\partial \theta_p}\,\frac{\partial f(x')}{\partial \theta_p}`, { x: LEFT_X, y: 336, size: 27, at: 2 });
      ui.text('NTK ＝ 勾配の内積。タンジェント ＝ 接線（ジャコほか 2018）', { x: LEFT_X, y: 424, size: 21, color: C.text2, at: 2, delay: 0.6 });
      ui.text(R`重みを少し動かしたとき、$x$ と $x'$ の出力が同じ向きに動くほど大きい`, { x: LEFT_X, y: 472, size: 23, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.tex(R`\Theta(x, x') = \underbrace{K(x, x')}_{\mathbf{v}\ \text{で微分}} + \underbrace{\sigma_v^2\,\big(\sigma_a^2 + \sigma_w^2\,x x'\big)\,\frac{\pi - \psi}{2\pi}}_{w,\ a\ \text{で微分}}`, { x: LEFT_X, y: 546, size: 28, at: 4 });

      ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 300, title: '2つのカーネル', at: 2 });
      ui.table({
        x: CARD_X + 20, y: 180, widths: [96, 170, 194], size: 20, rowH: 54,
        header: ['', R`NNGP $K$`, R`NTK $\Theta$`],
        rows: [
          ['中身', '関数の共分散', '勾配の内積'],
          ['学び方', 'ベイズ・最後の層', '全部の層'],
          ['ばらつき', '事後分散と一致', '事後分布とは別'],
        ],
        at: 2, rowAt: [2, 4, 4], delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（NTK の形）
  // 幅 4000 のネットで、1つの点の誤差だけを使って重みを1回更新し、出力の動きを NTK の式と比べる
  const STEP_WIDTH = 4000;
  const STEP_ETA = 0.001; // 1次近似が成り立つ小さな学習率
  const STEP_POINTS = [0.3, -1.5, 2.1]; // データ点から選ぶ
  const STEP_NET = M.randomNet(STEP_WIDTH, M.makeRandom(606));
  // 更新した点の動きを 1 にそろえる（「その点を 1 動かすと、ほかの x がどれだけ動くか」が読める）
  const STEP_CURVES = STEP_POINTS.map((xi) => {
    const own = M.gradientStepShape(STEP_NET, xi, STEP_ETA, [xi])[0];
    return {
      xi,
      moved: M.gradientStepShape(STEP_NET, xi, STEP_ETA, GRID).map((v) => v / own),
      formula: GRID.map((x) => M.ntk(x, xi) / M.ntk(xi, xi)),
    };
  });
  // ネットごとの NTK Θ_H(x, 0.3)。幅を広げると、乱数によらず式の線に集まる
  const BUNDLE_X = 0.3;
  const BUNDLE_WIDTHS = [10, 100, 4000];
  const BUNDLE_COUNT = 8;
  const BUNDLES = BUNDLE_WIDTHS.map((width, i) => {
    const random = M.makeRandom(6100 + i);
    return Array.from({ length: BUNDLE_COUNT }, () => {
      const net = M.randomNet(width, random);
      return GRID.map((x) => M.empiricalNtk(net, x, BUNDLE_X));
    });
  });
  const BUNDLE_FORMULA = GRID.map((x) => M.ntk(x, BUNDLE_X));
  const percent = (v) => (v >= 0.1 ? `${fmt(v * 100, 0)}%` : `${fmt(v * 100, 1)}%`);
  SCENES.push({
    id: '6A',
    chapter: 6,
    kind: 'visual',
    title: 'NTK は、1回の更新で関数が動く形',
    beats: [
      beat(R`NTK の形を見ます。幅 ${STEP_WIDTH} のネットで、$x = ${STEP_POINTS[0]}$ の点の誤差だけを使い、重みを1回更新しました。黄色は出力の動きで、この点の動きを 1 にそろえています。`, 12),
      beat('オレンジの点線は、NTK の式です。2つはほぼ重なります。NTK は、1回の更新で関数が動く形です。更新した点で尖っています。', 11),
      beat(R`別の点の誤差を使うと、形が変わります。どの点の誤差が、どの $x$ をどれだけ動かすかを、NTK が決めています。`, 10),
      beat('右は、乱数で作ったネットごとの NTK です。幅 10 ではばらばらですが、幅を広げると、大数の法則で、どのネットも式の線に近づきます。', 11),
      beat(`下の表のとおり、幅 ${STEP_WIDTH} では、初期値によるずれも、学習の前後の変化も小さくなります。幅が無限なら、どちらも 0 です。`, 10),
    ],
    build(ui) {
      ui.card({ x: 860, y: 452, w: 650, h: 238, title: '幅と、NTK のずれ・変化', at: 4 });
      ui.table({
        x: 880, y: 496, widths: [120, 240, 240], size: 20, rowH: 37,
        header: ['幅', '初期値によるずれ', '学習の前後の変化'],
        rows: DATA.ntkWidths.map((r) => [String(r.width), percent(r.spread), percent(r.change)]),
        at: 4, rowDelay: 0.3, delay: 0.4,
      });
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 640, h: 470, xr: [M.GRID_MIN, M.GRID_MAX], yr: [-0.5, 2.25] });
      const a0 = s.p(0, 0.6, 0.2);
      P.axes(ctx, { xticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4], yticks: [0, 1, 2], xlabel: 'x', ylabel: '出力の動き（更新した点の動き ＝ 1）', alpha: a0 });
      // 1本目は字幕0、2本目・3本目は字幕2で順に出す。いま見せる線以外は薄くする
      const growth = [s.p(0, 1.8, 1.0), s.p(2, 1.4, 0.3), s.p(2, 1.4, 3.2)];
      const current = s.u >= s.bt(2) + 3.2 ? 2 : s.u >= s.bt(2) + 0.3 ? 1 : 0;
      const formulaFirst = s.p(1, 0.6, 0.3);
      STEP_CURVES.forEach((curve, i) => {
        const grow = growth[i];
        if (grow <= 0) return;
        const dim = i === current ? 1 : 0.28;
        P.line(ctx, GRID, curve.moved, { color: D.COLOR.mean, width: 3.5, upto: grow, alpha: dim });
        P.line(ctx, GRID, curve.formula, { color: D.COLOR.ntk, width: 2.6, dash: [8, 6], upto: grow, alpha: dim * (i === 0 ? formulaFirst : 1) });
        P.vline(ctx, curve.xi, { color: C.text, from: 0, to: 1, alpha: dim * 0.7 });
        P.dots(ctx, [curve.xi], [1], { r: 6, color: D.COLOR.data, alpha: dim * grow });
        P.label(ctx, `x = ${fmt(curve.xi, 1)}`, curve.xi, -0.32, { size: 17, color: C.text2, align: 'center', alpha: dim * grow });
      });
      const kink = s.p(1, 0.6, 3.5) * (1 - s.p(2, 0.4));
      if (kink > 0) P.label(ctx, '更新した点で尖る', STEP_POINTS[0], 1, { dx: -6, dy: -20, size: 19, color: C.text, align: 'center', weight: 700, alpha: kink });
      legend(ctx, [{ color: D.COLOR.mean, label: `1回の更新の動き（幅 ${STEP_WIDTH}）` }, { color: D.COLOR.ntk, dash: [8, 6], label: 'NTK の式' }], P.x, P.y + P.h + 70, { alpha: a0 });

      // 右: ネットごとの NTK（幅を 10 → 100 → 4000 と切りかえる）
      const a3 = s.p(3, 0.6, 0.2);
      if (a3 <= 0) return;
      const Q = new Plot({ x: 880, y: 170, w: 620, h: 220, xr: [M.GRID_MIN, M.GRID_MAX], yr: [0, 8] });
      const start = s.bt(3) + 0.8;
      const stage = keyframes(s.u, [[start + 2.2, 0], [start + 3.0, 1], [start + 5.2, 1], [start + 6.0, 2]]);
      ctx.save();
      ctx.globalAlpha = a3;
      Q.axes(ctx, { xticks: [-4, -2, 0, 2, 4], yticks: [0, 2, 4, 6, 8], xlabel: 'x', ylabel: `Θ(x, ${BUNDLE_X})` });
      BUNDLES.forEach((lines, i) => {
        const alpha = clamp(1 - Math.abs(stage - i));
        if (alpha > 0) lines.forEach((ys) => Q.line(ctx, GRID, ys, { color: D.COLOR.net, width: 1.5, alpha: 0.65 * alpha }));
      });
      Q.line(ctx, GRID, BUNDLE_FORMULA, { color: D.COLOR.ntk, width: 2.6, dash: [8, 6] });
      canvasText(ctx, `幅 H = ${BUNDLE_WIDTHS[Math.round(stage)]}`, Q.x + 14, Q.y + 24, { size: 22, color: C.text, weight: 800 });
      ctx.restore();
      legend(ctx, [{ color: D.COLOR.net, label: `ネット ${BUNDLE_COUNT} 個` }, { color: D.COLOR.ntk, dash: [8, 6], label: 'NTK の式' }], Q.x + 330, Q.y + 18, { alpha: a3, gap: 18, size: 16 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（NTK が学習の動きを決める）
  // 例のデータ6点での NTK の固有値と固有ベクトル（固有値の大きい順。向きは成分の和が 0 以上になるようにそろえる）
  const NTK_EIGEN = (() => {
    const { values, vectors } = M.symmetricEigen(M.DATA_X.map((a) => M.DATA_X.map((b) => M.ntk(a, b))));
    return values
      .map((value, k) => {
        const raw = vectors.map((row) => row[k]);
        const sign = raw.reduce((a, b) => a + b, 0) >= 0 ? 1 : -1;
        const u = raw.map((v) => v * sign);
        return { value, u, changes: u.slice(1).filter((v, i) => v * u[i] < 0).length };
      })
      .sort((a, b) => b.value - a.value);
  })();
  const NTK_RATE_RATIO = NTK_EIGEN[0].value / NTK_EIGEN[NTK_EIGEN.length - 1].value;
  const EIGEN_ROW_Y = 214;
  const EIGEN_ROW_H = 86;
  const SUBSCRIPT = ['₁', '₂', '₃', '₄', '₅', '₆'];
  SCENES.push({
    id: '6B',
    chapter: 6,
    kind: 'theory',
    title: 'NTK が学習の動きを決める',
    beats: [
      beat('勾配降下法の1回の更新は、各データ点の誤差に、その点の勾配を掛けて足した方向です。', 8),
      beat(R`出力の変化は、勾配と重みの変化の内積なので、ここに NTK が現れます。データ点の誤差が、NTK の重みで、ほかの $x$ に伝わります。`, 11),
      beat(R`データ点の出力をまとめると、誤差は指数関数で減ります。NTK の固有値 $\lambda_k$ が大きい方向ほど、速く減ります。`, 10),
      beat(`右は、この例の固有ベクトルです。固有値が小さいほど符号の変化が多く、細かい形です。大きな形を先に学び、細かい形はあとから学びます。速さの差は、最大で約${Math.round(NTK_RATE_RATIO / 5) * 5}倍です。`, 12),
      beat(R`第5章と同じ計算で、初期値についての期待値は $\Theta(x, X)\,\Theta^{-1}\mathbf{y}$。ガウス過程回帰の平均と同じ形で、カーネルだけが NTK に変わります（リーほか 2019）。`, 12),
    ],
    build(ui) {
      ui.tex(R`\Delta\boldsymbol\theta = -\eta \sum_{i=1}^{n} \big(f(x_i) - y_i\big)\,\nabla_{\boldsymbol\theta} f(x_i)`, { x: LEFT_X, y: 118, size: 28 });
      ui.text('1回の更新：誤差 × その点の勾配 を足した方向', { x: LEFT_X, y: 204, size: 21, color: C.text2, delay: 0.6 });
      ui.tex(R`\Delta f(x) \approx \nabla_{\boldsymbol\theta} f(x)^\top \Delta\boldsymbol\theta = -\eta \sum_{i=1}^{n} \Theta(x, x_i)\,\big(f(x_i) - y_i\big)`, { x: LEFT_X, y: 246, size: 27, at: 1 });
      ui.text(R`データ点の誤差が、NTK の重みで $x$ に伝わる`, { x: LEFT_X, y: 332, size: 22, weight: 700, color: C.yellow, at: 1, delay: 0.6, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`f_t(X) - \mathbf{y} = e^{-\eta\,\Theta\,t}\,\big(f_0(X) - \mathbf{y}\big)`, { x: LEFT_X, y: 396, size: 28, at: 2 });
      ui.text(R`固有値 $\lambda_k$ の方向の誤差は $e^{-\eta\lambda_k t}$ で減る → 大きな固有値の方向から学ぶ`, { x: LEFT_X, y: 458, w: 900, size: 22, at: 2, delay: 0.6 });
      ui.text(`大きな形が先、細かい形はあと（速さの差は最大で約${Math.round(NTK_RATE_RATIO / 5) * 5}倍）`, { x: LEFT_X, y: 514, size: 22, at: 3 });
      ui.tex(R`\mathbb{E}_{\boldsymbol\theta_0}\big[f_\infty(x)\big] = \Theta(x, X)\,\Theta^{-1}\mathbf{y}`, { x: LEFT_X, y: 586, size: 30, at: 4 });
      ui.text(R`ガウス過程回帰の平均と同じ形で、カーネルが $K$ → $\Theta$（リーほか 2019）`, { x: LEFT_X, y: 656, size: 23, weight: 700, color: C.yellow, at: 4, delay: 0.5, glow: [{ from: 4 }] });

      seeThrough(ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 612, title: 'この例の NTK（データ6点）の固有ベクトル', at: 2 }));
    },
    draw(ctx, s) {
      const a2 = s.p(2, 0.6, 0.4);
      if (a2 <= 0) return;
      const changesAlpha = s.p(3, 0.6, 0.4);
      ctx.save();
      ctx.globalAlpha = a2;
      canvasText(ctx, '固有値', CARD_X + 28, 198, { size: 17, color: C.muted });
      canvasText(ctx, '固有ベクトル（6点の値）', CARD_X + 156, 198, { size: 17, color: C.muted });
      canvasText(ctx, '符号の変化', CARD_X + 372, 198, { size: 17, color: C.muted, alpha: changesAlpha });
      NTK_EIGEN.forEach((mode, k) => {
        const y = EIGEN_ROW_Y + k * EIGEN_ROW_H;
        const P = new Plot({ x: CARD_X + 156, y: y + 4, w: 190, h: 66, xr: [-0.5, 5.5], yr: [-1, 1] });
        const xs = mode.u.map((_, i) => i);
        canvasText(ctx, `λ${SUBSCRIPT[k]} = ${fmt(mode.value, mode.value < 10 ? 2 : 1)}`, CARD_X + 28, y + 44, { size: 20, color: C.text, weight: 700 });
        P.hline(ctx, 0, { color: C.axis, dash: null, width: 1 });
        P.line(ctx, xs, mode.u, { color: D.COLOR.ntk, width: 2.5 });
        P.dots(ctx, xs, mode.u, { r: 4, color: D.COLOR.ntk, ring: null });
        canvasText(ctx, `${mode.changes} 回`, CARD_X + 372, y + 44, { size: 20, color: C.text, weight: 700, alpha: changesAlpha });
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（全部の層を学習したネット）
  const FULL_RUNS = DATA.full.runs;
  const FULL_LAST = FULL_RUNS[FULL_RUNS.length - 1];
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '全部の層を学習したネットの平均',
    beats: [
      beat(`幅 ${FULL_LAST.width} のネット ${DATA.full.nets} 個を、今度は全部の層について学習しました。灰色の線は、そのうち ${FULL_LAST.lines.length} 個です。`, 10),
      beat(R`黄色は ${DATA.full.nets} 個の平均、オレンジの点線は NTK の式 $\Theta(x, X)\,\Theta^{-1}\mathbf{y}$ です。平均は、データの外側まで、この式に沿っています。`, 11),
      beat(R`青の点線は、NNGP の式 $K(x, X)\,K^{-1}\mathbf{y}$ です。データの間ではほぼ同じですが、外側では大きく離れます。カーネルが違うからです。`, 11),
      beat(`右の表は、平均と式のずれです。幅を ${FULL_RUNS[0].width} から ${FULL_LAST.width} に広げると、NTK の式とのずれは約半分になります。NNGP の式とは、離れたままです。`, 11),
    ],
    build(ui) {
      ui.card({ x: 1140, y: 150, w: 400, h: 250, title: '平均と式のずれ（最大値）', at: 3 });
      ui.table({
        x: 1155, y: 200, widths: [130, 120, 120], size: 19, rowH: 52,
        header: ['', 'NTK の式', 'NNGP の式'],
        rows: FULL_RUNS.map((r) => [`幅 ${r.width}`, fmt(r.gapNtk, 2), fmt(r.gapNngp, 2)]),
        at: 3, rowDelay: 0.6, delay: 0.4,
      });
      return { ntk: D.ntkMean(), gp: D.gpNoiseFree().mean };
    },
    draw(ctx, s, state) {
      const P = bigPlot();
      const a0 = s.p(0, 0.6, 0.2);
      ctx.save();
      ctx.globalAlpha = a0;
      bigAxes(ctx, P, 1);
      shadeOutside(ctx, P, s.p(2, 0.6));
      FULL_LAST.lines.forEach((line) => P.line(ctx, GRID, line, { color: D.COLOR.net, width: 1.2, alpha: 0.38 }));
      ctx.restore();
      const a1 = s.p(1, 0.6, 0.2);
      P.line(ctx, GRID, FULL_LAST.mean, { color: D.COLOR.mean, width: 4, alpha: a1 });
      P.line(ctx, GRID, state.ntk, { color: D.COLOR.ntk, width: 2.8, dash: [8, 6], alpha: a1, upto: s.p(1, 1.6, 0.8) });
      const a2 = s.p(2, 0.6, 0.2);
      P.line(ctx, GRID, state.gp, { color: D.COLOR.nngp, width: 2.8, dash: [8, 6], alpha: a2, upto: s.p(2, 1.6, 0.3) });
      P.dots(ctx, M.DATA_X, M.DATA_Y, { r: 6, color: D.COLOR.data, alpha: a0 });
      if (a2 > 0) {
        P.label(ctx, 'データの外側', -3.2, 3.15, { size: 18, color: C.muted, align: 'center', alpha: a2 });
        P.label(ctx, 'データの外側', 3.05, 3.15, { size: 18, color: C.muted, align: 'center', alpha: a2 });
      }
      const items = [{ color: D.COLOR.net, label: `ネット（${FULL_LAST.lines.length} 個を表示）` }];
      if (a1 > 0) items.push({ color: D.COLOR.mean, label: `${DATA.full.nets} 個の平均` }, { color: D.COLOR.ntk, dash: [8, 6], label: 'NTK の式' });
      if (a2 > 0) items.push({ color: D.COLOR.nngp, dash: [8, 6], label: 'NNGP の式' });
      legend(ctx, items, BIG.x, BIG.y + BIG.h + 70, { alpha: a0, gap: 26 });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（一致する条件と限界）
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: CHAPTERS[6],
    beats: [
      beat('まとめると、学習したネットの期待値が一致する条件は、次の5つです。', 9),
      beat('一致する式は、学び方で変わります。ベイズ推論と、最後の層だけの学習は NNGP、全部の層の学習は NTK のカーネルです。', 10),
      beat(R`限界の1つ目。有限の幅では、ずれが残ります。ずれは、およそ $1/\sqrt{H}$ の速さで小さくなります。`, 9),
      beat('2つ目。幅が無限の極限では、内側の重みが動かず、データに合わせて特徴量を学ぶことがありません。実際のネットの強みは、この特徴の学習にあると考えられています。', 12),
      beat(R`3つ目。出力に $1/H$ を掛ける平均場のスケールや、大きな学習率、交差エントロピーの損失などでは、この式は、そのままでは成り立ちません。`, 11),
    ],
    build(ui) {
      ui.text('期待値が一致する条件', { x: LEFT_X, y: 120, size: 25, weight: 700 });
      const conditions = [
        R`① 幅 $H \to \infty$`,
        R`② 初期値：独立な正規分布、出力に $1/\sqrt{H}$`,
        '③ 損失：二乗誤差',
        '④ 勾配降下法：学習率が小さい、収束まで',
        '⑤ 期待値：初期値の乱数についての平均',
      ];
      conditions.forEach((text, i) => ui.text(text, { x: LEFT_X + 10, y: 170 + i * 50, size: 23, delay: 0.4 + 0.3 * i }));

      ui.card({ x: 900, y: 120, w: 610, h: 300, title: '学び方と、一致する式', at: 1 });
      ui.table({
        x: 920, y: 170, widths: [200, 370], aligns: ['left', 'left'], size: 21, rowH: 56,
        header: ['学び方', '期待値（予測の平均）'],
        rows: [
          ['ベイズ推論', R`$K(x, X)\,(K + \sigma_n^2 I)^{-1}\mathbf{y}$`],
          ['最後の層だけ学習', R`$K(x, X)\,K^{-1}\mathbf{y}$`],
          ['全部の層を学習', R`$\Theta(x, X)\,\Theta^{-1}\mathbf{y}$`],
        ],
        at: 1, rowDelay: 0.5, delay: 0.5,
      });

      ui.text('限界', { x: LEFT_X, y: 470, size: 25, weight: 700, color: C.red, at: 2 });
      ui.text(R`1. 有限の幅では、ずれが残る（およそ $1/\sqrt{H}$ で小さくなる）`, { x: LEFT_X + 10, y: 520, w: 1400, size: 23, at: 2, delay: 0.3 });
      ui.text('2. 無限の幅では内側の重みが動かない → 特徴を学習しない（実際のネットの強みは特徴の学習）', { x: LEFT_X + 10, y: 580, w: 1400, size: 23, at: 3 });
      ui.text(R`3. 平均場のスケール（出力に $1/H$）、大きな学習率、交差エントロピーなどでは、この式のままでは成り立たない`, { x: LEFT_X + 10, y: 640, w: 1400, size: 23, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（幅とずれ、幅と重みの動き）
  const LOG_XR = [5, 20000];
  const log10 = (v) => Math.log10(v);
  // 縦軸も対数にするため、値の log10 を線形の軸に描く
  function logPlot(ctx, P, points, valueOf, { color, alpha, label, fmtTick }) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    P.axes(ctx, { xticks: [10, 100, 1000, 10000], yticks: [-2, -1, 0], fmtX: (v) => String(v), fmtY: fmtTick, xlabel: '幅 H' });
    const xs = points.map((p) => p.width);
    const ys = points.map((p) => log10(valueOf(p)));
    // 傾き −1/2 の参考線（幅 1000 の点を通る）
    const anchor = points.find((p) => p.width === 1000);
    const refXs = [LOG_XR[0], LOG_XR[1]];
    P.line(ctx, refXs, refXs.map((x) => log10(valueOf(anchor)) - 0.5 * (log10(x) - 3)), { color: C.text, width: 1.8, dash: [6, 6], alpha: 0.7 });
    P.line(ctx, xs, ys, { color, width: 3 });
    P.dots(ctx, xs, ys, { color, r: 7 });
    canvasText(ctx, label, P.x, P.y - 16, { size: 20, color: C.text, weight: 700 });
    ctx.restore();
  }
  const LAZY_1000 = DATA.lazy.find((p) => p.width === 1000);
  const GAP_100 = DATA.gaps.find((p) => p.width === 100);
  const GAP_10000 = DATA.gaps.find((p) => p.width === 10000);
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '幅とずれ、幅と重みの動き',
    beats: [
      beat(R`左は、幅と、第4章の事後平均のずれです。幅 100 で ${fmt(GAP_100.gap, 2)}、幅 10000 で ${fmt(GAP_10000.gap, 3)}。点線の傾き、$1/\sqrt{H}$ に沿って小さくなります。`, 11),
      beat('右は、全部の層を学習したとき、内側の重みが初期値から動いた割合です。こちらも、ほぼ同じ傾きで小さくなります。', 10),
      beat(`幅 1000 では、学習しても、内側の重みは ${fmt(LAZY_1000.change * 100, 1)}% しか動きません。ネットは、初期値のまわりの線形モデルとして学習しています。`, 10),
      beat('幅が狭いほど重みは大きく動き、ネットは特徴を学びます。ガウス過程回帰は、その手前の「広いネットの平均」を表す、理論のモデルです。', 11),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const left = new Plot({ x: 140, y: 190, w: 600, h: 440, xr: LOG_XR, yr: [-2.2, 0.2], logx: true });
      const right = new Plot({ x: 900, y: 190, w: 600, h: 440, xr: LOG_XR, yr: [-2.2, 0.2], logx: true });
      logPlot(ctx, left, DATA.gaps, (p) => p.gap, { color: D.COLOR.nngp, alpha: s.p(0, 0.6, 0.2), label: '事後平均のずれ（第4章）', fmtTick: (v) => ['0.01', '0.1', '1'][v + 2] });
      const a1 = s.p(1, 0.6, 0.2);
      if (a1 > 0) logPlot(ctx, right, DATA.lazy, (p) => p.change, { color: D.COLOR.ntk, alpha: a1, label: '内側の重みが動いた割合（全部の層を学習）', fmtTick: (v) => ['1%', '10%', '100%'][v + 2] });
      const a2 = s.p(2, 0.6, 0.3);
      if (a2 > 0) {
        right.vline(ctx, 1000, { color: C.yellow, alpha: a2 });
        right.label(ctx, `幅 1000 で ${fmt(LAZY_1000.change * 100, 1)}%`, 1000, log10(LAZY_1000.change), { dx: 14, dy: -14, size: 21, color: C.yellow, weight: 700, alpha: a2 });
      }
      legend(ctx, [{ color: C.text, dash: [6, 6], label: R`傾き −1/2（1/√H）` }], 140, 720, { alpha: s.p(0, 0.6, 0.6) });
      const a3 = s.p(3, 0.6, 0.3);
      if (a3 > 0) {
        canvasText(ctx, '狭い：重みが動く（特徴を学ぶ）', 900, 700, { size: 21, color: C.text, alpha: a3 });
        canvasText(ctx, '広い：ほぼ線形モデル（ガウス過程回帰の式）', 900, 734, { size: 21, color: C.text, alpha: a3 });
      }
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '8',
    chapter: 8,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。重みを乱数で決めたネットは、幅を無限に広げると、中心極限定理でガウス過程になります。カーネルは、ネットの形で決まります。', 11),
      beat('無限に広いネットのベイズ推論は、ガウス過程回帰そのもの。勾配降下法で学習したネットも、初期値について平均すると、カーネル回帰の式と一致します。', 12),
      beat('一致には、幅が無限、二乗誤差、小さな学習率などの条件があります。幅が有限のネットは特徴を学ぶため、ずれが生まれます。', 10),
    ],
    build(ui) {
      const points = [
        [0, R`重みを乱数で決めたネットは、幅 $H \to \infty$ でガウス過程になる（中心極限定理、ニール 1996）`],
        [0, 'カーネルはネットの形で決まる（ReLU はアークコサイン・カーネル、深いネットは層ごとに順に計算）'],
        [1, 'ベイズ推論：事後分布 ＝ NNGP カーネルのガウス過程回帰（期待値も分散も一致）'],
        [1, '勾配降下法：初期値で平均した予測 ＝ カーネル回帰の式（最後の層だけ → NNGP、全部の層 → NTK ＝ 勾配の内積）'],
        [2, R`条件：幅 $\infty$、出力に $1/\sqrt{H}$、二乗誤差、小さな学習率、収束まで`],
        [2, R`限界：有限の幅のずれ（およそ $1/\sqrt{H}$）と特徴の学習。ガウス過程回帰は「広いネットの平均」の理論のモデル`],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 120 + i * 60, w: 1420, size: 24, at, delay: (i % 2) * 0.6 }));
      ui.text('参考文献：R. M. Neal, Bayesian Learning for Neural Networks, Springer, 1996 ／ C. K. I. Williams, Computing with infinite networks, NIPS 9 (1997) ／ Y. Cho, L. K. Saul, Kernel methods for deep learning, NIPS 22 (2009) ／ J. Lee et al., Deep neural networks as Gaussian processes, ICLR 2018 ／ A. G. de G. Matthews et al., Gaussian process behaviour in wide deep neural networks, ICLR 2018 ／ A. Jacot, F. Gabriel, C. Hongler, Neural tangent kernel, NeurIPS 2018 ／ J. Lee et al., Wide neural networks of any depth evolve as linear models under gradient descent, NeurIPS 2019 ／ L. Chizat, E. Oyallon, F. Bach, On lazy training in differentiable programming, NeurIPS 2019', {
        x: LEFT_X, y: 500, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 2, delay: 1,
      });
      ui.text('例のデータ（6点）は説明用に式で作ったもの。ネットは乱数（種を固定）で作り、ブラウザと Node.js で計算した', { x: LEFT_X, y: 690, size: 16, color: C.muted, at: 2, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 9,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、ガウス過程回帰とニューラルネットの解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: KIT.W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: KIT.W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('ガウス過程回帰とニューラルネット ― 無限に広いネットと、学習の期待値', { x: 0, y: 490, w: KIT.W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
