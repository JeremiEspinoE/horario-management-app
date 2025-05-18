
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Users } from 'lucide-react';

const SelectRole = () => {
  const { setRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect to appropriate dashboard
    if (isAuthenticated) {
      const role = localStorage.getItem('role');
      if (role === 'Administrador') {
        navigate('/dashboard-admin');
      } else if (role === 'Docente') {
        navigate('/dashboard-docente');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (selectedRole: 'Docente' | 'Administrador') => {
    setRole(selectedRole);
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-academic-dark mb-2">
          Sistema de Gestión de Horarios
        </h1>
        <p className="text-gray-600">
          Seleccione su rol para continuar
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-academic-primary"
            onClick={() => handleRoleSelect('Docente')}
          >
            <CardContent className="flex flex-col items-center p-8">
              <div className="bg-academic-primary/10 p-4 rounded-full mb-4">
                <BookOpen className="h-12 w-12 text-academic-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Soy Docente</h2>
              <p className="text-gray-600 text-center">
                Acceda a su disponibilidad y horarios asignados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card 
            className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-academic-secondary"
            onClick={() => handleRoleSelect('Administrador')}
          >
            <CardContent className="flex flex-col items-center p-8">
              <div className="bg-academic-secondary/10 p-4 rounded-full mb-4">
                <Users className="h-12 w-12 text-academic-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Soy Administrador</h2>
              <p className="text-gray-600 text-center">
                Gestione unidades académicas, carreras, materias y horarios
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SelectRole;
