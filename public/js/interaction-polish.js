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
    if (window.innerWidth <= 700 && element.matches('.seo-landing__link-card, .packages-page .intro-card')) return false;

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

  var nonBreakingHyphen = '\u2011';
  var hyphenatedTokenPattern = /[A-Za-z0-9ÄÖÜäöüẞßÀ-ÖØ-öø-ÿ]+(?:-[A-Za-z0-9ÄÖÜäöüẞßÀ-ÖØ-öø-ÿ]+)+/g;
  var hyphenProtectionNodes = [];
  var hyphenProtectionCanvas = null;
  var hyphenProtectionTimer = 0;

  function isHyphenProtectionExcludedElement(element) {
    if (!element || typeof element.closest !== 'function') return false;

    return Boolean(element.closest(
      'script, style, noscript, svg, canvas, pre, code, kbd, samp, textarea, input, select, option, [data-preserve-hyphen-breaks]'
    ));
  }

  function hasHyphenatedToken(text) {
    hyphenatedTokenPattern.lastIndex = 0;
    return hyphenatedTokenPattern.test(text);
  }

  function rememberHyphenTextNode(node) {
    if (!node || !node.parentElement) return;
    if (isHyphenProtectionExcludedElement(node.parentElement)) return;

    var text = node.__kwdOriginalHyphenText || node.nodeValue || '';
    if (text.indexOf('-') === -1 || !hasHyphenatedToken(text)) return;

    if (!node.__kwdOriginalHyphenText) {
      node.__kwdOriginalHyphenText = text;
      hyphenProtectionNodes.push(node);
    }
  }

  function collectHyphenTextNodes(root) {
    var stack = [root];

    while (stack.length) {
      var node = stack.pop();
      if (!node) continue;

      if (node.nodeType === 3) {
        rememberHyphenTextNode(node);
        continue;
      }

      if (node.nodeType !== 1 || isHyphenProtectionExcludedElement(node)) continue;

      var children = node.childNodes ? Array.prototype.slice.call(node.childNodes) : [];
      for (var index = children.length - 1; index >= 0; index -= 1) {
        stack.push(children[index]);
      }
    }
  }

  function getComputedStyleSafe(element) {
    if (!element || !window.getComputedStyle) return {};
    return window.getComputedStyle(element);
  }

  function getTextMeasureElement(node) {
    var element = node.parentElement;

    while (element && element !== document.body) {
      var style = getComputedStyleSafe(element);
      if (style.display && style.display !== 'inline') return element;
      element = element.parentElement;
    }

    return node.parentElement || document.body;
  }

  function getAvailableTextWidth(element) {
    var current = element;

    while (current && current !== document.documentElement) {
      if (typeof current.getBoundingClientRect === 'function') {
        var rect = current.getBoundingClientRect();
        var style = getComputedStyleSafe(current);
        var display = style.display || '';

        if (rect && rect.width > 0 && display !== 'inline') {
          var paddingLeft = parseFloat(style.paddingLeft) || 0;
          var paddingRight = parseFloat(style.paddingRight) || 0;
          var width = rect.width - paddingLeft - paddingRight;
          if (width > 0) return width;
        }
      }

      current = current.parentElement;
    }

    var viewportWidth = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 320;
    return Math.max(160, viewportWidth - 32);
  }

  function getHyphenMeasurementContext() {
    if (hyphenProtectionCanvas === false) return null;
    if (!hyphenProtectionCanvas && document.createElement) {
      hyphenProtectionCanvas = document.createElement('canvas');
    }

    if (!hyphenProtectionCanvas || typeof hyphenProtectionCanvas.getContext !== 'function') {
      hyphenProtectionCanvas = false;
      return null;
    }

    return hyphenProtectionCanvas.getContext('2d');
  }

  function getFontForElement(element) {
    var style = getComputedStyleSafe(element);
    if (style.font) return style.font;

    return [
      style.fontStyle || 'normal',
      style.fontVariant || 'normal',
      style.fontWeight || '400',
      style.fontSize || '16px',
      style.fontFamily || 'sans-serif'
    ].join(' ');
  }

  function measureTokenWidth(element, token) {
    var context = getHyphenMeasurementContext();
    if (!context) return token.length * 9;

    context.font = getFontForElement(element);
    return context.measureText(token).width;
  }

  function protectHyphensForElement(text, element) {
    var availableWidth = getAvailableTextWidth(element);
    hyphenatedTokenPattern.lastIndex = 0;

    return text.replace(hyphenatedTokenPattern, function(token) {
      var tokenWidth = measureTokenWidth(element, token);
      if (tokenWidth <= availableWidth) {
        return token.replace(/-/g, nonBreakingHyphen);
      }

      return token;
    });
  }

  function applyLayoutAwareHyphenProtection() {
    if (!document.body || !document.body.childNodes) return;

    collectHyphenTextNodes(document.body);

    hyphenProtectionNodes = hyphenProtectionNodes.filter(function(node) {
      return node && node.parentElement && node.isConnected !== false;
    });

    hyphenProtectionNodes.forEach(function(node) {
      var originalText = node.__kwdOriginalHyphenText || node.nodeValue || '';
      var measureElement = getTextMeasureElement(node);
      node.nodeValue = protectHyphensForElement(originalText, measureElement);
    });
  }

  function scheduleHyphenProtection() {
    window.clearTimeout(hyphenProtectionTimer);
    hyphenProtectionTimer = window.setTimeout(applyLayoutAwareHyphenProtection, 120);
  }

  function initLayoutAwareHyphenProtection() {
    applyLayoutAwareHyphenProtection();

    window.addEventListener('resize', scheduleHyphenProtection, { passive: true });
    window.addEventListener('orientationchange', scheduleHyphenProtection, { passive: true });
    document.addEventListener('toggle', scheduleHyphenProtection, true);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyLayoutAwareHyphenProtection).catch(function() {});
    }

    onPageLoaded(applyLayoutAwareHyphenProtection);
  }

  function initPackageSliders() {
    var scrollStateTargets = document.querySelectorAll([
      '[data-package-slider]',
      '[data-pricing-slider]',
      '.webdesign-berlin .wd-tech-grid',
      '.webdesign-berlin .wd-scroll-cards',
      '.webdesign-berlin .wd-district-grid',
      '.rg-featured-scroll',
      '.horizontalSlider',
      '.funktionenItemContainer',
      '.flexVorteile',
      '.tippsContainer',
      '.industries-index-page .post-list'
    ].join(','));

    scrollStateTargets.forEach(function(slider) {
      if (slider.dataset.scrollStateReady === 'true') return;
      slider.dataset.scrollStateReady = 'true';

      var scrollTimer = 0;

      function updatePersistentSliderIndicator() {
        var clientWidth = slider.clientWidth || 0;
        var scrollWidth = slider.scrollWidth || 0;
        var maxScroll = Math.max(0, scrollWidth - clientWidth);
        var hasOverflow = maxScroll > 2;

        slider.classList.toggle('has-overflow-indicator', hasOverflow);

        if (!hasOverflow || !scrollWidth || !clientWidth) {
          slider.style.removeProperty('--kwd-slider-thumb-width');
          slider.style.removeProperty('--kwd-slider-thumb-offset');
          return;
        }

        var visibleRatio = Math.min(1, Math.max(0.18, clientWidth / scrollWidth));
        var thumbWidth = Math.min(clientWidth, Math.max(44, clientWidth * visibleRatio));
        var maxOffset = Math.max(0, clientWidth - thumbWidth);
        var progress = Math.min(1, Math.max(0, slider.scrollLeft / maxScroll));

        slider.style.setProperty('--kwd-slider-thumb-width', thumbWidth.toFixed(2) + 'px');
        slider.style.setProperty('--kwd-slider-thumb-offset', (progress * maxOffset).toFixed(2) + 'px');
      }

      function markScrolling() {
        updatePersistentSliderIndicator();
        slider.classList.add('is-scrolling');
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(function() {
          slider.classList.remove('is-scrolling');
        }, 420);
      }

      updatePersistentSliderIndicator();
      onPageLoaded(updatePersistentSliderIndicator);
      window.addEventListener('resize', updatePersistentSliderIndicator, { passive: true });
      window.addEventListener('orientationchange', updatePersistentSliderIndicator, { passive: true });

      if (window.ResizeObserver) {
        var sliderResizeObserver = new ResizeObserver(updatePersistentSliderIndicator);
        sliderResizeObserver.observe(slider);
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(updatePersistentSliderIndicator).catch(function() {});
      }

      slider.addEventListener('scroll', markScrolling, { passive: true });
      slider.addEventListener('touchstart', markScrolling, { passive: true });
      slider.addEventListener('touchmove', markScrolling, { passive: true });
    });

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
        if (event.pointerType !== 'mouse') {
          slider.classList.add('is-scrolling');
          return;
        }
        if (event.button !== 0) return;
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
    initLayoutAwareHyphenProtection();
    initPackageSliders();
    prepareRevealTargets();
    onPageLoaded(startReveal);
  });
})();
