import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useListTrips, useListVehicles } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { data: trips } = useListTrips();
  const { data: vehicles } = useListVehicles();

  const assignedVehicle = vehicles?.find(v => v.assignedDriverId === user?.id);
  const myTrips = trips?.filter(t => t.driverId === user?.id) || [];
  
  const activeTrip = myTrips.find(t => t.status === "in_progress");
  const upcomingTrips = myTrips.filter(t => t.status === "pending").sort((a,b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  return (
    <div className="space-y-6">
      {/* Current Vehicle Card */}
      {assignedVehicle ? (
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-bl-full" />
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Viatura Atual</h3>
            <div className="flex items-end gap-4 mt-2">
              <div>
                <p className="text-3xl font-display font-bold font-mono text-foreground">{assignedVehicle.plate}</p>
                <p className="text-muted-foreground">{assignedVehicle.brand} {assignedVehicle.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma viatura atribuída de momento.
          </CardContent>
        </Card>
      )}

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
