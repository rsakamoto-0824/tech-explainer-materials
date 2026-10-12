# 情報量規準（AIC・BIC）解説資料の生成元

`../情報量規準AIC_BIC_概念と原理.pptx`（29枚・発表者ノート付き）を作るためのファイル一式。

## ファイル

| ファイル | 役割 |
|---|---|
| `demo_information_criteria.py` | 合成データのシミュレーション（多項式回帰の過学習、最大対数尤度の偏り、真のモデルを選ぶ確率、予測誤差、全組み合わせ探索・変数増減法・Lasso）を行い、`demo_results.json` と `example_data.csv` に書き出す（実行に約1分） |
| `demo_results.json` | 上のスクリプトの出力。スライドの数値はすべてここから取る |
| `example_data.csv` | デモ③〜⑤とコード例で使う合成データ（n=100、候補8変数） |
| `code_example_check.py` | スライド27の Python コード例をそのまま動かして確かめる |
| `matlab_example.m` | スライド27の MATLAB コード例をそのまま動かして確かめる |
| `render_formulas.py` | スライドの数式を PNG 画像にする（`formulas/` に出力） |
| `build_deck.js` | pptxgenjs でスライドを組み立てる |
| `postprocess.py` | フォント指定の修正（和文 BIZ UDGothic・欧文 Arial）、重複した段落プロパティの削除、ノートマスターと Content_Types の正規化、図形IDの振り直し、ZIP の再圧縮 |

## 作り直す手順

Python 3 の仮想環境に `numpy scipy scikit-learn matplotlib statsmodels pandas pillow` を入れ、Node.js に `pptxgenjs` を入れておく。このフォルダで実行する。

```bash
python demo_information_criteria.py
python render_formulas.py
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python postprocess.py deck_raw.pptx deck.building.pptx
```

検証（validate.py・表示確認・PowerPoint での再オープン）が済んでから、`deck.building.pptx` を `../情報量規準AIC_BIC_概念と原理.pptx` へ移す。

## 注意

- デモは乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる（2026-09-26 に scikit-learn 1.9.1・statsmodels 0.15.0・NumPy 2.5.3 で実行）
- この資料の AIC・BIC は、誤差分散もパラメータ数 k に数える定義。MATLAB（fitlm）と statsmodels は数えないため、値が 2（BIC は log n）小さくなる。選ばれるモデルは同じ
- MATLAB のコード例は R2022b（Statistics and Machine Learning Toolbox）で実行して確認した。`aicbic` 関数は Econometrics Toolbox が必要なので使っていない
- データはすべて合成データで、実データでは検証していない
