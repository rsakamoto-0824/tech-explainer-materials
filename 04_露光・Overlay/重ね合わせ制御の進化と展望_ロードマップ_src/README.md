# 重ね合わせ（Overlay）制御の進化と展望 ロードマップの生成元

`../重ね合わせ制御の進化と展望_ロードマップ.pptx`（28枚・全スライドに発表者ノート付き）を作るためのファイル一式。

## 目的

半導体リソグラフィーの重ね合わせ制御について、1960年代から2025年までの進化を5つの時代で整理し、2026〜2035年の展望をロードマップとしてまとめる。

## ファイル

| ファイル | 役割 |
|---|---|
| `build_deck.js` | pptxgenjs でスライドを組み立てる。数値と出典はすべてこの中に直接書いてある |
| `postprocess.py` | フォント指定の修正（和文 BIZ UDGothic・欧文 Arial、日本語の文字セット）、段落プロパティの重複削除、ノートマスターと Content_Types の正規化、図形IDの振り直し、不正な線種の検査、ZIP の再圧縮 |
| `check_deck.py` | 生成物の機械検査（Content_Typesの部品の実在、全スライドのノート、文字セット、線種、図形のはみ出し、仮置きの文字、外部リンク数） |
| `参考文献リンク.md` | 参考文献・参考リンクの一覧（取得状況つき） |
| `sources/` | 本文を取得した公開資料（PDF）と、Webページの保存（`sources/web/`、HTML） |
| `zotero/` | 参考文献を Zotero に登録するスクリプトと一覧。実行手順は `zotero/README.md` |

## 作り直す手順

Node.js に `pptxgenjs`（4.0.1）、Python 3 に `python-pptx` が入っている前提。このフォルダで実行する。

```bash
NODE_PATH="$(npm root -g)" node build_deck.js deck_raw.pptx
python3 postprocess.py deck_raw.pptx deck.building.pptx
python3 check_deck.py deck.building.pptx 28
```

pptx スキルの `validate.py` での検証、LibreOffice での全スライドの表示確認、PowerPoint での再オープン確認が済んでから、`deck.building.pptx` を `../重ね合わせ制御の進化と展望_ロードマップ.pptx` へ移す。PowerPoint で開いている間は上書きしない。

## 注意

- 数値はすべて公開資料からの引用（確認日 2026-09-26）。装置の値（号機間 MMO・同一チャック DCO など）と、製品上の要求値（ウェハ上の3σ）は定義が違うので、スライド5では目安として同じ図に載せている
- スライド5のグラフは、対数目盛りの目盛りを読みやすくするため、PowerPoint のグラフ機能ではなく図形で描いている。値を変えるときは `build_deck.js` の `itrs2007`・`irds2021`・`tools` の配列を直す
- 2028年以降の内容（スライド4の右端の列、スライド23）は、各社の計画・論文の見通しを含む。「※本資料の予測」と書いた項目は出典の傾向からの整理で、出典そのものの記載ではない
- 1988年のEGA論文（Slonaker et al.）などSPIEの一部の論文は本文を取得できず、書誌と要旨で確認した（`参考文献リンク.md` の3章）
- 社内の情報は使っていない。論文は手元の論文ライブラリ（Zotero登録済み）の公開論文を参照した
