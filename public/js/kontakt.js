/* ============================================================
   public/js/kontakt.js   –   Mehrstufiges Kontakt-Formular
   – nutzt globales window.SITEKEY (aus Inline-Script)
   ============================================================ */

/* ---------- Carousel ---------- */
const carouselEl = document.querySelector('#contactCarousel');
const carousel   = new bootstrap.Carousel(carouselEl, { interval:false, wrap:false });

const next = () => carousel.next();
const prev = () => carousel.prev();

/* ---------- Auto-Weiter ---------- */
['paket','umfang','texterstellung','bilderstellung','slotId'].forEach(name =>
  document.querySelectorAll(`input[name="${name}"]`).forEach(inp =>
    inp.addEventListener('change', e => {
      if (name === 'bilderstellung') {
        const fld = document.getElementById('uploadImagesField');
        if (e.target.value === 'eigen') fld.style.display = 'block';
        else { fld.style.display = 'none'; document.getElementById('imagesInput').value=''; }
      }
      next();
    })
  )
);

/* ---------- Weiter-Buttons ---------- */
document.querySelectorAll('.next-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const slide   = carouselEl.querySelector('.carousel-item.active');
    const invalid = [...slide.querySelectorAll('[required]')].some(f=>{
      if(/^(radio|checkbox)$/.test(f.type)){
        return ![...slide.querySelectorAll(`[name="${f.name}"]`)].some(i=>i.checked);
      }
      return !f.value;
    });
    if (invalid) alert('Bitte alle Pflichtfelder ausfüllen.');
    else next();
  })
);

/* ---------- Zurück ---------- */
document.querySelectorAll('.back-btn').forEach(b=>b.addEventListener('click', prev));

/* ---------- Zusammenfassung ---------- */
const row=(l,v)=>`<tr><th style="white-space:nowrap">${l}</th><td>${v||'—'}</td></tr>`;
const labelText=n=>{
  const i=document.querySelector(`input[name="${n}"]:checked`);
  return i?i.nextElementSibling.textContent.trim():'—';
};

function updateSummary(){
  const box=document.getElementById('summaryBox');
  const features=[...document.querySelectorAll('input[name="inhalte"]:checked')]
                 .map(c=>c.nextElementSibling.textContent.trim())
                 .join(', ')||'Keine';
  box.innerHTML=`
    <table class="table table-sm"><tbody>
      ${row('Paket',          labelText('paket'))}
      ${row('Seitenumfang',   labelText('umfang'))}
      ${row('Texte',          labelText('texterstellung'))}
      ${row('Bilder',         labelText('bilderstellung'))}
      ${row('Funktionen',     features)}
      ${row('Termin',         labelText('slotId'))}
      ${row('Name',           document.getElementById('nameInput').value)}
      ${row('E-Mail',         document.getElementById('emailInput').value)}
      ${row('Telefon',        document.getElementById('telefonInput').value)}
      ${row('Firma',          document.getElementById('firmaInput').value)}
      ${row('Sonstige Infos', document.querySelector('textarea[name="sonstigeInfos"]').value)}
    </tbody></table>`;
}
carouselEl.addEventListener('slide.bs.carousel',e=>{ if(e.to===8) updateSummary(); });
//       ${row('Weitere Wünsche',document.getElementById('weitereWuensche').value)}
/* ---------- Submit: ReCAPTCHA v3 ---------- */
document.getElementById('kontaktForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const token = await grecaptcha.execute(window.SITEKEY, { action:'submit' });
  e.target.token.value = token;
  e.target.submit();
});
