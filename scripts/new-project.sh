#!/usr/bin/env bash
# 案件ディレクトリを projects/_template/ から作る。
#
#   bash scripts/new-project.sh <案件スラッグ> ["案件名"]
#   例) bash scripts/new-project.sh tokyo-weld "東京ウェルディングパーツ リニューアル"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT/projects/_template"

SLUG="${1:-}"
NAME="${2:-$SLUG}"

if [ -z "$SLUG" ]; then
  echo "使い方: bash scripts/new-project.sh <案件スラッグ> [\"案件名\"]" >&2
  exit 1
fi
if ! printf '%s' "$SLUG" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "案件スラッグは英小文字・数字・ハイフンのみ（例: bikkuri-donkey）: $SLUG" >&2
  exit 1
fi

DEST="$ROOT/projects/$SLUG"
[ -e "$DEST" ] && { echo "すでに存在する: projects/$SLUG" >&2; exit 1; }
[ -d "$TEMPLATE" ] || { echo "雛形が見つからない: projects/_template" >&2; exit 1; }

cp -r "$TEMPLATE" "$DEST"
DATE="$(date +%Y-%m-%d)"
# 置換（macOS / Linux 両対応のため一時ファイル経由）
tmp="$(mktemp)"
sed -e "s|{{SLUG}}|$SLUG|g" -e "s|{{NAME}}|$NAME|g" -e "s|{{DATE}}|$DATE|g" "$DEST/STATUS.md" > "$tmp"
mv "$tmp" "$DEST/STATUS.md"

echo "作成した: projects/$SLUG/"
echo "  - STATUS.md（案件単位の進捗）"
echo "  - outputs/（納品候補。Git 追跡外）"
echo
echo "次: projects/$SLUG/STATUS.md の「案件情報」と「与件」を埋める"
