import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, Upload, Download, Filter, Car, User } from "lucide-react";
import { format } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Número da fatura é obrigatório"),
  type: z.enum(["fueling", "maintenance"]),
  amount: z.coerce.number().min(0.01, "Montante inválido"),
  date: z.string().min(1, "Data é obrigatória"),
  referenceId: z.coerce.number().optional().nullable(),
  supplierId: z.coerce.number().optional().nullable(),
  vehicleId: z.coerce.number().optional().nullable(),
  driverId: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof invoiceSchema>;

export default function AdminInvoices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filters State
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Erro ao carregar faturas");
      return res.json();
    }
  });

  const { data: vehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { 
      invoiceNumber: "", 
      type: "fueling", 
      amount: 0, 
      date: new Date().toISOString().split('T')[0],
      vehicleId: null,
      driverId: null
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erro ao criar fatura");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      setSelectedFile(null);
      toast({ title: "Fatura submetida com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao eliminar fatura");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Fatura eliminada" });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    let documentUrl = null;
    
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadRes.ok) throw new Error("Erro no upload do ficheiro");
        
        const uploadData = await uploadRes.json();
        documentUrl = uploadData.url;
      } catch (err: any) {
        setIsUploading(false);
        toast({ title: "Erro de Upload", description: err.message, variant: "destructive" });
        return;
      }
      setIsUploading(false);
    }
    
    createMutation.mutate({ ...values, documentUrl });
  };

  const filteredInvoices = invoices?.filter((inv: any) => {
    const matchVehicle = vehicleFilter === "all" || inv.vehicleId === Number(vehicleFilter);
    const matchDriver = driverFilter === "all" || inv.driverId === Number(driverFilter);
    return matchVehicle && matchDriver;
  }) || [];

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Faturas</h1>
          <p className="text-muted-foreground">Gestão de faturas de abastecimento e manutenção de toda a frota</p>
        </div>
        <Button onClick={() => { form.reset(); setSelectedFile(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Fatura
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
          <Filter className="w-4 h-4" /> Filtros Rápidos:
        </div>
        
        <div className="w-48">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as viaturas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as viaturas</SelectItem>
              {vehicles?.map(v => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os motoristas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motoristas</SelectItem>
              {users?.filter(u => u.role === "driver").map(u => (
                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(vehicleFilter !== "all" || driverFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setVehicleFilter("all"); setDriverFilter("all"); }} className="text-destructive">
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Viatura</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Montante</TableHead>
              <TableHead className="text-center">Documento</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma fatura encontrada.
                </TableCell>
              </TableRow>
            )}
            {filteredInvoices.map((inv: any) => {
              const matchedVehicle = vehicles?.find(v => v.id === inv.vehicleId);
              const matchedDriver = users?.find(u => u.id === inv.driverId);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="text-muted-foreground text-sm">{inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell className="font-medium font-mono">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    {matchedVehicle ? (
                      <span className="font-semibold font-mono text-sm bg-muted px-2 py-0.5 rounded border border-border">
                        {matchedVehicle.plate}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {matchedDriver ? matchedDriver.name : <span className="text-xs text-muted-foreground">Admin / Sede</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded w-fit capitalize
                      ${inv.type === 'fueling' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {inv.type === 'fueling' ? 'Abastecimento' : 'Manutenção'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    {formatNumber(inv.amount, 2)} Kz
                  </TableCell>
                  <TableCell className="text-center">
                    {inv.documentUrl ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={inv.documentUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" /> Ver Fatura
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem anexo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => confirm("Eliminar fatura?") && deleteMutation.mutate(inv.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader><DialogTitle>Submeter Nova Fatura</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem><FormLabel>Número da Fatura</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viatura</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {vehicles?.map(v => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motorista</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (Sede)</SelectItem>
                        {users?.filter(u => u.role === "driver").map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Despesa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="fueling">Abastecimento</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Montante (Kz)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem>
              )}/>

              <div className="space-y-2">
                <FormLabel>Anexar Documento (PDF/Imagem)</FormLabel>
                <Input type="file" accept=".pdf,image/jpeg,image/png" onChange={handleFileChange} className="cursor-pointer" />
                {selectedFile && <p className="text-xs text-muted-foreground flex items-center mt-1"><FileText className="w-3 h-3 mr-1" /> {selectedFile.name}</p>}
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || isUploading}>
                  {isUploading ? "A carregar anexo..." : (createMutation.isPending ? "A submeter..." : "Submeter Fatura")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
