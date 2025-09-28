// sliderAnimation.js (robuste Init + einheitliche Logik)
(function () {
  // Warten bis Layout/CSS sicher da ist
  function afterLayout(cb) {
    if (document.readyState === "complete") {
      requestAnimationFrame(cb);
    } else {
      window.addEventListener(
        "load",
        () => requestAnimationFrame(cb),
        { once: true }
      );
    }
  }

  function initSlider(rootSel, trackSel, itemSel, prevSel, nextSel, dotsSel) {
    const root  = document.querySelector(rootSel);
    if (!root) return;

    const track = root.querySelector(trackSel);
    const prev  = root.querySelector(prevSel);
    const next  = root.querySelector(nextSel);
    const dotsC = dotsSel ? root.querySelector(dotsSel) : null;
    if (!track || !prev || !next) return;

    const EPS = 1;
    let items = Array.from(track.querySelectorAll(itemSel));
    if (!items.length) return;

    function getStep() {
      const cs = getComputedStyle(track);
      const gap = parseFloat(cs.gap || cs.columnGap || "0") || 0;
      const w   = items[0]?.getBoundingClientRect().width || 0;
      return w + gap; // kann bei sehr früher Init 0 sein
    }

    function isAtStart() {
      return track.scrollLeft <= EPS;
    }
    function isAtEnd() {
      return track.scrollWidth - track.clientWidth - track.scrollLeft <= EPS;
    }

    function updateUI() {
      // ← nur am Anfang disabled, → nur am Ende disabled
      prev.disabled = isAtStart();
      next.disabled = isAtEnd();

      if (dotsC) {
        const step = getStep();
        if (step > 0) {
          const i = Math.min(items.length - 1, Math.round(track.scrollLeft / step));
          dotsC.querySelectorAll("button").forEach((d, idx) =>
            d.setAttribute("aria-selected", String(idx === i))
          );
        }
      }
    }

    function scrollByStep(dir) {
      const step   = Math.max(1, getStep()); // niemals 0
      const target = Math.min(
        Math.max(0, track.scrollLeft + dir * step),
        track.scrollWidth - track.clientWidth
      );
      track.scrollTo({ left: target, behavior: "smooth" });
    }

    function buildDots() {
      if (!dotsC) return;
      dotsC.innerHTML = "";
      items.forEach((_, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", `Slide ${i + 1}`);
        b.addEventListener("click", () => {
          const step   = Math.max(1, getStep());
          const target = Math.min(i * step, track.scrollWidth - track.clientWidth);
          track.scrollTo({ left: target, behavior: "smooth" });
        });
        dotsC.appendChild(b);
      });
    }

    prev.addEventListener("click", () => scrollByStep(-1));
    next.addEventListener("click", () => scrollByStep(1));

    let raf;
    track.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateUI);
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      items = Array.from(track.querySelectorAll(itemSel)); // falls Layout/Anzahl sich ändern
      updateUI();
    });

    buildDots();
    updateUI(); // jetzt ist ← zu Beginn zuverlässig disabled
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

    // Funktionen-Slider (alle 6 Items mitnehmen!)
    initSlider(
      "[data-funktionen]",
      ".horizontalSliderFunktionen",
      ".itemScrollFunktionen",               // <- statt .itemScrollFunktionen
      ".funktionenArrow.prev",
      ".funktionenArrow.next",
      "[data-dots-funktionen]"
    );
  });
})();
