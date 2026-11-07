"""make_data.py — 後続研究の動画の図に使う数値を計算して data/*.json に書き、js/follow-data.js にまとめる。

  python tools/make_data.py identify    # 識別できない問題（Lu ほか 2022 の式 5 の例）を、加法ガウス過程と OAK で比べる
  python tools/make_data.py orders      # 3次の関数で、データ数と次数の推定を比べる（加法ガウス過程の動画の実験の続き）
  python tools/make_data.py concrete [分割の数]  # コンクリート強度を OAK で計算する（先に fetch_concrete.py）
  python tools/make_data.py bo          # 加法の構造を使うベイズ最適化の小さな実験
  python tools/make_data.py bundle      # data/*.json を js/follow-data.js にまとめる

乱数は種を固定している。
"""

import json
import pathlib
import sys
import time

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import additive_gp as ag  # noqa: E402
import oak  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
BUNDLE = ROOT / "js" / "follow-data.js"


def rounded(values, digits=4):
    return np.round(np.asarray(values, dtype=float), digits).tolist()


# ---- 識別できない問題 ----
IDENTIFY_SEED = 41
IDENTIFY_POINTS = 200
IDENTIFY_NOISE = 0.1  # 分散 0.01
IDENTIFY_STARTS = 9
IDENTIFY_MEAN_COS = np.sin(3.0) / 3.0  # cos(3x) の (−1, 1) での平均
IDENTIFY_DISTINCT = 0.05  # 周辺尤度がこれ以上違えば別の解と数える


def identify_function(X):
    return X[:, 0] ** 2 - 2 * X[:, 1] + np.cos(3 * X[:, 0]) * np.sin(5 * X[:, 1])


def true_first(axis):
    """ANOVA 分解の本当の1次の項。"""
    return axis**2 - 1 / 3, -2 * axis + IDENTIFY_MEAN_COS * np.sin(5 * axis)


def additive_order_term(model, points, order):
    log_ell, log_v, log_order, _, _ = model.unpack(model.theta)
    z = model.base(ag.squared_differences(points, model.train_inputs), log_ell, log_v)
    e_values = ag.elementary_symmetric(z, max(model.orders))
    return np.exp(2 * log_order[model.orders.index(order)]) * e_values[order] @ model.alpha


def additive_shares(model, points):
    variances = np.array([np.var(additive_order_term(model, points, o)) for o in model.orders])
    return variances / variances.sum()


def count_distinct(values):
    values = sorted(values)
    return 1 + sum(1 for a, b in zip(values, values[1:]) if b - a > IDENTIFY_DISTINCT)


def run_identify():
    rng = np.random.default_rng(IDENTIFY_SEED)
    X = rng.uniform(-1, 1, size=(IDENTIFY_POINTS, 2))
    y = identify_function(X) + IDENTIFY_NOISE * rng.normal(size=IDENTIFY_POINTS)
    axis = np.linspace(-1, 1, 81)
    t1, t2 = true_first(axis)

    additive_values, additive_best = [], None
    for seed in range(IDENTIFY_STARTS):
        model = ag.Model(orders=[1, 2], dimension=2).fit(X, y, seed=seed + 1, restarts=1, max_iterations=300, jitter=0.0)
        start_rng = np.random.default_rng(seed + 100)
        theta = model.initial_theta(X, y, start_rng, 1.0)
        from scipy.optimize import minimize

        squared = ag.squared_differences(X, X)
        result = minimize(model.negative_log_likelihood, theta, args=(X, y, squared), jac=True, method="L-BFGS-B", options={"maxiter": 300})
        additive_values.append(float(result.fun))
        if additive_best is None or result.fun < additive_best[0]:
            additive_best = (result.fun, result.x)

    final = ag.Model(orders=[1, 2], dimension=2).fit(X, y, seed=0, restarts=1, max_iterations=1, jitter=0.0)
    final.theta = additive_best[1]
    log_noise = final.unpack(final.theta)[3]
    K = final.kernel(X, X)
    K[np.diag_indices(len(X))] += np.exp(2 * log_noise) + ag.JITTER
    final.factor = ag.cho_factor(K, lower=True, check_finite=False)
    final.mean = final.unpack(final.theta)[4]
    final.alpha = ag.cho_solve(final.factor, y - final.mean, check_finite=False)

    measures = [oak.Measure("uniform", (-1.0, 1.0)) for _ in range(2)]
    orthogonal = oak.OrthogonalAdditive(dimension=2, orders=[1, 2], measures=measures).fit(X, y, seed=1, restarts=IDENTIFY_STARTS, max_iterations=300, jitter=1.0)
    oak_values = [float(v) for v, _ in orthogonal.solutions]

    def centered(values):
        return values - np.mean(values)

    grid = np.random.default_rng(3).uniform(-1, 1, size=(4000, 2))
    def error(curve, truth):
        return float(np.sqrt(np.mean((centered(curve) - centered(truth)) ** 2)))

    a1, a2 = final.first_order_term(0, axis)[0], final.first_order_term(1, axis)[0]
    o1, o2 = orthogonal.first_order_term(0, axis), orthogonal.first_order_term(1, axis)
    result = {
        "axis": rounded(axis, 3),
        "truth1": rounded(centered(t1)),
        "truth2": rounded(centered(t2)),
        "additive1": rounded(centered(a1)),
        "additive2": rounded(centered(a2)),
        "oak1": rounded(centered(o1)),
        "oak2": rounded(centered(o2)),
        "additiveSolutions": count_distinct(additive_values),
        "oakSolutions": count_distinct(oak_values),
        "additiveValues": rounded(sorted(additive_values), 2),
        "oakValues": rounded(sorted(oak_values), 2),
        "errors": {"additive": [error(a1, t1), error(a2, t2)], "oak": [error(o1, t1), error(o2, t2)]},
        "shares": {"additive": rounded(additive_shares(final, grid)), "oak": rounded(orthogonal.order_shares(grid))},
        "lengths": {"additive": rounded(final.lengths(), 3), "oak": rounded(np.exp(orthogonal.unpack(orthogonal.theta)[0]), 3)},
    }
    print({k: result[k] for k in ("additiveSolutions", "oakSolutions", "additiveValues", "oakValues", "errors", "shares", "lengths")}, flush=True)
    (DATA_DIR / "identify.json").write_text(json.dumps(result))


# ---- 3次の関数 ----
ORDERS_SEED = 23
ORDERS_DIMENSION = 6
ORDERS_SIZES = [300, 600, 1000]
ORDERS_TEST = 1500
ORDERS_NOISE = 0.05
ORDERS_RANGE = (-1.5, 1.5)
ORDERS_ITERATIONS = 120
ORDERS_RESTARTS = 2
FREQUENCY = 2.0


def triples(X):
    s = np.sin(FREQUENCY * X)
    return 2 * (s[:, 0] * s[:, 1] * s[:, 2] + s[:, 3] * s[:, 4] * s[:, 5])


def run_orders():
    rows = []
    for size in ORDERS_SIZES:
        rng = np.random.default_rng(ORDERS_SEED)
        X = rng.uniform(*ORDERS_RANGE, size=(size, ORDERS_DIMENSION))
        clean = triples(X)
        scale = np.std(clean)
        y = clean / scale + ORDERS_NOISE * rng.normal(size=size)
        X_test = rng.uniform(*ORDERS_RANGE, size=(ORDERS_TEST, ORDERS_DIMENSION))
        y_test = triples(X_test) / scale
        orders = list(range(1, ORDERS_DIMENSION + 1))
        started = time.time()
        additive = ag.Model(orders=orders, dimension=ORDERS_DIMENSION).fit(X, y, seed=ORDERS_SEED, restarts=ORDERS_RESTARTS, max_iterations=ORDERS_ITERATIONS)
        measures = [oak.Measure("uniform", ORDERS_RANGE) for _ in range(ORDERS_DIMENSION)]
        orthogonal = oak.OrthogonalAdditive(dimension=ORDERS_DIMENSION, orders=orders, measures=measures).fit(X, y, seed=ORDERS_SEED, restarts=ORDERS_RESTARTS, max_iterations=ORDERS_ITERATIONS)
        rmse = lambda p: float(np.sqrt(np.mean((p - y_test) ** 2)))
        row = {
            "size": size,
            "additive": rounded(additive_shares(additive, X_test)),
            "additivePrior": rounded(additive.order_shares()),
            "oak": rounded(orthogonal.order_shares(X_test)),
            "rmse": {"additive": rmse(additive.predict(X_test)), "oak": rmse(orthogonal.predict(X_test))},
        }
        print(row, f"{time.time() - started:.0f}s", flush=True)
        rows.append(row)
    (DATA_DIR / "orders.json").write_text(json.dumps({"rows": rows, "dimension": ORDERS_DIMENSION}))


# ---- コンクリート強度 ----
CONCRETE_SEED = 31  # 加法ガウス過程の動画と同じ分割
CONCRETE_FOLDS = 10
CONCRETE_ITERATIONS = 300
MEASURE_POINTS = 200  # 入力の分布を表す点の数（経験分布の分位点）
PREVIOUS_ADDITIVE = "../加法ガウス過程_全次数の交互作用を学ぶカーネル_src/data/concrete-cv.json"


def empirical_measures(X):
    probabilities = (np.arange(MEASURE_POINTS) + 0.5) / MEASURE_POINTS
    return [oak.Measure("empirical", np.quantile(X[:, d], probabilities)) for d in range(X.shape[1])]


def run_concrete(fold_count):
    table = np.loadtxt(DATA_DIR / "concrete.csv", delimiter=",", skiprows=1)
    raw_inputs, raw_targets = table[:, :8], table[:, 8]
    order = np.random.default_rng(CONCRETE_SEED).permutation(len(raw_targets))
    folds = np.array_split(order, CONCRETE_FOLDS)
    standardize = lambda v, r: (v - r.mean(axis=0)) / r.std(axis=0)
    errors, shares = [], []
    orders = list(range(1, 9))
    for fold in range(fold_count):
        test = folds[fold]
        train = np.setdiff1d(order, test)
        X = standardize(raw_inputs[train], raw_inputs[train])
        X_test = standardize(raw_inputs[test], raw_inputs[train])
        y = standardize(raw_targets[train], raw_targets[train])
        y_test = standardize(raw_targets[test], raw_targets[train])
        started = time.time()
        model = oak.OrthogonalAdditive(dimension=8, orders=orders, measures=empirical_measures(X)).fit(X, y, seed=fold, restarts=1, max_iterations=CONCRETE_ITERATIONS)
        errors.append(float(np.mean((model.predict(X_test) - y_test) ** 2)))
        shares.append(rounded(model.order_shares(X)))
        print(f"fold {fold}: mse={errors[-1]:.4f} shares={shares[-1]} {time.time() - started:.0f}s", flush=True)
        (DATA_DIR / "concrete-oak.json").write_text(json.dumps({"errors": errors, "shares": shares}))
    print("平均", np.mean(errors), flush=True)


# ---- ベイズ最適化 ----
BO_SEEDS = 10
BO_DIMENSION = 10
BO_ITERATIONS = 100
BO_START_POINTS = 10
BO_GRID = 201
BO_CANDIDATES = 4000
BO_LENGTH_ADDITIVE = 0.1
BO_LENGTH_FULL = 0.5
BO_NOISE = 1e-3
BO_BETA = 2.0


def bump(x):
    return np.exp(-((x - 0.2) ** 2) / 0.02) + 0.7 * np.exp(-((x - 0.7) ** 2) / 0.03)


def objective(X):
    return np.sum(bump(X), axis=1)


def run_bo():
    grid = np.linspace(0, 1, BO_GRID)
    best_value = BO_DIMENSION * bump(grid).max()
    curves = {"additive": [], "full": [], "random": []}
    for seed in range(BO_SEEDS):
        rng = np.random.default_rng(1000 + seed)
        start = rng.uniform(size=(BO_START_POINTS, BO_DIMENSION))
        # 加法の構造を知っている場合: 1変数ずつ獲得関数を最大にできる
        X = start.copy()
        for _ in range(BO_ITERATIONS):
            y = objective(X)
            base = np.stack([np.exp(-((X[:, d, None] - X[:, d]) ** 2) / (2 * BO_LENGTH_ADDITIVE**2)) for d in range(BO_DIMENSION)])
            K = base.sum(axis=0) + BO_NOISE * np.eye(len(X))
            factor = ag.cho_factor(K, lower=True, check_finite=False)
            alpha = ag.cho_solve(factor, y - y.mean(), check_finite=False)
            new = np.zeros(BO_DIMENSION)
            for d in range(BO_DIMENSION):
                cross = np.exp(-((grid[:, None] - X[:, d]) ** 2) / (2 * BO_LENGTH_ADDITIVE**2))
                mean = cross @ alpha
                solved = ag.cho_solve(factor, cross.T, check_finite=False)
                sd = np.sqrt(np.maximum(1 - np.sum(cross * solved.T, axis=1), 1e-12))
                new[d] = grid[np.argmax(mean + BO_BETA * sd)]
            X = np.vstack([X, new])
        curves["additive"].append(np.maximum.accumulate(objective(X)))
        # 構造を使わない場合: 全変数の SE カーネルで、乱数の候補から選ぶ
        X = start.copy()
        for _ in range(BO_ITERATIONS):
            y = objective(X)
            K = np.exp(-ag.squared_differences(X, X).sum(axis=0) / (2 * BO_LENGTH_FULL**2)) + BO_NOISE * np.eye(len(X))
            factor = ag.cho_factor(K, lower=True, check_finite=False)
            alpha = ag.cho_solve(factor, y - y.mean(), check_finite=False)
            candidates = rng.uniform(size=(BO_CANDIDATES, BO_DIMENSION))
            cross = np.exp(-ag.squared_differences(candidates, X).sum(axis=0) / (2 * BO_LENGTH_FULL**2))
            solved = ag.cho_solve(factor, cross.T, check_finite=False)
            sd = np.sqrt(np.maximum(1 - np.sum(cross * solved.T, axis=1), 1e-12))
            X = np.vstack([X, candidates[np.argmax(cross @ alpha + BO_BETA * sd)]])
        curves["full"].append(np.maximum.accumulate(objective(X)))
        randoms = rng.uniform(size=(BO_START_POINTS + BO_ITERATIONS, BO_DIMENSION))
        randoms[:BO_START_POINTS] = start
        curves["random"].append(np.maximum.accumulate(objective(randoms)))
    result = {"best": float(best_value), "starts": BO_START_POINTS, "dimension": BO_DIMENSION, "seeds": BO_SEEDS}
    for name, rows in curves.items():
        result[name] = rounded(np.mean(rows, axis=0), 3)
    print({k: result[k][-1] for k in curves}, "best", best_value, flush=True)
    (DATA_DIR / "bo.json").write_text(json.dumps(result))


def run_bundle():
    bundle = {name: json.loads((DATA_DIR / f"{name}.json").read_text()) for name in ("identify", "orders", "concrete-oak", "bo")}
    text = "// 自動生成（tools/make_data.py bundle）。手で直さない。\nwindow.FOLLOWDATA = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";\n"
    BUNDLE.write_text(text)
    print(f"{BUNDLE}: {len(text) / 1024:.0f} KB")


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "identify":
        run_identify()
    elif command == "orders":
        run_orders()
    elif command == "concrete":
        run_concrete(int(sys.argv[2]) if len(sys.argv) > 2 else CONCRETE_FOLDS)
    elif command == "bo":
        run_bo()
    elif command == "bundle":
        run_bundle()
    else:
        print(__doc__)
