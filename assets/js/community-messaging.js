/* Public board UI and account-free messaging transport. */
(function () {
  'use strict';
  const sources = window.JCONNECT_DATA_SOURCES;
  const endpoint = sources?.communityDataEndpoint;
  const mode = (post) => ['質問', '相談', '質問・相談'].includes(String(post.category1 || post._postType || '').trim()) ? 'public' : 'private';
  const id = () => crypto.randomUUID();
  async function api(action, values = {}) {
    if (!endpoint) throw new Error('現在この機能を利用できません。');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ action, ...values }),
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (!response.ok) throw new Error('通信に失敗しました。時間をおいて再度お試しください。');
      const data = await response.json();
      if (!data.ok) { const error = new Error(data.error || '現在この機能を利用できません。'); error.code = data.code; throw error; }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('通信を確認できませんでした。再送する場合も同じ内容は重複登録されません。');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function available() {
    try {
      const data = await api('communityMessagingStatus');
      if (!data.messaging_version || !data.public_replies || !data.private_conversations) throw new Error('UNAVAILABLE');
    } catch (_) { throw new Error('返信・会話機能を現在利用できません。時間をおいて再度お試しください。'); }
  }
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function renderReplies(root, replies, postId) {
    root.replaceChildren();
    if (!replies.length) { root.append(node('p', '公開返信はまだありません。')); return; }
    replies.forEach((reply) => {
      const card = node('article', undefined, 'cm-reply'); card.id = 'reply-' + reply.id;
      card.append(node('h3', reply.nickname + (reply.is_post_author ? '（投稿者）' : '')));
      if (reply.reply_to) {
        const parent = replies.find((item) => item.id === reply.reply_to);
        if (parent) card.append(node('p', parent.nickname + ' さんへの返信', 'cm-muted'));
      }
      card.append(node('p', reply.body, 'cm-body'));
      const date = new Date(reply.published_at); if (!Number.isNaN(date.getTime())) { const time = node('time', date.toLocaleDateString('ja-JP')); time.dateTime = reply.published_at; card.append(time); }
      const actions = node('div', undefined, 'cm-actions');
      const link = node('a', 'この返信に返信する'); link.href = '/germany/ja/community/contact/?post_id=' + encodeURIComponent(postId) + '&reply_to=' + encodeURIComponent(reply.id); actions.append(link);
      const report = node('button', '通報'); report.type = 'button'; actions.append(report);
      let opened = Date.now();
      report.addEventListener('click', () => {
        if (card.querySelector('form')) return;
        const form = node('form'); const label = node('label', '通報理由'); const input = node('textarea'); input.required = true; input.maxLength = 1000; label.append(input);
        const send = node('button', '通報を送信'); send.type = 'submit'; const status = node('p'); status.setAttribute('role', 'status'); form.append(label, send, status); card.append(form); input.focus(); opened = Date.now();
        form.addEventListener('submit', async (event) => { event.preventDefault(); send.disabled = true;
          try { await api('communityReport', { kind: 'reply', id: reply.id, reason: input.value, form_started_at: String(opened), website: '' }); status.textContent = '通報を受け付けました。運営が確認します。'; input.disabled = true; }
          catch (error) { status.textContent = error.message; send.disabled = false; }
        });
      });
      card.append(actions); root.append(card);
    });
  }
  async function mount(root, post) {
    if (!root || mode(post) !== 'public') return;
    const postId = String(post.post_id || post.id || post._id || '');
    root.classList.add('cm-thread');
    const heading = node('h2', '公開返信'); const notice = node('p', 'ニックネームと返信本文を公開します。メールアドレスは公開されません。返信はメール確認・運営承認後に掲載します。');
    const list = node('div'); const status = node('p'); status.setAttribute('role', 'status');
    const reload = node('button', '返信を更新'); reload.type = 'button';
    root.replaceChildren(heading, notice, list, reload, status);
    renderReplies(list, Array.isArray(post.public_replies) ? post.public_replies : [], postId);
    async function refresh() { reload.disabled = true; status.textContent = '返信を確認中…';
      try { const result = await api('communityPublicReplies', { post_id: postId }); renderReplies(list, Array.isArray(result.replies) ? result.replies : [], postId); status.textContent = ''; }
      catch (error) { status.textContent = '最新の返信を確認できませんでした。時間をおいて更新してください。'; }
      finally { reload.disabled = false; }
    }
    reload.addEventListener('click', refresh);
  }
  async function startForm() {
    const form = document.getElementById('contactForm'); if (!form) return;
    const params = new URLSearchParams(location.search); const postId = params.get('post_id') || '';
    const status = document.getElementById('contactStatus'); const fieldset = form.querySelector('fieldset');
    let requestId = id(); let ready = false; let post; let started = Date.now();
    try {
      const [payload] = await Promise.all([sources.fetchJsonWithTimeout(sources.staticData.communityPosts, 8000), available()]);
      post = sources.normalizePayload(payload).find((item) => String(item.post_id || item.id) === postId);
      if (!post || post.status !== 'active' || (post.expires_at && Date.parse(post.expires_at) <= Date.now())) throw new Error('この投稿は見つからないか、受付を終了しています。');
      const isPublic = mode(post) === 'public';
      document.getElementById('contactTitle').textContent = isPublic ? 'ニックネームで公開返信' : '非公開の会話を始める';
      document.getElementById('contactMode').textContent = isPublic
        ? 'ニックネームと本文は誰でも閲覧できます。メールで本人確認し、運営が承認した後に公開します。連絡先や個人情報は書かないでください。'
        : '会話はあなたと投稿者だけが閲覧できます。アカウント登録・パスワードは不要です。メールの専用リンクで開き、何度でも返信できます。メールアドレスは相手に表示されません。';
      document.getElementById('publicConsentLabel').hidden = !isPublic;
      document.getElementById('public_consent').required = isPublic;
      document.getElementById('contactPost').textContent = post.title;
      status.textContent = ''; fieldset.disabled = false; ready = true; started = Date.now();
      if (params.get('reply_to') && isPublic) document.getElementById('contactMode').append(node('span', ' 選んだ返信への返信として受け付けます。'));
    } catch (error) { status.textContent = error.message; }
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!ready || !form.reportValidity()) return;
      const button = form.querySelector('[type=submit]'); button.disabled = true; status.textContent = '確認メールを依頼中…';
      try {
        const values = Object.fromEntries(new FormData(form));
        const isPublic = mode(post) === 'public';
        const data = await api(isPublic ? 'communityCreateReply' : 'communityCreateConversation', {
          ...values, post_id: postId, form_started_at: String(started), request_id: requestId,
          public_consent: values.public_consent === 'on' ? 'true' : 'false', reply_to: isPublic ? params.get('reply_to') || '' : ''
        });
        status.textContent = data.notification_pending ? '受付しました。通知メールの送信を再試行しています。しばらく届かない場合は下のリンクから再送してください。'
          : '確認メールを送信しました。メールのリンクを開き、確認ボタンを押してください。確認が終わるまで、公開・相手への通知は行いません。';
        fieldset.disabled = true; ready = false;
        if (data.id) { const link = node('a', 'メールが届かない・確認ページを開く'); link.href = '/germany/ja/community/conversation/?kind=' + (isPublic ? 'reply' : 'conversation') + '&id=' + encodeURIComponent(data.id); status.append(node('br'), link); }
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    });
  }
  window.JConnectMessaging = Object.freeze({ api, available, mode, mount, node, requestId: id });
  document.querySelectorAll('[data-community-replies]').forEach((root) => {
    // Server-rendered approved replies stay available until the live read succeeds.
    const existing = root.querySelector('[data-reply-items]');
    const postId = root.dataset.communityReplies;
    const refresh = node('button', '返信を更新'); refresh.type = 'button';
    const status = node('p'); status.setAttribute('role', 'status'); root.append(refresh, status);
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      try { const result = await api('communityPublicReplies', { post_id: postId }); if (existing) renderReplies(existing, result.replies || [], postId); status.textContent = '返信を更新しました。'; }
      catch (error) { status.textContent = '最新の返信を確認できませんでした。時間をおいて更新してください。'; }
      finally { refresh.disabled = false; }
    });
  });
  startForm();
})();
