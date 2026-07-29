(function setupSwipeAndCookAccountDeletion() {
  'use strict';

  var root = document.querySelector('[data-swipedeletion-root]');
  if (!root) return;

  var requestForm = document.getElementById('swipe-deletion-request-form');
  var verificationForm = document.getElementById('swipe-deletion-verification-form');
  var status = root.querySelector('[data-swipedeletion-status]');
  var requestEndpoint = root.getAttribute('data-request-endpoint') || '';
  var verificationEndpoint = root.getAttribute('data-verification-endpoint') || '';
  var requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var tokenPattern = /^[A-Za-z0-9_-]{43}$/;

  function setStatus(message, tone) {
    status.textContent = message;
    status.dataset.tone = tone || 'info';
  }

  function csrfToken(form) {
    return form.querySelector('input[name="_csrf"]')?.value || '';
  }

  function setSubmitting(form, submitting) {
    var submit = form.querySelector('button[type="submit"]');
    if (!submit) return;
    submit.disabled = submitting;
    submit.setAttribute('aria-busy', submitting ? 'true' : 'false');
  }

  async function postJson(endpoint, form, body) {
    var response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken(form)
      },
      body: JSON.stringify(body)
    });
    var result = await response.json().catch(function () {
      return {};
    });
    return { response: response, result: result };
  }

  function showVerificationFromLink() {
    var query = new URLSearchParams(window.location.search);
    var externalRequestId = query.get('request') || '';
    var token = query.get('token') || '';
    if (!externalRequestId && !token) return;

    if (!requestIdPattern.test(externalRequestId) || !tokenPattern.test(token)) {
      setStatus('Der Verifizierungslink ist ungültig oder unvollständig. Fordere bitte einen neuen Link an.', 'error');
      return;
    }

    verificationForm.elements.externalRequestId.value = externalRequestId;
    verificationForm.elements.token.value = token;
    verificationForm.hidden = false;
    requestForm.hidden = true;
    setStatus('Der Verifizierungslink wurde erkannt. Gib deine Kontoadresse erneut ein und bestätige die gewünschte Löschart.', 'info');

    window.history.replaceState({}, document.title, window.location.pathname);
    verificationForm.elements.email.focus();
  }

  function syncImmediateConfirmation() {
    var immediate = verificationForm.elements.mode.value === 'immediate';
    var confirmation = verificationForm.elements.confirmPaidAccessLoss;
    confirmation.required = immediate;
    confirmation.closest('.swipe-deletion-confirm').hidden = !immediate;
    if (!immediate) confirmation.checked = false;
  }

  requestForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!requestForm.reportValidity()) return;

    setSubmitting(requestForm, true);
    setStatus('Die Anfrage wird sicher übermittelt …', 'info');
    try {
      var outcome = await postJson(requestEndpoint, requestForm, {
        email: requestForm.elements.email.value.trim(),
        website: requestForm.elements.website.value
      });
      if (!outcome.response.ok) {
        throw new Error(outcome.result.error || 'request_failed');
      }
      requestForm.reset();
      setStatus('Wenn die Adresse zu einem Konto gehört, erhältst du in Kürze einen einmal verwendbaren Verifizierungslink.', 'success');
    } catch (_error) {
      setStatus('Die Anfrage konnte gerade nicht übermittelt werden. Versuche es später erneut oder kontaktiere den Support.', 'error');
    } finally {
      setSubmitting(requestForm, false);
    }
  });

  verificationForm.addEventListener('change', function (event) {
    if (event.target?.name === 'mode') syncImmediateConfirmation();
  });

  verificationForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    syncImmediateConfirmation();
    if (!verificationForm.reportValidity()) return;

    setSubmitting(verificationForm, true);
    setStatus('Die verifizierte Löschanfrage wird übermittelt …', 'info');
    try {
      var mode = verificationForm.elements.mode.value;
      var outcome = await postJson(verificationEndpoint, verificationForm, {
        externalRequestId: verificationForm.elements.externalRequestId.value,
        email: verificationForm.elements.email.value.trim(),
        token: verificationForm.elements.token.value,
        mode: mode,
        confirmPaidAccessLoss:
          mode === 'immediate'
          && verificationForm.elements.confirmPaidAccessLoss.checked
      });
      if (!outcome.response.ok) {
        if (outcome.response.status === 400) {
          setStatus('Der Verifizierungslink ist ungültig, abgelaufen oder bereits verwendet. Fordere bitte einen neuen Link an.', 'error');
          return;
        }
        throw new Error(outcome.result.error || 'verification_failed');
      }
      verificationForm.reset();
      verificationForm.hidden = true;
      requestForm.hidden = false;
      setStatus('Die Verifizierung wurde angenommen. Wenn ein Konto besteht, wurde der Löschauftrag sicher angelegt.', 'success');
    } catch (_error) {
      setStatus('Die Löschanfrage konnte gerade nicht abgeschlossen werden. Versuche es später erneut oder kontaktiere den Support.', 'error');
    } finally {
      setSubmitting(verificationForm, false);
    }
  });

  syncImmediateConfirmation();
  showVerificationFromLink();
})();
