(function() {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  }

  ready(function() {
    var lightbox = document.querySelector('[data-reference-lightbox]');
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-reference-lightbox-trigger]'));
    if (!lightbox || !triggers.length) return;

    var image = lightbox.querySelector('[data-reference-lightbox-image]');
    var title = lightbox.querySelector('[data-reference-lightbox-title]');
    var label = lightbox.querySelector('[data-reference-lightbox-label]');
    var closeButton = lightbox.querySelector('[data-reference-lightbox-close]');
    var prevButton = lightbox.querySelector('[data-reference-lightbox-prev]');
    var nextButton = lightbox.querySelector('[data-reference-lightbox-next]');
    var groups = {};
    var activeGroup = [];
    var activeIndex = 0;
    var lastFocused = null;

    triggers.forEach(function(trigger) {
      var group = trigger.getAttribute('data-reference-lightbox-group') || 'default';
      if (!groups[group]) groups[group] = [];
      groups[group].push(trigger);
    });

    function setImageFromTrigger(trigger) {
      if (!trigger || !image) return;
      var imageUrl = trigger.getAttribute('data-reference-lightbox-image') || '';
      var imageAlt = trigger.getAttribute('data-reference-lightbox-alt') || '';
      var imageTitle = trigger.getAttribute('data-reference-lightbox-title') || '';
      var imageLabel = trigger.getAttribute('data-reference-lightbox-label') || '';

      image.src = imageUrl;
      image.alt = imageAlt;
      if (title) title.textContent = imageTitle;
      if (label) label.textContent = imageLabel;
    }

    function updateNavState() {
      var disabled = activeGroup.length < 2;
      if (prevButton) prevButton.disabled = disabled;
      if (nextButton) nextButton.disabled = disabled;
    }

    function openLightbox(trigger) {
      var groupName = trigger.getAttribute('data-reference-lightbox-group') || 'default';
      activeGroup = groups[groupName] || [trigger];
      activeIndex = Math.max(0, activeGroup.indexOf(trigger));
      lastFocused = document.activeElement;
      setImageFromTrigger(activeGroup[activeIndex]);
      updateNavState();
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('reference-lightbox-open');
      if (closeButton) closeButton.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('reference-lightbox-open');
      if (image) image.removeAttribute('src');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function move(step) {
      if (activeGroup.length < 2) return;
      activeIndex = (activeIndex + step + activeGroup.length) % activeGroup.length;
      setImageFromTrigger(activeGroup[activeIndex]);
    }

    triggers.forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        openLightbox(trigger);
      });
    });

    if (closeButton) {
      closeButton.addEventListener('click', closeLightbox);
    }

    if (prevButton) {
      prevButton.addEventListener('click', function() {
        move(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function() {
        move(1);
      });
    }

    lightbox.addEventListener('click', function(event) {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function(event) {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') {
        closeLightbox();
      } else if (event.key === 'ArrowLeft') {
        move(-1);
      } else if (event.key === 'ArrowRight') {
        move(1);
      }
    });
  });
})();
