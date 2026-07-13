# Public data contracts and rollout

This repository publishes Community, Jobs, Eat, Shopping, and Medical through one pipeline:

`Master Spreadsheet -> versioned GAS response -> GitHub Actions validation -> committed same-origin JSON -> GitHub Pages`

The browser does not use GAS for normal public rendering. The canonical Web App URL remains unchanged.

## API version decision

The public contract version is `2026-07-13.1`. `PUBLIC_DATA_API_VERSION` in `apps-script/community-board-api.gs` and `EXPECTED_API_VERSION` in `scripts/sync-public-data.mjs` must match. GAS adds `api_version` to every JSON response. Sync validates all five responses before writing any file, so a missing, stale, or invalid version cannot partially replace a known-good snapshot. Dataset-specific legacy endpoint environment variables are rejected; `MASTER_API_URL` is only a whole-Master development override.

Apps Script source changes do not update the deployed Web App automatically. Every change to the canonical `.gs` source requires a manual **Deploy -> Manage deployments -> Edit -> New version -> Deploy** operation against the existing deployment. Do not create or configure a replacement Web App URL.

The committed directory files in this PR are an explicitly labelled `unversioned-bootstrap` migration snapshot. They were sanitized using the new repository allowlists so Pages has a safe same-origin artifact during the version rollout. Scheduled sync refuses to replace them until the existing GAS deployment returns `2026-07-13.1`; the first successful versioned run replaces the bootstrap label.

## Publication contracts

| Dataset | Public eligibility | Index/application policy | Browser file |
| --- | --- | --- | --- |
| Community | `status` exactly `active`; only lifecycle, moderation, deletion, hidden, archive, and expiry exclusions | Content text is never a publication heuristic. 投稿日 is `published_at`, falling back to `created_at`; 更新日 is shown only when `updated_at` is at least 24 hours later. | `/assets/data/community/posts.json` |
| Jobs sample | `status=active`; `listing_type=sample`; missing `listing_type` temporarily defaults to the same conservative sample behavior | Maximum 3; prominent `掲載見本・応募不可`; no application CTA; noindex dynamic detail; no sitemap entry; no `JobPosting` | `/assets/data/jobs/jobs.json` |
| Jobs real | `status=active`, `listing_type=real`, `is_verified=true`, valid `verified_at`, and valid `employer_authorized_at` or safe `source_url` | Missing expiry is allowed only when `last_reviewed_at` is within 30 days. Indexation additionally requires `is_indexable=true` and valid `last_reviewed_at`. Only then may `emit_job_posting` be true. | `/assets/data/jobs/jobs.json` |
| Eat / Shopping | `status=active`, non-empty display name, non-placeholder primary/detail category, and only HTTP(S) public URLs | Invalid URLs exclude the row and can never become an `href`. No guessed category. Missing coordinates are list/grid-only. | `/assets/data/eat/items.json`, `/assets/data/shopping/items.json` |
| Medical | `status=active`, name, category, city/area, safe official/source URL, and valid review/update date | Blank status is never public. No recommendation claim. The 112/116117 instruction and medical disclaimer remain visible. | `/assets/data/medical/items.json` |

All generated datasets report `source_count`, `explicitly_active_count`, `eligible_count`, `excluded_count`, `excluded_by_reason`, safe excluded IDs (capped per reason), and `generated_count`. Logs contain only counts, sanitized endpoint identity, and safe IDs. Contact/review emails, tokens, management URLs, spreadsheet identifiers, internal notes, and moderation fields are not copied.

## Verified bootstrap counts (2026-07-13)

| Dataset | Source | Explicit active | Eligible | Excluded | Generated | Main exclusion |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Community | 6 | 6 | 6 | 0 | 6 | none; includes `post_b316572b-01e1-4b77-b41a-c87e68d65f0b` / `test 1` |
| Jobs | 4 | 4 | 3 | 1 | 3 | fourth sample exceeds the public sample limit |
| Eat | 361 | 361 | 63 | 298 | 63 | placeholder `category2=test`; the 72 invalid map URLs occur inside that excluded group |
| Shopping | 344 | 344 | 45 | 299 | 45 | missing display name |
| Medical | 23 | 0 | 0 | 23 | 0 | blank status; review dates are also absent |

## Spreadsheet migration checklist

1. Do not rename existing columns. Add missing governance columns at the end.
2. Jobs: add `listing_type`, `is_verified`, `employer_authorized_at`, `verified_at`, `is_indexable`, and `last_reviewed_at`.
3. Mark at most three current display examples `listing_type=sample`; change the fourth to a non-public status or remove it from the sample set. Samples must not contain application destinations intended for use.
4. For a real job, set `listing_type=real` only after employer/source authorization; record ISO dates in `verified_at`, `employer_authorized_at`, and `last_reviewed_at`; set `is_verified=true`; set `is_indexable=true` only after the complete review; provide a future `expires_at` unless the documented 30-day open-ended review policy applies.
5. Eat: replace `category2=test` with a reviewed real category or make the row non-public. Do not guess a replacement. Correct non-HTTP map URLs or leave the URL blank before re-review.
6. Shopping: supply a usable display name for each intended public row; keep unnamed rows non-public.
7. Medical: review each provider against an official/source URL, add a review/update date, confirm name/category/city or area, and only then explicitly set `status=active`. Never bulk-fill blank statuses as active.
8. Keep private contact, moderation, management, and internal-note columns private; do not copy them into a public alias.

## Apps Script deployment checklist

1. Confirm `MASTER_SPREADSHEET_ID` points to the intended Master Spreadsheet. Remove or align the legacy `COMMUNITY_SPREADSHEET_ID` fallback.
2. Copy the complete canonical `apps-script/community-board-api.gs` into the existing Apps Script project together with the already-required mail source.
3. Confirm `PUBLIC_DATA_API_VERSION` is `2026-07-13.1`.
4. Use **Deploy -> Manage deployments -> Edit -> New version -> Deploy** on the existing Web App deployment. Do not change its URL.
5. Request Community, Jobs, Eat, Shopping, and Medical with non-sensitive test requests and confirm top-level `api_version`, `count`, `items`, and `validation_report` exist. Confirm Medical returns zero items while statuses remain blank.
6. Confirm public directory responses do not include `notes_internal`, contact/review email fields, tokens, management URLs, spreadsheet IDs, or moderation fields.
7. `GITHUB_ACTIONS_TOKEN` remains optional. When present it requests immediate `workflow_dispatch`; no token is stored in this repository. When absent, GAS records `SCHEDULED_SYNC_FALLBACK` and relies on the existing five-minute schedule instead of reporting an ambiguous no-op.

## GitHub Actions verification checklist

1. After GAS deployment, run **Sync public data** manually once. If manual dispatch is unavailable, record that the scheduled five-minute fallback is being used and wait for the next scheduled run.
2. Confirm logs report expected and received API version `2026-07-13.1` and the source/active/eligible/excluded/generated counts for all five datasets.
3. Confirm Community reports 6 generated safe IDs and contains `post_b316572b-01e1-4b77-b41a-c87e68d65f0b`. The repository variable `EXPECTED_APPROVED_COMMUNITY_POST_ID` may be changed only after an intentional lifecycle change.
4. Confirm the auto-commit contains all changed `assets/data/{community,jobs,eat,shopping,medical}` JSON files and that a timestamp-only run reports no changes.
5. Confirm the Pages job checks out `auto-commit-action.outputs.commit_hash`, validates every generated artifact, and deploys that commit.
6. Fetch each same-origin production JSON and compare declared count with `items.length`; then verify loading, populated, empty, filtered-empty, and error behavior in the three directory pages. Map controls must be disabled when no map-eligible items exist.

## Remaining risks and follow-up boundary

- The repository cannot deploy Apps Script or edit Spreadsheet governance fields. Until the manual GAS deployment occurs, scheduled sync intentionally fails with a version mismatch and retains the bootstrap JSON.
- Directory quality remains source-limited: 298 Eat rows need category review, 299 Shopping rows need names, and every Medical row needs explicit review and activation.
- The dynamic Jobs detail route stays noindex for every record in this PR. A follow-up should generate static real-job detail pages, canonical URLs, sitemap entries, and `JobPosting` only for `emit_job_posting=true` records.
- Community `/community/post/?id=...` still shares the posting-form HTML shell and remains noindex. A separate follow-up should split form/detail URLs and give the detail route record-specific canonical/description metadata without changing this data-pipeline rollout.
