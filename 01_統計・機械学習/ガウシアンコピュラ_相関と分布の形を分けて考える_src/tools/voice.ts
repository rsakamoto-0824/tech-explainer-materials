// 台本を Mac の say で音声にする: node tools/voice.ts
// 場面ごとに public/voice/<場面>.wav を作り、行ごとの開始時刻と長さを src/timings.json に書く。
// 同じ原稿の声は narration/clips/ に残して使い回す。Mac でだけ動く。
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {READINGS, SCENES} from '../src/script.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIP_DIR = path.join(ROOT, 'narration', 'clips');
const VOICE_DIR = path.join(ROOT, 'public', 'voice');
const VOICE = 'Kyoko';
const VOICE_RATE = 220; // 語/分。過去の解説動画と同じ速さ
const SAMPLE_RATE = 24000;
const LEAD_SECONDS = 0.6; // 場面の頭の間
const GAP_SECONDS = 0.5; // 行と行の間
const TAIL_SECONDS = 1.2; // 場面の終わりの間
const SAY_TIMEOUT_MS = 60000;
const SAY_RETRIES = 3;

mkdirSync(CLIP_DIR, {recursive: true});
mkdirSync(VOICE_DIR, {recursive: true});

export const toReading = (text: string) => READINGS.reduce((result, [from, to]) => result.split(from).join(to), text);

// say はまれに止まったまま返らないので、時間切れで打ち切って作り直す
const speak = (reading: string) => {
  const hash = createHash('sha1').update(`${VOICE}|${VOICE_RATE}|${reading}`).digest('hex').slice(0, 16);
  const file = path.join(CLIP_DIR, `${hash}.aiff`);
  for (let attempt = 1; !existsSync(file); attempt++) {
    const result = spawnSync('say', ['-v', VOICE, '-r', String(VOICE_RATE), '-o', file, reading], {timeout: SAY_TIMEOUT_MS});
    if (result.status === 0 && existsSync(file)) break;
    if (attempt >= SAY_RETRIES) throw new Error(`say failed: ${reading}`);
  }
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'], {
    maxBuffer: 1 << 28,
  });
  if (raw.status !== 0) throw new Error(`ffmpeg failed: ${file}`);
  return raw.stdout as Buffer;
};

const silence = (seconds: number) => Buffer.alloc(Math.round(seconds * SAMPLE_RATE) * 2);

const wavHeader = (dataBytes: number) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
};

const timings: Record<string, {total: number; lines: {start: number; duration: number}[]}> = {};
let totalSeconds = 0;
let characters = 0;
for (const scene of SCENES) {
  const parts: Buffer[] = [silence(LEAD_SECONDS)];
  let cursor = LEAD_SECONDS;
  const lines = scene.lines.map((line, index) => {
    const reading = line.read ?? toReading(line.text);
    characters += reading.length;
    const clip = speak(reading);
    const duration = clip.length / 2 / SAMPLE_RATE;
    const start = cursor;
    parts.push(clip, silence(index === scene.lines.length - 1 ? TAIL_SECONDS : GAP_SECONDS));
    cursor += duration + (index === scene.lines.length - 1 ? TAIL_SECONDS : GAP_SECONDS);
    return {start: Number(start.toFixed(3)), duration: Number(duration.toFixed(3))};
  });
  const data = Buffer.concat(parts);
  writeFileSync(path.join(VOICE_DIR, `${scene.id}.wav`), Buffer.concat([wavHeader(data.length), data]));
  timings[scene.id] = {total: Number(cursor.toFixed(3)), lines};
  totalSeconds += cursor;
  console.log(scene.id, cursor.toFixed(1));
}
writeFileSync(path.join(ROOT, 'src', 'timings.json'), JSON.stringify(timings, null, 1) + '\n');
console.log(`total ${(totalSeconds / 60).toFixed(2)} min, ${characters} chars`);
