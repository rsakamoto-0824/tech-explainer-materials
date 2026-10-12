# 潜在変数モデル解説資料の生成元

`../潜在変数モデル_概念と原理.pptx`（29枚・発表者ノート付き）を作るためのファイル一式。

## ファイル

| ファイル | 役割 |
|---|---|
| `demo_latent_variable.py` | 合成データで、混合ガウスモデルの EM 推定（NumPy で実装し scikit-learn と照合）、BIC による成分数の選択、因子分析を行い、`demo_results.json` に書き出す |
| `demo_results.json` | 上のスクリプトの出力。スライド13〜17の数値はすべてここから取る |
| `render_formulas.py` | スライドの数式を PNG 画像にする（`formulas/` に出力） |
| `build_deck.js` | pptxgenjs でスライドを組み立てる |
| `postprocess.py` | フォント指定の修正（和文 BIZ UDGothic・欧文 Arial）、重複した段落プロパティの削除、散布図の空欄の点の削除、ZIP の再圧縮 |

## 作り直す手順

Python 3 の仮想環境に `numpy scikit-learn matplotlib` を入れ、Node.js に `pptxgenjs` を入れておく。このフォルダで実行する。

```bash
python demo_latent_variable.py
python render_formulas.py
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python postprocess.py deck_raw.pptx 潜在変数モデル_概念と原理.pptx
```

## 注意

- デモは乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる（2026-09-22 に scikit-learn 1.9.1・NumPy 2.5.3 で実行）
- スライド19（SEM）の図と、スライド27「製造現場での活用イメージ」は架空・想定の例で、実データでは検証していない
