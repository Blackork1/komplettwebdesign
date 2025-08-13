// controllers/sitemapController.js
import { DISTRICTS } from "../models/districtModel.js";
import { getPublishedPosts } from "../models/BlogPostModel.js";
import pool from '../util/db.js';


/** Hilfsfunktion: absoluten Host ermitteln (funktioniert mit trust proxy) */
function resolveBaseUrl(req) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    return `${proto}://${host}`;
}

const { rows: posts } = await pool.query(
    `SELECT slug, COALESCE(hero_public_id,'') AS img,
              COALESCE(created_at, updated_at) AS updated_at
         FROM posts WHERE published='true'`
);

const { rows: pages } = await pool.query(
    `SELECT slug
         FROM pages WHERE display=true`
);


/** XML-Builder */
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

        // Statische Routen – passe an deine Seiten an
        const staticRoutes = [
            { loc: `${base}/`, changefreq: "weekly", priority: 1.0 },
            { loc: `${base}/kontakt`, changefreq: "monthly", priority: 0.7 },
            { loc: `${base}/pakete`, changefreq: "monthly", priority: 0.7 },
            { loc: `${base}/about`, changefreq: "monthly", priority: 0.5 },
            { loc: `${base}/blog`, changefreq: "monthly", priority: 0.7 },
            { loc: `${base}/faq`, changefreq: "yearly", priority: 0.7 },
            { loc: `${base}/datenschutz`, changefreq: "yearly", priority: 0.3 },
            { loc: `${base}/impressum`, changefreq: "yearly", priority: 0.3 }
        ];

        // // Bezirks-Seiten
        const districtRoutes = DISTRICTS.map(d => ({
            loc: `${base}/webdesign-berlin/${d.slug}`,
            changefreq: "weekly",
            priority: 0.8
        }));

        const pageRoutes = [];
        pages.forEach(page => {
            const path = `/${page.slug}`;
            pageRoutes.push({
                loc: `${base}${path}`,
                lastmod: new Date().toISOString(),
                changefreq: 'weekly',
                priority: 0.8,
            });
        })

        const postRoutes = [];
        posts.forEach(post => {
            const path = `/blog/${post.slug}`;
            postRoutes.push({
                loc: `${base}${path}`,
                lastmod: new Date(post.updated_at).toISOString(),
                changefreq: 'weekly',
                priority: 0.8,
                image: post.img || null,
            });
        });

        const allUrls = [...staticRoutes, ...districtRoutes, ...postRoutes, ...pageRoutes];
        const now = new Date().toISOString();

        const urlset = allUrls.map(u => {
            const lastmod = xmlEscape(u.lastmod || now);
            return [
                "  <url>",
                `    <loc>${xmlEscape(u.loc)}</loc>`,
                `    <lastmod>${lastmod}</lastmod>`,
                u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : "",
                u.priority ? `    <priority>${u.priority.toFixed(1)}</priority>` : "",
                "  </url>"
            ].filter(Boolean).join("\n");
        }).join("\n");

        const xml = [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
            urlset,
            `</urlset>`
        ].join("\n");

        res.set("Content-Type", "application/xml; charset=utf-8");
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Cache-Control", "public, max-age=3600"); // 1h Cache
        return res.status(200).send(xml);
    } catch (err) {
        next(err);
    }
}
