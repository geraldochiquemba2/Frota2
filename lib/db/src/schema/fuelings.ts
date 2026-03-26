import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fuelingsTable = pgTable("fuelings", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  driverId: integer("driver_id"),
  date: timestamp("date").notNull(),
  liters: real("liters").notNull(),
  pricePerLiter: real("price_per_liter").notNull(),
  totalCost: real("total_cost").notNull(),
  mileage: real("mileage").notNull(),
  station: text("station"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFuelingSchema = createInsertSchema(fuelingsTable).omit({ id: true, createdAt: true });
export type InsertFueling = z.infer<typeof insertFuelingSchema>;
export type Fueling = typeof fuelingsTable.$inferSelect;
