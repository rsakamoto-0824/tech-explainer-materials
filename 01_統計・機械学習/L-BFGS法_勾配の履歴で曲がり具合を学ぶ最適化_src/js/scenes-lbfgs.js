// scenes-lbfgs.js — 第5〜8章（L-BFGS、直線探索、手法の比較、ガウス過程の学習）、まとめ、おわり。
(() => {
  const { W, C, Plot, fmt, texNum, canvasText, lerp, clamp, legend, rgba } = KIT;
  const O = OPTM;
  const D = OPTDRAW;
  const DATA = window.OPTDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const CARD_X = 1010;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: 'L-BFGS ― 行列を持たずに計算する',
    beats: [
      beat('BFGS の弱点は、n かける n の行列を持つことです。変数が100万あると、記憶に入りません。'),
      beat('でも、本当に必要なのは行列そのものではなく、H に勾配を掛けたベクトルだけです。'),
      beat('L-BFGS は、最近の m 組の s と y だけを覚えます。n 個の数の組が 2m 本なので、記憶は 2mn で済みます。'),
      beat('H に g を掛けた答えは、2つのループで求まります。最初のループは新しい組から、次のループは古い組から順に処理します。', 10),
      beat('途中の H ゼロには、単位行列の定数倍を使います。定数は、最新の組から決めます。全体の手間は mn に比例します。'),
    ],
    build(ui) {
      ui.tex(R`\text{BFGS}: \; H_k \;(n^2 \text{ 個の数}) \qquad \longrightarrow \qquad \text{L-BFGS}: \; \{\mathbf{s}_i, \mathbf{y}_i\}_{i=k-m}^{k-1} \;(2mn \text{ 個の数})`, { x: LEFT_X, y: 116, size: 27, at: 2 });
      ui.text('必要なのは $H\\mathbf{g}$ だけ。行列を作らなくてよい', { x: LEFT_X, y: 184, size: 25, weight: 700, at: 1 });
      seeThrough(ui.card({ x: LEFT_X, y: 240, w: 860, h: 460, at: 3, title: '2ループ再帰（ノセダル 1980）' }));
      const lines = [
        [3, R`\mathbf{q} \leftarrow \mathbf{g}`],
        [3, R`\text{新しい組から順に}: \; \alpha_i \leftarrow \rho_i\, \mathbf{s}_i^{\top} \mathbf{q}, \quad \mathbf{q} \leftarrow \mathbf{q} - \alpha_i\, \mathbf{y}_i`],
        [4, R`\mathbf{r} \leftarrow H^0 \mathbf{q} = \gamma\, \mathbf{q}, \qquad \gamma = \frac{\mathbf{s}_{k-1}^{\top} \mathbf{y}_{k-1}}{\mathbf{y}_{k-1}^{\top} \mathbf{y}_{k-1}}`],
        [3, R`\text{古い組から順に}: \; \beta \leftarrow \rho_i\, \mathbf{y}_i^{\top} \mathbf{r}, \quad \mathbf{r} \leftarrow \mathbf{r} + \mathbf{s}_i (\alpha_i - \beta)`],
        [3, R`\mathbf{r} = H_k\, \mathbf{g} \quad \text{（進む向きは } -\mathbf{r} \text{）}`],
      ];
      const ROW_Y = [292, 352, 416, 516, 590];
      lines.forEach(([at, tex], i) => ui.tex(tex, { x: LEFT_X + 30, y: ROW_Y[i], size: 25, at, delay: 0.3 * i }));
      seeThrough(ui.card({ x: CARD_X, y: 240, w: 500, h: 460, at: 4, title: '記憶と手間' }));
      ui.table({
        x: CARD_X + 24, y: 300, widths: [180, 130, 130], size: 22, rowH: 54,
        header: ['', '記憶', '1回の手間'],
        rows: [['BFGS', '$n^2$', '$n^2$'], ['L-BFGS', '$2mn$', '$\\sim 4mn$']],
        at: 4, rowDelay: 0.3, delay: 0.3,
      });
      ui.text('$n = 10^6$、$m = 10$ なら<br>BFGS 8 TB、L-BFGS 160 MB', { x: CARD_X + 28, y: 500, w: 450, size: 25, weight: 700, lh: 1.6, at: 4, delay: 0.8 });
      ui.text('$m$ は 3〜20 程度が使われる', { x: CARD_X + 28, y: 610, size: 21, color: C.text2, at: 4, delay: 1.2 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解: 2ループ再帰を実際に動かす
  const WALK_A = [
    [6, 1, 0, 0, 0, 0],
    [1, 3, 1, 0, 0, 0],
    [0, 1, 5, 1, 0, 0],
    [0, 0, 1, 2, 1, 0],
    [0, 0, 0, 1, 4, 1],
    [0, 0, 0, 0, 1, 1],
  ];
  const WALK_START = [1, -2, 1.5, 2, -1, 3];
  const WALK_MEMORY = 2;
  const WALK = (() => {
    const problem = O.quadratic(WALK_A);
    const run = O.lbfgs(problem, WALK_START, { memory: WALK_MEMORY, iterations: 4, tolerance: 0, keepPairs: true });
    const x = run.path[run.path.length - 1];
    const g = problem.g(x);
    const trace = [];
    const r = O.twoLoop(g, run.pairs, { trace });
    const last = run.pairs[run.pairs.length - 1];
    const gamma = O.dot(last.s, last.y) / O.dot(last.y, last.y);
    let H = O.identity(6).map((row) => row.map((v) => v * gamma));
    run.pairs.forEach(({ s, y }) => (H = O.bfgsUpdate(H, s, y)));
    const newtonDirection = O.solve(WALK_A, g);
    const cosine = O.dot(r, newtonDirection) / (O.norm(r) * O.norm(newtonDirection));
    return { g, trace, r, byMatrix: O.matVec(H, g), newtonDirection, cosine, gap: O.norm(O.add(r, O.matVec(H, g), -1)) };
  })();
  const WALK_LABELS = (item) => {
    if (item.phase === 'start') return R`\mathbf{q} = \mathbf{g}`;
    if (item.phase === 'back') return R`\mathbf{q} \leftarrow \mathbf{q} ${item.alpha < 0 ? '+' : '-'} ${texNum(Math.abs(item.alpha), 2)}\, \mathbf{y}_{${item.index + 1}}`;
    if (item.phase === 'scale') return R`\mathbf{r} \leftarrow ${texNum(item.gamma, 2)}\, \mathbf{q}`;
    return R`\mathbf{r} \leftarrow \mathbf{r} + \mathbf{s}_{${item.index + 1}} (\alpha_{${item.index + 1}} - \beta)`;
  };
  const WALK_MAX = Math.max(...WALK.trace.flatMap((t) => t.vector.map(Math.abs)), ...WALK.newtonDirection.map(Math.abs));
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '2ループ再帰を動かしてみる',
    beats: [
      beat('6変数の2次関数で、L-BFGS を4回進めました。覚えている組は、最新の2組だけです。棒は勾配 g の6つの成分です。'),
      beat('最初のループでは、新しい組から順に、y の成分を引いていきます。s の向きの情報を、勾配から取り除く操作です。'),
      beat('残ったベクトルに、定数ガンマを掛けます。これが、知らない向きの曲がり具合の見積もりです。'),
      beat('2つ目のループでは、古い組から順に、s の成分を戻します。行列は一度も作っていません。'),
      beat('白い点は、同じ2組から行列を作って掛けた答えです。ぴったり一致します。ベクトルの内積だけで、行列の掛け算と同じ結果が出ました。', 10),
      beat('緑の棒が L-BFGS の向き、黄色の点がニュートン法の向きです。わずか2組の記憶でも、向きはよく一致します。'),
    ],
    build(ui) {
      const steps = WALK.trace;
      const at = (step) => {
        if (step.phase === 'start') return 0;
        if (step.phase === 'back') return 1;
        if (step.phase === 'scale') return 2;
        return 3;
      };
      steps.forEach((step, i) => ui.tex(WALK_LABELS(step), { x: 96, y: 150 + i * 64, size: 25, at: at(step), delay: step.phase === 'back' || step.phase === 'forward' ? (step.phase === 'back' ? (WALK_MEMORY - 1 - step.index) : step.index) * 2.2 : 0.2 }));
      ui.text(`差は ${WALK.gap.toExponential(0).replace('e-', '×10⁻').replace(/(\d+)$/, (m) => m.replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]))}`, { x: 96, y: 620, size: 24, weight: 700, at: 4, delay: 0.4 });
      ui.text(`ニュートン法の向きとの cos = ${fmt(WALK.cosine, 3)}`, { x: 96, y: 672, size: 24, weight: 700, at: 5, delay: 0.3 });
      return {};
    },
    draw(ctx, s) {
      const box = { x: 560, y: 150, w: 940, h: 500 };
      const steps = WALK.trace;
      // 今の時刻で、どの段階まで進んだか
      const stageTime = (i) => {
        const step = steps[i];
        if (step.phase === 'start') return s.bt(0);
        if (step.phase === 'back') return s.bt(1) + (WALK_MEMORY - 1 - step.index) * 2.2;
        if (step.phase === 'scale') return s.bt(2);
        return s.bt(3) + step.index * 2.2;
      };
      let index = 0;
      for (let i = 0; i < steps.length; i++) if (s.u >= stageTime(i)) index = i;
      const k = index === 0 ? 0 : clamp((s.u - stageTime(index)) / 0.9);
      const before = steps[Math.max(0, index - 1)].vector;
      const vector = steps[index].vector.map((v, i) => lerp(before[i], v, index === 0 ? 1 : k));
      const alpha = s.p(0, 0.7);
      const showMatrix = s.beat === 4;
      const showNewton = s.beat >= 5;
      const dots = showMatrix ? WALK.byMatrix : showNewton ? WALK.newtonDirection.map((v) => v * (O.dot(WALK.r, WALK.r) / O.dot(WALK.r, WALK.newtonDirection))) : null;
      D.vectorBars(ctx, box, vector, { max: WALK_MAX * 1.05, color: D.COLOR.lbfgs, alpha, dots, dotColor: showNewton ? C.yellow : C.text });
      for (let i = 0; i < 6; i++) canvasText(ctx, `${i + 1}`, box.x + (box.w / 6) * (i + 0.5), box.y + box.h + 26, { size: 18, color: C.muted, align: 'center', alpha });
      canvasText(ctx, 'ベクトルの成分', box.x + box.w, box.y + box.h + 54, { size: 18, color: C.text2, align: 'right', alpha });
      if (showNewton) canvasText(ctx, '黄色の点は大きさをそろえて描いた', box.x, box.y + box.h + 54, { size: 17, color: C.muted, alpha: s.p(5, 0.6) });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: 'ウルフ条件',
    beats: [
      beat('向きが決まったら、どれだけ進むかを決めます。進む距離アルファの関数を、ファイと書きます。'),
      beat('第1の条件は、関数が十分に下がることです。少しでも下がれば良い、ではなく、傾きに見合う分だけ下げます。'),
      beat('第2の条件は、傾きが十分にゆるくなることです。短すぎる歩幅を防ぎます。この2つをウルフ条件と呼びます。'),
      beat('第2の条件には、もう1つ大事な働きがあります。この条件が成り立つと、y と s の内積が必ず正になります。'),
      beat('つまり BFGS の正定値が守られ、向きは必ず下りになります。直線探索は、記憶の更新を支える部品です。'),
    ],
    build(ui) {
      ui.tex(R`\phi(\alpha) = f(\mathbf{x}_k + \alpha\, \mathbf{d}_k)`, { x: LEFT_X, y: 118, size: 32 });
      ui.text('十分に下がる', { x: LEFT_X, y: 214, size: 25, weight: 700, at: 1 });
      ui.tex(R`\phi(\alpha) \le \phi(0) + c_1\, \alpha\, \phi'(0)`, { x: LEFT_X + 220, y: 206, size: 30, at: 1, delay: 0.3 });
      ui.text('傾きがゆるくなる', { x: LEFT_X, y: 300, size: 25, weight: 700, at: 2 });
      ui.tex(R`|\phi'(\alpha)| \le c_2\, |\phi'(0)|`, { x: LEFT_X + 220, y: 292, size: 30, at: 2, delay: 0.3 });
      ui.text(`$c_1 = 10^{-4}$、$c_2 = ${O.C2}$ がよく使われる（この動画の計算も同じ）`, { x: LEFT_X, y: 372, size: 22, color: C.text2, at: 2, delay: 0.8 });
      ui.tex(R`\mathbf{y}_k^{\top} \mathbf{s}_k = \alpha\,\big(\phi'(\alpha) - \phi'(0)\big) \ge \alpha\, (1 - c_2)\, |\phi'(0)| > 0`, { x: LEFT_X, y: 468, size: 31, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text('第2の条件が成り立てば、$\\mathbf{y}^{\\top}\\mathbf{s} > 0$ が保証される', { x: LEFT_X, y: 548, size: 23, color: C.text2, at: 3, delay: 0.5 });
      ui.text('→ BFGS の正定値が守られ、進む向きは必ず下りになる', { x: LEFT_X, y: 620, size: 28, weight: 700, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解
  const PHI_POINT = [-1.2, 1];
  const PHI = (() => {
    const problem = O.rosenbrock;
    const run = O.lbfgs(problem, PHI_POINT, { memory: 5, tolerance: 1e-5 });
    // 途中の1歩を例にする
    const stepIndex = 6;
    const x = run.path[stepIndex];
    const direction = O.add(run.path[stepIndex + 1], x, -1);
    const length = O.norm(direction);
    const d = O.scale(direction, 1 / length);
    const f0 = problem.f(x);
    const g0 = problem.g(x);
    const slope0 = O.dot(g0, d);
    const span = length * 2;
    const alphas = Array.from({ length: 261 }, (_, i) => (span * i) / 260);
    const values = alphas.map((a) => problem.f(O.add(x, d, a)) - f0);
    const slopes = alphas.map((a) => O.dot(problem.g(O.add(x, d, a)), d));
    const accepted = alphas.map((a, i) => values[i] <= O.C1 * a * slope0 && Math.abs(slopes[i]) <= O.C2 * Math.abs(slope0));
    return { alphas, values, accepted, slope0, length, span, armijo: alphas.map((a) => O.C1 * a * slope0), tangent: alphas.map((a) => slope0 * a), low: Math.min(...values), high: Math.max(...values), evalsPerStep: (run.evaluations - 1) / (run.path.length - 1) };
  })();
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: 'どの歩幅なら合格か',
    beats: [
      beat('ローゼンブロック関数を L-BFGS で進む途中の1歩です。横軸は進む距離、縦軸は関数の変化です。'),
      beat('点線は、最初の傾きの線です。第1の条件は、グラフがこれよりほんの少しゆるい線の下にあることです。'),
      beat('第2の条件は、グラフの傾きが十分にゆるいことです。この2つを満たす範囲を緑で塗りました。'),
      beat('1回の反復で勾配を計算する回数は、平均すると少しです。まず歩幅1を試し、良ければそのまま進むからです。'),
    ],
    build(ui) {
      ui.text(`ローゼンブロック関数の1回の反復で、勾配の計算は平均 ${fmt(PHI.evalsPerStep, 1)} 回（この動画の計算）`, { x: 180, y: 700, w: 1300, size: 24, weight: 700, at: 3, delay: 0.3 });
      return { plot: new Plot({ x: 180, y: 130, w: 1270, h: 500, xr: [0, PHI.span], yr: [PHI.low * 1.35, -PHI.low * 0.9] }) };
    },
    draw(ctx, s, st) {
      const plot = st.plot;
      const alpha = s.p(0, 0.7);
      plot.axes(ctx, { xlabel: '進む距離 α', ylabel: 'φ(α) − φ(0)', alpha, zero: true, fmtY: (v) => fmt(v, 1) });
      if (s.beat >= 2) {
        let start = null;
        const k = s.p(2, 0.8);
        PHI.alphas.forEach((a, i) => {
          if (PHI.accepted[i] && start === null) start = a;
          if ((!PHI.accepted[i] || i === PHI.alphas.length - 1) && start !== null) {
            plot.shade(ctx, start, a, { color: C.aqua, alpha: 0.2 * k });
            start = null;
          }
        });
      }
      plot.line(ctx, PHI.alphas, PHI.values, { color: C.text, alpha, width: 3.5 });
      if (s.beat >= 1) {
        const k = s.p(1, 0.8);
        plot.line(ctx, PHI.alphas, PHI.tangent, { color: C.axis, dash: [8, 7], alpha: k, width: 2 });
        plot.line(ctx, PHI.alphas, PHI.alphas.map((a) => a * PHI.slope0 * 0.1), { color: C.yellow, alpha: k, width: 2.5 });
        canvasText(ctx, '黄色の線は見やすいように c₁ = 0.1 で描いた（実際の条件はもっとゆるい）', plot.x, plot.y + plot.h + 34, { size: 16, color: C.muted, alpha: k });
      }
    },
  });

  // ---------------------------------------------------------------- 第7章 理論
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '4つの手法の違いと、L-BFGS の限界',
    beats: [
      beat('4つの手法を並べます。勾配降下法は軽いですが、悪い条件数に弱い手法です。'),
      beat('ニュートン法は最も速く進みますが、ヘッセ行列が要ります。BFGS は行列を持ちますが、計算はしません。'),
      beat('L-BFGS は、記憶と手間が勾配降下法に近いまま、BFGS に近い進み方をします。変数の多い問題の標準になりました。'),
      beat('弱点もあります。ミニバッチのように勾配に乱れがあると、y の情報が崩れます。ニューラルネットの学習で確率的な手法が使われる理由の1つです。', 11),
      beat('変数に上限や下限があるときは、L-BFGS-B を使います。SciPy の標準の実装もこれで、前の動画の計算にも使いました。'),
    ],
    build(ui) {
      ui.table({
        x: LEFT_X, y: 120, widths: [260, 240, 240, 240, 430], size: 23, rowH: 56,
        header: ['手法', '記憶', '1回の手間', 'ヘッセ行列', '進み方'],
        rows: [
          ['勾配降下法', '$n$', '$n$', '使わない', '条件数が悪いと遅い'],
          ['ニュートン法', '$n^2$', '$n^3$', '計算する', '2次収束（最も速い）'],
          ['BFGS', '$n^2$', '$n^2$', '勾配の差で近似', '超1次収束'],
          ['L-BFGS', '$2mn$', '$mn$', '勾配の差で近似', '1次収束だが実用上は速い'],
        ],
        at: 0, rowAt: [0, 1, 1, 2], delay: 0.3, glowRows: [null, null, null, [{ from: 2, to: 3 }]],
      });
      ui.text('弱点', { x: LEFT_X, y: 430, size: 26, weight: 700, at: 3 });
      ui.text('ミニバッチの勾配：差 $\\mathbf{y}$ に乱れが入り、曲がり具合の情報が崩れる<br>滑らかでない関数：勾配の差が曲がり具合を表さない', { x: LEFT_X, y: 474, w: 1400, size: 24, color: C.text2, lh: 1.7, at: 3, delay: 0.4 });
      ui.text('変数に上下限があるとき：L-BFGS-B（バードほか 1995、ジューほか 1997）', { x: LEFT_X, y: 610, w: 1400, size: 25, weight: 700, at: 4 });
      ui.text('SciPy の minimize の method="L-BFGS-B" など', { x: LEFT_X, y: 660, size: 22, color: C.text2, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解
  const COMPARE_START = [-1.2, 1];
  const COMPARE_TOLERANCE = 1e-5;
  const LARGE_DIMENSION = 1000;
  const LARGE_CONDITION = 1e4;
  const MEMORY_SIZES = [1, 2, 3, 5, 10, 20, 50];
  const LARGE_TOLERANCE = 1e-5;
  const LARGE = (() => {
    const problem = O.spreadQuadratic(LARGE_DIMENSION, LARGE_CONDITION);
    const start = problem.lambda.map((_, i) => 1 + Math.sin(i));
    const rows = MEMORY_SIZES.map((memory) => ({ memory, evaluations: O.lbfgs(problem, start, { memory, tolerance: LARGE_TOLERANCE, iterations: 20000 }).evaluations }));
    const descent = O.gradientDescent(problem, start, { tolerance: LARGE_TOLERANCE, iterations: 60000 }).evaluations;
    return { rows, descent };
  })();
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: 'ローゼンブロック関数と、1000次元の問題',
    beats: [
      beat('同じ出発点から、4つの手法でローゼンブロック関数を解きました。棒は、勾配を計算した回数です。'),
      beat('勾配降下法は約6700回かかります。BFGS は64回、L-BFGS は記憶5組で45回です。'),
      beat('次は1000次元の2次関数です。条件数は1万で、ヘッセ行列をそのまま持つと8メガバイトになります。'),
      beat('L-BFGS の記憶 m を増やしていくと、1組で約1200回、10組で約1000回です。勾配降下法は約2万回でした。'),
      beat('m を増やす効果は、すぐに頭打ちになります。少しの記憶で、ほとんどの効果が得られます。'),
    ],
    build() {
      const box = { x: 90, y: 150, w: 720, h: 500 };
      const f = O.rosenbrock;
      const runs = [
        { name: '勾配降下法', color: D.COLOR.descent, run: O.gradientDescent(f, COMPARE_START, { iterations: 20000, tolerance: COMPARE_TOLERANCE }) },
        { name: 'ニュートン法', color: D.COLOR.newton, run: O.newton(f, COMPARE_START, { tolerance: COMPARE_TOLERANCE }) },
        { name: 'BFGS', color: D.COLOR.bfgs, run: O.bfgs(f, COMPARE_START, { tolerance: COMPARE_TOLERANCE }) },
        { name: 'L-BFGS（m = 5）', color: D.COLOR.lbfgs, run: O.lbfgs(f, COMPARE_START, { memory: 5, tolerance: COMPARE_TOLERANCE }) },
      ];
      return {
        runs,
        field: new D.Field({ box, xr: [-1.8, 1.8], yr: [-0.8, 2.0], f: f.f, levels: 2, floor: 0.05 }),
        plot: new Plot({ x: 200, y: 150, w: 1240, h: 480, xr: [0, MEMORY_SIZES.length], yr: [0, 4.6] }),
      };
    },
    draw(ctx, s, st) {
      const stageA = 1 - s.p(2, 0.6);
      if (stageA > 0) {
        const alpha = stageA * s.p(0, 0.7);
        st.field.draw(ctx, alpha);
        st.field.mark(ctx, [1, 1], { alpha });
        st.runs.forEach((item, i) => {
          ctx.save();
          ctx.globalAlpha *= stageA;
          st.field.path(ctx, item.run.path, { color: item.color, upto: i === 0 ? Math.sqrt(s.lin(0, 8, 0.6)) : s.lin(0, 8, 0.6), dots: false, width: 2.5 });
          ctx.restore();
          // 右の棒（対数）
          const y = 196 + i * 110;
          const value = item.run.evaluations;
          const k = s.p(1, 1, 0.2 * i);
          const width = (Math.log10(value) / 4) * 560 * k;
          canvasText(ctx, item.name, 880, y - 14, { size: 22, weight: 700, color: C.text, alpha });
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.fillStyle = item.color;
          ctx.fillRect(880, y, width, 34);
          ctx.restore();
          canvasText(ctx, `${value.toLocaleString('en-US')} 回`, 880 + width + 12, y + 25, { size: 21, color: C.text2, alpha: alpha * k });
        });
        canvasText(ctx, '勾配の計算回数（棒の長さは対数）', 880, 654, { size: 17, color: C.muted, alpha });
      }
      if (s.beat >= 2) {
        const alpha = s.p(2, 0.7, 0.4);
        const plot = st.plot;
        const exponent = (v) => `10${String(v).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
        canvasText(ctx, `${LARGE_DIMENSION} 次元の2次関数（条件数 ${LARGE_CONDITION.toLocaleString('en-US')}）を解く勾配の計算回数`, 800, 120, { size: 22, weight: 700, color: C.text, align: 'center', alpha });
        plot.axes(ctx, { yticks: [0, 1, 2, 3, 4], fmtY: exponent, alpha });
        const barW = (plot.w / MEMORY_SIZES.length) * 0.62;
        if (s.beat >= 3) {
          const k = s.p(3, 1.4);
          LARGE.rows.forEach((row, i) => {
            const cx = plot.x + (plot.w / MEMORY_SIZES.length) * (i + 0.5);
            const h = (Math.log10(row.evaluations) / 4.6) * plot.h * k;
            ctx.save();
            ctx.globalAlpha *= alpha;
            ctx.fillStyle = D.COLOR.lbfgs;
            ctx.fillRect(cx - barW / 2, plot.y + plot.h - h, barW, h);
            ctx.restore();
            canvasText(ctx, `m = ${row.memory}`, cx, plot.y + plot.h + 28, { size: 19, color: C.text2, align: 'center', alpha });
            canvasText(ctx, row.evaluations.toLocaleString('en-US'), cx, plot.y + plot.h - h - 10, { size: 19, color: C.text, align: 'center', alpha: alpha * k });
          });
          const y = plot.sy(Math.log10(LARGE.descent));
          plot.hline(ctx, Math.log10(LARGE.descent), { color: D.COLOR.descent, alpha: alpha * k, dash: [9, 7], width: 2.5 });
          canvasText(ctx, `勾配降下法 ${LARGE.descent.toLocaleString('en-US')} 回`, plot.x + plot.w, y - 10, { size: 20, weight: 700, color: C.text, align: 'right', alpha: alpha * k });
        }
      }
    },
  });

  // ---------------------------------------------------------------- 第8章 理論
  SCENES.push({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: 'ガウス過程の周辺尤度を最大にする',
    beats: [
      beat('ガウス過程の学習では、周辺尤度を最大にするハイパーパラメータを探します。勾配も、式で正確に計算できます。'),
      beat('1回の計算は重く、データ数の3乗かかります。だから、勾配を計算する回数をできるだけ減らしたいのです。'),
      beat('一方で、パラメータの数は多くても数十です。勾配は乱れがなく、関数は滑らかです。これは L-BFGS が最も得意な形です。'),
      beat('論文の実験も、L-BFGS で500回まで最大化し、5回やり直しています。局所解があるので、やり直しが必要です。'),
      beat('分散や長さスケールは正の数なので、対数をとって最適化します。すると制約のない問題になります。'),
    ],
    build(ui) {
      ui.tex(R`\log p(\mathbf{y} \mid X, \boldsymbol\theta) = -\tfrac{1}{2}\, \mathbf{y}^{\top} K^{-1} \mathbf{y} - \tfrac{1}{2} \log|K| - \tfrac{N}{2} \log 2\pi`, { x: LEFT_X, y: 116, size: 30 });
      ui.tex(R`\frac{\partial}{\partial \theta_j} \log p = \tfrac{1}{2}\, \mathrm{tr}\!\left( \big(\boldsymbol\alpha \boldsymbol\alpha^{\top} - K^{-1}\big)\, \frac{\partial K}{\partial \theta_j} \right), \qquad \boldsymbol\alpha = K^{-1} \mathbf{y}`, { x: LEFT_X, y: 196, size: 28, delay: 0.5 });
      ui.table({
        x: LEFT_X, y: 320, widths: [420, 900], size: 23, rowH: 50,
        header: ['ガウス過程の学習の特徴', 'L-BFGS との相性'],
        rows: [
          ['1回の評価に $O(N^3)$', '勾配の計算回数が少ないほど良い'],
          ['パラメータは数個〜数十個', '少しの記憶で曲がり具合をつかめる'],
          ['勾配に乱れがない', '$\\mathbf{y}$ の情報が崩れない'],
          ['局所解がある', '乱数でやり直す（論文は5回）'],
        ],
        at: 1, rowAt: [1, 2, 2, 3], delay: 0.3,
      });
      ui.tex(R`\sigma^2 = e^{\,\theta} \quad (\theta \text{ は正負どちらでもよい})`, { x: LEFT_X, y: 630, size: 28, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第8章 図解
  const CURVE_COLORS = { descent: D.COLOR.descent, bfgs: D.COLOR.bfgs, lbfgs: D.COLOR.lbfgs };
  const CURVE_NAMES = { descent: '勾配降下法', bfgs: 'BFGS', lbfgs: 'L-BFGS（m = 10）' };
  const CURVE_FLOOR = 1e-3;
  const CURVE_LIMIT = 150;
  SCENES.push({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: '周辺尤度の最大化を比べる',
    beats: [
      beat(`加法ガウス過程の周辺尤度を、同じ初期値から3つの手法で最適化しました。データは${DATA.points}点、パラメータは${DATA.parameters}個です。`),
      beat('横軸は勾配を計算した回数、縦軸は一番良い値との差です。下に行くほど良く、縦軸は対数です。'),
      beat(`L-BFGS は${DATA.summary.lbfgs.withinOne}回で、差が1より小さくなりました。BFGS は${DATA.summary.bfgs.withinOne}回です。ただ、そこから先の細かい詰めは、行列を全部持つ BFGS が速くなります。`, 11),
      beat('勾配降下法は、300回でも差が1より小さくなりません。1回がデータ数の3乗の計算なので、この差はそのまま時間の差になります。', 10),
    ],
    build(ui) {
      ui.table({
        x: 1000, y: 200, widths: [220, 280], size: 22, rowH: 52,
        header: ['手法', '差が 1 未満になる回数'],
        rows: ['lbfgs', 'bfgs', 'descent'].map((k) => [CURVE_NAMES[k].replace('（m = 10）', ''), DATA.summary[k].withinOne ? `${DATA.summary[k].withinOne} 回` : '300 回でも届かず']),
        at: 2, rowAt: [2, 2, 3], delay: 0.4,
      });
      ui.text('この動画の計算（SciPy の L-BFGS-B と BFGS、バックトラックつきの勾配降下法）', { x: 1000, y: 430, w: 520, size: 18, color: C.muted, lh: 1.5, at: 3, delay: 0.6 });
      return {
        plot: new Plot({ x: 150, y: 140, w: 780, h: 520, xr: [1, CURVE_LIMIT], yr: [Math.log10(CURVE_FLOOR), 3.2] }),
        xs: Array.from({ length: CURVE_LIMIT }, (_, i) => i + 1),
      };
    },
    draw(ctx, s, st) {
      const plot = st.plot;
      const alpha = s.p(0, 0.7);
      plot.axes(ctx, { xticks: [1, 50, 100, 150], yticks: [-2, -1, 0, 1, 2, 3], fmtY: (v) => (v >= 0 ? String(10 ** v) : `10${v === -1 ? '⁻¹' : '⁻²'}`), xlabel: '勾配の計算回数', ylabel: '一番良い値との差', alpha, zero: false });
      plot.hline(ctx, 0, { color: C.yellow, alpha: s.p(2, 0.7), dash: [8, 7] });
      ['descent', 'bfgs', 'lbfgs'].forEach((name) => {
        const curve = DATA.curves[name];
        const ys = st.xs.map((_, i) => Math.log10(Math.max(CURVE_FLOOR, curve[Math.min(i, curve.length - 1)] - DATA.best)));
        plot.line(ctx, st.xs, ys, { color: CURVE_COLORS[name], width: 3.5, upto: s.lin(1, 6, 0.5), alpha });
      });
      legend(ctx, ['lbfgs', 'bfgs', 'descent'].map((k) => ({ color: CURVE_COLORS[k], label: CURVE_NAMES[k] })), 300, 720, { alpha: s.p(1, 0.6), size: 18 });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '9',
    chapter: 9,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。勾配だけで進むと、細い谷で遅くなります。ニュートン法は曲がり具合を使って解決しますが、行列の記憶と計算が重くなります。', 11),
      beat('準ニュートン法は、勾配の差から曲がり具合を知ります。BFGS は割線条件を満たしながら、逆ヘッセ行列の近似を育てます。'),
      beat('L-BFGS は最近の m 組だけを覚え、2ループ再帰で行列を作らずに向きを求めます。ウルフ条件の直線探索が、これを支えています。', 10),
      beat('勾配が正確で滑らかな問題に強く、ガウス過程の周辺尤度の最大化に向いています。ミニバッチの乱れには弱い手法です。'),
    ],
    build(ui) {
      const points = [
        [0, '勾配だけでは細い谷でジグザグになる（条件数 $\\kappa$ に比例して遅くなる）'],
        [0, 'ニュートン法は $-H^{-1}\\mathbf{g}$。速いが記憶 $n^2$、手間 $n^3$'],
        [1, 'BFGS は割線条件 $H\\mathbf{y} = \\mathbf{s}$ を満たしながら、ヘッセ行列を計算せずに $H^{-1}$ を近似する'],
        [2, 'L-BFGS は最近の $m$ 組だけを記憶し、2ループ再帰で $H\\mathbf{g}$ を求める。記憶 $2mn$'],
        [2, 'ウルフ条件の直線探索が $\\mathbf{y}^{\\top}\\mathbf{s} > 0$ を保証する'],
        [3, '勾配が正確で滑らかな問題に強い。ミニバッチの乱れには弱い。上下限つきは L-BFGS-B'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 116 + i * 58, w: 1420, size: 24, at, delay: i === 1 || i === 4 ? 0.6 : 0 }));
      ui.text('文献：J. Nocedal, Updating quasi-Newton matrices with limited storage, Math. Comp. 35 (1980) 773–782 ／ D. C. Liu, J. Nocedal, On the limited memory BFGS method for large scale optimization, Math. Program. 45 (1989) 503–528 ／ R. H. Byrd, P. Lu, J. Nocedal, C. Zhu, A limited memory algorithm for bound constrained optimization, SIAM J. Sci. Comput. 16 (1995) 1190–1208 ／ C. Zhu, R. H. Byrd, P. Lu, J. Nocedal, Algorithm 778: L-BFGS-B, ACM TOMS 23 (1997) 550–560 ／ J. Nocedal, S. J. Wright, Numerical Optimization, Springer ／ D. Duvenaud, H. Nickisch, C. E. Rasmussen, Additive Gaussian processes, NIPS 24 (2011)', {
        x: LEFT_X, y: 480, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 3, delay: 1,
      });
      ui.text('図の数値はこの動画のために計算した（JavaScript の自作の実装と、SciPy）', { x: LEFT_X, y: 640, w: 1420, size: 16, color: C.muted, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、L-BFGS 法の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('L-BFGS 法 ― 勾配の履歴だけで曲がり具合を学ぶ', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
