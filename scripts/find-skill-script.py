#!/usr/bin/env python3
"""Skill 同梱スクリプトの実パスを解決して出力する。

    python scripts/find-skill-script.py xlsx scripts/recalc.py
    python scripts/find-skill-script.py pptx scripts/office/validate.py

Skill の置き場所は環境によって違う（Claude Code の同期先 / 管理サンドボックス /
このリポジトリの skills/）。スクリプトやドキュメントにパスを直書きすると、
別の環境──特に Codex 側──で確実に落ちる。呼び出し側はこれを通す。

    python "$(python scripts/find-skill-script.py xlsx scripts/recalc.py)" 出力.xlsx

見つかれば絶対パスを標準出力に1行、終了コード0。
見つからなければ探索した場所を標準エラーに出して終了コード1。
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def candidates(skill: str, script: str):
    """探索順：明示指定 → 本リポジトリ（gg-* の正本） → Claude Code の配布先 → その同期ディレクトリ → 管理サンドボックス"""
    env_dir = os.environ.get("CLAUDE_SKILLS_DIR")
    if env_dir:
        yield Path(env_dir) / skill / script

    # gg-* の正本は常にこのリポジトリ。配布先のコピーより優先する
    yield ROOT / "skills" / skill / script

    home_skills = Path.home() / ".claude" / "skills"
    yield home_skills / skill / script
    if (home_skills / "synced").is_dir():
        for synced in sorted((home_skills / "synced").iterdir()):
            yield synced / skill / script

    yield Path("/mnt/skills/public") / skill / script


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 1

    skill, script = sys.argv[1], sys.argv[2]
    searched = []
    for path in candidates(skill, script):
        searched.append(str(path))
        if path.is_file():
            print(path.resolve())
            return 0

    print(f"{skill}/{script} が見つからない。探索したパス:", file=sys.stderr)
    for path in searched:
        print(f"  - {path}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
