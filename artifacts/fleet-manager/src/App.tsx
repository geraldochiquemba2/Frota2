import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { DriverLayout } from "@/components/layout/DriverLayout";

import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminVehicles from "@/pages/admin/vehicles";
import AdminTrips from "@/pages/admin/trips";
import AdminFuelings from "@/pages/admin/fuelings";
import AdminMaintenance from "@/pages/admin/maintenance";
import AdminInventory from "@/pages/admin/inventory";
import AdminUsers from "@/pages/admin/users";
import AdminSuppliers from "@/pages/admin/suppliers";
import AdminFinance from "@/pages/admin/finance";
import AdminReports from "@/pages/admin/reports";
import DriverDashboard from "@/pages/driver/dashboard";
import DriverTrips from "@/pages/driver/trips";
import DriverVehicle from "@/pages/driver/vehicle";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const ProtectedRoute = ({ component: Component, allowedRole, layout: Layout }: any) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (allowedRole && user?.role !== allowedRole) return <Redirect to={user?.role === "admin" ? "/admin/dashboard" : "/driver/dashboard"} />;
  return Layout ? <Layout><Component /></Layout> : <Component />;
};

function RootRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return user?.role === "admin" ? <Redirect to="/admin/dashboard" /> : <Redirect to="/driver/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard">{() => <ProtectedRoute component={AdminDashboard} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/vehicles">{() => <ProtectedRoute component={AdminVehicles} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/trips">{() => <ProtectedRoute component={AdminTrips} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/fuelings">{() => <ProtectedRoute component={AdminFuelings} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/maintenance">{() => <ProtectedRoute component={AdminMaintenance} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/inventory">{() => <ProtectedRoute component={AdminInventory} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsers} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/suppliers">{() => <ProtectedRoute component={AdminSuppliers} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/finance">{() => <ProtectedRoute component={AdminFinance} allowedRole="admin" layout={AdminLayout} />}</Route>
      <Route path="/admin/reports">{() => <ProtectedRoute component={AdminReports} allowedRole="admin" layout={AdminLayout} />}</Route>

      {/* Driver Routes */}
      <Route path="/driver/dashboard">{() => <ProtectedRoute component={DriverDashboard} allowedRole="driver" layout={DriverLayout} />}</Route>
      <Route path="/driver/trips">{() => <ProtectedRoute component={DriverTrips} allowedRole="driver" layout={DriverLayout} />}</Route>
      <Route path="/driver/vehicle">{() => <ProtectedRoute component={DriverVehicle} allowedRole="driver" layout={DriverLayout} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
