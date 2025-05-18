import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

interface Carrera {
  id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number; // Added missing property
}

interface TipoEspacio {
  id: number;
  nombre: string;
}

interface Materia {
  id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  requiere_tipo_espacio_especifico: number | null;
  estado: boolean;
  carrera: number;
}

// Schema for form validation
const formSchema = z.object({
  codigo_materia: z.string().min(1, "El código es obligatorio"),
  nombre_materia: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  horas_academicas_teoricas: z.coerce.number().min(0, "No puede ser negativo"),
  horas_academicas_practicas: z.coerce.number().min(0, "No puede ser negativo"),
  requiere_tipo_espacio_especifico: z.union([
    z.coerce.number().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]),
  estado: z.boolean(),
  carrera: z.number(),
});

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
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_materia: "",
      nombre_materia: "",
      descripcion: "",
      horas_academicas_teoricas: 0,
      horas_academicas_practicas: 0,
      requiere_tipo_espacio_especifico: null,
      estado: true,
      carrera: parseInt(carreraId || "0"),
    },
  });

  // Load carrera, materias, and tipos de espacios on component mount
  useEffect(() => {
    if (!carreraId) {
      navigate("/admin/unidades");
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      
      // Load carrera details
      const carreraData = await getItemById<Carrera>(
        "academic/carreras/", 
        carreraId
      );
      
      if (carreraData) {
        setCarrera(carreraData);
      } else {
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
        "academic/tipos-espacios/"
      );
      
      if (tiposEspaciosData) {
        setTiposEspacios(tiposEspaciosData);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [carreraId, navigate]);

  const handleOpenModal = (materia?: Materia) => {
    if (materia) {
      setCurrentMateria(materia);
      form.reset({
        codigo_materia: materia.codigo_materia,
        nombre_materia: materia.nombre_materia,
        descripcion: materia.descripcion,
        horas_academicas_teoricas: materia.horas_academicas_teoricas,
        horas_academicas_practicas: materia.horas_academicas_practicas,
        requiere_tipo_espacio_especifico: materia.requiere_tipo_espacio_especifico,
        estado: materia.estado,
        carrera: materia.carrera,
      });
    } else {
      setCurrentMateria(null);
      form.reset({
        codigo_materia: "",
        nombre_materia: "",
        descripcion: "",
        horas_academicas_teoricas: 0,
        horas_academicas_practicas: 0,
        requiere_tipo_espacio_especifico: null,
        estado: true,
        carrera: parseInt(carreraId || "0"),
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
    
    if (currentMateria) {
      // Update existing materia
      const updated = await updateItem<Materia>(
        "academic/materias/", 
        currentMateria.id, 
        values
      );
      
      if (updated) {
        setMaterias(materias.map(m => m.id === currentMateria.id ? updated : m));
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
        handleCloseModal();
      }
    }
  };

  const handleDelete = (materia: Materia) => {
    setCurrentMateria(materia);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentMateria) return;
    
    const success = await deleteItem("academic/materias/", currentMateria.id);
    
    if (success) {
      setMaterias(materias.filter(m => m.id !== currentMateria.id));
      setIsDeleteDialogOpen(false);
      setCurrentMateria(null);
    }
  };

  const columns = [
    { key: "codigo_materia", header: "Código" },
    { key: "nombre_materia", header: "Nombre" },
    { 
      key: "horas", 
      header: "Horas (T/P/Total)", 
      render: (row: Materia) => (
        <span>
          {row.horas_academicas_teoricas}/{row.horas_academicas_practicas}/
          {row.horas_academicas_teoricas + row.horas_academicas_practicas}
        </span>
      )
    },
    { 
      key: "requiere_tipo_espacio_especifico", 
      header: "Tipo Espacio", 
      render: (row: Materia) => {
        if (!row.requiere_tipo_espacio_especifico) return "No específico";
        const tipoEspacio = tiposEspacios.find(t => t.id === row.requiere_tipo_espacio_especifico);
        return tipoEspacio ? tipoEspacio.nombre : "Desconocido";
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
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Carreras
        </Button>
        
        <PageHeader 
          title={`Materias: ${carrera?.nombre_carrera || 'Cargando...'}`}
          description="Administración de materias para esta carrera"
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horas_academicas_teoricas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas teóricas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Horas prácticas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                  <FormItem>
                    <FormLabel>Tipo de espacio requerido</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de espacio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No específico</SelectItem>
                        {tiposEspacios.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id.toString()}>
                            {tipo.nombre}
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
                name="estado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Estado</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Materia activa para asignación
                      </div>
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
              <FormField
                control={form.control}
                name="carrera"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
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
        title="Eliminar Materia"
        description={`¿Está seguro que desea eliminar la materia "${currentMateria?.nombre_materia}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Materias;
