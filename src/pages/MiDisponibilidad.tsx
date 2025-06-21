import { useState, useEffect, useCallback } from "react";
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

// Interfaces
interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  turno: string;
  dia_semana: number;
  nombre_bloque: string;
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

type AxiosError = {
  response?: {
    data?: {
      non_field_errors?: string[];
    };
  };
};

const MiDisponibilidad = () => {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadBloque[]>([]);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docenteId = user?.docente_id;

  // Carga de datos inicial (periodos y bloques)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        } else {
          setPeriodos([]);
        }

        const bloquesResponse = await fetchData<{ results: BloqueHorario[] }>("scheduling/bloques-horarios/?page_size=100");
        const bloquesData = bloquesResponse?.results ?? [];
        if (bloquesData.length > 0) {
          setBloques(bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        } else {
          setBloques([]);
        }
      } catch (err) {
        setError("Error al cargar los datos iniciales.");
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Carga de la disponibilidad del docente
  const loadDisponibilidad = useCallback(async () => {
    if (!docenteId || !selectedPeriodo) {
      if (disponibilidad.length > 0) setDisponibilidad([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get(`/scheduling/disponibilidad-docentes/?docente=${docenteId}&periodo=${selectedPeriodo}`);
      setDisponibilidad(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError("Error al cargar la disponibilidad.");
      toast.error("Error al cargar la disponibilidad");
      setDisponibilidad([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodo, docenteId]);

  useEffect(() => {
    loadDisponibilidad();
  }, [loadDisponibilidad]);

  const handleToggleDisponibilidad = async (dia_id: number, bloque_id: number) => {
    if (!docenteId || !selectedPeriodo || isSaving) return;

    const existeBloque = disponibilidad.find(d => d.dia_semana === dia_id && d.bloque_horario === bloque_id);
    setIsSaving(true);
    try {
      if (existeBloque) {
        await client.patch(`/scheduling/disponibilidad-docentes/${existeBloque.disponibilidad_id}/`, {
          esta_disponible: !existeBloque.esta_disponible
        });
      } else {
        const newDisponibilidad = {
          docente: docenteId,
          periodo: selectedPeriodo,
          dia_semana: dia_id,
          bloque_horario: bloque_id,
          esta_disponible: true
        };
        await client.post('/scheduling/disponibilidad-docentes/', newDisponibilidad);
      }
      toast.success("Disponibilidad actualizada");
      await loadDisponibilidad();
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.data?.non_field_errors) {
        toast.error(axiosError.response.data.non_field_errors[0]);
      } else {
        toast.error("Error al actualizar la disponibilidad");
      }
      await loadDisponibilidad();
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
      toast.error("Seleccione un archivo y un periodo.");
      return;
    }
    if (!docenteId) {
      toast.error("No se ha podido identificar al docente.");
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("periodo_id", selectedPeriodo.toString());
    formData.append("docente_id", docenteId.toString());

    try {
      await client.post("/scheduling/acciones-horario/importar-disponibilidad-excel/", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Archivo subido y procesado con éxito.");
      await loadDisponibilidad();
      setFile(null);
    } catch (error) {
      toast.error("Error al subir el archivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const getBloquesPorTurno = (turno: string) => {
    return bloques
      .filter(b => b.turno === turno)
      .filter((b, index, self) => self.findIndex(t => t.hora_inicio === b.hora_inicio) === index);
  };

  const turnos = [
    { id: "M", nombre: "Mañana" },
    { id: "T", nombre: "Tarde" },
    { id: "N", nombre: "Noche" }
  ];

  const isDisponible = (dia_id: number, bloque_id: number): boolean => {
    const bloque = disponibilidad.find(d => d.dia_semana === dia_id && d.bloque_horario === bloque_id);
    return bloque ? bloque.esta_disponible : false;
  };
  
  const getBloqueId = (dia_id: number, hora_inicio: string): number | undefined => {
    return bloques.find(b => b.dia_semana === dia_id && b.hora_inicio === hora_inicio)?.bloque_def_id;
  };

  if (isLoading && !periodos.length) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <PageHeader title="Mi Disponibilidad" description="Configure los horarios en los que está disponible para enseñar." />
      
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Controles */}
            <div className="md:col-span-1 space-y-4">
              <div>
                <Label htmlFor="periodo">Periodo Académico</Label>
                <Select
                  value={selectedPeriodo?.toString()}
                  onValueChange={(value) => setSelectedPeriodo(Number(value))}
                  disabled={!periodos.length}
                >
                  <SelectTrigger id="periodo">
                    <SelectValue placeholder="Seleccione un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map(p => (
                      <SelectItem key={p.periodo_id} value={p.periodo_id.toString()}>
                        {p.nombre_periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={loadDisponibilidad} 
                  variant="outline" 
                  disabled={isLoading || isSaving}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Recargar
                </Button>
              </div>
            </div>

            {/* Carga desde Excel */}
            <div className="md:col-span-2 space-y-4">
               <div className="border p-4 rounded-lg">
                <p className="font-medium mb-2">Cargar desde Excel</p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Input 
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="flex-grow"
                  />
                  <Button onClick={handleFileUpload} disabled={isUploading || !file}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Subir
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Formato: Excel con columnas Día, Bloque, Disponible (1/0)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedPeriodo ? (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 font-medium text-gray-600">Hora</th>
                    {diasSemana.map(dia => (
                      <th key={dia.id} className="p-3 font-medium text-gray-600">{dia.nombre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {turnos.map(turno => (
                    <>
                      <tr key={`${turno.id}-header`} className="bg-gray-50">
                        <td colSpan={7} className="py-2 px-3 text-left font-semibold text-gray-700">{turno.nombre}</td>
                      </tr>
                      {getBloquesPorTurno(turno.id).map(bloque => (
                        <tr key={bloque.bloque_def_id} className="border-b">
                          <td className="p-3 font-mono bg-gray-50">{bloque.hora_inicio.slice(0, 5)} - {bloque.hora_fin.slice(0, 5)}</td>
                          {diasSemana.map(dia => {
                            const bloqueId = getBloqueId(dia.id, bloque.hora_inicio);
                            return (
                              <td key={dia.id} className="p-3">
                                {bloqueId ? (
                                  <Checkbox
                                    checked={isDisponible(dia.id, bloqueId)}
                                    onCheckedChange={() => handleToggleDisponibilidad(dia.id, bloqueId)}
                                    disabled={isSaving}
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <p>Seleccione un periodo académico para ver o editar su disponibilidad.</p>
        </div>
      )}
    </div>
  );
};

export default MiDisponibilidad; 