import { Router } from 'express';
import * as AdminLeistungen from '../controllers/adminLeistungenPagesController.js';
import multer from 'multer';

const router = Router();
const upload = multer();

router.get('/admin/leistungen-pages/import', AdminLeistungen.importForm);
router.post('/admin/leistungen-pages/import/json', AdminLeistungen.importJSON);
router.post('/admin/leistungen-pages/import/file', upload.single('file'), AdminLeistungen.importFile);

export default router;