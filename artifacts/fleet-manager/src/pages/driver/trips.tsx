import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useListTrips, useUpdateTrip, Trip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MapPin, Navigation, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function DriverTrips() {
  const { user } = useAuth();
  const { data: trips } = useListTrips();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useUpdateTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        toast({ title: "Trip status updated" });
      }
    }
  });

  const myTrips = trips?.filter(t => t.driverId === user?.id).sort((a,b) => {
    // Sort: Active first, then pending, then completed
    const order: Record<string, number> = { "in_progress": 0, "pending": 1, "completed": 2, "cancelled": 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  }) || [];

  const handleStatusChange = (trip: Trip, newStatus: any) => {
    updateMutation.mutate({ 
      id: trip.id, 
      data: { 
        status: newStatus,
        actualStart: newStatus === "in_progress" && !trip.actualStart ? new Date().toISOString() : trip.actualStart,
        actualEnd: newStatus === "completed" ? new Date().toISOString() : trip.actualEnd
      } 
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">My Trips</h1>

      <div className="space-y-4">
        {myTrips.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Navigation className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>You have no assigned trips.</p>
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
                    {trip.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="relative pl-4 border-l-2 border-muted space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />
                    <p className="text-xs text-muted-foreground uppercase">Origin</p>
                    <p className="font-medium">{trip.origin}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    <p className="text-xs text-muted-foreground uppercase">Destination</p>
                    <p className="font-medium">{trip.destination}</p>
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted-foreground flex gap-4">
                  <div><span className="font-medium text-foreground">Scheduled:</span> {format(new Date(trip.scheduledStart), "MMM d, HH:mm")}</div>
                  {trip.vehiclePlate && <div><span className="font-medium text-foreground">Vehicle:</span> {trip.vehiclePlate}</div>}
                </div>
              </CardContent>
              
              {(isPending || isActive) && (
                <CardFooter className="bg-muted/20 p-4 flex gap-3">
                  {isPending && (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                      onClick={() => handleStatusChange(trip, "in_progress")}
                      disabled={updateMutation.isPending}
                    >
                      <Navigation className="w-4 h-4 mr-2" /> Start Trip
                    </Button>
                  )}
                  {isActive && (
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={() => handleStatusChange(trip, "completed")}
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
