# Codex prompt: Tourism guides batch 1

## Recommended run settings

- Model: `gpt-5.6-sol`
- Reasoning: `Ultra`
- Start from the latest `origin/main`
- Target: one focused PR for the ten thin tourism articles listed below

## Prompt

You are upgrading the first batch of J-Connect Germany tourism guides. Work directly in the latest `J-Connect-Global/j-connect-global` repository. Inspect the repository and its instructions before editing. Do not rely on old chat assumptions or manually edit generated HTML as source.

### Goal

Turn ten currently short, safe, generic tourism pages into distinctive, current, decision-oriented Japanese guides that can win search traffic and actually help Japanese residents in Germany plan a weekend. Improve depth without padding or repeating a template. Keep existing slugs and canonical URLs.

This is not a request to add generic tourist facts. The rewritten pages must answer real decisions: whether the destination suits the reader, how to divide 24–36 hours, which districts should not be combined, when to walk versus use transit, what needs booking, where plans commonly fail, and how to adjust for rain, pregnancy, children, reduced mobility, or a delayed arrival.

### Exact article scope

1. `content/living/bremen-weekend-trip.md`
2. `content/living/brussels-weekend-trip.md`
3. `content/living/copenhagen-weekend-trip.md`
4. `content/living/hamburg-weekend-trip.md`
5. `content/living/krakow-weekend-trip.md`
6. `content/living/london-weekend-trip.md`
7. `content/living/munich-weekend-trip.md`
8. `content/living/paris-weekend-trip.md`
9. `content/living/prague-weekend-trip.md`
10. `content/living/warsaw-weekend-trip.md`

Do not rewrite the other ten tourism articles in this PR. Do not change Jobs, Community, directories, GAS, legal pages, or unrelated UI.

### Grounding and freshness

Research every destination again at execution time. Prefer current primary sources only:

- official city or regional tourism office;
- official local public-transport operator;
- official attraction pages for any quoted booking rule, closure, price, accessibility feature, or opening time;
- official government source for entry requirements, especially the UK;
- official rail or airport source when arrival advice depends on it.

Open the supporting pages, do not cite search-result snippets. Use no exact price, schedule, closure, ticket condition, or entry requirement unless it is verified on a current official page. If an official page is internally inconsistent, state the uncertainty instead of resolving it by guesswork.

Add or refresh `official_sources`, set `updated_at` and `last_verified` to the execution date, and set a sensible `next_review` no more than 90 days later. Preserve `published_at`.

Minimum source mix per article:

- official tourism office;
- official transit operator;
- at least two official attraction or district sources relevant to the route;
- official entry/airport/rail source where applicable.

### Editorial requirements

Each article should normally contain roughly 4,000–7,000 useful Japanese characters, excluding frontmatter and source URLs. This is a quality target, not permission to pad.

Every article must include, using destination-specific wording and structure:

1. A strong search title and summary matching the actual article.
2. A concise first-screen verdict: who should choose this destination and who should choose somewhere else.
3. A practical 24–36 hour route with realistic arrival, luggage, meal, booking, and departure buffers.
4. A route table showing time block, area, purpose, walking/transit choice, and the fallback if delayed.
5. A destination-specific district or attraction comparison. Explain trade-offs, not just descriptions.
6. Current transport/payment guidance and the single most likely ticket or validation mistake.
7. A booking-priority table: reserve now / check shortly before / decide on the day.
8. A cost-planning section. Use ranges only when officially supportable and label variable costs clearly.
9. Specific adjustments for children, pregnancy, reduced mobility, rain, winter, or extreme heat. Avoid generic “take breaks” advice; identify slopes, cobblestones, long transfers, exposed waterfronts, or station-access issues that matter for this destination.
10. At least five concrete “common mistakes” or failure modes.
11. A compact departure checklist.
12. Official source links close to the facts they support, plus the generated official-source section.

Avoid:

- the same introduction, table headings, paragraph rhythm, or advice copied across cities;
- vague praise such as “beautiful city,” “many attractions,” or “check the latest information” without saying where and why;
- itineraries that cross the city repeatedly;
- unverified restaurant recommendations;
- declaring accessibility from map distance alone;
- presenting AI imagery as a real photograph;
- changing facts only to make an article sound more certain.

Run the repository travel-duplication check and manually inspect repeated prose. No paragraph-length boilerplate should appear across the ten articles.

### Editorial images already prepared

Use the assets and exact placement guidance in:

`docs/tourism-editorial-image-manifest.md`

Keep each existing hero image. Add the new image once inside the relevant article near the section named in the manifest. Use the manifest alt text. Every figure caption must end with:

`AI生成の編集イメージ。実際の現地写真ではありません。`

Do not call these images photos and do not use them as evidence for an accessibility, architecture, transport, or route claim.

Each master image is 1440 x 810 and has `-768w.webp` and `-480w.webp` siblings. Improve `scripts/build-content.mjs` so local inline WebP assets with these sibling variants automatically render responsive markup with intrinsic width and height. Do this generically; do not hard-code ten new entries in `INLINE_IMAGE_VARIANTS`.

The responsive renderer should:

- preserve current explicitly configured inline variants;
- detect tracked local `/assets/images/.../*.webp` masters;
- use existing `-480w.webp` and `-768w.webp` siblings when present;
- emit width/height to reduce CLS;
- emit an appropriate `srcset` and `sizes` or equivalent `<picture>` sources;
- leave SVG and external images unchanged;
- escape src and alt correctly;
- avoid filesystem access outside the repository.

Add regression coverage for the generic inline-image behavior and for a tourism article containing the new asset.

### Repository workflow

1. Confirm the starting branch is current with `origin/main` and the worktree contains only this batch’s prepared assets and docs.
2. Read `docs/living-content-workflow.md`, `docs/content-production-workflow.md`, and `docs/tourism-editorial-image-manifest.md`.
3. Research and rewrite the ten Markdown sources.
4. Synchronize Markdown metadata to the registry using the repository’s existing workflow.
5. Rebuild generated article pages, Living hub output, Home/search data, and sitemap through the existing scripts.
6. Never hand-edit generated article HTML as source.
7. Inspect desktop and mobile output for at least London, Prague, and Hamburg.
8. Confirm the desktop table of contents remains in the right sidebar and the mobile table of contents remains collapsed in the article column.

### Required validation

Run every relevant existing check, including at minimum:

```bash
node scripts/sync-content-frontmatter.mjs --write
node scripts/build-content.mjs
node scripts/apply-layout.mjs
node scripts/test-content-metadata.mjs
node scripts/validate-content.mjs
node scripts/check-travel-guide-duplication.mjs
node scripts/report-content-freshness.mjs
node scripts/test-public-data-pipeline.mjs
node scripts/validate-layout.mjs
node scripts/validate-static-site.mjs
node scripts/validate-production-parity.mjs
node scripts/image-asset-budget.mjs --check
node scripts/build-pages-artifact.mjs --site-dir _site
node scripts/test-production-seo.mjs
node scripts/validate-production-seo.mjs --site-dir _site
```

Also run browser tests if Chromium is available. If it is unavailable, report that as an environment limitation and provide static evidence for responsive image output and TOC placement.

### Acceptance criteria

- Ten articles are materially deeper and destination-specific, not ten variations of one template.
- Every changeable fact is grounded in a current official source.
- Each article contains exactly one new, clearly disclosed editorial image plus the existing hero.
- Mobile does not download the 1440-pixel inline master unnecessarily.
- Image alt text describes the visual; captions disclose AI generation.
- Existing canonical URLs and slugs remain unchanged.
- Generated registries/pages/search/sitemap are synchronized.
- No unrelated product or data-pipeline behavior changes.
- All available validation passes.

Create one focused PR titled approximately:

`Upgrade ten weekend travel guides with current research and editorial visuals`

In the PR description, list the ten articles, current sources checked, visual/disclosure approach, responsive-image implementation, validation results, and any source uncertainty that remains.
