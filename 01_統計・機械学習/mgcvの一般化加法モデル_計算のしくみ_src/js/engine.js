// engine.js — 場面の一覧（window.SCENES）を、時刻 t の絵にする（ガウス過程回帰・特異値分解・RBF の解説動画と同じ仕組み）。
// t が同じなら必ず同じ絵になる（乱数も実時間も使わない）。録画（tools/render.mjs）は ARCH.render(t) を1コマずつ呼ぶ。
// ふつうに開くと再生、?t=12.5 でその時刻に止める、?scene=6V1 でその場面から再生、?render で録画用（自動再生しない）。
// 再生中のキー: スペース＝一時停止、←→＝5秒戻る・進む、[ ]＝前・次の場面。
(() => {
  const { W, H, C, CHAPTERS, clamp, ramp, lerp, easeOut, easeInOut, rgba } = KIT;
  const FPS = 30;
  const CANVAS_SCALE = 1.2; // 論理 1600×900 を 1920×1080 で描く

  // 動画全体の速さ。時間割と場面の動きは下の秒数（速さ 1）で組み、動画の t 秒には「時間割の t × PACE 秒」を映す。
  // 声も render.mjs の --rate 220 で約1.1倍速く読むので、声の長さは PACE 倍して時間割の秒に直す
  const PACE = 1.1;

  // 時間割（秒）
  const SCENE_LEAD = 0.5; // 場面の最初の字幕が出るまで
  const SCENE_TAIL = 0.8; // 最後の字幕のあと、次の場面まで
  const SCENE_FADE = 0.45;
  const EL_FADE = 0.45;
  const EL_SLIDE_PX = 14;
  const DIM_OPACITY = 0.36;
  const CAPTION_FADE = 0.25;
  // 字幕の長さから滞在時間を決める（日本語を読む速さ ≈ 7.5 字/秒 + 見る時間）
  const READ_CHARS_PER_SECOND = 7.5;
  const BEAT_BASE_SECONDS = 1.8;
  const BEAT_MIN_SECONDS = 5;
  const BEAT_MAX_SECONDS = 12;

  const KIND_LABEL = { theory: '理論', visual: '図解', summary: 'まとめ', points: 'ポイント' };
  const PART_LABEL = 'mgcv の一般化加法モデル'; // 右上に出す動画の題名
  const KIND_COLOR = { theory: C.theory, visual: C.visual, summary: C.text2, points: C.yellow, title: C.muted };
  const KATEX_OPTIONS = { throwOnError: true, strict: 'ignore', trust: (c) => c.command === '\\htmlClass' };

  // 場面は章の番号順に並べる（同じ章の中はファイルに書いた順のまま）
  const scenes = window.SCENES.sort((a, b) => a.chapter - b.chapter);
  const params = new URLSearchParams(location.search);

  // ---- 文字: "$...$" の部分を KaTeX で描く。文字列はすべてこのファイル群の中で書いたもの ----
  const renderMath = (src) => katex.renderToString(`\\displaystyle ${src}`, KATEX_OPTIONS);
  const rich = (text) =>
    text
      .split(/(\$[^$]+\$)/)
      .map((part) => (part.length > 1 && part.startsWith('$') && part.endsWith('$') ? katex.renderToString(part.slice(1, -1), KATEX_OPTIONS) : part))
      .join('');
  const plainLength = (text) => text.replace(/\$([^$]+)\$/g, (_, m) => 'x'.repeat(Math.ceil(m.replace(/\\[a-zA-Z]+|[{}^_]/g, '').length / 1.5))).replace(/<[^>]+>/g, '').length;

  // ---- 読み上げ（narration.js の原稿と、narration/seconds.js の音声の長さ。無ければ字幕だけの動画になる） ----
  const NARRATION = window.NARRATION || {};
  const NARRATION_SECONDS = window.NARRATION_SECONDS || {};
  const NARRATION_LEAD = 0.3; // 字幕が出てから声が始まるまで
  const NARRATION_TAIL = 0.7; // 声が終わってから次の字幕まで
  const beatKey = (scene, i) => `${scene.id}:${i}`;
  scenes.forEach((scene) => {
    const lines = NARRATION[scene.id];
    if (Object.keys(NARRATION).length && (!lines || lines.length !== scene.beats.length)) {
      console.warn(`narration: ${scene.id} の原稿の数（${lines ? lines.length : 0}）が字幕の数（${scene.beats.length}）と合いません`);
    }
    scene.beats.forEach((b, i) => (b.n = lines && lines[i]));
  });

  // ---- 時間割を組む（声が字幕の時間より長いときは、その字幕を延ばす） ----
  let clock = 0;
  scenes.forEach((scene) => {
    scene.beatStarts = [];
    let u = SCENE_LEAD;
    scene.beats.forEach((b, i) => {
      scene.beatStarts.push(u);
      const reading = b.d ?? clamp(BEAT_BASE_SECONDS + plainLength(b.c) / READ_CHARS_PER_SECOND, BEAT_MIN_SECONDS, BEAT_MAX_SECONDS);
      const spokenSeconds = NARRATION_SECONDS[beatKey(scene, i)];
      b.dur = spokenSeconds ? Math.max(reading, NARRATION_LEAD + spokenSeconds * PACE + NARRATION_TAIL) : reading;
      u += b.dur;
    });
    scene.beatStarts.push(u); // 終わりの印（at に beats.length を書くと「最後まで出ない」）
    scene.duration = u + SCENE_TAIL;
    scene.t0 = clock;
    scene.t1 = clock + scene.duration;
    clock = scene.t1;
    scene.elements = [];
  });
  const DURATION = clock;
  // 時間割の秒 → 動画の秒（外に出す時刻はすべて動画の秒にする）
  const toVideoSeconds = (s) => s / PACE;
  const VIDEO_DURATION = toVideoSeconds(DURATION);

  // ---- 画面の骨組み ----
  const make = (tag, className, parent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  };
  const stage = document.getElementById('stage');
  const content = make('div', 'content', stage);
  const canvas = make('canvas', 'plot', content);
  canvas.width = W * CANVAS_SCALE;
  canvas.height = H * CANVAS_SCALE;
  const ctx = canvas.getContext('2d');
  const sceneRoot = make('div', 'scenes', content);
  const header = make('div', 'header', content);
  const badge = make('span', 'badge', header);
  const chapterNo = make('span', 'chapter-no', header);
  const headerTitle = make('span', 'header-title', header);
  const partLabel = make('div', 'part-label', content);
  const captionRoot = make('div', 'captions', content);
  const progress = make('div', 'progress', stage);
  const progressFill = make('div', 'progress-fill', progress);
  const stamp = make('div', 'stamp', stage);

  // 進み具合の帯: 場面ごとに理論・図解の色で塗り分ける
  scenes.forEach((scene) => {
    const seg = make('div', 'progress-seg', progress);
    seg.style.left = `${(scene.t0 / DURATION) * 100}%`;
    seg.style.width = `${(scene.duration / DURATION) * 100}%`;
    seg.style.background = rgba(KIND_COLOR[scene.kind], 0.45);
  });

  // ---- 場面の部品を作る道具（scene.build に渡す） ----
  function makeUi(scene, container) {
    const add = (node, o) => {
      node.classList.add('el');
      node.style.left = `${o.x ?? 0}px`;
      node.style.top = `${o.y ?? 0}px`;
      if (o.w) node.style.width = `${o.w}px`;
      if (o.h) node.style.height = `${o.h}px`;
      if (o.size) node.style.fontSize = `${o.size}px`;
      if (o.color) node.style.color = o.color;
      if (o.weight) node.style.fontWeight = o.weight;
      if (o.align) node.style.textAlign = o.align;
      if (o.lh) node.style.lineHeight = o.lh;
      if (o.glow) node.classList.add('glowable');
      container.appendChild(node);
      const el = {
        node,
        at: o.at ?? 0,
        delay: o.delay ?? 0,
        until: o.until,
        untilDelay: o.untilDelay ?? 0,
        dim: o.dim || (o.dimAt !== undefined ? [[o.dimAt, o.undimAt]] : []),
        glow: o.glow || [],
        hl: o.hl || [],
        live: o.live,
        slide: o.slide ?? true,
        last: {},
      };
      scene.elements.push(el);
      return el;
    };
    return {
      text: (text, o = {}) => {
        const node = make('div', 'txt');
        node.innerHTML = rich(text);
        return add(node, o);
      },
      tex: (src, o = {}) => {
        const node = make('div', 'tex');
        node.innerHTML = renderMath(src);
        return add(node, o);
      },
      card: (o = {}) => {
        const node = make('div', 'card');
        if (o.title) make('div', 'card-title', node).innerHTML = rich(o.title);
        if (o.accent) node.style.borderColor = rgba(o.accent, 0.6);
        return add(node, o);
      },
      // 表: 見出し行と各行を別々の部品にして、行ごとに出す時刻を変えられるようにする
      table: (o) => {
        const rowH = o.rowH ?? 44;
        const makeRow = (cells, cls) => {
          const node = make('div', `trow ${cls}`);
          cells.forEach((cell, j) => {
            const td = make('div', 'tcell', node);
            td.style.width = `${o.widths[j]}px`;
            td.style.textAlign = (o.aligns && o.aligns[j]) || 'center';
            td.innerHTML = rich(String(cell));
          });
          return node;
        };
        const header = add(makeRow(o.header, 'thead'), { ...o, h: rowH, glow: undefined });
        const rows = o.rows.map((cells, i) =>
          add(makeRow(cells, 'tbody'), {
            ...o,
            y: o.y + rowH * (i + 1),
            h: rowH,
            at: Array.isArray(o.rowAt) ? o.rowAt[i] : o.rowAt ?? o.at,
            delay: (o.rowDelay ?? 0) * (Array.isArray(o.rowAt) ? 0 : i) + (o.delay ?? 0),
            glow: o.glowRows && o.glowRows[i],
          }),
        );
        return { header, rows };
      },
    };
  }

  // ---- 部品を作る ----
  scenes.forEach((scene) => {
    scene.container = make('div', 'scene', sceneRoot);
    scene.state = scene.build ? scene.build(makeUi(scene, scene.container)) || {} : {};
    scene.captionNodes = scene.beats.map((b) => {
      const node = make('div', 'caption', captionRoot);
      // flex の中に直接文字と数式を置くと、ばらばらの列に分かれて折り返すため、1つの箱に包む
      node.innerHTML = `<div class="caption-text">${rich(b.c)}</div>`;
      return node;
    });
  });

  const phases = scenes.map((s) => ({ id: s.id, kind: s.kind, t0: toVideoSeconds(s.t0), t1: toVideoSeconds(s.t1), caption: `${s.id} ${s.title}` }));
  const posterScene = scenes.find((s) => s.poster) || scenes[0];
  const posterTime = toVideoSeconds(posterScene.t0 + (posterScene.poster ?? 4));

  // 式の一部（\htmlClass{名前}{…}）を囲む枠: フォントが読み込まれたあとに位置を測って作る
  function measureHighlights() {
    const scale = stage.getBoundingClientRect().width / W;
    scenes.forEach((scene) =>
      scene.elements.forEach((el) =>
        el.hl.forEach((h) => {
          const base = el.node.getBoundingClientRect();
          h.boxes = [...el.node.querySelectorAll(`.${h.cls}`)].map((span) => {
            const r = span.getBoundingClientRect();
            const box = make('div', 'hlbox', el.node);
            const pad = h.pad ?? 6;
            box.style.left = `${(r.left - base.left) / scale - pad}px`;
            box.style.top = `${(r.top - base.top) / scale - pad}px`;
            box.style.width = `${r.width / scale + pad * 2}px`;
            box.style.height = `${r.height / scale + pad * 2}px`;
            box.style.borderColor = h.color || C.yellow;
            box.style.background = rgba(h.color || C.yellow, 0.14);
            return box;
          });
          if (!h.boxes.length) console.warn(`highlight not found: ${scene.id} .${h.cls}`);
        }),
      ),
    );
  }

  // ---- 時刻 t の絵 ----
  const windowAlpha = (scene, u, from, to, fade = 0.4) => {
    const a = scene.beatStarts[from];
    let k = easeInOut(ramp(u, a, a + fade));
    if (to !== undefined && to !== null) {
      const b = scene.beatStarts[to];
      k *= 1 - easeInOut(ramp(u, b, b + fade));
    }
    return k;
  };

  function updateElement(el, scene, u) {
    const start = scene.beatStarts[el.at] + el.delay;
    const kIn = easeOut(ramp(u, start, start + EL_FADE));
    let opacity = kIn;
    if (el.until !== undefined) {
      const s = scene.beatStarts[el.until] + el.untilDelay;
      opacity *= 1 - easeInOut(ramp(u, s, s + EL_FADE));
    }
    for (const [from, to] of el.dim) opacity *= lerp(1, DIM_OPACITY, windowAlpha(scene, u, from, to, 0.5));
    const o = opacity.toFixed(3);
    if (el.last.opacity !== o) {
      el.node.style.opacity = o;
      el.node.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
      el.last.opacity = o;
    }
    const ty = el.slide ? ((1 - kIn) * EL_SLIDE_PX).toFixed(1) : '0';
    if (el.last.ty !== ty) {
      el.node.style.transform = ty === '0.0' || ty === '0' ? '' : `translateY(${ty}px)`;
      el.last.ty = ty;
    }
    if (el.glow.length) {
      let best = 0;
      let color = C.yellow;
      for (const g of el.glow) {
        const k = windowAlpha(scene, u, g.from, g.to);
        if (k > best) [best, color] = [k, g.color || C.yellow];
      }
      const key = `${best.toFixed(3)}${color}`;
      if (el.last.glow !== key) {
        el.node.style.background = rgba(color, 0.16 * best);
        el.node.style.boxShadow = `0 0 0 2px ${rgba(color, 0.9 * best)}`;
        el.last.glow = key;
      }
    }
    for (const h of el.hl) {
      const k = windowAlpha(scene, u, h.from, h.to).toFixed(3);
      if (h.last !== k) {
        for (const box of h.boxes || []) box.style.opacity = k;
        h.last = k;
      }
    }
    if (el.live) {
      const text = el.live(u);
      if (el.last.live !== text) {
        el.node.innerHTML = rich(text);
        el.last.live = text;
      }
    }
  }

  // 場面の draw に渡す時間の道具
  function timeApi(scene, u) {
    const bt = (i) => scene.beatStarts[i];
    return {
      u,
      bt,
      // 字幕 i の開始 + delay から dur 秒で 0→1（なめらか）
      p: (i, dur = 1, delay = 0) => easeInOut(ramp(u, bt(i) + delay, bt(i) + delay + dur)),
      lin: (i, dur = 1, delay = 0) => ramp(u, bt(i) + delay, bt(i) + delay + dur),
      win: (from, to, fade = 0.5) => windowAlpha(scene, u, from, to, fade),
      beat: scene.beatStarts.findLastIndex((b, i) => i < scene.beats.length && u >= b),
    };
  }

  let activeIndex = -1;
  let activeBeat = -1;
  function activate(index) {
    scenes.forEach((s, i) => {
      s.container.style.display = i === index ? 'block' : 'none';
      s.captionNodes.forEach((n) => (n.style.display = 'none'));
    });
    const scene = scenes[index];
    if (scene.kind === 'title') {
      header.style.display = 'none';
    } else {
      header.style.display = 'flex';
      badge.textContent = KIND_LABEL[scene.kind];
      badge.style.background = KIND_COLOR[scene.kind];
      // 章番号と右上の題名は、場面の chapterLabel・part で置きかえられる
      chapterNo.textContent = scene.chapterLabel ?? (scene.kind === 'summary' ? '' : `第${scene.chapter}章`);
      headerTitle.innerHTML = rich(scene.title);
    }
    partLabel.textContent = scene.part ?? (scene.kind === 'title' || scene.kind === 'summary' ? '' : PART_LABEL);
    activeIndex = index;
    activeBeat = -1;
  }

  // t は動画の秒。中では時間割の秒（time）で描く
  function render(t, { stamp: showStamp = false } = {}) {
    const time = clamp(t * PACE, 0, DURATION - 1e-6);
    let index = scenes.findIndex((s) => time < s.t1);
    if (index < 0) index = scenes.length - 1;
    if (index !== activeIndex) activate(index);
    const scene = scenes[index];
    const u = time - scene.t0;

    const fade = Math.min(easeInOut(ramp(u, 0, SCENE_FADE)), easeInOut(ramp(scene.duration - u, 0, SCENE_FADE)));
    content.style.opacity = fade.toFixed(3);

    for (const el of scene.elements) updateElement(el, scene, u);

    const api = timeApi(scene, u);
    if (api.beat !== activeBeat) {
      scene.captionNodes.forEach((n, i) => (n.style.display = i === api.beat ? 'flex' : 'none'));
      activeBeat = api.beat;
    }
    if (api.beat >= 0) {
      const b0 = scene.beatStarts[api.beat];
      scene.captionNodes[api.beat].style.opacity = easeOut(ramp(u, b0, b0 + CAPTION_FADE)).toFixed(3);
    }

    ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (scene.draw) {
      ctx.save();
      scene.draw(ctx, api, scene.state);
      ctx.restore();
    }

    progressFill.style.width = `${(time / DURATION) * 100}%`;
    stamp.style.display = showStamp ? 'block' : 'none';
    if (showStamp) stamp.textContent = `${toVideoSeconds(time).toFixed(1)}s  ${scene.id}`;
  }

  // ---- ブラウザで見るとき: 画面に合わせて縮める ----
  function fitStage() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = `scale(${scale})`;
    stage.style.left = `${(window.innerWidth - W * scale) / 2}px`;
    stage.style.top = `${(window.innerHeight - H * scale) / 2}px`;
  }

  // 字幕ごとの時刻と原稿（tools/render.mjs の voice・mux で声を作り、時刻に合わせて並べる）
  const beats = scenes.flatMap((scene) =>
    scene.beats.map((b, i) => ({ key: beatKey(scene, i), t0: toVideoSeconds(scene.t0 + scene.beatStarts[i]), dur: toVideoSeconds(b.dur), caption: b.c, narration: b.n || null })),
  );
  window.ARCH = { ready: false, duration: VIDEO_DURATION, fps: FPS, posterTime, phases, beats, narrationLead: toVideoSeconds(NARRATION_LEAD), render };

  (async () => {
    fitStage();
    window.addEventListener('resize', fitStage);
    // 文字の配置を一度計算させてから、フォントの読み込みを待つ（先に待つと、まだ何も読み込みが始まっていない）
    void document.body.offsetHeight;
    const KATEX_FACES = ['20px KaTeX_Main', 'italic 20px KaTeX_Main', 'bold 20px KaTeX_Main', 'italic 20px KaTeX_Math', '20px KaTeX_Size1', '20px KaTeX_Size2', '20px KaTeX_Size3', '20px KaTeX_Size4', '20px KaTeX_AMS', '20px KaTeX_Caligraphic'];
    await Promise.all(KATEX_FACES.map((face) => document.fonts.load(face).catch(() => null)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await document.fonts.ready;
    measureHighlights();
    scenes.forEach((s) => (s.container.style.display = 'none'));
    render(0);
    window.ARCH.ready = true;
    if (params.has('render')) return;
    if (params.has('t')) {
      render(Number(params.get('t')), { stamp: true });
      return;
    }
    const startScene = scenes.find((s) => s.id === params.get('scene'));
    // playhead は動画の秒（場面の区切りは phases で動画の秒になっている）
    let playhead = startScene ? toVideoSeconds(startScene.t0) : Number(params.get('start') || 0);
    let paused = false;
    let last = performance.now();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') paused = !paused;
      if (e.code === 'ArrowRight') playhead += 5;
      if (e.code === 'ArrowLeft') playhead = Math.max(0, playhead - 5);
      const i = phases.findIndex((p) => playhead < p.t1);
      if (e.code === 'BracketRight' && i < phases.length - 1) playhead = phases[i + 1].t0;
      if (e.code === 'BracketLeft') playhead = phases[Math.max(0, playhead - phases[i].t0 < 1 ? i - 1 : i)].t0;
    });
    const loop = (now) => {
      if (!paused) playhead += (now - last) / 1000;
      last = now;
      if (playhead >= VIDEO_DURATION) playhead = 0;
      render(playhead, { stamp: true });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();
})();
