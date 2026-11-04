// scenes-basic.js — はじめに、この動画のポイント、第1〜4章（補間の問題、RBF 補間、基底関数の種類、多項式の項）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値（重み、条件数など）は手で書かず、rbf-math.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, texNum, canvasText, keyframes, lerp, rgba, clamp, legend, seqColor, heatmapCanvas, drawImage, roundRect } = KIT;
  const M = RBFM;
  const V3 = VIEW3D;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };

  // 線の色: ガウス RBF = 青、多項式つき（r³・TPS）= 橙
  const GAUSS_COLOR = C.blue;
  const POLY_COLOR = C.orange;

  // ---- 1次元の例（7点）----
  const X1 = M.DATA1_X.map((x) => [x]);
  const EPS_DEMO = 0.7; // 第2章の組み立てに使うガウスの幅
  const GAUSS_DEMO = M.fit(X1, M.DATA1_Y, M.BASIS.gaussian(EPS_DEMO));
  const CUBIC_DEMO = M.fit(X1, M.DATA1_Y, M.BASIS.cubic(), { degree: 1 });
  const PLOT_SAMPLES = 360;
  const sampleXs = (a, b, count = PLOT_SAMPLES) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  const curve = (xs, f) => xs.map((x) => f(x));

  // ---- 2次元の例（14点）----
  const DOMAIN = [-1.1, 1.1];
  const GRID_N = 40;
  const TPS2 = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.thinPlate(), { degree: 1 });
  const Z_LO = -0.7;
  const Z_HI = 1.0;
  const zColor = V3.heightColor(Z_LO, Z_HI);
  const pinsFor = (top = 1) => M.DATA2_P.map(([x, y], j) => ({ x, y, z: M.DATA2_Y[j], top, head: `rgb(${zColor(M.DATA2_Y[j]).map(Math.round).join(',')})` }));

  // 字幕に出す、上付きの指数（例: 4.2 × 10⁹）
  const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sci = (value, digits = 1) => {
    if (value < 1000) return fmt(value, value < 10 ? 2 : 0);
    const exponent = Math.floor(Math.log10(value));
    return `${(value / 10 ** exponent).toFixed(digits)} × 10${String(exponent).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`;
  };

  // カードの背景を透明にする（カードの中にキャンバスの図を描くため。HTML の部品はキャンバスより手前に重なる）
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('RBF と TPS を、式と図を使って解説します。散らばった点から、なめらかな面を作る方法です。', 7),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('全部で8章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('RBF と TPS', { x: 0, y: 92, w: W, align: 'center', size: 78, weight: 800 });
      ui.text('放射基底関数（RBF）による補間と、薄板スプライン（TPS）', { x: 0, y: 204, w: W, align: 'center', size: 34, color: C.text2, delay: 0.3 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, {
          x: left ? 150 : 830,
          y: 300 + (left ? i : i - 4) * 52,
          size: 25,
          delay: 0.6 + 0.12 * i,
        });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 150, y: 540, size: 24, at: 1 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>図で見る`, { x: 150, y: 588, size: 24, at: 1, delay: 0.2 });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 830, y: 540, size: 24, at: 2 });
      ui.text('例のデータは説明用に作ったものです（1次元の7点、2次元の14点など）', { x: 830, y: 594, size: 20, color: C.muted, at: 2, delay: 0.4 });
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
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① RBF 補間は、各点に「距離だけで決まる山」を置き、重みをつけて足し合わせる方法です。', 9),
      beat(R`② TPS（薄板スプライン）は RBF の一種です。基底関数 $r^2\log r$ に平面を足したものです。`, 9),
      beat('③ TPS は、すべての点を通る面の中で、板の曲げエネルギーが最小のもの。幅のパラメータがなく、調整がいりません。', 10),
      beat(R`④ ガウス RBF は幅 $\varepsilon$ の調整が必要で、点の外では 0 に戻ります。TPS は外側で平面に沿います。ノイズには平滑化を使います。`, 11),
      beat('このつながりを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① RBF 補間 ＝ 距離の山を足す', R`各点に、距離 $r$ だけで決まる山 $\varphi(r)$ を置き、重み $w_j$ を掛けて足す。重みは連立方程式で決まる`],
        ['② TPS は RBF の一種', R`$\varphi(r) = r^2\log r$ に<br>平面（1次式）を足した RBF が<br>TPS（薄板スプライン）`],
        ['③ TPS ＝ 曲げエネルギー最小の板', '全点を通る面の中で、板の曲げエネルギーが最小。幅のパラメータがなく、調整がいらない'],
        ['④ 使い分けと平滑化', R`ガウスは幅 $\varepsilon$ しだいで、点の外では 0 へ戻る。TPS は外側で平面に沿う。ノイズには平滑化 $\lambda$`],
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

      // ① 山を足す
      const a1 = s.p(1, 0.8, 0.4);
      if (a1 > 0) {
        const f = fig(0);
        const P = new Plot({ ...f, xr: [-0.3, 9.6], yr: [-0.5, 2.3] });
        ctx.save();
        ctx.globalAlpha = a1;
        const xs = sampleXs(-0.3, 9.6, 200);
        const grow = s.p(1, 2.0, 0.8);
        M.DATA1_X.forEach((xj, j) => {
          const bump = curve(xs, (x) => GAUSS_DEMO.w[j] * Math.exp(-((EPS_DEMO * (x - xj)) ** 2)));
          P.line(ctx, xs, bump, { color: GAUSS_COLOR, width: 2, alpha: 0.7 });
        });
        P.hline(ctx, 0, { color: C.axis, dash: null, width: 1 });
        P.line(ctx, xs, curve(xs, (x) => GAUSS_DEMO.at([x])), { color: C.yellow, width: 3.5, upto: grow });
        P.dots(ctx, M.DATA1_X, M.DATA1_Y, { r: 5, color: C.text });
        ctx.restore();
      }

      // ② 包含の図: RBF 補間 ⊃ 多重調和スプライン ⊃ TPS
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const f = fig(1);
        ctx.save();
        ctx.globalAlpha = a2;
        ctx.lineWidth = 2;
        roundRect(ctx, f.x, f.y, f.w, f.h, 18);
        ctx.strokeStyle = rgba(C.text2, 0.8);
        ctx.stroke();
        canvasText(ctx, 'RBF 補間', f.x + 14, f.y + 28, { size: 19, color: C.text, weight: 700 });
        ctx.beginPath();
        ctx.ellipse(f.x + 62, f.y + 130, 50, 62, 0, 0, Math.PI * 2);
        ctx.strokeStyle = GAUSS_COLOR;
        ctx.stroke();
        canvasText(ctx, 'ガウス', f.x + 62, f.y + 122, { size: 17, color: C.text2, align: 'center' });
        canvasText(ctx, 'など', f.x + 62, f.y + 146, { size: 17, color: C.text2, align: 'center' });
        ctx.beginPath();
        ctx.ellipse(f.x + 182, f.y + 130, 72, 80, 0, 0, Math.PI * 2);
        ctx.strokeStyle = POLY_COLOR;
        ctx.stroke();
        canvasText(ctx, '多重調和', f.x + 182, f.y + 82, { size: 16, color: C.text2, align: 'center' });
        const k = s.p(2, 0.8, 1.2);
        ctx.beginPath();
        ctx.ellipse(f.x + 182, f.y + 145, 46, 34, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(C.yellow, 0.25 + 0.35 * k);
        ctx.fill();
        ctx.strokeStyle = C.yellow;
        ctx.stroke();
        canvasText(ctx, 'TPS', f.x + 182, f.y + 152, { size: 21, color: C.text, align: 'center', weight: 800 });
        ctx.restore();
      }

      // ③ 板（TPS の面とピン）
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const f = fig(2);
        const view = new V3.View({ cx: f.x + f.w / 2, cy: f.y + f.h / 2 + 18, scale: 78, azimuth: -0.7 + 0.05 * (s.u - s.bt(3)), elevation: 0.55, zScale: 0.6, zBase: -0.9 });
        const grid = V3.sampleGrid((x, y) => TPS2.at([x, y]), [-1.05, 1.05], [-1.05, 1.05], 22);
        ctx.save();
        ctx.globalAlpha = a3;
        V3.drawFloor(ctx, view, [-1.05, 1.05], [-1.05, 1.05], { step: 1.05 });
        V3.drawScene(ctx, view, { grid, color: zColor, pins: pinsFor(), headRadius: 4 });
        ctx.restore();
      }

      // ④ 点の外側: ガウスは 0 へ、r³ ＋ 直線はまっすぐ
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const f = fig(3);
        const P = new Plot({ ...f, h: f.h - 34, xr: [-3, 12.5], yr: [-1.6, 3.4] });
        ctx.save();
        ctx.globalAlpha = a4;
        P.shade(ctx, -3, M.DATA1_X[0], { alpha: 0.06 });
        P.shade(ctx, M.DATA1_X[M.DATA1_X.length - 1], 12.5, { alpha: 0.06 });
        P.hline(ctx, 0, { color: C.axis, dash: null, width: 1 });
        const xs = sampleXs(-3, 12.5, 240);
        const grow = s.p(4, 2.2, 0.8);
        P.line(ctx, xs, curve(xs, (x) => GAUSS_DEMO.at([x])), { color: GAUSS_COLOR, width: 3, upto: grow });
        P.line(ctx, xs, curve(xs, (x) => CUBIC_DEMO.at([x])), { color: POLY_COLOR, width: 3, upto: grow });
        P.dots(ctx, M.DATA1_X, M.DATA1_Y, { r: 5, color: C.text });
        legend(ctx, [{ color: GAUSS_COLOR, label: 'ガウス' }, { color: POLY_COLOR, label: 'TPS 型' }], f.x + 4, f.y + f.h - 4, { size: 16, gap: 16 });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（補間の問題）
  // 一直線に並んだ3点（[−1, 1]² の中）。値も1本の直線の上にあるので、それを通る平面は無数にある
  const LINE3 = [[-0.8, -0.4], [0, 0], [0.8, 0.4]];
  const LINE3_Z = LINE3.map(([x]) => 0.45 + 0.375 * x);
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '補間の問題 ― 散らばった点から面を作る',
    beats: [
      beat(R`データ点 $(\mathbf{x}_i, y_i)$ が $n$ 個あります。すべての点を通るなめらかな関数 $s(\mathbf{x})$ を作るのが、補間です。`, 9),
      beat('点が格子の上にあれば、各方向のスプラインを掛け合わせる方法が使えます。しかし実際のデータは、ばらばらに散らばっていることが多いのです。', 11),
      beat(R`決まった基底、たとえば $1, x, y$ の平面で3点を通そうとします。3点が一直線に並ぶと、面が1つに決まりません。`, 10),
      beat('2次元以上では、どんな決まった基底を使っても、点の並び方によっては解けなくなります（マイルフーバー・カーチスの定理）。', 11),
      beat('そこで、基底をデータ点の位置に合わせて作ります。これが RBF の発想です。', 7),
    ],
    build(ui) {
      ui.tex(R`\text{データ：}\ (\mathbf{x}_1, y_1),\ \dots,\ (\mathbf{x}_n, y_n),\qquad \mathbf{x}_i \in \mathbb{R}^d`, { x: LEFT_X, y: 128, size: 30 });
      ui.tex(R`s(\mathbf{x}_i) = y_i\qquad (i = 1, \dots, n)`, { x: LEFT_X, y: 196, size: 36, delay: 0.6 });
      ui.text('補間の条件：すべての点を通る', { x: LEFT_X + 480, y: 204, size: 23, color: C.text2, delay: 1.0 });
      ui.text('格子の上の点 → 各方向のスプラインを掛け合わせればよい', { x: LEFT_X, y: 290, size: 24, at: 1 });
      ui.text('散らばった点（散布データ）→ 格子を前提にした方法が使えない', { x: LEFT_X, y: 336, size: 24, at: 1, delay: 0.8 });
      ui.tex(R`s(x, y) = c_0 + c_1 x + c_2 y`, { x: LEFT_X, y: 420, size: 32, at: 2 });
      ui.text(R`決まった基底 $1, x, y$ で3点を通す → 3点が一直線だと、<span style="color:${C.red}">面が1つに決まらない</span>`, { x: LEFT_X, y: 480, size: 23, color: C.text2, at: 2, delay: 0.5 });
      ui.text('マイルフーバー・カーチスの定理：2次元以上では、どんな決まった基底でも、点の並び方によっては解けない', { x: LEFT_X, y: 556, w: 880, size: 23, at: 3, lh: 1.5 });
      ui.text('→ 基底を、データ点の位置に合わせて作る（RBF の発想）', { x: LEFT_X, y: 660, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      seeThrough(ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 240, title: '格子の点と、散らばった点', at: 1 }));
      ui.text('格子', { x: CARD_X + 60, y: 330, w: 170, align: 'center', size: 20, color: C.text2, at: 1 });
      ui.text('散布', { x: CARD_X + 290, y: 330, w: 170, align: 'center', size: 20, color: C.text2, at: 1 });
      seeThrough(ui.card({ x: CARD_X, y: 392, w: CARD_W, h: 348, title: R`決まった基底 $1, x, y$ で3点を通す`, at: 2 }));
    },
    draw(ctx, s) {
      // 格子と散布の点
      const a = s.p(1, 0.6);
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = a;
        const box = (x0, points) => {
          ctx.strokeStyle = C.grid;
          ctx.strokeRect(x0 + 0.5, 178.5, 170, 140);
          points.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x0 + 85 + x * 75, 248 - y * 60, 5, 0, Math.PI * 2);
            ctx.fillStyle = C.text;
            ctx.fill();
          });
        };
        const lattice = [];
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) lattice.push([-1 + i * 0.5, -1 + j * (2 / 3)]);
        box(CARD_X + 60, lattice);
        box(CARD_X + 290, M.DATA2_P);
        ctx.restore();
      }
      // 一直線の3点を通る平面は、その直線のまわりに回せる
      const b = s.p(2, 0.6);
      if (b > 0) {
        const tilt = 0.375 + 0.42 * Math.sin(1.3 * (s.u - s.bt(2)));
        const by = 2 * (0.375 - tilt); // 3点を通る条件: a + 0.5b = 0.375
        const view = new V3.View({ cx: CARD_X + CARD_W / 2, cy: 600, scale: 108, azimuth: -0.5, elevation: 0.5, zScale: 0.9, zBase: -0.6 });
        const grid = V3.sampleGrid((x, y) => 0.45 + tilt * x + by * y, [-1, 1], [-1, 1], 12);
        ctx.save();
        ctx.globalAlpha = b;
        V3.drawFloor(ctx, view, [-1, 1], [-1, 1], { step: 1 });
        const pins = LINE3.map(([x, y], j) => ({ x, y, z: LINE3_Z[j], head: C.yellow }));
        V3.drawScene(ctx, view, { grid, color: () => [57, 135, 229], alpha: 0.75, pins, headRadius: 6 });
        canvasText(ctx, '面が回る → 1つに決まらない', CARD_X + CARD_W - 20, 724, { size: 18, color: C.red, weight: 700, align: 'right' });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（散らばった点に面を張る）
  const VIEW_1V = { cx: 540, cy: 455, scale: 245, zScale: 0.55, zBase: -0.9 };
  const NEAREST_GRID = V3.sampleGrid((x, y) => M.nearest(M.DATA2_P, M.DATA2_Y)([x, y]), DOMAIN, DOMAIN, GRID_N);
  const IDW_GRID = V3.sampleGrid((x, y) => M.inverseDistance(M.DATA2_P, M.DATA2_Y)([x, y]), DOMAIN, DOMAIN, GRID_N);
  const TPS_GRID = V3.sampleGrid((x, y) => TPS2.at([x, y]), DOMAIN, DOMAIN, GRID_N);
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '散らばった点に、面を張る',
    beats: [
      beat('例のデータです。正方形の中に、14個の点が散らばっています。色が、各点の値です。', 8),
      beat('斜めから見ると、値の高さの棒が立っています。この棒の先を、すべて通る面を作ります。', 8),
      beat('いちばん近い点の値を使うと、階段状の面になります。全点を通りますが、なめらかではありません。', 9),
      beat('距離の逆数で重みをつけて平均する「逆距離加重」では、点の上で平らになり、でこぼこした面になります。', 10),
      beat('RBF 補間なら、すべての点を通る、なめらかな面になります。この作り方を見ていきます。', 9),
    ],
    build(ui) {
      const X = 1050;
      ui.text('14個の点（色 ＝ 値）', { ...TITLE, x: X, y: 140 });
      ui.text(`<span class="pill" style="background:${C.muted}">最近傍</span>いちばん近い点の値`, { x: X, y: 262, size: 23, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('→ 階段状（なめらかでない）', { x: X + 30, y: 304, size: 21, color: C.text2, at: 2, delay: 0.5 });
      ui.text(`<span class="pill" style="background:${C.muted}">逆距離加重</span>距離²の逆数で重みをつけた平均`, { x: X, y: 382, size: 23, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text('→ 点の上で平ら、でこぼこ', { x: X + 30, y: 424, size: 21, color: C.text2, at: 3, delay: 0.5 });
      ui.text(`<span class="pill" style="background:${C.visual}">RBF 補間</span>TPS（$r^2\\log r$ ＋ 平面）`, { x: X, y: 502, size: 23, at: 4, glow: [{ from: 4, color: C.aqua }] });
      ui.text('→ なめらかで、全点を通る', { x: X + 30, y: 544, size: 21, color: C.text2, at: 4, delay: 0.5 });
    },
    draw(ctx, s) {
      const tiltK = s.p(1, 2.4);
      const view = new V3.View({
        ...VIEW_1V,
        azimuth: lerp(0, -0.62, tiltK) + 0.012 * Math.max(0, s.u - s.bt(1)),
        elevation: lerp(Math.PI / 2, 0.55, tiltK),
      });
      ctx.globalAlpha = s.p(0, 0.6);
      V3.drawFloor(ctx, view, DOMAIN, DOMAIN);
      const k1 = s.p(3, 2.0);
      const k2 = s.p(4, 2.0);
      const grid = V3.blendGrid(V3.blendGrid(NEAREST_GRID, IDW_GRID, k1), TPS_GRID, k2);
      V3.drawScene(ctx, view, { grid, color: zColor, alpha: s.p(2, 1.0), pins: pinsFor(tiltK), headRadius: 9 });
      V3.rampBar(ctx, V3.heightRamp, 1460, 150, 18, 170, {
        labels: [[0, fmt(Z_LO, 1)], [0.5, fmt((Z_LO + Z_HI) / 2, 2)], [1, fmt(Z_HI, 1)]],
        title: '値',
        alpha: s.p(0, 0.8),
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（RBF 補間の式）
  const DEMO3_X = [0, 1, 3];
  const DEMO3_PHI = M.kernelMatrix(DEMO3_X.map((x) => [x]), M.BASIS.gaussian(1));
  const DEMO3_TEX = DEMO3_PHI.map((row) => row.map((v) => texNum(v, 3)).join(' & ')).join(R` \\ `);
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: 'RBF 補間 ― 距離の関数を足し合わせる',
    beats: [
      beat(R`放射基底関数（RBF）とは、中心からの距離 $r$ だけで値が決まる関数 $\varphi(r)$ です。同じ距離なら、どの向きでも同じ値。等高線は同心円になります。`, 11),
      beat(R`RBF 補間では、データ点 $\mathbf{x}_j$ を中心に $\varphi$ を置き、重み $w_j$ を掛けて足し合わせます。`, 8),
      beat(R`すべての点を通る条件を書くと、重みの連立方程式 $\Phi\mathbf{w} = \mathbf{y}$ になります。$\Phi$ は点どうしの距離だけで決まる行列です。`, 11),
      beat(R`未知数も式も $n$ 個ずつなので、$\Phi$ に逆行列があれば、重みがただ1つに決まります。`, 8),
      beat('距離しか使わないので、1次元でも2次元でも3次元でも、同じ式で書けます。', 7),
    ],
    build(ui) {
      ui.tex(R`\varphi(r),\qquad r = \lVert \mathbf{x} - \mathbf{x}_j \rVert`, { x: LEFT_X, y: 128, size: 34 });
      ui.text(R`放射基底関数：中心 $\mathbf{x}_j$ からの距離 $r$ だけで値が決まる`, { x: LEFT_X, y: 192, size: 23, color: C.text2, delay: 0.6 });
      ui.tex(R`s(\mathbf{x}) = \sum_{j=1}^{n} \htmlClass{hlW}{w_j}\, \htmlClass{hlPhi}{\varphi(\lVert \mathbf{x} - \mathbf{x}_j \rVert)}`, {
        x: LEFT_X, y: 252, size: 40, at: 1,
        hl: [{ cls: 'hlW', from: 1, to: 2, color: C.yellow }, { cls: 'hlPhi', from: 1, to: 2, color: C.aqua }],
      });
      ui.text(R`データ点 $\mathbf{x}_j$ を中心に $\varphi$ を置き、重み $w_j$ を掛けて足す`, { x: LEFT_X, y: 382, size: 23, color: C.text2, at: 1, delay: 0.6 });
      ui.tex(R`s(\mathbf{x}_i) = y_i \ \ (i = 1, \dots, n)\quad\Longrightarrow\quad \Phi\mathbf{w} = \mathbf{y}`, { x: LEFT_X, y: 436, size: 32, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.tex(R`\Phi = \begin{bmatrix} \varphi(r_{11}) & \cdots & \varphi(r_{1n}) \\ \vdots & \ddots & \vdots \\ \varphi(r_{n1}) & \cdots & \varphi(r_{nn}) \end{bmatrix},\qquad r_{ij} = \lVert \mathbf{x}_i - \mathbf{x}_j \rVert`, { x: LEFT_X, y: 500, size: 24, at: 2, delay: 0.6 });
      ui.text(R`未知数 $n$ 個・式 $n$ 個 → $\Phi$ に逆行列があれば、重みがただ1つに決まる`, { x: LEFT_X, y: 640, size: 23, at: 3 });
      ui.text('→ 距離しか使わない：何次元でも同じ式', { x: LEFT_X, y: 690, size: 26, weight: 700, color: C.yellow, at: 4 });

      seeThrough(ui.card({ x: CARD_X, y: 128, w: CARD_W, h: 340, title: R`ガウス型 $\varphi(r) = e^{-r^2}$ の例` }));
      ui.text('どの向きも、距離が同じなら同じ値', { x: CARD_X + 24, y: 424, size: 19, color: C.text2, delay: 0.8 });
      ui.card({ x: CARD_X, y: 494, w: CARD_W, h: 246, title: R`3点 $x = 0,\ 1,\ 3$ のとき（1次元）`, at: 2 });
      ui.tex(R`\Phi = \begin{bmatrix} ${DEMO3_TEX} \end{bmatrix}`, { x: CARD_X + 40, y: 550, size: 28, at: 2, delay: 0.6 });
      ui.text('対角は φ(0) = 1、遠い点どうしほど 0 に近い', { x: CARD_X + 24, y: 694, size: 19, color: C.text2, at: 2, delay: 1.0 });
    },
    draw(ctx, s, st) {
      const a = s.p(0, 0.8, 0.3);
      if (a <= 0) return;
      // 同心円の等高線を持つ山（1マス 1画素の画像を拡大して描く）
      const size = 220;
      const x0 = CARD_X + 40;
      const y0 = 182;
      st.bump = st.bump || heatmapCanvas(96, 96, (i, j) => {
        const r = Math.hypot((j - 47.5) / 30, (i - 47.5) / 30);
        return seqColor(Math.exp(-r * r));
      });
      ctx.save();
      ctx.globalAlpha = a;
      drawImage(ctx, st.bump, x0, y0, size, size, { smooth: true });
      ctx.strokeStyle = rgba(C.text, 0.55);
      ctx.lineWidth = 1.5;
      [0.8, 0.5, 0.25, 0.1].forEach((level) => {
        const r = Math.sqrt(-Math.log(level)) * (size / 96) * 30;
        ctx.beginPath();
        ctx.arc(x0 + size / 2, y0 + size / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // 中心から右へ、距離 r の矢印
      const k = s.p(0, 1.2, 1.0);
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0 + size / 2, y0 + size / 2);
      ctx.lineTo(x0 + size / 2 + 80 * k * Math.cos(-0.6), y0 + size / 2 + 80 * k * Math.sin(-0.6));
      ctx.stroke();
      canvasText(ctx, 'r', x0 + size / 2 + 50, y0 + size / 2 - 50, { size: 22, color: C.yellow, weight: 700, alpha: k });
      // 右に断面（φ を r の関数として）
      const P = new Plot({ x: CARD_X + 290, y: 200, w: 180, h: 170, xr: [0, 2.5], yr: [0, 1.1] });
      P.axes(ctx, { xticks: [0, 1, 2], yticks: [0, 1], xlabel: 'r', fmtY: (v) => fmt(v, 0) });
      const rs = sampleXs(0, 2.5, 120);
      P.line(ctx, rs, curve(rs, (r) => Math.exp(-r * r)), { color: C.aqua, width: 3, upto: k });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（1次元で組み立てる）
  const P2 = new Plot({ x: 150, y: 150, w: 1320, h: 320, xr: [-0.5, 10], yr: [-0.8, 2.4] });
  const PW = new Plot({ x: 150, y: 582, w: 1320, h: 140, xr: [-0.5, 10], yr: [-0.5, 2.0] });
  const XS2 = sampleXs(-0.5, 10);
  const BUMPS = M.DATA1_X.map((xj) => curve(XS2, (x) => Math.exp(-((EPS_DEMO * (x - xj)) ** 2))));
  const BUILD_SECONDS = 5.5;
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '1次元で組み立てる（ガウス型の山）',
    beats: [
      beat('1次元で組み立ててみます。7つの点を、すべて通る曲線を作ります。', 6),
      beat('まず、各点を中心に、ガウス型の山を1つずつ置きます。高さは、どれも1です。', 8),
      beat('連立方程式を解いて重みを求め、山を重み倍します。重みが負の山は、下向きの谷になります。下の棒が重みです。', 10),
      beat('重みをつけた山を、左から順に足していきます。', 7.5),
      beat('7つ全部を足すと、すべての点をぴったり通る曲線になりました。山を足すだけで、補間ができます。', 9),
    ],
    build(ui) {
      ui.text(R`山 $w_j\,\varphi(\lvert x - x_j \rvert)$、$\varphi(r) = e^{-(\varepsilon r)^2}$、$\varepsilon = ${EPS_DEMO}$`, { x: 900, y: 112, size: 21, color: C.text2, at: 1 });
      ui.text(R`重み $w_j$（$\Phi\mathbf{w} = \mathbf{y}$ の解）`, { ...TITLE, x: 150, y: 520, at: 2 });
    },
    draw(ctx, s) {
      P2.axes(ctx, { xticks: [0, 2, 4, 6, 8, 10], yticks: [-0.5, 0, 0.5, 1, 1.5, 2], xlabel: 'x', fmtY: (v) => fmt(v, 1), alpha: s.p(0, 0.6) });
      const morph = s.p(2, 1.6);
      const build = clamp((s.u - s.bt(3)) / BUILD_SECONDS) * M.DATA1_X.length;
      const done = s.u >= s.bt(4);
      // 山（重みをつける前は高さ 1、つけたあとは wⱼ 倍）
      M.DATA1_X.forEach((xj, j) => {
        const appear = s.p(1, 0.5, 0.25 * j);
        if (appear <= 0) return;
        const scale = lerp(1, GAUSS_DEMO.w[j], morph);
        const used = build > j + 1 || done;
        const current = !done && build > j && build <= j + 1;
        P2.line(ctx, XS2, BUMPS[j].map((v) => v * scale), {
          color: current ? C.yellow : GAUSS_COLOR,
          width: current ? 3 : 2,
          alpha: appear * (used ? 0.28 : 0.8),
        });
      });
      // 足し合わせた曲線（左の山から順に）
      if (s.u >= s.bt(3)) {
        const full = Math.floor(build);
        const frac = build - full;
        const ys = XS2.map((x, i) => {
          let sum = 0;
          for (let j = 0; j < M.DATA1_X.length; j++) {
            const k = j < full ? 1 : j === full ? frac : 0;
            sum += k * GAUSS_DEMO.w[j] * BUMPS[j][i];
          }
          return sum;
        });
        P2.line(ctx, XS2, ys, { color: C.yellow, width: 4 });
      }
      const ring = s.win(4);
      P2.dots(ctx, M.DATA1_X, M.DATA1_Y, { r: 8, color: C.text, alpha: s.p(0, 0.6) });
      if (ring > 0) {
        ctx.save();
        ctx.globalAlpha = ring;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 3;
        M.DATA1_X.forEach((x, i) => {
          ctx.beginPath();
          ctx.arc(P2.sx(x), P2.sy(M.DATA1_Y[i]), 14, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }
      // 重みの棒
      const stems = s.p(2, 1.6);
      if (stems > 0) {
        PW.axes(ctx, { xticks: [], yticks: [0, 1, 2], fmtY: (v) => fmt(v, 0), alpha: stems });
        ctx.save();
        ctx.globalAlpha = stems;
        M.DATA1_X.forEach((x, j) => {
          const w = GAUSS_DEMO.w[j] * stems;
          ctx.strokeStyle = w >= 0 ? GAUSS_COLOR : C.red;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(PW.sx(x), PW.sy(0));
          ctx.lineTo(PW.sx(x), PW.sy(w));
          ctx.stroke();
          canvasText(ctx, fmt(GAUSS_DEMO.w[j], 2), PW.sx(x) + 12, PW.sy(Math.max(w, 0)) + (w >= 0 ? 4 : 18), { size: 17, color: C.text2 });
        });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（基底関数の種類）
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: R`基底関数の種類 ― 形と幅 $\varepsilon$`,
    beats: [
      beat('よく使う基底関数です。大きく2つの仲間に分かれます。', 6),
      beat(R`ガウスや多重二次は、幅を決める形状パラメータ $\varepsilon$ を持ちます。$\varepsilon$ が大きいほど、山が細くなります。`, 9),
      beat(R`$r^3$ や $r^2\log r$ は多重調和スプラインと呼ばれる仲間で、$\varepsilon$ がありません。最後の $r^2\log r$ が TPS の基底関数です。`, 11),
      beat(R`ガウスなどの「正定値」の関数なら、点がすべて異なれば、$\Phi$ は必ず逆行列を持ちます。`, 8),
      beat('多重調和スプラインは「条件付き正定値」。そのままでは解けないことがあり、多項式の項を足して使います。', 10),
    ],
    build(ui) {
      ui.table({
        x: LEFT_X, y: 128, widths: [300, 290, 110, 250], aligns: ['left', 'center', 'center', 'center'], size: 22, rowH: 58,
        header: ['名前', R`$\varphi(r)$`, R`幅 $\varepsilon$`, '性質'],
        rows: [
          ['ガウス', R`$e^{-(\varepsilon r)^2}$`, 'あり', '正定値'],
          ['逆多重二次', R`$1 / \sqrt{1 + (\varepsilon r)^2}$`, 'あり', '正定値'],
          ['多重二次', R`$\sqrt{1 + (\varepsilon r)^2}$`, 'あり', '条件付き正定値'],
          ['3乗（多重調和）', R`$r^3$`, 'なし', '条件付き正定値'],
          [`<b style="color:${C.yellow}">薄板スプライン（TPS）</b>`, R`$r^2 \log r$`, 'なし', '条件付き正定値'],
        ],
        rowAt: [1, 1, 1, 2, 2],
        rowDelay: 0,
        glowRows: [[{ from: 1, to: 2, color: C.blue }], [{ from: 1, to: 2, color: C.blue }], [{ from: 1, to: 2, color: C.blue }], [{ from: 2, to: 3, color: C.orange }], [{ from: 2, to: 3, color: C.yellow }]],
      });
      ui.text('正定値：点がすべて異なれば、$\\Phi$ は必ず逆行列を持つ（必ず解ける）', { x: LEFT_X, y: 520, size: 24, at: 3 });
      ui.text('条件付き正定値：そのままでは解けないことがある', { x: LEFT_X, y: 586, size: 24, at: 4 });
      ui.text('→ 多項式の項を足し、重みに条件をつけて使う（第4章）', { x: LEFT_X + 30, y: 632, size: 24, color: C.yellow, weight: 700, at: 4, delay: 0.6 });

      ui.card({ x: CARD_X + 60, y: 128, w: CARD_W - 60, h: 470, title: '2つの仲間', accent: C.text2 });
      ui.text(`<span class="pill" style="background:${C.blue}">ε あり</span>`, { x: CARD_X + 90, y: 186, size: 23, at: 1 });
      ui.text('山の幅を ε で決める<br>ε を選ぶ必要がある<br>（ガウス、逆多重二次、多重二次）', { x: CARD_X + 90, y: 232, size: 21, color: C.text2, at: 1, delay: 0.3 });
      ui.text(`<span class="pill" style="background:${C.orange}">ε なし</span>`, { x: CARD_X + 90, y: 390, size: 23, at: 2 });
      ui.text('多重調和スプライン<br>多項式とセットで使う<br>TPS はこの仲間', { x: CARD_X + 90, y: 436, size: 21, color: C.text2, at: 2, delay: 0.3 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（形と ε の影響）
  const PA = new Plot({ x: 130, y: 160, w: 420, h: 220, xr: [0, 3], yr: [0, 3.2] });
  const PB = new Plot({ x: 130, y: 500, w: 420, h: 220, xr: [0, 2], yr: [-0.5, 3] });
  const PC = new Plot({ x: 730, y: 160, w: 770, h: 290, xr: [-0.5, 10], yr: [-1.2, 2.6] });
  const GAUGE = { x: 730, y: 590, w: 770, h: 24, max: 16 };
  const RS_A = sampleXs(0, 3, 200);
  const RS_B = sampleXs(0, 2, 200);
  const XS3 = sampleXs(-0.5, 10, 300);
  const S3V = {
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: R`基底関数の形と、幅 $\varepsilon$ の影響`,
    beats: [
      beat(R`左上は $\varepsilon$ を持つ関数。ガウスと逆多重二次は離れると 0 に近づく山、多重二次は離れるほど大きくなります。`, 10),
      beat(R`左下は $\varepsilon$ のない関数。$r^2\log r$ は $r = 1$ で 0 を横切り、その内側ではわずかに負になります。`, 9),
      beat(R`右はガウス RBF で幅 $\varepsilon$ を変えた補間。$\varepsilon$ が大きい（山が細い）と、点の間で 0 に落ち、とげのような曲線になります。`, 11),
      beat(R`$\varepsilon$ を小さく（山を太く）すると、なめらかになります。しかし重みが巨大になり、$\Phi$ の条件数が急に大きくなって、計算が不安定になります。`, 13),
      beat(R`精度と安定性の取り合いです。ガウス RBF では、$\varepsilon$ の選び方が結果を大きく左右します。`, 9),
    ],
    build(ui) {
      ui.text(R`$\varepsilon$ あり（$\varepsilon = 1$）`, { ...TITLE, x: 130, y: 112 });
      ui.text(R`$\varepsilon$ なし（多重調和スプライン）`, { ...TITLE, x: 130, y: 452, at: 1 });
      ui.text(R`ガウス RBF の補間（$\varepsilon$ を変える）`, { ...TITLE, x: 730, y: 112, at: 2 });
      ui.text(R`条件数 $\mathrm{cond}(\Phi)$（最大固有値 ÷ 最小固有値）`, { ...TITLE, x: 730, y: 545, at: 3 });
      ui.text(R`$10^k$ なら、計算で約 $k$ 桁の精度を失う（倍精度の数は約16桁）`, { x: 730, y: 676, size: 20, color: C.text2, at: 3, delay: 0.8 });
    },
    draw(ctx, s) {
      // 左上: ε あり
      const a = s.p(0, 0.6);
      PA.axes(ctx, { xticks: [0, 1, 2, 3], yticks: [0, 1, 2, 3], xlabel: 'r', alpha: a });
      const growA = s.p(0, 1.6, 0.4);
      PA.line(ctx, RS_A, curve(RS_A, M.BASIS.gaussian(1)), { color: C.blue, width: 3, upto: growA });
      PA.line(ctx, RS_A, curve(RS_A, M.BASIS.inverseMultiquadric(1)), { color: C.aqua, width: 3, upto: growA });
      PA.line(ctx, RS_A, curve(RS_A, M.BASIS.multiquadric(1)), { color: C.violet, width: 3, upto: growA });
      legend(ctx, [{ color: C.blue, label: 'ガウス' }, { color: C.aqua, label: '逆多重二次' }, { color: C.violet, label: '多重二次' }], 150, 150, { alpha: a, gap: 18, size: 16 });
      // 左下: ε なし
      const b = s.p(1, 0.6);
      if (b > 0) {
        PB.axes(ctx, { xticks: [0, 1, 2], yticks: [0, 1, 2, 3], xlabel: 'r', alpha: b });
        const growB = s.p(1, 1.6, 0.3);
        PB.line(ctx, RS_B, curve(RS_B, M.BASIS.cubic()), { color: C.orange, width: 3, upto: growB });
        PB.line(ctx, RS_B, curve(RS_B, M.BASIS.thinPlate()), { color: C.yellow, width: 3.5, upto: growB });
        legend(ctx, [{ color: C.orange, label: 'r³' }, { color: C.yellow, label: 'r² log r（TPS）' }], 150, 488, { alpha: b, gap: 18, size: 16 });
        // r < 1 で負になる部分を囲む
        const mark = s.p(1, 0.8, 1.6);
        ctx.save();
        ctx.globalAlpha = mark;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(PB.sx(0.02), PB.sy(0.12), PB.sx(1.0) - PB.sx(0.02), PB.sy(-0.32) - PB.sy(0.12));
        ctx.restore();
        canvasText(ctx, 'r < 1 で負（最小 −0.18）', PB.sx(1.06), PB.sy(-0.3), { size: 16, color: C.yellow, alpha: mark });
      }
      // 右: ε を変えた補間
      const c = s.p(2, 0.6);
      if (c <= 0) return;
      const bt = s.bt;
      const eps = keyframes(s.u, [[bt(2), 1], [bt(2) + 3, 4], [bt(3) + 0.3, 4], [bt(3) + 6, 0.1], [bt(4) + 0.3, 0.1], [bt(4) + 3.2, 0.7]], { log: true });
      const phi = M.BASIS.gaussian(eps);
      const model = M.fit(X1, M.DATA1_Y, phi);
      PC.axes(ctx, { xticks: [0, 2, 4, 6, 8, 10], yticks: [-1, 0, 1, 2], alpha: c });
      ctx.save();
      ctx.globalAlpha = c;
      PC.line(ctx, XS3, curve(XS3, (x) => model.at([x])), { color: GAUSS_COLOR, width: 3.5 });
      PC.dots(ctx, M.DATA1_X, M.DATA1_Y, { r: 7, color: C.text });
      canvasText(ctx, `ε = ${fmt(eps, 2)}`, PC.x + PC.w - 10, PC.y + 24, { size: 24, color: C.text, weight: 700, align: 'right' });
      ctx.restore();
      // 条件数のゲージ
      const g = s.p(3, 0.6);
      if (g <= 0) return;
      const cond = M.conditionNumber(M.kernelMatrix(X1, phi));
      const maxWeight = Math.max(...model.w.map(Math.abs));
      const level = clamp(Math.log10(cond) / GAUGE.max);
      ctx.save();
      ctx.globalAlpha = g;
      const gradient = ctx.createLinearGradient(GAUGE.x, 0, GAUGE.x + GAUGE.w, 0);
      gradient.addColorStop(0, C.aqua);
      gradient.addColorStop(0.5, C.yellow);
      gradient.addColorStop(1, C.red);
      ctx.fillStyle = '#2a2a27';
      ctx.fillRect(GAUGE.x, GAUGE.y, GAUGE.w, GAUGE.h);
      ctx.fillStyle = gradient;
      ctx.fillRect(GAUGE.x, GAUGE.y, GAUGE.w * level, GAUGE.h);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(GAUGE.x + 0.5, GAUGE.y + 0.5, GAUGE.w, GAUGE.h);
      [0, 4, 8, 12, 16].forEach((k) => {
        const x = GAUGE.x + (GAUGE.w * k) / GAUGE.max;
        canvasText(ctx, `10${String(k).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`, x, GAUGE.y + GAUGE.h + 24, { size: 16, color: C.muted, align: 'center' });
      });
      canvasText(ctx, `条件数 ${sci(cond)}`, GAUGE.x + GAUGE.w, PC.y + PC.h + 64, { size: 22, color: C.text, weight: 700, align: 'right' });
      canvasText(ctx, `いちばん大きい重み |w| = ${sci(maxWeight)}`, GAUGE.x, PC.y + PC.h + 64, { size: 22, color: C.text, weight: 700 });
      ctx.restore();
    },
  };
  SCENES.push(S3V);

  // ---------------------------------------------------------------- 第4章 理論（多項式の項）
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '多項式の項 ― 平面を正しく再現する',
    beats: [
      beat(R`多重調和スプラインには、低い次数の多項式 $p(\mathbf{x})$ を足します。2次元の TPS なら平面 $c_0 + c_1x + c_2y$ です。`, 10),
      beat('未知数が3つ増えるので、条件も3つ。重みの和が 0、重み×座標の和も 0。この条件が、遠くでの山の影響を打ち消します。', 11),
      beat(R`まとめると、ブロックの形の連立方程式になります。$P$ は各点の $1, x, y$ を並べた行列です。`, 9),
      beat('すべての点が一直線上に並んでいなければ、解は必ず、ただ1つに決まります。', 7),
      beat('データが平面の上にあれば、重みはすべて 0。補間の結果は、その平面そのものになります。', 8),
    ],
    build(ui) {
      ui.tex(R`s(\mathbf{x}) = \sum_{j=1}^{n} w_j\,\varphi(\lVert\mathbf{x}-\mathbf{x}_j\rVert) + \underbrace{c_0 + c_1 x + c_2 y}_{p(\mathbf{x})\ \text{（平面）}}`, { x: LEFT_X, y: 124, size: 32 });
      ui.tex(R`\sum_j w_j = 0,\qquad \sum_j w_j x_j = 0,\qquad \sum_j w_j y_j = 0`, { x: LEFT_X, y: 262, size: 30, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text('未知数が3つ増えた分、条件を3つ足す', { x: LEFT_X + 30, y: 334, size: 22, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`\begin{bmatrix} \Phi & P \\ P^\top & 0 \end{bmatrix}\begin{bmatrix}\mathbf{w}\\ \mathbf{c}\end{bmatrix} = \begin{bmatrix}\mathbf{y}\\ \mathbf{0}\end{bmatrix},\qquad P = \begin{bmatrix} 1 & x_1 & y_1\\ \vdots & \vdots & \vdots \\ 1 & x_n & y_n\end{bmatrix}`, { x: LEFT_X, y: 396, size: 26, at: 2 });
      ui.text('点がすべて一直線上に並んでいなければ、ただ1つの解がある', { x: LEFT_X, y: 560, size: 24, at: 3 });
      ui.text(R`データが平面の上 → $\mathbf{w} = \mathbf{0}$、補間はその平面そのもの`, { x: LEFT_X, y: 640, size: 26, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });

      ui.card({ x: CARD_X, y: 124, w: CARD_W, h: 420, title: R`1次元（$r^3$ ＋ 直線）で確かめる`, at: 1 });
      ui.tex(R`s''(x) = 6\sum_j w_j \lvert x - x_j \rvert`, { x: CARD_X + 30, y: 180, size: 28, at: 1, delay: 0.6 });
      ui.text(R`データの外側（$x$ がどの $x_j$ より大きい）では`, { x: CARD_X + 30, y: 262, size: 20, color: C.text2, at: 1, delay: 1.0 });
      ui.tex(R`= 6\Bigl( x\sum_j w_j - \sum_j w_j x_j \Bigr) = 0`, { x: CARD_X + 30, y: 312, size: 28, at: 1, delay: 1.4 });
      ui.text('→ 外側は曲がらない直線になる<br>（条件が、遠くでの山の影響を打ち消す）', { x: CARD_X + 30, y: 420, size: 21, color: C.yellow, at: 1, delay: 1.8 });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（多項式の項の効果）
  const XR4 = [-3, 13];
  const P4T = new Plot({ x: 150, y: 150, w: 1320, h: 240, xr: XR4, yr: [-1.6, 2.6] });
  const P4B = new Plot({ x: 150, y: 488, w: 1320, h: 240, xr: XR4, yr: [-1.6, 4.4] });
  const XS4 = sampleXs(XR4[0], XR4[1], 400);
  const LINE_GAUSS = M.fit(X1, M.LINE1_Y, M.BASIS.gaussian(EPS_DEMO));
  const LINE_CUBIC = M.fit(X1, M.LINE1_Y, M.BASIS.cubic(), { degree: 1 });
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '多項式の項の効果（1次元）',
    beats: [
      beat('上は、直線の上に並んだデータです。', 5),
      beat('ガウス RBF だけだと、点の間でたわみ、点の外では 0 に戻ってしまいます。直線を再現できません。', 9),
      beat(R`$r^3$ に直線を足すと、直線そのものが出てきます。重みはすべて 0 です。`, 8),
      beat(R`下は一般のデータ。点の外側で、ガウスは 0 へ戻り、$r^3$ ＋ 直線はまっすぐ伸びていきます。`, 10),
      beat(R`この $r^3$ ＋ 直線の曲線は、自然3次スプラインと同じものです。TPS の1次元版にあたります。`, 9),
    ],
    build(ui) {
      ui.text('直線の上のデータ', { ...TITLE, x: 150, y: 112 });
      ui.text('一般のデータ（点の外側も見る）', { ...TITLE, x: 150, y: 450, at: 3 });
      ui.text(`<span class="pill" style="background:${C.orange}">自然3次スプライン</span>＝ TPS の1次元版`, { x: 900, y: 446, size: 22, at: 4, glow: [{ from: 4, color: C.orange }] });
    },
    draw(ctx, s) {
      const a = s.p(0, 0.6);
      P4T.shade(ctx, XR4[0], M.DATA1_X[0], { alpha: 0.05 * a });
      P4T.shade(ctx, M.DATA1_X[M.DATA1_X.length - 1], XR4[1], { alpha: 0.05 * a });
      P4T.axes(ctx, { xticks: [0, 4, 8, 12], yticks: [-1, 0, 1, 2], alpha: a });
      P4T.line(ctx, XS4, curve(XS4, (x) => 0.22 * x - 0.6), { color: C.muted, width: 1.5, dash: [6, 6], alpha: a });
      P4T.line(ctx, XS4, curve(XS4, (x) => LINE_GAUSS.at([x])), { color: GAUSS_COLOR, width: 3.5, upto: s.p(1, 2.4) });
      P4T.line(ctx, XS4, curve(XS4, (x) => LINE_CUBIC.at([x])), { color: POLY_COLOR, width: 3.5, upto: s.p(2, 2.4) });
      P4T.dots(ctx, M.DATA1_X, M.LINE1_Y, { r: 7, color: C.text, alpha: a });
      legend(ctx, [{ color: GAUSS_COLOR, label: 'ガウス RBF（ε = 0.7、多項式なし）' }, { color: POLY_COLOR, label: 'r³ ＋ 直線' }], 640, 124, { alpha: a, size: 17 });

      const b = s.p(3, 0.6);
      if (b <= 0) return;
      P4B.shade(ctx, XR4[0], M.DATA1_X[0], { alpha: 0.05 * b });
      P4B.shade(ctx, M.DATA1_X[M.DATA1_X.length - 1], XR4[1], { alpha: 0.05 * b });
      P4B.axes(ctx, { xticks: [0, 4, 8, 12], yticks: [-1, 0, 1, 2, 3, 4], alpha: b });
      const grow = s.p(3, 3.0, 0.5);
      P4B.line(ctx, XS4, curve(XS4, (x) => GAUSS_DEMO.at([x])), { color: GAUSS_COLOR, width: 3.5, upto: grow });
      P4B.line(ctx, XS4, curve(XS4, (x) => CUBIC_DEMO.at([x])), { color: POLY_COLOR, width: 3.5, upto: grow });
      P4B.dots(ctx, M.DATA1_X, M.DATA1_Y, { r: 7, color: C.text, alpha: b });
      canvasText(ctx, '点の外側', P4B.sx(-1.5), P4B.y + 22, { size: 17, color: C.muted, align: 'center', alpha: b });
      canvasText(ctx, '点の外側', P4B.sx(11), P4B.y + 22, { size: 17, color: C.muted, align: 'center', alpha: b });
    },
  });
})();
