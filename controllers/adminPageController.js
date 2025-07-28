// controllers/adminPageController.js
import pool from '../util/db.js';
import { getCssClasses } from '../helpers/cssHelper.js';
import { FIELD_CONFIG } from '../helpers/componentConfig.js';

// 1) Liste aller Seiten
export async function getPagesList(req, res) {
  try {
    const { rows: pages } = await req.app.get('db')
      .query('SELECT * FROM pages ORDER BY id');
    res.render('admin/pages_list', { pages });
  } catch (err) {
    console.error('Fehler beim Laden der Seitenliste:', err);
    res.status(500).send('Interner Serverfehler');
  }
}

// 2) Neue Seite anlegen (Formular)
export function getNewPageForm(req, res) {
  res.render('admin/page_form', { page: null });
}

// 3) Neue Seite speichern
export async function postCreatePage(req, res) {
  const { title, slug, meta, nav } = req.body;
  try {
    const { rows } = await req.app.get('db')
      .query(
        'INSERT INTO pages(title, slug, meta, nave) VALUES($1,$2,$3,$4) RETURNING id',
        [title, slug, meta, nav]
      );
    res.redirect(`/admin/pages/${rows[0].id}/edit`);
  } catch (err) {
    console.error('Fehler beim Erstellen der Seite:', err);
    res.status(500).send('Seite konnte nicht erstellt werden (Slug doppelt?)');
  }
}

// 4) Seite löschen
export async function getDeletePage(req, res) {
  try {
    await req.app.get('db')
      .query('DELETE FROM pages WHERE id=$1', [req.params.id]);
    res.redirect('/admin/pages');
  } catch (err) {
    console.error('Fehler beim Löschen der Seite:', err);
    res.status(500).send('Seite konnte nicht gelöscht werden');
  }
}

// 5) Seite bearbeiten (Builder)
export async function getEditPage(req, res) {
  const db = req.app.get('db');
  const pageId = req.params.id;

  // Seite laden
  const pageRes = await db.query('SELECT * FROM pages WHERE id=$1', [pageId]);
  if (!pageRes.rowCount) return res.status(404).send('Seite nicht gefunden');
  const page = pageRes.rows[0];

  // Komponenten laden
  const { rows: comps } = await db.query(
    'SELECT * FROM components WHERE page_id=$1 ORDER BY order_index',
    [pageId]
  );

  // Baumstruktur aufbauen
  const map = {}; comps.forEach(c => (c.children = [], map[c.id] = c));
  const roots = [];
  comps.forEach(c =>
    c.parent_id
      ? map[c.parent_id]?.children.push(c)
      : roots.push(c)
  );
  roots.forEach(c => c.children.sort((a, b) => a.order_index - b.order_index));

  res.render('admin/page_edit', {
    page,
    components: roots,
    cssClasses: req.app.get('cssClasses'),
    fieldConfig: req.app.get('fieldConfig')
  });
}

// Neues Mapping aus dem Request in die DB schreiben
export async function postUpdatePageStyles(req, res) {
  const db = req.app.get('db');
  const pageId = req.params.id;
  // erwartet css_files als Array aus dem <select multiple>
  const files = Array.isArray(req.body.css_files)
    ? req.body.css_files
    : (req.body.css_files ? [req.body.css_files] : []);

  try {
    await db.query(
      'UPDATE pages SET css_files = $1 WHERE id = $2',
      [files, pageId]
    );
    res.redirect(`/admin/pages/${pageId}/edit`);
  } catch (err) {
    console.error('Fehler beim Speichern der Styles:', err);
    res.status(500).send('Konnte CSS-Auswahl nicht speichern');
  }
}

