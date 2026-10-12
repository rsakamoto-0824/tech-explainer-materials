"""因果フォレスト解説資料のデモ計算。

真の処置効果が分かっている合成データ（観察データを想定し、交絡あり）を作り、
EconML の CausalForestDML で個別の処置効果（CATE）を推定する。
スライドのグラフに使う数値を demo_results.json に書き出す。
"""

import json
from pathlib import Path

import econml
import numpy as np
from econml.dml import CausalForestDML
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

RANDOM_SEED = 20260922
N_TRAIN = 4000
N_TEST = 1000
N_FEATURES = 6
N_TREES = 2000
N_CURVE_POINTS = 41
N_SCATTER_POINTS = 300
N_GROUPS = 4
STEEP_REGION_HALF_WIDTH = 0.3
OUTPUT_PATH = Path(__file__).with_name("demo_results.json")


def true_effect(x1):
    """真の処置効果。x1 が小さいとマイナス、大きいとプラスになる。"""
    return -0.5 + 3.0 / (1.0 + np.exp(-5.0 * x1))


def generate_data(n_samples, rng):
    features = rng.uniform(-1.0, 1.0, size=(n_samples, N_FEATURES))
    x1, x2, x3 = features[:, 0], features[:, 1], features[:, 2]
    # x2 が大きいほど処置を受けやすく、結果も高くなる（交絡）
    propensity = 1.0 / (1.0 + np.exp(-2.0 * x2))
    treatment = rng.binomial(1, propensity)
    baseline = 2.0 * x2 + x3 ** 2
    effect = true_effect(x1)
    outcome = baseline + treatment * effect + rng.normal(0.0, 1.0, n_samples)
    return features, treatment, outcome, effect, propensity


def fit_nuisance_for_dr_scores(x_train, w_train, y_train, rng_seed):
    """検証用の二重頑健（DR）スコアに使う補助モデルを学習データで作る。"""
    outcome_models = {}
    for arm in (0, 1):
        model = RandomForestRegressor(n_estimators=500, min_samples_leaf=10, random_state=rng_seed + arm)
        model.fit(x_train[w_train == arm], y_train[w_train == arm])
        outcome_models[arm] = model
    propensity_model = RandomForestClassifier(n_estimators=500, min_samples_leaf=10, random_state=rng_seed + 2)
    propensity_model.fit(x_train, w_train)
    return outcome_models, propensity_model


def dr_scores(x, w, y, outcome_models, propensity_model):
    mu0 = outcome_models[0].predict(x)
    mu1 = outcome_models[1].predict(x)
    # 極端な重みで分散が爆発しないよう、傾向スコアを端で切る
    e_hat = np.clip(propensity_model.predict_proba(x)[:, 1], 0.05, 0.95)
    return mu1 - mu0 + w * (y - mu1) / e_hat - (1 - w) * (y - mu0) / (1 - e_hat)


def main():
    rng = np.random.default_rng(RANDOM_SEED)
    x_train, w_train, y_train, tau_train, e_train = generate_data(N_TRAIN, rng)
    x_test, w_test, y_test, tau_test, _ = generate_data(N_TEST, rng)

    estimator = CausalForestDML(
        model_y=RandomForestRegressor(n_estimators=500, min_samples_leaf=10, random_state=1),
        model_t=RandomForestClassifier(n_estimators=500, min_samples_leaf=10, random_state=2),
        discrete_treatment=True,
        cv=5,
        n_estimators=N_TREES,
        min_samples_leaf=5,
        max_samples=0.5,
        honest=True,
        inference=True,
        random_state=3,
    )
    estimator.fit(y_train, w_train, X=x_train)

    tau_hat = estimator.effect(x_test)
    lower, upper = estimator.effect_interval(x_test, alpha=0.05)
    coverage = float(np.mean((lower <= tau_test) & (tau_test <= upper)))
    rmse = float(np.sqrt(np.mean((tau_hat - tau_test) ** 2)))
    correlation = float(np.corrcoef(tau_hat, tau_test)[0, 1])

    ate_hat = float(estimator.ate_[0]) if np.ndim(estimator.ate_) else float(estimator.ate_)
    ate_se = float(np.ravel(estimator.ate_stderr_)[0])
    naive_difference = float(y_train[w_train == 1].mean() - y_train[w_train == 0].mean())
    true_ate_train = float(tau_train.mean())

    # 推定効果を x1 だけ動かして描く（他の特徴量は 0 に固定）
    x1_grid = np.linspace(-1.0, 1.0, N_CURVE_POINTS)
    grid = np.zeros((N_CURVE_POINTS, N_FEATURES))
    grid[:, 0] = x1_grid
    curve_hat = estimator.effect(grid)
    curve_lower, curve_upper = estimator.effect_interval(grid, alpha=0.05)

    # 推定効果の大きさでテストデータを4群に分け、群ごとに比べる
    outcome_models, propensity_model = fit_nuisance_for_dr_scores(x_train, w_train, y_train, RANDOM_SEED)
    scores_test = dr_scores(x_test, w_test, y_test, outcome_models, propensity_model)
    group_edges = np.quantile(tau_hat, np.linspace(0, 1, N_GROUPS + 1))
    group_index = np.clip(np.searchsorted(group_edges, tau_hat, side="right") - 1, 0, N_GROUPS - 1)
    groups = []
    for g in range(N_GROUPS):
        mask = group_index == g
        groups.append({
            "label": f"Q{g + 1}",
            "n": int(mask.sum()),
            "cate_mean": float(tau_hat[mask].mean()),
            "dr_mean": float(scores_test[mask].mean()),
            "dr_se": float(scores_test[mask].std(ddof=1) / np.sqrt(mask.sum())),
            "true_mean": float(tau_test[mask].mean()),
        })

    # 真の効果の大きさで4等分した群（導入スライド用）
    true_edges = np.quantile(tau_test, np.linspace(0, 1, N_GROUPS + 1))
    true_index = np.clip(np.searchsorted(true_edges, tau_test, side="right") - 1, 0, N_GROUPS - 1)
    true_quartile_means = [float(tau_test[true_index == g].mean()) for g in range(N_GROUPS)]

    # 信頼区間の被覆率を、効果が急に変わる領域（|x1| < 0.3）とそれ以外で比べる
    steep = np.abs(x_test[:, 0]) < STEEP_REGION_HALF_WIDTH
    covered = (lower <= tau_test) & (tau_test <= upper)
    coverage_by_region = {
        "steep": float(covered[steep].mean()), "steep_n": int(steep.sum()),
        "flat": float(covered[~steep].mean()), "flat_n": int((~steep).sum()),
        "bias_steep_abs": float(np.mean(np.abs(tau_hat[steep] - tau_test[steep]))),
        "bias_flat_abs": float(np.mean(np.abs(tau_hat[~steep] - tau_test[~steep]))),
    }

    scatter_idx = np.argsort(x_test[:, 0])[:: max(1, N_TEST // N_SCATTER_POINTS)][:N_SCATTER_POINTS]

    results = {
        "settings": {
            "n_train": N_TRAIN, "n_test": N_TEST, "n_features": N_FEATURES, "n_trees": N_TREES,
            "seed": RANDOM_SEED, "econml_min_samples_leaf": 5, "max_samples": 0.5,
            "propensity_range_train": [float(e_train.min()), float(e_train.max())],
            "treated_share_train": float(w_train.mean()),
        },
        "ate": {
            "true": true_ate_train, "naive": naive_difference,
            "forest": ate_hat, "forest_se": ate_se,
            "forest_ci": [ate_hat - 1.96 * ate_se, ate_hat + 1.96 * ate_se],
        },
        "cate_quality": {"rmse": rmse, "coverage95": coverage, "correlation": correlation},
        "share_negative_true": float(np.mean(tau_test < 0)),
        "share_negative_hat": float(np.mean(tau_hat < 0)),
        "share_negative_hat_significant": float(np.mean(upper < 0)),
        "curve": {
            "x1": x1_grid.tolist(), "true": true_effect(x1_grid).tolist(),
            "hat": curve_hat.tolist(), "lower": curve_lower.tolist(), "upper": curve_upper.tolist(),
        },
        "scatter": {
            "x1": x_test[scatter_idx, 0].tolist(), "hat": tau_hat[scatter_idx].tolist(),
            "true": tau_test[scatter_idx].tolist(),
        },
        "feature_importance": np.ravel(estimator.feature_importances_).tolist(),
        "groups": groups,
        "true_quartile_means": true_quartile_means,
        "coverage_by_region": coverage_by_region,
        "econml_version": econml.__version__,
    }
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({k: results[k] for k in ("settings", "ate", "cate_quality", "feature_importance", "groups")}, indent=2))
    print("true quartiles:", true_quartile_means)
    print("coverage by region:", coverage_by_region)
    print("share_negative true/hat/sig:", results["share_negative_true"], results["share_negative_hat"],
          results["share_negative_hat_significant"])


if __name__ == "__main__":
    main()
