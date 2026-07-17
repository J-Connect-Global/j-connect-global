(function () {
  'use strict';

  function initLightbox(root) {
    const dialog = root.querySelector('[data-public-lightbox]');
    const triggers = Array.from(root.querySelectorAll('[data-lightbox-open]'));
    if (!dialog || !triggers.length) return;

    const image = dialog.querySelector('[data-lightbox-image]');
    const caption = dialog.querySelector('[data-lightbox-caption]');
    const previous = dialog.querySelector('[data-lightbox-prev]');
    const next = dialog.querySelector('[data-lightbox-next]');
    const closeButton = dialog.querySelector('[data-lightbox-close]');
    const focusableSelector = 'button:not([disabled]):not([hidden]), a[href], [tabindex]:not([tabindex="-1"])';
    let currentIndex = 0;
    let lastTrigger = null;

    function show(index) {
      currentIndex = (index + triggers.length) % triggers.length;
      const sourceImage = triggers[currentIndex].querySelector('img');
      if (!sourceImage) return;
      image.src = sourceImage.currentSrc || sourceImage.src;
      image.alt = sourceImage.alt;
      caption.textContent = `${sourceImage.alt}（${currentIndex + 1} / ${triggers.length}）`;
      previous.hidden = triggers.length < 2;
      next.hidden = triggers.length < 2;
    }

    triggers.forEach(function (trigger, index) {
      trigger.addEventListener('click', function () {
        lastTrigger = trigger;
        show(index);
        dialog.showModal();
        document.body.classList.add('public-lightbox-open');
        closeButton.focus({ preventScroll: true });
      });
    });
    closeButton.addEventListener('click', function () { dialog.close(); });
    previous.addEventListener('click', function () { show(currentIndex - 1); });
    next.addEventListener('click', function () { show(currentIndex + 1); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') show(currentIndex - 1);
      if (event.key === 'ArrowRight') show(currentIndex + 1);
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter(function (element) {
        return !element.hidden && element.getClientRects().length > 0;
      });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.addEventListener('close', function () {
      document.body.classList.remove('public-lightbox-open');
      if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
      lastTrigger = null;
    });
  }

  document.addEventListener('DOMContentLoaded', function () { initLightbox(document); });
})();
