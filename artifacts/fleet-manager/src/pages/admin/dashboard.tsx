import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Map, AlertCircle, TrendingUp, Users, Droplets, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Viaturas", value: stats?.totalVehicles || 0, icon: Truck, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Viaturas Ativas", value: stats?.activeVehicles || 0, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Em Manutenção", value: stats?.vehiclesInMaintenance || 0, icon: Wrench, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Total Motoristas", value: stats?.totalDrivers || 0, icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    
    { title: "Viagens Ativas", value: stats?.activeTrips || 0, icon: Map, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Viagens Pendentes", value: stats?.pendingTrips || 0, icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Stock Reduzido", value: stats?.lowStockItems || 0, icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Custo Combustível (Mês)", value: `${stats?.totalFuelCostThisMonth?.toLocaleString() || 0} Kz`, icon: Droplets, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Live Angola Map Hero */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 bg-card border border-border shadow-xl z-0">
        <MapContainer 
          center={[-8.8368, 13.2343]} 
          zoom={6} 
          style={{ height: "100%", width: "100%", filter: "grayscale(0.5) contrast(1.2) brightness(0.8)" }}
          scrollWheelZoom={false}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution="&copy; OpenStreetMap"
          />
          <Marker position={[-8.8368, 13.2343]}>
            <Popup>Centro de Operações - Luanda</Popup>
          </Marker>
          <Marker position={[-12.5763, 13.4055]}>
            <Popup>Benguela Hub</Popup>
          </Marker>
          <Marker position={[-14.9172, 13.4925]}>
            <Popup>Lubango Logistics</Popup>
          </Marker>
        </MapContainer>
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-6 left-8 z-10 pointer-events-none">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 drop-shadow-lg">Operações Angola</h1>
          <p className="text-white/80 max-w-xl font-medium drop-shadow">Monitorização em tempo real da rede logística nacional.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-xl font-display font-bold mb-4">Métricas Principais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-border/50 hover:border-border transition-colors shadow-none hover:shadow-lg bg-card/50 backdrop-blur">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
