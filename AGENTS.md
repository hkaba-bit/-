# AGENTS.md — 共通ルール正本

このファイルは **Claude Code と Codex の両方が従う唯一のルール正本**。
Claude Code は `CLAUDE.md` からこのファイルを参照する。ルールの追記・変更はここだけで行う。

---

## 1. この環境の目的

GrowGroup プロデューサー事業部の提案業務（コンペ／リニューアル提案／広告提案）で使う成果物を、
AI エージェント2種で分担して生成・検証する。エンジニアリング専業のリポジトリではない。

主な成果物：提案書 PPTX ／ 仕様書（サイトマップ Excel） ／ クリッカブル HTML ワイヤーフレーム ／ インタラクティブ Artifact ／ 調査レポート Markdown

---

## 2. ディレクトリ規約

| パス | 用途 | 書き込み |
|---|---|---|
| `AGENTS.md` | ルール正本 | 人間のみ |
| `CLAUDE.md` | Claude Code 用の薄い入口 | 人間のみ |
| `STATUS.md` | 全体の進捗・申し送り | エージェント可 |
| `skills/` | Skill 正本 | 人間承認のうえ可 |
| `scripts/` | 共通スクリプト | 可 |
| `projects/<案件スラッグ>/` | 案件作業 | 可 |
| `projects/<案件スラッグ>/outputs/` | 納品候補 | 可（Git 追跡外） |
| `projects/_template/` | 案件ディレクトリの雛形 | 人間承認のうえ可 |
| `references/` | 環境まわりのドキュメント | 可 |
| `.env` | 認証情報 | **読み書き禁止（人間のみ）** |
| `.env.example` | キー名のみ（値は空） | 可 |
| `.claude/settings.json` | Claude Code のプロジェクト設定（SessionStart フック） | 人間承認のうえ可 |
| `.codex/hooks.json` | Codex のプロジェクトフック（Stop → ③ 起動） | 人間承認のうえ可 |
| `orca.yaml` / `.worktreeinclude` | Orca の worktree 設定（共有する依存・コピーする追跡外ファイル） | 人間承認のうえ可 |

- 案件スラッグは英小文字ハイフン（例：`bikkuri-donkey`、`lizon`、`tokyo-weld`）
- 生成物は必ず案件ディレクトリ配下。ルート直下にファイルを散らかさない

### 環境スクリプト

| コマンド（Windows / それ以外） | 用途 |
|---|---|
| `scripts\new-project.ps1 <slug> "案件名"` / `bash scripts/new-project.sh <slug> "案件名"` | 案件ディレクトリを `projects/_template/` から作る |
| `scripts\sync-skills.ps1` / `bash scripts/sync-skills.sh` | `skills/` を Claude Code 側（`~/.claude/skills/`）へ配布 |
| `scripts\setup-orca.ps1`（Windows のみ） | Orca（stablyai/orca）と Git・Node・gh・Codex CLI を導入。インストーラーの署名が Valid かつ署名者が SignPath Foundation でなければ中止する |
| `node scripts/orca-context.mjs` | Orca 運用モード（A: worktree 内 / B: 元チェックアウト / C: Orca 不可）を判定。Claude Code の SessionStart フックから自動実行。`--on-prompt` はワイヤー依頼時に Orca を自動起動（UserPromptSubmit フック） |
| `scripts\setup-orca-pipeline.ps1`（Windows のみ） | Orca に定期実行「gg handoff pipeline」（15分ごと）を登録 |
| `node scripts/handoff-scan.mjs --check / --next / --release / --list` | 依頼書（status: ready）の検出と着手記録。Orca の定期実行から使う。`runner: dots` の依頼書は拾わない（Dots が処理） |
| `node scripts/codex-stop.mjs`（Codex の Stop フックから自動実行） | Codex が `②完了` で終えたら、同じ作業フォルダで ③ Claude Code を起動（Orca のターミナル、無ければ新しいコンソール） |
| `python scripts/check-skills-table.py` | 第5章の一覧表と `skills/` の実体が一致しているか検証 |
| `python scripts/find-skill-script.py <skill> <スクリプト>` | Skill 同梱スクリプトの実パスを解決（環境ごとに置き場所が違うため直書きしない） |
| `python scripts/check-skill-assets.py` | SKILL.md が参照する assets / scripts / references が実在するか検証 |
| `python scripts/qa-wireframe.py <HTML...>` | ワイヤーを実際に開いて検品（JSエラー・SP切替・組み替わり・リンク切れ） |

---

## 3. 禁止事項

1. `.env` の中身、API キー、パスワード、クライアントの個人情報を**プロンプト・コミットメッセージ・Markdown に直書きしない**
2. `AGENTS.md` / `CLAUDE.md` / `STATUS.md` / `skills/` 配下に認証情報を書かない
3. `skills/*/assets/` の共通 CSS・テンプレートを**案件ごとに書き換えない**（流用性が壊れる）
4. クライアント実名・見積金額を含むファイルを外部サービスへ送信しない
5. 既存の認証設定・デプロイ設定を確認なく変更しない
6. 未確認の数値を「実績」として書かない（推定は必ず「推定」と明記）

---

## 4. 役割分担（Claude / Codex）

詳細は `references/role-split.md`。要約（2026-09-28 改定）：

| 工程 | 担当 | 場所 | 理由 |
|---|---|---|---|
| ① 与件整理・戦略設計・提案骨子・依頼書作成 | **Claude** | claude.ai | 長い文脈の統合と論点の一貫性。MCP（調査）を持つ |
| ② 資料・ワイヤー・Excel の作成 | **Codex** | Orca（PC） | トークン効率。依頼書と Skill に従って作る |
| ③ チェック・ブラッシュアップ | **Claude Code** | Orca（PC）・②と同じ worktree | 判断基準（`gg-proposal-standard`）で検品し、その場で直す |
| 最終判断・マージ・クライアント向け文言 | **人間（蒲）** | — | — |

**原則：① Claude が整理 → ② Codex が作る → ③ Claude Code がチェック。** 作った側（Codex）に検品させない。
③ は ② の終了を合図に自動で起動する（`.codex/hooks.json` → `scripts/codex-stop.mjs`）。手順は `references/orca-workflow.md`。
PC を使わない経路として、OpenAI Dots が依頼書を拾い、②を Codex クラウド、③を Claude Code クラウドの定期実行で回す方法もある（依頼書の `runner: dots`。手順は `references/dots-workflow.md`）。

### Codex（②）へのルール
- 資料・ワイヤー・Excel などの成果物を作り終えたら、**最終メッセージの最後の行を `②完了` だけにする**。これが ③ Claude Code を自動起動する合図になる
- 作成の途中、質問への回答、相談、作業を中断するときは `②完了` を書かない（③ が空振りする）
- 成果物は `projects/<案件スラッグ>/` 配下に置く。コミットはしてよいが、push・PR 作成・マージはしない（③ が行う）
- 依頼書（`projects/<slug>/handoff/*.md`）があれば、その Goal / Context / Constraints / Done when に従う

### Codex がクラウドで動くとき（OpenAI Dots から起動された場合）
PC ではなくクラウドで起動され、依頼書（`runner: dots`）を渡されたときは、上のルールのうち「push・PR 作成はしない」だけを次で置き換える。③ はクラウドの Claude Code が PR を拾って行う（`references/dots-workflow.md`）。
- 作業ブランチで作り、**PR まで作る**（マージはしない）
- 同じ PR の中で、依頼書の front matter を `status: ready` → `status: review` に変える
- PR タイトルは `<slug>: <依頼書タイトル> [handoff:<依頼書のファイル名から .md を除いたもの>]`
- PR 本文には、依頼書のパス／作ったファイル一覧／Done when の各項目をどう確かめたか／要確認として残した点を書く
- 最終メッセージの最後の行は、PC と同じく `②完了`

---

## 5. Skill 参照（Codex 向け）

Codex は Skill を自動読込しない。該当する作業のときは以下のパスを自分で開くこと。

| Skill | 使う場面 | パス |
|---|---|---|
| `gg-proposal-standard` | 提案の判断基準・レビュー・RFP適合チェック | `skills/gg-proposal-standard/SKILL.md` |
| `gg-proposal-deck` | 提案書 PPTX の章立て・版面・文言規約 | `skills/gg-proposal-deck/SKILL.md` |
| `gg-wireframe` | モノクロ・クリッカブル HTML ワイヤー | `skills/gg-wireframe/SKILL.md` |
| `gg-sitemap-spec` | 仕様書（サイトマップ Excel）・見積の下地 | `skills/gg-sitemap-spec/SKILL.md` |
| `gg-proposal-artifact` | 商談で触ってもらうインタラクティブ資料 | `skills/gg-proposal-artifact/SKILL.md` |
| `gg-calendar-task` | 議事録からのタスク化・カレンダー登録 | `skills/gg-calendar-task/SKILL.md` |
| `gg-handoff` | ①で与件を整理し、②③に渡す依頼書を作って main に入れる | `skills/gg-handoff/SKILL.md` |
| `gg-orca-flow` | Orca 上で依頼書を1件取り出し、②Codex 作成 → ③Claude Code チェック → PR まで回す | `skills/gg-orca-flow/SKILL.md` |

> Skill を追加・改訂したら **この表も同時に更新する**。表と実体がずれた時点で Codex 側は機能しない。

---

## 6. 技術スタックと規約

| 用途 | ツール |
|---|---|
| PPTX 生成 | Node.js + `pptxgenjs`（アイコンは `react-icons` + `sharp` でラスタライズ） |
| Excel 生成 | Python + `openpyxl` |
| PDF 変換 | LibreOffice `soffice` |
| 目視 QA | `pdftoppm` で画像化して確認 |
| ワイヤー | 素の HTML + `skills/gg-wireframe/assets/wireframe.css`（**無編集で使う**） |

コード規約：
- TypeScript を使う場合は `any` 禁止
- スクリプトは `scripts/` に置き、案件ディレクトリにコピーしない
- 日本語を含む `.ps1` は **UTF-8（BOM 付き）** で保存する。BOM が無いと Windows PowerShell 5.1 が Shift-JIS として読み、構文エラーになる
- 生成スクリプトは必ず「生成 → PDF 変換 → 画像化して目視確認」まで実行してから完了とする

---

## 7. 作業の進め方

1. **/plan で計画を出してから着手**（特に複数ファイルを触る場合）
2. タスクが変わったら `/clear`。マイルストーンで `/compact`
3. 完了時に `STATUS.md` へ追記
4. エラーは生ログを丸ごと読ませず、該当箇所とスタックトレースだけを渡す

---

## 8. 環境情報

作業ルートは環境ごとに異なる。**パスを直書きせず、常に作業ルートからの相対パスで書く。**

| 環境 | 作業ルート | Node.js | Python |
|---|---|---|---|
| Windows ローカル（蒲） | `C:\work\gg` | v22.14.0 | `<未計測>` |
| Claude Code on the web | `/home/user/-` | v22.22.2 | 3.11.15 |

- Git：`hkaba-bit/-`（private）。ローカルとリモートはこのリポジトリ経由で同期する
- OS：ローカルは Windows、リモート実行環境は Linux。スクリプトは `.ps1` と `.sh` を対で置く
- `outputs/` は Git 追跡外（`.gitignore` 済み）。納品物の実体はリポジトリに載せない

---

## 9. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-30 | 初版 |
| 2026-08-30 | 第8章の環境情報を実測値で記入。第2章に `references/` `projects/_template/` `.env.example` を追加 |
| 2026-09-27 | 第4章に Orca での運用を追記。第5章に `gg-orca-flow` を追加。第2章に `setup-orca.ps1`、第8章に Windows の Node 実測値 |
| 2026-09-28 | 第2章に `.claude/settings.json` と `orca-context.mjs` を追加（Claude Code 起動時に Orca 運用モードを自動判定） |
| 2026-09-28 | 第2章 `orca-context.mjs` に `--on-prompt`（ワイヤー依頼時に Orca を自動起動）を追記 |
| 2026-09-28 | 第4章の分担を改定（①Claude 整理 → ②Codex 作成 → ③Claude Code チェック）。第2章に `setup-orca-pipeline.ps1` `handoff-scan.mjs`、第5章に `gg-handoff` |
| 2026-10-03 | 第4章に Codex（②）へのルール（終了時に `②完了`）を追加。②の終了で ③ を自動起動（`.codex/hooks.json`、`codex-stop.mjs`）。第2章に追記 |
| 2026-10-03 | 第4章に「Codex がクラウドで動くとき」（OpenAI Dots 経由。PR まで作る）を追加。依頼書の `runner: dots` で Orca 経路と振り分け |
