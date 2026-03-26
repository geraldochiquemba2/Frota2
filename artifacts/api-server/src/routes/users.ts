import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, async () => {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, (req.session as any).userId));
    if (!users[0] || users[0].role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    (req as any).currentUser = users[0];
    next();
  });
}

router.get("/", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    active: u.active,
    vehicleId: u.vehicleId,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, phone, pin, role, vehicleId } = req.body;
  const [user] = await db.insert(usersTable).values({
    name, phone, pin, role: role || "driver", active: true, vehicleId: vehicleId || null,
  }).returning();
  res.status(201).json({
    id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString(),
  });
});

router.get("/:id", requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  if (!user) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }
  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString() });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { name, phone, pin, role, vehicleId, active } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (pin !== undefined) updateData.pin = pin;
  if (role !== undefined) updateData.role = role;
  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (active !== undefined) updateData.active = active;
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, Number(req.params.id))).returning();
  if (!user) { res.status(404).json({ error: "Utilizador não encontrado" }); return; }
  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString() });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  res.json({ message: "Utilizador eliminado" });
});

export default router;
