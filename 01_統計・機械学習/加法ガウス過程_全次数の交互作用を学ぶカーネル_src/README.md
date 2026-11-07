# 加法ガウス過程の解説動画 — 生成元

論文 D. Duvenaud, H. Nickisch, C. E. Rasmussen, "Additive Gaussian Processes"（NIPS 24, 2011、[arXiv:1112.4394](https://arxiv.org/abs/1112.4394)）を約15分で解説する動画 `../加法ガウス過程_全次数の交互作用を学ぶカーネル.mp4` の生成元です。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、ガウス過程回帰とニューラルネット・RBF と TPS の解説動画と同じです。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` は `../ガウス過程回帰とニューラルネット_無限幅の対応_src/` から、`js/view3d.js` は `../RBFとTPS_放射基底関数と薄板スプライン_src/` から写し、章の一覧・右上の題名・既定のページ名を変えています。
- 論文の図は使っていません。図はすべて自分で計算し直したものです。論文の表の数値（表1・表2）だけを `js/scenes-results.js` の `PAPER_*` に書き写しています。

## 構成（20場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| この動画のポイント | ① 全次数を1つのカーネルに ② 指数個の項を D² の計算で ③ 次数の分散を学習 ④ 遠くの点まで予測できる | 4つのカードに小さな図 |
| 1 2つの極端なモデル | GAM と SE-GP の式と長所・短所、加法ガウス過程はその両方を含む | 足し算で書ける関数と交互作用のある関数の断面の比較 |
| 2 カーネルの和と積 | 和 → 関数の和（共分散の式）、積 → 多変数の SE（論文の式 5） | k₁、k₂、k₁+k₂、k₁k₂ の形と、そこから引いた関数（論文の図1に当たる） |
| 3 加法カーネルの定義 | 論文の式 (1)〜(4)、D = 3 の例、項の数 | 交互作用の格子（D = 4）。GAM・SE-GP・加法ガウス過程の重みの違い（論文の図3に当たる） |
| 4 指数個の項を計算する | 基本対称多項式、∏(1 + zᵢt) の展開、ニュートン・ジラールの公式（式 6）、計算量 | z = (0.9, 0.6, 0.4, 0.2) の計算例、掛け算の回数の比較 |
| 5 次数の分散を学習する | 学習するパラメータ、周辺尤度、微分（式 7）、σₙ² の意味 | 6変数の合成データで次数を見つける様子、データ数と次数の推定、論文の表1 |
| 6 局所と非局所 | 距離だけで決まるカーネル、次元の呪い、1座標だけ同じ2点の例 | 3次元の等値面（板・筒・球）を回転（論文の図4に当たる） |
| 7 遠くを予測する | 項ごとの事後平均 | L字のデータから遠くの山を当てる（論文の図5に当たる） |
| 8 実験の結果と関連研究 | 実験の条件、HKL（式 8）、SS-ANOVA、プレート | 論文の表2、コンクリート強度の1次の項と次数の分散（論文の図2・表1に当たる、この動画で計算） |
| まとめ・おわり | 要点、注意点、後続の研究（OAK）、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `additive-gp.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、数値の書式、章の一覧 |
| `js/view3d.js` | 2変数の面を斜めから描く |
| `js/add-math.js` | SE カーネル、基本対称多項式、ニュートン・ジラールの公式、ガウス過程から関数を引く計算 |
| `js/add-draw.js` | 交互作用の格子、次数の棒、ヒートマップ、3次元の等値面（光線を飛ばして毎コマ描く） |
| `js/add-data.js` | `tools/make_data.py` の計算結果（自動生成。手で直さない） |
| `js/scenes-model.js` | はじめに、ポイント、第1〜4章 |
| `js/scenes-results.js` | 第5〜8章、まとめ、おわり。論文の表の数値もここにある |
| `js/narration.js` | 字幕ごとの読み上げ原稿（数式は読み方に直し、読み間違えやすい語はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成） |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/render.mjs` | 確認画像・書き出し・読み上げ・音声の重ね合わせ |
| `tools/additive_gp.py` | 加法ガウス過程の実装（カーネル、周辺尤度と勾配、L-BFGS、項ごとの事後平均） |
| `tools/make_data.py` | 動画の図に使う数値の計算 |
| `tools/fetch_concrete.py` | コンクリート強度のデータを UCI から取得して `data/concrete.csv` にする |
| `tools/check-math.mjs` | 画面に出す数式の値を確かめる |

## 例の設定

- **L字のデータ（第7章）**：f(x) = sin(2(x₁ − 0.75) + π/2) + sin(2(x₂ − 0.75) + π/2)、範囲 [−2, 2]²、学習点48個（x₁ < −1 または x₂ < −1 の範囲だけ）、ノイズの標準偏差 0.05。論文の図5と同じ考え方の例を作ったもので、論文のデータそのものではありません
- **次数の学習（第5章）**：6変数、入力は [−1.5, 1.5] の一様乱数、学習1000点、テスト1500点、ノイズの標準偏差 0.05。関数は sin(2xᵢ) の組み合わせ（1つずつの和、2つずつの積の和3組、3つずつの積の和2組、6つ全部の積）。振幅は標準偏差が1になるようにそろえている
- **コンクリート強度（第8章）**：UCI Concrete Compressive Strength（1030点、8変数）。入力と目的変数は標準化する。基底カーネルには次元ごとの大きさも持たせる（論文の本文には明記がなく、この動画の判断）。学習は L-BFGS で300回まで、再出発なし。分割は10分割

## 数値の確認で分かったこと

- ニュートン・ジラールの公式は、総当たりで足した値と 10⁻¹² 以下で一致する（`node tools/check-math.mjs`）
- 周辺尤度の勾配は、差分で求めた値と相対誤差 10⁻⁸ 以下で一致する
- L字のデータで、×印の山（真の高さ 2.0）を SE-GP は 0.47、加法ガウス過程は 1.98 と予測した。データのない範囲の誤差（RMSE）は 0.76 と 0.03。8回の再出発はどれも同じ解に収束した
- 合成データでは、1000点なら正しい次数に分散が集まる（3次の関数は 3次 98%、4次 2%）
- **論文に書かれていない注意点**：同じ3次の関数でも、300点だと5次に、600点だと4次に分散が集まった。データが少ないと次数は高めに推定される。ただし予測の誤差はどの点数でも SE-GP 以下
- コンクリート強度の次数の分散は1次が中心で（論文 70.6%、この動画 89%。10分割でも 87〜91%）、次が3次（論文 13.8%、この動画 7.8%）。2次の割合は論文の 13.3% に対してこの動画ではほぼ 0 で、一致していない。次数の分散は局所解や項の重なりの影響を受けるとみられる
- コンクリート強度の平均二乗誤差（10分割の平均）は、加法ガウス過程 0.055、SE-GP 0.086、GAM 0.097（論文は 0.089、0.157、0.149）。加法は10分割すべてで最小で、対応のある t 検定で p ≈ 3×10⁻⁵。「加法が単独で最良」という論文の結論は再現した。SE-GP と GAM の差は有意でない（p = 0.17）。論文には分割の比率が書かれていないので、条件は完全には合わせられず、値そのものは直接比べられない

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）、Python 3.14（数値の計算）。

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
```

```bash
.venv/bin/python -I tools/fetch_concrete.py      # コンクリート強度のデータを取得（data/ に保存。Git には入れない）
.venv/bin/python tools/make_data.py lshape       # L字のデータ（数秒）
.venv/bin/python tools/make_data.py orders       # 次数の学習（約8分）
.venv/bin/python tools/make_data.py concrete-full # 全データの学習（約10分）
.venv/bin/python tools/make_data.py concrete-cv  # 10分割（約1時間）
.venv/bin/python tools/make_data.py bundle       # 結果を js/add-data.js にまとめる
node tools/check-math.mjs                        # 数式の値を確かめる
```

```bash
node tools/render.mjs info                   # 尺と場面の時刻表
node tools/render.mjs sheet 8 --scene 5V     # 1場面を8コマ並べた確認画像（out/sheet-5V.png）
node tools/render.mjs stills 120,500         # 指定した秒の原寸画像（out/still-<秒>.png）
node tools/render.mjs serve                  # ブラウザで確認するための URL を表示
```

音声つきの動画は、次の順で作ります（声の長さで字幕の時間が変わるため、映像は声を作ったあとに書き出す）。

```bash
node tools/render.mjs voice                  # 原稿を音声にする（narration/clips/）、長さを narration/seconds.js に書く
caffeinate -i node tools/render.mjs video additive-gp --workers 4   # 映像を書き出す（out/additive-gp.mp4）
node tools/render.mjs mux additive-gp        # 音声を字幕の時刻に並べて重ねる（out/additive-gp-voice.mp4）
```

できた `out/additive-gp-voice.mp4` を、親フォルダの `加法ガウス過程_全次数の交互作用を学ぶカーネル.mp4` として置きます。
ブラウザで見るときは `serve` が表示する URL を開きます。`?scene=5V` でその場面から、`?t=480` でその時刻に止めて表示します。再生中はスペースで一時停止、←→ で5秒戻る・進む、[ ] で前・次の場面です。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`、`narration/clips/`（音声ファイル）、`node_modules/`、`.venv/`、`data/`（ダウンロードしたデータと計算の途中経過）は Git に含めません。`js/add-data.js` には、コンクリート強度の各点の値（水・材齢と、他の変数の効果を引いた強度）が入っています。
- 読み上げは Mac の `say` コマンドを使うため、`voice` は Mac でだけ動きます。読み方は耳では確認していません。漢字の声とかなの声の距離を比べて読み違いの見当をつけています。違和感があれば `narration.js` を直して `voice` からやり直します。
- 書き出しの途中でスリープすると撮影が止まることがあるため、Mac では `caffeinate -i` を付けて実行します。

## 参考文献

- D. Duvenaud, H. Nickisch, C. E. Rasmussen, "Additive Gaussian processes," *Advances in Neural Information Processing Systems 24* (2011) 226–234, arXiv:1112.4394
- F. Bach, "High-dimensional non-linear variable selection through hierarchical kernel learning," arXiv:0909.0844 (2009)
- Y. Bengio, O. Delalleau, N. Le Roux, "The curse of highly variable functions for local kernel machines," *Advances in Neural Information Processing Systems 18* (2006)
- T. A. Plate, "Accuracy versus interpretability in flexible modeling: implementing a tradeoff using Gaussian process models," *Behaviormetrika* 26 (1999) 29–50
- G. Wahba, *Spline Models for Observational Data*, SIAM, 1990
- T. J. Hastie, R. J. Tibshirani, *Generalized Additive Models*, Chapman & Hall/CRC, 1990
- C. E. Rasmussen, C. K. I. Williams, *Gaussian Processes for Machine Learning*, MIT Press, 2006
- X. Lu, A. Boukouvalas, J. Hensman, "Additive Gaussian processes revisited," *Proceedings of the 39th International Conference on Machine Learning*, PMLR 162 (2022) 14358–14383, arXiv:2206.09861
- I-C. Yeh, "Concrete Compressive Strength," UCI Machine Learning Repository (2007)、CC BY 4.0、doi:10.24432/C5PK67
