// render.mjs — 動画のページをヘッドレス Chrome で開き、ARCH.render(t) を1コマずつ撮って書き出す（出力は out/）。
// もとはスキル animated-arch-diagram の tools/render.mjs。ガウス過程回帰の解説動画で、並列の書き出しと場面ごとの確認を足したものを使う。
//   node tools/render.mjs info                          → 尺と場面の時刻表
//   node tools/render.mjs sheet [枚数=16] [--scene 6V1] → out/sheet.png（全体 or 1場面を等間隔に撮る。時刻入り）
//   node tools/render.mjs stills 2.5,7.1                → out/still-<秒>.png（原寸 1920×1080）
//   node tools/render.mjs video [名前=svd] [--workers 4] → out/<名前>.mp4 + <名前>-poster.png
//   node tools/render.mjs serve                         → ブラウザで確認するための http サーバー（Ctrl+C で終了）
//   node tools/render.mjs voice [--voice Kyoko --rate 220] → js/narration.js の原稿を音声にし、長さを narration/seconds.js に書く
//   node tools/render.mjs mux [名前=svd]                 → 音声を字幕の時刻に並べ、out/<名前>.mp4 と重ねて out/<名前>-voice.mp4 にする
//   声の長さで字幕の時間が延びるので、voice のあとは video で映像を書き出し直してから mux する
//   どれにも --page <html> を付けると別のページを撮る。既定は svd.html
// KaTeX のフォントは file:// から読めない（CORS で止まる）ため、ページは毎回この中の小さな http サーバーから開く。
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });

const argv = process.argv.slice(2);
const takeOption = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : fallback;
};
const PAGE = takeOption('--page', 'svd.html');
const SCENE = takeOption('--scene', null);
const WORKERS = Number(takeOption('--workers', 4));
// 読み上げ: Mac の say コマンドの声と速さ（語/分。標準は 180。220 で、もとの 200 の約1.1倍速い）
const VOICE = takeOption('--voice', 'Kyoko');
const VOICE_RATE = Number(takeOption('--rate', 220));
const [mode = 'info', ...args] = argv;

const VIEWPORT = { width: 1600, height: 900 };
const DEVICE_SCALE = 1.2; // 1600×900 → 1920×1080
const JPEG_QUALITY = 95;
// CRF 23 ＋ animation（平らな色の多い図向け）。10分以内の動画なので、ガウス過程回帰の動画（CRF 26）より画質を上げている
const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml',
};
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(Number(process.env.PORT || 0), '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
const baseUrl = `http://127.0.0.1:${server.address().port}/${PAGE}`;
if (mode === 'serve') {
  console.log(`${baseUrl}  （?scene=6V1 で場面から、?t=120 でその時刻に止める）`);
  await new Promise(() => {});
}

// Chromium の場所: 環境変数 ARCH_CHROME → Playwright のキャッシュ（新しい版から）→ インストール済み Chrome
function findChrome() {
  if (process.env.ARCH_CHROME) return { executablePath: process.env.ARCH_CHROME };
  const win = process.platform === 'win32';
  const base = win
    ? path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')
    : process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
      : path.join(os.homedir(), '.cache', 'ms-playwright');
  const rel = win ? ['chrome-win64', 'chrome.exe'] : process.platform === 'darwin' ? null : ['chrome-linux', 'chrome'];
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.split('-')[1] - a.split('-')[1]);
    for (const d of rel ? dirs : []) {
      const p = path.join(base, d, ...rel);
      if (fs.existsSync(p)) return { executablePath: p };
    }
  } catch {}
  return { channel: 'chrome' };
}

function ffmpeg(ffArgs, stdin = 'ignore') {
  return spawn('ffmpeg', ['-y', '-loglevel', 'error', ...ffArgs], { stdio: [stdin, 'inherit', 'inherit'] });
}
async function finish(ff) {
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
}
async function write(ff, buf) {
  if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
}

const browser = await chromium.launch({ ...findChrome(), headless: true });
async function openPage() {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') console.log(`[page ${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`${baseUrl}?render`);
  await page.waitForFunction(() => window.ARCH && ARCH.ready === true, null, { timeout: 120000 });
  return page;
}
// 長い書き出しの途中で PC が一時停止すると撮影が時間切れになるため、同じコマを撮り直す（絵は t だけで決まるので安全）
const SCREENSHOT_TIMEOUT_MS = 120000;
const SCREENSHOT_RETRIES = 3;
const shot = async (page, t, type = 'png', stamp = false) => {
  await page.evaluate(([tt, s]) => ARCH.render(tt, { stamp: s }), [t, stamp]);
  const options = type === 'png' ? { type } : { type, quality: JPEG_QUALITY };
  for (let attempt = 1; ; attempt++) {
    try {
      return await page.screenshot({ ...options, timeout: SCREENSHOT_TIMEOUT_MS });
    } catch (error) {
      if (attempt >= SCREENSHOT_RETRIES) throw error;
      console.log(`retry screenshot t=${t.toFixed(2)} (${error.name})`);
    }
  }
};

const page = await openPage();
const { duration: DUR, fps: FPS, posterTime, phases } = await page.evaluate(() => ({ ...ARCH, render: undefined }));
const range = (() => {
  if (!SCENE) return [0, DUR];
  const p = phases.find((ph) => ph.id === SCENE);
  if (!p) throw new Error(`scene not found: ${SCENE}`);
  return [p.t0, p.t1];
})();
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

if (mode === 'info') {
  console.log(`duration ${DUR.toFixed(1)}s (${clock(DUR)})  fps ${FPS}  frames ${Math.round(DUR * FPS)}  poster ${posterTime.toFixed(2)}s`);
  phases.forEach((p) => console.log(`${p.kind.padEnd(7)} ${clock(p.t0).padStart(7)} - ${clock(p.t1).padStart(7)}  (${(p.t1 - p.t0).toFixed(1)}s)  ${p.caption}`));
}

if (mode === 'sheet') {
  const n = Math.ceil(Number(args[0] || 16) / 4) * 4;
  const file = path.join(out, SCENE ? `sheet-${SCENE}.png` : 'sheet.png');
  const ff = ffmpeg(['-f', 'image2pipe', '-c:v', 'png', '-i', '-', '-vf', `scale=480:-1,tile=4x${n / 4}:padding=4:color=white`, '-frames:v', '1', file], 'pipe');
  const [a, b] = range;
  for (let i = 0; i < n; i++) await write(ff, await shot(page, a + ((i + 0.5) / n) * (b - a), 'png', true));
  ff.stdin.end();
  await finish(ff);
  console.log(`${file} (${n} frames)`);
}

if (mode === 'stills') {
  for (const t of (args[0] || String(posterTime)).split(',').map(Number)) {
    fs.writeFileSync(path.join(out, `still-${t}.png`), await shot(page, t, 'png', true));
  }
  console.log('stills written');
}

if (mode === 'video') {
  const name = args[0] || 'svd';
  const total = Math.round(DUR * FPS);
  const perWorker = Math.ceil(total / WORKERS);
  const mp4 = path.join(out, `${name}.mp4`);
  const started = Date.now();
  let done = 0;
  const segments = await Promise.all(
    Array.from({ length: WORKERS }, async (_, w) => {
      const from = w * perWorker;
      const to = Math.min(total, from + perWorker);
      if (from >= to) return null;
      const pg = w === 0 ? page : await openPage();
      const file = path.join(out, `segment-${w}.mp4`);
      const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...X264, file], 'pipe');
      for (let i = from; i < to; i++) {
        await write(ff, await shot(pg, i / FPS, 'jpeg'));
        done++;
        if (done % 600 === 0) {
          const sec = (Date.now() - started) / 1000;
          console.log(`frame ${done}/${total}  ${sec.toFixed(0)}s  （残り約 ${(((total - done) * sec) / done / 60).toFixed(1)} 分）`);
        }
      }
      ff.stdin.end();
      await finish(ff);
      return file;
    }),
  );
  // 区間ごとの MP4 は同じ設定で作ったので、再エンコードせずにつなげる
  const list = path.join(out, 'segments.txt');
  fs.writeFileSync(list, segments.filter(Boolean).map((f) => `file '${f}'`).join('\n'));
  await finish(ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', mp4]));
  segments.filter(Boolean).forEach((f) => fs.unlinkSync(f));
  fs.unlinkSync(list);
  fs.writeFileSync(path.join(out, `${name}-poster.png`), await shot(page, posterTime));
  console.log(`${mp4}  (${total} frames, ${((Date.now() - started) / 60000).toFixed(1)} min)`);
}

// ---- 読み上げ ----
const narrationDir = path.join(root, 'narration');
const clipDir = path.join(narrationDir, 'clips');
// 声の長さのファイルはページごとに分ける（svd.html → seconds.js、ほかのページ → seconds-<名前>.js）。声のファイルは場面の id で分かれる
const secondsFile = PAGE === 'svd.html' ? 'seconds.js' : `seconds-${path.basename(PAGE, '.html')}.js`;
const clipPath = (key) => path.join(clipDir, `${key.replace(':', '_')}.aiff`);
const VOICE_SAMPLE_RATE = 24000;
// 声だけの音声なので 24kHz・48kbps で足りる
const AUDIO_BITRATE = '48k';

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { maxBuffer: 1 << 30 });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr?.toString()}`);
  return result.stdout;
}
// say はまれに止まったまま返らないことがあるため、時間切れで打ち切って作り直す
const SAY_TIMEOUT_MS = 60000;
const SAY_RETRIES = 3;
function speak(text, file) {
  for (let attempt = 1; ; attempt++) {
    const result = spawnSync('say', ['-v', VOICE, '-r', String(VOICE_RATE), '-o', file, text], { timeout: SAY_TIMEOUT_MS });
    if (result.status === 0) return;
    if (attempt >= SAY_RETRIES) throw new Error(`say failed: ${file}`);
    console.log(`retry say (${path.basename(file)})`);
  }
}
const audioSeconds = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
// 音声ファイルを 24kHz・1ch の 32bit 浮動小数の並びにする
function decodeAudio(file) {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(VOICE_SAMPLE_RATE), '-']);
  const samples = new Float32Array(raw.length / 4);
  for (let i = 0; i < samples.length; i++) samples[i] = raw.readFloatLE(i * 4);
  return samples;
}

if (mode === 'voice') {
  fs.mkdirSync(clipDir, { recursive: true });
  const beats = await page.evaluate(() => ARCH.beats);
  const seconds = {};
  let made = 0;
  for (const b of beats) {
    if (!b.narration) {
      console.warn(`原稿がありません: ${b.key}`);
      continue;
    }
    const file = clipPath(b.key);
    // 原稿・声・速さが前回と同じなら作り直さない
    const recipe = `${VOICE}|${VOICE_RATE}|${b.narration}`;
    const recipeFile = `${file}.txt`;
    if (!fs.existsSync(file) || !fs.existsSync(recipeFile) || fs.readFileSync(recipeFile, 'utf8') !== recipe) {
      speak(b.narration, file);
      fs.writeFileSync(recipeFile, recipe);
      made++;
    }
    seconds[b.key] = Number(audioSeconds(file).toFixed(3));
  }
  const total = Object.values(seconds).reduce((a, b) => a + b, 0);
  fs.writeFileSync(
    path.join(narrationDir, secondsFile),
    `// 自動生成（node tools/render.mjs voice --page ${PAGE} --voice ${VOICE} --rate ${VOICE_RATE}）。字幕ごとの声の長さ（秒）。engine.js がこれで字幕の時間を延ばす\nwindow.NARRATION_SECONDS = ${JSON.stringify(seconds, null, 2)};\n`,
  );
  console.log(`${Object.keys(seconds).length} 本（新しく作った ${made} 本）、声の合計 ${(total / 60).toFixed(1)} 分 → narration/${secondsFile}`);
}

if (mode === 'mux') {
  const name = args[0] || 'svd';
  const video = path.join(out, `${name}.mp4`);
  const videoSeconds = audioSeconds(video);
  if (Math.abs(videoSeconds - DUR) > 0.5) throw new Error(`映像の長さ ${videoSeconds.toFixed(1)} 秒が今の時間割 ${DUR.toFixed(1)} 秒と合いません。voice のあとに video で書き出し直してください`);
  const { beats, narrationLead } = await page.evaluate(() => ({ beats: ARCH.beats, narrationLead: ARCH.narrationLead }));
  const track = new Float32Array(Math.ceil(DUR * VOICE_SAMPLE_RATE));
  let placed = 0;
  for (const b of beats) {
    const file = clipPath(b.key);
    if (!b.narration || !fs.existsSync(file)) continue;
    const samples = decodeAudio(file);
    const start = Math.round((b.t0 + narrationLead) * VOICE_SAMPLE_RATE);
    if (samples.length / VOICE_SAMPLE_RATE + narrationLead > b.dur) console.warn(`声が次の字幕にはみ出します: ${b.key}`);
    for (let i = 0; i < samples.length && start + i < track.length; i++) track[start + i] += samples[i];
    placed++;
  }
  const result = path.join(out, `${name}-voice.mp4`);
  const ff = ffmpeg(['-i', video, '-f', 'f32le', '-ar', String(VOICE_SAMPLE_RATE), '-ac', '1', '-i', '-',
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(VOICE_SAMPLE_RATE), '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
    '-movflags', '+faststart', '-shortest', result], 'pipe');
  await write(ff, Buffer.from(track.buffer));
  ff.stdin.end();
  await finish(ff);
  console.log(`${result}（声 ${placed} 本）`);
}

await browser.close();
server.close();
