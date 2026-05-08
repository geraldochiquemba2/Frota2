import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq, isNotNull } from "drizzle-orm";

async function run() {
  console.log("Iniciando migração de atribuições...");
  const users = await db.select().from(usersTable).where(isNotNull(usersTable.vehicleId));
  
  let count = 0;
  for (const user of users) {
    if (user.vehicleId) {
      await db.update(vehiclesTable).set({ assignedDriverId: user.id }).where(eq(vehiclesTable.id, user.vehicleId));
      count++;
      console.log(`Motorista ${user.name} associado à viatura ID ${user.vehicleId}`);
    }
  }
  
  console.log(`Migração concluída! ${count} associações corrigidas.`);
  process.exit(0);
}

run().catch(console.error);
