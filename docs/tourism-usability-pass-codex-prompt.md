# Codex complete prompt — J-Connect Tourism Usability Pass

J-Connectの全観光記事を、ドイツ在住日本人が実際に使える状態へ改善してください。計画だけを返さず、調査、2本の共通ガイド新設、全20観光記事の編集、概略ルート図生成、内部リンク、表示修正、テスト、Draft PR作成まで完了してください。

今回は写真追加を行いません。既存のヒーロー画像とPR #299で追加したAI編集画像は維持し、ユーザー指摘①・③〜⑦の改善を優先してください。指摘②は内容が提示されていないため、推測で要件を作らないでください。

## 0. 開始条件

1. repositoryは `J-Connect-Global/j-connect-global`。
2. 最新の `origin/main` を取得する。
3. PR #299のmerge commit `0fba4813d386f81233e4e85fa44862aa01d36530` がHEADの祖先であることを確認する。
4. cleanなNew worktreeで作業し、branchは `codex/tourism-usability-pass` を使う。
5. `git reset --hard`、unrelated historiesのmerge、既存ユーザー変更の破棄は禁止。
6. 添付ZIP `tourism-usability-pass-codex-pack.zip` を安全な一時ディレクトリへ展開し、`docs/` をrepository rootの `docs/` へコピーする。
7. 次を最初に全文読む。
   - `docs/tourism-usability-requirements.md`
   - `docs/tourism-route-diagram-manifest.md`
   - `docs/bremen-route-map-example.svg`

## 1. 対象記事

`content/living/` 内の `category: "観光"` 全20記事を、ファイル名の固定リストではなくfrontmatterから列挙して確認してください。基準時点では次の20本です。

- aachen-day-trip
- amsterdam-weekend-trip
- berlin-weekend-trip
- bremen-weekend-trip
- brussels-weekend-trip
- cologne-city-guide
- cologne-family-trip
- copenhagen-weekend-trip
- duesseldorf-city-guide
- duesseldorf-family-trip
- hamburg-weekend-trip
- krakow-weekend-trip
- london-weekend-trip
- munich-weekend-trip
- nrw-nature-relax-guide
- paris-weekend-trip
- prague-weekend-trip
- rhine-river-relax-guide
- strasbourg-weekend-trip
- warsaw-weekend-trip

さらに次の共通ガイド2本を新設します。

- `content/living/germany-train-travel-guide.md`
- `content/learn-german/travel-german-phrases.md`

Jobs、Community、GAS、Legal、Directoryのソースは変更しないでください。生成処理に伴う検索index、sitemap、registry、生成HTMLの更新は許容します。

## 2. 最初に新設する共通ガイド

### A. ドイツの電車の乗り方

想定URL:

`/germany/ja/living/germany-train-travel-guide/`

タイトル:

`ドイツの電車の乗り方｜DB Navigator・Deutschlandticket・長距離列車の基本`

対象は主にドイツ在住日本人だが、到着直後の読者にも使える記事にする。最新のDB等の公式一次情報を再調査し、少なくとも次の直接リンク可能なh2/h3を持たせる。

- DB Navigatorで経路・列車種別・工事を確認する
- ICE/IC/ECとRE/RB/S-Bahnの違い
- Deutschlandticketで使える列車・使えない列車
- 市内交通券と刻印は都市・購入方法で異なる
- 運休・遅延・代行バス時の確認順
- 検札時に提示するもの
- 子連れ、車いす、エレベーター、荷物

すべてを初心者向けに冗長化せず、観光記事からアンカーリンクで参照できる実用ハブにする。価格・対象範囲・アプリUI等は実行時点の公式情報で確認し、推測しない。

### B. 観光で使えるドイツ語

想定URL:

`/germany/ja/learn-german/travel-german-phrases/`

タイトル:

`観光・週末旅行で使えるドイツ語｜駅・ホテル・観光案内所のフレーズ`

単語集ではなく、読者が画面を見せながら使える短い表現と、相手の返答で聞き取る語をセットにする。少なくとも次の直接リンク可能なh2/h3を持たせる。

- 駅でホーム・乗換・遅延を確認する
- 運休・代行バス・列車変更を聞く
- ホテルで荷物を預ける
- 観光案内所で当日券・ツアーを聞く
- 予約・集合場所・入場口を確認する
- ゆっくり話してもらう、書いてもらう

各観光記事の終盤から、関連するアンカーへ自然にリンクできる構成にする。

## 3. 主要公式リンクを「確認手順」へ変える

全20記事を実際に読み、旅程を固定する主要な公式リンクを記事ごとに2〜4件選ぶ。リンクを置くだけではなく、次を1〜3文または短いcalloutで説明する。

1. 公式ページを開いたら何というメニュー・ボタンを探すか
2. ページ内で何という原語を探すか
3. 訪問日、開始時刻、言語、残席、入口、運休等の何を最終確認するか
4. ブラウザ翻訳後も日時・人数・購入条件は原文で照合すること

例としてBremenでは、市庁舎のリンク後に `Guided tours` / `Führungen`、カレンダー、言語、残席、集合場所まで案内する。`公式サイトで確認してください` だけの文章は残さない。

同じ定型文を20回複製しない。施設・交通事業者の実際のUIを実行時点で確認し、そのページで見える名称を使う。UIが確認できない場合は、確認できなかったことを明記し、推測でボタン名を作らない。

## 4. ドイツ在住者向けに情報を再配分する

- 国内旅行記事から、刻印、Deutschlandticket、DBの列車種別などの長い反復説明を削る。
- 削った箇所では、現地固有の例外だけを短く残し、共通鉄道ガイドの該当アンカーへリンクする。
- 国外旅行記事は、ドイツの交通習慣との違いに絞って説明する。現地券の扱いが重要なら残すが、一般的な欧州旅行入門へ広げない。
- ドイツ在住者なら通常持っているスマートフォン、決済手段、DB利用経験を前提にしてよい。ただし制度の対象範囲は説明する。
- 読者像を変更した結果、導入、FAQ、チェックリスト、注意点も必要に応じて書き直す。

## 5. 内部リンクを増やす

内部リンクは、記事末尾だけではなく読者が判断する文の直後へ置く。

- Bremen冒頭でHamburgを勧める文章から、Hamburg記事へリンクする。
- 都市同士を比較する文章では比較先記事へリンクする。
- 国内鉄道の共通知識に最初に触れる場所から、鉄道共通ガイドの該当アンカーへリンクする。
- 全記事の終盤に、観光・週末旅行で使えるドイツ語記事への文脈リンクを置く。国外記事ではドイツ側の駅・宿・出発時に使う範囲だと明示する。
- family記事とcity記事、NRW自然とライン川、近距離の週末都市など、実際の次の選択につながるリンクを使う。
- `こちら`、`詳しくはこちら` だけをアンカーテキストにしない。
- 各観光記事に関連性のある文脈内内部リンクを最低3件置く。ただし数合わせは禁止。

## 6. 全20記事へ位置関係・基本ルート図を追加する

`docs/tourism-route-diagram-manifest.md` を基準に、地理と記事内容を再確認して図を作る。

### 実装

1. route dataを一元管理するsource fileを追加する。例: `data/tourism-route-overviews.json`。
2. `scripts/generate-tourism-route-overviews.mjs` を作り、データから次を生成する。
   - desktop 20枚: `assets/images/living/routes/{slug}-route-overview.svg`
   - mobile 20枚: `assets/images/living/routes/{slug}-route-overview-mobile.svg`
3. 手作業で同型SVGを40枚コピーしない。色、legend、caption、title/desc等はgeneratorで共通化し、ノード・座標・分岐・方角は記事別dataで管理する。
4. desktopは位置関係が分かる二次元配置、mobileは読み順を優先した縦配置にする。
5. desktopで最小18px、mobileで最小16px相当のラベルを保ち、縮小して読めなくしない。
6. 実線=基本ルート、破線=任意分岐とし、色だけで意味を表さない。
7. 北・南等を表示する場合は公式地図や公開座標で方向を確認する。縮尺図ではないことを表示する。
8. SVGには外部URL、script、foreignObject、base64 raster、外部fontを含めない。`title` と `desc` を持たせる。

### Markdownとrenderer

- 各記事の本文前半25%以内、旅程詳細より前にdesktop SVGのMarkdown画像を1回置く。
- altは具体的な地点順を説明する。
- captionには `位置関係を把握するための概略図です。縮尺・所要時間は目安で、当日の経路は公式交通情報で確認してください。` に相当する説明を置く。
- `renderInlineArticleImage()` を一般化し、local SVGに `-mobile.svg` siblingがある場合は`picture`のmobile sourceを生成する。
- 20ファイル名をrendererへhard-codeしない。
- SVGのwidth/height/viewBoxを安全に読み、`img`へintrinsic width/heightを付ける。
- 既存WebPのresponsive処理を壊さない。

## 7. 「失敗」見出しと文章を調整する

全20記事から、次のような読者を責める見出しをなくす。

- よくある失敗
- やりがちな失敗
- ありがちな失敗
- 典型的な失敗
- 起こりやすい失敗
- 失敗しやすいポイント
- 港で起きやすいミス

原則 `注意点のまとめ` にする。記事固有の自然な見出しがあれば `旅程を崩さないための注意点` 等でもよい。

本文も、読者を責める断定から具体的な行動提案へ調整する。単純な文字列置換ではなく、各箇条書きを読み直す。

## 8. 全記事に自然な「まとめ」を置く

- 全20記事の本文最後のh2を `## まとめ` にする。
- 2〜4段落で、行き先を選ぶ価値、最重要の判断、天候や同行者による変更を自然に振り返る。
- チェックリストの言い換えだけにしない。
- まとめで新しい事実を追加しない。
- Markdown本文中の `## 関連記事` は原則削除し、frontmatterの `related_articles` と生成UIへ集約する。
- 記事本文のまとめ後に、生成側で「公式情報・参考ソース」「関連記事」が続く順序を守る。

## 9. 公式ソース・関連記事の箇条書き表示を修正する

`assets/css/jconnect-ui.css` の `.related-section` / `.official-source-section` を修正する。

- `ul`へ適切な左paddingとmarginを戻す
- `li`の行間と項目間隔を整える
- bulletがカード/コンテナ外へはみ出さない
- desktop/mobile、light/darkで確認する
- HTMLソースの空白だけではなく、実際の描画をbrowser testで検証する

## 10. 目次を維持する

- desktopは右サイドバー `.article-sidebar-toc`
- mobileは既存の折りたたみ `.article-mobile-toc`
- 中央列へ別の目次を追加しない
- 新しい `位置関係と基本ルート` と `まとめ` が目次に入り、anchorが正しく動くことを確認する

## 11. 自動検証を追加する

新しい `scripts/test-tourism-usability.mjs` または同等の検証を追加し、対象記事をfrontmatter `category: 観光` から動的に取得する。

最低限、次を検証する。

- 対象が20記事であること。数を無言で固定せず、registry/contentと整合すること
- 各記事にroute overviewが1件あり、本文前半25%以内にある
- desktop/mobile SVGが存在し、正しいviewBox、title、descを持つ
- SVGにscript、foreignObject、外部href、base64 rasterがない
- 生成HTMLがmobile SVGを`picture source`として使い、desktop SVGへintrinsic dimensionsを付ける
- 注意見出しに `失敗` または `ミス` が残っていない
- `## まとめ` がちょうど1件で、本文最後のh2である
- Markdown本文に独立した `## 関連記事` が残っていない
- 鉄道共通ガイドと旅行ドイツ語記事へのリンクがある
- 文脈内内部リンクが最低3件ある
- 主要確認手順が少なくとも1件ある。文字列数だけで品質を保証しようとせず、代表記事はbrowser/DOM testでも確認する
- desktopで右サイドバー目次、mobileで折りたたみ目次、中央列に二重目次がない
- 公式ソース・関連記事のリストが正しくindentされる

## 12. 現行公式情報の扱い

- 新しい鉄道共通ガイドと、既存記事内で変更する主要確認手順は実行時点の公式一次情報で再調査する。
- 既存の古いコードや依頼文を正解扱いしない。
- `updated_at`、`last_verified`、`next_review` は実際に再確認した記事だけ、実行日と変動性に合わせて更新する。
- UIラベル、料金、時刻、運休、チケット範囲を推測しない。
- 外部サイトから長文を転載しない。

## 13. ビルドとテスト

少なくとも次を実行し、失敗は原因を修正して再実行する。

```bash
node scripts/generate-tourism-route-overviews.mjs
node scripts/sync-content-frontmatter.mjs --write
node scripts/build-content.mjs
node scripts/apply-layout.mjs
node scripts/test-tourism-usability.mjs
node scripts/test-content-metadata.mjs
node scripts/validate-content.mjs
node scripts/check-travel-guide-duplication.mjs
node scripts/report-content-freshness.mjs
node scripts/test-public-data-pipeline.mjs
node scripts/validate-layout.mjs
node scripts/validate-static-site.mjs
node scripts/validate-production-parity.mjs
node scripts/image-asset-budget.mjs --check
node scripts/build-pages-artifact.mjs --site-dir _site
node scripts/test-production-seo.mjs
node scripts/validate-production-seo.mjs --site-dir _site
npm run test:browser
git diff --check
```

desktop 1280px前後とmobile 390px前後で、少なくともBremen、国内city記事、family記事、国外記事の各1本を実画面確認する。概略図の文字が読めること、ソース一覧のbullet、右サイドバー目次、まとめから関連記事への順序を確認する。

## 14. PR作成

全変更を意図的にcommitし、pushしてDraft PRを作成する。

PR本文には次を明記する。

- 2本の共通ガイド新設
- 全20記事の公式サイト確認手順
- ドイツ在住者向けに削減した重複説明と内部リンク
- 20組40枚のresponsive概略ルート図
- 「失敗」見出しの解消
- 全20記事のまとめ追加
- 公式ソース/関連記事list indentation修正
- 目次を右サイドバーに維持したこと
- 実行した全テストと結果
- 写真追加をこのPRで行っていないこと
- Jobs/Community/GAS/Legal/Directoryのソースを変更していないこと

完了報告では、PR URL、commit SHA、全20記事の検証表、2本の新記事URL、テスト結果、残るリスクだけを簡潔に返してください。
