import React, { useState } from "react";
import { useListFinanceRecords, useCreateFinanceRecord, useDeleteFinanceRecord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

const financeSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  date: z.string().min(1),
});

type FormValues = z.infer<typeof financeSchema>;

export default function AdminFinance() {
  const { data: records, isLoading } = useListFinanceRecords();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(financeSchema),
    defaultValues: { category: "", description: "", amount: 0, date: new Date().toISOString().split('T')[0] }
  });

  const createMutation = useCreateFinanceRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setIsDialogOpen(false);
        toast({ title: "Registo adicionado" });
      }
    }
  });

  const deleteMutation = useDeleteFinanceRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        toast({ title: "Registo eliminado" });
      }
    }
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({ data: { ...values, type: "expense", date: new Date(values.date).toISOString() } });
  };

  const totalExpense = records?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const expenseRecords = records || [];

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Finanças</h1>
          <p className="text-muted-foreground">Acompanhar despesas da frota</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Registo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-card p-6 rounded-xl border border-border flex justify-between items-center shadow-sm">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total de Despesas Acumuladas</p>
            <p className="text-3xl font-bold font-mono text-rose-500 mt-1">{formatNumber(totalExpense, 2)} Kz</p>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-full">
            <ArrowDownRight className="w-8 h-8 text-rose-500" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="text-right">Montante</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                <TableCell>
                  <span className="flex items-center text-rose-500 text-xs font-semibold uppercase bg-rose-500/10 w-fit px-2 py-1 rounded"><ArrowDownRight className="w-3 h-3 mr-1"/> Despesa</span>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground">{r.category} {r.vehiclePlate ? `• ${r.vehiclePlate}` : ''}</div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-foreground">
                  -{formatNumber(r.amount, 2)} Kz
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => confirm("Eliminar?") && deleteMutation.mutate({ id: r.id })}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle>Adicionar Registo Financeiro</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Categoria (Ex: Combustível, Manutenção, Pagamento)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Montante (Kz)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>Guardar Registo</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
