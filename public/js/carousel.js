  (function() {
    const root = document.getElementById('kwdSlider');
    if (!root) return;

    const stage = root.querySelector('.kwd-carousel-stage');
    const prev = root.querySelector('.kwd-btn.prev');
    const next = root.querySelector('.kwd-btn.next');
    const dots = Array.from(root.querySelectorAll('.kwd-dots .dot'));
    let cards = Array.from(stage.querySelectorAll('.kwd-card')); // genau 5 in deinem aktuellen Markup

    const POS = ['pos--far-left', 'pos--left', 'pos--center', 'pos--right', 'pos--far-right'];

    function applyPositions() {
      cards.forEach(card => POS.forEach(p => card.classList.remove(p)));
      cards.forEach((card, i) => card.classList.add(POS[i]));
      updateDots();
    }

    function updateDots() {
      const center = cards[2];
      const idx = parseInt(center.getAttribute('data-index'), 10) || 0;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
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

    // Klick-Events
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
      });
    });

    // --- Swipe/Drag (Pointer Events: Touch & Maus) ---
    let dragging = false;
    let startX = 0,
      startY = 0,
      lastX = 0,
      startT = 0,
      dx = 0,
      dy = 0;

    const MIN_SWIPE_PX = 50; // Strecke für „langsamen“ Swipe
    const FLICK_MS = 250; // wenn schneller als 250ms, reichen ~30px
    const FLICK_PX = 30;
    const H_DOMINANCE = 1.2; // horizontale Dominanz: |dx| > 1.2*|dy|
    const DRAG_FEEL = 0.25; // wie stark die Bühne beim Ziehen mitgeht

    function setDrag(x) {
      stage.style.setProperty('--dragX', x + 'px');
    }

    function onPointerDown(e) {
      // nur Hauptbutton
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startT = performance.now();
      dx = dy = 0;
      stage.classList.add('dragging');
      root.classList.add('dragging');
      // Pointer-Capture, damit wir die Bewegung behalten
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    function onPointerMove(e) {
      if (!dragging) return;
      lastX = e.clientX;
      dx = lastX - startX;
      dy = e.clientY - startY;

      // Leichtes Mitschieben der Bühne für Feedback
      setDrag(dx * DRAG_FEEL);
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;

      const elapsed = performance.now() - startT;
      const absX = Math.abs(dx),
        absY = Math.abs(dy);

      // Bühne zurückschnappen
      stage.classList.remove('dragging');
      root.classList.remove('dragging');
      setDrag(0);

      // Swipe-Entscheidung (horizontal dominant + genug Strecke/Speed)
      const horizontal = absX > absY * H_DOMINANCE;
      const isSwipe = horizontal && (absX >= MIN_SWIPE_PX || (elapsed <= FLICK_MS && absX >= FLICK_PX));

      if (isSwipe) {
        if (dx < 0) {
          // nach links gezogen → nächste Karte in die Mitte
          slideLeft();
        } else {
          // nach rechts gezogen → vorherige Karte in die Mitte
          slideRight();
        }
      }
      dx = dy = 0;

      try {
        stage.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    // Pointer-Listener (funktioniert für Touch + Maus)
    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Tastatur als Bonus
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        slideRight();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        slideLeft();
      }
    });

    // Initial
    updateDots();
  })();