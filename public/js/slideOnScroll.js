// public/js/main.js

function onPageLoaded(callback) {
  if (document.readyState === 'complete') {
    callback();
  } else {
    window.addEventListener('load', callback, { once: true });
  }
}

const revealTargetSelector = '.animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right';

function markVisible(el) {
  el.classList.add('visible');
  el.classList.remove('out');
}

function revealImmediately(selector) {
  document.querySelectorAll(selector).forEach((root) => {
    markVisible(root);
    root.querySelectorAll(revealTargetSelector).forEach(markVisible);
  });
}

function shouldRevealImmediately(el) {
  return el.hasAttribute('data-reveal-immediate') || Boolean(el.closest('[data-reveal-immediate]'));
}

function getRevealThresholds() {
  const showThreshold = window.innerWidth < 1200 ? 0.08 : 0.14;
  return {
    showThreshold,
    hideThreshold: showThreshold * 0.45
  };
}

onPageLoaded(() => {
  // 1) Elemente selektieren
  const els          = document.querySelectorAll('.animate-on-scroll');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  revealImmediately('[data-reveal-immediate]');

  // 2) Schwellwerte je nach Fensterbreite
  const { showThreshold, hideThreshold } = getRevealThresholds();

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
    threshold: [0, 0.01, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  els.forEach(el => {
    if (shouldRevealImmediately(el)) {
      markVisible(el);
      isVisibleMap.set(el, true);
      return;
    }

    isVisibleMap.set(el, false);
    observer.observe(el);
  });
});

onPageLoaded(() => {
  // 1) Elemente selektieren
  const animateLeft          = document.querySelectorAll('.animate-on-scroll-left');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  // 2) Schwellwerte je nach Fensterbreite
  const { showThreshold, hideThreshold } = getRevealThresholds();

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
    threshold: [0, 0.01, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  animateLeft.forEach(al => {
    if (shouldRevealImmediately(al)) {
      markVisible(al);
      isVisibleMap.set(al, true);
      return;
    }

    isVisibleMap.set(al, false);
    observer.observe(al);
  });
});

onPageLoaded(() => {
  // 1) Elemente selektieren
  const animateRight          = document.querySelectorAll('.animate-on-scroll-right');
  const isVisibleMap = new WeakMap();  // speichert pro Element den letzten Sichtbarkeitszustand

  // 2) Schwellwerte je nach Fensterbreite
  const { showThreshold, hideThreshold } = getRevealThresholds();

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
    threshold: [0, 0.01, hideThreshold, showThreshold, 1]
  });

  // 5) Jedes Ziel-Element initialisieren und beobachten
  animateRight.forEach(ar => {
    if (shouldRevealImmediately(ar)) {
      markVisible(ar);
      isVisibleMap.set(ar, true);
      return;
    }

    isVisibleMap.set(ar, false);
    observer.observe(ar);
  });
});
