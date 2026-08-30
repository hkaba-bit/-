#!/usr/bin/env bash
# skills/ を正本として Claude Code 側（~/.claude/skills/）へ配布する。
# 既定はシンボリックリンク。--copy を付けるとコピー同期（リンク不可の環境向け）。
#
#   bash scripts/sync-skills.sh
#   bash scripts/sync-skills.sh --copy
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/skills"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
MODE="link"
[ "${1:-}" = "--copy" ] && MODE="copy"

[ -d "$SRC" ] || { echo "skills/ が見つからない: $SRC" >&2; exit 1; }
mkdir -p "$DEST"

for dir in "$SRC"/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  target="$DEST/$name"

  if [ "$MODE" = "link" ]; then
    if [ -L "$target" ] && [ "$(readlink "$target")" = "${dir%/}" ]; then
      echo "  skip  $name（リンク済み）"; continue
    fi
    rm -rf "$target"
    ln -s "${dir%/}" "$target"
    echo "  link  $name -> ${dir%/}"
  else
    rm -rf "$target"
    cp -r "${dir%/}" "$target"
    echo "  copy  $name"
  fi
done

echo
echo "配布先: $DEST"
echo "※ Skill を追加・改訂したら AGENTS.md 第5章の一覧表も更新すること（python3 scripts/check-skills-table.py で検証）"
