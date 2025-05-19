
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import SelectRole from "./pages/SelectRole";
import Login from "./pages/Login";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardDocente from "./pages/DashboardDocente";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// CRUD Pages
import UnidadesAcademicas from "./pages/UnidadesAcademicas";
import Carreras from "./pages/Carreras";
import Materias from "./pages/Materias";
import Docentes from "./pages/Docentes";
import Aulas from "./pages/Aulas";
import Grupos from "./pages/Grupos";
import DisponibilidadDocente from "./pages/DisponibilidadDocente";
import HorarioManual from "./pages/HorarioManual";
import HorarioAuto from "./pages/HorarioAuto";
import ReportesHorarios from "./pages/ReportesHorarios";
import Restricciones from "./pages/Restricciones";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
                  <Route path="/admin/dashboard" element={<DashboardAdmin />} />
                  <Route path="/admin/unidades" element={<UnidadesAcademicas />} />
                  <Route path="/admin/unidades/:id/carreras" element={<Carreras />} />
                  <Route path="/admin/carreras/:id/materias" element={<Materias />} />
                  <Route path="/admin/docentes" element={<Docentes />} />
                  <Route path="/admin/aulas" element={<Aulas />} />
                  <Route path="/admin/grupos" element={<Grupos />} />
                  <Route path="/admin/disponibilidad" element={<DisponibilidadDocente />} />
                  <Route path="/admin/horarios/manual" element={<HorarioManual />} />
                  <Route path="/admin/horarios/automatico" element={<HorarioAuto />} />
                  <Route path="/admin/reportes" element={<ReportesHorarios />} />
                  <Route path="/admin/restricciones" element={<Restricciones />} />
                </Route>

                {/* Protected Teacher routes */}
                <Route 
                  element={<ProtectedRoute allowedRoles={["Docente"]} />}
                >
                  <Route path="/dashboard-docente" element={<DashboardDocente />} />
                  <Route path="/docente/dashboard" element={<DashboardDocente />} />
                  <Route path="/docente/disponibilidad" element={<DisponibilidadDocente />} />
                  <Route path="/docente/horario" element={<ReportesHorarios />} />
                  <Route path="/docente/exportar" element={<ReportesHorarios />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
