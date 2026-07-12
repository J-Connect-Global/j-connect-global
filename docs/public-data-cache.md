# Public data cache

Community and Jobs public display pages use generated JSON under `assets/data/`:

- `assets/data/community/posts.json`
- `assets/data/community/categories.json`
- `assets/data/jobs/jobs.json`
- `assets/data/jobs/categories.json`

Google Sheets and Apps Script remain the source of truth for managing posts and jobs. The public GitHub Pages site should load these local JSON files during normal list and detail page rendering. GAS is still used by submission workflows, including the Community post form.

Community post submissions must not collect or send a user-entered management credential. The Apps Script backend generates `manage_token_hash` / `manage_url` server-side and emails the private management link to `contact_email_private`. Community dates are stored in `availability_date`.

Community generated JSON excludes rows that look like obvious test, demo, sample, dummy, or placeholder posts. The filter targets exact test titles, repeated Japanese test bodies such as `テスト投稿です`, image/system test rows, and synthetic placeholder rows; it should not remove real posts merely because a natural sentence contains `test` or `テスト` once.

Jobs generated JSON may include public application contact fields only when a real listing has passed the publication gate: `status=active`, `listing_type=real`, `is_verified=true`, non-empty `employer_authorized_at` and `verified_at`, and a valid future `expires_at`. `public_apply_enabled` must also be `true` before the UI renders an application action. The same validated address is emitted as `contact_email`, `application_email`, and `apply_email` for frontend compatibility. Empty or invalid source emails are left blank.

Samples are explicit records (`listing_type=sample`, `is_verified=false`, `public_apply_enabled=false`) and retain their classification through the sync. The sync strips application, company, and source URLs from samples; it does not infer or replace a sample classification from fallback data. See `docs/data-operations.md` for the required Jobs spreadsheet columns and review flow.

Run the sync locally with:

```sh
node scripts/sync-public-data.mjs
node scripts/validate-jobs.mjs
```

The GitHub Actions workflow `Sync public data` can also be run manually and is scheduled every six hours. It commits only the generated JSON files when data changes.

Optional environment overrides are supported:

- `COMMUNITY_API_URL`
- `CONTENTS_API_URL`
- `JOBS_API_URL`

Generated JSON must contain public display fields only. Do not include private email addresses, private phone numbers, moderation notes, management tokens, hidden rows, drafts, rejected rows, or admin-only spreadsheet metadata.
