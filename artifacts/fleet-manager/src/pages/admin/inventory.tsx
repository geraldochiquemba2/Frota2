import React, { useState } from "react";
import { useListInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, useListInventoryMovements, useCreateInventoryMovement, useListSuppliers, InventoryItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const itemSchema = z.object({
  name: z.string().min(1, "Obrigatório"),
  category: z.string().min(1, "Obrigatório"),
  unit: z.string().min(1, "Obrigatório"),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  unitPrice: z.coerce.number().optional().nullable(),
  supplierId: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const movementSchema = z.object({
  inventoryItemId: z.coerce.number().min(1),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.coerce.number().min(0.01),
  reason: z.string().optional().nullable(),
  date: z.string().min(1),
});

export default function AdminInventory() {
  const { data: items, isLoading } = useListInventory();
  const { data: movements } = useListInventoryMovements();
  const { data: suppliers } = useListSuppliers();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const createMovement = useCreateInventoryMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isItemDialog, setIsItemDialog] = useState(false);
  const [isMovementDialog, setIsMovementDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const itemForm = useForm<z.infer<typeof itemSchema>>({ resolver: zodResolver(itemSchema), defaultValues: { name: "", category: "", unit: "un", currentStock: 0, minStock: 0, unitPrice: null, supplierId: null, notes: "" } });
  const movForm = useForm<z.infer<typeof movementSchema>>({ resolver: zodResolver(movementSchema), defaultValues: { inventoryItemId: 0, type: "in", quantity: 0, reason: "", date: new Date().toISOString().slice(0, 10) } });

  function openCreate() { setEditItem(null); itemForm.reset({ name: "", category: "", unit: "un", currentStock: 0, minStock: 0, unitPrice: null, supplierId: null, notes: "" }); setIsItemDialog(true); }
  function openEdit(item: InventoryItem) { setEditItem(item); itemForm.reset({ name: item.name, category: item.category, unit: item.unit, currentStock: item.currentStock, minStock: item.minStock, unitPrice: item.unitPrice || null, supplierId: item.supplierId || null, notes: item.notes || "" }); setIsItemDialog(true); }

  async function onItemSubmit(values: z.infer<typeof itemSchema>) {
    const payload = { ...values, unitPrice: values.unitPrice || null, supplierId: values.supplierId || null, notes: values.notes || null };
    if (editItem) { await updateItem.mutateAsync({ id: editItem.id, data: payload }); toast({ title: "Item atualizado" }); }
    else { await createItem.mutateAsync({ data: payload }); toast({ title: "Item criado" }); }
    queryClient.invalidateQueries();
    setIsItemDialog(false);
  }

  async function onMovementSubmit(values: z.infer<typeof movementSchema>) {
    await createMovement.mutateAsync({ data: { ...values, date: new Date(values.date).toISOString(), reason: values.reason || null, maintenanceId: null } });
    toast({ title: "Movimento registado" });
    queryClient.invalidateQueries();
    setIsMovementDialog(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteItem.mutateAsync({ id: deleteId });
    toast({ title: "Item eliminado" });
    queryClient.invalidateQueries();
    setDeleteId(null);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl"><Package className="w-6 h-6 text-indigo-500" /></div>
          <div><h1 className="text-2xl font-bold">Inventário</h1><p className="text-sm text-muted-foreground">{items?.length || 0} itens</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { movForm.reset({ inventoryItemId: 0, type: "in", quantity: 0, reason: "", date: new Date().toISOString().slice(0, 10) }); setIsMovementDialog(true); }}><ArrowUpDown className="w-4 h-4 mr-2" />Movimento</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Item</Button>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList><TabsTrigger value="items">Itens</TabsTrigger><TabsTrigger value="movements">Movimentos</TabsTrigger></TabsList>
        <TabsContent value="items">
          <div className="rounded-2xl border border-border overflow-hidden bg-card mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Unidade</TableHead>
                  <TableHead>Stock Atual</TableHead><TableHead>Stock Mín.</TableHead>
                  <TableHead>Preço Unit.</TableHead><TableHead>Fornecedor</TableHead>
                  <TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.currentStock}</TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>{item.unitPrice ? `${item.unitPrice.toFixed(2)} €` : "-"}</TableCell>
                    <TableCell>{item.supplierName || "-"}</TableCell>
                    <TableCell>{item.currentStock <= item.minStock ? <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Stock Baixo</Badge> : <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">OK</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!items || items.length === 0) && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum item em inventário</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="movements">
          <div className="rounded-2xl border border-border overflow-hidden bg-card mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Data</TableHead><TableHead>Item</TableHead><TableHead>Tipo</TableHead><TableHead>Quantidade</TableHead><TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>{m.date ? format(new Date(m.date), "dd/MM/yyyy") : "-"}</TableCell>
                    <TableCell>{m.itemName || m.inventoryItemId}</TableCell>
                    <TableCell><Badge className={m.type === "in" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : m.type === "out" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>{m.type === "in" ? "Entrada" : m.type === "out" ? "Saída" : "Ajuste"}</Badge></TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.reason || "-"}</TableCell>
                  </TableRow>
                ))}
                {(!movements || movements.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum movimento</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog open={isItemDialog} onOpenChange={setIsItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={itemForm.control} name="category" render={({ field }) => (<FormItem><FormLabel>Categoria *</FormLabel><FormControl><Input placeholder="Ex: Peças, Consumíveis..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={itemForm.control} name="unit" render={({ field }) => (<FormItem><FormLabel>Unidade *</FormLabel><FormControl><Input placeholder="un, L, kg..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={itemForm.control} name="currentStock" render={({ field }) => (<FormItem><FormLabel>Stock Atual *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={itemForm.control} name="minStock" render={({ field }) => (<FormItem><FormLabel>Stock Mín. *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Preço Unit.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={itemForm.control} name="supplierId" render={({ field }) => (<FormItem><FormLabel>Fornecedor</FormLabel><Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}><FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <FormField control={itemForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Input placeholder="Observações..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setIsItemDialog(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialog} onOpenChange={setIsMovementDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registar Movimento</DialogTitle></DialogHeader>
          <Form {...movForm}>
            <form onSubmit={movForm.handleSubmit(onMovementSubmit)} className="space-y-4">
              <FormField control={movForm.control} name="inventoryItemId" render={({ field }) => (<FormItem><FormLabel>Item *</FormLabel><Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}><FormControl><SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger></FormControl><SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={movForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="in">Entrada</SelectItem><SelectItem value="out">Saída</SelectItem><SelectItem value="adjustment">Ajuste</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={movForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={movForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>Data *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={movForm.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motivo</FormLabel><FormControl><Input placeholder="Motivo do movimento..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setIsMovementDialog(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Item?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
