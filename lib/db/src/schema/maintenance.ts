import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceTable = pgTable("maintenance", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("scheduled"),
  cost: real("cost"),
  mileage: real("mileage"),
  supplierId: integer("supplier_id"),
  notes: text("notes"),
  partsUsed: jsonb("parts_used").$type<Array<{inventoryItemId: number; itemName: string; quantity: number; unitCost: number}>>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenanceTable).omit({ id: true, createdAt: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenanceTable.$inferSelect;
