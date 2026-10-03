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

### [2026-10-03] MCP で管理画面に入らず広告・解析を運用する（Supermetrics 解約前提） — Claude
- 経緯: 人間（蒲）から「Supermetrics は解約したいのでその前提で」。Supermetrics は優先アカウント8件/データソースの上限があり、ライセンスも 2026-11-01 まで
- 成果物: `references/mcp-ad-ops.md`（実装手順）/ `scripts/google_ads_ops_mcp.py`（自作 MCP：Google 広告の日予算・停止/再開・キーワード・除外キーワードを propose → apply の2段階で変更）/ `scripts/setup-ads-mcp.ps1`・`.sh`（公式 google-ads・analytics-mcp・Meta Ads MCP と google-ads-ops を Claude Code に登録）
- 検証: `google_ads_ops_mcp.py` を google-ads 33.0.0（API v25）で、偽のサービスに差し替えて実行＝**OK**（リクエスト組み立て・validate_only の切り替え・token 再利用拒否・提案後の値変化の検知・不正入力の拒否・ツール9件の登録）。`setup-ads-mcp.sh` を偽 claude/pipx/gcloud で実行＝**OK**。`.ps1` は UTF-8 BOM・CRLF で保存。pwsh が無いため構文チェックは **未実施**。実アカウントへの接続・反映は **未確認**（開発者トークン発行後に研修用テストアカウントで確認）
- 判断メモ:
  - 公式 Google Ads MCP は読み取り専用（Google の方針）なので、書き込みだけの小さな MCP を自作した。反映は apply_change に限定し、Claude Code の許可プロンプトで毎回人間が承認する前提
  - Meta は公式 MCP が読み書きできるので自作しない。取り消しが無いため依頼文で「OK まで反映しない」を指定する運用にした
  - Supermetrics のチーム設定に入れた運用ルールは解約で消えてよい（同内容を手順書第7章に移した）
- 残課題（人間）: Google 広告 API の開発者トークン申請／Meta 公式 MCP 接続／`setup-ads-mcp.ps1`／gg-manager で GA4・Search Console 連携／Supermetrics 依存レポートの確認→解約／CLAUDE.md の MCP 節と AGENTS.md 第2章の更新

### [2026-10-03] Codex 起点で ③ Claude Code を自動起動 — Claude
- 経緯: 人間（蒲）から「毎回うまく機能していない。Codex 起点で自動で動くようにしたい」。確認すると main に依頼書は1件も無く、claude.ai 起点のパイプライン（2026-09-28）は一度も実走していなかった。①がクラウドのため、依頼書を main に入れる段で止まりやすい構造だった
- 成果物: `.codex/hooks.json`（Codex の Stop フック）/ `scripts/codex-stop.mjs` / `AGENTS.md` 第2・4・9章（Codex へのルール：成果物を作り終えたら最後の行を `②完了`）/ `CLAUDE.md` / `references/orca-workflow.md` §1・§2（Codex 起点を基本に）・§2.5・§3 / `references/role-split.md` 4.5
- 検証: `codex-stop.mjs` を偽 orca で7ケース ＝ **OK**（合図なし→何もしない／stop_hook_active→何もしない／`②完了`→Orca ターミナルで claude 起動／同じ状態の2回目→起動しない／変更が増えた→再起動／Orca なし・Linux→起動も記録もしない／worktree から→`path:<worktree>` で起動し記録は元チェックアウト）。Codex のフック仕様（`.codex/hooks.json`、Stop の入力 `cwd` `last_assistant_message` `stop_hook_active`、Windows は cmd.exe /C、hooks 機能は既定で有効）は openai/codex のソースで確認。Windows 実機は **未確認**
- 判断メモ:
  - 合図はファイル差分ではなく Codex の最終メッセージの `②完了` にした。Codex は質問や途中報告でもターンを終えるため、差分だけで判定すると③が早すぎる・空振りする
  - 起動先は Orca（同じ worktree のターミナル）を優先し、Orca に接続できないときは Windows の新しいコンソールで起動する（どちらでも必ず③が始まる）
  - claude.ai 起点（依頼書＋定期実行）は残したが、任意の経路に格下げした
- 残課題（人間・Windows）:
  1. `git pull`
  2. `C:\work\gg` で `codex` を起動し、プロジェクトフック（`.codex/hooks.json`）を信頼する。フックが認識されなければ `npm install -g @openai/codex` で更新
  3. Codex に「test5 の TOP ワイヤーを作って」と頼み、終了時に `②完了` → Claude Code が自動で開くことを確認

### [2026-09-28] 分担改定と Orca 自動パイプライン（①整理 → ②Codex 作成 → ③Claude Code チェック） — Claude
- 経緯: 人間（蒲）の指示で分担を改定。①claude.ai で情報整理、②Codex で資料・ワイヤー作成、③Claude Code でチェック・ブラッシュアップ、②③は Orca で自動
- 成果物: `skills/gg-handoff/SKILL.md`（新規・①）/ `skills/gg-orca-flow/SKILL.md`（②③の進行役に書き直し）/ `scripts/handoff-scan.mjs` / `scripts/setup-orca-pipeline.ps1` / `scripts/orca-context.mjs`（モード文言）/ `references/orca-workflow.md`（全面改訂）/ `references/role-split.md` 第2章・4.5・第6章 / `AGENTS.md` 第2・4・5・9章 / `CLAUDE.md` / `.gitignore`（`.orca-pipeline/`）
- 検証: `handoff-scan.mjs` を元チェックアウトと worktree の両方から実行 ＝ **OK**（ready のみ検出・draft は除外／worktree からでも元チェックアウトの依頼書を見る／着手後は再取得しない／`--release` で再取得可・Windows 区切りも可）。`orca-context.mjs` のモード出力 ＝ **OK**。`setup-orca-pipeline.ps1` は pwsh で構文エラー 0（UTF-8 BOM）。Orca 上の実走は **未確認**
- 判断メモ:
  - クラウド（①）から PC に直接指示できないため、受け渡しは Git（main 上の依頼書）にした。Orca automation の precheck で「依頼書が無い回はエージェントを起動しない」ようにし、費用を抑えた
  - 二重処理防止は Git ではなく PC ローカルの着手記録にした（main への書き戻しで衝突させない）
  - 自動実行で承認待ちに止まらないための権限設定は、権限を広げる変更なのでリポジトリに入れず人間の判断に残した（orca-workflow.md §6）
- 残課題（人間・Windows）:
  1. `git pull` → `sync-skills.ps1`（gg-handoff 追加・gg-orca-flow 更新）
  2. `scripts\setup-orca-pipeline.ps1` で定期実行を登録（最初は `-Disabled` で登録して手動実行でもよい）
  3. orca-workflow.md §6 の権限設定を判断
  4. テスト用の依頼書で1周（① → main → Orca が②③ → PR）

### [2026-09-28] デスクトップアプリで Orca を検出できない問題の修正 — Claude
- 事象: Claude デスクトップアプリ（ローカル）でワイヤーを依頼したところ、フックがモード C を出し、Claude が「クラウドで実行された」と誤って報告した。作業は `claude/upbeat-franklin-6cy1l0`（デスクトップアプリが作る worktree）で行われた
- 原因（推定）: デスクトップアプリが Orca CLI 登録前に起動しており PATH に `orca` が無い。加えて、モード C の文言「クラウド等」が誤解を招いた。また、デスクトップアプリの worktree は git 上は linked worktree なので、Orca 起動中ならモード A と誤判定するおそれがあった
- 成果物: `scripts/orca-context.mjs` / `CLAUDE.md` / `references/orca-workflow.md`
  - Windows では PATH に無くても `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe`（Orca 同梱 CLI）を直接試す
  - モード A は Orca 管理の worktree に限定（`ORCA_TERMINAL_HANDLE` か `orca worktree current` 成功）。デスクトップアプリの worktree はモード B
  - Windows のモード C は「この PC 上で動いているが Orca CLI に接続できない。クラウドではない」と出す
- 検証: 偽 orca で7ケース ＝ **OK**（元チェックアウト→B／Orca が知らない worktree→B／Orca 管理 worktree→A／Orca ターミナル→A／ワイヤー依頼＋デスクトップ worktree→B と worktree 作成手順／Orca なし→C／非ワイヤー→無出力）。同梱 CLI のパスは Orca ソース `src/main/cli/bundled-cli-launcher-path.ts` で確認。Windows 実機は **未確認**
- 残課題: デスクトップアプリ（ローカル・`C:\work\gg`）で「今のOrcaモードは？」→ B、Orca を閉じてワイヤー依頼 → Orca 起動、を確認

### [2026-09-28] ワイヤー依頼で Orca を自動起動 — Claude
- 成果物: `scripts/orca-context.mjs`（`--on-prompt` 追加）/ `.claude/settings.json`（UserPromptSubmit フック）/ `CLAUDE.md` / `references/orca-workflow.md` 1.5 / `AGENTS.md` 第2・9章
- 検証: Linux で7ケース ＝ **OK**（非ワイヤー依頼→無出力／ワイヤー＋Orca なし→モード C／WF＋偽 orca＋元チェックアウト→モード B と worktree 手順／worktree 内→モード A と「この worktree で進める」／壊れた JSON→無出力・exit 0／SessionStart は従来どおり／「WFH」は非該当）。Orca.exe の自動起動は Windows 実機 **未確認**
- 判断メモ:
  - SessionStart だけだと Orca 未起動のまま始めたセッションはモード C に固定される。依頼ごとに判定し直すため UserPromptSubmit を使った
  - ワイヤー以外では何も出さない（毎回のコンテキストを増やさない）。検知語は gg-wireframe の description に揃えた
  - 起動待ちは最大60秒。フックの timeout は 90 秒
- 残課題: Windows で Orca を閉じた状態から「〇〇のワイヤーを作って」と送り、Orca が起動して `[Orca] ワイヤー依頼を検知し、Orca を起動した。` が効くか確認

### [2026-09-28] Claude Code 起動時に Orca 運用へ自動で乗せる — Claude
- 成果物: `scripts/orca-context.mjs` / `.claude/settings.json`（SessionStart フック）/ `CLAUDE.md`「Orca 運用（自動）」/ `skills/gg-orca-flow` 手順1 / `references/orca-workflow.md` 1.5 / `AGENTS.md` 第2章・第9章
- 検証: Linux で3モードを再現 ＝ **OK**（C：orca 無し／B：偽 orca＋元チェックアウト／A：偽 orca＋`git worktree add` した worktree／orca 応答が reachable:false → C）。`$CLAUDE_PROJECT_DIR` 経由の実行も確認。Windows 実機は **未確認**
- 判断メモ:
  - worktree 判定は Orca の API ではなく git（`--git-dir` と `--git-common-dir` の不一致）で行う。Orca のバージョン差に左右されない
  - モード判定は「文脈を1行渡すだけ」にして、動き方のルールは CLAUDE.md に置いた（フックにロジックを持たせない）
  - Codex はレビュー担当なので worktree を切らない。よってこのルールは AGENTS.md ではなく CLAUDE.md に置いた
- 残課題: なし。2026-09-28 Windows 実機で確認 ＝ **OK**（`node scripts\orca-context.mjs` がモード B を出力。`C:\work\gg` で起動した Claude Code が「今のOrcaモードは？」にモード B と回答＝フック経由で文脈が渡っている）

### [2026-09-27] Orca をワークフローに組み込み — Claude
- 成果物: `references/orca-workflow.md` / `skills/gg-orca-flow/SKILL.md` / `orca.yaml` / `.worktreeinclude` / `AGENTS.md` 第4・5・8・9章 / `references/role-split.md` 4.5
- 検証: `python3 scripts/check-skills-table.py` が一致を返す。CLI の引数は Orca 公式ドキュメント（docs/site/content/docs/cli/*.mdx）と照合。実機での CLI 実行は **未実施**
- 判断メモ:
  - 分担と引き渡しの型は role-split.md のまま変えず、「Orca 上でどう回すか」だけを別ファイルに切り出した（正本の二重化を避ける）
  - worktree ごとの `npm ci` を避けるため `orca.yaml` で `node_modules` を共有。`.env` は `.worktreeinclude` でコピー（実体が無ければ Orca が無視する）
  - Orchestration は Experimental なので任意扱い。基本は worktree＋terminal コマンドで回す
- 残課題（人間・Windows で1回だけ）— 2026-09-27 実施:
  1. `sync-skills.ps1` で `gg-orca-flow` を配布 ＝ **OK**（シンボリックリンク不可のためコピー同期。Skill 更新のたびに再実行が必要）
  2. 元チェックアウト `C:\work\gg` で `npm ci` ＝ **OK**（audit で high 2件：sharp / image-size。別タスクで対応）
  3. Orca にリポジトリを追加 ＝ **OK**（displayName `gg`、`C:/work/gg`、remote `github.com/hkaba-bit/-`）
  4. Orca CLI 有効化 ＝ **OK**（`orca status --json` ok、Orca 1.4.215）
  5. `orca-cli` Skill ＝ **OK**（`~\.agents\skills\orca-cli`、Codex と Claude Code に配布）
  6. PR #5 マージ後、小さな依頼で §3 の流れを1周し、通らなかったコマンドを orca-workflow.md に反映 ＝ 未実施（モード判定までは確認済み。worktree 作成 → Codex レビューの実走が未）

### [2026-09-27] Windows への Orca 導入 — Claude＋人間
- 成果物: `scripts/setup-orca.ps1`
- 検証:
  - クラウド側：インストーラー（NSIS 3.04・ユーザー単位導入）の Authenticode を osslsigncode / openssl で確認。署名者 SignPath Foundation → GlobalSign GCC R45 CA → Code Signing Root R45、digest 一致、EKU=Code Signing ＝ **OK**（CRL 取得はプロキシで不可）。pwsh 7.5.3 で構文エラー 0
  - 実機（人間が実行）：手順1〜6 成功、署名 Valid、サイレント導入完了。git 2.48.1 / node v22.14.0 / gh 2.101.0 / codex-cli 0.157.1 / claude 2.1.251、`gh auth status` hkaba-bit ログイン済み、Orca は `%LOCALAPPDATA%\Programs\orca\Orca.exe` で起動確認 ＝ **OK**
- 判断メモ:
  - 実機で出た不具合2件をスクリプトに反映：①Windows PowerShell 5.1 は `Stop` 下で native コマンドの stderr が終了エラーになり、gh 未ログイン時に手順7で止まる → まとめ部分は `Continue` ②npm のグローバル bin（`%APPDATA%\npm`）が PATH に無く codex を検出できない → ユーザー PATH に追加
  - 日本語を含むため `.ps1` は UTF-8 BOM 付き（5.1 が BOM 無しを ANSI で読むため）
- 残課題: 修正後のスクリプトは未実行（次に別 PC で導入するときに通しで確認）

### [2026-08-30] ワイヤー／Artifact の実物 QA と、検品の自動化 — Claude
- 成果物: `scripts/qa-wireframe.py` / `AGENTS.md` 第2章の環境スクリプト表に1行
- 検証（Chromium で実際にレンダリングして確認）:
  - `gg-wireframe` の `example-corporate-top.html` ・ `_page-template.html`：コンソールエラー0、`wireframe.css` 適用済み（container-type: inline-size）、PC 1280px → SP 390px、**グリッドが3列→1列に実際に組み替わる**、注釈トグルも動作 ＝ **OK**
  - 目視でも確認：SP でヒーローが縦積み、統計4つ→2×2、フッター4列→2列、ハンバーガーと固定CTAバーが出現。SKILL.md が言う「会議中の見せ場」は成立する
  - `gg-proposal-artifact` の `_artifact-template.html`：コンソールエラー0、外部リソース読み込み0（CSP に引っかからない）、フェーズ切替・任意項目チェック・費用集計が描画される ＝ **OK**
  - `qa-wireframe.py` 自体の検証：正常なページで OK、`@container` を `@media` に置換した壊れたページで **NG を出す**ことを確認
- 判断メモ:
  - 最初の実装は `grid-template-columns` の px 文字列を比較していて、**キャンバスが縮んだだけの変化を「組み替わった」と誤判定**した。列数で比べるように直して、メディアクエリで組んだページを検出できるようにした
  - `skills/gg-wireframe/assets/` を直接かけると `index.html` へのリンク切れが出るが、これは仕様どおり（index.html は案件ごとに作るハブ）。このスクリプトは案件のワイヤーにかけるもの
- 残課題: 下の小さな要承認事項1件

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
| 9 | Orca では 1工程＝1 worktree。元チェックアウトで直接エージェントを走らせない（`references/orca-workflow.md`） | 2026-09-27 |
| 10 | 日本語を含む `.ps1` は UTF-8（BOM 付き）で保存する。`sync-skills.ps1` が BOM 無しで 5.1 から実行できなかった（2026-09-27 修正） | 2026-09-27 |

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

## 小さな要承認事項

| # | 対象 | 内容 |
|---|---|---|
| 1 | `skills/gg-proposal-artifact/assets/_artifact-template.html` | `<title>` タグがない。商談で画面共有したときブラウザのタブにファイルパスが出る。`<title>{案件名}｜{型の名前}</title>` を追加したい（`gg-wireframe` 側のテンプレートには入っている） |

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
