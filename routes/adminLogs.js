// routes/adminLogs.js
import { Router } from 'express';

const router = Router();

function requireAdmin(req, res, next) {
  // TODO: Eigene Admin-Auth integrieren
  // Falls du noch nix hast, setze temporär eine ENV-Var o. Basic-Auth.
  // Hier erst mal "offen" (nur zu Testzwecken!) – bitte absichern.
  next();
}

router.get('/admin/logs', requireAdmin, async (req, res) => {
  const db = req.app.get('db');
  const { rows } = await db.query(
    `SELECT ts, ip, ip_raw, cf_country, city, region, method, path, status,
            rt_ms, ua_name, os_name, device_type, referrer
     FROM access_logs
     ORDER BY ts DESC
     LIMIT 200`
  );
  res.render('admin/logs', { rows });
});

export default router;
