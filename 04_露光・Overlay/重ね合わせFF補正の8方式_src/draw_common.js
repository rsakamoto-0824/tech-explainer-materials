// 3つの版で共通の描画部品：線（矢印）と、計測範囲のミニ図（Wafer）
// 色や文字の描き方は版ごとに違うので、作るときに受け取る。

// 始点と終点を結ぶ線（正の長さの水平線を回転させて描く。負の幅・高さは PowerPoint で壊れるため）
function createLineDrawer(pres, defaultColor) {
  return function addLine(slide, x1, y1, x2, y2, { color = defaultColor, width = 1, dash = null, arrow = true } = {}) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    slide.addShape(pres.shapes.LINE, {
      x: cx - length / 2, y: cy, w: length, h: 0,
      ...(angle > 1e-6 ? { rotate: angle } : {}),
      line: { color, width, ...(dash ? { dashType: dash } : {}), ...(arrow ? { endArrowType: 'triangle' } : {}) },
    });
  };
}

// ---- 計測範囲のミニ図 ----
// icon: few=少数点 / many=多点 / manyEst=多点＋推定 / all=全Shot / partEst=一部＋推定 / shape=形状の全面計測 / cvd=裏面成膜 / nzo=形状＋NZO
const BASE_ICON_D = 0.56;
const BASE_SHOT_W = 0.062;
const BASE_SHOT_H = 0.078;

// Wafer円の中に入るShotの一覧（四隅が円の内側にあるもの）。直径ごとに計算する
function shotCells(d) {
  const scale = d / BASE_ICON_D;
  const shotW = BASE_SHOT_W * scale;
  const shotH = BASE_SHOT_H * scale;
  const r = d / 2 - 0.012 * scale;
  const cells = [];
  for (let i = -5; i < 5; i += 1) {
    for (let j = -4; j < 4; j += 1) {
      const x0 = i * shotW;
      const y0 = j * shotH;
      const corners = [[x0, y0], [x0 + shotW, y0], [x0, y0 + shotH], [x0 + shotW, y0 + shotH]];
      if (corners.every(([cx, cy]) => Math.hypot(cx, cy) <= r)) cells.push({ i, j, x0, y0 });
    }
  }
  // 少数点のアライメントで計測するShot（中心から見て8方向）
  const few = new Set();
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((deg) => {
    const a = (deg * Math.PI) / 180;
    const tx = Math.cos(a) * 0.17 * scale;
    const ty = Math.sin(a) * 0.17 * scale;
    let best = null;
    cells.forEach((c, k) => {
      const dist = Math.hypot(c.x0 + shotW / 2 - tx, c.y0 + shotH / 2 - ty);
      if (!best || dist < best.dist) best = { k, dist };
    });
    few.add(best.k);
  });
  return { cells, few, shotW, shotH };
}

function cellState(kind, cell, k, few) {
  const checker = (cell.i + cell.j + 100) % 2 === 0;
  const third = (cell.i + 2 * cell.j + 300) % 3 === 0;
  switch (kind) {
    case 'few': return few.has(k) ? 'measured' : 'blank';
    case 'many': return checker ? 'measured' : 'blank';
    case 'manyEst': return checker ? 'measured' : 'estimated';
    case 'all': return 'measured';
    case 'partEst': return third ? 'measured' : 'estimated';
    default: return 'blank';
  }
}

// colors: white, waferLine, cellLine, measured, estimated, shape（4段の色）, ink, film, badge
function createWaferIcons({ pres, addText, addRect, addRoundRect, addLine, colors }) {
  function drawShotIcon(slide, kind, cx, cy, d) {
    slide.addShape(pres.shapes.OVAL, {
      x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: colors.white }, line: { color: colors.waferLine, width: 0.75 },
    });
    const { cells, few, shotW, shotH } = shotCells(d);
    const fills = { measured: colors.measured, estimated: colors.estimated, blank: colors.white };
    cells.forEach((cell, k) => {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: cx + cell.x0, y: cy + cell.y0, w: shotW, h: shotH,
        fill: { color: fills[cellState(kind, cell, k, few)] }, line: { color: colors.cellLine, width: 0.25 },
      });
    });
  }

  // 形状の全面計測（等高線のような同心円）
  function drawShapeIcon(slide, cx, cy, d) {
    [1.0, 0.74, 0.48, 0.22].forEach((s, k) => {
      const color = colors.shape[k];
      const size = d * s;
      const shift = k ? 0.035 * d * s : 0;
      slide.addShape(pres.shapes.OVAL, {
        x: cx - size / 2 + shift, y: cy - size / 2 - shift, w: size, h: size,
        fill: { color }, line: k ? { color, width: 0 } : { color: colors.waferLine, width: 0.75 },
      });
    });
  }

  // 裏面成膜：反ったWafer → 裏面膜で平らにする（横から見た図）
  function drawCvdIcon(slide, cx, cy, d) {
    const s = d / BASE_ICON_D;
    const w = 0.52 * s;
    const x0 = cx - w / 2;
    const bowTop = cy - 0.25 * s;
    const bowDepth = 0.07 * s;
    const points = [];
    for (let k = 0; k <= 12; k += 1) {
      const t = k / 12;
      points.push({ x: t * w, y: bowDepth * (1 - (2 * t - 1) ** 2) });
    }
    slide.addShape(pres.shapes.CUSTOM_GEOMETRY, {
      x: x0, y: bowTop, w, h: bowDepth + 0.01, points, line: { color: colors.ink, width: 1.75 },
    });
    addLine(slide, cx, cy - 0.105 * s, cx, cy - 0.015 * s, { width: 0.75 });
    addRect(slide, x0, cy + 0.07 * s, w, 0.03 * s, colors.ink);
    addRect(slide, x0, cy + 0.105 * s, w, 0.045 * s, colors.film);
    addText(slide, '裏面膜', x0 - 0.05, cy + 0.155 * s, w + 0.1, 0.12 * s, { fontSize: 6.5 * Math.min(s, 1.3), color: colors.film, align: 'center', bold: true, valign: 'middle' });
  }

  function drawNzoIcon(slide, cx, cy, d) {
    drawShapeIcon(slide, cx, cy, d);
    const s = d / BASE_ICON_D;
    addRoundRect(slide, cx - 0.2 * s, cy + 0.13 * s, 0.4 * s, 0.15 * s, colors.badge, colors.white, { radius: 0.04 });
    addText(slide, 'NZO', cx - 0.2 * s, cy + 0.13 * s, 0.4 * s, 0.15 * s, { fontSize: 7 * Math.min(s, 1.3), bold: true, color: colors.white, align: 'center', valign: 'middle' });
  }

  return function drawIcon(slide, kind, cx, cy, d = BASE_ICON_D) {
    if (kind === 'shape') drawShapeIcon(slide, cx, cy, d);
    else if (kind === 'cvd') drawCvdIcon(slide, cx, cy, d);
    else if (kind === 'nzo') drawNzoIcon(slide, cx, cy, d);
    else drawShotIcon(slide, kind, cx, cy, d);
  };
}

module.exports = { createLineDrawer, createWaferIcons, shotCells, cellState, BASE_ICON_D };
