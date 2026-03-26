import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fuelingsTable, usersTable, vehiclesTable, financeRecordsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  next();
}

function formatFueling(f: any, users: any[], vehicles: any[]) {
  const driver = f.driverId ? users.find(u => u.id === f.driverId) : null;
  const vehicle = vehicles.find(v => v.id === f.vehicleId);
  return {
    id: f.id, vehicleId: f.vehicleId, vehiclePlate: vehicle?.plate || null,
    driverId: f.driverId, driverName: driver?.name || null,
    date: f.date.toISOString(), liters: f.liters, pricePerLiter: f.pricePerLiter,
    totalCost: f.totalCost, mileage: f.mileage, station: f.station, notes: f.notes,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const fuelings = await db.select().from(fuelingsTable);
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(fuelings.map(f => formatFueling(f, users, vehicles)));
});

router.post("/", requireAuth, async (req, res) => {
  const { vehicleId, driverId, date, liters, pricePerLiter, totalCost, mileage, station, notes } = req.body;
  const [f] = await db.insert(fuelingsTable).values({
    vehicleId, driverId: driverId || null, date: new Date(date),
    liters, pricePerLiter, totalCost, mileage, station: station || null, notes: notes || null,
  }).returning();
  // Auto-create finance record
  await db.insert(financeRecordsTable).values({
    type: "expense", category: "Combustível", description: `Abastecimento - Viatura ${vehicleId}`,
    amount: totalCost, date: new Date(date), vehicleId, referenceId: f.id, referenceType: "fueling",
  });
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.status(201).json(formatFueling(f, users, vehicles));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [f] = await db.select().from(fuelingsTable).where(eq(fuelingsTable.id, Number(req.params.id)));
  if (!f) { res.status(404).json({ error: "Abastecimento não encontrado" }); return; }
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatFueling(f, users, vehicles));
});

router.put("/:id", requireAuth, async (req, res) => {
  const { vehicleId, driverId, date, liters, pricePerLiter, totalCost, mileage, station, notes } = req.body;
  const updateData: any = {};
  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (driverId !== undefined) updateData.driverId = driverId;
  if (date !== undefined) updateData.date = new Date(date);
  if (liters !== undefined) updateData.liters = liters;
  if (pricePerLiter !== undefined) updateData.pricePerLiter = pricePerLiter;
  if (totalCost !== undefined) updateData.totalCost = totalCost;
  if (mileage !== undefined) updateData.mileage = mileage;
  if (station !== undefined) updateData.station = station;
  if (notes !== undefined) updateData.notes = notes;
  const [f] = await db.update(fuelingsTable).set(updateData).where(eq(fuelingsTable.id, Number(req.params.id))).returning();
  if (!f) { res.status(404).json({ error: "Abastecimento não encontrado" }); return; }
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatFueling(f, users, vehicles));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(fuelingsTable).where(eq(fuelingsTable.id, Number(req.params.id)));
  res.json({ message: "Abastecimento eliminado" });
});

export default router;
