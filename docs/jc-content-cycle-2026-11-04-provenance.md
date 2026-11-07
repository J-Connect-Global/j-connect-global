# J-Connect Germany content cycle — 2026-11-04

## 1. 実行範囲・前提

- ドイツ現地確認日時：2026年11月4日 04:00–04:20 CET。
- 対象サイト：https://j-connect-global.com/germany/ja/
- 現行リポジトリ：`J-Connect-Global/j-connect-global`。候補 `NihonGatewayGermany/nihon-gateway-germany` は現行の実体として使わない。
- Notionの「J-Connect Germany | Growth & Content」Project Instructionsは、Notionコネクタが追加のユーザー入力を要求したため、この非対話実行では取得できなかった。代わりに `.github/agents/jconnect-content.agent.md`、`docs/content-production-workflow.md`、`docs/trust-and-legal-checklist.md` を確認。
- リポジトリ直下にREADMEは見当たらない。
- ChatGPT Work専用ツールはこの実行枠で公開されていない。TinyFishのクラウドブラウザーとGitHub APIを使用。
- Search Console/GSC Wizardのサイト一覧は契約・接続ゲートで取得できず、直近28日・3か月の実測値は使用していない。

## 2. 既存タスク（最優先）

### PR #351 — コミュニティ／非公開メッセージ

- mainへmerge済み。本番APIは以前の受け入れ確認で `communityMessagingStatus` version `2026-10-23.1` を返し、public/private replies、permanent links、email notifications、recovery flow が有効。
- 運営テスト投稿「運営テスト5」は2026年11月3日に非公開化済み。公開投稿を追加していない。
- 今回はGoogleのサインイン済みブラウザープロファイルがなく、Apps Scriptの5分トリガー、Zoho通知の再送・返信を新たな安全なテスト受信箱でend-to-end確認できなかった。追加の認証情報やテストアカウントを推測していない。

### PR #355 — ドイツ語学習フラッシュカード

- mainへmerge済み。GitHub Actionsでコンテンツ検証・デプロイ・ブラウザーテストが成功（Chromium browser tests 140 passed）。
- 2026年11月4日のライブ確認で、学習開始後の「単語の自動読み上げ」は初期状態OFFであることを確認。
- クラウドブラウザー環境では音声再生要求が拒否され、コードが自動読み上げを安全にOFFへ戻し、音声エラー通知を表示した。これは実装上の `speechFailed()` の想定動作であり、ON状態の維持を検証できたわけではない。
- リポジトリのPlaywrightテストは音声APIをモックし、ON/OFF、単語音声、裏面の例文音声、音声拒否時の自動停止を検証している。ライブ端末での実音声は未検証。

### PR #420 — 既存記事3本の更新

- PR #421のmain反映後に生じた検索インデックス・サイトマップ・同日provenanceの競合を、2026年11月4日にmainを取り込むマージコミット `52cd1d1583df36b0cbfe5c276d9440b6381689e5` で解消。
- main側のN023更新日と本PR側のL055・L049・L056更新日を両立。PRはGitHub上でmergeable=trueになった。
- 同期後CI run #41766444824は実行待ち。PRはDraftのまま。ETIASの移民法判断、冬タイヤの特殊車両・保険判断、ミニジョブの雇用法上の個別判断について人手レビューが必要なため、merge・公開していない。

### PR #422 — 新規記事ドラフト

- 既存のL074（EU輸入手数料）とL075（d-you）を含むDraft PR。前回CIは成功していたが、今回の追加変更後はGitHub Actionsを再実行する。
- 人手による税関・税務、行政・プライバシー、社会保障・住宅手当の専門レビューが必要。PRはDraftのまま維持する。

## 3. 新規記事ドラフト

### L076 — ドイツの求職者向け基礎保障

- 2026年7月1日に旧Bürgergeldから新しい求職者向け基礎保障へ移行した制度を解説。
- 失業保険（保険加入に基づく給付）、求職者向け基礎保障（世帯の必要と収入・資産に基づく給付）、住宅手当・子ども加算、社会扶助を区別。
- 15歳以上・年金受給開始年齢未満、原則1日3時間以上の就労能力、困窮状態、SGB IIの給付除外を説明。外国籍の人は就労許可・滞在資格・給付除外を個別確認するよう注意。
- 申請月、既存受給者の再申請不要、典型的な提出資料、Jobcenterのオンラインサービスを整理。
- 公開済みのL063（失業保険）とN031（住宅手当改革案）にリンクし、同一検索意図の重複を避けた。
- 要レビュー：社会保障法・移民法。確認日2026-11-04、次回確認2026-11-18。

### L077 — ドイツの住宅手当

- N031「2027年住宅手当見直し」ニュースと重複させず、現行制度の対象・計算・申請・必要書類を扱う実務ガイド。
- 賃貸のMietzuschussと自己所有住宅のLastenzuschuss、世帯人数・総収入・認定家賃・自治体の家賃区分による計算を説明。
- 公式計算機は初期目安であり法的決定ではないこと、申請月の初日から給付期間が始まること、通常12か月・条件により最長24か月、SGB II/SGB XIIなどとの併用制限を整理。
- 2027年改正案は2026-11-04時点で現行法として扱わず、連邦議会の法案21/8284（2026-10-05公表）とN031へリンク。案の主な内容は定期改定の一時停止、暖房費加算の半減、計算・手続きの簡素化。
- 要レビュー：住宅手当・行政法。確認日2026-11-04、次回確認2026-11-18。

## 4. 既存ドラフトの改善

### L074 — EU輸入手数料

- 欧州委員会の技術ガイダンス自身が「説明資料であり法的拘束力のある解釈ではない」とする注意書きを追加。EU規則・委任規則の条文を優先することを明記。
- 3ユーロ定額関税の直接法令リンクを追加。
- 確認日を2026-11-04へ更新。次回確認2026-11-10。

### L075 — d-you / EUDI Wallet

- 連邦政府の現行案内（2026年9月公表）を追加し、2027年1月初旬開始、約40の参加パートナー、無料・任意利用の一次情報リンクを補強。
- 特定日を断定せず、連邦参議院の2026年11月20日審議予定と第三国籍住民の登録条件未確認を維持。
- 確認日を2026-11-04へ更新。次回確認2026-11-21。

## 5. 調査した一次情報

### 求職者向け基礎保障
- 連邦政府：新しい求職者向け基礎保障 https://www.bundesregierung.de/breg-de/aktuelles/neue-grundsicherung-2399562
- 連邦政府FAQ https://www.bundesregierung.de/breg-de/aktuelles/sozialhilfe-und-grundsicherung-2253064
- 連邦雇用エージェンシー：オンライン申請 https://www.arbeitsagentur.de/grundsicherung/online-services-im-ueberblick
- 連邦雇用エージェンシー：2026年7月1日の制度移行 https://www.arbeitsagentur.de/presse/2026-20-reform-der-grundsicherung-fuer-arbeitsuchende-tritt-am-1-juli-2026-in-kraft
- SGB II §§7, 8, 9, 19, 22, 31a, 37（各記事front matterにリンク）

### 住宅手当
- BMWSB FAQ https://www.bmwsb.bund.de/SharedDocs/faqs/DE/buergerkom/wohngeld-plus/wohngeld-FAQ-artikel.html
- ドイツ連邦議会：法案21/8284（2026-10-05） https://www.bundestag.de/presse/hib/kurzmeldungen-1222360
- BMWSB公式計算機（2025年1月1日版） https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_artikel.html
- Bundesportal：Miet-/Lastenzuschuss https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99107023037000/herausgeber/BY-24752/region/092725214138
- WoGG §§7, 22, 25, 27（各記事front matterにリンク）
- デュッセルドルフ市：オンライン申請・紙申請書の配布 https://www2.duesseldorf.de/medienportal/pressedienst-einzelansicht/pld/mehr-service-vor-ort-wohnungsamt-erweitert-angebot

### 既存ドラフト・更新記事
- EU税関：技術ガイダンスPDF（説明資料であり法的拘束力なし） https://taxation-customs.ec.europa.eu/document/download/053e5b4e-f0be-4f20-9a23-3e3b659a6676_en?filename=Customs+Guidance+on+EUR+3+customs+duty.pdf
- EU理事会：小口荷物措置 https://www.consilium.europa.eu/de/policies/eu-action-influx-of-small-parcels/
- 連邦政府：d-you現行案内 https://www.bundesregierung.de/breg-de/aktuelles/digital-wallet-2452384
- EU ETIAS運用状況 https://travel-europe.europa.eu/en/etias/about-etias
- ADAC冬タイヤ https://www.adac.de/rund-ums-fahrzeug/ausstattung-technik-zubehoer/reifen/sicherheit/winterreifenpflicht-deutschland/
- Minijob-Zentrale 2027年案内 https://magazin.minijob-zentrale.de/minijob-grenze-2027/

## 6. SEO・公開範囲・検証

- 公開sitemapは193 URL、livingは68公開記事、eventsは102記事。L074〜L077はすべて `published=false`、`status=draft`、home/hub/search/sitemap非表示。
- 新規URLを公開サイト、検索インデックス、canonical、hreflang、sitemapへ追加していない。英語・ドイツ語ページも追加していない。
- 既存の検索意図を照合し、L076はL063（保険型失業手当）と区別、L077はN031（2027改正ニュース）と区別した。
- Search Console実測値なし。表示回数・CTR・順位・流入改善は主張しない。
- PR #420の同期後CIとPR #422の今回変更後CIはGitHub Actionsで実行待ち。ローカルbuildはこの実行環境からリポジトリをcloneできないため実施していない。
- コミュニティ、求人、フォーム、管理機能、ドイツ語学習の語彙・分類データ、プライバシー処理は変更していない。

## 7. 未解決事項・次回確認

1. PR #420の同期後CI run #41766444824を確認し、専門家レビューなしにmergeしない。
2. PR #422の新しいCIを確認し、税関・税務、行政・プライバシー、社会保障・住宅手当の専門レビューを依頼できる状態にする。レビュー完了前に公開しない。
3. L074は2026-11-10に配送会社・税関の実務反映を再確認。
4. L076/L077は2026-11-18までに専門レビューと制度変更の有無を再確認。
5. L075は2026-11-20の連邦参議院審議後、2026-11-21に成立状況を確認。
6. L055は2026-11-09前後にETIAS運用状況を再確認。L056は2026-12-15に2027年施行前の再確認。L049は2027年9月の冬季前に再確認。
7. Apps Scriptの5分トリガーと非公開メッセージの実メールE2Eは、サインイン済みGoogleブラウザープロファイルと安全なテスト受信箱が得られるまで未検証。


---

<!-- Merged on 2026-11-07: the record below comes from PR #423 (editorial/jc-content-cycle-20261104); the record above was already on main from PR #422. Both are kept. -->

# J-Connect Germany — 2026-11-04 editorial cycle

確認日時：2026年11月4日 04:15（Europe/Berlin）

## 1. 作業前の状態確認

- Notionの「J-Connect Germany | Growth & Content」Project Instructionsは、この実行環境から取得できなかった。リポジトリの `docs/content-production-workflow.md`、現行サイト、公開済みページ、GitHubのmainを基準にした。
- README.mdはリポジトリのルートに存在しない。運用手順は `docs/content-production-workflow.md` を参照。
- 実際のリポジトリは `J-Connect-Global/j-connect-global`。候補 `NihonGatewayGermany/nihon-gateway-germany` は接続済みリポジトリとして確認できなかった。
- mainの確認済み先頭コミット：`5382540378b6866fbbbf8d25616fce8b4b084f5c`（2026-11-03 12:42 UTC）。
- 日本語サイトのサイトマップは193 URL。今回の3記事はdraftとして登録し、公開ページ・検索インデックス・ハブ・サイトマップには追加しない。

## 2. 優先度1：既存のJ-Connect作業

### 完了を再確認できた項目

- **PR #351 — 通知メールのURL保持**：2026-10-18にmerge済み。既存Apps Scriptをversion 33として再デプロイし、実際の2つの運営テストアカウント間で通知メール、text/plain MIMEのURL、会話の開閉、返信通知までlive acceptanceを完了した記録がある。
- **PR #412 — 元投稿が削除・非公開のときの無効な再送フォーム**：2026-11-01にmerge済み。元投稿が閉鎖されている場合は再送フォームを隠し、再送で復旧できないことを表示する修正。
- **本番の公開ステータスAPI**：読み取り専用のGET確認で `messaging_version=2026-10-23.1`、`public_replies=true`、`private_conversations=true`、`inline_replies=true`、`instant_publish=true`、`persistent_links=true` を確認。
- **PR #361 — 121公開記事の画像監査**：2026-10-20にmerge済み。121記事の画像修正、135件のデスクトップ・モバイル・タブレットChromiumテスト成功、画像容量予算内の記録を確認。現在、画像関連のopen PRはない。

### まだ完了確認できない項目

- **5分間隔のApps Scriptトリガー**：運用文書では通知キューと公開データ同期を既存の5分トリガーで処理する。公開ステータスAPIは正常だが、トリガーの実登録・最終実行時刻はApps Script管理画面で確認する必要がある。この実行ではGoogle認証済みのブラウザーセッションがなく、トリガーを確認・変更していない。
- **新しいメッセージ機能の運営用メールE2E再確認**：PR #351では2026-10-18時点の2テストアカウントによるメールE2Eを完了している。一方、PR #406の2026-11-01のクローズコメントでは、別タスクとしてトリガーとメールE2Eの再確認を残している。今回はメールを送信せず、公開APIの状態のみを確認した。したがって、この新しい再確認は未完了として扱う。
- **ドイツ語学習フラッシュカード音声の実機確認**：公開manifestとライブUIで合計17,635件、A1 650件を確認。自動読み上げは初期OFF。A1の単語音声ボタンを1回押すと、クラウドブラウザー上では再生失敗メッセージが表示された。クラウドブラウザーでは物理端末のスピーカー出力を検証できないため、実機での再生・de-DE音声・端末別確認は未完了。学習データと進捗は変更していない。
- **年末の花火規制**：自治体別の2026/27年規制は、PR #406の記録どおり12月中旬に再確認する。11月4日時点で自治体の最終区域を最新情報として記事化しない。
- **掲示板の募集投稿**：公開中の投稿 `post_6a3a2ebd-71fd-4209-898d-6ac5947b5842` は、事業者名、具体的業務、報酬、費用負担が本文から確認できない。MLM・詐欺と断定できる根拠はない。投稿者への連絡や非公開化は行っていない。運営者による事実確認と掲載継続判断が必要。

## 3. 未完PR・Issueの確認

- open PRは **#420、#422、#423** の3件。open Issueは0件。2026-11-04 04:49時点で、#420（head `ba7370409d47013b1acdfb426002a59bfe067a28`）、#422（head `3ec42a6ba78e3e8cd759d1863160dd8f051d61ca`）、#423（当初head `92a912bb8c5e755ade7d7dc226b5afcd05f2118e`）の「Validate content」はいずれも成功していた。今回のdocs-only追記後は#423のCI再実行を待つ。3件ともDraftで、専門レビュー前のためmerge・公開していない。
- **#420**：ETIAS運用状況、冬タイヤ、2027年ミニジョブの既存3記事更新。Draftのまま。head `52cd1d1583df36b0cbfe5c276d9440b6381689e5` のGitHub Actions「Validate content」は成功。専門家レビュー待ち。
- **#422**：日本からの輸入手数料とd-youデジタルIDの2本の未公開ドラフト。Draftのまま。head `12387de2443ad20273a484274c078c2726322698` の「Validate content」は成功。税関・行政・プライバシーの専門家レビュー待ち。
- 両PRの公開設定・canonical・hreflang・sitemapを確認し、今回の作業でそれらを変更していない。

## 4. 今回の新規ドラフト

### N036 — 2026年10月のドイツ物価速報

- 速報公表日：2026-10-30
- 10月CPI：前年同月比+2.8％、前月比-0.2％
- コア：+2.1％、エネルギー：+12.2％、食品：+0.4％
- 10月確定値の公表予定：2026-11-11
- 既存の9月記事N026を置き換えず、月次の続編として扱う。家計での読み方、前年同月比と前月比の違い、CPIとHICPの違いを説明する。
- 11月11日の確定値を再確認するまで公開しない。

一次情報：
- https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/10/PD26_382_611.html
- https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Verbraucherpreisindex/_inhalt.html

### N037 — 2026年10月のドイツ労働市場

- 公表日：2026-10-30
- 登録失業者：2,955,000人（前月比-40,000、前年同月比+44,000）
- 失業率：6.3％
- 季節調整後の失業者数：前月比+4,000
- 広義の雇用不足指標：3,592,000人（前年同月比+28,000）
- 雇用庁に登録された求人：654,000件
- 既存の8月記事N017と異なる月の統計であり、季節調整、未就業、求人登録数の定義を説明する。求職者が地域・職種の状況を確認する手順を加える。

一次情報：
- https://www.arbeitsagentur.de/presse/2026-41-arbeitsmarkt-im-oktober-2026
- https://www.arbeitsagentur.de/news/arbeitsmarkt
- https://www.arbeitsagentur.de/jobsuche/

### L076候補 — 育児給付の詳細ガイド（docs内ドラフト）

- 既存の妊娠・出産ガイドは全体手続き、出産手続きガイドは出生登録・保険・旅券などを扱う。今回のドラフトは、育児給付の受給資格、課税所得基準、外国籍の親、給付額計算、生活月、同時受給、申請の遡及期間に焦点を絞り、検索意図を分ける。
- #420/#422が同じ `content/registry/living.json` を変更しているため、今回のPRではそのファイルを競合更新しない。本文ドラフトは `docs/elterngeld-germany-guide-draft-2026-11-04.md` に置き、#420/#422の統合後にL076としてliving registryへ登録する。
- 所得・在留資格・同時受給の専門レビューが必要。

一次情報：
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/wie-viel-elterngeld-kann-ich-bekommen--124616
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/wie-lange-kann-ich-elterngeld-bekommen--124728
- https://familienportal.de/familienportal/familienleistungen/elterngeld/familiensituation/gibt-es-elterngeld-auch-fuer-auslaendische-eltern--124696
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/wie-kann-ich-elterngeld-beantragen--124762
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/was-aendert-sich-fuer-geburten-ab-1-april-2024-beim-elterngeld-237122
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/wie-wird-das-elterngeld-netto-berechnet--124606
- https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/muss-ich-elternzeit-nehmen-um-elterngeld-beziehen-zu-koennen--155548
- https://www.familienportal.nrw/de/elterngeld

## 5. 競合・検索意図・カニバリゼーション

- 10月インフレではInvesting.com日本語記事が速報値を報道している。N036は数値の再掲だけにせず、前年比と前月比の違い、エネルギーと食品の差、速報・確定値、家計での読み替えを中心にする。
- Elterngeldは日本語の解説記事（Kaigaijin、2026-05-02）や英語の駐在員向けガイドが存在する。L076候補は2025年4月以降の17万5,000ユーロ課税所得基準、在留資格の区分、生活月、給付計算上の手取り、同時受給制限を最新の連邦家族ポータルで確認する点を差別化要素とする。
- 10月労働市場について日本語の直接的な実用解説は確認できなかった。N037は月次統計の要約だけでなく、季節調整後の数値、広い未就業指標、雇用庁登録求人の限界、求職者の次の確認事項を含める。
- GSC Wizardは接続・契約ゲートでデータ取得できなかった。表示回数、CTR、順位の推測値は使用していない。

## 6. SEO・公開・検証方針

- N036・N037は `published:false`、`status:draft`。Home、hub、search、sitemapはすべて非表示。
- Elterngeldはdocs内ドラフトであり、現行ページ・registryに未登録。
- 物価・労働市場の記事に、数値を直接読めるオリジナルSVG図表を各2点、計4点追加した。第三者写真・ストック画像は使用せず、SVG内にtitle/desc、Markdown側に日本語altを付けた。
- 公開HTML、canonical、hreflang、sitemap、既存の投稿・求人・連絡フォーム・管理機能・語彙データ・プライバシー処理は変更しない。
- ローカル実行環境にリポジトリ全体と依存関係がないため、ローカルの `npm run build` は実行していない。PRの初回 `Validate content` は本文画像が0点という品質ルールで失敗したため、各記事にオリジナルSVGを2点ずつ追加した。修正後のCIを再確認する。
- 公開判断は人の専門レビュー後。CI成功だけで行政・給付記事を公開しない。

## 7. 次回の候補

1. 2026-11-11公表予定の10月インフレ確定値を反映し、N036を再検証。
2. #420・#422の専門家レビューとmain統合状況を確認し、L076をliving registryへ登録。
3. 5分トリガーの存在・最終実行時刻をApps Script管理画面で確認し、運営用テストアカウントで通知E2Eを再確認。
4. 実機でフラッシュカードのドイツ語音声を再生し、端末・ブラウザー別のde-DE音声と再生イベントを確認。
5. 12月中旬に自治体別の花火規制を再調査。
6. 募集投稿について、事業者情報・業務・報酬・費用を運営者が確認し、掲載継続または一時非公開を判断。


## 8. 2026-11-04 04:49の再確認・追加作業

### サイト・接続・前回との差分

- ドイツ現地日時：2026年11月4日 04:49（Europe/Berlin）。
- 実際のGitHubリポジトリは引き続き `J-Connect-Global/j-connect-global`。候補 `NihonGatewayGermany/nihon-gateway-germany` は今回も実体として確認できなかった。
- 公開サイトの `sitemap.xml` を再取得し、ドイツ語日本語セクションのURLを193件確認。N036・N037・N038のドラフトと、育児給付ガイドのdocsドラフトは公開URL・検索・ハブ・サイトマップに追加していない。
- NotionのProject Instructionsは取得できなかった。ルートREADMEも存在せず、`docs/content-production-workflow.md` と現行コードを基準にした。
- ChatGPT Workのクラウドコンピューターはこの実行環境では利用できず、公開ページの確認には公開用クラウドブラウザーを使用。Googleの認証済みブラウザーセッションはない。
- GSC Wizardは利用ゲートによりSearch Consoleプロパティ・分析値を取得できなかった。直近28日・3か月の表示回数、CTR、順位は記載していない。

### 優先度1：既存機能の再確認

- 公開ステータスAPIは `messaging_version=2026-10-23.1`、`public_replies=true`、`private_conversations=true`、`inline_replies=true`、`instant_publish=true`、`persistent_links=true` を返した。これは機能フラグの確認であり、実際の会話リンク・再送・メール配送のE2E成功を意味しない。
- 5分間隔のApps Scriptトリガーと最終実行時刻は、Google認証済みのApps Script管理画面が必要。今回確認・変更していない。
- 運営用メールE2Eは、テスト専用受信箱・運営テストアカウントの安全な送信先を利用できないため、メール送信を行わず未完了のまま残した。PR #351の2026-10-18時点の受入記録とは区別する。
- 公開掲示板の募集投稿は、事業者名・具体的業務・報酬・費用負担が本文から十分確認できない状態が続いている。MLM・詐欺とは断定せず、投稿者への連絡・削除・非公開化は行っていない。運営者の事実確認が必要。
- 年末の花火規制は自治体の最終案内が出そろう12月中旬に再確認する。今回変更していない。

### フラッシュカード音声・データ

- 現行manifestは合計17,635件、A1 650、A2 650、B1 1,100、B2 2,600、C1 5,000、C2 7,635。2026-11-01の旧provenanceにあったレベル別件数を訂正した。語彙データ・分類・進捗は変更していない。
- ライブUIでは自動読み上げが初期OFF。単語音声をクラウドブラウザーで試すと再生失敗表示が出た。物理端末のスピーカー出力・端末固有のde-DE音声は未検証。

### 第2優先：追加の調査・編集成果

#### N038候補 — 2026年のTHG-Quote申請期限・手数料ガイド

- 公開サイトのsitemapとGitHub本文検索で既存のTHG-Quote記事を確認できなかったため、新規テーマとして調査した。
- 純電気自動車の非公開充電の定額推計は2026-11-15、公共充電設備の計測電力量は2027-02-28が法定期限。両者を混同しない構成にした。
- 環境庁の2026-10-30更新ページでは、2026-04-17以降の申請に94.60〜6,500ユーロの審査手数料が発生し、個別の事務負担で額が決まると公表されている。仲介事業者の契約で誰が負担するか確認する内容を追加。
- 環境庁は個人に賞金を直接支払わず、電力量を証明する。受取額・支払時期は仲介事業者との契約による。中古車の二重申告、仲介事業者の早期受付期限、第三者指定後の変更不可も説明。
- 日本語の包括的な解説は検索で確認できず、ドイツ語のADAC、ev.guru、thg2026.de等が競合。日本語読者向けに「15日と翌年2月28日の違い」「2026年の手数料」「契約条件・中古車の確認」を中心に差別化。
- 本文とオリジナルSVG図解2点を `docs/drafts/` に追加。現行サイトのregistryには未登録、公開・canonical・index・sitemap変更なし。
- 一次情報：
  - https://www.umweltbundesamt.de/themen/verkehr/kraftstoffe-antriebe/vollzug-38-bimschv-anrechnung-von-strom-fuer
  - https://www.umweltbundesamt.de/system/files/medien/366/dokumente/2025-07-18_uba_faq_vollzug_38._bimschv_0.pdf
  - https://www.gesetze-im-internet.de/bimschv_38_2017/__8.html
  - https://www.gesetze-im-internet.de/bimschv_38_2017/__7.html
  - https://www.adac.de/rund-ums-fahrzeug/elektromobilitaet/elektroauto/thg-quote/

#### 既存記事の更新案 — 聖マルティン祭

- 現行ページに残る2026-11-03の終了済み行事を削除し、11月4日以降のメーアブッシュ、デュースブルク、デュッセルドルフの自治体発表日程に差し替える編集パッチを `docs/drafts/st-martin-day-germany-update-2026-11-04.md` に作成。
- メーアブッシュ市（10月30日）、デュースブルク市（10月16日）、デュッセルドルフ市（11月2日）の一次情報を照合。保育施設主催行事を一般参加可能と断定しない注意を追加。
- これは編集パッチであり、現行のMarkdown、registry、生成HTMLはまだ変更していない。現行ページの11月3日行は、パッチを反映するまで公開ページに残る。

### 公開・検証の状態

- #420、#422、#423は引き続きDraft。各PRの既存「Validate content」は成功していたが、今回#423にdocs-onlyの追加ファイルをコミットしたため、最新CIの完了を再確認する。
- 今回の追加ファイルは `docs/drafts/` とprovenanceのみ。サイトのregistry、生成HTML、canonical、hreflang、検索インデックス、sitemapは変更していない。
- 既存の投稿、求人、問い合わせフォーム、管理システム、学習語彙・分類データ、プライバシー処理に変更なし。
- 専門家・人間編集者のレビューが未完了のため、記事を公開・PRをmergeしていない。

### 次回の優先候補

1. 2026-11-10までに聖マルティン祭の終了済み日程を再整理し、編集パッチを正式な記事更新へ反映できるビルド環境で検証する。
2. 2026-11-11の10月インフレ確定値を確認し、N036を再検証する。
3. 2026-11-15前にN038の受付事業者の締切・手数料条件を再確認し、専門レビュー後の公開可否を判断する。
4. Apps Scriptの5分トリガーとメールE2Eは、Google認証済み管理セッションとテスト専用受信箱が利用可能になった段階で再確認する。
5. フラッシュカード音声はAndroid実機と別のブラウザーで再生テストする。
6. 12月中旬に自治体別の花火規制を再調査する。


### N037の実用補足案（2026-11-04）

- 連邦雇用庁の2026年4月23日・8月19日の公式案内を確認し、雇用終了時の「求職登録」と「失業登録」を区別する補足案を `docs/drafts/n037-jobseeker-registration-addendum-2026-11-04.md` に追加。
- 求職登録は原則として雇用終了日の3か月前まで。終了まで3か月未満の時点で終了を知った場合は、知った日から3日以内。失業登録は別手続きで、失業初日までに必要。求職登録だけでは失業登録を代替しない。
- N037の本文・registry・生成HTMLはまだ変更していない。適用条件を中央の公式案内で再照合し、サイトの生成ビルドを実行できる環境が利用可能になった段階で反映する。
- 一次情報：
  - https://www.arbeitsagentur.de/vor-ort/ingolstadt/presse/2026-14-zur-agentur-fur-arbeit-am-besten-online
  - https://www.arbeitsagentur.de/vor-ort/stralsund/presse/2026-40-jetzt-schon-an-das-saisonende-denken
  - https://www.arbeitsagentur.de/arbeitslos-melden

### CIの追加確認

- PR #423の既存コンテンツ変更に対する「Validate content」は、head `92a912bb8c5e755ade7d7dc226b5afcd05f2118e` で成功していた。
- その後の追加は `docs/drafts/` とprovenance文書だけで、サイトソース・registry・生成ファイルを変更していない。GitHub API経由のdocs-onlyコミット後に新しいworkflow runは作成されていないため、今回の追加文書はCI未実行として扱う。既存CI成功を今回のdocs-only差分のテスト結果と混同しない。
