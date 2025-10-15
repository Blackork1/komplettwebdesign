// controllers/districtController.js
import { getDistrictBySlug } from "../models/districtModel.js";

export async function renderDistrictPage(req, res, next) {
  try {
    const { slug } = req.params;
    const district = getDistrictBySlug(slug);
    if (!district) return next(); // 404 → geht in dein NotFound-Handler

    // Optional: Meta für Head-Partial (dein Hauptcontent enthält bereits JSON-LD)
    const metaTitle = `Webdesign ${district.name} | Komplett Webdesign – Landingpages & Relaunch in Berlin`;
    const metaDescription =
      `Komplett Webdesign: Webdesign in ${district.name} (Berlin) – Landingpages & Relaunch für Freelancer & KMU. ` +
      `Eigenes CMS, SEO, Hosting, Wartung & Chatbot. Melde dich jetzt: +49 1551 1245048.`;

    res.locals.title = metaTitle;
    res.locals.metaDescription = metaDescription;

    // Ordnerstruktur: /views/districts/webdesign-berlin-<slug>.ejs
    return res.render(`bereiche/webdesign-berlin-${slug}`, {
      // Falls du noch Variablen im Template willst
      title: metaTitle,
      description: metaDescription,
      company: "Komplett Webdesign",
      phone: "+4915511245048"
    });
  } catch (err) {
    next(err);
  }
}
