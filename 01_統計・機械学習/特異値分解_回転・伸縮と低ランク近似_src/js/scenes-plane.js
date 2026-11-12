// scenes-plane.js — 2×2 のせん断行列で見る場面（はじめに、第1〜3章）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列（c = 文、d = 秒。省くと文の長さから決まる）。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値（特異値、角度、ベクトルの成分）は手で書かず、svd-math.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, texNum, canvasText, keyframes, lerp, rgba } = KIT;
  const SCENES = (window.SCENES = window.SCENES || []);
  const beat = (c, d) => ({ c, d });
  const R = String.raw;

  // 理論の画面の配置
  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const TITLE = { size: 21, color: C.text, weight: 700 };
  const V1_COLOR = C.blue;
  const V2_COLOR = C.orange;
  const DEG = 180 / Math.PI;

  // ---- 2×2 の行列の小道具（行列は [[a, b], [c, d]]、ベクトルは [x, y]） ----
  const IDENTITY = [[1, 0], [0, 1]];
  const apply = (M, p) => [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]];
  const mul = (P, Q) => [0, 1].map((i) => [0, 1].map((j) => P[i][0] * Q[0][j] + P[i][1] * Q[1][j]));
  const rot = (angle) => [[Math.cos(angle), -Math.sin(angle)], [Math.sin(angle), Math.cos(angle)]];
  const diag = (a, b) => [[a, 0], [0, b]];
  const blend = (P, Q, k) => P.map((row, i) => row.map((v, j) => lerp(v, Q[i][j], k)));
  const length2 = (p) => Math.hypot(p[0], p[1]);

  // 例の行列: せん断（横に、高さに比例してずらす）
  const SHEAR = [[1, 1], [0, 1]];
  // 特異値分解。図で回転として見せるため、v₁ を第1象限に、v₂ を v₁ から +90° の向きにそろえる（U・V とも行列式 +1）
  const SVD2 = (() => {
    const res = SVDM.svd(SHEAR.map((row) => Float64Array.from(row)));
    const v1 = res.V[0][0] < 0 ? [-res.V[0][0], -res.V[0][1]] : [res.V[0][0], res.V[0][1]];
    const v2 = [-v1[1], v1[0]];
    const s = [res.S[0], res.S[1]];
    const u1 = apply(SHEAR, v1).map((x) => x / s[0]);
    const u2 = apply(SHEAR, v2).map((x) => x / s[1]);
    return { s, v: [v1, v2], u: [u1, u2], thetaV: Math.atan2(v1[1], v1[0]), thetaU: Math.atan2(u1[1], u1[0]) };
  })();
  const [SIGMA1, SIGMA2] = SVD2.s;
  const S1 = fmt(SIGMA1, 3);
  const S2 = fmt(SIGMA2, 3);
  const THETA_V_DEG = SVD2.thetaV * DEG;
  const THETA_U_DEG = SVD2.thetaU * DEG;
  const ATA = mul([[SHEAR[0][0], SHEAR[1][0]], [SHEAR[0][1], SHEAR[1][1]]], SHEAR);
  const vec = (p, digits = 3) => `(${texNum(p[0], digits)},\\ ${texNum(p[1], digits)})`;

  // ---- 平面の図の描き方 ----
  // 中心 (cx, cy)、一辺 size の正方形に、−range〜range の平面を描く
  const plane = (cx, cy, size, range) => new Plot({ x: cx - size / 2, y: cy - size / 2, w: size, h: size, xr: [-range, range], yr: [-range, range] });
  const UNIT_CIRCLE = Array.from({ length: 241 }, (_, i) => [Math.cos((i / 240) * 2 * Math.PI), Math.sin((i / 240) * 2 * Math.PI)]);
  const UNIT_SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const GRID_STEP = 0.5;
  const GRID_EXTENT = 4;

  // 行列 M で動かした格子（M = 単位行列なら、ふつうの方眼）。原点を通る線は明るくする
  function grid(ctx, P, M, { alpha = 1 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.rect(P.x, P.y, P.w, P.h);
    ctx.clip();
    ctx.lineWidth = 1.2;
    for (let v = -GRID_EXTENT; v <= GRID_EXTENT + 1e-9; v += GRID_STEP) {
      ctx.strokeStyle = Math.abs(v) < 1e-9 ? '#5c5c56' : C.grid;
      for (const [a, b] of [[[v, -GRID_EXTENT], [v, GRID_EXTENT]], [[-GRID_EXTENT, v], [GRID_EXTENT, v]]]) {
        const p = apply(M, a);
        const q = apply(M, b);
        ctx.beginPath();
        ctx.moveTo(P.sx(p[0]), P.sy(p[1]));
        ctx.lineTo(P.sx(q[0]), P.sy(q[1]));
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w, P.h);
    ctx.restore();
  }

  // 点の列を M で動かして線（と塗り）にする
  function shape(ctx, P, points, M, { stroke = C.text, width = 2.5, fill = null, alpha = 1, dash = null, close = true } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.rect(P.x, P.y, P.w, P.h);
    ctx.clip();
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = apply(M, p);
      if (i === 0) ctx.moveTo(P.sx(x), P.sy(y));
      else ctx.lineTo(P.sx(x), P.sy(y));
    });
    if (close) ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 原点（または from）から tip への矢印
  function arrow(ctx, P, tip, { from = [0, 0], color = C.text, width = 4, alpha = 1, head = 15, dash = null } = {}) {
    if (alpha <= 0) return;
    const x0 = P.sx(from[0]);
    const y0 = P.sy(from[1]);
    const x1 = P.sx(tip[0]);
    const y1 = P.sy(tip[1]);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 2) return;
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const h = Math.min(head, len * 0.5);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - ux * h * 0.8, y1 - uy * h * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * h - uy * h * 0.55, y1 - uy * h + ux * h * 0.55);
    ctx.lineTo(x1 - ux * h + uy * h * 0.55, y1 - uy * h - ux * h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 矢印の先に、原点から外向きにずらして名前を書く
  function tipLabel(ctx, P, tip, text, { color = C.text, offset = 24, size = 22, alpha = 1 } = {}) {
    if (alpha <= 0) return;
    const x = P.sx(tip[0]);
    const y = P.sy(tip[1]);
    const len = Math.hypot(x - P.sx(0), y - P.sy(0)) || 1;
    const dx = ((x - P.sx(0)) / len) * offset;
    const dy = ((y - P.sy(0)) / len) * offset;
    canvasText(ctx, text, x + dx, y + dy + size * 0.36, { size, color, align: 'center', weight: 700, alpha });
  }

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('特異値分解（SVD）を、式と図を使って解説します。', 5),
      beat('例は3つ。2×2 のせん断行列、白黒の画像、2次元のデータです。'),
    ],
    build(ui) {
      ui.text('特異値分解（SVD）', { x: 0, y: 100, w: W, align: 'center', size: 78, weight: 800 });
      ui.text('どんな行列も「回転 → 伸縮 → 回転」に分けられる', { x: 0, y: 212, w: W, align: 'center', size: 34, color: C.text2, delay: 0.3 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 3;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, {
          x: left ? 170 : 840,
          y: 320 + (left ? i : i - 3) * 54,
          size: 26,
          at: 0,
          delay: 0.6 + 0.12 * i,
        });
      });
      [
        '例① 2×2 のせん断行列（第1〜3章）',
        '例② 白黒の画像（第4・5章）',
        '例③ 2次元のデータ（第6章）',
      ].forEach((text, i) => ui.text(text, { x: 170, y: 530 + i * 48, size: 24, color: C.text2, at: 1, delay: 0.3 + i * 0.4 }));
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '行列は空間の変換 ― 固有値分解の限界',
    beats: [
      beat(R`行列 $A$ をベクトル $\mathbf{x}$ に掛けると、別のベクトル $A\mathbf{x}$ になります。行列は、空間を動かす「変換」です。`),
      beat('例として、せん断行列を使います。高さに比例して、横にずらす変換です。'),
      beat(R`行列を調べる定番は固有値分解 $A = P\Lambda P^{-1}$。向きを変えない方向（固有ベクトル）で分けます。`),
      beat('ところが、このせん断は固有値が 1 の重解で、固有ベクトルが1本しかなく、固有値分解できません。長方形の行列にも使えません。', 11),
      beat('特異値分解は、どんな行列でも必ずできる分解です。図で考え方を見ていきます。'),
    ],
    build(ui) {
      ui.tex(R`A\mathbf{x} = \begin{bmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{bmatrix}\begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = \begin{bmatrix} a_{11}x_1 + a_{12}x_2 \\ a_{21}x_1 + a_{22}x_2 \end{bmatrix}`, { x: LEFT_X, y: 130, size: 32 });
      ui.tex(R`A = \begin{bmatrix}1&1\\0&1\end{bmatrix}:\quad \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} \longmapsto \begin{bmatrix} x_1 + x_2 \\ x_2 \end{bmatrix}`, { x: LEFT_X, y: 270, size: 32, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.text('せん断：高さ $x_2$ に比例して横にずらす', { x: LEFT_X + 30, y: 370, size: 23, color: C.text2, at: 1, delay: 0.5 });
      ui.tex(R`A = P\Lambda P^{-1},\qquad A\mathbf{p}_i = \lambda_i\,\mathbf{p}_i`, { x: LEFT_X, y: 445, size: 34, at: 2 });
      ui.text(R`固有ベクトル $\mathbf{p}_i$：$A$ を掛けても向きが変わらず、$\lambda_i$ 倍になるだけの方向`, { x: LEFT_X + 30, y: 510, size: 23, color: C.text2, at: 2, delay: 0.5 });
      ui.text(R`せん断：$\det(A - \lambda I) = (1-\lambda)^2 = 0 \;\Rightarrow\; \lambda = 1$（重解）`, { x: LEFT_X, y: 590, size: 25, at: 3 });
      ui.text(R`固有ベクトルは $(1,\ 0)$ の向きの1本だけ → <span style="color:${C.red}">固有値分解できない</span>`, { x: LEFT_X, y: 640, size: 25, at: 3, delay: 0.8 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 300, title: '2つの分解の違い', at: 3 });
      ui.table({
        x: CARD_X + 14, y: 185, widths: [120, 180, 180], aligns: ['left', 'center', 'center'], size: 20, rowH: 44,
        header: ['', '固有値分解', '特異値分解'],
        rows: [
          ['使える行列', '正方行列の一部', 'すべての行列'],
          ['分ける向き', '入出力で同じ', '入力と出力で別'],
          ['向きの関係', '直交とは限らない', 'いつも直交'],
          ['せん断', `<span style="color:${C.red}">✕ できない</span>`, `<span style="color:${C.aqua}">○ できる</span>`],
        ],
        at: 3, rowAt: [3, 3, 3, 4], rowDelay: 0.3, glowRows: [null, null, null, [{ from: 4, color: C.aqua }]],
      });
      ui.text('特異値分解 ＝ どんな行列にもある、もっとも基本的な分解', { x: CARD_X, y: 470, w: CARD_W, size: 23, weight: 700, color: C.yellow, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解（せん断で円が楕円になる）
  const P1 = plane(420, 445, 560, 2.2);
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: 'せん断で、円は楕円になる',
    beats: [
      beat('格子と単位円に、せん断を掛けます。正方形は平行四辺形に、円は斜めの楕円になります。', 9),
      beat(R`向きが変わらないのは、横軸の方向だけ。縦向きの矢印は、斜めに倒れます。固有ベクトルは1本です。`),
      beat(R`楕円には、直交する長い軸と短い軸があります。長さは ${S1} と ${S2} です。`),
      beat(R`この2本の軸は、もとの円のどこから来たのか。逆にたどると、円の上でも直交する2本 $\mathbf{v}_1, \mathbf{v}_2$ に行き着きます。`, 10),
      beat(R`直交する $\mathbf{v}_1, \mathbf{v}_2$ が、直交する $\sigma_1\mathbf{u}_1, \sigma_2\mathbf{u}_2$ に移る。これが特異値分解の考え方です。`, 10),
    ],
    build(ui) {
      const X = 800;
      ui.tex(R`A = \begin{bmatrix}1&1\\0&1\end{bmatrix}`, { x: X, y: 140, size: 34 });
      ui.text('正方形 → 平行四辺形、単位円 → 楕円', { x: X + 210, y: 165, size: 24, color: C.text2, delay: 0.8 });
      ui.text(`<span class="pill" style="background:${C.yellow}">固有</span>向きが変わらないのは横軸だけ（固有ベクトルは1本）`, { x: X, y: 270, size: 23, at: 1 });
      ui.text(R`楕円の長い軸：$\sigma_1 = ${S1}$`, { x: X, y: 350, size: 26, color: C.text, at: 2 });
      ui.text(R`楕円の短い軸：$\sigma_2 = ${S2}$（2本は直交）`, { x: X, y: 400, size: 26, color: C.text, at: 2, delay: 0.5 });
      ui.text(R`もとをたどると、円の上の直交する2本 $\mathbf{v}_1, \mathbf{v}_2$`, { x: X, y: 480, size: 24, color: C.text2, at: 3 });
      ui.tex(R`A\mathbf{v}_1 = \sigma_1\mathbf{u}_1,\qquad A\mathbf{v}_2 = \sigma_2\mathbf{u}_2`, { x: X, y: 560, size: 36, at: 4, glow: [{ from: 4, color: C.yellow }] });
      ui.text(R`$\mathbf{v}_i, \mathbf{u}_i$ は長さ1。$\sigma_i$ は伸び縮みの倍率（特異値）`, { x: X, y: 640, size: 22, color: C.text2, at: 4, delay: 0.6 });
    },
    draw(ctx, s) {
      // k: 変形の進み具合（0 = もとの平面、1 = せん断を掛けたあと）
      const k = keyframes(s.u, [[s.bt(0) + 0.8, 0], [s.bt(0) + 3.6, 1], [s.bt(3) + 0.6, 1], [s.bt(3) + 3.0, 0], [s.bt(4) + 0.6, 0], [s.bt(4) + 3.6, 1]]);
      const M = blend(IDENTITY, SHEAR, k);
      ctx.globalAlpha = s.p(0, 0.6);
      grid(ctx, P1, M);
      // もとの楕円の影（逆にたどるとき、どこへ戻るかを見せる）
      shape(ctx, P1, UNIT_CIRCLE, SHEAR, { stroke: C.text, width: 2, dash: [8, 8], alpha: 0.5 * s.win(3) });
      shape(ctx, P1, UNIT_SQUARE, M, { stroke: rgba(C.blue, 0.8), width: 2, fill: rgba(C.blue, 0.16) });
      shape(ctx, P1, UNIT_CIRCLE, M, { stroke: C.text, width: 3 });
      // 固有ベクトル: 横向きの矢印は向きが変わらず、縦向きの矢印は倒れる
      const eigen = s.win(1, 2);
      if (eigen > 0) {
        ctx.save();
        ctx.globalAlpha *= eigen;
        ctx.strokeStyle = rgba(C.yellow, 0.3);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(P1.x, P1.sy(0));
        ctx.lineTo(P1.x + P1.w, P1.sy(0));
        ctx.stroke();
        ctx.restore();
        arrow(ctx, P1, [1, 0], { color: C.yellow, alpha: eigen, width: 5 });
        arrow(ctx, P1, [0, 1], { color: C.muted, alpha: eigen, dash: [6, 6], width: 3 });
        arrow(ctx, P1, apply(M, [0, 1]), { color: C.text2, alpha: eigen });
        canvasText(ctx, '向きそのまま', P1.sx(1.25), P1.sy(0) + 30, { size: 19, color: C.yellow, weight: 700, alpha: eigen });
        canvasText(ctx, '倒れる', P1.sx(0.75), P1.sy(1.12), { size: 19, color: C.text2, weight: 700, alpha: eigen });
      }
      // 楕円の軸 σᵢuᵢ と、もとの円の上の vᵢ（どちらも M vᵢ）
      const axes = s.win(2);
      [0, 1].forEach((i) => {
        const tip = apply(M, SVD2.v[i]);
        const color = i === 0 ? V1_COLOR : V2_COLOR;
        arrow(ctx, P1, tip, { color, alpha: axes, width: 5 });
        tipLabel(ctx, P1, tip, k > 0.5 ? `σ${'₁₂'[i]}u${'₁₂'[i]}` : `v${'₁₂'[i]}`, { color, alpha: axes, size: 24 });
      });
      // 直角の印（v₁ と v₂ の間）
      if (axes > 0) {
        const a = apply(M, SVD2.v[0].map((x) => x * 0.18));
        const b = apply(M, SVD2.v[1].map((x) => x * 0.18));
        const c = [a[0] + b[0], a[1] + b[1]];
        ctx.save();
        ctx.globalAlpha *= axes * (k < 0.05 || k > 0.95 ? 1 : 0);
        ctx.strokeStyle = C.text2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(P1.sx(a[0]), P1.sy(a[1]));
        ctx.lineTo(P1.sx(c[0]), P1.sy(c[1]));
        ctx.lineTo(P1.sx(b[0]), P1.sy(b[1]));
        ctx.stroke();
        ctx.restore();
      }
    },
  });

  // ---------------------------------------------------------------- 第2章 理論（定義）
  // 右下に描く形の図（m = 5、n = 3 の縦長の行列）
  const SHAPE_UNIT = 30;
  const SHAPE_M = 5;
  const SHAPE_N = 3;
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: R`特異値分解の定義 ― $A = U\Sigma V^\top$`,
    beats: [
      beat(R`図で見た関係を式にします。直交する入力の向き $\mathbf{v}_i$ が、$\sigma_i$ 倍されて、直交する出力の向き $\mathbf{u}_i$ に移ります。`, 10),
      beat(R`並べて書くと $AV = U\Sigma$。$V$ は直交行列で $V^{-1} = V^\top$ なので、右から $V^\top$ を掛けて $A = U\Sigma V^\top$。`, 10),
      beat(R`$U$ と $V$ は直交行列。列どうしが直交する長さ1のベクトルで、回転（または折り返し）を表します。`),
      beat(R`$\Sigma$ は対角行列で、特異値 $\sigma_1 \ge \sigma_2 \ge \cdots \ge 0$ が大きい順に並びます。`),
      beat(R`$m$ 行 $n$ 列の行列なら、$U$ は $m \times m$、$\Sigma$ は $m \times n$、$V$ は $n \times n$。どんな行列にも、この分解があります。`, 10),
    ],
    build(ui) {
      ui.tex(R`A\mathbf{v}_i = \sigma_i\,\mathbf{u}_i\qquad (i = 1, 2, \dots)`, { x: LEFT_X, y: 130, size: 38 });
      ui.tex(R`A\begin{bmatrix}\mathbf{v}_1 & \mathbf{v}_2\end{bmatrix} = \begin{bmatrix}\mathbf{u}_1 & \mathbf{u}_2\end{bmatrix}\begin{bmatrix}\sigma_1 & 0\\ 0 & \sigma_2\end{bmatrix}\quad\Longrightarrow\quad AV = U\Sigma`, { x: LEFT_X, y: 215, size: 30, at: 1 });
      ui.tex(R`A = \underbrace{\htmlClass{hlU}{\;U\;}}_{\text{回転}}\,\underbrace{\htmlClass{hlS}{\;\Sigma\;}}_{\text{伸縮}}\,\underbrace{\htmlClass{hlV}{\;V^\top}}_{\text{回転}}`, {
        x: LEFT_X + 60, y: 320, size: 56, at: 1, delay: 1.2,
        hl: [{ cls: 'hlU', from: 2, to: 3, color: C.aqua }, { cls: 'hlV', from: 2, to: 3, color: C.aqua }, { cls: 'hlS', from: 3, to: 4, color: C.violet }],
      });
      ui.text('← 右から順に掛ける（$V^\\top$ → $\\Sigma$ → $U$）', { x: LEFT_X + 470, y: 360, size: 22, color: C.text2, at: 3, delay: 0.8 });
      ui.tex(R`U^\top U = I,\qquad V^\top V = I`, { x: LEFT_X, y: 510, size: 32, at: 2 });
      ui.text('（列は互いに直交し、長さ1）', { x: LEFT_X + 340, y: 516, size: 22, color: C.text2, at: 2, delay: 0.4 });
      ui.tex(R`\Sigma = \begin{bmatrix}\sigma_1 & & \\ & \sigma_2 & \\ & & \ddots\end{bmatrix},\qquad \sigma_1 \ge \sigma_2 \ge \cdots \ge 0`, { x: LEFT_X, y: 580, size: 28, at: 3 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 270, title: '直交行列（U と V）', at: 2 });
      [
        R`列 $\mathbf{u}_i$ どうしが直交し、長さは 1`,
        R`逆行列は転置：$U^{-1} = U^\top$`,
        R`長さと角度を変えない：$\|U\mathbf{x}\| = \|\mathbf{x}\|$`,
        '→ 回転（行列式が −1 なら折り返し）',
      ].forEach((line, i) => ui.text(line, { x: CARD_X + 24, y: 186 + i * 50, size: 22, at: 2, delay: 0.3 + i * 0.4 }));
      ui.text('形（m 行 n 列、m > n のとき）', { x: CARD_X, y: 440, size: 21, color: C.text2, weight: 700, at: 4 });
    },
    draw(ctx, s) {
      const alpha = s.p(4, 0.8);
      if (alpha <= 0) return;
      const u = SHAPE_UNIT;
      const top = 490;
      let x = CARD_X + 4;
      ctx.save();
      ctx.globalAlpha = alpha;
      const block = (w, h, label, size, color, draw) => {
        ctx.fillStyle = rgba(color, 0.22);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillRect(x, top, w, h);
        ctx.strokeRect(x, top, w, h);
        if (draw) draw(x, top, w, h);
        canvasText(ctx, label, x + w / 2, top + h / 2 + 10, { size: 28, color: C.text, align: 'center', weight: 700 });
        canvasText(ctx, size, x + w / 2, top + SHAPE_M * u + 30, { size: 18, color: C.muted, align: 'center' });
        x += w;
      };
      const gap = (text) => {
        canvasText(ctx, text, x + 18, top + (SHAPE_M * u) / 2 + 10, { size: 30, color: C.text2, align: 'center' });
        x += 36;
      };
      block(SHAPE_N * u, SHAPE_M * u, 'A', 'm×n', C.muted);
      gap('=');
      block(SHAPE_M * u, SHAPE_M * u, 'U', 'm×m', C.aqua);
      x += 10;
      block(SHAPE_N * u, SHAPE_M * u, '', 'm×n', C.violet, (bx, by) => {
        // 上の n×n に対角の σ、下は 0
        for (let i = 0; i < SHAPE_N; i++) {
          ctx.beginPath();
          ctx.arc(bx + (i + 0.5) * u, by + (i + 0.5) * u, 6, 0, Math.PI * 2);
          ctx.fillStyle = C.violet;
          ctx.fill();
        }
        ctx.strokeStyle = rgba(C.violet, 0.6);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(bx, by + SHAPE_N * u);
        ctx.lineTo(bx + SHAPE_N * u, by + SHAPE_N * u);
        ctx.stroke();
        ctx.setLineDash([]);
        canvasText(ctx, '0', bx + (SHAPE_N * u) / 2, by + SHAPE_N * u + u + 8, { size: 22, color: C.text2, align: 'center' });
      });
      canvasText(ctx, 'Σ', x - (SHAPE_N * u) / 2 + 26, top + 22, { size: 18, color: C.text2, align: 'center', weight: 700 });
      x += 10;
      block(SHAPE_N * u, SHAPE_N * u, 'Vᵀ', 'n×n', C.aqua);
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第2章 図解（回転 → 伸縮 → 回転）
  const STAGE_SIZE = 310;
  const STAGE_PANELS = [0, 1, 2, 3].map((i) => plane(255 + i * 360, 410, STAGE_SIZE, 2.0));
  const V_T = rot(-SVD2.thetaV);
  const SIGMA = diag(SIGMA1, SIGMA2);
  // 第 i 段の行列（k = 0 → 1 で、前の段からこの段へ動く）
  const stageMatrix = (i, k) => {
    if (i === 0) return IDENTITY;
    if (i === 1) return rot(-SVD2.thetaV * k);
    if (i === 2) return mul(diag(lerp(1, SIGMA1, k), lerp(1, SIGMA2, k)), V_T);
    return mul(rot(SVD2.thetaU * k), mul(SIGMA, V_T));
  };
  const STAGE_LABELS = [
    ['v₁', 'v₂'],
    ['e₁', 'e₂'],
    ['σ₁e₁', 'σ₂e₂'],
    ['σ₁u₁', 'σ₂u₂'],
  ];
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '回転 → 伸縮 → 回転',
    poster: 30,
    beats: [
      beat(R`$A = U\Sigma V^\top$ を、右から順に掛けていきます。左端は単位円と、その上の直交する2本 $\mathbf{v}_1, \mathbf{v}_2$ です。`, 8),
      beat(R`まず $V^\top$。回転して、$\mathbf{v}_1$ を横軸に、$\mathbf{v}_2$ を縦軸に重ねます。円は円のままです。`, 8),
      beat(R`次に $\Sigma$。横に $\sigma_1 = ${S1}$ 倍、縦に $\sigma_2 = ${S2}$ 倍。軸にそろった楕円になります。`, 8),
      beat(R`最後に $U$。回転して、楕円の軸を $\mathbf{u}_1, \mathbf{u}_2$ の向きに合わせます。`, 8),
      beat(R`$A$ を直接掛けた結果（黄色の点線）と、ぴったり重なります。どんな行列も「回転 → 伸縮 → 回転」です。`, 9),
    ],
    build(ui) {
      const labels = [R`\mathbf{x}`, R`V^\top\mathbf{x}`, R`\Sigma V^\top\mathbf{x}`, R`U\Sigma V^\top\mathbf{x}`];
      const notes = [
        '単位円と直交する2本',
        R`回転（${fmt(-THETA_V_DEG, 1)}°）`,
        R`伸縮（横 ×${S1}、縦 ×${S2}）`,
        R`回転（+${fmt(THETA_U_DEG, 1)}°）`,
      ];
      STAGE_PANELS.forEach((P, i) => {
        ui.tex(labels[i], { x: P.x, y: 178, w: P.w, align: 'center', size: 34, at: i });
        ui.text(notes[i], { x: P.x - 20, y: 578, w: P.w + 40, align: 'center', size: 21, color: C.text2, at: i, delay: 0.4 });
      });
      ui.text(R`$A$ を直接掛けた結果（黄色の点線）と一致 → $A = U\Sigma V^\top$`, { x: 0, y: 650, w: W, align: 'center', size: 27, weight: 700, at: 4, delay: 0.6, glow: [{ from: 4, color: C.yellow }] });
    },
    draw(ctx, s) {
      STAGE_PANELS.forEach((P, i) => {
        const frame = s.p(0, 0.6) * (i === 0 ? 1 : 0.6 + 0.4 * s.p(i, 0.5));
        ctx.save();
        ctx.globalAlpha = frame;
        const k = i === 0 ? 1 : s.p(i, 2.2, 0.5);
        const show = i === 0 ? s.p(0, 0.8) : s.p(i, 0.5);
        const M = stageMatrix(i, k);
        grid(ctx, P, show > 0 ? M : IDENTITY, { alpha: 0.9 });
        ctx.globalAlpha *= show;
        shape(ctx, P, UNIT_SQUARE, M, { stroke: rgba(C.blue, 0.7), width: 1.5, fill: rgba(C.blue, 0.14) });
        shape(ctx, P, UNIT_CIRCLE, M, { stroke: C.text, width: 2.5 });
        [0, 1].forEach((j) => {
          const tip = apply(M, SVD2.v[j]);
          const color = j === 0 ? V1_COLOR : V2_COLOR;
          arrow(ctx, P, tip, { color, width: 4, head: 13 });
          tipLabel(ctx, P, tip, STAGE_LABELS[i === 0 ? 0 : k > 0.5 ? i : i - 1][j], { color, size: 19, offset: 20 });
        });
        if (i === 3) {
          const direct = s.win(4);
          shape(ctx, P, UNIT_CIRCLE, SHEAR, { stroke: C.yellow, width: 3, dash: [9, 7], alpha: direct });
          shape(ctx, P, UNIT_SQUARE, SHEAR, { stroke: C.yellow, width: 2, dash: [6, 6], alpha: direct });
        }
        ctx.restore();
        if (i < 3) canvasText(ctx, '→', P.x + P.w + 25, P.y + P.h / 2 + 14, { size: 36, color: C.muted, align: 'center', weight: 700, alpha: s.p(i + 1, 0.5) });
      });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論（求め方）
  const LAMBDA = SVD2.s.map((x) => x * x);
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: R`特異値の求め方 ― $A^\top A$ の固有値`,
    beats: [
      beat(R`求め方です。$A = U\Sigma V^\top$ を $A^\top A$ に入れると、真ん中の $U^\top U$ が単位行列になって消え、$V\Sigma^\top\Sigma V^\top$ が残ります。`, 11),
      beat(R`これは $A^\top A$ の固有値分解そのもの。$V$ は $A^\top A$ の固有ベクトル、$\sigma_i^2$ が固有値です。`),
      beat(R`せん断では $A^\top A$ を計算し、固有値の式 $\lambda^2 - 3\lambda + 1 = 0$ を解くと、$\lambda = ${fmt(LAMBDA[0], 3)},\ ${fmt(LAMBDA[1], 3)}$。`, 10),
      beat(R`平方根を取って $\sigma_1 = ${S1},\ \sigma_2 = ${S2}$。$U$ は $\mathbf{u}_i = A\mathbf{v}_i / \sigma_i$ で求まります。`),
      beat(R`確かめ：$\sigma_1\sigma_2 = 1$ は $|\det A|$ と一致。せん断は面積を変えないので、伸びと縮みが打ち消し合います。`, 10),
    ],
    build(ui) {
      ui.tex(R`A^\top A = (U\Sigma V^\top)^\top(U\Sigma V^\top) = V\Sigma^\top\,\htmlClass{hlUU}{U^\top U}\,\Sigma V^\top = V\,\Sigma^\top\Sigma\,V^\top`, {
        x: LEFT_X, y: 130, size: 28,
        hl: [{ cls: 'hlUU', from: 0, to: 1, color: C.yellow }],
      });
      ui.text(R`$U^\top U = I$（直交行列）なので消える`, { x: LEFT_X + 30, y: 200, size: 22, color: C.text2, delay: 1.2 });
      ui.tex(R`A^\top A\,\mathbf{v}_i = \sigma_i^2\,\mathbf{v}_i`, { x: LEFT_X, y: 275, size: 40, at: 1, glow: [{ from: 1, to: 2, color: C.yellow }] });
      ui.text(R`→ $V$ は $A^\top A$ の固有ベクトル、$\sigma_i^2$ は固有値`, { x: LEFT_X + 30, y: 350, size: 24, at: 1, delay: 0.5 });
      ui.text(R`（$A^\top A$ は対称で固有値は 0 以上 → いつでも求まる）`, { x: LEFT_X + 30, y: 395, size: 21, color: C.text2, at: 1, delay: 0.9 });
      ui.tex(R`\mathbf{u}_i = \frac{A\mathbf{v}_i}{\sigma_i}`, { x: LEFT_X, y: 465, size: 40, at: 3 });
      ui.text(R`（同じように $AA^\top$ の固有ベクトルが $U$）`, { x: LEFT_X + 230, y: 490, size: 21, color: C.text2, at: 3, delay: 0.6 });
      ui.text('※ 計算ライブラリは精度を保つため、AᵀA を作らずに求める（ゴルブ・カハン法など）', { x: LEFT_X, y: 640, size: 19, color: C.muted, at: 4, delay: 1.2 });

      ui.card({ x: CARD_X, y: 130, w: CARD_W, h: 560, title: 'せん断で計算', at: 2 });
      const CX = CARD_X + 24;
      ui.tex(R`A^\top A = \begin{bmatrix}1&0\\1&1\end{bmatrix}\begin{bmatrix}1&1\\0&1\end{bmatrix} = \begin{bmatrix}${ATA[0][0]}&${ATA[0][1]}\\${ATA[1][0]}&${ATA[1][1]}\end{bmatrix}`, { x: CX, y: 180, size: 25, at: 2 });
      ui.tex(R`\det(A^\top A - \lambda I) = \lambda^2 - 3\lambda + 1 = 0`, { x: CX, y: 275, size: 24, at: 2, delay: 0.8 });
      ui.tex(R`\lambda = \tfrac{3 \pm \sqrt{5}}{2} = ${texNum(LAMBDA[0], 3)},\ ${texNum(LAMBDA[1], 3)}`, { x: CX, y: 330, size: 26, at: 2, delay: 1.6 });
      ui.tex(R`\sigma = \sqrt{\lambda} = ${texNum(SIGMA1, 3)},\ ${texNum(SIGMA2, 3)}`, { x: CX, y: 400, size: 28, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.tex(R`\mathbf{v}_1 = ${vec(SVD2.v[0])},\ \ \mathbf{u}_1 = ${vec(SVD2.u[0])}`, { x: CX, y: 470, size: 23, at: 3, delay: 0.8 });
      ui.tex(R`\sigma_1\sigma_2 = ${texNum(SIGMA1 * SIGMA2, 3)} = |\det A|`, { x: CX, y: 560, size: 30, at: 4, glow: [{ from: 4, color: C.yellow }] });
      ui.text('面積の倍率 ＝ 特異値の積', { x: CX, y: 625, size: 21, color: C.text2, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解（向きによる伸び率）
  const P3 = plane(370, 445, 520, 2.0);
  const STRETCH_PLOT = new Plot({ x: 790, y: 190, w: 700, h: 330, xr: [0, 360], yr: [0, 2] });
  const STRETCH_ANGLES = Array.from({ length: 361 }, (_, i) => i);
  const STRETCH = STRETCH_ANGLES.map((deg) => length2(apply(SHEAR, [Math.cos(deg / DEG), Math.sin(deg / DEG)])));
  const SWEEP_SECONDS = 6;
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '特異値 ＝ 伸び率の最大と最小',
    beats: [
      beat(R`単位円の上のベクトル $\mathbf{x}$ を一周させて、$A\mathbf{x}$ の長さを測ります。`, 8),
      beat(R`長さは向きによって変わります。最大は $\sigma_1 = ${S1}$、最小は $\sigma_2 = ${S2}$ です。`),
      beat(R`最大になる向きが $\mathbf{v}_1$、最小になる向きが $\mathbf{v}_2$。2つはちょうど 90° 離れています。`),
      beat(R`$\sigma_1$ は「行列がいちばん伸ばす倍率」で、行列の大きさ（2ノルム）として使われます。$\sigma$ が 0 に近い向きは、ほぼつぶされます。`, 10),
    ],
    build(ui) {
      ui.tex(R`\sigma_1 = \max_{\|\mathbf{x}\|=1}\|A\mathbf{x}\| = \|A\|_2`, { x: 790, y: 610, size: 32, at: 3 });
      ui.text(R`$\sigma_1 / \sigma_2$ が大きいほど、向きによる差が大きい（条件数）`, { x: 790, y: 680, size: 22, color: C.text2, at: 3, delay: 0.8 });
    },
    draw(ctx, s) {
      const appear = s.p(0, 0.6);
      ctx.globalAlpha = appear;
      const start = s.bt(0) + 0.6;
      const vDeg = THETA_V_DEG;
      const theta = keyframes(s.u, [
        [start, 0], [start + SWEEP_SECONDS, 360],
        [s.bt(1) + 0.3, 360], [s.bt(1) + 1.8, 360 + vDeg],
        [s.bt(2) + 0.3, 360 + vDeg], [s.bt(2) + 1.8, 360 + vDeg + 90],
      ]);
      // 一周する間は等速で回す（keyframes のなめらかな補間だと、始めと終わりがゆっくりになる）
      const sweep = Math.min(1, Math.max(0, (s.u - start) / SWEEP_SECONDS));
      const deg = s.u < start + SWEEP_SECONDS ? sweep * 360 : theta;
      const x = [Math.cos(deg / DEG), Math.sin(deg / DEG)];
      const ax = apply(SHEAR, x);

      // 左: 単位円と楕円、動く x と Ax
      grid(ctx, P3, IDENTITY);
      shape(ctx, P3, UNIT_CIRCLE, IDENTITY, { stroke: C.muted, width: 2 });
      shape(ctx, P3, UNIT_CIRCLE, SHEAR, { stroke: C.text, width: 2.5, alpha: 0.85 });
      const marks = s.win(2);
      [0, 1].forEach((i) => {
        const color = i === 0 ? V1_COLOR : V2_COLOR;
        arrow(ctx, P3, SVD2.v[i], { color, width: 3, alpha: marks * 0.8, dash: [6, 5] });
        arrow(ctx, P3, apply(SHEAR, SVD2.v[i]), { color, width: 4, alpha: marks * 0.8 });
      });
      arrow(ctx, P3, x, { color: C.text2, width: 3 });
      arrow(ctx, P3, ax, { color: C.yellow, width: 5 });
      tipLabel(ctx, P3, x, 'x', { color: C.text2, size: 22 });
      tipLabel(ctx, P3, ax, 'Ax', { color: C.yellow, size: 24 });
      canvasText(ctx, `x の向き ${fmt(((deg % 360) + 360) % 360, 0)}°　|Ax| = ${fmt(length2(ax), 3)}`, P3.x, P3.y - 18, { size: 21, color: C.text, weight: 600 });

      // 右: 向きと長さのグラフ
      const SP = STRETCH_PLOT;
      SP.axes(ctx, { xticks: [0, 90, 180, 270, 360], yticks: [0, 0.5, 1, 1.5, 2], fmtY: (v) => fmt(v, 1), xlabel: 'x の向き（度）' });
      // 縦軸の名前は、上の目印（v₁ など）と重ならないよう、グラフの上に書く
      canvasText(ctx, '|Ax|（Ax の長さ）', SP.x, SP.y - 44, { size: 18, color: C.text2 });
      const hl = s.win(1);
      SP.hline(ctx, SIGMA1, { color: V1_COLOR, alpha: hl, dash: [8, 6], width: 2 });
      SP.hline(ctx, SIGMA2, { color: V2_COLOR, alpha: hl, dash: [8, 6], width: 2 });
      // σ の名前は、縦の目印の線（v₂ と −v₁）の間に書く
      const labelDeg = THETA_V_DEG + 135;
      SP.label(ctx, `σ₁ = ${S1}`, labelDeg, SIGMA1, { dy: -10, size: 19, color: C.text, align: 'center', alpha: hl });
      SP.label(ctx, `σ₂ = ${S2}`, labelDeg, SIGMA2, { dy: 26, size: 19, color: C.text, align: 'center', alpha: hl });
      [[vDeg, V1_COLOR, 'v₁'], [vDeg + 180, V1_COLOR, '−v₁'], [vDeg + 90, V2_COLOR, 'v₂'], [vDeg + 270, V2_COLOR, '−v₂']].forEach(([d, color, name]) => {
        SP.vline(ctx, d, { color, alpha: marks, dash: [5, 5], width: 2 });
        SP.label(ctx, name, d, 2, { dy: -10, size: 19, color, align: 'center', weight: 700, alpha: marks });
      });
      const drawn = s.u < start + SWEEP_SECONDS ? sweep : 1;
      SP.line(ctx, STRETCH_ANGLES, STRETCH, { color: C.yellow, width: 3, upto: drawn });
      const dotDeg = ((deg % 360) + 360) % 360;
      SP.dots(ctx, [dotDeg], [length2(ax)], { color: C.yellow, r: 7, alpha: s.u > start ? 1 : 0 });
    },
  });
})();
