document.addEventListener('DOMContentLoaded', function () {
  var categoryMenus = Array.prototype.slice.call(document.querySelectorAll('.header-category-menu'));
  var languageMenus = Array.prototype.slice.call(document.querySelectorAll('.header-language-menu'));
  var desktopCategoryQuery = window.matchMedia ? window.matchMedia('(min-width: 921px)') : null;

  function isDesktopCategoryMenu() {
    return desktopCategoryQuery ? desktopCategoryQuery.matches : true;
  }

  if (categoryMenus.length) {
    categoryMenus.forEach(function (menu) {
      menu.addEventListener('mouseenter', function () {
        if (isDesktopCategoryMenu()) menu.setAttribute('open', '');
      });

      menu.addEventListener('mouseleave', function () {
        if (isDesktopCategoryMenu()) menu.removeAttribute('open');
      });

      menu.addEventListener('focusin', function () {
        if (isDesktopCategoryMenu()) menu.setAttribute('open', '');
      });

      menu.addEventListener('focusout', function (event) {
        if (isDesktopCategoryMenu() && !menu.contains(event.relatedTarget)) {
          menu.removeAttribute('open');
        }
      });
    });

    document.addEventListener('click', function (event) {
      categoryMenus.forEach(function (menu) {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      categoryMenus.forEach(function (menu) {
        menu.removeAttribute('open');
      });
    });
  }

  if (languageMenus.length) {
    document.addEventListener('click', function (event) {
      languageMenus.forEach(function (menu) {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      languageMenus.forEach(function (menu) {
        menu.removeAttribute('open');
      });
    });
  }

  var livingHub = document.querySelector('[data-living-hub]');
  if (livingHub) {
    var livingSearch = livingHub.querySelector('[data-living-search]');
    var livingSort = livingHub.querySelector('[data-living-sort]');
    var livingGrid = livingHub.querySelector('.jc-article-grid');
    var livingEmpty = livingHub.querySelector('[data-living-empty]');
    var livingCount = livingHub.querySelector('[data-living-count]');
    var livingReset = livingHub.querySelector('[data-living-reset]');
    var livingCards = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-card]'));
    var livingFilterButtons = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-filter]'));
    var activeLivingFilter = 'all';
    var livingFilterMap = {
      housing: ['住まい', '賃貸', '家探し', '住所変更', '契約'],
      procedure: ['手続き', '行政手続き', '住民登録', 'Anmeldung', 'Tax ID', 'Rundfunkbeitrag'],
      medical: ['医療', '保険', '健康保険', '妊娠', '出産'],
      money: ['お金', '銀行', '銀行口座', '税金', 'SCHUFA', '信用情報'],
      moving: ['引っ越し', '住所変更'],
      arrival: ['初渡独', '到着', '最初の30日', '住民登録', '銀行口座', '健康保険'],
      family: ['家族', '子育て', 'Kita', '保育', '妊娠', '出産'],
      contract: ['契約', 'SCHUFA', '信用情報', '賃貸', 'Rundfunkbeitrag']
    };

    function livingCardText(card) {
      return [
        card.dataset.search,
        card.dataset.title,
        card.dataset.summary,
        card.dataset.category,
        card.dataset.tags
      ].join(' ').toLowerCase();
    }

    function livingFilterText(card) {
      return [
        card.dataset.category,
        card.dataset.tags
      ].join(' ').toLowerCase();
    }

    function livingMatchesFilter(card) {
      if (activeLivingFilter === 'all') return true;
      var terms = livingFilterMap[activeLivingFilter] || [activeLivingFilter];
      var text = livingFilterText(card);
      return terms.some(function (term) {
        return text.indexOf(String(term).toLowerCase()) !== -1;
      });
    }

    function livingCompareCards(a, b) {
      var sortValue = livingSort ? livingSort.value : 'newest';

      if (sortValue === 'title') {
        return (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
      }

      var field = sortValue === 'reviewed' ? 'reviewed' : 'published';
      return String(b.dataset[field] || '').localeCompare(String(a.dataset[field] || ''))
        || (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
    }

    function updateLivingHub() {
      var query = livingSearch ? livingSearch.value.trim().toLowerCase() : '';
      var visibleCount = 0;

      livingCards.sort(livingCompareCards).forEach(function (card) {
        if (livingGrid) livingGrid.appendChild(card);

        var matchesSearch = !query || livingCardText(card).indexOf(query) !== -1;
        var isVisible = matchesSearch && livingMatchesFilter(card);
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (livingEmpty) livingEmpty.hidden = visibleCount !== 0;
      if (livingCount) livingCount.textContent = visibleCount + '件の記事を表示中';
    }

    function setLivingFilter(filterValue) {
      activeLivingFilter = filterValue || 'all';
      livingFilterButtons.forEach(function (item) {
        var isActive = (item.getAttribute('data-living-filter') || 'all') === activeLivingFilter;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    livingFilterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setLivingFilter(button.getAttribute('data-living-filter') || 'all');
        updateLivingHub();
      });
    });

    if (livingSearch) livingSearch.addEventListener('input', updateLivingHub);
    if (livingSort) livingSort.addEventListener('change', updateLivingHub);
    if (livingReset) {
      livingReset.addEventListener('click', function () {
        if (livingSearch) livingSearch.value = '';
        if (livingSort) livingSort.value = 'newest';
        setLivingFilter('all');
        updateLivingHub();
      });
    }
    updateLivingHub();
  }

  var eventsHub = document.querySelector('[data-events-hub]');
  if (eventsHub && eventsHub.querySelector('[data-events-search], [data-events-filter]')) {
    var eventsSearch = eventsHub.querySelector('[data-events-search]');
    var eventsSort = eventsHub.querySelector('[data-events-sort]');
    var eventsGrid = eventsHub.querySelector('#eventArticleGrid');
    var eventsEmpty = eventsHub.querySelector('[data-events-empty]');
    var eventsCards = Array.prototype.slice.call(eventsHub.querySelectorAll('[data-events-card]'));
    var eventsFilterButtons = Array.prototype.slice.call(eventsHub.querySelectorAll('[data-events-filter]'));
    var activeEventsFilter = 'all';
    var eventsFilterMap = {
      culture: ['日本文化', '文化', '映画'],
      seasonal: ['季節', '冬', 'クリスマス'],
      family: ['家族', '家族向け', '子連れ'],
      weekend: ['週末', 'おでかけ', 'マーケット'],
      nrw: ['NRW'],
      duesseldorf: ['Düsseldorf']
    };

    function eventsCardText(card) {
      return [
        card.dataset.search,
        card.dataset.title,
        card.dataset.summary,
        card.dataset.category,
        card.dataset.location,
        card.dataset.tags
      ].join(' ').toLowerCase();
    }

    function eventsFilterText(card) {
      return [
        card.dataset.filter,
        card.dataset.category,
        card.dataset.location,
        card.dataset.tags
      ].join(' ').toLowerCase();
    }

    function eventsMatchesFilter(card) {
      if (activeEventsFilter === 'all') return true;
      var terms = eventsFilterMap[activeEventsFilter] || [activeEventsFilter];
      var text = eventsFilterText(card);
      return terms.some(function (term) {
        return text.indexOf(String(term).toLowerCase()) !== -1;
      });
    }

    function eventsCompareCards(a, b) {
      var sortValue = eventsSort ? eventsSort.value : 'newest';

      if (sortValue === 'title') {
        return (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
      }

      if (sortValue === 'location') {
        return (a.dataset.location || '').localeCompare(b.dataset.location || '', 'ja')
          || (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
      }

      return String(b.dataset.published || '').localeCompare(String(a.dataset.published || ''))
        || (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
    }

    function updateEventsHub() {
      var query = eventsSearch ? eventsSearch.value.trim().toLowerCase() : '';
      var visibleCount = 0;

      eventsCards.sort(eventsCompareCards).forEach(function (card) {
        if (eventsGrid) eventsGrid.appendChild(card);

        var matchesSearch = !query || eventsCardText(card).indexOf(query) !== -1;
        var isVisible = matchesSearch && eventsMatchesFilter(card);
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (eventsEmpty) eventsEmpty.hidden = visibleCount !== 0;
    }

    eventsFilterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        activeEventsFilter = button.getAttribute('data-events-filter') || 'all';
        eventsFilterButtons.forEach(function (item) {
          var isActive = item === button;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        updateEventsHub();
      });
    });

    if (eventsSearch) eventsSearch.addEventListener('input', updateEventsHub);
    if (eventsSort) eventsSort.addEventListener('change', updateEventsHub);
    updateEventsHub();
  }

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.article-sidebar-toc a[href^="#"]'));
  if (!tocLinks.length) return;

  var linksById = tocLinks.reduce(function (map, link) {
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (id) map[id] = link;
    return map;
  }, {});

  var headings = Object.keys(linksById)
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!headings.length) return;

  function setActiveLink(id) {
    tocLinks.forEach(function (link) {
      link.classList.toggle('is-active', link === linksById[id]);
    });
  }

  var ticking = false;

  function updateActiveLink() {
    var activeId = headings[0].id;
    var offset = 130;

    headings.forEach(function (heading) {
      if (heading.getBoundingClientRect().top <= offset) {
        activeId = heading.id;
      }
    });

    setActiveLink(activeId);
    ticking = false;
  }

  function requestActiveLinkUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateActiveLink);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(requestActiveLinkUpdate, {
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0
    });

    headings.forEach(function (heading) {
      observer.observe(heading);
    });
  }

  window.addEventListener('scroll', requestActiveLinkUpdate, { passive: true });
  window.addEventListener('resize', requestActiveLinkUpdate);
  updateActiveLink();
});
