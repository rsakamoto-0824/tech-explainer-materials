// scenes-a.js — はじめに、この動画のポイント、第1〜4章（全体像、多変量正規分布、ガウス過程とカーネル、Matérn）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値は手で書かず、gp-math.js・short-data.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, canvasText, keyframes, clamp, legend, roundRect } = KIT;
  const G = GPM;
  const D = SHORT_DATA;
  const S = SDRAW;
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
  const XS = D.XS;
  const xTicks = [0, 1, 2, 3, 4, 5, 6];

  // ---- よく使う計算 ----
  const PRIOR_SAMPLE_COUNT = 5;
  const PRIOR_SAMPLES = S.samples(XS, D.BEST_KERNEL, PRIOR_SAMPLE_COUNT, 100);
  const POSTERIOR = G.predict(D.BEST_MODEL, XS);
  const POSTERIOR_SAMPLES = G.posteriorSamples(D.BEST_MODEL, XS, Array.from({ length: PRIOR_SAMPLE_COUNT }, (_, i) => G.standardNormals(XS.length, 200 + i)), 1e-8).map((f) => Array.from(f));
  const PRIOR_SD = D.BEST.signal;
  const PRIOR_PRED = { mean: XS.map(() => 0), sd: XS.map(() => PRIOR_SD) };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('ガウス過程回帰を、式と図で、基礎から予測まで解説します。もとの解説動画から、カーネルの組み合わせなどの発展的な話を除いた短縮版です。', 10),
      beat('全部で7章です。はじめに、この動画のポイントを4つにまとめます。', 6),
    ],
    build(ui) {
      ui.text('ガウス過程回帰 ― 短縮版', { x: 134, y: 112, size: 24, color: C.theory, weight: 700 });
      ui.text('<span class="mincho">ガウス過程回帰</span>', { x: 128, y: 146, size: 86, weight: 600, delay: 0.2 });
      ui.text('関数に正規分布を置き、データで条件づけて予測する', { x: 134, y: 280, size: 30, color: C.text2, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${title}`, { x: left ? 134 : 830, y: 384 + (left ? i : i - 4) * 56, size: 25, delay: 0.8 + 0.12 * i });
      });
      ui.text('例のデータは説明用に式で作った7点です', { x: 830, y: 572, size: 20, color: C.muted, at: 1, delay: 0.3 });
    },
    draw(ctx, s) {
      // 題名の左の縦の帯
      const a = s.p(0, 0.8, 0.1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = C.theory;
      roundRect(ctx, 100, 118, 8, 200, 4);
      ctx.fill();
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- この動画のポイント
  const POINT_CARDS = [
    { x: 90, y: 124 },
    { x: 810, y: 124 },
    { x: 90, y: 440 },
    { x: 810, y: 440 },
  ];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 296;
  const FIG = { dx: 410, dy: 56, w: 262, h: 210 };
  const LML_ELLS = G.linspace(Math.log(0.15), Math.log(3), 120).map(Math.exp);
  const LML_CURVE = LML_ELLS.map((l) => G.logMarginalLikelihood(D.DATA_X, D.DATA_Y, D.kernelOf(l), D.BEST_NOISE_VAR).total);
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① ガウス過程は、関数そのものに正規分布を置きます。どの点を集めても、値の組は多変量正規分布です。', 9),
      beat('② 2点の値がどれだけ似ているかを、カーネルで決めます。カーネルが、関数のなめらかさや振れ幅を決めます。', 9),
      beat('③ データで条件づけると、予測の平均と不確かさの帯が、式で求まります。データから離れるほど、帯は広がります。', 10),
      beat('④ 長さスケールなどのハイパーパラメータは、周辺尤度を最大にして決めます。', 8),
      beat('この流れを、式と図で順に見ていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 関数に正規分布を置く', 'どの点を集めても、値の組は多変量正規分布。データを見る前の「関数の分布」'],
        ['② カーネル ＝ 似ている度合い', '近い2点ほど値がそろう。カーネルが、なめらかさや振れ幅を決める'],
        ['③ 条件づけて予測する', '予測の平均と不確かさの帯が式で出る。データから離れると帯が広がる'],
        ['④ ハイパーパラメータ', R`長さスケール $\ell$ などは、周辺尤度を最大にして決める`],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: POINT_CARD_W, h: POINT_CARD_H, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 26, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 86, w: 360, size: 21, lh: 1.65, color: C.text2, at: k, delay: 0.3 });
      });
    },
    draw(ctx, s) {
      const fig = (i) => ({ x: POINT_CARDS[i].x + FIG.dx, y: POINT_CARDS[i].y + FIG.dy, w: FIG.w, h: FIG.h });
      const a1 = s.p(1, 0.8, 0.4);
      if (a1 > 0) {
        const P = new Plot({ ...fig(0), xr: [0, 6], yr: [-2.2, 2.2] });
        ctx.save();
        ctx.globalAlpha = a1;
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        PRIOR_SAMPLES.slice(0, 3).forEach((ys, i) => P.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.5, upto: s.p(1, 1.6, 0.6 + 0.3 * i) }));
        ctx.restore();
      }
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const P = new Plot({ ...fig(1), xr: [-3, 3], yr: [-0.05, 1.15] });
        const rs = G.linspace(-3, 3, 121);
        ctx.save();
        ctx.globalAlpha = a2;
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        P.line(ctx, rs, rs.map((r) => Math.exp(-(r * r) / 2)), { color: C.blue, width: 3, upto: s.p(2, 1.4, 0.6) });
        P.label(ctx, 'k(r)', 0, 1.05, { dx: 10, size: 17, color: C.text2 });
        P.label(ctx, '距離 r', 3, 0, { dx: -8, dy: 22, size: 16, color: C.muted, align: 'right' });
        ctx.restore();
      }
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const P = new Plot({ ...fig(2), xr: [0, 6], yr: [-2, 2] });
        ctx.save();
        ctx.globalAlpha = a3;
        S.drawPrediction(ctx, P, XS, POSTERIOR, { upto: s.p(3, 1.6, 0.6), width: 3 });
        S.drawData(ctx, P, D.DATA_X, D.DATA_Y, { r: 5 });
        ctx.restore();
      }
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const P = new Plot({ ...fig(3), xr: [0.15, 3], yr: [-12, -4], logx: true });
        ctx.save();
        ctx.globalAlpha = a4;
        P.line(ctx, LML_ELLS, LML_CURVE, { color: C.blue, width: 3, upto: s.p(4, 1.6, 0.6) });
        P.dots(ctx, [D.BEST.lengthScale], [D.BEST.value], { r: 6, color: C.yellow, alpha: s.p(4, 0.5, 2.2) });
        P.label(ctx, '最大', D.BEST.lengthScale, D.BEST.value, { dy: -14, size: 17, color: C.text, align: 'center', alpha: s.p(4, 0.5, 2.2) });
        P.label(ctx, '長さスケール ℓ', 3, -12, { dx: -4, dy: 22, size: 16, color: C.muted, align: 'right' });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（全体像）
  const STEPS = ['事前分布（第3章）', 'データ（7点）', '条件づけ → 事後分布', '予測の平均と帯（第5章）'];
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: CHAPTERS[0],
    beats: [
      beat('まず全体像です。データを見る前、ガウス過程は、いろいろな形の関数を確率つきで考えます。線は、その中から引いた例です。', 10),
      beat('ここに、7点のデータが入ります。', 5),
      beat('データの近くを通る関数だけが残るように、分布を条件づけます。これが、データを見たあとの事後分布です。', 10),
      beat('残った関数の平均が予測、ばらつきの幅が不確かさです。データの近くでは帯が狭く、離れると広がります。', 10),
    ],
    build(ui) {
      STEPS.forEach((text, i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: 1170, y: 210 + i * 64, w: 380, size: 21, at: i, glow: [{ from: i, to: i + 1 }] }));
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 160, w: 960, h: 520, xr: [0, 6], yr: [-2.5, 2.5] });
      const a0 = s.p(0, 0.6, 0.2);
      P.axes(ctx, { xticks: xTicks, yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a0 });
      const priorAlpha = a0 * (1 - s.p(2, 0.8, 0.2));
      if (priorAlpha > 0) {
        S.drawPrediction(ctx, P, XS, PRIOR_PRED, { color: S.COLOR.prior, alpha: priorAlpha, width: 0, bandAlpha: 0.1 });
        PRIOR_SAMPLES.forEach((ys, i) => P.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.4, alpha: priorAlpha, upto: s.p(0, 1.8, 0.6 + 0.25 * i) }));
      }
      const postAlpha = s.p(2, 0.8, 0.6) * (1 - 0.7 * s.p(3, 0.8, 0.2));
      if (postAlpha > 0) POSTERIOR_SAMPLES.forEach((ys, i) => P.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.4, alpha: postAlpha }));
      const a3 = s.p(3, 0.8, 0.3);
      if (a3 > 0) S.drawPrediction(ctx, P, XS, POSTERIOR, { alpha: a3, upto: s.p(3, 1.4, 0.3) });
      S.drawData(ctx, P, D.DATA_X, D.DATA_Y, { alpha: s.p(1, 0.5, 0.3) });
      const items = [{ color: S.sampleColor(0), label: '引いた関数の例' }];
      if (s.u >= s.bt(1)) items.push({ kind: 'dot', color: S.COLOR.data, label: 'データ' });
      if (a3 > 0) items.push({ color: S.COLOR.mean, label: '予測の平均' }, { kind: 'band', color: S.COLOR.mean, label: '±2σ の帯' });
      legend(ctx, items, P.x, P.y + P.h + 70, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（何を予測するか）
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '関数そのものに確率を置く',
    beats: [
      beat(R`回帰では、入力 $x$ から出力 $y$ を予測します。観測には、ノイズ $\varepsilon$ が乗ります。`, 8),
      beat('多くの方法は、関数の形を決めて、パラメータを推定します。たとえば、直線や多項式です。', 8),
      beat('ガウス過程回帰は、形を決めません。関数そのものに、確率の分布を置きます。', 7),
      beat(R`$m(x)$ は平均の関数で、ふつうは 0 とします。$k(x, x')$ はカーネルで、2点の値の共分散を表します。`, 10),
      beat('データを見たあとの分布、つまり予測は、多変量正規分布の条件づけで求まります。次の章で、その道具を準備します。', 10),
    ],
    build(ui) {
      ui.tex(R`y = f(x) + \varepsilon,\qquad \varepsilon \sim \mathcal{N}(0,\ \sigma_n^2)`, { x: LEFT_X, y: 130, size: 34 });
      ui.text('観測 ＝ 関数の値 ＋ ノイズ', { x: LEFT_X + 520, y: 140, size: 22, color: C.text2, delay: 0.6 });
      ui.text(R`ふつうの回帰：形を決めてパラメータを推定（例 $f(x) = a + bx$）`, { x: LEFT_X, y: 232, size: 24, at: 1 });
      ui.tex(R`f \sim \mathcal{GP}\big(m(x),\ k(x, x')\big)`, { x: LEFT_X, y: 320, size: 38, at: 2 });
      ui.text('ガウス過程回帰：関数そのものに分布を置く', { x: LEFT_X + 480, y: 334, size: 22, color: C.text2, at: 2, delay: 0.6 });
      ui.text(R`$m(x)$：平均の関数（ふつうは 0）`, { x: LEFT_X + 20, y: 430, size: 24, at: 3 });
      ui.text(R`$k(x, x')$：カーネル ＝ $\operatorname{Cov}\big[f(x),\ f(x')\big]$`, { x: LEFT_X + 20, y: 482, size: 24, at: 3, delay: 0.5 });
      ui.text('→ 予測 ＝ 多変量正規分布の条件づけ（第2章・第5章）', { x: LEFT_X, y: 610, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 400, w: CARD_W, h: 300, title: 'この動画の用語', at: 2 });
      ui.table({
        x: CARD_X + 20, y: 450, widths: [190, 270], aligns: ['left', 'left'], size: 19, rowH: 46,
        header: ['用語', '意味'],
        rows: [
          ['事前分布', 'データを見る前の関数の分布'],
          ['事後分布', 'データで条件づけた分布'],
          ['ハイパーパラメータ', 'カーネルの形を決める値'],
        ],
        at: 2, rowDelay: 0.4, delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（多変量正規分布）
  const RHO = 0.8;
  const GIVEN_F1 = 1;
  const COND_MEAN = RHO * GIVEN_F1;
  const COND_VAR = 1 - RHO * RHO;
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: CHAPTERS[1],
    beats: [
      beat(R`2つの値 $f_1, f_2$ がともに正規分布に従い、相関があるとき、平均のベクトルと共分散行列で表します。`, 9),
      beat(R`$\rho$ は相関係数で、−1 から 1 の値です。1 に近いほど、2つの値はそろって動きます。`, 8),
      beat(R`何個の値でも同じ形で、$\mathbf{f} \sim \mathcal{N}(\boldsymbol\mu, \Sigma)$ と書きます。一部だけを取り出しても、正規分布のままです。`, 10),
      beat(R`大事なのは条件づけです。$f_1$ が分かったとき、$f_2$ の分布も正規分布で、平均と分散が式で求まります。`, 10),
      beat(R`たとえば $\rho = ${RHO}$ で $f_1 = ${GIVEN_F1}$ と分かると、$f_2$ の平均は ${fmt(COND_MEAN, 1)}、分散は 1 から ${fmt(COND_VAR, 2)} に減ります。`, 10),
    ],
    build(ui) {
      ui.tex(R`\begin{bmatrix} f_1 \\ f_2 \end{bmatrix} \sim \mathcal{N}\!\left(\begin{bmatrix} \mu_1 \\ \mu_2 \end{bmatrix},\ \begin{bmatrix} \sigma_1^2 & \rho\,\sigma_1\sigma_2 \\ \rho\,\sigma_1\sigma_2 & \sigma_2^2 \end{bmatrix}\right)`, { x: LEFT_X, y: 124, size: 30 });
      ui.text(R`$\rho$：相関係数（$-1 \le \rho \le 1$）。1 に近いほど、そろって動く`, { x: LEFT_X, y: 254, size: 23, at: 1 });
      ui.tex(R`\mathbf{f} \sim \mathcal{N}(\boldsymbol\mu,\ \Sigma)`, { x: LEFT_X, y: 316, size: 32, at: 2 });
      ui.text('一部を取り出しても正規分布（周辺分布）', { x: LEFT_X + 300, y: 324, size: 22, color: C.text2, at: 2, delay: 0.5 });
      ui.tex(R`f_2 \mid f_1 \ \sim\ \mathcal{N}\!\Big(\mu_2 + \rho\,\tfrac{\sigma_2}{\sigma_1}(f_1 - \mu_1),\ \ (1 - \rho^2)\,\sigma_2^2\Big)`, { x: LEFT_X, y: 410, size: 30, at: 3 });
      ui.text('条件づけ：分かった値に合わせて、平均が動き、分散が減る', { x: LEFT_X, y: 484, size: 23, weight: 700, color: C.yellow, at: 3, delay: 0.6, glow: [{ from: 3, to: 4 }] });

      ui.card({ x: CARD_X, y: 400, w: CARD_W, h: 300, title: R`例（$\mu = 0$、$\sigma_1 = \sigma_2 = 1$、$\rho = ${RHO}$）`, at: 4 });
      ui.table({
        x: CARD_X + 20, y: 452, widths: [200, 130, 130], size: 21, rowH: 50,
        header: ['', '平均', '分散'],
        rows: [
          [R`$f_2$（知る前）`, '0', '1'],
          [R`$f_2 \mid f_1 = ${GIVEN_F1}$`, fmt(COND_MEAN, 1), fmt(COND_VAR, 2)],
        ],
        at: 4, rowDelay: 0.5, delay: 0.5,
        glowRows: [null, [{ from: 4 }]],
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（相関と条件づけ）
  const CLOUD_N = 300;
  const Z1 = G.standardNormals(CLOUD_N, 31);
  const Z2 = G.standardNormals(CLOUD_N, 32);
  const SLICE_HALF = 0.15; // f₁ = 1 の帯の半分の幅
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '相関と条件づけを図で見る',
    beats: [
      beat(R`平均 0、分散 1 の2つの値を、300回取り出して打ちました。相関は $\rho = 0$ で、点は丸く広がります。`, 9),
      beat(R`$\rho = 0.8$ にすると、点は右上がりの楕円に集まります。片方が大きいと、もう片方も大きくなりやすい関係です。`, 10),
      beat(R`$\rho$ を負にすると、右下がりになります。`, 6),
      beat(R`$\rho = 0.8$ に戻して、$f_1 = 1$ と分かったとします。縦の帯の中の点だけを見ると、$f_2$ は 0.8 のまわりに集まります。`, 11),
      beat(R`右は $f_2$ の分布です。灰色が知る前、青が知ったあと。平均が 0.8 に動き、幅が狭くなりました。これが、予測の仕組みです。`, 11),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const P = new Plot({ x: 130, y: 160, w: 520, h: 520, xr: [-3.2, 3.2], yr: [-3.2, 3.2] });
      const a0 = s.p(0, 0.6, 0.2);
      const rho = keyframes(s.u, [[s.bt(1), 0], [s.bt(1) + 1.6, RHO], [s.bt(2), RHO], [s.bt(2) + 1.4, -0.6], [s.bt(3), -0.6], [s.bt(3) + 1.4, RHO]]);
      const ys = Array.from(Z1, (z, i) => rho * z + Math.sqrt(1 - rho * rho) * Z2[i]);
      ctx.save();
      ctx.globalAlpha = a0;
      P.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'f₁', ylabel: 'f₂' });
      const sliceAlpha = s.p(3, 0.6, 1.6);
      if (sliceAlpha > 0) {
        ctx.fillStyle = S.tint(C.blue, 0.12 * sliceAlpha);
        ctx.fillRect(P.sx(GIVEN_F1 - SLICE_HALF), P.y, P.sx(GIVEN_F1 + SLICE_HALF) - P.sx(GIVEN_F1 - SLICE_HALF), P.h);
      }
      const inSlice = (i) => Math.abs(Z1[i] - GIVEN_F1) < SLICE_HALF;
      const xsOut = [];
      const ysOut = [];
      const xsIn = [];
      const ysIn = [];
      Array.from(Z1).forEach((x, i) => {
        if (sliceAlpha > 0 && inSlice(i)) {
          xsIn.push(x);
          ysIn.push(ys[i]);
        } else {
          xsOut.push(x);
          ysOut.push(ys[i]);
        }
      });
      P.dots(ctx, xsOut, ysOut, { r: 3.5, color: C.text2, alpha: 1 - 0.6 * sliceAlpha, ring: null });
      P.dots(ctx, xsIn, ysIn, { r: 5, color: C.blue, ring: C.bg });
      ctx.restore();
      S.drawEllipse(ctx, P, [[1, rho], [rho, 1]], { color: C.blue, alpha: a0 * 0.8 });
      canvasText(ctx, `ρ = ${fmt(rho, 2)}`, P.x + 16, P.y + 32, { size: 30, color: C.text, weight: 800, alpha: a0 });

      // 右: f₂ の分布（知る前と知ったあと）
      const a4 = s.p(4, 0.6, 0.2);
      if (a4 <= 0) return;
      const Q = new Plot({ x: 830, y: 200, w: 660, h: 420, xr: [-3.2, 3.2], yr: [0, 0.75] });
      const xs = G.linspace(-3.2, 3.2, 200);
      ctx.save();
      ctx.globalAlpha = a4;
      Q.axes(ctx, { xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 0.2, 0.4, 0.6], fmtY: (v) => fmt(v, 1), xlabel: 'f₂', ylabel: '確率密度' });
      Q.line(ctx, xs, xs.map((x) => S.normalPdf(x, 0, 1)), { color: C.muted, width: 3, dash: [8, 6] });
      Q.line(ctx, xs, xs.map((x) => S.normalPdf(x, COND_MEAN, COND_VAR)), { color: C.blue, width: 3.5, upto: s.p(4, 1.4, 0.6) });
      Q.vline(ctx, COND_MEAN, { color: C.blue, alpha: s.p(4, 0.5, 1.8) });
      ctx.restore();
      legend(ctx, [{ color: C.muted, dash: [8, 6], label: '知る前 N(0, 1)' }, { color: C.blue, label: `f₁ = 1 と知ったあと N(${fmt(COND_MEAN, 1)}, ${fmt(COND_VAR, 2)})` }], Q.x, Q.y + Q.h + 70, { alpha: a4 });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（ガウス過程とカーネル）
  const RBF_TABLE = [0, 1, 2, 3].map((m) => ({ m, k: Math.exp(-(m * m) / 2) }));
  const rLabel = (m) => (m === 0 ? '0' : m === 1 ? R`$\ell$` : R`$${m}\ell$`);
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: CHAPTERS[2],
    beats: [
      beat(R`ガウス過程の定義です。どんな入力の組 $x_1, \dots, x_n$ を選んでも、関数の値の組は多変量正規分布に従います。`, 10),
      beat(R`共分散行列の成分は、カーネルで決めます。$K_{ij} = k(x_i, x_j)$ です。`, 7),
      beat(R`よく使うのが RBF カーネルです。2点の距離 $r = |x - x'|$ が小さいほど、値が大きくなります。`, 9),
      beat(R`$\sigma_f^2$ は関数の振れ幅、長さスケール $\ell$ は、どれだけ離れると似なくなるかを表します。`, 9),
      beat(R`距離が $\ell$ なら相関は ${fmt(RBF_TABLE[1].k, 2)}、$2\ell$ なら ${fmt(RBF_TABLE[2].k, 2)}、$3\ell$ なら ${fmt(RBF_TABLE[3].k, 2)}。近い点ほど、値がそろって動きます。`, 10),
    ],
    build(ui) {
      ui.tex(R`\begin{bmatrix} f(x_1) \\ \vdots \\ f(x_n) \end{bmatrix} \sim \mathcal{N}(\mathbf{0},\ K)`, { x: LEFT_X, y: 120, size: 30 });
      ui.text('どんな点の組でも、値の組は多変量正規分布', { x: LEFT_X + 380, y: 160, size: 22, color: C.text2, delay: 0.6 });
      ui.tex(R`K_{ij} = k(x_i,\ x_j)`, { x: LEFT_X, y: 278, size: 32, at: 1 });
      ui.text('共分散行列の成分をカーネルで決める', { x: LEFT_X + 300, y: 284, size: 22, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`k(x, x') = \sigma_f^2 \exp\!\left(-\frac{r^2}{2\ell^2}\right),\qquad r = |x - x'|`, { x: LEFT_X, y: 372, size: 32, at: 2 });
      ui.text(R`$\sigma_f^2$：振れ幅（$f$ の分散）`, { x: LEFT_X + 20, y: 486, size: 24, at: 3 });
      ui.text(R`$\ell$：長さスケール（どれだけ離れると似なくなるか）`, { x: LEFT_X + 20, y: 536, size: 24, at: 3, delay: 0.5 });
      ui.text('近い点ほど、値がそろって動く → なめらかな関数', { x: LEFT_X, y: 630, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 380, w: CARD_W, h: 320, title: R`RBF カーネルの値（$\sigma_f = 1$）`, at: 4 });
      ui.table({
        x: CARD_X + 20, y: 432, widths: [200, 260], size: 22, rowH: 52,
        header: [R`距離 $r$`, R`$k$（相関）`],
        rows: RBF_TABLE.map((row) => [rLabel(row.m), fmt(row.k, 3)]),
        at: 4, rowDelay: 0.35, delay: 0.4,
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（点から関数へ、長さスケール）
  const NEAR = [1, 1.5];
  const FAR = [1, 4];
  const UNIT_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const pairCov = ([a, b]) => [
    [1, UNIT_KERNEL(a, b)],
    [UNIT_KERNEL(a, b), 1],
  ];
  const pairCloud = ([a, b], seed) => {
    const rho = UNIT_KERNEL(a, b);
    const z1 = G.standardNormals(CLOUD_N, seed);
    const z2 = G.standardNormals(CLOUD_N, seed + 1);
    return { xs: Array.from(z1), ys: Array.from(z1, (z, i) => rho * z + Math.sqrt(1 - rho * rho) * z2[i]), rho };
  };
  const NEAR_CLOUD = pairCloud(NEAR, 41);
  const FAR_CLOUD = pairCloud(FAR, 43);
  const UNIT_SAMPLE = S.samples(XS, UNIT_KERNEL, 1, 300)[0];
  const SHORT_ELL = 0.3;
  const LONG_ELL = 2;
  const SHORT_SAMPLES = S.samples(XS, G.rbf({ variance: 1, lengthScale: SHORT_ELL }), 3, 310);
  const LONG_SAMPLES = S.samples(XS, G.rbf({ variance: 1, lengthScale: LONG_ELL }), 3, 310);
  const pickEvery = (count) => Array.from({ length: count }, (_, i) => Math.round((i * (XS.length - 1)) / (count - 1)));
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '点の組から関数へ',
    beats: [
      beat(`近い2点、$x = ${NEAR[0]}$ と ${NEAR[1]} の値を300回引くと、細い楕円になります。相関は ${fmt(NEAR_CLOUD.rho, 2)} で、ほぼそろって動きます。`, 10),
      beat(`離れた2点、$x = ${FAR[0]}$ と ${FAR[1]} では、ほぼ丸くなります。相関は ${fmt(FAR_CLOUD.rho, 2)} で、ほとんど無関係です。`, 9),
      beat('点を増やします。5点、20点と増やすと、近い点どうしがそろって動くので、つなぐと関数に見えます。', 10),
      beat(R`長さスケールを小さくすると、すぐに似なくなるので、細かく揺れる関数になります（$\ell = ${SHORT_ELL}$）。`, 9),
      beat(R`大きくすると、ゆっくり変わる関数になります（$\ell = ${LONG_ELL}$）。$\ell$ が、関数の性質を決めます。`, 9),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const panels = [
        { cloud: NEAR_CLOUD, pair: NEAR, y: 160, at: 0 },
        { cloud: FAR_CLOUD, pair: FAR, y: 460, at: 1 },
      ];
      panels.forEach(({ cloud, pair, y, at }) => {
        const a = s.p(at, 0.6, 0.2);
        if (a <= 0) return;
        const P = new Plot({ x: 150, y, w: 230, h: 230, xr: [-3, 3], yr: [-3, 3] });
        ctx.save();
        ctx.globalAlpha = a;
        P.axes(ctx, { xticks: [-2, 0, 2], yticks: [-2, 0, 2], xlabel: `f(${pair[0]})`, ylabel: `f(${pair[1]})` });
        P.dots(ctx, cloud.xs, cloud.ys, { r: 2.6, color: C.text2, alpha: 0.65, ring: null });
        ctx.restore();
        S.drawEllipse(ctx, P, pairCov(pair), { color: C.blue, alpha: a });
        canvasText(ctx, `相関 ${fmt(cloud.rho, 2)}`, P.x + P.w + 24, P.y + 40, { size: 24, color: C.text, weight: 800, alpha: a });
        canvasText(ctx, `距離 ${fmt(pair[1] - pair[0], 1)}`, P.x + P.w + 24, P.y + 74, { size: 19, color: C.text2, alpha: a });
      });

      // 右: 点を増やして関数にする → 長さスケールを変える
      const a2 = s.p(2, 0.6, 0.2);
      if (a2 <= 0) return;
      const Q = new Plot({ x: 640, y: 160, w: 860, h: 520, xr: [0, 6], yr: [-3, 3] });
      Q.axes(ctx, { xticks: xTicks, yticks: [-2, -1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha: a2 });
      const stageTime = s.u - s.bt(2);
      const count = stageTime < 2.2 ? 5 : stageTime < 4.4 ? 20 : XS.length;
      const unitAlpha = a2 * (1 - s.p(3, 0.6));
      if (unitAlpha > 0) {
        const idx = pickEvery(count);
        if (count === XS.length) Q.line(ctx, XS, UNIT_SAMPLE, { color: C.orange, width: 3, alpha: unitAlpha });
        else Q.dots(ctx, idx.map((i) => XS[i]), idx.map((i) => UNIT_SAMPLE[i]), { r: count === 5 ? 8 : 6, color: C.orange, alpha: unitAlpha });
        canvasText(ctx, count === XS.length ? '241 点 → 関数' : `${count} 点`, Q.x + 16, Q.y + 30, { size: 26, color: C.text, weight: 800, alpha: unitAlpha });
      }
      const a3 = s.p(3, 0.6, 0.2) * (1 - s.p(4, 0.6));
      if (a3 > 0) {
        SHORT_SAMPLES.forEach((ys, i) => Q.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.6, alpha: a3 }));
        canvasText(ctx, `ℓ = ${SHORT_ELL}`, Q.x + 16, Q.y + 30, { size: 26, color: C.text, weight: 800, alpha: a3 });
      }
      const a4 = s.p(4, 0.6, 0.2);
      if (a4 > 0) {
        LONG_SAMPLES.forEach((ys, i) => Q.line(ctx, XS, ys, { color: S.sampleColor(i), width: 2.6, alpha: a4 }));
        canvasText(ctx, `ℓ = ${LONG_ELL}`, Q.x + 16, Q.y + 30, { size: 26, color: C.text, weight: 800, alpha: a4 });
      }
    },
  });

  // ---------------------------------------------------------------- 第4章 理論（Matérn）
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: CHAPTERS[3],
    beats: [
      beat('RBF は、何回でも微分できる、とてもなめらかな関数を作ります。実際のデータは、もっとガタガタしていることがあります。', 9),
      beat(R`Matérn カーネルは、なめらかさを $\nu$ で調整できます。よく使う $\nu = 1/2,\ 3/2,\ 5/2$ では、式が簡単になります。`, 10),
      beat(R`$\nu$ が大きいほどなめらかで、関数は $\nu$ より小さい回数だけ微分できます。$\nu \to \infty$ で RBF になります。`, 10),
      beat(R`迷ったら $\nu = 3/2$ か $5/2$ から始めるのがふつうです。どれが良いかは、周辺尤度で比べられます。`, 9),
    ],
    build(ui) {
      ui.text('RBF：何回でも微分できる（とてもなめらか）。実際のデータはもっとガタガタなことも', { x: LEFT_X, y: 124, w: 900, size: 23 });
      ui.tex(R`\nu = \tfrac{1}{2}:\quad k = \sigma_f^2\, e^{-r/\ell}`, { x: LEFT_X, y: 214, size: 29, at: 1 });
      ui.tex(R`\nu = \tfrac{3}{2}:\quad k = \sigma_f^2 \Big(1 + \tfrac{\sqrt{3}\,r}{\ell}\Big)\, e^{-\sqrt{3}\,r/\ell}`, { x: LEFT_X, y: 284, size: 29, at: 1, delay: 0.5 });
      ui.tex(R`\nu = \tfrac{5}{2}:\quad k = \sigma_f^2 \Big(1 + \tfrac{\sqrt{5}\,r}{\ell} + \tfrac{5r^2}{3\ell^2}\Big)\, e^{-\sqrt{5}\,r/\ell}`, { x: LEFT_X, y: 360, size: 29, at: 1, delay: 1.0 });
      ui.text(R`$\nu$ が大きいほどなめらか。$\nu \to \infty$ で RBF`, { x: LEFT_X, y: 470, size: 24, at: 2 });
      ui.text(R`迷ったら $\nu = 3/2$ か $5/2$ から（周辺尤度で比べられる）`, { x: LEFT_X, y: 610, size: 27, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3 }] });

      ui.card({ x: CARD_X, y: 360, w: CARD_W, h: 340, title: '微分できる回数', at: 2 });
      ui.table({
        x: CARD_X + 20, y: 412, widths: [160, 300], aligns: ['center', 'left'], size: 21, rowH: 52,
        header: [R`$\nu$`, '関数の性質'],
        rows: [
          [R`$1/2$`, '0回（つながるが角がある）'],
          [R`$3/2$`, '1回'],
          [R`$5/2$`, '2回'],
          [R`$\infty$（RBF）`, '何回でも'],
        ],
        at: 2, rowDelay: 0.35, delay: 0.5,
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（なめらかさの違い）
  const NUS = [0.5, 1.5, 2.5, Infinity];
  const NU_LABEL = ['ν = 1/2', 'ν = 3/2', 'ν = 5/2', 'ν = ∞（RBF）'];
  const NU_SAMPLES = NUS.map((nu) => S.samples(XS, G.matern({ variance: 1, lengthScale: 1, nu }), 2, 400));
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: 'なめらかさの違い',
    beats: [
      beat('同じ乱数で、なめらかさだけを変えた関数です。ニューが2分の1では、細かく折れ曲がります。', 9),
      beat('ニューを2分の3、2分の5と大きくすると、なめらかになります。', 7),
      beat('ニューが無限大、つまり RBF が、いちばんなめらかです。2分の5と RBF の差は、見た目ではわずかです。', 9),
      beat('データがガタガタしていそうなら、小さめのニューを選びます。', 6),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const order = [0, 1, 1, 2];
      NUS.forEach((nu, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const at = order[i];
        const a = s.p(at, 0.6, 0.3 + (i === 2 ? 1.6 : 0));
        if (a <= 0) return;
        const P = new Plot({ x: 120 + col * 720, y: 170 + row * 290, w: 660, h: 220, xr: [0, 6], yr: [-3, 3] });
        ctx.save();
        ctx.globalAlpha = a;
        P.axes(ctx, { xticks: row === 1 ? xTicks : [], yticks: [-2, 0, 2] });
        NU_SAMPLES[i].forEach((ys, k) => P.line(ctx, XS, ys, { color: S.sampleColor(k), width: 2.4 }));
        canvasText(ctx, NU_LABEL[i], P.x + P.w, P.y - 10, { size: 22, color: C.text, weight: 800, align: 'right' });
        ctx.restore();
      });
      const a3 = s.p(3, 0.6, 0.3);
      if (a3 > 0) canvasText(ctx, 'ガタガタ ← 小さい ν ／ 大きい ν → なめらか', 800, 736, { size: 22, color: C.text2, align: 'center', alpha: a3 });
    },
  });
})();
