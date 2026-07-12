/**
 * J-Connect Germany Community Board API
 *
 * Deployment notes:
 * - Bind this script to the Community Posts spreadsheet or set
 *   COMMUNITY_SPREADSHEET_ID in Script Properties.
 * - The sheet must already contain the headers listed in the site request.
 *   This script maps by header name and does not rename, remove, or reorder
 *   columns. The administrator-only approval setup menu may append its
 *   documented notification columns when explicitly invoked.
 * - Community Posts may have an instruction row above the header row.
 * - Community management uses server-generated manage_token/manage_url only.
 *   Email the private management link to contact_email_private.
 * - Dates are normalized into availability_date.
 */

const COMMUNITY_SHEET_NAME = 'Community Posts';
const COMMUNITY_SITE_ORIGIN = 'https://j-connect-global.com';
const COMMUNITY_MANAGE_PATH = '/germany/ja/community/manage/';
const COMMUNITY_PUBLIC_POST_PATH = '/germany/ja/community/post/';
const COMMUNITY_CACHE_KEY = 'community_posts_public_v2';
const COMMUNITY_CACHE_SECONDS = 300;
const COMMUNITY_PUBLIC_POSTS_JSON_URL = 'https://j-connect-global.com/assets/data/community/posts.json';
const COMMUNITY_GITHUB_WORKFLOW_URL = 'https://api.github.com/repos/J-Connect-Global/j-connect-global/actions/workflows/sync-public-data.yml/dispatches';
const COMMUNITY_APPROVAL_TRIGGER_HANDLER = 'processWaitingCommunityApprovalNotifications';
const COMMUNITY_APPROVAL_TIMEOUT_MS = 90 * 60 * 1000;
const COMMUNITY_APPROVAL_MAX_ROWS_PER_RUN = 12;
const COMMUNITY_APPROVAL_HEADERS = [
  'approval_notified_status',
  'approval_notified_at',
  'approval_notified_to',
  'approval_notified_error',
  'approval_notified_queued_at',
  'approval_sync_requested_at'
];

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
  'image_url_1',
  'image_url_2',
  'image_url_3',
  'images',
  'price',
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
  'price',
  'availability_date',
  'image_url_1',
  'image_url_2',
  'image_url_3',
  'images',
  'tags'
];

const CREATE_POST_PARAM_FIELDS = [
  'title',
  'body',
  'category1',
  'category2',
  'country',
  'region',
  'city',
  'nickname',
  'price',
  'tags',
  'contact_email_private'
];

const PRIVATE_POST_FIELDS = [
  'contact_email_private',
  'manage_token_hash',
  'manage_url',
  'admin_notes',
  'admin_note',
  'report_count',
  'moderation_status',
  'image_file_id_1',
  'image_file_id_2',
  'image_file_id_3',
  'approval_notified_status',
  'approval_notified_at',
  'approval_notified_to',
  'approval_notified_error',
  'approval_notified_queued_at',
  'approval_sync_requested_at'
];

const REQUIRED_COMMUNITY_HEADERS = [
  'post_id',
  'status',
  'category1',
  'title',
  'body'
];

const CREATE_POST_FIELD_LABELS = {
  category1: '投稿カテゴリ',
  category2: '投稿の種類',
  title: 'タイトル',
  body: '本文',
  country: '国',
  city: '地域',
  nickname: 'ニックネーム',
  price: '価格',
  availability_date: '目安日',
  contact_email_private: '非公開メールアドレス'
};

const CREATE_POST_BASE_REQUIRED_FIELDS = [
  'category1',
  'category2',
  'title',
  'body',
  'contact_email_private'
];

// These fields are intentionally optional for every community category.
// Keep this list as a defensive guard so future edits cannot accidentally
// reintroduce nickname/name as a server-side required field.
const CREATE_POST_ALWAYS_OPTIONAL_FIELDS = [
  'nickname',
  'name',
  'display_name',
  'author_name',
  'poster_name'
];

const CREATE_POST_CATEGORY_RULES = {
  '売ります': {
    locationRequired: true,
    price: { visible: true, required: true, label: '価格' },
    availability_date: { visible: true, required: false, label: '受け渡し可能日' }
  },
  '買います': {
    locationRequired: true,
    price: { visible: true, required: false, label: '予算' },
    availability_date: { visible: true, required: false, label: '希望期限' }
  },
  '譲ります': {
    locationRequired: true,
    price: { visible: true, required: false, label: '譲渡条件/価格' },
    availability_date: { visible: true, required: false, label: '引き渡し可能日' }
  },
  '探しています': {
    locationRequired: true,
    price: { visible: true, required: false, label: '予算/謝礼' },
    availability_date: { visible: true, required: false, label: '探している期限' }
  },
  '友達募集': {
    locationRequired: true,
    price: { visible: false, required: false, label: '価格' },
    availability_date: { visible: true, required: false, label: '希望時期' }
  },
  'イベント': {
    locationRequired: true,
    price: { visible: true, required: false, label: '参加費' },
    availability_date: { visible: true, required: true, label: '開催日' }
  },
  'レッスン': {
    locationRequired: true,
    price: { visible: true, required: false, label: '料金/予算' },
    availability_date: { visible: true, required: false, label: '希望日時/開催日' }
  },
  '質問': {
    locationRequired: false,
    price: { visible: false, required: false, label: '価格' },
    availability_date: { visible: true, required: false, label: '解決したい時期' }
  },
  'アルバイト': {
    locationRequired: true,
    price: { visible: true, required: true, label: '報酬/時給' },
    availability_date: { visible: true, required: true, label: '勤務日/期間' }
  }
};

function doGet(e) {
  return dispatchCommunityRequest_(e);
}

function doPost(e) {
  return dispatchCommunityRequest_(e);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('J-Connect Community')
    .addItem('選択した投稿を承認・公開キューに追加', 'approveSelectedCommunityPost')
    .addItem('選択した投稿の公開確認を再試行', 'retrySelectedCommunityPublication')
    .addSeparator()
    .addItem('承認通知用の列を追加', 'installCommunityApprovalColumns')
    .addItem('承認通知トリガーを再インストール', 'installCommunityApprovalNotificationTrigger')
    .addToUi();
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
    else if (action === 'submitInquiry') payload = submitInquiry_(params);
    else if (action === 'submitReport') payload = submitReport_(params);
    else if (action === 'cancelCommunityPostRequest') payload = cancelCommunityPostRequest_(params);
    else if (action === 'submitContact') payload = submitContact_(params);
    else if (action === 'submitJobPosting') payload = submitJobPosting_(params);
    else payload = { ok: false, error: 'Unsupported action.' };

    return json_(payload);
  } catch (error) {
    console.error(`Community request failed: ${safeEmailErrorCode_(error)}`);
    return json_({ ok: false, success: false, error: '送信を完了できませんでした。時間をおいて再度お試しください。' });
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
  // Community Posts may include an instruction row above the actual header.
  // Scan the top rows so sheet row numbers still point at the real data rows.
  const headerRowIndex = findCommunityHeaderRowIndex_(values);
  if (headerRowIndex === -1) throw new Error('Community Posts sheet header row not found.');
  const headers = values[headerRowIndex].map((value) => String(value || '').trim());
  const indexes = {};
  headers.forEach((header, index) => {
    if (header) indexes[header] = index;
  });
  return {
    sheet,
    headers,
    indexes,
    values,
    headerRowNumber: headerRowIndex + 1,
    dataStartIndex: headerRowIndex + 1
  };
}

function findCommunityHeaderRowIndex_(values) {
  const scanRows = Math.min(values.length, 5);
  for (let rowIndex = 0; rowIndex < scanRows; rowIndex += 1) {
    const headers = values[rowIndex].map((value) => String(value || '').trim());
    const headerSet = {};
    headers.forEach((header) => {
      if (header) headerSet[header] = true;
    });
    const hasRequiredHeaders = REQUIRED_COMMUNITY_HEADERS.every((header) => headerSet[header]);
    if (hasRequiredHeaders) return rowIndex;
  }
  return -1;
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
  if (text === 'rejected') return 'rejected';
  if (text === 'draft') return 'draft';
  if (text === 'spam') return 'spam';
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
  const moderationStatus = normalizeStatus_(post.moderation_status);
  const deletedAt = String(cleanCell_(post.deleted_at || '')).trim();
  const blockedStatuses = ['hidden', 'deleted', 'inactive', 'pending', 'rejected', 'draft', 'expired', 'spam'];

  if (deletedAt) return false;
  if (blockedStatuses.indexOf(status) !== -1) return false;
  if (blockedStatuses.indexOf(moderationStatus) !== -1) return false;
  if (isExpired_(post)) return false;

  if (status === 'active') return !isExpired_(post);
  if (status === 'closed') return includeClosed;
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
  const posts = context.values.slice(context.dataStartIndex)
    .map((row, index) => rowToObject_(context.headers, row, context.dataStartIndex + index + 1))
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
  for (let i = context.dataStartIndex; i < context.values.length; i += 1) {
    const post = rowToObject_(context.headers, context.values[i], i + 1);
    if (String(post.post_id || '').trim() === id || String(post.id || '').trim() === id) {
      return { context, post, rowNumber: i + 1 };
    }
  }
  return null;
}

function createPostRuleForCategory_(category1) {
  return CREATE_POST_CATEGORY_RULES[String(category1 || '').trim()] || {
    locationRequired: true,
    price: { visible: true, required: false, label: CREATE_POST_FIELD_LABELS.price },
    availability_date: { visible: true, required: false, label: CREATE_POST_FIELD_LABELS.availability_date }
  };
}

function createPostParamValue_(params, field) {
  if (field === 'availability_date') return String(params.availability_date || params.date_value || '').trim();
  if (field === 'city') return String(params.city || params.custom_location || '').trim();
  return String(params[field] || '').trim();
}

function createPostMissingLabel_(field, rule) {
  if (field === 'price' && rule && rule.price && rule.price.label) return rule.price.label;
  if (field === 'availability_date' && rule && rule.availability_date && rule.availability_date.label) {
    return rule.availability_date.label;
  }
  return CREATE_POST_FIELD_LABELS[field] || field;
}

function normalizeRequiredCreatePostFields_(fields) {
  const seen = {};
  return fields
    .filter((field) => CREATE_POST_ALWAYS_OPTIONAL_FIELDS.indexOf(field) === -1)
    .filter((field) => {
      if (seen[field]) return false;
      seen[field] = true;
      return true;
    });
}

function requiredCreatePostFieldsForCategory_(category1) {
  const rule = createPostRuleForCategory_(category1);
  const requiredFields = CREATE_POST_BASE_REQUIRED_FIELDS.slice();

  if (rule.locationRequired) {
    requiredFields.push('country', 'city');
  }

  if (rule.price && rule.price.visible !== false && rule.price.required) {
    requiredFields.push('price');
  }

  if (rule.availability_date && rule.availability_date.visible !== false && rule.availability_date.required) {
    requiredFields.push('availability_date');
  }

  return normalizeRequiredCreatePostFields_(requiredFields);
}

function validateCreatePostParams_(params) {
  const rule = createPostRuleForCategory_(params.category1);
  const requiredFields = requiredCreatePostFieldsForCategory_(params.category1);
  const missingFields = requiredFields.filter((field) => !createPostParamValue_(params, field));
  const missingLabels = missingFields.map((field) => createPostMissingLabel_(field, rule));

  if (!missingFields.length) return { ok: true };

  return {
    ok: false,
    success: false,
    error: `未入力の必須項目があります。未入力の項目: ${missingLabels.join('、')}`,
    missing_fields: missingFields,
    missing_labels: missingLabels
  };
}

function createPost_(params) {
  const validation = validateCreatePostParams_(params);
  if (!validation.ok) return validation;

  const context = getSheetContext_();
  const now = nowIso_();
  const postId = `post_${Utilities.getUuid()}`;
  const manageToken = randomToken_(32);
  const manageUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_MANAGE_PATH}?post=${encodeURIComponent(postId)}&token=${encodeURIComponent(manageToken)}`;
  const publicPostUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_PUBLIC_POST_PATH}?id=${encodeURIComponent(postId)}`;

  const imageData = saveImagesIfConfigured_(params, postId);
  const row = context.headers.map((header) => {
    const value = createPostValue_(header, params, {
      postId,
      now,
      manageToken,
      manageUrl,
      publicPostUrl,
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
  if (header === 'published_at') return '';
  if (header === 'status') return 'pending';
  if (header === 'priority') return params.priority || '';
  if (header === 'manage_token_hash') return sha256Hex_(generated.manageToken);
  if (header === 'manage_url') return generated.manageUrl;
  if (header === 'price') {
    const rule = createPostRuleForCategory_(params.category1);
    return rule.price && rule.price.visible === false ? '' : params.price || '';
  }
  if (header === 'availability_date') return params.availability_date || params.date_value || '';
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
  if (CREATE_POST_PARAM_FIELDS.indexOf(header) !== -1 && Object.prototype.hasOwnProperty.call(params, header)) return params[header];
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
  const token = String(params.token || params.manage_token || '').trim();
  const storedTokenHash = String(found.post.manage_token_hash || '');
  const tokenOk = token && storedTokenHash && sha256Hex_(token) === storedTokenHash;
  if (!tokenOk) return { ok: false };
  return Object.assign({ ok: true }, found);
}

function genericAccessFailure_() {
  return { ok: false, success: false, error: '投稿ID、または管理用リンクを確認してください。' };
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

function installCommunityApprovalColumns() {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const context = getSheetContext_();
    const missing = COMMUNITY_APPROVAL_HEADERS.filter((header) => !Object.prototype.hasOwnProperty.call(context.indexes, header));
    if (missing.length) {
      context.sheet.getRange(context.headerRowNumber, context.headers.length + 1, 1, missing.length).setValues([missing]);
    }
    SpreadsheetApp.getUi().alert(missing.length ? `承認通知用の列を追加しました: ${missing.join(', ')}` : '承認通知用の列はすでに設定されています。');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function installCommunityApprovalNotificationTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === COMMUNITY_APPROVAL_TRIGGER_HANDLER)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger(COMMUNITY_APPROVAL_TRIGGER_HANDLER).timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert('承認通知の公開確認トリガーを5分間隔で設定しました。');
}

function approveSelectedCommunityPost() {
  return queueSelectedCommunityApproval_(false);
}

function retrySelectedCommunityPublication() {
  return queueSelectedCommunityApproval_(true);
}

function queueSelectedCommunityApproval_(isRetry) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const selected = selectedCommunityPost_();
    requireCommunityApprovalHeaders_(selected.context);
    const currentStatus = String(selected.post.approval_notified_status || '').trim().toLowerCase();
    if (currentStatus === 'sent') {
      SpreadsheetApp.getUi().alert('この投稿の承認メールはすでに送信済みです。');
      return { ok: true, status: 'sent' };
    }
    if (currentStatus === 'waiting_publish' && !isRetry) {
      SpreadsheetApp.getUi().alert('この投稿はすでに公開確認待ちです。公開確認後に投稿者へメールを送信します。');
      return { ok: true, status: 'waiting_publish' };
    }

    const recipient = String(selected.post.contact_email_private || '').trim();
    const now = nowIso_();
    const postId = String(selected.post.post_id || selected.post.id || '').trim();
    const updates = {
      status: 'active',
      published_at: selected.post.published_at || now,
      updated_at: now,
      last_modified_at: now,
      last_modified_action: isRetry ? 'approval_publish_retry' : 'approved',
      approval_notified_status: 'waiting_publish',
      approval_notified_at: '',
      approval_notified_to: recipient,
      approval_notified_error: '',
      approval_notified_queued_at: now,
      approval_sync_requested_at: ''
    };
    writeExistingFields_(selected.context, selected.rowNumber, updates);
    invalidateCommunityCache_();

    if (!isJConnectValidEmail_(recipient)) {
      writeExistingFields_(selected.context, selected.rowNumber, {
        approval_notified_status: 'publish_error',
        approval_notified_error: 'INVALID_RECIPIENT'
      });
      SpreadsheetApp.getUi().alert('投稿は公開状態にしましたが、通知先メールを確認できません。');
      return { ok: false, status: 'publish_error' };
    }

    const dispatch = requestCommunityPublicDataSync_();
    if (dispatch.dispatched) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_sync_requested_at: now });
    } else if (dispatch.error) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: dispatch.error });
    }
    SpreadsheetApp.getUi().alert('公開同期を開始しました。公開確認後に投稿者へメールを送信します。');
    return { ok: true, status: 'waiting_publish', post_id: postId };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function selectedCommunityPost_() {
  const context = getSheetContext_();
  const rowNumber = context.sheet.getActiveRange().getRow();
  if (rowNumber <= context.headerRowNumber || rowNumber > context.values.length) {
    throw new Error('SELECT_A_COMMUNITY_POST_ROW');
  }
  const post = rowToObject_(context.headers, context.values[rowNumber - 1], rowNumber);
  if (!String(post.post_id || post.id || '').trim()) throw new Error('SELECT_A_COMMUNITY_POST_ROW');
  return { context, post, rowNumber };
}

function requireCommunityApprovalHeaders_(context) {
  const missing = COMMUNITY_APPROVAL_HEADERS.filter((header) => !Object.prototype.hasOwnProperty.call(context.indexes, header));
  if (missing.length) throw new Error(`MISSING_APPROVAL_HEADERS:${missing.join(',')}`);
}

function requestCommunityPublicDataSync_() {
  const token = String(PropertiesService.getScriptProperties().getProperty('GITHUB_ACTIONS_TOKEN') || '').trim();
  if (!token) return { dispatched: false, error: '' };
  try {
    const response = UrlFetchApp.fetch(COMMUNITY_GITHUB_WORKFLOW_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify({ ref: 'main' }),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) return { dispatched: true };
    console.warn(`Community workflow dispatch failed (HTTP ${response.getResponseCode()}).`);
    return { dispatched: false, error: 'WORKFLOW_DISPATCH_FAILED' };
  } catch (error) {
    console.warn('Community workflow dispatch failed.');
    return { dispatched: false, error: 'WORKFLOW_DISPATCH_FAILED' };
  }
}

function processWaitingCommunityApprovalNotifications() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const context = getSheetContext_();
    requireCommunityApprovalHeaders_(context);
    let processed = 0;
    for (let index = context.dataStartIndex; index < context.values.length && processed < COMMUNITY_APPROVAL_MAX_ROWS_PER_RUN; index += 1) {
      const post = rowToObject_(context.headers, context.values[index], index + 1);
      if (String(post.approval_notified_status || '').trim().toLowerCase() !== 'waiting_publish') continue;
      processWaitingCommunityApprovalNotification_(context, post, index + 1);
      processed += 1;
    }
    return { ok: true, processed };
  } catch (error) {
    console.warn(`Community approval notification processor failed: ${safeApprovalErrorCode_(error)}`);
    return { ok: false, error: safeApprovalErrorCode_(error) };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function processWaitingCommunityApprovalNotification_(context, post, rowNumber) {
  const postId = String(post.post_id || post.id || '').trim();
  if (!postId || normalizeStatus_(post.status) !== 'active') {
    writeExistingFields_(context, rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: 'INVALID_APPROVAL_POST' });
    return;
  }
  const queuedAt = dateTime_(post.approval_notified_queued_at || post.published_at || post.updated_at);
  if (queuedAt && Date.now() - queuedAt > COMMUNITY_APPROVAL_TIMEOUT_MS) {
    writeExistingFields_(context, rowNumber, { approval_notified_status: 'publish_timeout', approval_notified_error: 'PUBLICATION_TIMEOUT' });
    return;
  }

  let published;
  try {
    published = isPostInDeployedCommunityJson_(postId);
  } catch (error) {
    writeExistingFields_(context, rowNumber, { approval_notified_error: safeApprovalErrorCode_(error) });
    return;
  }
  if (!published) return;

  const recipient = String(post.approval_notified_to || post.contact_email_private || '').trim();
  if (!isJConnectValidEmail_(recipient)) {
    writeExistingFields_(context, rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: 'INVALID_RECIPIENT' });
    return;
  }
  try {
    sendCommunityApprovalEmail_(post, recipient);
    writeExistingFields_(context, rowNumber, {
      approval_notified_status: 'sent',
      approval_notified_at: nowIso_(),
      approval_notified_to: recipient,
      approval_notified_error: ''
    });
  } catch (error) {
    writeExistingFields_(context, rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: safeApprovalErrorCode_(error) });
  }
}

function isPostInDeployedCommunityJson_(postId) {
  const response = UrlFetchApp.fetch(`${COMMUNITY_PUBLIC_POSTS_JSON_URL}?v=${Date.now()}`, { muteHttpExceptions: true });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('PUBLIC_JSON_FETCH_FAILED');
  let payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error('PUBLIC_JSON_INVALID');
  }
  const posts = Array.isArray(payload) ? payload : (payload.items || payload.posts || payload.data || []);
  return Array.isArray(posts) && posts.some((item) => {
    const id = String(item && (item.post_id || item.id) || '').trim();
    const status = normalizeStatus_(item && item.status);
    return id === postId && status === 'active';
  });
}

function sendCommunityApprovalEmail_(post, recipient) {
  const postId = String(post.post_id || post.id || '').trim();
  const title = String(cleanCell_(post.title || '')).trim() || 'J-Connect Germany 掲示板投稿';
  const publicUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_PUBLIC_POST_PATH}?id=${encodeURIComponent(postId)}`;
  sendZohoEmail_({
    to: recipient,
    name: 'J-Connect Germany',
    subject: `【J-Connect Germany】投稿を公開しました: ${title}`,
    html: `<p>投稿を公開しました。</p><p><strong>投稿タイトル:</strong><br>${escapeHtmlForEmail_(title)}</p><p><strong>公開投稿URL:</strong><br><a href="${escapeHtmlForEmail_(publicUrl)}">${escapeHtmlForEmail_(publicUrl)}</a></p>`,
    body: `投稿を公開しました。\n\n投稿タイトル:\n${title}\n\n公開投稿URL:\n${publicUrl}`
  });
}

function safeApprovalErrorCode_(error) {
  const code = String(error && error.message || 'PUBLICATION_CHECK_FAILED');
  return /^(WORKFLOW_DISPATCH_FAILED|PUBLIC_JSON_FETCH_FAILED|PUBLIC_JSON_INVALID|INVALID_RECIPIENT|INVALID_APPROVAL_POST|ZOHO_AUTH_FAILED|ZOHO_SEND_FAILED|SELECT_A_COMMUNITY_POST_ROW)$/.test(code)
    ? code
    : 'PUBLICATION_CHECK_FAILED';
}

function sendCreateConfirmationEmail_(params, info) {
  const to = String(params.contact_email_private || '').trim();
  if (!isJConnectValidEmail_(to)) return { sent: false, error: 'INVALID_RECIPIENT' };
  try {
    const title = info.title || 'J-Connect Germany 掲示板投稿';
    const safeTitle = escapeHtmlForEmail_(title);
    const safeManageUrl = escapeHtmlForEmail_(info.manageUrl);
    const safePublicPostUrl = escapeHtmlForEmail_(info.publicPostUrl);
    const htmlBody = [
      '<p>J-Connect Germany 掲示板への投稿を受け付けました。</p>',
      `<p><strong>投稿タイトル:</strong><br>${safeTitle}</p>`,
      '<p>投稿は管理者が確認後に掲載されます。<br>掲載まで数時間から数日かかる場合があります。</p>',
      '<p><strong>管理用リンク:</strong><br>下記URLから、投稿内容の編集、募集停止、再募集、非公開化ができます。<br>このリンクは投稿管理専用です。第三者には共有しないでください。</p>',
      `<p><a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
      '<p><strong>公開投稿リンク:</strong><br>管理者が投稿内容を確認・承認後、下記ページで投稿内容を閲覧できるようになります。</p>',
      `<p><a href="${safePublicPostUrl}">${safePublicPostUrl}</a></p>`,
      '<p>J-Connect Germany がログイン情報、銀行情報、公的ID番号を求めることはありません。</p>'
    ].join('');
    sendZohoEmail_({
      to,
      subject: `【J-Connect Germany】投稿を受け付けました: ${title}`,
      name: 'J-Connect Germany',
      htmlBody,
      body: `J-Connect Germany 掲示板への投稿を受け付けました。\n\n投稿タイトル:\n${title}\n\n投稿は管理者が確認後に掲載されます。\n掲載まで数時間から数日かかる場合があります。\n\n管理用リンク:\n下記URLから、投稿内容の編集、募集停止、再募集、非公開化ができます。\nこのリンクは投稿管理専用です。第三者には共有しないでください。\n\n${info.manageUrl}\n\n公開投稿リンク:\n管理者が投稿内容を確認・承認後、下記ページで投稿内容を閲覧できるようになります。\n\n${info.publicPostUrl}\n\nJ-Connect Germany がログイン情報、銀行情報、公的ID番号を求めることはありません。`
    });
    return { sent: true };
  } catch (error) {
    console.warn(`Community confirmation email failed: ${safeEmailErrorCode_(error)}`);
    return { sent: false, error: safeEmailErrorCode_(error) };
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
  const adminEmail = validateJConnectEmailConfiguration_().adminEmail;
  sendZohoEmail_({
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
  if (!isJConnectValidEmail_(to)) {
    return { ok: false, error: 'Contact email is unavailable.' };
  }
  const senderName = String(params.sender_name || '').trim();
  const senderEmail = String(params.sender_email || '').trim();
  const subject = String(params.subject || '').trim() || 'J-Connect Germany 掲示板の投稿への問い合わせ';
  const message = String(params.message || '').trim();
  if (!senderName || !isJConnectValidEmail_(senderEmail) || !message) {
    return { ok: false, error: 'Required inquiry fields are missing.' };
  }
  sendZohoEmail_({
    to,
    replyTo: senderEmail,
    name: 'J-Connect Germany',
    subject: `【J-Connect Germany】${subject}`,
    body: [
      'J-Connect Germany 掲示板の投稿に問い合わせが届きました。',
      '',
      `投稿ID: ${found.post.post_id || found.post.id || ''}`,
      `投稿タイトル: ${found.post.title || ''}`,
      `送信者: ${senderName}`,
      `送信者メール: ${senderEmail}`,
      '',
      message
    ].join('\n')
  });
  return { ok: true, success: true };
}

function submitReport_(params) {
  const fields = readValidatedFields_(params, {
    post_id: { required: true, max: 200 },
    reason: { required: true, max: 120 },
    detail: { max: 6000 },
    reporter_email: { max: 254, email: true },
    website: { max: 0 },
    form_started_at: { required: true, max: 20 }
  });
  if (!fields.ok) return safeFormFailure_(fields.code);
  if (!isReasonableFormCompletion_(fields.values.form_started_at)) return safeFormFailure_('FORM_TIMING');

  const found = findPostById_(fields.values.post_id);
  if (!found || !isPubliclyVisible_(found.post, { includeClosed: 'true' })) {
    return {
      ok: false,
      success: false,
      code: 'POST_NOT_FOUND',
      error: '通報対象の投稿が見つかりません。投稿詳細ページから、もう一度お試しください。'
    };
  }

  const canonicalPost = found.post;
  const postId = String(canonicalPost.post_id || canonicalPost.id || '').trim();
  if (!postId) return safeFormFailure_('POST_NOT_FOUND');
  const rateIdentity = fields.values.reporter_email || postId;
  if (!acquireSubmissionRateLimit_('submitReport', rateIdentity)) return safeFormFailure_('RATE_LIMITED');

  const title = String(cleanCell_(canonicalPost.title || '')).trim() || '無題の投稿';
  const category = [canonicalPost.category1, canonicalPost.category2]
    .map((value) => String(cleanCell_(value || '')).trim())
    .filter(Boolean)
    .join(' / ') || '未設定';
  const location = [canonicalPost.country, canonicalPost.region, canonicalPost.city]
    .map((value) => String(cleanCell_(value || '')).trim())
    .filter(Boolean)
    .join(' / ') || '未設定';
  const publicUrl = `${COMMUNITY_SITE_ORIGIN}${COMMUNITY_PUBLIC_POST_PATH}?id=${encodeURIComponent(postId)}`;
  const sentAt = nowIso_();
  const report = {
    postId,
    title,
    category,
    location,
    publicUrl,
    reason: fields.values.reason,
    detail: fields.values.detail || '（記載なし）',
    reporterEmail: fields.values.reporter_email || '（未入力）',
    sentAt
  };

  try {
    const config = validateJConnectEmailConfiguration_();
    const html = reportNotificationHtml_(report);
    const subjectTitle = title.length > 140 ? `${title.slice(0, 139)}…` : title;
    sendZohoEmail_({
      to: config.adminEmail,
      name: 'J-Connect Germany',
      subject: `【J-Connect 通報】${postId}｜${subjectTitle}`,
      html,
      body: reportNotificationText_(report)
    });
    return { ok: true, success: true };
  } catch (error) {
    console.warn(`Community report email failed: ${safeEmailErrorCode_(error)}`);
    return safeFormFailure_(safeEmailErrorCode_(error));
  }
}

function reportNotificationText_(report) {
  return [
    'J-Connect Community 投稿通報',
    '',
    `投稿ID: ${report.postId}`,
    `投稿タイトル: ${report.title}`,
    `投稿カテゴリー: ${report.category}`,
    `地域: ${report.location}`,
    `公開投稿URL: ${report.publicUrl}`,
    `通報理由: ${report.reason}`,
    `通報詳細: ${report.detail}`,
    `通報者メール: ${report.reporterEmail}`,
    `送信日時: ${report.sentAt}`
  ].join('\n');
}

function reportNotificationHtml_(report) {
  const rows = [
    ['投稿ID', report.postId],
    ['投稿タイトル', report.title],
    ['投稿カテゴリー', report.category],
    ['地域', report.location],
    ['公開投稿URL', report.publicUrl],
    ['通報理由', report.reason],
    ['通報詳細', report.detail],
    ['通報者メール', report.reporterEmail],
    ['送信日時', report.sentAt]
  ].map(([label, value]) => `<tr><th align="left" style="padding:8px;border:1px solid #dce4ee;background:#f4f8fc">${escapeHtmlForEmail_(label)}</th><td style="padding:8px;border:1px solid #dce4ee;white-space:pre-wrap">${escapeHtmlForEmail_(value)}</td></tr>`);
  return `<h2>J-Connect Community 投稿通報</h2><table style="border-collapse:collapse">${rows.join('')}</table>`;
}

function submitContact_(params) {
  const fields = readValidatedFields_(params, {
    name: { required: true, max: 120 },
    email: { required: true, max: 254, email: true },
    inquiry_type: { required: true, max: 120 },
    subject: { required: true, max: 180 },
    page_url: { max: 2048, url: true },
    message: { required: true, max: 6000 },
    website: { max: 0 },
    form_started_at: { required: true, max: 20 }
  });
  if (!fields.ok) return safeFormFailure_(fields.code);
  if (!isReasonableFormCompletion_(fields.values.form_started_at)) return safeFormFailure_('FORM_TIMING');
  if (!acquireSubmissionRateLimit_('submitContact', fields.values.email)) return safeFormFailure_('RATE_LIMITED');

  try {
    const config = validateJConnectEmailConfiguration_();
    sendZohoEmail_({
      to: config.adminEmail,
      subject: `[J-Connect] Contact inquiry: ${fields.values.subject}`,
      html: emailDefinitionList_('Contact inquiry', fields.values, ['name', 'email', 'inquiry_type', 'subject', 'page_url', 'message'])
    });
    sendZohoEmail_({
      to: fields.values.email,
      subject: '[J-Connect Germany] We received your inquiry',
      html: '<p>お問い合わせを受け付けました。内容を確認のうえ、ご連絡します。</p>'
    });
    return { ok: true, success: true };
  } catch (error) {
    console.warn(`Contact email failed: ${safeEmailErrorCode_(error)}`);
    return safeFormFailure_(safeEmailErrorCode_(error));
  }
}

function submitJobPosting_(params) {
  const fields = readValidatedFields_(params, {
    company_name: { required: true, max: 160 },
    contact_name: { required: true, max: 120 },
    contact_email: { required: true, max: 254, email: true },
    company_url: { max: 2048, url: true },
    position_title: { required: true, max: 120 },
    city: { required: true, max: 120 },
    employment_type: { required: true, max: 100 },
    salary: { max: 160 },
    visa_support: { max: 120 },
    start_date: { max: 120 },
    publish_date: { max: 120 },
    apply_method: { max: 240 },
    summary: { required: true, max: 1000 },
    job_details: { required: true, max: 6000 },
    requirements: { required: true, max: 4000 },
    free_comment: { max: 3000 },
    logo_url: { max: 2048, url: true },
    job_preview: { max: 12000 },
    website: { max: 0 },
    form_started_at: { required: true, max: 20 }
  });
  if (!fields.ok) return safeFormFailure_(fields.code);
  if (!isReasonableFormCompletion_(fields.values.form_started_at)) return safeFormFailure_('FORM_TIMING');
  if (!acquireSubmissionRateLimit_('submitJobPosting', fields.values.contact_email)) return safeFormFailure_('RATE_LIMITED');

  try {
    const config = validateJConnectEmailConfiguration_();
    const value = fields.values;
    const html = [
      emailDefinitionList_('Company information', value, ['company_name', 'company_url', 'logo_url']),
      emailDefinitionList_('Contact information', value, ['contact_name', 'contact_email']),
      emailDefinitionList_('Job summary', value, ['position_title', 'city', 'employment_type', 'salary', 'visa_support']),
      emailDefinitionList_('Job details', value, ['summary', 'job_details', 'requirements']),
      emailDefinitionList_('Publication preferences', value, ['start_date', 'publish_date', 'apply_method']),
      emailDefinitionList_('Optional comments', value, ['free_comment', 'job_preview'])
    ].join('');
    sendZohoEmail_({
      to: config.adminEmail,
      subject: `[J-Connect] Job posting request: ${value.position_title}`,
      html
    });
    sendZohoEmail_({
      to: value.contact_email,
      subject: '[J-Connect Germany] Job posting request received',
      html: '<p>求人掲載のご相談を受け付けました。We have received your job posting request and will contact you after review.</p>'
    });
    return { ok: true, success: true };
  } catch (error) {
    console.warn(`Job posting email failed: ${safeEmailErrorCode_(error)}`);
    return safeFormFailure_(safeEmailErrorCode_(error));
  }
}

function readValidatedFields_(params, rules) {
  const values = {};
  for (const name in rules) {
    const rule = rules[name];
    const value = String(params[name] || '').trim();
    if (rule.required && !value) return { ok: false, code: 'MISSING_REQUIRED_FIELD' };
    if (value.length > rule.max) return { ok: false, code: 'FIELD_TOO_LONG' };
    if (rule.email && value && !isJConnectValidEmail_(value)) return { ok: false, code: 'INVALID_EMAIL' };
    if (rule.url && value && !/^https?:\/\/[^\s]+$/i.test(value)) return { ok: false, code: 'INVALID_URL' };
    if (name === 'website' && value) return { ok: false, code: 'HONEYPOT' };
    values[name] = value;
  }
  return { ok: true, values };
}

function isReasonableFormCompletion_(startedAt) {
  const started = Number(startedAt);
  const elapsed = Date.now() - started;
  return Number.isFinite(started) && elapsed >= 2500 && elapsed <= 86400000;
}

function acquireSubmissionRateLimit_(action, email) {
  const key = `jconnect_form_rate:${sha256Hex_(`${action}:${String(email).toLowerCase()}`)}`;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const cache = CacheService.getScriptCache();
    if (cache.get(key)) return false;
    cache.put(key, '1', 300);
    return true;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function safeFormFailure_(code) {
  const messages = {
    MISSING_REQUIRED_FIELD: '必須項目を入力してください。',
    POST_NOT_FOUND: '通報対象の投稿が見つかりません。投稿詳細ページから、もう一度お試しください。',
    INVALID_EMAIL: 'メールアドレスをご確認ください。',
    INVALID_URL: 'URLの形式をご確認ください。',
    FIELD_TOO_LONG: '入力内容が長すぎます。',
    HONEYPOT: '送信を完了できませんでした。',
    FORM_TIMING: '送信を完了できませんでした。しばらくしてから再度お試しください。',
    RATE_LIMITED: '短時間に複数回送信されています。しばらくしてから再度お試しください。',
    ZOHO_AUTH_FAILED: '現在送信を受け付けられません。時間をおいて再度お試しください。',
    ZOHO_SEND_FAILED: '現在送信を受け付けられません。時間をおいて再度お試しください。'
  };
  return { ok: false, success: false, code, error: messages[code] || '送信を完了できませんでした。時間をおいて再度お試しください。' };
}

function safeEmailErrorCode_(error) {
  const code = String(error && error.message || 'EMAIL_DELIVERY_FAILED');
  return /^(ZOHO_AUTH_FAILED|ZOHO_SEND_FAILED)$/.test(code)
    ? code
    : 'EMAIL_DELIVERY_FAILED';
}

function emailDefinitionList_(heading, values, keys) {
  const labels = {
    name: 'Name', email: 'Email', inquiry_type: 'Inquiry type', subject: 'Subject', page_url: 'Page URL', message: 'Message',
    company_name: 'Company name', company_url: 'Company website', logo_url: 'Logo URL', contact_name: 'Contact person', contact_email: 'Contact email',
    position_title: 'Job title', city: 'Location / city', employment_type: 'Employment type', salary: 'Salary', visa_support: 'Visa support',
    start_date: 'Start date', publish_date: 'Preferred publishing date', apply_method: 'Application method', summary: 'Summary',
    job_details: 'Job details', requirements: 'Requirements', free_comment: 'Additional comments', job_preview: 'Job preview',
    post_id: 'Post ID', post: 'Post ID', reason: 'Reason', reporter_name: 'Reporter name', reporter_email: 'Reporter email',
    responsePostId: 'Post ID', title: 'Title', category1: 'Category', category2: 'Type', country: 'Country', city: 'City',
    price: 'Price', availability_date: 'Availability', cancellation_requested_at: 'Requested at'
  };
  const selected = keys || Object.keys(values || {});
  const rows = selected.filter((key) => values && values[key] !== undefined && values[key] !== '')
    .map((key) => `<dt>${escapeHtmlForEmail_(labels[key] || key)}</dt><dd>${escapeHtmlForEmail_(values[key]).replace(/\r?\n/g, '<br>')}</dd>`);
  return `<h2>${escapeHtmlForEmail_(heading)}</h2><dl>${rows.join('')}</dl>`;
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
