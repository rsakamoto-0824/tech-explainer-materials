// scenes-output.js — 第7章（不確かさと summary() の読み方）、第8章（実務での使い方と注意）、まとめ、おわり。
// summary の画面は、mgcv が実際に出力した文字（gam-data.js の summaryText）をそのまま描いている。
(() => {
  const { W, C, Plot, fmt, canvasText, legend, rgba, roundRect } = KIT;
  const X = GAMX;
  const DATA = GAMDATA;
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

  const MAIN = DATA.main;
  const SINGLE = DATA.single;
  const VERSION = DATA.mgcvVersion.replace(/\.(\d+)$/, '-$1');
  // 大きな数を「約 4万6千」のように読む（λ が非常に大きい項の説明用）
  const roughJapanese = (value) => {
    const man = Math.floor(value / 10000);
    const sen = Math.round((value - man * 10000) / 1000);
    return `${man}万${sen ? `${sen}千` : ''}`;
  };

  // ---------------------------------------------------------------- 第7章 理論
  SCENES.push({
    id: '7T',
    chapter: 7,
    kind: 'theory',
    title: '推定の不確かさ',
    beats: [
      beat('係数の推定値だけでなく、その不確かさも必要です。mgcv は、ここでもペナルティを事前分布とみなす、ベイズの見方を使います。', 11),
      beat('係数の事後分布は、近似的に正規分布になります。平均は推定値、共分散行列は、当てはめで使った行列の逆行列に、尺度 φ を掛けたものです。', 12),
      beat('関数の標準誤差は、この共分散行列から計算します。plot で描かれる帯は、推定値の上下に、標準誤差の2倍をとったものです。', 11),
      beat('この帯は、関数全体でならして見たときに、約 95% の割合で真の関数を含む、という性質があります。'),
      beat('ただし、λ を既知の値として扱った結果です。λ の推定の不確かさも入れたいときは、unconditional = TRUE を指定します。', 11),
    ],
    build(ui) {
      ui.text('事前分布（ペナルティ）× 尤度 → 事後分布', { x: LEFT_X, y: 116, size: 26, weight: 700 });
      ui.tex(R`\boldsymbol\beta \mid \boldsymbol y \;\sim\; N\big(\hat{\boldsymbol\beta},\ V_\beta\big), \qquad \htmlClass{hl-v}{V_\beta = \big(X^{\mathsf T} W X + S_\lambda\big)^{-1} \phi}`, {
        x: LEFT_X, y: 196, size: 33, at: 1, hl: [{ cls: 'hl-v', from: 1, to: 2 }],
      });
      ui.text('$X^{\\mathsf T} W X + S_\\lambda$ は、P-IRLS の最後の反復で解いた連立方程式の行列（mgcv では b$Vp に入る）'.replace('b$Vp', 'b&#36;Vp'), { x: LEFT_X, y: 278, size: 21, color: C.text2, at: 1, delay: 0.4 });
      ui.tex(R`\mathrm{se}\big(\hat f(x)\big) = \sqrt{\boldsymbol b(x)^{\mathsf T}\, V_\beta\, \boldsymbol b(x)}, \qquad \text{帯} = \hat f(x) \pm 2\, \mathrm{se}`, { x: LEFT_X, y: 366, size: 30, at: 2, glow: [{ from: 2, to: 3 }] });
      ui.text('$\\boldsymbol b(x)$：点 $x$ での基底関数の値を並べたベクトル', { x: LEFT_X, y: 446, size: 21, color: C.text2, at: 2, delay: 0.4 });
      ui.text('帯の性質：関数全体でならすと、約 95% の割合で真の関数を含む（点ごとに 95% ではない）', { x: LEFT_X, y: 528, w: 1420, size: 24, at: 3, glow: [{ from: 3, to: 4 }] });
      ui.text('Nychka (1988)、Marra &amp; Wood (2012)', { x: LEFT_X, y: 578, size: 19, color: C.muted, at: 3, delay: 0.4 });
      ui.text('<div class="code"><span class="kw">plot</span>(b, unconditional = <span class="str">TRUE</span>)   <span class="cm"># λ の推定の不確かさも入れた帯</span></div>', { x: LEFT_X, y: 642, size: 22, at: 4 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解: 4つの関数と帯
  const BAND_PANEL = { x0: 100, gap: 372, y: 178, w: 300, h: 400 };
  const BAND_Y_RANGE = [-6.5, 7.5];
  const bandPlots = MAIN.terms.map((term, j) => new Plot({ x: BAND_PANEL.x0 + BAND_PANEL.gap * j, y: BAND_PANEL.y, w: BAND_PANEL.w, h: BAND_PANEL.h, xr: [0, 1], yr: BAND_Y_RANGE }));
  const insideShare = MAIN.terms.map((term) => term.truth.filter((v, i) => Math.abs(v - term.fit[i]) <= 2 * term.se[i]).length / term.truth.length);
  const lambdaText = (value) => (value >= 1000 ? `約 ${roughJapanese(value)}` : value >= 0.1 ? fmt(value, 2) : fmt(value, 4));
  SCENES.push({
    id: '7V',
    chapter: 7,
    kind: 'visual',
    title: '4つの関数と帯',
    beats: [
      beat('例の4変数のモデルの結果です。青い線が推定した関数、帯が標準誤差の2倍、橙の破線が真の関数です。'),
      beat('真の関数は、ほぼ全域で帯の中に入っています。'),
      beat('データの少ない両端では、帯が広がります。'),
      beat(`x2 は、λ が ${fmt(MAIN.sp[2], 3)} と小さく、有効自由度は ${fmt(MAIN.edf[2], 1)} です。細かい山を表すのに、自由度を多く使っています。`, 11),
      beat(`x3 は、λ が約 ${roughJapanese(MAIN.sp[3])} と非常に大きく、有効自由度は ${fmt(MAIN.edf[3], 1)} です。ほぼ水平な直線まで縮められました。真の効果が 0 であることと合っています。`, 13),
    ],
    build(ui) {
      MAIN.terms.forEach((term, j) => {
        const x = BAND_PANEL.x0 + BAND_PANEL.gap * j;
        ui.text(`s(x${j})`, { x, y: 118, w: BAND_PANEL.w, align: 'center', size: 25, weight: 700, delay: 0.1 * j });
        ui.text(`$\\lambda$ = ${lambdaText(MAIN.sp[j])}<br>有効自由度 ${fmt(MAIN.edf[j], 2)}`, { x: x - 10, y: 632, w: BAND_PANEL.w + 20, align: 'center', size: 21, lh: 1.5, color: C.text2, at: 3, delay: 0.12 * j, glow: j === 2 ? [{ from: 3, to: 4 }] : j === 3 ? [{ from: 4 }] : [] });
        ui.text(`帯の中：${Math.round(insideShare[j] * 100)}%`, { x, y: 590, w: BAND_PANEL.w, align: 'center', size: 19, color: C.muted, at: 1, until: 3, delay: 0.12 * j });
      });
    },
    draw(ctx, s) {
      const alpha = s.p(0, 0.8);
      X.drawTermPanels(ctx, { alpha, dots: 0, fit: s.p(0, 1.6, 0.3), band: s.p(0, 1.2, 1.2), truth: s.p(0, 0.8, 1.8), plots: bandPlots, yticks: [-5, 0, 5] });
      // 字幕2: 両端の帯の広がりを示す
      if (s.beat === 2) {
        const a = s.win(2, 3);
        bandPlots.forEach((plot) => {
          ctx.save();
          ctx.globalAlpha *= a;
          ctx.fillStyle = rgba(C.yellow, 0.12);
          ctx.fillRect(plot.x, plot.y, plot.w * 0.1, plot.h);
          ctx.fillRect(plot.x + plot.w * 0.9, plot.y, plot.w * 0.1, plot.h);
          ctx.restore();
        });
      }
      legend(ctx, [{ color: C.blue, label: '推定した関数' }, { color: C.blue, kind: 'band', label: '±2×標準誤差' }, { color: C.orange, dash: [8, 6], label: '真の関数' }], 540, 740, { alpha, size: 18 });
    },
  });

  // ---------------------------------------------------------------- 第7章 図解: summary() の読み方
  const SUMMARY_LINES = MAIN.summaryText.filter((line, i, all) => !line.startsWith('Signif.') && line !== '---' && !(line === '' && (i === 0 || all[i - 1] === '' || all[i - 1] === '---')));
  const CONSOLE = { x: 96, y: 122, lineH: 30.5, size: 21, padX: 22, padY: 14 };
  const CONSOLE_FONT = `${CONSOLE.size}px Menlo, Monaco, monospace`;
  const lineOf = (text) => SUMMARY_LINES.findIndex((line) => line.includes(text));
  const smoothHeader = lineOf('Ref.df');
  const tailLine = lineOf('-REML');
  const fitLine = lineOf('R-sq');
  const smoothRows = MAIN.terms.length;
  const pValueX3 = MAIN.sTable[3][3];
  const NOTE_X = 940;
  SCENES.push({
    id: '7V2',
    chapter: 7,
    kind: 'visual',
    title: 'summary() の読み方',
    beats: [
      beat('summary の出力です。上の表は切片、下の表が滑らかな項です。'),
      beat('edf は、第4章で見た有効自由度です。1 に近ければ直線、大きいほど複雑な曲線です。'),
      beat(`p-value は、その関数が全体として 0 かどうかの検定です。x3 は ${fmt(pValueX3, 2)} で、効果があるとは言えません。値は近似なので、0.05 の近くでは慎重に読みます。`, 13),
      beat(`下の行の -REML は、最小にした REML の値です。Scale est. は尺度 φ の推定値で、${fmt(MAIN.scale, 2)} です。データを作ったときの分散は ${MAIN.noiseSd ** 2} でした。`, 13),
      beat('R-sq と Deviance explained は、当てはまりの良さです。この出力の数値は、どれも、ここまでの章の計算から出てきたものです。', 11),
    ],
    build(ui) {
      const note = (y, title, body, at) => {
        ui.text(title, { x: NOTE_X, y, size: 23, weight: 700, at });
        ui.text(body, { x: NOTE_X, y: y + 38, w: 580, size: 20, color: C.text2, lh: 1.6, at, delay: 0.3 });
      };
      note(126, 'edf：有効自由度（第4章）', '行列 $F$ の対角の和。1 に近い → 直線', 1);
      note(246, 'p-value：関数が 0 かの検定', `近似の検定（Wood 2013）。s(x3) は ${fmt(pValueX3, 3)}`, 2);
      note(366, '-REML と Scale est.', `最小にした REML の値（第6章）と、尺度 $\\phi$ の推定値（真の分散は ${MAIN.noiseSd ** 2}）`, 3);
      note(516, 'R-sq.(adj)、Deviance explained', '当てはまりの良さ（自由度を調整した決定係数と、説明できた逸脱度の割合）', 4);
    },
    draw(ctx, s) {
      const alpha = s.p(0, 0.8);
      ctx.save();
      ctx.font = CONSOLE_FONT;
      const charW = ctx.measureText('M').width;
      const width = Math.max(...SUMMARY_LINES.map((line) => line.length)) * charW + CONSOLE.padX * 2;
      const height = SUMMARY_LINES.length * CONSOLE.lineH + CONSOLE.padY * 2;
      ctx.globalAlpha *= alpha;
      roundRect(ctx, CONSOLE.x, CONSOLE.y, width, height, 12);
      ctx.fillStyle = '#121211';
      ctx.fill();
      ctx.strokeStyle = '#3a3a37';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 強調の枠（文字の位置から計算する）
      const rowTop = (line) => CONSOLE.y + CONSOLE.padY + line * CONSOLE.lineH;
      const box = (line, rows, from, to, k) => {
        if (k <= 0) return;
        ctx.save();
        ctx.globalAlpha *= k;
        roundRect(ctx, CONSOLE.x + CONSOLE.padX + from * charW - 5, rowTop(line) + 2, (to - from) * charW + 10, rows * CONSOLE.lineH - 2, 6);
        ctx.fillStyle = rgba(C.yellow, 0.16);
        ctx.fill();
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      };
      const header = SUMMARY_LINES[smoothHeader];
      const edfAt = header.indexOf('edf');
      const pAt = header.indexOf('p-value');
      const tail = SUMMARY_LINES[tailLine];
      box(smoothHeader, smoothRows + 1, edfAt - 2, edfAt + 3, s.win(1, 2));
      box(smoothHeader, smoothRows + 1, pAt - 1, pAt + 7, s.win(2, 3));
      box(tailLine, 1, 0, tail.indexOf('n =') - 3, s.win(3, 4));
      box(fitLine, 1, 0, SUMMARY_LINES[fitLine].length, s.win(4));
      ctx.fillStyle = '#e6e4dc';
      ctx.textBaseline = 'middle';
      SUMMARY_LINES.forEach((line, i) => {
        const shown = s.p(0, 0.4, 0.05 * i);
        ctx.globalAlpha = alpha * shown;
        ctx.fillText(line, CONSOLE.x + CONSOLE.padX, rowTop(i) + CONSOLE.lineH / 2 + 1);
      });
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- 第8章 理論
  SCENES.push({
    id: '8T',
    chapter: 8,
    kind: 'theory',
    title: '実務での使い方',
    beats: [
      beat('最後に、実務での使い方をまとめます。λ の選び方は、method = "REML" を指定するのが基本です。'),
      beat('基底の数 k は、大きめに取ります。k は自由度の上限で、実際のなめらかさは λ が決めるからです。足りているかは、gam.check で確かめます。', 12),
      beat('効果のない変数を落としたいときは、select = TRUE を使います。直線の成分にもペナルティがかかり、項をまるごと 0 に縮められます。', 11),
      beat('変数どうしの交互作用は、te や ti で表します。単位の違う変数を組み合わせるときに向いた、テンソル積の基底です。', 11),
      beat('データが大きいときは、bam を使います。計算の手順を工夫して、メモリと時間を節約した関数です。'),
    ],
    build(ui) {
      const code = (text) => `<span style="font-family:Menlo,monospace;font-size:0.9em;color:#7fb4f0">${text}</span>`;
      ui.table({
        x: LEFT_X, y: 120, widths: [300, 430, 690], size: 23, rowH: 96, aligns: ['left', 'left', 'left'],
        header: ['やること', '書き方', '理由'],
        rows: [
          ['λ の選び方', code('method = "REML"'), '極端な波打ちが起きにくい'],
          ['基底の数', `${code('s(x, k = 20)')}　${code('gam.check(b)')}`, 'k は自由度の上限。なめらかさは λ が決める'],
          ['効かない項を縮める', code('select = TRUE'), '直線の成分にもペナルティ → 項ごと 0 にできる'],
          ['交互作用', `${code('te(x, z)')}　${code('ti(x, z)')}`, '単位の違う変数はテンソル積の基底で'],
          ['大きなデータ', code('bam(..., discrete = TRUE)'), 'メモリと時間を節約する計算手順'],
        ],
        at: 0, rowAt: [0, 1, 2, 3, 4], delay: 0.2, glowRows: [0, 1, 2, 3, 4].map((i) => [{ from: i, to: i + 1 }]),
      });
    },
  });

  // ---------------------------------------------------------------- 第8章 図解: k が足りているか
  const K_STUDY = DATA.kStudy;
  const K_PANEL = { x0: 100, gap: 372, y: 178, w: 300, h: 300 };
  const kPlots = K_STUDY.map((item, j) => X.singlePlot({ x: K_PANEL.x0 + K_PANEL.gap * j, y: K_PANEL.y, w: K_PANEL.w, h: K_PANEL.h }));
  const kError = K_STUDY.map((item) => Math.sqrt(item.fit.reduce((sum, v, i) => sum + (v - SINGLE.truth[i]) ** 2, 0) / item.fit.length));
  const K_ROWS = [
    ['上限 k − 1', (item) => String(item.kPrime)],
    ['有効自由度', (item) => fmt(item.edf, 2)],
    ['k-index', (item) => fmt(item.kIndex, 2)],
    ['p 値', (item) => fmt(item.pValue, 2)],
    ['真の関数との差', (item, j) => fmt(kError[j], 2)],
  ];
  const K_ROW = { y: 540, h: 35, labelX: 60 };
  SCENES.push({
    id: '8V',
    chapter: 8,
    kind: 'visual',
    title: 'k が足りているかを確かめる',
    beats: [
      beat(`1変数の例で、k を ${K_STUDY.map((item) => item.k).join('、')} と変えて当てはめました。下の表は、gam.check が出す値です。`, 10),
      beat(`k が ${K_STUDY[0].k} では、山の形を表しきれません。有効自由度は ${fmt(K_STUDY[0].edf, 2)} で、上限の ${K_STUDY[0].kPrime} に張りついています。p 値も ${fmt(K_STUDY[0].pValue, 2)} と小さく、k の不足を示しています。`, 14),
      beat(`k を ${K_STUDY[1].k} にすると、形が合います。有効自由度は ${fmt(K_STUDY[1].edf, 1)} で、上限の ${K_STUDY[1].kPrime} に近い値です。`, 10),
      beat(`${K_STUDY[2].k} と ${K_STUDY[3].k} では、曲線はほとんど変わりません。有効自由度も ${fmt(K_STUDY[2].edf, 1)} と ${fmt(K_STUDY[3].edf, 1)} で、ほぼ同じです。`, 11),
      beat('k が十分に大きければ、結果は k にほとんどよりません。有効自由度が上限に近いときは、k を増やして確かめます。', 10),
    ],
    build(ui) {
      K_STUDY.forEach((item, j) => {
        const x = K_PANEL.x0 + K_PANEL.gap * j;
        ui.text(`k = ${item.k}`, { x, y: 118, w: K_PANEL.w, align: 'center', size: 26, weight: 700, delay: 0.1 * j, glow: [{ from: Math.min(j + 1, 3), to: Math.min(j + 2, 4) }] });
      });
      ui.text('真の関数との差 ＝ 曲線全体での差の2乗平均の平方根。k-index と p 値は、残差に形が残っていないかの検定（k-index が 1 より小さく p 値が小さいと、k の不足が疑われる）', { x: K_ROW.labelX, y: 704, w: 1480, size: 16, color: C.muted, lh: 1.5, delay: 0.6 });
    },
    draw(ctx, s) {
      const alpha = s.p(0, 0.8);
      K_STUDY.forEach((item, j) => {
        const plot = kPlots[j];
        const focus = s.beat === 0 || s.beat === 4 || (s.beat === 3 ? j >= 2 : s.beat - 1 === j);
        const a = alpha * (focus ? 1 : 0.45);
        X.drawSingleData(ctx, plot, { alpha: a, dotAlpha: 0.4, r: 2.4 });
        plot.band(ctx, SINGLE.grid, item.fit.map((v, i) => v - 2 * item.se[i]), item.fit.map((v, i) => v + 2 * item.se[i]), { color: C.blue, alpha: 0.28 * a });
        plot.line(ctx, SINGLE.grid, item.fit, { color: C.blue, width: 3.5, alpha: a, upto: s.p(0, 1.2, 0.3 + 0.2 * j) });
        K_ROWS.forEach(([, value], r) => {
          const cx = plot.x + plot.w / 2;
          const warn = (r === 1 && item.kPrime - item.edf < 0.2) || (r === 3 && item.pValue < 0.05);
          canvasText(ctx, value(item, j), cx, K_ROW.y + r * K_ROW.h, { size: 22, color: warn ? C.red : C.text, weight: warn ? 700 : 500, align: 'center', alpha: a * s.p(0, 0.5, 1 + 0.1 * r) });
        });
      });
      K_ROWS.forEach(([label], r) => canvasText(ctx, label, K_ROW.labelX, K_ROW.y + r * K_ROW.h, { size: 17, color: C.muted, alpha: alpha * s.p(0, 0.5, 1 + 0.1 * r) }));
    },
  });

  // ---------------------------------------------------------------- まとめ
  SCENES.push({
    id: '9',
    chapter: 9,
    kind: 'summary',
    title: '全体のふりかえり',
    beats: [
      beat('まとめです。mgcv は、滑らかな関数を、基底と係数で表します。既定の基底は、固有値で切り詰めた、薄板回帰スプラインです。', 11),
      beat('係数は、波打ちのペナルティを足した最小二乗で解きます。正規分布以外では、これを P-IRLS で繰り返します。', 10),
      beat('平滑化パラメータ λ は、REML か GCV で選びます。対数の上のニュートン法で、外側で λ、内側で係数を解く、入れ子の計算です。', 11),
      beat('有効自由度、帯、p 値は、どれも同じ行列から計算されます。帯は λ を固定した結果で、p 値は近似である点に注意します。', 11),
      beat(`図の数値は mgcv ${VERSION} で計算し、この動画の計算と一致することを確かめました。参考文献は画面のとおりです。`, 10),
    ],
    build(ui) {
      const points = [
        [0, R`滑らかな関数 ＝ 基底 × 係数の和。既定は薄板回帰スプライン（固有値で $k$ 個に切り詰めた基底）`],
        [1, R`係数は $\|y - X\beta\|^2 + \lambda\, \beta^{\mathsf T} S \beta$ を最小にして解く。正規分布以外は P-IRLS で繰り返す`],
        [2, R`$\lambda$ は REML か GCV で選ぶ。$\log \lambda$ のニュートン法（外側で $\lambda$、内側で係数）`],
        [3, R`有効自由度 $\mathrm{tr}(F)$・帯・p 値は、同じ行列 $X^{\mathsf T} W X + S_\lambda$ から計算される`],
        [3, '注意：帯は λ を固定した結果、p 値は近似。k が足りているかは gam.check で確かめる'],
      ];
      points.forEach(([at, text], i) => ui.text(`<span class="toc-num">${i + 1}</span>${text}`, { x: LEFT_X, y: 116 + i * 60, w: 1420, size: 24, at, delay: i === 4 ? 0.6 : 0 }));
      ui.text('文献：S. N. Wood, Thin plate regression splines, J. R. Statist. Soc. B 65 (2003) 95–114 ／ S. N. Wood, Fast stable restricted maximum likelihood and marginal likelihood estimation of semiparametric generalized linear models, J. R. Statist. Soc. B 73 (2011) 3–36 ／ S. N. Wood, On p-values for smooth components of an extended generalized additive model, Biometrika 100 (2013) 221–228 ／ G. Marra, S. N. Wood, Coverage properties of confidence intervals for generalized additive model components, Scand. J. Statist. 39 (2012) 53–74 ／ D. Nychka, Bayesian confidence intervals for smoothing splines, J. Amer. Statist. Assoc. 83 (1988) 1134–1143 ／ S. N. Wood, Generalized Additive Models: An Introduction with R, 2nd ed., CRC Press, 2017', {
        x: LEFT_X, y: 452, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 4, delay: 0.4,
      });
      ui.text(`計算：mgcv ${VERSION}（${DATA.rVersion.replace(/ \(.*$/, '')}、webR）。例のデータは、mgcv の gamSim の関数（Gu と Wahba の例）をもとに乱数で作った合成データ。図の曲線は、mgcv の基底とペナルティの行列を使って再計算したもの`, { x: LEFT_X, y: 634, w: 1420, size: 16, color: C.muted, lh: 1.5, at: 4, delay: 0.8 });
    },
  });

  // ---------------------------------------------------------------- おわり
  SCENES.push({
    id: 'end',
    chapter: 10,
    kind: 'title',
    title: 'おわり',
    beats: [beat('これで、mgcv の一般化加法モデルの解説は終わりです。ご視聴ありがとうございました。', 7)],
    build(ui) {
      ui.text('おわり', { x: 0, y: 230, w: W, align: 'center', size: 96, weight: 800 });
      ui.text('ご視聴ありがとうございました', { x: 0, y: 390, w: W, align: 'center', size: 36, color: C.text2, delay: 0.4 });
      ui.text('mgcv の一般化加法モデル ― gam() の中で行われる計算', { x: 0, y: 490, w: W, align: 'center', size: 24, color: C.muted, delay: 0.8 });
    },
  });
})();
