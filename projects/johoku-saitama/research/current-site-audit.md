# 現行サイト棚卸し（城北埼玉中学・高等学校）

調査日：2026-09-18 ／ 調査者：Claude（Claude Code on the web）
対象：https://www.johokusaitama.ac.jp （WordPress、Yoast SEO v28.3、GTM-K2BNGH5）

> 数値はこの日の実測。記事総数など未確認のものは「推定」と明記する。

---

## P0：テンプレートのコメント崩れで、削除済みリンクが生きている

### 事象

HTML ソース中、コメントアウトされた旧ナビゲーションの内部に**出力済みの `-->` が残っており、
HTML コメントがそこで閉じてしまっている**。結果、コメントアウトしたつもりのリンクが実リンクとして出力される。

```html
<!--    <a class="js-current-nav" href="--><!--/info/president/"><span>理事長挨拶</span></a>-->
                                  ^^^ ここでコメントが終了し、以降が生きたHTMLになる
```

元は `href="<?php echo home_url(); ?>/info/president/"` だったものを、
PHP 出力後の HTML に対してコメントアウトしたため `-->` が二重になったと推定される。

### 実測

| 項目 | 値 |
|---|---|
| クロール到達 URL | 190（うち142件を取得） |
| うち `--><!--` を含む不正 URL | 約90本（全体の約47%） |
| 不正URLの応答 | **301 → 正規URLへ転送**（例：`/--><!--/info` → `/info` で 200） |
| 影響範囲 | グローバルナビ、スライドバーメニュー、受験生向けCTA |

`/info/--><!--/info/philosophy` のように**階層を跨いで増殖**する（相対解決のため）。

### 影響

1. 内部リンクが全てリダイレクト経由になり、クロールバジェットを浪費する
2. 旧ページ（`/education/...` `/activity/...`）への参照が残り、「旧ページ残存」の実体になっている
3. HTML の構文が壊れているため、支援技術・パーサの挙動が不安定になりうる

### リニューアルでの扱い

新規構築のため**移行対象にしない**。ただし現行サイトの内部リンク構造をそのまま引き継がないこと。
公開前チェックに「HTMLコメント内に `-->` を含む出力がないか」を必ず入れる。

---

## 現行の情報構造（実測）

クロールで確認できた正規 URL は以下の体系。

| 第1階層 | 内容 | 下層の例 |
|---|---|---|
| `/info` | 学校案内 | president / head-teacher / song / philosophy / facility / student-manual / evaluation |
| `/life` | 学校生活 | school-life / event / gallery |
| `/junior-high-school` | 中学校 | integrated-learning / syllabus_m / plusalpha / junior / result-junior |
| `/hs-regular-course` | 高等学校（本科） | curriculum-main / syllabus / plusalpha / achievement / high / result-high |
| `/hs-frontier-course` | 高等学校（フロンティア） | learning / learning/field-work / learning/project-learning |
| `/club` | 部活動 | culture / workout |
| `/access` | 所在地・交通 | honkawagoe / fujimino / minamifuruya |
| `/news` `/archives/[id]` | 更新情報・記事 | 投稿 |
| `/briefings/[id]` | 説明会 | カスタム投稿 |
| `/division_category/[slug]` | 区分別アーカイブ | junior-high-school / high-school-regular / high-school-frontier / other |
| 単独 | `/application` `/donations` `/graduate` `/recruit` `/sitemap` | |

### 構造上の問題

| # | 問題 | 根拠 |
|---|---|---|
| 1 | 同一コンテンツに複数の入口がある | 部活動が `/club` `/club/culture` `/club/workout` に加え、スライドバーでは「同好会」も `/club` を指す |
| 2 | 学部区分とコース区分が混在 | `/junior-high-school` `/hs-regular-course` `/hs-frontier-course` と `/division_category/*` が並立し、更新情報の導線が二重 |
| 3 | 命名規則が不統一 | `syllabus`（高）と `syllabus_m`（中）、`result-high` と `result-junior` で語順が逆 |
| 4 | 旧構造の残骸 | コメントアウト済みの `/education/*` `/activity/*` が P0 経由で露出 |

---

## 技術面（実測）

| 項目 | 現状 | 所見 |
|---|---|---|
| CMS | WordPress（子テーマ `johokusaitama-html` / 親 `johokusaitama-wp`） | |
| SEO | Yoast SEO v28.3。canonical・OGP・JSON-LD は出力済み | 土台はある |
| 計測 | GTM-K2BNGH5 導入済み | GA4 の実データは未取得（後述） |
| セキュリティヘッダ | **HSTS・X-Frame-Options・X-Content-Type-Options がいずれも未設定** | リニューアル時に付与する |
| 外部依存 | `unpkg.com` から scroll-hint を直読み（バージョン指定なしの `@latest`） | 外部障害で表示が壊れるリスク。自己ホストに変更する |
| フォント | Google Fonts を WebFont Loader 経由で4ファミリ読み込み | 初期表示の重さの要因。絞る |
| 混在ホスト | 一部 CSS が `johokusaitama.ac.jp`（www なし）を参照 | www 有無の統一が必要 |

---

## 未取得・要確認

| # | 項目 | 取得方法 | 必要な理由 |
|---|---|---|---|
| 1 | GA4 実数（セッション・デバイス比率・離脱） | GA4 プロパティへのアクセス権 | 仕様書「3数値目標」が**サンプル値のまま**。ヒアリングの「9割以上がスマホ」も未検証 |
| 2 | 記事の実数（仕様書は 2,365P、サイト情報は 2,321P） | WordPress 管理画面 または `/wp-json/wp/v2/posts?per_page=1` のヘッダ | 移行見積の根拠。**44件の差の出所が不明** |
| 3 | PDF 掲載数と一覧 | サイト内検索 | 「PDF中心の情報配信」の定量化。HTML化の対象数が見積に効く |
| 4 | 現行サーバの仕様 | Xserver ビジネス（ns*.xbiz.ne.jp）の契約内容 | 移行先の判断 |

---

## 出典

- クロール：gg-manager `site_crawl`（2026-09-18、深度3、142ページ取得）
- HTTP ヘッダ：gg-manager `http_headers`（2026-09-18）
- HTML ソース：トップページ（2026-09-18 取得、95,161文字）
- 既存仕様書：`仕様書_城北埼玉中学・高等学校.xlsx`（Dropbox、Backlog GG_ORDER-4733 記載）
- ヒアリング：`20260703_...ヒアリング_要約.txt`（Dropbox GrowMeet）
