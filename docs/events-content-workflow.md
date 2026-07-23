# Events Content Workflow

Events are managed as static article pages in this repository. The event hub may keep a small dynamic fallback section, but static Markdown plus registry metadata are the source of truth for featured and evergreen event content.

Do not use a Spreadsheet or GAS workflow as the primary Events source.

## Source and Public Files

- Registry: `/content/registry/events.json`
- Markdown source: `/content/events/{slug}.md`
- Generated public page: `/germany/ja/events/{slug}/index.html`
- Hub: `/germany/ja/events/index.html`

Generated public pages, hub cards, Home preview cards, sitemap entries, and search index entries are committed to the repo.

## Article Creation Steps

1. Create a Markdown file in `/content/events/` using `_template.md`.
2. Add a matching item to `/content/registry/events.json`.
3. Set `url` and `canonical_url` to `/germany/ja/events/{slug}/`.
4. Add `city`, `location`, the event date field, and `official_url`.
5. Keep drafts as `published: false` and `status: "draft"`.
6. Run `npm run build`.
7. Run `npm run validate:all`.
8. Open a GitHub PR with both source and generated files.

## Verification Rules

- Keep dates and official links verified.
- If dates vary by year, write that clearly instead of inventing exact dates.
- If no verified official URL is available, keep `official_url` empty and include a "公式情報の確認ポイント" section instead of a fake link.
- Confirm internal links resolve and the generated page uses shared J-Connect CSS.
- Do not manually edit generated article pages or generated card sections after running the build.

See `/docs/content-production-workflow.md` for the shared Living and Events workflow.
