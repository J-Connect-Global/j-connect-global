/**
 * J-Connect Germany Community Board API
 *
 * Deployment notes:
 * - Bind this script to the Community Posts spreadsheet or set
 *   COMMUNITY_SPREADSHEET_ID in Script Properties.
 * - The sheet must already contain the headers listed in the site request.
 *   This script maps by header name and does not add, rename, remove, or
 *   reorder columns.
 */

const COMMUNITY_SHEET_NAME = 'Community Posts';
const COMMUNITY_SITE_ORIGIN = 'https://j-connect-global.com';
const COMMUNITY_MANAGE_PATH = '/germany/ja/community/manage/';
const COMMUNITY_PUBLIC_POST_PATH = '/germany/ja/community/post/';
const COMMUNITY_CACHE_KEY = 'community_posts_public_v2';
const COMMUNITY_CACHE_SECONDS = 300;

const PUBLIC_POST_FIELDS = [
  'id',
  'post_id',
  'title',
  'body',
  'category1',
  'category2',
  'country',
  'region',
  'city',
  'nickname',
  'preferred_contact_method',
  'image_url_1',
  'image_url_2',
  'image_url_3',
  'images',
  'price',
  'event_date',
  'availability_date',
  'created_at',
  'updated_at',
  'published_at',
  'last_modified_at',
  'last_modified_action',
  'status',
  'closed_at'
];

const EDITABLE_POST_FIELDS = [
  'title',
  'body',
  'category1',
  'category2',
  'country',
  'region',
  'city',
  'nickname',
  'preferred_contact_method',
  'price',
  'event_date',
  'availability_date',
  'image_url_1',
  'image_url_2',
  'image_url_3',
  'images',
  'tags'
];

const PRIVATE_POST_FIELDS = [
  'contact_email_private',
  'contact_phone_private',
  'edit_password_hash',
  'edit_password_salt',
  'manage_token_hash',
  'manage_url',
  'edit_token',
  'delete_token',
  'admin_notes',
  'admin_note',
  'report_count',
  'moderation_status',
  'delete_url',
  'image_file_id_1',
  'image_file_id_2',
  'image_file_id_3'
];

function doGet(e) {
  return dispatchCommunityRequest_(e);
}

function doPost(e) {
  return dispatchCommunityRequest_(e);
}

function dispatchCommunityRequest_(e) {
  try {
    const params = requestParams_(e);
    const action = String(params.action || 'listPosts');
    let payload;

    if (action === 'getPosts' || action === 'listPosts') payload = listPosts_(params);
    else if (action === 'getPost') payload = getPost_(params);
    else if (action === 'submitPost' || action === 'createPost') payload = createPost_(params);
    else if (action === 'verifyManageAccess') payload = verifyManageAccess_(params);
    else if (action === 'updatePost') payload = updatePost_(params);
    else if (action === 'closePost') payload = setPostStatusWithAccess_(params, 'closed');
    else if (action === 'reopenPost') payload = setPostStatusWithAccess_(params, 'active');
    else if (action === 'deletePost') payload = setPostStatusWithAccess_(params, 'hidden');
    else if (action === 'deletePostByToken') payload = deletePostByLegacyToken_(params);
    else if (action === 'submitInquiry') payload = submitInquiry_(params);
    else if (action === 'submitReport') payload = submitReport_(params);
    else if (action === 'cancelCommunityPostRequest') payload = cancelCommunityPostRequest_(params);
    else payload = { ok: false, error: 'Unsupported action.' };

    return json_(payload);
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'Request failed.' });
  }
}

function requestParams_(e) {
  const params = Object.assign({}, e && e.parameter ? e.parameter : {});
  if (e && e.postData && e.postData.contents && String(e.postData.type || '').indexOf('application/json') !== -1) {
    try {
      Object.assign(params, JSON.parse(e.postData.contents));
    } catch (error) {
      console.warn('Invalid JSON payload.', error);
    }
  }
  return params;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('COMMUNITY_SPREADSHEET_ID');
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetContext_() {
  const sheet = getSpreadsheet_().getSheetByName(COMMUNITY_SHEET_NAME);
  if (!sheet) throw new Error('Community Posts sheet not found.');
  const values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('Community Posts sheet has no header row.');
  const headers = values[0].map((value) => String(value || '').trim());
  const indexes = {};
  headers.forEach((header, index) => {
    if (header) indexes[header] = index;
  });
  return { sheet, headers, indexes, values };
}

function rowToObject_(headers, row, rowNumber) {
  const output = { _rowNumber: rowNumber };
  headers.forEach((header, index) => {
    if (header) output[header] = row[index];
  });
  return output;
}

function writeExistingFields_(context, rowNumber, updates) {
  Object.keys(updates).forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(context.indexes, field)) return;
    context.sheet.getRange(rowNumber, context.indexes[field] + 1).setValue(updates[field]);
  });
}

function nowIso_() {
  return new Date().toISOString();
}

function normalizeStatus_(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'active';
  if (text === 'active') return 'active';
  if (text === 'closed') return 'closed';
  if (text === 'hidden') return 'hidden';
  if (text === 'pending') return 'pending';
  if (text === 'deleted') return 'deleted';
  if (text === 'inactive') return 'inactive';
  if (text === 'expired') return 'expired';
  return text;
}

function isExpired_(post) {
  const raw = post.expires_at;
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isPubliclyVisible_(post, params) {
  const status = normalizeStatus_(post.status);
  const includeClosed = String(params.includeClosed || 'true').toLowerCase() !== 'false';
  if (status === 'active') return !isExpired_(post);
  if (status === 'closed') return includeClosed && !isExpired_(post);
  return false;
}

function publicPostPayload_(post) {
  const status = normalizeStatus_(post.status);
  const payload = {};
  PUBLIC_POST_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(post, field)) payload[field] = cleanCell_(post[field]);
  });
  payload.id = cleanCell_(post.post_id || post.id || payload.id);
  payload.post_id = cleanCell_(post.post_id || post.id || payload.post_id);
  payload.status = status;
  payload.isActive = status === 'active';
  payload.isClosed = status === 'closed';
  payload.isExpired = isExpired_(post);
  PRIVATE_POST_FIELDS.forEach((field) => delete payload[field]);
  delete payload._rowNumber;
  return payload;
}

function editablePostPayload_(post) {
  const payload = publicPostPayload_(post);
  EDITABLE_POST_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(post, field)) payload[field] = cleanCell_(post[field]);
  });
  return payload;
}

function cleanCell_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '';
  return value;
}

function listPosts_(params) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `${COMMUNITY_CACHE_KEY}:${String(params.includeClosed || 'true').toLowerCase()}`;
  if (String(params.bypassCache || '').toLowerCase() !== 'true') {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const context = getSheetContext_();
  const posts = context.values.slice(1)
    .map((row, index) => rowToObject_(context.headers, row, index + 2))
    .filter((post) => isPubliclyVisible_(post, params))
    .map(publicPostPayload_)
    .sort(comparePublicPosts_);
  const payload = { ok: true, items: posts, posts, count: posts.length };
  cache.put(cacheKey, JSON.stringify(payload), COMMUNITY_CACHE_SECONDS);
  return payload;
}

function getPost_(params) {
  const found = findPostById_(params.id || params.post_id || params.post);
  if (!found || !isPubliclyVisible_(found.post, { includeClosed: 'true' })) {
    return { ok: false, error: 'Post not found.' };
  }
  return { ok: true, post: publicPostPayload_(found.post) };
}

function comparePublicPosts_(a, b) {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
  return dateTime_(b.last_modified_at || b.updated_at || b.published_at || b.created_at)
    - dateTime_(a.last_modified_at || a.updated_at || a.published_at || a.created_at);
}

function dateTime_(value) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function findPostById_(postId) {
  const id = String(postId || '').trim();
  if (!id) return null;
  const context = getSheetContext_();
  for (let i = 1; i < context.values.length; i += 1) {
    const post = rowToObject_(context.headers, context.values[i], i + 1);
    if (String(post.post_id || '').trim() === id || String(post.id || '').trim() === id) {
      return { context, post, rowNumber: i + 1 };
    }
  }
  return null;
}

function createPost_(params) {
  const password = String(params.edit_password || params.password || '').trim();
  if (password.length < 6) return { ok: false, error: 'Edit password must be at least 6 characters.' };

  const context = getSheetContext_();
  const now = nowIso_();
  const postId = `post_${Utilities.getUuid()}`;
  const salt = randomToken_(18);
  const manageToken = randomToken_(32);
  const deleteToken = randomToken_(24);
  const editToken = randomToken_(24);
  const manageUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_MANAGE_PATH}?post=${encodeURIComponent(postId)}&token=${encodeURIComponent(manageToken)}`;
  const publicPostUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_PUBLIC_POST_PATH}?id=${encodeURIComponent(postId)}`;

  const imageData = saveImagesIfConfigured_(params, postId);
  const row = context.headers.map((header) => {
    const value = createPostValue_(header, params, {
      postId,
      now,
      salt,
      password,
      manageToken,
      manageUrl,
      publicPostUrl,
      deleteToken,
      editToken,
      imageData
    });
    return value === undefined ? '' : value;
  });

  context.sheet.appendRow(row);
  invalidateCommunityCache_();

  const emailResult = sendCreateConfirmationEmail_(params, {
    postId,
    title: String(params.title || '').trim(),
    manageUrl,
    publicPostUrl
  });

  return {
    ok: true,
    success: true,
    post_id: postId,
    id: postId,
    public_url: publicPostUrl,
    manage_url: manageUrl,
    email_sent: emailResult.sent,
    email_error: emailResult.error || ''
  };
}

function createPostValue_(header, params, generated) {
  if (header === 'id' || header === 'post_id') return generated.postId;
  if (header === 'created_at' || header === 'updated_at' || header === 'last_modified_at') return generated.now;
  if (header === 'published_at') return generated.now;
  if (header === 'status') return 'active';
  if (header === 'priority') return params.priority || '';
  if (header === 'edit_password_salt') return generated.salt;
  if (header === 'edit_password_hash') return sha256Hex_(`${generated.salt}:${generated.password}`);
  if (header === 'manage_token_hash') return sha256Hex_(generated.manageToken);
  if (header === 'manage_url') return generated.manageUrl;
  if (header === 'delete_token') return generated.deleteToken;
  if (header === 'edit_token') return generated.editToken;
  if (header === 'delete_url') return `${COMMUNITY_SITE_ORIGIN}/germany/ja/community/delete/?token=${encodeURIComponent(generated.deleteToken)}`;
  if (header === 'image_url_1') return generated.imageData.urls[0] || params.image_url_1 || '';
  if (header === 'image_url_2') return generated.imageData.urls[1] || params.image_url_2 || '';
  if (header === 'image_url_3') return generated.imageData.urls[2] || params.image_url_3 || '';
  if (header === 'image_file_id_1') return generated.imageData.fileIds[0] || '';
  if (header === 'image_file_id_2') return generated.imageData.fileIds[1] || '';
  if (header === 'image_file_id_3') return generated.imageData.fileIds[2] || '';
  if (header === 'images') return generated.imageData.urls.length ? JSON.stringify(generated.imageData.urls) : params.images || '';
  if (header === 'last_modified_action') return 'created';
  if (header === 'edit_history_json') return JSON.stringify([{ timestamp: generated.now, action: 'created', fields: [] }]);
  if (header === 'moderation_status') return params.moderation_status || '';
  if (Object.prototype.hasOwnProperty.call(params, header)) return params[header];
  return undefined;
}

function saveImagesIfConfigured_(params, postId) {
  const folderId = PropertiesService.getScriptProperties().getProperty('COMMUNITY_IMAGE_FOLDER_ID');
  if (!folderId) return { urls: [], fileIds: [] };
  const folder = DriveApp.getFolderById(folderId);
  const urls = [];
  const fileIds = [];
  for (let i = 1; i <= 3; i += 1) {
    const base64 = String(params[`image${i}_base64`] || '').trim();
    const name = String(params[`image${i}_name`] || `community-${postId}-${i}`).trim();
    if (!base64) continue;
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const bytes = Utilities.base64Decode(match[2]);
    const blob = Utilities.newBlob(bytes, match[1], `${postId}-${i}-${name}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileIds.push(file.getId());
    urls.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(file.getId())}&sz=w1200`);
  }
  return { urls, fileIds };
}

function verifyManageAccess_(params) {
  const verified = verifyAccess_(params);
  if (!verified.ok) return genericAccessFailure_();
  return { ok: true, success: true, post: editablePostPayload_(verified.post) };
}

function verifyAccess_(params) {
  const found = findPostById_(params.post_id || params.id || params.post);
  if (!found) return { ok: false };
  const password = String(params.password || params.edit_password || '').trim();
  const token = String(params.token || params.manage_token || '').trim();
  const salt = String(found.post.edit_password_salt || '');
  const storedPasswordHash = String(found.post.edit_password_hash || '');
  const storedTokenHash = String(found.post.manage_token_hash || '');
  const passwordOk = password && salt && storedPasswordHash && sha256Hex_(`${salt}:${password}`) === storedPasswordHash;
  const tokenOk = token && storedTokenHash && sha256Hex_(token) === storedTokenHash;
  if (!passwordOk && !tokenOk) return { ok: false };
  return Object.assign({ ok: true }, found);
}

function genericAccessFailure_() {
  return { ok: false, success: false, error: '投稿ID、編集用パスワード、または管理用リンクを確認してください。' };
}

function updatePost_(params) {
  const verified = verifyAccess_(params);
  if (!verified.ok) return genericAccessFailure_();
  const updates = {};
  const changed = [];
  EDITABLE_POST_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(params, field)) return;
    const next = params[field];
    if (String(cleanCell_(verified.post[field] || '')) !== String(next || '')) {
      updates[field] = next;
      changed.push(field);
    }
  });
  const now = nowIso_();
  updates.updated_at = now;
  updates.last_modified_at = now;
  updates.last_modified_action = 'edited';
  updates.edit_history_json = appendHistory_(verified.post.edit_history_json, {
    timestamp: now,
    action: 'edited',
    fields: changed
  });
  writeExistingFields_(verified.context, verified.rowNumber, updates);
  invalidateCommunityCache_();
  const refreshed = findPostById_(verified.post.post_id || verified.post.id);
  return { ok: true, success: true, post: editablePostPayload_(refreshed.post) };
}

function setPostStatusWithAccess_(params, nextStatus) {
  const verified = verifyAccess_(params);
  if (!verified.ok) return genericAccessFailure_();
  const now = nowIso_();
  const action = nextStatus === 'closed' ? 'closed' : nextStatus === 'hidden' ? 'deleted_by_user' : 'reopened';
  const updates = {
    status: nextStatus,
    updated_at: now,
    last_modified_at: now,
    last_modified_action: action,
    edit_history_json: appendHistory_(verified.post.edit_history_json, {
      timestamp: now,
      action,
      fields: ['status']
    })
  };
  if (nextStatus === 'closed') updates.closed_at = now;
  if (nextStatus === 'hidden') updates.deleted_at = now;
  writeExistingFields_(verified.context, verified.rowNumber, updates);
  invalidateCommunityCache_();
  return { ok: true, success: true, status: nextStatus, last_modified_at: now };
}

function deletePostByLegacyToken_(params) {
  const token = String(params.token || params.delete_token || '').trim();
  if (!token) return { ok: false, error: 'Invalid token.' };
  const context = getSheetContext_();
  for (let i = 1; i < context.values.length; i += 1) {
    const post = rowToObject_(context.headers, context.values[i], i + 1);
    if (String(post.delete_token || '').trim() !== token) continue;
    const now = nowIso_();
    writeExistingFields_(context, i + 1, {
      status: 'hidden',
      deleted_at: now,
      updated_at: now,
      last_modified_at: now,
      last_modified_action: 'deleted_by_user',
      edit_history_json: appendHistory_(post.edit_history_json, {
        timestamp: now,
        action: 'deleted_by_user',
        fields: ['status']
      })
    });
    invalidateCommunityCache_();
    return { ok: true, success: true };
  }
  return { ok: false, error: 'Invalid token.' };
}

function appendHistory_(raw, record) {
  let history = [];
  try {
    history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(history)) history = [];
  } catch (error) {
    history = [];
  }
  history.push(record);
  return JSON.stringify(history.slice(-30));
}

function invalidateCommunityCache_() {
  const cache = CacheService.getScriptCache();
  cache.remove(`${COMMUNITY_CACHE_KEY}:true`);
  cache.remove(`${COMMUNITY_CACHE_KEY}:false`);
}

function sendCreateConfirmationEmail_(params, info) {
  const to = String(params.contact_email_private || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { sent: false };
  try {
    const title = info.title || 'J-Connect Germany 掲示板投稿';
    const htmlBody = [
      '<p>J-Connect Germany 掲示板への投稿を受け付けました。</p>',
      `<p><strong>投稿タイトル:</strong> ${escapeHtmlForEmail_(title)}</p>`,
      `<p><strong>公開投稿リンク:</strong><br><a href="${info.publicPostUrl}">${info.publicPostUrl}</a></p>`,
      `<p><strong>管理用リンク:</strong><br><a href="${info.manageUrl}">${info.manageUrl}</a></p>`,
      '<p>このリンクは、投稿の編集・募集終了・再募集・非公開化に必要です。ブックマークまたは保存してください。</p>',
      '<p>投稿時に設定した編集用パスワードでも管理できます。パスワードは公開されません。</p>'
    ].join('');
    MailApp.sendEmail({
      to,
      subject: `【J-Connect Germany】投稿を受け付けました: ${title}`,
      name: 'J-Connect Germany',
      htmlBody,
      body: `J-Connect Germany 掲示板への投稿を受け付けました。\n\n投稿タイトル: ${title}\n公開投稿リンク: ${info.publicPostUrl}\n管理用リンク: ${info.manageUrl}\n\nこのリンクは投稿の編集・募集終了・再募集・非公開化に必要です。編集用パスワードでも管理できます。`
    });
    return { sent: true };
  } catch (error) {
    console.warn('Confirmation email failed.', error);
    return { sent: false, error: String(error && error.message || error) };
  }
}

function escapeHtmlForEmail_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cancelCommunityPostRequest_(params) {
  const adminEmail = PropertiesService.getScriptProperties().getProperty('COMMUNITY_ADMIN_EMAIL');
  if (!adminEmail) return { ok: false, code: 'ADMIN_EMAIL_NOT_CONFIGURED' };
  MailApp.sendEmail({
    to: adminEmail,
    subject: 'J-Connect Germany 掲示板投稿の取り消し依頼',
    name: 'J-Connect Germany',
    body: Object.keys(params).map((key) => `${key}: ${params[key]}`).join('\n')
  });
  return { ok: true };
}

function submitInquiry_(params) {
  const found = findPostById_(params.post_id || params.id || params.post);
  if (!found) return { ok: false, error: 'Post not found.' };
  const status = normalizeStatus_(found.post.status);
  if (status !== 'active' || isExpired_(found.post)) {
    return { ok: false, error: 'This post is closed.' };
  }
  const to = String(found.post.contact_email_private || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { ok: false, error: 'Contact email is unavailable.' };
  }
  const senderName = String(params.sender_name || '').trim();
  const senderEmail = String(params.sender_email || '').trim();
  const subject = String(params.subject || '').trim() || `J-Connect Germany æŽ²ç¤ºæ¿ã®æŠ•ç¨¿ã¸ã®å•ã„åˆã‚ã›`;
  const message = String(params.message || '').trim();
  if (!senderName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail) || !message) {
    return { ok: false, error: 'Required inquiry fields are missing.' };
  }
  MailApp.sendEmail({
    to,
    replyTo: senderEmail,
    name: 'J-Connect Germany',
    subject: `ã€J-Connect Germanyã€‘${subject}`,
    body: [
      'J-Connect Germany æŽ²ç¤ºæ¿ã®æŠ•ç¨¿ã«å•ã„åˆã‚ã›ãŒå±Šãã¾ã—ãŸã€‚',
      '',
      `æŠ•ç¨¿ID: ${found.post.post_id || found.post.id || ''}`,
      `æŠ•ç¨¿ã‚¿ã‚¤ãƒˆãƒ«: ${found.post.title || ''}`,
      `é€ä¿¡è€…: ${senderName}`,
      `é€ä¿¡è€…ãƒ¡ãƒ¼ãƒ«: ${senderEmail}`,
      '',
      message
    ].join('\n')
  });
  return { ok: true, success: true };
}

function submitReport_(params) {
  const adminEmail = PropertiesService.getScriptProperties().getProperty('COMMUNITY_ADMIN_EMAIL');
  if (!adminEmail) return { ok: false, code: 'ADMIN_EMAIL_NOT_CONFIGURED' };
  MailApp.sendEmail({
    to: adminEmail,
    name: 'J-Connect Germany',
    subject: 'J-Connect Germany æŽ²ç¤ºæ¿æŠ•ç¨¿ã®é€šå ±',
    body: Object.keys(params).map((key) => `${key}: ${params[key]}`).join('\n')
  });
  return { ok: true, success: true };
}

function sha256Hex_(input) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  return digest.map((byte) => {
    const value = byte < 0 ? byte + 256 : byte;
    return (`0${value.toString(16)}`).slice(-2);
  }).join('');
}

function randomToken_(bytes) {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, Math.max(0, bytes || 16));
}
