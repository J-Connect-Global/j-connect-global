# J-Connect Germany コンテンツサイクル — 2026-11-14

確認時刻：2026-11-14 04:56 CET

## 実行範囲と制約

- 対象リポジトリ：`J-Connect-Global/j-connect-global`。候補として指定された `NihonGatewayGermany/nihon-gateway-germany` は現行リポジトリとして確認できなかった。
- Project Instructions は取得できなかったため、`.github/agents/jconnect-content.agent.md` と `docs/article-images.md`、既存のコンテンツ・レジストリ・生成済みHTMLを基準にした。
- ルートの `README.md` は見つからなかった。コンテンツ担当エージェント指示では、Markdown、registry、HTML、hub、search index、sitemap の同期と、`scripts/validate-content.mjs` の実行を要求している。
- 認証済みGoogle Apps Script管理環境を利用できず、本番デプロイ・トリガー一覧・最終実行時刻・Zohoメール配送は確認していない。実ユーザーへのテストメール、投稿、返信、トリガー変更は実施していない。
- Search Console の実測値は取得できていない。表示回数、CTR、順位を推測で補っていない。
- 公開サイトの全ページを実ブラウザーで回帰確認する環境は利用できなかった。GitHub上の公開ソース、registry、sitemap、生成HTMLを確認した。

## 既存タスク（優先度1）

### Apps Script / コミュニティ通知

- リポジトリ内の現行ソース識別子は `CM_VERSION=2026-11-07.1`。公開ステータスAPIがこの値を返すまで、同バージョンの本番反映済みとは扱わない。
- 同じAPIソースの公開データ識別子は `PUBLIC_DATA_API_VERSION=2026-07-13.1`。
- 既存運用記録にある最後の公開ステータス確認（2026-11-07の記録）では、公開APIは `messaging_version=2026-10-23.1` を返していた。今回の実行では本番APIへ再接続できなかったため、現在のデプロイ版は未確認。
- `inspectCommunityPublicationSync()` で5分トリガーの登録・最終実行・失敗ログを確認する必要がある。トリガーがない場合に限り `installCommunityApprovalNotificationTrigger()` を実行する。既存トリガーの確認なしに削除・再作成しない。
- Zoho通知の実メールE2Eは安全なテスト専用受信箱が必要。実ユーザーのアドレスへテスト送信しない。

### 既存PR

- PR #442：Draft、87ファイル、HEAD `4c1e9a1f0e76f8b8d3bb58e165a645ab436ac524`、GitHubのマージ可能判定は false。現HEADに対応する最新CI成功は確認できず、mainとの同期・生成ファイル再生成・法務／税務レビューが残る。マージしていない。
- PR #447：Draft、48ファイル。既存の新規草稿3件（L099〜L101）と既存記事更新を保持。今回の更新後HEADは `e5ce567c85b565f148721530e4f801ead72b6b9a`。最新の Validate content run #2019 は確認時点で実行中。最新実行の成功をまだ宣言しない。
- いずれも本番マージ・公開は実施していない。

## サイト・記事インベントリ

main のレジストリと sitemap から確認：

- 日本語サイト sitemap：220 URL
- Living：89件、公開89件
- Events：107件、公開107件
- Pages：46件中44件が公開状態
- PR #447 の L099、L100、L101 は `published=false`、検索・ホーム・ハブ・サイトマップの表示フラグも false。新規URLは追加していない。

直近の公開更新には、E027（ケルンのカーニバル）、N023（2027年1月の制度変更）、N039（放送負担金データ照合）、N040（Euro 7）、L093（日本からの荷物）、L094（d-you）、L095（基礎保障）、L096（住宅手当）などがある。既存URLとの重複を避けた。

## 今回のコンテンツ改善

### N036 — 2026年10月の物価

- 連邦統計局が2026-11-11に公表した確報を参照。
- 国内消費者物価指数：前年比 +2.8%、前月比 -0.2%。
- 調和消費者物価指数：前年比 +2.8%、前月比 -0.1%。速報値と同じ結果が確報で確認されたため、本文の「速報値」を「確報値（速報値から変更なし）」へ修正。
- Markdown と生成HTMLを同期。既存URLは維持。

一次情報：
- https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/11/PD26_392_611.html

### E037 — ハンブルクのクリスマスマーケット2026

- Santa Pauli：ハンブルク市の最新案内に基づき、毎日のライブ音楽、木曜21:30・22:30、金曜・土曜21:30・22:30・23:30のショー開始時刻を追加。
- 聖ペトリ教会前：2026-11-18〜12-23、本文記載の営業時間は毎日11:00〜21:00（飲食は23:00まで）、11-22休業。
- Fleetinsel：2026-11-23〜12-23、本文記載の営業時間は月〜木・日12:00〜21:00、金・土12:00〜22:00。
- ハンブルク市の個別ページでは、本文の営業時間とページ下部の自動営業時間欄（休業表示）が一致しない。記事内でこの不整合を明記し、訪問直前の再確認を促す。
- Markdown、生成HTML、events registry、sitemap lastmod を同期。既存URLを維持。次回確認予定は2026-11-17。

一次情報：
- https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-rathausmarkt-301092
- https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-jungfernstieg-301080
- https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/santa-pauli-weihnachtsmarkt-307258
- https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-petrikirche-301062
- https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-auf-der-fleetinsel-301114

## PR #447 に含まれる公開前レビュー対象

- L099：NRWの小学校入学2027/28。2026-11-15の期限、対象生年月日、自治体別手続きを記載。休日繰越を断定せず、期限後は学校・自治体へ直接確認する案内。教育分野の人手レビュー待ち。
- L100：2026-11-20からの消費者信用・後払い規則。例外と契約条件を区別。法務レビュー待ち。
- L101：給与税控除額の申請。2026-11-30期限と2027年分の受付開始を説明。2027年の1,430ユーロ案は未成立の法案として扱う。税務レビュー待ち。
- SCHUFAガイド：2026-11-20からの新しい規則とスコア情報の説明。法務・データ保護レビュー待ち。
- E004：デュッセルドルフのクリスマスマーケット。既存URLのまま日程・営業時間・休業日を再確認する更新。
- E037：上記の通り、最新の市公式案内に更新。

## SEO・検証

- 新規公開URL：0件。L099〜L101は非公開草稿のまま。
- 既存URL、canonical、hreflang は変更していない。
- N036の生成HTML、E037の生成HTML・registry・sitemap を同期。
- 画像の新規追加・権利変更なし。既存のDüsseldorf画像は `content/article-photo-credits.json` に出典・著作者・ライセンス情報があることを確認。
- 最新CI run #2019 は実行中。完了結果は未確認。ブラウザー回帰・モバイル実機・実機音声・GSCの実測値は未取得。
- ユーザー投稿、求人、連絡フォーム、管理システム、学習語彙データ、プライバシー処理は変更していない。

## 次の作業

1. Google管理者セッションでApps Scriptの公開版と5分トリガーの実状態を読み取り確認。必要な場合のみ新しいWebアプリ版をデプロイし、専用テスト受信箱でE2E確認。
2. PR #447 の run #2019 を確認し、失敗時は原因を特定して必要な生成物だけ修正。法務・税務・教育レビューを経るまでDraftを維持。
3. PR #442 はmainとの差分を再同期し、生成HTML・registry・sitemapを再生成してから再検証。N038の期限後表示を2026-11-16以降に再確認。
4. 2026-11-30までのDeutschlandticket DB既存契約の同意期限、2027年価格、関連する既存記事を再確認。
