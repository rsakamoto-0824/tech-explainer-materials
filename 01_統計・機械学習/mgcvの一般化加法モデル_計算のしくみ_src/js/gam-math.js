// gam-math.js — mgcv の計算の手順を、動画の図のために JavaScript で書き直したもの。
// 基底の行列 X とペナルティの行列 S は mgcv が作ったもの（js/gam-data.js）を使い、ここでは
// 「ペナルティつきの当てはめ」「有効自由度」「GCV・REML」「P-IRLS」「λ のニュートン法」だけを計算する。
// 計算結果が mgcv と一致することは node tools/check-math.mjs で確かめる。ブラウザと Node の両方で読める。
globalThis.GAMM = (() => {
  const LOG_2PI = Math.log(2 * Math.PI);
  const RANK_TOLERANCE = 1e-8; // ペナルティ行列の固有値を「0」とみなす相対的なしきい値
  const JACOBI_SWEEPS = 60;

  // ---- 行列の小道具（行列は配列の配列） ----
  const zeros = (rows, cols) => Array.from({ length: rows }, () => new Array(cols).fill(0));
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const matVec = (A, v) => A.map((row) => dot(row, v));
  // X'WX と X'Wz（w を省くと重みは 1）
  function crossProducts(X, z, w) {
    const p = X[0].length;
    const XtX = zeros(p, p);
    const Xtz = new Array(p).fill(0);
    X.forEach((row, i) => {
      const wi = w ? w[i] : 1;
      for (let a = 0; a < p; a++) {
        const wa = wi * row[a];
        Xtz[a] += wa * z[i];
        for (let b = a; b < p; b++) XtX[a][b] += wa * row[b];
      }
    });
    for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
    return { XtX, Xtz };
  }
  // 対称な正定値行列 A = L L'
  function cholesky(A) {
    const n = A.length;
    const L = zeros(n, n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = A[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (sum <= 0) throw new Error('cholesky: 正定値ではありません');
          L[i][i] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    return L;
  }
  const forwardSolve = (L, b) => {
    const y = new Array(b.length);
    for (let i = 0; i < b.length; i++) {
      let sum = b[i];
      for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
      y[i] = sum / L[i][i];
    }
    return y;
  };
  const backSolve = (L, y) => {
    const n = y.length;
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  };
  const cholSolve = (L, b) => backSolve(L, forwardSolve(L, b));
  const cholLogDet = (L) => 2 * L.reduce((sum, row, i) => sum + Math.log(row[i]), 0);
  // A⁻¹（L から。列ごとに解く）
  function cholInverse(L) {
    const n = L.length;
    const inverse = zeros(n, n);
    for (let j = 0; j < n; j++) {
      const unit = new Array(n).fill(0);
      unit[j] = 1;
      cholSolve(L, unit).forEach((v, i) => (inverse[i][j] = v));
    }
    return inverse;
  }
  // 対称行列の固有値分解（ヤコビ法。行列が小さいので十分）。固有値の小さい順に返す
  function symmetricEigen(input) {
    const n = input.length;
    const A = input.map((row) => row.slice());
    const V = zeros(n, n);
    for (let i = 0; i < n; i++) V[i][i] = 1;
    for (let sweep = 0; sweep < JACOBI_SWEEPS; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
      if (off < 1e-26) break;
      for (let p = 0; p < n; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p];
            const akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k];
            const aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = V[k][p];
            const vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    const order = A.map((row, i) => i).sort((a, b) => A[a][a] - A[b][b]);
    return { values: order.map((i) => A[i][i]), vectors: order.map((i) => V.map((row) => row[i])) };
  }

  // ---- ペナルティ: 項ごとの行列 S_j を、全係数の大きさ p×p の行列 Σ λ_j S_j にまとめる ----
  // off[j] は項 j の最初の係数の位置（R の番号、1 始まり）。mgcv の G$off と同じ
  function penaltyInfo(penalties, offsets, size) {
    return penalties.map((S, j) => {
      const { values } = symmetricEigen(S);
      const largest = Math.max(...values);
      const positive = values.filter((v) => v > largest * RANK_TOLERANCE);
      return { S, start: offsets[j] - 1, rank: positive.length, logDetPlus: positive.reduce((sum, v) => sum + Math.log(v), 0), size };
    });
  }
  function totalPenalty(info, lambdas) {
    const total = zeros(info[0].size, info[0].size);
    info.forEach(({ S, start }, j) => {
      S.forEach((row, a) => row.forEach((v, b) => (total[start + a][start + b] += lambdas[j] * v)));
    });
    return total;
  }

  // ---- ガウス（恒等リンク）の当てはめ: β̂ = (X'X + S_λ)⁻¹ X'y。X'X・X'y・y'y だけあれば足りる ----
  const gaussianStats = (X, y) => {
    const { XtX, Xtz } = crossProducts(X, y);
    return { XtX, Xty: Xtz, yty: dot(y, y), n: y.length };
  };
  function fitGaussian(stats, info, lambdas) {
    const { XtX, Xty, yty, n } = stats;
    const p = Xty.length;
    const S = totalPenalty(info, lambdas);
    const A = XtX.map((row, i) => row.map((v, j) => v + S[i][j]));
    const L = cholesky(A);
    const beta = cholSolve(L, Xty);
    const rss = yty - 2 * dot(beta, Xty) + dot(beta, matVec(XtX, beta));
    const penalty = dot(beta, matVec(S, beta));
    // 有効自由度 = tr(F)、F = (X'X + S_λ)⁻¹ X'X。係数ごとの値は F の対角
    const inverse = cholInverse(L);
    const edfEach = inverse.map((row, i) => dot(row, XtX.map((r) => r[i])));
    const edf = edfEach.reduce((a, b) => a + b, 0);
    const rankTotal = info.reduce((sum, item) => sum + item.rank, 0);
    const nullDim = p - rankTotal; // ペナルティのかからない係数の数 M_p（切片・直線の成分）
    const logDetPenalty = info.reduce((sum, item, j) => sum + item.rank * Math.log(lambdas[j]) + item.logDetPlus, 0);
    // REML（負の対数制限付き尤度。mgcv の gcv.ubre と同じ量）。尺度 φ は式の上で最適な値を入れる
    const scale = (rss + penalty) / (n - nullDim);
    const reml = ((n - nullDim) / 2) * (1 + LOG_2PI + Math.log(scale)) + (cholLogDet(L) - logDetPenalty) / 2;
    const gcv = (n * rss) / (n - edf) ** 2;
    return { beta, rss, penalty, edf, edfEach, scale, reml, gcv, inverse, nullDim };
  }
  // 曲線の標準誤差: sqrt(diag(Xp V Xp'))、V = (X'X + S_λ)⁻¹ φ
  const curveSe = (Xp, inverse, scale) => Xp.map((row) => Math.sqrt(Math.max(0, dot(row, matVec(inverse, row)) * scale)));

  // ---- 縮み方が1本ずつ分かる基底（デムラー・ラインシュの基底）: 係数 k は 1/(1 + λ d_k) 倍に縮む ----
  function shrinkageBasis(stats, S) {
    const L = cholesky(stats.XtX);
    const p = S.length;
    // M = L⁻¹ S L⁻ᵀ
    const half = S.map((row) => forwardSolve(L, row)); // S L⁻ᵀ の転置（S は対称）
    const M = zeros(p, p);
    for (let j = 0; j < p; j++) {
      const column = forwardSolve(L, half.map((row) => row[j]));
      column.forEach((v, i) => (M[i][j] = v));
    }
    for (let i = 0; i < p; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i] = (M[i][j] + M[j][i]) / 2;
    const { values, vectors } = symmetricEigen(M);
    // 元の係数への変換: β = L⁻ᵀ u_k
    const directions = vectors.map((u) => backSolve(L, u));
    const projections = vectors.map((u) => dot(u, forwardSolve(L, stats.Xty))); // ペナルティなしの係数
    return { d: values.map((v) => Math.max(0, v)), directions, projections };
  }

  // ---- P-IRLS（ポアソン・対数リンク）: λ を固定して、重みつきのペナルティつき最小二乗を繰り返す ----
  const PIRLS_TOLERANCE = 1e-7; // mgcv の gam.control(epsilon) の既定値
  const poissonDeviance = (y, mu) => 2 * y.reduce((sum, yi, i) => sum + (yi > 0 ? yi * Math.log(yi / mu[i]) : 0) - (yi - mu[i]), 0);
  function pirlsPoisson(X, y, S, { maxIter = 30 } = {}) {
    let mu = y.map((v) => v + 0.1); // mgcv（poisson()$initialize）と同じ出発点
    let eta = mu.map(Math.log);
    const steps = [{ eta, mu, z: null, w: null, beta: null, deviance: poissonDeviance(y, mu), penalized: null }];
    for (let iter = 1; iter <= maxIter; iter++) {
      const z = eta.map((e, i) => e + (y[i] - mu[i]) / mu[i]); // 作業用の応答
      const w = mu.slice(); // 重み = 1 / (V(μ) g'(μ)²) = μ
      const { XtX, Xtz } = crossProducts(X, z, w);
      const L = cholesky(XtX.map((row, i) => row.map((v, j) => v + S[i][j])));
      const beta = cholSolve(L, Xtz);
      eta = matVec(X, beta);
      mu = eta.map(Math.exp);
      const deviance = poissonDeviance(y, mu);
      const penalized = deviance + dot(beta, matVec(S, beta));
      const previous = steps[steps.length - 1].penalized;
      steps.push({ eta, mu, z, w, beta, deviance, penalized });
      if (previous !== null && Math.abs(penalized - previous) < PIRLS_TOLERANCE * (Math.abs(penalized) + 0.1)) break;
    }
    return steps;
  }

  // ---- λ のニュートン法: ρ = log λ の上で REML を小さくする（微分は差分で求める。mgcv は解析的に求める） ----
  const NEWTON_MAX_STEP = 5; // mgcv の gam.control(newton = list(maxNstep = 5)) と同じ上限
  const NEWTON_DIFF = 1e-4;
  function newtonReml(stats, info, startLambdas, { maxIter = 40, tolerance = 1e-6 } = {}) {
    const value = (rho) => fitGaussian(stats, info, rho.map(Math.exp)).reml;
    const m = startLambdas.length;
    let rho = startLambdas.map(Math.log);
    const path = [{ rho: rho.slice(), reml: value(rho) }];
    for (let iter = 0; iter < maxIter; iter++) {
      const f0 = path[path.length - 1].reml;
      const shifted = (i, hi, j, hj) => {
        const r = rho.slice();
        r[i] += hi;
        if (j !== undefined) r[j] += hj;
        return value(r);
      };
      const gradient = rho.map((_, i) => (shifted(i, NEWTON_DIFF) - shifted(i, -NEWTON_DIFF)) / (2 * NEWTON_DIFF));
      const hessian = zeros(m, m);
      for (let i = 0; i < m; i++) {
        hessian[i][i] = (shifted(i, NEWTON_DIFF) - 2 * f0 + shifted(i, -NEWTON_DIFF)) / NEWTON_DIFF ** 2;
        for (let j = i + 1; j < m; j++) {
          const mixed = (shifted(i, NEWTON_DIFF, j, NEWTON_DIFF) - shifted(i, NEWTON_DIFF, j, -NEWTON_DIFF) - shifted(i, -NEWTON_DIFF, j, NEWTON_DIFF) + shifted(i, -NEWTON_DIFF, j, -NEWTON_DIFF)) / (4 * NEWTON_DIFF ** 2);
          hessian[i][j] = hessian[j][i] = mixed;
        }
      }
      if (Math.max(...gradient.map(Math.abs)) < tolerance * (1 + Math.abs(f0))) break;
      // ヘッセ行列が正定値でないときは、固有値を正に直してから使う（mgcv と同じ考え方）
      const { values, vectors } = symmetricEigen(hessian);
      const floor = Math.max(...values.map(Math.abs)) * 1e-6;
      let step = new Array(m).fill(0);
      values.forEach((v, k) => {
        const along = -dot(vectors[k], gradient) / Math.max(Math.abs(v), floor);
        vectors[k].forEach((component, i) => (step[i] += along * component));
      });
      const longest = Math.max(...step.map(Math.abs));
      if (longest > NEWTON_MAX_STEP) step = step.map((v) => (v * NEWTON_MAX_STEP) / longest);
      // 良くならなければ歩幅を半分にする
      let next = rho.map((v, i) => v + step[i]);
      let fNext = value(next);
      for (let half = 0; half < 30 && fNext > f0; half++) {
        step = step.map((v) => v / 2);
        next = rho.map((v, i) => v + step[i]);
        fNext = value(next);
      }
      rho = next;
      path.push({ rho: rho.slice(), reml: fNext, gradient });
    }
    return path;
  }

  return {
    zeros, dot, matVec, crossProducts, cholesky, cholSolve, cholLogDet, cholInverse, symmetricEigen,
    penaltyInfo, totalPenalty, gaussianStats, fitGaussian, curveSe, shrinkageBasis,
    poissonDeviance, pirlsPoisson, newtonReml,
  };
})();
