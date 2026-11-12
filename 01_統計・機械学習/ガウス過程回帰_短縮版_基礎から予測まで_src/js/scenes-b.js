// scenes-b.js — 第5〜7章（予測の式、ノイズとハイパーパラメータ、実務での注意）、まとめ、おわり。書き方は scenes-a.js と同じ。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, canvasText, keyframes, clamp, legend } = KIT;
  const G = GPM;
  const D = SHORT_DATA;
  const S = SDRAW;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const XS = D.XS;
  const xTicks = [0, 1, 2, 3, 4, 5, 6];
  const BIG = { x: 120, y: 160, w: 960, h: 520 };
  const READ_X = 1170; // 右側の読み取り値の位置

  // ---------------------------------------------------------------- 第5章 理論（予測の式）
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: CHAPTERS[4],
    beats: [
      beat(R`データの出力 $\mathbf{y}$ と、予測したい点の値 $f_*$ を並べると、多変量正規分布です。`, 8),
      beat('第2章の条件づけの式に当てはめると、予測の平均と分散が求まります。', 7),
      beat(R`平均は、$\boldsymbol\alpha = (K + \sigma_n^2 I)^{-1}\mathbf{y}$ を使うと、カーネルの山を重み $\alpha_i$ で足し合わせた形です。`, 10),
      beat('分散は、事前の分散から、データで分かった分を引いたものです。データに近い点ほど、大きく減ります。', 9),
      beat(R`分散の式には $\mathbf{y}$ が入っていません。不確かさは、データの値ではなく、データの位置で決まります。`, 9),
    ],
    build(ui) {
      ui.tex(R`\begin{bmatrix} \mathbf{y} \\ f_* \end{bmatrix} \sim \mathcal{N}\!\left(\mathbf{0},\ \begin{bmatrix} K + \sigma_n^2 I & \mathbf{k}_* \\ \mathbf{k}_*^\top & k(x_*, x_*) \end{bmatrix}\right)`, { x: LEFT_X, y: 120, size: 29 });
      ui.tex(R`\mu_* = \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, { x: LEFT_X, y: 254, size: 30, at: 1 });
      ui.tex(R`\sigma_*^2 = k(x_*, x_*) - \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{k}_*`, { x: LEFT_X, y: 318, size: 30, at: 1, delay: 0.5 });
      ui.tex(R`\mu_*(x) = \sum_{i=1}^{n} \alpha_i\, k(x, x_i),\qquad \boldsymbol\alpha = \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}`, { x: LEFT_X, y: 398, size: 29, at: 2 });
      ui.text('平均 ＝ データ点に置いたカーネルの山の重みつきの和', { x: LEFT_X, y: 488, size: 23, color: C.text2, at: 2, delay: 0.6 });
      ui.text('分散 ＝ 事前の分散 − データで分かった分（データに近いほど小さい）', { x: LEFT_X, y: 548, size: 23, at: 3 });
      ui.text(R`分散に $\mathbf{y}$ は入らない → 不確かさはデータの「位置」で決まる`, { x: LEFT_X, y: 630, size: 26, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 120, w: CARD_W, h: 270, title: '記号', at: 0 });
      ui.table({
        x: CARD_X + 20, y: 168, widths: [130, 330], aligns: ['center', 'left'], size: 20, rowH: 46,
        header: ['', ''],
        rows: [
          [R`$K$`, 'データ点どうしのカーネル行列'],
          [R`$\mathbf{k}_*$`, '予測点とデータ点のカーネル'],
          [R`$\sigma_n^2$`, '観測ノイズの分散'],
        ],
        at: 0, rowDelay: 0.3, delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（データを1点ずつ加える）
  const ADD_ORDER = [3, 0, 5, 1, 6, 2, 4]; // 離れた点から順に加える（帯の縮み方が分かりやすい）
  const PARTIAL = ADD_ORDER.map((_, n) => {
    const idx = ADD_ORDER.slice(0, n + 1);
    const model = G.fit(idx.map((i) => D.DATA_X[i]), idx.map((i) => D.DATA_Y[i]), D.BEST_KERNEL, D.BEST_NOISE_VAR);
    return G.predict(model, XS);
  });
  const PRIOR_PRED = { mean: XS.map(() => 0), sd: XS.map(() => D.BEST.signal) };
  const FULL = PARTIAL[PARTIAL.length - 1];
  const BUMPS = D.DATA_X.map((xi, i) => XS.map((x) => D.BEST_MODEL.alpha[i] * D.BEST_KERNEL(x, xi)));
  const POSTERIOR_SAMPLES = G.posteriorSamples(D.BEST_MODEL, XS, [0, 1, 2].map((i) => G.standardNormals(XS.length, 500 + i)), 1e-8).map((f) => Array.from(f));
  const ADD_INTERVAL = 1.1; // 秒
  const blend = (a, b, k) => ({ mean: a.mean.map((v, i) => v + (b.mean[i] - v) * k), sd: a.sd.map((v, i) => v + (b.sd[i] - v) * k) });
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'データを1点ずつ加える',
    beats: [
      beat('データが1つもないときは、平均は 0、帯は事前の幅のままです。', 7),
      beat('データを1点ずつ加えます。点の近くで帯が縮み、平均が点の方へ引き寄せられます。', 10),
      beat('7点すべてで、予測の平均と帯が決まりました。点線は、データを作った真の関数です。', 8),
      beat(R`平均は、各データ点に置いたカーネルの山を、重み $\alpha_i$ で足したものです。細い線が1つ1つの山、太い線がその和です。`, 11),
      beat('事後分布から関数を引くと、どれもデータの近くを通り、点の間でばらつきます。', 8),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ ...BIG, xr: [0, 6], yr: [-2.5, 2.8] });
      const a0 = s.p(0, 0.6, 0.2);
      P.axes(ctx, { xticks: xTicks, yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      // 何点まで加えたか（連続の値。整数の間は前後の予測を補間）
      const progress = s.u < s.bt(1) + 0.4 ? 0 : clamp((s.u - s.bt(1) - 0.4) / ADD_INTERVAL, 0, ADD_ORDER.length);
      const whole = Math.floor(progress);
      const k = clamp((progress - whole) / 0.5);
      const before = whole === 0 ? PRIOR_PRED : PARTIAL[whole - 1];
      const after = whole >= ADD_ORDER.length ? FULL : PARTIAL[whole];
      const pred = whole >= ADD_ORDER.length ? FULL : blend(before, after, k);
      const bumpsAlpha = s.p(3, 0.6, 0.2) * (1 - s.p(4, 0.6));
      // 山を見せる間は帯だけ薄くし、平均（山の和）の線ははっきり残す
      S.drawPrediction(ctx, P, XS, pred, { alpha: a0, bandAlpha: 0.2 * (1 - 0.75 * bumpsAlpha) });
      if (bumpsAlpha > 0) BUMPS.forEach((ys, i) => P.line(ctx, XS, ys, { color: S.sampleColor(i % 3), width: 1.8, alpha: bumpsAlpha * 0.9 }));
      const a4 = s.p(4, 0.6, 0.3);
      if (a4 > 0) POSTERIOR_SAMPLES.forEach((ys, i) => P.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.2, alpha: a4 }));
      const truthAlpha = s.p(2, 0.6, 0.6) * (1 - bumpsAlpha);
      if (truthAlpha > 0) P.line(ctx, XS, XS.map(D.truth), { color: S.COLOR.truth, width: 2.2, dash: [7, 6], alpha: truthAlpha });
      const shown = Math.min(ADD_ORDER.length, Math.ceil(progress - 1e-9));
      const idx = ADD_ORDER.slice(0, shown);
      S.drawData(ctx, P, idx.map((i) => D.DATA_X[i]), idx.map((i) => D.DATA_Y[i]));
      canvasText(ctx, 'データの数', READ_X, 230, { size: 20, color: C.text2, alpha: a0 });
      canvasText(ctx, `${shown} 点`, READ_X, 280, { size: 40, color: C.text, weight: 800, alpha: a0 });
      const items = [{ color: S.COLOR.mean, label: '予測の平均' }, { kind: 'band', color: S.COLOR.mean, label: '±2σ' }];
      if (truthAlpha > 0) items.push({ color: S.COLOR.truth, dash: [7, 6], label: '真の関数' });
      if (bumpsAlpha > 0) items.push({ color: S.sampleColor(0), width: 1.8, label: 'αᵢ k(x, xᵢ)' });
      if (a4 > 0) items.push({ color: S.sampleColor(1), label: '事後分布から引いた関数' });
      legend(ctx, items, P.x, P.y + P.h + 70, { alpha: a0, gap: 26 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（ノイズとハイパーパラメータ）
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: CHAPTERS[5],
    beats: [
      beat(R`$\sigma_n^2$ は観測のばらつきです。0 にすると、平均はすべての点をちょうど通り、ばらつきまで関数とみなしてしまいます。`, 10),
      beat(R`カーネルの $\sigma_f$ と $\ell$、ノイズの $\sigma_n$ をまとめて、ハイパーパラメータと呼びます。予測の精度を大きく左右します。`, 10),
      beat('標準的な決め方は、周辺尤度の最大化です。周辺尤度は、そのハイパーパラメータで、手元のデータがどれだけ出やすいかを表します。', 10),
      beat('第1項は当てはまりで、データをよく説明するほど大きくなります。第2項は複雑さの罰則で、何でも作れる柔らかいモデルほど小さくなります。', 11),
      beat('2つの釣り合いで、ちょうどよいハイパーパラメータが選ばれます。最大化には、勾配を使う方法がよく使われます。', 9),
    ],
    build(ui) {
      ui.text(R`$\sigma_n^2$ ＝ 観測のばらつき。0 にすると、ばらつきまで関数とみなす`, { x: LEFT_X, y: 124, size: 24 });
      ui.tex(R`\boldsymbol\theta = (\sigma_f,\ \ell,\ \sigma_n)`, { x: LEFT_X, y: 196, size: 30, at: 1 });
      ui.text('ハイパーパラメータ（予測を大きく左右する）', { x: LEFT_X + 300, y: 204, size: 22, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`\log p(\mathbf{y} \mid \boldsymbol\theta) = \underbrace{-\tfrac{1}{2}\,\mathbf{y}^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y}}_{\text{当てはまり}}\ \underbrace{-\ \tfrac{1}{2}\log\big|K + \sigma_n^2 I\big|}_{\text{複雑さの罰則}}\ -\ \tfrac{n}{2}\log 2\pi`, { x: LEFT_X, y: 300, size: 28, at: 2 });
      ui.text('周辺尤度 ＝ そのハイパーパラメータで、手元のデータがどれだけ出やすいか', { x: LEFT_X, y: 428, size: 22, color: C.text2, at: 2, delay: 0.6 });
      ui.text('当てはまり：データをよく説明するほど大きい', { x: LEFT_X + 20, y: 494, size: 23, at: 3 });
      ui.text('複雑さの罰則：何でも作れる柔らかいモデルほど小さい', { x: LEFT_X + 20, y: 540, size: 23, at: 3, delay: 0.5 });
      ui.text('2つの釣り合いで選ぶ（最大化には勾配を使う方法）', { x: LEFT_X, y: 630, size: 26, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 470, w: CARD_W, h: 230, title: 'この例で選ばれた値', at: 4 });
      ui.table({
        x: CARD_X + 20, y: 518, widths: [150, 310], aligns: ['center', 'left'], size: 21, rowH: 44,
        header: ['', ''],
        rows: [
          [R`$\ell$`, fmt(D.BEST.lengthScale, 2)],
          [R`$\sigma_f$`, fmt(D.BEST.signal, 2)],
          [R`$\sigma_n$`, `${fmt(D.BEST.noise, 2)}（真の値 ${fmt(D.NOISE_SD, 2)}）`],
        ],
        at: 4, rowDelay: 0.3, delay: 0.4,
      });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（長さスケールと周辺尤度）
  const SMALL_ELL = 0.2;
  const LARGE_ELL = 3;
  const ELLS = G.linspace(Math.log(0.15), Math.log(3.2), 140).map(Math.exp);
  const LML = ELLS.map((l) => G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR).total);
  const predictWith = (l) => G.predict(G.fit(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR), XS);
  const LML_YR = [-12, -4];
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '長さスケールを周辺尤度で選ぶ',
    beats: [
      beat(`長さスケールが小さすぎると（$\\ell = ${SMALL_ELL}$）、平均は点ごとに山を作り、点の間ですぐ 0 に戻ります。`, 9),
      beat(`大きすぎると（$\\ell = ${LARGE_ELL}$）、平均はゆるやかすぎて、データの山と谷を表せません。`, 8),
      beat(`右は、$\\ell$ を動かしたときの対数周辺尤度です。最大になるのは $\\ell \\approx ${fmt(D.BEST.lengthScale, 2)}$ で、このときの予測が左の図です。`, 10),
      beat('真の関数（点線）の大きな形を、よくとらえています。細かい揺れは7点では分からないので、帯の中に収めています。', 10),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 160, w: 720, h: 520, xr: [0, 6], yr: [-2.5, 2.5] });
      const a0 = s.p(0, 0.6, 0.2);
      const ell = keyframes(s.u, [[s.bt(0), SMALL_ELL], [s.bt(1), SMALL_ELL], [s.bt(1) + 1.6, LARGE_ELL], [s.bt(2), LARGE_ELL], [s.bt(2) + 2.4, D.BEST.lengthScale]], { log: true });
      P.axes(ctx, { xticks: xTicks, yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      S.drawPrediction(ctx, P, XS, predictWith(ell), { alpha: a0 });
      const a3 = s.p(3, 0.6, 0.2);
      if (a3 > 0) P.line(ctx, XS, XS.map(D.truth), { color: S.COLOR.truth, width: 2.2, dash: [7, 6], alpha: a3 });
      S.drawData(ctx, P, D.DATA_X, D.DATA_Y, { alpha: a0 });
      canvasText(ctx, `ℓ = ${fmt(ell, 2)}`, P.x + 16, P.y + 32, { size: 28, color: C.text, weight: 800, alpha: a0 });

      const a2 = s.p(2, 0.6, 0.2);
      if (a2 <= 0) return;
      const Q = new Plot({ x: 960, y: 200, w: 540, h: 400, xr: [ELLS[0], ELLS[ELLS.length - 1]], yr: LML_YR, logx: true });
      ctx.save();
      ctx.globalAlpha = a2;
      Q.axes(ctx, { xticks: [0.2, 0.5, 1, 2, 3], yticks: [-12, -10, -8, -6, -4], fmtX: (v) => String(v), xlabel: '長さスケール ℓ', ylabel: '対数周辺尤度' });
      Q.line(ctx, ELLS, LML, { color: C.blue, width: 3 });
      const current = G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(ell), D.BEST_NOISE_VAR).total;
      Q.vline(ctx, ell, { color: C.text2 });
      Q.dots(ctx, [ell], [clamp(current, LML_YR[0], LML_YR[1])], { r: 7, color: C.yellow, ring: C.bg });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（実務での注意）
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: CHAPTERS[6],
    beats: [
      beat(R`計算の中心は、$n$ 行 $n$ 列の行列のコレスキー分解です。計算量は $n^3$、記憶する量は $n^2$ に比例します。`, 10),
      beat('数千点までは、ふつうのパソコンで計算できます。それより多いときは、代表点を使う近似などを検討します。', 9),
      beat('入力と出力は、平均 0、分散 1 に標準化してから使います。長さスケールや、事前の平均 0 という仮定が合わせやすくなります。', 11),
      beat('データから離れた点では、予測は事前の平均に戻り、帯は事前の幅まで広がります。外挿は得意ではありません。', 10),
      beat('最後に、予測の帯に新しいデータがどれくらい入るかを確かめます。2シグマの帯なら、約95パーセントが入るはずです。', 10),
    ],
    build(ui) {
      const items = [
        [0, R`計算量 $\propto n^3$、記憶 $\propto n^2$（コレスキー分解）`],
        [1, '数千点まではそのまま、それ以上は近似（代表点など）'],
        [2, '入力・出力を標準化（平均 0・分散 1）してから使う'],
        [3, '外挿は苦手：データから離れると、事前の平均と幅に戻る'],
        [4, '帯の確かめ：2σ の帯に、新しいデータの約 95% が入るか'],
      ];
      items.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 136 + i * 104, w: 1400, size: 27, at, glow: [{ from: at, to: at + 1 }] }));
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（外挿と計算量）
  const WIDE = D.XS_WIDE;
  const WIDE_PRED = G.predict(D.BEST_MODEL, WIDE);
  const COST_SIZES = [100, 1000, 10000];
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '外挿と計算量',
    beats: [
      beat(R`データの右側、$x = 6$ より先を見ます。データから離れるほど、平均は 0 に戻り、帯は事前の幅まで広がります。`, 10),
      beat('真の関数は、その先も揺れ続けていますが、予測にはそれを知るすべがありません。帯が広いのは、分からないという正直な答えです。', 11),
      beat('右は、計算量の目安です。データが10倍になると、計算時間は約1000倍になります。', 8),
      beat('1万点なら、100点のときの約100万倍です。大きなデータでは、近似の方法を使います。', 8),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 160, w: 800, h: 520, xr: [0, D.EXTRA_MAX], yr: [-2.5, 2.5] });
      const a0 = s.p(0, 0.6, 0.2);
      P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      P.shade(ctx, D.X_MAX, D.EXTRA_MAX, { color: C.text, alpha: 0.05 * a0 });
      S.drawPrediction(ctx, P, WIDE, WIDE_PRED, { alpha: a0, upto: s.p(0, 2.4, 0.6) });
      P.hline(ctx, 2 * D.BEST.signal, { color: C.muted, alpha: s.p(0, 0.6, 3.0) });
      P.hline(ctx, -2 * D.BEST.signal, { color: C.muted, alpha: s.p(0, 0.6, 3.0) });
      P.label(ctx, '事前の ±2σ', D.EXTRA_MAX, 2 * D.BEST.signal, { dx: -6, dy: -10, size: 17, color: C.text2, align: 'right', alpha: s.p(0, 0.6, 3.0) });
      const a1 = s.p(1, 0.6, 0.2);
      if (a1 > 0) P.line(ctx, WIDE, WIDE.map(D.truth), { color: S.COLOR.truth, width: 2.2, dash: [7, 6], alpha: a1 });
      S.drawData(ctx, P, D.DATA_X, D.DATA_Y, { alpha: a0 });
      P.label(ctx, 'データの外側', 7.5, -2.25, { size: 18, color: C.muted, align: 'center', alpha: a0 });

      // 右: 計算量の目安（100点を1とした n³ の比。縦軸は対数）
      const a2 = s.p(2, 0.6, 0.2);
      if (a2 <= 0) return;
      const Q = new Plot({ x: 1060, y: 200, w: 440, h: 400, xr: [0, 3], yr: [0, 6.6] });
      ctx.save();
      ctx.globalAlpha = a2;
      Q.axes(ctx, { xticks: [], yticks: [0, 3, 6], fmtY: (v) => ['1', '1000', '100万'][v / 3], ylabel: '計算時間の比（100点 ＝ 1）' });
      COST_SIZES.forEach((n, i) => {
        const value = 3 * Math.log10(n / COST_SIZES[0]);
        const grow = i < 2 ? s.p(2, 0.8, 0.4 + 0.4 * i) : s.p(3, 0.8, 0.3);
        if (grow <= 0) return;
        const x0 = Q.sx(i + 0.2);
        const x1 = Q.sx(i + 0.8);
        const top = Q.sy(value * grow);
        ctx.fillStyle = C.blue;
        ctx.globalAlpha = a2 * (0.45 + 0.55 * (i / 2));
        ctx.beginPath();
        ctx.roundRect(x0, top, x1 - x0, Q.sy(0) - top + 0.01, [4, 4, 0, 0]);
        ctx.fill();
        ctx.globalAlpha = a2;
        canvasText(ctx, `${n.toLocaleString('ja-JP')} 点`, (x0 + x1) / 2, Q.y + Q.h + 28, { size: 18, color: C.text2, align: 'center' });
        canvasText(ctx, ['1', '約1000倍', '約100万倍'][i], (x0 + x1) / 2, top - 10, { size: 18, color: C.text, align: 'center', weight: 700, alpha: grow });
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '8',
    chapter: 8,
    kind: 'summary',
    title: 'まとめ',
    beats: [
      beat('まとめです。ガウス過程回帰は、関数そのものに正規分布を置き、カーネルで2点の似ている度合いを決めます。', 9),
      beat('予測は、多変量正規分布の条件づけで求まり、平均と不確かさの帯が式で出ます。', 8),
      beat('ハイパーパラメータは周辺尤度で決め、計算量と外挿に注意して使います。', 8),
    ],
    build(ui) {
      const points = [
        [0, R`ガウス過程：どの点の組でも値は多変量正規分布 $\mathcal{N}(\mathbf{0}, K)$。$K_{ij} = k(x_i, x_j)$`],
        [0, R`カーネル：RBF の $\ell$ は「どれだけ離れると似なくなるか」。Matérn の $\nu$ でなめらかさを選ぶ`],
        [1, R`予測：$\mu_* = \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1}\mathbf{y}$、不確かさはデータの位置で決まる`],
        [1, '予測の平均は、データ点に置いたカーネルの山の重みつきの和'],
        [2, 'ハイパーパラメータ：周辺尤度（当てはまり ＋ 複雑さの罰則）を最大にする'],
        [2, R`実務：計算量 $n^3$、標準化してから使う、外挿は事前に戻る、帯の当たり具合を確かめる`],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${text}`, { x: LEFT_X, y: 128 + i * 62, w: 1420, size: 24, at, delay: (i % 2) * 0.6 }));
      ui.text('参考文献：C. E. Rasmussen, C. K. I. Williams, Gaussian Processes for Machine Learning, MIT Press, 2006 ／ B. Matérn, Spatial Variation, 2nd ed., Springer, 1986 ／ M. L. Stein, Interpolation of Spatial Data: Some Theory for Kriging, Springer, 1999', {
        x: LEFT_X, y: 532, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 2, delay: 1,
      });
      ui.text('例のデータ（7点）は、説明用に式と乱数（種を固定）で作ったものです', { x: LEFT_X, y: 640, size: 16, color: C.muted, at: 2, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 9,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、ガウス過程回帰の短縮版の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('<span class="mincho">おわり</span>', { x: 0, y: 220, w: W, align: 'center', size: 100, weight: 600 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('ガウス過程回帰 ― 短縮版（基礎から予測まで）', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
