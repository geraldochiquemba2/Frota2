import React, { useState } from "react";
import { useListVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useListUsers, Vehicle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const vehicleSchema = z.object({
  plate: z.string().min(1, "Matrícula é obrigatória"),
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900).max(2100),
  status: z.enum(["active", "maintenance", "inactive"]),
  mileage: z.coerce.number().min(0),
  fuelType: z.string().min(1, "Tipo de Combustível obrigatório"),
  assignedDriverId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof vehicleSchema>;

export default function AdminVehicles() {
  const { data: vehicles, isLoading } = useListVehicles();
  const { data: users } = useListUsers();
  const drivers = users?.filter(u => u.role === "driver" && u.active) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: "", brand: "", model: "", year: new Date().getFullYear(),
      status: "active", mileage: 0, fuelType: "Diesel", assignedDriverId: null
    }
  });

  const createMutation = useCreateVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setIsDialogOpen(false);
        toast({ title: "Viatura criada com sucesso" });
      }
    }
  });

  const updateMutation = useUpdateVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setIsDialogOpen(false);
        toast({ title: "Viatura atualizada" });
      }
    }
  });

  const deleteMutation = useDeleteVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Viatura eliminada" });
      }
    }
  });

  const openCreate = () => {
    setEditingVehicle(null);
    form.reset({
      plate: "", brand: "", model: "", year: new Date().getFullYear(),
      status: "active", mileage: 0, fuelType: "Diesel", assignedDriverId: null
    });
    setIsDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    form.reset({
      plate: v.plate, brand: v.brand, model: v.model, year: v.year,
      status: v.status, mileage: v.mileage, fuelType: v.fuelType,
      assignedDriverId: v.assignedDriverId
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Viaturas</h1>
          <p className="text-muted-foreground">Gerir viaturas da frota e atribuições</p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Viatura
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Matrícula</TableHead>
              <TableHead>Viatura</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead className="text-right">Quilometragem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma viatura encontrada
                </TableCell>
              </TableRow>
            )}
            {vehicles?.map(v => (
              <TableRow key={v.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                <TableCell>
                  <div className="font-semibold text-foreground">{v.brand} {v.model}</div>
                  <div className="text-xs text-muted-foreground">{v.year} • {v.fuelType}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={v.status === 'active' ? 'default' : v.status === 'maintenance' ? 'destructive' : 'secondary'} className="capitalize">
                    {v.status === 'active' ? 'Ativa' : v.status === 'maintenance' ? 'Manutenção' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.assignedDriverName || "Não atribuído"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{v.mileage.toLocaleString()} km</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("Tem a certeza que deseja eliminar?") && deleteMutation.mutate({ id: v.id })}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingVehicle ? "Editar Viatura" : "Adicionar Nova Viatura"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="plate" render={({ field }) => (
                  <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input {...field} className="uppercase font-mono" /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="maintenance">Em Manutenção</SelectItem>
                        <SelectItem value="inactive">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage/></FormItem>
                )}/>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mileage" render={({ field }) => (
                  <FormItem><FormLabel>Quilometragem (km)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="fuelType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de Combustível</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="assignedDriverId" render={({ field }) => (
                <FormItem><FormLabel>Atribuir Motorista (Opcional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione motorista" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="null">Não atribuído</SelectItem>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.phone})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage/></FormItem>
              )}/>

              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" className="mr-2" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingVehicle ? "Guardar Alterações" : "Criar Viatura"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
