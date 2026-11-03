// scenes-data.js — 画像と点群で見る場面（第4〜6章、まとめ、おわり）。書き方は scenes-plane.js と同じ。
// 画像は svd-math.js が式で描いた 120×160 の白黒画像。特異値・誤差・保存する数は、その分解から計算して表示する。
(() => {
  const { W, C, Plot, fmt, texNum, canvasText, keyframes, lerp, rgba, clamp, divColor, heatmapCanvas, drawImage } = KIT;
  const M = SVDM;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };

  // ---- 画像の特異値分解 ----
  const IMAGE = M.makeLandscape();
  const ROWS = M.IMAGE_ROWS;
  const COLS = M.IMAGE_COLS;
  const IMAGE_SVD = M.svd(IMAGE);
  // uᵢ と vᵢ は符号を同時に反転しても同じ層になる。見やすさのため vᵢ の和が正になる向きにそろえる
  IMAGE_SVD.V.forEach((v, i) => {
    if (v.reduce((a, b) => a + b, 0) < 0) {
      v.forEach((x, j) => (v[j] = -x));
      IMAGE_SVD.U[i].forEach((x, j) => (IMAGE_SVD.U[i][j] = -x));
    }
  });
  const S = IMAGE_SVD.S;
  // 最大の特異値のこの割合より小さいものは、計算の丸め誤差とみなして 0 と数える
  const RANK_TOLERANCE = 1e-10;
  const IMAGE_RANK = S.filter((s) => s > S[0] * RANK_TOLERANCE).length;
  const STORE_ALL = ROWS * COLS;
  const store = (k) => k * (ROWS + COLS + 1);
  const comma = (n) => n.toLocaleString('en-US');
  const percent = (x, digits = 1) => `${fmt(100 * x, digits)}%`;
  const LAYER_COUNT = 4;
  const APPROX_KS = [1, 2, 5, 10, 20, 40];
  const TABLE_KS = [5, 10, 20, 40];

  // 画像の表示: 明るさ 0〜1 を灰色に（範囲の外は切る）
  const grayCanvas = (A) => heatmapCanvas(ROWS, COLS, (i, j) => {
    const v = 12 + 235 * clamp(A[i][j]);
    return [v, v, v];
  });
  const maxAbs = (values) => values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  // 正負のある値（層・ベクトル）は、赤＝正、青＝負で描く
  const signedCanvas = (A) => {
    const max = Math.max(...A.map(maxAbs));
    return heatmapCanvas(A.length, A[0].length, (i, j) => divColor(A[i][j] / max));
  };
  const stripCanvas = (vector, vertical) => {
    const max = maxAbs(vector);
    return vertical
      ? heatmapCanvas(vector.length, 1, (i) => divColor(vector[i] / max))
      : heatmapCanvas(1, vector.length, (_, j) => divColor(vector[j] / max));
  };
  function frameImage(ctx, image, x, y, w, h, alpha = 1) {
    if (alpha <= 0) return;
    drawImage(ctx, image, x, y, w, h, { smooth: true, alpha });
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 第4章 理論（ランク1行列の和）
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: 'ランク1行列の和 ― 外積で書きかえる',
    beats: [
      beat(R`$U\Sigma V^\top$ を列ごとに展開すると、$A$ は「$\sigma_i$ 倍した $\mathbf{u}_i\mathbf{v}_i^\top$」の足し算になります。`),
      beat(R`$\mathbf{u}\mathbf{v}^\top$ は縦ベクトルと横ベクトルの外積。どの行も同じ形の定数倍になる、いちばん単純な「ランク1」の行列です。`, 10),
      beat('つまり特異値分解は、行列を重みつきのランク1の層に分けることです。重みが特異値で、大きい順に並びます。', 10),
      beat('0 でない特異値の数が、行列のランク（本当の次元の数）です。'),
    ],
    build(ui) {
      ui.tex(R`A = U\Sigma V^\top = \begin{bmatrix}\mathbf{u}_1 & \cdots & \mathbf{u}_r\end{bmatrix}\begin{bmatrix}\sigma_1 & & \\ & \ddots & \\ & & \sigma_r\end{bmatrix}\begin{bmatrix}\mathbf{v}_1^\top \\ \vdots \\ \mathbf{v}_r^\top\end{bmatrix}`, { x: LEFT_X, y: 125, size: 28 });
      ui.tex(R`A = \htmlClass{hlL1}{\sigma_1\mathbf{u}_1\mathbf{v}_1^\top} + \sigma_2\mathbf{u}_2\mathbf{v}_2^\top + \cdots + \sigma_r\mathbf{u}_r\mathbf{v}_r^\top`, {
        x: LEFT_X, y: 300, size: 40, delay: 1.0,
        hl: [{ cls: 'hlL1', from: 1, to: 2, color: C.yellow }],
        glow: [{ from: 2, to: 3, color: C.yellow }],
      });
      ui.text('ランク1の層を、重み σ（大きい順）で足し合わせる', { x: LEFT_X + 30, y: 390, size: 24, color: C.text2, at: 2 });
      ui.tex(R`\operatorname{rank}(A) = r = \#\{\, i : \sigma_i > 0 \,\}`, { x: LEFT_X, y: 480, size: 36, at: 3 });
      ui.text('（0 でない特異値の個数）', { x: LEFT_X + 30, y: 545, size: 22, color: C.text2, at: 3, delay: 0.5 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 420, title: R`ランク1の行列 $\mathbf{u}\mathbf{v}^\top$（外積）`, at: 1 });
      ui.tex(R`\begin{bmatrix}1\\2\\3\end{bmatrix}\begin{bmatrix}2&1&0\end{bmatrix} = \begin{bmatrix}2&1&0\\4&2&0\\6&3&0\end{bmatrix}`, { x: CARD_X + 40, y: 190, size: 30, at: 1, delay: 0.3 });
      ui.text('どの行も (2, 1, 0) の定数倍', { x: CARD_X + 24, y: 365, size: 23, at: 1, delay: 1.0 });
      ui.text('→ 本当の次元は 1（ランク1）', { x: CARD_X + 24, y: 410, size: 23, at: 1, delay: 1.4 });
      ui.text('3 + 3 = 6 個の数で、9 個の数の行列を表せる', { x: CARD_X + 24, y: 470, size: 21, color: C.text2, at: 1, delay: 1.8 });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解（画像を層に分ける）
  const ORIGINAL = { x: 90, y: 175, w: 400, h: 300 };
  const PATCH = { r: 58, c: 32, size: 5 }; // 屋根の斜めのふち（山 0.46 と屋根 0.17 の境目）にかかる 5×5 画素
  const LAYER_W = 190;
  const LAYER_H = LAYER_W * (ROWS / COLS);
  const LAYER_X = (j) => 652 + j * 220;
  const LAYER_ROW_Y = 230;
  const SUM_ROW_Y = 482;
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '画像を、ランク1の層に分ける',
    beats: [
      beat(`白黒の画像は、明るさの数を並べた行列です。この画像は ${ROWS} 行 × ${COLS} 列、${comma(STORE_ALL)} 個の数です。`, 8),
      beat(R`1枚目の層 $\sigma_1\mathbf{u}_1\mathbf{v}_1^\top$。左の帯 $\mathbf{u}_1$ と上の帯 $\mathbf{v}_1$ の掛け算なので、縦横にそろった大まかな明るさだけです。`, 10),
      beat('2〜4枚目の層は、それぞれ別の縦横の模様です。重み（特異値）は順に小さくなります。', 9),
      beat('下の段は、層を足した結果です。4枚足すと、空と地面、家の位置が見えてきます。', 9),
    ],
    build(ui) {
      ui.text(`もとの画像（${ROWS} × ${COLS} の行列）`, { ...TITLE, x: ORIGINAL.x, y: ORIGINAL.y - 42 });
      ui.text('拡大すると、明るさの数（0 = 黒、1 = 白）', { x: ORIGINAL.x, y: 500, size: 20, color: C.text2, delay: 1.2 });
      ui.text(R`1枚ずつの層 $\sigma_i\mathbf{u}_i\mathbf{v}_i^\top$（左の帯 $\mathbf{u}_i$ × 上の帯 $\mathbf{v}_i^\top$）　<span style="color:${C.red}">赤＝正</span>・<span style="color:${C.blue}">青＝負</span>`, { ...TITLE, x: 630, y: 135, at: 1 });
      ui.text(R`層を足した結果 $A_k$（1〜$k$ 枚目の和）`, { ...TITLE, x: 630, y: 425, at: 3 });
      return {
        original: grayCanvas(IMAGE),
        layers: Array.from({ length: LAYER_COUNT }, (_, i) => ({
          image: signedCanvas(M.layer(IMAGE_SVD, i)),
          u: stripCanvas(IMAGE_SVD.U[i], true),
          v: stripCanvas(IMAGE_SVD.V[i], false),
        })),
        sums: (() => {
          const series = M.lowRankSeries(IMAGE_SVD, [1, 2, 3, 4]);
          return [1, 2, 3, 4].map((k) => grayCanvas(series[k]));
        })(),
      };
    },
    draw(ctx, s, st) {
      const o = ORIGINAL;
      const scale = o.w / COLS;
      frameImage(ctx, st.original, o.x, o.y, o.w, o.h, s.p(0, 0.6));
      // 拡大する 5×5 の場所と、その数値
      const zoom = s.p(0, 0.8, 1.0);
      if (zoom > 0) {
        ctx.save();
        ctx.globalAlpha = zoom;
        const px = o.x + PATCH.c * scale;
        const py = o.y + PATCH.r * scale;
        const side = PATCH.size * scale;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px, py, side, side);
        const tx = o.x;
        const ty = 530;
        const cellW = 66;
        const cellH = 34;
        ctx.strokeStyle = rgba(C.yellow, 0.5);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py + side);
        ctx.lineTo(tx, ty);
        ctx.moveTo(px + side, py + side);
        ctx.lineTo(tx + cellW * PATCH.size, ty);
        ctx.stroke();
        ctx.strokeStyle = C.yellow;
        ctx.strokeRect(tx, ty, cellW * PATCH.size, cellH * PATCH.size);
        for (let i = 0; i < PATCH.size; i++) {
          for (let j = 0; j < PATCH.size; j++) {
            const v = IMAGE[PATCH.r + i][PATCH.c + j];
            const g = Math.round(12 + 235 * v);
            ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
            ctx.fillRect(tx + j * cellW + 1, ty + i * cellH + 1, cellW - 2, cellH - 2);
            canvasText(ctx, fmt(v, 2), tx + (j + 0.5) * cellW, ty + (i + 0.5) * cellH + 7, { size: 19, color: C.text, align: 'center', weight: 600 });
          }
        }
        ctx.restore();
      }
      // 上の段: 層（u の帯 × v の帯）
      st.layers.forEach((layer, i) => {
        const a = i === 0 ? s.p(1, 0.8) : s.p(2, 0.8, (i - 1) * 0.9);
        if (a <= 0) return;
        const x = LAYER_X(i);
        const y = LAYER_ROW_Y;
        drawImage(ctx, layer.u, x - 18, y, 12, LAYER_H, { smooth: true, alpha: a });
        drawImage(ctx, layer.v, x, y - 18, LAYER_W, 12, { smooth: true, alpha: a });
        frameImage(ctx, layer.image, x, y, LAYER_W, LAYER_H, a);
        canvasText(ctx, `σ${'₁₂₃₄'[i]} = ${fmt(S[i], 1)}`, x + LAYER_W / 2, y + LAYER_H + 28, { size: 19, color: C.text, align: 'center', weight: 600, alpha: a });
      });
      // 下の段: 足した結果
      st.sums.forEach((image, i) => {
        const a = s.p(3, 0.8, i * 0.8);
        if (a <= 0) return;
        const x = LAYER_X(i);
        frameImage(ctx, image, x, SUM_ROW_Y, LAYER_W, LAYER_H, a);
        canvasText(ctx, `A${'₁₂₃₄'[i]}（誤差 ${percent(M.relativeError(S, i + 1))}）`, x + LAYER_W / 2, SUM_ROW_Y + LAYER_H + 28, { size: 18, color: C.text2, align: 'center', alpha: a });
      });
    },
  });

  // ---------------------------------------------------------------- 第5章 理論（低ランク近似）
  SCENES.push({
    id: '5T',
    chapter: 5,
    kind: 'theory',
    title: '低ランク近似 ― エッカート・ヤングの定理',
    beats: [
      beat(R`大きい方から $k$ 個の層だけを残した $A_k$ を「ランク $k$ 近似」と呼びます。`),
      beat(R`エッカート・ヤングの定理：ランク $k$ 以下の行列の中で、$A$ にいちばん近いのが $A_k$ です。これより良い近似はありません。`, 10),
      beat('誤差は、捨てた特異値だけで決まります。特異値が急に小さくなる行列ほど、少ない層でよく近似できます。', 10),
      beat(R`保存する数は $k$ 組の $\mathbf{u}, \mathbf{v}, \sigma$ で $k(m+n+1)$ 個。この画像なら $k = 20$ で、もとの約 ${fmt((100 * store(20)) / STORE_ALL, 0)}% です。`, 10),
    ],
    build(ui) {
      ui.tex(R`A_k = \sum_{i=1}^{k} \sigma_i\mathbf{u}_i\mathbf{v}_i^\top\qquad (k < r)`, { x: LEFT_X, y: 125, size: 38 });
      ui.tex(R`\min_{\operatorname{rank}(B) \le k} \|A - B\|_F = \|A - A_k\|_F`, { x: LEFT_X, y: 255, size: 36, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.text('エッカート・ヤングの定理（1936）', { x: LEFT_X + 30, y: 335, size: 22, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`\|A - A_k\|_F = \sqrt{\sigma_{k+1}^2 + \sigma_{k+2}^2 + \cdots + \sigma_r^2},\qquad \|A - A_k\|_2 = \sigma_{k+1}`, { x: LEFT_X, y: 405, size: 30, at: 2 });
      ui.text(R`$\|\cdot\|_F$：全要素の2乗和の平方根（フロベニウスノルム）`, { x: LEFT_X + 30, y: 480, size: 21, color: C.text2, at: 2, delay: 0.6 });
      ui.tex(R`\text{保存する数} = k\,(m + n + 1)\quad \text{（もとは } mn \text{ 個）}`, { x: LEFT_X, y: 560, size: 30, at: 3 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 340, title: `この画像（${ROWS} × ${COLS} ＝ ${comma(STORE_ALL)} 個）`, at: 3 });
      ui.table({
        x: CARD_X + 14, y: 180, widths: [70, 170, 120, 110], size: 21, rowH: 46,
        header: ['$k$', '保存する数', 'もとの', '誤差'],
        rows: TABLE_KS.map((k) => [k, comma(store(k)), percent(store(k) / STORE_ALL), percent(M.relativeError(S, k))]),
        at: 3, rowDelay: 0.3, glowRows: TABLE_KS.map((k) => (k === 20 ? [{ from: 3, color: C.yellow }] : null)),
      });
      ui.text(R`誤差 ＝ $\|A - A_k\|_F / \|A\|_F$`, { x: CARD_X + 24, y: 425, size: 19, color: C.muted, at: 3, delay: 1.5 });
    },
  });

  // ---------------------------------------------------------------- 第5章 図解（k を増やしていく）
  const BIG = { x: 90, y: 170, w: 560, h: 420 };
  const SMALL = { x: 720, y: 170, w: 240, h: 180 };
  const SPECTRUM = new Plot({ x: 800, y: 440, w: 690, h: 220, xr: [0, IMAGE_RANK + 2], yr: [-3, 2] });
  const SPECTRUM_TICKS = [-3, -2, -1, 0, 1, 2];
  const CROSSFADE_SECONDS = 0.4;
  SCENES.push({
    id: '5V',
    chapter: 5,
    kind: 'visual',
    title: 'ランク k 近似で画像を作り直す',
    beats: [
      beat(R`画像をランク $k$ で近似していきます。$k = 1, 2$ では、縦横にそろった大まかな明るさだけです。`, 8),
      beat(R`$k = 5, 10$ で、家と山の形が分かるようになります。`, 8),
      beat(R`$k = 20, 40$ では、もとの画像とほとんど見分けがつきません。$k = 20$ なら、保存する数は約 ${fmt((100 * store(20)) / STORE_ALL, 0)}% です。`, 9),
      beat('右下は特異値の大きさ（対数目盛）です。急に小さくなるので、前の少しの層に画像の大部分が入っています。山の斜めの線や細かい形は、後ろの層が受け持ちます。', 12),
    ],
    build(ui) {
      ui.text(`もとの画像（ランク ${IMAGE_RANK}）`, { ...TITLE, x: SMALL.x, y: SMALL.y - 42 });
      ui.text(R`特異値 $\sigma_i$（対数目盛）`, { ...TITLE, x: SPECTRUM.x, y: SPECTRUM.y - 50 });
      ui.text('縦横にそろった形 → 前の層<br>斜めの線・細かい形 → 後ろの層', { x: BIG.x, y: BIG.y + BIG.h + 22, w: BIG.w, size: 22, color: C.text2, at: 3, delay: 1.5 });
      const series = M.lowRankSeries(IMAGE_SVD, APPROX_KS);
      return {
        original: grayCanvas(IMAGE),
        approx: Object.fromEntries(APPROX_KS.map((k) => [k, grayCanvas(series[k])])),
      };
    },
    draw(ctx, s, st) {
      // k の時刻表: 字幕ごとに2段ずつ進める
      const schedule = [
        [s.bt(0), 1], [s.bt(0) + 3.5, 2],
        [s.bt(1) + 0.3, 5], [s.bt(1) + 3.5, 10],
        [s.bt(2) + 0.3, 20], [s.bt(2) + 3.5, 40],
      ];
      let index = 0;
      schedule.forEach(([t], i) => {
        if (s.u >= t) index = i;
      });
      const k = schedule[index][1];
      const fade = index === 0 ? 1 : clamp((s.u - schedule[index][0]) / CROSSFADE_SECONDS);
      const appear = s.p(0, 0.6);
      ctx.globalAlpha = appear;
      if (index > 0 && fade < 1) frameImage(ctx, st.approx[schedule[index - 1][1]], BIG.x, BIG.y, BIG.w, BIG.h);
      frameImage(ctx, st.approx[k], BIG.x, BIG.y, BIG.w, BIG.h, fade);
      canvasText(ctx, `ランク ${k} 近似  A${k}`, BIG.x, BIG.y - 20, { size: 24, color: C.text, weight: 700 });
      frameImage(ctx, st.original, SMALL.x, SMALL.y, SMALL.w, SMALL.h);

      // 数値
      const sx = 1000;
      canvasText(ctx, `k = ${k}`, sx, SMALL.y + 34, { size: 34, color: C.yellow, weight: 700 });
      canvasText(ctx, `保存する数 ${comma(store(k))}（もとの ${percent(store(k) / STORE_ALL)}）`, sx, SMALL.y + 92, { size: 22, color: C.text });
      canvasText(ctx, `誤差 ${percent(M.relativeError(S, k))}`, sx, SMALL.y + 138, { size: 22, color: C.text });

      // 特異値のグラフ（残した層は青、捨てた層は灰色）
      const P = SPECTRUM;
      const focus = s.win(3);
      P.axes(ctx, { xticks: [1, 20, 40, 60, 80, IMAGE_RANK], yticks: SPECTRUM_TICKS, fmtY: (v) => (v >= 0 ? comma(10 ** v) : String(10 ** v)), xlabel: 'i（大きい順の番号）', zero: false });
      for (let i = 0; i < IMAGE_RANK; i++) {
        const kept = i < k;
        const x = P.sx(i + 1);
        const y = P.sy(Math.log10(S[i]));
        ctx.beginPath();
        ctx.arc(x, y, kept ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = kept ? C.blue : C.muted;
        ctx.fill();
      }
      P.vline(ctx, k + 0.5, { color: C.yellow, dash: [6, 5], width: 2 });
      // 線の右下（点の少ないところ）に書く
      P.label(ctx, `← ここまで残す（k = ${k}）`, k + 0.5, -3, { dx: 8, dy: -10, size: 17, color: C.yellow, alpha: 1 });
      if (focus > 0) {
        ctx.save();
        ctx.globalAlpha *= focus;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.strokeRect(P.x - 6, P.sy(2.05), P.sx(12) - P.x + 12, P.sy(0) - P.sy(2.05) + 10);
        canvasText(ctx, '急に小さくなる', P.sx(12) + 12, P.sy(1.6), { size: 19, color: C.yellow, weight: 700 });
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第6章 理論（主成分分析とのつながり）
  SCENES.push({
    id: '6T',
    chapter: 6,
    kind: 'theory',
    title: '応用 ― 主成分分析は、データ行列の特異値分解',
    beats: [
      beat(R`応用の代表が主成分分析です。各列から平均を引いたデータ行列 $X$（$n$ 行 × $p$ 列）を特異値分解します。`, 10),
      beat(R`共分散行列は $X^\top X$ を $n-1$ で割ったもの。$X = U\Sigma V^\top$ を入れると、$V\Sigma^2V^\top$ を $n-1$ で割った形になります。`, 10),
      beat(R`つまり $V$ の列が主成分の向き、$\sigma_i^2/(n-1)$ がその向きの分散です。`),
      beat('ほかにも、最小二乗法の擬似逆行列、ノイズ除去、推薦システムなど、多くの手法の中で使われています。', 10),
    ],
    build(ui) {
      ui.text(R`データ行列 $X$：$n$ 個のデータ × $p$ 個の変数（各列の平均を引いておく）`, { x: LEFT_X, y: 125, size: 24, color: C.text2 });
      ui.tex(R`X = U\Sigma V^\top`, { x: LEFT_X, y: 180, size: 44, delay: 0.6 });
      ui.tex(R`S = \frac{X^\top X}{n-1} = V\,\frac{\Sigma^\top\Sigma}{n-1}\,V^\top`, { x: LEFT_X, y: 275, size: 38, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      [
        R`主成分の向き ＝ $V$ の列 $\mathbf{v}_i$`,
        R`その向きの分散 ＝ $\sigma_i^2 / (n-1)$`,
        R`主成分得点 ＝ $X V = U\Sigma$`,
        R`寄与率 ＝ $\sigma_i^2 / \sum_j \sigma_j^2$`,
      ].forEach((line, i) => ui.text(`<span class="toc-num">${i + 1}</span>${line}`, { x: LEFT_X, y: 410 + i * 54, size: 25, at: 2, delay: i * 0.5 }));

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 470, title: 'ほかの使い道', at: 3 });
      [
        ['最小二乗法・擬似逆行列', R`$A^{+} = V\Sigma^{+}U^\top$`],
        ['ノイズ除去', '小さい特異値の層を捨てる'],
        ['推薦システム', '利用者 × 商品の表を分解する'],
        ['画像・データの圧縮', 'ランク k 近似（第5章）'],
        ['計算の安定性の目安', R`条件数 $\sigma_1 / \sigma_r$`],
      ].forEach(([head, body], i) => {
        ui.text(head, { x: CARD_X + 24, y: 182 + i * 82, size: 23, weight: 700, at: 3, delay: 0.3 + i * 0.35 });
        ui.text(body, { x: CARD_X + 44, y: 216 + i * 82, size: 21, color: C.text2, at: 3, delay: 0.3 + i * 0.35 });
      });
    },
  });

  // ---------------------------------------------------------------- 第6章 図解（点群の主成分）
  const PCA_POINTS = M.makePcaPoints();
  const PCA_N = PCA_POINTS.length;
  const PCA_MEAN = [0, 1].map((j) => PCA_POINTS.reduce((sum, p) => sum + p[j], 0) / PCA_N);
  const PCA_X = PCA_POINTS.map((p) => Float64Array.of(p[0] - PCA_MEAN[0], p[1] - PCA_MEAN[1]));
  const PCA = (() => {
    const res = M.svd(PCA_X);
    const v1 = res.V[0][0] < 0 ? [-res.V[0][0], -res.V[0][1]] : [res.V[0][0], res.V[0][1]];
    const v2 = [-v1[1], v1[0]];
    const sd = [res.S[0], res.S[1]].map((s) => s / Math.sqrt(PCA_N - 1));
    return { s: [res.S[0], res.S[1]], v: [v1, v2], sd, share: res.S[0] ** 2 / (res.S[0] ** 2 + res.S[1] ** 2) };
  })();
  const PCA_PLOT = new Plot({ x: 110, y: 160, w: 680, h: 510, xr: [-4, 8], yr: [-3, 6] });
  // 矢印と楕円は標準偏差の2倍の長さで描く（データの約95%が入る目安）
  const PCA_ARROW_SD = 2;
  SCENES.push({
    id: '6V',
    chapter: 6,
    kind: 'visual',
    title: '点群の主成分 ＝ 右特異ベクトル',
    beats: [
      beat(`2つの変数を持つ ${PCA_N} 個のデータです。まず平均を引いて、中心を原点に移します。`, 8),
      beat(R`特異値分解の $\mathbf{v}_1$ が、データがいちばん広がる向き。$\mathbf{v}_2$ は、それに直交する向きです。`, 9),
      beat(R`広がりの大きさは $\sigma_i/\sqrt{n-1}$（標準偏差）。$\mathbf{v}_1$ の向きだけで、ばらつきの ${fmt(100 * PCA.share, 0)}% を説明できます。`, 10),
      beat(R`各点を $\mathbf{v}_1$ の線に下ろすと、2つの変数を1つの数（主成分得点）にまとめられます。これはランク1近似そのものです。`, 10),
    ],
    build(ui) {
      const X = 870;
      ui.text(R`$\mathbf{v}_1 = ${R`(${texNum(PCA.v[0][0], 3)},\ ${texNum(PCA.v[0][1], 3)})`}$（${fmt((Math.atan2(PCA.v[0][1], PCA.v[0][0]) * 180) / Math.PI, 1)}°）`, { x: X, y: 170, size: 25, at: 1 });
      ui.text(R`$\mathbf{v}_2 = ${R`(${texNum(PCA.v[1][0], 3)},\ ${texNum(PCA.v[1][1], 3)})`}$`, { x: X, y: 220, size: 25, at: 1, delay: 0.4 });
      ui.text(R`標準偏差 $\sigma_1/\sqrt{n-1} = ${texNum(PCA.sd[0], 3)}$`, { x: X, y: 300, size: 25, at: 2 });
      ui.text(R`標準偏差 $\sigma_2/\sqrt{n-1} = ${texNum(PCA.sd[1], 3)}$`, { x: X, y: 350, size: 25, at: 2, delay: 0.4 });
      ui.text(R`寄与率 $\sigma_1^2 / (\sigma_1^2 + \sigma_2^2) = ${texNum(100 * PCA.share, 1)}\%$`, { x: X, y: 410, size: 25, at: 2, delay: 0.8, glow: [{ from: 2, to: 3, color: C.yellow }] });
      ui.text(R`主成分得点 $= X\mathbf{v}_1$（1つの数にまとめる）`, { x: X, y: 500, size: 25, at: 3 });
      ui.tex(R`X \approx \sigma_1\mathbf{u}_1\mathbf{v}_1^\top`, { x: X, y: 560, size: 34, at: 3, delay: 0.6 });
      ui.text('（ランク1近似）', { x: X + 220, y: 572, size: 22, color: C.text2, at: 3, delay: 0.8 });
      ui.text('図の矢印と楕円の大きさは、標準偏差の2倍', { x: X, y: 650, size: 18, color: C.muted, at: 1, delay: 1 });
    },
    draw(ctx, s) {
      const P = PCA_PLOT;
      ctx.globalAlpha = s.p(0, 0.6);
      P.axes(ctx, { xticks: [-4, -2, 0, 2, 4, 6, 8], yticks: [-2, 0, 2, 4, 6], xlabel: '変数1', ylabel: '変数2' });
      P.vline(ctx, 0, { color: '#4a4a46', dash: null, width: 1 });
      // 平均を引く動き → 主成分の線へ下ろす動き
      const shift = s.p(0, 2.0, 2.0);
      const drop = s.p(3, 2.2, 0.6);
      const center = [PCA_MEAN[0] * (1 - shift), PCA_MEAN[1] * (1 - shift)];
      const v1 = PCA.v[0];
      const lineAlpha = s.win(3);
      if (lineAlpha > 0) {
        const far = 12;
        ctx.save();
        P.clip(ctx);
        ctx.globalAlpha *= lineAlpha;
        ctx.strokeStyle = rgba(C.blue, 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(P.sx(-far * v1[0]), P.sy(-far * v1[1]));
        ctx.lineTo(P.sx(far * v1[0]), P.sy(far * v1[1]));
        ctx.stroke();
        ctx.restore();
      }
      const xs = [];
      const ys = [];
      PCA_X.forEach((p) => {
        const score = p[0] * v1[0] + p[1] * v1[1];
        xs.push(center[0] + lerp(p[0], score * v1[0], drop));
        ys.push(center[1] + lerp(p[1], score * v1[1], drop));
      });
      P.dots(ctx, xs, ys, { color: drop > 0 ? C.yellow : C.text2, r: 4.5, alpha: 0.85, ring: null });
      // 平均の印
      ctx.save();
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3;
      const mx = P.sx(center[0]);
      const my = P.sy(center[1]);
      ctx.beginPath();
      ctx.moveTo(mx - 10, my - 10);
      ctx.lineTo(mx + 10, my + 10);
      ctx.moveTo(mx + 10, my - 10);
      ctx.lineTo(mx - 10, my + 10);
      ctx.stroke();
      ctx.restore();
      // 主成分の矢印と楕円
      const axes = s.p(1, 0.8);
      if (axes > 0) {
        ctx.save();
        ctx.globalAlpha *= axes;
        ctx.strokeStyle = C.text2;
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * 2 * Math.PI;
          const px = PCA_ARROW_SD * (PCA.sd[0] * Math.cos(a) * v1[0] + PCA.sd[1] * Math.sin(a) * PCA.v[1][0]);
          const py = PCA_ARROW_SD * (PCA.sd[0] * Math.cos(a) * v1[1] + PCA.sd[1] * Math.sin(a) * PCA.v[1][1]);
          if (i === 0) ctx.moveTo(P.sx(px), P.sy(py));
          else ctx.lineTo(P.sx(px), P.sy(py));
        }
        ctx.stroke();
        ctx.restore();
        [0, 1].forEach((i) => {
          const len = PCA_ARROW_SD * PCA.sd[i];
          const tip = [PCA.v[i][0] * len, PCA.v[i][1] * len];
          const color = i === 0 ? C.blue : C.orange;
          const x1 = P.sx(tip[0]);
          const y1 = P.sy(tip[1]);
          const x0 = P.sx(0);
          const y0 = P.sy(0);
          const d = Math.hypot(x1 - x0, y1 - y0);
          const ux = (x1 - x0) / d;
          const uy = (y1 - y0) / d;
          ctx.save();
          ctx.globalAlpha *= axes;
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1 - ux * 12, y1 - uy * 12);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - ux * 16 - uy * 9, y1 - uy * 16 + ux * 9);
          ctx.lineTo(x1 - ux * 16 + uy * 9, y1 - uy * 16 - ux * 9);
          ctx.closePath();
          ctx.fill();
          canvasText(ctx, `v${'₁₂'[i]}`, x1 + ux * 22, y1 + uy * 22 + 8, { size: 24, color, align: 'center', weight: 700 });
          ctx.restore();
        });
      }
      // 点に重なっても読めるよう、暗い下地の上に書く
      const meanLabel = shift < 0.5 ? '平均' : '平均 → 原点';
      ctx.save();
      ctx.font = `700 19px ${KIT.FONT}`;
      const labelW = ctx.measureText(meanLabel).width;
      ctx.fillStyle = rgba(C.bg, 0.85);
      ctx.fillRect(mx + 14, my + 14, labelW + 12, 28);
      ctx.restore();
      canvasText(ctx, meanLabel, mx + 20, my + 35, { size: 19, color: C.red, weight: 700 });
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '7',
    chapter: 7,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。特異値分解は、どんな行列も「回転 → 伸縮 → 回転」に分けます。伸縮の倍率が特異値です。', 9),
      beat('行列を、重みつきのランク1の層に分けることでもあり、大きい層だけを残すと、最良の近似になります。', 9),
      beat('主成分分析や画像の圧縮など、データを少ない次元で表す多くの手法の土台になっています。', 8),
    ],
    build(ui) {
      const points = [
        [0, R`特異値分解 $A = U\Sigma V^\top$ は、どんな $m \times n$ 行列にもある（固有値分解できないせん断でも）`],
        [0, R`図では「回転 $V^\top$ → 伸縮 $\Sigma$ → 回転 $U$」。単位円は楕円になり、その軸が $\sigma_i\mathbf{u}_i$`],
        [0, R`$V$ と $\sigma_i^2$ は $A^\top A$ の固有ベクトルと固有値。$\mathbf{u}_i = A\mathbf{v}_i / \sigma_i$`],
        [1, R`$A = \sum \sigma_i\mathbf{u}_i\mathbf{v}_i^\top$（ランク1の層の和）。0 でない特異値の数がランク`],
        [1, R`大きい $k$ 個を残した $A_k$ が、最良のランク $k$ 近似（エッカート・ヤングの定理）`],
        [2, R`主成分分析 ＝ 平均を引いたデータ行列の特異値分解。$\mathbf{v}_i$ が主成分、$\sigma_i^2/(n-1)$ が分散`],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 130 + i * 62, size: 26, at, delay: (i % 3) * 0.6 }));
      ui.text('参考文献：G. Strang, Introduction to Linear Algebra, 5th ed., Wellesley-Cambridge Press, 2016（第7章） ／ L. N. Trefethen & D. Bau III, Numerical Linear Algebra, SIAM, 1997（第4・5講） ／ C. Eckart & G. Young, The approximation of one matrix by another of lower rank, Psychometrika 1 (1936) 211–218 ／ G. Golub & W. Kahan, Calculating the singular values and pseudo-inverse of a matrix, SIAM J. Numer. Anal. Ser. B 2 (1965) 205–224', {
        x: LEFT_X, y: 540, w: 1420, size: 17, color: C.muted, lh: 1.5, at: 2, delay: 1,
      });
      ui.text('例の画像と点群は、説明用に式と乱数（種を固定）で作ったものです', { x: LEFT_X, y: 690, size: 17, color: C.muted, at: 2, delay: 1.4 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 8,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、特異値分解の解説は終わりです。ご視聴ありがとうございました。', 6)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('特異値分解（SVD） ― どんな行列も「回転 → 伸縮 → 回転」に分けられる', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
