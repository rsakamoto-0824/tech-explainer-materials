// scenes-oak.js — 第5〜7章（識別できない問題、OAK、OAK を試す）、まとめ、おわり。
// 数値は tools/make_data.py の結果（follow-data.js）から表示する。
(() => {
  const { W, C, Plot, fmt, canvasText, lerp, clamp, legend, rgba } = KIT;
  const M = FOLLOWM;
  const DATA = window.FOLLOWDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const COLOR = { additive: C.blue, oak: C.orange, truth: C.text };
  const ID = DATA.identify;
  const percent = (v) => `${(v * 100).toFixed(v >= 0.0995 ? 0 : 1)}%`;
  const average = (values) => values.reduce((a, b) => a + b, 0) / values.length;

  function orderBars(ctx, box, shares, { color = C.orange, alpha = 1, labelSize = 15, valueSize = 15, highlight = null } = {}) {
    const count = shares.length;
    const gap = box.w / count;
    const barW = gap * 0.68;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.h);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.stroke();
    shares.forEach((value, i) => {
      const x = box.x + gap * (i + 0.5) - barW / 2;
      const h = Math.max(0, value) * box.h;
      ctx.fillStyle = highlight === i + 1 ? color : rgba(color, 0.75);
      ctx.fillRect(x, box.y + box.h - h, barW, h);
      canvasText(ctx, String(i + 1), x + barW / 2, box.y + box.h + labelSize + 6, { size: labelSize, color: C.muted, align: 'center' });
      if (value >= 0.005) canvasText(ctx, percent(value), x + barW / 2, box.y + box.h - h - 7, { size: valueSize, color: C.text2, align: 'center' });
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: '項が重なると、分解が定まらない',
    beats: [
      beat('加法の分解には、大きな落とし穴があります。1次の項の片方に定数を足し、もう片方から引いても、和は変わりません。'),
      beat('定数だけではありません。高い次数の項は、低い次数の項の形も表せます。2次の項が、1次の項の役割を吸い取ってしまうのです。'),
      beat('前の動画の実験を思い出してください。3次の関数なのに、300点では5次と推定されました。これも、項が重なっていることの表れです。'),
      beat('つまり、予測は当たっても、次数の分散や項の形は、そのまま信じられません。ルーらはこれを、識別できない問題として整理しました。'),
      beat('論文の例の関数で確かめます。本当は1次の項が中心の関数です。'),
    ],
    build(ui) {
      ui.tex(R`f(x_1, x_2) = f_1(x_1) + f_2(x_2) = \big(f_1(x_1) + \Delta\big) + \big(f_2(x_2) - \Delta\big)`, { x: LEFT_X, y: 124, size: 31 });
      ui.text('どの $\\Delta$ でも同じ関数。分解は1つに定まらない', { x: LEFT_X, y: 196, size: 25, weight: 700, delay: 0.5 });
      ui.text('高い次数の項は、低い次数の項の形も表せる（2次の項が1次の項を吸収する）', { x: LEFT_X, y: 276, size: 26, weight: 700, at: 1 });
      ui.table({
        x: LEFT_X, y: 350, widths: [420, 300, 300, 300], size: 23, rowH: 46,
        header: ['3次の関数（前の動画の実験）', '300 点', '600 点', '1000 点'],
        rows: [['一番大きい次数', '5次', '4次', '3次']],
        at: 2, delay: 0.3,
      });
      ui.text('予測は当たっても、次数の分散や項の形はそのまま信じられない', { x: LEFT_X, y: 496, size: 27, weight: 700, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.tex(R`f(x_1, x_2) = x_1^2 - 2 x_2 + \cos(3 x_1) \sin(5 x_2), \quad x_i \sim \mathrm{U}(-1, 1)`, { x: LEFT_X, y: 586, size: 29, at: 4 });
      ui.text('ルーほか（2022）の式 (5) の例', { x: LEFT_X, y: 660, size: 21, color: C.muted, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: '加法ガウス過程の1次の項（この動画の計算）',
    beats: [
      beat('論文の例の関数から200点を作り、加法ガウス過程を学習しました。点線が、本当の1次の項です。'),
      beat('青が、学習した1次の項です。本当の形と全く違います。どちらもほぼゼロで、平らな線になりました。'),
      beat(`次数の分散を見ると、2次が${percent(ID.shares.additive[1])}でした。本当は1次の項の分散が約85%なので、大きく間違っています。`),
      beat('それでも予測自体は当たります。1次の働きを、2次の項が吸い取って、全部を説明しているからです。'),
    ],
    build() {
      return {
        left: new Plot({ x: 110, y: 150, w: 640, h: 480, xr: [-1, 1], yr: [-2.8, 2.8] }),
        right: new Plot({ x: 850, y: 150, w: 640, h: 480, xr: [-1, 1], yr: [-2.8, 2.8] }),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.7);
      const panel = (plot, truth, learned, title, axis) => {
        plot.axes(ctx, { xticks: [-1, 0, 1], yticks: [-2, 0, 2], xlabel: axis, ylabel: title, alpha });
        plot.line(ctx, ID.axis, truth, { color: COLOR.truth, dash: [9, 7], width: 3, alpha });
        plot.line(ctx, ID.axis, learned, { color: COLOR.additive, width: 3.5, alpha: s.p(1, 0.6), upto: s.p(1, 2) });
      };
      panel(st.left, ID.truth1, ID.additive1, '1次の項 f₁(x₁)', 'x₁');
      panel(st.right, ID.truth2, ID.additive2, '1次の項 f₂(x₂)', 'x₂');
      legend(ctx, [{ color: COLOR.truth, dash: [9, 7], label: '本当の項（定数を除く）' }, { color: COLOR.additive, label: '加法ガウス過程の項' }], 480, 722, { alpha, size: 18 });
    },
  });

  // ---------------------------------------------------------------- 第6章 理論
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '項を直交させる',
    beats: [
      beat('解決の鍵は、各項に条件を付けることです。入力の分布 p で平均すると、ゼロになる関数だけを許します。'),
      beat('この条件を付けたガウス過程も、やはりガウス過程です。カーネルは、もとのカーネルから1つの項を引いた形になります。'),
      beat('SE カーネルで入力が正規分布なら、式で書けます。一様分布や、データそのものの分布でも計算できます。'),
      beat('高い次数の項は、制約つきのカーネルの積にします。すると項どうしは直交し、分解は関数の ANOVA 分解と一致して、1つに定まります。'),
      beat('この考えはデュランデらが2012年に示しました。ルーらは、次数の分散を持つ加法カーネルと組み合わせ、ニュートン・ジラールの公式で計算しました。これが OAK です。', 12),
    ],
    build(ui) {
      ui.tex(R`\int f_i(x_i)\, p_i(x_i)\, dx_i = 0`, { x: LEFT_X, y: 118, size: 33 });
      ui.tex(R`\tilde{k}(x, x') = k(x, x') - \frac{\int p(s)\, k(x, s)\, ds \;\; \int p(s)\, k(x', s)\, ds}{\iint p(s)\, p(t)\, k(s, t)\, ds\, dt}`, { x: LEFT_X, y: 206, size: 31, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`p = \mathcal{N}(\mu, \delta^2): \quad \tilde{k}(x, x') = e^{-\frac{(x - x')^2}{2\ell^2}} - \frac{\ell \sqrt{\ell^2 + 2\delta^2}}{\ell^2 + \delta^2}\, e^{-\frac{(x-\mu)^2 + (x'-\mu)^2}{2(\ell^2 + \delta^2)}}`, { x: LEFT_X, y: 330, size: 28, at: 2 });
      ui.tex(R`\tilde{k}_S(\mathbf{x}, \mathbf{x}') = \prod_{i \in S} \tilde{k}_i(x_i, x_i') \quad \Rightarrow \quad \text{項どうしが直交し、分解は ANOVA 分解として1つに定まる}`, { x: LEFT_X, y: 442, size: 27, at: 3 });
      ui.tex(R`k_{\mathrm{OAK}} = \sigma_0^2 + \sum_{n=1}^{D} \sigma_n^2\; e_n\big(\tilde{k}_1, \ldots, \tilde{k}_D\big)`, { x: LEFT_X, y: 536, size: 31, at: 4, glow: [{ from: 4 }] });
      ui.text('制約つきのカーネル：デュランデほか（2012, 2013）。OAK：ルーほか（2022）。項の大きさはソボル指数で測る', { x: LEFT_X, y: 648, w: 1400, size: 22, color: C.text2, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解: k と k̃
  const K_ELL = 0.5;
  const K_POINTS = 101;
  const K_AXIS = Array.from({ length: K_POINTS }, (_, i) => -1 + (2 * i) / (K_POINTS - 1));
  const K_TOTAL = M.totalKernel(K_ELL);
  const K_SEEDS = [3, 8, 12, 21, 30];
  const K_DRAWS = (() => {
    const jitter = 1e-7;
    const kernelMatrix = (fn) => K_AXIS.map((a, i) => K_AXIS.map((b, j) => fn(a, b) + (i === j ? jitter : 0)));
    const plain = M.cholesky(kernelMatrix((a, b) => M.se(a, b, K_ELL)));
    const bounded = M.cholesky(kernelMatrix((a, b) => M.constrained(a, b, K_ELL, K_TOTAL)));
    const mean = (values) => values.reduce((p, v) => p + v, 0) / values.length;
    const make = (L) => K_SEEDS.map((seed) => M.drawFrom(L, seed));
    const a = make(plain);
    const b = make(bounded);
    return { plain: a, bounded: b, plainMeans: a.map(mean), boundedMeans: b.map(mean) };
  })();
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '制約つきのカーネルと、そこから引いた関数',
    beats: [
      beat('左は、x′ を0に固定したカーネルの形です。入力の分布は、マイナス1から1の一様分布です。'),
      beat('点線が SE カーネル、橙が制約つきのカーネルです。平均を引いた分だけ下がり、負の値もとります。'),
      beat('右の上段は、SE カーネルから引いた関数です。関数ごとに、全体が上下にずれています。右の棒は各関数の平均です。'),
      beat('右の下段は、制約つきのカーネルから引いた関数です。形は違っても、平均はどれもほぼゼロです。これが項の位置を固定する仕組みです。', 11),
    ],
    build() {
      return {
        kernel: new Plot({ x: 110, y: 150, w: 560, h: 500, xr: [-1, 1], yr: [-0.6, 1.1] }),
        upper: new Plot({ x: 800, y: 140, w: 560, h: 240, xr: [-1, 1], yr: [-3, 3] }),
        lower: new Plot({ x: 800, y: 430, w: 560, h: 240, xr: [-1, 1], yr: [-3, 3] }),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.7);
      st.kernel.axes(ctx, { xticks: [-1, 0, 1], yticks: [-0.5, 0, 0.5, 1], fmtY: (v) => fmt(v, 1), xlabel: 'x', ylabel: "k(x, 0)", alpha });
      st.kernel.line(ctx, K_AXIS, K_AXIS.map((x) => M.se(x, 0, K_ELL)), { color: C.text, dash: [9, 7], width: 3, alpha });
      st.kernel.line(ctx, K_AXIS, K_AXIS.map((x) => M.constrained(x, 0, K_ELL, K_TOTAL)), { color: COLOR.oak, width: 3.5, alpha: s.p(1, 0.6), upto: s.p(1, 2) });
      const lineColors = [C.blue, C.aqua, C.yellow, C.violet, C.red];
      const panel = (plot, draws, means, at, label) => {
        const k = s.p(at, 0.7);
        if (k <= 0) return;
        plot.axes(ctx, { xticks: at === 3 ? [-1, 0, 1] : [], yticks: [-2, 0, 2], ylabel: label, alpha: k });
        draws.forEach((values, i) => plot.line(ctx, K_AXIS, values, { color: lineColors[i], width: 2.2, alpha: k, upto: s.p(at, 2, 0.1 * i) }));
        means.forEach((value, i) => {
          const y = plot.sy(value);
          ctx.save();
          ctx.globalAlpha *= k;
          ctx.fillStyle = lineColors[i];
          ctx.fillRect(plot.x + plot.w + 14 + i * 12, Math.min(y, plot.sy(0)), 9, Math.abs(y - plot.sy(0)) + 2);
          ctx.restore();
        });
        canvasText(ctx, '平均', plot.x + plot.w + 44, plot.y + plot.h + 18, { size: 16, color: C.muted, align: 'center', alpha: k });
      };
      panel(st.upper, K_DRAWS.plain, K_DRAWS.plainMeans, 2, 'SE カーネルの関数');
      panel(st.lower, K_DRAWS.bounded, K_DRAWS.boundedMeans, 3, '制約つきカーネルの関数');
    },
  });

  // ---------------------------------------------------------------- 第7章 理論
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: 'OAK で何が変わるか',
    beats: [
      beat('OAK では、項が直交するので、関数全体の分散が、項ごとの分散の和に分かれます。各項の割合が、ソボル指数です。'),
      beat('論文は、回帰の実データで、多くの場合、3次以下の項で分散のほとんどを説明できたと報告しています。予測の精度は、もとの加法モデルと有意な差がありませんでした。', 11),
      beat('これは、もとの論文の表1で、高い次数に分散が集まったことと対照的です。項が重ならなければ、低い次数で足りることが多い、というわけです。'),
      beat('計算も有利です。補助点を使う疎なガウス過程と組み合わせると、必要な補助点の数が減ることが示されています。'),
      beat('では、前の動画と同じ実験を、OAK でやり直してみます。'),
    ],
    build(ui) {
      ui.tex(R`\mathrm{Var}[f] = \sum_{S} R_S, \qquad R_S = \mathrm{Var}[f_S]`, { x: LEFT_X, y: 124, size: 33 });
      ui.text('$R_S$：ソボル指数。項が直交しているので、分散が項ごとに分かれる', { x: LEFT_X, y: 214, size: 24, color: C.text2, delay: 0.5 });
      ui.table({
        x: LEFT_X, y: 290, widths: [340, 500, 500], size: 23, rowH: 54,
        header: ['', '加法ガウス過程（2011）', 'OAK（2022）'],
        rows: [
          ['項どうし', '重なる', '直交する'],
          ['項の大きさ', '次数の分散 $\\sigma_n^2$', 'ソボル指数 $R_S$'],
          ['実データの次数', '高い次数も多い', '多くは3次以下'],
          ['補助点の数', '多い', '少なくて済む'],
        ],
        at: 0, rowAt: [0, 0, 1, 3], delay: 0.4,
      });
      ui.text('もとの論文の表1と違う理由：項が重ならなければ、低い次数で足りることが多い', { x: LEFT_X, y: 590, w: 1400, size: 26, weight: 700, at: 2, delay: 0.6 });
      ui.text('次の図解：前の動画と同じ実験を OAK でやり直す', { x: LEFT_X, y: 664, size: 25, color: C.text2, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解
  const ROWS = DATA.orders.rows;
  const CV = DATA['concrete-oak'];
  const PREVIOUS = { additive: 0.055, se: 0.086, gam: 0.097, shares: [0.8882, 0, 0.078, 0.0319, 0.0019, 0, 0, 0] }; // 加法ガウス過程の動画の計算
  const OAK_MSE = average(CV.errors);
  const OAK_SHARES = CV.shares[0].map((_, i) => average(CV.shares.map((row) => row[i])));
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: 'OAK を試す（この動画の計算）',
    beats: [
      beat('まず、さきほどの例です。橙が OAK の1次の項です。点線の本当の形と、ほぼ重なりました。青の加法ガウス過程とは大違いです。', 10),
      beat(`次数の分散は、1次が${percent(ID.shares.oak[0])}、2次が${percent(ID.shares.oak[1])}です。本当の値の約85%と15%に近く、項の形も大きさも正しく取り出せました。`),
      beat('次は、3次の関数です。データ数を変えて、次数ごとの項の分散の割合を比べます。上が加法ガウス過程、下が OAK です。'),
      beat('加法は300点で5次、600点で4次に集まりました。OAK は300点から3次に集まり、誤差もどの点数でも加法より小さくなりました。', 10),
      beat('コンクリート強度でも比べました。予測の誤差は同じ程度ですが、OAK では分散の93%が1次に集まり、4次以上はゼロになりました。読み解きやすい形で、同じ精度が出ています。', 12),
    ],
    build() {
      return {
        left: new Plot({ x: 110, y: 130, w: 660, h: 500, xr: [-1, 1], yr: [-2.8, 2.8] }),
        right: new Plot({ x: 850, y: 130, w: 660, h: 500, xr: [-1, 1], yr: [-2.8, 2.8] }),
      };
    },
    draw(ctx, s, st) {
      const stageA = 1 - s.p(2, 0.6);
      if (stageA > 0) {
        const alpha = stageA * s.p(0, 0.7);
        const panel = (plot, truth, additive, orthogonal, title, axis) => {
          plot.axes(ctx, { xticks: [-1, 0, 1], yticks: [-2, 0, 2], xlabel: axis, ylabel: title, alpha });
          plot.line(ctx, ID.axis, additive, { color: COLOR.additive, width: 2.5, alpha: alpha * 0.7 });
          plot.line(ctx, ID.axis, orthogonal, { color: COLOR.oak, width: 4, alpha, upto: s.p(0, 2.5, 0.5) });
          plot.line(ctx, ID.axis, truth, { color: COLOR.truth, dash: [9, 7], width: 2.5, alpha });
        };
        panel(st.left, ID.truth1, ID.additive1, ID.oak1, '1次の項 f₁(x₁)', 'x₁');
        panel(st.right, ID.truth2, ID.additive2, ID.oak2, '1次の項 f₂(x₂)', 'x₂');
        legend(ctx, [{ color: COLOR.truth, dash: [9, 7], label: '本当の項' }, { color: COLOR.additive, label: '加法ガウス過程' }, { color: COLOR.oak, label: 'OAK' }], 500, 722, { alpha, size: 18 });
      }
      const stageB = s.beat >= 2 ? s.p(2, 0.7, 0.4) * (1 - s.p(4, 0.6)) : 0;
      if (stageB > 0) {
        ROWS.forEach((row, i) => {
          const x = 240 + i * 440;
          const w = 370;
          canvasText(ctx, `${row.size} 点`, x + w / 2, 128, { size: 24, weight: 700, color: C.text, align: 'center', alpha: stageB });
          orderBars(ctx, { x, y: 170, w, h: 200 }, row.additive, { color: COLOR.additive, alpha: stageB, highlight: 3 });
          orderBars(ctx, { x, y: 450, w, h: 200 }, row.oak, { color: COLOR.oak, alpha: stageB * s.p(3, 0.6), highlight: 3 });
          canvasText(ctx, `誤差 ${fmt(row.rmse.additive, 2)}`, x + w / 2, 416, { size: 18, color: C.text2, align: 'center', alpha: stageB });
          canvasText(ctx, `誤差 ${fmt(row.rmse.oak, 2)}`, x + w / 2, 696, { size: 18, color: C.text2, align: 'center', alpha: stageB * s.p(3, 0.6) });
        });
        canvasText(ctx, '加法', 100, 280, { size: 24, weight: 700, color: C.text, alpha: stageB });
        canvasText(ctx, 'OAK', 100, 560, { size: 24, weight: 700, color: C.text, alpha: stageB * s.p(3, 0.6) });
      }
      if (s.beat >= 4) {
        const alpha = s.p(4, 0.7, 0.4);
        canvasText(ctx, 'コンクリート強度（10分割の平均）', W / 2, 130, { size: 24, weight: 700, color: C.text, align: 'center', alpha });
        canvasText(ctx, '加法ガウス過程', 400, 186, { size: 22, weight: 700, color: C.text, align: 'center', alpha });
        canvasText(ctx, 'OAK', 1190, 186, { size: 22, weight: 700, color: C.text, align: 'center', alpha });
        orderBars(ctx, { x: 110, y: 230, w: 620, h: 330 }, PREVIOUS.shares, { color: COLOR.additive, alpha, labelSize: 18, valueSize: 18 });
        orderBars(ctx, { x: 880, y: 230, w: 620, h: 330 }, OAK_SHARES, { color: COLOR.oak, alpha, labelSize: 18, valueSize: 18 });
        canvasText(ctx, `平均二乗誤差 ${fmt(PREVIOUS.additive, 3)}`, 420, 640, { size: 24, weight: 700, color: C.text, align: 'center', alpha });
        canvasText(ctx, `平均二乗誤差 ${fmt(OAK_MSE, 3)}`, 1190, 640, { size: 24, weight: 700, color: C.text, align: 'center', alpha });
        canvasText(ctx, '棒は次数ごとの割合（左は事前の分散、右は項の分散）。SE-GP は 0.086、GAM は 0.097', W / 2, 690, { size: 18, color: C.muted, align: 'center', alpha });
      }
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '9',
    chapter: 9,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。カーネルの和と積を文法とみる研究は、データから式を探す方法になり、自動統計家につながりました。'),
      beat('加法の構造は、高次元の回帰やベイズ最適化で、次元の呪いを和らげます。軸に沿わない項を足す、ランダム射影もあります。'),
      beat('一番の問題は、項が重なって識別できないことでした。OAK は入力の分布について項を直交させ、分解を1つに定めます。'),
      beat('予測だけなら2011年の形で十分なことも多いですが、項や次数を読み解きたいなら、直交させた形が安全です。'),
    ],
    build(ui) {
      const points = [
        [0, 'カーネルの文法（2013）：和と積で式を作り、周辺尤度を基準に探す。自動統計家（2014）へ'],
        [1, '高次元：SALSA（2016、ジラール・ニュートンの公式）、Add-GP-UCB（2015）、構造の学習（2017）'],
        [1, 'ランダム射影（2020）：軸に沿わない項を足す。全次元の逆マルチ二次カーネルに収束する'],
        [2, '識別できない問題：項が重なると、次数の分散も項の形も1つに定まらない'],
        [2, 'OAK（2022）：入力の分布で平均ゼロの制約。項が直交し、分解は ANOVA 分解として1つに定まる'],
        [3, '予測だけなら2011年の形でも十分なことが多い。項や次数を読み解くなら、直交させた形が安全'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 116 + i * 58, w: 1420, size: 24, at, delay: i === 2 || i === 4 ? 0.6 : 0 }));
      ui.text('文献：D. Duvenaud et al., Additive Gaussian processes, NIPS 24 (2011) ／ D. Duvenaud et al., Structure discovery in nonparametric regression through compositional kernel search, ICML 2013 ／ J. R. Lloyd et al., Automatic construction and natural-language description of nonparametric regression models, AAAI 2014 ／ K. Kandasamy, J. Schneider, B. Póczos, High dimensional Bayesian optimisation and bandits via additive models, ICML 2015 ／ K. Kandasamy, Y. Yu, Additive approximations in high dimensional nonparametric regression via the SALSA, ICML 2016 ／ J. Gardner et al., Discovering and exploiting additive structure for Bayesian optimization, AISTATS 2017 ／ I. Delbridge, D. Bindel, A. G. Wilson, Randomly projected additive Gaussian processes for regression, ICML 2020 ／ N. Durrande et al., ANOVA kernels and RKHS of zero mean functions for model-based sensitivity analysis, J. Multivariate Anal. 115 (2013) ／ X. Lu, A. Boukouvalas, J. Hensman, Additive Gaussian processes revisited, ICML 2022', {
        x: LEFT_X, y: 470, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 3, delay: 1,
      });
      ui.text('実験はこの動画のために計算した（Python の自作の実装、NumPy・SciPy）。コンクリート強度のデータ：I-C. Yeh, UCI Machine Learning Repository（CC BY 4.0）', { x: LEFT_X, y: 690, w: 1420, size: 16, color: C.muted, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、加法ガウス過程の後続研究の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('加法ガウス過程の後続研究 ― 構造の探索から直交加法カーネルまで', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
