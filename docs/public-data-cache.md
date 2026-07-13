# Public data cache

Community and Jobs public display pages use generated JSON under `assets/data/`:

- `assets/data/community/posts.json`
- `assets/data/community/categories.json`
- `assets/data/jobs/jobs.json`
- `assets/data/jobs/categories.json`

Google Sheets and Apps Script remain the source of operational input for posts and jobs. The public GitHub Pages site loads these local JSON files for Home cards, list pages, detail pages, and public post-target lookups. GAS remains limited to sync, submission, and management workflows; public display reads do not fall back to GAS at user runtime.

Community post submissions must not collect or send a user-entered management credential. The Apps Script backend generates `manage_token_hash` / `manage_url` server-side and emails the private management link to `contact_email_private`. Community dates are stored in `availability_date`.

Community generated JSON includes every explicitly `active` row that is not explicitly deleted, hidden, or expired. Publication never depends on title, body, nickname, location, tags, images, text length, repeated characters, language, or words such as `test`, `テスト`, `demo`, `sample`, `dummy`, or `placeholder`. Human administrators make the moderation decision before setting `status=active`.

Jobs generated JSON includes every row with `status=active` when `expires_at` is blank or a valid, non-expired date. No sample, real-listing, verification, authorization, or application-enable fields are read or generated. Private review fields such as `contact_email` and `contact_name` are never emitted; a validated explicitly public application address may be emitted as `application_email` and `apply_email`. Source URLs are emitted only when they are valid HTTP(S) URLs. See `docs/data-operations.md` for the simplified spreadsheet schema.

Run the sync locally with:

```sh
node scripts/sync-public-data.mjs
node scripts/validate-jobs.mjs
```

The GitHub Actions workflow `Sync public data` can also be run manually and is scheduled every five minutes. Its concurrency group prevents overlapping runs, and the sync preserves each file's existing `generated_at` value when its public payload is unchanged so the workflow commits only real public-data changes.

Community and Jobs resolve one canonical Master GAS endpoint from `assets/js/data-sources.js`. The production workflow does not accept dataset-specific endpoint overrides. A developer may set `MASTER_API_URL` for an intentional local integration test; the sync identifies that source as a development override and still uses it for both datasets. If `COMMUNITY_API_URL`, `CONTENTS_API_URL`, or `JOBS_API_URL` is present, the sync fails instead of silently selecting a legacy deployment.

Sync diagnostics report only the canonical source type, a sanitized hostname/deployment suffix, source and eligible counts, generated counts, Community post IDs, and whether each public JSON file changed. Full endpoint URLs, query secrets, spreadsheet IDs, private contacts, and tokens must not be logged.

Generated JSON must contain public display fields only. Do not include private email addresses, private phone numbers, moderation notes, management tokens, hidden rows, drafts, rejected rows, or admin-only spreadsheet metadata.
