import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
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
// import { TemplateUpload } from "./pages/newTemplate/Upload";
import TemplateIndex from "./pages/newTemplate/TemplateIndex";
import LabelConfigurator from "./pages/newConfiguration/LabelConfigurator";
import { ConfigDetailPage } from "./pages/newConfiguration/ConfigDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/outputs" element={<OutputRules />} />
            <Route path="/templates" element={<Templates />} />
            {/* <Route path="/output-rules" element={<OutputRules />} /> */}
            <Route path="/printers" element={<Printers />} />
            <Route path="/api-configurations" element={<ApiConfigurations />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/output-status" element={<Outputs />} />
            <Route path="/settings" element={<Settings />} />

            {/* Forms Wizard App Integration */}
            <Route path="/templates/new" element={<TemplateIndex />} />

            {/* Label Configurator App Integration */}
            <Route path="/labelConfigurator" element={<LabelConfigurator />} />
            <Route path="/config/new" element={<ConfigDetailPage />} />
            <Route path="/config/:configId" element={<ConfigDetailPage />} />
        
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
