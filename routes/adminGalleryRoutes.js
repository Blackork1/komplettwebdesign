import express from 'express';
import multer from 'multer';
import { isAdmin } from '../middleware/auth.js';
import * as gallery from '../controllers/adminGalleryController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/admin/gallery', isAdmin, gallery.renderGallery);
router.get('/admin/gallery/:filter', isAdmin, gallery.renderGallery);
router.post('/admin/gallery/upload', isAdmin, upload.single('image'), gallery.uploadImage);
router.post('/admin/gallery/delete/:id', isAdmin, gallery.deleteImage);

export default router;