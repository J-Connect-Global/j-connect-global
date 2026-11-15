/* J-Connect AIチャット（全ページ右下のウィジェット）
 * - 初めての訪問では開いた状態で表示（スマホは画面をふさがないよう小さな吹き出しだけ）
 * - 最小化・開いた状態は localStorage に保存し、ほかのページでも同じ状態にする
 * - 会話はこのタブの間だけ sessionStorage に残す（ページを移っても続きから）
 * - 回答は既存のAIツールAPI（chat アクション）を使い、J-Connectの記事をもとに答える
 * AIの出力は必ず textContent で表示し、HTML として解釈しない。
 */
(function (window, document) {
  'use strict';
  if (window.__jcChatWidget) return;
  window.__jcChatWidget = true;

  var VERSION = '20261115e';
  var STATE_KEY = 'jcChatWidgetState';   // 'open' | 'min'
  var LOG_KEY = 'jcChatWidgetLog';
  var QUOTA_KEY = 'jcChatWidgetQuota';
  var CONSENT_KEY = 'jcChatWidgetConsent';
  var DAILY_MAX = 30;                    // 1つのブラウザで1日に送れる質問の数
  var TOOLS_URL = '/germany/ja/tools/';
  var TOOLS = [
    { url: '/germany/ja/tools/letter-explainer/', icon: '✉️', name: '手紙AI解説', re: /手紙|書類|通知書|郵便|Brief|請求書|督促|Mahnung|Bescheid|届いた/i },
    { url: '/germany/ja/tools/ask/', icon: '💬', name: 'AIに質問', re: null },
    { url: '/germany/ja/tools/write/', icon: '✍️', name: '手紙・メール作成', re: /メール|返信|文面|書いてほしい|書き方を教えて|連絡したい|キャンセルしたい/ },
    { url: '/germany/ja/tools/navi/', icon: '🧭', name: '手続きナビ', re: /手続き|引っ越し|引越|出産|やること|チェックリスト|到着|帰国/ },
    { url: '/germany/ja/tools/form-helper/', icon: '📝', name: '申請書の記入', re: /申請書|記入|フォーム|Formular|Antrag|用紙/i },
    { url: '/germany/ja/tools/conversation/', icon: '🗣️', name: '会話練習', re: /練習|会話|電話で|話す|発音/ }
  ];
  var GENERAL_CHIPS = [
    'Anmeldung（住民登録）のやり方は？',
    'ドイツ語の手紙が届いた',
    '病院の予約の取り方は？',
    '放送負担金（受信料）って何？',
    '滞在許可の更新で気をつけることは？',
    'ドイツ語を練習したい'
  ];

  // ---------- 保存（使えない環境でも動くように） ----------
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* noop */ } }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* noop */ } }
  function loadLog() { try { var a = JSON.parse(ssGet(LOG_KEY) || '[]'); return Array.isArray(a) ? a.slice(-24) : []; } catch (e) { return []; } }
  function saveLog() { ssSet(LOG_KEY, JSON.stringify(log.slice(-24))); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function quotaLeft() {
    var q = {}; try { q = JSON.parse(lsGet(QUOTA_KEY) || '{}'); } catch (e) { q = {}; }
    return q.d === today() ? Math.max(0, DAILY_MAX - (q.n || 0)) : DAILY_MAX;
  }
  function useQuota() {
    var q = {}; try { q = JSON.parse(lsGet(QUOTA_KEY) || '{}'); } catch (e) { q = {}; }
    if (q.d !== today()) q = { d: today(), n: 0 };
    q.n = (q.n || 0) + 1; lsSet(QUOTA_KEY, JSON.stringify(q));
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'hidden') n.hidden = Boolean(attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(markup) { var s = document.createElement('span'); s.className = 'jcw-ico'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = markup; return s; }
  var ROBOT = '<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none"><line x1="16" y1="3.5" x2="16" y2="7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="3.2" r="2" fill="currentColor"/><rect x="5" y="8" width="22" height="17" rx="6" fill="currentColor" opacity=".18"/><rect x="5" y="8" width="22" height="17" rx="6" stroke="currentColor" stroke-width="2"/><circle cx="11.5" cy="15.5" r="2.3" fill="currentColor"/><circle cx="20.5" cy="15.5" r="2.3" fill="currentColor"/><path d="M12 20.5c2.4 1.6 5.6 1.6 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2.5 14v5M29.5 14v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var MINUS = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var RESET = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  var GRID = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/></svg>';

  // ---------- 必要になったときだけ読み込む ----------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }
  var jcaiPromise = null;
  function ensureJCAI() {
    if (window.JCAI) return Promise.resolve(window.JCAI);
    if (!jcaiPromise) {
      jcaiPromise = (window.JCONNECT_DATA_SOURCES ? Promise.resolve() : loadScript('/assets/js/data-sources.js'))
        .then(function () { return window.JCAI ? null : loadScript('/assets/js/jc-ai-tools.js?v=20261115c'); })
        .then(function () { return window.JCAI; })
        .catch(function () { jcaiPromise = null; return null; });
    }
    return jcaiPromise;
  }

  // ---------- 状態 ----------
  var log = loadLog();
  var root, launcher, panel, body, input, form, teaser, sendBtn, quotaNote;
  var busy = false;
  var history = [];
  log.forEach(function (m) { if (m.role === 'user' || m.role === 'ai') history.push({ role: m.role === 'ai' ? 'assistant' : 'user', text: String(m.text || '').slice(0, 1200) }); });

  function isArticlePage() { return !!document.querySelector('main .article-body'); }
  function pageTitle() { var h = document.querySelector('main h1'); return (h ? h.textContent : document.title).trim().replace(/\s+/g, ' '); }
  function pageText() {
    var b = document.querySelector('main .article-body'); if (!b) return '';
    var c = b.cloneNode(true);
    c.querySelectorAll('script,style,nav,.article-experience-invite,.letter-tool-cta').forEach(function (n) { n.remove(); });
    return (c.innerText || c.textContent || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 7000);
  }

  // ---------- 画面 ----------
  function build() {
    if (!document.querySelector('link[data-jcw-css]')) {
      var css = el('link', { rel: 'stylesheet', href: '/assets/css/jc-chat-widget.css?v=' + VERSION, 'data-jcw-css': '' });
      document.head.appendChild(css);
    }
    root = el('div', { class: 'jcw', id: 'jcChatWidget' });

    launcher = el('button', { type: 'button', class: 'jcw-launcher', 'aria-label': 'AIチャットを開く', 'aria-expanded': 'false', 'aria-controls': 'jcwPanel' });
    launcher.appendChild(svg(ROBOT));
    launcher.appendChild(el('span', { class: 'jcw-launcher-dot', 'aria-hidden': 'true' }));
    launcher.addEventListener('click', function () { setOpen(panel.hidden, true); });

    teaser = el('div', { class: 'jcw-teaser', hidden: true });
    var tOpen = el('button', { type: 'button', class: 'jcw-teaser-open' });
    tOpen.appendChild(el('strong', null, 'こんにちは！J-ConnectのAIです🤖'));
    tOpen.appendChild(el('span', null, 'ドイツ生活のこと、なんでも聞いてください'));
    tOpen.addEventListener('click', function () { setOpen(true, true); });
    var tClose = el('button', { type: 'button', class: 'jcw-teaser-close', 'aria-label': '閉じる' }, '×');
    tClose.addEventListener('click', function () { teaser.hidden = true; lsSet(STATE_KEY, 'min'); });
    teaser.appendChild(tOpen); teaser.appendChild(tClose);

    panel = el('section', { class: 'jcw-panel', id: 'jcwPanel', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'J-Connect AIアシスタント', hidden: true });
    var head = el('div', { class: 'jcw-head' });
    var av = el('span', { class: 'jcw-avatar' }); av.appendChild(svg(ROBOT));
    var ttl = el('div', { class: 'jcw-title' });
    ttl.appendChild(el('strong', null, 'J-Connect AIアシスタント'));
    ttl.appendChild(el('span', null, 'ドイツ生活の質問に、サイトの記事をもとに回答'));
    var hb = el('div', { class: 'jcw-head-btns' });
    var toolsLink = el('a', { class: 'jcw-head-link', href: TOOLS_URL });
    toolsLink.appendChild(svg(GRID)); toolsLink.appendChild(el('span', null, 'AIツール一覧'));
    var resetBtn = el('button', { type: 'button', class: 'jcw-icon-btn', 'aria-label': '新しい会話を始める', title: '新しい会話' });
    resetBtn.appendChild(svg(RESET));
    resetBtn.addEventListener('click', resetChat);
    var minBtn = el('button', { type: 'button', class: 'jcw-icon-btn', 'aria-label': '最小化する', title: '最小化' });
    minBtn.appendChild(svg(MINUS));
    minBtn.addEventListener('click', function () { setOpen(false, true); });
    hb.appendChild(toolsLink); hb.appendChild(resetBtn); hb.appendChild(minBtn);
    head.appendChild(av); head.appendChild(ttl); head.appendChild(hb);

    body = el('div', { class: 'jcw-body', 'aria-live': 'polite' });

    form = el('form', { class: 'jcw-form' });
    input = el('textarea', { class: 'jcw-input', rows: '1', maxlength: '1000', placeholder: '質問を入力（Enterで送信、Shift+Enterで改行）', 'aria-label': 'AIへの質問' });
    sendBtn = el('button', { type: 'submit', class: 'jcw-send', 'aria-label': '送信' });
    sendBtn.appendChild(svg(SEND));
    form.appendChild(input); form.appendChild(sendBtn);
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      e.preventDefault(); submit();
    });
    input.addEventListener('input', autosize);
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    var foot = el('p', { class: 'jcw-foot' });
    foot.appendChild(document.createTextNode('回答はAIによる参考情報です。大事なことは公式窓口でも確認してください（'));
    foot.appendChild(el('a', { href: '/germany/ja/privacy/#p5' }, 'プライバシー'));
    foot.appendChild(document.createTextNode('）'));
    quotaNote = el('p', { class: 'jcw-quota', hidden: true });

    panel.appendChild(head); panel.appendChild(body); panel.appendChild(form); panel.appendChild(quotaNote); panel.appendChild(foot);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false, true); launcher.focus(); } });

    root.appendChild(panel); root.appendChild(teaser); root.appendChild(launcher);
    document.body.appendChild(root);
    renderAll();
  }

  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 132) + 'px'; }

  function setOpen(open, byUser) {
    panel.hidden = !open;
    teaser.hidden = true;
    root.classList.toggle('is-open', open);
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    launcher.setAttribute('aria-label', open ? 'AIチャットを最小化する' : 'AIチャットを開く');
    if (byUser) lsSet(STATE_KEY, open ? 'open' : 'min');
    if (open) {
      scrollDown();
      if (byUser) setTimeout(function () { input.focus(); }, 60); // 自動で開いたときはフォーカスを奪わない
    }
  }

  function scrollDown() { if (body) body.scrollTop = body.scrollHeight; }

  // ---------- メッセージ ----------
  function renderProse(container, text) {
    String(text || '').split(/\n+/).forEach(function (line) {
      var t = line.trim(); if (!t) return;
      if (/^■/.test(t)) container.appendChild(el('p', { class: 'jcw-h' }, t.replace(/^■\s*/, '')));
      else if (/^[・\-•]/.test(t)) container.appendChild(el('p', { class: 'jcw-li' }, t.replace(/^[・\-•]\s*/, '')));
      else container.appendChild(el('p', null, t));
    });
  }
  function localLink(url) { return String(url || '').replace(/^https:\/\/j-connect-global\.com/, ''); }

  function aiRow() {
    var row = el('div', { class: 'jcw-row jcw-row-ai' });
    var av = el('span', { class: 'jcw-mini-av' }); av.appendChild(svg(ROBOT));
    var b = el('div', { class: 'jcw-msg jcw-msg-ai' });
    row.appendChild(av); row.appendChild(b);
    return { row: row, bubble: b };
  }

  function renderGreeting() {
    var r = aiRow();
    r.bubble.appendChild(el('p', { class: 'jcw-hello' }, 'こんにちは！J-ConnectのAIアシスタントです🤖'));
    r.bubble.appendChild(el('p', null, 'ドイツでの手続き・生活・ドイツ語のことなど、なんでも気軽に聞いてください。J-Connectの記事をもとにお答えします。'));
    var tl = el('a', { class: 'jcw-tools-btn', href: TOOLS_URL });
    tl.appendChild(svg(GRID)); tl.appendChild(el('span', null, 'AIツール一覧を見る（6種類・無料）'));
    r.bubble.appendChild(tl);
    var grid = el('div', { class: 'jcw-tools' });
    TOOLS.forEach(function (t) {
      var a = el('a', { class: 'jcw-tool', href: t.url });
      a.appendChild(el('span', { class: 'jcw-tool-ico', 'aria-hidden': 'true' }, t.icon));
      a.appendChild(el('span', null, t.name));
      grid.appendChild(a);
    });
    r.bubble.appendChild(grid);
    body.appendChild(r.row);

    var chips = el('div', { class: 'jcw-chips', role: 'group', 'aria-label': 'よくある質問' });
    var list = (isArticlePage() ? ['このページを3行で要約して', 'このページで一番大事なポイントは？'] : []).concat(GENERAL_CHIPS);
    list.forEach(function (q) {
      var c = el('button', { type: 'button', class: 'jcw-chip' }, q);
      c.addEventListener('click', function () { ask(q); });
      chips.appendChild(c);
    });
    body.appendChild(chips);
  }

  function renderUser(text) {
    var row = el('div', { class: 'jcw-row jcw-row-user' });
    row.appendChild(el('div', { class: 'jcw-msg jcw-msg-user' }, text));
    body.appendChild(row);
  }

  function toolSuggestion(text) {
    for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].re && TOOLS[i].re.test(text)) return TOOLS[i];
    return null;
  }

  function renderAi(m) {
    var r = aiRow();
    var prose = el('div', { class: 'jcw-prose' });
    renderProse(prose, m.text);
    r.bubble.appendChild(prose);
    if (m.sources && m.sources.length) {
      var box = el('div', { class: 'jcw-sources' });
      box.appendChild(el('p', { class: 'jcw-sources-h' }, m.basis ? '根拠にした記事' : '関連する記事'));
      m.sources.slice(0, 4).forEach(function (s) { box.appendChild(el('a', { href: localLink(s.url) }, s.title || s.url)); });
      r.bubble.appendChild(box);
    }
    if (m.low) r.bubble.appendChild(el('p', { class: 'jcw-note' }, '※ J-Connectの記事では十分に確認できなかった内容を含みます。公式窓口でも確認してください。'));
    if (m.tool) {
      var t = TOOLS.filter(function (x) { return x.url === m.tool; })[0];
      if (t) {
        var card = el('a', { class: 'jcw-toolcard', href: t.url });
        card.appendChild(el('span', { class: 'jcw-tool-ico', 'aria-hidden': 'true' }, t.icon));
        var tx = el('span'); tx.appendChild(el('strong', null, t.name)); tx.appendChild(el('span', null, 'このツールが便利です →'));
        card.appendChild(tx);
        r.bubble.appendChild(card);
      }
    }
    if (m.copyable !== false && m.text && !m.local) {
      var copy = el('button', { type: 'button', class: 'jcw-copy' }, 'コピー');
      copy.addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(m.text).then(function () { copy.textContent = 'コピーしました'; setTimeout(function () { copy.textContent = 'コピー'; }, 1800); });
      });
      r.bubble.appendChild(copy);
    }
    body.appendChild(r.row);
    if (m.follow && m.follow.length) {
      var chips = el('div', { class: 'jcw-chips' });
      m.follow.slice(0, 3).forEach(function (q) {
        var c = el('button', { type: 'button', class: 'jcw-chip' }, q);
        c.addEventListener('click', function () { ask(q); });
        chips.appendChild(c);
      });
      body.appendChild(chips);
    }
  }

  function renderAll() {
    body.textContent = '';
    renderGreeting();
    log.forEach(function (m) { if (m.role === 'user') renderUser(m.text); else renderAi(m); });
    updateQuota();
  }

  function updateQuota() {
    var left = quotaLeft();
    quotaNote.hidden = left > 5;
    quotaNote.textContent = left ? '今日あと ' + left + ' 回質問できます。' : '今日の質問の上限に達しました。明日またご利用ください。AIツール一覧のツールは引き続き使えます。';
  }

  function resetChat() {
    log = []; history = []; saveLog(); renderAll(); input.focus();
  }

  function push(m) { log.push(m); saveLog(); }

  // よくある依頼は、AIを呼ばずにツールを案内する
  function localAnswer(q) {
    if (q === 'ドイツ語の手紙が届いた') {
      return { role: 'ai', local: true, text: '届いた手紙を写真かPDFでアップロードすると、AIが日本語で「何の手紙か・期限・やること」を解説します。名前や住所は塗りつぶしてから使ってください。', tool: '/germany/ja/tools/letter-explainer/', follow: ['督促状（Mahnung）が届いたらどうする？', '役所からの手紙を無視するとどうなる？'] };
    }
    if (q === 'ドイツ語を練習したい') {
      return { role: 'ai', local: true, text: '病院・役所・大家さんとの電話などの場面を選んで、AIを相手に会話の練習ができます。言い方の添削と、音声の読み上げ付きです。単語やフレーズは「ドイツ語を学ぶ」のページもどうぞ。', tool: '/germany/ja/tools/conversation/', sources: [{ title: 'ドイツ語を学ぶ（J-Connect）', url: '/germany/ja/learn-german/' }], follow: ['病院で使うドイツ語を教えて'] };
    }
    return null;
  }

  function typingRow() {
    var r = aiRow();
    r.row.classList.add('jcw-typing');
    r.bubble.setAttribute('aria-label', '回答を作成中');
    for (var i = 0; i < 3; i++) r.bubble.appendChild(el('span', { class: 'jcw-dot' }));
    body.appendChild(r.row); scrollDown();
    return r.row;
  }

  function ask(q) { input.value = q; submit(); }

  function askConsent(q) {
    var r = aiRow();
    r.row.classList.add('jcw-consent');
    r.bubble.appendChild(el('p', { class: 'jcw-h' }, 'はじめに確認させてください'));
    var p = el('p');
    p.appendChild(document.createTextNode('質問の内容は、回答を作るためにAI事業者（OpenAI、米国）へ送られます。J-Connectには保存しません。名前・住所・番号などの個人情報は入れないでください（'));
    p.appendChild(el('a', { href: '/germany/ja/privacy/#p5' }, 'プライバシーポリシー'));
    p.appendChild(document.createTextNode('）。'));
    r.bubble.appendChild(p);
    var ok = el('button', { type: 'button', class: 'jcw-tools-btn jcw-consent-btn' }, '同意して送信');
    ok.addEventListener('click', function () {
      lsSet(CONSENT_KEY, 'yes');
      r.row.remove();
      sendToAi(q);
    });
    r.bubble.appendChild(ok);
    body.appendChild(r.row); scrollDown();
    ok.focus();
  }

  async function submit() {
    var q = input.value.trim();
    if (!q || busy) return;
    if (q.length < 3) { q = q + '？'; }
    input.value = ''; autosize();
    renderUser(q); push({ role: 'user', text: q }); scrollDown();

    var local = localAnswer(q);
    if (local) { renderAi(local); push(local); scrollDown(); return; }
    if (lsGet(CONSENT_KEY) !== 'yes') { body.querySelectorAll('.jcw-consent').forEach(function (n) { n.remove(); }); askConsent(q); return; }
    sendToAi(q);
  }

  async function sendToAi(q) {
    if (busy) return;

    if (!quotaLeft()) {
      var m0 = { role: 'ai', local: true, text: '今日の質問の上限（' + DAILY_MAX + '回）に達しました。明日またご利用ください。AIツール一覧のツールは引き続き使えます。' };
      renderAi(m0); push(m0); updateQuota(); scrollDown(); return;
    }

    busy = true; sendBtn.disabled = true;
    var typing = typingRow();
    var result = null, found = [];
    try {
      var J = await ensureJCAI();
      if (!J) throw new Error('load');
      var sources = [];
      var aboutPage = /このページ|この記事/.test(q) && isArticlePage();
      if (aboutPage) sources.push({ title: pageTitle(), url: location.pathname, text: pageText() });
      var recent = history.slice(-2).map(function (h) { return h.role === 'user' ? h.text : ''; }).join(' ');
      found = await J.searchArticles(q + ' ' + recent, aboutPage ? 2 : 3);
      found = found.filter(function (f) { return f.url !== location.pathname; });
      for (var i = 0; i < found.length; i++) {
        sources.push({ title: found[i].title, url: found[i].url, text: await J.articleText(found[i].url, aboutPage ? 3000 : 6000) });
      }
      useQuota();
      result = await J.post('chat', { question: q, sources: sources, history: history.slice(-6) });
    } catch (e) {
      result = { ok: false, error: '読み込みに失敗しました。ページを再読み込みしてお試しください。' };
    }
    typing.remove();
    busy = false; sendBtn.disabled = false;
    var m;
    if (!result || !result.ok) {
      m = { role: 'ai', local: true, text: (result && result.error) || '回答を作れませんでした。時間をおいて再度お試しください。', tool: toolSuggestion(q) ? toolSuggestion(q).url : null };
    } else {
      var r = result.result || {};
      var basis = r.sources && r.sources.length;
      var tool = toolSuggestion(q);
      m = {
        role: 'ai', text: r.answer || '', basis: !!basis,
        sources: basis ? r.sources : found.map(function (f) { return { title: f.title, url: f.url }; }),
        follow: r.follow_ups || [], low: r.confidence === 'low', tool: tool ? tool.url : null
      };
      history.push({ role: 'user', text: q }, { role: 'assistant', text: String(m.text).slice(0, 1200) });
      history = history.slice(-12);
    }
    renderAi(m); push(m); updateQuota();
    // 回答の先頭が見えるようにスクロール
    var rows = body.querySelectorAll('.jcw-row-ai');
    var last = rows[rows.length - 1];
    if (last) body.scrollTop = Math.max(0, last.offsetTop - 12);
  }

  // ---------- 起動 ----------
  function cookieBannerVisible() {
    var b = document.getElementById('cookie-banner');
    if (!b) return false;
    var s = window.getComputedStyle(b);
    return s.display !== 'none' && s.visibility !== 'hidden' && b.getClientRects().length > 0;
  }

  function start() {
    if (document.getElementById('jcChatWidget')) return;
    build();
    var state = lsGet(STATE_KEY);
    var wide = window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
    if (state === 'open') { setOpen(true, false); return; }
    if (state === 'min') return;
    // 操作ボタンが多いページ（暗記カード・AIツール・投稿フォームなど）では自動で開かない
    if (/\/learn-german\/flashcards\/|\/tools\/.|\/community\/(post|contact|report|manage|delete|complete)|\/contact\//.test(location.pathname)) return;
    // 初めての訪問：Cookieの案内が閉じられてから表示する
    var tries = 0;
    (function waitBanner() {
      if (cookieBannerVisible() && tries++ < 120) { setTimeout(waitBanner, 800); return; }
      if (lsGet(STATE_KEY)) return;
      if (wide) setOpen(true, false);
      else teaser.hidden = false; // スマホは画面をふさがない小さな吹き出しだけ
    })();
  }

  start();
})(window, document);
