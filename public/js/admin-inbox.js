// Admin „Anfragen“: Mailvorschau im Marken-Design und Schutz vor doppeltem Absenden.
(function () {
  document.querySelectorAll('[data-inbox-compose]').forEach(function (form) {
    var previewButton = form.querySelector('[data-inbox-preview]');
    var previewBox = form.querySelector('[data-inbox-preview-box]');
    var previewFrame = form.querySelector('[data-inbox-preview-frame]');

    if (previewButton && previewBox && previewFrame) {
      previewButton.addEventListener('click', function () {
        var data = new FormData(form);
        data.delete('attachments');
        data.delete('to');
        data.delete('name');
        fetch('/admin/mailversand/preview', { method: 'POST', body: new URLSearchParams(data) })
          .then(function (response) { return response.text(); })
          .then(function (html) {
            previewBox.classList.remove('is-hidden');
            var doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
            previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          })
          .catch(function (error) {
            window.alert('Vorschau konnte nicht geladen werden: ' + error.message);
          });
      });
    }

    form.addEventListener('submit', function () {
      var submit = form.querySelector('button[type="submit"]');
      if (!submit) return;
      submit.disabled = true;
      submit.textContent = 'Wird gesendet …';
    });
  });

  // Nach dem Senden direkt zum Ende des Verlaufs springen.
  if (window.location.hash === '#ende') {
    var end = document.getElementById('ende');
    if (end) end.scrollIntoView({ block: 'center' });
  }
})();
