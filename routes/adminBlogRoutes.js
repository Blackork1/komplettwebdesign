// routes/adminBlogRoutes.js
import { Router } from 'express';
import {
  listAdminPosts,
  newPostForm,
  createPost,
  editPostForm,
  updatePost,
  deletePost
} from '../controllers/adminBlogController.js';

import { isAdmin } from '../middleware/auth.js';


import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

/* ---------- Cloudinary konfigurieren ---------- */
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET
});

/* ---------- Multer: Memory-Storage (kein tmp-File) ---------- */
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- Router ---------- */
const router = Router();

router.get ('/admin/blog/new',         isAdmin, newPostForm);
router.post('/admin/blog/new',         isAdmin, upload.single('hero_image'), createPost);

router.get ('/admin/blog/:id/edit',    isAdmin, editPostForm);
router.post('/admin/blog/:id/edit',    isAdmin, upload.single('hero_image'), updatePost);

router.post('/admin/blog/:id/delete',  isAdmin, deletePost);

router.get('/admin/blog', isAdmin,listAdminPosts);  

export default router;
