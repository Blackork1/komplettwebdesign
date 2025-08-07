import session from 'express-session';
import pgSession from 'connect-pg-simple';

const PgSessionStore = pgSession(session);

export default session({
  store: new PgSessionStore({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60 // 7 Tage in Sekunden
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage in ms
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    httpOnly: true,
    sameSite: 'lax'
  }
});
