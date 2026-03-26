import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, inventoryMovementsTable, suppliersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();


function formatItem(item: any, suppliers: any[]) {
  const supplier = item.supplierId ? suppliers.find(s => s.id === item.supplierId) : null;
  return {
    id: item.id, name: item.name, category: item.category, unit: item.unit,
    currentStock: item.currentStock, minStock: item.minStock, unitPrice: item.unitPrice,
    supplierId: item.supplierId, supplierName: supplier?.name || null,
    notes: item.notes, createdAt: item.createdAt.toISOString(),
  };
}

router.get("/movements", requireAuth, async (req, res) => {
  const movements = await db.select().from(inventoryMovementsTable);
  const items = await db.select().from(inventoryItemsTable);
  res.json(movements.map(m => {
    const item = items.find(i => i.id === m.inventoryItemId);
    return {
      id: m.id, inventoryItemId: m.inventoryItemId, itemName: item?.name || null,
      type: m.type, quantity: m.quantity, reason: m.reason, maintenanceId: m.maintenanceId,
      date: m.date.toISOString(), createdAt: m.createdAt.toISOString(),
    };
  }));
});

router.post("/movements", requireAuth, async (req, res) => {
  const { inventoryItemId, type, quantity, reason, maintenanceId, date } = req.body;
  const [mv] = await db.insert(inventoryMovementsTable).values({
    inventoryItemId, type, quantity, reason: reason || null, maintenanceId: maintenanceId || null, date: new Date(date),
  }).returning();
  // Update stock
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, inventoryItemId));
  if (item) {
    let newStock = item.currentStock;
    if (type === "in") newStock += quantity;
    else if (type === "out") newStock -= quantity;
    else if (type === "adjustment") newStock = quantity;
    await db.update(inventoryItemsTable).set({ currentStock: newStock }).where(eq(inventoryItemsTable.id, inventoryItemId));
  }
  const items = await db.select().from(inventoryItemsTable);
  const updatedItem = items.find(i => i.id === inventoryItemId);
  res.status(201).json({
    id: mv.id, inventoryItemId: mv.inventoryItemId, itemName: updatedItem?.name || null,
    type: mv.type, quantity: mv.quantity, reason: mv.reason, maintenanceId: mv.maintenanceId,
    date: mv.date.toISOString(), createdAt: mv.createdAt.toISOString(),
  });
});

router.get("/", requireAuth, async (req, res) => {
  const items = await db.select().from(inventoryItemsTable);
  const suppliers = await db.select().from(suppliersTable);
  res.json(items.map(i => formatItem(i, suppliers)));
});

router.post("/", requireAuth, async (req, res) => {
  const { name, category, unit, currentStock, minStock, unitPrice, supplierId, notes } = req.body;
  const [item] = await db.insert(inventoryItemsTable).values({
    name, category, unit, currentStock: currentStock || 0, minStock: minStock || 0,
    unitPrice: unitPrice || null, supplierId: supplierId || null, notes: notes || null,
  }).returning();
  const suppliers = await db.select().from(suppliersTable);
  res.status(201).json(formatItem(item, suppliers));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, Number(req.params.id)));
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  const suppliers = await db.select().from(suppliersTable);
  res.json(formatItem(item, suppliers));
});

router.put("/:id", requireAuth, async (req, res) => {
  const { name, category, unit, currentStock, minStock, unitPrice, supplierId, notes } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (unit !== undefined) updateData.unit = unit;
  if (currentStock !== undefined) updateData.currentStock = currentStock;
  if (minStock !== undefined) updateData.minStock = minStock;
  if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
  if (supplierId !== undefined) updateData.supplierId = supplierId;
  if (notes !== undefined) updateData.notes = notes;
  const [item] = await db.update(inventoryItemsTable).set(updateData).where(eq(inventoryItemsTable.id, Number(req.params.id))).returning();
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  const suppliers = await db.select().from(suppliersTable);
  res.json(formatItem(item, suppliers));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, Number(req.params.id)));
  res.json({ message: "Item eliminado" });
});

export default router;
