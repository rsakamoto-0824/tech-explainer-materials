// scene-kit.js — 場面のファイル（ep*-scenes-*.js）で共通に使う小道具と、3回に共通の場面（はじめに・まとめ・おわり）の組み立て。
// 1つの場面 = { id, chapter, kind, title, beats, build(ui) → 状態, draw(ctx, s, 状態) }。
// beats は字幕の列。beat(字幕, 読み上げ原稿, 秒)。秒を省くと文の長さと声の長さから決まる。部品の at は「何番目の字幕で出すか」。
// 読み上げ原稿は字幕のすぐ横に書く（数式は読み方に直し、読み間違えやすい語はかなで書く）。engine.js は window.NARRATION から原稿を読む。
window.SK = (() => {
  const { C, roundRect } = KIT;
  const SCENES = (window.SCENES = window.SCENES || []);
  const NARRATION = (window.NARRATION = window.NARRATION || {});
  const beat = (c, n, d) => ({ c, n, d });
  const add = (scene) => {
    SCENES.push(scene);
    NARRATION[scene.id] = scene.beats.map((b) => b.n);
  };

  const LEFT_X = 90;
  const CARD_X = 1010;
  const CARD_W = 500;
  const SERIES_TITLE = '状態空間モデルとカルマンフィルター';
  const EPISODES = ['状態空間モデル入門', 'カルマンフィルターのしくみ', 'カルマンフィルターを使いこなす'];
  const seeThrough = (el) => {
    el.node.style.background = 'transparent';
    return el;
  };
  // 理論の場面でよく使う部品: 式、式の横の説明、黄色の要点
  const eq = (ui, src, y, o = {}) => ui.tex(src, { x: LEFT_X, y, size: 32, ...o });
  const note = (ui, text, x, y, o = {}) => ui.text(text, { x, y, size: 22, color: C.text2, ...o });
  const keyPoint = (ui, text, y, at, o = {}) => ui.text(text, { x: LEFT_X, y, size: 27, weight: 700, color: C.yellow, at, glow: [{ from: at }], ...o });

  // ---- はじめに（題名、3回の構成、この回の目次） ----
  function titleScene({ episode, subtitle, beats, chapters, footnote }) {
    add({
      id: '0',
      chapter: 0,
      kind: 'title',
      title: 'はじめに',
      beats,
      build(ui) {
        ui.text(SERIES_TITLE, { x: 134, y: 96, size: 27, color: C.theory, weight: 700 });
        ui.text(`<span class="mincho">第${episode}回　${EPISODES[episode - 1]}</span>`, { x: 128, y: 138, size: 68, weight: 600, delay: 0.2 });
        ui.text(subtitle, { x: 134, y: 252, size: 29, color: C.text2, delay: 0.5 });
        EPISODES.forEach((name, i) => {
          const current = i === episode - 1;
          const color = current ? C.theory : C.muted;
          ui.text(`<span class="pill" style="color:${color};border-color:${color}">第${i + 1}回</span>${name}`, {
            x: 134 + i * 455, y: 330, size: 22, weight: current ? 700 : 400, color: current ? C.text : C.muted, delay: 0.8 + 0.15 * i,
          });
        });
        const rows = Math.ceil(chapters.length / 2);
        chapters.forEach((title, i) => {
          const left = i < rows;
          ui.text(`<span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${title}`, { x: left ? 134 : 830, y: 430 + (left ? i : i - rows) * 56, size: 25, at: 1, delay: 0.2 + 0.12 * i });
        });
        if (footnote) ui.text(footnote, { x: 134, y: 430 + rows * 56 + 24, size: 20, color: C.muted, at: beats.length - 1, delay: 0.3 });
      },
      draw(ctx, s) {
        // 題名の左の縦の帯と、3回の構成の下の罫線
        ctx.save();
        ctx.globalAlpha = s.p(0, 0.8, 0.1);
        ctx.fillStyle = C.theory;
        roundRect(ctx, 100, 104, 8, 190, 4);
        ctx.fill();
        ctx.fillStyle = C.grid;
        ctx.fillRect(134, 392, 1330, 2);
        ctx.restore();
      },
    });
  }

  // ---- まとめ（要点を1つずつ出す。最後の字幕で「次回」などの一言を出す） ----
  function summaryScene({ chapter, title = 'まとめ', items, closing, beats }) {
    add({
      id: 'S',
      chapter,
      kind: 'summary',
      title,
      beats,
      build(ui) {
        const step = Math.min(84, 520 / items.length);
        items.forEach(([head, body], i) => {
          ui.text(`<span class="toc-num">${i + 1}</span><b>${head}</b>`, { x: 130, y: 136 + i * step, size: 27, at: i, glow: [{ from: i, to: i + 1 }] });
          ui.text(body, { x: 182, y: 136 + i * step + 40, size: 21, color: C.text2, at: i, delay: 0.3 });
        });
        if (closing) ui.text(closing, { x: 130, y: 136 + items.length * step + 14, size: 26, weight: 700, color: C.yellow, at: items.length });
      },
    });
  }

  // ---- おわり（参考文献） ----
  function endScene({ chapter, references, beats }) {
    add({
      id: 'E',
      chapter,
      kind: 'summary',
      title: '参考文献',
      beats,
      build(ui) {
        references.forEach((text, i) => ui.text(`・${text}`, { x: 130, y: 140 + i * 62, w: 1340, size: 21, lh: 1.4, delay: 0.2 + 0.15 * i }));
        ui.text('例のデータは、説明用に式と乱数で作ったものです（実在のデータではありません）。', { x: 130, y: 140 + references.length * 62 + 30, size: 20, color: C.muted, delay: 1.2 });
      },
    });
  }

  return { SCENES, beat, add, LEFT_X, CARD_X, CARD_W, SERIES_TITLE, EPISODES, seeThrough, eq, note, keyPoint, titleScene, summaryScene, endScene };
})();
