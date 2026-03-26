import React, { useState } from "react";
import { useListVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useListUsers, Vehicle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const vehicleSchema = z.object({
  plate: z.string().min(1, "Plate is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900).max(2100),
  status: z.enum(["active", "maintenance", "inactive"]),
  mileage: z.coerce.number().min(0),
  fuelType: z.string().min(1),
  assignedDriverId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof vehicleSchema>;

export default function AdminVehicles() {
  const { data: vehicles, isLoading } = useListVehicles();
  const { data: users } = useListUsers();
  const drivers = users?.filter(u => u.role === "driver" && u.active) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: "", brand: "", model: "", year: new Date().getFullYear(),
      status: "active", mileage: 0, fuelType: "Diesel", assignedDriverId: null
    }
  });

  const createMutation = useCreateVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        setIsDialogOpen(false);
        toast({ title: "Vehicle created" });
      }
    }
  });

  const updateMutation = useUpdateVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        setIsDialogOpen(false);
        toast({ title: "Vehicle updated" });
      }
    }
  });

  const deleteMutation = useDeleteVehicle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        toast({ title: "Vehicle deleted" });
      }
    }
  });

  const openCreate = () => {
    setEditingVehicle(null);
    form.reset({
      plate: "", brand: "", model: "", year: new Date().getFullYear(),
      status: "active", mileage: 0, fuelType: "Diesel", assignedDriverId: null
    });
    setIsDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    form.reset({
      plate: v.plate, brand: v.brand, model: v.model, year: v.year,
      status: v.status, mileage: v.mileage, fuelType: v.fuelType,
      assignedDriverId: v.assignedDriverId
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  if (isLoading) return <Skeleton className="w-full h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Vehicles</h1>
          <p className="text-muted-foreground">Manage fleet vehicles and assignments</p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Mileage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No vehicles found
                </TableCell>
              </TableRow>
            )}
            {vehicles?.map(v => (
              <TableRow key={v.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                <TableCell>
                  <div className="font-semibold text-foreground">{v.brand} {v.model}</div>
                  <div className="text-xs text-muted-foreground">{v.year} • {v.fuelType}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={v.status === 'active' ? 'default' : v.status === 'maintenance' ? 'destructive' : 'secondary'} className="capitalize">
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.assignedDriverName || "Unassigned"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{v.mileage.toLocaleString()} km</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("Delete?") && deleteMutation.mutate({ id: v.id })}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="plate" render={({ field }) => (
                  <FormItem><FormLabel>Plate Number</FormLabel><FormControl><Input {...field} className="uppercase font-mono" /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage/></FormItem>
                )}/>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mileage" render={({ field }) => (
                  <FormItem><FormLabel>Mileage (km)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="fuelType" render={({ field }) => (
                  <FormItem><FormLabel>Fuel Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="assignedDriverId" render={({ field }) => (
                <FormItem><FormLabel>Assign Driver (Optional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="null">Unassigned</SelectItem>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.phone})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage/></FormItem>
              )}/>

              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" className="mr-2" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingVehicle ? "Save Changes" : "Create Vehicle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
