// check-layout.mjs — 全場面の文字のはみ出しを調べる（表のセルあふれ、カードからのはみ出し、文字とカードの重なり、画面の右端）。
//   node tools/check-layout.mjs [ページ=gpr-basics.html]
// 各場面の最後の字幕の時刻で、すべての部品が出た状態を測る。見つからなければ「はみ出しなし」と表示する。
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = process.argv[2] || 'gpr-basics.html';
const SCREEN_RIGHT = 1545; // これより右に文字が出たら知らせる（論理 1600 幅）
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(data)));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`http://127.0.0.1:${server.address().port}/${PAGE}?render`);
await page.waitForFunction(() => window.ARCH && ARCH.ready === true, null, { timeout: 180000 });
const found = await page.evaluate((screenRight) => {
  const out = [];
  const stage = document.getElementById('stage').getBoundingClientRect();
  const k = stage.width / 1600;
  const box = (r) => ({ l: (r.left - stage.left) / k, r: (r.right - stage.left) / k, t: (r.top - stage.top) / k, b: (r.bottom - stage.top) / k });
  ARCH.phases.forEach((ph, idx) => {
    ARCH.render(ph.t1 - 0.6); // 場面の終わり近く（全部の部品が出ている）
    const scene = document.querySelectorAll('.scene')[idx];
    const cards = [...scene.querySelectorAll('.card')].map((c) => box(c.getBoundingClientRect()));
    scene.querySelectorAll('.tcell').forEach((td) => {
      if (td.scrollWidth > td.clientWidth + 1) out.push(`${ph.id} 表のセルあふれ: ${td.textContent.slice(0, 24)} (${td.scrollWidth} > ${td.clientWidth})`);
    });
    scene.querySelectorAll('.txt, .tex').forEach((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) return;
      const t = box(rect);
      if (t.r > screenRight) out.push(`${ph.id} 画面の右端に近い: ${el.textContent.slice(0, 24)} (right ${t.r.toFixed(0)})`);
      for (const c of cards) {
        const inside = t.l >= c.l - 2 && t.l < c.r && t.t >= c.t - 2 && t.b <= c.b + 2;
        if (inside && t.r > c.r - 8) out.push(`${ph.id} カードからはみ出し: ${el.textContent.slice(0, 24)} (right ${t.r.toFixed(0)} > ${c.r.toFixed(0)})`);
        if (inside && t.b > c.b - 6) out.push(`${ph.id} カードの下にはみ出し: ${el.textContent.slice(0, 24)} (bottom ${t.b.toFixed(0)} > ${c.b.toFixed(0)})`);
        if (!inside && t.l < c.l - 8 && t.r > c.l + 2 && t.t < c.b && t.b > c.t) out.push(`${ph.id} 文字がカードに重なる: ${el.textContent.slice(0, 24)}`);
      }
    });
    // 字幕の高さ（3行になると欄からはみ出す）
    document.querySelectorAll('.caption').forEach((cap) => {
      cap.style.display = 'flex';
      const inner = cap.querySelector('.caption-text');
      if (inner && inner.getBoundingClientRect().height / k > 92) out.push(`字幕が3行: ${inner.textContent.slice(0, 30)}`);
      cap.style.display = 'none';
    });
  });
  return [...new Set(out)];
}, SCREEN_RIGHT);
console.log(found.join('\n') || 'はみ出しなし');
await browser.close();
server.close();
