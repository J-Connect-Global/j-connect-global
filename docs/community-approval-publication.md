# Community approval publication flow

`apps-script/community-board-api.gs` is the canonical Community Apps Script source. It queues the approval email until the deployed public JSON confirms that the post is live; marking a row active is not treated as publication proof.

## One-time Apps Script setup

1. Update the bound Community Apps Script project with both `community-board-api.gs` and `zoho-mail.gs`, then redeploy the existing web app as a new version.
2. Reload the bound spreadsheet and run **J-Connect Community → 承認通知用の列を追加** once. This appends only the following columns if they are absent:
   - `approval_notified_status`
   - `approval_notified_at`
   - `approval_notified_to`
   - `approval_notified_error`
   - `approval_notified_queued_at`
   - `approval_sync_requested_at`
3. Run **J-Connect Community → 承認通知トリガーを再インストール** once, and approve the requested permissions. This installs the retryable five-minute processor. Re-run this menu item after changing the Apps Script project or if its trigger is removed.

Required existing mail properties remain those documented in `zoho-mail-gas-setup.md`. For immediate GitHub Actions dispatch, optionally add this Script Property:

- `GITHUB_ACTIONS_TOKEN` — a GitHub token with permission to dispatch `sync-public-data.yml` in `J-Connect-Global/j-connect-global`. Never place this value in the repository or a client-side file.

Without that property, the row remains `waiting_publish`; the existing five-minute GitHub Actions schedule still updates public JSON, and the Apps Script trigger sends the email only after it observes the deployed post.

## Administrator workflow

Select a Community Posts data row, then choose **J-Connect Community → 選択した投稿を承認・公開キューに追加**. The script sets `status=active`, invalidates the GAS cache, requests the GitHub workflow when configured, and records `waiting_publish`. Its confirmation intentionally says that the email will be sent after public verification.

The processor cache-busts and reads `https://j-connect-global.com/assets/data/community/posts.json`. It sends the approval message only if the matching `post_id` is present with `status=active`, then writes `sent`, the actual send timestamp, and recipient. It uses a script lock and terminal status checks to prevent duplicate dispatch/email sends.

If public JSON does not contain the post for 90 minutes, the row becomes `publish_timeout`. Invalid recipients or delivery failures become `publish_error`. Select the row and use **公開確認を再試行** after correcting the issue; rows already marked `sent` are never sent again.

## Rollback

To stop pending email processing, delete the `processWaitingCommunityApprovalNotifications` installable trigger in Apps Script. Revert the deployed web-app version and repository changes together if needed. Existing published posts and static JSON are unaffected; queued rows can be retried after the corrected version is deployed.
