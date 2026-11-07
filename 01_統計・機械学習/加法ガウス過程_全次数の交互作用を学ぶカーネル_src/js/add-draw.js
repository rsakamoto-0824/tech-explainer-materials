// add-draw.js — 場面のファイルで共通に使う絵（交互作用の格子、次数の棒グラフ、ヒートマップの枠、3次元の等値面）。
// 絵は引数だけで決まる（乱数・実時間は使わない）。
(() => {
  const { C, rgba, canvasText, clamp, divColor, heatmapCanvas, drawImage, ramp, roundRect } = KIT;

  // ---- 色の役割（場面をまたいで同じにする）----
  const COLOR = {
    additive: C.orange, // 加法ガウス過程
    se: C.blue, // SE カーネルのガウス過程
    gam: C.aqua, // GAM（1次だけ）
    truth: C.text,
    data: C.text,
    slice: C.yellow,
  };

  // ---- 交互作用の格子: 変数の部分集合を、次数ごとの段に並べる ----
  function subsetsByOrder(D) {
    const rows = Array.from({ length: D }, () => []);
    for (let mask = 1; mask < 1 << D; mask++) {
      const members = [];
      for (let i = 0; i < D; i++) if (mask & (1 << i)) members.push(i + 1);
      rows[members.length - 1].push({ mask, label: members.join('') });
    }
    return rows;
  }
  function latticeLayout(D, box) {
    const rows = subsetsByOrder(D);
    const rowGap = box.h / Math.max(1, D - 1);
    const nodes = [];
    rows.forEach((row, r) => {
      const y = box.y + box.h - r * rowGap;
      const gap = box.w / (Math.max(...rows.map((c) => c.length)) + 0.5);
      row.forEach((node, i) => nodes.push({ ...node, order: r + 1, x: box.x + box.w / 2 + (i - (row.length - 1) / 2) * gap, y }));
    });
    const edges = [];
    nodes.forEach((a) => {
      nodes.forEach((b) => {
        if (b.order === a.order + 1 && (a.mask & b.mask) === a.mask) edges.push([a, b]);
      });
    });
    return { nodes, edges };
  }
  // weights[次数 − 1] = 0〜1 の明るさ。radius は丸の半径。color は明るい丸の色
  function drawLattice(ctx, layout, weights, { radius = 22, fontSize = 15, alpha = 1, color = COLOR.additive, edgeAlpha = 0.5, labels = true } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = 1.2;
    for (const [a, b] of layout.edges) {
      const k = Math.min(weights[a.order - 1], weights[b.order - 1]);
      ctx.strokeStyle = rgba(C.text2, edgeAlpha * (0.25 + 0.75 * k));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const node of layout.nodes) {
      const k = clamp(weights[node.order - 1]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.fillStyle = rgba(color, 0.12 + 0.88 * k);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = k > 0.05 ? rgba(C.text, 0.4 + 0.6 * k) : C.axis;
      ctx.stroke();
      if (labels) canvasText(ctx, node.label, node.x, node.y + fontSize * 0.36, { size: fontSize, color: k > 0.45 ? C.text : C.muted, align: 'center', weight: 700 });
    }
    ctx.restore();
  }

  // ---- 次数ごとの棒: shares[次数 − 1] = 0〜1 ----
  function orderBars(ctx, box, shares, { color = COLOR.additive, alpha = 1, labelSize = 15, valueSize = 15, showValues = true, highlight = null, unit = '%' } = {}) {
    const count = shares.length;
    const gap = box.w / count;
    const barW = gap * 0.68;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.h);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.stroke();
    shares.forEach((value, i) => {
      const x = box.x + gap * (i + 0.5) - barW / 2;
      const h = Math.max(0, value) * box.h;
      ctx.fillStyle = highlight === i + 1 ? color : rgba(color, 0.75);
      ctx.fillRect(x, box.y + box.h - h, barW, h);
      canvasText(ctx, String(i + 1), x + barW / 2, box.y + box.h + labelSize + 6, { size: labelSize, color: C.muted, align: 'center' });
      if (showValues && value >= 0.005) {
        const text = `${(value * 100).toFixed(value >= 0.0995 ? 0 : 1)}${unit}`;
        canvasText(ctx, text, x + barW / 2, box.y + box.h - h - 7, { size: valueSize, color: C.text2, align: 'center' });
      }
    });
    ctx.restore();
  }

  // ---- ヒートマップ: values は行ごとに並んだ n×n の配列（行 0 が x₂ の最小）----
  // 値 ÷ scale を −1〜1 の色に写す
  function divergingImage(values, n, scale) {
    return heatmapCanvas(n, n, (i, j) => divColor(clamp(values[(n - 1 - i) * n + j] / scale, -1, 1)));
  }
  function heatPanel(ctx, image, box, { alpha = 1, frame = true } = {}) {
    drawImage(ctx, image, box.x, box.y, box.w, box.h, { smooth: true, alpha });
    if (frame) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x - 0.5, box.y - 0.5, box.w + 1, box.h + 1);
      ctx.restore();
    }
  }

  // ---- 3次元の等値面: field(x, y, z) ≥ threshold の範囲を、箱で切って描く（平行投影のレイトレース） ----
  const LIGHT = (() => {
    const v = [0.45, -0.35, 0.82];
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  })();
  const STEP = 0.14; // 光線を進める幅
  const BISECTIONS = 5;
  const GRADIENT_STEP = 0.03;
  const AMBIENT = 0.34;
  const SPECULAR = 0.25;

  function renderIso(target, field, threshold, { size, box, azimuth, elevation, color, cutColor, zoom = 1 }) {
    target.width = size;
    target.height = size;
    const context = target.getContext('2d');
    const image = context.createImageData(size, size);
    const ca = Math.cos(azimuth);
    const sa = Math.sin(azimuth);
    const ce = Math.cos(elevation);
    const se = Math.sin(elevation);
    // 画面の右・上・手前の向き（世界座標）
    const right = [ca, sa, 0];
    const up = [-sa * se, ca * se, ce];
    const back = [sa * ce, -ca * ce, se];
    const halfWidth = (box * Math.SQRT2 * 1.2) / zoom;
    const scale = (2 * halfWidth) / size;
    const direction = back.map((v) => -v);
    const [r0, g0, b0] = color;
    const [r1, g1, b1] = cutColor;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const u = (px + 0.5) * scale - halfWidth;
        const v = halfWidth - (py + 0.5) * scale;
        const ox = right[0] * u + up[0] * v + back[0] * box * 3;
        const oy = right[1] * u + up[1] * v + back[1] * box * 3;
        const oz = right[2] * u + up[2] * v + back[2] * box * 3;
        // 箱に入る・出る位置
        let near = -Infinity;
        let far = Infinity;
        let enterAxis = -1;
        const origin = [ox, oy, oz];
        for (let a = 0; a < 3; a++) {
          const d = direction[a];
          if (Math.abs(d) < 1e-9) {
            if (Math.abs(origin[a]) > box) far = -Infinity;
            continue;
          }
          const t0 = (-box - origin[a]) / d;
          const t1 = (box - origin[a]) / d;
          const lo = Math.min(t0, t1);
          const hi = Math.max(t0, t1);
          if (lo > near) {
            near = lo;
            enterAxis = a;
          }
          if (hi < far) far = hi;
        }
        if (near >= far) continue;
        const at = (t) => field(ox + direction[0] * t, oy + direction[1] * t, oz + direction[2] * t);
        let shade;
        let hitColor;
        if (at(near) >= threshold) {
          // 箱の面で切れた断面（平らな色）
          const normal = [0, 0, 0];
          normal[enterAxis] = -Math.sign(direction[enterAxis]);
          shade = AMBIENT + (1 - AMBIENT) * Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]);
          hitColor = [r1, g1, b1];
        } else {
          let t = near + STEP;
          let hit = false;
          for (; t < far; t += STEP) {
            if (at(t) >= threshold) {
              hit = true;
              break;
            }
          }
          if (!hit) continue;
          let lo = t - STEP;
          let hi = t;
          for (let i = 0; i < BISECTIONS; i++) {
            const mid = (lo + hi) / 2;
            if (at(mid) >= threshold) hi = mid;
            else lo = mid;
          }
          const x = ox + direction[0] * hi;
          const y = oy + direction[1] * hi;
          const z = oz + direction[2] * hi;
          const h = GRADIENT_STEP;
          let nx = field(x - h, y, z) - field(x + h, y, z);
          let ny = field(x, y - h, z) - field(x, y + h, z);
          let nz = field(x, y, z - h) - field(x, y, z + h);
          const length = Math.hypot(nx, ny, nz) || 1;
          nx /= length;
          ny /= length;
          nz /= length;
          const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          // 視線の向きと光の向きの中間で、つやを足す
          const hx = LIGHT[0] + back[0];
          const hy = LIGHT[1] + back[1];
          const hz = LIGHT[2] + back[2];
          const hl = Math.hypot(hx, hy, hz);
          const gloss = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 24;
          shade = AMBIENT + (1 - AMBIENT) * diffuse + SPECULAR * gloss;
          hitColor = [r0, g0, b0];
        }
        const p = (py * size + px) * 4;
        image.data[p] = Math.min(255, hitColor[0] * shade);
        image.data[p + 1] = Math.min(255, hitColor[1] * shade);
        image.data[p + 2] = Math.min(255, hitColor[2] * shade);
        image.data[p + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return target;
  }
  // 箱の12本の辺を描く
  function drawBoxEdges(ctx, centerX, centerY, pixelsPerUnit, box, azimuth, elevation, alpha = 0.45) {
    const ca = Math.cos(azimuth);
    const sa = Math.sin(azimuth);
    const ce = Math.cos(elevation);
    const se = Math.sin(elevation);
    const project = ([x, y, z]) => [centerX + pixelsPerUnit * (x * ca + y * sa), centerY - pixelsPerUnit * (-x * sa * se + y * ca * se + z * ce)];
    const corners = [];
    for (const x of [-box, box]) for (const y of [-box, box]) for (const z of [-box, box]) corners.push([x, y, z]);
    ctx.save();
    ctx.strokeStyle = rgba(C.text2, alpha);
    ctx.lineWidth = 1;
    corners.forEach((a, i) => {
      corners.forEach((b, j) => {
        if (j > i && [0, 1, 2].filter((k) => a[k] !== b[k]).length === 1) {
          const [p, q] = [project(a), project(b)];
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
          ctx.stroke();
        }
      });
    });
    ctx.restore();
  }

  window.ADDDRAW = { COLOR, subsetsByOrder, latticeLayout, drawLattice, orderBars, divergingImage, heatPanel, renderIso, drawBoxEdges };
})();
