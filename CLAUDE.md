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
