// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  // 1) Referenzen auf alle benötigten Elemente
  const progressFill = document.querySelector('.progress-fill');
  const iconLinks    = document.querySelectorAll('.icon-link');
  const sections     = document.querySelectorAll('section[id]');

  // 2) Scroll-Fortschritts-Balken von oben→unten füllen
  function updateProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
    const ratio        = scrollTop / scrollHeight;
    progressFill.style.height = `${ratio * 100}%`;
  }

  // 3) Icons entlang der Progress-Line pixelgenau positionieren
  function positionIcons() {
    const progressLine = document.querySelector('.progress-line');
    const containerH   = progressLine.clientHeight;
    const scrollLength = document.documentElement.scrollHeight - window.innerHeight;

    sections.forEach(sec => {
      const link = document.querySelector(`.icon-link[href="#${sec.id}"]`);
      if (!link) return;
      // Verhältnis der Section-Top-Position zur gesamt Scroll-Strecke
      let ratio = sec.offsetTop / scrollLength;
      ratio = Math.min(Math.max(ratio, 0), 1);
      link.style.top = `${ratio * 100}%`;
    });
  }

  // 4) Active-Icon bestimmen über den geringsten Abstand
  //    zwischen Section-Mitte und Viewport-Mitte
  function updateActiveSection() {
    const viewportCenter = window.innerHeight / 2;
    let minDistance = Infinity;
    let activeLink = null;

    sections.forEach(sec => {
      const link = document.querySelector(`.icon-link[href="#${sec.id}"]`);
      if (!link) return;
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

  // 5) Alles in einem Aufruf bündeln
  function onUpdate() {
    updateProgress();
    positionIcons();
    updateActiveSection();
  }

  // 6) Event-Listener registrieren
  window.addEventListener('load',      onUpdate);
  window.addEventListener('scroll',    onUpdate);
  window.addEventListener('resize',    onUpdate);
  window.addEventListener('hashchange', () => {
    // nach Sprung zu Anker kurz warten, dann synchronisieren
    setTimeout(onUpdate, 50);
  });
});
