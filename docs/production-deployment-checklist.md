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
4. Open `https://j-connect-global.com/germany/ja/`.
5. Confirm the page source does not contain stale Home markers such as daily phrase widgets, root-level unavailable language links, or old Home Jobs/Community fallbacks.
6. If needed, run:

```bash
JCONNECT_VALIDATE_LIVE_PRODUCTION=1 node scripts/validate-production-parity.mjs
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

