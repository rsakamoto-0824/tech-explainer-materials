# ベイズ最適化解説資料の生成元

`../ベイズ最適化_概念と原理.pptx`（25枚・発表者ノート付き）を作るためのファイル一式。

## ファイル

| ファイル | 役割 |
|---|---|
| `demo_bayesian_optimization.py` | ガウス過程の事前分布からのサンプル、Forrester 関数での GP 回帰と EI によるベイズ最適化、Branin 関数でのベイズ最適化（EI・LCB）とランダム探索の比較（各20回）を行い、`demo_results.json` に書き出す（実行に約2分） |
| `demo_results.json` | 上のスクリプトの出力。スライド7・9・13〜16の数値はすべてここから取る |
| `code_example_check.py` | スライド22の Python コード例を Branin 関数でそのまま動かして確かめる |
| `render_formulas.py` | スライドの数式を PNG 画像にする（`formulas/` に出力） |
| `build_deck.js` | pptxgenjs でスライドを組み立てる |
| `postprocess.py` | フォント指定の修正（和文 BIZ UDGothic・欧文 Arial）、重複した段落プロパティの削除、グラフの空欄の点の削除、ZIP の再圧縮 |

## 作り直す手順

Python 3 の仮想環境に `numpy scipy scikit-learn matplotlib` を入れ、Node.js に `pptxgenjs` を入れておく。このフォルダで実行する。

```bash
python demo_bayesian_optimization.py
python render_formulas.py
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python postprocess.py deck_raw.pptx ベイズ最適化_概念と原理.pptx
```

## 注意

- デモは乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる（2026-09-22 に scikit-learn 1.9.1・SciPy・NumPy 2.5.3 で実行）
- スライド22の MATLAB コード（bayesopt）は、この環境では MATLAB を実行できないため未実行
- スライド23「製造現場での活用イメージ」は想定例で、実データでは検証していない
