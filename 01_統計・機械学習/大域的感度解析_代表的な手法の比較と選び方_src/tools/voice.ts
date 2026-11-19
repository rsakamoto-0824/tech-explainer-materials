// 台本を VOICEVOX（四国めたん）で音声にする: node tools/voice.ts
// 事前に VOICEVOX を起動しておく（エンジンが http://127.0.0.1:50021 で待ち受ける）。
// 場面ごとに public/voice/<場面>.wav を作り、行ごとの開始時刻と長さを src/timings.json に書く。
// 同じ原稿の声は narration/clips/ に残して使い回す。読み（カナ）は narration/kana.txt に書き出す。
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {READINGS, SCENES} from '../src/script.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIP_DIR = path.join(ROOT, 'narration', 'clips');
const VOICE_DIR = path.join(ROOT, 'public', 'voice');
const ENGINE_URL = 'http://127.0.0.1:50021';
const SPEAKER_ID = 2; // 四国めたん（ノーマル）
const SPEED_SCALE = 1.0; // 話す速さ（1.0 が標準）
const SAMPLE_RATE = 24000;
const LEAD_SECONDS = 0.6; // 場面の頭の間
const GAP_SECONDS = 0.5; // 行と行の間
const TAIL_SECONDS = 1.2; // 場面の終わりの間

mkdirSync(CLIP_DIR, {recursive: true});
mkdirSync(VOICE_DIR, {recursive: true});

export const toReading = (text: string) => READINGS.reduce((result, [from, to]) => result.split(from).join(to), text);

const post = async (pathAndQuery: string, body?: unknown) => {
  const response = await fetch(`${ENGINE_URL}${pathAndQuery}`, {
    method: 'POST',
    headers: body ? {'Content-Type': 'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`VOICEVOX ${pathAndQuery.split('?')[0]}: ${response.status}`);
  return response;
};

// 1行を声にする。WAV は 24kHz・モノラル・16bit で返るので、ffmpeg で生の波形に直す
const speak = async (reading: string) => {
  const hash = createHash('sha1').update(`${SPEAKER_ID}|${SPEED_SCALE}|${reading}`).digest('hex').slice(0, 16);
  const file = path.join(CLIP_DIR, `${hash}.wav`);
  const kanaFile = path.join(CLIP_DIR, `${hash}.kana`);
  if (!existsSync(file)) {
    const query = await (await post(`/audio_query?speaker=${SPEAKER_ID}&text=${encodeURIComponent(reading)}`)).json();
    query.speedScale = SPEED_SCALE;
    query.outputSamplingRate = SAMPLE_RATE;
    query.outputStereo = false;
    const audio = Buffer.from(await (await post(`/synthesis?speaker=${SPEAKER_ID}`, query)).arrayBuffer());
    writeFileSync(file, audio);
    writeFileSync(kanaFile, query.kana);
  }
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'], {
    maxBuffer: 1 << 28,
  });
  if (raw.status !== 0) throw new Error(`ffmpeg failed: ${file}`);
  return {pcm: raw.stdout as Buffer, kana: readFileSync(kanaFile, 'utf8')};
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
const kanaLog: string[] = [];
let totalSeconds = 0;
let characters = 0;
for (const scene of SCENES) {
  const parts: Buffer[] = [silence(LEAD_SECONDS)];
  let cursor = LEAD_SECONDS;
  const lines: {start: number; duration: number}[] = [];
  for (const [index, line] of scene.lines.entries()) {
    const reading = line.read ?? toReading(line.text);
    characters += reading.length;
    const {pcm, kana} = await speak(reading);
    kanaLog.push(`${scene.id}-${index + 1}\t${line.text}\n\t${kana}`);
    const duration = pcm.length / 2 / SAMPLE_RATE;
    const pause = index === scene.lines.length - 1 ? TAIL_SECONDS : GAP_SECONDS;
    lines.push({start: Number(cursor.toFixed(3)), duration: Number(duration.toFixed(3))});
    parts.push(pcm, silence(pause));
    cursor += duration + pause;
  }
  const data = Buffer.concat(parts);
  writeFileSync(path.join(VOICE_DIR, `${scene.id}.wav`), Buffer.concat([wavHeader(data.length), data]));
  timings[scene.id] = {total: Number(cursor.toFixed(3)), lines};
  totalSeconds += cursor;
  console.log(scene.id, cursor.toFixed(1));
}
writeFileSync(path.join(ROOT, 'src', 'timings.json'), JSON.stringify(timings, null, 1) + '\n');
writeFileSync(path.join(ROOT, 'narration', 'kana.txt'), kanaLog.join('\n') + '\n');
console.log(`total ${(totalSeconds / 60).toFixed(2)} min, ${characters} chars`);
