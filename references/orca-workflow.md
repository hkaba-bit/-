# Orca で回す（①整理 → ②Codex 作成 → ③Claude Code チェック）

Orca（stablyai/orca）は、CLI エージェントを **作業ごとの git worktree** で並べて動かすデスクトップアプリ。
この環境では、②Codex による資料・ワイヤー作成と、③Claude Code によるチェック・ブラッシュアップを、Orca 上で自動で回すために使う。
分担の正本は `references/role-split.md`。ここは **Orca 上での回し方** だけを書く。

> CLI の引数は Orca の公式ドキュメント（https://www.onorca.dev/docs/cli/reference）に合わせてある。Orca は毎日更新されるので、コマンドが通らなければ `orca <サブコマンド> --help` を正とする。

---

## 1. 前提（Windows ローカル・初回だけ）

| # | やること | 確認方法 |
|---|---|---|
| 1 | Orca・git・node・gh・codex・claude を導入 | `scripts\setup-orca.ps1`（済：2026-09-27） |
| 2 | Codex にログイン | `codex` を一度起動してブラウザでログイン |
| 3 | このリポジトリを Orca に追加 | サイドバーの **Add Repo** → `C:\work\gg`。CLI なら `orca repo list --json`（済） |
| 4 | Orca CLI を有効化 | Settings → General → Orca CLI。`orca status --json` が通る（済） |
| 5 | エージェントに Orca CLI の Skill を入れる | `orca skills install --skill orca-cli`（済） |
| 6 | 定期実行「gg handoff pipeline」を登録 | `C:\work\gg` を main にして `powershell -ExecutionPolicy Bypass -File scripts\setup-orca-pipeline.ps1`。Orca の Automations 画面に出る |
| 7 | 自動実行中に承認待ちで止まらないようにする | **人間が判断して設定する**（§6） |

リポジトリ直下の `orca.yaml` で `node_modules` を各 worktree に共有し、`.worktreeinclude` で `.env` を各 worktree にコピーする。`node_modules` は元チェックアウトで一度 `npm ci` しておくこと。

---

## 2. 全体の流れ

| 工程 | 担当 | 場所 | 使う Skill | 出力 |
|---|---|---|---|---|
| ① 情報整理 → 依頼書 | Claude | claude.ai（クラウド可） | `gg-handoff` | `projects/<slug>/handoff/<日付>-<種類>-<名前>.md`（status: ready）を main へ |
| ② 資料・ワイヤー作成 | Codex | Orca（PC） | 依頼書の Context にある Skill | worktree にコミット |
| ③ チェック・ブラッシュアップ | Claude Code | Orca（PC）・同じ worktree | `gg-proposal-standard` ＋種類別の検品 | 修正コミット → PR（依頼書は status: review） |
| マージ | 人間 | GitHub | — | — |

②③の進行は `skills/gg-orca-flow/SKILL.md`。Orca の定期実行が 15 分ごとに呼ぶ。

---

## 3. 自動実行のしくみ

| 部品 | 役割 |
|---|---|
| Orca automation「gg handoff pipeline」 | 15 分ごと（cron `*/15 * * * *`）。`provider: claude` で進行役を起動する |
| precheck：`node C:/work/gg/scripts/handoff-scan.mjs --check` | main を pull し、未着手の `status: ready` が無ければ exit 1 → その回はスキップ（**エージェントを起動しないので費用がかからない**） |
| 進行役（Claude）→ `gg-orca-flow` | `handoff-scan.mjs --next` で1件取り出し → worktree 作成＋②Codex 起動 → 完了待ち → 同じ worktree で③Claude Code 起動 → 完了待ち → PR URL を記録 |
| 着手記録 `.orca-pipeline/claimed.json` | 同じ依頼書を二重に処理しない（Git 追跡外）。失敗時は `--release` で消して次回に再挑戦 |

**すぐ回したいとき**：PC の Claude Code（`C:\work\gg`）に「依頼書を今すぐ処理して」。または Orca の Automations 画面で「gg handoff pipeline」を手動実行。

依頼書の status：`ready`（①が作成）→ `review`（③が PR 作成）→ 人間がマージ。2回続けて失敗したものは `blocked`。

---

## 4. 自動判定（Claude Code のフック）

Claude Code は起動時と依頼送信時に `scripts/orca-context.mjs`（`.claude/settings.json` のフック）でモードを判定し、役割を決める。

| モード | 条件 | 役割 |
|---|---|---|
| A | Orca 管理の worktree 内（`ORCA_TERMINAL_HANDLE` あり、または `orca worktree current` が通る） | ③チェック担当、または gg-orca-flow の進行役（受け取った依頼文に従う） |
| B | Orca 起動中・worktree の外（元チェックアウト、デスクトップアプリの worktree 等） | 作成依頼は `gg-orca-flow` で②③に回す。自分では作らない |
| C | Orca に接続できない（クラウド／PC で Orca 未起動） | ①担当。作成依頼は `gg-handoff` で依頼書にする |

ワイヤー依頼（ワイヤー／WF／wireframe／画面設計／構成イメージ／たたき台／プロトタイプ）を送ると、Windows で Orca が止まっていれば `%LOCALAPPDATA%\Programs\orca\Orca.exe` を起動して最大 60 秒待つ。`orca` が PATH に無いプロセスでも `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe` を直接試す。人間が「Orca を使わずに」と言えばそちらを優先する。

---

## 5. 命名

| 対象 | 規則 | 例 |
|---|---|---|
| 依頼書 | `projects/<slug>/handoff/<YYYYMMDD>-<type>-<短い名前>.md` | `projects/tokyo-weld/handoff/20260928-wireframe-top.md` |
| worktree | `<slug>-<type>-<MMDD>` | `tokyo-weld-wireframe-0928` |
| PR タイトル | `<slug>: <依頼書タイトル>` | `tokyo-weld: 依頼：TOP・下層ワイヤー` |

案件スラッグは `AGENTS.md` 第2章の規約どおり（英小文字・数字・ハイフン）。

---

## 6. 自動実行で止まらないための設定（人間が判断する）

無人で回すには、②Codex と③Claude Code が承認待ちで止まらないことが必要。どちらも権限を広げる設定なので、**リポジトリには入れず、人間が PC で判断して設定する**。

| 対象 | 止まる場面 | 設定の考え方 |
|---|---|---|
| Codex | ファイル作成・コマンド実行の承認 | Orca のエージェント設定、または Codex の設定で、作業フォルダ内の書き込みを承認なしにする |
| Claude Code | ファイル編集、`git add/commit/push`、`gh pr create`、`python scripts/qa-wireframe.py`、`node scripts/handoff-scan.mjs`、`orca …` の実行 | `C:\work\gg` の Claude Code で `/permissions` から、上の操作だけを許可に追加する |

設定前でも仕組み自体は動くが、承認待ちで止まったら Orca の画面で承認する（=半自動）。

---

## 7. やらないこと

| NG | なぜ |
|---|---|
| ①（claude.ai）で成果物を作り始める | 作るのは②Codex。①は依頼書まで |
| ③の Claude が②を飛ばして一から作る | 分担が崩れ、Codex に逃がしたはずのトークンを払うことになる |
| 元チェックアウトで直接エージェントを走らせる | 並行作業が混ざる。必ず worktree を切る |
| PR を自動でマージする | マージは人間が決める |
| worktree の `outputs/` を当てにする | Git 追跡外なので worktree 間で共有されない |
| マージ済みの worktree を残す | どれが生きているか分からなくなる。マージ後に Orca で削除 |
