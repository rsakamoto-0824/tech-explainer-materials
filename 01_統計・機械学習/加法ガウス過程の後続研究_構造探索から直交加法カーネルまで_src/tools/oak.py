"""oak.py — 直交加法カーネル OAK（Lu, Boukouvalas, Hensman 2022）の最小の実装。

1次元の SE カーネルを、入力の分布 p について平均が0になるように制約した k̃ に置きかえ（論文の式 8）、
加法カーネルと同じように基本対称多項式で全次数を足す。k̃ は負の値もとるので、べき乗の和より
「かっこを順に掛ける」方法のほうが安全だが、次元が小さいのでここでは additive_gp の関数を使う。

入力の分布は3通り: "uniform"（一様分布）、"normal"（正規分布、論文の式 10）、"empirical"（データそのもの）。
"""

from dataclasses import dataclass, field

import numpy as np
from scipy.linalg import cho_factor, cho_solve
from scipy.optimize import minimize
from scipy.special import erf, ndtr

import additive_gp as ag

JITTER = 1e-8
DERIVATIVE_STEP = 1e-4  # 長さスケールの対数についての数値微分の幅


class Measure:
    """入力の分布。mean_kernel(x, ell) = ∫ k(x, s) p(s) ds と total(ell) = ∫∫ k p p を返す。"""

    def __init__(self, kind, parameters):
        self.kind = kind
        self.parameters = parameters

    def mean_kernel(self, x, ell):
        if self.kind == "uniform":
            a, b = self.parameters
            return ell * np.sqrt(2 * np.pi) / (b - a) * (ndtr((b - x) / ell) - ndtr((a - x) / ell))
        if self.kind == "normal":
            mu, delta = self.parameters
            scale2 = ell**2 + delta**2
            return ell / np.sqrt(scale2) * np.exp(-((x - mu) ** 2) / (2 * scale2))
        points = self.parameters
        return np.mean(np.exp(-((x[..., None] - points) ** 2) / (2 * ell**2)), axis=-1)

    def total(self, ell):
        if self.kind == "uniform":
            a, b = self.parameters
            L = b - a
            twice = np.sqrt(2 * np.pi) * ell * L * erf(L / (ell * np.sqrt(2))) + 2 * ell**2 * (np.exp(-(L**2) / (2 * ell**2)) - 1)
            return twice / L**2
        if self.kind == "normal":
            mu, delta = self.parameters
            return ell / np.sqrt(ell**2 + 2 * delta**2)
        points = self.parameters
        return np.mean(self.mean_kernel(points, ell))


def constrained(x1, x2, ell, measure):
    """制約つきの1次元カーネル k̃(x1, x2) を、行 = x1、列 = x2 の行列で返す。"""
    base = np.exp(-((x1[:, None] - x2[None, :]) ** 2) / (2 * ell**2))
    return base - np.outer(measure.mean_kernel(x1, ell), measure.mean_kernel(x2, ell)) / measure.total(ell)


@dataclass
class OrthogonalAdditive:
    dimension: int
    orders: list
    measures: list
    theta: np.ndarray = None
    history: list = field(default_factory=list)

    def unpack(self, theta):
        D = self.dimension
        return theta[:D], theta[D : D + len(self.orders)], theta[D + len(self.orders)], theta[D + len(self.orders) + 1]

    def base(self, X1, X2, log_ell):
        return np.stack([constrained(X1[:, d], X2[:, d], np.exp(log_ell[d]), self.measures[d]) for d in range(self.dimension)])

    def kernel(self, X1, X2, theta=None):
        theta = self.theta if theta is None else theta
        log_ell, log_order, _, _ = self.unpack(theta)
        z = self.base(X1, X2, log_ell)
        e_values = ag.elementary_symmetric(z, max(self.orders))
        return sum(np.exp(2 * lo) * e_values[o] for lo, o in zip(log_order, self.orders))

    def negative_log_likelihood(self, theta, X, y):
        log_ell, log_order, log_noise, mean = self.unpack(theta)
        N, D = X.shape
        z = self.base(X, X, log_ell)
        R = max(self.orders)
        e_values = ag.elementary_symmetric(z, R)
        variances = np.exp(2 * log_order)
        K = sum(v * e_values[o] for v, o in zip(variances, self.orders))
        K = K.copy()
        K[np.diag_indices(N)] += np.exp(2 * log_noise) + JITTER
        try:
            factor = cho_factor(K, lower=True, check_finite=False)
        except np.linalg.LinAlgError:
            return 1e25, np.zeros_like(theta)
        residual = y - mean
        alpha = cho_solve(factor, residual, check_finite=False)
        value = 0.5 * residual @ alpha + np.sum(np.log(np.diag(factor[0]))) + 0.5 * N * ag.LOG_2PI
        A = np.outer(alpha, alpha) - cho_solve(factor, np.eye(N), check_finite=False)
        half_trace = lambda dK: -0.5 * np.sum(A * dK)
        gradient = np.zeros_like(theta)
        for d in range(D):
            ell = np.exp(log_ell[d])
            upper = constrained(X[:, d], X[:, d], ell * np.exp(DERIVATIVE_STEP), self.measures[d])
            lower = constrained(X[:, d], X[:, d], ell * np.exp(-DERIVATIVE_STEP), self.measures[d])
            derivative = (upper - lower) / (2 * DERIVATIVE_STEP)
            reduced = ag.elementary_without(e_values, z[d], R - 1)
            weight = sum(v * reduced[o - 1] for v, o in zip(variances, self.orders))
            gradient[d] = half_trace(weight * derivative)
        for i, order in enumerate(self.orders):
            gradient[D + i] = half_trace(2 * variances[i] * e_values[order])
        at = D + len(self.orders)
        gradient[at] = -np.exp(2 * log_noise) * np.trace(A)
        gradient[at + 1] = -np.sum(alpha)
        return value, gradient

    def initial_theta(self, X, y, rng, jitter):
        log_ell = np.log(np.std(X, axis=0) + 1e-9) + jitter * rng.normal(size=self.dimension)
        total = np.var(y)
        shares = [0.5 * np.log(total / (len(self.orders) * ag.comb(self.dimension, o))) for o in self.orders]
        return np.concatenate([log_ell, np.array(shares) + jitter * rng.normal(size=len(self.orders)), [0.5 * np.log(0.1 * total), np.mean(y)]])

    def fit(self, X, y, seed=0, restarts=2, max_iterations=120, jitter=0.3, keep_all=False):
        rng = np.random.default_rng(seed)
        best = None
        self.solutions = []
        for restart in range(restarts):
            start = self.initial_theta(X, y, rng, 0.0 if restart == 0 else jitter)
            path = [start.copy()]
            result = minimize(self.negative_log_likelihood, start, args=(X, y), jac=True, method="L-BFGS-B", options={"maxiter": max_iterations}, callback=lambda p: path.append(p.copy()))
            self.solutions.append((result.fun, result.x))
            if best is None or result.fun < best[0]:
                best = (result.fun, result.x, path)
        self.nll, self.theta, self.history = best
        self.X, self.y = X, y
        log_ell, log_order, log_noise, mean = self.unpack(self.theta)
        K = self.kernel(X, X)
        K[np.diag_indices(len(X))] += np.exp(2 * log_noise) + JITTER
        self.factor = cho_factor(K, lower=True, check_finite=False)
        self.mean = mean
        self.alpha = cho_solve(self.factor, y - mean, check_finite=False)
        return self

    def predict(self, points):
        return self.mean + self.kernel(points, self.X) @ self.alpha

    def order_term(self, points, order):
        """n 次の項全体の事後平均を、points の上で返す。"""
        log_ell, log_order, _, _ = self.unpack(self.theta)
        z = self.base(points, self.X, log_ell)
        e_values = ag.elementary_symmetric(z, max(self.orders))
        return np.exp(2 * log_order[self.orders.index(order)]) * e_values[order] @ self.alpha

    def first_order_term(self, d, values):
        log_ell, log_order, _, _ = self.unpack(self.theta)
        cross = constrained(values, self.X[:, d], np.exp(log_ell[d]), self.measures[d])
        return np.exp(2 * log_order[self.orders.index(1)]) * cross @ self.alpha

    def order_shares(self, points):
        """次数ごとの項の分散の割合（ソボル指数を次数ごとに足したものに当たる）。"""
        variances = np.array([np.var(self.order_term(points, o)) for o in self.orders])
        return variances / variances.sum()

    def noise(self):
        return float(np.exp(self.unpack(self.theta)[2]))
