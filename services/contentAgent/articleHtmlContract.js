export const ARTICLE_CTA_LOCATIONS = Object.freeze([
  'blog_early',
  'blog_mid',
  'blog_final'
]);

export const ALLOWED_ARTICLE_CLASSES = Object.freeze([
  'container',
  'container-fluid',
  'container-sm',
  'container-md',
  'container-lg',
  'container-xl',
  'container-xxl',
  'row',
  'col',
  'col-12',
  'col-lg-12',
  'my-4',
  'my-5',
  'mb-3',
  'mb-4',
  'mb-5',
  'mt-4',
  'p-4',
  'rounded',
  'bg-light',
  'border',
  'alert',
  'alert-primary',
  'table-responsive',
  'table',
  'table-striped',
  'list-group',
  'list-group-item',
  'btn',
  'btn-primary',
  'btn-secondary',
  'lead'
]);

export function buildArticleHtmlContract() {
  return [
    'VERBINDLICHER ARTIKEL-HTML-VERTRAG:',
    'Erzeuge ein statisches HTML-Fragment ohne H1, äußeren Bootstrap-Container, EJS, Skripte, Bilder, Inline-Styles oder eigene CSS-Klassen.',
    `Verwende ausschließlich diese freigegebenen CSS-Klassen: ${ALLOWED_ARTICLE_CLASSES.join(', ')}.`,
    'Kein Accordion, keine Card-Komponenten und keine anderen als die ausdrücklich freigegebenen Klassen.',
    'Erzeuge genau drei CTA in der Reihenfolge blog_early, blog_mid, blog_final. Jeder CTA muss auf /kontakt verlinken und exakt dieses Attributmuster verwenden:',
    '<div class="alert alert-primary p-4 my-4" data-track="cta" data-cta-name="blog_early_contact" data-cta-location="blog_early"><p>KONTEXTBEZOGENER_TEXT</p><a class="btn btn-primary" href="/kontakt">PASSENDER_LINKTEXT</a></div>',
    'Ersetze für den mittleren und letzten CTA sowohl blog_early in data-cta-name als auch in data-cta-location durch blog_mid beziehungsweise blog_final.',
    'Erzeuge fünf bis sieben sichtbare FAQ. Jeder FAQ-Eintrag muss exakt dieses Muster verwenden:',
    '<div class="mb-3" data-faq-question="EXAKTE_FRAGE" data-faq-answer="EXAKTE_ANTWORT"><h3>EXAKTE_FRAGE</h3><p>EXAKTE_ANTWORT</p></div>',
    'FAQ-Attributwerte, sichtbare Frage und Antwort sowie faqJson müssen nach HTML-Dekodierung exakt und in derselben Reihenfolge übereinstimmen.',
    'Gib keine erklärenden Platzhalter aus; ersetze alle Großbuchstaben-Platzhalter im tatsächlichen Artikel durch konkrete Inhalte.'
  ].join('\n');
}
