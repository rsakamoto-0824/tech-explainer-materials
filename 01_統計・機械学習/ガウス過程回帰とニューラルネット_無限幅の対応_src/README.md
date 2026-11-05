# ガウス過程回帰とニューラルネットの解説動画 — 生成元

ガウス過程回帰がニューラルネットの理論のモデルになっていることを、約15分で解説する動画 `../ガウス過程回帰とニューラルネット_無限幅の対応.mp4` の生成元です。
重みを乱数で決めたネットは、幅（隠れユニットの数）を無限に広げるとガウス過程になります。
さらに、ある条件のもとで、学習したネットの期待値（予測の平均）がガウス過程回帰の式と一致します。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、RBF と TPS・特異値分解・ガウス過程回帰の解説動画（`../RBFとTPS_放射基底関数と薄板スプライン_src/` など）と同じです。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` はそこから写し、章の一覧・右上の題名・既定のページ名を変えています。

## 構成（20場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| この動画のポイント | ① ランダムな重み → ガウス過程 ② カーネルはネットの形で決まる ③ ベイズ推論で事後分布が一致 ④ 勾配降下法で平均が一致 | 4つのカードに小さな図 |
| 1 2つのモデル | ガウス過程回帰の予測の期待値、隠れ層1つのネット `f(x) = (σ_v/√H) Σ v_j φ(σ_w w_j x + σ_a a_j)` | 幅5のネットの図、ユニットごとの折れ線 → 足した関数 → 30回引き直した関数の束 |
| 2 幅を広げる | 中心極限定理、多変量の中心極限定理 → ガウス過程（ニール 1996）、出力に掛ける数（1/H・1/√H・1）の違い | x = 1 での出力のヒストグラム（幅 1・3・10・100）、幅 3・30・1000 の関数の例 |
| 3 NNGP カーネル | `K = σ_v² E[φ(u)φ(u')]`、ReLU のアークコサイン・カーネル、分散が x² で増える、深いネットの漸化式 | 600個のネットの (f(0), f(1)) と式の楕円、K(x, x′) の式と乱数での平均 |
| 4 ベイズ推論 | 重みの空間と関数の空間、事後分布 ＝ ガウス過程回帰、条件 | 最後の層をベイズ推論したネット（幅 3〜3000）とガウス過程回帰の事後平均・帯 |
| 5 勾配降下法 ① | 最後の層だけ学習 → `E[f∞] = K(x, X)K⁻¹y`、分散も事後分散と一致、2種類の期待値 | 幅1000のネット200個を学習する様子、平均と式 `K(x,X)K⁻¹(I − e^{−ηKt})y`、±2σ |
| 6 勾配降下法 ② | 全部の層を学習 → 1次近似、NTK ＝ 勾配の内積（ジャコほか 2018）、1回の更新の式 `Δf(x) ≈ −η Σ Θ(x, xᵢ)(f(xᵢ) − yᵢ)`、固有値ごとの学習の速さ、`E[f∞] = Θ(x, X)Θ⁻¹y`（リーほか 2019） | 1回の更新で関数が動く形と NTK の式、ネットごとの NTK と幅（幅 10・100・4000）、固有ベクトルと符号の変化、幅4000のネット200個の平均と NTK・NNGP の式、幅1000との比較 |
| 7 一致する条件と限界 | 5つの条件、学び方と一致する式の表、限界（有限の幅、特徴の学習、平均場など） | 幅と事後平均のずれ、幅と内側の重みが動いた割合（どちらも 1/√H） |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `nngp.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、数値の書式、章の一覧 |
| `js/nn-math.js` | NNGP カーネル・NTK の式、ガウス過程回帰、乱数で作るネット、有限の幅の NTK と1回の更新の形、最後の層の学習（勾配流）、全部の層の勾配降下法 |
| `js/nn-draw.js` | ネットの図、ヒストグラム、共分散の楕円、何度も使う計算結果（ガウス過程回帰の平均、最後の層を学習したネットの束） |
| `js/nn-data.js` | 全部の層を学習したネットの結果など（`tools/make-data.mjs` が自動生成。手で直さない） |
| `js/scenes-prior.js` | はじめに、ポイント、第1〜3章 |
| `js/scenes-learning.js` | 第4〜7章、まとめ、おわり |
| `js/narration.js` | 字幕ごとの読み上げ原稿（数式は読み方に直し、読み間違えやすい語はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成）。声が字幕の時間より長いと、その字幕を延ばす |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/render.mjs` | 確認画像・書き出し・読み上げ・音声の重ね合わせ |
| `tools/make-data.mjs` | 全部の層の学習（時間がかかる）を前もって計算して `js/nn-data.js` に書く。カーネルの式と乱数での平均の一致なども表示する |

画面に出す数値（分散、相関係数、ずれ、重みが動いた割合）は手で書かず、`nn-math.js` で計算した値か `nn-data.js` の値を表示しています。
読み上げ原稿（`narration.js`）には同じ数値を書いているので、ネットや乱数を変えたときは字幕の数値を確かめて原稿も直します。

## 例の設定

- データ：x = −2.4, −1.5, −0.6, 0.3, 1.2, 2.1 の6点、y = sin(1.3x) + 0.25x（説明用に式で作ったもの。ノイズなし）
- ネット：隠れ層1つ、ReLU、σ_w = σ_a = 1、σ_v² = 2（出力側の重みの分散 2/H。He の初期化に当たる）。重みはすべて独立な標準正規分布（種を固定した乱数）
- 第4章のベイズ推論は、隠れ層を乱数で固定し、最後の層の重みだけを推論しています（観測ノイズの分散 0.01。この場合は事後分布が式で求まる）
- 第5章の学習は、最後の層について勾配流（学習率 → 0 の極限）の解の式を使っています。横軸の ηt は「学習率 × ステップ数」に当たります
- 第6章の学習は、全部の層を学習率 0.05 で 3000 回、実際に勾配降下法で学習しています（幅 1000 と 4000、各 200 個。最大の損失は 1e−7 以下）
- 第6章の「1回の更新」は、幅 4000 のネットで1つの点の誤差 1 だけを使い、学習率 0.001 で全部の重みを更新して、前後の出力の差を学習率で割ったものです

## 数値の確認で分かったこと

- NNGP カーネルと NTK の式は、乱数のユニット 40 万個での平均と 3 桁目まで一致する
- 最後の層だけを学習したネット200個（幅1000）の平均は、ガウス過程回帰の事後平均と 0.02 程度まで一致する（平均をとる数による差）
- 全部の層を学習したネットの平均は、データの範囲では NTK の式とよく一致する（幅4000 で 0.023）。データの外側では、幅1000 で 0.36、幅4000 で 0.17 のずれが残る。平均の標準誤差（約 0.03）よりずっと大きいので、有限の幅による差で、幅を広げると小さくなる
- 同じネットの1次近似（初期値でのNTK）を使った予測の平均は、データの外側でも NTK の式とほぼ一致する。外側のずれは、学習中に内側の重みが動くこと（幅が有限であること）による
- 1つの点の誤差で重みを1回更新したときの出力の動きは、そのネットの NTK と一致する（差は 0.01 以下。NTK の値は最大で 18 程度）。NTK は更新した点で尖る（x = 0.3 で左の傾き 0.92、右の傾き 0.28）。NNGP カーネルには尖りがない
- NTK の式との差（初期値によるずれ）は幅10で47%、幅4000で2.5%。学習の前後の変化は幅10で80%、幅4000で1.0%（6点の行列のフロベニウスノルムの比、20個の平均）
- データ6点の NTK の固有値は 21.6 から 0.17 まで（比は約125倍）。固有値の大きい順に、固有ベクトルの符号の変わる回数が 0, 1, 2, 3, 4, 5 回と増える

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）。

```bash
npm install
node tools/make-data.mjs                     # 全部の層の学習などを計算して js/nn-data.js を書く（約3分）
node tools/render.mjs info                   # 尺と場面の時刻表
node tools/render.mjs sheet 8 --scene 5V     # 1場面を8コマ並べた確認画像（out/sheet-5V.png）
node tools/render.mjs stills 120,500         # 指定した秒の原寸画像（out/still-<秒>.png）
node tools/render.mjs serve                  # ブラウザで確認するための URL を表示
```

音声つきの動画は、次の順で作ります（声の長さで字幕の時間が変わるため、映像は声を作ったあとに書き出す）。

```bash
node tools/render.mjs voice                  # 原稿を音声にする（narration/clips/）、長さを narration/seconds.js に書く
caffeinate -i node tools/render.mjs video nngp --workers 4   # 映像を書き出す（out/nngp.mp4 と out/nngp-poster.png）
node tools/render.mjs mux nngp               # 音声を字幕の時刻に並べて重ねる（out/nngp-voice.mp4）
```

できた `out/nngp-voice.mp4` を、親フォルダの `ガウス過程回帰とニューラルネット_無限幅の対応.mp4` として置きます。
声は `--voice`、速さは `--rate`（語/分。既定 220）で変えられます。動画全体の速さは `js/engine.js` の `PACE`（既定 1.1）で決まります。

ブラウザで見るときは `serve` が表示する URL を開きます（KaTeX のフォントは `file://` では読めないため）。
`?scene=5V` でその場面から、`?t=480` でその時刻に止めて表示します。再生中はスペースで一時停止、←→ で5秒戻る・進む、[ ] で前・次の場面です。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`（確認画像と書き出し途中のファイル）、`narration/clips/`（音声ファイル）、`node_modules/` は Git に含めません。
- 読み上げは Mac の `say` コマンドを使うため、`voice` は Mac でだけ動きます。読み方は耳では確認していません。「表」は漢字だと「おもて」と読まれるため「ひょう」と書くなど、声の比較で分かった読み違いはかなに直しています。違和感があれば `narration.js` を直して `voice` からやり直します。
- 書き出しの途中でスリープすると撮影が止まることがあるため、Mac では `caffeinate -i` を付けて実行します。

## 参考文献

- R. M. Neal, *Bayesian Learning for Neural Networks*, Lecture Notes in Statistics 118, Springer, 1996
- C. K. I. Williams, "Computing with infinite networks," *Advances in Neural Information Processing Systems 9* (1997) 295–301
- Y. Cho, L. K. Saul, "Kernel methods for deep learning," *Advances in Neural Information Processing Systems 22* (2009)
- J. Lee, Y. Bahri, R. Novak, S. S. Schoenholz, J. Pennington, J. Sohl-Dickstein, "Deep neural networks as Gaussian processes," *ICLR* 2018
- A. G. de G. Matthews, M. Rowland, J. Hron, R. E. Turner, Z. Ghahramani, "Gaussian process behaviour in wide deep neural networks," *ICLR* 2018
- A. Jacot, F. Gabriel, C. Hongler, "Neural tangent kernel: convergence and generalization in neural networks," *Advances in Neural Information Processing Systems 31* (2018)
- J. Lee, L. Xiao, S. S. Schoenholz, Y. Bahri, R. Novak, J. Sohl-Dickstein, J. Pennington, "Wide neural networks of any depth evolve as linear models under gradient descent," *Advances in Neural Information Processing Systems 32* (2019)
- L. Chizat, E. Oyallon, F. Bach, "On lazy training in differentiable programming," *Advances in Neural Information Processing Systems 32* (2019)
- C. E. Rasmussen, C. K. I. Williams, *Gaussian Processes for Machine Learning*, MIT Press, 2006
