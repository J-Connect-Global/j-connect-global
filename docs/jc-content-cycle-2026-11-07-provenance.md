# J-Connect Germany — 調査・作業記録（2026-11-07）

## 実行日・対象

- 確認日：2026年11月7日（Europe/Berlin）
- 対象サイト：https://j-connect-global.com/germany/ja/
- 実体リポジトリ：`J-Connect-Global/j-connect-global`
- 指定候補 `NihonGatewayGermany/nihon-gateway-germany`：現在の実体として取得できず。既存サイトのコード・記事・ワークフローは上記リポジトリで確認。
- `J-Connect Germany | Growth & Content` Project Instructions：Notion検索が非対話実行でユーザー入力を要求したため、本文を取得できず。今回のユーザー指示、公開サイト、現行main、既存PRを基準にした。

## 1. 優先度1 — 既存運用課題

### 公開データのデプロイ復旧

- 2026-11-06 12:52 UTCの `Sync public data` 実行は、データ同期・Pages build・SEO/アクセシビリティ検証までは成功したが、GitHub Pagesの本番デプロイが `syncing_files` のまま10分経過してタイムアウトした。
- 失敗したデプロイジョブだけを2026-11-07 04:04 UTCに再実行し、04:05 UTCに成功した。コード変更や新しいデータ生成は行わず、mainに既にコミットされていたデプロイ対象を再公開した。
- 本番の `assets/data/community/posts.json` を再取得して確認：`generated_at=2026-11-06T12:51:51.929Z`、`count=6`。タイトル `=1+1` のテスト投稿（`post_b8c9376c-91fb-462f-af36-dd15afae5748`）は公開JSONに含まれない。
- `categories.json` も同じ生成時刻へ更新され、現在の公開サイトマップは198 URL。今回の復旧ではGoogle Sheets、投稿者データ、求人、管理機能を変更していない。
- 確認URL：
  - https://j-connect-global.com/assets/data/community/posts.json
  - https://j-connect-global.com/assets/data/community/categories.json
  - https://j-connect-global.com/sitemap.xml

### 掲示板・非公開会話

- 本番の読み取り専用ステータスAPIは `messaging_version=2026-10-23.1`、`public_replies=true`、`private_conversations=true`、`inline_replies=true`、`instant_publish=true`、`persistent_links=true` を返した。
- 公開APIの機能フラグは正常。ただし、これは実メールの配送成功やApps Scriptトリガーの実行を証明しない。
- `installCommunityApprovalNotificationTrigger` は5分間隔のトリガーを作成し、`processWaitingCommunityApprovalNotifications` はその実行時に `processCommunityMessagingNotifications` も呼び出す設計。
- 実際のトリガー登録・最終実行時刻は、Apps Scriptエディタから実行する `inspectCommunityPublicationSync()` の管理者情報で確認する必要がある。この実行環境にApps Script管理セッション／Google Sheets接続はなく、登録状態を断定しない。
- 安全なテスト専用受信箱を確認できないため、実利用者へのテスト通知・実メールE2E・返信・再送は実行していない。

### ドイツ語学習カードの音声

- 現行コードはWeb Speech APIによる単語・例文の手動再生と停止、自動読み上げ初期OFFを実装している。
- Playwrightの音声テストは音声APIをモックしてUI・呼び出し順を検証する方式であり、端末スピーカーから実音が出ることの証明ではない。
- 物理端末の音声確認は未完了。今回のブラウザー実行は外部ブラウザー残高不足で開始できず、再試行していない。

## 2. サイト・PR・重複確認

- 公開サイトマップ：198 URL。
- C033「ドイツの聖マルティン祭とは？」は既に公開済みで、サイトマップに存在する。別URLで同じ一般ガイドを新規作成しない。
- N039（2026年の放送負担金データ照合）とN040（Euro 7）は現在の公開サイトマップに存在せず、今回のPR内の非公開ドラフトとして扱う。
- 確認時点の未マージPR（すべてDraft）：
  - #430 — 住民データ照合・Euro 7の2記事と既存記事更新案
  - #434 — 生活ガイド15本（ビザ、就労、家族、税、日常）
  - #423 — 10月統計記事、育児給付・THG等のドラフトと既存記事更新案
  - #422 — EU荷物手数料、デジタルID、基礎保障、住宅手当の4ガイド
  - #420 — EES/ETIAS、冬タイヤ、2027年ミニジョブの既存記事更新
- 類似テーマの追加量産は行わず、既存PRの専門レビューと統合を優先する。

## 3. 今回の公式情報再確認

### 放送負担金の全国住民データ照合

- 2026年11月5日付のプレス発表：照合開始日は2026年11月8日、データ送信は11月9日〜12月8日、確認書面の発送は12月中旬からと説明。
- 公式FAQ：最初の書面は2026年12月14日ごろからと説明。
- 同日付の公式サービス記事：最初の書面は2027年1月からと説明。公式ページ間の差を確認できたため、記事では両方の表記と確認日を明記し、個別通知の回答期限を優先する。
- 同居人が既に支払っている場合は支払者番号を回答。未登録住戸の遡及登録は2024年1月1日より前にはさかのぼらない。未確認データの削除は最長12か月、免除・減額は要件を満たす場合に最大3年さかのぼって申請可能。
- 2026年のオンライン回答フォームは10桁の照会番号を案内する一方、公式用語集は通常10桁・場合により15桁の手続番号もあると説明。特定フォームの説明と一般論を混同しない。

一次情報：
- https://www.rundfunkbeitrag.de/presse-und-aktuelles/presse/beitragsservice-startet-bundesweiten-meldedatenabgleich-2026
- https://www.rundfunkbeitrag.de/buergerinnen-und-buerger/informationen/informationen-zum-meldedatenabgleich/fragen-und-antworten-zum-bundesweiten-meldedatenabgleich
- https://www.rundfunkbeitrag.de/presse-und-aktuelles/servicethemen/ploetzlich-post-vom-beitragsservice-meldedatenabgleich-2026-das-muessen-sie-tun
- https://www.rundfunkbeitrag.de/formulare
- https://www.rundfunkbeitrag.de/nutzungshinweise/glossar
- https://www.gesetze-bayern.de/Content/Document/RBeitrStV-11

### Euro 7

- ドイツ連邦環境庁のページ（2026年8月13日更新）：M1・N1の新しい車両型式は2026年11月29日から対象、2027年11月29日からM1新車に適用と案内。
- EU規則2024/1257第10条第4・5項：2026年11月29日の新型式認証と、2027年11月29日のM1・N1新車の登録・販売・使用開始禁止を規定。小規模生産メーカーのM1・N1車には第10条第9項の2030年7月1日という別日程がある。
- UBA概要の2027年記載と法令本文のM1/N1範囲の差を記事内で説明し、法令本文の対象範囲を優先する。

一次情報：
- https://www.umweltbundesamt.de/themen/verkehr/emissionsstandards/pkw-leichte-nutzfahrzeuge
- https://eur-lex.europa.eu/eli/reg/2024/1257/oj

## 4. GSC・公開判断

- GSC Wizardは試用期間終了／有効な契約なしで拒否された。直近28日・3か月のクエリ、表示回数、CTR、平均順位は取得していない。実測値を推測していない。
- 検索実績の再開には https://tool.gscwizard.com/settings/subscription で契約状態の回復が必要。
- N039・N040は `published:false`、`status:draft` のまま。今回マージ・公開していない。
- 新規公開URL、canonical、hreflang、検索インデックス、サイトマップの変更なし。
- 掲示板、求人、連絡フォーム、管理システム、学習語彙・分類・進捗、プライバシー処理は変更していない。

## 5. 次の作業候補

1. Apps Script管理者が `inspectCommunityPublicationSync()` を実行し、5分トリガーの登録・最終実行時刻を確認する。
2. テスト専用受信箱を指定したうえで、実メール配送・返信・再送のE2Eを確認する（実利用者には送らない）。
3. Android/iOS実機で音声再生・停止・自動読み上げOFFを確認する。
4. PR #420/#422/#423/#430/#434の重複・一次情報・法務上の表現をレビューし、承認後に統合する。
5. GSC Wizardの契約回復後、28日・3か月のクエリとページデータを取得し、次の更新優先度に反映する。
