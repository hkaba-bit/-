---
name: gg-orca-flow
description: Orca（stablyai/orca）上で「Claude で実装 → Codex でレビュー」を回す進行役。依頼を1工程＝1 worktree に切り、worktree 名を決め、Claude の実装依頼と Codex のレビュー依頼（Goal / Context / Constraints / Done when の4項目）を組み立て、Orca CLI（orca worktree / terminal / orchestration）で起動・待ち合わせ・回収まで進める。「Orcaで」「Orcaに投げて」「worktreeを切って」「Codexにレビューさせて」「並列で2案作って比べたい」「ClaudeとCodexで分担して」と言われたとき、Orca の中で動いていて別エージェントに作業を渡すときに使う。分担の判断基準と引き渡しの型の正本は references/role-split.md、Orca 上の手順の正本は references/orca-workflow.md で、このスキルはそれらに従って手を動かす。Orca の導入そのものは scripts/setup-orca.ps1 の担当。
---

# Orca で回す

正本は2つ。迷ったらそちらを開く。

- 手順・命名・CLI：`references/orca-workflow.md`
- 誰に何を渡すか・引き渡しの型：`references/role-split.md`

## 進め方

### 1. 実行場所を確かめる

セッション冒頭の `[Orca モード A/B/C]` の行を見る（Claude Code の SessionStart フックが出す）。行が無ければ `node scripts/orca-context.mjs` を実行する。

| モード | 進め方 |
|---|---|
| A：Orca の worktree 内 | この worktree で実装し、4 の後半（Codex のレビュー）だけ CLI で行う |
| B：元チェックアウト・Orca 起動中 | 2〜4 をすべて CLI で行う。自分では編集せず、worktree 側の Claude に渡す |
| C：Orca を使えない（クラウド等） | CLI は使わない。実装は作業ブランチで行い、3 の依頼文を人間が Orca に貼れる形で出す |

### 2. 工程に切る

依頼を「1工程＝1 worktree」に分ける。名前は `<案件スラッグ>-<工程>`（例：`tokyo-weld-wireframe`）。
振り分けは role-split.md 第2章の表で決める。表にない作業は Claude 側に置き、人間に確認する。

### 3. 依頼文を作る

どちらのエージェント宛ても、次の4項目だけで作る。会話履歴は入れない。

```
Goal:        何を達成したいか（1〜2行）
Context:     触るファイルのパス。参照すべき Skill のパス（skills/<name>/SKILL.md）
Constraints: AGENTS.md 準拠。加えて今回固有の制約
Done when:   完了とみなす条件（検証方法まで）
```

Codex へのレビュー依頼には、Constraints に必ず「修正はしない（指摘のみ）」を入れる。戻しの形は role-split.md 第4章（変更ファイル・指摘・判断が要る点）で指定する。

### 4. 起動して回収する（CLI が使える場合）

```bash
orca repo list --json                                   # repoId を取る
orca worktree create --repo id:<repoId> --name <名前> --agent claude --prompt "<実装依頼>" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 900000 --json
orca terminal read --terminal <handle> --json           # 完了を確認
orca terminal split --direction vertical --command "codex" --json
orca terminal send --terminal <codexHandle> --text "<レビュー依頼>" --enter --json
orca terminal wait --terminal <codexHandle> --for tui-idle --timeout-ms 900000 --json
orca terminal read --terminal <codexHandle> --json
```

複数工程で完了追跡が要るときは orca-workflow.md 第4章の Orchestration を使う。

### 5. 報告する

人間には次の表だけ返す。生ログは貼らない。

| 項目 | 内容 |
|---|---|
| worktree | 名前 |
| 実装 | 変更ファイル |
| レビュー指摘 | 重要度つき箇条書き |
| 判断が要る点 | 人間に決めてほしいこと |
| 次アクション | マージ／差し戻し／worktree 削除 |

完了したら `STATUS.md` に追記する（AGENTS.md 第7章）。

## やらないこと

- 元チェックアウト（main）で直接エージェントを走らせない。必ず worktree を切る
- 実装した Claude 自身にレビューさせない
- Codex のレビュー結果を、人間の確認前に自動でマージしない
- 見積金額・クライアント向け文言の最終判断をエージェントに任せない（人間が決める）
