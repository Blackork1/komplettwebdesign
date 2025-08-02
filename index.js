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

import pool from './util/db.js';
import cloudinary from './util/cloudinary.js';

import { getAvailableCssFiles, getCssClasses }  from './helpers/cssHelper.js';
import { FIELD_CONFIG }                         from './helpers/componentConfig.js';
import { navbarMiddleware }                     from './helpers/navHelper.js';

import mainRoutes           from './routes/main.js';
import pricingRoutes        from './routes/pricing.js';
import checkoutRoutes       from './routes/checkout.js';
import webhookRoutes        from './routes/webhook.js';
import * as errorController from './controllers/errorController.js';
import adminPageRoutes      from './routes/adminPages.js';
import adminComponentRoutes from './routes/adminComponents.js';
import authRoutes           from './routes/authRoutes.js';
import bookingRoutes        from './routes/bookingRoutes.js';
import adminRoutes          from './routes/adminRoutes.js';
import slugRoutes           from './routes/slug.js';
import widgetApiRoutes      from './routes/widgetApiRoutes.js';   
import blogRoutes           from './routes/blogRoutes.js';
import adminBlogRoutes      from './routes/adminBlogRoutes.js';
import newsletterRoutes     from './routes/newsletter.js';
import starticPagesRoutes   from './routes/staticPages.js';
import packageRoutes        from './routes/packages.js';
import faqRoutes            from './routes/faq.js';
import contactRoutes        from "./routes/contactRoutes.js";
import chatRoutes           from './routes/chat.js';


import Stripe from 'stripe';



// Umgebungsvariablen laden
dotenv.config();


const app = express();
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
app.get('/sitemap.xml', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Session
const PgSession = connectPg(session);
app.use(session({
  store: new PgSession({pool, createTableIfMissing: true}),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000*60*60 } // 1 Tag
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
app.use('/admin/pages',      adminPageRoutes);
app.use(adminComponentRoutes);
app.use(slugRoutes);
app.use(authRoutes);
app.use(bookingRoutes);
app.use(adminRoutes);
app.use(widgetApiRoutes);
// app.use('/kontakt', contactRouter);
app.use(newsletterRoutes);
app.use(blogRoutes);
app.use(adminBlogRoutes);
app.use('/', starticPagesRoutes);
app.use(packageRoutes);
app.use(faqRoutes);
app.use("/kontakt", contactRoutes);
app.use(chatRoutes);



// 404-Handler
app.use(errorController.get404);

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server läuft auf Port ${PORT}`));