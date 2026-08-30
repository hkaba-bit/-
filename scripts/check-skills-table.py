#!/usr/bin/env python3
"""AGENTS.md 第5章の Skill 一覧表と skills/ の実体が一致しているかを検証する。

    python3 scripts/check-skills-table.py

ズレたまま運用すると Codex 側だけが古い認識で動く（references/role-split.md 第5章）。
Skill を追加・改訂したら必ずこれを通すこと。終了コード 0=一致 / 1=不一致。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AGENTS = ROOT / "AGENTS.md"
SKILLS = ROOT / "skills"

def main() -> int:
    if not AGENTS.exists():
        print("AGENTS.md が見つからない", file=sys.stderr)
        return 1

    text = AGENTS.read_text(encoding="utf-8")
    listed = {m.group(1): m.group(0) for m in re.finditer(r"skills/([A-Za-z0-9._-]+)/SKILL\.md", text)}
    actual = {d.name for d in SKILLS.iterdir() if d.is_dir() and (d / "SKILL.md").exists()} if SKILLS.exists() else set()

    missing_in_table = sorted(actual - set(listed))       # 実体はあるが表にない
    missing_on_disk = sorted(set(listed) - actual)        # 表にはあるが実体がない
    no_skill_md = sorted(
        d.name for d in SKILLS.iterdir()
        if SKILLS.exists() and d.is_dir() and not (d / "SKILL.md").exists()
    ) if SKILLS.exists() else []

    print(f"AGENTS.md 記載: {len(listed)} 件 / skills/ 実体: {len(actual)} 件")

    ok = True
    for name in missing_in_table:
        print(f"  NG  skills/{name}/ が AGENTS.md 第5章の一覧表にない → 表に追記する")
        ok = False
    for name in missing_on_disk:
        print(f"  NG  AGENTS.md が skills/{name}/SKILL.md を指しているが実体がない")
        ok = False
    for name in no_skill_md:
        print(f"  警告  skills/{name}/ に SKILL.md がない")

    print("  OK  一覧表と実体は一致している" if ok else "\n不一致あり。AGENTS.md 第5章を更新すること。")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
