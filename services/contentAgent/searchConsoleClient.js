import { GoogleAuth } from 'google-auth-library';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const SEARCH_CONSOLE_REQUEST_TIMEOUT_MS = 30_000;

async function withSearchConsoleTimeout(operation) {
  const controller = new AbortController();
  let timeoutHandle;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      const error = new Error('Die Search-Console-Anfrage hat das Zeitlimit überschritten.');
      error.code = 'CONTENT_SEARCH_CONSOLE_REQUEST_TIMEOUT';
      reject(error);
    }, SEARCH_CONSOLE_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export function createSearchConsoleClient({
  siteUrl,
  credentialsPath,
  authFactory = null
}) {
  function isConfigured() {
    return Boolean(siteUrl && credentialsPath);
  }

  async function querySearchAnalytics(body) {
    if (!isConfigured()) {
      throw new Error('Search Console ist nicht konfiguriert.');
    }

    return withSearchConsoleTimeout(async (signal) => {
      const authOptions = {
        keyFile: credentialsPath,
        scopes: [READONLY_SCOPE]
      };
      const auth = authFactory
        ? authFactory(authOptions)
        : new GoogleAuth(authOptions);
      const client = await auth.getClient();
      const encodedSite = encodeURIComponent(siteUrl);
      const response = await client.request({
        url: `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
        method: 'POST',
        data: body,
        timeout: SEARCH_CONSOLE_REQUEST_TIMEOUT_MS,
        signal
      });

      return response.data || { rows: [] };
    });
  }

  return { isConfigured, querySearchAnalytics };
}
