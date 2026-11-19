// YouTube の概要欄に貼る章の時刻を表示する: node tools/chapters.ts
// 声の長さ（src/timings.json）から、章が始まる時刻を mm:ss で出す
import {readFileSync} from 'node:fs';
import {CHAPTERS, LAST_NUMBERED_CHAPTER, SCENES} from '../src/script.ts';

const FPS = 30;
const timings = JSON.parse(readFileSync(new URL('../src/timings.json', import.meta.url), 'utf8'));
const toClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
let frames = 0;
let lastChapter = -1;
for (const scene of SCENES) {
  if (scene.chapter !== lastChapter) {
    const label = scene.chapter >= 1 && scene.chapter <= LAST_NUMBERED_CHAPTER ? `第${scene.chapter}章 ${CHAPTERS[scene.chapter]}` : CHAPTERS[scene.chapter];
    console.log(`${toClock(frames / FPS)} ${label}`);
    lastChapter = scene.chapter;
  }
  frames += Math.round(timings[scene.id].total * FPS);
}
console.log(`（全体 ${toClock(frames / FPS)}）`);
