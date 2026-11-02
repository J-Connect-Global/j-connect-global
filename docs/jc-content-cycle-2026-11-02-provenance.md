# J-Connect Germany content update — 2026-11-02

## Scope

Updated the existing N023 article, “【2027年1月から】ドイツで何が変わる？ 最低賃金・ドイツチケット・社会保険・児童手当まとめ”.

- Clarified that the 2027 contribution assessment ceilings affect people whose earnings were already above the prior ceilings; BMAS says the majority of insured people will see no change.
- Added separate monthly and annual values for statutory health insurance (2027 €6,375/month) and long-term care insurance (2027 €6,075/month), alongside pension/unemployment and the general statutory-health-insurance compulsory-coverage threshold.
- Distinguished the general annual earnings threshold from the contribution assessment ceiling.
- Clarified that crossing the general threshold does not automatically move an employee to private insurance; eligible employees may remain voluntarily insured in GKV or choose PKV, subject to the applicable rules, and added the BMG warning that returning from PKV to GKV is restricted.
- Added direct internal links to the general health-insurance guide and the 2027 additional-contribution-rate article.
- Updated the article modified date and sitemap lastmod to 2026-11-02.

The article-level `last_verified` date remains 2026-10-21 because only the social-insurance section was rechecked in this cycle; the other 2027 policy sections were not fully re-audited.

## Primary sources checked on 2026-11-02

1. BMAS press release, 2026-10-07: cabinet approval of the 2027 social-insurance calculation values; confirms the values and that only people above prior thresholds are affected, with the majority unchanged.
   https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2026/bundeskabinett-beschliesst-sozialversicherungsrechengroessen-2027.html
2. BMAS regulation page: 2027 values and the requirement for Bundesrat consent; publication status checked.
   https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/sozialversicherungs-rechengroessenverordnung-2027.html
3. SGB XI §55(2): the care-insurance ceiling references §6(7) SGB V, which yields €72,900/year (€6,075/month) in 2027.
   https://www.gesetze-im-internet.de/sgb_11/__55.html
4. SGB V §6 and §223: the general/special JAEG values and the separate 2027 GKV contribution ceiling.
   https://www.gesetze-im-internet.de/sgb_5/__6.html
   https://www.gesetze-im-internet.de/sgb_5/__223.html
5. Federal Ministry of Health: rules for the end of compulsory GKV coverage and the choice to remain voluntarily insured or switch to PKV.
   https://www.bundesgesundheitsministerium.de/themen/krankenversicherung/online-ratgeber-krankenversicherung/krankenversicherung/wechsel-zwischen-gkv-und-pkv

Cross-check note: the Deutsche Rentenversicherung press summary groups health and care insurance at €6,375. For the care-insurance ceiling, the controlling statutory reference is SGB XI §55(2) to SGB V §6(7), which yields €6,075/month in 2027; the article therefore separates the two values and does not repeat the DRV summary shorthand.

## Implementation and limitations

- Source Markdown, registry metadata, generated article HTML, the Japanese homepage latest-news list, and sitemap were updated together.
- The title, summary, canonical URL, indexability, language targeting, and unrelated user-posting, jobs, messaging, admin and German-learning systems were not changed.
- Search Console metrics were not available in this run, so no traffic or ranking claims are made.
- Full repository build and browser regression tests must be confirmed by the pull-request CI; a local repository clone was unavailable in this environment.
