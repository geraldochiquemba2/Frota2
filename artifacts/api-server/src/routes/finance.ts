import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { financeRecordsTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();


function formatRecord(r: any, vehicles: any[]) {
  const vehicle = r.vehicleId ? vehicles.find(v => v.id === r.vehicleId) : null;
  return {
    id: r.id, type: r.type, category: r.category, description: r.description,
    amount: r.amount, date: r.date.toISOString(), vehicleId: r.vehicleId,
    vehiclePlate: vehicle?.plate || null, referenceId: r.referenceId,
    referenceType: r.referenceType, notes: r.notes, createdAt: r.createdAt.toISOString(),
  };
}

router.get("/summary", requireAuth, async (req, res) => {
  const records = await db.select().from(financeRecordsTable);
  const totalIncome = records.filter(r => r.type === "income").reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = records.filter(r => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
  const balance = totalIncome - totalExpenses;
  // Expenses by category
  const expMap: Record<string, number> = {};
  records.filter(r => r.type === "expense").forEach(r => {
    expMap[r.category] = (expMap[r.category] || 0) + r.amount;
  });
  const expensesByCategory = Object.entries(expMap).map(([category, amount]) => ({ category, amount }));
  // Monthly data (last 6 months)
  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  records.forEach(r => {
    const month = r.date.toISOString().slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 };
    if (r.type === "income") monthlyMap[month].income += r.amount;
    else monthlyMap[month].expenses += r.amount;
  });
  const monthlyData = Object.entries(monthlyMap).sort().slice(-6).map(([month, data]) => ({ month, ...data }));
  res.json({ totalIncome, totalExpenses, balance, expensesByCategory, monthlyData });
});

router.get("/", requireAuth, async (req, res) => {
  const records = await db.select().from(financeRecordsTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(records.map(r => formatRecord(r, vehicles)));
});

router.post("/", requireAuth, async (req, res) => {
  const { type, category, description, amount, date, vehicleId, notes } = req.body;
  const [r] = await db.insert(financeRecordsTable).values({
    type, category, description, amount, date: new Date(date),
    vehicleId: vehicleId || null, notes: notes || null,
  }).returning();
  const vehicles = await db.select().from(vehiclesTable);
  res.status(201).json(formatRecord(r, vehicles));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [r] = await db.select().from(financeRecordsTable).where(eq(financeRecordsTable.id, Number(req.params.id)));
  if (!r) { res.status(404).json({ error: "Registo não encontrado" }); return; }
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatRecord(r, vehicles));
});

router.put("/:id", requireAuth, async (req, res) => {
  const { type, category, description, amount, date, vehicleId, notes } = req.body;
  const updateData: any = {};
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (description !== undefined) updateData.description = description;
  if (amount !== undefined) updateData.amount = amount;
  if (date !== undefined) updateData.date = new Date(date);
  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (notes !== undefined) updateData.notes = notes;
  const [r] = await db.update(financeRecordsTable).set(updateData).where(eq(financeRecordsTable.id, Number(req.params.id))).returning();
  if (!r) { res.status(404).json({ error: "Registo não encontrado" }); return; }
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatRecord(r, vehicles));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(financeRecordsTable).where(eq(financeRecordsTable.id, Number(req.params.id)));
  res.json({ message: "Registo eliminado" });
});

export default router;
