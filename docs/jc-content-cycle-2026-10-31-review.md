# J-Connect Germany — content and platform review, 2026-10-31

**確認日：** 2026年10月31日（Europe/Berlin）  
**対象：** J-Connect Germany 日本語サイト、公開リポジトリ、掲示板・非公開会話、ドイツ語学習カード、未完了PR

## 1. 現行環境と前回からの差分

- 実体のリポジトリは `J-Connect-Global/j-connect-global`。候補として挙がっていた `NihonGatewayGermany/nihon-gateway-germany` は現行リポジトリとして確認できなかった。
- Notionの「J-Connect Germany | Growth & Content」Project Instructionsは、この接続では取得できなかった。リポジトリのコード、ワークフロー、既存の編集記録を優先した。
- 本番サイトの `sitemap.xml` は **184 URL**。公開レジストリはイベント・ニュース91件、生活ガイド66件で、いずれも `published`。静的ページを含めた公開サイトマップと一致する。
- 10月29日に生活ガイドL060〜L072、10月30日にイベントE021〜E026が公開済み。直近2日で新規ページが多いため、今回さらに類似記事を追加するより、既存ページの正確性を直す方を優先した。
- PR #404（10月30日マージ）は、終了イベント・古いニュース・国外週末旅行など30ページをサイトマップ／検索対象から除外し、サンプル求人のインデックス除外、掲示板ページの説明文・内部リンク改善、Markdownデータのクロール抑制を実装した。本番GitHub Pagesデプロイは成功し、公開サイトマップは184 URLであることを確認した。
- PR #404の説明文には、当時のSearch Consoleとして「登録済み35ページ」「検出 - インデックス未登録98ページ」「『ドイツ掲示板』関連表示2,331回」等が記録されている。ただし、これはPR記述に残る過去の値であり、今回GSCから再取得した実測値ではない。

## 2. 優先度1：既存機能の未完了事項

### 2.1 掲示板・非公開会話

**本番で確認できたこと**
- 公開APIの状態応答は `messaging_version: 2026-10-23.1`。公開返信、非公開会話、インライン返信、即時公開、永続リンクの各フラグが有効。
- 現行Apps Scriptソースは、HMAC由来の会話リンクを時間で失効させない設計。リンクはメール本文で「期限なし・再利用可能」と案内し、アクセス取消し時は導出値を更新する。旧形式の1時間リンクも、取消しがなければ互換性のため受け付ける。
- 公開掲示板ページは `index, follow`。非公開会話ページは `noindex, follow` と `no-referrer` を維持している。
- 通知メールは非公開キューに保存され、既存5分トリガーのハンドラー `processWaitingCommunityApprovalNotifications` から会話通知処理も呼び出す実装になっている。

**未確認のこと**
- Apps Script本番プロジェクトの実際の5分トリガー登録状態、Zoho Mailの実送信、受信側での再送・返信のE2Eは確認できていない。ブラウザープロファイルにGoogleログインがなく、テスト専用受信箱も確認できないため、実ユーザーへテストメールを送っていない。公開APIの状態応答だけでメール配信成功とは判断しない。

**今回の修正**
- 10月30日のmainブランチ `Validate content` は、決定的検証・生成物チェック・137件のブラウザーテストに合格し、1件だけ失敗した。失敗は非公開会話UIの送信後更新テストで、送信中の文言「返信を送信しています…」にも一致する部分文字列を待っていたため、更新完了前に読み取り回数を検査するテスト側の競合だった。
- テストを最終成功文言（送信完了／通知再試行中）まで待つよう変更し、PR #405を作成した。テスト専用変更であり、公開JavaScript・Apps Script・ユーザーデータは変更していない。CI確認後にマージ判断する。

### 2.2 ドイツ語学習カード

- 本番ページのJavaScript読み込み後、総収録数 **17,635件** を確認。内訳はA1 1,800、A2 3,000、B1 3,400、B2 4,200、C1 4,100、C2 1,135。
- 音声ボタンはクラウドブラウザー上で再生開始せず、画面に一般的な再生エラーが表示された。ただし、このブラウザー環境の音声エンジン／ドイツ語音声の有無が不明であり、実機の不具合と断定できない。端末上の再生確認は未完了。学習評価・進捗保存・リセット操作は行っていない。

## 3. 既存記事の検証と編集判断

### N033：2022年分の任意申告期限

公開URL：  
`/germany/ja/events/news/tax-refund-2022-deadline-december-2026/`

- NRW税務当局のFAQは、2022年分の任意申告について、**2026年12月31日までに税務署へ到着する必要がある**と明記している。税務署側の処理時間もあるため、年末ぎりぎりの提出を避ける案内は妥当。
- NRWの申告義務・期限ページでは、義務申告と任意申告を分けている。義務申告の例には、税クラスIII/Vだけでなく**IV・要素方式（Faktor）**も含まれる。現行N033本文はIII/Vのみの例示なので、この点を追記する。
- 法的根拠として租税通則法第169条第2項（通常4年）・第170条第1項（原則的な起算点）を追加する。
- 現行本文の「ELSTER初回登録に約2週間」という具体的所要日数は、今回確認できた一次情報で裏付けを再確認できなかった。確定日数を断定せず「初回登録・本人確認に時間がかかる場合があるため早めに始める」へ置き換える候補とする。
- 別URLの新規記事L058はN033と検索意図が重複するため公開しない。

一次情報：
- https://www.finanzamt.nrw.de/faq
- https://www.finanzamt.nrw.de/steuerinfos/weitere-themen/steuererklaerung/abgabepflichten-und-fristen
- https://www.gesetze-im-internet.de/ao_1977/__169.html
- https://www.gesetze-im-internet.de/ao_1977/__170.html

### C019：大晦日の花火

公開URL：  
`/germany/ja/events/columns/germany-silvester-fireworks-rules/`

- 1. SprengV第22条は一般消費者へのF2販売期間（12月29〜31日、日曜調整あり）、第23条第2項は使用可能日（12月31日・1月1日）を定める。第20条はF2の年齢基準を18歳としている。
- 現行本文は使用可能日の説明にも第22条を引用しているため、第23条第2項へ訂正する。第20条を公式情報一覧にも追加する。
- 現行の安全案内「ロケット花火を瓶などで安定させる」は不適切。瓶を発射台として勧めず、製品説明に適合する安定した支持具を使い、人・建物へ向けない表現に直す。
- デュッセルドルフ・ケルンの規制例は2025/26年の過去事例として明示されている。2026/27年の規制と混同しない。10月31日時点で未発表の自治体規制があるかのような断定はせず、12月15日前後に各市の公式告知を再確認する。
- 別URLの新規記事L059はC019と大きく重複するため公開しない。

一次情報：
- https://www.gesetze-im-internet.de/sprengv_1/__20.html
- https://www.gesetze-im-internet.de/sprengv_1/__22.html
- https://www.gesetze-im-internet.de/sprengv_1/__23.html
- https://www.bmi.bund.de/SharedDocs/faqs/DE/themen/bevoelkerungsschutz/silvester/silvester.html
- https://www.umweltbundesamt.de/themen/luft/luftschadstoffe/feinstaub/feinstaub-durch-silvesterfeuerwerk

### N021：Deutschlandticket 2027

公開URL：  
`/germany/ja/events/news/deutschlandticket-2027-price-consent/`

- DB公式FAQを10月31日に再確認。2027年1月から月66.80ユーロ、対象となる既存DB契約の同意期限は11月30日、同意できるのは契約者本人、10月15日以降の新規契約は別途同意不要という現行記事の要点は正しい。
- 追加できる有用情報は、回答後の画面表示更新に最大48時間かかる場合があることと、Aboportalで「Vertragsänderung einsehen」を使って受付結果を確認する手順。本文と検証日を更新する候補。

一次情報：
- https://www.bahn.de/faq/pk/angebot/regionale-angebote/deutschland-ticket/vertragsaenderungen-dt

### L057：NRWのクリスマス営業時間

公開URL：  
`/germany/ja/living/nrw-christmas-opening-hours-2026/`

- NRW店舗営業時間法第4条第1項第2号は、12月24日が平日の場合、店舗が14時まで営業できると規定する。14時まで営業する義務ではなく、個別店舗は早く閉店できる。本文の説明はこの区別を守っている。
- NRWの祝日法は12月25日・26日を法定祝日として列挙している。個別店舗・薬局当番・交通ダイヤは直前に再確認する方針を維持する。

一次情報：
- https://recht.nrw.de/lrgv/gesetz/30032018-gesetz-zur-regelung-der-ladenoeffnungszeiten-ladenoeffnungsgesetz-loeg-nrw/
- https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/

### L050：2025年分の共益費精算

公開URL：  
`/germany/ja/living/nebenkostenabrechnung-2025-deadline/`

- 民法第556条第3項は、精算期間終了後12か月以内の通知、遅れた追加請求の原則的排除と例外、借主の異議申立て期間を定める。第4項は証憑閲覧を定める。現行記事の基本説明と整合しているため、今回の本文変更は不要。

一次情報：
- https://www.gesetze-im-internet.de/bgb/__556.html

## 4. EES・ETIASの新規ドラフト

- PR #387のL055は10月31日にEU公式ページ・FAQとドイツ外務省の案内を再確認し、ドラフトの検証日・要約を更新した。
- EU公式のETIASページは2026年第4四半期を運用開始の見通しとして維持。一方、FAQは申請受付前であり、具体的開始日を数か月前に告知するとしている。Q4を確定日として書かない。
- EESは2026年4月10日に全面運用。ドイツ外務省は有効な滞在許可・長期滞在ビザ保持者等の対象外を案内している。
- 一時滞在証明書（Fiktionsbescheinigung）の法的効果・再入国は個別の滞在法上の根拠で異なるため、専門家レビュー前に公開しない。PR #387は非公開ドラフトのまま維持する。

一次情報：
- https://travel-europe.europa.eu/de/etias
- https://travel-europe.europa.eu/etias/faq
- https://www.germany.info/us-en/2735594-2735594

## 5. PR・公開状況

| PR | 状態 | 判断 |
| --- | --- | --- |
| #387 EES・ETIAS | Draft / CI実行中 | 10月31日の公式情報再確認を反映。移民法レビュー前の公開は禁止 |
| #388 税務・花火の新規記事 | 10月31日にクローズ（未マージ） | N033・C019との重複を理由に新URLを作らない。研究素材は閉じたブランチに保持 |
| #405 会話UIテスト | Open / CI実行中 | テストの待機条件のみ修正。CI成功後にマージ判断 |

## 6. 実装・検証上の制約

- GitHubの内容取得・ブランチ・PR操作は可能だが、この実行環境からはGitHubを直接cloneできず、Node依存関係を導入して `npm run build` を実行できない。
- リポジトリの `Validate content` は、Markdown・registryだけでなく、生成HTML、ハブ、検索インデックス、サイトマップを同時に更新してコミットすることを要求する。そのため、公開記事のソースだけを変更して不整合なPRを作ることは避けた。
- 今回は本番記事の本文、canonical、hreflang、サイトマップ、求人、掲示板データ、Google Sheets、Apps Scriptを変更していない。
- GSC Wizardは契約期限切れのエラーで利用できず、直近28日・3か月の実測クエリ、表示回数、CTR、順位は取得できなかった。数値を推測していない。

## 7. 次の作業

1. PR #405のCI結果を確認し、成功ならテスト修正をマージする。
2. Google Apps Scriptの実プロジェクトで `inspectCommunityPublicationSync()` を実行し、5分トリガーの有無を確認する。安全なテスト専用受信箱で通知・再送・返信のE2Eを行う。
3. Android実機またはユーザー端末でドイツ語音声を再確認する。クラウドブラウザーのエラーを実機障害と断定しない。
4. N033・C019・N021の既存URLに対する本文修正を、ローカルビルド可能な環境で生成HTML等と一緒に実装する。
5. L055は移民法レビューを受け、ETIASの具体的開始日が公表された場合に再検証する。
6. 2026/27年の自治体花火規制は2026年12月15日前後に再確認する。

**公開記事の追加・修正はこの記録では行っていない。** 本書は内部編集記録であり、読者向けページではない。
