# Public data cache

Community and Jobs public display pages use generated JSON under `assets/data/`:

- `assets/data/community/posts.json`
- `assets/data/community/categories.json`
- `assets/data/jobs/jobs.json`
- `assets/data/jobs/categories.json`

Google Sheets and Apps Script remain the source of truth for managing posts and jobs. The public GitHub Pages site should load these local JSON files during normal list and detail page rendering. GAS is still used by submission workflows, including the Community post form.

Community post submissions must not collect or send a user-entered management credential. The Apps Script backend generates `manage_token_hash` / `manage_url` server-side and emails the private management link to `contact_email_private`. Community dates are stored in `availability_date`.

Run the sync locally with:

```sh
node scripts/sync-public-data.mjs
```

The GitHub Actions workflow `Sync public data` can also be run manually and is scheduled every six hours. It commits only the generated JSON files when data changes.

Optional environment overrides are supported:

- `COMMUNITY_API_URL`
- `CONTENTS_API_URL`
- `JOBS_API_URL`

Generated JSON must contain public display fields only. Do not include private email addresses, phone numbers, moderation notes, management tokens, hidden rows, drafts, rejected rows, or admin-only spreadsheet metadata.
