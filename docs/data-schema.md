# データスキーマ

`data/` 配下の JSON ファイルが本アプリの単一の真実の源です。すべて UTF-8、配列形式。

## `data/trigrams.json`

8 件 (八卦) の配列。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | int | ✓ | 0–7。Fuxi (伏羲) 順の二進値。`lines[2]*4 + lines[1]*2 + lines[0]` と一致 |
| `binary` | string | ✓ | 3桁の0/1文字列 (`id` の二進表記、上位ビットが top 爻) |
| `lines` | int[3] | ✓ | 爻の配列 `[底, 中, 上]`。陽=1、陰=0 |
| `symbol` | string | ✓ | Unicode 八卦象 (☰ U+2630 〜 ☷ U+2637) |
| `name_zh` | string | ✓ | 漢字名 (乾・兌・離・震・巽・坎・艮・坤) |
| `name_jp` | string | ✓ | 日本語読み (カタカナ) |
| `name_en` | string | ✓ | 英訳 (Heaven, Lake, …) |
| `natural` | string | ✓ | 自然象徴 1 文字 (天/沢/火/雷/風/水/山/地) |
| `attribute` | string | ✓ | 属性 (健/悦/麗/動/順/陥/止/順 など) |
| `family` | string | ✓ | 家族象 (父/母/長男/中男/少男/長女/中女/少女) |
| `direction` | string | ✓ | 方位 (先天/後天で異なる場合は両方を併記) |
| `season` | string | ✓ | 季節 |
| `body` | string | ✓ | 身体象 |
| `summary` | string | ✓ | 1–2 文の概説 |

### Fuxi 二進値 (id) の規約

- `id = lines[2]*4 + lines[1]*2 + lines[0]`
- `lines[0]` が **底爻 (line 1)**、`lines[2]` が **上爻 (line 3)**
- 易の図像では下から上に読むため、視覚順は `lines[0] → lines[1] → lines[2]`

## `data/hexagrams.json`

64 件 (六十四卦) の配列。王弼順 (現行通行本) で並ぶ。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `kw` | int | ✓ | 王弼順番号 1–64 |
| `fuxi` | int | ✓ | Fuxi (伏羲) 二進値 0–63 = `upper*8 + lower` |
| `symbol` | string | ✓ | Unicode 六十四卦象 (`U+4DC0 + (kw-1)`) |
| `upper` | int | ✓ | 上卦の trigram `id` (0–7) |
| `lower` | int | ✓ | 下卦の trigram `id` (0–7) |
| `name_zh` | string | ✓ | 漢字名 |
| `name_jp` | string | ✓ | 日本語読み |
| `name_en` | string | ✓ | 英訳 (Wilhelm/Baynes 訳に概ね準拠) |
| `summary` | string | ✓ | 1 文の自然象徴ベースの概説。占断的解釈は含めない |

### 不変条件 (CIで検証可能)

1. 全 64 件、`kw` は 1〜64 をちょうど一回ずつ
2. `fuxi == upper * 8 + lower`、かつ全 64 件で `fuxi` も 0〜63 をちょうど一回ずつ
3. `symbol == chr(0x4DC0 + kw - 1)`
4. `upper, lower ∈ [0, 7]`

## `data/hexagrams-deep.json`

64卦の深層解説。`hexagrams.json` と KW番号で結合される(別ファイルにすることで原データを軽量に保つ)。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `kw` | int | ✓ | 王弼順番号 1〜64 |
| `image` | string | ✓ | 卦象から読み取れる「画像」(1 行) |
| `modern` | string | ✓ | 現代生活への翻訳(1〜2 行) |
| `key_question` | string | ✓ | 自分に投げる問い(1 行) |

### 不変条件
- 64 件、`kw` は重複なく 1〜64 を網羅
- すべての kw が `hexagrams.json` の kw に存在

UI では `loadData` 時に KW で結合して `hexagrams[i].deep` として参照される。

## ID 命名規則

文字列 `id` フィールドは以下の規則で揺れなく命名する:

- 小文字 ASCII のみ使用
- 単語区切りは `_` (snake_case)
- 日本語のローマ字化はヘボン式準拠、ただしマクロン (ō, ū) は使わず
  - 長音は素直な綴り (`ouhi`, `chusei`, `souho`)
- 促音 (っ) は子音重ね (`bukkyoku`, `hippan`)
- 撥音 (ん) は `n`、母音前の境界は `_` で明示 (`hen_eki`, `kan_eki`)
- 不要な末尾文字を残さない (`jokar` ✗ → `joka` ✓)

### 既存 ID 一覧 (worldview)

| id | 漢字 | 読み |
|----|------|------|
| `hen_eki` | 変易 | へんえき |
| `fueki` | 不易 | ふえき |
| `kan_eki` | 簡易 | かんえき |
| `tairitsu_souho` | 対立相補 | たいりつそうほ |
| `bukkyoku_hippan` | 物極必反 | ぶっきょくひっぱん |
| `jichu` | 時中 | じちゅう |
| `chusei` | 中正 | ちゅうせい |
| `ouhi` | 応比 | おうひ |
| `joka` | 序卦 | じょか |

## `data/worldview.json`

「易学的な見方」9 原理の配列。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | string | ✓ | 安定した英字キー (`henneki`, `fueki` 等) |
| `name_zh` | string | ✓ | 漢字名 (変易・不易・簡易…) |
| `name_jp` | string | ✓ | 平仮名読み |
| `name_en` | string | ✓ | 英訳 |
| `concept` | string | ✓ | 1 行の核となる主張 |
| `summary` | string | ✓ | 100 字前後の解説 |
| `related_kw` | int[] | ✓ | この原理を体現する卦の KW番号配列 (`hexagrams.json` に存在すること) |
| `practice` | string | ✓ | 日常への応用ヒント |
| `source` | string | ✓ | 出典 (繋辞伝・序卦伝など) |

### 不変条件
- 全ての `related_kw` は `data/hexagrams.json` の `kw` に存在する
- `id` はファイル内で一意

## `data/applications.json`

人生・経営・人間関係 の 3 領域における応用シナリオの配列。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | string | ✓ | 一意キー (`life-self`, `biz-phase` 等) |
| `category` | string | ✓ | `life` / `business` / `relationships` のいずれか |
| `title` | string | ✓ | カード見出し |
| `situation` | string | ✓ | 想定する状況の解説 |
| `questions` | string[] | ✓ | 自分に問うべき問いのリスト(2-4 件) |
| `related_kw` | int[] | ✓ | 関連卦の KW番号 |
| `principles` | string[] | ✓ | `worldview.json` の `id` の配列 |

### 不変条件
- `category ∈ { life, business, relationships }`
- 全ての `related_kw` は `hexagrams.json` の `kw` に存在
- 全ての `principles` の各要素は `worldview.json` の `id` に存在

## `data/figures.json`

歴史上、易経を読み・適用した人物の配列。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | string | ✓ | 一意キー (英字) |
| `name_zh` | string | ✓ | 漢字または通名 |
| `name_jp` | string | ✓ | ふりがな |
| `name_en` | string | ✓ | 英名 |
| `era` | string | ✓ | 時代 |
| `region` | string | ✓ | 地域 |
| `domain` | string | ✓ | 主たる領域 |
| `contribution` | string | ✓ | 易経との関わり |
| `level` | enum | ✓ | `fact` / `tradition` / `interpretation` |
| `related_kw` | int[] | ✓ | 関連卦 KW番号 |
| `principles` | string[] | ✓ | `worldview.json` の id |

## `data/disciplines.json`

易の影響を受けた・並行する学問領域。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | string | ✓ | 一意キー |
| `name_jp` | string | ✓ | 日本語名 |
| `name_en` | string | ✓ | 英名 |
| `core_link` | string | ✓ | 易との核となる接続 |
| `summary` | string | ✓ | 100–200 字で接続の内容 |
| `level` | enum | ✓ | `fact` / `tradition` / `interpretation` |
| `exemplars` | string[] | ✓ | `figures.json` の id 配列 |
| `related_kw` | int[] | ✓ | 関連卦 KW番号 |

### 信頼レベルの定義

- `fact`        ─ 一次史料・公刊論文で確認できる事実
- `tradition`   ─ 伝統的に帰属されているが現代史学では帰属に議論あり(例: 文王による卦辞編纂)
- `interpretation` ─ 後世の比喩・並行発見・構造的アナロジー(例: DNA コドン対応)

## `data/cases.json`

実践ケーススタディ。`applications.json` (シナリオ集=抽象) と対をなす実例集 (具体)。

| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|-----|
| `id` | string | ✓ | 一意キー (例: `L01`, `B05`, `R10`) |
| `category` | string | ✓ | `life` / `business` / `relationships` |
| `title` | string | ✓ | 見出し |
| `situation` | string | ✓ | 状況の説明 (匿名化済み) |
| `kw` | int[] | ✓ | 関連卦 KW番号 |
| `principles` | string[] | ✓ | `worldview.json` の id |
| `action` | string | ✓ | 取った行動 |
| `outcome` | string | ✓ | 結果 |
| `reflection` | string | ✓ | 振り返り・学び |

### 不変条件
- `id` は一意
- `category` は3値のいずれか
- 全 `kw` が `hexagrams.json` に存在、全 `principles` が `worldview.json` に存在
- 全 5 文字列フィールド (title/situation/action/outcome/reflection) を持つ

### 注意
- 占断的な「予言が当たった」式の記述は含めない
- 構造的整理 + 行動の参考としての記述に統一
- 個人特定を避けて匿名化

## データ追加の流れ

1. `data/<topic>` ブランチを作成
2. JSON を編集
3. ブラウザで `python3 -m http.server` 経由に開いて表示確認
4. 上記の不変条件を満たすか確認 (将来 `npm test` 等で自動化予定)
5. PR を作成、本文に出典を記載
