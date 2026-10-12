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
    "next": (r"$x_{n+1} = \arg\max_{x}\ \alpha(x \mid \mathcal{D}_n)$", 22),
    "gp_def": (r"$f(x) \sim \mathcal{GP}\,(\,m(x),\ k(x, x')\,)$", 22),
    "rbf": (r"$k(x, x') = \sigma_f^2 \exp\left(-\dfrac{\|x - x'\|^2}{2\ell^2}\right)$", 19),
    "matern": (r"$k(r) = \sigma_f^2 \left(1 + \dfrac{\sqrt{5}\,r}{\ell} + \dfrac{5 r^2}{3 \ell^2}\right) \exp\left(-\dfrac{\sqrt{5}\,r}{\ell}\right)$", 19),
    "post_mean": (r"$\mu(x) = k_*^{\top} (K + \sigma_n^2 I)^{-1} y$", 21),
    "post_var": (r"$\sigma^2(x) = k(x, x) - k_*^{\top} (K + \sigma_n^2 I)^{-1} k_*$", 21),
    "loglik": (r"$\log p(y \mid X, \theta) = -\dfrac{1}{2} y^{\top} (K_\theta + \sigma_n^2 I)^{-1} y - \dfrac{1}{2} \log |K_\theta + \sigma_n^2 I| - \dfrac{n}{2} \log 2\pi$", 16),
    "pi": (r"$\mathrm{PI}(x) = \Phi\left(\dfrac{f^* - \mu(x) - \xi}{\sigma(x)}\right)$", 19),
    "ei_def": (r"$\mathrm{EI}(x) = \mathbb{E}\,[\,\max(f^* - f(x),\ 0)\,]$", 19),
    "ei": (r"$\mathrm{EI}(x) = (f^* - \mu - \xi)\,\Phi(z) + \sigma\,\phi(z), \quad z = \dfrac{f^* - \mu - \xi}{\sigma}$", 17),
    "lcb": (r"$\mathrm{LCB}(x) = \mu(x) - \kappa\,\sigma(x)$", 19),
    "forrester": (r"$f(x) = (6x - 2)^2 \sin(12x - 4)$", 18),
    "regret": (r"$r_n = \min_{i \leq n} f(x_i) - f(x^*)$", 20),
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
