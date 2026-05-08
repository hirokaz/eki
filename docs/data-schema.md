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

## データ追加の流れ

1. `data/<topic>` ブランチを作成
2. JSON を編集
3. ブラウザで `python3 -m http.server` 経由に開いて表示確認
4. 上記の不変条件を満たすか確認 (将来 `npm test` 等で自動化予定)
5. PR を作成、本文に出典を記載
