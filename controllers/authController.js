import pool from '../util/db.js';
import bcrypt from 'bcrypt';

export function loginForm(req, res) {
    res.render('auth/login', { title: "Login", error: null });
}

export async function login(req, res) {
    const { username, password } = req.body;
    const { rows } = await pool.query(
        'SELECT * FROM admins WHERE username=$1', [username]);
    if (!rows.length) { return res.render('auth/login', { title: "Login", error: 'Benutzer nicht gefunden oder falsche Daten eingegeben' }); }

    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) {
        return res.render('auth/login', { title: "Login", error: 'Falsches Passwort' });
    }

    req.session.user = { is: user.id, username: user.username, isAdmin: true };
    res.redirect('/admin/appointments');
}

export function logout(req, res) {
    req.session.destroy(err => {
        if (err) { console.error('Fehler beim Zerstören der Session:', err); return res.status(500).send('Interner Serverfehler'); }
        res.redirect('/login');
    });
}