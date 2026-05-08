import React, { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListVehicles, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users2, Search } from "lucide-react";
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
import { ImageUpload } from "@/components/ImageUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  phone: z.string().min(9, "Número inválido"),
  role: z.enum(["admin", "driver"]),
  vehicleIds: z.array(z.number()).default([]),
  active: z.boolean().optional(),
  avatarUrl: z.string().optional().nullable(),
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
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", role: "driver", vehicleIds: [], active: true, avatarUrl: null } });

  function openCreate() { setEditUser(null); form.reset({ name: "", phone: "", role: "driver", vehicleIds: [], active: true, avatarUrl: null }); setIsDialogOpen(true); }
  function openEdit(u: any) { setEditUser(u); form.reset({ name: u.name, phone: u.phone, role: u.role as any, vehicleIds: u.vehicleIds || [], active: u.active, avatarUrl: u.avatarUrl }); setIsDialogOpen(true); }

  async function onSubmit(values: z.infer<typeof schema>) {
    const payload = { ...values };
    console.log("Submitting user form with payload:", payload);
    if (editUser) {
      const updatePayload: any = { 
        name: payload.name, 
        phone: payload.phone, 
        role: payload.role, 
        vehicleIds: (payload.vehicleIds || []).map(Number), 
        active: payload.active, 
        avatarUrl: payload.avatarUrl 
      };
      await updateUser.mutateAsync({ id: editUser.id, data: updatePayload });
      toast({ title: "Utilizador atualizado" });
    } else {
      await createUser.mutateAsync({ data: { 
        name: payload.name, 
        phone: payload.phone, 
        role: payload.role, 
        vehicleIds: (payload.vehicleIds || []).map(Number), 
        avatarUrl: payload.avatarUrl,
        pin: "1234" // Default pin if removed from UI
      } as any });
      toast({ title: "Utilizador criado" });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteId == null) return;
    await deleteUser.mutateAsync({ id: deleteId });
    toast({ title: "Utilizador eliminado" });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    setDeleteId(null);
  }

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

      <div className="flex items-center gap-2 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Pesquisar por nome ou telefone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Nome</TableHead><TableHead>Telemóvel</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead><TableHead>Viatura</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(u => (
              <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{u.name}</span>
                  </div>
                </TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell><Badge className={u.role === "admin" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>{u.role === "admin" ? "Admin" : "Motorista"}</Badge></TableCell>
                <TableCell><Badge className={u.active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"}>{u.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(u as any).vehicleIds?.length > 0 ? (u as any).vehicleIds.map((vId: number) => {
                      const v = vehicles?.find(veh => veh.id === vId);
                      return v ? <Badge key={vId} variant="outline" className="text-[10px] py-0">{v.plate}</Badge> : null;
                    }) : "-"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredUsers || filteredUsers.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum utilizador encontrado</TableCell></TableRow>}
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
                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Perfil *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="driver">Motorista</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </div>

              <FormField control={form.control} name="vehicleIds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Viaturas Atribuídas</FormLabel>
                  <div className="border border-border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto bg-muted/20 custom-scrollbar">
                    {vehicles?.map(v => (
                      <div key={v.id} className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id={`v-${v.id}`} 
                          className="w-4 h-4 cursor-pointer"
                          checked={field.value?.includes(v.id) || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, v.id]);
                            } else {
                              field.onChange(current.filter(id => id !== v.id));
                            }
                          }}
                        />
                        <label htmlFor={`v-${v.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          {v.plate} <span className="text-muted-foreground text-xs font-normal">({v.brand} {v.model})</span>
                        </label>
                      </div>
                    ))}
                    {(!vehicles || vehicles.length === 0) && <p className="text-xs text-muted-foreground">Nenhuma viatura disponível</p>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              {editUser && (
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Ativo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} label="Foto de Perfil" />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
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
