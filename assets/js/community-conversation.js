(function () {
  'use strict';
  const { api, available, formatTime, node, requestId } = window.JConnectMessaging;
  const query = new URLSearchParams(location.search); const kind = query.get('kind'); const scopeId = query.get('id') || '';
  let access = window.JCONNECT_PENDING_ACCESS || ''; delete window.JCONNECT_PENDING_ACCESS;
  const linkWasPresent = Boolean(window.JCONNECT_LINK_FRAGMENT); delete window.JCONNECT_LINK_FRAGMENT;
  let session = ''; let before = ''; let sendingDraft = null; const opened = Date.now();
  let generation = 0; let tasks = 0; let loads = 0; let loadQueue = Promise.resolve();
  let history = []; let unread = 0; let refreshTimer; let conversationState = '';
  const refreshDelay = 60000;
  const key = 'jconnect:conversation:' + kind + ':' + scopeId;
  const el = (id) => document.getElementById(id);
  const status = el('conversationStatus');
  const closedMessage = '元の投稿が削除・非公開になったため、この会話を開けません。';
  const brokenLinkMessage = 'リンクの一部が欠けているため開けません。メールのリンク全体を開くか、下のフォームから同じリンクを再送してください。';
  function store(value) { session = value; try { sessionStorage.setItem(key, value); } catch (_) {} }
  function recover(message) {
    clearTimeout(refreshTimer);
    status.textContent = message; el('recoveryPanel').hidden = false;
    el('conversationPanel').hidden = true; el('replyPanel').hidden = true;
    el('conversationIntro').hidden = false;
  }
  function forget() {
    generation++; history = []; unread = 0; before = ''; sendingDraft = null;
    session = ''; access = ''; try { sessionStorage.removeItem(key); } catch (_) {}
    el('privateMessages').replaceChildren(); el('replyBody').textContent = ''; el('messageBody').value = ''; el('messageStatus').textContent = '';
    recover('この端末で会話を閉じました。メールの同じリンクから、いつでも開き直せます。');
  }
  async function scoped(action, values = {}) {
    const current = generation;
    try { return await api(action, { ...values, kind, id: scopeId, session }); }
    catch (error) {
      if (error.code === 'INVALID_ACCESS' && current === generation) { forget(); recover(error.message); }
      else if (error.code === 'CLOSED' && current === generation) recover(closedMessage);
      throw error;
    }
  }
  function latest() {
    const list = el('privateMessages'); list.scrollTop = list.scrollHeight; unread = 0; el('showNewMessages').hidden = true;
  }
  function showMessages(messages, older, followLatest) {
    const list = el('privateMessages'); const top = list.scrollTop; const height = list.scrollHeight;
    const atEnd = height - list.clientHeight - top < 64; const first = history.length === 0;
    const known = new Set(history.map(message => message.id));
    const incoming = messages.filter(message => !known.has(message.id) && !message.mine).length;
    const combined = new Map((older ? [...messages, ...history] : [...history, ...messages]).map(message => [message.id, message]));
    const next = [...combined.values()];
    if (JSON.stringify(next) === JSON.stringify(history)) return;
    history = next;
    const fragment = document.createDocumentFragment();
    history.forEach((message) => {
      const card = node('article', undefined, 'cm-message' + (message.mine ? ' cm-message--mine' : ''));
      card.append(node('h3', message.nickname + (message.mine ? '（あなた）' : '')));
      const dateLabel = formatTime(message.created_at); if (dateLabel) { const label = node('time', dateLabel); label.dateTime = message.created_at; card.append(label); }
      card.append(node('p', message.deleted ? 'このメッセージは削除されました。' : message.body, 'cm-body'));
      if (message.mine && !message.deleted) {
        const remove = node('button', 'このメッセージを削除'); remove.type = 'button';
        remove.addEventListener('click', () => { if (confirm('このメッセージを削除しますか？')) task(remove, async () => { await scoped('communityDeleteMessage', { message_id: message.id }); await load(); }); }); card.append(remove);
      }
      fragment.append(card);
    });
    list.replaceChildren(fragment);
    if (older) list.scrollTop = top + list.scrollHeight - height;
    else if (first || followLatest || atEnd) latest();
    else {
      list.scrollTop = top; unread += incoming;
      el('showNewMessages').textContent = '新しいメッセージを表示（' + unread + '件）'; el('showNewMessages').hidden = !unread;
    }
  }
  function load(older = false, followLatest = false) {
    const current = generation; loads++;
    const pending = loadQueue.catch(() => {}).then(() => current === generation && session ? loadData(older, followLatest, current) : undefined);
    loadQueue = pending;
    return pending.finally(() => { loads--; });
  }
  async function loadData(older, followLatest, current) {
    if (kind === 'reply') {
      const reply = await scoped('communityGetReply'); if (current !== generation) return;
      el('recoveryPanel').hidden = true; el('replyPanel').hidden = false;
      el('replyBody').textContent = reply.body;
      el('replyState').textContent = ({ pending: 'メール確認済み・運営の承認待ちです。', approved: '公開されています。', published: '公開されています。', hidden: '非表示です。' })[reply.status] || '確認待ちです。';
      el('deleteReply').disabled = reply.status === 'hidden'; el('replyPostLink').href = '../post/?id=' + encodeURIComponent(reply.post_id); status.textContent = ''; return;
    }
    const data = await scoped('communityGetConversation', older && before ? { before } : {});
    if (current !== generation) return;
    el('recoveryPanel').hidden = true; el('conversationPanel').hidden = false;
    el('conversationIntro').hidden = true;
    el('conversationTitle').textContent = '非公開の会話'; el('privatePostTitle').textContent = data.post_title;
    conversationState = data.status;
    el('conversationState').textContent = data.status === 'active' ? '相手：' + data.other_nickname + ' さん。' + (data.target_reply_id ? '公開返信から始まった非公開の会話です。' : 'この投稿についての非公開の会話です。') + 'メールアドレスは互いに表示されません。' : data.status === 'blocked' ? 'ブロックにより新しい送信を停止しています。' : 'この会話は終了しています。';
    el('messageForm').hidden = data.status !== 'active';
    el('closeConversation').disabled = data.status !== 'active'; el('blockConversation').disabled = data.status === 'blocked';
    if (older || !history.length) { before = data.before || ''; el('olderMessages').hidden = !data.has_more; }
    showMessages(data.messages || [], older, followLatest); status.textContent = '';
    el('conversationUpdates').textContent = data.status === 'active' ? '表示中は1分ごとに新着を確認します。' : '';
    scheduleRefresh();
  }
  async function task(button, action, options = {}) {
    if (button.disabled) return;
    const output = options.output || status; const label = button.textContent; const current = generation;
    tasks++; button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = options.label || '処理中…';
    output.textContent = options.pending || '処理しています…';
    if (output === el('messageStatus')) output.scrollIntoView({ block: 'nearest' });
    try { await action(); }
    catch (error) {
      if (current === generation) { output.textContent = options.failed ? options.failed + '（' + error.message + '）' : error.message; output.classList.toggle('is-error', Boolean(options.failed)); }
      button.disabled = false;
    }
    finally {
      tasks--; button.textContent = label; button.removeAttribute('aria-busy');
      if (!['closeConversation', 'blockConversation', 'deleteReply'].includes(button.id)) button.disabled = false;
      if (current === generation && output === el('messageStatus') && !el('conversationPanel').hidden) output.scrollIntoView({ block: 'nearest' });
    }
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (!session || kind !== 'conversation' || conversationState !== 'active') return;
    refreshTimer = setTimeout(async () => {
      if (!document.hidden && !tasks && !loads) {
        const current = generation;
        try { await load(); }
        catch (_) { if (current === generation && session) el('conversationUpdates').textContent = '新着を確認できませんでした。「会話を更新」で再試行できます。'; }
      }
      scheduleRefresh();
    }, refreshDelay);
  }
  // Email links are reusable, so opening one exchanges it without a confirmation step.
  async function openLink() {
    status.textContent = 'メールのリンクを確認しています…';
    let result;
    try { result = await api('communityUseAccess', { kind, id: scopeId, access }); }
    catch (error) { access = ''; recover(error.code === 'CLOSED' ? closedMessage : error.message); return; }
    access = '';
    if (result.scope !== kind || result.id !== scopeId || !/^[a-f0-9]{64}$/.test(result.session)) { recover('確認結果を読み取れませんでした。メールのリンクをもう一度開いてください。'); return; }
    store(result.session);
    await load();
  }
  el('recoveryForm').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button');
    task(button, async () => { await api('communityRequestAccess', { kind, id: scopeId, ...Object.fromEntries(new FormData(form)), form_started_at: String(opened) }); status.textContent = '登録内容が一致した場合に、この会話のリンクをメールで再送します。迷惑メールフォルダーもご確認ください。'; });
  });
  el('refreshMessages').addEventListener('click', () => task(el('refreshMessages'), () => load(), { output: el('conversationUpdates'), label: '更新中…', pending: '新しいメッセージを確認しています…' }));
  el('olderMessages').addEventListener('click', () => task(el('olderMessages'), () => load(true), { output: el('conversationUpdates'), label: '読み込み中…', pending: '以前のメッセージを読み込んでいます…' }));
  el('showNewMessages').addEventListener('click', latest);
  el('privateMessages').addEventListener('scroll', () => {
    const list = el('privateMessages'); if (list.scrollHeight - list.scrollTop - list.clientHeight < 64) { unread = 0; el('showNewMessages').hidden = true; }
  });
  document.addEventListener('visibilitychange', scheduleRefresh);
  el('messageForm').addEventListener('submit', (event) => {
    event.preventDefault(); const button = event.currentTarget.querySelector('button'); if (button.disabled) return;
    const body = el('messageBody').value; const current = generation;
    if (!sendingDraft || sendingDraft.body !== body) sendingDraft = { body, id: requestId() };
    task(button, async () => {
      el('messageFields').disabled = true;
      const result = await scoped('communitySendMessage', { body, request_id: sendingDraft.id });
      if (current !== generation) return;
      sendingDraft = null; el('messageBody').value = ''; el('messageStatus').classList.remove('is-error');
      const saved = result.notification_pending ? '返信を保存しました。通知メールは再試行中です。' : '返信を送信し、相手にメールで通知しました。';
      try { await load(false, true); if (current === generation) el('messageStatus').textContent = saved; }
      catch (_) { if (current === generation) el('messageStatus').textContent = saved + ' 会話の表示を更新できませんでした。「会話を更新」を押してください。'; }
    }, { output: el('messageStatus'), label: '送信中…', pending: '返信を送信しています。そのままお待ちください。', failed: '未送信：本文はそのまま残しています。もう一度「返信する」を押すと、重複せずに再送します。' }).finally(() => { el('messageFields').disabled = false; });
  });
  ['closeConversation', 'blockConversation'].forEach((name) => el(name).addEventListener('click', () => {
    if (!confirm(name === 'blockConversation' ? '相手をブロックし、会話を終了しますか？' : 'この会話を終了しますか？終了後は両者とも送信できません。')) return;
    task(el(name), async () => { await scoped('communityEndConversation', { block: name === 'blockConversation' ? 'true' : 'false' }); await load(); });
  }));
  el('revokeAccess').addEventListener('click', () => {
    if (!confirm('これまでにメールで届いたリンクと、他の端末で開いている画面を無効にします。この画面は引き続き使え、新しいリンクを登録メールに送ります。よろしいですか？')) return;
    task(el('revokeAccess'), async () => {
      const result = await scoped('communityRevokeAccess');
      if (!/^[a-f0-9]{64}$/.test(result.session || '')) throw new Error('取消し結果を読み取れませんでした。');
      store(result.session); status.textContent = '以前のリンクを無効にしました。新しいリンクを登録メールに送りました。';
    });
  });
  el('privateReportForm').addEventListener('submit', (event) => { event.preventDefault(); const button = event.currentTarget.querySelector('button');
    task(button, async () => { await scoped('communityReport', { reason: el('reportReason').value }); status.textContent = '通報を受け付けました。運営が確認します。'; el('reportReason').value = ''; });
  });
  el('deleteReply').addEventListener('click', () => {
    if (!confirm('この返信を非表示にしますか？公開ページの更新には時間がかかる場合があります。')) return;
    task(el('deleteReply'), async () => { await scoped('communityDeleteReply'); await load(); });
  });
  el('leaveConversation').addEventListener('click', forget); el('leaveReply').addEventListener('click', forget);
  (async () => {
    if (!['reply', 'conversation'].includes(kind) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(scopeId)) { status.textContent = 'メールの専用リンク、または送信後に表示された確認ページから開いてください。'; return; }
    try {
      await available();
      if (/^[a-f0-9]{64}$/.test(access)) { await openLink(); return; }
      if (linkWasPresent) { recover(brokenLinkMessage); return; }
      try { session = sessionStorage.getItem(key) || ''; } catch (_) {}
      if (session) await load(); else recover('メールに届いたリンクから開いてください。リンクは何度でも使えます。メールが見つからない場合は、下のフォームから再送できます。');
    } catch (error) { recover(error.message); }
  })();
})();
