"""潜在変数モデル解説資料のデモ計算。

1. 混合ガウスモデル（GMM）を EM アルゴリズムで推定する（NumPy で実装し、scikit-learn と照合）
2. 成分数 K を BIC で選ぶ
3. 因子分析で、真の因子負荷量を復元できるか確かめる

スライドのグラフに使う数値を demo_results.json に書き出す。
"""

import json
from pathlib import Path

import numpy as np
import sklearn
from sklearn.cluster import KMeans
from sklearn.decomposition import FactorAnalysis
from sklearn.mixture import GaussianMixture

RANDOM_SEED = 20260922
OUTPUT_PATH = Path(__file__).with_name("demo_results.json")

# ---- 混合ガウスモデルの真の設定 ----
TRUE_WEIGHTS = np.array([0.4, 0.35, 0.25])
TRUE_MEANS = np.array([[0.0, 0.0], [3.0, 0.0], [1.5, 4.5]])
TRUE_COVS = np.array([
    [[2.0, 1.8], [1.8, 2.0]],     # 右上がりに細長い
    [[2.0, -1.8], [-1.8, 2.0]],   # 右下がりに細長い
    [[0.4, 0.0], [0.0, 0.4]],     # 丸い
])
N_SAMPLES_GMM = 600
N_COMPONENTS = 3
EM_MAX_ITER = 300
EM_TOL = 1e-8
N_RANDOM_STARTS = 30
BIC_K_RANGE = range(1, 8)
SCATTER_ROUND_DIGITS = 3
AMBIGUOUS_THRESHOLD = 0.9

# ---- 因子分析の真の設定（6変数・2因子） ----
TRUE_LOADINGS = np.array([
    [0.8, 0.0], [0.7, 0.1], [0.6, 0.0],
    [0.0, 0.8], [0.1, 0.7], [0.0, 0.6],
])
N_SAMPLES_FA = 1000


def log_gaussian(x, mean, cov):
    """多変量正規分布の対数密度（コレスキー分解で安定に計算）。"""
    dim = x.shape[1]
    chol = np.linalg.cholesky(cov)
    solved = np.linalg.solve(chol, (x - mean).T)
    log_det = 2.0 * np.sum(np.log(np.diag(chol)))
    return -0.5 * (dim * np.log(2 * np.pi) + log_det + np.sum(solved ** 2, axis=0))


def run_em(x, n_components, rng, max_iter=EM_MAX_ITER, tol=EM_TOL):
    """EM アルゴリズムで GMM を推定し、各反復の平均対数尤度も返す。"""
    n, dim = x.shape
    means = x[rng.choice(n, n_components, replace=False)]
    covs = np.array([np.cov(x.T) for _ in range(n_components)])
    weights = np.full(n_components, 1.0 / n_components)
    history = []
    for _ in range(max_iter):
        # E ステップ：各点が各成分から来た確率（責任度）
        log_joint = np.column_stack([np.log(weights[k]) + log_gaussian(x, means[k], covs[k]) for k in range(n_components)])
        log_norm = np.logaddexp.reduce(log_joint, axis=1)
        resp = np.exp(log_joint - log_norm[:, None])
        history.append(float(log_norm.mean()))
        # M ステップ：責任度で重み付けしてパラメータを更新
        nk = resp.sum(axis=0)
        weights = nk / n
        means = (resp.T @ x) / nk[:, None]
        for k in range(n_components):
            diff = x - means[k]
            covs[k] = (resp[:, k, None] * diff).T @ diff / nk[k] + 1e-6 * np.eye(dim)
        if len(history) > 1 and abs(history[-1] - history[-2]) < tol:
            break
    log_joint = np.column_stack([np.log(weights[k]) + log_gaussian(x, means[k], covs[k]) for k in range(n_components)])
    log_norm = np.logaddexp.reduce(log_joint, axis=1)
    resp = np.exp(log_joint - log_norm[:, None])
    history.append(float(log_norm.mean()))
    return {"weights": weights, "means": means, "covs": covs, "resp": resp, "history": history}


def best_label_accuracy(true_labels, predicted_labels, n_components):
    """ラベルの入れ替えを考慮した一致率（成分の番号には意味がないため）。"""
    from itertools import permutations
    best = 0.0
    best_perm = None
    for perm in permutations(range(n_components)):
        mapped = np.array([perm[p] for p in predicted_labels])
        accuracy = float(np.mean(mapped == true_labels))
        if accuracy > best:
            best, best_perm = accuracy, perm
    return best, best_perm


def gmm_demo(rng):
    labels = rng.choice(N_COMPONENTS, size=N_SAMPLES_GMM, p=TRUE_WEIGHTS)
    x = np.array([rng.multivariate_normal(TRUE_MEANS[k], TRUE_COVS[k]) for k in labels])

    # 1回の EM（収束の様子を見せる用）
    em = run_em(x, N_COMPONENTS, np.random.default_rng(3))
    predicted = em["resp"].argmax(axis=1)
    em_accuracy, perm = best_label_accuracy(labels, predicted, N_COMPONENTS)
    order = np.argsort(perm)  # 推定成分 → 真の成分の順に並べ替える
    max_resp = em["resp"].max(axis=1)

    # scikit-learn と照合
    sk = GaussianMixture(n_components=N_COMPONENTS, covariance_type="full", n_init=10, random_state=0).fit(x)

    # k-means との比較（球状のクラスタを仮定する方法）
    km = KMeans(n_clusters=N_COMPONENTS, n_init=10, random_state=0).fit(x)
    km_accuracy, km_perm = best_label_accuracy(labels, km.labels_, N_COMPONENTS)

    # 初期値を変えて何度も EM を回し、局所解の有無を見る
    finals = []
    for seed in range(N_RANDOM_STARTS):
        result = run_em(x, N_COMPONENTS, np.random.default_rng(1000 + seed))
        finals.append(result["history"][-1])
    finals = np.array(finals)
    best_final = finals.max()
    n_worse = int(np.sum(finals < best_final - 1e-3))

    # BIC で成分数を選ぶ
    bic = []
    for k in BIC_K_RANGE:
        model = GaussianMixture(n_components=k, covariance_type="full", n_init=5, random_state=0).fit(x)
        bic.append({"k": k, "bic": float(model.bic(x)), "aic": float(model.aic(x))})

    true_log_joint = np.column_stack([np.log(TRUE_WEIGHTS[k]) + log_gaussian(x, TRUE_MEANS[k], TRUE_COVS[k]) for k in range(N_COMPONENTS)])
    oracle_accuracy = float(np.mean(true_log_joint.argmax(axis=1) == labels))

    mapped_pred = np.array([perm[p] for p in predicted])
    return {
        "n": N_SAMPLES_GMM,
        "true": {"weights": TRUE_WEIGHTS.tolist(), "means": TRUE_MEANS.tolist()},
        "estimated": {
            "weights": em["weights"][order].tolist(),
            "means": em["means"][order].tolist(),
        },
        "history": em["history"],
        "n_iter": len(em["history"]) - 1,
        "final_loglik": em["history"][-1],
        "sklearn_loglik": float(sk.score(x)),
        "em_accuracy": em_accuracy,
        "kmeans_accuracy": km_accuracy,
        "oracle_accuracy": oracle_accuracy,
        "kmeans_label": [int(km_perm[v]) for v in km.labels_],  # 真の成分番号に合わせた k-means の所属
        "share_ambiguous": float(np.mean(max_resp < AMBIGUOUS_THRESHOLD)),
        "scatter": {
            "x": np.round(x[:, 0], SCATTER_ROUND_DIGITS).tolist(),
            "y": np.round(x[:, 1], SCATTER_ROUND_DIGITS).tolist(),
            "em_label": mapped_pred.tolist(),
            "true_label": labels.tolist(),
            "max_resp": np.round(max_resp, 4).tolist(),
        },
        "random_starts": {"finals": finals.tolist(), "best": float(best_final), "n_worse": n_worse, "n": N_RANDOM_STARTS},
        "bic": bic,
    }


def fa_demo(rng):
    n_vars, n_factors = TRUE_LOADINGS.shape
    uniqueness = 1.0 - np.sum(TRUE_LOADINGS ** 2, axis=1)
    factors = rng.normal(size=(N_SAMPLES_FA, n_factors))
    noise = rng.normal(size=(N_SAMPLES_FA, n_vars)) * np.sqrt(uniqueness)
    x = factors @ TRUE_LOADINGS.T + noise
    x_std = (x - x.mean(axis=0)) / x.std(axis=0)

    eigenvalues = np.sort(np.linalg.eigvalsh(np.corrcoef(x_std.T)))[::-1]

    fa = FactorAnalysis(n_components=n_factors, rotation="varimax", random_state=0).fit(x_std)
    loadings = fa.components_.T  # 変数 × 因子
    # 因子の順番と符号は決まらない（回転の不定性）ので、真の負荷量に合わせる
    corr = np.corrcoef(np.hstack([TRUE_LOADINGS, loadings]).T)[:n_factors, n_factors:]
    order = [int(np.argmax(np.abs(corr[i]))) for i in range(n_factors)]
    aligned = loadings[:, order]
    signs = np.sign([corr[i, order[i]] for i in range(n_factors)])
    aligned = aligned * signs

    return {
        "n": N_SAMPLES_FA,
        "true_loadings": TRUE_LOADINGS.tolist(),
        "true_uniqueness": uniqueness.tolist(),
        "est_loadings": np.round(aligned, 4).tolist(),
        "est_uniqueness": np.round(fa.noise_variance_, 4).tolist(),
        "max_abs_error": float(np.max(np.abs(aligned - TRUE_LOADINGS))),
        "eigenvalues": eigenvalues.tolist(),
    }


def main():
    rng = np.random.default_rng(RANDOM_SEED)
    results = {
        "versions": {"numpy": np.__version__, "sklearn": sklearn.__version__},
        "gmm": gmm_demo(rng),
        "fa": fa_demo(rng),
    }
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")

    g = results["gmm"]
    print("GMM iter:", g["n_iter"], "loglik:", round(g["final_loglik"], 5), "sklearn:", round(g["sklearn_loglik"], 5))
    print("history head:", [round(v, 4) for v in g["history"][:8]], "...")
    print("accuracy EM:", g["em_accuracy"], "kmeans:", g["kmeans_accuracy"], "oracle:", g["oracle_accuracy"], "ambiguous:", g["share_ambiguous"])
    print("est weights:", np.round(g["estimated"]["weights"], 3), "means:", np.round(g["estimated"]["means"], 2).tolist())
    print("random starts worse:", g["random_starts"]["n_worse"], "/", g["random_starts"]["n"],
          sorted(set(np.round(g["random_starts"]["finals"], 4))))
    print("BIC:", [(b["k"], round(b["bic"], 1)) for b in g["bic"]])
    f = results["fa"]
    print("FA loadings:", f["est_loadings"])
    print("FA uniq:", f["est_uniqueness"], "true:", np.round(f["true_uniqueness"], 3).tolist())
    print("FA max abs err:", round(f["max_abs_error"], 4), "eig:", np.round(f["eigenvalues"], 3).tolist())


if __name__ == "__main__":
    main()
