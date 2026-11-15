// ep1-scenes-b.js — 第1回「状態空間モデル入門」の後半: 第4〜7章（Q と R、行列で書く、いろいろなモデル、3つの問題）、まとめ、参考文献。
(() => {
  const { C, CHAPTERS, Plot, fmt, canvasText, keyframes, clamp, legend, lerp } = KIT;
  const M = SSM;
  const D = SSMDATA;
  const S = SDRAW;
  const { beat, add, LEFT_X, CARD_X, CARD_W, eq, note, keyPoint } = SK;
  const R = String.raw;

  const T = D.tempTimes;
  const TEMP_X = D.tempSim.x;
  const TEMP_Y = D.tempSim.y;
  const TEMP_XTICKS = [0, 20, 40, 60, 80, 100];

  // ---------------------------------------------------------------- 第4章 図解（Q と R を変える）
  // 同じ乱数（温度の例の w と v）の大きさだけを変えて、データを作り直す
  const Q_SCALE = 16;
  const R_SCALE = 1 / 16;
  const variant = (qScale, rScale) => {
    let x = D.TEMP.x0;
    const xs = D.tempSim.w.map((w) => (x += Math.sqrt(qScale) * w));
    return { x: xs, y: xs.map((v, i) => v + Math.sqrt(rScale) * D.tempSim.v[i]) };
  };
  const VARIANTS = [
    { ...variant(1, 1), q: D.TEMP.q, r: D.TEMP.r, name: 'これまでの例' },
    { ...variant(Q_SCALE, 1), q: D.TEMP.q * Q_SCALE, r: D.TEMP.r, name: 'Q を 16 倍' },
    { ...variant(1, R_SCALE), q: D.TEMP.q, r: D.TEMP.r * R_SCALE, name: 'R を 1/16' },
  ];
  add({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: CHAPTERS[3],
    beats: [
      beat(R`2つのノイズの大きさで、データの見た目が変わります。上は、これまでの例です。$Q$ が ${VARIANTS[0].q}、$R$ が ${VARIANTS[0].r} です。`, `ふたつのノイズの大きさで、データの見た目が変わります。上は、これまでの例です。キューが${VARIANTS[0].q}、アールが${VARIANTS[0].r}です。`),
      beat(R`真ん中は、$Q$ を 16 倍にしました。状態そのものが、大きく動きます。`, '真ん中は、キューを16倍にしました。状態そのものが、大きく動きます。'),
      beat(R`下は、$Q$ を戻して、$R$ を 16 分の 1 にしました。観測が、状態にぴったり付きます。`, '下は、キューを戻して、アールを、16分の1にしました。観測が、状態に、ぴったり付きます。'),
      beat(R`3つとも、同じ乱数から作っています。違うのは、$Q$ と $R$ だけです。`, 'みっつとも、同じ乱数から作っています。違うのは、キューとアールだけです。'),
      beat('上のように、観測のばらつきが状態の動きより大きいときほど、状態の推定は難しくなり、モデルを使う効果が大きくなります。', '上のように、観測のばらつきが、状態の動きより大きいときほど、状態の推定は難しくなり、モデルを使う効果が、大きくなります。'),
    ],
    build(ui) {
      VARIANTS.forEach((v, i) => {
        ui.text(v.name, { x: 1180, y: 170 + i * 195, size: 25, weight: 700, at: i });
        ui.text(R`$Q = ${v.q}$<br>$R = ${v.r}$`, { x: 1180, y: 212 + i * 195, size: 23, color: C.text2, at: i, delay: 0.3 });
      });
    },
    draw(ctx, s) {
      VARIANTS.forEach((v, i) => {
        const a = s.p(i, 0.6, 0.2);
        if (a <= 0) return;
        const P = new Plot({ x: 120, y: 150 + i * 195, w: 1000, h: 150, xr: [0, 100], yr: [12, 28] });
        const dim = i === 0 ? 1 : 1 - 0.5 * s.p(4, 0.6, 0.3);
        ctx.save();
        ctx.globalAlpha = a * dim;
        P.axes(ctx, { xticks: i === 2 ? TEMP_XTICKS : [], yticks: [15, 20, 25], xlabel: i === 2 ? '時刻 t（分）' : undefined });
        P.dots(ctx, T, v.y, { r: 4, color: S.COLOR.obs, alpha: 0.85 });
        P.line(ctx, T, v.x, { color: S.COLOR.truth, width: 3, upto: s.p(i, 1.6, 0.4) });
        ctx.restore();
      });
      legend(ctx, [{ color: S.COLOR.truth, label: '状態' }, { kind: 'dot', color: S.COLOR.obs, label: '観測' }], 120, 746, { alpha: s.p(0, 0.5) });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論（2つのノイズの役割）
  add({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '2つのノイズの役割',
    beats: [
      beat('2つのノイズを整理します。システムノイズは、状態そのものを動かします。動いたぶんは、次の時刻にも引き継がれます。', 'ふたつのノイズを整理します。システムノイズは、状態そのものを動かします。動いたぶんは、次の時刻にも引き継がれます。'),
      beat('観測ノイズは、その時刻の観測だけをずらします。次の時刻には残りません。', '観測ノイズは、その時刻の観測だけをずらします。次の時刻には残りません。'),
      beat(R`推定で大事なのは、2つの比です。$Q$ が $R$ に比べて大きいなら、観測の変化は「状態が本当に動いた」と考えます。`, '推定で大事なのは、ふたつの比率です。キューが、アールに比べて大きいなら、観測の変化は、状態が本当に動いた、と考えます。'),
      beat(R`逆に、$Q$ が $R$ に比べて小さいなら、観測の変化の多くは誤差だと考えて、ならして見ます。`, '逆に、キューが、アールに比べて小さいなら、観測の変化の多くは、誤差だと考えて、ならして見ます。'),
      beat(R`$Q$ と $R$ は、モデルを使う人が決める値です。センサーの仕様から決めたり、データから推定したりします。データから決める方法は、第3回で扱います。`, 'キューとアールは、モデルを使う人が決めるあたいです。センサーの仕様から決めたり、データから推定したりします。データから決める方法は、第3回で扱います。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 230 });
      ui.table({
        x: LEFT_X + 20, y: 146, widths: [250, 130, 520, 480], aligns: ['left', 'center', 'left', 'left'], size: 23, rowH: 62,
        header: ['ノイズ', '分散', '何をするか', '次の時刻には'],
        rows: [
          [R`システムノイズ $w_t$`, R`$Q$`, '状態そのものを動かす', '引き継がれる（状態が変わったまま）'],
          [R`観測ノイズ $v_t$`, R`$R$`, 'その時刻の観測だけをずらす', '残らない'],
        ],
        rowAt: [0, 1], delay: 0.3,
        glowRows: [[{ from: 0, to: 1 }], [{ from: 1, to: 2 }]],
      });
      ui.text(R`<b>$Q$ が大きい</b>（$R$ に比べて）`, { x: LEFT_X + 20, y: 410, size: 26, at: 2 });
      ui.text('→ 観測の変化は「状態が動いた」とみる。観測をよく信じる', { x: LEFT_X + 380, y: 412, size: 24, color: C.text2, at: 2, delay: 0.4 });
      ui.text(R`<b>$Q$ が小さい</b>（$R$ に比べて）`, { x: LEFT_X + 20, y: 486, size: 26, at: 3 });
      ui.text('→ 観測の変化は「誤差」とみる。ならして見る', { x: LEFT_X + 380, y: 488, size: 24, color: C.text2, at: 3, delay: 0.4 });
      keyPoint(ui, R`推定の性格は、$Q$ と $R$ の比で決まる（決め方は第3回）`, 600, 4);
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（Q の見立てで推定が変わる）
  const GUESS_SCALE = 16;
  const GUESSES = [
    { name: `Q を ${GUESS_SCALE} 倍に見立てる`, q: D.TEMP.q * GUESS_SCALE, color: S.COLOR.smooth },
    { name: `Q を 1/${GUESS_SCALE} に見立てる`, q: D.TEMP.q / GUESS_SCALE, color: S.COLOR.predict },
    { name: 'データを作ったときと同じ Q', q: D.TEMP.q, color: S.COLOR.filter },
  ].map((g) => {
    const mean = M.filter1d(TEMP_Y, { q: g.q, r: D.TEMP.r, ...D.TEMP_INIT }).mean;
    return { ...g, mean, error: M.rmse(mean, TEMP_X) };
  });
  add({
    id: '4V-2',
    chapter: 4,
    kind: 'visual',
    title: 'Q の見立てで、推定が変わる',
    beats: [
      beat('比の効き方を、先に見ておきます。同じ観測に、カルマンフィルターを、3通りの設定でかけました。', '比率の効きかたを、先に見ておきます。同じ観測に、カルマンフィルターを、3通りの設定でかけました。'),
      beat(R`$Q$ を大きく見立てると、推定は、観測によく付いていきます。そのかわり、ノイズも拾います。`, 'キューを大きく見立てると、推定は、観測によく付いていきます。そのかわり、ノイズも拾います。'),
      beat(R`$Q$ を小さく見立てると、なめらかになります。そのかわり、本当の変化に遅れます。`, 'キューを小さく見立てると、なめらかになります。そのかわり、本当の変化に、遅れます。'),
      beat(R`データを作ったときと同じ $Q$ を使うと、本当の温度とのずれが、3つの中でいちばん小さくなります。`, 'データを作ったときと同じキューを使うと、本当の温度とのずれが、みっつの中で、いちばん小さくなります。'),
      beat(R`移動平均では決め手のなかった「ならし具合」が、$Q$ と $R$ という、意味のある数で決まります。`, '移動平均では、決め手のなかった、ならし具合が、キューとアールという、意味のある数で決まります。'),
    ],
    build(ui) {
      ui.card({ x: 1120, y: 180, w: 420, h: 300, title: '本当の温度とのずれ（RMSE、℃）', at: 1 });
      ui.table({
        x: 1140, y: 232, widths: [270, 110], aligns: ['left', 'center'], size: 20, rowH: 56,
        header: ['設定', 'ずれ'],
        rows: GUESSES.map((g) => [g.name, fmt(g.error, 2)]),
        rowAt: [1, 2, 3], delay: 0.6,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }], [{ from: 3 }]],
      });
    },
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 940, h: 500, xr: [0, 100], yr: [15.5, 24.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [16, 18, 20, 22, 24], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.dots(ctx, T, TEMP_Y, { r: 4.5, color: S.COLOR.obs, alpha: 0.55 * a0 });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [10, 7], alpha: a0 });
      GUESSES.forEach((g, i) => {
        const at = i + 1;
        const fade = i < 2 ? 1 - 0.7 * s.p(at + 1, 0.6) : 1;
        P.line(ctx, T, g.mean, { color: g.color, width: 4, alpha: s.p(at, 0.4, 0.2) * fade, upto: s.p(at, 2.2, 0.3) });
      });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }, { color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' }];
      GUESSES.forEach((g, i) => s.u >= s.bt(i + 1) && items.push({ color: g.color, label: ['Q 大', 'Q 小', 'Q そのまま'][i] }));
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- 第5章 理論（行列で書く）
  add({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: CHAPTERS[4],
    beats: [
      beat('状態が2つ以上あるときは、行列で書きます。例は、まっすぐなレールを走る台車です。', '状態が、ふたつ以上あるときは、ぎょうれつで書きます。例は、まっすぐなレールを走る、台車です。'),
      beat(R`状態は、位置 $p$ と速度 $s$ の2つです。位置は、1つ前の位置に、速度 × 時間を足したものです。`, '状態は、位置ピーと、速度エスの、ふたつです。位置は、ひとつ前の位置に、速度かける時間を、足したものです。'),
      beat(R`速度は、1つ前の速度に、小さな変化 $w_t$ が加わります。`, '速度は、ひとつ前の速度に、小さな変化、ダブリューが加わります。'),
      beat(R`この2本を、ベクトルと行列でまとめます。状態ベクトル $\mathbf{x}_{t-1}$ に行列 $F$ を掛けると、次の時刻に進みます。`, 'このにほんを、ベクトルと、ぎょうれつでまとめます。状態ベクトルに、ぎょうれつエフを掛けると、次の時刻に進みます。'),
      beat(R`観測は位置だけです。行列 $H$ が、状態ベクトルから位置を取り出します。速度は、直接は測りません。`, '観測は、位置だけです。ぎょうれつエイチが、状態ベクトルから、位置を取り出します。速度は、直接は測りません。'),
      beat(R`これが、線形の状態空間モデルの一般形です。温度の例は、$F$ も $H$ も 1 の場合にあたります。`, 'これが、線形の状態空間モデルの、一般形です。温度の例は、エフもエイチも、1の場合にあたります。'),
    ],
    build(ui) {
      eq(ui, R`p_t = p_{t-1} + \Delta t \cdot s_{t-1}`, 130, { at: 1, size: 30 });
      note(ui, '位置 ＝ 前の位置 ＋ 速度 × 時間', LEFT_X + 400, 136, { at: 1, delay: 0.4 });
      eq(ui, R`s_t = s_{t-1} + w_t`, 190, { at: 2, size: 30 });
      note(ui, '速度 ＝ 前の速度 ＋ 小さな変化', LEFT_X + 400, 196, { at: 2, delay: 0.4 });
      ui.tex(
        R`\underbrace{\begin{bmatrix} p_t \\ s_t \end{bmatrix}}_{\mathbf{x}_t} = \underbrace{\begin{bmatrix} 1 & \Delta t \\ 0 & 1 \end{bmatrix}}_{F} \underbrace{\begin{bmatrix} p_{t-1} \\ s_{t-1} \end{bmatrix}}_{\mathbf{x}_{t-1}} + \underbrace{\begin{bmatrix} 0 \\ w_t \end{bmatrix}}_{\mathbf{w}_t}`,
        { x: LEFT_X, y: 268, size: 30, at: 3, glow: [{ from: 3, to: 4 }] },
      );
      ui.tex(R`y_t = \underbrace{\begin{bmatrix} 1 & 0 \end{bmatrix}}_{H} \begin{bmatrix} p_t \\ s_t \end{bmatrix} + v_t`, { x: LEFT_X, y: 432, size: 30, at: 4, glow: [{ from: 4, to: 5 }] });
      note(ui, R`$H$ が位置だけを取り出す`, LEFT_X + 400, 462, { at: 4, delay: 0.5 });

      ui.card({ x: CARD_X - 40, y: 250, w: CARD_W + 40, h: 330, title: '線形の状態空間モデル（一般形）', at: 5, glow: [{ from: 5 }] });
      ui.tex(R`\mathbf{x}_t = F\,\mathbf{x}_{t-1} + \mathbf{w}_t`, { x: CARD_X - 10, y: 310, size: 34, at: 5, delay: 0.2 });
      ui.tex(R`\mathbf{y}_t = H\,\mathbf{x}_t + \mathbf{v}_t`, { x: CARD_X - 10, y: 380, size: 34, at: 5, delay: 0.5 });
      ui.tex(R`\mathbf{w}_t \sim \mathcal{N}(\mathbf{0},\ Q),\quad \mathbf{v}_t \sim \mathcal{N}(\mathbf{0},\ R)`, { x: CARD_X - 10, y: 456, size: 25, at: 5, delay: 0.8 });
      ui.text(R`温度の例：$F = 1$、$H = 1$`, { x: CARD_X - 10, y: 520, size: 21, color: C.text2, at: 5, delay: 1.1 });
      keyPoint(ui, R`$F$：状態の進み方　$H$：状態の見え方　$Q$・$R$：ノイズの大きさ`, 640, 5);
    },
  });

  // ---------------------------------------------------------------- 第5章 理論（行列の掛け算を数で確かめる）
  const DEMO = { p: 10, s: 2, dt: 1 };
  const DEMO_NEXT = M.matVec([[1, DEMO.dt], [0, 1]], [DEMO.p, DEMO.s]);
  add({
    id: '5T-2',
    chapter: 5,
    kind: 'theory',
    title: '行列の掛け算を数で確かめる',
    beats: [
      beat(`行列の掛け算を、数で確かめます。位置が ${DEMO.p} メートル、速度が秒速 ${DEMO.s} メートル、時間の刻みは ${DEMO.dt} 秒とします。`, `ぎょうれつの掛け算を、数で確かめます。位置が${DEMO.p}メートル、速度が、秒速${DEMO.s}メートル。時間の刻みは、${DEMO.dt}秒とします。`),
      beat(R`$F$ を掛けます。上の行は、1 × ${DEMO.p} ＋ ${DEMO.dt} × ${DEMO.s} で ${DEMO_NEXT[0]}。位置が、速度のぶんだけ進みました。`, `エフを掛けます。うえのぎょうは、1かける${DEMO.p}、たす、${DEMO.dt}かける${DEMO.s}で、${DEMO_NEXT[0]}。位置が、速度のぶんだけ進みました。`),
      beat(`下の行は、0 × ${DEMO.p} ＋ 1 × ${DEMO.s} で ${DEMO_NEXT[1]}。速度は、そのままです。`, `したのぎょうは、ゼロかける${DEMO.p}、たす、1かける${DEMO.s}で、${DEMO_NEXT[1]}。速度は、そのままです。`),
      beat(R`$H$ を掛けると、1 × ${DEMO_NEXT[0]} ＋ 0 × ${DEMO_NEXT[1]} で ${DEMO_NEXT[0]}。位置だけが取り出されます。`, `エイチを掛けると、1かける${DEMO_NEXT[0]}、たす、ゼロかける${DEMO_NEXT[1]}で、${DEMO_NEXT[0]}。位置だけが、取り出されます。`),
      beat(R`$F$ は「1ステップ進める」、$H$ は「見える部分を取り出す」。行列は、この2つの操作を、まとめて書く道具です。`, 'エフは、ワンステップ進める。エイチは、見える部分を取り出す。ぎょうれつは、このふたつの操作を、まとめて書く道具です。'),
    ],
    build(ui) {
      note(ui, R`いまの状態：位置 ${DEMO.p} m、速度 ${DEMO.s} m/秒（$\Delta t = ${DEMO.dt}$ 秒）`, LEFT_X, 134, { size: 25, color: C.text });
      note(ui, R`$F$ を掛ける（1ステップ進める）`, LEFT_X, 214, { at: 1, weight: 700, color: S.COLOR.filter, size: 24 });
      ui.tex(
        R`\begin{bmatrix} 1 & ${DEMO.dt} \\ 0 & 1 \end{bmatrix} \begin{bmatrix} ${DEMO.p} \\ ${DEMO.s} \end{bmatrix} = \begin{bmatrix} \htmlClass{row1}{1 \times ${DEMO.p} + ${DEMO.dt} \times ${DEMO.s}} \\ \htmlClass{row2}{0 \times ${DEMO.p} + 1 \times ${DEMO.s}} \end{bmatrix} = \begin{bmatrix} ${DEMO_NEXT[0]} \\ ${DEMO_NEXT[1]} \end{bmatrix}`,
        { x: LEFT_X, y: 262, size: 36, at: 1, hl: [{ cls: 'row1', from: 1, to: 2 }, { cls: 'row2', from: 2, to: 3 }] },
      );
      note(ui, `位置 ${DEMO_NEXT[0]} m（進んだ）`, LEFT_X + 880, 266, { at: 1, delay: 0.8, size: 23 });
      note(ui, `速度 ${DEMO_NEXT[1]} m/秒（そのまま）`, LEFT_X + 880, 318, { at: 2, delay: 0.5, size: 23 });
      note(ui, R`$H$ を掛ける（見える部分を取り出す）`, LEFT_X, 430, { at: 3, weight: 700, color: S.COLOR.obs, size: 24 });
      ui.tex(R`\begin{bmatrix} 1 & 0 \end{bmatrix} \begin{bmatrix} ${DEMO_NEXT[0]} \\ ${DEMO_NEXT[1]} \end{bmatrix} = 1 \times ${DEMO_NEXT[0]} + 0 \times ${DEMO_NEXT[1]} = ${DEMO_NEXT[0]}`, { x: LEFT_X, y: 478, size: 36, at: 3 });
      note(ui, '位置だけが見える', LEFT_X + 880, 506, { at: 3, delay: 0.8, size: 23 });
      keyPoint(ui, R`$F$：1ステップ進める　　$H$：見える部分を取り出す`, 640, 4);
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（台車を動かす）
  const CART_T = [0, ...D.cartTimes];
  const CART_P = [D.CART.p0, ...D.cartSim.position];
  const CART_S = [D.CART.v0, ...D.cartSim.velocity];
  const CART_Y = D.cartSim.y;
  const TRACK = { x0: 140, x1: 1460, y: 268, range: [-4, 46] };
  const trackX = (p) => TRACK.x0 + ((p - TRACK.range[0]) / (TRACK.range[1] - TRACK.range[0])) * (TRACK.x1 - TRACK.x0);
  const interpolate = (values, time) => {
    const i = Math.min(values.length - 2, Math.floor(time));
    return lerp(values[i], values[i + 1], time - i);
  };
  add({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '台車の位置と速度',
    beats: [
      beat('台車を動かしてみます。上がレールで、青い台車が本当の位置、オレンジの印が、センサーで測った位置です。', '台車を動かしてみます。上がレールで、青い台車が、本当の位置。オレンジのしるしが、センサーで測った位置です。'),
      beat(`センサーの読みは、本当の位置の前後に、${fmt(Math.sqrt(D.CART.r), 0)} メートルほどばらつきます。`, `センサーの読みは、本当の位置の前後に、${fmt(Math.sqrt(D.CART.r), 0)}メートルほど、ばらつきます。`),
      beat('左下は、位置を時間の順に並べたものです。点が観測、線が本当の位置です。', '左下は、位置を、時間の順に並べたものです。点が観測、線が本当の位置です。'),
      beat('右下は速度です。途中から、だんだん遅くなっています。しかし、速度は測っていません。', '右下は、速度です。途中から、だんだん遅くなっています。しかし、速度は測っていません。'),
      beat('位置の観測だけから、見えない速度まで推定できるでしょうか。できます。その方法が、第2回のカルマンフィルターです。', '位置の観測だけから、見えない速度まで、推定できるでしょうか。できます。その方法が、第2回の、カルマンフィルターです。'),
    ],
    build(ui) {
      ui.text('速度は測っていない（見えない状態）', { x: 900, y: 716, size: 22, weight: 700, color: C.yellow, at: 3, delay: 0.6, glow: [{ from: 3 }] });
    },
    draw(ctx, s) {
      const a0 = s.p(0, 0.5, 0.1);
      // 台車の時刻: 最初の2つの字幕の間に 0 → 40 秒ぶん進める
      const time = keyframes(s.u, [[s.bt(0) + 1.2, 0], [s.bt(2) - 0.5, D.CART.count]]);
      const step = Math.floor(time);
      // レール
      ctx.save();
      ctx.globalAlpha = a0;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(TRACK.x0 - 20, TRACK.y);
      ctx.lineTo(TRACK.x1 + 20, TRACK.y);
      ctx.stroke();
      [0, 10, 20, 30, 40].forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(trackX(p), TRACK.y);
        ctx.lineTo(trackX(p), TRACK.y + 10);
        ctx.stroke();
        canvasText(ctx, `${p} m`, trackX(p), TRACK.y + 34, { size: 17, color: C.muted, align: 'center' });
      });
      ctx.restore();
      // これまでの観測の印（古いものは薄く）
      for (let t = 1; t <= step; t++) {
        const age = time - t;
        const alpha = a0 * clamp(1 - age / 6, 0.12, 1);
        const x = trackX(CART_Y[t - 1]);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = S.COLOR.obs;
        ctx.beginPath();
        ctx.moveTo(x, TRACK.y - 78);
        ctx.lineTo(x - 9, TRACK.y - 98);
        ctx.lineTo(x + 9, TRACK.y - 98);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      S.cart(ctx, trackX(interpolate(CART_P, time)), TRACK.y, { alpha: a0, color: S.COLOR.filter });
      canvasText(ctx, `t = ${step} 秒`, TRACK.x0, TRACK.y - 104, { size: 24, color: C.text, weight: 800, alpha: a0 });

      // 左下: 位置（観測の点は、台車が進むのに合わせて1つずつ打つ。本当の位置の線は、字幕2で引く）
      const a1 = s.p(0, 0.6, 1.0);
      if (a1 > 0) {
        const P = new Plot({ x: 120, y: 390, w: 620, h: 290, xr: [0, 40], yr: [-4, 46] });
        P.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 20, 40], xlabel: '時刻 t（秒）', ylabel: '位置（m）', alpha: a1 });
        P.dots(ctx, D.cartTimes.slice(0, step), CART_Y.slice(0, step), { r: 5, color: S.COLOR.obs, alpha: a1 });
        P.line(ctx, CART_T, CART_P, { color: S.COLOR.truth, width: 3.5, alpha: s.p(2, 0.5, 0.3), upto: s.p(2, 1.6, 0.5) });
      }
      // 右下: 速度
      const a3 = s.p(3, 0.6, 0.2);
      if (a3 > 0) {
        const Q = new Plot({ x: 900, y: 390, w: 600, h: 290, xr: [0, 40], yr: [0, 1.6] });
        Q.axes(ctx, { xticks: [0, 10, 20, 30, 40], yticks: [0, 0.5, 1, 1.5], fmtY: (v) => fmt(v, 1), xlabel: '時刻 t（秒）', ylabel: '速度（m/秒）', alpha: a3 });
        Q.line(ctx, CART_T, CART_S, { color: S.COLOR.truth, width: 3.5, alpha: a3, dash: [10, 7], upto: s.p(3, 1.8, 0.4) });
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（いろいろなモデル）
  add({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: CHAPTERS[5],
    beats: [
      beat(R`$F$ と $H$ を選ぶと、いろいろなモデルが作れます。`, 'エフとエイチを選ぶと、いろいろなモデルが作れます。'),
      beat('ローカルレベルモデルは、ゆっくり動く水準を表します。', 'ローカルレベルモデルは、ゆっくり動く、水準を表します。'),
      beat('傾きを状態に加えると、上がり続ける、下がり続けるといった、トレンドを表せます。形は、台車の等速モデルと同じです。', '傾きを状態に加えると、上がり続ける、下がり続けるといった、トレンドを表せます。形は、台車の等速モデルと同じです。'),
      beat(R`$F$ を、1 より小さい数 $\phi$ にすると、0 に戻ろうとする動きになります。自己回帰モデルです。`, 'エフを、1より小さい数、ファイにすると、ゼロに戻ろうとする動きになります。自己回帰モデルです。'),
      beat('季節による繰り返しも、状態として加えられます。', '季節による繰り返しも、状態として加えられます。'),
      beat('成分を並べて、1つの大きな状態ベクトルにすれば、組み合わせも自由です。どのモデルも同じ形なので、同じカルマンフィルターで推定できます。', '成分を並べて、ひとつの大きな状態ベクトルにすれば、組み合わせも自由です。どのモデルも同じ形なので、同じカルマンフィルターで、推定できます。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 126, w: 1420, h: 430 });
      ui.table({
        x: LEFT_X + 20, y: 140, widths: [330, 260, 300, 190, 300], aligns: ['left', 'left', 'center', 'center', 'left'], size: 22, rowH: 76,
        header: ['モデル', '状態', R`$F$`, R`$H$`, '表すもの'],
        rows: [
          ['ローカルレベル', '水準', R`$1$`, R`$1$`, 'ゆっくり動く水準'],
          ['ローカル線形トレンド', '水準、傾き', R`$\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$`, R`$\begin{bmatrix} 1 & 0 \end{bmatrix}$`, '傾きのある変化'],
          ['自己回帰 AR(1)', '値', R`$\phi\ \ (|\phi| < 1)$`, R`$1$`, '0 に戻ろうとする動き'],
          ['季節成分', '季節ごとの効果', '季節を順に送る行列', R`$\begin{bmatrix} 1 & 0 & \cdots \end{bmatrix}$`, '周期的な繰り返し'],
        ],
        rowAt: [1, 2, 3, 4], delay: 0.2,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }], [{ from: 3, to: 4 }], [{ from: 4, to: 5 }]],
      });
      keyPoint(ui, 'どのモデルも同じ形 → 同じカルマンフィルターで推定できる', 620, 5);
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（成分の足し合わせ）
  const PARTS_N = 96;
  const PARTS_T = Array.from({ length: PARTS_N }, (_, i) => i + 1);
  const PARTS = (() => {
    const slopeNoise = M.standardNormals(PARTS_N, 610);
    const noise = M.standardNormals(PARTS_N, 611);
    let level = 10;
    let slope = 0.12;
    const trend = [];
    for (let t = 0; t < PARTS_N; t++) {
      level += slope;
      slope += 0.012 * slopeNoise[t];
      trend.push(level);
    }
    const season = PARTS_T.map((t) => 2 * Math.sin((2 * Math.PI * t) / 12) + 0.8 * Math.sin((4 * Math.PI * t) / 12));
    const error = noise.map((z) => 0.7 * z);
    return { trend, season, error, total: trend.map((v, i) => v + season[i] + error[i]) };
  })();
  const PART_ROWS = [
    { key: 'trend', label: 'トレンド（水準と傾き）', color: S.COLOR.filter, yr: [8, 26], ticks: [10, 20] },
    { key: 'season', label: '季節（12回ごとに繰り返す）', color: S.COLOR.smooth, yr: [-4, 4], ticks: [-3, 0, 3] },
    { key: 'error', label: '観測ノイズ', color: S.COLOR.other, yr: [-4, 4], ticks: [-3, 0, 3] },
    { key: 'total', label: '3つの合計 ＝ 観測されるデータ', color: S.COLOR.obs, yr: [6, 28], ticks: [10, 20] },
  ];
  add({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '成分を足し合わせる',
    beats: [
      beat('組み合わせの例です。上は、傾きのあるトレンドです。', '組み合わせの例です。上は、傾きのあるトレンドです。'),
      beat('2段目は、12回ごとに繰り返す、季節の成分です。', '2段目は、12回ごとに繰り返す、季節の成分です。'),
      beat('3段目は、観測ノイズです。', '3段目は、観測ノイズです。'),
      beat('3つを足すと、下のデータになります。売上や需要など、多くの時系列が、このような形をしています。', 'みっつを足すと、下のデータになります。売上や需要など、多くの時系列が、このような形をしています。'),
      beat('状態空間モデルでは、逆向きに考えます。下のデータだけを見て、上の成分を、それぞれ推定するのです。', '状態空間モデルでは、逆向きに考えます。下のデータだけを見て、上の成分を、それぞれ推定するのです。'),
    ],
    build(ui) {
      PART_ROWS.forEach((row, i) => ui.text(row.label, { x: 1150, y: 176 + i * 148, size: 23, weight: 700, at: i }));
      ui.text('＋', { x: 1150, y: 248, size: 30, color: C.muted, at: 1 });
      ui.text('＋', { x: 1150, y: 396, size: 30, color: C.muted, at: 2 });
      ui.text('＝', { x: 1150, y: 544, size: 30, color: C.muted, at: 3 });
    },
    draw(ctx, s) {
      PART_ROWS.forEach((row, i) => {
        const a = s.p(i, 0.6, 0.2);
        if (a <= 0) return;
        const P = new Plot({ x: 120, y: 150 + i * 148, w: 980, h: 108, xr: [0, PARTS_N], yr: row.yr });
        ctx.save();
        ctx.globalAlpha = a;
        P.axes(ctx, { xticks: i === 3 ? [0, 12, 24, 36, 48, 60, 72, 84, 96] : [], yticks: row.ticks, xlabel: i === 3 ? '時刻 t' : undefined });
        P.line(ctx, PARTS_T, PARTS[row.key], { color: row.color, width: 3, upto: s.p(i, 1.6, 0.3) });
        ctx.restore();
      });
      // 逆向き（データ → 成分）の矢印
      const back = s.p(4, 0.8, 0.4);
      if (back > 0) [0, 1].forEach((i) => S.arrow(ctx, 80, 640, 80, 210 + i * 148, { color: C.yellow, width: 4, alpha: back, upto: back, head: 16 }));
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（F の違い）
  const AR_PHI = 0.9;
  const AR_COUNT = 20;
  const AR_STEPS = 60;
  const AR_NOISE_SD = 0.5;
  const arPaths = (phi) => Array.from({ length: AR_COUNT }, (_, k) => {
    let x = 0;
    return [0, ...M.standardNormals(AR_STEPS, 700 + k).map((z) => (x = phi * x + AR_NOISE_SD * z))];
  });
  const AR_T = Array.from({ length: AR_STEPS + 1 }, (_, i) => i);
  const AR_PANELS = [
    { x: 120, phi: 1, paths: arPaths(1), label: 'F = 1（ローカルレベル）', at: 0 },
    { x: 840, phi: AR_PHI, paths: arPaths(AR_PHI), label: `F = ${AR_PHI}（自己回帰）`, at: 1 },
  ];
  add({
    id: '6V-2',
    chapter: 6,
    kind: 'visual',
    title: 'F が、動き方の性格を決める',
    beats: [
      beat(R`$F$ の違いを、図で見ます。左は $F$ が 1 の、ローカルレベルモデルです。線は、時間とともに広がり続けます。`, 'エフの違いを、図で見ます。左は、エフが1の、ローカルレベルモデルです。線は、時間とともに、広がり続けます。'),
      beat(R`右は $F$ を ${AR_PHI} にした、自己回帰モデルです。毎回、値が ${AR_PHI} 倍に縮むので、0 のまわりにとどまります。`, `右は、エフを${AR_PHI}にした、自己回帰モデルです。毎回、あたいが${AR_PHI}倍に縮むので、ゼロのまわりにとどまります。`),
      beat(R`ノイズの大きさは、左右で同じです。違うのは $F$ だけです。`, 'ノイズの大きさは、左右で同じです。違うのは、エフだけです。'),
      beat(R`$F$ が、状態の動き方の性格を決めます。データの性質に合わせて、$F$ を選びます。`, 'エフが、状態の動きかたの、性格を決めます。データの性質に合わせて、エフを選びます。'),
    ],
    build(ui) {
      ui.text('広がり続ける', { x: 330, y: 690, size: 25, weight: 700, color: C.text2, at: 0, delay: 1.5 });
      ui.text('0 のまわりにとどまる', { x: 1010, y: 690, size: 25, weight: 700, color: C.text2, at: 1, delay: 1.5 });
    },
    draw(ctx, s) {
      AR_PANELS.forEach((panel) => {
        const a = s.p(panel.at, 0.6, 0.2);
        if (a <= 0) return;
        const P = new Plot({ x: panel.x, y: 190, w: 640, h: 440, xr: [0, AR_STEPS], yr: [-9, 9] });
        P.axes(ctx, { xticks: [0, 20, 40, 60], yticks: [-8, -4, 0, 4, 8], xlabel: '時刻 t', alpha: a });
        panel.paths.forEach((path, k) => P.line(ctx, AR_T, path, { color: k === 0 ? S.COLOR.filter : S.COLOR.other, width: k === 0 ? 3 : 1.6, alpha: a * (k === 0 ? 1 : 0.85), upto: s.p(panel.at, 2.0, 0.4) }));
        P.line(ctx, AR_T, panel.paths[0], { color: S.COLOR.filter, width: 3, alpha: a, upto: s.p(panel.at, 2.0, 0.4) });
        canvasText(ctx, panel.label, P.x + P.w / 2, P.y - 18, { size: 25, color: C.text, weight: 800, align: 'center', alpha: a });
      });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論（3つの問題）
  add({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: CHAPTERS[6],
    beats: [
      beat('モデルができたら、次は推定です。観測から状態を推定する問題は、3種類あります。', 'モデルができたら、次は推定です。観測から状態を推定する問題は、3種類あります。'),
      beat('1つめはフィルタリング。今までの観測から、今の状態を推定します。リアルタイムの監視や制御で使います。', 'ひとつめは、フィルタリング。今までの観測から、今の状態を推定します。リアルタイムの監視や、制御で使います。'),
      beat('2つめは予測。今までの観測から、先の状態を推定します。', 'ふたつめは、予測。今までの観測から、先の状態を推定します。'),
      beat('3つめは平滑化。全部の観測がそろってから、過去の状態を推定し直します。あとのデータも使えるので、いちばん正確です。', 'みっつめは、へいかつか。全部の観測がそろってから、過去の状態を、推定し直します。あとのデータも使えるので、いちばん正確です。'),
      beat('線形で、ノイズが正規分布なら、3つとも、平均と分散が式で求まります。その計算の手順が、カルマンフィルターと、その仲間です。', '線形で、ノイズが正規分布なら、みっつとも、平均と、ぶんさんが、式で求まります。その計算の手順が、カルマンフィルターと、その仲間です。'),
    ],
    build(ui) {
      ui.card({ x: LEFT_X, y: 130, w: 1420, h: 370 });
      ui.table({
        x: LEFT_X + 20, y: 146, widths: [230, 290, 430, 430], aligns: ['left', 'center', 'left', 'left'], size: 23, rowH: 82,
        header: ['問題', '求める分布', '何から、いつの状態を', '使いどころ'],
        rows: [
          ['フィルタリング', R`$p(x_t \mid y_1, \dots, y_t)$`, '今までの観測 → <b>今</b>の状態', 'リアルタイムの監視・制御'],
          ['予測', R`$p(x_{t+k} \mid y_1, \dots, y_t)$`, '今までの観測 → <b>先</b>の状態', '需要予測、先読み'],
          ['平滑化', R`$p(x_t \mid y_1, \dots, y_T)$`, '全部の観測 → <b>過去</b>の状態', 'あとからの分析'],
        ],
        rowAt: [1, 2, 3], delay: 0.2,
        glowRows: [[{ from: 1, to: 2 }], [{ from: 2, to: 3 }], [{ from: 3, to: 4 }]],
      });
      note(ui, R`$p(x \mid y)$：$y$ が分かったときの $x$ の分布`, LEFT_X + 20, 520, { at: 1, delay: 0.6, size: 21 });
      keyPoint(ui, '線形 ＋ 正規分布 なら、平均と分散が式で求まる（カルマンフィルター）', 620, 4);
    },
  });

  // ---------------------------------------------------------------- 第7章 図解（3つを同じデータで見る）
  const NOW = 70;
  const PARTIAL = M.filter1d(TEMP_Y.map((y, i) => (i < NOW ? y : null)), { q: D.TEMP.q, r: D.TEMP.r, ...D.TEMP_INIT });
  const PARTIAL_KALMAN = M.kalmanFilter(TEMP_Y.slice(0, NOW).map((y) => [y]), { ...D.tempModel, m0: [D.TEMP_INIT.m0], P0: [[D.TEMP_INIT.p0]] });
  const PARTIAL_SMOOTH = M.rtsSmoother(PARTIAL_KALMAN.steps, D.tempModel.F);
  const SMOOTH_MEAN = PARTIAL_SMOOTH.xs.map((x) => x[0]);
  const SMOOTH_VAR = PARTIAL_SMOOTH.Ps.map((P) => P[0][0]);
  add({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '3つの推定を同じデータで見る',
    beats: [
      beat(`温度のデータで、3つを見てみます。今は ${NOW} 分の時点で、観測は ${NOW} 回ぶんあります。`, `温度のデータで、みっつを見てみます。今は${NOW}分の時点で、観測は、${NOW}回ぶんあります。`),
      beat(R`フィルタリングです。1回観測するたびに、その時点の推定を更新します。帯は、± 標準偏差2つぶんの不確かさです。`, 'フィルタリングです。1回観測するたびに、その時点の推定を更新します。おびは、プラスマイナス、標準偏差ふたつぶんの、不確かさです。'),
      beat(`予測です。${NOW} 分より先は観測がないので、帯が広がっていきます。第3章で見た、扇の広がりと同じです。`, `予測です。${NOW}分より先は、観測がないので、おびが広がっていきます。第3章で見た、おうぎの広がりと同じです。`),
      beat(`平滑化です。${NOW} 回ぶんを全部使って、過去を推定し直します。フィルタリングより、線がなめらかで、帯が狭くなります。`, `へいかつかです。${NOW}回ぶんを全部使って、過去を、推定し直します。フィルタリングより、線がなめらかで、おびが狭くなります。`),
      beat('点線が本当の温度です。どの推定も、観測の点より、本当の値の近くを通っています。この計算の中身を、次回、1ステップずつ見ていきます。', '点線が、本当の温度です。どの推定も、観測の点より、本当のあたいの近くを通っています。この計算の中身を、次回、ワンステップずつ見ていきます。'),
    ],
    build() {},
    draw(ctx, s) {
      const P = new Plot({ x: 120, y: 170, w: 1360, h: 500, xr: [0, 100], yr: [15.5, 24.5] });
      const a0 = s.p(0, 0.5, 0.1);
      P.axes(ctx, { xticks: TEMP_XTICKS, yticks: [16, 18, 20, 22, 24], xlabel: '時刻 t（分）', ylabel: '温度（℃）', alpha: a0 });
      P.shade(ctx, NOW, 100, { color: C.text, alpha: 0.04 * a0 });
      P.vline(ctx, NOW, { color: C.text2, alpha: a0 });
      P.label(ctx, `今（t = ${NOW}）`, NOW, 24.5, { dx: 8, dy: 24, size: 20, color: C.text2, weight: 700, alpha: a0 });
      const smooth = s.p(3, 0.6, 0.2);
      const filterAlpha = s.p(1, 0.4, 0.2) * (1 - 0.6 * smooth);
      S.drawBand(ctx, P, T, PARTIAL.mean, PARTIAL.variance, { color: S.COLOR.filter, alpha: filterAlpha, upto: s.p(1, 3.0, 0.4), to: NOW });
      const forecast = s.p(2, 0.4, 0.2);
      S.drawBand(ctx, P, T, PARTIAL.mean, PARTIAL.variance, { color: S.COLOR.predict, alpha: forecast, upto: s.p(2, 2.0, 0.4), from: NOW - 1 });
      S.drawBand(ctx, P, T, SMOOTH_MEAN, SMOOTH_VAR, { color: S.COLOR.smooth, alpha: smooth, upto: s.p(3, 2.4, 0.3), to: NOW });
      P.dots(ctx, T.slice(0, NOW), TEMP_Y.slice(0, NOW), { r: 4.5, color: S.COLOR.obs, alpha: 0.75 * a0 });
      P.line(ctx, T, TEMP_X, { color: S.COLOR.truth, width: 3, dash: [9, 7], alpha: s.p(4, 0.6, 0.2), upto: s.p(4, 2.0, 0.2) });
      const items = [{ kind: 'dot', color: S.COLOR.obs, label: '観測' }];
      if (s.u >= s.bt(1)) items.push({ color: S.COLOR.filter, label: 'フィルタリング' });
      if (s.u >= s.bt(2)) items.push({ color: S.COLOR.predict, label: '予測' });
      if (s.u >= s.bt(3)) items.push({ color: S.COLOR.smooth, label: '平滑化' });
      if (s.u >= s.bt(4)) items.push({ color: S.COLOR.truth, dash: [8, 6], label: '本当の温度' });
      legend(ctx, items, P.x, P.y + P.h + 76, { alpha: a0 });
    },
  });

  // ---------------------------------------------------------------- まとめ・参考文献
  SK.summaryScene({
    chapter: 8,
    title: '第1回のまとめ',
    items: [
      ['状態は見えない', '見えるのは、ノイズの乗った観測だけ'],
      ['状態空間モデル ＝ 状態方程式 ＋ 観測方程式', '状態がどう変わるか、観測がどう生まれるか'],
      [R`ノイズは正規分布。大きさは $Q$ と $R$`, R`$Q$ は状態を動かし、$R$ は観測をずらす。推定の性格は、2つの比で決まる`],
      [R`行列 $F$・$H$ で、いろいろなモデルが同じ形になる`, '水準、トレンド、季節、位置と速度'],
      ['推定の問題は3つ', 'フィルタリング（今）・予測（先）・平滑化（過去）'],
    ],
    closing: '次回：カルマンフィルターのしくみ ― 予測と観測を混ぜる',
    beats: [
      beat('まとめです。知りたい状態は、直接は見えません。見えるのは、ノイズの乗った観測だけです。', 'まとめです。知りたい状態は、直接は見えません。見えるのは、ノイズの乗った観測だけです。'),
      beat('状態空間モデルは、状態方程式と観測方程式の、2本の式です。', '状態空間モデルは、状態方程式と、観測方程式の、にほんの式です。'),
      beat(R`ノイズは正規分布で表し、大きさは $Q$ と $R$ で決めます。`, 'ノイズは、正規分布で表し、大きさは、キューとアールで決めます。'),
      beat(R`行列 $F$ と $H$ を取りかえると、いろいろなモデルが、同じ形で書けます。`, 'ぎょうれつ、エフとエイチを取りかえると、いろいろなモデルが、同じ形で書けます。'),
      beat('推定の問題は、フィルタリング、予測、平滑化の3つです。', '推定の問題は、フィルタリング、予測、へいかつかの、みっつです。'),
      beat('次回は、カルマンフィルターです。予測と観測を、どう混ぜるのかを、1ステップずつ見ていきます。', '次回は、カルマンフィルターです。予測と観測を、どう混ぜるのかを、ワンステップずつ見ていきます。'),
    ],
  });

  SK.endScene({
    chapter: 9,
    references: [
      'R. E. Kalman, "A New Approach to Linear Filtering and Prediction Problems", <i>Journal of Basic Engineering</i>, 82(1), 35–45, 1960',
      'A. C. Harvey, <i>Forecasting, Structural Time Series Models and the Kalman Filter</i>, Cambridge University Press, 1989',
      'J. Durbin, S. J. Koopman, <i>Time Series Analysis by State Space Methods</i>, 2nd ed., Oxford University Press, 2012',
      '北川源四郎『時系列解析入門』岩波書店、2005',
    ],
    beats: [
      beat('参考文献です。第1回は、ここまでです。', '参考文献です。第1回は、ここまでです。', 7),
    ],
  });
})();
