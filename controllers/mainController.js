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
      title: 'Professionelle Website erstellen lassen – Komplett Webdesign',
      description: 'Website erstellen lassen: Modernes Webdesign, Google-Suche optimiert, responsive für alle Endgeräte, ab 499,-€. Kostenlose Beratungsgespräch sichern!',
      keywords: 'Webdesign,Webentwicklung,Online-Marketing',
      seoExtra: `
  <link rel="canonical" href="https://www.komplettwebdesign.de/">
  <meta property="og:title" content="Professionelle Website erstellen lassen – Komplett Webdesign">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:description" content="Website erstellen lassen: Modernes Webdesign, Google-Suche optimiert & Hosting aus einer Hand. Landingpage ab 499 €.">
  <meta property="og:image" content="https://www.komplettwebdesign.de/images/heroBg.webp">
  <meta property="og:url" content="https://www.komplettwebdesign.de/">
  <meta property="og:type" content="website">`,
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
    title: 'Über uns - Wer ist Komplett Webdesign?',
    description: 'Erfahren Sie mehr über Komplett Webdesign und mich. Ich bin ein leidenschaftlicher Webentwickler aus Berlin, der es liebt, kreative und funktionale Websites zu erstellen.',
    keywords: 'Webdesign,Webentwicklung,Über uns,KomplettWebdesign'
  });
}

export async function getBranchen(req, res) {
  const packages = await Package.fetchAll();

  res.render('branchen-tempaltes', {
    title: 'Branchen-Websites erstellen lassen – Komplett Webdesign',
    description: 'Professionelles Webdesign für verschiedene Branchen: Lass deine Website von Experten erstellen. Maßgeschneiderte Lösungen für deinen Erfolg.',
    keywords: 'Webdesign,Branchen-Websites,Webentwicklung',
    packages
  });
}


export async function getPolicy(req, res) {
  res.render('return_policy', {
    title: 'Return Policy / Rückgaberegelung – Komplett Webdesign',
    description: 'Unsere rechtlich verbindliche Rückgaberegelung für individuell erstellte Software-Projekte. Keine Rückgabe möglich.',
  });
}