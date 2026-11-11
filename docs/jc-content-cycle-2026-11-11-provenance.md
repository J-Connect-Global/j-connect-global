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