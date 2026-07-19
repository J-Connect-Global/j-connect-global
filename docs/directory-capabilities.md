# Directory capability policy

Eat and Shopping expose only controls that the committed, same-origin public JSON can support. The browser calculates the capability set on every load, so a future published snapshot enables a control automatically when it crosses the documented boundary. It never depends on a hard-coded list of cities, categories, or ratings.

## Thresholds

| Capability | Rule |
| --- | --- |
| Rating, review-count, price-tier filters | At least 5 populated public values **and** at least 60% item coverage. A price filter also needs at least 2 distinct non-empty tiers. A public `0` review count is a populated value. |
| Map view | At least 5 valid latitude/longitude pairs **and** at least 60% item coverage. The map renders only those verified pairs from the sanitized JSON. It does not geocode an address or derive coordinates from a map URL. When enabled with incomplete coverage, the page discloses the rendered/total count next to the map. |
| Region, category, detailed-category filters | At least 2 distinct meaningful values in the committed JSON. Empty, unknown, test, and `other`/unclassified placeholder categories are excluded. |
| Detail modal | A specific listing must contain a public phone number, opening hours, or language-support value that is shown in the dialog. A description, tags, category, address marker, price, rating, link, or detail comment already shown on the card does not justify a duplicate modal. |

The shared calculation lives in [`assets/js/directory-capabilities.js`](../assets/js/directory-capabilities.js). It is used by both pages and the quality report, avoiding a mismatch between what CI reports and what visitors can use.

## Current committed snapshot

| Dataset | Items | Rating | Reviews | Price | Coordinates | Description | Phone | Hours | Enabled controls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Eat | 63 | 4/63 (6.3%) | 63/63 (100%) | 52/63 (82.5%) | 30/63 (47.6%) | 0/63 (0%) | 0/63 (0%) | 0/63 (0%) | review-count, price-tier, detailed-category |
| Shopping | 45 | 4/45 (8.9%) | 45/45 (100%) | 0/45 (0%) | 8/45 (17.8%) | 0/45 (0%) | 0/45 (0%) | 0/45 (0%) | review-count, category, detailed-category |

Both current datasets contain only `Düsseldorf` as their meaningful region, so a region selector is intentionally absent. Shopping’s H1, metadata, and result summary state that scope rather than implying Germany-wide coverage.

## Verification and reporting

`node scripts/report-public-data-quality.mjs --check-baseline --github-summary` adds a **Directory feature coverage** table to the GitHub Actions Summary. It reports populated/total coverage, enabled controls, and withheld controls for Eat, Shopping, and Medical.

`node scripts/test-directory-capabilities.mjs` verifies the 5-value and 60% boundaries, zero review counts, price-tier diversity, coordinate validation, taxonomy placeholders, and current snapshot capabilities. The browser smoke suite also supplies a threshold-boundary fixture to confirm the actual Eat UI reveals the controls, map disclosure, and meaningful-detail modal only when the policy permits them.
