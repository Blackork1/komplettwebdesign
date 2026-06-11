import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const autoConfigController = fs.readFileSync(new URL('../controllers/autoConfigController.js', import.meta.url), 'utf8');
const adminAppointmentsJs = fs.readFileSync(new URL('../public/js/admin-appointments.js', import.meta.url), 'utf8');
const bookingWidgetJs = fs.readFileSync(new URL('../public/js/booking-widget.js', import.meta.url), 'utf8');

test('auto slot run redirects the admin calendar to the next month with free slots', () => {
  assert.match(autoConfigController, /async function buildAppointmentsRedirect/);
  assert.match(autoConfigController, /TO_CHAR\(\(start_time AT TIME ZONE 'Europe\/Berlin'\)::date, 'YYYY-MM'\)/);
  assert.match(autoConfigController, /\/admin\/appointments\?month=\$\{encodeURIComponent\(month\)\}&auto=1/);
  assert.match(adminAppointmentsJs, /function initialMonthFromQuery/);
  assert.match(adminAppointmentsJs, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(adminAppointmentsJs, /\^\\d\{4\}-\\d\{2\}\$/);
});

test('public booking widget auto-opens the next available month on initial load', () => {
  assert.match(bookingWidgetJs, /async function loadMonth\(options = \{\}\)/);
  assert.match(bookingWidgetJs, /options\.autoAdvance && options\.remaining > 0/);
  assert.match(bookingWidgetJs, /state\.month = new Date\(state\.month\.getFullYear\(\), state\.month\.getMonth\(\) \+ 1, 1\)/);
  assert.match(bookingWidgetJs, /loadMonth\(\{ autoAdvance: true, remaining: 6 \}\)/);
});
