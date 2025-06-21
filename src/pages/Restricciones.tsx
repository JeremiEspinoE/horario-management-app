import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, PaginatedResponse, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Restriccion {
  id: number;
  codigo_restriccion: string;
  descripcion: string;
  tipo_aplicacion: string;
  entidad_id_1?: number;
  entidad_id_2?: number;
  valor_parametro?: number;
  periodo_aplicable: number;
  esta_activa: boolean;
}

const tiposAplicacion = [
  { value: "MAX_HORAS_DIA_DOCENTE", label: "Máximo horas por día (Docente)" },
  { value: "MAX_HORAS_CONSECUTIVAS", label: "Máximo horas consecutivas" },
  { value: "DESCANSO_ENTRE_BLOQUES", label: "Descanso obligatorio entre bloques" },
  { value: "PREFERENCIA_TURNO_GRUPO", label: "Preferencia de turno (Grupo)" },
  { value: "TIEMPO_TRASLADO_AULAS", label: "Tiempo de traslado entre aulas" },
  { value: "RESTRICCION_DIA_DOCENTE", label: "Día no disponible (Docente)" },
  { value: "RESTRICCION_HORA_DOCENTE", label: "Hora no disponible (Docente)" },
  { value: "AULA_ESPECIFICA_MATERIA", label: "Aula específica para materia" },
  { value: "MATERIAS_CONSECUTIVAS", label: "Materias en bloques consecutivos" },
  { value: "MAX_DIAS_DOCENTE", label: "Máximo días por semana (Docente)" }
];

// Schema for form validation
const formSchema = z.object({
  codigo_restriccion: z.string().min(1, "El código es obligatorio"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  tipo_aplicacion: z.string().min(1, "El tipo de aplicación es obligatorio"),
  entidad_id_1: z.number().optional(),
  entidad_id_2: z.number().optional(),
  valor_parametro: z.number().optional(),
  periodo_aplicable: z.number(),
  esta_activa: z.boolean().default(true),
});

const Restricciones = () => {
  const [restricciones, setRestricciones] = useState<Restriccion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentRestriccion, setCurrentRestriccion] = useState<Restriccion | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_restriccion: "",
      descripcion: "",
      tipo_aplicacion: "",
      entidad_id_1: undefined,
      entidad_id_2: undefined,
      valor_parametro: undefined,
      periodo_aplicable: 0,
      esta_activa: true,
    },
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Load restricciones
      const restriccionesData = await fetchData<PaginatedResponse<Restriccion>>("scheduling/configuracion-restricciones/");
      if (restriccionesData && restriccionesData.results) {
        setRestricciones(restriccionesData.results);
      }
      
      // Load periodos
      const periodosData = await fetchData<PaginatedResponse<Periodo>>("academic-setup/periodos-academicos/");
      if (periodosData && periodosData.results) {
        setPeriodos(periodosData.results);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const handleOpenModal = (restriccion?: Restriccion) => {
    if (restriccion) {
      setCurrentRestriccion(restriccion);
      form.reset({
        codigo_restriccion: restriccion.codigo_restriccion,
        descripcion: restriccion.descripcion,
        tipo_aplicacion: restriccion.tipo_aplicacion,
        entidad_id_1: restriccion.entidad_id_1,
        entidad_id_2: restriccion.entidad_id_2,
        valor_parametro: restriccion.valor_parametro,
        periodo_aplicable: restriccion.periodo_aplicable,
        esta_activa: restriccion.esta_activa,
      });
    } else {
      setCurrentRestriccion(null);
      form.reset({
        codigo_restriccion: "",
        descripcion: "",
        tipo_aplicacion: "",
        entidad_id_1: undefined,
        entidad_id_2: undefined,
        valor_parametro: undefined,
        periodo_aplicable: periodos.length > 0 ? periodos[0].id : 0,
        esta_activa: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRestriccion(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    
    if (currentRestriccion) {
      // Update existing restriccion
      const updated = await updateItem<Restriccion>(
        "scheduling/configuracion-restricciones/", 
        currentRestriccion.id, 
        values
      );
      
      if (updated) {
        setRestricciones(restricciones.map(r => r.id === currentRestriccion.id ? updated : r));
        handleCloseModal();
      }
    } else {
      // Create new restriccion
      const created = await createItem<Restriccion>(
        "scheduling/configuracion-restricciones/", 
        values
      );
      
      if (created) {
        setRestricciones([...restricciones, created]);
        handleCloseModal();
      }
    }
  };

  const handleDelete = (restriccion: Restriccion) => {
    setCurrentRestriccion(restriccion);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentRestriccion) return;
    
    const success = await deleteItem("scheduling/configuracion-restricciones/", currentRestriccion.id);
    
    if (success) {
      setRestricciones(restricciones.filter(r => r.id !== currentRestriccion.id));
      setIsDeleteDialogOpen(false);
      setCurrentRestriccion(null);
    }
  };

  const getTipoAplicacionLabel = (tipo: string): string => {
    const tipoAplicacion = tiposAplicacion.find(t => t.value === tipo);
    return tipoAplicacion ? tipoAplicacion.label : tipo;
  };

  const getPeriodoNombre = (periodoId: number): string => {
    const periodo = periodos.find(p => p.id === periodoId);
    return periodo ? periodo.nombre : "Desconocido";
  };

  const columns = [
    { key: "codigo_restriccion", header: "Código" },
    { key: "descripcion", header: "Descripción" },
    { 
      key: "tipo_aplicacion", 
      header: "Tipo", 
      render: (row: Restriccion) => getTipoAplicacionLabel(row.tipo_aplicacion)
    },
    { 
      key: "parametros", 
      header: "Valor", 
      render: (row: Restriccion) => row.valor_parametro?.toString() || "-"
    },
    { 
      key: "periodo_aplicable", 
      header: "Periodo", 
      render: (row: Restriccion) => getPeriodoNombre(row.periodo_aplicable)
    },
    { 
      key: "esta_activa", 
      header: "Estado", 
      render: (row: Restriccion) => (
        <span className={`px-2 py-1 rounded-full text-xs ${row.esta_activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.esta_activa ? "Activa" : "Inactiva"}
        </span>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Configuración de Restricciones" 
        description="Defina reglas y restricciones para la generación de horarios"
        onAdd={() => handleOpenModal()}
      />
      
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Las restricciones permiten definir reglas específicas que serán respetadas durante la generación de horarios. 
              Pueden aplicarse a docentes, grupos, aulas y materias para garantizar la calidad de los horarios.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={restricciones} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentRestriccion ? "Editar Restricción" : "Crear Restricción"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo_restriccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input placeholder="Código de la restricción" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="periodo_aplicable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodo Aplicable</FormLabel>
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
                            <SelectItem key={periodo.id} value={periodo.id.toString()}>
                              {periodo.nombre}
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
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descripción detallada de la restricción" 
                        {...field} 
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tipo_aplicacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Aplicación</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de restricción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposAplicacion.map((tipo) => (
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
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="entidad_id_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Entidad 1</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="entidad_id_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Entidad 2</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="valor_parametro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Parámetro</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="esta_activa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Restricción Activa
                      </FormLabel>
                      <p className="text-sm text-gray-500">
                        Si está marcada, esta restricción será aplicada en la generación automática
                      </p>
                    </div>
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
        title="Eliminar Restricción"
        description={`¿Está seguro que desea eliminar la restricción "${currentRestriccion?.codigo_restriccion}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Restricciones;
