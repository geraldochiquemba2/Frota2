import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Map, Truck, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export function DriverLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/driver/dashboard", label: "As Minhas Viagens", icon: Map },
    { href: "/driver/vehicle", label: "A Minha Viatura", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0 md:pt-16">
      {/* Top Header - Mobile and Desktop */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-30 flex items-center justify-between px-4 lg:px-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0) || "D"}
          </div>
          <div>
            <h1 className="font-display font-bold leading-tight">NEXUS Driver</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{user?.name}</p>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${location === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground cursor-pointer"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          <button onClick={logout} className="text-sm font-medium text-destructive hover:text-destructive/80 flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </nav>

        {/* Mobile logout */}
        <button onClick={logout} className="md:hidden text-muted-foreground hover:text-white p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0 max-w-3xl mx-auto w-full p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-border z-30 flex items-center justify-around px-6 pb-safe">
        {navItems.map(item => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center gap-1 cursor-pointer w-20 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`p-2 rounded-xl transition-colors ${isActive ? "bg-primary/20" : ""}`}>
                  <item.icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
