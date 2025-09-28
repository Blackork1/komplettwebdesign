import { Router } from 'express';
import multer from 'multer';
import * as Admin from '../controllers/adminIndustriesController.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// 1) Statische Pfade VOR :id
r.get('/industries/import', Admin.importForm);
r.post('/industries/import', Admin.importJSON);
r.post('/industries/import/file', upload.single('file'), Admin.importFile);

r.get('/industries', Admin.list);
r.get('/industries/new', Admin.newForm);
r.post('/industries', Admin.create);

// 2) :id-Routen OHNE Regex + Guard
r.get('/industries/:id/edit', Admin.ensureUuid, Admin.editForm);
r.post('/industries/:id', Admin.ensureUuid, Admin.update);
r.post('/industries/:id/delete', Admin.ensureUuid, Admin.remove);

export default r;
