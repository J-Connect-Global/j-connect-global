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
