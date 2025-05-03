import bodyParser from 'body-parser';
import env from "dotenv";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { log } from 'console';

env.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),        // jetzt 443, nicht 5432
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL, testing neuer 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20
//     ssl: false
// });


pool.connect((err, client, done) => {
    if (err) {
        console.error('❌ Fehler beim Verbinden zur Datenbank:', err);
        return;
    }
    console.log('✅ Erfolgreich mit der Datenbank verbunden');
    done();
});

// Startseite anzeigen
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        log('Datenbankabfrage:', result.rows);
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



