// ep3-scenes-a.js — 第3回「カルマンフィルターを使いこなす」の前半: はじめに、ポイント、第1〜4章（復習、イノベーション、Q と R の決め方、欠測と予測）。
// 場面の書き方は scene-kit.js の冒頭を参照。画面に出す数値は手で書かず、計算した値を表示する。
(() => {
  const { C, CHAPTERS, Plot, fmt, canvasText, legend, heatmapCanvas, drawImage, colorBar, seqColor } = KIT;
  const M = SSM;
  const D = SSMDATA;
  const S = SDRAW;
  const { beat, add, LEFT_X, CARD_X, CARD_W, seeThrough, eq, note, keyPoint } = SK;
  const R = String.raw;

  const T = D.tempTimes;
  const TEMP_X = D.tempSim.x;
  const TEMP_Y = D.tempSim.y;
  const TEMP_XTICKS = [0, 20, 40, 60, 80, 100];
  const INIT = D.TEMP_INIT;
  const run = (q, r, ys = TEMP_Y) => M.filter1d(ys, { q, r, ...INIT });

  // ---------------------------------------------------------------- はじめに
  SK.titleScene({
    episode: 3,
    subtitle: '確かめる、決める、あとから直す、非線形に広げる',
    chapters: CHAPTERS,
    footnote: '例のデータは、第1回・第2回と同じ「部屋の温度」と「台車の位置」です',
    beats: [
      beat('状態空間モデルとカルマンフィルターの第3回です。今回は、カルマンフィルターを使いこなすための道具を解説します。', '状態空間モデルと、カルマンフィルターの、第3回です。今回は、カルマンフィルターを、使いこなすための道具を、解説します。'),
      beat('今回は7章です。設定が正しいかを確かめ、データから設定を決め、欠測や平滑化、非線形の問題へ広げていきます。', '今回は7章です。設定が正しいかを確かめ、データから設定を決め、けっそくや、へいかつか、非線形の問題へ、広げていきます。'),
      beat('例のデータは、これまでと同じ、部屋の温度と台車の位置です。', '例のデータは、これまでと同じ、部屋の温度と、台車の位置です。'),
    ],
  });

  // ---------------------------------------------------------------- よく使う計算
  // そろえたイノベーション（イノベーション ÷ その標準偏差）と、その性質
  const standardized = (filter) => filter.innovation.map((e, i) => e / Math.sqrt(filter.innovationVar[i]));
  const lagOneCorrelation = (values) => {
    const m = M.mean(values);
    const total = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
    return values.slice(1).reduce((sum, v, i) => sum + (v - m) * (values[i] - m), 0) / total;
  };
  const Q_FACTOR = 100;
  const CHECKS = [
    { name: '正しい Q', q: D.TEMP.q, color: S.COLOR.filter },
    { name: `Q を 1/${Q_FACTOR} に見立てる`, q: D.TEMP.q / Q_FACTOR, color: S.COLOR.predict },
    { name: `Q を ${Q_FACTOR} 倍に見立てる`, q: D.TEMP.q * Q_FACTOR, color: S.COLOR.smooth },
  ].map((item) => {
    const filter = run(item.q, D.TEMP.r);
    const e = standardized(filter);
    return { ...item, filter, e, outside: e.filter((v) => Math.abs(v) > 2).length, correlation: lagOneCorrelation(e) };
  });

  // 対数尤度の格子探索（Q と R の候補を、対数で等間隔に並べる）
  const GRID_N = 61;
  const LOG_Q = M.linspace(-3, 0, GRID_N);
  const LOG_R = M.linspace(-1, 1, GRID_N);
  const LIK = LOG_R.map((lr) => LOG_Q.map((lq) => run(10 ** lq, 10 ** lr).logLik));
  let BEST = { value: -Infinity };
  LIK.forEach((row, i) => row.forEach((value, j) => {
    if (value > BEST.value) BEST = { value, q: 10 ** LOG_Q[j], r: 10 ** LOG_R[i], i, j };
  }));
  const LIK_TRUE = run(D.TEMP.q, D.TEMP.r).logLik;
  const ERR_TRUE = M.rmse(run(D.TEMP.q, D.TEMP.r).mean, TEMP_X);
  const ERR_BEST = M.rmse(run(BEST.q, BEST.r).mean, TEMP_X);

  // ---------------------------------------------------------------- この回のポイント
  const POINT_CARDS = [{ x: 90, y: 124 }, { x: 810, y: 124 }, { x: 90, y: 440 }, { x: 810, y: 440 }];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 296;
  const FIG = { dx: 410, dy: 56, w: 262, h: 210 };
  const SMOOTH_MEAN = D.tempSmooth.xs.map((x) => x[0]);
  add({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この回のポイント',
    beats: [
      beat('この回のポイントです。', 'この回のポイントです。', 4),
      beat('① 設定が正しいかは、イノベーションで確かめます。観測と予測の差が、計算どおりにばらついているかを見ます。', 'ひとつめ。設定が正しいかは、イノベーションで確かめます。観測と予測の差が、計算どおりに、ばらついているかを見ます。'),
      beat(R`② $Q$ と $R$ は、尤度を最大にして、データから決められます。`, 'ふたつめ。キューとアールは、ゆうどを最大にして、データから決められます。'),
      beat('③ 欠測、先の予測、平滑化は、同じ式の使い方を少し変えるだけです。', 'みっつめ。けっそく、先の予測、へいかつかは、同じ式の使いかたを、少し変えるだけです。'),
      beat('④ 非線形の問題には、拡張カルマンフィルター、UKF、粒子フィルターがあります。', 'よっつめ。非線形の問題には、拡張カルマンフィルター、ユーケーエフ、粒子フィルターがあります。'),
      beat('この流れを、式と図で順に見ていきます。', 'この流れを、式と図で、順に見ていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① イノベーションで確かめる', '観測と予測の差が、計算どおりにばらついているか'],
        [R`② $Q$・$R$ を尤度で決める`, '観測がいちばん起こりやすくなる値を選ぶ'],
        ['③ 欠測・予測・平滑化', '同じ式の使い方を少し変えるだけ'],
        ['④ 非線形への拡張', '拡張カルマンフィルター、UKF、粒子フィルター'],
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
        const P = new Plot({ ...fig(0), xr: [0, 100], yr: [-3.6, 3.6] });
        ctx.save();
        ctx.globalAlpha = a1;
        P.shade(ctx, 0, 100, { color: S.COLOR.filter, alpha: 0 });
        ctx.fillStyle = 'rgba(42,120,214,0.10)';
        ctx.fillRect(P.x, P.sy(2), P.w, P.sy(-2) - P.sy(2));
        P.hline(ctx, 0, { color: C.grid, dash: null, width: 1 });
        P.dots(ctx, T, CHECKS[0].e, { r: 3, color: S.COLOR.filter, ring: null });
        ctx.restore();
      }
      const a2 = s.p(2, 0.8, 0.4);
      if (a2 > 0) {
        const f = fig(1);
        drawImage(ctx, likelihoodImage(), f.x + 26, f.y, 210, 210, { alpha: a2 });
        ctx.save();
        ctx.globalAlpha = a2;
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(f.x + 26, f.y, 210, 210);
        ctx.fillStyle = C.yellow;
        ctx.beginPath();
        ctx.arc(f.x + 26 + ((BEST.j + 0.5) / GRID_N) * 210, f.y + 210 - ((BEST.i + 0.5) / GRID_N) * 210, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const a3 = s.p(3, 0.8, 0.4);
      if (a3 > 0) {
        const P = new Plot({ ...fig(2), xr: [0, 100], yr: [15.5, 24.5] });
        ctx.save();
        ctx.globalAlpha = a3;
        P.dots(ctx, T, TEMP_Y, { r: 2.4, color: S.COLOR.obs, ring: null, alpha: 0.7 });
        P.line(ctx, T, SMOOTH_MEAN, { color: S.COLOR.smooth, width: 3.5, upto: s.p(3, 1.6, 0.6) });
        ctx.restore();
      }
      const a4 = s.p(4, 0.8, 0.4);
      if (a4 > 0) {
        const P = new Plot({ ...fig(3), xr: [-4, 4], yr: [1.5, 5] });
        const xs = M.linspace(-4, 4, 80);
        ctx.save();
        ctx.globalAlpha = a4;
        P.line(ctx, xs, xs.map((p) => Math.sqrt(p * p + 4)), { color: C.text2, width: 3.5, upto: s.p(4, 1.4, 0.6) });
        // p = 2 での接線（高さ √8、傾き 2/√8）
        const tangent = (p) => Math.sqrt(8) + (2 / Math.sqrt(8)) * (p - 2);
        P.line(ctx, [0, 3.6], [tangent(0), tangent(3.6)], { color: S.COLOR.predict, width: 2.5, dash: [7, 5] });
        P.dots(ctx, [2], [Math.sqrt(8)], { r: 6, color: S.COLOR.predict });
        ctx.restore();
      }
    },
  });
  // 対数尤度の色の画像（最大からの差を色にする。最大に近いほど濃い）
  let likelihoodCache = null;
  const LIK_SPAN = 12; // 最大から何だけ下までを色にするか
  function likelihoodImage() {
    likelihoodCache = likelihoodCache || heatmapCanvas(GRID_N, GRID_N, (i, j) => seqColor(Math.max(0, 1 - (BEST.value - LIK[GRID_N - 1 - i][j]) / LIK_SPAN)));
    return likelihoodCache;
  }

  // ---------------------------------------------------------------- 第1章 理論（復習と今回の道具）
  add({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: CHAPTERS[0],
    beats: [
      beat('前回の復習です。カルマンフィルターは、予測の2本と、更新の3本の式でした。', '前回の復習です。カルマンフィルターは、予測のにほんと、更新のさんぼんの式でした。'),
      beat('予測で不確かさが増え、更新で減ります。混ぜ具合を決めるのが、カルマンゲインです。', '予測で不確かさが増え、更新で減ります。混ぜ具合を決めるのが、カルマンゲインです。'),
      beat(R`ただし、これが最もよい推定になるのは、モデルと $Q$・$R$ が正しいときでした。`, 'ただし、これが、最もよい推定になるのは、モデルと、キュー、アールが、正しいときでした。'),
      beat('今回は、使いこなすための道具を5つ扱います。確かめる、決める、欠けたデータを扱う、あとから直す、非線形に広げる、の順です。', '今回は、使いこなすための道具を、いつつ扱います。確かめる。決める。欠けたデータを扱う。あとから直す。非線形に広げる。の順です。'),
    ],
    build(ui) {
      note(ui, '予測', LEFT_X, 130, { weight: 700, color: S.COLOR.predict, size: 24 });
      ui.tex(R`\hat{\mathbf{x}}_t^- = F\,\hat{\mathbf{x}}_{t-1}`, { x: LEFT_X, y: 168, size: 30, delay: 0.2 });
      ui.tex(R`P_t^- = F\,P_{t-1}\,F^\top + Q`, { x: LEFT_X, y: 228, size: 30, delay: 0.4 });
      note(ui, '更新', LEFT_X, 318, { weight: 700, color: S.COLOR.filter, size: 24, delay: 0.6 });
      ui.tex(R`K_t = P_t^- H^\top \big(H\,P_t^- H^\top + R\big)^{-1}`, { x: LEFT_X, y: 356, size: 30, delay: 0.8, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`\hat{\mathbf{x}}_t = \hat{\mathbf{x}}_t^- + K_t\,\big(\mathbf{y}_t - H\,\hat{\mathbf{x}}_t^-\big)`, { x: LEFT_X, y: 426, size: 30, delay: 1.0 });
      ui.tex(R`P_t = (I - K_t H)\,P_t^-`, { x: LEFT_X, y: 496, size: 30, delay: 1.2 });
      keyPoint(ui, R`最もよい推定になるのは、モデルと $Q$・$R$ が正しいとき`, 610, 2);

      ui.card({ x: CARD_X - 60, y: 130, w: CARD_W + 80, h: 420, title: '今回の道具', at: 3 });
      [
        ['確かめる', 'イノベーション'],
        ['決める', R`尤度で $Q$・$R$ を推定`],
        ['欠けたデータを扱う', '欠測と予測'],
        ['あとから直す', '平滑化'],
        ['非線形に広げる', 'EKF・UKF・粒子'],
      ].forEach(([head, body], i) => {
        ui.text(`<span class="toc-num">${i + 2}</span><b>${head}</b>`, { x: CARD_X - 30, y: 186 + i * 70, size: 24, at: 3, delay: 0.3 + 0.4 * i });
        ui.text(body, { x: CARD_X + 250, y: 190 + i * 70, size: 21, color: C.text2, at: 3, delay: 0.5 + 0.4 * i });
      });
      ui.text('数字は、扱う章の番号です', { x: CARD_X - 30, y: 566, size: 18, color: C.muted, at: 3, delay: 2.4 });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（イノベーション）
  add({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: CHAPTERS[1],
    beats: [
      beat('まず、確かめる道具です。イノベーションは、観測と予測の差でした。', 'まず、確かめる道具です。イノベーションは、観測と予測の差でした。'),
      beat(R`フィルターは、イノベーションがどれくらいばらつくはずかも、計算しています。予測の不確かさに、観測ノイズを足した $S_t$ です。`, 'フィルターは、イノベーションが、どれくらいばらつくはずかも、計算しています。予測の不確かさに、観測ノイズを足した、エスティーです。'),
      beat(R`モデルと $Q$・$R$ が正しければ、イノベーションは、平均 0、分散 $S_t$ の正規分布に従います。時刻ごとに、ばらばらの値になります。`, 'モデルと、キュー、アールが正しければ、イノベーションは、平均ゼロ、ぶんさんエスティーの、正規分布に従います。時刻ごとに、ばらばらのあたいになります。'),
      beat('そこで、イノベーションを、その標準偏差で割って、そろえます。正しければ、約95%が ± 2 の中に入ります。', 'そこで、イノベーションを、その標準偏差で割って、そろえます。正しければ、約95パーセントが、プラスマイナス2の中に入ります。'),
      beat(R`はみ出しが多い、片側に偏る、同じ向きが続く。こういうときは、モデルか $Q$・$R$ が合っていません。`, 'はみ出しが多い。片側に偏る。同じ向きが続く。こういうときは、モデルか、キュー、アールが、合っていません。'),
    ],
    build(ui) {
      note(ui, 'イノベーション（観測 − 予測した観測）', LEFT_X, 130, { weight: 700, color: S.COLOR.obs, size: 24 });
      eq(ui, R`e_t = y_t - H\,\hat{x}_t^-`, 168, { size: 36 });
      note(ui, 'イノベーションの分散（フィルターが計算する）', LEFT_X, 260, { at: 1, weight: 700, size: 24 });
      eq(ui, R`S_t = H\,P_t^- H^\top + R`, 298, { at: 1, size: 36, glow: [{ from: 1, to: 2 }] });
      note(ui, '予測の不確かさ ＋ 観測ノイズ', LEFT_X + 460, 312, { at: 1, delay: 0.5 });
      eq(ui, R`e_t \sim \mathcal{N}(0,\ S_t)`, 400, { at: 2, size: 34 });
      note(ui, '正しければ、時刻ごとにばらばら（互いに独立）', LEFT_X + 460, 410, { at: 2, delay: 0.5 });
      eq(ui, R`\tilde{e}_t = \frac{e_t}{\sqrt{S_t}} \ \sim\ \mathcal{N}(0,\ 1)`, 480, { at: 3, size: 34, glow: [{ from: 3, to: 4 }] });
      note(ui, 'そろえたイノベーション：約 95% が ± 2 の中', LEFT_X + 460, 506, { at: 3, delay: 0.5 });

      ui.card({ x: CARD_X + 10, y: 130, w: CARD_W - 10, h: 240, title: '合っていないときの印', at: 4, glow: [{ from: 4 }] });
      ['± 2 からのはみ出しが多い', '片側に偏る', '同じ向きが続く'].forEach((text, i) => ui.text(`・${text}`, { x: CARD_X + 38, y: 186 + i * 54, size: 24, at: 4, delay: 0.3 + 0.4 * i }));
      keyPoint(ui, 'イノベーションが「計算どおり」にばらついているかを見る', 640, 4);
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（そろえたイノベーション）
  add({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: 'イノベーションはフィルターの通知表',
    beats: [
      beat(R`温度の例で見ます。正しい $Q$ と $R$ を使ったときの、そろえたイノベーションです。`, '温度の例で見ます。正しい、キューとアールを使ったときの、そろえたイノベーションです。'),
      beat(`± 2 の外に出たのは、100 回のうち ${CHECKS[0].outside} 回です。偏りもなく、ばらばらに散っています。健全です。`, `プラスマイナス2の外に出たのは、ひゃっかいのうち、${CHECKS[0].outside}回です。偏りもなく、ばらばらに散っています。健全です。`),
      beat(R`$Q$ を ${Q_FACTOR} 分の 1 に見立ててみます。フィルターは「状態はほとんど動かない」と信じ込み、観測を軽く見ます。`, `キューを、${Q_FACTOR}分の1に、見立ててみます。フィルターは、状態はほとんど動かない、と信じ込み、観測を軽く見ます。`),
      beat(`外に出たのは ${CHECKS[1].outside} 回に増えました。しかも、同じ向きのずれが続いています。推定が、本当の変化に遅れている印です。`, `外に出たのは、${CHECKS[1].outside}回に増えました。しかも、同じ向きのずれが、続いています。推定が、本当の変化に、遅れているしるしです。`),
      beat(R`逆に、$Q$ を ${Q_FACTOR} 倍にすると、外に出るのは ${CHECKS[2].outside} 回です。不確かさを、大きく見積もりすぎています。`, `逆に、キューを${Q_FACTOR}倍にすると、外に出るのは、${CHECKS[2].outside}回です。不確かさを、大きく見積もりすぎています。`),
      beat('イノベーションは、フィルターが自分で出す通知表です。本当の状態が分からなくても、観測だけで確かめられます。', 'イノベーションは、フィルターが自分で出す、通知表です。本当の状態が分からなくても、観測だけで、確かめられます。'),
    ],
    build(ui) {
      ui.card({ x: 1100, y: 180, w: 440, h: 300, title: 'そろえたイノベーション（100 回）', at: 1 });
      ui.table({
        x: 1116, y: 228, widths: [200, 100, 110], aligns: ['left', 'center', 'center'], size: 19, rowH: 56,
        header: ['設定', '± 2 の外', '隣との相関'],
        rows: CHECKS.map((item) => [item.name.replace(' に見立てる', '').replace('に見立てる', ''), `${item.outside} 回`, fmt(item.correlation, 2)]),
        rowAt: [1, 3, 4], delay: 0.4,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 3, to: 4 }], [{ from: 4, to: 5 }]],
      });
      ui.text('隣との相関：となりの時刻と、同じ向きにずれやすいか（0 に近いほど、ばらばら）', { x: 1104, y: 496, w: 430, size: 18, color: C.muted, at: 3, delay: 0.6 });
      ui.text('観測だけで確かめられる', { x: 1104, y: 610, size: 26, weight: 700, color: C.yellow, at: 5, glow: [{ from: 5 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 920, h: 500, xr: [0, 100], yr: [-5.2, 5.2] });
      const a0 = s.p(0, 0.5, 0.1);
      ctx.save();
      ctx.globalAlpha = a0;
      ctx.fillStyle = 'rgba(42,120,214,0.08)';
      ctx.fillRect(P.x, P.sy(2), P.w, P.sy(-2) - P.sy(2));
      ctx.restore();
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [-4, -2, 0, 2, 4], xlabel: '時刻 t（分）', ylabel: 'そろえたイノベーション', alpha: a0 });
      [-2, 2].forEach((v) => P.hline(ctx, v, { color: C.text2, alpha: a0 }));
      // どの設定を見せるか: 字幕 0–1 = 正しい、2–3 = Q 小、4 = Q 大、5 = 正しい
      const show = [s.win(0, 2) + s.p(5, 0.5, 0.3), s.win(2, 4), s.win(4, 5)];
      CHECKS.forEach((item, k) => {
        const alpha = Math.min(1, show[k]) * a0;
        if (alpha <= 0) return;
        const inside = item.e.map((v) => Math.abs(v) <= 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        item.e.forEach((v, i) => {
          ctx.strokeStyle = item.color;
          ctx.globalAlpha = alpha * 0.45;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(P.sx(T[i]), P.sy(0));
          ctx.lineTo(P.sx(T[i]), P.sy(v));
          ctx.stroke();
        });
        ctx.restore();
        P.dots(ctx, T.filter((_, i) => inside[i]), item.e.filter((_, i) => inside[i]), { r: 5, color: item.color, alpha });
        P.dots(ctx, T.filter((_, i) => !inside[i]), item.e.filter((_, i) => !inside[i]), { r: 8, color: C.red, alpha });
        canvasText(ctx, item.name, P.x + 16, P.y + 30, { size: 25, color: C.text, weight: 800, alpha });
      });
      legend(ctx, [{ kind: 'dot', color: S.COLOR.filter, label: '± 2 の中' }, { kind: 'dot', color: C.red, label: '± 2 の外' }], P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（尤度）
  add({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: CHAPTERS[2],
    beats: [
      beat(R`次は、決める道具です。$Q$ と $R$ を、データから決めます。`, '次は、決める道具です。キューとアールを、データから決めます。'),
      beat(R`考え方はこうです。$Q$ と $R$ の候補ごとに、フィルターを走らせます。そして、実際の観測が、予測の分布の中で、どれくらい起こりやすかったかを、点数にします。`, '考え方は、こうです。キューとアールの候補ごとに、フィルターを走らせます。そして、実際の観測が、予測の分布の中で、どれくらい起こりやすかったかを、点数にします。'),
      beat(R`1回ぶんの点数は、正規分布の密度の対数です。イノベーションが小さいほど高くなります。ただし、$S_t$ を大きくしすぎても、低くなります。`, '1回ぶんの点数は、正規分布の密度の、対数です。イノベーションが小さいほど、高くなります。ただし、エスティーを大きくしすぎても、低くなります。'),
      beat(R`全部の時刻で足したものが、対数尤度です。これがいちばん大きくなる $Q$ と $R$ を選びます。最尤法です。`, '全部の時刻で足したものが、対数ゆうどです。これが、いちばん大きくなる、キューとアールを選びます。さいゆうほうです。'),
      beat(R`必要な $e_t$ と $S_t$ は、フィルターが、もともと計算しています。追加の手間は、ほとんどありません。`, '必要な、イノベーションとエスティーは、フィルターが、もともと計算しています。追加の手間は、ほとんどありません。'),
    ],
    build(ui) {
      ui.text(R`$Q$・$R$ の候補 → フィルターを走らせる → 観測の「起こりやすさ」を点数にする`, { x: LEFT_X, y: 134, size: 26, at: 1 });
      note(ui, '1回ぶんの点数（予測の分布での、観測の密度の対数）', LEFT_X, 230, { at: 2, weight: 700, size: 24 });
      eq(ui, R`\log p(y_t \mid y_1, \dots, y_{t-1}) = -\frac{1}{2}\log(2\pi S_t) - \frac{e_t^2}{2 S_t}`, 270, { at: 2, size: 32 });
      note(ui, R`$S_t$ が大きすぎると減る`, LEFT_X + 380, 360, { at: 2, delay: 0.6 });
      note(ui, R`$e_t$ が大きいと減る`, LEFT_X + 720, 360, { at: 2, delay: 0.9 });
      note(ui, '対数尤度（全部の時刻で足す）', LEFT_X, 440, { at: 3, weight: 700, size: 24 });
      eq(ui, R`\log L(Q, R) = \sum_{t=1}^{T} \left[ -\frac{1}{2}\log(2\pi S_t) - \frac{e_t^2}{2 S_t} \right]`, 476, { at: 3, size: 32, glow: [{ from: 3, to: 4 }] });
      keyPoint(ui, R`対数尤度がいちばん大きい $Q$・$R$ を選ぶ（最尤法）`, 640, 3);
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（尤度の地図）
  const MAP = { x: 170, y: 180, size: 480 };
  const mapX = (logQ) => MAP.x + ((logQ - LOG_Q[0]) / (LOG_Q[GRID_N - 1] - LOG_Q[0])) * MAP.size;
  const mapY = (logR) => MAP.y + MAP.size - ((logR - LOG_R[0]) / (LOG_R[GRID_N - 1] - LOG_R[0])) * MAP.size;
  add({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '尤度の地図から Q と R を選ぶ',
    beats: [
      beat(R`温度の例で計算しました。横が $Q$、縦が $R$ の候補で、色が対数尤度です。濃いほど、観測が起こりやすい設定です。`, '温度の例で計算しました。横がキュー、縦がアールの候補で、色が、対数ゆうどです。濃いほど、観測が起こりやすい設定です。'),
      beat(R`いちばん高いのは、この点です。$Q$ が ${fmt(BEST.q, 3)}、$R$ が ${fmt(BEST.r, 2)} です。`, `いちばん高いのは、この点です。キューが${fmt(BEST.q, 3)}、アールが${fmt(BEST.r, 2)}です。`),
      beat(R`データを作ったときの値は、$Q$ が ${D.TEMP.q}、$R$ が ${D.TEMP.r} でした。ぴったりではありませんが、近い値が選ばれました。`, `データを作ったときのあたいは、キューが${D.TEMP.q}、アールが${D.TEMP.r}でした。ぴったりではありませんが、近いあたいが選ばれました。`),
      beat('濃い部分には、幅があります。データが 100 点しかないので、推定にも幅があるのです。データが増えるほど、濃い部分は小さくなります。', '濃い部分には、幅があります。データが、ひゃくてんしかないので、推定にも、幅があるのです。データが増えるほど、濃い部分は、小さくなります。'),
      beat(`選んだ値でフィルターをかけると、本当の温度とのずれは ${fmt(ERR_BEST, 2)} 度。データを作ったときの値を使った ${fmt(ERR_TRUE, 2)} 度と、ほぼ同じです。`, `選んだあたいで、フィルターをかけると、本当の温度とのずれは、${fmt(ERR_BEST, 2)}度。データを作ったときのあたいを使った、${fmt(ERR_TRUE, 2)}度と、ほぼ同じです。`),
    ],
    build(ui) {
      ui.card({ x: 900, y: 190, w: 620, h: 310, title: '結果', at: 1 });
      ui.table({
        x: 916, y: 240, widths: [250, 110, 100, 130], aligns: ['left', 'center', 'center', 'center'], size: 20, rowH: 60,
        header: ['', R`$Q$`, R`$R$`, '対数尤度'],
        rows: [
          ['尤度が最大の点', fmt(BEST.q, 3), fmt(BEST.r, 2), fmt(BEST.value, 1)],
          ['データを作ったときの値', String(D.TEMP.q), String(D.TEMP.r), fmt(LIK_TRUE, 1)],
        ],
        rowAt: [1, 2], delay: 0.5,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }]],
      });
      ui.text(`本当の温度とのずれ：最大の点 ${fmt(ERR_BEST, 2)} ℃、作ったときの値 ${fmt(ERR_TRUE, 2)} ℃`, { x: 920, y: 424, size: 19, color: C.text2, at: 4 });
      ui.text('データが少ないと、推定には幅がある', { x: 900, y: 560, size: 25, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3, to: 4 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.6, 0.2);
      drawImage(ctx, likelihoodImage(), MAP.x, MAP.y, MAP.size, MAP.size, { alpha: a0, smooth: true });
      ctx.save();
      ctx.globalAlpha = a0;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(MAP.x, MAP.y, MAP.size, MAP.size);
      [-3, -2, -1, 0].forEach((v) => canvasText(ctx, String(10 ** v), mapX(v), MAP.y + MAP.size + 28, { size: 17, color: C.muted, align: 'center' }));
      [-1, 0, 1].forEach((v) => canvasText(ctx, String(10 ** v), MAP.x - 12, mapY(v) + 6, { size: 17, color: C.muted, align: 'right' }));
      canvasText(ctx, 'Q の候補（対数の目盛り）', MAP.x + MAP.size, MAP.y + MAP.size + 58, { size: 19, color: C.text2, align: 'right' });
      canvasText(ctx, 'R の候補', MAP.x, MAP.y - 14, { size: 19, color: C.text2 });
      ctx.restore();
      colorBar(ctx, MAP.x + MAP.size + 26, MAP.y, 18, MAP.size, (v) => seqColor(v), { min: 0, max: 1, ticks: [], label: '' });
      canvasText(ctx, '高い', MAP.x + MAP.size + 52, MAP.y + 16, { size: 17, color: C.muted, alpha: a0 });
      canvasText(ctx, '低い', MAP.x + MAP.size + 52, MAP.y + MAP.size, { size: 17, color: C.muted, alpha: a0 });
      const mark = (logQ, logR, color, text, alpha, dy) => {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mapX(logQ), mapY(logR), 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        canvasText(ctx, text, mapX(logQ) - 16, mapY(logR) + dy, { size: 20, color: '#ffffff', weight: 800, align: 'right', alpha });
      };
      mark(Math.log10(D.TEMP.q), Math.log10(D.TEMP.r), S.COLOR.obs, '作ったときの値', s.p(2, 0.5, 0.3), -14);
      mark(Math.log10(BEST.q), Math.log10(BEST.r), C.yellow, '最大', s.p(1, 0.5, 0.3), 30);
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（決めた値で確かめる）
  const BEST_FILTER = run(BEST.q, BEST.r);
  const BEST_E = standardized(BEST_FILTER);
  const BEST_OUTSIDE = BEST_E.filter((v) => Math.abs(v) > 2).length;
  const BEST_CORRELATION = lagOneCorrelation(BEST_E);
  add({
    id: '3V-2',
    chapter: 3,
    kind: 'visual',
    title: '決めたら、確かめる',
    beats: [
      beat(R`決めたら、確かめます。尤度で選んだ $Q$ と $R$ で、フィルターをかけ直しました。`, '決めたら、確かめます。ゆうどで選んだ、キューとアールで、フィルターをかけ直しました。'),
      beat(`そろえたイノベーションで、± 2 の外に出たのは ${BEST_OUTSIDE} 回。隣との相関は ${fmt(BEST_CORRELATION, 2)} で、0 に近い値です。健全です。`, `そろえたイノベーションで、プラスマイナス2の外に出たのは、${BEST_OUTSIDE}回。隣との相関は、${fmt(BEST_CORRELATION, 2)}で、ゼロに近いあたいです。健全です。`),
      beat('決める、確かめる、合わなければモデルを見直す。この繰り返しが、状態空間モデルを使う作業の中心です。', '決める。確かめる。合わなければ、モデルを見直す。この繰り返しが、状態空間モデルを使う作業の、中心です。'),
    ],
    build(ui) {
      ui.card({ x: 1100, y: 180, w: 440, h: 270, title: '尤度で選んだ設定', at: 0 });
      ui.table({
        x: 1116, y: 228, widths: [240, 170], aligns: ['left', 'center'], size: 21, rowH: 52,
        header: ['', '値'],
        rows: [[R`$Q$、$R$`, `${fmt(BEST.q, 3)}、${fmt(BEST.r, 2)}`], ['± 2 の外', `${BEST_OUTSIDE} 回`], ['隣との相関', fmt(BEST_CORRELATION, 2)]],
        rowAt: [0, 1, 1], delay: 0.4,
      });
      ui.text('決める → 確かめる → 見直す', { x: 1104, y: 470, size: 27, weight: 700, color: C.yellow, at: 2, glow: [{ from: 2 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 920, h: 500, xr: [0, 100], yr: [-5.2, 5.2] });
      const a0 = s.p(0, 0.5, 0.1);
      ctx.save();
      ctx.globalAlpha = a0;
      ctx.fillStyle = 'rgba(42,120,214,0.08)';
      ctx.fillRect(P.x, P.sy(2), P.w, P.sy(-2) - P.sy(2));
      ctx.restore();
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [-4, -2, 0, 2, 4], xlabel: '時刻 t（分）', ylabel: 'そろえたイノベーション', alpha: a0 });
      [-2, 2].forEach((v) => P.hline(ctx, v, { color: C.text2, alpha: a0 }));
      const shown = Math.round(s.p(0, 2.4, 0.5) * T.length);
      const inside = BEST_E.map((v) => Math.abs(v) <= 2);
      const pick = (keep) => [T.filter((_, i) => i < shown && inside[i] === keep), BEST_E.filter((_, i) => i < shown && inside[i] === keep)];
      P.dots(ctx, ...pick(true), { r: 5, color: S.COLOR.filter, alpha: a0 });
      P.dots(ctx, ...pick(false), { r: 8, color: C.red, alpha: a0 });
      legend(ctx, [{ kind: 'dot', color: S.COLOR.filter, label: '± 2 の中' }, { kind: 'dot', color: C.red, label: '± 2 の外' }], P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論（欠測と予測）
  add({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: CHAPTERS[3],
    beats: [
      beat('観測が欠けたときは、どうするでしょうか。答えは簡単で、その時刻の更新を飛ばします。', '観測が欠けたときは、どうするでしょうか。答えは簡単で、その時刻の更新を、飛ばします。'),
      beat(R`予測だけを続けるので、推定値はモデルどおりに進み、分散は $Q$ ずつ増えていきます。`, '予測だけを続けるので、推定値は、モデルどおりに進み、ぶんさんは、キューずつ増えていきます。'),
      beat('観測が戻ったら、ふつうに更新します。不確かさが大きくなっているぶん、ゲインが大きくなり、観測を強く信じます。', '観測が戻ったら、ふつうに更新します。不確かさが大きくなっているぶん、ゲインが大きくなり、観測を強く信じます。'),
      beat('先の予測も同じです。未来の観測はまだ無いので、予測ステップだけを繰り返します。', '先の予測も同じです。未来の観測は、まだ無いので、予測ステップだけを、繰り返します。'),
      beat('欠測も予測も、特別な仕組みは要りません。観測の間隔がふぞろいなデータにも、そのまま使えます。', 'けっそくも予測も、特別な仕組みは要りません。観測の間隔が、ふぞろいなデータにも、そのまま使えます。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 330 });
      ui.table({
        x: LEFT_X + 20, y: 146, widths: [330, 420, 630], aligns: ['left', 'left', 'left'], size: 24, rowH: 74,
        header: ['場面', 'すること', '結果'],
        rows: [
          ['観測がある', '予測 → 更新', '不確かさが増えて、減る'],
          ['観測が欠けた（欠測）', '予測だけ（更新を飛ばす）', R`分散が $Q$ ずつ増える`],
          ['先の予測', '予測だけを繰り返す', '先へ行くほど、帯が広がる'],
        ],
        rowAt: [0, 0, 3], rowDelay: 0, delay: 0.4,
        glowRows: [null, [{ from: 0, to: 2 }], [{ from: 3, to: 4 }]],
      });
      ui.tex(R`\text{欠測の時刻：}\quad \hat{x}_t = \hat{x}_t^-,\qquad P_t = P_t^- = P_{t-1} + Q`, { x: LEFT_X, y: 500, size: 30, at: 1 });
      keyPoint(ui, '欠測も予測も、「更新を飛ばす」だけ', 630, 4);
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（欠測と予測）
  const GAP = [41, 55];
  const AHEAD = 20;
  const GAP_YS = [...TEMP_Y.map((y, i) => (i + 1 >= GAP[0] && i + 1 <= GAP[1] ? null : y)), ...new Array(AHEAD).fill(null)];
  const GAP_T = GAP_YS.map((_, i) => i + 1);
  const GAP_FILTER = run(D.TEMP.q, D.TEMP.r, GAP_YS);
  const GAIN_AFTER = GAP_FILTER.gain[GAP[1]];
  const GAIN_USUAL = M.steadyGain(D.TEMP.q, D.TEMP.r);
  add({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '欠測のあいだは、帯が広がる',
    beats: [
      beat(`温度のデータで、${GAP[0]} 分から ${GAP[1]} 分の観測を、欠測にしました。`, `温度のデータで、${GAP[0]}分から${GAP[1]}分の観測を、けっそくにしました。`),
      beat('欠測のあいだ、推定値は横ばいで、帯だけが広がっていきます。点線の本当の温度は、帯の中にあります。', 'けっそくのあいだ、推定値は横ばいで、おびだけが、広がっていきます。点線の、本当の温度は、おびの中にあります。'),
      beat(`${GAP[1] + 1} 分に観測が戻ると、帯は一気に狭まります。このときのゲインは ${fmt(GAIN_AFTER, 2)} で、ふだんの ${fmt(GAIN_USUAL, 2)} より、ずっと大きくなっています。`, `${GAP[1] + 1}分に観測が戻ると、おびは、一気に狭まります。このときのゲインは、${fmt(GAIN_AFTER, 2)}で、ふだんの${fmt(GAIN_USUAL, 2)}より、ずっと大きくなっています。`),
      beat('100 分より先は、予測です。帯は、扇のように広がります。', 'ひゃっぷんより先は、予測です。おびは、おうぎのように広がります。'),
      beat('分からないときは、分からないなりに、幅を広げて答える。これが、カルマンフィルターの正直なところです。', '分からないときは、分からないなりに、幅を広げて答える。これが、カルマンフィルターの、正直なところです。'),
    ],
    build(ui) {
      ui.text('分からないぶんだけ、帯を広げて答える', { x: 560, y: 606, size: 25, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 1380, h: 500, xr: [0, 120], yr: [15, 25.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: [0, 20, 40, 60, 80, 100, 120], yticks: [16, 18, 20, 22, 24], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.shade(ctx, GAP[0] - 0.5, GAP[1] + 0.5, { color: C.text, alpha: 0.06 * a0 });
      P.label(ctx, '欠測', (GAP[0] + GAP[1]) / 2, 25.5, { dy: 26, size: 21, color: C.text2, weight: 700, align: 'center', alpha: a0 });
      P.shade(ctx, 100.5, 120, { color: S.COLOR.predict, alpha: 0.06 * s.p(3, 0.5) });
      P.label(ctx, '予測', 110, 25.5, { dy: 26, size: 21, color: S.COLOR.predict, weight: 700, align: 'center', alpha: s.p(3, 0.5) });
      // 帯を左から右へ: 字幕1で欠測の終わりまで、字幕2で100分まで、字幕3で120分まで
      const upto = Math.max(s.p(1, 3.0, 0.3) * (GAP[1] / 120), s.p(2, 2.0, 0.3) * (100 / 120), s.p(3, 2.0, 0.3));
      S.drawBand(ctx, P, GAP_T, GAP_FILTER.mean, GAP_FILTER.variance, { color: S.COLOR.filter, alpha: s.p(1, 0.4, 0.2), upto });
      const seen = GAP_T.filter((_, i) => GAP_YS[i] !== null);
      P.dots(ctx, seen, seen.map((t) => GAP_YS[t - 1]), { r: 4.5, color: S.COLOR.obs, alpha: 0.75 * a0 });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: a0 });
      const back = s.win(2, 3);
      P.vline(ctx, GAP[1] + 1, { color: C.yellow, alpha: back, width: 2.5 });
      P.label(ctx, `観測が戻る（K ＝ ${fmt(GAIN_AFTER, 2)}）`, GAP[1] + 1, 16, { dx: 10, size: 21, color: C.yellow, weight: 700, alpha: back });
      legend(ctx, [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' }, { color: S.COLOR.filter, label: '推定（帯は ±2 標準偏差）' }], P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // 後半のファイル（ep3-scenes-b.js）でも使う値
  window.EP3 = { run, standardized, GAIN_USUAL };
})();
