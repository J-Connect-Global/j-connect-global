# J-Connect Germany — Editorial cycle 2026-10-28

**Status at review:** source review and editorial changes are on `editorial/jc-content-cycle-20261028`. The branch build completed, generated HTML/search artifacts and sitemap were committed, and `npm run validate`, `npm run test:browser`, `git diff --check`, and the unrelated-path guard passed. The articles are still unpublished on production until a review PR is merged and the live URLs are checked.

## 1. Priority-one existing tasks

- The public Apps Script status endpoint was checked on 2026-10-28 and returns `messaging_version: 2026-10-23.1`, `persistent_links: true`, `inline_replies: true`, and `instant_publish: true`. The live conversation page displays permanent-link and resend guidance, uses `noindex, follow`, and sets `no-referrer`.
- No real email was sent or received during this audit. Delivery and end-to-end recovery remain unverified because no safe test conversation/inbox is available; no test notification was sent to real users.
- The main-branch flashcard manifest and a live browser session both confirm 17,635 items: A1 650, A2 650, B1 1,100, B2 2,600, C1 5,000, C2 7,635. The earlier zero/loading text came from a non-waiting content snapshot; the browser confirmed the UI loads correctly. No learning data was changed.
- The four articles merged in PR #377 are live, self-canonical, `index, follow`, and all four URLs appear in the 168-URL production sitemap.
- PR #384 remains a draft. The official EU ETIAS page still says the system is not in operation and accepts no applications; immigration-specific review remains pending.

## 2. New article intents

### A. `minijob-grenze-2027`

- **Primary intent:** “Minijob Grenze 2027 633 Euro”; secondary questions: hours at €14.60/€16/€18, multiple jobs, tax, pension insurance and health insurance.
- **Differentiation:** the existing January 2027 overview is a broad change summary. This guide explains the legal calculation, worked hours examples, multiple-job rules and insurance/tax implications; the overview links to it rather than competing for the same broad query.
- **Primary sources checked 2026-10-28:**
  - https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/fuenfte-mindestlohnanpassungsverordnung-milov5.html
  - https://www.gesetze-im-internet.de/sgb_4/__8.html
  - https://www.minijob-zentrale.de/DE/die-minijobs/minijob-mit-verdienstgrenze/minijob-mit-verdienstgrenze_node.html
  - https://www.minijob-zentrale.de/DE/die-minijobs/mehrere-jobs/mehrere-jobs_node.html
  - https://www.minijob-zentrale.de/DE/die-minijobs/rentenversicherungspflicht
  - https://www.minijob-zentrale.de/DE/meta/faq-bereich/steuer/27_was_ist_die_einheitliche_pauschsteuer/faq_27_was_ist_die_einheitliche_pauschsteuer
  - https://www.minijob-zentrale.de/DE/die-minijobs/versicherungen
- **Important qualification:** as of 2026-10-28 the Minijob-Zentrale's general page still displayed the 2026 limit of €603. The 2027 figure of €633 is calculated from the confirmed €14.60 minimum wage and the statutory formula; the article explicitly says to recheck the agency's page before the effective date.

### B. `nrw-christmas-opening-hours-2026`

- **Primary intent:** “NRW Christmas 2026 supermarket opening hours”; secondary questions: Christmas Eve closing time, public-holiday closures, emergency pharmacy and holiday transport schedules.
- **Differentiation:** the existing Sunday-closure guide explains general rules. This page is date-specific for 24–27 December 2026 in NRW and links back to the general guide. It does not claim that store hours are identical throughout Germany.
- **Primary sources checked 2026-10-28:**
  - https://recht.nrw.de/lrgv/gesetz/30032018-gesetz-zur-regelung-der-ladenoeffnungszeiten-ladenoeffnungsgesetz-loeg-nrw/
  - https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/
  - https://www.aponet.de/notdienstsuche
  - https://www.rheinbahn.de/
  - https://int.bahn.de/en/booking-information/db-navigator

## 3. Existing article improvements

1. `germany-january-2027-changes`: added a direct link to the detailed Minijob guide and added visible primary-source links. The broad overview remains the landing page for general January changes.
2. `christmas-markets-duesseldorf`: verified the official 19 November–30 December 2026 dates, regular hours, the 22 November and 25 December closures, 24 and 26 December special hours, central public-transport access and the airport P13 P+R information. The existing article was updated instead of creating a duplicate market page.
3. `germany-sunday-rest-shops-closed`: added a date-specific NRW Christmas shopping note and link to the new guide.
4. `germany-train-travel-guide`: added seasonal-event planning advice focused on return journeys and separate long-distance/local transit checks.

## 4. Image provenance

The two hero illustrations and four inline diagrams are original J-Connect SVG assets in `assets/images/living/seo/`; no third-party image, stock photo or external license is used. The branch-only workflow converts the two hero source SVGs to WebP for the article hero/metadata. Inline SVGs have descriptive Japanese alt text and captions identifying them as J-Connect-created diagrams. They are schematics, not photos or claims about an actual store, person or transport service.

## 5. Search Console and competitors

- Search Console metrics were not available in this cycle because the connected GSC access returned an expired-subscription error. No clicks, impressions, CTR or average-position figures are inferred.
- Competitor search on 2026-10-28 found extensive German-language 2027 Minijob explainers, including [CHIP](https://www.chip.de/news/geld-finanzen-recht/360-euro-mehr-im-jahr-moeglich-das-aendert-sich-2027-fuer-minijobber_df5cc8e7-6dcc-4c74-a65c-2f22afb4fce5.html) and [t-online](https://www.t-online.de/finanzen/ratgeber/beruf-karriere/id_101489820/minijobs-2027-das-aendert-sich-fuer-millionen-beschaeftigte-beim-gehalt.html), but no strong Japanese-language 2027 Minijob guide appeared in the sampled results. The new Japanese guide differentiates itself through the statutory formula, worked-hour examples, multiple-job cases, and tax/pension/health-insurance caveats; it also flags that the Minijob-Zentrale general page still shows the 2026 limit.
- Japanese-language Düsseldorf Christmas-market coverage exists, including [this page](https://weihnachten-in-duesseldorf.de/ja/oeffnungszeiten-der-weihnachtsmaerkte-duesseldorf.php). In the sampled result, it lists a 20 November start and a 20:00 close on 26 December, while the [official Düsseldorf tourism page](https://www.visitduesseldorf.de/en/experience/events/christmas-in-duesseldorf) lists 19 November–30 December and 14:00–21:00 on 26 December. The updated J-Connect article follows the official source; this is a discrepancy in one sampled page, not a claim about all competitors.
- The new NRW Christmas-hours article targets a distinct date-specific retail/holiday intent; the existing Sunday-closure guide remains the general explanatory page.
- This report records editorial intent and source checks; it is not a claim that rankings or traffic have improved.

## 6. Validation status

- The branch-only workflow converted the two hero SVGs to WebP, ran `npm run build`, `npm run validate`, and `npm run test:browser`, checked whitespace, and passed the guard against changes to messaging, jobs, and German-learning data. Generated article HTML, registry output, search artifacts, and sitemap were committed in `3e9406cd1da6ae67b8fcb42d171885b6e07e6fb7`.
- The temporary branch-only workflow was removed from the branch before the review PR; it is not production code.
- Production publication is not claimed. New article URLs, canonicals, and sitemap entries must be checked after an approved merge. Search Console data remains unavailable because the connected GSC access returned an expired-subscription error.
- The separate EES/ETIAS draft remains unpublished.
