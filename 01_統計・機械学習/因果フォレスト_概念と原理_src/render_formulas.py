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
    "ate": (r"$\tau = \mathbb{E}\,[\,Y(1) - Y(0)\,]$", 22),
    "cate": (r"$\tau(x) = \mathbb{E}\,[\,Y(1) - Y(0) \mid X = x\,]$", 22),
    "unconf": (r"$\{Y(1),\,Y(0)\} \perp W \mid X$", 20),
    "overlap": (r"$0 < e(x) = P(W=1 \mid X=x) < 1$", 17),
    "leaf": (r"$\hat{\tau}_{\mathrm{leaf}} = \bar{Y}_{\mathrm{treated}} - \bar{Y}_{\mathrm{control}}$", 22),
    "split": (r"$\Delta(C_L, C_R) = \dfrac{n_L\, n_R}{n_P^{\,2}}\,\left(\hat{\tau}_L - \hat{\tau}_R\right)^2$", 22),
    "weights": (r"$\alpha_i(x) = \dfrac{1}{B}\sum_{b=1}^{B} \dfrac{\mathbf{1}\{X_i \in L_b(x)\}}{|L_b(x)|}$", 22),
    "normal": (r"$\dfrac{\hat{\tau}(x) - \tau(x)}{\hat{\sigma}(x)} \;\rightarrow\; \mathcal{N}(0,\,1)$", 22),
    "robinson": (r"$Y - m(X) = \tau(X)\,\{W - e(X)\} + \varepsilon$", 22),
    "rlearner": (r"$\hat{\tau}(x) = \dfrac{\sum_i \alpha_i(x)\,\{Y_i - \hat{m}(X_i)\}\{W_i - \hat{e}(X_i)\}}{\sum_i \alpha_i(x)\,\{W_i - \hat{e}(X_i)\}^2}$", 22),
    "nuisance": (r"$m(x) = \mathbb{E}\,[\,Y \mid X = x\,],\quad e(x) = P(W = 1 \mid X = x)$", 18),
    "drscore": (r"$\Gamma_i = \hat{\mu}_1(X_i) - \hat{\mu}_0(X_i) + \dfrac{W_i\,\{Y_i - \hat{\mu}_1(X_i)\}}{\hat{e}(X_i)} - \dfrac{(1 - W_i)\{Y_i - \hat{\mu}_0(X_i)\}}{1 - \hat{e}(X_i)}$", 18),
    "tauhat": (r"$\hat{\tau}$", 24),
    "ci": (r"$\hat{\tau}(x) \pm 1.96\,\hat{\sigma}(x)$", 20),
    "demo_tau": (r"$\tau(x) = -0.5 + \dfrac{3}{1 + \exp(-5\,x_1)}$", 20),
    "demo_e": (r"$e(x) = \dfrac{1}{1 + \exp(-2\,x_2)}$", 20),
    "demo_y": (r"$Y = 2x_2 + x_3^{\,2} + W\,\tau(x) + \varepsilon,\quad \varepsilon \sim \mathcal{N}(0,1)$", 18),
}
WHITE_VARIANTS = {"cate"}


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
