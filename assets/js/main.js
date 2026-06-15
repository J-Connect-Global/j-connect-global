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

  var checklistInputs = Array.prototype.slice.call(document.querySelectorAll('.article-check-input'));
  if (checklistInputs.length) {
    var checklistStorageKey = 'jconnect:article-checklist:' + window.location.pathname;
    var canUseChecklistStorage = true;

    function updateChecklistItemState(input) {
      var item = input.closest('.article-checklist-item');
      if (item) item.classList.toggle('is-checked', input.checked);
    }

    function saveChecklistState() {
      if (!canUseChecklistStorage) return;

      try {
        var states = checklistInputs.map(function (input) {
          return input.checked;
        });
        window.localStorage.setItem(checklistStorageKey, JSON.stringify(states));
      } catch (error) {
        canUseChecklistStorage = false;
      }
    }

    try {
      var savedStates = JSON.parse(window.localStorage.getItem(checklistStorageKey) || '[]');
      if (Array.isArray(savedStates)) {
        checklistInputs.forEach(function (input, index) {
          if (typeof savedStates[index] === 'boolean') {
            input.checked = savedStates[index];
          }
        });
      }
    } catch (error) {
      canUseChecklistStorage = false;
    }

    checklistInputs.forEach(function (input) {
      updateChecklistItemState(input);
      input.addEventListener('change', function () {
        updateChecklistItemState(input);
        saveChecklistState();
      });
    });
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
