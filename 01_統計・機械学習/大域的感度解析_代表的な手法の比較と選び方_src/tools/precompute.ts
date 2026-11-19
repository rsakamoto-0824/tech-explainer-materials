// 6つの手法を、同じ石上関数に当てた結果を先に計算しておく: node tools/precompute.ts → src/lib/precomputed.json
// 計算回数は手法ごとに、その手法でよく使う大きさにそろえている（数値は台本の説明と合わせること）
import {writeFileSync} from 'node:fs';
import {dgsm, efast, morrisIndices, morrisTrajectories, partialRankCorrelation, pawn, sixExact, sixModel, standardizedRegression} from '../src/lib/gsa.ts';
import {estimateIndices, ishigami, ishigamiExact, makeRandom, sobolPoints, toIshigamiInput} from '../src/lib/sobol.ts';

const DIMENSIONS = 3;
const REGRESSION_N = 1000; // 回帰・相関の計算回数
const MORRIS_R = 50; // Morris の道のりの本数（計算回数 r(d+1)）
const MORRIS_LEVELS = 4;
const FAST_N = 513; // eFAST の1入力あたりの計算回数（奇数）
const PAWN_N = 2000;
const PAWN_SLICES = 10;
const PAWN_GRID = 120;
const DGSM_N = 512; // DGSM の点の数（差分で計算回数 N(d+1)）
const SOBOL_N = 1024; // Sobol の行列の行の数（計算回数 N(d+2)）
const ISHIGAMI_WIDTH = 2 * Math.PI;

const round = (value: number, digits = 5) => Number(value.toFixed(digits));
const roundAll = (values: number[], digits = 5) => values.map((v) => round(v, digits));

const randomSample = (n: number, seed: number) => {
  const random = makeRandom(seed);
  return Array.from({length: n}, () => Array.from({length: DIMENSIONS}, () => random()));
};

// ---- 回帰・相関 ----
const regressionUnits = randomSample(REGRESSION_N, 101);
const regressionXs = regressionUnits.map(toIshigamiInput);
const regressionYs = regressionXs.map(ishigami);
const {src, r2} = standardizedRegression(regressionXs, regressionYs);
const prcc = partialRankCorrelation(regressionXs, regressionYs);

// ---- Morris ----
const trajectories = morrisTrajectories(MORRIS_R, DIMENSIONS, MORRIS_LEVELS, makeRandom(202));
const morris = morrisIndices(trajectories, ishigami, toIshigamiInput);
// 本数を増やしたときの値（ぶれの確認用）
const morrisLarge = morrisIndices(morrisTrajectories(2000, DIMENSIONS, MORRIS_LEVELS, makeRandom(203)), ishigami, toIshigamiInput);

// ---- eFAST ----
const fastRandom = makeRandom(303);
const fastRuns = Array.from({length: DIMENSIONS}, (_, i) => efast(i, DIMENSIONS, FAST_N, ishigami, toIshigamiInput, fastRandom));

// ---- PAWN ----
const pawnXs = randomSample(PAWN_N, 404).map(toIshigamiInput);
const pawnYs = pawnXs.map(ishigami);
const yMin = Math.min(...pawnYs);
const yMax = Math.max(...pawnYs);
const grid = Array.from({length: PAWN_GRID}, (_, k) => yMin + ((yMax - yMin) * k) / (PAWN_GRID - 1));
const pawnResult = pawn(pawnXs, pawnYs, PAWN_SLICES, grid);

// ---- DGSM ----
const dgsmUnits = sobolPoints(DGSM_N, DIMENSIONS);
const dgsmResult = dgsm(dgsmUnits, ishigami, toIshigamiInput, [ISHIGAMI_WIDTH, ISHIGAMI_WIDTH, ISHIGAMI_WIDTH]);
// 式から求めた ν（確認用）：ν1 = ½E[(1 + b x3⁴)²]、ν2 = a²/2、ν3 = 16b² E[x3⁶] / 2
const b = 0.1;
const pi = Math.PI;
const exactNu = [0.5 * (1 + (2 * b * pi ** 4) / 5 + (b * b * pi ** 8) / 9), 49 / 2, (16 * b * b * pi ** 6) / 7 / 2];
const exact = ishigamiExact();
const exactBound = exactNu.map((v) => (4 * v) / exact.total);
const sixUnits = sobolPoints(DGSM_N, 6);
const sixDgsm = dgsm(sixUnits, sixModel, (u) => u.map((v) => 2 * v - 1), [2, 2, 2, 2, 2, 2]);

// ---- Sobol（行列の列の入れかえ） ----
const sobolUnits = sobolPoints(SOBOL_N, 2 * DIMENSIONS);
const sobolResult = estimateIndices(
  sobolUnits.map((p) => p.slice(0, DIMENSIONS)),
  sobolUnits.map((p) => p.slice(DIMENSIONS)),
  ishigami,
  toIshigamiInput,
);

const output = {
  regression: {n: REGRESSION_N, src: roundAll(src), r2: round(r2), prcc: roundAll(prcc)},
  morris: {
    r: MORRIS_R,
    levels: MORRIS_LEVELS,
    cost: MORRIS_R * (DIMENSIONS + 1),
    muStar: roundAll(morris.muStar),
    mu: roundAll(morris.mu),
    sigma: roundAll(morris.sigma),
    effects: morris.effects.map((e) => roundAll(e, 3)),
  },
  fast: {
    n: FAST_N,
    cost: FAST_N * DIMENSIONS,
    first: roundAll(fastRuns.map((run) => run.first)),
    totalEffect: roundAll(fastRuns.map((run) => run.totalEffect)),
    // 図に描く例：X1 に注目した探索曲線と、出力の周波数の成分
    example: {
      omegas: fastRuns[0].omegas,
      phases: roundAll(fastRuns[0].phases, 6),
      omegaMax: fastRuns[0].omegaMax,
      power: roundAll(fastRuns[0].power, 6),
    },
  },
  pawn: {
    n: PAWN_N,
    slices: PAWN_SLICES,
    grid: roundAll(grid, 4),
    overall: roundAll(pawnResult[0].overall, 4),
    median: roundAll(pawnResult.map((p) => p.median)),
    max: roundAll(pawnResult.map((p) => p.max)),
    ks: pawnResult.map((p) => roundAll(p.conditional.map((c) => c.ks), 4)),
    conditionalX3: pawnResult[2].conditional.map((c) => roundAll(c.cdf, 4)),
    conditionalX2: pawnResult[1].conditional.map((c) => roundAll(c.cdf, 4)),
  },
  dgsm: {
    n: DGSM_N,
    cost: DGSM_N * (DIMENSIONS + 1),
    nu: roundAll(dgsmResult.nu),
    bound: roundAll(dgsmResult.bound),
    exactNu: roundAll(exactNu),
    exactBound: roundAll(exactBound),
    six: {nu: roundAll(sixDgsm.nu), bound: roundAll(sixDgsm.bound), exact: sixExact()},
  },
  sobol: {n: SOBOL_N, cost: SOBOL_N * (DIMENSIONS + 2), first: roundAll(sobolResult.first), totalEffect: roundAll(sobolResult.totalEffect)},
};
writeFileSync(new URL('../src/lib/precomputed.json', import.meta.url), JSON.stringify(output) + '\n');

const f = (values: number[], digits = 3) => values.map((v) => v.toFixed(digits)).join(' ');
console.log('正確な値 S', f(exact.first), 'ST', f(exact.totalEffect), 'Var', exact.total.toFixed(3));
console.log('SRC', f(src), 'R2', r2.toFixed(3), 'PRCC', f(prcc));
console.log('Morris r=50 mu*', f(morris.muStar, 2), 'sigma', f(morris.sigma, 2), 'mu', f(morris.mu, 2));
console.log('Morris r=2000 mu*', f(morrisLarge.muStar, 2), 'sigma', f(morrisLarge.sigma, 2));
console.log('eFAST S', f(output.fast.first), 'ST', f(output.fast.totalEffect), 'omegas', fastRuns[0].omegas.join(','));
console.log('PAWN median', f(output.pawn.median), 'max', f(output.pawn.max));
console.log('DGSM nu', f(dgsmResult.nu, 2), 'exact', f(exactNu, 2), 'bound', f(dgsmResult.bound, 2), 'exact', f(exactBound, 2));
console.log('six DGSM bound', f(sixDgsm.bound), 'exact', f(sixExact().bound), 'ST', f(sixExact().totalEffect));
console.log('Sobol N=1024 S', f(sobolResult.first), 'ST', f(sobolResult.totalEffect));
