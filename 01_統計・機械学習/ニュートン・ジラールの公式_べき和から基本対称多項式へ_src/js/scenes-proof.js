// scenes-proof.js — はじめに、この動画のポイント、第1〜4章（2つの対称式、低い次数、打ち消し合いの証明、生成関数の証明）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。部品の at は「何番目の字幕で出すか」。
(() => {
  const { W, C, CHAPTERS, fmt, texNum, canvasText, lerp, clamp, rgba, roundRect, seqColor } = KIT;
  const M = NGM;
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
  const EXAMPLE_Z = [0.9, 0.6, 0.4, 0.2];

  // 文字のタイルを1枚描く
  function tile(ctx, x, y, w, h, text, { color = C.blue, alpha = 1, size = 20, ink = C.text } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = rgba(color, 0.75);
    ctx.fill();
    ctx.restore();
    canvasText(ctx, text, x + w / 2, y + h / 2 + size * 0.36, { size, color: ink, align: 'center', weight: 700, alpha });
  }

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('ニュートン・ジラールの公式を、式と図を使って解説します。加法ガウス過程で、指数個の項を足すために使われた公式です。', 9),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('全部で7章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('ニュートン・ジラールの公式', { x: 0, y: 84, w: W, align: 'center', size: 68, weight: 800 });
      ui.text('べき乗の和から、基本対称多項式を順に求める', { x: 0, y: 192, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      ui.text('加法ガウス過程の動画の補足：n 次の加法カーネルを、項を並べずに計算する', { x: 0, y: 246, w: W, align: 'center', size: 20, color: C.muted, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, { x: left ? 130 : 830, y: 312 + (left ? i : i - 4) * 52, w: 660, size: 24, delay: 0.6 + 0.12 * i });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 130, y: 550, size: 24, at: 1 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>図で見る`, { x: 130, y: 598, size: 24, at: 1, delay: 0.2 });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 830, y: 550, size: 24, at: 2 });
      ui.text('図の数値は、すべてこの動画のために計算したものです', { x: 830, y: 600, w: 680, size: 20, color: C.muted, at: 2, delay: 0.4, lh: 1.5 });
    },
  });

  // ---------------------------------------------------------------- この動画のポイント
  const POINT_CARDS = [{ x: 90, y: 116 }, { x: 810, y: 116 }, { x: 90, y: 436 }, { x: 810, y: 436 }];
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① 公式は、基本対称多項式 $e_n$ を、べき乗の和 $s_k$ から順に求める漸化式です。項を並べる必要がありません。', 10),
      beat('② 証明は2通りあります。項が2つずつ打ち消し合う証明と、生成関数の対数微分を使う証明です。', 10),
      beat('③ 計算の手間は次元の2乗程度です。ただし、符号が交互の和なので、次数が高いと桁落ちします。', 10),
      beat('④ 同じ公式は、多項式の根の和や、行列の固有多項式の計算にも現れます。', 9),
      beat('この4つを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 公式', R`$n\, e_n = \sum_{k=1}^{n} (-1)^{k-1} e_{n-k}\, s_k$<br>$e_n$ を $s_k$ から順に求める`],
        ['② 2通りの証明', '項が2つずつ打ち消し合う証明と、生成関数の対数微分を使う証明'],
        ['③ 手間と落とし穴', R`手間は $O(D^2)$。ただし交互の和なので、全次数を求めると $D = 25$ で値が壊れる`],
        ['④ 別の顔', '多項式の根のべき和、行列の跡と固有多項式にも同じ公式が現れる'],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: 700, h: 300, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 28, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 90, w: 640, size: 25, lh: 1.7, color: C.text2, at: k, delay: 0.3 });
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '2つの対称式',
    beats: [
      beat('D 個の数 z があります。その対称式を2種類考えます。対称式とは、数を入れかえても値が変わらない式です。'),
      beat('1つ目は基本対称多項式です。n 個の数を選んで掛け、全部の組み合わせを足します。項の数は組み合わせの数なので、次元とともに急に増えます。', 11),
      beat('2つ目はべき和です。全部の数を k 乗して足すだけです。項の数は D 個で、計算は簡単です。'),
      beat('ニュートン・ジラールの公式は、この2つを結びます。難しい $e_n$ を、簡単な $s_k$ から求められます。'),
      beat('加法カーネルの n 次の項は、$e_n$ そのものでした。だからこの公式で、指数個の項を列挙せずに計算できます。'),
    ],
    build(ui) {
      ui.tex(R`z_1, z_2, \ldots, z_D`, { x: LEFT_X, y: 116, size: 32 });
      ui.text('基本対称多項式', { x: LEFT_X, y: 196, size: 26, weight: 700, at: 1 });
      ui.tex(R`e_n = \sum_{i_1 < \cdots < i_n} z_{i_1} z_{i_2} \cdots z_{i_n} \qquad \text{（項は } \tbinom{D}{n} \text{ 個）}`, { x: LEFT_X, y: 242, size: 30, at: 1, delay: 0.3 });
      ui.text('べき和', { x: LEFT_X, y: 352, size: 26, weight: 700, at: 2 });
      ui.tex(R`s_k = z_1^{\,k} + z_2^{\,k} + \cdots + z_D^{\,k} \qquad \text{（項は } D \text{ 個）}`, { x: LEFT_X, y: 396, size: 30, at: 2, delay: 0.3 });
      ui.text('ニュートン・ジラールの公式', { x: LEFT_X, y: 488, size: 26, weight: 700, at: 3 });
      ui.tex(R`n\, e_n = \sum_{k=1}^{n} (-1)^{k-1}\, e_{n-k}\, s_k, \qquad e_0 = 1`, { x: LEFT_X, y: 534, size: 34, at: 3, delay: 0.3, glow: [{ from: 3, to: 4 }] });
      ui.text('加法カーネル：$k_{\\mathrm{add}_n} = \\sigma_n^2\\, e_n(z_1, \\ldots, z_D)$、$z_i = k_i(x_i, x_i\')$', { x: LEFT_X, y: 660, size: 25, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解
  const TILE_D = 4;
  const TILE_COLORS = [C.blue, C.aqua, C.violet, C.orange];
  const subsets = (D, n) => {
    const out = [];
    for (let mask = 1; mask < 1 << D; mask++) {
      const items = [];
      for (let i = 0; i < D; i++) if (mask & (1 << i)) items.push(i + 1);
      if (items.length === n) out.push(items);
    }
    return out;
  };
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '4つの数で並べてみる',
    beats: [
      beat('4つの数を、a、b、c、d とします。$e_1$ は4項、$e_2$ は6項、$e_3$ は4項、$e_4$ は1項です。'),
      beat('全部で15項です。数が増えると、項の数は2倍ずつ増えていきます。'),
      beat('一方、べき和はどの次数でも4項です。k を上げても、項の数は増えません。'),
      beat('上の三角形の形の計算を、下の平らな計算だけで済ませる、というのがこの公式の価値です。'),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const letters = ['a', 'b', 'c', 'd'];
      const alphaTop = s.p(0, 0.6);
      canvasText(ctx, '基本対称多項式', 110, 136, { size: 24, weight: 700, color: C.text, alpha: alphaTop });
      [1, 2, 3, 4].forEach((n, row) => {
        const y = 156 + row * 66;
        const rowAlpha = s.p(0, 0.5, 0.4 + 0.4 * row);
        canvasText(ctx, `e${'₁₂₃₄'[row]}`, 110, y + 36, { size: 24, weight: 700, color: C.text2, alpha: rowAlpha });
        subsets(TILE_D, n).forEach((items, i) => {
          tile(ctx, 180 + i * 172, y, 158, 52, items.map((v) => letters[v - 1]).join(''), { color: TILE_COLORS[row], alpha: rowAlpha, size: 22 });
        });
      });
      if (s.beat >= 1) canvasText(ctx, '合計 15 項（D が1増えると2倍）', 1250, 136, { size: 22, weight: 700, color: C.text, align: 'center', alpha: s.p(1, 0.6) });
      if (s.beat >= 2) {
        const alpha = s.p(2, 0.6);
        canvasText(ctx, 'べき和', 110, 466, { size: 24, weight: 700, color: C.text, alpha });
        [1, 2, 3, 4].forEach((k, row) => {
          const y = 482 + row * 56;
          const rowAlpha = s.p(2, 0.5, 0.3 + 0.3 * row);
          canvasText(ctx, `s${'₁₂₃₄'[row]}`, 110, y + 32, { size: 24, weight: 700, color: C.text2, alpha: rowAlpha });
          letters.forEach((letter, i) => {
            tile(ctx, 180 + i * 172, y, 158, 44, `${letter}${'¹²³⁴'[row]}`, { color: C.yellow, alpha: rowAlpha, size: 21 });
          });
        });
        canvasText(ctx, 'どの次数でも D 項', 1250, 590, { size: 22, weight: 700, color: C.text, align: 'center', alpha });
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: '低い次数で確かめる',
    beats: [
      beat('n が1なら、$e_1$ は $s_1$ そのものです。どちらも全部の数の和です。'),
      beat('n が2なら、$s_1$ の2乗を考えます。展開すると、同じ番号の項と、違う番号の項に分かれます。'),
      beat('同じ番号の項の和が $s_2$、違う番号の項は $e_2$ が2回ずつ現れます。ここから $e_2$ が求まります。'),
      beat('n が3では、$s_1$ の3乗では足りず、$e_2$ と $s_1$ の積などを組み合わせます。こうして公式の形が見えてきます。'),
      beat('符号が交互に変わり、前の結果 e を使っていくのが特徴です。'),
    ],
    build(ui) {
      ui.tex(R`e_1 = s_1`, { x: LEFT_X, y: 124, size: 32 });
      ui.tex(R`s_1^{\,2} = (z_1 + \cdots + z_D)^2 = \underbrace{\sum_i z_i^2}_{s_2} + 2 \underbrace{\sum_{i<j} z_i z_j}_{e_2}`, { x: LEFT_X, y: 196, size: 30, at: 1 });
      ui.tex(R`2\, e_2 = e_1 s_1 - s_2`, { x: LEFT_X, y: 348, size: 34, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.tex(R`3\, e_3 = e_2 s_1 - e_1 s_2 + s_3`, { x: LEFT_X, y: 440, size: 34, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.tex(R`4\, e_4 = e_3 s_1 - e_2 s_2 + e_1 s_3 - s_4`, { x: LEFT_X, y: 524, size: 34, at: 4 });
      ui.text('右辺は交互の和。左辺の $e_n$ より前の結果だけで書ける', { x: LEFT_X, y: 618, size: 26, weight: 700, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解: (z1+z2+z3+z4)² の正方形
  const SQUARE = { x: 140, y: 150, size: 500 };
  const SQUARE_Z = EXAMPLE_Z;
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '和の2乗を正方形で見る',
    beats: [
      beat('4つの数の和の2乗は、1辺が和の正方形の面積です。縦横に z を並べて、16個のマスに分けます。'),
      beat('対角線のマスは、z の2乗です。これらを足すと $s_2$ になります。'),
      beat('残りのマスは、対角線の上下で同じ値が2回ずつ現れます。片側の合計が $e_2$ です。'),
      beat('数値で確かめます。和は2.1、その2乗は4.41、$s_2$ は1.37です。4.41から1.37を引いて2で割ると、$e_2$ は1.52です。', 11),
    ],
    build(ui) {
      const { 2: e2 } = M.newtonGirard(SQUARE_Z);
      const s1 = SQUARE_Z.reduce((a, b) => a + b, 0);
      const s2 = SQUARE_Z.reduce((a, b) => a + b * b, 0);
      ui.tex(R`z = (${SQUARE_Z.join(',\\;')})`, { x: 800, y: 170, size: 28, at: 3 });
      ui.tex(R`s_1 = ${texNum(s1, 2)}, \quad s_1^{\,2} = ${texNum(s1 * s1, 2)}`, { x: 800, y: 240, size: 28, at: 3, delay: 0.3 });
      ui.tex(R`s_2 = ${texNum(s2, 2)}`, { x: 800, y: 310, size: 28, at: 3, delay: 0.7 });
      ui.tex(R`e_2 = \frac{${texNum(s1 * s1, 2)} - ${texNum(s2, 2)}}{2} = ${texNum(e2, 2)}`, { x: 800, y: 380, size: 32, at: 3, delay: 1.1, glow: [{ from: 3 }] });
      ui.text('対角線 ＝ $s_2$、それ以外 ＝ $2\\,e_2$', { x: 800, y: 520, size: 26, weight: 700, at: 2, delay: 0.8 });
      return {};
    },
    draw(ctx, s) {
      const total = SQUARE_Z.reduce((a, b) => a + b, 0);
      const sizes = SQUARE_Z.map((v) => (v / total) * SQUARE.size);
      const alpha = s.p(0, 0.6);
      let top = SQUARE.y;
      SQUARE_Z.forEach((_, i) => {
        let left = SQUARE.x;
        SQUARE_Z.forEach((__, j) => {
          const diag = i === j;
          const keyed = diag ? s.p(1, 0.8) : s.p(2, 0.8);
          const color = diag ? C.yellow : i < j ? C.blue : C.aqua;
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.fillStyle = keyed > 0 ? rgba(color, 0.15 + 0.6 * keyed) : 'rgba(255,255,255,0.05)';
          ctx.fillRect(left + 2, top + 2, sizes[j] - 4, sizes[i] - 4);
          ctx.restore();
          if (sizes[j] > 50 && sizes[i] > 50) canvasText(ctx, `z${'₁₂₃₄'[i]}z${'₁₂₃₄'[j]}`, left + sizes[j] / 2, top + sizes[i] / 2 + 7, { size: 18, color: C.text, align: 'center', alpha });
          left += sizes[j];
        });
        top += sizes[i];
      });
      let cursor = SQUARE.x;
      SQUARE_Z.forEach((v, j) => {
        canvasText(ctx, `z${'₁₂₃₄'[j]}`, cursor + sizes[j] / 2, SQUARE.y - 10, { size: 20, color: C.text2, align: 'center', alpha });
        cursor += sizes[j];
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '項が2つずつ打ち消し合う',
    beats: [
      beat('公式を、すべて左辺に移して書きます。交互の和が、ゼロになるという形です。'),
      beat('各項を展開すると、単項式がたくさん出ます。単項式は、べきの部分と、基本対称式の部分の積で作られます。'),
      beat('1つの単項式に、組み A と番号 j を対応させます。A は異なる変数の組、j は高いべきを担う変数です。'),
      beat('操作は1つだけです。j が A に入っていれば取り除き、入っていなければ加えます。もう一度行うと元に戻ります。'),
      beat('この操作で、単項式は同じで、符号だけが反対の相手に移ります。だから全部が2つずつ打ち消し合い、和はゼロです。ザイルバーガーの証明です。', 12),
    ],
    build(ui) {
      ui.tex(R`\sum_{k=1}^{n} (-1)^{k-1}\, e_{n-k}\, s_k \;-\; n\, e_n = 0`, { x: LEFT_X, y: 124, size: 33 });
      ui.tex(R`(-1)^{|A|} \Big(\prod_{i \in A} z_i\Big)\; z_j^{\,n - |A|}`, { x: LEFT_X, y: 238, size: 32, at: 1 });
      ui.text('$A$：異なる変数の組（$|A| \\le n$）、$j$：変数の番号', { x: LEFT_X, y: 344, size: 24, color: C.text2, at: 2 });
      ui.text('$|A| = n$ のときは $j \\in A$ に限る（これが $n\\,e_n$ の項）', { x: LEFT_X, y: 390, size: 24, color: C.text2, at: 2, delay: 0.4 });
      seeThrough(ui.card({ x: LEFT_X, y: 450, w: 1420, h: 250, at: 3, title: '取り替えの操作' }));
      ui.tex(R`j \in A \;\Rightarrow\; (A \setminus \{j\},\, j), \qquad j \notin A \;\Rightarrow\; (A \cup \{j\},\, j)`, { x: LEFT_X + 30, y: 512, size: 29, at: 3, delay: 0.3 });
      ui.text('単項式は同じ、$|A|$ が1つ変わるので符号が反対。2回行うと元に戻る → 全部が2つずつ打ち消し合う', { x: LEFT_X + 30, y: 590, w: 1360, size: 25, weight: 700, at: 4 });
      ui.text('D. ザイルバーガー, Discrete Mathematics 49 (1984) 319', { x: LEFT_X + 30, y: 650, size: 20, color: C.muted, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解: n = 3 のタイル
  const TYPES = ['a³ 型', 'a²b 型', 'abc 型'];
  const ROWS = [
    { label: '＋ s₃', parts: [3, 0, 0] },
    { label: '− e₁ s₂', parts: [3, 6, 0] },
    { label: '＋ e₂ s₁', parts: [0, 6, 3] },
    { label: '− 3 e₃', parts: [0, 0, 3] },
  ];
  const ROW_COLORS = [C.blue, C.red, C.blue, C.red];
  const COL_X = [300, 640, 1190];
  const CELL = { w: 48, h: 44, gap: 7 };
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '3変数で打ち消し合いを見る',
    beats: [
      beat('3つの変数で、n が3のときを並べます。4つの行を、単項式の型ごとに分けました。青がプラス、赤がマイナスです。', 10),
      beat('$s_3$ は a の3乗型が3個です。$e_1$ かける $s_2$ には、同じ型が3個と、a の2乗 b 型が6個あります。'),
      beat('$e_2$ かける $s_1$ には、a の2乗 b 型が6個と、abc 型が3個あります。最後の3 $e_3$ は abc 型が3個です。'),
      beat('左の列では、1行目と2行目が打ち消し合います。符号が反対で、個数が同じです。'),
      beat('真ん中の列では2行目と3行目が、右の列では3行目と4行目が打ち消し合います。全部消えて、ゼロになりました。'),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const alpha = s.p(0, 0.6);
      TYPES.forEach((name, i) => canvasText(ctx, name, COL_X[i] + 120, 132, { size: 24, weight: 700, color: C.text, align: 'center', alpha }));
      const rowY = (r) => 160 + r * 136;
      ROWS.forEach((row, r) => {
        const rowAlpha = r === 0 ? s.p(1, 0.6) : r === 1 ? s.p(1, 0.6, 1.4) : r === 2 ? s.p(2, 0.6) : s.p(2, 0.6, 2.4);
        canvasText(ctx, row.label, 100, rowY(r) + 54, { size: 28, weight: 700, color: C.text, alpha: rowAlpha });
        row.parts.forEach((count, c) => {
          // 打ち消す組の時刻
          const pair = c === 0 ? (s.beat >= 3 ? s.p(3, 1.4, 0.8) : 0) : s.beat >= 4 ? s.p(4, 1.4, c === 1 ? 0.4 : 2.4) : 0;
          const inPair = c === 0 ? r <= 1 : c === 1 ? r === 1 || r === 2 : r >= 2;
          const fade = inPair ? 1 - 0.85 * pair : 1;
          for (let i = 0; i < count; i++) {
            const col = i % 6;
            const line = Math.floor(i / 6);
            const x = COL_X[c] + col * (CELL.w + CELL.gap);
            const y = rowY(r) + line * (CELL.h + CELL.gap) + (count <= 6 ? 34 : 8);
            ctx.save();
            ctx.globalAlpha *= rowAlpha * fade;
            roundRect(ctx, x, y, CELL.w, CELL.h, 7);
            ctx.fillStyle = rgba(ROW_COLORS[r], 0.8);
            ctx.fill();
            ctx.restore();
          }
          if (count) canvasText(ctx, `${count}`, COL_X[c] - 24, rowY(r) + 62, { size: 22, color: C.text2, align: 'right', alpha: rowAlpha * fade });
        });
      });
      if (s.beat >= 4) canvasText(ctx, '全部消えて 0', 800, 752, { size: 26, weight: 700, color: C.text, align: 'center', alpha: s.p(4, 0.6, 4) });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: '生成関数で証明する',
    beats: [
      beat('もう1つの証明です。すべての $e_n$ を係数に持つ多項式 E を考えます。かっこの積を展開すると、t の n 乗の係数が $e_n$ です。'),
      beat('対数をとると、積が和に変わります。t で微分すると、分数の和になります。'),
      beat('分数は、等比級数に展開できます。t の k 乗の係数が、z の k プラス1乗になります。足すと、べき和が出てきます。'),
      beat('分母を払うと、E の微分は、E とべき和の級数の積です。左辺の t の n−1 乗の係数は n $e_n$、右辺は e と s の積の和です。', 11),
      beat('係数を比べると、ニュートン・ジラールの公式そのものが出ます。積と和を結ぶのが、対数微分です。'),
    ],
    build(ui) {
      ui.tex(R`E(t) = \prod_{i=1}^{D} (1 + z_i t) = \sum_{n=0}^{D} e_n\, t^n`, { x: LEFT_X, y: 112, size: 31 });
      ui.tex(R`\frac{E'(t)}{E(t)} = \frac{d}{dt} \log E(t) = \sum_{i=1}^{D} \frac{z_i}{1 + z_i t}`, { x: LEFT_X, y: 208, size: 31, at: 1 });
      ui.tex(R`= \sum_{i=1}^{D} \sum_{k=1}^{\infty} (-1)^{k-1} z_i^{\,k}\, t^{k-1} = \sum_{k=1}^{\infty} (-1)^{k-1} s_k\, t^{k-1}`, { x: LEFT_X + 150, y: 310, size: 29, at: 2 });
      ui.tex(R`E'(t) = E(t) \sum_{k=1}^{\infty} (-1)^{k-1} s_k\, t^{k-1}`, { x: LEFT_X, y: 412, size: 31, at: 3 });
      ui.tex(R`[t^{n-1}]: \quad n\, e_n = \sum_{k=1}^{n} (-1)^{k-1}\, e_{n-k}\, s_k`, { x: LEFT_X, y: 524, size: 34, at: 4, glow: [{ from: 4 }] });
      ui.text('$[t^{n-1}]$：$t^{n-1}$ の係数を比べる', { x: LEFT_X, y: 640, size: 24, color: C.text2, at: 4, delay: 0.5 });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解: 係数の表
  const GRID = { x: 170, y: 170, w: 146, h: 86 };
  const GRID_N = 4;
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '係数の掛け算表で確かめる',
    beats: [
      beat('z を 0.9、0.6、0.4、0.2 とします。縦に E の係数 e、横にべき和の係数を並べ、掛け算の表を作ります。横の符号は交互です。', 11),
      beat('E の微分の t の0乗の係数は、表の左上の1マスです。値は2.1で、$e_1$ と等しくなります。'),
      beat('t の1乗の係数は、斜めの2マスの和です。3.04で、2 $e_2$ に等しくなります。'),
      beat('t の2乗は斜めの3マス、t の3乗は斜めの4マスです。どの斜めも、n $e_n$ に一致します。'),
      beat('多項式の掛け算は、この斜めの和です。公式は、係数の掛け算表の斜めを読んだものだと分かります。'),
    ],
    build() {
      const { s, e } = { s: M.powerSums(EXAMPLE_Z), e: M.newtonGirard(EXAMPLE_Z) };
      return { s, e };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.6);
      const header = (text, x, y, a = alpha) => canvasText(ctx, text, x, y, { size: 18, color: C.text2, align: 'center', weight: 700, alpha: a });
      for (let k = 1; k <= GRID_N; k++) {
        const sign = k % 2 ? '' : '−';
        header(`${sign}s${'₁₂₃₄'[k - 1]} = ${fmt((k % 2 ? 1 : -1) * st.s[k], 3)}`, GRID.x + GRID.w * (k - 0.5), GRID.y - 16);
      }
      for (let i = 0; i < GRID_N; i++) canvasText(ctx, `e${'₀₁₂₃'[i]} = ${fmt(st.e[i], 3)}`, GRID.x - 14, GRID.y + GRID.h * (i + 0.5) + 7, { size: 19, color: C.text2, align: 'right', weight: 700, alpha });
      // どの斜めを光らせるか（字幕の番号に合わせる）
      const lit = s.beat === 1 ? 1 : s.beat === 2 ? 2 : s.beat === 3 ? (s.u < s.bt(3) + (s.bt(4) - s.bt(3)) / 2 ? 3 : 4) : 0;
      for (let i = 0; i < GRID_N; i++) {
        for (let k = 1; k <= GRID_N; k++) {
          const value = st.e[i] * (k % 2 ? 1 : -1) * st.s[k];
          const diagonal = i + k;
          const on = diagonal === lit;
          const x = GRID.x + GRID.w * (k - 1);
          const y = GRID.y + GRID.h * i;
          const fill = i + k > GRID_N ? 'rgba(255,255,255,0.02)' : on ? rgba(C.yellow, 0.55) : 'rgba(255,255,255,0.07)';
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.fillStyle = fill;
          ctx.fillRect(x + 3, y + 3, GRID.w - 6, GRID.h - 6);
          ctx.restore();
          canvasText(ctx, fmt(value, 3), x + GRID.w / 2, y + GRID.h / 2 + 7, { size: 20, color: i + k > GRID_N ? C.axis : C.text, align: 'center', alpha });
        }
      }
      const rows = [1, 2, 3, 4];
      rows.forEach((n, i) => {
        const y = 210 + i * 86;
        const shown = n === 1 ? s.p(1, 0.6) : n === 2 ? s.p(2, 0.6) : n === 3 ? s.p(3, 0.6) : s.p(3, 0.6, (s.bt(4) - s.bt(3)) / 2);
        if (shown <= 0) return;
        let sum = 0;
        for (let k = 1; k <= n; k++) sum += (k % 2 ? 1 : -1) * st.e[n - k] * st.s[k];
        canvasText(ctx, `斜め ${n} マスの和 = ${fmt(sum, 3)}`, 810, y, { size: 24, weight: 700, color: C.text, alpha: shown });
        canvasText(ctx, `${n} e${'₁₂₃₄'[i]} = ${n} × ${fmt(st.e[n], n === 4 ? 4 : 3)} = ${fmt(n * st.e[n], 3)}`, 810, y + 34, { size: 21, color: C.text2, alpha: shown });
      });
    },
  });
})();
