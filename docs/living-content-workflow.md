# Living Content Workflow

Living articles are managed through Markdown source files and the Living registry. The registry is the canonical metadata source; Markdown front matter can provide fallback data, but the registry wins when values differ.

## Source and Public Files

- Registry: `/content/registry/living.json`
- Markdown source: `/content/living/{slug}.md`
- Generated public page: `/germany/ja/living/{slug}/index.html`
- Hub: `/germany/ja/living/index.html`

Generated public pages, hub cards, Home preview cards, sitemap entries, and search index entries are committed to the repo.

## Article Creation Steps

1. Create a Markdown file in `/content/living/` using `_template.md`.
2. Add a matching item to `/content/registry/living.json`.
3. Set `url` and `canonical_url` to `/germany/ja/living/{slug}/`.
4. Keep drafts as `published: false` and `status: "draft"`.
5. Set `published_at`, `updated_at`, and `last_verified` before publishing.
6. Run `node scripts/build-content.mjs`.
7. Run `node scripts/validate-content.mjs`.
8. Open a GitHub PR with both source and generated files.

## Metadata Rules

- IDs must be unique.
- Slugs must be unique within Living.
- Published items need `title`, `summary`, `published_at`, `updated_at`, `last_verified`, `markdown_path`, and `canonical_url`.
- `home_visible` and `home_order` control Home preview eligibility and ordering.
- `hub_visible`, `search_visible`, and `sitemap_visible` control generated hub/search/sitemap output.

## Verification Rules

- Keep Japanese text intact and UTF-8 encoded.
- Do not add fake certainty for legal, tax, medical, insurance, or administrative topics.
- Include official source links in the article when verified sources are available.
- Use the generated disclaimer and still encourage readers to check official or specialist sources.
- Do not manually edit generated article pages or generated card sections after running the build.

See `/docs/content-production-workflow.md` for the shared Living and Events workflow.
