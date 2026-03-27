import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useListTrips, useUpdateTrip, useCreateTrip, Trip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Navigation, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { TripRouteMap } from "@/components/TripRouteMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const createTripSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  origin: z.string().min(1, "Origem obrigatória"),
  destination: z.string().min(1, "Destino obrigatório"),
  scheduledStart: z.string().min(1, "Data obrigatória"),
});

const startTripSchema = z.object({
  startMileage: z.coerce.number().min(0, "Kilometragem inválida"),
});

const endTripSchema = z.object({
  endMileage: z.coerce.number().min(0, "Kilometragem inválida"),
});

export default function DriverTrips() {
  const { user } = useAuth();
  const { data: trips } = useListTrips();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [startingTrip, setStartingTrip] = useState<Trip | null>(null);
  const [endingTrip, setEndingTrip] = useState<Trip | null>(null);
  const [cancellingTrip, setCancellingTrip] = useState<Trip | null>(null);

  const createForm = useForm<z.infer<typeof createTripSchema>>({
    resolver: zodResolver(createTripSchema),
    defaultValues: { title: "", origin: "", destination: "", scheduledStart: new Date().toISOString().split('T')[0] }
  });

  const startForm = useForm<z.infer<typeof startTripSchema>>({ resolver: zodResolver(startTripSchema) });
  const endForm = useForm<z.infer<typeof endTripSchema>>({ resolver: zodResolver(endTripSchema) });

  const createMutation = useCreateTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        setIsCreateOpen(false);
        toast({ title: "Viagem criada com sucesso" });
      }
    }
  });

  const updateMutation = useUpdateTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        setStartingTrip(null);
        setEndingTrip(null);
        toast({ title: "Viagem atualizada" });
      }
    }
  });

  const myTrips = trips?.filter(t => t.driverId === user?.id).sort((a,b) => {
    const order: Record<string, number> = { "in_progress": 0, "pending": 1, "completed": 2, "cancelled": 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  }) || [];

  const onCreateSubmit = (values: z.infer<typeof createTripSchema>) => {
    createMutation.mutate({ 
      data: {
        ...values,
        scheduledStart: new Date(values.scheduledStart).toISOString(),
        driverId: user?.id,
        vehicleId: user?.vehicleId,
        status: "pending"
      } as any
    });
  };

  const onStartSubmit = (values: z.infer<typeof startTripSchema>) => {
    if (!startingTrip) return;
    updateMutation.mutate({ 
      id: startingTrip.id, 
      data: { 
        status: "in_progress",
        actualStart: new Date().toISOString(),
        startMileage: values.startMileage
      } as any
    });
  };

  const onEndSubmit = (values: z.infer<typeof endTripSchema>) => {
    if (!endingTrip) return;
    if (endingTrip.startMileage && values.endMileage < endingTrip.startMileage) {
      endForm.setError("endMileage", { message: "Deve ser superior à kilometragem inicial" });
      return;
    }
    updateMutation.mutate({ 
      id: endingTrip.id, 
      data: { 
        status: "completed",
        actualEnd: new Date().toISOString(),
        endMileage: values.endMileage
      } as any
    });
  };

  const onCancelTrip = () => {
    if (!cancellingTrip) return;
    updateMutation.mutate({ 
      id: cancellingTrip.id, 
      data: { status: "cancelled" } as any
    }, {
      onSuccess: () => setCancellingTrip(null)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-display font-bold">As Minhas Viagens</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Criar Viagem
        </Button>
      </div>

      <div className="space-y-4">
        {myTrips.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed">
            <Navigation className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma viagem na sua lista.</p>
          </div>
        )}

        {myTrips.map(trip => {
          const isActive = trip.status === "in_progress";
          const isPending = trip.status === "pending";
          const isDone = trip.status === "completed";

          return (
            <Card key={trip.id} className={`border ${isActive ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{trip.title}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider 
                    ${isActive ? 'bg-primary/20 text-primary' : 
                      isPending ? 'bg-orange-500/20 text-orange-500' : 
                      isDone ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                    {trip.status === 'in_progress' ? 'Em Curso' : trip.status === 'pending' ? 'Pendente' : trip.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </span>
                </div>

                <div className="relative pl-4 border-l-2 border-muted space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />
                    <p className="text-xs text-muted-foreground uppercase">Origem</p>
                    <p className="font-medium">{trip.origin}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    <p className="text-xs text-muted-foreground uppercase">Destino</p>
                    <p className="font-medium">{trip.destination}</p>
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted-foreground flex flex-wrap gap-4">
                  <div><span className="font-medium text-foreground">Agendado:</span> {format(new Date(trip.scheduledStart), "dd MMM, HH:mm")}</div>
                  {trip.vehiclePlate && <div><span className="font-medium text-foreground">Viatura:</span> {trip.vehiclePlate}</div>}
                  {trip.distance !== null && trip.distance !== undefined && (
                    <div className="text-primary font-bold">Percorrido: {trip.distance} km</div>
                  )}
                </div>
              </CardContent>
              
              {(isPending || isActive) && (
                <CardFooter className="bg-muted/20 p-4 flex gap-3">
                  {isPending && (
                    <div className="flex w-full gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10" 
                        onClick={() => setCancellingTrip(trip)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
                        onClick={() => setStartingTrip(trip)}
                      >
                        <Navigation className="w-4 h-4 mr-2" /> Iniciar
                      </Button>
                    </div>
                  )}
                  {isActive && (
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={() => setEndingTrip(trip)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar Viagem
                    </Button>
                  )}
                </CardFooter>
              )}
              {(isActive || isDone) && (
                <div className="border-t rounded-b-xl overflow-hidden">
                  <TripRouteMap origin={trip.origin} destination={trip.destination} title={trip.title} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader><DialogTitle>Criar Nova Viagem</DialogTitle></DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField control={createForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="Ex: Rota Luanda-Benguela" /></FormControl><FormMessage/></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="origin" render={({ field }) => (
                  <FormItem><FormLabel>Origem</FormLabel><FormControl><Input {...field} placeholder="Cidade/Local" /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={createForm.control} name="destination" render={({ field }) => (
                  <FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} placeholder="Cidade/Local" /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
              <FormField control={createForm.control} name="scheduledStart" render={({ field }) => (
                <FormItem><FormLabel>Data Prevista</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage/></FormItem>
              )}/>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>Guardar Viagem</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* START TRIP MODAL */}
      <Dialog open={!!startingTrip} onOpenChange={() => setStartingTrip(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader><DialogTitle>Iniciar Viagem</DialogTitle></DialogHeader>
          <Form {...startForm}>
            <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Por favor, insira a kilometragem atual do conta-quilómetros da viatura {startingTrip?.vehiclePlate} antes de arrancar.
              </p>
              <FormField control={startForm.control} name="startMileage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometragem Inicial (km)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setStartingTrip(null)} className="mr-2">Cancelar</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Registar e Iniciar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* END TRIP MODAL */}
      <Dialog open={!!endingTrip} onOpenChange={() => setEndingTrip(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader><DialogTitle>Finalizar Viagem</DialogTitle></DialogHeader>
          <Form {...endForm}>
            <form onSubmit={endForm.handleSubmit(onEndSubmit)} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Chegou ao destino! Insira a kilometragem final da viatura para calcularmos a distância percorrida.
                <br/><strong className="text-foreground">Iniciou com:</strong> {endingTrip?.startMileage} km
              </p>
              <FormField control={endForm.control} name="endMileage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometragem Final (km)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEndingTrip(null)} className="mr-2">Cancelar</Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">Completar Viagem</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CANCEL TRIP ALERT */}
      <AlertDialog open={!!cancellingTrip} onOpenChange={() => setCancellingTrip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Viagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende cancelar esta viagem? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction onClick={onCancelTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
