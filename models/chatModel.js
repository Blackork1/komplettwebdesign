// models/chatModel.js
import pool from '../util/db.js';

export async function saveMessage(sessionId, role, message) {
  await pool.query(
    `INSERT INTO chat_messages(session_id, role, message)
     VALUES ($1, $2, $3)`,
    [sessionId, role, message]
  );
}

export async function getHistory(sessionId) {
  const { rows } = await pool.query(
    `SELECT role, message
       FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at`,
    [sessionId]
  );
  return rows;
}
export async function clearHistory(sessionId) {
  await pool.query(
    `DELETE FROM chat_messages
      WHERE session_id = $1`,
    [sessionId]
  );
}