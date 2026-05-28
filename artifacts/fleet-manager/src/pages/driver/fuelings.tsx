import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Droplets, Upload, Download, Loader2, FileText, Receipt, Navigation } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useListVehicles } from "@workspace/api-client-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

const fuelingSchema = z.object({
  vehicleId: z.coerce.number().min(1, "Deve selecionar uma viatura"),
  date: z.string().min(1, "Data é obrigatória"),
  liters: z.coerce.number().min(0.1, "Quantidade inválida de litros"),
  pricePerLiter: z.coerce.number().min(1, "Preço por litro inválido"),
  totalCost: z.coerce.number().min(1, "Custo total inválido"),
  mileage: z.coerce.number().min(0, "Quilometragem inválida"),
  station: z.string().min(1, "Posto de combustível é obrigatório"),
  invoiceNumber: z.string().min(1, "Número da fatura/talão é obrigatório"),
  supplierId: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof fuelingSchema>;

export default function DriverFuelings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vehicles } = useListVehicles();
  const myVehicles = React.useMemo(() => {
    return vehicles?.filter(v => (v as any).assignedDriverId === user?.id || v.id === user?.vehicleId) || [];
  }, [vehicles, user?.id, user?.vehicleId]);

  // Fetch fuelings
  const { data: fuelings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/fuelings"],
    queryFn: async () => {
      const res = await fetch("/api/fuelings");
      if (!res.ok) throw new Error("Erro ao carregar abastecimentos");
      const list = await res.json();
      // Filter fuelings for this driver
      return list.filter((f: any) => f.driverId === user?.id);
    }
  });

  // Fetch invoices to map which fuelings have invoice attachments
  const { data: invoices } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(fuelingSchema),
    defaultValues: { 
      vehicleId: myVehicles.length > 0 ? myVehicles[0].id : undefined,
      date: new Date().toISOString().split('T')[0],
      liters: 0,
      pricePerLiter: 0,
      totalCost: 0,
      mileage: myVehicles.length > 0 ? myVehicles[0].mileage : 0,
      station: "",
      invoiceNumber: "",
      supplierId: null,
      notes: ""
    }
  });

  // Calculate total cost automatically when liters or price changes
  const watchedLiters = form.watch("liters");
  const watchedPrice = form.watch("pricePerLiter");
  React.useEffect(() => {
    const calculated = (Number(watchedLiters) || 0) * (Number(watchedPrice) || 0);
    if (calculated > 0) {
      form.setValue("totalCost", calculated);
    }
  }, [watchedLiters, watchedPrice, form]);

  // Set default vehicle mileage when vehicle selection changes
  const watchedVehicleId = form.watch("vehicleId");
  React.useEffect(() => {
    if (watchedVehicleId) {
      const v = myVehicles.find(item => item.id === Number(watchedVehicleId));
      if (v) {
        form.setValue("mileage", v.mileage);
      }
    }
  }, [watchedVehicleId, myVehicles, form]);

  const submitMutation = useMutation({
    mutationFn: async (payload: { fueling: any; invoice: any; file: File | null }) => {
      let documentUrl = null;

      // 1. Upload File
      if (payload.file) {
        const formData = new FormData();
        formData.append("file", payload.file);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Erro no upload da fatura");
        const uploadData = await uploadRes.json();
        documentUrl = uploadData.url;
      }

      // 2. Create Fueling Record
      const fuelingRes = await fetch("/api/fuelings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload.fueling,
          driverId: user?.id
        })
      });
      if (!fuelingRes.ok) throw new Error("Erro ao registar abastecimento");
      const createdFueling = await fuelingRes.json();

      // 3. Create Invoice Record linked to fueling
      const invoiceRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload.invoice,
          referenceId: createdFueling.id,
          documentUrl,
          vehicleId: payload.fueling.vehicleId,
          driverId: user?.id
        })
      });
      if (!invoiceRes.ok) throw new Error("Abastecimento registado, mas falhou ao associar a fatura.");

      // 4. Update vehicle mileage & status
      await fetch(`/api/vehicles/${payload.fueling.vehicleId}/driver-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mileage: payload.fueling.mileage })
      });

      return createdFueling;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuelings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      setSelectedFile(null);
      form.reset({
        vehicleId: myVehicles.length > 0 ? myVehicles[0].id : undefined,
        date: new Date().toISOString().split('T')[0],
        liters: 0,
        pricePerLiter: 0,
        totalCost: 0,
        mileage: myVehicles.length > 0 ? myVehicles[0].mileage : 0,
        station: "",
        invoiceNumber: "",
        supplierId: null,
        notes: ""
      });
      toast({ title: "Abastecimento e Fatura registados com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao submeter", description: err.message, variant: "destructive" });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onSubmit = (values: FormValues) => {
    const fuelingData = {
      vehicleId: values.vehicleId,
      date: values.date,
      liters: values.liters,
      pricePerLiter: values.pricePerLiter,
      totalCost: values.totalCost,
      mileage: values.mileage,
      station: values.station,
      notes: values.notes
    };

    const invoiceData = {
      invoiceNumber: values.invoiceNumber,
      type: "fueling",
      amount: values.totalCost,
      date: values.date,
      supplierId: values.supplierId,
      notes: `Fatura de abastecimento - Posto: ${values.station}`
    };

    setIsUploading(true);
    submitMutation.mutate({
      fueling: fuelingData,
      invoice: invoiceData,
      file: selectedFile
    }, {
      onSettled: () => setIsUploading(false)
    });
  };

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Abastecimentos</h1>
            <p className="text-muted-foreground text-sm">Registe consumos de combustível e envie os talões</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={myVehicles.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> Registar Abastecimento
        </Button>
      </div>

      {myVehicles.length === 0 && (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="p-6 text-center text-muted-foreground">
            Precisa de ter uma viatura atribuída para registar abastecimentos.
          </CardContent>
        </Card>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Viatura</TableHead>
                <TableHead>Litros</TableHead>
                <TableHead>Preço/L</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead className="text-center">Fatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Ainda não registou nenhum abastecimento.
                  </TableCell>
                </TableRow>
              )}
              {fuelings?.map((fuel: any) => {
                const matchedInvoice = invoices?.find(inv => inv.referenceId === fuel.id && inv.type === "fueling");
                return (
                  <TableRow key={fuel.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="text-muted-foreground text-sm">
                      {fuel.date ? format(new Date(fuel.date), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-semibold font-mono text-sm">
                      {fuel.vehiclePlate || "Viatura #" + fuel.vehicleId}
                    </TableCell>
                    <TableCell className="font-mono">{formatNumber(fuel.liters, 1)} L</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-sm">{formatNumber(fuel.pricePerLiter, 2)} Kz</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      {formatNumber(fuel.totalCost, 2)} Kz
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fuel.station}</TableCell>
                    <TableCell className="text-center">
                      {matchedInvoice?.documentUrl ? (
                        <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10">
                          <a href={matchedInvoice.documentUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2 text-primary" /> Fatura
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem talão</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card sm:max-w-md border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Registar Novo Abastecimento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Viatura</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a viatura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {myVehicles.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.plate} - {v.brand} {v.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº Fatura / Talão *</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: T-2026/08" /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="liters" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litros (L) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="pricePerLiter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por Litro (Kz) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="totalCost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Total (Kz) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="mileage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km Atual da Viatura *</FormLabel>
                    <FormControl><Input type="number" step="1" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor Cadastrado</FormLabel>
                  <Select 
                    onValueChange={(v) => {
                      field.onChange(v === "none" ? null : Number(v));
                      if (v !== "none") {
                        const s = suppliers?.find(item => item.id === Number(v));
                        if (s) {
                          form.setValue("station", `${s.name} (${s.city})`);
                        }
                      }
                    }} 
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Digitar abaixo)</SelectItem>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.city})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="station" render={({ field }) => (
                <FormItem>
                  <FormLabel>Posto / Bomba de Combustível *</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: Sonangol Luanda, Pumangol..." /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Input {...field} placeholder="Opcional..." /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>

              <div className="space-y-2">
                <FormLabel>Anexar Talão / Fatura (PDF / Imagem)</FormLabel>
                <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative">
                  <Input 
                    type="file" 
                    accept=".pdf,image/jpeg,image/png" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground text-center">Clique para selecionar ou arraste o ficheiro</p>
                </div>
                {selectedFile && (
                  <p className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-1">
                    <FileText className="w-3.5 h-3.5" /> Ficheiro selecionado: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitMutation.isPending || isUploading}>
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A carregar talão...</>
                  ) : submitMutation.isPending ? (
                    "A guardar..."
                  ) : (
                    "Registar Abastecimento"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
