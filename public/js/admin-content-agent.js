(function () {
  'use strict';

  function formatGermanLocalDateTime(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return '';
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (candidate.getUTCFullYear() !== year
        || candidate.getUTCMonth() !== month - 1
        || candidate.getUTCDate() !== day
        || candidate.getUTCHours() !== hour
        || candidate.getUTCMinutes() !== minute) return '';
    var weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    var months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return weekdays[candidate.getUTCDay()] + ', ' + day + '. ' + months[month - 1]
      + ' ' + year + ' um ' + match[4] + ':' + match[5] + ' Uhr';
  }

  document.querySelectorAll('[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var question = form.getAttribute('data-confirm');
      if (form.getAttribute('data-confirm-scheduled-at') !== null) {
        var scheduledAtField = form.querySelector('input[name="scheduled_at_local"]');
        var scheduledAtLabel = formatGermanLocalDateTime(scheduledAtField && scheduledAtField.value);
        if (!scheduledAtLabel) {
          event.preventDefault();
          if (scheduledAtField && typeof scheduledAtField.reportValidity === 'function') {
            scheduledAtField.reportValidity();
          }
          return;
        }
        question += '\n\nAusgewählter Termin: ' + scheduledAtLabel + '.';
      }
      if (question && !window.confirm(question)) event.preventDefault();
    });
  });

  document.querySelectorAll('[data-confirm-mode]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var selected = form.querySelector('input[name="operating_mode"]:checked');
      if (!selected || selected.value !== form.getAttribute('data-confirm-mode')) return;
      if (!window.confirm('Direktveröffentlichung wirklich aktivieren? Alle Sicherheitsvoraussetzungen werden serverseitig erneut geprüft.')) {
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll('[data-count-target]').forEach(function (field) {
    var target = document.getElementById(field.getAttribute('data-count-target'));
    if (!target) return;
    var update = function () {
      target.textContent = String(field.value.length);
    };
    field.addEventListener('input', update);
    update();
  });
}());
