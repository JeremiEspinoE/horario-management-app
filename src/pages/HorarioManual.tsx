import { useState, useEffect } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData, getItemById } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Calendar, Clock, BookOpen, Building, Users, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface CarreraDetalle {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  unidad_nombre: string;
}

interface MateriaDetalle {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre: string | null;
  estado: boolean;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
  materias_detalle: MateriaDetalle[];
  carrera: number;
  carrera_detalle: CarreraDetalle;
  periodo: number;
  periodo_nombre: string;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente: number | null;
  docente_asignado_directamente_nombre: string | null;
}

interface Materia {
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  carrera: number;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Aula {
  espacio_id: number;
  nombre_espacio: string;
  tipo_espacio: number;
  capacidad: number;
  ubicacion: string;
  unidad: number;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Horario {
  horario_id?: number;
  grupo: number;
  dia_semana: number;
  bloque_horario: number;
  docente: number;
  espacio: number;
  materia: number;
}

interface DisponibilidadDocente {
  disponibilidad_id: number;
  docente: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  esta_disponible: boolean;
  bloque_horario_detalle?: {
    bloque_def_id: number;
    nombre_bloque: string;
    hora_inicio: string;
    hora_fin: string;
    turno: string;
    turno_display: string;
    dia_semana: number;
    dia_semana_display: string;
  };
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
  const [carreras, setCarreras] = useState<CarreraDetalle[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
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
  
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [materiasGrupo, setMateriasGrupo] = useState<MateriaDetalle[]>([]);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load active periods (respuesta paginada)
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        // Load academic units (respuesta paginada)
        const unidadesResponse = await fetchData<{ results: UnidadAcademica[] }>("academic-setup/unidades-academicas/");
        const unidadesData = unidadesResponse?.results ?? [];
        if (unidadesData.length > 0) {
          setUnidades(unidadesData);
        }
        // Load time blocks (respuesta paginada)
        const bloquesResponse = await fetchData<{ results: BloqueHorario[] }>("scheduling/bloques-horarios/");
        const bloquesData = bloquesResponse?.results ?? [];
        if (bloquesData.length > 0) {
          setBloques(bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
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
          // Load carreras (respuesta paginada)
          const carrerasResponse = await fetchData<{ results: CarreraDetalle[] }>(`academic-setup/carreras/?unidad=${selectedUnidad}`);
          const carrerasData = carrerasResponse?.results ?? [];
          setCarreras(carrerasData);
          setSelectedCarrera(null);
          setGrupos([]);
          setSelectedGrupo(null);
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
          // Load grupos (respuesta paginada)
          const gruposResponse = await fetchData<{ results: Grupo[] }>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          const gruposData = gruposResponse?.results ?? [];
          setGrupos(gruposData);
          setSelectedGrupo(null);
          // Load materias for this carrera (respuesta paginada)
          const materiasResponse = await fetchData<{ results: Materia[] }>(`academic-setup/materias/?carrera=${selectedCarrera}`);
          const materiasData = materiasResponse?.results ?? [];
          setMaterias(materiasData);
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
  
  // Helper function to fetch all paginated data
  const fetchAllPaginatedData = async <T,>(url: string): Promise<T[]> => {
    const items: T[] = [];
    let nextUrl: string | null = url;
    while (nextUrl) {
      try {
        const response = await client.get(nextUrl);
        items.push(...response.data.results);
        nextUrl = response.data.next;
        if (nextUrl) {
          // Convert absolute URL to relative path for the next request
          const urlObject = new URL(nextUrl);
          nextUrl = urlObject.pathname.replace('/api/', '') + urlObject.search;
        }
      } catch (error) {
        console.error(`Error fetching paginated data from ${nextUrl}:`, error);
        break;
      }
    }
    return items;
  };

  // Load aulas, docentes, and existing horarios when unidad and grupo are selected
  useEffect(() => {
    if (selectedUnidad && selectedGrupo && selectedPeriodo) {
      const loadAsignacionData = async () => {
        setIsLoading(true);
        try {
          // Load ALL classrooms for this unit
          const allAulas = await fetchAllPaginatedData<Aula>(`academic-setup/espacios-fisicos/?unidad=${selectedUnidad}`);
          setAulas(allAulas);
          
          // Load teachers for this unit (respuesta paginada)
          const docentesResponse = await fetchData<{ results: Docente[] }>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          const docentesData = docentesResponse?.results ?? [];
          setDocentes(docentesData);
          // Load existing schedules for this grupo and periodo (respuesta paginada)
          const horariosResponse = await fetchData<{ results: Horario[] }>(`scheduling/horarios-asignados/?grupo=${selectedGrupo}&periodo=${selectedPeriodo}`);
          const horariosData = horariosResponse?.results ?? [];
          setHorarios(horariosData);
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
      fetch(`http://localhost:8000/api/scheduling/disponibilidad-docentes/?docente=${selectedDocente}&periodo=${selectedPeriodo}`)
        .then(res => res.json())
        .then(data => {
          console.log("Respuesta de disponibilidad:", data);
          setDisponibilidadDocentes(data); // data es el array plano
        });
    }
  }, [selectedDocente, selectedPeriodo]);
  
  // Efecto para cargar docentes, aulas y bloques faltantes tras cargar horarios
  useEffect(() => {
    if (horarios.length === 0) return;

    // Docentes faltantes
    const docenteIdsEnHorarios = Array.from(new Set(horarios.map(h => h.docente)));
    const docenteIdsLocales = new Set(docentes.map(d => d.docente_id));
    const docentesFaltantes = docenteIdsEnHorarios.filter(id => !docenteIdsLocales.has(id));

    // Aulas faltantes
    const aulaIdsEnHorarios = Array.from(new Set(horarios.map(h => h.espacio)));
    const aulaIdsLocales = new Set(aulas.map(a => a.espacio_id));
    const aulasFaltantes = aulaIdsEnHorarios.filter(id => !aulaIdsLocales.has(id));

    // Bloques faltantes
    const bloqueIdsEnHorarios = Array.from(new Set(horarios.map(h => h.bloque_horario)));
    const bloqueIdsLocales = new Set(bloques.map(b => b.bloque_def_id));
    const bloquesFaltantes = bloqueIdsEnHorarios.filter(id => !bloqueIdsLocales.has(id));

    // Función para cargar y agregar los faltantes
    const cargarFaltantes = async () => {
      // Docentes
      for (const id of docentesFaltantes) {
        const docente = await getItemById<Docente>("users/docentes/", id);
        if (docente) setDocentes(prev => [...prev, docente]);
      }
      // Aulas
      for (const id of aulasFaltantes) {
        const aula = await getItemById<Aula>("academic-setup/espacios-fisicos/", id);
        if (aula) setAulas(prev => [...prev, aula]);
      }
      // Bloques
      for (const id of bloquesFaltantes) {
        const bloque = await getItemById<BloqueHorario>("scheduling/bloques-horarios/", id);
        if (bloque) setBloques(prev => [...prev, bloque]);
      }
    };

    cargarFaltantes();
    // Solo cuando cambian los horarios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horarios]);
  
  // Cuando se selecciona un grupo, cargar materias del grupo
  useEffect(() => {
    if (selectedGrupo) {
      const grupo = grupos.find(g => g.grupo_id === selectedGrupo);
      setMateriasGrupo(grupo?.materias_detalle || []);
      setSelectedMateria(null);
      setDocentes([]); // Limpiar docentes hasta que se seleccione materia
    }
  }, [selectedGrupo]);

  // Cuando se selecciona una materia, cargar docentes válidos para esa materia y resetear el docente seleccionado
  useEffect(() => {
    if (selectedMateria) {
      setSelectedDocente(null);
      fetch(`http://localhost:8000/api/users/docentes/por-materia/?materia_id=${selectedMateria}`)
        .then(res => res.json())
        .then(data => {
          console.log("Respuesta cruda de docentes:", data);
          setDocentes(data);
        });
    } else {
      setDocentes([]);
      setSelectedDocente(null);
    }
  }, [selectedMateria]);
  
  // Resetear bloque seleccionado al cambiar de docente o día
  useEffect(() => {
    setSelectedBloque(null);
  }, [selectedDocente, selectedDia]);

  console.log("selectedDocente:", selectedDocente, typeof selectedDocente);
  console.log("selectedDia:", selectedDia, typeof selectedDia);
  console.log("disponibilidadDocentes:", disponibilidadDocentes);

  const bloquesDisponibles = disponibilidadDocentes
    .filter(d =>
      Number(d.docente) === Number(selectedDocente) &&
      Number(d.dia_semana) === Number(selectedDia) &&
      d.esta_disponible &&
      (d as any).bloque_horario_detalle
    )
    .map(d => (d as any).bloque_horario_detalle);
  
  const getMateriaPorGrupo = (grupoId: number): MateriaDetalle | undefined => {
    const grupo = grupos.find(g => g.grupo_id === grupoId);
    return grupo?.materias_detalle.find(m => m.materia_id === grupo.materias[0]);
  };
  
  const getMateriaHorasTotales = (materiaId: number): number => {
    const materia = materias.find(m => m.materia_id === materiaId);
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
    const grupo = grupos.find(g => g.grupo_id === selectedGrupo);
    const bloque = bloques.find(b => b.bloque_def_id === selectedBloque);
    
    if (grupo && bloque) {
      const ciclo = Math.ceil(grupo.carrera_detalle.horas_totales_curricula / 2); // Simplified calculation
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
        materia: selectedMateria,
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
      setHorarios(horarios.filter(h => h.horario_id !== horarioId));
      
      toast.success("Horario eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando horario:", error);
      toast.error("Error al eliminar el horario");
    }
  };
  
  console.log("Docentes en el select:", docentes);

  // Filtrar aulas según el tipo de espacio requerido por la materia seleccionada
  const materiaSeleccionada = materiasGrupo.find(m => m.materia_id === selectedMateria);
  const tipoEspacioRequerido = materiaSeleccionada?.requiere_tipo_espacio_especifico;

  console.log("Materia seleccionada:", materiaSeleccionada);
  console.log("Tipo de espacio requerido (ID):", tipoEspacioRequerido);
  console.log("Aulas disponibles (antes de filtrar):", aulas);

  const aulasFiltradas = aulas.filter(aula => {
    if (!tipoEspacioRequerido) {
      return true; // Si no se requiere tipo, mostrar todas
    }
    return Number(aula.tipo_espacio) === Number(tipoEspacioRequerido);
  });

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
                        <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                          {periodo.nombre_periodo}
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
                       {unidades
                        .filter((unidad) => unidad?.unidad_id !== undefined)
                          .map((unidad) => (
                            <SelectItem key={unidad.unidad_id} value={unidad.unidad_id.toString()}>
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
                        <SelectItem key={carrera.carrera_id} value={carrera.carrera_id.toString()}>
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
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.grupo_id} value={grupo.grupo_id.toString()}>
                          {grupo.codigo_grupo} - {grupo.materias_detalle?.map(m => m.nombre_materia).join(', ') || '(Sin materias asignadas)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedGrupo && (
                <div className="bg-gray-50 p-4 rounded-md mt-4">
                  <h4 className="font-medium mb-2">Información del Grupo</h4>
                  
                  {(() => {
                    const grupo = grupos.find(g => g.grupo_id === selectedGrupo);
                    
                    if (!grupo) {
                      return <p>No se encontró información del grupo.</p>;
                    }
                    
                    const materiaPrincipal = grupo.materias_detalle?.[0];
                    if (!materiaPrincipal) {
                      return <p>Este grupo no tiene materias asignadas.</p>;
                    }

                    const horasTotales = materiaPrincipal.horas_academicas_teoricas + materiaPrincipal.horas_academicas_practicas;
                    const horasAsignadas = getHorasAsignadasGrupo(grupo.grupo_id);
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>{materiaPrincipal.nombre_materia}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-academic-primary" />
                          <span>Horas necesarias: {horasTotales} ({materiaPrincipal.horas_academicas_teoricas} teóricas + {materiaPrincipal.horas_academicas_practicas} prácticas)</span>
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
                      <Label htmlFor="materia">Materia</Label>
                      <Select
                        value={selectedMateria?.toString() || ""}
                        onValueChange={value => setSelectedMateria(Number(value))}
                        disabled={!selectedGrupo}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar materia" />
                        </SelectTrigger>
                        <SelectContent>
                          {materiasGrupo.map(materia => (
                            <SelectItem key={materia.materia_id} value={materia.materia_id.toString()}>
                              {materia.nombre_materia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="docente">Docente</Label>
                      <Select
                        value={selectedDocente?.toString() || ""}
                        onValueChange={(value) => setSelectedDocente(Number(value))}
                        disabled={!selectedMateria || docentes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={docentes.length === 0 ? "No hay docentes válidos" : "Seleccionar docente"} />
                        </SelectTrigger>
                        <SelectContent>
                          {docentes.map((docente) => (
                            <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                              {docente.nombres} {docente.apellidos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="aula">Aula</Label>
                      <Select
                        value={selectedAula?.toString() || ""}
                        onValueChange={(value) => setSelectedAula(Number(value))}
                        disabled={aulasFiltradas.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={aulasFiltradas.length === 0 ? "No hay aulas disponibles" : "Seleccionar aula"} />
                        </SelectTrigger>
                        <SelectContent>
                          {aulasFiltradas.map((aula) => (
                            <SelectItem key={aula.espacio_id} value={aula.espacio_id.toString()}>
                              {aula.nombre_espacio} (Cap: {aula.capacidad})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
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
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bloque">Bloque Horario</Label>
                      <Select
                        value={selectedBloque?.toString() || ""}
                        onValueChange={(value) => setSelectedBloque(Number(value))}
                        disabled={!selectedDocente || !selectedDia || bloquesDisponibles.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={bloquesDisponibles.length === 0 ? "No hay bloques disponibles" : "Seleccionar bloque"} />
                        </SelectTrigger>
                        <SelectContent>
                          {bloquesDisponibles.map((bloque) => (
                            <SelectItem key={bloque.bloque_def_id} value={bloque.bloque_def_id.toString()}>
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
                          <th className="p-3 text-left">Materia</th>
                          <th className="p-3 text-left">Docente</th>
                          <th className="p-3 text-left">Aula</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {horarios.map((horario: Horario) => {
                          const dia = diasSemana.find(d => d.id === horario.dia_semana);
                          const bloque = bloques.find(b => b.bloque_def_id === horario.bloque_horario);
                          const docente = docentes.find(d => d.docente_id === horario.docente);
                          const aula = aulas.find(a => a.espacio_id === horario.espacio);
                          const materia = materias.find(m => m.materia_id === horario.materia);
                          
                          return (
                            <tr key={horario.horario_id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{dia?.nombre || `Día ID: ${horario.dia_semana}`}</td>
                              <td className="p-3">{bloque ? `${bloque.hora_inicio} - ${bloque.hora_fin}` : `Bloque ID: ${horario.bloque_horario}`}</td>
                              <td className="p-3">{materia?.nombre_materia || `Materia ID: ${horario.materia}`}</td>
                              <td className="p-3">{docente ? `${docente.nombres} ${docente.apellidos}` : `Docente ID: ${horario.docente}`}</td>
                              <td className="p-3">{aula?.nombre_espacio || `Aula ID: ${horario.espacio}`}</td>
                              <td className="p-3 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteHorario(horario.horario_id)}
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
