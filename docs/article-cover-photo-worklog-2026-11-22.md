# J-Connect Global — 2026-11-23 cover image refresh checkpoint

## Completed on branch `codex/article-photo-refresh-2026-11-22`

- 10 article hero covers updated and their four formats committed: 1200×675 WebP, 768w/480w responsive WebP, and JPEG for social previews (40 image files).
- 3 Wikimedia Commons archival photographs with original source, author, CC license, modifications and historical caption; 7 AI-generated editorial images clearly disclosed as such.
- Updated article frontmatter, living/events/learn-german registries, generated HTML and OG/social cards.
- Import the 2026-11-23 Neuss Christmas markets article, seven associated original image/SVG assets and generated page from current main while keeping all image refreshes; merged `content/registry/events.json` additively, rebuilt generated site artifacts.
- Image budget adjusted from 58,000,000 to 59,000,000 bytes: combined images total 58,221,987 bytes. Per-file budget remains 750,000 bytes.
- Verified merged branch build and validate using a temporary GitHub Actions job before clean-up.
- Removed temporary one-time publication/image-transport scripts and workflows after completion to prevent accidental future image overwrites.

## Prioritization / work remaining

- 114 published articles during 2026-10-22–2026-11-22; 103 originally had illustration/diagram alt text.
- 9 of those 103 received new covers in this PR, plus one 2026-10-21 article. **94 candidates remain**, along with **11 existing-cover manual checks**. Not all will necessarily need replacement after visual review.
- Seasonally relevant winter/Christmas content should be assessed first with unique, relevant, license-cleared photographs. For other subjects use photography or clearly labeled original AI artwork as appropriate.
- See `docs/article-cover-photo-audit-2026-11-22.json` for all candidates. Do not delete informative diagrams from article bodies.
- CI must pass on the final exact PR head. Then merge/publish and verify public pages, mobile layout, OG metadata and credits.

## Historical caveat

Early notes mentioning 9 images not uploaded were superseded by the actual 40 binary image files in this branch. This document is the current status reference.
