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
const css = read('assets/css/community.css');
const gas = read('apps-script/community-board-api.gs');

expect(!listing.includes('投稿内容は送信前に確認してください。'), 'Community hero still contains the removed pre-submit text.');
expect(!listing.includes('問題のある投稿を通報する'), 'Community hero still contains the generic report link.');
expect(!listing.includes('copyShareUrl'), 'Community modal still contains copyShareUrl.');
expect(!detail.includes('copyDetailUrl'), 'Standalone detail still contains copyDetailUrl.');
expect(!detail.includes('URLをコピー'), 'Standalone detail still contains a URL-copy action.');
expect(!detail.includes('安心の目安'), 'Standalone detail renderer still contains the safety section.');
expect(detail.includes('btn btn-primary') && detail.includes('btn btn-soft'), 'Standalone detail action hierarchy is missing shared primary/soft buttons.');
expect(detail.includes('save-button inline') && css.includes('min-inline-size:112px'), 'Save actions do not reserve width for 保存済み.');
expect(report.includes('id="reportTarget"') && report.includes("action: 'getPost'"), 'Report page does not load and display a canonical target post.');
expect(report.includes('form_started_at') && report.includes('website'), 'Report form is missing anti-abuse fields.');
expect(gas.includes('function submitReport_(params)') && gas.includes('reportNotificationHtml_'), 'GAS report handling is not structured.');
expect(gas.includes('GITHUB_ACTIONS_TOKEN') && gas.includes('processWaitingCommunityApprovalNotifications'), 'GAS publication verification queue is missing.');
expect(gas.includes('COMMUNITY_PUBLIC_POSTS_JSON_URL') && gas.includes("approval_notified_status: 'sent'"), 'GAS does not verify deployed JSON before marking approval notifications sent.');

if (failures.length) {
  console.error('Community validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Community validation passed.');
