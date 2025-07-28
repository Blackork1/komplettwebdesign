import express from 'express';
import multer from 'multer';
import * as compCtrl from '../controllers/adminComponentController.js';
import { isAdmin } from '../middleware/auth.js';
const upload = multer({ dest:'tmp/' });
const router = express.Router();

router.get('/admin/pages/:pageId/components/new',                   isAdmin, compCtrl.getNewComponentForm);
router.post('/admin/components', upload.single('imageFile'),        isAdmin, compCtrl.postCreateComponent);
router.post('/admin/components/reorder',                            isAdmin, compCtrl.postReorderComponents);
router.get('/admin/components/:id/delete',                          isAdmin, compCtrl.getDeleteComponent);
router.get('/admin/components/:id/edit',                            isAdmin, compCtrl.getEditComponentForm);
router.post('/admin/components/:id', upload.single('imageFile'),    isAdmin, compCtrl.postUpdateComponent);


export default router;