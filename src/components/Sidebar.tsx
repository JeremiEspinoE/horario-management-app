
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  ClipboardList, 
  ClipboardCheck,
  LogIn
} from 'lucide-react';

const Sidebar = () => {
  const { role, logout } = useAuth();
  
  const adminLinks = [
    { name: 'Dashboard', path: '/dashboard-admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Unidades', path: '/unidades', icon: <BookOpen className="w-5 h-5" /> },
    { name: 'Carreras', path: '/carreras', icon: <FileText className="w-5 h-5" /> },
    { name: 'Materias', path: '/materias', icon: <BookOpen className="w-5 h-5" /> },
    { name: 'Grupos/Secciones', path: '/grupos', icon: <Users className="w-5 h-5" /> },
    { name: 'Aulas', path: '/aulas', icon: <FileText className="w-5 h-5" /> },
    { name: 'Docentes', path: '/docentes', icon: <Users className="w-5 h-5" /> },
    { name: 'Disponibilidad', path: '/disponibilidad', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Horarios Manual', path: '/horarios-manual', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Horarios Automático', path: '/horarios-automatico', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Restricciones', path: '/restricciones', icon: <FileText className="w-5 h-5" /> }
  ];
  
  const docenteLinks = [
    { name: 'Mi Disponibilidad', path: '/mi-disponibilidad', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Mi Horario', path: '/mi-horario', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Exportar Horario', path: '/exportar-horario', icon: <FileText className="w-5 h-5" /> }
  ];
  
  const links = role === 'Administrador' ? adminLinks : docenteLinks;
  
  return (
    <aside className="h-screen w-64 bg-academic-light border-r border-gray-200 fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        <div className="academic-gradient text-white p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold">Sistema de Horarios</h2>
          <p className="text-sm opacity-80">
            {role === 'Administrador' ? 'Panel Administrativo' : 'Panel Docente'}
          </p>
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => 
                cn(
                  "flex items-center px-4 py-3 text-gray-700 rounded-lg transition-all",
                  isActive
                    ? "bg-academic-primary text-white shadow-md"
                    : "hover:bg-gray-100"
                )
              }
            >
              <span className="mr-3">{link.icon}</span>
              <span>{link.name}</span>
            </NavLink>
          ))}
          
          <button
            onClick={logout}
            className="flex w-full items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-all mt-10"
          >
            <LogIn className="w-5 h-5 mr-3" />
            <span>Cerrar Sesión</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
