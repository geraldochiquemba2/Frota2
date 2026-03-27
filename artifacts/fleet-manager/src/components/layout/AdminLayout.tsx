import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, Truck, Map, Droplets, Wrench, 
  Package, Users, DollarSign, FileText, LogOut, Menu, X, Users2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/admin/dashboard", label: "Painel Central", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Viaturas", icon: Truck },
  { href: "/admin/trips", label: "Viagens", icon: Map },
  { href: "/admin/fuelings", label: "Abastecimentos", icon: Droplets },
  { href: "/admin/maintenance", label: "Manutenção", icon: Wrench },
  { href: "/admin/inventory", label: "Inventário", icon: Package },
  { href: "/admin/users", label: "Utilizadores", icon: Users2 },
  { href: "/admin/suppliers", label: "Fornecedores", icon: Users },
  { href: "/admin/finance", label: "Finanças", icon: DollarSign },
  { href: "/admin/reports", label: "Relatórios", icon: FileText },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.startsWith(path);

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          NEXUS Frota
        </h2>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Portal de Administração</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
              ${isActive(item.href) 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}
            `}>
              <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-primary" : ""}`} />
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-3 bg-secondary/50 rounded-xl mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.phone}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-primary border-border/50" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border shadow-2xl shadow-slate-100 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-30">
        <h2 className="text-xl font-display font-bold text-primary">NEXUS Frota</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-card border-r border-border shadow-2xl z-50 flex flex-col md:hidden"
            >
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden pt-16 md:pt-0">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
