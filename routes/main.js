import express from 'express';
import * as mainCtrl from '../controllers/mainController.js';
const router = express.Router();

router.get('/', mainCtrl.getIndex);
router.get('/cancel', mainCtrl.redirectIndex);
router.post('/add', mainCtrl.postAddUser);
router.post('/delete', mainCtrl.postDeleteUser);
router.get('/about', mainCtrl.getAbout);
router.get('/return_policy', mainCtrl.getPolicy);
export default router;