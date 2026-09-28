---
name: gg-orca-flow
description: Orca（stablyai/orca）上で、依頼書（projects/*/handoff/*.md、status: ready）を1件取り出し、②Codex に資料・ワイヤーを作らせ、③Claude Code にチェックとブラッシュアップをさせて PR にするまでを進める進行役。worktree の作成・Codex と Claude の起動・待ち合わせ・失敗時の差し戻しを Orca CLI（orca worktree / terminal）で行う。Orca の定期実行（automation「gg handoff pipeline」）から呼ばれるほか、「依頼書を今すぐ処理して」「Orcaで回して」「パイプラインを動かして」と言われたとき、PC の Orca 内でワイヤー・資料の作成依頼を受けたときに使う。依頼書の作り方は gg-handoff、分担は references/role-split.md、Orca の手順と CLI は references/orca-workflow.md が正本。
---

# Orca で ②作成 → ③チェック を回す

正本：手順・CLI は `references/orca-workflow.md`、分担は `references/role-split.md`、依頼書の書式は `skills/gg-handoff/SKILL.md`。

## 0. 前提を確かめる

`[Orca モード …]` の行を見る（無ければ `node scripts/orca-context.mjs`）。

| モード | 進め方 |
|---|---|
| A / B（Orca に接続できる） | 下の 1〜6 を実行する |
| C（クラウド等） | ②③は回せない。依頼がワイヤー・資料なら `gg-handoff` で依頼書を作って main に入れる |

依頼書が無いまま「〇〇のワイヤーを作って」と直接頼まれたら、先に `gg-handoff` の書式で依頼書を作って main に入れてから 1 に進む（与件が足りなければ人間に聞く）。

## 1. 依頼書を1件取り出す

```bash
node scripts/handoff-scan.mjs --next
```
出力の JSON（`path` / `slug` / `type` / `title`）を控える。exit 1 なら処理対象なし → 終了。

## 2. worktree を作り、② Codex を起動する

```bash
orca repo list --json    # C:/work/gg の id を取る
orca worktree create --repo id:<repoId> --name <slug>-<type>-<MMDD> --agent codex --prompt "<②の依頼>" --json
```

②の依頼（そのまま使う。`<path>` は 1 の path）：
```
依頼書 <path> を読み、その Goal / Context / Constraints / Done when に従って成果物を作ってください。
参照 Skill は依頼書の Context にあるものを開いて従うこと（AGENTS.md 第5章）。
成果物は projects/<slug>/ 配下に置き、git add と git commit まで行ってください（push はしない）。
要確認の点は成果物の注釈と、依頼書末尾の「## ② メモ」に書いてください。
最後に「②完了」とだけ出力してください。
```

## 3. ② の完了を待つ

```bash
orca terminal list --worktree id:<worktreeId> --json      # codex の handle を取る
orca terminal wait --terminal <codexHandle> --for tui-idle --timeout-ms 3600000 --json
orca terminal read --terminal <codexHandle> --json
```
「②完了」が無い、または承認待ちで止まっている → 7（失敗時）へ。

## 4. ③ Claude Code を同じ worktree で起動する

```bash
orca terminal create --worktree id:<worktreeId> --command "claude" --json
orca terminal wait --terminal <claudeHandle> --for tui-idle --timeout-ms 120000 --json
orca terminal send --terminal <claudeHandle> --text "<③の依頼>" --enter --json
```

③の依頼：
```
Orca を使わずにここで直接作業してください。
依頼書 <path> の「Done when」と「③ チェック観点」で、② Codex が作った成果物（git log の直近コミット）をチェックし、問題はその場で直してください。
判断は skills/gg-proposal-standard、種類ごとの検品は skills/gg-handoff の表（wireframe なら python scripts/qa-wireframe.py）に従うこと。
終わったら、依頼書の status を review に変え、末尾に「## ③ 結果」（直した点・残った要確認・検品結果）を追記し、STATUS.md と projects/<slug>/STATUS.md に1件追記してください。
コミットして push し、gh pr create で PR を作り（タイトル「<slug>: <依頼書タイトル>」）、最後に PR の URL だけを出力してください。
```

## 5. ③ の完了を待って回収する

```bash
orca terminal wait --terminal <claudeHandle> --for tui-idle --timeout-ms 3600000 --json
orca terminal read --terminal <claudeHandle> --json
orca worktree set --worktree id:<worktreeId> --comment "PR: <URL>" --json
```

## 6. 報告する

| 項目 | 内容 |
|---|---|
| 依頼書 | path |
| worktree | 名前 |
| PR | URL |
| ③ で直した点 | 箇条書き |
| 要確認 | 人間に決めてほしいこと |

マージしない（人間が決める）。worktree はマージ後に人間が削除する。

## 7. 失敗したとき

- `node scripts/handoff-scan.mjs --release <path>` で着手記録を消す（次回の定期実行で再挑戦される）
- worktree は残す（原因調査用）。`orca worktree set --comment "失敗: <理由>"` を付ける
- 同じ依頼書が2回続けて失敗したら、依頼書の status を `blocked` に変えるコミットを作り、人間に理由を報告する

## やらないこと
- 元チェックアウト（C:\work\gg）で直接ファイルを作らない。必ず worktree で
- ② を飛ばして ③ の Claude が一から作らない（分担が崩れる）
- PR を自分でマージしない
