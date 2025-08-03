import bodyParser from 'body-parser';
import env from "dotenv";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { log } from 'console';
import Stripe from 'stripe';
import branchenapp from './routes/branchen.js';
import session from 'express-session';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import fs from 'fs';
import { FIELD_CONFIG } from './helpers/componentConfig.js';   // ① NEU
import compression from 'compression';


env.config();
const app = express();
app.use(compression());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15'
});
const upload = multer({ dest: 'uploads/' }); // Temporäre Speicherung der Dateien


// 1) Webhook-Route VOR allen Body-Parsern
app.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('⚠️ Webhook Error:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await pool.query(
                    `UPDATE orders SET status = $1 WHERE stripe_session_id = $2`,
                    ['paid', session.id]
                );
                console.log(`✅ Order ${session.id} als bezahlt markiert.`);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await pool.query(
                    `UPDATE orders SET status = $1 WHERE stripe_session_id = $2`,
                    ['active', invoice.subscription]
                );
                console.log(`📄 Abo ${invoice.subscription} als aktiv markiert.`);
                break;
            }
            default:
                console.log(`– Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    }
);

app.set('view engine', 'ejs');

// 🆕 Zentrale Static‑Middleware
const staticOptions = process.env.NODE_ENV === 'development'
  ? { maxAge: 0 }
  : { immutable: true, maxAge: '365d' };      // 1 Jahr, Client‑Revalidation deaktiviert

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), staticOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(branchenapp);
app.use(session({
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

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mein-cloud-name',
    api_key: process.env.CLOUDINARY_API_KEY || 'abcd1234',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'geheim'
});

// Datenbank- und Cloudinary-Instanzen für app verfügbar machen
app.set('db', pool);
app.set('cloudinary', cloudinary);

pool.connect((err, client, done) => {
    if (err) {
        console.error('❌ Fehler beim Verbinden zur Datenbank:', err);
        return;
    }
    console.log('✅ Erfolgreich mit der Datenbank verbunden');
    done();
});

let cssClassSuggestions = [];
try {
    const css = fs.readFileSync('./public/styles.css', 'utf8');
    const rx = /\.([\w\-\\:\/]+)\s*\{/g;           // .klasse {  … }
    let m; while ((m = rx.exec(css)) !== null) {
        cssClassSuggestions.push(m[1].replace(/\\/g, ''));
    }
} catch { /* Datei fehlt → einfach leer lassen */ }
cssClassSuggestions = [...new Set(cssClassSuggestions)].sort();

// Startseite anzeigen
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');

        // 1) Lade alle Pakete
        const pkgRes = await pool.query(`
        SELECT id, name, price_amount_cents, description, details, stripe_price_id_once
        FROM packages
        ORDER BY id
      `);

        // 2) Lade alle Features
        const featRes = await pool.query(`
        SELECT package_id, feature
        FROM package_features
        ORDER BY id
      `);

        // 3) Features gruppieren
        const featMap = {};
        featRes.rows.forEach(({ package_id, feature }) => {
            featMap[package_id] = featMap[package_id] || [];
            featMap[package_id].push(feature);
        });

        const packages = pkgRes.rows.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            // details ist bereits Array von Strings
            details: pkg.details,
            price: (pkg.price_amount_cents / 100).toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }),
            features: featMap[pkg.id] || [],
            priceId: pkg.stripe_price_id_once
        }));

        console.log("price id is", packages[0].priceId);


        // Neuester Blog-Post inkl. image_url
        const postResult = await pool.query(`
        SELECT id, title, slug, excerpt, image_url, created_at
        FROM posts
        WHERE published = true
        ORDER BY created_at DESC
        LIMIT 1
      `);

        const defaultPost = {
            title: 'Demnächst hier: Neue Blog-Artikel!',
            slug: '/blog',
            excerpt: 'Schau bald wieder vorbei für spannende Tipps & Tricks zu Webdesign.',
            image_url: '/images/default-blog.jpg',  // dein Platzhalterbild
            created_at: new Date(),
            isDefault: true
        };
        const latestPost = postResult.rows[0] || defaultPost;

        // 2) Eine zufällige, freigegebene Review
        const reviewResult = await pool.query(`
              SELECT author, content, avatar_url
              FROM reviews
              WHERE approved = true
              ORDER BY RANDOM()
              LIMIT 1
            `);

        // Default-Review, wenn keine Rezession vorliegt
        const defaultReview = {
            author: 'Deine Meinung ist hier willkommen!',
            content: 'In Kürze findest du hier echte Kundenstimmen zu meinen Webdesign-Projekten.',
            avatar_url: '/images/default-avatar.png',
            isDefault: true
        };
        const review = reviewResult.rows[0] || defaultReview;

        log('Datenbankabfrage:', result.rows);
        res.render('index', {
            title: 'Willkommen auf meinen Seite KomplettWebdesign!',
            description: 'Hier findest du alles rund um Webdesign, Webentwicklung und Online-Marketing.',
            keywords: 'Webdesign, Webentwicklung, Online-Marketing, Komplettwebdesign, Webseite erstellen lassen, Handwerker Website erstellen lassen',
            users: result.rows,
            latestPost,
            review,
            packages,
            stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY,
            YOUR_DOMAIN: process.env.YOUR_DOMAIN
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Abrufen der Daten.');
    }
});

app.get('/test', (req, res) => {
    res.render('test', {
        title: 'Testseite'
    });
});

// 4) Pricing-Seite
app.get('/pricing', async (req, res) => {
    const { rows: packages } = await pool.query('SELECT * FROM packages');
    res.render('pricing', {
        packages,
        stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY,
        YOUR_DOMAIN: process.env.YOUR_DOMAIN
    });
});

// 5) Checkout-Session erzeugen
app.post('/create-checkout-session', async (req, res) => {
    const { packageId, mode } = req.body;
    if (!packageId || !mode) {
        return res.status(400).json({ error: 'packageId und mode erforderlich' });
    }

    const { rows } = await pool.query('SELECT * FROM packages WHERE id = $1', [packageId]);
    const pkg = rows[0];
    const priceId = mode === 'once'
        ? pkg.stripe_price_id_once
        : pkg.stripe_price_id_recurring;

    if (!priceId || !priceId.startsWith('price_')) {
        console.error('Ungültige Stripe Price ID:', priceId);
        return res.status(500).json({ error: 'Ungültige Preis-Konfiguration. Bitte prüfe stripe_price_id_once/-recurring in deiner DB.' });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: mode === 'once' ? 'payment' : 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.YOUR_DOMAIN}/cancel`
    });

    await pool.query(
        `INSERT INTO orders (user_email, package_id, stripe_session_id, mode, status)
       VALUES ($1,$2,$3,$4,$5)`,
        [null, packageId, session.id, mode, 'open']
    );

    res.json({ sessionId: session.id });
});

// Neues Element speichern
app.post('/add', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO users (name) VALUES ($1)', [name]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Speichern.');
    }
});

// Benutzer löschen
app.post('/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Löschen.');
    }
});

app.get("/restaurant-komplett", (req, res) => {
    res.render("restaurant-komplett")
});

// 6) Success & Cancel
app.get('/success', (req, res) => res.send('Bezahlung erfolgreich!'));
app.get('/cancel', (req, res) => res.redirect('/'));


// 7) Branchen-Admin-Bereich
// Seitenübersicht (Liste aller Seiten)
/* 1) Seitenliste */
app.get('/admin/pages', async (req, res) => {
    const pool = req.app.get('db');
    try {
        const { rows: pages } = await pool.query('SELECT * FROM pages ORDER BY id');
        res.render('admin/pages_list', { pages });
    } catch (err) {
        console.error('Fehler beim Laden der Seitenliste:', err);
        res.status(500).send('Interner Serverfehler');
    }
});

/* 2) Neue Seite anlegen */
app.get('/admin/pages/new', (_, res) =>
    res.render('admin/page_form', { page: null })
);

app.post('/admin/pages', async (req, res) => {
    const pool = req.app.get('db');
    const { title, slug } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO pages(title, slug) VALUES($1,$2) RETURNING id',
            [title, slug]
        );
        res.redirect(`/admin/pages/${rows[0].id}/edit`);
    } catch (err) {
        console.error('Fehler beim Erstellen der Seite:', err);
        res.status(500).send('Seite konnte nicht erstellt werden (Slug doppelt?)');
    }
});

/* 3) Seite löschen */
app.get('/admin/pages/:id/delete', async (req, res) => {
    const pool = req.app.get('db');
    const pageId = req.params.id;
    try {
        await pool.query('DELETE FROM pages WHERE id=$1', [pageId]);   // CASCADE löscht auch Komponenten
        res.redirect('/admin/pages');
    } catch (err) {
        console.error('Fehler beim Löschen der Seite:', err);
        res.status(500).send('Seite konnte nicht gelöscht werden');
    }
});

/* 4) Seite bearbeiten (Builder) */
app.get('/admin/pages/:id/edit', async (req, res) => {
    const pool = req.app.get('db');
    const pageId = req.params.id;

    /* Seite + Komponenten laden */
    const pageRes = await pool.query('SELECT * FROM pages WHERE id=$1', [pageId]);
    if (!pageRes.rowCount) return res.status(404).send('Seite nicht gefunden');
    const page = pageRes.rows[0];

    const { rows: comps } = await pool.query(
        'SELECT * FROM components WHERE page_id=$1 ORDER BY order_index',
        [pageId]
    );

    /* Baumstruktur bauen */
    const map = {}; comps.forEach(c => (c.children = [], map[c.id] = c));
    const roots = [];
    comps.forEach(c => (c.parent_id ? map[c.parent_id]?.children.push(c)
        : roots.push(c)));
    roots.forEach(c =>
        c.children.sort((a, b) => a.order_index - b.order_index)
    );

    res.render('admin/page_edit', { page, components: roots, cssClasses: cssClassSuggestions });
});

/* 5) Komponente-Formulare */
app.get('/admin/pages/:pageId/components/new', async (req, res) => {
    const pool = req.app.get('db');
    const { pageId } = req.params;
    const parentId = req.query.parent || null;

    const pageRes = await pool.query('SELECT * FROM pages WHERE id=$1', [pageId]);
    const page = pageRes.rowCount ? pageRes.rows[0] : null;

    res.render('admin/component_form', {
        page, component: null, parentId,
        cssClasses: cssClassSuggestions,
        fieldConfig: FIELD_CONFIG     // ③ für dynamisches UI
    });
});

app.get('/admin/components/:id/edit', async (req, res) => {
    const pool = req.app.get('db');
    const compId = req.params.id;

    const compRes = await pool.query('SELECT * FROM components WHERE id=$1', [compId]);
    if (!compRes.rowCount) return res.status(404).send('Komponente nicht gefunden');
    const component = compRes.rows[0];

    const pageRes = await pool.query('SELECT * FROM pages WHERE id=$1', [component.page_id]);
    const page = pageRes.rowCount ? pageRes.rows[0] : null;

    res.render('admin/component_form', {
        page, component, parentId: component.parent_id,
        cssClasses: cssClassSuggestions,
        fieldConfig: FIELD_CONFIG
    });
});

/* 6) Komponente anlegen */
app.post('/admin/components', upload.single('imageFile'), async (req, res) => {
    const pool = req.app.get('db');
    const cloudinary = req.app.get('cloudinary');
    const b = req.body;                 // für Kürze
    // const { page_id, parent_id, type, content, href,
    //     classes, alt, input_type, placeholder } = req.body;
    let src = req.body.src || null;
    let publicId = null; // für Cloudinary

    try {
        if (req.file) {                       // Bild hochladen
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: 'Bilder', format: "webp",
                transformation: [
                    { width: 1000, crop: "scale" },
                    { fetch_format: 'auto' },
                    { quality: 'auto' }
                ]
            });
            src = uploadResult.secure_url;      // vollständige Bild‐URL
            publicId = uploadResult.public_id;  // z. B. "foldername/imagename_xyz"
            // const { secure_url } = await cloudinary.uploader.upload(req.file.path);
            // src = secure_url;

            fs.unlink(req.file.path, () => { });
        }

        const { rows: [{ idx }] } = await pool.query(
            b.parent_id
                ? 'SELECT COALESCE(MAX(order_index),-1)+1 AS idx FROM components WHERE parent_id=$1'
                : 'SELECT COALESCE(MAX(order_index),-1)+1 AS idx FROM components WHERE page_id=$1 AND parent_id IS NULL',
            [b.parent_id || b.page_id]);
        // INSERT
        await pool.query(`
    INSERT INTO components
      (page_id,parent_id,type,content,src,href,alt,classes,input_type,placeholder,name,value,options,required,pattern,minlength,action,method,public_id, order_index)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
  `, [b.page_id, b.parent_id || null, b.type, b.content || null, src, b.href || null,
        b.alt || null, b.classes || null, b.input_type || null, b.placeholder || null,
        b.name || null, b.value || null, b.options || null, b.required ? true : false,
        b.pattern || null, b.minlength || null, b.action || null, b.method || 'post', publicId, idx]);
        res.redirect(`/admin/pages/${b.page_id}/edit`);
    } catch (err) {
        console.error('Fehler beim Hinzufügen der Komponente:', err);
        res.status(500).send('Komponente konnte nicht hinzugefügt werden');
    }
});

/* 7) Komponente löschen inkl. Cloudinary-Löschung */
app.get('/admin/components/:id/delete', async (req, res) => {
    const pool = req.app.get('db');
    const cloudinary = req.app.get('cloudinary');
    const compId = req.params.id;

    try {
        // 7a)  Lade den Datensatz, um page_id + public_id zu bekommen
        const { rows } = await pool.query(
            'SELECT page_id, public_id FROM components WHERE id = $1',
            [compId]
        );
        if (!rows.length) {
            return res.status(404).send('Komponente nicht gefunden');
        }
        const { page_id: pageId, public_id } = rows[0];

        // 7b)  Wenn public_id existiert, lösche das Bild bei Cloudinary
        if (public_id) {
            try {
                await cloudinary.uploader.destroy(public_id);
                console.log(`✅ Cloudinary-Asset ${public_id} gelöscht.`);
            } catch (cloudErr) {
                console.error(`⚠️ Fehler beim Löschen des Cloudinary-Assets ${public_id}:`, cloudErr);
                // Falls gewünscht, hier weiterfahren, auch wenn Cloudinary‐Löschung fehlschlägt
            }
        }

        // 7c)  Jetzt den DB‐Eintrag entfernen (Kinder werden per ON DELETE CASCADE mitgelöscht)
        await pool.query('DELETE FROM components WHERE id = $1', [compId]);

        // 7d)  Zurück zur Seite‐Bearbeiten‐Ansicht weiterleiten
        res.redirect(`/admin/pages/${pageId}/edit`);
    } catch (err) {
        console.error('Fehler beim Löschen der Komponente:', err);
        res.status(500).send('Komponente konnte nicht gelöscht werden');
    }
});


/* 8) Reihenfolge nach Drag&Drop speichern (AJAX) */
app.post('/admin/components/reorder', async (req, res) => {
    const pool = req.app.get('db');
    const { parentId, order } = req.body;    // parentId = null  ⇒  Ebene 0

    try {
        for (let i = 0; i < order.length; i++) {
            await pool.query(
                'UPDATE components SET parent_id=$1, order_index=$2 WHERE id=$3',
                [parentId, i, order[i]]          // parent_id UND order_index setzen
            );
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Fehler beim Aktualisieren der Reihenfolge:', err);
        res.sendStatus(500);
    }
});
/* 9) Komponente aktualisieren */
app.post('/admin/components/:id', upload.single('imageFile'), async (req, res) => {
    const pool = req.app.get('db');
    const cloudinary = req.app.get('cloudinary');
    const compId = req.params.id;

    // Felder aus req.body (z. B. content, href, alt, classes, input_type, placeholder)
    const { content, href, classes, alt, input_type, placeholder } = req.body;
    let src = req.body.src || null;
    let publicId = null; // Falls du den public_id ebenfalls überschreiben willst

    try {
        const compRes = await pool.query('SELECT * FROM components WHERE id=$1', [compId]);
        if (!compRes.rowCount) return res.status(404).send('Komponente nicht gefunden');
        const comp = compRes.rows[0];

        if (req.file) {
            // 1) Falls vorher schon ein public_id existierte, optional dort löschen:
            if (comp.public_id) {
                try {
                    await cloudinary.uploader.destroy(comp.public_id);
                } catch (delErr) {
                    console.error('Fehler beim Löschen alter Cloudinary-Datei:', delErr);
                }
            }
            // 2) Neues Bild hochladen in "home/bilder"
            const uploadResult = await cloudinary.uploader.upload(
                req.file.path,
                {
                    folder: 'Bilder', format: "webp",
                    transformation: [
                        { width: 1000, crop: "scale" },
                        { fetch_format: 'auto' },
                        { quality: 'auto' }
                    ]
                }
            );
            src = uploadResult.secure_url;
            publicId = uploadResult.public_id;
            fs.unlink(req.file.path, () => { });
        }

        // 3) Update-Query anpassen: ergänzt nun src und ggf. public_id
        await pool.query(
            `UPDATE components SET content=$1, src=$2, href=$3, alt=$4, classes=$5, input_type=$6, placeholder=$7, public_id=$8 WHERE id=$9`,
            [content || null, src, href || null, alt || null, classes || null, input_type || null, placeholder || null, publicId, compId]
        );
        res.redirect(`/admin/pages/${comp.page_id}/edit`);
    } catch (err) {
        console.error('Fehler beim Aktualisieren der Komponente:', err);
        res.status(500).send('Änderungen konnten nicht gespeichert werden');
    }
});


// 8) Öffentliche Seiten (Frontend)
app.get('/:slug', async (req, res, next) => {
    try {
        const { rows: pr } = await pool.query('SELECT * FROM pages WHERE slug=$1', [req.params.slug]);
        if (!pr.length) return next();
        const page = pr[0];

        const { rows: comps } = await pool.query(
            'SELECT * FROM components WHERE page_id=$1 ORDER BY order_index',
            [page.id]
        );
        const map = {}; comps.forEach(c => (c.children = [], map[c.id] = c));
        const roots = [];
        comps.forEach(c => (c.parent_id ? map[c.parent_id]?.children.push(c) : roots.push(c)));
        roots.forEach(c => c.children.sort((a, b) => a.order_index - b.order_index));

        res.render('page_view', { title: page.title, description: page.description, page, components: roots });
    } catch (err) {
        console.error("Fehler beim Rendern der Seite:", err);
        res.status(500).send("Interner Serverfehler");
    }
});


app.listen(3000, () => {
    console.log('✅ Webhook-Deployment Test v2');

    console.log('✅ Server läuft auf Port 3000');
});