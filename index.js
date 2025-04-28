import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import env from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

env.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// PostgreSQL-Verbindung
const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, done) => {
    if (err) {
        console.error('❌ Fehler beim Verbinden zur Datenbank:', err);
        return;
    }
    console.log('✅ Erfolgreich mit der Datenbank verbunden');
    done();
});

app.get('/', async (req, res) => {
    try {
        res.render("index", { title: 'Willkommen auf meinen Seite Komplettwebdesign!' });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Startseite anzeigen
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.render('index', {
            title: 'Willkommen auf meinen Seite Komplettwebdesign!',
            users: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Abrufen der Daten.');
    }
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




app.listen(3000, () => {
    console.log('✅ Webhook-Deployment Test v2');

    console.log('✅ Server läuft auf Port 3000');
});



