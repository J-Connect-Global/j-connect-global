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
- 外部の写真は `content/article-photo-credits.json` に、画像パス（画面サイズ別の画像を含む）、出典名・原画像ページのURL、作者、ライセンス名・URL、加工内容を登録してください。主画像・本文画像とも、説明文に続けて写真直下に出典リンクを自動表示します。記事末尾の出典一覧だけで済ませないでください。
- 写真の出典は実際の配布元を記載します。Wikimedia Commonsの画像は「Wikimedia Commons」とし、原画像のファイルページへリンクしてください。
- AI画像の既存の開示文はそのまま維持します。外部写真のクレジットをAI画像へ流用しないでください。
- 権利確認のない Google Images などの画像や、許可のない著作物は使用しないでください。

## 主画像と本文画像の選定基準

- 主画像は240px程度のサムネイルでも主題が一目で伝わる写真・イラストにします。主役や動作を大きく、中央付近のトリミングでも意味が伝わる構図を選びます。
- 文字の多い比較表・手順表・フローチャート・説明カードは本文に置き、主画像には使いません。
- 主画像を本文で再掲しません。同じ図のSVGとWebP、別名・別解像度の同じ写真も重複です。本文には別の場面や説明図を使います。
- 主題の異なる記事で同じ主画像を使い回さず、ロゴだけのプレースホルダーを解消します。
- AI画像は画像直下に明記し、実在の人物・施設・出来事の記録と誤認させません。外部写真の作者・ライセンスをAI画像へ流用しません。
- 公開前に一覧の縮小画像、記事上部、本文画像、スマートフォンでの切れ方を確認します。自動チェックは同一ファイルの重複を検出しますが、別形式の同じ図や主題の適切さは目視確認が必要です。
