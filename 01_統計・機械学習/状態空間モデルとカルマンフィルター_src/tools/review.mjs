// review.mjs — 各場面の終わり近く（全部の部品が出た状態）を4場面ずつ1枚にまとめた確認画像を作る（out/review-<ページ>-<番号>.png）。
//   node tools/review.mjs ssm-1.html [場面の id をカンマ区切り]   id を書くと、その場面だけを原寸で撮る（out/scene-<id>.png）
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });
const PAGE = process.argv[2] || 'ssm-1.html';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const NAME = path.basename(PAGE, '.html');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(data)));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: ONLY ? 1 : 0.6 });
page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && console.log(`[page ${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/${PAGE}?render`);
await page.waitForFunction(() => window.ARCH && ARCH.ready === true, null, { timeout: 180000 });
const phases = await page.evaluate(() => ARCH.phases);
const picked = phases.filter((p) => !ONLY || ONLY.includes(p.id));
const files = [];
for (const p of picked) {
  await page.evaluate((t) => ARCH.render(t, { stamp: true }), p.t1 - 0.7);
  const file = path.join(out, ONLY ? `scene-${p.id}.png` : `tmp-${NAME}-${p.id}.png`);
  fs.writeFileSync(file, await page.screenshot({ type: 'png' }));
  files.push(file);
}
if (!ONLY) {
  for (let i = 0; i < files.length; i += 4) {
    const group = files.slice(i, i + 4);
    const inputs = group.flatMap((f) => ['-i', f]);
    const target = path.join(out, `review-${NAME}-${String(i / 4 + 1).padStart(2, '0')}.png`);
    const layout = ['0_0', 'w0_0', '0_h0', 'w0_h0'].slice(0, group.length).join('|');
    const filter = group.length === 1 ? 'null' : `xstack=inputs=${group.length}:layout=${layout}:fill=white`;
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', target]);
    console.log(target);
  }
  files.forEach((f) => fs.unlinkSync(f));
} else files.forEach((f) => console.log(f));
await browser.close();
server.close();
