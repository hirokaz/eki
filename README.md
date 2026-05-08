# 易経 ─ 自然科学としての視覚化

> *I Ching as Natural Science — an interactive visualization*

易経(I Ching / Book of Changes)を「占いの書」ではなく、
**情報・組合せ論・自然現象のモデル**として捉え直し、
インタラクティブに学べる単一ページのWebアプリケーションとしてまとめます。

## 主なテーマ

| 観点 | 易経 | 自然科学的対応 |
|------|------|---------------|
| 陰陽 | 0/1 の2値 | 二進法・ビット |
| 八卦 | 3線の組合せ | 2³ = 8 通り |
| 六十四卦 | 6線の組合せ | 2⁶ = 64 通り |
| 卦の遷移 | 変爻 | 状態遷移・ハミング距離 |
| 64という数 | ─ | DNAコドン(4³ = 64)との並行 |
| 自然象徴 | 天/地/水/火/雷/風/山/沢 | 物質の状態・自然現象 |

## 技術スタック

- HTML5 / CSS3 (単一ページ + セクション切替)
- Vanilla JavaScript (ES2020+, ビルド不要)
- データは `data/*.json` で完全に分離(差し替え可能)
- 画像はすべて SVG(`assets/*.svg`)
- 外部依存ゼロ

## ディレクトリ構成

```
.
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── trigrams.json   # 八卦データ
│   └── hexagrams.json  # 六十四卦データ
└── assets/
    └── *.svg           # 太極図・八卦図など
```

## 起動方法

ブラウザの `fetch()` の制約上、ローカルHTTPサーバ経由で開いてください。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## 開発フロー

本プロジェクトは **GitHub Flow** で開発します。

1. `main` をデフォルトブランチとし、常時デプロイ可能な状態を維持
2. 作業は **issue 単位** で feature branch を切る (`feat/*`, `data/*`, `docs/*`)
3. PRを `main` に向けて作成し、セルフレビュー後にマージ
4. 改善・データ拡張も issue ベースで継続

詳しくは [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## 学習者向けドキュメント

- [docs/curriculum.md](./docs/curriculum.md) ─ 初級/中級/上級のカリキュラム
- [docs/reading-list.md](./docs/reading-list.md) ─ 信頼できる文献ガイド
- [docs/roadmap.md](./docs/roadmap.md) ─ 今後の改善候補
- [docs/data-schema.md](./docs/data-schema.md) ─ データ構造の仕様

## ライセンス

MIT License
