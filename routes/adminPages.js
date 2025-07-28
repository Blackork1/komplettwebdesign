// routes/adminPages.js
import express from 'express';
import * as pageCtrl from '../controllers/adminPageController.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/',            isAdmin, pageCtrl.getPagesList);
router.get('/new',         isAdmin, pageCtrl.getNewPageForm);
router.post('/',           isAdmin, pageCtrl.postCreatePage);
router.get('/:id/delete',  isAdmin, pageCtrl.getDeletePage);
router.get('/:id/edit',    isAdmin, pageCtrl.getEditPage);
router.post('/:id/styles', isAdmin, pageCtrl.postUpdatePageStyles);

export default router;
