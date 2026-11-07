"""make_data.py — ガウス過程の周辺尤度の最大化で、最適化の手法を比べる（第8章の図の数値）。

加法ガウス過程（tools/additive_gp.py）の負の対数周辺尤度を、同じ初期値から
L-BFGS（記憶 10 組）、BFGS、勾配降下法で最小化し、勾配の計算回数ごとの値を js/opt-data.js に書く。
実行: python tools/make_data.py
"""

import json
import pathlib
import sys
import time

import numpy as np
from scipy.optimize import minimize

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import additive_gp as ag  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "js" / "opt-data.js"

SEED = 5
DIMENSION = 6
POINTS = 300
NOISE = 0.05
FREQUENCY = 2.0
MAX_EVALUATIONS = 300
ARMIJO = 1e-4
SHRINK = 0.5
GROW = 2.0
FIRST_STEP = 1e-3


def make_problem():
    rng = np.random.default_rng(SEED)
    X = rng.uniform(-1.5, 1.5, size=(POINTS, DIMENSION))
    sine = lambda v: np.sin(FREQUENCY * v)
    y = 1.5 * (sine(X[:, 0]) * sine(X[:, 1]) + sine(X[:, 2]) * sine(X[:, 3]) + sine(X[:, 4]) * sine(X[:, 5]))
    y = y / np.std(y) + NOISE * rng.normal(size=POINTS)
    model = ag.Model(orders=list(range(1, DIMENSION + 1)), dimension=DIMENSION)
    squared = ag.squared_differences(X, X)
    start = model.initial_theta(X, y, np.random.default_rng(SEED), 0.0)

    def objective(theta):
        return model.negative_log_likelihood(theta, X, y, squared)

    return objective, start


class Recorder:
    """勾配を計算するたびに、それまでの最小値を記録する。"""

    def __init__(self, objective):
        self.objective = objective
        self.best = []
        self.seconds = 0.0

    def __call__(self, theta):
        started = time.perf_counter()
        value, gradient = self.objective(theta)
        self.seconds += time.perf_counter() - started
        self.best.append(min(value, self.best[-1]) if self.best else value)
        return value, gradient


def run_scipy(objective, start, method, options):
    recorder = Recorder(objective)
    result = minimize(recorder, start, jac=True, method=method, options=options)
    return recorder, result


def run_descent(objective, start):
    """バックトラック（アルミホ条件）つきの勾配降下法。"""
    recorder = Recorder(objective)
    theta = start.copy()
    value, gradient = recorder(theta)
    step = FIRST_STEP
    while len(recorder.best) < MAX_EVALUATIONS:
        direction = -gradient
        slope = gradient @ direction
        while len(recorder.best) < MAX_EVALUATIONS:
            trial = theta + step * direction
            new_value, new_gradient = recorder(trial)
            if new_value <= value + ARMIJO * step * slope:
                break
            step *= SHRINK
        theta, value, gradient = trial, new_value, new_gradient
        step *= GROW
    return recorder


def main():
    objective, start = make_problem()
    limit = {"maxfun": MAX_EVALUATIONS, "maxiter": MAX_EVALUATIONS, "maxcor": 10, "ftol": 1e-12, "gtol": 1e-6}
    lbfgs, _ = run_scipy(objective, start, "L-BFGS-B", limit)
    bfgs, _ = run_scipy(objective, start, "BFGS", {"maxiter": MAX_EVALUATIONS, "gtol": 1e-6})
    descent = run_descent(objective, start)
    best = min(lbfgs.best[-1], bfgs.best[-1], descent.best[-1])
    rows = {"lbfgs": lbfgs, "bfgs": bfgs, "descent": descent}
    summary = {}
    for name, item in rows.items():
        within = next((i + 1 for i, v in enumerate(item.best) if v - best < 1.0), None)
        summary[name] = {"evaluations": len(item.best), "final": float(item.best[-1]), "withinOne": within, "seconds": item.seconds}
    print(summary, "best", best, "parameters", len(start))
    data = {
        "points": POINTS,
        "dimension": DIMENSION,
        "parameters": int(len(start)),
        "best": float(best),
        "summary": summary,
        "curves": {name: [round(float(v), 3) for v in item.best] for name, item in rows.items()},
    }
    OUTPUT.write_text("// 自動生成（tools/make_data.py）。手で直さない。\nwindow.OPTDATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main()
