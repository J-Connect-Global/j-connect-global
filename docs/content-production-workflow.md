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

The registry is the canonical metadata source. Markdown front matter may provide fallback values, but if the registry and front matter disagree, the registry wins.

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

Search and sitemap are governed by the static page registry plus the Living, Events, and Learn German article registries. Legacy pages such as `/germany/ja/guides/` stay out of search and sitemap unless a registry flag is deliberately changed.

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

Events also use `city`, `location`, `event_date`, and `official_url`.

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
5. Add event fields such as `city`, `location`, `event_date`, and `official_url`.
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

Do not reintroduce `/germany/ja/guides/` as a current pillar. It is a legacy route that points users to `/germany/ja/living/`.

## Commands

This repo currently has no `package.json`, so run the scripts directly:

```bash
node scripts/build-content.mjs
node scripts/apply-layout.mjs
node scripts/validate-content.mjs
node scripts/validate-layout.mjs
node scripts/validate-static-site.mjs
```

CI also runs these checks through `.github/workflows/validate-content.yml`. The CI build fails if generated files are not committed.

## Pull Request Checklist

1. Add or update Markdown and registry entries.
2. Run `node scripts/build-content.mjs`.
3. Run `node scripts/apply-layout.mjs`.
4. Run `node scripts/validate-content.mjs`.
5. Run `node scripts/validate-layout.mjs`.
6. Run `node scripts/validate-static-site.mjs`.
7. Review Home, the relevant hub, one generated article page, sitemap, and search index.
8. Open a focused PR with source and generated files committed.

After generation, do not manually edit generated article pages, generated hub cards, generated Home preview cards, sitemap entries, or generated search entries. Change the Markdown or registry and rebuild instead.
