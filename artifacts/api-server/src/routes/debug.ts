import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/debug-test-db", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const vehicles = await db.select().from(vehiclesTable);
    res.json({ users, vehicles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/migrate", async (req, res) => {
  try {
    const { isNotNull } = require("drizzle-orm");
    const users = await db.select().from(usersTable).where(isNotNull(usersTable.vehicleId));
    let count = 0;
    for (const user of users) {
      if (user.vehicleId) {
        await db.update(vehiclesTable).set({ assignedDriverId: user.id }).where(eq(vehiclesTable.id, user.vehicleId));
        count++;
      }
    }
    res.json({ success: true, migrated: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
