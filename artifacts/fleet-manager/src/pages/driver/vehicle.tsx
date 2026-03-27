import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useListVehicles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Navigation, Settings, Droplet, Hash } from "lucide-react";

export default function DriverVehicle() {
  const { user } = useAuth();
  const { data: vehicles } = useListVehicles();
  const vehicle = vehicles?.find(v => v.assignedDriverId === user?.id);

  if (!vehicle) {
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
      <h1 className="text-2xl font-display font-bold">A Minha Viatura</h1>
      
      <Card className="bg-card border-primary/20 overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="absolute right-0 top-0 opacity-5 w-64 h-64 -mr-10 -mt-10">
          <Truck className="w-full h-full" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-primary/20 rounded-2xl">
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
              <p className="text-lg font-semibold font-mono">{vehicle.mileage.toLocaleString()} km</p>
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
              <p className="text-lg font-semibold capitalize text-emerald-500">
                {vehicle.status === 'active' ? 'Ativo' : vehicle.status === 'maintenance' ? 'Em Manutenção' : 'Inativo'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline quick icon fallback
function Calendar(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
}
