# Crawler-first public data audit

Audit date: 2026-07-29

Baseline: `d92564b151180c342cf81d100031f873d09e0977`

Scope: `/germany/ja/`, `/germany/ja/jobs/`, `/germany/ja/community/`, their generated public detail pages, and the Pages artifact.

PR #310's root brand architecture remains unchanged: `/` is the indexable, self-canonical J-Connect Global home; `/germany/ja/` remains the indexable, self-canonical J-Connect Germany portal. No new language route, hreflang, metadata campaign, GAS change, spreadsheet change, or publication-policy change is included.

## Result

The committed sanitized JSON already contained 5 public Community posts and 4 public Jobs. JavaScript rendered those records correctly, and the Pages build generated their detail pages, but the repository's initial list HTML contained only generic guidance or a loading state. The build now renders the eligible JSON records into initial HTML and the browser enhances that markup after loading the same JSON. Failed JSON requests retain the generated snapshot.

Events were audited and left unchanged because their published cards are already generated into initial HTML from the editorial content registry.

## Audit matrix

`FIX` means a reproduced baseline issue was fixed in this change.

| Area | Result | Evidence and decision |
| --- | --- | --- |
| Source JSON | PASS | Committed sanitized payloads reconcile their counts, contain 5 eligible Community and 4 eligible Jobs records, and pass the existing privacy validators. |
| Generated repository HTML | FIX | Home, Jobs, and Community previously had guidance/loading-only initial markup. Build-time snapshots now contain the current eligible records. |
| Pages artifact | FIX | The snapshot regression test compares canonical list links in the generated `_site` artifact with the committed JSON. |
| JavaScript enabled | PASS | Existing filter, sort, view, save, detail, share, timestamp, and Home cap behavior remains; runtime cards replace rather than append to the snapshots. |
| JavaScript disabled | FIX | Titles and normal canonical detail links are present without scripts; list containers are no longer loading-only and include a no-JS capability note. |
| Canonical/detail URL | FIX | Initial cards now use each sanitized record's validated `detail_url`; legacy query routes are not emitted by the snapshot generator. |
| Sitemap inclusion | PASS | Existing policy remains: eligible Jobs detail pages are evaluated for indexing and sitemap inclusion; Community detail pages remain `noindex, follow` and outside the sitemap. |
| Structured data | PASS | Existing WebSite/Organization/WebPage and eligible JobPosting contracts are unchanged and remain validator-covered. |
| Private field filtering | PASS | The generator calls the public payload privacy guard before rendering; fixture tests reject private fields and escape untrusted markup. |
| Lifecycle/status filtering | FIX | Static snapshots reuse `isPublicCommunityPost` and `classifyJob`; non-public, moderated, deleted, and expired fixtures are excluded. |
| Mobile | PASS | JavaScript and no-JavaScript checks cover 360 px and 768 px without horizontal overflow. |
| Dark mode | PASS | Existing Home/list dark-mode browser coverage remains; snapshot cards use the same component classes and tokens. |
| Keyboard accessibility | PASS | Existing link, control, modal, and focus tests remain; initial cards use ordinary anchors and buttons. |
| Deployment manifest | PASS | Exact-main-SHA checkout, artifact generation, and `/deployment-manifest.json` verification are unchanged. |
| Search Console / recrawl / ranking | EXTERNAL | Post-merge production verification and recrawl are operational work, not repository changes. |

## Data flow and boundaries

```text
Spreadsheet / GAS
  -> scheduled sync and existing dataset-specific eligibility
  -> committed sanitized public JSON
  -> build-content.mjs
  -> render-public-list-snapshots.mjs
  -> committed Home / Jobs / Community initial HTML
  -> clean Pages artifact and generated public detail pages
  -> browser enhancement from the same same-origin JSON
```

The snapshot renderer does not contact GAS or copy spreadsheet columns. It renders only existing public fields needed by the current cards, shortens Community body text to a list excerpt, does not manufacture dates, validates canonical detail paths, and rejects the payload before HTML generation if the existing privacy guard finds a private field or unsafe URL.

## Regression coverage

- Static generation derives expected counts and links from fixture/input JSON instead of hard-coding production counts.
- Home Jobs stays capped at four; list pages include every eligible record.
- Empty payloads render explicit empty states.
- Non-public, moderated, deleted, and expired fixtures do not render.
- Script-like titles and body text are escaped; private-field fixtures stop generation.
- Pages artifact lists contain the same canonical links as the repository HTML.
- JavaScript-disabled desktop, mobile, and tablet browser tests read the generated cards and follow a canonical detail link.
- JavaScript request-failure tests verify Home, Jobs, and Community retain the generated snapshot.
- Existing SEO identity, sitemap, JSON-LD, accessibility, mobile, dark-mode, and deployment-manifest validation remains in the full suite.

## Visual evidence

- [Home, desktop, light](audits/crawler-first/home-desktop-light.png)
- [Jobs, desktop, light](audits/crawler-first/jobs-desktop-light.png)
- [Community, desktop, dark](audits/crawler-first/community-desktop-dark.png)
- [Community, mobile, light](audits/crawler-first/community-mobile-light.png)

The screenshots were captured from a local clean build. JavaScript-disabled behavior and the mobile list-card region are asserted by the browser suite because browser screenshots alone do not prove the initial-response contract.

## Rollback and operational follow-up

Rollback is a single revert of this change; the previous JavaScript-only list behavior will return without any source-data or GAS migration. After merge, wait for the exact-SHA Pages deployment, compare `/deployment-manifest.json` with the merge SHA, inspect the three production pages, and then request Search Console recrawling if desired.
