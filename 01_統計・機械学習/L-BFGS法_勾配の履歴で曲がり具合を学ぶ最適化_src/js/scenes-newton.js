// scenes-newton.js — はじめに、この動画のポイント、第1〜4章（勾配降下法、ニュートン法、準ニュートン法、BFGS）。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。部品の at は「何番目の字幕で出すか」。
// 画面に出す数値は手で書かず、opt-math.js で計算した値を表示する。
(() => {
  const { W, C, CHAPTERS, Plot, fmt, texNum, canvasText, lerp, clamp, legend, rgba } = KIT;
  const O = OPTM;
  const D = OPTDRAW;
  const DATA = window.OPTDATA;
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
  const linspace = (a, b, count) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  const VALLEY_ANGLE = 0.5;
  const VALLEY_RANGE = [-2.4, 2.4];
  const VALLEY_START = [2, 2];
  const MEMORY_DIMENSIONS = [10, 1000, 1000000];
  const humanBytes = (bytes) => {
    const units = [['TB', 1e12], ['GB', 1e9], ['MB', 1e6], ['kB', 1e3]];
    for (const [name, size] of units) if (bytes >= size) return `${(bytes / size).toFixed(0)} ${name}`;
    return `${bytes} B`;
  };

  // ---------------------------------------------------------------- はじめに
  SCENES.push({
    id: '0',
    chapter: 0,
    kind: 'title',
    title: 'はじめに',
    beats: [
      beat('L-BFGS 法を、式と図を使って解説します。ガウス過程の学習で、標準的に使われる最適化の手法です。', 8),
      beat('全部で8章です。はじめに、この動画のポイントを4つにまとめます。'),
    ],
    build(ui) {
      ui.text('L-BFGS 法', { x: 0, y: 84, w: W, align: 'center', size: 72, weight: 800 });
      ui.text('勾配の履歴だけで曲がり具合を学び、行列を持たずに進む最適化', { x: 0, y: 192, w: W, align: 'center', size: 31, color: C.text2, delay: 0.3 });
      ui.text('加法ガウス過程の動画の補足：論文は周辺尤度の最大化に L-BFGS を使っている', { x: 0, y: 246, w: W, align: 'center', size: 20, color: C.muted, delay: 0.5 });
      CHAPTERS.forEach((title, i) => {
        const left = i < 4;
        ui.text(`<span class="toc-num">${i + 1}</span>${title}`, { x: left ? 130 : 830, y: 312 + (left ? i : i - 4) * 52, w: 660, size: 24, delay: 0.6 + 0.12 * i });
      });
      ui.text(`<span class="pill" style="background:${C.yellow}">ポイント</span>最初に、この動画の要点を4つ`, { x: 130, y: 550, size: 24, at: 1 });
      ui.text('図の数値は、すべてこの動画のために計算したものです', { x: 130, y: 600, w: 680, size: 20, color: C.muted, at: 1, delay: 0.4, lh: 1.5 });
    },
  });

  // ---------------------------------------------------------------- この動画のポイント
  const POINT_CARDS = [{ x: 90, y: 116 }, { x: 810, y: 116 }, { x: 90, y: 436 }, { x: 810, y: 436 }];
  const POINT_CARD_W = 700;
  const POINT_CARD_H = 300;
  const FIG = { dx: 420, dy: 40, w: 252, h: 232 };
  SCENES.push({
    id: 'P',
    chapter: 0.5,
    chapterLabel: '',
    kind: 'points',
    title: 'この動画のポイント',
    beats: [
      beat('この動画のポイントです。', 4),
      beat('① 勾配だけで進むと、細い谷でジグザグになり、遅くなります。関数の曲がり具合の情報が必要です。', 10),
      beat('② BFGS は、ヘッセ行列を計算しません。勾配の変化から、逆ヘッセ行列の近似を育てていきます。', 10),
      beat('③ L-BFGS は、最近の m 組の差だけを覚えます。行列を作らずに、方向を計算できるので、記憶も手間も大幅に減ります。', 11),
      beat('④ 勾配が正確で滑らかな問題に強い手法です。ガウス過程の周辺尤度の最大化は、ちょうどこの形です。', 10),
      beat('この4つを、式と図で順に確かめていきます。', 5),
    ],
    build(ui) {
      const cards = [
        ['① 勾配だけでは遅い', '細い谷でジグザグになる。曲がり具合（ヘッセ行列）の情報が要る'],
        ['② BFGS', R`勾配の差から $H^{-1}$ の近似を育てる。ヘッセ行列は計算しない`],
        ['③ L-BFGS', R`最近の $m$ 組だけ記憶し、行列を作らず方向を求める。記憶は $n^2$ から $2mn$ へ`],
        ['④ 向いている問題', '勾配が正確で滑らかな問題。ガウス過程の周辺尤度の最大化に使われる'],
      ];
      cards.forEach(([title, body], i) => {
        const p = POINT_CARDS[i];
        const k = i + 1;
        seeThrough(ui.card({ x: p.x, y: p.y, w: POINT_CARD_W, h: POINT_CARD_H, at: k, glow: [{ from: k, to: k + 1 }] }));
        ui.text(title, { x: p.x + 28, y: p.y + 24, size: 26, weight: 700, at: k });
        ui.text(body, { x: p.x + 28, y: p.y + 86, w: 372, size: 21, lh: 1.65, color: C.text2, at: k, delay: 0.3 });
      });
      const box = (i) => ({ x: POINT_CARDS[i].x + FIG.dx, y: POINT_CARDS[i].y + FIG.dy, w: FIG.w, h: FIG.h });
      const problem = O.valley(25, VALLEY_ANGLE);
      const field = new D.Field({ box: box(0), xr: VALLEY_RANGE, yr: VALLEY_RANGE, f: problem.f, pixels: 200 });
      const run = O.fixedStepDescent(problem, VALLEY_START, 2 / 26, 30);
      const bfgsRun = O.bfgs(problem, VALLEY_START, { keepMatrices: true });
      return { field, run, truth: bfgsRun.matrices[bfgsRun.matrices.length - 1] };
    },
    draw(ctx, s, st) {
      if (s.beat >= 1) {
        st.field.draw(ctx, s.p(1, 0.8, 0.3));
        st.field.path(ctx, st.run.path, { color: D.COLOR.descent, upto: s.p(1, 3, 0.5), alpha: s.p(1, 0.8, 0.3), dotRadius: 2 });
      }
      if (s.beat >= 2) {
        const p = POINT_CARDS[1];
        const alpha = s.p(2, 0.8, 0.3);
        D.drawMatrixEllipse(ctx, [[1, 0], [0, 1]], p.x + FIG.dx + 126, p.y + FIG.dy + 116, 70, { color: C.axis, width: 2, alpha });
        D.drawMatrixEllipse(ctx, st.truth, p.x + FIG.dx + 126, p.y + FIG.dy + 116, 110, { color: D.COLOR.bfgs, alpha });
      }
      if (s.beat >= 3) {
        const p = POINT_CARDS[2];
        const alpha = s.p(3, 0.8, 0.3);
        const bx = p.x + FIG.dx + 20;
        const by = p.y + FIG.dy + 190;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = rgba(D.COLOR.bfgs, 0.7);
        ctx.fillRect(bx, by - 170, 80, 170);
        ctx.fillStyle = D.COLOR.lbfgs;
        ctx.fillRect(bx + 130, by - 14, 80, 14);
        ctx.restore();
        canvasText(ctx, 'n²', bx + 40, by + 26, { size: 18, align: 'center', alpha });
        canvasText(ctx, '2mn', bx + 170, by + 26, { size: 18, align: 'center', alpha });
      }
      if (s.beat >= 4) {
        const p = POINT_CARDS[3];
        const alpha = s.p(4, 0.8, 0.3);
        const plot = new Plot({ x: p.x + FIG.dx + 8, y: p.y + FIG.dy + 6, w: FIG.w - 16, h: FIG.h - 46, xr: [1, 100], yr: [-1, 4] });
        plot.axes(ctx, { xticks: [50, 100], xlabel: '勾配の計算回数', alpha });
        const curve = (values) => values.slice(0, 100).map((v) => Math.log10(Math.max(0.1, v - DATA.best)));
        const xs = linspace(1, 100, 99);
        plot.line(ctx, xs, curve(DATA.curves.descent), { color: D.COLOR.descent, alpha, upto: s.p(4, 1.4, 0.3) });
        plot.line(ctx, xs, curve(DATA.curves.lbfgs), { color: D.COLOR.lbfgs, alpha, upto: s.p(4, 1.4, 0.3) });
      }
    },
  });

  // ---------------------------------------------------------------- 第1章 理論
  const CONDITION_ROWS = [10, 100, 1000].map((kappa) => {
    const rate = (kappa - 1) / (kappa + 1);
    return { kappa, rate, steps: Math.ceil(Math.log(0.1) / Math.log(rate)) };
  });
  SCENES.push({
    id: '1T',
    chapter: 1,
    kind: 'theory',
    title: '勾配降下法の弱点',
    beats: [
      beat('関数 f を最小にする x を探します。勾配降下法は、いまの点の勾配と反対の向きに進みます。学習率はイータです。'),
      beat('進む向きは、その点で一番下る向きです。しかし、最小の点の向きとは限りません。'),
      beat('2次関数で考えます。曲がり具合は行列 A で決まり、一番急な向きと一番ゆるい向きの比を、条件数カッパと呼びます。'),
      beat('一番良い学習率を選んでも、誤差は1回で、カッパ引く1、わる、カッパ足す1の倍にしか減りません。'),
      beat('条件数が1000なら、誤差を10分の1にするのに、1000回以上かかります。谷が細いほど遅くなるのです。'),
    ],
    build(ui) {
      ui.tex(R`\mathbf{x}_{k+1} = \mathbf{x}_k - \eta\, \nabla f(\mathbf{x}_k)`, { x: LEFT_X, y: 120, size: 34 });
      ui.text('一番急に下る向きに進む。ただし、その向きが最小の点を向いているとは限らない', { x: LEFT_X, y: 196, size: 23, color: C.text2, at: 1 });
      ui.tex(R`f(\mathbf{x}) = \tfrac{1}{2}\, \mathbf{x}^{\top} A\, \mathbf{x}, \qquad \kappa = \frac{\lambda_{\max}(A)}{\lambda_{\min}(A)}`, { x: LEFT_X, y: 272, size: 32, at: 2 });
      ui.text('$\\lambda$：$A$ の固有値（向きごとの曲がり具合）。$\\kappa$：条件数', { x: LEFT_X, y: 368, size: 22, color: C.text2, at: 2, delay: 0.5 });
      ui.tex(R`\|\mathbf{x}_{k+1}\|_A \le \frac{\kappa - 1}{\kappa + 1}\, \|\mathbf{x}_k\|_A \qquad \left(\eta = \frac{2}{\lambda_{\max} + \lambda_{\min}}\right)`, { x: LEFT_X, y: 432, size: 30, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.table({
        x: LEFT_X, y: 552, widths: [220, 300, 420], size: 23, rowH: 44,
        header: ['条件数 $\\kappa$', '1回で減る割合', '誤差を 1/10 にする回数'],
        rows: CONDITION_ROWS.map((r) => [String(r.kappa), fmt(r.rate, 3), `${r.steps} 回`]),
        at: 4, rowDelay: 0.3, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第1章 図解
  const ZIGZAG_ITERATIONS = 40;
  const ZIGZAG_TARGET = 1e-6;
  const stepsUntil = (run, ratio) => run.values.findIndex((v) => v < run.values[0] * ratio);
  SCENES.push({
    id: '1V',
    chapter: 1,
    kind: 'visual',
    title: '細い谷でジグザグになる',
    beats: [
      beat('左は丸に近い谷で、条件数は2です。右は細長い谷で、条件数は25です。線は等高線で、×印が最小の点です。'),
      beat('丸い谷では、勾配がほぼ最小の点を向くので、少ない回数で着きます。'),
      beat('細い谷では、勾配は谷の壁に向かいます。向かいの壁へ飛び移り続けて、ジグザグになります。'),
      beat('谷の底を進む成分は、毎回少ししか進みません。同じ関数の値まで下げるのに、右は左の何倍もかかります。'),
    ],
    build(ui) {
      const panel = (x, kappa) => {
        const problem = O.valley(kappa, VALLEY_ANGLE);
        const box = { x, y: 150, w: 480, h: 480 };
        const run = O.fixedStepDescent(problem, VALLEY_START, 2 / (kappa + 1), 400);
        return { box, kappa, field: new D.Field({ box, xr: VALLEY_RANGE, yr: VALLEY_RANGE, f: problem.f, levels: 3 }), run, count: stepsUntil(run, ZIGZAG_TARGET) };
      };
      const panels = [panel(150, 2), panel(830, 25)];
      panels.forEach((p, i) => {
        ui.text(`条件数 $\\kappa = ${p.kappa}$`, { x: p.box.x, y: 104, w: 480, align: 'center', size: 24, weight: 700, at: 0 });
        ui.text(`関数の値が $10^{-6}$ 倍になるまで ${p.count} 回`, { x: p.box.x, y: 650, w: 480, align: 'center', size: 25, weight: 700, at: 3, delay: 0.3 + i * 0.5 });
      });
      return panels;
    },
    draw(ctx, s, st) {
      st.forEach((p, i) => {
        p.field.draw(ctx, s.p(0, 0.8));
        p.field.mark(ctx, [0, 0], { alpha: s.p(0, 0.8) });
        const start = i === 0 ? 1 : 2;
        const shown = Math.min(ZIGZAG_ITERATIONS, p.count);
        p.field.path(ctx, p.run.path.slice(0, shown + 1), { color: D.COLOR.descent, upto: s.lin(start, 6, 0.3), dotRadius: 2.6, width: 2 });
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 理論
  SCENES.push({
    id: '2T',
    chapter: 2,
    kind: 'theory',
    title: 'ニュートン法',
    beats: [
      beat('いまの点のまわりで、関数を2次式で近似します。傾きの g に加えて、曲がり具合のヘッセ行列 H を使います。'),
      beat('この2次式を最小にする動きは、H の逆行列を g に掛けて、符号を変えたものです。これがニュートン法です。'),
      beat('1変数なら、傾きわる2階微分です。曲がりが強いところでは小さく、ゆるいところでは大きく動きます。'),
      beat('2次関数なら、1回で最小の点に着きます。条件数によりません。'),
      beat('問題は計算量です。ヘッセ行列には n の2乗の記憶が要り、連立方程式を解く手間は n の3乗です。100万変数では、記憶だけで8テラバイトになります。', 12),
    ],
    build(ui) {
      ui.tex(R`f(\mathbf{x} + \mathbf{d}) \approx f(\mathbf{x}) + \mathbf{g}^{\top} \mathbf{d} + \tfrac{1}{2}\, \mathbf{d}^{\top} H\, \mathbf{d}`, { x: LEFT_X, y: 118, size: 31 });
      ui.text('$\\mathbf{g}$：勾配、$H$：ヘッセ行列（2階微分を並べた行列）', { x: LEFT_X, y: 190, size: 22, color: C.text2, delay: 0.4 });
      ui.tex(R`\mathbf{d} = -H^{-1} \mathbf{g}`, { x: LEFT_X, y: 258, size: 38, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`\text{1変数なら } \; d = -\frac{f'(x)}{f''(x)}`, { x: LEFT_X, y: 352, size: 30, at: 2 });
      ui.text('2次関数なら1回で最小の点に着く（条件数によらない）', { x: LEFT_X, y: 470, size: 25, weight: 700, at: 3 });
      ui.table({
        x: LEFT_X, y: 540, widths: [320, 340, 340], size: 23, rowH: 42,
        header: ['変数の数 $n$', '$H$ の記憶（$8n^2$ バイト）', '解く手間（$n^3$）'],
        rows: MEMORY_DIMENSIONS.map((n) => [n.toLocaleString('en-US'), humanBytes(8 * n * n), `$10^{${Math.round(3 * Math.log10(n))}}$`]),
        at: 4, rowDelay: 0.3, delay: 0.3,
      });
    },
  });

  // ---------------------------------------------------------------- 第2章 図解
  SCENES.push({
    id: '2V',
    chapter: 2,
    kind: 'visual',
    title: '曲がり具合を使うと、谷がまっすぐになる',
    beats: [
      beat('細長い谷に、H の平方根の座標変換をかけます。谷は丸い形になります。'),
      beat('丸い谷では、勾配はまっすぐ最小の点を向きます。ニュートン法は、この向きに進むことに当たります。'),
      beat('もとの座標に戻すと、谷の壁に向かわず、1回で最小の点へ飛びます。'),
      beat('右は、バナナ形の谷で知られるローゼンブロック関数です。勾配降下法は谷底でほとんど進めません。'),
      beat('ニュートン法は谷の曲がりに沿って進み、20回で着きます。勾配降下法は1000回を超えます。'),
    ],
    build(ui) {
      const kappa = 25;
      const box = { x: 90, y: 150, w: 520, h: 520 };
      const problem = O.valley(kappa, VALLEY_ANGLE);
      const rosenBox = { x: 800, y: 150, w: 680, h: 520 };
      const rosen = new D.Field({ box: rosenBox, xr: [-1.8, 1.8], yr: [-0.8, 2.0], f: O.rosenbrock.f, levels: 2, floor: 0.05 });
      const start = [-1.2, 1];
      const descent = O.gradientDescent(O.rosenbrock, start, { iterations: 20000, tolerance: 1e-5 });
      const newton = O.newton(O.rosenbrock, start, { tolerance: 1e-5 });
      ui.text(`ニュートン法 ${newton.path.length - 1} 回`, { x: 800, y: 684, w: 330, size: 25, weight: 700, at: 4, delay: 0.3 });
      ui.text(`勾配降下法 ${descent.path.length - 1} 回`, { x: 1150, y: 684, w: 330, size: 25, weight: 700, at: 3, delay: 0.6 });
      ui.text('ローゼンブロック関数 $(1-x)^2 + 100(y - x^2)^2$', { x: 800, y: 104, w: 680, size: 22, align: 'center', weight: 700, at: 3 });
      return { box, kappa, field: new D.Field({ box, xr: VALLEY_RANGE, yr: VALLEY_RANGE, f: problem.f, levels: 3 }), rosen, descent, newton, start };
    },
    draw(ctx, s, st) {
      const cx = st.box.x + st.box.w / 2;
      const cy = st.box.y + st.box.h / 2;
      const main = s.p(0, 0.8);
      const round = s.p(0, 3, 1.5) * (1 - s.p(2, 2));
      // 谷の短い軸の向き（画面の上では y が逆）に引き伸ばして丸くする。面積が変わらないように全体を縮める
      const angle = -VALLEY_ANGLE;
      const stretch = lerp(1, Math.sqrt(st.kappa), round);
      const shrink = 1 / Math.sqrt(stretch);
      ctx.save();
      st.field.clip(ctx);
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(stretch * shrink, shrink);
      ctx.rotate(-angle);
      ctx.translate(-cx, -cy);
      st.field.draw(ctx, main);
      ctx.restore();
      st.field.mark(ctx, [0, 0], { alpha: main });
      canvasText(ctx, round > 0.5 ? '座標変換すると丸い谷になる' : '細長い谷（条件数 25）', cx, 134, { size: 22, weight: 700, color: C.text, align: 'center', alpha: main });
      if (s.beat === 1) {
        const [c, n] = [Math.cos(VALLEY_ANGLE), Math.sin(VALLEY_ANGLE)];
        const along = VALLEY_START[0] * c + VALLEY_START[1] * n;
        const across = -VALLEY_START[0] * n + VALLEY_START[1] * c;
        const a1 = along * stretch * shrink;
        const a2 = across * shrink;
        st.field.path(ctx, [[a1 * c - a2 * n, a1 * n + a2 * c], [0, 0]], { color: D.COLOR.newton, upto: s.p(1, 1.6, 0.4), width: 3.5 });
      }
      const jump = s.p(2, 1.4, 1.2);
      if (jump > 0) st.field.path(ctx, [[...VALLEY_START], [0, 0]], { color: D.COLOR.newton, upto: jump, width: 3.5 });
      if (s.beat >= 3) {
        const alpha = s.p(3, 0.8);
        st.rosen.draw(ctx, alpha);
        st.rosen.mark(ctx, [1, 1], { alpha });
        st.rosen.path(ctx, st.descent.path, { color: D.COLOR.descent, upto: Math.sqrt(s.lin(3, 7, 0.6)), dots: false, width: 2 });
      }
      if (s.beat >= 4) st.rosen.path(ctx, st.newton.path, { color: D.COLOR.newton, upto: s.lin(4, 5, 0.3), width: 3 });
    },
  });

  // ---------------------------------------------------------------- 第3章 理論
  SCENES.push({
    id: '3T',
    chapter: 3,
    kind: 'theory',
    title: '勾配の差から、曲がり具合を知る',
    beats: [
      beat('ヘッセ行列を計算せずに、曲がり具合を知る方法を考えます。手がかりは、勾配がどれだけ変わったかです。'),
      beat('1変数なら、2階微分は、勾配の差わる、位置の差で近似できます。これが割線の傾きです。'),
      beat('多変数では、位置の変化を s、勾配の変化を y と書きます。H を掛けた s が、y に等しいはずです。これを割線条件と呼びます。'),
      beat('必要なのは逆行列なので、H インバースを y に掛けると s になる、と書きかえます。'),
      beat('1組の s と y から分かるのは、その向きの曲がり具合だけです。歩くたびに1組ずつ情報が増えます。これが準ニュートン法の考え方です。', 11),
    ],
    build(ui) {
      ui.tex(R`f''(x_k) \approx \frac{f'(x_{k+1}) - f'(x_k)}{x_{k+1} - x_k}`, { x: LEFT_X, y: 124, size: 34, at: 1 });
      ui.tex(R`\mathbf{s}_k = \mathbf{x}_{k+1} - \mathbf{x}_k, \qquad \mathbf{y}_k = \mathbf{g}_{k+1} - \mathbf{g}_k`, { x: LEFT_X, y: 252, size: 32, at: 2 });
      ui.tex(R`B_{k+1}\, \mathbf{s}_k = \mathbf{y}_k \qquad (B \approx H)`, { x: LEFT_X, y: 336, size: 34, at: 2, delay: 0.6, glow: [{ from: 2, to: 3 }] });
      ui.tex(R`H_{k+1}^{-1}\text{ の近似を } H_{k+1} \text{ と書くと: } \quad H_{k+1}\, \mathbf{y}_k = \mathbf{s}_k`, { x: LEFT_X, y: 430, size: 30, at: 3 });
      ui.text('ここから先は、$H_k$ を「逆ヘッセ行列の近似」の意味で使う', { x: LEFT_X, y: 500, size: 22, color: C.muted, at: 3, delay: 0.5 });
      ui.tex(R`\frac{\mathbf{s}^{\top}\mathbf{y}}{\mathbf{s}^{\top}\mathbf{s}} = \text{向き } \mathbf{s} \text{ の曲がり具合}`, { x: LEFT_X, y: 566, size: 30, at: 4 });
      ui.text('1組で分かるのは1つの向きだけ。歩くたびに情報が増える', { x: LEFT_X, y: 680, size: 25, weight: 700, at: 4, delay: 0.6 });
    },
  });

  // ---------------------------------------------------------------- 第3章 図解: 割線
  const curveF = (x) => x * x * x * x / 4 - x * x / 2 - 0.4 * x;
  const curveG = (x) => x * x * x - x - 0.4;
  const SECANT_START = [2, 1.6];
  const SECANT_STEPS = 7;
  const secantSteps = (() => {
    const out = [...SECANT_START];
    for (let i = 0; i < SECANT_STEPS; i++) {
      const [a, b] = [out[out.length - 2], out[out.length - 1]];
      out.push(b - (curveG(b) * (b - a)) / (curveG(b) - curveG(a)));
    }
    return out;
  })();
  SCENES.push({
    id: '3V',
    chapter: 3,
    kind: 'visual',
    title: '勾配の差だけで底を見つける',
    beats: [
      beat('左は関数 f、右はその勾配です。最小の点は、勾配がゼロになる点です。'),
      beat('2点で勾配を測ります。右の図で2点を結んだ線が、割線です。この傾きが、曲がり具合の推定値です。'),
      beat('割線がゼロと交わる点へ進みます。左の図では、同じ傾きを持つ放物線の底へ進むことに当たります。'),
      beat('これを繰り返すと、2階微分を一度も計算せずに、最小の点へ速く近づきます。'),
    ],
    build() {
      return {
        left: new Plot({ x: 110, y: 130, w: 620, h: 540, xr: [-1.6, 2.2], yr: [-1, 2] }),
        right: new Plot({ x: 850, y: 130, w: 620, h: 540, xr: [-1.6, 2.2], yr: [-3, 6] }),
        xs: Array.from({ length: 201 }, (_, i) => -1.6 + (3.8 * i) / 200),
      };
    },
    draw(ctx, s, st) {
      const alpha = s.p(0, 0.8);
      st.left.axes(ctx, { xticks: [-1, 0, 1, 2], yticks: [-1, 0, 1, 2], xlabel: 'x', ylabel: 'f(x)', alpha });
      st.right.axes(ctx, { xticks: [-1, 0, 1, 2], yticks: [-3, 0, 3, 6], xlabel: 'x', ylabel: "勾配 f'(x)", alpha });
      st.left.line(ctx, st.xs, st.xs.map(curveF), { color: C.text, alpha });
      st.right.line(ctx, st.xs, st.xs.map(curveG), { color: C.text, alpha });
      if (s.beat < 1) return;
      const total = secantSteps.length - 2;
      const progress = s.beat >= 3 ? s.lin(3, 7, 0.3) : 0;
      const stage = Math.min(total - 1, Math.floor(progress * total));
      for (let i = 0; i <= stage; i++) {
        const [a, b, c] = [secantSteps[i], secantSteps[i + 1], secantSteps[i + 2]];
        const fade = i === stage ? 1 : 0.28;
        const slope = (curveG(b) - curveG(a)) / (b - a);
        const local = i === stage ? (s.beat >= 3 ? (progress * total) % 1 : s.p(2, 2, 0.3)) : 1;
        const drawn = i === 0 ? s.p(1, 1, 0.8) : 1;
        st.right.dots(ctx, [a, b], [curveG(a), curveG(b)], { color: C.yellow, alpha: s.p(1, 0.6) * fade, r: 7 });
        st.right.line(ctx, [a, c], [curveG(a), 0], { color: C.yellow, width: 2.5, alpha: drawn * fade });
        if (local > 0.05 && (s.beat >= 2 || i < stage)) {
          // 同じ傾きの放物線: 点 b の値と勾配を通り、2階微分が slope のもの
          const parabola = st.xs.map((x) => curveF(b) + curveG(b) * (x - b) + 0.5 * slope * (x - b) ** 2);
          st.left.line(ctx, st.xs, parabola, { color: D.COLOR.bfgs, width: 2.5, alpha: fade * Math.min(1, local * 2) });
          st.left.dots(ctx, [c], [curveF(c)], { color: C.yellow, alpha: fade * Math.min(1, local * 2), r: 7 });
          st.right.dots(ctx, [c], [0], { color: C.yellow, alpha: fade * Math.min(1, local * 2), r: 6 });
        }
        st.left.dots(ctx, [a, b], [curveF(a), curveF(b)], { color: C.yellow, alpha: s.p(1, 0.6) * fade, r: 7 });
      }
      const last = secantSteps[Math.min(stage + 2, secantSteps.length - 1)];
      if (s.beat >= 3) canvasText(ctx, `${stage + 1} 回目  x = ${fmt(last, 4)}、勾配 ${fmt(curveG(last), 4)}`, 800, 742, { size: 22, weight: 700, color: C.text, align: 'center', alpha: s.p(3, 0.6) });
    },
  });

  // ---------------------------------------------------------------- 第4章 理論
  SCENES.push({
    id: '4T',
    chapter: 4,
    kind: 'theory',
    title: 'BFGS の更新式',
    beats: [
      beat('割線条件を満たす行列は、たくさんあります。BFGS は、その中で前の行列に一番近いものを選びます。'),
      beat('更新式はこの形です。ロー は、y と s の内積の逆数です。4人の名前の頭文字で、1970年に、それぞれ独立に提案されました。', 10),
      beat('この更新には、良い性質が3つあります。まず、割線条件 H y イコール s を、必ず満たします。'),
      beat('次に、y と s の内積が正なら、正定値が保たれます。だから進む向きは、必ず下りです。'),
      beat('最後に、行列の掛け算をベクトルの積に直せば、1回の更新は n の2乗の手間で済みます。ニュートン法の n の3乗より軽くなります。', 10),
    ],
    build(ui) {
      ui.tex(R`H_{k+1} = (I - \rho_k\, \mathbf{s}_k \mathbf{y}_k^{\top})\; H_k\; (I - \rho_k\, \mathbf{y}_k \mathbf{s}_k^{\top}) + \rho_k\, \mathbf{s}_k \mathbf{s}_k^{\top}`, { x: LEFT_X, y: 136, size: 33, at: 1, glow: [{ from: 1, to: 2 }] });
      ui.tex(R`\rho_k = \frac{1}{\mathbf{y}_k^{\top} \mathbf{s}_k}, \qquad \mathbf{x}_{k+1} = \mathbf{x}_k - \alpha_k\, H_k\, \mathbf{g}_k`, { x: LEFT_X, y: 232, size: 29, at: 1, delay: 0.6 });
      ui.text('ブロイデン、フレッチャー、ゴールドファーブ、シャンノ（1970）', { x: LEFT_X, y: 330, size: 22, color: C.muted, at: 1, delay: 1 });
      const rows = [
        [2, '① 割線条件を満たす', R`H_{k+1}\, \mathbf{y}_k = \mathbf{s}_k`],
        [3, '② 正定値が保たれる', R`\mathbf{y}_k^{\top} \mathbf{s}_k > 0 \;\Rightarrow\; H_{k+1} \succ 0 \;\Rightarrow\; \text{向きは必ず下り}`],
        [4, '③ 更新の手間は軽い', R`O(n^2) \quad (\text{ニュートン法は } O(n^3))`],
      ];
      rows.forEach(([at, label, tex], i) => {
        ui.text(label, { x: LEFT_X, y: 410 + i * 92, size: 26, weight: 700, at });
        ui.tex(tex, { x: LEFT_X + 340, y: 408 + i * 92, size: 27, at, delay: 0.3 });
      });
    },
  });

  // ---------------------------------------------------------------- 第4章 図解
  SCENES.push({
    id: '4V',
    chapter: 4,
    kind: 'visual',
    title: '逆ヘッセ行列が育っていく',
    beats: [
      beat('細長い谷を、BFGS で下ります。勾配降下法で何十回もかかった谷を、数回で下りていきます。'),
      beat('右の図の点線の楕円が、本当の逆ヘッセ行列です。実線が、BFGS が持っている近似です。'),
      beat('最初は丸い形です。1歩ごとに、歩いた向きの曲がり具合を覚えて、形が変わります。'),
      beat('2次元なら、2組で近似はほぼ完成します。それ以降は、ニュートン法と同じように進みます。'),
      beat('ローゼンブロック関数でも、ヘッセ行列を一度も計算せずに、32回で着きました。ニュートン法は20回、勾配降下法は1000回超です。', 10),
    ],
    build() {
      const problem = O.valley(25, VALLEY_ANGLE);
      const box = { x: 90, y: 140, w: 520, h: 520 };
      const run = O.bfgs(problem, VALLEY_START, { keepMatrices: true });
      const A = problem.h();
      const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      const truth = [[A[1][1] / det, -A[0][1] / det], [-A[1][0] / det, A[0][0] / det]];
      const rosenBox = { x: 90, y: 140, w: 680, h: 520 };
      const rosen = O.bfgs(O.rosenbrock, [-1.2, 1], { tolerance: 1e-5 });
      return {
        run, truth,
        field: new D.Field({ box, xr: VALLEY_RANGE, yr: VALLEY_RANGE, f: problem.f, levels: 3 }),
        rosenField: new D.Field({ box: rosenBox, xr: [-1.8, 1.8], yr: [-0.8, 2.0], f: O.rosenbrock.f, levels: 2, floor: 0.05 }),
        rosen,
      };
    },
    draw(ctx, s, st) {
      const stageA = 1 - s.p(4, 0.6);
      const count = st.run.path.length - 1;
      const progress = s.beat >= 2 ? s.lin(2, 11, 0.2) : s.beat === 0 ? s.lin(0, 4, 0.4) * 0.34 : 0.34;
      const index = progress * count;
      if (stageA > 0) {
        st.field.draw(ctx, stageA * s.p(0, 0.6));
        st.field.mark(ctx, [0, 0], { alpha: stageA });
        ctx.save();
        ctx.globalAlpha *= stageA;
        st.field.path(ctx, st.run.path, { color: D.COLOR.bfgs, upto: progress, width: 3 });
        ctx.restore();
        const cx = 1060;
        const cy = 410;
        const pixels = 240;
        const low = Math.min(count, Math.floor(index));
        const high = Math.min(count, low + 1);
        const k = index - low;
        const M = st.run.matrices[low].map((row, i) => row.map((v, j) => lerp(v, st.run.matrices[high][i][j], k)));
        const alpha = stageA * s.p(1, 0.7);
        canvasText(ctx, '逆ヘッセ行列の形', cx, 130, { size: 23, weight: 700, color: C.text, align: 'center', alpha });
        D.drawMatrixEllipse(ctx, st.truth, cx, cy, pixels, { color: C.text, dash: [8, 7], width: 2.5, alpha });
        D.drawMatrixEllipse(ctx, M, cx, cy, pixels, { color: D.COLOR.bfgs, width: 4, alpha });
        legend(ctx, [{ color: C.text, dash: [8, 7], label: '本当の H⁻¹' }, { color: D.COLOR.bfgs, label: 'BFGS の近似' }], 880, 690, { alpha, gap: 24, size: 18 });
        canvasText(ctx, `${Math.min(count, Math.round(index))} 歩目`, 1400, 690, { size: 22, weight: 700, color: C.text2, align: 'right', alpha });
      }
      if (s.beat >= 4) {
        const alpha = s.p(4, 0.7, 0.3);
        st.rosenField.draw(ctx, alpha);
        st.rosenField.mark(ctx, [1, 1], { alpha });
        st.rosenField.path(ctx, st.rosen.path, { color: D.COLOR.bfgs, upto: s.lin(4, 8, 0.6), width: 3 });
        const rows = [['ニュートン法', 20, D.COLOR.newton], ['BFGS', st.rosen.path.length - 1, D.COLOR.bfgs]];
        rows.forEach(([name, value], i) => canvasText(ctx, `${name}  ${value} 回`, 830, 300 + i * 56, { size: 28, weight: 700, color: C.text, alpha }));
        canvasText(ctx, 'H は一度も計算していない', 830, 430, { size: 22, color: C.text2, alpha });
      }
    },
  });
})();
