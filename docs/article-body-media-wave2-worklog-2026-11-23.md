# 本文内画像改善 第2弾｜2026年11月23日

## 実施（公開前PR）

1. `content/living/family-vaccination-before-birth-germany.md`：記事の「受診の準備」節の画像を `/assets/images/living/doctor-visit-preparation.svg` から、記事内容に沿った4ステップの新しい `/assets/images/living/family-vaccination-preparation.svg` に差し替え。母子手帳・Impfpass、かかりつけ医への相談と予約、保険証・接種記録の持参、接種後のImpfpass記録に絞り、時期と接種可否は医師・STIKOと明示。
2. `content/living/kindergeld-auszahlungstermine-2027.md`：Kindergeldの支給日と申請なし支給に関係しない「出生手続き窓口」イラストを削除。制度の段階導入の図、支給日のチェックリスト、記事本文の制度情報は保持。
3. 新しいSVGをCairoSVGと日本語フォントで1200×675に描画し、目視で文字の欠落・要素の重なりがないことを確認。サイトのビルド、内容検証と生成HTMLの整合を検査済み。

## 最新の監査値

- 当初の本文画像参照：229箇所。
- 今回：1箇所差し替え、1箇所不要で削除。
- 現在の本文画像：**228箇所**（SVG **222**、WebP **6**）。
- デザイン改善済み：**3箇所**、不要で削除：**1箇所**、残り未目視評価：**225箇所**。
- 共有画像は当初3組→**1組**に減少。共有は必ずしも不適切ではないため、残る1組は内容に応じて保持可能。
- 詳細一覧は `docs/article-body-media-audit-2026-11-23.json`。

## 公開・品質

- 正確な接種可否や日程を新しいイラストが断定しないよう配慮し、本文の公式資料と解説は変更していない。
- プレビュー用PNG・使い捨てActionsは成果確認後に削除。GitHub Pagesのデプロイ結果はmainマージ後に確認。
