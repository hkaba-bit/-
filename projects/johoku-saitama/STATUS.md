# STATUS.md — 学校法人城北埼玉学園 城北埼玉中学・高等学校 Webサイトリニューアル

> 案件単位の進捗・申し送り。**ルール・規約は書かない**（それは `AGENTS.md`）。
> 全体の申し送りはルートの `STATUS.md`。

---

## 案件情報

| 項目 | 内容 |
|---|---|
| 案件スラッグ | `johoku-saitama` |
| クライアント | 学校法人城北埼玉学園 城北埼玉中学・高等学校 |
| 種別 | リニューアル提案（**受注済み**・2026-09-17／Backlog GG_ORDER-4733） |
| 提出期日 | 未定（10月中に戦略設計・見積精緻化、11/1〜スケジュール策定） |
| 起票日 | 2026-09-18 |

---

## 与件（確定分）

- 2026-09-17 受注。次アクションは**要件定義（サイトマップ・見積精緻化）**
- 設計16P／デザイン11P／流し込み記事／WordPress／デザイン・コーディングとも自社対応
- 3つの論点は `research/brief.md` 第4章で確定（4つに増やさない）
- 現行サイトの実測は `research/current-site-audit.md`。P0＝テンプレートのコメント崩れによる不正URL約90本
- 金額は提案書に載せない（反映先D＝見積書側）

- 与件整理は `research/brief.md`、現行サイト調査は `research/current-site-audit.md` が正本
- 3つの論点：01 スマホで受験生と保護者に出会えているか／02 最新の姿を、探さずに受け取れるか／03 学校が自分で更新し続けられるか
- 受注条件：設計16P・デザイン11P・流し込み2,365P・WordPress・外注不可

## 未確定・確認待ち

| # | 論点 | 確認先 | 期日 |
|---|---|---|---|
| 1 | GA4 の実数（スマホ比率9割の検証、現状セッション・CV） | 先方（アクセス権依頼） | 9月中 |
| 2 | 記事の実数（2,365件と2,321件の44件差） | 社内で照合 | 9月中 |
| 3 | 受注プラン（梅／竹／松）の確定 | 社内 | 9月中 |
| 4 | 周年（2026年 中学25周年）をサイトで扱うか | 先方 | 10月上旬 |
| 5 | 参考サイト・デザインの方向性 | 先方 | 9月中 |
| 6 | PDF掲載数の棚卸し | 社内（サイト内検索） | 10月上旬 |
| 7 | ワイヤー内の空欄（進学実績・募集要項・年間行事・本科/フロンティア比較・在校生の声）の原稿 | 先方（広報部） | 要件定義 |

---

## 作業ログ

```
### [YYYY-MM-DD] 作業名 — 担当（Claude / Codex / 人間）
- 成果物: パス一覧
- 検証: 実施内容と結果（OK / NG）
- 判断メモ: 迷った点と選択理由
- 残課題: あれば。なければ「なし」
```

### [2026-09-18] 案件ディレクトリ作成 — 人間
- 成果物: `projects/johoku-saitama/`
- 検証: なし
- 判断メモ: —
- 残課題: 与件の確定

### [2026-09-18] 「要件定義ご報告」提案書 モードA→B→C — Claude
- 成果物:
  - `projects/johoku-saitama/deck/outline.md`（骨子：章立て＋全スライド一覧＋想定P数82P）
  - `projects/johoku-saitama/deck/deck.json`（原稿：82枚）
  - `projects/johoku-saitama/deck/johoku-saitama_requirements-report_draft.pptx`（作業用ドラフト）
- 検証:
  - `build_deck.js` のスキーマ検証 … OK（82枚生成）
  - `pptx` skill `validate.py` … **All validations PASSED**
  - 版面の当たり判定（自作の概算スクリプト）… 可変章のはみ出し 0枚。固定P57のみ約0.03インチ超過（確定文言のため未修整）
  - **PDF化・画像化による目視確認は未実施**。本コンテナに LibreOffice Impress のフィルタが入っておらず
    `soffice --convert-to pdf` が "source file could not be loaded" で落ちる（`AGENTS.md` 第6章の手順を満たせていない）
- 判断メモ:
  - 受注済み案件のため、章01〜03・06に重心を置き、章07/09/11を各1枚に抑えた。競合比較は章17（固定）以外に置かない
  - 数値目標（章04）に目標値を置かなかった。GA4実数が未取得で、仕様書の数値目標欄がサンプル値のまま
  - 改善見込みは実測から導ける項目（不正URL約90本→0本、フォント4→1〜2ファミリ等）に限定し、流入予測は書かない
  - 記事数は 2,365件と2,321件を3枚（P5・P9・P38）で併記し、いずれも「要確認」と明記
  - 論点の参照列を brief.md の「2・5／3・6／8・11章」から「02・03・05／03・06／03・08・11章」へ更新。
    章03に論点別の打ち手を各1枚置いたため。**論点そのものは3つのまま**
  - 章13〜19（28枚）は `deck-template.json` から機械転記。1文字も編集していない
- 残課題:
  - PDF→画像の目視確認（Windowsローカルまたは soffice が揃う環境で実施）
  - Codex レビュー（`AGENTS.md` 第4章：Claude で実装 → Codex でレビュー）
  - 別紙：サイトマップ仕様書（`gg-sitemap-spec`）／ワイヤーフレーム（`gg-wireframe`）
  - `skills/gg-proposal-deck/references/structure.md` の章別スライド定義が未記入。本案件の並びを追記すると次案件が速い

### [2026-09-18] 先方合意用クリッカブルワイヤーフレーム作成 — Claude
- 成果物: `projects/johoku-saitama/wireframe/`（index / top / junior-high / frontier / admission-junior / school-life ＋ wireframe.css ＋ shots/ にPC・SP計12枚）
- 検証: `python3 scripts/qa-wireframe.py --shots projects/johoku-saitama/wireframe/shots projects/johoku-saitama/wireframe/*.html` → **全6ページ OK**（JSエラー0／リンク切れ0／SP切替でキャンバス390px・グリッド組み替わり／注釈トグル可）。PC・SPのスクリーンショットを目視、崩れなし。注釈OFFでも構成が読めることを確認
- 判断メモ:
  - **SP基準で設計**（論点01／9割スマホは推定）。FVは overlay ではなく split 型。SPで文字がKVに重なると見出し・リード・CTAが画面外に出るため
  - ワイヤーは5ページに絞り、3つの論点に1枚以上ずつ当てた。網羅より密度を優先（gg-wireframe の方針）
  - グローバルナビは6項目（中学校／高等学校／学校生活／入試・説明会／学校案内／アクセス）に固定。現行の学部区分とコース区分の二重導線を1本化
  - **学校の事実（実績数値・行事名・コース詳細）は brief.md と current-site-audit.md にあるものだけを使用**。無いものは創作せず「—」「学校確認のうえ記入」として空欄にし、要確認注釈を付けた
  - 現行サイトの P0（コメント崩れによる旧ナビの生きたリンク）は再現せず、index に「移行対象にしない」旨を明記
  - 学校生活のギャラリーは8枚→4枚に削減。SPで1列になり、下のコンテンツに到達しなくなるため
  - `wireframe.css` は無編集でコピー。各HTMLに `<style>`・インラインスタイル・メディアクエリはゼロ（コンテナクエリのみ）
- 残課題:
  - ワイヤー内の空欄（進学実績・募集要項・年間行事・本科/フロンティア比較表の4行・在校生の声）の原稿を先方からもらう
  - 16Pの内訳は受注プラン未確定のままの暫定案。確定後にサイトマップを更新する
  - 高等学校トップ／入試情報（高校受験）／進路実績は今回WF未作成。要件定義で詰める
  - レビューは Codex へ（`references/role-split.md` の引き渡しの型）

---

## 成果物

| ファイル | 用途 | 状態（下書き / レビュー済 / 提出済） |
|---|---|---|
| `research/brief.md` | 与件整理（下流の共通の土台） | 下書き |
| `research/current-site-audit.md` | 現行サイト棚卸し（2026-09-18 実測） | 下書き |
| `deck/outline.md` | 提案書骨子（モードA） | 下書き |
| `deck/deck.json` | 提案書原稿（モードB） | 下書き |
| `deck/johoku-saitama_requirements-report_draft.pptx` | 社内レビュー用ドラフト（モードC） | 下書き |

| `research/current-site-audit.md` | 現行サイト棚卸し | 下書き |
| `wireframe/index.html` | サイトマップ兼ハブ（3論点との対応・16P内訳・確認事項） | 下書き |
| `wireframe/top.html` | TOP（論点01） | 下書き |
| `wireframe/junior-high.html` | 中学校トップ（論点01） | 下書き |
| `wireframe/frontier.html` | 高等学校 フロンティアコース（論点02） | 下書き |
| `wireframe/admission-junior.html` | 入試情報・中学受験（論点02・03） | 下書き |
| `wireframe/school-life.html` | 学校生活（論点03） | 下書き |
| `wireframe/shots/` | PC・SP スクリーンショット（提案書貼付用） | 下書き |

> 納品候補は `outputs/` へ。`outputs/` は Git 追跡外。
