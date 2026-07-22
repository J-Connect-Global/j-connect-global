# Continuous improvement log — 2026-07-22

Base: `origin/main@8b06f27cf525095fcc7c90e824d419a81ff2b3b8`

Scope: the Japanese Germany site, with the Bremen weekend guide as the first editorial priority. This log records only work verified against the current repository and production site.

## Completed

- Confirmed that the production Bremen page matches the generated HTML on the base commit after newline normalization.
- Confirmed production returns HTTP 200 for the Bremen page, lists it in the sitemap, exposes canonical/hreflang/Open Graph/Article/Breadcrumb metadata, and returns HTTP 404 for an unknown route.
- Ran the initial content, tourism, duplication, freshness, layout, and static-site checks.
- Identified an existing main-branch CI regression: the committed Home head differs from generator output and reintroduces a render-blocking Google Fonts request prohibited by the Home quality gate.

## Verification results

- `test-content-metadata.mjs`: pass
- `validate-content.mjs`: pass (68 published articles)
- `test-tourism-usability.mjs`: pass (20 articles)
- `check-travel-guide-duplication.mjs`: pass (0 duplicated paragraphs)
- `report-content-freshness.mjs`: pass (0 overdue reviews)
- `validate-layout.mjs`: pass (107 JA pages / 40 registry routes)
- `validate-static-site.mjs`: fail on the pre-existing Home Google Fonts dependency
- GitHub Actions `Validate content`: failing on current main since run `29702810982`

## In progress

1. Restore deterministic Home generation and a green CI baseline.
2. Replace Bremen's unverified illustrated raster map with the repository's data-driven responsive route SVG.
3. Deepen the second half of the Bremen guide with place-specific decisions and current official sources.

## Next priorities

1. Complete and validate the Bremen editorial/map pass.
2. Integrate the technical, content, and build audit findings by impact.
3. Re-run the complete repository and browser validation suite.
4. Review the diff for generated-file noise, metadata regressions, link errors, and factual overclaiming.
5. Push logical checkpoints and keep the draft PR current.
