// models/contactRequestModel.js
import pool from "../util/db.js";

/** legt einen Datensatz in contact_requests an  */
export async function create({
  paket, umfang, texterstellung, bilderstellung,
  features, featuresOther, bookingId, name, email,
  phone, company, additionalInfo, images, appointmentTime = null
}) {
  const { rows } = await pool.query(`
    INSERT INTO contact_requests (
      paket, umfang, text_option, image_option,
      features, features_other, booking_id,
      name, email, phone, company, additional_info, images, appointment
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, $14)
    RETURNING *
  `, [
    paket, umfang, texterstellung, bilderstellung,
    features, featuresOther, bookingId,
    name, email, phone, company, additionalInfo, images, appointmentTime
  ]);
  return rows[0];
}
