(function() {
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  function toInt(value, fallback) {
    var parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  onReady(function() {
    var grid = document.querySelector('[data-blog-grid]');
    var button = document.querySelector('[data-blog-load-more]');
    var status = document.querySelector('[data-blog-load-status]');
    if (!grid || !button) return;

    var endpoint = button.getAttribute('data-endpoint') || '/blog/posts';
    var offset = toInt(button.getAttribute('data-offset'), grid.querySelectorAll('[data-blog-post-card]').length);
    var limit = toInt(button.getAttribute('data-limit'), 10);
    var isLoading = false;
    var defaultLabel = button.textContent.trim();

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function setLoading(nextLoading) {
      isLoading = nextLoading;
      button.disabled = nextLoading;
      button.textContent = nextLoading ? 'Artikel werden geladen...' : defaultLabel;
    }

    button.addEventListener('click', function() {
      if (isLoading || !window.axios) {
        if (!window.axios) setStatus('Artikel konnten gerade nicht geladen werden.');
        return;
      }

      setLoading(true);

      window.axios.get(endpoint, {
        params: { offset: offset, limit: limit },
        headers: { Accept: 'application/json' }
      }).then(function(response) {
        var data = response && response.data ? response.data : {};
        if (data.html) {
          grid.insertAdjacentHTML('beforeend', data.html);
        }

        offset = toInt(data.nextOffset, offset);
        button.setAttribute('data-offset', String(offset));

        if (!data.hasMore) {
          button.hidden = true;
          setStatus('Alle Artikel geladen.');
          return;
        }

        setStatus(offset + ' von ' + data.totalPosts + ' Artikeln angezeigt.');
      }).catch(function() {
        setStatus('Artikel konnten gerade nicht geladen werden. Bitte später erneut versuchen.');
      }).finally(function() {
        setLoading(false);
      });
    });
  });
})();
