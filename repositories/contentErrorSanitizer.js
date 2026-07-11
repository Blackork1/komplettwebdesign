const REDACTED = '[ZUGANGSDATEN ENTFERNT]';
const SENSITIVE_KEY = '(?:(?:[a-z0-9]+[_-])*(?:api[_-]?key|token|secret|password|authorization)|passwd)';

function sanitizeDiagnosticString(value) {
  const [firstLine] = String(value ?? '').split(/\r?\n/, 1);

  return firstLine
    .replace(/\b([a-z][a-z0-9+.-]*):\/\/([^:\s/@]+):([^@\s/]+)@/gi, `$1://$2:${REDACTED}@`)
    .replace(
      new RegExp(
        `((?:["'])?\\b${SENSITIVE_KEY}\\b(?:["'])?\\s*[=:]\\s*)`
          + `(?:"[^"]*"|'[^']*'|(?:basic|bearer)\\s+[^\\s,;}"']+|[^\\s,;}]+)`,
        'gi'
      ),
      `$1"${REDACTED}"`
    )
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, REDACTED)
    .slice(0, 2000);
}

function sanitizeIssue(issue) {
  if (typeof issue === 'string') {
    return sanitizeDiagnosticString(issue);
  }
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    return null;
  }

  const sanitized = {};
  for (const field of ['message', 'code', 'stage']) {
    if (issue[field] !== undefined && issue[field] !== null) {
      sanitized[field] = sanitizeDiagnosticString(issue[field]);
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function sanitizeErrorMessage(error) {
  const message = error instanceof Error ? error.message : error;
  return sanitizeDiagnosticString(message || 'Unbekannter Fehler');
}

export function sanitizeErrorReport(report) {
  if (report instanceof Error || typeof report === 'string') {
    return { message: sanitizeErrorMessage(report) };
  }
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return {};
  }

  const sanitized = {};
  for (const field of ['message', 'code', 'stage']) {
    if (report[field] !== undefined && report[field] !== null) {
      sanitized[field] = sanitizeDiagnosticString(report[field]);
    }
  }

  if (Array.isArray(report.issues)) {
    sanitized.issues = report.issues
      .slice(0, 50)
      .map(sanitizeIssue)
      .filter((issue) => issue !== null && issue !== '');
  }

  return sanitized;
}
