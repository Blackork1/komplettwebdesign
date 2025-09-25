  // Accordion-Logik: exakt eine Card „open“
  (function() {
    const cards = document.querySelectorAll('.statCard');

    function openCard(target) {
      cards.forEach(card => {
        const header = card.querySelector('.statHeader');
        const body = card.querySelector('.statBody');
        const isOpen = card === target;

        card.classList.toggle('is-open', isOpen);
        header.setAttribute('aria-expanded', String(isOpen));
        body.setAttribute('aria-hidden', String(!isOpen));
      });
    }

    cards.forEach(card => {
      const header = card.querySelector('.statHeader');
      header.addEventListener('click', () => openCard(card));
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard(card);
        }
      });
    });

    // Initial sicherstellen: erste Card offen
    if (cards.length) {
      openCard(cards[0]);
    }
  })();