(function(){
  const areas = document.querySelectorAll('textarea[data-json-editor]');
  areas.forEach(area => {
    const badge = document.createElement('div');
    badge.className = 'text-muted admin-json-badge';
    area.classList.add('admin-json-editor');
    area.insertAdjacentElement('afterend', badge);

    function validate() {
      const val = area.value.trim();
      area.classList.remove('is-valid', 'is-invalid');
      if (!val) { badge.textContent = 'leer'; return; }
      try {
        const obj = JSON.parse(val);
        area.classList.add('is-valid');
        const summary = Array.isArray(obj) ? `${obj.length} Einträge` : 'Objekt';
        badge.textContent = 'OK – ' + summary;
      } catch(e) {
        area.classList.add('is-invalid');
        badge.textContent = '❌ Ungültiges JSON';
      }
    }
    area.addEventListener('input', validate);
    validate();
  });
})();
