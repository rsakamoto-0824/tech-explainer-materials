// ssm-draw.js — 場面のファイルで共通に使う、色の役割と描き方（帯、正規分布の山、矢印、添え字つきの記号、台車）。
window.SDRAW = (() => {
  const { C, rgba, canvasText, clamp } = KIT;

  // 色の役割（3本の動画を通して同じにする）
  const COLOR = {
    truth: C.text2, // 本当の状態（見えないもの）
    obs: C.orange, // 観測
    filter: C.blue, // カルマンフィルターの推定
    predict: C.violet, // 予測
    smooth: C.aqua, // 平滑化
    other: '#b9b2a3',
  };
  const MATH_FONT = "'Times New Roman', 'Hiragino Mincho ProN', serif";

  // 平均 ± k×標準偏差 の帯と、平均の線
  function drawBand(ctx, P, ts, means, variances, { color = COLOR.filter, alpha = 1, bandAlpha = 0.2, width = 3.5, upto = 1, k = 2, from = 0, to = ts.length } = {}) {
    if (alpha <= 0) return;
    const xs = ts.slice(from, to);
    const m = means.slice(from, to);
    const sd = variances.slice(from, to).map(Math.sqrt);
    P.band(ctx, xs, m.map((v, i) => v - k * sd[i]), m.map((v, i) => v + k * sd[i]), { color, alpha: bandAlpha * alpha, upto });
    if (width > 0) P.line(ctx, xs, m, { color, width, alpha, upto });
  }

  // 正規分布の山（Plot の x の範囲いっぱいに描く）。fill で中を薄く塗る
  function drawBell(ctx, P, mean, variance, { color = C.blue, alpha = 1, width = 3.5, fill = 0.14, dash = null, scale = 1 } = {}) {
    if (alpha <= 0) return;
    const count = 240;
    const xs = Array.from({ length: count }, (_, i) => P.xr[0] + ((P.xr[1] - P.xr[0]) * i) / (count - 1));
    const ys = xs.map((x) => (scale * Math.exp(-((x - mean) ** 2) / (2 * variance))) / Math.sqrt(2 * Math.PI * variance));
    if (fill > 0) P.band(ctx, xs, xs.map(() => 0), ys, { color, alpha: fill * alpha });
    P.line(ctx, xs, ys, { color, width, alpha, dash });
  }

  // 矢印（直線）。head は矢じりの長さ
  function arrow(ctx, x1, y1, x2, y2, { color = C.text2, width = 2.5, alpha = 1, head = 12, dash = null, upto = 1 } = {}) {
    if (alpha <= 0 || upto <= 0) return;
    const k = clamp(upto);
    const ex = x1 + (x2 - x1) * k;
    const ey = y1 + (y2 - y1) * k;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(ex - Math.cos(angle) * head * 0.6, ey - Math.sin(angle) * head * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - head * Math.cos(angle - 0.42), ey - head * Math.sin(angle - 0.42));
    ctx.lineTo(ex - head * Math.cos(angle + 0.42), ey - head * Math.sin(angle + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 添え字つきの記号（x と t−1 など）を、数式らしい斜体で描く。中心が (x, y)
  function mathLabel(ctx, base, sub, x, y, { size = 30, color = C.text, alpha = 1, hat = false } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${size}px ${MATH_FONT}`;
    const baseWidth = ctx.measureText(base).width;
    ctx.font = `italic ${Math.round(size * 0.62)}px ${MATH_FONT}`;
    const subWidth = sub ? ctx.measureText(sub).width : 0;
    const left = x - (baseWidth + subWidth) / 2;
    ctx.font = `italic ${size}px ${MATH_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(base, left, y);
    if (hat) {
      ctx.font = `${Math.round(size * 0.8)}px ${MATH_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('^', left + baseWidth / 2, y - size * 0.52);
      ctx.textAlign = 'left';
    }
    if (sub) {
      ctx.font = `italic ${Math.round(size * 0.62)}px ${MATH_FONT}`;
      ctx.fillText(sub, left + baseWidth + 1, y + size * 0.3);
    }
    ctx.restore();
  }

  // 丸（状態）や四角（観測）の札。中に添え字つきの記号を書く
  function nodeShape(ctx, x, y, { r = 38, shape = 'circle', color = C.blue, alpha = 1, fill = 0.12, dash = null, width = 3 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2);
    else ctx.roundRect(x - r, y - r, r * 2, r * 2, 10);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.fillStyle = rgba(color, fill);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }

  // 角の丸い箱と、その中の文字（流れ図に使う）
  function box(ctx, x, y, w, h, text, { color = C.blue, alpha = 1, fill = 0.1, size = 22, weight = 700, textColor = C.text, sub = null, glow = 0 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.fillStyle = rgba(color, fill + 0.16 * glow);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 + 2 * glow;
    ctx.stroke();
    ctx.restore();
    canvasText(ctx, text, x + w / 2, y + h / 2 - (sub ? 13 : 0), { size, weight, color: textColor, align: 'center', baseline: 'middle', alpha });
    if (sub) canvasText(ctx, sub, x + w / 2, y + h / 2 + 18, { size: size - 5, color: C.text2, align: 'center', baseline: 'middle', alpha });
  }

  // 台車（箱と車輪）。(x, y) は車体の中央の下（レールの高さ）
  function cart(ctx, x, y, { alpha = 1, color = C.blue, scale = 1 } = {}) {
    if (alpha <= 0) return;
    const w = 86 * scale;
    const h = 40 * scale;
    const wheel = 11 * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = rgba(color, 0.2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h - wheel * 1.4, w, h, 8);
    ctx.fill();
    ctx.stroke();
    for (const dx of [-w * 0.28, w * 0.28]) {
      ctx.beginPath();
      ctx.arc(x + dx, y - wheel, wheel, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 図の左上に小さな見出しを書く
  const panelTitle = (ctx, P, text, alpha = 1, options = {}) => canvasText(ctx, text, P.x, P.y - 14, { size: 20, color: C.text, weight: 700, alpha, ...options });

  // 2次元の正規分布の楕円（中心 center、共分散 cov、k シグマ）
  function drawEllipse(ctx, P, center, cov, { k = 2, color = C.blue, width = 3, alpha = 1, fill = 0.1, dash = null } = {}) {
    if (alpha <= 0) return;
    const l11 = Math.sqrt(cov[0][0]);
    const l21 = cov[0][1] / l11;
    const l22 = Math.sqrt(Math.max(0, cov[1][1] - l21 * l21));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const angle = (2 * Math.PI * i) / 120;
      const ux = k * Math.cos(angle);
      const uy = k * Math.sin(angle);
      const px = P.sx(center[0] + l11 * ux);
      const py = P.sy(center[1] + l21 * ux + l22 * uy);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    if (fill > 0) {
      ctx.fillStyle = rgba(color, fill);
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }

  return { COLOR, MATH_FONT, drawBand, drawBell, arrow, mathLabel, nodeShape, box, cart, panelTitle, drawEllipse };
})();
