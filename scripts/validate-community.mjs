import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const listing = read('germany/ja/community/index.html');
const detail = read('germany/ja/community/post/index.html');
const report = read('germany/ja/community/report/index.html');
const contact = read('germany/ja/community/contact/index.html');
const thanks = read('germany/ja/community/thanks/index.html');
const reportComplete = read('germany/ja/community/report/complete/index.html');
const contactComplete = read('germany/ja/community/contact/complete/index.html');
const css = read('assets/css/community.css');
const gas = read('apps-script/community-board-api.gs');
const shared = read('assets/js/community-shared.js');
const socialShare = read('assets/js/social-share.js');
const publicDetailScript = read('assets/js/public-detail-pages.js');
const publicDetailCss = read('assets/css/public-detail-pages.css');

expect(!listing.includes('投稿内容は送信前に確認してください。'), 'Community hero still contains the removed pre-submit text.');
expect(!listing.includes('問題のある投稿を通報する'), 'Community hero still contains the generic report link.');
expect(!listing.includes('copyShareUrl'), 'Community modal still contains copyShareUrl.');
expect(!detail.includes('copyDetailUrl'), 'Standalone detail still contains copyDetailUrl.');
expect(!detail.includes('URLをコピー'), 'Standalone detail still contains a URL-copy action.');
expect(!detail.includes('安心の目安'), 'Standalone detail renderer still contains the safety section.');
expect(detail.includes('btn btn-primary') && detail.includes('btn btn-soft'), 'Standalone detail action hierarchy is missing shared primary/soft buttons.');
expect(detail.includes('save-button inline') && css.includes('min-inline-size:112px'), 'Save actions do not reserve width for 保存済み.');
expect(report.includes('id="reportTarget"') && report.includes('COMMUNITY_STATIC_POSTS_URL'), 'Report page does not load its canonical target from public JSON.');
expect(report.includes('form_started_at') && report.includes('website'), 'Report form is missing anti-abuse fields.');
expect(report.includes('./complete/?post_id=') && !report.includes("location.assign('../thanks/')"), 'Report success must redirect to report/complete with post_id.');
expect(contact.includes('./complete/?post_id=') && !contact.includes("location.assign('../thanks/')"), 'Contact success must redirect to contact/complete with post_id.');
expect(reportComplete.includes('通報を受け付けました') && reportComplete.includes('reportedPostLink'), 'Report completion page is missing required content or post return action.');
expect(contactComplete.includes('メッセージを送信しました') && contactComplete.includes('contactedPostLink'), 'Contact completion page is missing required content or post return action.');
expect(!thanks.includes('submissionSummary') && !thanks.includes('cancelCommunityPostRequest') && !thanks.includes('別の投稿を作成する'), 'Legacy thanks page still contains post-specific submission or cancellation behavior.');
expect(thanks.indexOf('<!-- LAYOUT:ja-footer:start -->') > thanks.lastIndexOf('</main>'), 'Legacy thanks footer must appear after </main>.');
expect(listing.includes('id="countryFilter"') && listing.includes('id="regionFilter"'), 'Community listing is missing country and region filters.');
expect(listing.includes('id="regionFilter" aria-label="地域で絞り込み" disabled'), 'Community region filter must start disabled.');
expect(!listing.includes('areaFilter') && !listing.includes('state.area'), 'Legacy area filter implementation remains.');
expect(shared.includes('COMMUNITY_LOCATION_CONFIG') && shared.includes('communityLocationConfig'), 'Shared Community location configuration is missing.');
expect(!shared.includes('isLikelyTestPost') && !listing.includes('isLikelyTestPost'), 'Community runtime still contains content-based test-post filtering.');
expect(listing.includes('COMMUNITY_STATIC_POSTS_URL') && !listing.includes('GAS_FALLBACK_TIMEOUT_MS'), 'Community list is not public-JSON-only.');
expect(detail.includes('COMMUNITY_STATIC_POSTS_URL') && !detail.includes('GAS_FALLBACK_TIMEOUT_MS'), 'Community detail is not public-JSON-only.');
expect(detail.includes('この投稿は見つからないか、現在公開されていません。') && detail.includes('noindex, follow'), 'Community detail lacks the safe non-public state.');
expect(contact.includes('COMMUNITY_STATIC_POSTS_URL') && report.includes('COMMUNITY_STATIC_POSTS_URL'), 'Community contact/report target reads do not use public JSON.');
expect(contact.includes('form_started_at') && contact.includes('website') && contact.includes('form-privacy-notice'), 'Community contact form is missing privacy or anti-abuse controls.');
expect(!detail.includes('CITY_OPTIONS_BY_COUNTRY') && detail.includes('communityLocationConfig'), 'Post form does not use the shared Community location configuration.');
expect(listing.includes('communityLocationConfig') && listing.includes('normalizeCommunityCountry'), 'Listing does not use the shared Community location configuration.');
expect(!listing.includes('最新データを取得できませんでした。保存済みの表示を継続しています。'), 'Community cache warning is still embedded in initial HTML.');
expect(listing.includes('data-jconnect-query-robots') && listing.includes('params.has("id")') && listing.includes('noindex, follow'), 'Community query detail URLs do not receive rendered noindex protection.');
expect(!/<h[1-6]\b[^>]*>\s*<\/h[1-6]>/i.test(listing.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')), 'Community initial HTML contains an empty heading.');
expect(!/<h[1-6]\b[^>]*>\s*<\/h[1-6]>/i.test(listing), 'Community rendered templates contain an empty heading.');
const atomicEmptyState = listing.slice(
  listing.indexOf('function showEmptyState(title, body, mode)'),
  listing.indexOf('\n    function scorePost', listing.indexOf('function showEmptyState(title, body, mode)'))
);
expect(
  atomicEmptyState.includes('UI.renderDataState(els.emptyState')
    && atomicEmptyState.includes('title,')
    && atomicEmptyState.includes('body,')
    && atomicEmptyState.includes("headingLevel: 2")
    && atomicEmptyState.includes("insertAdjacentHTML(\"beforeend\"")
    && atomicEmptyState.indexOf('renderEmptyActions(mode)') < atomicEmptyState.indexOf('setEmptyStateVisible(true)'),
  'Community empty states must use the shared escaped renderer and add actions before becoming visible.'
);
expect(
  listing.includes('showEmptyState(emptyTitle, emptyBody, noPublicPosts ? "public-empty" : "filters")')
    && /showEmptyState\([\s\S]*?"error"\s*\);/.test(listing.slice(listing.indexOf('async function loadPosts()'))),
  'Community loading result does not preserve distinct error, public-empty, and filtered-empty states.'
);
expect(!shared.includes('...post'), 'Shared Community normalizer retains arbitrary source fields instead of a public allowlist.');
expect(detail.includes('data-social-share="manual"') && socialShare.includes('manualShare') && socialShare.includes('target.root.querySelectorAll(AUTO_SHARE_SELECTOR)'), 'Community detail can still create duplicate share triggers.');
expect(gas.includes('function submitReport_(params)') && gas.includes('reportNotificationHtml_'), 'GAS report handling is not structured.');
expect(gas.includes("acquireSubmissionRateLimit_('submitInquiry'") && gas.includes("website: { max: 0 }"), 'Community inquiry proxy is missing server-side abuse controls.');
expect(gas.includes('GITHUB_ACTIONS_TOKEN') && gas.includes('processWaitingCommunityApprovalNotifications'), 'GAS publication verification queue is missing.');
expect(gas.includes('COMMUNITY_PUBLIC_POSTS_JSON_URL') && gas.includes("approval_notified_status: 'sent'"), 'GAS does not verify deployed JSON before marking approval notifications sent.');
expect(detail.includes('preview-default-image') && detail.includes('/assets/img/placeholders/jconnect-default-card.webp'), 'Image-less submission preview does not use the actual default card.');
expect(detail.includes('previewModalImageObjectUrls') && detail.includes('revokeAllPreviewModalImageObjectUrls'), 'Submission preview does not manage modal object URLs.');
expect(detail.includes('選択した画像') && detail.includes('getPreviewModalImageObjectUrl(file)'), 'Submission preview does not render the selected files.');
expect(publicDetailScript.includes("dialog.addEventListener('close'") && publicDetailScript.includes('lastTrigger.focus'), 'Public detail lightbox does not restore focus.');
expect(publicDetailScript.includes("event.key !== 'Tab'") && publicDetailScript.includes('public-lightbox-open'), 'Public detail lightbox is missing focus trapping or scroll locking.');
expect(publicDetailCss.includes('body.public-lightbox-open') && publicDetailCss.includes('overflow: hidden'), 'Public detail lightbox scroll lock CSS is missing.');

if (failures.length) {
  console.error('Community validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Community validation passed.');
