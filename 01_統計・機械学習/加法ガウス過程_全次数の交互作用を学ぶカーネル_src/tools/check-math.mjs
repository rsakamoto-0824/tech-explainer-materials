// check-math.mjs — 画面に出す数式の計算を確かめる（node tools/check-math.mjs）。
// ニュートン・ジラールの公式と総当たりの一致、第4章の例の数値、第6章の例の値、計算回数の数値を表示する。
import '../js/add-math.js';

const M = globalThis.ADDM;
const TOLERANCE = 1e-12;

let worst = 0;
const random = M.makeRandom(7);
for (let D = 1; D <= 14; D++) {
  for (let trial = 0; trial < 20; trial++) {
    const z = Array.from({ length: D }, () => random.uniform());
    const byFormula = M.newtonGirard(z).e;
    const byEnumeration = M.elementaryByEnumeration(z);
    byFormula.forEach((value, n) => (worst = Math.max(worst, Math.abs(value - byEnumeration[n]))));
  }
}
console.log(`公式と総当たりの差の最大（D ≤ 14）: ${worst.toExponential(2)}`);
if (worst > TOLERANCE) throw new Error('公式と総当たりが一致しません');

const z = [0.9, 0.6, 0.4, 0.2];
const { s, e } = M.newtonGirard(z);
console.log('第4章の例 s:', s.slice(1).map((v) => v.toFixed(4)).join(', '));
console.log('第4章の例 e:', e.slice(1).map((v) => v.toFixed(4)).join(', '));

console.log('第6章の例 z₂ = exp(−18):', Math.exp(-18).toExponential(2));
for (const D of [4, 8, 20, 30]) {
  console.log(`D = ${D}: 項の数 ${2 ** D - 1}、全部列挙 ${M.enumerationOperations(D)} 回、公式 ${M.newtonGirardOperations(D)} 回`);
}
