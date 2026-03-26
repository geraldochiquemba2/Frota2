import React, { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListVehicles, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  phone: z.string().min(9, "Número inválido"),
  pin: z.string().min(4, "PIN mínimo 4 dígitos").max(6, "PIN máximo 6 dígitos").regex(/^\d+$/, "Apenas dígitos"),
  role: z.enum(["admin", "driver"]),
  vehicleId: z.coerce.number().optional().nullable(),
  active: z.boolean().optional(),
});

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const { data: vehicles } = useListVehicles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", pin: "", role: "driver", vehicleId: null, active: true } });

  function openCreate() { setEditUser(null); form.reset({ name: "", phone: "", pin: "", role: "driver", vehicleId: null, active: true }); setIsDialogOpen(true); }
  function openEdit(u: User) { setEditUser(u); form.reset({ name: u.name, phone: u.phone, pin: "", role: u.role as any, vehicleId: u.vehicleId || null, active: u.active }); setIsDialogOpen(true); }

  async function onSubmit(values: z.infer<typeof schema>) {
    const payload = { ...values, vehicleId: values.vehicleId || null };
    if (editUser) {
      const updatePayload: any = { name: payload.name, phone: payload.phone, role: payload.role, vehicleId: payload.vehicleId, active: payload.active };
      if (values.pin) updatePayload.pin = values.pin;
      await updateUser.mutateAsync({ id: editUser.id, data: updatePayload });
      toast({ title: "Utilizador atualizado" });
    } else {
      await createUser.mutateAsync({ data: { name: payload.name, phone: payload.phone, pin: payload.pin, role: payload.role, vehicleId: payload.vehicleId } });
      toast({ title: "Utilizador criado" });
    }
    queryClient.invalidateQueries();
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteUser.mutateAsync({ id: deleteId });
    toast({ title: "Utilizador eliminado" });
    queryClient.invalidateQueries();
    setDeleteId(null);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-xl"><Users2 className="w-6 h-6 text-violet-500" /></div>
          <div><h1 className="text-2xl font-bold">Utilizadores</h1><p className="text-sm text-muted-foreground">{users?.length || 0} utilizadores</p></div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Utilizador</Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Nome</TableHead><TableHead>Telemóvel</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead><TableHead>Viatura</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(u => (
              <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell><Badge className={u.role === "admin" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>{u.role === "admin" ? "Admin" : "Motorista"}</Badge></TableCell>
                <TableCell><Badge className={u.active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"}>{u.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>{u.vehicleId ? vehicles?.find(v => v.id === u.vehicleId)?.plate || u.vehicleId : "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!users || users.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum utilizador encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editUser ? "Editar Utilizador" : "Novo Utilizador"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone *</FormLabel><FormControl><Input placeholder="+244 9XX XXX XXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="pin" render={({ field }) => (<FormItem><FormLabel>PIN {editUser ? "(opcional)" : "*"}</FormLabel><FormControl><Input type="password" placeholder="4-6 dígitos" maxLength={6} {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Perfil *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="driver">Motorista</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="vehicleId" render={({ field }) => (<FormItem><FormLabel>Viatura</FormLabel><Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}><FormControl><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              {editUser && (
                <FormField control={form.control} name="active" render={({ field }) => (<FormItem className="flex items-center gap-3"><FormLabel>Ativo</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              )}
              <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Utilizador?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
