#!/bin/bash
# 場面の確認画像を作る: tools/sheet.sh S1V [S2T ...] → out/sheet-<場面>.png（各行の終わりのコマを並べる）
set -e
cd "$(dirname "$0")/.."
for scene in "$@"; do
  frames=$(node tools/frames.ts "$scene")
  rm -rf "out/chk-$scene"
  npx remotion render GaussianCopula "out/chk-$scene" --frames="$frames" --image-format=jpeg --scale=0.5 --log=error
  ffmpeg -y -loglevel error -pattern_type glob -i "out/chk-$scene/*.jpeg" -vf "tile=2x4:padding=6:color=white" -frames:v 1 "out/sheet-$scene.png"
done
