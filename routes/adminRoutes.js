import express from 'express';
import { body } from 'express-validator';
import * as admin from '../controllers/adminController.js';
import { isAdmin } from '../middleware/auth.js';
import * as autoCfg from '../controllers/autoConfigController.js';

const router = express.Router();

router.get('/admin', isAdmin, admin.adminHome);

/* ---------- Kalender () ---------- */
router.get('/admin/appointments', isAdmin, admin.calendarPage);

/* API für das Admin-UI */
router.get('/admin/api/calendar', isAdmin, admin.monthAvailability);
router.get('/admin/api/day-slots', isAdmin, admin.daySlotsJSON);

/* ---------- Termine (appointments) ---------- */
router.get('/admin/appointments/list', isAdmin, admin.listAppointments);
router.get('/admin/appointments/new', isAdmin, admin.newAppointmentForm);

router.post(
  '/admin/appointments',
  isAdmin,
  body('start').isISO8601(),
  body('end').isISO8601(),
  admin.createAppointment
);

router.post('/admin/appointments/:id/delete', isAdmin, admin.deleteAppointment);

/* ---------- Buchungen (bookings) ----------- */
router.get('/admin/bookings', isAdmin, admin.listBookings);
router.post('/admin/bookings/:id/confirm', isAdmin, admin.confirmBooking);
router.post('/admin/bookings/:id/cancel', isAdmin, admin.cancelBooking);


/* ---------- Automatische Termine ---------- */
router.get('/admin/auto-config', isAdmin, autoCfg.getForm);
router.post('/admin/auto-config', isAdmin, autoCfg.saveForm);
router.post('/admin/appointments/auto/run', isAdmin, autoCfg.runAutoGenerate);

router.get('/admin/test', isAdmin, admin.getTest);

export default router;
