# Claude Code 実行指示書｜Claude × Codex 二刀流環境の整備

あなた（Claude Code）は、このフォルダの内容をもとに **Claude Code と Codex を併用する作業環境** を構築・整備する。
作業対象は蒲のローカル作業ディレクトリ（GrowGroup プロデューサー業務用）。

---

## 0. 前提と原則

| # | 原則 | 理由 |
|---|---|---|
| 1 | **ルールの正本は `AGENTS.md` 1本** | Codex はネイティブで読む。Claude Code は `CLAUDE.md` から参照させる。二重管理は必ず崩壊する |
| 2 | **`CLAUDE.md` は薄く保つ** | セッション開始時に全文が毎リクエストに載る。200行以内。長い手順は Skill に逃がす |
| 3 | **進捗とルールを混ぜない** | ルール＝`AGENTS.md` / 進捗・申し送り＝`STATUS.md`。混ぜるとトークンが膨らみ、ルールが埋もれる |
| 4 | **Skill は `skills/` を正本にして配布する** | 同じ内容が2箇所にあると必ず片方が古くなる |
| 5 | **認証情報を共有ファイルに置かない** | `AGENTS.md` / `CLAUDE.md` / `STATUS.md` / Skill にキーを書かない。`.env` のみ、かつ `.gitignore` 済み |
| 6 | **実装は Claude、レビューは Codex** | 役割分担の詳細は `references/role-split.md` |

---

## 1. 作るもの（ディレクトリ構成）

```
<作業ルート>/
├── AGENTS.md              ← ルール正本（Codex がネイティブ参照）
├── CLAUDE.md              ← Claude Code 用。AGENTS.md を参照＋Claude固有のみ
├── STATUS.md              ← 進捗・申し送り。ルールは書かない
├── .env                   ← 認証情報。.gitignore 済み
├── .env.example           ← キー名だけ（値は空）
├── .gitignore
├── skills/                ← Skill 正本（gg-* をここで管理）
│   ├── gg-proposal-standard/
│   ├── gg-proposal-deck/
│   ├── gg-wireframe/
│   ├── gg-sitemap-spec/
│   ├── gg-proposal-artifact/
│   └── gg-calendar-task/
├── scripts/               ← 共通スクリプト（PPTX生成・PDF変換・QA等）
├── projects/              ← 案件ごとの作業ディレクトリ
│   └── <案件スラッグ>/
│       ├── STATUS.md      ← 案件単位の進捗
│       └── outputs/
└── references/            ← 環境まわりのドキュメント
    └── role-split.md
```

---

## 2. タスク

### T1. ルールファイルの設置
1. このフォルダの `AGENTS.md` `CLAUDE.md` `STATUS.md` を作業ルートへ配置
2. `AGENTS.md` の `<TODO>` 部分（作業ルートの絶対パス、Node/Python のバージョン）を実環境から取得して埋める
3. `CLAUDE.md` が200行を超えていないか確認。超えていたら Skill 側へ移す

**完了条件**：3ファイルが存在し、`CLAUDE.md` に `AGENTS.md` への参照行がある。

### T2. 認証情報の隔離
1. `.gitignore` に `.env` `*.key` `credentials*.json` `outputs/` を追加
2. 既存ファイルに API キー・パスワードが直書きされていないか全文検索（`AGENTS.md` `CLAUDE.md` `STATUS.md` `skills/` を対象）
3. 見つかったら `.env` へ移し、元は環境変数参照に書き換える
4. `.env.example` をキー名のみで生成

**完了条件**：grep でキーらしき文字列がヒットしない。検出結果を `STATUS.md` に記録。

### T3. Skill の正本一元化
1. `skills/` に既存の gg-* スキルを集約
2. Claude Code 側へ配布（`~/.claude/skills/` へシンボリックリンク。Windows は `mklink /D`、不可なら同期スクリプト `scripts/sync-skills.*` を作成）
3. **Codex は Skill を自動読込しない**ため、`AGENTS.md` の「Skill 参照」節にスキル名・用途・パスの一覧表を書き出す（Codex はここを読んで必要なファイルを開く）
4. スキルを追加・改訂したら 2 と 3 の両方を更新する手順を `references/role-split.md` に追記

**完了条件**：`skills/` を更新すると Claude Code 側にも反映され、`AGENTS.md` の一覧表が実体と一致している。

### T4. 案件ディレクトリのテンプレ化
1. `projects/_template/` を作成（`STATUS.md` 雛形＋`outputs/`）
2. `scripts/new-project.sh`（または `.ps1`）で `projects/<スラッグ>/` を生成できるようにする

**完了条件**：コマンド1本で案件ディレクトリが立ち上がる。

### T5. 動作確認
1. Claude Code を作業ルートで起動し、`CLAUDE.md` 経由で `AGENTS.md` のルールが効いているか確認（例：「今のルールで禁止されていることを3つ挙げて」）
2. Codex を同ディレクトリで起動し、`AGENTS.md` を読めているか確認
3. 両方の結果を `STATUS.md` に記録

**完了条件**：両ツールが同じルールを答える。

---

## 3. 出力ルール
- 各タスク完了ごとに `STATUS.md` へ追記（書式は `STATUS.md` 内に記載）
- 迷ったら「安全側・シンプル側」を選び、判断理由を `STATUS.md` に残して先へ進む
- クライアント実名を含むファイルは `projects/` 配下に留め、外部送信しない

---

## 4. 未確定事項（蒲に確認）

| # | 論点 | 備考 |
|---|---|---|
| 1 | 作業ルートの場所 | ローカルのみか、Git 管理するか |
| 2 | Git 管理する場合のリポジトリ | private 前提。`outputs/` は除外 |
| 3 | Codex の起動形態 | Codex CLI / IDE 拡張 / クラウド実行のどれを主に使うか |
| 4 | `skills/` の共有範囲 | 蒲個人か、プロデューサー事業部で共有するか |
