# Dots で自律的に回す（依頼書 → ②Codex クラウド → ③Claude Code クラウド → PR）

OpenAI Dots（DevDay 2026 発表）は、専用のクラウド PC を持ち、GitHub などとつないで常駐するエージェント。Codex に作業を任せて PR まで作らせられる。
この環境では Dot を **依頼書の消化係** にし、PC（Orca）が止まっていてもタスクが進むようにする。
分担の正本は `references/role-split.md`、PC で回す経路は `references/orca-workflow.md`。ここは **Dots 経路の回し方** だけを書く。

> Dots は登場して間もない機能。画面の名前や設定項目が変わっていたら、ChatGPT 側の表示を正とし、このファイルを直す。

---

## 1. 全体像

| 工程 | 担当 | 場所 | 起動のしかた |
|---|---|---|---|
| ① 情報整理 → 依頼書 | Claude | claude.ai / Claude Code（クラウド可） | 人間が頼む。`gg-handoff` で `runner: dots` の依頼書を main に入れる |
| タスクの取り出し・割り振り | Dot | OpenAI のクラウド | **自動**。1時間ごと、または人間が Dot に「回して」 |
| ② 資料・ワイヤー作成 → PR | Codex（クラウド） | OpenAI のクラウド | Dot が依頼書ごとに Codex タスクを起動する |
| ③ チェック・ブラッシュアップ | Claude Code（クラウド） | Claude Code on the web | **自動**。定期実行「gg dots ③チェック」が PR を拾う |
| マージ | 人間（蒲） | GitHub | — |

PC の Orca 経路とは、依頼書の front matter `runner` で振り分ける。

| runner | 処理する側 |
|---|---|
| `dots` | Dot（このファイル） |
| `orca` または未記入 | PC の Orca（`handoff-scan.mjs` が拾う） |

---

## 2. 状態の受け渡し（Git だけで管理する）

Dot・Codex・Claude Code はそれぞれ別のクラウドで動くので、状態はすべて GitHub に置く。どこにもローカルの記録を持たない。

| 状態 | 見分け方 |
|---|---|
| 未着手 | main の依頼書が `status: ready` かつ `runner: dots`。タイトルに `[handoff:<依頼書のファイル名（拡張子なし）>]` を含む **open な PR が無い** |
| ② 作業中 | Dot が Codex タスクを起動済み（Dot の画面で確認）。PR はまだ無い |
| ③ 待ち | `[handoff:…]` を含む open な PR があり、その最新コミットに対する ③ の記録コメント（`<!-- gg-review sha=<SHA> -->`）が無い |
| 人間待ち | 最新コミットに ③ の記録コメントがある |
| 完了 | PR がマージされた（PR の中で依頼書が `status: review` になっているので、以後は拾われない） |
| 止まっている | `[handoff:…]` の PR が閉じられた。または Dot が2回続けて失敗した → 依頼書を `status: blocked` にする PR を Dot が作り、人間に知らせる |

二重処理は「同じ `[handoff:…]` の open な PR があれば起動しない」で防ぐ。PR ができる前（② 作業中）の重複は、Dot が自分の起動履歴で避ける（§3 の指示文）。

---

## 3. Dot の作成と設定（人間・初回だけ）

| # | やること |
|---|---|
| 1 | ChatGPT で Dot を新規作成する。名前は `gg-pipeline` |
| 2 | GitHub プラグインを接続し、リポジトリ `hkaba-bit/-` への読み書きを許可する |
| 3 | Codex（クラウド）でこのリポジトリの環境を作る。セットアップスクリプトは `pip install -r requirements.txt && pip install playwright && python -m playwright install --with-deps chromium && npm ci`（ワイヤーの検品 `qa-wireframe.py` に Playwright と Chromium を使う。`requirements.txt` には入っていない） |
| 4 | 下の「Dot への指示文」をそのまま Dot の指示（ゴール／常駐の指示）に貼る |
| 5 | 承認の設定：Codex タスクの起動と PR 作成は承認なし、**PR のマージと main への直接 push は不可** にする |
| 6 | 動作確認：テスト用の依頼書（`runner: dots`）を main に入れ、Dot に「今すぐ回して」と頼む |

### Dot への指示文（貼り付け用）

```
あなたは GrowGroup の提案資料パイプラインの割り振り係です。対象リポジトリは GitHub の hkaba-bit/-（main ブランチ）。

## 毎時やること
1. main の projects/*/handoff/*.md を読み、front matter が status: ready かつ runner: dots のものを集める。
2. それぞれについて、タイトルに「[handoff:<ファイル名から .md を除いたもの>]」を含む open な PR があるか調べる。あれば飛ばす。
3. 自分が過去24時間以内に同じ依頼書で Codex タスクを起動していて、まだ終わっていなければ飛ばす。
4. 残った依頼書ごとに、Codex（クラウド）のタスクを1つ起動する。ベースは main。Codex への指示は次の文だけにする（会話の経緯は渡さない）：
   「AGENTS.md の第4章『Codex がクラウドで動くとき』に従い、依頼書 <依頼書のパス> を処理して PR を作ってください。」
5. 1回に起動するのは最大3件。古い依頼書（ファイル名の日付が早いもの）から。

## 失敗したとき
- Codex タスクが失敗した、または PR を作らずに終わったら、1回だけ同じ指示でやり直す。
- 2回続けて失敗したら、その依頼書の status を blocked に変える PR を作り（タイトル「依頼書: <slug> blocked」）、失敗の理由を PR 本文に1〜3行で書く。

## してはいけないこと
- PR のマージ、main への直接 push、PR の承認（Approve）。マージは人間が決める。
- 依頼書の Goal / Done when を書き換えること。
- runner: dots でない依頼書に触ること（PC の Orca が処理する）。
- クライアント名・見積金額をリポジトリ外のサービスに送ること。

## 人間への報告
- PR ができたら、PR の URL と依頼書のタイトルを1行で知らせる。
- 何もすることが無かった回は報告しない。
```

---

## 4. ② Codex（クラウド）がやること

ルールの正本は `AGENTS.md` 第4章「Codex がクラウドで動くとき」。要点：

| 項目 | 内容 |
|---|---|
| 作業 | 依頼書の Goal / Context / Constraints / Done when に従い、Context の Skill を開いて作る |
| 依頼書 | 同じ PR の中で `status: ready` → `status: review` に変える |
| PR タイトル | `<slug>: <依頼書タイトル> [handoff:<依頼書のファイル名から .md を除いたもの>]` |
| PR 本文 | 依頼書のパス／作ったファイル一覧／Done when の各項目をどう確かめたか／未確定（要確認）として残した点 |
| 最後 | 最終メッセージの最後の行は `②完了`（PC の経路と書式を揃える。クラウドでは何も起動しない） |

---

## 5. ③ Claude Code（クラウド）の定期実行「gg dots ③チェック」

Claude Code on the web の定期実行（Routine）で、毎回新しいセッションを起動して ③ を行う。定期実行の指示文は「このファイルの §5 に従って」だけにし、手順はここを正本にする。

### 手順（定期実行から起動された Claude Code がやること）

1. GitHub の `hkaba-bit/-` で、タイトルに `[handoff:` を含む open な PR を一覧する。0件なら何もせず終わる（STATUS.md にも書かない）
2. 各 PR について、最新コミットの SHA を取り、PR のコメントに `<!-- gg-review sha=<その SHA> -->` があれば飛ばす
3. 残った PR を古い順に、1回の起動で最大3件処理する：
   1. PR のブランチをチェックアウトし、本文にある依頼書を読む
   2. `gg-proposal-standard` の P0/P1 と、依頼書の「③ チェック観点」「Done when」で検品する
   3. 種類別の検品を実行する（`skills/gg-handoff/SKILL.md` の type 表。ワイヤーなら `python scripts/qa-wireframe.py`。Playwright が無ければ先に `pip install playwright`。Chromium は Claude Code のクラウド環境に入っている）
   4. 直せるものはその場で直してコミットし、PR のブランチへ push する。push が拒否されたら、`claude/` で始まるブランチに push して PR のブランチ向けの PR を作り、その URL をコメントに書く
   5. PR にコメントを1件書く：検品結果（OK／直した点／人間に判断してほしい点）を表で。最後の行に `<!-- gg-review sha=<push 後の最新 SHA> -->` を入れる（自分の push で再検品が回らないようにするため）
4. Codex 側の作り直しが必要なほど外れている（Done when の過半が未達など）ときは、直さずにコメントで理由を書き、PR に `③差し戻し` と明記する。Dot は次の回で拾わない（PR が open のため）。人間が判断する
5. マージ・Approve はしない

### 登録内容

| 項目 | 値 |
|---|---|
| 名前 | gg dots ③チェック |
| 頻度 | 平日 9〜20 時（日本時間）の毎時7分 |
| 起動 | 毎回新しいセッション（このリポジトリの環境） |
| 指示文 | 「`references/dots-workflow.md` の §5 の手順で、Dots 経路の PR を ③ 検品してください。ファイルが main に無ければ何もせず終わってください。」 |

PR が無い回も1セッション起動する（数秒で終わる）。費用が気になる場合は頻度を2時間ごとに下げる。

---

## 6. やらないこと

| NG | なぜ |
|---|---|
| Dot や Codex に PR をマージさせる | マージは人間が決める |
| 同じ依頼書を `runner: dots` と Orca の両方で回す | 二重に作られる。`runner` で必ずどちらか一方にする |
| ③ を Codex や Dot に任せる | 作った側に検品させない（AGENTS.md 第4章） |
| Dot に会話の経緯を渡す | 依頼書がすべて。足りない情報は依頼書に足す |
| ローカルファイルで状態を持つ | 3つのクラウドで共有できない。状態は GitHub だけ（§2） |
