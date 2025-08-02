import crypto from 'crypto';

const SECRET = process.env.BOOKING_TOKEN_SECRET || 'booking-secret';

export function generateToken(id) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(String(id))
    .digest('hex');
}

export function verifyToken(id, token) {
  return generateToken(id) === token;
}