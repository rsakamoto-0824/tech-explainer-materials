// example-data.js — 説明用のデータとカーネル。本編（第7章・第9章）と想定質問の動画で共通に使う。
// 真の関数とノイズは説明用に作ったもの。乱数は種を固定しているので、どのページでも同じ値になる。
window.EXAMPLE_DATA = (() => {
  const G = GPM;

  // ---- 第7章: トレンド ＋ 季節（周期 p = 1） ----
  const PERIOD = 1;
  const TREND_KERNEL = G.rbf({ variance: 1, lengthScale: 3 });
  const SEASON_KERNEL = G.periodic({ variance: 0.5, lengthScale: 1, period: PERIOD });
  const ADDITIVE_KERNEL = G.sum(TREND_KERNEL, SEASON_KERNEL);
  const trendTruth = (x) => 0.9 * Math.sin(0.5 * x - 0.3) - 0.1;
  const seasonTruth = (x) => 0.45 * Math.sin(2 * Math.PI * x) + 0.15 * Math.cos(4 * Math.PI * x + 0.3);
  const DECOMP_X = G.linspace(0, 4.5, 37);
  const DECOMP_NOISE = G.standardNormals(DECOMP_X.length, 701);
  const DECOMP_Y = Float64Array.from(DECOMP_X, (x, i) => trendTruth(x) + seasonTruth(x) + 0.07 * DECOMP_NOISE[i]);
  const DECOMP_NOISE_VARIANCE = 0.07 ** 2;
  const DECOMP_MODEL = G.fit(DECOMP_X, DECOMP_Y, ADDITIVE_KERNEL, DECOMP_NOISE_VARIANCE);

  // ---- 第9章: 3台の装置。入力は [x, カテゴリ]。共通の形にずれが乗る。C はデータが3点だけ ----
  const CATEGORIES = ['A', 'B', 'C'];
  const CATEGORY_VARIANCE = 0.25; // σ_c²
  const X_KERNEL = G.rbf({ variance: 1, lengthScale: 1 });
  const same = (a, b) => (a === b ? 1 : 0);
  const categoryAdditiveKernel = (a, b) => X_KERNEL(a[0], b[0]) + CATEGORY_VARIANCE * same(a[1], b[1]);
  const sharedShape = (x) => 0.8 * Math.sin(1.3 * x) + 0.25 * x - 0.2;
  const TRUE_OFFSETS = { A: 0.5, B: -0.1, C: -0.6 };
  const DEMO_POINTS = [
    ...G.linspace(0.1, 3.9, 10).map((x) => [x, 'A']),
    ...G.linspace(0.3, 3.7, 9).map((x) => [x, 'B']),
    ...[0.2, 0.7, 1.2].map((x) => [x, 'C']),
  ];
  const DEMO_NOISE = G.standardNormals(DEMO_POINTS.length, 951);
  const DEMO_Y = Float64Array.from(DEMO_POINTS, ([x, c], i) => sharedShape(x) + TRUE_OFFSETS[c] + 0.06 * DEMO_NOISE[i]);
  const DEMO_NOISE_VARIANCE = 0.06 ** 2;
  const DEMO_MODEL = G.fit(DEMO_POINTS, DEMO_Y, categoryAdditiveKernel, DEMO_NOISE_VARIANCE);

  return {
    decomposition: { PERIOD, TREND_KERNEL, SEASON_KERNEL, ADDITIVE_KERNEL, trendTruth, seasonTruth, DECOMP_X, DECOMP_Y, DECOMP_NOISE_VARIANCE, DECOMP_MODEL },
    categorical: { CATEGORIES, CATEGORY_VARIANCE, X_KERNEL, same, categoryAdditiveKernel, sharedShape, TRUE_OFFSETS, DEMO_POINTS, DEMO_Y, DEMO_NOISE_VARIANCE, DEMO_MODEL },
  };
})();
