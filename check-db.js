const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_s4XO6RAtIZhc@ep-solitary-mud-amhys2yw-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });

async function check() {
  console.log("Connecting directly to DB...");
  const client = await pool.connect();
  try {
    const users = await client.query('SELECT id, name, role, phone, vehicle_id FROM users');
    console.log("\n--- ALL USERS ---");
    console.table(users.rows);
    
    const vehicles = await client.query('SELECT id, plate, brand, model, assigned_driver_id FROM vehicles');
    console.log("\n--- ALL VEHICLES ---");
    console.table(vehicles.rows);
  } catch (err) {
    console.error("Query Error:", err);
  } finally {
    client.release();
    pool.end();
    process.exit(0);
  }
}
check();
