const DEFAULT_TEST_DATABASE_PATTERN = /(?:^|[_-])(test|testing)(?:$|[_-])/i;

function databaseNameFromConnectionString(connectionString) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) return '';
  try {
    const url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return '';
    return decodeURIComponent(url.pathname.replace(/^\/+/, '')).trim();
  } catch {
    return '';
  }
}

export function evaluateContentAgentPgResetGuard({
  connectionString,
  allowReset = false,
  explicitMarker = ''
} = {}) {
  const databaseName = databaseNameFromConnectionString(connectionString);
  if (!databaseName) {
    return { allowed: false, databaseName: '', reason: 'Keine gültige PostgreSQL-Testdatenbank konfiguriert.' };
  }
  if (allowReset !== true) {
    return { allowed: false, databaseName, reason: 'Der destruktive Reset wurde nicht ausdrücklich freigegeben.' };
  }

  const marker = typeof explicitMarker === 'string' ? explicitMarker.trim() : '';
  const defaultMarkerMatches = DEFAULT_TEST_DATABASE_PATTERN.test(databaseName);
  const explicitMarkerMatches = marker.length > 0
    && databaseName.toLocaleLowerCase('de-DE').includes(marker.toLocaleLowerCase('de-DE'));
  if (!defaultMarkerMatches && !explicitMarkerMatches) {
    return {
      allowed: false,
      databaseName,
      reason: 'Der Datenbankname enthält keinen freigegebenen Testmarker.'
    };
  }
  return { allowed: true, databaseName, reason: '' };
}
