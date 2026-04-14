import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_LEFT = 50;
const PAGE_MARGIN_RIGHT = 50;
const BODY_START_Y = 766;
const BODY_END_Y = 58;
const HEADER_DIVIDER_Y = 785;
const FOOTER_DIVIDER_Y = 42;
const MAX_CHARS_PER_LINE = 92;
const DEFAULT_LOGO_PATH = path.resolve(process.cwd(), 'public/images/icon32.png');

const WIN_ANSI_MAP = new Map([
  [0x20AC, 0x80],
  [0x201A, 0x82],
  [0x0192, 0x83],
  [0x201E, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02C6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8A],
  [0x2039, 0x8B],
  [0x0152, 0x8C],
  [0x017D, 0x8E],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02DC, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9A],
  [0x203A, 0x9B],
  [0x0153, 0x9C],
  [0x017E, 0x9E],
  [0x0178, 0x9F]
]);

function localeFrom(raw) {
  return raw === 'en' ? 'en' : 'de';
}

function normalizeTypography(value = '') {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodeWinAnsi(text = '') {
  const bytes = [];
  for (const char of String(text || '')) {
    const code = char.codePointAt(0);
    if (code >= 0x20 && code <= 0xFF) {
      bytes.push(code);
      continue;
    }
    if (WIN_ANSI_MAP.has(code)) {
      bytes.push(WIN_ANSI_MAP.get(code));
      continue;
    }
    if (code === 0x09) {
      bytes.push(0x20);
      continue;
    }
    bytes.push(0x3F);
  }
  return Buffer.from(bytes);
}

function textToPdfHex(value = '') {
  return encodeWinAnsi(normalizeTypography(value)).toString('hex').toUpperCase();
}

function wrapText(rawText = '', maxChars = MAX_CHARS_PER_LINE) {
  const text = normalizeTypography(rawText);
  if (!text) return [''];

  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    if (word.length > maxChars) {
      const chunks = word.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [word];
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] || '';
    } else {
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function styleForKind(kind = 'body') {
  switch (kind) {
    case 'title':
      return { font: 'F2', size: 15, leading: 18, maxChars: 76, x: PAGE_MARGIN_LEFT };
    case 'subtitle':
      return { font: 'F1', size: 10.5, leading: 14, maxChars: 88, x: PAGE_MARGIN_LEFT };
    case 'section':
      return { font: 'F2', size: 12, leading: 15, maxChars: 86, x: PAGE_MARGIN_LEFT };
    case 'subsection':
      return { font: 'F2', size: 10.5, leading: 14, maxChars: 86, x: PAGE_MARGIN_LEFT };
    case 'bullet':
      return { font: 'F1', size: 10, leading: 13, maxChars: 86, x: PAGE_MARGIN_LEFT + 8 };
    case 'small':
      return { font: 'F1', size: 9, leading: 12, maxChars: 96, x: PAGE_MARGIN_LEFT };
    case 'spacer':
      return { font: 'F1', size: 10, leading: 8, maxChars: 0, x: PAGE_MARGIN_LEFT };
    default:
      return { font: 'F1', size: 10, leading: 13, maxChars: 92, x: PAGE_MARGIN_LEFT };
  }
}

function classifyLine(raw = '') {
  const line = String(raw || '');
  if (!line.trim()) return { kind: 'spacer', text: '' };
  if (line.startsWith('# ')) return { kind: 'title', text: line.slice(2) };
  if (line.startsWith('## ')) return { kind: 'section', text: line.slice(3) };
  if (line.startsWith('### ')) return { kind: 'subsection', text: line.slice(4) };
  if (line.startsWith('- ')) return { kind: 'bullet', text: line };
  return { kind: 'body', text: line };
}

function wrapLineItems(items = []) {
  const wrapped = [];
  for (const item of items) {
    const style = styleForKind(item.kind);
    if (item.kind === 'spacer') {
      wrapped.push({ ...item, wrappedText: '' });
      continue;
    }
    const parts = wrapText(item.text || '', style.maxChars || MAX_CHARS_PER_LINE);
    parts.forEach((part) => wrapped.push({ ...item, wrappedText: part }));
  }
  return wrapped;
}

function paginateItems(items = []) {
  const pages = [];
  let page = [];
  let currentY = BODY_START_Y;

  for (const item of items) {
    const style = styleForKind(item.kind);
    const nextY = currentY - style.leading;

    if (nextY < BODY_END_Y && page.length) {
      pages.push(page);
      page = [];
      currentY = BODY_START_Y;
    }

    page.push(item);
    currentY -= style.leading;
  }

  if (!pages.length && !page.length) pages.push([]);
  if (page.length) pages.push(page);
  return pages;
}

function buildPdfPageStream(lines = [], options = {}) {
  const commands = [];
  const {
    generatedAt = '',
    reportWebsite = '',
    pageNumber = 1,
    pageCount = 1,
    locale = 'de',
    includeLogo = false
  } = options;

  if (includeLogo) {
    commands.push('q');
    commands.push(`24 0 0 24 ${PAGE_MARGIN_LEFT} 790 cm`);
    commands.push('/Im1 Do');
    commands.push('Q');
  }

  commands.push('BT');
  commands.push('/F2 11 Tf');
  commands.push(`${includeLogo ? PAGE_MARGIN_LEFT + 32 : PAGE_MARGIN_LEFT} 807 Td`);
  commands.push(`<${textToPdfHex('Komplett Webdesign')}> Tj`);
  commands.push('ET');

  if (generatedAt) {
    commands.push('BT');
    commands.push('/F1 9 Tf');
    commands.push(`${PAGE_WIDTH - PAGE_MARGIN_RIGHT - 140} 807 Td`);
    commands.push(`<${textToPdfHex(generatedAt)}> Tj`);
    commands.push('ET');
  }

  commands.push('0.82 G');
  commands.push(`${PAGE_MARGIN_LEFT} ${HEADER_DIVIDER_Y} m ${PAGE_WIDTH - PAGE_MARGIN_RIGHT} ${HEADER_DIVIDER_Y} l S`);
  commands.push('0 G');

  let currentY = BODY_START_Y;
  for (const item of lines) {
    const style = styleForKind(item.kind);
    if (item.kind !== 'spacer') {
      commands.push('BT');
      commands.push(`/${style.font} ${style.size} Tf`);
      commands.push(`${style.x} ${currentY} Td`);
      commands.push(`<${textToPdfHex(item.wrappedText || '')}> Tj`);
      commands.push('ET');
    }
    currentY -= style.leading;
  }

  commands.push('0.82 G');
  commands.push(`${PAGE_MARGIN_LEFT} ${FOOTER_DIVIDER_Y} m ${PAGE_WIDTH - PAGE_MARGIN_RIGHT} ${FOOTER_DIVIDER_Y} l S`);
  commands.push('0 G');

  const footerWebsiteLabel = localeFrom(locale) === 'en' ? 'Website:' : 'Website:';
  const pageLabel = localeFrom(locale) === 'en' ? 'Page' : 'Seite';
  const footerLeft = `${footerWebsiteLabel} ${reportWebsite || 'https://komplettwebdesign.de'}`;
  const footerRight = `${pageLabel} ${pageNumber}/${pageCount}`;

  commands.push('BT');
  commands.push('/F1 9 Tf');
  commands.push(`${PAGE_MARGIN_LEFT} 28 Td`);
  commands.push(`<${textToPdfHex(footerLeft)}> Tj`);
  commands.push('ET');

  commands.push('BT');
  commands.push('/F1 9 Tf');
  commands.push(`${PAGE_WIDTH - PAGE_MARGIN_RIGHT - 70} 28 Td`);
  commands.push(`<${textToPdfHex(footerRight)}> Tj`);
  commands.push('ET');

  return commands.join('\n');
}

function parsePngRgba(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('Unsupported PNG image.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    if (offset + length + 4 > buffer.length) break;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // crc

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height || !idatChunks.length) {
    throw new Error('PNG data is incomplete.');
  }

  if (bitDepth !== 8 || ![6, 2].includes(colorType) || interlace !== 0) {
    throw new Error('PNG format is not supported for PDF logo embedding.');
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = zlib.inflateSync(compressed);
  const channels = colorType === 6 ? 4 : 3;
  const bytesPerPixel = channels;
  const rowLength = width * channels;
  const expectedLength = (rowLength + 1) * height;
  if (inflated.length < expectedLength) {
    throw new Error('PNG data length mismatch.');
  }

  const rgbaOrRgb = Buffer.alloc(width * height * channels);
  const prevRow = Buffer.alloc(rowLength);
  let inOffset = 0;
  let outOffset = 0;

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inOffset];
    inOffset += 1;

    for (let col = 0; col < rowLength; col += 1) {
      const raw = inflated[inOffset];
      inOffset += 1;

      const left = col >= bytesPerPixel ? rgbaOrRgb[outOffset + col - bytesPerPixel] : 0;
      const up = prevRow[col];
      const upLeft = col >= bytesPerPixel ? prevRow[col - bytesPerPixel] : 0;

      let value;
      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = (raw + left) & 0xFF;
          break;
        case 2:
          value = (raw + up) & 0xFF;
          break;
        case 3:
          value = (raw + Math.floor((left + up) / 2)) & 0xFF;
          break;
        case 4:
          value = (raw + paeth(left, up, upLeft)) & 0xFF;
          break;
        default:
          throw new Error('Unsupported PNG filter type.');
      }

      rgbaOrRgb[outOffset + col] = value;
    }

    rgbaOrRgb.copy(prevRow, 0, outOffset, outOffset + rowLength);
    outOffset += rowLength;
  }

  if (colorType === 2) {
    const alpha = Buffer.alloc(width * height, 255);
    return { width, height, rgb: rgbaOrRgb, alpha };
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  for (let i = 0, rgbOffset = 0, aOffset = 0; i < rgbaOrRgb.length; i += 4) {
    rgb[rgbOffset++] = rgbaOrRgb[i];
    rgb[rgbOffset++] = rgbaOrRgb[i + 1];
    rgb[rgbOffset++] = rgbaOrRgb[i + 2];
    alpha[aOffset++] = rgbaOrRgb[i + 3];
  }

  return { width, height, rgb, alpha };
}

function resolveLogoPath() {
  const configured = String(process.env.WEBSITE_TESTER_PDF_LOGO || '').trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return DEFAULT_LOGO_PATH;
}

function loadLogoImage() {
  const logoPath = resolveLogoPath();
  if (!logoPath || !fs.existsSync(logoPath)) return null;

  try {
    const buffer = fs.readFileSync(logoPath);
    const parsed = parsePngRgba(buffer);
    return {
      ...parsed,
      path: logoPath
    };
  } catch {
    return null;
  }
}

function buildAsciiHexStreamObject(dictContent, dataBuffer) {
  const hexData = `${Buffer.from(dataBuffer).toString('hex').toUpperCase()}>`;
  const streamBody = `${hexData}\n`;
  const length = Buffer.byteLength(streamBody, 'utf8');
  return `<< ${dictContent} /Filter /ASCIIHexDecode /Length ${length} >>\nstream\n${streamBody}endstream`;
}

function createPdfFromPages(pages = [[]], options = {}) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let logoImageId = null;
  if (options.logo && options.logo.rgb && options.logo.alpha) {
    const alphaImageId = addObject(buildAsciiHexStreamObject(
      `/Type /XObject /Subtype /Image /Width ${options.logo.width} /Height ${options.logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8`,
      options.logo.alpha
    ));

    logoImageId = addObject(buildAsciiHexStreamObject(
      `/Type /XObject /Subtype /Image /Width ${options.logo.width} /Height ${options.logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${alphaImageId} 0 R`,
      options.logo.rgb
    ));
  }

  const pageIds = [];

  pages.forEach((pageLines, index) => {
    const stream = buildPdfPageStream(pageLines, {
      ...options,
      pageNumber: index + 1,
      pageCount: pages.length,
      includeLogo: !!logoImageId
    });

    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const resources = logoImageId
      ? `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${logoImageId} 0 R >> >>`
      : `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`;

    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function slugifyPart(value = '') {
  return normalizeTypography(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function buildTesterFullGuidePdf({
  guideText = '',
  sourceLabel = 'website',
  domain = 'website',
  locale = 'de',
  generatedAt = new Date().toISOString()
} = {}) {
  const lines = String(guideText || '').split(/\r?\n/).map((line) => classifyLine(line));
  const wrapped = wrapLineItems(lines);
  const pages = paginateItems(wrapped);
  const footerWebsite = String(domain || '').trim()
    ? (String(domain || '').trim().startsWith('http')
      ? String(domain || '').trim()
      : `https://${String(domain || '').trim()}`)
    : 'https://www.komplettwebdesign.de';
  const logo = loadLogoImage();

  const buffer = createPdfFromPages(pages, {
    generatedAt,
    reportWebsite: footerWebsite,
    locale: localeFrom(locale),
    logo
  });

  const sourceSlug = slugifyPart(sourceLabel || 'guide') || 'guide';
  const domainSlug = slugifyPart(domain || 'website') || 'website';
  const filename = `${domainSlug}-${sourceSlug}-vollanleitung.pdf`;

  return {
    buffer,
    filename,
    pageCount: pages.length,
    locale: localeFrom(locale)
  };
}

export const __testables = {
  localeFrom,
  wrapText,
  classifyLine,
  createPdfFromPages
};
