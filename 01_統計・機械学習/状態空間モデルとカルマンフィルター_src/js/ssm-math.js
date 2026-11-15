// ssm-math.js — 状態空間モデルとカルマンフィルターの計算（3本の動画で共通）。
// 画面に出す数値は、すべてここで計算した値を使う。乱数は種を固定しているので、何度開いても同じ絵になる。
// tools/check-math.mjs が、1次元の式と行列の式が同じ答えになることなどを確かめる。
window.SSM = (() => {
  // ---- 種を固定した乱数 ----
  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 標準正規分布（平均 0、分散 1）の乱数を count 個（ボックス・ミュラー法）
  function standardNormals(count, seed) {
    const random = seededRandom(seed);
    const out = [];
    while (out.length < count) {
      const u1 = Math.max(random(), 1e-12);
      const u2 = random();
      const radius = Math.sqrt(-2 * Math.log(u1));
      out.push(radius * Math.cos(2 * Math.PI * u2), radius * Math.sin(2 * Math.PI * u2));
    }
    return out.slice(0, count);
  }
  function uniforms(count, seed) {
    const random = seededRandom(seed);
    return Array.from({ length: count }, () => random());
  }

  const linspace = (a, b, count) => Array.from({ length: count }, (_, i) => a + ((b - a) * i) / (count - 1));
  const normalPdf = (x, mean, variance) => Math.exp(-((x - mean) ** 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const variance = (values) => {
    const m = mean(values);
    return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  };
  const rmse = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length);

  // ---- 小さな行列の計算（配列の配列。状態は多くても2次元なので、分かりやすさを優先する） ----
  const zeros = (rows, cols) => Array.from({ length: rows }, () => new Array(cols).fill(0));
  const identity = (n) => zeros(n, n).map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
  const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
  const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, a, k) => sum + a * B[k][j], 0)));
  const matAdd = (A, B) => A.map((row, i) => row.map((a, j) => a + B[i][j]));
  const matSub = (A, B) => A.map((row, i) => row.map((a, j) => a - B[i][j]));
  const matVec = (A, v) => A.map((row) => row.reduce((sum, a, j) => sum + a * v[j], 0));
  const vecAdd = (a, b) => a.map((v, i) => v + b[i]);
  const vecSub = (a, b) => a.map((v, i) => v - b[i]);
  const symmetrize = (A) => A.map((row, i) => row.map((a, j) => (a + A[j][i]) / 2));
  // 掃き出し法で、逆行列と行列式をまとめて求める
  function inverseAndDet(A) {
    const n = A.length;
    const work = A.map((row, i) => [...row, ...identity(n)[i]]);
    let det = 1;
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++) if (Math.abs(work[row][col]) > Math.abs(work[pivot][col])) pivot = row;
      if (Math.abs(work[pivot][col]) < 1e-300) throw new Error('逆行列を求められません（行列が特異）');
      if (pivot !== col) {
        [work[pivot], work[col]] = [work[col], work[pivot]];
        det = -det;
      }
      const scale = work[col][col];
      det *= scale;
      work[col] = work[col].map((v) => v / scale);
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = work[row][col];
        if (factor !== 0) work[row] = work[row].map((v, j) => v - factor * work[col][j]);
      }
    }
    return { inverse: work.map((row) => row.slice(n)), det };
  }
  const inverse = (A) => inverseAndDet(A).inverse;

  // ---- モデル（F, H, Q, R の組） ----
  // ローカルレベルモデル: 状態 = 前の状態 + ノイズ、観測 = 状態 + ノイズ
  const localLevelModel = (q, r) => ({ F: [[1]], H: [[1]], Q: [[q]], R: [[r]] });
  // 等速モデル: 状態 = [位置, 速度]。速度にだけノイズが入り、位置だけを観測する
  const constantVelocityModel = (dt, qVelocity, r) => ({ F: [[1, dt], [0, 1]], H: [[1, 0]], Q: [[0, 0], [0, qVelocity]], R: [[r]] });

  // ---- データを作る（シミュレーション） ----
  function simulateLocalLevel({ count, q, r, x0, seed }) {
    const w = standardNormals(count, seed);
    const v = standardNormals(count, seed + 1000);
    const x = [];
    const y = [];
    let state = x0;
    for (let t = 0; t < count; t++) {
      state += Math.sqrt(q) * w[t];
      x.push(state);
      y.push(state + Math.sqrt(r) * v[t]);
    }
    return { x, y, w: w.map((z) => Math.sqrt(q) * z), v: v.map((z) => Math.sqrt(r) * z) };
  }
  function simulateConstantVelocity({ count, dt, qVelocity, r, p0, v0, seed }) {
    const w = standardNormals(count, seed);
    const noise = standardNormals(count, seed + 1000);
    const position = [];
    const velocity = [];
    const y = [];
    let p = p0;
    let v = v0;
    for (let t = 0; t < count; t++) {
      p += dt * v; // 位置は「前の時刻の速度」で進む
      v += Math.sqrt(qVelocity) * w[t];
      position.push(p);
      velocity.push(v);
      y.push(p + Math.sqrt(r) * noise[t]);
    }
    return { position, velocity, y };
  }

  // ---- カルマンフィルター（1次元。式が見える形で書く） ----
  // ys の中の null は欠測で、その時刻は更新を飛ばす（予測だけ）
  function filter1d(ys, { q, r, m0, p0 }) {
    const out = { predMean: [], predVar: [], mean: [], variance: [], gain: [], innovation: [], innovationVar: [], logLik: 0 };
    let m = m0;
    let p = p0;
    for (const y of ys) {
      // 予測: 平均はそのまま、分散は Q だけ増える
      const mPred = m;
      const pPred = p + q;
      const s = pPred + r; // 予測した観測の分散
      out.predMean.push(mPred);
      out.predVar.push(pPred);
      out.innovationVar.push(s);
      if (y === null) {
        m = mPred;
        p = pPred;
        out.gain.push(null);
        out.innovation.push(null);
      } else {
        // 更新: ゲイン K で、観測とのずれを足す
        const k = pPred / s;
        const e = y - mPred;
        m = mPred + k * e;
        p = (1 - k) * pPred;
        out.gain.push(k);
        out.innovation.push(e);
        out.logLik += -0.5 * (Math.log(2 * Math.PI * s) + (e * e) / s);
      }
      out.mean.push(m);
      out.variance.push(p);
    }
    return out;
  }
  // ローカルレベルモデルで、ゲインが落ち着く値（定常ゲイン）。Q/R の比だけで決まる
  function steadyGain(q, r) {
    const ratio = q / r;
    return (-ratio + Math.sqrt(ratio * ratio + 4 * ratio)) / 2;
  }

  // ---- カルマンフィルター（行列の式。5本の式をそのまま書く） ----
  // ys[t] は観測のベクトル（配列）。null なら欠測
  function kalmanFilter(ys, { F, H, Q, R, m0, P0 }) {
    const Ft = transpose(F);
    const Ht = transpose(H);
    const I = identity(m0.length);
    let x = m0.slice();
    let P = P0;
    let logLik = 0;
    const steps = ys.map((y) => {
      const xPred = matVec(F, x); // ① 状態の予測
      const PPred = matAdd(matMul(matMul(F, P), Ft), Q); // ② 共分散の予測
      const yPred = matVec(H, xPred);
      const S = matAdd(matMul(matMul(H, PPred), Ht), R);
      if (y === null) {
        x = xPred;
        P = PPred;
        return { xPred, PPred, x, P, K: null, innovation: null, S, yPred };
      }
      const { inverse: SInv, det } = inverseAndDet(S);
      const K = matMul(matMul(PPred, Ht), SInv); // ③ カルマンゲイン
      const innovation = vecSub(y, yPred);
      x = vecAdd(xPred, matVec(K, innovation)); // ④ 状態の更新
      P = symmetrize(matMul(matSub(I, matMul(K, H)), PPred)); // ⑤ 共分散の更新
      const weighted = matVec(SInv, innovation);
      const quad = innovation.reduce((sum, e, i) => sum + e * weighted[i], 0);
      logLik += -0.5 * (y.length * Math.log(2 * Math.PI) + Math.log(det) + quad);
      return { xPred, PPred, x, P, K, innovation, S, yPred };
    });
    return { steps, logLik };
  }

  // ---- 平滑化（RTS スムーザー）: フィルターの結果を、最後の時刻から前へ戻りながら直す ----
  function rtsSmoother(steps, F) {
    const Ft = transpose(F);
    const last = steps.length - 1;
    const xs = new Array(steps.length);
    const Ps = new Array(steps.length);
    xs[last] = steps[last].x;
    Ps[last] = steps[last].P;
    for (let t = last - 1; t >= 0; t--) {
      const C = matMul(matMul(steps[t].P, Ft), inverse(steps[t + 1].PPred));
      xs[t] = vecAdd(steps[t].x, matVec(C, vecSub(xs[t + 1], steps[t + 1].xPred)));
      Ps[t] = symmetrize(matAdd(steps[t].P, matMul(matMul(C, matSub(Ps[t + 1], steps[t + 1].PPred)), transpose(C))));
    }
    return { xs, Ps };
  }

  // ---- 拡張カルマンフィルター: 非線形の関数 f・h を、いまの推定値のまわりで直線に置きかえる ----
  function extendedKalmanFilter(ys, { f, jacobianF, h, jacobianH, Q, R, m0, P0 }) {
    const I = identity(m0.length);
    let x = m0.slice();
    let P = P0;
    const steps = ys.map((y) => {
      const F = jacobianF(x);
      const xPred = f(x);
      const PPred = matAdd(matMul(matMul(F, P), transpose(F)), Q);
      const H = jacobianH(xPred);
      const yPred = h(xPred);
      const S = matAdd(matMul(matMul(H, PPred), transpose(H)), R);
      const K = matMul(matMul(PPred, transpose(H)), inverse(S));
      const innovation = vecSub(y, yPred);
      x = vecAdd(xPred, matVec(K, innovation));
      P = symmetrize(matMul(matSub(I, matMul(K, H)), PPred));
      return { xPred, PPred, x, P, K, innovation, S, yPred };
    });
    return { steps };
  }

  // ---- 正規分布を非線形の関数に通したときの、平均と分散の近似（1次元） ----
  // 線形化（EKF の考え方）: 平均の位置の接線で置きかえる
  function linearizedTransform(fn, slope, m, v) {
    return { mean: fn(m), variance: slope(m) ** 2 * v };
  }
  // シグマ点（UKF の考え方）: 3つの代表点を関数に通し、重みつきで平均と分散を計算し直す
  const SIGMA_SPREAD = 3; // n + κ（1次元の正規分布では 3 がよく使われる）
  function sigmaPointTransform(fn, m, v) {
    const offset = Math.sqrt(SIGMA_SPREAD * v);
    const points = [m, m + offset, m - offset];
    const weights = [1 - 1 / SIGMA_SPREAD, 1 / (2 * SIGMA_SPREAD), 1 / (2 * SIGMA_SPREAD)];
    const mapped = points.map(fn);
    const outMean = mapped.reduce((sum, value, i) => sum + weights[i] * value, 0);
    const outVariance = mapped.reduce((sum, value, i) => sum + weights[i] * (value - outMean) ** 2, 0);
    return { mean: outMean, variance: outVariance, points, weights, mapped };
  }
  // たくさんの乱数を通す（モンテカルロ）。これを「正解」として近似と比べる
  function monteCarloTransform(fn, m, v, count, seed) {
    const inputs = standardNormals(count, seed).map((z) => m + Math.sqrt(v) * z);
    const outputs = inputs.map(fn);
    return { mean: mean(outputs), variance: variance(outputs), inputs, outputs };
  }

  // ---- 粒子フィルターの1回分の更新: 粒に重みをつけ、重みに比例して選び直す ----
  function particleUpdate(particles, likelihood, seed) {
    const raw = particles.map(likelihood);
    const total = raw.reduce((a, b) => a + b, 0);
    const weights = raw.map((w) => w / total);
    // 系統リサンプリング: 等間隔の目盛りを1つの乱数でずらし、重みの累積と比べて粒を選ぶ
    const start = uniforms(1, seed)[0] / particles.length;
    const resampled = [];
    let cumulative = weights[0];
    let index = 0;
    for (let i = 0; i < particles.length; i++) {
      const mark = start + i / particles.length;
      while (mark > cumulative && index < particles.length - 1) {
        index++;
        cumulative += weights[index];
      }
      resampled.push(particles[index]);
    }
    const effectiveCount = 1 / weights.reduce((sum, w) => sum + w * w, 0);
    return { weights, resampled, effectiveCount };
  }

  // ヒストグラム（確率密度にそろえる）
  function histogram(values, lo, hi, bins) {
    const width = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    let inside = 0;
    for (const v of values) {
      const i = Math.floor((v - lo) / width);
      if (i >= 0 && i < bins) {
        counts[i]++;
        inside++;
      }
    }
    return { centers: counts.map((_, i) => lo + (i + 0.5) * width), density: counts.map((c) => c / (values.length * width)), width, inside };
  }

  return {
    seededRandom, standardNormals, uniforms, linspace, normalPdf, mean, variance, rmse,
    zeros, identity, transpose, matMul, matAdd, matSub, matVec, vecAdd, vecSub, symmetrize, inverse, inverseAndDet,
    localLevelModel, constantVelocityModel, simulateLocalLevel, simulateConstantVelocity,
    filter1d, steadyGain, kalmanFilter, rtsSmoother, extendedKalmanFilter,
    linearizedTransform, sigmaPointTransform, monteCarloTransform, SIGMA_SPREAD, particleUpdate, histogram,
  };
})();
