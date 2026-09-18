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

- 案件スラッグは英小文字ハイフン（例：`bikkuri-donkey`、`lizon`、`tokyo-weld`）
- 生成物は必ず案件ディレクトリ配下。ルート直下にファイルを散らかさない

### 環境スクリプト

| コマンド（Windows / それ以外） | 用途 |
|---|---|
| `scripts\new-project.ps1 <slug> "案件名"` / `bash scripts/new-project.sh <slug> "案件名"` | 案件ディレクトリを `projects/_template/` から作る |
| `scripts\sync-skills.ps1` / `bash scripts/sync-skills.sh` | `skills/` を Claude Code 側（`~/.claude/skills/`）へ配布 |
| `python scripts/check-skills-table.py` | 第5章の一覧表と `skills/` の実体が一致しているか検証 |
| `python scripts/find-skill-script.py <skill> <スクリプト>` | Skill 同梱スクリプトの実パスを解決（環境ごとに置き場所が違うため直書きしない） |
| `python scripts/check-skill-assets.py` | SKILL.md が参照する assets / scripts / references が実在するか検証 |
| `python scripts/qa-wireframe.py <HTML...>` | ワイヤーを実際に開いて検品（JSエラー・SP切替・組み替わり・リンク切れ） |
| `python scripts/kickoff-project.py --slug <slug> --json <案件.json>` | 案件ディレクトリを作り、gg-manager の案件JSONから与件の骨組みを書き出す |

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

詳細は `references/role-split.md`。要約：

| 工程 | 担当 | 理由 |
|---|---|---|
| 与件整理・戦略設計・提案骨子 | **Claude** | 長い文脈の統合と論点の一貫性 |
| PPTX / Excel / HTML の初回生成 | **Claude** | Skill を自動読込できる |
| 定型実装・リファクタ・型付け | **Codex** | トークン効率 |
| 生成物のレビュー・バグ検出 | **Codex** | 実装者と別の目を通す |
| 最終判断・クライアント向け文言 | **人間（蒲）** | — |

**原則：Claude で実装 → Codex でレビュー。** 逆順にしない。

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
| `gg-project-kickoff` | 新規案件の立ち上げ（与件整理→分割→検品・統合） | `skills/gg-project-kickoff/SKILL.md` |

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
- 生成スクリプトは必ず「生成 → PDF 変換 → 画像化して目視確認」まで実行してから完了とする
- **`.ps1` は UTF-8 **BOM付き** で保存する。**Windows PowerShell 5.1 は BOM がない `.ps1` を ANSI（CP932）として読むため、日本語コメントが化けてパースが壊れる（`MissingEndCurlyBrace`）

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
| Windows ローカル（蒲） | `C:\Users\hero\gg-workspace` | v22.14.0 | **未導入**（仕様書 Excel の生成のみ不可） |
| Claude Code on the web | `/home/user/-` | v22.22.2 | 3.11.15 |

- Git：`hkaba-bit/-`（private）。ローカルとリモートはこのリポジトリ経由で同期する
- OS：ローカルは Windows、リモート実行環境は Linux。スクリプトは `.ps1` と `.sh` を対で置く
- `outputs/` は Git 追跡外（`.gitignore` 済み）。納品物の実体はリポジトリに載せない
- Windows ローカルは Git 2.48.1。**OneDrive 配下に作業ルートを置かない**（`node_modules` と `.git` の同期でトラブルになる）
- Windows ローカルは開発者モードが無効のため、`sync-skills.ps1` はコピー同期で動く。**`skills/` を編集したら毎回実行し直す**

---

## 9. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-30 | 初版 |
| 2026-08-30 | 第8章の環境情報を実測値で記入。第2章に `references/` `projects/_template/` `.env.example` を追加 |
