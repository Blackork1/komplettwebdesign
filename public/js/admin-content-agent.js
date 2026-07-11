(function () {
  'use strict';

  document.querySelectorAll('[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var question = form.getAttribute('data-confirm');
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
