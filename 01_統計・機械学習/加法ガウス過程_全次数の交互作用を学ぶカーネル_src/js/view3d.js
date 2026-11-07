// view3d.js — 2変数の関数 z = f(x, y) を、斜めから見た面として描く（平行投影、奥から順に塗る）。
// データ点は「床から立つピン」として描く。絵は引数だけで決まる（乱数・実時間は使わない）。
window.VIEW3D = (() => {
  const { C, rgba, clamp, colorRamp, canvasText } = KIT;

  // 高さの色: 低い = 青 → 中 = 緑がかった青 → 高い = 金
  const heightRamp = colorRamp([[0, '#2456b8'], [0.5, '#2f9e8f'], [1, '#f2c14e']]);
  // 曲げエネルギーの密度の色: 小さい = 暗い灰 → 大きい = 橙 → 黄
  const energyRamp = colorRamp([[0, '#34342f'], [0.35, '#6b3216'], [0.7, '#d95926'], [1, '#ffd166']]);
  const LIGHT = (() => {
    const v = [-0.45, -0.55, 0.7];
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  })();
  const SHADE_AMBIENT = 0.55;
  const MESH_STROKE = 'rgba(10,10,9,0.28)';

  class View {
    // cx, cy: 原点の画面上の位置。scale: 1 あたりの画素数。azimuth: z 軸まわりの回転、elevation: 見下ろす角度（ラジアン）
    constructor(options) {
      Object.assign(this, { cx: 800, cy: 450, scale: 200, azimuth: -0.6, elevation: 0.6, zScale: 1, zBase: -1 }, options);
    }
    // 世界の座標 → [画面 x, 画面 y, 奥行き（大きいほど遠い）]
    project(x, y, z) {
      const ca = Math.cos(this.azimuth);
      const sa = Math.sin(this.azimuth);
      const x1 = x * ca - y * sa;
      const y1 = x * sa + y * ca;
      const ce = Math.cos(this.elevation);
      const se = Math.sin(this.elevation);
      const zz = z * this.zScale;
      return [this.cx + this.scale * x1, this.cy - this.scale * (y1 * se + zz * ce), y1 * ce - zz * se];
    }
  }

  // 格子の高さを計算する: [xr0, xr1] × [yr0, yr1] を n 等分した (n+1)² 点
  function sampleGrid(f, xr, yr, n) {
    const z = new Float64Array((n + 1) * (n + 1));
    for (let i = 0; i <= n; i++) {
      const y = yr[0] + ((yr[1] - yr[0]) * i) / n;
      for (let j = 0; j <= n; j++) z[i * (n + 1) + j] = f(xr[0] + ((xr[1] - xr[0]) * j) / n, y);
    }
    return { xr, yr, n, z };
  }
  // 2つの格子の高さを k で混ぜる（同じ大きさの格子どうし）
  function blendGrid(a, b, k) {
    const z = Float64Array.from(a.z, (v, i) => v + (b.z[i] - v) * k);
    return { ...a, z };
  }

  // 床（z = zBase の四角と目盛りの線）
  function drawFloor(ctx, view, xr, yr, { alpha = 1, step = 0.5, frame = null } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const corner = (x, y) => view.project(x, y, view.zBase);
    const poly = [corner(xr[0], yr[0]), corner(xr[1], yr[0]), corner(xr[1], yr[1]), corner(xr[0], yr[1])];
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fill();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let v = Math.ceil(xr[0] / step) * step; v <= xr[1] + 1e-9; v += step) {
      const [a, b] = [corner(v, yr[0]), corner(v, yr[1])];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    for (let v = Math.ceil(yr[0] / step) * step; v <= yr[1] + 1e-9; v += step) {
      const [a, b] = [corner(xr[0], v), corner(xr[1], v)];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    // 枠（データのある範囲など）を床に描く
    if (frame) {
      const f = [corner(frame.xr[0], frame.yr[0]), corner(frame.xr[1], frame.yr[0]), corner(frame.xr[1], frame.yr[1]), corner(frame.xr[0], frame.yr[1])];
      ctx.strokeStyle = rgba(C.text, 0.85 * (frame.alpha ?? 1));
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      f.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 面とピンを奥から順に描く
  // grid: sampleGrid の結果。color(z, x, y, i, j) → [r, g, b]（四角ごとの色）
  // pins: [{ x, y, z, head: 色, top: 1（棒の伸び具合 0〜1） }]
  function drawScene(ctx, view, { grid = null, color = null, alpha = 1, pins = [], pinAlpha = 1, mesh = true, headRadius = 8 } = {}) {
    const items = [];
    if (grid && alpha > 0) {
      const { xr, yr, n, z } = grid;
      const dx = (xr[1] - xr[0]) / n;
      const dy = (yr[1] - yr[0]) / n;
      const pts = new Array((n + 1) * (n + 1));
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) pts[i * (n + 1) + j] = view.project(xr[0] + dx * j, yr[0] + dy * i, z[i * (n + 1) + j]);
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const a = i * (n + 1) + j;
          const b = a + 1;
          const c = a + n + 2;
          const d = a + n + 1;
          const zAvg = (z[a] + z[b] + z[c] + z[d]) / 4;
          // 面の向き（法線）で明るさを変える
          const gx = ((z[b] - z[a] + z[c] - z[d]) / (2 * dx)) * view.zScale;
          const gy = ((z[d] - z[a] + z[c] - z[b]) / (2 * dy)) * view.zScale;
          const norm = Math.hypot(gx, gy, 1);
          const lambert = Math.max(0, (-gx * LIGHT[0] - gy * LIGHT[1] + LIGHT[2]) / norm);
          const shade = SHADE_AMBIENT + (1 - SHADE_AMBIENT) * lambert;
          const x = xr[0] + dx * (j + 0.5);
          const y = yr[0] + dy * (i + 0.5);
          const [r, g, bl] = color(zAvg, x, y, i, j);
          items.push({
            depth: (pts[a][2] + pts[b][2] + pts[c][2] + pts[d][2]) / 4,
            quad: [pts[a], pts[b], pts[c], pts[d]],
            fill: `rgb(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(bl * shade)})`,
          });
        }
      }
    }
    pins.forEach((p) => {
      const top = view.project(p.x, p.y, view.zBase + (p.z - view.zBase) * (p.top ?? 1));
      items.push({ depth: top[2] - 1e-3, pin: p, base: view.project(p.x, p.y, view.zBase), top });
    });
    items.sort((u, v) => v.depth - u.depth);
    ctx.save();
    for (const item of items) {
      if (item.quad) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        item.quad.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = item.fill;
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = mesh ? MESH_STROKE : item.fill;
        ctx.stroke();
      } else if (pinAlpha > 0) {
        ctx.globalAlpha = pinAlpha;
        ctx.strokeStyle = rgba(C.text2, 0.9);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(item.base[0], item.base[1]);
        ctx.lineTo(item.top[0], item.top[1]);
        ctx.stroke();
        ctx.fillStyle = rgba(C.text2, 0.5);
        ctx.beginPath();
        ctx.ellipse(item.base[0], item.base[1], 5, 5 * Math.sin(view.elevation) + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ピンの頭は最後に描く（面に半分隠れないように）
    if (pinAlpha > 0) {
      ctx.globalAlpha = pinAlpha;
      items.filter((it) => it.pin).forEach((it) => {
        ctx.beginPath();
        ctx.arc(it.top[0], it.top[1], headRadius, 0, Math.PI * 2);
        ctx.fillStyle = it.pin.head || C.text;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.bg;
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  // 値の範囲 [lo, hi] で高さの色を決める関数
  const heightColor = (lo, hi) => (z) => heightRamp(clamp((z - lo) / (hi - lo)));
  // 色の目盛り（縦）
  function rampBar(ctx, ramp, x, y, w, h, { labels = [], title = '', alpha = 1 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let i = 0; i < h; i++) {
      const [r, g, b] = ramp(1 - i / (h - 1));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y + i, w, 1.5);
    }
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    labels.forEach(([k, text]) => canvasText(ctx, text, x + w + 8, y + (1 - k) * h + 6, { size: 16, color: C.muted }));
    if (title) canvasText(ctx, title, x, y - 12, { size: 17, color: C.text2 });
    ctx.restore();
  }

  return { View, sampleGrid, blendGrid, drawFloor, drawScene, heightRamp, energyRamp, heightColor, rampBar };
})();
