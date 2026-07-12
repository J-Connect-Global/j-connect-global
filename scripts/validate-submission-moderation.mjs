import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const gas = read("apps-script/community-board-api.gs");
const sync = read("scripts/sync-public-data.mjs");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function count(pattern, source) {
  return [...source.matchAll(pattern)].length;
}

function assertPublicJson(relative) {
  const payload = JSON.parse(read(relative));
  const forbidden = new Set([
    "contact_email_private", "contact_email", "contact_name", "manage_token", "manage_token_hash",
    "manage_url", "admin_notes", "rejection_reason", "approval_notified_to",
    "approval_notified_error", "submission_key"
  ]);
  const visit = (value, location) => {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${location}[${index}]`));
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, child]) => {
      if (forbidden.has(key)) failures.push(`${relative} exposes private field ${key} at ${location}.`);
      visit(child, `${location}.${key}`);
    });
  };
  visit(payload, "$ ");
  for (const item of payload.items || []) {
    expect(String(item.status || "").toLowerCase() === "active", `${relative} contains a non-active item.`);
  }
}

expect(count(/^function onOpen\(/gm, gas) === 1, "GAS must contain exactly one onOpen entry point.");
expect(count(/^function doGet\(/gm, gas) === 1 && count(/^function doPost\(/gm, gas) === 1, "GAS entry points are duplicated.");
const onOpen = gas.slice(gas.indexOf("function onOpen()"), gas.indexOf("function dispatchCommunityRequest_"));
expect(onOpen.includes("createMenu('J-Connect管理')"), "Unified administrator menu is missing.");
expect(count(/\.addItem\(/g, onOpen) === 3, "Administrator menu must contain exactly three normal items.");
for (const handler of ["approveSelectedSubmission", "rejectSelectedSubmission", "retrySelectedPublication"]) {
  expect(gas.includes(`function ${handler}(`), `Missing moderation handler ${handler}.`);
}

expect(gas.includes("const JOBS_SHEET_NAME = 'Jobs'"), "Jobs sheet integration is missing.");
expect(gas.includes("function listJobs_()") && gas.includes("PUBLIC_JOB_FIELDS"), "GAS public Jobs response is missing its allowlist.");
const publicJobFields = gas.slice(gas.indexOf("const PUBLIC_JOB_FIELDS"), gas.indexOf("const EDITABLE_POST_FIELDS"));
expect(!publicJobFields.includes("'contact_email'") && !publicJobFields.includes("'contact_name'"), "GAS Jobs allowlist exposes private contact fields.");
expect(gas.includes("job_${Utilities.getUuid()}"), "Job IDs are not generated server-side.");
expect(gas.includes("submission_key") && gas.includes("findJobBySubmissionKey_"), "Job idempotency storage/check is missing.");
expect(gas.includes("LockService.getScriptLock()"), "Spreadsheet updates are not protected by a script lock.");
expect(gas.indexOf("context.sheet.appendRow(row)", gas.indexOf("function submitJobPosting_")) < gas.indexOf("sendJobSubmissionAdminEmail_", gas.indexOf("function submitJobPosting_")), "Job notification occurs before durable storage.");
expect(gas.includes("sendCommunitySubmissionAdminEmail_") && gas.includes("【J-Connect管理】Community新規投稿"), "Community administrator notification is missing.");
expect(gas.includes("Community administrator notification failed") && gas.includes("return {\n    ok: true"), "Community notification failure is not isolated from submission success.");
expect(gas.includes("JOBS_PUBLIC_JSON_URL") && gas.includes("processWaitingApprovalNotifications"), "Jobs publication verification is not part of the shared processor.");
expect(gas.includes("rejection_reason") && gas.includes("sendRejectionEmail_"), "Rejection persistence/email flow is missing.");

expect(sync.includes('return status === "active"'), "Public sync must require exact status=active.");
expect(!sync.includes('publicContactEmail(row, ["contact_email"'), "Private job contact_email is used as a public address.");
expect(!sync.includes("contact_email: applicationEmail"), "Public job output still emits contact_email.");
assertPublicJson("assets/data/community/posts.json");
assertPublicJson("assets/data/jobs/jobs.json");

if (failures.length) {
  console.error("Submission moderation validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Submission moderation validation passed.");
