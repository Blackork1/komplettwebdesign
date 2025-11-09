// controllers/leistungenController.js
import pool from '../util/db.js';

function safeJson(val, fallback) {
  if (val == null) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn('⚠ Konnte JSON nicht parsen:', e.message);
      return fallback;
    }
  }
  return fallback;
}

export async function showLeistungPage(req, res, next) {
  const { slug } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM leistungen_pages
      WHERE slug = $1
        AND is_published = TRUE
      LIMIT 1
      `,
      [slug]
    );

    if (!rows.length) {
      // keine Seite gefunden -> 404 über globales Handling
      return next();
    }

    const row = rows[0];

    const page = {
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,

      hero: {
        title: row.hero_title || row.title,
        subtitle: row.hero_subtitle,
        icons: safeJson(row.hero_icons, [])
      },

      intro: {
        problem: {
          title: row.intro_problem_title,
          text: row.intro_problem_text
        },
        solution: {
          title: row.intro_solution_title,
          text: row.intro_solution_text
        }
      },

      description: safeJson(row.description, []),

      services: safeJson(row.services, []),

      risks: {
        title: row.risks_title,
        intro: row.risks_intro,
        items: safeJson(row.risks_items, []),
        conclusion: safeJson(row.risks_conclusion, [])
      },

      cta: {
        title: row.cta_title,
        text: row.cta_text,
        buttonText: row.cta_button_text,
        buttonLink: row.cta_button_link
      }
    };

    res.render('leistungen/show', {
      page,
      title: page.title,
      description:
        page.subtitle ||
        page.hero.subtitle ||
        'Leistungen – ' + page.title,
      ogImage: null // bei Bedarf dynamisch ergänzen
    });
  } catch (err) {
    console.error('❌ Fehler beim Laden der Leistungsseite:', err);
    next(err);
  }
}
