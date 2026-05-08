// check-db2.ts - sem dotenv, usa variável de ambiente diretamente
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_s4XO6RAtIZhc@ep-solitary-mud-amhys2yw-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { db } from "./lib/db/src/index";
import { usersTable, vehiclesTable } from "./lib/db/src/schema";

async function checkDB() {
  console.log("Connecting to DB...");

  console.log("--- USERS ---");
  const users = await db.select().from(usersTable);
  users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, vehicleId: ${u.vehicleId}`));

  console.log("\n--- VEHICLES ---");
  const vehicles = await db.select().from(vehiclesTable);
  vehicles.forEach(v => console.log(`ID: ${v.id}, Plate: ${v.plate}, assignedDriverId: ${v.assignedDriverId}`));

  process.exit(0);
}

checkDB().catch(e => { console.error(e); process.exit(1); });
