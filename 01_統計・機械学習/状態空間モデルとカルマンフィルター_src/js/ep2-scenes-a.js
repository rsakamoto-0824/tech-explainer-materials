// ep2-scenes-a.js — 第2回「カルマンフィルターのしくみ」の前半: はじめに、ポイント、第1〜4章（復習、2つの情報を混ぜる、予測、更新とゲイン）。
// 場面の書き方は scene-kit.js の冒頭を参照。画面に出す数値は手で書かず、計算した値を表示する。
(() => {
  const { C, CHAPTERS, Plot, fmt, texNum, canvasText, keyframes, legend, rgba, clamp } = KIT;
  const M = SSM;
  const D = SSMDATA;
  const S = SDRAW;
  const { beat, add, LEFT_X, CARD_X, CARD_W, seeThrough, eq, note, keyPoint } = SK;
  const R = String.raw;

  // ---------------------------------------------------------------- はじめに
  SK.titleScene({
    episode: 2,
    subtitle: '予測と観測を、不確かさに応じて混ぜる',
    chapters: CHAPTERS,
    footnote: '例のデータは、第1回と同じ「部屋の温度」と「台車の位置」です',
    beats: [
      beat('状態空間モデルとカルマンフィルターの第2回です。今回は、カルマンフィルターのしくみを解説します。', '状態空間モデルと、カルマンフィルターの、第2回です。今回は、カルマンフィルターのしくみを解説します。'),
      beat('今回は8章です。前半は1次元の例で考え方をつかみ、後半で行列の式に進みます。', '今回は8章です。前半は、1次元の例で考え方をつかみ、後半で、ぎょうれつの式に進みます。'),
      beat('例のデータは、前回と同じ、部屋の温度と台車の位置です。', '例のデータは、前回と同じ、部屋の温度と、台車の位置です。'),
    ],
  });

  // ---------------------------------------------------------------- この回のポイント
  const POINT_CARDS = [{ x: 90, y: 124 }, { x: 810, y: 124 }, { x: 90, y: 440 }, { x: 810, y: 440 }];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 296;
  const FIG = { dx: 410, dy: 56, w: 262, h: 210 };
  const CART_T = D.cartTimes;
  const CART_SPEED_HAT = D.cartKalman.steps.map((step) => step.x[1]);
  add({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この回のポイント',
    beats: [
      beat('この回のポイントです。', 'この回のポイントです。', 4),
      beat('① カルマンフィルターは、予測と更新の繰り返しです。予測で不確かさが増え、更新で減ります。', 'ひとつめ。カルマンフィルターは、予測と更新の繰り返しです。予測で不確かさが増え、更新で減ります。'),
      beat('② 予測と観測は、不確かさに応じて混ぜます。その混ぜ具合が、カルマンゲインです。', 'ふたつめ。予測と観測は、不確かさに応じて混ぜます。その混ぜ具合が、カルマンゲインです。'),
      beat('③ 追いかけるのは、推定値とその分散の、2つの数だけです。計算は四則演算で済みます。', 'みっつめ。追いかけるのは、推定値と、そのぶんさんの、ふたつの数だけです。計算は、四則演算で済みます。'),
      beat('④ 行列にしても、同じ形です。位置だけの観測から、測っていない速度まで推定できます。', 'よっつめ。ぎょうれつにしても、同じ形です。位置だけの観測から、測っていない速度まで、推定できます。'),
      beat('この流れを、式と図で順に見ていきます。', 'この流れを、式と図で、順に見ていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 予測と更新の繰り返し', '予測で不確かさが増え、<br>更新で減る'],
        ['② カルマンゲイン', '予測と観測を、不確かさに応じて混ぜる。その混ぜ具合'],
        ['③ 2つの数だけを追う', '推定値と分散。計算は四則演算だけ'],
        ['④ 行列でも同じ形', '位置の観測だけから、測っていない速度も推定できる'],
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
        const P = new Plot({ ...fig(0), xr: [-5, 5], yr: [0, 0.62] });
        ctx.save();
        ctx.globalAlpha = a1;
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        S.drawBell(ctx, P, 0, 3.2, { color: S.COLOR.predict });
        S.drawBell(ctx, P, 0.8, 0.6, { color: S.COLOR.filter });
        P.label(ctx, '予測', -3.6, 0.2, { size: 19, color: S.COLOR.predict, weight: 800 });
        P.label(ctx, '更新', 1.9, 0.48, { size: 19, color: S.COLOR.filter, weight: 800 });
        ctx.restore();
      }
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const f = fig(1);
        const y = f.y + 110;
        ctx.save();
        ctx.globalAlpha = a2;
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(f.x + 10, y);
        ctx.lineTo(f.x + f.w - 10, y);
        ctx.stroke();
        const k = 0.65 * s.p(2, 1.2, 0.8);
        const x0 = f.x + 30;
        const x1 = f.x + f.w - 30;
        [[x0, S.COLOR.predict, '予測'], [x1, S.COLOR.obs, '観測']].forEach(([x, color, text]) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
          canvasText(ctx, text, x, y + 38, { size: 19, color, weight: 800, align: 'center' });
        });
        ctx.fillStyle = S.COLOR.filter;
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * k, y, 12, 0, Math.PI * 2);
        ctx.fill();
        canvasText(ctx, 'K', x0 + (x1 - x0) * k, y - 26, { size: 24, color: S.COLOR.filter, weight: 800, align: 'center' });
        ctx.restore();
      }
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const f = fig(2);
        ctx.save();
        ctx.globalAlpha = a3;
        S.box(ctx, f.x + 10, f.y + 30, 110, 70, '推定値', { color: S.COLOR.filter, size: 20 });
        S.box(ctx, f.x + 142, f.y + 30, 110, 70, '分散', { color: S.COLOR.filter, size: 20 });
        canvasText(ctx, '＋ − × ÷', f.x + f.w / 2, f.y + 160, { size: 30, color: C.text2, weight: 700, align: 'center' });
        ctx.restore();
      }
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const P = new Plot({ ...fig(3), xr: [0, 40], yr: [-0.2, 1.8] });
        ctx.save();
        ctx.globalAlpha = a4;
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        P.line(ctx, CART_T, D.cartSim.velocity, { color: S.COLOR.truth, width: 2.5, dash: [7, 5] });
        P.line(ctx, CART_T, CART_SPEED_HAT, { color: S.COLOR.filter, width: 3, upto: s.p(4, 1.6, 0.6) });
        P.label(ctx, '速度の推定', 40, 1.7, { size: 17, color: C.text2, align: 'right' });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論（復習と問い）
  add({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: CHAPTERS[0],
    beats: [
      beat('前回の復習です。状態空間モデルは、2本の式でした。状態は少しずつ動き、観測にはノイズが乗ります。', '前回の復習です。状態空間モデルは、にほんの式でした。状態は少しずつ動き、観測には、ノイズが乗ります。'),
      beat(R`今回の問いです。時刻 $t$ までの観測 $y_1, \dots, y_t$ から、今の状態 $x_t$ を推定します。フィルタリングの問題です。`, '今回の問いです。時刻ティーまでの観測から、今の状態、エックスティーを推定します。フィルタリングの問題です。'),
      beat('答えは、1つの数ではなく、分布で表します。このあたりにありそうだ、という山です。', '答えは、ひとつの数ではなく、分布で表します。このあたりにありそうだ、という山です。'),
      beat(R`線形で、ノイズが正規分布なら、この山も正規分布になります。だから、平均 $\hat{x}_t$ と分散 $P_t$ の2つを求めれば十分です。`, '線形で、ノイズが正規分布なら、この山も、正規分布になります。だから、平均エックスハットと、ぶんさんピーの、ふたつを求めれば十分です。'),
      beat(R`$\hat{x}_t$ が推定値、$P_t$ がその不確かさです。この2つを、観測が来るたびに更新していく手順が、カルマンフィルターです。`, 'エックスハットが推定値、ピーが、その不確かさです。このふたつを、観測が来るたびに更新していく手順が、カルマンフィルターです。'),
    ],
    build(ui) {
      note(ui, '前回のモデル（ローカルレベルモデル）', LEFT_X, 128, { weight: 700 });
      eq(ui, R`x_t = x_{t-1} + w_t,\quad w_t \sim \mathcal{N}(0, Q)`, 168, { size: 30 });
      eq(ui, R`y_t = x_t + v_t,\quad v_t \sim \mathcal{N}(0, R)`, 226, { size: 30, delay: 0.4 });
      note(ui, '今回の問い', LEFT_X, 318, { at: 1, weight: 700 });
      ui.text(R`観測 $y_1, y_2, \dots, y_t$ から、今の状態 $x_t$ を推定する`, { x: LEFT_X, y: 356, size: 28, at: 1, delay: 0.3 });
      eq(ui, R`x_t \mid y_1, \dots, y_t \ \sim\ \mathcal{N}\big(\hat{x}_t,\ P_t\big)`, 450, { at: 3, size: 38, glow: [{ from: 3, to: 4 }] });
      ui.text(R`$\hat{x}_t$：推定値（山の中心）`, { x: LEFT_X + 20, y: 550, size: 25, at: 4 });
      ui.text(R`$P_t$：推定の分散（山の幅 ＝ 不確かさ）`, { x: LEFT_X + 20, y: 600, size: 25, at: 4, delay: 0.4 });
      keyPoint(ui, R`$\hat{x}_t$ と $P_t$ を、観測のたびに更新する ＝ カルマンフィルター`, 670, 4);
    },
    draw(ctx, s) {
      const a = s.p(2, 0.6, 0.3);
      if (a <= 0) return;
      const P = new Plot({ x: 1040, y: 300, w: 460, h: 280, xr: [17, 25], yr: [0, 0.62] });
      ctx.save();
      ctx.globalAlpha = a;
      P.hline(ctx, 0, { color: C.axis, dash: null, width: 1.5 });
      S.drawBell(ctx, P, 21, 0.5, { color: S.COLOR.filter });
      const labels = s.p(3, 0.6, 0.6);
      P.vline(ctx, 21, { color: C.text2, from: 0, to: M.normalPdf(21, 21, 0.5), alpha: labels });
      S.mathLabel(ctx, 'x', 't', P.sx(21), P.sy(0) + 30, { size: 30, hat: true, alpha: labels });
      S.arrow(ctx, P.sx(21), P.sy(0.2), P.sx(22.2), P.sy(0.2), { color: C.text2, head: 9, alpha: labels });
      S.arrow(ctx, P.sx(21), P.sy(0.2), P.sx(19.8), P.sy(0.2), { color: C.text2, head: 9, alpha: labels });
      canvasText(ctx, '幅 ＝ 不確かさ', P.sx(22.5), P.sy(0.21), { size: 20, color: C.text2, alpha: labels });
      canvasText(ctx, '「このあたりにありそう」', P.x + P.w / 2, P.y - 14, { size: 21, color: C.text2, align: 'center' });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（予測と更新のサイクル）
  const CYCLE = { predict: { x: 190, y: 270, w: 330, h: 120 }, update: { x: 760, y: 270, w: 330, h: 120 } };
  add({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '予測と更新の繰り返し',
    beats: [
      beat('カルマンフィルターは、2つのステップの繰り返しです。', 'カルマンフィルターは、ふたつのステップの繰り返しです。'),
      beat('予測ステップ。1つ前の推定から、モデルを使って、今の状態を予測します。', '予測ステップ。ひとつ前の推定から、モデルを使って、今の状態を予測します。'),
      beat('更新ステップ。新しい観測が来たら、予測と混ぜて、推定を直します。', '更新ステップ。新しい観測が来たら、予測と混ぜて、推定を直します。'),
      beat('直した推定は、次の時刻の予測の出発点になります。これを、観測が来るたびに繰り返します。', '直した推定は、次の時刻の、予測の出発点になります。これを、観測が来るたびに繰り返します。'),
      beat('覚えておくのは、最新の推定値とその分散の、2つの数だけです。過去のデータは、取っておく必要がありません。', '覚えておくのは、最新の推定値と、そのぶんさんの、ふたつの数だけです。過去のデータは、取っておく必要がありません。'),
    ],
    build(ui) {
      ui.card({ x: 1190, y: 250, w: 340, h: 200, title: '覚えておくもの', at: 4, glow: [{ from: 4 }] });
      ui.text(R`推定値 $\hat{x}_t$`, { x: 1216, y: 302, size: 27, at: 4, delay: 0.3 });
      ui.text(R`その分散 $P_t$`, { x: 1216, y: 362, size: 27, at: 4, delay: 0.6 });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.6, 0.2);
      const { predict, update } = CYCLE;
      const glowPredict = s.win(1, 2);
      const glowUpdate = s.win(2, 3);
      const loop = s.p(3, 1.0, 0.3);
      // 予測 → 更新
      S.arrow(ctx, predict.x + predict.w + 10, predict.y + predict.h / 2, update.x - 10, update.y + update.h / 2, { color: C.text2, width: 3.5, alpha: a0, head: 15 });
      // 更新 → 予測（下を回る戻りの線）
      if (loop > 0) {
        const y = 560;
        ctx.save();
        ctx.globalAlpha = loop;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(update.x + update.w / 2, update.y + update.h + 8);
        ctx.lineTo(update.x + update.w / 2, y);
        ctx.lineTo(predict.x + predict.w / 2, y);
        ctx.lineTo(predict.x + predict.w / 2, predict.y + predict.h + 26);
        ctx.stroke();
        ctx.restore();
        S.arrow(ctx, predict.x + predict.w / 2, predict.y + predict.h + 40, predict.x + predict.w / 2, predict.y + predict.h + 8, { color: C.yellow, width: 4, alpha: loop, head: 16 });
        canvasText(ctx, '次の時刻へ（推定値と分散を渡す）', (predict.x + update.x + update.w) / 2, y + 36, { size: 22, color: C.yellow, weight: 700, align: 'center', alpha: loop });
      }
      // 観測が入る
      const obs = s.p(2, 0.6, 0.2);
      S.nodeShape(ctx, update.x + update.w / 2, 170, { r: 34, shape: 'square', color: S.COLOR.obs, alpha: obs });
      S.mathLabel(ctx, 'y', 't', update.x + update.w / 2, 170, { size: 30, alpha: obs });
      canvasText(ctx, '新しい観測', update.x + update.w / 2 + 52, 176, { size: 21, color: S.COLOR.obs, weight: 700, alpha: obs });
      S.arrow(ctx, update.x + update.w / 2, 210, update.x + update.w / 2, update.y - 8, { color: S.COLOR.obs, width: 3.5, alpha: obs, upto: obs, head: 14 });
      S.box(ctx, predict.x, predict.y, predict.w, predict.h, '予測ステップ', { color: S.COLOR.predict, alpha: a0, size: 28, sub: 'モデルで1つ先へ進める', glow: glowPredict });
      S.box(ctx, update.x, update.y, update.w, update.h, '更新ステップ', { color: S.COLOR.filter, alpha: a0, size: 28, sub: '観測と混ぜて直す', glow: glowUpdate });
      // 箱の下の小さな山（予測は広く、更新は狭い）
      [[predict, 2.6, S.COLOR.predict, s.p(1, 0.6, 0.6), '不確かさが増える'], [update, 0.7, S.COLOR.filter, s.p(2, 0.6, 0.9), '不確かさが減る']].forEach(([b, variance, color, alpha, text]) => {
        if (alpha <= 0) return;
        const P = new Plot({ x: b.x + 40, y: b.y + b.h + 40, w: b.w - 80, h: 90, xr: [-4.5, 4.5], yr: [0, 0.52] });
        ctx.save();
        ctx.globalAlpha = alpha * (1 - 0.75 * loop);
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        S.drawBell(ctx, P, 0, variance, { color });
        canvasText(ctx, text, b.x + b.w / 2, b.y + b.h + 158, { size: 20, color, weight: 700, align: 'center' });
        ctx.restore();
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（2つの温度計）
  const TWO = { a: 20, varA: 4, b: 23, varB: 1 };
  const TWO_K = TWO.varA / (TWO.varA + TWO.varB);
  const TWO_MEAN = TWO.a + TWO_K * (TWO.b - TWO.a);
  const TWO_VAR = (1 - TWO_K) * TWO.varA;
  const TWO_PLAIN = (TWO.a + TWO.b) / 2;
  const twoPlot = () => new Plot({ x: 130, y: 180, w: 960, h: 480, xr: [14, 27], yr: [0, 0.5] });
  const twoAxes = (ctx, P, alpha) => P.axes(ctx, { xticks: [14, 16, 18, 20, 22, 24, 26], yticks: [], xlabel: '温度（℃）', alpha });
  add({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: CHAPTERS[1],
    beats: [
      beat('混ぜ方を、簡単な例で考えます。同じ部屋に、温度計が2つあります。', '混ぜかたを、簡単な例で考えます。同じ部屋に、温度計が、ふたつあります。'),
      beat(`温度計Aの読みは ${TWO.a} 度。ただし目盛りが粗く、分散は ${TWO.varA} です。`, `温度計エーの読みは、${TWO.a}度。ただし、目盛りが粗く、ぶんさんは${TWO.varA}です。`),
      beat(`温度計Bの読みは ${TWO.b} 度。こちらは精密で、分散は ${TWO.varB} です。`, `温度計ビーの読みは、${TWO.b}度。こちらは精密で、ぶんさんは${TWO.varB}です。`),
      beat(`本当の温度は、どのあたりでしょうか。ただの平均は ${fmt(TWO_PLAIN, 1)} 度ですが、精密なBのほうを信じたいところです。`, `本当の温度は、どのあたりでしょうか。ただの平均は、${fmt(TWO_PLAIN, 1)}度ですが、精密なビーのほうを、信じたいところです。`),
      beat(`正しく混ぜると、${fmt(TWO_MEAN, 1)} 度になります。分散は ${fmt(TWO_VAR, 1)} で、どちらの温度計よりも小さくなります。`, `正しく混ぜると、${fmt(TWO_MEAN, 1)}度になります。ぶんさんは${fmt(TWO_VAR, 1)}で、どちらの温度計よりも、小さくなります。`),
      beat('2つの情報を合わせると、どちらか一方だけのときより、必ず確かになります。', 'ふたつの情報を合わせると、どちらか一方だけのときより、必ず確かになります。'),
    ],
    build(ui) {
      ui.card({ x: 1140, y: 180, w: 390, h: 300, title: '2つの温度計', at: 1 });
      ui.table({
        x: 1160, y: 230, widths: [150, 110, 90], size: 21, rowH: 56,
        header: ['', '読み ℃', '分散'],
        rows: [['温度計 A', String(TWO.a), String(TWO.varA)], ['温度計 B', String(TWO.b), String(TWO.varB)], ['混ぜた結果', fmt(TWO_MEAN, 1), fmt(TWO_VAR, 1)]],
        rowAt: [1, 2, 4], delay: 0.4,
        glowRows: [null, null, [{ from: 4 }]],
      });
      ui.text('合わせると、必ず確かになる', { x: 1140, y: 520, size: 25, weight: 700, color: C.yellow, at: 5, glow: [{ from: 5 }] });
    },
    draw(ctx, s) {
      const P = twoPlot();
      twoAxes(ctx, P, s.p(0, 0.5, 0.2));
      const aA = s.p(1, 0.6, 0.2);
      const aB = s.p(2, 0.6, 0.2);
      const aMix = s.p(4, 0.6, 0.3);
      S.drawBell(ctx, P, TWO.a, TWO.varA, { color: S.COLOR.predict, alpha: aA * (1 - 0.4 * aMix) });
      S.drawBell(ctx, P, TWO.b, TWO.varB, { color: S.COLOR.obs, alpha: aB * (1 - 0.4 * aMix) });
      P.label(ctx, 'A', TWO.a, M.normalPdf(TWO.a, TWO.a, TWO.varA), { dy: -14, size: 26, color: S.COLOR.predict, weight: 800, align: 'center', alpha: aA });
      P.label(ctx, 'B', TWO.b, M.normalPdf(TWO.b, TWO.b, TWO.varB), { dx: 46, dy: 6, size: 26, color: S.COLOR.obs, weight: 800, align: 'center', alpha: aB });
      const plain = s.win(3, 4);
      P.vline(ctx, TWO_PLAIN, { color: C.muted, alpha: plain });
      P.label(ctx, `ただの平均 ${fmt(TWO_PLAIN, 1)}`, TWO_PLAIN, 0.47, { dx: -10, size: 20, color: C.text2, align: 'right', alpha: plain });
      S.drawBell(ctx, P, TWO_MEAN, TWO_VAR, { color: S.COLOR.filter, alpha: aMix, width: 4.5, fill: 0.2 });
      P.label(ctx, `混ぜた結果 ${fmt(TWO_MEAN, 1)} ℃`, TWO_MEAN, M.normalPdf(TWO_MEAN, TWO_MEAN, TWO_VAR), { dx: -16, dy: -4, size: 24, color: S.COLOR.filter, weight: 800, align: 'right', alpha: aMix });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（山の掛け算）
  const productCurve = (xs) => xs.map((x) => M.normalPdf(x, TWO.a, TWO.varA) * M.normalPdf(x, TWO.b, TWO.varB));
  const PRODUCT_XS = M.linspace(14, 27, 260);
  const PRODUCT = productCurve(PRODUCT_XS);
  const PRODUCT_AREA = PRODUCT.reduce((sum, v) => sum + v, 0) * (PRODUCT_XS[1] - PRODUCT_XS[0]);
  const PRODUCT_PEAK = PRODUCT_XS[PRODUCT.indexOf(Math.max(...PRODUCT))];
  add({
    id: '2V-2',
    chapter: 2,
    kind: 'visual',
    title: '山と山を掛け合わせる',
    beats: [
      beat('この混ぜ方は、2つの山の掛け算として説明できます。', 'この混ぜかたは、ふたつの山の、掛け算として説明できます。'),
      beat('それぞれの温度について、Aの山の高さと、Bの山の高さを掛けます。どちらの山でも高いところだけが、大きな値として残ります。', 'それぞれの温度について、エーの山の高さと、ビーの山の高さを掛けます。どちらの山でも高いところだけが、大きなあたいとして残ります。'),
      beat('掛けたものは小さいので、面積が1になるように、高さをそろえます。', '掛けたものは小さいので、面積が1になるように、高さをそろえます。'),
      beat(`できた山は、さきほどの「混ぜた結果」と同じです。中心は ${fmt(TWO_MEAN, 1)} 度、分散は ${fmt(TWO_VAR, 1)} です。`, `できた山は、さきほどの、混ぜた結果と同じです。中心は${fmt(TWO_MEAN, 1)}度、ぶんさんは${fmt(TWO_VAR, 1)}です。`),
      beat('正規分布どうしを掛けると、また正規分布になります。両方の情報に合う範囲に、山が絞られるのです。', '正規分布どうしを掛けると、また、正規分布になります。両方の情報に合う範囲に、山が絞られるのです。'),
    ],
    build(ui) {
      ui.text('A の山 × B の山', { x: 1140, y: 210, size: 28, weight: 700, at: 1 });
      ui.text('→ 両方で高いところだけが残る', { x: 1140, y: 262, size: 22, color: C.text2, at: 1, delay: 0.5 });
      ui.text('→ 面積を 1 にそろえる', { x: 1140, y: 310, size: 22, color: C.text2, at: 2 });
      ui.text('→ 「混ぜた結果」と同じ山', { x: 1140, y: 358, size: 22, color: C.text2, at: 3 });
      ui.text('両方の情報に合う範囲に絞られる', { x: 1140, y: 450, size: 24, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = twoPlot();
      twoAxes(ctx, P, s.p(0, 0.5, 0.1));
      const a0 = s.p(0, 0.5, 0.2);
      S.drawBell(ctx, P, TWO.a, TWO.varA, { color: S.COLOR.predict, alpha: a0 * 0.7 });
      S.drawBell(ctx, P, TWO.b, TWO.varB, { color: S.COLOR.obs, alpha: a0 * 0.7 });
      const a1 = s.p(1, 0.6, 0.6);
      if (a1 > 0) {
        // 掛けたままの高さ（小さい）から、面積 1 の高さへ
        const scale = keyframes(s.u, [[s.bt(2) + 0.3, 6], [s.bt(2) + 2.0, 1 / PRODUCT_AREA]]);
        P.band(ctx, PRODUCT_XS, PRODUCT_XS.map(() => 0), PRODUCT.map((v) => v * scale), { color: S.COLOR.filter, alpha: 0.25 * a1 });
        P.line(ctx, PRODUCT_XS, PRODUCT.map((v) => v * scale), { color: S.COLOR.filter, width: 4.5, alpha: a1 });
        if (s.u < s.bt(2)) canvasText(ctx, '（見やすいように 6 倍に拡大）', P.sx(PRODUCT_PEAK) + 60, P.sy(0.1), { size: 18, color: C.muted, alpha: a1 });
      }
      const a3 = s.p(3, 0.6, 0.3);
      P.vline(ctx, TWO_MEAN, { color: S.COLOR.filter, alpha: a3 });
      P.label(ctx, `${fmt(TWO_MEAN, 1)} ℃、分散 ${fmt(TWO_VAR, 1)}`, TWO_MEAN, 0.47, { dx: -12, size: 23, color: S.COLOR.filter, weight: 800, align: 'right', alpha: a3 });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（重みつき平均とゲイン）
  add({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: '混ぜ方を式で書く',
    beats: [
      beat('式で書きます。それぞれの値に、分散の逆数で重みをつけて、平均します。分散が小さい、つまり確かな値ほど、重みが大きくなります。', '式で書きます。それぞれのあたいに、ぶんさんの逆数で、おもみをつけて、平均します。ぶんさんが小さい、つまり、確かなあたいほど、おもみが大きくなります。'),
      beat('混ぜたあとの分散は、逆数の足し算で求まります。', '混ぜたあとの、ぶんさんは、逆数の足し算で求まります。'),
      beat(R`この式は、書きかえられます。A の値 $a$ から出発して、B との差 $b - a$ に $K$ を掛けたぶんだけ、動かす形です。`, 'この式は、書きかえられます。エーのあたいから出発して、ビーとの差に、ケーを掛けたぶんだけ、動かす形です。'),
      beat(R`$K$ は、A の分散を、2つの分散の和で割ったものです。0 から 1 の間の数になります。`, 'ケーは、エーのぶんさんを、ふたつのぶんさんの和で、割ったものです。ゼロから1のあいだの数になります。'),
      beat(`例では、$K$ は ${fmt(TWO_K, 1)}。${TWO.a} 度に、差の ${TWO.b - TWO.a} 度の ${fmt(TWO_K, 1)} 倍を足して、${fmt(TWO_MEAN, 1)} 度です。分散は、${TWO.varA} の ${fmt(1 - TWO_K, 1)} 倍で ${fmt(TWO_VAR, 1)} です。`, `例では、ケーは${fmt(TWO_K, 1)}。${TWO.a}度に、差の${TWO.b - TWO.a}度の、${fmt(TWO_K, 1)}倍を足して、${fmt(TWO_MEAN, 1)}度です。ぶんさんは、${TWO.varA}の${fmt(1 - TWO_K, 1)}倍で、${fmt(TWO_VAR, 1)}です。`),
      beat(R`この「出発点 ＋ $K$ × 差」の形が、カルマンフィルターの更新の式そのものです。A が予測、B が観測にあたります。`, 'この、出発点、たす、ケーかける差の形が、カルマンフィルターの、更新の式そのものです。エーが予測、ビーが観測にあたります。'),
    ],
    build(ui) {
      eq(ui, R`\hat{x} = \frac{\dfrac{a}{\sigma_a^2} + \dfrac{b}{\sigma_b^2}}{\dfrac{1}{\sigma_a^2} + \dfrac{1}{\sigma_b^2}}`, 124, { size: 28 });
      note(ui, '分散の逆数で重みをつけた平均', LEFT_X + 330, 180, {});
      eq(ui, R`\frac{1}{\sigma^2} = \frac{1}{\sigma_a^2} + \frac{1}{\sigma_b^2}`, 290, { at: 1, size: 28 });
      note(ui, '混ぜたあとの分散', LEFT_X + 330, 312, { at: 1, delay: 0.3 });
      note(ui, '書きかえると', LEFT_X, 396, { at: 2, weight: 700 });
      eq(ui, R`\hat{x} = a + K\,(b - a)`, 432, { at: 2, size: 38, glow: [{ from: 2, to: 3 }, { from: 5 }] });
      eq(ui, R`K = \frac{\sigma_a^2}{\sigma_a^2 + \sigma_b^2}`, 520, { at: 3, size: 30, glow: [{ from: 3, to: 4 }] });
      eq(ui, R`\sigma^2 = (1 - K)\,\sigma_a^2`, 536, { at: 3, size: 30, delay: 0.5, x: LEFT_X + 380 });
      keyPoint(ui, R`出発点 ＋ $K$ × 差　（A ＝ 予測、B ＝ 観測）`, 660, 5);

      ui.card({ x: CARD_X - 40, y: 250, w: CARD_W + 40, h: 300, title: `例（A：${TWO.a} ℃・分散 ${TWO.varA}、B：${TWO.b} ℃・分散 ${TWO.varB}）`, at: 4 });
      ui.tex(R`K = \frac{${TWO.varA}}{${TWO.varA} + ${TWO.varB}} = ${texNum(TWO_K, 1)}`, { x: CARD_X - 10, y: 310, size: 28, at: 4, delay: 0.3 });
      ui.tex(R`\hat{x} = ${TWO.a} + ${texNum(TWO_K, 1)} \times ${TWO.b - TWO.a} = ${texNum(TWO_MEAN, 1)}`, { x: CARD_X - 10, y: 400, size: 28, at: 4, delay: 0.8 });
      ui.tex(R`\sigma^2 = (1 - ${texNum(TWO_K, 1)}) \times ${TWO.varA} = ${texNum(TWO_VAR, 1)}`, { x: CARD_X - 10, y: 470, size: 28, at: 4, delay: 1.3 });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（予測ステップ）
  add({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: CHAPTERS[2],
    beats: [
      beat(R`予測ステップです。1つ前の時刻の推定値を $\hat{x}_{t-1}$、その分散を $P_{t-1}$ とします。`, '予測ステップです。ひとつ前の時刻の推定値を、エックスハット、ティーマイナス1。そのぶんさんを、ピー、ティーマイナス1とします。'),
      beat('ローカルレベルモデルでは、状態は、前の値にノイズを足したものです。ノイズの平均は 0 なので、予測の平均は、前の推定値のままです。', 'ローカルレベルモデルでは、状態は、前のあたいに、ノイズを足したものです。ノイズの平均はゼロなので、予測の平均は、前の推定値のままです。'),
      beat(R`分散は $Q$ だけ増えます。前回見た「足すと、分散は足し算になる」という性質です。`, 'ぶんさんは、キューだけ増えます。前回見た、足すと、ぶんさんは足し算になる、という性質です。'),
      beat(R`右肩のマイナスは、「時刻 $t$ の観測を、まだ見ていない」という印です。`, '右肩のマイナスは、時刻ティーの観測を、まだ見ていない、というしるしです。'),
      beat('予測すると、平均は変わらず、不確かさだけが増えます。', '予測すると、平均は変わらず、不確かさだけが増えます。'),
    ],
    build(ui) {
      note(ui, R`1つ前の推定：$x_{t-1} \sim \mathcal{N}(\hat{x}_{t-1},\ P_{t-1})$`, LEFT_X, 134, { size: 26, color: C.text });
      note(ui, R`モデル：$x_t = x_{t-1} + w_t$`, LEFT_X, 196, { size: 26, color: C.text, at: 1 });
      note(ui, '予測の平均', LEFT_X, 290, { at: 1, weight: 700, color: S.COLOR.predict, size: 24 });
      eq(ui, R`\hat{x}_t^- = \hat{x}_{t-1}`, 330, { at: 1, size: 42, glow: [{ from: 1, to: 2 }] });
      note(ui, '前の推定値のまま', LEFT_X + 400, 348, { at: 1, delay: 0.5 });
      note(ui, '予測の分散', LEFT_X, 440, { at: 2, weight: 700, color: S.COLOR.predict, size: 24 });
      eq(ui, R`P_t^- = P_{t-1} + Q`, 480, { at: 2, size: 42, glow: [{ from: 2, to: 3 }] });
      note(ui, R`$Q$ だけ増える`, LEFT_X + 400, 498, { at: 2, delay: 0.5 });
      note(ui, R`右肩の $-$：時刻 $t$ の観測をまだ見ていない`, LEFT_X, 590, { at: 3, size: 23 });
      keyPoint(ui, '予測：平均はそのまま、不確かさだけが増える', 660, 4);
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（山が広がる）
  const H = D.HAND;
  const PRED_VAR = H.p0 + H.q;
  add({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '予測すると、山が広がる',
    beats: [
      beat(`図で見ます。青が、1つ前の時刻の推定です。平均 ${H.m0} 度、分散 ${H.p0} とします。`, `図で見ます。青が、ひとつ前の時刻の推定です。平均${H.m0}度、ぶんさん${H.p0}とします。`),
      beat(R`予測すると、山は同じ場所のまま、横に広がります。分散は、${H.p0} に $Q$ の ${H.q} を足して、${PRED_VAR} になりました。`, `予測すると、山は、同じ場所のまま、横に広がります。ぶんさんは、${H.p0}に、キューの${H.q}を足して、${PRED_VAR}になりました。`),
      beat('時間が1つ進むあいだに、状態がどちらかへ動いたかもしれません。そのぶん、自信が減ったのです。', '時間がひとつ進むあいだに、状態が、どちらかへ動いたかもしれません。そのぶん、自信が減ったのです。'),
      beat('観測が来ないまま予測を繰り返すと、山はどんどん広がっていきます。', '観測が来ないまま、予測を繰り返すと、山は、どんどん広がっていきます。'),
    ],
    build(ui) {
      ui.tex(R`P_t^- = P_{t-1} + Q`, { x: 1150, y: 200, size: 30, at: 1 });
      ui.text('', { x: 1150, y: 290, size: 27, weight: 700, at: 1, live: (u) => `いまの分散：${fmt(currentVariance(u), 1)}` });
    },
    draw(ctx, s, state) {
      const P = new Plot({ x: 130, y: 180, w: 960, h: 480, xr: [12, 28], yr: [0, 0.26] });
      const a0 = s.p(0, 0.5, 0.2);
      P.axes(ctx, { xticks: [12, 14, 16, 18, 20, 22, 24, 26, 28], yticks: [], xlabel: '温度（℃）', alpha: a0 });
      state.times = [s.bt(1) + 0.4, s.bt(3) + 0.6];
      const variance = currentVariance(s.u);
      const moved = s.p(1, 0.5, 0.3);
      S.drawBell(ctx, P, H.m0, H.p0, { color: S.COLOR.filter, alpha: a0 * (1 - 0.6 * moved), dash: moved > 0.5 ? [8, 6] : null, fill: moved > 0.5 ? 0 : 0.14 });
      S.drawBell(ctx, P, H.m0, variance, { color: S.COLOR.predict, alpha: moved, width: 4.5 });
      P.vline(ctx, H.m0, { color: C.muted, alpha: a0 });
      legend(ctx, [{ color: S.COLOR.filter, dash: [8, 6], label: '1つ前の推定' }, { color: S.COLOR.predict, label: '予測（観測を見る前）' }], P.x, P.y + P.h + 76, { alpha: moved });
    },
  });
  // 3V の山の分散: 字幕1で P → P + Q、字幕3でさらに Q を何回も足す
  let varianceClock = null;
  function currentVariance(u) {
    const scene = window.SCENES.find((sc) => sc.id === '3V');
    varianceClock = varianceClock || scene.beatStarts;
    const t1 = varianceClock[1] + 0.4;
    const t3 = varianceClock[3] + 0.6;
    return keyframes(u, [[t1, H.p0], [t1 + 1.6, PRED_VAR], [t3, PRED_VAR], [t3 + 5, PRED_VAR + 6 * H.q]]);
  }

  // ---------------------------------------------------------------- 第4章 理論（更新ステップ）
  add({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: CHAPTERS[3],
    beats: [
      beat('更新ステップです。予測と観測を混ぜます。温度計の例の、A が予測、B が観測です。', '更新ステップです。予測と観測を混ぜます。温度計の例の、エーが予測、ビーが観測です。'),
      beat(R`カルマンゲイン $K_t$ は、予測の分散を、予測の分散と観測ノイズの分散の和で割ったものです。`, 'カルマンゲイン、ケーは、予測のぶんさんを、予測のぶんさんと、観測ノイズのぶんさんの和で、割ったものです。'),
      beat(R`推定値は、予測に、$K_t$ ×「観測と予測の差」を足します。この差を、イノベーションと呼びます。観測が運んできた、新しい情報です。`, '推定値は、予測に、ケーかける、観測と予測の差を足します。この差を、イノベーションと呼びます。観測が運んできた、新しい情報です。'),
      beat(R`分散は、$(1 - K_t)$ 倍に減ります。更新すると、必ず不確かさが減ります。`, 'ぶんさんは、1ひくケー倍に減ります。更新すると、必ず不確かさが減ります。'),
      beat(R`$K_t$ が 1 に近いのは、予測があやふやか、観測が正確なときです。推定は、観測に大きく寄ります。`, 'ケーが1に近いのは、予測があやふやか、観測が正確なときです。推定は、観測に大きく寄ります。'),
      beat(R`$K_t$ が 0 に近いのは、予測に自信があるか、観測が粗いときです。観測は、ほとんど使われません。`, 'ケーがゼロに近いのは、予測に自信があるか、観測が粗いときです。観測は、ほとんど使われません。'),
    ],
    build(ui) {
      note(ui, 'カルマンゲイン', LEFT_X, 130, { at: 1, weight: 700, color: C.yellow, size: 24 });
      eq(ui, R`K_t = \frac{P_t^-}{P_t^- + R}`, 164, { at: 1, size: 38, glow: [{ from: 1, to: 2 }] });
      note(ui, '予測の分散 ÷（予測の分散 ＋ 観測ノイズの分散）', LEFT_X + 330, 196, { at: 1, delay: 0.5 });
      note(ui, '推定値の更新', LEFT_X, 300, { at: 2, weight: 700, color: S.COLOR.filter, size: 24 });
      eq(ui, R`\hat{x}_t = \hat{x}_t^- + K_t\,\htmlClass{innov}{(y_t - \hat{x}_t^-)}`, 340, { at: 2, size: 38, glow: [{ from: 2, to: 3 }], hl: [{ cls: 'innov', from: 2, to: 3, color: S.COLOR.obs }] });
      note(ui, 'イノベーション（観測 − 予測）', LEFT_X + 560, 400, { at: 2, delay: 0.6, color: S.COLOR.obs, weight: 700 });
      note(ui, '分散の更新', LEFT_X, 470, { at: 3, weight: 700, color: S.COLOR.filter, size: 24 });
      eq(ui, R`P_t = (1 - K_t)\,P_t^-`, 510, { at: 3, size: 38, glow: [{ from: 3, to: 4 }] });
      note(ui, '必ず減る', LEFT_X + 400, 528, { at: 3, delay: 0.5 });

      ui.card({ x: CARD_X + 30, y: 130, w: CARD_W - 20, h: 250, title: R`$K_t$ の意味`, at: 4 });
      ui.text(R`<b>$K_t \to 1$</b>：予測があやふや、<br>または観測が正確 → 観測に寄る`, { x: CARD_X + 56, y: 180, size: 21, at: 4, delay: 0.3, glow: [{ from: 4, to: 5 }] });
      ui.text(R`<b>$K_t \to 0$</b>：予測に自信がある、<br>または観測が粗い → 予測のまま`, { x: CARD_X + 56, y: 276, size: 21, at: 5, delay: 0.3, glow: [{ from: 5 }] });
      keyPoint(ui, R`更新：$K_t$ ぶんだけ観測へ寄り、不確かさは必ず減る`, 640, 3);
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（山で見る更新、R を変える）
  const UPD = { pred: H.m0, predVar: PRED_VAR, y: H.ys[0] };
  const R_KEYS = [H.r, 0.5, 16];
  const gainOf = (r) => UPD.predVar / (UPD.predVar + r);
  add({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: 'カルマンゲインは「信じる割合」のつまみ',
    beats: [
      beat(`図で見ます。紫が予測で、平均 ${UPD.pred} 度、分散 ${UPD.predVar}。オレンジが観測で、${UPD.y} 度、分散も ${H.r} です。`, `図で見ます。紫が予測で、平均${UPD.pred}度、ぶんさん${UPD.predVar}。オレンジが観測で、${UPD.y}度、ぶんさんも${H.r}です。`),
      beat(R`2つの不確かさが同じなので、$K$ は ${fmt(gainOf(R_KEYS[0]), 1)}。更新後の推定は、ちょうど真ん中の ${fmt(UPD.pred + gainOf(R_KEYS[0]) * (UPD.y - UPD.pred), 0)} 度で、分散は半分の ${fmt((1 - gainOf(R_KEYS[0])) * UPD.predVar, 0)} になります。`, `ふたつの不確かさが同じなので、ケーは${fmt(gainOf(R_KEYS[0]), 1)}。更新後の推定は、ちょうど真ん中の、${fmt(UPD.pred + gainOf(R_KEYS[0]) * (UPD.y - UPD.pred), 0)}度で、ぶんさんは、半分の${fmt((1 - gainOf(R_KEYS[0])) * UPD.predVar, 0)}になります。`),
      beat(R`観測が正確な場合です。$R$ を ${R_KEYS[1]} にすると、$K$ は ${fmt(gainOf(R_KEYS[1]), 2)}。推定は、観測のすぐ近くまで寄ります。`, `観測が正確な場合です。アールを${R_KEYS[1]}にすると、ケーは${fmt(gainOf(R_KEYS[1]), 2)}。推定は、観測のすぐ近くまで寄ります。`),
      beat(R`観測が粗い場合です。$R$ を ${R_KEYS[2]} にすると、$K$ は ${fmt(gainOf(R_KEYS[2]), 1)}。推定は、予測の近くにとどまります。`, `観測が粗い場合です。アールを${R_KEYS[2]}にすると、ケーは${fmt(gainOf(R_KEYS[2]), 1)}。推定は、予測の近くにとどまります。`),
      beat('カルマンゲインは、予測と観測のどちらをどれだけ信じるかを、不確かさの比から自動で決める、つまみです。', 'カルマンゲインは、予測と観測の、どちらをどれだけ信じるかを、不確かさの比率から、自動で決める、つまみです。'),
    ],
    build(ui) {
      ui.text('', { x: 1150, y: 196, size: 26, weight: 700, at: 0, live: (u) => `観測の分散 R ＝ ${fmt(rAt(u), rAt(u) < 1 ? 1 : 0)}` });
      ui.text('', { x: 1150, y: 250, size: 26, weight: 700, color: C.yellow, at: 1, live: (u) => `ゲイン K ＝ ${fmt(gainOf(rAt(u)), 2)}` });
      ui.text('', { x: 1150, y: 304, size: 24, color: C.text2, at: 1, live: (u) => `推定 ${fmt(UPD.pred + gainOf(rAt(u)) * (UPD.y - UPD.pred), 2)} ℃、分散 ${fmt((1 - gainOf(rAt(u))) * UPD.predVar, 2)}` });
      ui.text('0（予測を信じる）', { x: 1150, y: 446, size: 18, color: S.COLOR.predict, at: 1 });
      ui.text('1（観測を信じる）', { x: 1385, y: 446, size: 18, color: S.COLOR.obs, at: 1 });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 130, y: 180, w: 960, h: 480, xr: [13, 29], yr: [0, 0.62] });
      const a0 = s.p(0, 0.5, 0.2);
      P.axes(ctx, { xticks: [14, 16, 18, 20, 22, 24, 26, 28], yticks: [], xlabel: '温度（℃）', alpha: a0 });
      const r = rAt(s.u);
      const k = gainOf(r);
      const mean = UPD.pred + k * (UPD.y - UPD.pred);
      const variance = (1 - k) * UPD.predVar;
      S.drawBell(ctx, P, UPD.pred, UPD.predVar, { color: S.COLOR.predict, alpha: a0 });
      S.drawBell(ctx, P, UPD.y, r, { color: S.COLOR.obs, alpha: s.p(0, 0.5, 1.0) });
      const a1 = s.p(1, 0.6, 0.3);
      S.drawBell(ctx, P, mean, variance, { color: S.COLOR.filter, alpha: a1, width: 4.5, fill: 0.2 });
      P.label(ctx, '予測', UPD.pred - 2.6, 0.1, { size: 23, color: S.COLOR.predict, weight: 800, align: 'right', alpha: a0 });
      P.label(ctx, '観測', UPD.y + (r > 4 ? 5 : 2.4), r > 4 ? 0.06 : 0.14, { size: 23, color: S.COLOR.obs, weight: 800, alpha: s.p(0, 0.5, 1.0) });
      P.label(ctx, '更新後', mean, M.normalPdf(mean, mean, variance), { dy: -12, size: 23, color: S.COLOR.filter, weight: 800, align: 'center', alpha: a1 });
      // ゲインのつまみ（0〜1 の棒）
      if (a1 > 0) {
        const bar = { x: 1150, y: 400, w: 360, h: 16 };
        ctx.save();
        ctx.globalAlpha = a1;
        ctx.fillStyle = C.grid;
        ctx.beginPath();
        ctx.roundRect(bar.x, bar.y, bar.w, bar.h, 8);
        ctx.fill();
        ctx.fillStyle = rgba(C.yellow, 0.75);
        ctx.beginPath();
        ctx.roundRect(bar.x, bar.y, bar.w * k, bar.h, 8);
        ctx.fill();
        ctx.fillStyle = C.yellow;
        ctx.beginPath();
        ctx.arc(bar.x + bar.w * k, bar.y + bar.h / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      legend(ctx, [{ color: S.COLOR.predict, label: '予測' }, { color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.filter, label: '更新後の推定' }], P.x, P.y + P.h + 76, { alpha: a1 });
    },
  });
  // 4V の観測ノイズの分散 R: 字幕2で小さく、字幕3で大きく、字幕4で元へ
  function rAt(u) {
    const scene = window.SCENES.find((sc) => sc.id === '4V');
    const bt = scene.beatStarts;
    return keyframes(u, [[bt[2] + 0.4, R_KEYS[0]], [bt[2] + 2.0, R_KEYS[1]], [bt[3] + 0.4, R_KEYS[1]], [bt[3] + 2.2, R_KEYS[2]], [bt[4] + 0.6, R_KEYS[2]], [bt[4] + 2.4, R_KEYS[0]]], { log: true });
  }

  // ---------------------------------------------------------------- 第4章 図解（数直線で見る更新）
  const LINE = { x0: 220, x1: 1380, y: 400, range: [19, 23] };
  const lineX = (v) => LINE.x0 + ((v - LINE.range[0]) / (LINE.range[1] - LINE.range[0])) * (LINE.x1 - LINE.x0);
  const UPD_K = gainOf(H.r);
  const UPD_MEAN = UPD.pred + UPD_K * (UPD.y - UPD.pred);
  add({
    id: '4V-2',
    chapter: 4,
    kind: 'visual',
    title: 'イノベーションの K 倍だけ動かす',
    beats: [
      beat(`更新の式を、数直線で確かめます。予測は ${UPD.pred} 度、観測は ${UPD.y} 度です。`, `更新の式を、数直線で確かめます。予測は${UPD.pred}度、観測は${UPD.y}度です。`),
      beat(`観測と予測の差、イノベーションは、プラス ${UPD.y - UPD.pred} 度です。予測より高い値が観測された、という情報です。`, `観測と予測の差、イノベーションは、プラス${UPD.y - UPD.pred}度です。予測より高いあたいが観測された、という情報です。`),
      beat(R`この差の $K$ 倍だけ、推定を動かします。$K$ が ${fmt(UPD_K, 1)} なら、${fmt(UPD_K * (UPD.y - UPD.pred), 0)} 度動いて、${fmt(UPD_MEAN, 0)} 度です。`, `この差の、ケー倍だけ、推定を動かします。ケーが${fmt(UPD_K, 1)}なら、${fmt(UPD_K * (UPD.y - UPD.pred), 0)}度動いて、${fmt(UPD_MEAN, 0)}度です。`),
      beat('観測が予測どおりなら、イノベーションは 0 で、推定は動きません。予測と違うぶんだけ、学ぶのです。', '観測が予測どおりなら、イノベーションはゼロで、推定は動きません。予測と違うぶんだけ、学ぶのです。'),
    ],
    build(ui) {
      ui.tex(R`\hat{x}_t = \hat{x}_t^- + K_t\,(y_t - \hat{x}_t^-)`, { x: 220, y: 150, size: 34 });
      ui.tex(R`${texNum(UPD_MEAN, 0)} = ${UPD.pred} + ${texNum(UPD_K, 1)} \times (${UPD.y} - ${UPD.pred})`, { x: 220, y: 580, size: 34, at: 2, delay: 0.8 });
      ui.text('予測と違うぶんだけ、学ぶ', { x: 900, y: 590, size: 27, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.2);
      ctx.save();
      ctx.globalAlpha = a0;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(LINE.x0 - 40, LINE.y);
      ctx.lineTo(LINE.x1 + 40, LINE.y);
      ctx.stroke();
      for (let v = LINE.range[0]; v <= LINE.range[1]; v += 0.5) {
        const major = Number.isInteger(v);
        ctx.beginPath();
        ctx.moveTo(lineX(v), LINE.y - (major ? 12 : 6));
        ctx.lineTo(lineX(v), LINE.y + (major ? 12 : 6));
        ctx.stroke();
        if (major) canvasText(ctx, `${v} ℃`, lineX(v), LINE.y + 44, { size: 20, color: C.muted, align: 'center' });
      }
      ctx.restore();
      const dot = (v, color, text, alpha, dy = -34) => {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lineX(v), LINE.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        canvasText(ctx, text, lineX(v), LINE.y + dy, { size: 24, color, weight: 800, align: 'center', alpha });
      };
      dot(UPD.pred, S.COLOR.predict, '予測', a0);
      dot(UPD.y, S.COLOR.obs, '観測', s.p(0, 0.5, 0.8));
      const innov = s.p(1, 0.8, 0.3);
      S.arrow(ctx, lineX(UPD.pred), LINE.y - 90, lineX(UPD.y), LINE.y - 90, { color: S.COLOR.obs, width: 4, alpha: innov, upto: innov, head: 16 });
      canvasText(ctx, `イノベーション ＋${UPD.y - UPD.pred} ℃`, (lineX(UPD.pred) + lineX(UPD.y)) / 2, LINE.y - 108, { size: 23, color: S.COLOR.obs, weight: 700, align: 'center', alpha: innov });
      const move = s.p(2, 1.2, 0.4);
      S.arrow(ctx, lineX(UPD.pred), LINE.y + 90, lineX(UPD_MEAN), LINE.y + 90, { color: S.COLOR.filter, width: 5, alpha: move, upto: move, head: 18 });
      canvasText(ctx, `K 倍 ＝ ${fmt(UPD_K * (UPD.y - UPD.pred), 0)} ℃`, (lineX(UPD.pred) + lineX(UPD_MEAN)) / 2, LINE.y + 128, { size: 23, color: S.COLOR.filter, weight: 700, align: 'center', alpha: move });
      dot(UPD.pred + (UPD_MEAN - UPD.pred) * move, S.COLOR.filter, '更新後', s.p(2, 0.4, 0.4));
    },
  });
})();
