(function () {
  const section = document.getElementById('blog-comments');
  if (!section) return;

  const slug = section.dataset.postSlug;
  const siteKey = section.dataset.recaptchaSitekey || window.SITEKEY || '';
  const form = section.querySelector('[data-comment-form]');
  const feedback = section.querySelector('[data-comment-feedback]');
  const list = section.querySelector('[data-comment-list]');
  const emptyState = section.querySelector('[data-empty-state]');
  const consentOverlay = section.querySelector('[data-consent-overlay]');
  const commentBody = section.querySelector('[data-comment-body]');
  const submitBtn = section.querySelector('[data-submit-btn]');
  const parentInput = form?.querySelector('input[name="parentId"]');
  const replyIndicator = section.querySelector('[data-reply-indicator]');
  const replyTarget = section.querySelector('[data-reply-target]');
  const cancelReplyBtn = section.querySelector('[data-cancel-reply]');

  let grecaptchaPromise = null;
  let currentConsentGranted = false;
  let currentReplyTarget = null;
  const consentMessage = 'Zum Kommentieren und Liken müssen die Cookie Einstellungen akzeptiert werden.';

  function setFeedback(message, tone = 'muted') {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('text-danger', 'text-success', 'text-muted');
    const map = { danger: 'text-danger', success: 'text-success', muted: 'text-muted' };
    feedback.classList.add(map[tone] || 'text-muted');
  }

  function toggleConsentUI(allowed) {
    currentConsentGranted = allowed;
    if (!consentOverlay || !commentBody) return;

    if (allowed) {
      consentOverlay.classList.add('d-none');
      commentBody.classList.remove('is-disabled');
      form?.querySelectorAll('input, textarea, button').forEach(el => el.removeAttribute('disabled'));
    } else {
      consentOverlay.classList.remove('d-none');
      commentBody.classList.add('is-disabled');
      form?.querySelectorAll('input, textarea, button').forEach(el => el.setAttribute('disabled', 'disabled'));
    }
  }

  function hasFullConsent() {
    const consent = window.cookieConsentState || {};
    return !!(consent.analytics && consent.marketing && consent.youtubeVideos);
  }

  function loadRecaptchaScript() {
    if (!siteKey) return Promise.reject(new Error('Kein reCAPTCHA Site-Key konfiguriert.'));
    if (grecaptchaPromise) return grecaptchaPromise;

    grecaptchaPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');
      if (existing) {
        waitForGrecaptchaReady(resolve, reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.onload = () => waitForGrecaptchaReady(resolve, reject);
      script.onerror = () => reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
      document.head.appendChild(script);
    });

    return grecaptchaPromise;
  }

  function waitForGrecaptchaReady(resolve, reject) {
    const start = Date.now();
    (function poll() {
      if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
        window.grecaptcha.ready(resolve);
      } else if (Date.now() - start > 5000) {
        reject?.(new Error('reCAPTCHA ist nicht erreichbar.'));
      } else {
        setTimeout(poll, 200);
      }
    })();
  }

  async function fetchRecaptchaToken() {
    await loadRecaptchaScript();
    if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
      throw new Error('reCAPTCHA konnte nicht initialisiert werden.');
    }
    return window.grecaptcha.execute(siteKey, { action: 'blog_comment' });
  }

  function showInlineConsentWarning(item) {
    const inlineFeedback = item?.querySelector('[data-inline-feedback]');
    if (inlineFeedback) {
      inlineFeedback.textContent = consentMessage;
    }
  }

  function beginReply(item) {
    const id = item?.dataset.commentId;
    if (!id || !parentInput) return;

    currentReplyTarget = id;
    parentInput.value = id;

    const authorName = item.querySelector('strong')?.textContent?.trim() || 'diesem Kommentar';
    if (replyIndicator && replyTarget) {
      replyIndicator.classList.remove('d-none');
      replyTarget.textContent = authorName;
    }

    commentBody?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form?.querySelector('textarea')?.focus({ preventScroll: true });
  }

  function clearReplyTarget() {
    currentReplyTarget = null;
    if (parentInput) parentInput.value = '';
    if (replyIndicator) replyIndicator.classList.add('d-none');
    if (replyTarget) replyTarget.textContent = '';
  }

  function renderComments(comments) {
    if (!list) return;
    list.innerHTML = '';

    if (!comments || !comments.length) {
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    const threads = buildThreads(comments);
    threads.forEach(thread => list.appendChild(createCommentElement(thread)));
  }

  function buildThreads(comments = []) {
    const map = new Map();
    comments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    const roots = [];
    map.forEach(comment => {
      if (comment.parent_id && map.has(comment.parent_id)) {
        map.get(comment.parent_id).replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    const sortTree = (nodes) => {
      nodes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      nodes.forEach(node => sortTree(node.replies));
    };

    sortTree(roots);
    return roots;
  }

  function createCommentElement(comment, depth = 0) {
    const item = document.createElement('article');
    item.className = 'comment-item';
    if (depth > 0) item.classList.add('comment-reply');
    item.dataset.commentId = comment.id;

    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const nameEl = document.createElement('strong');
    nameEl.textContent = comment.author_name;
    const dateEl = document.createElement('span');
    dateEl.className = 'text-muted';
    dateEl.textContent = new Date(comment.created_at).toLocaleString('de-DE');
    meta.appendChild(nameEl);
    meta.appendChild(dateEl);

    const body = document.createElement('p');
    body.className = 'comment-content';
    body.textContent = comment.content;

    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    actions.innerHTML = `
      <button type="button" data-action="like">
        👍 <span data-count="like">${comment.likes || 0}</span>
      </button>
      <button type="button" data-action="dislike">
        👎 <span data-count="dislike">${comment.dislikes || 0}</span>
      </button>
      <button type="button" data-action="reply">Antworten</button>
    `;

    const inlineFeedback = document.createElement('div');
    inlineFeedback.className = 'comment-inline-feedback';
    inlineFeedback.dataset.inlineFeedback = 'true';

    item.appendChild(meta);
    item.appendChild(body);
    item.appendChild(actions);
    item.appendChild(inlineFeedback);

    if (comment.replies?.length) {
      const childContainer = document.createElement('div');
      childContainer.className = 'comment-children';
      comment.replies.forEach(reply => childContainer.appendChild(createCommentElement(reply, depth + 1)));
      item.appendChild(childContainer);
    }

    return item;
  }

  async function loadComments() {
    try {
      const res = await fetch(`/blog/${encodeURIComponent(slug)}/comments`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Kommentare konnten nicht geladen werden.');
      const data = await res.json();
      renderComments(data.comments || []);
    } catch (err) {
      setFeedback(err.message, 'danger');
    }
  }

  function buildPayload() {
    const formData = new FormData(form);
    return {
      name: (formData.get('name') || '').toString(),
      comment: (formData.get('comment') || '').toString(),
      parentId: (formData.get('parentId') || '').toString()
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback('');

    if (!currentConsentGranted) {
      setFeedback(consentMessage, 'danger');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = buildPayload();
      const token = await fetchRecaptchaToken();
      const response = await fetch(`/blog/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, recaptchaToken: token })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Kommentar konnte nicht gespeichert werden.');

      form.reset();
      clearReplyTarget();
      setFeedback('Danke für deinen Kommentar! Er wurde gespeichert.', 'success');
      await loadComments();
    } catch (err) {
      setFeedback(err.message || 'Etwas ist schiefgelaufen.', 'danger');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleReaction(target) {
    const action = target.dataset.action;
    const item = target.closest('[data-comment-id]');
    if (!action || !item) return;

    if (!currentConsentGranted) {
      showInlineConsentWarning(item);
      setFeedback(consentMessage, 'danger');
      return;
    }

    const commentId = item.dataset.commentId;
    try {
      target.disabled = true;
      const res = await fetch(`/blog/comments/${encodeURIComponent(commentId)}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Aktion fehlgeschlagen.');

      const likeCount = item.querySelector('[data-count="like"]');
      const dislikeCount = item.querySelector('[data-count="dislike"]');
      if (likeCount) likeCount.textContent = data.stats?.likes ?? 0;
      if (dislikeCount) dislikeCount.textContent = data.stats?.dislikes ?? 0;

      const inlineFeedback = item.querySelector('[data-inline-feedback]');
      if (inlineFeedback) inlineFeedback.textContent = '';

      item.querySelectorAll('[data-action]').forEach(btn => {
        btn.dataset.active = btn.dataset.action === action ? 'true' : 'false';
      });
    } catch (err) {
      setFeedback(err.message, 'danger');
    } finally {
      target.disabled = false;
    }
  }

  function attachListeners() {
    if (form) form.addEventListener('submit', handleSubmit);

    const textarea = form?.querySelector('textarea');
    if (textarea) {
      ['focus', 'click'].forEach(evt => textarea.addEventListener(evt, loadRecaptchaScript, { once: true }));
    }

    if (list) {
      list.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        if (action === 'like' || action === 'dislike') {
          handleReaction(target);
        } else if (action === 'reply') {
          const commentEl = target.closest('[data-comment-id]');
          if (!currentConsentGranted) {
            showInlineConsentWarning(commentEl);
            setFeedback(consentMessage, 'danger');
            return;
          }
          beginReply(commentEl);
        }
      });
    }

    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', clearReplyTarget);
    }

    document.addEventListener('cookieConsentUpdate', () => {
      const allowed = hasFullConsent();
      toggleConsentUI(allowed);
      loadComments();
    });
  }

  function init() {
    const allowed = hasFullConsent();
    toggleConsentUI(allowed);
    attachListeners();
    loadComments();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();