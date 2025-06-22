import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, createItem, updateItem, deleteItem, getItemById } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface TipoEspacio {
  tipo_espacio_id: number;
  nombre_tipo_espacio: string;
}

interface Ciclo {
  ciclo_id: number;
  nombre_ciclo: string;
  orden: number;
  carrera: number;
}

interface Materia {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string | null;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre: string | null;
  estado: boolean;
  carrera: number;
  carrera_detalle?: {
    carrera_id: number;
    nombre_carrera: string;
    codigo_carrera: string;
    unidad: number;
    unidad_nombre?: string;
  };
  ciclo_id?: number;
}

const Materias = () => {
  const { id: carreraId, unidadId } = useParams<{ id: string, unidadId: string }>();
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [tiposEspacios, setTiposEspacios] = useState<TipoEspacio[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMateria, setCurrentMateria] = useState<Materia | null>(null);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  const [currentCarrera, setCurrentCarrera] = useState<Carrera | null>(null);
  const [allCarreras, setAllCarreras] = useState<Carrera[]>([]);

  // Validar que el ID de la carrera sea válido
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      toast.error("ID de carrera inválido");
      navigate("/admin/unidades");
      return;
    }
  }, [carreraId, navigate]);

  const loadMaterias = async (page: number) => {
    if (!carreraId || isNaN(parseInt(carreraId))) return;
    setIsLoading(true);
    try {
      const materiasResponse = await fetchData<ApiResponse<Materia>>(
        `academic-setup/carreras/${carreraId}/materias/?page=${page}`
      );
      setMaterias(materiasResponse.results || []);
      setPagination(prev => ({ ...prev, count: materiasResponse.count || 0, page }));
    } catch (error) {
      console.error("Error loading materias:", error);
      toast.error("Error al cargar las materias");
    } finally {
      setIsLoading(false);
    }
  };

  // Load carrera, materias, and tipos de espacios on component mount
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      return;
    }
    
    const loadAuxData = async () => {
      try {
        const [tiposEspacioResponse, carreraResponse, allCarrerasResponse] = await Promise.all([
          fetchData<{ results: TipoEspacio[] }>("academic-setup/tipos-espacio/"),
          carreraId ? fetchData<Carrera>(`academic-setup/carreras/${carreraId}/`) : Promise.resolve(null),
          fetchData<{ results: Carrera[] }>("academic-setup/carreras/")
        ]);

        if (carreraResponse) {
          setCarrera(carreraResponse);
          setCurrentCarrera(carreraResponse);
        } else {
          toast.error("No se encontró la carrera");
          navigate("/admin/unidades");
          return;
        }

        if (tiposEspacioResponse && Array.isArray(tiposEspacioResponse.results)) {
          setTiposEspacios(tiposEspacioResponse.results);
        } else {
          setTiposEspacios([]);
        }

        if (allCarrerasResponse && Array.isArray(allCarrerasResponse.results)) {
          setAllCarreras(allCarrerasResponse.results);
        } else {
          setAllCarreras([]);
        }
      } catch (error) {
        console.error("Error loading aux data:", error);
        toast.error("Error al cargar datos auxiliares");
      }
    };
    
    loadAuxData();
    loadMaterias(1);
  }, [carreraId, navigate]);

  // Schema for form validation
  const formSchema = z.object({
    codigo_materia: z.string().min(1, "El código es obligatorio"),
    nombre_materia: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional(),
    horas_academicas_teoricas: z.coerce.number().min(0, "Debe ser un número positivo"),
    horas_academicas_practicas: z.coerce.number().min(0, "Debe ser un número positivo"),
    horas_academicas_laboratorio: z.coerce.number().min(0, "Debe ser un número positivo"),
    requiere_tipo_espacio_especifico: z.union([
      z.coerce.number().min(1, "Debe seleccionar un tipo de espacio"),
      z.literal("").transform(() => null),
      z.null()
    ]),
    estado: z.boolean().default(true),
    carreras: z.array(z.number()).min(1, "Debe seleccionar al menos una carrera"),
    ciclo_id: z.coerce.number().optional(),
  }).refine(data => {
    if (data.carreras.length > 1) {
        return true;
    }
    return !!data.ciclo_id;
  }, {
    message: "Debe seleccionar un ciclo cuando elige una sola carrera",
    path: ["ciclo_id"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_materia: "",
      nombre_materia: "",
      descripcion: "",
      horas_academicas_teoricas: 0,
      horas_academicas_practicas: 0,
      horas_academicas_laboratorio: 0,
      requiere_tipo_espacio_especifico: null,
      estado: true,
      carreras: carreraId ? [parseInt(carreraId)] : [],
      ciclo_id: undefined,
    },
  });

  const selectedCarrerasInForm = form.watch("carreras");

  useEffect(() => {
    const fetchCiclos = async () => {
      if (selectedCarrerasInForm && selectedCarrerasInForm.length === 1) {
        const singleCarreraId = selectedCarrerasInForm[0];
        try {
          const response = await fetchData<Ciclo[]>(`academic-setup/ciclos/?carrera_id=${singleCarreraId}`);
          if (response) {
            setCiclos(response || []);
          } else {
            setCiclos([]);
          }
        } catch (error) {
          console.error(`Error al cargar ciclos para la carrera ${singleCarreraId}:`, error);
          toast.error("No se pudieron cargar los ciclos para la carrera seleccionada.");
          setCiclos([]);
        }
      } else {
        setCiclos([]);
      }
    };

    fetchCiclos();

    const currentCarreras = form.getValues("carreras");
    if (currentCarreras.length !== 1) {
      form.setValue("ciclo_id", undefined);
    }
  }, [selectedCarrerasInForm, form]);

  const handleOpenModal = (materia?: Materia) => {
    if (materia) {
      setCurrentMateria(materia);
      form.reset({
        ...materia,
        requiere_tipo_espacio_especifico: materia.requiere_tipo_espacio_especifico || null,
        carreras: [],
      });
    } else {
      setCurrentMateria(null);
      form.reset({
        codigo_materia: "",
        nombre_materia: "",
        descripcion: "",
        horas_academicas_teoricas: 0,
        horas_academicas_practicas: 0,
        horas_academicas_laboratorio: 0,
        requiere_tipo_espacio_especifico: null,
        estado: true,
        carreras: carreraId ? [parseInt(carreraId)] : [],
        ciclo_id: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMateria(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentMateria) {
        // Update existing materia
        await updateItem<Materia>(
          "academic-setup/materias/", 
          currentMateria.materia_id, 
          values
        );
        toast.success("Materia actualizada exitosamente");
        loadMaterias(pagination.page);
      } else {
        // Create new materia
        await createItem<Materia>(
          "academic-setup/materias/", 
          values
        );
        toast.success("Materia creada y asignada a la carrera exitosamente");
        loadMaterias(1);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving materia:", error);
      toast.error("Error al guardar la materia");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (materia: Materia) => {
    setCurrentMateria(materia);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentMateria) return;
    
    try {
      await deleteItem("academic-setup/materias/", currentMateria.materia_id);
      toast.success("Materia eliminada exitosamente");
      loadMaterias(pagination.page);
    } catch (error) {
      console.error("Error deleting materia:", error);
      toast.error("Error al eliminar la materia");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentMateria(null);
    }
  };

  const columns = [
    { key: "codigo_materia", header: "Código" },
    { key: "nombre_materia", header: "Nombre" },
    { 
      key: "horas", 
      header: "Horas (T/P/L/Total)", 
      render: (row: Materia) => (
        <span>
          {row.horas_academicas_teoricas}/{row.horas_academicas_practicas}/{row.horas_academicas_laboratorio}/
          {row.horas_totales}
        </span>
      )
    },
    { 
      key: "requiere_tipo_espacio_especifico", 
      header: "Tipo Espacio", 
      render: (row: Materia) => {
        if (!row.requiere_tipo_espacio_especifico) return "No específico";
        const tipoEspacio = tiposEspacios.find(t => t.tipo_espacio_id === row.requiere_tipo_espacio_especifico);
        return tipoEspacio ? tipoEspacio.nombre_tipo_espacio : "Desconocido";
      }
    },
    { 
      key: "estado", 
      header: "Estado", 
      render: (row: Materia) => (
        <span className={row.estado ? "text-green-600" : "text-red-600"}>
          {row.estado ? "Activo" : "Inactivo"}
        </span>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/admin/unidades/${carrera?.unidad}/carreras`)}
          className="mb-4"
          disabled={!carrera}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Carreras
        </Button>
        
        <PageHeader 
          title={`Materias: ${carrera?.nombre_carrera || 'Cargando...'}`}
          description={`Administración de materias para la carrera ${carrera?.codigo_carrera || ''}`}
          onAdd={() => handleOpenModal()}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={materias} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Página {pagination.page} de {Math.ceil(pagination.count / pagination.pageSize)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMaterias(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMaterias(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.count / pagination.pageSize)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentMateria ? "Editar Materia" : "Nueva Materia"}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        isValid={form.formState.isValid}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_materia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código de la materia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nombre_materia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la materia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la materia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="horas_academicas_teoricas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Teóricas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="0" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horas_academicas_practicas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Prácticas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="0" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horas_academicas_laboratorio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Laboratorio</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="0" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="carreras"
                render={() => (
                  <FormItem>
                    <FormLabel>Carreras</FormLabel>
                    <FormDescription>
                      Seleccione una o más carreras para asociar la materia.
                    </FormDescription>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {allCarreras.map((carrera) => (
                        <FormField
                          key={carrera.carrera_id}
                          control={form.control}
                          name="carreras"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={carrera.carrera_id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(carrera.carrera_id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), carrera.carrera_id])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== carrera.carrera_id
                                            )
                                          )
                                    }}
                                    disabled={!!currentMateria}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {carrera.nombre_carrera}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("carreras")?.length === 1 && (
                <FormField
                  control={form.control}
                  name="ciclo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciclo Académico</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                        disabled={!!currentMateria}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un ciclo para la materia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ciclos.map((ciclo) => (
                            <SelectItem
                              key={ciclo.ciclo_id}
                              value={ciclo.ciclo_id.toString()}
                            >
                              {ciclo.nombre_ciclo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="requiere_tipo_espacio_especifico"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Requiere tipo de espacio específico
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value !== null}
                        onCheckedChange={(value) => field.onChange(value ? 1 : null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {form.watch("requiere_tipo_espacio_especifico") !== null && (
                <FormField
                  control={form.control}
                  name="requiere_tipo_espacio_especifico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Espacio</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de espacio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiposEspacios.map((tipo) => (
                            <SelectItem key={tipo.tipo_espacio_id} value={tipo.tipo_espacio_id.toString()}>
                              {tipo.nombre_tipo_espacio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Estado
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        }
      />

      {/* Confirmation dialog for deleting */}
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Materia"
        description={`¿Está seguro que desea eliminar la materia "${currentMateria?.nombre_materia}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Materias;
