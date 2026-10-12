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
INK_COLOR = "#16241D"
WHITE_COLOR = "#FFFFFF"

plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["font.family"] = "STIXGeneral"

# key: (数式, 文字サイズpt)
FORMULAS = {
    "linear_model": (r"$y = X\beta + \varepsilon,\quad \varepsilon \sim N(0,\ \sigma^2 I)$", 22),
    "var_beta": (r"$\mathrm{Var}(\hat{\beta}) = \sigma^2 (X^{\top}X)^{-1}$", 22),
    "pred_var": (r"$\mathrm{Var}(\hat{y}(x)) = \sigma^2\, f(x)^{\top} (X^{\top}X)^{-1} f(x)$", 20),
    "latin_model": (r"$y_{ijk} = \mu + \rho_i + \gamma_j + \tau_k + \varepsilon_{ijk}$", 22),
    "quad_model": (r"$y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \beta_{12} x_1 x_2 + \beta_{11} x_1^2 + \beta_{22} x_2^2 + \varepsilon$", 18),
    "defining": (r"$I = ABD = ACE = BCF = ABCG$", 20),
    "lenth_pse": (r"$\mathrm{PSE} = 1.5 \times \mathrm{median}\{\,|c_j| : |c_j| < 2.5\,s_0\,\}$", 17),
    "lenth_s0": (r"$s_0 = 1.5 \times \mathrm{median}\,|c_j|$", 17),
    "d_crit": (r"$\max_{X}\ \ |X^{\top}X|$", 26),
    "d_eff": (r"$D_{\mathrm{eff}} = \left(\dfrac{|X_1^{\top}X_1|}{|X_2^{\top}X_2|}\right)^{1/p}$", 19),
    "i_crit": (r"$\min_{X}\ \ \dfrac{1}{|R|}\int_{R} f(x)^{\top}(X^{\top}X)^{-1}f(x)\,dx = \mathrm{tr}\left[(X^{\top}X)^{-1} M\right]$", 18),
    "moment": (r"$M = \dfrac{1}{|R|}\int_{R} f(x)\,f(x)^{\top} dx$", 18),
    "spv": (r"$\mathrm{SPV}(x) = n\, f(x)^{\top}(X^{\top}X)^{-1} f(x)$", 18),
}
WHITE_VARIANTS = {"d_crit"}


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
