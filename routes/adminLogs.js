// routes/adminLogs.js
import { Router } from 'express';
import { isAdmin } from '../middleware/auth.js';
import { showLogs } from '../controllers/adminLogController.js';


const router = Router();


router.get('/admin/logs', isAdmin, showLogs);

export default router;
