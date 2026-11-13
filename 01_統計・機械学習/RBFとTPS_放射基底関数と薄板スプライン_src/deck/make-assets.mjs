// make-assets.mjs — deck/assets.html をヘッドレス Chrome で開き、数式と図を1つずつ PNG にする（deck/assets/）。
// 大きさ（インチ）は deck/assets/assets.json に書く。build-deck.cjs がこれを読んで貼る。
//   node deck/make-assets.mjs
// KaTeX のフォントは file:// から読めないので、小さな http サーバーからページを開く（tools/render.mjs と同じ）。
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'deck', 'assets');
const DEVICE_SCALE = 3; // 数式は細い線が多いので高めの解像度で撮る
const JPEG_QUALITY = 88; // 図（濃紺の地の面）は透明が要らないので JPEG で軽くする
const CSS_PX_PER_INCH = 96;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname)));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

// 前回の画像だけを消す（フォルダごとは消さない）
fs.mkdirSync(outDir, { recursive: true });
for (const name of fs.readdirSync(outDir)) {
  if (name.endsWith('.png') || name.endsWith('.jpg') || name === 'assets.json') fs.unlinkSync(path.join(outDir, name));
}

const launchOptions = process.env.ARCH_CHROME ? { executablePath: process.env.ARCH_CHROME } : { channel: 'chrome' };
const browser = await chromium.launch({ ...launchOptions, headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: DEVICE_SCALE });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/deck/assets.html`);
await page.waitForFunction(() => window.ASSETS_READY === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const handles = await page.$$('[data-asset]');
const manifest = {};
for (const handle of handles) {
  const id = await handle.getAttribute('data-asset');
  const box = await handle.boundingBox();
  const isFigure = id.startsWith('figure-');
  const file = `${id}.${isFigure ? 'jpg' : 'png'}`;
  await handle.screenshot(isFigure ? { path: path.join(outDir, file), type: 'jpeg', quality: JPEG_QUALITY } : { path: path.join(outDir, file), omitBackground: true });
  manifest[id] = { file, w: Number((box.width / CSS_PX_PER_INCH).toFixed(4)), h: Number((box.height / CSS_PX_PER_INCH).toFixed(4)) };
}
fs.writeFileSync(path.join(outDir, 'assets.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} 個 → ${path.relative(root, outDir)}`);
await browser.close();
server.close();
