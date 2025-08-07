// import session from 'express-session';
// import connectPg from 'connect-pg-simple';
// import pool from './util/db.js';


// const PgSession = connectPg(session);
// // 
// export default session({
//   store: new PgSession({pool,
//     tableName: 'session',
//     createTableIfMissing: true,
//     ttl: 7 * 24 * 60 * 60 // 7 Tage in Sekunden
//   }),
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Tage in ms
//     // secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
//     // httpOnly: true,
//     // sameSite: 'lax'
//   }
// });
