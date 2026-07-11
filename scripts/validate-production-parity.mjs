import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SITE_ORIGIN = 'https://j-connect-global.com';
const HOME_PATH = 'germany/ja/index.html';
const MEDICAL_PATH = 'germany/ja/medical/index.html';
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
  const localHome = readLocalHtml(HOME_PATH);
  const localMedical = readLocalHtml(MEDICAL_PATH);
  validateHomeMarkers(localHome, `${HOME_PATH} local generated output`);
  validateMedicalMarkers(localMedical, `${MEDICAL_PATH} local generated output`);

  if (LIVE_ENABLED) {
    return validateLiveHome();
  }

  finish('Production parity validation passed for committed generated output. Live production fetch skipped.');
}

function readLocalHtml(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing generated page: ${relPath}`);
    finish();
  }
  return fs.readFileSync(fullPath, 'utf8');
}

async function validateLiveHome() {
  const homeHtml = await fetchLiveHtml('/germany/ja/', 'Home');
  if (homeHtml) validateHomeMarkers(homeHtml, `${SITE_ORIGIN}/germany/ja/ live production`);

  const medicalHtml = await fetchLiveHtml('/germany/ja/medical/', 'Medical');
  if (medicalHtml) validateMedicalMarkers(medicalHtml, `${SITE_ORIGIN}/germany/ja/medical/ live production`);

  finish('Production parity validation passed for committed output and live production.');
}

async function fetchLiveHtml(urlPath, label) {
  try {
    const response = await fetch(`${SITE_ORIGIN}${urlPath}`, {
      headers: { 'user-agent': 'J-Connect production parity check' },
    });
    if (!response.ok) {
      fail(`Live production ${label} fetch failed: HTTP ${response.status}`);
      return '';
    }
    return await response.text();
  } catch (error) {
    fail(`Live production ${label} fetch failed: ${error.message}`);
    return '';
  }
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
    fail(`${label} missing generated Home latest digest marker.`);
  } else {
    const latestRows = (livingMarker.match(/class="portal3-mini portal3-latest-mini"/g) || []).length;
    if (latestRows !== 3) fail(`${label} Home latest digest marker should contain exactly 3 generated mixed-source rows.`);
    if (html.includes('<a class="portal3-panel-more" href="/germany/ja/living/">コンテンツ一覧へ</a>')) {
      fail(`${label} Home latest digest should not render a top-right content list button.`);
    }
    if (/class="portal3-latest-date"[^>]*>[^<]*・/.test(livingMarker)) {
      fail(`${label} Home latest digest date metadata should not repeat the source label.`);
    }
    for (const source of ['living', 'events', 'learn-german']) {
      if (!livingMarker.includes(`data-home-latest-source="${source}"`)) {
        fail(`${label} Home latest digest marker missing ${source} row.`);
      }
    }
    if (/準備中|coming soon|読み込み中|loading\.\.\./i.test(livingMarker)) fail(`${label} Home latest digest marker contains placeholder/loading copy.`);
  }

  const livingSection = extractSectionById(html, 'living');
  const livingArticleCards = (livingSection.match(/class="portal3-card"/g) || []).length;
  if (livingArticleCards < 5) fail(`${label} Home Living section should contain at least 5 article cards.`);

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
  for (const requiredText of [
    '掲載情報は掲載元の提供内容です。',
    '応募前に雇用条件、ビザ要件、連絡先をご確認ください。',
  ]) {
    if (!jobsSection.includes(requiredText)) fail(`${label} Home Jobs section missing current trust copy: ${requiredText}`);
  }

  const eventsMarker = extractMarkedContent(html, 'home-events');
  if (!eventsMarker) {
    fail(`${label} missing generated Home Events marker.`);
  } else {
    validateHomeEventBadges(eventsMarker, label);
  }

  const communitySection = extractSectionById(html, 'community');
  if (!communitySection.includes('data-community-posts')) {
    fail(`${label} Home Community section missing static/GAS post container.`);
  }
}

function validateHomeEventBadges(html, label) {
  const staleBadgePatterns = [
    /<b>\s*日程\s*<\/b>\s*<strong>\s*確認\s*<\/strong>/,
    /<b>\s*冬\s*<\/b>\s*<strong>\s*確認\s*<\/strong>/,
    /日程\s*確認/,
    /冬\s*確認/,
    /æ—¥ç¨‹\s*ç¢ºèª/,
    /å†¬\s*ç¢ºèª/,
  ];
  for (const pattern of staleBadgePatterns) {
    if (pattern.test(html)) fail(`${label} contains stale Home event badge label: ${pattern}`);
  }
  if (!html.includes('公式情報') && !html.includes('開催日') && !html.includes('冬の')) {
    fail(`${label} Home Events marker is missing polished event badge wording.`);
  }
}

function validateMedicalMarkers(html, label) {
  for (const requiredText of [
    '医療上の助言や診断ではありません',
    '緊急時は112',
  ]) {
    if (!html.includes(requiredText)) fail(`${label} missing Medical trust copy: ${requiredText}`);
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
