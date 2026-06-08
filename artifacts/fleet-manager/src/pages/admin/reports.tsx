import React, { useState } from "react";
import { useGetFuelingsReport, useGetMaintenanceReport, useListVehicles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Droplets, Wrench } from "lucide-react";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area } from "recharts";

function printReport(title: string, content: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
      h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1e40af; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
      td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      tr:nth-child(even) { background: #f9fafb; }
      .summary { display: flex; gap: 24px; margin: 16px 0; }
      .stat { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; }
      .stat-value { font-size: 20px; font-weight: bold; color: #1e40af; }
      .stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
      @media print { button { display: none; } }
    </style></head>
    <body>${content}<br/><button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function AdminReports() {
  const { data: vehicles } = useListVehicles();
  
  // Get vehicleId from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const urlVehicleId = searchParams.get("vehicleId") || "";

  const [fuelFilters, setFuelFilters] = useState({ 
    startDate: "", 
    endDate: "", 
    vehicleId: urlVehicleId 
  });
  const [maintFilters, setMaintFilters] = useState({ 
    startDate: "", 
    endDate: "", 
    vehicleId: urlVehicleId 
  });

  const fuelQuery = useGetFuelingsReport({ 
    startDate: fuelFilters.startDate || undefined, 
    endDate: fuelFilters.endDate || undefined, 
    vehicleId: fuelFilters.vehicleId ? Number(fuelFilters.vehicleId) : undefined 
  });
  const fuelData = fuelQuery.data as any;
  const maintQuery = useGetMaintenanceReport({ 
    startDate: maintFilters.startDate || undefined, 
    endDate: maintFilters.endDate || undefined, 
    vehicleId: maintFilters.vehicleId ? Number(maintFilters.vehicleId) : undefined 
  });
  const fuelStats = React.useMemo(() => {
    if (!fuelData) return { gasolineCount: 0, dieselCount: 0 };
    let gasolineCount = 0;
    let dieselCount = 0;
    fuelData.records.forEach((r: any) => {
      const fuelType = (r.vehicleFuelType || "diesel").toLowerCase();
      const isGasoline = fuelType === "gasoline" || fuelType === "petrol" || fuelType === "gasolina";
      if (isGasoline) gasolineCount++;
      else dieselCount++;
    });
    return { gasolineCount, dieselCount };
  }, [fuelData]);

  const maintenanceHistoryData = React.useMemo(() => {
    if (!maintQuery.data || !maintQuery.data.records) return [];
    const groups: Record<string, { monthKey: string; cost: number; rawDate: Date }> = {};
    maintQuery.data.records.forEach((r: any) => {
      if (!r.date) return;
      const date = new Date(r.date);
      const yearMonth = format(date, "yyyy-MM");
      const label = format(date, "MM/yyyy");
      if (!groups[yearMonth]) {
        groups[yearMonth] = {
          monthKey: label,
          cost: 0,
          rawDate: new Date(date.getFullYear(), date.getMonth(), 1)
        };
      }
      groups[yearMonth].cost += r.cost || 0;
    });
    return Object.values(groups)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .map(g => ({ month: g.monthKey, cost: g.cost }));
  }, [maintQuery.data]);

  const topVehiclesGeral = React.useMemo(() => {
    if (!fuelData?.byVehicle) return [];
    return [...fuelData.byVehicle]
      .sort((a: any, b: any) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [fuelData?.byVehicle]);

  const topVehiclesGasolina = React.useMemo(() => {
    if (!fuelData?.byVehicle) return [];
    return [...fuelData.byVehicle]
      .filter((v: any) => (v.gasolineCost ?? 0) > 0)
      .sort((a: any, b: any) => b.gasolineCost - a.gasolineCost)
      .slice(0, 5);
  }, [fuelData?.byVehicle]);

  const topVehiclesGasoleo = React.useMemo(() => {
    if (!fuelData?.byVehicle) return [];
    return [...fuelData.byVehicle]
      .filter((v: any) => (v.dieselCost ?? 0) > 0)
      .sort((a: any, b: any) => b.dieselCost - a.dieselCost)
      .slice(0, 5);
  }, [fuelData?.byVehicle]);

  function exportFueling() {
    if (!fuelQuery.data) return;
    const d = fuelQuery.data as any;
    const rows = d.records.map((r: any) => `<tr><td>${r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</td><td>${r.vehiclePlate || r.vehicleId}</td><td>${r.driverName || "-"}</td><td>${r.vehicleFuelType === "gasoline" || r.vehicleFuelType === "petrol" || r.vehicleFuelType === "gasolina" ? "Gasolina" : "Gasóleo"}</td><td>${formatNumber(r.liters, 1)} L</td><td>${formatNumber(r.pricePerLiter, 3)} Kz</td><td>${formatNumber(r.totalCost, 2)} Kz</td><td>${formatNumber(r.mileage, 0)} km</td><td>${r.station || "-"}</td></tr>`).join("");
    printReport("Relatório de Abastecimentos", `
      <h1>Relatório de Abastecimentos</h1>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="summary">
        <div class="stat"><div class="stat-value">${formatNumber(d.totalCost, 2)} Kz</div><div class="stat-label">Custo Total</div></div>
        <div class="stat"><div class="stat-value">${formatNumber(d.totalLiters, 1)} L</div><div class="stat-label">Total Litros</div></div>
        <div class="stat"><div class="stat-value">${formatNumber(d.totalGasolineCost ?? 0, 2)} Kz</div><div class="stat-label">Custo Gasolina</div></div>
        <div class="stat"><div class="stat-value">${formatNumber(d.totalDieselCost ?? 0, 2)} Kz</div><div class="stat-label">Custo Gasóleo</div></div>
        <div class="stat"><div class="stat-value">${d.records.length}</div><div class="stat-label">Nº Abastecimentos</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Viatura</th><th>Motorista</th><th>Tipo Combustível</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Km</th><th>Posto</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  function exportMaintenance() {
    if (!maintQuery.data) return;
    const d = maintQuery.data;
    const rows = d.records.map(r => `<tr><td>${r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</td><td>${r.vehiclePlate || r.vehicleId}</td><td>${r.type}</td><td>${r.description}</td><td>${r.status === "completed" ? "Concluído" : r.status === "in_progress" ? "Em Curso" : "Agendado"}</td><td>${r.cost ? `${formatNumber(r.cost, 2)} Kz` : "-"}</td><td>${r.supplierName || "-"}</td></tr>`).join("");
    printReport("Relatório de Manutenção", `
      <h1>Relatório de Manutenção</h1>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="summary">
        <div class="stat"><div class="stat-value">${formatNumber(d.totalCost, 2)} Kz</div><div class="stat-label">Custo Total</div></div>
        <div class="stat"><div class="stat-value">${d.records.length}</div><div class="stat-label">Nº Registos</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Viatura</th><th>Tipo</th><th>Descrição</th><th>Estado</th><th>Custo</th><th>Fornecedor</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl"><FileText className="w-6 h-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Relatórios</h1><p className="text-sm text-muted-foreground">Filtros e exportação PDF</p></div>
      </div>

      <Tabs defaultValue="fuelings">
        <TabsList>
          <TabsTrigger value="fuelings" className="gap-2"><Droplets className="w-4 h-4" />Abastecimentos</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Wrench className="w-4 h-4" />Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="fuelings" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Data Início</label><Input type="date" value={fuelFilters.startDate} onChange={e => setFuelFilters(f => ({ ...f, startDate: e.target.value }))} className="w-40" /></div>
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Data Fim</label><Input type="date" value={fuelFilters.endDate} onChange={e => setFuelFilters(f => ({ ...f, endDate: e.target.value }))} className="w-40" /></div>
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Viatura</label>
                  <Select value={fuelFilters.vehicleId || "all"} onValueChange={v => setFuelFilters(f => ({ ...f, vehicleId: v === "all" ? "" : v }))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todas</SelectItem>{vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={exportFueling} disabled={!fuelQuery.data}><Download className="w-4 h-4 mr-2" />Exportar PDF</Button>
              </div>
            </CardContent>
          </Card>

          {fuelData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Custo Total", value: `${formatNumber(fuelData.totalCost, 0)} Kz` },
                      { label: "Total Litros", value: `${formatNumber(fuelData.totalLiters, 1)} L` },
                      { label: "Total Gasolina", value: `${formatNumber(fuelData.totalGasolineCost ?? 0, 0)} Kz (${formatNumber(fuelData.totalGasolineLiters ?? 0, 1)} L)` },
                      { label: "Total Gasóleo", value: `${formatNumber(fuelData.totalDieselCost ?? 0, 0)} Kz (${formatNumber(fuelData.totalDieselLiters ?? 0, 1)} L)` },
                      { label: "Preço Médio/L", value: `${formatNumber(fuelData.averagePricePerLiter, 2)} Kz` },
                      { label: "Nº Registos", value: fuelData.records.length },
                    ].map((s, i) => (
                      <Card key={i} className="bg-card border-border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">{s.label}</p><p className="text-sm font-bold mt-1 text-primary truncate">{s.value}</p></CardContent></Card>
                    ))}
                  </div>

                  {((fuelData.totalGasolineCost ?? 0) > 0 || (fuelData.totalDieselCost ?? 0) > 0) && (
                    <Card className="bg-card border-border shadow-sm">
                      <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Distribuição por Combustível</CardTitle></CardHeader>
                      <CardContent className="h-[120px] flex items-center justify-between p-4 pt-0">
                        <ResponsiveContainer width="45%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Gasolina", value: fuelData.totalGasolineCost ?? 0, color: "#eab308" },
                                { name: "Gasóleo", value: fuelData.totalDieselCost ?? 0, color: "#3b82f6" }
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {[
                                { name: "Gasolina", value: fuelData.totalGasolineCost ?? 0, color: "#eab308" },
                                { name: "Gasóleo", value: fuelData.totalDieselCost ?? 0, color: "#3b82f6" }
                              ].filter(d => d.value > 0).map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-1 w-[55%] justify-center">
                          {[
                            { name: "Gasolina", value: fuelData.totalGasolineCost ?? 0, count: fuelStats.gasolineCount, color: "#eab308" },
                            { name: "Gasóleo", value: fuelData.totalDieselCost ?? 0, count: fuelStats.dieselCount, color: "#3b82f6" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5 text-[10px] w-full border-b border-border/30 pb-1 last:border-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="flex-1 font-medium">{item.name}</span>
                                <span className="font-mono font-bold text-primary">{formatNumber(item.value, 0)} Kz</span>
                              </div>
                              <div className="pl-4 text-[9px] text-muted-foreground">
                                {item.count} registos
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {fuelFilters.vehicleId && (
                    <Card className="bg-primary/5 border-primary/20 shadow-sm">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-primary">Resumo Individual</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Viatura: <span className="font-bold text-foreground">{vehicles?.find(v => v.id === Number(fuelFilters.vehicleId))?.plate}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Eficiência média e custos calculados para o período selecionado.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {/* Top 5 Geral */}
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Custo de Abastecimento por Viatura (Top 5 Geral)</CardTitle></CardHeader>
                    <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topVehiclesGeral}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="vehiclePlate" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(v: any, name: any) => [`${formatNumber(v, 0)} Kz`, name === 'gasolineCost' ? 'Gasolina' : name === 'dieselCost' ? 'Gasóleo' : name]}
                          />
                          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="gasolineCost" name="Gasolina" stackId="a" fill="#eab308" />
                          <Bar dataKey="dieselCost" name="Gasóleo (Diesel)" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top 5 Gasolina & Top 5 Gasóleo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card border-border shadow-sm">
                      <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold text-[#eab308]">Top 5 - Gasolina</CardTitle></CardHeader>
                      <CardContent className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topVehiclesGasolina}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="vehiclePlate" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              formatter={(v: any) => [`${formatNumber(v, 0)} Kz`, 'Gasolina']}
                            />
                            <Bar dataKey="gasolineCost" fill="#eab308" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm">
                      <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold text-[#3b82f6]">Top 5 - Gasóleo</CardTitle></CardHeader>
                      <CardContent className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topVehiclesGasoleo}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="vehiclePlate" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              formatter={(v: any) => [`${formatNumber(v, 0)} Kz`, 'Gasóleo']}
                            />
                            <Bar dataKey="dieselCost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Data</TableHead><TableHead>Viatura</TableHead><TableHead>Motorista</TableHead><TableHead>Litros</TableHead><TableHead>Preço/L</TableHead><TableHead>Total</TableHead><TableHead>Km</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fuelData.records.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell><Badge variant="outline">{r.vehiclePlate || r.vehicleId}</Badge></TableCell>
                        <TableCell>{r.driverName || "-"}</TableCell>
                        <TableCell className="font-mono">{formatNumber(r.liters, 1)} L</TableCell>
                        <TableCell className="font-mono">{formatNumber(r.pricePerLiter, 2)} Kz</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{formatNumber(r.totalCost, 0)} Kz</TableCell>
                        <TableCell className="font-mono">{formatNumber(r.mileage, 0)} km</TableCell>
                      </TableRow>
                    ))}
                    {fuelData.records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum abastecimento encontrado no período</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Data Início</label><Input type="date" value={maintFilters.startDate} onChange={e => setMaintFilters(f => ({ ...f, startDate: e.target.value }))} className="w-40" /></div>
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Data Fim</label><Input type="date" value={maintFilters.endDate} onChange={e => setMaintFilters(f => ({ ...f, endDate: e.target.value }))} className="w-40" /></div>
                <div className="flex flex-col gap-1"><label className="text-sm text-muted-foreground">Viatura</label>
                  <Select value={maintFilters.vehicleId || "all"} onValueChange={v => setMaintFilters(f => ({ ...f, vehicleId: v === "all" ? "" : v }))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todas</SelectItem>{vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={exportMaintenance} disabled={!maintQuery.data}><Download className="w-4 h-4 mr-2" />Exportar PDF</Button>
              </div>
            </CardContent>
          </Card>

          {maintQuery.data && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Custo Total", value: `${formatNumber(maintQuery.data.totalCost, 2)} Kz` },
                      { label: "Nº Registos", value: maintQuery.data.records.length },
                    ].map((s, i) => (
                      <Card key={i} className="bg-card border-border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase font-semibold">{s.label}</p><p className="text-lg font-bold mt-1 text-primary">{s.value}</p></CardContent></Card>
                    ))}
                  </div>

                  {maintFilters.vehicleId && (
                    <Card className="bg-primary/5 border-primary/20 shadow-sm">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-primary">Resumo Individual</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Viatura: <span className="font-bold text-foreground">{vehicles?.find(v => v.id === Number(maintFilters.vehicleId))?.plate}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Histórico de intervenções e custos de manutenção.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="lg:col-span-2 bg-card border-border shadow-sm">
                  <CardHeader><CardTitle className="text-sm font-semibold">Gráfico de Histórico de Custos de Manutenção</CardTitle></CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={maintenanceHistoryData}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(v: any) => [`${formatNumber(v, 0)} Kz`, 'Custo']}
                        />
                        <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCost)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Data</TableHead><TableHead>Viatura</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Estado</TableHead><TableHead>Custo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {maintQuery.data.records.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell><Badge variant="outline">{r.vehiclePlate || r.vehicleId}</Badge></TableCell>
                        <TableCell>{r.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'completed' ? 'default' : r.status === 'in_progress' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                            {r.status === "completed" ? "Concluído" : r.status === "in_progress" ? "Em Curso" : "Agendado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">{r.cost ? `${formatNumber(r.cost, 0)} Kz` : "-"}</TableCell>
                      </TableRow>
                    ))}
                    {maintQuery.data.records.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma manutenção encontrada no período</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
