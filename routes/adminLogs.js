// routes/adminLogs.js
import { Router } from 'express';
import { isAdmin } from '../middleware/auth.js';
import { showLogs, exportLogsCsv } from '../controllers/adminLogController.js';

const router = Router();

router.get('/admin/logs', isAdmin, showLogs);
router.get('/admin/logs.csv', isAdmin, exportLogsCsv);

export default router;
