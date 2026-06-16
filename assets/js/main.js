document.addEventListener('DOMContentLoaded', function () {
  var languageMenus = Array.prototype.slice.call(document.querySelectorAll('.header-language-menu'));

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
    var livingCards = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-card]'));
    var livingFilterButtons = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-filter]'));
    var activeLivingFilter = 'all';
    var livingFilterMap = {
      housing: ['住まい', '賃貸', '家探し', '住所変更', '契約'],
      procedure: ['手続き', '行政手続き', '住民登録', 'Anmeldung', 'Tax ID', 'Rundfunkbeitrag'],
      medical: ['医療', '保険', '健康保険', '妊娠', '出産'],
      money: ['お金', '銀行', '銀行口座', '税金', 'SCHUFA', '信用情報'],
      moving: ['引っ越し', '住所変更'],
      arrival: ['初渡独', '到着', '最初の30日', '住民登録', '銀行口座', '健康保険']
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
    }

    livingFilterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        activeLivingFilter = button.getAttribute('data-living-filter') || 'all';
        livingFilterButtons.forEach(function (item) {
          var isActive = item === button;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        updateLivingHub();
      });
    });

    if (livingSearch) livingSearch.addEventListener('input', updateLivingHub);
    if (livingSort) livingSort.addEventListener('change', updateLivingHub);
    updateLivingHub();
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
