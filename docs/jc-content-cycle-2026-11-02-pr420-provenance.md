# J-Connect Germany — existing article refresh PR #420 provenance

**更新日：** 2026年11月4日（Europe/Berlin）  
**対象ブランチ：** `editorial/content-refresh-20261102`  
**同期先 main：** `5382540378b6866fbbbf8d25616fce8b4b084f5c`

## 1. 既存作業・ブランチ同期

- 現行リポジトリは `J-Connect-Global/j-connect-global`。旧候補 `NihonGatewayGermany/nihon-gateway-germany` は独立した現行リポジトリとして使用しない。
- PR #420 は、PR #421 が main に入った後、生成済み検索インデックス・サイトマップ・同日 provenance の競合で mergeable=false になっていた。
- 2026年11月4日、main の最新コミットを第2親に含む同期コミットを作成。検索インデックスではPR #420のL055・L056の更新文を保持し、サイトマップではmain側のN023更新とPR #420側のL055・L049・L056更新日を統合した。
- mainの同日 provenance はN023更新の記録として維持し、PR #420の記録は本ファイルに分離した。
- 変更はPRブランチ内のみ。mainへの直接push、マージ、本番公開は行っていない。

## 2. 今回の編集判断

新規記事は追加しない。直近の公開バッチでEES・ETIAS、クリスマス郵便、聖マルティン祭、3都市のクリスマスマーケットが公開されており、既存記事に重要な修正余地が見つかったため、検索意図の重複を避けて既存3記事を改善する。

### L055 — EES・ETIAS

- EUの現行ETIAS公式ページとFAQは、2026年11月4日現在、制度が未稼働で申請受付前、具体的な開始日は未公表と案内している。
- 「2026年第4四半期」という以前の見通しを確定した開始時期のように読める記述を修正。一部の旧案内に残る見通しと、申請受付開始日・確定日を区別した。
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

- 公開URLは既存3記事のみ。canonical、robots、hreflang、公開URL数は変更しない。
- 検索インデックスは既存L055・L056のタイトル・概要・タグを保持し、サイトマップはmainのN023更新日と本PRの3記事更新日を両立させた。
- PR #420の従来CIに加え、同期後のGitHub Actions run #41766444824 と追加確認 run #41766449475 が2026年11月4日にともに成功。同期後のコンテンツ検証・ブラウザーテストは成功している。
- Search Consoleの実測値は取得できていない。検索流入・順位・CTRの改善は主張しない。
- 移民法・雇用法・車両法の専門家レビューは未完了。PRはdraftのまま維持し、マージ・公開しない。
- ユーザー投稿、求人、連絡フォーム、管理機能、ドイツ語学習の語彙・分類、プライバシー処理は変更していない。

## 5. 次の確認

1. 同期後のGitHub Actionsでコンテンツ検証・SEO検証・ブラウザーテストが再度成功することを確認。
2. L055は2026年11月9日前後にETIAS運用状況を再確認し、滞在許可保持者の再入国記述は移民法専門家レビューを依頼。
3. L056は2027年1月1日の施行前に最低賃金・例外条件を再確認。
4. L049は2027年9月の冬季シーズン前に法令・ADAC案内を再確認。
