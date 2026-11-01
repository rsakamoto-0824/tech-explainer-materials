// kit.js — 描画の小道具（色、時間の補間、グラフの枠、ヒートマップ、数値の書式）。
// 場面のファイル（scenes-*.js）と engine.js の両方から使う。
window.KIT = (() => {
  const W = 1600;
  const H = 900;

  // 色はデータ可視化の検証済みパレット（暗い背景用）から選んだ
  const C = {
    bg: '#1a1a19',
    panel: '#222220',
    grid: '#2c2c2a',
    axis: '#6b6a64',
    text: '#f0efec',
    text2: '#c3c2b7',
    muted: '#8f8e86',
    blue: '#3987e5',
    orange: '#d95926',
    aqua: '#199e70',
    yellow: '#c98500',
    violet: '#9085e9',
    red: '#e66767',
    theory: '#9085e9',
    visual: '#199e70',
  };
  const SERIES = [C.blue, C.orange, C.aqua];
  const FONT = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif";

  const CHAPTERS = [
    'ガウス過程とは ― 全体像と多変量正規分布',
    'カーネルの計算 ― RBF と Matérn',
    'データで条件づけて予測する',
    'ハイパーパラメータの決め方',
    'カーネルの組み合わせ規則',
    '周期カーネル',
    '加法カーネル① 構造の足し算',
    '加法カーネル② 入力次元の足し算',
    '加法カーネル③ 質的変数',
    '積カーネル ― 局所周期',
    'まとめ',
  ];

  // ---- 時間の補間 ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
  const easeInOut = (x) => {
    const k = clamp(x);
    return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
  };
  // [[時刻, 値], ...] の間をなめらかにつなぐ。log: true なら対数の上で補間する（長さスケールなど）
  function keyframes(t, keys, { log = false } = {}) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        const k = easeInOut((t - t0) / (t1 - t0));
        return log ? Math.exp(lerp(Math.log(v0), Math.log(v1), k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  }

  // ---- 色 ----
  const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rgba = (hex, alpha) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  function colorRamp(stops) {
    const parsed = stops.map(([v, hex]) => [v, hexToRgb(hex)]);
    return (value) => {
      if (value <= parsed[0][0]) return parsed[0][1];
      for (let i = 1; i < parsed.length; i++) {
        if (value <= parsed[i][0]) {
          const [v0, c0] = parsed[i - 1];
          const [v1, c1] = parsed[i];
          const k = (value - v0) / (v1 - v0);
          return c0.map((c, j) => c + (c1[j] - c) * k);
        }
      }
      return parsed[parsed.length - 1][1];
    };
  }
  // 大きさ（0〜1）: 0 は背景に沈み、大きいほど明るい青
  const seqColor = colorRamp([[0, '#1a1a19'], [0.3, '#0d366b'], [0.62, '#2a78d6'], [1, '#b7d3f6']]);
  // 正負（−1〜1）: 負は青、0 は灰、正は赤
  const divColor = colorRamp([[-1, '#9ec5f4'], [-0.5, '#2a78d6'], [0, '#383835'], [0.5, '#c94848'], [1, '#f4a3a3']]);

  // 行列やグリッドの値を、1マス1画素の小さな画像にする（描くときに拡大する）
  function heatmapCanvas(rows, cols, colorAt, reuse) {
    const canvas = reuse || document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const context = canvas.getContext('2d');
    const image = context.createImageData(cols, rows);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const [r, g, b] = colorAt(i, j);
        const p = (i * cols + j) * 4;
        image.data[p] = r;
        image.data[p + 1] = g;
        image.data[p + 2] = b;
        image.data[p + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }
  function drawImage(ctx, image, x, y, w, h, { smooth = false, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = smooth;
    ctx.drawImage(image, x, y, w, h);
    ctx.restore();
  }

  // 行列の値を色で描く（0〜max を青の濃さで）。rowMark の行に黄色の線を引く
  function drawMatrixHeat(ctx, x, y, size, values, max, { rowMark = null, alpha = 1 } = {}) {
    const n = values.length;
    const image = heatmapCanvas(n, n, (i, j) => seqColor(values[i][j] / max));
    drawImage(ctx, image, x, y, size, size, { alpha });
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
    if (rowMark !== null) {
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 2.5;
      const ry = y + ((rowMark + 0.5) / n) * size;
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x + size, ry);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- 数値の書式（画面の文字はマイナスを「−」で出す。TeX の中は「-」のままでよい） ----
  const fmt = (value, digits = 3) => {
    const text = value.toFixed(digits);
    if (/^-0\.?0*$/.test(text)) return text.slice(1);
    return text.startsWith('-') ? `−${text.slice(1)}` : text;
  };
  const texNum = (value, digits = 3) => {
    const text = value.toFixed(digits);
    return /^-0\.?0*$/.test(text) ? text.slice(1) : text;
  };
  // 掛け算の右側に置く数（負ならかっこで囲む）
  const texFactor = (value, digits = 3) => (value < 0 ? `(${texNum(value, digits)})` : texNum(value, digits));

  // ---- キャンバスの文字 ----
  function canvasText(ctx, text, x, y, { size = 18, color = C.text2, align = 'left', baseline = 'alphabetic', weight = 500, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // ---- グラフの枠: データ座標 → 画面座標の変換と、線・帯・点の描き方 ----
  class Plot {
    constructor(options) {
      Object.assign(this, { xr: [0, 1], yr: [0, 1], logx: false }, options);
    }
    sx(v) {
      const [a, b] = this.xr;
      const k = this.logx ? Math.log(v / a) / Math.log(b / a) : (v - a) / (b - a);
      return this.x + k * this.w;
    }
    sy(v) {
      const [c, d] = this.yr;
      return this.y + this.h - ((v - c) / (d - c)) * this.h;
    }
    clip(ctx) {
      ctx.beginPath();
      ctx.rect(this.x, this.y - 2, this.w, this.h + 4);
      ctx.clip();
    }
    axes(ctx, { xticks = [], yticks = [], xlabel, ylabel, alpha = 1, fmtX = (v) => fmt(v, 0), fmtY = (v) => fmt(v, 0), zero = true } = {}) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.grid;
      for (const v of yticks) {
        const y = Math.round(this.sy(v)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x, y);
        ctx.lineTo(this.x + this.w, y);
        ctx.stroke();
      }
      if (zero && this.yr[0] < 0 && this.yr[1] > 0) {
        ctx.strokeStyle = '#4a4a46';
        const y = Math.round(this.sy(0)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x, y);
        ctx.lineTo(this.x + this.w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + this.h);
      ctx.lineTo(this.x + this.w, this.y + this.h);
      ctx.stroke();
      for (const v of xticks) {
        const x = this.sx(v);
        ctx.beginPath();
        ctx.moveTo(x, this.y + this.h);
        ctx.lineTo(x, this.y + this.h + 6);
        ctx.stroke();
        canvasText(ctx, fmtX(v), x, this.y + this.h + 26, { size: 16, color: C.muted, align: 'center' });
      }
      for (const v of yticks) {
        canvasText(ctx, fmtY(v), this.x - 10, this.sy(v) + 5, { size: 16, color: C.muted, align: 'right' });
      }
      if (xlabel) canvasText(ctx, xlabel, this.x + this.w, this.y + this.h + 50, { size: 18, color: C.text2, align: 'right' });
      if (ylabel) canvasText(ctx, ylabel, this.x, this.y - 14, { size: 18, color: C.text2 });
      ctx.restore();
    }
    // upto: 左から何割まで描くか（線が引かれていく演出）
    line(ctx, xs, ys, { color = C.text, width = 3, alpha = 1, dash = null, upto = 1 } = {}) {
      const count = Math.max(0, Math.round((xs.length - 1) * clamp(upto)) + 1);
      if (count < 2 || alpha <= 0) return;
      ctx.save();
      this.clip(ctx);
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const px = this.sx(xs[i]);
        const py = this.sy(ys[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
    band(ctx, xs, lower, upper, { color = C.blue, alpha = 0.22, upto = 1 } = {}) {
      const count = Math.max(0, Math.round((xs.length - 1) * clamp(upto)) + 1);
      if (count < 2 || alpha <= 0) return;
      ctx.save();
      this.clip(ctx);
      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath();
      for (let i = 0; i < count; i++) ctx.lineTo(this.sx(xs[i]), this.sy(upper[i]));
      for (let i = count - 1; i >= 0; i--) ctx.lineTo(this.sx(xs[i]), this.sy(lower[i]));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    dots(ctx, xs, ys, { color = C.text, r = 6, alpha = 1, ring = C.bg } = {}) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      for (let i = 0; i < xs.length; i++) {
        ctx.beginPath();
        ctx.arc(this.sx(xs[i]), this.sy(ys[i]), r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (ring) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = ring;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    vline(ctx, xv, { color = C.muted, width = 1.5, dash = [6, 6], alpha = 1, from, to } = {}) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(this.sx(xv), from === undefined ? this.y : this.sy(from));
      ctx.lineTo(this.sx(xv), to === undefined ? this.y + this.h : this.sy(to));
      ctx.stroke();
      ctx.restore();
    }
    hline(ctx, yv, { color = C.muted, width = 1.5, dash = [6, 6], alpha = 1 } = {}) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(this.x, this.sy(yv));
      ctx.lineTo(this.x + this.w, this.sy(yv));
      ctx.stroke();
      ctx.restore();
    }
    // x の範囲を薄く塗る（データのある区間・外挿の区間など）
    shade(ctx, xa, xb, { color = C.text, alpha = 0.05 } = {}) {
      ctx.save();
      ctx.fillStyle = rgba(color, alpha);
      const a = this.sx(Math.max(xa, this.xr[0]));
      const b = this.sx(Math.min(xb, this.xr[1]));
      ctx.fillRect(a, this.y, b - a, this.h);
      ctx.restore();
    }
    label(ctx, text, xv, yv, options = {}) {
      canvasText(ctx, text, this.sx(xv) + (options.dx || 0), this.sy(yv) + (options.dy || 0), options);
    }
  }

  // 凡例（線の見本＋文字）。文字の色は系列の色にしない
  function legend(ctx, items, x, y, { gap = 34, alpha = 1, size = 17 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `500 ${size}px ${FONT}`;
    let cx = x;
    for (const item of items) {
      if (item.kind === 'band') {
        ctx.fillStyle = rgba(item.color, 0.35);
        ctx.fillRect(cx, y - 9, 26, 14);
      } else if (item.kind === 'dot') {
        ctx.beginPath();
        ctx.arc(cx + 13, y - 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 3;
        ctx.setLineDash(item.dash || []);
        ctx.beginPath();
        ctx.moveTo(cx, y - 2);
        ctx.lineTo(cx + 26, y - 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = C.text2;
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, cx + 34, y - 2);
      cx += 34 + ctx.measureText(item.label).width + gap;
    }
    ctx.restore();
  }

  // 色の目盛り（ヒートマップの横に置く）
  function colorBar(ctx, x, y, w, h, colorAt, { min, max, ticks = [], digits = 1, label } = {}) {
    for (let i = 0; i < h; i++) {
      const v = max - ((max - min) * i) / (h - 1);
      const [r, g, b] = colorAt(v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y + i, w, 1.5);
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    for (const v of ticks) {
      const ty = y + ((max - v) / (max - min)) * h;
      canvasText(ctx, fmt(v, digits), x + w + 8, ty + 5, { size: 15, color: C.muted });
    }
    if (label) canvasText(ctx, label, x, y - 12, { size: 16, color: C.text2 });
  }

  return {
    W, H, C, SERIES, FONT, CHAPTERS,
    clamp, ramp, lerp, easeOut, easeInOut, keyframes,
    rgba, hexToRgb, seqColor, divColor, heatmapCanvas, drawImage, drawMatrixHeat,
    fmt, texNum, texFactor, canvasText, roundRect, Plot, legend, colorBar,
  };
})();
