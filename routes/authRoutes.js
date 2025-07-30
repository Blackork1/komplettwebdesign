import express from 'express';
import * as auth from '../controllers/authController.js';

const router = express.Router();
router.get('/login', auth.loginForm);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.get('/logout', auth.logout);
export default router;
// Export the router to be used in the main app file