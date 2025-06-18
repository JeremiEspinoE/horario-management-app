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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

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
}

const Materias = () => {
  const { id: carreraId } = useParams<{ id: string }>();
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [tiposEspacios, setTiposEspacios] = useState<TipoEspacio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMateria, setCurrentMateria] = useState<Materia | null>(null);
  const navigate = useNavigate();

  // Validar que el ID de la carrera sea válido
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      toast.error("ID de carrera inválido");
      navigate("/admin/unidades");
      return;
    }
  }, [carreraId, navigate]);

  // Load carrera, materias, and tipos de espacios on component mount
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load carrera details
        const carreraData = await getItemById<Carrera>(
          "academic/carreras/", 
          carreraId
        );
        
        if (carreraData) {
          setCarrera(carreraData);
        } else {
          toast.error("No se encontró la carrera");
          navigate("/admin/unidades");
          return;
        }
        
        // Load materias for this carrera
        const materiasData = await fetchData<Materia>(
          `academic/materias/?carrera=${carreraId}`
        );
        
        if (materiasData) {
          setMaterias(materiasData);
        }
        
        // Load tipos de espacios
        const tiposEspaciosData = await fetchData<TipoEspacio>(
          "academic/tipos-espacio/"
        );
        
        if (tiposEspaciosData) {
          setTiposEspacios(tiposEspaciosData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos");
        navigate("/admin/unidades");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [carreraId, navigate]);

  // Schema for form validation
  const formSchema = z.object({
    codigo_materia: z.string().min(1, "El código es obligatorio"),
    nombre_materia: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional(),
    horas_academicas_teoricas: z.number().min(0, "Las horas teóricas no pueden ser negativas"),
    horas_academicas_practicas: z.number().min(0, "Las horas prácticas no pueden ser negativas"),
    horas_academicas_laboratorio: z.number().min(0, "Las horas de laboratorio no pueden ser negativas"),
    requiere_tipo_espacio_especifico: z.number().nullable(),
    estado: z.boolean(),
    carrera: z.number(),
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
      carrera: carreraId ? parseInt(carreraId) : 0,
    },
  });

  const handleOpenModal = (materia?: Materia) => {
    if (materia) {
      setCurrentMateria(materia);
      form.reset({
        codigo_materia: materia.codigo_materia,
        nombre_materia: materia.nombre_materia,
        descripcion: materia.descripcion || "",
        horas_academicas_teoricas: materia.horas_academicas_teoricas,
        horas_academicas_practicas: materia.horas_academicas_practicas,
        horas_academicas_laboratorio: materia.horas_academicas_laboratorio,
        requiere_tipo_espacio_especifico: materia.requiere_tipo_espacio_especifico,
        estado: materia.estado,
        carrera: carreraId ? parseInt(carreraId) : undefined,
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
        carrera: carreraId ? parseInt(carreraId) : undefined,
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

    const values = form.getValues();
    
    try {
      if (currentMateria) {
        // Update existing materia
        const updated = await updateItem<Materia>(
          "academic/materias/", 
          currentMateria.materia_id, 
          values
        );
        
        if (updated) {
          setMaterias(materias.map(m => m.materia_id === currentMateria.materia_id ? updated : m));
          toast.success("Materia actualizada exitosamente");
          handleCloseModal();
        }
      } else {
        // Create new materia
        const created = await createItem<Materia>(
          "academic/materias/", 
          values
        );
        
        if (created) {
          setMaterias([...materias, created]);
          toast.success("Materia creada exitosamente");
          handleCloseModal();
        }
      }
    } catch (error) {
      console.error("Error saving materia:", error);
      toast.error("Error al guardar la materia");
    }
  };

  const handleDelete = (materia: Materia) => {
    setCurrentMateria(materia);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentMateria) return;
    
    const success = await deleteItem("academic/materias/", currentMateria.materia_id);
    
    if (success) {
      setMaterias(materias.filter(m => m.materia_id !== currentMateria.materia_id));
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
          onClick={() => navigate(`/admin/carreras/${carreraId}`)}
          className="mb-4"
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

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentMateria ? "Editar Materia" : "Crear Materia"}
        onSubmit={handleSave}
        isSubmitting={form.formState.isSubmitting}
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
