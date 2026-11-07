// scenes-model.js — はじめに、この動画のポイント、第1〜4章（2つのモデル、カーネルの和と積、定義、計算の工夫）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値は手で書かず、add-math.js で計算した値か add-data.js の値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, texNum, canvasText, lerp, legend, roundRect, rgba, seqColor } = KIT;
  const M = ADDM;
  const D = ADDDRAW;
  const V3 = VIEW3D;
  const DATA = window.ADDDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;

  const linspace = (a, b, count) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  // 字幕の境目で、前の状態から今の状態へなめらかに移す
  const stateAt = (s, states, duration = 1.2) => {
    const b = Math.max(0, Math.min(s.beat, states.length - 1));
    const k = s.p(b, duration);
    return states[b].map((v, i) => lerp(states[Math.max(0, b - 1)][i], v, k));
  };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('論文 Additive Gaussian Processes を、式と図を使って解説します。', 7),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('全部で8章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('加法ガウス過程', { x: 0, y: 84, w: W, align: 'center', size: 72, weight: 800 });
      ui.text('1次の和から全変数の積まで、すべての交互作用を1つのカーネルに入れる', { x: 0, y: 192, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      ui.text('D. Duvenaud, H. Nickisch, C. E. Rasmussen, “Additive Gaussian Processes,” NIPS 24 (2011) ／ arXiv:1112.4394', { x: 0, y: 246, w: W, align: 'center', size: 20, color: C.muted, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, { x: left ? 130 : 830, y: 312 + (left ? i : i - 4) * 52, size: 24, delay: 0.6 + 0.12 * i });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 130, y: 550, size: 24, at: 1 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>図で見る`, { x: 130, y: 598, size: 24, at: 1, delay: 0.2 });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 830, y: 550, size: 24, at: 2 });
      ui.text('図は論文の図を自分で計算し直したものです。数値の出どころ（論文の表か、この動画の計算か）は画面に書きます', { x: 830, y: 600, w: 680, size: 20, color: C.muted, at: 2, delay: 0.4, lh: 1.5 });
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
  const FIG = { dx: 420, dy: 56, w: 252, h: 216 };
  const POINT_WEIGHTS = [0.3, 1, 0.55, 0.12];
  const POINT_SHARES = [0.706, 0.133, 0.138, 0.023, 0, 0, 0, 0]; // 論文の表1の concrete
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① 加法カーネルは、1次の和から全変数の積まで、すべての次数の交互作用を持ちます。GAM と SE カーネルは、その両端の特別な場合です。', 11),
      beat('② 項の数は次元に対して指数で増えますが、ニュートン・ジラールの公式を使うと、次元の2乗の計算で足し上げられます。', 10),
      beat('③ 次数ごとの分散は、周辺尤度で学習できます。どの次数の交互作用が効いているかを、データから読み取れます。', 10),
      beat('④ 低次の構造があれば、データから遠い点でも予測できます。実データでは、どのデータでも有意に負けず、コンクリートでは単独で最良でした。', 11),
      beat('この4つを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 全次数を1つのカーネルに', R`$k = \sum_{n=1}^{D} \sigma_n^2\, e_n(z_1,\ldots,z_D)$<br>GAM（1次だけ）と SE（$D$次だけ）は両端の特別な場合`],
        ['② 指数個の項を $D^2$ の計算で', R`項の数は $2^D - 1$。ニュートン・ジラールの公式で、列挙せずに足し上げる`],
        ['③ 次数の分散を学習する', R`$\sigma_n^2$ を周辺尤度で学習。どの次数が効くかを読める（解釈しやすい）`],
        ['④ 遠くの点まで予測できる', '低次の構造があれば、データのない組み合わせも予測できる。実データでも他の手法に有意に負けない'],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: POINT_CARD_W, h: POINT_CARD_H, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 26, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 86, w: 372, size: 21, lh: 1.65, color: C.text2, at: k, delay: 0.3 });
      });
      const L = DATA.lshape;
      const n = L.axis.length;
      return {
        lattice: D.latticeLayout(4, { x: POINT_CARDS[0].x + FIG.dx, y: POINT_CARDS[0].y + FIG.dy + 16, w: FIG.w, h: FIG.h - 32 }),
        seImage: D.divergingImage(L.se, n, 2.2),
        addImage: D.divergingImage(L.additive, n, 2.2),
        growth: linspace(2, 30, 28),
      };
    },
    draw(ctx, s, st) {
      const beatIndex = s.beat;
      if (beatIndex >= 1) D.drawLattice(ctx, st.lattice, POINT_WEIGHTS, { radius: 11, labels: false, alpha: s.p(1, 0.8, 0.3) });
      if (beatIndex >= 2) {
        const p = POINT_CARDS[1];
        const plot = new Plot({ x: p.x + FIG.dx + 16, y: p.y + FIG.dy + 6, w: FIG.w - 24, h: FIG.h - 46, xr: [2, 30], yr: [0, 11] });
        const alpha = s.p(2, 0.8, 0.3);
        plot.axes(ctx, { xticks: [10, 20, 30], xlabel: '次元 D', alpha });
        plot.line(ctx, st.growth, st.growth.map((d) => Math.log10(M.enumerationOperations(d))), { color: C.red, alpha, upto: s.p(2, 1.4, 0.3) });
        plot.line(ctx, st.growth, st.growth.map((d) => Math.log10(M.newtonGirardOperations(d))), { color: C.aqua, alpha, upto: s.p(2, 1.4, 0.3) });
        plot.label(ctx, '全部列挙', 23, 9.8, { size: 15, color: C.text2, alpha, align: 'right' });
        plot.label(ctx, '公式', 30, 3.9, { size: 15, color: C.text2, alpha, align: 'right' });
      }
      if (beatIndex >= 3) {
        const p = POINT_CARDS[2];
        const box = { x: p.x + FIG.dx + 6, y: p.y + FIG.dy + 10, w: FIG.w - 12, h: FIG.h - 44 };
        D.orderBars(ctx, box, POINT_SHARES.map((v) => v * s.p(3, 1, 0.3)), { alpha: s.p(3, 0.6, 0.3), showValues: false, labelSize: 14 });
      }
      if (beatIndex >= 4) {
        const p = POINT_CARDS[3];
        const size = 118;
        const alpha = s.p(4, 0.8, 0.3);
        D.heatPanel(ctx, st.seImage, { x: p.x + FIG.dx - 8, y: p.y + FIG.dy + 30, w: size, h: size }, { alpha });
        D.heatPanel(ctx, st.addImage, { x: p.x + FIG.dx + 134, y: p.y + FIG.dy + 30, w: size, h: size }, { alpha });
        canvasText(ctx, 'SE', p.x + FIG.dx + 51, p.y + FIG.dy + 18, { size: 16, align: 'center', alpha });
        canvasText(ctx, '加法', p.x + FIG.dx + 193, p.y + FIG.dy + 18, { size: 16, align: 'center', alpha });
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: 'GAM と SE カーネル',
    beats: [
      beat('回帰でよく使われるモデルの1つが、一般化加法モデル（GAM）です。1変数の関数の和なので、当てはめやすく、読みやすいモデルです。'),
      beat('ただし、変数どうしの交互作用は表せません。ある変数の効き方が別の変数で変わる、という関係です。'),
      beat('もう一方の端が、SE カーネル（二乗指数カーネル、RBF カーネルとも呼ぶ）のガウス過程です。この論文では SE-GP と呼びます。全部の変数を同時に見る、柔軟なモデルです。', 11),
      beat('柔軟な反面、データのない変数の組み合わせへは、予測を広げにくくなります。'),
      beat('論文は、この2つを両端に含むモデルを作ります。1次から D 次までの交互作用を、すべて1つのカーネルに入れます。'),
    ],
    build(ui) {
      ui.text(`<span class="pill" style="background:${D.COLOR.gam}">GAM</span>`, { x: LEFT_X, y: 122, size: 26 });
      ui.tex(R`y = f_1(x_1) + f_2(x_2) + \cdots + f_D(x_D)`, { x: 300, y: 112, size: 36, dim: [[2, 4]] });
      ui.text(`<span class="pill" style="background:${D.COLOR.se}">SE-GP</span>`, { x: LEFT_X, y: 202, size: 26, at: 2 });
      ui.tex(R`y = f(x_1, x_2, \ldots, x_D)`, { x: 300, y: 192, size: 36, at: 2 });
      ui.table({
        x: LEFT_X + 60, y: 300, widths: [340, 480, 480], size: 23, rowH: 62,
        header: ['', 'GAM（1次の和）', 'SE-GP（全変数の積）'],
        rows: [
          ['読みやすさ', '変数ごとの図にできる', '図にしにくい'],
          ['交互作用', '表せない', 'すべて表せる'],
          ['データのない組み合わせ', '和の形で予測できる', '近くのデータが必要'],
        ],
        at: 0, rowAt: [0, 1, 3], delay: 0.4,
      });
      ui.text('加法ガウス過程：1次から $D$ 次までの項をすべて持ち、どの次数が効くかをデータから学ぶ', {
        x: LEFT_X + 60, y: 594, w: 1300, size: 30, weight: 700, at: 4, delay: 0.3, align: 'center', glow: [{ from: 4 }],
      });
      ui.text('※「交互作用の次数」＝ 1つの項が同時に見る変数の数', { x: LEFT_X + 60, y: 680, size: 20, color: C.muted, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解: 断面で見分ける
  const SURFACE_RANGE = [-2, 2];
  const additiveSurface = (a, b) => Math.sin(1.7 * a) + 0.7 * Math.cos(1.4 * b);
  const interactionSurface = (a, b) => 0.75 * b * Math.sin(1.7 * a) + 0.3 * b;
  const SLICE_VALUES = [-1.5, -0.5, 0.5, 1.5];
  const SLICE_COLORS = [C.blue, C.aqua, C.yellow, C.orange];
  const SLICE_XS = linspace(-2, 2, 100);
  const SURFACE_N = 34;
  const meanOf = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '足し算で書ける関数の見分け方',
    beats: [
      beat('左は足し算で書ける関数、右は交互作用のある関数です。どちらも2変数の面です。'),
      beat('x₂ を1つ決めて切った断面を、x₂ を動かしながら4本とります。'),
      beat('足し算の関数は、断面を重ねると形がぴったり同じです。x₂ を変えても、上下に平行移動するだけです。'),
      beat('交互作用のある関数は、重ねても形が合いません。x₂ によって、断面の形そのものが変わります。'),
      beat('足し算の関数では、ある x₂ で分かった形を、別の x₂ にそのまま使えます。これが、後で見る遠くの予測の種になります。'),
    ],
    build() {
      const color = V3.heightColor(-2, 2);
      const makeSide = (fn, x, label) => ({
        fn,
        label,
        x,
        grid: V3.sampleGrid(fn, SURFACE_RANGE, SURFACE_RANGE, SURFACE_N),
        view: new V3.View({ cx: x + 340, cy: 268, scale: 66, azimuth: -0.65, elevation: 0.62, zScale: 0.55, zBase: -1.9 }),
        curves: SLICE_VALUES.map((b) => SLICE_XS.map((a) => fn(a, b))),
        plot: new Plot({ x: x + 70, y: 512, w: 560, h: 204, xr: SURFACE_RANGE, yr: [-2.6, 2.6] }),
      });
      return { color, sides: [makeSide(additiveSurface, 60, '足し算で書ける関数  f₁(x₁) + f₂(x₂)'), makeSide(interactionSurface, 820, '交互作用のある関数  x₂ で形が変わる')] };
    },
    draw(ctx, s, st) {
      const sweep = s.p(1, 7, 0.2);
      st.sides.forEach((side, sideIndex) => {
        const alpha = s.p(0, 0.8);
        canvasText(ctx, side.label, side.x + 340, 112, { size: 22, color: C.text, align: 'center', weight: 700, alpha });
        V3.drawFloor(ctx, side.view, SURFACE_RANGE, SURFACE_RANGE, { alpha, step: 1 });
        V3.drawScene(ctx, side.view, { grid: side.grid, color: st.color, alpha });
        const [ax, ay] = side.view.project(2.2, -2, side.view.zBase);
        const [bx, by] = side.view.project(2, 2.25, side.view.zBase);
        canvasText(ctx, 'x₁', ax, ay + 8, { size: 18, alpha });
        canvasText(ctx, 'x₂', bx + 6, by, { size: 18, alpha });

        // 切る位置の面（奥行きの順は気にせず上に重ねる）
        const reached = lerp(SLICE_VALUES[0], SLICE_VALUES[3], sweep);
        const moving = s.beat === 1 && s.u < s.bt(2);
        SLICE_VALUES.forEach((b, i) => {
          const shown = s.beat >= 1 && reached >= b - 1e-6;
          if (!shown) return;
          ctx.save();
          ctx.strokeStyle = SLICE_COLORS[i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          SLICE_XS.forEach((a, j) => {
            const [px, py] = side.view.project(a, b, side.fn(a, b));
            if (j) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        });
        if (moving) {
          ctx.save();
          ctx.fillStyle = rgba(C.yellow, 0.14);
          ctx.strokeStyle = rgba(C.yellow, 0.7);
          ctx.beginPath();
          [[-2, -1.9], [2, -1.9], [2, 2.3], [-2, 2.3]].forEach(([a, z], i) => {
            const [px, py] = side.view.project(a, reached, z);
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 下の段: 断面のグラフ。字幕2（左）・字幕3（右）で、平均をそろえて重ねる
        const plotAlpha = s.p(1, 0.8);
        side.plot.axes(ctx, { xticks: [-2, -1, 0, 1, 2], yticks: [-2, 0, 2], xlabel: 'x₁', alpha: plotAlpha });
        const align = sideIndex === 0 ? s.p(2, 1.6, 0.6) : s.p(3, 1.6, 0.6);
        side.curves.forEach((curve, i) => {
          if (!(s.beat >= 1 && reached >= SLICE_VALUES[i] - 1e-6)) return;
          const center = meanOf(curve);
          side.plot.line(ctx, SLICE_XS, curve.map((v) => v - center * align), { color: SLICE_COLORS[i], width: 3 });
        });
      });
      if (s.beat >= 1) {
        legend(ctx, SLICE_VALUES.map((b, i) => ({ color: SLICE_COLORS[i], label: `x₂ = ${fmt(b, 1)}` })), 500, 492, { alpha: s.p(1, 0.8), gap: 22, size: 16 });
      }
      if (s.beat >= 2) canvasText(ctx, '重ねると同じ形（平行移動だけ）', 410, 540, { size: 20, color: C.text, align: 'center', weight: 700, alpha: s.p(2, 0.8, 1.6) });
      if (s.beat >= 3) canvasText(ctx, '重ねても形が違う（交互作用）', 1170, 540, { size: 20, color: C.text, align: 'center', weight: 700, alpha: s.p(3, 0.8, 1.6) });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: 'カーネルの和は関数の和、カーネルの積は SE',
    beats: [
      beat('1変数のガウス過程を2つ、独立に用意して足します。'),
      beat('足した関数も、ガウス過程になります。独立なので、共分散の交差する項が消え、カーネルは2つのカーネルの和になります。'),
      beat('つまり、カーネルの和は、関数の和に対応します。これが1次の加法カーネルで、GAM のガウス過程版です。'),
      beat('一方、1次元の SE カーネルの積をとると、指数の肩が足し算になります。これは多変数の SE カーネルそのものです。'),
      beat('積は、すべての座標が近いときだけ大きくなります。つまり SE カーネルは、全変数の交互作用を1つの項で持つ、最高次のカーネルです。'),
    ],
    build(ui) {
      ui.text('カーネルの和', { x: LEFT_X, y: 108, size: 25, weight: 700, color: C.text2 });
      ui.tex(R`f_1(x_1) \sim \mathcal{GP}(0, k_1), \quad f_2(x_2) \sim \mathcal{GP}(0, k_2) \quad \text{（独立）}`, { x: LEFT_X, y: 152, size: 27 });
      ui.tex(R`\mathrm{Cov}\big[f_1 + f_2,\; f_1' + f_2'\big] = k_1(x_1, x_1') + k_2(x_2, x_2')`, { x: LEFT_X, y: 214, size: 27, at: 1, hl: [] });
      ui.tex(R`\Rightarrow\; f_1(x_1) + f_2(x_2) \sim \mathcal{GP}(0,\; k_1 + k_2)`, { x: LEFT_X, y: 280, size: 29, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('カーネルの積', { x: LEFT_X, y: 372, size: 25, weight: 700, color: C.text2, at: 3 });
      ui.tex(R`\prod_{d=1}^{D} k_d(x_d, x_d') = \prod_{d=1}^{D} \exp\!\left(-\frac{(x_d - x_d')^2}{2\ell_d^2}\right)`, { x: LEFT_X, y: 416, size: 28, at: 3 });
      ui.tex(R`= \exp\!\left(-\sum_{d=1}^{D} \frac{(x_d - x_d')^2}{2\ell_d^2}\right)`, { x: LEFT_X + 120, y: 524, size: 28, at: 3, delay: 0.8, glow: [{ from: 3, to: 4 }] });
      ui.text('論文の式 (5)：これが多変数の SE カーネル', { x: LEFT_X, y: 650, size: 21, color: C.muted, at: 3, delay: 1.2 });
      seeThrough(ui.card({ x: CARD_X + 20, y: 130, w: CARD_W - 20, h: 500, at: 2, title: '2つの端' }));
      ui.text(`<span class="pill" style="background:${D.COLOR.gam}">和</span>1次の加法カーネル`, { x: CARD_X + 48, y: 194, size: 24, at: 2 });
      ui.text('変数を1つずつ見る<br>どれか1つの座標が近ければ大きい', { x: CARD_X + 48, y: 240, w: 430, size: 21, color: C.text2, at: 2, delay: 0.3, lh: 1.6 });
      ui.text(`<span class="pill" style="background:${D.COLOR.se}">積</span>$D$ 次の加法カーネル ＝ SE`, { x: CARD_X + 48, y: 368, size: 24, at: 3 });
      ui.text('変数を全部同時に見る<br>すべての座標が近いときだけ大きい', { x: CARD_X + 48, y: 414, w: 430, size: 21, color: C.text2, at: 4, lh: 1.6 });
      ui.text('その間の 2次、3次、… は次の章へ', { x: CARD_X + 48, y: 548, size: 21, color: C.muted, at: 4, delay: 0.8 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解: 論文の図1を計算し直す
  const FIG1_RANGE = [-4, 4];
  const FIG1_N = 34;
  const FIG1_COLUMNS = [205, 590, 985, 1385];
  const FIG1_ROWS = [262, 590];
  const FIG1_LABELS = [
    [R`k_1(x_1, x_1')`, '1次元カーネル', R`f_1(x_1)`],
    [R`k_2(x_2, x_2')`, '1次元カーネル', R`f_2(x_2)`],
    [R`k_1 + k_2`, '1次のカーネル（和）', R`f_1(x_1) + f_2(x_2)`],
    [R`k_1\, k_2`, '2次のカーネル（積）', R`f(x_1, x_2)`],
  ];
  const FIG1_SEEDS = { first: 3, second: 12, product: 9 };
  const FIG1_DRAW_HEIGHT = 0.95; // 乱数の関数は値の幅が広いので、高さを縮めて描く
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '和と積が作る関数（論文の図1）',
    beats: [
      beat('上の段はカーネルの形です。k₁ は x₁ の方向にだけ落ち、x₂ の方向には続く尾根です。k₂ は、その向きを変えたものです。', 10),
      beat('足すと、十字の形になります。どちらか一方の座標が近いだけで、値が残ります。'),
      beat('掛けると、原点のまわりの山になります。両方の座標が近いところにしか、値がありません。'),
      beat('下の段は、それぞれのカーネルから乱数で引いた関数です。1次の関数は、軸の方向に同じ模様が長く続きます。'),
      beat('積のカーネルから引いた関数は、でこぼこが場所ごとに違い、遠くまで続く構造がありません。'),
    ],
    build(ui) {
      FIG1_COLUMNS.forEach((x, i) => {
        const at = i < 2 ? 0 : i - 1;
        ui.tex(FIG1_LABELS[i][0], { x: x - 170, y: 360, w: 340, align: 'center', size: 22, at });
        ui.text(FIG1_LABELS[i][1], { x: x - 170, y: 104, w: 340, align: 'center', size: 20, color: C.text2, at });
        ui.tex(FIG1_LABELS[i][2], { x: x - 170, y: 716, w: 340, align: 'center', size: 22, at: 3, delay: 0.2 * i });
      });
      ui.text('+', { x: 372, y: 216, size: 44, weight: 700, at: 0, delay: 0.3 });
      ui.text('=', { x: 760, y: 216, size: 44, weight: 700, at: 1 });
      ui.text('+', { x: 372, y: 560, size: 44, weight: 700, at: 3 });
      ui.text('=', { x: 760, y: 560, size: 44, weight: 700, at: 3 });
      const xs = linspace(FIG1_RANGE[0], FIG1_RANGE[1], FIG1_N);
      const side = FIG1_N + 1;
      const L = M.factorSE(xs, 1);
      const f1 = M.draw1D(L, FIG1_SEEDS.first);
      const f2 = M.draw1D(L, FIG1_SEEDS.second);
      const product = M.drawProduct(L, L, FIG1_SEEDS.product);
      const gridOf = (value) => {
        const z = new Float64Array(side * side);
        for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) z[i * side + j] = value(i, j);
        return { xr: FIG1_RANGE, yr: FIG1_RANGE, n: FIG1_N, z };
      };
      const kernel = [
        gridOf((i, j) => M.se1(xs[j], 0)),
        gridOf((i) => M.se1(xs[i], 0)),
        gridOf((i, j) => M.se1(xs[j], 0) + M.se1(xs[i], 0)),
        gridOf((i, j) => M.se1(xs[j], 0) * M.se1(xs[i], 0)),
      ];
      const draws = [gridOf((i, j) => f1[j]), gridOf((i) => f2[i]), gridOf((i, j) => f1[j] + f2[i]), gridOf((i, j) => product[i][j])];
      return { kernel, draws, kernelColor: V3.heightColor(0, 2), drawColor: V3.heightColor(-3.2, 3.2) };
    },
    draw(ctx, s, st) {
      const panel = (grid, color, cx, cy, alpha, zScale, zBase) => {
        if (alpha <= 0) return;
        const view = new V3.View({ cx, cy, scale: 24, azimuth: -0.7 + 0.012 * s.u, elevation: 0.6, zScale, zBase });
        V3.drawFloor(ctx, view, FIG1_RANGE, FIG1_RANGE, { alpha, step: 2 });
        V3.drawScene(ctx, view, { grid, color, alpha, mesh: false });
      };
      const kernelAlpha = [s.p(0, 0.8), s.p(0, 0.8, 0.3), s.p(1, 0.8), s.p(2, 0.8)];
      st.kernel.forEach((grid, i) => panel(grid, st.kernelColor, FIG1_COLUMNS[i], FIG1_ROWS[0] + 10, kernelAlpha[i], 2.6, 0));
      st.draws.forEach((grid, i) => panel(grid, st.drawColor, FIG1_COLUMNS[i], FIG1_ROWS[1], s.p(3, 0.8, 0.2 * i), FIG1_DRAW_HEIGHT, -3.4));
    },
  });

  // ---------------------------------------------------------------- 第3章 理論
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '加法カーネルの定義',
    beats: [
      beat('各次元に、1次元の基底カーネルを1つずつ割り当てます。2点の x と x′ について、その値を z と書きます。'),
      beat('1次のカーネルは z の和、2次のカーネルは2つずつの積の和です。'),
      beat('n 次のカーネルは、n 個ずつの積を、すべての組み合わせについて足したものです。項の数は、D 個から n 個を選ぶ組み合わせの数です。'),
      beat('D 次は、全部の積が1項だけです。基底が SE なら、これが SE カーネルです。'),
      beat('加法カーネルは、これらをすべての次数について足したものです。次数ごとに分散、シグマ n の2乗を持ちます。', 9),
    ],
    build(ui) {
      ui.tex(R`z_i = k_i(x_i, x_i') \quad (i = 1, \ldots, D)`, { x: LEFT_X, y: 112, size: 28 });
      ui.tex(R`k_{\mathrm{add}_1}(\mathbf{x}, \mathbf{x}') = \sigma_1^2 \sum_{i=1}^{D} z_i`, { x: LEFT_X, y: 176, size: 28, at: 1 });
      ui.tex(R`k_{\mathrm{add}_2}(\mathbf{x}, \mathbf{x}') = \sigma_2^2 \sum_{i=1}^{D} \sum_{j=i+1}^{D} z_i z_j`, { x: LEFT_X, y: 268, size: 28, at: 1, delay: 0.5 });
      ui.tex(R`k_{\mathrm{add}_n}(\mathbf{x}, \mathbf{x}') = \sigma_n^2 \sum_{1 \le i_1 < \cdots < i_n \le D} \;\prod_{d=1}^{n} z_{i_d}`, { x: LEFT_X, y: 368, size: 28, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.tex(R`k_{\mathrm{add}_D}(\mathbf{x}, \mathbf{x}') = \sigma_D^2 \prod_{d=1}^{D} z_d`, { x: LEFT_X, y: 480, size: 28, at: 3 });
      ui.tex(R`k_{\mathrm{add}}(\mathbf{x}, \mathbf{x}') = \sum_{n=1}^{D} k_{\mathrm{add}_n}(\mathbf{x}, \mathbf{x}')`, { x: LEFT_X, y: 590, size: 30, at: 4, glow: [{ from: 4 }] });
      ui.text('論文の式 (1)〜(4)', { x: LEFT_X, y: 700, size: 20, color: C.muted, at: 4, delay: 0.5 });
      seeThrough(ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 330, at: 1, title: '$D = 3$ のとき' }));
      ui.tex(R`\text{1次}: \; \sigma_1^2\,(z_1 + z_2 + z_3)`, { x: CARD_X + 28, y: 200, size: 23, at: 1, delay: 0.3 });
      ui.tex(R`\text{2次}: \; \sigma_2^2\,(z_1 z_2 + z_1 z_3 + z_2 z_3)`, { x: CARD_X + 28, y: 270, size: 23, at: 1, delay: 0.7 });
      ui.tex(R`\text{3次}: \; \sigma_3^2\, z_1 z_2 z_3`, { x: CARD_X + 28, y: 340, size: 23, at: 3 });
      ui.text('項は全部で7つ、分散は3つ', { x: CARD_X + 28, y: 400, size: 22, color: C.text2, at: 4 });
      seeThrough(ui.card({ x: CARD_X, y: 490, w: CARD_W, h: 190, at: 2, title: '項の数' }));
      ui.tex(R`n \text{ 次の項の数} = \binom{D}{n}`, { x: CARD_X + 28, y: 540, size: 24, at: 2, delay: 0.4 });
      ui.tex(R`\text{全部で } 2^D - 1 \text{ 項}`, { x: CARD_X + 28, y: 622, size: 24, at: 4, delay: 0.4 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解: 交互作用の格子（論文の図3）
  const LATTICE_D = 4;
  const LATTICE_STATES = [
    [0.7, 0.7, 0.7, 0.7],
    [1, 0, 0, 0],
    [0, 0, 0, 1],
    [0.25, 1, 0.55, 0.12],
    [0.25, 1, 0.55, 0.12],
  ];
  const LATTICE_NAMES = ['すべての項（D = 4）', 'GAM：1次だけ', 'SE-GP：4次だけ', '加法ガウス過程：次数ごとに重みを学ぶ', '加法ガウス過程：次数ごとに重みを学ぶ'];
  const LATTICE_COLORS = [D.COLOR.additive, D.COLOR.gam, D.COLOR.se, D.COLOR.additive, D.COLOR.additive];
  const LATTICE_BOX = { x: 200, y: 136, w: 740, h: 540 };
  const COUNT_DIMENSIONS = [4, 8, 20, 30];
  const blendHex = (a, b, k) => {
    const [ra, ga, ba] = KIT.hexToRgb(a);
    const [rb, gb, bb] = KIT.hexToRgb(b);
    const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
    return `#${hex(lerp(ra, rb, k))}${hex(lerp(ga, gb, k))}${hex(lerp(ba, bb, k))}`;
  };
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '交互作用の格子 ― 2つの端とその間（論文の図3）',
    beats: [
      beat('D が4のときの項を、全部並べました。丸の1つが1つの項で、数字は使う変数です。下から順に、1次、2次、3次、4次です。'),
      beat('1次の段だけに重みを置くと、GAM です。'),
      beat('一番上の4次だけに重みを置くと、SE カーネルのガウス過程です。'),
      beat('加法ガウス過程は、段ごとに別々の重みを持てます。中間の次数を強くすることもできます。'),
      beat('同じ段の項は、同じ重みを共有します。項の数は指数で増えても、次数の分散は D 個で済みます。'),
    ],
    build(ui) {
      const layout = D.latticeLayout(LATTICE_D, LATTICE_BOX);
      ui.table({
        x: 1050, y: 470, widths: [120, 190, 180], size: 21, rowH: 42,
        header: ['次元 $D$', '項の数', '次数の分散'],
        rows: COUNT_DIMENSIONS.map((d) => [String(d), (2 ** d - 1).toLocaleString('en-US'), `${d} 個`]),
        at: 4, rowDelay: 0.25, delay: 0.3,
      });
      return { layout };
    },
    draw(ctx, s, st) {
      const weights = stateAt(s, LATTICE_STATES);
      const b = Math.max(0, s.beat);
      const color = blendHex(LATTICE_COLORS[Math.max(0, b - 1)], LATTICE_COLORS[b], s.p(b, 0.8));
      D.drawLattice(ctx, st.layout, weights, { radius: 31, fontSize: 18, color });
      const rowY = (order) => LATTICE_BOX.y + LATTICE_BOX.h - ((order - 1) * LATTICE_BOX.h) / (LATTICE_D - 1);
      [1, 2, 3, 4].forEach((order) => {
        canvasText(ctx, `${order}次`, 100, rowY(order) + 7, { size: 22, weight: 700, color: C.text2 });
        canvasText(ctx, `${M.comb(LATTICE_D, order)} 項`, 100, rowY(order) + 32, { size: 17, color: C.muted });
      });
      canvasText(ctx, LATTICE_NAMES[b], 1050, 130, { size: 24, weight: 700, color: C.text });
      canvasText(ctx, '次数ごとの重み σₙ²', 1050, 176, { size: 18, color: C.text2 });
      D.orderBars(ctx, { x: 1060, y: 196, w: 400, h: 200 }, weights, { color, showValues: false, labelSize: 17 });
      canvasText(ctx, '次数 n', 1460, 434, { size: 16, color: C.muted, align: 'right' });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '指数個の和を、列挙せずに計算する',
    beats: [
      beat('すべての次数を足すと、項の数は 2 の D 乗引く1です。30次元なら約10億項で、そのままでは足せません。'),
      beat('論文は、n 次のカーネルが、基本対称多項式 $e_n$ そのものであることに注目します。n 個ずつの積の和です。'),
      beat('速く計算できる理由は、この積の形に表れています。かっこを展開すると、t の n 乗の係数が $e_n$ です。かっこを1つずつ掛けていけば、係数は次元の2乗の手間で求まります。', 12),
      beat('実際の計算には、ニュートン・ジラールの公式を使います。z のべき乗の和 $s_k$ を先に作り、$e_1$ から順に求めます。', 9),
      beat('必要な計算は、1組の点について次元の2乗程度です。指数個の項を、1つも列挙せずに足し上げられます。'),
    ],
    build(ui) {
      ui.tex(R`\text{項の数} = 2^D - 1 \qquad (D = 30 \text{ で約 } 10 \text{ 億})`, { x: LEFT_X, y: 112, size: 28, glow: [{ from: 0, to: 1 }] });
      ui.tex(R`k_{\mathrm{add}_n} = \sigma_n^2\; e_n(z_1, \ldots, z_D)`, { x: LEFT_X, y: 188, size: 30, at: 1 });
      ui.tex(R`e_2(z_1, z_2, z_3, z_4) = z_1 z_2 + z_1 z_3 + z_1 z_4 + z_2 z_3 + z_2 z_4 + z_3 z_4`, { x: LEFT_X, y: 254, size: 25, at: 1, delay: 0.6 });
      ui.tex(R`\prod_{i=1}^{D} (1 + z_i\, t) = \sum_{n=0}^{D} e_n\, t^n`, { x: LEFT_X, y: 326, size: 30, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('展開の項は $2^D$ 個でも、かっこを1つずつ掛けて<br>係数の列を更新すれば、手間は $D^2$ 程度で済む', { x: LEFT_X + 470, y: 326, w: 760, size: 22, color: C.text2, lh: 1.6, at: 2, delay: 0.8 });
      ui.text('ニュートン・ジラールの公式（論文の式 6）', { x: LEFT_X, y: 442, size: 24, weight: 700, color: C.text2, at: 3 });
      ui.tex(R`e_n = \frac{1}{n} \sum_{k=1}^{n} (-1)^{k-1}\, e_{n-k}\, s_k, \qquad s_k = \sum_{i=1}^{D} z_i^{\,k}, \qquad e_0 = 1`, { x: LEFT_X, y: 490, size: 31, at: 3, delay: 0.4, glow: [{ from: 3, to: 4 }] });
      ui.tex(R`\text{1組の点あたり } O(D^2), \qquad n \le R \text{ まで使うグラム行列全体で } O(N^2 D R)`, { x: LEFT_X, y: 616, size: 26, at: 4 });
      ui.text('$N$：データ数、$R$：使う最高の次数。カーネル行列の逆行列の $O(N^3)$ は別にかかる', { x: LEFT_X, y: 680, size: 21, color: C.muted, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解: 4変数で計算する
  const WORK_Z = [0.9, 0.6, 0.4, 0.2];
  const WORK = M.newtonGirard(WORK_Z);
  const WORK_CHECK = M.elementaryByEnumeration(WORK_Z);
  const GROWTH_DIMENSIONS = Array.from({ length: 29 }, (_, i) => i + 2);
  const n3 = (v) => texNum(v, 3);
  const pow10 = (value) => {
    const exponent = Math.floor(Math.log10(value));
    return `${(value / 10 ** exponent).toFixed(1)} × 10${String(exponent).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
  };
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '4変数で計算してみる',
    beats: [
      beat('ある2点の組について、4つの次元の z が、0.9、0.6、0.4、0.2 だったとします。'),
      beat('まず、べき乗の和 s を4つ作ります。z を1乗、2乗、3乗、4乗して足すだけです。'),
      beat('公式に入れると、$e_1$、$e_2$、$e_3$、$e_4$ が順に出ます。使うのは、前の e と s だけです。'),
      beat('最後の $e_4$ は 0.0432 で、4つの z を全部掛けた値と一致します。$e_3$ の 0.444 も、4項を足した値と同じです。', 9),
      beat('右は、次元を増やしたときの掛け算の回数です。全部列挙すると指数で増えますが、公式は2乗で増えるだけです。'),
    ],
    build(ui) {
      const { s, e } = WORK;
      ui.tex(R`z = (${WORK_Z.join(',\\;')})`, { x: LEFT_X, y: 108, size: 28 });
      const sItems = [1, 2, 3, 4].map((k) => R`s_${k} = ${n3(s[k])}`).join(R`,\quad `);
      ui.tex(sItems, { x: LEFT_X, y: 170, size: 25, at: 1 });
      const rows = [
        R`e_1 = s_1 = ${n3(e[1])}`,
        R`e_2 = \tfrac{1}{2}(e_1 s_1 - s_2) = ${n3(e[2])}`,
        R`e_3 = \tfrac{1}{3}(e_2 s_1 - e_1 s_2 + s_3) = ${n3(e[3])}`,
        R`e_4 = \tfrac{1}{4}(e_3 s_1 - e_2 s_2 + e_1 s_3 - s_4) = ${texNum(e[4], 4)}`,
      ];
      rows.forEach((tex, i) => ui.tex(tex, { x: LEFT_X, y: 244 + i * 72, size: 27, at: 2, delay: 0.3 + 0.9 * i }));
      ui.tex(R`\text{確かめ}: \; z_1 z_2 z_3 z_4 = ${texNum(WORK_Z.reduce((a, b) => a * b, 1), 4)}`, { x: LEFT_X, y: 548, size: 25, at: 3, glow: [{ from: 3, to: 4, color: C.aqua }] });
      ui.tex(R`z_1 z_2 z_3 + z_1 z_2 z_4 + z_1 z_3 z_4 + z_2 z_3 z_4 = ${n3(WORK_CHECK[3])}`, { x: LEFT_X, y: 610, size: 25, at: 3, delay: 0.6, glow: [{ from: 3, to: 4, color: C.aqua }] });
      ui.text('総当たりで足した値との差は、14次元まで試して $10^{-12}$ 以下（この動画の計算）', { x: LEFT_X, y: 680, size: 20, color: C.muted, at: 3, delay: 1.2 });
      return {
        plot: new Plot({ x: 900, y: 150, w: 590, h: 500, xr: [2, 30], yr: [0, 11] }),
      };
    },
    draw(ctx, s, st) {
      if (s.beat < 4) return;
      const alpha = s.p(4, 0.8);
      const plot = st.plot;
      plot.axes(ctx, { xticks: [5, 10, 15, 20, 25, 30], yticks: [0, 2, 4, 6, 8, 10], fmtY: (v) => `10${String(v).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`, xlabel: '次元 D', ylabel: '掛け算の回数（目安）', alpha });
      const upto = s.p(4, 3, 0.4);
      plot.line(ctx, GROWTH_DIMENSIONS, GROWTH_DIMENSIONS.map((d) => Math.log10(M.enumerationOperations(d))), { color: C.red, width: 3.5, upto });
      plot.line(ctx, GROWTH_DIMENSIONS, GROWTH_DIMENSIONS.map((d) => Math.log10(M.newtonGirardOperations(d))), { color: C.aqua, width: 3.5, upto });
      const last = s.p(4, 0.8, 3.2);
      plot.label(ctx, `全部列挙  ${pow10(M.enumerationOperations(30))} 回`, 30, 10.42, { size: 18, color: C.text, align: 'right', dy: -12, alpha: last });
      plot.label(ctx, `公式  ${M.newtonGirardOperations(30).toLocaleString('en-US')} 回`, 30, 3.14, { size: 18, color: C.text, align: 'right', dy: -14, alpha: last });
    },
  });
})();
