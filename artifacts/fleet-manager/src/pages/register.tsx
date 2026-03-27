import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Truck, Lock, Phone, User, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(9, "Número inválido"),
  pin: z.string().min(4, "Mínimo 4 caracteres"),
  confirmPin: z.string().min(4),
}).refine(d => d.pin === d.confirmPin, { message: "As palavras-passe não coincidem", path: ["confirmPin"] });

type FormValues = z.infer<typeof schema>;

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (p.startsWith("00244")) p = "+" + p.slice(2);
  if (p.startsWith("244") && !p.startsWith("+")) p = "+" + p;
  if (/^9\d{8}$/.test(p)) p = "+244" + p;
  return p;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", pin: "", confirmPin: "" },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const phone = normalizePhone(values.phone);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: values.name, phone, pin: values.pin, role: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro no cadastro", description: data.error || "Tente novamente", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Conta criada!", description: `Bem-vindo, ${data.user.name}` });
      setLocation("/admin/dashboard");
    } catch {
      toast({ title: "Erro de ligação", description: "Não foi possível contactar o servidor", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl shadow-primary/5"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">NEXUS Fleet</h1>
          <p className="text-muted-foreground mt-1 text-sm">Criar nova conta</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Nome Completo</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="João Manuel" className="pl-10 h-12 bg-background/50 border-border" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Número de Telefone</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="+244 9XX XXX XXX" className="pl-10 h-12 bg-background/50 border-border" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pin" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Palavra-passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input type="password" placeholder="Mínimo 4 caracteres" className="pl-10 h-12 bg-background/50 border-border" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirmPin" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Confirmar Palavra-passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input type="password" placeholder="Repita a palavra-passe" className="pl-10 h-12 bg-background/50 border-border" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={isLoading}>
              {isLoading ? "A criar conta..." : "Criar Conta"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link href="/login">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Já tenho conta — Entrar
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
