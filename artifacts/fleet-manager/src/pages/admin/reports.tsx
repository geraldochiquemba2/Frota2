import React, { useState } from "react";
import { useGetFuelingsReport, useGetMaintenanceReport, useListVehicles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Droplets, Wrench } from "lucide-react";
import { format } from "date-fns";

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
  const [fuelFilters, setFuelFilters] = useState({ startDate: "", endDate: "", vehicleId: "" });
  const [maintFilters, setMaintFilters] = useState({ startDate: "", endDate: "", vehicleId: "" });

  const fuelQuery = useGetFuelingsReport({ startDate: fuelFilters.startDate || undefined, endDate: fuelFilters.endDate || undefined, vehicleId: fuelFilters.vehicleId ? Number(fuelFilters.vehicleId) : undefined });
  const maintQuery = useGetMaintenanceReport({ startDate: maintFilters.startDate || undefined, endDate: maintFilters.endDate || undefined, vehicleId: maintFilters.vehicleId ? Number(maintFilters.vehicleId) : undefined });

  function exportFueling() {
    if (!fuelQuery.data) return;
    const d = fuelQuery.data;
    const rows = d.records.map(r => `<tr><td>${r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</td><td>${r.vehiclePlate || r.vehicleId}</td><td>${r.driverName || "-"}</td><td>${r.liters.toFixed(1)} L</td><td>${r.pricePerLiter.toFixed(3)} €</td><td>${r.totalCost.toFixed(2)} €</td><td>${r.mileage.toLocaleString()} km</td><td>${r.station || "-"}</td></tr>`).join("");
    printReport("Relatório de Abastecimentos", `
      <h1>Relatório de Abastecimentos</h1>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="summary">
        <div class="stat"><div class="stat-value">${d.totalLiters.toFixed(1)} L</div><div class="stat-label">Total Litros</div></div>
        <div class="stat"><div class="stat-value">${d.totalCost.toFixed(2)} €</div><div class="stat-label">Custo Total</div></div>
        <div class="stat"><div class="stat-value">${d.averagePricePerLiter.toFixed(3)} €</div><div class="stat-label">Preço Médio/L</div></div>
        <div class="stat"><div class="stat-value">${d.records.length}</div><div class="stat-label">Nº Abastecimentos</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Viatura</th><th>Motorista</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Km</th><th>Posto</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  function exportMaintenance() {
    if (!maintQuery.data) return;
    const d = maintQuery.data;
    const rows = d.records.map(r => `<tr><td>${r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</td><td>${r.vehiclePlate || r.vehicleId}</td><td>${r.type}</td><td>${r.description}</td><td>${r.status === "completed" ? "Concluído" : r.status === "in_progress" ? "Em Curso" : "Agendado"}</td><td>${r.cost ? `${r.cost.toFixed(2)} €` : "-"}</td><td>${r.supplierName || "-"}</td></tr>`).join("");
    printReport("Relatório de Manutenção", `
      <h1>Relatório de Manutenção</h1>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="summary">
        <div class="stat"><div class="stat-value">${d.totalCost.toFixed(2)} €</div><div class="stat-label">Custo Total</div></div>
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

          {fuelQuery.data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Litros", value: `${fuelQuery.data.totalLiters.toFixed(1)} L` },
                  { label: "Custo Total", value: `${fuelQuery.data.totalCost.toFixed(2)} €` },
                  { label: "Preço Médio/L", value: `${fuelQuery.data.averagePricePerLiter.toFixed(3)} €` },
                  { label: "Nº Abastecimentos", value: fuelQuery.data.records.length },
                ].map((s, i) => (
                  <Card key={i} className="bg-card border-border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
                ))}
              </div>
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30"><TableHead>Data</TableHead><TableHead>Viatura</TableHead><TableHead>Motorista</TableHead><TableHead>Litros</TableHead><TableHead>Preço/L</TableHead><TableHead>Total</TableHead><TableHead>Km</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fuelQuery.data.records.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell>{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{r.vehiclePlate || r.vehicleId}</TableCell>
                        <TableCell>{r.driverName || "-"}</TableCell>
                        <TableCell>{r.liters.toFixed(1)} L</TableCell>
                        <TableCell>{r.pricePerLiter.toFixed(3)} €</TableCell>
                        <TableCell>{r.totalCost.toFixed(2)} €</TableCell>
                        <TableCell>{r.mileage.toLocaleString()} km</TableCell>
                      </TableRow>
                    ))}
                    {fuelQuery.data.records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registo encontrado</TableCell></TableRow>}
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
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Custo Total", value: `${maintQuery.data.totalCost.toFixed(2)} €` },
                  { label: "Nº Registos", value: maintQuery.data.records.length },
                ].map((s, i) => (
                  <Card key={i} className="bg-card border-border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
                ))}
              </div>
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30"><TableHead>Data</TableHead><TableHead>Viatura</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Estado</TableHead><TableHead>Custo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {maintQuery.data.records.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell>{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{r.vehiclePlate || r.vehicleId}</TableCell>
                        <TableCell>{r.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                        <TableCell>{r.status === "completed" ? "Concluído" : r.status === "in_progress" ? "Em Curso" : "Agendado"}</TableCell>
                        <TableCell>{r.cost ? `${r.cost.toFixed(2)} €` : "-"}</TableCell>
                      </TableRow>
                    ))}
                    {maintQuery.data.records.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registo encontrado</TableCell></TableRow>}
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
