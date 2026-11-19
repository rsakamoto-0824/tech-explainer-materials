// 場面の確認用に、行の終わり近くのコマ番号を出す: node tools/frames.ts S1V [S2T ...]
// 場面を指定しない、または --last を付けると、全場面の最後の行のコマだけを出す
import {readFileSync} from 'node:fs';
import {SCENES} from '../src/script.ts';
const timings = JSON.parse(readFileSync(new URL('../src/timings.json', import.meta.url), 'utf8'));
const FPS = 30;
let cursor = 0;
const wanted = process.argv.slice(2).filter((arg) => arg !== '--last');
const lastOnly = wanted.length === 0;
const frames: number[] = [];
for (const scene of SCENES) {
  const timing = timings[scene.id];
  const lineFrames = timing.lines.map((line: {start: number; duration: number}) => cursor + Math.round((line.start + line.duration * 0.97) * FPS));
  if (lastOnly) frames.push(lineFrames[lineFrames.length - 1]);
  else if (wanted.includes(scene.id)) frames.push(...lineFrames);
  cursor += Math.round(timing.total * FPS);
}
console.log(frames.join(','));
