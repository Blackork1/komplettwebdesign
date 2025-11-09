// routes/districtRoutes.js
import { Router } from "express";
import { renderDistrictPage, renderWebdesignBerlinHub } from "../controllers/districtController.js";
import { processWebdesignBerlinForm, webdesignBerlinUpload } from "../controllers/contactController.js";


const router = Router();

router.get("/", renderWebdesignBerlinHub);
// Kontaktformular der Landingpage
router.post("/kontakt", webdesignBerlinUpload, processWebdesignBerlinForm);

// /webdesign-berlin/:slug  →  z. B. /webdesign-berlin/kreuzberg
router.get("/:slug", renderDistrictPage);

export default router;
