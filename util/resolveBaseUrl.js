export function resolveBaseUrl(req) {
  const envUrl = process.env.BASE_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BASE_URL must be configured in production.');
  }
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host  = (req.headers['x-forwarded-host']  || req.get('host'));
  return `${proto}://${host}`;
}
