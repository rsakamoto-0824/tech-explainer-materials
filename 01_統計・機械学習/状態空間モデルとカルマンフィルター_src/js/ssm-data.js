// ssm-data.js — 3本の動画で共通に使う例のデータ（説明用に式と乱数で作ったもの。実在のデータではない）と、その計算結果。
// 例A: 部屋の温度（ローカルレベルモデル）。例B: まっすぐなレールの上を走る台車（等速モデル。位置だけを測る）。
window.SSMDATA = (() => {
  const M = SSM;

  // ---- 例A: 温度 ----
  const TEMP = { count: 100, q: 0.0625, r: 1, x0: 20, seed: 5 };
  const TEMP_INIT = { m0: 20, p0: 4 }; // 最初の推定（20 度）と、その不確かさ（分散 4）
  const tempSim = M.simulateLocalLevel(TEMP);
  const tempTimes = tempSim.x.map((_, i) => i + 1);
  const tempFilter = M.filter1d(tempSim.y, { q: TEMP.q, r: TEMP.r, ...TEMP_INIT });
  const tempModel = M.localLevelModel(TEMP.q, TEMP.r);
  const tempKalman = M.kalmanFilter(tempSim.y.map((y) => [y]), { ...tempModel, m0: [TEMP_INIT.m0], P0: [[TEMP_INIT.p0]] });
  const tempSmooth = M.rtsSmoother(tempKalman.steps, tempModel.F);

  // ---- 例B: 台車 ----
  const CART = { count: 40, dt: 1, qVelocity: 0.01, r: 4, p0: 0, v0: 1, seed: 3 };
  const CART_INIT = { m0: [0, 0], P0: [[25, 0], [0, 4]] }; // 速度は「分からない」ので 0 から始め、分散を大きくとる
  const cartSim = M.simulateConstantVelocity(CART);
  const cartTimes = cartSim.y.map((_, i) => i + 1);
  const cartModel = M.constantVelocityModel(CART.dt, CART.qVelocity, CART.r);
  const cartKalman = M.kalmanFilter(cartSim.y.map((y) => [y]), { ...cartModel, ...CART_INIT });
  const cartSmooth = M.rtsSmoother(cartKalman.steps, cartModel.F);

  // ---- 手で計算する例（計算しやすい数にした小さな例） ----
  const HAND = { m0: 20, p0: 3, q: 1, r: 4, ys: [22, 19, 23] };
  const handFilter = M.filter1d(HAND.ys, HAND);

  return {
    TEMP, TEMP_INIT, tempSim, tempTimes, tempFilter, tempModel, tempKalman, tempSmooth,
    CART, CART_INIT, cartSim, cartTimes, cartModel, cartKalman, cartSmooth,
    HAND, handFilter,
  };
})();
