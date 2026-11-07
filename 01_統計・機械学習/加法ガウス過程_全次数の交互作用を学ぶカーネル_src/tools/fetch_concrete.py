"""fetch_concrete.py — UCI の Concrete Compressive Strength データを取得し、数値だけの data/concrete.csv にする。

データ: I-Cheng Yeh (1998)、UCI Machine Learning Repository、CC BY 4.0。
実行: .venv/bin/python -I tools/fetch_concrete.py
ダウンロードしたファイルは data/ の中だけに置く（Git には登録しない）。
"""

import csv
import io
import pathlib
import sys
import urllib.request
import zipfile

import xlrd

SOURCE_URL = "https://archive.ics.uci.edu/static/public/165/concrete+compressive+strength.zip"
EXPECTED_ROWS = 1030
EXPECTED_COLUMNS = 9
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data" / "concrete.csv"

HEADERS = ["cement", "slag", "fly_ash", "water", "superplasticizer", "coarse", "fine", "age", "strength"]


def main():
    OUTPUT.parent.mkdir(exist_ok=True)
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    name = next(n for n in archive.namelist() if n.lower().endswith(".xls"))
    book = xlrd.open_workbook(file_contents=archive.read(name))
    sheet = book.sheet_by_index(0)
    print("元の列名:", sheet.row_values(0))
    rows = [sheet.row_values(i) for i in range(1, sheet.nrows)]
    if len(rows) != EXPECTED_ROWS or len(rows[0]) != EXPECTED_COLUMNS:
        sys.exit(f"想定と違う大きさです: {len(rows)} 行 {len(rows[0])} 列")
    with OUTPUT.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADERS)
        writer.writerows([float(v) for v in row] for row in rows)
    print(f"{OUTPUT} に {len(rows)} 行を書きました")


if __name__ == "__main__":
    main()
