(function () {
    const area = document.getElementById('jsonArea');
    const status = document.getElementById('jsonStatus');
    const preview = document.getElementById('preview');
    const drop = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const btnPreview = document.getElementById('btnPreview');
    const btnImport = document.getElementById('btnImport');
    const rebuildEmb = document.getElementById('rebuildEmb');

    let items = null; // parsed list

    function setStatus(msg, ok = true) {
        status.textContent = msg;
        status.className = 'small mt-1 ' + (ok ? 'text-success' : 'text-danger');
    }

    function tryParse(text) {
        if (!text || !text.trim()) { items = null; return setStatus(''); }
        try {
            const data = JSON.parse(text);
            items = Array.isArray(data) ? data : [data];
            setStatus(`OK – ${items.length} Einträge erkannt.`);
            btnPreview.disabled = false;
            btnImport.disabled = false;
        } catch (e) {
            items = null;
            setStatus('❌ Ungültiges JSON', false);
            btnPreview.disabled = true;
            btnImport.disabled = true;
        }
    }

    area.addEventListener('input', () => tryParse(area.value));

    // Drag & Drop
    ;['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation(); drop.classList.add('bg-light');
    }));
    ;['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation(); drop.classList.remove('bg-light');
    }));
    drop.addEventListener('drop', async (e) => {
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        if (!/json|text/.test(f.type) && !f.name.endsWith('.json')) {
            return setStatus('❌ Bitte eine .json Datei ablegen.', false);
        }
        const text = await f.text();
        area.value = text;
        tryParse(text);
    });

    fileInput.addEventListener('change', async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        const text = await f.text();
        area.value = text;
        tryParse(text);
    });

    btnPreview.addEventListener('click', () => {
        if (!items) return;
        const slim = items.slice(0, 10).map(x => ({ slug: x.slug || '(slug wird aus name erzeugt)', name: x.name || '' }));
        const suffix = items.length > 10 ? `\n… und ${items.length - 10} weitere` : '';
        preview.textContent = JSON.stringify(slim, null, 2) + suffix;
    });

    btnImport.addEventListener('click', async () => {
        if (!items) return;
        btnImport.disabled = true;
        btnImport.textContent = 'Import läuft…';

        const endpoint = window.location.pathname; // garantiert: /admin/industries/import

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ items, rebuild_embeddings: rebuildEmb.checked })
            });

            const ctype = res.headers.get('content-type') || '';
            if (!ctype.includes('application/json')) {
                const text = await res.text();
                throw new Error(`Server lieferte kein JSON (Status ${res.status}). Antwort:\n${text.slice(0, 400)}`);
            }

            const json = await res.json();
            if (!json.ok) throw new Error(json.error || `Fehler (Status ${res.status})`);

            const rows = json.results.map(r => `
      <tr>
        <td><code>${r.slug}</code></td>
        <td>${r.name || ''}</td>
        <td><span class="badge ${r.action === 'inserted' ? 'bg-success' : 'bg-warning text-dark'}">${r.action}</span></td>
        <td><a class="btn btn-sm btn-outline-secondary" href="/webdesign-${r.slug}" target="_blank">ansehen</a></td>
      </tr>`).join('');

            document.getElementById('importResult').innerHTML = `
      <div class="alert alert-success mt-3">Import erfolgreich – ${json.count} Einträge.</div>
      <table class="table table-sm table-striped mt-2">
        <thead><tr><th>Slug</th><th>Name</th><th>Aktion</th><th>Seite</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
        } catch (e) {
            document.getElementById('importResult').innerHTML =
                `<div class="alert alert-danger mt-3"><pre style="white-space:pre-wrap;margin:0">Fehler: ${e.message}</pre></div>`;
        } finally {
            btnImport.disabled = false;
            btnImport.textContent = 'Import starten';
        }
    });

})();
