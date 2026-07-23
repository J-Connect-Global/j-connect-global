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

The first nine priorities were completed on 2026-07-23:

1. The German-learning news panel now consumes and verifies DW's German feed.
2. The news fetcher now checks HTTP status, timeout, language, minimum item count, HTTPS URLs, and atomic writes.
3. Living documentation, front matter synchronization, registry precedence, and official-source handling now share one contract.
4. Cookie consent now has explicit dialog semantics, focus entry/return, visible focus, and safe Escape behavior.
5. Article TOC state is driven by `IntersectionObserver` without a scroll-time geometry scan.
6. Responsive tables expose visible mobile instructions and a keyboard-focusable labeled region.
7. Pages artifacts publish a commit-SHA manifest, and deployment/live parity checks compare it directly.
8. Eat and Shopping rating data plus Medical status and official-source fields were corrected in the source spreadsheet and regenerated.
9. `npm run build`, `npm run validate`, `npm run validate:all`, and `npm run validate:production` are the documented validation entry points.

Priority 10 remains intentionally separate: remove only re-verified unreferenced legacy CSS/images in an isolated cleanup PR.
