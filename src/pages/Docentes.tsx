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

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Especialidad {
  especialidad_id: number;
  nombre: string;
}

interface Docente {
  docente_id: number;
  usuario: number;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  tipo_contrato: string;
  max_horas_semanales: number;
  unidad_principal: number;
  especialidades_detalle: Especialidad[];
}

// Schema for form validation
const formSchema = z.object({
  usuario: z.number().optional(),
  codigo_docente: z.string().min(1, "El código es obligatorio"),
  nombres: z.string().min(1, "Los nombres son obligatorios"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  dni: z.string().min(1, "El DNI es obligatorio"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  tipo_contrato: z.string().min(1, "El tipo de contrato es obligatorio"),
  max_horas_semanales: z.coerce.number().min(1, "Las horas semanales son obligatorias"),
  unidad_principal: z.number(),
    especialidades_detalle: z.array(z.object({
    especialidad_id: z.number(),
    nombre_especialidad: z.string(),
    descripcion: z.string()
  }))
});

const tiposContrato = [
  { value: "TC", label: "Tiempo Completo" },
  { value: "MT", label: "Medio Tiempo" },
  { value: "TP", label: "Tiempo Parcial" },
];

const Docentes = () => {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDocente, setCurrentDocente] = useState<Docente | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usuario: undefined,
      codigo_docente: "",
      nombres: "",
      apellidos: "",
      dni: "",
      email: "",
      telefono: "",
      tipo_contrato: "TC",
      max_horas_semanales: 40,
      unidad_principal: undefined,
      especialidades_detalle: [],
    },
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load docentes
        const docentesData = await fetchData<ApiResponse<Docente>>("users/docentes/");
        if (docentesData?.results) {
          setDocentes(docentesData.results);
        }
      
        // Load unidades
        const unidadesData = await fetchData<ApiResponse<UnidadAcademica>>("academic-setup/unidades-academicas/");
        if (unidadesData?.results) {
          setUnidades(unidadesData.results);
        }     
        
        // Load usuarios (para vincular)
        const usuariosData = await fetchData<ApiResponse<Usuario>>("users/all/");
        if (usuariosData?.results) {
          setUsuarios(usuariosData.results);
        }
        
        // Load especialidades
        const especialidadesData = await fetchData<ApiResponse<Especialidad>>("academic-setup/especialidades/");
        if (especialidadesData?.results) {
          setEspecialidades(especialidadesData.results);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleOpenModal = (docente?: Docente) => {
    if (docente) {
      setCurrentDocente(docente);
      form.reset({
        usuario: docente.usuario || undefined,
        codigo_docente: docente.codigo_docente,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        dni: docente.dni,
        email: docente.email,
        telefono: docente.telefono || "",
        tipo_contrato: docente.tipo_contrato || "TC",
        max_horas_semanales: docente.max_horas_semanales,
        unidad_principal: docente.unidad_principal || undefined,
        especialidades_detalle: docente.especialidades_detalle || [],
      });
    } else {
      setCurrentDocente(null);
      form.reset({
        usuario: undefined,
        codigo_docente: "",
        nombres: "",
        apellidos: "",
        dni: "",
        email: "",
        telefono: "",
        tipo_contrato: "TC",
        max_horas_semanales: 40,
        unidad_principal: undefined,
        especialidades_detalle: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDocente(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    
    if (currentDocente) {
      // Update existing docente
      const updated = await updateItem<Docente>(
        "users/docentes/", 
        currentDocente.docente_id, 
        values
      );
      
      if (updated) {
        setDocentes(docentes.map(d => d.docente_id === currentDocente.docente_id ? updated : d));
        handleCloseModal();
      }
    } else {
      // Create new docente
      const created = await createItem<Docente>(
        "users/docentes/", 
        values
      );
      
      if (created) {
        setDocentes([...docentes, created]);
        handleCloseModal();
      }
    }
  };

  const handleDelete = (docente: Docente) => {
    setCurrentDocente(docente);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentDocente) return;
    
    const success = await deleteItem("users/docentes/", currentDocente.docente_id);
    
    if (success) {
      setDocentes(docentes.filter(d => d.docente_id !== currentDocente.docente_id));
      setIsDeleteDialogOpen(false);
      setCurrentDocente(null);
    }
  };

  const getUnidadNombre = (unidadId: number) => {
    const unidad = unidades.find(u => u.unidad_id === unidadId);
    return unidad ? unidad.nombre_unidad : "Desconocido";
  };

  const columns = [
    { key: "codigo_docente", header: "Código" },
    { 
      key: "nombre_completo", 
      header: "Nombre completo", 
      render: (row: Docente) => `${row.nombres} ${row.apellidos}`
    },
    { key: "dni", header: "DNI" },
    { key: "email", header: "Email" },
    { key: "telefono", header: "Teléfono" },
    { 
      key: "tipo_contrato", 
      header: "Tipo contrato",
      render: (row: Docente) => {
        const tipoContrato = tiposContrato.find(tc => tc.value === row.tipo_contrato);
        return tipoContrato ? tipoContrato.label : row.tipo_contrato;
      }
    },
    { key: "max_horas_semanales", header: "Máx. horas" },
    { 
      key: "unidad_principal", 
      header: "Unidad académica",
      render: (row: Docente) => getUnidadNombre(row.unidad_principal)
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Docentes" 
        description="Administración de docentes"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={docentes} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentDocente ? "Editar Docente" : "Crear Docente"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              {usuarios.length > 0 && (
                <FormField
                  control={form.control}
                  name="usuario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario del sistema (opcional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        value={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar usuario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id.toString()}>
                              {usuario.username} ({usuario.first_name} {usuario.last_name})
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
                name="codigo_docente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código del docente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input placeholder="DNI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de contrato</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "TC"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiposContrato.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
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
                  name="max_horas_semanales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo horas semanales</FormLabel>
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
                name="unidad_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad académica principal</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || undefined}
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
        title="Eliminar Docente"
        description={`¿Está seguro que desea eliminar al docente "${currentDocente?.nombres} ${currentDocente?.apellidos}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Docentes;
