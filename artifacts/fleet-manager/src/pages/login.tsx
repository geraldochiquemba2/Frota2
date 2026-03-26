import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Truck, Lock, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const loginSchema = z.object({
  phone: z.string().min(5, "Número inválido"),
  pin: z.string().min(4, "PIN obrigatório").max(6),
});

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (p.startsWith("00244")) p = "+" + p.slice(2);
  if (p.startsWith("244") && !p.startsWith("+")) p = "+" + p;
  if (/^9\d{8}$/.test(p)) p = "+244" + p;
  return p;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", pin: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        toast({
          title: "Acesso autorizado",
          description: `Bem-vindo, ${data.user.name}`,
        });

        if (data.user.role === "admin") {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/driver/dashboard");
        }
      },
      onError: (error) => {
        toast({
          title: "Acesso negado",
          description: (error as any)?.data?.error || "Número ou PIN inválido",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: { ...values, phone: normalizePhone(values.phone) } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Abstract tech background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-black/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">NEXUS Fleet</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Intelligent Operations Platform
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
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
              )}
            />
            
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Código PIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input type="password" placeholder="••••" maxLength={6} className="pl-10 h-12 bg-background/50 border-border" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "A autenticar..." : "Entrar"}
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center">
          <Link href="/register">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Não tem conta?
              <span className="text-primary font-medium">Criar conta</span>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
