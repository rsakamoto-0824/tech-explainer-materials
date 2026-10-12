# 実験計画法（D最適・I最適・ラテン方格・スクリーニング）解説資料の生成元

`../実験計画法_最適計画・ラテン方格・スクリーニング.pptx`（30枚・発表者ノート付き）を作るためのファイル一式。

## ファイル

| ファイル | 役割 |
|---|---|
| `demo_doe.py` | 合成データのデモ（4×4 ラテン方格の分散分析と検出力、2^(7-4) 計画、Plackett–Burman 12 回計画と Lenth 法、確定的スクリーニング計画の相関、点交換法による D 最適・I 最適計画と FDS 図・制約つき領域）を計算し、`demo_results.json` と `latin_square.csv` に書き出す（実行に約30秒） |
| `demo_results.json` | 上のスクリプトの出力。スライドの数値はすべてここから取る |
| `latin_square.csv` | ラテン方格の例のデータ（コード例で使う） |
| `code_example_check.py` | スライド28の Python コード例をそのまま動かして確かめる |
| `matlab_example.m` | スライド28の MATLAB コード例（fracfact・cordexch・anovan）を動かして確かめる |
| `render_formulas.py` | スライドの数式を PNG 画像にする（`formulas/` に出力） |
| `build_deck.js` | pptxgenjs でスライドを組み立てる |
| `postprocess.py` | フォント指定の修正、段落プロパティの重複削除、ノートマスターと Content_Types の正規化、図形IDの振り直し、不正な線種の検査、ZIP の再圧縮 |

## 作り直す手順

Python 3 の仮想環境に `numpy scipy pandas statsmodels pyDOE3 matplotlib pillow` を入れ、Node.js に `pptxgenjs` を入れておく。このフォルダで実行する。

```bash
python demo_doe.py
python render_formulas.py
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python postprocess.py deck_raw.pptx deck.building.pptx
```

検証（validate.py・表示確認・PowerPoint での再オープン）が済んでから、`deck.building.pptx` を `../実験計画法_最適計画・ラテン方格・スクリーニング.pptx` へ移す。

## 注意

- デモは乱数の種を固定しているので、同じバージョンのライブラリなら同じ数値になる（2026-09-26 に NumPy 2.5.3・SciPy・statsmodels 0.15.0・pyDOE3 1.6.2 で実行）
- 「ラテン方格法」は実験計画法のラテン方格（2 つの局外因子のブロック化）として解説し、ラテン超方格法（LHS）との違いを 1 枚で補足した
- D 最適計画の辺の点は 0.1 ずれた位置が最適（3 水準に丸めても D 効率 99.8%）。MATLAB の cordexch（3 水準）では log det 10.320、デモは 10.330
- 折れ線グラフの線種を系列ごとに変えるときは、`lineDash` に配列を渡さず、系列ごとの組み合わせグラフにする（配列だと PowerPoint が修復を求める）
- データはすべて合成データで、実データでは検証していない
