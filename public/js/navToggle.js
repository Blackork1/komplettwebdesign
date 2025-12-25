document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.getElementById("menu-icon");
  const navLinks = document.getElementById("nav-links");
  const navBar = document.getElementById("navigation");

  if (!menuIcon || !navLinks || !navBar) {
    return;
  }

  const dropdownItems = navLinks.querySelectorAll(".dropdown");
  const dropdownLinks = navLinks.querySelectorAll(".dropdown .dropdown-toggle > a");
  const dropdownButtons = navLinks.querySelectorAll(".dropdown .dropdown-toggle-btn");
  const mobileQuery = window.matchMedia("(max-width: 1180px)");

  const closeAllDropdowns = (exception = null) => {
    dropdownItems.forEach((item) => {
      if (item !== exception) {
        item.classList.remove("is-open");
      }
    });
  };



  menuIcon.addEventListener("click", function () {
    navLinks.classList.toggle("active");
    navBar.classList.toggle("active");

    if (!navLinks.classList.contains("active")) {
      closeAllDropdowns();
    }
  });

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
      return;
    }
    closeAllDropdowns(parent);
    parent.classList.add("is-open");
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

    if (navBar.classList.contains("active") && !navBar.contains(event.target)) {
      navLinks.classList.remove("active");
      navBar.classList.remove("active");
      closeAllDropdowns();

    }
  });
});