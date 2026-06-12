# Content Production Workflow

Living and Events articles are managed from Markdown source files plus JSON registry files. The generated static HTML files are committed to the repository so GitHub Pages can serve them without a runtime build step.

## Canonical Sources

- Living registry: `/content/registry/living.json`
- Living Markdown: `/content/living/{slug}.md`
- Events registry: `/content/registry/events.json`
- Events Markdown: `/content/events/{slug}.md`

The registry is the canonical metadata source. Markdown front matter may provide fallback values, but if the registry and front matter disagree, the registry wins.

Events are static article pages. Do not make Spreadsheet or GAS the primary Events source in this workflow.

## Generated Files

Running the content build updates:

- `/germany/ja/living/{slug}/index.html`
- `/germany/ja/events/{slug}/index.html`
- `/germany/ja/living/index.html`
- `/germany/ja/events/index.html`
- `/germany/ja/index.html`
- `/assets/js/search-index.js`
- `/sitemap.xml`

The build script uses marker comments for hub and Home card sections. Do not manually edit generated cards between these markers:

- `CONTENT:living-grid`
- `CONTENT:events-grid`
- `CONTENT:home-living`
- `CONTENT:home-events`

## Adding a Living Article

1. Create `/content/living/{slug}.md` from `/content/living/_template.md`.
2. Add a matching item to `/content/registry/living.json`.
3. Set `url` and `canonical_url` to `/germany/ja/living/{slug}/`.
4. Set `markdown_path` to `/content/living/{slug}.md`.
5. Use `published: false` and `status: "draft"` until the article is ready.
6. Add `published_at`, `updated_at`, and `last_verified` before publishing.
7. Run the build and validation commands.

## Adding an Event Article

1. Create `/content/events/{slug}.md` from `/content/events/_template.md`.
2. Add a matching item to `/content/registry/events.json`.
3. Set `url` and `canonical_url` to `/germany/ja/events/{slug}/`.
4. Set `markdown_path` to `/content/events/{slug}.md`.
5. Add event fields such as `city`, `location`, `event_date`, and `official_url`.
6. If the exact date changes yearly, use cautious wording such as `年により異なる` and tell readers to check official information.
7. Run the build and validation commands.

## Home Visibility

Use `home_visible` and `home_order` in the registry:

- `home_visible: true` allows the article to be considered for Home preview cards.
- `home_order` sorts Home candidates ascending.
- The build then sorts by `home_order` ascending, then `published_at` descending.
- Home uses the existing number of preview cards for Living and Events.

Drafts and unpublished items are excluded from hubs, Home, sitemap, and search.

## Commands

This repo currently has no `package.json`, so run the scripts directly:

```bash
node scripts/build-content.mjs
node scripts/validate-content.mjs
```

Also run any broader static-site validation script that exists in the repo:

```bash
node scripts/validate-static-site.mjs
```

## Pull Request Checklist

1. Add or update Markdown and registry entries.
2. Run `node scripts/build-content.mjs`.
3. Run `node scripts/validate-content.mjs`.
4. Run broader static validation if available.
5. Review Home, Living hub, Events hub, one generated Living page, one generated Event page, sitemap, and search index.
6. Open a focused PR with the generated files committed.

After generation, do not manually edit generated article pages, generated hub cards, generated Home preview cards, sitemap entries, or generated search entries. Change the Markdown or registry and rebuild instead.
