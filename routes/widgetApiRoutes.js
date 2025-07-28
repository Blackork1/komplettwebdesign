import express from 'express';
import * as Apt from '../models/appointmentModel.js';

const router = express.Router();

/* Liefert die nächsten freien Slots als JSON */
router.get('/api/slots', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 3;
  const slots = await Apt.getOpenSlots();          // gibt ALLE frei
  res.json(slots.slice(0, limit));                 // nur die ersten „limit“
});

export default router;
