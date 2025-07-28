import express from 'express';
import { Pool } from 'pg';
import env from "dotenv";
import session from 'express-session';
const router = express.Router();


env.config();

router.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  }));


const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),        // jetzt 443, nicht 5432
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Neue Branche
router.get('/admin/branchen/neu', async (req, res) => {
    const templates = await pool.query('SELECT id, name FROM branchen_templates');
    let defaultData = {
        slug: '', title: '', intro: '', benefit_intro: '', keywords: '',
        template_id: templates.rows[0]?.id || null
    };
    if (req.session.previewNewBranche) {
        defaultData = req.session.previewNewBranche;
        delete req.session.previewNewBranche;
    }
    res.render('branchen_admin_form', { templates: templates.rows, defaultData });
});

router.post('/admin/branchen/vorschau', async (req, res) => {
    const { slug, title, intro, benefit_intro, keywords, template_id } = req.body;
    const keywordArray = keywords.split(',').map(k => k.trim());
    req.session.previewNewBranche = { slug, title, intro, benefit_intro, keywords, template_id };
    const templateRes = await pool.query('SELECT * FROM branchen_templates WHERE id = $1', [template_id]);
    if (templateRes.rowCount === 0) return res.status(404).send('Template nicht gefunden');
    const template = templateRes.rows[0];
    res.render('branchen_admin_preview', {
        branche: {
            slug, title, intro, benefit_intro, keywords: keywordArray,
            pakete: template.pakete, faq: template.faq, features: template.features
        },
        formData: req.body
    });
});

router.post('/admin/branchen', async (req, res) => {
    const { slug, title, intro, benefit_intro, keywords, template_id } = req.body;
    const keywordArray = keywords.split(',').map(k => k.trim());
    try {
        await pool.query(
            'INSERT INTO branchen (slug, title, intro, benefit_intro, keywords, template_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [slug, title, intro, benefit_intro, keywordArray, template_id]
        );
        req.flash('success', 'Branche erfolgreich gespeichert.');
        res.redirect('/admin/branchen');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Fehler beim Speichern.');
        res.redirect('/admin/branchen/neu');
    }
});

router.get('/admin/branchen', async (req, res) => {
    const result = await pool.query("SELECT b.*, t.name AS template_name FROM branchen b LEFT JOIN branchen_templates t ON b.template_id = t.id ORDER BY b.id ASC");
    res.render('branchen_admin_list', { branchen: result.rows });
});

router.get('/admin/branchen/:id/bearbeiten', async (req, res) => {
    const { id } = req.params;
    const brancheResult = await pool.query('SELECT * FROM branchen WHERE id = $1', [id]);
    if (brancheResult.rowCount === 0) return res.status(404).send('Branche nicht gefunden');
    const templatesResult = await pool.query('SELECT id, name FROM branchen_templates');
    let branche = brancheResult.rows[0];
    if (req.session.previewBranche && req.session.previewBranche.id === id) {
        const preview = req.session.previewBranche;
        branche = {
            ...branche,
            slug: preview.slug,
            title: preview.title,
            intro: preview.intro,
            benefit_intro: preview.benefit_intro,
            keywords: preview.keywords.split(',').map(k => k.trim()),
            template_id: parseInt(preview.template_id)
        };
        delete req.session.previewBranche;
    }
    res.render('branchen_admin_edit', { branche, templates: templatesResult.rows });
});

router.post('/admin/branchen/:id/bearbeiten', async (req, res) => {
    const { id } = req.params;
    const { slug, title, intro, benefit_intro, keywords, template_id, action } = req.body;
    const keywordArray = keywords.split(',').map(k => k.trim());

    if (action === 'preview') {
        req.session.previewBranche = { id, slug, title, intro, benefit_intro, keywords, template_id };
        const templateRes = await pool.query('SELECT * FROM branchen_templates WHERE id = $1', [template_id]);
        if (templateRes.rowCount === 0) return res.status(404).send('Template nicht gefunden');
        const template = templateRes.rows[0];
        return res.render('branchen_admin_preview', {
            branche: {
                slug, title, intro, benefit_intro, keywords: keywordArray,
                pakete: template.pakete, faq: template.faq, features: template.features
            },
            formData: { id, slug, title, intro, benefit_intro, keywords, template_id }
        });
    }

    try {
        await pool.query(`UPDATE branchen SET slug = $1, title = $2, intro = $3, benefit_intro = $4, keywords = $5, template_id = $6 WHERE id = $7`,
            [slug, title, intro, benefit_intro, keywordArray, template_id, id]
        );
        req.flash('success', 'Branche erfolgreich aktualisiert.');
        res.redirect('/admin/branchen');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Fehler beim Aktualisieren.');
        res.redirect('/admin/branchen');
    }
});

// Öffentliche Branchenseite
router.get('/branchen/:slug', async (req, res) => {
    const { slug } = req.params;
    const brancheResult = await pool.query('SELECT * FROM branchen WHERE slug = $1', [slug]);
    if (brancheResult.rowCount === 0) return res.status(404).send('Branche nicht gefunden');
    const branche = brancheResult.rows[0];
    const templateResult = await pool.query('SELECT * FROM branchen_templates WHERE id = $1', [branche.template_id]);
    if (templateResult.rowCount === 0) return res.status(500).send('Template nicht gefunden');
    const template = templateResult.rows[0];
    res.render('branchen-template', {
        branche: {
            ...branche,
            pakete: template.pakete,
            faq: template.faq,
            features: template.features
        }
    });
});

export default router;