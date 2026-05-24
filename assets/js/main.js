document.addEventListener('DOMContentLoaded', function () {
  var languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.addEventListener('change', function (event) {
      if (event.target.value) window.location.href = event.target.value;
    });
  }
});
