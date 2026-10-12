"""スライドの Python コード例をそのまま実行して確かめる（latin_square.csv を使用）。"""

# ---- ここからスライドのコード ----
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from pyDOE3 import pbdesign

X = pbdesign(11)                    # Plackett–Burman：12回・11因子
print(X.shape)

df = pd.read_csv("latin_square.csv")   # 列：row, col, trt, y
fit = smf.ols("y ~ C(row) + C(col) + C(trt)", data=df).fit()
print(sm.stats.anova_lm(fit, typ=2))
# ---- ここまで ----
