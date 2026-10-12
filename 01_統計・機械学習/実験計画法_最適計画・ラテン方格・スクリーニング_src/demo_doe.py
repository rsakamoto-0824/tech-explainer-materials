"""実験計画法の解説資料のデモ計算。結果を demo_results.json に書き出す。

1. latin      : 4×4 ラテン方格の分散分析と、ブロックを無視した解析との検出力の比較
2. screening  : 2^(7-4) 一部実施要因計画、Plackett–Burman 12 回計画での効果推定（Lenth 法）、
                確定的スクリーニング計画（4 因子・9 回）の相関
3. optimal    : 2 因子・2 次モデル・12 回の D 最適計画と I 最適計画（点交換法）、
                中心複合計画との比較、予測分散の分布（FDS）、制約のある領域での最適計画

乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる。
"""

import itertools
import json
from pathlib import Path

import numpy as np
from pyDOE3 import pbdesign
from scipy import stats

OUTPUT_PATH = Path(__file__).with_name("demo_results.json")
SEED = 20260926

# ---------------------------------------------------------------------
# 1. ラテン方格
# ---------------------------------------------------------------------
LS_SIZE = 4
LS_ROW_EFFECTS = np.array([-0.9, -0.3, 0.3, 0.9])      # 行（日）の効果
LS_COL_EFFECTS = np.array([0.7, -0.5, 0.3, -0.5])      # 列（装置）の効果
LS_TRT_PATTERN = np.array([-0.75, -0.25, 0.25, 0.75])  # 処理効果の形（d 倍して使う）
LS_NOISE_SD = 0.6
LS_POWER_REPS = 2000
LS_EXAMPLE_D = 1.5                                   # 例に使う処理効果の大きさ
ALPHA = 0.05


def random_latin_square(rng, size=LS_SIZE):
    """巡回型の方格の行・列・文字をランダムに並べ替える"""
    base = (np.arange(size)[:, None] + np.arange(size)[None, :]) % size
    base = base[rng.permutation(size)][:, rng.permutation(size)]
    return rng.permutation(size)[base]


def latin_anova(y, square):
    """ラテン方格の分散分析（行・列・処理・誤差）"""
    p = square.shape[0]
    grand = y.mean()
    ss_row = p * np.sum((y.mean(axis=1) - grand) ** 2)
    ss_col = p * np.sum((y.mean(axis=0) - grand) ** 2)
    trt_means = np.array([y[square == k].mean() for k in range(p)])
    ss_trt = p * np.sum((trt_means - grand) ** 2)
    ss_total = np.sum((y - grand) ** 2)
    ss_err = ss_total - ss_row - ss_col - ss_trt
    df = {"row": p - 1, "col": p - 1, "trt": p - 1, "err": (p - 1) * (p - 2), "total": p * p - 1}
    ms_err = ss_err / df["err"]
    table = []
    for key, ss, label in (("row", ss_row, "行（日）"), ("col", ss_col, "列（装置）"), ("trt", ss_trt, "処理（条件）")):
        f = (ss / df[key]) / ms_err
        table.append({"source": label, "ss": ss, "df": df[key], "ms": ss / df[key], "f": f,
                      "p": float(stats.f.sf(f, df[key], df["err"]))})
    table.append({"source": "誤差", "ss": ss_err, "df": df["err"], "ms": ms_err})
    table.append({"source": "合計", "ss": ss_total, "df": df["total"]})
    return table, trt_means


def oneway_p(y, square):
    """行・列を無視して、処理だけの一元配置分散分析とみなしたときの p 値"""
    groups = [y[square == k] for k in range(square.shape[0])]
    return float(stats.f_oneway(*groups).pvalue)


def simulate_latin(rng, d):
    square = random_latin_square(rng)
    y = (LS_ROW_EFFECTS[:, None] + LS_COL_EFFECTS[None, :] + d * LS_TRT_PATTERN[square]
         + rng.normal(0, LS_NOISE_SD, square.shape))
    return square, y


def demo_latin(rng):
    square, y = simulate_latin(rng, d=LS_EXAMPLE_D)
    table, trt_means = latin_anova(y, square)
    # コード例で同じデータを使えるように保存する
    rows = [f"{i + 1},{j + 1},{'ABCD'[square[i, j]]},{y[i, j]:.4f}" for i in range(LS_SIZE) for j in range(LS_SIZE)]
    Path(__file__).with_name("latin_square.csv").write_text("row,col,trt,y\n" + "\n".join(rows) + "\n", encoding="utf-8")
    example = {
        "square": square.tolist(), "y": np.round(y, 2).tolist(),
        "anova": [{k: (float(v) if isinstance(v, (float, np.floating)) else v) for k, v in row.items()} for row in table],
        "trt_means": trt_means.tolist(), "oneway_p": oneway_p(y, square),
    }
    power_rows = []
    for d in np.arange(0, 2.01, 0.25):
        hit_ls = hit_ow = 0
        for _ in range(LS_POWER_REPS):
            sq, yy = simulate_latin(rng, d)
            tab, _ = latin_anova(yy, sq)
            hit_ls += tab[2]["p"] < ALPHA
            hit_ow += oneway_p(yy, sq) < ALPHA
        power_rows.append({"d": float(d), "latin": hit_ls / LS_POWER_REPS, "oneway": hit_ow / LS_POWER_REPS})
        print(f"  latin d={d:.2f}: LS {hit_ls / LS_POWER_REPS:.2f} / oneway {hit_ow / LS_POWER_REPS:.2f}")
    return {
        "settings": {"row_effects": LS_ROW_EFFECTS.tolist(), "col_effects": LS_COL_EFFECTS.tolist(),
                     "trt_pattern": LS_TRT_PATTERN.tolist(), "example_d": LS_EXAMPLE_D, "noise_sd": LS_NOISE_SD, "reps": LS_POWER_REPS},
        "example": example, "power": power_rows,
    }


# ---------------------------------------------------------------------
# 2. スクリーニング
# ---------------------------------------------------------------------
PB_FACTORS = list("ABCDEFGHJKL")          # 11 因子（I は使わない慣習）
PB_TRUE_COEF = {"A": 1.5, "D": -1.0, "G": 0.8}   # 係数（効果は 2 倍）
PB_NOISE_SD = 0.6


def lenth(effects):
    """Lenth の擬似標準誤差（PSE）と、個別・同時の判定限界（ME・SME）"""
    abs_eff = np.abs(effects)
    s0 = 1.5 * np.median(abs_eff)
    pse = 1.5 * np.median(abs_eff[abs_eff < 2.5 * s0])
    m = len(effects)
    df = m / 3
    me = stats.t.ppf(1 - ALPHA / 2, df) * pse
    gamma = (1 + (1 - ALPHA) ** (1 / m)) / 2
    sme = stats.t.ppf(gamma, df) * pse
    return float(pse), float(me), float(sme)


def two_factor_columns(X):
    return {f"{a}{b}": X[:, i] * X[:, j] for (i, a), (j, b) in itertools.combinations(enumerate(PB_FACTORS[:X.shape[1]]), 2)}


def conference_matrix_4():
    """4 次の会議行列（対角が 0、他が ±1、C'C = 3I）を総当たりで 1 つ探す"""
    off = [(i, j) for i in range(4) for j in range(4) if i != j]
    for signs in itertools.product([-1, 1], repeat=len(off)):
        C = np.zeros((4, 4))
        for (i, j), s in zip(off, signs):
            C[i, j] = s
        if np.allclose(C.T @ C, 3 * np.eye(4)) and C[0, 1:].min() == 1 and C[1:, 0].min() == 1:
            return C
    raise RuntimeError("会議行列が見つからない")


def demo_screening(rng):
    # 2^(7-4) 分解能 III：D=AB, E=AC, F=BC, G=ABC
    base = np.array(list(itertools.product([-1, 1], repeat=3)))[:, ::-1]
    a, b, c = base.T
    frac = np.column_stack([a, b, c, a * b, a * c, b * c, a * b * c]).astype(int)

    # Plackett–Burman 12 回計画
    X = pbdesign(11).astype(int)
    assert np.allclose(X.T @ X, 12 * np.eye(11))
    beta = np.array([PB_TRUE_COEF.get(f, 0.0) for f in PB_FACTORS])
    y = 10 + X @ beta + rng.normal(0, PB_NOISE_SD, 12)
    effects = 2 * (X.T @ y) / 12
    pse, me, sme = lenth(effects)
    twofi = two_factor_columns(X)
    partial = sorted({round(abs(float(np.corrcoef(X[:, 0], col)[0, 1])), 4) for col in twofi.values()})

    # 確定的スクリーニング計画（4 因子）：[C; -C; 0]
    C = conference_matrix_4()
    dsd = np.vstack([C, -C, np.zeros((1, 4))]).astype(int)
    mains = [dsd[:, j] for j in range(4)]
    tfi = [dsd[:, i] * dsd[:, j] for i, j in itertools.combinations(range(4), 2)]
    quads = [dsd[:, j] ** 2 for j in range(4)]

    def max_abs_corr(group_a, group_b, same=False):
        values = []
        for i, u in enumerate(group_a):
            for j, v in enumerate(group_b):
                if same and i >= j:
                    continue
                values.append(abs(float(np.corrcoef(u, v)[0, 1])))
        return max(values)

    dsd_corr = {
        "main_main": max_abs_corr(mains, mains, same=True),
        "main_2fi": max_abs_corr(mains, tfi),
        "main_quad": max_abs_corr(mains, quads),
        "quad_quad": max_abs_corr(quads, quads, same=True),
        "fi_fi": max_abs_corr(tfi, tfi, same=True),
    }
    return {
        "frac7_4": frac.tolist(),
        "pb12": {
            "design": X.tolist(), "y": np.round(y, 2).tolist(), "factors": PB_FACTORS,
            "true_effects": {k: 2 * v for k, v in PB_TRUE_COEF.items()}, "noise_sd": PB_NOISE_SD,
            "effects": effects.tolist(), "pse": pse, "me": me, "sme": sme,
            "active_me": [f for f, e in zip(PB_FACTORS, effects) if abs(e) > me],
            "active_sme": [f for f, e in zip(PB_FACTORS, effects) if abs(e) > sme],
            "partial_alias_abs_corr": partial,
        },
        "dsd4": {"design": dsd.tolist(), "corr": dsd_corr},
    }


# ---------------------------------------------------------------------
# 3. D 最適計画・I 最適計画
# ---------------------------------------------------------------------
N_RUNS = 12
GRID_STEP = 0.1
N_STARTS = 40
MOMENT_GRID = 201          # 予測分散の平均を取る細かい格子（1 辺の点数）
FDS_SAMPLES = 4000
CONSTRAINT_SUM = 1.0       # 制約：x1 + x2 ≤ 1


def model_terms(points):
    x1, x2 = points[:, 0], points[:, 1]
    return np.column_stack([np.ones(len(points)), x1, x2, x1 * x2, x1 ** 2, x2 ** 2])


def grid_points(step, feasible):
    values = np.round(np.arange(-1, 1 + 1e-9, step), 10)
    pts = np.array([(u, v) for u in values for v in values])
    return pts[feasible(pts)]


def moment_matrix(feasible):
    pts = grid_points(2 / (MOMENT_GRID - 1), feasible)
    F = model_terms(pts)
    return F.T @ F / len(F)


def d_value(F):
    sign, logdet = np.linalg.slogdet(F.T @ F)
    return logdet if sign > 0 else -np.inf


def i_value(F, M):
    """平均予測分散（誤差分散 1、n 倍しない値）。小さいほど良い"""
    try:
        return float(np.trace(np.linalg.solve(F.T @ F, M)))
    except np.linalg.LinAlgError:
        return np.inf


def point_exchange(rng, candidates, criterion, M=None):
    """点交換法：設計点を 1 つずつ、候補点のうち規準が最も良くなる点に置き換える"""
    Fc = model_terms(candidates)
    best_design, best_score = None, np.inf
    for _ in range(N_STARTS):
        idx = rng.choice(len(candidates), N_RUNS, replace=False)
        score_of = (lambda F: -d_value(F)) if criterion == "D" else (lambda F: i_value(F, M))
        score = score_of(Fc[idx])
        improved = True
        while improved:
            improved = False
            for i in range(N_RUNS):
                trial = idx.copy()
                best_j, best_trial_score = idx[i], score
                for j in range(len(candidates)):
                    trial[i] = j
                    s = score_of(Fc[trial])
                    if s < best_trial_score - 1e-10:
                        best_j, best_trial_score = j, s
                if best_j != idx[i]:
                    idx[i] = best_j
                    score = best_trial_score
                    improved = True
        if score < best_score:
            best_design, best_score = idx.copy(), score
    return candidates[best_design]


def spv(design, points):
    """尺度化予測分散 n·f(x)'(X'X)^{-1}f(x)"""
    F = model_terms(design)
    inv = np.linalg.inv(F.T @ F)
    Fp = model_terms(points)
    return len(design) * np.einsum("ij,jk,ik->i", Fp, inv, Fp)


def summarize(design, M, feasible, rng):
    F = model_terms(design)
    grid = grid_points(0.02, feasible)
    samples = rng.uniform(-1, 1, (FDS_SAMPLES * 3, 2))
    samples = samples[feasible(samples)][:FDS_SAMPLES]
    values = np.sort(spv(design, samples))
    fractions = np.linspace(0, 1, 21)
    unique, counts = np.unique(np.round(design, 3), axis=0, return_counts=True)
    return {
        "points": [{"x1": float(u[0]), "x2": float(u[1]), "count": int(c)} for u, c in zip(unique, counts)],
        "logdet": float(d_value(F)),
        "avg_spv": float(len(design) * i_value(F, M)),
        "max_spv": float(spv(design, grid).max()),
        "fds": {"fraction": fractions.tolist(), "spv": np.quantile(values, fractions).tolist()},
    }


def demo_optimal(rng):
    p = 6
    square = lambda pts: np.all(np.abs(pts) <= 1 + 1e-9, axis=1)  # noqa: E731
    cand = grid_points(GRID_STEP, square)
    M = moment_matrix(square)
    print("  D-optimal (square)")
    d_design = point_exchange(rng, cand, "D")
    print("  I-optimal (square)")
    i_design = point_exchange(rng, cand, "I", M)
    ccd = np.array([[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1],
                    [0, 0], [0, 0], [0, 0], [0, 0]], dtype=float)
    designs = {"D": d_design, "I": i_design, "CCD": ccd}
    result = {name: summarize(des, M, square, rng) for name, des in designs.items()}
    best_logdet = result["D"]["logdet"]
    best_avg = result["I"]["avg_spv"]
    for name in result:
        result[name]["d_eff"] = float(np.exp((result[name]["logdet"] - best_logdet) / p))
        result[name]["i_eff"] = float(best_avg / result[name]["avg_spv"])

    constrained = lambda pts: square(pts) & (pts[:, 0] + pts[:, 1] <= CONSTRAINT_SUM + 1e-9)  # noqa: E731
    cand_c = grid_points(GRID_STEP, constrained)
    M_c = moment_matrix(constrained)
    print("  D/I-optimal (constrained)")
    dc = point_exchange(rng, cand_c, "D")
    ic = point_exchange(rng, cand_c, "I", M_c)
    constrained_result = {"D": summarize(dc, M_c, constrained, rng), "I": summarize(ic, M_c, constrained, rng)}
    return {
        "n_runs": N_RUNS, "p": p, "grid_step": GRID_STEP, "n_starts": N_STARTS,
        "square": result, "constrained": constrained_result, "constraint_sum": CONSTRAINT_SUM,
    }


def main():
    rng = np.random.default_rng(SEED)
    results = {}
    print("1. latin");      results["latin"] = demo_latin(rng)
    print("2. screening");  results["screening"] = demo_screening(rng)
    print("3. optimal");    results["optimal"] = demo_optimal(rng)
    results["settings"] = {"seed": SEED, "alpha": ALPHA}
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"書き出し: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
