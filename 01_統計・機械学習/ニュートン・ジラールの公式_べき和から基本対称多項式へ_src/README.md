# ニュートン・ジラールの公式の解説動画 — 生成元

ニュートン・ジラールの公式を解説する動画 `../ニュートン・ジラールの公式_べき和から基本対称多項式へ.mp4` の生成元です。
加法ガウス過程の動画（`../加法ガウス過程_全次数の交互作用を学ぶカーネル.mp4`）の補足で、指数個の項を足すために使われた公式を詳しく説明します。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、加法ガウス過程の動画と同じです。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` はそこから写しています。

## 構成（18場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに・ポイント | 題名と目次、要点4つ | 4つのカード |
| 1 2つの対称式 | 基本対称多項式 e_n、べき和 s_k、公式 | 4つの数で項を並べる |
| 2 低い次数で確かめる | n = 1, 2, 3, 4 の式 | 和の2乗の正方形（対角線 = s₂、それ以外 = 2e₂） |
| 3 打ち消し合いの証明 | ザイルバーガーの証明（組 A と番号 j の取り替え） | 3変数のタイルが打ち消し合う様子 |
| 4 生成関数の証明 | E(t) の対数微分と係数比較 | 係数の掛け算表の斜めの和 |
| 5 計算の手順と手間 | 手順、掛け算の回数、微分 | 表を順に埋める |
| 6 桁落ち | 交互の和と有効数字、対策 | 次元と相対誤差の実験（整数の正確な値と比べる） |
| 7 多項式の根と行列 | 根のべき和、トレースと固有多項式、歴史 | 方程式を解かずにべき和を求める、トレースから行列式を求める |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `newton-girard.html` | 動画のページ |
| `js/ng-math.js` | 公式、かっこを順に掛ける方法、総当たり、BigInt での正確な値と相対誤差 |
| `js/scenes-proof.js` | はじめに、ポイント、第1〜4章 |
| `js/scenes-use.js` | 第5〜7章、まとめ、おわり（第6章の実験はここで計算する） |
| `js/narration.js` | 読み上げ原稿 |
| `tools/check-math.mjs` | 3通りの計算の一致と、第6章の実験の数値を表示する |

## 数値の確認で分かったこと（第6章）

0〜1 の乱数 z を D 個作り、全次数の e_n を倍精度で計算して、整数の計算で求めた正確な値と比べた（各 D で10回、一番悪い相対誤差）。

| D | 公式（全次数） | かっこを順に掛ける（全次数） | 公式（10次まで） |
|---|---|---|---|
| 10 | 3.4×10⁻¹¹ | 4.4×10⁻¹⁶ | 3.4×10⁻¹¹ |
| 20 | 1.4×10⁻⁴ | 4.7×10⁻¹⁶ | 9.4×10⁻¹⁵ |
| 25 | 5.5 | 5.9×10⁻¹⁶ | 1.8×10⁻¹⁵ |
| 30 | 5.3×10² | 6.6×10⁻¹⁶ | 2.5×10⁻¹⁵ |
| 100 | 2.5×10⁴⁹ | 1.7×10⁻¹⁵ | 9.0×10⁻¹⁶ |

- 公式は交互の和なので、全次数を求めると D = 25 で誤差が 100% を超える。30個の乱数の例では、e₃₀ の真の値 1.7×10⁻¹⁵ に対して公式は −9.9×10⁻¹⁴ となり、符号まで間違えた
- 論文は速さのため10次までに制限している。公式を10次までに限れば、100次元でも誤差は倍精度の限界の近くだった
- かっこを順に掛ける方法は、z が正なら足し算だけなので桁落ちしない。手間も同じ O(DR)
- 第6章の結果は入力が 0〜1 の一様乱数の場合。カーネルの値に当たる z が 1 に近いと、壊れ始める次元はもう少し大きくなる（0.9〜1 の乱数で試すと D = 50 付近）

## 実行方法

```bash
npm install
node tools/check-math.mjs                    # 計算を確かめる
node tools/render.mjs info                   # 尺と場面の時刻表
node tools/render.mjs voice                  # 原稿を音声にする
caffeinate -i node tools/render.mjs video newton-girard --workers 4   # 映像を書き出す
node tools/render.mjs mux newton-girard      # 音声を重ねる（out/newton-girard-voice.mp4）
```

できた `out/newton-girard-voice.mp4` を、親フォルダに置きます。

## 注意事項

- 認証情報や環境変数は使いません。`out/`、`narration/clips/`、`node_modules/` は Git に含めません。
- 読み上げは Mac の `say` を使います。読み方は耳では確認していません。誤読しやすい語は `narration.js` でかなに直しています。

## 参考文献

- A. Girard, *Invention nouvelle en l'algèbre*, 1629
- I. Newton, *Arithmetica Universalis*, 1707
- D. Zeilberger, "A combinatorial proof of Newton's identities," *Discrete Mathematics* 49 (1984) 319
- I. G. Macdonald, *Symmetric Functions and Hall Polynomials*, Oxford University Press
- D. Duvenaud, H. Nickisch, C. E. Rasmussen, "Additive Gaussian processes," *Advances in Neural Information Processing Systems 24* (2011) 226–234
