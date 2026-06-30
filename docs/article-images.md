# 記事画像のアップロード手順

Living、ニュース・イベント、ドイツ語・学びの記事では、Markdown に `image` がない場合、記事スラッグから画像パスを自動で判定します。

## 画像アップロード先

- Living: `/assets/img/living/<slug>.webp`
- News/Event: `/assets/img/events/<slug>.webp`
- Learn German: `/assets/img/learn-german/<slug>.webp`

## 例

- Amsterdam article: `/assets/img/living/amsterdam-weekend-trip.webp`
- Berlin article: `/assets/img/living/berlin-weekend-trip.webp`
- Japan Day Düsseldorf event: `/assets/img/events/japan-day-duesseldorf.webp`
- HelloTalk article: `/assets/img/learn-german/hellotalk-language-exchange-guide.webp`

## 推奨画像形式

- WebP
- 1200 x 675 px
- 16:9
- できれば 200-300 KB 未満
- ファイル名は記事の `slug` と完全に一致させる

## 補足

- 画像ファイルがまだ存在しない場合は、J-Connect のプレースホルダー画像が自動で表示されます。
- 通常は `image` を指定せず、上記フォルダに `<slug>.webp` を置くだけで反映されます。
- 別の画像パスを使う必要がある場合は、Markdown frontmatter に `image` を追加します。
- より正確な代替テキストが必要な場合は、Markdown frontmatter に `image_alt` を追加します。
- `image_caption` と `image_credit` を追加すると、記事本文上部の画像下に小さく表示されます。
- 権利確認のない Google Images などの画像や、許可のない著作物は使用しないでください。
