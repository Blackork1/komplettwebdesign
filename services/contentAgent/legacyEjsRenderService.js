import vm from 'node:vm';
import ejs from 'ejs';

const FORBIDDEN = [
  /\bprocess\b/u,
  /\bglobalThis\b/u,
  /\bglobal\b/u,
  /\brequire\b/u,
  /\bimport\s*\(/u,
  /\bFunction\b/u,
  /\beval\b/u,
  /\bconstructor\b/u,
  /\b__proto__\b/u,
  /\binclude\s*\(/u,
  /\bfetch\b/u,
  /\bXMLHttpRequest\b/u,
  /\bWebSocket\b/u
];

function renderError(message) {
  return Object.assign(new Error(message), {
    code: 'CONTENT_LEGACY_EJS_RENDER_BLOCKED'
  });
}

function dateLabel(input) {
  return new Date(input).toLocaleDateString('de-DE');
}

function normalizeRenderLocals(value = {}) {
  return {
    post: structuredClone(value.post || {}),
    publishedISO: String(value.publishedISO || ''),
    modifiedISO: String(value.modifiedISO || ''),
    og_image: String(value.og_image || ''),
    locale: 'de_DE'
  };
}

function serializedLocals(value) {
  try {
    return JSON.stringify(normalizeRenderLocals(value))
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  } catch (error) {
    throw renderError(`Legacy-Locals konnten nicht serialisiert werden: ${error.message}`);
  }
}

export function buildLegacyRenderLocals({
  post,
  publishedISO,
  modifiedISO
} = {}) {
  return {
    post: { ...post, description: post?.description },
    publishedISO,
    modifiedISO,
    og_image: post?.image_url,
    locale: 'de_DE',
    helpers: { date: dateLabel }
  };
}

export function inspectLegacyEjsTemplate(template) {
  const source = String(template || '');
  const openCount = (source.match(/<%/g) || []).length;
  const closeCount = (source.match(/%>/g) || []).length;
  const blockers = [];
  if (openCount !== closeCount) blockers.push({ code: 'legacy_ejs_unbalanced' });
  const executableBlocks = [...source.matchAll(/<%(?!%)([\s\S]*?)%>/g)]
    .map((match) => match[1])
    .join('\n');
  for (const pattern of FORBIDDEN) {
    if (pattern.test(executableBlocks)) {
      blockers.push({ code: 'legacy_ejs_forbidden_token' });
    }
  }
  return {
    ejsCount: openCount,
    blockers: [...new Map(blockers.map((item) => [item.code, item])).values()]
  };
}

export function renderLegacyEjsStrict({ template, locals, timeoutMs = 100 } = {}) {
  const inspection = inspectLegacyEjsTemplate(template);
  if (inspection.blockers.length > 0) {
    throw renderError('Das Legacy-Template enthält nicht erlaubte Ausdrücke.');
  }

  let compiled;
  try {
    compiled = ejs.compile(String(template || ''), {
      client: true,
      compileDebug: false,
      rmWhitespace: true,
      filename: 'db://legacy-migration'
    });
  } catch (error) {
    throw renderError(`Legacy-EJS konnte nicht kompiliert werden: ${error.message}`);
  }

  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  const localData = serializedLocals(locals);
  const script = new vm.Script(
    `(() => {
      const deepFreeze = (value) => {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
        return value;
      };
      const data = ${localData};
      const locals = deepFreeze({
        ...data,
        helpers: {
          date(input) {
            return new Date(input).toLocaleDateString('de-DE');
          }
        }
      });
      return (${compiled.toString()})(locals);
    })()`,
    { filename: 'db-legacy-migration.vm.js' }
  );

  let result;
  try {
    result = script.runInContext(context, { timeout: timeoutMs });
  } catch (error) {
    throw renderError(`Legacy-EJS konnte nicht sicher gerendert werden: ${error.message}`);
  }
  const html = String(result || '');
  if (/<%[=-]?|%>/.test(html)) {
    throw renderError('Nach dem Rendering ist EJS-Syntax übrig geblieben.');
  }
  return html;
}
