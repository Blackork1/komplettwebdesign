import express from 'express';
import { body } from 'express-validator';
import * as admin from '../controllers/adminController.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin', isAdmin, admin.adminHome);

/* ---------- Termine (appointments) ---------- */
router.get('/admin/appointments',        isAdmin, admin.listAppointments);
router.get('/admin/appointments/new',    isAdmin, admin.newAppointmentForm);

router.post(
  '/admin/appointments',
  isAdmin,
  body('start').isISO8601(),
  body('end').isISO8601(),
  admin.createAppointment
);

router.post('/admin/appointments/:id/delete', isAdmin, admin.deleteAppointment);

/* ---------- Buchungen (bookings) ----------- */
router.get('/admin/bookings',              isAdmin, admin.listBookings);
router.post('/admin/bookings/:id/confirm', isAdmin, admin.confirmBooking);
router.post('/admin/bookings/:id/cancel',  isAdmin, admin.cancelBooking);

router.get('/admin/test',                   isAdmin, admin.getTest);

export default router;
