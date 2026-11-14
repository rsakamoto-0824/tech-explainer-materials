// stills.mjs — 確認用に、場面の途中のコマを画像にする。
//   node tools/stills.mjs 1V 2V        … 指定した場面の、各字幕の終わりのコマを out/stills/ に書く
//   node tools/stills.mjs all --last   … 全場面の、最後のコマだけ
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'timeline.json'), 'utf8'));
const args = process.argv.slice(2);
const lastOnly = args.includes('--last');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const scenes = timeline.scenes.filter((scene) => wanted.includes('all') || wanted.includes(scene.id));
const END_MARGIN_FRAMES = 4;

const frames = [];
const names = [];
for (const scene of scenes) {
  const ends = scene.cues.map((cue, i) => (i + 1 < scene.cues.length ? scene.cues[i + 1] : scene.duration) - END_MARGIN_FRAMES);
  (lastOnly ? ends.slice(-1) : ends).forEach((end, i) => {
    frames.push(scene.from + end);
    names.push(`${scene.id}-${lastOnly ? 'last' : i}`);
  });
}
const outDir = path.join(ROOT, 'out', 'stills');
fs.rmSync(outDir, { recursive: true, force: true });
const result = spawnSync(
  'npx',
  ['remotion', 'render', 'LatentVariableModels', outDir, `--frames=${frames.join(',')}`, '--image-format=jpeg', '--sequence', '--scale=0.5', '--log=error', '--is-production=false'],
  { cwd: ROOT, stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
// コマ番号の名前を、場面の名前に変える
const files = fs.readdirSync(outDir).filter((file) => file.endsWith('.jpeg')).sort();
files.forEach((file, i) => fs.renameSync(path.join(outDir, file), path.join(outDir, `${names[i]}.jpg`)));
console.log(`${files.length} 枚を ${outDir} に書きました`);
