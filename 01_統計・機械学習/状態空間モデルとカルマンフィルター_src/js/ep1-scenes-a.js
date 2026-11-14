// ep1-scenes-a.js — 第1回「状態空間モデル入門」の前半: はじめに、ポイント、第1〜3章（状態と観測、2本の式、正規分布）。
// 場面の書き方は scene-kit.js の冒頭を参照。画面に出す数値は手で書かず、ssm-math.js・ssm-data.js で計算した値を表示する。
(() => {
  const { C, CHAPTERS, Plot, fmt, canvasText, keyframes, clamp, legend, rgba } = KIT;
  const M = SSM;
  const D = SSMDATA;
  const S = SDRAW;
  const { beat, add, LEFT_X, CARD_X, CARD_W, seeThrough, eq, note, keyPoint } = SK;
  const R = String.raw;

  const T = D.tempTimes;
  const TEMP_X = D.tempSim.x;
  const TEMP_Y = D.tempSim.y;
  const TEMP_YR = [15.5, 24.5];
  const TEMP_YTICKS = [16, 18, 20, 22, 24];
  const TEMP_XTICKS = [0, 20, 40, 60, 80, 100];
  const tempPlot = (o = {}) => new Plot({ x: 120, y: 170, w: 960, h: 500, xr: [0, 100], yr: TEMP_YR, ...o });
  const tempAxes = (ctx, P, alpha = 1) => P.axes(ctx, { xticks: TEMP_XTICKS, yticks: TEMP_YTICKS, xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha });

  // ---------------------------------------------------------------- はじめに
  SK.titleScene({
    episode: 1,
    subtitle: 'ノイズのある観測の裏にある「見えない状態」を、式で表す',
    chapters: CHAPTERS,
    footnote: '例のデータは、説明用に作った「部屋の温度」と「台車の位置」です',
    beats: [
      beat('状態空間モデルとカルマンフィルターを、式と図で、3回に分けて解説します。', '状態空間モデルと、カルマンフィルターを、式と図で、3回に分けて解説します。'),
      beat('第1回は、状態空間モデルです。ノイズのある観測の裏にある「見えない状態」を、式で表す方法を学びます。', '第1回は、状態空間モデルです。ノイズのある観測の裏にある、見えない状態を、式で表す方法を学びます。'),
      beat('今回は7章です。例のデータは、説明用に作った、部屋の温度と台車の位置です。', '今回は7章です。例のデータは、説明用に作った、部屋の温度と、台車の位置です。'),
    ],
  });

  // ---------------------------------------------------------------- この回のポイント
  const POINT_CARDS = [{ x: 90, y: 124 }, { x: 810, y: 124 }, { x: 90, y: 440 }, { x: 810, y: 440 }];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 296;
  const FIG = { dx: 410, dy: 56, w: 262, h: 210 };
  add({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この回のポイント',
    beats: [
      beat('この回のポイントです。', 'この回のポイントです。', 4),
      beat('① 知りたい値は、直接は見えません。見えない値を「状態」、ノイズの乗った見える値を「観測」と呼びます。', 'ひとつめ。知りたいあたいは、直接は見えません。見えないあたいを、状態。ノイズの乗った、見えるあたいを、観測と呼びます。'),
      beat('② 状態空間モデルは、2本の式です。状態がどう変わるかと、状態から観測がどう生まれるかを書きます。', 'ふたつめ。状態空間モデルは、にほんの式です。状態がどう変わるかと、状態から、観測がどう生まれるかを書きます。'),
      beat(R`③ ノイズは正規分布で表します。大きさは、状態を動かす $Q$ と、観測をずらす $R$ の2つです。`, 'みっつめ。ノイズは、正規分布で表します。大きさは、状態を動かすキューと、観測をずらすアールの、ふたつです。'),
      beat(R`④ 行列 $F$ と $H$ を取りかえると、いろいろなモデルが同じ形で書けます。`, 'よっつめ。ぎょうれつ、エフとエイチを取りかえると、いろいろなモデルが、同じ形で書けます。'),
      beat('この流れを、式と図で順に見ていきます。', 'この流れを、式と図で、順に見ていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 状態と観測', '知りたい値（状態）は見えない。見えるのは、ノイズの乗った観測だけ'],
        ['② モデルは2本の式', '状態方程式：状態がどう変わるか<br>観測方程式：観測がどう生まれるか'],
        [R`③ ノイズは $Q$ と $R$`, R`正規分布で表す。$Q$ は状態を動かし、$R$ は観測をずらす`],
        [R`④ $F$ と $H$ で同じ形に`, '水準・トレンド・位置と速度など、どのモデルも同じ形で書ける'],
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
        const P = new Plot({ ...fig(0), xr: [0, 100], yr: TEMP_YR });
        ctx.save();
        ctx.globalAlpha = a1;
        P.dots(ctx, T, TEMP_Y, { r: 2.6, color: S.COLOR.obs, ring: null, alpha: 0.8 });
        P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, upto: s.p(1, 1.6, 0.8) });
        ctx.restore();
      }
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const f = fig(1);
        ctx.save();
        ctx.globalAlpha = a2;
        [0, 1, 2].forEach((i) => {
          const cx = f.x + 40 + i * 92;
          if (i < 2) S.arrow(ctx, cx + 30, f.y + 50, cx + 62, f.y + 50, { color: C.text2, head: 10 });
          S.arrow(ctx, cx, f.y + 80, cx, f.y + 126, { color: C.text2, head: 10 });
          S.nodeShape(ctx, cx, f.y + 50, { r: 28, color: S.COLOR.filter, dash: [5, 4] });
          S.nodeShape(ctx, cx, f.y + 156, { r: 26, shape: 'square', color: S.COLOR.obs });
          S.mathLabel(ctx, 'x', String(i + 1), cx, f.y + 50, { size: 26 });
          S.mathLabel(ctx, 'y', String(i + 1), cx, f.y + 156, { size: 26 });
        });
        ctx.restore();
      }
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const P = new Plot({ ...fig(2), xr: [-3.5, 3.5], yr: [0, 1.7] });
        ctx.save();
        ctx.globalAlpha = a3;
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        S.drawBell(ctx, P, 0, 1, { color: S.COLOR.obs });
        S.drawBell(ctx, P, 0, 0.0625, { color: S.COLOR.filter });
        P.label(ctx, 'Q', 0.45, 1.5, { size: 22, color: S.COLOR.filter, weight: 800 });
        P.label(ctx, 'R', 1.4, 0.32, { size: 22, color: S.COLOR.obs, weight: 800 });
        ctx.restore();
      }
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const f = fig(3);
        const xs = M.linspace(0, 1, 60);
        const shapes = [(u) => 0.5 + 0.18 * Math.sin(5 * u), (u) => 0.15 + 0.7 * u, (u) => 0.5 + 0.3 * Math.sin(2 * Math.PI * 4 * u)];
        ctx.save();
        ctx.globalAlpha = a4;
        shapes.forEach((shape, i) => {
          const P = new Plot({ x: f.x, y: f.y + i * 70, w: f.w, h: 56, xr: [0, 1], yr: [0, 1] });
          P.line(ctx, xs, xs.map(shape), { color: [S.COLOR.filter, S.COLOR.obs, S.COLOR.smooth][i], width: 3, upto: s.p(4, 1.2, 0.6 + 0.3 * i) });
        });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（見えるのは点だけ）
  add({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: CHAPTERS[0],
    beats: [
      beat('部屋の温度を、1分ごとに100回測りました。点が、温度計の読みです。', '部屋の温度を、いっぷんごとに、ひゃっかい測りました。点が、温度計の読みです。'),
      beat('読みは、上下にばらついています。温度計に誤差があるからです。', '読みは、じょうげにばらついています。温度計に、誤差があるからです。'),
      beat('本当の温度は、この線のように、ゆっくり変わっていました。', '本当の温度は、この線のように、ゆっくり変わっていました。'),
      beat('知りたいのは線ですが、見えるのは点だけです。', '知りたいのは線ですが、見えるのは、点だけです。'),
      beat('見えない本当の値を「状態」、見える値を「観測」と呼びます。観測から状態を推定することが、このシリーズの目標です。', '見えない本当のあたいを、状態。見えるあたいを、観測と呼びます。観測から、状態を推定することが、このシリーズの目標です。'),
    ],
    build(ui) {
      ui.card({ x: 1140, y: 200, w: 380, h: 150, at: 4, accent: S.COLOR.truth });
      ui.text('状態', { x: 1166, y: 216, size: 30, weight: 700, at: 4 });
      ui.text('本当の温度。知りたいが、<br>直接は見えない', { x: 1166, y: 266, size: 21, color: C.text2, at: 4, delay: 0.2 });
      ui.card({ x: 1140, y: 380, w: 380, h: 150, at: 4, delay: 0.5, accent: S.COLOR.obs });
      ui.text('観測', { x: 1166, y: 396, size: 30, weight: 700, color: S.COLOR.obs, at: 4, delay: 0.5 });
      ui.text('温度計の読み。見えるが、<br>ノイズが乗っている', { x: 1166, y: 446, size: 21, color: C.text2, at: 4, delay: 0.7 });
    },
    draw(ctx, s) {
      const P = tempPlot();
      const a0 = s.p(0, 0.6, 0.2);
      tempAxes(ctx, P, a0);
      const shown = Math.round(clamp(s.lin(0, 4, 0.6)) * T.length);
      const dim = 1 - 0.45 * s.win(3, 4);
      P.dots(ctx, T.slice(0, shown), TEMP_Y.slice(0, shown), { r: 5.5, color: S.COLOR.obs, alpha: a0 });
      const a2 = s.p(2, 0.5, 0.2);
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 4, alpha: a2 * dim, upto: s.p(2, 2.4, 0.3), dash: s.u >= s.bt(3) ? [10, 7] : null });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '温度計の読み（観測）' }];
      if (a2 > 0) items.push({ color: S.COLOR.truth, label: '本当の温度（状態）' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（移動平均の限界）
  // 移動平均は「その時刻までの直近 window 回」の平均（リアルタイムで使える形）
  const movingAverage = (ys, window) => ys.map((_, i) => M.mean(ys.slice(Math.max(0, i - window + 1), i + 1)));
  const MA_SHORT = 5;
  const MA_LONG = 21;
  const MA5 = movingAverage(TEMP_Y, MA_SHORT);
  const MA21 = movingAverage(TEMP_Y, MA_LONG);
  const ERR = { raw: M.rmse(TEMP_Y, TEMP_X), ma5: M.rmse(MA5, TEMP_X), ma21: M.rmse(MA21, TEMP_X), kalman: M.rmse(D.tempFilter.mean, TEMP_X) };
  add({
    id: '1V-2',
    chapter: 1,
    kind: 'visual',
    title: 'ならすだけでは足りない',
    beats: [
      beat(`まず思いつくのは、移動平均です。直近${MA_SHORT}回の平均をとると、少しなめらかになりますが、まだガタガタです。`, `まず思いつくのは、移動平均です。直近${MA_SHORT}回の平均をとると、少しなめらかになりますが、まだガタガタです。`),
      beat(`${MA_LONG}回の平均にすると、なめらかになります。しかし今度は、本当の温度の変化に遅れます。`, `${MA_LONG}回の平均にすると、なめらかになります。しかし今度は、本当の温度の変化に、遅れます。`),
      beat('なめらかにすると遅れ、遅れを減らすとガタガタになります。何回の平均がよいかを決める根拠もありません。', 'なめらかにすると遅れ、遅れを減らすと、ガタガタになります。何回の平均がよいかを決める、根拠もありません。'),
      beat('そして、推定がどれくらい確かなのかも、分かりません。', 'そして、推定が、どれくらい確かなのかも、分かりません。'),
      beat('そこで、データが生まれる仕組みを、式で書きます。それが状態空間モデルです。仕組みが分かれば、最もよい混ぜ方と、推定の不確かさを計算できます。', 'そこで、データが生まれる仕組みを、式で書きます。それが、状態空間モデルです。仕組みが分かれば、最もよい混ぜかたと、推定の不確かさを、計算できます。'),
    ],
    build(ui) {
      ui.card({ x: 1140, y: 180, w: 400, h: 330, title: '本当の温度とのずれ（RMSE、℃）', at: 0 });
      ui.table({
        x: 1160, y: 232, widths: [230, 130], aligns: ['left', 'center'], size: 21, rowH: 52,
        header: ['方法', 'ずれ'],
        rows: [
          ['温度計の読みのまま', fmt(ERR.raw, 2)],
          [`${MA_SHORT}回の移動平均`, fmt(ERR.ma5, 2)],
          [`${MA_LONG}回の移動平均`, fmt(ERR.ma21, 2)],
          ['カルマンフィルター', fmt(ERR.kalman, 2)],
        ],
        at: 0, rowAt: [0, 0, 1, 4], delay: 0.5,
        glowRows: [null, [{ from: 0, to: 1 }], [{ from: 1, to: 2 }], [{ from: 4 }]],
      });
      ui.text('カルマンフィルターは第2回で扱います', { x: 1160, y: 524, size: 19, color: C.muted, at: 4, delay: 0.6 });
    },
    draw(ctx, s) {
      const P = tempPlot();
      tempAxes(ctx, P, s.p(0, 0.5));
      P.dots(ctx, T, TEMP_Y, { r: 4.5, color: S.COLOR.obs, alpha: 0.55 * s.p(0, 0.5) });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3.5, dash: [10, 7], alpha: s.p(0, 0.5) });
      const shortAlpha = s.p(0, 0.5, 0.6) * (1 - 0.75 * s.p(1, 0.6));
      P.line(ctx, T, MA5, { color: S.COLOR.smooth, width: 3.5, alpha: shortAlpha, upto: s.p(0, 2.2, 0.8) });
      P.line(ctx, T, MA21, { color: S.COLOR.predict, width: 4, alpha: s.p(1, 0.5, 0.2), upto: s.p(1, 2.2, 0.3) });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' }, { color: S.COLOR.smooth, label: `${MA_SHORT}回の平均` }];
      if (s.u >= s.bt(1)) items.push({ color: S.COLOR.predict, label: `${MA_LONG}回の平均` });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: s.p(0, 0.5) });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（状態と観測、2本の式）
  add({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '状態空間モデルは2本の式',
    beats: [
      beat(R`記号を決めます。時刻 $t$ の状態を $x_t$、観測を $y_t$ と書きます。`, '記号を決めます。時刻ティーの状態を、エックスティー。観測を、ワイティーと書きます。'),
      beat('状態空間モデルは、2本の式でできています。1本目は状態方程式。状態が、1つ前の時刻からどう変わるかを表します。', '状態空間モデルは、にほんの式でできています。いっぽんめは、状態方程式。状態が、ひとつ前の時刻から、どう変わるかを表します。'),
      beat('2本目は観測方程式。状態から、観測がどう生まれるかを表します。', 'にほんめは、観測方程式。状態から、観測がどう生まれるかを表します。'),
      beat('どちらの式にも、ノイズが入ります。状態を揺らすシステムノイズと、観測に乗る観測ノイズです。', 'どちらの式にも、ノイズが入ります。状態を揺らす、システムノイズと、観測に乗る、観測ノイズです。'),
      beat('温度の例なら、状態は本当の温度、観測は温度計の読みです。台車なら、状態は位置と速度、観測はセンサーで測った位置です。', '温度の例なら、状態は本当の温度、観測は温度計の読みです。台車なら、状態は、位置と速度。観測は、センサーで測った位置です。'),
    ],
    build(ui) {
      ui.text(R`$x_t$：時刻 $t$ の<b>状態</b>（見えない）`, { x: LEFT_X, y: 130, size: 28 });
      ui.text(R`$y_t$：時刻 $t$ の<b>観測</b>（見える）`, { x: LEFT_X + 440, y: 130, size: 28, delay: 0.5 });
      ui.text(`<span class="pill" style="color:${S.COLOR.filter};border-color:${S.COLOR.filter}">状態方程式</span>`, { x: LEFT_X, y: 240, size: 28, at: 1 });
      ui.text(R`今の状態 $x_t$ ＝ 1つ前の状態 $x_{t-1}$ から決まる値 ＋ <b>システムノイズ</b>`, { x: LEFT_X + 20, y: 296, size: 26, at: 1, delay: 0.3, glow: [{ from: 1, to: 2 }] });
      ui.text(`<span class="pill" style="color:${S.COLOR.obs};border-color:${S.COLOR.obs}">観測方程式</span>`, { x: LEFT_X, y: 400, size: 28, at: 2 });
      ui.text(R`今の観測 $y_t$ ＝ 今の状態 $x_t$ から決まる値 ＋ <b>観測ノイズ</b>`, { x: LEFT_X + 20, y: 456, size: 26, at: 2, delay: 0.3, glow: [{ from: 2, to: 3 }] });
      keyPoint(ui, 'ノイズは2種類：状態を揺らすもの と 観測に乗るもの', 560, 3);

      ui.card({ x: CARD_X, y: 540, w: CARD_W, h: 190, title: '例', at: 4 });
      ui.table({
        x: CARD_X + 20, y: 580, widths: [100, 180, 180], aligns: ['left', 'left', 'left'], size: 20, rowH: 44,
        header: ['', '状態', '観測'],
        rows: [['温度', '本当の温度', '温度計の読み'], ['台車', '位置と速度', '測った位置']],
        at: 4, rowDelay: 0.5, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（どこで使われているか）
  add({
    id: '1T-2',
    chapter: 1,
    kind: 'theory',
    title: 'どこで使われているか',
    beats: [
      beat('状態空間モデルは、いろいろな分野で使われています。共通するのは、知りたいものが、直接は見えないことです。', '状態空間モデルは、いろいろな分野で使われています。共通するのは、知りたいものが、直接は見えないことです。'),
      beat('位置の追跡。カーナビやロボットでは、状態は位置と速度、観測は、GPS やセンサーの読みです。', '位置の追跡。カーナビやロボットでは、状態は、位置と速度。観測は、ジーピーエスや、センサーの読みです。'),
      beat('時系列の分析。売上や経済の統計では、状態はトレンドや季節の成分、観測は、毎月の数字です。', '時系列の分析。売上や、経済の統計では、状態は、トレンドや季節の成分。観測は、毎月の数字です。'),
      beat('製造プロセスの監視。状態は装置の本当の状態、観測は、ノイズの乗った計測値です。', '製造プロセスの監視。状態は、装置の本当の状態。観測は、ノイズの乗った、計測値です。'),
      beat('カルマンフィルターは1960年に発表され、アポロ計画の宇宙船の航法に使われて広まりました。いまも、センサーを使う多くの機器の中で動いています。', 'カルマンフィルターは、1960年に発表され、アポロ計画の、宇宙船の航法に使われて、広まりました。いまも、センサーを使う、多くの機器の中で動いています。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 330 });
      ui.table({
        x: LEFT_X + 20, y: 146, widths: [400, 480, 500], aligns: ['left', 'left', 'left'], size: 24, rowH: 74,
        header: ['分野', '状態（知りたいが見えない）', '観測（見えるがノイズが乗る）'],
        rows: [
          ['位置の追跡（カーナビ、ロボット）', '位置、速度', 'GPS やセンサーの読み'],
          ['時系列の分析（売上、経済）', 'トレンド、季節の成分', '毎月の数字'],
          ['製造プロセスの監視', '装置の本当の状態', '計測値'],
        ],
        rowAt: [1, 2, 3], delay: 0.2,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }], [{ from: 3, to: 4 }]],
      });
      ui.text('1960年　カルマンが論文を発表', { x: LEFT_X + 20, y: 510, size: 25, at: 4 });
      ui.text('1960年代　アポロ計画の宇宙船の航法に使われて広まる', { x: LEFT_X + 20, y: 562, size: 25, at: 4, delay: 0.5 });
      keyPoint(ui, '共通点：知りたいものが、直接は見えない', 650, 4);
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（ローカルレベルモデル）
  add({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: CHAPTERS[1],
    beats: [
      beat('いちばん簡単なモデルで、式を見ます。温度の例です。', 'いちばん簡単なモデルで、式を見ます。温度の例です。'),
      beat(R`状態方程式です。今の温度 $x_t$ は、1つ前の温度 $x_{t-1}$ に、小さな変化 $w_t$ を足したものです。`, '状態方程式です。今の温度エックスティーは、ひとつ前の温度に、小さな変化、ダブリューティーを足したものです。'),
      beat(R`観測方程式です。温度計の読み $y_t$ は、本当の温度 $x_t$ に、誤差 $v_t$ を足したものです。`, '観測方程式です。温度計の読みワイティーは、本当の温度エックスティーに、誤差、ブイティーを足したものです。'),
      beat(R`$w_t$ と $v_t$ は、毎回ランダムに決まります。その大きさを、分散 $Q$ と $R$ で表します。`, 'ダブリューティーとブイティーは、毎回ランダムに決まります。その大きさを、ぶんさん、キューとアールで表します。'),
      beat('このモデルを、ローカルレベルモデルと呼びます。式は2本だけですが、カルマンフィルターの考え方は、これですべて説明できます。', 'このモデルを、ローカルレベルモデルと呼びます。式は、にほんだけですが、カルマンフィルターの考え方は、これで、すべて説明できます。'),
    ],
    build(ui) {
      note(ui, '状態方程式', LEFT_X, 150, { at: 1, color: S.COLOR.filter, weight: 700, size: 24 });
      eq(ui, R`x_t = x_{t-1} + w_t`, 190, { at: 1, size: 44, glow: [{ from: 1, to: 2 }] });
      note(ui, '今の温度 ＝ 1つ前の温度 ＋ 小さな変化', LEFT_X + 440, 208, { at: 1, delay: 0.5 });
      note(ui, '観測方程式', LEFT_X, 310, { at: 2, color: S.COLOR.obs, weight: 700, size: 24 });
      eq(ui, R`y_t = x_t + v_t`, 350, { at: 2, size: 44, glow: [{ from: 2, to: 3 }] });
      note(ui, '温度計の読み ＝ 本当の温度 ＋ 誤差', LEFT_X + 440, 368, { at: 2, delay: 0.5 });
      eq(ui, R`w_t \sim \mathcal{N}(0,\ Q),\qquad v_t \sim \mathcal{N}(0,\ R)`, 480, { at: 3, size: 34 });
      note(ui, R`$\mathcal{N}(0, Q)$：平均 0、分散 $Q$ の正規分布（第3章）`, LEFT_X, 550, { at: 3, delay: 0.5 });
      keyPoint(ui, 'ローカルレベルモデル ― いちばん簡単な状態空間モデル', 640, 4);

      ui.card({ x: 960, y: 440, w: 560, h: 250, title: 'この動画の温度の例', at: 3 });
      ui.table({
        x: 980, y: 486, widths: [210, 310], aligns: ['left', 'left'], size: 21, rowH: 46,
        header: ['設定', '値'],
        rows: [
          ['最初の温度', `${D.TEMP.x0} ℃`],
          [R`$Q$（状態の変化）`, R`${D.TEMP.q}（標準偏差 ${fmt(Math.sqrt(D.TEMP.q), 2)} ℃）`],
          [R`$R$（温度計の誤差）`, R`${D.TEMP.r}（標準偏差 ${fmt(Math.sqrt(D.TEMP.r), 0)} ℃）`],
        ],
        at: 3, rowDelay: 0.4, delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（式のとおりにデータを作る）
  const ZOOM_STEPS = 12;
  add({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '式のとおりにデータを作る',
    beats: [
      beat(`式のとおりに、データを作ってみます。最初の温度は ${D.TEMP.x0} 度です。`, `式のとおりに、データを作ってみます。最初の温度は、${D.TEMP.x0}度です。`),
      beat(R`時刻1。状態が、$w_1$ のぶんだけ動きます。`, '時刻1。状態が、ダブリューのぶんだけ動きます。'),
      beat(R`そこから $v_1$ のぶんだけずれた値が、観測として見えます。`, 'そこから、ブイのぶんだけずれたあたいが、観測として見えます。'),
      beat('時刻2も同じです。状態は、前の状態から少し動き、観測は、そこからずれます。', '時刻2も同じです。状態は、前の状態から少し動き、観測は、そこからずれます。'),
      beat('これを繰り返します。状態は前の値を引き継ぎながら動き、観測は毎回、別々にずれます。', 'これを繰り返します。状態は、前のあたいを引き継ぎながら動き、観測は、毎回、別々にずれます。'),
      beat('100回繰り返すと、最初に見たデータになります。あのデータは、この2本の式から作ったものでした。', 'ひゃっかい繰り返すと、最初に見たデータになります。あのデータは、このにほんの式から、作ったものでした。'),
    ],
    build(ui) {
      ui.tex(R`x_t = x_{t-1} + w_t`, { x: 1180, y: 190, size: 32, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`y_t = x_t + v_t`, { x: 1180, y: 262, size: 32, glow: [{ from: 2, to: 3 }] });
    },
    draw(ctx, s) {
      const zoomOut = s.p(5, 1.6, 0.2); // 0 = 最初の12回を拡大、1 = 100回の全体
      const P = tempPlot({ xr: [0, keyframes(zoomOut, [[0, ZOOM_STEPS + 0.6], [1, 100]])], yr: [keyframes(zoomOut, [[0, 17.4], [1, TEMP_YR[0]]]), keyframes(zoomOut, [[0, 21.6], [1, TEMP_YR[1]]])] });
      const a0 = s.p(0, 0.5, 0.1);
      const xticks = zoomOut < 0.5 ? [0, 2, 4, 6, 8, 10, 12] : TEMP_XTICKS;
      const yticks = zoomOut < 0.5 ? [18, 19, 20, 21] : TEMP_YTICKS;
      P.axes(ctx, { xticks, yticks, xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      // 何回目まで進んだか（小数は「いま動いている途中」）。時刻1・2はゆっくり、3〜12は速く
      const stateProgress = [s.p(1, 1.2, 0.3), s.p(3, 1.0, 0.2), ...Array.from({ length: ZOOM_STEPS - 2 }, (_, i) => s.p(4, 0.35, 0.3 + i * 0.42))];
      const obsProgress = [s.p(2, 1.0, 0.3), s.p(3, 0.9, 1.4), ...Array.from({ length: ZOOM_STEPS - 2 }, (_, i) => s.p(4, 0.3, 0.5 + i * 0.42))];
      const xs = [D.TEMP.x0, ...TEMP_X];
      const detail = 1 - zoomOut;
      // 状態の折れ線と点
      for (let t = 1; t <= ZOOM_STEPS; t++) {
        const k = stateProgress[t - 1];
        if (k <= 0) break;
        const x0 = P.sx(t - 1);
        const y0 = P.sy(xs[t - 1]);
        const x1 = P.sx(t);
        const y1 = P.sy(xs[t]);
        ctx.save();
        ctx.globalAlpha = a0;
        ctx.strokeStyle = S.COLOR.truth;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
        ctx.stroke();
        ctx.restore();
        if (k >= 1) P.dots(ctx, [t], [xs[t]], { r: 7 * detail + 1, color: S.COLOR.truth, alpha: a0 * detail });
        const ko = obsProgress[t - 1];
        if (ko > 0) {
          if (detail > 0.05) S.arrow(ctx, x1, y1, x1, P.sy(TEMP_Y[t - 1]), { color: S.COLOR.obs, width: 2, head: 9, alpha: 0.7 * detail, upto: ko, dash: [4, 4] });
          if (ko >= 1) P.dots(ctx, [t], [TEMP_Y[t - 1]], { r: 7, color: S.COLOR.obs, alpha: a0 * detail });
        }
      }
      P.dots(ctx, [0], [D.TEMP.x0], { r: 8, color: S.COLOR.truth, alpha: a0 * detail });
      // 時刻1・2の記号
      const label1 = s.win(1, 4) * detail;
      canvasText(ctx, 'w₁', (P.sx(0) + P.sx(1)) / 2 - 8, (P.sy(xs[0]) + P.sy(xs[1])) / 2 - 14, { size: 24, color: S.COLOR.truth, weight: 700, alpha: label1 * stateProgress[0] });
      canvasText(ctx, 'v₁', P.sx(1) + 12, (P.sy(xs[1]) + P.sy(TEMP_Y[0])) / 2 + 6, { size: 24, color: S.COLOR.obs, weight: 700, alpha: label1 * obsProgress[0] });
      // 100回の全体（拡大を解いたあと）
      if (zoomOut > 0) {
        P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3.5, alpha: zoomOut });
        P.dots(ctx, T, TEMP_Y, { r: 5, color: S.COLOR.obs, alpha: zoomOut });
      }
      legend(ctx, [{ color: S.COLOR.truth, label: '状態 x（本当の温度）' }, { kind: 'dot', color: S.COLOR.obs, label: '観測 y（温度計の読み）' }], P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（鎖の図）
  const CHAIN = { xs: [250, 520, 790, 1060], stateY: 290, obsY: 520, labels: ['t−2', 't−1', 't', 't+1'] };
  add({
    id: '2V-2',
    chapter: 2,
    kind: 'visual',
    title: 'モデルの形を図にする',
    beats: [
      beat('モデルの形を、図にします。丸が状態、四角が観測です。', 'モデルの形を、図にします。丸が状態、四角が観測です。'),
      beat('横の矢印が、状態方程式です。状態は、1つ前の状態だけから決まります。', '横の矢印が、状態方程式です。状態は、ひとつ前の状態だけから決まります。'),
      beat('縦の矢印が、観測方程式です。観測は、その時刻の状態だけから決まります。', '縦の矢印が、観測方程式です。観測は、その時刻の状態だけから決まります。'),
      beat('状態は見えないので、点線で描きました。見えるのは、下の段の観測だけです。', '状態は見えないので、点線で描きました。見えるのは、下の段の観測だけです。'),
      beat('過去の情報は、すべて今の状態に入っています。今の状態さえ推定できれば、過去のデータを全部持ち歩く必要がありません。計算が軽くなる理由です。', '過去の情報は、すべて、今の状態に入っています。今の状態さえ推定できれば、過去のデータを、全部持ち歩く必要がありません。計算が軽くなる理由です。'),
    ],
    build(ui) {
      ui.text('状態（見えない）', { x: 1230, y: 272, size: 23, weight: 700, color: S.COLOR.filter, at: 3 });
      ui.text('観測（見える）', { x: 1230, y: 502, size: 23, weight: 700, color: S.COLOR.obs, at: 3 });
      ui.text('今の状態が、過去のすべてを要約している', { x: 250, y: 660, size: 27, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.6, 0.2);
      const horizontal = s.p(1, 0.8, 0.3);
      const vertical = s.p(2, 0.8, 0.3);
      const glowH = s.win(1, 2);
      const glowV = s.win(2, 3);
      const focus = s.p(4, 0.6, 0.3); // 今の状態（t）を強調する
      CHAIN.xs.forEach((cx, i) => {
        if (i < CHAIN.xs.length - 1) S.arrow(ctx, cx + 52, CHAIN.stateY, CHAIN.xs[i + 1] - 52, CHAIN.stateY, { color: glowH > 0.5 ? S.COLOR.filter : C.text2, width: 3 + 2 * glowH, alpha: horizontal, upto: horizontal, head: 14 });
        S.arrow(ctx, cx, CHAIN.stateY + 52, cx, CHAIN.obsY - 50, { color: glowV > 0.5 ? S.COLOR.obs : C.text2, width: 3 + 2 * glowV, alpha: vertical, upto: vertical, head: 14 });
      });
      S.arrow(ctx, 110, CHAIN.stateY, CHAIN.xs[0] - 52, CHAIN.stateY, { color: C.muted, width: 2.5, alpha: horizontal * 0.7, dash: [5, 5] });
      S.arrow(ctx, CHAIN.xs[3] + 52, CHAIN.stateY, 1200, CHAIN.stateY, { color: C.muted, width: 2.5, alpha: horizontal * 0.7, dash: [5, 5] });
      CHAIN.xs.forEach((cx, i) => {
        const isNow = i === 2;
        const dim = 1 - 0.55 * focus * (isNow ? 0 : 1);
        S.nodeShape(ctx, cx, CHAIN.stateY, { r: 46, color: S.COLOR.filter, alpha: a0 * dim, dash: s.u >= s.bt(3) ? [7, 6] : null, fill: 0.12 + (isNow ? 0.25 * focus : 0), width: 3 + (isNow ? 3 * focus : 0) });
        S.nodeShape(ctx, cx, CHAIN.obsY, { r: 42, shape: 'square', color: S.COLOR.obs, alpha: a0 * dim });
        S.mathLabel(ctx, 'x', CHAIN.labels[i], cx, CHAIN.stateY, { size: 34, alpha: a0 * dim });
        S.mathLabel(ctx, 'y', CHAIN.labels[i], cx, CHAIN.obsY, { size: 34, alpha: a0 * dim });
      });
      canvasText(ctx, '状態方程式', (CHAIN.xs[1] + CHAIN.xs[2]) / 2, CHAIN.stateY - 30, { size: 21, color: S.COLOR.filter, weight: 700, align: 'center', alpha: glowH });
      canvasText(ctx, '観測方程式', CHAIN.xs[2] + 16, (CHAIN.stateY + CHAIN.obsY) / 2 + 6, { size: 21, color: S.COLOR.obs, weight: 700, alpha: glowV });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（正規分布）
  add({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: CHAPTERS[2],
    beats: [
      beat('ノイズは、正規分布で表します。平均のまわりに、左右対称に散らばる分布です。', 'ノイズは、正規分布で表します。平均のまわりに、左右対称に散らばる分布です。'),
      beat(R`形は、平均 $\mu$ と分散 $\sigma^2$ の2つだけで決まります。分散の平方根 $\sigma$ が標準偏差で、散らばりの幅を表します。`, '形は、平均ミューと、ぶんさんシグマ2乗の、ふたつだけで決まります。ぶんさんの平方根、シグマが、標準偏差で、散らばりの幅を表します。'),
      beat(R`値の約95%は、平均 ± $2\sigma$ の範囲に入ります。このシリーズでは、この範囲を帯で描きます。`, 'あたいの約95パーセントは、平均プラスマイナス、2シグマの範囲に入ります。このシリーズでは、この範囲を、おびで描きます。'),
      beat('大事な性質が2つあります。1つめ。独立な2つを足すと、分散は足し算になります。', '大事な性質が、ふたつあります。ひとつめ。独立なふたつを足すと、ぶんさんは、足し算になります。'),
      beat(R`2つめ。定数 $c$ を掛けると、分散は $c^2$ 倍になります。`, 'ふたつめ。定数シーを掛けると、ぶんさんは、シーの2乗倍になります。'),
      beat('正規分布は、足しても、定数を掛けても、正規分布のままです。だから、平均と分散だけを追いかければ、分布のすべてが分かります。', '正規分布は、足しても、定数を掛けても、正規分布のままです。だから、平均と、ぶんさんだけを追いかければ、分布のすべてが分かります。'),
    ],
    build(ui) {
      eq(ui, R`a \sim \mathcal{N}(\mu,\ \sigma^2)`, 130, { size: 38 });
      note(ui, R`$\mu$：平均（山の中心）`, LEFT_X + 420, 128, { at: 1, size: 23 });
      note(ui, R`$\sigma^2$：分散、$\sigma$：標準偏差（山の幅）`, LEFT_X + 420, 168, { at: 1, delay: 0.4, size: 23 });
      ui.text(R`約 95% が $\mu \pm 2\sigma$ に入る`, { x: LEFT_X, y: 250, size: 26, at: 2, glow: [{ from: 2, to: 3 }] });
      note(ui, R`性質 1（独立な $a$ と $b$ を足す）`, LEFT_X, 350, { at: 3, weight: 700 });
      eq(ui, R`\operatorname{Var}(a + b) = \operatorname{Var}(a) + \operatorname{Var}(b)`, 390, { at: 3, delay: 0.3, glow: [{ from: 3, to: 4 }] });
      note(ui, R`性質 2（定数 $c$ を掛ける）`, LEFT_X, 480, { at: 4, weight: 700 });
      eq(ui, R`\operatorname{Var}(c\,a) = c^2 \operatorname{Var}(a)`, 520, { at: 4, delay: 0.3, glow: [{ from: 4, to: 5 }] });
      keyPoint(ui, '平均と分散だけを追えばよい → カルマンフィルターの土台', 640, 5);
    },
    draw(ctx, s) {
      const P = new Plot({ x: 1030, y: 270, w: 480, h: 300, xr: [-3.6, 3.6], yr: [0, 0.46] });
      const a0 = s.p(0, 0.6, 0.3);
      if (a0 <= 0) return;
      ctx.save();
      ctx.globalAlpha = a0;
      P.hline(ctx, 0, { color: C.axis, dash: null, width: 1.5 });
      const shade = s.p(2, 0.6, 0.3);
      if (shade > 0) {
        const xs = M.linspace(-2, 2, 80);
        P.band(ctx, xs, xs.map(() => 0), xs.map((x) => M.normalPdf(x, 0, 1)), { color: S.COLOR.filter, alpha: 0.28 * shade });
        P.label(ctx, '約 95%', 0, 0.15, { size: 24, color: C.text, weight: 800, align: 'center', alpha: shade });
      }
      S.drawBell(ctx, P, 0, 1, { color: S.COLOR.filter, fill: 0.06 });
      [[-2, 'μ − 2σ'], [0, 'μ'], [2, 'μ + 2σ']].forEach(([v, text]) => {
        P.vline(ctx, v, { color: C.muted, from: 0, to: M.normalPdf(v, 0, 1), alpha: v === 0 ? 1 : shade });
        P.label(ctx, text, v, 0, { dy: 28, size: 19, color: C.text2, align: 'center', alpha: v === 0 ? 1 : shade });
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（ヒストグラムと山の幅）
  const NOISE_COUNT = 1000;
  const NOISE = M.standardNormals(NOISE_COUNT, 77).map((z) => Math.sqrt(D.TEMP.r) * z);
  const NOISE_HIST = M.histogram(NOISE, -4, 4, 32);
  const INSIDE_2SD = NOISE.filter((v) => Math.abs(v) <= 2 * Math.sqrt(D.TEMP.r)).length;
  add({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '正規分布を図で見る',
    beats: [
      beat(`観測ノイズを ${NOISE_COUNT} 個作って、ヒストグラムにしました。分散は ${D.TEMP.r} です。`, `観測ノイズを、${NOISE_COUNT}個作って、ヒストグラムにしました。ぶんさんは、${D.TEMP.r}です。`),
      beat('正規分布の曲線と、よく合っています。', '正規分布の曲線と、よく合っています。'),
      beat(`± 2 の範囲に入ったのは、${NOISE_COUNT} 個のうち ${INSIDE_2SD} 個でした。約95%です。`, `プラスマイナス2の範囲に入ったのは、${NOISE_COUNT}個のうち、${INSIDE_2SD}個でした。約95パーセントです。`),
      beat(`分散を小さくすると、山は細く高くなります。分散 ${D.TEMP.q} は、システムノイズの大きさです。`, `ぶんさんを小さくすると、山は、細く高くなります。ぶんさん${D.TEMP.q}は、システムノイズの大きさです。`),
      beat('山の幅が、不確かさです。細い山は「よく分かっている」、広い山は「あまり分かっていない」ことを表します。', '山の幅が、不確かさです。細い山は、よく分かっている。広い山は、あまり分かっていないことを表します。'),
    ],
    build(ui) {
      ui.text('細い山 ＝ よく分かっている', { x: 1130, y: 300, size: 25, weight: 700, color: S.COLOR.filter, at: 4 });
      ui.text('広い山 ＝ あまり分かっていない', { x: 1130, y: 360, size: 25, weight: 700, color: S.COLOR.obs, at: 4, delay: 0.5 });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 130, y: 170, w: 920, h: 500, xr: [-4, 4], yr: [0, keyframes(s.u, [[s.bt(3), 0.5], [s.bt(3) + 1.2, 1.75]])] });
      const a0 = s.p(0, 0.5, 0.2);
      const tall = s.u >= s.bt(3) + 0.6;
      P.axes(ctx, { xticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4], yticks: tall ? [0, 0.5, 1, 1.5] : [0, 0.1, 0.2, 0.3, 0.4], fmtY: (v) => fmt(v, 1), xlabel: 'ノイズの値（℃）', ylabel: '確率密度', alpha: a0 });
      const grow = s.p(0, 1.6, 0.4);
      const shade = s.p(2, 0.6, 0.3) * (1 - s.p(3, 0.5));
      ctx.save();
      P.clip(ctx);
      NOISE_HIST.centers.forEach((c, i) => {
        const inside = Math.abs(c) < 2;
        ctx.fillStyle = rgba(S.COLOR.obs, (inside ? 0.3 + 0.3 * shade : 0.3 - 0.15 * shade) * a0);
        const top = P.sy(NOISE_HIST.density[i] * grow);
        ctx.fillRect(P.sx(c - NOISE_HIST.width / 2) + 1, top, P.sx(c + NOISE_HIST.width / 2) - P.sx(c - NOISE_HIST.width / 2) - 2, P.sy(0) - top);
      });
      ctx.restore();
      const a1 = s.p(1, 0.6, 0.2);
      S.drawBell(ctx, P, 0, D.TEMP.r, { color: S.COLOR.obs, alpha: a1, fill: 0 });
      [-2, 2].forEach((v) => P.vline(ctx, v, { color: C.text2, alpha: shade }));
      canvasText(ctx, `${INSIDE_2SD} / ${NOISE_COUNT} 個`, P.sx(0), P.sy(0.46), { size: 28, color: C.text, weight: 800, align: 'center', alpha: shade });
      const a3 = s.p(3, 0.6, 0.8);
      S.drawBell(ctx, P, 0, D.TEMP.q, { color: S.COLOR.filter, alpha: a3 });
      const items = [{ kind: 'band', color: S.COLOR.obs, label: `観測ノイズ（分散 R = ${D.TEMP.r}）` }];
      if (a3 > 0) items.push({ color: S.COLOR.filter, label: `システムノイズ（分散 Q = ${D.TEMP.q}）` });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（足すと分散は足し算）
  const SUM_COUNT = 2000;
  const SUM_VARS = [1, 3];
  const SUM_A = M.standardNormals(SUM_COUNT, 91).map((z) => Math.sqrt(SUM_VARS[0]) * z);
  const SUM_B = M.standardNormals(SUM_COUNT, 92).map((z) => Math.sqrt(SUM_VARS[1]) * z);
  const SUM_AB = SUM_A.map((v, i) => v + SUM_B[i]);
  const SUM_SAMPLE_VAR = M.variance(SUM_AB);
  const SUM_HIST = M.histogram(SUM_AB, -7, 7, 28);
  add({
    id: '3V-3',
    chapter: 3,
    kind: 'visual',
    title: '足すと、分散は足し算になる',
    beats: [
      beat(`性質の1つめを、図で確かめます。左は分散 ${SUM_VARS[0]}、真ん中は分散 ${SUM_VARS[1]} の正規分布です。`, `性質のひとつめを、図で確かめます。左は、ぶんさん${SUM_VARS[0]}。真ん中は、ぶんさん${SUM_VARS[1]}の、正規分布です。`),
      beat(`それぞれから1つずつ取り出して、足します。これを ${SUM_COUNT} 回繰り返しました。`, `それぞれから、ひとつずつ取り出して、足します。これを、${SUM_COUNT}回繰り返しました。`),
      beat(`足した値のヒストグラムは、分散 ${SUM_VARS[0] + SUM_VARS[1]} の正規分布と合っています。実際の分散は ${fmt(SUM_SAMPLE_VAR, 2)} でした。`, `足したあたいのヒストグラムは、ぶんさん${SUM_VARS[0] + SUM_VARS[1]}の、正規分布と合っています。実際のぶんさんは、${fmt(SUM_SAMPLE_VAR, 2)}でした。`),
      beat('足すと、山は必ず広がります。不確かなものどうしを足すと、不確かさは増えます。状態にノイズが足されるたびに、これが起きます。', '足すと、山は必ず広がります。不確かなものどうしを足すと、不確かさは増えます。状態に、ノイズが足されるたびに、これが起きます。'),
    ],
    build(ui) {
      ui.text('＋', { x: 500, y: 380, size: 48, color: C.muted });
      ui.text('＝', { x: 980, y: 380, size: 48, color: C.muted, at: 1 });
      ui.text('不確かなものを足すと、不確かさは増える', { x: 130, y: 680, size: 27, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3 }] });
    },
    draw(ctx, s) {
      const panels = [
        { x: 120, variance: SUM_VARS[0], color: S.COLOR.filter, at: 0, label: `分散 ${SUM_VARS[0]}` },
        { x: 600, variance: SUM_VARS[1], color: S.COLOR.obs, at: 0, label: `分散 ${SUM_VARS[1]}` },
        { x: 1080, variance: SUM_VARS[0] + SUM_VARS[1], color: S.COLOR.predict, at: 2, label: `分散 ${SUM_VARS[0]} + ${SUM_VARS[1]} = ${SUM_VARS[0] + SUM_VARS[1]}` },
      ];
      panels.forEach((panel, i) => {
        const P = new Plot({ x: panel.x, y: 210, w: 400, h: 380, xr: [-7, 7], yr: [0, 0.45] });
        const frame = s.p(i === 2 ? 1 : 0, 0.6, 0.2 + 0.4 * (i === 1 ? 1 : 0));
        if (frame <= 0) return;
        P.axes(ctx, { xticks: [-6, -3, 0, 3, 6], yticks: [], alpha: frame });
        if (i === 2) {
          const grow = s.p(1, 1.8, 0.6);
          ctx.save();
          P.clip(ctx);
          ctx.fillStyle = rgba(panel.color, 0.3 * frame);
          SUM_HIST.centers.forEach((c, k) => {
            const top = P.sy(SUM_HIST.density[k] * grow);
            ctx.fillRect(P.sx(c - SUM_HIST.width / 2) + 1, top, P.sx(c + SUM_HIST.width / 2) - P.sx(c - SUM_HIST.width / 2) - 2, P.sy(0) - top);
          });
          ctx.restore();
        }
        const curve = s.p(panel.at, 0.6, 0.4 + 0.4 * (i === 1 ? 1 : 0));
        S.drawBell(ctx, P, 0, panel.variance, { color: panel.color, alpha: curve, fill: i === 2 ? 0 : 0.14 });
        canvasText(ctx, panel.label, P.x + P.w / 2, P.y - 16, { size: 24, color: C.text, weight: 800, align: 'center', alpha: curve });
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（ランダムウォークの広がり）
  const WALK_COUNT = 40;
  const WALKS = Array.from({ length: WALK_COUNT }, (_, k) => {
    let x = D.TEMP.x0;
    return [D.TEMP.x0, ...M.standardNormals(D.TEMP.count, 500 + k).map((z) => (x += Math.sqrt(D.TEMP.q) * z))];
  });
  const WALK_T = [0, ...T];
  const WALK_FINAL_SD = Math.sqrt(D.TEMP.count * D.TEMP.q);
  add({
    id: '3V-2',
    chapter: 3,
    kind: 'visual',
    title: '観測がないと、不確かさは増え続ける',
    beats: [
      beat(`状態方程式だけを、100回繰り返してみます。${D.TEMP.x0} 度から始めた、1本の線です。`, `状態方程式だけを、ひゃっかい繰り返してみます。${D.TEMP.x0}度から始めた、いっぽんの線です。`),
      beat(`同じことを ${WALK_COUNT} 回やると、線は扇のように広がります。`, `同じことを、${WALK_COUNT}回やると、線は、おうぎのように広がります。`),
      beat(R`1回進むごとに、分散が $Q$ ずつ足されるからです。$t$ 回後の分散は $tQ$ になります。`, '1回進むごとに、ぶんさんが、キューずつ足されるからです。ティー回あとのぶんさんは、ティーかけるキューになります。'),
      beat(R`帯は ± $2\sqrt{tQ}$ です。観測がないと、状態の不確かさは、時間とともに増え続けます。`, 'おびは、プラスマイナス、標準偏差ふたつぶんです。観測がないと、状態の不確かさは、時間とともに、増え続けます。'),
      beat('この「先を予測すると、不確かさが増える」ことが、次回のカルマンフィルターの、前半の動きになります。', 'この、先を予測すると、不確かさが増えることが、次回のカルマンフィルターの、前半の動きになります。'),
    ],
    build(ui) {
      ui.tex(R`\operatorname{Var}(x_t) = \underbrace{Q + Q + \cdots + Q}_{t\ \text{回}} = t\,Q`, { x: 1120, y: 200, size: 26, at: 2 });
      ui.text(R`100 回後：分散 ${fmt(D.TEMP.count * D.TEMP.q, 2)}、<br>標準偏差 ${fmt(WALK_FINAL_SD, 1)} ℃`, { x: 1120, y: 330, size: 23, color: C.text2, at: 3 });
      ui.text('予測すると、不確かさが増える', { x: 1120, y: 470, size: 25, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 940, h: 500, xr: [0, 100], yr: [13.5, 26.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [14, 16, 18, 20, 22, 24, 26], xlabel: '時刻 t（分）', ylabel: '状態 x（℃）', alpha: a0 });
      const band = s.p(3, 0.8, 0.2);
      if (band > 0) {
        const sd = WALK_T.map((t) => Math.sqrt(t * D.TEMP.q));
        P.band(ctx, WALK_T, sd.map((v) => D.TEMP.x0 - 2 * v), sd.map((v) => D.TEMP.x0 + 2 * v), { color: S.COLOR.predict, alpha: 0.2 * band });
        P.line(ctx, WALK_T, sd.map((v) => D.TEMP.x0 + 2 * v), { color: S.COLOR.predict, width: 2.5, alpha: band });
        P.line(ctx, WALK_T, sd.map((v) => D.TEMP.x0 - 2 * v), { color: S.COLOR.predict, width: 2.5, alpha: band });
      }
      WALKS.forEach((walk, k) => {
        const upto = k === 0 ? s.p(0, 2.6, 0.5) : s.p(1, 1.8, 0.3 + 0.03 * k);
        P.line(ctx, WALK_T, walk, { color: k === 0 ? S.COLOR.truth : S.COLOR.other, width: k === 0 ? 3.5 : 1.6, alpha: a0 * (k === 0 ? 1 : 0.8), upto });
      });
      P.line(ctx, WALK_T, WALKS[0], { color: S.COLOR.truth, width: 3.5, alpha: a0, upto: s.p(0, 2.6, 0.5) });
    },
  });
})();
