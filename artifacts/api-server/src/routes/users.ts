import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq, and, not } from "drizzle-orm";
import { requireAdmin } from "../middlewares/rbac";

const router: IRouter = Router();


router.get("/", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    active: u.active,
    vehicleId: u.vehicleId,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, phone, pin, role, vehicleId } = req.body;
  const [user] = await db.insert(usersTable).values({
    name, phone, pin, role: role || "driver", active: true, vehicleId: vehicleId || null,
  }).returning();

  if (vehicleId) {
    // Sync to vehicle
    await db.update(vehiclesTable)
      .set({ assignedDriverId: user.id })
      .where(eq(vehiclesTable.id, vehicleId));
  }

  res.status(201).json({
    id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString(),
  });
});

router.get("/:id", requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  if (!user) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }
  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString() });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const { name, phone, pin, role, vehicleId, active } = req.body;
  
  // Get current state for sync
  const [currentU] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!currentU) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (pin !== undefined) updateData.pin = pin;
  if (role !== undefined) updateData.role = role;
  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (active !== undefined) updateData.active = active;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId)).returning();

  // Sync logic
  if (vehicleId !== undefined && vehicleId !== currentU.vehicleId) {
    // 1. Clear previous vehicle if any
    if (currentU.vehicleId) {
      await db.update(vehiclesTable)
        .set({ assignedDriverId: null })
        .where(and(eq(vehiclesTable.id, currentU.vehicleId), eq(vehiclesTable.assignedDriverId, userId)));
    }
    // 2. Clear new vehicle from any other driver to maintain 1-to-1
    if (vehicleId) {
      await db.update(usersTable)
        .set({ vehicleId: null })
        .where(and(eq(usersTable.vehicleId, vehicleId), not(eq(usersTable.id, userId))));
      
      // 3. Set new vehicle's assignedDriverId
      await db.update(vehiclesTable)
        .set({ assignedDriverId: userId })
        .where(eq(vehiclesTable.id, vehicleId));
    }
  }

  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString() });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  // Clear vehicle link
  await db.update(vehiclesTable).set({ assignedDriverId: null }).where(eq(vehiclesTable.assignedDriverId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ message: "Utilizador eliminado" });
});

export default router;
