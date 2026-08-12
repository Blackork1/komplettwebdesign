(() => {
  'use strict';

  const appLink = document.querySelector('[data-app-link]');
  const status = document.querySelector('[data-invite-status]');
  if (!appLink || !status) return;

  const fragment = window.location.hash;
  const tokenMatch = /^#token=([A-Za-z0-9_-]{43})$/u.exec(fragment);

  if (tokenMatch) {
    appLink.setAttribute(
      'href',
      `de.komplettwebdesign.swipeandcook://shared-invite${fragment}`
    );
    status.textContent = 'Die Einladung ist bereit. Öffne sie jetzt in der App.';
  } else {
    appLink.removeAttribute('href');
    appLink.setAttribute('aria-disabled', 'true');
    status.textContent = 'Dieser Einladungslink ist unvollständig. Bitte öffne erneut die ursprüngliche E-Mail oder lasse eine neue Einladung erstellen.';
  }

  appLink.addEventListener('click', (event) => {
    if (!tokenMatch) event.preventDefault();
  });
})();
