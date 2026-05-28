import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Upload, Download, Loader2, Receipt } from "lucide-react";
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

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Número da fatura é obrigatório"),
  type: z.enum(["fueling", "maintenance"]),
  amount: z.coerce.number().min(0.01, "Montante inválido"),
  date: z.string().min(1, "Data é obrigatória"),
  vehicleId: z.coerce.number().min(1, "Deve selecionar uma viatura"),
  supplierId: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof invoiceSchema>;

export default function DriverInvoices() {
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

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Erro ao carregar faturas");
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
    resolver: zodResolver(invoiceSchema),
    defaultValues: { 
      invoiceNumber: "", 
      type: "fueling", 
      amount: 0, 
      date: new Date().toISOString().split('T')[0],
      vehicleId: myVehicles.length > 0 ? myVehicles[0].id : undefined,
      supplierId: null
    }
  });

  // Update vehicleId field if vehicles load late
  React.useEffect(() => {
    if (myVehicles.length > 0 && !form.getValues("vehicleId")) {
      form.setValue("vehicleId", myVehicles[0].id);
    }
  }, [myVehicles, form]);

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
      form.reset({
        invoiceNumber: "",
        type: "fueling",
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        vehicleId: myVehicles.length > 0 ? myVehicles[0].id : undefined,
        supplierId: null
      });
      toast({ title: "Fatura submetida com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">As Minhas Faturas</h1>
            <p className="text-muted-foreground text-sm">Submeta faturas de combustível e manutenção</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={myVehicles.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> Submeter Fatura
        </Button>
      </div>

      {myVehicles.length === 0 && (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="p-6 text-center text-muted-foreground">
            Precisa de ter uma viatura atribuída para poder submeter faturas.
          </CardContent>
        </Card>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Montante</TableHead>
                <TableHead className="text-center">Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Ainda não submeteu nenhuma fatura.
                  </TableCell>
                </TableRow>
              )}
              {invoices?.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell className="font-medium font-mono">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded w-fit capitalize 
                      ${inv.type === 'fueling' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {inv.type === 'fueling' ? 'Abastecimento' : 'Manutenção'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    {formatNumber(inv.amount, 2)} Kz
                  </TableCell>
                  <TableCell className="text-center">
                    {inv.documentUrl ? (
                      <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10">
                        <a href={inv.documentUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2 text-primary" /> Descarregar
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem anexo</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card sm:max-w-md border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Submeter Nova Fatura</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Viatura</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))} value={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a viatura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none" disabled>Selecione a viatura</SelectItem>
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
                    <FormLabel>Número da Fatura</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: FT-2026/001" /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Emissão</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>
              
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Despesa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fueling">Abastecimento (Combustível)</SelectItem>
                      <SelectItem value="maintenance">Manutenção (Oficina / Peças)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor (Fornecedores Cadastrados)</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum / Posto Avulso</SelectItem>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.city})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Montante Total (Kz)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} placeholder="0.00" />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Abastecimento total, troca de pastilhas..." />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>

              <div className="space-y-2">
                <FormLabel>Anexar Fatura (PDF / JPG / PNG)</FormLabel>
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
                    <FileText className="w-3.5 h-3.5" /> Ficheiro: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || isUploading}>
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A carregar...</>
                  ) : createMutation.isPending ? (
                    "A submeter..."
                  ) : (
                    "Submeter Fatura"
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
