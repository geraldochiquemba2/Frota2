import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vehiclesTable, usersTable } from "@workspace/db/schema";
import { eq, and, not } from "drizzle-orm";
import { requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();


router.get("/", requireAuth, async (req, res) => {
  const vehicles = await db.select().from(vehiclesTable);
  const users = await db.select().from(usersTable);
  res.json(vehicles.map(v => {
    const driver = v.assignedDriverId ? users.find(u => u.id === v.assignedDriverId) : null;
    return {
      id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year,
      status: v.status, mileage: v.mileage, fuelType: v.fuelType,
      assignedDriverId: v.assignedDriverId, assignedDriverName: driver?.name || null,
      createdAt: v.createdAt.toISOString(),
    };
  }));
});

router.post("/", requireAuth, async (req, res) => {
  const { plate, brand, model, year, status, mileage, fuelType, assignedDriverId } = req.body;
  
  const [v] = await db.insert(vehiclesTable).values({ 
    plate, brand, model, year, 
    status: status || "active", 
    mileage: mileage || 0, 
    fuelType: fuelType || "diesel", 
    assignedDriverId: assignedDriverId || null 
  }).returning();

  if (assignedDriverId) {
    // Sync to user
    await db.update(usersTable)
      .set({ vehicleId: v.id })
      .where(eq(usersTable.id, assignedDriverId));
  }

  res.status(201).json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDriverId: v.assignedDriverId, assignedDriverName: null, createdAt: v.createdAt.toISOString() 
  });
});

router.get("/:id", requireAuth, async (req, res) => {
  const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, Number(req.params.id)));
  if (!v) { res.status(404).json({ error: "Viatura não encontrada" }); return; }
  const driver = v.assignedDriverId ? (await db.select().from(usersTable).where(eq(usersTable.id, v.assignedDriverId)))[0] : null;
  res.json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDriverId: v.assignedDriverId, assignedDriverName: driver?.name || null, createdAt: v.createdAt.toISOString() 
  });
});

router.put("/:id", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.id);
  const { plate, brand, model, year, status, mileage, fuelType, assignedDriverId } = req.body;
  
  // Get current state for sync
  const [currentV] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, vehicleId));
  if (!currentV) { res.status(404).json({ error: "Viatura não encontrada" }); return; }

  const updateData: any = {};
  if (plate !== undefined) updateData.plate = plate;
  if (brand !== undefined) updateData.brand = brand;
  if (model !== undefined) updateData.model = model;
  if (year !== undefined) updateData.year = year;
  if (status !== undefined) updateData.status = status;
  if (mileage !== undefined) updateData.mileage = mileage;
  if (fuelType !== undefined) updateData.fuelType = fuelType;
  if (assignedDriverId !== undefined) updateData.assignedDriverId = assignedDriverId;

  const [v] = await db.update(vehiclesTable).set(updateData).where(eq(vehiclesTable.id, vehicleId)).returning();

  // Sync logic
  if (assignedDriverId !== undefined && assignedDriverId !== currentV.assignedDriverId) {
    // 1. Clear previous driver if any
    if (currentV.assignedDriverId) {
      await db.update(usersTable)
        .set({ vehicleId: null })
        .where(and(eq(usersTable.id, currentV.assignedDriverId), eq(usersTable.vehicleId, vehicleId)));
    }
    // 2. Clear new driver from any other vehicle to maintain 1-to-1
    if (assignedDriverId) {
      await db.update(vehiclesTable)
        .set({ assignedDriverId: null })
        .where(and(eq(vehiclesTable.assignedDriverId, assignedDriverId), not(eq(vehiclesTable.id, vehicleId))));
      
      // 3. Set new driver's vehicleId
      await db.update(usersTable)
        .set({ vehicleId: vehicleId })
        .where(eq(usersTable.id, assignedDriverId));
    }
  }

  const driver = v.assignedDriverId ? (await db.select().from(usersTable).where(eq(usersTable.id, v.assignedDriverId)))[0] : null;
  res.json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDriverId: v.assignedDriverId, assignedDriverName: driver?.name || null, createdAt: v.createdAt.toISOString() 
  });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.id);
  // Clear driver link
  await db.update(usersTable).set({ vehicleId: null }).where(eq(usersTable.vehicleId, vehicleId));
  await db.delete(vehiclesTable).where(eq(vehiclesTable.id, vehicleId));
  res.json({ message: "Viatura eliminada" });
});

export default router;
