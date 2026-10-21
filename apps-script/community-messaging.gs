/**
 * Community messaging. Deploy alongside community-board-api.gs and zoho-mail.gs.
 * Private tables never participate in the public data export. Each participant
 * (and each public reply) has one reusable bearer link derived by HMAC from a
 * server-only pepper; nothing that can reproduce it is stored in the workbook.
 * Links do not expire with time. Revoking access rotates the derivation input.
 */
const CM_VERSION = '2026-10-21.2';
const CM_PATH = '/germany/ja/community/conversation/';
const CM_HOUR = 60 * 60 * 1000;
const CM_TABLES = {
  replies: ['Community Replies', ['reply_id', 'post_id', 'nickname', 'body', 'email_private', 'reply_to', 'status', 'created_at', 'verified_at', 'published_at', 'session_hash', 'session_expires_at', 'request_id', 'reply_number', 'deletion_salt', 'deletion_hash', 'access_revoked_at']],
  conversations: ['Community Conversations', ['conversation_id', 'post_id', 'status', 'created_at', 'updated_at', 'request_id', 'target_reply_id', 'creation_hash']],
  participants: ['Community Participants', ['participant_id', 'conversation_id', 'role', 'nickname', 'email_private', 'session_hash', 'session_expires_at', 'verified_at', 'access_revoked_at']],
  messages: ['Community Messages', ['message_id', 'conversation_id', 'participant_id', 'body', 'created_at', 'request_id', 'deleted_at']],
  access: ['Community Access', ['access_id', 'token_hash', 'purpose', 'target_id', 'expires_at', 'consumed_at', 'created_at']],
  reports: ['Community Message Reports', ['report_id', 'kind', 'target_id', 'participant_id', 'reason', 'created_at']],
  blocks: ['Community Blocks', ['blocker_hash', 'blocked_hash', 'created_at']],
  notifications: ['Community Notifications', ['notification_id', 'email_private', 'purpose', 'target_id', 'kind', 'scope_id', 'source_id', 'subject', 'body', 'status', 'attempts', 'next_attempt_at', 'created_at']]
};

function cmMode_() { return 'public'; }

// Read operations must not create sheets or alter an existing workbook.
function cmTable_(kind, create) {
  const definition = CM_TABLES[kind];
  if (!definition) throw new Error('CM_TABLE_INVALID');
  const book = getSpreadsheet_();
  let sheet = book.getSheetByName(definition[0]);
  if (!sheet && create) {
    sheet = book.insertSheet(definition[0]);
    sheet.appendRow(definition[1]);
    sheet.setFrozenRows(1);
  }
  if (!sheet) return { sheet: null, headers: definition[1], rows: [] };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  // Only an exact prefix of the reviewed schema can be upgraded. Reads never
  // mutate sheets; initializeCommunityMessaging performs the append-only upgrade.
  if (headers.length > definition[1].length || headers.some((name, i) => name !== definition[1][i])) throw new Error('CM_SCHEMA_MISMATCH');
  if (create && headers.length < definition[1].length) sheet.getRange(1, 1, 1, definition[1].length).setValues([definition[1]]);
  return {
    sheet, headers: definition[1],
    rows: values.slice(1).map((row, index) => {
      const item = { _row: index + 2 };
      definition[1].forEach((key, column) => { item[key] = cmReadCell_(row[column]); });
      return item;
    }).filter((row) => String(row[definition[1][0]] || '').trim())
  };
}

function cmReadCell_(value) {
  const text = value instanceof Date ? value.toISOString() : String(value === undefined || value === null ? '' : value);
  return /^'[\s\uFEFF]*[=+@-]/.test(text) ? text.slice(1) : text;
}

function cmWriteCell_(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /^[\s\uFEFF]*[=+@-]/.test(text) ? "'" + text : text;
}

function cmAppend_(kind, row) {
  const table = cmTable_(kind, true);
  table.sheet.appendRow(table.headers.map((key) => cmWriteCell_(row[key])));
  return Object.assign({}, row, { _row: table.sheet.getLastRow() });
}

function cmSave_(kind, row) {
  const table = cmTable_(kind, true);
  if (!table.sheet || !row._row) throw new Error('CM_ROW_MISSING');
  table.sheet.getRange(row._row, 1, 1, table.headers.length)
    .setValues([table.headers.map((key) => cmWriteCell_(row[key]))]);
}

function cmFind_(kind, key, value) {
  return cmTable_(kind, false).rows.find((row) => String(row[key]) === String(value)) || null;
}

function cmId_(prefix) { return prefix + '-' + Utilities.getUuid(); }
function cmNow_() { return nowIso_(); }
function cmNickname_(value) { const text = String(value || '').trim().slice(0, 60); return /@|[?&#](?:access|token|session)=/i.test(text) ? '参加者' : text || '参加者'; }
function cmEmail_(value) { return String(value || '').trim().toLowerCase(); }
function cmValidId_(value) { return /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(String(value || '')); }
function cmToken_(value) { return /^[a-f0-9]{64}$/.test(String(value || '')); }

function cmFail_(code) {
  const messages = {
    UNAVAILABLE: '現在この機能を利用できません。時間をおいて再度お試しください。',
    INVALID_INPUT: '入力内容をご確認ください。',
    PUBLIC_CONTACT: '公開返信にはメールアドレスや個人用リンクを記載しないでください。',
    INVALID_ACCESS: 'このリンクでは開けません。リンクが取り消されたか、URLの一部が欠けている可能性があります。メール内のリンクをもう一度開くか、下のフォームから同じリンクを再送してください。',
    RATE_LIMITED: '短時間の送信が多いため、しばらくしてからお試しください。',
    CLOSED: 'この投稿・会話では新しい送信を受け付けていません。',
    WRONG_MODE: 'この投稿の連絡方法を、投稿詳細ページで確認してください。',
    SELF_CONTACT: '自分の投稿には問い合わせできません。',
    LIMIT: 'この会話の送信上限に達しました。'
  };
  return { ok: false, success: false, code, error: messages[code] || messages.UNAVAILABLE };
}

function cmParent_(id, existing) {
  if (!cmValidId_(id)) return null;
  const found = findPostById_(id);
  if (!found) return null;
  if (!existing) return isPubliclyVisible_(found.post) ? found.post : null;
  // Closing a sale does not remove the participants' private conversation.
  const post = found.post;
  if (['active', 'closed'].indexOf(String(post.status || '').trim()) === -1) return null;
  if (['hidden', 'deleted', 'spam', 'rejected'].indexOf(String(post.moderation_status || '').trim()) !== -1) return null;
  if (['deleted', 'is_deleted', 'hidden', 'is_hidden'].some((key) => isTrueLifecycleFlag_(post[key]))) return null;
  if (post.deleted_at || post.hidden_at) return null;
  return post;
}

function cmRate_(bucket, maximum, seconds) {
  const key = 'cm-rate:' + sha256Hex_(bucket);
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(key) || 0);
  if (count >= maximum) return false;
  cache.put(key, String(count + 1), seconds);
  return true;
}

function cmForm_(params) {
  const fields = readValidatedFields_(params, {
    post_id: { required: true, max: 160 }, nickname: { required: true, max: 60 },
    email: { required: true, max: 254, email: true }, body: { required: true, max: 4000 },
    request_id: { required: true, max: 100 }, reply_to: { max: 160 },
    website: { max: 0 }, form_started_at: { required: true, max: 20 }
  });
  if (!fields.ok || !isReasonableFormCompletion_(params.form_started_at)) return null;
  if (!cmValidId_(fields.values.request_id) || !cmValidId_(fields.values.post_id)) return null;
  fields.values.email = cmEmail_(fields.values.email);
  return fields.values;
}

function cmBlocked_(left, right) {
  const a = sha256Hex_(cmEmail_(left));
  const b = sha256Hex_(cmEmail_(right));
  return cmTable_('blocks', false).rows.some((row) =>
    (row.blocker_hash === a && row.blocked_hash === b) || (row.blocker_hash === b && row.blocked_hash === a));
}

// Pepper for access links. Created once and never rotated: rotating it would
// revoke every link that has been emailed.
function cmAccessPepper_() {
  const properties = PropertiesService.getScriptProperties();
  let pepper = String(properties.getProperty('CM_ACCESS_PEPPER') || '');
  if (!/^[a-f0-9]{64}$/.test(pepper)) { pepper = randomToken_(32); properties.setProperty('CM_ACCESS_PEPPER', pepper); }
  return pepper;
}

// The same row always yields the same 256-bit link until its access is revoked,
// so every email (including resent ones) carries an equally valid link.
function cmLinkToken_(kind, row) {
  const subject = kind === 'reply' ? row.reply_id : row.participant_id;
  const message = 'cm-access-link:v1:' + kind + ':' + subject + ':' + String(row.access_revoked_at || '');
  return Utilities.computeHmacSha256Signature(message, cmAccessPepper_()).map(function(byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function cmSameToken_(left, right) {
  if (!cmToken_(left) || !cmToken_(right)) return false;
  let difference = 0;
  for (let i = 0; i < 64; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

// Legacy access rows (one-hour links sent before 2026-10-21) stay usable unless
// their subject revoked access after they were issued.
function cmLegacyAccessValid_(access, row) {
  if (!access) return false;
  const revoked = Date.parse(String(row.access_revoked_at || '').split(' ')[0]);
  return !Number.isFinite(revoked) || Date.parse(access.created_at) > revoked;
}

function cmLink_(jobs, email, purpose, target, kind, id, queued, sourceId) {
  const row = cmFind_(kind === 'reply' ? 'replies' : 'participants', kind === 'reply' ? 'reply_id' : 'participant_id', target);
  if (!row) return;
  const notification = queued || cmAppend_('notifications', { notification_id: cmId_('notification'), email_private: email,
    purpose, target_id: target, kind, scope_id: id, source_id: String(sourceId || ''), subject: '', body: '', status: 'pending', attempts: '0', next_attempt_at: cmNow_(), created_at: cmNow_() });
  // Fragment is never sent in a web request or a referrer. Email addresses are
  // never included; the message text is, so it can be read without the link.
  const url = COMMUNITY_SITE_ORIGIN + CM_PATH + '?kind=' + kind + '&id=' + encodeURIComponent(id) + '#access=' + cmLinkToken_(kind, row);
  const lines = kind === 'reply' ? ['公開返信の管理ページを開くリンクです。'] : cmMessageMailLines_(row, notification.source_id);
  jobs.push({ notification_id: notification.notification_id, to: email, name: 'J-Connect Germany', subject: kind === 'reply' ? '【J-Connect】公開返信の管理リンク' : lines.subject, body: [
    ...lines, '', '返信や過去のやり取りは、下のリンクから会話を開いてください。',
    '', url, '',
    'このリンクには期限がなく、何度でも同じ会話を開けます。あなた専用のリンクですので、他の人に転送しないでください。',
    '心当たりがない場合は、このメールを無視してください。',
    '会話や返信は、サイト内の専用ページから行ってください。この通知メールへの返信は相手に届きません。'
  ].join('\n') });
}

// The notified message is read from the messages sheet when the mail is built,
// so a deleted message is never sent and the outbox never stores message text.
function cmMessageMailLines_(recipient, messageId) {
  const conversation = cmFind_('conversations', 'conversation_id', recipient.conversation_id);
  const post = conversation && findPostById_(conversation.post_id);
  const message = messageId ? cmFind_('messages', 'message_id', messageId) : null;
  const usable = message && message.conversation_id === recipient.conversation_id && !message.deleted_at;
  const own = usable && message.participant_id === recipient.participant_id;
  const sender = usable && !own ? cmFind_('participants', 'participant_id', message.participant_id) : null;
  // Resends and revocations carry no message: they only deliver the link.
  const linkOnly = !messageId;
  const lines = [
    linkOnly ? '非公開の会話を開くリンクをお送りします。' : own ? 'あなたが送信した非公開メッセージの控えです。' : usable ? cmNickname_(sender && sender.nickname) + 'さんから非公開メッセージが届きました。' : '非公開の会話に新しいメッセージがあります。',
    '投稿：' + String(post && post.post.title || '掲示板の投稿')
  ];
  if (usable) lines.push('', '----- メッセージ -----', String(message.body), '----------------------');
  lines.subject = linkOnly ? '【J-Connect】非公開会話のリンク' : own ? '【J-Connect】非公開メッセージを送信しました' : '【J-Connect】非公開メッセージが届きました';
  return lines;
}

function cmNotice_(jobs, subject, body, email) {
  const to = email || validateJConnectEmailConfiguration_().adminEmail;
  const notification = cmAppend_('notifications', { notification_id: cmId_('notification'), email_private: to,
    purpose: 'notice', subject, body, status: 'pending', attempts: '0', next_attempt_at: cmNow_(), created_at: cmNow_() });
  jobs.push({ notification_id: notification.notification_id, to, name: 'J-Connect Germany', subject, body });
}

function cmSession_(kind, row) {
  return { ok: true, success: true, scope: kind, id: kind === 'reply' ? row.reply_id : row.conversation_id, session: cmLinkToken_(kind, row) };
}

// The bearer value is either the participant's current link token or, for
// tabs opened before 2026-10-21, a hashed session that is no longer time-limited.
function cmAuth_(kind, params) {
  if (!cmToken_(params.session) || !cmValidId_(params.id)) return null;
  const linkKind = kind === 'replies' ? 'reply' : 'conversation';
  const digest = sha256Hex_(params.session);
  return cmTable_(kind, false).rows.find((row) =>
    (kind === 'replies' ? row.reply_id : row.conversation_id) === params.id &&
    (cmSameToken_(params.session, cmLinkToken_(linkKind, row)) || (cmToken_(row.session_hash) && row.session_hash === digest))) || null;
}

// Client-side PBKDF2-HMAC-SHA256 (600,000 rounds) derives a per-reply key.
// Only an HMAC under a server-only pepper is stored; no raw password or key is
// persisted, queued for email, included in DTOs, or exported to GitHub.
function cmDeletionDigest_(key) {
  const pepper = getRequiredScriptProperty_('CM_DELETION_PEPPER');
  return Utilities.computeHmacSha256Signature(key, pepper).map(function(byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function cmPublicPostUrl_(id) { return COMMUNITY_SITE_ORIGIN + '/germany/ja/community/posts/' + encodeURIComponent(id) + '/'; }

function cmReplyNumbers_(rows) {
  const counts = Object.create(null);
  return rows.map(function(row) {
    const number = Number(row.reply_number) || (Number(counts[row.post_id] || 0) + 1);
    counts[row.post_id] = Math.max(Number(counts[row.post_id] || 0), number);
    return Object.assign({}, row, { reply_number: String(number) });
  });
}

function cmCreateReply_(params, jobs) {
  const form = cmForm_(params);
  if (!form || params.public_consent !== 'true' || !cmToken_(params.deletion_key) || !cmToken_(params.deletion_salt)) return cmFail_('INVALID_INPUT');
  const post = cmParent_(form.post_id, false);
  if (!post) return cmFail_('CLOSED');
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(form.body + form.nickname)
    || /[?&#](?:token|access|session|secret|manage_token)=/i.test(form.body)) return cmFail_('PUBLIC_CONTACT');
  const rows = cmReplyNumbers_(cmTable_('replies', false).rows);
  let row = rows.find(item => item.post_id === form.post_id && item.email_private === form.email && item.request_id === form.request_id);
  if (row) {
    if (!row.deletion_hash || row.deletion_hash !== cmDeletionDigest_(params.deletion_key)) return cmFail_('INVALID_ACCESS');
    return { ok: true, success: true, id: row.reply_id, reply: cmPublicRepliesForPost_(post, [row])[0], confirmation_required: false, notification_pending: true };
  }
  if (form.reply_to && !cmPublicRepliesForPost_(post, rows).some(reply => reply.id === form.reply_to && !reply.deleted)) return cmFail_('INVALID_INPUT');
  if (!cmRate_('submit:' + form.email, 10, 3600) || !cmRate_('submit:all', 100, 3600)) return cmFail_('RATE_LIMITED');
  const number = rows.filter(item => item.post_id === form.post_id).reduce((max, item) => Math.max(max, Number(item.reply_number)), 0) + 1;
  row = cmAppend_('replies', {
    reply_id: cmId_('reply'), post_id: form.post_id, nickname: form.nickname, body: form.body,
    email_private: form.email, reply_to: form.reply_to, status: 'published', created_at: cmNow_(),
    verified_at: '', published_at: cmNow_(), session_hash: '', session_expires_at: '', request_id: form.request_id,
    reply_number: String(number), deletion_salt: params.deletion_salt, deletion_hash: cmDeletionDigest_(params.deletion_key)
  });
  cmInvalidatePublic_(true);
  cmNotice_(jobs, '【J-Connect】公開返信を投稿しました',
    '公開返信 #' + number + 'を投稿しました。\n' + cmPublicPostUrl_(form.post_id) + '#reply-' + row.reply_id +
    '\n削除する場合は返信の「削除」から、ご自身で設定した削除用パスワードを入力してください。パスワードはメールに記載しません。' +
    '\n身に覚えがない場合は、ページの通報から運営へお知らせください。', form.email);
  const recipientReply = form.reply_to ? rows.find(item => item.reply_id === form.reply_to && item.post_id === form.post_id) : null;
  const recipientEmail = cmEmail_(recipientReply ? recipientReply.email_private : post.contact_email_private);
  if (isJConnectValidEmail_(recipientEmail) && recipientEmail !== form.email) cmNotice_(jobs,
    '【J-Connect】公開返信が届きました', '公開返信 #' + number + 'が届きました。投稿ページでご確認ください。\n' + cmPublicPostUrl_(form.post_id) + '#reply-' + row.reply_id, recipientEmail);
  return { ok: true, success: true, id: row.reply_id, reply: cmPublicRepliesForPost_(post, [row])[0], confirmation_required: false, notification_pending: true };
}

function cmCreateConversation_(params, jobs) {
  const form = cmForm_(params);
  if (!form || params.private_consent !== 'true' || !cmToken_(params.creation_key)) return cmFail_('INVALID_INPUT');
  const post = cmParent_(form.post_id, false);
  if (!post) return cmFail_('CLOSED');
  const reply = form.reply_to ? cmFind_('replies', 'reply_id', form.reply_to) : null;
  if (form.reply_to && (!reply || reply.post_id !== form.post_id || ['approved', 'published'].indexOf(reply.status) === -1)) return cmFail_('INVALID_INPUT');
  const ownerEmail = cmEmail_(reply ? reply.email_private : post.contact_email_private);
  if (!isJConnectValidEmail_(ownerEmail)) return cmFail_('UNAVAILABLE');
  if (ownerEmail === form.email) return cmFail_('SELF_CONTACT');
  let conversation = cmTable_('conversations', false).rows.find(row => row.post_id === form.post_id && row.request_id === form.request_id);
  if (conversation) {
    if (conversation.creation_hash !== sha256Hex_(params.creation_key)) return cmFail_('INVALID_ACCESS');
    const guest = cmTable_('participants', false).rows.find(row => row.conversation_id === conversation.conversation_id && row.role === 'inquirer');
    if (!guest || guest.email_private !== form.email) return cmFail_('INVALID_ACCESS');
    return { ok: true, success: true, id: conversation.conversation_id, scope: 'conversation', session: cmLinkToken_('conversation', guest), confirmation_required: false, notification_pending: true };
  }
  if (!cmRate_('submit:' + form.email, 10, 3600) || !cmRate_('submit:all', 100, 3600)) return cmFail_('RATE_LIMITED');
  if (cmBlocked_(form.email, ownerEmail)) return { ok: true, success: true, id: cmId_('conversation'), scope: 'conversation', session: randomToken_(32), confirmation_required: false, notification_pending: true };
  const id = cmId_('conversation');
  conversation = cmAppend_('conversations', { conversation_id: id, post_id: form.post_id, status: 'active', created_at: cmNow_(), updated_at: cmNow_(), request_id: form.request_id, target_reply_id: form.reply_to, creation_hash: sha256Hex_(params.creation_key) });
  const owner = cmAppend_('participants', { participant_id: cmId_('participant'), conversation_id: id, role: 'owner', nickname: cmNickname_(reply ? reply.nickname : post.nickname || '元の投稿者'), email_private: ownerEmail });
  const guest = cmAppend_('participants', { participant_id: cmId_('participant'), conversation_id: id, role: 'inquirer', nickname: cmNickname_(form.nickname), email_private: form.email,
    session_hash: '', session_expires_at: '', verified_at: '' });
  const first = cmAppend_('messages', { message_id: cmId_('message'), conversation_id: id, participant_id: guest.participant_id, body: form.body, created_at: cmNow_(), request_id: form.request_id });
  cmLink_(jobs, owner.email_private, 'conversation_login', owner.participant_id, 'conversation', id, null, first.message_id);
  cmLink_(jobs, form.email, 'conversation_login', guest.participant_id, 'conversation', id, null, first.message_id);
  return { ok: true, success: true, id, scope: 'conversation', session: cmLinkToken_('conversation', guest), confirmation_required: false, notification_pending: true };
}

// Opening a link never consumes it. The response is the subject's current link
// token, so a legacy one-hour link is upgraded to the permanent one.
function cmUseAccess_(params, jobs) {
  if (!cmToken_(params.access) || !cmValidId_(params.id) || ['reply', 'conversation'].indexOf(params.kind) === -1) return cmFail_('INVALID_ACCESS');
  if (!cmRate_('access:' + params.id, 60, 600)) return cmFail_('RATE_LIMITED');
  const tableKind = params.kind === 'reply' ? 'replies' : 'participants';
  const scopeKey = params.kind === 'reply' ? 'reply_id' : 'conversation_id';
  let purpose = params.kind === 'reply' ? 'reply_login' : 'conversation_login';
  let row = cmTable_(tableKind, false).rows.find((item) => item[scopeKey] === params.id && cmSameToken_(params.access, cmLinkToken_(params.kind, item))) || null;
  if (!row) {
    const access = cmFind_('access', 'token_hash', sha256Hex_(params.access));
    const purposes = params.kind === 'reply' ? ['reply_verify', 'reply_login'] : ['conversation_verify', 'conversation_login'];
    row = access && purposes.indexOf(access.purpose) !== -1 ? cmFind_(tableKind, params.kind === 'reply' ? 'reply_id' : 'participant_id', access.target_id) : null;
    if (!row || row[scopeKey] !== params.id || !cmLegacyAccessValid_(access, row)) return cmFail_('INVALID_ACCESS');
    purpose = access.purpose;
  }
  if (params.kind === 'reply') {
    if (purpose === 'reply_verify' && row.status === 'pending_email') {
      if (!cmParent_(row.post_id, false)) return cmFail_('CLOSED');
      row.verified_at = cmNow_(); row.status = 'pending'; cmSave_('replies', row);
      cmNotice_(jobs, '【J-Connect】公開返信の審査待ち', 'Community Repliesで確認する返信ID: ' + row.reply_id + '\n投稿ID: ' + row.post_id);
    } else if (!row.verified_at) { row.verified_at = cmNow_(); cmSave_('replies', row); }
    return cmSession_('reply', row);
  }
  const conversation = cmFind_('conversations', 'conversation_id', row.conversation_id);
  const post = conversation && cmParent_(conversation.post_id, true);
  if (!conversation || !post) return cmFail_('CLOSED');
  const participants = cmTable_('participants', false).rows.filter((item) => item.conversation_id === row.conversation_id);
  if (participants.length !== 2) return cmFail_('CLOSED');
  if (conversation.status === 'pending_email') {
    // Conversations created before instant delivery wait for the inquirer.
    if (row.role !== 'inquirer' || cmBlocked_(participants[0].email_private, participants[1].email_private)) return cmFail_('INVALID_ACCESS');
    conversation.status = 'active'; conversation.updated_at = cmNow_(); cmSave_('conversations', conversation);
    const owner = participants.find((item) => item.role === 'owner');
    cmLink_(jobs, owner.email_private, 'conversation_login', owner.participant_id, 'conversation', conversation.conversation_id);
  }
  if (!row.verified_at) { row.verified_at = cmNow_(); cmSave_('participants', row); }
  return cmSession_('conversation', row);
}

// Revoking invalidates every emailed link and open tab for this participant or
// reply. The current tab continues with the new link, which is also emailed.
function cmRevokeAccess_(params, jobs) {
  const reply = params.kind === 'reply';
  const row = reply ? cmAuth_('replies', params) : (cmConversationContext_(params) || {}).viewer;
  if (!row) return cmFail_('INVALID_ACCESS');
  if (!cmRate_('revoke:' + params.id, 3, 3600)) return cmFail_('RATE_LIMITED');
  // A trailing nonce keeps Sheets from converting the marker into a date, which
  // would change the link derivation input after the next read.
  row.access_revoked_at = cmNow_() + ' ' + randomToken_(8); row.session_hash = ''; row.session_expires_at = '';
  cmSave_(reply ? 'replies' : 'participants', row);
  cmLink_(jobs, row.email_private, reply ? 'reply_login' : 'conversation_login', reply ? row.reply_id : row.participant_id, params.kind, params.id);
  return cmSession_(params.kind, row);
}

function cmRequestAccess_(params, jobs) {
  const id = String(params.id || ''); const email = cmEmail_(params.email);
  if (!cmValidId_(id) || !isJConnectValidEmail_(email) || params.website || !isReasonableFormCompletion_(params.form_started_at)) return cmFail_('INVALID_INPUT');
  if (!cmRate_('recover:' + email, 3, 600) || !cmRate_('recover:' + id, 5, 600) || !cmRate_('recover:all', 100, 3600)) return cmFail_('RATE_LIMITED');
  if (params.kind === 'reply') {
    const row = cmFind_('replies', 'reply_id', id);
    if (row && row.email_private === email && cmParent_(row.post_id, true))
      cmLink_(jobs, email, row.status === 'pending_email' ? 'reply_verify' : 'reply_login', row.reply_id, 'reply', id);
  } else if (params.kind === 'conversation') {
    const conversation = cmFind_('conversations', 'conversation_id', id);
    const row = cmTable_('participants', false).rows.find((item) => item.conversation_id === id && item.email_private === email);
    if (row && conversation && cmParent_(conversation.post_id, true) && (conversation.status !== 'pending_email' || row.role === 'inquirer'))
      cmLink_(jobs, email, conversation.status === 'pending_email' ? 'conversation_verify' : 'conversation_login', row.participant_id, 'conversation', id);
  }
  return { ok: true, success: true, accepted: true };
}

function cmConversationContext_(params) {
  const viewer = cmAuth_('participants', params);
  if (!viewer) return null;
  const conversation = cmFind_('conversations', 'conversation_id', viewer.conversation_id);
  const post = conversation && cmParent_(conversation.post_id, true);
  if (!conversation || !post || conversation.status === 'pending_email') return null;
  const participants = cmTable_('participants', false).rows.filter((row) => row.conversation_id === viewer.conversation_id);
  if (participants.length !== 2) return null;
  const other = participants.find((row) => row.participant_id !== viewer.participant_id);
  return { viewer, other, conversation, post, blocked: cmBlocked_(viewer.email_private, other.email_private) };
}

function cmGetConversation_(params) {
  const context = cmConversationContext_(params);
  if (!context) return cmFail_('INVALID_ACCESS');
  const rows = cmTable_('messages', false).rows.filter((row) => row.conversation_id === context.conversation.conversation_id);
  let end = rows.length;
  if (params.before) {
    end = rows.findIndex((row) => row.message_id === params.before);
    if (end < 0) return cmFail_('INVALID_INPUT');
  }
  const start = Math.max(0, end - 50);
  return {
    ok: true, id: context.conversation.conversation_id, post_id: context.conversation.post_id,
    post_title: String(context.post.title || ''), target_reply_id: context.conversation.target_reply_id || '', nickname: cmNickname_(context.viewer.nickname), other_nickname: cmNickname_(context.other.nickname),
    status: context.blocked ? 'blocked' : context.conversation.status, has_more: start > 0,
    before: rows[start] ? rows[start].message_id : '',
    messages: rows.slice(start, end).map((row) => ({ id: row.message_id, body: row.deleted_at ? '' : row.body, deleted: Boolean(row.deleted_at), created_at: row.created_at,
      mine: row.participant_id === context.viewer.participant_id,
      nickname: cmNickname_(row.participant_id === context.viewer.participant_id ? context.viewer.nickname : context.other.nickname) }))
  };
}

function cmSendMessage_(params, jobs) {
  const context = cmConversationContext_(params);
  if (!context) return cmFail_('INVALID_ACCESS');
  if (context.blocked || context.conversation.status !== 'active') return cmFail_('CLOSED');
  const body = String(params.body || '').trim();
  if (!body || body.length > 4000 || !cmValidId_(params.request_id)) return cmFail_('INVALID_INPUT');
  const messages = cmTable_('messages', false).rows.filter((row) => row.conversation_id === context.conversation.conversation_id);
  const repeated = messages.find((row) => row.participant_id === context.viewer.participant_id && row.request_id === params.request_id);
  if (repeated) {
    const notification = cmTable_('notifications', false).rows.find((row) => row.source_id === repeated.message_id && row.scope_id === context.conversation.conversation_id);
    return { ok: true, success: true, id: repeated.message_id, notification_pending: !notification || notification.status !== 'sent' };
  }
  if (messages.length >= 500) return cmFail_('LIMIT');
  if (!cmRate_('message:' + context.viewer.participant_id, 1, 10)
    || !cmRate_('message:all', 300, 3600)) return cmFail_('RATE_LIMITED');
  const id = cmId_('message');
  cmAppend_('messages', { message_id: id, conversation_id: context.conversation.conversation_id, participant_id: context.viewer.participant_id, body, created_at: cmNow_(), request_id: params.request_id });
  context.conversation.updated_at = cmNow_(); cmSave_('conversations', context.conversation);
  cmLink_(jobs, context.other.email_private, 'conversation_login', context.other.participant_id, 'conversation', context.conversation.conversation_id, null, id);
  return { ok: true, success: true, id };
}

function cmEndConversation_(params) {
  const context = cmConversationContext_(params);
  if (!context) return cmFail_('INVALID_ACCESS');
  if (params.block === 'true' && !context.blocked && context.viewer.verified_at && context.other.verified_at) cmAppend_('blocks', {
    blocker_hash: sha256Hex_(context.viewer.email_private), blocked_hash: sha256Hex_(context.other.email_private), created_at: cmNow_()
  });
  context.conversation.status = params.block === 'true' ? 'blocked' : 'closed';
  context.conversation.updated_at = cmNow_(); cmSave_('conversations', context.conversation);
  return { ok: true, success: true };
}

function cmGetReply_(params) {
  const row = cmAuth_('replies', params);
  if (!row) return cmFail_('INVALID_ACCESS');
  return { ok: true, id: row.reply_id, post_id: row.post_id, nickname: row.nickname, body: row.body, status: row.status };
}

function cmReplyDeleteChallenge_(params) {
  const row = cmFind_('replies', 'reply_id', params.id);
  if (!row || !row.deletion_salt || !cmParent_(row.post_id, false) || ['published', 'approved'].indexOf(row.status) === -1) return cmFail_('INVALID_INPUT');
  return { ok: true, salt: row.deletion_salt, iterations: 600000 };
}

function cmDeleteReply_(params) {
  let row = cmAuth_('replies', params);
  if (!row) {
    if (!cmValidId_(params.id) || !cmToken_(params.deletion_key)) return cmFail_('INVALID_ACCESS');
    if (!cmRate_('delete:' + params.id, 5, 600)) return cmFail_('RATE_LIMITED');
    row = cmFind_('replies', 'reply_id', params.id);
    if (!row || !row.deletion_hash || row.deletion_hash !== cmDeletionDigest_(params.deletion_key)) return cmFail_('INVALID_ACCESS');
  }
  if (!cmParent_(row.post_id, true)) return cmFail_('CLOSED');
  row.status = 'hidden'; cmSave_('replies', row); cmInvalidatePublic_(true);
  return { ok: true, success: true };
}

function cmDeleteMessage_(params) {
  const context = cmConversationContext_(params);
  if (!context) return cmFail_('INVALID_ACCESS');
  const message = cmFind_('messages', 'message_id', params.message_id);
  if (!message || message.conversation_id !== context.conversation.conversation_id || message.participant_id !== context.viewer.participant_id) return cmFail_('INVALID_ACCESS');
  message.deleted_at = cmNow_(); cmSave_('messages', message);
  return { ok: true, success: true };
}

function cmReport_(params, jobs) {
  let participant = '';
  if (params.kind === 'conversation') {
    const context = cmConversationContext_(params);
    if (!context) return cmFail_('INVALID_ACCESS');
    participant = context.viewer.participant_id;
  } else if (params.kind === 'reply') {
    const reply = cmFind_('replies', 'reply_id', params.id);
    const post = reply && cmParent_(reply.post_id, false);
    if (!reply || ['approved', 'published'].indexOf(reply.status) === -1 || !post) return cmFail_('INVALID_INPUT');
    if (params.website || !isReasonableFormCompletion_(params.form_started_at)) return cmFail_('INVALID_INPUT');
  } else return cmFail_('INVALID_INPUT');
  const reason = String(params.reason || '').trim();
  if (!reason || reason.length > 1000) return cmFail_('INVALID_INPUT');
  if (!cmRate_('report:' + params.kind + ':' + params.id + ':' + participant, 1, 300)
    || !cmRate_('report:all', 50, 3600)) return cmFail_('RATE_LIMITED');
  const id = cmId_('report');
  cmAppend_('reports', { report_id: id, kind: params.kind, target_id: params.id, participant_id: participant, reason, created_at: cmNow_() });
  cmNotice_(jobs, '【J-Connect】会話・公開返信の通報', 'Community Message Reportsで確認する通報ID: ' + id);
  return { ok: true, success: true };
}

function cmPublicReplyIndex_() {
  const index = Object.create(null);
  cmTable_('replies', false).rows.forEach((row) => {
    if (!index[row.post_id]) index[row.post_id] = [];
    index[row.post_id].push(row);
  });
  return index;
}

function cmPublicRepliesForPost_(post, replyRows) {
  if (!post || !isPubliclyVisible_(post)) return [];
  const id = String(post.post_id || post.id || '');
  const rows = cmReplyNumbers_(Array.isArray(replyRows) ? replyRows : cmTable_('replies', false).rows);
  return rows.filter(row => row.post_id === id && ['approved', 'published', 'hidden'].indexOf(row.status) !== -1 && Number.isFinite(Date.parse(row.published_at))
    && cmValidId_(row.reply_id) && String(row.nickname || '').trim() && String(row.body || '').trim()
    && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(row.body + row.nickname)
    && !/[?&#](?:token|access|session|secret|manage_token)=/i.test(row.body))
    .slice(-200).map(row => {
      const parent = rows.find(item => item.reply_id === row.reply_to && item.post_id === id);
      const deleted = row.status === 'hidden';
      return { id: row.reply_id, post_id: row.post_id, number: Number(row.reply_number), nickname: deleted ? '削除済み' : cmNickname_(row.nickname), body: deleted ? '' : row.body,
        deleted, reply_to: row.reply_to || '', reply_to_number: parent ? Number(parent.reply_number) : 0, published_at: row.published_at,
        is_post_author: !deleted && Boolean(row.verified_at) && cmEmail_(row.email_private) === cmEmail_(post.contact_email_private) };
    });
}

function cmInvalidatePublic_(defer) {
  try { CacheService.getScriptCache().remove(COMMUNITY_CACHE_KEY); } catch (_) {}
  PropertiesService.getScriptProperties().setProperty('CM_PUBLIC_DIRTY', 'true');
  if (!defer) cmFlushPublic_();
}

function cmFlushPublic_() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('CM_PUBLIC_DIRTY') !== 'true') return;
  try { const result = requestCommunityPublicDataSync_(); if (result && result.dispatched) properties.deleteProperty('CM_PUBLIC_DIRTY'); }
  catch (_) { console.warn('Community reply sync queued for scheduled sync.'); }
}

function initializeCommunityMessaging() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); Object.keys(CM_TABLES).forEach(kind => cmTable_(kind, true));
    const properties = PropertiesService.getScriptProperties();
    if (!properties.getProperty('CM_DELETION_PEPPER')) properties.setProperty('CM_DELETION_PEPPER', randomToken_(32));
    cmReplyNumbers_(cmTable_('replies', false).rows).forEach(row => cmSave_('replies', row));
  }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}

function approveSelectedCommunityReply() { cmModerateSelectedReply_('approved'); }
function hideSelectedCommunityReply() { cmModerateSelectedReply_('hidden'); }

function cmModerateSelectedReply_(status) {
  const sheet = getSpreadsheet_().getActiveSheet();
  if (!sheet || sheet.getName() !== CM_TABLES.replies[0]) throw new Error('Community Repliesの返信行を選択してください。');
  const lock = LockService.getScriptLock(); const jobs = [];
  try {
    lock.waitLock(10000);
    const row = cmTable_('replies', false).rows.find((item) => item._row === sheet.getActiveRange().getRow());
    const post = row && cmParent_(row.post_id, false);
    if (!row || (status === 'approved' && (!post || (!row.verified_at && row.status !== 'published' && row.status !== 'hidden')))) throw new Error('確認済みの公開返信を選択してください。');
    if (status === 'approved' && row.status === 'approved') return;
    row.status = status; if (status === 'approved') row.published_at = cmNow_(); cmSave_('replies', row);
    cmInvalidatePublic_();
    if (status === 'approved' && isJConnectValidEmail_(String(post.contact_email_private || ''))) cmNotice_(jobs,
      '【J-Connect】質問に公開返信が届きました',
      '投稿に公開返信が掲載されました。\n' + COMMUNITY_SITE_ORIGIN + '/germany/ja/community/post/?id=' + encodeURIComponent(row.post_id) + '\n返信内容は投稿ページで確認してください。', post.contact_email_private);
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  cmDeliver_(jobs);
}

// Persist only delivery metadata. Access links exist only in a transient mail
// job; a retry derives the same link again. Delivery is serialized by the script
// lock so a scheduled retry cannot race a foreground send.
function cmDeliver_(jobs) {
  let delivered = true;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    jobs.forEach((job) => {
      const notification = cmFind_('notifications', 'notification_id', job.notification_id);
      if (!notification || notification.status === 'sent') return;
      try {
        sendZohoEmail_({ to: job.to, name: job.name, subject: job.subject, body: job.body });
        notification.status = 'sent';
      } catch (error) { delivered = false; console.warn('Community notification delivery will be retried.'); }
      notification.attempts = String(Number(notification.attempts || 0) + 1);
      notification.next_attempt_at = berlinTimestamp_(new Date(Date.now() + Math.min(24, Math.pow(2, Number(notification.attempts))) * CM_HOUR));
      cmSave_('notifications', notification);
    });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  return delivered;
}

// Add to the existing five-minute trigger, or run from the spreadsheet menu.
function processCommunityMessagingNotifications() {
  const lock = LockService.getScriptLock(); const jobs = [];
  try {
    lock.waitLock(10000);
    cmTable_('notifications', false).rows.filter((row) => row.status === 'pending' && Date.parse(row.next_attempt_at) <= Date.now()).slice(0, 10).forEach((row) => {
      if (row.purpose === 'notice') jobs.push({ notification_id: row.notification_id, to: row.email_private, name: 'J-Connect Germany', subject: row.subject, body: row.body });
      else {
        // Do not notify an owner of an unverified or removed conversation.
        const target = cmFind_(row.kind === 'reply' ? 'replies' : 'participants', row.kind === 'reply' ? 'reply_id' : 'participant_id', row.target_id);
        const parent = row.kind === 'reply' ? target : target && cmFind_('conversations', 'conversation_id', target.conversation_id);
        if (!target || !parent || !cmParent_(parent.post_id, row.purpose.indexOf('verify') === -1)) { row.status = 'cancelled'; cmSave_('notifications', row); return; }
        cmLink_(jobs, row.email_private, row.purpose, row.target_id, row.kind, row.scope_id, row);
      }
    });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  cmDeliver_(jobs);
  cmFlushPublic_();
}

function cmDispatch_(action, params, isPost) {
  if (action === 'communityMessagingStatus') return { ok: true, messaging_version: CM_VERSION, public_replies: true, private_conversations: true, inline_replies: true, instant_publish: true, persistent_links: true };
  if (action === 'communityPublicReplies') {
    const post = cmParent_(params.post_id, false);
    return { ok: true, replies: post ? cmPublicRepliesForPost_(post) : [] };
  }
  // Credentials in GET query strings would leak into logs. Even authenticated
  // reads and link exchange are accepted only in POST bodies.
  if (!isPost) return cmFail_('INVALID_ACCESS');
  const lock = LockService.getScriptLock(); const jobs = []; let result;
  try {
    lock.waitLock(10000);
    const actions = {
      communityCreateReply: () => cmCreateReply_(params, jobs),
      communityCreateConversation: () => cmCreateConversation_(params, jobs),
      communityUseAccess: () => cmUseAccess_(params, jobs),
      communityRequestAccess: () => cmRequestAccess_(params, jobs),
      communityRevokeAccess: () => cmRevokeAccess_(params, jobs),
      communityGetConversation: () => cmGetConversation_(params),
      communitySendMessage: () => cmSendMessage_(params, jobs),
      communityEndConversation: () => cmEndConversation_(params),
      communityGetReply: () => cmGetReply_(params),
      communityDeleteReply: () => cmDeleteReply_(params),
      communityReplyDeleteChallenge: () => cmReplyDeleteChallenge_(params),
      communityDeleteMessage: () => cmDeleteMessage_(params),
      communityReport: () => cmReport_(params, jobs)
    };
    result = actions[action] ? actions[action]() : cmFail_('INVALID_INPUT');
  } catch (error) {
    console.warn('Community messaging request failed.'); result = cmFail_('UNAVAILABLE');
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  // Public posting and first private contact respond after durable storage;
  // the existing five-minute worker delivers notices without delaying display.
  if (['communityCreateReply', 'communityCreateConversation'].indexOf(action) === -1 && !cmDeliver_(jobs) && result.ok) result.notification_pending = true;
  return result;
}
