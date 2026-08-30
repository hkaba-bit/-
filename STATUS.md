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

### [2026-08-30] gg-proposal-deck の欠落9件を復旧 — Claude
- 成果物: `skills/gg-proposal-deck/` に `scripts/build_deck.js` / `assets/deck-schema.md` / `assets/deck-example.json` / `assets/deck-template.json` / `references/` 5本。`SKILL.md` の参照ファイル表とテンプレート節を実態に合わせて更新。`requirements.txt` に defusedxml・lxml
- 検証:
  - `deck-example.json`（5枚）と `deck-template.json`（40枚）から PPTX を生成 → `find-skill-script.py` で解決した pptx skill の `validate.py` が **All validations PASSED** ＝ **OK**
  - 壊れた deck.json（章扉の3点欠け／表の列数不一致／未知の type）を投げ、**生成せずに3件すべてを指摘して終了**することを確認 ＝ **OK**
  - `python3 scripts/check-skill-assets.py` が全6スキルで欠落0 ＝ **OK**
- 判断メモ:
  - **元データがないため、作れるものと作れないものを分けた。** 生成スクリプト・スキーマ・雛形は技術なのでこちらで実装。章構成・区分・時間配分・品質チェックリストは `SKILL.md` 本体に既に書かれていたので、そこから転記して `structure.md` `copy-rules.md` に落とした（新規に考えたものではない）
  - 会社の確定文言（`fixed-blocks.md`）と運用判断（`variants.md` `policy-rules.md`）は**空欄のまま**にした。会社紹介・強み・他社比較を推測で書くと、誤った内容を先方に出すことになる
  - 空欄を空欄と分かるようにするため、`SKILL.md` の参照ファイル表に「記入状態」列を追加し、「モードA・Bはこの空欄が埋まるまで完全には回らない」と明記した
  - `deck-template.json` は SKILL.md の章構成表を**パースして生成**した40枚。手で並べ直していないので表とズレない。SKILL.md が言う「81枚」は正本にしか存在しないため、記述を実態（40枚の枠）に直した
- 残課題: 下の「記入待ち」3件。埋まればモードA〜Cが通しで回る

### [2026-08-30] `/mnt/skills` 直書きの解消と、Skill 参照先の実在チェック — Claude
- 成果物: `skills/gg-proposal-deck/SKILL.md` / `skills/gg-sitemap-spec/SKILL.md` / `skills/gg-sitemap-spec/scripts/build_sitemap_xlsx.py` / `scripts/check-skill-assets.py` / `AGENTS.md` 第2章の環境スクリプト表
- 検証: `grep -rn '/mnt/skills' skills/` が **0件**。`check-skill-assets.py` が 6 スキルを走査し、gg-proposal-deck の欠落9件を検出 ＝ **OK**（検出器としては意図どおり）
- 判断メモ:
  - 承認をもらった3箇所を置換。あわせて同じコードブロック内のパスを**作業ルート相対に統一**した（`AGENTS.md` 第8章「パスを直書きせず作業ルートからの相対パスで書く」に合わせるため。cwd が Skill ディレクトリ前提のままだと置換後の行と噛み合わない）
  - 参照だけあって実体がない事故は今回もう一度起きるので、検出を `check-skill-assets.py` として常設化した
- 残課題: 要承認事項2（gg-proposal-deck の欠落9件）。**このスキルは現状使えない**

### [2026-08-30] スキル同梱スクリプトの実行検証と依存の明文化 — Claude
- 成果物: `package.json` / `package-lock.json` / `requirements.txt` / `scripts/find-skill-script.py` / `README.md`（導入手順）/ `AGENTS.md` 第2章の環境スクリプト表に1行追加
- 検証:
  - **仕様書 Excel の生成**：`skills/gg-sitemap-spec/scripts/build_sitemap_xlsx.py` に同梱の `sitemap_spec_example.json` を通し、6行・工程列14 の xlsx を生成 ＝ **OK**
  - **検証スクリプト**：`verify_sitemap_xlsx.py` が「集計行にキャッシュ値がない（recalc 未実施）」を正しく FAIL として検出 ＝ **OK**（スクリプトは意図どおり動く）
  - **PPTX 生成**：`npm ci` → pptxgenjs でスライド1枚を生成 ＝ **OK**（pptxgenjs 3.12.0 / react-icons 5.7.0 / sharp 0.33.5）
  - **PDF 変換**：**NG**。下の申し送り6を参照
  - `find-skill-script.py` が xlsx / pptx / gg-* のいずれもパス解決できること、未存在時に探索パスを出して終了コード1になることを確認 ＝ **OK**
- 判断メモ:
  - 依存が口伝だと案件ごとに再インストールになるため、`AGENTS.md` 第6章の技術スタックをそのまま `package.json` と `requirements.txt` に落とした。`npm ci` が通ることまで確認済み
  - `skills/` は「人間承認のうえ可」なので**書き換えていない**。下の要承認事項に修正案だけ置いた
- 残課題: 要承認事項1（`/mnt/skills` の直書き3箇所）

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
| 6 | **リモート実行環境（Claude Code on the web）では PDF 変換・目視 QA ができない。**LibreOffice が core のみで calc/impress/writer 未導入のため xlsx・pptx を読み込めず（`Error: source file could not be loaded`）、`pdftoppm` も無い。`AGENTS.md` 第6章の「生成 → PDF 変換 → 画像化して目視確認」まで完結できるのは Windows ローカルのみ | 2026-08-30 |
| 7 | 依存は `npm ci` と `pip install -r requirements.txt` で入れる。案件ディレクトリごとに個別インストールしない | 2026-08-30 |
| 8 | Skill 同梱スクリプトのパスを直書きしない。`python scripts/find-skill-script.py <skill> <スクリプト>` で解決する | 2026-08-30 |

---

## 要承認事項（`skills/` の変更は人間承認が要る）

### 1. Skill 内の `/mnt/skills/public/...` 直書き（3箇所）── **2026-08-30 承認・対応済み**

このパスは Anthropic の管理サンドボックスにしか存在しない。Windows ローカルにも Codex にも無いので、
書かれたとおりに実行すると必ず落ちる。`scripts/find-skill-script.py` を用意したので、次の置換を提案する。

| ファイル | 現状 | 置換案 |
|---|---|---|
| `skills/gg-proposal-deck/SKILL.md:54` | `python /mnt/skills/public/pptx/scripts/office/validate.py out.pptx` | `python "$(python scripts/find-skill-script.py pptx scripts/office/validate.py)" out.pptx` |
| `skills/gg-sitemap-spec/SKILL.md:100` | `python /mnt/skills/public/xlsx/scripts/recalc.py "$OUT"` | `python "$(python scripts/find-skill-script.py xlsx scripts/recalc.py)" "$OUT"` |
| `skills/gg-sitemap-spec/scripts/build_sitemap_xlsx.py:11`（docstring） | 同上 | 同上 |

承認を受けて適用済み。あわせて同じブロック内のパスを作業ルート相対に統一した。

---

### 2. `gg-proposal-deck` の欠落9件 ── **2026-08-30 対応済み（一部は記入待ち）**

`SKILL.md`（196行）は目次に近く、中身を9つのファイルに委ねているが、**そのどれも配布物に入っていない**。
`python scripts/check-skill-assets.py` で再現できる。

| 欠落ファイル | SKILL.md での位置づけ |
|---|---|
| `references/structure.md` | 章別スライド定義・全118Pの型 |
| `references/copy-rules.md` | 版面・文言・数字の規約 |
| `references/policy-rules.md` | **毎回必ず**読む社内の政策ルール。「未反映のルールがある状態で提案書を出さない」と明記 |
| `references/fixed-blocks.md` | 章13〜19の確定文言（P91–P118 の約28P） |
| `references/variants.md` | 案件類型による章の増減 |
| `assets/deck-schema.md` | `deck.json` の書式 |
| `assets/deck-example.json` | `deck.json` の雛形 |
| `assets/deck-template.json` | 81枚のテンプレート定義 |
| `scripts/build_deck.js` | PPTX 生成本体 |

9件すべてを配置し、`check-skill-assets.py` は欠落0になった。ただし中身は次の3段階に分かれる。

| 状態 | ファイル |
|---|---|
| 完成（技術） | `scripts/build_deck.js` ・ `assets/deck-schema.md` ・ `assets/deck-example.json` ・ `assets/deck-template.json` |
| SKILL.md から転記して完成 | `references/structure.md`（章構成・区分・時間配分）・ `references/copy-rules.md` |
| **記入待ち（蒲にしか書けない）** | `references/fixed-blocks.md` ・ `references/variants.md` ・ `references/policy-rules.md` |

---

## 記入待ち（蒲の情報が要る）

| # | ファイル | 要るもの | 最短の埋め方 |
|---|---|---|---|
| 1 | `skills/gg-proposal-deck/references/fixed-blocks.md` | 章13〜19（約28P）の確定文言。会社紹介・強み・チーム体制・他社比較・実績・担当紹介 | 直近の提出済み提案書 PPTX から該当ページを転記。ファイルを渡してもらえれば読み取って流し込む |
| 2 | `skills/gg-proposal-deck/references/variants.md` | 案件類型（コンペ／リニューアル／広告）ごとの章の増減と想定P数 | 直近3案件で実際に増減させた章を教えてもらえれば表に起こす |
| 3 | `skills/gg-proposal-deck/references/policy-rules.md` | 社内の政策ルール（現在0件） | ルールが出た時点で ID・反映先・記載文案の3点で追記 |

1 が埋まるまで、固定ブロックは毎回手作業になる。

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
