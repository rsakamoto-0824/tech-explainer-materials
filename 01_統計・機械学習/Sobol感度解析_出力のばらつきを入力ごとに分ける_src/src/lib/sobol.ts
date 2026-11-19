// Sobol 感度解析の計算：例の関数、乱数、Sobol 列、指数の推定（Saltelli 2010 の一次効果、Jansen 1999 の総合効果）
// 画面（src/scenes）と事前計算（tools/precompute.ts）の両方から使う

// ---- 例の関数 ----

// 石上関数の係数（Ishigami & Homma 1990 の標準の値）
export const ISHIGAMI_A = 7;
export const ISHIGAMI_B = 0.1;

// 石上関数。入力はどれも −π〜π の一様分布
export const ishigami = ([x1, x2, x3]: number[]) =>
  Math.sin(x1) + ISHIGAMI_A * Math.sin(x2) ** 2 + ISHIGAMI_B * x3 ** 4 * Math.sin(x1);

// 石上関数の分散の内訳（式から求めた正確な値）
export const ishigamiExact = () => {
  const a = ISHIGAMI_A;
  const b = ISHIGAMI_B;
  const pi4 = Math.PI ** 4;
  const v1 = 0.5 * (1 + (b * pi4) / 5) ** 2;
  const v2 = a ** 2 / 8;
  const v13 = (b ** 2 * Math.PI ** 8 * 8) / 225;
  const total = v1 + v2 + v13;
  return {
    total,
    v1,
    v2,
    v13,
    first: [v1 / total, v2 / total, 0],
    totalEffect: [(v1 + v13) / total, v2 / total, v13 / total],
    s13: v13 / total,
  };
};

// Sobol の g 関数（入力は 0〜1 の一様分布）。a が小さい入力ほど効く
export const G_COEFFICIENTS = [0, 1, 4.5, 9, 99, 99];
export const gFunctionExact = (a: number[] = G_COEFFICIENTS) => {
  const parts = a.map((ai) => 1 / (3 * (1 + ai) ** 2));
  const total = parts.reduce((product, v) => product * (1 + v), 1) - 1;
  const first = parts.map((v) => v / total);
  const totalEffect = parts.map((v, i) => (v * parts.reduce((product, w, j) => (j === i ? product : product * (1 + w)), 1)) / total);
  return {total, first, totalEffect};
};

// ---- 乱数 ----

// 種を固定できる乱数（mulberry32）
export const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- Sobol 列 ----

// 方向数（Joe & Kuo の new-joe-kuo-6.21201 の 2〜6 次元。1 次元目は 2 進の桁を反転させた並び）
const SOBOL_PARAMETERS: {s: number; a: number; m: number[]}[] = [
  {s: 1, a: 0, m: [1]},
  {s: 2, a: 1, m: [1, 3]},
  {s: 3, a: 1, m: [1, 3, 1]},
  {s: 3, a: 2, m: [1, 1, 1]},
  {s: 4, a: 1, m: [1, 1, 3, 3]},
];
export const SOBOL_MAX_DIMENSIONS = SOBOL_PARAMETERS.length + 1;
const BITS = 32;

const directionNumbers = (dimension: number) => {
  const v = new Array<number>(BITS + 1).fill(0);
  if (dimension === 0) {
    for (let k = 1; k <= BITS; k++) v[k] = (1 << (BITS - k)) >>> 0;
    return v;
  }
  const {s, a, m} = SOBOL_PARAMETERS[dimension - 1];
  for (let k = 1; k <= s; k++) v[k] = (m[k - 1] << (BITS - k)) >>> 0;
  for (let k = s + 1; k <= BITS; k++) {
    let value = (v[k - s] ^ (v[k - s] >>> s)) >>> 0;
    for (let j = 1; j < s; j++) if ((a >>> (s - 1 - j)) & 1) value = (value ^ v[k - j]) >>> 0;
    v[k] = value;
  }
  return v;
};

// count 個の点（dimensions 次元、0〜1）。最初の 0 の点は飛ばす。shift を渡すと、各次元の桁をずらす（デジタルシフト）
export const sobolPoints = (count: number, dimensions: number, shift?: number[]) => {
  if (dimensions > SOBOL_MAX_DIMENSIONS) throw new Error(`Sobol 列は ${SOBOL_MAX_DIMENSIONS} 次元まで`);
  const tables = Array.from({length: dimensions}, (_, d) => directionNumbers(d));
  const state = new Array<number>(dimensions).fill(0);
  const points: number[][] = [];
  for (let index = 1; index <= count; index++) {
    // index − 1 の 2 進で、いちばん下の 0 の桁（グレイコードで変わる桁）
    let c = 1;
    let value = index - 1;
    while (value & 1) {
      value >>>= 1;
      c++;
    }
    for (let d = 0; d < dimensions; d++) state[d] = (state[d] ^ tables[d][c]) >>> 0;
    points.push(state.map((x, d) => (((shift ? x ^ shift[d] : x) >>> 0) + 0.5) / 4294967296));
  }
  return points;
};

// ---- 指数の推定 ----

export type Indices = {first: number[]; totalEffect: number[]};

// 0〜1 の点を、石上関数の入力（−π〜π）にする
export const toIshigamiInput = (unit: number[]) => unit.map((u) => -Math.PI + 2 * Math.PI * u);

// 行列 A・B（unitA, unitB は 0〜1 の値）から、一次効果と総合効果を推定する。
// 出力は平均を引いてから使う（平均の大きい出力でも一次効果がずれないように）
export const estimateIndices = (
  unitA: number[][],
  unitB: number[][],
  model: (x: number[]) => number,
  toInput: (u: number[]) => number[],
): Indices & {outputsA: number[]; outputsB: number[]; outputsAB: number[][]} => {
  const d = unitA[0].length;
  const outputsA = unitA.map((row) => model(toInput(row)));
  const outputsB = unitB.map((row) => model(toInput(row)));
  const outputsAB = Array.from({length: d}, (_, i) =>
    unitA.map((row, j) => model(toInput(row.map((value, k) => (k === i ? unitB[j][i] : value))))),
  );
  return {...indicesFromOutputs(outputsA, outputsB, outputsAB), outputsA, outputsB, outputsAB};
};

// 出力（f(A)、f(B)、f(AB_i)）から指数を計算する。rows を渡すと、その行だけを使う（ブートストラップ用）
export const indicesFromOutputs = (outputsA: number[], outputsB: number[], outputsAB: number[][], rows?: number[]): Indices => {
  const pick = rows ?? outputsA.map((_, j) => j);
  const n = pick.length;
  const mean = pick.reduce((sum, j) => sum + outputsA[j] + outputsB[j], 0) / (2 * n);
  const variance = pick.reduce((sum, j) => sum + (outputsA[j] - mean) ** 2 + (outputsB[j] - mean) ** 2, 0) / (2 * n);
  const first = outputsAB.map(
    (ab) => pick.reduce((sum, j) => sum + (outputsB[j] - mean) * (ab[j] - outputsA[j]), 0) / n / variance,
  );
  const totalEffect = outputsAB.map((ab) => pick.reduce((sum, j) => sum + (outputsA[j] - ab[j]) ** 2, 0) / (2 * n) / variance);
  return {first, totalEffect};
};

// ---- 散布図の区間ごとの平均 ----

// xs を lo〜hi の bins 個の区間に分け、区間ごとの ys の平均を返す
export const binMeans = (xs: number[], ys: number[], lo: number, hi: number, bins: number) => {
  const sums = new Array<number>(bins).fill(0);
  const counts = new Array<number>(bins).fill(0);
  xs.forEach((x, i) => {
    const index = Math.min(bins - 1, Math.max(0, Math.floor(((x - lo) / (hi - lo)) * bins)));
    sums[index] += ys[i];
    counts[index]++;
  });
  return sums.map((sum, i) => ({center: lo + ((i + 0.5) * (hi - lo)) / bins, mean: counts[i] ? sum / counts[i] : 0, count: counts[i]}));
};

export const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
export const variance = (values: number[]) => {
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
};
