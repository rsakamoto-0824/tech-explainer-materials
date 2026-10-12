"""スライドの Python コード例をそのまま実行して確かめる（example_data.csv を使用）。"""

import itertools

import pandas as pd
import statsmodels.formula.api as smf

# ---- ここからスライドのコード ----
df = pd.read_csv("example_data.csv")
candidates = [f"x{j}" for j in range(1, 9)]

results = []
for r in range(len(candidates) + 1):
    for chosen in itertools.combinations(candidates, r):
        formula = "y ~ " + (" + ".join(chosen) if chosen else "1")
        fit = smf.ols(formula, data=df).fit()
        results.append((fit.aic, fit.bic, chosen))

print("AIC最小:", min(results, key=lambda t: t[0])[2])
print("BIC最小:", min(results, key=lambda t: t[1])[2])
# ---- ここまで ----

full = smf.ols("y ~ " + " + ".join(candidates), data=df).fit()
print(f"全変数モデル: llf={full.llf:.4f} aic={full.aic:.2f} bic={full.bic:.2f} df_model={full.df_model}")
