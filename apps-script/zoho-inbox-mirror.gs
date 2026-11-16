/**
 * J-Connect inbox mirror.
 *
 * Every few minutes, new mail in the contact@ Zoho Inbox (form notifications,
 * direct inquiries, replies) is copied as a notification to a private mailbox.
 *
 * Privacy rules:
 * - The private address lives ONLY in the Script Property JCONNECT_MIRROR_EMAIL.
 *   It is never written to this (public) repository, the site, or logs.
 * - The copy is sent from contact@ to the private mailbox only. It carries no
 *   Reply-To, so pressing "reply" on the copy goes back to contact@, never to
 *   the original sender. Real replies are written from Zoho as contact@.
 *
 * Requires the Zoho OAuth scope ZohoMail.messages.READ in addition to
 * ZohoMail.messages.CREATE (see docs/zoho-mail-gas-setup.md).
 */

const JCONNECT_MIRROR_CURSOR_KEY = 'JCONNECT_MIRROR_CURSOR_V1';
const JCONNECT_MIRROR_MAX_PER_RUN = 3;
const JCONNECT_MIRROR_SUBJECT_PREFIX = '[J-Connect受信] ';

/** Run once by hand: validates settings, starts from "now", installs a 5-minute trigger. */
function installInboxMirror() {
  getMirrorConfig_();
  // A refresh token with the new READ scope must not reuse an access token
  // cached under the old scope.
  CacheService.getScriptCache().remove(ZOHO_ACCESS_TOKEN_CACHE_KEY);
  saveMirrorCursor_({ time: Date.now(), ids: [] });
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'runInboxMirror')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('runInboxMirror').timeBased().everyMinutes(5).create();
  return { ok: true };
}

/**
 * Run once by hand after putting a fresh Zoho Self Client code in the Script
 * Property ZOHO_AUTH_CODE (scope ZohoMail.messages.CREATE,ZohoMail.messages.READ).
 * Exchanges it for a refresh token and stores it in ZOHO_REFRESH_TOKEN.
 * Uses the existing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET. Nothing secret is logged.
 */
function exchangeZohoAuthCode() {
  const props = PropertiesService.getScriptProperties();
  const accountsBaseUrl = normalizeZohoBaseUrl_(getRequiredScriptProperty_('ZOHO_ACCOUNTS_BASE_URL'));
  const response = UrlFetchApp.fetch(`${accountsBaseUrl}/oauth/v2/token`, {
    method: 'post',
    payload: {
      code: getRequiredScriptProperty_('ZOHO_AUTH_CODE'),
      client_id: getRequiredScriptProperty_('ZOHO_CLIENT_ID'),
      client_secret: getRequiredScriptProperty_('ZOHO_CLIENT_SECRET'),
      grant_type: 'authorization_code'
    },
    muteHttpExceptions: true
  });
  let payload = {};
  try { payload = JSON.parse(response.getContentText()); } catch (error) { /* handled below */ }
  const refreshToken = String(payload && payload.refresh_token || '').trim();
  if (response.getResponseCode() !== 200 || !refreshToken) {
    const reason = String(payload && payload.error || `HTTP_${response.getResponseCode()}`).replace(/[^\w-]/g, '').slice(0, 40);
    throw new Error(`ZOHO_CODE_EXCHANGE_FAILED:${reason}`);
  }
  props.setProperty('ZOHO_REFRESH_TOKEN', refreshToken);
  props.deleteProperty('ZOHO_AUTH_CODE');
  CacheService.getScriptCache().remove(ZOHO_ACCESS_TOKEN_CACHE_KEY);
  return { ok: true };
}

/** Removes the trigger. */
function uninstallInboxMirror() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'runInboxMirror')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  return { ok: true };
}

/** Sends one test copy of the newest Inbox mail. Does not move the cursor. */
function testInboxMirror() {
  const config = getMirrorConfig_();
  const newest = listInboxMails_(config, 1)[0];
  if (!newest) return { ok: true, sent: 0 };
  sendMirrorCopy_(config, newest);
  return { ok: true, sent: 1 };
}

function runInboxMirror() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const config = getMirrorConfig_();
    const cursor = loadMirrorCursor_();
    const fresh = listInboxMails_(config, 50)
      .filter((mail) => mail.time > cursor.time || (mail.time === cursor.time && cursor.ids.indexOf(mail.id) === -1))
      .sort((a, b) => a.time - b.time)
      .slice(0, JCONNECT_MIRROR_MAX_PER_RUN);

    for (const mail of fresh) {
      try {
        sendMirrorCopy_(config, mail);
      } catch (error) {
        // Rate-limited or failed: stop here; this mail is retried next run.
        console.warn(`Inbox mirror stopped: ${String(error && error.message || 'UNKNOWN').slice(0, 40)}`);
        break;
      }
      if (mail.time > cursor.time) {
        cursor.time = mail.time;
        cursor.ids = [];
      }
      cursor.ids.push(mail.id);
      saveMirrorCursor_(cursor);
    }
  } finally {
    lock.releaseLock();
  }
}

function getMirrorConfig_() {
  const base = validateJConnectEmailConfiguration_();
  const mirrorTo = getRequiredScriptProperty_('JCONNECT_MIRROR_EMAIL').toLowerCase();
  const domain = (value) => value.split('@').pop();
  if (!isJConnectValidEmail_(mirrorTo) || domain(mirrorTo) === domain(base.publicEmail)) {
    throw new Error('INVALID_MIRROR_EMAIL');
  }
  const inboxFolderId = getRequiredScriptProperty_('ZOHO_INBOX_FOLDER_ID');
  return Object.assign({}, base, { mirrorTo, inboxFolderId });
}

function listInboxMails_(config, limit) {
  const query = `folderId=${encodeURIComponent(config.inboxFolderId)}&limit=${limit}&start=1&sortorder=false`;
  const response = UrlFetchApp.fetch(
    `${config.mailApiBaseUrl}/accounts/${encodeURIComponent(config.accountId)}/messages/view?${query}`,
    {
      method: 'get',
      headers: { Authorization: `Zoho-oauthtoken ${getZohoAccessToken_()}` },
      muteHttpExceptions: true
    }
  );
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    console.warn(`Zoho inbox list failed (HTTP ${status}${zohoErrorSummary_(response)}).`);
    throw new Error('ZOHO_LIST_FAILED');
  }
  const payload = JSON.parse(response.getContentText());
  const rows = Array.isArray(payload && payload.data) ? payload.data : [];
  return rows.map((row) => ({
    id: String(row.messageId || ''),
    time: Number(row.receivedTime) || 0,
    from: String(row.sender || row.fromAddress || ''),
    fromAddress: String(row.fromAddress || ''),
    subject: String(row.subject || '(件名なし)'),
    summary: String(row.summary || '')
  })).filter((mail) => mail.id && mail.time);
}

function sendMirrorCopy_(config, mail) {
  const received = Utilities.formatDate(new Date(mail.time), 'Europe/Berlin', 'yyyy-MM-dd HH:mm');
  const body = [
    'contact@j-connect-global.com に新しいメールが届きました。',
    '',
    `受信: ${received}`,
    `差出人: ${decodeEntities_(mail.from)}${mail.fromAddress && mail.from.indexOf(mail.fromAddress) === -1 ? ` <${mail.fromAddress}>` : ''}`,
    `件名: ${decodeEntities_(mail.subject)}`,
    '',
    '--- 冒頭 ---',
    decodeEntities_(mail.summary).slice(0, 1500),
    '',
    '※ このメールに返信しないでください（返信は contact@ に戻るだけです）。',
    '返信は Zoho Mail から contact@ として送ってください: https://mail.zoho.eu/'
  ].join('\n');

  sendZohoEmail_({
    to: config.mirrorTo,
    subject: (JCONNECT_MIRROR_SUBJECT_PREFIX + decodeEntities_(mail.subject)).slice(0, 250),
    body,
    throttle: true
  });
}

function decodeEntities_(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

function loadMirrorCursor_() {
  const raw = PropertiesService.getScriptProperties().getProperty(JCONNECT_MIRROR_CURSOR_KEY);
  try {
    const parsed = JSON.parse(raw || '');
    if (parsed && Number(parsed.time) > 0) return { time: Number(parsed.time), ids: Array.isArray(parsed.ids) ? parsed.ids.map(String) : [] };
  } catch (error) { /* fall through */ }
  // No cursor yet: start from now so old mail is not re-sent.
  return { time: Date.now(), ids: [] };
}

function saveMirrorCursor_(cursor) {
  PropertiesService.getScriptProperties().setProperty(
    JCONNECT_MIRROR_CURSOR_KEY,
    JSON.stringify({ time: cursor.time, ids: cursor.ids.slice(-50) })
  );
}
