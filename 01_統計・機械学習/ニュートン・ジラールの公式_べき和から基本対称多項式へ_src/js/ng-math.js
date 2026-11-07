// ng-math.js — 基本対称多項式 e_n とべき和 s_k の計算。
// ニュートン・ジラールの公式、かっこを順に掛ける方法、整数で正確に求める方法の3通りを用意する（第6章の実験に使う）。
// 乱数は種を固定する。node からも読めるように、window が無ければ globalThis に置く。
(typeof window !== 'undefined' ? window : globalThis).NGM = (() => {
  function makeRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const powerSums = (z, order = z.length) => Array.from({ length: order + 1 }, (_, k) => z.reduce((sum, v) => sum + v ** k, 0));
  // ニュートン・ジラールの公式: n e_n = Σ_{k=1}^n (−1)^{k−1} e_{n−k} s_k
  function newtonGirard(z, order = z.length) {
    const s = powerSums(z, order);
    const e = [1];
    for (let n = 1; n <= order; n++) {
      let total = 0;
      for (let k = 1; k <= n; k++) total += (k % 2 ? 1 : -1) * e[n - k] * s[k];
      e.push(total / n);
    }
    return e;
  }
  // かっこ (1 + z_i t) を1つずつ掛けて、係数の列を更新する
  function byProduct(z, order = z.length) {
    const e = [1, ...new Array(order).fill(0)];
    for (const v of z) for (let n = order; n >= 1; n--) e[n] += v * e[n - 1];
    return e;
  }
  // 総当たり（項を全部並べる）
  function byEnumeration(z) {
    const D = z.length;
    const e = new Array(D + 1).fill(0);
    for (let mask = 0; mask < 1 << D; mask++) {
      let product = 1;
      let order = 0;
      for (let i = 0; i < D; i++) if (mask & (1 << i)) {
        product *= z[i];
        order++;
      }
      e[order] += product;
    }
    return e;
  }
  // 整数の計算で正確に求める: z_i = a_i / 2^BITS とみなし、e_n × 2^(BITS n) を整数のまま計算する
  const BITS = 70n;
  function exactElementary(z, order = z.length) {
    const integers = z.map((v) => BigInt(Math.round(v * 2 ** Number(BITS))));
    const e = [1n, ...new Array(order).fill(0n)];
    for (const a of integers) for (let n = order; n >= 1; n--) e[n] = e[n] + a * e[n - 1];
    return e.map((value, n) => ({ value, shift: BITS * BigInt(n) }));
  }
  // 倍精度の数を、整数 m と指数 k の組 m × 2^k に直す
  function toFraction(x) {
    let mantissa = Math.abs(x);
    let exponent = 0;
    while (mantissa < 2 ** 52) {
      mantissa *= 2;
      exponent -= 1;
    }
    while (mantissa >= 2 ** 53) {
      mantissa /= 2;
      exponent += 1;
    }
    return { m: (x < 0 ? -1n : 1n) * BigInt(mantissa), k: exponent };
  }
  // approx と、正確な値 exact.value / 2^exact.shift の相対誤差
  function relativeError(approx, exact) {
    if (approx === 0) return 1;
    const { m, k } = toFraction(approx);
    const up = BigInt(Math.max(k, 0));
    const down = BigInt(Math.max(-k, 0));
    const left = (m << up) << exact.shift;
    const right = exact.value << down;
    const diff = left - right;
    const size = (diff < 0n ? -diff : diff) << 64n;
    return Number(size / right) / 2 ** 64;
  }
  return { makeRandom, powerSums, newtonGirard, byProduct, byEnumeration, exactElementary, relativeError };
})();
