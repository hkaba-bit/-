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
セッション開始時に `.claude/settings.json` のフックが `scripts/orca-context.mjs` を実行し、`[Orca モード A/B/C]` を1行出す。その行に従って進める。

| モード | 状況 | 進め方 |
|---|---|---|
| A | Orca 管理の worktree 内（Orca のターミナル、または `orca worktree current` が通る） | ここで実装 → 完了したら `gg-orca-flow` §4 で同じ worktree の Codex にレビューを回す → 指摘を反映 → STATUS.md 追記・コミット |
| B | Orca 起動中・Orca の worktree の外（元チェックアウト、Claude デスクトップアプリが作った worktree 等） | ファイルを変える依頼は、着手前に `gg-orca-flow` で worktree を切り、Claude をそこで起動して依頼を渡す。自分では編集しない。質問・調査はこのまま答える |
| C | Orca に接続できない（クラウド、または PC で Orca 未起動）。Windows では「クラウドではない」と明記される | 通常どおり作業ブランチで実装。完了時、Codex へのレビュー依頼文（`references/role-split.md` 第3章の4項目）を最後に出す |

- **ワイヤー依頼（ワイヤー／WF／画面設計／構成イメージ等）を送ると**、`UserPromptSubmit` フックが Orca の起動を確認し、止まっていれば Windows で自動起動してから `[Orca] ワイヤー依頼を検知…` の行を出す。その行の手順（worktree → gg-wireframe → Codex で量産・レビュー → `qa-wireframe.py`）で進める
- 人間が「Orca を使わずに」「ここで直接」と言ったら、モードに関係なくその指示を優先する
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

実装が終わったら、レビューは Codex に回す。渡し方は `references/role-split.md` の「引き渡しの型」を参照。
渡す情報は **ファイルパスと Done-when だけ**。会話履歴は渡さない（Codex は `AGENTS.md` を読める）。

---

## 出力の作法

- Markdown は Notion 貼り付け前提（表を多用、装飾は最小）
- 説明文より、そのまま使える成果物を優先する
- 推定値には必ず「推定」と明記する
