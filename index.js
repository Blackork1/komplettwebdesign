import { webcrypto } from 'crypto';
if (!global.crypto) {
  global.crypto = webcrypto;
}
import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';


import pool from './util/db.js';
import cloudinary from './util/cloudinary.js';

import { getAvailableCssFiles, getCssClasses } from './helpers/cssHelper.js';
import { FIELD_CONFIG } from './helpers/componentConfig.js';
import { navbarMiddleware } from './helpers/navHelper.js';
// import sessionMiddleware                          from './middleware/session.js';
import consentMiddleware from './middleware/consentMiddleware.js';
import { accessLog } from './middleware/accessLog.js';



import mainRoutes from './routes/main.js';
import pricingRoutes from './routes/pricing.js';
import checkoutRoutes from './routes/checkout.js';
import webhookRoutes from './routes/webhook.js';
import * as errorController from './controllers/errorController.js';
import adminPageRoutes from './routes/adminPages.js';
import adminComponentRoutes from './routes/adminComponents.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import slugRoutes from './routes/slug.js';
import widgetApiRoutes from './routes/widgetApiRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import adminBlogRoutes from './routes/adminBlogRoutes.js';
import newsletterRoutes from './routes/newsletter.js';
import starticPagesRoutes from './routes/staticPages.js';
import packageRoutes from './routes/packages.js';
import faqRoutes from './routes/faq.js';
import contactRoutes from "./routes/contactRoutes.js";
import chatRoutes from './routes/chat.js';
import adminGalleryRoutes from './routes/adminGalleryRoutes.js';
import consentRoutes from './routes/consent.js';
import shopRoutes from './routes/shopRoutes.js';
import districtRoutes from "./routes/districtRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";
import adminLogs from './routes/adminLogs.js';



import Stripe from 'stripe';

// Umgebungsvariablen laden
dotenv.config();
// Cookie-Parser für Cookie-Zustimmung
const app = express();

app.set('trust proxy', true);            // hinter Cloudflare wichtig

app.use(cookieParser());
app.use((req, res, next) => {
  let enabled = false;
  try {
    const consent = JSON.parse(req.cookies.cookieConsent);
    enabled = Boolean(consent.analytics);
  } catch { }
  res.locals.gaEnabled = enabled;
  next();
});

app.disable('x-powered-by');      // Header unterdrücken
// 2) nur in Production aktivieren
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy', 1);

  const CANON_HOST = 'www.komplettwebdesign.de';
  const IGNORED_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
  const isPrivateLan = (h) =>
    /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(h);

  app.use((req, res, next) => {
    const hostHeader = req.headers.host || '';             // z.B. "komplettwebdesign.de:3000"
    const hostname = hostHeader.replace(/:\d+$/, '');    // Port rauswerfen
    const protoHdr = (req.get('x-forwarded-proto') || req.protocol).toLowerCase();

    // 1) Ausnahmen: Localhost, inneres Docker-Netz, …
    if (IGNORED_HOSTS.includes(hostname) || isPrivateLan(hostname)) {
      return next();
    }

    // 2) prüfen, ob HTTPS & WWW
    const needsHttps = protoHdr !== 'https';
    const needsWww = !hostname.startsWith('www.');

    if (needsHttps || needsWww) {
      // Pfad + Query aus req.originalUrl (inkl. "/kontakt" oder "?foo=bar")
      const suffix = req.originalUrl || '/';
      console.log("Suffix:", suffix);
      // neuer Host
      const targetHost = CANON_HOST;
      const redirectTo = `https://${targetHost}${suffix}`;
      return res.redirect(301, redirectTo);
    }

    next();
  });
}

app.use(compression());

// EJS konfigurieren
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static und Body-Parser
const staticOpts = process.env.NODE_ENV === 'development'
  ? { maxAge: 0 } : { immutable: true, maxAge: '365d' };
app.use(express.static(path.join(__dirname, 'public'), staticOpts));
// app.get('/sitemap.xml', (_req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
// });
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';

// Session
const PgSession = connectPg(session);
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProd, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 Tage
}));

app.use(consentMiddleware);               // setzt req/session/locals


app.use(accessLog({                     
  pool,
  getConsent: (req) => ({ analytics: !!req.session?.cookieConsent?.analytics }),
  useMaxMind: false,              // auf true stellen, wenn du City/Region willst
  // maxmindCityPath: '/data/GeoLite2-City.mmdb',
  excludePrivate: true,           // ::1 / 127.0.0.1 etc. nicht speichern
  respectDNT: true                // falls du DNT respektieren willst
}));

// DB, Cloudinary & Stripe auf app setzen
app.set('db', pool);
app.set('cloudinary', cloudinary);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
app.set('stripe', stripe);

// CSS-Klassen & Feldkonfiguration
app.set('cssClasses', getCssClasses());
app.set('fieldConfig', FIELD_CONFIG);

// Verfügbare CSS-Dateien aus public/css global bereitstellen
// (damit z.B. page_edit.ejs und alle anderen Views darauf zugreifen können)
const availableCssFiles = getAvailableCssFiles();
app.locals.availableCssFiles = availableCssFiles;
app.use(navbarMiddleware(pool));

// ganz am Anfang von index.js
process.on('unhandledRejection', err => {
  console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', err => {
  console.error('❌ Uncaught Exception:', err);
});

// Routen einbinden
app.use('/', mainRoutes);
app.use('/pricing', pricingRoutes);
app.use('/create-checkout-session', checkoutRoutes);
app.use('/webhook', webhookRoutes);
app.use('/admin/pages', adminPageRoutes);
app.use(adminComponentRoutes);
app.use(slugRoutes);
app.use(authRoutes);
app.use(bookingRoutes);
app.use(adminRoutes);
app.use(widgetApiRoutes);
app.use(newsletterRoutes);
app.use(blogRoutes);
app.use(adminBlogRoutes);
app.use('/', starticPagesRoutes);
app.use(packageRoutes);
app.use(faqRoutes);
app.use("/kontakt", contactRoutes);
app.use(chatRoutes);
app.use(adminGalleryRoutes);
app.use('/api/consent', consentRoutes);
app.use(shopRoutes);
app.use("/webdesign-berlin", districtRoutes);
app.use(adminLogs);


// Sitemap
app.use("/", sitemapRoutes);

// 404-Handler
app.use(errorController.get404);
// 500-Handler
app.use(errorController.get500);

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server läuft auf Port ${PORT}`));