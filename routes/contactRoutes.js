import express from "express";
import * as contactCtrl from "../controllers/contactController.js";

const router = express.Router();

router.get("/", contactCtrl.showForm);
router.post("/", contactCtrl.processForm);
router.get("/ics/:id", contactCtrl.downloadIcs);


export default router;
