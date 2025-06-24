import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  BookOpen,
  Users,
  Building,
  UserSquare,
  Loader2,
  Filter
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
}

interface Aula {
  espacio_id: number;
  nombre_espacio: string;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  dia_semana?: number;
}

interface Materia {
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface HorarioAsignado {
  horario_id: number;
  grupo: number;
  docente: number;
  espacio: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  materia: number;
  grupo_detalle: Grupo;
  materia_detalle: Materia;
  docente_detalle: Docente;
  espacio_detalle: Aula;
}

interface HorarioCelda {
  bloqueId: number;
  diaId: number;
  materia: string;
  docente: string;
  aula: string;
  grupo: string;
  color: string;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

// Generate a color based on string (for consistent colors per materia/docente)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsla(${hue}, 80%, 85%, 0.85)`;
};

const ReportesHorarios = () => {
  const { user, role } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("grupo");
  
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [horarios, setHorarios] = useState<HorarioAsignado[]>([]);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  
  const [horariosCeldas, setHorariosCeldas] = useState<HorarioCelda[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      try {
        // Load active academic periods (respuesta paginada)
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        // Load time blocks (respuesta NO paginada)
        const bloquesData = await fetchData<BloqueHorario[]>("scheduling/bloques-horarios/");
        if (bloquesData && Array.isArray(bloquesData)) {
          setBloques(bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        } else {
          setBloques([]);
        }
        // Load academic units (respuesta paginada)
        const unidadesResponse = await fetchData<{ results: UnidadAcademica[] }>("academic-setup/unidades-academicas/");
        const unidadesData = unidadesResponse?.results ?? [];
        setUnidades(unidadesData);
        // Selección automática de la primera unidad académica
        if (unidadesData.length > 0 && !selectedUnidad) {
          setSelectedUnidad(unidadesData[0].unidad_id);
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
        try {
          // Load carreras (respuesta paginada)
          const carrerasResponse = await fetchData<{ results: Carrera[] }>(`academic-setup/carreras/?unidad=${selectedUnidad}`);
          const carrerasData = carrerasResponse?.results ?? [];
          setCarreras(Array.isArray(carrerasData) ? carrerasData : []);
          // Load aulas for this unidad (respuesta paginada)
          const aulasResponse = await fetchData<{ results: Aula[] }>(`academic-setup/espacios-fisicos/?unidad=${selectedUnidad}`);
          const aulasData = aulasResponse?.results ?? [];
          setAulas(Array.isArray(aulasData) ? aulasData : []);
          // Load docentes for this unidad (respuesta paginada)
          const docentesResponse = await fetchData<{ results: Docente[] }>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          const docentesData = docentesResponse?.results ?? [];
          setDocentes(Array.isArray(docentesData) ? docentesData : []);
          setSelectedCarrera(null);
          setSelectedGrupo(null);
          setSelectedAula(null);
          setSelectedDocente(null);
        } catch (error) {
          console.error("Error loading carreras:", error);
          toast.error("Error al cargar las carreras");
        }
      };
      loadCarreras();
    }
  }, [selectedUnidad]);
  
  // Load grupos when carrera changes
  useEffect(() => {
    if (selectedCarrera && selectedPeriodo) {
      const loadGruposYMaterias = async () => {
        try {
          // Load grupos (respuesta paginada)
          const gruposResponse = await fetchData<{ results: Grupo[] }>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          const gruposData = gruposResponse?.results ?? [];
          setGrupos(Array.isArray(gruposData) ? gruposData : []);
          // Load materias for this carrera
          const materiasResponse = await fetchData<{ materias: Materia[] }>(`academic-setup/materias/por-carrera/${selectedCarrera}/`);
          const materiasData = materiasResponse?.materias ?? [];
          setMaterias(Array.isArray(materiasData) ? materiasData : []);
          setSelectedGrupo(null);
        } catch (error) {
          console.error("Error loading grupos/materias:", error);
          toast.error("Error al cargar los grupos y materias");
        }
      };
      loadGruposYMaterias();
    }
  }, [selectedCarrera, selectedPeriodo]);
  
  // Load horarios when filters change
  useEffect(() => {
    if (String(role).toLowerCase() === 'docente') {
      if (selectedPeriodo && selectedDocente && activeTab === 'docente') {
        loadHorarios();
      }
    } else {
      if (selectedPeriodo) {
        loadHorarios();
      }
    }
    // eslint-disable-next-line
  }, [selectedPeriodo, selectedGrupo, selectedDocente, selectedAula, activeTab, role]);
  
  // Selección automática para docentes
  useEffect(() => {
    if (String(role).toLowerCase() === 'docente' && user && user.docente_id) {
      console.log('Seleccionando docente:', user.docente_id);
      setSelectedDocente(user.docente_id);
      setActiveTab('docente');
    }
  }, [role, user]);
  
  const loadHorarios = async () => {
    setIsLoading(true);
    setHorarios([]); // Limpiar horarios antes de cargar
    setHorariosCeldas([]); // Limpiar celdas

    if (!selectedPeriodo) {
        setIsLoading(false);
        return;
    }

    let endpoint = `scheduling/horarios-asignados/?periodo=${selectedPeriodo}`;
    
    // Construir el endpoint basado en la pestaña activa y el filtro seleccionado
    const tabFilterMap = {
      grupo: selectedGrupo,
      docente: selectedDocente,
      aula: selectedAula,
    };
    
    if (activeTab in tabFilterMap && tabFilterMap[activeTab as keyof typeof tabFilterMap]) {
        endpoint += `&${activeTab}=${tabFilterMap[activeTab as keyof typeof tabFilterMap]}`;
    }

    try {
      const response = await client.get<{ count: number; next: string | null; previous: string | null; results: HorarioAsignado[] }>(endpoint);
      const horariosData = response.data?.results ?? [];
      
      if (!Array.isArray(horariosData)) {
          console.error("La respuesta de la API de horarios no es un array:", horariosData);
          toast.error("Formato de datos de horarios inesperado.");
          setHorarios([]);
      } else {
          setHorarios(horariosData);
      }

    } catch (error) {
      console.error("Error loading horarios:", error);
      toast.error("No se pudieron cargar los horarios.");
      setHorarios([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportToExcel = async () => {
    if (!selectedPeriodo) {
      toast.error("Seleccione un periodo para exportar");
      return;
    }
    
    setIsExporting(true);
    
    let endpoint = `scheduling/acciones-horario/exportar-horarios-excel/?periodo_id=${selectedPeriodo}`;
    
    if (selectedGrupo) {
      endpoint += `&grupo=${selectedGrupo}`;
    } else if (selectedCarrera) {
      endpoint += `&carrera=${selectedCarrera}`;
    }
    
    if (selectedDocente) {
      endpoint += `&docente=${selectedDocente}`;
    }
    
    if (selectedAula) {
      endpoint += `&espacio=${selectedAula}`;
    }
    
    try {
      // Asegurarse que endpoint no tenga slash inicial
      if (endpoint.startsWith('/')) {
        endpoint = endpoint.slice(1);
      }
      const response = await client.get(endpoint, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const currentDate = new Date().toISOString().slice(0, 10);
      const periodoName = periodos.find(p => p.periodo_id === selectedPeriodo)?.nombre_periodo || 'periodo';
      
      a.download = `horarios_${periodoName}_${currentDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Horario exportado correctamente");
    } catch (error) {
      console.error("Error exporting schedule:", error);
      toast.error("Error al exportar el horario");
    } finally {
      setIsExporting(false);
    }
  };
  
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = `
        <div style="padding: 20px;">
          <h1 style="text-align: center; margin-bottom: 20px;">Horario Académico</h1>
          ${printContents}
        </div>
      `;
      
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };
  
  const getHorarioPorDiaBloque = (diaId: number, bloqueId: number): HorarioCelda | null => {
    return horariosCeldas.find(h => h.diaId === diaId && h.bloqueId === bloqueId) || null;
  };
  
  // Procesar los datos para la tabla/grid cuando cambian los horarios
  useEffect(() => {
    if (horarios.length > 0) {
      console.log('Horarios recibidos:', horarios);
      const celdas: HorarioCelda[] = [];
      for (const horario of horarios) {
        const materia = horario.materia_detalle;
        const docente = horario.docente_detalle;
        const aula = horario.espacio_detalle;
        const grupo = horario.grupo_detalle;

        // Log para depurar cada horario
        console.log('Procesando horario:', {
          materia,
          docente,
          aula,
          grupo,
          horario
        });

        if (materia) {
          const color = stringToColor(materia.nombre_materia);
          celdas.push({
            bloqueId: horario.bloque_horario,
            diaId: horario.dia_semana,
            materia: materia.nombre_materia,
            docente: docente ? `${docente.nombres} ${docente.apellidos}` : 'N/A',
            aula: aula ? aula.nombre_espacio : 'N/A',
            grupo: grupo ? grupo.codigo_grupo : 'N/A',
            color
          });
        }
      }
      console.log('Celdas generadas:', celdas);
      setHorariosCeldas(celdas);
    } else {
      setHorariosCeldas([]);
    }
  }, [horarios]);

  // Agrupar bloques horarios por franja horaria única (ignorando el día)
  const bloquesUnicos = Array.from(
    new Map(
      bloques.map(b => [`${b.hora_inicio}-${b.hora_fin}`, b])
    ).values()
  );

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Reportes de Horarios" 
        description="Visualice y exporte horarios académicos filtrados por diferentes criterios"
      />
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <Tabs 
            defaultValue="grupo" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grupo" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Por Grupo
                </TabsTrigger>
                <TabsTrigger value="docente" className="flex items-center">
                  <UserSquare className="h-4 w-4 mr-2" />
                  Por Docente
                </TabsTrigger>
                <TabsTrigger value="aula" className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Por Aula
                </TabsTrigger>
              </TabsList>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                  className="flex items-center"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Exportar a Excel
                </Button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
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
                    {periodos.filter(p => p && p.periodo_id != null).map((periodo) => (
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
                    {unidades.filter(u => u && u.unidad_id != null).map((unidad) => (
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
                  value={selectedCarrera?.toString() || "all"}
                  onValueChange={(value) => setSelectedCarrera(value === "all" ? null : Number(value))}
                  disabled={!selectedUnidad}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar carrera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {carreras.filter(c => c && c.carrera_id != null).map((carrera) => (
                      <SelectItem key={carrera.carrera_id} value={carrera.carrera_id.toString()}>
                        {carrera.nombre_carrera}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="grupo" className="mt-0">
              <div>
                <Label htmlFor="grupo">Grupo/Sección</Label>
                <Select 
                  value={selectedGrupo?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedGrupo(value === "all" ? null : Number(value));
                    setSelectedDocente(null);
                    setSelectedAula(null);
                  }}
                  disabled={!selectedCarrera}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {grupos.filter(g => g && g.grupo_id != null).map((grupo) => {
                      // Since a group can have multiple materias, we simplify the display.
                      // A better approach might be a multi-level select or a different UI.
                      return (
                        <SelectItem key={grupo.grupo_id} value={grupo.grupo_id.toString()}>
                          {grupo.codigo_grupo}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="docente" className="mt-0">
              <div>
                <Label htmlFor="docente">Docente</Label>
                <Select 
                  value={selectedDocente?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedDocente(value === "all" ? null : Number(value));
                    setSelectedGrupo(null);
                    setSelectedAula(null);
                  }}
                  disabled={String(role).toLowerCase() === 'docente' || !selectedUnidad}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {String(role).toLowerCase() === 'docente' && user && user.docente_id
                        ? `${user.first_name ?? user.nombres ?? ''} ${user.last_name ?? user.apellidos ?? ''}`.trim()
                        : selectedDocente
                          ? ((docentes.find(d => d.docente_id === selectedDocente)?.first_name ?? docentes.find(d => d.docente_id === selectedDocente)?.nombres ?? '') + ' ' + (docentes.find(d => d.docente_id === selectedDocente)?.last_name ?? docentes.find(d => d.docente_id === selectedDocente)?.apellidos ?? ''))
                          : "Todos los docentes"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentes.filter(d => d && d.docente_id != null).map((docente) => (
                      <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                        {(docente.first_name ?? docente.nombres ?? '') + ' ' + (docente.last_name ?? docente.apellidos ?? '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="aula" className="mt-0">
              <div>
                <Label htmlFor="aula">Aula</Label>
                <Select 
                  value={selectedAula?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedAula(value === "all" ? null : Number(value));
                    setSelectedGrupo(null);
                    setSelectedDocente(null);
                  }}
                  disabled={!selectedUnidad}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las aulas</SelectItem>
                    {aulas.filter(a => a && a.espacio_id != null).map((aula) => (
                      <SelectItem key={aula.espacio_id} value={aula.espacio_id.toString()}>
                        {aula.nombre_espacio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-academic-primary" />
        </div>
      ) : (
        horarios.length > 0 ? (
          <div ref={printRef} className="bg-white p-4 rounded-md shadow">
            <h3 className="text-xl font-bold mb-4 text-center">
                Horario del {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}: {
                    activeTab === 'grupo' ? grupos.find(g => g.grupo_id === selectedGrupo)?.codigo_grupo :
                    activeTab === 'docente' ? docentes.find(d => d.docente_id === selectedDocente)?.nombres :
                    aulas.find(a => a.espacio_id === selectedAula)?.nombre_espacio
                }
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-600">HORARIO</th>
                    {diasSemana.map(dia => (
                      <th key={dia.id} className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-600">
                        {dia.nombre.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloquesUnicos.map((bloque) => (
                    <tr key={`${bloque.hora_inicio}-${bloque.hora_fin}`}>
                      <td className="p-4 font-medium border-r">
                        {bloque.hora_inicio} - {bloque.hora_fin}
                      </td>
                      {diasSemana.map((dia) => {
                        // Buscar el bloque real para este día y franja
                        const bloqueDia = bloques.find(
                          b => b.hora_inicio === bloque.hora_inicio && b.hora_fin === bloque.hora_fin && b.dia_semana === dia.id
                        );
                        // Buscar la celda de horario asignado para este día y franja
                        const celda = horariosCeldas.find(
                          h => h.diaId === dia.id && h.bloqueId === (bloqueDia ? bloqueDia.bloque_def_id : -1)
                        );
                        return (
                          <td key={dia.id} className="p-4 text-center border-r">
                            {celda ? (
                              <div style={{ background: celda.color, borderRadius: 4, padding: 4 }}>
                                <div className="font-semibold text-xs">{celda.materia}</div>
                                <div className="text-xs">{celda.docente}</div>
                                <div className="text-xs">Aula: {celda.aula}</div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !isLoading && <div className="text-center py-10 text-gray-500">No hay horarios asignados para los filtros seleccionados.</div>
        )
      )}
    </div>
  );
};

export default ReportesHorarios;