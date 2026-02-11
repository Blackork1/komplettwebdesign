// controllers/sitemapController.js
import pool from "../util/db.js";
import { DISTRICTS } from "../models/districtModel.js";

/** Absoluten Host ermitteln (funktioniert mit reverse proxy) */
function resolveBaseUrl(req) {
  const configuredBase = (process.env.CANONICAL_BASE_URL || process.env.BASE_URL || "").trim().replace(/\/$/, "");
  if (configuredBase) return configuredBase;

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const normalizedHost = String(host || "").trim();
  if (!normalizedHost) return "https://komplettwebdesign.de";

  return `${proto}://${normalizedHost}`;
}

/** XML-Escape */
function xmlEscape(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIso(value, fallbackIso) {
  const date = new Date(value || fallbackIso);
  if (Number.isNaN(date.getTime())) return fallbackIso;
  return date.toISOString();
}

async function querySafe(sql, params = [], label = "query") {
  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error(`⚠ sitemap ${label} fehlgeschlagen:`, err.message);
    return [];
  }
}

export async function sitemapXml(req, res, next) {
  try {
    const base = resolveBaseUrl(req);
    const nowIso = new Date().toISOString();

    // ---- DB: dynamische Inhalte ----
    const posts = await querySafe(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM posts
        WHERE published = true`,
      [],
      "posts"
    );

    const pages = await querySafe(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM pages
        WHERE display = true`,
      [],
      "pages"
    );

    // 👉 Neu: Industries für /webdesign-:slug
    const industries = await querySafe(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM industries
        ORDER BY name`,
      [],
      "industries"
    );

    // Leistungen für webdesign-berlin/:slug 
    const leistungenPages = await querySafe(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM leistungen_pages
        WHERE is_published = true
        ORDER BY created_at DESC`,
      [],
      "leistungen_pages"
    );

    // 👉 NEU: Ratgeber für /ratgeber/:slug
    const guides = await querySafe(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM ratgeber
        WHERE published = true
        ORDER BY created_at DESC`,
      [],
      "ratgeber"
    );

    // ---- Statische Routen ----
    const staticRoutes = [
      { loc: `${base}/`, changefreq: "weekly", priority: 1.0 },
      { loc: `${base}/kontakt`, changefreq: "monthly", priority: 0.8 },
      { loc: `${base}/pakete`, changefreq: "monthly", priority: 0.8 },
      { loc: `${base}/pakete/basis`, changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete/business`, changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete/premium`, changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/about`, changefreq: "monthly", priority: 0.6 },
      { loc: `${base}/blog`, changefreq: "weekly", priority: 0.8 },
      // 👉 NEU: Ratgeber-Übersicht
      { loc: `${base}/ratgeber`, changefreq: "weekly", priority: 0.8 },
      { loc: `${base}/faq`, changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/datenschutz`, changefreq: "yearly", priority: 0.2 },
      { loc: `${base}/impressum`, changefreq: "yearly", priority: 0.2 },
      { loc: `${base}/webdesign-cafe/kosten`, changefreq: "yearly", priority: 0.4 },
      { loc: `${base}/webdesign-blumenladen/kosten`, changefreq: "yearly", priority: 0.4 },
      { loc: `${base}/webdesign-berlin`, changefreq: "weekly", priority: 1.0 }
    ];

    // Bezirke
    const districtRoutes = DISTRICTS.map(d => ({
      loc: `${base}/webdesign-berlin/${d.slug}`,
      lastmod: nowIso,
      changefreq: "weekly",
      priority: 0.8
    }));

    // CMS Pages
    const pageRoutes = pages.map(p => ({
      loc: `${base}/${p.slug}`,
      lastmod: toIso(p.updated_at, nowIso),
      changefreq: "weekly",
      priority: 0.8
    }));

    // Blogposts
    const postRoutes = posts.map(p => ({
      loc: `${base}/blog/${p.slug}`,
      lastmod: toIso(p.updated_at, nowIso),
      changefreq: "weekly",
      priority: 0.8
    }));

    // Industries
    const industryRoutes = industries.map(r => ({
      loc: `${base}/branchen/webdesign-${r.slug}`,
      lastmod: toIso(r.updated_at, nowIso),
      changefreq: "weekly",
      priority: 0.85
    }));

    const serviceRoutes = leistungenPages.map(s => ({
      loc: `${base}/webdesign-berlin/${s.slug}`,
      lastmod: toIso(s.updated_at, nowIso),
      changefreq: "weekly",
      priority: 0.8
    }));

    // 👉 NEU: Ratgeber-Detailseiten
    const guideRoutes = guides.map(g => ({
      loc: `${base}/ratgeber/${g.slug}`,
      lastmod: toIso(g.updated_at, nowIso),
      changefreq: "weekly",
      priority: 0.8
    }));

    const allUrlsRaw = [
      ...staticRoutes,
      ...districtRoutes,
      ...pageRoutes,
      ...postRoutes,
      ...industryRoutes,
      ...serviceRoutes,
      ...guideRoutes   // 👉 NEU aufnehmen
    ];

    const uniqueUrls = new Map();
    allUrlsRaw.forEach((u) => {
      if (!u?.loc) return;
      if (!uniqueUrls.has(u.loc)) uniqueUrls.set(u.loc, u);
    });
    const allUrls = Array.from(uniqueUrls.values());

    // ---- XML bauen ----
    const urlset = allUrls.map(u => {
      const parts = [
        "  <url>",
        `    <loc>${xmlEscape(u.loc)}</loc>`,
        `    <lastmod>${xmlEscape(toIso(u.lastmod, nowIso))}</lastmod>`
      ];
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority != null) parts.push(`    <priority>${Number(u.priority).toFixed(1)}</priority>`);
      parts.push("  </url>");
      return parts.join("\n");
    }).join("\n");

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      urlset,
      `</urlset>`
    ].join("\n");

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "public, max-age=3600"); // 1h
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
}
