# 役割分担と引き渡しの型

## 1. なぜ分けるか

| 観点 | Claude Code | Codex |
|---|---|---|
| 得意 | 長い文脈の統合、論点の一貫性、Skill の自動適用 | トークン効率、定型実装、自律実行 |
| コスト | サブスク＋超過は従量課金 | ChatGPT プランに付随（追加課金なし） |
| Skill | 自動読込 | 自動読込しない（`AGENTS.md` の一覧から手動で開く） |

**狙いは2つ。** ①実装者と別の目でレビューして品質を上げる ②Claude のクレジット消費を定型作業から逃がす。

---

## 2. 振り分け表

| 作業 | 担当 | 補足 |
|---|---|---|
| ヒアリング議事録の整理・与件確定 | Claude | 文脈量が多い |
| 競合調査・市場調査 | Claude | MCP（Semrush / Supermetrics）を持つのは Claude 側 |
| 提案骨子・章立て・論点設計 | Claude | `gg-proposal-standard` `gg-proposal-deck` |
| PPTX 生成スクリプトの初回実装 | Claude | Skill 参照が必要 |
| PPTX 生成スクリプトの修正・レイアウト微調整 | **Codex** | 仕様が固まった後の反復 |
| ワイヤーフレーム HTML の初回設計 | Claude | `gg-wireframe` |
| ワイヤーフレーム HTML のページ量産 | **Codex** | 型が決まった後の横展開。実績あり（リエイ・羽立） |
| 仕様書 Excel の構造設計 | Claude | `gg-sitemap-spec` |
| 仕様書 Excel の行追加・整形 | **Codex** | |
| 生成物のレビュー（抜け・崩れ・規約違反） | **Codex** | 実装した側に検品させない |
| テスト・Lint・型エラー潰し | **Codex** | |
| クライアント向け文言の最終判断 | 人間（蒲） | |
| 見積金額の決定 | 人間（蒲） | |

---

## 3. 引き渡しの型（Claude → Codex）

Codex には **会話の経緯を渡さない**。`AGENTS.md` を読めるので、渡すのは次の4点だけ。

```
Goal:        何を達成したいか（1〜2行）
Context:     触るファイルのパス。参照すべき Skill のパス
Constraints: AGENTS.md 準拠。加えて今回固有の制約があれば
Done when:   完了とみなせる条件（検証方法まで書く）
```

### 例：ワイヤーフレームの横展開
```
Goal: 下層ページ8本を、TOP と同じ規約でワイヤー化する
Context:
  - 既存: projects/lizon/wireframe/top.html
  - 規約: skills/gg-wireframe/SKILL.md
  - CSS : skills/gg-wireframe/assets/wireframe.css（編集禁止）
Constraints: AGENTS.md 準拠。各HTMLに <style> を書かない。画像はすべてグレー枠
Done when: 8本すべてが index.html から遷移でき、PC/SP 切替でレイアウトが実際に組み替わる
```

### 例：レビュー依頼
```
Goal: 生成済み PPTX スクリプトのレビュー
Context: projects/<案件>/scripts/deck.js
Constraints: AGENTS.md 準拠。gg-proposal-deck の版面規約に照らす
Done when: 版面違反・文言の重複・数値の不整合を一覧で出す。修正はしない（指摘のみ）
```

---

## 4. 引き渡しの型（Codex → Claude）

Codex の結果は **差分と指摘だけ** を Claude に戻す。生ログを貼らない。

```
- 変更したファイル: パス一覧
- 指摘: 箇条書き（重要度つき）
- 判断が要る点: 人間 or Claude に投げる論点
```

---

## 5. Skill を改訂したときの手順

1. `skills/<name>/` を編集（**正本はここだけ**。`~/.claude/skills/` 側を直接触らない）
2. Claude Code 側へ配布
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts\sync-skills.ps1`
   - macOS / Linux: `bash scripts/sync-skills.sh`
   - シンボリックリンクで配布された場合、以後の編集は 1 だけで反映される（2 は不要）。
     リンクを張れずコピー同期になった環境では、編集のたびに 2 を実行する
3. **`AGENTS.md` 第5章の Skill 一覧表を更新**（Skill の追加・削除・パス変更時）
4. 検証：`python3 scripts/check-skills-table.py` が「一致している」を返すこと
5. `STATUS.md` に改訂内容を1行記録

3 を飛ばすと Codex 側だけ古い認識で動く。これが一番起きやすい事故。4 はその検知用。

---

## 6. やってはいけない運用

| NG | なぜ |
|---|---|
| ルールを `CLAUDE.md` にだけ書く | Codex が読まない |
| 進捗を `AGENTS.md` に書く | ルールが埋もれ、毎リクエストのトークンが膨らむ |
| 同じ Skill を `skills/` と `~/.claude/skills/` で別々に編集 | 必ず片方が古くなる |
| Codex に会話履歴を丸ごと渡す | 逃がしたはずのトークンをそのまま払うことになる |
| Claude が実装したものを Claude にレビューさせる | 同じ思い込みを二度通すだけ |
