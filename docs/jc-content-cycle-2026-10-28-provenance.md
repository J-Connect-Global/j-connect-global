# J-Connect Germany — Editorial cycle 2026-10-28

**Status at preparation:** source review and editorial changes are on `editorial/jc-content-cycle-20261028`. The generated HTML, sitemap, image conversion, build validation and browser tests are pending the branch-only build workflow. Do not treat the articles as published until the PR is merged and the live URLs are checked.

## 1. Priority-one existing tasks

- The live Apps Script read-only status endpoint reports messaging version `2026-10-23.1`, persistent conversation links enabled and resend capability enabled. The version matches the repository's current messaging implementation.
- The public conversation page now explains that the link does not expire and exposes the resend path. No real email was sent during this audit; delivery to a real recipient and end-to-end recovery remain unverified because there is no safe test conversation/inbox available in the current session.
- The main-branch German flashcard manifest reports 17,635 cards. A live browser count still needs to be confirmed; the underlying dataset count is no longer 2,039.
- The recent article-thumbnail audit changes are already merged. The separate EES/ETIAS guide remains in draft PR #384 because immigration-specific review is still pending.

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
2. `christmas-markets-duesseldorf`: verified the official 19 November–30 December 2026 dates, regular hours, 22/25 December closures, 24/26 December special hours, central public-transport access and the airport P13 P+R information. The existing article was updated instead of creating a duplicate market page.
3. `germany-sunday-rest-shops-closed`: added a date-specific NRW Christmas shopping note and link to the new guide.
4. `germany-train-travel-guide`: added seasonal-event planning advice focused on return journeys and separate long-distance/local transit checks.

## 4. Image provenance

The two hero illustrations and four inline diagrams are original J-Connect SVG assets in `assets/images/living/seo/`; no third-party image, stock photo or external license is used. The branch-only workflow converts the two hero source SVGs to WebP for the article hero/metadata. Inline SVGs have descriptive Japanese alt text and captions identifying them as J-Connect-created diagrams. They are schematics, not photos or claims about an actual store, person or transport service.

## 5. Search Console and competitors

- Search Console metrics were not available in this cycle because the connected GSC access returned an expired-subscription error. No clicks, impressions, CTR or average-position figures are inferred.
- Search results showed existing Japanese-language coverage for Minijob and Düsseldorf Christmas markets. The new Minijob article targets a deeper calculation/insurance intent; the market article is an update to the existing page; the NRW Christmas-hours article targets a separate date-specific retail/holiday intent.
- This report records editorial intent and source checks; it is not a claim that rankings or traffic have improved.

## 6. Validation status

Pending: convert hero SVGs to WebP, build generated article HTML and search artifacts, run `npm run validate` and `npm run test:browser`, inspect the full diff, remove the temporary build workflow, create the reviewable PR, then verify the merged production URLs, canonical tags and sitemap. The EES/ETIAS draft remains separate and unpublished.
