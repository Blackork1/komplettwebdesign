(function(){
  const areas = document.querySelectorAll('textarea[data-json-editor]');
  areas.forEach(area => {
    const badge = document.createElement('div');
    badge.style.fontSize = '12px';
    badge.style.marginTop = '4px';
    badge.className = 'text-muted';
    area.insertAdjacentElement('afterend', badge);

    function validate() {
      const val = area.value.trim();
      if (!val) { area.style.borderColor = ''; badge.textContent = 'leer'; return; }
      try {
        const obj = JSON.parse(val);
        area.style.borderColor = '#28a745';
        const summary = Array.isArray(obj) ? `${obj.length} Einträge` : 'Objekt';
        badge.textContent = 'OK – ' + summary;
      } catch(e) {
        area.style.borderColor = '#dc3545';
        badge.textContent = '❌ Ungültiges JSON';
      }
    }
    area.addEventListener('input', validate);
    validate();
  });
})();
