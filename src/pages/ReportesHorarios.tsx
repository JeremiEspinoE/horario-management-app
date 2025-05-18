
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

interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface UnidadAcademica {
  id: number;
  nombre_unidad: string;
}

interface Carrera {
  id: number;
  nombre_carrera: string;
  codigo_carrera: string;
}

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Grupo {
  id: number;
  codigo_grupo: string;
  materia: number;
}

interface Aula {
  id: number;
  nombre_espacio: string;
}

interface BloqueHorario {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

interface Materia {
  id: number;
  nombre_materia: string;
  codigo_materia: string;
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
        // Load active academic periods
        const periodosData = await fetchData<Periodo>("academic/periodos-academicos/?activo=true");
        if (periodosData && periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].id);
        }
        
        // Load time blocks
        const bloquesData = await fetchData<BloqueHorario>("scheduling/bloques-horarios/");
        if (bloquesData) {
          setBloques(bloquesData.sort((a, b) => a.orden - b.orden));
        }
        
        // Load academic units
        const unidadesData = await fetchData<UnidadAcademica>("academic/unidades-academicas/");
        if (unidadesData) {
          setUnidades(unidadesData);
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
          const carrerasData = await fetchData<Carrera>(`academic/carreras/?unidad=${selectedUnidad}`);
          if (carrerasData) {
            setCarreras(carrerasData);
          }
          
          // Load aulas for this unidad
          const aulasData = await fetchData<Aula>(`academic/espacios-fisicos/?unidad=${selectedUnidad}`);
          if (aulasData) {
            setAulas(aulasData);
          }
          
          // Load docentes for this unidad
          const docentesData = await fetchData<Docente>(`users/docentes/?unidad_principal=${selectedUnidad}`);
          if (docentesData) {
            setDocentes(docentesData);
          }
          
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
      const loadGrupos = async () => {
        try {
          const gruposData = await fetchData<Grupo>(`scheduling/grupos/?carrera=${selectedCarrera}&periodo=${selectedPeriodo}`);
          if (gruposData) {
            setGrupos(gruposData);
          }
          
          // Load materias for this carrera
          const materiasData = await fetchData<Materia>(`academic/materias/?carrera=${selectedCarrera}`);
          if (materiasData) {
            setMaterias(materiasData);
          }
          
          setSelectedGrupo(null);
        } catch (error) {
          console.error("Error loading grupos:", error);
          toast.error("Error al cargar los grupos");
        }
      };
      
      loadGrupos();
    }
  }, [selectedCarrera, selectedPeriodo]);
  
  // Load horarios when filters change
  useEffect(() => {
    if (selectedPeriodo) {
      loadHorarios();
    }
  }, [selectedPeriodo, selectedGrupo, selectedDocente, selectedAula]);
  
  const loadHorarios = async () => {
    setIsLoading(true);
    
    let endpoint = `scheduling/horarios-asignados/?periodo=${selectedPeriodo}`;
    
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
      const horariosData = await fetchData<HorarioAsignado>(endpoint);
      setHorarios(horariosData || []);
      
      // Process horarios to display format
      if (horariosData) {
        const celdas: HorarioCelda[] = [];
        
        for (const horario of horariosData) {
          const grupo = grupos.find(g => g.id === horario.grupo);
          const materia = grupo ? materias.find(m => m.id === grupo.materia) : null;
          const docente = docentes.find(d => d.id === horario.docente);
          const aula = aulas.find(a => a.id === horario.espacio);
          
          if (materia) {
            const color = stringToColor(materia.nombre_materia);
            
            celdas.push({
              bloqueId: horario.bloque_horario,
              diaId: horario.dia_semana,
              materia: materia?.nombre_materia || 'Desconocida',
              docente: docente ? `${docente.nombres} ${docente.apellidos}` : 'Desconocido',
              aula: aula?.nombre_espacio || 'Desconocida',
              grupo: grupo?.codigo_grupo || 'Desconocido',
              color
            });
          }
        }
        
        setHorariosCeldas(celdas);
      }
    } catch (error) {
      console.error("Error loading horarios:", error);
      toast.error("Error al cargar los horarios");
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
      const response = await client.get(endpoint, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const currentDate = new Date().toISOString().slice(0, 10);
      const periodoName = periodos.find(p => p.id === selectedPeriodo)?.nombre || 'periodo';
      
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
                    <SelectItem value="">Todas las carreras</SelectItem>
                    {carreras.map((carrera) => (
                      <SelectItem key={carrera.id} value={carrera.id.toString()}>
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
                  value={selectedGrupo?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedGrupo(value ? Number(value) : null);
                    setSelectedDocente(null);
                    setSelectedAula(null);
                  }}
                  disabled={!selectedCarrera}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los grupos</SelectItem>
                    {grupos.map((grupo) => {
                      const materia = materias.find(m => m.id === grupo.materia);
                      return (
                        <SelectItem key={grupo.id} value={grupo.id.toString()}>
                          {grupo.codigo_grupo} - {materia?.nombre_materia || 'Desconocida'}
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
                  value={selectedDocente?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedDocente(value ? Number(value) : null);
                    setSelectedGrupo(null);
                    setSelectedAula(null);
                  }}
                  disabled={!selectedUnidad}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar docente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los docentes</SelectItem>
                    {docentes.map((docente) => (
                      <SelectItem key={docente.id} value={docente.id.toString()}>
                        {docente.nombres} {docente.apellidos}
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
                  value={selectedAula?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedAula(value ? Number(value) : null);
                    setSelectedGrupo(null);
                    setSelectedDocente(null);
                  }}
                  disabled={!selectedUnidad}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las aulas</SelectItem>
                    {aulas.map((aula) => (
                      <SelectItem key={aula.id} value={aula.id.toString()}>
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
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 bg-academic-primary/10 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-academic-primary" />
            <h3 className="font-medium text-academic-primary">
              {(() => {
                if (activeTab === 'grupo' && selectedGrupo) {
                  const grupo = grupos.find(g => g.id === selectedGrupo);
                  const materia = grupo ? materias.find(m => m.id === grupo.materia) : null;
                  return `Horario: ${grupo?.codigo_grupo || ''} - ${materia?.nombre_materia || ''}`;
                } else if (activeTab === 'docente' && selectedDocente) {
                  const docente = docentes.find(d => d.id === selectedDocente);
                  return `Horario: ${docente?.nombres || ''} ${docente?.apellidos || ''}`;
                } else if (activeTab === 'aula' && selectedAula) {
                  const aula = aulas.find(a => a.id === selectedAula);
                  return `Horario: Aula ${aula?.nombre_espacio || ''}`;
                } else {
                  return `Horario ${periodos.find(p => p.id === selectedPeriodo)?.nombre || ''}`;
                }
              })()}
            </h3>
          </div>
          
          <div className="p-6" ref={printRef}>
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Horario
                    </th>
                    {diasSemana.map((dia) => (
                      <th 
                        key={dia.id} 
                        scope="col" 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]"
                      >
                        {dia.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bloques.map((bloque) => (
                    <tr key={bloque.id} className="group/row hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r group-hover/row:bg-gray-100">
                        {bloque.hora_inicio} - {bloque.hora_fin}
                      </td>
                      {diasSemana.map((dia) => {
                        const horarioCelda = getHorarioPorDiaBloque(dia.id, bloque.id);
                        
                        return (
                          <td 
                            key={`${bloque.id}-${dia.id}`} 
                            className="px-2 py-2 text-sm border-r"
                          >
                            {horarioCelda ? (
                              <div 
                                className="p-2 rounded shadow-sm border"
                                style={{ backgroundColor: horarioCelda.color }}
                              >
                                <div className="font-medium text-gray-900 mb-1 truncate">
                                  {horarioCelda.materia}
                                </div>
                                <div className="flex items-center text-xs text-gray-600 mb-0.5">
                                  <UserSquare className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{horarioCelda.docente}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600 mb-0.5">
                                  <BookOpen className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{horarioCelda.grupo}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{horarioCelda.aula}</span>
                                </div>
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
            
            {horariosCeldas.length === 0 && !isLoading && (
              <div className="text-center py-10 text-gray-500">
                <Calendar className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>No hay horarios asignados para los filtros seleccionados</p>
                <p className="text-sm">Intente seleccionar otros filtros o asigne horarios primero</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      )}
    </div>
  );
};

export default ReportesHorarios;
