(function() {
  var revealSelectors = [
    '.unified-hero__copy',
    '.unified-hero__panel',
    '.unified-hero__media-frame',
    'main > section:not(.unified-hero)',
    'main section > .container',
    'main section > .references-container',
    'main section > .seo-landing__container',
    '.reference-card',
    '.seo-landing__section',
    '.seo-landing__link-card',
    '.wd-section__inner',
    '.wd-case',
    '.wd-package-card',
    '.intro-card',
    '.overview-card',
    '.detail-card',
    '.proof-card',
    '.trust-card',
    '.leistungen-example',
    '.wt-panel',
    '.wt-tool-card',
    '.wt-result-card',
    '.about-section',
    '.about-section .column',
    '.project-image'
  ];
  var preparedTargets = [];
  var targetsPrepared = false;

  function onDomReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function onPageLoaded(callback) {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback, { once: true });
    }
  }

  function isExcludedPage() {
    var path = window.location && window.location.pathname ? window.location.pathname : '';
    var body = document.body;
    var isHomePage = path === '/' || path === '/en' || path === '/en/' || (body && body.classList.contains('home-page'));
    var isIndustryDetail = path.startsWith('/branchen/') ||
      Boolean(document.querySelector('#OverflowHidden #Hero, #Hero .heroH1'));

    return Boolean(
      isHomePage ||
      isIndustryDetail ||
      document.querySelector('.home-page')
    );
  }

  function isInsideStaticUi(element) {
    var staticContainer = element.closest(
      'footer, .site-footer, #footer, .cookie-banner, #cookie-banner, .chat-container, .chat-button, .modal, script, style, noscript'
    );
    if (staticContainer) return true;

    var pageHeader = element.closest('header');
    return Boolean(pageHeader && !pageHeader.closest('main'));
  }

  function isMeaningfulRevealTarget(element) {
    if (!element || isInsideStaticUi(element)) return false;
    if (element.classList.contains('kwd-scroll-reveal')) return false;
    if (element.closest('.home-page')) return false;
    if (element.closest('.blog-page, .rg-page') && !element.closest('.unified-hero')) return false;

    var rect = element.getBoundingClientRect();
    var hasMedia = Boolean(element.querySelector('img, picture, svg, video'));
    var hasHeading = Boolean(element.querySelector('h1, h2, h3'));
    var hasText = (element.textContent || '').trim().length > 42;
    var largeEnough = rect.width >= 170 && rect.height >= 72;

    return largeEnough && (hasMedia || hasHeading || hasText);
  }

  function addRevealVariant(element, index) {
    var isMedia = element.matches('.unified-hero__media-frame, figure, picture') || element.querySelector(':scope > img, :scope > picture');
    var isPanel = element.matches('.unified-hero__panel, aside, article, .reference-card, .intro-card, .overview-card, .detail-card, .proof-card, .trust-card, .leistungen-example, .wt-tool-card');

    if (isMedia) {
      element.classList.add('kwd-scroll-reveal--media');
    } else if (isPanel && index % 2 === 1) {
      element.classList.add('kwd-scroll-reveal--from-right');
    } else if (index % 3 === 0) {
      element.classList.add('kwd-scroll-reveal--from-left');
    }

    element.style.setProperty('--kwd-reveal-delay', String(Math.min((index % 4) * 55, 165)) + 'ms');
  }

  function collectRevealTargets() {
    var seen = new Set();
    var targets = [];

    revealSelectors.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(element) {
        if (seen.has(element)) return;
        seen.add(element);
        if (isMeaningfulRevealTarget(element)) targets.push(element);
      });
    });

    return targets.slice(0, 90);
  }

  function prepareRevealTargets() {
    if (targetsPrepared) return preparedTargets;
    targetsPrepared = true;

    if (isExcludedPage()) {
      preparedTargets = [];
      return preparedTargets;
    }

    preparedTargets = collectRevealTargets();

    preparedTargets.forEach(function(element, index) {
      element.classList.add('kwd-scroll-reveal', 'kwd-scroll-reveal--preparing');
      addRevealVariant(element, index);
    });

    return preparedTargets;
  }

  function scheduleReveal(element, afterReveal) {
    if (element.classList.contains('kwd-scroll-reveal--visible')) return;

    var requestFrame = window.requestAnimationFrame || function(callback) {
      return window.setTimeout(callback, 16);
    };

    requestFrame(function() {
      element.getBoundingClientRect();
      element.classList.remove('kwd-scroll-reveal--preparing');
      element.getBoundingClientRect();

      requestFrame(function() {
        element.classList.add('kwd-scroll-reveal--visible');
        if (typeof afterReveal === 'function') afterReveal();
      });
    });
  }

  function isInitiallyVisible(element) {
    if (!element || !element.closest('.unified-hero')) return false;

    var rect = element.getBoundingClientRect();
    var documentElement = document.documentElement || {};
    var viewportHeight = window.innerHeight || documentElement.clientHeight || 0;
    var viewportWidth = window.innerWidth || documentElement.clientWidth || 0;

    if (!viewportHeight || !viewportWidth) return false;

    return rect.width > 0 &&
      rect.height > 0 &&
      rect.top < viewportHeight * 0.94 &&
      rect.bottom > viewportHeight * -0.1;
  }

  function startReveal() {
    var targets = prepareRevealTargets();
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function(element) {
        element.classList.remove('kwd-scroll-reveal--preparing');
        element.classList.add('kwd-scroll-reveal--visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        scheduleReveal(entry.target, function() {
          observer.unobserve(entry.target);
        });
      });
    }, {
      root: null,
      rootMargin: '0px 0px 12% 0px',
      threshold: [0, 0.01, 0.08]
    });

    targets.forEach(function(element) {
      observer.observe(element);
      if (isInitiallyVisible(element)) {
        scheduleReveal(element, function() {
          observer.unobserve(element);
        });
      }
    });
  }

  function initPackageSliders() {
    document.querySelectorAll('[data-package-slider]').forEach(function(slider) {
      if (slider.dataset.packageSliderReady === 'true') return;
      slider.dataset.packageSliderReady = 'true';

      var isDragging = false;
      var startX = 0;
      var startScrollLeft = 0;
      var dragDistance = 0;

      function stopDragging(event) {
        if (!isDragging) return;

        isDragging = false;
        slider.classList.remove('is-dragging');

        if (event && typeof slider.releasePointerCapture === 'function') {
          try {
            slider.releasePointerCapture(event.pointerId);
          } catch (error) {
            // The pointer can already be released by the browser on cancel.
          }
        }
      }

      slider.addEventListener('pointerdown', function(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.target && event.target.closest('a, button, input, select, textarea, label')) return;

        isDragging = true;
        dragDistance = 0;
        startX = event.clientX;
        startScrollLeft = slider.scrollLeft;
        slider.classList.add('is-dragging');
        event.preventDefault();

        if (typeof slider.setPointerCapture === 'function') {
          slider.setPointerCapture(event.pointerId);
        }
      }, { passive: false });

      slider.addEventListener('pointermove', function(event) {
        if (!isDragging) return;

        var distance = event.clientX - startX;
        dragDistance = Math.max(dragDistance, Math.abs(distance));
        slider.scrollLeft = startScrollLeft - distance;
        event.preventDefault();
      }, { passive: false });

      slider.addEventListener('click', function(event) {
        if (dragDistance > 8) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);

      slider.addEventListener('pointerup', stopDragging);
      slider.addEventListener('pointercancel', stopDragging);
      slider.addEventListener('pointerleave', stopDragging);
      slider.addEventListener('lostpointercapture', stopDragging);
    });
  }

  onDomReady(function() {
    initPackageSliders();
    prepareRevealTargets();
    onPageLoaded(startReveal);
  });
})();
