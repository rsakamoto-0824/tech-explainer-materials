# 因果フォレスト解説資料の生成元

`../因果フォレスト_概念と原理.pptx`（28枚・発表者ノート付き）を作るためのファイル一式。

## ファイル

| ファイル | 役割 |
|---|---|
| `demo_causal_forest.py` | 合成データで因果フォレスト（EconML の CausalForestDML）を動かし、グラフ用の数値を `demo_results.json` に書き出す |
| `demo_results.json` | 上のスクリプトの出力。スライド18〜21の数値はすべてここから取る |
| `render_formulas.py` | スライドの数式を PNG 画像にする（`formulas/` に出力） |
| `build_deck.js` | pptxgenjs でスライドを組み立てる |
| `postprocess.py` | フォント指定の修正（和文 BIZ UDGothic・欧文 Arial）、重複した段落プロパティの削除、ZIP の再圧縮 |

## 作り直す手順

Python 3 の仮想環境に `numpy scikit-learn econml matplotlib` を入れ、Node.js に `pptxgenjs` を入れておく。

```bash
python demo_causal_forest.py
python render_formulas.py
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python postprocess.py deck_raw.pptx 因果フォレスト_概念と原理.pptx
```

## 注意

- デモは乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる（2026-09-22 に EconML 0.17.0・scikit-learn 1.9.1・NumPy 2.5.3 で実行）
- スライド26「製造現場での活用イメージ」は想定例で、実データでは検証していない
