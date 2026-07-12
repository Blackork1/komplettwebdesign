const CONTENT_AGENT_PATH = /^\/admin\/content-agent(?:\/[a-z0-9_-]+)*$/i;
const CONTENT_AGENT_QUERY = /^[a-z0-9_-]+=[a-z0-9_-]+(?:&[a-z0-9_-]+=[a-z0-9_-]+)*$/i;

export function safeContentAgentReturnTo(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null;
    if (value.normalize('NFKC') !== value) return null;
    if (/[\\\u0000-\u001f\u007f-\u009f%]/u.test(value)) return null;

    const queryStart = value.indexOf('?');
    const path = queryStart === -1 ? value : value.slice(0, queryStart);
    const query = queryStart === -1 ? null : value.slice(queryStart + 1);

    if (!CONTENT_AGENT_PATH.test(path)) return null;
    if (query !== null && !CONTENT_AGENT_QUERY.test(query)) return null;
    return value;
}

function rememberContentAgentReturnTo(req) {
    if (!req.session || !['GET', 'HEAD'].includes(req.method)) return;
    const returnTo = safeContentAgentReturnTo(req.originalUrl);
    if (returnTo) req.session.contentAgentReturnTo = returnTo;
}

export function isLoggedIn(req, res, next) {
    if (req.session?.user) return next();
    return res.redirect('/login');
  }
export function isAdmin(req, res, next) {
    if (req.session?.user?.isAdmin) return next();
    if (!req.session?.user) rememberContentAgentReturnTo(req);
    return res.redirect('/login');
  }
