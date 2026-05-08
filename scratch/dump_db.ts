import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const vehicles = await db.select().from(vehiclesTable);
  const users = await db.select().from(usersTable);
  
  console.log("USERS:");
  users.forEach(u => console.log(`[${u.id}] ${u.name}`));
  
  console.log("\nVEHICLES:");
  vehicles.forEach(v => console.log(`[${v.id}] ${v.plate} - Assigned to: ${v.assignedDriverId}`));
  
  process.exit(0);
}

run().catch(console.error);
