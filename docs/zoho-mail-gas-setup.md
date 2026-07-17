# J-Connect Zoho Mail and Apps Script setup

This repository sends production email through the Zoho Mail API. The Apps Script project must be redeployed after these files are copied into it; deploying the static website alone does not update the server-side email workflow.

## 1. Create the Zoho OAuth client

Create a server-based OAuth client in the Zoho API Console for the Zoho account that owns `contact@j-connect-global.com`. Authorize the smallest working mail scope:

`ZohoMail.messages.CREATE`

Generate a refresh token through Zoho's OAuth authorization flow. Keep the client secret and refresh token only in Apps Script Script Properties. They must never be put in this repository, browser code, issue comments, or deployment notes.

Use the correct Zoho data center for the account. For example, the accounts and mail API hosts can differ by region; obtain the exact hosts from the Zoho account/API console instead of changing the script to assume a specific domain.

## 2. Find the Zoho Mail account ID

Use the Zoho Mail account API or the Zoho Mail web console to find the account ID for the mailbox that sends as `contact@j-connect-global.com`. Confirm in Zoho that this address is a verified sender and that its display name is **J-Connect Global**. The API request deliberately uses only documented send-message fields, so the display name is configured in Zoho rather than injected as an undocumented request parameter.

## 3. Set Apps Script Script Properties

Open **Project Settings → Script properties** in the Community Apps Script project and add every property below.

| Property | Required value |
| --- | --- |
| `JCONNECT_PUBLIC_EMAIL` | `contact@j-connect-global.com` |
| `JCONNECT_ADMIN_EMAIL` | `contact@j-connect-global.com` |
| `ZOHO_ACCOUNT_ID` | The Zoho Mail account ID |
| `ZOHO_CLIENT_ID` | OAuth client ID |
| `ZOHO_CLIENT_SECRET` | OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | OAuth refresh token |
| `ZOHO_ACCOUNTS_BASE_URL` | The regional Zoho Accounts base URL, without a trailing slash |
| `ZOHO_MAIL_API_BASE_URL` | The regional Zoho Mail API base URL, without a trailing slash |

`validateJConnectEmailConfiguration_()` fails closed unless both J-Connect email properties are exactly `contact@j-connect-global.com`. No production email falls back to the Google account that owns the script.

## 4. Validate before release

In the Apps Script editor, run these functions manually:

1. `validateJConnectEmailConfiguration_()` confirms that all properties are present and that the public/admin addresses are locked to the J-Connect mailbox.
2. `testZohoEmailConfiguration_()` obtains a Zoho access token and sends a test message from the J-Connect mailbox to the configured administrator mailbox.

Do not copy values from the execution log into tickets or pull requests. The transport logs only non-secret status/error codes.

## 5. Redeploy the existing web app

Add both `community-board-api.gs` and `zoho-mail.gs` to the existing Apps Script project. Then use **Deploy → Manage deployments → Edit**, select **New version**, and deploy it using the existing web-app deployment. This keeps the existing deployment URL used by the Community, contact, and job-posting pages.

Confirm the web app is still authorized to use the Spreadsheet, Drive (if community image uploads are enabled), Cache, Lock, and external HTTP services.

## 6. End-to-end test checklist

After deploying a new version, test with non-sensitive data:

- Community post creation, confirmation email, inquiry forwarding, report, and cancellation request.
- General contact form, including the submitter receipt.
- Job-posting form, including the company contact receipt.
- Missing required fields, malformed email, malformed URL, hidden honeypot, overly long fields, form submitted too quickly, and repeated submissions.
- Zoho authentication failure and Zoho send failure: requests must return a safe user-facing error without OAuth/API details and must not send by any alternate provider.

Verify each message is visibly sent from `contact@j-connect-global.com`, the Community confirmation uses the **J-Connect Global** display name, and a Community inquiry provides a clearly labelled `mailto:` reply link without exposing the post owner address to the public form.

## 7. Retire the previous form service

Only retire the previous hosted-form account after the production deployment, successful test messages, and browser submission tests have been verified. Keep the provider configuration available until that evidence is recorded, then remove it according to the account's retention and billing policy.
