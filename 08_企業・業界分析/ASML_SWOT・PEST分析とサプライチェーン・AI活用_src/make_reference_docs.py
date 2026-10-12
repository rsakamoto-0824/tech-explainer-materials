"""references.json から、参考文献リンク.md・メール添付用の一覧・Zotero 登録用の zotero/manifest.json を作る。

- 参考文献リンク.md：人が読む一覧（本文を保存した資料／取得できなかった資料と理由）
- 参考文献リンク_一覧.txt：メール添付用の短い一覧（番号・発行元・日付・題名・URL）
- zotero/manifest.json：zotero/zotero_import_asml.js が読む登録一覧
  - 本文を保存した資料を登録する（取得できなかった資料は登録しない）
  - Import-ID は保存したファイルの内容の SHA-256 から作るので、何度作っても同じ値になる

使い方: python3 make_reference_docs.py
"""

import hashlib
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REFERENCES_PATH = BASE_DIR / "references.json"
LINKS_PATH = BASE_DIR / "参考文献リンク.md"
MAIL_LIST_PATH = BASE_DIR / "参考文献リンク_一覧.txt"
MANIFEST_PATH = BASE_DIR / "zotero" / "manifest.json"
DECK_NAME = "ASML_SWOT・PEST分析とサプライチェーン・AI活用.pptx"
DECK_SLIDES = 34
TOPIC = "ASMLのSWOT・PEST分析とサプライチェーン・AI活用"
CASE_COLLECTION = "2026-10-10_ASML分析"
THEME_COLLECTION = "05_資料"
UNREAD_TAG = "未読"
BASE_TAGS = ["種別/資料", "分野/リソグラフィ"]
IMPORT_ID_PREFIX = "asml-swot"
OBSIDIAN_NOTE = "/Users/sakamoto/07_文書作成/my-obsidian/Pages/ASML SWOT・PEST分析 サプライチェーン・AI活用 参考情報-20261010104301.md"
GMAIL_SUBJECT = "調査報告 2026-10-10 ASMLのSWOT・PEST分析とサプライチェーン・AI活用 参考文献・リンク"
REPORT_TYPES = {
    "asml_q4_2025_pr": "決算発表（プレスリリース）",
    "asml_q1_2026_pr": "決算発表（プレスリリース）",
    "asml_q2_2026_pr": "決算発表（プレスリリース）",
    "asml_ar2025_strategic": "年次報告書（戦略報告の章）",
    "asml_ar2025_esef": "年次報告書（全文、ESEF形式）",
    "asml_call_q2_2026": "決算説明会の書き起こし",
}
PRESENTATION_TYPE = "投資家向け資料"


def load_references():
    data = json.loads(REFERENCES_PATH.read_text(encoding="utf-8"))
    for ref in data["references"]:
        for file in ref["files"]:
            if not (BASE_DIR / file).exists():
                raise SystemExit(f"references.json のファイルが見つかりません: {file}")
        if ref["status"] == "saved" and not ref["files"]:
            raise SystemExit(f"保存済みなのにファイルがありません: {ref['key']}")
        if ref["status"] != "saved" and not ref.get("reason"):
            raise SystemExit(f"取得できなかった理由がありません: {ref['key']}")
    return data


def import_id(ref):
    digest = hashlib.sha256((BASE_DIR / ref["files"][0]).read_bytes()).hexdigest()
    return f"{IMPORT_ID_PREFIX}:{digest}"


def zotero_record(ref, checked_on):
    fields = {"url": ref["url"], "accessDate": checked_on}
    if ref["itemType"] == "report":
        fields["institution"] = ref["publisher"]
        if ref["key"] in REPORT_TYPES:
            fields["reportType"] = REPORT_TYPES[ref["key"]]
    elif ref["itemType"] == "presentation":
        # Zotero の「発表」には発行元の欄が無いので、種類の欄に発行元も書く
        fields["presentationType"] = f"{PRESENTATION_TYPE}（{ref['publisher']}）"
    else:
        fields["websiteTitle"] = ref["publisher"]
    tags = list(BASE_TAGS)
    if ref["affiliation"]:
        tags.append(f"所属/{ref['affiliation']}")
    return {
        "key": ref["key"],
        "itemType": ref["itemType"],
        "title": ref.get("zoteroTitle", ref["title"]),
        "collection": THEME_COLLECTION,
        "tags": tags,
        "creators": [],
        "date": ref["date"],
        "fields": fields,
        "files": ref["files"],
        "importId": import_id(ref),
    }


def write_manifest(data):
    records = [zotero_record(ref, data["checked_on"]) for ref in data["references"] if ref["status"] == "saved"]
    manifest = {
        "base": str(BASE_DIR),
        "case_collection": CASE_COLLECTION,
        "unread_tag": UNREAD_TAG,
        "items": records,
        "existing_references": [],
    }
    MANIFEST_PATH.parent.mkdir(exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n_files = sum(len(r["files"]) for r in records)
    print(f"zotero/manifest.json：{len(records)} 件（添付ファイル {n_files} 個）")
    return records


def reference_line(ref):
    return f"- {ref['publisher']}（{ref['dateLabel']}）「{ref['title']}」 — {ref['note']}\n  {ref['url']}"


def write_links(data, n_zotero):
    refs = data["references"]
    saved = [r for r in refs if r["status"] == "saved"]
    missing = [r for r in refs if r["status"] != "saved"]
    lines = [
        f"# {TOPIC} ― 参考文献・リンク",
        "",
        f"資料：`../{DECK_NAME}`（{DECK_SLIDES}枚）  ",
        f"確認日：{data['checked_on']}（{data['note']}）  ",
        "このファイルは `make_reference_docs.py` が `references.json` から作る。直すときは references.json を直して作り直す。",
        "",
        f"## 1. 本文を保存した資料（{len(saved)}件、`sources/` に保存）",
        "",
    ]
    for ref in saved:
        lines.append(reference_line(ref))
        for file in ref["files"]:
            lines.append(f"  → `{file}`")
    lines += [
        "",
        f"## 2. 取得できなかった資料（{len(missing)}件）",
        "",
    ]
    for ref in missing:
        lines.append(reference_line(ref))
        lines.append(f"  → 取得できず（確認日 {data['checked_on']}）。理由：{ref['reason']}")
    n_files = sum(len(r["files"]) for r in saved)
    lines += [
        "",
        "## 3. Zotero・Obsidian・Gmail への反映",
        "",
        f"- Zotero：`zotero/` のスクリプトで {n_zotero} 件を登録する（1章の資料。2章の資料は登録しない）。"
        f"新規登録分には「{UNREAD_TAG}」タグを付け、案件コレクション `{CASE_COLLECTION}` とテーマのコレクション `{THEME_COLLECTION}` に入れる。"
        "Zotero の画面での操作が必要なため未実行。手順は `zotero/README.md`",
        f"- Obsidian：参考情報と未取得文献を `{OBSIDIAN_NOTE}` に記録した",
        f"- Gmail：件名「{GMAIL_SUBJECT}」の未送信の下書き（宛先なし）に、`{MAIL_LIST_PATH.name}`（番号・発行元・日付・題名・URLだけの短い一覧）を添付した。"
        f"このファイル（説明つきの一覧）と本文ファイル（{n_files}個）は、下書き作成の仕組みではファイルを文字データに変換して渡す必要があり、容量の都合で添付していない（`sources/` に保存）",
        "",
    ]
    LINKS_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"参考文献リンク.md：保存 {len(saved)} 件・未取得 {len(missing)} 件")


def write_mail_list(data):
    """メール添付用の短い一覧（番号・発行元・日付・題名・URL と取得状況だけ）。添付の容量を小さくするため説明とファイル名は省く"""
    lines = [
        f"{TOPIC} 参考文献・リンク一覧",
        f"確認日 {data['checked_on']}。説明・保存ファイル名・未取得の理由は 参考文献リンク.md を参照",
        "",
    ]
    for no, ref in enumerate(data["references"], start=1):
        status = "" if ref["status"] == "saved" else "（未取得）"
        lines.append(f"[{no}] {ref['publisher']}（{ref['dateLabel']}）{ref['title']}{status}")
        lines.append(f"    {ref['url']}")
    MAIL_LIST_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{MAIL_LIST_PATH.name}：{len(data['references'])} 件（{MAIL_LIST_PATH.stat().st_size:,} bytes）")


def main():
    data = load_references()
    records = write_manifest(data)
    write_links(data, len(records))
    write_mail_list(data)


if __name__ == "__main__":
    main()
