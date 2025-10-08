import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';

const monthLabel = document.querySelector('.month-label');
const grid = document.querySelector('.grid-days');
const btns = document.querySelectorAll('.cal-header .nav');
const slotList = document.querySelector('.slot-list');
const selectedDateEl = document.querySelector('.selected-date');
const hint = document.querySelector('.hint');

let current = new Date(); // aktueller Monat
current.setDate(1); // auf Monatsersten

function pad2(n){ return String(n).padStart(2,'0'); }
function fmtDate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

async function loadMonth(d){
  const ym = `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  monthLabel.textContent = new Intl.DateTimeFormat('de-DE', { month:'long', year:'numeric' }).format(d);

  // Monatsraster bauen
  grid.innerHTML = '';
  const start = new Date(d);
  const firstWeekday = (start.getDay() + 7) % 7; // 0=So
  for (let i=0; i<firstWeekday; i++){
    const div = document.createElement('div');
    div.className = 'day empty';
    grid.appendChild(div);
  }

  // Verfügbarkeit holen
  const resp = await fetch(`/admin/api/calendar?month=${ym}`);
  const data = await resp.json();
  const has = new Set(data.days.map(o => o.date)); // YYYY-MM-DD, hat freie Slots

  const endTmp = new Date(d);
  endTmp.setMonth(endTmp.getMonth()+1);
  endTmp.setDate(0); // letzter Tag des Monats
  const last = endTmp.getDate();

  for (let day=1; day<=last; day++){
    const cell = document.createElement('div');
    const dateStr = `${ym}-${pad2(day)}`;
    const today = new Date(); today.setHours(0,0,0,0);
    const cellDate = new Date(d.getFullYear(), d.getMonth(), day);

    cell.className = 'day';
    const hasFree = has.has(dateStr);
    cell.textContent = day;

    if (!hasFree){
      cell.classList.add('muted');            // grau
    } else {
      cell.classList.add('has-free');         // schwarz + clickable
      cell.addEventListener('click', ()=> selectDay(dateStr, cell));
    }

    grid.appendChild(cell);
  }
}

async function selectDay(dateStr, el){
  grid.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');

  selectedDateEl.textContent = new Intl.DateTimeFormat('de-DE', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric'
  }).format(new Date(dateStr));
  hint.style.display = 'none';

  slotList.innerHTML = '<li style="opacity:.7">Lade Zeiten…</li>';

  const resp = await fetch(`/admin/api/day-slots?date=${dateStr}`);
  const slots = await resp.json();

  if (!slots.length){
    slotList.innerHTML = '<li style="opacity:.7">Keine freien Termine an diesem Tag.</li>';
    return;
  }

  slotList.innerHTML = '';
  for (const s of slots){
    const li = document.createElement('li');
    li.className = 'slot';
    const t = new Date(s.start_time).toLocaleTimeString('de-DE',{ hour:'2-digit', minute:'2-digit' });

    li.innerHTML = `
      <span class="slot-time">${t}</span>
      <button class="slot-del" title="Termin löschen" data-id="${s.id}">×</button>
    `;
    li.querySelector('.slot-del').addEventListener('click', async (e)=>{
      e.preventDefault();
      if (!confirm('Diesen freien Termin löschen?')) return;

      // per POST auf die bestehende Delete-Route
      const formData = new URLSearchParams();
      formData.set('_', '1'); // Dummy
      const res = await fetch(`/admin/appointments/${s.id}/delete`, {
        method: 'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      if (res.ok){
        li.remove();
        // Wenn rechts nichts mehr steht → Tag im Raster grau machen
        if (!slotList.children.length){
          const cell = document.querySelector('.day.selected');
          cell?.classList.remove('has-free','selected');
          cell?.classList.add('muted');
        }
      } else {
        alert('Löschen fehlgeschlagen.');
      }
    });

    slotList.appendChild(li);
  }
}

btns.forEach(b=>{
  b.addEventListener('click', ()=>{
    const dir = b.dataset.dir === '+1' ? 1 : -1;
    current.setMonth(current.getMonth() + dir);
    loadMonth(current);
    // rechte Spalte zurücksetzen
    selectedDateEl.textContent = '–';
    slotList.innerHTML = '';
    document.querySelector('.hint').style.display = '';
  });
});

// Start
loadMonth(current);
