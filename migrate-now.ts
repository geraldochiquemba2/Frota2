// Migração: copia vehicleId dos users para assignedDriverId dos vehicles
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_s4XO6RAtIZhc@ep-solitary-mud-amhys2yw-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { db } from "./lib/db/src/index";
import { usersTable, vehiclesTable } from "./lib/db/src/schema";
import { eq, isNotNull } from "drizzle-orm";

async function migrate() {
  console.log("A migrar atribuições...");
  const users = await db.select().from(usersTable).where(isNotNull(usersTable.vehicleId));
  
  let count = 0;
  for (const user of users) {
    if (user.vehicleId) {
      const result = await db.update(vehiclesTable)
        .set({ assignedDriverId: user.id })
        .where(eq(vehiclesTable.id, user.vehicleId))
        .returning();
      
      if (result.length > 0) {
        console.log(`✓ ${user.name} → Viatura ${result[0].plate} (ID ${result[0].id})`);
        count++;
      } else {
        console.log(`✗ ${user.name} → vehicleId ${user.vehicleId} NÃO ENCONTRADO`);
      }
    }
  }
  
  console.log(`\nMigração concluída! ${count} associações corrigidas.`);
  
  // Verificar resultado
  console.log("\n--- VERIFICAÇÃO ---");
  const vehicles = await db.select().from(vehiclesTable);
  vehicles.filter(v => v.assignedDriverId).forEach(v => 
    console.log(`Viatura ${v.plate} → Driver ID ${v.assignedDriverId}`)
  );
  
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
