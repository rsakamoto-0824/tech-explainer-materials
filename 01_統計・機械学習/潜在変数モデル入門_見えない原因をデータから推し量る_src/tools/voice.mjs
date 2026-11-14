// voice.mjs — 字幕（src/script.ts）を Mac の say コマンドで読み上げ、場面ごとの音声と時刻表を作る。
//   node tools/voice.mjs            … 変わった字幕だけ作り直す
//   node tools/voice.mjs --print    … 読み上げ原稿（読みを直したあとの文）を表示するだけ
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

const VOICE_NAME = 'Kyoko';
const VOICE_RATE = 192; // 語/分。say の標準は 180
const FPS = 30;
const SAMPLE_RATE = 24000;
const SAMPLES_PER_FRAME = SAMPLE_RATE / FPS;
const BYTES_PER_SAMPLE = 2;
const LEAD_FRAMES = 18; // 場面の最初の無音
const GAP_FRAMES = 16; // 字幕と字幕の間の無音
const TAIL_FRAMES = 24; // 場面の最後の無音
const SAY_TIMEOUT_MS = 60000;
const SAY_RETRIES = 3;

// 読みの直し。上から順に置きかえるので、長い語を先に書く。
const READINGS = [
  ['p(x)', 'ピーエックス'],
  ['E ステップ', 'イーステップ'],
  ['M ステップ', 'エムステップ'],
  ['EM アルゴリズム', 'イーエムアルゴリズム'],
  ['BIC', 'ビーアイシー'],
  ['VAE', 'ブイエーイー'],
  ['AI', 'エーアイ'],
  ['土台', 'どだい'],
  ['事前確率', 'じぜんかくりつ'],
  ['白い丸', 'しろいまる'],
  ['丸と', 'まると'],
  ['丸は', 'まるは'],
  ['矢印', 'やじるし'],
  ['四角い枠', 'しかくいわく'],
  ['件数', 'けんすう'],
  ['頂上', 'ちょうじょう'],
  ['地図', 'ちず'],
  ['登って', 'のぼって'],
  ['1歩', 'いっぽ'],
  ['入れ替わ', 'いれかわ'],
  ['中身', 'なかみ'],
  ['向き', 'むき'],
  ['塗り', 'ぬり'],
  ['潜在変数', 'せんざいへんすう'],
  ['観測変数', 'かんそくへんすう'],
  ['混合ガウスモデル', 'こんごうガウスモデル'],
  ['混合モデル', 'こんごうモデル'],
  ['隠れマルコフモデル', 'かくれマルコフモデル'],
  ['状態空間モデル', 'じょうたいくうかんモデル'],
  ['変分オートエンコーダ', 'へんぶんオートエンコーダ'],
  ['確率的な主成分分析', 'かくりつてきな、しゅせいぶんぶんせき'],
  ['主成分分析', 'しゅせいぶんぶんせき'],
  ['因子分析', 'いんしぶんせき'],
  ['事後確率', 'じごかくりつ'],
  ['負担率', 'ふたんりつ'],
  ['対数尤度', 'たいすうゆうど'],
  ['最尤推定', 'さいゆうすいてい'],
  ['尤度', 'ゆうど'],
  ['周辺化', 'しゅうへんか'],
  ['同時分布', 'どうじぶんぷ'],
  ['推し量', 'おしはか'],
  ['推定値', 'すいていち'],
  ['釣り鐘型', 'つりがねがた'],
  ['五分五分', 'ごぶごぶ'],
  ['良し悪し', 'よしあし'],
  ['物差し', 'ものさし'],
  ['物語', 'ものがたり'],
  ['出発点', 'しゅっぱつてん'],
  ['高さの比', '高さのひ'],
  ['理系の力', 'りけいのちから'],
  ['学力', 'がくりょく'],
  ['点数', 'てんすう'],
  ['係数', 'けいすう'],
  ['人数', 'にんずう'],
  ['回数', 'かいすう'],
  ['対数', 'たいすう'],
  ['乱数', 'らんすう'],
  ['の数', 'のかず'],
  ['少ない数', 'すくないかず'],
  ['重み', 'おもみ'],
  ['割合', 'わりあい'],
  ['離散', 'りさん'],
  ['仲間', 'なかま'],
  ['話題', 'わだい'],
  ['手元', 'てもと'],
  ['出方', 'でかた'],
  ['横軸', 'よこじく'],
  ['縦軸', 'たてじく'],
  ['縦の線', 'たてのせん'],
  ['白い線', 'しろいせん'],
  ['直線', 'ちょくせん'],
  ['曲線', 'きょくせん'],
  ['上は、', 'うえは、'],
  ['下は、', 'したは、'],
  ['下の', 'したの'],
  ['下に', 'したに'],
  ['左は', 'ひだりは'],
  ['右は', 'みぎは'],
  ['左の', 'ひだりの'],
  ['右の', 'みぎの'],
  ['右上がり', 'みぎあがり'],
  ['モデルの中', 'モデルのなか'],
  ['対数の中', 'たいすうのなか'],
  ['大人', 'おとな'],
  ['ある人', 'あるひと'],
  ['その人', 'そのひと'],
  ['高い人', '高いひと'],
  ['らしい人', 'らしいひと'],
  ['人が付ける', 'ひとがつける'],
  ['低い人たち', 'ひくいひとたち'],
  ['背の', 'せの'],
  ['鶏', 'にわとり'],
  ['卵', 'たまご'],
  ['橙', 'だいだい'],
  ['青い', 'あおい'],
  ['青が', 'あおが'],
  ['帯', 'おび'],
  ['幅', 'はば'],
  ['罰', 'ばつ'],
  ['裏', 'うら'],
  ['客', 'きゃく'],
  ['好み', 'このみ'],
  ['山', 'やま'],
  ['値', 'あたい'],
  ['形', 'かたち'],
  ['色', 'いろ'],
  ['掛け合わせ', 'かけあわせ'],
  ['掛け', 'かけ'],
  ['足し合わせ', 'たしあわせ'],
  ['足し算', 'たしざん'],
  ['足し', 'たし'],
  ['足す', 'たす'],
  ['混ぜ', 'まぜ'],
  ['混ざ', 'まざ'],
  ['取り出', 'とりだ'],
  ['外して', 'はずして'],
  ['置き', 'おき'],
  ['置いて', 'おいて'],
  ['交わる', 'まじわる'],
  ['下ろし', 'おろし'],
  ['寄せた', 'よせた'],
  ['着く', 'つく'],
  ['着き', 'つき'],
  ['挙げ', 'あげ'],
  ['効き', 'きき'],
  ['扱', 'あつか'],
  ['受け持つ', 'うけもつ'],
  ['1件ずつ', 'いっけんずつ'],
  ['1つ前', 'ひとつまえ'],
  ['1つめ', 'ひとつめ'],
  ['2つめ', 'ふたつめ'],
  ['3つめ', 'みっつめ'],
  ['1つ', 'ひとつ'],
  ['2つ', 'ふたつ'],
  ['3つ', 'みっつ'],
  ['cm', 'センチ'],
  ['π', 'パイ'],
  ['μ', 'ミュー'],
  ['σ', 'シグマ'],
  ['γ', 'ガンマ'],
  ['ε', 'イプシロン'],
];
// 1文字の記号は、前後が英字でないときだけ読みかえる
const LETTERS = [
  ['x', 'エックス'],
  ['z', 'ゼット'],
  ['w', 'ダブリュー'],
  ['k', 'ケー'],
  ['K', 'ケー'],
  ['N', 'エヌ'],
];

function toSpeech(line) {
  if (line.say) return line.say;
  let text = line.t;
  for (const [from, to] of READINGS) text = text.split(from).join(to);
  for (const [letter, reading] of LETTERS) text = text.replace(new RegExp(`(?<![A-Za-z])${letter}(?![A-Za-z])`, 'g'), reading);
  // 記号のあとの空白は読みの切れ目にならないので消す。かぎかっこは短い間に変える
  return text.replace(/ /g, '').replace(/[「」]/g, '、').replace(/、、+/g, '、').replace(/^、/, '');
}

if (process.argv.includes('--print')) {
  for (const scene of SCENES) {
    console.log(`\n[${scene.id}] ${scene.title}`);
    for (const line of scene.lines) console.log('  ' + toSpeech(line));
  }
  process.exit(0);
}

fs.mkdirSync(CLIP_DIR, { recursive: true });
fs.mkdirSync(VOICE_DIR, { recursive: true });

// 1つの字幕を読み上げて、PCM（16bit・モノラル）で返す。同じ文は作り直さない。
function speak(text) {
  const key = crypto.createHash('sha1').update(`${VOICE_NAME}|${VOICE_RATE}|${text}`).digest('hex').slice(0, 16);
  const pcmFile = path.join(CLIP_DIR, `${key}.pcm`);
  if (!fs.existsSync(pcmFile)) {
    const aiffFile = path.join(CLIP_DIR, `${key}.aiff`);
    // say はまれに止まったまま返らないことがあるため、時間切れで打ち切って作り直す
    for (let attempt = 1; ; attempt++) {
      const result = spawnSync('say', ['-v', VOICE_NAME, '-r', String(VOICE_RATE), '-o', aiffFile, text], { timeout: SAY_TIMEOUT_MS });
      if (result.status === 0 && fs.existsSync(aiffFile)) break;
      if (attempt >= SAY_RETRIES) throw new Error(`say に失敗しました: ${text}`);
    }
    const convert = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiffFile, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), pcmFile]);
    if (convert.status !== 0) throw new Error(`ffmpeg に失敗しました: ${convert.stderr}`);
    fs.rmSync(aiffFile);
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

const timeline = { fps: FPS, total: 0, scenes: [] };
let sceneStart = 0;
for (const scene of SCENES) {
  const parts = [silence(LEAD_FRAMES)];
  const cues = [];
  let cursor = LEAD_FRAMES;
  for (const line of scene.lines) {
    const pcm = speak(toSpeech(line));
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
console.log(`合計 ${Math.floor(totalSeconds / 60)}分${Math.round(totalSeconds % 60)}秒（${sceneStart} コマ）`);
