// ep2-scenes-b.js — 第2回「カルマンフィルターのしくみ」の後半: 第5〜8章（手計算、Q と R、行列の5本の式、速度の推定）、まとめ、参考文献。
(() => {
  const { C, CHAPTERS, Plot, fmt, texNum, canvasText, keyframes, legend, clamp } = KIT;
  const M = SSM;
  const D = SSMDATA;
  const S = SDRAW;
  const { beat, add, LEFT_X, CARD_X, CARD_W, eq, note, keyPoint } = SK;
  const R = String.raw;

  const T = D.tempTimes;
  const TEMP_X = D.tempSim.x;
  const TEMP_Y = D.tempSim.y;
  const TEMP_XTICKS = [0, 20, 40, 60, 80, 100];
  const F1 = D.tempFilter;

  // ---------------------------------------------------------------- 第5章 理論（手で計算する）
  const H = D.HAND;
  const HF = D.handFilter;
  const handRow = (i) => [String(i + 1), String(H.ys[i]), fmt(HF.predMean[i], 2), fmt(HF.predVar[i], 2), fmt(HF.gain[i], 2), fmt(HF.mean[i], 2), fmt(HF.variance[i], 2)];
  add({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: CHAPTERS[4],
    beats: [
      beat(R`手で計算してみます。計算しやすいように、$Q$ は ${H.q}、$R$ は ${H.r} とします。最初の推定は ${H.m0} 度で、分散は ${H.p0} です。`, `手で計算してみます。計算しやすいように、キューは${H.q}、アールは${H.r}とします。最初の推定は、${H.m0}度で、ぶんさんは${H.p0}です。`),
      beat(`時刻1。予測の分散は ${H.p0} ＋ ${H.q} で ${fmt(HF.predVar[0], 0)}。観測は ${H.ys[0]} 度。$K$ は ${fmt(HF.predVar[0], 0)} ÷ ${fmt(HF.predVar[0] + H.r, 0)} で ${fmt(HF.gain[0], 1)}。推定は ${fmt(HF.mean[0], 0)} 度、分散は ${fmt(HF.variance[0], 0)} に減ります。`, `時刻1。予測のぶんさんは、${H.p0}たす${H.q}で、${fmt(HF.predVar[0], 0)}。観測は${H.ys[0]}度。ケーは、${fmt(HF.predVar[0], 0)}わる${fmt(HF.predVar[0] + H.r, 0)}で、${fmt(HF.gain[0], 1)}。推定は${fmt(HF.mean[0], 0)}度、ぶんさんは、${fmt(HF.variance[0], 0)}に減ります。`),
      beat(`時刻2。予測の分散は ${fmt(HF.variance[0], 0)} ＋ ${H.q} で ${fmt(HF.predVar[1], 0)}。$K$ は約 ${fmt(HF.gain[1], 2)}。観測は ${H.ys[1]} 度なので、推定は ${fmt(HF.mean[0], 0)} 度から下がって、${fmt(HF.mean[1], 2)} 度になります。`, `時刻2。予測のぶんさんは、${fmt(HF.variance[0], 0)}たす${H.q}で、${fmt(HF.predVar[1], 0)}。ケーは、約${fmt(HF.gain[1], 2)}。観測は${H.ys[1]}度なので、推定は、${fmt(HF.mean[0], 0)}度から下がって、${fmt(HF.mean[1], 2)}度になります。`),
      beat(`時刻3も、同じ手順です。$K$ は約 ${fmt(HF.gain[2], 2)}、推定は ${fmt(HF.mean[2], 2)} 度になりました。`, `時刻3も、同じ手順です。ケーは、約${fmt(HF.gain[2], 2)}。推定は、${fmt(HF.mean[2], 2)}度になりました。`),
      beat(`$K$ は ${fmt(HF.gain[0], 2)}、${fmt(HF.gain[1], 2)}、${fmt(HF.gain[2], 2)} と、だんだん小さくなっています。データがたまって、予測に自信がついてきたからです。`, `ケーは、${fmt(HF.gain[0], 2)}、${fmt(HF.gain[1], 2)}、${fmt(HF.gain[2], 2)}と、だんだん小さくなっています。データがたまって、予測に、自信がついてきたからです。`),
      beat('使う計算は、足し算、引き算、掛け算、割り算だけです。これが、1次元のカルマンフィルターのすべてです。', '使う計算は、足し算、引き算、掛け算、割り算だけです。これが、1次元のカルマンフィルターの、すべてです。'),
    ],
    build(ui) {
      note(ui, R`設定：$Q = ${H.q}$、$R = ${H.r}$、最初の推定 $\hat{x}_0 = ${H.m0}$、分散 $P_0 = ${H.p0}$`, LEFT_X, 130, { size: 25, color: C.text });
      ui.card({ x: LEFT_X, y: 190, w: 1420, h: 300 });
      ui.table({
        x: LEFT_X + 20, y: 204, widths: [130, 170, 230, 230, 200, 210, 210], size: 25, rowH: 66,
        header: [R`時刻 $t$`, R`観測 $y_t$`, R`予測 $\hat{x}_t^-$`, R`予測の分散 $P_t^-$`, R`ゲイン $K_t$`, R`推定 $\hat{x}_t$`, R`分散 $P_t$`],
        rows: [0, 1, 2].map(handRow),
        rowAt: [1, 2, 3], delay: 0.3,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }], [{ from: 3, to: 4 }]],
      });
      ui.tex(R`P_t^- = P_{t-1} + Q,\qquad K_t = \frac{P_t^-}{P_t^- + R},\qquad \hat{x}_t = \hat{x}_t^- + K_t (y_t - \hat{x}_t^-),\qquad P_t = (1 - K_t) P_t^-`, { x: LEFT_X, y: 530, size: 25, at: 1 });
      keyPoint(ui, '使うのは四則演算だけ。K は、データがたまるほど小さくなる', 650, 4);
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（温度のデータで動かす）
  const ZOOM_STEPS = 10;
  const sd = (v) => Math.sqrt(v);
  const INSIDE = TEMP_X.filter((x, i) => Math.abs(x - F1.mean[i]) <= 2 * sd(F1.variance[i])).length;
  add({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '温度のデータで動かす',
    beats: [
      beat(`温度のデータで、動かしてみます。最初の推定は ${D.TEMP_INIT.m0} 度、分散は ${D.TEMP_INIT.p0} です。`, `温度のデータで、動かしてみます。最初の推定は、${D.TEMP_INIT.m0}度、ぶんさんは${D.TEMP_INIT.p0}です。`),
      beat('時刻1。紫の縦線が、予測の範囲です。± 標準偏差2つぶんを表します。', '時刻1。紫の縦線が、予測の範囲です。プラスマイナス、標準偏差ふたつぶんを表します。'),
      beat('オレンジの観測が来ると、推定は観測のほうへ引き寄せられ、範囲が狭くなります。青が、更新後です。', 'オレンジの観測が来ると、推定は、観測のほうへ引き寄せられ、範囲が狭くなります。青が、更新後です。'),
      beat('次の時刻では、範囲が少し広がってから、また観測で狭まります。広がる、狭まる、の繰り返しです。', '次の時刻では、範囲が少し広がってから、また、観測で狭まります。広がる、狭まる、の繰り返しです。'),
      beat('100回ぶん続けます。青い線が推定、帯がその不確かさです。', 'ひゃっかいぶん続けます。青い線が推定、おびが、その不確かさです。'),
      beat(`点線の本当の温度は、100回のうち ${INSIDE} 回、帯の中に入っています。推定値だけでなく、どれくらい確かなのかも分かることが、カルマンフィルターの強みです。`, `点線の、本当の温度は、ひゃっかいのうち、${INSIDE}回、おびの中に入っています。推定値だけでなく、どれくらい確かなのかも分かることが、カルマンフィルターの強みです。`),
    ],
    build() {},
    draw(ctx, s) {
      const zoomOut = s.p(4, 1.6, 0.2);
      const P = new Plot({ x: 120, y: 170, w: 1360, h: 500, xr: [keyframes(zoomOut, [[0, 0.3], [1, 0]]), keyframes(zoomOut, [[0, ZOOM_STEPS + 0.7], [1, 100]])], yr: [keyframes(zoomOut, [[0, 15], [1, 15.5]]), keyframes(zoomOut, [[0, 25], [1, 24.5]])] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: zoomOut < 0.5 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : TEMP_XTICKS, yticks: [16, 18, 20, 22, 24], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      const detail = 1 - zoomOut;
      // 各時刻の進み具合: 予測 → 観測 → 更新。時刻1・2はゆっくり、3〜10は速く
      const stepStart = (i) => (i === 0 ? null : i === 1 ? s.bt(3) + 0.3 : s.bt(3) + 3.2 + (i - 2) * 0.75);
      const errorBar = (x, mean, variance, color, alpha) => {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(P.sx(x), P.sy(mean - 2 * sd(variance)));
        ctx.lineTo(P.sx(x), P.sy(mean + 2 * sd(variance)));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(P.sx(x), P.sy(mean), 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      if (detail > 0.02) {
        errorBar(0.45, D.TEMP_INIT.m0, D.TEMP_INIT.p0, S.COLOR.filter, a0 * detail);
        canvasText(ctx, '最初の推定', P.sx(0.45) + 14, P.sy(D.TEMP_INIT.m0 + 2 * sd(D.TEMP_INIT.p0)) - 10, { size: 19, color: S.COLOR.filter, weight: 700, alpha: a0 * detail });
        for (let i = 0; i < ZOOM_STEPS; i++) {
          const t = i + 1;
          const ramp = (from, len) => clamp((s.u - from) / len);
          const pred = i === 0 ? s.p(1, 0.6, 0.3) : ramp(stepStart(i), 0.3);
          const obs = i === 0 ? s.p(2, 0.5, 0.3) : ramp(stepStart(i) + 0.25, 0.25);
          const upd = i === 0 ? s.p(2, 0.6, 1.6) : ramp(stepStart(i) + 0.5, 0.25);
          errorBar(t - 0.2, F1.predMean[i], F1.predVar[i], S.COLOR.predict, pred * detail);
          P.dots(ctx, [t], [TEMP_Y[i]], { r: 9, color: S.COLOR.obs, alpha: obs * detail });
          errorBar(t + 0.2, F1.mean[i], F1.variance[i], S.COLOR.filter, upd * detail);
        }
      }
      if (zoomOut > 0) {
        P.dots(ctx, T, TEMP_Y, { r: 4.5, color: S.COLOR.obs, alpha: 0.7 * zoomOut });
        S.drawBand(ctx, P, T, F1.mean, F1.variance, { color: S.COLOR.filter, alpha: zoomOut, upto: s.p(4, 3.0, 1.6) });
        P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: s.p(5, 0.6, 0.2), upto: s.p(5, 2.0, 0.2) });
      }
      const items = [{ color: S.COLOR.predict, label: '予測' }, { kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.filter, label: '更新後の推定（帯は ±2 標準偏差）' }];
      if (s.u >= s.bt(5)) items.push({ color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（最初の推定が外れていたら）
  const WRONG_START = 26;
  const START_STEPS = 40;
  const STARTS = [
    { p0: 25, color: S.COLOR.filter, label: `最初の分散 25（自信がない）` },
    { p0: 0.01, color: S.COLOR.predict, label: `最初の分散 0.01（信じ込んでいる）` },
  ].map((item) => ({ ...item, filter: M.filter1d(TEMP_Y.slice(0, START_STEPS), { q: D.TEMP.q, r: D.TEMP.r, m0: WRONG_START, p0: item.p0 }) }));
  add({
    id: '5V-2',
    chapter: 5,
    kind: 'visual',
    title: '最初の推定が外れていたら',
    beats: [
      beat(`最初の推定が外れていたら、どうなるでしょうか。本当は 20 度付近なのに、${WRONG_START} 度から始めてみます。`, `最初の推定が外れていたら、どうなるでしょうか。本当は、20度付近なのに、${WRONG_START}度から始めてみます。`),
      beat(R`最初の分散を大きく、${STARTS[0].p0} にしておくと、最初の $K$ は ${fmt(STARTS[0].filter.gain[0], 2)} です。1回目の観測で、すぐに正しい値の近くへ移ります。`, `最初のぶんさんを大きく、${STARTS[0].p0}にしておくと、最初のケーは、${fmt(STARTS[0].filter.gain[0], 2)}です。1回目の観測で、すぐに、正しいあたいの近くへ移ります。`),
      beat(R`最初の分散を小さく、${STARTS[1].p0} にすると、最初の $K$ は ${fmt(STARTS[1].filter.gain[0], 2)} です。間違った値を信じ込んでいるので、なかなか直りません。`, `最初のぶんさんを小さく、${STARTS[1].p0}にすると、最初のケーは、${fmt(STARTS[1].filter.gain[0], 2)}です。間違ったあたいを、信じ込んでいるので、なかなか直りません。`),
      beat('それでも、観測を重ねるうちに、どちらも同じ推定に近づいていきます。', 'それでも、観測を重ねるうちに、どちらも、同じ推定に近づいていきます。'),
      beat('最初の値に自信がないときは、分散を大きめにしておく。これが、実務での基本です。', '最初のあたいに自信がないときは、ぶんさんを、大きめにしておく。これが、実務での基本です。'),
    ],
    build(ui) {
      ui.text('自信がないときは、最初の分散を大きめに', { x: 760, y: 200, size: 26, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 1360, h: 500, xr: [0, START_STEPS], yr: [15.5, 27.5] });
      const a0 = s.p(0, 0.5, 0.1);
      const ts = T.slice(0, START_STEPS);
      P.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [16, 18, 20, 22, 24, 26], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.dots(ctx, ts, TEMP_Y.slice(0, START_STEPS), { r: 5, color: S.COLOR.obs, alpha: 0.7 * a0 });
      P.line(ctx, ts, TEMP_X.slice(0, START_STEPS), { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: a0 });
      P.dots(ctx, [0], [WRONG_START], { r: 10, color: C.red, alpha: a0 });
      P.label(ctx, `最初の推定 ${WRONG_START} ℃`, 0, WRONG_START, { dx: 18, dy: 7, size: 21, color: C.red, weight: 700, alpha: a0 });
      STARTS.forEach((item, i) => {
        const at = i + 1;
        const alpha = s.p(at, 0.4, 0.2);
        S.drawBand(ctx, P, [0, ...ts], [WRONG_START, ...item.filter.mean], [item.p0, ...item.filter.variance], { color: item.color, alpha, upto: s.p(at, 2.4, 0.3), bandAlpha: 0.14 });
      });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' }];
      STARTS.forEach((item, i) => s.u >= s.bt(i + 1) && items.push({ color: item.color, label: item.label }));
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（ゲインが落ち着く）
  const GAIN_STEPS = 30;
  const GAIN_T = T.slice(0, GAIN_STEPS);
  const SCALE = 16;
  const GAIN_CASES = [
    { q: D.TEMP.q, color: S.COLOR.filter, label: `例の設定（Q = ${D.TEMP.q}）`, at: 0 },
    { q: D.TEMP.q * SCALE, color: S.COLOR.smooth, label: `Q を ${SCALE} 倍`, at: 3 },
    { q: D.TEMP.q / SCALE, color: S.COLOR.predict, label: `Q を 1/${SCALE}`, at: 3 },
  ].map((item) => ({ ...item, gains: M.filter1d(TEMP_Y.slice(0, GAIN_STEPS), { q: item.q, r: D.TEMP.r, ...D.TEMP_INIT }).gain, steady: M.steadyGain(item.q, D.TEMP.r) }));
  add({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: CHAPTERS[5],
    beats: [
      beat(R`ゲイン $K$ が、時間とともにどう変わるかを見ます。温度の例です。`, 'ゲイン、ケーが、時間とともに、どう変わるかを見ます。温度の例です。'),
      beat(R`最初は、推定に自信がないので、$K$ は ${fmt(GAIN_CASES[0].gains[0], 2)} と大きく、観測を強く信じます。`, `最初は、推定に自信がないので、ケーは${fmt(GAIN_CASES[0].gains[0], 2)}と大きく、観測を強く信じます。`),
      beat(R`数回で、$K$ は一定の値に落ち着きます。約 ${fmt(GAIN_CASES[0].steady, 2)} です。予測で増えるぶんと、更新で減るぶんが、つり合うからです。`, `数回で、ケーは、一定のあたいに落ち着きます。約${fmt(GAIN_CASES[0].steady, 2)}です。予測で増えるぶんと、更新で減るぶんが、つり合うからです。`),
      beat(R`落ち着く値は、$Q$ と $R$ の比で決まります。$Q$ を ${SCALE} 倍にすると約 ${fmt(GAIN_CASES[1].steady, 2)}、${SCALE} 分の 1 にすると約 ${fmt(GAIN_CASES[2].steady, 2)} です。`, `落ち着くあたいは、キューとアールの比率で決まります。キューを${SCALE}倍にすると、約${fmt(GAIN_CASES[1].steady, 2)}。${SCALE}分の1にすると、約${fmt(GAIN_CASES[2].steady, 2)}です。`),
      beat(R`$K$ が大きいと、観測によく付いていき、小さいと、なめらかになります。前回見た3本の線の違いは、このゲインの違いでした。`, 'ケーが大きいと、観測によく付いていき、小さいと、なめらかになります。前回見た、さんぼんの線の違いは、このゲインの違いでした。'),
    ],
    build(ui) {
      ui.card({ x: 1130, y: 190, w: 400, h: 290, title: 'ゲインが落ち着く値', at: 2 });
      ui.table({
        x: 1146, y: 240, widths: [270, 100], aligns: ['left', 'center'], size: 20, rowH: 54,
        header: ['設定', R`$K$`],
        rows: GAIN_CASES.map((item) => [item.label, fmt(item.steady, 2)]),
        rowAt: [2, 3, 3], delay: 0.4,
      });
      ui.text('K 大：観測に付いていく<br>K 小：なめらか', { x: 1150, y: 520, size: 23, color: C.text2, at: 4 });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 940, h: 500, xr: [0, GAIN_STEPS], yr: [0, 1] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: [0, 5, 10, 15, 20, 25, 30], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], fmtY: (v) => fmt(v, 1), xlabel: '時刻 t（分）', ylabel: 'カルマンゲイン K', alpha: a0 });
      GAIN_CASES.forEach((item) => {
        const alpha = s.p(item.at, 0.5, 0.3);
        if (alpha <= 0) return;
        P.hline(ctx, item.steady, { color: item.color, alpha: 0.6 * (item.at === 0 ? s.p(2, 0.5, 0.3) : alpha) });
        P.line(ctx, GAIN_T, item.gains, { color: item.color, width: 4, alpha, upto: s.p(item.at, 2.4, 0.4) });
        P.dots(ctx, GAIN_T, item.gains, { r: 5, color: item.color, alpha: alpha * s.p(item.at, 0.5, 2.6) });
      });
      const first = s.win(1, 2);
      P.label(ctx, `最初の K ＝ ${fmt(GAIN_CASES[0].gains[0], 2)}`, 1, GAIN_CASES[0].gains[0], { dx: 16, dy: 6, size: 22, color: C.text, weight: 700, alpha: first });
      legend(ctx, GAIN_CASES.filter((item) => s.u >= s.bt(item.at)).map((item) => ({ color: item.color, label: item.label })), P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（指数平滑との関係）
  const STEADY = M.steadyGain(D.TEMP.q, D.TEMP.r);
  add({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '指数平滑との関係',
    beats: [
      beat('更新の式を、並べかえます。新しい推定は、前の推定と、新しい観測の、重みつき平均です。', '更新の式を、並べかえます。新しい推定は、前の推定と、新しい観測の、おもみつき平均です。'),
      beat(R`$K$ が一定なら、これは、指数平滑、あるいは EWMA と呼ばれる方法と、同じ式です。`, 'ケーが一定なら、これは、指数平滑、あるいは、イーダブリューエムエーと呼ばれる方法と、同じ式です。'),
      beat('つまり、指数平滑は、ローカルレベルモデルのカルマンフィルターが、落ち着いたあとの姿です。', 'つまり、指数平滑は、ローカルレベルモデルの、カルマンフィルターが、落ち着いたあとの姿です。'),
      beat(R`落ち着いたゲインは、$Q$ と $R$ の比 $q$ だけで決まります。温度の例では、約 ${fmt(STEADY, 2)} です。`, `落ち着いたゲインは、キューとアールの比率だけで決まります。温度の例では、約${fmt(STEADY, 2)}です。`),
      beat(R`違いは3つです。重みを $Q$ と $R$ から決められること。最初のうちは、重みを自動で大きくすること。そして、推定の不確かさが分かることです。`, '違いは、みっつです。おもみを、キューとアールから決められること。最初のうちは、おもみを、自動で大きくすること。そして、推定の不確かさが、分かることです。'),
    ],
    build(ui) {
      eq(ui, R`\hat{x}_t = \hat{x}_{t-1} + K_t\,(y_t - \hat{x}_{t-1})`, 130, { size: 32 });
      eq(ui, R`\hat{x}_t = (1 - K_t)\,\hat{x}_{t-1} + K_t\,y_t`, 200, { size: 36, delay: 0.6, glow: [{ from: 0, to: 2 }] });
      note(ui, '前の推定と、新しい観測の、重みつき平均', LEFT_X + 560, 216, { delay: 1.0 });
      ui.text(R`$K_t$ が一定 → <b>指数平滑（EWMA）</b>と同じ式`, { x: LEFT_X, y: 300, size: 27, at: 1 });
      eq(ui, R`K_\infty = \frac{-q + \sqrt{q^2 + 4q}}{2},\qquad q = \frac{Q}{R}`, 380, { at: 3, size: 30 });
      note(ui, R`温度の例：$q = ${D.TEMP.q / D.TEMP.r}$ → $K_\infty \approx ${texNum(STEADY, 2)}$`, LEFT_X + 560, 404, { at: 3, delay: 0.5 });
      keyPoint(ui, '指数平滑 ＝ カルマンフィルターが落ち着いたあとの姿', 500, 2);

      ui.card({ x: LEFT_X, y: 570, w: 1420, h: 160, title: 'カルマンフィルターが指数平滑より進んでいる点', at: 4 });
      [R`重みを $Q$ と $R$ から決められる`, '最初のうちは重みを自動で大きくする', '推定の不確かさ（分散）が分かる'].forEach((text, i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X + 28 + i * 470, y: 630, size: 22, at: 4, delay: 0.3 + 0.5 * i }));
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（なぜ「最もよい」のか）
  add({
    id: '6T-2',
    chapter: 6,
    kind: 'theory',
    title: 'カルマンフィルターは「最もよい混ぜ方」',
    beats: [
      beat('カルマンゲインは、適当に決めた重みではありません。推定の誤差が、いちばん小さくなる重みです。', 'カルマンゲインは、適当に決めた、おもみではありません。推定の誤差が、いちばん小さくなる、おもみです。'),
      beat('モデルが線形で、ノイズが正規分布なら、カルマンフィルターは、誤差の2乗の平均を最小にします。これより良い推定は、ありません。', 'モデルが線形で、ノイズが正規分布なら、カルマンフィルターは、誤差の2乗の平均を、最小にします。これより良い推定は、ありません。'),
      beat('ノイズが正規分布でなくても、観測の足し算と掛け算だけで作る推定の中では、いちばん良いことが知られています。', 'ノイズが、正規分布でなくても、観測の、足し算と掛け算だけで作る推定の中では、いちばん良いことが、知られています。'),
      beat(R`ただし、それは、モデルと $Q$・$R$ が正しいときの話です。合っているかを確かめる方法は、次回扱います。`, 'ただし、それは、モデルと、キュー、アールが、正しいときの話です。合っているかを確かめる方法は、次回扱います。'),
    ],
    build(ui) {
      eq(ui, R`K_t = \arg\min_K\ \mathbb{E}\big[(x_t - \hat{x}_t)^2\big]`, 140, { size: 38 });
      note(ui, '誤差の2乗の平均を、いちばん小さくするゲイン', LEFT_X + 620, 158, { delay: 0.5 });
      ui.card({ x: LEFT_X, y: 260, w: 1420, h: 250 });
      ui.table({
        x: LEFT_X + 20, y: 276, widths: [520, 860], aligns: ['left', 'left'], size: 24, rowH: 72,
        header: ['条件', 'カルマンフィルターの性質'],
        rows: [
          ['線形 ＋ ノイズが正規分布', '誤差の2乗の平均が最小。これより良い推定はない'],
          ['線形 ＋ ノイズが正規分布でない', '線形の推定（観測の足し算と掛け算）の中では最良'],
        ],
        rowAt: [1, 2], delay: 0.3,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }]],
      });
      keyPoint(ui, R`ただし、モデルと $Q$・$R$ が正しいときの話（確かめ方は第3回）`, 590, 3);
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（行列の5本の式）
  add({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: CHAPTERS[6],
    beats: [
      beat('状態が2つ以上のときは、行列で書きます。形は、1次元のときと同じです。', '状態が、ふたつ以上のときは、ぎょうれつで書きます。形は、1次元のときと同じです。'),
      beat(R`予測の2本です。状態は $F$ を掛けて進めます。分散 $P$ は共分散行列になり、$F$ で前後からはさんで、$Q$ を足します。`, '予測の、にほんです。状態は、エフを掛けて進めます。ぶんさんピーは、きょうぶんさんぎょうれつになり、エフで前後からはさんで、キューを足します。'),
      beat('更新の3本です。カルマンゲインは、行列になります。割り算が、逆行列に変わりました。', '更新の、さんぼんです。カルマンゲインは、ぎょうれつになります。割り算が、逆ぎょうれつに変わりました。'),
      beat(R`状態の更新は、予測に、ゲイン × イノベーションを足します。$H\hat{\mathbf{x}}_t^-$ は、予測した観測です。`, '状態の更新は、予測に、ゲインかける、イノベーションを足します。エイチ、エックスハットは、予測した観測です。'),
      beat(R`共分散の更新は、$1 - K$ の代わりに、単位行列から $KH$ を引いたものを掛けます。`, 'きょうぶんさんの更新は、1ひくケーの代わりに、単位ぎょうれつから、ケーエイチを引いたものを掛けます。'),
      beat(R`この5本が、カルマンフィルターです。$F$ も $H$ も 1 にすると、1次元の式に戻ります。`, 'このごほんが、カルマンフィルターです。エフもエイチも、1にすると、1次元の式に戻ります。'),
    ],
    build(ui) {
      const num = (n, color) => `<span class="pill" style="color:${color};border-color:${color}">${n}</span>`;
      note(ui, '予測', LEFT_X, 126, { at: 1, weight: 700, color: S.COLOR.predict, size: 24 });
      ui.text(num('①', S.COLOR.predict), { x: LEFT_X, y: 172, size: 24, at: 1 });
      ui.tex(R`\hat{\mathbf{x}}_t^- = F\,\hat{\mathbf{x}}_{t-1}`, { x: LEFT_X + 70, y: 164, size: 32, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text(num('②', S.COLOR.predict), { x: LEFT_X, y: 242, size: 24, at: 1, delay: 0.5 });
      ui.tex(R`P_t^- = F\,P_{t-1}\,F^\top + Q`, { x: LEFT_X + 70, y: 234, size: 32, at: 1, delay: 0.5, glow: [{ from: 1, to: 2 }] });
      note(ui, '更新', LEFT_X, 330, { at: 2, weight: 700, color: S.COLOR.filter, size: 24 });
      ui.text(num('③', S.COLOR.filter), { x: LEFT_X, y: 380, size: 24, at: 2 });
      ui.tex(R`K_t = P_t^- H^\top \big(H\,P_t^- H^\top + R\big)^{-1}`, { x: LEFT_X + 70, y: 370, size: 32, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text(num('④', S.COLOR.filter), { x: LEFT_X, y: 458, size: 24, at: 3 });
      ui.tex(R`\hat{\mathbf{x}}_t = \hat{\mathbf{x}}_t^- + K_t\,\big(\mathbf{y}_t - H\,\hat{\mathbf{x}}_t^-\big)`, { x: LEFT_X + 70, y: 448, size: 32, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text(num('⑤', S.COLOR.filter), { x: LEFT_X, y: 534, size: 24, at: 4 });
      ui.tex(R`P_t = (I - K_t H)\,P_t^-`, { x: LEFT_X + 70, y: 526, size: 32, at: 4, glow: [{ from: 4, to: 5 }] });
      keyPoint(ui, R`この5本がカルマンフィルター（$F = H = 1$ なら1次元の式）`, 650, 5);

      ui.card({ x: 880, y: 126, w: 650, h: 430, title: '1次元の式との対応', at: 1 });
      ui.table({
        x: 900, y: 172, widths: [70, 250, 290], aligns: ['center', 'left', 'left'], size: 20, rowH: 62,
        header: ['', '1次元', '行列'],
        rows: [
          ['①', R`$\hat{x}_t^- = \hat{x}_{t-1}$`, R`$F$ を掛けて進める`],
          ['②', R`$P_t^- = P_{t-1} + Q$`, R`$F$ ではさんで $Q$ を足す`],
          ['③', R`$K_t = P_t^- / (P_t^- + R)$`, '割り算 → 逆行列'],
          ['④', R`$\hat{x}_t^- + K_t (y_t - \hat{x}_t^-)$`, R`予測した観測は $H\hat{\mathbf{x}}_t^-$`],
          ['⑤', R`$(1 - K_t) P_t^-$`, R`$1$ → $I$、$K$ → $KH$`],
        ],
        rowAt: [1, 1, 2, 3, 4], delay: 0.6,
      });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（共分散行列を楕円で見る）
  const CK = D.cartKalman.steps;
  // 楕円の列: 最初 → 予測1 → 更新1 → 予測2 → 更新2 → …
  const ELLIPSES = [{ cov: D.CART_INIT.P0, kind: 'init' }];
  for (let i = 0; i < 5; i++) ELLIPSES.push({ cov: CK[i].PPred, kind: 'predict', step: i + 1 }, { cov: CK[i].P, kind: 'update', step: i + 1 });
  const blendCov = (a, b, k) => a.map((row, i) => row.map((v, j) => v + (b[i][j] - v) * k));
  add({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '共分散行列 P を図で見る',
    beats: [
      beat(R`共分散行列 $P$ を、図にします。台車の例で、横が位置の誤差、縦が速度の誤差です。楕円が、状態がありそうな範囲を表します。`, 'きょうぶんさんぎょうれつピーを、図にします。台車の例で、横が位置の誤差、縦が速度の誤差です。だえんが、状態がありそうな範囲を表します。'),
      beat('予測すると、楕円は斜めに伸びます。速度が大きければ、位置も先へ進みます。位置と速度の誤差が、連動するようになるのです。', '予測すると、だえんは、斜めに伸びます。速度が大きければ、位置も先へ進みます。位置と速度の誤差が、連動するようになるのです。'),
      beat('位置を観測すると、楕円は、横方向に絞られます。', '位置を観測すると、だえんは、横方向に絞られます。'),
      beat('次の予測で、また斜めに伸びます。楕円が斜めのときに横から絞ると、縦にも縮みます。位置が分かると、速度も分かってくるのです。', '次の予測で、また斜めに伸びます。だえんが斜めのときに、横から絞ると、縦にも縮みます。位置が分かると、速度も分かってくるのです。'),
      beat('予測で伸び、更新で縮む。これを繰り返すと、楕円は小さく落ち着きます。', '予測で伸び、更新で縮む。これを繰り返すと、だえんは、小さく落ち着きます。'),
    ],
    build(ui) {
      ui.tex(R`P = \begin{bmatrix} \text{位置の分散} & \text{共分散} \\ \text{共分散} & \text{速度の分散} \end{bmatrix}`, { x: 960, y: 190, size: 25 });
      ui.text('', { x: 960, y: 330, size: 27, weight: 700, at: 0, live: (u) => stageLabel(u) });
      ui.text('', { x: 960, y: 390, size: 23, color: C.text2, at: 0, live: (u) => { const c = covAt(u).cov; return `位置の分散 ${fmt(c[0][0], 2)}<br>速度の分散 ${fmt(c[1][1], 2)}<br>共分散 ${fmt(c[0][1], 2)}`; } });
      ui.text('楕円の傾き ＝ 位置と速度の誤差の連動（共分散）', { x: 960, y: 560, size: 22, weight: 700, color: C.yellow, at: 3, glow: [{ from: 3 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 150, y: 170, w: 700, h: 500, xr: [-12.5, 12.5], yr: [-5, 5] });
      const a0 = s.p(0, 0.5, 0.2);
      P.axes(ctx, { xticks: [-10, -5, 0, 5, 10], yticks: [-4, -2, 0, 2, 4], xlabel: '位置の誤差（m）', ylabel: '速度の誤差（m/秒）', alpha: a0 });
      P.vline(ctx, 0, { color: C.grid, dash: null, alpha: a0 });
      const { cov, kind, previous } = covAt(s.u);
      if (previous) S.drawEllipse(ctx, P, [0, 0], previous, { color: C.muted, alpha: 0.6 * a0, fill: 0, dash: [7, 6], width: 2 });
      S.drawEllipse(ctx, P, [0, 0], cov, { color: kind === 'predict' ? S.COLOR.predict : S.COLOR.filter, alpha: a0, width: 4, fill: 0.18 });
    },
  });
  // 7V の楕円: 字幕ごとに、楕円の列を何番目まで進めるか
  function covAt(u) {
    const bt = window.SCENES.find((sc) => sc.id === '7V').beatStarts;
    const keys = [[bt[1] + 0.4, 0], [bt[1] + 2.0, 1], [bt[2] + 0.4, 1], [bt[2] + 2.0, 2], [bt[3] + 0.4, 2], [bt[3] + 2.0, 3], [bt[3] + 4.5, 3], [bt[3] + 6.0, 4]];
    for (let i = 4; i < ELLIPSES.length - 1; i++) keys.push([bt[4] + 0.4 + (i - 4) * 1.0, i], [bt[4] + 1.2 + (i - 4) * 1.0, i + 1]);
    const position = keyframes(u, keys);
    const index = Math.min(ELLIPSES.length - 2, Math.floor(position));
    const k = position - index;
    const target = ELLIPSES[k > 0 ? index + 1 : index];
    return { cov: blendCov(ELLIPSES[index].cov, ELLIPSES[index + 1].cov, k), kind: target.kind, step: target.step, previous: k > 0 || index > 0 ? ELLIPSES[k > 0 ? index : index - 1].cov : null };
  }
  function stageLabel(u) {
    const { kind, step } = covAt(u);
    return kind === 'init' ? '最初の不確かさ' : kind === 'predict' ? `時刻 ${step}：予測（伸びる）` : `時刻 ${step}：更新（絞られる）`;
  }

  // ---------------------------------------------------------------- 第8章 図解（位置から速度を推定する）
  const CART_T = D.cartTimes;
  const POS_HAT = CK.map((step) => step.x[0]);
  const POS_VAR = CK.map((step) => step.P[0][0]);
  const SPEED_HAT = CK.map((step) => step.x[1]);
  const SPEED_VAR = CK.map((step) => step.P[1][1]);
  const POS_ERR = { raw: M.rmse(D.cartSim.y, D.cartSim.position), filter: M.rmse(POS_HAT, D.cartSim.position) };
  add({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: CHAPTERS[7],
    beats: [
      beat('台車のデータに、行列のカルマンフィルターをかけます。観測は位置だけです。速度の最初の推定は 0 で、分散を大きくとりました。', '台車のデータに、ぎょうれつのカルマンフィルターをかけます。観測は、位置だけです。速度の、最初の推定はゼロで、ぶんさんを大きくとりました。'),
      beat(`左は位置です。本当の位置とのずれは、観測のままだと ${fmt(POS_ERR.raw, 1)} メートル、推定では ${fmt(POS_ERR.filter, 1)} メートルに減りました。`, `左は、位置です。本当の位置とのずれは、観測のままだと、${fmt(POS_ERR.raw, 1)}メートル。推定では、${fmt(POS_ERR.filter, 1)}メートルに減りました。`),
      beat('右は速度です。最初の数回の観測で、推定は 0 から、本当の速度の近くまで、一気に動きます。', '右は、速度です。最初の数回の観測で、推定は、ゼロから、本当の速度の近くまで、一気に動きます。'),
      beat('帯も、すぐに狭くなります。位置の変わり方から、速度が分かるからです。', 'おびも、すぐに狭くなります。位置の変わりかたから、速度が分かるからです。'),
      beat('後半、台車が遅くなると、速度の推定も、少し遅れてついていきます。', '後半、台車が遅くなると、速度の推定も、少し遅れて、ついていきます。'),
      beat('測っていない速度を、位置の観測とモデルだけから推定できました。直接は測れない状態を推定できることが、カルマンフィルターの大きな利点です。', '測っていない速度を、位置の観測と、モデルだけから、推定できました。直接は測れない状態を、推定できることが、カルマンフィルターの、大きな利点です。'),
    ],
    build(ui) {
      ui.text('測っていない速度も、推定できる', { x: 900, y: 716, size: 24, weight: 700, color: C.yellow, at: 5, glow: [{ from: 5 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.1);
      const run = s.p(1, 3.0, 0.3); // フィルターを左から右へ走らせる
      const P = new Plot({ x: 120, y: 180, w: 640, h: 470, xr: [0, 40], yr: [-4, 46] });
      P.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 10, 20, 30, 40], xlabel: '時刻 t（秒）', ylabel: '位置（m）', alpha: a0 });
      P.dots(ctx, CART_T, D.cartSim.y, { r: 5, color: S.COLOR.obs, alpha: 0.8 * a0 });
      P.line(ctx, CART_T, D.cartSim.position, { color: S.COLOR.truth, width: 2.5, dash: [9, 7], alpha: a0 });
      S.drawBand(ctx, P, CART_T, POS_HAT, POS_VAR, { color: S.COLOR.filter, alpha: s.p(1, 0.4, 0.2), upto: run });
      const Q = new Plot({ x: 900, y: 180, w: 600, h: 470, xr: [0, 40], yr: [-0.6, 2.4] });
      Q.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 0.5, 1, 1.5, 2], fmtY: (v) => fmt(v, 1), xlabel: '時刻 t（秒）', ylabel: '速度（m/秒）', alpha: a0 });
      Q.line(ctx, CART_T, D.cartSim.velocity, { color: S.COLOR.truth, width: 2.5, dash: [9, 7], alpha: a0 });
      const speedRun = s.p(2, 3.0, 0.3);
      S.drawBand(ctx, Q, [0, ...CART_T], [D.CART_INIT.m0[1], ...SPEED_HAT], [D.CART_INIT.P0[1][1], ...SPEED_VAR], { color: S.COLOR.filter, alpha: s.p(2, 0.4, 0.2), upto: speedRun });
      const late = s.win(4, 5);
      Q.shade(ctx, 22, 40, { color: C.yellow, alpha: 0.08 * late });
      legend(ctx, [{ kind: 'dot', color: S.COLOR.obs, label: '観測（位置だけ）' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の値' }, { color: S.COLOR.filter, label: 'カルマンフィルターの推定（帯は ±2 標準偏差）' }], P.x, 716, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第8章 理論（なぜ速度が直るのか）
  const AT = 10;
  const STEP = CK[AT - 1];
  add({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: 'なぜ、測っていない速度が直るのか',
    beats: [
      beat('なぜ、測っていない速度が直るのでしょうか。カルマンゲインの中身を見ます。', 'なぜ、測っていない速度が、直るのでしょうか。カルマンゲインの中身を見ます。'),
      beat('位置だけを観測するとき、ゲインは2つの数になります。上が位置を直す強さ、下が速度を直す強さです。', '位置だけを観測するとき、ゲインは、ふたつの数になります。上が、位置を直す強さ。下が、速度を直す強さです。'),
      beat('下の数の分子は、位置と速度の誤差の、共分散です。さきほどの楕円の、傾きにあたります。', '下の数の分子は、位置と速度の誤差の、きょうぶんさんです。さきほどの、だえんの傾きにあたります。'),
      beat(R`予測のたびに、$F$ が位置と速度を結びつけるので、共分散が生まれます。だから、位置のずれから、速度も直せます。`, '予測のたびに、エフが、位置と速度を結びつけるので、きょうぶんさんが生まれます。だから、位置のずれから、速度も直せます。'),
      beat(`例では、${AT} 秒の時点のゲインは、位置が ${fmt(STEP.K[0][0], 2)}、速度が ${fmt(STEP.K[1][0], 2)} です。観測が予測より 1 メートル先なら、速度の推定を、秒速 ${fmt(STEP.K[1][0], 2)} メートル上げます。`, `例では、${AT}秒の時点のゲインは、位置が${fmt(STEP.K[0][0], 2)}、速度が${fmt(STEP.K[1][0], 2)}です。観測が、予測より1メートル先なら、速度の推定を、秒速${fmt(STEP.K[1][0], 2)}メートル上げます。`),
    ],
    build(ui) {
      note(ui, R`位置だけを観測：$H = \begin{bmatrix} 1 & 0 \end{bmatrix}$、予測の共分散 $P_t^- = \begin{bmatrix} P_{11} & P_{12} \\ P_{21} & P_{22} \end{bmatrix}$`, LEFT_X, 130, { size: 25, color: C.text });
      ui.tex(R`K_t = \frac{1}{P_{11} + R} \begin{bmatrix} P_{11} \\ \htmlClass{cross}{P_{21}} \end{bmatrix}`, { x: LEFT_X, y: 230, size: 40, at: 1, hl: [{ cls: 'cross', from: 2, to: 4 }] });
      note(ui, '← 位置を直す強さ', LEFT_X + 440, 240, { at: 1, delay: 0.5, size: 23 });
      note(ui, '← 速度を直す強さ（分子は、位置と速度の共分散）', LEFT_X + 440, 296, { at: 1, delay: 0.8, size: 23 });
      ui.text(R`予測 $P_t^- = F P_{t-1} F^\top + Q$ のたびに、$F$ が位置と速度を結びつける → $P_{21} \neq 0$`, { x: LEFT_X, y: 420, size: 25, at: 3 });
      keyPoint(ui, '共分散があるから、位置のずれで速度も直せる', 640, 3);

      ui.card({ x: LEFT_X, y: 490, w: 1420, h: 120, title: `例（t = ${AT} 秒）`, at: 4 });
      ui.tex(
        R`P_t^- = \begin{bmatrix} ${texNum(STEP.PPred[0][0], 2)} & ${texNum(STEP.PPred[0][1], 2)} \\ ${texNum(STEP.PPred[1][0], 2)} & ${texNum(STEP.PPred[1][1], 3)} \end{bmatrix},\quad R = ${D.CART.r} \quad\Rightarrow\quad K_t = \begin{bmatrix} ${texNum(STEP.K[0][0], 2)} \\ ${texNum(STEP.K[1][0], 2)} \end{bmatrix}`,
        { x: LEFT_X + 220, y: 514, size: 27, at: 4, delay: 0.3 },
      );
    },
  });

  // ---------------------------------------------------------------- まとめ・参考文献
  SK.summaryScene({
    chapter: 9,
    title: '第2回のまとめ',
    items: [
      ['カルマンフィルター ＝ 予測と更新の繰り返し', '追いかけるのは、推定値と分散の2つだけ'],
      ['予測：不確かさが増える', R`1次元なら、平均はそのまま、分散は $Q$ だけ増える`],
      ['更新：観測へ寄り、不確かさが減る', R`$\hat{x}_t = \hat{x}_t^- + K_t\,(y_t - \hat{x}_t^-)$`],
      ['カルマンゲイン ＝ 信じる割合', R`予測と観測の不確かさの比で決まる。落ち着いた先は $Q$ と $R$ の比で決まる`],
      ['行列でも同じ形（5本の式）', '共分散を通じて、測っていない状態も推定できる'],
    ],
    closing: '次回：カルマンフィルターを使いこなす ― 確かめる、決める、広げる',
    beats: [
      beat('まとめです。カルマンフィルターは、予測と更新の繰り返しです。追いかけるのは、推定値と分散だけです。', 'まとめです。カルマンフィルターは、予測と更新の繰り返しです。追いかけるのは、推定値と、ぶんさんだけです。'),
      beat('予測すると、不確かさが増えます。', '予測すると、不確かさが増えます。'),
      beat('更新すると、推定は観測へ寄り、不確かさが減ります。', '更新すると、推定は、観測へ寄り、不確かさが減ります。'),
      beat('カルマンゲインは、予測と観測の、どちらをどれだけ信じるかを表します。不確かさの比で決まります。', 'カルマンゲインは、予測と観測の、どちらをどれだけ信じるかを表します。不確かさの比率で決まります。'),
      beat('行列にしても、同じ形の5本の式です。共分散を通じて、測っていない状態も推定できます。', 'ぎょうれつにしても、同じ形の、ごほんの式です。きょうぶんさんを通じて、測っていない状態も、推定できます。'),
      beat(R`次回は、使いこなすための道具です。$Q$ と $R$ の決め方、平滑化、非線形への拡張を扱います。`, '次回は、使いこなすための道具です。キューとアールの決めかた、へいかつか、非線形への拡張を扱います。'),
    ],
  });

  SK.endScene({
    chapter: 10,
    references: [
      'R. E. Kalman, "A New Approach to Linear Filtering and Prediction Problems", <i>Journal of Basic Engineering</i>, 82(1), 35–45, 1960',
      'J. Durbin, S. J. Koopman, <i>Time Series Analysis by State Space Methods</i>, 2nd ed., Oxford University Press, 2012',
      'S. Särkkä, <i>Bayesian Filtering and Smoothing</i>, Cambridge University Press, 2013',
      '足立修一・丸田一郎『カルマンフィルタの基礎』東京電機大学出版局、2012',
    ],
    beats: [
      beat('参考文献です。第2回は、ここまでです。', '参考文献です。第2回は、ここまでです。', 7),
    ],
  });
})();
