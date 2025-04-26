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

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/', (req, res) => res.send('Willkommen auf meinen Seite Komplett!'));

app.listen(3000, () => {
  console.log('✅ Server läuft auf Port 3000');
});

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

console.log("✨ Webhook-Test erfolgreich Kleine !");
