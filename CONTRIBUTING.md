# コントリビューションガイド

本プロジェクトは **GitHub Flow** + **Issue 駆動開発** を採用します。

## 基本ルール

1. すべての変更は **issue → feature branch → PR → セルフレビュー → merge** の順
2. `main` は常時デプロイ可能な状態を保つ
3. 作業粒度は「1 PR で 1 つの目的」を満たすサイズに留める
4. 大きすぎる issue はサブタスクに分割

## ブランチ命名

| 用途 | プレフィックス | 例 |
|------|---------------|-----|
| 新機能 | `feat/` | `feat/hexagram-grid` |
| データ追加・修正 | `data/` | `data/add-jp-readings` |
| バグ修正 | `fix/` | `fix/safari-svg-render` |
| ドキュメント | `docs/` | `docs/update-contrib` |
| リファクタ | `refactor/` | `refactor/extract-trigram-renderer` |

## コミットメッセージ

Conventional Commits に近い形式を推奨:

```
<type>: <短い要約 (日本語可)>

(必要なら本文)
Refs #<issue番号>
```

`type` は `feat` / `fix` / `docs` / `data` / `refactor` / `chore` / `style`。

## データを追加・修正したい場合

`data/trigrams.json` と `data/hexagrams.json` がデータの単一の真実の源です。
スキーマは [docs/data-schema.md](./docs/data-schema.md) を参照してください。

データ追加・改訂の流れ:

1. `data/<topic>` ブランチを切る
2. JSONを編集
3. ブラウザで開いて表示確認
4. PRを開く

## レビュー観点

- データの典拠が明示されているか(コメントまたはPR本文)
- 易経の伝統的な解釈と自然科学的解釈が混同されていないか
- アクセシビリティ(キーボード操作・コントラスト)
- 外部依存を増やしていないか
