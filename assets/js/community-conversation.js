(function () {
  'use strict';
  const { api, available, node, requestId } = window.JConnectMessaging;
  const query = new URLSearchParams(location.search); const kind = query.get('kind'); const scopeId = query.get('id') || '';
  let access = window.JCONNECT_PENDING_ACCESS || ''; delete window.JCONNECT_PENDING_ACCESS;
  let session = ''; let before = ''; let sendingId = requestId(); const opened = Date.now();
  const key = 'jconnect:conversation:' + kind + ':' + scopeId;
  const el = (id) => document.getElementById(id);
  const status = el('conversationStatus');
  function recover(message) {
    status.textContent = message; el('accessPanel').hidden = true; el('recoveryPanel').hidden = false;
    el('conversationPanel').hidden = true; el('replyPanel').hidden = true;
  }
  function forget() {
    session = ''; access = ''; try { sessionStorage.removeItem(key); } catch (_) {}
    el('privateMessages').replaceChildren(); el('replyBody').textContent = ''; el('messageBody').value = '';
    recover('この端末で会話を閉じました。再び開くには、メールの新しいリンクを使用してください。');
  }
  async function scoped(action, values = {}) {
    try { return await api(action, { ...values, kind, id: scopeId, session }); }
    catch (error) {
      if (error.code === 'INVALID_ACCESS') { session = ''; try { sessionStorage.removeItem(key); } catch (_) {} recover(error.message); }
      throw error;
    }
  }
  function showMessages(messages, prepend) {
    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
      const card = node('article', undefined, 'cm-message' + (message.mine ? ' cm-message--mine' : ''));
      card.append(node('h3', message.nickname + (message.mine ? '（あなた）' : '')));
      const time = new Date(message.created_at); if (!Number.isNaN(time.getTime())) { const label = node('time', time.toLocaleString('ja-JP')); label.dateTime = message.created_at; card.append(label); }
      card.append(node('p', message.body, 'cm-body')); fragment.append(card);
    });
    if (prepend) el('privateMessages').prepend(fragment); else el('privateMessages').replaceChildren(fragment);
  }
  async function load(older = false) {
    if (kind === 'reply') {
      const reply = await scoped('communityGetReply'); el('accessPanel').hidden = true; el('recoveryPanel').hidden = true; el('replyPanel').hidden = false;
      el('replyBody').textContent = reply.body;
      el('replyState').textContent = ({ pending: 'メール確認済み・運営の承認待ちです。', approved: '公開されています。', hidden: '非表示です。' })[reply.status] || '確認待ちです。';
      el('deleteReply').disabled = reply.status === 'hidden'; el('replyPostLink').href = '../post/?id=' + encodeURIComponent(reply.post_id); status.textContent = ''; return;
    }
    const data = await scoped('communityGetConversation', older && before ? { before } : {});
    el('accessPanel').hidden = true; el('recoveryPanel').hidden = true; el('conversationPanel').hidden = false;
    el('conversationTitle').textContent = '非公開の会話'; el('privatePostTitle').textContent = data.post_title;
    el('conversationState').textContent = data.status === 'active' ? '参加者はあなたと ' + data.other_nickname + ' さんです。メールアドレスは互いに表示されません。' : data.status === 'blocked' ? 'ブロックにより新しい送信を停止しています。' : 'この会話は終了しています。';
    el('messageForm').hidden = data.status !== 'active';
    el('closeConversation').disabled = data.status !== 'active'; el('blockConversation').disabled = data.status === 'blocked';
    showMessages(data.messages || [], older); before = data.before || ''; el('olderMessages').hidden = !data.has_more; status.textContent = '';
  }
  async function task(button, action) {
    button.disabled = true;
    try { await action(); }
    catch (error) { status.textContent = error.message; button.disabled = false; }
    finally { if (!['closeConversation', 'blockConversation', 'deleteReply'].includes(button.id)) button.disabled = false; }
  }
  el('confirmAccess').addEventListener('click', () => task(el('confirmAccess'), async () => {
    const result = await api('communityUseAccess', { kind, id: scopeId, access }); access = '';
    if (result.scope !== kind || result.id !== scopeId || !/^[a-f0-9]{64}$/.test(result.session)) throw new Error('確認結果を読み取れませんでした。新しいリンクを取得してください。');
    session = result.session; try { sessionStorage.setItem(key, session); } catch (_) {}
    await load();
  }).catch(() => {}));
  el('recoveryForm').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button');
    task(button, async () => { await api('communityRequestAccess', { kind, id: scopeId, ...Object.fromEntries(new FormData(form)), form_started_at: String(opened) }); status.textContent = '登録内容が一致した場合にメールを送信します。迷惑メールフォルダーもご確認ください。'; });
  });
  el('refreshMessages').addEventListener('click', () => task(el('refreshMessages'), () => load()));
  el('olderMessages').addEventListener('click', () => task(el('olderMessages'), () => load(true)));
  el('messageForm').addEventListener('submit', (event) => {
    event.preventDefault(); const button = event.currentTarget.querySelector('button');
    task(button, async () => {
      const result = await scoped('communitySendMessage', { body: el('messageBody').value, request_id: sendingId });
      sendingId = requestId(); el('messageBody').value = ''; await load();
      status.textContent = result.notification_pending ? '返信を保存しました。通知メールの送信は再試行しています。' : '返信を保存し、相手にメールで通知しました。';
    });
  });
  ['closeConversation', 'blockConversation'].forEach((name) => el(name).addEventListener('click', () => {
    if (!confirm(name === 'blockConversation' ? '相手をブロックし、会話を終了しますか？' : 'この会話を終了しますか？終了後は両者とも送信できません。')) return;
    task(el(name), async () => { await scoped('communityEndConversation', { block: name === 'blockConversation' ? 'true' : 'false' }); await load(); });
  }));
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
      if (access) { el('accessPanel').hidden = false; el('recoveryPanel').hidden = false; status.textContent = 'メールのリンクを確認してください。'; return; }
      try { session = sessionStorage.getItem(key) || ''; } catch (_) {}
      if (session) await load(); else recover('メールから開くか、新しい確認リンクを受け取ってください。');
    } catch (error) { recover(error.message); }
  })();
})();
