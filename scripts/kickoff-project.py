#!/usr/bin/env python3
"""案件ディレクトリを作り、gg-manager の案件JSONから与件の骨組みを書き出す。

    python3 scripts/kickoff-project.py --slug johoku-saitama --json 案件.json

`--json` には gg-manager の `projects_fetch` が返した JSON をそのまま渡す。
機械的に取れる事実（会社名・担当・金額・Dropboxパス・Backlog・Zoho）だけを埋め、
**判断が要る欄は空のまま残す**。埋めるのはエージェントと人間の仕事。

既に案件ディレクトリがある場合は何もしない（終了コード 0）。上書きしない。
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def pick(raw: dict) -> dict:
    """案件JSONから、創作の余地がない事実だけを抜く。"""
    deal = raw.get("zohoDealInfo") or {}
    contacts = deal.get("contacts") or []
    return {
        "name": raw.get("name", ""),
        "account": raw.get("accountName") or deal.get("companyName", ""),
        "type": raw.get("type", ""),
        "type_rule": raw.get("projectTypeRule", ""),
        "status": raw.get("status", ""),
        "amount": deal.get("totalAmount", ""),
        "stage": deal.get("stage", ""),
        "closing": deal.get("closingDate", ""),
        "owner": deal.get("dealOwner", ""),
        "overview": deal.get("dealOverview", ""),
        "backlog": raw.get("backlogUrl", ""),
        "dropbox": raw.get("dropboxProjectPath", ""),
        "board": deal.get("boardUrl", ""),
        "deal_url": deal.get("dealUrl", ""),
        "next_action": raw.get("receivedNextAction", ""),
        "contacts": [c.get("fullName", "") for c in contacts if c.get("fullName")],
    }


def brief(slug: str, f: dict) -> str:
    def v(x):
        return x if x else "**未取得**"

    amount = f"{int(f['amount']):,}円" if str(f["amount"]).isdigit() else v(f["amount"])
    return f"""# 与件整理（{v(f['name'])}）

作成: `scripts/kickoff-project.py` が自動生成した骨組み。**判断が要る欄は空のまま。**
このファイルが下流（仕様書・ワイヤー・提案書）の共通の土台になる。
ここに書いていないことを各成果物で創作しない。

---

## 1. 案件情報（gg-manager から自動取得）

| 項目 | 内容 |
|---|---|
| 案件名 | {v(f['name'])} |
| クライアント | {v(f['account'])} |
| 案件種別 | {v(f['type'])}（{v(f['type_rule'])}） |
| 状態 | {v(f['status'])} ／ 商談ステージ {v(f['stage'])} |
| 総額 | {amount} |
| 成約日 | {v(f['closing'])} |
| 弊社担当 | {v(f['owner'])} |
| 先方窓口 | {v('、'.join(f['contacts']))} |
| 案件スラッグ | `{slug}` |
| Backlog | {v(f['backlog'])} |
| 見積（board） | {v(f['board'])} |
| Zoho商談 | {v(f['deal_url'])} |
| Dropbox | `{v(f['dropbox'])}` |

### 次アクション（gg-manager 記載）
{v(f['next_action'])}

### 商談概要（Zoho 記載）
{v(f['overview'])}

---

## 2. 受注条件

> Backlog の課題本文から転記する。設計ページ数・デザイン対象・流し込み記事数・
> システム・外注可否・納期・想定スケジュールを埋める。**推測で埋めない。**

| 項目 | 値 |
|---|---|
| 設計ページ数 | |
| デザイン対象 | |
| 流し込み記事数 | |
| システム | |
| 外注可否 | |
| 納期 | |

---

## 3. 与件（ヒアリングより）

> Dropbox の GrowMeet 配下にヒアリングの要約・文字起こしがあれば、そこから埋める。
> 無ければ「ヒアリング未実施」と明記する。

### 背景

### 課題

| # | 課題 | 出所 |
|---|---|---|
| | | |

---

## 4. 3つの論点（gg-proposal-standard の型）

> **ヒアリングで2回以上出た言葉から取る。**こちらの都合で作らない。4つに増やさない。

| | 論点01 | 論点02 | 論点03 |
|---|---|---|---|
| 見出し | | | |
| 現在地 | | | |
| 本提案 | | | |
| 参照 | | | |

---

## 5. 未確定事項

| # | 論点 | 誰に |
|---|---|---|
| | | |

---

## 6. この案件で参照するもの

| 種別 | 場所 |
|---|---|
| 現行サイト調査 | `projects/{slug}/research/current-site-audit.md` |
| 判断基準 | `skills/gg-proposal-standard/SKILL.md` |
| 進め方 | `skills/gg-project-kickoff/SKILL.md` |
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True, help="案件スラッグ（英小文字・数字・ハイフン）")
    ap.add_argument("--json", required=True, help="gg-manager projects_fetch の出力JSON")
    ap.add_argument("--name", help="案件名。省略時はJSONから取る")
    args = ap.parse_args()

    if not SLUG_RE.match(args.slug):
        print(f"スラッグは英小文字・数字・ハイフンのみ: {args.slug}", file=sys.stderr)
        return 1

    dest = ROOT / "projects" / args.slug
    if dest.exists():
        print(f"  skip  projects/{args.slug} はすでにある（上書きしない）")
        return 0

    payload = json.loads(Path(args.json).read_text(encoding="utf-8"))
    raw = payload.get("raw", payload)
    facts = pick(raw)

    script = ROOT / "scripts" / "new-project.sh"
    subprocess.run(
        ["bash", str(script), args.slug, args.name or facts["name"] or args.slug],
        check=True, capture_output=True,
    )
    for sub in ("research", "spec", "wireframe", "deck"):
        (dest / sub).mkdir(exist_ok=True)

    (dest / "research" / "brief.md").write_text(brief(args.slug, facts), encoding="utf-8")

    missing = [k for k in ("account", "backlog", "dropbox", "overview") if not facts[k]]
    print(f"作成した: projects/{args.slug}/")
    print(f"  - research/brief.md（自動取得分を記入。判断が要る欄は空）")
    print(f"  - research/ spec/ wireframe/ deck/ outputs/")
    if missing:
        print(f"  ! JSON に無かった項目: {', '.join(missing)}")
    print()
    print("次: skills/gg-project-kickoff/SKILL.md の手順に従って与件を埋める")
    return 0


if __name__ == "__main__":
    sys.exit(main())
