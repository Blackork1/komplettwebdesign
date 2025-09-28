import { Router } from 'express';
import { showIndustryPage } from '../controllers/industriesController.js';

const r = Router();
// z.B. /branchen/cafe, /branchen/arztpraxis, ...
r.get('/webdesign-:slug', showIndustryPage);

export default r;
