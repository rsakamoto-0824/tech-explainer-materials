// short-data.js — 説明用のデータと、そのデータで選んだハイパーパラメータ（ブラウザと Node の両方で使う）。
// 真の関数とノイズは説明用に作ったもの（実在のデータではない）。乱数は種を固定しているので、毎回同じ値になる。
(function (root) {
  const G = root.GPM;
  const truth = (x) => Math.sin(1.3 * x) + 0.35 * Math.cos(2.9 * x + 0.4);
  const DATA_X = [0.4, 1.1, 1.9, 2.6, 3.8, 4.5, 5.6];
  const NOISE_SD = 0.12;
  const NOISE = G.standardNormals(DATA_X.length, 2026);
  const DATA_Y = DATA_X.map((x, i) => truth(x) + NOISE_SD * NOISE[i]);
  const X_MIN = 0;
  const X_MAX = 6;
  const XS = G.linspace(X_MIN, X_MAX, 241); // 関数を描く点
  const EXTRA_MAX = 9; // 第7章の外挿で使う右端
  const XS_WIDE = G.linspace(X_MIN, EXTRA_MAX, 361);

  // ハイパーパラメータを対数周辺尤度の格子探索で選ぶ（ℓ, σ_f, σ_n）。動画では最大化の結果として使う
  const LENGTH_GRID = G.linspace(Math.log(0.1), Math.log(5), 80).map(Math.exp);
  const SIGNAL_GRID = G.linspace(Math.log(0.3), Math.log(3), 40).map(Math.exp);
  const NOISE_GRID = G.linspace(Math.log(0.02), Math.log(0.6), 40).map(Math.exp);
  function bestHyperparameters() {
    let best = null;
    for (const lengthScale of LENGTH_GRID) {
      for (const signal of SIGNAL_GRID) {
        for (const noise of NOISE_GRID) {
          const value = G.logMarginalLikelihood(DATA_X, DATA_Y, G.rbf({ variance: signal * signal, lengthScale }), noise * noise).total;
          if (!best || value > best.value) best = { lengthScale, signal, noise, value };
        }
      }
    }
    return best;
  }
  const BEST = bestHyperparameters();
  const kernelOf = (lengthScale = BEST.lengthScale, signal = BEST.signal) => G.rbf({ variance: signal * signal, lengthScale });
  const BEST_KERNEL = kernelOf();
  const BEST_NOISE_VAR = BEST.noise * BEST.noise;
  const BEST_MODEL = G.fit(DATA_X, DATA_Y, BEST_KERNEL, BEST_NOISE_VAR);

  root.SHORT_DATA = { truth, DATA_X, DATA_Y, NOISE_SD, X_MIN, X_MAX, XS, EXTRA_MAX, XS_WIDE, BEST, kernelOf, BEST_KERNEL, BEST_NOISE_VAR, BEST_MODEL };
})(typeof window !== 'undefined' ? window : globalThis);
