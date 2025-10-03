// sliderAnimation.js — A11y-ready Tabs (Dots) für alle horizontalen Slider
(function () {
  // Warten bis Layout/CSS sicher da ist
  function afterLayout(cb) {
    if (document.readyState === "complete") {
      requestAnimationFrame(cb);
    } else {
      window.addEventListener("load", () => requestAnimationFrame(cb), { once: true });
    }
  }

  // Hilfen
  function ensureId(el, prefix) {
    if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
    return el.id;
  }

  function initOne(rootEl, trackSel, itemSel, prevSel, nextSel, dotsSel) {
    const track = rootEl.querySelector(trackSel);
    const prev  = rootEl.querySelector(prevSel);
    const next  = rootEl.querySelector(nextSel);
    const dotsC = dotsSel ? rootEl.querySelector(dotsSel) : null;

    if (!track || !prev || !next) return;

    let items = Array.from(track.querySelectorAll(itemSel));
    if (!items.length) return;

    // ARIA: Root optional als Carousel kenntlich machen
    rootEl.setAttribute("role", "region");
    rootEl.setAttribute("aria-roledescription", "carousel");

    // Slides mit ARIA versehen (werden von Tabs gesteuert)
    items.forEach((panel, i) => {
      ensureId(panel, "kwdPanel");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-roledescription", "slide");
      panel.setAttribute("aria-label", `Slide ${i + 1} von ${items.length}`);
    });

    // Schrittweite ermitteln (Itembreite + Gap)
    const EPS = 1;
    function getStep() {
      const cs  = getComputedStyle(track);
      const gap = parseFloat(cs.gap || cs.columnGap || "0") || 0;
      const w   = items[0]?.getBoundingClientRect().width || 0;
      return w + gap;
    }

    function atStart() { return track.scrollLeft <= EPS; }
    function atEnd() {
      return track.scrollWidth - track.clientWidth - track.scrollLeft <= EPS;
    }

    // Dots (Tabs) erstellen
    function buildDots() {
      if (!dotsC) return;
      dotsC.innerHTML = "";

      // Container sicher als Tablist markieren
      if (!dotsC.hasAttribute("role")) dotsC.setAttribute("role", "tablist");
      if (!dotsC.hasAttribute("aria-label") && !dotsC.hasAttribute("aria-labelledby")) {
        dotsC.setAttribute("aria-label", "Slides");
      }

      items.forEach((panel, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", `Slide ${i + 1}`);
        // Verknüpfung Tab ↔ Panel
        const pid = ensureId(panel, "kwdPanel");
        const tid = ensureId(b, "kwdTab");
        b.setAttribute("aria-controls", pid);
        panel.setAttribute("aria-labelledby", tid);

        // Default: inaktiv; aktiver Zustand wird in updateUI gesetzt
        b.setAttribute("aria-selected", "false");
        b.setAttribute("tabindex", "-1");

        b.addEventListener("click", () => {
          const step   = Math.max(1, getStep());
          const max    = Math.max(0, track.scrollWidth - track.clientWidth);
          const target = Math.min(i * step, max);
          track.scrollTo({ left: target, behavior: "smooth" });
          b.focus(); // roving tabindex: Fokus bleibt auf aktivem Tab
        });

        dotsC.appendChild(b);
      });

      // Keyboard-Navigation (Tabs-Pattern)
      dotsC.addEventListener("keydown", (e) => {
        const tabs = Array.from(dotsC.querySelectorAll('[role="tab"]'));
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) return;

        let t = null;
        switch (e.key) {
          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault(); e.stopPropagation();
            t = (current - 1 + tabs.length) % tabs.length; break;
          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault(); e.stopPropagation();
            t = (current + 1) % tabs.length; break;
          case "Home":
            e.preventDefault(); e.stopPropagation();
            t = 0; break;
          case "End":
            e.preventDefault(); e.stopPropagation();
            t = tabs.length - 1; break;
          case " ":
          case "Enter":
            e.preventDefault(); e.stopPropagation();
            document.activeElement.click(); return;
        }
        if (t !== null) tabs[t].focus();
      });
    }

    // UI-Status (Pfeile, active Tab/Panel)
    function updateUI() {
      prev.disabled = atStart();
      next.disabled = atEnd();

      const step = getStep();
      if (!dotsC || step <= 0) return;

      // aktives "Slide" via Scrollposition bestimmen
      const i = Math.min(items.length - 1, Math.round(track.scrollLeft / step));
      const tabs = dotsC.querySelectorAll('[role="tab"]');

      tabs.forEach((tab, idx) => {
        const active = idx === i;
        tab.setAttribute("aria-selected", String(active));
        tab.setAttribute("tabindex", active ? "0" : "-1");
      });

      items.forEach((panel, idx) => {
        panel.setAttribute("aria-hidden", idx === i ? "false" : "true");
      });
    }

    // Scrollen per Pfeil
    function scrollByStep(dir) {
      const step   = Math.max(1, getStep());
      const max    = Math.max(0, track.scrollWidth - track.clientWidth);
      const target = Math.min(Math.max(0, track.scrollLeft + dir * step), max);
      track.scrollTo({ left: target, behavior: "smooth" });
    }

    prev.addEventListener("click", () => scrollByStep(-1));
    next.addEventListener("click", () => scrollByStep(1));

    let raf;
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateUI);
    }, { passive: true });

    window.addEventListener("resize", () => {
      items = Array.from(track.querySelectorAll(itemSel)); // falls Layout/Anzahl sich ändern
      updateUI();
    });

    buildDots();
    // Initialzustand: erstes Tab fokussierbar/selected, Pfeile korrekt
    updateUI();
  }

  function initSlider(rootSel, trackSel, itemSel, prevSel, nextSel, dotsSel) {
    const roots = document.querySelectorAll(rootSel);
    roots.forEach(rootEl => initOne(rootEl, trackSel, itemSel, prevSel, nextSel, dotsSel));
  }

  afterLayout(() => {
    // SEO-Slider
    initSlider(
      "[data-slider]",
      ".horizontalSlider",
      ".sliderItem",
      ".sliderArrow.prev",
      ".sliderArrow.next",
      "[data-dots]"
    );

    // Vorteile-Slider
    initSlider(
      "[data-vorteile]",
      ".horizontalSliderVorteile",
      ".vorteileHeaderItem",
      ".sliderArrow.prev",
      ".sliderArrow.next",
      "[data-dots]"
    );

    // Tipps-Slider
    initSlider(
      "[data-tips]",
      ".horizontalSliderTips",
      ".tippsItem",
      ".sliderArrow.prev",
      ".sliderArrow.next",
      "[data-dots]"
    );

    // Funktionen-Slider – WICHTIG: alle Items nehmen (nicht .itemScrollFunktionen)
    initSlider(
      "[data-funktionen]",
      ".horizontalSliderFunktionen",
      ".itemScrollFunktionen",
      ".funktionenArrow.prev",
      ".funktionenArrow.next",
      "[data-dots-funktionen]"
    );
  });
})();
