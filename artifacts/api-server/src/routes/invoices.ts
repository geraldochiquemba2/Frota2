import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invoicesTable, suppliersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const sessionUserId = (req.session as any)?.userId;
  const sessionRole = (req.session as any)?.role;
  
  let records;
  if (sessionRole === "driver") {
    records = await db.select().from(invoicesTable).where(eq(invoicesTable.driverId, sessionUserId)).orderBy(desc(invoicesTable.date));
  } else {
    records = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.date));
  }
  res.json(records);
});

router.post("/", requireAuth, async (req, res) => {
  const { invoiceNumber, type, referenceId, amount, date, supplierId, documentUrl, notes, vehicleId, driverId } = req.body;
  const sessionUserId = (req.session as any)?.userId;
  const sessionRole = (req.session as any)?.role;
  
  const finalDriverId = sessionRole === "driver" ? sessionUserId : (driverId ? Number(driverId) : null);
  const finalVehicleId = vehicleId ? Number(vehicleId) : null;

  const [r] = await db.insert(invoicesTable).values({
    invoiceNumber,
    type,
    referenceId: referenceId || null,
    amount,
    date: new Date(date),
    supplierId: supplierId || null,
    documentUrl: documentUrl || null,
    notes: notes || null,
    vehicleId: finalVehicleId,
    driverId: finalDriverId,
  }).returning();
  res.status(201).json(r);
});

router.get("/:id", requireAuth, async (req, res) => {
  const [r] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, Number(req.params.id)));
  if (!r) { res.status(404).json({ error: "Fatura não encontrada" }); return; }
  res.json(r);
});

router.put("/:id", requireAuth, async (req, res) => {
  const { invoiceNumber, type, referenceId, amount, date, supplierId, documentUrl, notes } = req.body;
  const updateData: any = {};
  if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
  if (type !== undefined) updateData.type = type;
  if (referenceId !== undefined) updateData.referenceId = referenceId;
  if (amount !== undefined) updateData.amount = amount;
  if (date !== undefined) updateData.date = new Date(date);
  if (supplierId !== undefined) updateData.supplierId = supplierId;
  if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
  if (notes !== undefined) updateData.notes = notes;
  const [r] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, Number(req.params.id))).returning();
  if (!r) { res.status(404).json({ error: "Fatura não encontrada" }); return; }
  res.json(r);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(invoicesTable).where(eq(invoicesTable.id, Number(req.params.id)));
  res.json({ message: "Fatura eliminada" });
});

export default router;
