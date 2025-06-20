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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface Materia { 
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
  carrera: number;
}

interface PeriodoAcademico {
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

interface Column {
  header: string;
  key: string;
  render?: (row: any) => React.ReactNode;
}

// Schema for form validation
const formSchema = z.object({
  codigo_grupo: z.string().min(1, "El código es obligatorio"),
  materia: z.number().min(1, "Debe seleccionar una materia"),
  carrera: z.number().min(1, "Debe seleccionar una carrera"),
  periodo: z.number().min(1, "Debe seleccionar un período"),
  numero_estudiantes_estimado: z.coerce.number().min(1, "Debe ingresar un número válido de estudiantes"),
  turno_preferente: z.string().min(1, "Debe seleccionar un turno"),
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
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState<Grupo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
    setMateriasFiltradas(materias);
  }, [materias]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Cargar grupos
        const gruposResponse = await fetchData<{ results: Grupo[] }>("scheduling/grupos/");
        const gruposData = gruposResponse.results || [];
        
        // Load carreras
        const carrerasResponse = await fetchData<{ results: Carrera[] }>("academic-setup/carreras/");
        const carrerasData = carrerasResponse.results || [];
        
        // Load materias
        const materiasResponse = await fetchData<{ results: Materia[] }>("academic-setup/materias/");
        const materiasData = materiasResponse.results || [];
        
        // Load periodos
        const periodosResponse = await fetchData<{ results: PeriodoAcademico[] }>("academic-setup/periodos-academicos/");
        const periodosData = periodosResponse.results || [];
        
        // Load docentes
        const docentesResponse = await fetchData<{ results: Docente[] }>("users/docentes/");
        const docentesData = docentesResponse.results || [];
        
        setGrupos(gruposData);
        setCarreras(carrerasData);
        setMaterias(materiasData);
        setPeriodos(periodosData);
        setDocentes(docentesData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos");
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

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentGrupo) {
        // Update existing grupo
        const updated = await updateItem<Grupo>(
          "scheduling/grupos/", 
          currentGrupo.grupo_id, 
          values
        );
        
        if (updated) {
          setGrupos(grupos.map(g => g.grupo_id === currentGrupo.grupo_id ? updated : g));
          toast.success("Grupo actualizado exitosamente");
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
          toast.success("Grupo creado exitosamente");
          handleCloseModal();
        }
      }
    } catch (error) {
      console.error("Error saving grupo:", error);
      toast.error("Error al guardar el grupo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (grupo: Grupo) => {
    setCurrentGrupo(grupo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentGrupo) return;
    
    try {
      const success = await deleteItem("scheduling/grupos/", currentGrupo.grupo_id);
      if (success) {
        setGrupos(grupos.filter(g => g.grupo_id !== currentGrupo.grupo_id));
        toast.success("Grupo eliminado exitosamente");
      }
    } catch (error) {
      console.error("Error deleting grupo:", error);
      toast.error("Error al eliminar el grupo");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentGrupo(null);
    }
  };

  const getTurnoLabel = (value: string) => {
    return turnos.find(t => t.value === value)?.label || value;
  };

  const columns: Column[] = [
    {
      header: "Código",
      key: "codigo_grupo",
    },
    {
      header: "Materia",
      key: "materia_detalle",
      render: (row) => row.materia_detalle?.nombre_materia || "N/A",
    },
    {
      header: "Carrera",
      key: "carrera_detalle",
      render: (row) => row.carrera_detalle?.nombre_carrera || "N/A",
    },
    {
      header: "Período",
      key: "periodo_nombre",
      render: (row) => row.periodo_nombre || "N/A",
    },
    {
      header: "Estudiantes",
      key: "numero_estudiantes_estimado",
    },
    {
      header: "Turno",
      key: "turno_preferente",
      render: (row) => getTurnoLabel(row.turno_preferente),
    },
    {
      header: "Docente Asignado",
      key: "docente_asignado_directamente_nombre",
      render: (row) => row.docente_asignado_directamente_nombre || "No asignado",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Gestión de Grupos"
        description="Administre los grupos académicos del sistema"
        onAdd={() => handleOpenModal()}
      />

      <DataTable
        data={grupos}
        columns={columns}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentGrupo ? "Editar Grupo" : "Nuevo Grupo"}
        form={
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_grupo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código del Grupo</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una carrera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carreras.map((carrera) => (
                          <SelectItem
                            key={carrera.carrera_id}
                            value={carrera.carrera_id.toString()}
                          >
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
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                      disabled={!carreraId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una materia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materiasFiltradas.map((materia) => (
                          <SelectItem
                            key={materia.materia_id}
                            value={materia.materia_id.toString()}
                          >
                            {materia.nombre_materia}
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
                    <FormLabel>Período</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem
                            key={periodo.periodo_id}
                            value={periodo.periodo_id.toString()}
                          >
                            {periodo.nombre_periodo}
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
                name="numero_estudiantes_estimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Estudiantes</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                    <FormLabel>Turno Preferente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un turno" />
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

              <FormField
                control={form.control}
                name="docente_asignado_directamente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Docente Asignado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "0" ? null : Number(value))}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">No asignar</SelectItem>
                        {docentes.map((docente) => (
                          <SelectItem
                            key={docente.docente_id}
                            value={docente.docente_id.toString()}
                          >
                            {`${docente.nombres} ${docente.apellidos}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
        isValid={form.formState.isValid}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Grupo"
        description="¿Está seguro que desea eliminar este grupo? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Grupos;
