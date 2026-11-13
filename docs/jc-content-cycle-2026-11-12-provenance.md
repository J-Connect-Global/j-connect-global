# J-Connect Germany content cycle — 2026-11-12

## Run context and repository state

- Checked at: 2026-11-12 04:24 Europe/Berlin.
- Active repository: `J-Connect-Global/j-connect-global` (public; default branch `main`; current connector permissions include push/admin).
- The former candidate `NihonGatewayGermany/nihon-gateway-germany` resolves to the active repository above; no separate replacement repository is needed.
- The repository's `.github/agents/jconnect-content.agent.md` was read and followed: no direct push to `main`, content-only scope, focused draft PR, and no changes to Apps Script, community/job submissions, forms, workflows, secrets, privacy handling, or language-learning data.
- The requested Notion project instructions were not accessible in this non-interactive run. The repository agent instructions, current source files, public pages, and the user's current task instructions were used instead.
- Public Japanese sitemap currently reports 220 URLs. The public Living and Events hubs were inspected. The live site still shows the latest public news cycle around 2026-11-07; newer content updates remain in the open draft PR described below.
- GitHub search found one open PR and no open repository issues: PR #442. No competing content PR was found.

## Priority 1 — existing J-Connect work

### Community / private messaging deployment

- The public read-only Apps Script status endpoint returned `messaging_version: 2026-11-07.1`.
- Public status flags were enabled for public replies, private messages, conversation threads, resend notifications, and non-expiring management/conversation links.
- The public posts endpoint returned 7 active posts. The returned public objects did not include private email, phone, token, or password fields.
- The public community board and one public post detail page loaded. The extracted post page displayed the public-reply section, but this read-only extraction does not prove that the interactive reply form, private conversation creation, resend flow, or email delivery works end to end.
- The 5-minute publication/notification trigger and its last execution time remain unverified. This requires an authenticated Apps Script editor session. No trigger deletion, recreation, or redeployment was attempted.
- Zoho real-email end-to-end testing remains unperformed because a dedicated safe test mailbox was not available. No test email was sent to a live user or production administrator.
- Interactive browser testing could not be started in this run, so the live form and private-conversation UI were not clicked or submitted. The deployment version and public read-only API checks are confirmed; full end-to-end completion is not claimed.

### German-learning flashcard audio

- The public flashcard page text confirms that automatic word playback is described as OFF by default and that users can enable it.
- The page extraction environment does not execute the full client-side vocabulary loader or actual device audio output; it showed placeholder zero counts and no speech support. These are not treated as a production defect.
- Actual speech output through a physical browser/device speaker remains unverified. No vocabulary, classification, or privacy code was changed.

### Silvester / 2026–27 municipal fireworks-zone recheck

- Düsseldorf's official public-announcement page was checked. The latest visible municipal notices were not a 2026/27 fireworks order; no current 2026/27 Altstadt order was found in the official search.
- Cologne's official material confirms the existing inner-city firecracker-restriction zone and the separate Dom protection zone. The 2026-02-05 council agenda contains a motion titled “Ausweitung der bestehenden Böllerverbotszone und weitergehende Einschränkung privaten Feuerwerks ab Silvester 2026/2027”. An agenda item is a proposal, not a final order. No final 2026/27 municipal order was found in this check.
- Do not present 2025/26 maps, boundaries, or time windows as confirmed rules for 2026/27. Recheck the municipal notices again in early December, when seasonal orders are more likely to appear.
- Existing article affected: `/germany/ja/events/columns/germany-silvester-fireworks-rules/`. No public-page edit was made because the 2026/27 rules have not yet been confirmed.

### Existing content PR #442

- PR #442 remains Draft and open: https://github.com/J-Connect-Global/j-connect-global/pull/442
- It contains 8 existing article updates and 2 unpublished drafts, including the L093 customs/VAT update, N038 THG-Quote deadline clarification, L097 social-insurance thresholds, and L098 child health-check guide.
- The PR body records that L097 awaits the 2026-11-20 Bundesrat stage and L098 awaits medical expert review and image-rights confirmation. Those gates remain valid; this run did not merge or publish the PR.
- Current PR head checked: `ad0e5a4163ea252596d4c018aef613ee00b93e1c`.
- GitHub Actions run 43146490093 completed successfully on that head. The `validate-content` job passed the generated-content build, generated-file synchronization, deterministic validation, and browser runtime smoke-test steps.
- The PR branch was last observed 110 commits ahead and 5 commits behind `main`. It was not rebased or merged.
- The live N038 article still needs the reviewed PR update to become public. The PR's N038 update is not treated as published.

## Priority 2 — Japanese content production

### New draft L099

- Draft path: `content/living/nrw-primary-school-enrollment-2027-2028.md`
- Intended URL: `/germany/ja/living/nrw-primary-school-enrollment-2027-2028/`
- Registry ID: L099.
- Status: unpublished draft; `published=false`, `status=draft`, and home/hub/search/sitemap visibility flags are all false.
- Scope: NRW 2027/28 school-entry cohort, legal age threshold, early enrollment and health-based deferral, Düsseldorf's 2026-10-06 to 2026-10-08 registration windows, the city's 2026-11-15 guidance deadline, Cologne's October/November 2026 registration timeline, documents, school-health examination, language assessment, and the need to verify recognition before relying on a foreign/international school to meet NRW compulsory-schooling rules.
- Existing J-Connect coverage checked: L064 is a broad school-choice guide; L053 covers school holidays; N003 covers all-day care; C026 explains school grades. None of these is a dedicated 2027/28 enrollment guide.
- Competitor check: current search surfaced municipal/individual-school information in German, but no Japanese-language guide with the current Düsseldorf/Cologne 2027/28 dates was found in this search. This is a narrow, practical gap rather than a generic duplicate.
- The draft links to the existing school-choice, school-holiday, all-day-care, Kita, and grading articles. It is not indexed, included in the sitemap, or exposed on public hubs.
- Review gate: editorial review is still required, especially for the wording around compulsory schooling, municipal deadlines, and foreign/international school recognition. Recheck the Cologne page because its public service page still displays the 2026/27 cycle.

### Existing article improvement proposals (not yet applied to public HTML)

1. **L064 — schools-germany-japanese-families**
   - Keep the existing broad comparison of local schools, Japanese schools, supplementary schools, and international schools.
   - Once L099 is approved for publication, add one contextual internal link in the NRW Grundschule section.
   - Clarify that 15 November is the deadline in Düsseldorf's current guidance, while exact registration appointments are set by each municipality/school. Add a short 2027/28 example rather than duplicating L099's full procedure.
   - Recheck the current NRW School Act version effective 2026-08-01 and the §36 language-assessment provision before updating the published page.

2. **C019 — germany-silvester-fireworks-rules**
   - Add a dated 2026/27 status note only after the next official municipal check. As of 2026-11-12, no final Düsseldorf or Cologne 2026/27 order was found.
   - Label the 2025/26 boundaries as historical examples, not current rules. Treat Cologne's 2026-02-05 council agenda motion as a proposal until a final resolution/order is located.
   - Recheck Düsseldorf's public notices and Cologne's press/restriction pages in early December.

## Primary sources checked

### School enrollment

- NRW School Act, version effective 2026-08-01 (especially §§34–36): https://recht.nrw.de/lrgv/gesetz/01082026-schulgesetz-nrw-schulg/
- NRW School Act, version effective 2025-08-01 through 2026-07-31 (old §36(3) wording used by the transition): https://recht.nrw.de/lrgv/gesetz/01082025-schulgesetz-fuer-das-land-nordrhein-westfalen-schulgesetz-nrw-schulg/
- Third amendment to the NRW Primary School Training Regulation, published 2026-09-24 and effective 2027-08-01 (15 March deadline for later cohorts; transition keeps 15 November before 2029-08-01): https://recht.nrw.de/gvnrw/2026-s668/
- Düsseldorf 2027/28 registration announcement, published 2026-09-22: https://www.duesseldorf.de/medienportal/pressedienst-einzelansicht/pld/anmeldetermine-an-grundschulen-fuer-schulanfaengerinnen-und-schulanfaenger-zum-schuljahr-2027-2028
- Düsseldorf general enrollment guidance and 15 November deadline: https://www.duesseldorf.de/schulen/anmeldeverfahren/uebergang-in-die-grundschule
- Düsseldorf enrollment FAQ, including individual appointments after the announced dates: https://www.duesseldorf.de/schulen/anmeldeverfahren/uebergang-in-die-grundschule/faqs-zur-einschulung
- Cologne official timeline for 2027 entry: https://www.stadt-koeln.de/mediaasset/content/pdf40/Regionale-Bildungslandschaft/einschulung-fahrplan-termine.pdf
- Cologne current service page (still showing 2026/27 cycle at this check): https://www.stadt-koeln.de/service/produkte/00082/index.html

### Fireworks

- Düsseldorf public announcements: https://www.duesseldorf.de/bekanntmachungen/?L=0
- Cologne council agenda for 2026-02-05, including the 2026/27 zone-expansion motion: https://www.stadt-koeln.de/mediaasset/content/bekanntmachungen/2026/2026.01.28_0011-01_einladung_ratssitzung_05.02.2026.pdf
- Cologne official summary of the established inner-city firecracker zone and Dom protection zone: https://ratsinformation.stadt-koeln.de/getfile.asp?id=1036863&type=do

## SEO, analytics, and implementation status

- No new public URL was created. L099 remains unpublished and excluded from all public visibility flags. PR #447 includes regenerated HTML for existing public pages, updated search index and hub/event pages, image assets, a news-feed snapshot, and sitemap metadata. The live site has not changed because PR #447 remains Draft and unmerged. The sitemap remains 220 URLs; no URL was added, and canonical/hreflang rules were not changed.
- The new L099 draft is excluded from all public visibility flags. No incomplete English or German locale was added.
- No user-post, job, contact-form, admin, privacy, or German-learning dataset code was changed.
- GSC Wizard returned `payment_required / subscription_required`; no 28-day or 3-month query/page metrics were available. No impressions, CTR, or average-position figures are reported.
- The current Notion project instructions were not accessible in this non-interactive run.
- No five-hour execution duration is claimed. This run completed a focused research and draft cycle within the available execution window; it did not spend five hours in active editing.

## Next actions

1. Review and publish PR #442 only after its existing legal/medical review gates are cleared; keep it Draft until then.
2. Complete authenticated Apps Script trigger inspection and obtain a dedicated Zoho test mailbox before attempting real email E2E.
3. Perform a physical speaker/audio test for flashcards in a supported browser.
4. Recheck Düsseldorf and Cologne 2026/27 fireworks notices in early December.
5. Review L099 and, if approved, publish it with a short internal-link update to L064. After 2026-11-15, revise the article's immediate-action wording to explain late registration and municipal follow-up.
## Run 11 follow-up — 2026-11-13

### Priority 1: existing system and PR status

- Rechecked the public read-only Apps Script status endpoint: `messaging_version=2026-11-07.1`; public replies, private conversations, inline replies, instant publishing, and persistent links remain enabled.
- The public posts endpoint still returns 7 active posts and no private email, phone, token, or password fields. One reply text, “Test 3 to 1”, appears on an existing public post and looks like a possible test artifact. It was not deleted because it is public user-generated content and ownership/intent were not confirmed.
- The 5-minute Apps Script trigger and last execution time remain inaccessible without an authenticated Apps Script editor session. No trigger was deleted, recreated, or redeployed.
- Zoho real-email E2E still has no dedicated safe test mailbox. No live-user or production-admin test email was sent.
- Flashcard dataset files remain present under `assets/data/learn-german/flashcards/`; no vocabulary or classification file was changed. Actual browser playback and physical speaker output remain unverified. The browser automation attempt could not start because the TinyFish browser wallet was insufficient; no UI controls were clicked or submitted.
- PR #442 current head `ad0e5a4163ea252596d4c018aef613ee00b93e1c` has a successful Validate content run #1939, including generated-content build, sync check, deterministic validation, and Chromium runtime smoke tests. GitHub currently marks the PR `mergeable=false`; it remains Draft and is not merged. Its 87-file compare and outstanding legal/medical review gates remain.
- GSC Wizard still returns `payment_required / subscription_required`; no 28-day or 3-month Search Console metrics were obtained.
- The Notion project instructions remain inaccessible in this non-interactive run.

### Priority 2: new legal source and L099 update

- The NRW Third Ordinance amending the Primary School Training Regulation was published on **2026-09-24** and enters into force on **2027-08-01**. It sets a general registration deadline of **15 March of the previous year**, but retains **15 November** for children whose compulsory schooling begins before **2029-08-01**. Therefore the 2027/28 cohort still uses **2026-11-15**; the 2029/30 cohort is the first affected by the March deadline.
- The same regulation says the standardized language test and new mandatory school pre-course rules do not apply to children who become schoolpflichtig before 2029-08-01. The 18th School Act amendment's §36(6) transition also preserves the prior §36(3) sentence 2 where its conditions are met. The article now distinguishes the school’s language/basic-learning assessment from the new mandatory course and cites both the new regulation and the historical School Act version.
- L099 front matter and registry now show `updated_at=2026-11-13`, `last_verified=2026-11-13`, and 10 official sources. It remains `published=false`, `status=draft`, and excluded from home, hub, search, and sitemap.
- PR #447 branch latest commit after the L099 and registry updates: `74302212c0b2cb5d2019c68ebf4128370d5c1c42`. CI for this latest head is pending at the time of this note.
- The original PR #447 body understated its diff. It contains generated public-page outputs, search-index and sitemap metadata, image assets, and a news-feed snapshot in addition to the L099 draft and existing content refresh. No new public URL is added; the live site remains unchanged until the draft PR is approved and merged.

### Fresh event-source finding for the next cycle

- Hamburg's official St. Petri market page now lists **2026-11-18 to 2026-12-23**, daily 11:00–21:00, closed 2026-11-22: https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-petrikirche-301062
- Hamburg's official Fleetinsel page now lists **2026-11-23 to 2026-12-23**, but its current opening-hours widget does not provide a reliable daily schedule: https://www.hamburg.de/tourismus/weihnachten-hamburg/weihnachtsmarkt-hamburg/weihnachtsmarkt-auf-der-fleetinsel-301114
- The existing Hamburg 2026 guide still says these dates were not yet available as of 2026-11-01. Update that public article before the first market opens on 2026-11-18, regenerate its HTML/registry/hub/sitemap, and keep the Jungfernstieg discrepancy visible (city overview through 2026-12-29 vs individual page through 2026-12-23).
