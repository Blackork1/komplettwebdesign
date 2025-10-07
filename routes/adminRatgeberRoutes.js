// routes/adminRatgeberRoutes.js
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { isAdmin } from '../middleware/auth.js';

import {
  newGuideForm,
  createGuide,
  editGuideForm,
  updateGuide,
  deleteGuide,
  listAdminGuides
} from '../controllers/adminRatgeberController.js';

/* ---------- Cloudinary konfigurieren ---------- */
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET
});

/* ---------- Multer: Memory-Storage ---------- */
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- Router ---------- */
const router = Router();

router.get ('/admin/ratgeber/new',        isAdmin, newGuideForm);
router.post('/admin/ratgeber/new',        isAdmin, upload.single('hero_image'), createGuide);

router.get ('/admin/ratgeber/:id/edit',   isAdmin, editGuideForm);
router.post('/admin/ratgeber/:id/edit',   isAdmin, upload.single('hero_image'), updateGuide);

router.post('/admin/ratgeber/:id/delete', isAdmin, deleteGuide);

router.get ('/admin/ratgeber',            isAdmin, listAdminGuides);

export default router;
