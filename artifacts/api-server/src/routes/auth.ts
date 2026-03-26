import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) {
    res.status(400).json({ error: "Telefone e PIN são obrigatórios" });
    return;
  }
  const users = await db.select().from(usersTable).where(eq(usersTable.phone, String(phone)));
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
