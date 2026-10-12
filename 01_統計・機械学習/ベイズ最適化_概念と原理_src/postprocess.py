"""pptxgenjs の出力を整える後処理（ベイズ最適化資料用）。

1. フォント指定を直す（和文 BIZ UDGothic は日本語の文字セット、欧文は Arial）
2. 1つの段落に重複して書かれた段落プロパティ <a:pPr> を先頭の1つだけ残す
3. グラフの空欄の点（値なし）を取り除く（散布図・折れ線で系列ごとに点を分けるため）
4. ZIP を DEFLATE で再圧縮する（pptxgenjs は無圧縮で書き出すため）

使い方: python postprocess.py <入力.pptx> <出力.pptx>
"""

import re
import sys
import zipfile
from pathlib import Path

JAPANESE_FONT = "BIZ UDGothic"
LATIN_FONT = "Arial"
CODE_FONT = "Courier New"
JAPANESE_CHARSET = "-128"

FONT_TRIPLE = re.compile(
    r'<a:latin typeface="(?P<face>[^"]+)"[^>]*/>'
    r'(?:\s*<a:ea typeface="[^"]*"[^>]*/>)?'
    r'(?:\s*<a:cs\s+typeface="[^"]*"[^>]*/>)?'
)
EMPTY_CHART_POINT = re.compile(r'<c:pt idx="\d+"><c:v></c:v></c:pt>')
PARAGRAPH = re.compile(r"<a:p>(.*?)</a:p>", re.S)
PARAGRAPH_PROPS = re.compile(r"<a:pPr\b[^>]*/>|<a:pPr\b[^>]*>.*?</a:pPr>", re.S)


def fix_fonts(xml):
    def replace(match):
        face = match.group("face")
        if face == JAPANESE_FONT:
            latin = LATIN_FONT
        elif face == CODE_FONT:
            latin = CODE_FONT
        else:
            return match.group(0)
        return (f'<a:latin typeface="{latin}"/>'
                f'<a:ea typeface="{JAPANESE_FONT}" charset="{JAPANESE_CHARSET}"/>'
                f'<a:cs typeface="{latin}"/>')

    return FONT_TRIPLE.subn(replace, xml)


def dedupe_paragraph_props(xml):
    removed = 0

    def fix_paragraph(match):
        nonlocal removed
        body = match.group(1)
        props = list(PARAGRAPH_PROPS.finditer(body))
        if len(props) <= 1:
            return match.group(0)
        first = props[0]
        rest = PARAGRAPH_PROPS.sub("", body[first.end():])
        removed += len(props) - 1
        return "<a:p>" + body[:first.end()] + rest + "</a:p>"

    return PARAGRAPH.sub(fix_paragraph, xml), removed


def main(src, dst):
    src, dst = Path(src), Path(dst)
    font_count = 0
    props_removed = 0
    empty_points = 0
    with zipfile.ZipFile(src) as zin:
        names = zin.namelist()
        # [Content_Types].xml は先頭に置く必要がある
        order = [n for n in names if n == "[Content_Types].xml"] + [n for n in names if n != "[Content_Types].xml"]
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
            for name in order:
                data = zin.read(name)
                is_target = re.match(r"ppt/(slides/slide\d+|charts/chart\d+)\.xml$", name)
                if is_target:
                    xml = data.decode("utf-8")
                    xml, n_fonts = fix_fonts(xml)
                    font_count += n_fonts
                    if name.startswith("ppt/charts/"):
                        xml, n_empty = EMPTY_CHART_POINT.subn("", xml)
                        empty_points += n_empty
                    if name.startswith("ppt/slides/"):
                        xml, n_removed = dedupe_paragraph_props(xml)
                        props_removed += n_removed
                    data = xml.encode("utf-8")
                info = zin.getinfo(name)
                new_info = zipfile.ZipInfo(name, date_time=info.date_time)
                new_info.compress_type = zipfile.ZIP_DEFLATED
                new_info.external_attr = info.external_attr
                zout.writestr(new_info, data)
    print(f"フォント指定の修正: {font_count} 箇所 / 重複した段落プロパティの削除: {props_removed} 箇所 / グラフの空欄の点の削除: {empty_points} 個")
    print(f"サイズ: {src.stat().st_size:,} → {dst.stat().st_size:,} bytes")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("使い方: python postprocess.py <入力.pptx> <出力.pptx>")
    main(sys.argv[1], sys.argv[2])
