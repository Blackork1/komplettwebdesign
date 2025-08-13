// routes/sitemapRoutes.js
import { Router } from "express";
import { sitemapXml } from "../controllers/sitemapController.js";

const router = Router();
router.get("/sitemap.xml", sitemapXml);

export default router;
