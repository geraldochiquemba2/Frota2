import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";

async function check() {
  try {
    const users = await db.select().from(usersTable);
    const vehicles = await db.select().from(vehiclesTable);
    
    console.log("USERS:", users.map(u => ({ id: u.id, name: u.name, vehicleId: u.vehicleId })));
    console.log("VEHICLES:", vehicles.map(v => ({ id: v.id, plate: v.plate, assignedDriverId: v.assignedDriverId })));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
