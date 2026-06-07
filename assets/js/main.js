document.addEventListener('DOMContentLoaded', function () {
  var languageMenus = Array.prototype.slice.call(document.querySelectorAll('.header-language-menu'));
  if (!languageMenus.length) return;

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
});
