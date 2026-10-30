# J-Connect Germany — Editorial review, 2026-10-29

**Review date:** 2026-10-29 (Europe/Berlin)  
**Purpose:** Record the source checks for the current editorial cycle and avoid duplicating recently published content. This is an internal review note, not a public article.

## New draft articles

### 1. Voluntary German income-tax return for 2022

- **Search intent:** deadline for the 2022 voluntary income-tax return; how to file before 31 December 2026.
- **Official confirmation:** Finanzamt NRW's FAQ explicitly states that a voluntary return for 2022 can be submitted by 31 December 2026. The same authority separately states that mandatory returns have different deadlines.
- **Sources:**
  - https://www.finanzamt.nrw.de/faq
  - https://www.finanzamt.nrw.de/steuerinfos/weitere-themen/steuererklaerung/abgabepflichten-und-fristen
  - https://www.elster.de/elsterweb/infoseite/privatpersonen
  - https://www.finanzamt.nrw.de/steuerinfos/weitere-themen/steuererklaerung/belege-zur-steuererklaerung
- **Editorial safeguard:** do not promise a refund; distinguish voluntary from mandatory filing; explain that opening a draft is not the same as submitting it.
- **Status:** draft only; tax-specialist review has not been performed; hidden from Home, hub, search and sitemap. Add a proper hero thumbnail before publication.

### 2. New Year's Eve fireworks in Germany 2026/27

- **Search intent:** when category F2 fireworks can be bought and used; age limit; prohibited locations; local restrictions.
- **Official confirmation:** §22 of the First Explosives Ordinance sets the usual consumer-sale period as 29–31 December (with a Sunday adjustment). §23 allows category 2 fireworks to be used by adults on 31 December and 1 January and prohibits use in the immediate vicinity of churches, hospitals, children's/elderly homes, and especially fire-sensitive buildings or facilities. NRW police guidance supports the advice to buy correctly marked products and use them responsibly.
- **Sources:**
  - https://www.gesetze-im-internet.de/sprengv_1/__22.html
  - https://www.gesetze-im-internet.de/sprengv_1/__23.html
  - https://siegen-wittgenstein.polizei.nrw/artikel/silvester-den-jahresausklang-gemeinsam-richtig-feiern-aber-mit-sicherheit
- **Editorial safeguard:** do not infer that a municipality has no local ban merely because a 2026/27 notice was not found in October. Recheck local notices before publication.
- **Status:** draft only; local rules should be checked again by 15 December 2026. Add a hero thumbnail before publication.

## Existing-page review

### Deutschlandticket 2027 — deadline 30 November

- Existing page: `content/events/news/deutschlandticket-2027-price-consent.md`
- Official DB FAQ: https://www.bahn.de/faq/pk/angebot/regionale-angebote/deutschland-ticket/vertragsaenderungen-dt
- The current article already explains the €66.80 monthly price, the 30 November deadline for affected DB contracts, the consequence of non-consent, and the distinction between DB and other sellers. No duplicate article is warranted. Recheck DB's FAQ close to the deadline and change the source verification date only if the live facts remain the same.

### 2025 Nebenkostenabrechnung — deadline 31 December 2026

- Existing page: `content/living/nebenkostenabrechnung-2025-deadline.md`
- Primary source: https://www.gesetze-im-internet.de/bgb/__556.html
- The article already distinguishes the accounting period from the delivery date and notes the exception where the landlord is not responsible for a late notice. No new near-duplicate is needed. Recheck the official law and consumer-centre guidance before the year-end deadline.

### Winter tyres 2026

- Existing page: `content/living/winter-tires-germany-2026.md`
- Primary sources: https://www.gesetze-im-internet.de/stvo_2013/__2.html and https://www.gesetze-im-internet.de/stvzo_2012/__36.html
- The published article already explains the situation-based rule and Alpine/3PMSF marking. No substantive correction was identified in this review; avoid rewriting it only to change a date.

### 2027 health-insurance additional contribution

- Existing page: `content/events/news/health-insurance-zusatzbeitrag-2027.md`
- Primary source: https://www.bundesgesundheitsministerium.de/presse/pressemitteilungen/ergebnisse-gkv-schaetzerkreis-zusatzbeitragssatz
- Last verified on 26 October 2026, only three days before this review. The 2.9% figure is the average reference rate, not a promise that each insurer's individual rate will stay unchanged. Recheck when insurer-specific rates are published; no repetitive edit was made today.

### Tax-ID guide — planned internal link

- Existing page: `content/living/tax-id-steuernummer-steuerklasse.md`
- Once the voluntary-return guide passes specialist review and is approved for publication, add a natural link from the existing tax-ID guide. Do not link to the draft while it is hidden.

## Implementation note

The repository's `Validate content` workflow runs the content generator and then requires generated HTML, hub cards, search index and sitemap to be committed with the source. This run has no local repository runtime or dependency installation, so published-page source edits were not committed without their generated artifacts. The new articles are staged as hidden drafts; the existing-page candidates above are source-verified and documented for the next generated-build cycle.

## Recheck — 2026-10-30 (Europe/Berlin)

### EES / ETIAS draft

- The German Federal Foreign Office's current EES explainer confirms full operation from **10 April 2026** and lists holders of residence permits and long-stay visas among those exempt from EES: https://www.germany.info/us-en/2735594-2735594
- The EU ETIAS homepage still gives **Q4 2026** as the expected operational period: https://travel-europe.europa.eu/etias
- The EU FAQ separately confirms that ETIAS is **not yet operational and is not collecting applications**, and that the specific start date will be announced several months before launch: https://travel-europe.europa.eu/etias/faq
- Editorial correction: do not describe Q4 2026 as withdrawn or as a confirmed launch date. State it as the current forecast while making clear that no exact start date or application intake exists yet.
- The draft was updated on 30 October. Immigration-specific review remains required before publication, especially for temporary residence certificates and re-entry.

### Voluntary 2022 tax return

- Added the statutory basis: AO §169(2) provides the regular four-year assessment limitation period; AO §170(1) determines the general start of that period: https://www.gesetze-im-internet.de/ao_1977/__169.html and https://www.gesetze-im-internet.de/ao_1977/__170.html
- The article now distinguishes this voluntary-return limitation period from mandatory filing deadlines. The Finanzamt NRW FAQ remains the direct practical confirmation for 31 December 2026: https://www.finanzamt.nrw.de/faq
- A tax specialist has not reviewed the article. Keep it unpublished until that review is completed.

### Fireworks draft — cannibalization finding

- The proposed new page overlaps substantially with the existing public column C019 at content/events/columns/germany-silvester-fireworks-rules.md, which already covers national sale/use dates, age restrictions, prohibited locations, Düsseldorf and Cologne examples, safety, and environmental effects.
- Do **not** publish the new fireworks draft as a separate URL. Its useful 2026/27 material should be merged into the existing column when current local notices are available. For local restrictions, add the legal basis in 1. SprengV §24: https://www.gesetze-im-internet.de/sprengv_1/__24.html
- The existing article labels the city examples as 2025/26; do not present them as current 2026/27 restrictions. Recheck Düsseldorf, Cologne, and other municipal notices closer to year-end.

### Existing internal-link improvements already present on main

- The health-insurance guide already links to the ePA guide.
- The childbirth-procedures guide already links to the 2027 Kindergeld payment calendar.
- The Kita guide already links to the NRW 2026/27 school-holiday guide and explicitly distinguishes school holidays from Kita closures.
- No duplicate edits were made to these pages in this cycle.

### Access and verification limits

- Search Console metrics were not available because the GSC Wizard connection reports an expired subscription. No impressions, CTR, ranking, or query figures are inferred.
- Project Instructions were not accessible through the connected Notion search in this run.
- The existing draft PRs remain unpublished. No generated HTML, sitemap, canonical, or hreflang output was changed.
