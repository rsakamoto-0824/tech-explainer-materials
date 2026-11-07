"""additive_gp.py — 加法ガウス過程（Duvenaud, Nickisch, Rasmussen 2011）の最小の実装。

動画の図に使う数値は、すべてこの実装で計算する。
カーネル: k(x, x') = Σ_n σ_n² e_n(z_1, ..., z_D)、z_d = v_d exp(−(x_d − x'_d)² / (2 ℓ_d²))
e_n は基本対称多項式で、論文の式 (6) のニュートン・ジラールの漸化式で求める。

SE カーネルは「次数 D だけ」、GAM は「次数 1 だけ」の特別な場合として同じコードで扱う。
"""

from dataclasses import dataclass, field
from math import comb

import numpy as np
from scipy.linalg import cho_factor, cho_solve  # noqa: F401（make_data.py からも使う）
from scipy.optimize import minimize

# カーネル行列の対角に足す小さな数（コレスキー分解が数値誤差で止まらないように）
JITTER = 1e-8
LOG_2PI = np.log(2 * np.pi)


def squared_differences(first, second):
    """次元ごとの差の2乗を D×N×M の配列で返す。"""
    return (first[:, None, :] - second[None, :, :]).transpose(2, 0, 1) ** 2


def elementary_symmetric(z, max_order):
    """基本対称多項式 e_0 ... e_max_order を返す（論文の式 6）。z は D×N×M。"""
    power_sums = [None] + [np.sum(z**k, axis=0) for k in range(1, max_order + 1)]
    e_values = [np.ones(z.shape[1:])]
    for n in range(1, max_order + 1):
        total = np.zeros(z.shape[1:])
        for k in range(1, n + 1):
            total += (-1) ** (k - 1) * e_values[n - k] * power_sums[k]
        e_values.append(total / n)
    return e_values


def elementary_without(e_values, z_removed, max_order):
    """変数を1つ除いた基本対称多項式 e_0(z\\d) ... を返す（論文の式 7 の微分に使う）。"""
    reduced = [np.ones_like(z_removed)]
    for n in range(1, max_order + 1):
        reduced.append(e_values[n] - z_removed * reduced[n - 1])
    return reduced


@dataclass
class Model:
    """orders: 使う次数の一覧。use_scale: 次元ごとの大きさ v_d も学習するか。"""

    orders: list
    dimension: int
    use_scale: bool = False
    fit_mean: bool = True
    theta: np.ndarray = None
    history: list = field(default_factory=list)

    @property
    def parameter_count(self):
        return self.dimension * (2 if self.use_scale else 1) + len(self.orders) + 2

    def unpack(self, theta):
        D = self.dimension
        at = 0
        log_ell = theta[at:at + D]
        at += D
        if self.use_scale:
            log_v = theta[at:at + D]
            at += D
        else:
            log_v = np.zeros(D)
        log_order = theta[at:at + len(self.orders)]
        at += len(self.orders)
        return log_ell, log_v, log_order, theta[at], theta[at + 1]

    def base(self, squared, log_ell, log_v):
        """z_d（D×N×M）を返す。"""
        ell2 = np.exp(2 * log_ell)[:, None, None]
        scale = np.exp(log_v)[:, None, None]
        return scale * np.exp(-squared / (2 * ell2))

    def kernel_from_z(self, z, log_order):
        order_variance = np.exp(2 * log_order)
        if self.orders == [self.dimension]:
            return order_variance[0] * np.prod(z, axis=0), None
        if self.orders == [1]:
            return order_variance[0] * np.sum(z, axis=0), None
        e_values = elementary_symmetric(z, max(self.orders))
        total = np.zeros(z.shape[1:])
        for variance, order in zip(order_variance, self.orders):
            total += variance * e_values[order]
        return total, e_values

    def kernel(self, first, second, theta=None):
        theta = self.theta if theta is None else theta
        log_ell, log_v, log_order, _, _ = self.unpack(theta)
        z = self.base(squared_differences(first, second), log_ell, log_v)
        return self.kernel_from_z(z, log_order)[0]

    def negative_log_likelihood(self, theta, inputs, targets, squared):
        """周辺尤度の負の対数と、そのパラメータでの勾配を返す。"""
        log_ell, log_v, log_order, log_noise, mean = self.unpack(theta)
        N, D = inputs.shape
        z = self.base(squared, log_ell, log_v)
        K_signal, e_values = self.kernel_from_z(z, log_order)
        K = K_signal.copy()
        K[np.diag_indices(N)] += np.exp(2 * log_noise) + JITTER
        try:
            factor = cho_factor(K, lower=True, check_finite=False)
        except np.linalg.LinAlgError:
            return 1e25, np.zeros_like(theta)
        residual = targets - (mean if self.fit_mean else 0.0)
        alpha = cho_solve(factor, residual, check_finite=False)
        value = 0.5 * residual @ alpha + np.sum(np.log(np.diag(factor[0]))) + 0.5 * N * LOG_2PI

        K_inverse = cho_solve(factor, np.eye(N), check_finite=False)
        A = np.outer(alpha, alpha) - K_inverse
        half_trace = lambda dK: -0.5 * np.sum(A * dK)

        gradient = np.zeros_like(theta)
        order_variance = np.exp(2 * log_order)
        ell2 = np.exp(2 * log_ell)
        for d in range(D):
            if self.orders == [self.dimension]:
                # K = σ² Π z なので、K そのものに掛ければよい（z で割らずに済む）
                dK_scale = K_signal
            elif self.orders == [1]:
                dK_scale = order_variance[0] * z[d]
            else:
                reduced = elementary_without(e_values, z[d], max(self.orders) - 1)
                dK_scale = np.zeros((N, N))
                for variance, order in zip(order_variance, self.orders):
                    dK_scale += variance * reduced[order - 1]
                dK_scale = dK_scale * z[d]
            gradient[d] = half_trace(dK_scale * squared[d] / ell2[d])
            if self.use_scale:
                gradient[D + d] = half_trace(dK_scale)
        at = D * (2 if self.use_scale else 1)
        for i, order in enumerate(self.orders):
            if self.orders == [self.dimension]:
                dK = 2 * K_signal
            elif self.orders == [1]:
                dK = 2 * K_signal
            else:
                dK = 2 * order_variance[i] * e_values[order]
            gradient[at + i] = half_trace(dK)
        at += len(self.orders)
        gradient[at] = -0.5 * 2 * np.exp(2 * log_noise) * (alpha @ alpha - np.trace(K_inverse))
        if self.fit_mean:
            gradient[at + 1] = -np.sum(alpha)
        return value, gradient

    def initial_theta(self, inputs, targets, rng, jitter):
        spread = np.std(inputs, axis=0) + 1e-9
        log_ell = np.log(spread) + jitter * rng.normal(size=self.dimension)
        parts = [log_ell]
        if self.use_scale:
            parts.append(jitter * rng.normal(size=self.dimension))
        # 最初は「どの次数も同じだけの分散」から始める
        total_variance = np.var(targets)
        shares = []
        for order in self.orders:
            count = comb(self.dimension, order)
            shares.append(0.5 * np.log(total_variance / (len(self.orders) * count)))
        parts.append(np.array(shares) + jitter * rng.normal(size=len(self.orders)))
        parts.append(np.array([0.5 * np.log(0.1 * total_variance), np.mean(targets)]))
        return np.concatenate(parts)

    def fit(self, inputs, targets, seed=0, restarts=3, max_iterations=200, jitter=0.3, verbose=False):
        """周辺尤度を L-BFGS で最大化する。1回目はばらつきなしで始め、残りは乱数で始める。"""
        squared = squared_differences(inputs, inputs)
        rng = np.random.default_rng(seed)
        best = None
        for restart in range(restarts):
            start = self.initial_theta(inputs, targets, rng, 0.0 if restart == 0 else jitter)
            path = [start.copy()]
            result = minimize(
                self.negative_log_likelihood,
                start,
                args=(inputs, targets, squared),
                jac=True,
                method="L-BFGS-B",
                options={"maxiter": max_iterations},
                callback=lambda point: path.append(point.copy()),
            )
            if verbose:
                print(f"  restart {restart}: nll={result.fun:.3f} iterations={result.nit}", flush=True)
            if best is None or result.fun < best[0]:
                best = (result.fun, result.x, path)
        self.theta = best[1]
        self.history = best[2]
        self.nll = best[0]
        self.train_inputs = inputs
        self.train_targets = targets
        log_ell, log_v, log_order, log_noise, mean = self.unpack(self.theta)
        K = self.kernel(inputs, inputs)
        K[np.diag_indices(len(inputs))] += np.exp(2 * log_noise) + JITTER
        self.factor = cho_factor(K, lower=True, check_finite=False)
        self.mean = mean if self.fit_mean else 0.0
        self.alpha = cho_solve(self.factor, targets - self.mean, check_finite=False)
        return self

    def predict(self, points):
        return self.mean + self.kernel(points, self.train_inputs) @ self.alpha

    def order_shares(self, theta=None):
        """次数ごとの事前分散の割合（x = x' での k の内訳）。合計は 1。"""
        theta = self.theta if theta is None else theta
        log_ell, log_v, log_order, _, _ = self.unpack(theta)
        scale = np.exp(log_v)
        z = scale[:, None, None]
        e_values = elementary_symmetric(z, self.dimension)
        amounts = np.array([np.exp(2 * lo) * e_values[o].item() for lo, o in zip(log_order, self.orders)])
        return amounts / amounts.sum()

    def noise(self):
        return float(np.exp(self.unpack(self.theta)[3]))

    def lengths(self):
        return np.exp(self.unpack(self.theta)[0])

    def first_order_term(self, dimension_index, values):
        """1次の項 f_d(x_d) の事後平均と事後標準偏差。"""
        assert 1 in self.orders
        log_ell, log_v, log_order, _, _ = self.unpack(self.theta)
        variance = np.exp(2 * log_order[self.orders.index(1)]) * np.exp(log_v[dimension_index])
        ell2 = np.exp(2 * log_ell[dimension_index])
        difference = values[:, None] - self.train_inputs[:, dimension_index]
        cross = variance * np.exp(-(difference**2) / (2 * ell2))
        posterior_mean = cross @ self.alpha
        solved = cho_solve(self.factor, cross.T, check_finite=False)
        posterior_variance = variance - np.sum(cross * solved.T, axis=1)
        return posterior_mean, np.sqrt(np.maximum(posterior_variance, 0))

    def second_order_term(self, first_index, second_index, first_values, second_values):
        """2次の項 f_ij(x_i, x_j) の事後平均を格子の上で返す（行 = second_values）。"""
        assert 2 in self.orders
        log_ell, log_v, log_order, _, _ = self.unpack(self.theta)
        variance = np.exp(2 * log_order[self.orders.index(2)]) * np.exp(log_v[first_index] + log_v[second_index])
        ell2 = np.exp(2 * log_ell)
        X = self.train_inputs
        first = np.exp(-((first_values[:, None] - X[:, first_index][None, :]) ** 2) / (2 * ell2[first_index]))
        second = np.exp(-((second_values[:, None] - X[:, second_index][None, :]) ** 2) / (2 * ell2[second_index]))
        # first・second は (格子, 点)。格子の組ごとに Σ_点 first·second·α を計算する
        return variance * (second * self.alpha[None, :]) @ first.T


def check_gradient(model, inputs, targets, seed=0, step=1e-5):
    """解析的な勾配と、差分で求めた勾配を比べる（最大の相対誤差を返す）。"""
    rng = np.random.default_rng(seed)
    theta = model.initial_theta(inputs, targets, rng, 0.3)
    squared = squared_differences(inputs, inputs)
    _, gradient = model.negative_log_likelihood(theta, inputs, targets, squared)
    worst = 0.0
    for i in range(len(theta)):
        shift = np.zeros_like(theta)
        shift[i] = step
        upper = model.negative_log_likelihood(theta + shift, inputs, targets, squared)[0]
        lower = model.negative_log_likelihood(theta - shift, inputs, targets, squared)[0]
        numeric = (upper - lower) / (2 * step)
        worst = max(worst, abs(numeric - gradient[i]) / (1e-6 + abs(numeric)))
    return worst
