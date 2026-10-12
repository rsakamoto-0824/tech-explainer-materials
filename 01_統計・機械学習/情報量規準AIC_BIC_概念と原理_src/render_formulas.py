"""スライドに載せる数式を PNG 画像にする（matplotlib の mathtext を使用）。

画像は「指定したポイント数の文字サイズ」で描き、formulas/formulas.json に
インチ単位の幅・高さを書き出す。スライド側はその寸法のまま配置する。
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from PIL import Image  # noqa: E402

OUTPUT_DIR = Path(__file__).with_name("formulas")
DPI = 300
PAD_INCH = 0.04
INK_COLOR = "#1E1C33"
WHITE_COLOR = "#FFFFFF"

plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["font.family"] = "STIXGeneral"

# key: (数式, 文字サイズpt)
FORMULAS = {
    "ic_general": (r"$\mathrm{IC} = -2\log L(\hat{\theta}) + \mathrm{penalty}(k,\ n)$", 24),
    "loglik_def": (r"$\log L(\hat{\theta}) = \max_{\theta}\ \sum_{i=1}^{n} \log f(y_i \mid \theta)$", 20),
    "loglik_normal": (r"$-2\log L(\hat{\theta}) = n \log\left(\dfrac{\mathrm{RSS}}{n}\right) + n\,(1 + \log 2\pi)$", 20),
    "kl": (r"$D_{\mathrm{KL}}(g \,\|\, f_{\theta}) = \mathbb{E}_{g}[\log g(Z)] - \mathbb{E}_{g}[\log f(Z \mid \theta)]$", 20),
    "expected_ll": (r"$\mathbb{E}_{g}[\log f(Z \mid \hat{\theta})]$", 20),
    "bias_def": (r"$b = \mathbb{E}_{y}\left[\ \log L(\hat{\theta}\,;\,y) - n\,\mathbb{E}_{Z}[\log f(Z \mid \hat{\theta})]\ \right]$", 18),
    "bias_decomp": (r"$b = b_1 + b_2 + b_3 \approx \dfrac{1}{2}\mathrm{tr}(I J^{-1}) + 0 + \dfrac{1}{2}\mathrm{tr}(I J^{-1}) = \mathrm{tr}(I J^{-1})$", 18),
    "ij_def": (r"$J = -\mathbb{E}\left[\dfrac{\partial^2 \log f}{\partial\theta\,\partial\theta^{\top}}\right],\quad I = \mathbb{E}\left[\dfrac{\partial \log f}{\partial\theta}\dfrac{\partial \log f}{\partial\theta^{\top}}\right]$", 16),
    "bias_k": (r"$I = J \ \Rightarrow\ b = \mathrm{tr}(I_k) = k$", 20),
    "aic": (r"$\mathrm{AIC} = -2\log L(\hat{\theta}) + 2k$", 28),
    "tic": (r"$\mathrm{TIC} = -2\log L(\hat{\theta}) + 2\,\mathrm{tr}(\hat{I}\hat{J}^{-1})$", 19),
    "aicc": (r"$\mathrm{AIC_c} = \mathrm{AIC} + \dfrac{2k(k+1)}{n-k-1}$", 24),
    "akaike_weight": (r"$w_i = \dfrac{\exp(-\Delta_i/2)}{\sum_{j} \exp(-\Delta_j/2)},\quad \Delta_i = \mathrm{AIC}_i - \mathrm{AIC}_{\min}$", 18),
    "bayes_post": (r"$P(M_i \mid y) = \dfrac{p(y \mid M_i)\,P(M_i)}{\sum_j p(y \mid M_j)\,P(M_j)}$", 20),
    "evidence": (r"$p(y \mid M) = \int p(y \mid \theta, M)\,\pi(\theta \mid M)\,d\theta$", 20),
    "laplace": (r"$p(y \mid M) \approx L(\hat{\theta})\ \pi(\hat{\theta})\ (2\pi)^{k/2}\ |\,n\hat{J}\,|^{-1/2}$", 20),
    "laplace_log": (r"$\log p(y \mid M) = \log L(\hat{\theta}) - \dfrac{k}{2}\log n + O(1)$", 20),
    "bic": (r"$\mathrm{BIC} = -2\log L(\hat{\theta}) + k \log n$", 28),
    "bic_post": (r"$P(M_i \mid y) \approx \dfrac{\exp(-\mathrm{BIC}_i/2)}{\sum_j \exp(-\mathrm{BIC}_j/2)}$", 19),
    "bayes_factor": (r"$2\log B_{12} \approx \mathrm{BIC}_2 - \mathrm{BIC}_1$", 20),
    "cp": (r"$C_p = \dfrac{\mathrm{RSS}_p}{\hat{\sigma}^2} - n + 2p$", 18),
    "hqc": (r"$\mathrm{HQC} = -2\log L(\hat{\theta}) + 2k\log\log n$", 18),
    "lasso": (r"$\hat{\beta}(\lambda) = \arg\min_{\beta}\ \dfrac{1}{2n}\|y - X\beta\|^2 + \lambda \|\beta\|_1$", 19),
    "overfit_gap": (r"$\mathrm{AIC} - \mathrm{BIC} = k\,(2 - \log n)$", 18),
}
WHITE_VARIANTS = {"aic", "bic"}


def render(key, tex, size_pt, color):
    fig = plt.figure(figsize=(0.01, 0.01))
    fig.text(0, 0, tex, fontsize=size_pt, color=color)
    path = OUTPUT_DIR / f"{key}.png"
    fig.savefig(path, dpi=DPI, transparent=True, bbox_inches="tight", pad_inches=PAD_INCH)
    plt.close(fig)
    with Image.open(path) as image:
        width_px, height_px = image.size
    return {"file": path.name, "w": width_px / DPI, "h": height_px / DPI}


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    sizes = {}
    for key, (tex, size_pt) in FORMULAS.items():
        sizes[key] = render(key, tex, size_pt, INK_COLOR)
        if key in WHITE_VARIANTS:
            sizes[f"{key}_white"] = render(f"{key}_white", tex, size_pt, WHITE_COLOR)
    (OUTPUT_DIR / "formulas.json").write_text(json.dumps(sizes, indent=2), encoding="utf-8")
    for key, info in sizes.items():
        print(f"{key:14s} {info['w']:.2f} x {info['h']:.2f} in")


if __name__ == "__main__":
    main()
