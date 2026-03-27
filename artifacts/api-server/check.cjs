// No dotenv
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_s4XO6RAtIZhc@ep-solitary-mud-amhys2yw-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function run() {
  try {
    const users = await pool.query('SELECT id, name, role, phone, vehicle_id FROM users');
    console.table(users.rows);
    
    const vehicles = await pool.query('SELECT id, plate, assigned_driver_id FROM vehicles');
    console.table(vehicles.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
