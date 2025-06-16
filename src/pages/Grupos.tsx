import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchData, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
}

interface Materia {
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
  carrera: number; // Added missing property
}

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
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

interface CarreraDetalle {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  unidad_nombre: string;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materia: number;
  materia_detalle: MateriaDetalle;
  carrera: number;
  carrera_detalle: CarreraDetalle;
  periodo: number;
  periodo_nombre: string;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente: number | null;
  docente_asignado_directamente_nombre: string | null;
}

// Schema for form validation
const formSchema = z.object({
  codigo_grupo: z.string().min(1, "El código es obligatorio"),
  materia: z.number(),
  carrera: z.number(),
  periodo: z.number(),
  numero_estudiantes_estimado: z.coerce.number().min(0),
  turno_preferente: z.string(),
  docente_asignado_directamente: z.union([
    z.coerce.number().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]),
});

const turnos = [
  { value: "M", label: "Mañana" },
  { value: "T", label: "Tarde" },
  { value: "N", label: "Noche" },
];

const Grupos = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiasFiltradas, setMateriasFiltradas] = useState<Materia[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState<Grupo | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_grupo: "",
      materia: 0,
      carrera: 0,
      periodo: 0,
      numero_estudiantes_estimado: 0,
      turno_preferente: "M",
      docente_asignado_directamente: null,
    },
  });
  
  const carreraId = form.watch("carrera");
  
  // Update materias when carrera changes
  useEffect(() => {
    if (carreraId) {
      const filteredMaterias = materias.filter(m => m.carrera === carreraId);
      setMateriasFiltradas(filteredMaterias);
    } else {
      setMateriasFiltradas([]);
    }
  }, [carreraId, materias]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load grupos
        const gruposData = await fetchData<Grupo>("scheduling/grupos/");
        
        // Load carreras
        const carrerasResponseArr = await fetchData<{ results: Carrera[] }>("academic/carreras/");
        const carrerasResponse = Array.isArray(carrerasResponseArr) ? carrerasResponseArr[0] : carrerasResponseArr;
        const carrerasData = carrerasResponse?.results || [];
        
        // Load materias
        const materiasResponseArr = await fetchData<{ results: Materia[] }>("academic/materias/");
        const materiasResponse = Array.isArray(materiasResponseArr) ? materiasResponseArr[0] : materiasResponseArr;
        const materiasData = materiasResponse?.results || [];
        
        // Load periodos
        const periodosResponseArr = await fetchData<{ results: Periodo[] }>("academic/periodos-academicos/");
        const periodosResponse = Array.isArray(periodosResponseArr) ? periodosResponseArr[0] : periodosResponseArr;
        const periodosData = periodosResponse?.results || [];
        
        // Load docentes
        const docentesResponseArr = await fetchData<{ results: Docente[] }>("users/docentes/");
        const docentesResponse = Array.isArray(docentesResponseArr) ? docentesResponseArr[0] : docentesResponseArr;
        const docentesData = docentesResponse?.results || [];
        
        setGrupos(gruposData);
        setCarreras(carrerasData);
        setMaterias(materiasData);
        setPeriodos(periodosData);
        setDocentes(docentesData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleOpenModal = (grupo?: Grupo) => {
    if (grupo) {
      setCurrentGrupo(grupo);
      form.reset({
        codigo_grupo: grupo.codigo_grupo,
        materia: grupo.materia,
        carrera: grupo.carrera,
        periodo: grupo.periodo,
        numero_estudiantes_estimado: grupo.numero_estudiantes_estimado,
        turno_preferente: grupo.turno_preferente,
        docente_asignado_directamente: grupo.docente_asignado_directamente,
      });
    } else {
      setCurrentGrupo(null);
      form.reset({
        codigo_grupo: "",
        materia: 0,
        carrera: 0,
        periodo: 0,
        numero_estudiantes_estimado: 0,
        turno_preferente: "M",
        docente_asignado_directamente: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGrupo(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    
    if (currentGrupo) {
      // Update existing grupo
      const updated = await updateItem<Grupo>(
        "scheduling/grupos/", 
        currentGrupo.grupo_id, 
        values
      );
      
      if (updated) {
        setGrupos(grupos.map(g => g.grupo_id === currentGrupo.grupo_id ? updated : g));
        handleCloseModal();
      }
    } else {
      // Create new grupo
      const created = await createItem<Grupo>(
        "scheduling/grupos/", 
        values
      );
      
      if (created) {
        setGrupos([...grupos, created]);
        handleCloseModal();
      }
    }
  };

  const handleDelete = (grupo: Grupo) => {
    setCurrentGrupo(grupo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentGrupo) return;
    
    const success = await deleteItem("scheduling/grupos/", currentGrupo.grupo_id);
    
    if (success) {
      setGrupos(grupos.filter(g => g.grupo_id !== currentGrupo.grupo_id));
      setIsDeleteDialogOpen(false);
      setCurrentGrupo(null);
    }
  };

  const getTurnoLabel = (value: string) => {
    const turno = turnos.find(t => t.value === value);
    return turno ? turno.label : value;
  };

  const columns = [
    { key: "codigo_grupo", header: "Código" },
    {
      key: "materia_detalle.nombre_materia",
      header: "Materia",
      render: (row: Grupo) => row.materia_detalle?.nombre_materia || ""
    },
    {
      key: "carrera_detalle.nombre_carrera",
      header: "Carrera",
      render: (row: Grupo) => row.carrera_detalle?.nombre_carrera || ""
    },
    { key: "periodo_nombre", header: "Periodo" },
    { key: "numero_estudiantes_estimado", header: "Estudiantes" },
    {
      key: "turno_preferente",
      header: "Turno",
      render: (row: Grupo) => getTurnoLabel(row.turno_preferente)
    },
    { key: "docente_asignado_directamente_nombre", header: "Docente asignado" },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Grupos/Secciones" 
        description="Administración de grupos y secciones"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={grupos} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentGrupo ? "Editar Grupo" : "Crear Grupo"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_grupo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código del grupo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carrera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrera</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        // Reset materia when carrera changes
                        form.setValue("materia", 0);
                      }}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar carrera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Seleccionar...</SelectItem>
                        {carreras.map((carrera) => (
                          <SelectItem key={carrera.carrera_id} value={carrera.carrera_id.toString()}>
                            {carrera.nombre_carrera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="materia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Materia</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                      disabled={!carreraId || carreraId === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={carreraId === 0 ? "Seleccione carrera primero" : "Seleccionar materia"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materiasFiltradas.length === 0 && (
                          <SelectItem value="0">No hay materias disponibles</SelectItem>
                        )}
                        {materiasFiltradas.map((materia) => (
                          <SelectItem key={materia.materia_id} value={materia.materia_id.toString()}>
                            {materia.codigo_materia} - {materia.nombre_materia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo académico</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar periodo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                            {periodo.nombre_periodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_estudiantes_estimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estudiantes estimados</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="turno_preferente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turno preferente</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar turno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {turnos.map((turno) => (
                            <SelectItem key={turno.value} value={turno.value}>
                              {turno.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="docente_asignado_directamente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Docente asignado (opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      value={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin asignación directa</SelectItem>
                        {docentes.map((docente) => (
                          <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                            {docente.nombres} {docente.apellidos} ({docente.codigo_docente})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={form.formState.isSubmitting}
      />

      {/* Confirmation dialog for deleting */}
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Grupo"
        description={`¿Está seguro que desea eliminar el grupo "${currentGrupo?.codigo_grupo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Grupos;
