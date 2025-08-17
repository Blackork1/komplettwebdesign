import pool from '../util/db.js';

export async function showLogs(req, res) {
  const db = req.app.get('db');
  const { rows } = await db.query(
    `SELECT 
        ts, 
        to_char((ts AT TIME ZONE 'Europe/Berlin'), 'DD.MM.YYYY HH24:MI:SS') AS ts_berlin,
        ip, ip_raw, cf_country, city, region, 
        method, path, status, rt_ms, ua_name, os_name, device_type, referrer
     FROM access_logs
     ORDER BY ts DESC
     LIMIT 200`
  );
  res.render('admin/logs', { rows })
} 