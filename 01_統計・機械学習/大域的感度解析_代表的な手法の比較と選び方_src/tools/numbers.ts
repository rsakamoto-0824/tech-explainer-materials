// 台本（src/script.ts）に書く数値を表示する: node tools/numbers.ts
import {ISHIGAMI, PRECOMPUTED as R, SIX} from '../src/lib/data.ts';
const f = (values: number[], d = 2) => values.map((v) => v.toFixed(d)).join(' ');
console.log('石上 正確な値 一次', f(ISHIGAMI.first), '総合', f(ISHIGAMI.totalEffect));
console.log('SRC', f(R.regression.src), 'R2', R.regression.r2.toFixed(2), 'PRCC', f(R.regression.prcc));
console.log(`Morris ${R.morris.r}本 ${R.morris.cost}回 μ*`, f(R.morris.muStar, 1), 'σ', f(R.morris.sigma, 1));
console.log(`eFAST ${R.fast.cost}回 S`, f(R.fast.first), 'ST', f(R.fast.totalEffect));
console.log(`Sobol ${R.sobol.cost}回 S`, f(R.sobol.first), 'ST', f(R.sobol.totalEffect));
console.log(`PAWN ${R.pawn.n}点 中央値`, f(R.pawn.median));
console.log(`DGSM ${R.dgsm.cost}回 上限`, f(R.dgsm.bound, 1), '6入力の上限', f(R.dgsm.six.bound, 3), '6入力の総合効果', f(SIX.totalEffect, 3));
