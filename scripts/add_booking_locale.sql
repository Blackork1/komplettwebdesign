ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_locale VARCHAR(2) NOT NULL DEFAULT 'de';

UPDATE bookings
SET booking_locale = 'de'
WHERE booking_locale IS NULL
   OR booking_locale NOT IN ('de', 'en');
