# ドイツ語暗記カードのデータ更新手順

暗記カード（`/germany/ja/learn-german/flashcards/`）のデータは、J-Connect の Google スプレッドシート「German Vocabulary」が正本です。サイトのレベル別収録件数は、シートと1件単位で一致させます。

## ファイル

| ファイル | 役割 |
|---|---|
| `content/learn-german/flashcards/vocabulary-sheet.json` | シート（Sheet1）のスナップショット。Web に表示する A〜I 列（ID・レベル・分類・表・裏・例文・例文の和訳・品詞・文法・用法・注意）だけを含む。除外記録は「旧ID → 統合先ID」だけを持つ。 |
| `content/learn-german/flashcards/scene-decks.json` | 場面タグと場面別教材の収録順。シートに場面列がないため、2026-10-21 時点のサイトのタグを ID で引き継いで固定したもの。`previously_published_ids` はそれまで公開していたカードID。 |
| `scripts/generate-learn-german-flashcards.mjs` | 上の2ファイルから `assets/data/learn-german/flashcards/cards-*.json` と `decks.json` を作る。 |
| `scripts/test-learn-german-flashcards.mjs` | シートとの件数・内容の一致、表示列以外を含まないこと、旧IDの扱い、教材URLの維持、生成の再現性を確認する。 |
| `assets/data/learn-german/flashcards/NOTICE.md` | データの帰属表示。ページ下部の「出典とライセンス」と内容をそろえる。 |

## 更新の流れ

1. シートで編集・承認する（全行「承認」であること）。I 列の内部メモは Apps Script で S 列に分けておく。
2. シートを xlsx で書き出し、リポジトリ外の取り込みスクリプトで `vocabulary-sheet.json` を作り直す。取り込みは見出し名で列を特定し、A〜I 列以外（出典・根拠・内部メモなど）は出力しない。
3. `node scripts/generate-learn-german-flashcards.mjs` を実行する。
4. `node scripts/test-learn-german-flashcards.mjs` と `npm run validate` を通す。
5. 差分とレベル別件数を確認してから main に反映する（main への push で公開される）。

## 決まりごと

- 既存のカードID（`a1-001`、`a1-0051`、`expand-c2-01040` など）は変えない。学習記録はカードIDごとに端末へ保存されるため、IDが同じなら記録が引き継がれる。
- サイトから外すカードは、シートの「除外記録」に旧IDと統合先IDを残す。
- レベルは J-Connect 独自の編集・配置による学習目安として説明する。カードごとに出典や翻訳方法は表示しない。帰属表示はページ下部と `NOTICE.md` にまとめる。
- 目安時間は 1枚 0.5分で計算する。
