import express from 'express';
import * as booking from '../controllers/bookingController.js';

const router = express.Router();

router.get("/booking", booking.listSlots);
router.post("/booking", booking.validate, booking.createBooking);
router.get('/booking/thankyou', (_req, res) =>{
  res.render('booking/thankyou', { title:'Danke' });
});

export default router;