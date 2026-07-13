# Public data contracts and rollout

This repository publishes Community, Jobs, Eat, Shopping, and Medical through one pipeline:

`Master Spreadsheet -> versioned GAS response -> GitHub Actions validation -> committed same-origin JSON -> GitHub Pages`

The browser does not use GAS for normal public rendering. The canonical Web App URL remains unchanged.

## API version decision

The public contract version is `2026-07-13.1`. `PUBLIC_DATA_API_VERSION` in `apps-script/community-board-api.gs` and `EXPECTED_API_VERSION` in `scripts/sync-public-data.mjs` must match. GAS adds `api_version` to every JSON response. Sync validates all five responses and prepares all seven artifacts before replacing any file, so a missing, stale, or invalid version leaves the known-good snapshot untouched. Each changed artifact then uses **per-file atomic replacement**: it is written completely to a unique temporary file in the target directory, renamed over the target, and the temporary file is removed if writing or renaming fails. The seven files are **not one filesystem transaction**; a later filesystem failure can leave earlier per-file replacements in place. Dataset-specific legacy endpoint environment variables are rejected; `MASTER_API_URL` is only a whole-Master development override.

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
| Community | 6 | 6 | 6 | 0 | 6 | none; active content such as the title `test 1` is not suppressed by text heuristics |
| Jobs | 4 | 4 | 3 | 1 | 3 | fourth sample exceeds the public sample limit |
| Eat | 361 | 361 | 63 | 298 | 63 | placeholder `category2=test`; the 72 invalid map URLs occur inside that excluded group |
| Shopping | 344 | 344 | 45 | 299 | 45 | missing display name |
| Medical | 23 | 0 | 0 | 23 | 0 | blank status; review dates are also absent |

## Spreadsheet migration checklist

1. Do not rename existing columns. Add missing governance columns at the end.
2. Jobs: add `listing_type`, `is_verified`, `employer_authorized_at`, `verified_at`, `is_indexable`, and `last_reviewed_at`.
3. Mark at most three current display examples `listing_type=sample`; mark the fourth sample non-public or move it outside the sample set. Samples must not contain application destinations intended for use.
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
3. Confirm Community reports the authoritative generated count and `count === items.length`. `EXPECTED_APPROVED_COMMUNITY_POST_ID` is optional; configure it only when operations intentionally require one specific active record to be present.
4. Confirm the auto-commit contains all changed `assets/data/{community,jobs,eat,shopping,medical}` JSON files and that a timestamp-only run reports no changes.
5. Confirm the Pages job checks out `auto-commit-action.outputs.commit_hash`, validates every generated artifact, and deploys that commit.
6. Fetch each same-origin production JSON and compare declared count with `items.length`; then verify loading, populated, empty, filtered-empty, and error behavior in the three directory pages. Map controls must be disabled when no map-eligible items exist.

## Manual actions after merge

1. Deploy the existing Apps Script project as a **new version** through the existing Web App deployment. Keep the current deployment URL; do not create a replacement deployment.
2. Run **Sync public data** manually and confirm every response reports `api_version: 2026-07-13.1`.
3. Confirm generated counts are Community 6, Jobs 3, Eat 63, Shopping 45, and Medical 0 unless the authoritative Spreadsheet data has intentionally changed. Every artifact must also satisfy `count === items.length`.
4. Confirm GitHub Pages deployed the exact commit created by the generated-data sync, not the workflow's earlier trigger SHA.
5. Complete the Spreadsheet actions above without renaming columns: append the missing Jobs governance columns, remove the fourth row from the public sample set, review Eat placeholder categories, add Shopping display names only after review, and activate Medical rows only after official-source and review-date checks.
6. Replace the placeholder Impressum only after the owner supplies and verifies the real operator information. This is a blocking manual item; no person, organization, address, telephone number, register number, VAT ID, tax number, or other identifier may be inferred from repository content.

For the Impressum, the owner or qualified legal reviewer must determine applicability and supply:

- the operator's full legal name and serviceable street address; for a legal entity, also its legal form and authorized representative;
- an email address and the details needed for rapid, direct communication;
- when applicable, the competent supervisory authority, register name and registration number, professional chamber/title/member state/rules, and liquidation status;
- a VAT identification number under § 27a UStG or business identification number under § 139c AO only if one has actually been issued (never substitute an ordinary tax number); and
- when § 18(2) MStV applies to journalistic-editorial content, the responsible person's verified full name and address.

Primary references: [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html), [§ 27a UStG](https://www.gesetze-im-internet.de/ustg_1980/__27a.html), [§ 139c AO](https://www.gesetze-im-internet.de/ao_1977/__139c.html), and [§ 18 MStV](https://www.die-medienanstalten.de/fileadmin/user_upload/Rechtsgrundlagen/Gesetze_Staatsvertraege/Medienstaatsvertrag_MStV.pdf).

## Remaining risks and follow-up boundary

- The repository cannot deploy Apps Script or edit Spreadsheet governance fields. Until the manual GAS deployment occurs, scheduled sync intentionally fails with a version mismatch and retains the bootstrap JSON.
- Directory quality remains source-limited: 298 Eat rows need category review, 299 Shopping rows need names, and every Medical row needs explicit review and activation.
- The dynamic Jobs detail route stays noindex for every record in this PR. Job-specific initial HTML is explicitly incomplete and is not claimed as an acceptance result here.
- Community `/community/post/?id=...` still shares the posting-form HTML shell and remains noindex. A separate follow-up should split form/detail URLs and give the detail route record-specific canonical/description metadata without changing this data-pipeline rollout.

## Explicitly re-scoped: Jobs detail initial HTML

This PR does **not** satisfy job-specific initial HTML or metadata. The query route `/germany/ja/jobs/detail/?id=...` starts with the generic title, description, canonical `/germany/ja/jobs/detail/`, and `noindex, follow`; JavaScript then hydrates valid records or a safe invalid state. No pre-rendering or `JobPosting` is claimed in this PR.

A separate follow-up PR must generate a stable URL and initial HTML for every eligible public job, including sample records. Its acceptance boundary is: job title and summary in initial HTML; job-specific title, description, and canonical; sample `noindex` with no `JobPosting`; eligible real-job robots/indexation policy; sitemap entries only where indexation is allowed; invalid/expired URL behavior; and rollback by removing the generated job-detail artifacts without changing the public-data pipeline.
