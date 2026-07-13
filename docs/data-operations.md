# Data Operations

This repository publishes a static GitHub Pages site. Generated HTML and JSON are committed so production can deploy without a runtime build step.

## Source Of Truth

- Editorial articles: `content/living/*.md`, `content/events/*.md`, `content/learn-german/*.md`, plus the matching `content/registry/*.json` files.
- Generated article HTML, hub grids, Home article cards, `sitemap.xml`, and `assets/js/search-index.js`: output from `node scripts/build-content.mjs`.
- Shared Japanese header/footer, canonical social metadata, robots normalization, and registry page JSON-LD: output from `node scripts/apply-layout.mjs`.
- Jobs: source spreadsheet or GAS -> scheduled/manual sync -> sanitized `assets/data/jobs/jobs.json` -> Home/list/detail UI.
- Community: source spreadsheet or GAS -> scheduled/manual sync -> sanitized `assets/data/community/posts.json` -> Home/list/detail UI.
- Directory data for Eat, Shopping, and Medical: Contents GAS at runtime, with static seed/guidance cards in committed HTML.
- Editorial images: committed under `/assets/img/...` or `/assets/images/...`.
- User-submitted Community images: Drive thumbnail URLs only; do not move them into editorial image folders.

## Update Flow

1. Update the source content or data source.
2. Run `node scripts/build-content.mjs`.
3. Run `node scripts/apply-layout.mjs`.
4. Run validation:
   - `node scripts/validate-content.mjs`
   - `node scripts/validate-layout.mjs`
   - `node scripts/validate-static-site.mjs`
   - `node scripts/validate-production-parity.mjs`
5. Confirm `git diff` only contains intended source and generated output changes.
6. Commit both source changes and generated files.
7. Open a PR against `main`.
8. After merge, confirm GitHub Pages deployed the latest `main`.
9. Run the manual production parity check if production drift is suspected.

## Rules

- Do not hand-edit generated article pages unless the exception is documented in the PR.
- Do not add claims about an employer, legal details, operators, VAT IDs, or addresses that are not present in the source data.
- Do not add `JobPosting` schema until a listing source has complete employer and application data.
- Do not add `Event` schema for uncertain or recurring event-guide pages without a real ISO `startDate`.
- Keep generated static JSON as the only public display source for Jobs and Community. GAS remains available to sync, form submission, and private management workflows only.
- Configure the unified Apps Script source with `MASTER_SPREADSHEET_ID` as the recommended Script Property. `COMMUNITY_SPREADSHEET_ID` is supported only as a legacy fallback; the active spreadsheet is used only when both trimmed property values are empty.
- Jobs date display and sorting must use existing fields in this order: `last_modified_at`, `updated_at`, `published_at` / `posted_at`, then `created_at`. Do not copy `created_at` into `published_at`; keep the labels distinct in the UI.
- Static seed/guidance cards are not public listings. They explain how to evaluate a directory or listing while runtime data loads.
- GAS/runtime data may replace static guidance when available, but generated output and any static fallback changes must be committed before merge.
- Keep live production checks manual-only; normal PR validation must not depend on network availability.
- Treat live production parity as a post-merge check after the `Deploy GitHub Pages` workflow finishes for `main`.

## Jobs publication policy

The Jobs spreadsheet is the source of truth. A job is public when `status=active`. If `expires_at` is blank, the job remains public; if it is supplied, it must be a valid date that has not passed. All other statuses, including `inactive`, `draft`, `pending`, `hidden`, and `deleted`, are non-public.

The browser, sync, and validator never infer a job's status from its company name, title, description, email address, URL, or any other content. Spreadsheet content is displayed as entered. Private review fields `contact_name` and `contact_email` are never copied to public JSON. A public application email is optional and must be supplied through an explicitly public source header such as `application_email` or `public_email`; a source link is shown only for a valid HTTP(S) URL.

Use this final header order:

| Column | Requirement |
| --- | --- |
| `id` | Required; unique when present. |
| `status` | Required; use `active` to publish. |
| `priority` | Optional; lower values win date ties. |
| `company_name` | Required. |
| `position_title` | Required. |
| `employment_type` | Recommended. |
| `city` | Recommended. |
| `salary_min_eur` | Optional numeric value. |
| `salary_max_eur` | Optional numeric value. |
| `summary` | Recommended. |
| `job_details` | Recommended. |
| `requirements` | Recommended. |
| `contact_name` | Private review field; never public. |
| `contact_email` | Private review field; never public. |
| `application_email` | Optional explicitly public application email. |
| `visa_support` | Optional. |
| `updated_at` | Recommended when `published_at` is absent. |
| `published_at` | Recommended when `updated_at` is absent. |
| `expires_at` | Optional; a supplied date must be valid and unexpired to publish. |
| `source_url` | Optional public HTTP(S) source link. |

Run `node scripts/sync-public-data.mjs` followed by `node scripts/validate-jobs.mjs`, then review the generated `assets/data/jobs/jobs.json` before committing.
