# Community / Jobs 審査・公開運用

`apps-script/community-board-api.gs` が Community と求人掲載依頼を受け付ける正式な統合 Apps Script です。管理者は Master Spreadsheet の `Community Posts` と `Jobs` を同じメニューで審査します。Spreadsheet 上で `active` にしただけでは公開完了とせず、本番JSONにIDが現れた後に申請者へ公開通知を1回だけ送信します。

## 初回設定と更新時の注意

1. 既存Apps Scriptプロジェクトの `community-board-api.gs` と `zoho-mail.gs` を更新し、既存Webアプリを新しいバージョンとして再デプロイします。`apps-script/community-board-api.gs` が Master GAS プロジェクトへコピーする完全な正式ソースです。別の `doGet`、`doPost`、`onOpen` は追加しません。
2. 既存の5分トリガー `processWaitingCommunityApprovalNotifications` は互換ラッパーとして残っており、CommunityとJobsの両方を確認します。すでに本番トリガーがあれば作り直す必要はありません。
3. トリガーが存在しない場合だけ、Apps Scriptエディターから `installCommunityApprovalNotificationTrigger` を手動実行します。この保守関数は通常メニューには表示されません。
4. 統合Spreadsheetは Script Property の `MASTER_SPREADSHEET_ID` で指定することを推奨します。未設定時のみ従来の `COMMUNITY_SPREADSHEET_ID`、さらに両方が未設定の場合のみアクティブSpreadsheetを使用します。値の前後の空白は無視されます。IDをソース、ログ、クライアントへ記載しないでください。
5. メール用Script Propertiesは `zoho-mail-gas-setup.md` の既存設定を利用します。即時同期には既存の `GITHUB_ACTIONS_TOKEN` を利用します。値をリポジトリやクライアントへ記載しないでください。

審査操作時に不足していれば、次の管理列が既存列の末尾へ自動追加されます。既存列の削除、移動、改名は行いません。

- 共通: `status`, `updated_at`, `published_at`, `approval_notified_status`, `approval_notified_at`, `approval_notified_to`, `approval_notified_error`, `approval_notified_queued_at`, `approval_sync_requested_at`, `rejection_reason`, `rejected_at`, `last_modified_at`, `last_modified_action`
- Jobs受付時: 上記に加え、存在しない管理項目の `job_id`（`id`があれば再利用）, `status`, `created_at`, `updated_at`, `published_at`, `submission_key`

## Communityの審査

1. 管理者通知メール「Community新規投稿」を確認します。メールに管理用トークンや投稿者用管理URLは含まれません。
2. `Community Posts` の `pending` 行で、投稿内容と非公開連絡先を確認して行を選択します。
3. Spreadsheetを再読み込みすると表示される **J-Connect管理** から、**選択した投稿を承認・公開** または **選択した投稿を却下** を実行します。
4. 承認時は確認ダイアログ後に `active` となり、既存の `sync-public-data.yml` が要求されます。本番 `assets/data/community/posts.json` に `post_id` が現れた後、投稿者へ公開URLを送信します。
5. 却下時は空欄不可の理由を入力し、最終確認後に `rejected` と理由・日時を保存して投稿者へ通知します。
6. 90分を超えて `publish_timeout` になった場合などに限り、行を選択して **公開確認を再試行** を実行します。`sent` の行は再送しません。

## Jobsの審査

1. 求人フォームの正常受付時に `Jobs` へ `pending` 行が自動保存され、管理者と企業担当者へ受付メールが送られます。同じ `company_name`、`position_title`、`contact_email`、`form_started_at` の再送は `submission_key` で同一申請として扱われ、二重行やメールを作りません。別のフォーム読み込みによる新規申請でも、同じ `contact_email` から5分以内なら安全なレート制限応答となります。別メールアドレスには影響せず、5分後は再度受け付けます。
2. 管理者通知メールを確認し、`Jobs` の `pending` 行で企業情報、求人内容、非公開の `contact_name` / `contact_email` を審査します。
3. 行を選び、Communityと同じ **J-Connect管理** メニューから承認または却下します。
4. 承認後、本番 `assets/data/jobs/jobs.json` に `job_id` / `id` が現れたことを5分トリガーが確認し、企業担当者へ `/germany/ja/jobs/detail/?id=...` の公開URLを1回だけ通知します。
5. 却下時は理由がSpreadsheetへ保存され、企業担当者へ理由と再申請可能である旨が送信されます。

## 安全性とトラブル対応

- `pending`, `rejected`, `hidden`, `deleted`, `spam` などは公開されず、公開同期の対象は厳密に `status=active` だけです。
- `contact_email_private`, `contact_email`, `contact_name`, 管理トークン、審査列、`submission_key` は公開JSONへ出力しません。公開応募先メールが必要な求人は、データ元で `application_email` / `public_email` など明示的な公開列を使用します。
- 管理者通知や申請者メールが失敗しても、保存済み行は削除しません。外部レスポンスやUIへOAuth情報、管理者メール、Spreadsheet ID、内部例外を表示しません。
- 同期失敗コードは `approval_notified_error` に記録されます。原因を修正してから **公開確認を再試行** してください。
- 処理を停止する場合はApps Scriptの `processWaitingCommunityApprovalNotifications` インストール型トリガーを削除します。既存の公開JSONやSpreadsheet行は影響を受けません。

## 本番反映後の手動確認

1. テスト用Community投稿と求人依頼を各1件送信し、両方が `pending` で保存され、受付メールと管理者メールが届くことを確認します。
2. 同じ求人HTTPリクエストを再送し、Jobs行が増えないことを確認します。
3. 各シートで承認し、数分後に対象IDが本番JSONと詳細ページへ現れ、公開メールが1回だけ届くことを確認します。
4. 別のテスト行を理由付きで却下し、`rejected` と理由が保存され、公開JSONに出ず、理由付きメールが届くことを確認します。
5. `sent` 行で **公開確認を再試行** を実行し、「すでに公開通知済みです」と表示され、メールが増えないことを確認します。
6. `Community Posts` / `Jobs` 以外のシートとヘッダー行で各メニューを実行し、安全な日本語警告だけが表示されることを確認します。
