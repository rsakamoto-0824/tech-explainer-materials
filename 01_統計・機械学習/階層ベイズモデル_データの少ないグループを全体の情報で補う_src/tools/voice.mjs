// voice.mjs — 字幕（src/script.ts）を読み上げ、場面ごとの音声と時刻表を作る。
//   node tools/voice.mjs            … VOICEVOX の「四国めたん」で読み上げる（VOICEVOX を起動しておく）
//   node tools/voice.mjs --draft    … 下書き用。Mac の say（Kyoko）で読み上げる（画面づくりの確認用で、完成版には使わない）
//   node tools/voice.mjs --print    … 読み上げ原稿（読みを直したあとの文）を表示するだけ
//   node tools/voice.mjs --kana     … VOICEVOX がどう読むか（カナ）を表示するだけ。読み間違いの点検に使う
// 出力: public/voice/<場面>.wav（場面ごとの音声）、src/timeline.json（場面と字幕の開始コマ）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../src/script.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CLIP_DIR = path.join(ROOT, 'narration', 'clips');
const VOICE_DIR = path.join(ROOT, 'public', 'voice');
const TIMELINE_FILE = path.join(ROOT, 'src', 'timeline.json');

// VOICEVOX（このPCの中で動く読み上げソフト。外部へは送信しない）
const VOICEVOX_URL = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const VOICEVOX_SPEAKER_ID = 2; // 四国めたん（ノーマル）
const VOICEVOX_SPEED = 0.95;
const VOICEVOX_INTONATION = 1.0;
const VOICEVOX_TIMEOUT_MS = 120000;
// 下書き用（Mac の say）
const DRAFT_VOICE_NAME = 'Kyoko';
const DRAFT_VOICE_RATE = 192;
const SAY_TIMEOUT_MS = 60000;
const SAY_RETRIES = 3;

const FPS = 30;
const SAMPLE_RATE = 24000;
const SAMPLES_PER_FRAME = SAMPLE_RATE / FPS;
const BYTES_PER_SAMPLE = 2;
const LEAD_FRAMES = 18; // 場面の最初の無音
const GAP_FRAMES = 20; // 字幕と字幕の間の無音
const TAIL_FRAMES = 24; // 場面の最後の無音

// 読みの直し。上から順に置きかえるので、長い語を先に書く。
// 事前分布・事後分布・尤度・縮約・交換可能性などは、漢字のままで正しく読まれる（--kana で確認）。
const READINGS = [
  ['青い山', 'あおいやま'],
  ['非中心化', 'ひちゅうしんか'],
  ['漏斗', 'ろうと'],
  ['逆ガンマ', 'ぎゃくガンマ'],
  ['R ハット', 'アールハット'],
  ['log τ', 'ログタウ'],
  ['MCMC', 'エムシーエムシー'],
  ['RMSE', 'アールエムエスイー'],
  ['PyMC', 'パイエムシー'],
  ['Stan', 'スタン'],
  ['brms', 'ビーアールエムエス'],
  ['A/B テスト', 'エービーテスト'],
  ['1段め', 'いちだんめ'],
  ['2段め', 'にだんめ'],
  ['3段め', 'さんだんめ'],
  ['1位', 'いちい'],
  ['数えるだけ', 'かぞえるだけ'],
  ['何千回', 'なんぜんかい'],
  ['θ', 'シータ'],
  ['μ', 'ミュー'],
  ['τ', 'タウ'],
  ['σ', 'シグマ'],
  ['η', 'イータ'],
];
// 1文字の記号（学校の名前や添字）は、前後が英字でないときだけ読みかえる
const LETTERS = [
  ['A', 'エー'],
  ['B', 'ビー'],
  ['C', 'シー'],
  ['D', 'ディー'],
  ['E', 'イー'],
  ['F', 'エフ'],
  ['G', 'ジー'],
  ['H', 'エイチ'],
  ['R', 'アール'],
  ['i', 'アイ'],
  ['j', 'ジェイ'],
  ['n', 'エヌ'],
  ['y', 'ワイ'],
];

function toSpeech(line) {
  if (line.say) return line.say;
  let text = line.t;
  for (const [from, to] of READINGS) text = text.split(from).join(to);
  for (const [letter, reading] of LETTERS) text = text.replace(new RegExp(`(?<![A-Za-z])${letter}(?![A-Za-z])`, 'g'), reading);
  // 記号のあとの空白は読みの切れ目にならないので消す。かぎかっこは短い間に変える
  return text.replace(/ /g, '').replace(/[「」]/g, '、').replace(/、、+/g, '、').replace(/^、/, '');
}

const args = process.argv.slice(2);
if (args.includes('--print')) {
  for (const scene of SCENES) {
    console.log(`\n[${scene.id}] ${scene.title}`);
    for (const line of scene.lines) console.log('  ' + toSpeech(line));
  }
  process.exit(0);
}
const isDraft = args.includes('--draft');

async function voicevoxQuery(text) {
  const url = `${VOICEVOX_URL}/audio_query?speaker=${VOICEVOX_SPEAKER_ID}&text=${encodeURIComponent(text)}`;
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(VOICEVOX_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`VOICEVOX の audio_query に失敗しました（${response.status}）: ${text}`);
  return response.json();
}

async function checkVoicevox() {
  try {
    const response = await fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(String(response.status));
    console.log(`VOICEVOX ${await response.json()} に接続しました（話者 ${VOICEVOX_SPEAKER_ID}：四国めたん）`);
  } catch {
    console.error(`VOICEVOX に接続できません（${VOICEVOX_URL}）。VOICEVOX を起動してから、もう一度実行してください。`);
    console.error('画面づくりの確認だけなら、node tools/voice.mjs --draft（Mac の声で下書き）が使えます。');
    process.exit(1);
  }
}

if (args.includes('--kana')) {
  await checkVoicevox();
  for (const scene of SCENES) {
    console.log(`\n[${scene.id}] ${scene.title}`);
    for (const line of scene.lines) console.log('  ' + (await voicevoxQuery(toSpeech(line))).kana);
  }
  process.exit(0);
}

/** WAV から、音の中身（PCM）だけを取り出す */
function wavToPcm(wav) {
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') return wav.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV の中に音のデータが見つかりません');
}

async function speakVoicevox(text, pcmFile) {
  const query = await voicevoxQuery(text);
  query.speedScale = VOICEVOX_SPEED;
  query.intonationScale = VOICEVOX_INTONATION;
  query.prePhonemeLength = 0; // 前後の無音は、このスクリプトで入れる
  query.postPhonemeLength = 0;
  query.outputSamplingRate = SAMPLE_RATE;
  query.outputStereo = false;
  const response = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${VOICEVOX_SPEAKER_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(VOICEVOX_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`VOICEVOX の synthesis に失敗しました（${response.status}）: ${text}`);
  fs.writeFileSync(pcmFile, wavToPcm(Buffer.from(await response.arrayBuffer())));
}

function speakDraft(text, pcmFile) {
  const aiffFile = pcmFile.replace(/\.pcm$/, '.aiff');
  // say はまれに止まったまま返らないことがあるため、時間切れで打ち切って作り直す
  for (let attempt = 1; ; attempt++) {
    const result = spawnSync('say', ['-v', DRAFT_VOICE_NAME, '-r', String(DRAFT_VOICE_RATE), '-o', aiffFile, text], { timeout: SAY_TIMEOUT_MS });
    if (result.status === 0 && fs.existsSync(aiffFile)) break;
    if (attempt >= SAY_RETRIES) throw new Error(`say に失敗しました: ${text}`);
  }
  const convert = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiffFile, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), pcmFile]);
  if (convert.status !== 0) throw new Error(`ffmpeg に失敗しました: ${convert.stderr}`);
  fs.rmSync(aiffFile);
}

// 1つの字幕を読み上げて、PCM（16bit・モノラル）で返す。同じ声・同じ文は作り直さない。
async function speak(text) {
  const voiceKey = isDraft ? `say|${DRAFT_VOICE_NAME}|${DRAFT_VOICE_RATE}` : `voicevox|${VOICEVOX_SPEAKER_ID}|${VOICEVOX_SPEED}|${VOICEVOX_INTONATION}`;
  const key = crypto.createHash('sha1').update(`${voiceKey}|${text}`).digest('hex').slice(0, 16);
  const pcmFile = path.join(CLIP_DIR, `${key}.pcm`);
  if (!fs.existsSync(pcmFile)) {
    if (isDraft) speakDraft(text, pcmFile);
    else await speakVoicevox(text, pcmFile);
  }
  return fs.readFileSync(pcmFile);
}

function wavHeader(dataBytes) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // モノラル
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 28);
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
}

const silence = (frames) => Buffer.alloc(frames * SAMPLES_PER_FRAME * BYTES_PER_SAMPLE);

if (!isDraft) await checkVoicevox();
fs.mkdirSync(CLIP_DIR, { recursive: true });
fs.mkdirSync(VOICE_DIR, { recursive: true });

const timeline = { fps: FPS, voice: isDraft ? `下書き（say ${DRAFT_VOICE_NAME}）` : 'VOICEVOX:四国めたん', total: 0, scenes: [] };
let sceneStart = 0;
for (const scene of SCENES) {
  const parts = [silence(LEAD_FRAMES)];
  const cues = [];
  let cursor = LEAD_FRAMES;
  for (const line of scene.lines) {
    const pcm = await speak(toSpeech(line));
    const voiceFrames = Math.ceil(pcm.length / BYTES_PER_SAMPLE / SAMPLES_PER_FRAME);
    const padded = Buffer.alloc(voiceFrames * SAMPLES_PER_FRAME * BYTES_PER_SAMPLE);
    pcm.copy(padded);
    cues.push(cursor);
    parts.push(padded, silence(GAP_FRAMES));
    cursor += voiceFrames + GAP_FRAMES;
  }
  parts.push(silence(TAIL_FRAMES));
  const duration = cursor + TAIL_FRAMES;
  const body = Buffer.concat(parts);
  fs.writeFileSync(path.join(VOICE_DIR, `${scene.id}.wav`), Buffer.concat([wavHeader(body.length), body]));
  timeline.scenes.push({ id: scene.id, from: sceneStart, duration, cues });
  console.log(`${scene.id.padEnd(8)} ${(duration / FPS).toFixed(1).padStart(6)} 秒  字幕 ${scene.lines.length}`);
  sceneStart += duration;
}
timeline.total = sceneStart;
fs.writeFileSync(TIMELINE_FILE, JSON.stringify(timeline));
const totalSeconds = sceneStart / FPS;
console.log(`合計 ${Math.floor(totalSeconds / 60)}分${Math.round(totalSeconds % 60)}秒（${sceneStart} コマ）／声: ${timeline.voice}`);
