# 特異値分解（SVD）の解説動画 — 生成元

特異値分解を約9分で解説する動画 `../特異値分解_回転・伸縮と低ランク近似.mp4` の生成元です。
理論（式）と図解（グラフ）を交互に進めます。前半は 2×2 のせん断行列で「回転 → 伸縮 → 回転」と特異値の求め方を、後半は白黒の画像でランク1の層と低ランク近似を、最後に2次元の点群で主成分分析とのつながりを見せます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）。約9分
- 作り方は、ガウス過程回帰の解説動画（`../ガウス過程回帰_加法カーネルと周期カーネル_src/`）と同じです。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` はそこから写して、章の一覧と既定のページ名だけを変えています。

## 構成（15場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| 1 行列は空間の変換 | `Ax`、せん断行列、固有値分解 `A = PΛP⁻¹` と、せん断では固有値分解できないこと | 格子と単位円にせん断を掛ける（円 → 楕円）、楕円の軸を逆にたどると直交する v₁, v₂ |
| 2 特異値分解の定義 | `Avᵢ = σᵢuᵢ` → `A = UΣVᵀ`、直交行列、Σ の並び、m×n のときの形 | 単位円に Vᵀ（回転）→ Σ（伸縮）→ U（回転）を順に掛け、A を直接掛けた結果と重ねる |
| 3 特異値の求め方 | `AᵀA = VΣᵀΣVᵀ`、せん断での計算（λ = 2.618, 0.382 → σ = 1.618, 0.618）、σ₁σ₂ = \|det A\| | x を一周させたときの \|Ax\|（最大 σ₁、最小 σ₂、その向きが v₁, v₂） |
| 4 ランク1行列の和 | `A = Σ σᵢuᵢvᵢᵀ`、外積とランク | 画像を行列として見る、1〜4枚目の層（u の帯 × v の帯）と足した結果 |
| 5 低ランク近似 | ランク k 近似、エッカート・ヤングの定理、誤差と保存する数 | k = 1, 2, 5, 10, 20, 40 で画像を作り直す、特異値のグラフ |
| 6 応用 | 主成分分析 ＝ 平均を引いたデータ行列の特異値分解、ほかの使い道 | 点群の平均を原点へ、v₁・v₂ と標準偏差、v₁ の線に下ろす（ランク1近似） |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `svd.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、ヒートマップ、数値の書式、章の一覧 |
| `js/svd-math.js` | 特異値分解（片側ヤコビ法）、ランク k 近似と誤差、説明用の白黒画像（式で描く 120×160）、主成分分析の点群（乱数の種を固定） |
| `js/scenes-plane.js` | 2×2 のせん断行列で見る場面（はじめに、第1〜3章） |
| `js/scenes-data.js` | 画像と点群で見る場面（第4〜6章、まとめ、おわり） |
| `js/narration.js` | 字幕ごとの読み上げ原稿（数式は読み方に直し、読み間違えやすい語はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成）。声が字幕の時間より長いと、その字幕を延ばす |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/render.mjs` | 確認画像・書き出し・読み上げ・音声の重ね合わせ |

表や字幕に出す数値（特異値、角度、ベクトルの成分、誤差、保存する数、標準偏差、寄与率）は手で書かず、`svd-math.js` で計算した値を表示しています。
読み上げ原稿（`narration.js`）にも同じ数値を書いているので、例を変えたときは原稿も合わせて直します。
例の画像と点群は説明用に作ったものです（実在のデータではありません）。

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）。

```bash
npm install
node tools/render.mjs info                    # 尺と場面の時刻表
node tools/render.mjs sheet 8 --scene 2V      # 1場面を8コマ並べた確認画像（out/sheet-2V.png）
node tools/render.mjs stills 140,275          # 指定した秒の原寸画像（out/still-<秒>.png）
node tools/render.mjs serve                   # ブラウザで確認するための URL を表示
```

音声つきの動画は、次の順で作ります（声の長さで字幕の時間が変わるため、映像は声を作ったあとに書き出す）。

```bash
node tools/render.mjs voice                   # 原稿を音声にする（narration/clips/）、長さを narration/seconds.js に書く
caffeinate -i node tools/render.mjs video svd --workers 4   # 映像を書き出す（out/svd.mp4 と out/svd-poster.png）
node tools/render.mjs mux svd                 # 音声を字幕の時刻に並べて重ねる（out/svd-voice.mp4）
```

できた `out/svd-voice.mp4` を、親フォルダの `特異値分解_回転・伸縮と低ランク近似.mp4` として置きます。
声は `--voice`、速さは `--rate`（語/分。既定 220）で変えられます。動画全体の速さは `js/engine.js` の `PACE`（既定 1.1）で決まります。

ブラウザで見るときは `serve` が表示する URL を開きます（KaTeX のフォントは `file://` では読めないため）。
`?scene=2V` でその場面から、`?t=140` でその時刻に止めて表示します。再生中はスペースで一時停止、←→ で5秒戻る・進む、[ ] で前・次の場面です。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`（確認画像と書き出し途中のファイル）、`narration/clips/`（音声ファイル）、`node_modules/` は Git に含めません。
- 読み上げは Mac の `say` コマンドを使うため、`voice` は Mac でだけ動きます。読み方は耳では確認していません。違和感があれば `narration.js` を直して `voice` からやり直します。
- `say` は 1.618 や 2.618 のような「1以上で小数点以下が3桁」の数を、千の区切りとみなして「せんろっぴゃくじゅうはち」と読みます。原稿の小数は数字で書かず、「いってんろくいちはち」のようにかなで書きます。
- 書き出しの途中でスリープすると撮影が止まることがあるため、Mac では `caffeinate -i` を付けて実行します。

## 参考文献

- G. Strang, *Introduction to Linear Algebra*, 5th ed., Wellesley-Cambridge Press, 2016（第7章）
- L. N. Trefethen & D. Bau III, *Numerical Linear Algebra*, SIAM, 1997（第4・5講）
- C. Eckart & G. Young, "The approximation of one matrix by another of lower rank," *Psychometrika* 1 (1936) 211–218
- G. Golub & W. Kahan, "Calculating the singular values and pseudo-inverse of a matrix," *SIAM J. Numer. Anal. Ser. B* 2 (1965) 205–224
