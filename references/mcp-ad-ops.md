# MCP で広告・解析を「管理画面に入らず」運用する

> 目的：Supermetrics MCP でやっている「データ収集」に加えて、**予算変更・停止・入札・キーワード追加などの運用操作**も、管理画面にログインせず Claude から行えるようにする。
> 調査日：2026-10-03（接続状況は Claude Code on the web から実測。外部サービスの仕様は公開情報ベースで、実機未確認のものは「未確認」と書く）

---

## 1. 結論

| やりたいこと | 使うもの | 状態 |
|---|---|---|
| Google 広告・Meta 広告の数値取得 | Supermetrics MCP（`data_query`） | **すぐ使える**（接続済み） |
| GA4・Search Console・Shopify の数値取得 | Supermetrics MCP（`GAWA` / `GW` / `SHP`） | **すぐ使える**（接続済み） |
| Google 広告・Meta 広告の運用操作（予算・停止・入札・KW・広告作成） | Supermetrics MCP（`manage_campaign`）※Beta | **Hub で書き込み権限を有効化すれば使える**（第3章） |
| Meta 広告の運用操作（代替） | Meta 公式 MCP `https://mcp.facebook.com/ads`（2026-04 オープンベータ） | 未接続。取り消し・確認画面が無いので第2候補 |
| Google 広告の詳細分析（GAQL） | Google 公式 Google Ads MCP（読み取り専用・3ツール） | 未接続。書き込みは不可 |
| GA4 の詳細（ファネル・カスタム定義） | Google 公式 Analytics MCP（`analytics-mcp`・ローカル実行） | 未接続。gg-manager の `google_analytics_run_report` でも代替可 |
| **Yahoo!広告（検索・ディスプレイ）** | MCP 無し。Supermetrics も非対応（Yahoo DSP のみ） | **穴**。第5章の方法で埋める |
| LINE 広告 | Supermetrics `LINEA`（読み取りのみ） | 未認証 |

**方針：運用操作は Supermetrics `manage_campaign` に一本化する。** 理由は、①既に接続済み、②新規キャンペーンは必ず停止状態で作成、③変更は Hub の「Campaign history」に記録され取り消しできる、の3点。Meta 公式 MCP は操作が即時反映で取り消し機能が無いため、Supermetrics で足りない操作だけに使う。

---

## 2. 現在の接続状況（Supermetrics・2026-10-03 実測）

| ds_id | サービス | 認証 | 運用操作 |
|---|---|---|---|
| `AW` | Google 広告 | 済 | 対応 |
| `FA` | Meta（Facebook / Instagram）広告 | 済 | 対応 |
| `GAWA` | GA4 | 済 | — |
| `GW` | Search Console | 済 | — |
| `SHP` | Shopify | 済 | — |
| `AC` | Microsoft 広告 | 未 | 対応 |
| `TIK` | TikTok 広告 | 未 | 対応 |
| `LIA` | LinkedIn 広告 | 未 | 対応（Hub の案内では読み取りのみ。要確認） |
| `LINEA` | LINE 広告 | 未 | 非対応 |
| `IGI` | Instagram インサイト | 未 | — |
| `TA` | X 広告 | 未 | 非対応 |

未認証のものは、Claude で「Supermetrics で TikTok 広告を接続したい」と頼むとログインリンクが返る。

---

## 3. セットアップ（人間・1回だけ）

### 3.1 Supermetrics の書き込み権限（最優先）

| # | 作業 | 場所 |
|---|---|---|
| 1 | Supermetrics Hub →「Write settings」で、操作したい広告アカウントだけを有効化して保存 | Supermetrics Hub |
| 2 | claude.ai の Supermetrics コネクタを**切断して再接続**（既存セッションには反映されない） | claude.ai → 設定 → コネクタ |
| 3 | 広告プラットフォーム側で自分の権限が「編集」以上か確認（閲覧のみだと失敗する） | 各広告管理画面（最初の1回だけ） |
| 4 | Claude で「Google 広告のキャンペーン一覧を出して」→ 動作確認 | Claude |

- 書き込み権限を付けられるのは**自分が所有する接続**のアカウントだけ
- エラー `WRITE_ACCESS_NOT_ENABLED` が出たら 1→2 をやり直す
- 料金：MCP は AI クレジット制（Starter 4,000／Growth 12,000 クレジット/月と公開情報。現契約の残量は Hub で確認）

### 3.2 Meta 公式 MCP（必要になったら）

| # | 作業 |
|---|---|
| 1 | claude.ai → 設定 → コネクタ →「カスタムコネクタを追加」→ URL に `https://mcp.facebook.com/ads` |
| 2 | Meta ビジネスアカウントでログインして承認（開発者アプリ・トークン不要） |

注意：操作は即時反映。下書き・確認画面・取り消しが無い（公開情報）。予算・ターゲティングの変更は必ず第4章のルールで行う。

### 3.3 Google 公式 MCP（必要になったら）

| MCP | 用途 | 導入 |
|---|---|---|
| Google Ads MCP | GAQL で任意の項目を取得（読み取り専用・`list_accessible_customers` / `search` / `get_resource_metadata`） | 開発者トークンが必要。PC のローカル MCP として設定 |
| Analytics MCP（`analytics-mcp`） | GA4 のレポート・ファネル・カスタム定義・広告リンク確認 | `pipx` でローカル実行。Google Cloud の認証（ADC）が必要 |

Supermetrics で取れない項目が出てきたときだけ入れる。普段は不要。

---

## 4. 運用ルール（Claude に操作させるとき）

| ルール | 内容 |
|---|---|
| 変更前に読む | 変更前に `campaign_and_resource_get` で現状（予算・入札・状態）を取得し、表で示す |
| 差分を見せて承認 | 「現在 → 変更後」の表を出し、人間が「OK」と言うまで書き込まない |
| 配信開始は人間 | `ENABLED`（配信開始）は人間が明示的に指示したときだけ。新規作成は常に `PAUSED` |
| ターゲティングは全量 | `targeting` は**置き換え**。追加だけしたいときは `add_keywords`、除外は `negative_keywords` を使う |
| 一部失敗を確認 | 返り値の `write_status` / `failures` を確認。失敗分を盲目的に再実行しない |
| 記録 | 変更内容（日時・アカウント・現在→変更後・理由）を案件の `projects/<slug>/` にメモ。Hub の Campaign history でも追える |
| 金額の扱い | 見積・予算額を含む出力を外部サービスへ送らない（AGENTS.md 第3章） |

---

## 5. Yahoo!広告の穴を埋める

Supermetrics・公式 MCP とも Yahoo!広告（検索・ディスプレイ）には対応していない（2026-10-03 時点）。

| 方法 | できること | 手間 | 推奨 |
|---|---|---|---|
| A. Yahoo!広告スクリプト | 管理画面内で JavaScript を定期実行。日予算変更・入札調整・レポートをスプレッドシートへ出力 | 小（設定は管理画面で1回） | **まずこれ**。出力先のスプレッドシートを Google Drive MCP で読めば、Claude から数値を見られる |
| B. Yahoo!広告 API ＋自前 MCP | Claude から直接取得・操作 | 大（API 利用申請・OAuth アプリ登録・サーバー運用） | 運用アカウントが多くなったら検討 |
| C. ETL 製品（CData 等）経由 | SQL 的に取得 | 中（有償） | 他ツールで既に使っていれば |

A の流れ：スクリプトで毎朝レポートを Google スプレッドシートへ出力 → Claude が Google Drive MCP で読む → 変更が必要なら、スクリプトの設定シート（例：キャンペーンID・新しい日予算）を人間が書き換える。

---

## 6. そのまま使える依頼文

| 用途 | 依頼文 |
|---|---|
| 週次レポート | 「Supermetrics で Google 広告と Meta 広告の先週の費用・CV・CPA をキャンペーン別に出して、前週比も付けて」 |
| 異常検知 | 「直近7日で CPA が前の7日より30%以上悪化したキャンペーンを Google 広告と Meta 広告から洗い出して」 |
| 予算変更 | 「Google 広告の〇〇キャンペーンの日予算を 5,000円 → 7,000円にしたい。現状と変更後を表で見せて、OK したら反映して」 |
| 停止 | 「Meta 広告で直近14日 CV 0 かつ費用 1万円以上の広告セットを一覧にして。停止は私が選ぶ」 |
| キーワード追加 | 「Google 広告の〇〇広告グループに、このキーワードをフレーズ一致で追加して（既存は触らない）」 |
| 除外 KW | 「先月の検索語句で CV 0・費用上位20件を出して、除外キーワード候補にして」 |
| 新規入稿（下書き） | 「〇〇の検索キャンペーンを停止状態で作って。見出し・説明文の案から先に見せて」 |
| ヘルスチェック | 「Google 広告のキャンペーンをヘルスチェックして、設定ミスを指摘して」 |
| SEO | 「Search Console で直近28日、表示回数が多いのに CTR 1% 未満のクエリを出して」 |

---

## 7. 次の一手

| # | 作業 | 担当 |
|---|---|---|
| 1 | 3.1 の書き込み権限を有効化（まずはテスト用か小規模な1アカウント） | 人間 |
| 2 | 依頼文「予算変更」で1件、少額の変更→戻すまでを試す | 人間＋Claude |
| 3 | Yahoo!広告スクリプトでレポート出力（5章 A） | 人間 |
| 4 | うまく回ったら、第4章のルールを Skill（`gg-ad-ops` 案）にする | 人間承認のうえ Claude |

---

## 出典

- Supermetrics MCP の `supermetrics_guide`（tour / write_access）と `data_source_discovery` の応答（2026-10-03 実行）
- [How to manage ad campaigns with AI tools（Supermetrics Docs）](https://docs.supermetrics.com/docs/how-to-manage-ad-campaigns-with-ai-tools)
- [Supermetrics Pricing Breakdown](https://metricnexus.ai/blog/supermetrics-pricing)
- [Google 広告 MCP サーバー（Google for Developers）](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server?hl=ja)
- [Google Ads MCP vs API（Scalekit）](https://www.scalekit.com/blog/google-ads-mcp-vs-api)
- [Official Meta Ads MCP for Claude: 29 tools](https://pasqualepillitteri.it/en/news/1707/official-meta-ads-mcp-claude-29-tools-2026)
- [Meta Ads MCP（adkit）](https://adkit.so/resources/meta-ads-mcp)
- [Google Analytics MCP server（fast.io）](https://fast.io/resources/mcp-server-for-google-analytics/)
- [Yahoo!広告スクリプトで広告レポートを自動作成（Web担当者Forum）](https://webtan.impress.co.jp/e/2025/06/03/48738)
- [Yahoo!広告 開発者センター](https://ads-developers.yahoo.co.jp/)
