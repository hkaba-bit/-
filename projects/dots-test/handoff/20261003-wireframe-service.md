---
status: ready
runner: claude
type: wireframe
slug: dots-test
created: 2026-10-03
---
# 依頼：dots-test 加工技術ページ ワイヤー（テスト2）

## Goal
架空の BtoB 製造業「サンプル精工」の下層ページ「加工技術」のワイヤーを1枚作り、既存の TOP（projects/dots-test/wireframe/index.html）から遷移できるようにする。

## Context
- 与件（架空。実在の企業ではない）：精密金属加工の中小メーカー、従業員 80 名。目的は Web からの見積依頼を増やす。ターゲットは装置メーカーの設計・購買担当。主CV は見積依頼、副CV は技術資料ダウンロード
- 既存の成果物：projects/dots-test/wireframe/index.html（TOP）と wireframe.css
- 参照 Skill：skills/gg-wireframe/SKILL.md（patterns-corporate のサービス／技術ページの型）

## Constraints
- AGENTS.md 準拠。第4章「Claude Code がクラウドで②を作るとき」に従い PR まで作る
- 新規ページは projects/dots-test/wireframe/technology.html。TOP の「加工技術」へのリンクを `#` から technology.html に差し替える（TOP のそれ以外は変えない）
- wireframe.css は編集しない（同じフォルダのものを使う）
- 与件に無い数値・設備名はすべて「仮」「要確認」

## Done when
- projects/dots-test/wireframe/technology.html がある
- `python scripts/qa-wireframe.py projects/dots-test/wireframe/index.html projects/dots-test/wireframe/technology.html` が通る（リンク切れなし）
- TOP から technology.html に遷移でき、technology.html から TOP に戻れる
- 主CV（見積依頼）への導線がページ内に2か所以上
- 依頼書の status が review
- PR タイトルが `dots-test: 依頼：dots-test 加工技術ページ ワイヤー（テスト2） [handoff:20261003-wireframe-service]`

## ③ チェック観点
- Done when をすべて満たしているか
- TOP の変更がリンク差し替えだけか（差分で確認）
- gg-proposal-standard の P0（与件に無い数値を事実として書いていないか）
