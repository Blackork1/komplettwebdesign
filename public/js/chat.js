document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('chat-toggle');
  const closeBtn = document.getElementById('chat-close');
  const container = document.getElementById('chat-container');
  const windowDiv = document.getElementById('chat-window');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  // Appendet eine Nachricht in den Chat
  function appendMessage(role, msg) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'text-end mb-2' : 'text-start mb-2';
    div.innerHTML = `<strong>${role === 'user' ? 'Ich' : 'Bot'}:</strong> ${msg}`;
    windowDiv.append(div);
    windowDiv.scrollTop = windowDiv.scrollHeight;
  }

  // 1) Alte Nachrichten vom Server laden
  (async () => {
    try {
      const res = await fetch('/chat/history');
      const rows = await res.json();
      for (const { role, message } of rows) {
        appendMessage(role, message);
      }
    } catch (err) {
      console.error('Konnte Chat-Historie nicht laden', err);
    }
  })();

  // 2) Toggle (öffnen)
  toggleBtn.addEventListener('click', () => {
    toggleBtn.style.display = 'none';
    container.style.display = 'flex';
    // ensure the transition runs after display change
    requestAnimationFrame(() => container.classList.add('open'));

    // Begrüßung nur beim allerersten Öffnen
    if (!sessionStorage.getItem('chatGreeted')) {
      appendMessage('bot', 'Hallo, ich bin dein Chat-Bot und stehe dir bei Fragen zur Seite.');
      sessionStorage.setItem('chatGreeted', 'true');
    }
  });

  // 3) Schließen
  closeBtn.addEventListener('click', () => {
    container.classList.remove('open');
    // wait for slide-out transition before hiding completely
    setTimeout(() => {
      container.style.display = 'none';
      toggleBtn.style.display = 'block';
    }, 300);
  });

  // 4) Nachricht senden
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    appendMessage('user', q);
    input.value = '';

    // an neuen Endpoint senden
    const res = await fetch('/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q })
    });
    const { answer } = await res.json();
    appendMessage('bot', answer);
  });
});
