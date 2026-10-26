// public/js/progressSlider.js

document.addEventListener('DOMContentLoaded', () => {
  // 1) Referenzen auf alle benötigten Elemente
  const progressFill = document.querySelector('.progress-fill');
  const progressLine = document.querySelector('.progress-line');
  const iconLinks    = document.querySelectorAll('.icon-link');
  const sections     = document.querySelectorAll('section[id]');
  if (!progressFill || !progressLine) return;

  // Pro Section das zugehörige Icon einmal heraussuchen
  const entries = Array.from(sections)
    .map(sec => ({ sec, link: document.querySelector(`.icon-link[href="#${sec.id}"]`) }))
    .filter(entry => entry.link);

  // 2) Scroll-Fortschritts-Balken von oben→unten füllen.
  //    transform statt height: läuft auf der Grafikkarte, ohne Layout neu zu berechnen.
  function updateProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
    const ratio        = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    progressFill.style.setProperty('--progress-scale', Math.min(Math.max(ratio, 0), 1).toFixed(4));
  }

  // 3) Icons entlang der Progress-Line pixelgenau positionieren.
  //    Symbole, die näher als MIN_ICON_GAP am vorherigen sitzen, werden ausgeblendet:
  //    Tippflächen dürfen sich nicht überlappen (Barrierefreiheit, mindestens 24 px).
  //    Erst alle Positionen messen, dann schreiben (sonst rechnet der Browser je Icon das Layout neu).
  const MIN_ICON_GAP = 28;
  function positionIcons() {
    const containerH   = progressLine.clientHeight;
    const scrollLength = document.documentElement.scrollHeight - window.innerHeight;
    const ratios = entries.map(({ sec }) => {
      // Verhältnis der Section-Top-Position zur gesamt Scroll-Strecke
      const ratio = scrollLength > 0 ? sec.offsetTop / scrollLength : 0;
      return Math.min(Math.max(ratio, 0), 1);
    });

    let lastVisibleTop = -Infinity;
    entries.forEach(({ link }, index) => {
      const ratio = ratios[index];
      link.style.setProperty('--progress-icon-top', `${ratio * 100}%`);
      const topPx = ratio * containerH;
      const crowded = topPx - lastVisibleTop < MIN_ICON_GAP;
      link.classList.toggle('is-crowded', crowded);
      if (!crowded) lastVisibleTop = topPx;
    });
  }

  // 4) Active-Icon bestimmen über den geringsten Abstand
  //    zwischen Section-Mitte und Viewport-Mitte
  function updateActiveSection() {
    const viewportCenter = window.innerHeight / 2;
    let minDistance = Infinity;
    let activeLink = null;

    entries.forEach(({ sec, link }) => {
      const rect = sec.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        activeLink = link;
      }
    });

    iconLinks.forEach(link => {
      link.classList.toggle('active', link === activeLink);
    });
  }

  // 5) Beim Scrollen nur Balken und aktives Icon, höchstens einmal pro Bild.
  //    Die Icon-Positionen ändern sich nur, wenn sich die Seitenlänge ändert.
  let scrollFrame = 0;
  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      updateProgress();
      updateActiveSection();
    });
  }

  function onLayoutChange() {
    positionIcons();
    updateProgress();
    updateActiveSection();
  }

  // 6) Event-Listener registrieren
  window.addEventListener('load',      onLayoutChange);
  window.addEventListener('scroll',    onScroll, { passive: true });
  window.addEventListener('resize',    onLayoutChange);
  window.addEventListener('hashchange', () => {
    // nach Sprung zu Anker kurz warten, dann synchronisieren
    setTimeout(onLayoutChange, 50);
  });
});
