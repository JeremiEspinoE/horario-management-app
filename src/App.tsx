
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import SelectRole from "./pages/SelectRole";
import Login from "./pages/Login";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardDocente from "./pages/DashboardDocente";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<SelectRole />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Admin routes */}
              <Route 
                element={<ProtectedRoute allowedRoles={["Administrador"]} />}
              >
                <Route path="/dashboard-admin" element={<DashboardAdmin />} />
                {/* Add other admin routes here */}
              </Route>

              {/* Protected Teacher routes */}
              <Route 
                element={<ProtectedRoute allowedRoles={["Docente"]} />}
              >
                <Route path="/dashboard-docente" element={<DashboardDocente />} />
                {/* Add other teacher routes here */}
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
