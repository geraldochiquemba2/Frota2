import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fuelingsTable, maintenanceTable, vehiclesTable, usersTable, tripsTable, inventoryItemsTable } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  next();
}

router.get("/fuelings", requireAuth, async (req, res) => {
  const fuelings = await db.select().from(fuelingsTable);
  const vehicles = await db.select().from(vehiclesTable);
  const users = await db.select().from(usersTable);
  
  let filtered = fuelings;
  if (req.query.startDate) filtered = filtered.filter(f => f.date >= new Date(String(req.query.startDate)));
  if (req.query.endDate) filtered = filtered.filter(f => f.date <= new Date(String(req.query.endDate)));
  if (req.query.vehicleId) filtered = filtered.filter(f => f.vehicleId === Number(req.query.vehicleId));

  const records = filtered.map(f => {
    const driver = f.driverId ? users.find(u => u.id === f.driverId) : null;
    const vehicle = vehicles.find(v => v.id === f.vehicleId);
    return {
      id: f.id, vehicleId: f.vehicleId, vehiclePlate: vehicle?.plate || null,
      driverId: f.driverId, driverName: driver?.name || null,
      date: f.date.toISOString(), liters: f.liters, pricePerLiter: f.pricePerLiter,
      totalCost: f.totalCost, mileage: f.mileage, station: f.station, notes: f.notes,
      createdAt: f.createdAt.toISOString(),
    };
  });

  const totalLiters = records.reduce((sum, r) => sum + r.liters, 0);
  const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
  const averagePricePerLiter = records.length > 0 ? totalCost / totalLiters : 0;

  const byVehicleMap: Record<string, { totalLiters: number; totalCost: number }> = {};
  records.forEach(r => {
    const plate = r.vehiclePlate || `ID:${r.vehicleId}`;
    if (!byVehicleMap[plate]) byVehicleMap[plate] = { totalLiters: 0, totalCost: 0 };
    byVehicleMap[plate].totalLiters += r.liters;
    byVehicleMap[plate].totalCost += r.totalCost;
  });
  const byVehicle = Object.entries(byVehicleMap).map(([vehiclePlate, data]) => ({ vehiclePlate, ...data }));

  res.json({ records, totalLiters, totalCost, averagePricePerLiter, byVehicle });
});

router.get("/maintenance", requireAuth, async (req, res) => {
  const maintenance = await db.select().from(maintenanceTable);
  const vehicles = await db.select().from(vehiclesTable);
  const { suppliersTable } = await import("@workspace/db/schema");
  const suppliers = await db.select().from(suppliersTable);

  let filtered = maintenance;
  if (req.query.startDate) filtered = filtered.filter(m => m.date >= new Date(String(req.query.startDate)));
  if (req.query.endDate) filtered = filtered.filter(m => m.date <= new Date(String(req.query.endDate)));
  if (req.query.vehicleId) filtered = filtered.filter(m => m.vehicleId === Number(req.query.vehicleId));

  const records = filtered.map(m => {
    const vehicle = vehicles.find(v => v.id === m.vehicleId);
    const supplier = m.supplierId ? suppliers.find(s => s.id === m.supplierId) : null;
    return {
      id: m.id, vehicleId: m.vehicleId, vehiclePlate: vehicle?.plate || null,
      type: m.type, description: m.description, date: m.date.toISOString(),
      status: m.status, cost: m.cost, mileage: m.mileage,
      supplierId: m.supplierId, supplierName: supplier?.name || null,
      notes: m.notes, partsUsed: m.partsUsed || [], createdAt: m.createdAt.toISOString(),
    };
  });

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  const byVehicleMap: Record<string, { totalCost: number; count: number }> = {};
  records.forEach(r => {
    const plate = r.vehiclePlate || `ID:${r.vehicleId}`;
    if (!byVehicleMap[plate]) byVehicleMap[plate] = { totalCost: 0, count: 0 };
    byVehicleMap[plate].totalCost += r.cost || 0;
    byVehicleMap[plate].count += 1;
  });
  const byVehicle = Object.entries(byVehicleMap).map(([vehiclePlate, data]) => ({ vehiclePlate, ...data }));

  const byTypeMap: Record<string, { count: number; totalCost: number }> = {};
  records.forEach(r => {
    if (!byTypeMap[r.type]) byTypeMap[r.type] = { count: 0, totalCost: 0 };
    byTypeMap[r.type].count += 1;
    byTypeMap[r.type].totalCost += r.cost || 0;
  });
  const byType = Object.entries(byTypeMap).map(([type, data]) => ({ type, ...data }));

  res.json({ records, totalCost, byVehicle, byType });
});

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const vehicles = await db.select().from(vehiclesTable);
  const users = await db.select().from(usersTable);
  const trips = await db.select().from(tripsTable);
  const fuelings = await db.select().from(fuelingsTable);
  const maintenance = await db.select().from(maintenanceTable);
  const inventory = await db.select().from(inventoryItemsTable);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalFuelCostThisMonth = fuelings
    .filter(f => f.date >= monthStart)
    .reduce((sum, f) => sum + f.totalCost, 0);

  const totalMaintenanceCostThisMonth = maintenance
    .filter(m => m.date >= monthStart && m.cost)
    .reduce((sum, m) => sum + (m.cost || 0), 0);

  res.json({
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === "active").length,
    vehiclesInMaintenance: vehicles.filter(v => v.status === "maintenance").length,
    totalDrivers: users.filter(u => u.role === "driver" && u.active).length,
    activeTrips: trips.filter(t => t.status === "in_progress").length,
    pendingTrips: trips.filter(t => t.status === "pending").length,
    completedTripsThisMonth: trips.filter(t => t.status === "completed" && t.actualEnd && t.actualEnd >= monthStart).length,
    totalFuelCostThisMonth,
    totalMaintenanceCostThisMonth,
    lowStockItems: inventory.filter(i => i.currentStock <= i.minStock).length,
  });
});

export default router;
