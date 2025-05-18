
import { useState, useEffect } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Calendar, Clock, BookOpen, Building, Users, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface UnidadAcademica {
  id: number;
  nombre_unidad: string;
}

interface Carrera {
  id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface Grupo {
  id: number;
  codigo_grupo: string;
  materia: number;
  carrera: number;
  periodo: number;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente?: number;
}

interface Materia {
  id: number;
  nombre_materia: string;
  codigo_materia: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  carrera: number;
}

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Aula {
  id: number;
  nombre_espacio: string;
  tipo_espacio: number;
  capacidad: number;
  ubicacion: string;
  unidad: number;
}

interface BloqueHorario {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface HorarioAsignado {
  id: number;
  grupo: number;
  docente: number;
  espacio: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
}

interface DisponibilidadDocente {
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

const HorarioManual = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [horarios, setHorarios] = useState<HorarioAsignado[]>([]);
  const [disponibilidadDocentes, setDisponibilidadDocentes] = useState<DisponibilidadDocente[]>([]);
  
  // Selected values
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  
  // Assignment form values
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load active periods
        const periodosData = await fetchData<Periodo>("academic/periodos-academicos/?activo=true");
        if (periodosData && periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].id);
        }
        
        // Load academic units
        const unidadesData = await fetchData<UnidadAcademica>("academic/unidades-academicas/");
        if (unidadesData && unidadesData.length > 0) {
          setUnidades(unidadesData);
        }
        
        // Load time blocks
        const bloquesData = await fetchData<BloqueHorario>("scheduling/bloques-horarios/");
        if (bloquesData) {
          setBloques(bloquesData.sort((a, b) => a.orden - b.orden));
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Load carreras when unidad changes
  useEffect(() => {
    if (selectedUnidad) {
      const loadCarreras = async () => {
        setIsLoading(true);
        try {
          const carrerasData = await fetchData<Carrera>(`academic/carreras/?unidad=${selectedUnidad}`);
          if (carrerasData) {
            setCarreras(carrerasData);
            setSelectedCarrera(null);
            setGrupos([]);
            setSelectedGrupo(null);
          }
        } catch (error) {
          console.error("Error loading carreras:", error);
          toast.error("Error al cargar las carreras");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadCarreras();
    }
  }, [selectedUnidad]);
  
  // Load grupos when carrera and periodo changes
  useEffect(() => {
    if (selectedCarrera && selectedPeriodo) {
      const loadGrupos = async () => {
        setIsLoading(true);
        try {
          const gruposData = await fetchData<Grupo>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          if (gruposData) {
            setGrupos(gruposData);
            setSelectedGrupo(null);
          }
          
          // Load materias for this carrera
          const materiasData = await fetchData<Materia>(`academic/materias/?carrera=${selectedCarrera}`);
          if (materiasData) {
            setMaterias(materiasData);
          }
        } catch (error) {
          console.error("Error loading grupos and materias:", error);
          toast.error("Error al cargar los grupos y materias");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadGrupos();
    }
  }, [selectedCarrera, selectedPeriodo]);
  
  // Load aulas, docentes, and existing horarios when unidad and grupo are selected
  useEffect(() => {
    if (selectedUnidad && selectedGrupo && selectedPeriodo) {
      const loadAsignacionData = async () => {
        setIsLoading(true);
        try {
          // Load classrooms for this unit
          const aulasData = await fetchData<Aula>(`academic/espacios-fisicos/?unidad=${selectedUnidad}`);
          if (aulasData) {
            setAulas(aulasData);
          }
          
          // Load teachers for this unit
          const docentesData = await fetchData<Docente>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          if (docentesData) {
            setDocentes(docentesData);
          }
          
          // Load existing schedules for this grupo and periodo
          const horariosData = await fetchData<HorarioAsignado>(`scheduling/horarios-asignados/?grupo=${selectedGrupo}&periodo=${selectedPeriodo}`);
          if (horariosData) {
            setHorarios(horariosData);
          }
          
          // Reset selection form
          setSelectedDocente(null);
          setSelectedAula(null);
          setSelectedDia(null);
          setSelectedBloque(null);
          setValidationError(null);
          
        } catch (error) {
          console.error("Error loading assignment data:", error);
          toast.error("Error al cargar los datos para asignación");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAsignacionData();
    }
  }, [selectedUnidad, selectedGrupo, selectedPeriodo]);
  
  // Load teacher availability when teacher and period are selected
  useEffect(() => {
    if (selectedDocente && selectedPeriodo) {
      const loadDisponibilidad = async () => {
        try {
          const disponibilidadData = await fetchData<DisponibilidadDocente>(`scheduling/disponibilidad-docentes/?docente=${selectedDocente}&periodo=${selectedPeriodo}`);
          if (disponibilidadData) {
            setDisponibilidadDocentes(disponibilidadData);
          }
        } catch (error) {
          console.error("Error loading teacher availability:", error);
          toast.error("Error al cargar la disponibilidad del docente");
        }
      };
      
      loadDisponibilidad();
    }
  }, [selectedDocente, selectedPeriodo]);
  
  const getMateriaPorGrupo = (grupoId: number): Materia | undefined => {
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo) return undefined;
    
    return materias.find(m => m.id === grupo.materia);
  };
  
  const getMateriaHorasTotales = (materiaId: number): number => {
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) return 0;
    
    return materia.horas_academicas_teoricas + materia.horas_academicas_practicas;
  };
  
  const getHorasAsignadasGrupo = (grupoId: number): number => {
    return horarios.filter(h => h.grupo === grupoId).length;
  };
  
  const isDocenteDisponible = (docenteId: number, diaId: number, bloqueId: number): boolean => {
    const disponibilidad = disponibilidadDocentes.find(
      d => d.docente === docenteId && d.dia_semana === diaId && d.bloque_horario === bloqueId
    );
    
    return disponibilidad ? disponibilidad.esta_disponible : false;
  };
  
  const hasConflicto = (diaId: number, bloqueId: number): boolean => {
    // Check if the teacher is already assigned at this time
    const docenteOcupado = horarios.some(
      h => h.docente === selectedDocente && h.dia_semana === diaId && h.bloque_horario === bloqueId
    );
    
    // Check if the classroom is already occupied at this time
    const aulaOcupada = horarios.some(
      h => h.espacio === selectedAula && h.dia_semana === diaId && h.bloque_horario === bloqueId
    );
    
    return docenteOcupado || aulaOcupada;
  };
  
  const validateAsignacion = (): boolean => {
    if (!selectedGrupo || !selectedDocente || !selectedAula || !selectedDia || !selectedBloque || !selectedPeriodo) {
      setValidationError("Todos los campos son obligatorios");
      return false;
    }
    
    // Check if there's already a schedule for this grupo, day and block
    const existeHorario = horarios.some(
      h => h.grupo === selectedGrupo && h.dia_semana === selectedDia && h.bloque_horario === selectedBloque
    );
    
    if (existeHorario) {
      setValidationError("Este grupo ya tiene un horario asignado en este día y bloque");
      return false;
    }
    
    // Check if the teacher is available at this time
    if (!isDocenteDisponible(selectedDocente, selectedDia, selectedBloque)) {
      setValidationError("El docente no está disponible en este horario");
      return false;
    }
    
    // Check if there's a conflict with teacher or classroom
    if (hasConflicto(selectedDia, selectedBloque)) {
      setValidationError("El docente o el aula ya están asignados en este horario");
      return false;
    }
    
    // Check cycle-based time restrictions (simplified version)
    const materia = getMateriaPorGrupo(selectedGrupo);
    const bloque = bloques.find(b => b.id === selectedBloque);
    
    if (materia && bloque) {
      const ciclo = Math.ceil(materia.carrera / 2); // Simplified calculation
      const horaInicio = parseInt(bloque.hora_inicio.split(':')[0]);
      
      if (ciclo <= 3 && (horaInicio < 7 || horaInicio > 13)) {
        setValidationError("Los primeros ciclos (1-3) solo pueden tener clases entre 7:00 y 13:00");
        return false;
      } else if (ciclo >= 4 && ciclo <= 6 && (horaInicio < 13 || horaInicio > 18)) {
        setValidationError("Los ciclos intermedios (4-6) solo pueden tener clases entre 13:00 y 18:00");
        return false;
      } else if (ciclo >= 7 && (horaInicio < 18 || horaInicio > 22)) {
        setValidationError("Los ciclos superiores (7+) solo pueden tener clases entre 18:00 y 22:00");
        return false;
      }
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleAsignar = async () => {
    if (!validateAsignacion()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const nuevaAsignacion = {
        grupo: selectedGrupo,
        docente: selectedDocente,
        espacio: selectedAula,
        periodo: selectedPeriodo,
        dia_semana: selectedDia,
        bloque_horario: selectedBloque
      };
      
      const response = await client.post('scheduling/horarios-asignados/', nuevaAsignacion);
      
      // Add to local state
      setHorarios([...horarios, response.data]);
      
      toast.success("Horario asignado correctamente");
      
      // Reset form
      setSelectedDia(null);
      setSelectedBloque(null);
    } catch (error) {
      console.error("Error asignando horario:", error);
      toast.error("Error al asignar el horario");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteHorario = async (horarioId: number) => {
    if (!confirm("¿Está seguro de eliminar esta asignación de horario?")) {
      return;
    }
    
    try {
      await client.delete(`scheduling/horarios-asignados/${horarioId}/`);
      
      // Remove from local state
      setHorarios(horarios.filter(h => h.id !== horarioId));
      
      toast.success("Horario eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando horario:", error);
      toast.error("Error al eliminar el horario");
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Asignación Manual de Horarios" 
        description="Configure manualmente los horarios para grupos y docentes"
      />
      
      <div className="grid md:grid-cols-12 gap-6">
        {/* Filtros y selección */}
        <div className="md:col-span-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-medium">Selección</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="periodo">Periodo Académico</Label>
                  <Select 
                    value={selectedPeriodo?.toString() || ""}
                    onValueChange={(value) => setSelectedPeriodo(Number(value))}
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
                  <Label htmlFor="unidad">Unidad Académica</Label>
                  <Select 
                    value={selectedUnidad?.toString() || ""}
                    onValueChange={(value) => setSelectedUnidad(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id.toString()}>
                          {unidad.nombre_unidad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="carrera">Carrera</Label>
                  <Select 
                    value={selectedCarrera?.toString() || ""}
                    onValueChange={(value) => setSelectedCarrera(Number(value))}
                    disabled={!selectedUnidad}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar carrera" />
                    </SelectTrigger>
                    <SelectContent>
                      {carreras.map((carrera) => (
                        <SelectItem key={carrera.id} value={carrera.id.toString()}>
                          {carrera.nombre_carrera}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="grupo">Grupo/Sección</Label>
                  <Select 
                    value={selectedGrupo?.toString() || ""}
                    onValueChange={(value) => setSelectedGrupo(Number(value))}
                    disabled={!selectedCarrera || !selectedPeriodo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((grupo) => {
                        const materia = materias.find(m => m.id === grupo.materia);
                        return (
                          <SelectItem key={grupo.id} value={grupo.id.toString()}>
                            {grupo.codigo_grupo} - {materia?.nombre_materia || 'Materia desconocida'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedGrupo && (
                <div className="bg-gray-50 p-4 rounded-md mt-4">
                  <h4 className="font-medium mb-2">Información del Grupo</h4>
                  
                  {(() => {
                    const grupo = grupos.find(g => g.id === selectedGrupo);
                    const materia = grupo ? materias.find(m => m.id === grupo.materia) : null;
                    
                    if (!grupo || !materia) {
                      return <p>No se encontró información del grupo.</p>;
                    }
                    
                    const horasTotales = materia.horas_academicas_teoricas + materia.horas_academicas_practicas;
                    const horasAsignadas = getHorasAsignadasGrupo(grupo.id);
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>{materia.nombre_materia}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>Horas necesarias: {horasTotales} ({materia.horas_academicas_teoricas} teóricas + {materia.horas_academicas_practicas} prácticas)</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>Horas asignadas: {horasAsignadas} de {horasTotales}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>Estudiantes estimados: {grupo.numero_estudiantes_estimado}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>Turno preferente: {grupo.turno_preferente}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Formulario de asignación */}
        <div className="md:col-span-8">
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Asignar Horario</h3>
              
              {selectedGrupo ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="docente">Docente</Label>
                      <Select 
                        value={selectedDocente?.toString() || ""}
                        onValueChange={(value) => setSelectedDocente(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar docente" />
                        </SelectTrigger>
                        <SelectContent>
                          {docentes.map((docente) => (
                            <SelectItem key={docente.id} value={docente.id.toString()}>
                              {docente.nombres} {docente.apellidos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="aula">Aula</Label>
                      <Select 
                        value={selectedAula?.toString() || ""}
                        onValueChange={(value) => setSelectedAula(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar aula" />
                        </SelectTrigger>
                        <SelectContent>
                          {aulas.map((aula) => (
                            <SelectItem key={aula.id} value={aula.id.toString()}>
                              {aula.nombre_espacio} (Cap: {aula.capacidad})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dia">Día</Label>
                      <Select 
                        value={selectedDia?.toString() || ""}
                        onValueChange={(value) => setSelectedDia(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar día" />
                        </SelectTrigger>
                        <SelectContent>
                          {diasSemana.map((dia) => (
                            <SelectItem key={dia.id} value={dia.id.toString()}>
                              {dia.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="bloque">Bloque Horario</Label>
                      <Select 
                        value={selectedBloque?.toString() || ""}
                        onValueChange={(value) => setSelectedBloque(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar bloque" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloques.map((bloque) => (
                            <SelectItem key={bloque.id} value={bloque.id.toString()}>
                              {bloque.hora_inicio} - {bloque.hora_fin}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {validationError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-start">
                      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <p>{validationError}</p>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      onClick={handleAsignar}
                      disabled={
                        isSaving || 
                        !selectedGrupo || 
                        !selectedDocente || 
                        !selectedAula || 
                        !selectedDia || 
                        !selectedBloque || 
                        !selectedPeriodo
                      }
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Asignar Horario
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Seleccione un grupo para comenzar a asignar horarios</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Horarios asignados */}
          {selectedGrupo && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Horarios Asignados</h3>
                
                {horarios.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="p-3 text-left">Día</th>
                          <th className="p-3 text-left">Horario</th>
                          <th className="p-3 text-left">Docente</th>
                          <th className="p-3 text-left">Aula</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {horarios.map((horario) => {
                          const dia = diasSemana.find(d => d.id === horario.dia_semana);
                          const bloque = bloques.find(b => b.id === horario.bloque_horario);
                          const docente = docentes.find(d => d.id === horario.docente);
                          const aula = aulas.find(a => a.id === horario.espacio);
                          
                          return (
                            <tr key={horario.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{dia?.nombre || 'Desconocido'}</td>
                              <td className="p-3">{bloque ? `${bloque.hora_inicio} - ${bloque.hora_fin}` : 'Desconocido'}</td>
                              <td className="p-3">{docente ? `${docente.nombres} ${docente.apellidos}` : 'Desconocido'}</td>
                              <td className="p-3">{aula?.nombre_espacio || 'Desconocido'}</td>
                              <td className="p-3 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteHorario(horario.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  Eliminar
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No hay horarios asignados para este grupo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      )}
    </div>
  );
};

export default HorarioManual;
