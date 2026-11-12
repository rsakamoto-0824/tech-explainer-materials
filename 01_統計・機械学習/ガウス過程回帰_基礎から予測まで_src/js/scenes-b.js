// scenes-b.js — 第5〜7章（予測の式、ノイズとハイパーパラメータ、実務での注意）、まとめ、おわり。書き方は scenes-a.js と同じ。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, texNum, canvasText, keyframes, clamp, legend } = KIT;
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

  // ---------------------------------------------------------------- 第5章 理論（データ3点で計算する）
  const EX_X = [1, 2, 4];
  const EX_Y = [0.9, 0.6, -0.7];
  const EX_STAR = 3;
  const EX_NOISE = 0.01;
  const EX_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const EX_MODEL = G.fit(EX_X, EX_Y, EX_KERNEL, EX_NOISE);
  const EX_KY = EX_X.map((a, i) => EX_X.map((b, j) => EX_KERNEL(a, b) + (i === j ? EX_NOISE : 0)));
  const EX_KSTAR = EX_X.map((b) => EX_KERNEL(EX_STAR, b));
  const EX_POINT = G.predict(EX_MODEL, [EX_STAR]);
  const EX_MEAN = EX_POINT.mean[0];
  const EX_VAR = EX_POINT.variance[0];
  const EX_REDUCTION = EX_KERNEL(EX_STAR, EX_STAR) - EX_VAR; // データで分かった分 k*ᵀ(K+σ²I)⁻¹k*
  const EX_XS = G.linspace(0, 5, 201);
  const EX_CURVE = G.predict(EX_MODEL, EX_XS);
  const matrixTex = (rows) => `\\begin{bmatrix} ${rows.map((row) => row.map((v) => texNum(v, 3)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
  const columnTex = (values) => matrixTex(values.map((v) => [v]));
  SCENES.push({
    id: '5T-2',
    chapter: 5,
    kind: 'theory',
    title: 'データ3点で計算してみる',
    beats: [
      beat(R`データ3点で、実際に計算してみます。$x = 1, 2, 4$ の3点から、$x_* = 3$ の値を予測します。カーネルは $\sigma_f = 1$、$\ell = 1$ の RBF、ノイズの分散は 0.01 です。`, 12),
      beat(`まず、データ点どうしのカーネル行列に、ノイズの分散を足します。近い1と2は ${fmt(EX_KERNEL(1, 2), 2)}、遠い1と4は ${fmt(EX_KERNEL(1, 4), 2)} です。`, 10),
      beat(R`次に、重み $\boldsymbol\alpha$ を連立方程式で求めます。実際の計算では、コレスキー分解を使います。`, 8),
      beat(R`予測点とデータ点のカーネル $\mathbf{k}_*$ を作り、$\boldsymbol\alpha$ との内積をとると、予測の平均は ${fmt(EX_MEAN, 2)} です。`, 10),
      beat(`分散は、1 から ${fmt(EX_REDUCTION, 2)} を引いて ${fmt(EX_VAR, 2)}、標準偏差は ${fmt(Math.sqrt(EX_VAR), 2)} です。右の図の $x = 3$ の点が、この平均と帯に当たります。`, 11),
    ],
    build(ui) {
      ui.text(R`データ：$x = 1, 2, 4$、$y = ${EX_Y.map((v) => texNum(v, 1)).join(',\ ')}$　予測する点：$x_* = ${EX_STAR}$`, { x: LEFT_X, y: 118, size: 23 });
      ui.text(R`カーネル：RBF（$\sigma_f = 1,\ \ell = 1$）、ノイズの分散 $\sigma_n^2 = ${EX_NOISE}$`, { x: LEFT_X, y: 160, size: 23, color: C.text2, delay: 0.5 });
      ui.tex(R`K + \sigma_n^2 I = ${matrixTex(EX_KY)}`, { x: LEFT_X, y: 214, size: 27, at: 1 });
      ui.tex(R`\boldsymbol\alpha = \big(K + \sigma_n^2 I\big)^{-1}\mathbf{y} = ${columnTex(Array.from(EX_MODEL.alpha))}`, { x: LEFT_X, y: 340, size: 27, at: 2 });
      ui.tex(R`\mathbf{k}_* = ${columnTex(EX_KSTAR)},\qquad \mu_* = \mathbf{k}_*^\top \boldsymbol\alpha = ${texNum(EX_MEAN, 3)}`, { x: LEFT_X, y: 466, size: 27, at: 3 });
      ui.tex(R`\sigma_*^2 = 1 - \mathbf{k}_*^\top \big(K + \sigma_n^2 I\big)^{-1}\mathbf{k}_* = 1 - ${texNum(EX_REDUCTION, 3)} = ${texNum(EX_VAR, 3)}`, { x: LEFT_X, y: 604, size: 27, at: 4 });
      ui.text(R`標準偏差 $\sigma_* = ${texNum(Math.sqrt(EX_VAR), 3)}$`, { x: LEFT_X, y: 668, size: 23, weight: 700, color: C.yellow, at: 4, delay: 0.6 });
      const card = ui.card({ x: CARD_X, y: 214, w: CARD_W, h: 470, title: 'この3点での予測', at: 0 });
      card.node.style.background = 'transparent';
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.6, 0.4);
      if (a0 <= 0) return;
      const P = new Plot({ x: CARD_X + 60, y: 280, w: CARD_W - 100, h: 330, xr: [0, 5], yr: [-1.8, 1.8] });
      ctx.save();
      ctx.globalAlpha = a0;
      P.axes(ctx, { xticks: [0, 1, 2, 3, 4, 5], yticks: [-1, 0, 1], xlabel: 'x' });
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) S.drawPrediction(ctx, P, EX_XS, EX_CURVE, { alpha: a3, width: 3 });
      P.vline(ctx, EX_STAR, { color: C.yellow, width: 2 });
      const a4 = s.p(4, 0.6, 0.4);
      if (a4 > 0) {
        const sd = Math.sqrt(EX_VAR);
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(P.sx(EX_STAR), P.sy(EX_MEAN - 2 * sd));
        ctx.lineTo(P.sx(EX_STAR), P.sy(EX_MEAN + 2 * sd));
        ctx.stroke();
      }
      if (a3 > 0) P.dots(ctx, [EX_STAR], [EX_MEAN], { r: 7, color: C.yellow, ring: C.bg, alpha: a3 });
      S.drawData(ctx, P, EX_X, EX_Y, { r: 7 });
      P.label(ctx, 'x* = 3', EX_STAR, 1.8, { dy: 18, dx: 8, size: 17, color: C.text2 });
      ctx.restore();
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
  const LML_PARTS = ELLS.map((l) => G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR));
  const LML = LML_PARTS.map((r) => r.total);
  const predictWith = (l) => G.predict(G.fit(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR), XS);
  const LML_YR = [-12, -4];
  const PARTS_YR = [-30, 10];
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
      beat(R`右の図を2つの項に分けました。$\ell$ が小さいと当てはまりは良いのですが罰則が大きく、$\ell$ が大きいと罰則は小さくなるものの、当てはまりが急に悪くなります。`, 12),
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
      const parts = s.p(4, 1.0, 0.3); // 合計だけ → 2つの項
      const current = G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(ell), D.BEST_NOISE_VAR);
      const totalOnly = new Plot({ x: 960, y: 200, w: 540, h: 400, xr: [ELLS[0], ELLS[ELLS.length - 1]], yr: LML_YR, logx: true });
      const withParts = new Plot({ x: 960, y: 200, w: 540, h: 400, xr: [ELLS[0], ELLS[ELLS.length - 1]], yr: PARTS_YR, logx: true });
      const xAxis = { xticks: [0.2, 0.5, 1, 2, 3], fmtX: (v) => String(v), xlabel: '長さスケール ℓ' };
      ctx.save();
      ctx.globalAlpha = a2 * (1 - parts);
      if (1 - parts > 0) {
        totalOnly.axes(ctx, { ...xAxis, yticks: [-12, -10, -8, -6, -4], ylabel: '対数周辺尤度' });
        totalOnly.line(ctx, ELLS, LML, { color: C.blue, width: 3 });
        totalOnly.vline(ctx, ell, { color: C.text2 });
        totalOnly.dots(ctx, [ell], [clamp(current.total, LML_YR[0], LML_YR[1])], { r: 7, color: C.yellow, ring: C.bg });
      }
      ctx.restore();
      if (parts > 0) {
        ctx.save();
        ctx.globalAlpha = a2 * parts;
        withParts.axes(ctx, { ...xAxis, yticks: [-30, -20, -10, 0, 10], ylabel: '対数周辺尤度とその2つの項' });
        withParts.line(ctx, ELLS, LML_PARTS.map((r) => r.dataFit), { color: C.orange, width: 2.6 });
        withParts.line(ctx, ELLS, LML_PARTS.map((r) => r.complexity), { color: C.aqua, width: 2.6 });
        withParts.line(ctx, ELLS, LML, { color: C.blue, width: 3 });
        withParts.vline(ctx, ell, { color: C.text2 });
        ctx.restore();
        legend(ctx, [{ color: C.orange, label: '当てはまり' }, { color: C.aqua, label: '複雑さの罰則' }, { color: C.blue, label: '合計' }], 960, 690, { alpha: a2 * parts, gap: 22 });
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（ノイズの大きさを変える）
  const NOISE_LOW = 0.02;
  const NOISE_HIGH = 0.6;
  const predictWithNoise = (sn) => G.predict(G.fit(D.DATA_X, D.DATA_Y, D.BEST_KERNEL, sn * sn), XS);
  SCENES.push({
    id: '6V-2',
    chapter: 6,
    kind: 'visual',
    title: 'ノイズの大きさを変える',
    beats: [
      beat(`ノイズの大きさを変えてみます。$\\sigma_n = ${NOISE_LOW}$ と小さくすると、平均は、すべての点をほぼちょうど通ります。`, 9),
      beat(`$\\sigma_n = ${NOISE_HIGH}$ と大きくすると、点のずれをノイズとみなすので、平均はなだらかになり、帯も広がります。`, 10),
      beat(`周辺尤度で選んだ $\\sigma_n \\approx ${fmt(D.BEST.noise, 2)}$ は、その中間です。データを作ったノイズ ${fmt(D.NOISE_SD, 2)} に近い値が選ばれています。`, 11),
      beat('測定のばらつきの大きさが分かっているときは、その値を参考に、ノイズの範囲を決めることもできます。', 9),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ ...BIG, xr: [0, 6], yr: [-2.5, 2.5] });
      const a0 = s.p(0, 0.6, 0.2);
      const noise = keyframes(s.u, [[s.bt(0), NOISE_LOW], [s.bt(1), NOISE_LOW], [s.bt(1) + 1.8, NOISE_HIGH], [s.bt(2), NOISE_HIGH], [s.bt(2) + 1.8, D.BEST.noise]], { log: true });
      P.axes(ctx, { xticks: xTicks, yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      S.drawPrediction(ctx, P, XS, predictWithNoise(noise), { alpha: a0 });
      S.drawData(ctx, P, D.DATA_X, D.DATA_Y, { alpha: a0 });
      canvasText(ctx, 'ノイズの標準偏差', READ_X, 230, { size: 20, color: C.text2, alpha: a0 });
      canvasText(ctx, `σn = ${fmt(noise, 2)}`, READ_X, 282, { size: 38, color: C.text, weight: 800, alpha: a0 });
      const lml = G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.BEST_KERNEL, noise * noise).total;
      canvasText(ctx, '対数周辺尤度', READ_X, 360, { size: 20, color: C.text2, alpha: a0 });
      canvasText(ctx, fmt(lml, 2), READ_X, 406, { size: 34, color: C.text, weight: 800, alpha: a0 });
      const a2 = s.p(2, 0.6, 1.8);
      if (a2 > 0) canvasText(ctx, `データを作ったノイズ ${fmt(D.NOISE_SD, 2)}`, READ_X, 470, { size: 20, color: C.text2, alpha: a2 });
      legend(ctx, [{ color: S.COLOR.mean, label: '予測の平均' }, { kind: 'band', color: S.COLOR.mean, label: '±2σ' }, { kind: 'dot', color: S.COLOR.data, label: 'データ' }], P.x, P.y + P.h + 70, { alpha: a0 });
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
      beat(R`入力が複数あるときは、入力ごとに長さスケール $\ell_d$ を持たせます。$\ell_d$ が大きい入力ほど、出力への影響が小さいと読めます。`, 11),
      beat('データから離れた点では、予測は事前の平均に戻り、帯は事前の幅まで広がります。外挿は得意ではありません。', 10),
    ],
    build(ui) {
      const items = [
        [0, 130, R`計算量 $\propto n^3$、記憶 $\propto n^2$（コレスキー分解）`],
        [1, 230, '数千点まではそのまま、それ以上は近似（代表点など）'],
        [2, 330, R`入力が複数：入力ごとの長さスケール $\ell_d$（大きいほど影響が小さい）`],
        [3, 560, '外挿は苦手：データから離れると、事前の平均と幅に戻る'],
      ];
      items.forEach(([at, y, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y, w: 1400, size: 27, at, glow: [{ from: at, to: at + 1 }] }));
      ui.tex(R`k(\mathbf{x}, \mathbf{x}') = \sigma_f^2 \exp\!\left(-\sum_{d=1}^{D} \frac{(x_d - x'_d)^2}{2\ell_d^2}\right)`, { x: LEFT_X + 70, y: 400, size: 30, at: 2, delay: 0.6 });
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

  // ---------------------------------------------------------------- 第7章 理論（使い方の手順）
  const STEPS = [
    ['標準化する', '入力と出力を、平均 0・分散 1 にそろえる'],
    ['カーネルを選ぶ', R`迷ったら Matérn の $\nu = 5/2$ か RBF から`],
    ['ハイパーパラメータを決める', '周辺尤度を最大化。初期値を変えて何回か試す'],
    ['予測する', '平均だけでなく帯も見る。帯が広い場所はデータを足す候補'],
    ['確かめる', R`学習に使っていないデータで、2σ の帯に約 95% が入るか`],
  ];
  SCENES.push({
    id: '7T-2',
    chapter: 7,
    kind: 'theory',
    title: '実務での使い方の手順',
    beats: [
      beat('実務で使うときの手順をまとめます。まず、入力と出力を、平均 0、分散 1 に標準化します。', 9),
      beat(R`次に、カーネルを選びます。迷ったら、Matérn の $\nu = 5/2$ か、RBF から始めます。`, 8),
      beat('ハイパーパラメータは、周辺尤度の最大化で決めます。山が複数あることがあるので、初期値を変えて何回か試します。', 10),
      beat('予測では、平均だけでなく帯も見ます。帯が広い場所は、データを足すと効果が大きい場所です。', 9),
      beat('最後に、学習に使っていないデータで、予測と帯の当たり具合を確かめます。MATLAB の fitrgp や、Python の scikit-learn に、同じ計算が用意されています。', 12),
    ],
    build(ui) {
      STEPS.forEach(([title, body], i) => {
        const y = 124 + i * 114;
        ui.card({ x: LEFT_X, y, w: 860, h: 96, at: i, glow: [{ from: i, to: i + 1 }] });
        ui.text(`<span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${title}`, { x: LEFT_X + 24, y: y + 14, size: 25, weight: 700, at: i });
        ui.text(body, { x: LEFT_X + 100, y: y + 54, w: 740, size: 20, color: C.text2, at: i, delay: 0.3 });
      });
      ui.card({ x: CARD_X, y: 124, w: CARD_W, h: 300, title: '計算できるツールの例', at: 4 });
      ui.text('MATLAB：fitrgp<br><span style="color:#8a857a;font-size:18px">Statistics and Machine Learning Toolbox</span>', { x: CARD_X + 28, y: 182, size: 23, lh: 1.5, at: 4, delay: 0.4 });
      ui.text('Python：scikit-learn の<br>GaussianProcessRegressor', { x: CARD_X + 28, y: 300, size: 23, lh: 1.5, at: 4, delay: 0.8 });
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
      beat('ハイパーパラメータは周辺尤度で決め、手順に沿って、計算量と外挿に注意しながら使います。', 9),
    ],
    build(ui) {
      const points = [
        [0, R`ガウス過程：どの点の組でも値は多変量正規分布 $\mathcal{N}(\mathbf{0}, K)$。$K_{ij} = k(x_i, x_j)$`],
        [0, R`カーネル：RBF の $\ell$ は「どれだけ離れると似なくなるか」。Matérn の $\nu$ でなめらかさを選ぶ`],
        [1, R`予測：$\mu_* = \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1}\mathbf{y}$、不確かさはデータの位置で決まる`],
        [1, '予測の平均は、データ点に置いたカーネルの山の重みつきの和'],
        [2, 'ハイパーパラメータ：周辺尤度（当てはまり ＋ 複雑さの罰則）を最大にする'],
        [2, R`実務：標準化 → カーネル選び → 周辺尤度 → 予測と帯 → 確かめる。計算量 $n^3$ と外挿に注意`],
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
    beats: [beat('これで、ガウス過程回帰の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('<span class="mincho">おわり</span>', { x: 0, y: 220, w: W, align: 'center', size: 100, weight: 600 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('ガウス過程回帰 ― 基礎から予測まで', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
