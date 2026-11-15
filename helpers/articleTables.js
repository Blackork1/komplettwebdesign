import * as cheerio from 'cheerio';

// Eine Tabelle behält ihre Inhalte und Semantik. Auf kleinen Bildschirmen
// stehen die Spaltenbezeichnungen direkt über dem jeweiligen Wert.
export function prepareArticleTables(html) {
  const source = String(html || '');
  if (!/<table\b/i.test(source)) return source;
  const $ = cheerio.load(source, null, false);
  let changed = false;

  $('table').each((_, element) => {
    const table = $(element);
    if (table.hasClass('rg-responsive-table') || table.find('table').length) return;
    const headerRows = table.children('thead').children('tr');
    const headers = headerRows.children('th');
    const rows = table.children('tbody').children('tr');
    const labels = headers.toArray().map(header => $(header).text().replace(/\s+/g, ' ').trim());
    const spans = table.find('[colspan], [rowspan]').toArray().some(cell =>
      ['colspan', 'rowspan'].some(attribute => $(cell).attr(attribute) && $(cell).attr(attribute) !== '1')
    );

    // Mehrstufige Tabellen brauchen ihr vollständiges Spaltenraster.
    // Diese bleiben horizontal scrollbar, statt falsche Labels zu bekommen.
    if (headerRows.length !== 1 || headers.length < 2 || !rows.length
        || headerRows.children('th, td').length !== headers.length
        || labels.some(label => !label) || spans || table.children('tfoot').length
        || rows.toArray().some(row => $(row).children('th, td').length !== headers.length)) return;

    table.addClass('rg-responsive-table').attr('role', 'table');
    table.closest('.table-responsive').addClass('rg-table-scroll');
    table.children('thead, tbody').attr('role', 'rowgroup');
    headerRows.attr('role', 'row');
    headers.attr('scope', 'col').attr('role', 'columnheader');
    rows.each((_, row) => {
      $(row).attr('role', 'row').children('th, td').each((column, element) => {
        const cell = $(element);
        const isHeader = element.tagName === 'th';
        cell.attr('role', isHeader ? 'rowheader' : 'cell');
        if (isHeader) cell.attr('scope', 'row');
        if (column === 0) {
          cell.addClass('rg-table-row-title');
          return;
        }

        const value = $('<div class="rg-table-value"></div>').append(cell.contents());
        const label = $('<span class="rg-table-label" aria-hidden="true"></span>').text(labels[column]);
        cell.empty().append(label, value);
      });
    });
    changed = true;
  });

  return changed ? $.html() : source;
}
