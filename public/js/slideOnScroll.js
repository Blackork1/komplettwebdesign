// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  // 1) Elemente selektieren
  const els          = document.querySelectorAll('.animate-on-scroll');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  // 2) Schwellwerte je nach Fensterbreite
  const showThreshold = window.innerWidth < 1200
    ? 0.1    // Mobile: 20% sichtbar → einblenden
    : 0.7;   // Desktop: erst ab 70% sichtbar

  const hideThreshold = showThreshold * 0.5;
  // z. B. showThreshold=0.7 → hideThreshold=0.35.
  // wir verstecken erst, wenn nur noch <35% sichtbar sind

  // 3) Callback-Funktion
  const callback = entries => {
    entries.forEach(entry => {
      const prev     = isVisibleMap.get(entry.target) || false;
      const ratio    = entry.intersectionRatio;
      const el       = entry.target;

      // a) Zustand “unsichtbar → sichtbar”?
      if (!prev && ratio >= showThreshold) {
        el.classList.add('visible');
        el.classList.remove('out');
        isVisibleMap.set(el, true);

      // b) Zustand “sichtbar → unsichtbar”?
      } else if (prev && ratio <= hideThreshold) {
        el.classList.remove('visible');
        el.classList.add('out');
        isVisibleMap.set(el, false);
      }
      // Zwischenzone: kein Umschalten → kein Flackern
    });
  };

  // 4) Observer mit mehreren Threshold-Stufen, damit intersectionRatio korrekt reported wird
  const observer = new IntersectionObserver(callback, {
    threshold: [0, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  els.forEach(el => {
    isVisibleMap.set(el, false);
    observer.observe(el);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // 1) Elemente selektieren
  const animateLeft          = document.querySelectorAll('.animate-on-scroll-left');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  // 2) Schwellwerte je nach Fensterbreite
  const showThreshold = window.innerWidth < 1200
    ? 0.1    // Mobile: 20% sichtbar → einblenden
    : 0.7;   // Desktop: erst ab 70% sichtbar

  const hideThreshold = showThreshold * 0.5;
  // z. B. showThreshold=0.7 → hideThreshold=0.35.
  // wir verstecken erst, wenn nur noch <35% sichtbar sind

  // 3) Callback-Funktion
  const callback = entries => {
    entries.forEach(entry => {
      const prev     = isVisibleMap.get(entry.target) || false;
      const ratio    = entry.intersectionRatio;
      const al       = entry.target;

      // a) Zustand “unsichtbar → sichtbar”?
      if (!prev && ratio >= showThreshold) {
        al.classList.add('visible');
        al.classList.remove('out');
        isVisibleMap.set(al, true);

      // b) Zustand “sichtbar → unsichtbar”?
      } else if (prev && ratio <= hideThreshold) {
        al.classList.remove('visible');
        al.classList.add('out');
        isVisibleMap.set(al, false);
      }
      // Zwischenzone: kein Umschalten → kein Flackern
    });
  };

  // 4) Observer mit mehreren Threshold-Stufen, damit intersectionRatio korrekt reported wird
  const observer = new IntersectionObserver(callback, {
    threshold: [0, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  animateLeft.forEach(al => {
    isVisibleMap.set(al, false);
    observer.observe(al);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // 1) Elemente selektieren
  const animateRight          = document.querySelectorAll('.animate-on-scroll-right');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  // 2) Schwellwerte je nach Fensterbreite
  const showThreshold = window.innerWidth < 1200
    ? 0.1    // Mobile: 20% sichtbar → einblenden
    : 0.7;   // Desktop: erst ab 70% sichtbar

  const hideThreshold = showThreshold * 0.5;
  // z. B. showThreshold=0.7 → hideThreshold=0.35.
  // wir verstecken erst, wenn nur noch <35% sichtbar sind

  // 3) Callback-Funktion
  const callback = entries => {
    entries.forEach(entry => {
      const prev     = isVisibleMap.get(entry.target) || false;
      const ratio    = entry.intersectionRatio;
      const ar       = entry.target;

      // a) Zustand “unsichtbar → sichtbar”?
      if (!prev && ratio >= showThreshold) {
        ar.classList.add('visible');
        ar.classList.remove('out');
        isVisibleMap.set(ar, true);

      // b) Zustand “sichtbar → unsichtbar”?
      } else if (prev && ratio <= hideThreshold) {
        ar.classList.remove('visible');
        ar.classList.add('out');
        isVisibleMap.set(ar, false);
      }
      // Zwischenzone: kein Umschalten → kein Flackern
    });
  };

  // 4) Observer mit mehreren Threshold-Stufen, damit intersectionRatio korrekt reported wird
  const observer = new IntersectionObserver(callback, {
    threshold: [0, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  animateRight.forEach(ar => {
    isVisibleMap.set(ar, false);
    observer.observe(ar);
  });
});