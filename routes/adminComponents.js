import express from 'express';
import multer from 'multer';
import * as compCtrl from '../controllers/adminComponentController.js';
import { isAdmin } from '../middleware/auth.js';
import { verifyCsrfToken } from '../middleware/csrf.js';
const upload = multer({ dest:'tmp/', limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

router.get('/admin/pages/:pageId/components/new',                   isAdmin, compCtrl.getNewComponentForm);
router.post('/admin/components', isAdmin, upload.single('imageFile'), compCtrl.postCreateComponent);
router.post('/admin/components/reorder',                            isAdmin, compCtrl.postReorderComponents);
router.post('/admin/components/:id/delete',                         isAdmin, verifyCsrfToken, compCtrl.getDeleteComponent);
router.get('/admin/components/:id/edit',                            isAdmin, compCtrl.getEditComponentForm);
router.post('/admin/components/:id', isAdmin, upload.single('imageFile'), compCtrl.postUpdateComponent);


export default router;
