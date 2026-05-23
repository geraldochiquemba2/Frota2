import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  type: text("type").notNull(), // 'fueling' or 'maintenance'
  referenceId: integer("reference_id"), // ID of the fueling or maintenance record
  amount: real("amount").notNull(),
  date: timestamp("date").notNull(),
  supplierId: integer("supplier_id"),
  documentUrl: text("document_url"), // URL/path to the uploaded file
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
