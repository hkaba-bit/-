---
status: review
runner: claude
type: other
slug: dots-test
created: 2026-10-03
---
# 依頼：dots-test 見積依頼フォームの項目設計（テスト2）

## Goal
架空の「サンプル精工」の見積依頼フォームについて、項目案を1枚の Markdown にまとめる。先方に「どこまで必須にするか」を決めてもらうための叩き台。

## Context
- 与件（架空。実在の企業ではない）：精密金属加工の中小メーカー。ターゲットは装置メーカーの設計・購買担当。図面を添付して見積を依頼してもらいたい
- 既存の成果物：projects/dots-test/wireframe/index.html の注釈に「見積フォームの項目数と図面ファイルの添付可否（形式・容量）は要確認」とある
- 参照 Skill：skills/gg-proposal-standard/SKILL.md（書き方・数字の規約）

## Constraints
- AGENTS.md 準拠。第4章「Claude Code がクラウドで②を作るとき」に従い PR まで作る
- 置き場所は projects/dots-test/docs/form-items.md
- Markdown は Notion 貼り付け前提（表を使う、装飾は最小）
- 数値（CVR の改善幅など）は書かない。書くなら「推定」と出典を明記

## Done when
- projects/dots-test/docs/form-items.md がある
- 項目ごとに「必須／任意／削除候補」「理由」「先方への確認事項」の列を持つ表がある
- 必須項目は6項目以内に絞った案になっている（理由つき）
- 図面添付について、形式・容量・複数ファイルの扱いを「要確認」として挙げている
- 依頼書の status が review
- PR タイトルが `dots-test: 依頼：dots-test 見積依頼フォームの項目設計（テスト2） [handoff:20261003-other-form-items]`

## ③ チェック観点
- Done when をすべて満たしているか
- 根拠の無い数値を書いていないか（gg-proposal-standard）
- 設計・購買担当という与件に合った項目か（購買側の項目＝納期・数量・見積書の宛名 等が漏れていないか）
