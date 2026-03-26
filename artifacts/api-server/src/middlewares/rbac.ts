import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

export async function requireRole(role: "admin" | "driver") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== role) {
      res.status(403).json({ error: "Acesso negado: Requer privilégios de " + (role === "admin" ? "Administrador" : "Motorista") });
      return;
    }

    (req as any).user = user;
    next();
  };
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const adminMiddleware = await requireRole("admin");
  return adminMiddleware(req, res, next);
};

export const requireDriver = async (req: Request, res: Response, next: NextFunction) => {
  const driverMiddleware = await requireRole("driver");
  return driverMiddleware(req, res, next);
};
