"""スライドに載せる数式を PNG 画像にする（matplotlib の mathtext を使用）。

画像は「指定したポイント数の文字サイズ」で描き、formulas.json に
インチ単位の幅・高さを書き出す。スライド側はその寸法のまま配置する。
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

OUTPUT_DIR = Path(__file__).with_name("formulas")
DPI = 300
PAD_INCH = 0.04
INK_COLOR = "#1F2A24"
WHITE_COLOR = "#FFFFFF"

plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["font.family"] = "STIXGeneral"

# key: (数式, 文字サイズpt)
FORMULAS = {
    "marginal": (r"$p(x) = \int p(x \mid z)\, p(z)\, dz$", 24),
    "marginal_discrete": (r"$p(x) = \sum_{k} p(z = k)\, p(x \mid z = k)$", 20),
    "posterior": (r"$p(z \mid x) = \dfrac{p(x \mid z)\, p(z)}{p(x)}$", 20),
    "loglik": (r"$\log p(X \mid \theta) = \sum_{i=1}^{N} \log \sum_{k=1}^{K} \pi_k\, \mathcal{N}(x_i \mid \mu_k, \Sigma_k)$", 19),
    "complete": (r"$\log p(X, Z \mid \theta) = \sum_{i=1}^{N} \;\; \sum_{k=1}^{K} z_{ik} \{\log \pi_k + \log \mathcal{N}(x_i \mid \mu_k, \Sigma_k)\}$", 17),
    "resp": (r"$\gamma_{ik} = \dfrac{\pi_k\, \mathcal{N}(x_i \mid \mu_k, \Sigma_k)}{\sum_{j} \pi_j\, \mathcal{N}(x_i \mid \mu_j, \Sigma_j)}$", 20),
    "mstep": (r"$\mu_k = \dfrac{\sum_i \gamma_{ik}\, x_i}{\sum_i \gamma_{ik}}, \quad \pi_k = \dfrac{1}{N} \sum_i \gamma_{ik}$", 20),
    "elbo_decomp": (r"$\log p(x \mid \theta) = \mathcal{L}(q, \theta) + \mathrm{KL}\,(\,q(z) \,\|\, p(z \mid x, \theta)\,)$", 21),
    "elbo_def": (r"$\mathcal{L}(q, \theta) = \mathbb{E}_{q(z)}\,[\,\log p(x, z \mid \theta) - \log q(z)\,]$", 17),
    "gmm": (r"$p(x) = \sum_{k=1}^{K} \pi_k\, \mathcal{N}(x \mid \mu_k, \Sigma_k)$", 22),
    "bic": (r"$\mathrm{BIC} = -2 \log \hat{L} + p \log N$", 20),
    "fa": (r"$x = \mu + \Lambda f + \varepsilon, \quad f \sim \mathcal{N}(0, I), \quad \varepsilon \sim \mathcal{N}(0, \Psi)$", 18),
    "fa_cov": (r"$\Sigma = \Lambda \Lambda^{\top} + \Psi$", 20),
    "rotation": (r"$(\Lambda R)(\Lambda R)^{\top} = \Lambda \Lambda^{\top} \quad (R R^{\top} = I)$", 17),
    "ppca": (r"$x = W z + \mu + \varepsilon, \quad \varepsilon \sim \mathcal{N}(0, \sigma^2 I)$", 18),
    "hmm": (r"$p(x_{1:T}, z_{1:T}) = p(z_1) \prod_{t=2}^{T} p(z_t \mid z_{t-1}) \prod_{t=1}^{T} p(x_t \mid z_t)$", 18),
    "vae": (r"$\mathcal{L} = \mathbb{E}_{q_\phi(z \mid x)}\,[\,\log p_\theta(x \mid z)\,] - \mathrm{KL}\,(\,q_\phi(z \mid x) \,\|\, p(z)\,)$", 19),
    "reparam": (r"$z = \mu_\phi(x) + \sigma_\phi(x) \odot \epsilon, \quad \epsilon \sim \mathcal{N}(0, I)$", 17),
    "irt": (r"$P(\mathrm{correct} \mid \theta) = \dfrac{1}{1 + \exp\{-a(\theta - b)\}}$", 16),
}
WHITE_VARIANTS = set()


def render(key, tex, size_pt, color):
    fig = plt.figure(figsize=(0.01, 0.01))
    fig.text(0, 0, tex, fontsize=size_pt, color=color)
    path = OUTPUT_DIR / f"{key}.png"
    fig.savefig(path, dpi=DPI, transparent=True, bbox_inches="tight", pad_inches=PAD_INCH)
    plt.close(fig)
    from PIL import Image

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
        print(f"{key:12s} {info['w']:.2f} x {info['h']:.2f} in")


if __name__ == "__main__":
    main()
