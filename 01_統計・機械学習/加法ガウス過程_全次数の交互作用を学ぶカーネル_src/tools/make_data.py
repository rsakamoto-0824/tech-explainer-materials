"""make_data.py — 動画の図に使う数値を計算して data/*.json に書き、js/add-data.js にまとめる。

  .venv/bin/python tools/make_data.py lshape      # L字のデータから遠くの山を当てる（論文の図5に当たる）
  .venv/bin/python tools/make_data.py orders      # 次数の分散の学習（合成データ）
  .venv/bin/python tools/make_data.py concrete-full       # コンクリート強度の全データで学習（論文の図2・表1に当たる。先に fetch_concrete.py）
  .venv/bin/python tools/make_data.py concrete-cv [分割の数] # コンクリート強度の交差検証（論文の表2に当たる。約1時間）
  .venv/bin/python tools/make_data.py bundle      # data/*.json を js/add-data.js にまとめる

乱数は種を固定している。
"""

import json
import pathlib
import sys
import time

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import additive_gp as ag  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
BUNDLE = ROOT / "js" / "add-data.js"

# ---- L字のデータ ----
LSHAPE_SEED = 11
LSHAPE_POINTS = 48
LSHAPE_NOISE = 0.05
LSHAPE_RANGE = (-2.0, 2.0)
LSHAPE_BAND = -1.0  # x1 < これ、または x2 < これ の範囲にだけデータを置く
LSHAPE_GRID = 81
LSHAPE_FREQUENCY = 2.0
LSHAPE_PEAK = 0.75  # f_i が最大になる位置


def lshape_component(x):
    return np.sin(LSHAPE_FREQUENCY * (x - LSHAPE_PEAK) + np.pi / 2)


def lshape_truth(points):
    return lshape_component(points[:, 0]) + lshape_component(points[:, 1])


def rounded(values, digits=4):
    return np.round(np.asarray(values, dtype=float), digits).tolist()


def run_lshape():
    rng = np.random.default_rng(LSHAPE_SEED)
    low, high = LSHAPE_RANGE
    points = []
    while len(points) < LSHAPE_POINTS:
        candidate = rng.uniform(low, high, size=2)
        if candidate[0] < LSHAPE_BAND or candidate[1] < LSHAPE_BAND:
            points.append(candidate)
    inputs = np.array(points)
    targets = lshape_truth(inputs) + LSHAPE_NOISE * rng.normal(size=LSHAPE_POINTS)

    axis = np.linspace(low, high, LSHAPE_GRID)
    grid = np.array([[a, b] for b in axis for a in axis])  # 行 = x2、列 = x1
    truth = lshape_truth(grid)

    additive = ag.Model(orders=[1, 2], dimension=2).fit(inputs, targets, seed=1, restarts=8, max_iterations=400, verbose=True)
    squared_exp = ag.Model(orders=[2], dimension=2).fit(inputs, targets, seed=1, restarts=8, max_iterations=400, verbose=True)
    additive_mean = additive.predict(grid)
    se_mean = squared_exp.predict(grid)

    far = (grid[:, 0] >= LSHAPE_BAND) & (grid[:, 1] >= LSHAPE_BAND)
    rmse = lambda p, mask: float(np.sqrt(np.mean((p[mask] - truth[mask]) ** 2)))
    peak = np.array([[LSHAPE_PEAK, LSHAPE_PEAK]])
    term_x = np.linspace(low, high, 121)
    term1 = additive.first_order_term(0, term_x)[0]
    term2 = additive.first_order_term(1, term_x)[0]
    result = {
        "points": rounded(inputs, 3),
        "values": rounded(targets, 3),
        "axis": rounded(axis, 3),
        "truth": rounded(truth, 3),
        "se": rounded(se_mean, 3),
        "additive": rounded(additive_mean, 3),
        "band": LSHAPE_BAND,
        "rmseFar": {"se": rmse(se_mean, far), "additive": rmse(additive_mean, far)},
        "peak": {
            "x": LSHAPE_PEAK,
            "truth": float(lshape_truth(peak)[0]),
            "se": float(squared_exp.predict(peak)[0]),
            "additive": float(additive.predict(peak)[0]),
        },
        "shares": rounded(additive.order_shares(), 4),
        "lengths": {"additive": rounded(additive.lengths(), 3), "se": rounded(squared_exp.lengths(), 3)},
        "noise": {"additive": additive.noise(), "se": squared_exp.noise()},
        "nll": {"additive": additive.nll, "se": squared_exp.nll},
        "termX": rounded(term_x, 3),
        "term1": rounded(term1, 4),
        "term2": rounded(term2, 4),
        "trueTerm": rounded(lshape_component(term_x), 4),
    }
    print({k: result[k] for k in ("rmseFar", "peak", "shares", "lengths", "noise", "nll")})
    (DATA_DIR / "lshape.json").write_text(json.dumps(result))


# ---- 次数の分散の学習（合成データ） ----
ORDERS_SEED = 21
ORDERS_DIMENSION = 6
ORDERS_TRAIN = 1000
ORDERS_TEST = 1500
ORDERS_SIZES = [300, 600, 1000]  # 3次の関数で、データの数を変えて次数の推定を比べる
ORDERS_NOISE = 0.05
ORDERS_INPUT_SCALE = 1.5  # 入力は [−1.5, 1.5] の一様分布
ORDERS_ITERATIONS = 120
ORDERS_RESTARTS = 2
FREQUENCY = 2.0


def sine(x):
    return np.sin(FREQUENCY * x)


def sum_of_singles(X):
    return sum(sine(X[:, i]) for i in range(ORDERS_DIMENSION)) / np.sqrt(ORDERS_DIMENSION / 2)


def sum_of_pairs(X):
    return sine(X[:, 0]) * sine(X[:, 1]) * 1.5 + sine(X[:, 2]) * sine(X[:, 3]) * 1.5 + sine(X[:, 4]) * sine(X[:, 5]) * 1.5


def sum_of_triples(X):
    return 2 * (sine(X[:, 0]) * sine(X[:, 1]) * sine(X[:, 2]) + sine(X[:, 3]) * sine(X[:, 4]) * sine(X[:, 5]))


def all_at_once(X):
    return np.prod(sine(X), axis=1)


ORDER_CASES = [
    ("1つずつの和", "f(x) = Σ sin(2xᵢ)", sum_of_singles, 1),
    ("2つずつの積の和", "f(x) = sin(2x₁)sin(2x₂) + …（3組）", sum_of_pairs, 2),
    ("3つずつの積の和", "f(x) = sin(2x₁)sin(2x₂)sin(2x₃) + …（2組）", sum_of_triples, 3),
    ("6つ全部の積", "f(x) = sin(2x₁)⋯sin(2x₆)", all_at_once, 6),
]


def fit_order_case(function, train_size, seed):
    """データを作って3つのモデルを学習し、加法ガウス過程と各モデルのテスト誤差を返す。"""
    rng = np.random.default_rng(seed)
    low, high = -ORDERS_INPUT_SCALE, ORDERS_INPUT_SCALE
    X = rng.uniform(low, high, size=(train_size, ORDERS_DIMENSION))
    y_clean = function(X)
    scale = np.std(y_clean)
    y = y_clean / scale + ORDERS_NOISE * rng.normal(size=train_size)
    X_test = rng.uniform(low, high, size=(ORDERS_TEST, ORDERS_DIMENSION))
    y_test = function(X_test) / scale
    options = dict(seed=seed, restarts=ORDERS_RESTARTS, max_iterations=ORDERS_ITERATIONS)
    additive = ag.Model(orders=list(range(1, ORDERS_DIMENSION + 1)), dimension=ORDERS_DIMENSION).fit(X, y, **options)
    squared_exp = ag.Model(orders=[ORDERS_DIMENSION], dimension=ORDERS_DIMENSION).fit(X, y, **options)
    gam = ag.Model(orders=[1], dimension=ORDERS_DIMENSION).fit(X, y, **options)
    rmse = lambda model: float(np.sqrt(np.mean((model.predict(X_test) - y_test) ** 2)))
    return additive, {"additive": rmse(additive), "se": rmse(squared_exp), "gam": rmse(gam)}


def run_orders():
    cases = []
    for index, (label, formula, function, expected) in enumerate(ORDER_CASES):
        started = time.time()
        additive, errors = fit_order_case(function, ORDERS_TRAIN, ORDERS_SEED + index)
        case = {
            "label": label,
            "formula": formula,
            "expected": expected,
            "shares": rounded(additive.order_shares(), 4),
            "path": [rounded(additive.order_shares(theta), 4) for theta in additive.history],
            "rmse": errors,
        }
        print(label, "shares", case["shares"], errors, "steps", len(case["path"]), f"{time.time() - started:.0f}s", flush=True)
        cases.append(case)
    sizes = []
    for size in ORDERS_SIZES:
        started = time.time()
        additive, errors = fit_order_case(sum_of_triples, size, ORDERS_SEED + 2)
        sizes.append({"size": size, "shares": rounded(additive.order_shares(), 4), "rmse": errors, "lengths": rounded(additive.lengths(), 2)})
        print("3次の関数", size, sizes[-1], f"{time.time() - started:.0f}s", flush=True)
    (DATA_DIR / "orders.json").write_text(
        json.dumps({"cases": cases, "sizes": sizes, "dimension": ORDERS_DIMENSION, "train": ORDERS_TRAIN, "test": ORDERS_TEST})
    )


# ---- コンクリート強度 ----
CONCRETE_SEED = 31
CONCRETE_FOLDS = 10
CONCRETE_ITERATIONS = 300
WATER_COLUMN = 3
AGE_COLUMN = 7
TERM_POINTS = 121


def load_concrete():
    table = np.loadtxt(DATA_DIR / "concrete.csv", delimiter=",", skiprows=1)
    return table[:, :8], table[:, 8]


def standardize(values, reference):
    return (values - reference.mean(axis=0)) / reference.std(axis=0)


def run_concrete_cv(fold_count):
    """論文の表2に当たる計算: 10分割の平均二乗誤差（目的変数は学習データで標準化）。"""
    raw_inputs, raw_targets = load_concrete()
    order = np.random.default_rng(CONCRETE_SEED).permutation(len(raw_targets))
    folds = np.array_split(order, CONCRETE_FOLDS)
    models = {
        "additive": dict(orders=list(range(1, 9)), use_scale=True),
        "se": dict(orders=[8], use_scale=False),
        "gam": dict(orders=[1], use_scale=True),
    }
    errors = {name: [] for name in models}
    fold_shares = []
    for fold in range(fold_count):
        test = folds[fold]
        train = np.setdiff1d(order, test)
        X = standardize(raw_inputs[train], raw_inputs[train])
        X_test = standardize(raw_inputs[test], raw_inputs[train])
        y = standardize(raw_targets[train], raw_targets[train])
        y_test = standardize(raw_targets[test], raw_targets[train])
        for name, options in models.items():
            started = time.time()
            model = ag.Model(dimension=8, **options).fit(X, y, seed=fold, restarts=1, max_iterations=CONCRETE_ITERATIONS)
            mse = float(np.mean((model.predict(X_test) - y_test) ** 2))
            errors[name].append(mse)
            print(f"fold {fold} {name}: mse={mse:.4f} nll={model.nll:.1f} {time.time() - started:.0f}s", flush=True)
            if name == "additive":
                fold_shares.append(rounded(model.order_shares(), 4))
                print("  shares", fold_shares[-1], flush=True)
        (DATA_DIR / "concrete-cv.json").write_text(json.dumps({"errors": errors, "foldShares": fold_shares}))
    print({k: float(np.mean(v)) for k, v in errors.items()}, flush=True)


def run_concrete_full():
    """論文の図2・表1に当たる計算: 全データで学習し、水と材齢の項と次数の分散を取り出す。"""
    raw_inputs, raw_targets = load_concrete()
    X = standardize(raw_inputs, raw_inputs)
    y_mean, y_std = raw_targets.mean(), raw_targets.std()
    y = (raw_targets - y_mean) / y_std
    gam = ag.Model(orders=[1], dimension=8, use_scale=True).fit(X, y, seed=0, restarts=1, max_iterations=CONCRETE_ITERATIONS)
    terms_at_data = [gam.first_order_term(d, X[:, d])[0] for d in range(8)]
    fitted_total = gam.mean + np.sum(terms_at_data, axis=0)

    def term_for(column):
        low, high = raw_inputs[:, column].min(), raw_inputs[:, column].max()
        raw_axis = np.linspace(low, high, TERM_POINTS)
        scaled = (raw_axis - raw_inputs[:, column].mean()) / raw_inputs[:, column].std()
        mean, sd = gam.first_order_term(column, scaled)
        partial = y - (fitted_total - terms_at_data[column])
        return {
            "x": rounded(raw_axis, 2),
            "mean": rounded(mean * y_std, 3),
            "sd": rounded(sd * y_std, 3),
            "dataX": rounded(raw_inputs[:, column], 1),
            "dataY": rounded(partial * y_std, 2),
        }

    full = ag.Model(orders=list(range(1, 9)), dimension=8, use_scale=True).fit(X, y, seed=0, restarts=1, max_iterations=CONCRETE_ITERATIONS)
    result = {
        "water": term_for(WATER_COLUMN),
        "age": term_for(AGE_COLUMN),
        "shares": rounded(full.order_shares(), 4),
        "yStd": float(y_std),
        "yMean": float(y_mean),
    }
    print("shares (全データ)", result["shares"], flush=True)
    (DATA_DIR / "concrete.json").write_text(json.dumps(result))


def run_bundle():
    bundle = {name: json.loads((DATA_DIR / f"{name}.json").read_text()) for name in ("lshape", "orders", "concrete", "concrete-cv")}
    text = "// 自動生成（tools/make_data.py bundle）。手で直さない。\nwindow.ADDDATA = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";\n"
    BUNDLE.write_text(text)
    print(f"{BUNDLE}: {len(text) / 1024:.0f} KB")


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "lshape":
        run_lshape()
    elif command == "orders":
        run_orders()
    elif command == "concrete-full":
        run_concrete_full()
    elif command == "concrete-cv":
        run_concrete_cv(int(sys.argv[2]) if len(sys.argv) > 2 else CONCRETE_FOLDS)
    elif command == "bundle":
        run_bundle()
    else:
        print(__doc__)
