import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

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
  getDataRange() { return { getValues: () => this.rows.map((row) => row.slice()) }; }
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
  getActiveSheet() { return this.activeSheet; }
  getUrl() { return "https://docs.google.com/spreadsheets/d/mock"; }
}

function createRuntime(sheets, sendEmail) {
  const spreadsheet = new MockSpreadsheet(sheets);
  let uuidCounter = 0;
  const cache = new Map();
  const sandbox = {
    console,
    Date,
    JSON,
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "" })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
      getUi: () => ({ alert: () => {}, prompt: () => ({}) })
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, hasLock: () => true, releaseLock: () => {} })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key) || null,
        put: (key, value) => cache.set(key, value),
        remove: (key) => cache.delete(key)
      })
    },
    Utilities: {
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
  return { sandbox, spreadsheet };
}

function rowObject(sheet, rowIndex = 1) {
  return Object.fromEntries(sheet.rows[0].map((header, index) => [header, sheet.rows[rowIndex][index]]));
}

function testJobPersistenceAndIdempotency() {
  const jobHeaders = [
    "company_name", "contact_name", "contact_email", "company_url", "position_title", "city",
    "employment_type", "salary", "visa_support", "start_date", "publish_date", "apply_method",
    "summary", "job_details", "requirements", "free_comment", "logo_url", "job_preview"
  ];
  const jobs = new MockSheet("Jobs", jobHeaders);
  const emails = [];
  const { sandbox } = createRuntime([jobs], (message) => { emails.push(message); return { sent: true }; });
  const params = {
    company_name: "Example GmbH", contact_name: "担当者", contact_email: "person@example.com",
    company_url: "https://example.com", position_title: "Engineer", city: "Berlin",
    employment_type: "Full-time", salary: "50000 EUR", visa_support: "yes", start_date: "2026-09",
    publish_date: "2026-08", apply_method: "Web", summary: "Summary", job_details: "Details",
    requirements: "Requirements", free_comment: "Comment", logo_url: "https://example.com/logo.png",
    job_preview: "Preview", website: "", form_started_at: String(Date.now() - 5000)
  };
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
  assert(jobs.rows.length === 2, "Repeated HTTP submission created a second Jobs row.");
  assert(emails.length === 2, "Duplicate request unexpectedly sent duplicate receipt emails.");
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

testJobPersistenceAndIdempotency();
testCommunityAdminFailureIsolation();
console.log("GAS submission tests passed.");
