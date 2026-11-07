# L-BFGS 法の解説動画 — 生成元

L-BFGS 法を解説する動画 `../L-BFGS法_勾配の履歴で曲がり具合を学ぶ最適化.mp4` の生成元です。
加法ガウス過程の動画（`../加法ガウス過程_全次数の交互作用を学ぶカーネル.mp4`）の補足で、論文が周辺尤度の最大化に使った手法を詳しく説明します。
冒頭で「この動画のポイント」を4つにまとめ、そのあと理論（式）と図解（グラフ）を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（Mac の声 Kyoko、AAC 24kHz・48kbps）
- 作り方は、加法ガウス過程の動画と同じです。`js/engine.js`・`js/kit.js`・`tools/render.mjs`・`css/video.css` はそこから写しています。

## 構成（20場面）

| 章 | 理論 | 図解 |
|---|---|---|
| はじめに・ポイント | 題名と目次、要点4つ | 4つのカードに小さな図 |
| 1 勾配降下法の弱点 | 更新式、条件数 κ、収束の速さ (κ−1)/(κ+1) | 丸い谷と細い谷（κ = 2 と 25）でのジグザグ |
| 2 ニュートン法 | 2次近似、−H⁻¹g、記憶と手間 | 座標変換で谷が丸くなる様子、ローゼンブロック関数 |
| 3 準ニュートン法 | 割線条件 | 勾配の差だけで底へ進む（割線法） |
| 4 BFGS | 更新式、3つの性質 | H の楕円が本当の逆ヘッセ行列に近づく様子 |
| 5 L-BFGS | 記憶 2mn、2ループ再帰 | 6変数で2ループ再帰を実行し、行列の答えやニュートン法の向きと比べる |
| 6 直線探索 | ウルフ条件、y⊤s > 0 の保証 | 実際の1歩での合格の範囲 |
| 7 比較と限界 | 4手法の表、ミニバッチ、L-BFGS-B | ローゼンブロック関数の比較、1000次元で記憶 m を変える |
| 8 ガウス過程の学習 | 周辺尤度の勾配、L-BFGS との相性 | 周辺尤度の最大化を3手法で比べる |
| まとめ・おわり | 要点、参考文献、「おわり」の画面 | |

## ファイル

| ファイル | 役割 |
|---|---|
| `lbfgs.html` | 動画のページ |
| `js/opt-math.js` | 勾配降下法、ニュートン法、BFGS、L-BFGS、強いウルフ条件の直線探索、試す関数（自作の実装） |
| `js/opt-draw.js` | 等高線、経路、行列の楕円、ベクトルの棒 |
| `js/opt-data.js` | `tools/make_data.py` の結果（自動生成） |
| `js/scenes-newton.js` | はじめに、ポイント、第1〜4章 |
| `js/scenes-lbfgs.js` | 第5〜8章、まとめ、おわり |
| `js/narration.js` | 読み上げ原稿 |
| `tools/check-math.mjs` | 計算の確認（2ループ再帰と行列の一致、割線条件など） |
| `tools/make_data.py` | 加法ガウス過程の周辺尤度で手法を比べる（`tools/additive_gp.py` を使う） |

## 数値の確認で分かったこと

- 2ループ再帰の答えは、同じ組から行列で作った H g と 2.6×10⁻¹⁶ の差で一致する。割線条件 H y = s のずれは 6.3×10⁻¹⁷
- ローゼンブロック関数（出発点 (−1.2, 1)、勾配の大きさ 10⁻⁵ まで）の勾配の計算回数は、勾配降下法 6,726、ニュートン法 26、BFGS 64、L-BFGS（m = 5）45
- 1000次元の2次関数（条件数 1万）では、m = 1 で約1200回、m = 10 で約1000回、勾配降下法は約2万回。m の効果はすぐに頭打ちになる
- 加法ガウス過程の周辺尤度（300点、パラメータ14個）で、最適値との差が1未満になるまでの勾配の計算回数は、L-BFGS 18回、BFGS 33回、勾配降下法は300回でも届かなかった。細かい詰めは BFGS のほうが速い
- 反復の回数は、Node.js とブラウザで少し違う（`Math.sin` などの最後の桁が違うため）。動画の数値はブラウザ（書き出しに使う Chrome）の値

## 実行方法

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/make_data.py          # js/opt-data.js を作る（数十秒）
node tools/check-math.mjs                    # 計算を確かめる
node tools/render.mjs info                   # 尺と場面の時刻表
node tools/render.mjs voice                  # 原稿を音声にする
caffeinate -i node tools/render.mjs video lbfgs --workers 4   # 映像を書き出す
node tools/render.mjs mux lbfgs              # 音声を重ねる（out/lbfgs-voice.mp4）
```

できた `out/lbfgs-voice.mp4` を、親フォルダに置きます。

## 注意事項

- 認証情報や環境変数は使いません。`out/`、`narration/clips/`、`node_modules/`、`.venv/` は Git に含めません。
- 読み上げは Mac の `say` を使います。読み方は耳では確認していません。誤読しやすい語は `narration.js` でかなに直しています。

## 参考文献

- J. Nocedal, "Updating quasi-Newton matrices with limited storage," *Mathematics of Computation* 35 (1980) 773–782
- D. C. Liu, J. Nocedal, "On the limited memory BFGS method for large scale optimization," *Mathematical Programming* 45 (1989) 503–528
- R. H. Byrd, P. Lu, J. Nocedal, C. Zhu, "A limited memory algorithm for bound constrained optimization," *SIAM Journal on Scientific Computing* 16 (1995) 1190–1208
- C. Zhu, R. H. Byrd, P. Lu, J. Nocedal, "Algorithm 778: L-BFGS-B," *ACM Transactions on Mathematical Software* 23 (1997) 550–560
- J. Nocedal, S. J. Wright, *Numerical Optimization*, Springer
- D. Duvenaud, H. Nickisch, C. E. Rasmussen, "Additive Gaussian processes," *Advances in Neural Information Processing Systems 24* (2011) 226–234
