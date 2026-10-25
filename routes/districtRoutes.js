// routes/districtRoutes.js
import { Router } from "express";
import { renderDistrictPage } from "../controllers/districtController.js";
import { processWebdesignBerlinForm, webdesignBerlinUpload } from "../controllers/contactController.js";


const router = Router();

// „Webdesign Berlin“ ist jetzt die Startseite: Google hat die Startseite für diesen Begriff deutlich
// besser bewertet als die Unterseite. Die Bezirksseiten bleiben unter /webdesign-berlin/:slug.
router.get("/", (req, res) => res.redirect(301, req.baseUrl.startsWith("/en") ? "/en" : "/"));
// Kontaktformular der Landingpage
router.post("/kontakt", webdesignBerlinUpload, processWebdesignBerlinForm);

// /webdesign-berlin/:slug  →  z. B. /webdesign-berlin/kreuzberg
router.get("/:slug", renderDistrictPage);

export default router;
