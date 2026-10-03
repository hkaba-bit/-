# MCP で広告・解析を「管理画面に入らず」運用する — 実装手順（Supermetrics 解約前提）

> 目的：予算変更・停止・キーワード追加などの運用操作と数値取得を、管理画面にログインせず Claude から行う。
> 前提：**Supermetrics は解約する**（ライセンスは 2026-11-01 まで）。公式 MCP と自作の小さな MCP だけで組む。
> 初版 2026-10-03。実機未確認のものは「未確認」と書く。

---

## 1. 構成

| サービス | 数値取得 | 運用操作 | 使うもの | 費用 |
|---|---|---|---|---|
| Google 広告 | MCC 配下の全アカウント | 日予算・停止/再開・キーワード・除外キーワード | 公式 `google-ads`（読み取り）＋自作 `google-ads-ops`（書き込み） | 無料（API） |
| Meta 広告 | 全アカウント | キャンペーン作成・更新・停止・再開・予算 | 公式 Meta Ads MCP（`https://mcp.facebook.com/ads`） | 無料 |
| GA4 | 全プロパティ | — | 公式 `google-analytics`（`analytics-mcp`）、または gg-manager | 無料 |
| Search Console | 全サイト | — | gg-manager `google_search_console_*` | 既存 |
| Google×Meta の横断レポート | — | — | 上の MCP から Claude がまとめる | — |
| Yahoo!広告 | 第6章 | 第6章 | Yahoo!広告スクリプト → スプレッドシート → Google Drive MCP | 無料 |
| LINE 広告・TikTok 広告 | 対象外（必要になったら調べる） | — | — | — |

Supermetrics でやっていたことの置き換え：

| Supermetrics の機能 | 置き換え先 |
|---|---|
| `data_query`（Google 広告） | `google-ads` の `search`（GAQL） |
| `data_query`（Meta） | Meta Ads MCP のインサイト系ツール |
| `data_query`（GA4 / Search Console） | `google-analytics` / gg-manager |
| `manage_campaign`（Google 広告） | `google-ads-ops`（予算・状態・キーワード）。**新規キャンペーン作成・広告文の入稿は対象外** |
| `manage_campaign`（Meta） | Meta Ads MCP |
| Business context（運用ルール） | 第7章のルール＋`google-ads-ops` の2段階承認 |

---

## 2. 自作 `google-ads-ops`（Google 広告の運用操作）

公式 Google Ads MCP は読み取り専用（Google の方針）なので、書き込みだけを担う小さな MCP を用意した：`scripts/google_ads_ops_mcp.py`。

| ツール | 内容 |
|---|---|
| `list_accounts` | MCC 配下の運用中アカウント一覧 |
| `list_campaigns` | キャンペーン一覧（状態・種別・日予算・直近7日の費用/CV） |
| `propose_budget` | 日予算の変更を**提案**（反映しない） |
| `propose_status` | 停止（PAUSED）・再開（ENABLED）を**提案** |
| `propose_keywords` | 広告グループへのキーワード追加を**提案**（既存は触らない） |
| `propose_negative_keywords` | キャンペーンへの除外キーワード追加を**提案** |
| `apply_change` | 提案の token を**反映** |
| `list_pending` / `recent_changes` | 未反映の提案／反映履歴 |

安全の仕組み：
- **2段階**：`propose_*` は Google 広告 API の検証（validate_only）だけを通して「現在 → 変更後」を返す。反映は `apply_change(token)` だけ
- **人間の承認**：`apply_change` を Claude Code の許可リストに入れない。毎回、許可プロンプトで人間が承認する
- **提案の失効**：30分。提案後に予算・状態が変わっていたら反映を止める
- **警告**：共有予算／現在の1.5倍を超える増額／日予算3万超／配信再開
- **履歴**：`~/.gg-ads-ops/changes.jsonl` に日時・アカウント・現在→変更後を記録

検証：Google 広告 API のライブラリ（google-ads 33.0.0・API v25）で、偽のサービスに差し替えて動作確認＝**OK**。確認した内容は、リクエストの組み立て（更新項目の指定・validate_only の切り替え）、token の再利用拒否、提案後に変わった値の検知、不正な入力の拒否、MCP ツール9件の登録。**実アカウントへの反映は未確認**（第4章のあと、研修用テストアカウントで確認する）。

---

## 3. Meta 公式 MCP を接続する（人間・5分）

| 使う場所 | 手順 |
|---|---|
| claude.ai / デスクトップ | 設定 → コネクタ → カスタムコネクタを追加 → URL `https://mcp.facebook.com/ads` → Meta でログイン |
| Claude Code（PC） | `scripts\setup-ads-mcp.ps1 -Targets meta-ads` → Claude Code で `/mcp` → meta-ads → Authenticate |

- 開発者アプリ・トークン不要。Business Manager の管理者権限が必要（公開情報）
- **操作は即時反映で、取り消し・確認画面が無い**（公開情報）。依頼文に必ず「変更前後を表で見せて、OK まで反映しないで」を付ける（第7章）
- Claude Code では Meta の書き込み系ツールを許可リストに入れない（毎回承認）

---

## 4. Google 公式 MCP ＋ `google-ads-ops` を入れる（人間・初回30分〜）

PC 上で動く（クラウドの Claude Code・claude.ai からは使えない）。

### 4.1 事前準備（1回だけ）

| # | 作業 | 場所 |
|---|---|---|
| 1 | Google Cloud プロジェクトを用意（既存で可）し、**Google Ads API / Google Analytics Admin API / Google Analytics Data API** を有効化 | Google Cloud コンソール → API とサービス → ライブラリ |
| 2 | OAuth 同意画面（内部）を作り、OAuth クライアント ID（種類：デスクトップ）を作成して JSON をダウンロード。保存先はリポジトリの外（例：`C:\Users\<you>\secrets\`） | API とサービス → 認証情報 |
| 3 | Google 広告 API の**開発者トークン**を申請。本番アカウントの読み取りは Explorer 以上。書き込みの可否と1日の上限はアクセスレベルで変わるため、申請画面で確認（**要確認**）。審査に数日かかることがある | MCC の Google 広告 → 管理者 → API センター |
| 4 | MCC の顧客 ID を控える | Google 広告 画面右上 |
| 5 | Python・pipx・gcloud CLI を入れる | `py -m pip install --user pipx; py -m pipx ensurepath` ／ https://cloud.google.com/sdk/docs/install |

### 4.2 登録（スクリプト）

| OS | コマンド |
|---|---|
| Windows | `scripts\setup-ads-mcp.ps1`（対象を絞るなら `-Targets google-ads,analytics`） |
| Mac / Linux | `bash scripts/setup-ads-mcp.sh`（対象を絞るなら `google-ads analytics`） |

スクリプトがやること：プロジェクト ID・クライアント JSON・開発者トークン・MCC ID を対話で聞く → `gcloud auth application-default login`（広告・GA4 の権限）→ `claude mcp add --scope user` で `google-ads` / `google-ads-ops` / `google-analytics` / `meta-ads` を登録 → `claude mcp list`。

- 開発者トークンは Claude Code のユーザー設定（`~/.claude.json`）に保存される。リポジトリ・`.env` には書かない
- `google-ads-ops` は `pipx run` が `mcp` と `google-ads` を自動で入れて起動する。うまく動かないときは `py -m pip install mcp google-ads` のあと、登録コマンドを `python <パス>\scripts\google_ads_ops_mcp.py` に変える

### 4.3 動作確認（研修用テストアカウントで）

1. 「google-ads で MCC 配下のアカウント数を教えて」
2. 「google-ads-ops で【研修用】テストアカウント（5939042180）のキャンペーン一覧を出して」
3. 「停止中のキャンペーンの日予算を今と同じ額で propose して」→ 表が出る → apply を承認 → `recent_changes` に記録される
4. 「GA4 のプロパティ一覧を出して」

---

## 5. Supermetrics 解約までにやること

| # | 作業 | 担当 |
|---|---|---|
| 1 | Supermetrics を使っている Looker Studio・スプレッドシートのレポートが無いか確認（あれば、公式コネクタ（Google 広告・GA4・Search Console は Looker Studio 標準）に付け替え） | 人間 |
| 2 | 第3章・第4章を済ませ、Google 広告と Meta の数値が取れることを確認 | 人間＋Claude |
| 3 | gg-manager で GA4・Search Console を連携（件数制限なし） | 人間 |
| 4 | Supermetrics を解約（自動更新を止める）。claude.ai のコネクタからも外す | 人間 |
| 5 | CLAUDE.md の「MCP」節から Supermetrics と ds_id 表を外し、`google-ads` / `google-ads-ops` / `google-analytics` / `meta-ads` に書き換え（CLAUDE.md は人間のみ編集） | 人間 |

Supermetrics のチーム設定に保存した運用ルール（タグ `operations-policy` / `reporting`）は解約で消えてよい。同じ内容が第7章にある。

---

## 6. Yahoo!広告の穴を埋める

Yahoo!広告（検索・ディスプレイ）に対応した MCP は無い。

| 方法 | できること | 手間 | 推奨 |
|---|---|---|---|
| A. Yahoo!広告スクリプト → Google スプレッドシート | 管理画面内の JavaScript を毎日自動実行し、レポートをスプレッドシートへ出力。日予算変更・入札調整の自動化も可 | 小（設定は1回） | **まずこれ**。Claude は Google Drive MCP でシートを読む |
| B. Yahoo!広告 API ＋自作 MCP（`google-ads-ops` と同じ作り） | Claude から直接取得・操作 | 大（API 利用申請・OAuth アプリ登録） | 運用アカウントが増えたら |

A の手順：Yahoo!広告の管理画面 → ツール → スクリプト → 新規作成（公式テンプレートの「レポートをスプレッドシートに出力」系）→ 毎日 7:00 実行 → 出力シートを共有ドライブの `広告レポート/Yahoo/` に置く。スクリプト本文は Yahoo!広告 開発者センターの公式サンプルを使う（この環境からは開発者センターに接続できず、本文は未作成）。

---

## 7. 運用ルール（どの MCP で操作するときも）

| ルール | 内容 |
|---|---|
| 変更前に読む | 現状（予算・入札・状態）を取得して表で示す |
| 差分を見せて承認 | 「現在 → 変更後」の表を出し、ユーザーの明示的な OK まで書き込まない |
| 配信開始は人間 | 配信開始・再開は明示指示のみ。新規作成は停止状態で作る |
| 1承認1アカウント | 複数アカウントの一括変更は、アカウントごとに承認を取る |
| 大きな増額は再確認 | 現在の1.5倍超、または日予算3万円超は理由を添えて再確認 |
| 失敗を自動で再実行しない | エラーや一部失敗は内容を報告して止める |
| 許可リスト | `apply_change` と Meta の書き込み系ツールは Claude Code の許可リストに入れない |
| 記録 | 日時・アカウント・現在→変更後・理由を案件の `projects/<slug>/` にもメモ |
| レポート | JPY・Asia/Tokyo。比率（CTR・CPC・CPA・ROAS）は行を合算・平均しない。研修用・テストアカウントは除外 |
| 外部送信 | クライアント名・金額を含む出力を外部サービスへ送らない（AGENTS.md 第3章） |

---

## 8. そのまま使える依頼文

| 用途 | 依頼文 |
|---|---|
| 全アカウント棚卸し | 「google-ads で MCC 配下の全アカウントの直近30日の費用と CV を出して。費用0のアカウントも一覧に」 |
| 週次（Google×Meta） | 「〇〇の Google 広告と Meta 広告の先週の費用・CV・CPA を前週比つきで1つの表に」 |
| 異常検知 | 「google-ads で直近7日の CPA が前の7日より30%以上悪化したキャンペーンを全アカウントから洗い出して」 |
| 予算変更 | 「google-ads-ops で〇〇の△△キャンペーンの日予算を 7,000円に propose して」→ 表を見て OK → apply を承認 |
| 停止 | 「〇〇の△△キャンペーンを停止で propose して」 |
| キーワード追加 | 「google-ads-ops で〇〇広告グループに、このキーワードをフレーズ一致で propose して」 |
| 除外 KW | 「google-ads で先月の検索語句から CV 0・費用上位20件を出して、除外キーワードとして propose して」 |
| Meta 停止候補 | 「Meta で直近14日 CV 0 かつ費用1万円以上の広告セットを一覧に。停止は私が選ぶ。変更前後を表で見せて、OK まで反映しないで」 |
| GA4 | 「google-analytics で〇〇の直近28日の流入元別 CV をファネルで見せて」 |
| SEO | 「Search Console で直近28日、表示回数が多いのに CTR 1% 未満のクエリを出して」 |

---

## 9. 残作業

| # | 作業 | 担当 |
|---|---|---|
| 1 | Google 広告 API の開発者トークン申請（一番時間がかかる。すぐ着手） | 人間 |
| 2 | 第3章（Meta 公式 MCP） | 人間 |
| 3 | 第4章（Google Cloud 準備 → `setup-ads-mcp.ps1` → 4.3 の動作確認） | 人間＋Claude |
| 4 | 第5章（Supermetrics 解約の準備と解約、CLAUDE.md 更新） | 人間 |
| 5 | 第6章 A（Yahoo!広告スクリプト） | 人間 |
| 6 | AGENTS.md 第2章の環境スクリプト表に `setup-ads-mcp` と `google_ads_ops_mcp.py` を追記（AGENTS.md は人間のみ編集） | 人間 |
| 7 | 回ったら第7章を Skill `gg-ad-ops` にする（`skills/` と AGENTS.md 第5章の更新が要るので承認後） | Claude |
| 8 | `google-ads-ops` に追加したい操作（入札戦略・広告文の入稿など）が出たら足す | Claude |

---

## 出典

- [googleads/google-ads-mcp README](https://github.com/googleads/google-ads-mcp)
- [googleanalytics/google-analytics-mcp README](https://github.com/googleanalytics/google-analytics-mcp)
- [Google 広告 MCP サーバー（Google for Developers）](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server?hl=ja)
- [Google Ads API 開発者トークンとアクセスレベル](https://developers.google.com/google-ads/api/docs/get-started/dev-token)
- [Official Meta Ads MCP for Claude: 29 tools](https://pasqualepillitteri.it/en/news/1707/official-meta-ads-mcp-claude-29-tools-2026)
- [Meta Ads MCP（adkit）](https://adkit.so/resources/meta-ads-mcp)
- [Yahoo!広告スクリプトで広告レポートを自動作成（Web担当者Forum）](https://webtan.impress.co.jp/e/2025/06/03/48738)
- [Yahoo!広告 開発者センター](https://ads-developers.yahoo.co.jp/)
- Supermetrics MCP の応答（ライセンス期限・優先アカウント上限）2026-10-03 実行
