// check-math.mjs — 動画の数値を確かめる（node tools/check-math.mjs）。
// 公式・積の方法・総当たりの一致と、第6章の桁落ちの実験の数値を表示する。
import '../js/ng-math.js';

const M = globalThis.NGM;
const TOLERANCE = 1e-10;
let worst = 0;
const random = M.makeRandom(7);
for (let D = 1; D <= 12; D++) {
  const z = Array.from({ length: D }, () => random());
  const a = M.newtonGirard(z);
  const b = M.byProduct(z);
  const c = M.byEnumeration(z);
  a.forEach((v, n) => (worst = Math.max(worst, Math.abs(v - c[n]), Math.abs(b[n] - c[n]))));
}
console.log(`公式・積・総当たりの差の最大（D ≤ 12）: ${worst.toExponential(2)}`);
if (worst > TOLERANCE) throw new Error('3つの計算が一致しません');

const worstError = (z, method, order) => {
  const exact = M.exactElementary(z, order);
  const approx = method(z, order);
  let w = 0;
  for (let n = 1; n <= order; n++) w = Math.max(w, M.relativeError(approx[n], exact[n]));
  return w;
};
const TRIALS = 10;
for (const D of [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]) {
  let a = 0;
  let b = 0;
  let c = 0;
  for (let t = 0; t < TRIALS; t++) {
    const r = M.makeRandom(1000 * D + t);
    const z = Array.from({ length: D }, () => r());
    a = Math.max(a, worstError(z, M.newtonGirard, D));
    b = Math.max(b, worstError(z, M.byProduct, D));
    c = Math.max(c, worstError(z, M.newtonGirard, Math.min(10, D)));
  }
  console.log(`D=${D}: 公式 ${a.toExponential(1)}、積 ${b.toExponential(1)}、公式を10次まで ${c.toExponential(1)}`);
}
