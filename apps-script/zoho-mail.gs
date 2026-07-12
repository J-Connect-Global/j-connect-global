/**
 * J-Connect Zoho Mail transport.
 *
 * All secrets and identifiers are Script Properties.  This module deliberately
 * does not use MailApp or GmailApp: an email is either accepted by the Zoho
 * Mail API or the calling workflow receives a controlled failure code.
 */

const JCONNECT_REQUIRED_PUBLIC_EMAIL = 'contact@j-connect-global.com';
const ZOHO_ACCESS_TOKEN_CACHE_KEY = 'jconnect_zoho_access_token_v1';
const ZOHO_ACCESS_TOKEN_DEFAULT_TTL_SECONDS = 3300;

function getRequiredScriptProperty_(name) {
  const value = String(PropertiesService.getScriptProperties().getProperty(name) || '').trim();
  if (!value) throw new Error(`MISSING_SCRIPT_PROPERTY:${name}`);
  return value;
}

function validateJConnectEmailConfiguration_() {
  const publicEmail = getRequiredScriptProperty_('JCONNECT_PUBLIC_EMAIL').toLowerCase();
  const adminEmail = getRequiredScriptProperty_('JCONNECT_ADMIN_EMAIL').toLowerCase();
  if (publicEmail !== JCONNECT_REQUIRED_PUBLIC_EMAIL || adminEmail !== JCONNECT_REQUIRED_PUBLIC_EMAIL) {
    throw new Error('INVALID_JCONNECT_EMAIL_CONFIGURATION');
  }

  const accountId = getRequiredScriptProperty_('ZOHO_ACCOUNT_ID');
  const accountsBaseUrl = normalizeZohoBaseUrl_(getRequiredScriptProperty_('ZOHO_ACCOUNTS_BASE_URL'));
  const mailApiBaseUrl = normalizeZohoBaseUrl_(getRequiredScriptProperty_('ZOHO_MAIL_API_BASE_URL'));
  getRequiredScriptProperty_('ZOHO_CLIENT_ID');
  getRequiredScriptProperty_('ZOHO_CLIENT_SECRET');
  getRequiredScriptProperty_('ZOHO_REFRESH_TOKEN');

  return {
    publicEmail,
    adminEmail,
    accountId,
    accountsBaseUrl,
    mailApiBaseUrl
  };
}

function normalizeZohoBaseUrl_(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(normalized)) {
    throw new Error('INVALID_ZOHO_BASE_URL');
  }
  return normalized;
}

function getZohoAccessToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(ZOHO_ACCESS_TOKEN_CACHE_KEY);
  if (cached) return cached;

  const config = validateJConnectEmailConfiguration_();
  const response = UrlFetchApp.fetch(`${config.accountsBaseUrl}/oauth/v2/token`, {
    method: 'post',
    payload: {
      refresh_token: getRequiredScriptProperty_('ZOHO_REFRESH_TOKEN'),
      client_id: getRequiredScriptProperty_('ZOHO_CLIENT_ID'),
      client_secret: getRequiredScriptProperty_('ZOHO_CLIENT_SECRET'),
      grant_type: 'refresh_token'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    console.warn(`Zoho token request failed (HTTP ${response.getResponseCode()}).`);
    throw new Error('ZOHO_AUTH_FAILED');
  }

  let payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    console.warn('Zoho token response was not JSON.');
    throw new Error('ZOHO_AUTH_FAILED');
  }
  const token = String(payload && payload.access_token || '').trim();
  if (!token) {
    console.warn('Zoho token response did not include an access token.');
    throw new Error('ZOHO_AUTH_FAILED');
  }

  const expiresIn = Number(payload.expires_in);
  const ttl = Number.isFinite(expiresIn)
    ? Math.max(60, Math.min(3300, Math.floor(expiresIn) - 60))
    : ZOHO_ACCESS_TOKEN_DEFAULT_TTL_SECONDS;
  cache.put(ZOHO_ACCESS_TOKEN_CACHE_KEY, token, ttl);
  return token;
}

function sendZohoEmail_(message) {
  const config = validateJConnectEmailConfiguration_();
  const to = String(message && message.to || '').trim();
  const subject = String(message && message.subject || '').trim();
  let content = String(message && (message.html || message.htmlBody) || '').trim()
    || textToSafeEmailHtml_(message && message.body);
  const replyTo = String(message && message.replyTo || '').trim();
  if (isJConnectValidEmail_(replyTo)) {
    const safeReplyTo = textToSafeEmailHtml_(replyTo);
    content += `<p><strong>返信先メールアドレス:</strong><br><a href="mailto:${safeReplyTo}">mailto:${safeReplyTo}</a></p>`;
  }
  if (!isJConnectValidEmail_(to) || !subject || !content) {
    throw new Error('INVALID_EMAIL_MESSAGE');
  }

  const response = UrlFetchApp.fetch(
    `${config.mailApiBaseUrl}/accounts/${encodeURIComponent(config.accountId)}/messages`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Zoho-oauthtoken ${getZohoAccessToken_()}` },
      payload: JSON.stringify({
        fromAddress: config.publicEmail,
        toAddress: to,
        subject,
        content,
        mailFormat: 'html'
      }),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    console.warn(`Zoho mail send failed (HTTP ${status}).`);
    throw new Error('ZOHO_SEND_FAILED');
  }
  return { sent: true };
}

function isJConnectValidEmail_(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
}

function textToSafeEmailHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\r?\n/g, '<br>');
}

function testZohoEmailConfiguration_() {
  const config = validateJConnectEmailConfiguration_();
  sendZohoEmail_({
    to: config.adminEmail,
    subject: '[J-Connect] Zoho Mail configuration test',
    html: '<p>This is a J-Connect Zoho Mail configuration test.</p>'
  });
  return { ok: true, sender: config.publicEmail };
}
