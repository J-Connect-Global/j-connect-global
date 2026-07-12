# Data Operations

This repository publishes a static GitHub Pages site. Generated HTML and JSON are committed so production can deploy without a runtime build step.

## Source Of Truth

- Editorial articles: `content/living/*.md`, `content/events/*.md`, `content/learn-german/*.md`, plus the matching `content/registry/*.json` files.
- Generated article HTML, hub grids, Home article cards, `sitemap.xml`, and `assets/js/search-index.js`: output from `node scripts/build-content.mjs`.
- Shared Japanese header/footer, canonical social metadata, robots normalization, and registry page JSON-LD: output from `node scripts/apply-layout.mjs`.
- Jobs: source spreadsheet or GAS -> `assets/data/jobs/jobs.json` static cache -> UI, with GAS as runtime fallback.
- Community: source spreadsheet or GAS -> `assets/data/community/posts.json` static cache -> UI, with GAS as runtime fallback.
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
- Do not publish sample-looking jobs, legal details, operators, VAT IDs, or addresses as verified facts.
- Do not add `JobPosting` schema until a listing source has complete, verified employer and application data.
- Do not add `Event` schema for uncertain or recurring event-guide pages without a real ISO `startDate`.
- Keep static JSON first and GAS fallback second for Jobs and Community.
- Jobs date display and sorting must use existing fields in this order: `last_modified_at`, `updated_at`, `published_at` / `posted_at`, then `created_at`. Do not copy `created_at` into `published_at`; keep the labels distinct in the UI.
- Static seed/guidance cards are not verified listings. They explain how to evaluate a directory or listing while runtime data loads.
- GAS/runtime data may replace static guidance when available, but generated output and any static fallback changes must be committed before merge.
- Keep live production checks manual-only; normal PR validation must not depend on network availability.
- Treat live production parity as a post-merge check after the `Deploy GitHub Pages` workflow finishes for `main`.

## Jobs publication policy

The Jobs spreadsheet is the source of truth. Its public jobs sheet must preserve these column names exactly (empty values are allowed only where noted):

| Column | Required for | Rule |
| --- | --- | --- |
| `status` | all listings | Use `active` only for a listing that may be shown. |
| `listing_type` | all listings | `real` or `sample`. Do not rely on a missing value to mean sample. |
| `is_verified` | all listings | Boolean. A real public listing must be `true`; a sample must be `false`. |
| `sample_label` | samples | Use `掲載見本`. Leave empty for real listings. |
| `employer_authorized_at` | real listings | ISO date/time recording the employer's publication authorization. |
| `verified_at` | real listings | ISO date/time recording J-Connect's verification. |
| `expires_at` | real listings | Valid, future ISO date/time. Expired or invalid dates remove the listing from public display. |
| `public_apply_enabled` | all listings | Boolean. Set `true` only after a real listing is verified; samples must be `false`. |
| `source_url` | real listings | Optional public source URL. It must be blank for samples. |

The standard job content columns remain supported (`company_name`, `position_title`, `location`, `employment_type`, descriptions, application fields, and so on). A sample must use an explicitly fictional company such as `サンプル企業A（架空）`, must not contain any real-looking company, domain, email address, contact person, application URL, company URL, or source URL, and must use this exact notice on its card and detail page:

> この求人は画面・掲載形式の確認用に作成した架空データです。実在する募集ではなく、応募できません。

At most three active samples may exist. They are shown only in the separate `掲載イメージ` section and are excluded from live-job counts, structured data, and the sitemap.

### Converting an employer submission to a real listing

1. Keep the submission non-public while the employer, contact method, role, and expiry are checked.
2. Record the employer's consent in `employer_authorized_at` using an ISO date/time.
3. Complete the review, set `is_verified` to `true`, and record `verified_at` using an ISO date/time.
4. Set `listing_type` to `real`, `status` to `active`, a future `expires_at`, and `public_apply_enabled` to `true` only if the public application route is approved.
5. Run `node scripts/sync-public-data.mjs` followed by `node scripts/validate-jobs.mjs`. The sync intentionally omits real listings that do not meet every publication condition.
6. Review the generated `assets/data/jobs/jobs.json` before committing. Do not convert a sample by merely changing its status or adding a contact field; replace all fictional sample content with the employer-authorized data.
