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
