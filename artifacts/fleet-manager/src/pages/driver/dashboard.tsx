import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useListTrips, useListVehicles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, ChevronRight, TrendingUp, Navigation } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/utils";

export default function DriverDashboard() {
  const { user } = useAuth();
  // @ts-expect-error queryKey is provided internally
  const { data: vehicles } = useListVehicles({ query: { refetchInterval: 5000 } });
  // @ts-expect-error queryKey is provided internally
  const { data: trips } = useListTrips({ query: { refetchInterval: 5000 } });
  
  const myVehicles = vehicles?.filter(v => (v as any).assignedDriverId === user?.id || v.id === user?.vehicleId) || [];
  const myTrips = trips?.filter(t => t.driverId === user?.id) || [];
  
  const activeTrip = myTrips.find(t => t.status === "in_progress");
  const upcomingTrips = myTrips.filter(t => t.status === "pending").sort((a,b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  // Generate chart data for recently completed trips
  const completedTrips = myTrips
    .filter(t => t.status === "completed")
    .sort((a, b) => new Date(b.actualEnd || "").getTime() - new Date(a.actualEnd || "").getTime())
    .slice(0, 6)
    .reverse();

  const chartData = completedTrips.map(t => {
    const distance = t.distance || (t.endMileage && t.startMileage ? t.endMileage - t.startMileage : 0);
    return {
      name: t.title.length > 12 ? t.title.substring(0, 12) + "..." : t.title,
      "Distância (km)": Number(distance) || 0
    };
  });

  const totalKmRun = myTrips
    .filter(t => t.status === "completed")
    .reduce((acc, t) => acc + (Number(t.distance) || (t.endMileage && t.startMileage ? t.endMileage - t.startMileage : 0)), 0);

  return (
    <div className="space-y-6">
      {/* Current Vehicles */}
      <div>
        <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
          Minhas Viaturas
          <Badge variant="outline" className="ml-auto">{myVehicles.length}</Badge>
        </h2>
        
        {myVehicles.length > 0 ? (
          <div className="grid gap-4">
            {myVehicles.map(vehicle => (
              <Card key={vehicle.id} className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 overflow-hidden relative">
                <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-display font-bold font-mono text-foreground">{vehicle.plate}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                    </div>
                    <Badge variant={
                      (vehicle.status as any) === 'active' ? 'secondary' : 
                      (vehicle.status as any) === 'needs_maintenance' ? 'destructive' : 'outline'
                    } className="ml-auto capitalize">
                      {(vehicle.status as any) === 'active' ? 'Ativa' : 
                       (vehicle.status as any) === 'needs_maintenance' ? 'Avaria Reportada' : 'Manutenção'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/10">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma viatura atribuída de momento.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Trip */}
      {activeTrip && (
        <div>
          <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Viagem em Curso
          </h2>
          <Link href="/driver/trips">
            <Card className="border-emerald-500/30 hover:border-emerald-500/50 transition-colors cursor-pointer bg-card/80 backdrop-blur">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{activeTrip.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-emerald-500" /> {activeTrip.origin}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {activeTrip.destination}</span>
                  </div>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl">
                  <ChevronRight className="w-6 h-6 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Performance Summary & Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-primary/10 to-card border-border flex flex-col justify-center p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Navigation className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Quilómetros Totais</p>
          </div>
          <h3 className="text-3xl font-display font-bold font-mono text-primary">{formatNumber(totalKmRun, 0)} km</h3>
          <p className="text-xs text-muted-foreground mt-1">Percorridos após a conclusão de todas as viagens atribuídas.</p>
        </Card>

        <Card className="md:col-span-2 bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              km Percorridos por Viagem Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px] p-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="Distância (km)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem histórico de viagens completadas.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Trips */}
      <div>
        <h2 className="text-lg font-display font-bold mb-3">Agendamentos</h2>
        <div className="space-y-3">
          {upcomingTrips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Não tem viagens agendadas.</p>
          ) : (
            upcomingTrips.slice(0, 3).map(trip => (
              <Card key={trip.id} className="bg-card">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{trip.title}</h4>
                    <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">Pendente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(trip.scheduledStart), "MMM d")}</div>
                    <div className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5" /> {trip.destination}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
