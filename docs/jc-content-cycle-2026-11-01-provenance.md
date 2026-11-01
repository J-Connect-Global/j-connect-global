# J-Connect Germany — content cycle 2026-11-01

**確認日：** 2026年11月1日（Europe/Berlin）  
**基点：** `main` / `720202cd5e70470a2b33335f0be1dea6e295afdf`

## 1. 優先度1：既存作業の状態

- 実体リポジトリは `J-Connect-Global/j-connect-global`。候補 `NihonGatewayGermany/nihon-gateway-germany` は現行の実体ではない。
- Project Instructions はこの接続から取得できず、現行コード、公開ページ、編集記録を基準にした。
- PR #411 はmainにマージ済み。デュッセルドルフのカーニバルの道化師イラストを赤・白へ修正済み。
- 未完PRは #406（内部編集記録）、#407（EES・ETIAS非公開ドラフト）、#409（3都市のクリスマスマーケット）、#412（削除済み投稿の再送案内UI）。#409の3記事・画像は本ブランチに統合して再検証する。ドレスデンは10月30日更新の来場者向け公式ページの16:00を採用し、4月の募集要項にある16:30との差を記事内に明記。PR #409の既存CIでは画像総量38.09 MiB、ブラウザーテスト138件成功。現行の40.2MB上限内に収まるため、画像予算の拡大は行わない。
- 掲示板・非公開会話の公開状態APIは `messaging_version: 2026-10-23.1`。永続リンク、公開返信、インライン返信、即時公開の各機能フラグは有効。実ユーザーへの通知メールは送信していない。
- 安全なテスト専用受信箱とGoogleログイン済みApps Script管理セッションがないため、実メール配送、返信、再送、5分トリガー登録状態は未検証。APIフラグだけでメールE2E成功とは扱わない。
- ドイツ語学習カードは前回確認値17,635件（A1 1,800、A2 3,000、B1 3,400、B2 4,200、C1 4,100、C2 1,135）。自動読み上げは初期OFF、音声ボタンは表示されたが、実際の音声再生は未検証。学習データ・進捗は変更していない。
- 不審な求人・掲示板投稿は投稿者、仕事内容、報酬、費用を独立確認できないため変更・削除していない。既存の投稿・求人・管理コードはこのブランチで変更しない。

## 2. 新規コンテンツ候補

### C033 — 聖マルティン祭（非公開ドラフト）

**タイトル：** ドイツの聖マルティン祭とは？｜11月11日のランタン行列と参加前の確認  
**候補URL：** `/germany/ja/events/columns/st-martin-day-germany/`  
**状態：** `draft` / `published:false` / home・hub・search・sitemap非表示

検索意図は「Martinstag 2026」「ドイツのランタン行列」「一般参加できる行事の探し方」「子どものランタンの安全」。既存C029は追悼日・静かな祝日の規制が主題で、参加手順とは検索意図が異なる。カーニバル記事とも別テーマ。一般的な伝承だけでなく、自治体が公表した2026年の日程、行事の参加条件確認、火の安全を中心にした。

2026年の自治体例：
- Meerbusch市・Büderich：11月3日17:15（幼稚園主催。外部参加可否は主催者確認）
- Duisburg市中心部：11月6日16:45集合、17:00ごろ出発
- Meerbusch市・Büderich：11月11日17:00集合、17:15出発
- Meerbusch市・Osterath：11月12日17:30

一次情報：
- https://meerbusch.de/aktuelles/nachrichten/details/sankt-martin-in-meerbusch-starten-die-zuege-am-sonntag
- https://www.duisburg.de/pressemitteilungen/pm/2026/oktober/st.martinszuege-lichterglanz-in-der-duisburger-innenstadt-und-in-den-stadtteilen
- https://www.erzbistum-koeln.de/presse_und_medien/magazin/Sankt-Martin-Braeuche-zum-Martinsfest-mit-Laternen-Liedern-und-Gaensen/
- https://www.feuerwehr-bergkamen.de/buergerinformationen/verhalten-im-notfall/sicherheitstipps-zum-martinstag/

### E030–E032 — 2026年クリスマスマーケット3都市ガイド（公開候補）

- **E030 フランクフルト：** [Frankfurt Christmas Market 2026](/germany/ja/events/frankfurt-christmas-market-2026-guide/) — 11月23日〜12月22日。公式ページは月〜土10:00–21:00、日11:00–21:00、11月23日17:10の開幕、18:00の塔上トランペットを案内。1393年の記録はVisit Frankfurtの公式歴史説明、Bethmännchenの1838年起源はフランクフルト市の統計記事で確認。
- **E031 シュトゥットガルト：** [Stuttgart Christmas Market 2026](/germany/ja/events/stuttgart-christmas-market-2026-guide/) — 11月25日〜12月23日、毎日11:00–21:00。公式サイトは11月25日17:00の開幕と18:00の塔上トランペットを案内。1507年の市場特権、1643年以降の再開、1692年の初出記録は公式歴史資料で確認。
- **E032 ドレスデン：** [Striezelmarkt 2026](/germany/ja/events/dresden-striezelmarkt-2026-guide/) — 11月25日〜12月24日、第592回。通常10:00–21:00、12月24日は10:00–14:00。10月30日更新の来場者向け公式ページは開幕日16:00、4月の出店者募集要項は16:30と異なるため、最新の来場者向けページを優先し差を本文で説明。第31回シュトレン祭りは12月5日と公式協会が告知。
- 画像は外部写真を使わず、AI支援でコードから描画したオリジナルのベクターイラストと図解。PR #409のCIでは画像総量38.09 MiB、現行上限40.2MB以内。上限変更はしない。

一次情報：
- Frankfurt: https://www.visitfrankfurt.travel/en/experience/festival-and-events/frankfurt-christmas-market ; https://www.visitfrankfurt.travel/presse/pressemeldungen/details/frankfurter-weihnachtsmarkt-2024 ; https://statistikportal.frankfurt.de/statistik_aktuell/2025/FSA_2025_17.html
- Stuttgart: https://www.stuttgarter-weihnachtsmarkt.de/en/service ; https://www.stuttgarter-weihnachtsmarkt.de/en/general/history
- Dresden: https://striezelmarkt.dresden.de/de/ ; https://www.dresden.de/media/pdf/wirtschaft/markte/STM-2026-Ausschreibungstext.pdf ; https://www.dresdnerstollen.com/herzlich-willkommen-ruth-liebscher/

## 3. 既存記事の改善

### N021 — Deutschlandticket 2027
- DB公式FAQを2026-11-01に再確認。
- 同意後の画面反映に最大48時間かかる場合があること、`Vertragsänderung einsehen`で受付日時・結果を確認する手順を追記。
- Deutschland-Semesterticketは2026/27冬学期・2027夏学期に今回の値上げが影響せず、同意操作不要である例外を追加。2027-06-01以降に始まる学期の扱いを明記。
- 次回確認：2026-11-15。
- https://www.bahn.de/faq/pk/angebot/regionale-angebote/deutschland-ticket/vertragsaenderungen-dt

### N033 — 2022年分の任意申告
- ELSTERの2022年分手引きと所得税法第46条を再確認。夫婦双方が給与を受け取り、一方に税区分V/VIまたはIVの係数方式が適用された場合（年の一部でも）は申告義務の例に含まれることを明示。
- 任意申告の4年期限を義務申告の期限と混同しない注意を追加。
- 一次情報で裏付けられない「ELSTER初回登録に約2週間」という固定日数を削除。
- 次回確認：2026-12-15。
- https://www.elster.de/eportal/helpGlobal?themaGlobal=help_est_ufa_10_2022
- https://www.gesetze-im-internet.de/estg/__46.html

### C019 — 大晦日の花火
- 販売期間は第22条、使用可能日は第23条第2項、年齢制限は第20条、自治体の追加規制は第24条第2項に分けて出典を修正。
- 日曜例外で販売開始が12月28日になる年があるため、「年に3日だけ」というタイトルを原則と例外が分かる表現へ変更。
- ロケット花火の支持具として瓶を勧める危険な表現を削除し、製品説明に従った適切な支持具を使うよう修正。
- 2025/26年の自治体規制例は過去事例として維持。2026/27年の未発表規制は推測していない。
- 次回確認：2026-12-10。
- https://www.gesetze-im-internet.de/sprengv_1/__20.html
- https://www.gesetze-im-internet.de/sprengv_1/__22.html
- https://www.gesetze-im-internet.de/sprengv_1/__23.html
- https://www.gesetze-im-internet.de/sprengv_1/__24.html

### L057 — NRWのクリスマス営業時間
10月31日の監査で、12月24日の14時は営業義務ではなく営業可能な上限である点を確認済み。今回の本文変更は不要。店舗・薬局当番・公共交通は直前確認を維持。

## 4. Search Console・SEO・保護対象

- GSC Wizardは接続期限切れで利用できず、直近28日・3か月のクエリ、表示回数、CTR、平均順位は取得していない。実測値を推測していない。
- C033はC029やカーニバル記事と検索意図を分ける。N021・N033・C019は既存URLの更新で、新規の類似URLは作らない。
- C033は編集レビューが終わるまで検索・サイトマップ・ホーム・ハブに含めない。
- Apps Script、掲示板投稿、求人データ、管理システム、ドイツ語学習の語彙・分類・進捗、個人情報処理は変更しない。
- 本番公開はPR承認・マージ後のみ。この記録では公開済みと主張しない。

## 5. 検証

ブランチ専用ビルドで生成HTML、レジストリ、検索インデックス、サイトマップを同期し、決定的検証、ブラウザーテスト、差分範囲ガードを実行する。結果は完了後に追記する。
