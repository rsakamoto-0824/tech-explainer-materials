// scenes-use.js — 第5〜7章（計算の手順と手間、桁落ち、多項式の根と行列）、まとめ、おわり。
// 第6章の実験は、整数の計算（BigInt）で正確な値を求めて、倍精度の結果と比べる。
(() => {
  const { W, C, Plot, fmt, texNum, canvasText, lerp, clamp, legend, rgba, roundRect } = KIT;
  const M = NGM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const CARD_X = 1010;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const COLOR = { formula: C.red, product: C.aqua, truncated: C.yellow };

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: '計算の手順と手間',
    beats: [
      beat('計算の手順です。まず、べき和 s を、1から R まで作ります。前の z のべきに z を掛ければ、1つの数あたり1回の掛け算で済みます。'),
      beat('次に、n を1から R まで増やしながら、$e_n$ を求めます。使うのは、すでに求めた e と s だけです。'),
      beat('手間は、べき和で D かける R 回、漸化式で R の2乗の半分の回です。R が D なら、D の2乗の程度です。'),
      beat('グラム行列では、これを点の組の数だけ繰り返すので、N の2乗に D と R を掛けた手間になります。'),
      beat('微分も同じように計算できます。$e_n$ を $z_j$ で微分すると、$z_j$ を除いた $e_{n-1}$ です。除く計算は、1つ下の値から順に引くだけです。', 11),
    ],
    build(ui) {
      const lines = [
        [0, R`s_k = \sum_{i=1}^{D} z_i^{\,k} \quad (k = 1, \ldots, R)`, 112],
        [1, R`e_0 = 1, \qquad e_n = \frac{1}{n} \sum_{k=1}^{n} (-1)^{k-1} e_{n-k}\, s_k \quad (n = 1, \ldots, R)`, 196],
      ];
      lines.forEach(([at, tex, y]) => ui.tex(tex, { x: LEFT_X, y, size: 31, at }));
      ui.table({
        x: LEFT_X, y: 310, widths: [460, 420, 460], size: 23, rowH: 48,
        header: ['計算', '掛け算の回数', '備考'],
        rows: [
          ['べき和', '$D R$', '$R$ は使う最高の次数'],
          ['漸化式', '$R^2 / 2$', '$R = D$ なら $D^2 / 2$'],
          ['グラム行列の全体', '$O(N^2 D R)$', '$N$：データ数'],
        ],
        at: 2, rowAt: [2, 2, 3], delay: 0.3,
      });
      ui.tex(R`\frac{\partial e_n}{\partial z_j} = e_{n-1}(z_{\setminus j}), \qquad e_m(z_{\setminus j}) = e_m - z_j\, e_{m-1}(z_{\setminus j})`, { x: LEFT_X, y: 540, size: 30, at: 4 });
      ui.text('周辺尤度の勾配に使う（論文の式 7）', { x: LEFT_X, y: 650, size: 23, color: C.text2, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解: 手順
  const DEMO = [0.9, 0.6, 0.4, 0.2];
  const DEMO_S = M.powerSums(DEMO);
  const DEMO_E = M.newtonGirard(DEMO);
  const TABLE = { x: 380, y: 180, w: 190, h: 74 };
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '表を埋めていく',
    beats: [
      beat('上の段がべき和、下の段が e です。$e_0$ は1と決めます。べき和は全部先に求めておきます。'),
      beat('$e_1$ は、$s_1$ と $e_0$ から求まります。使うマスを黄色で示します。'),
      beat('$e_2$ は、$s_1$、$s_2$ と、$e_0$、$e_1$ を使います。$e_3$ は3組、$e_4$ は4組を使います。'),
      beat('つまり n 番目の計算は n 回の掛け算です。全部で R の2乗の半分の回で、表が埋まります。'),
      beat('一方、項を全部並べると、30次元で約10億項です。公式なら掛け算は約1400回で済みます。'),
    ],
    build(ui) {
      ui.text('全部列挙：約 $1.6 \\times 10^{10}$ 回 ／ 公式：1,365 回（$D = 30$、掛け算の回数の目安）', { x: 150, y: 640, w: 1300, size: 26, weight: 700, at: 4, delay: 0.4 });
      return {};
    },
    draw(ctx, s) {
      const alpha = s.p(0, 0.6);
      const cell = (x, y, label, value, on, shown = 1) => {
        if (shown <= 0) return;
        ctx.save();
        ctx.globalAlpha *= shown;
        roundRect(ctx, x + 4, y + 4, TABLE.w - 8, TABLE.h - 8, 10);
        ctx.fillStyle = on ? rgba(C.yellow, 0.6) : 'rgba(255,255,255,0.07)';
        ctx.fill();
        ctx.restore();
        canvasText(ctx, label, x + 24, y + 44, { size: 22, weight: 700, color: C.text2, alpha: shown });
        canvasText(ctx, value, x + TABLE.w - 22, y + 44, { size: 24, weight: 700, color: C.text, align: 'right', alpha: shown });
      };
      // いま計算している n
      const current = s.beat === 1 ? 1 : s.beat === 2 ? 2 + Math.floor(clamp((s.u - s.bt(2)) / (s.bt(3) - s.bt(2)) * 3, 0, 2.99)) : 0;
      for (let k = 1; k <= 4; k++) {
        cell(TABLE.x + TABLE.w * (k - 1), TABLE.y, `s${'₁₂₃₄'[k - 1]}`, fmt(DEMO_S[k], 3), current > 0 && k <= current, alpha);
      }
      const finished = s.beat >= 3 ? 4 : current;
      for (let n = 0; n <= 4; n++) {
        const x = TABLE.x + TABLE.w * (n - 1) - 0;
        const y = TABLE.y + 160;
        const shown = n === 0 ? alpha : n <= finished ? 1 : 0;
        cell(x, y, `e${'₀₁₂₃₄'[n]}`, fmt(DEMO_E[n], n === 4 ? 4 : 3), current > 0 && n < current, shown);
      }
      if (current > 0) {
        const terms = [];
        for (let k = 1; k <= current; k++) terms.push(`${k % 2 ? (k > 1 ? '＋' : '') : '−'}e${'₀₁₂₃₄'[current - k]}s${'₁₂₃₄'[k - 1]}`);
        canvasText(ctx, `${current} e${'₀₁₂₃₄'[current]} = ${terms.join(' ')}`, 800, 520, { size: 32, weight: 700, color: C.text, align: 'center' });
        canvasText(ctx, `掛け算 ${current} 回`, 800, 566, { size: 22, color: C.text2, align: 'center' });
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論
  const SHOW_D = 30;
  const SHOW = (() => {
    const r = M.makeRandom(1000 * SHOW_D);
    const z = Array.from({ length: SHOW_D }, () => r());
    const e = M.newtonGirard(z);
    const p = M.byProduct(z);
    const s = M.powerSums(z);
    const n = SHOW_D;
    const largest = Math.max(...Array.from({ length: n }, (_, i) => Math.abs(e[n - i - 1] * s[i + 1])));
    return { z, e, p, largest, trueLast: p[n], last: e[n] };
  })();
  const sci = (v, digits = 1) => {
    const [m, x] = Math.abs(v).toExponential(digits).split('e');
    return `${v < 0 ? '-' : ''}${m} \\times 10^{${Number(x)}}`;
  };
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '桁落ちの落とし穴',
    beats: [
      beat('公式には弱点があります。右辺は、符号が交互の和です。大きな数を足したり引いたりして、小さな答えを出します。'),
      beat('コンピュータの数の精度は、有効数字で約16桁です。大きな数の引き算で、上の桁が消えると、残った桁は誤差だらけになります。これが桁落ちです。', 11),
      beat('例えば30個の乱数で、最高次の $e_{30}$ を計算します。真の値は10のマイナス15乗くらいです。一方、足し引きする項は7000くらいの大きさです。', 12),
      beat('差は18桁以上あり、16桁の精度では表せません。公式の答えはマイナスになりました。正の数の積なのに、符号まで間違えています。', 11),
      beat('対策は簡単です。かっこ 1 + z t を、1つずつ掛けて係数を更新します。正の数を足すだけなので、桁落ちしません。手間も同じです。', 11),
    ],
    build(ui) {
      ui.tex(R`n\, e_n = e_{n-1} s_1 - e_{n-2} s_2 + e_{n-3} s_3 - \cdots`, { x: LEFT_X, y: 118, size: 31 });
      ui.text('大きな数の足し引きで、小さな答えを出す → 有効数字が消える（桁落ち）', { x: LEFT_X, y: 194, size: 24, weight: 700, at: 1 });
      ui.table({
        x: LEFT_X, y: 268, widths: [560, 380], size: 23, rowH: 50,
        header: [`乱数 ${SHOW_D} 個の例`, '大きさ'],
        rows: [
          [`足し引きする項の最大`, `$${sci(SHOW.largest)}$`],
          [`$e_{${SHOW_D}}$ の真の値`, `$${sci(SHOW.trueLast)}$`],
          [`公式で計算した $e_{${SHOW_D}}$`, `$${sci(SHOW.last)}$`],
        ],
        at: 2, rowAt: [2, 2, 3], delay: 0.4,
      });
      ui.text('倍精度の有効数字は約16桁', { x: 1120, y: 340, size: 23, color: C.text2, at: 3 });
      seeThrough(ui.card({ x: LEFT_X, y: 500, w: 1420, h: 200, at: 4, title: '対策：かっこを1つずつ掛ける' }));
      ui.tex(R`e_n \leftarrow e_n + z_i\, e_{n-1} \quad (i = 1, \ldots, D;\; n = R, \ldots, 1)`, { x: LEFT_X + 30, y: 566, size: 30, at: 4, delay: 0.3 });
      ui.text('正の数を足すだけなので桁落ちしない（$z_i \\ge 0$ のとき）。手間は同じ $O(DR)$', { x: LEFT_X + 30, y: 640, size: 24, color: C.text2, at: 4, delay: 0.7 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解
  const STABILITY_DIMENSIONS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  const STABILITY_TRIALS = 10;
  const TRUNCATED_ORDER = 10;
  const STABILITY = STABILITY_DIMENSIONS.map((D) => {
    const row = { D, formula: 0, product: 0, truncated: 0 };
    const worst = (z, method, order) => {
      const exact = M.exactElementary(z, order);
      const approx = method(z, order);
      let w = 0;
      for (let n = 1; n <= order; n++) w = Math.max(w, M.relativeError(approx[n], exact[n]));
      return w;
    };
    for (let t = 0; t < STABILITY_TRIALS; t++) {
      const r = M.makeRandom(1000 * D + t);
      const z = Array.from({ length: D }, () => r());
      row.formula = Math.max(row.formula, worst(z, M.newtonGirard, D));
      row.product = Math.max(row.product, worst(z, M.byProduct, D));
      row.truncated = Math.max(row.truncated, worst(z, M.newtonGirard, Math.min(TRUNCATED_ORDER, D)));
    }
    return row;
  });
  const logOf = (v) => Math.log10(Math.max(v, 1e-17));
  const Y_RANGE = [-17, 14];
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: 'どこで壊れるか（この動画の実験）',
    beats: [
      beat('0から1の乱数 z を D 個作り、$e_n$ を計算しました。整数で正確に求めた値と比べた、一番悪い相対誤差です。乱数を変えて10回ずつ試しました。', 11),
      beat('赤が公式です。次元が増えると誤差が急に増え、25次元で誤差は1を超えます。答えの桁も信用できません。'),
      beat('緑が、かっこを順に掛ける方法です。100次元でも、誤差は倍精度の限界の近くのままです。'),
      beat('黄色は、公式を10次までに限った場合です。こちらも壊れません。論文は速さのため10次までとしましたが、結果として精度も守られていました。', 11),
      beat('使い分けは簡単です。低い次数だけなら公式でもよく、高い次数まで使うなら、かっこを掛ける方法が安全です。'),
    ],
    build() {
      return { plot: new Plot({ x: 180, y: 140, w: 1200, h: 520, xr: [5, 100], yr: Y_RANGE }) };
    },
    draw(ctx, s, st) {
      const plot = st.plot;
      const alpha = s.p(0, 0.7);
      const exponent = (v) => `10${v < 0 ? '⁻' : ''}${String(Math.abs(v)).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
      plot.axes(ctx, { xticks: [5, 20, 40, 60, 80, 100], yticks: [-15, -10, -5, 0, 5, 10], fmtY: exponent, xlabel: '次元 D', ylabel: '一番悪い相対誤差', alpha, zero: false });
      plot.hline(ctx, 0, { color: C.muted, alpha, dash: [8, 7] });
      canvasText(ctx, '誤差 100%', plot.x + plot.w - 6, plot.sy(0) - 8, { size: 16, color: C.muted, align: 'right', alpha });
      const xs = STABILITY.map((r) => r.D);
      const series = [
        ['formula', 1, '公式（全次数）'],
        ['product', 2, 'かっこを順に掛ける（全次数）'],
        ['truncated', 3, '公式（10次まで）'],
      ];
      series.forEach(([key, at]) => {
        const k = s.p(at, 0.6);
        plot.line(ctx, xs, STABILITY.map((r) => logOf(r[key])), { color: COLOR[key], width: 3.5, alpha: k, upto: s.lin(at, 3, 0.2) });
        const inside = STABILITY.filter((r) => logOf(r[key]) <= Y_RANGE[1]);
        plot.dots(ctx, inside.map((r) => r.D), inside.map((r) => logOf(r[key])), { color: COLOR[key], r: 5, alpha: k });
      });
      legend(ctx, series.map(([key, , label]) => ({ color: COLOR[key], label })), 300, 724, { alpha, size: 18 });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論
  const ROOT_E = [1, 6, 11, 6];
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '多項式の根と行列',
    beats: [
      beat('公式はもともと、多項式の根の研究から生まれました。根を z とすると、多項式の係数は、符号を除いて $e_n$ です。'),
      beat('ということは、方程式を解かなくても、係数から根のべき和が分かります。公式を逆向きに使います。'),
      beat('ジラールが1629年に最初の4つを示し、ニュートンが1666年ごろに、独立に見つけました。1707年の算術の本で公表されています。'),
      beat('行列にも同じ関係があります。固有値を z とすると、べき和は、行列のべき乗の跡（トレース）です。掛け算だけで計算できます。'),
      beat('公式で $e_n$ を求めると、固有多項式の係数が出ます。$e_D$ は行列式です。ファデーエフ・ルベリエの方法と呼ばれます。'),
    ],
    build(ui) {
      ui.tex(R`\prod_{i=1}^{D} (x - z_i) = x^D - e_1 x^{D-1} + e_2 x^{D-2} - \cdots + (-1)^D e_D`, { x: LEFT_X, y: 116, size: 29 });
      ui.tex(R`s_n = (-1)^{n-1} n\, e_n + \sum_{k=1}^{n-1} (-1)^{k-1} e_k\, s_{n-k}`, { x: LEFT_X, y: 214, size: 30, at: 1 });
      ui.text('ジラール（1629、最初の4つ）、ニュートン（1666ごろ、『算術』1707で公表）', { x: LEFT_X, y: 326, size: 24, color: C.text2, at: 2 });
      ui.tex(R`A \text{ の固有値を } z_i \text{ とすると}: \quad s_k = \mathrm{tr}(A^k)`, { x: LEFT_X, y: 400, size: 30, at: 3 });
      ui.tex(R`\det(xI - A) = x^D - e_1 x^{D-1} + \cdots + (-1)^D e_D, \qquad e_D = \det A`, { x: LEFT_X, y: 480, size: 29, at: 4 });
      ui.text('跡だけから固有多項式が求まる（ファデーエフ・ルベリエの方法）', { x: LEFT_X, y: 570, size: 26, weight: 700, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解
  const MATRIX = [[2, 1, 0], [1, 3, 1], [0, 1, 4]];
  const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, v, k) => sum + v * B[k][j], 0)));
  const trace = (A) => A.reduce((sum, row, i) => sum + row[i], 0);
  const MATRIX_S = (() => {
    const A2 = matMul(MATRIX, MATRIX);
    const A3 = matMul(A2, MATRIX);
    return [0, trace(MATRIX), trace(A2), trace(A3)];
  })();
  const fromTraces = (s) => {
    const e = [1];
    for (let n = 1; n < s.length; n++) {
      let total = 0;
      for (let k = 1; k <= n; k++) total += (k % 2 ? 1 : -1) * e[n - k] * s[k];
      e.push(total / n);
    }
    return e;
  };
  const MATRIX_E = fromTraces(MATRIX_S);
  const DET = MATRIX[0][0] * (MATRIX[1][1] * MATRIX[2][2] - MATRIX[1][2] * MATRIX[2][1]) - MATRIX[0][1] * (MATRIX[1][0] * MATRIX[2][2] - MATRIX[1][2] * MATRIX[2][0]) + MATRIX[0][2] * (MATRIX[1][0] * MATRIX[2][1] - MATRIX[1][1] * MATRIX[2][0]);
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '解かずに分かる',
    beats: [
      beat('多項式 x の3乗引く6 x の2乗足す11 x 引く6 です。係数から、$e_1$ は6、$e_2$ は11、$e_3$ は6です。'),
      beat('公式で順に計算すると、根の1乗の和は6、2乗の和は14、3乗の和は36です。'),
      beat('実際の根は1、2、3です。2乗の和は14、3乗の和は36で、方程式を解かなくても正しく求まりました。'),
      beat('次は3行3列の行列です。A、A の2乗、A の3乗の跡を計算します。固有値は求めていません。'),
      beat('跡から公式で e を求めると、$e_3$ は行列式と一致します。固有値を知らずに、固有多項式が手に入りました。'),
    ],
    build(ui) {
      const eRoot = ROOT_E;
      ui.tex(R`x^3 - ${eRoot[1]} x^2 + ${eRoot[2]} x - ${eRoot[3]}`, { x: LEFT_X, y: 124, size: 32 });
      ui.tex(R`e_1 = ${eRoot[1]}, \quad e_2 = ${eRoot[2]}, \quad e_3 = ${eRoot[3]}`, { x: LEFT_X, y: 190, size: 27, delay: 0.5 });
      ui.tex(R`s_1 = e_1 = 6`, { x: LEFT_X, y: 262, size: 27, at: 1 });
      ui.tex(R`s_2 = e_1 s_1 - 2 e_2 = 36 - 22 = 14`, { x: LEFT_X, y: 322, size: 27, at: 1, delay: 0.5 });
      ui.tex(R`s_3 = e_1 s_2 - e_2 s_1 + 3 e_3 = 84 - 66 + 18 = 36`, { x: LEFT_X, y: 382, size: 27, at: 1, delay: 1 });
      ui.tex(R`\text{根は } 1, 2, 3: \quad 1 + 4 + 9 = 14, \quad 1 + 8 + 27 = 36`, { x: LEFT_X, y: 452, size: 27, at: 2, glow: [{ from: 2, to: 3, color: C.aqua }] });
      const rows = MATRIX.map((r) => r.join(' & ')).join(R` \\ `);
      ui.tex(R`A = \begin{pmatrix} ${rows} \end{pmatrix}`, { x: 930, y: 124, size: 30, at: 3 });
      ui.tex(R`\mathrm{tr}\,A = ${MATRIX_S[1]}, \quad \mathrm{tr}\,A^2 = ${MATRIX_S[2]}, \quad \mathrm{tr}\,A^3 = ${MATRIX_S[3]}`, { x: 930, y: 270, size: 26, at: 3, delay: 0.5 });
      ui.tex(R`e_1 = ${MATRIX_E[1]}, \quad e_2 = ${MATRIX_E[2]}, \quad e_3 = ${MATRIX_E[3]}`, { x: 930, y: 340, size: 27, at: 4 });
      ui.tex(R`\det A = ${DET} \;=\; e_3`, { x: 930, y: 410, size: 29, at: 4, delay: 0.6, glow: [{ from: 4, color: C.aqua }] });
      ui.tex(R`\det(xI - A) = x^3 - ${MATRIX_E[1]} x^2 + ${MATRIX_E[2]} x - ${MATRIX_E[3]}`, { x: 930, y: 490, size: 26, at: 4, delay: 1 });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '9',
    chapter: 9,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。ニュートン・ジラールの公式は、基本対称多項式 $e_n$ を、べき和 $s_k$ から順に求める漸化式です。'),
      beat('証明は2通りあります。項を2つずつ打ち消し合わせる証明と、生成関数の対数微分と係数比較です。'),
      beat('手間は次元の2乗程度で、指数個の項を列挙せずに足せます。ただし符号が交互の和なので、高い次数では桁落ちで壊れます。'),
      beat('高い次数まで使うなら、かっこを順に掛ける方法が安全です。公式は、多項式の根や行列の固有多項式にも現れます。'),
    ],
    build(ui) {
      const points = [
        [0, '$n\\, e_n = \\sum_{k=1}^{n} (-1)^{k-1} e_{n-k}\\, s_k$：べき和から基本対称多項式を順に求める'],
        [1, '証明は2通り：項が2つずつ打ち消し合う証明（ザイルバーガー）、生成関数の対数微分と係数比較'],
        [2, '手間は $O(D^2)$（$R$ 次までなら $O(DR)$）。加法カーネルは $O(N^2 D R)$ で計算できる'],
        [2, '交互の和なので桁落ちする：全次数を求めると $D = 25$ で誤差 100% 超（この動画の実験）'],
        [3, '高い次数まで使うなら、かっこを順に掛ける方法が安全（手間は同じ）。10次までなら公式でも壊れなかった'],
        [3, '多項式の根のべき和、行列の跡と固有多項式（ファデーエフ・ルベリエの方法）にも現れる'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 116 + i * 58, w: 1420, size: 24, at, delay: i === 3 || i === 5 ? 0.6 : 0 }));
      ui.text('文献：A. Girard, Invention nouvelle en l\'algèbre, 1629 ／ I. Newton, Arithmetica Universalis, 1707 ／ D. Zeilberger, A combinatorial proof of Newton\'s identities, Discrete Math. 49 (1984) 319 ／ I. G. Macdonald, Symmetric Functions and Hall Polynomials, Oxford Univ. Press ／ D. Duvenaud, H. Nickisch, C. E. Rasmussen, Additive Gaussian processes, NIPS 24 (2011)', {
        x: LEFT_X, y: 480, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 3, delay: 1,
      });
      ui.text('図の数値はこの動画のために計算した（JavaScript。正確な値は BigInt の整数計算で求めた）', { x: LEFT_X, y: 610, w: 1420, size: 16, color: C.muted, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、ニュートン・ジラールの公式の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('ニュートン・ジラールの公式 ― べき和から基本対称多項式へ', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
