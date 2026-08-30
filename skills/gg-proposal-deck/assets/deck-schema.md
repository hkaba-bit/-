# deck.json の書式

`scripts/build_deck.js` が受け取る JSON の仕様。雛形は `deck-example.json`、
全章の枠は `deck-template.json`（`SKILL.md` の章構成表から機械的に起こしたもの）。

```bash
# 作業ルートから実行する
node skills/gg-proposal-deck/scripts/build_deck.js deck.json out.pptx
python "$(python scripts/find-skill-script.py pptx scripts/office/validate.py)" out.pptx
```

不備があるスライドが1枚でもあれば、**生成せずに全件の指摘を出して終了する**（部分的に壊れた
PPTX を後工程に渡さないため）。

---

## トップレベル

| キー | 必須 | 内容 |
|---|---|---|
| `meta` | | 表紙と PPTX プロパティに使う |
| `slides` | ✓ | スライドの配列。**配列の順序がそのままページ順** |

### meta

| キー | 内容 |
|---|---|
| `client` | クライアント名。表紙のフッターに出る |
| `title` | 提案タイトル。表紙と PPTX のタイトル属性 |
| `date` | 提出日 |
| `author` | 既定は `GrowGroup株式会社` |

---

## スライド共通

| キー | 対象 | 内容 |
|---|---|---|
| `type` | 全 | `cover` / `summary` / `chapter` / `content` / `table` |
| `chapter` | content・table | ヘッダに出す章の識別（例 `01 Requirement`） |
| `title` | cover 以外必須 | スライドタイトル |
| `lead` | summary・content・table | リード文。**です・ます**で書く |
| `source` | content・table | 出典。数字を載せたスライドには必ず付ける |

フッター `NN|総ページ数` は表紙以外の全ページに自動で入る。手で書かない。

---

## type 別

### cover — 表紙

| キー | 内容 |
|---|---|
| `title` | 省略時は `meta.title` |
| `subtitle` | 案件の一行説明 |
| `client` | 省略時は `meta.client` |

### summary — 本提案の全体像（論点表）

`points` は **3件**。`SKILL.md`「論点は3つ。4つ以上に増やさない」に従う。

| キー | 内容 |
|---|---|
| `points[].heading` | 見出し |
| `points[].current` | 現在地。**事実で書く。評価しない** |
| `points[].proposal` | 本提案。打ち手を1文で |
| `points[].refs` | 参照章。章を増減したら必ず更新する |

### chapter — 章扉

`no` ・ `label` ・ `name` の**3点セットが必須**。欠けると生成しない（版面規約）。

| キー | 例 |
|---|---|
| `no` | `01` |
| `label` | `Requirement` |
| `name` | `与件整理` |

### content — 本文

| キー | 内容 |
|---|---|
| `elements` | 箇条書きの配列 |

### table — 表

| キー | 内容 |
|---|---|
| `columns` | 見出し行の配列 |
| `rows` | 行の配列。**各行の要素数は `columns` と一致必須** |

---

## 生成しないケース（検証で落ちる）

- `slides` が空
- `type` が5種以外
- 章扉に `no` ・ `label` ・ `name` のいずれかがない
- content・table に `title` がない
- table の `rows` の列数が `columns` と合わない

## 生成物の位置づけ

意匠は再現しない。正本 PPTX は Canva 書き出し。ここで出るのは
**版面規約に沿った構造的に正しい作業用ドラフト**で、先方提出物には使わない（`SKILL.md`）。
