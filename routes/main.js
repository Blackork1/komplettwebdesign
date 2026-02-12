import express from 'express';
import * as mainCtrl from '../controllers/mainController.js';
const router = express.Router();

router.get('/', mainCtrl.getIndex);
router.get('/de', (req, res) => {
  req.params.lng = 'de';
  return mainCtrl.getIndex(req, res);
});
router.get('/en', (req, res) => {
  req.params.lng = 'en';
  return mainCtrl.getIndex(req, res);
});
router.get('/cancel', mainCtrl.redirectIndex);
router.post('/add', mainCtrl.postAddUser);
router.post('/delete', mainCtrl.postDeleteUser);
router.get('/about', mainCtrl.getAbout);
router.get('/return_policy', mainCtrl.getPolicy);
router.get("/branchen-websites-erstellen-lassen", mainCtrl.getBranchen);
export default router;
