(function () {
  function onReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  }

  function createIframe(wrapper) {
    const videoId = wrapper.getAttribute('data-youtube-id');
    if (!videoId) return null;
    const title = wrapper.getAttribute('data-youtube-title') || 'YouTube video player';
    const params = wrapper.getAttribute('data-youtube-params') || 'autoplay=1&rel=0&modestbranding=1&playsinline=1';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', `https://www.youtube-nocookie.com/embed/${videoId}?${params}`);
    iframe.setAttribute('title', title);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.display = 'block';
    return iframe;
  }

  function setButtonState(wrapper, isLoading) {
    wrapper.classList.toggle('youtube-wrapper--loading', !!isLoading);
    const btn = wrapper.querySelector('.youtube-consent-btn');
    if (!btn) return;
    if (!btn.dataset.labelDefault) {
      btn.dataset.labelDefault = btn.textContent.trim();
    }
    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Lädt…' : btn.dataset.labelDefault;
  }

  function loadVideo(wrapper) {
    if (!wrapper || wrapper.dataset.loaded === '1') return;
    const iframe = createIframe(wrapper);
    if (!iframe) return;
    wrapper.dataset.loaded = '1';
    wrapper.classList.remove('youtube-wrapper--loading', 'youtube-wrapper--consent-needed');
    wrapper.innerHTML = '';
    wrapper.appendChild(iframe);
  }

  function requestConsentAndLoad(wrapper) {
    const consentFn = window.requestYoutubeConsent;
    if (typeof consentFn !== 'function') {
      loadVideo(wrapper);
      return;
    }
    setButtonState(wrapper, true);
    consentFn()
      .then(() => {
        loadVideo(wrapper);
      })
      .catch((err) => {
        console.warn('[YouTube consent]', err);
        setButtonState(wrapper, false);
      });
  }

  function handleInteraction(wrapper) {
    if (window.cookieConsentState && window.cookieConsentState.youtubeVideos) {
      loadVideo(wrapper);
      return;
    }

    requestConsentAndLoad(wrapper);
  }

  function syncConsent(wrapper) {
    const consentGiven = !!(window.cookieConsentState && window.cookieConsentState.youtubeVideos);
    const needsPlaceholder = !consentGiven && !wrapper.dataset.loaded;

    wrapper.classList.toggle('youtube-wrapper--consent-needed', needsPlaceholder);
    wrapper.classList.toggle('youtube-wrapper--consent-granted', consentGiven);
  }

  onReady(() => {
    const wrappers = Array.from(document.querySelectorAll('.youtube-wrapper[data-youtube-id]'));
    if (!wrappers.length) return;

    wrappers.forEach((wrapper) => {
      const thumb = wrapper.querySelector('.youtube-thumb');
      const btn = wrapper.querySelector('.youtube-consent-btn');

      if (thumb) {
        thumb.addEventListener('click', (event) => {
          event.preventDefault();
          handleInteraction(wrapper);
        });
      }

      if (btn) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          handleInteraction(wrapper);
        });
      }

      syncConsent(wrapper);
    });

    document.addEventListener('cookieConsentUpdate', () => {
      wrappers.forEach(syncConsent);
    });
  });
})();