# Continuous improvement log — 2026-07-22

Base: `origin/main@8b06f27cf525095fcc7c90e824d419a81ff2b3b8`

Scope: the Japanese Germany site, with the Bremen weekend guide as the first editorial priority. This log records only work verified against the current repository and production site.

## Completed

- Confirmed that the production Bremen page matches the generated HTML on the base commit after newline normalization.
- Confirmed production returns HTTP 200 for the Bremen page, lists it in the sitemap, exposes canonical/hreflang/Open Graph/Article/Breadcrumb metadata, and returns HTTP 404 for an unknown route.
- Ran the initial content, tourism, duplication, freshness, layout, and static-site checks.
- Restored deterministic Home generation and removed the committed dependency that caused current-main validation run `29702810982` to fail.
- Replaced Bremen's unverified illustrated WebP map with generated desktop/mobile SVG route diagrams. The data records verified OpenStreetMap coordinates, source, orientation, and verification date; generation rejects coordinate/cardinal contradictions.
- Expanded the Bremen guide with Düsseldorf/NRW day-trip versus overnight criteria, car and environmental-zone guidance, place-specific sections, accessibility constraints, and a concrete Kunsthalle/Übersee-Museum rain plan.
- Replaced four public tourism placeholders with registry-generated hubs: area (20 guides), weekend/day trip (15), family (3), and relax/nature (2). All four are now indexable, searchable, and in the sitemap.
- Removed render-blocking Google Fonts from all 68 generated article pages and the four new travel hubs. The visual result was checked in desktop and mobile layouts.
- Corrected the Cologne Cathedral ticket link so general interior visits no longer point only to the tower-climb product.
- Added an exact-SHA Pages deployment after scheduled news updates, pinned the write-capable auto-commit action, added a stale-main guard, and made Pages reject uncommitted generated output.
- Updated Actions runtime declarations from Node.js 20 to Node.js 24 after the full local suite passed on Node.js 24.16.0.

## Verification results

- `test-content-metadata.mjs`: pass
- `validate-content.mjs`: pass (68 published articles)
- `test-tourism-usability.mjs`: pass (20 articles / 40 SVGs / 4 populated hubs)
- `check-travel-guide-duplication.mjs`: pass (0 duplicated paragraphs)
- `report-content-freshness.mjs`: pass (0 overdue reviews)
- `validate-layout.mjs`: pass (107 JA pages / 40 registry routes)
- `validate-static-site.mjs`: pass (115 HTML files)
- Pages artifact SEO/accessibility regression: pass (122 generated HTML / 94 sitemap URLs)
- Playwright desktop/mobile/tablet suite: pass (48/48)
- In-app visual checks: Bremen desktop/mobile route diagram and weekend hub desktop/mobile, with no horizontal overflow

## Next priorities

1. Fix the news learner's source-language mismatch: the configured DW Germany feed is English while the UI labels it German learning material.
2. Add response status, timeout, language, minimum-item, URL-scheme, and atomic-write guards to the news fetcher.
3. Align `docs/living-content-workflow.md` with actual frontmatter/registry precedence and remove official-source dual management.
4. Improve cookie-consent keyboard/focus semantics without changing consent defaults or legal copy.
5. Replace the article TOC scroll scan with IntersectionObserver-driven state to reduce forced reflow.
6. Add an accessible affordance for mobile horizontal-scroll tables, then evaluate card rendering for the itinerary table.
7. Add a production deployment-SHA manifest so live parity checks detect a stale Pages deployment directly.
8. Correct low-coverage source spreadsheet fields for Eat, Shopping, and Medical before enabling withheld UI capabilities.
9. Consolidate the full validation contract behind a documented package script.
10. Remove only re-verified unreferenced legacy CSS/images in a separate cleanup change.
