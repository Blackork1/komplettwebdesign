export const mockPackages = [
    {
        id: 1,
        name: 'Basis',
        slug: 'basis',
        description:
            'Ideal für den schnellen Start: ein moderner Onepager mit klarer Struktur, Kontaktmöglichkeiten und optimierten Ladezeiten.',
        image: 'basis.webp',
        price_amount_cents: 49900,
        price: null,
        display: true,
        features: [
            'Responsive Onepager mit Start, Leistungen, Über uns & Kontakt',
            'Integration von Kontaktformular & DSGVO-konformen Rechtstexten',
            'Technische Einrichtung inkl. Hosting, SSL & Performance-Optimierung'
        ]
    },
    {
        id: 2,
        name: 'Business',
        slug: 'business',
        description:
            'Für Unternehmen, die wachsen möchten: Mehrseiten-Auftritt mit Content-Strategie, klaren Conversion-Strecken und SEO-Basics.',
        image: 'business.webp',
        price_amount_cents: 89900,
        price: null,
        display: true,
        features: [
            'Mehrseitige Unternehmens-Website mit individuellen Landingpages',
            'Conversion-orientierte Texte, Keyword-Research & OnPage-SEO',
            'Optionaler Blog-/Newsbereich, Terminbuchung oder Schnittstellen'
        ]
    },
    {
        id: 3,
        name: 'Premium',
        slug: 'premium',
        description:
            'Das Rundum-sorglos-Paket mit Strategie-Workshops, hochwertigem Content, Automationen und laufender Betreuung.',
        image: 'premium.webp',
        price_amount_cents: 149900,
        price: null,
        display: true,
        features: [
            'UX- und Markenworkshop, Zielgruppenanalyse & Customer-Journey-Mapping',
            'Hochwertige Content-Produktion (Texte, Visuals, Animationen, ggf. Fotos)',
            'Fortlaufende Betreuung mit A/B-Tests, Tracking & Performance-Optimierung'
        ]
    }
];

export default mockPackages;