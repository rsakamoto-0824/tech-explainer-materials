// ep3-scenes-b.js — 第3回「カルマンフィルターを使いこなす」の後半: 第5〜7章（平滑化、非線形への拡張、実務の手順と注意）、まとめ、参考文献。
(() => {
  const { C, CHAPTERS, Plot, fmt, texNum, canvasText, legend, rgba } = KIT;
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
  const SMOOTH_MEAN = D.tempSmooth.xs.map((x) => x[0]);
  const SMOOTH_VAR = D.tempSmooth.Ps.map((P) => P[0][0]);
  const TEMP_ERR = { filter: M.rmse(F1.mean, TEMP_X), smooth: M.rmse(SMOOTH_MEAN, TEMP_X) };
  const MID = 50; // 帯の幅を比べる時刻

  // ---------------------------------------------------------------- 第5章 理論（平滑化）
  add({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: CHAPTERS[4],
    beats: [
      beat('次は、あとから直す道具、平滑化です。フィルターは、その時刻までの観測しか使いません。', '次は、あとから直す道具、へいかつかです。フィルターは、その時刻までの観測しか、使いません。'),
      beat('全部のデータがそろっているなら、あとの観測も使って、過去の推定を直せます。', '全部のデータがそろっているなら、あとの観測も使って、過去の推定を、直せます。'),
      beat('手順はこうです。フィルターを最後まで走らせたあと、最後の時刻から、前へ戻りながら直していきます。', '手順は、こうです。フィルターを、最後まで走らせたあと、最後の時刻から、前へ戻りながら、直していきます。'),
      beat(R`直し方は、更新の式とよく似ています。1つ先の時刻の「平滑化した値と、予測した値の差」に、ゲイン $C_t$ を掛けて足します。`, '直しかたは、更新の式と、よく似ています。ひとつ先の時刻の、へいかつかしたあたいと、予測したあたいの差に、ゲイン、シーを掛けて、足します。'),
      beat('この方法は、考えた3人の頭文字から、RTS スムーザーと呼ばれます。', 'この方法は、考えた3人の頭文字から、アールティーエス、スムーザーと呼ばれます。'),
    ],
    build(ui) {
      ui.text(R`フィルター：$y_1, \dots, y_t$ まで　→　平滑化：$y_1, \dots, y_T$ の全部`, { x: LEFT_X, y: 132, size: 27, at: 1 });
      note(ui, '後ろ向きのゲイン', LEFT_X, 236, { at: 3, weight: 700, color: C.yellow, size: 24 });
      eq(ui, R`C_t = P_t\,F^\top \big(P_{t+1}^-\big)^{-1}`, 272, { at: 3, size: 32 });
      note(ui, '平滑化した推定値', LEFT_X, 362, { at: 3, weight: 700, color: S.COLOR.smooth, size: 24 });
      eq(ui, R`\hat{\mathbf{x}}_t^{s} = \hat{\mathbf{x}}_t + C_t\,\htmlClass{diff}{\big(\hat{\mathbf{x}}_{t+1}^{s} - \hat{\mathbf{x}}_{t+1}^-\big)}`, 398, { at: 3, size: 32, delay: 0.4, hl: [{ cls: 'diff', from: 3, to: 4, color: S.COLOR.smooth }] });
      note(ui, '1つ先の時刻で、あとのデータが教えてくれた差', LEFT_X + 620, 462, { at: 3, delay: 0.9, color: S.COLOR.smooth });
      note(ui, '平滑化した共分散', LEFT_X, 500, { at: 3, weight: 700, color: S.COLOR.smooth, size: 24, delay: 0.6 });
      eq(ui, R`P_t^{s} = P_t + C_t\,\big(P_{t+1}^{s} - P_{t+1}^-\big)\,C_t^\top`, 536, { at: 3, size: 32, delay: 0.8 });
      keyPoint(ui, 'フィルターを最後まで走らせ、うしろから前へ直す（RTS スムーザー）', 650, 4);
    },
    draw(ctx, s) {
      // 前向き（フィルター）と後ろ向き（平滑化）の矢印
      const a = s.p(2, 0.6, 0.3);
      if (a <= 0) return;
      const x0 = 1060;
      const x1 = 1500;
      S.arrow(ctx, x0, 250, x1, 250, { color: S.COLOR.filter, width: 5, alpha: a, upto: s.p(2, 1.2, 0.3), head: 18 });
      canvasText(ctx, '① フィルター（前へ）', x0, 226, { size: 21, color: S.COLOR.filter, weight: 700, alpha: a });
      const back = s.p(2, 0.6, 1.6);
      S.arrow(ctx, x1, 330, x0, 330, { color: S.COLOR.smooth, width: 5, alpha: back, upto: s.p(2, 1.2, 1.6), head: 18 });
      canvasText(ctx, '② 平滑化（うしろから前へ）', x0, 368, { size: 21, color: S.COLOR.smooth, weight: 700, alpha: back });
      canvasText(ctx, 't = 1', x0, 296, { size: 18, color: C.muted, alpha: a });
      canvasText(ctx, 't = T', x1, 296, { size: 18, color: C.muted, align: 'right', alpha: a });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（フィルターと平滑化を比べる）
  add({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'フィルターと平滑化を比べる',
    beats: [
      beat('温度のデータです。青が、フィルターの推定です。', '温度のデータです。青が、フィルターの推定です。'),
      beat('最後の時刻から、前へ戻りながら直していきます。緑が、平滑化した推定です。', '最後の時刻から、前へ戻りながら、直していきます。緑が、へいかつかした推定です。'),
      beat(`平滑化のほうがなめらかで、帯も狭くなります。${MID} 分の時点の分散は、${fmt(F1.variance[MID - 1], 2)} から ${fmt(SMOOTH_VAR[MID - 1], 2)} に減りました。前と後ろ、両側のデータを使えるからです。`, `へいかつかのほうが、なめらかで、おびも狭くなります。${MID}分の時点のぶんさんは、${fmt(F1.variance[MID - 1], 2)}から、${fmt(SMOOTH_VAR[MID - 1], 2)}に減りました。前と後ろ、両側のデータを使えるからです。`),
      beat(`本当の温度とのずれは、フィルターの ${fmt(TEMP_ERR.filter, 2)} 度から、${fmt(TEMP_ERR.smooth, 2)} 度に減りました。`, `本当の温度とのずれは、フィルターの${fmt(TEMP_ERR.filter, 2)}度から、${fmt(TEMP_ERR.smooth, 2)}度に減りました。`),
      beat('使い分けは、こうです。その場で答えが要るなら、フィルター。あとから分析するなら、平滑化です。', '使い分けは、こうです。その場で答えが要るなら、フィルター。あとから分析するなら、へいかつかです。'),
    ],
    build(ui) {
      ui.card({ x: 1130, y: 180, w: 400, h: 250, title: '本当の温度とのずれ（RMSE、℃）', at: 3 });
      ui.table({
        x: 1150, y: 230, widths: [230, 130], aligns: ['left', 'center'], size: 22, rowH: 56,
        header: ['方法', 'ずれ'],
        rows: [['フィルター', fmt(TEMP_ERR.filter, 2)], ['平滑化', fmt(TEMP_ERR.smooth, 2)]],
        at: 3, rowDelay: 0.4, delay: 0.3,
        glowRows: [null, [{ from: 3 }]],
      });
      ui.text('その場で答えが要る → フィルター<br>あとから分析する → 平滑化', { x: 1130, y: 470, size: 23, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 950, h: 500, xr: [0, 100], yr: [15.5, 24.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [16, 18, 20, 22, 24], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.dots(ctx, T, TEMP_Y, { r: 4.5, color: S.COLOR.obs, alpha: 0.55 * a0 });
      const sweep = s.p(1, 3.0, 0.4); // 平滑化を、右端から左へ進める
      const smoothAlpha = s.p(1, 0.4, 0.3);
      S.drawBand(ctx, P, T, F1.mean, F1.variance, { color: S.COLOR.filter, alpha: s.p(0, 0.4, 0.3) * (1 - 0.55 * smoothAlpha), upto: s.p(0, 2.4, 0.4) });
      if (smoothAlpha > 0) {
        const from = Math.max(0, Math.round((1 - sweep) * (T.length - 1)));
        S.drawBand(ctx, P, T, SMOOTH_MEAN, SMOOTH_VAR, { color: S.COLOR.smooth, alpha: smoothAlpha, from });
        if (sweep < 1) P.vline(ctx, T[from], { color: S.COLOR.smooth, alpha: smoothAlpha, dash: null, width: 2 });
      }
      P.vline(ctx, MID, { color: C.text2, alpha: s.win(2, 3) });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: s.p(3, 0.6, 0.2), upto: s.p(3, 1.6, 0.2) });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.filter, label: 'フィルター' }];
      if (s.u >= s.bt(1)) items.push({ color: S.COLOR.smooth, label: '平滑化' });
      if (s.u >= s.bt(3)) items.push({ color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（台車の速度）
  const CART_T = D.cartTimes;
  const CK = D.cartKalman.steps;
  const SPEED_F = CK.map((step) => step.x[1]);
  const SPEED_F_VAR = CK.map((step) => step.P[1][1]);
  const SPEED_S = D.cartSmooth.xs.map((x) => x[1]);
  const SPEED_S_VAR = D.cartSmooth.Ps.map((P) => P[1][1]);
  const SPEED_ERR = { filter: M.rmse(SPEED_F, D.cartSim.velocity), smooth: M.rmse(SPEED_S, D.cartSim.velocity) };
  add({
    id: '5V-2',
    chapter: 5,
    kind: 'visual',
    title: '測っていない速度ほど、平滑化が効く',
    beats: [
      beat('台車の速度でも比べます。青のフィルターは、ガタガタして、変化にも遅れていました。', '台車の速度でも、比べます。青のフィルターは、ガタガタして、変化にも、遅れていました。'),
      beat('緑の平滑化は、なめらかで、点線の本当の速度によく沿っています。', '緑のへいかつかは、なめらかで、点線の、本当の速度に、よく沿っています。'),
      beat(`本当の速度とのずれは、秒速 ${fmt(SPEED_ERR.filter, 2)} メートルから、${fmt(SPEED_ERR.smooth, 2)} メートルに減りました。`, `本当の速度とのずれは、秒速${fmt(SPEED_ERR.filter, 2)}メートルから、${fmt(SPEED_ERR.smooth, 2)}メートルに減りました。`),
      beat('速度は、位置の変化から間接的に分かる量です。こういう状態ほど、あとのデータが役に立ちます。', '速度は、位置の変化から、間接的に分かる量です。こういう状態ほど、あとのデータが、役に立ちます。'),
    ],
    build(ui) {
      ui.card({ x: 1130, y: 180, w: 400, h: 250, title: '本当の速度とのずれ（RMSE、m/秒）', at: 2 });
      ui.table({
        x: 1150, y: 230, widths: [230, 130], aligns: ['left', 'center'], size: 22, rowH: 56,
        header: ['方法', 'ずれ'],
        rows: [['フィルター', fmt(SPEED_ERR.filter, 2)], ['平滑化', fmt(SPEED_ERR.smooth, 2)]],
        at: 2, rowDelay: 0.4, delay: 0.3,
        glowRows: [null, [{ from: 2 }]],
      });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 950, h: 500, xr: [0, 40], yr: [-0.4, 2.4] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 0.5, 1, 1.5, 2], fmtY: (v) => fmt(v, 1), xlabel: '時刻 t（秒）', ylabel: '速度（m/秒）', alpha: a0 });
      const smooth = s.p(1, 0.5, 0.2);
      S.drawBand(ctx, P, CART_T, SPEED_F, SPEED_F_VAR, { color: S.COLOR.filter, alpha: a0 * (1 - 0.5 * smooth), bandAlpha: 0.14 });
      S.drawBand(ctx, P, CART_T, SPEED_S, SPEED_S_VAR, { color: S.COLOR.smooth, alpha: smooth, upto: s.p(1, 2.0, 0.3) });
      P.line(ctx, CART_T, D.cartSim.velocity, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: a0 });
      const items = [{ color: S.COLOR.truth, dash: [8, 6], label: '本当の速度' }, { color: S.COLOR.filter, label: 'フィルター' }];
      if (s.u >= s.bt(1)) items.push({ color: S.COLOR.smooth, label: '平滑化' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 非線形の例: レールの横のセンサーが、台車までの距離を測る
  const SENSOR_OFFSET = 2; // センサーとレールの間の距離（m）
  const distance = (p) => Math.sqrt(p * p + SENSOR_OFFSET * SENSOR_OFFSET);
  const distanceSlope = (p) => p / distance(p);
  // 位置の推定（正規分布）を、距離の関数に通す
  const IN = { mean: 1.5, variance: 1.2 * 1.2 };
  const MC_COUNT = 20000;
  const MC = M.monteCarloTransform(distance, IN.mean, IN.variance, MC_COUNT, 5);
  const LIN = M.linearizedTransform(distance, distanceSlope, IN.mean, IN.variance);
  const SIG = M.sigmaPointTransform(distance, IN.mean, IN.variance);
  const MC_HIST = M.histogram(MC.outputs, 1.9, 5.5, 36);

  // ---------------------------------------------------------------- 第6章 理論（非線形と拡張カルマンフィルター）
  const GEO = { x0: 1010, x1: 1500, railY: 250, sensorX: 1150, scale: 62 };
  add({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: CHAPTERS[5],
    beats: [
      beat('ここまでは、線形のモデルでした。最後に、非線形の問題に広げます。', 'ここまでは、線形のモデルでした。最後に、非線形の問題に広げます。'),
      beat(`例です。レールから ${SENSOR_OFFSET} メートル離れた所にセンサーを置き、台車までの距離を測ります。測れるのは、まっすぐな距離だけです。`, `例です。レールから、${SENSOR_OFFSET}メートル離れた所に、センサーを置き、台車までの距離を測ります。測れるのは、まっすぐな距離だけです。`),
      beat(R`観測は、位置 $p$ のルートを含む式になります。位置に行列 $H$ を掛ける形では、書けません。`, '観測は、位置ピーの、ルートを含む式になります。位置に、ぎょうれつエイチを掛ける形では、書けません。'),
      beat('困るのは、正規分布を曲がった関数に通すと、正規分布でなくなることです。平均と分散だけでは、追えなくなります。', '困るのは、正規分布を、曲がった関数に通すと、正規分布でなくなることです。平均と、ぶんさんだけでは、追えなくなります。'),
      beat('拡張カルマンフィルター、EKF は、今の推定値のまわりで、関数を接線、つまり直線で置きかえます。', '拡張カルマンフィルター、イーケーエフは、今の推定値のまわりで、関数を、接線、つまり、直線で置きかえます。'),
      beat(R`接線の傾きを $H$ の代わりに使えば、あとは、ふつうのカルマンフィルターと同じ5本の式です。`, '接線の傾きを、エイチの代わりに使えば、あとは、ふつうのカルマンフィルターと同じ、ごほんの式です。'),
    ],
    build(ui) {
      note(ui, '非線形のモデル（一般形）', LEFT_X, 130, { weight: 700, size: 24 });
      eq(ui, R`\mathbf{x}_t = f(\mathbf{x}_{t-1}) + \mathbf{w}_t,\qquad \mathbf{y}_t = h(\mathbf{x}_t) + \mathbf{v}_t`, 168, { size: 30 });
      note(ui, '例：距離だけを測るセンサー', LEFT_X, 262, { at: 1, weight: 700, size: 24 });
      eq(ui, R`y_t = h(p_t) + v_t,\qquad h(p) = \sqrt{p^2 + d^2}`, 300, { at: 2, size: 32, glow: [{ from: 2, to: 3 }] });
      ui.text('正規分布を曲がった関数に通すと、正規分布でなくなる', { x: LEFT_X, y: 400, size: 25, at: 3, glow: [{ from: 3, to: 4 }] });
      note(ui, '拡張カルマンフィルター（EKF）：接線で置きかえる', LEFT_X, 480, { at: 4, weight: 700, color: S.COLOR.predict, size: 24 });
      eq(ui, R`H_t = \frac{\partial h}{\partial p}\bigg|_{p = \hat{p}_t^-} = \frac{\hat{p}_t^-}{\sqrt{(\hat{p}_t^-)^2 + d^2}}`, 520, { at: 4, size: 30, delay: 0.4 });
      keyPoint(ui, R`接線の傾きを $H$ の代わりに使えば、あとは同じ5本の式`, 660, 5);
    },
    draw(ctx, s) {
      const a = s.p(1, 0.6, 0.3);
      if (a <= 0) return;
      const cartX = GEO.sensorX + 3.6 * GEO.scale;
      const sensorY = GEO.railY + SENSOR_OFFSET * GEO.scale;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(GEO.x0, GEO.railY);
      ctx.lineTo(GEO.x1, GEO.railY);
      ctx.stroke();
      // センサーからレールへの垂線（長さ d）と、台車までの距離（観測 y）
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(GEO.sensorX, sensorY);
      ctx.lineTo(GEO.sensorX, GEO.railY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = S.COLOR.obs;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(GEO.sensorX, sensorY);
      ctx.lineTo(cartX, GEO.railY);
      ctx.stroke();
      ctx.fillStyle = S.COLOR.obs;
      ctx.beginPath();
      ctx.arc(GEO.sensorX, sensorY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      S.cart(ctx, cartX, GEO.railY, { alpha: a, color: S.COLOR.filter, scale: 0.9 });
      S.arrow(ctx, GEO.sensorX, GEO.railY + 14, cartX, GEO.railY + 14, { color: S.COLOR.filter, width: 2.5, alpha: a, head: 11 });
      canvasText(ctx, '位置 p', GEO.sensorX + 16, GEO.railY + 44, { size: 21, color: S.COLOR.filter, weight: 700, alpha: a });
      canvasText(ctx, 'd', GEO.sensorX - 20, (GEO.railY + sensorY) / 2 + 6, { size: 22, color: C.text2, weight: 700, align: 'right', alpha: a });
      canvasText(ctx, '距離 y（観測）', (GEO.sensorX + cartX) / 2 + 14, sensorY - 8, { size: 21, color: S.COLOR.obs, weight: 700, alpha: a });
      canvasText(ctx, 'センサー', GEO.sensorX, sensorY + 38, { size: 20, color: S.COLOR.obs, weight: 700, align: 'center', alpha: a });
    },
  });

  // 「山を曲線に通す」図の共通の描き方（6V と 6V-2 で使う）
  const MAIN = { x: 150, y: 170, w: 640, h: 500, xr: [-2.6, 5.6], yr: [1.5, 6] };
  // 距離はセンサーとレールの間隔（2 m）より短くならないので、2 m のすぐ上にヒストグラムの高い棒が立つ。その棒は枠の右端で切って描く
  const SIDE = { x: 830, y: 170, w: 240, h: 500, xr: [0, 0.9], yr: [1.5, 6] };
  const CURVE_P = M.linspace(MAIN.xr[0], MAIN.xr[1], 160);
  const DIST_GRID = M.linspace(1.5, 6, 200);
  const IN_SCALE = 2.6; // 位置の山を、図の下の端に描くときの高さの倍率
  function drawTransformBase(ctx, alpha, { tangent = 0, histogram = 0, linearized = 0 } = {}) {
    const P = new Plot(MAIN);
    const Q = new Plot(SIDE);
    P.axes(ctx, { xticks: [-2, 0, 2, 4], yticks: [2, 3, 4, 5, 6], xlabel: '台車の位置 p（m）', ylabel: 'センサーまでの距離 h(p)（m）', alpha });
    P.line(ctx, CURVE_P, CURVE_P.map(distance), { color: C.text, width: 4, alpha });
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Q.x, Q.y);
    ctx.lineTo(Q.x, Q.y + Q.h);
    ctx.stroke();
    ctx.restore();
    canvasText(ctx, '距離の分布', Q.x, Q.y - 14, { size: 18, color: C.text2, alpha });
    if (tangent > 0) {
      const line = (p) => distance(IN.mean) + distanceSlope(IN.mean) * (p - IN.mean);
      P.line(ctx, [MAIN.xr[0], MAIN.xr[1]], [line(MAIN.xr[0]), line(MAIN.xr[1])], { color: S.COLOR.predict, width: 3, dash: [9, 7], alpha: tangent * alpha });
      P.dots(ctx, [IN.mean], [distance(IN.mean)], { r: 7, color: S.COLOR.predict, alpha: tangent * alpha });
    }
    if (histogram > 0) {
      ctx.save();
      ctx.fillStyle = rgba(S.COLOR.other, 0.75 * histogram * alpha);
      MC_HIST.centers.forEach((c, i) => {
        const top = Q.sy(c + MC_HIST.width / 2);
        ctx.fillRect(Q.x, top + 1, Math.min(Q.w, Q.sx(MC_HIST.density[i]) - Q.x) * histogram, Q.sy(c - MC_HIST.width / 2) - top - 2);
      });
      ctx.restore();
    }
    if (linearized > 0) drawSideBell(ctx, Q, LIN.mean, LIN.variance, S.COLOR.predict, linearized * alpha);
    return { P, Q };
  }
  // 位置の山（図の下の端に、横向きの軸に沿って描く）
  function drawInputBell(ctx, P, alpha) {
    if (alpha <= 0) return;
    const ys = CURVE_P.map((p) => MAIN.yr[0] + IN_SCALE * M.normalPdf(p, IN.mean, IN.variance));
    P.band(ctx, CURVE_P, CURVE_P.map(() => MAIN.yr[0]), ys, { color: S.COLOR.filter, alpha: 0.2 * alpha });
    P.line(ctx, CURVE_P, ys, { color: S.COLOR.filter, width: 3.5, alpha });
  }
  // 距離の分布（右の枠に、縦の軸に沿って描く正規分布）
  function drawSideBell(ctx, Q, mean, variance, color, alpha) {
    const xs = DIST_GRID.map((v) => M.normalPdf(v, mean, variance));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    DIST_GRID.forEach((v, i) => (i === 0 ? ctx.moveTo(Q.sx(xs[i]), Q.sy(v)) : ctx.lineTo(Q.sx(xs[i]), Q.sy(v))));
    ctx.stroke();
    ctx.restore();
  }
  const sideMean = (ctx, Q, value, color, alpha) => Q.hline(ctx, value, { color, alpha, dash: [5, 4], width: 2.5 });

  // ---------------------------------------------------------------- 第6章 図解（山を曲線に通す、線形化）
  add({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '山を曲線に通すと、形が歪む',
    beats: [
      beat('図で見ます。横が台車の位置、縦がセンサーまでの距離です。曲線が、位置と距離の関係です。', '図で見ます。横が台車の位置、縦が、センサーまでの距離です。曲線が、位置と距離の関係です。'),
      beat(`位置の推定が、この青い山だとします。平均 ${IN.mean} メートル、標準偏差 ${fmt(Math.sqrt(IN.variance), 1)} メートルです。`, `位置の推定が、この青い山だとします。平均${IN.mean}メートル、標準偏差${fmt(Math.sqrt(IN.variance), 1)}メートルです。`),
      beat('この山を曲線に通すと、距離の分布は、右の灰色のようになります。左右対称ではない、歪んだ形です。', 'この山を、曲線に通すと、距離の分布は、右の灰色のようになります。左右対称ではない、歪んだ形です。'),
      beat('拡張カルマンフィルターは、山の中心で接線を引き、直線として通します。結果は、紫の正規分布です。', '拡張カルマンフィルターは、山の中心で、接線を引き、直線として通します。結果は、紫の正規分布です。'),
      beat(`曲がりが強いと、ずれが出ます。距離の平均は、本当は ${fmt(MC.mean, 2)} メートルですが、接線では ${fmt(LIN.mean, 2)} メートルになります。`, `曲がりが強いと、ずれが出ます。距離の平均は、本当は${fmt(MC.mean, 2)}メートルですが、接線では、${fmt(LIN.mean, 2)}メートルになります。`),
      beat('それでも、不確かさが小さければ、山の範囲では、曲線はほぼ直線です。多くの問題で、うまく働きます。', 'それでも、不確かさが小さければ、山の範囲では、曲線は、ほぼ直線です。多くの問題で、うまく働きます。'),
    ],
    build(ui) {
      ui.card({ x: 1130, y: 180, w: 400, h: 250, title: '距離の平均と分散', at: 2 });
      ui.table({
        x: 1146, y: 230, widths: [180, 95, 95], aligns: ['left', 'center', 'center'], size: 20, rowH: 56,
        header: ['方法', '平均', '分散'],
        rows: [[`乱数 ${MC_COUNT / 10000} 万個`, fmt(MC.mean, 2), fmt(MC.variance, 2)], ['接線（EKF）', fmt(LIN.mean, 2), fmt(LIN.variance, 2)]],
        rowAt: [2, 3], delay: 0.5,
        glowRows: [null, [{ from: 4, to: 5 }]],
      });
      ui.text('不確かさが小さければ、<br>曲線はほぼ直線', { x: 1130, y: 470, size: 24, weight: 700, color: C.yellow, at: 5, glow: [{ from: 5 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.2);
      const { P, Q } = drawTransformBase(ctx, a0, { tangent: s.p(3, 0.6, 0.3), histogram: s.p(2, 1.4, 0.4), linearized: s.p(3, 0.6, 1.2) });
      drawInputBell(ctx, P, s.p(1, 0.6, 0.3));
      const means = s.p(4, 0.5, 0.3);
      sideMean(ctx, Q, MC.mean, C.text2, means);
      sideMean(ctx, Q, LIN.mean, S.COLOR.predict, means);
      legend(ctx, [{ color: S.COLOR.filter, label: '位置の推定' }, { kind: 'band', color: S.COLOR.other, label: '本当の距離の分布' }, { color: S.COLOR.predict, dash: [8, 6], label: '接線と、その結果' }], P.x, P.y + P.h + 76, { alpha: s.p(1, 0.5) });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（EKF で台車を追う）
  // センサーを 20 m 地点の横に置き、第1回からの台車が前を通り過ぎるあいだ、距離だけを測る
  const SENSOR_AT = 20;
  const RANGE_VAR = 0.25;
  const rangeTo = (p) => Math.sqrt((p - SENSOR_AT) ** 2 + SENSOR_OFFSET ** 2);
  const RANGE_NOISE = M.standardNormals(D.CART.count, 21);
  const RANGE_Y = D.cartSim.position.map((p, i) => rangeTo(p) + Math.sqrt(RANGE_VAR) * RANGE_NOISE[i]);
  const EKF = M.extendedKalmanFilter(RANGE_Y.map((y) => [y]), {
    f: (x) => M.matVec(D.cartModel.F, x),
    jacobianF: () => D.cartModel.F,
    h: (x) => [rangeTo(x[0])],
    jacobianH: (x) => [[(x[0] - SENSOR_AT) / rangeTo(x[0]), 0]],
    Q: D.cartModel.Q,
    R: [[RANGE_VAR]],
    ...D.CART_INIT,
  });
  const EKF_POS = EKF.steps.map((step) => step.x[0]);
  const EKF_VAR = EKF.steps.map((step) => step.P[0][0]);
  const EKF_ERR = M.rmse(EKF_POS, D.cartSim.position);
  const EKF_SD = EKF_VAR.map(Math.sqrt);
  const WIDEST = EKF_SD.indexOf(Math.max(...EKF_SD.slice(5))); // 最初の数回を除いて、帯がいちばん広い時刻
  const USUAL_SD = EKF_SD[EKF_SD.length - 1];
  add({
    id: '6V-B',
    chapter: 6,
    kind: 'visual',
    title: 'EKF で台車を追う',
    beats: [
      beat(`拡張カルマンフィルターを、実際に動かしてみます。センサーを ${SENSOR_AT} メートル地点の横に置き、台車が前を通り過ぎるあいだ、距離だけを測ります。`, `拡張カルマンフィルターを、実際に動かしてみます。センサーを、${SENSOR_AT}メートル地点の横に置き、台車が、前を通り過ぎるあいだ、距離だけを測ります。`),
      beat('上が、測った距離です。台車が近づくと小さくなり、通り過ぎると、また大きくなります。', '上が、測った距離です。台車が近づくと、小さくなり、通り過ぎると、また大きくなります。'),
      beat(`真ん中が、位置の推定です。距離だけの観測から、位置を追えています。本当の位置とのずれは ${fmt(EKF_ERR, 1)} メートルです。`, `真ん中が、位置の推定です。距離だけの観測から、位置を追えています。本当の位置とのずれは、${fmt(EKF_ERR, 1)}メートルです。`),
      beat(`ただし、センサーの真横を通るあたりで、推定の不確かさが増えます。いちばん下が、推定の標準偏差です。ふだんの ${fmt(USUAL_SD, 2)} メートルから、${fmt(EKF_SD[WIDEST], 2)} メートルに増えました。`, `ただし、センサーの真横を通るあたりで、推定の不確かさが増えます。いちばん下が、推定の標準偏差です。ふだんの${fmt(USUAL_SD, 2)}メートルから、${fmt(EKF_SD[WIDEST], 2)}メートルに増えました。`),
      beat('真横では、台車が少し動いても、距離がほとんど変わりません。接線の傾きが小さい所では、観測から得られる情報が少ないのです。', '真横では、台車が少し動いても、距離が、ほとんど変わりません。接線の傾きが小さい所では、観測から得られる情報が、少ないのです。'),
    ],
    build(ui) {
      ui.card({ x: 1140, y: 180, w: 390, h: 290, title: '位置の推定', at: 2 });
      ui.table({
        x: 1156, y: 228, widths: [240, 120], aligns: ['left', 'center'], size: 20, rowH: 56,
        header: ['', 'm'],
        rows: [['本当の位置とのずれ', fmt(EKF_ERR, 2)], ['標準偏差（ふだん）', fmt(USUAL_SD, 2)], ['標準偏差（真横の近く）', fmt(EKF_SD[WIDEST], 2)]],
        rowAt: [2, 3, 3], delay: 0.5,
      });
      ui.text('傾きが小さい所では、<br>観測の情報が少ない', { x: 1140, y: 520, size: 24, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.2);
      const top = new Plot({ x: 120, y: 160, w: 960, h: 130, xr: [0, 40], yr: [0, 24] });
      top.axes(ctx, { xticks: [], yticks: [0, 10, 20], ylabel: '測った距離（m）', alpha: a0 });
      top.dots(ctx, CART_T, RANGE_Y, { r: 5, color: S.COLOR.obs, alpha: s.p(1, 0.5, 0.2) });
      const middle = new Plot({ x: 120, y: 350, w: 960, h: 160, xr: [0, 40], yr: [-4, 46] });
      const a2 = s.p(2, 0.5, 0.2);
      middle.axes(ctx, { xticks: [], yticks: [0, 20, 40], ylabel: '位置（m）', alpha: a0 });
      middle.hline(ctx, SENSOR_AT, { color: S.COLOR.obs, alpha: a0 });
      middle.label(ctx, `センサーの真横（${SENSOR_AT} m）`, 0, SENSOR_AT, { dx: 12, dy: -10, size: 18, color: S.COLOR.obs, weight: 700, alpha: a0 });
      // いちばん下: 位置の推定の標準偏差（帯の幅は小さくて見えにくいので、別の枠で見せる）
      const bottom = new Plot({ x: 120, y: 570, w: 960, h: 100, xr: [0, 40], yr: [0, 0.8] });
      const a3 = s.p(3, 0.5, 0.2);
      bottom.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 0.4, 0.8], fmtY: (v) => fmt(v, 1), xlabel: '時刻 t（秒）', ylabel: '推定の標準偏差（m）', alpha: a0 });
      const near = s.win(3, 5);
      [top, middle, bottom].forEach((P) => P.shade(ctx, CART_T[WIDEST] - 3, CART_T[WIDEST] + 3, { color: C.yellow, alpha: 0.12 * near }));
      middle.line(ctx, CART_T, D.cartSim.position, { color: S.COLOR.truth, width: 2.5, dash: [9, 7], alpha: a2 });
      S.drawBand(ctx, middle, CART_T, EKF_POS, EKF_VAR, { color: S.COLOR.filter, alpha: a2, upto: s.p(2, 2.4, 0.3), bandAlpha: 0.3 });
      bottom.line(ctx, CART_T, EKF_SD, { color: S.COLOR.filter, width: 3.5, alpha: a3, upto: s.p(3, 1.8, 0.3) });
      legend(ctx, [{ kind: 'dot', color: S.COLOR.obs, label: '測った距離' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の位置' }, { color: S.COLOR.filter, label: 'EKF の推定（帯は ±2 標準偏差）' }], top.x, bottom.y + bottom.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（UKF と粒子フィルター）
  add({
    id: '6T-2',
    chapter: 6,
    kind: 'theory',
    title: '線形化より精度を上げる2つの方法',
    beats: [
      beat('線形化より精度を上げる方法が、2つあります。', '線形化より、精度を上げる方法が、ふたつあります。'),
      beat('アンセンテッドカルマンフィルター、UKF は、山を代表する数個の点を選び、その点を関数にそのまま通します。通したあとの点から、平均と分散を計算し直します。', 'アンセンテッド、カルマンフィルター、ユーケーエフは、山を代表する、数個の点を選び、その点を、関数にそのまま通します。通したあとの点から、平均と、ぶんさんを、計算し直します。'),
      beat('傾きを計算しなくてよく、曲がりの影響も取り込めます。', '傾きを計算しなくてよく、曲がりの影響も、取り込めます。'),
      beat('粒子フィルターは、分布を、たくさんの粒で表します。粒を1つずつ動かし、観測に合う粒ほど重くして、選び直します。', '粒子フィルターは、分布を、たくさんの粒で表します。粒を、ひとつずつ動かし、観測に合う粒ほど重くして、選び直します。'),
      beat('山が2つある分布でも扱えますが、計算は重くなります。まず EKF か UKF を試し、足りなければ粒子フィルター、という順がふつうです。', '山が、ふたつある分布でも扱えますが、計算は重くなります。まず、イーケーエフか、ユーケーエフを試し、足りなければ、粒子フィルター、という順が、ふつうです。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 400 });
      ui.table({
        x: LEFT_X + 20, y: 146, widths: [350, 440, 300, 290], aligns: ['left', 'left', 'left', 'left'], size: 22, rowH: 88,
        header: ['方法', '考え方', '分布の表し方', '計算の重さ'],
        rows: [
          ['拡張カルマンフィルター（EKF）', '接線で置きかえる', '平均と分散', '軽い'],
          ['アンセンテッド KF（UKF）', '代表の点を関数に通す', '平均と分散', '軽い（EKF と同じ程度）'],
          ['粒子フィルター', 'たくさんの粒に重みをつけて選び直す', '粒の集まり（形は自由）', '重い（粒の数に比例）'],
        ],
        rowAt: [0, 1, 3], delay: 0.3,
        glowRows: [null, [{ from: 1, to: 3 }], [{ from: 3, to: 4 }]],
      });
      keyPoint(ui, 'まず EKF か UKF。足りなければ粒子フィルター', 610, 4);
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（シグマ点）
  add({
    id: '6V-2',
    chapter: 6,
    kind: 'visual',
    title: 'UKF：3つの点を通す',
    beats: [
      beat('同じ例で、UKF の考え方を見ます。山の中心と、その左右に1つずつ、3つの点を選びます。', '同じ例で、ユーケーエフの考え方を見ます。山の中心と、その左右に、ひとつずつ、みっつの点を選びます。'),
      beat('3つの点を、曲線にそのまま通します。', 'みっつの点を、曲線に、そのまま通します。'),
      beat('通したあとの3つの点から、重みつきで、平均と分散を計算します。緑が、その結果です。', '通したあとの、みっつの点から、おもみつきで、平均と、ぶんさんを計算します。緑が、その結果です。'),
      beat(`距離の平均は ${fmt(SIG.mean, 2)} メートル。たくさんの乱数で求めた ${fmt(MC.mean, 2)} メートルに、接線の ${fmt(LIN.mean, 2)} メートルより近くなりました。`, `距離の平均は、${fmt(SIG.mean, 2)}メートル。たくさんの乱数で求めた、${fmt(MC.mean, 2)}メートルに、接線の${fmt(LIN.mean, 2)}メートルより、近くなりました。`),
      beat('3つの点を通すだけで、曲がりの影響を取り込めます。', 'みっつの点を通すだけで、曲がりの影響を、取り込めます。'),
    ],
    build(ui) {
      ui.card({ x: 1130, y: 180, w: 400, h: 310, title: '距離の平均と分散', at: 2 });
      ui.table({
        x: 1146, y: 230, widths: [180, 95, 95], aligns: ['left', 'center', 'center'], size: 20, rowH: 56,
        header: ['方法', '平均', '分散'],
        rows: [[`乱数 ${MC_COUNT / 10000} 万個`, fmt(MC.mean, 2), fmt(MC.variance, 2)], ['接線（EKF）', fmt(LIN.mean, 2), fmt(LIN.variance, 2)], ['3つの点（UKF）', fmt(SIG.mean, 2), fmt(SIG.variance, 2)]],
        at: 2, rowAt: [2, 2, 2], delay: 0.6,
        glowRows: [null, null, [{ from: 3 }]],
      });
      ui.text(`点の重み：中心 ${fmt(SIG.weights[0], 2)}、左右 ${fmt(SIG.weights[1], 2)} ずつ`, { x: 1130, y: 510, size: 19, color: C.muted, at: 2, delay: 0.9 });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.2);
      const { P, Q } = drawTransformBase(ctx, a0, { histogram: 1 });
      drawInputBell(ctx, P, a0);
      const through = s.p(1, 1.4, 0.3);
      SIG.points.forEach((p, i) => {
        const pointAlpha = s.p(0, 0.5, 0.8 + 0.3 * i);
        P.dots(ctx, [p], [MAIN.yr[0]], { r: 9, color: S.COLOR.smooth, alpha: pointAlpha });
        // 点から曲線へ上がり、右の枠へ進む線
        const up = Math.min(1, through * 2);
        const across = Math.max(0, through * 2 - 1);
        S.arrow(ctx, P.sx(p), P.sy(MAIN.yr[0]) - 10, P.sx(p), P.sy(SIG.mapped[i]), { color: S.COLOR.smooth, width: 2.5, alpha: pointAlpha, upto: up, head: 10, dash: [5, 4] });
        S.arrow(ctx, P.sx(p), P.sy(SIG.mapped[i]), Q.x - 4, Q.sy(SIG.mapped[i]), { color: S.COLOR.smooth, width: 2.5, alpha: pointAlpha, upto: across, head: 10, dash: [5, 4] });
        if (across >= 1) Q.dots(ctx, [0], [SIG.mapped[i]], { r: 9, color: S.COLOR.smooth });
      });
      const result = s.p(2, 0.6, 0.4);
      if (result > 0) drawSideBell(ctx, Q, SIG.mean, SIG.variance, S.COLOR.smooth, result);
      const compare = s.p(3, 0.5, 0.3);
      if (compare > 0) drawSideBell(ctx, Q, LIN.mean, LIN.variance, S.COLOR.predict, 0.7 * compare);
      sideMean(ctx, Q, SIG.mean, S.COLOR.smooth, compare);
      sideMean(ctx, Q, LIN.mean, S.COLOR.predict, compare);
      const items = [{ kind: 'dot', color: S.COLOR.smooth, label: '代表の3つの点' }, { kind: 'band', color: S.COLOR.other, label: '本当の距離の分布' }];
      if (result > 0) items.push({ color: S.COLOR.smooth, label: 'UKF の結果' });
      if (compare > 0) items.push({ color: S.COLOR.predict, label: '接線の結果' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（粒子フィルターが要る例）
  const PRIOR = { mean: 0, variance: 9 };
  const OBSERVED = 3.6;
  const OBS_VAR = 0.09;
  const PARTICLE_COUNT = 500;
  const PARTICLES = M.standardNormals(PARTICLE_COUNT, 9).map((z) => PRIOR.mean + Math.sqrt(PRIOR.variance) * z);
  const UPDATE = M.particleUpdate(PARTICLES, (p) => M.normalPdf(OBSERVED, distance(p), OBS_VAR), 3);
  const TRUE_ABS = Math.sqrt(OBSERVED * OBSERVED - SENSOR_OFFSET * SENSOR_OFFSET);
  const RIGHT_COUNT = UPDATE.resampled.filter((p) => p > 0).length;
  const PRIOR_HIST = M.histogram(PARTICLES, -8, 8, 40);
  const POST_HIST = M.histogram(UPDATE.resampled, -8, 8, 40);
  // 拡張カルマンフィルターの1回の更新（0 のまわりで線形化する）
  const EKF_H = distanceSlope(PRIOR.mean);
  const EKF_GAIN = (PRIOR.variance * EKF_H) / (EKF_H * PRIOR.variance * EKF_H + OBS_VAR);
  add({
    id: '6V-3',
    chapter: 6,
    kind: 'visual',
    title: '山が2つになる例',
    beats: [
      beat('粒子フィルターが要る例です。台車が、センサーの右にいるのか左にいるのか、分かりません。位置の推定は、0 を中心に広がっています。', '粒子フィルターが要る例です。台車が、センサーの右にいるのか、左にいるのか、分かりません。位置の推定は、ゼロを中心に、広がっています。'),
      beat(`距離が ${OBSERVED} メートルと観測されました。この距離になる位置は、右に ${fmt(TRUE_ABS, 0)} メートルと、左に ${fmt(TRUE_ABS, 0)} メートルの、2か所です。`, `距離が、${OBSERVED}メートルと観測されました。この距離になる位置は、右に${fmt(TRUE_ABS, 0)}メートルと、左に${fmt(TRUE_ABS, 0)}メートルの、2か所です。`),
      beat(`粒子フィルターは、${PARTICLE_COUNT} 個の粒のうち、観測に合う粒を重くして、選び直します。粒は、2つの山に集まりました。`, `粒子フィルターは、${PARTICLE_COUNT}個の粒のうち、観測に合う粒を重くして、選び直します。粒は、ふたつの山に集まりました。`),
      beat(R`拡張カルマンフィルターでは、0 での接線の傾きが 0 になります。ゲインも 0 で、観測がまったく使えません。`, '拡張カルマンフィルターでは、ゼロでの接線の傾きが、ゼロになります。ゲインもゼロで、観測が、まったく使えません。'),
      beat('1つの山しか表せない方法では、こういう問題は扱えません。分布の形が大事なときに、粒子フィルターを使います。', 'ひとつの山しか表せない方法では、こういう問題は扱えません。分布の形が大事なときに、粒子フィルターを使います。'),
    ],
    build(ui) {
      ui.text(`観測：距離 ${OBSERVED} m → 位置は ＋${fmt(TRUE_ABS, 0)} m か −${fmt(TRUE_ABS, 0)} m`, { x: 1100, y: 190, w: 430, size: 23, weight: 700, at: 1 });
      ui.text(`選び直した粒 ${PARTICLE_COUNT} 個のうち、<br>右の山 ${RIGHT_COUNT} 個、左の山 ${PARTICLE_COUNT - RIGHT_COUNT} 個`, { x: 1100, y: 300, size: 21, color: C.text2, at: 2, delay: 1.0 });
      ui.text(R`EKF：0 での傾き $H = ${texNum(EKF_H, 0)}$<br>→ ゲイン $K = ${texNum(EKF_GAIN, 0)}$（推定が動かない）`, { x: 1100, y: 420, size: 21, color: S.COLOR.predict, at: 3, delay: 0.4 });
      ui.text('分布の形が大事なら、粒子フィルター', { x: 1100, y: 560, size: 24, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const top = new Plot({ x: 130, y: 180, w: 900, h: 210, xr: [-8, 8], yr: [0, 0.22] });
      const bottom = new Plot({ x: 130, y: 460, w: 900, h: 210, xr: [-8, 8], yr: [0, 0.75] });
      const a0 = s.p(0, 0.5, 0.2);
      const bars = (P, hist, color, alpha, grow = 1) => {
        if (alpha <= 0) return;
        ctx.save();
        P.clip(ctx);
        ctx.fillStyle = rgba(color, 0.45 * alpha);
        hist.centers.forEach((c, i) => {
          const y = P.sy(hist.density[i] * grow);
          ctx.fillRect(P.sx(c - hist.width / 2) + 1, y, P.sx(c + hist.width / 2) - P.sx(c - hist.width / 2) - 2, P.sy(0) - y);
        });
        ctx.restore();
      };
      top.axes(ctx, { xticks: [-6, -3, 0, 3, 6], yticks: [], alpha: a0 });
      bars(top, PRIOR_HIST, S.COLOR.filter, a0);
      S.drawBell(ctx, top, PRIOR.mean, PRIOR.variance, { color: S.COLOR.filter, alpha: a0, fill: 0 });
      canvasText(ctx, `観測の前：位置の推定（粒 ${PARTICLE_COUNT} 個）`, top.x, top.y - 14, { size: 20, color: C.text, weight: 700, alpha: a0 });
      const marks = s.p(1, 0.6, 0.4);
      [-TRUE_ABS, TRUE_ABS].forEach((v) => {
        top.vline(ctx, v, { color: S.COLOR.obs, alpha: marks, width: 2.5 });
        bottom.vline(ctx, v, { color: S.COLOR.obs, alpha: marks * s.p(2, 0.5), width: 2.5 });
      });
      const after = s.p(2, 0.6, 0.3);
      bottom.axes(ctx, { xticks: [-6, -3, 0, 3, 6], yticks: [], xlabel: '台車の位置 p（m）', alpha: after });
      bars(bottom, POST_HIST, S.COLOR.smooth, after, s.p(2, 1.4, 0.5));
      canvasText(ctx, '観測のあと：選び直した粒', bottom.x, bottom.y - 14, { size: 20, color: C.text, weight: 700, alpha: after });
      const ekf = s.p(3, 0.6, 0.4);
      S.drawBell(ctx, bottom, PRIOR.mean, PRIOR.variance, { color: S.COLOR.predict, alpha: ekf, fill: 0, dash: [9, 7] });
      canvasText(ctx, 'EKF：観測の前のまま', bottom.sx(0), bottom.sy(0.2), { size: 20, color: S.COLOR.predict, weight: 700, align: 'center', alpha: ekf });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（実務での手順）
  const STEPS = [
    ['状態を決める', '知りたい量と、その変化を説明するのに必要な量'],
    [R`$F$ と $H$ を書く`, '状態がどう進み、どう見えるか'],
    [R`$Q$ と $R$ を決める`, R`センサーの仕様から $R$、残りは尤度で推定`],
    ['最初の推定と分散を決める', '自信がなければ、分散を大きく'],
    ['イノベーションで確かめる', '合わなければ、モデルに戻る'],
  ];
  add({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: CHAPTERS[6],
    beats: [
      beat('最後に、実務での手順をまとめます。', '最後に、実務での手順を、まとめます。'),
      beat('1つめ。何を状態にするかを決めます。知りたい量と、その変化を説明するのに必要な量です。', 'ひとつめ。何を状態にするかを、決めます。知りたい量と、その変化を説明するのに、必要な量です。'),
      beat(R`2つめ。$F$ と $H$ を書きます。状態がどう進み、どう見えるかです。`, 'ふたつめ。エフとエイチを書きます。状態が、どう進み、どう見えるかです。'),
      beat(R`3つめ。$Q$ と $R$ を決めます。センサーの仕様が分かれば $R$ に使い、残りは尤度で推定します。`, 'みっつめ。キューとアールを決めます。センサーの仕様が分かれば、アールに使い、残りは、ゆうどで推定します。'),
      beat('4つめ。最初の推定と、その分散を決めます。自信がなければ、分散を大きくします。', 'よっつめ。最初の推定と、そのぶんさんを決めます。自信がなければ、ぶんさんを大きくします。'),
      beat('5つめ。イノベーションで確かめます。合わなければ、モデルに戻って直します。', 'いつつめ。イノベーションで確かめます。合わなければ、モデルに戻って、直します。'),
    ],
    build(ui) {
      STEPS.forEach(([head, body], i) => {
        const at = i + 1;
        ui.card({ x: LEFT_X, y: 130 + i * 112, w: 1180, h: 96, at, glow: [{ from: at, to: at + 1 }] });
        ui.text(`<span class="toc-num">${at}</span><b>${head}</b>`, { x: LEFT_X + 28, y: 158 + i * 112, size: 27, at });
        ui.text(body, { x: LEFT_X + 520, y: 162 + i * 112, size: 22, color: C.text2, at, delay: 0.3 });
      });
    },
    draw(ctx, s) {
      // 5 → 1 へ戻る矢印（合わなければ、やり直す）
      const back = s.p(5, 0.8, 0.6);
      if (back <= 0) return;
      const x = 1380;
      ctx.save();
      ctx.globalAlpha = back;
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(1280, 130 + 4 * 112 + 48);
      ctx.lineTo(x, 130 + 4 * 112 + 48);
      ctx.lineTo(x, 130 + 48);
      ctx.lineTo(1300, 130 + 48);
      ctx.stroke();
      ctx.restore();
      S.arrow(ctx, 1310, 130 + 48, 1280, 130 + 48, { color: C.yellow, width: 4, alpha: back, head: 16 });
      canvasText(ctx, '合わなければ', x + 16, 380, { size: 20, color: C.yellow, weight: 700, alpha: back });
      canvasText(ctx, '戻る', x + 16, 410, { size: 20, color: C.yellow, weight: 700, alpha: back });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（外れ値）
  const OUTLIERS = [{ t: 30, shift: 6 }, { t: 70, shift: -7 }];
  const DIRTY = TEMP_Y.map((y, i) => y + (OUTLIERS.find((o) => o.t === i + 1)?.shift ?? 0));
  const PLAIN = window.EP3.run(D.TEMP.q, D.TEMP.r, DIRTY);
  // そろえたイノベーションの大きさが threshold を超えた観測を、欠測として扱うフィルター
  const GATE = 3;
  function gatedFilter(ys, threshold) {
    const mean = [];
    const variance = [];
    const skipped = [];
    let m = D.TEMP_INIT.m0;
    let p = D.TEMP_INIT.p0;
    ys.forEach((y, i) => {
      const pPred = p + D.TEMP.q;
      const innovationVar = pPred + D.TEMP.r;
      const e = y - m;
      if (Math.abs(e) / Math.sqrt(innovationVar) > threshold) {
        p = pPred;
        skipped.push(i + 1);
      } else {
        const k = pPred / innovationVar;
        m += k * e;
        p = (1 - k) * pPred;
      }
      mean.push(m);
      variance.push(p);
    });
    return { mean, variance, skipped };
  }
  const GATED = gatedFilter(DIRTY, GATE);
  const PULL = Math.max(...OUTLIERS.map((o) => Math.abs(PLAIN.mean[o.t - 1] - F1.mean[o.t - 1])));
  add({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '外れ値に引っぱられないようにする',
    beats: [
      beat('注意点を1つ、図で見ておきます。外れ値です。温度のデータの2か所に、大きく外れた観測を入れました。', '注意点を、ひとつ、図で見ておきます。外れ値です。温度のデータの、2か所に、大きく外れた観測を入れました。'),
      beat(`そのままフィルターをかけると、推定は外れ値に引っぱられます。最大で ${fmt(PULL, 1)} 度ずれました。`, `そのままフィルターをかけると、推定は、外れ値に引っぱられます。最大で、${fmt(PULL, 1)}度ずれました。`),
      beat(`対策の1つは、そろえたイノベーションが ${GATE} を超えた観測を、使わないことです。欠測と同じ扱いにします。`, `対策のひとつは、そろえたイノベーションが、${GATE}を超えた観測を、使わないことです。けっそくと、同じ扱いにします。`),
      beat(`${GATED.skipped.length} つの外れ値だけが除かれ、推定は引っぱられなくなりました。`, `${GATED.skipped.length === 2 ? 'ふたつ' : GATED.skipped.length + '個'}の外れ値だけが除かれ、推定は、引っぱられなくなりました。`),
      beat('ただし、状態が本当に急に変わったときも、捨ててしまいます。外れ値なのか、本当の変化なのかは、対象の知識で判断します。', 'ただし、状態が、本当に急に変わったときも、捨ててしまいます。外れ値なのか、本当の変化なのかは、対象の知識で判断します。'),
    ],
    build(ui) {
      ui.text('外れ値か、本当の変化かは、対象の知識で判断する', { x: 760, y: 196, size: 24, weight: 700, color: C.yellow, at: 4, glow: [{ from: 4 }] });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 1380, h: 500, xr: [0, 100], yr: [11.5, 28.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [12, 16, 20, 24, 28], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.dots(ctx, T, DIRTY, { r: 4.5, color: S.COLOR.obs, alpha: 0.7 * a0 });
      const removed = s.p(3, 0.5, 0.3);
      OUTLIERS.forEach((o) => {
        P.dots(ctx, [o.t], [DIRTY[o.t - 1]], { r: 10, color: C.red, alpha: a0 });
        P.label(ctx, removed > 0.5 ? '使わない' : '外れ値', o.t, DIRTY[o.t - 1], { dx: 16, dy: 7, size: 21, color: C.red, weight: 700, alpha: a0 });
      });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: a0 });
      const gated = s.p(3, 0.5, 0.2);
      P.line(ctx, T, PLAIN.mean, { color: S.COLOR.predict, width: 4, alpha: s.p(1, 0.4, 0.2) * (1 - 0.6 * gated), upto: s.p(1, 2.4, 0.3) });
      P.line(ctx, T, GATED.mean, { color: S.COLOR.filter, width: 4, alpha: gated, upto: s.p(3, 2.4, 0.3) });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' }];
      if (s.u >= s.bt(1)) items.push({ color: S.COLOR.predict, label: 'そのままのフィルター' });
      if (s.u >= s.bt(3)) items.push({ color: S.COLOR.filter, label: `そろえたイノベーションが ${GATE} を超えた観測を使わない` });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（注意点とツール）
  add({
    id: '7T-2',
    chapter: 7,
    kind: 'theory',
    title: 'そのほかの注意点と、ツール',
    beats: [
      beat('ほかの注意点です。観測から決まらない状態は、推定できません。たとえば、速度だけを測っても、最初の位置は分かりません。', 'ほかの注意点です。観測から決まらない状態は、推定できません。たとえば、速度だけを測っても、最初の位置は、分かりません。'),
      beat('計算の誤差がたまって、共分散行列が、対称でなくなったり、分散が負になったりすることがあります。数値的に安定した実装を選びます。', '計算の誤差がたまって、きょうぶんさんぎょうれつが、対称でなくなったり、ぶんさんが、マイナスになったりすることがあります。数値的に、安定した実装を選びます。'),
      beat('モデルが実際と違うと、推定は偏ります。これは、イノベーションで気づけます。', 'モデルが、実際と違うと、推定は偏ります。これは、イノベーションで気づけます。'),
      beat('ツールです。MATLAB、Python、R に、カルマンフィルター、平滑化、最尤推定の関数があります。', 'ツールです。マトラボ、パイソン、アールに、カルマンフィルター、へいかつか、さいゆう推定の関数があります。'),
      beat('式を自分で書いても、数十行です。まず小さな例で、手を動かしてみることをおすすめします。', '式を自分で書いても、数十行です。まず小さな例で、手を動かしてみることを、おすすめします。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 280, title: '注意点' });
      ui.table({
        x: LEFT_X + 20, y: 112, widths: [400, 980], aligns: ['left', 'left'], size: 22, rowH: 68,
        header: ['注意点', '内容'],
        rows: [
          ['観測から決まらない状態', '推定できない（例：速度だけを測っても、最初の位置は分からない）'],
          ['計算の誤差', '共分散行列の対称性が崩れる、分散が負になる → 数値的に安定した実装を選ぶ'],
          ['モデルの誤り', '推定が偏る → イノベーションで気づける'],
        ],
        rowAt: [0, 1, 2], delay: 0.3,
        glowRows: [[{ from: 0, to: 1 }], [{ from: 1, to: 2 }], [{ from: 2, to: 3 }]],
      }).header.node.style.display = 'none';
      ui.card({ x: LEFT_X, y: 440, w: 1420, h: 230, title: 'ツールの例', at: 3 });
      ui.table({
        x: LEFT_X + 20, y: 430, widths: [200, 1180], aligns: ['left', 'left'], size: 21, rowH: 56,
        header: ['', ''],
        rows: [
          ['MATLAB', 'kalman、ssm（estimate・filter・smooth）、extendedKalmanFilter、unscentedKalmanFilter、particleFilter'],
          ['Python', 'statsmodels（statespace）、FilterPy'],
          ['R', 'KFAS、dlm'],
        ],
        at: 3, rowDelay: 0.3, delay: 0.3,
      }).header.node.style.display = 'none';
    },
  });

  // ---------------------------------------------------------------- 記号のまとめ
  add({
    id: 'G',
    chapter: 7.5,
    chapterLabel: '',
    kind: 'summary',
    title: '記号のまとめ',
    beats: [
      beat('最後に、このシリーズで使った記号をまとめておきます。', '最後に、このシリーズで使った記号を、まとめておきます。'),
      beat(R`モデルを決めるのは、$F$、$H$、$Q$、$R$ の4つです。状態の進み方、見え方、そして2つのノイズの大きさでした。`, 'モデルを決めるのは、エフ、エイチ、キュー、アールの、よっつです。状態の進みかた、見えかた、そして、ふたつのノイズの大きさでした。'),
      beat(R`フィルターが計算するのは、推定値 $\hat{x}$ と、その共分散 $P$、そして、混ぜ具合を決めるカルマンゲイン $K$ です。`, 'フィルターが計算するのは、推定値、エックスハットと、そのきょうぶんさん、ピー。そして、混ぜ具合を決める、カルマンゲイン、ケーです。'),
      beat(R`確かめるときに使うのは、イノベーション $e$ と、その分散 $S$ です。`, '確かめるときに使うのは、イノベーション、イーと、そのぶんさん、エスです。'),
    ],
    build(ui) {
      const groups = [
        { title: 'モデルを決める（使う人が決める）', at: 1, y: 130, rows: [[R`$F$`, '状態の進み方'], [R`$H$`, '状態の見え方（観測の作られ方）'], [R`$Q$`, 'システムノイズの分散（状態の動きやすさ）'], [R`$R$`, '観測ノイズの分散（測定の粗さ）']] },
        { title: 'フィルターが計算する', at: 2, y: 130, x: 800, rows: [[R`$\hat{x}_t$`, '状態の推定値'], [R`$P_t$`, '推定の分散（共分散行列）'], [R`$K_t$`, 'カルマンゲイン（観測を信じる割合）']] },
        { title: '確かめるときに使う', at: 3, y: 440, x: 800, rows: [[R`$e_t$`, 'イノベーション（観測 − 予測）'], [R`$S_t$`, 'イノベーションの分散']] },
      ];
      groups.forEach((g) => {
        const x = g.x ?? LEFT_X;
        ui.card({ x, y: g.y, w: 690, h: 76 + g.rows.length * 62, title: g.title, at: g.at, glow: [{ from: g.at, to: g.at + 1 }] });
        g.rows.forEach(([symbol, meaning], i) => {
          ui.text(symbol, { x: x + 36, y: g.y + 62 + i * 62, size: 30, at: g.at, delay: 0.3 + 0.3 * i });
          ui.text(meaning, { x: x + 130, y: g.y + 68 + i * 62, size: 22, color: C.text2, at: g.at, delay: 0.3 + 0.3 * i });
        });
      });
      ui.text(R`$x_t$：状態（見えない）　$y_t$：観測（見える）`, { x: LEFT_X + 10, y: 480, size: 25 });
    },
  });

  // ---------------------------------------------------------------- まとめ・参考文献
  SK.summaryScene({
    chapter: 8,
    title: 'シリーズ全体のまとめ',
    items: [
      ['状態空間モデル（第1回）', '見えない状態と、ノイズの乗った観測を、2本の式で表す'],
      ['カルマンフィルター（第2回）', '予測で不確かさが増え、更新で減る。混ぜ具合はカルマンゲイン'],
      ['確かめる・決める', R`イノベーションで確かめ、尤度で $Q$・$R$ を決める`],
      ['欠測・予測・平滑化', '更新を飛ばせば欠測と予測。うしろから直せば平滑化'],
      ['非線形への拡張', 'EKF（接線）、UKF（代表の点）、粒子フィルター（粒）'],
    ],
    closing: '小さな例で、まず手を動かしてみましょう',
    beats: [
      beat('シリーズ全体のまとめです。状態空間モデルは、見えない状態と、ノイズの乗った観測を、2本の式で表します。', 'シリーズ全体の、まとめです。状態空間モデルは、見えない状態と、ノイズの乗った観測を、にほんの式で表します。'),
      beat('カルマンフィルターは、予測と更新の繰り返しです。混ぜ具合は、カルマンゲインが決めます。', 'カルマンフィルターは、予測と更新の繰り返しです。混ぜ具合は、カルマンゲインが決めます。'),
      beat(R`設定は、イノベーションで確かめ、尤度で $Q$ と $R$ を決めます。`, '設定は、イノベーションで確かめ、ゆうどで、キューとアールを決めます。'),
      beat('更新を飛ばせば、欠測と予測に対応できます。うしろから直せば、平滑化です。', '更新を飛ばせば、けっそくと予測に、対応できます。うしろから直せば、へいかつかです。'),
      beat('非線形の問題には、拡張カルマンフィルター、UKF、粒子フィルターがあります。', '非線形の問題には、拡張カルマンフィルター、ユーケーエフ、粒子フィルターがあります。'),
      beat('ここまでの内容で、基本的な使い方はひととおりです。小さな例で、まず手を動かしてみてください。', 'ここまでの内容で、基本的な使いかたは、ひととおりです。小さな例で、まず、手を動かしてみてください。'),
    ],
  });

  SK.endScene({
    chapter: 9,
    references: [
      'H. E. Rauch, F. Tung, C. T. Striebel, "Maximum Likelihood Estimates of Linear Dynamic Systems", <i>AIAA Journal</i>, 3(8), 1445–1450, 1965',
      'S. J. Julier, J. K. Uhlmann, "Unscented Filtering and Nonlinear Estimation", <i>Proceedings of the IEEE</i>, 92(3), 401–422, 2004',
      'N. J. Gordon, D. J. Salmond, A. F. M. Smith, "Novel Approach to Nonlinear/Non-Gaussian Bayesian State Estimation", <i>IEE Proceedings F</i>, 140(2), 107–113, 1993',
      'J. Durbin, S. J. Koopman, <i>Time Series Analysis by State Space Methods</i>, 2nd ed., Oxford University Press, 2012',
      'S. Särkkä, <i>Bayesian Filtering and Smoothing</i>, Cambridge University Press, 2013',
    ],
    beats: [
      beat('参考文献です。これで、状態空間モデルとカルマンフィルターのシリーズは終わりです。', '参考文献です。これで、状態空間モデルと、カルマンフィルターのシリーズは、終わりです。', 8),
    ],
  });
})();
