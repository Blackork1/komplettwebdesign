// routes/districtRoutes.js
import { Router } from "express";
import { renderDistrictPage } from "../controllers/districtController.js";

const router = Router();

// /webdesign-berlin/:slug  →  z. B. /webdesign-berlin/kreuzberg
router.get("/:slug", renderDistrictPage);

export default router;
