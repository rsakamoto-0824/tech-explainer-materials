# ガウス過程回帰の解説動画（加法カーネル・周期カーネル）— 生成元

ガウス過程回帰（GPR）を基礎から発展まで解説する動画 `../ガウス過程回帰_加法カーネルと周期カーネル.mp4` の生成元です。
理論（式）と図解（グラフ）を交互に進め、後半で加法カーネルと周期カーネルの具体的な計算を扱います。

- 1920×1080、30fps、H.264、約22分、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 48kbps）
- 作り方はスキル「動く構成図（animated-arch-diagram）」の録画方式を使っています。時刻 t を入れると必ず同じ絵が出るページを作り、ヘッドレス Chrome で1コマずつ撮って ffmpeg で MP4 にします。

## 構成（26場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名と目次 | |
| 1 ガウス過程とは | GP の定義、有限個の点は多変量正規分布 | 2点の相関（楕円）→ 点を増やすと関数になる |
| 2 RBF カーネル | 式、σ_f² と ℓ、数値の表、3×3 の行列 | 6×6 行列を埋める、ℓ を変えたときの行列とサンプル |
| 3 予測の式 | 条件付き正規分布、μ*・σ*²・α | データを1点ずつ足す |
| 3 3点で計算 | K+σ²I、α、k*、μ*、σ*² を数値で | 予測平均 ＝ α_i k(x, x_i) の山の重ね合わせ |
| 4 周辺尤度 | 当てはまり・複雑さの罰則・最大化 | ℓ を動かしたときの2つの項と予測 |
| 5 組み合わせ規則 | 和と積は正定値、和＝独立な部品の足し算 | 4種類のカーネルの形とサンプル |
| 6 周期カーネル | 円への写像からの導出 | x 軸を円柱に巻きつける（らせん → 円）、弦の長さと k |
| 6 数値で計算 | r ごとの表、ℓ の影響、行が重なり det K = 0 | 行列の縞、サンプル、外挿（RBF との比較） |
| 7 加法カーネル① | 共分散の展開、トレンド＋季節の数値表 | K₁ + K₂ = K、サンプルの足し算 |
| 7 予測の分解 | 共通の α、部品ごとの平均・分散・事後共分散 | トレンドと季節への分解、RBF だけとの比較 |
| 8 加法カーネル② | 入力次元ごとの和と積、数値の比較 | 十字形と丸、格子柄のサンプル、L 字データからの予測 |
| 9 積カーネル | 局所周期、和との使い分け | 周期だけ・和・積のサンプル |
| まとめ | 要点、実務の注意、参考文献 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `gpr.html` | 動画のページ（ブラウザで開くと再生できる） |
| `js/kit.js` | 色、時間の補間、グラフの枠、ヒートマップ、数値の書式 |
| `js/gp-math.js` | GP の計算（カーネル、コレスキー分解、予測、周辺尤度、サンプル）。乱数は種を固定 |
| `js/scenes-basic.js` | 基礎編の場面（はじめに、第1〜4章） |
| `js/scenes-kernel.js` | 発展編の場面（第5〜10章） |
| `js/narration.js` | 字幕ごとの読み上げ原稿（数式は読み方に直し、読み間違えやすい漢字はかなで書く） |
| `narration/seconds.js` | 字幕ごとの声の長さ（`voice` で自動生成）。声が字幕の時間より長いと、その字幕を延ばす |
| `js/engine.js` | 場面の一覧を時刻 t の絵にする（字幕、見出し、進み具合の帯） |
| `css/video.css` | 画面の見た目 |
| `tools/render.mjs` | 書き出し（スキルの render.mjs を元に、並列の書き出し・場面ごとの確認・http サーバーを追加） |

表や字幕に出す数値（α、μ*、σ*²、カーネルの値、行列式など）は手で書かず、`gp-math.js` で計算した値を表示しています。
例に使ったデータ（真の関数とノイズ）は説明用に作ったものです。

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、Google Chrome（ヘッドレスで使う）。

```bash
npm install
node tools/render.mjs info                    # 尺と場面の時刻表
node tools/render.mjs sheet 8 --scene 6V      # 1場面を8コマ並べた確認画像（out/sheet-6V.png）
node tools/render.mjs stills 660,1104         # 指定した秒の原寸画像（out/still-<秒>.png）
node tools/render.mjs video gpr --workers 4   # 書き出し（out/gpr.mp4 と out/gpr-poster.png）
node tools/render.mjs serve                   # ブラウザで確認するための URL を表示
```

音声つきの動画は、次の順で作ります（声の長さで字幕の時間が変わるため、映像は声を作ったあとに書き出す）。

```bash
node tools/render.mjs voice                   # 原稿を音声にする（narration/clips/）、長さを narration/seconds.js に書く
caffeinate -i node tools/render.mjs video gpr --workers 4   # 新しい時間割で映像を書き出す
node tools/render.mjs mux gpr                 # 音声を字幕の時刻に並べて重ねる（out/gpr-voice.mp4）
```

声は `--voice`、速さは `--rate`（語/分。既定 200、Mac の標準は 180）で変えられます。
高音質の声（Kyoko や Otoya の「拡張」「プレミアム」）を使うときは、システム設定の［アクセシビリティ］→［読み上げコンテンツ］→［システムの声］→［声を管理］で追加してから、`say -v '?'` に出る名前を `--voice` に渡し、上の3つをやり直します。

ブラウザで見るときは `serve` が表示する URL を開きます（KaTeX のフォントは `file://` では読めないため）。
`?scene=6V` でその場面から、`?t=660` でその時刻に止めて表示します。再生中はスペースで一時停止、←→ で5秒戻る・進む、[ ] で前・次の場面です。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`（確認画像と書き出し途中のファイル）、`narration/clips/`（音声ファイル）、`node_modules/` は Git に含めません。
- 読み上げは Mac の `say` コマンドを使うため、`voice` は Mac でだけ動きます。
- 書き出しは Mac（8コア、4並列）で約18〜30分かかりました（39,631コマ。音声つき MP4 は約46MB）。`--workers` で並列の数を変えられます。
- 書き出しの途中でスリープすると撮影が止まることがあるため、Mac では `caffeinate -i node tools/render.mjs video gpr --workers 4` のように実行します。

## 参考文献

- C. E. Rasmussen & C. K. I. Williams, *Gaussian Processes for Machine Learning*, MIT Press, 2006（第2章、第4章、第5.4.3節）
- D. Duvenaud, H. Nickisch & C. E. Rasmussen, "Additive Gaussian Processes," NeurIPS 2011
- D. Duvenaud, *Automatic Model Construction with Gaussian Processes*, PhD thesis, University of Cambridge, 2014
