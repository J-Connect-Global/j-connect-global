# Article link and review audit (2026-11-06)

Automated check of every external link in `content/**/*.md` (985 unique URLs),
run from the Claude Code cloud environment. That environment's network proxy
blocks many hosts, so only part of the links could be checked.

## Results

| Result | URLs |
| --- | ---: |
| Reachable, HTTP 200 | 333 |
| Broken (404 / 410) | 2 |
| Blocked by bot protection (403) | 1 |
| Plain http, refused by the proxy | 1 |
| Not checkable here (host blocked by the session proxy) | 648 |

## Fixed in this change

- `quiet-holidays-november-germany`: the cited Cologne press release returned
  410 Gone, and the other Cologne page now only covers Easter 2025. Both were
  replaced by the Düsseldorf Ordnungsamt page, which states the same November
  rules (All Saints' Day and Totensonntag 05:00–18:00; Volkstrauertag markets
  and sports until 13:00, entertainment and dancing until 18:00).
- `duesseldorf-oktoberfest-2026-guide` (past event, already noindex): the
  Visit Düsseldorf event page was removed after the event (404); the source now
  points to the Visit Düsseldorf event calendar and says so.
- Eight permanently moved pages (TK, Umweltbundesamt, Verbraucherzentrale)
  updated to their new addresses.
- `http://creativecommons.org` licence links switched to https.
- Three travel guides: dropped "2026年" from source titles whose pages are
  general timetables or ticket pages.

## Open

- `munich-weekend-trip`: munich.travel answers 403 to automated requests;
  check the Isarvorstadt link manually in a browser.
- The 648 links on blocked hosts (table below) need a check from an
  environment without these restrictions, for example the GitHub Actions runner.

## Review dates

Past-event guides are already handled consistently (noindex, kept in the Events
hub archive, off Home). The weekend-trip and city guides are past their
`next_review`, but their text is written to be date-free (no prices or
seasonal claims); their review dates were not moved because most of their
official sources are on hosts that could not be checked here.

## Hosts that could not be checked (top 25)

| Host | URLs |
| --- | ---: |
| commons.wikimedia.org | 30 |
| familienportal.de | 17 |
| www.bundestag.de | 17 |
| www.destatis.de | 16 |
| www.dus.emb-japan.go.jp | 13 |
| www.bundesregierung.de | 12 |
| www.arbeitsagentur.de | 11 |
| gesund.bund.de | 10 |
| www.adac.de | 10 |
| katholisch.de | 8 |
| brauer-bund.de | 7 |
| creativecommons.org | 7 |
| eur-lex.europa.eu | 7 |
| kleingarten-bund.de | 7 |
| www.bundesnetzagentur.de | 7 |
| service.duesseldorf.de | 6 |
| www.awista-kommunal.de | 6 |
| www.bahn.de | 6 |
| www.bremen.eu | 6 |
| www.mofa.go.jp | 6 |
| www.rundfunkbeitrag.de | 6 |
| www.schulministerium.nrw | 6 |
| digital-strategy.ec.europa.eu | 5 |
| travel-europe.europa.eu | 5 |
| www.bmas.de | 5 |
