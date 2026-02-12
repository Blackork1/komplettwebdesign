import express from 'express';
import * as booking from '../controllers/bookingController.js';

const router = express.Router();

router.get("/booking", booking.listSlots);
router.post("/booking", booking.validate, booking.createBooking);
router.get('/booking/thankyou', (_req, res) =>{
  const lng = _req.query.lng === 'en' ? 'en' : 'de';
  res.render('booking/thankyou', {
    lng,
    title: lng === 'en' ? 'Thank you' : 'Danke',
    description: lng === 'en'
      ? 'Thanks for your booking. We have sent you a confirmation email.'
      : 'Danke für Ihre Buchung. Wir haben Ihnen eine Bestätigung per E-Mail gesendet.'
  });
});
router.get('/booking/:id/cancel/:token', booking.cancelByToken);
router.get('/booking/:id/reschedule/:token', booking.rescheduleByToken);

export default router;
