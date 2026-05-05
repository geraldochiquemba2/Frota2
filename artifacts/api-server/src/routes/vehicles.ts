import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vehiclesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/rbac";

const router: IRouter = Router();


router.get("/", requireAuth, async (req, res) => {
  const vehicles = await db.select().from(vehiclesTable);
  const users = await db.select().from(usersTable);
  res.json(vehicles.map(v => {
    const drivers = users.filter(u => u.vehicleId === v.id);
    return {
      id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year,
      status: v.status, mileage: v.mileage, fuelType: v.fuelType,
      assignedDrivers: drivers.map(d => ({ id: d.id, name: d.name })),
      assignedDriverName: drivers.map(d => d.name).join(", ") || null,
      createdAt: v.createdAt.toISOString(),
    };
  }));
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { plate, brand, model, year, status, mileage, fuelType } = req.body;
  
  const [v] = await db.insert(vehiclesTable).values({ 
    plate, brand, model, year, 
    status: status || "active", 
    mileage: mileage || 0, 
    fuelType: fuelType || "diesel"
  }).returning();

  res.status(201).json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDrivers: [], assignedDriverName: null, createdAt: v.createdAt.toISOString() 
  });
});

router.get("/:id", requireAuth, async (req, res) => {
  const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, Number(req.params.id)));
  if (!v) { res.status(404).json({ error: "Viatura não encontrada" }); return; }
  
  const drivers = await db.select().from(usersTable).where(eq(usersTable.vehicleId, v.id));
  
  res.json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDrivers: drivers.map(d => ({ id: d.id, name: d.name })),
    assignedDriverName: drivers.map(d => d.name).join(", ") || null,
    createdAt: v.createdAt.toISOString() 
  });
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const vehicleId = Number(req.params.id);
  const { plate, brand, model, year, status, mileage, fuelType } = req.body;
  
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

  const [v] = await db.update(vehiclesTable).set(updateData).where(eq(vehiclesTable.id, vehicleId)).returning();

  const drivers = await db.select().from(usersTable).where(eq(usersTable.vehicleId, v.id));
  
  res.json({ 
    id: v.id, plate: v.plate, brand: v.brand, model: v.model, year: v.year, 
    status: v.status, mileage: v.mileage, fuelType: v.fuelType, 
    assignedDrivers: drivers.map(d => ({ id: d.id, name: d.name })),
    assignedDriverName: drivers.map(d => d.name).join(", ") || null,
    createdAt: v.createdAt.toISOString() 
  });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const vehicleId = Number(req.params.id);
  // Clear driver link
  await db.update(usersTable).set({ vehicleId: null }).where(eq(usersTable.vehicleId, vehicleId));
  await db.delete(vehiclesTable).where(eq(vehiclesTable.id, vehicleId));
  res.json({ message: "Viatura eliminada" });
});

export default router;
