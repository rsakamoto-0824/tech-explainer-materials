// scenes-results.js — 第5〜8章（次数の分散の学習、局所と非局所、遠くの予測、実験の結果と関連研究）、まとめ、おわり。
// 論文の表の数値はこのファイルの PAPER_* に書き写している。それ以外の数値は add-data.js（tools/make_data.py の計算結果）から表示する。
(() => {
  const { W, C, Plot, fmt, texNum, canvasText, lerp, clamp, legend, rgba, seqColor, hexToRgb, roundRect } = KIT;
  const D = ADDDRAW;
  const DATA = window.ADDDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const percent = (value) => `${(value * 100).toFixed(value > 0.9995 || value >= 0.0995 ? 0 : 1)}%`;

  // ---- 論文の表1（各次数の分散の割合 %、合計 100。空欄は入力の次元が足りない部分）----
  const PAPER_TABLE1 = [
    ['pima', [0.1, 0.1, 0.1, 0.3, 1.5, 96.4, 1.4, 0.0]],
    ['liver', [0.0, 0.2, 99.7, 0.1, 0.0, 0.0]],
    ['heart', [77.6, 0.0, 0.0, 0.0, 0.1, 0.1, 0.1, 0.1, 0.1, 22.0]],
    ['concrete', [70.6, 13.3, 13.8, 2.3, 0.0, 0.0, 0.0, 0.0]],
    ['pumadyn-8nh', [0.0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 99.5]],
    ['servo', [58.7, 27.4, 0.0, 13.9]],
    ['housing', [0.1, 0.6, 80.6, 1.4, 1.8, 0.8, 0.7, 0.8, 0.6, 12.7]],
  ];
  // ---- 論文の表2（回帰の平均二乗誤差）。best = 太字（最良、または最良と有意な差がない）----
  const PAPER_DATASETS = ['bach', 'concrete', 'pumadyn-8nh', 'servo', 'housing'];
  const PAPER_TABLE2 = [
    { name: '線形回帰', color: C.muted, values: [1.031, 0.404, 0.641, 0.523, 0.289], best: [] },
    { name: 'GP GAM', color: D.COLOR.gam, values: [1.259, 0.149, 0.598, 0.281, 0.161], best: [] },
    { name: 'HKL', color: C.violet, values: [0.199, 0.147, 0.346, 0.199, 0.151], best: [0] },
    { name: 'SE-GP', color: D.COLOR.se, values: [0.045, 0.157, 0.317, 0.126, 0.092], best: [0, 2, 3, 4] },
    { name: '加法ガウス過程', color: D.COLOR.additive, values: [0.045, 0.089, 0.316, 0.11, 0.102], best: [0, 1, 2, 3, 4] },
  ];
  const PAPER_CONCRETE = { additive: 0.089, se: 0.157, gam: 0.149 };

  // ---------------------------------------------------------------- 第5章 理論
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: '次数の分散を学習する',
    beats: [
      beat('学習するのは、次元ごとの長さスケール、次数ごとの分散、観測ノイズの分散です。'),
      beat('ふつうのガウス過程と同じく、周辺尤度を最大にします。データへの当てはまりと、モデルの複雑さのつり合いをとる指標です。'),
      beat('勾配の計算コストも低く求まります。$e_n$ を $z_j$ で微分すると、$z_j$ を除いた $n-1$ 次の基本対称多項式になります。'),
      beat('学習した分散の大きさは、関数のばらつきのうち、どれだけが n 次の交互作用から来るかを示します。'),
      beat('1次に集中すれば GAM、D 次に集中すれば SE-GP と同じです。どちらでもなければ、その間のモデルになります。'),
    ],
    build(ui) {
      ui.tex(R`\boldsymbol\theta = \big(\ell_1, \ldots, \ell_D,\;\; \sigma_1^2, \ldots, \sigma_D^2,\;\; \sigma_{\mathrm{noise}}^2\big)`, { x: LEFT_X, y: 118, size: 29 });
      ui.text('次元ごとの長さスケール（基底カーネルのパラメータ）、次数の分散、ノイズ', { x: LEFT_X, y: 176, size: 21, color: C.text2, delay: 0.3 });
      ui.tex(R`\log p(\mathbf{y} \mid X, \boldsymbol\theta) = -\tfrac{1}{2}\,\mathbf{y}^{\top} K^{-1} \mathbf{y} - \tfrac{1}{2} \log |K| - \tfrac{N}{2} \log 2\pi`, { x: LEFT_X, y: 252, size: 29, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text('周辺尤度', { x: LEFT_X, y: 322, size: 21, color: C.text2, at: 1, delay: 0.3 });
      ui.tex(R`\frac{\partial k_{\mathrm{add}_n}}{\partial z_j} = \sigma_n^2\; e_{n-1}(z_1, \ldots, z_{j-1},\, z_{j+1}, \ldots, z_D)`, { x: LEFT_X, y: 398, size: 29, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('論文の式 (7)：$z_j$ を除いた多項式なので、同じ公式で計算できる', { x: LEFT_X, y: 484, size: 21, color: C.text2, at: 2, delay: 0.4 });
      ui.table({
        x: LEFT_X, y: 548, widths: [360, 360, 500], size: 23, rowH: 54,
        header: ['$\\sigma_1^2$ に集中', '$\\sigma_D^2$ に集中', 'それ以外'],
        rows: [['GAM と同じ', 'SE-GP と同じ', '両者の間のモデル']],
        at: 4, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解
  const ORDERS = DATA.orders;
  const ORDER_PANEL = { x0: 92, gap: 362, y: 216, w: 320, h: 170 };
  const SIZE_PANEL = { x0: 480, gap: 340, y: 548, w: 290, h: 120 };
  const TABLE1 = { x: 330, y: 170, cellW: 112, cellH: 64, labelW: 200 };
  const LEARNING_SECONDS = 9;
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'どの次数が効いているか',
    beats: [
      beat('6変数の関数を4種類作り、1000点のデータで、次数の分散を学習しました。棒は、分散に占める各次数の割合です。最初の割合は、乱数で決めています。', 11),
      beat('学習を進めると、棒が動きます。1つずつの和は1次に、2つずつの積は2次に集まります。', 10),
      beat('3つずつの積は3次に、6つ全部の積は6次に集まりました。式を教えていないのに、次数を見つけています。'),
      beat('ただし、データが少ないと次数は高めに出ます。同じ3次の関数で、300点では5次、600点では4次、1000点でやっと3次でした。', 11),
      beat('論文が実データで学習した結果が、この表です。データごとに、効いている次数が大きく違います。'),
      beat('1次が中心のデータ、3次が中心のデータ、ほぼ最高次のデータがあります。次数を先に決めず、学習で選べることが強みです。', 10),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const stageA = 1 - s.p(4, 0.6);
      const dimCases = 1 - 0.55 * s.win(3, 4);
      if (stageA > 0) {
        ORDERS.cases.forEach((item, i) => {
          const x = ORDER_PANEL.x0 + ORDER_PANEL.gap * i;
          const alpha = stageA * s.p(0, 0.6, 0.15 * i);
          // 字幕1で前の2つ、字幕2で後の2つを学習させる
          const start = i < 2 ? 1 : 2;
          const progress = s.lin(start, Math.min(LEARNING_SECONDS, s.bt(start + 1) - s.bt(start) - 0.5), 0.4);
          const position = (item.path.length - 1) * Math.sqrt(progress);
          const low = Math.floor(position);
          const high = Math.min(item.path.length - 1, low + 1);
          const shares = item.path[low].map((v, k) => lerp(v, item.path[high][k], position - low));
          ctx.save();
          ctx.globalAlpha *= dimCases;
          canvasText(ctx, item.label, x + ORDER_PANEL.w / 2, 124, { size: 23, weight: 700, color: C.text, align: 'center', alpha });
          canvasText(ctx, item.formula, x + ORDER_PANEL.w / 2, 154, { size: 15, color: C.muted, align: 'center', alpha });
          D.orderBars(ctx, { x, y: ORDER_PANEL.y, w: ORDER_PANEL.w, h: ORDER_PANEL.h }, shares, { alpha, labelSize: 16, valueSize: 16, highlight: item.expected });
          const finished = alpha * (progress >= 1 ? s.p(start, 0.5, Math.min(LEARNING_SECONDS, s.bt(start + 1) - s.bt(start) - 0.5) + 0.4) : 0);
          canvasText(ctx, `テスト誤差  加法 ${fmt(item.rmse.additive, 2)}  SE ${fmt(item.rmse.se, 2)}  GAM ${fmt(item.rmse.gam, 2)}`, x + ORDER_PANEL.w / 2, 440, { size: 15, color: C.text2, align: 'center', alpha: finished });
          ctx.restore();
        });
        canvasText(ctx, '棒の下の数字は次数 n', 1516, 478, { size: 15, color: C.muted, align: 'right', alpha: stageA * s.p(0, 0.6) });
        if (s.beat >= 3) {
          const alpha = stageA * s.p(3, 0.7);
          canvasText(ctx, '3次の関数を、データの数を変えて学習（この動画の実験）', 96, 512, { size: 21, weight: 700, color: C.text, alpha });
          ctx.save();
          ORDERS.sizes.forEach((item, i) => {
            const x = SIZE_PANEL.x0 + SIZE_PANEL.gap * i;
            const panelAlpha = alpha * s.p(3, 0.5, 0.5 + 1.1 * i);
            canvasText(ctx, `${item.size} 点`, x - 72, SIZE_PANEL.y + SIZE_PANEL.h / 2 + 8, { size: 20, weight: 700, color: C.text2, alpha: panelAlpha });
            D.orderBars(ctx, { x, y: SIZE_PANEL.y, w: SIZE_PANEL.w, h: SIZE_PANEL.h }, item.shares, { alpha: panelAlpha, labelSize: 14, valueSize: 14, color: C.violet, highlight: 3 });
          });
          ctx.restore();
        }
      }
      if (s.beat >= 4) {
        const alpha = s.p(4, 0.8, 0.4);
        const T = TABLE1;
        canvasText(ctx, '論文の表1：各次数が分散に占める割合（%、合計100、10次までで学習）', W / 2, 128, { size: 22, weight: 700, color: C.text, align: 'center', alpha });
        for (let n = 0; n < 10; n++) canvasText(ctx, `${n + 1}次`, T.x + T.cellW * (n + 0.5) - 90, T.y - 8, { size: 18, color: C.muted, align: 'center', alpha });
        PAPER_TABLE1.forEach(([name, values], row) => {
          const y = T.y + row * T.cellH;
          const rowAlpha = alpha * s.p(4, 0.5, 0.5 + 0.2 * row);
          canvasText(ctx, name, T.x - 104, y + T.cellH / 2 + 7, { size: 20, color: C.text2, align: 'right', alpha: rowAlpha });
          values.forEach((value, n) => {
            const cellX = T.x - 90 + T.cellW * n;
            const [r, g, b] = seqColor(Math.min(1, value / 100) ** 0.6);
            ctx.save();
            ctx.globalAlpha *= rowAlpha;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(cellX + 2, y + 2, T.cellW - 4, T.cellH - 4);
            ctx.restore();
            canvasText(ctx, value.toFixed(1), cellX + T.cellW / 2, y + T.cellH / 2 + 6, { size: 18, color: value > 60 ? C.bg : C.text2, align: 'center', weight: value > 20 ? 700 : 500, alpha: rowAlpha });
          });
        });
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論
  const FAR_POINT = 6;
  const FAR_Z = Math.exp(-(FAR_POINT ** 2) / 2);
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '局所的なカーネルと、その限界',
    beats: [
      beat('SE カーネルやマターン・カーネルは、2点の距離だけで値が決まります。近い点しか見ない、局所的なカーネルです。'),
      beat('論文は、ベンジオらの指摘を引きます。局所的なカーネルは次元の呪いを受けやすく、関係する入力のあらゆる組み合わせに、学習点が必要になります。', 11),
      beat('例えば、1つの座標だけが同じで、残りは遠い2点を考えます。SE カーネルの値はほぼゼロで、この2点は無関係とみなされます。'),
      beat('1次のカーネルなら、値は1近くに残ります。同じ座標を持つ点の情報を、遠くまで使えます。これが非局所的な構造です。'),
    ],
    build(ui) {
      ui.tex(R`k(\mathbf{x}, \mathbf{x}') = g\!\left(\sum_{d=1}^{D} \frac{(x_d - x_d')^2}{\ell_d^2}\right)`, { x: LEFT_X, y: 120, size: 31 });
      ui.text('SE カーネルもマターン・カーネルも、この形（尺度をそろえた距離だけで決まる）', { x: LEFT_X, y: 214, size: 22, color: C.text2, delay: 0.3 });
      ui.text('局所的なカーネルの弱点（ベンジオほか 2006）', { x: LEFT_X, y: 290, size: 25, weight: 700, at: 1 });
      ui.text('次元の呪い：関係する入力のあらゆる組み合わせに、学習点が必要になる<br>例：8変数を10段階ずつ見ると $10^8$ 通り', { x: LEFT_X, y: 336, w: 850, size: 22, color: C.text2, lh: 1.7, at: 1, delay: 0.4 });
      seeThrough(ui.card({ x: LEFT_X, y: 452, w: 1420, h: 250, at: 2, title: `例：$\\ell = 1$、$\\mathbf{x} = (0, 0, 0)$、$\\mathbf{x}' = (0, ${FAR_POINT}, ${FAR_POINT})$` }));
      ui.tex(R`z_1 = 1, \quad z_2 = z_3 = e^{-18} \approx ${FAR_Z.toExponential(1).replace(/e-0?(\d+)/, ' \\times 10^{-$1}')}`, { x: LEFT_X + 32, y: 512, size: 26, at: 2, delay: 0.3 });
      ui.tex(R`\text{SE（3次）}: \; z_1 z_2 z_3 \approx 0 \quad \rightarrow \text{ 無関係}`, { x: LEFT_X + 32, y: 572, size: 27, at: 2, delay: 0.8, color: C.text });
      ui.tex(R`\text{1次}: \; z_1 + z_2 + z_3 \approx 1 \quad \rightarrow \text{ 関係が残る}`, { x: LEFT_X + 32, y: 636, size: 27, at: 3, glow: [{ from: 3 }] });
      ui.text('同じ座標 $x_1$ を持つ点から学べる', { x: 1010, y: 640, size: 23, color: C.text2, at: 3, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解: 3次元の等値面（論文の図4）
  const ISO_BOX = 7;
  const ISO_SIZE = 330; // 実際に計算する画素の数（1辺）。回転させるので、毎コマ計算する
  const ISO_SHOWN = 362; // 画面に出す大きさ
  const ISO_ELEVATION = 0.5;
  const ISO_AZIMUTH = 0.55;
  const ISO_SPEED = 0.16;
  const ISO_CENTERS = [205, 595, 1005, 1395];
  const ISO_CENTER_Y = 330;
  // z = exp(−x²/2) を表で引いて速くする
  const Z_TABLE_SIZE = 4096;
  const Z_TABLE_MAX = 8;
  const Z_TABLE_SCALE = Z_TABLE_SIZE / Z_TABLE_MAX;
  const zTable = Float64Array.from({ length: Z_TABLE_SIZE + 1 }, (_, i) => Math.exp(-(((i / Z_TABLE_SIZE) * Z_TABLE_MAX) ** 2) / 2));
  const zOf = (v) => zTable[(Math.abs(v) * Z_TABLE_SCALE) | 0];
  const ISO_PANELS = [
    { title: '1次', sub: 'k₁ + k₂ + k₃', note: '3枚の板', threshold: 0.985, color: D.COLOR.gam, field: (x, y, z) => zOf(x) + zOf(y) + zOf(z) },
    { title: '2次', sub: 'k₁k₂ + k₂k₃ + k₁k₃', note: '3本の筒', threshold: 0.25, color: C.violet, field: (x, y, z) => { const [a, b, c] = [zOf(x), zOf(y), zOf(z)]; return a * b + b * c + a * c; } },
    { title: '3次', sub: 'k₁k₂k₃（SE カーネル）', note: '球', threshold: 0.05, color: D.COLOR.se, field: (x, y, z) => zOf(x) * zOf(y) * zOf(z) },
    { title: 'すべての次数', sub: '加法カーネル', note: '板 ＋ 筒 ＋ 球', threshold: 0.96, color: D.COLOR.additive, field: (x, y, z) => { const [a, b, c] = [zOf(x), zOf(y), zOf(z)]; return a + b + c + 2 * (a * b + b * c + a * c) + 4 * a * b * c; } },
  ];
  const lighter = (rgb, k) => rgb.map((v) => v + (255 - v) * k);
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '3次元で見るカーネルの形（論文の図4）',
    beats: [
      beat('3次元の空間で、原点の点とのカーネルの値が、一定以上になる範囲を塗りました。塗った範囲の点は、原点の点と関係があるとみなされます。', 10),
      beat('1次のカーネルは、3枚の板です。どれか1つの座標が原点に近ければ、どんなに遠くても関係があります。'),
      beat('2次のカーネルは、3本の筒です。2つの座標が近ければ、残りの座標は遠くても関係があります。'),
      beat('3次のカーネルは、球です。これが SE カーネルで、3つの座標がすべて近い点だけを見ます。'),
      beat('全部の次数を足すと、板と筒と球をあわせた形になります。近くの点を強く見ながら、遠くの点の情報も使えます。'),
    ],
    build() {
      return ISO_PANELS.map((panel) => ({ canvas: document.createElement('canvas'), rgb: hexToRgb(panel.color) }));
    },
    draw(ctx, s, st) {
      const azimuth = ISO_AZIMUTH + ISO_SPEED * s.u;
      ISO_PANELS.forEach((panel, i) => {
        const alpha = s.p(i + 1, 0.8);
        const cx = ISO_CENTERS[i];
        const frameAlpha = s.p(0, 0.8, 0.2 * i);
        const halfWidth = ISO_BOX * Math.SQRT2 * 1.2;
        const pixels = ISO_SHOWN / (2 * halfWidth);
        D.drawBoxEdges(ctx, cx, ISO_CENTER_Y, pixels, ISO_BOX, azimuth, ISO_ELEVATION, 0.4 * frameAlpha);
        if (alpha > 0) {
          const image = D.renderIso(st[i].canvas, panel.field, panel.threshold, {
            size: ISO_SIZE, box: ISO_BOX, azimuth, elevation: ISO_ELEVATION, color: st[i].rgb, cutColor: lighter(st[i].rgb, 0.3),
          });
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(image, cx - ISO_SHOWN / 2, ISO_CENTER_Y - ISO_SHOWN / 2, ISO_SHOWN, ISO_SHOWN);
          ctx.restore();
        }
        canvasText(ctx, panel.title, cx, 560, { size: 27, weight: 700, color: C.text, align: 'center', alpha: frameAlpha });
        canvasText(ctx, panel.sub, cx, 596, { size: 19, color: C.text2, align: 'center', alpha: frameAlpha });
        canvasText(ctx, panel.note, cx, 642, { size: 24, weight: 700, color: C.text, align: 'center', alpha });
      });
      canvasText(ctx, '塗った範囲：原点の点とのカーネルの値が一定以上（ℓ = 1、値の基準と次数の重みは形が見やすいように選び、箱で切った）', W / 2, 716, { size: 19, color: C.muted, align: 'center', alpha: s.p(0, 0.8, 0.4) });
    },
  });

  // ---------------------------------------------------------------- 第7章 理論
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '予測を項ごとに分ける',
    beats: [
      beat('カーネルが項の和なら、関数も項の和に分かれます。S は、項が使う変数の組です。'),
      beat('ある1つの項の事後平均は、全体の式の、左のベクトルだけをその項のカーネルに替えれば求まります。真ん中の行列は全体のままです。', 10),
      beat('1次の項なら、1変数の関数なので、そのまま図にできます。これが読みやすさの理由です。'),
      beat('次の図解では、入力の一部にしかデータがない場合を試します。論文の図5と同じ考え方の例を、自分で作って計算しました。'),
    ],
    build(ui) {
      ui.tex(R`f(\mathbf{x}) = \sum_{S} f_S(\mathbf{x}_S), \qquad k = \sum_{S} k_S`, { x: LEFT_X, y: 120, size: 31 });
      ui.text('全体の事後平均', { x: LEFT_X, y: 226, size: 24, weight: 700, color: C.text2, at: 1 });
      ui.tex(R`\mathbb{E}[f(\mathbf{x}_*) \mid \mathbf{y}] = \htmlClass{hl-all}{k(\mathbf{x}_*, X)}\, \big(K + \sigma_{\mathrm{noise}}^2 I\big)^{-1} \mathbf{y}`, { x: LEFT_X, y: 268, size: 31, at: 1 });
      ui.text('1つの項の事後平均', { x: LEFT_X, y: 370, size: 24, weight: 700, color: C.text2, at: 1, delay: 0.8 });
      ui.tex(R`\mathbb{E}[f_S(\mathbf{x}_*) \mid \mathbf{y}] = \htmlClass{hl-term}{k_S(\mathbf{x}_*, X)}\, \big(K + \sigma_{\mathrm{noise}}^2 I\big)^{-1} \mathbf{y}`, { x: LEFT_X, y: 412, size: 31, at: 1, delay: 0.8, hl: [{ cls: 'hl-term', from: 1, to: 3, color: C.yellow }] });
      ui.tex(R`\text{1次の項}: \; S = \{i\} \;\Rightarrow\; f_i(x_i) \text{ を1変数の図にできる}`, { x: LEFT_X, y: 524, size: 28, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('論文の図5：データは L 字の範囲だけ。データのない山を当てられるか？', { x: LEFT_X, y: 620, size: 27, weight: 700, at: 3, delay: 0.3 });
      ui.text('真の関数は $f_1(x_1) + f_2(x_2)$。ノイズつきの点から、関数の形も次数も学習する', { x: LEFT_X, y: 672, size: 22, color: C.text2, at: 3, delay: 0.7 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解: L字のデータ（論文の図5）
  const L = DATA.lshape;
  const LSIDE = L.axis.length;
  const HEAT_SCALE = 2.2;
  const HEAT_BOXES = [
    { x: 92, y: 142, w: 286, h: 286 },
    { x: 412, y: 142, w: 286, h: 286 },
    { x: 732, y: 142, w: 286, h: 286 },
  ];
  const HEAT_TITLES = ['真の関数と学習点', 'SE-GP の事後平均', '加法ガウス過程の事後平均'];
  const toScreen = (box, a, b) => [box.x + ((a + 2) / 4) * box.w, box.y + box.h - ((b + 2) / 4) * box.h];
  const subtractMean = (values) => {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.map((v) => v - mean);
  };
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: 'L字のデータから、遠くの山を当てる（論文の図5）',
    beats: [
      beat('真の関数は、2つのサイン波の和です。学習点の48個は、L字の範囲にしかありません。×印の山の近くには、データがありません。', 10),
      beat('SE-GP の事後平均です。データの近くは合っていますが、×印の山は現れません。'),
      beat('加法ガウス過程の事後平均です。データのない場所に、山がはっきり現れました。'),
      beat('山の頂上の真の高さは2です。SE-GP の予測は0.47、加法ガウス過程の予測は1.98でした。'),
      beat('学習した次数の分散は、1次が100%でした。関数が足し算で書けることを、モデルが見つけています。'),
      beat('1次の項を取り出すと、もとのサイン波が戻ります。L字の縦棒と横棒から、それぞれの形を学び、その和で遠くを予測しています。', 11),
    ],
    build(ui) {
      ui.table({
        x: 100, y: 486, widths: [270, 190, 190, 230], size: 21, rowH: 44,
        header: ['', '真の値', 'SE-GP', '加法ガウス過程'],
        rows: [
          ['×印の山の高さ', fmt(L.peak.truth, 2), fmt(L.peak.se, 2), fmt(L.peak.additive, 2)],
          ['データのない範囲の誤差', '―', fmt(L.rmseFar.se, 2), fmt(L.rmseFar.additive, 2)],
          ['周辺尤度の対数', '―', fmt(-L.nll.se, 1), fmt(-L.nll.additive, 1)],
          ['学習した次数の分散', '―', '2次だけ', `1次 ${percent(L.shares[0])}`],
        ],
        at: 3, rowAt: [3, 3, 4, 4], delay: 0.5,
      });
      return {
        images: [L.truth, L.se, L.additive].map((values) => D.divergingImage(values, LSIDE, HEAT_SCALE)),
        term1: subtractMean(L.term1),
        term2: subtractMean(L.term2),
        truth: subtractMean(L.trueTerm),
        plot1: new Plot({ x: 1110, y: 142, w: 400, h: 216, xr: [-2, 2], yr: [-1.6, 1.6] }),
        plot2: new Plot({ x: 1110, y: 446, w: 400, h: 216, xr: [-2, 2], yr: [-1.6, 1.6] }),
      };
    },
    draw(ctx, s, st) {
      const alphas = [s.p(0, 0.8), s.p(1, 0.8), s.p(2, 0.8)];
      HEAT_BOXES.forEach((box, i) => {
        if (alphas[i] <= 0) return;
        canvasText(ctx, HEAT_TITLES[i], box.x + box.w / 2, box.y - 14, { size: 21, weight: 700, color: C.text, align: 'center', alpha: alphas[i] });
        D.heatPanel(ctx, st.images[i], box, { alpha: alphas[i] });
        // データのある L 字の境目
        const [ax, ay] = toScreen(box, L.band, L.band);
        const [bx] = toScreen(box, 2, 2);
        const [, by] = toScreen(box, 2, 2);
        ctx.save();
        ctx.globalAlpha *= alphas[i];
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = rgba(C.text, 0.8);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ax, by, bx - ax, ay - by);
        ctx.setLineDash([]);
        L.points.forEach(([a, b]) => {
          const [px, py] = toScreen(box, a, b);
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = C.text;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = C.bg;
          ctx.stroke();
        });
        const [mx, my] = toScreen(box, L.peak.x, L.peak.x);
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 3;
        const arm = 9;
        ctx.beginPath();
        ctx.moveTo(mx - arm, my - arm);
        ctx.lineTo(mx + arm, my + arm);
        ctx.moveTo(mx + arm, my - arm);
        ctx.lineTo(mx - arm, my + arm);
        ctx.stroke();
        ctx.restore();
      });
      const termAlpha = s.p(5, 0.8);
      if (termAlpha > 0) {
        const pairs = [
          [st.plot1, st.term1, 'f₁(x₁)', 'x₁'],
          [st.plot2, st.term2, 'f₂(x₂)', 'x₂'],
        ];
        pairs.forEach(([plot, term, name, axis]) => {
          plot.axes(ctx, { xticks: [-2, -1, 0, 1, 2], yticks: [-1, 0, 1], xlabel: axis, ylabel: `1次の項 ${name}`, alpha: termAlpha });
          plot.line(ctx, L.termX, st.truth, { color: C.text, width: 2.5, dash: [8, 6], alpha: termAlpha });
          plot.line(ctx, L.termX, term, { color: D.COLOR.additive, width: 3.5, alpha: termAlpha, upto: s.p(5, 2, 0.3) });
        });
        legend(ctx, [{ color: D.COLOR.additive, label: '学習した項（定数を除く）' }, { color: C.text, dash: [8, 6], label: '真の形' }], 1110, 736, { alpha: termAlpha, gap: 20, size: 15 });
      }
    },
  });

  // ---------------------------------------------------------------- 第8章 理論
  SCENES.push({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: '実験の条件と、関連する手法',
    beats: [
      beat('論文は、回帰5つ、分類6つのデータで、5つの手法を比べました。結果は、10分割の平均です。'),
      beat('ガウス過程の3手法は、周辺尤度を L-BFGS で500回まで最大化し、乱数で5回やり直します。加法カーネルは、速さのため10次までに制限しました。', 11),
      beat('最も近い手法が HKL、階層的カーネル学習です。同じ項の中から部分集合を選びますが、次数の重みは α の n 乗に固定され、調整には交差検証が要ります。', 12),
      beat('平滑化スプライン ANOVA は、項が指数で増えるので、実用上は1次と2次が中心です。プレートの研究は、1次と D 次だけを使いました。', 10),
      beat('加法ガウス過程の違いは、すべての次数を含み、次数の重みと次元ごとのパラメータを、まとめて周辺尤度で学べることです。'),
    ],
    build(ui) {
      seeThrough(ui.card({ x: LEFT_X, y: 112, w: 650, h: 300, title: '実験の条件（論文 5.2 節）' }));
      const conditions = [
        [0, '手法：線形回帰（分類はロジスティック回帰）、GP GAM、HKL、SE-GP、加法ガウス過程'],
        [0, 'データ：回帰5つ、分類6つ。10分割の平均'],
        [1, '学習：周辺尤度を L-BFGS で500回まで、再出発5回'],
        [1, '加法カーネルは SE を基底に、10次まで'],
        [1, '比較：対応のある t 検定'],
      ];
      const CONDITION_Y = [160, 234, 276, 318, 360];
      conditions.forEach(([at, text], i) => ui.text(text, { x: LEFT_X + 28, y: CONDITION_Y[i], w: 600, size: 20, color: C.text2, lh: 1.5, at, delay: 0.2 + (i % 3) * 0.3 }));
      seeThrough(ui.card({ x: 780, y: 112, w: 730, h: 300, at: 2, title: 'HKL（バッハ 2009）' }));
      ui.tex(R`k_a(\mathbf{x}, \mathbf{x}') = v_D^2 \prod_{d=1}^{D} \big(1 + \alpha\, k_d(x_d, x_d')\big)`, { x: 808, y: 170, size: 28, at: 2, delay: 0.3 });
      ui.text('展開すると $n$ 次の項の重みは $\\alpha^n$（論文の式 8）<br>次数ごとには重みを決められない。項は「部分集合を選ぶ」形で絞る。パラメータは交差検証で決める', { x: 808, y: 256, w: 680, size: 21, color: C.text2, lh: 1.6, at: 2, delay: 0.7 });
      ui.table({
        x: LEFT_X, y: 440, widths: [440, 400, 580], size: 22, rowH: 54,
        header: ['手法', '使う次数', '論文が挙げる違い'],
        rows: [
          ['平滑化スプライン ANOVA', '実用上は1次と2次', '項ごとに重みを持つので、項の数が指数で増える'],
          ['プレート 1999', '1次と $D$ 次だけ', '中間の次数がない'],
          ['加法ガウス過程', 'すべての次数', '次数ごとの重みを周辺尤度で学ぶ'],
        ],
        at: 3, rowAt: [3, 3, 4], delay: 0.3, glowRows: [null, null, [{ from: 4 }]],
      });
    },
  });

  // ---------------------------------------------------------------- 第8章 図解: 結果
  const RESULT = { x: 300, y: 158, w: 1150, rowH: 86 };
  const CONCRETE = DATA.concrete;
  const CV = DATA['concrete-cv'];
  const average = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const OUR_MSE = { additive: average(CV.errors.additive), se: average(CV.errors.se), gam: average(CV.errors.gam) };
  const AGE_DISPLAY_MAX = 200;
  const SCATTER_STEP = 2; // 点が多いので1つおきに描く
  SCENES.push({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: '実データの結果',
    beats: [
      beat('論文の表2、回帰の平均二乗誤差です。左ほど誤差が小さく、横軸は対数です。輪のついた点は、最良の手法と有意な差がなかったものです。', 11),
      beat('加法ガウス過程は、5つのデータのすべてで最良の組に入りました。コンクリートでは単独の最良で、SE-GP の0.157に対して0.089です。', 11),
      beat('論文の結論は、低次で説明できるデータで最も強く、高次が効くデータでも SE-GP と同程度、というものです。分類でも、有意に負けたデータはありませんでした。', 12),
      beat('同じコンクリートのデータを、この動画でも計算しました。1次の項を取り出すと、水が増えると強度が下がる傾向や、材齢とともに強度が上がり、やがて頭打ちになる形が読めます。', 13),
      beat('10分割の誤差は、加法 0.055、SE-GP 0.086、GAM 0.097 で、10回すべてで加法が最小でした。結論は論文と同じです。値は、分割の比率が論文に無いので、直接は比べられません。', 14),
    ],
    build(ui) {
      ui.table({
        x: 960, y: 500, widths: [190, 180, 180], size: 21, rowH: 42,
        header: ['平均二乗誤差', '論文', 'この動画'],
        rows: [
          ['加法ガウス過程', PAPER_CONCRETE.additive.toFixed(3), OUR_MSE.additive.toFixed(3)],
          ['SE-GP', PAPER_CONCRETE.se.toFixed(3), OUR_MSE.se.toFixed(3)],
          ['GP GAM', PAPER_CONCRETE.gam.toFixed(3), OUR_MSE.gam.toFixed(3)],
        ],
        at: 4, rowDelay: 0.3, delay: 0.3,
      });
      ui.text('この動画：10分割すべてで加法が最小（対応のある t 検定で p < 0.001）。再出発なし、300回まで。目的変数は標準化', { x: 960, y: 676, w: 560, size: 16, color: C.muted, at: 4, delay: 1.2, lh: 1.5 });
      return {
        logMin: Math.log10(0.03),
        logMax: Math.log10(1.6),
        waterPlot: new Plot({ x: 110, y: 170, w: 360, h: 440, xr: [120, 250], yr: [-40, 40] }),
        agePlot: new Plot({ x: 550, y: 170, w: 360, h: 440, xr: [0, AGE_DISPLAY_MAX], yr: [-40, 40] }),
      };
    },
    draw(ctx, s, st) {
      const stageA = 1 - s.p(3, 0.6);
      if (stageA > 0) {
        const xOf = (v) => RESULT.x + ((Math.log10(v) - st.logMin) / (st.logMax - st.logMin)) * RESULT.w;
        const axisY = RESULT.y + RESULT.rowH * PAPER_DATASETS.length + 10;
        const alpha = stageA * s.p(0, 0.8);
        [0.05, 0.1, 0.2, 0.5, 1].forEach((tick) => {
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.strokeStyle = C.grid;
          ctx.beginPath();
          ctx.moveTo(xOf(tick), RESULT.y - 12);
          ctx.lineTo(xOf(tick), axisY);
          ctx.stroke();
          ctx.restore();
          canvasText(ctx, String(tick), xOf(tick), axisY + 24, { size: 16, color: C.muted, align: 'center', alpha });
        });
        canvasText(ctx, '平均二乗誤差（対数）', RESULT.x + RESULT.w, axisY + 52, { size: 17, color: C.text2, align: 'right', alpha });
        PAPER_DATASETS.forEach((name, row) => {
          const y = RESULT.y + RESULT.rowH * (row + 0.5);
          const glow = name === 'concrete' ? s.win(1, 2) : 0;
          if (glow > 0) {
            ctx.save();
            ctx.fillStyle = rgba(C.yellow, 0.1 * glow * stageA);
            ctx.fillRect(100, y - RESULT.rowH / 2 + 4, 1400, RESULT.rowH - 8);
            ctx.restore();
          }
          canvasText(ctx, name, 280, y + 7, { size: 21, color: C.text, align: 'right', alpha: alpha * s.p(0, 0.5, 0.3 + 0.2 * row) });
          PAPER_TABLE2.forEach((method) => {
            const x = xOf(method.values[row]);
            const dotAlpha = alpha * s.p(0, 0.5, 0.5 + 0.2 * row);
            const offset = (PAPER_TABLE2.indexOf(method) - 2) * 8;
            ctx.save();
            ctx.globalAlpha *= dotAlpha;
            ctx.beginPath();
            ctx.arc(x, y + offset, 8.5, 0, Math.PI * 2);
            ctx.fillStyle = method.color;
            ctx.fill();
            if (method.best.includes(row)) {
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = C.text;
              ctx.beginPath();
              ctx.arc(x, y + offset, 13, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          });
        });
        legend(ctx, PAPER_TABLE2.map((m) => ({ kind: 'dot', color: m.color, label: m.name })), 300, 124, { alpha, gap: 26, size: 18 });
      }
      if (s.beat >= 3) {
        const alpha = s.p(3, 0.8, 0.4);
        const panel = (plot, term, xLabel, title, xticks, maxX) => {
          canvasText(ctx, title, plot.x + plot.w / 2, 134, { size: 21, weight: 700, color: C.text, align: 'center', alpha });
          plot.axes(ctx, { xticks, yticks: [-30, -15, 0, 15, 30], xlabel: xLabel, ylabel: '強度への効果（MPa）', alpha });
          ctx.save();
          plot.clip(ctx);
          ctx.globalAlpha *= alpha;
          ctx.fillStyle = rgba(C.aqua, 0.34);
          for (let i = 0; i < term.dataX.length; i += SCATTER_STEP) {
            if (term.dataX[i] > maxX) continue;
            ctx.beginPath();
            ctx.arc(plot.sx(term.dataX[i]), plot.sy(term.dataY[i]), 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          plot.line(ctx, term.x, term.mean, { color: C.text, width: 3.5, alpha, upto: s.p(3, 2, 0.8) });
        };
        panel(st.waterPlot, CONCRETE.water, '水（kg/m³）', '水の量の効果', [125, 150, 175, 200, 225, 250], 300);
        panel(st.agePlot, CONCRETE.age, '材齢（日）', '材齢の効果', [0, 50, 100, 150, 200], AGE_DISPLAY_MAX);
        canvasText(ctx, 'UCI のコンクリート強度データ（1030点）で学習した GAM の1次の項。点は他の変数の効果を引いた値', 110, 690, { size: 15, color: C.muted, alpha });
        // 学習した次数の分散（全データ）
        const shareAlpha = alpha * s.p(3, 0.7, 1);
        canvasText(ctx, '次数の分散（全次数で学習）', 960, 134, { size: 21, weight: 700, color: C.text, alpha: shareAlpha });
        D.orderBars(ctx, { x: 960, y: 170, w: 540, h: 230 }, CONCRETE.shares, { alpha: shareAlpha, labelSize: 16, valueSize: 16 });
        canvasText(ctx, '論文の表1：1次 70.6%、2次 13.3%、3次 13.8%、4次 2.3%', 960, 456, { size: 17, color: C.text2, alpha: shareAlpha });
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
      beat('まとめです。加法カーネルは、1次の和から全変数の積まで、すべての次数の交互作用を1つに入れたカーネルです。GAM と SE カーネルは、両端の特別な場合です。', 12),
      beat('項は指数個ありますが、基本対称多項式と見ることで、次元の2乗の計算で足せます。次数の分散は、周辺尤度で学習でき、どの次数が効くかを読み取れます。', 12),
      beat('低次の構造があるデータでは、遠くの点まで予測でき、項ごとの図で読み解けます。構造がなければ、SE-GP に近いモデルに戻ります。', 11),
      beat('注意点もあります。計算にはデータ数の3乗がかかり、次数の推定はデータが少ないと高めに出ました。項どうしの重なりを、直交させて解消する後続の研究もあります。', 12),
    ],
    build(ui) {
      const points = [
        [0, '加法カーネルは、1次の和から全変数の積までを1つに入れる。GAM と SE は両端の特別な場合'],
        [1, R`$2^D - 1$ 個の項は基本対称多項式。ニュートン・ジラールの公式で $O(D^2)$ で足せる`],
        [1, R`次数の分散 $\sigma_n^2$ を周辺尤度で学習し、どの次数が効くかを読み取れる`],
        [2, '低次の構造があれば遠くまで予測でき、項ごとの図で読み解ける。無ければ SE-GP に近づく'],
        [3, '注意：計算はデータ数の3乗。次数の推定はデータが少ないと高めに出た（3次の関数で、300点だと5次）'],
        [3, '後続の研究：項どうしを直交させて重なりをなくす OAK（ルーほか 2022）'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 116 + i * 58, w: 1420, size: 24, at, delay: i === 2 || i === 5 ? 0.6 : 0 }));
      ui.text('文献：D. Duvenaud, H. Nickisch, C. E. Rasmussen, Additive Gaussian processes, NIPS 24 (2011) 226–234 ／ F. Bach, High-dimensional non-linear variable selection through hierarchical kernel learning, 2009 ／ Y. Bengio, O. Delalleau, N. Le Roux, The curse of highly variable functions for local kernel machines, NIPS 18 (2006) ／ T. A. Plate, Behaviormetrika 26 (1999) 29–50 ／ G. Wahba, Spline Models for Observational Data, 1990 ／ X. Lu, A. Boukouvalas, J. Hensman, Additive Gaussian processes revisited, ICML 2022 ／ C. E. Rasmussen, C. K. I. Williams, Gaussian Processes for Machine Learning, 2006', {
        x: LEFT_X, y: 480, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 3, delay: 1,
      });
      ui.text('データ：I-C. Yeh, Concrete Compressive Strength, UCI Machine Learning Repository（CC BY 4.0）。L字と次数の例は説明用に作った合成データ。計算は Python（NumPy・SciPy）', { x: LEFT_X, y: 640, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 3, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、加法ガウス過程の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('加法ガウス過程 ― すべての次数の交互作用を1つのカーネルに', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
