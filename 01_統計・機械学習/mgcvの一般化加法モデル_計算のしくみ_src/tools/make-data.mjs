// make-data.mjs — 動画の図に使う数値を、本物の mgcv で計算して js/gam-data.js に書く（node tools/make-data.mjs、数分かかる）。
// R はこの PC に入れず、webR（Node の上で動く R）を使う。初回は mgcv などのパッケージをダウンロードする。
// 計算の中身は tools/gam_data.R にある（R が入っている PC では、そのまま Rscript でも動く）。
import { WebR } from 'webr';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_FILE = path.join(root, 'tools', 'gam_data.R');
const OUTPUT_FILE = path.join(root, 'js', 'gam-data.js');
const R_PACKAGES = ['mgcv', 'jsonlite'];

const webR = new WebR();
await webR.init();
await webR.installPackages(R_PACKAGES, { quiet: true });
const started = Date.now();
const json = await webR.evalRString(fs.readFileSync(SCRIPT_FILE, 'utf8'));
const data = JSON.parse(json);
webR.close();

const header = `// 自動生成（node tools/make-data.mjs）。手で直さない。mgcv ${data.mgcvVersion}（${data.rVersion}、webR）で計算した値。\n`;
fs.writeFileSync(OUTPUT_FILE, `${header}globalThis.GAMDATA = ${JSON.stringify(data)};\n`);
console.log(`${path.relative(root, OUTPUT_FILE)}（${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(0)} KB、${((Date.now() - started) / 1000).toFixed(0)} 秒）`);
console.log(`mgcv ${data.mgcvVersion} / ${data.rVersion}`);
