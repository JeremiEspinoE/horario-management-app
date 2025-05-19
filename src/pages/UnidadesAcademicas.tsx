import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Define the shape of a unidad académica
interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
  descripcion: string;
}

// Schema for form validation
const formSchema = z.object({
  nombre_unidad: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
});

const UnidadesAcademicas = () => {
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUnidad, setCurrentUnidad] = useState<UnidadAcademica | null>(null);
  const navigate = useNavigate();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_unidad: "",
      descripcion: "",
    },
  });

  // Load unidades on component mount
  useEffect(() => {
    loadUnidades();
  }, []);

  const loadUnidades = async () => {
    setIsLoading(true);
    const data = await fetchData<UnidadAcademica>("academic/unidades-academicas/");
    if (data) {
      setUnidades(data);
    }
    setIsLoading(false);
  };

  const handleOpenModal = (unidad?: UnidadAcademica) => {
    if (unidad) {
      setCurrentUnidad(unidad);
      form.reset({
        nombre_unidad: unidad.nombre_unidad,
        descripcion: unidad.descripcion,
      });
    } else {
      setCurrentUnidad(null);
      form.reset({
        nombre_unidad: "",
        descripcion: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUnidad(null);
  };

 const handleSave = async () => {
  const isValid = await form.trigger();
  if (!isValid) return;

  const values = form.getValues();

  if (currentUnidad) {
    if (!currentUnidad.unidad_id) {
      toast.error("ID de la unidad académica no está definido.");
      return;
    }
    // Update existing unidad
    const updated = await updateItem<UnidadAcademica>(
      "academic/unidades-academicas/",
      currentUnidad.unidad_id,
      values
    );

    if (updated) {
      setUnidades(unidades.map(u => u.unidad_id === currentUnidad.unidad_id ? updated : u));
      handleCloseModal();
    }
  } else {
    // Create new unidad
    const created = await createItem<UnidadAcademica>(
      "academic/unidades-academicas/",
      values
    );

    if (created) {
      setUnidades([...unidades, created]);
      handleCloseModal();
    }
  }
};
  const handleDelete = (unidad: UnidadAcademica) => {
    setCurrentUnidad(unidad);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentUnidad) return;
    
    const success = await deleteItem("academic/unidades-academicas/", currentUnidad.unidad_id);
    
    if (success) {
      setUnidades(unidades.filter(u => u.unidad_id !== currentUnidad.unidad_id));
      setIsDeleteDialogOpen(false);
      setCurrentUnidad(null);
    }
  };

  const handleViewCarreras = (unidad: UnidadAcademica) => {
    navigate(`/admin/unidades/${unidad.unidad_id}/carreras`);
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "nombre_unidad", header: "Nombre" },
    { key: "descripcion", header: "Descripción" },
    { 
      key: "actions", 
      header: "Carreras", 
      render: (row: UnidadAcademica) => (
        <button 
          onClick={() => handleViewCarreras(row)}
          className="text-academic-primary hover:underline"
        >
          Ver carreras
        </button>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Unidades Académicas" 
        description="Administración de unidades académicas"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={unidades} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentUnidad ? "Editar Unidad Académica" : "Crear Unidad Académica"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_unidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la unidad académica" {...field} />
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
                      <Textarea placeholder="Descripción de la unidad académica" {...field} />
                    </FormControl>
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
        title="Eliminar Unidad Académica"
        description={`¿Está seguro que desea eliminar la unidad "${currentUnidad?.nombre_unidad}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default UnidadesAcademicas;
