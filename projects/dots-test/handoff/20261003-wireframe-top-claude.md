---
status: ready
runner: claude
type: wireframe
slug: dots-test
created: 2026-10-03
---
# 依頼：dots-test TOP ワイヤー（Claude 経路の動作確認）

## Goal
Claude だけの経路（定期実行 → ② 子セッション → ③）の1周を確認するため、架空の BtoB 製造業サイトの TOP ページのワイヤーを1枚作る。中身の完成度より、手順どおりに PR まで届くことを優先する。

## Context
- 与件（架空。実在の企業ではない）
  - 会社：精密金属加工の中小メーカー「サンプル精工」（従業員 80 名、所在地は要確認）
  - 目的：Web からの見積依頼を増やす
  - ターゲット：装置メーカーの設計・購買担当
  - 主CV：見積依頼フォーム／副CV：技術資料ダウンロード
  - 主要デバイス：PC 寄り（要確認）
- 参照 Skill：skills/gg-wireframe/SKILL.md（コーポレート／BtoB の型。完成例 assets/example-corporate-top.html を密度の基準にする）
- 参照ファイル：projects/dots-test/STATUS.md

## Constraints
- AGENTS.md 準拠。AGENTS.md 第4章「Claude Code がクラウドで②を作るとき」に従い PR まで作る
- 作るのは TOP の1ページだけ。下層ページへのリンクは `#` でよい
- 共通 CSS（skills/gg-wireframe/assets/wireframe.css）は編集せず読み込む
- 架空案件なので、数値・実績はすべて「仮」「要確認」と注釈に書く

## Done when
- `projects/dots-test/wireframe-claude/index.html` がある
- `python scripts/qa-wireframe.py projects/dots-test/wireframe-claude/index.html` が通る（JS エラーなし・SP 切替あり）
- 主CV（見積依頼）への導線がファーストビューと末尾の2か所以上にある
- 依頼書の status が review になっている
- PR タイトルが `dots-test: 依頼：dots-test TOP ワイヤー（Claude 経路の動作確認） [handoff:20261003-wireframe-top-claude]`

## ③ チェック観点
- 上の Done when をすべて満たしているか
- gg-proposal-standard の P0（与件に無い数値を事実として書いていないか）
- 注釈に意図・根拠・要確認が書かれているか（gg-wireframe の注釈ルール）
- PR タイトルの [handoff:…] と、③ の記録コメント（<!-- gg-review sha=… -->）が仕組みどおりに機能したか
