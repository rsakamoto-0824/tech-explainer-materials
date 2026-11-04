// nn-math.js — ReLU ネットとガウス過程の計算（NNGP カーネル、NTK、ガウス過程回帰、乱数で作るネット、学習）。
// ブラウザ（window.NNM）と Node（tools/make-data.mjs）の両方で使う。乱数は種を固定するので、何度開いても同じ値になる。
(function (root) {
  // ---- ネットの形 ----
  // f(x) = (σ_v / √H) Σ_j v_j relu(σ_w w_j x + σ_a a_j)。w_j, a_j, v_j は独立な標準正規分布（H は隠れ層の幅）
  const SIGMA_W = 1;
  const SIGMA_A = 1;
  const SIGMA_V2 = 2; // 出力側の重みの分散が 2/H になる（He の初期化と同じ）
  const JITTER = 1e-10; // ノイズなしのカーネル行列を、数値的に解けるようにする小さな値

  // ---- 例のデータ（説明用に式で作った6点。ノイズなし）----
  const DATA_X = [-2.4, -1.5, -0.6, 0.3, 1.2, 2.1];
  const DATA_Y = DATA_X.map((x) => Math.sin(1.3 * x) + 0.25 * x);
  const NOISE_VAR = 0.01; // 第4章（ベイズ推論）で使う観測ノイズの分散
  // 関数を描く点（−4〜4 を 0.05 刻み）
  const GRID_MIN = -4;
  const GRID_MAX = 4;
  const GRID_COUNT = 161;
  const GRID = Array.from({ length: GRID_COUNT }, (_, i) => GRID_MIN + ((GRID_MAX - GRID_MIN) * i) / (GRID_COUNT - 1));

  // ---- 乱数（mulberry32 とボックス＝ミュラー法）----
  function makeRandom(seed) {
    let state = seed >>> 0;
    const uniform = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    const normal = () => {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      let u = 0;
      while (u === 0) u = uniform();
      const radius = Math.sqrt(-2 * Math.log(u));
      const angle = 2 * Math.PI * uniform();
      spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    };
    return { uniform, normal };
  }

  // ---- カーネル ----
  const relu = (u) => (u > 0 ? u : 0);
  // z = (σ_a, σ_w x) の長さと、2つの z のなす角 ψ
  function angleParts(x1, x2) {
    const n1 = Math.hypot(SIGMA_A, SIGMA_W * x1);
    const n2 = Math.hypot(SIGMA_A, SIGMA_W * x2);
    const dot = SIGMA_A * SIGMA_A + SIGMA_W * SIGMA_W * x1 * x2;
    const cos = Math.max(-1, Math.min(1, dot / (n1 * n2)));
    return { n1, n2, dot, cos, psi: Math.acos(cos) };
  }
  // NNGP カーネル K(x, x') = σ_v² E[relu(u) relu(u')]（アークコサイン・カーネル。Cho & Saul 2009）
  function nngp(x1, x2) {
    const { n1, n2, cos, psi } = angleParts(x1, x2);
    return (SIGMA_V2 * n1 * n2 * (Math.sin(psi) + (Math.PI - psi) * cos)) / (2 * Math.PI);
  }
  // NTK Θ(x, x') = K(x, x') ＋ σ_v² (σ_a² ＋ σ_w² x x') E[relu'(u) relu'(u')]（内側の重みとしきい値で微分した分）
  function ntk(x1, x2) {
    const { dot, psi } = angleParts(x1, x2);
    return nngp(x1, x2) + (SIGMA_V2 * dot * (Math.PI - psi)) / (2 * Math.PI);
  }

  // ---- 小さな行列の計算（データは6点なので、素直な実装で足りる）----
  const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  function cholesky(A) {
    const n = A.length;
    const L = A.map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let s = A[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) {
          if (s <= 0) throw new Error('cholesky: 正定値ではありません');
          L[i][i] = Math.sqrt(s);
        } else {
          L[i][j] = s / L[j][j];
        }
      }
    }
    return L;
  }
  function forwardSub(L, b) {
    const x = [];
    for (let i = 0; i < L.length; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
      x.push(s / L[i][i]);
    }
    return x;
  }
  function backSub(L, b) {
    const n = L.length;
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }
  const cholSolve = (L, b) => backSub(L, forwardSub(L, b));
  // 対称行列の固有値分解（ヤコビ法）。vectors[i][k] が k 番目の固有ベクトルの i 成分
  function symmetricEigen(A) {
    const n = A.length;
    const a = A.map((row) => row.slice());
    const v = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
      if (off < 1e-24) break;
      for (let p = 0; p < n; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(a[p][q]) < 1e-300) continue;
          const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = a[k][p];
            const akq = a[k][q];
            a[k][p] = c * akp - s * akq;
            a[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = a[p][k];
            const aqk = a[q][k];
            a[p][k] = c * apk - s * aqk;
            a[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = v[k][p];
            const vkq = v[k][q];
            v[k][p] = c * vkp - s * vkq;
            v[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    return { values: a.map((row, i) => row[i]), vectors: v };
  }

  // ---- ガウス過程回帰（事後分布の平均と標準偏差）----
  // kernelAt(x, x') でカーネルを与える。noise は観測ノイズの分散（0 ならデータ点をちょうど通る）
  function gpPosterior(kernelAt, xs, noise = 0, X = DATA_X, Y = DATA_Y) {
    const K = X.map((a, i) => X.map((b, j) => kernelAt(a, b) + (i === j ? noise + JITTER : 0)));
    const L = cholesky(K);
    const alpha = cholSolve(L, Y);
    const mean = [];
    const sd = [];
    for (const x of xs) {
      const k = X.map((b) => kernelAt(x, b));
      mean.push(dot(k, alpha));
      const w = forwardSub(L, k);
      sd.push(Math.sqrt(Math.max(0, kernelAt(x, x) - dot(w, w))));
    }
    return { mean, sd };
  }
  // 学習の時刻 t での平均 k(x)ᵀ K⁻¹ (I − e^{−K t}) y（勾配流。t → ∞ でガウス過程回帰の平均になる）
  function meanTrajectory(kernelAt, xs, X = DATA_X, Y = DATA_Y) {
    const K = X.map((a) => X.map((b) => kernelAt(a, b)));
    const cross = xs.map((x) => X.map((b) => kernelAt(x, b)));
    return trajectory(K, cross, new Array(X.length).fill(0), new Array(xs.length).fill(0), Y);
  }
  // 線形モデル f = f₀ ＋ (カーネルの方向の修正) を勾配流で学習したときの、時刻 t の関数を返す関数を作る。
  // f_t(x) = f₀(x) ＋ k(x)ᵀ K⁻¹ (I − e^{−K t}) (y − f₀(X))。固有値分解しておけば、どの t でもすぐ計算できる
  function trajectory(K, cross, f0X, f0G, Y) {
    const { values, vectors } = symmetricEigen(K);
    const n = values.length;
    const residual = Y.map((y, i) => y - f0X[i]);
    const projected = values.map((_, k) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += vectors[i][k] * residual[i];
      return s;
    });
    return (t) => {
      const coef = values.map((lambda, k) => projected[k] * (lambda > 1e-14 ? (t === Infinity ? 1 / lambda : -Math.expm1(-lambda * t) / lambda) : t));
      const c = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) c[i] += vectors[i][k] * coef[k];
      return f0G.map((f, g) => f + dot(cross[g], c));
    };
  }

  // ---- 乱数で作るネット ----
  function randomNet(width, random) {
    const w = new Float64Array(width);
    const a = new Float64Array(width);
    const v = new Float64Array(width);
    for (let j = 0; j < width; j++) {
      w[j] = random.normal();
      a[j] = random.normal();
      v[j] = random.normal();
    }
    return { width, w, a, v };
  }
  const outputScale = (width) => Math.sqrt(SIGMA_V2 / width);
  // 隠れユニット j が x で出す値（出力側の重みを掛ける前）
  const unitAt = (net, j, x) => relu(SIGMA_W * net.w[j] * x + SIGMA_A * net.a[j]);
  function netAt(net, x) {
    let s = 0;
    for (let j = 0; j < net.width; j++) s += net.v[j] * unitAt(net, j, x);
    return outputScale(net.width) * s;
  }
  // 隠れ層の出力（倍率 √(σ_v²/H) を含む）。行 = 点、列 = ユニット
  function features(net, xs) {
    const c = outputScale(net.width);
    return xs.map((x) => {
      const row = new Float64Array(net.width);
      for (let j = 0; j < net.width; j++) row[j] = c * unitAt(net, j, x);
      return row;
    });
  }
  // 有限の幅のカーネル K_H(x, x') = Σ_j φ_j(x) φ_j(x')（隠れ層を固定し、最後の層の重みだけを確率変数とみたときの共分散）
  function featureKernels(net, xs, X = DATA_X) {
    const PX = features(net, X);
    const K = PX.map((r1) => PX.map((r2) => dot(r1, r2)));
    const cross = [];
    const diag = [];
    const f0G = [];
    const c = outputScale(net.width);
    const row = new Float64Array(net.width);
    for (const x of xs) {
      for (let j = 0; j < net.width; j++) row[j] = c * unitAt(net, j, x);
      cross.push(PX.map((r) => dot(row, r)));
      diag.push(dot(row, row));
      f0G.push(dot(row, net.v));
    }
    const f0X = PX.map((r) => dot(r, net.v));
    return { K, cross, diag, f0G, f0X };
  }
  // 最後の層だけをベイズ推論したときの事後分布（隠れ層は乱数で固定）。幅 H が広いほど、ガウス過程回帰に近づく
  function featurePosterior(net, xs, noise, X = DATA_X, Y = DATA_Y) {
    const { K, cross, diag } = featureKernels(net, xs, X);
    const L = cholesky(K.map((row, i) => row.map((v, j) => v + (i === j ? noise + JITTER : 0))));
    const alpha = cholSolve(L, Y);
    const mean = cross.map((k) => dot(k, alpha));
    const sd = cross.map((k, g) => {
      const w = forwardSub(L, k);
      return Math.sqrt(Math.max(0, diag[g] - dot(w, w)));
    });
    return { mean, sd };
  }
  // 最後の層だけを勾配流で学習したときの、時刻 t の関数を返す関数（初期値は net.v）
  function lastLayerTrajectory(net, xs, X = DATA_X, Y = DATA_Y) {
    const { K, cross, f0X, f0G } = featureKernels(net, xs, X);
    return trajectory(K, cross, f0X, f0G, Y);
  }
  // 全部の層を勾配降下法で学習する（損失 ½ Σ (f(xᵢ) − yᵢ)²、学習率 eta、steps 回）。net をその場で書きかえ、最後の損失を返す
  function trainFull(net, { eta, steps, X = DATA_X, Y = DATA_Y }) {
    const H = net.width;
    const c = outputScale(H);
    const n = X.length;
    const pre = new Float64Array(n * H);
    const err = new Float64Array(n);
    let loss = 0;
    for (let step = 0; step <= steps; step++) {
      loss = 0;
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < H; j++) {
          const u = SIGMA_W * net.w[j] * X[i] + SIGMA_A * net.a[j];
          pre[i * H + j] = u;
          if (u > 0) s += net.v[j] * u;
        }
        err[i] = c * s - Y[i];
        loss += 0.5 * err[i] * err[i];
      }
      if (step === steps) break;
      for (let j = 0; j < H; j++) {
        let gv = 0;
        let gw = 0;
        let ga = 0;
        for (let i = 0; i < n; i++) {
          const u = pre[i * H + j];
          if (u > 0) {
            gv += err[i] * u;
            const back = err[i] * net.v[j];
            gw += back * X[i];
            ga += back;
          }
        }
        net.v[j] -= eta * c * gv;
        net.w[j] -= eta * c * SIGMA_W * gw;
        net.a[j] -= eta * c * SIGMA_A * ga;
      }
    }
    return loss;
  }

  root.NNM = {
    SIGMA_W, SIGMA_A, SIGMA_V2, DATA_X, DATA_Y, NOISE_VAR, GRID, GRID_MIN, GRID_MAX,
    makeRandom, relu, angleParts, nngp, ntk, dot, cholesky, symmetricEigen,
    gpPosterior, meanTrajectory, trajectory,
    randomNet, outputScale, unitAt, netAt, features, featureKernels, featurePosterior, lastLayerTrajectory, trainFull,
  };
})(typeof window !== 'undefined' ? window : globalThis);
