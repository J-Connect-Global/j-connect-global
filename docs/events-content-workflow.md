# Events Content Workflow

Events are managed as static article pages in this repository. The event hub may keep a small dynamic fallback section, but static article pages are the source of truth for featured and evergreen event content.

## Source and Public Files

- Add Markdown source in `/content/events/{slug}.md`.
- Add the public HTML page in `/germany/ja/events/{slug}/index.html`.
- Add the card to `/germany/ja/events/index.html`.
- Add a Home link only when the event article is featured or useful as a latest preview.
- Update `sitemap.xml` and `assets/js/search-index.js`.

## Verification Rules

- Keep dates and official links verified.
- If dates vary by year, write that clearly instead of inventing exact dates.
- If no verified official URL is available, use a "公式情報の確認ポイント" section instead of a fake link.
- Confirm internal links resolve and the page uses shared J-Connect CSS.

## Current Policy

Do not use a Spreadsheet or GAS workflow as the Events source of truth for now. Static Markdown plus static HTML pages are the preferred workflow for Events content in this phase.
