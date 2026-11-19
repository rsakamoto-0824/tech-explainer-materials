# Sobol感度解析の解説動画（YouTube向け）— 生成元

Sobol感度解析を約14分半で解説する動画 `../Sobol感度解析_出力のばらつきを入力ごとに分ける.mp4` の生成元です。
「出力の分散を、入力ごと・組み合わせごとの寄与に分ける」という1本の筋で、理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき
- 声は VOICEVOX の「四国めたん（ノーマル）」。画面の右下と最後の場面に「VOICEVOX:四国めたん」と表示しています（VOICEVOX の利用規約で必要なクレジット）
- YouTube向けの動画なので、[Remotion](https://www.remotion.dev/) で作っています。仕組み（場面の並べ方、字幕、数式、グラフの部品）はガウシアンコピュラの動画と同じです

## 構成（18場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名、ポイント3つ、章の一覧 | 出力の分散が入力ごとに分かれる帯 |
| 1 1つずつ動かす方法の落とし穴 | 局所感度と大域的感度 | Y = X₁X₂ では1つずつ動かすと効果ゼロ、同時に動かすとばらつく |
| 2 分散で測る一次効果 | 条件付き期待値、一次効果、全分散の公式、Y = 2X₁ + X₂ の例 | 石上関数の散布図と区間ごとの平均 |
| 3 分散分解 | Sobol分解、分散分解、項の数 2^d − 1 | 分散の内訳の帯（石上関数、X₁X₂） |
| 4 総合効果と交互作用 | 総合効果の定義、固定してよい入力、差＝交互作用 | 一次効果と総合効果の棒グラフ |
| 5 推定のしかた | 行列 A・B と列の入れかえ、Saltelli と Jansen の式、計算回数 N(d+2) | 8行の行列で列を入れかえ、出力を比べる |
| 6 精度を上げる工夫と注意点 | Sobol列、ブートストラップ、負の推定値、独立の前提 | 乱数と Sobol列の点、推定の収束（20回ずつ）、信頼区間 |
| 7 実務での使い方 | 手順5つ、代わりのモデル、SALib | 一次効果×総合効果の図で読む（入力6つの例） |
| まとめ | まとめ、参考文献 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `src/script.ts` | 台本（場面ごとの字幕）、章の一覧、読み間違えやすい語の置きかえ、参考文献 |
| `src/timings.json` | 行ごとの声の開始時刻と長さ（`tools/voice.ts` が書く） |
| `src/timeline.ts` | 声の長さから、場面と行の開始コマを決める |
| `src/theme.ts` | 色、文字、大きさ |
| `src/lib/sobol.ts` | 計算（石上関数とその正確な指数、乱数、Sobol列、指数の推定） |
| `src/lib/data.ts` | 画面に出す例のデータ（種を固定した乱数で作る） |
| `src/lib/precomputed.json` | 推定の収束と信頼区間（`tools/precompute.ts` が書く） |
| `src/components/` | 共通の部品（背景・見出し・字幕・クレジット、数式、グラフ） |
| `src/scenes/` | 場面の画面（`intro` はじめに・1章、`variance` 2・3章、`estimation` 4・5章、`practice` 6・7章・まとめ） |
| `tools/voice.ts` | 台本を VOICEVOX で音声にする。読み（カナ）を `narration/kana.txt` に書き出す |
| `tools/precompute.ts` | 推定の収束（乱数と Sobol列、各20回）とブートストラップの信頼区間を計算する |
| `tools/numbers.ts` | 台本に書く数値を表示する |
| `tools/chapters.ts` | YouTube の概要欄に貼る章の時刻を表示する |
| `tools/sheet.sh` / `tools/frames.ts` | 場面の確認画像を作る |
| `tools/check-captions.ts` | 字幕が2行に収まるかを調べる |
| `youtube-description.txt` | YouTube の概要欄の文案（章の時刻、参考文献、クレジット） |

## 例のデータと数値

- 石上関数 Y = sin X₁ + 7 sin² X₂ + 0.1 X₃⁴ sin X₁（入力は −π〜π の一様分布）。正確な値は、一次効果 0.314・0.442・0、総合効果 0.558・0.442・0.244（X₁ と X₃ の交互作用 0.244）
- 散布図は2000点、24区間の平均から求めた一次効果は 0.33・0.47・0.01（点の数が限られるので少し大きめに出る）
- 推定の収束は、X₃ の総合効果を N = 16〜8192 で各20回。N = 1024 の誤差（2乗平均の平方根、200回）は乱数 0.012、Sobol列 0.002（約6分の1）
- N = 4096（Sobol列）のブートストラップ（1000回）の95%信頼区間は、X₃ の総合効果 0.243 [0.231, 0.257]、一次効果 −0.002 [−0.030, 0.028]
- 第7章の例 Y = 2X₁ + 1.5X₂ + 3X₁X₃ + 0.3X₄ + 0.1X₅ + 0.1X₆（入力は −1〜1 の一様分布）。X₄〜X₆ の総合効果の合計は約1%
- 推定の式は、一次効果が Saltelli (2010)、総合効果が Jansen (1999)。出力の平均を引いてから使う
- Sobol列は Joe & Kuo の方向数（6次元まで）。20回のくり返しには、桁をずらす（デジタルシフト）方法を使っています
- 画面の数値は計算した値を表示しています。台本（`src/script.ts`）にも同じ数値を書いているので、データを変えたら `node tools/numbers.ts` の結果に合わせて台本も直します

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、VOICEVOX（0.26 で確認。起動しておくと http://127.0.0.1:50021 で待ち受ける）。

```bash
npm install
npm run dev                      # プレビュー（Remotion Studio）を開く
node tools/check-captions.ts     # 字幕が2行に収まるかを調べる
tools/sheet.sh S2V               # 場面の確認画像（out/sheet-S2V.png）
```

動画は、次の順で作ります（声の長さで場面の長さが決まるため、先に声を作る）。

```bash
npm run precompute               # 推定の収束と信頼区間（約20秒）
npm run voice                    # 台本を音声にする（public/voice/）、長さを src/timings.json に書く
caffeinate -i npm run render     # 書き出す（out/sobol-sensitivity.mp4）
node tools/chapters.ts           # 概要欄に貼る章の時刻
```

できた `out/sobol-sensitivity.mp4` を、親フォルダの `Sobol感度解析_出力のばらつきを入力ごとに分ける.mp4` として置きます。

## 読み方の確かめ方

VOICEVOX は、声を作る前に読み（カナとアクセント）を返します。`npm run voice` のあと `narration/kana.txt` を見ると、耳で聞かずに読み間違いを探せます。
この動画では「値」が「ね」、「行」が「くだり」、「負」が「まけ」と読まれていたので、`src/script.ts` の `READINGS` で直しています。
「行列」をカタカナにすると区切りがおかしくなったので、「行」は語ごとに直しています（「行列」「行う」はそのままで正しく読まれる）。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`、`public/voice/`、`narration/clips/`、`narration/kana.txt`、`node_modules/` は Git に含めません。
- 場面の長さと動きの時刻は、読み上げの長さから計算しています。そのため、Remotion Studio の画面で時刻を直接動かす編集には向きません。直すときは台本（`src/script.ts`）か場面のファイルを書きかえます。
- 読み方は耳では確認していません（読みのカナで確認）。
- VOICEVOX の音声を使うときは、クレジット「VOICEVOX:四国めたん」の表示が必要です。YouTube の概要欄にも書きます。
- Remotion は、個人と小さな組織は無料で使えますが、会社で使う場合はライセンスの確認が必要です（https://www.remotion.dev/docs/license）。
- メモリが 8GB の Mac では、書き出しは2並列にします。

## 参考文献

`src/script.ts` の `REFERENCES` と同じです。

- I. M. Sobol', "Global sensitivity indices for nonlinear mathematical models and their Monte Carlo estimates", *Mathematics and Computers in Simulation* 55, 271–280, 2001
- T. Ishigami, T. Homma, "An importance quantification technique in uncertainty analysis for computer models", *Proc. ISUMA '90*, 398–403, 1990
- M. J. W. Jansen, "Analysis of variance designs for model output", *Computer Physics Communications* 117, 35–43, 1999
- A. Saltelli et al., "Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index", *Computer Physics Communications* 181, 259–270, 2010
- A. Saltelli et al., *Global Sensitivity Analysis: The Primer*, Wiley, 2008
- S. Joe, F. Y. Kuo, "Constructing Sobol sequences with better two-dimensional projections", *SIAM Journal on Scientific Computing* 30, 2635–2654, 2008
- J. Herman, W. Usher, "SALib: An open-source Python library for sensitivity analysis", *Journal of Open Source Software* 2(9), 97, 2017
