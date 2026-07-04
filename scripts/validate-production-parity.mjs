import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SITE_ORIGIN = 'https://j-connect-global.com';
const HOME_PATH = 'germany/ja/index.html';
const LIVE_ENABLED = process.argv.includes('--live') || process.env.JCONNECT_VALIDATE_LIVE_PRODUCTION === '1';
const problems = [];

const oldHomeMarkers = [
  'dailyPhrase',
  'daily-phrase',
  'todayPhrase',
  '今日のドイツ語',
  '今日のフレーズ',
  '毎日のフレーズ',
  'languageSelect',
  '/en/',
  '/de/',
  '/germany/en/',
  '/germany/de/',
];

function main() {
  const localHome = readLocalHome();
  validateHomeMarkers(localHome, `${HOME_PATH} local generated output`);

  if (LIVE_ENABLED) {
    return validateLiveHome();
  }

  finish('Production parity validation passed for committed generated output. Live production fetch skipped.');
}

function readLocalHome() {
  const fullPath = path.join(root, HOME_PATH);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing generated Home page: ${HOME_PATH}`);
    finish();
  }
  return fs.readFileSync(fullPath, 'utf8');
}

async function validateLiveHome() {
  try {
    const response = await fetch(`${SITE_ORIGIN}/germany/ja/`, {
      headers: { 'user-agent': 'J-Connect production parity check' },
    });
    if (!response.ok) {
      fail(`Live production Home fetch failed: HTTP ${response.status}`);
    } else {
      validateHomeMarkers(await response.text(), `${SITE_ORIGIN}/germany/ja/ live production`);
    }
  } catch (error) {
    fail(`Live production Home fetch failed: ${error.message}`);
  }

  finish('Production parity validation passed for committed output and live production.');
}

function validateHomeMarkers(html, label) {
  for (const marker of oldHomeMarkers) {
    if (html.includes(marker)) {
      fail(`${label} contains stale Home marker: ${marker}`);
    }
  }

  const languageDropdown = extractBlock(html, 'class="language-dropdown"', '</div>');
  if (!languageDropdown.includes('href="/germany/ja/"') && !languageDropdown.includes('href="/germany/ja/index.html"')) {
    fail(`${label} language dropdown does not expose the Japanese canonical page.`);
  }
  for (const staleLanguage of ['/germany/en/', '/germany/de/', '/en/', '/de/']) {
    if (languageDropdown.includes(`href="${staleLanguage}"`)) {
      fail(`${label} language dropdown exposes unavailable language route: ${staleLanguage}`);
    }
  }

  const livingMarker = extractMarkedContent(html, 'home-living');
  if (!livingMarker) {
    fail(`${label} missing generated Home Living marker.`);
  } else {
    const livingCards = (livingMarker.match(/class="portal3-mini"/g) || []).length;
    if (livingCards < 3) fail(`${label} Home Living marker should contain at least 3 generated mini cards.`);
    if (/準備中|coming soon|読み込み中|loading\.\.\./i.test(livingMarker)) fail(`${label} Home Living marker contains placeholder/loading copy.`);
  }

  const jobsSection = extractSectionById(html, 'jobs');
  for (const marker of [
    'id="homeJobsMini"',
    'data-home-jobs-mini',
    'id="homeJobsCards"',
    'data-home-jobs',
    '/assets/js/jobs-fallback.js',
    '/assets/js/jobs-shared.js',
    'buildDirectoryUrl',
    'directorySheets.jobs',
  ]) {
    if (!html.includes(marker)) fail(`${label} missing Home Jobs generated/fallback marker: ${marker}`);
  }
  if (!jobsSection.includes('/germany/ja/jobs/posting/')) {
    fail(`${label} Home Jobs section should link to the job posting guidance page.`);
  }

  const communitySection = extractSectionById(html, 'community');
  if (!communitySection.includes('data-community-posts')) {
    fail(`${label} Home Community section missing static/GAS post container.`);
  }
}

function extractMarkedContent(html, marker) {
  const start = `<!-- CONTENT:${marker}:start -->`;
  const end = `<!-- CONTENT:${marker}:end -->`;
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return '';
  return html.slice(startIndex + start.length, endIndex);
}

function extractSectionById(html, id) {
  const match = html.match(new RegExp(`<section\\b[^>]*id=["']${escapeRegExp(id)}["'][\\s\\S]*?<\\/section>`, 'i'));
  return match?.[0] || '';
}

function extractBlock(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start === -1) return '';
  const close = html.indexOf(endMarker, start);
  if (close === -1) return '';
  return html.slice(start, close + endMarker.length);
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(message) {
  problems.push(message);
}

function finish(successMessage) {
  if (problems.length) {
    console.error(`Production parity validation failed with ${problems.length} issue(s):`);
    for (const problem of problems) console.error(`- ${problem}`);
    if (!LIVE_ENABLED) {
      console.error('Live production checks are manual-only. Run with JCONNECT_VALIDATE_LIVE_PRODUCTION=1 after GitHub Pages deploys main.');
    }
    process.exit(1);
  }
  if (successMessage) console.log(successMessage);
}

await main();
