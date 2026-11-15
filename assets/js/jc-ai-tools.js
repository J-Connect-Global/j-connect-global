/* J-Connect AIツール共通スクリプト
 * - AI API（Apps Script）への送信
 * - サイト内記事の検索と本文取得（Q&A・手続きナビで使う）
 * - フィードバック欄（既存のお問い合わせ窓口に送信）
 * AIの出力は必ず textContent で表示し、HTML として解釈しない。
 */
(function (window, document) {
  'use strict';

  var sources = window.JCONNECT_DATA_SOURCES || {};
  var ENDPOINT = sources.letterExplainerEndpoint || '';
  var CONTACT_ENDPOINT = sources.directoryDataEndpoint || '';
  var pageStartedAt = Date.now();

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'class') node.className = attrs[key];
      else if (key === 'hidden') node.hidden = Boolean(attrs[key]);
      else node.setAttribute(key, attrs[key]);
    });
    if (text != null) node.textContent = text;
    return node;
  }

  function status(box, kind, message) {
    if (!box) return;
    box.className = message ? 'status-box show status-' + kind : 'status-box';
    box.textContent = message || '';
  }

  async function post(action, fields) {
    if (!ENDPOINT) return { ok: false, error: 'この機能は現在準備中です。' };
    var data = new FormData();
    data.append('action', action);
    data.append('consent', 'yes');
    data.append('website', '');
    data.append('form_started_at', String(Math.min(pageStartedAt, Date.now() - 3000)));
    Object.keys(fields || {}).forEach(function (key) {
      var value = fields[key];
      data.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    try {
      var response = await fetch(ENDPOINT, { method: 'POST', body: data });
      return await response.json().catch(function () { return { ok: false, error: '応答を読み取れませんでした。' }; });
    } catch (error) {
      return { ok: false, error: '通信エラーが発生しました。時間をおいて再度お試しください。' };
    }
  }

  // ---------- サイト内記事の検索（検索ページと同じ考え方の簡易版） ----------
  var indexPromise = null;
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFKC').toLocaleLowerCase('ja-JP').trim();
  }
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = Promise.all([
        fetch('/assets/data/search-index.json').then(function (r) { return r.ok ? r.json() : []; }),
        fetch('/assets/data/search-synonyms.json').then(function (r) { return r.ok ? r.json() : { groups: [] }; }).catch(function () { return { groups: [] }; })
      ]).then(function (res) {
        return {
          items: (Array.isArray(res[0]) ? res[0] : []).filter(function (i) { return /^\/germany\/ja\/(living|learn-german|events)\//.test(i.url || ''); }),
          groups: ((res[1] && res[1].groups) || []).map(function (g) { return g.map(normalize); })
        };
      }).catch(function () { indexPromise = null; return { items: [], groups: [] }; });
    }
    return indexPromise;
  }
  function variantsFor(term, groups) {
    var out = [term];
    groups.forEach(function (group) {
      if (group.some(function (w) { return w === term || (term.length >= 2 && w.length >= 2 && (term.indexOf(w) !== -1 || w.indexOf(term) !== -1)); })) {
        group.forEach(function (w) { if (out.indexOf(w) === -1) out.push(w); });
      }
    });
    return out;
  }
  // 日本語は空白で区切られないので、2〜4文字の部分文字列も手がかりにする
  function termsFor(query) {
    var q = normalize(query);
    var terms = q.split(/[\s　、。,.!?？！「」（）()・]+/).filter(function (t) { return t.length >= 2; });
    var extra = [];
    terms.forEach(function (t) {
      if (/^[぀-ヿ一-鿿]+$/.test(t) && t.length > 4) {
        for (var n = 4; n >= 2; n--) for (var i = 0; i + n <= t.length; i++) extra.push(t.slice(i, i + n));
      }
    });
    return terms.concat(extra).filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 40);
  }
  async function searchArticles(query, limit) {
    var data = await loadIndex();
    var terms = termsFor(query);
    if (!terms.length) return [];
    return data.items.map(function (item) {
      var title = normalize(item.title);
      var text = normalize([item.title, item.description, (item.tags || []).join(' '), (item.headings || []).join(' ')].join(' '));
      var score = 0;
      terms.forEach(function (term) {
        var best = 0;
        variantsFor(term, data.groups).forEach(function (w, idx) {
          if (text.indexOf(w) === -1) return;
          var s = (title.indexOf(w) !== -1 ? 10 : 4) * Math.min(w.length, 6) / 3;
          if (idx > 0) s *= 0.8;
          best = Math.max(best, s);
        });
        score += best;
      });
      return { item: item, score: score };
    }).filter(function (x) { return x.score > 4; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 5)
      .map(function (x) { return x.item; });
  }
  async function articleText(url, maxChars) {
    try {
      var html = await fetch(url).then(function (r) { return r.ok ? r.text() : ''; });
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var body = doc.querySelector('.article-body') || doc.querySelector('main');
      if (!body) return '';
      body.querySelectorAll('script,style,nav,.article-experience-invite,.letter-tool-cta').forEach(function (n) { n.remove(); });
      return (body.innerText || body.textContent || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars || 7000);
    } catch (e) { return ''; }
  }

  // ---------- ファイル（画像は端末内で縮小し EXIF を落とす） ----------
  function imageToJpegBase64(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 2000 / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(file);
    });
  }
  async function fileFields(file) {
    if (!file) return { error: 'ファイルを選んでください。' };
    if (file.type === 'application/pdf') {
      if (file.size > 5 * 1024 * 1024) return { error: 'PDFが大きすぎます（約5MBまで）。' };
      return { mode: 'file', media_type: 'application/pdf', data: await fileToBase64(file) };
    }
    if (/^image\//.test(file.type)) return { mode: 'file', media_type: 'image/jpeg', data: await imageToJpegBase64(file) };
    return { error: 'JPEG / PNG / WebP 画像か PDF を選んでください。' };
  }

  function copy(text, box) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () { status(box, 'success', 'コピーしました。'); });
  }

  function reveal(section) {
    section.hidden = false;
    section.classList.add('is-entering');
    requestAnimationFrame(function () { requestAnimationFrame(function () { section.classList.remove('is-entering'); }); });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 120);
  }

  // ---------- フィードバック欄 ----------
  function feedback(container, toolName, getContext) {
    var wrap = el('div', { class: 'jcai-feedback' });
    wrap.appendChild(el('h3', null, 'この回答は役に立ちましたか？'));
    wrap.appendChild(el('p', { class: 'jcai-feedback-lead' }, '「本当はこれが知りたかった」という声をもとに、AIの回答を改善しています。ひと言でも大歓迎です。'));
    var buttons = el('div', { class: 'jcai-feedback-buttons' });
    var good = el('button', { type: 'button', class: 'jcai-fb-btn', 'aria-pressed': 'false' }, '役に立った');
    var bad = el('button', { type: 'button', class: 'jcai-fb-btn', 'aria-pressed': 'false' }, '物足りなかった');
    buttons.appendChild(good); buttons.appendChild(bad);
    wrap.appendChild(buttons);
    var form = el('form', { class: 'jcai-feedback-form', hidden: true, novalidate: 'novalidate' });
    var wantedLabel = el('label', null, '本当はどんな回答が欲しかったですか？');
    var wanted = el('textarea', { maxlength: '3000', placeholder: '例：手順をもっと具体的に知りたかった／この場合の書き方が知りたかった' });
    var emailLabel = el('label', null, '返信が欲しい場合のメールアドレス（任意・受付確認メールが届きます）');
    var email = el('input', { type: 'email', class: 'input', maxlength: '254', placeholder: 'example@email.com' });
    var include = el('input', { type: 'checkbox' });
    var includeLabel = el('label', { class: 'jcai-check' });
    includeLabel.appendChild(include);
    includeLabel.appendChild(el('span', null, '改善のため、AIの回答と入力内容も一緒に送る（ファイルの画像・本文は送られません）'));
    var submit = el('button', { type: 'submit', class: 'submit' }, 'フィードバックを送る');
    var box = el('div', { class: 'status-box', 'aria-live': 'polite' });
    [wantedLabel, wanted, emailLabel, email, includeLabel, submit].forEach(function (n) { form.appendChild(n); });
    wrap.appendChild(form);
    wrap.appendChild(box);
    var rating = '';
    var openedAt = Date.now();
    [good, bad].forEach(function (btn) {
      btn.addEventListener('click', function () {
        rating = btn === good ? '役に立った' : '物足りなかった';
        good.setAttribute('aria-pressed', String(btn === good));
        bad.setAttribute('aria-pressed', String(btn === bad));
        wantedLabel.textContent = btn === good ? 'さらに知りたかったことがあれば教えてください（任意）' : '本当はどんな回答が欲しかったですか？';
        form.hidden = false;
        openedAt = Date.now();
        status(box, '', '');
        wanted.focus();
      });
    });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var text = wanted.value.trim();
      if (rating === '物足りなかった' && !text) { status(box, 'error', '「本当はどんな回答が欲しかったか」を書いてください。'); return; }
      var parts = ['ツール: ' + toolName, '評価: ' + rating, '', '■ 欲しかった回答・ご意見', text || '（記入なし）', '', '■ 返信先: ' + (email.value.trim() || '希望なし')];
      if (include.checked && getContext) parts.push('', '■ 入力とAIの回答（利用者が添付に同意）', JSON.stringify(getContext(), null, 1));
      var message = parts.join('\n');
      if (message.length > 5900) message = message.slice(0, 5880) + '\n…（省略）';
      var data = new FormData();
      data.append('action', 'submitContact');
      data.append('website', '');
      data.append('form_started_at', String(Math.min(openedAt, Date.now() - 3000)));
      data.append('name', toolName + 'の利用者');
      data.append('email', email.value.trim() || 'contact@j-connect-global.com');
      data.append('inquiry_type', 'AIツールへのフィードバック');
      data.append('subject', toolName + 'フィードバック（' + rating + '）');
      data.append('page_url', window.location.href.split('?')[0]);
      data.append('message', message);
      submit.disabled = true;
      submit.textContent = '送信中…';
      try {
        var res = await fetch(CONTACT_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        var payload = await res.json().catch(function () { return {}; });
        if (payload.ok) { form.reset(); form.hidden = true; status(box, 'success', 'フィードバックを送りました。ありがとうございます。今後の改善に使わせていただきます。'); }
        else status(box, 'error', payload.error || '送信できませんでした。時間をおいて再度お試しください。');
      } catch (e) {
        status(box, 'error', '通信エラーが発生しました。時間をおいて再度お試しください。');
      } finally {
        submit.disabled = false;
        submit.textContent = 'フィードバックを送る';
      }
    });
    container.appendChild(wrap);
    return {
      reset: function () { rating = ''; form.reset(); form.hidden = true; status(box, '', ''); good.setAttribute('aria-pressed', 'false'); bad.setAttribute('aria-pressed', 'false'); }
    };
  }

  // AIの文章（■見出し・・箇条書き・改行）を安全にブロックへ分けて表示する
  function renderProse(container, text) {
    container.textContent = '';
    String(text || '').split(/\n+/).forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      if (/^■/.test(t)) container.appendChild(el('h4', { class: 'jcai-prose-h' }, t.replace(/^■\s*/, '')));
      else if (/^[・\-•]/.test(t)) container.appendChild(el('p', { class: 'jcai-prose-li' }, t.replace(/^[・\-•]\s*/, '')));
      else container.appendChild(el('p', null, t));
    });
  }

  window.JCAI = {
    ready: Boolean(ENDPOINT),
    el: el, status: status, post: post, copy: copy, reveal: reveal,
    searchArticles: searchArticles, articleText: articleText, loadIndex: loadIndex,
    fileFields: fileFields, feedback: feedback, renderProse: renderProse
  };
})(window, document);
