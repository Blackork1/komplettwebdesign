import pool from '../util/db.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import Package from '../models/Package.js';

export async function getIndex(req, res) {
  try {
    const users = await User.fetchAll();
    const packages = await Package.fetchAll();
    const latestPost = await Post.fetchLatest();
    const review = await Review.fetchRandom();

    res.render('index', {
      title: 'Website in Berlin erstellen lassen',
      description: 'Schnelle, SEO-optimierte Websites aus Berlin: Konzept, Design, Programmierung & Hosting – alles aus einer Hand. Jetzt kostenlose Beratung sichern!.',
      keywords: 'Webdesign,Webentwicklung,Online-Marketing',
      users,
      packages,
      latestPost,
      review,
      stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY,
      YOUR_DOMAIN: process.env.YOUR_DOMAIN
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten.');
  }
}

export async function redirectIndex(req, res) {
  res.redirect('/');
}

export async function postAddUser(req, res) {
  await User.create(req.body.name);
  res.redirect('/');
}

export async function postDeleteUser(req, res) {
  await User.delete(req.body.id);
  res.redirect('/');
}

export async function getAbout(req, res) {
  res.render('about', {
    title: 'Über uns - Wer ist KomplettWebdesign?',
    description: 'Erfahren Sie mehr über KomplettWebdesign und mich. Ich bin ein leidenschaftlicher Webentwickler aus Berlin, der es liebt, kreative und funktionale Websites zu erstellen.',
    keywords: 'Webdesign,Webentwicklung,Über uns,KomplettWebdesign'
  });
}