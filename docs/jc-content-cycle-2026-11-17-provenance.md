# J-Connect Germany コンテンツ制作・既存タスク確認記録 — 2026年11月17日

確認日時：2026-11-17 03:56（Europe/Berlin）

## 1. 実行範囲とアクセス状況

- 対象リポジトリ：`J-Connect-Global/j-connect-global`。指定候補 `NihonGatewayGermany/nihon-gateway-germany` は現在の実体ではなく、現行リポジトリは上記のJ-Connect Global配下で確認。
- main HEAD：`d0e3987f5d165efbae1426c9bb2b8a31b1703980`。
- リポジトリ権限：GitHub接続でadmin / push権限を確認。ただしリポジトリ設定は `allow_auto_merge=false`。自動マージ権限は確認できず、今回はマージ・本番公開を行わない。
- Notionの「J-Connect Germany | Growth & Content」Project Instructionsは、接続時に認証・利用者操作を要求され取得できなかった。代わりに `.github/agents/jconnect-content.agent.md`、`docs/content-production-workflow.md`、`docs/article-images.md` を確認し、これらに従った。
- ルートのREADME.mdは確認できなかった。コンテンツ生成と検証は `npm run build`、`npm run validate`、`npm run test:browser` が正式手順。
- コンテナからGitHubへのcloneはDNS解決に失敗。ローカルでNodeビルドを実行できていない。
- TinyFishのブラウザー実行は残高不足で開始されず、再試行していない。公開ページのHTML抽出とApps Scriptの読み取りAPIは利用できたが、実ブラウザーのモバイル表示・操作テストは未実施。
- GSC Wizardのアカウント照会はデータを返さず、接続原因は特定できていない。直近28日・3か月の表示回数、CTR、順位、クエリは取得できていない。実績値を推測していない。

## 2. サイト・公開URLの確認

- 公開トップ：`https://j-connect-global.com/germany/ja/`
- 公開サイトマップ：`https://j-connect-global.com/sitemap.xml`。現在239 URLを返すことを確認。
- Living一覧：`https://j-connect-global.com/germany/ja/living/`。ページ上で96件の記事を表示。
- トップページのcanonicalは正規URL、robotsは `index, follow`、viewportは `width=device-width, initial-scale=1.0`。
- 既存の生活記事には、住民登録、住まい、保険、子育て、暖房・換気、DHL、税金などがある。新規草稿は既存の「冬の暖房と換気」記事と検索意図を分け、故障時の通知・修理・賃借人の権利に限定した。
- 未完成の英語・ドイツ語ページを新規にindex/hreflang対象へ追加していない。canonical、hreflang、sitemap、公開ページの生成物は今回変更していない。

## 3. 既存J-Connectタスクの優先度1確認

### 3.1 コミュニティ通知・非公開会話

- PR #351「通知メールのプレーンテキストURL保持」は2026-10-18にマージ済み。PR記録上、既存Apps Script Webアプリをversion 33へ再デプロイし、2つの運営テストアカウントで実メール、リンク再利用、会話閲覧、返信、通知まで受け入れ確認済み。一般利用者へのテスト送信はしていない。
- 今回、公開Apps ScriptステータスAPIを読み取り確認。ライブ値は `messaging_version=2026-11-07.1`、`public_replies=true`、`private_conversations=true`、`inline_replies=true`、`instant_publish=true`、`persistent_links=true`。静的公開データAPIは `2026-07-13.1`。
- したがって、非公開会話機能の新しいAPI版が本番で応答していることは確認できた。一方、Google Apps Script管理画面にアクセスできず、5分トリガーの登録状態、最終実行時刻、失敗ログ、通知キューの残件、Zohoの実メール再送は今回確認していない。トリガーが正常とまでは断定しない。
- Apps Script、Zoho設定、シート、秘密情報、投稿・返信データは変更していない。

### 3.2 未解決のコミュニティ投稿・求人データ

- ライブAPIは有効な公開投稿7件を返した。
- 「美容健康に興味がある女性のビジネスパートナー募集」は引き続きactive。2026-10-18の過去記録では、会社・事業実態・商品／サービス・報酬・初期費用・契約条件を匿名で確認する文面が検討されていたが、送信・回答・非公開化・削除の確定記録はない。今回は第三者への連絡やモデレーションを実行していない。
- 「現地在住の方へ：荷物の受け取り・日本への発送パートナー募集」もactive。仕事内容、発送、報酬が公開されているが、事業者確認や利用者の応募状況は今回検証していない。
- 中古水栓の投稿には公開返信「Test 3 to 1」が残っている。削除済み返信の番号も表示仕様上残る。投稿・返信は利用者データであり、今回変更していない。
- ライブJobs APIとmainの `assets/data/jobs/jobs.json` は各4件のサンプル求人（A〜D）を返し、PR #486のコメントにある `job_f2a748d3-d04a-4632-828c-924c9db9b161` は現在の公開JSONには見つからなかった。公開サンプル求人の削除・変更はしていない。

### 3.3 既存オープンPR

| PR | 現在の状態 | 今回確認したこと・残件 |
|---|---|---|
| #442 | Draft、88ファイル、mergeable=false | 2027年社会保険基準額、保険、子どもの健診、既存記事更新など。現HEADのCI実行結果なし。#447との重複・main再同期・法律／税務レビューが必要。 |
| #447 | Draft、51ファイル、mergeable=false | L099〜L101（NRW就学、後払い信用、給与税控除）など。現HEADのCI実行結果なし。法務・税務・教育レビューと生成物同期が必要。 |
| #479 | Draft、2ファイル、mergeable=true | 到着後90日チェックリスト。Validate contentは成功。配布・メール同意の仕様は未確定。 |
| #480 | Ready、7ファイル、mergeable=false | 住民登録ガイドへ連邦住民登録法第27条の3か月特則を追加。Validate contentは成功したが、Codexレビューは利用上限で未完了。main再同期・法務レビューが必要。 |
| #481 | Draft、15ファイル、mergeable=true | 5記事の未検証の個人事例を一般手順へ整理。現HEADのCI実行結果なし。内容・医学／税務・翻訳実務の確認が必要。 |
| #486 | Draft、1ファイル、mergeable=true | ホーム画面のモバイルCSSのみ。Validate contentは失敗。PRコメントは旧mainのテスト求人が原因と説明するが、現在のmain公開JSONでは該当IDを確認できず、再検証が必要。 |
| #489 | Draft、2ファイル、mergeable=true | 家探し記事の実例表現を断定的に変更。Validate contentは成功。ただし根拠が不明な個人経験を確実な事実に見せるリスクがあるため、公開前に裏付けか不確実性の明示が必要。 |

- PR #351以外は今回マージしていない。#486の求人データ、#481の投稿内容、#480の住民登録ガイドなど、既存の別作業を勝手に変更していない。

## 4. 今回の調査と記事草稿

### 新規草稿：ドイツの賃貸住宅で暖房が故障したとき

- 保存先：`docs/drafts/heating-failure-rental-germany.md`
- 状態：未公開草稿。新しい公開URL、記事ID、registry、検索インデックス、サイトマップはまだ作成していない。
- 検索意図：既存の「冬の暖房・換気・カビ対策」は日常の暖房方法が中心。新草稿は、暖房停止後の安全確認、貸主への通知、記録、修理が進まない場合、家賃減額の注意に限定。
- 日本語検索結果の調査では、ドイツの暖房故障・賃借人の権利に関するドイツ語・英語の競合記事は確認できたが、同じ検索意図を満たす日本語の直接競合は検索結果上で確認できなかった。これは検索ボリュームやGSC実績を示すものではない。

### 一次情報・確認日時

- ドイツ民法典第535条（貸主の基本義務）：https://www.gesetze-im-internet.de/bgb/__535.html
- ドイツ民法典第536条（住宅の不具合による家賃減額）：https://www.gesetze-im-internet.de/bgb/__536.html
- ドイツ民法典第536a条（損害賠償・限定的な自己修理）：https://www.gesetze-im-internet.de/bgb/__536a.html
- ドイツ民法典第536c条（不具合を遅滞なく通知する義務）：https://www.gesetze-im-internet.de/bgb/__536c.html
- ドイツ賃借人協会「Heizperiode gestartet」：2026-10-01公表、2026-11-16更新表示を確認。暖房期間、20〜22°C／夜間約18°Cの説明は同協会の見解として扱い、全国一律の法律上の数値とはしていない。https://mieterbund.de/aktuelles/meldungen/heizperiode-gestartet/
- ドイツガス・水道専門協会「Was tun bei Gasgeruch?」：ガス臭時のスイッチ・火気・電話の禁止、換気、退避、屋外からの連絡手順を確認。https://www.dvgw.de/themen/gas/verbraucherinformationen/was-tun-bei-gasgeruch
- ケルン借主協会：住宅の不具合と家賃減額。https://www.mieterverein-koeln.de/service-fuer-mieter/mieterwissen-von-a-z/maengel-und-mietminderung/

### 公開前の人手レビュー

- 賃貸借法専門家による、§536・§536a・§536cの説明、家賃減額の表現、自己修理の条件、緊急対応の記述のレビュー。
- DMBの室温例は協会の見解であり、法律上の固定基準・一律減額率として扱わないこと。
- 公開時に既存の暖房・換気記事、賃貸住宅ガイド、大家への連絡用ドイツ語学習記事へ内部リンクを設定。
- 主画像は未作成。公開前に240px程度のカード表示とスマートフォンの切り取りを確認し、AI画像なら本文上部に明示する。

## 5. 既存記事の改善候補

### N033 — 2022年分の任意の確定申告期限

- 公開URL：https://j-connect-global.com/germany/ja/events/news/tax-refund-2022-deadline-december-2026/
- 公開ページのcanonicalと `index, follow` を確認。現在の最終更新表示は2026-11-01。
- 2026-11-17にNRW州税務当局FAQを再確認。申告義務のない人が2022年分の任意申告を行う期限は2026-12-31と明記されている。ELSTERの2022年分手引き検索結果も、2026-12-31までの到着と延長不可を示す。
- 総合ガイドL074（https://j-connect-global.com/germany/ja/living/income-tax-return-germany/、2026-11-14更新）との文脈リンクが相互に不足。N033からL074へ「申告義務・ELSTER手順」、L074からN033へ「2022年分の期限」を相互リンクする改善を提案。
- 今回はMarkdown・registry・生成HTMLを変更していないため、最終確認日・内部リンクの更新は未適用。

一次情報：
- https://www.finanzamt.nrw.de/faq
- https://www.finanzamt.nrw.de/steuerinfos/weitere-themen/steuererklaerung/abgabepflichten-und-fristen
- https://www.elster.de/eportal/helpGlobal?themaGlobal=help_est_ufa_10_2022
- https://www.gesetze-im-internet.de/estg/__46.html
- https://www.gesetze-im-internet.de/ao_1977/__169.html
- https://www.gesetze-im-internet.de/ao_1977/__170.html

## 6. SEO・テスト・公開結果

- 公開済みURL：0件追加、0件変更。
- canonical、hreflang、robots、sitemap、検索インデックス、公開記事HTMLは変更していない。
- 画像ファイル・クレジット・ライセンスは変更していない。
- Apps Script、Zoho、ユーザー投稿、求人、連絡フォーム、管理システム、学習語彙・分類、プライバシー処理は変更していない。
- GSC実測値なし。ブラウザーの実操作・モバイル実機検証なし。ローカルビルド・`npm run validate`・Playwright実行なし。
- 新草稿は `docs/drafts` にのみ保存し、公開ページの生成パイプラインへ追加していない。

## 7. 次の作業候補

1. 暖房故障草稿の賃貸借法レビューと、必要なら法令・判例の追加確認。
2. N033とL074の相互内部リンクを、生成HTMLまで同期できる環境で修正。
3. PR #480のmain再同期とBMG第27条レビュー、PR #481の医学・税務・翻訳実務確認。
4. PR #442と#447の重複整理、生成ファイル同期、法務・税務・教育レビュー。
5. PR #486は現在のmainを基準に再テスト。求人データは変更しない。
6. PR #489は個人事例の根拠を確認し、不明なら不確実性を戻す。
7. 管理者のGoogleセッションで5分トリガーの状態と通知キューを読み取り確認。ユーザー投稿・第三者への連絡・テスト通知は許可なしに行わない。

## 8. 今回作成したPR

- Draft PR #490：https://github.com/J-Connect-Global/j-connect-global/pull/490
- ブランチ：`content/draft-heating-failure-rental-germany-20261117`
- HEAD：`ab651d2935b393522280aaad623fb7daf74d2443`
- 変更ファイル：2件（未公開記事草稿、作業記録）。本番サイト・公開用レジストリ・生成HTMLは変更なし。
- GitHub Actionsのワークフロー実行は作成直後の確認時点でまだ表示されていない。ローカル検証も未実施のため、公開・マージ可能とは判断していない。
