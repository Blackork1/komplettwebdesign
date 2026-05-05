import { Router } from 'express';
import * as AdminLeistungen from '../controllers/adminLeistungenPagesController.js';
import multer from 'multer';
import { isAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/admin/leistungen-pages/import', isAdmin, AdminLeistungen.importForm);
router.post('/admin/leistungen-pages/import/json', isAdmin, AdminLeistungen.importJSON);
router.post('/admin/leistungen-pages/import/file', isAdmin, upload.single('file'), AdminLeistungen.importFile);

export default router;
