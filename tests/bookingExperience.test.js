import test from 'node:test';
import assert from 'node:assert/strict';

// Browser entry point: no widget is mounted in this pure state/date test.
const previousDocument = globalThis.document;
globalThis.document = { querySelector: () => null };
const booking = await import('../public/js/booking-widget.js');
if (previousDocument === undefined) delete globalThis.document;
else globalThis.document = previousDocument;

test('booking calendar uses the Berlin day even before midnight in UTC', () => {
  assert.equal(booking.getBookingDayKey?.(new Date('2026-10-23T22:30:00Z')), '2026-10-24');
  assert.equal(booking.getBookingDayKey?.(new Date('2026-10-25T01:30:00Z')), '2026-10-25');
});

test('tomorrow selection crosses month, year, leap day and daylight-saving boundaries', () => {
  const cases = [
    ['2026-10-31T12:00:00Z', '2026-11-01'],
    ['2026-12-31T12:00:00Z', '2027-01-01'],
    ['2028-02-28T12:00:00Z', '2028-02-29'],
    ['2026-03-28T23:30:00Z', '2026-03-30']
  ];
  for (const [now, expected] of cases) assert.equal(booking.getNextBookingDayKey?.(new Date(now)), expected);
});

test('initial suggestion skips today and selects available days in chronological order', () => {
  const days = ['2026-11-02', '2026-10-25', '2026-10-23', '2026-10-24'];
  assert.deepEqual(booking.getSuggestedBookingDays?.(days, new Date('2026-10-23T15:00:00Z')), [
    '2026-10-24', '2026-10-25', '2026-11-02'
  ]);
  assert.deepEqual(booking.getSuggestedBookingDays?.([], new Date('2026-10-23T15:00:00Z')), []);
});

test('slot selection orders genuine future slots and excludes booked, stale and mismatched days', () => {
  const slots = [
    { id: 22, start_time: '2026-10-24T16:00:00Z', end_time: '2026-10-24T16:30:00Z' },
    { id: 21, start_time: '2026-10-24T12:00:00Z', end_time: '2026-10-24T12:30:00Z' },
    { id: 23, start_time: '2026-10-24T11:00:00Z', end_time: '2026-10-24T11:30:00Z', is_booked: true },
    { id: 24, start_time: '2026-10-23T10:00:00Z', end_time: '2026-10-23T10:30:00Z' },
    { id: 25, start_time: '2026-10-24T23:30:00Z', end_time: '2026-10-25T00:00:00Z' },
    { id: 26, start_time: 'broken', end_time: 'broken' }
  ];
  const result = booking.sortAvailableBookingSlots?.(slots, { date: '2026-10-24', now: new Date('2026-10-23T15:00:00Z') });
  assert.deepEqual(result?.map(slot => slot.id), [21, 22]);
  assert.equal(slots[0].id, 22, 'sorting must preserve the fetched input');
});

test('a day whose last slot has already passed produces no suggestion', () => {
  assert.deepEqual(booking.sortAvailableBookingSlots?.([
    { id: 3, start_time: '2026-10-24T12:00:00Z', end_time: '2026-10-24T12:30:00Z' }
  ], { date: '2026-10-24', now: new Date('2026-10-24T13:00:00Z') }), []);
});

test('booking input advances from a real name to email and then to optional project details', () => {
  assert.equal(booking.getBookingFormStage?.('', false), 'name');
  assert.equal(booking.getBookingFormStage?.(' A ', false), 'name');
  assert.equal(booking.getBookingFormStage?.(' Lea ', false), 'email');
  assert.equal(booking.getBookingFormStage?.(' Lea ', true), 'details');
});
