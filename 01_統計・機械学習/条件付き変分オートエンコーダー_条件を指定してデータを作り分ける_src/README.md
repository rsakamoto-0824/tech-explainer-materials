# 条件付き変分オートエンコーダー（YouTube 向けの解説動画）— 生成元

条件付き変分オートエンコーダー（CVAE）の考え方を、約14分半で解説する動画 `../条件付き変分オートエンコーダー_条件を指定してデータを作り分ける.mp4` の生成元です。
式で確かめる「理論」と、図で確かめる「図解」を交互に進めます。

- 1920×1080、30fps、H.264、字幕と読み上げ音声つき（VOICEVOX:四国めたん、AAC 96kbps・モノラル）、14分32秒
- YouTube 向けの動画なので、Remotion（React で動画を作る道具）で作っています
- 図の数値は、説明用に乱数で作った合成データで、小さな VAE と CVAE を実際に学習させた結果です（実測のデータではありません）

## 読み上げ音声のクレジット（必ず書く）

読み上げ音声には、無料の音声合成ソフト VOICEVOX の「四国めたん」を使っています。
利用規約により、動画を公開するときはクレジットの表記が必要です。動画の最後の画面には入れてあります。**YouTube の説明欄にも、次の1行を書いてください。**

```
VOICEVOX:四国めたん
```

規約は変わることがあるので、公開の前に、VOICEVOX の利用規約（https://voicevox.hiroshiba.jp/term/）と、四国めたんの規約（https://zunko.jp/con_ongen_kiyaku.html）を確認してください。

## 構成（20場面）

| 時刻 | 章 | 理論 | 図解 |
|---|---|---|---|
| 0:00 | はじめに・ポイント | 題名、ポイント3つ | |
| 1:02 | 1 VAE のおさらい | 事前分布・デコーダ・エンコーダ | VAE の構成図 |
| 2:18 | 2 VAE では作り分けられない | | 3つのグループのデータで VAE を試す、VAE の潜在空間 |
| 3:53 | 3 条件 c を入れる | VAE と CVAE の式の対応 | CVAE の構成図、ワンホット表現 |
| 5:28 | 4 何を最大にするのか | 変分下限（ELBO）、再構成の項と KL の項 | KL の項が分布を事前分布へ引き寄せる様子 |
| 7:42 | 5 学習のしかた | 再パラメータ化 | 復元が円弧に合っていく様子、損失の移り変わり |
| 9:35 | ここまでの整理 | | |
| 9:59 | 6 条件を指定して作る | | 条件ごとの生成、潜在空間の比較、z を動かす |
| 12:17 | 7 使いどころと注意 | 条件に使えるもの、注意3つ | |
| 13:46 | まとめ | 要点4つ、参考文献、音声のクレジット | |

上の時刻は、YouTube の説明欄に書く「チャプター」にそのまま使えます。

## ファイル

| ファイル | 役割 |
|---|---|
| `src/script.ts` | 場面の一覧と字幕（読み上げ原稿を兼ねる） |
| `src/timeline.json` | 場面と字幕の開始コマ（`npm run voice` が音声の長さから作る。手で直さない） |
| `src/data.json` | 図に使う数値（`npm run data` が作る。手で直さない） |
| `src/Root.tsx`・`src/Main.tsx` | 動画の登録と、場面の並べ方 |
| `src/Shell.tsx` | 見出し、字幕、進み具合の帯 |
| `src/kit.tsx` | 色、時間の補間、数式、グラフの枠などの小道具 |
| `src/plots.tsx` | 点のグラフ（データの平面、潜在空間）の部品 |
| `src/diagram.tsx` | VAE と CVAE の構成図 |
| `src/scenes/part1〜4.tsx` | 各場面の画面 |
| `tools/make-data.mjs` | 合成データを作り、VAE と CVAE を学習させて、図の数値を計算する |
| `tools/voice.mjs` | 字幕を VOICEVOX で読み上げ、場面ごとの音声と時刻表を作る（読みの直しの一覧もここ） |
| `tools/stills.mjs` | 確認用に、場面の途中のコマを画像にする |

## 例の設定

- **データ**：2次元の点が600個。円弧の形をした3つのグループが、200個ずつ。グループの番号が、条件 c に当たる。乱数の種 11
- **モデル**：エンコーダもデコーダも、中間層32個×2層（tanh）。潜在変数 z は2次元。復元の誤差を測る標準偏差は 0.12
- **学習**：600エポック、1回に100個ずつ、Adam（学習率 0.003）。乱数の種 5
- VAE は、条件 c を入れないこと以外は、CVAE と同じ設定

## 計算で分かったこと

- VAE で z を標準正規分布から450個選んで作ると、グループ1の近くが28%、グループ2が25%、グループ3が32%、どのグループからも外れた点が16%（「近く」は、いちばん近いデータ点までの距離が 0.25 以内）
- VAE の潜在空間では、グループごとの中心が (1.04, 0.52)、(−0.98, 0.72)、(−0.13, −1.11) と分かれた
- CVAE の潜在空間では、グループごとの中心が、3つともほぼ (0, 0)
- CVAE で条件を指定して150個ずつ作ると、3つのグループとも、150個すべてが指定したグループの近くに入った
- CVAE の復元のずれの平均（RMSE）は、学習の前が 2.13、600エポックのあとが 0.12。最後の損失は、再構成の項が 0.51、KL の項が 1.46
- z の成分と「円弧に沿った位置」との対応は、グループごとに違った（グループ1と3は z の1つめ、グループ2は2つめ。グループ3は向きが逆）

## 実行方法

必要なもの: Node.js（24 で確認）、ffmpeg、VOICEVOX（アプリ 0.26.2・エンジン 0.26.1 で確認。https://voicevox.hiroshiba.jp/ から入手する）。

```bash
npm install
```

VOICEVOX を起動してから（アプリを開くだけでよい。このPCの中の `http://127.0.0.1:50021` で読み上げの受付が始まる）、次を実行します。

```bash
npm run data        # 数値を計算して src/data.json に書く（約15秒）
npm run voice       # 四国めたんの音声（public/voice/）と時刻表（src/timeline.json）を作る
npm run dev         # Remotion Studio でプレビューする
node tools/voice.mjs --kana     # VOICEVOX の読み方（カナ）を表示する。読み間違いの点検に使う
node tools/stills.mjs 5V 6V     # 指定した場面の確認画像を out/stills/ に書く
npx remotion render ConditionalVAE out/cvae.mp4   # MP4 に書き出す
```

書き出したままだと音声のデータが大きいので、音声だけ軽くしてから、親フォルダに置きます（映像は変えません）。VOICEVOX の音は小さめなので、ここで音量を 5dB 上げ、音が割れないように上限をかけています。

```bash
ffmpeg -i out/cvae.mp4 -c:v copy -af "volume=5dB,alimiter=limit=0.7:level=false" -c:a aac -b:a 96k -ac 1 -movflags +faststart ../条件付き変分オートエンコーダー_条件を指定してデータを作り分ける.mp4
```

VOICEVOX がないときに画面だけ確かめたい場合は、`node tools/voice.mjs --draft` で、Mac の声（Kyoko）の下書き音声が作れます（完成版には使いません）。

## 注意

- 読み上げの音声（`public/voice/`）はリポジトリに含めていません。はじめに `npm run voice` を実行してください
- 字幕を直したら、`npm run voice` で音声と時刻表を作り直してから書き出します（場面の長さは音声の長さで決まります）
- 字幕の数値は手で書いています。データを作り直したら、`npm run data` の表示と見比べて `src/script.ts` も直します
- 読み上げの読み方は、VOICEVOX が出すカナ（`--kana`）で点検しましたが、耳では確かめていません。話す速さは、標準の 0.95 倍にしています
- 読み上げは、このPCの中の VOICEVOX だけで行います。外部のサービスへ原稿を送りません
- 認証情報は使っていません。環境変数の設定は不要です
- Remotion は、個人と小規模な組織は無料で使えます。会社で使う場合は、ライセンスの条件（https://www.remotion.dev/docs/license）を確認してください

## 参考文献

- D. P. Kingma, M. Welling, Auto-Encoding Variational Bayes, ICLR 2014
- K. Sohn, H. Lee, X. Yan, Learning Structured Output Representation using Deep Conditional Generative Models, NeurIPS 2015
- D. P. Kingma, S. Mohamed, D. J. Rezende, M. Welling, Semi-Supervised Learning with Deep Generative Models, NeurIPS 2014
