---
name: gg-handoff
description: ①claude.ai で整理した与件・方針を、②Codex（資料・ワイヤー作成）→ ③Claude Code（チェック・ブラッシュアップ）に Orca で自動処理させるための「依頼書」を作り、main に入れるところまで進めるスキル。依頼書の置き場所・書式（front matter の status / type / slug と、Goal・Context・Constraints・Done when・③チェック観点）、種類別の参照 Skill、PR 作成とマージの手順を持つ。「Orcaに回して」「Codexに作らせて」「依頼書にして」「ワイヤーを作らせて」「資料を作らせて」「パイプラインに流して」と言われたとき、claude.ai（クラウド）で与件整理や調査を終えて成果物づくりに進むときに使う。依頼書を受け取って②③を回すのは gg-orca-flow、判断基準は gg-proposal-standard、分担は references/role-split.md が正本。
---

# 依頼書を作って Orca に回す（① 側）

## 流れの全体

| 工程 | 担当 | 場所 | このスキルの範囲 |
|---|---|---|---|
| ① 情報整理 → 依頼書 | Claude | claude.ai（クラウド可） | ここ |
| ② 資料・ワイヤー作成 | Codex | Orca（PC） | gg-orca-flow が自動で起動 |
| ③ チェック・ブラッシュアップ → PR | Claude Code | Orca（PC） | gg-orca-flow が自動で起動 |
| マージ | 人間 | GitHub | — |

PC の Orca は 15 分ごとに main の依頼書を確認し、`status: ready` のものを処理する（`references/orca-workflow.md` 第3章）。

## 手順

### 1. 与件を整理する
判断は `gg-proposal-standard`。未確定の数値・与件は「要確認」として依頼書に残す（推測で埋めない）。

### 2. 依頼書を書く
置き場所：`projects/<案件スラッグ>/handoff/<YYYYMMDD>-<種類>-<短い名前>.md`
案件ディレクトリが無ければ先に `scripts/new-project.sh <slug> "案件名"` で作る。

```markdown
---
status: ready
type: wireframe
slug: tokyo-weld
created: 2026-09-28
---
# 依頼：tokyo-weld TOP・下層ワイヤー

## Goal
（1〜2行。何ができれば良いか）

## Context
- 与件：（箇条書き。出典つき）
- 参照ファイル：projects/tokyo-weld/...
- 参照 Skill：skills/gg-wireframe/SKILL.md

## Constraints
- AGENTS.md 準拠
- （今回固有の制約。未確定は「要確認」と書いて注釈に残させる）

## Done when
- （完了条件。検証方法まで。例：index.html から全ページに遷移でき、qa-wireframe.py が通る）

## ③ チェック観点
- （Claude Code が見る点。例：gg-proposal-standard の P0/P1、RFP 適合、注釈の根拠）
```

| type | ② Codex が使う Skill | ③ の検品 |
|---|---|---|
| `wireframe` | `skills/gg-wireframe/SKILL.md` | `python scripts/qa-wireframe.py` |
| `deck` | `skills/gg-proposal-deck/SKILL.md` | 生成 → PDF → 画像で目視（AGENTS.md 第6章） |
| `sitemap` | `skills/gg-sitemap-spec/SKILL.md` | Excel を開いて行数・列を確認 |
| `artifact` | `skills/gg-proposal-artifact/SKILL.md` | ブラウザで実際に操作 |
| `other` | Context に明記 | Done when に明記 |

### 3. main に入れる
依頼書だけのコミットにする（他のファイルを混ぜない）。

1. 作業ブランチにコミット → push
2. PR を作る（タイトル：`依頼書: <slug> <種類>`）
3. 変更が `projects/*/handoff/*.md` だけなら、その場でマージしてよい。それ以外を含むなら人間に確認する

### 4. 人間に伝える
- 依頼書のパスと、PC で処理が始まる目安（最大 15 分後。すぐ回すなら PC の Claude Code に「依頼書を今すぐ処理して」）
- ③ の結果は PR として上がる。マージは人間

## やらないこと
- 依頼書に会話履歴を貼らない（Goal / Context / Constraints / Done when / ③チェック観点だけ）
- ① で成果物（HTML・PPTX・Excel）を作り始めない。作るのは ② の Codex
- `status` を `ready` 以外（`draft` など）にしたまま渡さない。PC 側は `ready` しか拾わない
