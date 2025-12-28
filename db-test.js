import pool from "./util/db.js";

const run = async () => {
  const r = await pool.query("select now() as now");
  console.log(r.rows[0]);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
