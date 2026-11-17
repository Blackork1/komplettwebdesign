document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.getElementById("menu-icon");
  const navLinks = document.getElementById("nav-links");
  const navBar = document.getElementById("navigation");
  const backdrop = document.getElementById("mobile-nav-backdrop");
  const closeButton = document.getElementById("mobile-nav-close");

  if (!menuIcon || !navLinks || !navBar) {
    return;
  }

  const dropdownItems = navLinks.querySelectorAll(".dropdown");
  const dropdownLinks = navLinks.querySelectorAll(".dropdown .dropdown-toggle > a");
  const dropdownButtons = navLinks.querySelectorAll(".dropdown .dropdown-toggle-btn");
  const mobileQuery = window.matchMedia("(max-width: 1180px)");
  let closeTimer = null;

  const applyMobilePanelPosition = (isOpen, { immediate = false } = {}) => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (!mobileQuery.matches) {
      navLinks.classList.remove("is-closing");
      return;
    }

    if (isOpen) {
      navLinks.classList.remove("is-closing");
      return;
    }

    if (immediate) {
      navLinks.classList.remove("is-closing");
      return;
    }

    navLinks.classList.add("is-closing");
    closeTimer = window.setTimeout(() => {
      if (!navLinks.classList.contains("active") && mobileQuery.matches) {
        navLinks.classList.remove("is-closing");
      }
    }, 340);
  };

  const closeAllDropdowns = (exception = null) => {
    dropdownItems.forEach((item) => {
      if (item !== exception) {
        item.classList.remove("is-open");
        const button = item.querySelector(".dropdown-toggle-btn");
        if (button) button.setAttribute("aria-expanded", "false");
      }
    });
  };

  const setMenuState = (isOpen) => {
    navLinks.classList.toggle("active", isOpen);
    navBar.classList.toggle("active", isOpen);
    document.body.classList.toggle("mobile-nav-open", isOpen);
    navLinks.setAttribute("aria-hidden", String(!isOpen && mobileQuery.matches));
    applyMobilePanelPosition(isOpen);
    menuIcon.setAttribute("aria-expanded", String(isOpen));
    menuIcon.setAttribute(
      "aria-label",
      isOpen
        ? (menuIcon.dataset.labelClose || "Hauptnavigation schließen")
        : (menuIcon.dataset.labelOpen || "Hauptnavigation öffnen")
    );

    if (backdrop) {
      backdrop.hidden = !isOpen;
    }

    if (!isOpen || !mobileQuery.matches) {
      closeAllDropdowns();
    }
  };

  menuIcon.addEventListener("click", function () {
    setMenuState(!navLinks.classList.contains("active"));
  });

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      setMenuState(false);
      menuIcon.focus();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setMenuState(false);
    });
  }

  const toggleDropdown = (event, target, { allowNavigation = false } = {}) => {
    if (!mobileQuery.matches) {
      return;
    }

    const parent = target.closest(".dropdown");
    if (!parent) {
      return;
    }

    if (allowNavigation && parent.classList.contains("is-open")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (parent.classList.contains("is-open")) {
      parent.classList.remove("is-open");
      const button = parent.querySelector(".dropdown-toggle-btn");
      if (button) button.setAttribute("aria-expanded", "false");
      return;
    }
    closeAllDropdowns(parent);
    parent.classList.add("is-open");
    const button = parent.querySelector(".dropdown-toggle-btn");
    if (button) button.setAttribute("aria-expanded", "true");
  };

  dropdownLinks.forEach((link) => {
    link.addEventListener("click", function (event) {
      toggleDropdown(event, link, { allowNavigation: true });
    });

    link.addEventListener(
      "touchstart",
      function (event) {
        toggleDropdown(event, link, { allowNavigation: true });
      },
      { passive: false }
    );
  });

  dropdownButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      toggleDropdown(event, button);
    });

    button.addEventListener(
      "touchstart",
      function (event) {
        toggleDropdown(event, button);
      },
      { passive: false }
    );
  });

  document.addEventListener("click", function (event) {
    if (mobileQuery.matches && !event.target.closest(".dropdown")) {
      closeAllDropdowns();
    }

    if (
      mobileQuery.matches &&
      navBar.classList.contains("active") &&
      !navLinks.contains(event.target) &&
      !menuIcon.contains(event.target)
    ) {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && navLinks.classList.contains("active")) {
      setMenuState(false);
      menuIcon.focus();
    }
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", function (event) {
      if (!event.matches) {
        setMenuState(false);
        navLinks.removeAttribute("aria-hidden");
      } else {
        navLinks.setAttribute("aria-hidden", String(!navLinks.classList.contains("active")));
        applyMobilePanelPosition(navLinks.classList.contains("active"), { immediate: true });
      }
    });
  }

  applyMobilePanelPosition(false, { immediate: true });
});

/* Kopfleiste beim Herunterscrollen ausblenden, beim Hochscrollen wieder einblenden.
   Liest nur scrollY (passiv, einmal pro Frame) und schaltet eine Klasse; die Animation
   selbst ist ein transform in main.css (.site-header--hidden). */
(function () {
  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    const minDelta = 8;
    let headerHeight = 0;
    let lastY = Math.max(window.scrollY, 0);
    let isHidden = false;
    let frameRequested = false;

    const setHidden = (hidden) => {
      if (hidden === isHidden) {
        return;
      }
      isHidden = hidden;
      header.classList.toggle("site-header--hidden", hidden);
    };

    const update = () => {
      frameRequested = false;
      const y = Math.max(window.scrollY, 0);
      if (!headerHeight) {
        headerHeight = header.offsetHeight;
      }

      // Ganz oben und bei geöffnetem Handymenü immer sichtbar.
      if (y <= headerHeight || document.body.classList.contains("mobile-nav-open")) {
        setHidden(false);
        lastY = y;
        return;
      }

      const delta = y - lastY;
      if (Math.abs(delta) < minDelta) {
        return;
      }
      setHidden(delta > 0);
      lastY = y;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!frameRequested) {
          frameRequested = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        headerHeight = 0;
      },
      { passive: true }
    );

    // Wer per Tastatur in die Leiste springt, soll sie auch sehen.
    header.addEventListener("focusin", () => setHidden(false));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeaderScroll);
  } else {
    initHeaderScroll();
  }
})();
