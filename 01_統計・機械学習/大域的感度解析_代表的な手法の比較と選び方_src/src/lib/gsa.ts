// 大域的感度解析の6つの手法の計算（回帰・相関、Morris、eFAST、PAWN、DGSM。Sobol は sobol.ts）
// 画面（src/scenes）と事前計算（tools/precompute.ts）の両方から使う
import {mean, variance} from './sobol.ts';

// ---- 入力が6つの例 Y = 2X1 + 1.5X2 + 3X1X3 + 0.3X4 + 0.1X5 + 0.1X6（どれも −1〜1 の一様分布） ----
export const SIX_LINEAR = [2, 1.5, 0, 0.3, 0.1, 0.1];
export const SIX_INTERACTION = 3; // X1 × X3 の係数
export const sixModel = (x: number[]) =>
  SIX_LINEAR.reduce((sum, c, i) => sum + c * x[i], 0) + SIX_INTERACTION * x[0] * x[2];

// 6入力の例の正確な値。U(−1, 1) の分散は 1/3、2つの積の分散は 1/9。
// DGSM は ν_i = E[(∂f/∂x_i)²]。上限は (幅)² ν_i / (π² Var Y)（一様分布のとき。Sobol & Kucherenko 2009）
export const sixExact = () => {
  const parts = SIX_LINEAR.map((c) => (c * c) / 3);
  const interaction = (SIX_INTERACTION * SIX_INTERACTION) / 9;
  const total = parts.reduce((s, v) => s + v, 0) + interaction;
  const first = parts.map((v) => v / total);
  const totalEffect = parts.map((v, i) => (v + (i === 0 || i === 2 ? interaction : 0)) / total);
  // ∂f/∂x1 = 2 + 3x3 → E = 4 + 9/3、∂f/∂x3 = 3x1 → E = 9/3、ほかは係数の2乗
  const nu = SIX_LINEAR.map((c, i) => (i === 0 ? c * c + SIX_INTERACTION ** 2 / 3 : i === 2 ? SIX_INTERACTION ** 2 / 3 : c * c));
  const bound = nu.map((v) => (4 * v) / (Math.PI ** 2 * total));
  return {total, first, totalEffect, nu, bound};
};

// ---- 線形の連立方程式（小さな行列なので、ガウスの消去法で解く） ----
const solve = (matrix: number[][], rhs: number[]) => {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col] / a[col][col];
      for (let c = col; c <= n; c++) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
};

// 最小2乗で y ≈ c0 + Σ c_k x_k を当てはめ、係数と残差を返す
const leastSquares = (columns: number[][], ys: number[]) => {
  const rows = ys.length;
  const design = Array.from({length: rows}, (_, j) => [1, ...columns.map((col) => col[j])]);
  const p = design[0].length;
  const xtx = Array.from({length: p}, (_, a) => Array.from({length: p}, (_, b) => design.reduce((s, row) => s + row[a] * row[b], 0)));
  const xty = Array.from({length: p}, (_, a) => design.reduce((s, row, j) => s + row[a] * ys[j], 0));
  const coef = solve(xtx, xty);
  const residuals = design.map((row, j) => ys[j] - row.reduce((s, v, k) => s + v * coef[k], 0));
  return {coef, residuals};
};

const standardize = (values: number[]) => {
  const m = mean(values);
  const s = Math.sqrt(variance(values));
  return values.map((v) => (v - m) / s);
};

const correlation = (a: number[], b: number[]) => {
  const za = standardize(a);
  const zb = standardize(b);
  return za.reduce((s, v, i) => s + v * zb[i], 0) / a.length;
};

// 順位に変換する（1 から。同じ値はない前提）
export const toRanks = (values: number[]) => {
  const order = values.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const ranks = new Array<number>(values.length);
  order.forEach(([, i], rank) => (ranks[i] = rank + 1));
  return ranks;
};

// 標準化回帰係数（SRC）と決定係数 R²。xs は 1 行が 1 回の計算
export const standardizedRegression = (xs: number[][], ys: number[]) => {
  const d = xs[0].length;
  const columns = Array.from({length: d}, (_, i) => standardize(xs.map((x) => x[i])));
  const zy = standardize(ys);
  const {coef, residuals} = leastSquares(columns, zy);
  const r2 = 1 - variance(residuals) / variance(zy);
  return {src: coef.slice(1), r2};
};

// 偏順位相関係数（PRCC）：順位にしてから、ほかの入力の影響を取り除いた相関
export const partialRankCorrelation = (xs: number[][], ys: number[]) => {
  const d = xs[0].length;
  const rankColumns = Array.from({length: d}, (_, i) => toRanks(xs.map((x) => x[i])));
  const rankY = toRanks(ys);
  return rankColumns.map((col, i) => {
    const others = rankColumns.filter((_, k) => k !== i);
    const residualX = leastSquares(others, col).residuals;
    const residualY = leastSquares(others, rankY).residuals;
    return correlation(residualX, residualY);
  });
};

// ---- Morris 法 ----

// 格子 levels 段（0, 1/(p−1), …, 1）の上を、1つずつ Δ = p / (2(p−1)) 動く道のりを r 本作る（0〜1 の値）
export const morrisTrajectories = (r: number, d: number, levels: number, random: () => number) => {
  const delta = levels / (2 * (levels - 1));
  return Array.from({length: r}, () => {
    const start = Array.from({length: d}, () => Math.floor(random() * levels) / (levels - 1));
    const order = Array.from({length: d}, (_, i) => i).sort(() => random() - 0.5);
    const points = [start];
    for (const i of order) {
      const next = [...points[points.length - 1]];
      next[i] = next[i] + delta <= 1 + 1e-9 ? next[i] + delta : next[i] - delta;
      points.push(next);
    }
    return {points, order};
  });
};

// 道のりから要素効果 EE を求め、μ*（絶対値の平均）、μ（平均）、σ（標準偏差）を返す
export const morrisIndices = (
  trajectories: {points: number[][]; order: number[]}[],
  model: (x: number[]) => number,
  toInput: (u: number[]) => number[],
) => {
  const d = trajectories[0].order.length;
  const effects: number[][] = Array.from({length: d}, () => []);
  for (const {points, order} of trajectories) {
    const outputs = points.map((p) => model(toInput(p)));
    order.forEach((i, step) => {
      const change = points[step + 1][i] - points[step][i];
      effects[i].push((outputs[step + 1] - outputs[step]) / change);
    });
  }
  return {
    effects,
    muStar: effects.map((e) => mean(e.map(Math.abs))),
    mu: effects.map(mean),
    sigma: effects.map((e) => Math.sqrt(e.reduce((s, v) => s + (v - mean(e)) ** 2, 0) / (e.length - 1))),
  };
};

// ---- eFAST（拡張 FAST、Saltelli et al. 1999） ----
export const FAST_HARMONICS = 4; // 調べる高調波の数 M

// 注目する入力 target を高い周波数で、ほかを低い周波数で動かす探索曲線を作り、出力の周波数の成分から指数を求める
export const efast = (
  target: number,
  d: number,
  n: number,
  model: (x: number[]) => number,
  toInput: (u: number[]) => number[],
  random: () => number,
) => {
  const omegaMax = Math.floor((n - 1) / (2 * FAST_HARMONICS));
  const omegaLow = Math.max(1, Math.floor(omegaMax / (2 * FAST_HARMONICS)));
  // ほかの入力の周波数は 1〜omegaLow に散らす
  const others = Array.from({length: d - 1}, (_, k) => 1 + Math.floor((k * (omegaLow - 1)) / Math.max(1, d - 2)));
  const omegas = Array.from({length: d}, (_, i) => (i === target ? omegaMax : others[i < target ? i : i - 1]));
  const phases = Array.from({length: d}, () => 2 * Math.PI * random());
  const s = Array.from({length: n}, (_, j) => (2 * Math.PI * j) / n);
  const unit = s.map((sj) => omegas.map((w, i) => 0.5 + Math.asin(Math.sin(w * sj + phases[i])) / Math.PI));
  const ys = unit.map((u) => model(toInput(u)));
  const average = mean(ys);
  // 周波数 1〜(n−1)/2 のパワー
  const half = Math.floor((n - 1) / 2);
  const power = Array.from({length: half}, (_, k) => {
    const freq = k + 1;
    let a = 0;
    let b = 0;
    ys.forEach((y, j) => {
      a += (y - average) * Math.cos(freq * s[j]);
      b += (y - average) * Math.sin(freq * s[j]);
    });
    a /= n;
    b /= n;
    return a * a + b * b;
  });
  const total = 2 * power.reduce((sum, v) => sum + v, 0);
  const own = 2 * Array.from({length: FAST_HARMONICS}, (_, p) => power[(p + 1) * omegaMax - 1] ?? 0).reduce((x, y) => x + y, 0);
  const low = 2 * power.slice(0, Math.floor(omegaMax / 2)).reduce((sum, v) => sum + v, 0);
  return {omegas, phases, unit, ys, power, first: own / total, totalEffect: 1 - low / total, omegaMax};
};

// ---- PAWN（Pianosi & Wagener 2015） ----

// 出力の累積分布（経験分布）を grid の各点で求める
export const empiricalCdf = (values: number[], grid: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  let k = 0;
  return grid.map((g) => {
    while (k < sorted.length && sorted[k] <= g) k++;
    return k / sorted.length;
  });
};

// 入力 Xi で並べて slices 個の区間に分け、区間ごとの条件付き分布と全体の分布の KS 距離（差の最大）を求める
export const pawn = (xs: number[][], ys: number[], slices: number, grid: number[]) => {
  const d = xs[0].length;
  const overall = empiricalCdf(ys, grid);
  return Array.from({length: d}, (_, i) => {
    const order = xs.map((x, j) => [x[i], j] as const).sort((p, q) => p[0] - q[0]);
    const size = Math.floor(order.length / slices);
    const conditional = Array.from({length: slices}, (_, s) => {
      const members = order.slice(s * size, (s + 1) * size).map(([, j]) => ys[j]);
      const cdf = empiricalCdf(members, grid);
      return {cdf, ks: Math.max(...cdf.map((v, g) => Math.abs(v - overall[g])))};
    });
    const ks = conditional.map((c) => c.ks).sort((a, b) => a - b);
    const median = (ks[Math.floor((slices - 1) / 2)] + ks[Math.ceil((slices - 1) / 2)]) / 2;
    return {conditional, median, max: ks[ks.length - 1], overall};
  });
};

// ---- DGSM（微分にもとづく大域的感度、Sobol & Kucherenko 2009） ----

// ν_i = E[(∂f/∂x_i)²] を、差分で求めた勾配の2乗の平均で推定する。widths は入力の幅（一様分布の b − a）
export const dgsm = (units: number[][], model: (x: number[]) => number, toInput: (u: number[]) => number[], widths: number[]) => {
  const d = units[0].length;
  const step = 1e-5; // 0〜1 の目盛りでの差分の幅
  const ys = units.map((u) => model(toInput(u)));
  const total = variance(ys);
  const nu = Array.from({length: d}, (_, i) =>
    mean(
      units.map((u, j) => {
        const moved = u.map((v, k) => (k === i ? v + step : v));
        const slope = (model(toInput(moved)) - ys[j]) / (step * widths[i]);
        return slope * slope;
      }),
    ),
  );
  return {nu, bound: nu.map((v, i) => (widths[i] ** 2 * v) / (Math.PI ** 2 * total)), total};
};
