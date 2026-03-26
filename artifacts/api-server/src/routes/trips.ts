import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tripsTable, usersTable, vehiclesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

import { requireAuth } from "../middlewares/rbac";

function formatTrip(t: any, users: any[], vehicles: any[]) {
  const driver = t.driverId ? users.find(u => u.id === t.driverId) : null;
  const vehicle = t.vehicleId ? vehicles.find(v => v.id === t.vehicleId) : null;
  return {
    id: t.id, title: t.title, origin: t.origin, destination: t.destination,
    scheduledStart: t.scheduledStart.toISOString(),
    scheduledEnd: t.scheduledEnd?.toISOString() || null,
    actualStart: t.actualStart?.toISOString() || null,
    actualEnd: t.actualEnd?.toISOString() || null,
    status: t.status, driverId: t.driverId, driverName: driver?.name || null,
    vehicleId: t.vehicleId, vehiclePlate: vehicle?.plate || null,
    notes: t.notes, distance: t.distance, createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  const currentUser = users.find(u => u.id === userId);
  let trips;
  if (currentUser?.role === "admin") {
    trips = await db.select().from(tripsTable);
  } else {
    trips = await db.select().from(tripsTable).where(eq(tripsTable.driverId, userId));
  }
  res.json(trips.map(t => formatTrip(t, users, vehicles)));
});

router.post("/", requireAuth, async (req, res) => {
  const { title, origin, destination, scheduledStart, scheduledEnd, driverId, vehicleId, notes, distance } = req.body;
  const [t] = await db.insert(tripsTable).values({
    title, origin, destination,
    scheduledStart: new Date(scheduledStart),
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
    status: "pending", driverId: driverId || null, vehicleId: vehicleId || null, notes: notes || null, distance: distance || null,
  }).returning();
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.status(201).json(formatTrip(t, users, vehicles));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [t] = await db.select().from(tripsTable).where(eq(tripsTable.id, Number(req.params.id)));
  if (!t) { res.status(404).json({ error: "Viagem não encontrada" }); return; }
  const users = await db.select().from(usersTable);
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatTrip(t, users, vehicles));
});

router.put("/:id", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const users = await db.select().from(usersTable);
  const currentUser = users.find(u => u.id === userId);

  const [t_check] = await db.select().from(tripsTable).where(eq(tripsTable.id, Number(req.params.id)));
  if (!t_check) { res.status(404).json({ error: "Viagem não encontrada" }); return; }

  // Security check: Drivers can only update their OWN trips
  if (currentUser?.role === "driver" && t_check.driverId !== userId) {
    res.status(403).json({ error: "Acesso negado: Não pode atualizar viagens de outros motoristas" });
    return;
  }

  const { title, origin, destination, scheduledStart, scheduledEnd, actualStart, actualEnd, status, driverId, vehicleId, notes, distance } = req.body;
  
  // Security check: Drivers cannot change driverId or vehicleId or Title/Origin/Dest
  const updateData: any = {};
  if (currentUser?.role === "admin") {
    if (title !== undefined) updateData.title = title;
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;
    if (scheduledStart !== undefined) updateData.scheduledStart = new Date(scheduledStart);
    if (scheduledEnd !== undefined) updateData.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null;
    if (driverId !== undefined) updateData.driverId = driverId;
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
    if (distance !== undefined) updateData.distance = distance;
  }
  
  // Both roles can update these (or driver specifically updates status/actuals)
  if (actualStart !== undefined) updateData.actualStart = actualStart ? new Date(actualStart) : null;
  if (actualEnd !== undefined) updateData.actualEnd = actualEnd ? new Date(actualEnd) : null;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const [t] = await db.update(tripsTable).set(updateData).where(eq(tripsTable.id, Number(req.params.id))).returning();
  const vehicles = await db.select().from(vehiclesTable);
  res.json(formatTrip(t, users, vehicles));
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(tripsTable).where(eq(tripsTable.id, Number(req.params.id)));
  res.json({ message: "Viagem eliminada" });
});

export default router;
