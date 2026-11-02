# J-Connect Germany — content cycle 2026-11-02

**確認日：** 2026年11月2日（Europe/Berlin）  
**基点：** `main` / `9a1fbe0bf443478305026b38e7f574029adc94e6`  
**作業ブランチ：** `editorial/content-refresh-20261102`

## 1. 優先度1：既存作業の状態

- 現行リポジトリは `J-Connect-Global/j-connect-global`。候補 `NihonGatewayGermany/nihon-gateway-germany` は独立した現行リポジトリではなく、GitHub上の取得結果は現行リポジトリへ解決された。
- Notionの「J-Connect Germany | Growth & Content」Project Instructionsは、この実行環境から取得できなかった。代わりに `docs/content-production-workflow.md` と現行mainを確認して従った。
- mainの未完PRは0件。PR #417（ミュンヘン・ベルリン・ハンブルクのクリスマスマーケット3記事）、PR #418（日本向けクリスマス郵便ガイド）、PR #419（聖マルティン祭ガイド）はマージ済み。公開サイトのサイトマップは193 URL。
- 掲示板の公開状態APIは `messaging_version: 2026-10-23.1`、`api_version: 2026-07-13.1`。公開返信、非公開会話、インライン返信、即時公開、永続リンクの各フラグはtrue。これはAPIの機能状態であり、通知メールの配送成功を示すものではない。
- `inspectCommunityPublicationSync()` はApps Script管理画面で実行する確認関数。Googleログイン済みブラウザープロファイルがなく、5分トリガーの登録状態、Zoho Mailの実配信・返信・再送は未検証。実ユーザーへのメールは送っていない。
- ドイツ語学習カードは17,635語。自動読み上げは初期OFFを確認。公開ページで単語の音声ボタンを1回テストしたところ、リモートブラウザーでは再生エラーが表示された。リモート環境にドイツ語音声がない可能性があり、実機の故障とは断定できない。語彙・分類・進捗データは変更していない。
- ユーザー投稿、求人、連絡フォーム、管理機能、プライバシー処理は変更していない。

## 2. 今回の編集判断

新規記事は追加しない。直近の公開バッチでEES・ETIAS、クリスマス郵便、聖マルティン祭、3都市のクリスマスマーケットが公開されており、既存記事に重要な修正余地が見つかったため、検索意図の重複を避けて既存3記事を改善する。

### L055 — EES・ETIAS
- EUの現行ETIAS公式ページとFAQは、2026年11月2日現在、制度が未稼働で申請受付前、具体的な開始日は数か月前に公表すると案内。
- 記事本文の「2026年第4四半期」を確定した開始時期のように読める記述を修正。一部の案内に残る見通しと、申請受付開始日・確定日を区別した。
- 公式リンクを現在のETIAS運用状況ページへ統一。確認日を11月2日、次回確認を11月9日に設定。
- 滞在許可更新中の再入国など、個別の移民法判断は専門家レビューが必要なまま維持。

### L049 — ドイツの冬タイヤ
- ADACの2026年10月8日更新ページで、運転者60ユーロ・1点、他者を妨害した場合80ユーロ・1点、車両保有者75ユーロ・1点を確認。
- 一輪車両、農林業用車両、電動車いす等の例外と、トレーラーに冬タイヤ義務が適用されない点を追加。一般乗用車の四輪確認は維持。
- StVZO §36（Alpineマーク・最低溝深さ）とStVO §52（M+S移行措置が2024年9月30日まで）を追加参照。
- 確認日を11月2日、次回確認を2027年9月1日に設定。専門的な車両・事故・保険判断は専門家確認が必要。

### L056 — 2027年ミニジョブ
- ミニジョブ・センターの2026年10月7日公開の2027年向け公式記事が、月633ユーロ・年7,596ユーロ、時給14.60ユーロからの計算式を明示していることを確認。
- 一般案内ページに表示される2026年の603ユーロと、2027年向けの633ユーロを区別。
- 社会法典第4編第8条第1b項と公式解説に基づき、予測不能・偶発的な超過が12か月内の最大2暦月、各月最大1,266ユーロまで認められる例外を追加。
- 確認日を11月2日、施行前の次回確認を2026年12月15日に設定。雇用法の専門家レビューは未完了のまま維持。

## 3. 一次情報

- EU ETIAS current status: https://travel-europe.europa.eu/en/etias/about-etias
- EU ETIAS FAQ: https://travel-europe.europa.eu/etias/faq
- EU EES FAQ: https://travel-europe.europa.eu/de/ees/ltr/faq
- StVZO §36: https://www.gesetze-im-internet.de/stvzo_2012/__36.html
- StVO §52: https://www.gesetze-im-internet.de/stvo_2013/__52.html
- ADAC winter tyre guide (updated 2026-10-08): https://www.adac.de/rund-ums-fahrzeug/ausstattung-technik-zubehoer/reifen/sicherheit/winterreifenpflicht-deutschland/
- Minijob-Zentrale 2027 guide (published 2026-10-07): https://magazin.minijob-zentrale.de/minijob-grenze-2027/
- BMAS fifth minimum wage adjustment regulation: https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/fuenfte-mindestlohnanpassungsverordnung-milov5.html
- SGB IV §8: https://www.gesetze-im-internet.de/sgb_4/__8.html

## 4. SEO・検証・制約

- 公開サイトマップは193 URL。今回の変更は既存URLのみで、新規URLを作らない。canonical、robots、hreflangの設計は変更しない。
- `npm run build` はGitHub Actions上で成功。生成対象は199件の公開記事ページ、6件のCommunityスナップショット、4件のJobsスナップショット。最終PRで `Validate content` とブラウザーテストを確認する。
- GSC Wizardは接続期限切れで利用できず、直近28日・3か月のクエリ、表示回数、CTR、平均順位は取得していない。検索実績は推測していない。
- 実機での音声再生、Googleログインが必要なApps Scriptトリガー確認、Zoho Mail E2Eは未完了。
- 本番へのマージ・公開は行わない。編集内容と生成ファイルをPRに残し、CI成功後も人のレビューを待つ。

## 5. 次回の優先事項

1. Googleログイン済みApps Script管理セッションで5分トリガー登録を確認し、専用テスト受信箱で通知・返信・再送をE2E検証。
2. 実機のドイツ語音声で再生テスト。ブラウザーのドイツ語音声未導入とサイト側エラーを切り分ける。
3. L055のETIAS運用状況を11月9日前後に再確認し、再入国・仮滞在証明書の記述は移民法専門家レビューを依頼。
4. L056は2027年1月1日施行前に再確認。
