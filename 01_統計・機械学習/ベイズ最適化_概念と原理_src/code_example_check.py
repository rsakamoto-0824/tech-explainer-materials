"""スライド22に載せる Python コード例を、そのまま Branin 関数で動かして確かめる。"""
import warnings

import numpy as np
from scipy.stats import norm, qmc
from sklearn.exceptions import ConvergenceWarning
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, Matern

warnings.filterwarnings("ignore", category=ConvergenceWarning)


def f(u):  # Branin 関数（入力は 0〜1 に正規化）
    x1, x2 = -5 + 15 * u[..., 0], 15 * u[..., 1]
    return (x2 - 5.1 / (4 * np.pi ** 2) * x1 ** 2 + 5 / np.pi * x1 - 6) ** 2 + 10 * (1 - 1 / (8 * np.pi)) * np.cos(x1) + 10


np.random.seed(0)
initial_X = qmc.LatinHypercube(d=2, seed=0).random(5)
# ---- ここからスライドのコード ----
def expected_improvement(mean, std, best, xi=0.01):   # 最小化用
    std = np.maximum(std, 1e-12)
    z = (best - mean - xi) / std
    return (best - mean - xi) * norm.cdf(z) + std * norm.pdf(z)

kernel = ConstantKernel() * Matern(length_scale=[0.2, 0.2], nu=2.5)
X, y = initial_X, f(initial_X)                 # 初期点（0〜1に正規化）
for _ in range(30):
    gp = GaussianProcessRegressor(kernel, normalize_y=True,
                                  n_restarts_optimizer=3).fit(X, y)
    cand = np.random.rand(3000, 2)             # 候補点
    mean, std = gp.predict(cand, return_std=True)
    x_next = cand[np.argmax(expected_improvement(mean, std, y.min()))]
    X, y = np.vstack([X, x_next]), np.append(y, f(x_next))   # 評価して追加
print(X[np.argmin(y)], y.min())
# ---- ここまで ----
print("regret:", y.min() - 0.397887, "evaluations:", len(y))
