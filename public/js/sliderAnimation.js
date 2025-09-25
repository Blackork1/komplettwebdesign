(function () {
  const wrap = document.querySelector('[data-slider]');
  if (!wrap) return;

  const track = wrap.querySelector('[data-track]') || wrap.querySelector('.horizontalSlider');
  const prev = wrap.querySelector('.sliderArrow.prev');
  const next = wrap.querySelector('.sliderArrow.next');
  const dotsC = wrap.querySelector('[data-dots]');
  const items = Array.from(track.querySelectorAll('.sliderItem'));

  function getStep() {
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.gap || cs.columnGap || '0');
    const w = items[0]?.getBoundingClientRect().width || 0;
    return w + gap;
  }

  function maxIndex() {
    const step = getStep();
    const maxByScroll = Math.floor((track.scrollWidth - track.clientWidth) / step);
    return Math.min(items.length - 1, Math.max(0, maxByScroll));
  }

  function curIndex() {
    return Math.round(track.scrollLeft / getStep());
  }

  function scrollToIndex(i) {
    track.scrollTo({
      left: i * getStep(),
      behavior: 'smooth'
    });
  }

  function buildDots() {
    dotsC.innerHTML = '';
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Slide ${i + 1}`);
      b.addEventListener('click', () => scrollToIndex(i));
      dotsC.appendChild(b);
    });
  }

  function updateUISEO() {
    const i = curIndex();
    prev.disabled = (i <= 0);
    next.disabled = (i >= maxIndex());
    dotsC.querySelectorAll('button').forEach((d, idx) =>
      d.setAttribute('aria-selected', String(idx === i))
    );
  }

  prev.addEventListener('click', () => scrollToIndex(Math.max(0, curIndex() - 1)));
  next.addEventListener('click', () => scrollToIndex(Math.min(maxIndex(), curIndex() + 1)));

  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateUISEO);
  }, {
    passive: true
  });

  window.addEventListener('resize', () => {
    // nach Resize sauber auf den aktuellen Snap ausrichten
    scrollToIndex(curIndex());
    updateUISEO();
  });

  buildDots();
  updateUISEO();
})();

// Vorteile Slider
(function () {
  const datawrap = document.querySelector('[data-vorteile]');
  if (!datawrap) return;

  const track = datawrap.querySelector('.horizontalSliderVorteile');
  const prev = datawrap.querySelector('.sliderArrow.prev');
  const next = datawrap.querySelector('.sliderArrow.next');
  const dotsC = datawrap.querySelector('[data-dots]'); // optional

  if (!track || !prev || !next) return;

  const EPS = 1; // Toleranz in px gegen Rundungsfehler

  const items = Array.from(track.querySelectorAll('.vorteileHeaderItem'));

  function getStep() {
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.gap || cs.columnGap || '0');
    const w = items[0]?.getBoundingClientRect().width || 0;
    return w + gap;
  }

  function isAtStart() {
    return track.scrollLeft <= EPS;
  }

  function isAtEnd() {
    return track.scrollWidth - track.clientWidth - track.scrollLeft <= EPS;
  }

  function updateUIVorteile() {
    prev.disabled = isAtStart();
    next.disabled = isAtEnd();

    if (dotsC) {
      const i = Math.min(items.length - 1, Math.round(track.scrollLeft / getStep()));
      dotsC.querySelectorAll('button').forEach((d, idx) =>
        d.setAttribute('aria-selected', String(idx === i))
      );
    }
  }

  function scrollByStep(dir) {
    const target = Math.min(
      Math.max(0, track.scrollLeft + dir * getStep()),
      track.scrollWidth - track.clientWidth
    );
    track.scrollTo({ left: target, behavior: 'smooth' });
  }

  function buildDots() {
    if (!dotsC) return;
    dotsC.innerHTML = '';
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Slide ${i + 1}`);
      b.addEventListener('click', () => {
        const step = getStep();
        const target = Math.min(i * step, track.scrollWidth - track.clientWidth);
        track.scrollTo({ left: target, behavior: 'smooth' });
      });
      dotsC.appendChild(b);
    });
  }

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));

  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateUIVorteile);
  }, { passive: true });

  window.addEventListener('resize', () => {
    // Wenn das Layout springt, UI-Zustand neu berechnen
    updateUIVorteile();
  });

  buildDots();
  updateUIVorteile();
})();

// Tipps Slider
(function () {
  const datawrap = document.querySelector('[data-tips]');
  if (!datawrap) return;

  const track = datawrap.querySelector('.horizontalSliderTips');
  const prev = datawrap.querySelector('.sliderArrow.prev');
  const next = datawrap.querySelector('.sliderArrow.next');
  const dotsC = datawrap.querySelector('[data-dots]'); // optional

  if (!track || !prev || !next) return;

  const EPS = 1; // Toleranz in px gegen Rundungsfehler

  const items = Array.from(track.querySelectorAll('.tippsItem'));

  function getStep() {
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.gap || cs.columnGap || '0');
    const w = items[0]?.getBoundingClientRect().width || 0;
    return w + gap;
  }

  function maxIndex() {
    const step = getStep();
    const maxByScroll = Math.floor((track.scrollWidth - track.clientWidth) / step);
    return Math.min(items.length - 1, Math.max(0, maxByScroll));
  }

  function curIndex() {
    return Math.round(track.scrollLeft / getStep());
  }

  function scrollToIndex(i) {
    track.scrollTo({
      left: i * getStep(),
      behavior: 'smooth'
    });
  }

  function buildDots() {
    dotsC.innerHTML = '';
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Slide ${i + 1}`);
      b.addEventListener('click', () => scrollToIndex(i));
      dotsC.appendChild(b);
    });
  }

  function updateUITipps() {
    const i = curIndex();
    prev.disabled = (i <= 0);
    next.disabled = (i >= maxIndex());
    dotsC.querySelectorAll('button').forEach((d, idx) =>
      d.setAttribute('aria-selected', String(idx === i))
    );
  }

  prev.addEventListener('click', () => scrollToIndex(Math.max(0, curIndex() - 1)));
  next.addEventListener('click', () => scrollToIndex(Math.min(maxIndex(), curIndex() + 1)));

  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateUITipps);
  }, {
    passive: true
  });

  window.addEventListener('resize', () => {
    // nach Resize sauber auf den aktuellen Snap ausrichten
    scrollToIndex(curIndex());
    updateUITipps();
  });

  buildDots();
  updateUITipps();
})();

(function () {
  const datawrap = document.querySelector('[data-funktionen]');
  if (!datawrap) return;

  const track = datawrap.querySelector('.horizontalSliderFunktionen');
  const prev = datawrap.querySelector('.funktionenArrow.prev');
  const next = datawrap.querySelector('.funktionenArrow.next');
  const dotsC = datawrap.querySelector('[data-dots-funktionen]'); // optional

  if (!track || !prev || !next) return;

  const EPS = 1; // Toleranz in px gegen Rundungsfehler

  const items = Array.from(track.querySelectorAll('.itemScrollFunktionen'));

  function getStep() {
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.gap || cs.columnGap || '0');
    const w = items[0]?.getBoundingClientRect().width || 0;
    return w + gap;
  }

  function maxIndex() {
    const step = getStep();
    const maxByScroll = Math.floor((track.scrollWidth - track.clientWidth) / step);
    return Math.min(items.length - 1, Math.max(0, maxByScroll));
  }

  function curIndex() {
    return Math.round(track.scrollLeft / getStep());
  }

  function scrollToIndex(i) {
    track.scrollTo({
      left: i * getStep(),
      behavior: 'smooth'
    });
  }

  function buildDots() {
    dotsC.innerHTML = '';
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Slide ${i + 1}`);
      b.addEventListener('click', () => scrollToIndex(i));
      dotsC.appendChild(b);
    });
  }

  function updateUIFunktionen() {
    const i = curIndex();
    prev.disabled = (i <= 0);
    next.disabled = (i >= maxIndex());
    dotsC.querySelectorAll('button').forEach((d, idx) =>
      d.setAttribute('aria-selected', String(idx === i))
    );
  }

  prev.addEventListener('click', () => scrollToIndex(Math.max(0, curIndex() - 1)));
  next.addEventListener('click', () => scrollToIndex(Math.min(maxIndex(), curIndex() + 1)));

  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateUIFunktionen);
  }, {
    passive: true
  });

  window.addEventListener('resize', () => {
    // nach Resize sauber auf den aktuellen Snap ausrichten
    scrollToIndex(curIndex());
    updateUIFunktionen();
  });

  buildDots();
  updateUIFunktionen();
})();
