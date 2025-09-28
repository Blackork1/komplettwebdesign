// controllers/sitemapController.js
import pool from "../util/db.js";
import { DISTRICTS } from "../models/districtModel.js";

/** Absoluten Host ermitteln (funktioniert mit reverse proxy) */
function resolveBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host  = req.headers["x-forwarded-host"]  || req.get("host");
  return `${proto}://${host}`;
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

export async function sitemapXml(req, res, next) {
  try {
    const base = resolveBaseUrl(req);
    const nowIso = new Date().toISOString();

    // ---- DB: dynamische Inhalte ----
    const { rows: posts } = await pool.query(
      `SELECT slug,
              COALESCE(hero_public_id,'') AS img,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM posts
        WHERE published = true`
    );

    const { rows: pages } = await pool.query(
      `SELECT slug,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM pages
        WHERE display = true`
    );

    // 👉 Neu: Industries für /webdesign-:slug
    const { rows: industries } = await pool.query(
      `SELECT slug,
              COALESCE(og_image_url,'') AS og_image_url,
              COALESCE(updated_at, created_at, now()) AS updated_at
         FROM industries
        ORDER BY name`
    );

    // ---- Statische Routen ----
    const staticRoutes = [
      { loc: `${base}/`,                changefreq: "weekly",  priority: 1.0 },
      { loc: `${base}/kontakt`,         changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete`,          changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete/basis`,    changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete/business`, changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/pakete/premium`,  changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/about`,           changefreq: "monthly", priority: 0.5 },
      { loc: `${base}/blog`,            changefreq: "monthly", priority: 0.7 },
      { loc: `${base}/faq`,             changefreq: "yearly",  priority: 0.7 },
      { loc: `${base}/datenschutz`,     changefreq: "yearly",  priority: 0.3 },
      { loc: `${base}/impressum`,       changefreq: "yearly",  priority: 0.3 }
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
      lastmod: new Date(p.updated_at).toISOString(),
      changefreq: "weekly",
      priority: 0.8
    }));

    // Blogposts
    const postRoutes = posts.map(p => ({
      loc: `${base}/blog/${p.slug}`,
      lastmod: new Date(p.updated_at).toISOString(),
      changefreq: "weekly",
      priority: 0.8
      // Falls du ein <image:image> Element willst, müsstest du den XML-NS erweitern.
    }));

    // 👉 Industries
    const industryRoutes = industries.map(r => ({
      loc: `${base}/webdesign-${r.slug}`,
      lastmod: new Date(r.updated_at).toISOString(),
      changefreq: "weekly",
      priority: 0.85
    }));

    const allUrls = [
      ...staticRoutes,
      ...districtRoutes,
      ...pageRoutes,
      ...postRoutes,
      ...industryRoutes
    ];

    // ---- XML bauen ----
    const urlset = allUrls.map(u => {
      const parts = [
        "  <url>",
        `    <loc>${xmlEscape(u.loc)}</loc>`,
        `    <lastmod>${xmlEscape(u.lastmod || nowIso)}</lastmod>`
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
