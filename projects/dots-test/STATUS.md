# STATUS.md — Dots 経路の動作確認（架空案件）

> 案件単位の進捗・申し送り。**ルール・規約は書かない**（それは `AGENTS.md`）。
> 全体の申し送りはルートの `STATUS.md`。

---

## 案件情報

| 項目 | 内容 |
|---|---|
| 案件スラッグ | `dots-test` |
| クライアント | |
| 種別 | コンペ / リニューアル提案 / 広告提案 |
| 提出期日 | |
| 起票日 | 2026-10-03 |

---

## 与件（確定分）

-

## 未確定・確認待ち

| # | 論点 | 確認先 | 期日 |
|---|---|---|---|
| | | | |

---

## 作業ログ

```
### [YYYY-MM-DD] 作業名 — 担当（Claude / Codex / 人間）
- 成果物: パス一覧
- 検証: 実施内容と結果（OK / NG）
- 判断メモ: 迷った点と選択理由
- 残課題: あれば。なければ「なし」
```

### [2026-10-03] 案件ディレクトリ作成 — 人間
- 成果物: `projects/dots-test/`
- 検証: なし
- 判断メモ: —
- 残課題: 与件の確定

### [2026-10-03] TOP ワイヤー（Claude 経路の動作確認）— Claude（② クラウド子セッション）
- 成果物: `projects/dots-test/wireframe-claude/index.html`, `projects/dots-test/wireframe-claude/wireframe.css`（共通 CSS を無編集でコピー）
- 検証: `python scripts/qa-wireframe.py projects/dots-test/wireframe-claude/index.html` OK（JS エラーなし・SP 切替でグリッド組み替え）
- 判断メモ: 与件に無い数値（創業年・精度・回答日数・事例成果）は「◯◯（仮）」で置き、注釈に要確認と明記
- 残課題: ③ 済み（PR #19）。所在地・主要デバイス・加工区分・事例の可否は要確認

### [2026-10-03] TOP ワイヤー作成（②） — Claude Code（クラウド・runner: claude）
- 成果物: `projects/dots-test/wireframe/index.html`, `projects/dots-test/wireframe/wireframe.css`（③ で共通 CSS の無編集コピーに差し替え。当初は skills/ を相対参照していた）
- 検証: `python scripts/qa-wireframe.py projects/dots-test/wireframe/index.html` → OK（JS エラーなし・SP 390px でグリッド組み替え・注釈トグル・リンク切れなし）
- 判断メモ: 与件で確定の数値は従業員80名のみ。それ以外の数値・事例・強みは「仮」「◯◯」で置き、注釈に要確認として記載
- 残課題: ③ 済み（PR #22）。創業年・取引社数・加工精度・加工の種類・事例・技術資料の有無・所在地の確認

### [2026-10-03] 見積依頼フォーム 項目設計（②） — Claude Code（クラウド・runner: claude）
- 成果物: `projects/dots-test/docs/form-items.md`
- 検証: Done when を目視と grep で確認（必須6・任意10・削除候補4、列「区分／理由／先方への確認事項」あり、図面添付の形式・容量・複数ファイルを要確認として記載、数値の記載なし）
- 判断メモ: 必須は「無いと見積が出せない／返信できない」ものに限定（会社名・担当者名・メール・図面・数量・希望納期）。材質・表面処理は図面記載と重なるため任意。購買担当向けに見積書の宛名・回答希望日・検査成績書・NDA を任意で追加
- 残課題: ③ 未実施。図面なしの相談の受け方、電話番号を必須にするか、図面ファイルの形式・容量の確認

---

## 成果物

| ファイル | 用途 | 状態（下書き / レビュー済 / 提出済） |
|---|---|---|
| `wireframe-claude/index.html` | TOP ワイヤー（Claude 経路） | 下書き |
| `wireframe/index.html` | TOP ワイヤー（Dots/claude 経路の動作確認） | 下書き |
| `docs/form-items.md` | 見積依頼フォーム 項目案 | 下書き |

> 納品候補は `outputs/` へ。`outputs/` は Git 追跡外。
