# Content Production Workflow

Living, Events, and Learn German articles are managed from Markdown source files plus JSON registry files. The generated static HTML files are committed to the repository so GitHub Pages can serve them without a runtime build step.

## Canonical Sources

- Static JA page registry: `/content/registry/pages.json`
- Living registry: `/content/registry/living.json`
- Living Markdown: `/content/living/{slug}.md`
- Events registry: `/content/registry/events.json`
- Events Markdown: `/content/events/{slug}.md`
- Learn German registry: `/content/registry/learn-german.json`
- Learn German Markdown: `/content/learn-german/{slug}.md`

Markdown front matter is canonical for editorial metadata: titles, summaries, publication and verification dates, tags, article-specific metadata, images, related articles, and `official_sources`. `node scripts/sync-content-frontmatter.mjs --write` copies those values into the registries; the build also gives these front-matter fields precedence.

The registries remain canonical for routing and operational controls that do not belong in article prose: `url`, `markdown_path`, Home order and visibility, hub/search/sitemap visibility, `disclaimer_type`, and reviewer identity/status. The sync maps front matter `last_verified` and `next_review` to `review.last_reviewed_at` and `review.next_review_due`. Do not maintain `official_sources` in both places; author them in Markdown.

Events remain static article pages. Do not make Spreadsheet or GAS the primary Events source in this workflow.

## Generated Files

Running the content build and layout application updates:

- `/germany/ja/living/{slug}/index.html`
- `/germany/ja/events/{slug}/index.html`
- `/germany/ja/learn-german/{slug}/index.html`
- `/germany/ja/living/index.html`
- `/germany/ja/events/index.html`
- `/germany/ja/learn-german/index.html`
- `/germany/ja/index.html`
- `/assets/js/search-index.js`
- `/sitemap.xml`

Search and sitemap are governed by the static page registry plus the Living, Events, and Learn German article registries. Retired routes such as `/germany/ja/guides/` must stay out of search, sitemap, and emitted internal links.

### Sitemap ownership

`scripts/build-content.mjs` owns the committed source `/sitemap.xml`: static JA registry pages and published editorial articles, including their registry-derived `lastmod` values. Do not add mutable Jobs or Community detail URLs to that source file by hand.

`scripts/build-pages-artifact.mjs` copies the source sitemap and then calls `scripts/generate-public-details.mjs`. That artifact-only pass preserves every static sitemap entry and its `lastmod`, removes generated Community and stale Jobs detail entries, and appends only canonical `index, follow` Jobs detail pages. Jobs `lastmod` uses this exact priority: `last_modified_at`, `updated_at`, `published_at`, `posted_at`, then `created_at`. Community details, noindex forms and management pages, inactive or expired Jobs, legacy routes, and stale sample pages remain out of the artifact sitemap.

The production SEO validator requires every canonical Japanese `index, follow` artifact page to be present in the sitemap unless it appears in the narrow documented exclusion map in `scripts/validate-production-seo.mjs`. Keep that map empty unless there is a reviewed, specific reason for an exception.

Generated article pages include:

- Shared J-Connect header/footer and CSS from `/templates/layout/ja-header.html` and `/templates/layout/ja-footer.html`.
- Title, meta description, canonical URL, and Open Graph tags.
- Article JSON-LD.
- BreadcrumbList JSON-LD.
- Category, tags, published date, verification date, and review metadata.
- A registry-driven disclaimer.
- Related article links and official source links where available.

The build script uses marker comments for hub and Home card sections. Do not manually edit generated cards between these markers:

- `CONTENT:living-grid`
- `CONTENT:events-grid`
- `CONTENT:learn-german-grid`
- `CONTENT:home-living`
- `CONTENT:home-events`
- `CONTENT:home-learn-german`

The layout script uses marker comments for canonical header/footer sections. Do not manually edit layout blocks between these markers:

- `LAYOUT:ja-header`
- `LAYOUT:ja-footer`

Home keeps its special portal header/footer variant, but those blocks are still marker-wrapped and validated against the same five-pillar navigation model.

## Registry Fields

All three article registries use the shared fields below:

- `id`
- `title`
- `slug`
- `category`
- `summary`
- `url`
- `markdown_path`
- `published`
- `status`
- `published_at`
- `updated_at`
- `last_verified`
- `tags`
- `home_visible`
- `home_order`
- `hub_visible`
- `search_visible`
- `sitemap_visible`
- `canonical_url`
- `official_sources`
- `disclaimer_type`
- `related_articles`
- `review`

Events also use `city`, `location`, the event date field, and `official_url`.

Learn German also uses `level` and `situation`. Optional Home presentation fields such as `home_image_class` and `home_phrase` may be used for the Home Learn German preview.

The `review` object should include:

- `status`
- `reviewed_by`
- `last_reviewed_at`
- `next_review_due`

Drafts and unpublished items are excluded from hubs, Home, sitemap, and search.

## Adding a Living Article

1. Create `/content/living/{slug}.md` from `/content/living/_template.md`.
2. Add a matching item to `/content/registry/living.json`.
3. Set `url` and `canonical_url` to `/germany/ja/living/{slug}/`.
4. Set `markdown_path` to `/content/living/{slug}.md`.
5. Use `published: false` and `status: "draft"` until the article is ready.
6. Add `official_sources`, `disclaimer_type`, `related_articles`, and `review`.
7. Add `published_at`, `updated_at`, and `last_verified` before publishing.
8. Run the build and validation commands.

## Adding an Event Article

1. Create `/content/events/{slug}.md` from `/content/events/_template.md`.
2. Add a matching item to `/content/registry/events.json`.
3. Set `url` and `canonical_url` to `/germany/ja/events/{slug}/`.
4. Set `markdown_path` to `/content/events/{slug}.md`.
5. Add event fields such as `city`, `location`, the event date field, and `official_url`.
6. If the exact date changes yearly, use cautious wording such as `年により異なる` and tell readers to check official information.
7. Add `official_sources`, `disclaimer_type`, `related_articles`, and `review`.
8. Run the build and validation commands.

## Adding a Learn German Article

1. Create `/content/learn-german/{slug}.md`.
2. Add a matching item to `/content/registry/learn-german.json`.
3. Set `url` and `canonical_url` to `/germany/ja/learn-german/{slug}/`.
4. Set `markdown_path` to `/content/learn-german/{slug}.md`.
5. Add `level` and `situation`.
6. Add `official_sources`, `disclaimer_type`, `related_articles`, and `review`.
7. Use `published: false` and `status: "draft"` until the article is ready.
8. Run the build and validation commands.

Optional hub card images can be added to Living, Events, and Learn German registry items with:

- `image_url`: local or site-relative card image path.
- `image_alt`: short alt text for the card image.

## Home Visibility

Use `home_visible` and `home_order` in the registry:

- `home_visible: true` allows the article to be considered for Home preview cards.
- `home_order` sorts Home candidates ascending.
- The build then sorts by `home_order` ascending, then `published_at` descending.
- Home uses the current compact preview layout for Living, Events, and Learn German.

## Adding A Static JA Page

1. Create `/germany/ja/{slug}/index.html`.
2. Add a matching item to `/content/registry/pages.json`.
3. Choose the page `type`, conceptual `pillar`, `layout`, and `hero_type`.
4. Set `search_visible` and `sitemap_visible` deliberately.
5. For Eat, Shopping, and Medical style directories, keep the top-level URL and use `type: "directory"` with `pillar: "living"`.
6. Run the build, layout, and validation commands.

Do not reintroduce `/germany/ja/guides/` as a current pillar or live internal link. Use `/germany/ja/living/` instead.

## Commands

Use the documented package scripts so local and CI validation stay aligned:

```bash
npm run build
npm run validate
npm run validate:all
```

`validate` runs the deterministic repository checks. `validate:all` also runs the Playwright browser suite. CI runs the same contract through `.github/workflows/validate-content.yml` and fails if generated files are not committed.

## Pull Request Checklist

1. Add or update Markdown and registry entries.
2. Run `npm run build`.
3. Run `npm run validate`.
4. Run `npm run validate:all` before opening the PR.
5. Review Home, the relevant hub, one generated article page, sitemap, and search index.
6. Open a focused PR with source and generated files committed.

After generation, do not manually edit generated article pages, generated hub cards, generated Home preview cards, sitemap entries, or generated search entries. Change the Markdown or registry and rebuild instead.
