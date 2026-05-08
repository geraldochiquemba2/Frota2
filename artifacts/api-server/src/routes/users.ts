import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/rbac";

const router: IRouter = Router();


router.get("/", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(users.map(u => {
    const myVehicles = vehicles.filter(v => v.assignedDriverId === u.id);
    let vIds = myVehicles.map(v => v.id);
    if (vIds.length === 0 && u.vehicleId) {
      vIds = [u.vehicleId];
    }
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      active: u.active,
      vehicleId: u.vehicleId, // Keep for compatibility
      vehicleIds: vIds,
      createdAt: u.createdAt.toISOString(),
    };
  }));
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, phone, pin, role, vehicleIds } = req.body;
  const [user] = await db.insert(usersTable).values({
    name, phone, pin, role: role || "driver", active: true,
  }).returning();

  if (vehicleIds && Array.isArray(vehicleIds)) {
    await Promise.all(vehicleIds.map(vId => 
      db.update(vehiclesTable).set({ assignedDriverId: user.id }).where(eq(vehiclesTable.id, vId))
    ));
  }

  const savedVehicles = await db.select().from(vehiclesTable).where(eq(vehiclesTable.assignedDriverId, user.id));

  res.status(201).json({
    id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleIds: savedVehicles.map(v => v.id), createdAt: user.createdAt.toISOString(),
  });
});

router.get("/:id", requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  if (!user) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }
  
  const myVehicles = await db.select().from(vehiclesTable).where(eq(vehiclesTable.assignedDriverId, user.id));
  let vIds = myVehicles.map(v => v.id);
  if (vIds.length === 0 && user.vehicleId) {
    vIds = [user.vehicleId];
  }
  
  res.json({ 
    id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, 
    vehicleIds: vIds, 
    createdAt: user.createdAt.toISOString() 
  });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const { name, phone, pin, role, vehicleIds, active } = req.body;
  console.log(`[${new Date().toISOString()}] Updating user ${userId} with vehicleIds:`, vehicleIds);
  
  const [currentU] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!currentU) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (pin !== undefined) updateData.pin = pin;
  if (role !== undefined) updateData.role = role;
  if (active !== undefined) updateData.active = active;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId)).returning();

  try {
    if (vehicleIds !== undefined && Array.isArray(vehicleIds)) {
      console.log(`Unassigning vehicles for user ${userId}...`);
      await db.update(vehiclesTable).set({ assignedDriverId: null }).where(eq(vehiclesTable.assignedDriverId, userId));
      
      console.log(`Assigning vehicles ${vehicleIds.join(", ")} to user ${userId}...`);
      await Promise.all(vehicleIds.map(async (vId) => {
        const updated = await db.update(vehiclesTable).set({ assignedDriverId: userId }).where(eq(vehiclesTable.id, vId)).returning();
        console.log(`Updated vehicle ${vId}:`, updated.length > 0 ? "SUCCESS" : "NO MATCH FOUND");
        return updated;
      }));
      console.log("Vehicle assignments updated successfully.");
    }
  } catch (err) {
    console.error("Error updating vehicle assignments:", err);
  }

  const savedVehicles = await db.select().from(vehiclesTable).where(eq(vehiclesTable.assignedDriverId, user.id));

  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleIds: savedVehicles.map(v => v.id), createdAt: user.createdAt.toISOString() });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  await db.update(vehiclesTable).set({ assignedDriverId: null }).where(eq(vehiclesTable.assignedDriverId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ message: "Utilizador eliminado" });
});

export default router;
