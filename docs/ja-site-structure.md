# JA Site Structure Governance

This document defines the structural rules for the Japanese J-Connect Global site. It covers routes, page types, layout markers, legacy handling, and the workflow for adding new routes without breaking search, sitemap, or navigation.

## Conceptual IA

The Japanese site is organized around:

- Home: `/germany/ja/`
- Community: `/germany/ja/community/`
- Living: `/germany/ja/living/`
- Jobs: `/germany/ja/jobs/`
- Events: `/germany/ja/events/`
- Learn German: `/germany/ja/learn-german/`

Directory/function pages remain top-level URLs:

- Eat: `/germany/ja/eat/`
- Shopping: `/germany/ja/shopping/`
- Medical: `/germany/ja/medical/`

These directory pages belong conceptually to Living, but they are not normal Living articles. They should stay at their current short URLs and be registered as `type: "directory"` and `pillar: "living"`.

## Route Registry

`/content/registry/pages.json` is the canonical registry for non-article Japanese pages and top-level site routes. It governs search and sitemap visibility together with the article registries:

- `/content/registry/living.json`
- `/content/registry/events.json`
- `/content/registry/learn-german.json`

Every important static Japanese page should have a `pages.json` entry with:

- stable `id`
- public `url`
- `type`
- conceptual `pillar`
- `status`
- `canonical_url`
- `nav_visible`, `footer_visible`, `search_visible`, `sitemap_visible`
- `legacy`
- `redirect_target`
- `layout`
- `hero_type`
- `description`
- `tags`

When adding a new non-article top-level page, add it to `pages.json` first, then run the build, layout, and validation commands.

## Page Types

Home:

- Special Home hero and portal-style curated sections.
- Home keeps its existing `portal3` header/footer variant, but the blocks are wrapped in layout markers and must expose the same five-pillar navigation model.

Hub page:

- Compact white/blue page hero.
- Title, description, optional CTA.
- Grid or list of cards.

Article/detail page:

- Detail header with title, category, tags, published/updated/last_verified fields.
- Article body.
- Official sources, disclaimer, related articles, and back link where available.

Directory/listing page:

- Compact page hero.
- Filters/search controls.
- Result cards and fallback states.

Utility/legal page:

- Simple header.
- Readable content.
- Minimal hero or no hero.

## Header And Footer

Canonical layout templates live in:

- `/templates/layout/ja-header.html`
- `/templates/layout/ja-footer.html`

Generated and governed JA pages use marker comments:

```html
<!-- LAYOUT:ja-header:start -->
...
<!-- LAYOUT:ja-header:end -->

<!-- LAYOUT:ja-footer:start -->
...
<!-- LAYOUT:ja-footer:end -->
```

The canonical header navigation order is:

1. 交流・掲示板 -> `/germany/ja/community/`
2. 生活・手続き -> `/germany/ja/living/`
3. 仕事・求人 -> `/germany/ja/jobs/`
4. ニュース・イベント -> `/germany/ja/events/`
5. ドイツ語・学び -> `/germany/ja/learn-german/`

Eat, Shopping, and Medical must not become top-level global nav items. They may appear as Living sublinks in the footer or Living sections.

## Legacy Guides Policy

`/germany/ja/guides/` is retired and should not be emitted as a live internal link. Use `/germany/ja/living/` for guide-style Living content.

Rules:

- Keep canonical URL pointed at `/germany/ja/living/`.
- Keep it out of main navigation.
- Keep it out of search.
- Keep it out of sitemap.
- Use `/germany/ja/living/` instead of `/germany/ja/guides/`.

## CSS And Hero Rules

Default CSS order for JA pages:

1. `/assets/css/site.css`
2. `/assets/css/ja-header-footer.css` if used
3. `/assets/css/jconnect-ui.css`
4. Global helper CSS such as cookie consent
5. Page-specific CSS

Home preserves the stable order:

1. `/assets/css/site.css`
2. `/assets/css/jconnect-ui.css`
3. `/assets/css/home.css`

Do not redesign pages as part of route governance. Fix only structural drift, broken CSS ordering, legacy Guides exposure, or clearly inconsistent current-page layout.

## Workflow

For generated article content:

```bash
npm run build
npm run validate:all
```

For a new top-level directory page:

1. Create the page at `/germany/ja/{slug}/index.html`.
2. Add an entry to `/content/registry/pages.json`.
3. Use `type: "directory"` and the correct conceptual `pillar`.
4. Set `search_visible` and `sitemap_visible` deliberately.
5. Run `npm run build`.
6. Run `npm run validate:all`.
7. Review the page, search index, and sitemap before opening a PR.
