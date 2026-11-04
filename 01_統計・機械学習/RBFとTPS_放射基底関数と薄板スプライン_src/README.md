# RBF と TPS の解説動画 — 生成元

放射基底関数（RBF）による補間と、薄板スプライン（TPS）を約14分半で解説する動画 `../RBFとTPS_放射基底関数と薄板スプライン.mp4` の生成元です。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。
RBF と TPS の関係（TPS は RBF の特別な場合であり、同時に曲げエネルギー最小という理由を持つこと）が分かるように、ポイント・第3章・第5章・第6章でくり返し取り上げています。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、特異値分解・ガウス過程回帰の解説動画（`../特異値分解_回転・伸縮と低ランク近似_src/` など）と同じです。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` はそこから写し、章の一覧・見出しの札（「ポイント」を追加）・既定のページ名を変えています。

## 構成（21場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| この動画のポイント | ① RBF 補間 ＝ 距離の山を足す ② TPS は RBF の一種 ③ TPS ＝ 曲げエネルギー最小の板 ④ 使い分けと平滑化 | 4つのカードに小さな図 |
| 1 補間の問題 | 補間の条件、格子と散布、決まった基底では解けない例（マイルフーバー・カーチスの定理） | 14点を上から見る → 斜めにしてピン、最近傍 → 逆距離加重 → RBF（TPS）の面 |
| 2 RBF 補間 | `s(x) = Σ wⱼ φ(‖x − xⱼ‖)`、`Φw = y`、何次元でも同じ式 | 1次元の7点で、ガウスの山を置く → 重み倍 → 順に足す |
| 3 基底関数の種類 | ガウス・逆多重二次・多重二次・r³・r² log r の表、正定値と条件付き正定値 | 関数の形、ガウスの幅 ε を変えた補間と条件数のゲージ |
| 4 多項式の項 | 平面を足す、重みの条件、ブロックの連立方程式、平面の再現 | 直線のデータ（ガウスはたわむ、r³ ＋ 直線は直線そのもの）、点の外側 |
| 5 TPS | 曲げエネルギー `J[f]`、その最小化の答えが RBF の形（デュション 1977）、基本解と力のつり合い | 平面に r² log r を足して板がしなる、曲げの密度の色、ガウスとエネルギーを比べる |
| 6 RBF と TPS の関係 | 枠組み（RBF）と特別な場合（TPS）、形と理由、多重調和スプライン、スケール不変 | 家系図（ガウス過程回帰・変分原理とのつながり）、ガウスと TPS の面を並べる、使い分けの表 |
| 7 平滑化 TPS | ずれ ＋ λ × 曲げエネルギー、対角に 8πλ、λ = 0 と ∞ | 30点の平滑化スプラインで λ を変える、1点抜き交差検証の誤差 |
| 8 応用 | 画像の変形（ブックスタイン 1989）、アフィン部分と曲げ、ほかの用途 | 顔の絵を10個のランドマークで変形（アフィン → 笑顔 → 目を広げる） |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `rbf-tps.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、数値の書式、章の一覧 |
| `js/rbf-math.js` | 基底関数、RBF 補間（多項式・平滑化つき）、条件数、曲げエネルギー、交差検証、説明用のデータ |
| `js/view3d.js` | 2変数の関数を斜めから見た面とピンで描く（平行投影、奥から順に塗る） |
| `js/scenes-basic.js` | はじめに、ポイント、第1〜4章 |
| `js/scenes-tps.js` | 第5〜8章、まとめ、おわり |
| `js/narration.js` | 字幕ごとの読み上げ原稿（数式は読み方に直し、読み間違えやすい語はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成）。声が字幕の時間より長いと、その字幕を延ばす |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/render.mjs` | 確認画像・書き出し・読み上げ・音声の重ね合わせ |
| `tools/check-math.mjs` | 数値の確認（曲げエネルギーの式と数値積分の一致、原稿の数値と計算値の一致） |

画面に出す数値（重み、条件数、曲げエネルギー、交差検証の誤差と λ）は手で書かず、`rbf-math.js` で計算した値を表示しています。
読み上げ原稿（`narration.js`）には同じ数値を書いているので、例を変えたときは `node tools/check-math.mjs` で確かめて原稿も直します。
例のデータ（1次元の7点、2次元の14点、ノイズつきの30点、顔の絵）は説明用に式と乱数（種を固定）で作ったものです（実在のデータではありません）。

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）。

```bash
npm install
node tools/check-math.mjs                     # 数値と原稿の一致を確かめる
node tools/render.mjs info                    # 尺と場面の時刻表
node tools/render.mjs sheet 8 --scene 5V      # 1場面を8コマ並べた確認画像（out/sheet-5V.png）
node tools/render.mjs stills 66,330           # 指定した秒の原寸画像（out/still-<秒>.png）
node tools/render.mjs serve                   # ブラウザで確認するための URL を表示
```

音声つきの動画は、次の順で作ります（声の長さで字幕の時間が変わるため、映像は声を作ったあとに書き出す）。

```bash
node tools/render.mjs voice                   # 原稿を音声にする（narration/clips/）、長さを narration/seconds.js に書く
caffeinate -i node tools/render.mjs video rbf-tps --workers 4   # 映像を書き出す（out/rbf-tps.mp4 と out/rbf-tps-poster.png）
node tools/render.mjs mux rbf-tps             # 音声を字幕の時刻に並べて重ねる（out/rbf-tps-voice.mp4）
```

できた `out/rbf-tps-voice.mp4` を、親フォルダの `RBFとTPS_放射基底関数と薄板スプライン.mp4` として置きます。
声は `--voice`、速さは `--rate`（語/分。既定 220）で変えられます。動画全体の速さは `js/engine.js` の `PACE`（既定 1.1）で決まります。

ブラウザで見るときは `serve` が表示する URL を開きます（KaTeX のフォントは `file://` では読めないため）。
`?scene=5V` でその場面から、`?t=480` でその時刻に止めて表示します。再生中はスペースで一時停止、←→ で5秒戻る・進む、[ ] で前・次の場面です。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`（確認画像と書き出し途中のファイル）、`narration/clips/`（音声ファイル）、`node_modules/` は Git に含めません。
- 読み上げは Mac の `say` コマンドを使うため、`voice` は Mac でだけ動きます。読み方は耳では確認していません。違和感があれば `narration.js` を直して `voice` からやり直します。
- 書き出しの途中でスリープすると撮影が止まることがあるため、Mac では `caffeinate -i` を付けて実行します。
- ガウス RBF と比べる幅 ε = 1.6 は、この例でガウスの曲げエネルギーが最小になるあたりの値です（`check-math.mjs` で確認）。

## 参考文献

- J. Duchon, "Splines minimizing rotation-invariant semi-norms in Sobolev spaces," in *Constructive Theory of Functions of Several Variables*, Lecture Notes in Mathematics 571, Springer, 1977, pp. 85–100
- F. L. Bookstein, "Principal warps: thin-plate splines and the decomposition of deformations," *IEEE Trans. Pattern Anal. Mach. Intell.* 11(6) (1989) 567–585
- R. L. Hardy, "Multiquadric equations of topography and other irregular surfaces," *J. Geophys. Res.* 76(8) (1971) 1905–1915
- J. C. Mairhuber, "On Haar's theorem concerning Chebychev approximation problems having unique solutions," *Proc. Amer. Math. Soc.* 7 (1956) 609–615
- G. Wahba, *Spline Models for Observational Data*, SIAM, 1990
- H. Wendland, *Scattered Data Approximation*, Cambridge University Press, 2005
- G. E. Fasshauer, *Meshfree Approximation Methods with MATLAB*, World Scientific, 2007
