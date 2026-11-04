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
- 2027年改正案は2026-11-04時点で現行法として扱わず、N031へリンク。
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
