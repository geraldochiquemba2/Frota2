import React, { useState } from "react";
import { useListFuelings, useCreateFueling, useUpdateFueling, useDeleteFueling, useListVehicles, useListUsers, Fueling } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Droplets } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const schema = z.object({
  vehicleId: z.coerce.number().min(1, "Obrigatório"),
  driverId: z.coerce.number().optional().nullable(),
  date: z.string().min(1, "Obrigatório"),
  liters: z.coerce.number().min(0.01, "Obrigatório"),
  pricePerLiter: z.coerce.number().min(0.01, "Obrigatório"),
  totalCost: z.coerce.number().min(0.01, "Obrigatório"),
  mileage: z.coerce.number().min(0),
  station: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function AdminFuelings() {
  const { data: fuelings, isLoading } = useListFuelings();
  const { data: vehicles } = useListVehicles();
  const { data: users } = useListUsers();
  const createMutation = useCreateFueling();
  const updateMutation = useUpdateFueling();
  const deleteMutation = useDeleteFueling();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Fueling | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: 0, driverId: null, date: new Date().toISOString().slice(0, 10), liters: 0, pricePerLiter: 0, totalCost: 0, mileage: 0, station: "", notes: "" },
  });

  const drivers = users?.filter(u => u.role === "driver") || [];

  function openCreate() {
    setEditItem(null);
    form.reset({ vehicleId: 0, driverId: null, date: new Date().toISOString().slice(0, 10), liters: 0, pricePerLiter: 0, totalCost: 0, mileage: 0, station: "", notes: "" });
    setIsDialogOpen(true);
  }

  function openEdit(item: Fueling) {
    setEditItem(item);
    form.reset({
      vehicleId: item.vehicleId, driverId: item.driverId || null,
      date: item.date.slice(0, 10),
      liters: item.liters, pricePerLiter: item.pricePerLiter, totalCost: item.totalCost,
      mileage: item.mileage, station: item.station || "", notes: item.notes || "",
    });
    setIsDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = { ...values, date: new Date(values.date).toISOString(), driverId: values.driverId || null, station: values.station || null, notes: values.notes || null };
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data: payload });
      toast({ title: "Abastecimento atualizado" });
    } else {
      await createMutation.mutateAsync({ data: payload });
      toast({ title: "Abastecimento registado" });
    }
    queryClient.invalidateQueries();
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    toast({ title: "Abastecimento eliminado" });
    queryClient.invalidateQueries();
    setDeleteId(null);
  }

  // Auto-calculate total
  const liters = form.watch("liters");
  const ppl = form.watch("pricePerLiter");
  React.useEffect(() => {
    if (liters && ppl) form.setValue("totalCost", parseFloat((liters * ppl).toFixed(2)));
  }, [liters, ppl]);

  if (isLoading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Droplets className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Abastecimentos</h1>
            <p className="text-sm text-muted-foreground">{fuelings?.length || 0} registos</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Abastecimento</Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Data</TableHead>
              <TableHead>Viatura</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Litros</TableHead>
              <TableHead>Preço/L</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Posto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuelings?.map(f => (
              <TableRow key={f.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>{f.date ? format(new Date(f.date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className="font-medium">{f.vehiclePlate || f.vehicleId}</TableCell>
                <TableCell>{f.driverName || "-"}</TableCell>
                <TableCell>{f.liters.toFixed(1)} L</TableCell>
                <TableCell>{f.pricePerLiter.toFixed(3)} €</TableCell>
                <TableCell className="font-semibold">{f.totalCost.toFixed(2)} €</TableCell>
                <TableCell>{f.mileage.toLocaleString()} km</TableCell>
                <TableCell>{f.station || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(f.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!fuelings || fuelings.length === 0) && (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum abastecimento registado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Abastecimento" : "Novo Abastecimento"}</DialogTitle></DialogHeader>
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
                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem><FormLabel>Motorista</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{drivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Data *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="liters" render={({ field }) => (
                  <FormItem><FormLabel>Litros *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pricePerLiter" render={({ field }) => (
                  <FormItem><FormLabel>Preço/L *</FormLabel><FormControl><Input type="number" step="0.001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="totalCost" render={({ field }) => (
                  <FormItem><FormLabel>Total (€) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mileage" render={({ field }) => (
                  <FormItem><FormLabel>Km *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="station" render={({ field }) => (
                  <FormItem><FormLabel>Posto</FormLabel><FormControl><Input placeholder="Nome do posto" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas</FormLabel><FormControl><Input placeholder="Observações..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar Abastecimento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
