// scenes-multi.js — 第8章（説明変数が3つ以上のとき）。書き方は scenes-basic.js と同じ。
// 実験の数値は tools/make-data.mjs が計算した window.MULTI_DATA を表示する（読み上げ原稿にも同じ値を書いている）。
(() => {
  const { C, Plot, fmt, canvasText, keyframes, lerp, clamp, legend, rgba } = KIT;
  const D = window.MULTI_DATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };
  const GAUSS_COLOR = C.blue;
  const POLY_COLOR = C.orange;
  const PLANE_COLOR = C.text2;

  const firstHist = D.histograms[0];
  const lastHist = D.histograms[D.histograms.length - 1];
  const errorAt = (d) => D.errors.find((e) => e.d === d);
  const unitAt = (scale) => D.units.find((u) => u.scale === scale);
  const UNIT_DEMO = 100; // 字幕で取り上げる単位の倍率
  const unitBase = unitAt(1).tps;
  const unitDemo = unitAt(UNIT_DEMO).tps;
  const gaussFixedWorst = Math.max(...D.errors.map((e) => e.gaussFixed));

  // ---------------------------------------------------------------- 第8章 理論（式はそのまま）
  SCENES.push({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: '説明変数が3つ以上 ― 式はそのまま使える',
    beats: [
      beat(R`ここからは、説明変数が3つ以上の場合です。式はそのまま。距離を $d$ 個の変数で計算し、平面の項を1次式に広げるだけです。`, 10),
      beat(R`行列 $\Phi$ は点の数 $n$ だけで決まり、$d$ が増えても大きくなりません。増えるのは $P$ の列だけです。`, 9),
      beat(R`解ける条件は、点が $d+1$ 個以上あり、すべてが1つの超平面の上に乗っていないこと。第4章の「一直線に並ばない」の一般形です。`, 10),
      beat(R`$r^2\log r$ に1次式を足した形は、どの次元でも必ず解けます。ただし「2階微分のエネルギー最小」という意味は、2次元のときだけのものです。`, 11),
    ],
    build(ui) {
      ui.tex(R`s(\mathbf{x}) = \sum_{j=1}^{n} w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + c_0 + c_1 x_1 + \cdots + c_d x_d`, { x: LEFT_X, y: 122, size: 32 });
      ui.tex(R`\lVert\mathbf{x}-\mathbf{x}_j\rVert = \sqrt{(x_1 - x_{j1})^2 + \cdots + (x_d - x_{jd})^2}`, { x: LEFT_X, y: 228, size: 28, delay: 0.6 });
      ui.text(R`$d$：説明変数の数　　$n$：データ点の数`, { x: LEFT_X, y: 296, size: 22, color: C.text2, delay: 1.0 });
      ui.tex(R`\Phi:\ n \times n\ \ \text{（}d\text{ によらない）},\qquad P:\ n \times (d+1)`, { x: LEFT_X, y: 366, size: 30, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text(R`解ける条件：点が $d+1$ 個以上あり、すべてが1つの超平面の上に乗っていない`, { x: LEFT_X, y: 454, w: 880, size: 24, at: 2 });
      ui.text('（2次元なら「一直線に並ばない」、3次元なら「1枚の平面に乗らない」）', { x: LEFT_X + 20, y: 498, size: 21, color: C.text2, at: 2, delay: 0.6 });
      ui.text(R`$r^2\log r$ ＋ 1次式は、どの次元でも必ず解ける（条件付き正定値）`, { x: LEFT_X, y: 580, size: 25, weight: 700, color: C.yellow, at: 3 });
      ui.text('ただし「2階微分のエネルギー最小」は、2次元だけの意味', { x: LEFT_X, y: 630, size: 25, weight: 700, color: C.red, at: 3, delay: 0.8 });

      ui.card({ x: CARD_X + 40, y: 340, w: CARD_W - 40, h: 300, title: '3変数の例', at: 1 });
      ui.tex(R`P = \begin{bmatrix} 1 & x_{11} & x_{12} & x_{13} \\ \vdots & \vdots & \vdots & \vdots \\ 1 & x_{n1} & x_{n2} & x_{n3} \end{bmatrix}`, { x: CARD_X + 66, y: 394, size: 26, at: 1, delay: 0.4 });
      ui.text(R`未知数：重み $n$ 個 ＋ 平面の項 4 個`, { x: CARD_X + 66, y: 556, size: 21, color: C.text2, at: 1, delay: 0.9 });
    },
  });

  // ---------------------------------------------------------------- 第8章 図解（エネルギー最小の基底）
  const P_BASIS = new Plot({ x: 130, y: 212, w: 600, h: 490, xr: [0, 2.2], yr: [-1, 4] });
  const RS = Array.from({ length: 401 }, (_, i) => 0.003 + ((2.2 - 0.003) * i) / 400);
  const BASIS_CURVES = [
    { d: 1, f: (r) => r ** 3, color: C.violet, label: 'd = 1：r³' },
    { d: 2, f: (r) => r * r * Math.log(r), color: C.yellow, label: 'd = 2：r² log r' },
    { d: 3, f: (r) => r, color: C.aqua, label: 'd = 3：r' },
    { d: 4, f: (r) => -Math.log(r), color: C.orange, label: 'd = 4：−log r' },
    { d: 5, f: (r) => 1 / r, color: C.red, label: 'd = 5：1/r' },
  ];
  SCENES.push({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: 'エネルギーに対応する基底は、次元で変わる',
    beats: [
      beat(R`2階微分のエネルギーに対応する基底（1点を押したときの形）は、次元によって $r^3$、$r^2\log r$、$r$、$\log r$、$1/r$ と変わります。`, 10),
      beat(R`$d$ が4以上では、基底が $r = 0$ で無限大になります。細いとげを立ててもエネルギーがほとんど増えず、「点を通す」という条件が効かなくなるためです。`, 13),
      beat(R`エネルギー最小の意味を保つには、微分の階数 $m$ を $d/2$ より大きくします。すると多項式の項が急に増え、$d = 10$ では 3003 個になります。`, 12),
      beat(R`そこで実際には、$r^2\log r$ や $r$ に1次式を足した形のまま使うことが多いです。板の話ではなくなりますが、解くことはできます。`, 11),
    ],
    build(ui) {
      ui.text('2階微分のエネルギーに対応する基底（定数倍は省略）', { ...TITLE, x: 130, y: 112 });
      ui.text(R`エネルギー最小を保つときの $m$ と多項式の項数`, { ...TITLE, x: 820, y: 126, at: 2 });
      ui.table({
        x: 820, y: 166, widths: [130, 130, 170, 250], aligns: ['center', 'center', 'center', 'center'], size: 21, rowH: 50,
        header: [R`変数 $d$`, R`階数 $m$`, R`$\varphi(r)$`, '多項式の項数'],
        rows: [
          ['2', '2', R`$r^2\log r$`, '3'],
          ['3', '2', R`$r$`, '4'],
          ['4', '3', R`$r^2\log r$`, '15'],
          ['5', '3', R`$r$`, '21'],
          ['6', '4', R`$r^2\log r$`, '84'],
          ['10', '6', R`$r^2\log r$`, `<b style="color:${C.red}">3003</b>`],
        ],
        at: 2, rowDelay: 0.25, glowRows: [null, null, null, null, null, [{ from: 2, to: 3, color: C.red }]],
      });
      ui.text(R`条件：$m > d/2$`, { x: 820, y: 530, size: 24, weight: 700, at: 2, delay: 1.6 });
      ui.text(R`実際には $r^2\log r$ や $r$ ＋ 1次式の形のまま使うことが多い<br>（解くことはできるが、板の話ではなくなる）`, { x: 820, y: 596, w: 690, size: 23, color: C.yellow, weight: 700, at: 3 });
    },
    draw(ctx, s) {
      const a = s.p(0, 0.6);
      P_BASIS.axes(ctx, { xticks: [0, 1, 2], yticks: [-1, 0, 1, 2, 3, 4], xlabel: 'r', alpha: a });
      BASIS_CURVES.forEach((curve, i) => {
        const grow = s.p(0, 1.2, 0.4 + 0.5 * i);
        const emphasize = curve.d >= 4 ? 1 : lerp(1, 0.4, s.win(1, 2));
        P_BASIS.line(ctx, RS, RS.map(curve.f), { color: curve.color, width: 3.5, upto: grow, alpha: emphasize });
      });
      const legendRow = (curves, y) => legend(ctx, curves.map((c) => ({ color: c.color, label: c.label })), 140, y, { alpha: a, size: 17, gap: 22 });
      legendRow(BASIS_CURVES.slice(0, 3), 166);
      legendRow(BASIS_CURVES.slice(3), 194);
      const mark = s.win(1, 2);
      if (mark > 0) {
        ctx.save();
        ctx.globalAlpha = mark;
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(P_BASIS.sx(0.03), P_BASIS.y);
        ctx.lineTo(P_BASIS.sx(0.03), P_BASIS.y + P_BASIS.h);
        ctx.stroke();
        ctx.restore();
        canvasText(ctx, 'r → 0 で無限大（d ≥ 4）', P_BASIS.sx(0.34), P_BASIS.y + 28, { size: 20, color: C.red, weight: 700, alpha: mark });
      }
    },
  });

  // ---------------------------------------------------------------- 第8章 理論（距離がそろう）
  SCENES.push({
    id: '8T2',
    chapter: 8,
    kind: 'theory',
    title: '距離がそろう ― 次元の呪い',
    beats: [
      beat(R`変数が増えると、点どうしの距離がそろいます。標準化した変数なら、距離のばらつきは平均のおよそ $1/\sqrt{2d}$ になります。`, 10),
      beat(R`空間を同じ細かさで埋める点の数も、1軸10点なら $10^d$ 個。点は足りなくなり、ほとんどの場所が「点の外側」になります。`, 11),
      beat(R`距離がそろう範囲では、$\varphi(r)$ は $r^2$ の1次式に近づきます。すると第4章の重みの条件で、$\mathbf{x}$ を含む項が打ち消し合い、定数だけが残ります。`, 13),
      beat(R`結果として TPS は「平面 ＋ 点のまわりだけの山」に近づきます。ガウスは $\varepsilon$ を固定したままだと 0 に戻ります。`, 10),
    ],
    build(ui) {
      ui.tex(R`r^2 = \sum_{k=1}^{d} (x_k - x'_k)^2`, { x: LEFT_X, y: 120, size: 30 });
      ui.text(R`標準化した独立な変数：距離の平均 $\approx \sqrt{2d}$、標準偏差 ÷ 平均 $\approx 1/\sqrt{2d}$`, { x: LEFT_X, y: 214, w: 880, size: 23, color: C.text2, delay: 0.6 });
      ui.text('→ ほとんどの場所が「点の外側」になる', { x: LEFT_X, y: 272, size: 25, weight: 700, at: 1, delay: 1.0 });
      ui.tex(R`\varphi(r) \approx a + b\,r^2\quad\text{（距離がそろう範囲）}`, { x: LEFT_X, y: 340, size: 28, at: 2 });
      ui.tex(R`\sum_j w_j r_j^2 = \sum_j w_j \bigl( \lVert\mathbf{x}\rVert^2 - 2\,\mathbf{x}\cdot\mathbf{x}_j + \lVert\mathbf{x}_j\rVert^2 \bigr) = \sum_j w_j \lVert\mathbf{x}_j\rVert^2`, { x: LEFT_X, y: 400, size: 25, at: 2, delay: 0.6, glow: [{ from: 2, to: 3 }] });
      ui.text(R`第4章の条件 $\sum_j w_j = 0,\ \sum_j w_j \mathbf{x}_j = \mathbf{0}$ で、$\mathbf{x}$ を含む項が消える`, { x: LEFT_X + 20, y: 478, size: 22, color: C.text2, at: 2, delay: 1.2 });
      ui.tex(R`s(\mathbf{x}) \approx \text{平面} + \text{点のまわりだけの山}`, { x: LEFT_X, y: 556, size: 34, at: 3, glow: [{ from: 3, color: C.yellow }] });
      ui.text(R`ガウスは $\varepsilon$ 固定のままだと 0 に戻る（第6章の「外側」と同じ）`, { x: LEFT_X, y: 636, size: 23, color: C.text2, at: 3, delay: 0.8 });

      ui.card({ x: CARD_X + 40, y: 120, w: CARD_W - 40, h: 340, title: '同じ細かさで埋める点の数', at: 1 });
      ui.table({
        x: CARD_X + 70, y: 174, widths: [150, 230], aligns: ['center', 'right'], size: 22, rowH: 50,
        header: [R`変数 $d$`, '点の数（1軸10点）'],
        rows: [['2', '100'], ['3', '1,000'], ['5', '10万'], ['10', `<b style="color:${C.red}">100億</b>`]],
        at: 1, rowDelay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第8章 図解（距離の分布と断面）
  const P_HIST = new Plot({ x: 120, y: 170, w: 560, h: 480, xr: [0, D.histMax], yr: [0, 4.4] });
  const P_SEC = new Plot({ x: 810, y: 170, w: 690, h: 480, xr: [0, 1], yr: [-3, 3] });
  const SECTION_TS = firstHist.section.tps.map((_, i, all) => i / (all.length - 1));
  const lastIndex = D.histograms.length - 1;
  const mixAt = (position, pick) => {
    const i = clamp(Math.floor(position), 0, lastIndex - 1);
    const k = clamp(position - i);
    const a = pick(D.histograms[i]);
    const b = pick(D.histograms[i + 1]);
    return a.map((v, j) => lerp(v, b[j], k));
  };
  SCENES.push({
    id: '8V2',
    chapter: 8,
    kind: 'visual',
    title: '変数を増やすと、TPS は平面に近づく',
    beats: [
      beat(`点の数は ${D.pointCount} 個のまま、変数を増やします。左は点どうしの距離の分布、右はデータ点 A から新しい点 Q までの値です。`, 10),
      beat(R`変数が増えるほど分布は細くなります。$d = ${lastHist.d}$ では、いちばん近い点でも、平均距離の ${fmt(lastHist.nearestRatio, 2)} 倍も離れています。`, 10),
      beat(R`右の図では、$d$ が増えるほど、TPS は A を離れると平面に沿うようになり、A のまわりだけの山が残ります。`, 10),
      beat(R`$\varepsilon$ を固定したガウスは、点を離れるとすぐ 0 に戻ります。第6章で見た「外側の振る舞い」が、ほぼ全体の振る舞いになるのです。`, 11),
    ],
    build(ui) {
      ui.text('点どうしの距離の分布（平均距離を 1 にそろえた図）', { ...TITLE, x: 120, y: 112 });
      ui.text('データ点 A から新しい点 Q までの値', { ...TITLE, x: 810, y: 112 });
    },
    draw(ctx, s) {
      const bt = s.bt;
      const position = keyframes(s.u, [[bt(0) + 1, 0], [bt(1) + 0.4, 0], [bt(1) + 6.5, lastIndex], [bt(2) + 0.2, lastIndex], [bt(2) + 1.2, 0], [bt(2) + 1.6, 0], [bt(2) + 7.6, lastIndex]]);
      const current = D.histograms[Math.round(position)];
      const a = s.p(0, 0.6);

      // 距離の分布
      P_HIST.axes(ctx, { xticks: [0, 1, 2], yticks: [0, 2, 4], xlabel: '距離 ÷ 平均距離', alpha: a });
      const density = mixAt(position, (h) => h.density);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(C.aqua, 0.75);
      density.forEach((v, i) => {
        const x0 = P_HIST.sx(i * D.histBin);
        const x1 = P_HIST.sx((i + 1) * D.histBin);
        const y = P_HIST.sy(Math.min(v, P_HIST.yr[1]));
        ctx.fillRect(x0 + 0.5, y, x1 - x0 - 1, P_HIST.y + P_HIST.h - y);
      });
      ctx.restore();
      canvasText(ctx, `d = ${current.d}`, P_HIST.x + P_HIST.w, P_HIST.y + 34, { size: 36, color: C.text, weight: 800, align: 'right', alpha: a });
      canvasText(ctx, 'いちばん近い点まで', P_HIST.x + P_HIST.w, P_HIST.y + 74, { size: 18, color: C.text2, align: 'right', alpha: a });
      canvasText(ctx, `平均距離の ${fmt(current.nearestRatio, 2)} 倍`, P_HIST.x + P_HIST.w, P_HIST.y + 102, { size: 22, color: C.yellow, weight: 700, align: 'right', alpha: a });

      // 断面
      P_SEC.axes(ctx, { xticks: [0, 1], yticks: [-2, 0, 2], fmtX: (v) => (v === 0 ? 'A（データ点）' : 'Q（新しい点）'), alpha: a });
      P_SEC.line(ctx, SECTION_TS, mixAt(position, (h) => h.section.truth), { color: C.text2, width: 2, dash: [8, 7], alpha: a });
      P_SEC.line(ctx, SECTION_TS, mixAt(position, (h) => h.section.plane), { color: PLANE_COLOR, width: 3, alpha: a });
      P_SEC.line(ctx, SECTION_TS, mixAt(position, (h) => h.section.gauss), { color: GAUSS_COLOR, width: 3, alpha: a });
      P_SEC.line(ctx, SECTION_TS, mixAt(position, (h) => h.section.tps), { color: POLY_COLOR, width: 4, alpha: a });
      legend(ctx, [
        { color: C.text2, dash: [8, 7], width: 2, label: 'もとの関数' },
        { color: PLANE_COLOR, label: '平面' },
        { color: POLY_COLOR, label: 'TPS' },
        { color: GAUSS_COLOR, label: `ガウス（ε = ${D.fixedEps}）` },
      ], 830, 160, { alpha: a, size: 16, gap: 20 });
    },
  });

  // ---------------------------------------------------------------- 第8章 理論（尺度と関係のない変数）
  SCENES.push({
    id: '8T3',
    chapter: 8,
    kind: 'theory',
    title: '変数の尺度と、関係のない変数',
    beats: [
      beat(R`距離は、全部の変数を足し合わせます。単位の違う変数は、尺度 $\ell_k$ で割ってそろえます。ふつうは標準偏差で割る「標準化」をします。`, 11),
      beat('第6章のスケール不変は、全部の座標を同じ倍率で変えるときだけの話です。変数ごとに単位が違えば、TPS でも尺度が隠れた調整項目になります。', 12),
      beat('距離には、関係のない変数もそのまま入ります。RBF は、効く変数を自分では選べません。変数を選ぶか、ガウス過程回帰のように変数ごとの尺度を学習します。', 13),
    ],
    build(ui) {
      ui.tex(R`r^2 = \sum_{k=1}^{d} \left( \frac{x_k - x'_k}{\ell_k} \right)^2`, { x: LEFT_X, y: 122, size: 34 });
      ui.text(R`$\ell_k$：変数 $k$ の尺度（ふつうは標準偏差 ＝ 標準化）`, { x: LEFT_X + 340, y: 158, w: 560, size: 23, color: C.text2, delay: 0.6 });
      ui.text('スケール不変は、全部の座標を同じ倍率で変えるときだけ', { x: LEFT_X, y: 278, size: 25, weight: 700, at: 1 });
      ui.text(R`変数ごとに単位が違う → TPS でも尺度 $\ell_k$ が隠れた調整項目になる`, { x: LEFT_X + 20, y: 326, size: 23, color: C.text2, at: 1, delay: 0.6 });
      ui.text('距離には、関係のない変数もそのまま入る', { x: LEFT_X, y: 424, size: 25, weight: 700, at: 2 });
      ui.text('RBF は、効く変数を自分では選べない', { x: LEFT_X + 20, y: 472, size: 23, color: C.text2, at: 2, delay: 0.6 });

      ui.card({ x: CARD_X + 40, y: 278, w: CARD_W - 40, h: 300, title: '3変数以上で使うときの対策', at: 2 });
      ['標準化して、単位をそろえる', '関係のない変数を外す', R`変数ごとの尺度 $\ell_k$ を学習する<br>（ガウス過程回帰の ARD）`].forEach((text, i) =>
        ui.text(`${i + 1}. ${text}`, { x: CARD_X + 70, y: 338 + i * 58, w: 410, size: 22, at: 2, delay: 0.8 + 0.4 * i }),
      );
    },
  });

  // ---------------------------------------------------------------- 第8章 図解（誤差で確かめる）
  const P_UNIT = new Plot({ x: 140, y: 190, w: 500, h: 460, xr: [1, 1000], yr: [0, 0.9], logx: true });
  const P_ERR = new Plot({ x: 790, y: 190, w: 710, h: 460, xr: [2, 50], yr: [0, 1.4], logx: true });
  const pick = (rows, key) => rows.map((row) => row[key]);
  const DIMS = pick(D.errors, 'd');
  const SCALES = pick(D.units, 'scale');
  SCENES.push({
    id: '8V3',
    chapter: 8,
    kind: 'visual',
    title: '誤差で確かめる',
    beats: [
      beat(`3変数のうち1つだけ、単位を ${UNIT_DEMO} 倍にします。平面は変わりませんが、TPS の誤差は ${fmt(unitBase, 2)} から ${fmt(unitDemo, 2)} へ、約 ${fmt(unitDemo / unitBase, 1)} 倍になります。`, 11),
      beat(R`右は、効く変数が2つだけの関数に、関係のない変数を足した結果です。変数が増えるほど TPS の誤差は平面に近づき、$d$ が 10〜15 のあたりで並びます。`, 12),
      beat(`ガウスは ε 固定だと誤差が ${fmt(gaussFixedWorst, 1)} まで悪化します。ε を距離に合わせると、この例では変数が少ないうちは TPS より良く、多いと同じく平面の誤差に近づきます。`, 12),
      beat('3変数以上で使うときは、標準化し、関係のない変数を外し、平面（線形回帰）の誤差と比べて効果を確かめることが大切です。', 11),
    ],
    build(ui) {
      ui.text('1つの変数の単位だけを変える（3変数）', { ...TITLE, x: 140, y: 112 });
      ui.text(`縦軸は誤差（RMSE）。点 ${D.pointCount} 個、新しい点 ${D.testCount} 個、${D.repeats} 回の平均`, { x: 140, y: 146, size: 17, color: C.muted });
      ui.text('関係のない変数を足す（効く変数は2つ）', { ...TITLE, x: 790, y: 112, at: 1 });
      ui.text('比べる基準は平面（線形回帰）', { x: 790, y: 146, size: 17, color: C.muted, at: 1 });
    },
    draw(ctx, s) {
      const a = s.p(0, 0.6);
      P_UNIT.axes(ctx, { xticks: [1, 10, 100, 1000], yticks: [0, 0.3, 0.6, 0.9], fmtX: (v) => `×${v}`, fmtY: (v) => fmt(v, 1), xlabel: '単位の倍率', alpha: a });
      const growUnit = s.p(0, 3.0, 0.5);
      P_UNIT.line(ctx, SCALES, pick(D.units, 'plane'), { color: PLANE_COLOR, width: 3, dash: [8, 7], upto: growUnit });
      P_UNIT.line(ctx, SCALES, pick(D.units, 'tps'), { color: POLY_COLOR, width: 4, upto: growUnit });
      P_UNIT.dots(ctx, SCALES, pick(D.units, 'tps'), { r: 6, color: POLY_COLOR, alpha: growUnit });
      legend(ctx, [{ color: POLY_COLOR, label: 'TPS' }, { color: PLANE_COLOR, dash: [8, 7], label: '平面' }], 340, 205, { alpha: a, size: 16 });

      const b = s.p(1, 0.6);
      if (b <= 0) return;
      P_ERR.axes(ctx, { xticks: [2, 5, 10, 20, 50], yticks: [0, 0.5, 1], fmtY: (v) => fmt(v, 1), xlabel: '変数の数 d', alpha: b });
      const growErr = s.p(1, 3.0, 0.5);
      P_ERR.line(ctx, DIMS, pick(D.errors, 'plane'), { color: PLANE_COLOR, width: 3, dash: [8, 7], upto: growErr });
      P_ERR.line(ctx, DIMS, pick(D.errors, 'tps'), { color: POLY_COLOR, width: 4, upto: growErr });
      P_ERR.dots(ctx, DIMS, pick(D.errors, 'tps'), { r: 5, color: POLY_COLOR, alpha: growErr });
      const growGauss = s.p(2, 2.4, 0.3);
      P_ERR.line(ctx, DIMS, pick(D.errors, 'gaussFixed'), { color: GAUSS_COLOR, width: 3.5, upto: growGauss });
      P_ERR.line(ctx, DIMS, pick(D.errors, 'gaussScaled'), { color: C.aqua, width: 3.5, upto: growGauss });
      legend(ctx, [{ color: POLY_COLOR, label: 'TPS' }, { color: PLANE_COLOR, dash: [8, 7], label: '平面' }], 810, 205, { alpha: b, size: 16 });
      legend(ctx, [{ color: GAUSS_COLOR, label: `ガウス（ε = ${D.fixedEps} 固定）` }, { color: C.aqua, label: 'ガウス（ε ＝ 1 ÷ 距離の中央値）' }], 1000, 205, { alpha: growGauss > 0 ? 1 : 0, size: 16, gap: 18 });
    },
  });
})();
