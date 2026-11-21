# 追加画像監査 — 2026年11月18日

## 対象と方法

- 対象：mainの content/registry/living.json と、対応するMarkdown frontmatter
- 目的：2026年10月20日の画像監査後に追加された記事のヒーロー画像重複を確認
- 変更：この監査では画像ファイル、本文、レジストリ、生成HTMLを変更しない

## 重複しているヒーロー画像

| 画像 | 使用記事 | 対応 |
| --- | --- | --- |
| /assets/images/living/birth-procedures-germany.webp | L046、L051、L110、L115 | L110とL115に別々のオリジナル画像を用意。既存のL046/L051との重複も解消 |
| /assets/images/living/japanese-resident-paperwork-editorial-v1.webp | L001、L111、L112 | 認定翻訳と税金前払いを別の場面で表す画像へ分離 |
| /assets/images/living/german-clinic-reception-editorial-v1.webp | L003、L113、L114 | 歯科保険と家族の予防接種を別の画像へ分離 |

## 画像制作時の要件

- 16:9、記事の主題が一目で分かる構図。本文の図解をヒーロー画像として流用しない。
- 実在の企業ロゴ、医療機関ロゴ、書類の個人情報、実際の画面を模した偽UIを描かない。
- AI生成またはオリジナルの編集イラストを使い、生成元と権利状態を記録する。
- 各記事の image_alt、image_caption、image_credit を同時に更新する。
- 生成画像のライセンス・アクセシビリティ・モバイルクロップ・画像容量を確認してから公開する。
- ドイツ語学習の語彙・分類データには触れない。

この重複は記事の新規追加後に発生したもので、過去の画像監査PR #361の完了を取り消すものではない。新規の画像修正は別の小さなPRで行う。
