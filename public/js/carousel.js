(function () {
  const root = document.getElementById('kwdSlider');
  if (!root) return;

  const stage = root.querySelector('.kwd-carousel-stage');
  const prev = root.querySelector('.kwd-btn.prev');
  const next = root.querySelector('.kwd-btn.next');
  const dotsWrap = root.querySelector('.kwd-dots') || root.querySelector('.sliderDots');
  const dots = Array.from(root.querySelectorAll('.kwd-dots .dot, .sliderDots > button, .sliderDots .dot'));
  let cards = Array.from(stage.querySelectorAll('.kwd-card')); // genau 5 in deinem aktuellen Markup

  const POS = ['pos--far-left', 'pos--left', 'pos--center', 'pos--right', 'pos--far-right'];

  // ---- A11y: Grundrollen am Carousel
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
    root.setAttribute('aria-label', 'Bildkarussell');
  }

  if (dotsWrap) {
    dotsWrap.setAttribute('role', 'tablist');
    if (!dotsWrap.hasAttribute('aria-label') && !dotsWrap.hasAttribute('aria-labelledby')) {
      dotsWrap.setAttribute('aria-label', 'Slides');
    }
  }

  // IDs sicherstellen (für aria-controls / aria-labelledby)
  function ensureId(el, prefix) {
    if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
    return el.id;
  }

  // ---- A11y: Slides (Tabpanels) und Dots (Tabs) verknüpfen
  // Wir mappen über data-index, damit die Verknüpfung stabil bleibt.
  cards.forEach((card) => {
    const i = parseInt(card.getAttribute('data-index'), 10) || 0;
    const slideId = ensureId(card, 'kwdSlide');
    card.setAttribute('role', 'tabpanel');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `Slide ${i + 1} von ${cards.length}`);
    // aria-labelledby wird nachher gesetzt, sobald die Tabs IDs haben
  });

  dots.forEach((dot, i) => {
    dot.setAttribute('role', 'tab');
    dot.setAttribute('type', 'button');
    const tabId = ensureId(dot, 'kwdTab');
    // passende Karte via data-index suchen
    const panel = cards.find((c) => (parseInt(c.getAttribute('data-index'), 10) || 0) === i);
    if (panel) {
      dot.setAttribute('aria-controls', ensureId(panel, 'kwdSlide'));
      panel.setAttribute('aria-labelledby', tabId);
    }
  });

  function applyPositions() {
    cards.forEach(card => POS.forEach(p => card.classList.remove(p)));
    cards.forEach((card, i) => card.classList.add(POS[i]));
    updateDots();
  }

  function updateDots() {
    const center = cards[2];
    const idx = parseInt(center.getAttribute('data-index'), 10) || 0;

    dots.forEach((d, i) => {
      const selected = i === idx;
      d.classList.toggle('active', selected);
      d.setAttribute('aria-selected', selected ? 'true' : 'false');
      d.setAttribute('tabindex', selected ? '0' : '-1');
    });

    // Optional: aktives Panel für Screenreader kenntlich machen
    cards.forEach((panel) => {
      const i = parseInt(panel.getAttribute('data-index'), 10) || 0;
      const hidden = i !== idx;
      panel.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    });
  }

  function slideLeft() {
    const first = cards.shift();
    cards.push(first);
    applyPositions();
  }

  function slideRight() {
    const last = cards.pop();
    cards.unshift(last);
    applyPositions();
  }

  // Klick-Events Pfeile
  if (prev) prev.addEventListener('click', slideRight);
  if (next) next.addEventListener('click', slideLeft);

  // Dots → direkt zum Ziel rotieren (über "weiter")
  dots.forEach((dot, target) => {
    dot.addEventListener('click', () => {
      let safety = 10;
      while (safety-- > 0) {
        const centerIdx = parseInt(cards[2].getAttribute('data-index'), 10);
        if (centerIdx === target) break;
        slideLeft();
      }
      // Fokus auf den aktiven Tab halten (roving tabindex)
      dot.focus();
    });
  });

  // --- Tastatur-Navigation auf Dots (Tab-Pattern)
  if (dotsWrap) {
    dotsWrap.addEventListener('keydown', (e) => {
      const current = dots.indexOf(document.activeElement);
      if (current === -1) return;

      let target = null;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          target = (current - 1 + dots.length) % dots.length;
          dots[target].focus();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          target = (current + 1) % dots.length;
          dots[target].focus();
          break;
        case 'Home':
          e.preventDefault();
          dots[0].focus();
          break;
        case 'End':
          e.preventDefault();
          dots[dots.length - 1].focus();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          document.activeElement.click();
          break;
      }
    });
  }

  // --- Swipe/Drag (Pointer Events: Touch & Maus) ---
  let dragging = false;
  let startX = 0, startY = 0, lastX = 0, startT = 0, dx = 0, dy = 0;

  const MIN_SWIPE_PX = 50; // Strecke für „langsamen“ Swipe
  const FLICK_MS = 250;    // wenn schneller als 250ms, reichen ~30px
  const FLICK_PX = 30;
  const H_DOMINANCE = 1.2; // horizontale Dominanz: |dx| > 1.2*|dy|
  const DRAG_FEEL = 0.25;  // wie stark die Bühne beim Ziehen mitgeht

  function setDrag(x) {
    stage.style.setProperty('--dragX', x + 'px');
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startX = lastX = e.clientX;
    startY = e.clientY;
    startT = performance.now();
    dx = dy = 0;
    stage.classList.add('dragging');
    root.classList.add('dragging');
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (!dragging) return;
    lastX = e.clientX;
    dx = lastX - startX;
    dy = e.clientY - startY;
    setDrag(dx * DRAG_FEEL);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;

    const elapsed = performance.now() - startT;
    const absX = Math.abs(dx), absY = Math.abs(dy);

    stage.classList.remove('dragging');
    root.classList.remove('dragging');
    setDrag(0);

    const horizontal = absX > absY * H_DOMINANCE;
    const isSwipe = horizontal && (absX >= MIN_SWIPE_PX || (elapsed <= FLICK_MS && absX >= FLICK_PX));

    if (isSwipe) {
      if (dx < 0) slideLeft();
      else slideRight();
    }
    dx = dy = 0;

    try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Tastatur als Bonus für die gesamte Bühne
  root.tabIndex = 0;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); slideRight(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); slideLeft(); }
  });

  // Initial
  applyPositions(); // ruft intern updateDots()
})();
