import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (p.startsWith("00244")) p = "+" + p.slice(2);
  if (p.startsWith("244") && !p.startsWith("+")) p = "+" + p;
  if (/^9\d{8}$/.test(p)) p = "+244" + p;
  return p;
}

router.post("/register", async (req, res) => {
  const { name, phone: rawPhone, pin, role } = req.body;
  if (!name || !rawPhone || !pin) {
    res.status(400).json({ error: "Nome, telefone e PIN são obrigatórios" });
    return;
  }
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    res.status(400).json({ error: "PIN deve ter 4 a 6 dígitos" });
    return;
  }
  const phone = normalizePhone(String(rawPhone));
  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(409).json({ error: "Este número já está registado" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name, phone, pin, role: role === "driver" ? "driver" : "admin", active: true,
  }).returning();
  (req.session as any).userId = user.id;
  res.status(201).json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, active: user.active, vehicleId: user.vehicleId, createdAt: user.createdAt.toISOString() },
    message: "Conta criada com sucesso",
  });
});

router.post("/login", async (req, res) => {
  const { phone: rawPhone, pin } = req.body;
  if (!rawPhone || !pin) {
    res.status(400).json({ error: "Telefone e PIN são obrigatórios" });
    return;
  }
  const phone = normalizePhone(String(rawPhone));
  const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  const user = users[0];
  if (!user || user.pin !== String(pin)) {
    res.status(401).json({ error: "Telefone ou PIN inválido" });
    return;
  }
  if (!user.active) {
    res.status(401).json({ error: "Utilizador inativo" });
    return;
  }
  (req.session as any).userId = user.id;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      active: user.active,
      vehicleId: user.vehicleId,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Login efetuado com sucesso",
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Sessão terminada" });
  });
});

router.get("/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "Utilizador não encontrado" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    active: user.active,
    vehicleId: user.vehicleId,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
