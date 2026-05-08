// migrate dentro do contexto do lib/db
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_s4XO6RAtIZhc@ep-solitary-mud-amhys2yw-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { db } from "./src/index.js";
import { usersTable, vehiclesTable } from "./src/schema/index.js";
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
        console.log(`OK ${user.name} -> Viatura ${result[0].plate}`);
        count++;
      } else {
        console.log(`MISS ${user.name} -> vehicleId ${user.vehicleId} nao encontrado`);
      }
    }
  }
  
  console.log(`\nMigração concluída! ${count} associações corrigidas.`);
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
