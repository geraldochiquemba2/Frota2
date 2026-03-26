import React, { useState } from "react";
import { useListMaintenance, useCreateMaintenance, useUpdateMaintenance, useDeleteMaintenance, useListVehicles, useListSuppliers, useListInventory, Maintenance } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const schema = z.object({
  vehicleId: z.coerce.number().min(1, "Obrigatório"),
  type: z.string().min(1, "Obrigatório"),
  description: z.string().min(1, "Obrigatório"),
  date: z.string().min(1, "Obrigatório"),
  status: z.enum(["scheduled", "in_progress", "completed"]),
  cost: z.coerce.number().optional().nullable(),
  mileage: z.coerce.number().optional().nullable(),
  supplierId: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  partsUsed: z.array(z.object({
    inventoryItemId: z.coerce.number(),
    quantity: z.coerce.number().min(0.01)
  })).optional().default([]),
});

type FormValues = z.infer<typeof schema>;

export default function AdminMaintenance() {
  const { data: maintenance, isLoading } = useListMaintenance();
  const { data: vehicles } = useListVehicles();
  const { data: suppliers } = useListSuppliers();
  const { data: inventory } = useListInventory();
  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const deleteMutation = useDeleteMaintenance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Maintenance | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: 0, type: "", description: "", date: new Date().toISOString().slice(0, 10), status: "scheduled", cost: null, mileage: null, supplierId: null, notes: "", partsUsed: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partsUsed"
  });

  function openCreate() {
    setEditItem(null);
    form.reset({ vehicleId: 0, type: "", description: "", date: new Date().toISOString().slice(0, 10), status: "scheduled", cost: null, mileage: null, supplierId: null, notes: "", partsUsed: [] });
    setIsDialogOpen(true);
  }

  function openEdit(item: Maintenance) {
    setEditItem(item);
    form.reset({
      vehicleId: item.vehicleId, type: item.type, description: item.description,
      date: item.date.slice(0, 10), status: item.status as any,
      cost: item.cost || null, mileage: item.mileage || null,
      supplierId: item.supplierId || null, notes: item.notes || "",
      partsUsed: item.partsUsed || [],
    });
    setIsDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { 
      ...values, 
      date: new Date(values.date).toISOString(), 
      cost: values.cost || null, 
      mileage: values.mileage || null, 
      supplierId: values.supplierId || null, 
      notes: values.notes || null, 
      partsUsed: values.partsUsed?.map(p => {
        const item = inventory?.find(i => i.id === p.inventoryItemId);
        return {
          inventoryItemId: p.inventoryItemId,
          quantity: p.quantity,
          itemName: item?.name || "Desconhecido",
          unitCost: item?.unitPrice || 0
        };
      }) || [] 
    };
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data: payload });
      toast({ title: "Manutenção atualizada" });
    } else {
      await createMutation.mutateAsync({ data: payload });
      toast({ title: "Manutenção criada" });
    }
    queryClient.invalidateQueries();
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    toast({ title: "Manutenção eliminada" });
    queryClient.invalidateQueries();
    setDeleteId(null);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl"><Wrench className="w-6 h-6 text-amber-500" /></div>
          <div>
            <h1 className="text-2xl font-bold">Manutenção</h1>
            <p className="text-sm text-muted-foreground">{maintenance?.length || 0} registos</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nova Manutenção</Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Data</TableHead>
              <TableHead>Viatura</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenance?.map(m => (
              <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>{m.date ? format(new Date(m.date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className="font-medium">{m.vehiclePlate || m.vehicleId}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell className="max-w-xs truncate">{m.description}</TableCell>
                <TableCell><Badge className={statusColors[m.status] || ""}>{m.status === "scheduled" ? "Agendado" : m.status === "in_progress" ? "Em Curso" : "Concluído"}</Badge></TableCell>
                <TableCell>{m.cost ? `${m.cost.toFixed(2)} Kz` : "-"}</TableCell>
                <TableCell>{m.supplierName || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!maintenance || maintenance.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma manutenção registada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Manutenção" : "Nova Manutenção"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem><FormLabel>Viatura *</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                      <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="in_progress">Em Curso</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Tipo *</FormLabel><FormControl><Input placeholder="Ex: Revisão, Pneus..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Data *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição *</FormLabel><FormControl><Input placeholder="Descrição detalhada..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cost" render={({ field }) => (
                  <FormItem><FormLabel>Custo (Kz)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="mileage" render={({ field }) => (
                  <FormItem><FormLabel>Km</FormLabel><FormControl><Input type="number" placeholder="Quilometragem" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem><FormLabel>Fornecedor</FormLabel>
                  <Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="none">Nenhum</SelectItem>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas</FormLabel><FormControl><Input placeholder="Observações..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="space-y-3 pt-2 border-t mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">Peças / Consumíveis</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ inventoryItemId: 0, quantity: 1 })}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Peça
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end bg-muted/30 p-3 rounded-xl border border-border">
                    <FormField control={form.control} name={`partsUsed.${index}.inventoryItemId`} render={({field: f}) => (
                      <FormItem className="flex-1"><FormLabel>Peça</FormLabel>
                        <Select onValueChange={(v) => f.onChange(Number(v))} value={f.value ? f.value.toString() : ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecionar"/></SelectTrigger></FormControl>
                          <SelectContent>
                            {inventory?.filter(i => i.currentStock > 0).map(i => (
                              <SelectItem key={i.id} value={i.id.toString()}>{i.name} ({i.currentStock} disp.)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`partsUsed.${index}.quantity`} render={({field: f}) => (
                      <FormItem className="w-24"><FormLabel>Qtd</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mb-2" onClick={() => remove(index)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar Manutenção?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
