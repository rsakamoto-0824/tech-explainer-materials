"""AIC・BIC 解説資料のデモ計算。結果を demo_results.json に書き出す。

1. overfit      : 多項式回帰の次数と、学習誤差・テスト誤差・AIC・BIC
2. optimism     : 最大対数尤度の「楽観的な偏り」がパラメータ数 k に近いことの確認（n=20, 100）
3. selection    : 全組み合わせ探索で、AIC・BIC が真のモデルを選ぶ確率（n を変えて比較）
4. prediction   : 真の効果が「少数で大きい」場合と「多数で小さい」場合の予測誤差の比較
5. allsubsets   : 1つのデータで、変数の数ごとの最良の AIC・BIC
6. stepwise     : 変数増減法（AIC・BIC）の各ステップ
7. lasso        : Lasso の正則化パスに沿った AIC・BIC（scikit-learn の LassoLarsIC と照合）

乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる。
"""

import itertools
import json
from pathlib import Path

import numpy as np
from sklearn.linear_model import LassoLarsIC, lars_path

OUTPUT_PATH = Path(__file__).with_name("demo_results.json")
SEED = 20260926

# 共通の設定（変数選択のデモ）
N_CANDIDATES = 8                                   # 候補の説明変数の数
TRUE_COEF_SPARSE = np.array([1.0, 0.7, 0.5, 0, 0, 0, 0, 0])   # x1〜x3 だけが効く
TRUE_COEF_DENSE = np.array([0.6, 0.45, 0.35, 0.25, 0.18, 0.12, 0.08, 0.05])  # 全部少しずつ効く
NOISE_SD = 1.0
PREDICTOR_CORR = 0.3                               # 説明変数どうしの相関


# ---------------------------------------------------------------------
# 共通の計算
# ---------------------------------------------------------------------

def gaussian_loglik(rss, n):
    """正規線形回帰の最大対数尤度（分散も最尤推定したとき）"""
    return -0.5 * n * (np.log(2 * np.pi * rss / n) + 1)


def criteria(rss, n, k):
    """k は推定するパラメータ数（切片・係数・誤差分散をすべて数える）"""
    loglik = gaussian_loglik(rss, n)
    aic = -2 * loglik + 2 * k
    bic = -2 * loglik + k * np.log(n)
    aicc = aic + 2 * k * (k + 1) / (n - k - 1)
    return {"loglik": loglik, "aic": aic, "bic": bic, "aicc": aicc}


def rss_of(X, y):
    coef, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ coef
    return float(resid @ resid), coef


def design(X, subset):
    """切片の列と、選んだ変数の列からなる計画行列"""
    return np.column_stack([np.ones(len(X))] + [X[:, j] for j in subset])


def make_predictors(rng, n, p=N_CANDIDATES, corr=PREDICTOR_CORR):
    cov = np.full((p, p), corr) + (1 - corr) * np.eye(p)
    return rng.multivariate_normal(np.zeros(p), cov, size=n)


ALL_SUBSETS = [s for r in range(N_CANDIDATES + 1) for s in itertools.combinations(range(N_CANDIDATES), r)]


def best_subset(X, y, criterion):
    """全 2^p 通りの中で規準が最小のモデル（変数の添字のタプル）を返す"""
    n = len(y)
    best, best_value = None, np.inf
    for s in ALL_SUBSETS:
        rss, _ = rss_of(design(X, s), y)
        value = criteria(rss, n, len(s) + 2)[criterion]
        if value < best_value:
            best, best_value = s, value
    return best


# ---------------------------------------------------------------------
# 1. 多項式回帰の次数
# ---------------------------------------------------------------------

def demo_overfit(rng):
    n_train, n_test = 30, 2000
    max_degree = 12

    def truth(x):
        return np.sin(2 * np.pi * x) + 0.5 * x

    noise = 0.3
    x_train = rng.uniform(0, 1, n_train)
    y_train = truth(x_train) + rng.normal(0, noise, n_train)
    x_test = rng.uniform(0, 1, n_test)
    y_test = truth(x_test) + rng.normal(0, noise, n_test)

    def poly(x, d):
        # 数値の安定のため -1〜1 に変換してから累乗する
        z = 2 * x - 1
        return np.column_stack([z ** j for j in range(d + 1)])

    rows = []
    for d in range(max_degree + 1):
        rss, coef = rss_of(poly(x_train, d), y_train)
        pred = poly(x_test, d) @ coef
        test_rmse = float(np.sqrt(np.mean((y_test - pred) ** 2)))
        c = criteria(rss, n_train, d + 2)
        rows.append({
            "degree": d,
            "train_rmse": float(np.sqrt(rss / n_train)),
            "test_rmse": test_rmse,
            "aic": float(c["aic"]), "bic": float(c["bic"]), "aicc": float(c["aicc"]),
        })
    best = {key: min(rows, key=lambda r: r[key])["degree"] for key in ("test_rmse", "aic", "bic", "aicc")}
    return {"n_train": n_train, "noise_sd": noise, "rows": rows, "best_degree": best}


# ---------------------------------------------------------------------
# 2. 最大対数尤度の楽観的な偏り
# ---------------------------------------------------------------------

def demo_optimism(rng):
    """同じデータで推定・評価した対数尤度と、新しいデータでの期待対数尤度の差を測る。

    新しいデータでの期待対数尤度は、推定した正規分布と真の分布（既知）から解析的に計算する。
    """
    reps = 4000
    results = []
    for n in (20, 100):
        for k in (2, 4, 6, 8, 10):
            n_coef = k - 1          # k = 係数（切片含む）+ 誤差分散
            beta = np.zeros(n_coef)
            beta[0] = 1.0
            gaps = []
            for _ in range(reps):
                X = np.column_stack([np.ones(n), rng.normal(size=(n, n_coef - 1))])
                y = X @ beta + rng.normal(0, 1, n)
                rss, coef = rss_of(X, y)
                sigma2 = rss / n
                ll_train = gaussian_loglik(rss, n)
                # 同じ X の下で新しい y を取ったときの期待対数尤度（真の分散は 1）
                bias_sq = float(np.sum((X @ (coef - beta)) ** 2))
                ll_new = -0.5 * n * np.log(2 * np.pi * sigma2) - (n * 1.0 + bias_sq) / (2 * sigma2)
                gaps.append(ll_train - ll_new)
            results.append({
                "n": n, "k": k,
                "simulated": float(np.mean(gaps)),
                "aicc_theory": n * k / (n - k - 1),
            })
    return {"reps": reps, "rows": results}


# ---------------------------------------------------------------------
# 3. 真のモデルを選ぶ確率
# ---------------------------------------------------------------------

def demo_selection(rng):
    sample_sizes = [30, 50, 100, 200, 500, 1000, 2000]
    reps = 300
    true_set = (0, 1, 2)
    rows = []
    for n in sample_sizes:
        counts = {c: {"exact": 0, "over": 0, "under": 0, "size": 0} for c in ("aic", "bic")}
        for _ in range(reps):
            X = make_predictors(rng, n)
            y = X @ TRUE_COEF_SPARSE + rng.normal(0, NOISE_SD, n)
            for c in ("aic", "bic"):
                chosen = best_subset(X, y, c)
                counts[c]["size"] += len(chosen)
                if chosen == true_set:
                    counts[c]["exact"] += 1
                elif set(true_set) <= set(chosen):
                    counts[c]["over"] += 1
                else:
                    counts[c]["under"] += 1
        row = {"n": n}
        for c in ("aic", "bic"):
            row[c] = {
                "p_exact": counts[c]["exact"] / reps,
                "p_over": counts[c]["over"] / reps,
                "p_under": counts[c]["under"] / reps,
                "mean_size": counts[c]["size"] / reps,
            }
        rows.append(row)
        print(f"  selection n={n}: AIC {row['aic']['p_exact']:.2f} / BIC {row['bic']['p_exact']:.2f}")
    return {"reps": reps, "true_set": list(true_set), "rows": rows}


# ---------------------------------------------------------------------
# 4. 予測誤差の比較
# ---------------------------------------------------------------------

def demo_prediction(rng):
    n, n_test, reps = 60, 2000, 300
    scenarios = {"sparse": TRUE_COEF_SPARSE, "dense": TRUE_COEF_DENSE}
    out = {}
    for name, beta in scenarios.items():
        errors = {"aic": [], "bic": [], "full": []}
        sizes = {"aic": [], "bic": []}
        for _ in range(reps):
            X = make_predictors(rng, n)
            y = X @ beta + rng.normal(0, NOISE_SD, n)
            X_test = make_predictors(rng, n_test)
            mean_test = X_test @ beta
            fits = {"aic": best_subset(X, y, "aic"), "bic": best_subset(X, y, "bic"), "full": tuple(range(N_CANDIDATES))}
            for key, subset in fits.items():
                _, coef = rss_of(design(X, subset), y)
                pred = design(X_test, subset) @ coef
                # 予測の平均二乗誤差（新しい観測のノイズ分 1 を足す前の値）
                errors[key].append(float(np.mean((mean_test - pred) ** 2)))
                if key in sizes:
                    sizes[key].append(len(subset))
        out[name] = {
            "beta": beta.tolist(),
            "excess_mse": {k: float(np.mean(v)) for k, v in errors.items()},
            "mean_size": {k: float(np.mean(v)) for k, v in sizes.items()},
            "aic_wins": float(np.mean(np.array(errors["aic"]) < np.array(errors["bic"]))),
        }
        print(f"  prediction {name}: AIC {out[name]['excess_mse']['aic']:.4f} / BIC {out[name]['excess_mse']['bic']:.4f}")
    return {"n": n, "reps": reps, "scenarios": out}


# ---------------------------------------------------------------------
# 5〜7. 1つのデータセットでの変数選択
# ---------------------------------------------------------------------

def demo_allsubsets(X, y):
    n = len(y)
    by_size = []
    for size in range(N_CANDIDATES + 1):
        best = None
        for s in itertools.combinations(range(N_CANDIDATES), size):
            rss, _ = rss_of(design(X, s), y)
            c = criteria(rss, n, size + 2)
            if best is None or rss < best["rss"]:
                best = {"size": size, "vars": [f"x{j + 1}" for j in s], "rss": rss,
                        "aic": float(c["aic"]), "bic": float(c["bic"]), "loglik": float(c["loglik"])}
        by_size.append(best)
    # すべてのモデル（散布図用）
    all_models = []
    for s in ALL_SUBSETS:
        rss, _ = rss_of(design(X, s), y)
        c = criteria(rss, n, len(s) + 2)
        all_models.append({"size": len(s), "aic": float(c["aic"]), "bic": float(c["bic"])})
    aic_values = np.array([m["aic"] for m in all_models])
    weights = np.exp(-0.5 * (aic_values - aic_values.min()))
    weights /= weights.sum()
    order = np.argsort(aic_values)[:5]
    top_models = []
    for idx in order:
        s = ALL_SUBSETS[idx]
        top_models.append({"vars": [f"x{j + 1}" for j in s], "aic": float(aic_values[idx]),
                           "delta": float(aic_values[idx] - aic_values.min()), "weight": float(weights[idx])})
    # 変数の重要度：その変数を含むモデルの Akaike weight の合計
    importance = [float(sum(w for s, w in zip(ALL_SUBSETS, weights) if j in s)) for j in range(N_CANDIDATES)]
    return {"by_size": by_size, "all_models": all_models, "n_models": len(ALL_SUBSETS), "aic_top5": top_models,
            "aic_importance": importance}


def demo_stepwise(X, y, criterion):
    """空のモデルから、追加と削除の両方を試す変数増減法"""
    n = len(y)
    current = []

    def value(subset):
        rss, _ = rss_of(design(X, sorted(subset)), y)
        return float(criteria(rss, n, len(subset) + 2)[criterion])

    steps = [{"action": "開始（切片のみ）", "vars": [], "value": value(current)}]
    while True:
        candidates = []
        for j in range(N_CANDIDATES):
            if j not in current:
                candidates.append((value(current + [j]), f"x{j + 1} を追加", current + [j]))
            else:
                reduced = [v for v in current if v != j]
                candidates.append((value(reduced), f"x{j + 1} を削除", reduced))
        best_value, action, subset = min(candidates, key=lambda c: c[0])
        if best_value >= steps[-1]["value"]:
            break
        current = subset
        steps.append({"action": action, "vars": [f"x{j + 1}" for j in sorted(current)], "value": best_value})
    return steps


def demo_lasso(X, y):
    """Lasso の正則化パス上で、非ゼロ係数の数を自由度として AIC・BIC を計算する"""
    n = len(y)
    Xc = X - X.mean(axis=0)
    yc = y - y.mean()
    alphas, _, coefs = lars_path(Xc, yc, method="lasso")
    rows = []
    for a, coef in zip(alphas, coefs.T):
        resid = yc - Xc @ coef
        rss = float(resid @ resid)
        df = int(np.sum(np.abs(coef) > 1e-12))
        c = criteria(rss, n, df + 2)
        rows.append({"alpha": float(a), "df": df, "aic": float(c["aic"]), "bic": float(c["bic"]),
                     "coef": coef.tolist()})
    best = {c: min(rows, key=lambda r: r[c]) for c in ("aic", "bic")}
    # scikit-learn の LassoLarsIC（誤差分散は全変数モデルから推定する別の定義）と照合する
    sk = {}
    for c in ("aic", "bic"):
        model = LassoLarsIC(criterion=c).fit(X, y)
        sk[c] = {"alpha": float(model.alpha_), "vars": [f"x{j + 1}" for j in np.flatnonzero(model.coef_)]}
    return {
        "rows": rows,
        "best": {c: {"alpha": best[c]["alpha"], "df": best[c]["df"],
                     "vars": [f"x{j + 1}" for j in np.flatnonzero(np.abs(best[c]["coef"]) > 1e-12)]} for c in best},
        "sklearn": sk,
    }


def main():
    rng = np.random.default_rng(SEED)
    results = {}
    print("1. overfit");    results["overfit"] = demo_overfit(rng)
    print("2. optimism");   results["optimism"] = demo_optimism(rng)
    print("3. selection");  results["selection"] = demo_selection(rng)
    print("4. prediction"); results["prediction"] = demo_prediction(rng)

    n_example = 100
    X = make_predictors(rng, n_example)
    y = X @ TRUE_COEF_SPARSE + rng.normal(0, NOISE_SD, n_example)
    print("5-7. example dataset")
    results["example"] = {
        "n": n_example,
        "true_coef": TRUE_COEF_SPARSE.tolist(),
        "allsubsets": demo_allsubsets(X, y),
        "stepwise": {"aic": demo_stepwise(X, y, "aic"), "bic": demo_stepwise(X, y, "bic")},
        "lasso": demo_lasso(X, y),
    }
    # MATLAB・Python のコード例で同じデータを使えるように保存する
    np.savetxt(Path(__file__).with_name("example_data.csv"), np.column_stack([X, y]), delimiter=",",
               header=",".join([f"x{j + 1}" for j in range(N_CANDIDATES)] + ["y"]), comments="", fmt="%.6f")
    results["settings"] = {
        "seed": SEED, "n_candidates": N_CANDIDATES, "noise_sd": NOISE_SD, "predictor_corr": PREDICTOR_CORR,
        "true_coef_sparse": TRUE_COEF_SPARSE.tolist(), "true_coef_dense": TRUE_COEF_DENSE.tolist(),
    }
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"書き出し: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
