import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { maintenanceTable, vehiclesTable, suppliersTable, financeRecordsTable, inventoryItemsTable, inventoryMovementsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();


function formatMaintenance(m: any, vehicles: any[], suppliers: any[]) {
  const vehicle = vehicles.find(v => v.id === m.vehicleId);
  const supplier = m.supplierId ? suppliers.find(s => s.id === m.supplierId) : null;
  return {
    id: m.id, vehicleId: m.vehicleId, vehiclePlate: vehicle?.plate || null,
    type: m.type, description: m.description, date: m.date.toISOString(),
    status: m.status, cost: m.cost, mileage: m.mileage,
    supplierId: m.supplierId, supplierName: supplier?.name || null,
    notes: m.notes, partsUsed: m.partsUsed || [], createdAt: m.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const maintenance = await db.select().from(maintenanceTable);
  const vehicles = await db.select().from(vehiclesTable);
  const suppliers = await db.select().from(suppliersTable);
  res.json(maintenance.map(m => formatMaintenance(m, vehicles, suppliers)));
});

router.post("/", requireAuth, async (req, res) => {
  const { vehicleId, type, description, date, status, cost, mileage, supplierId, notes, partsUsed } = req.body;
  const [m] = await db.insert(maintenanceTable).values({
    vehicleId, type, description, date: new Date(date), status: status || "scheduled",
    cost: cost || null, mileage: mileage || null, supplierId: supplierId || null,
    notes: notes || null, partsUsed: partsUsed || [],
  }).returning();
  // Auto-create finance record if cost provided and status is completed
  if (cost && status === "completed") {
    await db.insert(financeRecordsTable).values({
      type: "expense", category: "Manutenção", description: `${type} - ${description}`,
      amount: cost, date: new Date(date), vehicleId, referenceId: m.id, referenceType: "maintenance",
    });
  }
  // Handle inventory movements for parts used
  if (partsUsed && partsUsed.length > 0) {
    for (const part of partsUsed) {
      await db.insert(inventoryMovementsTable).values({
        inventoryItemId: part.inventoryItemId, type: "out", quantity: part.quantity,
        reason: `Manutenção: ${description}`, maintenanceId: m.id, date: new Date(date),
      });
      const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, part.inventoryItemId));
      if (item) {
        await db.update(inventoryItemsTable).set({ currentStock: item.currentStock - part.quantity }).where(eq(inventoryItemsTable.id, part.inventoryItemId));
      }
    }
  }
  const vehicles = await db.select().from(vehiclesTable);
  const suppliers = await db.select().from(suppliersTable);
  res.status(201).json(formatMaintenance(m, vehicles, suppliers));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [m] = await db.select().from(maintenanceTable).where(eq(maintenanceTable.id, Number(req.params.id)));
  if (!m) { res.status(404).json({ error: "Manutenção não encontrada" }); return; }
  const vehicles = await db.select().from(vehiclesTable);
  const suppliers = await db.select().from(suppliersTable);
  res.json(formatMaintenance(m, vehicles, suppliers));
});

router.put("/:id", requireAuth, async (req, res) => {
  const { vehicleId, type, description, date, status, cost, mileage, supplierId, notes, partsUsed } = req.body;
  const updateData: any = {};
  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (type !== undefined) updateData.type = type;
  if (description !== undefined) updateData.description = description;
  if (date !== undefined) updateData.date = new Date(date);
  if (status !== undefined) updateData.status = status;
  if (cost !== undefined) updateData.cost = cost;
  if (mileage !== undefined) updateData.mileage = mileage;
  if (supplierId !== undefined) updateData.supplierId = supplierId;
  if (notes !== undefined) updateData.notes = notes;
  if (partsUsed !== undefined) updateData.partsUsed = partsUsed;
  const [m] = await db.update(maintenanceTable).set(updateData).where(eq(maintenanceTable.id, Number(req.params.id))).returning();
  if (!m) { res.status(404).json({ error: "Manutenção não encontrada" }); return; }
  const vehicles = await db.select().from(vehiclesTable);
  const suppliers = await db.select().from(suppliersTable);
  res.json(formatMaintenance(m, vehicles, suppliers));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(maintenanceTable).where(eq(maintenanceTable.id, Number(req.params.id)));
  res.json({ message: "Manutenção eliminada" });
});

export default router;
