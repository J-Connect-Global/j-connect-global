import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { formatDate } from "./test-helpers/gas-format-date.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gas = fs.readFileSync(path.join(root, "apps-script/community-board-api.gs"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class MockSheet {
  constructor(name, headers) {
    this.name = name;
    this.rows = [headers.slice()];
    this.parent = null;
  }
  getName() { return this.name; }
  getParent() { return this.parent; }
  getSheetId() { return this.name === "Jobs" ? 2 : 1; }
  getLastRow() { return this.rows.length; }
  getDataRange() { return { getValues: () => this.rows.map((row) => row.slice()), getFormulas: () => this.rows.map((row) => row.map(() => '')) }; }
  getActiveRange() { return { getRow: () => Math.max(2, this.rows.length) }; }
  appendRow(row) { this.rows.push(row.slice()); }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      setValues: (values) => {
        for (let r = 0; r < rowCount; r += 1) {
          while (this.rows.length < row + r) this.rows.push([]);
          for (let c = 0; c < columnCount; c += 1) this.rows[row + r - 1][column + c - 1] = values[r][c];
        }
      },
      setValue: (value) => {
        while (this.rows.length < row) this.rows.push([]);
        this.rows[row - 1][column - 1] = value;
      }
    };
  }
}

class MockSpreadsheet {
  constructor(sheets) {
    this.sheets = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet]));
    sheets.forEach((sheet) => { sheet.parent = this; });
    this.activeSheet = sheets[0];
  }
  getSheetByName(name) { return this.sheets[name] || null; }
  getSheets() { return Object.values(this.sheets); }
  setSpreadsheetTimeZone(value) { this.timeZone = value; }
  getId() { return this.id || "mock-spreadsheet"; }
  getActiveSheet() { return this.activeSheet; }
  getUrl() { return "https://docs.google.com/spreadsheets/d/mock"; }
}

function createRuntime(sheets, sendEmail, options = {}) {
  const spreadsheet = new MockSpreadsheet(sheets);
  const activeSpreadsheet = options.activeSpreadsheet || spreadsheet;
  const spreadsheetsById = options.spreadsheetsById || {};
  const properties = options.properties || {};
  const openedSpreadsheetIds = [];
  let uuidCounter = 0;
  let now = options.now || Date.now();
  const cache = new Map();
  class MockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const sandbox = {
    console: options.console || console,
    Date: MockDate,
    JSON,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => properties[name] || "",
        setProperty: (name, value) => { properties[name] = String(value); },
        deleteProperty: (name) => { delete properties[name]; }
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => activeSpreadsheet,
      openById: (id) => {
        openedSpreadsheetIds.push(id);
        return spreadsheetsById[id] || spreadsheet;
      },
      getUi: () => ({ alert: () => {}, prompt: () => ({}) })
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, hasLock: () => true, releaseLock: () => {} })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => {
          const entry = cache.get(key);
          if (!entry) return null;
          if (entry.expiresAt <= now) {
            cache.delete(key);
            return null;
          }
          return entry.value;
        },
        put: (key, value, seconds = 600) => cache.set(key, { value, expiresAt: now + seconds * 1000 }),
        remove: (key) => cache.delete(key)
      })
    },
    Utilities: {
      formatDate,
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      getUuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`,
      computeDigest: (_algorithm, input) => [...crypto.createHash("sha256").update(String(input), "utf8").digest()]
    },
    validateJConnectEmailConfiguration_: () => ({ adminEmail: "admin@example.com" }),
    isJConnectValidEmail_: (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "")),
    sendZohoEmail_: sendEmail,
    DriveApp: {},
    UrlFetchApp: {},
    ContentService: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(gas, sandbox, { filename: "apps-script/community-board-api.gs" });
  return {
    sandbox,
    spreadsheet,
    openedSpreadsheetIds,
    cache,
    advanceTime: (milliseconds) => { now += milliseconds; }
  };
}

function rowObject(sheet, rowIndex = 1) {
  return Object.fromEntries(sheet.rows[0].map((header, index) => [header, sheet.rows[rowIndex][index]]));
}

function appendObjectRow(sheet, values) {
  sheet.appendRow(sheet.rows[0].map((header) => values[header] ?? ""));
}

function validJobParams(now, overrides = {}) {
  return {
    company_name: "Example GmbH", contact_name: "担当者", contact_email: "person@example.com",
    company_url: "https://example.com", position_title: "Engineer", city: "Berlin",
    employment_type: "Full-time", salary: "50000 EUR", visa_support: "yes", start_date: "2026-09",
    publish_date: "2026-08", apply_method: "Web", summary: "Summary", job_details: "Details",
    requirements: "Requirements", free_comment: "Comment", logo_url: "https://example.com/logo.png",
    job_preview: "Preview", website: "", form_started_at: String(now - 5000),
    ...overrides
  };
}

function jobSheet() {
  const jobHeaders = [
    "company_name", "contact_name", "contact_email", "company_url", "position_title", "city",
    "employment_type", "salary", "visa_support", "start_date", "publish_date", "apply_method",
    "summary", "job_details", "requirements", "free_comment", "logo_url", "job_preview"
  ];
  return new MockSheet("Jobs", jobHeaders);
}

function testSpreadsheetResolution() {
  const active = { source: "active", getId: () => "active-id" };
  const master = { source: "master" };
  const legacy = { source: "legacy" };
  const primaryRuntime = createRuntime([], () => {}, {
    activeSpreadsheet: active,
    properties: { MASTER_SPREADSHEET_ID: "  master-id  ", COMMUNITY_SPREADSHEET_ID: " legacy-id " },
    spreadsheetsById: { "master-id": master, "legacy-id": legacy }
  });
  assert(primaryRuntime.sandbox.getSpreadsheet_() === master, "MASTER_SPREADSHEET_ID did not take priority.");
  assert(primaryRuntime.openedSpreadsheetIds.join() === "master-id", "Master Spreadsheet property was not trimmed.");

  const legacyRuntime = createRuntime([], () => {}, {
    activeSpreadsheet: active,
    properties: { MASTER_SPREADSHEET_ID: "   ", COMMUNITY_SPREADSHEET_ID: " legacy-id " },
    spreadsheetsById: { "legacy-id": legacy }
  });
  assert(legacyRuntime.sandbox.getSpreadsheet_() === legacy, "COMMUNITY_SPREADSHEET_ID was not used as fallback.");
  assert(legacyRuntime.openedSpreadsheetIds.join() === "legacy-id", "Legacy Spreadsheet property was not trimmed.");

  const activeRuntime = createRuntime([], () => {}, {
    activeSpreadsheet: active,
    properties: { MASTER_SPREADSHEET_ID: " ", COMMUNITY_SPREADSHEET_ID: "\t" }
  });
  assert(activeRuntime.sandbox.getSpreadsheet_() === active, "Active Spreadsheet was not used when both properties were blank.");
  assert(activeRuntime.openedSpreadsheetIds.length === 0, "A configured Spreadsheet was opened for blank properties.");

  const headlessRuntime = createRuntime([], () => {}, {
    activeSpreadsheet: active,
    properties: { MASTER_SPREADSHEET_ID: "master-id" },
    spreadsheetsById: { "master-id": master }
  });
  headlessRuntime.sandbox.SpreadsheetApp.getActiveSpreadsheet = () => null;
  assert(headlessRuntime.sandbox.getSpreadsheet_() === master, "Headless API/trigger lost its configured Spreadsheet.");
}

function testBoundModerationSelection() {
  // openById can refer to the same file without the browser's selected row.
  const headers = ["post_id", "status", "category1", "title", "body"];
  const visible = new MockSheet("Community Posts", headers);
  visible.rows.unshift([]); // Production has an instruction row above its headers.
  while (visible.rows.length < 8) visible.rows.push([]);
  visible.rows.push(["post-selected", "active", "質問", "Selected post", "Body"]);
  visible.getActiveRange = () => ({ getRow: () => 9 });
  const bound = new MockSpreadsheet([visible]);
  bound.id = "master-id";
  const reopened = new MockSheet("Community Posts", headers);
  reopened.rows = visible.rows.map(row => row.slice());
  reopened.getActiveRange = () => ({ getRow: () => 1 });
  for (const property of ["MASTER_SPREADSHEET_ID", "COMMUNITY_SPREADSHEET_ID"]) {
    const runtime = createRuntime([reopened], () => {}, {
      activeSpreadsheet: bound,
      properties: { [property]: " master-id " }
    });
    const selected = runtime.sandbox.getSelectedModerationContext_();
    assert(selected.rowNumber === 9 && selected.item.post_id === "post-selected", "Menu lost the browser's selected submission.");
    assert(runtime.openedSpreadsheetIds.length === 0, "Menu reopened its active Spreadsheet and discarded selection.");
    visible.getActiveRange = () => ({ getRow: () => 2 });
    let rejected = false;
    try { runtime.sandbox.getSelectedModerationContext_(); } catch (error) { rejected = error.message === "SELECT_SUBMISSION_ROW"; }
    assert(rejected, "Header selection was accepted for moderation.");
    visible.getActiveRange = () => ({ getRow: () => 9 });
  }
}

function testBerlinTimestamps() {
  const { sandbox } = createRuntime([], () => {});
  for (const [utc, expected] of [
    ['2026-10-18T07:22:05.298Z', '2026-10-18T09:22:05.298+02:00'],
    ['2026-12-18T07:22:05.298Z', '2026-12-18T08:22:05.298+01:00'],
    ['2026-10-25T00:30:00.000Z', '2026-10-25T02:30:00.000+02:00'],
    ['2026-10-25T01:30:00.000Z', '2026-10-25T02:30:00.000+01:00']
  ]) {
    const formatted = sandbox.berlinTimestamp_(new Date(utc));
    assert(formatted === expected, `Incorrect Berlin timestamp: ${formatted}`);
    assert(Date.parse(formatted) === Date.parse(utc), 'Timestamp conversion changed the instant.');
  }
  const community = new MockSheet('Community Posts', ['post_id', 'created_at', 'updated_at', 'body', 'availability_date']);
  appendObjectRow(community, { post_id: 'post-old', created_at: '2026-10-18T07:22:05.298Z', updated_at: '2026-12-18T07:22:05.298Z', body: '=private content', availability_date: '2026-10-18' });
  const runtime = createRuntime([community], () => { throw new Error('Migration must not send email'); });
  const preview = runtime.sandbox.previewBerlinManagementTimestamps();
  assert(preview.dryRun && preview.changed === 2 && rowObject(community).created_at.endsWith('Z'), 'Migration preview wrote to a cell.');
  const first = runtime.sandbox.useBerlinManagementTimestamps();
  assert(first.changed === 2 && runtime.spreadsheet.timeZone === 'Europe/Berlin', 'Existing timestamp migration failed.');
  const row = rowObject(community);
  assert(row.created_at === '2026-10-18T09:22:05.298+02:00' && row.updated_at === '2026-12-18T08:22:05.298+01:00', 'Migration did not handle summer and winter dates.');
  assert(row.body === '=private content' && row.availability_date === '2026-10-18', 'Migration modified unrelated data.');
  assert(runtime.sandbox.useBerlinManagementTimestamps().changed === 0, 'Migration is not idempotent.');
}

function testJobPersistenceIdempotencyAndThrottling() {
  const now = Date.now();
  const jobs = jobSheet();
  const emails = [];
  const runtime = createRuntime([jobs], (message) => { emails.push(message); return { sent: true }; }, { now });
  const { sandbox } = runtime;
  const params = validJobParams(now);
  const first = sandbox.submitJobPosting_(params);
  assert(first.ok && first.status === "pending", "Job submission did not succeed as pending.");
  assert(jobs.rows.length === 2, "Job submission did not append exactly one row.");
  const saved = rowObject(jobs);
  assert(/^job_/.test(saved.job_id), "Job ID was not generated.");
  assert(saved.status === "pending" && saved.published_at === "", "Job management state is incorrect.");
  assert(saved.contact_name === "担当者" && saved.contact_email === "person@example.com", "Private contact fields were not stored for review.");
  assert(saved.submission_key, "Submission key was not stored.");
  assert(emails.length === 2, "Administrator and applicant receipt emails were not sent.");

  const second = sandbox.submitJobPosting_(params);
  assert(second.ok && second.duplicate, "Repeated HTTP submission was not recognized as a duplicate.");
  assert(second.job_id === first.job_id, "Exact retry did not return the existing job_id.");
  assert(jobs.rows.length === 2, "Repeated HTTP submission created a second Jobs row.");
  assert(emails.length === 2, "Duplicate request unexpectedly sent duplicate receipt emails.");

  runtime.advanceTime(1000);
  const sameContact = sandbox.submitJobPosting_(validJobParams(now + 1000, { position_title: "Designer" }));
  assert(!sameContact.ok && sameContact.code === "RATE_LIMITED", "New submission from the same contact was not rate limited.");
  assert(jobs.rows.length === 2 && emails.length === 2, "Rate-limited submission created a row or sent email.");

  const differentContact = sandbox.submitJobPosting_(validJobParams(now + 1000, {
    contact_email: "other@example.com", position_title: "Designer"
  }));
  assert(differentContact.ok && differentContact.status === "pending", "Different contact email was incorrectly rate limited.");
  assert(jobs.rows.length === 3 && emails.length === 4, "Different contact submission was not stored and notified once.");

  runtime.advanceTime(299000);
  const afterExpiry = sandbox.submitJobPosting_(validJobParams(now + 300000, { position_title: "Product Manager" }));
  assert(afterExpiry.ok && afterExpiry.status === "pending", "Same contact was not accepted after the five-minute throttle expired.");
  assert(jobs.rows.length === 4 && emails.length === 6, "Post-expiry submission was not stored and notified once.");

  const cacheKeys = [...runtime.cache.keys()];
  assert(cacheKeys.every((key) => /^jconnect_form_rate:[a-f0-9]{64}$/.test(key)), "Rate-limit cache key is not SHA-256-derived.");
  assert(cacheKeys.every((key) => !key.includes("person@example.com") && !key.includes("other@example.com")), "Raw email leaked into a rate-limit cache key.");
}

function testCommunityAdminFailureIsolation() {
  const community = new MockSheet("Community Posts", [
    "post_id", "status", "category1", "category2", "title", "body", "country", "region", "city",
    "nickname", "price", "availability_date", "contact_email_private", "created_at", "updated_at",
    "published_at", "manage_token_hash", "manage_url", "last_modified_at", "last_modified_action"
  ]);
  const emails = [];
  const { sandbox } = createRuntime([community], (message) => {
    if (message.to === "admin@example.com") throw new Error("ZOHO_SEND_FAILED");
    emails.push(message);
    return { sent: true };
  });
  const result = sandbox.createPost_({
    category1: "質問", category2: "生活", title: "テスト投稿", body: "投稿本文",
    contact_email_private: "poster@example.com", website: "", country: "", city: ""
  });
  assert(result.ok && result.email_sent, "Community API failed because only the administrator email failed.");
  assert(community.rows.length === 2, "Community row was removed or not saved after notification failure.");
  const saved = rowObject(community);
  assert(saved.status === "pending", "Community submission was not stored as pending.");
  assert(emails.length === 1 && emails[0].to === "poster@example.com", "Existing submitter receipt email was not preserved.");
}

function testCommunityPublicLifecycleAndCacheBypass() {
  const now = Date.parse("2026-07-13T12:00:00Z");
  const community = new MockSheet("Community Posts", [
    "post_id", "status", "category1", "title", "body", "moderation_status",
    "deleted", "is_deleted", "archive", "archived", "is_archived", "hidden", "is_hidden",
    "deleted_at", "hidden_at", "expires_at", "contact_email_private"
  ]);
  const expectedIds = [
    "post_10d2f796-9555-4358-ab98-95de74346cad",
    "post_066f3c93-7f73-46a3-9c89-e38d47f7308d",
    "post_cd6cadde-3221-4de3-8f8d-935d66331457",
    "post_79f6dfd5-86c4-4c68-bf50-f8a7a1993bfe",
    "post_361ec368-085b-42da-86e4-2c6d3dd2c28a",
    "post_23baeb1d-3d92-4438-9350-e04029bd3add",
    "post_807cffe7-b1af-41c0-89ee-c54b57ce44c5"
  ];
  expectedIds.forEach((postId, index) => appendObjectRow(community, {
    post_id: postId,
    status: "active",
    category1: "question",
    title: index === 0 ? "test" : index === 1 ? "\u30c6\u30b9\u30c8" : `active-${index}`,
    body: index === 0 ? "test" : index === 1 ? "\u30c6\u30b9\u30c8" : `body-${index}`,
    contact_email_private: "private@example.com"
  }));

  for (const status of ["", "pending", "rejected", "hidden", "deleted", "inactive", "draft", "spam", "closed"]) {
    appendObjectRow(community, { post_id: `excluded-status-${status || "blank"}`, status, category1: "question", title: "normal", body: "normal" });
  }
  for (const flag of ["deleted", "is_deleted", "archive", "archived", "is_archived", "hidden", "is_hidden"]) {
    appendObjectRow(community, { post_id: `excluded-${flag}`, status: "active", category1: "question", title: "normal", body: "normal", [flag]: true });
  }
  appendObjectRow(community, { post_id: "excluded-deleted-at", status: "active", category1: "question", title: "normal", body: "normal", deleted_at: "2026-07-12T00:00:00Z" });
  appendObjectRow(community, { post_id: "excluded-hidden-at", status: "active", category1: "question", title: "normal", body: "normal", hidden_at: "2026-07-12T00:00:00Z" });
  appendObjectRow(community, { post_id: "excluded-expired", status: "active", category1: "question", title: "normal", body: "normal", expires_at: "2026-07-12T00:00:00Z" });

  const { sandbox } = createRuntime([community], () => ({ sent: true }), { now });
  const initial = sandbox.listPosts_({ bypassCache: "true", includeClosed: "false" });
  assert(initial.count === 7 && initial.items.length === 7, "GAS did not return exactly seven lifecycle-eligible rows.");
  assert(expectedIds.every((id) => initial.items.some((item) => item.post_id === id)), "GAS lost an expected Community post ID.");
  assert(initial.items.some((item) => item.title === "test" && item.body === "test"), "GAS suppressed active test/test content.");
  assert(initial.items.some((item) => item.title === "\u30c6\u30b9\u30c8" && item.body === "\u30c6\u30b9\u30c8"), "GAS suppressed active Japanese test content.");
  assert(initial.items.every((item) => !("contact_email_private" in item)), "GAS exposed a private Community field.");

  appendObjectRow(community, { post_id: "post-cache-bypass", status: "active", category1: "question", title: "new", body: "new" });
  const cached = sandbox.listPosts_({ includeClosed: "false" });
  assert(cached.count === 7, "ordinary GAS list did not use the populated cache in the test harness.");
  const bypassed = sandbox.listPosts_({ bypassCache: "true", includeClosed: "false" });
  assert(bypassed.count === 8 && bypassed.items.some((item) => item.post_id === "post-cache-bypass"), "bypassCache=true did not bypass the stale GAS cache.");
  assert(!sandbox.getPost_({ id: "excluded-status-closed" }).ok, "GAS detail endpoint exposed a closed post.");
}

function testCommunityInquiryPrivacyAndAbuseControls() {
  const now = Date.parse("2026-07-16T12:00:00Z");
  const community = new MockSheet("Community Posts", [
    "post_id", "status", "category1", "title", "body", "contact_email_private", "expires_at"
  ]);
  appendObjectRow(community, {
    post_id: "post-contactable",
    status: "active",
    category1: "質問",
    title: "公開投稿",
    body: "公開本文",
    contact_email_private: "poster@example.com",
    expires_at: ""
  });
  const emails = [];
  const runtime = createRuntime([community], (message) => { emails.push(message); return { sent: true }; }, { now });
  const params = {
    post_id: "post-contactable",
    sender_name: "問い合わせ者",
    sender_email: "sender@example.com",
    subject: "投稿について",
    message: "詳しい受け渡し方法を教えてください。",
    website: "",
    form_started_at: String(now - 5000)
  };

  const result = runtime.sandbox.submitInquiry_(params);
  assert(!result.ok && result.code === "MESSAGING_REQUIRED", "Legacy inquiry must not disclose sender email.");
  assert(!JSON.stringify(result).includes("poster@example.com"), "Community inquiry response exposed the poster email.");
  assert(emails.length === 0, "Legacy inquiry forwarded an email.");


  const repeated = runtime.sandbox.submitInquiry_(params);
  assert(!repeated.ok && repeated.code === "RATE_LIMITED", "Repeated Community inquiry was not rate limited.");
  assert(emails.length === 0, "Rate-limited Community inquiry sent an email.");

  const bot = runtime.sandbox.submitInquiry_({
    ...params,
    sender_email: "bot@example.com",
    website: "https://spam.example"
  });
  assert(!bot.ok && bot.code === "HONEYPOT", "Community inquiry honeypot was not enforced.");
  assert(emails.length === 0, "Honeypot Community inquiry sent an email.");
}

function testPublicPayloadCredentialSanitization() {
  const { sandbox } = createRuntime([], () => ({ sent: true }));
  assert(sandbox.isSafePublicId_("日本語-id_1") === true, "GAS rejected a valid Unicode public ID.");
  assert(sandbox.isSafePublicId_("abc<script>") === false, "GAS accepted markup characters in a public ID.");
  assert(sandbox.isSafePublicId_("abc\u0000def") === false, "GAS accepted a control character in a public ID.");
  assert(sandbox.isSafePublicSlug_("manage-token-secret") === false, "GAS accepted a credential-like public slug.");

  const post = sandbox.publicPostPayload_({
    _rowNumber: 2,
    post_id: "poster@example.com",
    status: "active",
    image_url_1: "https://cdn.example.com/photo.jpg",
    image_url_2: "/%2561dmin/review.jpg",
    image_url_3: "https://cdn.example.com/photo.jpg#accessToken=private",
    images: ["/assets/photo.jpg", "https://cdn.example.com/photo.jpg?api_key=private"]
  });
  assert(post.id === "community-row-2" && post.post_id === "community-row-2", "GAS exposed an unsafe Community ID.");
  assert(post.image_url_1 === "https://cdn.example.com/photo.jpg", "GAS removed a safe Community image URL.");
  assert(post.image_url_2 === "" && post.image_url_3 === "", "GAS exposed a private Community image URL.");
  assert(Array.isArray(post.images) && post.images.length === 1 && post.images[0] === "/assets/photo.jpg", "GAS did not sanitize a Community image array.");

  const job = sandbox.publicJobPayload_({
    _rowNumber: 4,
    job_id: "https://example.com/manage?token=private",
    slug: "person@example.com",
    status: "active",
    detail_url: "/jobs/example",
    apply_url: "https://jobs.example.com/apply#authorization_code=private",
    application_url: "https://jobs.example.com/apply?X-Amz-Credential=private",
    company_url: "https://jobs.example.com/%2561dmin",
    source_url: "https://service.internal/listing",
    logo_url: "/assets/logo.png",
    apply_method: "Apply to recruiter@example.com"
  });
  assert(job.id === "job-row-4" && job.job_id === "job-row-4" && job.slug === "job-row-4", "GAS exposed an unsafe Jobs identifier.");
  assert(job.detail_url === "/jobs/example" && job.logo_url === "/assets/logo.png", "GAS removed a safe Jobs URL.");
  assert(job.apply_url === "" && job.application_url === "" && job.company_url === "", "GAS exposed a credential or private-path Jobs URL.");
  assert(job.source_url === "" && job.apply_method === "", "GAS Jobs public-field sanitization is incorrect.");
  assert(sandbox.safePublicApplicationMethod_("Use the web form") === "Use the web form", "GAS removed a safe application method.");
  assert(sandbox.safePublicApplicationMethod_("Apply at https://jobs.example.com/#access_token=private") === "", "GAS exposed a credential URL in application text.");
  for (const encodedPrivateMethod of [
    "Apply https%3A%2F%2Fuser%3Apassword%40example.com%2Fpublic",
    "Apply https%3A%2F%2F10.0.0.1%2Fpublic",
    "Apply %2F%2F127.0.0.1%2Fpublic"
  ]) {
    assert(sandbox.safePublicApplicationMethod_(encodedPrivateMethod) === "", `GAS exposed encoded private application data: ${encodedPrivateMethod}`);
  }
  assert(sandbox.safePublicUrl_("https://jobs.example.com/apply?candidate=private@example.com", false) === "", "GAS exposed an email-bearing URL.");
  assert(sandbox.safePublicUrl_("http://[::ffff:c0a8:114]/apply", false) === "", "GAS exposed an IPv4-mapped private-network URL.");
  for (const privateHostUrl of [
    "http://2130706433/apply",
    "http://127.1/apply",
    "http://0x7f000001/apply",
    "http://0177.0.0.1/apply",
    "http://[0:0:0:0:0:0:0:1]/apply",
    "http://[0:0:0:0:0:ffff:c0a8:114]/apply",
    "http://[0000::1]/apply",
    "http://[fec0::1]/apply",
    "http://[ff02::1]/apply"
  ]) {
    assert(sandbox.safePublicUrl_(privateHostUrl, false) === "", `GAS exposed a non-public host: ${privateHostUrl}`);
  }
  assert(sandbox.safePublicUrl_("https://jobs.example.com/out?next=https%3A%2F%2Fother.example%2Fadmin%3Faccess_token%3Dprivate", false) === "", "GAS exposed a nested credential URL.");
  assert(sandbox.safePublicUrl_("https://jobs.example.com/out?next=https%3A%2F%2Fother.example%2Fadmin%3Fview%3Dreview", false) === "", "GAS exposed a nested management URL.");
  assert(sandbox.safePublicUrl_("https://jobs.example.com/out?next=http%3A%2F%2F192.168.1.20%2Freview", false) === "", "GAS exposed a nested private-network URL.");
  assert(sandbox.safePublicUrl_("https://jobs.example.com/out?next=%2F%2F127.0.0.1%2Freview", false) === "", "GAS exposed a protocol-relative nested private-network URL.");
  assert(sandbox.safePublicUrl_("https://jobs.example.com\\admin\\review", false) === "", "GAS exposed a backslash private path.");

  const directory = sandbox.publicDirectoryPayload_({
    _rowNumber: 9,
    id: "shop@example.com",
    place_id: "place@example.com",
    placeId: "https://example.com/manage",
    slug: "https://example.com/internal",
    status: "active",
    rating: "0",
    totalScore: "4.6",
    website: "https://example.com/%2561dmin/edit",
    official_url: "https://example.com/",
    map_url: "http://192.168.1.20/place"
  }, "shopping");
  assert(directory.id === "shopping-row-9" && directory.slug === "shopping-row-9", "GAS exposed an unsafe Directory identifier.");
  assert(directory.place_id === "shopping-row-9" && directory.placeId === "shopping-row-9", "GAS exposed an unsafe Directory identifier alias.");
  assert(directory.website === "" && directory.map_url === "", "GAS exposed a private Directory URL.");
  assert(directory.official_url === "https://example.com/", "GAS removed a safe Directory URL.");
  assert(directory.rating === "" && directory.totalScore === 4.6, "GAS did not normalize Directory rating semantics.");
}

function publicationSheet(name = 'Community Posts') {
  return new MockSheet(name, [
    'post_id', 'job_id', 'created_at', 'updated_at', 'status', 'category1', 'title', 'body',
    'position_title', 'contact_email_private', 'contact_email', 'published_at',
    'approval_notified_status', 'approval_notified_queued_at', 'approval_sync_requested_at',
    'approval_notified_error', 'approval_notified_at', 'approval_notified_to'
  ]);
}

function addPublication(sheet, id, values = {}) {
  appendObjectRow(sheet, {
    post_id: id, job_id: id, status: 'active', category1: '質問', title: id, body: 'Synthetic test',
    position_title: id, contact_email_private: 'operator@example.com', contact_email: 'operator@example.com',
    published_at: '2026-10-20T09:00:00Z', approval_notified_queued_at: '2026-10-20T09:00:00Z',
    approval_notified_status: 'waiting_publish', ...values
  });
}

function publicationRuntime(sheets, options = {}) {
  const emails = [], dispatches = [], logs = [];
  const properties = options.properties || { GITHUB_ACTIONS_TOKEN: 'synthetic-private-token' };
  const published = new Set(options.published || []);
  const runtime = createRuntime(sheets, message => emails.push(message), {
    now: Date.parse('2026-10-20T09:10:00Z'), properties,
    console: { info: text => logs.push(text), warn: text => logs.push(text) }
  });
  runtime.sandbox.UrlFetchApp.fetch = (url, request) => {
    if (url.startsWith('https://api.github.com/')) {
      dispatches.push({ url, request });
      return { getResponseCode: () => options.dispatchCode || 204, getContentText: () => 'Untrusted response with credentials must not be logged' };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: [...published].map(id => ({ id, post_id: id, job_id: id, status: 'active' })) }) };
  };
  return { ...runtime, emails, dispatches, properties, published, logs };
}

function testPublicationDispatchRetries() {
  const missing = publicationRuntime([], { properties: {} });
  const absent = missing.sandbox.requestCommunityPublicDataSync_();
  assert(absent.error === 'SCHEDULED_SYNC_FALLBACK' && missing.dispatches.length === 0, 'Missing dispatch configuration must not perform an HTTP request.');

  const community = publicationSheet();
  addPublication(community, 'post-first'); addPublication(community, 'post-second');
  const runtime = publicationRuntime([community], { dispatchCode: 503 });
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(runtime.dispatches.length === 1, 'A waiting batch started duplicate workflow runs.');
  assert(runtime.properties.COMMUNITY_PUBLIC_SYNC_LAST_ERROR === 'WORKFLOW_DISPATCH_FAILED', 'Dispatch failure was not recorded.');
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(runtime.dispatches.length === 1, 'A failed dispatch ignored the cooldown.');
  runtime.advanceTime(5 * 60 * 1000);
  runtime.sandbox.UrlFetchApp.fetch = (url, request) => {
    if (url.startsWith('https://api.github.com/')) {
      runtime.dispatches.push({ url, request });
      return { getResponseCode: () => 204 };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: [] }) };
  };
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(runtime.dispatches.length === 2, 'The five-minute processor did not retry publication automatically.');
  assert(runtime.properties.COMMUNITY_PUBLIC_SYNC_LAST_DISPATCH_AT && !runtime.properties.COMMUNITY_PUBLIC_SYNC_LAST_ERROR, 'Successful retry did not clear the dispatch error.');
  assert(rowObject(community).approval_sync_requested_at, 'Successful retry did not record its request time.');
  assert(runtime.emails.length === 0, 'An approval email was sent before deployed JSON confirmed publication.');
  assert(!runtime.logs.join(' ').includes('synthetic-private-token') && !runtime.logs.join(' ').includes('Untrusted response'), 'Dispatch diagnostics exposed confidential material.');
}

function testLatePublicationNotificationRecovery() {
  const community = publicationSheet();
  addPublication(community, 'post-late', { approval_notified_queued_at: '2026-10-20T06:00:00Z' });
  addPublication(community, 'post-timed-out', { approval_notified_status: 'publish_timeout', approval_notified_queued_at: '2026-10-20T06:00:00Z' });
  addPublication(community, 'post-closed', { status: 'closed' });
  const runtime = publicationRuntime([community], { published: ['post-late', 'post-closed'] });
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(rowObject(community, 1).approval_notified_status === 'sent', 'A late but actually deployed post was incorrectly timed out.');
  assert(rowObject(community, 2).approval_notified_status === 'publish_timeout', 'An absent timed-out post was treated as published.');
  assert(rowObject(community, 3).approval_notified_status === 'publish_error', 'A closed post remained eligible for notification.');
  assert(runtime.emails.length === 1 && runtime.dispatches.length === 0, 'Timeout processing dispatched new runs or sent an invalid notification.');
  runtime.published.add('post-timed-out');
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(rowObject(community, 2).approval_notified_status === 'sent' && runtime.emails.length === 2, 'A deployed post did not recover automatically from publish_timeout.');
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(runtime.emails.length === 2, 'Recovered publication notifications were duplicated.');
}

function testApprovalCheckFairness() {
  const community = publicationSheet(), jobs = publicationSheet('Jobs');
  for (let i = 0; i < 14; i += 1) addPublication(community, `post-timeout-${i}`, { approval_notified_status: 'publish_timeout', approval_notified_queued_at: '2026-10-20T06:00:00Z' });
  addPublication(jobs, 'job-ready');
  const runtime = publicationRuntime([community, jobs], { published: ['job-ready'] });
  assert(runtime.sandbox.processWaitingApprovalNotifications().processed === 12, 'Publication checker exceeded its per-run limit.');
  runtime.sandbox.processWaitingApprovalNotifications();
  assert(rowObject(jobs).approval_notified_status === 'sent' && runtime.emails.length === 1, 'Old Community timeouts starved a ready Jobs notification.');
}

function testPublicationHealthAndAdministratorFeedback() {
  const community = publicationSheet(); addPublication(community, 'post-admin', { status: 'pending', approval_notified_status: '' });
  const runtime = publicationRuntime([community], { properties: {} });
  const alerts = [];
  runtime.sandbox.SpreadsheetApp.getUi = () => ({ ButtonSet: { YES_NO: 'YES_NO' }, Button: { YES: 'YES' }, alert: (...args) => { alerts.push(args); return 'YES'; } });
  runtime.sandbox.queueSelectedApproval_(false);
  assert(alerts.at(-1)[0].includes('即時同期が未設定') && !alerts.at(-1)[0].includes('同期を開始'), 'Administrator was told that an unconfigured synchronization had started.');
  runtime.sandbox.ScriptApp = { getProjectTriggers: () => [{ getHandlerFunction: () => 'processWaitingCommunityApprovalNotifications' }] };
  runtime.properties.GITHUB_ACTIONS_TOKEN = 'synthetic-private-token';
  const before = JSON.stringify(runtime.properties);
  const health = runtime.sandbox.inspectCommunityPublicationSync();
  assert(health.immediate_sync_configured && health.notification_trigger_configured, 'Health inspection did not report configured publication services.');
  assert(JSON.stringify(runtime.properties) === before && runtime.dispatches.length === 0 && runtime.emails.length === 0, 'Health inspection changed settings or contacted recipients.');
  assert(!JSON.stringify(health).includes('synthetic-private-token') && !runtime.logs.join(' ').includes('synthetic-private-token'), 'Health inspection exposed its dispatch credential.');
}

testSpreadsheetResolution();
testBoundModerationSelection();
testBerlinTimestamps();
testJobPersistenceIdempotencyAndThrottling();
testCommunityAdminFailureIsolation();
testCommunityPublicLifecycleAndCacheBypass();
testCommunityInquiryPrivacyAndAbuseControls();
testPublicPayloadCredentialSanitization();
testPublicationDispatchRetries();
testLatePublicationNotificationRecovery();
testApprovalCheckFairness();
testPublicationHealthAndAdministratorFeedback();
console.log("GAS submission tests passed.");
