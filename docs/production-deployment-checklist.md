# Production Deployment Checklist

GitHub Pages deploys the committed repository contents from `main`; it does not run the content build during deployment. PR validation must prove generated files are already committed.

## Pre-Merge

Run:

```bash
node scripts/build-content.mjs
node scripts/apply-layout.mjs
git diff --exit-code
node scripts/validate-content.mjs
node scripts/validate-layout.mjs
node scripts/validate-static-site.mjs
node scripts/validate-production-parity.mjs
```

If `git diff --exit-code` fails after build/layout, commit the generated output or fix the nondeterministic generator.

## Post-Merge GitHub Pages Check

1. Open the repository Actions page.
2. Confirm the `Deploy GitHub Pages` workflow ran for the merge commit on `main`.
3. Confirm the `github-pages` environment URL points to `https://j-connect-global.com/`.
4. Open `https://j-connect-global.com/germany/ja/` and confirm it matches the committed `germany/ja/index.html`.
5. Confirm Home event badges no longer contain split labels such as `日程` + `確認` or `冬` + `確認`.
6. Confirm the Home Jobs fallback contains the current applicant caution about employer/listing-source information.
7. Open `https://j-connect-global.com/germany/ja/medical/` and confirm the page source includes `医療上の助言や診断ではありません` and emergency wording for `112`.
8. Open `https://j-connect-global.com/sitemap.xml` and confirm it reflects the latest committed `sitemap.xml`.
9. Confirm the page source does not contain stale Home markers such as daily phrase widgets, root-level unavailable language links, unfinished language routes, or old Home Jobs/Community fallbacks.
10. Run the manual live parity check:

```bash
JCONNECT_VALIDATE_LIVE_PRODUCTION=1 node scripts/validate-production-parity.mjs
```

## Compare Production Source Locally

Use these commands after the Pages deployment finishes:

```bash
node scripts/validate-production-parity.mjs
JCONNECT_VALIDATE_LIVE_PRODUCTION=1 node scripts/validate-production-parity.mjs
```

For a manual source comparison, save the live pages outside the repository and compare them with committed HTML:

```bash
mkdir -p ../jconnect-live-check
curl -L https://j-connect-global.com/germany/ja/ -o ../jconnect-live-check/home.html
curl -L https://j-connect-global.com/germany/ja/medical/ -o ../jconnect-live-check/medical.html
diff -u germany/ja/index.html ../jconnect-live-check/home.html
diff -u germany/ja/medical/index.html ../jconnect-live-check/medical.html
```

## Manual UI QA

Check the main Japanese public pages at these widths: 360px, 390px, 768px, 1024px, 1280px, and 1440px.

Focus on:

- Header and language dropdown
- Home Community, Living, Jobs, Events, and Learn German sections
- Jobs list and detail states
- Community list, filters, detail modal, report/contact flows
- Events hub and retired `/germany/ja/news/` bridge
- Eat, Shopping, and Medical directory fallback states
- Living and Learn German list-card compactness
- No horizontal overflow or overlapping text
