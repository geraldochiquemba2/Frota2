import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();


function formatSupplier(s: any) {
  return { id: s.id, name: s.name, contactName: s.contactName, phone: s.phone, email: s.email, address: s.address, category: s.category, notes: s.notes, createdAt: s.createdAt.toISOString() };
}

router.get("/", requireAuth, async (req, res) => {
  const suppliers = await db.select().from(suppliersTable);
  res.json(suppliers.map(formatSupplier));
});

router.post("/", requireAuth, async (req, res) => {
  const { name, contactName, phone, email, address, category, notes } = req.body;
  const [s] = await db.insert(suppliersTable).values({ name, contactName: contactName || null, phone: phone || null, email: email || null, address: address || null, category: category || null, notes: notes || null }).returning();
  res.status(201).json(formatSupplier(s));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, Number(req.params.id)));
  if (!s) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
  res.json(formatSupplier(s));
});

router.put("/:id", requireAuth, async (req, res) => {
  const { name, contactName, phone, email, address, category, notes } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (contactName !== undefined) updateData.contactName = contactName;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (address !== undefined) updateData.address = address;
  if (category !== undefined) updateData.category = category;
  if (notes !== undefined) updateData.notes = notes;
  const [s] = await db.update(suppliersTable).set(updateData).where(eq(suppliersTable.id, Number(req.params.id))).returning();
  if (!s) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
  res.json(formatSupplier(s));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(suppliersTable).where(eq(suppliersTable.id, Number(req.params.id)));
  res.json({ message: "Fornecedor eliminado" });
});

export default router;
