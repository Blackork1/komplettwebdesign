import pool from '../util/db.js';
import cloudinary from '../util/cloudinary.js';
import fs from 'fs';
import { log } from 'console';

// Formular für neue Komponente
export function getNewComponentForm(req, res) {
    const pageId = req.params.pageId;
    const parentId = req.query.parent || null;
    console.log(req.app.get('cssClasses'));

    res.render('admin/component_form', {
        page: { id: pageId }, component: null, parentId,
        cssClasses: req.app.get('cssClasses'),
        fieldConfig: req.app.get('fieldConfig')
    });
}

// Formular zum Bearbeiten
export async function getEditComponentForm(req, res) {
    const { id } = req.params;
    const db = req.app.get('db');
    const { rows } = await db.query('SELECT * FROM components WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).send('Komponente nicht gefunden');
    const component = rows[0];
    const { rows: pages } = await db.query('SELECT * FROM pages WHERE id=$1', [component.page_id]);
    const page = pages[0] || null;
    res.render('admin/component_form', {
        page, component, parentId: component.parent_id,
        cssClasses: req.app.get('cssClasses'),
        fieldConfig: req.app.get('fieldConfig')
    });
}

// Komponente erstellen
export async function postCreateComponent(req, res) {
    const db = req.app.get('db');
    const cloud = req.app.get('cloudinary');
    const b = req.body;
    let src = b.src || null;
    let publicId = null;
    // Bild-Upload
    if (req.file) {
        const uploadRes = await cloud.uploader.upload(req.file.path, {
            folder: 'Bilder', format: 'webp',
            transformation: [
                { width: 500, crop: "scale" },
                { fetch_format: 'auto' },
                { quality: 'auto' }
            ]
        });
        src = uploadRes.secure_url;
        publicId = uploadRes.public_id;
        fs.unlinkSync(req.file.path);
    }

    // order_index ermitteln
    const { rows: idxRows } = await db.query(
        b.parent_id
            ? 'SELECT COALESCE(MAX(order_index), -1)+1 AS idx FROM components WHERE parent_id=$1'
            : 'SELECT COALESCE(MAX(order_index), -1)+1 AS idx FROM components WHERE page_id=$1 AND parent_id IS NULL',
        [b.parent_id || b.page_id]
    );
    const orderIndex = idxRows[0].idx;

    // Insert
    const cols = ['page_id', 'parent_id', 'type', 'content', 'src', 'href', 'alt', 'classes',
        'input_type', 'placeholder', 'name', 'value', 'options', 'required', 'pattern', 'minlength',
        'action', 'method', 'public_id', 'order_index'];
    const vals = cols.map((_, i) => `$${i + 1}`).join(',');
    const params = cols.map(c => b[c] || null);
    params[4] = src; params[18] = publicId; params[19] = orderIndex;
    await db.query(`INSERT INTO components(${cols.join(',')}) VALUES(${vals})`, params);

    res.redirect(`/admin/pages/${b.page_id}/edit`);
}

// Komponente löschen
export async function getDeleteComponent(req, res) {
    const db = req.app.get('db');
    const cloud = req.app.get('cloudinary');
    const { id } = req.params;
    const { rows } = await db.query('SELECT page_id, public_id FROM components WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).send('Kein Datensatz');
    const { page_id: pageId, public_id } = rows[0];
    if (public_id) {
        try {
            await cloud.uploader.destroy(public_id);
            console.log(`✅ Cloudinary-Asset ${public_id} gelöscht.`);
        } catch { };
    }
    await db.query('DELETE FROM components WHERE id=$1', [id]);
    res.redirect(`/admin/pages/${pageId}/edit`);
}

// Aktualisiert parent_id und order_index in der DB
export async function postReorderComponents(req, res) {
    const db = req.app.get('db');
    const { parentId, order } = req.body; // Bsp: { parentId: null, order: ['3','5','2'] }
    try {
        for (let i = 0; i < order.length; i++) {
            await db.query(
                'UPDATE components SET parent_id=$1, order_index=$2 WHERE id=$3',
                [parentId, i, order[i]]
            );
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Fehler beim Aktualisieren der Reihenfolge:', err);
        res.sendStatus(500);
    }
}


export async function postUpdateComponent(req, res) {
    const db = req.app.get('db');
    const cloud = req.app.get('cloudinary');
    const { id } = req.params;
    const b = req.body;

    // Hole bestehende Komponente
    const { rows: compRows } = await db.query(
        'SELECT * FROM components WHERE id=$1',
        [id]
    );
    if (!compRows.length) return res.status(404).send('Komponente nicht gefunden');
    const comp = compRows[0];

    // Bild-Upload (unverändert)
    let src = b.src || comp.src;
    let publicId = comp.public_id;
    if (req.file) {
        if (comp.public_id) {
            try { await cloud.uploader.destroy(comp.public_id); } catch { }
        }
        const up = await cloud.uploader.upload(req.file.path, {
            folder: 'Bilder', format: 'webp'
        });
        src = up.secure_url;
        publicId = up.public_id;
        fs.unlinkSync(req.file.path);
    }

    // Integer-Felder korrekt mappen
    const required = b.required ? true : false;
    const minlength = b.minlength ? parseInt(b.minlength, 10) : null;
    const orderIndex = b.order_index ? parseInt(b.order_index, 10) : comp.order_index;

    // Update-Query
    await db.query(
        `UPDATE components SET
       content      = $1,
       src          = $2,
       href         = $3,
       alt          = $4,
       classes      = $5,
       input_type   = $6,
       placeholder  = $7,
       name         = $8,
       value        = $9,
       options      = $10,
       required     = $11,
       pattern      = $12,
       minlength    = $13,
       action       = $14,
       method       = $15,
       public_id    = $16,
       order_index  = $17
     WHERE id = $18`,
        [
            b.content || null,
            src,
            b.href || null,
            b.alt || null,
            b.classes || null,
            b.input_type || null,
            b.placeholder || null,
            b.name || null,
            b.value || null,
            b.options || null,
            required,
            b.pattern || null,
            minlength,
            b.action || null,
            b.method || 'post',
            publicId,
            orderIndex,
            id
        ]
    );

    res.redirect(`/admin/pages/${comp.page_id}/edit`);
}
