import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Map, AlertCircle, TrendingUp, Users, Droplets, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden h-48 sm:h-56 bg-card border border-border shadow-xl">
        <img 
          src={`${import.meta.env.BASE_URL}images/dashboard-hero.png`} 
          alt="Dashboard Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">Visão Geral da Frota</h1>
          <p className="text-muted-foreground max-w-xl">Telemetria e métricas operacionais em tempo real de toda a sua rede.</p>
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
