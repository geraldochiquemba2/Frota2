import "dotenv/config";
import { db } from "./lib/db/src/index";
import { usersTable, vehiclesTable } from "./lib/db/src/schema";

async function checkDB() {
  console.log("Connecting to DB...");
  try {
    console.log("--- USERS ---");
    const users = await db.select().from(usersTable);
    users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, VehicleId: ${u.vehicleId}`));

    console.log("\n--- VEHICLES ---");
    const vehicles = await db.select().from(vehiclesTable);
    vehicles.forEach(v => console.log(`ID: ${v.id}, Plate: ${v.plate}, DriverId: ${v.assignedDriverId}`));
  } catch (e) {
    console.error("DB Error:", e);
  }
  process.exit(0);
}

checkDB();
