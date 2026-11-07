# 加法ガウス過程の後続研究の解説動画 — 生成元

論文 "Additive Gaussian Processes"（Duvenaud ほか 2011）の後続研究を解説する動画 `../加法ガウス過程の後続研究_構造探索から直交加法カーネルまで.mp4` の生成元です。
加法ガウス過程の動画（`../加法ガウス過程_全次数の交互作用を学ぶカーネル.mp4`）の続きです。冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、加法ガウス過程の動画と同じです。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css`・`tools/additive_gp.py`・`tools/fetch_concrete.py` はそこから写しています。
- 各論文の内容は要約で、図は使っていません。実験は、この動画のために計算したものです。

## 構成（18場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに・ポイント | 題名と目次、要点4つ | 4つのカード |
| 1 全体の地図 | 2011年の論文が残した3つの課題 | 研究の年表 |
| 2 構造を探す | カーネルの文法（2013）、自動統計家（2014） | 探索の木、時系列の分解 |
| 3 高次元へ | SALSA（2016）、高次元ベイズ最適化（2015）、構造の学習（2017） | ベイズ最適化の小さな実験 |
| 4 ランダム射影 | 軸に沿わない項の和（2020） | 尾根を足すと山になる |
| 5 識別できない問題 | 定数のずれ、高い次数による吸収 | 加法ガウス過程の1次の項が真の形と違う様子 |
| 6 OAK | 平均ゼロの制約、制約つきカーネル、ANOVA 分解 | k と k̃ の形、そこから引いた関数と平均 |
| 7 OAK を試す | ソボル指数、論文の報告 | 1次の項の比較、3次の関数でのデータ数と次数、コンクリート強度 |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `additive-followups.html` | 動画のページ |
| `js/follow-math.js` | 時系列の分解、制約つきカーネル、乱数の関数 |
| `js/follow-data.js` | `tools/make_data.py` の結果（自動生成） |
| `js/scenes-map.js` | はじめに、ポイント、第1〜4章 |
| `js/scenes-oak.js` | 第5〜7章、まとめ、おわり |
| `js/narration.js` | 読み上げ原稿 |
| `tools/additive_gp.py` | 加法ガウス過程の実装 |
| `tools/oak.py` | OAK の実装（論文の式 8、10、入力の分布は一様・正規・経験分布） |
| `tools/make_data.py` | 実験の計算 |

## 実験の設定と結果

- **ベイズ最適化**：10変数、1変数の山の和（最大値 10.0）、10点から始めて100回評価、10回の平均。加法の構造を知っている場合は1変数ずつ UCB を最大化、SE は乱数の候補4000点から選ぶ。長さスケールは固定（加法 0.1、SE 0.5）。到達値は加法 9.2、SE 6.9、乱数 6.9
- **識別できない問題**：Lu ほか（2022）の式 5 の関数、200点、ノイズの分散 0.01。加法ガウス過程の最良の解は2次が 100%、1次の項の誤差は 0.31 と 1.18。OAK は 1次 85%・2次 15%（真の値の約 85%・15%）、誤差は 0.03 程度
- **局所解**：同じデータで9回の乱数の初期値から学習すると、この動画の条件では加法ガウス過程も OAK も2種類の解になった（論文は3種類と1種類）。局所解の数の差は再現していない
- **3次の関数**（6変数、sin(2x) の3つずつの積の和）：加法ガウス過程の一番大きい次数は 300点で5次、600点で4次、1000点で3次。OAK はどの点数でも3次（100%、100%、99.96%）。テスト誤差は加法 0.57、0.39、0.22、OAK 0.31、0.20、0.15
- **コンクリート強度**（10分割、加法ガウス過程の動画と同じ分割、入力の分布は経験分布の分位点200個）：結果は `concrete-oak` の値を動画に表示。誤差は加法ガウス過程と同じ程度で、分散は1次に93%、4次以上はゼロ。論文の「多くのデータで低い次数の項で足りる、精度に有意差はない」と同じ傾向
- 確認：OAK の式はモンテカルロ積分と一致し、制約つきカーネルの平均はほぼゼロ、周辺尤度の勾配は差分と相対誤差 10⁻⁸ で一致した

## 実行方法

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python -I tools/fetch_concrete.py   # コンクリート強度のデータを取得
.venv/bin/python tools/make_data.py identify  # 約2分
.venv/bin/python tools/make_data.py orders    # 約10分
.venv/bin/python tools/make_data.py concrete  # 約30分
.venv/bin/python tools/make_data.py bo        # 約1分
.venv/bin/python tools/make_data.py bundle
node tools/render.mjs voice
caffeinate -i node tools/render.mjs video additive-followups --workers 4
node tools/render.mjs mux additive-followups
```

できた `out/additive-followups-voice.mp4` を、親フォルダに置きます。

## 注意事項

- 認証情報や環境変数は使いません。`out/`、`narration/clips/`、`node_modules/`、`.venv/`、`data/` は Git に含めません。
- コンクリート強度のデータは I-C. Yeh, UCI Machine Learning Repository（CC BY 4.0）です。元の CSV は Git に入れていません。
- 読み上げは Mac の `say` を使います。読み方は耳では確認していません。誤読しやすい語は `narration.js` でかなに直しています。

## 参考文献

- D. Duvenaud, H. Nickisch, C. E. Rasmussen, "Additive Gaussian processes," *NIPS 24* (2011) 226–234
- D. Duvenaud, J. R. Lloyd, R. Grosse, J. B. Tenenbaum, Z. Ghahramani, "Structure discovery in nonparametric regression through compositional kernel search," *ICML* 2013, arXiv:1302.4922
- J. R. Lloyd, D. Duvenaud, R. Grosse, J. B. Tenenbaum, Z. Ghahramani, "Automatic construction and natural-language description of nonparametric regression models," *AAAI* 2014
- K. Kandasamy, J. Schneider, B. Póczos, "High dimensional Bayesian optimisation and bandits via additive models," *ICML* 2015, PMLR 37:295–304
- K. Kandasamy, Y. Yu, "Additive approximations in high dimensional nonparametric regression via the SALSA," *ICML* 2016, arXiv:1602.00287
- J. Gardner, C. Guo, K. Weinberger, R. Garnett, R. Grosse, "Discovering and exploiting additive structure for Bayesian optimization," *AISTATS* 2017, PMLR 54:1311–1319
- I. Delbridge, D. Bindel, A. G. Wilson, "Randomly projected additive Gaussian processes for regression," *ICML* 2020, PMLR 119:2453–2463
- N. Durrande, D. Ginsbourger, O. Roustant, L. Carraro, "ANOVA kernels and RKHS of zero mean functions for model-based sensitivity analysis," *Journal of Multivariate Analysis* 115 (2013) 57–67
- X. Lu, A. Boukouvalas, J. Hensman, "Additive Gaussian processes revisited," *ICML* 2022, PMLR 162:14358–14383, arXiv:2206.09861
