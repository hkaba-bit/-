# 現行サイトの棚卸し

推測でページ数を数えると移行工数を外す。実測する。

## 目次

1. なぜ棚卸しから始めるか
2. URL構造を数える
3. 技術構成を調べる
4. ページ別の実力を測る（GA4）
5. 検索での実力を測る（Semrush）
6. 棚卸し結果を仕様書に落とす
7. よく見つかる問題

---

## 1. なぜ棚卸しから始めるか

見積が崩れる原因は、ページ数の数え間違いではなく**移行件数の見落とし**にある。
新規制作を10ページに絞っても、既存の商品249件・記事131件は残る。

棚卸しで確定させるのは3つ。

1. **移行対象の総数**（301の件数＝リダイレクトマップの工数）
2. **どのページが機能しているか**（残すか捨てるかの判断材料）
3. **技術的な地雷**（テーマ依存のカスタム投稿タイプなど）

---

## 2. URL構造を数える

### sitemap.xml から

```bash
curl -s -A "Mozilla/5.0" https://example.com/sitemap.xml -o sm.xml
```

```python
import re, urllib.parse, collections
x = open('sm.xml', encoding='utf-8', errors='ignore').read()
urls = re.findall(r'<loc>([^<]+)</loc>', x)
mods = re.findall(r'<lastmod>([^<]+)</lastmod>', x)
print("総URL数:", len(urls))
print("lastmod 最新:", max(mods)[:10], "/ 最古:", min(mods)[:10])

paths = [urllib.parse.unquote(u.split('://',1)[1].split('/',1)[1] if '/' in u.split('://',1)[1] else '') for u in urls]
c = collections.Counter()
for p in paths:
    seg = [s for s in ('/'+p).split('/') if s]
    c['(TOP)' if not seg else '/'+seg[0]] += 1
for k, v in c.most_common(30):
    print(f"{v:5}  {k}")
```

さらに第2階層まで分解して、カスタム投稿タイプとタクソノミの件数を出す。

### robots.txt も見る

```bash
curl -s https://example.com/robots.txt
```

sitemap.xml の場所、クロール拒否の設定、旧サブドメインの痕跡が分かる。

### 確認すること

- **lastmod がいつで止まっているか**（外部ジェネレータ製で放置されていることがある）
- 日本語URL・全角スペースの有無（移行時に整形が必要）
- ページャ（`/page/2` 以降）がインデックス対象になっていないか
- `/wp-content` など不要なURLの混入
- 旧サブドメイン（`old.example.com` など）が生きていないか

---

## 3. 技術構成を調べる

```bash
curl -sI -A "Mozilla/5.0" https://example.com/ | head -20
curl -s -A "Mozilla/5.0" https://example.com/ -o top.html

grep -oE 'wp-content/themes/[^/]+' top.html | sort -u
grep -oE 'wp-content/plugins/[^/]+' top.html | sort -u
grep -oiE '<meta name="viewport"[^>]*>' top.html
grep -oE 'jquery[^"?]*\.js' top.html | sort -u
grep -oE '(G-[A-Z0-9]{6,}|GTM-[A-Z0-9]+|AW-[0-9]+)' top.html | sort -u
```

### ページ容量を測る

```python
import re, urllib.request, concurrent.futures
h = open('top.html', encoding='utf-8', errors='ignore').read()
urls = set()
for m in re.findall(r'(?:src|href)="([^"]+\.(?:jpg|jpeg|png|gif|webp|css|js))"', h):
    if m.startswith('//'): m = 'https:' + m
    if m.startswith('/'):  m = 'https://example.com' + m
    if m.startswith('http'): urls.add(m)

def size(u):
    try:
        r = urllib.request.Request(u, method='HEAD', headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(r, timeout=10) as resp:
            return u, int(resp.headers.get('Content-Length') or 0)
    except Exception:
        return u, -1

res = []
with concurrent.futures.ThreadPoolExecutor(20) as ex:
    res = [r for r in ex.map(size, list(urls)) if r[1] > 0]
print(f"{len(res)}本 / {sum(r[1] for r in res)/1024/1024:.2f} MB")
for u, s in sorted(res, key=lambda x: -x[1])[:10]:
    print(f"{s/1024:8.1f} KB  {u.split('/')[-1][:60]}")
```

### フォームの実装方式を確認する

フォームがWordPress外の静的HTMLだと、項目1つの変更に制作会社への依頼が必要になる。
これは仕様書の「WP化」「フォーム」列の判断に直結する。

```bash
curl -s https://example.com/contact/ -o form.html
grep -c 'wp-content' form.html          # 0ならWordPress外
grep -oiE '<form[^>]*>' form.html
grep -oiE '<(input|select|textarea)[^>]*>' form.html
```

入力項目数、必須の数、`type` 属性、`autocomplete` の有無、バリデーションの
正規表現まで見る。項目数は「9項目→5項目に削減」と書ければ提案の説得力が上がる。

### 最大の事故リスク：テーマ依存のカスタム投稿タイプ

独自テーマの `functions.php` で `register_post_type` / `register_taxonomy` が
呼ばれていると、**テーマを差し替えた瞬間に投稿が管理画面から消える**。
データはDBに残っているが表示も編集もできない。

対策の順番：

```
1. 現行テーマの functions.php を確認
2. 該当箇所を独立プラグインに切り出す
3. プラグイン有効化のまま、旧テーマで動作確認
4. その後にテーマを差し替える
```

この工数（1日程度）を必ず見積に積む。

---

## 4. ページ別の実力を測る（GA4）

Supermetrics経由でGoogle Analyticsを引ける場合、以下を取る。

| 取るもの | fields |
|---|---|
| チャネル別 | `sessionDefaultChannelGrouping, sessions, engagedSessions, conversions` |
| ランディングページ別 | `landingPage, sessions, engagedSessions, averageSessionDuration, conversions` |
| イベント別 | `eventName, isConversionEvent, eventCount` |
| CVの発生元 | `landingPage, eventName, eventCount` |
| フォームの通過 | `pagePath, screenPageViews`（フォーム・確認・完了の各URL） |
| デバイス | `deviceCategory, sessions, conversions` |
| 個別ページ | `pagePath, pageTitle, screenPageViews` |

**注意点**

- 優先アカウント（prioritised accounts）に登録されていないプロパティは引けない。
  登録を依頼する
- 同じ条件で再送すると失敗ジョブのキャッシュが返ることがある。日付を1日ずらすなど
  条件を変えて投げ直す
- GA4の「コンバージョン」は全イベントの合計。電話タップが大半を占めることが多いので、
  **KGIに当たるイベント単体の数字を必ず分けて出す**

**見るべきポイント**

- 流入上位ページからCVが出ているか（出ていなければLP化の根拠になる）
- フォームの表示→確認→完了の通過率（同一サイト内の別フォームと比較すると効く）
- モバイル比率とCVのデバイス内訳
- 新規/再訪のCVR差（再訪が強いのに再訪率が低ければ、再訪の理由を作る施策の根拠）

---

## 5. 検索での実力を測る（Semrush）

複数サイトを運用している場合、どのドメインが強いかで統合/独立の判断が変わる。

| レポート | 用途 |
|---|---|
| `domain_rank` | キーワード数・推定流入・流入の金銭価値 |
| `resource_rank_history` | 流入の推移（下降傾向の把握） |
| `resource_organic` | 実際の順位とキーワード |
| `domain_organic_organic` | 自然検索の競合 |
| `phrase_these` | ブランド名の検索需要（まとめて取れる） |

**ブランドページを作るかの判断**は `phrase_these` で検索需要を測ってから決める。
月20前後の検索しかないブランドに個別ページを作っても人は来ない。

**完全一致ドメイン**（キーワードがそのままドメイン名）が上位を取っている場合、
統合すると順位を失うリスクが高い。独立を維持する判断材料になる。

---

## 6. 棚卸し結果を仕様書に落とす

| 棚卸しで得たもの | 落とす先 |
|---|---|
| カスタム投稿タイプ・タクソノミの件数 | URL移行ブロック |
| 全URL数 | URL移行ブロックの「全件301」の数字 |
| ページ別のPV・CV | 備考欄の根拠 |
| 更新頻度（お知らせの投稿間隔など） | 更新性の判定 |
| フォームの項目数 | 備考欄（「9項目→5項目」） |
| テーマ依存のCPT | 要確認事項＋工数 |
| 重複ページ | 要確認事項（棚卸しリストを先方に出す） |

---

## 7. よく見つかる問題

実際の案件で頻出するもの。見つけたら仕様書に書く。

| 問題 | 影響 |
|---|---|
| `index.html` 有無でURLが二重化 | GA4の数字が割れ、検索でも重複 |
| 広告パラメータ（yclid・gclid）が除外されていない | ページが分裂して記録される |
| 日本語URL＋全角スペース | エンコードで壊れやすい。移行時に整形が必要 |
| 旧サブドメインが生きている | 現行ページと重複コンテンツになる |
| ページャがインデックス対象 | 薄いページの量産 |
| 掲載数件のカテゴリページが多数 | 同上。10件未満はnoindexにする |
| 同一商品がスラッグ違いで重複 | PVが分散。移行時に統合が必要 |
| sitemap.xml が外部ジェネレータ製で放置 | 新規ページが登録されない |
| 写真をPNGで配信 | 1枚2MB超も。WebP化で1/20になる |
| jQuery が10年以上前のバージョン | 保守・セキュリティのリスク |
| フォームがCMS外の静的HTML | 項目変更のたびに制作会社への依頼が必要 |
