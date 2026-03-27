import React, { useState } from "react";
import { useListTrips, useCreateTrip, useUpdateTrip, useDeleteTrip, useListVehicles, useListUsers, Trip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar, Search, Filter, MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix vector icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TripRouteLayer } from "@/components/TripRouteMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const tripSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  origin: z.string().min(1, "Origem obrigatória"),
  destination: z.string().min(1, "Destino obrigatório"),
  scheduledStart: z.string().min(1, "Data de início obrigatória"),
  scheduledEnd: z.string().optional().nullable(),
  driverId: z.coerce.number().optional().nullable(),
  vehicleId: z.coerce.number().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  distance: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof tripSchema>;

export default function AdminTrips() {
  const { data: trips, isLoading } = useListTrips();
  const { data: vehicles } = useListVehicles();
  const { data: users } = useListUsers();
  const drivers = users?.filter(u => u.role === "driver" && u.active) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: "", origin: "", destination: "", scheduledStart: new Date().toISOString().split('T')[0],
      driverId: null, vehicleId: null, status: "pending"
    }
  });

  const createMutation = useCreateTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setIsDialogOpen(false);
        toast({ title: "Viagem criada com sucesso" });
      }
    }
  });

  const updateMutation = useUpdateTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setIsDialogOpen(false);
        toast({ title: "Viagem atualizada" });
      }
    }
  });

  const deleteMutation = useDeleteTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        toast({ title: "Viagem eliminada" });
      }
    }
  });

  const openCreate = () => {
    setEditingTrip(null);
    form.reset({
      title: "", origin: "", destination: "", scheduledStart: new Date().toISOString().split('T')[0],
      driverId: null, vehicleId: null, status: "pending"
    });
    setIsDialogOpen(true);
  };

  const openEdit = (t: Trip) => {
    setEditingTrip(t);
    form.reset({
      title: t.title, origin: t.origin, destination: t.destination, 
      scheduledStart: t.scheduledStart.split('T')[0], 
      scheduledEnd: t.scheduledEnd ? t.scheduledEnd.split('T')[0] : "",
      driverId: t.driverId, vehicleId: t.vehicleId, status: t.status,
      distance: t.distance, notes: t.notes
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    // API expects full date strings, formatting inputs
    const formattedValues = {
      ...values,
      scheduledStart: new Date(values.scheduledStart).toISOString(),
      scheduledEnd: values.scheduledEnd ? new Date(values.scheduledEnd).toISOString() : null,
    };

    if (editingTrip) {
      updateMutation.mutate({ id: editingTrip.id, data: formattedValues });
    } else {
      createMutation.mutate({ data: formattedValues as any });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500';
      case 'cancelled': return 'bg-rose-500/20 text-rose-500';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestão de Viagens</h1>
          <p className="text-muted-foreground">Planear e acompanhar rotas das viaturas em Angola</p>
        </div>
        <Button onClick={() => { form.reset(); setEditingTrip(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Viagem
        </Button>
      </div>

      {/* Angola Fleet Map */}
      <div className="rounded-2xl border border-border shadow-sm overflow-hidden h-72 relative z-0">
        <MapContainer 
          center={[-8.8368, 13.2343]} 
          zoom={6} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {trips?.filter(t => t.status === 'in_progress').map(t => (
            <TripRouteLayer key={t.id} origin={t.origin} destination={t.destination} title={t.title} />
          ))}
        </MapContainer>
        <div className="absolute top-4 right-4 z-10 bg-card/80 backdrop-blur p-2 rounded-lg border border-border text-xs font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Mapa de Operações Angola
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Informação</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Atribuição</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips?.map(t => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-foreground">{t.title}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{t.origin}</div>
                  <div className="text-xs text-muted-foreground">para {t.destination}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{t.driverName || "Não atribuído"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.vehiclePlate || "S/ Viatura"}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(t.scheduledStart), "dd MMM yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                    {t.status === 'in_progress' ? 'Em curso' : t.status === 'completed' ? 'Concluída' : t.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("Deseja mesmo eliminar esta viagem?") && deleteMutation.mutate({ id: t.id })}>
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
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader><DialogTitle>{editingTrip ? "Editar Viagem" : "Nova Viagem"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título da Viagem</FormLabel><FormControl><Input {...field} placeholder="Ex: Entrega de Material no Lobito" /></FormControl><FormMessage/></FormItem>
              )}/>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="origin" render={({ field }) => (
                  <FormItem><FormLabel>Origem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem><FormLabel>Motorista</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar motorista" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="null">Não atribuído</SelectItem>
                        {drivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem><FormLabel>Viatura</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar viatura" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="null">Não atribuída</SelectItem>
                        {vehicles?.filter(v => v.status === 'active').map(v => 
                          <SelectItem key={v.id} value={v.id.toString()}>{v.plate} - {v.brand}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  <FormMessage/></FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledStart" render={({ field }) => (
                  <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage/></FormItem>
                )}/>
                {editingTrip && (
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">Em curso</SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage/></FormItem>
                  )}/>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
