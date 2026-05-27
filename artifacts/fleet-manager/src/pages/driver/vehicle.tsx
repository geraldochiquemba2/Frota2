import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useListVehicles } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Navigation, Settings, Droplet, Calendar, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function DriverVehicle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // @ts-expect-error queryKey is provided internally
  const { data: vehicles } = useListVehicles({ query: { refetchInterval: 5000 } });
  const myVehicles = vehicles?.filter(v => (v as any).assignedDriverId === user?.id || v.id === user?.vehicleId) || [];

  const [reportOpen, setReportOpen] = useState(false);
  const [reportVehicleId, setReportVehicleId] = useState<number | null>(null);
  const [mileageVal, setMileageVal] = useState("");
  const [avariaNotes, setAvariaNotes] = useState("");

  const reportMutation = useMutation({
    mutationFn: async ({ id, status, mileage }: { id: number; status: string; mileage?: number }) => {
      const res = await fetch(`/api/vehicles/${id}/driver-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, mileage })
      });
      if (!res.ok) throw new Error("Erro ao atualizar estado da viatura");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setReportOpen(false);
      setMileageVal("");
      setAvariaNotes("");
      toast({ title: "Estado atualizado", description: "Viatura reportada com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao reportar", description: err.message, variant: "destructive" });
    }
  });

  const handleReport = (vehicleId: number, currentMileage: number) => {
    setReportVehicleId(vehicleId);
    setMileageVal(currentMileage.toString());
    setReportOpen(true);
  };

  const submitReport = () => {
    if (!reportVehicleId) return;
    reportMutation.mutate({
      id: reportVehicleId,
      status: "needs_maintenance",
      mileage: mileageVal ? Number(mileageVal) : undefined
    });
  };

  const resolveMaintenance = (vehicleId: number) => {
    if (confirm("Confirmar que a viatura está ativa e operacional?")) {
      reportMutation.mutate({
        id: vehicleId,
        status: "active"
      });
    }
  };

  if (myVehicles.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Truck className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-display font-bold text-foreground">Nenhuma viatura atribuída</h2>
        <p>Contacte o administrador para ser atribuído a uma viatura.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">As Minhas Viaturas</h1>
      
      {myVehicles.map(vehicle => (
        <Card key={vehicle.id} className="bg-card border-border overflow-hidden relative shadow-lg">
          <div className="absolute right-0 top-0 opacity-5 w-48 h-48 -mr-10 -mt-10">
            <Truck className="w-full h-full" />
          </div>
          <CardContent className="p-8 relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold font-mono tracking-wider">{vehicle.plate}</h2>
                <p className="text-muted-foreground text-lg">{vehicle.brand} {vehicle.model}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" /> <span className="text-sm">Ano</span>
                </div>
                <p className="text-lg font-semibold">{vehicle.year}</p>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Navigation className="w-4 h-4" /> <span className="text-sm">Quilometragem</span>
                </div>
                <p className="text-lg font-semibold font-mono">{formatNumber(vehicle.mileage, 0)} km</p>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplet className="w-4 h-4" /> <span className="text-sm">Combustível</span>
                </div>
                <p className="text-lg font-semibold capitalize">{vehicle.fuelType}</p>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Settings className="w-4 h-4" /> <span className="text-sm">Estado</span>
                </div>
                <p className={`text-lg font-semibold capitalize flex items-center gap-1 ${
                  (vehicle.status as any) === 'active' ? 'text-emerald-500' : 
                  (vehicle.status as any) === 'needs_maintenance' ? 'text-amber-500 font-bold' : 
                  (vehicle.status as any) === 'maintenance' ? 'text-blue-500 font-bold animate-pulse' : 'text-muted-foreground'
                }`}>
                  {(vehicle.status as any) === 'active' && <><CheckCircle className="w-4 h-4" /> Ativo</>}
                  {(vehicle.status as any) === 'needs_maintenance' && <><AlertTriangle className="w-4 h-4" /> Avaria Reportada</>}
                  {(vehicle.status as any) === 'maintenance' && <><Settings className="w-4 h-4 animate-spin" /> Em Manutenção</>}
                  {(vehicle.status as any) === 'inactive' && 'Inativo'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex flex-wrap gap-3">
              {(vehicle.status as any) === 'active' ? (
                <Button 
                  variant="destructive" 
                  className="w-full sm:w-auto shadow-md"
                  onClick={() => handleReport(vehicle.id, vehicle.mileage)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" /> Reportar Avaria / Precisa de Manutenção
                </Button>
              ) : (vehicle.status as any) === 'needs_maintenance' ? (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-sm text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Esta viatura foi sinalizada como necessitando de manutenção. O administrador já pode visualizar o alerta.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto mt-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => resolveMaintenance(vehicle.id)}
                  >
                    Marcar como Resolvido / Operacional
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-blue-500 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 w-full">
                  A viatura encontra-se em manutenção nas oficinasnexus. Aguarde a conclusão da revisão.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar Avaria na Viatura</DialogTitle>
            <DialogDescription>
              Insira a quilometragem atual e descreva brevemente a avaria para dar início à manutenção.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Quilometragem Atual (km)</label>
              <Input 
                type="number" 
                value={mileageVal} 
                onChange={(e) => setMileageVal(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Descrição da Avaria / Sintomas</label>
              <Textarea 
                placeholder="Ex: Barulho na suspensão, travões desgastados, luz de motor acesa..." 
                value={avariaNotes}
                onChange={(e) => setAvariaNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setReportOpen(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={submitReport}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A submeter...</>
                ) : (
                  "Confirmar Alerta de Manutenção"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
