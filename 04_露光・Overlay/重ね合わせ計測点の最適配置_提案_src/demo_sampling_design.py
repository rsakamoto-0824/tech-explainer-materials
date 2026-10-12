"""計測点の最適配置（D最適・I最適）提案資料のデモ計算（合成データ）。結果を demo_results.json に書き出す。

1. prior       : 以前の検討（Shot高次補正の点数・ノイズ・正則化）と同じ条件（Shot端を含む7×11格子・77点）で
                 κを再計算し、以前の値（線形0.187・ASML式0.283・Nikon式0.382）と照合する
2. intrafield  : Shot内の配置（等間隔の格子・ランダム・D最適・I最適）の点数ごとのκと、格子と同じκに必要な点数
3. candidates  : 置ける場所の制約（Shot全面・Shot外周のスクライブだけ・ダイ間のスクライブもある）によるκの違い
4. maps        : Shot内のどこにノイズが乗るか（格子とI最適）
5. wafer       : ウェーハ面内（3次の式）で、どのShotを測るか（散らばるように選ぶ・ランダム・D最適・I最適）
6. robustness  : 補正式にない形があるとき（取り残し＋ノイズ）と、計測点が1つ欠けたとき

κ（ノイズが補正に乗る倍率）＝ 評価点で平均した予測分散の平方根 ÷ 計測ノイズσ（X・Yの式で2乗平均）。
計測値を使わず、点の配置と補正式だけで決まる。ST（2020）の nMU（σ_model ÷ σ_measure）と同じ考え方。
座標は mm（Shot内はShot中心、ウェーハはウェーハ中心が原点）。ウェーハの有効な点は半径150 mm未満。
Shot内の補正式は、露光機メーカーごとの式（Overlay計測ルール）の項をそのまま使う。
"""

import json
import math
from pathlib import Path

import numpy as np

OUTPUT_PATH = Path(__file__).with_name("demo_results.json")
SEED = 20260928

# ---------------------------------------------------------------------
# Shot内の補正式（Overlay計測ルールの式。項・係数番号を変えない）
# 各項は x^m y^n の指数 [m, n]。x・y はShot中心基準の座標
# ---------------------------------------------------------------------
MODELS = {
    "Linear": {
        "label": "線形（6項）",
        "x": {"exp": [[0, 0], [1, 0], [0, 1]], "name": ["k1", "k3", "k5"]},
        "y": {"exp": [[0, 0], [0, 1], [1, 0]], "name": ["k2", "k4", "k6"]},
    },
    "ASML": {
        "label": "ASML式（15項）",
        # dx = k1 + k3*x + k5*y + k7*x^2 + k11*y^2 + k13*x^3 + k19*y^3
        "x": {"exp": [[0, 0], [1, 0], [0, 1], [2, 0], [0, 2], [3, 0], [0, 3]],
              "name": ["k1", "k3", "k5", "k7", "k11", "k13", "k19"]},
        # dy = k2 + k4*y + k6*x + k8*y^2 + k10*x*y + k12*x^2 + k14*y^3 + k16*x*y^2
        "y": {"exp": [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [2, 0], [0, 3], [1, 2]],
              "name": ["k2", "k4", "k6", "k8", "k10", "k12", "k14", "k16"]},
    },
    "Canon": {
        "label": "Canon式（16項）",
        # dx = k1 + k3*x + k5*y + k9*x*y + k11*y^2 + k17*x*y^2 + k19*y^3 + k27*x*y^3
        "x": {"exp": [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3]],
              "name": ["k1", "k3", "k5", "k9", "k11", "k17", "k19", "k27"]},
        # dy = k2 + k4*y + k6*x + k8*y^2 + k10*x*y + k14*y^3 + k16*x*y^2 + k24*x*y^3
        "y": {"exp": [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [0, 3], [1, 2], [1, 3]],
              "name": ["k2", "k4", "k6", "k8", "k10", "k14", "k16", "k24"]},
    },
    "Nikon": {
        "label": "Nikon式（27項）",
        # dx = k1 + k3*x + k5*y + k7*x^2 + k9*x*y + k11*y^2 + k13*x^3 + k17*x*y^2 + k19*y^3
        #      + k29*y^4 + k41*y^5 + k55*y^6
        "x": {"exp": [[0, 0], [1, 0], [0, 1], [2, 0], [1, 1], [0, 2], [3, 0], [1, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
              "name": ["k1", "k3", "k5", "k7", "k9", "k11", "k13", "k17", "k19", "k29", "k41", "k55"]},
        # dy = k2 + k4*y + k6*x + k8*y^2 + k10*x*y + k12*x^2 + k14*y^3 + k16*x*y^2 + k18*x^2*y
        #      + k22*y^4 + k24*x*y^3 + k32*y^5 + k34*x*y^4 + k44*y^6 + k46*x*y^5
        "y": {"exp": [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [2, 0], [0, 3], [1, 2], [2, 1], [0, 4], [1, 3], [0, 5],
                      [1, 4], [0, 6], [1, 5]],
              "name": ["k2", "k4", "k6", "k8", "k10", "k12", "k14", "k16", "k18", "k22", "k24", "k32", "k34", "k44",
                       "k46"]},
    },
}
INTRA_MODELS = ["ASML", "Canon", "Nikon"]

# ---------------------------------------------------------------------
# Shotとウェーハの配置
# ---------------------------------------------------------------------
SHOT_HALF_W_MM = 13.0                 # Shot幅 26 mm の半分（x：スリット方向）
SHOT_HALF_H_MM = 16.5                 # Shot高さ 33 mm の半分（y：スキャン方向）
EVAL_GRID = (27, 34)                  # Shot内の評価点（約1 mm間隔、以前の検討と同じ）
PRIOR_GRID = (7, 11)                  # 以前の検討の77点（Shot端を含む等間隔の格子）
PRIOR_REPORTED = {"Linear": 0.18696, "ASML": 0.28267, "Nikon": 0.38233}   # 以前の検討の値
PRIOR_EXISTING_GRID = (14, 22, 2)     # 以前の検討の既存の配置：14×22の格子を1点おきに間引いた7×11（右端・上端を含まない）
GRID_LAYOUTS = [(4, 5), (4, 7), (5, 8), (6, 9), (7, 11), (10, 13)]         # 以前の検討の格子（20〜130点）
POINT_COUNTS = [16, 20, 24, 28, 32, 40, 48, 54, 64, 77]
DIE_SCRIBE_X = [-13.0, 0.0, 13.0]                 # 例：2×3ダイのShotのスクライブ（縦の線）
DIE_SCRIBE_Y = [-16.5, -5.5, 5.5, 16.5]           # 例：2×3ダイのShotのスクライブ（横の線）
RANDOM_DRAWS = 300
EXCHANGE_STARTS = 10
RIDGE_REL = 1e-10                     # 点交換の途中で行列が特異にならないように足す小さな値（相対）

WAFER_RADIUS_MM = 150.0
SHOT_W_MM = 26.0
SHOT_H_MM = 33.0
SHOT_COLUMNS = range(-6, 7)
SHOT_ROWS = range(-5, 5)
SHOT_ROW_OFFSET_MM = 16.5
MARK_OFFSETS_MM = np.array([[-11.0, -14.5], [11.0, -14.5], [-11.0, 14.5], [11.0, 14.5]])
WAFER_EVAL_STEP_MM = 5.0
WAFER_ORDER = 3                       # ウェーハ座標の3次の式（X・Y各10項）
WAFER_SHOT_COUNTS = [10, 12, 14, 16, 20, 25, 30, 40]
WAFER_BASELINE_SHOTS = 25             # 比べる基準：散らばるように選んだ25Shot（親資料の通常の計測と同じ）
MIN_MARKS_PER_SHOT = 3                # 候補にするShot：有効なマークが3つ以上（親資料の通常の計測と同じ条件）
SPARE_FACTORS = [1.0, 1.5, 2.0, 3.0]  # 点数を「X・Yの式の多い方の項数」の何倍にするか（1.0 は項数＋1点）

# 補正式にない形（取り残し）と計測ノイズ
BIAS_RMS_NM = 0.3                     # 補正式にない形の大きさ（評価点でのRMS、X・Yそれぞれ）
INTRA_UNMODELED_MAX_ORDER = 6         # Shot内：式にない項を6次まで考える
WAFER_UNMODELED_ORDERS = (4, 5)       # ウェーハ：4〜5次の項を式にない形とする
SIGMA_LIST_NM = [0.2, 0.3, 0.5, 0.7, 1.0, 1.5]
SIGMA_TO_3SIGMA = 3.0


# ---------------------------------------------------------------------
# 共通の計算
# ---------------------------------------------------------------------
def design_matrix(x, y, exps, half):
    """x^m y^n を、座標を half で割って（-1〜1 にそろえて）並べる"""
    u = np.asarray(x) / half[0]
    v = np.asarray(y) / half[1]
    return np.column_stack([u ** m * v ** n for m, n in exps])


def shot_grid(nx, ny):
    gx, gy = np.meshgrid(np.linspace(-SHOT_HALF_W_MM, SHOT_HALF_W_MM, nx), np.linspace(-SHOT_HALF_H_MM, SHOT_HALF_H_MM, ny))
    return np.column_stack([gx.ravel(), gy.ravel()])


class IntraProblem:
    """Shot内の配置問題：候補点、評価点、X・Yの式の行列をまとめて持つ"""

    def __init__(self, model_key, candidates):
        self.model = MODELS[model_key]
        self.candidates = candidates
        self.eval = shot_grid(*EVAL_GRID)
        half = (SHOT_HALF_W_MM, SHOT_HALF_H_MM)
        self.F = []
        self.W = []
        self.E = []
        for axis in ("x", "y"):
            exps = self.model[axis]["exp"]
            self.F.append(design_matrix(candidates[:, 0], candidates[:, 1], exps, half))
            E = design_matrix(self.eval[:, 0], self.eval[:, 1], exps, half)
            self.E.append(E)
            self.W.append(E.T @ E / len(E))
        self.p = [f.shape[1] for f in self.F]

    def kappa(self, idx):
        return kappa_from(self.F, self.W, idx)

    def pred_std_map(self, idx):
        """評価点ごとの予測の標準偏差 ÷ σ（X・Yの2乗平均）"""
        values = []
        for F, E in zip(self.F, self.E):
            A = F[idx]
            inv = np.linalg.inv(A.T @ A)
            values.append(np.einsum("ij,jk,ik->i", E, inv, E))
        return np.sqrt(np.mean(values, axis=0))


def kappa_from(F_list, W_list, idx):
    """κ ＝ √（X・Yの式で平均した、評価点での平均予測分散）。推定できない配置は inf"""
    total = 0.0
    for F, W in zip(F_list, W_list):
        A = F[idx]
        M = A.T @ A
        if np.linalg.matrix_rank(M) < M.shape[0]:
            return math.inf
        total += np.trace(np.linalg.solve(M, W))
    return math.sqrt(total / len(F_list))


def logdet_from(F_list, idx):
    total = 0.0
    for F in F_list:
        sign, value = np.linalg.slogdet(F[idx].T @ F[idx])
        if sign <= 0:
            return -math.inf
        total += value
    return total


def max_pred_std(F_list, E_list, idx):
    values = []
    for F, E in zip(F_list, E_list):
        inv = np.linalg.inv(F[idx].T @ F[idx])
        values.append(np.einsum("ij,jk,ik->i", E, inv, E))
    return float(np.sqrt(np.max(np.mean(values, axis=0))))


def farthest_point_order(points, start_index):
    order = [start_index]
    distance = np.linalg.norm(points - points[start_index], axis=1)
    for _ in range(len(points) - 1):
        nxt = int(np.argmax(distance))
        order.append(nxt)
        distance = np.minimum(distance, np.linalg.norm(points - points[nxt], axis=1))
    return order


def exchange_points(F_list, W_list, n, criterion, rng, starts=EXCHANGE_STARTS, fixed=(), init=None, max_passes=40):
    """点交換法：設計の点を1つずつ、候補のうち規準が最もよくなる点に入れ替える（同じ点は2回選ばない）

    criterion 'I'：評価点で平均した予測分散（X・Yの和）を最小にする
    criterion 'D'：情報行列の行列式（X・Yの積）を最大にする
    fixed：必ず含める候補の番号（入れ替えない）
    """
    C = F_list[0].shape[0]
    fixed = [int(i) for i in fixed]
    best = None
    for start in range(starts):
        pool = np.setdiff1d(np.arange(C), fixed)
        if start == 0 and init is not None:
            free = [int(i) for i in init if i not in fixed][: n - len(fixed)]
            rest = np.setdiff1d(pool, free)
            free += [int(i) for i in rng.choice(rest, n - len(fixed) - len(free), replace=False)]
        else:
            free = [int(i) for i in rng.choice(pool, n - len(fixed), replace=False)]
        design = fixed + free
        for _ in range(max_passes):
            improved = False
            for pos in range(len(fixed), n):
                others = design[:pos] + design[pos + 1:]
                totals = np.zeros(C)
                for F, W in zip(F_list, W_list):
                    A = F[others].T @ F[others]
                    A = A + RIDGE_REL * (np.trace(A) / A.shape[0] + 1e-300) * np.eye(A.shape[0])
                    Ainv = np.linalg.inv(A)
                    U = F @ Ainv
                    leverage = np.einsum("ij,ij->i", U, F)
                    if criterion == "I":
                        base = np.trace(Ainv @ W)
                        quad = np.sum((U @ W) * U, axis=1)
                        totals += base - quad / (1.0 + leverage)
                    else:
                        _, logdet = np.linalg.slogdet(A)
                        totals -= logdet + np.log1p(leverage)
                totals[others] = np.inf
                current = design[pos]
                j = int(np.argmin(totals))
                if totals[j] < totals[current] - 1e-9 * max(abs(totals[current]), 1.0):
                    design[pos] = j
                    improved = True
            if not improved:
                break
        final = kappa_from(F_list, W_list, design) if criterion == "I" else -logdet_from(F_list, design)
        if best is None or final < best[0]:
            best = (final, list(design))
    return best[1]


def exchange_units(unit_rows, F, W, n, criterion, rng, starts=EXCHANGE_STARTS, fixed=(), max_passes=40):
    """Shot（複数のマーク）を単位に選ぶ点交換法。ウェーハ面内の式で使う（X・Yは同じ式）"""
    U = len(unit_rows)
    fixed = [int(i) for i in fixed]

    def score_of(units):
        rows = np.concatenate([unit_rows[u] for u in units])
        M = F[rows].T @ F[rows]
        if np.linalg.matrix_rank(M) < M.shape[0]:
            return math.inf
        if criterion == "I":
            return float(np.trace(np.linalg.solve(M, W)))
        sign, value = np.linalg.slogdet(M)
        return -value if sign > 0 else math.inf

    best = None
    for _ in range(starts):
        pool = np.setdiff1d(np.arange(U), fixed)
        design = fixed + [int(i) for i in rng.choice(pool, n - len(fixed), replace=False)]
        score = score_of(design)
        for _ in range(max_passes):
            improved = False
            for pos in range(len(fixed), n):
                for cand in range(U):
                    if cand in design:
                        continue
                    trial = design.copy()
                    trial[pos] = cand
                    s = score_of(trial)
                    if s < score - 1e-9 * max(abs(score), 1.0):
                        design, score, improved = trial, s, True
            if not improved:
                break
        if best is None or score < best[0]:
            best = (score, design)
    return best[1]


# ---------------------------------------------------------------------
# 1. 以前の検討との照合
# ---------------------------------------------------------------------
def run_prior():
    grid = shot_grid(*PRIOR_GRID)
    out = {}
    for key in ["Linear", "ASML", "Nikon"]:
        problem = IntraProblem(key, grid)
        value = problem.kappa(list(range(len(grid))))
        out[key] = {"kappa": round(value, 5), "reported": PRIOR_REPORTED[key], "diff": round(value - PRIOR_REPORTED[key], 6)}
    return out


# ---------------------------------------------------------------------
# 2〜4. Shot内の配置
# ---------------------------------------------------------------------
def candidate_sets():
    full = shot_grid(*EVAL_GRID)
    on_edge = (np.isclose(np.abs(full[:, 0]), SHOT_HALF_W_MM)) | (np.isclose(np.abs(full[:, 1]), SHOT_HALF_H_MM))
    on_die = np.isin(np.round(full[:, 0], 6), DIE_SCRIBE_X) | np.isin(np.round(full[:, 1], 6), DIE_SCRIBE_Y)
    return {
        "full": {"label": "Shot全面に置ける", "points": full},
        "perimeter": {"label": "Shot外周のスクライブだけ", "points": full[on_edge]},
        "die_scribe": {"label": "ダイ間のスクライブもある（2×3ダイの例）", "points": full[on_die]},
    }


def stride_points():
    """14×22 の格子を1点おきに間引いた 7×11 点（右端・上端の列と行を含まない）"""
    nx, ny, stride = PRIOR_EXISTING_GRID
    gx, gy = np.meshgrid(np.linspace(-SHOT_HALF_W_MM, SHOT_HALF_W_MM, nx)[::stride],
                         np.linspace(-SHOT_HALF_H_MM, SHOT_HALF_H_MM, ny)[::stride])
    return np.column_stack([gx.ravel(), gy.ravel()])


def spread_order(points):
    """中心に最も近い点から、最も遠い点を順に選ぶ（散らばるように選ぶ経験則の配置）"""
    start = int(np.argmin(np.hypot(points[:, 0], points[:, 1])))
    return farthest_point_order(points, start)


def grid_problem(key, nx, ny):
    """Shot端を含む nx×ny の等間隔格子そのものを候補とした問題（格子の評価用）"""
    return IntraProblem(key, shot_grid(nx, ny))


def grid_design_indices(candidates, nx, ny):
    """候補（評価点と同じ格子）から、Shot端を含む nx×ny の等間隔格子に最も近い点を選ぶ"""
    target = shot_grid(nx, ny)
    idx = [int(np.argmin(np.linalg.norm(candidates - t, axis=1))) for t in target]
    return idx


def minimum_points(problem, target_kappa, rng, lo, hi):
    """I最適で target_kappa 以下になる最少の点数を二分探索で求める（κは点数に対してほぼ単調に減る）"""
    cache = {}

    def kappa_at(n):
        if n not in cache:
            idx = exchange_points(problem.F, problem.W, n, "I", rng, starts=4)
            cache[n] = (problem.kappa(idx), idx)
        return cache[n][0]

    if kappa_at(hi) > target_kappa:
        return None, cache
    while lo < hi:
        mid = (lo + hi) // 2
        if kappa_at(mid) <= target_kappa:
            hi = mid
        else:
            lo = mid + 1
    return lo, cache


def points_json(points, idx):
    return [[round(float(points[i, 0]), 3), round(float(points[i, 1]), 3)] for i in idx]


def run_intrafield(rng):
    sets = candidate_sets()
    full = sets["full"]["points"]
    results = {"models": {}, "point_counts": POINT_COUNTS}
    for key in INTRA_MODELS:
        problem = IntraProblem(key, full)
        p_total = sum(problem.p)
        entry = {"label": MODELS[key]["label"], "terms": {"x": MODELS[key]["x"]["name"], "y": MODELS[key]["y"]["name"]},
                 "min_terms_per_axis": max(problem.p)}
        # 等間隔の格子（以前の検討の配置。候補の1 mm格子に丸めず、同じ位置で評価する）
        grids = []
        for nx, ny in GRID_LAYOUTS:
            grids.append({"layout": f"{nx}×{ny}", "points": nx * ny, "kappa": round(grid_problem(key, nx, ny).kappa(list(range(nx * ny))), 4)})
        entry["grid"] = grids
        # 点数ごとの I最適・D最適・散らばり・ランダム
        spread = spread_order(full)
        curve = []
        designs = {}
        random_examples = {}
        for n in POINT_COUNTS:
            if n < max(problem.p):
                continue
            i_idx = exchange_points(problem.F, problem.W, n, "I", rng)
            d_idx = exchange_points(problem.F, problem.W, n, "D", rng)
            rand = []
            rand_idx = []
            failures = 0
            for _ in range(RANDOM_DRAWS):
                r_idx = list(rng.choice(len(full), n, replace=False))
                value = problem.kappa(r_idx)
                if math.isinf(value):
                    failures += 1
                else:
                    rand.append(value)
                    rand_idx.append(r_idx)
            rand = np.array(rand)
            if len(rand):
                median_pick = int(np.argmin(np.abs(rand - np.median(rand))))
                random_examples[n] = (float(rand[median_pick]), rand_idx[median_pick])
            curve.append({
                "n": n,
                "I": round(problem.kappa(i_idx), 4),
                "D": round(problem.kappa(d_idx), 4),
                "spread": round(problem.kappa(spread[:n]), 4),
                "random_median": round(float(np.median(rand)), 4) if len(rand) else None,
                "random_p90": round(float(np.quantile(rand, 0.9)), 4) if len(rand) else None,
                "random_fail": failures,
                "I_max": round(max_pred_std(problem.F, problem.E, i_idx), 4),
                "D_max": round(max_pred_std(problem.F, problem.E, d_idx), 4),
            })
            designs[n] = {"I": i_idx, "D": d_idx}
        entry["curve"] = curve
        # 今の配置と同じκに必要な点数（I最適）：Shot端を含む格子77点・端が抜けた格子77点・散らばり77点
        grid77 = next(g for g in grids if g["points"] == 77)["kappa"]
        stride77 = IntraProblem(key, stride_points()).kappa(list(range(77)))
        spread77 = problem.kappa(spread[:77])
        n_same, cache = minimum_points(problem, grid77, rng, max(problem.p), 77)
        entry["grid77_kappa"] = grid77
        entry["stride77_kappa"] = round(stride77, 4)
        entry["spread77_kappa"] = round(spread77, 4)
        entry["n_same_as_grid77"] = n_same
        entry["n_same_as_stride77"], _ = minimum_points(problem, stride77, rng, max(problem.p), 77)
        entry["n_same_as_spread77"], _ = minimum_points(problem, spread77, rng, max(problem.p), 77)
        # 格子20点・28点の比較（点の少ない場面）
        entry["grid_small"] = {}
        for nx, ny in [(4, 5), (4, 7)]:
            n = nx * ny
            if n < max(problem.p):
                continue
            i_idx = designs[n]["I"] if n in designs else exchange_points(problem.F, problem.W, n, "I", rng)
            entry["grid_small"][f"{nx}×{ny}"] = {"grid": round(grid_problem(key, nx, ny).kappa(list(range(n))), 4),
                                                 "I": round(problem.kappa(i_idx), 4)}
        # 図に使う配置（点数：格子と同じ20点・28点・77点、とI最適で格子77点と同じκの点数）
        layouts = {}
        for n in [20, 28, 40, 77]:
            if n in designs:
                layouts[str(n)] = {"I": points_json(full, designs[n]["I"]), "D": points_json(full, designs[n]["D"]),
                                   "spread": points_json(full, spread[:n])}
                if n in random_examples:
                    layouts[str(n)]["random"] = points_json(full, random_examples[n][1])
                    layouts[str(n)]["random_kappa"] = round(random_examples[n][0], 4)
        if n_same is not None:
            layouts["same"] = {"n": n_same, "I": points_json(full, cache[n_same][1])}
        entry["layouts"] = layouts
        # ノイズが乗る大きさのマップ（格子77点とI最適77点）
        g77 = grid_problem(key, 7, 11)
        entry["maps"] = {
            "grid77": [round(float(v), 4) for v in g77.pred_std_map(list(range(77)))],
            "stride77": [round(float(v), 4) for v in IntraProblem(key, stride_points()).pred_std_map(list(range(77)))],
            "I77": [round(float(v), 4) for v in problem.pred_std_map(designs[77]["I"])],
        }
        if n_same is not None:
            entry["maps"]["Isame"] = [round(float(v), 4) for v in problem.pred_std_map(cache[n_same][1])]
        results["models"][key] = entry
    results["eval_grid"] = list(EVAL_GRID)
    return results


def run_candidates(rng):
    sets = candidate_sets()
    out = {"sets": {}}
    for set_key, info in sets.items():
        points = info["points"]
        per_model = {}
        for key in ["ASML", "Nikon"]:
            problem = IntraProblem(key, points)
            rows = []
            spread = spread_order(points)
            for n in [20, 28, 40, 54, 77]:
                if n < max(problem.p) or n > len(points):
                    continue
                idx = exchange_points(problem.F, problem.W, n, "I", rng)
                rows.append({"n": n, "I": round(problem.kappa(idx), 4), "I_max": round(max_pred_std(problem.F, problem.E, idx), 4),
                             "spread": round(problem.kappa(spread[:n]), 4)})
            idx40 = exchange_points(problem.F, problem.W, 40, "I", rng)
            per_model[key] = {"curve": rows, "layout40": points_json(points, idx40),
                              "map40": [round(float(v), 4) for v in IntraProblem(key, points).pred_std_map(idx40)]}
        out["sets"][set_key] = {"label": info["label"], "candidate_count": int(len(points)),
                                "candidates": points_json(points, range(len(points))), "models": per_model}
    return out


# ---------------------------------------------------------------------
# 5. ウェーハ面内（どのShotを測るか）
# ---------------------------------------------------------------------
def wafer_layout():
    shots, mark_xy, unit_rows = [], [], []
    for col in SHOT_COLUMNS:
        for row in SHOT_ROWS:
            center = np.array([col * SHOT_W_MM, row * SHOT_H_MM + SHOT_ROW_OFFSET_MM])
            marks = center + MARK_OFFSETS_MM
            valid = np.hypot(marks[:, 0], marks[:, 1]) < WAFER_RADIUS_MM
            if not valid.any():
                continue
            rows = list(range(len(mark_xy), len(mark_xy) + int(valid.sum())))
            mark_xy.extend(marks[valid].tolist())
            unit_rows.append(np.array(rows))
            shots.append({"x": float(center[0]), "y": float(center[1]), "marks": int(valid.sum())})
    return shots, np.array(mark_xy), unit_rows


def wafer_terms(order):
    return [[i, t - i] for t in range(order + 1) for i in range(t, -1, -1)]


def wafer_eval_points():
    axis = np.arange(-WAFER_RADIUS_MM + WAFER_EVAL_STEP_MM / 2, WAFER_RADIUS_MM, WAFER_EVAL_STEP_MM)
    gx, gy = np.meshgrid(axis, axis)
    pts = np.column_stack([gx.ravel(), gy.ravel()])
    return pts[np.hypot(pts[:, 0], pts[:, 1]) < WAFER_RADIUS_MM]


def run_wafer(rng):
    shots, mark_xy, unit_rows = wafer_layout()
    half = (WAFER_RADIUS_MM, WAFER_RADIUS_MM)
    exps = wafer_terms(WAFER_ORDER)
    F = design_matrix(mark_xy[:, 0], mark_xy[:, 1], exps, half)
    eval_pts = wafer_eval_points()
    E = design_matrix(eval_pts[:, 0], eval_pts[:, 1], exps, half)
    W = E.T @ E / len(E)

    def kappa_units(units):
        rows = np.concatenate([unit_rows[u] for u in units])
        M = F[rows].T @ F[rows]
        if np.linalg.matrix_rank(M) < M.shape[0]:
            return math.inf
        return math.sqrt(np.trace(np.linalg.solve(M, W)))

    def std_map(units):
        rows = np.concatenate([unit_rows[u] for u in units])
        inv = np.linalg.inv(F[rows].T @ F[rows])
        shot_centers = np.array([[s["x"], s["y"]] for s in shots])
        values = []
        for s_idx in range(len(shots)):
            local = eval_pts[(np.abs(eval_pts[:, 0] - shot_centers[s_idx, 0]) <= SHOT_W_MM / 2)
                             & (np.abs(eval_pts[:, 1] - shot_centers[s_idx, 1]) <= SHOT_H_MM / 2)]
            if len(local) == 0:
                local = mark_xy[unit_rows[s_idx]]
            El = design_matrix(local[:, 0], local[:, 1], exps, half)
            values.append(float(np.sqrt(np.max(np.einsum("ij,jk,ik->i", El, inv, El)))))
        return values

    # 候補：有効なマークが3つ以上のShot（どの方法も同じ候補から選ぶ）
    pool = [u for u in range(len(shots)) if shots[u]["marks"] >= MIN_MARKS_PER_SHOT]
    pool_rows = [unit_rows[u] for u in pool]
    centers = np.array([[shots[u]["x"], shots[u]["y"]] for u in pool])
    start = int(np.argmin(np.hypot(centers[:, 0], centers[:, 1])))
    fps = [pool[i] for i in farthest_point_order(centers, start)]

    def optimal(n, criterion, starts=EXCHANGE_STARTS):
        return [pool[i] for i in exchange_units(pool_rows, F, W, n, criterion, rng, starts=starts)]

    def marks_of(units):
        return int(sum(len(unit_rows[u]) for u in units))

    curve = []
    chosen = {}
    for n in WAFER_SHOT_COUNTS:
        spread = fps[:n]
        i_units = optimal(n, "I")
        d_units = optimal(n, "D")
        rand, failures = [], 0
        for _ in range(RANDOM_DRAWS):
            r = [int(u) for u in rng.choice(pool, n, replace=False)]
            value = kappa_units(r)
            if math.isinf(value):
                failures += 1
            else:
                rand.append(value)
        rand = np.array(rand)
        curve.append({
            "n": n, "spread": round(kappa_units(spread), 4), "I": round(kappa_units(i_units), 4),
            "D": round(kappa_units(d_units), 4),
            "random_median": round(float(np.median(rand)), 4), "random_p90": round(float(np.quantile(rand, 0.9)), 4),
            "random_fail": failures,
            "points": {"spread": marks_of(spread), "I": marks_of(i_units), "D": marks_of(d_units)},
        })
        chosen[n] = {"spread": spread, "I": i_units, "D": d_units}
    base = next(c for c in curve if c["n"] == WAFER_BASELINE_SHOTS)
    # 基準（散らばるように選んだ25Shot）と同じκに必要なShot数（I最適）
    n_same = None
    for n in range(8, WAFER_BASELINE_SHOTS + 1):
        units = optimal(n, "I", starts=4)
        if kappa_units(units) <= base["spread"]:
            n_same = n
            chosen["same"] = units
            break
    maps = {"spread25": std_map(chosen[WAFER_BASELINE_SHOTS]["spread"]), "I25": std_map(chosen[WAFER_BASELINE_SHOTS]["I"])}
    if n_same is not None:
        maps["Isame"] = std_map(chosen["same"])
    return {
        "shots": shots, "pool_count": len(pool), "curve": curve, "baseline_shots": WAFER_BASELINE_SHOTS,
        "n_same_as_baseline": n_same, "n_same_points": marks_of(chosen["same"]) if n_same else None,
        "baseline_points": base["points"]["spread"],
        "chosen": {str(k): v for k, v in chosen.items() if k in (16, WAFER_BASELINE_SHOTS)} | ({"same": chosen["same"]} if n_same else {}),
        "maps": maps, "model_terms": len(exps) * 2, "eval_points": int(len(eval_pts)),
        "_internal": {"F": F, "W": W, "E": E, "unit_rows": unit_rows, "chosen": chosen, "exps": exps, "mark_xy": mark_xy,
                      "eval_pts": eval_pts},
    }


# ---------------------------------------------------------------------
# 6. 頑健性：式にない形（取り残し）と点の欠け
# ---------------------------------------------------------------------
def expected_bias2(A_fit, E_fit, T_design, T_eval, rms):
    """式にない形の係数を正規乱数（評価点でのRMSが rms）としたときの、取り残し^2 の期待値（評価点の平均）"""
    P = E_fit @ np.linalg.solve(A_fit.T @ A_fit, A_fit.T)   # 評価点での補正形状 = P × 測定値
    R = T_eval - P @ T_design                              # 式にない形 → 評価点の取り残し
    scale2 = rms ** 2 * len(T_eval) / np.sum(T_eval ** 2)   # 係数の分散（評価点でのRMSを rms にそろえる）
    return float(scale2 * np.sum(R ** 2) / len(T_eval))


def unmodeled_terms(model_exps, max_order):
    have = {tuple(e) for e in model_exps}
    return [[i, t - i] for t in range(max_order + 1) for i in range(t, -1, -1) if (i, t - i) not in have]


def drop_summary(values, base):
    """1点（1Shot）ずつ欠いたときのκの比。推定できなくなる場合は数だけ数える"""
    finite = [v / base for v in values if math.isfinite(v)]
    return {"drop_max": round(float(np.max(finite)), 4) if finite else None,
            "drop_median": round(float(np.median(finite)), 4) if finite else None,
            "drop_singular": int(len(values) - len(finite))}


def analyze_intra_points(key, pts):
    """Shot内の配置（点の座標）について、κ・式にない形の取り残し・1点欠けたときのκを求める"""
    half = (SHOT_HALF_W_MM, SHOT_HALF_H_MM)
    sub = IntraProblem(key, pts)
    idx = list(range(len(pts)))
    kappa = sub.kappa(idx)
    bias2 = 0.0
    for axis_i, axis in enumerate(("x", "y")):
        extra = unmodeled_terms(MODELS[key][axis]["exp"], INTRA_UNMODELED_MAX_ORDER)
        T_design = design_matrix(pts[:, 0], pts[:, 1], extra, half)
        T_eval = design_matrix(sub.eval[:, 0], sub.eval[:, 1], extra, half)
        bias2 += expected_bias2(sub.F[axis_i], sub.E[axis_i], T_design, T_eval, BIAS_RMS_NM)
    bias2 /= 2
    total = [round(SIGMA_TO_3SIGMA * math.sqrt(bias2 + (s * kappa) ** 2), 4) for s in SIGMA_LIST_NM]
    dropped = [sub.kappa(idx[:d] + idx[d + 1:]) for d in range(len(idx))]
    return {"n": len(idx), "kappa": round(kappa, 4), "bias": round(math.sqrt(bias2), 4), "total_3sigma": total,
            **drop_summary(dropped, kappa), "points": [[round(float(x), 3), round(float(y), 3)] for x, y in pts]}


def run_robustness(rng, intra, wafer):
    out = {"sigma": SIGMA_LIST_NM, "bias_rms_nm": BIAS_RMS_NM}
    # Shot内（ASML式・Nikon式）：格子77点・I最適77点・I最適（格子と同じκの点数）・組み合わせ（I最適＋格子の一部）
    full = candidate_sets()["full"]["points"]
    half = (SHOT_HALF_W_MM, SHOT_HALF_H_MM)
    intra_out = {}
    for key in ["ASML", "Nikon"]:
        problem = IntraProblem(key, full)
        entry = intra["models"][key]
        designs = {"grid77": shot_grid(7, 11), "stride77": stride_points(), "I77": np.array(entry["layouts"]["77"]["I"])}
        if "same" in entry["layouts"]:
            designs["Isame"] = np.array(entry["layouts"]["same"]["I"])
        rows = {name: analyze_intra_points(key, pts) for name, pts in designs.items()}
        # 点の少ない場面：項数ぎりぎりの点数と、予備の点を足した配置の欠けへの強さ
        small = {}
        for factor in SPARE_FACTORS:
            n = max(problem.p) + 1 if factor == 1.0 else int(round(max(problem.p) * factor))
            idx = exchange_points(problem.F, problem.W, n, "I", rng)
            result = analyze_intra_points(key, full[idx])
            small[str(n)] = {"factor": factor, "kappa": result["kappa"], "drop_max": result["drop_max"],
                             "drop_singular": result["drop_singular"]}
        rows["small_n"] = small
        intra_out[key] = rows
    out["intrafield"] = intra_out

    # ウェーハ面内：散らばり25Shot・I最適25Shot・組み合わせ25Shot・I最適（同じκのShot数）
    w = wafer["_internal"]
    F, W, E, unit_rows, exps = w["F"], w["W"], w["E"], w["unit_rows"], w["exps"]
    half_w = (WAFER_RADIUS_MM, WAFER_RADIUS_MM)
    extra = [[i, t - i] for t in WAFER_UNMODELED_ORDERS for i in range(t, -1, -1)]
    T_marks = design_matrix(w["mark_xy"][:, 0], w["mark_xy"][:, 1], extra, half_w)
    T_eval = design_matrix(w["eval_pts"][:, 0], w["eval_pts"][:, 1], extra, half_w)
    wafer_rows = {}
    chosen = w["chosen"]
    candidates = {"spread25": chosen[WAFER_BASELINE_SHOTS]["spread"], "I25": chosen[WAFER_BASELINE_SHOTS]["I"],
                  "D25": chosen[WAFER_BASELINE_SHOTS]["D"]}
    if "same" in chosen:
        candidates["Isame"] = chosen["same"]
    for name, units in candidates.items():
        rows = np.concatenate([unit_rows[u] for u in units])
        A = F[rows]
        kappa = math.sqrt(np.trace(np.linalg.solve(A.T @ A, W)))
        bias2 = expected_bias2(A, E, T_marks[rows], T_eval, BIAS_RMS_NM)
        total = [round(SIGMA_TO_3SIGMA * math.sqrt(bias2 + (s * kappa) ** 2), 4) for s in SIGMA_LIST_NM]
        dropped = []
        for drop in range(len(units)):
            rest = units[:drop] + units[drop + 1:]
            r_rows = np.concatenate([unit_rows[u] for u in rest])
            M = F[r_rows].T @ F[r_rows]
            dropped.append(math.inf if np.linalg.matrix_rank(M) < M.shape[0] else math.sqrt(np.trace(np.linalg.solve(M, W))))
        wafer_rows[name] = {"shots": len(units), "kappa": round(kappa, 4), "bias": round(math.sqrt(bias2), 4), "total_3sigma": total,
                            **drop_summary(dropped, kappa)}
    out["wafer"] = wafer_rows
    return out


def finite_or_none(value):
    """JSON に書けない inf・nan を None に置き換える（入れ子もたどる）"""
    if isinstance(value, dict):
        return {k: finite_or_none(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [finite_or_none(v) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def main():
    results = {"seed": SEED, "numpy": np.__version__}
    results["prior"] = run_prior()
    intra = run_intrafield(np.random.default_rng(SEED + 1))
    results["intrafield"] = intra
    results["candidates"] = run_candidates(np.random.default_rng(SEED + 2))
    wafer = run_wafer(np.random.default_rng(SEED + 3))
    results["robustness"] = run_robustness(np.random.default_rng(SEED + 4), intra, wafer)
    wafer.pop("_internal")
    results["wafer"] = wafer
    # 推定できない配置の κ（inf）は null にする（JSON に Infinity を書かない）
    OUTPUT_PATH.write_text(json.dumps(finite_or_none(results), ensure_ascii=False, indent=1, allow_nan=False), encoding="utf-8")
    print(f"書き出し: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
