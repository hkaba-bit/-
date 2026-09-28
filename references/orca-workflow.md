# Orca で回す（Claude 実装 → Codex レビュー）

Orca（stablyai/orca）は、CLI エージェントを **作業ごとの git worktree** で並べて動かすデスクトップアプリ。
この環境では「Claude で実装 → Codex でレビュー」（`AGENTS.md` 第4章）を 1 画面で回すために使う。
分担と引き渡しの型そのものは `references/role-split.md` が正本。ここは **Orca 上での回し方** だけを書く。

> CLI の引数は Orca の公式ドキュメント（https://www.onorca.dev/docs/cli/reference）に合わせてある。Orca は毎日更新されるので、コマンドが通らなければ `orca <サブコマンド> --help` を正とする。

---

## 1. 前提（Windows ローカル・初回だけ）

| # | やること | 確認方法 |
|---|---|---|
| 1 | Orca・git・node・gh・codex・claude を導入 | `scripts\setup-orca.ps1`（済：2026-09-27） |
| 2 | Codex にログイン | `codex` を一度起動してブラウザでログイン |
| 3 | このリポジトリを Orca に追加 | サイドバーの **Add Repo** → ローカルのチェックアウト（例：`C:\work\gg`）を選ぶ。サイドバーに出れば OK。CLI なら `orca repo list --json` |
| 4 | Orca CLI を有効化 | Orca の Settings → General → Orca CLI。新しい PowerShell で `orca status --json` が通る |
| 5 | エージェントに Orca CLI の Skill を入れる | `orca skills install --skill orca-cli` |
| 6 | （任意）Orchestration を有効化 | Settings → Experimental。§4 の監督付き実行を使う場合だけ |

リポジトリ直下の `orca.yaml` で `node_modules` を各 worktree に共有し、`.worktreeinclude` で `.env` を各 worktree にコピーする設定にしてある。
worktree ごとに `npm ci` をやり直す必要はない（worktree は base ref＝main から切られるので、この設定が main に入っていることが前提）。ただし `node_modules` は元のチェックアウトで一度 `npm ci` しておくこと。

---

## 1.5 自動判定（Claude Code）

Claude Code は起動時に `scripts/orca-context.mjs`（`.claude/settings.json` の SessionStart フック）で運用モードを判定し、それに従って動く。

| モード | 条件 | Claude の動き |
|---|---|---|
| A | `orca status` が通り、Orca 管理の worktree 内（`ORCA_TERMINAL_HANDLE` あり、または `orca worktree current` が通る） | そこで実装 → 同じ worktree の Codex にレビュー |
| B | `orca status` が通り、Orca の worktree の外（元チェックアウト、デスクトップアプリの worktree 等） | 変更を伴う依頼は worktree を切ってから |
| C | `orca status` が通らない | 通常どおり実装し、Codex 依頼文を人間に渡す |

ワイヤー依頼（ワイヤー／WF／wireframe／画面設計／構成イメージ／たたき台／プロトタイプ）を送ると、`UserPromptSubmit` フック（`orca-context.mjs --on-prompt`）が Orca を確認し、Windows で止まっていれば `%LOCALAPPDATA%\Programs\orca\Orca.exe` を起動して最大60秒待つ。起動できればモード A/B の手順、できなければモード C で進む。

`orca` が PATH に無いプロセス（Orca CLI 登録前に起動した Claude デスクトップアプリ等）でも動くよう、Windows では `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe` を直接試す。

詳細は `CLAUDE.md`「Orca 運用（自動）」。人間が「Orca を使わずに」と言えばそちらを優先する。

---

## 2. 命名

| 対象 | 規則 | 例 |
|---|---|---|
| worktree 名 | `<案件スラッグ>-<工程>` | `tokyo-weld-wireframe` / `tokyo-weld-deck` |
| レビュー用 | 実装と同じ worktree を使う（別に作らない） | — |
| 比較用（同じ依頼を2案） | 末尾に `-a` / `-b` | `lizon-top-a` / `lizon-top-b` |

案件スラッグは `AGENTS.md` 第2章の規約どおり（英小文字・数字・ハイフン）。

---

## 3. 基本の流れ（1工程＝1 worktree）

| 段 | 誰が | Orca 画面での操作 | CLI（エージェントが実行する場合） |
|---|---|---|---|
| ① 作る | 人間 or Claude | サイドバーのリポジトリ名の横の **+** → 名前は §2、start-from は `origin/main`、Agent=Claude Code | `orca worktree create --repo id:<repoId> --name <名前> --agent claude --prompt "<依頼>" --json` |
| ② 実装 | Claude | そのまま依頼。Skill は自動で読まれる | — |
| ③ レビュー | Codex | 同じ worktree でターミナルを分割 → `codex` を起動し、role-split.md 第3章の型で依頼 | `orca terminal split --direction vertical --command "codex" --json` の後、`orca terminal send --terminal <handle> --text "<型どおりの依頼>" --enter --json` |
| ④ 差し戻し | 人間 | 差分の行にコメント（Annotate AI Diffs）→ Claude へ送る | `orca terminal send` で Claude の端末へ |
| ⑤ 仕上げ | Claude | STATUS.md 追記・コミット・PR | `gh pr create` |
| ⑥ 片付け | 人間 | マージ後に worktree を削除 | `orca worktree rm --worktree id:<id> --json` |

- Codex への依頼文は **role-split.md 第3章の4項目（Goal / Context / Constraints / Done when）だけ**。会話履歴を渡さない。
- Codex の戻しは role-split.md 第4章の型（変更ファイル・指摘・判断が要る点）。
- 待ち合わせは `orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 900000 --json`、結果は `orca terminal read --terminal <handle> --json`。

---

## 4. Orchestration を使う場合（任意）

依頼が複数工程にまたがり、完了の追跡が要るときだけ使う。単発なら §3 で足りる。

```bash
orca orchestration run-create --objective "<案件スラッグ>: <目的>" --json
orca orchestration task-create --task-title "実装" --spec "<Goal/Context/Constraints/Done when>" --json
orca orchestration worker-start --task <taskId> --worktree new-child --name <名前> --agent claude --json
# 実装完了（worker_done）を待つ
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
# 同じ worktree で Codex にレビューを割り当てる
orca orchestration task-create --task-title "レビュー" --spec "<型どおりの依頼。修正はしない（指摘のみ）>" --json
orca orchestration worker-start --task <reviewTaskId> --worktree current --agent codex --json
```

PowerShell ではグループ宛先を引用符で囲む（`--to "@codex"`）。

---

## 5. 使いどころ

| 場面 | Orca の使い方 |
|---|---|
| ワイヤーの下層ページ量産 | Claude が TOP を作った worktree で、Codex に横展開させる（role-split.md の例） |
| デザイン案を2つ比べたい | 同じ依頼を `-a`（Claude）/ `-b`（Codex）で並列 → 良い方をマージ、他方は削除 |
| ワイヤーの見た目確認 | 内蔵ブラウザの Design Mode で要素をクリックして、HTML/CSS をエージェントに渡す |
| 外出中 | Orca のモバイルアプリで完了通知を受け、追加指示を送る |

---

## 6. やらないこと

| NG | なぜ |
|---|---|
| main の元チェックアウトで直接エージェントを走らせる | 並行作業が混ざる。必ず worktree を切る |
| 実装した Claude と同じ端末で「レビューして」と頼む | 実装者の思い込みを二度通すだけ（role-split.md 第6章） |
| worktree の `outputs/` を当てにする | `outputs/` は Git 追跡外なので worktree 間で共有されない。納品物は作業した worktree 内で確認してから所定の場所へ移す |
| マージ済みの worktree を残す | どれが生きているか分からなくなる |
