// 統計の計算（正規分布、逆関数、乱数、相関、すその依存性）。画面の数値はすべてここから計算する。

// 種を固定した乱数（同じ絵を毎回出すため）
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

// 標準正規乱数（ボックス・ミュラー法）
export const makeNormal = (seed: number) => {
  const random = makeRandom(seed);
  return () => {
    const u1 = Math.max(random(), 1e-12);
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
};

export const normalPdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

// 標準正規分布の累積分布関数 Φ（erfc のチェビシェフ近似。誤差は 1.2e-7 以下）
export const normalCdf = (z: number): number => {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const poly =
    -x * x -
    1.26551223 +
    t *
      (1.00002368 +
        t *
          (0.37409196 +
            t *
              (0.09678418 +
                t *
                  (-0.18628806 +
                    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));
  const erfc = t * Math.exp(poly);
  return z >= 0 ? 1 - 0.5 * erfc : 0.5 * erfc;
};

// Φ の逆関数（Acklam の近似）
export const normalInv = (p: number): number => {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) return -normalInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
};

// 単調に増える関数の逆関数を二分法で求める
export const invertByBisection = (f: (x: number) => number, target: number, lo: number, hi: number) => {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (a + b);
    if (f(mid) < target) a = mid;
    else b = mid;
  }
  return 0.5 * (a + b);
};

// 例の周辺分布：待ち時間は平均20分の指数分布、混雑率はベータ分布 Beta(3, 2)
export const WAIT_MEAN_MINUTES = 20;
export const waitCdf = (x: number) => 1 - Math.exp(-x / WAIT_MEAN_MINUTES);
export const waitInv = (u: number) => -WAIT_MEAN_MINUTES * Math.log(1 - u);
export const waitPdf = (x: number) => Math.exp(-x / WAIT_MEAN_MINUTES) / WAIT_MEAN_MINUTES;
export const crowdCdf = (x: number) => 4 * x ** 3 - 3 * x ** 4;
export const crowdInv = (u: number) => invertByBisection(crowdCdf, u, 0, 1);
export const crowdPdf = (x: number) => 12 * x * x * (1 - x);

// 自由度3の t 分布の累積分布関数（閉じた式）と逆関数
export const t3Cdf = (t: number) => {
  const s = t / Math.sqrt(3);
  return 0.5 + (s / (1 + s * s) + Math.atan(s)) / Math.PI;
};
export const t3Inv = (p: number) => invertByBisection(t3Cdf, p, -1e4, 1e4);

export const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

export const pearson = (x: number[], y: number[]) => {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
};

// 順位（1 が最小）
export const ranks = (values: number[]) => {
  const order = values.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const result = new Array<number>(values.length);
  order.forEach(([, index], position) => {
    result[index] = position + 1;
  });
  return result;
};

// 2変量正規分布（相関 rho）で、両方が b を超える確率
export const gaussianJointUpper = (b: number, rho: number) => {
  const s = Math.sqrt(1 - rho * rho);
  const steps = 400;
  const width = 9 / steps;
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const z = b + i * width;
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * normalPdf(z) * (1 - normalCdf((b - rho * z) / s));
  }
  return (total * width) / 3;
};

// ガウシアンコピュラで、片方が上位 (1-q) に入ったとき、もう片方も入る確率
export const gaussianTailProbability = (q: number, rho: number) => gaussianJointUpper(normalInv(q), rho) / (1 - q);

// 自由度3の t コピュラの同じ確率。t = z / sqrt(w)、w = (カイ分布3)^2 / 3 で混ぜて積分する。
// 極端な q では小さい r が効くので、r = v^2 と置いて 0 の近くを細かく刻む（重いので tools/precompute.ts で事前に計算する）
export const t3TailProbability = (q: number, rho: number) => {
  const a = t3Inv(q);
  const steps = 4000;
  const width = 3 / steps;
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const v = i * width;
    const r = v * v;
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    const density = Math.sqrt(2 / Math.PI) * r * r * Math.exp(-0.5 * r * r) * 2 * v;
    total += weight * density * gaussianJointUpper((a * r) / Math.sqrt(3), rho);
  }
  return (total * width) / 3 / (1 - q);
};
