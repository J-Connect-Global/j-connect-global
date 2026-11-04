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
