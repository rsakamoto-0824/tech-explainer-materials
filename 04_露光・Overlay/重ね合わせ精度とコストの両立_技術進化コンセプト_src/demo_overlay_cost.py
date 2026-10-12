"""重ね合わせ精度とコストの両立 資料のデモ計算（合成データ）。結果を demo_results.json に書き出す。

メモの仮説を、合成データで「考え方として成り立つか」だけ確かめる。効果の大きさは実データで検証が必要。

1. edge_cpe       : 外周ShotだけCPE（ショットごとの補正）をかけ、内側はウェーハ座標の多項式で補正する案を、
                    線形のみ・ウェーハ高次のみ・全ShotにCPE の案と比べる（前ロットの計測で次ロットを補正）
2. multirate      : 外周と内側で変化の速さが違うとき、領域ごとに計測頻度を変える案と、一律の頻度の案を比べる
                    （ランダムウォークの変化をカルマンフィルタで追う。定常状態の誤差を式で計算）
3. expected_range : 補正パラメータのロット間の変化（トレンド）から、測っていない点を含む面内の想定範囲を計算し、
                    その範囲に実際の残差が収まる割合（カバー率）を調べる
4. alignment_vm   : 少ないアライメント点から面内の歪みを推定する。過去ウェーハから学んだ潜在成分を使う案と、
                    多項式を当てはめる案を比べる。履歴にない形が現れたときの誤差と検知も調べる
5. sankey         : 工程経路（成膜・CMP・エッチングの号機）と重ね合わせの面内傾向の対応を示す例

座標はウェーハ中心を原点とする mm、ずれは nm。有効な点は半径 150 mm 未満。
乱数の種はデモごとに固定しているので、同じバージョンの NumPy なら同じ数値になる。
"""

import json
import math
from pathlib import Path

import numpy as np

OUTPUT_PATH = Path(__file__).with_name("demo_results.json")
SEED = 20260927

# ---------------------------------------------------------------------
# ウェーハとショットの配置
# ---------------------------------------------------------------------
WAFER_RADIUS_MM = 150.0
SHOT_WIDTH_MM = 26.0
SHOT_HEIGHT_MM = 33.0
SHOT_COLUMNS = range(-6, 7)
SHOT_ROWS = range(-5, 5)
SHOT_ROW_OFFSET_MM = 16.5             # 行の中心を半ショットずらし、ウェーハ中心がショットの境目に来るようにする
MARK_OFFSETS_MM = np.array([[-11.0, -14.5], [11.0, -14.5], [-11.0, 14.5], [11.0, 14.5]])
EDGE_SHOT_CORNER_RADIUS_MM = 140.0    # ショットの最も外側の角がこの半径以上なら「外周Shot」とする
NORMALIZE_MM = 150.0                  # 多項式の座標の正規化
LOCAL_NORMALIZE_MM = 13.0             # ショット内座標の正規化
SPARSE_SHOT_COUNT = 25                # 通常の計測で選ぶショット数
MIN_MARKS_FOR_LINEAR_CPE = 3          # ショット内の1次補正（6項）に必要なマーク数。足りなければ並進だけ
SIGMA_TO_3SIGMA = 3.0


def build_layout():
    """ショットとマークの配置を作る。マークが1つも有効でないショットは除く"""
    shot_centers, shot_corner_radius, mark_xy, mark_shot, mark_local = [], [], [], [], []
    for col in SHOT_COLUMNS:
        for row in SHOT_ROWS:
            center = np.array([col * SHOT_WIDTH_MM, row * SHOT_HEIGHT_MM + SHOT_ROW_OFFSET_MM])
            marks = center + MARK_OFFSETS_MM
            valid = np.hypot(marks[:, 0], marks[:, 1]) < WAFER_RADIUS_MM
            if not valid.any():
                continue
            corners = center + np.array([[sx * SHOT_WIDTH_MM / 2, sy * SHOT_HEIGHT_MM / 2] for sx in (-1, 1) for sy in (-1, 1)])
            shot_index = len(shot_centers)
            shot_centers.append(center)
            shot_corner_radius.append(np.hypot(corners[:, 0], corners[:, 1]).max())
            for offset, xy, ok in zip(MARK_OFFSETS_MM, marks, valid):
                if ok:
                    mark_xy.append(xy)
                    mark_shot.append(shot_index)
                    mark_local.append(offset)
    shot_centers = np.array(shot_centers)
    shot_corner_radius = np.array(shot_corner_radius)
    mark_shot = np.array(mark_shot)
    layout = {
        "shot_centers": shot_centers,
        "shot_is_edge": shot_corner_radius >= EDGE_SHOT_CORNER_RADIUS_MM,
        "shot_is_partial": shot_corner_radius >= WAFER_RADIUS_MM,
        "mark_xy": np.array(mark_xy),
        "mark_shot": mark_shot,
        "mark_local": np.array(mark_local) / LOCAL_NORMALIZE_MM,
        "marks_per_shot": np.bincount(mark_shot, minlength=len(shot_centers)),
    }
    layout["mark_is_edge"] = layout["shot_is_edge"][mark_shot]
    return layout


def farthest_point_order(points, start_index):
    """点をできるだけ散らばるように並べる（最も遠い点を順に選ぶ）"""
    order = [start_index]
    distance = np.linalg.norm(points - points[start_index], axis=1)
    for _ in range(len(points) - 1):
        next_index = int(np.argmax(distance))
        order.append(next_index)
        distance = np.minimum(distance, np.linalg.norm(points - points[next_index], axis=1))
    return np.array(order)


def poly_terms(order):
    """次数 order までの単項式 u^i v^j の指数の組"""
    return [(i, total - i) for total in range(order + 1) for i in range(total, -1, -1)]


def poly_design(xy, order):
    u = xy[:, 0] / NORMALIZE_MM
    v = xy[:, 1] / NORMALIZE_MM
    return np.column_stack([u ** i * v ** j for i, j in poly_terms(order)])


def ovl_metric(residual):
    """|平均|+3σ を X・Y 別に計算し、大きい方を返す（nm）"""
    values = [abs(residual[:, axis].mean()) + SIGMA_TO_3SIGMA * residual[:, axis].std(ddof=1) for axis in (0, 1)]
    return max(values)


def radial_unit(xy):
    r = np.hypot(xy[:, 0], xy[:, 1])
    r = np.where(r < 1e-9, 1e-9, r)
    return xy / r[:, None], r


# ---------------------------------------------------------------------
# 1. 外周だけCPE
# ---------------------------------------------------------------------
EDGE_AMPLITUDE_NM = 5.0          # 外周の放射状のずれの大きさ（r = 150 mm での値）
EDGE_DECAY_MM = 10.0             # 外周のずれが内側へ減衰する距離
EDGE_ASYMMETRY = 0.4             # 外周のずれの方位による違い
WAFER_HO_RMS_NM = 1.0            # ウェーハ座標の2〜3次成分（多項式で表せる形）の大きさ（RMS）
SHOT_SYSTEMATIC_NM = 0.25        # ショットごとの固定の並進（全ショット）
SHOT_RANDOM_NM = 0.35            # ショットごとの並進のばらつき（ウェーハごとに変わる）
MARK_RANDOM_NM = 0.30            # マーク位置ごとのばらつき（ウェーハごとに変わる）
MEAS_NOISE_NM = 0.50             # 計測のばらつき（基準ケース）
MEAS_NOISE_SWEEP_NM = [0.3, 0.5, 0.8, 1.2]
WAFERS_MEASURED_PER_LOT = 2
WAFERS_EVALUATED_PER_LOT = 2
EDGE_CPE_TRIALS = 300
EDGE_THRESHOLD_SWEEP_MM = [130.0, 135.0, 140.0, 150.0]
EDGE_CPE_SEED = SEED + 1


def edge_fingerprint(xy, amplitude, phase):
    unit, r = radial_unit(xy)
    theta = np.arctan2(xy[:, 1], xy[:, 0])
    magnitude = amplitude * (1 + EDGE_ASYMMETRY * np.cos(theta - phase)) * np.exp((r - WAFER_RADIUS_MM) / EDGE_DECAY_MM)
    return unit * magnitude[:, None]


def random_wafer_high_order(rng, xy):
    """2〜3次の多項式で表せる形。係数はランダムで、全マークでの RMS を WAFER_HO_RMS_NM にそろえる"""
    design = poly_design(xy, 3)[:, 3:]          # 0〜1次（線形）はアライメントで除かれるので2〜3次だけ
    field = design @ rng.normal(0, 1, (design.shape[1], 2))
    return field * WAFER_HO_RMS_NM / np.sqrt(np.mean(field ** 2))


def fit_wafer_model(xy, values, order):
    design = poly_design(xy, order)
    coef, *_ = np.linalg.lstsq(design, values, rcond=None)
    return coef


def fit_cpe(layout, sample_mask, residual_sampled, cpe_shots):
    """ショットごとの1次補正（並進・倍率・回転、X・Y で6項）。マークが足りないショットは並進だけ"""
    correction = np.zeros((len(layout["mark_xy"]), 2))
    params = 0
    sampled_idx = np.flatnonzero(sample_mask)
    for shot in cpe_shots:
        in_shot = layout["mark_shot"][sampled_idx] == shot
        if not in_shot.any():
            continue
        local = layout["mark_local"][sampled_idx[in_shot]]
        values = residual_sampled[in_shot]
        all_marks = np.flatnonzero(layout["mark_shot"] == shot)
        if in_shot.sum() >= MIN_MARKS_FOR_LINEAR_CPE:
            design = np.column_stack([np.ones(len(local)), local])
            coef, *_ = np.linalg.lstsq(design, values, rcond=None)
            target = np.column_stack([np.ones(len(all_marks)), layout["mark_local"][all_marks]])
            correction[all_marks] = target @ coef
            params += 6
        else:
            correction[all_marks] = values.mean(axis=0)
            params += 2
    return correction, params


def spread_shots(layout, candidates, count):
    """候補のショットから、ウェーハの中心から順に散らばるように count 個選ぶ"""
    centers = layout["shot_centers"][candidates]
    start = int(np.argmin(np.hypot(centers[:, 0], centers[:, 1])))
    return candidates[farthest_point_order(centers, start)[:count]]


def strategy_plans(layout):
    enough_marks = layout["marks_per_shot"] >= MIN_MARKS_FOR_LINEAR_CPE
    sparse = spread_shots(layout, np.flatnonzero(enough_marks), SPARSE_SHOT_COUNT)
    # 外周だけCPE の案では、内側の式を内側の点だけで決めるので、内側から同じ数のショットを選ぶ
    inner_sparse = spread_shots(layout, np.flatnonzero(enough_marks & ~layout["shot_is_edge"]), SPARSE_SHOT_COUNT)
    edge_shots = np.flatnonzero(layout["shot_is_edge"])
    all_shots = np.arange(len(layout["shot_centers"]))
    plans = {
        "linear": {"label": "線形のみ", "shots": sparse, "order": 1, "cpe": np.array([], dtype=int)},
        "wafer_ho": {"label": "ウェーハ高次（3次）", "shots": sparse, "order": 3, "cpe": np.array([], dtype=int)},
        # 外周の点は外周のずれを含むので、ウェーハ座標の式は内側の点だけで決め、外周はShotごとに直す
        "edge_cpe": {"label": "外周だけCPE＋内側ウェーハ高次", "shots": np.union1d(inner_sparse, edge_shots), "order": 3, "cpe": edge_shots,
                     "wafer_fit_inner_only": True},
        "full_cpe": {"label": "全ShotにCPE", "shots": all_shots, "order": 3, "cpe": all_shots},
    }
    for plan in plans.values():
        plan["mask"] = np.isin(layout["mark_shot"], plan["shots"])
    return plans, sparse


def simulate_edge_cpe(seed, layout, plans, meas_noise, trials):
    """同じ seed なら同じ乱数を使う（比べる条件の間で、ウェーハの形とばらつきをそろえる）"""
    rng = np.random.default_rng(seed)
    n_marks = len(layout["mark_xy"])
    n_shots = len(layout["shot_centers"])
    xy = layout["mark_xy"]
    zones = {"all": np.ones(n_marks, bool), "inner": ~layout["mark_is_edge"], "edge": layout["mark_is_edge"]}
    results = {key: {zone: [] for zone in zones} for key in plans}
    params = {}
    for _ in range(trials):
        systematic = (edge_fingerprint(xy, EDGE_AMPLITUDE_NM, rng.uniform(0, 2 * np.pi))
                      + random_wafer_high_order(rng, xy)
                      + rng.normal(0, SHOT_SYSTEMATIC_NM, (n_shots, 2))[layout["mark_shot"]])

        def wafer_truth():
            return (systematic + rng.normal(0, SHOT_RANDOM_NM, (n_shots, 2))[layout["mark_shot"]]
                    + rng.normal(0, MARK_RANDOM_NM, (n_marks, 2)))

        measured = np.mean([wafer_truth() + rng.normal(0, meas_noise, (n_marks, 2)) for _ in range(WAFERS_MEASURED_PER_LOT)], axis=0)
        next_lot = [wafer_truth() for _ in range(WAFERS_EVALUATED_PER_LOT)]
        for key, plan in plans.items():
            mask = plan["mask"]
            fit_mask = mask & ~layout["mark_is_edge"] if plan.get("wafer_fit_inner_only") else mask
            coef = fit_wafer_model(xy[fit_mask], measured[fit_mask], plan["order"])
            correction = poly_design(xy, plan["order"]) @ coef
            n_params = 2 * coef.shape[0]
            if len(plan["cpe"]):
                residual_sampled = measured[mask] - correction[mask]
                cpe_correction, cpe_params = fit_cpe(layout, mask, residual_sampled, plan["cpe"])
                correction = correction + cpe_correction
                n_params += cpe_params
            params[key] = n_params
            for truth in next_lot:
                residual = truth - correction
                for zone, zone_mask in zones.items():
                    results[key][zone].append(ovl_metric(residual[zone_mask]))
    summary = {}
    for key, plan in plans.items():
        summary[key] = {
            "label": plan["label"],
            "measured_points": int(plan["mask"].sum()),
            "measured_shots": int(len(plan["shots"])),
            "parameters": int(params[key]),
            **{zone: round(float(np.mean(values)), 3) for zone, values in results[key].items()},
        }
    return summary


def with_edge_threshold(layout, corner_radius_mm):
    """外周Shotの境目（ショットの最も外側の角の半径）を変えた配置"""
    changed = dict(layout)
    corner = np.array([np.hypot(np.abs(c[0]) + SHOT_WIDTH_MM / 2, np.abs(c[1]) + SHOT_HEIGHT_MM / 2) for c in layout["shot_centers"]])
    changed["shot_is_edge"] = corner >= corner_radius_mm
    changed["mark_is_edge"] = changed["shot_is_edge"][layout["mark_shot"]]
    return changed


def run_edge_cpe(layout):
    plans, sparse = strategy_plans(layout)
    base = simulate_edge_cpe(EDGE_CPE_SEED, layout, plans, MEAS_NOISE_NM, EDGE_CPE_TRIALS)
    sweep = {}
    for noise in MEAS_NOISE_SWEEP_NM:
        summary = simulate_edge_cpe(EDGE_CPE_SEED, layout, plans, noise, EDGE_CPE_TRIALS)
        sweep[str(noise)] = {key: {zone: summary[key][zone] for zone in ("all", "inner", "edge")} for key in summary}
    # 外周の幅を変えたとき（全マークでの評価だけを比べる。外周・内側の区分は幅で変わるため）
    width_sweep = []
    for threshold in EDGE_THRESHOLD_SWEEP_MM:
        changed = with_edge_threshold(layout, threshold)
        changed_plans, _ = strategy_plans(changed)
        summary = simulate_edge_cpe(EDGE_CPE_SEED, changed, {"edge_cpe": changed_plans["edge_cpe"]}, MEAS_NOISE_NM, EDGE_CPE_TRIALS)
        width_sweep.append({
            "corner_radius_mm": threshold,
            "edge_shots": int(changed["shot_is_edge"].sum()),
            "measured_points": summary["edge_cpe"]["measured_points"],
            "parameters": summary["edge_cpe"]["parameters"],
            "all": summary["edge_cpe"]["all"],
        })
    shots = []
    for index, center in enumerate(layout["shot_centers"]):
        shots.append({
            "x": float(center[0]), "y": float(center[1]),
            "edge": bool(layout["shot_is_edge"][index]),
            "partial": bool(layout["shot_is_partial"][index]),
            "sparse": bool(index in sparse),
            "measured_edge_cpe": bool(index in plans["edge_cpe"]["shots"]),
            "marks": int(layout["marks_per_shot"][index]),
        })
    return {
        "assumptions": {
            "edge_amplitude_nm": EDGE_AMPLITUDE_NM, "edge_decay_mm": EDGE_DECAY_MM,
            "wafer_high_order_rms_nm": WAFER_HO_RMS_NM, "shot_systematic_nm": SHOT_SYSTEMATIC_NM,
            "shot_random_nm": SHOT_RANDOM_NM, "mark_random_nm": MARK_RANDOM_NM,
            "meas_noise_nm": MEAS_NOISE_NM, "wafers_measured_per_lot": WAFERS_MEASURED_PER_LOT,
            "trials": EDGE_CPE_TRIALS, "edge_shot_corner_radius_mm": EDGE_SHOT_CORNER_RADIUS_MM,
        },
        "layout": {
            "shots": shots, "shot_count": len(shots),
            "edge_shot_count": int(layout["shot_is_edge"].sum()),
            "mark_count": int(len(layout["mark_xy"])),
            "edge_mark_count": int(layout["mark_is_edge"].sum()),
        },
        "base": base,
        "noise_sweep": sweep,
        "width_sweep": width_sweep,
    }


# ---------------------------------------------------------------------
# 2. 領域ごとの計測頻度（カルマンフィルタの定常誤差）
# ---------------------------------------------------------------------
DRIFT_STEP_NM = {"edge": 0.35, "inner": 0.07}      # 1ロットあたりの変化（ランダムウォークの歩幅）
ESTIMATE_NOISE_NM = {"edge": 0.30, "inner": 0.20}  # 1回の計測での推定のばらつき
MAX_INTERVAL_LOTS = 12
DRIFT_RATIO_SWEEP = [1, 2, 5, 10, 20]


def tracking_mse(step_nm, noise_nm, interval):
    """interval ロットごとに計測してカルマンフィルタで追ったときの、補正誤差の2乗平均（定常状態）

    計測直後の推定分散 P+ は P+ = (P+ + kq) r / (P+ + kq + r) を満たす。
    次の計測までの k ロットの補正誤差の分散は P+ + j q（j = 1..k）なので、平均は P+ + q (k + 1) / 2。
    """
    q = step_nm ** 2
    r = noise_nm ** 2
    kq = interval * q
    p_plus = (-kq + math.sqrt(kq ** 2 + 4 * kq * r)) / 2
    return p_plus + q * (interval + 1) / 2


def pareto_front(points):
    """(費用, 誤差) の組から、どちらも悪くならない点だけを費用の順に残す"""
    front = []
    for cost, error, meta in sorted(points, key=lambda p: (p[0], p[1])):
        if not front or error < front[-1][1] - 1e-12:
            front.append((cost, error, meta))
    return front


def multirate_scenario(points, weight, drift_step, estimate_noise):
    """領域ごとの計測間隔の組み合わせを全部調べ、一律の間隔の場合と比べる"""

    def evaluate(k_edge, k_inner):
        mse = {zone: tracking_mse(drift_step[zone], estimate_noise[zone], k) for zone, k in (("edge", k_edge), ("inner", k_inner))}
        cost = points["edge"] / k_edge + points["inner"] / k_inner
        error = SIGMA_TO_3SIGMA * math.sqrt(weight["edge"] * mse["edge"] + weight["inner"] * mse["inner"])
        zone_error = {zone: round(SIGMA_TO_3SIGMA * math.sqrt(v), 4) for zone, v in mse.items()}
        return cost, error, zone_error

    uniform = []
    for k in range(1, MAX_INTERVAL_LOTS + 1):
        cost, error, zone_error = evaluate(k, k)
        uniform.append({"k_edge": k, "k_inner": k, "cost": round(cost, 2), "error": round(error, 4), "zone": zone_error})
    candidates = []
    for k_edge in range(1, MAX_INTERVAL_LOTS + 1):
        for k_inner in range(1, MAX_INTERVAL_LOTS + 1):
            cost, error, zone_error = evaluate(k_edge, k_inner)
            candidates.append((cost, error, {"k_edge": k_edge, "k_inner": k_inner, "zone": zone_error}))
    adaptive = [{"cost": round(c, 2), "error": round(e, 4), **meta} for c, e, meta in pareto_front(candidates)]

    # 見出しの数値：一律に2ロットに1回へ間引いた場合を基準に、同じ誤差での計測点と、同じ計測点での誤差を比べる
    half = uniform[1]
    same_error = min((a for a in adaptive if a["error"] <= half["error"] + 1e-9), key=lambda a: a["cost"])
    same_cost = min((a for a in adaptive if a["cost"] <= half["cost"] + 1e-9), key=lambda a: a["error"])
    headline = {
        "every_lot": uniform[0],
        "half_uniform": half,
        "same_error_adaptive": same_error,
        "same_error_cost_reduction": round(1 - same_error["cost"] / half["cost"], 3),
        "same_cost_adaptive": same_cost,
        "same_cost_error_reduction": round(1 - same_cost["error"] / half["error"], 3),
    }
    return uniform, adaptive, headline


def run_multirate(edge_result):
    layout_info = edge_result["layout"]
    edge_points = layout_info["edge_mark_count"]
    total_marks = layout_info["mark_count"]
    weight = {"edge": edge_points / total_marks, "inner": 1 - edge_points / total_marks}
    # 基準：全点を測る計画（全ShotにCPE）。外周と内側で計測の間隔を変える
    points_dense = {"edge": edge_points, "inner": total_marks - edge_points}
    uniform, adaptive, headline = multirate_scenario(points_dense, weight, DRIFT_STEP_NM, ESTIMATE_NOISE_NM)

    # 参考1：内側をすでに間引いている場合（外周だけCPE の計画）。時間の最適化の上乗せは小さくなる
    points_sparse = {"edge": edge_points, "inner": edge_result["base"]["edge_cpe"]["measured_points"] - edge_points}
    _, _, headline_sparse = multirate_scenario(points_sparse, weight, DRIFT_STEP_NM, ESTIMATE_NOISE_NM)

    # 参考2：外周と内側の変化の速さの比を変えたとき
    ratio_sweep = []
    for ratio in DRIFT_RATIO_SWEEP:
        drift = {"edge": DRIFT_STEP_NM["edge"], "inner": DRIFT_STEP_NM["edge"] / ratio}
        _, _, h = multirate_scenario(points_dense, weight, drift, ESTIMATE_NOISE_NM)
        ratio_sweep.append({"ratio": ratio, "same_error_cost_reduction": h["same_error_cost_reduction"],
                            "same_cost_error_reduction": h["same_cost_error_reduction"]})
    return {
        "assumptions": {
            "drift_step_nm": DRIFT_STEP_NM, "estimate_noise_nm": ESTIMATE_NOISE_NM,
            "points_per_measurement": points_dense, "area_weight": {k: round(v, 3) for k, v in weight.items()},
        },
        "uniform": uniform,
        "adaptive": adaptive,
        "headline": headline,
        "sparse_inner": {"points_per_measurement": points_sparse, "headline": headline_sparse},
        "ratio_sweep": ratio_sweep,
    }


# ---------------------------------------------------------------------
# 3. 補正パラメータのトレンドから面内の想定範囲を見積もる
# ---------------------------------------------------------------------
RANGE_LOTS_HISTORY = 40
RANGE_LOTS_CHECK = 150
RANGE_DRIFT_RMS_NM = 0.35        # ロットごとの形の変化（2〜3次成分）の大きさ（RMS）
RANGE_EDGE_DRIFT_NM = 0.8        # ケースB：モデルで表せない外周の変化（r = 150 mm でのロットごとの歩幅）
RANGE_RANDOM_NM = 0.35           # 補正できないばらつき（ショット・マーク・計測）
RANGE_WAFERS_PER_LOT = 2
RANGE_TRIALS = 20
RANGE_TRACE_TERM = 4             # 時系列の例に使う項（poly_terms(3) の番号。4 は u·v）


def run_expected_range(rng, layout, plans):
    xy = layout["mark_xy"]
    n_marks = len(xy)
    design = poly_design(xy, 3)
    sample_mask = plans["wafer_ho"]["mask"]
    unmeasured = ~sample_mask
    zones = {"all": unmeasured, "inner": unmeasured & ~layout["mark_is_edge"], "edge": unmeasured & layout["mark_is_edge"]}
    design_sampled = design[sample_mask]
    # 2〜3次の項だけがロットごとに変わる。大きさは全マークでの RMS で決める
    term_scale = 1 / np.sqrt(np.mean(design[:, 3:] ** 2, axis=0))

    cases = {}
    for case, edge_drift in (("model_ok", 0.0), ("edge_unmodeled", RANGE_EDGE_DRIFT_NM)):
        coverage = {zone: [] for zone in zones}
        width = []
        trace = None
        sigma_map_example = None
        for trial in range(RANGE_TRIALS):
            coef = np.zeros((design.shape[1], 2))
            edge_amp = 0.0
            estimates = []
            residual_history = []
            lot_count = RANGE_LOTS_HISTORY + RANGE_LOTS_CHECK
            previous_estimate = None
            checks = {zone: [] for zone in zones}
            sigma_map = None
            for lot in range(lot_count):
                step = np.zeros_like(coef)
                step[3:] = rng.normal(0, 1, (design.shape[1] - 3, 2)) * term_scale[:, None]
                step *= RANGE_DRIFT_RMS_NM / math.sqrt(design.shape[1] - 3)
                coef = coef + step
                edge_amp += rng.normal(0, edge_drift) if edge_drift else 0.0
                systematic = design @ coef + edge_fingerprint(xy, edge_amp, 0.0)
                truth = [systematic + rng.normal(0, RANGE_RANDOM_NM, (n_marks, 2)) for _ in range(RANGE_WAFERS_PER_LOT)]
                measured = np.mean(truth, axis=0)[sample_mask]
                estimate, *_ = np.linalg.lstsq(design_sampled, measured, rcond=None)
                if previous_estimate is not None:
                    # 前ロットの推定で補正した結果（このロットの残差）
                    residual = truth[0] - design @ previous_estimate
                    if lot < RANGE_LOTS_HISTORY:
                        residual_history.append(residual[sample_mask] - (design_sampled @ (estimate - previous_estimate)))
                    elif sigma_map is not None:
                        inside = np.abs(residual) <= SIGMA_TO_3SIGMA * sigma_map
                        for zone, mask in zones.items():
                            checks[zone].append(inside[mask].mean())
                estimates.append(estimate)
                previous_estimate = estimate
                if lot == RANGE_LOTS_HISTORY - 1:
                    # 履歴（計測した点だけ）から想定範囲を作る
                    deltas = np.diff(np.array(estimates), axis=0)             # ロット間の変化
                    sigma_map = np.zeros((n_marks, 2))
                    random_var = np.var(np.concatenate(residual_history), axis=0, ddof=1)
                    for axis in (0, 1):
                        cov = np.cov(deltas[:, :, axis], rowvar=False)
                        sigma_map[:, axis] = np.sqrt(np.einsum("ij,jk,ik->i", design, cov, design) + random_var[axis])
            for zone in zones:
                coverage[zone].append(float(np.mean(checks[zone])))
            width.append(float(np.mean(SIGMA_TO_3SIGMA * sigma_map)))
            if trial == 0:
                trace = [float(e[RANGE_TRACE_TERM, 0]) for e in estimates]
                sigma_map_example = sigma_map
        shot_range = np.zeros(len(layout["shot_centers"]))
        for shot in range(len(shot_range)):
            in_shot = layout["mark_shot"] == shot
            shot_range[shot] = SIGMA_TO_3SIGMA * sigma_map_example[in_shot].max()
        cases[case] = {
            "coverage": {zone: round(float(np.mean(v)), 4) for zone, v in coverage.items()},
            "mean_range_nm": round(float(np.mean(width)), 3),
            "shot_range_nm": [round(float(v), 3) for v in shot_range],
            "trace": [round(v, 4) for v in trace],
        }
    return {
        "assumptions": {
            "history_lots": RANGE_LOTS_HISTORY, "check_lots": RANGE_LOTS_CHECK,
            "drift_rms_nm": RANGE_DRIFT_RMS_NM, "edge_drift_nm": RANGE_EDGE_DRIFT_NM,
            "random_nm": RANGE_RANDOM_NM, "trials": RANGE_TRIALS, "measured_points": int(sample_mask.sum()),
            "trace_term": "u·v（X方向）",
        },
        "cases": cases,
    }


# ---------------------------------------------------------------------
# 4. 少ないアライメント点からの面内推定（潜在成分 vs 多項式）
# ---------------------------------------------------------------------
LATENT_SCORE_SD_NM = [2.0, 1.0, 0.8, 1.2]     # 各パターンの強さのウェーハ間ばらつき
LINEAR_SD_NM = 3.0                            # 並進・倍率・回転などの線形成分（毎ウェーハ変わる）
VM_SHOT_RANDOM_NM = 0.20
VM_MARK_RANDOM_NM = 0.15
ALIGN_NOISE_NM = 0.25
BUMP_CENTER_MM = np.array([55.0, -70.0])
BUMP_WIDTH_MM = 28.0
NEW_BUMP_CENTER_MM = np.array([-85.0, 75.0])  # 履歴にない新しい形（局所的な歪み）
NEW_BUMP_WIDTH_MM = 22.0
NEW_BUMP_AMPLITUDE_NM = 2.5
HISTORY_WAFERS = 200
VALIDATION_WAFERS = 500            # 検知のしきい値を決めるための、形の学習に使わないウェーハ
TEST_WAFERS = 300
LATENT_COMPONENTS = 4
MARK_COUNTS = [6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 96]
RIDGE_GRID = [0.0, 1e-3, 3e-3, 1e-2, 3e-2, 0.1, 0.3, 1.0, 3.0, 10.0, 30.0, 100.0]
DETECTION_MARKS = 16
DETECTION_FALSE_ALARM = 0.01


def bump_pattern(xy, center, width):
    delta = xy - center
    weight = np.exp(-np.sum(delta ** 2, axis=1) / (2 * width ** 2)) * math.exp(0.5)
    return delta / width * weight[:, None]


def latent_patterns(xy):
    unit, r = radial_unit(xy)
    u = xy[:, 0] / NORMALIZE_MM
    v = xy[:, 1] / NORMALIZE_MM
    edge = unit * np.exp((r - WAFER_RADIUS_MM) / 12.0)[:, None]      # 外周の放射状のずれ
    warp = np.column_stack([-(u ** 3), v ** 3])                      # 4回対称の反りに伴う3次の歪み
    trefoil = np.column_stack([u ** 2 - v ** 2, -2 * u * v])          # 3回対称の歪み
    bump = bump_pattern(xy, BUMP_CENTER_MM, BUMP_WIDTH_MM)           # 局所的な盛り上がりに伴う歪み
    return [edge, warp, trefoil, bump]


def simulate_vm_wafers(rng, layout, count, new_pattern=False):
    xy = layout["mark_xy"]
    n_marks = len(xy)
    n_shots = len(layout["shot_centers"])
    patterns = latent_patterns(xy)
    linear = poly_design(xy, 1)
    truths = []
    for _ in range(count):
        field = sum(rng.normal(0, sd) * p for sd, p in zip(LATENT_SCORE_SD_NM, patterns))
        field = field + linear @ rng.normal(0, LINEAR_SD_NM, (3, 2))
        field = field + rng.normal(0, VM_SHOT_RANDOM_NM, (n_shots, 2))[layout["mark_shot"]]
        field = field + rng.normal(0, VM_MARK_RANDOM_NM, (n_marks, 2))
        if new_pattern:
            field = field + NEW_BUMP_AMPLITUDE_NM * bump_pattern(xy, NEW_BUMP_CENTER_MM, NEW_BUMP_WIDTH_MM)
        truths.append(field)
    return np.array(truths)


def stack_xy(values):
    """(点, 2) を [X…, Y…] の1本のベクトルにする"""
    return np.concatenate([values[..., 0], values[..., 1]], axis=-1)


def block_design(design):
    """X と Y で同じ設計行列を使う2軸のモデルを1つの行列にする"""
    zeros = np.zeros_like(design)
    return np.block([[design, zeros], [zeros, design]])


def learn_latent_basis(layout, history_measured):
    xy = layout["mark_xy"]
    linear = block_design(poly_design(xy, 1))
    data = stack_xy(history_measured)
    coef, *_ = np.linalg.lstsq(linear, data.T, rcond=None)
    residual = data - (linear @ coef).T                       # 線形成分を除いた形
    mean = residual.mean(axis=0)
    _, singular, vt = np.linalg.svd(residual - mean, full_matrices=False)
    eigen = singular ** 2 / (len(residual) - 1)
    explained = eigen / eigen.sum()
    noise_var = float(eigen[LATENT_COMPONENTS:].sum() / (residual.shape[1] - LATENT_COMPONENTS))
    return {
        "mean": mean, "basis": vt[:LATENT_COMPONENTS].T, "eigen": eigen[:LATENT_COMPONENTS],
        "noise_var": noise_var, "explained": explained,
    }


def mark_rows(indices, n_marks):
    return np.concatenate([indices, indices + n_marks])


def fit_latent(latent, layout, rows, observed):
    n_marks = len(layout["mark_xy"])
    linear = block_design(poly_design(layout["mark_xy"], 1))
    design = np.hstack([linear, latent["basis"]])
    penalty = np.concatenate([np.zeros(linear.shape[1]), latent["noise_var"] / latent["eigen"]])
    a = design[rows]
    y = observed - latent["mean"][rows]
    theta = np.linalg.solve(a.T @ a + np.diag(penalty), a.T @ y)
    prediction = latent["mean"] + design @ theta
    fitted_rows = prediction[rows]
    return prediction, fitted_rows


def fit_poly(layout, rows, observed, order, ridge):
    design = block_design(poly_design(layout["mark_xy"], order))
    n_terms = len(poly_terms(order))
    penalty = np.tile(np.r_[np.zeros(3), np.ones(n_terms - 3)], 2) * ridge
    a = design[rows]
    theta = np.linalg.solve(a.T @ a + np.diag(penalty) + 1e-10 * np.eye(a.shape[1]), a.T @ observed)
    prediction = design @ theta
    return prediction, prediction[rows]


def run_alignment_vm(rng, layout):
    xy = layout["mark_xy"]
    n_marks = len(xy)
    history = simulate_vm_wafers(rng, layout, HISTORY_WAFERS)
    history_measured = history + rng.normal(0, ALIGN_NOISE_NM, history.shape)
    latent = learn_latent_basis(layout, history_measured)

    test = simulate_vm_wafers(rng, layout, TEST_WAFERS)
    test_new = simulate_vm_wafers(rng, layout, TEST_WAFERS, new_pattern=True)
    noise = rng.normal(0, ALIGN_NOISE_NM, test.shape)
    noise_new = rng.normal(0, ALIGN_NOISE_NM, test_new.shape)

    radius = np.hypot(xy[:, 0], xy[:, 1])
    order = farthest_point_order(xy, int(np.argmax(radius)))

    def evaluate(method, truths, noises, rows, **kwargs):
        metrics = []
        for truth, noise_one in zip(truths, noises):
            observed = stack_xy(truth + noise_one)[rows]
            if method == "latent":
                prediction, _ = fit_latent(latent, layout, rows, observed)
            elif method == "linear":
                prediction, _ = fit_poly(layout, rows, observed, 1, 0.0)
            else:
                prediction, _ = fit_poly(layout, rows, observed, kwargs["order"], kwargs["ridge"])
            residual = np.column_stack([stack_xy(truth)[:n_marks] - prediction[:n_marks], stack_xy(truth)[n_marks:] - prediction[n_marks:]])
            metrics.append(ovl_metric(residual))
        return float(np.mean(metrics))

    def best_ridge(order_poly, rows):
        """履歴ウェーハ（密に測った答えがある）で、誤差が最小になる正則化の強さを選ぶ"""
        subset = history[:60]
        subset_noise = history_measured[:60] - history[:60]
        scores = [evaluate("poly", subset, subset_noise, rows, order=order_poly, ridge=ridge) for ridge in RIDGE_GRID]
        return RIDGE_GRID[int(np.argmin(scores))]

    curve = []
    for count in MARK_COUNTS:
        marks = order[:count]
        rows = mark_rows(marks, n_marks)
        entry = {"marks": count}
        entry["linear"] = round(evaluate("linear", test, noise, rows), 3)
        entry["latent"] = round(evaluate("latent", test, noise, rows), 3)
        for order_poly in (3, 5):
            unknowns = 2 * len(poly_terms(order_poly))
            ridge = best_ridge(order_poly, rows)
            entry[f"poly{order_poly}"] = round(evaluate("poly", test, noise, rows, order=order_poly, ridge=ridge), 3)
            entry[f"poly{order_poly}_ridge"] = ridge
            entry[f"poly{order_poly}_unknowns"] = unknowns
        entry["latent_new"] = round(evaluate("latent", test_new, noise_new, rows), 3)
        entry["poly3_new"] = round(evaluate("poly", test_new, noise_new, rows, order=3, ridge=entry["poly3_ridge"]), 3)
        curve.append(entry)

    # 検知：少ない点での当てはめ残差の大きさ（2乗和 / 雑音分散）で、履歴にない形を見分ける
    marks = order[:DETECTION_MARKS]
    rows = mark_rows(marks, n_marks)

    def residual_statistic(truths, noises):
        stats = []
        for truth, noise_one in zip(truths, noises):
            observed = stack_xy(truth + noise_one)[rows]
            _, fitted = fit_latent(latent, layout, rows, observed)
            stats.append(float(np.sum((observed - fitted) ** 2) / latent["noise_var"]))
        return np.array(stats)

    # しきい値は、形の学習に使っていないウェーハで決める（学習に使ったウェーハは残差が小さめに出るため）
    validation = simulate_vm_wafers(rng, layout, VALIDATION_WAFERS)
    validation_noise = rng.normal(0, ALIGN_NOISE_NM, validation.shape)
    validation_stats = residual_statistic(validation, validation_noise)
    threshold = float(np.quantile(validation_stats, 1 - DETECTION_FALSE_ALARM))
    normal_stats = residual_statistic(test, noise)
    new_stats = residual_statistic(test_new, noise_new)
    return {
        "assumptions": {
            "latent_score_sd_nm": LATENT_SCORE_SD_NM, "linear_sd_nm": LINEAR_SD_NM,
            "shot_random_nm": VM_SHOT_RANDOM_NM, "mark_random_nm": VM_MARK_RANDOM_NM,
            "align_noise_nm": ALIGN_NOISE_NM, "history_wafers": HISTORY_WAFERS, "test_wafers": TEST_WAFERS,
            "latent_components": LATENT_COMPONENTS, "new_bump_amplitude_nm": NEW_BUMP_AMPLITUDE_NM,
            "validation_wafers": VALIDATION_WAFERS,
            "dense_marks": int(n_marks),
        },
        "explained_ratio": [round(float(v), 4) for v in latent["explained"][:8]],
        "curve": curve,
        "mark_order": [[float(xy[i, 0]), float(xy[i, 1])] for i in order[:max(MARK_COUNTS)]],
        "detection": {
            "marks": DETECTION_MARKS,
            "false_alarm_target": DETECTION_FALSE_ALARM,
            "false_alarm_rate": round(float(np.mean(normal_stats > threshold)), 4),
            "detection_rate": round(float(np.mean(new_stats > threshold)), 4),
        },
    }


# ---------------------------------------------------------------------
# 5. 工程経路と面内傾向（サンキー図の例）
# ---------------------------------------------------------------------
SANKEY_WAFERS = 600
SANKEY_STEPS = [
    {"name": "成膜", "nodes": ["A1", "A2"], "weights": [0.5, 0.5]},
    {"name": "CMP", "nodes": ["B1", "B2", "B3"], "weights": [0.35, 0.3, 0.35]},
    {"name": "エッチング", "nodes": ["C1", "C2"], "weights": [0.55, 0.45]},
]
SANKEY_OUTCOMES = ["外周型", "鞍型", "良好"]


def outcome_probability(route):
    """経路ごとの面内傾向の出やすさ（例として B2 は外周型、A2 と C2 の組み合わせは鞍型が出やすい）"""
    edge = 0.06 + (0.60 if route[1] == "B2" else 0.0)
    saddle = 0.06 + (0.45 if (route[0] == "A2" and route[2] == "C2") else 0.0)
    good = max(1.0 - edge - saddle, 0.0)
    total = edge + saddle + good
    return np.array([edge, saddle, good]) / total


def run_sankey(rng):
    counts = {}
    for _ in range(SANKEY_WAFERS):
        route = [rng.choice(step["nodes"], p=step["weights"]) for step in SANKEY_STEPS]
        outcome = SANKEY_OUTCOMES[rng.choice(len(SANKEY_OUTCOMES), p=outcome_probability(route))]
        key = "|".join(route + [outcome])
        counts[key] = counts.get(key, 0) + 1
    # 経路ごとの外周型・鞍型の割合（経路グループを決める材料）
    by_node = {}
    for key, count in counts.items():
        parts = key.split("|")
        for node in parts[:3]:
            entry = by_node.setdefault(node, {o: 0 for o in SANKEY_OUTCOMES})
            entry[parts[3]] += count
    return {
        "steps": [{"name": s["name"], "nodes": s["nodes"]} for s in SANKEY_STEPS],
        "outcomes": SANKEY_OUTCOMES,
        "routes": [{"route": k.split("|")[:3], "outcome": k.split("|")[3], "count": v} for k, v in sorted(counts.items())],
        "by_node": by_node,
        "wafers": SANKEY_WAFERS,
    }


def main():
    # デモごとに乱数の種を分け、1つのデモを直しても他のデモの数値が変わらないようにする
    layout = build_layout()
    edge = run_edge_cpe(layout)
    plans, _ = strategy_plans(layout)
    results = {
        "seed": SEED,
        "numpy": np.__version__,
        "edge_cpe": edge,
        "multirate": run_multirate(edge),
        "expected_range": run_expected_range(np.random.default_rng(SEED + 2), layout, plans),
        "alignment_vm": run_alignment_vm(np.random.default_rng(SEED + 3), layout),
        "sankey": run_sankey(np.random.default_rng(SEED + 4)),
    }
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"書き出し: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
