#!/bin/zsh
# 生成 → 後処理 → 検査 → 正本へ置き換え。PowerPointで開いている間は止める。
# 使い方: ./build.sh [standard|grareco|infographic|all]（省略時は all）
set -e
SRC_DIR="${0:A:h}"
OUT_DIR="${SRC_DIR:h}"
EXPECTED_SLIDES=4

build_one() {
  local variant=$1 script name
  case $variant in
    standard) script=build_deck.js; name="重ね合わせFF補正の8方式_計測とプロセスフロー" ;;
    grareco) script=build_deck_grareco.js; name="重ね合わせFF補正の8方式_グラレコ風" ;;
    infographic) script=build_deck_infographic.js; name="重ね合わせFF補正の8方式_インフォグラフィック風" ;;
    *) echo "不明な版です: $variant（standard / grareco / infographic / all）"; return 1 ;;
  esac
  local final="$OUT_DIR/$name.pptx"
  local building="$OUT_DIR/$name.building.pptx"
  local raw="$SRC_DIR/deck_raw_$variant.pptx"
  if [[ -e "$OUT_DIR/~\$$name.pptx" ]]; then
    echo "PowerPointで開いています。閉じてから再実行してください: $final"; return 1
  fi
  NODE_PATH="$(npm root -g)" node "$SRC_DIR/$script" "$raw"
  python3 "$SRC_DIR/postprocess.py" "$raw" "$building"
  python3 "$SRC_DIR/check_deck.py" "$building" $EXPECTED_SLIDES
  rm -f "$raw"
  if [[ -e "$OUT_DIR/~\$$name.pptx" ]]; then
    echo "PowerPointで開いています。置き換えを中止しました: $building"; return 1
  fi
  mv -f "$building" "$final"
  echo "完成: $final"
}

variant=${1:-all}
if [[ $variant == all ]]; then
  for v in standard grareco infographic; do build_one $v; done
else
  build_one $variant
fi
