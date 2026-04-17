function normalizeLocale(locale = "de") {
  return String(locale).toLowerCase().startsWith("en") ? "en" : "de";
}

function stripLegacySignature(html = "") {
  return String(html)
    .replace(/<p>\s*(Best regards|Beste Grüße|Mit freundlichen Grüßen)[\s\S]*?<\/p>\s*$/i, "")
    .trim();
}

export function renderBrandEmail({
  locale = "de",
  subject = "",
  preheader = "",
  headline = "",
  bodyHtml = "",
  ctaLabel = "",
  ctaUrl = ""
} = {}) {
  const lng = normalizeLocale(locale);
  const safeSubject = String(subject || (lng === "en" ? "Update from Komplett Webdesign" : "Neuigkeiten von Komplett Webdesign"));
  const safeHeadline = String(headline || safeSubject);
  const safePreheader = String(preheader || "");
  const cleanedBody = stripLegacySignature(bodyHtml);

  const signature = lng === "en"
    ? `
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#0b2a46;">Best regards</p>
      <p style="margin:0 0 4px 0;font-size:15px;color:#1f2937;"><strong>Komplett Webdesign</strong></p>
      <p style="margin:0 0 4px 0;font-size:14px;color:#4b5563;">Webdesign & SEO for Berlin SMEs</p>
      <p style="margin:0 0 12px 0;font-size:14px;color:#4b5563;">
        <a href="mailto:kontakt@komplettwebdesign.de" style="color:#0b2a46;text-decoration:none;">kontakt@komplettwebdesign.de</a> ·
        <a href="https://komplettwebdesign.de/" style="color:#0b2a46;text-decoration:none;">komplettwebdesign.de</a>
      </p>
      <p style="margin:0;color:#5b5b5b;font-size:12px;line-height:1.5;">
        <a href="https://komplettwebdesign.de/" style="color:#0b2a46;text-decoration:none;">Mehr Infos</a> ·
        <a href="https://komplettwebdesign.de/kontakt" style="color:#0b2a46;text-decoration:none;">Beratung buchen</a> ·
        <a href="https://komplettwebdesign.de/impressum" style="color:#0b2a46;text-decoration:none;">Impressum</a> ·
        <a href="https://komplettwebdesign.de/datenschutz" style="color:#0b2a46;text-decoration:none;">Datenschutz</a>
      </p>
    `
    : `
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#0b2a46;">Mit freundlichen Grüßen</p>
      <p style="margin:0 0 4px 0;font-size:15px;color:#1f2937;"><strong>Komplett Webdesign</strong></p>
      <p style="margin:0 0 4px 0;font-size:14px;color:#4b5563;">Webdesign & SEO für Berliner KMU</p>
      <p style="margin:0 0 12px 0;font-size:14px;color:#4b5563;">
        <a href="mailto:kontakt@komplettwebdesign.de" style="color:#0b2a46;text-decoration:none;">kontakt@komplettwebdesign.de</a> ·
        <a href="https://komplettwebdesign.de/" style="color:#0b2a46;text-decoration:none;">komplettwebdesign.de</a>
      </p>
      <p style="margin:0;color:#5b5b5b;font-size:12px;line-height:1.5;">
        <a href="https://komplettwebdesign.de/" style="color:#0b2a46;text-decoration:none;">Mehr Infos</a> ·
        <a href="https://komplettwebdesign.de/kontakt" style="color:#0b2a46;text-decoration:none;">Beratung buchen</a> ·
        <a href="https://komplettwebdesign.de/impressum" style="color:#0b2a46;text-decoration:none;">Impressum</a> ·
        <a href="https://komplettwebdesign.de/datenschutz" style="color:#0b2a46;text-decoration:none;">Datenschutz</a>
      </p>
    `;

  const ctaHtml = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0 0 0;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;background:#e94a1b;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">${ctaLabel}</a></p>`
    : "";

  return `<!doctype html>
<html lang="${lng}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safePreheader}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f5f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0b2a46 0%,#173f63 100%);padding:26px 28px;">
                <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:1.1px;text-transform:uppercase;color:#ffd6c9;font-weight:700;">Komplett Webdesign</p>
                <h1 style="margin:0;font-size:26px;line-height:1.25;color:#ffffff;">${safeHeadline}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 20px 28px;font-size:16px;line-height:1.65;color:#1f2937;">
                ${cleanedBody}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-top:1px solid #e5e7eb;background:#fff8f5;">
                ${signature}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
