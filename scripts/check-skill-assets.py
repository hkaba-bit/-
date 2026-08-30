#!/usr/bin/env python3
"""SKILL.md が参照している assets/ ・ scripts/ のファイルが実在するかを検証する。

    python3 scripts/check-skill-assets.py

参照だけあって実体がない Skill は、その場になって初めて落ちる。
Skill を追加・改訂したら check-skills-table.py と一緒に通すこと。
終了コード 0=すべて実在 / 1=欠落あり。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"

# SKILL.md 中の assets/... scripts/... references/... への言及を拾う
REF = re.compile(r"(?:^|[\s`\"'(/])((?:assets|scripts|references)/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+)")


def main() -> int:
    if not SKILLS.is_dir():
        print("skills/ が見つからない", file=sys.stderr)
        return 1

    missing_total = 0
    for skill_md in sorted(SKILLS.glob("*/SKILL.md")):
        skill = skill_md.parent
        # find-skill-script.py で解決する行は、環境ごとに実パスが変わるので対象外
        lines = [ln for ln in skill_md.read_text(encoding="utf-8").splitlines()
                 if "find-skill-script.py" not in ln]
        refs = sorted({m.group(1) for m in REF.finditer("\n".join(lines))})
        # Skill 相対でも作業ルート相対でも見つからないものだけを欠落とみなす
        missing = [r for r in refs if not (skill / r).exists() and not (ROOT / r).exists()]
        status = "OK " if not missing else "NG "
        print(f"  {status} {skill.name}: 参照 {len(refs)} 件 / 欠落 {len(missing)} 件")
        for r in missing:
            print(f"        欠落: {skill.name}/{r}")
        missing_total += len(missing)

    print("\n  OK  参照先はすべて実在する" if not missing_total
          else f"\n欠落 {missing_total} 件。SKILL.md の参照を直すか、実体を置くこと。")
    return 0 if not missing_total else 1


if __name__ == "__main__":
    sys.exit(main())
