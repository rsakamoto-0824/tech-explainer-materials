# mgcv の一般化加法モデルの解説動画 — 生成元

R のパッケージ mgcv で一般化加法モデル（GAM）を当てはめるとき、`gam()` の中で行われる計算を約21分で解説する動画 `../mgcvの一般化加法モデル_計算のしくみ.mp4` の生成元です。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、加法ガウス過程などの解説動画と同じです。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` は `../加法ガウス過程_全次数の交互作用を学ぶカーネル_src/` から、`tools/check-layout.mjs` は `../ガウス過程回帰_基礎から予測まで_src/` から写し、章の一覧・右上の題名・既定のページ名を変えています。
- 図の数値は、本物の mgcv（1.9-4）で計算しています。R はこの PC に入れず、webR（Node の上で動く R）を使いました。λ を動かす図などは、mgcv が作った基底の行列 X とペナルティの行列 S を使って JavaScript で計算し直し、mgcv の結果と一致することを確かめています。

## 構成（27場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| この動画のポイント | ① 関数は「基底 × 係数」の和 ② 波打ちはペナルティで抑える ③ 係数は P-IRLS で解く ④ λ は REML か GCV で選ぶ | 4つのカードに小さな図 |
| 1 gam() の1行が行う計算 | モデルの式、分布とリンク関数、決めるもの3つ（β・λ・φ） | 例の4変数のデータと推定した関数、計算の全体の流れ（基底 → 係数 ⇄ λ → 出力） |
| 2 基底 | 関数を基底と係数で表す、モデル行列 X、薄板回帰スプライン（η の和、固有値で k 個に切り詰める） | 9本の基底に係数を掛けて足す、固有値の大きさと切り詰めた基底 |
| 3 ペナルティ | ‖y − Xβ‖² + λ βᵀSβ、解の式、λ → 0 と λ → ∞ | 基底40本の例で λ を動かす（残差の2乗和・波打ちの大きさ・有効自由度） |
| 4 識別の制約と有効自由度 | 合計 0 の制約、F = (XᵀX + λS)⁻¹XᵀX、edf = tr(F) | 成分ごとの縮み率 1/(1 + λd_k) と、その合計としての有効自由度 |
| 5 P-IRLS | ペナルティつき対数尤度、作業用の応答 z と重み w、反復 | ポアソンの例で、z と曲線が反復ごとに落ち着く様子 |
| 6 λ を選ぶ | GCV と REML の式、ニュートン法（外側 λ・内側 β、陰関数の微分） | GCV・REML の曲線、データを300回作り直した比較、2つの λ の REML の面とニュートン法の道筋 |
| 7 不確かさと summary() | 事後分布、共分散行列 V_β、帯の意味 | 4つの関数と帯、summary の出力の読み方 |
| 8 実務での使い方 | method = "REML"、k と gam.check、select、te・ti、bam | k を 5・10・20・40 と変えた当てはめと k.check の値 |
| まとめ・おわり | 要点、注意点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `mgcv-gam.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、数値の書式、章の一覧 |
| `js/gam-data.js` | `tools/make-data.mjs` の計算結果（mgcv の出力。自動生成。手で直さない） |
| `js/gam-math.js` | ペナルティつきの当てはめ、有効自由度、GCV・REML、P-IRLS、λ のニュートン法 |
| `js/gam-setup.js` | 場面で共通に使う計算（1変数の例のモデル）と絵（散布図、矢印、流れ図の箱、つまみ、10 のべき乗の目盛り） |
| `js/scenes-basis.js` | はじめに、ポイント、第1〜2章 |
| `js/scenes-fit.js` | 第3〜5章 |
| `js/scenes-select.js` | 第6章 |
| `js/scenes-output.js` | 第7〜8章、まとめ、おわり |
| `js/narration.js` | 字幕ごとの読み上げ原稿（記号は読み方に直し、読み間違えやすい語はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成） |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/gam_data.R` | 図に使う数値を mgcv で計算する R のスクリプト |
| `tools/make-data.mjs` | 上の R のスクリプトを webR で実行して `js/gam-data.js` に書く |
| `tools/check-math.mjs` | JavaScript の計算が mgcv と一致するかを確かめ、字幕に書く数値を表示する |
| `tools/check-layout.mjs` | 全場面の文字のはみ出しと、3行になった字幕を調べる |
| `tools/check_reading.py` | 読み上げの誤読を、声の比較で調べる |
| `tools/render.mjs` | 確認画像・書き出し・読み上げ・音声の重ね合わせ |

## 例の設定

どれも説明用に乱数で作った合成データです。真の関数は、mgcv の `gamSim(1)`（Gu と Wahba の4変数の例）と同じものを使っています。

- **例A（4変数、第1・6・7章）**：`gamSim(1, n = 400, scale = 2)`、乱数の種 1。`gam(y ~ s(x0) + s(x1) + s(x2) + s(x3), method = "REML")`。x3 は真の効果が 0。第6章の REML の面は、項を `s(x1) + s(x2)` の2つにしたモデル
- **例B（1変数、第2〜4・6・8章）**：200点、x は一様乱数、y = f₂(x) + ノイズ（標準偏差 2）、種 11。基底は k = 10（既定）と k = 40（λ を動かす図）
- **例C（ポアソン、第5章）**：200点、log μ = 1 + 1.2 sin(2πx) + 0.8x、種 5。`gam(y ~ s(x), family = poisson, method = "REML")`
- **繰り返しの比較（第6章）**：y = 2 sin(πx) + ノイズ（標準偏差 2）、200点、k = 20 を 300 回。同じデータに REML と GCV を当てはめる

例A の種は、はじめ 2 で試しましたが、真の効果が 0 の x3 に p 値 0.04 が出たので、1 に変えました（種 1〜10 のうち、p 値が 0.05 より小さかったのは種 2 だけです）。

## 数値の確認で分かったこと

`node tools/check-math.mjs` で、次の項目が mgcv と一致することを確かめています（相対差）。

- 例B：REML の値（10⁻⁹）、尺度 φ（10⁻⁷）、有効自由度（10⁻⁹）、係数（10⁻⁷）、REML・GCV で選ばれる λ（10⁻⁶ 以下）。k = 40 でも同じ
- 例A の2項モデル：REML の値（10⁻⁹）、ニュートン法が着いた λ（約 10⁻⁵）
- 例C：P-IRLS の逸脱度（10⁻⁹）と係数（10⁻⁷）
- 薄板回帰スプライン：η(r) = r³/12 の行列を固有値分解して上位10個から作った基底は、mgcv の基底と同じ空間を張る（ずれは相対値で 10⁻¹¹ 以下）

そのほかに分かったこと。

- 基底40本の例では、REML と GCV はほぼ同じ λ を選んだ（0.0518 と 0.0508、有効自由度はどちらも約 10.7）。違いは λ が小さい側の形で、GCV は 5.07 で頭打ちになり、REML は λ を小さくするほど大きくなり続ける
- 繰り返しの比較では、REML の有効自由度は 3.5〜4.8（5%点〜95%点）、最大 6.2。GCV は 3.2〜7.9、最大 14.2 で、REML の中央値の2倍を超えたのが 300 回のうち 14 回あった（REML は 0 回）。平均二乗誤差の平均は REML 0.079、GCV 0.094。ただし GCV のほうが誤差の小さい回も 110 回ある。この条件での結果で、いつもこうなるとは限らない
- 例A では、GCV は x1 の項に有効自由度 6.9 を選んだ（REML は 3.2）。動画では扱っていない
- 2項モデルのニュートン法は、この動画の再計算（勾配とヘッセ行列を差分で求め、尺度 φ は式の上で最適な値を入れる）で4回、mgcv（φ も同時に動かす）で6回。1歩目は、1歩の大きさの上限（log λ で 5）まで進む
- 例A の4つの項で、真の関数が帯（±2×標準誤差）に入った割合は 100%、100%、99%、100%

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）。数値を計算し直すときだけ、インターネット接続（webR が mgcv などをダウンロードする）。読みの点検をするときだけ、NumPy の入った Python。

```bash
npm install
```

```bash
node tools/make-data.mjs               # mgcv で数値を計算して js/gam-data.js に書く（約40秒）
node tools/check-math.mjs              # mgcv との一致を確かめる
node tools/check-layout.mjs            # 文字のはみ出しを調べる
node tools/render.mjs info             # 長さと場面の時刻表
node tools/render.mjs sheet 12 --scene 6V   # 1場面の確認画像（out/sheet-6V.png）
node tools/render.mjs voice            # 読み上げの音声を作る（narration/clips/、長さは narration/seconds.js）
caffeinate -i node tools/render.mjs video mgcv-gam   # 映像を書き出す（out/mgcv-gam.mp4、2並列で約30分）
node tools/render.mjs mux mgcv-gam     # 音声を重ねる（out/mgcv-gam-voice.mp4）
```

できた `out/mgcv-gam-voice.mp4` を、親フォルダに `mgcvの一般化加法モデル_計算のしくみ.mp4` として置きます。

R が入っている PC では、`Rscript -e 'cat(source("tools/gam_data.R")$value)'` でも同じ JSON を作れます（mgcv と jsonlite が必要。この方法は試していません）。

## 注意

- 字幕（`scenes-*.js`）の数値は `js/gam-data.js` から計算して表示しますが、読み上げ原稿（`js/narration.js`）の数値は手で書いています。データを作り直したら、`check-math.mjs` の表示と見比べて原稿も直します
- 声の長さが変わると字幕の時間も変わるので、`voice` のあとは `video` を書き出し直してから `mux` します
- 読みは、声の比較（`tools/check_reading.py`）で点検しましたが、耳では確かめていません
- 第6章の「REML のほうが誤差が小さく、極端な波打ちが起きにくい」は Wood (2011) の報告です。この動画の繰り返しの比較は、1つの条件で確かめたものです

## 参考文献

- S. N. Wood, Thin plate regression splines, J. R. Statist. Soc. B 65 (2003) 95–114
- S. N. Wood, Fast stable restricted maximum likelihood and marginal likelihood estimation of semiparametric generalized linear models, J. R. Statist. Soc. B 73 (2011) 3–36
- S. N. Wood, On p-values for smooth components of an extended generalized additive model, Biometrika 100 (2013) 221–228
- G. Marra, S. N. Wood, Coverage properties of confidence intervals for generalized additive model components, Scand. J. Statist. 39 (2012) 53–74
- D. Nychka, Bayesian confidence intervals for smoothing splines, J. Amer. Statist. Assoc. 83 (1988) 1134–1143
- S. N. Wood, Generalized Additive Models: An Introduction with R, 2nd ed., CRC Press, 2017
