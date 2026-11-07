// opt-draw.js — 等高線の背景、最適化の経路、行列の楕円、ベクトルの棒の絵。絵は引数だけで決まる。
(() => {
  const { C, rgba, canvasText, clamp, seqColor, heatmapCanvas, drawImage } = KIT;

  // 色の役割（場面をまたいで同じにする）
  const COLOR = { descent: C.red, newton: C.yellow, bfgs: C.violet, lbfgs: C.aqua, truth: C.text };

  class Field {
    // box: 画面の四角、xr・yr: 関数の範囲、f: 関数、levels: 1桁あたりの等高線の本数
    constructor({ box, xr, yr, f, levels = 2, floor = 1e-3, pixels = 300 }) {
      Object.assign(this, { box, xr, yr });
      const rows = Math.round((pixels * box.h) / box.w);
      const values = new Float64Array(rows * pixels);
      for (let i = 0; i < rows; i++) {
        const y = yr[1] - ((yr[1] - yr[0]) * (i + 0.5)) / rows;
        for (let j = 0; j < pixels; j++) values[i * pixels + j] = Math.log10(f([xr[0] + ((xr[1] - xr[0]) * (j + 0.5)) / pixels, y]) + floor);
      }
      let low = Infinity;
      let high = -Infinity;
      for (const v of values) {
        low = Math.min(low, v);
        high = Math.max(high, v);
      }
      const band = (v) => Math.floor(v * levels);
      this.image = heatmapCanvas(rows, pixels, (i, j) => {
        const v = values[i * pixels + j];
        const edge = (j + 1 < pixels && band(values[i * pixels + j + 1]) !== band(v)) || (i + 1 < rows && band(values[(i + 1) * pixels + j]) !== band(v));
        const base = seqColor(0.04 + 0.36 * ((v - low) / (high - low)));
        return edge ? base.map((c) => c + (255 - c) * 0.32) : base;
      });
    }
    sx(v) {
      return this.box.x + ((v - this.xr[0]) / (this.xr[1] - this.xr[0])) * this.box.w;
    }
    sy(v) {
      return this.box.y + this.box.h - ((v - this.yr[0]) / (this.yr[1] - this.yr[0])) * this.box.h;
    }
    draw(ctx, alpha = 1) {
      const { x, y, w, h } = this.box;
      drawImage(ctx, this.image, x, y, w, h, { smooth: true, alpha });
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
      ctx.restore();
    }
    clip(ctx) {
      const { x, y, w, h } = this.box;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
    }
    // upto: 0〜1。経路のどこまで描くか（途中の線分は補間する）
    path(ctx, points, { color = C.text, width = 2.5, upto = 1, alpha = 1, dots = true, dotRadius = 3.2 } = {}) {
      if (alpha <= 0 || upto <= 0) return;
      const last = (points.length - 1) * clamp(upto);
      const count = Math.floor(last);
      ctx.save();
      this.clip(ctx);
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.sx(points[0][0]), this.sy(points[0][1]));
      for (let i = 1; i <= count; i++) ctx.lineTo(this.sx(points[i][0]), this.sy(points[i][1]));
      const frac = last - count;
      let tip = points[count];
      if (frac > 0) {
        const next = points[count + 1];
        tip = [tip[0] + (next[0] - tip[0]) * frac, tip[1] + (next[1] - tip[1]) * frac];
        ctx.lineTo(this.sx(tip[0]), this.sy(tip[1]));
      }
      ctx.stroke();
      if (dots) {
        ctx.fillStyle = color;
        for (let i = 0; i <= count; i++) {
          ctx.beginPath();
          ctx.arc(this.sx(points[i][0]), this.sy(points[i][1]), dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.beginPath();
      ctx.arc(this.sx(tip[0]), this.sy(tip[1]), dotRadius + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = C.text;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    }
    // ×印
    mark(ctx, p, { color = C.text, alpha = 1, arm = 8 } = {}) {
      const [x, y] = [this.sx(p[0]), this.sy(p[1])];
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - arm, y - arm);
      ctx.lineTo(x + arm, y + arm);
      ctx.moveTo(x + arm, y - arm);
      ctx.lineTo(x - arm, y + arm);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2×2 の対称行列 M を、単位円の像の楕円として描く（cx, cy は中心、pixels は長さ1の画素数）
  function drawMatrixEllipse(ctx, M, cx, cy, pixels, { color = C.text, width = 3, dash = null, alpha = 1 } = {}) {
    const [[a, b], [, d]] = M;
    const mean = (a + d) / 2;
    const diff = Math.hypot((a - d) / 2, b);
    const l1 = mean + diff;
    const l2 = Math.max(1e-9, mean - diff);
    const theta = 0.5 * Math.atan2(2 * b, a - d);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.sqrt(l1) * pixels, Math.sqrt(l2) * pixels, -theta, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ベクトルの棒（正は上、負は下）
  function vectorBars(ctx, box, values, { max, color = C.aqua, alpha = 1, dots = null, dotColor = C.text } = {}) {
    const n = values.length;
    const gap = box.w / n;
    const mid = box.y + box.h / 2;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(box.x, mid);
    ctx.lineTo(box.x + box.w, mid);
    ctx.stroke();
    values.forEach((v, i) => {
      const h = (clamp(v / max, -1, 1) * box.h) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(box.x + gap * (i + 0.18), mid - Math.max(h, 0), gap * 0.64, Math.abs(h));
      if (dots) {
        const dy = mid - (clamp(dots[i] / max, -1, 1) * box.h) / 2;
        ctx.beginPath();
        ctx.arc(box.x + gap * (i + 0.5), dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.bg;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  window.OPTDRAW = { COLOR, Field, drawMatrixEllipse, vectorBars };
})();
