// controllers/newsletterController.js
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
import nodemailer from 'nodemailer';

// ---------- SMTP-Transport ---------------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ---------- Anmeldung ---------------------------------------------------
export async function signup(req, res) {
  const email = (req.body.email ?? '').trim();
  console.log('Newsletter-Anmeldung:', email);
  if (!email) return res.status(400).send('E-Mail fehlt');

  try {
    const record = await NewsletterSignupModel.create(email);

    // Willkommens-Mail mit individuellem Abmelde-Link
    const mailOpts = {
      from: `"Komplettwebdesign" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Willkommen beim Komplettwebdesign-Newsletter',
      html: `
        <p>Danke für deine Anmeldung!</p>
        <p>Du kannst dich jederzeit abmelden, indem du hier klickst:</p>
        <p>
          <a href="${process.env.BASE_URL}/newsletter/unsubscribe/${record.unsubscribe_token}">
            Newsletter abbestellen
          </a>
        </p>`
    };

    // Fehler beim Senden fangen wir nur zum Logging ab
    transporter.sendMail(mailOpts).catch(console.error);

    res.redirect('/blog?subscribed=1');
  } catch (err) {
    console.error('Newsletter-Signup-Fehler:', err);
    res.status(500).send('Fehler bei der Newsletter-Anmeldung');
  }
}

// ---------- Abmeldung ---------------------------------------------------
export async function unsubscribe(req, res) {
  const { token } = req.params;
  try {
    const ok = await NewsletterSignupModel.deactivate(token);
    if (!ok) return res.status(404).send('Token ungültig oder bereits abgemeldet');

    // Einfache Bestätigungs-Seite
    res.render('newsletter/unsubscribed');     // views/newsletter/unsubscribed.ejs
  } catch (err) {
    console.error('Newsletter-Unsubscribe-Fehler:', err);
    res.status(500).send('Fehler bei der Abmeldung');
  }
}
