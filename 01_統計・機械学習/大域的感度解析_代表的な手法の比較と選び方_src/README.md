# 大域的感度解析の代表的な手法の解説動画（YouTube向け）— 生成元

大域的感度解析の代表的な6つの手法を約15分で解説する動画 `../大域的感度解析_代表的な手法の比較と選び方.mp4` の生成元です。
6つの手法を同じ例題（石上関数）に当てて比べながら、理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき
- 声は VOICEVOX の「四国めたん（ノーマル）」。画面の右下と最後の場面に「VOICEVOX:四国めたん」と表示しています（VOICEVOX の利用規約で必要なクレジット）
- YouTube向けの動画なので、[Remotion](https://www.remotion.dev/) で作っています。仕組み（場面の並べ方、字幕、数式、グラフの部品）は「Sobol感度解析」の動画と同じです

## 構成（18場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに | 題名、ポイント3つ、章の一覧 | 5つの見方（傾き・要素効果・分散・分布・微分）と6つの手法 |
| 1 大域的感度解析と例題 | 局所と大域、共通の手順4つ、目的3つ | 石上関数の散布図と正解（総合効果） |
| 2 回帰と相関で測る | SRC、ΣSRC² = R²、PRCC | 回帰直線、R² = 0.20、PRCC でも X₂・X₃ を拾えない |
| 3 Morris法でふるい分ける | 要素効果、道のり、計算回数 r(d+1)、μ* と σ | 2入力の道のり、μ*–σ の図 |
| 4 分散で測る：Sobol法とFAST | 一次効果・総合効果、Sobol法、FAST の探索曲線と周波数 | eFAST の入力の波・出力の波・周波数の成分、eFAST と Sobol法の結果 |
| 5 分布で測る：PAWNとδ | 分散で捉えきれない例、Borgonovo の δ、PAWN（KS距離） | X₃ で分けた累積分布、KS距離の中央値 |
| 6 微分で測る：DGSM | ν = E[(∂f/∂x)²]、総合効果の上限、Morris法との関係 | 6入力の例での上限、石上関数では上限が1を超える |
| 7 手法の選び方 | 比較の表、使い分けの流れ、相関がある入力 | 石上関数での6手法の結果を1つの表に |
| まとめ | まとめ、参考文献 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `src/script.ts` | 台本（場面ごとの字幕）、章の一覧、読み間違えやすい語の置きかえ、参考文献 |
| `src/timings.json` | 行ごとの声の開始時刻と長さ（`tools/voice.ts` が書く） |
| `src/timeline.ts` | 声の長さから、場面と行の開始コマを決める |
| `src/theme.ts` | 色、文字、大きさ |
| `src/lib/sobol.ts` | 石上関数とその正確な指数、乱数、Sobol列、Sobol法の推定 |
| `src/lib/gsa.ts` | 回帰・相関（SRC・PRCC）、Morris法、eFAST、PAWN、DGSM の計算と、6入力の例 |
| `src/lib/data.ts` | 画面に出す例のデータ（種を固定した乱数で作る） |
| `src/lib/precomputed.json` | 6つの手法を石上関数に当てた結果（`tools/precompute.ts` が書く） |
| `src/components/` | 共通の部品（背景・見出し・字幕・クレジット、数式、グラフ） |
| `src/scenes/` | 場面の画面（`intro` はじめに・1章、`screening` 2・3章、`distribution` 4・5章、`practice` 6・7章・まとめ） |
| `tools/voice.ts` | 台本を VOICEVOX で音声にする。読み（カナ）を `narration/kana.txt` に書き出す |
| `tools/precompute.ts` | 6つの手法の計算（1秒かからない） |
| `tools/numbers.ts` | 台本に書く数値を表示する |
| `tools/chapters.ts` | YouTube の概要欄に貼る章の時刻を表示する |
| `tools/sheet.sh` / `tools/frames.ts` | 場面の確認画像を作る |
| `tools/check-captions.ts` | 字幕が2行に収まるかを調べる |
| `youtube-description.txt` | YouTube の概要欄の文案（章の時刻、参考文献、クレジット） |

## 例のデータと数値

- 石上関数 Y = sin X₁ + 7 sin² X₂ + 0.1 X₃⁴ sin X₁（入力は −π〜π の一様分布）。正確な値は、一次効果 0.31・0.44・0、総合効果 0.56・0.44・0.24
- 計算回数は、手法ごとによく使う大きさにしています

| 手法 | 計算回数 | X₁ | X₂ | X₃ |
|---|---|---|---|---|
| 回帰（SRC）、R² = 0.20 | 1000 | 0.45 | 0.01 | 0.00 |
| 順位相関（PRCC） | 1000 | 0.47 | 0.00 | 0.01 |
| Morris法 μ*（σ）、50本・4段 | 200 | 8.7（6.2） | 7.9（7.9） | 4.7（7.7） |
| eFAST 一次効果／総合効果（M = 4） | 513 × 3 | 0.31／0.53 | 0.44／0.49 | 0.03／0.24 |
| Sobol法 一次効果／総合効果（Sobol列） | 1024 × 5 | 0.33／0.56 | 0.44／0.44 | 0.02／0.24 |
| PAWN（KS距離の中央値、10区間） | 2000 | 0.26 | 0.34 | 0.10 |
| DGSM の総合効果の上限（差分） | 512 × 4 | 2.2 | 7.1 | 3.2 |

- DGSM の6入力の例 Y = 2X₁ + 1.5X₂ + 3X₁X₃ + 0.3X₄ + 0.1X₅ + 0.1X₆（入力は −1〜1 の一様分布）。上限は 0.90・0.29・0.39・0.012・0.001・0.001、総合効果は 0.75・0.24・0.32・0.010・0.001・0.001
- eFAST の値は、周波数の干渉で正確な値から少しずれます（X₂ の総合効果 0.49 など）。DGSM の石上関数の値は、式から求めた値（2.23・7.08・3.17）とほぼ一致します
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
npm run precompute               # 6つの手法の計算
npm run voice                    # 台本を音声にする（public/voice/）、長さを src/timings.json に書く
caffeinate -i npm run render     # 書き出す（out/global-sensitivity.mp4）
node tools/chapters.ts           # 概要欄に貼る章の時刻
```

できた `out/global-sensitivity.mp4` を、親フォルダの `大域的感度解析_代表的な手法の比較と選び方.mp4` として置きます。

## 読み方の確かめ方

VOICEVOX は、声を作る前に読み（カナとアクセント）を返します。`npm run voice` のあと `narration/kana.txt` を見ると、耳で聞かずに読み間違いを探せます。
この動画では「値」が「ね」、「決定係数」が「けっていがかりすう」、「少し上」が「しょうしじょう」と読まれていたので、`src/script.ts` の `READINGS` と原稿で直しています。

## 注意事項

- 認証情報や環境変数は使いません。
- `out/`、`public/voice/`、`narration/clips/`、`narration/kana.txt`、`node_modules/` は Git に含めません。
- 場面の長さと動きの時刻は、読み上げの長さから計算しています。直すときは台本（`src/script.ts`）か場面のファイルを書きかえます。
- 読み方は耳では確認していません（読みのカナで確認）。
- VOICEVOX の音声を使うときは、クレジット「VOICEVOX:四国めたん」の表示が必要です。YouTube の概要欄にも書きます。
- Remotion は、個人と小さな組織は無料で使えますが、会社で使う場合はライセンスの確認が必要です（https://www.remotion.dev/docs/license）。
- メモリが 8GB の Mac では、書き出しは2並列にします。

## 参考文献

`src/script.ts` の `REFERENCES` と同じです。

- A. Saltelli et al., *Global Sensitivity Analysis: The Primer*, Wiley, 2008
- T. Ishigami, T. Homma, "An importance quantification technique in uncertainty analysis for computer models", *Proc. ISUMA '90*, 398–403, 1990
- M. D. Morris, "Factorial sampling plans for preliminary computational experiments", *Technometrics* 33(2), 161–174, 1991
- F. Campolongo, J. Cariboni, A. Saltelli, "An effective screening design for sensitivity analysis of large models", *Environmental Modelling & Software* 22, 1509–1518, 2007
- R. I. Cukier et al., "Study of the sensitivity of coupled reaction systems to uncertainties in rate coefficients. I Theory", *Journal of Chemical Physics* 59, 3873–3878, 1973
- A. Saltelli, S. Tarantola, K. P.-S. Chan, "A quantitative model-independent method for global sensitivity analysis of model output", *Technometrics* 41(1), 39–56, 1999
- I. M. Sobol', "Global sensitivity indices for nonlinear mathematical models and their Monte Carlo estimates", *Mathematics and Computers in Simulation* 55, 271–280, 2001
- E. Borgonovo, "A new uncertainty importance measure", *Reliability Engineering & System Safety* 92, 771–784, 2007
- F. Pianosi, T. Wagener, "A simple and efficient method for global sensitivity analysis based on cumulative distribution functions", *Environmental Modelling & Software* 67, 1–11, 2015
- I. M. Sobol', S. Kucherenko, "Derivative based global sensitivity measures and their link with global sensitivity indices", *Mathematics and Computers in Simulation* 79, 3009–3017, 2009
- A. B. Owen, "Sobol' indices and Shapley value", *SIAM/ASA Journal on Uncertainty Quantification* 2, 245–251, 2014
- J. Herman, W. Usher, "SALib: An open-source Python library for sensitivity analysis", *Journal of Open Source Software* 2(9), 97, 2017
