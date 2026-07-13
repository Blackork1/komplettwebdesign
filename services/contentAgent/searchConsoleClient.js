import { GoogleAuth } from 'google-auth-library';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

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
      data: body
    });

    return response.data || { rows: [] };
  }

  return { isConfigured, querySearchAnalytics };
}
