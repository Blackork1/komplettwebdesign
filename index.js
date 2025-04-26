import express from 'express';
import { Pool } from 'pg';

const app = express();
const PORT = 3000;

// PostgreSQL Verbindung
const pool = new Pool({
  user: 'postgres',
  host: 'postgres', // Name des Services im docker-compose
  database: 'webapp',
  password: 'geheim',
  port: 5432,
});

app.use(express.json());
app.get('/', (req, res) => {
  res.send(`
    <form method="POST" action="/submit">
      <input type="text" name="name" placeholder="Name" required><br>
      <input type="email" name="email" placeholder="Email" required><br>
      <button type="submit">Absenden</button>
    </form>
  `);
});

// Besucher abrufen
app.get('/api/visitors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM visitors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Besucher hinzufügen
app.post('/api/visitors', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name und Email sind erforderlich.' });
  }

  try {
    const insertResult = await pool.query(
      'INSERT INTO visitors (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error('❌ Fehler beim Einfügen:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});


app.post('/submit', async (req, res) => {
  const { name, email } = req.body;
  try {
    await pool.query('INSERT INTO visitors (name, email) VALUES ($1, $2)', [name, email]);
    res.send('✅ Erfolgreich gespeichert!');
  } catch (error) {
    console.error('❌ Fehler beim Einfügen:', error);
    res.status(500).send('Serverfehler beim Speichern');
  }
});


// --- CREATE ---
app.post('/api/besucher', async (req, res) => {
  const { name, email, nachricht } = req.body;
  try {
    await pool.query(
      'INSERT INTO besucher (name, email, nachricht) VALUES ($1, $2, $3)',
      [name, email, nachricht]
    );
    res.status(201).send('✅ Besucher erstellt');
  } catch (err) {
    console.error('❌ Fehler beim CREATE:', err);
    res.status(500).send('Fehler beim Anlegen');
  }
});

// --- READ ---
app.get('/api/besucher', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM besucher');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Fehler beim READ:', err);
    res.status(500).send('Fehler beim Lesen');
  }
});

// --- UPDATE ---
app.put('/api/besucher/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, nachricht } = req.body;
  try {
    await pool.query(
      'UPDATE besucher SET name=$1, email=$2, nachricht=$3 WHERE id=$4',
      [name, email, nachricht, id]
    );
    res.send('✅ Besucher aktualisiert');
  } catch (err) {
    console.error('❌ Fehler beim UPDATE:', err);
    res.status(500).send('Fehler beim Aktualisieren');
  }
});

// --- DELETE ---
app.delete('/api/besucher/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM besucher WHERE id=$1', [id]);
    res.send('✅ Besucher gelöscht');
  } catch (err) {
    console.error('❌ Fehler beim DELETE:', err);
    res.status(500).send('Fehler beim Löschen');
  }
});

// Start Webserver
app.listen(PORT, () => console.log(`🌍 Web-App läuft auf Port ${PORT}`));