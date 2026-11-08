# J-Connect Germany — 調査・作業記録（2026-11-08）

## 実行日・対象

- 確認日：2026年11月8日（Europe/Berlin）
- 対象サイト：https://j-connect-global.com/germany/ja/
- 実体リポジトリ：`J-Connect-Global/j-connect-global`
- 指定候補 `NihonGatewayGermany/nihon-gateway-germany`：GitHub検索で現在の実体を確認できず。既存サイトのコード・記事・ワークフローは上記リポジトリで確認。
- `J-Connect Germany | Growth & Content` Project Instructions：Notion検索が非対話実行でユーザー入力を要求し、取得できず。今回の指示、公開サイト、現行main、既存PR、直近の作業記録を基準にした。
- `README.md`：対象リポジトリのルートに存在せず、GitHub Contents APIは404。記事・運用方針は既存のdocsとコードを参照。

## 1. 優先度1 — 既存J-Connectタスクの確認

### GitHubの既存PR

- 現在のopen PR検索では **#442のみ** が返った。他の未完PRは検索結果に存在しない。
- 次のPRは今回の確認でマージ済みと確認した：
  - #351：非公開会話・掲示板関連の実装（過去のデプロイ・受入確認を含む）
  - #420：EES/ETIAS、冬タイヤ、2027年ミニジョブの既存記事更新
  - #422：4本の生活ガイド公開
  - #423：10月統計・THG期限ニュースの公開
  - #424：フラッシュカード音声再生時のUIフィードバック改善
  - #428：2027年制度変更、暗記カード修正、未使用CSS・画像の整理
  - #430：放送負担金データ照合・Euro 7ニュースと既存記事更新
- #442は本番サイトへの公開ではなく、記事原稿と既存記事の更新提案を置く未マージPR。マージ・公開はしていない。

### 5分トリガー・掲示板・非公開会話

- 2026年11月8日に本番の読み取り専用ステータスAPIを再取得した結果、`messaging_version=2026-11-07.1`、`public_replies=true`、`private_conversations=true`、`inline_replies=true`、`instant_publish=true`、`persistent_links=true`、`api_version=2026-07-13.1` を確認した。
- mainの `apps-script/community-messaging.gs` の `CM_VERSION=2026-11-07.1` と本番応答が一致する。PR #432でmainに統合されたApps Scriptハードニング版は、本番へ反映済みと判断できる。
- 現行コードで `processWaitingCommunityApprovalNotifications` は `processCommunityMessagingNotifications` を呼び出した後、承認通知を処理する互換ラッパーとして存在する。
- `installCommunityApprovalNotificationTrigger` は同じハンドラーの既存トリガーを削除してから5分間隔のトリガーを再作成する。管理者確認なしに再実行しない。
- ただし、本番Apps Scriptのトリガー一覧と最終実行時刻は、この実行環境から確認できない。公開ステータスAPIはトリガー状態を返さないため、登録済みとは断定しない。
- 実確認にはApps Script管理者セッションで `inspectCommunityPublicationSync()` を実行する必要がある。同関数は `notification_trigger_configured`、`last_dispatch_attempt_at`、`last_dispatch_at`、`last_dispatch_error` を安全な形式で返す。Google Apps Script/Sheetsの認証済み接続は今回利用できなかった。

### Zohoメールの実配送

- 安全なテスト専用受信箱を確認できないため、今回も実利用者宛てのテストメール、返信、再送E2Eは実行していない。
- 既存の運用者アドレスへテスト送信する代替は行っていない。実メールの成功を推測しない。

### ドイツ語学習カードの音声

- PR #424はマージ済み。手動再生時の状態表示、停止・エラー表示、自動読み上げ初期OFFの実装を確認。
- Playwrightの音声テストはSpeechSynthesisをモックするため、実端末のスピーカーから音が出ることの証明にはならない。物理端末での音声確認は未完了。
- TinyFishの利用可能残高は **-0.12 USD**。次のブラウザー実行は開始できない。既定プロファイルにもGoogle等のサインイン済みサイトが登録されていないため、Apps Scriptへのログイン操作も行っていない。

### 優先度1の結論

- GitHub上の既存実装・PRは確認できる範囲でマージ済み。
- 残る実機確認は、Apps Scriptの5分トリガー登録・最終実行時刻、Zohoの安全なテスト受信箱を使った実メールE2E、物理端末の音声出力。
- いずれも今回の環境では安全な認証・テスト条件が不足しており、未完了として維持する。関連しない掲示板、求人、フォーム、管理、学習語彙・分類、進捗、プライバシーコードは変更していない。

## 2. サイト・公開URL・SEOの確認

- 公開サイトの正規ルート：https://j-connect-global.com/germany/ja/
- 正しいサイトマップ：https://j-connect-global.com/sitemap.xml
- ルートサイトマップは **220 URL** を返した。誤って `/germany/ja/sitemap.xml` を指定すると404になる。
- トップページのcanonicalは `https://j-connect-global.com/germany/ja/`、robotsは `index, follow`、viewportはモバイル対応の幅設定を確認。
- 公開中のN039「放送負担金・全国住民データ照合」、N040「Euro 7」、健康保険ガイドL003、追加保険料ニュースN025、ミニジョブ2027ガイドを確認。
- N039は2026年11月7日公開、本文は11月8日の照合基準日と11月9日からのデータ送信を説明する。11月8日当日の見出し・冒頭表現を更新する提案をPR #442に追加。
- L003は2026年11月6日更新。2027年の基準額、特例ライン、保険料算定上限の説明を補強する提案をPR #442に追加。
- N025は2026年10月26日更新のままで、2027年の平均追加保険料率がまだ正式告示されていないという古い説明を含む。連邦保健省が10月30日に2.9％と決定したため、更新提案をPR #442に追加。
- 既存の `germany-january-2027-changes` は2027年の広い変更まとめ、N025は健康保険の平均追加保険料と乗り換え、今回のL097は社会保険基準額・給与別の影響に焦点を分け、カニバリゼーションを避ける。

## 3. 今回の調査・一次情報

確認時刻：2026年11月8日（Europe/Berlin、04時台）

### 2027年社会保険基準額

- 連邦労働・社会省は2026年10月7日に2027年の基準額案を公表。2025年の賃金上昇率4.38％を基礎とし、健康保険の加入義務ラインと保険料算定上限には法定の追加300ユーロ／月が反映されると説明。
- BMASの予定額：
  - 一般の健康保険加入義務ライン：84,150ユーロ／年、7,012.50ユーロ／月
  - 2002年末時点の特例：72,900ユーロ／年、6,075ユーロ／月
  - 2026年末時点の特例：80,550ユーロ／年、6,712.50ユーロ／月
  - 健康保険の保険料算定上限：76,500ユーロ／年、6,375ユーロ／月
  - 一般年金保険・失業保険の上限：106,200ユーロ／年、8,850ユーロ／月
  - 社会保険の基準額：49,560ユーロ／年、4,130ユーロ／月
- 2027年の年次政令は2026年11月8日時点で連邦参議院の同意前。2026年11月20日の会議で審議される予定。予定額と確定額を混同しない。
- Bundesrat-Drucksache 576/26の本文は§6(6)・(7)・(8)、§223(4)の金額と根拠を記載。§6(8)の80,550ユーロは、2026年12月31日時点で報酬超過により加入義務がなく、民間の代替健康保険に加入していた会社員を対象とする特例。2002年末の特例とは別。
- `Gesetze-im-Internet` の現行§6統合ページは、2026年の改正が文書上まだ完全反映されておらず、§6(8)を「weggefallen」と表示している。80,550ユーロの根拠をこの統合ページだけに依存せず、BMAS表・Bundesrat-Drucksache 576/26・BGBl 2026 I Nr. 228を併記する。

一次情報：
- https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/sozialversicherungs-rechengroessenverordnung-2027.html
- https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2026/bundeskabinett-beschliesst-sozialversicherungsrechengroessen-2027.html
- https://dipbt.bundestag.de/dip21/brd/2026/0576-26.pdf
- https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/261008-bundeskabinett-sv-rechengroessen-2027
- https://www.berlin.de/rbmskzl/politik/senatskanzlei/bundesangelegenheiten/der-bundesrat/vorschau-auf-die-bundesratssitzung-1616077.php
- https://www.recht.bund.de/eli/bund/bgbl-1/2026/228

### 2027年の平均追加保険料率

- 連邦保健省は2026年10月30日に、2027年の平均追加保険料率を2.9％に決定。これは各保険者の個別料率が一律2.9％になる意味ではない。
- 既存のN025は10月26日確認のままで「11月1日までの告示待ち」と記載。10月30日付の決定発表を反映する更新提案を追加。

一次情報：
- https://www.bundesgesundheitsministerium.de/presse/pressemitteilungen/zusatzbeitragssatz-gkv-2027-festgelegt
- https://www.bundesgesundheitsministerium.de/beitraege

### 競合・検索意図

- TK Firmenkundenは2027年の一般・特例JAEG、健康保険BBG、年金・失業保険BBGを一覧で説明している。
- J-Connectの差別化は、日本語で「加入義務ライン」と「保険料算定上限」を区別し、2002年・2026年末の2つの民間保険加入者向け特例、給与別の影響、日独社会保障協定の注意を説明する点。
- 既存の2027年1月変更まとめは広いニュース一覧、N025は平均追加保険料と保険者変更、L003は健康保険の選び方、L097は基準額の詳細ガイドとし、同じ検索意図の記事を増やさない。

競合・補助資料：
- https://www.tk.de/firmenkunden/versicherung/jahreswechsel/jw-beitraee-und-rechengroessen/sv-rechengroessen-2027-2227000
- https://www.tk.de/firmenkunden/versicherung/jahreswechsel/jw-beitraee-und-rechengroessen/jaeg-und-wie-das-jae-ermittelt-wird-2059296

## 4. 今回の編集成果（すべてPR内の原稿・提案）

PR #442： https://github.com/J-Connect-Global/j-connect-global/pull/442

1. **新規原稿案 L097**：2027年社会保険基準額ガイド。2026/2027比較表、3種類の健康保険加入義務ライン、給与別の例、日独社会保障協定の注意、既存記事への内部リンクを追加。公開URL・記事IDは公開前に再確認する。
2. **既存記事L003の更新提案**：2027年の84,150／80,550／72,900／76,500ユーロ、平均追加保険料率2.9％、加入義務ラインと保険料算定上限の違いを補強。URLは維持。
3. **既存記事N039の更新提案**：11月8日を照合の基準日として明確化し、11月9日〜12月8日のデータ送信、通知時期の公式ページ間の差を再確認。URLは維持。
4. **既存記事N025の更新提案**：10月30日の平均追加保険料率2.9％決定を反映し、10月26日時点の「告示待ち」説明を削除する案。URLは維持。

本番記事本文、公開URL、canonical、hreflang、robots、サイトマップは今回変更していない。新規公開・本番公開はゼロ。

## 5. SEO・テスト・GSC

- ルートサイトマップで220 URLを確認。今回のPRは原稿・更新提案・作業記録のみで、公開ページやサイトマップに新規URLは追加していない。
- 既存ページのcanonicalとrobots、モバイルviewportを確認。N039のcanonicalは正規URL、robotsはindex/follow、jaとx-defaultのhreflangを確認。英語・ドイツ語の未完成ページを追加していない。
- PR #442の既存GitHub Actions「Validate content」run #1751は成功。今回の追加コミット後のCIは別途確認する。
- Codexレビューは利用上限により失敗したとPR上に記録されている。レビュー成功とは扱わない。
- GSC Wizardは試用期間終了／有効な契約なしで拒否。直近28日・3か月のクエリ、表示回数、CTR、平均順位は取得できず、実績値を推測していない。
- TinyFish残高は-0.12 USDで、クラウドブラウザー実行は開始できない。既定ブラウザープロファイルにもサインイン済みサイトが登録されていない。
- GitHub上の既存PR #442のCI成功以外に、今回の新しいブラウザーE2E・実機テストは実行していない。

## 6. 未解決事項・権限待ち

1. Apps Script管理者が `inspectCommunityPublicationSync()` を実行し、5分トリガーの登録・最終実行時刻を確認する。
2. 安全なテスト専用受信箱を設定したうえで、Zohoの実メール配送・返信・再送をE2E確認する。実利用者には送信しない。
3. Android/iOS実機でフラッシュカードの実音声再生・停止・自動読み上げ初期OFFを確認する。
4. 2026年11月20日の連邦参議院審議後、社会保険基準額政令の同意・公布状況を再確認する。承認前は予定額のまま。
5. GSC Wizardの契約回復後、28日・3か月のクエリとページを取得して優先順位に反映する。
6. PR #442は編集レビュー待ち。マージ・公開していない。

## 7. 次回の候補

- 11月20日以降：2027年社会保険基準額の最終公布確認、L097とL003の予定額を確定額へ更新。
- 12月中旬：保険者別の2027年追加保険料率を再確認し、N025とL003を更新。
- N039：実際の通知開始状況と公式FAQの更新を確認し、必要なら記事を再更新。
- GSCが利用可能になったら、健康保険・年金・Minijob関連クエリの実測値から記事優先度を再評価。



## 8. Run 11追補 — 実装・検証状況（2026年11月8日 05時台）

### 優先度1の追加確認

- #439〜#441の求人・投稿フォーム修正はmainに統合済み。フロントエンド側の修正はリポジトリに反映されているが、各PR本文に記載された community-board-api.gs のサーバー側変更をApps Script本番へ再デプロイしたかは確認できていない。公開Messaging Status APIが返す 2026-11-07.1 は community-messaging.gs の版であり、求人投稿APIのデプロイ版を証明しない。
- CIのGAS submissions testsは通過しているが、ログには ZOHO_SEND_FAILED と EMAIL_DELIVERY_FAILED の模擬失敗が含まれる。これはエラー処理・再試行のテストであり、実際のZoho配送成功を証明しない。
- German-learningデータ検証は **17,635カード・18デッキ**。Playwright 144テストは成功している。音声APIはモックを使用するため、実端末のスピーカー出力は未確認。
- Apps Script管理者セッション、テスト専用メール受信箱、実機が引き続き不足。これらを必要とする本番操作は行っていない。

### PR #443 — 終了済みイベントのホーム表示除外

- https://github.com/J-Connect-Global/j-connect-global/pull/443
- E024「ケルン・ミュージアムナイト2026」は11月7日1:00に終了したため、home_visible:false に変更。記事本文・検索対象・イベント一覧・canonical・sitemapは変更しない。
- 11月8日開催中のART COLOGNEとコメルンの聖マルティン祭を維持し、3枚目の候補を11月11日開始のケルン・カーニバルガイドに更新した生成済みトップページを同PRに含めた。
- PRはレビュー可能状態。マージ・本番反映は未実施。CIの結果を確認中。

### PR #442 — コンテンツ更新の実ファイル反映

- https://github.com/J-Connect-Global/j-connect-global/pull/442
- 新規記事L097は引き続き docs/drafts/ 内の原稿。公開registry・sitemap・canonicalには追加していない。
- L003の既存健康保険ガイドに2027年の一般・特例JAEG、健康・介護保険BBG、年途中で基準を超えた場合のSGB V §6(4)の時期ルールを反映。
- N025は10月30日の平均追加保険料率2.9％の正式決定に更新。10月14日の推計と決定を分離し、旧「告示待ち」説明を削除。裏付けが弱い収支表・料率幅を削除。
- N039は11月8日を照合基準日、11月9日〜12月8日をデータ送信期間として、タイトル・概要・イベント日付を更新。通知開始日の公式ページ間の差は維持。
- URL・slug・canonical・公開日は維持。新規草稿L097へのリンクは、記事が公開されるまで追加していない。
- 直近のCI run #1762（PR #442の先行コミット）は成功。npm run validate と git diff --exit-code が通り、Playwright 144テストが成功。German-learningの検証結果は17,635カード・18デッキ。今回追加したL003/N025/N039の更新コミットは別のCI結果が出るまで未検証扱い。
- GSCは契約なしで実測値を取得できず、TinyFishは残高不足。検索流入の改善は主張しない。

### 次の再確認

- 今回のコンテンツ変更後のPR #442 CIを確認し、生成済みHTML・sitemap・search indexの同期差分を解消する。
- PR #443の生成済みトップページとイベントカード順をCIで検証する。
- Apps Script本番デプロイ、5分トリガー、実メールE2E、実機音声は認証・テスト資源が揃うまで未完了として扱う。


### 静的整合チェック（2026年11月8日 05時台）

- PR #442現HEAD：164996ff013f6c146b86da14a1c0a61894a29268
- L003/N025/N039のタイトル、概要、更新日、確認日、正規URL、公式出典リストは、それぞれ本文front matterとregistryで一致することを静的比較で確認。N025の次回確認日はfront matterのnext_reviewとregistryのreview.next_review_dueで一致。
- 3記事の既存内部リンクはregistry上の公開済みslugに解決。旧N025の「11月1日告示待ち」、古い料率幅、L003の月603ユーロ混同表現は除去済み。
- 新規L097はdocs/drafts内のみ。living/events registryに未登録で、公開URL・sitemap・canonical・hreflangは追加していない。
- PR #442の生成済みHTML、検索インデックス、sitemapはまだ更新していない。最新HEADのCIは取得できず、マージ可能な状態とは扱わない。
- PR #443のホームイベント欄を静的解析し、カードがE017（ART COLOGNE）→E020（コメルン）→E027（ケルン・カーニバル）の3件であること、画像クラスが順に img-japan-day / img-market / img-movie であること、終了済みE024がホーム欄にないことを確認。E024はイベント一覧・検索・sitemapには残る。CIは未確認。
