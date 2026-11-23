# 本文画像改善 第3弾｜2026年11月23日

## 今回改善した3点

- Dresden Striezelmarkt 2026 の3枚目：dresden-striezelmarkt-symbols.svg。シュトレン・木製ピラミッド・祭りを、季節感ある編集図解に再設計。
- ドイツの冬のカビ・結露対策の2枚目：winter-humidity-temperature-guide.svg。湿度環状ゲージと4枚の室温カードへ再設計。
- 同じ記事の3枚目：stosslueften-vs-kipplueften.svg。傾け窓と全開窓の比較イラストを再設計。

## 画質とリリースの確認

- 3 SVGとも構造、アクセシビリティのtitle/desc、1200×675のCairoSVGレンダリングに成功。
- Noto CJKフォントで生成したPNGを3点とも実際に目視。Dresdenのピラミッド羽根が上部見出しに重なっていたため、図形を縮小し、再描画で修正を確認。
- 各記事Markdown、既存URL、画像パス、数値、出典の参照内容は変更しない。
- これはJ-Connect編集部作成の説明図であり、実際の2026年の現地写真ではない。
- 一時PNGプレビューと使い捨てのGitHub Actionsは検証後に削除。
- 最終CI（build、validate、ブラウザテスト）の成功と本番デプロイの確認がマージ条件。

## 累積値

- 114記事、本文画像228点（SVG222、WebP6）。
- 内容・画質を目視して再設計した本文図解6点、残り未目視評価222点。
- 同じ画像の複数記事使用は1組。必要なら意味の一致を確認して維持。
- 詳細台帳は docs/article-body-media-audit-2026-11-23.json。
