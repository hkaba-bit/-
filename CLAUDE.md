# CLAUDE.md

## 最初に読むもの

**共通ルールの正本は @AGENTS.md。** このファイルには Claude Code 固有のことだけを書く。
ルールを足したくなったら、まず `AGENTS.md` に書けないか考えること。ここに増やさない。

## 現在の状況

進捗・申し送りは @STATUS.md。案件単位の状況は `projects/<案件スラッグ>/STATUS.md`。

---

## Claude Code 固有の運用

### Skill
`~/.claude/skills/` に `skills/` からリンク済み。該当作業では自動で読み込まれる。
読み込まれない場合は `skills/` 側の `SKILL.md` を直接開く。

### Orca 運用（自動）
分担は ①Claude（claude.ai）で情報整理 → 依頼書 → ②Codex が資料・ワイヤーを作成 → ③Claude Code がチェック・ブラッシュアップ → PR。②③は PC の Orca が自動で回す（`references/orca-workflow.md`）。

Codex が `②完了` で作業を終えると、Codex の Stop フック（`scripts/codex-stop.mjs`）が同じ作業フォルダでこの Claude Code を ③ として起動する。最初のメッセージで渡される依頼ファイル（`.orca-pipeline/review-*.md`）に従う。

セッション開始時と依頼送信時に `.claude/settings.json` のフックが `scripts/orca-context.mjs` を実行し、`[Orca モード A/B/C]` を1行出す。その行の役割で動く。

| モード | 状況 | 役割 |
|---|---|---|
| A | Orca 管理の worktree 内 | ③チェック・ブラッシュアップ、または `gg-orca-flow` の進行役。受け取った依頼文に従う |
| B | Orca 起動中・Orca の worktree の外（元チェックアウト、デスクトップアプリの worktree 等） | 資料・ワイヤーの作成依頼は自分で作らず `gg-orca-flow` で②③に回す。質問・調査はこのまま答える |
| C | Orca に接続できない（クラウド、または PC で Orca 未起動） | ①情報整理。作成依頼は `gg-handoff` で依頼書を作って main に入れる |

- ワイヤー依頼を送ると、Windows で Orca が止まっていれば自動で起動してから `[Orca] ワイヤー依頼を検知…` の行を出す
- 人間が「Orca を使わずに」「ここで直接」と言ったら、モードに関係なくその指示を優先する
- PC を使わない経路（OpenAI Dots → Codex クラウド → Claude Code クラウド）は `references/dots-workflow.md`。定期実行「gg dots ③チェック」から起動されたときは、モードに関係なく同ファイル §5 の ③ を行う
- 行が出ていない（フックが動かなかった）ときは、自分で `node scripts/orca-context.mjs` を実行して判定する

### モデルの使い分け
| 作業 | モデル |
|---|---|
| 提案骨子・戦略設計・複雑な構成判断 | Opus |
| 実装・整形・定型処理 | Sonnet |

### トークン運用
- 案件を切り替えたら `/clear`
- 実装の区切りで `/compact`
- `/context` で内訳を確認。使っていない MCP サーバーは無効化する
- 生ログ・大きな CSV を丸ごと貼らない。抜粋を渡す

### MCP
接続中：Notion / Gmail / Google Drive / Google Calendar / Slack / Semrush / Supermetrics / Dropbox / Figma / Canva

Supermetrics の `ds_id`：
| サービス | ds_id |
|---|---|
| GA4 | `GAWA` |
| Google Ads | `AW` |
| Meta | `FA` |
| Search Console | `GW` |

---

## Codex へ渡すとき

資料・ワイヤーの作成は Codex に渡す。渡し方は依頼書（`skills/gg-handoff`）と `references/role-split.md` の「引き渡しの型」を参照。
渡す情報は **ファイルパスと Done-when だけ**。会話履歴は渡さない（Codex は `AGENTS.md` を読める）。

---

## 出力の作法

- Markdown は Notion 貼り付け前提（表を多用、装飾は最小）
- 説明文より、そのまま使える成果物を優先する
- 推定値には必ず「推定」と明記する
