# STATUS.md

> このファイルは **進捗と申し送り専用**。ルール・規約は書かない（それは `AGENTS.md`）。
> 古い記録は下部の「アーカイブ」へ移し、上部は直近2週間程度に保つ。

---

## 記入書式

```
### [YYYY-MM-DD] 作業名 — 担当（Claude / Codex / 人間）
- 成果物: パス一覧
- 検証: 実施内容と結果（OK / NG）
- 判断メモ: 迷った点と選択理由
- 残課題: あれば。なければ「なし」
```

---

## 直近

### [2026-08-30] T5 動作確認 — Claude
- 成果物: なし（検証のみ）
- 検証:
  - Claude Code 側：`CLAUDE.md` → `AGENTS.md` を辿り、禁止事項を回答できることを確認（`.env`/APIキーの直書き禁止・`skills/*/assets/` の案件別書き換え禁止・未確認数値を「実績」と書かない）＝ **OK**
  - Codex 側：**未実施**。本作業は Claude Code on the web（リモートコンテナ）で行っており Codex を起動できない
- 判断メモ: `CLAUDE.md` は本セッション開始後に作成したため、セッション開始時の自動読込そのものは次回起動時に確認する
- 残課題: ローカル（Windows）で ①Claude Code 再起動後の自動読込 ②Codex 起動と `AGENTS.md` 読込 を確認し、結果をここに追記する

### [2026-08-30] T4 案件ディレクトリのテンプレ化 — Claude
- 成果物: `projects/_template/`（`STATUS.md` 雛形＋`outputs/.gitkeep`）/ `scripts/new-project.sh` / `scripts/new-project.ps1`
- 検証: `bash scripts/new-project.sh sample-check "サンプル案件"` で生成 → プレースホルダ（スラッグ・案件名・日付）が置換されることを確認。異常系（既存スラッグ／不正スラッグ `Bad_Slug`／引数なし）が全てエラー終了することを確認。検証用ディレクトリは削除済み ＝ **OK**
- 判断メモ: スラッグは `^[a-z0-9]+(-[a-z0-9]+)*$` で強制（AGENTS.md 第2章の規約をスクリプト側で担保）
- 残課題: なし

### [2026-08-30] T3 Skill の正本一元化 — Claude
- 成果物: `skills/`（gg-* 6本）/ `scripts/sync-skills.sh` / `scripts/sync-skills.ps1` / `scripts/check-skills-table.py` / `references/role-split.md` 第5章の改訂
- 検証: 同期スクリプトを実行し 6本すべてがシンボリックリンクで配布されること、再実行が冪等（skip）になることを確認。`python3 scripts/check-skills-table.py` が「AGENTS.md 記載 6件 / 実体 6件・一致」を返す ＝ **OK**
- 判断メモ:
  - Skill の実体は Claude 側の同期ディレクトリにあったものを `skills/` へコピーし、以後の正本をここに移した。今後は `skills/` のみを編集する
  - Windows はシンボリックリンクに開発者モード or 管理者権限が要るため、`.ps1` は失敗時に robocopy ミラーへ自動フォールバックする
  - 一覧表と実体のズレ（role-split.md が「一番起きやすい事故」と書いている箇所）は目視に頼らず `check-skills-table.py` で検知する形にした
- 残課題: `skills/` の共有範囲（蒲個人か事業部共有か）が未確定

### [2026-08-30] T2 認証情報の隔離 — Claude
- 成果物: `.gitignore` / `.env.example`
- 検証:
  - `AGENTS.md` `CLAUDE.md` `STATUS.md` `skills/` `references/` を全文検索。キーの値らしき文字列（`key=`＋12文字以上、`sk-` `AIza` `ghp_` `xox?-` `ya29.` `AKIA` `BEGIN PRIVATE KEY`）は **ヒット0件** ＝ **OK**
  - `git check-ignore` で `.env` `*.key` `node_modules/` `outputs/` 配下が除外され、`.env.example` と `outputs/.gitkeep` は追跡対象になることを確認 ＝ **OK**
- 判断メモ: MCP（Notion / Gmail / Drive / Calendar / Slack / Semrush / Supermetrics / Dropbox / Figma / Canva）は Claude 側の OAuth 接続なのでキー不要。`.env.example` はスクリプトから直接叩く場合のキー名だけに絞った
- 残課題: なし

### [2026-08-30] T1 ルールファイルの設置 — Claude
- 成果物: `AGENTS.md` / `CLAUDE.md` / `STATUS.md` / `README.md` / `references/role-split.md` / `references/00_SETUP-INSTRUCTIONS.md`
- 検証: 3ファイルが作業ルートに存在。`CLAUDE.md` 5行目に `@AGENTS.md` の参照行あり。`CLAUDE.md` は 56 行（上限 200 行）。`<TODO>` の残りは 0 件 ＝ **OK**
- 判断メモ:
  - `AGENTS.md` 第8章の環境情報は、実測できたリモート実行環境（Node v22.22.2 / Python 3.11.15）のみ記入。Windows ローカルの絶対パスとバージョンはこの環境から取得できないため、環境ごとの表にして未計測と明示した。あわせて「パスを直書きせず相対パスで書く」を規約化
  - 第2章に `references/` `projects/_template/` `.env.example` の行と「環境スクリプト」表を追加（実体に合わせた）
- 残課題: Windows ローカルの行を蒲が初回起動時に埋める

### [2026-08-30] 二刀流環境の初期構築 — 人間
- 成果物: `AGENTS.md` / `CLAUDE.md` / `STATUS.md`
- 検証: 未実施
- 判断メモ: ルール正本を `AGENTS.md` に一本化。`CLAUDE.md` は参照のみに留める方針
- 残課題: T1〜T5（`references/00_SETUP-INSTRUCTIONS.md` 参照）

---

## 進行中の案件

| 案件スラッグ | 状況 | 次アクション | 期日 |
|---|---|---|---|
| | | | |

---

## 環境の申し送り

| # | 内容 | 記録日 |
|---|---|---|
| 1 | Skill を改訂したら `AGENTS.md` 第5章の一覧表も更新する。検証は `python scripts/check-skills-table.py` | 2026-08-30 |
| 2 | `skills/*/assets/` の共通 CSS は案件ごとに書き換えない | 2026-08-30 |
| 3 | Skill の正本は `skills/` のみ。`~/.claude/skills/` 側を直接編集しない | 2026-08-30 |
| 4 | 案件ディレクトリは手で作らず `scripts/new-project.*` で作る | 2026-08-30 |
| 5 | `outputs/` と `.env` は Git 追跡外。納品物の実体をリポジトリに載せない | 2026-08-30 |

---

## 未確定事項（蒲の判断待ち）

| # | 論点 | 現状の暫定判断 | 記録日 |
|---|---|---|---|
| 1 | 作業ルートの場所（ローカルのみか Git 管理か） | Git 管理（`hkaba-bit/-` private）として構築。ローカルとリモートはこのリポジトリで同期する前提 | 2026-08-30 |
| 2 | Codex の起動形態（CLI / IDE 拡張 / クラウド） | 未確定。どれでも `AGENTS.md` を読める構成にしてある | 2026-08-30 |
| 3 | `skills/` の共有範囲（蒲個人 / 事業部共有） | 未確定。個人前提で構築。事業部共有にする場合は `.env` の扱いを再確認 | 2026-08-30 |
| 4 | ルート直下の `index.html`（リミックス様向け提案 HTML、既存コミット） | **触っていない。**AGENTS.md 第2章的には `projects/remix/` 配下が正しいが、公開 URL に紐づいている可能性があるため移動を保留。移すか消すかは蒲の判断 | 2026-08-30 |

---

## アーカイブ

（3ヶ月以上前の記録をここへ移動）
