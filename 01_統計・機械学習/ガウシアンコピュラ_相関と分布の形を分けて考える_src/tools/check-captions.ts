// 字幕が2行に収まるかを調べる（Layout.tsx の layoutCaption と同じ決まり）: node tools/check-captions.ts
import {SCENES} from '../src/script.ts';
const WIDTH = 1920 - 300 - 100;
for (const scene of SCENES) for (const line of scene.lines) {
  const segments = line.text.match(/[^、。]+[、。]?/g) ?? [line.text];
  let ok = false;
  for (const size of [44, 40, 36, 32]) {
    const max = Math.floor(WIDTH / size);
    const lines: string[] = []; let cur = '';
    for (const seg of segments) { if (cur && (cur + seg).length > max) { lines.push(cur); cur = ''; } cur += seg; }
    if (cur) lines.push(cur);
    if (lines.length <= 2 && lines.every((l) => l.length <= max)) { ok = true; if (size < 40) console.log(scene.id, size, line.text); break; }
  }
  if (!ok) console.log('NG', scene.id, line.text);
}
