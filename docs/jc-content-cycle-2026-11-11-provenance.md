# J-Connect content cycle provenance — 2026-11-11

確認日時：2026-11-11 04:00 CET（Europe/Berlin）
対象：J-Connect Germany 日本語版
正規トップ：https://j-connect-global.com/germany/ja/
リポジトリ：https://github.com/J-Connect-Global/j-connect-global
ブランチ：automation/jc-content-cycle-20261108-0403

## 1. 作業開始時の状態

- 旧候補 NihonGatewayGermany/nihon-gateway-germany は、GitHub上で現在の実体 J-Connect-Global/j-connect-global に解決された。既定ブランチは main、接続権限は管理者相当。
- ルートの README.md は取得できなかった。Notionの「J-Connect Germany | Growth & Content」Project Instructionsはこの非対話実行では取得できず、代わりに .github/agents/jconnect-content.agent.md、docs/content-production-workflow.md、docs/trust-and-legal-checklist.md を確認した。
- mainの公開レジストリ：Events 107件、Living 89件、静的JAページ46件。mainの sitemap.xml は220 URL。
- mainの最新更新はE027（11/9）、N023・C033・N039・N040・L011・L039・L069等（11/7）。PR #442の変更はmainに未反映。
- Open Issueは0件。Open PRは#442のみ。PR #442は88コミット先行・4コミット遅れ、70ファイル変更。医療系L098の専門レビューと画像権利確認が未完了のためDraftを維持。

## 2. 既存タスク（優先1）

### PR #442の競合整理

- main側の更新と重なっていた content/registry/events.json、germany/ja/index.html、sitemap.xml を確認。
- Eventsレジストリはbase・main・PRの3者差分をフィールド単位で統合。競合フィールドは検出されなかった。
- Homeはmainの最新イベント表示順を採用。Sitemapはmainの全URLを維持し、PR側で更新済みの記事日付を反映。
- GitHubはPRを mergeable=true と返した。履歴上のbehind_by=4は残り、mainへのrebase/mergeはしていない。
- CI（run 42950769789、commit e986888）はビルド工程を通過したが、生成HTML・レジストリ差分が未コミットとして失敗。ログの差分7ファイルをPRブランチへ反映した。
- その後、N021・N038・L039のMarkdownを更新。最新HEADに対するCIはまだ再実行されていない。build・validate・Playwright合格とは扱わない。

### Apps Script本番反映

- docs/community-messaging.md が要求する期待バージョンは 2026-11-07.1。公開ステータスAPIで本番値を確認できていない。
- 既存5分トリガーの状態・最終実行・失敗ログを確認できていない。読み取り関数 inspectCommunityPublicationSync() の実行権限がない。
- トリガーが存在しないことを確認する前に installCommunityApprovalNotificationTrigger() を実行してはならない。
- Zoho Mailの実送信E2Eは、Apps Script認証と専用テスト受信箱がないため未実施。既存利用者へのテスト通知は送っていない。
- 音声再生の実機検証も未実施。
- 投稿、求人、連絡フォーム、管理システム、語彙・分類データ、プライバシー処理には変更を加えていない。

## 3. コンテンツ調査と編集（優先2）

新規記事の追加は0本。既存記事3本を、公式一次情報に基づいて更新した。記事ソースはPRブランチのみで、本番main・公開サイトには未反映。

### N021 — Deutschlandticket 2027

URL：/germany/ja/events/news/deutschlandticket-2027-price-consent/

- 2027-01-01から月66.80ユーロ。
- 連邦政府FAQ（2026-11-05公表）：多くの既存契約は自動調整、一部は同意が必要で、その場合は交通事業者が対象者に連絡。11月30日を全国共通期限とはしない。
- DB個人契約：2026-10-14までの注文は契約者本人が2026-11-30までに回答。2026-10-15以降の注文は別途同意不要。
- DB Jobticket：原則11-30までに回答。2027年の月額上限63.46ユーロから勤務先の個別補助を差し引く。勤務先が月額を全額負担し、DBとの枠組み契約を維持する場合は本人同意不要。10-15以降の注文も別途同意不要。
- Deutschland-Semesterticket：2026/27冬学期と2027夏学期は価格変更の影響なし、同意不要。2027-06-01以降に始まる学期から新価格適用。
- 出典：連邦政府FAQ、DB個人契約FAQ、DB法人向けJobticket FAQ、DB Semesterticket FAQ。

### N038 — THG-Quote 2026

URL：/germany/ja/events/news/thg-quote-2026-deadline-november-15/

- UBA公式ページは2026-11-06最終更新。2026年義務年度の申請処理は2026-09-09以降に提出されたものまで進んでいる。
- 手数料94.60〜6,500ユーロ、個別額は行政負担に応じて決定。デジタル申請はまだ利用不可。
- UBA FAQ（2025-07版）Q6と38. BImSchV §8は、非公開充電の定額推計（§7）を当年11月15日、公共充電設備の計測値（§6）を翌年2月28日と区別。
- 2026-11-15は日曜日。VwVfG §31(3)の一般規定が今回の法定期限に適用されるか、UBAの個別説明は確認できない。11月16日まで提出可能とは断定せず、可能なら11月15日までの申告を案内。
- 出典：UBAページ、UBA FAQ、38. BImSchV §8、VwVfG §31。

### L039 — ドイツの電車の乗り方

URL：/germany/ja/living/germany-train-travel-guide/

- 2027年価格と、全国共通の同意ルール／DB固有の契約期限を区別。
- N021への内部リンクを関連リンクにも追加。
- 既存の鉄道ガイドの検索意図を保ち、契約変更の詳細はN021へ誘導。

## 4. SEO・実装・検証

- 新規URL・新規画像は追加していない。既存canonical、slug、URL、hreflang、index対象を変更していない。
- Markdown front matterを正本として更新。registry・生成HTML・Hub・search index・sitemapはCIビルドで同期する必要がある。
- PR #442の最新HEADに対するCI未実行のため、生成物の最終整合性、npm run validate、Playwright、モバイル表示は未確認。
- GSC Wizardのサイト一覧取得は subscription required で失敗。直近28日・3か月のクエリ、表示回数、CTR、順位は未取得。推測値は記載していない。
- 公開サイトのWeb取得では一部ページが2026年9月の古いスナップショットを返し、現在の公開状態を確定できなかった。公開済みとは扱わない。
- 競合確認では、日本語で同じDBの11月30日期限・Jobticket全額負担例外まで整理した強い競合ページは検索結果で確認できなかった。ドイツ語の消費者向け記事は66.80ユーロや一般的な価格比較が中心。今回の差別化は購入日・契約者・販売事業者・Jobticket例外・Semesterticket例外の実務整理。

## 5. 未解決事項

1. Apps Script本番を 2026-11-07.1 へ更新し、ステータスAPIと5分トリガーを確認。
2. 専用テスト受信箱でZoho送信・非公開会話・公開返信・求人・問い合わせのE2E。
3. PR #442の最新HEADでCIを再実行し、generated files・validate・browser testsを確認。
4. L098の医療専門レビューと画像権利確認。完了までは公開しない。
5. GSC接続の利用権限・契約上の制約解消。

## 6. 次回候補

- 11月15日直前にN038のUBAページ・FAQ・法令を再確認。期限後は記事の「申告できるか」を過去形にし、翌年分の案内へ切り替える。
- 11月30日までのN021のDB契約・Jobticket手続きに変更がないか再確認。
- 11月19日開始のデュッセルドルフ・クリスマスマーケット記事の公式日程、休業日、交通情報を再検証。

## 2026-11-11 — follow-up verification

### Existing J-Connect implementation

- The public, read-only Apps Script status endpoint was queried successfully. It reports `api_version: 2026-07-13.1`, `messaging_version: 2026-11-07.1`, and enabled flags for public replies, private conversations, inline replies, instant publication, and persistent links.
- The public `getPosts` endpoint returned `ok=true`, 7 active public posts from 15 source rows. The returned public post objects contained no keys matching email, phone, token, password, private, or contact. This is a read-only public-feed check, not a private-message end-to-end test.
- The Apps Script editor-only `inspectCommunityPublicationSync()` function remains unexecuted because no authenticated Apps Script editor session is available. Therefore the 5-minute notification trigger's existence, handler, and last-run time remain unverified. Do not run `installCommunityApprovalNotificationTrigger()` blindly: it removes and recreates the same handler's trigger.
- `testZohoEmailConfiguration_()` was not run. The documented function sends a real message to the configured administrator recipient; no dedicated test mailbox was established, so a live send would not be a safe test.
- Physical device audio output remains unverified. The repository's browser runtime tests do cover word/example playback, explicit audio opt-in, and automatic word speech defaulting OFF.

### Content and generated-output validation

- The live Japanese sitemap contains 220 URLs. The only open PR found is #442; no open repository issues were returned. The candidate repository `NihonGatewayGermany/nihon-gateway-germany` was not independently resolved; the active repository used for this work is `J-Connect-Global/j-connect-global`.
- Commit `58d0015db97285a28b519d1bc49073cabc096f27` synchronized sitemap `lastmod` values for the updated train guide, Deutschlandticket article, and THG-Quote article.
- CI run `42953496530` completed successfully on that commit: generated content build, generated-file consistency check, deterministic validation, and 144 desktop/mobile/tablet Chromium runtime tests all passed.
- A source-list date mismatch in N038 was then corrected from 2026-10-30 to 2026-11-06 in both the Markdown source and generated HTML. The UBA page itself says it was last updated on 2026-11-06. L097's editorial verification date was refreshed from 2026-11-10 to 2026-11-11. These follow-up commits require a new CI run before the PR can be considered validated.
- PR #442 remains Draft. No production merge or publication was performed.

### Primary-source rechecks

- Deutschlandticket N021: DB's current FAQ confirms the regular price of 66.80 EUR from 2027-01-01; DB Jobticket maximum 63.46 EUR before the individual employer subsidy; the no-consent exception where the employer fully pays and retains the framework agreement; the 2026-11-30 response deadline for affected existing DB contracts; and the separate treatment of Semestertickets. Sources: https://www.bahn.de/faq/pk/angebot and https://www.bahn.de/faq/pk/angebot/pendler
- THG-Quote N038: UBA's page, last updated 2026-11-06, distinguishes the non-public charging estimate for a registered battery EV (15 November of the obligation year) from metered public charging (28 February of the following year). Section 8 of the 38th BImSchV confirms both dates. UBA's page lists the 2026 fee range of 94.60–6,500 EUR for applications from 2026-04-17. The Sunday extension question is deliberately not asserted as settled. Sources: https://www.umweltbundesamt.de/themen/verkehr/kraftstoffe-antriebe/vollzug-38-bimschv-anrechnung-von-strom-fuer ; https://www.gesetze-im-internet.de/bimschv_38_2017/__8.html ; https://www.gesetze-im-internet.de/vwvfg/__31.html
- Social insurance draft L097: BMAS still shows the 2027 ordinance as not yet promulgated and awaiting Bundesrat consent. The Berlin state government's preview for the 2026-11-20 Bundesrat meeting lists BR-Drs. 576/26. L097 remains an unpublished draft pending the meeting and subsequent promulgation check. Sources: https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/sozialversicherungs-rechengroessenverordnung-2027.html ; https://www.berlin.de/rbmskzl/politik/senatskanzlei/bundesangelegenheiten/der-bundesrat/vorschau-auf-die-bundesratssitzung-1616077.php
- Christmas post L073: DHL's current consumer page confirms outside-Europe parcel deadline 2026-11-26, outside-Europe letters/postcards 2026-11-25, and outside-Europe Express 2026-12-18; international online-franked items may be deposited 1–2 days later. The existing article's deadlines remain consistent; no unnecessary duplicate update was made. Source: https://www.dhl.de/de/privatkunden/kampagnenseiten/weihnachten.html
- Düsseldorf Christmas market E004: Visit Düsseldorf confirms 2026-11-19 to 2026-12-30, regular hours, special hours on 2026-12-24 and 2026-12-26, and closures on 2026-11-22 and 2026-12-25. D.LIVE's 2026-10-28 article adds six themed markets, the new Altstadt market on Flinger Straße/Marktplatz, cycle-route detours, and a children's programme including a Santa post office. E004 was last verified 2026-10-28 and is scheduled for review on 2026-11-18; these details are a candidate for that review, not yet changed. Sources: https://www.visitduesseldorf.de/erleben/veranstaltungen/weihnachten-in-duesseldorf ; https://www.d-live.de/artikel/das-ist-der-duesseldorfer-weihnachtsmarkt-2026

### Access and analytics limitations

- GSC Wizard returned `payment_required / subscription_required`; no Search Console property or performance metrics could be retrieved. No impressions, CTR, position, or query values are reported.
- No authenticated browser profile was available for the Apps Script editor or production admin surfaces. Public website retrieval and GitHub Actions browser tests were used instead.

### Next checks

1. Wait for CI on the current PR head after the N038 generated-page and L097 draft commits.
2. Verify the Apps Script 5-minute trigger and last execution from an authenticated editor session; do not reinstall it without inspecting current triggers.
3. Keep L098 unpublished until a qualified medical review and image-rights confirmation are documented.
4. Recheck L097 after the Bundesrat meeting on 2026-11-20 and official promulgation.
5. Review E004 on 2026-11-18 for the newly confirmed 2026 market layout and programme.


## Final CI confirmation — 2026-11-11

- Latest tested content head before this documentation-only note: `6c66522d81d4a30662c2585265b4c629913a2d7c`.
- GitHub Actions run `42954776691` completed successfully. The generated content build, generated-file consistency check, deterministic validation contract, and browser runtime smoke tests all passed.
- Browser runtime result: **144 passed in 3.5 minutes** across desktop, mobile, and tablet Chromium.
- The conversation UI tests stub the Apps Script endpoint with deterministic browser fixtures. They validate interface behavior and error handling, not live private-message delivery or live Zoho email delivery. The `ZOHO_SEND_FAILED` / `EMAIL_DELIVERY_FAILED` log messages occurred in the test fixture path and are not evidence of a production send attempt.
- The PR remains Draft and unmerged. No production content was published.

### Additional content verification — L093 (2026-11-11)

- 2026-11-09のEU理事会プレスリリースを確認。IOSSの利用対象を価値にかかわらず拡大し、EU域外事業者がEU内の保税倉庫に置く商品も対象とする合意、および2028-07-01からEU域外オンラインプラットフォームを全価値の商品についてVAT上のみなし供給者とする予定を確認。
- ただし、同日の合意は欧州議会への諮問・理事会の正式採択前。記事では「現行法」ではなく「理事会合意・2028年適用予定」と明記し、2026年の2ユーロ取扱手数料・3ユーロ暫定関税とは別制度として説明。
- 既存記事L093の本文・一次情報・更新日を改訂。新規URL・画像は追加していない。Markdown、living registry、生成HTML、Livingハブカードの確認日、sitemap、Article JSON-LD citation/dateModifiedを同期。
- 税関・VATの法的説明を含むため、registry review.statusをneeds_reviewへ変更。人間の編集確認が終わるまでPR #442はDraftのまま維持。
- 一次情報：https://www.consilium.europa.eu/de/press/press-releases/2026/11/09/taxation-council-approves-further-vat-simplification-rules-for-online-sales/（公開日2026-11-09、次の手続きは欧州議会への諮問後の理事会正式採択）。
- 本番サイトは変更していない。PRブランチでの生成物整合性・CI再実行はこのコミット後に確認する。
