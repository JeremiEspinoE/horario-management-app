import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  turno: string;
  dia_semana: number;
}

interface DisponibilidadBloque {
  disponibilidad_id: number;
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

// Tipo auxiliar para errores de Axios
type AxiosError = {
  response?: {
    data?: {
      non_field_errors?: string[];
    };
  };
};

const DisponibilidadDocente = () => {
  const { role, user } = useAuth();
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
  const [error, setError] = useState<string | null>(null);

  const loadDisponibilidad = async () => {
    const docenteId = isAdmin ? selectedDocente : user?.docente_id;
    if (!docenteId || !selectedPeriodo) {
      setDisponibilidad([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get(`/scheduling/disponibilidad-docentes/?docente=${docenteId}&periodo=${selectedPeriodo}`);
      setDisponibilidad(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando disponibilidad:", error);
      setError("Error al cargar la disponibilidad.");
      toast.error("Error al cargar la disponibilidad");
      setDisponibilidad([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Loading initial data for DisponibilidadDocente");
        
        // Cargar periodos académicos activos (respuesta paginada)
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        console.log("Periodos loaded:", periodosData);
        
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        } else {
          console.log("No periodos found or empty array returned");
          setPeriodos([]);
          setSelectedPeriodo(null);
        }
        
        // Traer todos los bloques horarios
        const bloquesResponse = await fetchData<{ results: BloqueHorario[] }>("scheduling/bloques-horarios/?page_size=100");
        const bloquesData = bloquesResponse?.results ?? [];
        console.log("Bloques loaded:", bloquesData);
        
        if (bloquesData.length > 0) {
          setBloques(bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        } else {
          console.log("No bloques found or empty array returned");
          setBloques([]);
        }
        
        // Si es administrador, cargar docentes (respuesta paginada)
        if (isAdmin) {
          const docentesResponse = await fetchData<{ results: Docente[] }>("users/docentes/");
          const docentesData = docentesResponse?.results ?? [];
          console.log("Docentes loaded:", docentesData);
          
          if (docentesData.length > 0) {
            setDocentes(docentesData);
            setSelectedDocente(docentesData[0].docente_id);
          } else {
            console.log("No docentes found or empty array returned");
            setDocentes([]);
            setSelectedDocente(null);
          }
        } else if (user && user.docente_id) {
          // Si es docente, usar su propio ID
          console.log("Setting docente ID for non-admin user:", user.docente_id);
          setSelectedDocente(user.docente_id);
        } else {
          setSelectedDocente(null);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setError("Error al cargar los datos iniciales. Por favor, intente nuevamente más tarde.");
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [isAdmin, user]);

  // Cargar disponibilidad cuando el docente y el periodo estén listos
  useEffect(() => {
    loadDisponibilidad();
  }, [selectedDocente, selectedPeriodo]);

  const handleToggleDisponibilidad = async (dia_id: number, bloque_id: number) => {
    const docenteId = isAdmin ? selectedDocente : user?.docente_id;
    if (!docenteId || !selectedPeriodo || isSaving) return;

    const existeBloque = disponibilidad.find(
      d => d.dia_semana === dia_id && d.bloque_horario === bloque_id
    );
    
    setIsSaving(true);
    
    try {
      if (existeBloque) {
        // Actualizar disponibilidad existente
        console.log(`Updating disponibilidad ${existeBloque.disponibilidad_id} to ${!existeBloque.esta_disponible}`);
        await client.patch(`/scheduling/disponibilidad-docentes/${existeBloque.disponibilidad_id}/`, {
          esta_disponible: !existeBloque.esta_disponible
        });
        
        // Actualizar estado local
        setDisponibilidad(disponibilidad.map(d => 
          d.disponibilidad_id === existeBloque.disponibilidad_id
            ? { ...d, esta_disponible: !d.esta_disponible } 
            : d
        ));
      } else {
        // Crear nuevo registro de disponibilidad
        const newDisponibilidad = {
          docente: docenteId,
          periodo: selectedPeriodo,
          dia_semana: dia_id,
          bloque_horario: bloque_id,
          esta_disponible: true
        };
        
        console.log("Creating new disponibilidad:", newDisponibilidad);
        const response = await client.post('/scheduling/disponibilidad-docentes/', newDisponibilidad);
        console.log("New disponibilidad created:", response.data);
        setDisponibilidad([...disponibilidad, response.data]);
      }
      
      toast.success("Disponibilidad actualizada");
    } catch (error: unknown) {
      console.error("Error actualizando disponibilidad:", error);
      const axiosError = error as AxiosError;
      if (axiosError.response?.data?.non_field_errors) {
        toast.error(axiosError.response.data.non_field_errors[0]);
      } else {
        toast.error("Error al actualizar la disponibilidad");
      }
      // Recargar la disponibilidad para asegurar que el estado esté sincronizado
      await loadDisponibilidad();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log("File selected:", e.target.files[0].name);
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
      const docenteId = isAdmin ? selectedDocente : user?.docente_id;
      if (!docenteId) {
        toast.error("No se ha podido identificar al docente.");
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('periodo_id', selectedPeriodo.toString());
      formData.append('docente_id', docenteId.toString());
      
      console.log("Uploading file with formData:", {
        file: file.name,
        periodo_id: selectedPeriodo,
        docente_id: docenteId
      });
      
      await client.post('/scheduling/acciones-horario/importar-disponibilidad-excel/', formData, {
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

  const isDisponible = (dia_id: number, bloque_id: number): boolean => {
    if (!Array.isArray(disponibilidad)) {
      console.warn('disponibilidad no es un array:', disponibilidad);
      return false;
    }
    const bloqueDisponibilidad = disponibilidad.find(
      d => d.dia_semana === dia_id && d.bloque_horario === bloque_id
    );
    return bloqueDisponibilidad ? bloqueDisponibilidad.esta_disponible : false;
  };

  // Agrupar bloques por hora para la tabla
  const bloquesPorHora = bloques.reduce((acc, bloque) => {
    const key = `${bloque.hora_inicio}-${bloque.hora_fin}`;
    if (!acc[key]) {
      acc[key] = { hora_inicio: bloque.hora_inicio, hora_fin: bloque.hora_fin, bloques: [] };
    }
    acc[key].bloques.push(bloque);
    return acc;
  }, {} as Record<string, { hora_inicio: string; hora_fin: string; bloques: BloqueHorario[] }>);
  
  const bloquesOrdenados = Object.values(bloquesPorHora).sort((a, b) => 
    a.hora_inicio.localeCompare(b.hora_inicio)
  );

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader 
          title="Disponibilidad de Docentes" 
          description="Configuración de horarios disponibles para cada docente"
        />
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-red-500 font-medium">{error}</div>
            <Button 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Antes del return principal, agregar log para depuración
  console.log("Periodos en render:", periodos);

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
                  <Label>Docente</Label>
                  <Select 
                    onValueChange={(value) => setSelectedDocente(Number(value))}
                    value={selectedDocente?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar docente" />
                    </SelectTrigger>
                    <SelectContent>
                      {docentes.map((docente) => (
                        <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                          {docente.nombres} {docente.apellidos} ({docente.codigo_docente})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label>Periodo Académico</Label>
                <Select 
                  onValueChange={(value) => setSelectedPeriodo(Number(value))}
                  value={selectedPeriodo?.toString() || ""}
                  disabled={periodos.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                        {periodo.nombre_periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={loadDisponibilidad} 
                  variant="outline" 
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Recargar
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Cargar desde Excel</Label>
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

      {selectedDocente && selectedPeriodo && bloques.length > 0 && (
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
                  {bloquesOrdenados.map(({ hora_inicio, hora_fin, bloques: bloquesDelHorario }) => (
                    <tr key={`${hora_inicio}-${hora_fin}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        {hora_inicio} - {hora_fin}
                      </td>
                      {diasSemana.map((dia) => {
                        const bloqueActual = bloquesDelHorario.find(b => b.dia_semana === dia.id);
                        return (
                          <td 
                            key={`${hora_inicio}-${hora_fin}-${dia.id}`} 
                            className="p-3 text-center"
                          >
                            {bloqueActual ? (
                              <Checkbox
                                checked={isDisponible(dia.id, bloqueActual.bloque_def_id)}
                                onCheckedChange={() => handleToggleDisponibilidad(dia.id, bloqueActual.bloque_def_id)}
                                disabled={isSaving}
                                id={`check-${dia.id}-${bloqueActual.bloque_def_id}`}
                              />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
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

      {bloques.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              No hay bloques horarios disponibles. Por favor, contacte al administrador.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DisponibilidadDocente;
