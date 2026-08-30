# コンポーネントカタログ

`wireframe.css` に含まれるパーツの一覧と、そのまま貼れるHTML。
**新しいCSSを書き足さず、まずこの中の組み合わせで解けないかを疑う。**

## 目次
1. 骨格（ヘッダー／フッター／下層ヘッダ）
2. ヒーロー（FV）
3. 訴求ブロック（強み・数字・STEP）
4. 一覧系（カード／ニュース／フィルタ）
5. 詳細系（テーブル／タイムライン／FAQ）
6. 人物系（インタビュー・座談会）
7. CTA・フォーム
8. 注釈

---

## 1. 骨格

### 下層ページヘッダ＋パンくず
```html
<div class="wf-pagehead">
  <div class="wf-inner">
    <span class="wf-en">SERVICE</span>
    <h1 class="wf-h1">サービス</h1>
    <p class="wf-cap">ページの役割を1行で</p>
  </div>
</div>
<div class="wf-inner"><nav class="wf-crumb"><a href="index.html">HOME</a> ＞ サービス</nav></div>
```

### グローバルナビの粒度
BtoBは第1階層6項目以内が上限。7つを超えたら情報設計の失敗を疑う。
採用サイトは「知る」系（会社・仕事・人・環境）＋「応募する」系に必ず分離する。

---

## 2. ヒーロー（FV）

### A. オーバーレイ型（写真の力で見せる／採用サイト向き）
```html
<section class="wf-hero wf-hero--overlay">
  <div class="wf-img wf-img--hero"><span>KEY VISUAL</span></div>
  <div class="wf-hero__copy">
    <h1 class="wf-h1">キャッチコピー案<br>2行まで</h1>
    <p class="wf-lead">サブコピー。誰に何を約束するかを具体的に。</p>
    <div class="wf-btns">
      <a href="#" class="wf-btn wf-btn--lg">主CTA</a>
      <a href="#" class="wf-btn wf-btn--lg wf-btn--ghost">副CTA</a>
    </div>
  </div>
</section>
```

### B. 分割型（読ませる／BtoB向き。文字量が多くても破綻しない）
```html
<section class="wf-hero wf-hero--split">
  <div class="wf-hero__copy">
    <h1 class="wf-h1">課題を言い当てる見出し</h1>
    <p class="wf-lead">解決の方法と実績を1〜2文で。</p>
    <div class="wf-btns"><a href="#" class="wf-btn">資料ダウンロード</a></div>
  </div>
  <div class="wf-img wf-img--hero"><span>KEY VISUAL</span></div>
</section>
```

**選び方**：ブランド／情緒で勝負するなら A、リード獲得と説明責任なら B。
BtoBのFVで最も多い失敗は「抽象的なスローガンだけで何屋か分からない」。
ワイヤー段階で必ず「何の会社か」が読み取れる文字列を入れておく。

### 信頼バー（FV直下）
```html
<section class="wf-sec--tight wf-sec">
  <div class="wf-inner">
    <div class="wf-grid wf-grid--3">
      <div class="wf-center"><span class="wf-stat__num">150</span><span class="wf-stat__label">導入社数</span></div>
      <div class="wf-center"><span class="wf-stat__num">98%</span><span class="wf-stat__label">継続率</span></div>
      <div class="wf-center"><span class="wf-stat__num">24h</span><span class="wf-stat__label">サポート体制</span></div>
    </div>
  </div>
</section>
```

---

## 3. 訴求ブロック

### 強み3点（アイコン＋見出し＋説明）
```html
<div class="wf-grid wf-grid--3">
  <div class="wf-card"><div class="wf-card__body">
    <div class="wf-img wf-img--icon"><span></span></div>
    <h3 class="wf-h3">強みの見出し</h3>
    <p class="wf-p">具体的な根拠を1〜2文。形容詞ではなく数字・固有名詞で。</p>
  </div></div>
  <!-- ×3 -->
</div>
```

### 数字で見る
```html
<div class="wf-stats">
  <div class="wf-stat"><span class="wf-stat__num">1968</span><span class="wf-stat__label">創業</span></div>
  <div class="wf-stat"><span class="wf-stat__num">312</span><span class="wf-stat__label">社員数</span></div>
  <div class="wf-stat"><span class="wf-stat__num">32.4</span><span class="wf-stat__label">平均年齢</span></div>
  <div class="wf-stat"><span class="wf-stat__num">86%</span><span class="wf-stat__label">有給取得率</span></div>
</div>
```
採用サイトでは「良い数字」だけを並べると不信を招く。
残業時間・離職率など不利な数字も1つ混ぜる設計を提案側から出すと差がつく。

### STEP（導入フロー／選考フロー）
```html
<div class="wf-steps wf-steps--row">
  <div class="wf-step"><h3 class="wf-h4">お問い合わせ</h3><p class="wf-p">所要3分</p></div>
  <div class="wf-step"><h3 class="wf-h4">ヒアリング</h3><p class="wf-p">オンライン可</p></div>
  <div class="wf-step"><h3 class="wf-h4">ご提案</h3><p class="wf-p">10営業日以内</p></div>
  <div class="wf-step"><h3 class="wf-h4">ご契約</h3><p class="wf-p">—</p></div>
</div>
```

---

## 4. 一覧系

### カードグリッド（事例／職種／サービス）
```html
<div class="wf-grid wf-grid--3">
  <a href="#" class="wf-card" style="text-decoration:none;color:inherit">
    <div class="wf-img wf-img--wide"><span>IMAGE</span></div>
    <div class="wf-card__body">
      <span class="wf-tag">製造業</span>
      <h3 class="wf-h3">成果が分かる事例タイトル</h3>
      <p class="wf-p">課題→施策→結果を1文で。</p>
    </div>
  </a>
</div>
```

### 絞り込み（フィルタ）
```html
<div class="wf-filter"><span>すべて</span><span>業種</span><span>課題</span><span>規模</span></div>
```
フィルタの軸数はワイヤー段階で必ず確定させる。
軸が3つ以下だと「探せない」、6つ以上だと「選べない」。4〜5軸が実用域。

### ニュース一覧
```html
<ul class="wf-newslist">
  <li><a href="#"><span class="wf-date">2026.07.31</span><span class="wf-tag">お知らせ</span>ニュースタイトルが入ります</a></li>
</ul>
```

### タブ
```html
<nav class="wf-tabs">
  <a href="#" aria-current="true">新卒採用</a><a href="#">キャリア採用</a>
</nav>
```

---

## 5. 詳細系

### 定義テーブル（会社概要／募集要項）
```html
<table class="wf-table">
  <tr><th>職種</th><td>総合職（営業／企画）</td></tr>
  <tr><th>給与</th><td>月給◯◯円〜</td></tr>
  <tr><th>勤務地</th><td>名古屋本社</td></tr>
</table>
```
SPでは自動で縦積みになる。募集要項は項目名の統一が命なので、
ワイヤー時点で全職種分の行ラベルを揃えておくと後工程が崩れない。

### タイムライン（沿革／キャリアパス／1日の流れ）
```html
<ul class="wf-timeline">
  <li><h3 class="wf-h4">1年目</h3><p class="wf-p">できるようになること</p></li>
  <li><h3 class="wf-h4">3年目</h3><p class="wf-p">任される範囲</p></li>
</ul>
```

### FAQ
```html
<div class="wf-faq">
  <details open><summary>質問文が入ります</summary><div class="wf-faq__a">回答が入ります。</div></details>
  <details><summary>質問文が入ります</summary><div class="wf-faq__a">回答が入ります。</div></details>
</div>
```
1つだけ `open` にしておくと、閉じた状態と開いた状態を同時に見せられる。

### サイドバー付き本文（コラム詳細）
```html
<div class="wf-split--sidebar">
  <article><div class="wf-dummy"><span></span><span></span><span></span></div></article>
  <aside class="wf-card"><div class="wf-card__body"><h3 class="wf-h4">資料ダウンロード</h3>
    <a href="#" class="wf-btn wf-btn--sm wf-btn--block">無料で受け取る</a></div></aside>
</div>
```

---

## 6. 人物系（採用サイトの主戦場）

### 社員インタビューカード
```html
<div class="wf-grid wf-grid--3">
  <a href="#" class="wf-card" style="text-decoration:none;color:inherit">
    <div class="wf-img wf-img--portrait"><span>PHOTO</span></div>
    <div class="wf-card__body">
      <span class="wf-tag">営業／2020年入社</span>
      <h3 class="wf-h3">本人の言葉を抜いた見出し</h3>
      <p class="wf-cap">氏名／所属</p>
    </div>
  </a>
</div>
```
見出しは役職名ではなく**本人の発言の引用**にする。読まれ方が変わる。

### インタビュー本文（Q&A交互）
```html
<div class="wf-split">
  <div class="wf-img wf-img--portrait"><span>PHOTO</span></div>
  <div>
    <h3 class="wf-h3">Q. 入社の決め手は？</h3>
    <div class="wf-dummy"><span></span><span></span><span></span></div>
    <h3 class="wf-h3">Q. 今の仕事内容は？</h3>
    <div class="wf-dummy"><span></span><span></span></div>
  </div>
</div>
```

---

## 7. CTA・フォーム

### CTAバンド（各ページ末尾に共通配置）
```html
<section class="wf-sec wf-sec--fill">
  <div class="wf-inner wf-center">
    <h2 class="wf-h2">見出し</h2>
    <div class="wf-btns wf-btns--center">
      <a href="#" class="wf-btn wf-btn--lg">主CTA</a>
      <a href="#" class="wf-btn wf-btn--lg wf-btn--ghost">副CTA</a>
    </div>
  </div>
</section>
```

### フォーム
```html
<div class="wf-form">
  <div class="wf-field">
    <label class="wf-label">お名前<span class="wf-req">必須</span></label>
    <div class="wf-input">山田 太郎</div>
  </div>
  <div class="wf-field">
    <label class="wf-label">お問い合わせ種別<span class="wf-req">必須</span></label>
    <div class="wf-input wf-input--select">選択してください</div>
  </div>
  <div class="wf-field">
    <label class="wf-label">内容</label>
    <div class="wf-input wf-input--area"></div>
  </div>
  <div class="wf-privacy">プライバシーポリシーに同意する（チェックボックス）</div>
  <div class="wf-btns wf-btns--center"><a href="#" class="wf-btn wf-btn--lg">確認画面へ</a></div>
</div>
```
入力欄は `input` ではなく `div` で作る。ワイヤーで実際に打てると、
クライアントの意識が「動くかどうか」に逸れて構成の議論が止まる。

**フォーム項目数は提案の勝負どころ**。既存フォームの項目数を数えて
「◯項目→◯項目に削減」と注釈で明示すると、CVR改善の説得力が跳ね上がる。

---

## 8. 注釈

```html
<div class="wf-note" data-n="3">
  <b>なぜここに置くか</b>離脱が最も多い位置。ここで不安を消してから料金に進ませる。
</div>
```

`data-n` は通し番号。ページ内で1から振る。
`<b>` の1行目が「ラベル」、続きが説明。ラベルは次の4種に統一すると読み手が迷わない。

| ラベル | 書く内容 |
|---|---|
| 意図 | このブロックが担う役割 |
| 根拠 | データ・ヒアリング・競合分析のどれに基づくか |
| 差別化 | 競合がやっていないこと |
| 要確認 | クライアントに決めてもらう必要がある事項 |
