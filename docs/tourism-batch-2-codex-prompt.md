# Codex complete prompt — J-Connect tourism Batch 2

J-Connectの観光記事改善 Batch 2 を実装してください。計画だけを返さず、調査、編集、画像統合、生成物更新、テスト、Draft PR作成まで完了してください。

## 0. 開始条件と安全確認

1. 対象repositoryは `J-Connect-Global/j-connect-global`。
2. 最新の `origin/main` を取得し、PR #299のmerge commit `0fba4813d386f81233e4e85fa44862aa01d36530` が現在のHEADの祖先であることを確認する。
3. 祖先でなければ、cleanなworktreeで `origin/main` へfast-forwardまたはrebaseしてから開始する。`git reset --hard`、unrelated historiesのmerge、既存ユーザー変更の破棄は禁止。
4. 作業branchは `codex/tourism-guides-batch-2` を使う。
5. 添付された `tourism-batch-2-codex-pack.zip` を探し、まず内容一覧を確認する。安全な一時ディレクトリへ展開した後、同梱の `assets/images/living/` と `docs/` をrepository rootの同名パスへコピーする。30枚のWebPと4つの仕様書があることを確認する。
6. `docs/tourism-batch-2-audit.md` と `docs/tourism-batch-2-image-manifest.md` を最初に読む。

## 1. 対象範囲

次の10記事だけを観光本文の編集対象にする。

- `content/living/aachen-day-trip.md`
- `content/living/amsterdam-weekend-trip.md`
- `content/living/berlin-weekend-trip.md`
- `content/living/cologne-city-guide.md`
- `content/living/cologne-family-trip.md`
- `content/living/duesseldorf-city-guide.md`
- `content/living/duesseldorf-family-trip.md`
- `content/living/nrw-nature-relax-guide.md`
- `content/living/rhine-river-relax-guide.md`
- `content/living/strasbourg-weekend-trip.md`

Jobs、Community、GAS、Legal、Directoryのソースは変更しない。求人・掲示板の案件数は評価対象外。ビルドにより生成ファイルが変わるのは可。

## 2. 編集の深さ

### 全面改稿する5本

- `cologne-family-trip`
- `duesseldorf-family-trip`
- `nrw-nature-relax-guide`
- `rhine-river-relax-guide`
- `strasbourg-weekend-trip`

現状の約1,800〜1,900字の汎用テンプレを残さず、4,500〜7,000字程度の具体的な実用記事へ書き直す。既存見出しを埋めるだけにせず、記事ごとに最適な構成を設計する。

### 大幅再編集する5本

- `aachen-day-trip`
- `amsterdam-weekend-trip`
- `berlin-weekend-trip`
- `cologne-city-guide`
- `duesseldorf-city-guide`

長さを増やすこと自体を目的にしない。一般論、同義反復、名所の列挙を削り、最新の公式情報と現地での意思決定に置き換える。本文は概ね4,000〜7,000字を目安にするが、既存記事より短くなっても密度が上がるなら許容する。

## 3. 調査ルール

- 実行時点の現在情報を、各都市・施設・交通事業者・行政・政府の公式一次情報で再調査する。古い依頼文や既存記事の記憶を正解扱いしない。
- 価格、時刻、運休日、予約方式、交通券、低排出ゾーン、入場条件、工事、季節運行は変動情報として扱い、公式ページで確認できない数字を推測しない。
- 重要な主張の直後に読者が確認できる公式リンクを置く。末尾のリンク集だけに押し込まない。
- 各記事のfrontmatter `official_sources` は、実際に本文で使った4〜8件程度の一次情報へ更新する。
- `updated_at` と `last_verified` は実際の確認日、`next_review` は変動性に応じた妥当な日付にする。
- 国境移動・身分証明・低排出ゾーンなど法的/行政的条件は政府または自治体の公式情報を優先する。
- AI生成画像を、施設の現況、バリアフリー、道路構造、列車形式などの事実の証拠として使わない。

## 4. 共通の編集品質

各記事を読んだ人が、別タブを大量に開かなくても「行くか、どう回るか、何を予約するか、何を諦めるか」を決められる状態にする。

必要な要素は次のとおり。ただし全記事で同じ見出し名・順番・文章型を使うことは禁止。

- 冒頭で「向いている人」「向かない人」「最初に固定する判断」を明示
- 到着から出発まで逆戻りを減らした一方向ルート
- 時間帯、場所、交通、そこでの判断、遅延時の縮め方を含む表
- 予約優先順位と、予約できなかった場合の代替
- 交通券の対象範囲、有効化、タッチ決済、空港/国境/郊外との境界
- 固定価格表ではなく、交通・宿・有料施設・食事を分ける予算設計
- 雨、猛暑、寒さ、強風、混雑、到着遅延への具体的な組み替え
- 車椅子、歩行補助、ベビーカー、子ども、妊娠中、高齢者への現実的な変更
- その都市で実際に起きやすい失敗を6〜10件
- 出発前に使えるチェックリスト
- 関連記事は重複を避け、読者の次の判断につながるものだけ

一般的な安全文、SEO向けの空疎な導入、全都市に通用する「最新情報は公式サイトで確認してください」の反復で文字数を稼がない。

## 5. 記事別の固有方針

### Aachen

大聖堂・Katschhof・Rathaus・Elisenbrunnenを一方向につなぐ。大聖堂内部/宝物館/ツアーの違い、礼拝との両立、Printen休憩、温泉を日帰りに入れるか別目的にするか、Hbfからの徒歩/バス、石畳を具体化する。

### Amsterdam

「予約施設を一つだけ固定」を軸に、Centraal、運河帯、MuseumpleinまたはJordaanを組む。NS、GVB、OVpay等の境界は最新公式情報で正確に説明する。自転車レーン、P+R条件、車で中心へ入る不利益、人気施設の予約失敗時代替を具体化する。

### Berlin

巨大な都市を全部回る記事にしない。Mitteの歴史軸と、壁/博物館/地区散策のうち一つを選ばせる。BVGのAB/C、BER空港、工事・代替交通、Reichstag等の予約、Museum Islandの実行時点の開館状況を公式確認する。乗換距離とエレベーター経路も扱う。

### Cologne city

Köln Hbfで荷物を処理し、Dom、Altstadt、Rheinufer、必要ならDeutzへ一方向に進む。大聖堂の礼拝/見学/塔/宝物館を混同しない。橋と駅の混雑、KVBを使う境界、イベント時の短縮、Brauhaus利用時の最低限の文化差を具体化する。

### Cologne family

市内一般ガイドの短縮版にしない。年齢と天候で、Rheinpark、動物園周辺、博物館等から一つの屋内アンカーを選ぶ構成にする。ベビーカー、授乳/おむつ、トイレ、遊び時間、昼寝、迷子時の集合地点、川と駅の混雑を扱う。施設・ロープウェイ等の営業は実行時点の公式情報で確認する。

### Düsseldorf city

日本人街を単なる名所ではなく、昼食・買い物・在住者実用の拠点として説明する。Immermannstraße、Kö、Altstadt、Rheinuferを目的別に選ばせ、全てを均等に回らせない。VRR/Rheinbahn、昼と夜の旧市街、日本食店の待ち時間、川沿いの風を具体化する。

### Düsseldorf family

市内一般ガイドと重複させない。Nordpark/Aquazoo等の家族向け候補を最新公式情報で調査し、年齢、滞在時間、予約、雨、ベビーカー、休憩設備で選べる記事にする。旧市街は主役にせず、短い公園ルートと一つの屋内アンカーを基本にする。

### NRW nature

抽象的な「森・湖・公園」をやめ、NRW内の具体的な4〜6候補を比較する。都市公園、湖畔、森林、起伏のある自然のように役割を分け、公共交通/車、路面、距離、トイレ、飲食、日陰、ベビーカー、保護区域のルール、雨後の状態で選べるようにする。候補は実行時点でアクセスと公式情報を確認できる場所だけにする。

### Rhine river

対象地域を明示し、具体的な3〜5区間または起点を比較する。鉄道・船・徒歩を組み合わせ、途中で短縮できる計画にする。運航の季節性、運賃範囲、強風・増水・暑さ、自転車との共存、ベンチ/トイレ/駅への戻り方を公式情報で確認する。単なる景色紹介にしない。

### Strasbourg

ドイツから鉄道、車、P+Rで到着する場合を比較し、中心部ではトラムと徒歩を使う。Grande Île、Petite France、大聖堂周辺を逆戻りなく組み、船や主要施設は予約優先度を示す。国境移動の必要書類、フランスの低排出規制、駐車、祝日/日曜、CTS券、アクセシビリティを最新の公式情報で確認する。

## 6. 画像統合

- `docs/tourism-batch-2-image-manifest.md` の10組を厳守する。
- 各記事に指定masterをMarkdownで1回だけ置き、指定altとcaptionを使う。
- caption末尾の開示文 `AI生成の編集イメージ。実際の現地写真ではありません。` は完全一致で、生成HTML内でも記事ごとに1回だけにする。
- PR #299の `resolveLocalInlineWebpVariant()` を利用し、480/768/1440の `srcset`、`sizes`、幅・高さ、lazy loadingを生成する。
- 画像名をrendererへ個別hard-codeしない。
- 既存ヒーロー画像は変更しない。

## 7. 目次とレイアウト

- デスクトップの目次は右サイドバー `.article-sidebar-toc` に置く現在のレイアウトを維持する。
- 記事中央列へ独立した「目次」セクションを追加しない。
- 長い見出しでも右サイドバーからはみ出さず、mobileでは既存仕様どおり自然に並ぶことを確認する。
- 10記事の生成HTMLで、h2のアンカーとサイドバー目次リンクが一致することを検証する。

## 8. 重複防止とテスト

1. `scripts/check-travel-guide-duplication.mjs` を必要に応じて拡張し、今回の10本だけでなくPR #299の10本を含む全20観光記事の実質的な段落重複を検査する。単に対象配列へ今回の10本を追加するだけでなく、今後漏れにくい実装を優先する。
2. `scripts/validate-static-site.mjs` 等の画像検査を今回の10本へ拡張する。各記事で480/768/master、1440×810、`srcset`、`sizes`、lazy loading、AI開示1回を検証する。rendererへ個別名をhard-codeしていないことも守る。
3. 右サイドバー目次が維持され、中央列に二重目次がないことをbrowser testまたは同等のDOM検証で確認する。

少なくとも次を実行し、失敗は原因を直して再実行する。

```bash
node scripts/sync-content-frontmatter.mjs --write
node scripts/build-content.mjs
node scripts/apply-layout.mjs
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

依存関係が不足している場合だけ、repositoryの既存手順に従って導入する。

## 9. 完了時の自己採点とPR

10記事を各100点で自己採点する。

- 最新性・一次情報: 20
- 目的地固有性: 20
- 旅程の実用性と判断材料: 20
- 読み物としての独自価値: 15
- 構成と読みやすさ: 10
- 視覚・アクセシビリティ: 10
- SEO・内部導線: 5

各記事90点未満なら、低い項目を修正してからPRを作る。10本が同じ文章テンプレになっていないかも最後に読み比べる。

最後に、変更ファイルを意図的にcommitし、branchをpushしてDraft PRを作成する。PR本文には次を明記する。

- 全面改稿5本と再編集5本の違い
- 調査した公式一次情報の種類と確認日
- 10点/30ファイルの画像統合とAI開示
- 全20記事の重複検査結果
- 右サイドバー目次の維持確認
- 実行した全テストと結果
- Jobs/Community/GAS/Legal/Directoryのソースを変更していないこと

完了報告では、PR URL、commit SHA、10記事の自己採点表、テスト結果、残るリスクだけを簡潔に返してください。
