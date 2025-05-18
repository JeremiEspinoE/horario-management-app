
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, RefreshCw, Save } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface BloqueHorario {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

interface DisponibilidadBloque {
  id: number;
  docente: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  esta_disponible: boolean;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

const DisponibilidadDocente = () => {
  const { role } = useAuth();
  const isAdmin = role === "Administrador";
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadBloque[]>([]);
  
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Cargar periodos académicos activos
        const periodosData = await fetchData<Periodo>("academic/periodos-academicos/?activo=true");
        if (periodosData && periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].id);
        }
        
        // Cargar bloques horarios
        const bloquesData = await fetchData<BloqueHorario>("scheduling/bloques-horarios/");
        if (bloquesData) {
          setBloques(bloquesData.sort((a, b) => a.orden - b.orden));
        }
        
        // Si es administrador, cargar docentes
        if (isAdmin) {
          const docentesData = await fetchData<Docente>("users/docentes/");
          if (docentesData && docentesData.length > 0) {
            setDocentes(docentesData);
          }
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [isAdmin]);

  // Cargar disponibilidad cuando se selecciona docente y periodo
  useEffect(() => {
    if (selectedDocente && selectedPeriodo) {
      loadDisponibilidad();
    }
  }, [selectedDocente, selectedPeriodo]);

  const loadDisponibilidad = async () => {
    setIsLoading(true);
    try {
      const response = await client.get(`/scheduling/disponibilidad-docentes/?docente=${selectedDocente}&periodo=${selectedPeriodo}`);
      setDisponibilidad(response.data);
    } catch (error) {
      console.error("Error cargando disponibilidad:", error);
      toast.error("Error al cargar la disponibilidad");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDisponibilidad = async (dia: number, bloque: number) => {
    // Buscar si ya existe este bloque
    const existeBloque = disponibilidad.find(
      d => d.dia_semana === dia && d.bloque_horario === bloque
    );
    
    setIsSaving(true);
    
    try {
      if (existeBloque) {
        // Actualizar disponibilidad existente
        await client.patch(`/scheduling/disponibilidad-docentes/${existeBloque.id}/`, {
          esta_disponible: !existeBloque.esta_disponible
        });
        
        // Actualizar estado local
        setDisponibilidad(disponibilidad.map(d => 
          d.id === existeBloque.id 
            ? { ...d, esta_disponible: !d.esta_disponible } 
            : d
        ));
      } else {
        // Crear nuevo registro de disponibilidad
        const newDisponibilidad = {
          docente: selectedDocente,
          periodo: selectedPeriodo,
          dia_semana: dia,
          bloque_horario: bloque,
          esta_disponible: true
        };
        
        const response = await client.post('/scheduling/disponibilidad-docentes/', newDisponibilidad);
        setDisponibilidad([...disponibilidad, response.data]);
      }
      
      toast.success("Disponibilidad actualizada");
    } catch (error) {
      console.error("Error actualizando disponibilidad:", error);
      toast.error("Error al actualizar la disponibilidad");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !selectedPeriodo) {
      toast.error("Seleccione un archivo y un periodo");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('periodo_id', selectedPeriodo.toString());
      
      if (selectedDocente) {
        formData.append('docente_id', selectedDocente.toString());
      }
      
      await client.post('/scheduling/disponibilidad-docentes/cargar-disponibilidad-excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Disponibilidad cargada desde Excel");
      setFile(null);
      loadDisponibilidad();
    } catch (error) {
      console.error("Error cargando disponibilidad desde Excel:", error);
      toast.error("Error al cargar la disponibilidad desde Excel");
    } finally {
      setIsUploading(false);
    }
  };

  const isDisponible = (dia: number, bloque: number): boolean => {
    const bloqueDisponibilidad = disponibilidad.find(
      d => d.dia_semana === dia && d.bloque_horario === bloque
    );
    return bloqueDisponibilidad ? bloqueDisponibilidad.esta_disponible : false;
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Disponibilidad de Docentes" 
        description="Configuración de horarios disponibles para cada docente"
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Docente</label>
                  <Select 
                    onValueChange={(value) => setSelectedDocente(Number(value))}
                    value={selectedDocente?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar docente" />
                    </SelectTrigger>
                    <SelectContent>
                      {docentes.map((docente) => (
                        <SelectItem key={docente.id} value={docente.id.toString()}>
                          {docente.nombres} {docente.apellidos} ({docente.codigo_docente})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Periodo Académico</label>
                <Select 
                  onValueChange={(value) => setSelectedPeriodo(Number(value))}
                  value={selectedPeriodo?.toString() || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem key={periodo.id} value={periodo.id.toString()}>
                        {periodo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  onClick={loadDisponibilidad}
                  className="w-full"
                  disabled={!selectedDocente || !selectedPeriodo || isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Recargar Disponibilidad
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cargar desde Excel</label>
                <div className="flex space-x-2">
                  <Input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                  />
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={!file || isUploading || !selectedPeriodo}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Subir
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Formato: Excel con columnas Día, Bloque, Disponible (1/0)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDocente && selectedPeriodo && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-academic-primary text-white">
                    <th className="p-3 text-left">Hora</th>
                    {diasSemana.map((dia) => (
                      <th key={dia.id} className="p-3 text-center">{dia.nombre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloques.map((bloque) => (
                    <tr key={bloque.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        {bloque.hora_inicio} - {bloque.hora_fin}
                      </td>
                      {diasSemana.map((dia) => (
                        <td 
                          key={`${bloque.id}-${dia.id}`} 
                          className="p-3 text-center"
                        >
                          <button
                            className={`w-6 h-6 rounded-full transition-colors ${
                              isDisponible(dia.id, bloque.id) 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            onClick={() => handleToggleDisponibilidad(dia.id, bloque.id)}
                            disabled={isSaving}
                          >
                            {isDisponible(dia.id, bloque.id) && (
                              <span className="text-white">✓</span>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isLoading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      )}
    </div>
  );
};

export default DisponibilidadDocente;
