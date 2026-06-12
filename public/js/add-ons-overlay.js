(function () {
  const page = document.querySelector('.add-ons-page');

  if (!page) {
    return;
  }

  const overlay = document.querySelector('[data-add-ons-overlay]');
  const dialog = overlay?.querySelector('[data-add-ons-overlay-dialog]');
  const viewport = overlay?.querySelector('[data-add-ons-overlay-viewport]');
  const counter = overlay?.querySelector('[data-add-ons-overlay-counter]');
  const slides = Array.from(overlay?.querySelectorAll('[data-add-ons-overlay-slide]') || []);
  const triggers = Array.from(document.querySelectorAll('[data-add-ons-overlay-trigger]'));
  const closeButtons = Array.from(overlay?.querySelectorAll('[data-add-ons-overlay-close]') || []);
  const previousButton = overlay?.querySelector('[data-add-ons-overlay-prev]');
  const nextButton = overlay?.querySelector('[data-add-ons-overlay-next]');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const slideAnimationMs = 360;
  const closeAnimationMs = 280;
  const swipeThreshold = 48;

  if (!overlay || !dialog || !viewport || !slides.length || !triggers.length) {
    return;
  }

  let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
  let previousFocus = null;
  let isOpen = false;
  let isAnimating = false;
  let slideTimer = null;
  let closeTimer = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let activePointerId = null;

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  function normalizeIndex(index) {
    const numericIndex = Number.parseInt(index, 10);

    if (!Number.isFinite(numericIndex)) {
      return 0;
    }

    return (numericIndex + slides.length) % slides.length;
  }

  function updateCounter() {
    if (counter) {
      counter.textContent = `${activeIndex + 1} von ${slides.length}`;
    }
  }

  function clearSlideState(slide) {
    slide.classList.remove(
      'is-active',
      'is-entering-left',
      'is-entering-right',
      'is-exiting-left',
      'is-exiting-right'
    );
  }

  function setActiveSlide(index) {
    activeIndex = normalizeIndex(index);

    slides.forEach((slide, slideIndex) => {
      clearSlideState(slide);
      slide.setAttribute('aria-hidden', slideIndex === activeIndex ? 'false' : 'true');

      if (slideIndex === activeIndex) {
        slide.classList.add('is-active');
      }
    });

    viewport.scrollTop = 0;
    updateCounter();
  }

  function finishSlideAnimation(previousSlide, nextSlide) {
    clearSlideState(previousSlide);
    previousSlide.setAttribute('aria-hidden', 'true');
    clearSlideState(nextSlide);
    nextSlide.classList.add('is-active');
    nextSlide.setAttribute('aria-hidden', 'false');
    isAnimating = false;
  }

  function showSlide(index, direction) {
    const nextIndex = normalizeIndex(index);

    if (nextIndex === activeIndex || (isAnimating && !prefersReducedMotion())) {
      return;
    }

    const previousSlide = slides[activeIndex];
    const nextSlide = slides[nextIndex];
    const isPreviousDirection = direction === 'previous';

    window.clearTimeout(slideTimer);

    if (prefersReducedMotion()) {
      setActiveSlide(nextIndex);
      return;
    }

    isAnimating = true;
    slides.forEach((slide) => {
      if (slide !== previousSlide && slide !== nextSlide) {
        clearSlideState(slide);
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    previousSlide.classList.remove('is-active');
    previousSlide.classList.add(isPreviousDirection ? 'is-exiting-right' : 'is-exiting-left');
    previousSlide.setAttribute('aria-hidden', 'true');

    clearSlideState(nextSlide);
    nextSlide.classList.add(isPreviousDirection ? 'is-entering-left' : 'is-entering-right');
    nextSlide.setAttribute('aria-hidden', 'false');

    activeIndex = nextIndex;
    viewport.scrollTop = 0;
    updateCounter();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        nextSlide.classList.remove(isPreviousDirection ? 'is-entering-left' : 'is-entering-right');
        nextSlide.classList.add('is-active');
      });
    });

    slideTimer = window.setTimeout(() => {
      finishSlideAnimation(previousSlide, nextSlide);
    }, slideAnimationMs);
  }

  function showPreviousSlide() {
    showSlide(activeIndex - 1, 'previous');
  }

  function showNextSlide() {
    showSlide(activeIndex + 1, 'next');
  }

  function lockPage(lock) {
    document.documentElement.classList.toggle('add-ons-overlay-lock', lock);
    document.body.classList.toggle('add-ons-overlay-lock', lock);
  }

  function restoreFocus() {
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus({ preventScroll: true });
    }

    previousFocus = null;
  }

  function openOverlay(index) {
    previousFocus = document.activeElement;
    window.clearTimeout(closeTimer);
    setActiveSlide(index);
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.remove('is-closing');
    lockPage(true);
    isOpen = true;

    window.requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      dialog.focus({ preventScroll: true });
    });
  }

  function closeOverlay() {
    if (!isOpen) {
      return;
    }

    window.clearTimeout(closeTimer);
    overlay.classList.add('is-closing');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    lockPage(false);
    isOpen = false;

    const finishClose = () => {
      overlay.classList.remove('is-closing');
      overlay.hidden = true;
      restoreFocus();
    };

    if (prefersReducedMotion()) {
      finishClose();
      return;
    }

    closeTimer = window.setTimeout(finishClose, closeAnimationMs);
  }

  function getFocusableElements() {
    return Array.from(
      dialog.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => {
      if (element.offsetParent === null || element.closest('[aria-hidden="true"]')) {
        return false;
      }

      return window.getComputedStyle(element).visibility !== 'hidden';
    });
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      openOverlay(trigger.dataset.addOnsDetailIndex);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeOverlay);
  });

  previousButton?.addEventListener('click', showPreviousSlide);
  nextButton?.addEventListener('click', showNextSlide);

  document.addEventListener('keydown', (event) => {
    if (!isOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPreviousSlide();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextSlide();
      return;
    }

    trapFocus(event);
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (!isOpen || event.button > 0) {
      return;
    }

    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  });

  viewport.addEventListener('pointerup', (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    const diffX = event.clientX - pointerStartX;
    const diffY = event.clientY - pointerStartY;
    activePointerId = null;

    if (Math.abs(diffX) < swipeThreshold || Math.abs(diffX) < Math.abs(diffY) * 1.2) {
      return;
    }

    if (diffX < 0) {
      showNextSlide();
      return;
    }

    showPreviousSlide();
  });

  viewport.addEventListener('pointercancel', () => {
    activePointerId = null;
  });

  setActiveSlide(activeIndex);
})();
