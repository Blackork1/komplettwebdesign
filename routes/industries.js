// routes/industries.js
import { Router } from 'express';
import { listIndustries, showIndustryPage, redirectOldIndustry } from '../controllers/industriesController.js';

const r = Router();

/* Übersicht */
r.get('/branchen', listIndustries);

/* Neu: gewünschtes Schema /branchen/webdesign-:slug */
r.get('/branchen/webdesign-:slug', showIndustryPage);

/* Alt: /webdesign-:slug --> 301 auf /branchen/webdesign-:slug */
r.get('/webdesign-:slug', redirectOldIndustry);

export default r;
