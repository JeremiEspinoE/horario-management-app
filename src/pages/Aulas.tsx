
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface TipoEspacio {
  tipo_espacio_id: number;
  nombre_tipo_espacio: string;
}

interface Aula {
  espacio_id: number;
  nombre_espacio: string;
  tipo_espacio: number;
  capacidad: number;
  ubicacion: string;
  recursos_adicionales: string;
  unidad: number;
}

// Schema for form validation
const formSchema = z.object({
  nombre_espacio: z.string().min(1, "El nombre es obligatorio"),
  tipo_espacio: z.number(),
  capacidad: z.coerce.number().min(1, "La capacidad debe ser mayor a 0"),
  ubicacion: z.string().min(1, "La ubicación es obligatoria"),
  recursos_adicionales: z.string().optional(),
  unidad: z.number(),
});

const Aulas = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [tiposEspacios, setTiposEspacios] = useState<TipoEspacio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAula, setCurrentAula] = useState<Aula | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_espacio: "",
      tipo_espacio: 0,
      capacidad: 0,
      ubicacion: "",
      recursos_adicionales: "",
      unidad: 0,
    },
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Load aulas
      const aulasData = await fetchData<Aula>("academic/espacios-fisicos/");
      if (aulasData) {
        setAulas(aulasData);
      }
      
      // Load unidades
      const unidadesData = await fetchData<UnidadAcademica>("academic/unidades-academicas/");
      if (unidadesData) {
        setUnidades(unidadesData);
      }
      
      // Load tipos de espacios
      const tiposEspaciosData = await fetchData<TipoEspacio>("academic/tipos-espacio/");
      if (tiposEspaciosData) {
        setTiposEspacios(tiposEspaciosData);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const handleOpenModal = (aula?: Aula) => {
    if (aula) {
      setCurrentAula(aula);
      form.reset({
        nombre_espacio: aula.nombre_espacio,
        tipo_espacio: aula.tipo_espacio,
        capacidad: aula.capacidad,
        ubicacion: aula.ubicacion,
        recursos_adicionales: aula.recursos_adicionales,
        unidad: aula.unidad,
      });
    } else {
      setCurrentAula(null);
      form.reset({
        nombre_espacio: "",
        tipo_espacio: tiposEspacios.length > 0 ? tiposEspacios[0].tipo_espacio_id : 0,
        capacidad: 0,
        ubicacion: "",
        recursos_adicionales: "",
        unidad: unidades.length > 0 ? unidades[0].unidad_id : 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAula(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    
    if (currentAula) {
      // Update existing aula
      const updated = await updateItem<Aula>(
        "academic/espacios-fisicos/", 
        currentAula.espacio_id, 
        values
      );
      
      if (updated) {
        setAulas(aulas.map(a => a.espacio_id === currentAula.espacio_id ? updated : a));
        handleCloseModal();
      }
    } else {
      // Create new aula
      const created = await createItem<Aula>(
        "academic/espacios-fisicos/", 
        values
      );
      
      if (created) {
        setAulas([...aulas, created]);
        handleCloseModal();
      }
    }
  };

  const handleDelete = (aula: Aula) => {
    setCurrentAula(aula);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentAula) return;
    
    const success = await deleteItem("academic/espacios-fisicos/", currentAula.espacio_id);
    
    if (success) {
      setAulas(aulas.filter(a => a.espacio_id !== currentAula.espacio_id));
      setIsDeleteDialogOpen(false);
      setCurrentAula(null);
    }
  };

  const getTipoEspacioNombre = (tipoId: number) => {
    const tipo = tiposEspacios.find(t => t.tipo_espacio_id === tipoId);
    return tipo ? tipo.nombre_tipo_espacio : "Desconocido";
  };

  const getUnidadNombre = (unidadId: number) => {
    const unidad = unidades.find(u => u.unidad_id === unidadId);
    return unidad ? unidad.nombre_unidad : "Desconocido";
  };

  const columns = [
    { key: "nombre_espacio", header: "Nombre" },
    { 
      key: "tipo_espacio", 
      header: "Tipo", 
      render: (row: Aula) => getTipoEspacioNombre(row.tipo_espacio)
    },
    { key: "capacidad", header: "Capacidad" },
    { key: "ubicacion", header: "Ubicación" },
    { 
      key: "unidad", 
      header: "Unidad Académica", 
      render: (row: Aula) => getUnidadNombre(row.unidad)
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Aulas y Espacios Físicos" 
        description="Administración de aulas y espacios físicos"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={aulas} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentAula ? "Editar Aula" : "Crear Aula"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_espacio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del espacio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_espacio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de espacio</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidad</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ubicacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input placeholder="Ubicación" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="recursos_adicionales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recursos adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Proyector, computadoras, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad académica</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidades.map((unidad) => (
                          <SelectItem key={unidad.unidad_id} value={unidad.unidad_id.toString()}>
                            {unidad.nombre_unidad}
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
        title="Eliminar Aula"
        description={`¿Está seguro que desea eliminar el aula "${currentAula?.nombre_espacio}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Aulas;
