import React, { useState } from "react";
import { useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default function AdminSuppliers() {
  const { data: suppliers, isLoading } = useListSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", contactName: "", phone: "", email: "", address: "", category: "", notes: "" } });

  function openCreate() { setEditItem(null); form.reset({ name: "", contactName: "", phone: "", email: "", address: "", category: "", notes: "" }); setIsDialogOpen(true); }
  function openEdit(s: Supplier) { setEditItem(s); form.reset({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", address: s.address || "", category: s.category || "", notes: s.notes || "" }); setIsDialogOpen(true); }

  async function onSubmit(values: z.infer<typeof schema>) {
    const payload = { name: values.name, contactName: values.contactName || null, phone: values.phone || null, email: values.email || null, address: values.address || null, category: values.category || null, notes: values.notes || null };
    if (editItem) { await updateSupplier.mutateAsync({ id: editItem.id, data: payload }); toast({ title: "Fornecedor atualizado" }); }
    else { await createSupplier.mutateAsync({ data: payload }); toast({ title: "Fornecedor criado" }); }
    queryClient.invalidateQueries();
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteSupplier.mutateAsync({ id: deleteId });
    toast({ title: "Fornecedor eliminado" });
    queryClient.invalidateQueries();
    setDeleteId(null);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-xl"><Users className="w-6 h-6 text-cyan-500" /></div>
          <div><h1 className="text-2xl font-bold">Fornecedores</h1><p className="text-sm text-muted-foreground">{suppliers?.length || 0} fornecedores</p></div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Fornecedor</Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Nome</TableHead><TableHead>Contacto</TableHead><TableHead>Telefone</TableHead><TableHead>Email</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map(s => (
              <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contactName || "-"}</TableCell>
                <TableCell>{s.phone || "-"}</TableCell>
                <TableCell>{s.email || "-"}</TableCell>
                <TableCell>{s.category || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!suppliers || suppliers.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum fornecedor encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel>Contacto</FormLabel><FormControl><Input placeholder="Nome do contacto" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Peças, Combustível..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+351 XXX XXX XXX" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@empresa.pt" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Morada</FormLabel><FormControl><Input placeholder="Morada completa..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Input placeholder="Observações..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Fornecedor?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
