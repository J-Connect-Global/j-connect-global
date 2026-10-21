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
  const accessUrl = 'https://j-connect-global.com/germany/ja/community/conversation/?kind=conversation&id=conversation-test#access=' + 'a'.repeat(64);
  const body = '確認リンク\n' + accessUrl + '\n<これは本文です> & そのまま表示';
  transport.sendZohoEmail_({ to: 'reader@example.com', subject: 'Access-link regression', body });
  const plainPayload = JSON.parse(requests.at(-1).options.payload);
  assert(plainPayload.mailFormat === 'plaintext', 'Plain notifications must be sent as text/plain, without a generated HTML alternative.');
  assert(plainPayload.content === body, 'Plain notification content or its access URL was escaped.');
  const receivedUrl = new URL(plainPayload.content.split('\n')[1]);
  assert(receivedUrl.searchParams.get('id') === 'conversation-test' && receivedUrl.hash === '#access=' + 'a'.repeat(64), 'The email access link no longer identifies the intended conversation.');
  transport.sendZohoEmail_({ to: 'reader@example.com', subject: 'Plain reply address', body, replyTo: 'author@example.com' });
  const plainReply = JSON.parse(requests.at(-1).options.payload);
  assert(plainReply.mailFormat === 'plaintext' && plainReply.content.startsWith(body) && plainReply.content.endsWith('mailto:author@example.com'), 'Plain reply instructions must preserve the link and avoid HTML markup.');
  const html = '<p>Explicit HTML &amp; existing formatting</p>';
  transport.sendZohoEmail_({ to: 'reader@example.com', subject: 'HTML compatibility', html, replyTo: 'author@example.com' });
  const htmlPayload = JSON.parse(requests.at(-1).options.payload);
  assert(htmlPayload.mailFormat === 'html' && htmlPayload.content.startsWith(html) && htmlPayload.content.includes('<a href="mailto:author@example.com">'), 'Explicit HTML messages and their reply-address links must retain HTML formatting.');
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
      getScriptProperties: () => ({ getProperty: (name) => properties[name] || "", setProperty: (name, value) => { properties[name] = value; }, deleteProperty: name => { delete properties[name]; } })
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
      computeDigest: (_algorithm, input) => [...crypto.createHash("sha256").update(String(input), "utf8").digest()],
      computeHmacSha256Signature: (value, key) => [...crypto.createHmac("sha256", key).update(value).digest()]
    },
    getRequiredScriptProperty_: name => { if (!properties[name]) throw new Error("MISSING_PROPERTY:" + name); return properties[name]; },
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

const now = Date.parse('2026-10-18T10:00:00Z');
const community = new MockSheet('Community Posts', ['post_id','status','category1','title','nickname','body','contact_email_private','expires_at']);
community.appendRow(['sale-1','active','譲ります','机','持ち主','公開本文','owner@example.com','']);
community.appendRow(['question-1','active','質問','生活の質問','質問者','質問本文','author@example.com','']);
community.appendRow(['friend-1','active','友達募集','友達募集','友達','本文','friend@example.com','']);
// Existing production tables are upgraded by appending fields, never recreated.
const oldReplies = new MockSheet('Community Replies', ['reply_id','post_id','nickname','body','email_private','reply_to','status','created_at','verified_at','published_at','session_hash','session_expires_at','request_id']);
oldReplies.appendRow(['legacy-reply','question-1','以前の回答者','以前の回答','legacy@example.com','','approved',new Date(now-10000).toISOString(),new Date(now-10000).toISOString(),new Date(now-10000).toISOString(),'','','legacy-request']);
const mails = []; let failMail = false;
const runtime = createRuntime([community,oldReplies], mail => { if (failMail) throw new Error('SMTP_TEST'); mails.push(mail); }, { now });
const c = runtime.sandbox;
c.initializeCommunityMessaging(); c.initializeCommunityMessaging();
assert(oldReplies.rows.length === 2 && oldReplies.rows[1][3] === '以前の回答', 'Schema migration damaged existing reply.');
const call = (action, params = {}, post = true) => c.cmDispatch_(action, params, post);
const form = (overrides = {}) => ({ post_id:'sale-1',nickname:'ゲスト',email:'guest@example.com',body:'受け取りを相談したいです。',request_id:'request-1',website:'',form_started_at:String(now-5000),private_consent:'true',creation_key:'a'.repeat(64),...overrides });
const publicForm = overrides => form({ post_id:'question-1',email:'reply@example.com',request_id:'reply-request',body:'役立つ回答です。',public_consent:'true',deletion_key:'c'.repeat(64),deletion_salt:'d'.repeat(64),...overrides });
const rawAccess = mail => mail.body.match(/#access=([a-f0-9]{64})/)[1];
const use = (mail, kind, id) => call('communityUseAccess', {kind,id,access:rawAccess(mail)});
const safe = result => assert(!/email|session_hash|token_hash|participant_id|deletion_|creation_|owner@example|guest@example/.test(JSON.stringify(result)), 'Read DTO disclosed private fields.');
assert(call('communityMessagingStatus').instant_publish, 'Missing instant publication capability.');
assert(!call('communityCreateConversation',form(),false).ok, 'Credential GET accepted.');
assert(!call('communityCreateConversation',form({private_consent:'false'})).ok,'Private recipient consent missing.');
let result=call('communityCreateConversation',form());assert(result.ok && result.session && !result.confirmation_required,'Private conversation was not immediately usable.');
const cid=result.id, initialGuestSession=result.session;
assert(mails.length===0 && c.cmTable_('conversations',false).rows[0].status==='active','Creation delayed on synchronous email or verification.');
let history=call('communityGetConversation',{id:cid,session:initialGuestSession});assert(history.ok && history.messages.length===1,'Creator cannot read immediately.');safe(history);
const repeated=call('communityCreateConversation',form());assert(repeated.session===initialGuestSession && c.cmTable_('conversations',false).rows.length===1,'Create retry duplicated conversation or lost session.');
assert(!call('communityCreateConversation',form({creation_key:'b'.repeat(64)})).ok,'Retry granted access by request ID/email alone.');
c.processCommunityMessagingNotifications();
assert(mails.some(mail=>mail.to==='guest@example.com') && mails.some(mail=>mail.to==='owner@example.com'),'Both participants were not notified.');
const ownerMail=mails.find(mail=>mail.to==='owner@example.com'), guestMail=mails.find(mail=>mail.to==='guest@example.com');
assert(!use(ownerMail,'conversation','wrong-id').ok,'Cross-conversation token accepted.');
const owner=use(ownerMail,'conversation',cid),guest=use(guestMail,'conversation',cid);
assert(owner.ok && guest.ok,'Mail access failed.');
// Links are reusable credentials: opening one again, on another device, or a
// year later reaches the same conversation without logging out other tabs.
const ownerAgain=use(ownerMail,'conversation',cid);assert(ownerAgain.ok && ownerAgain.session===owner.session,'Reopening the same email link failed.');
assert(guest.session===initialGuestSession && rawAccess(guestMail)===initialGuestSession,'Creator tab and emailed link are not the same credential.');
assert(call('communityGetConversation',{id:cid,session:initialGuestSession}).ok,'Opening the email link logged out the creating device.');
assert(!use(ownerMail,'conversation','wrong-id').ok && !call('communityGetConversation',{id:cid,session:rawAccess(ownerMail).replace(/^./,c=>c==='a'?'b':'a')}).ok,'Altered or cross-scope link accepted.');
const workbook=()=>JSON.stringify(Object.values(runtime.spreadsheet.sheets).map(sheet=>sheet.rows));
assert(!workbook().includes(owner.session) && !workbook().includes(guest.session),'Plain access link stored in the workbook.');
assert(!call('communityGetConversation',{id:'other',session:owner.session}).ok,'IDOR read allowed.');
assert(!call('communitySendMessage',{id:cid,session:'f'.repeat(64),body:'intruder',request_id:'evil'}).ok,'Unauthenticated send allowed.');
let sent=call('communitySendMessage',{id:cid,session:owner.session,body:'土曜日はいかがですか？',request_id:'owner-message-1'});assert(sent.ok,'Owner send failed.');const ownMessage=sent.id;
const count=c.cmTable_('messages',false).rows.length;
assert(call('communitySendMessage',{id:cid,session:owner.session,body:'same',request_id:'owner-message-1'}).ok && c.cmTable_('messages',false).rows.length===count,'Retry duplicated message.');
assert(!call('communitySendMessage',{id:cid,session:owner.session,body:'fast',request_id:'fast'}).ok,'Message rate limit absent.');
assert(call('communitySendMessage',{id:cid,session:guest.session,body:'土曜日でお願いします。',request_id:'guest-message-1'}).ok,'Guest reply failed.');
runtime.advanceTime(11000);assert(call('communitySendMessage',{id:cid,session:owner.session,body:'了解です。',request_id:'owner-message-2'}).ok,'Second round trip failed.');
history=call('communityGetConversation',{id:cid,session:guest.session});assert(history.messages.length===4,'Incomplete history.');safe(history);
assert(!call('communityDeleteMessage',{id:cid,session:guest.session,message_id:ownMessage}).ok,'Guest deleted another participant message.');
assert(call('communityDeleteMessage',{id:cid,session:owner.session,message_id:ownMessage}).ok,'Owner cannot delete own message.');
history=call('communityGetConversation',{id:cid,session:guest.session});assert(history.messages.find(m=>m.id===ownMessage).deleted && !history.messages.find(m=>m.id===ownMessage).body,'Private tombstone exposed removed content.');
// Public replies in every category publish without verification or moderation.
assert(!call('communityCreateReply',publicForm({public_consent:'false'})).ok,'Public consent missing.');
assert(!call('communityCreateReply',publicForm({deletion_key:''})).ok,'Deletion credential missing.');
assert(!call('communityCreateReply',publicForm({body:'contact me x@example.com'})).ok,'Public contact data accepted.');
result=call('communityCreateReply',publicForm());assert(result.ok && result.reply.number===2 && !result.confirmation_required,'Public reply was not immediate or legacy numbering changed.');const rid=result.id;
assert(call('communityPublicReplies',{post_id:'question-1'}).replies.length===2,'Immediate reply absent.');
assert(call('communityCreateReply',publicForm()).id===rid && c.cmTable_('replies',false).rows.length===2,'Public retry duplicated reply.');
for(const post_id of ['sale-1','friend-1']) assert(call('communityCreateReply',publicForm({post_id,request_id:'reply-'+post_id})).ok,'Category missing public replies.');
const child=call('communityCreateReply',publicForm({request_id:'child',reply_to:rid,body:'二番への返信'}));assert(child.ok && child.reply.reply_to===rid,'Reply target lost.');
assert(!call('communityCreateReply',publicForm({request_id:'cross-target',post_id:'sale-1',reply_to:rid})).ok,'Cross-post reply target accepted.');
const spoof=call('communityCreateReply',publicForm({request_id:'spoof',email:'author@example.com'}));assert(spoof.ok && !spoof.reply.is_post_author,'Unverified email impersonates post author.');
const directed=call('communityCreateConversation',form({post_id:'question-1',reply_to:rid,request_id:'directed',email:'other@example.com'}));assert(directed.ok,'Private contact on a public reply failed.');
const participants=c.cmTable_('participants',false).rows.filter(p=>p.conversation_id===directed.id);assert(participants.find(p=>p.role==='owner').email_private==='reply@example.com','Private reply routed to original author instead of chosen commenter.');
assert(!call('communityCreateConversation',form({post_id:'sale-1',reply_to:rid,request_id:'private-cross'})).ok,'Cross-post private recipient accepted.');
const challenge=call('communityReplyDeleteChallenge',{id:rid});assert(challenge.ok && challenge.salt==='d'.repeat(64),'Delete challenge missing.');
assert(!call('communityDeleteReply',{id:rid,deletion_key:'e'.repeat(64)}).ok,'Wrong deletion password accepted.');
assert(call('communityDeleteReply',{id:rid,deletion_key:'c'.repeat(64)}).ok,'Correct deletion password rejected.');
const publicReplies=call('communityPublicReplies',{post_id:'question-1'});safe(publicReplies);
assert(publicReplies.replies.find(r=>r.id===rid).deleted && !publicReplies.replies.find(r=>r.id===rid).body,'Deleted public body remains visible.');
assert(publicReplies.replies.find(r=>r.id===child.id).number===3 && publicReplies.replies.find(r=>r.id===child.id).reply_to_number===2,'Deletion renumbered thread or broke target.');
assert(c.publicPostPayload_({post_id:'question-1',category1:'質問',status:'active'}).public_replies.length===publicReplies.replies.length,'Snapshot lost instant replies.');
assert(!JSON.stringify(c.cmTable_('replies',false).rows).includes('c'.repeat(64)),'Derived deletion key persisted.');
const replySheet=runtime.spreadsheet.getSheetByName('Community Replies'),oldRead=replySheet.getDataRange.bind(replySheet);let replyReads=0;
replySheet.getDataRange=()=>{replyReads++;return oldRead();};c.listPosts_({bypassCache:'true'});assert(replyReads===1,'List serialization rereads reply sheet per post.');replySheet.getDataRange=oldRead;
assert(call('communityReport',{kind:'reply',id:child.id,reason:'確認してください',form_started_at:String(now-5000)}).ok,'Public report failed.');
// Recovery does not enumerate addresses; only a scoped email link permits deletion.
const recoveryKnown=call('communityRequestAccess',{kind:'reply',id:child.id,email:'reply@example.com',form_started_at:String(now-5000)});
const recoveryUnknown=call('communityRequestAccess',{kind:'reply',id:child.id,email:'unknown@example.com',form_started_at:String(now-5000)});
assert(JSON.stringify(recoveryKnown)===JSON.stringify(recoveryUnknown),'Recovery enumerates addresses.');
const childMail=mails.findLast(mail=>mail.to==='reply@example.com' && mail.body.includes('kind=reply'));
const childSession=use(childMail,'reply',child.id);assert(childSession.ok,'Management mail link failed.');
assert(!call('communityDeleteReply',{id:child.id,session:guest.session}).ok,'Cross-scope deletion accepted.');
assert(call('communityDeleteReply',{id:child.id,session:childSession.session}).ok,'Email management deletion failed.');
// Notification failures do not roll back public posts; retry never persists secrets.
failMail=true;c.processCommunityMessagingNotifications();failMail=false;runtime.advanceTime(3*60*60*1000);const beforeRetry=mails.length;c.processCommunityMessagingNotifications();assert(mails.length>beforeRetry,'Queued mail not retried.');
assert(!JSON.stringify(c.cmTable_('notifications',false).rows).includes('#access='),'Outbox persisted raw link.');
mails.forEach(mail=>assert(!mail.replyTo && !mail.body.includes('owner@example.com') && !mail.body.includes('guest@example.com') && !mail.body.includes('土曜日') && !mail.body.includes('c'.repeat(64)), 'Mail disclosed private content or a credential.'));
assert(call('communityEndConversation',{id:cid,session:owner.session,block:'true'}).ok,'Block failed.');
assert(!call('communitySendMessage',{id:cid,session:guest.session,body:'blocked',request_id:'blocked-message'}).ok,'Blocked send allowed.');
const conversationsBefore=c.cmTable_('conversations',false).rows.length;
const blocked=call('communityCreateConversation',form({request_id:'blocked-new'}));assert(blocked.ok && blocked.session && c.cmTable_('conversations',false).rows.length===conversationsBefore,'Block allowed new inquiry or changed acceptance shape.');
community.rows[1][1]='hidden';assert(!call('communityGetConversation',{id:cid,session:guest.session}).ok,'Hidden post still exposes conversations.');community.rows[1][1]='active';
assert(!call('communityGetConversation',{id:cid,session:guest.session},false).ok,'GET credentials accepted.');
runtime.advanceTime(400*24*60*60*1000);assert(call('communityGetReply',{id:child.id,session:childSession.session}).ok,'Reply management link expired with time.');
assert(use(ownerMail,'conversation',cid).ok && call('communityGetConversation',{id:cid,session:guest.session}).ok,'Conversation link or tab expired with time.');
const reports=runtime.spreadsheet.getSheetByName('Community Message Reports');reports.appendRow([]);const gap=c.cmAppend_('reports',{report_id:'gap-report',reason:'=SUM(1,2)'});gap.reason='+test';c.cmSave_('reports',gap);assert(c.cmFind_('reports','report_id','gap-report').reason==='+test','Blank row corrupts write.');assert(reports.rows.at(-1)[4]==="'+test",'Formula not escaped.');
// Explicit revocation: old links and tabs stop, the other participant is unaffected,
// and the new link is emailed only to the revoking participant.
{
  const fresh=call('communityCreateConversation',form({post_id:'friend-1',request_id:'revoke-test',email:'revoker@example.com',creation_key:'e'.repeat(64),form_started_at:String(c.Date.now()-5000)}));assert(fresh.ok,'Revocation fixture failed.');
  c.processCommunityMessagingNotifications();
  const revokerMail=mails.findLast(mail=>mail.to==='revoker@example.com'), friendMail=mails.findLast(mail=>mail.to==='friend@example.com' && mail.body.includes(fresh.id));
  const friend=use(friendMail,'conversation',fresh.id);assert(friend.ok,'Recipient link failed.');
  const before=mails.length;const revoked=call('communityRevokeAccess',{kind:'conversation',id:fresh.id,session:fresh.session});
  assert(revoked.ok && revoked.session!==fresh.session,'Revocation did not issue a new credential.');
  assert(!call('communityGetConversation',{id:fresh.id,session:fresh.session}).ok && !use(revokerMail,'conversation',fresh.id).ok,'Revoked link still opens the conversation.');
  assert(call('communityGetConversation',{id:fresh.id,session:revoked.session}).ok && call('communityGetConversation',{id:fresh.id,session:friend.session}).ok,'Revocation locked out the current tab or the other participant.');
  assert(mails.length===before+1 && mails.at(-1).to==='revoker@example.com' && rawAccess(mails.at(-1))===revoked.session,'New link was not emailed to the revoking participant.');
  // Recovery resends the same permanent link without revealing whether the address matched.
  runtime.advanceTime(11*60*1000);const resend=mails.length;
  assert(call('communityRequestAccess',{kind:'conversation',id:fresh.id,email:'friend@example.com',form_started_at:String(c.Date.now()-5000)}).ok && mails.length===resend+1 && rawAccess(mails.at(-1))===friend.session,'Resent link differs from the original.');
  assert(call('communityRequestAccess',{kind:'conversation',id:fresh.id,email:'stranger@example.com',form_started_at:String(c.Date.now()-5000)}).ok && mails.length===resend+1,'Recovery mailed an unregistered address.');
  // Closing the conversation stops new sends but keeps the history readable.
  assert(call('communityEndConversation',{id:fresh.id,session:friend.session,block:'false'}).ok,'Close failed.');
  assert(!call('communitySendMessage',{id:fresh.id,session:revoked.session,body:'after close',request_id:'after-close'}).ok && call('communityGetConversation',{id:fresh.id,session:revoked.session}).status==='closed','Closed conversation still accepts messages.');
}
// One-hour links emailed before this release remain usable unless revoked.
{
  const participant=c.cmTable_('participants',false).rows.find(p=>p.conversation_id===cid && p.role==='owner');
  const legacy='9'.repeat(64);
  c.cmAppend_('access',{access_id:'access-legacy',token_hash:c.sha256Hex_(legacy),purpose:'conversation_login',target_id:participant.participant_id,expires_at:new Date(c.Date.now()-90*24*3600*1000).toISOString(),consumed_at:new Date(c.Date.now()-89*24*3600*1000).toISOString(),created_at:new Date(c.Date.now()-90*24*3600*1000).toISOString()});
  const upgraded=call('communityUseAccess',{kind:'conversation',id:cid,access:legacy});assert(upgraded.ok && upgraded.session===owner.session,'Legacy email link no longer opens the conversation.');
  assert(!call('communityUseAccess',{kind:'conversation',id:'conversation-other',access:legacy}).ok,'Legacy link opened another conversation.');
  assert(call('communityRevokeAccess',{kind:'conversation',id:cid,session:owner.session}).ok && !call('communityUseAccess',{kind:'conversation',id:cid,access:legacy}).ok,'Revocation left a legacy link usable.');
}
assert(/^[a-f0-9]{64}$/.test(runtime.sandbox.PropertiesService.getScriptProperties().getProperty('CM_ACCESS_PEPPER')),'Access pepper missing.');
console.log('Community messaging: immediate publication, stable threads, password deletion, private isolation, permanent reusable links, revocation, legacy links, append-only migration and notification retries passed.');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'apps-script/appsscript.json'), 'utf8'));
assert(manifest.oauthScopes.length === 4 && manifest.oauthScopes.every(scope => /^https:\/\/www\.googleapis\.com\/auth\/(?:spreadsheets|drive|script\.external_request|script\.scriptapp)$/.test(scope)), 'Manifest requests an unexpected account permission.');
assert(manifest.runtimeVersion === 'V8' && manifest.webapp.executeAs === 'USER_DEPLOYING' && manifest.webapp.access === 'ANYONE_ANONYMOUS', 'Manifest changes the existing web-app execution or access policy.');
