/**
 * J-Connect Global Community Board API
 *
 * Deployment notes:
 * - Set MASTER_SPREADSHEET_ID in Script Properties to the unified spreadsheet.
 *   COMMUNITY_SPREADSHEET_ID remains a legacy fallback. If neither property is
 *   set, the script uses its active spreadsheet.
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
const JOBS_SHEET_NAME = 'Jobs';
const PUBLIC_DATA_API_VERSION = '2026-07-13.1';
const DIRECTORY_SHEET_NAMES = {
  eat: 'eat',
  shopping: 'shopping',
  medical: 'medical'
};
const COMMUNITY_SITE_ORIGIN = 'https://j-connect-global.com';
const COMMUNITY_MANAGE_PATH = '/germany/ja/community/manage/';
const COMMUNITY_PUBLIC_POST_PATH = '/germany/ja/community/post/';
const COMMUNITY_CACHE_KEY = 'community_posts_public_v3';
const COMMUNITY_CACHE_SECONDS = 300;
const COMMUNITY_PUBLIC_POSTS_JSON_URL = 'https://j-connect-global.com/assets/data/community/posts.json';
const JOBS_PUBLIC_JSON_URL = 'https://j-connect-global.com/assets/data/jobs/jobs.json';
const JOB_PUBLIC_PATH = '/germany/ja/jobs/detail/';
const COMMUNITY_GITHUB_WORKFLOW_URL = 'https://api.github.com/repos/J-Connect-Global/j-connect-global/actions/workflows/sync-public-data.yml/dispatches';
const COMMUNITY_APPROVAL_TRIGGER_HANDLER = 'processWaitingCommunityApprovalNotifications';
const COMMUNITY_APPROVAL_TIMEOUT_MS = 90 * 60 * 1000;
const COMMUNITY_APPROVAL_MAX_ROWS_PER_RUN = 12;
const MODERATION_HEADERS = [
  'status',
  'updated_at',
  'published_at',
  'approval_notified_status',
  'approval_notified_at',
  'approval_notified_to',
  'approval_notified_error',
  'approval_notified_queued_at',
  'approval_sync_requested_at',
  'rejection_reason',
  'rejected_at',
  'last_modified_at',
  'last_modified_action'
];
const COMMUNITY_APPROVAL_HEADERS = MODERATION_HEADERS.slice();
const JOB_MANAGEMENT_HEADERS = [
  'job_id',
  'status',
  'created_at',
  'updated_at',
  'published_at',
  'submission_key'
].concat(MODERATION_HEADERS);

const JOB_INPUT_HEADER_ALIASES = {
  company_name: ['company_name'],
  contact_name: ['contact_name'],
  contact_email: ['contact_email'],
  company_url: ['company_url'],
  position_title: ['position_title', 'job_title', 'title'],
  city: ['city', 'location'],
  employment_type: ['employment_type'],
  salary: ['salary', 'salary_range', 'salary_label'],
  visa_support: ['visa_support'],
  start_date: ['start_date'],
  publish_date: ['publish_date'],
  apply_method: ['apply_method'],
  summary: ['summary', 'short_description'],
  job_details: ['job_details', 'full_description', 'description'],
  requirements: ['requirements'],
  free_comment: ['free_comment'],
  logo_url: ['company_logo_url', 'logo_url'],
  job_preview: ['job_preview']
};

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

const PUBLIC_JOB_FIELDS = [
  'id', 'job_id', 'slug', 'detail_url', 'status', 'priority', 'company_name',
  'position_title', 'employment_type', 'city', 'region', 'location', 'work_style',
  'language', 'category', 'detail_category', 'tags', 'skills', 'salary_min_eur',
  'salary_max_eur', 'salary_currency', 'salary_unit', 'salary_label', 'salary', 'summary', 'short_description',
  'job_details', 'full_description', 'description', 'requirements', 'benefits',
  'apply_url', 'application_url', 'apply_method', 'company_url', 'source_url',
  'source_name', 'visa_support',
  'company_logo_url', 'logo_url', 'image_alt', 'start_date', 'publish_date',
  'published_at', 'updated_at', 'created_at', 'last_modified_at', 'expires_at'
];

const PUBLIC_DIRECTORY_FIELDS = [
  'id', 'item_id', 'place_id', 'placeId', 'placeid', 'slug', 'status',
  'name', 'title', 'name_ja', 'name_en', 'category', 'category1', 'category2',
  'category3', 'categoryName', 'categoryname', 'detail_category', 'subcategory',
  'city', 'region', 'area', 'state', 'address', 'completeAddress',
  'completeaddress', 'street', 'postcode', 'postalCode', 'postalcode',
  'countryCode', 'countrycode', 'short_description', 'description_ja',
  'description', 'detail_comment', 'long_description', 'comment',
  'description_en', 'tags', 'keywords', 'price', 'price_range', 'rating',
  'totalScore', 'totalscore', 'reviewsCount', 'reviewscount', 'review_count',
  'official_url', 'website', 'site_url', 'homepage', 'map_url', 'url',
  'google_map_url', 'maps_url', 'source_url', 'phone', 'telephone', 'tel',
  'opening_hours', 'openingHours', 'hours', 'language_support', 'language',
  'languages', 'latitude', 'longitude', 'lat', 'lng', 'lon', 'location_lat',
  'location_lng', 'location/lat', 'location/lng', 'updated_at',
  'last_reviewed_at', 'reviewed_at', 'priority'
];

const PUBLIC_PRIVATE_URL_PARAMETER_NAMES = [
  'token', 'secret', 'password', 'authorization', 'auth', 'api_key', 'apikey',
  'access_token', 'refresh_token', 'manage_token', 'authorization_code', 'auth_code',
  'oauth_code', 'credential', 'credentials', 'signature', 'sig', 'key',
  'email', 'contact_email', 'reviewer_email'
];
const PUBLIC_PRIVATE_IDENTIFIER_PATTERN = /(?:^|[._'&-])(?:manage|admin|internal|token|secret|password|email|spreadsheet|moderation)(?:[._'&-]|$)/i;
const PUBLIC_EMAIL_ADDRESS_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PUBLIC_SAFE_ID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._'&-]{0,159}$/u;
const PUBLIC_SAFE_SLUG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._'&-]{0,239}$/u;

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
    .createMenu('J-Connect管理')
    .addItem('選択した投稿を承認・公開', 'approveSelectedSubmission')
    .addItem('選択した投稿を却下', 'rejectSelectedSubmission')
    .addItem('公開確認を再試行', 'retrySelectedPublication')
    .addToUi();
}

function dispatchCommunityRequest_(e) {
  try {
    const params = requestParams_(e);
    const action = String(params.action || 'listPosts');
    const sheetKey = String(params.sheet || '').trim().toLowerCase();
    let payload;

    if (Object.prototype.hasOwnProperty.call(DIRECTORY_SHEET_NAMES, sheetKey)) payload = listDirectory_(sheetKey);
    else if (action === 'getJobs' || action === 'listJobs'
      || (action === 'listPosts' && sheetKey === 'jobs')) payload = listJobs_(params);
    else if (action === 'getPosts' || action === 'listPosts') payload = listPosts_(params);
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
  const versionedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.assign({}, payload, { api_version: PUBLIC_DATA_API_VERSION })
    : { ok: true, api_version: PUBLIC_DATA_API_VERSION, items: payload || [] };
  return ContentService
    .createTextOutput(JSON.stringify(versionedPayload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = String(properties.getProperty('MASTER_SPREADSHEET_ID') || '').trim()
    || String(properties.getProperty('COMMUNITY_SPREADSHEET_ID') || '').trim();
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetContext_() {
  const sheet = getSpreadsheet_().getSheetByName(COMMUNITY_SHEET_NAME);
  if (!sheet) throw new Error('Community Posts sheet not found.');
  return getSheetContextForSheet_(sheet, 'community');
}

function getJobsSheetContext_() {
  const sheet = getSpreadsheet_().getSheetByName(JOBS_SHEET_NAME);
  if (!sheet) throw new Error('JOBS_SHEET_NOT_FOUND');
  return getSheetContextForSheet_(sheet, 'job');
}

function getDirectorySheetContext_(sheetKey) {
  const expected = String(DIRECTORY_SHEET_NAMES[sheetKey] || '').trim().toLowerCase();
  if (!expected) throw new Error('DIRECTORY_SHEET_NOT_SUPPORTED');
  const sheet = getSpreadsheet_().getSheets().find((candidate) => String(candidate.getName() || '').trim().toLowerCase() === expected);
  if (!sheet) throw new Error('DIRECTORY_SHEET_NOT_FOUND');
  return getSheetContextForSheet_(sheet, 'directory');
}

function getSheetContextForSheet_(sheet, type) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('SHEET_HAS_NO_HEADER');
  const headerRowIndex = findSheetHeaderRowIndex_(values, type);
  if (headerRowIndex === -1) throw new Error('SHEET_HEADER_NOT_FOUND');
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

function findSheetHeaderRowIndex_(values, type) {
  const scanRows = Math.min(values.length, 5);
  for (let rowIndex = 0; rowIndex < scanRows; rowIndex += 1) {
    const headers = values[rowIndex].map((value) => String(value || '').trim());
    const headerSet = {};
    headers.forEach((header) => {
      if (header) headerSet[header] = true;
    });
    if (type === 'community' && REQUIRED_COMMUNITY_HEADERS.every((header) => headerSet[header])) return rowIndex;
    if (type === 'job') {
      const hasId = headerSet.job_id || headerSet.id;
      const hasTitle = headerSet.position_title || headerSet.job_title || headerSet.title;
      if ((hasId || headerSet.company_name) && hasTitle) return rowIndex;
    }
    if (type === 'directory' && (headerSet.name || headerSet.title || headerSet.name_ja)
      && (headerSet.status || headerSet.category || headerSet.category1)) return rowIndex;
  }
  return -1;
}

function findCommunityHeaderRowIndex_(values) {
  return findSheetHeaderRowIndex_(values, 'community');
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

function isTrueLifecycleFlag_(value) {
  if (value === true) return true;
  return ['true', 'yes', '1'].indexOf(String(value || '').trim().toLowerCase()) !== -1;
}

function isPubliclyVisible_(post) {
  const status = String(cleanCell_(post.status || '')).trim().toLowerCase();
  const moderationStatus = String(cleanCell_(post.moderation_status || '')).trim().toLowerCase();
  const blockedModerationStatuses = ['hidden', 'deleted', 'inactive', 'pending', 'rejected', 'draft', 'expired', 'spam', 'closed'];
  const lifecycleFlags = ['deleted', 'is_deleted', 'archive', 'archived', 'is_archived', 'hidden', 'is_hidden'];

  if (status !== 'active') return false;
  if (blockedModerationStatuses.indexOf(moderationStatus) !== -1) return false;
  if (lifecycleFlags.some((field) => isTrueLifecycleFlag_(post[field]))) return false;
  if (String(cleanCell_(post.deleted_at || '')).trim()) return false;
  if (String(cleanCell_(post.hidden_at || '')).trim()) return false;
  return !isExpired_(post);
}

function publicPostPayload_(post) {
  const status = normalizeStatus_(post.status);
  const payload = {};
  PUBLIC_POST_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(post, field)) payload[field] = cleanCell_(post[field]);
  });
  const postId = safePublicId_(post.post_id || post.id || payload.id, `community-row-${post._rowNumber || 'unknown'}`);
  payload.id = postId;
  payload.post_id = postId;
  ['image_url_1', 'image_url_2', 'image_url_3'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) payload[field] = safePublicUrl_(payload[field], true);
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'images')) payload.images = safePublicImages_(payload.images);
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

function normalizePublicUrlParameterName_(value) {
  const text = String(value || '');
  const normalized = typeof text.normalize === 'function' ? text.normalize('NFKC') : text;
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isPrivatePublicUrlParameter_(value) {
  const name = normalizePublicUrlParameterName_(value);
  return PUBLIC_PRIVATE_URL_PARAMETER_NAMES.indexOf(name) !== -1
    || /(?:^|_)(?:token|secret|password|credential|signature)(?:_|$)/.test(name);
}

function repeatedlyDecodePublicUrl_(value) {
  let decoded = String(value || '').trim();
  try {
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch (error) {
    return '';
  }
  return typeof decoded.normalize === 'function' ? decoded.normalize('NFKC') : decoded;
}

function parsePublicIpv4Part_(value) {
  const text = String(value || '').toLowerCase();
  if (/^0x[0-9a-f]+$/.test(text)) return parseInt(text.slice(2), 16);
  if (/^0[0-7]+$/.test(text) && text.length > 1) return parseInt(text, 8);
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  return NaN;
}

function canonicalPublicIpv4_(hostname) {
  const parts = String(hostname || '').split('.');
  if (!parts.length || parts.length > 4) return '';
  const numbers = parts.map(parsePublicIpv4Part_);
  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) return '';
  let value;
  if (numbers.length === 1 && numbers[0] <= 0xffffffff) {
    value = numbers[0];
  } else if (numbers.length === 2 && numbers[0] <= 0xff && numbers[1] <= 0xffffff) {
    value = numbers[0] * 0x1000000 + numbers[1];
  } else if (numbers.length === 3 && numbers[0] <= 0xff && numbers[1] <= 0xff && numbers[2] <= 0xffff) {
    value = numbers[0] * 0x1000000 + numbers[1] * 0x10000 + numbers[2];
  } else if (numbers.length === 4 && numbers.every((part) => part <= 0xff)) {
    value = numbers[0] * 0x1000000 + numbers[1] * 0x10000 + numbers[2] * 0x100 + numbers[3];
  } else {
    return '';
  }
  return [
    Math.floor(value / 0x1000000) % 0x100,
    Math.floor(value / 0x10000) % 0x100,
    Math.floor(value / 0x100) % 0x100,
    value % 0x100
  ].join('.');
}

function isPrivatePublicUrlHost_(authority) {
  let host = String(authority || '').trim().toLowerCase();
  if (host.charAt(0) === '[') {
    // Apps Script does not reliably expose WHATWG URL canonicalization here;
    // fail closed rather than misclassifying an equivalent private IPv6 form.
    return true;
  } else {
    host = host.replace(/:\d+$/, '');
  }
  host = host.replace(/\.$/, '');
  if (!host || host === 'localhost' || /\.(?:localhost|local|internal)$/.test(host)) return true;
  const canonicalIpv4 = canonicalPublicIpv4_(host);
  if (canonicalIpv4) {
    const octets = canonicalIpv4.split('.').map(Number);
    const first = octets[0];
    const second = octets[1];
    return first === 0 || first === 10 || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 198 && (second === 18 || second === 19))
      || first >= 224;
  }
  if (host === '::' || host === '::1' || /^(?:fc|fd|ff)/.test(host) || /^fe[89a-f]/.test(host)) return true;
  const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivatePublicUrlHost_(mapped[1]);
  const mappedHex = host.match(/::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivatePublicUrlHost_(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  return false;
}

function safePublicUrl_(value, allowRelative) {
  const text = String(cleanCell_(value) || '').trim();
  if (!text || /[\u0000-\u001F\u007F\s]/.test(text)) return '';
  const isRelative = /^\/(?!\/)/.test(text);
  if ((!isRelative || !allowRelative) && !/^https?:\/\/[^/?#]+/i.test(text)) return '';
  if (!isRelative && !/^https?:\/\//i.test(text)) return '';

  const decoded = repeatedlyDecodePublicUrl_(text);
  if (!decoded) return '';
  const normalizedDecoded = decoded.replace(/\\/g, '/');
  if (/^https?:\/\/[^/?#]*@/i.test(normalizedDecoded)) return '';
  if (PUBLIC_EMAIL_ADDRESS_PATTERN.test(normalizedDecoded)) return '';
  const everyAuthority = /(?:https?:)?\/\/([^/?#&]+)/gi;
  let authorityMatch;
  while ((authorityMatch = everyAuthority.exec(normalizedDecoded)) !== null) {
    if (authorityMatch[1].indexOf('@') !== -1 || isPrivatePublicUrlHost_(authorityMatch[1])) return '';
  }
  const authority = normalizedDecoded.match(/^https?:\/\/([^/?#]+)/i);
  if (!isRelative && (!authority || isPrivatePublicUrlHost_(authority[1]))) return '';
  const pathPart = normalizedDecoded
    .replace(/^https?:\/\/[^/?#]*/i, '')
    .split(/[?#]/, 1)[0];
  if (/\/(?:manage|admin|internal)(?:[/?#]|$)/i.test(pathPart)) return '';
  if (/\/(?:manage|admin|internal)(?:[/?#]|$)/i.test(normalizedDecoded)) return '';

  const parameterPattern = /(?:^|[?&#;/])([^=?&#;/]+)=/g;
  let match;
  while ((match = parameterPattern.exec(normalizedDecoded)) !== null) {
    if (isPrivatePublicUrlParameter_(match[1])) return '';
  }
  return text;
}

function safePublicApplicationMethod_(value) {
  const text = String(cleanCell_(value) || '').trim();
  if (!text || PUBLIC_EMAIL_ADDRESS_PATTERN.test(text)) return '';
  const decoded = repeatedlyDecodePublicUrl_(text);
  const normalizedDecoded = decoded.replace(/\\/g, '/');
  if (!decoded || PUBLIC_EMAIL_ADDRESS_PATTERN.test(normalizedDecoded)
      || /\/(?:manage|admin|internal)(?:[/?#]|$)/i.test(normalizedDecoded)) return '';
  const authorityPattern = /(?:https?:)?\/\/([^/?#&]+)/gi;
  let authorityMatch;
  while ((authorityMatch = authorityPattern.exec(normalizedDecoded)) !== null) {
    if (authorityMatch[1].indexOf('@') !== -1 || isPrivatePublicUrlHost_(authorityMatch[1])) return '';
  }
  const parameterPattern = /(?:^|[?&#;/])([^=?&#;/]+)=/g;
  let parameterMatch;
  while ((parameterMatch = parameterPattern.exec(normalizedDecoded)) !== null) {
    if (isPrivatePublicUrlParameter_(parameterMatch[1])) return '';
  }
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  if (urls.some((url) => !safePublicUrl_(url, false))) return '';
  return text;
}

function safePublicImages_(value) {
  const values = Array.isArray(value)
    ? value
    : String(cleanCell_(value) || '').split(/[\n,;]/);
  const safe = values.map((item) => safePublicUrl_(item, true)).filter(Boolean);
  return Array.isArray(value) ? safe : safe.join(', ');
}

function isSafePublicId_(value) {
  const raw = String(cleanCell_(value) || '').trim();
  const candidate = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
  return PUBLIC_SAFE_ID_PATTERN.test(candidate) && !PUBLIC_PRIVATE_IDENTIFIER_PATTERN.test(candidate);
}

function isSafePublicSlug_(value) {
  const raw = String(cleanCell_(value) || '').trim();
  const candidate = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
  return PUBLIC_SAFE_SLUG_PATTERN.test(candidate) && !PUBLIC_PRIVATE_IDENTIFIER_PATTERN.test(candidate);
}

function safePublicId_(value, fallback) {
  const raw = String(cleanCell_(value) || '').trim();
  const candidate = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
  if (isSafePublicId_(candidate)) return candidate;
  if (!isSafePublicId_(fallback)) throw new Error('Unable to derive a safe public identifier.');
  return String(fallback);
}

function listPosts_(params) {
  const cache = CacheService.getScriptCache();
  const cacheKey = COMMUNITY_CACHE_KEY;
  if (String(params.bypassCache || '').toLowerCase() !== 'true') {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const context = getSheetContext_();
  const sourceRows = context.values.slice(context.dataStartIndex)
    .map((row, index) => rowToObject_(context.headers, row, context.dataStartIndex + index + 1));
  const explicitlyActive = sourceRows.filter((post) => String(cleanCell_(post.status || '')).trim().toLowerCase() === 'active').length;
  const posts = sourceRows
    .filter((post) => isPubliclyVisible_(post, params))
    .map(publicPostPayload_)
    .sort(compareCommunityPublicationDates_);
  const payload = {
    ok: true,
    items: posts,
    posts,
    count: posts.length,
    validation_report: {
      source_count: sourceRows.length,
      active_count: explicitlyActive,
      excluded_by_reason: { lifecycle_or_status: sourceRows.length - posts.length }
    }
  };
  cache.put(cacheKey, JSON.stringify(payload), COMMUNITY_CACHE_SECONDS);
  return payload;
}

function compareCommunityPublicationDates_(a, b) {
  return dateTime_(b.published_at || b.created_at) - dateTime_(a.published_at || a.created_at);
}

function getPost_(params) {
  const found = findPostById_(params.id || params.post_id || params.post);
  if (!found || !isPubliclyVisible_(found.post)) {
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

  const saveLock = LockService.getScriptLock();
  saveLock.waitLock(10000);
  try {
    context.sheet.appendRow(row);
  } finally {
    if (saveLock.hasLock()) saveLock.releaseLock();
  }
  invalidateCommunityCache_();

  try {
    sendCommunitySubmissionAdminEmail_(context, rowToObject_(context.headers, row, context.sheet.getLastRow()));
  } catch (error) {
    // The row is already durable. Administrator notification must never turn a
    // successful post submission into a client-visible failure or expose config.
    console.warn(`Community administrator notification failed: ${safeEmailErrorCode_(error)}`);
  }

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

function listJobs_() {
  const context = getJobsSheetContext_();
  const sourceRows = context.values.slice(context.dataStartIndex)
    .map((row, index) => rowToObject_(context.headers, row, context.dataStartIndex + index + 1));
  const items = sourceRows
    .filter(isPublicJob_)
    .map(publicJobPayload_)
    .sort(comparePublicPosts_);
  return {
    ok: true,
    items,
    jobs: items,
    count: items.length,
    validation_report: {
      source_count: sourceRows.length,
      active_count: items.length,
      excluded_by_reason: { status_not_active: sourceRows.length - items.length }
    }
  };
}

function isPublicJob_(job) {
  return String(cleanCell_(job.status || '')).trim().toLowerCase() === 'active' && !isExpired_(job);
}

function publicJobPayload_(job) {
  const payload = {};
  PUBLIC_JOB_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(job, field)) payload[field] = cleanCell_(job[field]);
  });
  const jobId = safePublicId_(job.job_id || job.id || '', `job-row-${job._rowNumber || 'unknown'}`);
  payload.id = jobId;
  payload.job_id = jobId;
  if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
    payload.slug = isSafePublicSlug_(payload.slug) ? String(payload.slug).trim() : jobId;
  }
  ['apply_url', 'application_url', 'company_url', 'source_url'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) payload[field] = safePublicUrl_(payload[field], false);
  });
  ['detail_url', 'company_logo_url', 'logo_url'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) payload[field] = safePublicUrl_(payload[field], true);
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'apply_method')) {
    payload.apply_method = safePublicApplicationMethod_(payload.apply_method);
  }
  payload.status = 'active';
  return payload;
}

function listDirectory_(sheetKey) {
  const context = getDirectorySheetContext_(sheetKey);
  const sourceRows = context.values.slice(context.dataStartIndex)
    .map((row, index) => rowToObject_(context.headers, row, context.dataStartIndex + index + 1));
  const activeRows = sourceRows.filter((row) => String(cleanCell_(row.status || '')).trim().toLowerCase() === 'active');
  const items = activeRows.map((row) => publicDirectoryPayload_(row, sheetKey));
  return {
    ok: true,
    items,
    count: items.length,
    validation_report: {
      source_count: sourceRows.length,
      active_count: activeRows.length,
      excluded_by_reason: { status_not_active: sourceRows.length - activeRows.length }
    }
  };
}

function publicDirectoryPayload_(row, sheetKey) {
  const payload = {};
  PUBLIC_DIRECTORY_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(row, field)) payload[field] = cleanCell_(row[field]);
  });
  const idCandidate = String(cleanCell_(row.id || row.item_id || row.place_id || row.placeId || row.placeid || row.slug || '')).trim();
  const placeholder = !idCandidate || ['-', 'test', 'placeholder', 'dummy'].indexOf(idCandidate.toLowerCase()) !== -1;
  const safeId = safePublicId_(placeholder ? '' : idCandidate, `${sheetKey}-row-${row._rowNumber || 'unknown'}`);
  payload.id = safeId;
  ['item_id', 'place_id', 'placeId', 'placeid'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = isSafePublicId_(payload[field]) ? String(payload[field]).trim() : safeId;
    }
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
    payload.slug = isSafePublicSlug_(payload.slug) ? String(payload.slug).trim() : safeId;
  }
  [
    'official_url', 'website', 'site_url', 'homepage', 'map_url', 'url',
    'google_map_url', 'maps_url', 'source_url'
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) payload[field] = safePublicUrl_(payload[field], false);
  });
  ['rating', 'totalScore', 'totalscore'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) payload[field] = normalizePublicDirectoryRating_(payload[field]);
  });
  payload.status = 'active';
  return payload;
}

function normalizePublicDirectoryRating_(value) {
  const normalized = String(cleanCell_(value)).replace(/[^0-9.-]/g, '');
  const numeric = Number(normalized);
  return isFinite(numeric) && numeric > 0 ? numeric : '';
}

function sendCommunitySubmissionAdminEmail_(context, post) {
  const config = validateJConnectEmailConfiguration_();
  const title = String(cleanCell_(post.title || '')).trim() || '無題の投稿';
  const spreadsheetUrl = `${context.sheet.getParent().getUrl()}#gid=${context.sheet.getSheetId()}`;
  const values = {
    post_id: post.post_id || post.id,
    title,
    category1: post.category1,
    category2: post.category2,
    country: post.country,
    region: post.region,
    city: post.city,
    nickname: post.nickname,
    price: post.price,
    availability_date: post.availability_date,
    body: post.body,
    contact_email_private: post.contact_email_private,
    image_url_1: post.image_url_1,
    image_url_2: post.image_url_2,
    image_url_3: post.image_url_3,
    status: 'pending',
    created_at: post.created_at,
    spreadsheet_url: spreadsheetUrl
  };
  const labels = {
    post_id: 'post_id', title: '投稿タイトル', category1: 'category1', category2: 'category2',
    country: '国', region: '地域', city: '市区町村', nickname: 'ニックネーム', price: '価格',
    availability_date: '日付', body: '本文', contact_email_private: '投稿者の非公開メールアドレス',
    image_url_1: '画像URL 1', image_url_2: '画像URL 2', image_url_3: '画像URL 3', status: 'status',
    created_at: '投稿日時', spreadsheet_url: 'Spreadsheetで確認・承認'
  };
  sendZohoEmail_({
    to: config.adminEmail,
    subject: `【J-Connect管理】Community新規投稿: ${title}`,
    html: emailDefinitionListWithLabels_('Community新規投稿（Spreadsheetで確認・承認してください）', values, labels)
  });
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
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    writeExistingFields_(verified.context, verified.rowNumber, updates);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
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
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    writeExistingFields_(verified.context, verified.rowNumber, updates);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
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

function ensureHeaders_(context, requiredHeaders) {
  const seen = {};
  const missing = requiredHeaders.filter((header) => {
    if (seen[header] || Object.prototype.hasOwnProperty.call(context.indexes, header)) return false;
    seen[header] = true;
    return true;
  });
  if (missing.length) {
    context.sheet.getRange(context.headerRowNumber, context.headers.length + 1, 1, missing.length).setValues([missing]);
  }
  return missing.length ? getSheetContextForSheet_(context.sheet, context.sheet.getName() === JOBS_SHEET_NAME ? 'job' : 'community') : context;
}

function firstExistingHeader_(context, aliases) {
  return (aliases || []).find((header) => Object.prototype.hasOwnProperty.call(context.indexes, header)) || '';
}

function installCommunityApprovalColumns() {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const context = getSheetContext_();
    const missing = COMMUNITY_APPROVAL_HEADERS.filter((header) => !Object.prototype.hasOwnProperty.call(context.indexes, header));
    ensureHeaders_(context, COMMUNITY_APPROVAL_HEADERS);
    SpreadsheetApp.getUi().alert(missing.length ? `審査管理用の列を追加しました: ${missing.join(', ')}` : '審査管理用の列はすでに設定されています。');
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
  return approveSelectedSubmission();
}

function retrySelectedCommunityPublication() {
  return retrySelectedPublication();
}

function approveSelectedSubmission() {
  return queueSelectedApproval_(false);
}

function retrySelectedPublication() {
  return queueSelectedApproval_(true);
}

function rejectSelectedSubmission() {
  const ui = SpreadsheetApp.getUi();
  let selected;
  try {
    selected = getSelectedModerationContext_();
  } catch (error) {
    ui.alert(moderationUiErrorMessage_(error));
    return { ok: false, error: safeModerationErrorCode_(error) };
  }
  const prompt = ui.prompt('掲載却下', '却下理由を入力してください。', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return { ok: false, cancelled: true };
  const reason = String(prompt.getResponseText() || '').trim();
  if (!reason) {
    ui.alert('却下理由を入力してください。');
    return { ok: false, error: 'REJECTION_REASON_REQUIRED' };
  }
  if (ui.alert('最終確認', 'この投稿を却下し、申請者へ理由を通知しますか？', ui.ButtonSet.YES_NO) !== ui.Button.YES) {
    return { ok: false, cancelled: true };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    selected = refreshSelectedModerationContext_(selected);
    selected.context = ensureHeaders_(selected.context, MODERATION_HEADERS);
    selected = refreshSelectedModerationContext_(selected);
    if (normalizeStatus_(selected.item.status) === 'rejected') {
      ui.alert('この投稿はすでに却下済みです。');
      return { ok: true, status: 'rejected' };
    }
    const now = nowIso_();
    const recipient = moderationRecipient_(selected);
    writeExistingFields_(selected.context, selected.rowNumber, {
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: now,
      updated_at: now,
      last_modified_at: now,
      last_modified_action: 'rejected',
      approval_notified_status: 'rejected',
      approval_notified_error: ''
    });
    invalidateCommunityCache_();
    const dispatch = requestCommunityPublicDataSync_();
    if (!dispatch.dispatched && dispatch.error) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: dispatch.error });
    }
    try {
      if (!isJConnectValidEmail_(recipient)) throw new Error('INVALID_RECIPIENT');
      sendRejectionEmail_(selected, recipient, reason);
      ui.alert('投稿を却下し、申請者へ審査結果を送信しました。');
    } catch (error) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: safeApprovalErrorCode_(error) });
      ui.alert('投稿は却下しましたが、申請者への通知に失敗しました。メールアドレスまたはメール設定を確認してください。');
    }
    return { ok: true, status: 'rejected' };
  } catch (error) {
    ui.alert(moderationUiErrorMessage_(error));
    return { ok: false, error: safeModerationErrorCode_(error) };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function queueSelectedApproval_(isRetry) {
  const ui = SpreadsheetApp.getUi();
  let selected;
  try {
    selected = getSelectedModerationContext_();
  } catch (error) {
    ui.alert(moderationUiErrorMessage_(error));
    return { ok: false, error: safeModerationErrorCode_(error) };
  }
  if (!isRetry && ui.alert('承認・公開', 'この投稿を承認して公開しますか？', ui.ButtonSet.YES_NO) !== ui.Button.YES) {
    return { ok: false, cancelled: true };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    selected = refreshSelectedModerationContext_(selected);
    selected.context = ensureHeaders_(selected.context, MODERATION_HEADERS);
    selected = refreshSelectedModerationContext_(selected);
    const currentStatus = String(selected.item.approval_notified_status || '').trim().toLowerCase();
    if (currentStatus === 'sent') {
      ui.alert('すでに公開通知済みです。');
      return { ok: true, status: 'sent' };
    }
    if (isRetry && normalizeStatus_(selected.item.status) !== 'active') {
      ui.alert('この投稿はまだ承認されていません。先に承認・公開してください。');
      return { ok: false, status: normalizeStatus_(selected.item.status) };
    }
    if (currentStatus === 'waiting_publish' && !isRetry) {
      ui.alert('この投稿はすでに公開確認待ちです。公開確認後に申請者へメールを送信します。');
      return { ok: true, status: 'waiting_publish' };
    }

    const recipient = moderationRecipient_(selected);
    const now = nowIso_();
    const submissionId = moderationId_(selected);
    const updates = {
      status: 'active',
      published_at: selected.item.published_at || now,
      updated_at: now,
      last_modified_at: now,
      last_modified_action: isRetry ? (selected.item.last_modified_action || 'approved') : 'approved',
      approval_notified_status: 'waiting_publish',
      approval_notified_at: '',
      approval_notified_to: recipient,
      approval_notified_error: '',
      approval_notified_queued_at: now,
      approval_sync_requested_at: ''
    };
    writeExistingFields_(selected.context, selected.rowNumber, updates);
    invalidateCommunityCache_();

    const dispatch = requestCommunityPublicDataSync_();
    if (dispatch.dispatched) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_sync_requested_at: now });
    } else if (dispatch.error) {
      writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: dispatch.error });
    }
    if (!isJConnectValidEmail_(recipient)) {
      writeExistingFields_(selected.context, selected.rowNumber, {
        approval_notified_status: 'publish_error',
        approval_notified_error: 'INVALID_RECIPIENT'
      });
      ui.alert('投稿は公開状態にしましたが、通知先メールを確認できません。');
      return { ok: false, status: 'publish_error' };
    }
    ui.alert('公開同期を開始しました。公開確認後に申請者へメールを送信します。');
    return { ok: true, status: 'waiting_publish', id: submissionId };
  } catch (error) {
    ui.alert(moderationUiErrorMessage_(error));
    return { ok: false, error: safeModerationErrorCode_(error) };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getSelectedModerationContext_() {
  const sheet = getSpreadsheet_().getActiveSheet();
  const type = detectSubmissionTypeFromSheet_(sheet);
  if (!type) throw new Error('SELECT_SUPPORTED_SHEET');
  const context = getSheetContextForSheet_(sheet, type);
  const activeRange = sheet.getActiveRange();
  if (!activeRange) throw new Error('SELECT_SUBMISSION_ROW');
  const rowNumber = activeRange.getRow();
  if (rowNumber <= context.headerRowNumber || rowNumber > context.values.length) {
    throw new Error('SELECT_SUBMISSION_ROW');
  }
  const item = rowToObject_(context.headers, context.values[rowNumber - 1], rowNumber);
  const id = type === 'community' ? item.post_id || item.id : item.job_id || item.id;
  if (!String(id || '').trim()) throw new Error('SELECT_SUBMISSION_ROW');
  return { type, context, item, rowNumber };
}

function detectSubmissionTypeFromSheet_(sheet) {
  const name = sheet && sheet.getName();
  if (name === COMMUNITY_SHEET_NAME) return 'community';
  if (name === JOBS_SHEET_NAME) return 'job';
  return '';
}

function refreshSelectedModerationContext_(selected) {
  const context = getSheetContextForSheet_(selected.context.sheet, selected.type);
  if (selected.rowNumber <= context.headerRowNumber || selected.rowNumber > context.values.length) throw new Error('SELECT_SUBMISSION_ROW');
  const item = rowToObject_(context.headers, context.values[selected.rowNumber - 1], selected.rowNumber);
  const refreshed = { type: selected.type, context, item, rowNumber: selected.rowNumber };
  if (!moderationId_(refreshed)) throw new Error('SELECT_SUBMISSION_ROW');
  return refreshed;
}

function moderationId_(selected) {
  return String(selected.type === 'community'
    ? selected.item.post_id || selected.item.id || ''
    : selected.item.job_id || selected.item.id || '').trim();
}

function moderationRecipient_(selected) {
  return String(selected.type === 'community'
    ? selected.item.contact_email_private || ''
    : selected.item.contact_email || '').trim();
}

function requestCommunityPublicDataSync_() {
  const token = String(PropertiesService.getScriptProperties().getProperty('GITHUB_ACTIONS_TOKEN') || '').trim();
  if (!token) {
    console.info('Immediate public-data dispatch unavailable; relying on the scheduled five-minute workflow.');
    return { dispatched: false, error: 'SCHEDULED_SYNC_FALLBACK' };
  }
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
  return processWaitingApprovalNotifications();
}

function processWaitingApprovalNotifications() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    let processed = 0;
    const spreadsheet = getSpreadsheet_();
    const targets = [
      { type: 'community', sheet: spreadsheet.getSheetByName(COMMUNITY_SHEET_NAME) },
      { type: 'job', sheet: spreadsheet.getSheetByName(JOBS_SHEET_NAME) }
    ];
    for (let targetIndex = 0; targetIndex < targets.length && processed < COMMUNITY_APPROVAL_MAX_ROWS_PER_RUN; targetIndex += 1) {
      const target = targets[targetIndex];
      if (!target.sheet) continue;
      let context = getSheetContextForSheet_(target.sheet, target.type);
      context = ensureHeaders_(context, MODERATION_HEADERS);
      for (let index = context.dataStartIndex; index < context.values.length && processed < COMMUNITY_APPROVAL_MAX_ROWS_PER_RUN; index += 1) {
        const item = rowToObject_(context.headers, context.values[index], index + 1);
        if (String(item.approval_notified_status || '').trim().toLowerCase() !== 'waiting_publish') continue;
        processWaitingApprovalNotification_({ type: target.type, context, item, rowNumber: index + 1 });
        processed += 1;
      }
    }
    return { ok: true, processed };
  } catch (error) {
    console.warn(`Approval notification processor failed: ${safeApprovalErrorCode_(error)}`);
    return { ok: false, error: safeApprovalErrorCode_(error) };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function processWaitingApprovalNotification_(selected) {
  const submissionId = moderationId_(selected);
  if (!submissionId || normalizeStatus_(selected.item.status) !== 'active') {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: 'INVALID_APPROVAL_POST' });
    return;
  }
  const queuedAt = dateTime_(selected.item.approval_notified_queued_at || selected.item.published_at || selected.item.updated_at);
  if (queuedAt && Date.now() - queuedAt > COMMUNITY_APPROVAL_TIMEOUT_MS) {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_status: 'publish_timeout', approval_notified_error: 'PUBLICATION_TIMEOUT' });
    return;
  }

  let published;
  try {
    published = isSubmissionInDeployedJson_(selected.type, submissionId);
  } catch (error) {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: safeApprovalErrorCode_(error) });
    return;
  }
  if (!published) {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_error: 'PUBLICATION_NOT_FOUND' });
    return;
  }

  const recipient = String(selected.item.approval_notified_to || moderationRecipient_(selected)).trim();
  if (!isJConnectValidEmail_(recipient)) {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: 'INVALID_RECIPIENT' });
    return;
  }
  try {
    sendApprovalEmail_(selected, recipient);
    writeExistingFields_(selected.context, selected.rowNumber, {
      approval_notified_status: 'sent',
      approval_notified_at: nowIso_(),
      approval_notified_to: recipient,
      approval_notified_error: ''
    });
  } catch (error) {
    writeExistingFields_(selected.context, selected.rowNumber, { approval_notified_status: 'publish_error', approval_notified_error: safeApprovalErrorCode_(error) });
  }
}

function isSubmissionInDeployedJson_(type, submissionId) {
  const jsonUrl = type === 'community' ? COMMUNITY_PUBLIC_POSTS_JSON_URL : JOBS_PUBLIC_JSON_URL;
  const response = UrlFetchApp.fetch(`${jsonUrl}?v=${Date.now()}`, { muteHttpExceptions: true });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('PUBLIC_JSON_FETCH_FAILED');
  let payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error('PUBLIC_JSON_INVALID');
  }
  const items = Array.isArray(payload) ? payload : (payload.items || payload.posts || payload.data || []);
  return Array.isArray(items) && items.some((item) => {
    const id = String(item && (type === 'community' ? item.post_id || item.id : item.job_id || item.id) || '').trim();
    const status = normalizeStatus_(item && item.status);
    return id === submissionId && status === 'active';
  });
}

function sendApprovalEmail_(selected, recipient) {
  const submissionId = moderationId_(selected);
  const isCommunity = selected.type === 'community';
  const title = String(cleanCell_(isCommunity ? selected.item.title : selected.item.position_title || selected.item.job_title || selected.item.title || '')).trim()
    || (isCommunity ? 'J-Connect Global 掲示板投稿' : 'J-Connect Global 求人');
  const publicPath = isCommunity ? COMMUNITY_PUBLIC_POST_PATH : JOB_PUBLIC_PATH;
  const publicUrl = `${COMMUNITY_SITE_ORIGIN}${publicPath}?id=${encodeURIComponent(submissionId)}`;
  sendZohoEmail_({
    to: recipient,
    name: 'J-Connect Global',
    subject: isCommunity
      ? `【J-Connect Global】投稿を公開しました: ${title}`
      : `【J-Connect Global】求人を公開しました: ${title}`,
    html: `<p>${isCommunity ? '投稿' : '求人'}を公開しました。</p><p><strong>${isCommunity ? '投稿' : '求人'}タイトル:</strong><br>${escapeHtmlForEmail_(title)}</p><p><strong>公開URL:</strong><br><a href="${escapeHtmlForEmail_(publicUrl)}">${escapeHtmlForEmail_(publicUrl)}</a></p>`
  });
}

function sendRejectionEmail_(selected, recipient, reason) {
  const isCommunity = selected.type === 'community';
  const title = String(cleanCell_(isCommunity ? selected.item.title : selected.item.position_title || selected.item.job_title || selected.item.title || '')).trim() || '無題';
  sendZohoEmail_({
    to: recipient,
    subject: isCommunity
      ? '【J-Connect Global】投稿の掲載結果について'
      : '【J-Connect Global】求人掲載依頼の審査結果について',
    html: `<p>${isCommunity ? '投稿' : '求人'}「${escapeHtmlForEmail_(title)}」について、今回は掲載を見送らせていただきました。</p><p><strong>理由:</strong><br>${escapeHtmlForEmail_(reason).replace(/\r?\n/g, '<br>')}</p><p>必要に応じて内容を修正し、再度申請いただけます。</p>`
  });
}

function moderationUiErrorMessage_(error) {
  const code = safeModerationErrorCode_(error);
  if (code === 'SELECT_SUPPORTED_SHEET') return 'Community PostsまたはJobsシートで対象行を選択してください。';
  if (code === 'SELECT_SUBMISSION_ROW') return 'ヘッダー行、空行、IDのない行は処理できません。対象のデータ行を選択してください。';
  return '処理を完了できませんでした。シートの構成と設定を確認してください。';
}

function safeModerationErrorCode_(error) {
  const code = String(error && error.message || 'MODERATION_FAILED');
  return /^(SELECT_SUPPORTED_SHEET|SELECT_SUBMISSION_ROW)$/.test(code) ? code : 'MODERATION_FAILED';
}

function safeApprovalErrorCode_(error) {
  const code = String(error && error.message || 'PUBLICATION_CHECK_FAILED');
  return /^(SCHEDULED_SYNC_FALLBACK|WORKFLOW_DISPATCH_FAILED|PUBLIC_JSON_FETCH_FAILED|PUBLIC_JSON_INVALID|PUBLICATION_NOT_FOUND|INVALID_RECIPIENT|INVALID_APPROVAL_POST|ZOHO_AUTH_FAILED|ZOHO_SEND_FAILED|SELECT_SUBMISSION_ROW)$/.test(code)
    ? code
    : 'PUBLICATION_CHECK_FAILED';
}

function sendCreateConfirmationEmail_(params, info) {
  const to = String(params.contact_email_private || '').trim();
  if (!isJConnectValidEmail_(to)) return { sent: false, error: 'INVALID_RECIPIENT' };
  try {
    const title = info.title || 'J-Connect Global 掲示板投稿';
    const safeTitle = escapeHtmlForEmail_(title);
    const safeManageUrl = escapeHtmlForEmail_(info.manageUrl);
    const safePublicPostUrl = escapeHtmlForEmail_(info.publicPostUrl);
    const htmlBody = [
      '<p>J-Connect Global 掲示板への投稿を受け付けました。</p>',
      `<p><strong>投稿タイトル:</strong><br>${safeTitle}</p>`,
      '<p>投稿は管理者が確認後に掲載されます。<br>掲載まで数時間から数日かかる場合があります。</p>',
      '<p><strong>管理用リンク:</strong><br>下記URLから、投稿内容の編集、募集停止、再募集、非公開化ができます。<br>このリンクは投稿管理専用です。第三者には共有しないでください。</p>',
      `<p><a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
      '<p><strong>公開投稿リンク:</strong><br>管理者が投稿内容を確認・承認後、下記ページで投稿内容を閲覧できるようになります。</p>',
      `<p><a href="${safePublicPostUrl}">${safePublicPostUrl}</a></p>`,
      '<p>J-Connect Global がログイン情報、銀行情報、公的ID番号を求めることはありません。</p>'
    ].join('');
    sendZohoEmail_({
      to,
      subject: `【J-Connect Global】投稿を受け付けました: ${title}`,
      name: 'J-Connect Global',
      htmlBody,
      body: `J-Connect Global 掲示板への投稿を受け付けました。\n\n投稿タイトル:\n${title}\n\n投稿は管理者が確認後に掲載されます。\n掲載まで数時間から数日かかる場合があります。\n\n管理用リンク:\n下記URLから、投稿内容の編集、募集停止、再募集、非公開化ができます。\nこのリンクは投稿管理専用です。第三者には共有しないでください。\n\n${info.manageUrl}\n\n公開投稿リンク:\n管理者が投稿内容を確認・承認後、下記ページで投稿内容を閲覧できるようになります。\n\n${info.publicPostUrl}\n\nJ-Connect Global がログイン情報、銀行情報、公的ID番号を求めることはありません。`
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
    subject: 'J-Connect Global 掲示板投稿の取り消し依頼',
    name: 'J-Connect Global',
    body: Object.keys(params).map((key) => `${key}: ${params[key]}`).join('\n')
  });
  return { ok: true };
}

function submitInquiry_(params) {
  const fields = readValidatedFields_(params, {
    post_id: { required: true, max: 200 },
    sender_name: { required: true, max: 120 },
    sender_email: { required: true, max: 254, email: true },
    subject: { max: 200 },
    message: { required: true, max: 6000 },
    website: { max: 0 },
    form_started_at: { required: true, max: 20 }
  });
  if (!fields.ok) return safeFormFailure_(fields.code);
  if (!isReasonableFormCompletion_(fields.values.form_started_at)) return safeFormFailure_('FORM_TIMING');
  if (!acquireSubmissionRateLimit_('submitInquiry', fields.values.sender_email)) return safeFormFailure_('RATE_LIMITED');

  const found = findPostById_(fields.values.post_id);
  if (!found) return { ok: false, error: 'Post not found.' };
  const status = normalizeStatus_(found.post.status);
  if (status !== 'active' || isExpired_(found.post)) {
    return { ok: false, error: 'This post is closed.' };
  }
  const to = String(found.post.contact_email_private || '').trim();
  if (!isJConnectValidEmail_(to)) {
    return { ok: false, error: 'Contact email is unavailable.' };
  }
  const senderName = fields.values.sender_name;
  const senderEmail = fields.values.sender_email;
  const subject = fields.values.subject || 'J-Connect Global 掲示板の投稿への問い合わせ';
  const message = fields.values.message;
  sendZohoEmail_({
    to,
    replyTo: senderEmail,
    name: 'J-Connect Global',
    subject: `【J-Connect Global】${subject}`,
    body: [
      'J-Connect Global 掲示板の投稿に問い合わせが届きました。',
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
      name: 'J-Connect Global',
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
      subject: '[J-Connect Global] We received your inquiry',
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

  const value = fields.values;
  const submissionKey = sha256Hex_([
    value.company_name.toLowerCase(),
    value.position_title.toLowerCase(),
    value.contact_email.toLowerCase(),
    value.form_started_at
  ].join('|'));
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let saved;
  try {
    let context = getJobsSheetContext_();
    context = ensureHeaders_(context, jobManagementHeadersForContext_(context));
    validateJobStorageHeaders_(context);
    const duplicate = findJobBySubmissionKey_(context, submissionKey);
    if (duplicate) {
      return { ok: true, success: true, duplicate: true, job_id: duplicate.jobId, id: duplicate.jobId };
    }
    if (!acquireSubmissionRateLimitWithHeldLock_('submitJobPosting', value.contact_email)) {
      return safeFormFailure_('RATE_LIMITED');
    }

    const now = nowIso_();
    const jobId = `job_${Utilities.getUuid()}`;
    const row = context.headers.map((header) => jobSubmissionValue_(header, value, { jobId, now, submissionKey }));
    context.sheet.appendRow(row);
    saved = {
      context,
      job: rowToObject_(context.headers, row, context.sheet.getLastRow()),
      jobId
    };
  } catch (error) {
    console.warn(`Job posting storage failed: ${safeJobStorageErrorCode_(error)}`);
    return safeFormFailure_('JOB_STORAGE_FAILED');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  let adminEmailSent = false;
  let applicantEmailSent = false;
  try {
    sendJobSubmissionAdminEmail_(saved.context, saved.job);
    adminEmailSent = true;
  } catch (error) {
    console.warn(`Job administrator notification failed: ${safeEmailErrorCode_(error)}`);
  }
  try {
    sendZohoEmail_({
      to: value.contact_email,
      subject: '[J-Connect Global] Job posting request received',
      html: '<p>求人掲載のご相談を受け付けました。We have received your job posting request and will contact you after review.</p>'
    });
    applicantEmailSent = true;
  } catch (error) {
    console.warn(`Job applicant confirmation failed: ${safeEmailErrorCode_(error)}`);
  }
  return {
    ok: true,
    success: true,
    job_id: saved.jobId,
    id: saved.jobId,
    status: 'pending',
    admin_email_sent: adminEmailSent,
    applicant_email_sent: applicantEmailSent
  };
}

function jobManagementHeadersForContext_(context) {
  return JOB_MANAGEMENT_HEADERS.filter((header) => header !== 'job_id' || !firstExistingHeader_(context, ['job_id', 'id']));
}

function validateJobStorageHeaders_(context) {
  const requiredFields = ['company_name', 'contact_name', 'contact_email', 'position_title', 'city', 'employment_type', 'summary', 'job_details', 'requirements'];
  const missing = requiredFields.filter((field) => !firstExistingHeader_(context, JOB_INPUT_HEADER_ALIASES[field]));
  if (missing.length) throw new Error('JOB_SHEET_SCHEMA_INVALID');
}

function findJobBySubmissionKey_(context, submissionKey) {
  if (!submissionKey || !Object.prototype.hasOwnProperty.call(context.indexes, 'submission_key')) return null;
  for (let index = context.dataStartIndex; index < context.values.length; index += 1) {
    const job = rowToObject_(context.headers, context.values[index], index + 1);
    if (String(job.submission_key || '').trim() === submissionKey) {
      return { job, jobId: String(job.job_id || job.id || '').trim(), rowNumber: index + 1 };
    }
  }
  return null;
}

function jobSubmissionValue_(header, value, generated) {
  if (header === 'id' || header === 'job_id') return generated.jobId;
  if (header === 'status') return 'pending';
  if (header === 'created_at' || header === 'updated_at' || header === 'last_modified_at') return generated.now;
  if (header === 'published_at' || header === 'rejected_at') return '';
  if (header === 'last_modified_action') return 'created';
  if (header === 'submission_key') return generated.submissionKey;
  for (const field in JOB_INPUT_HEADER_ALIASES) {
    if (JOB_INPUT_HEADER_ALIASES[field].indexOf(header) !== -1) return value[field] || '';
  }
  return '';
}

function sendJobSubmissionAdminEmail_(context, job) {
  const config = validateJConnectEmailConfiguration_();
  const companyName = String(job.company_name || '').trim();
  const title = String(job.position_title || job.job_title || job.title || '').trim();
  const values = Object.assign({}, job, {
    job_id: job.job_id || job.id,
    status: 'pending',
    spreadsheet_url: `${context.sheet.getParent().getUrl()}#gid=${context.sheet.getSheetId()}`
  });
  const keys = [
    'job_id', 'status', 'company_name', 'company_url', 'logo_url', 'company_logo_url',
    'contact_name', 'contact_email', 'position_title', 'job_title', 'city', 'employment_type',
    'salary', 'salary_range', 'visa_support', 'summary', 'job_details', 'requirements',
    'start_date', 'publish_date', 'apply_method', 'free_comment', 'job_preview', 'created_at', 'spreadsheet_url'
  ];
  sendZohoEmail_({
    to: config.adminEmail,
    subject: `【J-Connect管理】求人掲載依頼: ${companyName} / ${title}`,
    html: `${emailDefinitionList_('求人掲載依頼（status = pending）', values, keys)}<p>Spreadsheetで内容を審査し、承認・公開または却下してください。</p>`
  });
}

function safeJobStorageErrorCode_(error) {
  const code = String(error && error.message || 'JOB_STORAGE_FAILED');
  return /^(JOBS_SHEET_NOT_FOUND|SHEET_HAS_NO_HEADER|SHEET_HEADER_NOT_FOUND|JOB_SHEET_SCHEMA_INVALID)$/.test(code)
    ? code
    : 'JOB_STORAGE_FAILED';
}

function readValidatedFields_(params, rules) {
  const values = {};
  for (const name in rules) {
    const rule = rules[name];
    const value = String(params[name] || '').trim();
    if (name === 'website' && value) return { ok: false, code: 'HONEYPOT' };
    if (rule.required && !value) return { ok: false, code: 'MISSING_REQUIRED_FIELD' };
    if (value.length > rule.max) return { ok: false, code: 'FIELD_TOO_LONG' };
    if (rule.email && value && !isJConnectValidEmail_(value)) return { ok: false, code: 'INVALID_EMAIL' };
    if (rule.url && value && !/^https?:\/\/[^\s]+$/i.test(value)) return { ok: false, code: 'INVALID_URL' };
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    return acquireSubmissionRateLimitWithHeldLock_(action, email);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// The caller must already own the ScriptLock so the cache check and set remain atomic.
function acquireSubmissionRateLimitWithHeldLock_(action, email) {
  const identity = `${String(action || '')}:${String(email || '').trim().toLowerCase()}`;
  const key = `jconnect_form_rate:${sha256Hex_(identity)}`;
  const cache = CacheService.getScriptCache();
  if (cache.get(key)) return false;
  cache.put(key, '1', 300);
  return true;
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
    ZOHO_SEND_FAILED: '現在送信を受け付けられません。時間をおいて再度お試しください。',
    JOB_STORAGE_FAILED: '求人掲載依頼を保存できませんでした。時間をおいて再度お試しください。'
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

function emailDefinitionListWithLabels_(heading, values, labels) {
  const rows = Object.keys(labels).filter((key) => values && values[key] !== undefined && values[key] !== '')
    .map((key) => `<dt>${escapeHtmlForEmail_(labels[key])}</dt><dd>${escapeHtmlForEmail_(values[key]).replace(/\r?\n/g, '<br>')}</dd>`);
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
