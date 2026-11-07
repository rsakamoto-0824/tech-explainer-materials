// opt-math.js — 勾配降下法、ニュートン法、BFGS、L-BFGS と、強いウルフ条件の直線探索。
// 動画の図と数値はすべてここで計算する。乱数は使わない（同じ入力なら必ず同じ結果）。
// node からも読めるように、window が無ければ globalThis に置く（tools/check-math.mjs で確かめる）。
(typeof window !== 'undefined' ? window : globalThis).OPTM = (() => {
  // ---- ベクトルの計算 ----
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const add = (a, b, k = 1) => a.map((v, i) => v + k * b[i]);
  const scale = (a, k) => a.map((v) => v * k);
  const norm = (a) => Math.sqrt(dot(a, a));
  const matVec = (A, v) => A.map((row) => dot(row, v));
  const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const outer = (a, b) => a.map((x) => b.map((y) => x * y));
  const matAdd = (A, B, k = 1) => A.map((row, i) => row.map((v, j) => v + k * B[i][j]));
  const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, v, k) => sum + v * B[k][j], 0)));
  const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
  function solve(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      for (let r = col + 1; r < n; r++) {
        const factor = M[r][col] / M[col][col];
        for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n];
      for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
      x[i] = sum / M[i][i];
    }
    return x;
  }

  // ---- 試す関数 ----
  // 2次関数 f(x) = ½ xᵀ A x
  const quadratic = (A) => ({
    f: (x) => 0.5 * dot(x, matVec(A, x)),
    g: (x) => matVec(A, x),
    h: () => A,
  });
  // 向き theta の細長い谷（固有値 curvature と 1）
  function valley(curvature, theta) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return quadratic([
      [curvature * c * c + s * s, (curvature - 1) * c * s],
      [(curvature - 1) * c * s, curvature * s * s + c * c],
    ]);
  }
  // ローゼンブロック関数 f = (1 − x)² + 100 (y − x²)²
  const rosenbrock = {
    f: ([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    g: ([x, y]) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
    h: ([x, y]) => [
      [2 - 400 * (y - x * x) + 800 * x * x, -400 * x],
      [-400 * x, 200],
    ],
  };
  // n 次元に鎖のようにつないだローゼンブロック関数
  const chainedRosenbrock = (n) => ({
    f: (x) => {
      let sum = 0;
      for (let i = 0; i + 1 < n; i++) sum += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
      return sum;
    },
    g: (x) => {
      const out = new Array(n).fill(0);
      for (let i = 0; i + 1 < n; i++) {
        const t = x[i + 1] - x[i] * x[i];
        out[i] += -400 * x[i] * t - 2 * (1 - x[i]);
        out[i + 1] += 200 * t;
      }
      return out;
    },
  });
  // 固有値を対数等間隔に並べた n 次元の2次関数（対角行列）
  function spreadQuadratic(n, conditionNumber) {
    const lambda = Array.from({ length: n }, (_, i) => conditionNumber ** (i / (n - 1)));
    return {
      lambda,
      f: (x) => 0.5 * x.reduce((sum, v, i) => sum + lambda[i] * v * v, 0),
      g: (x) => x.map((v, i) => lambda[i] * v),
    };
  }

  // ---- 強いウルフ条件の直線探索（ノセダル・ライト『数値最適化』の算法 3.5, 3.6）----
  const C1 = 1e-4;
  const C2 = 0.9;
  const MAX_TRIALS = 30;
  function lineSearch(problem, x, direction, { f0, g0, first = 1, c1 = C1, c2 = C2, counter }) {
    const slope0 = dot(g0, direction);
    const evaluate = (alpha) => {
      const point = add(x, direction, alpha);
      const gradient = problem.g(point);
      counter.value += 1;
      return { alpha, f: problem.f(point), slope: dot(gradient, direction), point, gradient };
    };
    const zoom = (lo, hi) => {
      let best = lo;
      for (let i = 0; i < MAX_TRIALS; i++) {
        const trial = evaluate((lo.alpha + hi.alpha) / 2);
        if (trial.f > f0 + c1 * trial.alpha * slope0 || trial.f >= lo.f) {
          hi = trial;
        } else {
          if (Math.abs(trial.slope) <= -c2 * slope0) return trial;
          if (trial.slope * (hi.alpha - lo.alpha) >= 0) hi = lo;
          lo = trial;
          best = trial;
        }
      }
      return best.point ? best : lo;
    };
    let previous = { alpha: 0, f: f0, slope: slope0, point: x, gradient: g0 };
    let alpha = first;
    for (let i = 0; i < MAX_TRIALS; i++) {
      const trial = evaluate(alpha);
      if (trial.f > f0 + c1 * alpha * slope0 || (i > 0 && trial.f >= previous.f)) return zoom(previous, trial);
      if (Math.abs(trial.slope) <= -c2 * slope0) return trial;
      if (trial.slope >= 0) return zoom(trial, previous);
      previous = trial;
      alpha *= 2;
    }
    return previous;
  }

  // ---- 各手法: 結果は { path: 点の列, values: f の列, gradients: 勾配の大きさの列, evaluations: 勾配の計算回数 } ----
  function record(start, problem) {
    const g = problem.g(start);
    return { path: [start], values: [problem.f(start)], gradients: [norm(g)], evaluations: 1 };
  }
  function gradientDescent(problem, start, { iterations = 2000, tolerance = 1e-8, c2 = 0.1, first = 1 } = {}) {
    const out = record(start, problem);
    const counter = { value: 1 };
    let x = start;
    let f = problem.f(x);
    let g = problem.g(x);
    let step = first;
    for (let k = 0; k < iterations && norm(g) > tolerance; k++) {
      const found = lineSearch(problem, x, scale(g, -1), { f0: f, g0: g, first: step, c2, counter });
      x = found.point;
      f = found.f;
      g = found.gradient;
      step = found.alpha;
      out.path.push(x);
      out.values.push(f);
      out.gradients.push(norm(g));
    }
    out.evaluations = counter.value;
    return out;
  }
  // 学習率を固定した勾配降下法（2次関数の説明に使う）
  function fixedStepDescent(problem, start, rate, iterations) {
    const out = record(start, problem);
    let x = start;
    for (let k = 0; k < iterations; k++) {
      x = add(x, problem.g(x), -rate);
      out.path.push(x);
      out.values.push(problem.f(x));
      out.gradients.push(norm(problem.g(x)));
    }
    out.evaluations = iterations + 1;
    return out;
  }
  function newton(problem, start, { iterations = 100, tolerance = 1e-8 } = {}) {
    const out = record(start, problem);
    const counter = { value: 1 };
    let x = start;
    let f = problem.f(x);
    let g = problem.g(x);
    for (let k = 0; k < iterations && norm(g) > tolerance; k++) {
      const direction = solve(problem.h(x), scale(g, -1));
      const descent = dot(direction, g) < 0;
      const found = lineSearch(problem, x, descent ? direction : scale(g, -1), { f0: f, g0: g, c2: 0.9, counter });
      x = found.point;
      f = found.f;
      g = found.gradient;
      out.path.push(x);
      out.values.push(f);
      out.gradients.push(norm(g));
    }
    out.evaluations = counter.value;
    return out;
  }
  // BFGS の逆ヘッセ行列の更新
  function bfgsUpdate(H, s, y) {
    const n = s.length;
    const rho = 1 / dot(y, s);
    const I = identity(n);
    const left = matAdd(I, outer(s, y), -rho);
    const right = matAdd(I, outer(y, s), -rho);
    return matAdd(matMul(matMul(left, H), right), outer(s, s), rho);
  }
  function bfgs(problem, start, { iterations = 500, tolerance = 1e-8, keepMatrices = false } = {}) {
    const n = start.length;
    const out = record(start, problem);
    const counter = { value: 1 };
    let H = identity(n);
    let x = start;
    let f = problem.f(x);
    let g = problem.g(x);
    out.matrices = keepMatrices ? [H] : null;
    for (let k = 0; k < iterations && norm(g) > tolerance; k++) {
      const direction = scale(matVec(H, g), -1);
      const found = lineSearch(problem, x, direction, { f0: f, g0: g, first: 1, counter });
      const s = add(found.point, x, -1);
      const y = add(found.gradient, g, -1);
      // 最初の1回だけ、H の大きさを勾配の変化に合わせる（ノセダル・ライトの式 6.20）
      if (k === 0) H = scale(identity(n).flat(), dot(s, y) / dot(y, y)).reduce((rows, v, i) => (i % n ? rows[rows.length - 1].push(v) : rows.push([v]), rows), []);
      if (dot(s, y) > 1e-14) H = bfgsUpdate(H, s, y);
      x = found.point;
      f = found.f;
      g = found.gradient;
      out.path.push(x);
      out.values.push(f);
      out.gradients.push(norm(g));
      if (keepMatrices) out.matrices.push(H);
    }
    out.evaluations = counter.value;
    return out;
  }
  // 2ループ再帰: 記憶した組 pairs = [{ s, y }, …]（古い順）から H g を求める
  function twoLoop(gradient, pairs, { trace = null } = {}) {
    let q = [...gradient];
    const alphas = new Array(pairs.length);
    if (trace) trace.push({ phase: 'start', vector: [...q] });
    for (let i = pairs.length - 1; i >= 0; i--) {
      const { s, y } = pairs[i];
      const rho = 1 / dot(y, s);
      alphas[i] = rho * dot(s, q);
      q = add(q, y, -alphas[i]);
      if (trace) trace.push({ phase: 'back', index: i, alpha: alphas[i], vector: [...q] });
    }
    const last = pairs[pairs.length - 1];
    const gamma = last ? dot(last.s, last.y) / dot(last.y, last.y) : 1;
    let r = scale(q, gamma);
    if (trace) trace.push({ phase: 'scale', gamma, vector: [...r] });
    for (let i = 0; i < pairs.length; i++) {
      const { s, y } = pairs[i];
      const rho = 1 / dot(y, s);
      const beta = rho * dot(y, r);
      r = add(r, s, alphas[i] - beta);
      if (trace) trace.push({ phase: 'forward', index: i, beta, vector: [...r] });
    }
    return r;
  }
  function lbfgs(problem, start, { memory = 10, iterations = 5000, tolerance = 1e-8, keepPairs = false } = {}) {
    const out = record(start, problem);
    const counter = { value: 1 };
    const pairs = [];
    let x = start;
    let f = problem.f(x);
    let g = problem.g(x);
    for (let k = 0; k < iterations && norm(g) > tolerance; k++) {
      const direction = scale(twoLoop(g, pairs), -1);
      const found = lineSearch(problem, x, direction, { f0: f, g0: g, first: k === 0 ? Math.min(1, 1 / norm(g)) : 1, counter });
      const s = add(found.point, x, -1);
      const y = add(found.gradient, g, -1);
      if (dot(s, y) > 1e-14) {
        pairs.push({ s, y });
        if (pairs.length > memory) pairs.shift();
      }
      x = found.point;
      f = found.f;
      g = found.gradient;
      out.path.push(x);
      out.values.push(f);
      out.gradients.push(norm(g));
    }
    out.evaluations = counter.value;
    if (keepPairs) out.pairs = pairs.map((p) => ({ s: [...p.s], y: [...p.y] }));
    return out;
  }

  return {
    dot, add, scale, norm, matVec, identity, outer, matAdd, matMul, transpose, solve,
    quadratic, valley, rosenbrock, chainedRosenbrock, spreadQuadratic,
    lineSearch, gradientDescent, fixedStepDescent, newton, bfgs, bfgsUpdate, twoLoop, lbfgs,
    C1, C2,
  };
})();
