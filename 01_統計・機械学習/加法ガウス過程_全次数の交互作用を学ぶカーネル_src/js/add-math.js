// add-math.js — 動画の中で計算する数式（SE カーネル、基本対称多項式、ニュートン・ジラールの公式、ガウス過程からの乱数の関数）。
// 乱数は種を固定する（録画で同じ時刻 t に必ず同じ絵を出すため）。
// node からも読めるように、window が無ければ globalThis に置く（tools/check-math.mjs で数値を確かめる）。
(typeof window !== 'undefined' ? window : globalThis).ADDM = (() => {
  // ---- 乱数 ----
  function makeRandom(seed) {
    let state = seed >>> 0;
    const uniform = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
    return { uniform, normal };
  }

  // ---- カーネル ----
  const se1 = (a, b, ell = 1) => Math.exp(-((a - b) ** 2) / (2 * ell * ell));

  // 基本対称多項式 e_0 … e_D を総当たりで計算する（確かめ用。項の数は 2^D）
  function elementaryByEnumeration(z) {
    const D = z.length;
    const e = new Array(D + 1).fill(0);
    for (let mask = 0; mask < 1 << D; mask++) {
      let product = 1;
      let order = 0;
      for (let i = 0; i < D; i++) {
        if (mask & (1 << i)) {
          product *= z[i];
          order++;
        }
      }
      e[order] += product;
    }
    return e;
  }
  // べき和 s_k = Σ z_i^k（s[0] は使わない）
  const powerSums = (z) => Array.from({ length: z.length + 1 }, (_, k) => z.reduce((sum, v) => sum + v ** k, 0));
  // ニュートン・ジラールの公式（論文の式 6）
  function newtonGirard(z) {
    const s = powerSums(z);
    const e = [1];
    for (let n = 1; n <= z.length; n++) {
      let total = 0;
      for (let k = 1; k <= n; k++) total += (k % 2 ? 1 : -1) * e[n - k] * s[k];
      e.push(total / n);
    }
    return { s, e };
  }
  function comb(n, k) {
    let value = 1;
    for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i;
    return Math.round(value);
  }
  // 計算の回数: 全部の項を並べる（各項で n 個の積）のと、公式（べき和 D² ＋ 漸化式 D²/2 の掛け算）
  const enumerationOperations = (D) => D * 2 ** (D - 1);
  const newtonGirardOperations = (D) => D * D + (D * (D + 1)) / 2;

  // ---- ガウス過程から関数を引く ----
  function cholesky(A) {
    const n = A.length;
    const L = A.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = A[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        L[i][j] = i === j ? Math.sqrt(sum) : sum / L[j][j];
      }
    }
    return L;
  }
  const JITTER = 1e-8;
  const factorSE = (xs, ell) => cholesky(xs.map((a, i) => xs.map((b, j) => se1(a, b, ell) + (i === j ? JITTER : 0))));
  // 1次元: f = L u（u は標準正規乱数）
  function draw1D(L, seed) {
    const random = makeRandom(seed);
    const u = L.map(() => random.normal());
    return L.map((row) => row.reduce((sum, v, j) => sum + v * u[j], 0));
  }
  // 2次元の積のカーネル: f = L₂ U L₁ᵀ（行 = x₂、列 = x₁）
  function drawProduct(L1, L2, seed) {
    const random = makeRandom(seed);
    const n1 = L1.length;
    const n2 = L2.length;
    const U = Array.from({ length: n2 }, () => Array.from({ length: n1 }, () => random.normal()));
    const right = U.map((row) => L1.map((lrow) => lrow.reduce((sum, v, j) => sum + v * row[j], 0)));
    return L2.map((lrow) => {
      const out = new Float64Array(n1);
      for (let j = 0; j < n2; j++) {
        const weight = lrow[j];
        if (!weight) continue;
        for (let c = 0; c < n1; c++) out[c] += weight * right[j][c];
      }
      return out;
    });
  }

  return { makeRandom, se1, elementaryByEnumeration, powerSums, newtonGirard, comb, enumerationOperations, newtonGirardOperations, factorSE, draw1D, drawProduct };
})();
