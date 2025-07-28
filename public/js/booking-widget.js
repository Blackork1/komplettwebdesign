/* booking-widget.js – Vanilla JS */
(async () => {
    const widget = document.querySelector('.kwd-booking-widget');
    if (!widget) return;

    const container = widget.querySelector('.kwd-slot-container');
    const form = widget.querySelector('.kwd-booking-form');
    const backLink = document.createElement('div');
    backLink.className = 'kwd-back';
    backLink.textContent = '← zurück zu allen Terminen';
    widget.insertBefore(backLink, container);

    const SITEKEY = widget.dataset.sitekey;


    /* -------------------------------------------------------------- */
    /* 1 – Slots per Ajax holen                                       */
    /* -------------------------------------------------------------- */
    const res = await fetch('/api/slots?limit=3');
    const slots = await res.json();

    if (slots.length === 0) {
        container.innerHTML =
            '<p>Leider stehen momentan keine freien Termine zur Verfügung. ' +
            'Diese werden täglich neu freigegeben.</p>';
        return;
    }

    /* Slot-Cards einfügen */
    slots.forEach(s => {
        const card = document.createElement('div');
        card.className = 'kwd-slot-card';
        card.dataset.id = s.id;
        card.innerHTML =
            `<strong>${new Date(s.start_time)
                .toLocaleString('de-DE',
                    {
                        weekday: 'short', day: '2-digit',
                        month: 'short', hour: '2-digit', minute: '2-digit'
                    })}</strong>`;
        container.appendChild(card);
    });

    /* -------------------------------------------------------------- */
    /* 2 – Auswahl + Animation                                        */
    /* -------------------------------------------------------------- */
    container.addEventListener('click', e => {
        const card = e.target.closest('.kwd-slot-card');
        if (!card || card.classList.contains('selected')) return;

        [...container.children].forEach(c => {
            c.classList.toggle('selected', c === card);
            c.classList.toggle('faded', c !== card);
        });

        backLink.classList.add('visible');
        form.slotId.value = card.dataset.id;
        form.hidden = false;
    });

    backLink.addEventListener('click', () => {
        [...container.children].forEach(c => {
            c.classList.remove('selected', 'faded');
        });
        backLink.classList.remove('visible');
        form.hidden = true;
        form.reset();
    });

    /* -------------------------------------------------------------- */
    /* 3 – Form Submit (Fetch POST)                                   */
    /* -------------------------------------------------------------- */
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const token = await grecaptcha.execute(SITEKEY, { action: 'submit' });
        form.token.value = token;
        form.submit();
    });
})();
