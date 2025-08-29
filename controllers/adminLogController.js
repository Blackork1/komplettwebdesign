// controllers/adminLogController.js

/** Alle möglichen Spalten (Key -> Label) — für Spalten-Toggles/CSV */
const ALL_COLS = [
  ['ts_berlin', 'Zeit (Berlin)'],
  ['ip_txt',    'IP'],
  ['ip_raw_txt','IP (raw)'],
  ['cf_country','Land'],
  ['city',      'City'],
  ['region',    'Reg.'],
  ['method',    'Methode'],
  ['path',      'Pfad'],
  ['status',    'Status'],
  ['rt_ms',     'ms'],
  ['ua_name',   'UA'],
  ['os_name',   'OS'],
  ['device_type','Dev'],
  ['referrer',  'Ref'],
  ['host',      'Host'],
  ['bytes_sent','Bytes'],
  ['cf_ray',    'CF Ray'],
  ['scheme',    'Scheme'],
];

/* ====================== Helpers ====================== */

const asArray = (v) =>
  (Array.isArray(v) ? v : (v ? String(v).split(',') : []))
    .map(s => String(s).trim()).filter(Boolean);

const asIntArray = (v) => asArray(v)
  .map(s => parseInt(s, 10))
  .filter(n => !Number.isNaN(n));

const pageParams = (q) => {
  const page = Math.max(1, parseInt(q.page || '1', 10));
  const size = Math.min(200, Math.max(10, parseInt(q.size || '50', 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
};

const orderBy = (q) => {
  const allowed = new Set(['ts','status','rt_ms','bytes_sent']);
  const col = allowed.has(q.sort_by) ? q.sort_by : 'ts';
  const dir = q.sort_dir === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${col} ${dir}`;
};

function wherePrivateExpr(ipc) {
  return `
    ${ipc} << inet '10.0.0.0/8' OR
    ${ipc} << inet '192.168.0.0/16' OR
    ${ipc} << inet '172.16.0.0/12' OR
    ${ipc} << inet '127.0.0.0/8' OR
    ${ipc} << inet '::1/128' OR
    ${ipc} << inet 'fc00::/7' OR
    ${ipc} << inet 'fe80::/10'
  `;
}

function buildWhere(q) {
  const where = [];
  const params = [];
  const IPC = `COALESCE(ip_raw, ip)`;
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };

  // Zeitraum
  if (q.from) add(`ts >= ?`, q.from);
  if (q.to)   add(`ts < ?`,  q.to + ' 23:59:59');

  // Länder (Multi)
  const countries = asArray(q.country);
  if (countries.length) {
    const ph = countries.map((_c, i) => `$${params.length + i + 1}`).join(',');
    params.push(...countries);
    where.push(`cf_country IN (${ph})`);
  }

  // Status (Multi)
  const statuses = asIntArray(q.status);
  if (statuses.length) {
    const ph = statuses.map((_s, i) => `$${params.length + i + 1}`).join(',');
    params.push(...statuses);
    where.push(`status IN (${ph})`);
  }

  // Methoden (Multi)
  const methods = asArray(q.method);
  if (methods.length) {
    const ph = methods.map((_m, i) => `$${params.length + i + 1}`).join(',');
    params.push(...methods);
    where.push(`method IN (${ph})`);
  }

  // IP vorhanden/fehlt (ip_raw)
  if (q.ip_presence === 'with')    where.push(`ip_raw IS NOT NULL`);
  if (q.ip_presence === 'without') where.push(`ip_raw IS NULL`);

  // IP-Typ (public/private/localhost)
  const privExpr = `(${wherePrivateExpr(IPC)})`;
  if (q.ip_type === 'private') where.push(privExpr);
  if (q.ip_type === 'public')  where.push(`${IPC} IS NOT NULL AND NOT ${privExpr}`);
  if (q.only_loopback === '1') where.push(`${IPC} << inet '127.0.0.0/8' OR ${IPC} << inet '::1/128'`);

  // Textsuche
  if (q.path)       add(`path ILIKE ?`, `%${q.path}%`);
  if (q.host)       add(`host ILIKE ?`, `%${q.host}%`);
  if (q.city)       add(`city ILIKE ?`, `%${q.city}%`);
  if (q.region)     add(`region ILIKE ?`, `%${q.region}%`);
  if (q.ua_name)    add(`ua_name ILIKE ?`, `%${q.ua_name}%`);
  if (q.os_name)    add(`os_name ILIKE ?`, `%${q.os_name}%`);
  if (q.device_type)add(`device_type ILIKE ?`, `%${q.device_type}%`);
  if (q.referrer)   add(`referrer ILIKE ?`, `%${q.referrer}%`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, params };
}

function parseColumns(q) {
  const allKeys = ALL_COLS.map(([k]) => k);
  const cols = asArray(q.col).filter(k => allKeys.includes(k));
  return cols.length ? cols : allKeys; // wenn nichts gewählt: alle anzeigen
}

function selectListFor() {
  // wir selektieren „breit“, filtern in der View/CSV per sichtbaren Keys
  return `
    ts,
    to_char((ts AT TIME ZONE 'Europe/Berlin'), 'DD.MM.YYYY HH24:MI:SS') AS ts_berlin,
    ip::TEXT AS ip_txt, 
    ip_raw::TEXT AS ip_raw_txt,
    cf_country, city, region, method, path, status, rt_ms, ua_name, os_name, device_type,
    referrer, bytes_sent, cf_ray, scheme, host,
    (${wherePrivateExpr('COALESCE(ip_raw, ip)')}) AS is_private
  `;
}

async function getFacetValues(db) {
  const [countries, statuses, methods] = await Promise.all([
    db.query(`SELECT cf_country AS v FROM access_logs WHERE cf_country IS NOT NULL GROUP BY cf_country ORDER BY cf_country`),
    db.query(`SELECT status AS v FROM access_logs GROUP BY status ORDER BY status`),
    db.query(`SELECT method AS v FROM access_logs GROUP BY method ORDER BY method`)
  ]);
  return {
    countries: countries.rows.map(r => r.v),
    statuses:  statuses.rows.map(r => r.v),
    methods:   methods.rows.map(r => r.v),
  };
}

function escapeCsv(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\r?\n/g, ' ');
  return /[;" ,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ====================== Controller ====================== */

export async function showLogs(req, res) {
  const db = req.app.get('db');
  const q = req.query;

  const cols = parseColumns(q);
  const { whereSql, params } = buildWhere(q);
  const { page, size, offset } = pageParams(q);
  const order = orderBy(q);

  const [{ rows: [{ count }] }, facets, data] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM access_logs ${whereSql}`, params),
    getFacetValues(db),
    db.query(
      `SELECT ${selectListFor()}
       FROM access_logs
       ${whereSql}
       ${order}
       LIMIT ${size} OFFSET ${offset}`,
      params
    )
  ]);

  res.render('admin/logs', {
    rows: data.rows,
    facets,
    q,
    cols,
    allCols: ALL_COLS,
    page,
    size,
    total: count,
    pages: Math.max(1, Math.ceil(count / size))
  });
}

export async function exportLogsCsv(req, res) {
  const db = req.app.get('db');
  const q = req.query;

  const cols = parseColumns(q);
  const { whereSql, params } = buildWhere(q);
  const order = orderBy(q);

  const { rows } = await db.query(
    `SELECT ${selectListFor()}
     FROM access_logs
     ${whereSql}
     ${order}
     LIMIT 10000`,
    params
  );

  // nur ausgewählte Spalten exportieren
  const header = cols;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="access_logs.csv"');
  res.write(header.join(';') + '\n');
  for (const r of rows) {
    const row = header.map(k => escapeCsv(r[k]));
    res.write(row.join(';') + '\n');
  }
  res.end();
}
