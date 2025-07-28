import pool from '../util/db.js';

/* alle freien Slots holen */
export async function getOpenSlots () {
  const { rows } = await pool.query(`
    SELECT * FROM appointments        -- <- hier korrekt schreiben
    WHERE start_time >= NOW()
      AND is_booked = FALSE
    ORDER BY start_time`);
  return rows;
}

export async function lockSlot (id) {
  const { rows } = await pool.query(`
    UPDATE appointments               -- <- hier auch
       SET is_booked = TRUE
     WHERE id = $1
       AND is_booked = FALSE
     RETURNING *`, [id]);
  return rows[0];
}

export async function unlockSlot (id) {
  await pool.query(
    'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
    [id]);
}
