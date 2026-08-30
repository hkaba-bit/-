# GrowGroup プロデューサー事業部｜Claude × Codex 作業環境

提案業務（コンペ／リニューアル提案／広告提案）の成果物を、Claude Code と Codex で分担して生成・検証するための作業ルート。

## 最初に読むもの

| ファイル | 中身 |
|---|---|
| [AGENTS.md](AGENTS.md) | **ルール正本。**両エージェントが従う。ルールの追記・変更はここだけ |
| [CLAUDE.md](CLAUDE.md) | Claude Code 用の薄い入口（`AGENTS.md` を参照＋Claude 固有のみ） |
| [STATUS.md](STATUS.md) | 進捗・申し送り。**ルールは書かない** |
| [references/role-split.md](references/role-split.md) | Claude / Codex の役割分担と引き渡しの型 |

## セットアップ

```bash
# 1. Skill を Claude Code 側へ配布
bash scripts/sync-skills.sh              # Windows: scripts\sync-skills.ps1

# 2. 認証情報
cp .env.example .env                     # 値は人間が手で入れる。.env は Git 追跡外

# 3. 案件を始める
bash scripts/new-project.sh <案件スラッグ> "案件名"
```

## ディレクトリ

```
skills/      Skill 正本（gg-*）。~/.claude/skills/ へ配布して使う
scripts/     環境スクリプト（案件作成・Skill 配布・整合チェック）
projects/    案件ごとの作業ディレクトリ（_template/ が雛形）
references/  環境まわりのドキュメント
```

`projects/*/outputs/` と `.env` は Git 追跡外。
