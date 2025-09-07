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
      title: 'Website in Berlin erstellen lassen – Landingpage, Blog, Shop',
      description: 'Schnelle, SEO-optimierte Websites in Berlin erstellen lassen: Konzept bis Hosting. Mit eigenen Blog und Onlineshop deinen Umsatz steigern. Kostenlose Beratung!',
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
    title: 'Über uns - Wer ist Komplett Webdesign?',
    description: 'Erfahren Sie mehr über KomplettWebdesign und mich. Ich bin ein leidenschaftlicher Webentwickler aus Berlin, der es liebt, kreative und funktionale Websites zu erstellen.',
    keywords: 'Webdesign,Webentwicklung,Über uns,KomplettWebdesign'
  });
}

export async function getPolicy(req, res) {
  res.render('return_policy', {
    title: 'Return Policy / Rückgaberegelung – Komplett Webdesign',
    description: 'Unsere rechtlich verbindliche Rückgaberegelung für individuell erstellte Software-Projekte. Keine Rückgabe möglich.',
  });
}