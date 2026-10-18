import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { formatDate } from "./test-helpers/gas-format-date.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gas = fs.readFileSync(path.join(root, "apps-script/community-board-api.gs"), "utf8");

// Exercise the real transport with the existing Zoho Mail /api base-path format.
{
  const requests = [];
  const properties = {
    JCONNECT_PUBLIC_EMAIL: 'contact@j-connect-global.com',
    JCONNECT_ADMIN_EMAIL: 'contact@j-connect-global.com',
    ZOHO_ACCOUNT_ID: 'synthetic-account',
    ZOHO_ACCOUNTS_BASE_URL: 'https://accounts.zoho.eu/',
    ZOHO_MAIL_API_BASE_URL: 'https://mail.zoho.eu/api/',
    ZOHO_CLIENT_ID: 'synthetic-client', ZOHO_CLIENT_SECRET: 'synthetic-secret',
    ZOHO_REFRESH_TOKEN: 'synthetic-refresh'
  };
  const transport = vm.createContext({
    console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: name => properties[name] }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    UrlFetchApp: { fetch: (url, options) => {
      requests.push({ url, options });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ access_token: 'synthetic-access', expires_in: 3600 }) };
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/zoho-mail.gs'), 'utf8'), transport);
  transport.sendZohoEmail_({ to: 'reader@example.com', subject: 'Synthetic test', body: 'Hello' });
  assert(requests[0].url === 'https://accounts.zoho.eu/oauth/v2/token', 'Zoho authentication URL changed.');
  assert(requests[1].url === 'https://mail.zoho.eu/api/accounts/synthetic-account/messages', 'Zoho Mail /api base path was lost.');
  for (const invalid of ['http://mail.zoho.eu/api', 'https://mail.zoho.eu/api?token=x', 'https://mail.zoho.eu/api#secret', 'https://mail.zoho.eu/other']) {
    let rejected = false;
    try { transport.normalizeZohoBaseUrl_(invalid); } catch { rejected = true; }
    assert(rejected, 'Invalid Zoho URL was accepted.');
  }
}

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
  setFrozenRows() {}
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
  insertSheet(name) { const sheet = new MockSheet(name, []); sheet.rows = []; sheet.parent = this; this.sheets[name] = sheet; return sheet; }
  getSheetByName(name) { return this.sheets[name] || null; }
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
    console,
    Date: MockDate,
    JSON,
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (name) => properties[name] || "" })
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
  vm.runInContext(fs.readFileSync(path.join(root, "apps-script/community-messaging.gs"), "utf8"), sandbox);
  return {
    sandbox,
    spreadsheet,
    openedSpreadsheetIds,
    cache,
    advanceTime: (milliseconds) => { now += milliseconds; }
  };
}

const now = Date.parse('2026-10-17T10:00:00Z');
const community = new MockSheet('Community Posts', ['post_id','status','category1','title','nickname','body','contact_email_private','expires_at']);
community.appendRow(['sale-1','active','譲ります','机','持ち主','公開本文','owner@example.com','']);
community.appendRow(['question-1','active','質問','生活の質問','質問者','質問本文','author@example.com','']);
const mails = []; let failMail = false;
const runtime = createRuntime([community], (mail) => { if (failMail) throw new Error('SMTP_TEST'); mails.push(mail); }, { now });
const c = runtime.sandbox;
const call = (action, params = {}, post = true) => c.cmDispatch_(action, params, post);
const form = (overrides = {}) => ({ post_id:'sale-1',nickname:'ゲスト',email:'guest@example.com',body:'受け取りを相談したいです。',request_id:'request-1',website:'',form_started_at:String(now-5000),...overrides });
const rawAccess = (mail) => mail.body.match(/#access=([a-f0-9]{64})/)[1];
const use = (mail, kind, id) => call('communityUseAccess', {kind,id,access:rawAccess(mail)});
const safe = (result) => assert(!/email|session_hash|token_hash|participant_id|owner@example|guest@example/.test(JSON.stringify(result)), 'Read DTO disclosed private fields.');
assert(call('communityMessagingStatus').private_conversations, 'Missing capability.');
assert(!call('communityCreateConversation', form(), false).ok, 'Credential GET accepted.');
let result = call('communityCreateConversation',form()); assert(result.ok, 'Create private conversation failed.'); const cid = result.id;
assert(mails.length === 1 && mails[0].to === 'guest@example.com', 'Owner notified before verification.');
assert(c.cmTable_('conversations',false).rows[0].status === 'pending_email','Wrong initial status.');
assert(!use(mails[0],'conversation','wrong-id').ok, 'Cross-conversation token accepted.');
const guest = use(mails[0],'conversation',cid); assert(guest.ok && guest.session,'Verification failed.');
assert(!use(mails[0],'conversation',cid).ok,'Replayed access link accepted.');
assert(mails.length === 2 && mails[1].to === 'owner@example.com', 'Verified inquiry did not notify owner.');
const owner = use(mails[1],'conversation',cid); assert(owner.ok, 'Owner could not open.');
let history = call('communityGetConversation',{id:cid,session:owner.session}); assert(history.ok && history.messages.length === 1 && !history.messages[0].mine,'Owner history failed.'); safe(history);
assert(!call('communityGetConversation',{id:'other-conversation',session:owner.session}).ok,'IDOR read allowed.');
assert(!call('communitySendMessage',{id:cid,session:'f'.repeat(64),body:'intruder',request_id:'evil'}).ok,'Unauthenticated send allowed.');
let sent = call('communitySendMessage',{id:cid,session:owner.session,body:'土曜日はいかがですか？',request_id:'owner-message-1'}); assert(sent.ok,'Owner reply failed.');
const count = mails.length;
assert(call('communitySendMessage',{id:cid,session:owner.session,body:'土曜日はいかがですか？',request_id:'owner-message-1'}).ok && mails.length===count,'Retry duplicated message or notification.');
assert(!call('communitySendMessage',{id:cid,session:owner.session,body:'too fast',request_id:'owner-message-fast'}).ok,'Message rate limit absent.');
sent = call('communitySendMessage',{id:cid,session:guest.session,body:'土曜日でお願いします。',request_id:'guest-message-1'}); assert(sent.ok,'Guest could not continue conversation.');
runtime.advanceTime(11000);
assert(call('communitySendMessage',{id:cid,session:owner.session,body:'了解です。',request_id:'owner-message-2'}).ok,'Second round-trip failed.');
history=call('communityGetConversation',{id:cid,session:guest.session});assert(history.messages.length===4,'Conversation history incomplete.');safe(history);
runtime.advanceTime(11000);failMail=true;
const failedSend={id:cid,session:owner.session,body:'通知失敗の返信',request_id:'lost-response-message'};
assert(call('communitySendMessage',failedSend).notification_pending,'Initial failed notification state missing.');failMail=false;
const retryCount=c.cmTable_('messages',false).rows.length;
assert(call('communitySendMessage',failedSend).notification_pending,'Idempotent retry lost notification state.');
assert(c.cmTable_('messages',false).rows.length===retryCount,'Lost response retry duplicated message.');
mails.forEach((mail)=>assert(!mail.replyTo && !mail.body.includes('owner@example.com') && !mail.body.includes('guest@example.com') && !mail.body.includes('土曜日'),'Mail disclosed counterpart address/content.'));
assert(!JSON.stringify(c.cmTable_('access',false).rows).includes(guest.session),'Raw access secret persisted.');
assert(!JSON.stringify(c.cmTable_('notifications',false).rows).includes('#access='),'Outbox persisted raw link.');
assert(call('communityEndConversation',{id:cid,session:owner.session,block:'true'}).ok,'Block failed.');
assert(!call('communitySendMessage',{id:cid,session:guest.session,body:'blocked',request_id:'blocked-message'}).ok,'Blocked send allowed.');
const conversationsBefore=c.cmTable_('conversations',false).rows.length;
const blockedResponse=call('communityCreateConversation',form({request_id:'blocked-new'}));assert(blockedResponse.id && blockedResponse.confirmation_required,'Blocked response shape discloses block membership.');assert(c.cmTable_('conversations',false).rows.length===conversationsBefore,'Block allowed new inquiry.');
// Fresh access may still read closed/blocked history, while sending remains denied.
const recoveryKnown=call('communityRequestAccess',{kind:'conversation',id:cid,email:'owner@example.com',form_started_at:String(now-5000)});
const recoveryUnknown=call('communityRequestAccess',{kind:'conversation',id:cid,email:'unknown@example.com',form_started_at:String(now-5000)});
assert(JSON.stringify(recoveryKnown)===JSON.stringify(recoveryUnknown),'Recovery enumerates registered email.');
assert(use(mails.at(-1),'conversation',cid).ok,'Blocked owner lost access to existing history.');
community.rows[1][1]='hidden';assert(!call('communityGetConversation',{id:cid,session:guest.session}).ok,'Hidden post still exposes conversations.');community.rows[1][1]='active';
// Public reply lifecycle: explicit consent, email confirmation, then moderator approval.
const rf=form({post_id:'question-1',email:'reply@example.com',request_id:'reply-request',body:'役立つ回答です。',public_consent:'true'});
assert(!call('communityCreateReply',{...rf,public_consent:'false'}).ok,'Public consent missing.');
assert(!call('communityCreateReply',{...rf,body:'contact me x@example.com'}).ok,'Public reply accepted email.');
assert(!call('communityCreateReply',{...rf,post_id:'sale-1'}).ok,'Private sale accepted public reply.');
result=call('communityCreateReply',rf);assert(result.ok,'Public reply submission failed.');const rid=result.id;
assert(call('communityPublicReplies',{post_id:'question-1'}).replies.length===0,'Unverified reply leaked.');
runtime.spreadsheet.activeSheet=runtime.spreadsheet.getSheetByName('Community Replies');
let unverifiedApprovalDenied=false;try{c.approveSelectedCommunityReply();}catch(_){unverifiedApprovalDenied=true;}assert(unverifiedApprovalDenied,'Unverified reply could be approved.');
const replySession=use(mails.at(-1),'reply',rid);assert(replySession.ok,'Public reply verification failed.');
assert(call('communityPublicReplies',{post_id:'question-1'}).replies.length===0,'Unapproved reply leaked.');
runtime.spreadsheet.activeSheet=runtime.spreadsheet.getSheetByName('Community Replies');c.approveSelectedCommunityReply();
const publicReplies=call('communityPublicReplies',{post_id:'question-1'});assert(publicReplies.replies.length===1,'Approved reply missing.');safe(publicReplies);
assert(c.publicPostPayload_({post_id:'question-1',category1:'質問',status:'active'}).public_replies.length===1,'Snapshot excluded approved reply.');
const replySheet=runtime.spreadsheet.getSheetByName('Community Replies');const oldRead=replySheet.getDataRange.bind(replySheet);let replyReads=0;
replySheet.getDataRange=()=>{replyReads++;return oldRead();};
const serialized=c.listPosts_({bypassCache:'true'});assert(serialized.ok && replyReads===1,'Post list rereads replies per post.');
assert(serialized.posts.find(p=>p.post_id==='question-1').public_replies.length===1,'Indexed reply serialization lost content.');
replySheet.getDataRange=oldRead;
const cacheGetter=c.CacheService.getScriptCache;c.CacheService.getScriptCache=()=>({get:()=>null,put:()=>{throw new Error('QUOTA_TEST');}});
assert(c.listPosts_({bypassCache:'true'}).posts.length===serialized.posts.length,'Oversized reply payload cache failure breaks public API.');
c.CacheService.getScriptCache=cacheGetter;
assert(call('communityReport',{kind:'reply',id:rid,reason:'確認してください',form_started_at:String(now-5000)}).ok,'Public report failed.');
assert(call('communityPublicReplies',{post_id:'question-1'}).replies.length===1,'Report auto-hid content.');
assert(call('communityDeleteReply',{id:rid,session:replySession.session}).ok,'Own reply hide failed.');
assert(call('communityPublicReplies',{post_id:'question-1'}).replies.length===0,'Hidden reply remained public.');
assert(!call('communityDeleteReply',{id:rid,session:guest.session}).ok,'Cross-scope reply deletion allowed.');
// SMTP failure is queued without persisting bearer secrets; retry sends a new link.
failMail=true;result=call('communityCreateReply',{...rf,email:'retry@example.com',request_id:'retry-request'});assert(result.ok && result.notification_pending,'SMTP failure not exposed honestly.');failMail=false;
runtime.advanceTime(3*60*60*1000);const beforeRetry=mails.length;c.processCommunityMessagingNotifications();assert(mails.length>beforeRetry,'Queued mail not retried.');
const pendingMail=mails.findLast((mail)=>mail.to==='retry@example.com');assert(use(pendingMail,'reply',result.id).ok,'Retried link unusable.');
// Expiry, spreadsheet row gaps, formula escaping and no private payload fields.
assert(!use(mails[0],'conversation',cid).ok,'Expired link accepted.');
const expireJobs=[];c.cmLink_(expireJobs,'reply@example.com','reply_login',rid,'reply',rid);c.cmDeliver_(expireJobs);const expireMail=mails.at(-1);
assert(!use(expireMail,'conversation',rid).ok,'Cross-kind access accepted.');
runtime.advanceTime(61*60*1000);assert(!use(expireMail,'reply',rid).ok,'Unused expired link accepted.');
runtime.advanceTime(31*24*60*60*1000);assert(!call('communityGetReply',{id:rid,session:replySession.session}).ok,'Expired session accepted.');
const reports=runtime.spreadsheet.getSheetByName('Community Message Reports');reports.appendRow([]);const gap=c.cmAppend_('reports',{report_id:'gap-report',reason:'=SUM(1,2)'});gap.reason='+test';c.cmSave_('reports',gap);assert(c.cmFind_('reports','report_id','gap-report').reason==='+test','Blank sheet row corrupts write.');assert(reports.rows.at(-1)[4]==="'+test",'Spreadsheet formula not escaped.');
assert(!call('communityGetConversation',{id:cid,session:guest.session},false).ok,'GET private history accepted.');
console.log('Community messaging: verification, repeated conversations, isolation, moderation, abuse controls and notification retries passed.');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'apps-script/appsscript.json'), 'utf8'));
assert(manifest.oauthScopes.length === 4 && manifest.oauthScopes.every(scope => /^https:\/\/www\.googleapis\.com\/auth\/(?:spreadsheets|drive|script\.external_request|script\.scriptapp)$/.test(scope)), 'Manifest requests an unexpected account permission.');
assert(manifest.runtimeVersion === 'V8' && manifest.webapp.executeAs === 'USER_DEPLOYING' && manifest.webapp.access === 'ANYONE_ANONYMOUS', 'Manifest changes the existing web-app execution or access policy.');
