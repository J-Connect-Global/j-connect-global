# Community production data mismatch investigation (2026-07-13)

## Confirmed cause

At the start of the investigation, the canonical Master GAS deployment returned seven public Community rows. Production had five because the last generated-data workflow ran from pre-PR #282 commit `ada2a3d` at 2026-07-13 13:40 UTC. That version still contained `isLikelyTestPost`, and its logged/generated set was exactly the five non-test IDs. PR #282 merged later at 13:53 UTC.

The same workflow then created data commit `0ed86f1`, but its Pages job deployed the original trigger SHA `ada2a3d` rather than the data commit. This checkout race can keep Pages on stale JSON even after a sync writes newer data. The fix removes the legacy endpoint selection path and deploys the exact sync commit.

## Pipeline evidence

The seven expected IDs are:

- `post_066f3c93-7f73-46a3-9c89-e38d47f7308d`
- `post_10d2f796-9555-4358-ab98-95de74346cad`
- `post_79f6dfd5-86c4-4c68-bf50-f8a7a1993bfe`
- `post_361ec368-085b-42da-86e4-2c6d3dd2c28a`
- `post_23baeb1d-3d92-4438-9350-e04029bd3add`
- `post_807cffe7-b1af-41c0-89ee-c54b57ce44c5`
- `post_cd6cadde-3221-4de3-8f8d-935d66331457`

| Stage | Effective source | Count and ID result | Exclusion/routing finding |
| --- | --- | --- | --- |
| Contents_Master Spreadsheet | Private `Community Posts` sheet | Owner-reported 7 active rows. Direct anonymous query returned 401, as expected for a private sheet. | Row-level access requires an authorized owner. The deployed Master response below is the safe verification surface. |
| Deployed Master Apps Script | Canonical deployment declared in `assets/js/data-sources.js` | 7/7 IDs above; both missing IDs present. | All returned statuses are exactly `active`; no returned deletion, hidden, archive, or expiry value excludes either ID. |
| GAS cache | Same canonical deployment, ordinary request and `bypassCache=true` | 7 in both modes; both missing IDs present. | A stale five-item `CacheService` payload is ruled out. Repository `listPosts_` skips cache reads for `bypassCache=true`. |
| Historical sync endpoint selection | Pre-fix workflow supplied three optional secret names and the script could prefer them over Master | The historical workflow logged 5, but did not log a safe endpoint identity. | The exact historical URL cannot be proven from logs. Repository-scoped secret metadata listed no values; organization-secret visibility was unavailable. This ambiguity is removed by rejecting dataset-specific overrides. |
| `scripts/sync-public-data.mjs` on last production run | Commit `ada2a3d` | 5 IDs: `post_cd6…`, `post_79f…`, `post_361…`, `post_23b…`, `post_807…`; both expected test IDs absent. | That commit still applied `isLikelyTestPost`. Current code publishes only from explicit lifecycle fields. |
| Committed public JSON | `assets/data/community/posts.json` at `0ed86f1` / PR #282 merge | Declared count 5 and actual item count 5; both missing IDs absent. | Generated output matched the pre-#282 filtered sync result. |
| GitHub Pages artifact | Sync run `29254430357` | Pages deployment recorded trigger SHA `ada2a3d`, not generated-data commit `0ed86f1`. Production JSON remained 5. | Workflow now passes `auto-commit-action.outputs.commit_hash` to Pages checkout and validates artifact count/IDs. |
| Community list/detail | Production list and detail pages | List rendered `5件中 5件を表示`; direct detail for `post_10d2…` rendered “投稿が見つかりません”. | Home/list/detail read committed `/assets/data/community/posts.json`; they do not independently call GAS or apply test/content heuristics. |

### Source changed during the investigation

At 2026-07-13 14:48 UTC, after the first successful 7→7 local sync and reproducibility check, the same canonical deployment began returning 6. Cached, `bypassCache=true`, and `includeClosed=true` requests all agreed: `post_10d2…` remained present and `post_066f…` was absent before repository normalization. The working generated JSON was therefore refreshed to the current 6-item authoritative response instead of retaining a record no longer returned by the source.

The cause of that later source change cannot be determined without authorized Spreadsheet/Apps Script access. Before expecting 7 again, an owner must inspect the exact `post_066f3c93-7f73-46a3-9c89-e38d47f7308d` row and confirm it still exists, has `status` exactly `active`, has no blocked `moderation_status`, deletion/hidden/archive flag or timestamp, and has no valid past `expires_at`. Do not change it if the lifecycle change was intentional.

## Candidate-cause disposition

1. `COMMUNITY_API_URL` could override Master in the historical code, but the exact historical URL was not logged and cannot be reconstructed safely. The path is removed and legacy variables now cause a clear failure.
2. `CONTENTS_API_URL` / `JOBS_API_URL` also created split routing. They are removed from production; Jobs and Community now share Master.
3. The canonical deployment is not the original old five-row Community source: it initially returned all 7 exact IDs and later returned 6 after an external source-state change.
4. Script Properties cannot be read from GitHub. Effective canonical behavior initially resolved the reported 7 rows; an owner must still verify `MASTER_SPREADSHEET_ID` by name and investigate the later missing ID.
5. The effective canonical source was not a five-row `COMMUNITY_SPREADSHEET_ID` fallback. The property itself remains private and must be removed/aligned manually if present.
6. The deployed version number cannot be read anonymously. Its relevant behavior matches the repository path: active rows are returned, cache bypass works, and private fields are stripped. The merged lifecycle hardening still requires a normal new-version deployment.
7. Cache staleness is ruled out by identical 7-item cached and bypassed responses.
8. Exact deployed source text cannot be downloaded anonymously. Functional parity for spreadsheet resolution, publication result, cache bypass, and private stripping was verified; repository tests cover the full canonical source.
9. Stale workflow/artifact selection is confirmed: the last run used pre-#282 code and Pages deployed the trigger SHA rather than the generated-data commit.
10. At initial verification, another lifecycle rule did not exclude either ID: both were returned as active with no public deletion, hidden, archive, or expiry marker. The later disappearance of `post_066f…` now requires an authorized row-level check.

## GitHub-side correction

- Production no longer supplies `COMMUNITY_API_URL`, `CONTENTS_API_URL`, or `JOBS_API_URL`.
- One canonical Master endpoint supplies Community and Jobs. `MASTER_API_URL` remains an explicit development-only whole-Master override.
- Presence of a legacy dataset-specific environment variable fails the sync instead of silently routing around Master.
- Incompatible, count-mismatched, unexpectedly empty, or zero-eligible responses fail before public JSON is written.
- Diagnostics emit source/eligible/generated counts, the complete safe Community ID list, sanitized endpoint identity, and JSON change state.
- Pages checks out and reports the exact generated-data commit and validates the artifact's declared/actual count.
- Content-based publication filtering remains absent. Active `test / test`, `テスト / テスト`, short, repeated, location/tag, demo, sample, dummy, and placeholder content remains public.

## Manual GAS and settings verification

The observed deployed Master endpoint already returns the intended seven IDs, so no unverified property value should be changed merely to fix this incident. An authorized Apps Script owner should still verify:

1. In **Project Settings → Script properties**, `MASTER_SPREADSHEET_ID` points to Contents_Master.
2. Remove `COMMUNITY_SPREADSHEET_ID`, or align it to the same spreadsheet only if a legacy fallback is operationally required. Do not leave it pointing at an older five-row spreadsheet.
3. Copy the merged `apps-script/community-board-api.gs` into the existing Master Apps Script project.
4. Use **Deploy → Manage deployments → Edit → New version → Deploy**.
5. Keep the existing canonical Web App URL unchanged; do not create a replacement endpoint in site/workflow configuration.

No repository secret value needs to be added. Repository-scoped legacy endpoint secrets were not listed during investigation. If matching organization/environment secrets exist, remove them when convenient; the corrected production workflow no longer consumes them.

After merge—and after the source owner resolves or confirms the later `post_066f…` lifecycle change—run **Sync public data** manually once and confirm its sync and Pages artifact diagnostics both show 7 and all seven IDs. The intended invariant remains: 7 active spreadsheet rows → 7 public JSON items → 7 Community list results and working detail pages. Until the canonical source returns that ID again, the correct generated snapshot is 6 rather than a fabricated 7.
