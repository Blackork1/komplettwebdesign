import pool from '../util/db.js';

/* alle freien Slots holen */
export async function getOpenSlots() {
  const { rows } = await pool.query(`
    SELECT * FROM appointments        -- <- hier korrekt schreiben
    WHERE start_time >= NOW()
      AND is_booked = FALSE
    ORDER BY start_time`);
  return rows;
}

export async function getNextOpenSlots(limit = 3) {
  const { rows } = await pool.query(
    `SELECT * FROM appointments
       WHERE start_time >= NOW()
         AND is_booked = FALSE
     ORDER BY start_time
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Liefert je Tag genau EINEN freien Slot:
 * - Tage chronologisch (frühester Tag zuerst)
 * - Slot innerhalb eines Tages zufällig gewählt
 * - Gruppierung nach lokaler Berlin-Zeitzone
 */
export async function getOpenSlotPerDay(limit = 3) {
  const { rows } = await pool.query(
    `
    WITH future AS (
      SELECT  a.*,
              -- Gruppierung nach lokalem Kalendertag (Berlin)
              (a.start_time AT TIME ZONE 'Europe/Berlin')::date AS day_local
      FROM appointments a
      WHERE a.start_time >= NOW()
        AND a.is_booked = FALSE
    ),
    picked AS (
      -- DISTINCT ON nimmt je day_local die ERSTE Zeile nach ORDER BY
      -- => random() sorgt für Zufall innerhalb eines Tages
      SELECT DISTINCT ON (day_local)
             id, start_time, end_time, title, location,
             is_booked, created_by, created_at, day_local
      FROM future
      ORDER BY day_local ASC, random()
    )
    SELECT id, start_time, end_time, title, location,
           is_booked, created_by, created_at
    FROM picked
    ORDER BY day_local ASC
    LIMIT $1
    `,
    [limit]
  );
  return rows;
}


export async function lockSlot(id) {
  const { rows } = await pool.query(`
    UPDATE appointments               -- <- hier auch
       SET is_booked = TRUE
     WHERE id = $1
       AND is_booked = FALSE
     RETURNING *`, [id]);
  return rows[0];
}

export async function unlockSlot(id) {
  await pool.query(
    'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
    [id]);
}


/* einzelnen Termin anhand der ID holen */
export async function getById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}
