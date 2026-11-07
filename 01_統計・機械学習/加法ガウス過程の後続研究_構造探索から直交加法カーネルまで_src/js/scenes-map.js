// scenes-map.js — はじめに、この動画のポイント、第1〜4章（全体の地図、構造探索、高次元、ランダム射影）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。部品の at は「何番目の字幕で出すか」。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, canvasText, lerp, clamp, legend, rgba, roundRect, heatmapCanvas, drawImage, seqColor } = KIT;
  const M = FOLLOWM;
  const DATA = window.FOLLOWDATA;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;
  const LEFT_X = 90;
  const CARD_X = 1010;
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  const LANE = { structure: C.violet, scale: C.aqua, projection: C.yellow, identify: C.orange, origin: C.text2 };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('加法ガウス過程の論文のあと、研究がどう広がったかを、式と図を使って解説します。', 8),
      beat('理論（式）と図解（グラフ）を交互に進めます。左上の札で、いまどちらかが分かります。'),
      beat('全部で7章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('加法ガウス過程の後続研究', { x: 0, y: 84, w: W, align: 'center', size: 68, weight: 800 });
      ui.text('構造の探索、高次元への応用、そして項を直交させる OAK まで', { x: 0, y: 192, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      ui.text('加法ガウス過程の動画の続き：論文 Duvenaud ほか（2011）から Lu ほか（2022）へ', { x: 0, y: 246, w: W, align: 'center', size: 20, color: C.muted, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, { x: left ? 130 : 830, y: 312 + (left ? i : i - 4) * 52, w: 660, size: 24, delay: 0.6 + 0.12 * i });
      });
      ui.text(`<span class="pill" style="background:${C.theory}">理論</span>式で考える`, { x: 130, y: 550, size: 24, at: 1 });
      ui.text(`<span class="pill" style="background:${C.visual}">図解</span>図で見る`, { x: 130, y: 598, size: 24, at: 1, delay: 0.2 });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 830, y: 550, size: 24, at: 2 });
      ui.text('論文の内容は要約し、図の実験はこの動画のために計算したものです', { x: 830, y: 600, w: 680, size: 20, color: C.muted, at: 2, delay: 0.4, lh: 1.5 });
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
      beat('① カーネルの和と積を文法とみて、データに合う構造を探す研究が生まれました。自動統計家につながります。', 10),
      beat('② 加法の構造は、高次元の回帰とベイズ最適化で、次元の呪いを和らげる道具になりました。', 9),
      beat('③ 軸に沿った項の代わりに、ランダムな向きの項を足す方法もあります。', 8),
      beat('④ 最大の問題は、項が重なって識別できないことでした。OAK は項を直交させて、これを解消します。', 10),
      beat('この4つを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 構造を探す', 'カーネルの和と積を文法とみて、データに合う式を探す。自動統計家（2014）へ'],
        ['② 高次元へ', '加法の構造で次元の呪いを和らげる。回帰の SALSA、ベイズ最適化の Add-GP-UCB'],
        ['③ ランダム射影', '軸に沿った項の代わりに、ランダムな向きの1次元の項を足す'],
        ['④ 識別できない問題と OAK', '項が重なると、次数も項の形も定まらない。OAK は項を直交させて解消する'],
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
    title: '2011年の論文が残した課題',
    beats: [
      beat('復習です。加法カーネルは、1次の和から全変数の積までを、次数ごとの分散で足し合わせたカーネルでした。'),
      beat('この形には、3つの課題が残りました。1つ目は、構造の自由度です。項の重みは次数ごとに1つで、どの項を使うかは選べません。周期のような別の形も入りません。', 12),
      beat('2つ目は、規模です。高次元や大きなデータで、加法の構造をどう生かすかです。'),
      beat('3つ目は、解釈です。項どうしが重なっていて、次数の分散や項の形が、1つに定まりません。'),
      beat('後続の研究は、大きくこの3つの方向に広がりました。'),
    ],
    build(ui) {
      ui.tex(R`k_{\mathrm{add}}(\mathbf{x}, \mathbf{x}') = \sum_{n=1}^{D} \sigma_n^2\; e_n\big(k_1(x_1, x_1'), \ldots, k_D(x_D, x_D')\big)`, { x: LEFT_X, y: 124, size: 33 });
      const rows = [
        [1, '① 構造の自由度', '重みは次数ごとに1つ。項は選べず、周期などの別の形も入らない', LANE.structure],
        [2, '② 規模', '高次元・大きなデータで、加法の構造をどう生かすか', LANE.scale],
        [3, '③ 解釈', '項が重なり、次数の分散や項の形が1つに定まらない', LANE.identify],
      ];
      rows.forEach(([at, title, body, color], i) => {
        const y = 260 + i * 130;
        seeThrough(ui.card({ x: LEFT_X, y, w: 1420, h: 110, at, accent: color, glow: [{ from: at, to: at + 1, color }] }));
        ui.text(title, { x: LEFT_X + 30, y: y + 32, size: 28, weight: 700, at });
        ui.text(body, { x: LEFT_X + 330, y: y + 34, w: 1060, size: 25, color: C.text2, at, delay: 0.3 });
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解: 年表
  const YEARS = [2011, 2023];
  const TIMELINE = { x: 150, w: 1330, axisY: 690 };
  const EVENTS = [
    { year: 2011, lane: 0, name: '加法ガウス過程', who: 'Duvenaud ほか', color: LANE.origin, at: 0 },
    { year: 2013, lane: 0.75, name: 'カーネル構造の探索', who: 'Duvenaud ほか', color: LANE.structure, at: 1 },
    { year: 2014, lane: 1.4, name: '自動統計家', who: 'Lloyd ほか', color: LANE.structure, at: 1 },
    { year: 2015, lane: 2.1, name: '高次元ベイズ最適化', who: 'Kandasamy ほか', color: LANE.scale, at: 2 },
    { year: 2016, lane: 2.75, name: 'SALSA', who: 'Kandasamy, Yu', color: LANE.scale, at: 2 },
    { year: 2017, lane: 2.1, name: '構造の学習と最適化', who: 'Gardner ほか', color: LANE.scale, at: 2 },
    { year: 2020, lane: 3.3, name: 'ランダム射影', who: 'Delbridge ほか', color: LANE.projection, at: 3 },
    { year: 2013, lane: 4.3, name: 'ANOVA カーネル', who: 'Durrande ほか', color: LANE.identify, at: 4 },
    { year: 2022, lane: 4.3, name: 'OAK', who: 'Lu ほか', color: LANE.identify, at: 4 },
  ];
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '研究の地図',
    beats: [
      beat('2011年の論文から、研究は枝分かれしていきます。'),
      beat('紫の枝は、構造を探す研究です。2013年のカーネル探索から、2014年の自動統計家につながります。'),
      beat('緑の枝は、高次元への応用です。ベイズ最適化と、回帰の SALSA があります。'),
      beat('黄色の枝は、ランダムな向きの項を足す、2020年の研究です。'),
      beat('橙の枝は、項を直交させる研究です。2013年の ANOVA カーネルから、2022年の OAK へ続きます。この動画の後半の主題です。'),
    ],
    build() {
      return {};
    },
    draw(ctx, s) {
      const xOf = (year) => TIMELINE.x + ((year - YEARS[0]) / (YEARS[1] - YEARS[0])) * TIMELINE.w;
      const yOf = (lane) => 170 + lane * 100;
      const alpha = s.p(0, 0.7);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(TIMELINE.x, TIMELINE.axisY);
      ctx.lineTo(TIMELINE.x + TIMELINE.w, TIMELINE.axisY);
      ctx.stroke();
      ctx.restore();
      for (let year = YEARS[0]; year <= 2022; year += 1) {
        canvasText(ctx, String(year), xOf(year), TIMELINE.axisY + 28, { size: 17, color: C.muted, align: 'center', alpha });
      }
      EVENTS.forEach((event) => {
        const k = event.at === 0 ? alpha : s.p(event.at, 0.8, 0.3);
        if (k <= 0) return;
        const x = xOf(event.year);
        const y = yOf(event.lane);
        if (event.at > 0) {
          ctx.save();
          ctx.globalAlpha *= k * 0.6;
          ctx.strokeStyle = event.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(xOf(2011) + 16, yOf(0));
          ctx.bezierCurveTo(xOf(2012), yOf(0), xOf(2012) - 20, y, x - 10, y);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha *= k;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fillStyle = event.color;
        ctx.fill();
        ctx.restore();
        canvasText(ctx, event.name, x + 20, y - 3, { size: 21, weight: 700, color: C.text, alpha: k });
        canvasText(ctx, event.who, x + 20, y + 22, { size: 17, color: C.text2, alpha: k });
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: 'カーネルの文法',
    beats: [
      beat('2013年、同じ著者らは、カーネルを式の文法として扱いました。材料は SE、周期、線形、有理二次の4種類の基底カーネルです。'),
      beat('操作は、足す、掛ける、基底を入れかえる、です。組み合わせると、多くの構造を1つの式で書けます。'),
      beat('たとえば、線形と周期の積は、振幅が増えていく季節変動です。足すと、成分に分かれます。'),
      beat('探索は貪欲法です。周辺尤度を基準に、一番良い式を選び、その式に操作を加えた候補を試します。これを繰り返します。'),
      beat('加法ガウス過程が全次数を重みで扱うのに対し、こちらは項を1つずつ選びます。翌年の自動統計家は、この結果を言葉の報告書にまで仕上げました。', 11),
    ],
    build(ui) {
      ui.table({
        x: LEFT_X, y: 116, widths: [300, 500, 540], size: 23, rowH: 48,
        header: ['基底カーネル', '表す形', '例'],
        rows: [['SE', 'なめらかな変化', 'ゆっくりした傾向'], ['周期（PER）', '繰り返し', '季節変動'], ['線形（LIN）', '直線', '増加の傾向'], ['有理二次（RQ）', 'いろいろな長さの変化', '不規則な揺れ']],
        at: 0, rowDelay: 0.3, delay: 0.3,
      });
      ui.tex(R`\mathcal{S} \to \mathcal{S} + \mathcal{B}, \qquad \mathcal{S} \to \mathcal{S} \times \mathcal{B}, \qquad \mathcal{B} \to \mathcal{B}'`, { x: LEFT_X, y: 372, size: 30, at: 1 });
      ui.tex(R`\text{LIN} \times \text{PER}: \text{ 振幅が増える周期}, \qquad \text{SE} + \text{PER}: \text{ 傾向} + \text{季節}`, { x: LEFT_X, y: 446, size: 27, at: 2 });
      ui.text('貪欲法：一番良い式を選び、操作を加えた候補を試す。周辺尤度が基準', { x: LEFT_X, y: 536, size: 26, weight: 700, at: 3 });
      ui.table({
        x: LEFT_X, y: 590, widths: [420, 460, 460], size: 22, rowH: 42,
        header: ['', '加法ガウス過程', 'カーネル探索'],
        rows: [['項の選び方', '全部の項を次数の重みで使う', '項を1つずつ選ぶ'], ['学ぶもの', '連続の重み', '離散の式と、そのパラメータ']],
        at: 4, rowDelay: 0.3, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解: 探索の木と分解
  const SERIES_POINTS = 90;
  const SERIES = (() => {
    const random = M.makeRandom(7);
    const xs = Array.from({ length: SERIES_POINTS }, (_, i) => (i * 10) / (SERIES_POINTS - 1));
    const trend = (x) => 0.35 * x + 0.8 * Math.sin(0.5 * x);
    const season = (x) => 1.1 * Math.sin((2 * Math.PI * x) / 1.5);
    const ys = xs.map((x) => trend(x) + season(x) + 0.12 * random.normal());
    const smooth = (a, b) => 4 * M.se(a, b, 2.5);
    const cycle = (a, b) => M.periodic(a, b, 1.5, 1);
    const K = xs.map((a, i) => xs.map((b, j) => smooth(a, b) + cycle(a, b) + (i === j ? 0.0144 : 0)));
    const mean = ys.reduce((p, v) => p + v, 0) / SERIES_POINTS;
    const alpha = M.solveCholesky(M.cholesky(K), ys.map((v) => v - mean));
    const axis = Array.from({ length: 201 }, (_, i) => (i * 10) / 200);
    const part = (kernel) => axis.map((x) => xs.reduce((sum, b, j) => sum + kernel(x, b) * alpha[j], 0));
    const smoothPart = part(smooth).map((v) => v + mean);
    const cyclePart = part(cycle);
    return { xs, ys, axis, smoothPart, cyclePart, trueTrend: axis.map(trend), trueSeason: axis.map(season), total: smoothPart.map((v, i) => v + cyclePart[i]) };
  })();
  const TREE = [
    { x: 240, y: 200, label: 'SE', on: true, level: 0 },
    { x: 400, y: 200, label: 'PER', level: 0 },
    { x: 560, y: 200, label: 'LIN', level: 0 },
    { x: 150, y: 370, label: 'SE + SE', level: 1 },
    { x: 330, y: 370, label: 'SE + PER', on: true, level: 1 },
    { x: 510, y: 370, label: 'SE × PER', level: 1 },
    { x: 690, y: 370, label: 'SE + LIN', level: 1 },
    { x: 240, y: 540, label: 'SE + PER + LIN', level: 2 },
    { x: 510, y: 540, label: 'SE + SE × PER', level: 2 },
  ];
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '式を探し、成分に分ける',
    beats: [
      beat('探索の様子です。1段目で基底カーネルを1つ試し、一番良いものに操作を加えて、2段目の候補を作ります。'),
      beat('2段目では、SE たす PER の式が選ばれたとします。さらに次の段へ進み、改善しなくなれば止めます。'),
      beat('右は、説明用の時系列を、この式で分解した結果です。カーネルが和なので、関数も和に分かれます。'),
      beat('ゆっくりした傾向と、周期の成分に分かれました。式が読めるので、「増える傾向に、季節変動が乗っている」と言葉で説明できます。', 11),
    ],
    build() {
      return {
        top: new Plot({ x: 840, y: 130, w: 660, h: 170, xr: [0, 10], yr: [-2.5, 6] }),
        middle: new Plot({ x: 840, y: 340, w: 660, h: 150, xr: [0, 10], yr: [-1.5, 5.5] }),
        bottom: new Plot({ x: 840, y: 530, w: 660, h: 150, xr: [0, 10], yr: [-1.8, 1.8] }),
      };
    },
    draw(ctx, s, st) {
      const levelAlpha = [s.p(0, 0.7), s.p(0, 0.7, 2.5), s.p(1, 0.7, 2.5)];
      const parents = [[3, 0], [4, 0], [5, 0], [6, 0], [7, 4], [8, 4]];
      parents.forEach(([child, parent]) => {
        const c = TREE[child];
        const p = TREE[parent];
        ctx.save();
        ctx.globalAlpha *= levelAlpha[c.level];
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 26);
        ctx.lineTo(c.x, c.y - 26);
        ctx.stroke();
        ctx.restore();
      });
      TREE.forEach((node) => {
        const k = levelAlpha[node.level];
        const chosen = node.on && (node.level === 0 ? s.p(0, 0.7, 1.4) : s.p(1, 0.7, 0.5));
        const width = Math.max(100, node.label.length * 14 + 20);
        ctx.save();
        ctx.globalAlpha *= k;
        roundRect(ctx, node.x - width / 2, node.y - 26, width, 52, 10);
        ctx.fillStyle = chosen > 0 ? rgba(LANE.structure, 0.2 + 0.7 * chosen) : C.panel;
        ctx.fill();
        ctx.strokeStyle = chosen > 0 ? LANE.structure : C.axis;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        canvasText(ctx, node.label, node.x, node.y + 7, { size: 19, weight: 700, color: C.text, align: 'center', alpha: k });
      });
      if (s.beat >= 2) {
        const alpha = s.p(2, 0.7);
        const upto = s.p(2, 2, 0.3);
        st.top.axes(ctx, { xticks: [], yticks: [0, 4], ylabel: 'データと予測', alpha });
        st.top.dots(ctx, SERIES.xs, SERIES.ys, { color: C.text2, r: 3, alpha, ring: null });
        st.top.line(ctx, SERIES.axis, SERIES.total, { color: LANE.structure, upto, alpha });
        const parts = s.beat >= 3 ? s.p(3, 0.7) : 0;
        if (parts > 0) {
          st.middle.axes(ctx, { xticks: [], yticks: [0, 4], ylabel: '傾向の成分（SE）', alpha: parts });
          st.middle.line(ctx, SERIES.axis, SERIES.trueTrend, { color: C.text, dash: [8, 6], width: 2, alpha: parts });
          st.middle.line(ctx, SERIES.axis, SERIES.smoothPart, { color: C.aqua, alpha: parts, upto: s.p(3, 2, 0.3) });
          st.bottom.axes(ctx, { xticks: [0, 2, 4, 6, 8, 10], yticks: [-1, 0, 1], ylabel: '周期の成分（PER）', xlabel: '時刻', alpha: parts });
          st.bottom.line(ctx, SERIES.axis, SERIES.trueSeason, { color: C.text, dash: [8, 6], width: 2, alpha: parts });
          st.bottom.line(ctx, SERIES.axis, SERIES.cyclePart, { color: C.orange, alpha: parts, upto: s.p(3, 2, 0.3) });
        }
      }
    },
  });

  // ---------------------------------------------------------------- 第3章 理論
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '次元の呪いを和らげる',
    beats: [
      beat('ノンパラメトリックな回帰の誤差は、次元に指数で悪くなることが知られています。真の関数が加法なら、これが大きく改善します。'),
      beat('SALSA は、カーネルリッジ回帰に、d 次までの加法カーネルを使います。項の数は組み合わせの数ですが、ジラール・ニュートンの公式で計算します。', 11),
      beat('論文の結果では、関数が加法なら、過剰リスクは次元の多項式で済みます。手間は D かける d の2乗です。'),
      beat('ベイズ最適化では、獲得関数の最大化が難問です。D 次元の探索は、それ自体が大変です。'),
      beat('加法の構造があれば、獲得関数も和に分かれ、低次元の探索を別々に行えます。後悔の増え方は、次元に比例する程度に抑えられます。', 10),
      beat('ガードナーらは、どの変数を組にするかが分からない場合に、最適化しながら構造を学ぶ方法を示しました。'),
    ],
    build(ui) {
      ui.text('SALSA（カンダサミ、ユー 2016）', { x: LEFT_X, y: 112, size: 26, weight: 700, at: 1 });
      ui.tex(R`f(\mathbf{x}) = \sum_{|S| \le d} f_S(\mathbf{x}_S), \qquad \text{項は } \sum_{n \le d} \tbinom{D}{n} \text{ 個、手間は } O(D d^2)`, { x: LEFT_X, y: 156, size: 28, at: 1, delay: 0.3 });
      ui.text('関数が加法なら、過剰リスクは次元の多項式（一般のノンパラメトリック回帰は指数）', { x: LEFT_X, y: 244, size: 24, color: C.text2, at: 2 });
      ui.text('高次元ベイズ最適化（カンダサミほか 2015）', { x: LEFT_X, y: 324, size: 26, weight: 700, at: 3 });
      ui.tex(R`f(\mathbf{x}) = \sum_{j=1}^{M} f_j(\mathbf{x}_{A_j}) \;\Rightarrow\; \varphi(\mathbf{x}) = \sum_{j=1}^{M} \varphi_j(\mathbf{x}_{A_j})`, { x: LEFT_X, y: 370, size: 30, at: 4 });
      ui.text('獲得関数 $\\varphi$ も和に分かれるので、$\\mathbf{x}_{A_j}$ ごとに別々に最大化できる', { x: LEFT_X, y: 470, size: 24, color: C.text2, at: 4, delay: 0.4 });
      ui.text('後悔（一番良い値との差）の増え方は、次元に比例する程度', { x: LEFT_X, y: 516, size: 24, color: C.text2, at: 4, delay: 0.8 });
      ui.text('構造の学習（ガードナーほか 2017）', { x: LEFT_X, y: 590, size: 26, weight: 700, at: 5 });
      ui.text('どの変数を組にするかを、メトロポリス・ヘイスティングス法で探しながら最適化する', { x: LEFT_X, y: 636, size: 24, color: C.text2, at: 5, delay: 0.3 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解: ベイズ最適化
  const BO = DATA.bo;
  const BO_NAMES = { additive: '加法の構造を使う', full: 'SE カーネル', random: '乱数で探す' };
  const BO_COLORS = { additive: C.orange, full: C.blue, random: C.muted };
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: 'ベイズ最適化の小さな実験（この動画の計算）',
    beats: [
      beat(`${BO.dimension}変数の関数の最大値を、${BO.starts}点から始めて100回の評価で探しました。関数は1変数の山の和で、最大値は${fmt(BO.best, 1)}です。乱数を変えて${BO.seeds}回の平均です。`, 11),
      beat('灰色は乱数で探した場合、青は全変数の SE カーネルのベイズ最適化です。10次元では、100回でも乱数とほとんど変わりません。'),
      beat(`橙は、加法の構造を知っている場合です。1変数ずつ獲得関数を最大にでき、最大値の${fmt(BO.additive[BO.additive.length - 1], 1)}まで届きました。`),
      beat('ただしこれは、構造が分かっている場合の結果です。構造を学ぶ研究が必要になる理由も、ここにあります。'),
    ],
    build() {
      return { plot: new Plot({ x: 170, y: 140, w: 1230, h: 530, xr: [BO.starts, BO.additive.length], yr: [4, 10.5] }) };
    },
    draw(ctx, s, st) {
      const plot = st.plot;
      const alpha = s.p(0, 0.7);
      plot.axes(ctx, { xticks: [10, 30, 50, 70, 90, 110], yticks: [4, 6, 8, 10], xlabel: '評価の回数', ylabel: 'それまでの最大の値', alpha, zero: false });
      plot.hline(ctx, BO.best, { color: C.text2, alpha, dash: [8, 7] });
      canvasText(ctx, `最大値 ${fmt(BO.best, 1)}`, plot.x + plot.w - 6, plot.sy(BO.best) - 8, { size: 17, color: C.text2, align: 'right', alpha });
      const xs = Array.from({ length: BO.additive.length }, (_, i) => i + 1);
      [['random', 1], ['full', 1], ['additive', 2]].forEach(([name, at], i) => {
        const k = s.p(at, 0.6, i === 1 ? 0.6 : 0);
        plot.line(ctx, xs, BO[name], { color: BO_COLORS[name], width: 3.5, alpha: k, upto: s.lin(at, 3, i === 1 ? 0.6 : 0) });
        if (k > 0) canvasText(ctx, `${BO_NAMES[name]}  ${fmt(BO[name][BO[name].length - 1], 1)}`, plot.x + plot.w - 6, plot.sy(BO[name][BO[name].length - 1]) + (name === 'full' ? -12 : name === 'random' ? 22 : -12), { size: 19, weight: 700, color: C.text, align: 'right', alpha: k });
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: 'ランダムな向きの項を足す',
    beats: [
      beat('これまでの項は、座標の軸に沿っていました。2020年のデルブリッジらは、軸に沿わない和を考えました。'),
      beat('入力をランダムな向きに射影し、低次元のカーネルを作って足します。1次元の射影でも構いません。'),
      beat('射影の数 J を増やすと、全次元のカーネルに近づきます。逆マルチ二次カーネルに、J の平方根分の1の速さで収束することが示されています。', 11),
      beat('ねらいは計算の速さです。1次元のカーネルは、格子を使う速い計算が使えます。高次元のデータにも、そのまま適用できます。'),
    ],
    build(ui) {
      ui.tex(R`k_{\mathrm{RP}}(\mathbf{x}, \mathbf{x}') = \frac{1}{J} \sum_{j=1}^{J} k\big(P_j \mathbf{x},\; P_j \mathbf{x}'\big)`, { x: LEFT_X, y: 124, size: 34, at: 1 });
      ui.text('$P_j$：ランダムな射影（1次元でもよい）。軸に沿った項の和と違い、向きは乱数で決める', { x: LEFT_X, y: 232, size: 24, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`J \to \infty: \quad k_{\mathrm{RP}} \to \text{全次元の逆マルチ二次カーネル}, \qquad \text{速さ } O(J^{-1/2})`, { x: LEFT_X, y: 318, size: 29, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.table({
        x: LEFT_X, y: 430, widths: [400, 470, 470], size: 23, rowH: 52,
        header: ['', '加法カーネル', 'ランダム射影'],
        rows: [['項の向き', '座標の軸', 'ランダム'], ['解釈', '項が変数に対応する', '向きに意味はない'], ['ねらい', '構造の発見と解釈', '速さと精度']],
        at: 3, rowDelay: 0.3, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解: 尾根の和
  const RP_COUNTS = [1, 2, 5, 20, 200];
  const RP_PIXELS = 120;
  const RP_RANGE = 3;
  const RP_ELL = 0.5;
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '尾根を足すと山になる',
    beats: [
      beat('2次元の入力で、原点の点とのカーネルの値を色で描きました。1つの射影のカーネルは、向きに垂直に続く尾根です。'),
      beat('射影を増やして足していきます。2本、5本と重なると、原点だけが明るくなります。'),
      beat('20本、200本では、向きの偏りが消えて、原点のまわりの丸い山になります。'),
      beat('1本1本は1次元の簡単なカーネルなのに、足すと全次元のカーネルに近づきます。すそが長い形で、これが逆マルチ二次カーネルの特徴です。', 11),
    ],
    build() {
      const random = M.makeRandom(11);
      const angles = Array.from({ length: Math.max(...RP_COUNTS) }, () => random.uniform() * Math.PI);
      const images = RP_COUNTS.map((J) => {
        const value = (a, b) => {
          let sum = 0;
          for (let j = 0; j < J; j++) sum += M.se(a * Math.cos(angles[j]) + b * Math.sin(angles[j]), 0, RP_ELL);
          return sum / J;
        };
        return heatmapCanvas(RP_PIXELS, RP_PIXELS, (i, j) => {
          const a = -RP_RANGE + (2 * RP_RANGE * (j + 0.5)) / RP_PIXELS;
          const b = RP_RANGE - (2 * RP_RANGE * (i + 0.5)) / RP_PIXELS;
          return seqColor(value(a, b));
        });
      });
      return { images };
    },
    draw(ctx, s, st) {
      const size = 268;
      const gap = 18;
      const left = (W - (size * RP_COUNTS.length + gap * (RP_COUNTS.length - 1))) / 2;
      const timing = [[0, 0], [1, 0], [1, 2.2], [2, 0], [2, 2.2]];
      RP_COUNTS.forEach((J, i) => {
        const [at, delay] = timing[i];
        const alpha = s.p(at, 0.8, delay);
        const x = left + i * (size + gap);
        drawImage(ctx, st.images[i], x, 240, size, size, { smooth: true, alpha });
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(x, 240, size, size);
        ctx.restore();
        canvasText(ctx, `J = ${J}`, x + size / 2, 222, { size: 24, weight: 700, color: C.text, align: 'center', alpha });
      });
      canvasText(ctx, 'カーネルの値（明るいほど大きい）。向きは乱数で決めた', W / 2, 560, { size: 19, color: C.muted, align: 'center', alpha: s.p(0, 0.8) });
    },
  });
})();
