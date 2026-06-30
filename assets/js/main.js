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

  function initializeSectionGuide(guideSelector) {
    var guideLinks = Array.prototype.slice.call(document.querySelectorAll(guideSelector));
    if (!guideLinks.length || !('IntersectionObserver' in window)) return;

    var linkById = new Map(guideLinks.map(function (link) {
      var href = link.getAttribute('href') || '';
      return [href.charAt(0) === '#' ? href.slice(1) : '', link];
    }).filter(function (entry) {
      return entry[0];
    }));
    var sections = Array.from(linkById.keys()).map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);
    if (!sections.length) return;

    function setActiveGuideLink(id) {
      guideLinks.forEach(function (link) {
        link.classList.toggle('is-active', link === linkById.get(id));
      });
    }

    function updateActiveGuideLink() {
      var activationLine = window.innerHeight * 0.45;
      var current = sections[0];

      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= activationLine) {
          current = section;
        }
      });

      setActiveGuideLink(current.id);
    }

    var observer = new IntersectionObserver(function () {
      updateActiveGuideLink();
    }, {
      rootMargin: '-20% 0px -55% 0px',
      threshold: [0.1, 0.35, 0.6]
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
    window.addEventListener('scroll', updateActiveGuideLink, { passive: true });
    window.addEventListener('resize', updateActiveGuideLink);
    updateActiveGuideLink();
  }

  initializeSectionGuide('.living-page-guide a');

  var livingHub = document.querySelector('[data-living-hub]');
  if (livingHub) {
    var livingSearch = livingHub.querySelector('[data-living-search]');
    var livingCategory = livingHub.querySelector('[data-living-category]');
    var livingTag = livingHub.querySelector('[data-living-tag]');
    var livingCategoryWrap = livingHub.querySelector('[data-living-category-wrap]');
    var livingTagWrap = livingHub.querySelector('[data-living-tag-wrap]');
    var livingGrid = livingHub.querySelector('[data-living-results]');
    var livingEmpty = livingHub.querySelector('[data-living-empty]');
    var livingSavedEmpty = livingHub.querySelector('[data-living-saved-empty]');
    var livingCount = livingHub.querySelector('[data-living-count]');
    var livingReset = livingHub.querySelector('[data-living-reset]');
    var livingCards = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-card]'));
    var livingSortButtons = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-sort]'));
    var livingViewButtons = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-view]'));
    var livingSavedFilter = livingHub.querySelector('[data-living-saved-filter]');
    var livingSaveButtons = Array.prototype.slice.call(livingHub.querySelectorAll('[data-living-save]'));
    var livingSavedKey = 'jconnectLivingSavedArticles';
    var livingViewKey = 'jconnectLivingColumnView';
    var livingSortOrder = 'newest';
    var livingSavedOnly = false;
    var savedLivingArticles = loadLivingSavedArticles();

    livingCards.forEach(function (card, index) {
      card.dataset.originalOrder = String(index);
    });

    function livingSplitValues(value) {
      return String(value || '').split(/\s+/).map(function (item) {
        return item.trim();
      }).filter(Boolean);
    }

    function livingUnique(values) {
      var seen = {};
      return values.filter(function (value) {
        var key = String(value || '').trim();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      }).sort(function (a, b) {
        return a.localeCompare(b, 'ja');
      });
    }

    function addLivingOptions(select, values) {
      if (!select) return;
      values.forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }

    function setupLivingFilters() {
      var categories = livingUnique(livingCards.map(function (card) {
        return card.dataset.category;
      }));
      var tags = livingUnique(livingCards.reduce(function (items, card) {
        return items.concat(livingSplitValues(card.dataset.tags));
      }, []));

      addLivingOptions(livingCategory, categories);
      addLivingOptions(livingTag, tags);
      if (livingCategoryWrap) livingCategoryWrap.hidden = categories.length === 0;
      if (livingTagWrap) livingTagWrap.hidden = tags.length === 0;
    }

    function livingCardText(card) {
      return [
        card.dataset.search,
        card.dataset.title,
        card.dataset.summary,
        card.dataset.category,
        card.dataset.tags
      ].join(' ').toLowerCase();
    }

    function livingCardUrl(card) {
      return card.dataset.url || card.getAttribute('href') || '';
    }

    function livingIsInteractiveTarget(target) {
      return Boolean(target && target.closest('a, button, input, select, textarea, label, [role="button"]'));
    }

    function setupLivingLinkedCards() {
      livingCards.forEach(function (card) {
        var url = livingCardUrl(card);
        if (!url) return;
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        if (!card.getAttribute('aria-label')) {
          card.setAttribute('aria-label', card.dataset.title || card.textContent.trim());
        }
        card.addEventListener('click', function (event) {
          if (event.defaultPrevented || livingIsInteractiveTarget(event.target)) return;
          window.location.href = url;
        });
        card.addEventListener('keydown', function (event) {
          if (event.defaultPrevented || livingIsInteractiveTarget(event.target)) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          window.location.href = url;
        });
      });
    }

    function livingDateValue(card) {
      var value = card.dataset.published || card.dataset.reviewed || card.dataset.updated || card.dataset.created || '';
      var parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    function livingCompareCards(a, b) {
      var left = livingDateValue(a);
      var right = livingDateValue(b);
      if (left !== null && right !== null && left !== right) {
        return livingSortOrder === 'oldest' ? left - right : right - left;
      }
      if (left !== null && right === null) return livingSortOrder === 'oldest' ? -1 : 1;
      if (left === null && right !== null) return livingSortOrder === 'oldest' ? 1 : -1;
      return Number(a.dataset.originalOrder || 0) - Number(b.dataset.originalOrder || 0);
    }

    function livingMatchesSelect(card, select, field) {
      var value = select ? select.value : 'all';
      if (!value || value === 'all') return true;
      if (field === 'category') return String(card.dataset.category || '') === value;
      return livingSplitValues(card.dataset.tags).indexOf(value) !== -1;
    }

    function loadLivingSavedArticles() {
      try {
        var value = JSON.parse(window.localStorage.getItem(livingSavedKey) || '[]');
        return new Set(Array.isArray(value) ? value.filter(Boolean) : []);
      } catch (error) {
        return new Set();
      }
    }

    function saveLivingSavedArticles() {
      try {
        window.localStorage.setItem(livingSavedKey, JSON.stringify(Array.from(savedLivingArticles)));
      } catch (error) {
        // Ignore storage failures so the article list stays usable.
      }
    }

    function updateLivingSavedButtons() {
      livingCards.forEach(function (card) {
        var url = livingCardUrl(card);
        var isSaved = url && savedLivingArticles.has(url);
        card.classList.toggle('is-saved', Boolean(isSaved));
        var button = card.querySelector('[data-living-save]');
        if (!button) return;
        button.textContent = isSaved ? '★' : '☆';
        button.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
        button.setAttribute('aria-label', (isSaved ? '保存を解除: ' : '保存: ') + (card.dataset.title || '記事'));
      });
      if (livingSavedFilter) {
        livingSavedFilter.classList.toggle('is-active', livingSavedOnly);
        livingSavedFilter.setAttribute('aria-pressed', livingSavedOnly ? 'true' : 'false');
      }
    }

    function updateLivingHub() {
      var query = livingSearch ? livingSearch.value.trim().toLowerCase() : '';
      var visibleCount = 0;
      var savedArticleCount = 0;

      livingCards.sort(livingCompareCards).forEach(function (card) {
        if (livingGrid) livingGrid.appendChild(card);

        var matchesSearch = !query || livingCardText(card).indexOf(query) !== -1;
        var isSaved = savedLivingArticles.has(livingCardUrl(card));
        if (isSaved) savedArticleCount += 1;
        var isVisible = matchesSearch
          && livingMatchesSelect(card, livingCategory, 'category')
          && livingMatchesSelect(card, livingTag, 'tag')
          && (!livingSavedOnly || isSaved);
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (livingSavedEmpty) livingSavedEmpty.hidden = !(livingSavedOnly && savedArticleCount === 0);
      if (livingEmpty) livingEmpty.hidden = visibleCount !== 0 || (livingSavedOnly && savedArticleCount === 0);
      if (livingCount) livingCount.textContent = visibleCount + '件の記事を表示中';
      updateLivingSavedButtons();
    }

    function setLivingSort(value) {
      livingSortOrder = value === 'oldest' ? 'oldest' : 'newest';
      livingSortButtons.forEach(function (button) {
        var isActive = (button.getAttribute('data-living-sort') || 'newest') === livingSortOrder;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function setLivingView(value) {
      var mode = value === 'list' ? 'list' : 'grid';
      if (livingGrid) {
        livingGrid.classList.toggle('is-list-view', mode === 'list');
        livingGrid.classList.toggle('is-grid-view', mode !== 'list');
      }
      livingViewButtons.forEach(function (button) {
        var isActive = (button.getAttribute('data-living-view') || 'grid') === mode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      try {
        window.localStorage.setItem(livingViewKey, mode);
      } catch (error) {
        // View preference is optional.
      }
    }

    setupLivingFilters();
    setupLivingLinkedCards();

    livingSortButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setLivingSort(button.getAttribute('data-living-sort') || 'newest');
        updateLivingHub();
      });
    });

    livingViewButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setLivingView(button.getAttribute('data-living-view') || 'grid');
      });
    });

    livingSaveButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('[data-living-card]');
        var url = card ? livingCardUrl(card) : '';
        if (!url) return;
        if (savedLivingArticles.has(url)) savedLivingArticles.delete(url);
        else savedLivingArticles.add(url);
        saveLivingSavedArticles();
        updateLivingHub();
      });
    });

    if (livingSavedFilter) {
      livingSavedFilter.addEventListener('click', function () {
        livingSavedOnly = !livingSavedOnly;
        updateLivingHub();
      });
    }

    if (livingSearch) livingSearch.addEventListener('input', updateLivingHub);
    if (livingCategory) livingCategory.addEventListener('change', updateLivingHub);
    if (livingTag) livingTag.addEventListener('change', updateLivingHub);
    if (livingReset) {
      livingReset.addEventListener('click', function () {
        if (livingSearch) livingSearch.value = '';
        if (livingCategory) livingCategory.value = 'all';
        if (livingTag) livingTag.value = 'all';
        livingSavedOnly = false;
        setLivingSort('newest');
        updateLivingHub();
      });
    }
    try {
      setLivingView(window.localStorage.getItem(livingViewKey) || 'grid');
    } catch (error) {
      setLivingView('grid');
    }
    setLivingSort('newest');
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
