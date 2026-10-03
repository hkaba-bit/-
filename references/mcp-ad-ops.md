# MCP で広告・解析を「管理画面に入らず」運用する — 実装手順

> 目的：Supermetrics MCP でやっている「データ収集」に加えて、**予算変更・停止・入札・キーワード追加などの運用操作**も、管理画面にログインせず Claude から行えるようにする。
> 初版 2026-10-03。接続状況は Claude Code on the web から実測。外部サービスの仕様のうち実機未確認のものは「未確認」と書く。

---

## 0. 実測でわかった前提（2026-10-03）

| 項目 | 実測値 | 影響 |
|---|---|---|
| Supermetrics ライセンス | FULL・2026-11-01 まで（残り29日）・2席とも使用中 | **更新しないと11月から全部止まる** |
| Supermetrics「優先アカウント」 | 1データソースにつき **8件まで**（Google 広告 8 / Meta 8 / GA4 8 / Search Console 7 が設定済み） | 優先外のアカウントはクエリ自体が拒否される |
| 優先アカウントの入れ替え | 1データソースにつき**月10回まで**（11/1 リセット） | 毎月の運用対象を決めて固定する必要がある |
| 接続アカウント数 | Google 広告 77 / Meta 54 / GA4 数百 / Search Console 数百 | Supermetrics だけでは全体を見られない |
| Supermetrics 書き込み | `WRITE_ACCESS_NOT_ENABLED`（研修用テストアカウントで確認） | Hub で有効化が必要（第2章） |
| Supermetrics 読み取り | 優先8アカウントで費用・クリック・CV を取得できた | データ収集は今すぐ使える |
| gg-manager の GA4 / Search Console | 未連携 | gg-manager のアカウント設定で連携すれば件数制限なしで使える |

**結論：Supermetrics は「少数アカウントの読み書き」に、全アカウントの取得は公式 MCP に分ける。**

---

## 1. 構成（どれで何をするか）

| サービス | 数値取得（全アカウント） | 運用操作 | 状態 |
|---|---|---|---|
| Google 広告 | 公式 Google Ads MCP（MCC 経由で全77件・GAQL） | Supermetrics `manage_campaign`（優先8件） | 公式 MCP：第4章で導入／書き込み：第2章で有効化 |
| Meta 広告 | 公式 Meta Ads MCP（全54件） | 公式 Meta Ads MCP、または Supermetrics（優先8件） | 第3章で接続 |
| GA4 | 公式 Analytics MCP、または gg-manager | — | 第4章、または gg-manager で連携 |
| Search Console | gg-manager `google_search_console_*` | — | gg-manager で連携 |
| 横断レポート（Google×Meta） | Supermetrics `data_query`（優先8件） | — | 今すぐ使える |
| LINE 広告・TikTok・Instagram | Supermetrics（ログインリンクは第5章） | TikTok のみ可 | 未接続 |
| Yahoo!広告（検索・ディスプレイ） | MCP なし | MCP なし | 第6章の方法で補う |

---

## 2. Supermetrics の書き込みを有効にする（人間・5分）

| # | 作業 | リンク・場所 |
|---|---|---|
| 1 | Google 広告の Write settings を開き、**まず `【研修用】テストアカウント`（5939042180）だけ**を有効化して保存 | https://hub.supermetrics.com/write-settings?platform=AW&teamId=bl2C7p8B_rTIfAjqVQ1b |
| 2 | Meta も同様に `【研修用】テストアカウンt`（act_713557375710899）だけ有効化 | Hub の Write settings で platform を Facebook Ads に切り替え |
| 3 | claude.ai → 設定 → コネクタ → Supermetrics を**切断して再接続** | 既存セッションには反映されない |
| 4 | Claude に「研修用テストアカウントに、停止状態の検索キャンペーンを日予算100円で作って、すぐ削除して」 | 書き込み確認。作成は必ず停止状態なので費用は発生しない |
| 5 | 問題なければ、運用対象のアカウントを Write settings に追加 | 優先アカウント8件の中から選ぶ |

- 運用ルールは Supermetrics のチーム設定（Business context）に**保存済み**（タグ `operations-policy` / `reporting`）。claude.ai・Claude Code どちらから使っても自動で適用される
  - 変更前に「現在 → 変更後」の表を出し、OK まで書き込まない／配信開始は明示指示のみ／1承認1アカウント／予算+50%超か日予算3万円超は再確認／変更後に反映確認
  - 研修用・テストアカウントは集計から除外、JPY・Asia/Tokyo
- 書き込みが優先アカウント以外にも効くかは **未確認**。テスト後に確認する

### 優先アカウントの入れ替え

Claude に「Supermetrics の Google 広告の優先アカウントを見せて」→「〇〇を外して△△を入れて」で変更できる（月10回まで）。毎月1日に、その月に運用するアカウントへ入れ替えるのが無駄がない。

---

## 3. Meta 公式 MCP を接続する（人間・5分）

| 使う場所 | 手順 |
|---|---|
| claude.ai / デスクトップ | 設定 → コネクタ → カスタムコネクタを追加 → URL `https://mcp.facebook.com/ads` → Meta でログイン |
| Claude Code（PC） | `scripts\setup-ads-mcp.ps1 -Targets meta-ads` → Claude Code で `/mcp` → meta-ads → Authenticate |

- 開発者アプリ・トークン不要。Business Manager の管理者権限が必要（公開情報）
- **操作は即時反映で、取り消し・確認画面が無い**（公開情報）。第7章のルールで使う。Supermetrics のルールは Meta 公式 MCP には効かないので、依頼文に「変更前後を表で見せて、OK まで反映しないで」を必ず付ける

---

## 4. Google 公式 MCP（Google 広告・GA4）を入れる（人間・初回30分）

全アカウントの数値を件数制限なしで取るための経路。どちらも読み取り専用で、PC 上で動く（クラウドの Claude Code からは使えない）。

### 4.1 事前準備（1回だけ）

| # | 作業 | 場所 |
|---|---|---|
| 1 | Google Cloud プロジェクトを用意（既存で可）し、**Google Ads API / Google Analytics Admin API / Google Analytics Data API** を有効化 | Google Cloud コンソール → API とサービス → ライブラリ |
| 2 | OAuth 同意画面（内部）を作り、OAuth クライアント ID（種類：デスクトップ）を作成して JSON をダウンロード。保存先はリポジトリの外（例：`C:\Users\<you>\secrets\`） | API とサービス → 認証情報 |
| 3 | Google 広告 API の**開発者トークン**を発行（Explorer 以上で本番アカウントを読める） | MCC の Google 広告 → 管理者 → API センター |
| 4 | MCC の顧客 ID を控える | Google 広告 画面右上 |
| 5 | Python・pipx・gcloud CLI を入れる | `py -m pip install --user pipx; py -m pipx ensurepath` ／ https://cloud.google.com/sdk/docs/install |

### 4.2 登録（スクリプト）

| OS | コマンド |
|---|---|
| Windows | `scripts\setup-ads-mcp.ps1`（対象を絞るなら `-Targets google-ads,analytics`） |
| Mac / Linux | `bash scripts/setup-ads-mcp.sh`（対象を絞るなら `google-ads analytics`） |

スクリプトがやること：プロジェクト ID・クライアント JSON・開発者トークン・MCC ID を対話で聞く → `gcloud auth application-default login`（広告・GA4 の読み取り権限）→ `claude mcp add --scope user` で `google-ads` / `google-analytics` / `meta-ads` を登録 → `claude mcp list`。

- 開発者トークンは Claude Code のユーザー設定（`~/.claude.json`）に保存される。リポジトリ・`.env` には書かない
- 登録後、Claude Code を開き直して「Google 広告のアクセス可能なアカウント数を教えて」で確認

### 4.3 使えるツール

| MCP | ツール |
|---|---|
| google-ads | `list_accessible_customers` / `search`（GAQL）/ `get_resource_metadata` |
| google-analytics | `get_account_summaries` / `get_property_details` / `list_google_ads_links` / `run_report` / `run_funnel_report` / `run_realtime_report` / `get_custom_dimensions_and_metrics` |

---

## 5. 未接続データソースのログイン（人間・各1分）

Supermetrics のログインリンク（**2026-10-04 正午ごろまで有効**。切れたら Claude に「Supermetrics で LINE 広告にログインしたい」と頼めば再発行される）。

| サービス | 使い道 |
|---|---|
| LINE 広告（`LINEA`） | 読み取りのみ |
| Instagram インサイト（`IGI`） | オーガニック投稿の数値 |
| TikTok 広告（`TIK`） | 読み書き |

リンクはこのセッションの回答に記載（URL に一時トークンを含むためリポジトリには書かない）。注意：ログインすると、そのデータソースも優先アカウント8件の枠を使う。

gg-manager の GA4・Search Console は、gg-manager のアカウント設定から Google 連携する（件数制限なし）。

---

## 6. Yahoo!広告の穴を埋める

Supermetrics・公式 MCP とも Yahoo!広告（検索・ディスプレイ）に対応していない（Supermetrics は Yahoo DSP のみ）。

| 方法 | できること | 手間 | 推奨 |
|---|---|---|---|
| A. Yahoo!広告スクリプト → Google スプレッドシート | 管理画面内の JavaScript を毎日自動実行し、レポートをスプレッドシートへ出力。日予算変更・入札調整の自動化も可 | 小（設定は1回） | **まずこれ**。Claude は Google Drive MCP でシートを読む |
| B. Yahoo!広告 API ＋自前 MCP | Claude から直接取得・操作 | 大（API 利用申請・OAuth・サーバー運用） | 運用アカウントが増えたら |

A の手順：Yahoo!広告の管理画面 → ツール → スクリプト → 新規作成（テンプレート「レポートをスプレッドシートに出力」系を使う）→ 毎日 7:00 実行を設定 → 出力シートを共有ドライブの `広告レポート/Yahoo/` に置く。スクリプト本文は Yahoo!広告 開発者センターの公式サンプルを使う（この環境からは開発者センターに接続できず、本文は未作成）。

---

## 7. 運用ルール（どの MCP で操作するときも）

| ルール | 内容 |
|---|---|
| 変更前に読む | 現状（予算・入札・状態）を取得して表で示す |
| 差分を見せて承認 | 「現在 → 変更後」の表を出し、OK まで書き込まない |
| 配信開始は人間 | 配信開始・再開は明示指示のみ。新規作成は停止状態 |
| ターゲティングは置き換え | Supermetrics の `targeting` は全量置き換え。追加は `add_keywords`、除外は `negative_keywords` |
| 一部失敗を確認 | `write_status` / `failures` を確認し、失敗分を自動再実行しない |
| 記録 | 日時・アカウント・現在→変更後・理由を案件の `projects/<slug>/` にメモ（Supermetrics は Hub の Campaign history でも追える） |
| 外部送信 | クライアント名・金額を含む出力を外部サービスへ送らない（AGENTS.md 第3章） |

---

## 8. そのまま使える依頼文

| 用途 | 依頼文 |
|---|---|
| 週次（優先8件） | 「Supermetrics で Google 広告と Meta 広告の先週の費用・CV・CPA をアカウント別に、前週比つきで」 |
| 全アカウント棚卸し | 「google-ads MCP で MCC 配下の全アカウントの直近30日の費用と CV を GAQL で出して、費用0のアカウントも一覧に」 |
| 異常検知 | 「直近7日で CPA が前の7日より30%以上悪化したキャンペーンを洗い出して」 |
| 予算変更 | 「〇〇の△△キャンペーンの日予算を 5,000円 → 7,000円に。現状と変更後を表で見せて、OK したら反映して」 |
| 停止候補 | 「Meta で直近14日 CV 0 かつ費用1万円以上の広告セットを一覧に。停止は私が選ぶ」 |
| キーワード追加 | 「〇〇広告グループにこのキーワードをフレーズ一致で追加して（既存は触らない）」 |
| 除外 KW | 「先月の検索語句で CV 0・費用上位20件を出して、除外キーワード候補に」 |
| 新規入稿 | 「〇〇の検索キャンペーンを停止状態で作って。見出し・説明文の案から先に見せて」 |
| ヘルスチェック | 「〇〇の Google 広告をヘルスチェックして、設定ミスを指摘して」 |
| GA4 | 「google-analytics MCP で〇〇の直近28日の流入元別 CV をファネルで見せて」 |
| SEO | 「Search Console で直近28日、表示回数が多いのに CTR 1% 未満のクエリを出して」 |

---

## 9. 残作業

| # | 作業 | 担当 | 期限の目安 |
|---|---|---|---|
| 1 | Supermetrics ライセンス（11/1 終了）を更新するか決める。更新しない場合は第4章・第3章の公式 MCP を先に入れる | 人間 | 10月中旬 |
| 2 | 第2章 1〜4（書き込み有効化→テストアカウントで作成・削除） | 人間＋Claude | すぐ |
| 3 | 第3章（Meta 公式 MCP） | 人間 | すぐ |
| 4 | 第4章（Google 公式 MCP）。開発者トークンの発行が一番時間がかかる | 人間 | 今週 |
| 5 | gg-manager で GA4・Search Console を連携 | 人間 | すぐ |
| 6 | 第6章 A（Yahoo!広告スクリプト） | 人間 | 来週 |
| 7 | 回ったら第7章を Skill `gg-ad-ops` にする（`skills/` と AGENTS.md 第5章の更新が要るので承認後） | Claude | 運用開始後 |

---

## 出典

- Supermetrics MCP の応答（`supermetrics_guide` tour / write_access、`data_source_discovery`、`manage_user_and_team`、`manage_campaign` のエラー）2026-10-03 実行
- [How to manage ad campaigns with AI tools（Supermetrics Docs）](https://docs.supermetrics.com/docs/how-to-manage-ad-campaigns-with-ai-tools)
- [googleads/google-ads-mcp README](https://github.com/googleads/google-ads-mcp)
- [googleanalytics/google-analytics-mcp README](https://github.com/googleanalytics/google-analytics-mcp)
- [Google 広告 MCP サーバー（Google for Developers）](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server?hl=ja)
- [Official Meta Ads MCP for Claude: 29 tools](https://pasqualepillitteri.it/en/news/1707/official-meta-ads-mcp-claude-29-tools-2026)
- [Meta Ads MCP（adkit）](https://adkit.so/resources/meta-ads-mcp)
- [Yahoo!広告スクリプトで広告レポートを自動作成（Web担当者Forum）](https://webtan.impress.co.jp/e/2025/06/03/48738)
- [Yahoo!広告 開発者センター](https://ads-developers.yahoo.co.jp/)
