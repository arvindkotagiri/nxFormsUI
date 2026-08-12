import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "./components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Outputs from "./pages/Outputs";
import Templates from "./pages/Templates";
import OutputRules from "./pages/OutputRules";
import Printers from "./pages/Printers";
import ApiConfigurations from "./pages/ApiConfigurations";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import TemplateIndex from "./pages/newTemplate/TemplateIndex";
import LabelConfigurator from "./pages/newConfiguration/LabelConfigurator";
import { ConfigDetailPage } from "./pages/newConfiguration/ConfigDetailPage";
import { SimulationPage } from "./pages/Simulation";
import { PrintAgent } from "./components/PrintAgent";
import ImageRetention from "./pages/ImageRetention";
import Observability from "./pages/Observability";
import Tickets from "./pages/Tickets";
import JobQueue from "./pages/JobQueue";
import { WizardProvider } from "@/context/WizardContext";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, token, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white font-body">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-semibold text-slate-400">Loading nxForms session...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <PrintAgent />
      <AuthProvider>
        <WizardProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Unprotected Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Application Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/outputs" element={<OutputRules />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/printers" element={<Printers />} />
                <Route path="/api-configurations" element={<ApiConfigurations />} />
                <Route path="/output-status" element={<Outputs />} />
                <Route path="/job-queue" element={<JobQueue />} />
                <Route path="/settings" element={<Settings />} />

                {/* Admin Panel */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />

                {/* Forms Wizard App Integration */}
                <Route path="/templates/new" element={<TemplateIndex />} />

                {/* Label Configurator App Integration */}
                <Route path="/labelConfigurator" element={<LabelConfigurator />} />
                <Route path="/config/new" element={<ConfigDetailPage />} />
                <Route path="/config/:configId" element={<ConfigDetailPage />} />

                {/* Additional routes */}
                <Route path="/image-retention" element={<ImageRetention />} />
                <Route path="/observability" element={<Observability />} />
                <Route path="/tickets" element={<Tickets />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </WizardProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
