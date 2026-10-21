/* Inline public replies and scoped, account-free private conversations. */
(function () {
  'use strict';
  const sources = window.JCONNECT_DATA_SOURCES;
  const endpoint = sources?.communityDataEndpoint;
  const id = () => crypto.randomUUID();
  const secret = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  async function api(action, values = {}) {
    if (!endpoint) throw new Error('現在この機能を利用できません。');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ action, ...values }), credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (!response.ok) throw new Error('通信に失敗しました。時間をおいて再度お試しください。');
      const data = await response.json();
      if (!data.ok) { const error = new Error(data.error || '現在この機能を利用できません。'); error.code = data.code; throw error; }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('通信を確認できませんでした。入力を変えずに再送すると重複登録を防げます。');
      throw error;
    } finally { clearTimeout(timer); }
  }
  let capabilities;
  async function available(inline = false) {
    try {
      capabilities ||= api('communityMessagingStatus').catch(error => { capabilities = null; throw error; });
      const data = await capabilities;
      if (!data.messaging_version || !data.public_replies || !data.private_conversations || (inline && (!data.inline_replies || !data.instant_publish))) throw new Error('UNAVAILABLE');
      return data;
    } catch (_) { throw new Error('返信機能を現在利用できません。時間をおいて再度お試しください。'); }
  }
  function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
  const berlinDate = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : berlinDate.format(date) + '（ベルリン時間）'; }
  async function deletionKey(password, salt) {
    if (!crypto.subtle || !/^[a-f0-9]{64}$/.test(salt)) throw new Error('このブラウザーでは削除用パスワードを安全に処理できません。');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt.match(/../g), h => parseInt(h, 16)), iterations: 600000 }, material, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const summary = reply => '#' + reply.number + ' ' + reply.nickname + '「' + String(reply.body).replace(/\s+/g, ' ').slice(0, 36) + '」';
  function scrollTo(el, focus) { el.scrollIntoView({ behavior: 'instant', block: 'start' }); if (focus) focus.focus({ preventScroll: true }); }
  function parsedReplies(root, postId) {
    return [...root.querySelectorAll('[data-reply-id]')].map(card => ({ id: card.dataset.replyId, post_id: postId, number: Number(card.dataset.replyNumber), reply_to: card.dataset.replyTo || '', reply_to_number: Number(card.dataset.replyToNumber || 0),
      nickname: card.querySelector('[data-reply-nickname]')?.textContent || '', body: card.querySelector('[data-reply-body]')?.textContent || '', published_at: card.querySelector('time')?.dateTime || '', deleted: card.dataset.deleted === 'true', is_post_author: card.dataset.postAuthor === 'true' }));
  }
  function reportForm(card, reply) {
    if (card.querySelector('[data-report-form]')) return;
    const form = node('form'); form.dataset.reportForm = ''; const label = node('label', '通報理由'); const input = node('textarea'); input.required = true; input.maxLength = 1000; label.append(input);
    const send = node('button', '通報を送信'); send.type = 'submit'; const status = node('p'); status.setAttribute('role', 'status'); form.append(label, send, status); card.append(form); input.focus(); const opened = Date.now();
    form.addEventListener('submit', async event => { event.preventDefault(); send.disabled = true;
      try { await api('communityReport', { kind: 'reply', id: reply.id, reason: input.value, form_started_at: String(opened), website: '' }); status.textContent = '通報を受け付けました。'; input.disabled = true; }
      catch (error) { status.textContent = error.message; send.disabled = false; }
    });
  }
  function deleteForm(card, reply, refresh) {
    if (card.querySelector('[data-delete-form]')) return;
    const form = node('form'); form.dataset.deleteForm = ''; const label = node('label', '削除用パスワード'); const input = node('input'); input.type = 'password'; input.required = true; input.autocomplete = 'off'; label.append(input);
    const send = node('button', '削除を実行'); send.type = 'submit'; const cancel = node('button', 'キャンセル'); cancel.type = 'button'; cancel.addEventListener('click', () => form.remove());
    const help = node('p', 'パスワードを忘れた場合は、登録メールに管理リンクを送れます。', 'cm-muted');
    const recover = node('a', '管理リンクを受け取る'); recover.href = '/germany/ja/community/conversation/?kind=reply&id=' + encodeURIComponent(reply.id);
    const status = node('p'); status.setAttribute('role', 'status'); form.append(label, help, recover, node('br'), send, cancel, status); card.append(form); input.focus();
    form.addEventListener('submit', async event => { event.preventDefault(); send.disabled = true; status.textContent = '削除を処理中…';
      try { const challenge = await api('communityReplyDeleteChallenge', { id: reply.id }); const key = await deletionKey(input.value, challenge.salt);
        await api('communityDeleteReply', { id: reply.id, deletion_key: key }); input.value = ''; await refresh(reply.id, true);
      } catch (error) { status.textContent = error.code === 'INVALID_ACCESS' ? '削除用パスワードが一致しません。' : error.message; send.disabled = false; }
    });
  }
  async function mount(root, post, initial = {}) {
    if (!root || root.dataset.cmMounted) return;
    root.dataset.cmMounted = 'true'; root.classList.add('cm-thread');
    const postId = String(post.post_id || post.id || post._id || '');
    let replies = Array.isArray(post.public_replies) ? post.public_replies : parsedReplies(root, postId);
    const title = String(post.title || post._title || '元の投稿');
    const closed = post._isClosed || post.status === 'closed' || post.status !== 'active' || (post.expires_at && Date.parse(post.expires_at) <= Date.now());
    const heading = node('h2', '公開返信'); const list = node('div'); list.dataset.replyItems = '';
    const liveStatus = node('p'); liveStatus.setAttribute('role', 'status');
    const reload = node('button', '返信を更新'); reload.type = 'button';
    const form = node('form', undefined, 'cm-compose'); form.dataset.cmForm = ''; form.id = 'cm-compose-' + postId;
    const fieldset = node('fieldset'); fieldset.disabled = true; const legend = node('legend', '返信する'); fieldset.append(legend);
    const modeGroup = node('fieldset', undefined, 'cm-mode'); modeGroup.append(node('legend', '公開範囲'));
    const publicRadio = node('input'); publicRadio.type = 'radio'; publicRadio.name = 'visibility'; publicRadio.value = 'public'; publicRadio.checked = true;
    const privateRadio = node('input'); privateRadio.type = 'radio'; privateRadio.name = 'visibility'; privateRadio.value = 'private';
    const publicLabel = node('label'); publicLabel.append(publicRadio, node('span', '公開返信')); const privateLabel = node('label'); privateLabel.append(privateRadio, node('span', '非公開返信')); modeGroup.append(publicLabel, privateLabel);
    const modeNotice = node('p', undefined, 'cm-mode-notice'); modeNotice.setAttribute('aria-live', 'polite');
    const targetLabel = node('label', '返信先'); const target = node('input'); target.type = 'text'; target.setAttribute('aria-label', '返信先'); target.setAttribute('list', 'cm-targets-' + postId); target.autocomplete = 'off'; target.value = '元の投稿'; target.placeholder = '元の投稿・返信番号・ニックネーム';
    const options = node('datalist'); options.id = 'cm-targets-' + postId; targetLabel.append(target);
    const context = node('div', undefined, 'cm-target-context'); context.setAttribute('aria-live', 'polite');
    const clear = node('button', '元の投稿への返信に戻す'); clear.type = 'button';
    function field(labelText, tag, name, type) { const label = node('label', labelText); const input = node(tag); if (name) input.name = name; if (type) input.type = type; input.required = true; label.append(input); fieldset.append(label); return { label, input }; }
    fieldset.append(modeGroup, modeNotice, targetLabel, options, context, clear);
    const nickname = field('ニックネーム', 'input', 'nickname', 'text'); nickname.input.maxLength = 60; nickname.input.autocomplete = 'nickname';
    const email = field('通知用メールアドレス（相手に非公開）', 'input', 'email', 'email'); email.input.maxLength = 254; email.input.autocomplete = 'email';
    const body = field('メッセージ', 'textarea', 'body'); body.input.maxLength = 4000;
    // No name attribute: the raw password can never enter the submitted FormData.
    const password = field('削除用パスワード（8文字以上）', 'input', '', 'password'); password.input.minLength = 8; password.input.maxLength = 128; password.input.autocomplete = 'new-password';
    const passwordHelp = node('p', '他のサービスと異なるパスワードを設定してください。メールには記載しません。', 'cm-muted'); fieldset.append(passwordHelp);
    const consentLabel = node('label', undefined, 'cm-consent'); const consent = node('input'); consent.type = 'checkbox'; consent.required = true; const consentText = node('span'); consentLabel.append(consent, consentText);
    const honeyLabel = node('label', 'ウェブサイト', 'cm-honeypot'); honeyLabel.setAttribute('aria-hidden', 'true'); const honey = node('input'); honey.name = 'website'; honey.tabIndex = -1; honey.autocomplete = 'off'; honeyLabel.append(honey);
    const privacy = node('p', 'メールアドレスは通知・会話へのアクセス・不正利用防止のために運営が処理します。 '); const policy = node('a', 'プライバシーポリシー'); policy.href = '/germany/ja/privacy/'; privacy.append(policy);
    const send = node('button', '送信する'); send.type = 'submit'; const status = node('p'); status.dataset.composeStatus = ''; status.setAttribute('role', 'status');
    fieldset.append(consentLabel, honeyLabel, privacy, send); form.append(fieldset, status);
    root.replaceChildren(heading, list, reload, liveStatus, form);
    let ready = false; let started = Date.now(); let draft = null;
    function selectedReply() {
      const value = target.value.trim(); if (!value || value === '元の投稿') { target.setCustomValidity(''); return null; }
      const matches = replies.filter(reply => !reply.deleted && (value === summary(reply) || value === '#' + reply.number || value === String(reply.number) || value === reply.nickname));
      target.setCustomValidity(matches.length === 1 ? '' : '返信番号または候補から、返信先を1件選んでください。'); return matches.length === 1 ? matches[0] : undefined;
    }
    function updateContext() {
      const reply = selectedReply(); const isPrivate = privateRadio.checked;
      context.replaceChildren(node('strong', reply ? (isPrivate ? '送信先：' : '返信先：') + '#' + reply.number + '・' + reply.nickname + 'さん' : reply === null ? (isPrivate ? '送信先：元の投稿者' : '返信先：元の投稿「' + title + '」') : '返信先を選択してください。'));
      if (reply) context.append(node('blockquote', String(reply.body).slice(0, 120)));
      clear.hidden = !reply;
    }
    function updateMode() {
      const isPrivate = privateRadio.checked; form.dataset.visibility = isPrivate ? 'private' : 'public';
      modeNotice.textContent = isPrivate ? '🔒 非公開：選択した相手とあなただけの会話です。メールアドレスは相手に表示されません。入力したアドレスに会話リンクが届くため、誤入力がないか確認してください。' : '公開：ニックネームと本文は誰でも閲覧できます。承認待ちなしで掲載されます。個人情報は書かないでください。';
      password.label.hidden = isPrivate; passwordHelp.hidden = isPrivate; password.input.required = !isPrivate; password.input.disabled = isPrivate;
      consent.checked = false; consentText.textContent = isPrivate ? '表示された相手に非公開で送信することを確認しました。' : 'ニックネームと本文をインターネット上に公開することに同意します。'; updateContext();
    }
    function updateOptions() { options.replaceChildren(); ['元の投稿', ...replies.filter(r => !r.deleted).map(summary)].forEach(value => { const option = node('option'); option.value = value; options.append(option); }); updateContext(); }
    function choose(reply, visibility) { if (visibility) { privateRadio.checked = visibility === 'private'; publicRadio.checked = !privateRadio.checked; updateMode(); } target.value = reply ? summary(reply) : '元の投稿'; consent.checked = false; updateContext(); scrollTo(form, body.input); }
    function render() {
      list.replaceChildren(); if (!replies.length) list.append(node('p', '公開返信はまだありません。'));
      replies.forEach(reply => {
        const card = node('article', undefined, 'cm-reply'); card.id = 'reply-' + reply.id; card.dataset.replyId = reply.id;
        card.append(node('h3', '#' + reply.number + ' ' + reply.nickname + (reply.is_post_author ? '（投稿者・メール確認済み）' : '')));
        if (reply.reply_to) {
          const parent = replies.find(item => item.id === reply.reply_to); const n = parent?.number || reply.reply_to_number;
          const relation = node('a', '#' + (n || '?') + (parent && !parent.deleted ? ' ' + parent.nickname + 'さん' : '') + 'への返信'); relation.href = '#reply-' + reply.reply_to;
          relation.addEventListener('click', event => { const el = [...list.children].find(item => item.id === 'reply-' + reply.reply_to); if (!el) return; event.preventDefault(); scrollTo(el); el.classList.add('cm-highlight'); setTimeout(() => el.classList.remove('cm-highlight'), 2200); }); card.append(relation);
        } else card.append(node('p', '元の投稿への返信', 'cm-muted'));
        card.append(node('p', reply.deleted ? 'この返信は削除されました。' : reply.body, 'cm-body'));
        const dateLabel = formatTime(reply.published_at); if (dateLabel) { const time = node('time', dateLabel); time.dateTime = reply.published_at; card.append(time); }
        if (!reply.deleted) {
          const actions = node('div', undefined, 'cm-actions'); const respond = node('button', '返信する'); respond.type = 'button'; respond.disabled = Boolean(closed); respond.addEventListener('click', () => choose(reply));
          const remove = node('button', '削除'); remove.type = 'button'; remove.addEventListener('click', () => deleteForm(card, reply, refresh));
          const report = node('button', '通報'); report.type = 'button'; report.addEventListener('click', () => reportForm(card, reply)); actions.append(respond, remove, report); card.append(actions);
        }
        list.append(card);
      }); updateOptions();
    }
    async function refresh(changedId, deleted = false) {
      reload.disabled = true;
      if (deleted) { replies = replies.map(reply => reply.id === changedId ? { ...reply, deleted: true, nickname: '削除済み', body: '' } : reply); render(); }
      try { const data = await api('communityPublicReplies', { post_id: postId }); replies = Array.isArray(data.replies) ? data.replies : replies; render(); liveStatus.textContent = ''; }
      catch (_) { liveStatus.textContent = '最新の返信を取得できませんでした。表示中の返信は保持しています。'; }
      finally { reload.disabled = false; }
    }
    reload.addEventListener('click', () => refresh());
    [publicRadio, privateRadio].forEach(radio => radio.addEventListener('change', updateMode));
    target.addEventListener('input', () => { consent.checked = false; updateContext(); }); clear.addEventListener('click', () => { target.value = '元の投稿'; consent.checked = false; updateContext(); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); const reply = selectedReply(); if (!ready || reply === undefined || !form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form)); const isPrivate = privateRadio.checked;
      const fingerprint = JSON.stringify([values, reply?.id, isPrivate, isPrivate ? '' : password.input.value]);
      if (!draft || draft.fingerprint !== fingerprint) draft = { fingerprint, request: id(), salt: secret(), creation: secret() };
      send.disabled = true; status.textContent = '送信しています…';
      try {
        const extra = isPrivate ? { private_consent: 'true', creation_key: draft.creation } : { public_consent: 'true', deletion_salt: draft.salt, deletion_key: await deletionKey(password.input.value, draft.salt) };
        const data = await api(isPrivate ? 'communityCreateConversation' : 'communityCreateReply', { ...values, ...extra, post_id: postId, reply_to: reply?.id || '', request_id: draft.request, form_started_at: String(started) });
        if (isPrivate) {
          const url = '/germany/ja/community/conversation/?kind=conversation&id=' + encodeURIComponent(data.id);
          if (/^[a-f0-9]{64}$/.test(data.session || '')) {
            try { sessionStorage.setItem('jconnect:conversation:conversation:' + data.id, data.session); location.assign(url); return; } catch (_) {}
          }
          fieldset.disabled = true; ready = false; status.textContent = '送信しました。メールの専用リンクから会話を開けます。通知は順次送信します。';
          const link = node('a', '会話を開く・リンクを再取得する'); link.href = url; status.append(node('br'), link);
        } else {
          if (data.reply) { replies = [...replies.filter(item => item.id !== data.reply.id), data.reply].sort((a,b) => a.number - b.number); render(); }
          body.input.value = ''; password.input.value = ''; consent.checked = false; draft = null; started = Date.now();
          status.textContent = '公開しました。投稿完了メールは順次送信します。'; const card = [...list.children].find(item => item.id === 'reply-' + data.id); if (card) scrollTo(card);
        }
      } catch (error) { status.textContent = error.message; }
      finally { send.disabled = false; }
    });
    updateMode(); render();
    if (initial.replyTo) { const found = replies.find(r => r.id === initial.replyTo); if (found) target.value = summary(found); }
    if (initial.visibility === 'private') { privateRadio.checked = true; publicRadio.checked = false; updateMode(); }
    status.textContent = closed ? 'この投稿は受付を終了しています。' : '受付状況を確認中…';
    if (closed) return;
    try { await available(true); await refresh(); if (initial.replyTo) { const chosen = replies.find(r => r.id === initial.replyTo && !r.deleted); if (chosen) target.value = summary(chosen); } fieldset.disabled = false; password.input.disabled = privateRadio.checked; ready = true; status.textContent = ''; updateContext(); }
    catch (error) { status.textContent = error.message; }
    root.dispatchEvent(new CustomEvent('cm:ready'));
  }
  async function startContact() {
    const root = document.getElementById('contactMessaging'); if (!root) return;
    const params = new URLSearchParams(location.search);
    try { const payload = await sources.fetchJsonWithTimeout(sources.staticData.communityPosts, 8000).catch(() => null); const match = data => sources.normalizePayload(data).find(p => String(p.post_id || p.id) === params.get('post_id'));
      const post = (payload && match(payload)) || match(await sources.fetchLiveCommunityPosts(payload, 8000).catch(error => { if (!payload) throw error; return []; }));
      if (!post) throw new Error('投稿が見つかりません。'); await mount(root, post, { visibility: params.get('visibility'), replyTo: params.get('reply_to') });
    } catch (error) { root.textContent = error.message; }
  }
  window.JConnectMessaging = Object.freeze({ api, available, formatTime, mode: () => 'public', mount, node, requestId: id });
  document.querySelectorAll('[data-community-replies]').forEach(root => {
    mount(root, { id: root.dataset.communityReplies, title: root.dataset.postTitle, status: root.dataset.postStatus || 'active' });
  });
  startContact();
})();
