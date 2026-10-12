"""ベイズ最適化解説資料のデモ計算。

1. ガウス過程（GP）の事前分布から関数を引き、長さスケールの違いを見る
2. 1次元の Forrester 関数で、GP 回帰と期待改善量（EI）を計算し、ベイズ最適化の進み方を記録する
3. 2次元の Branin 関数で、ベイズ最適化（EI・LCB）とランダム探索を 20 回ずつ比べる

スライドのグラフに使う数値を demo_results.json に書き出す。
"""

import json
import warnings
from pathlib import Path

import numpy as np
import scipy
import sklearn
from scipy.optimize import minimize
from scipy.stats import norm, qmc
from sklearn.exceptions import ConvergenceWarning
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, Matern

warnings.filterwarnings("ignore", category=ConvergenceWarning)

OUTPUT_PATH = Path(__file__).with_name("demo_results.json")
GRID_1D = np.linspace(0.0, 1.0, 201)
EI_XI = 0.01            # EI の探索寄りの度合い（改善とみなす最小幅）
LCB_KAPPA = 2.0         # LCB の探索寄りの度合い
NOISE_JITTER = 1e-6     # 観測ノイズなしを仮定したときの数値安定用の小さな値

# ---- 1次元デモ（Forrester 関数） ----
FORRESTER_MIN_X = 0.757249
FORRESTER_MIN_Y = -6.020740
GP_DEMO_X = np.array([0.05, 0.3, 0.5, 0.65, 0.95])
BO1D_INITIAL_X = np.array([0.1, 0.45, 0.9])
BO1D_ITERATIONS = 10
BO1D_SNAPSHOTS = [0, 6, 10]

# ---- 事前分布からのサンプル ----
PRIOR_LENGTH_SCALES = [0.08, 0.3]
PRIOR_N_SAMPLES = 3
PRIOR_GRID = np.linspace(0.0, 1.0, 101)

# ---- 2次元ベンチマーク（Branin 関数） ----
BRANIN_MIN = 0.397887
BRANIN_MINIMIZERS = [(-np.pi, 12.275), (np.pi, 2.275), (9.42478, 2.475)]
N_INITIAL = 5
N_BUDGET = 40
N_REPEATS = 20
N_CANDIDATES = 3000
N_LOCAL_STARTS = 5
REGRET_TARGET = 0.05
GRID_LEVELS = 6


def forrester(x):
    return (6 * x - 2) ** 2 * np.sin(12 * x - 4)


def branin_unit(u):
    """[0,1]^2 の入力を Branin の定義域に変換して評価する。"""
    x1 = -5 + 15 * u[..., 0]
    x2 = 15 * u[..., 1]
    a, b, c, r, s, t = 1.0, 5.1 / (4 * np.pi ** 2), 5 / np.pi, 6.0, 10.0, 1 / (8 * np.pi)
    return a * (x2 - b * x1 ** 2 + c * x1 - r) ** 2 + s * (1 - t) * np.cos(x1) + s


def make_gp(n_dims, seed):
    kernel = ConstantKernel(1.0, (1e-3, 1e3)) * Matern(length_scale=np.full(n_dims, 0.2), length_scale_bounds=(1e-2, 10.0), nu=2.5)
    return GaussianProcessRegressor(kernel=kernel, alpha=NOISE_JITTER, normalize_y=True, n_restarts_optimizer=3, random_state=seed)


def expected_improvement(mean, std, best):
    """最小化問題の期待改善量。"""
    std = np.maximum(std, 1e-12)
    improvement = best - mean - EI_XI
    z = improvement / std
    return improvement * norm.cdf(z) + std * norm.pdf(z)


def lower_confidence_bound(mean, std):
    """最小化問題の LCB。小さいほど有望なので、符号を反転して「大きいほど良い」にそろえる。"""
    return -(mean - LCB_KAPPA * std)


def prior_samples():
    result = {"x": PRIOR_GRID.tolist(), "samples": {}}
    rng = np.random.default_rng(7)
    for length_scale in PRIOR_LENGTH_SCALES:
        kernel = Matern(length_scale=length_scale, nu=2.5)
        cov = kernel(PRIOR_GRID[:, None]) + 1e-9 * np.eye(len(PRIOR_GRID))
        draws = rng.multivariate_normal(np.zeros(len(PRIOR_GRID)), cov, size=PRIOR_N_SAMPLES)
        result["samples"][str(length_scale)] = draws.tolist()
    return result


def gp_regression_demo():
    y = forrester(GP_DEMO_X)
    gp = make_gp(1, 0).fit(GP_DEMO_X[:, None], y)
    mean, std = gp.predict(GRID_1D[:, None], return_std=True)
    return {
        "obs_x": GP_DEMO_X.tolist(), "obs_y": y.tolist(),
        "mean": mean.tolist(), "std": std.tolist(), "true": forrester(GRID_1D).tolist(),
        "kernel": str(gp.kernel_),
    }


def bo_1d_demo():
    x_obs = BO1D_INITIAL_X.copy()
    y_obs = forrester(x_obs)
    snapshots = []
    history = []
    for iteration in range(BO1D_ITERATIONS + 1):
        gp = make_gp(1, 0).fit(x_obs[:, None], y_obs)
        mean, std = gp.predict(GRID_1D[:, None], return_std=True)
        best = float(y_obs.min())
        ei = expected_improvement(mean, std, best)
        next_index = int(np.argmax(ei))
        next_x = float(GRID_1D[next_index])
        history.append({"iteration": iteration, "n_obs": len(x_obs), "best_y": best, "best_x": float(x_obs[np.argmin(y_obs)]), "next_x": next_x})
        if iteration in BO1D_SNAPSHOTS:
            snapshots.append({
                "iteration": iteration, "obs_x": x_obs.tolist(), "obs_y": y_obs.tolist(),
                "mean": mean.tolist(), "std": std.tolist(), "ei": ei.tolist(), "next_x": next_x,
            })
        if iteration == BO1D_ITERATIONS:
            break
        x_obs = np.append(x_obs, next_x)
        y_obs = np.append(y_obs, forrester(next_x))
    return {"grid": GRID_1D.tolist(), "true": forrester(GRID_1D).tolist(), "snapshots": snapshots, "history": history,
            "final_obs_x": x_obs.tolist(), "final_obs_y": y_obs.tolist()}


def maximize_acquisition(gp, acquisition, best, rng):
    candidates = rng.random((N_CANDIDATES, 2))
    mean, std = gp.predict(candidates, return_std=True)
    scores = acquisition(mean, std, best)
    starts = candidates[np.argsort(scores)[-N_LOCAL_STARTS:]]

    def negative(u):
        m, s = gp.predict(u[None, :], return_std=True)
        return -float(acquisition(m, s, best)[0])

    best_u, best_score = starts[-1], scores.max()
    for start in starts:
        res = minimize(negative, start, method="L-BFGS-B", bounds=[(0, 1), (0, 1)])
        if -res.fun > best_score:
            best_u, best_score = res.x, -res.fun
    return np.clip(best_u, 0, 1)


def run_bo(acquisition_name, seed):
    rng = np.random.default_rng(seed)
    x_obs = qmc.LatinHypercube(d=2, seed=seed).random(N_INITIAL)
    y_obs = branin_unit(x_obs)
    if acquisition_name == "EI":
        acquisition = expected_improvement
    else:
        acquisition = lambda m, s, _best: lower_confidence_bound(m, s)  # noqa: E731
    while len(y_obs) < N_BUDGET:
        gp = make_gp(2, seed).fit(x_obs, y_obs)
        u = maximize_acquisition(gp, acquisition, float(y_obs.min()), rng)
        x_obs = np.vstack([x_obs, u])
        y_obs = np.append(y_obs, branin_unit(u))
    return x_obs, y_obs


def run_random(seed):
    rng = np.random.default_rng(10_000 + seed)
    x_obs = rng.random((N_BUDGET, 2))
    return x_obs, branin_unit(x_obs)


def summarize(curves):
    curves = np.array(curves)
    return {
        "median": np.median(curves, axis=0).tolist(),
        "q25": np.quantile(curves, 0.25, axis=0).tolist(),
        "q75": np.quantile(curves, 0.75, axis=0).tolist(),
    }


def evals_to_target(curve):
    hit = np.where(np.array(curve) < REGRET_TARGET)[0]
    return int(hit[0] + 1) if len(hit) else None


def branin_benchmark():
    methods = {"BO-EI": lambda s: run_bo("EI", s), "BO-LCB": lambda s: run_bo("LCB", s), "ランダム探索": run_random}
    curves = {name: [] for name in methods}
    reach = {name: [] for name in methods}
    example_points = {}
    for seed in range(N_REPEATS):
        for name, runner in methods.items():
            x_obs, y_obs = runner(seed)
            regret = np.minimum.accumulate(y_obs) - BRANIN_MIN
            curves[name].append(regret)
            reach[name].append(evals_to_target(regret))
            if seed == 0:
                example_points[name] = {"x1": (-5 + 15 * x_obs[:, 0]).tolist(), "x2": (15 * x_obs[:, 1]).tolist(), "y": y_obs.tolist()}
        print(f"  seed {seed}: " + ", ".join(f"{n}={curves[n][-1][-1]:.4f}" for n in methods))

    grid = np.linspace(0, 1, GRID_LEVELS)
    grid_points = np.array([[a, b] for a in grid for b in grid])
    grid_regret = float(branin_unit(grid_points).min() - BRANIN_MIN)

    summary = {}
    for name in methods:
        hits = [r for r in reach[name] if r is not None]
        final = np.array([c[-1] for c in curves[name]])
        summary[name] = {
            **summarize(curves[name]),
            "final_median": float(np.median(final)),
            "n_reached": len(hits),
            "median_evals_to_target": float(np.median(hits)) if hits else None,
        }
    return {
        "n_initial": N_INITIAL, "n_budget": N_BUDGET, "n_repeats": N_REPEATS, "target": REGRET_TARGET,
        "summary": summary, "example_points": example_points,
        "grid": {"levels": GRID_LEVELS, "n_points": GRID_LEVELS ** 2, "regret": grid_regret},
        "minimizers": [list(m) for m in BRANIN_MINIMIZERS], "min_value": BRANIN_MIN,
    }


def main():
    results = {
        "versions": {"numpy": np.__version__, "scipy": scipy.__version__, "sklearn": sklearn.__version__},
        "settings": {"ei_xi": EI_XI, "lcb_kappa": LCB_KAPPA, "kernel": "定数 × Matérn 5/2（長さスケールは変数ごと）"},
        "prior": prior_samples(),
        "gp_demo": gp_regression_demo(),
        "bo1d": bo_1d_demo(),
    }
    print("1D history:")
    for h in results["bo1d"]["history"]:
        print(f"  it={h['iteration']} n={h['n_obs']} best_y={h['best_y']:.4f} at x={h['best_x']:.3f} next={h['next_x']:.3f}")
    print("GP demo kernel:", results["gp_demo"]["kernel"])
    print("Branin benchmark:")
    results["branin"] = branin_benchmark()
    for name, s in results["branin"]["summary"].items():
        print(f"  {name}: final median regret={s['final_median']:.4f}, reached {s['n_reached']}/{N_REPEATS}, median evals={s['median_evals_to_target']}")
    print("  grid 6x6 regret:", round(results["branin"]["grid"]["regret"], 4))
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
