
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, role } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      toast.error('Por favor seleccione un rol primero');
      navigate('/');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        toast.success('Inicio de sesión exitoso');
        
        if (role === 'Administrador') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard-docente');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDisplay = role === 'Administrador' ? 'Administrador' : 'Docente';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-0">
          <CardHeader className="academic-gradient rounded-t-lg p-6">
            <div className="flex flex-col items-center text-white">
              <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
              <p className="text-white/80 mt-2">Acceso como {roleDisplay}</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Correo Electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-academic-primary hover:bg-academic-secondary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">◌</span>
                    Procesando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    Ingresar
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-sm text-gray-500"
              >
                Volver a selección de rol
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
