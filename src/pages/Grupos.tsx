
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
  id: number;
  nombre_carrera: string;
}

interface Materia {
  id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface Periodo {
  id: number;
  nombre: string;
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
  carrera: number;
  periodo: number;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente: number | null;
  materia_nombre?: string;
  carrera_nombre?: string;
  periodo_nombre?: string;
  docente_nombre?: string;
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
      
      // Load grupos
      const gruposData = await fetchData<Grupo>("scheduling/grupos/");
      
      // Load carreras
      const carrerasData = await fetchData<Carrera>("academic/carreras/");
      
      // Load materias
      const materiasData = await fetchData<Materia>("academic/materias/");
      
      // Load periodos
      const periodosData = await fetchData<Periodo>("academic/periodos-academicos/");
      
      // Load docentes
      const docentesData = await fetchData<Docente>("users/docentes/");
      
      if (gruposData && carrerasData && materiasData && periodosData && docentesData) {
        // Enrich grupos with related info
        const enrichedGrupos = gruposData.map(grupo => {
          const materia = materiasData.find(m => m.id === grupo.materia);
          const carrera = carrerasData.find(c => c.id === grupo.carrera);
          const periodo = periodosData.find(p => p.id === grupo.periodo);
          const docente = docentesData.find(d => d.id === grupo.docente_asignado_directamente);
          
          return {
            ...grupo,
            materia_nombre: materia ? materia.nombre_materia : 'Desconocido',
            carrera_nombre: carrera ? carrera.nombre_carrera : 'Desconocido',
            periodo_nombre: periodo ? periodo.nombre : 'Desconocido',
            docente_nombre: docente ? `${docente.nombres} ${docente.apellidos}` : '---',
          };
        });
        
        setGrupos(enrichedGrupos);
        setCarreras(carrerasData);
        setMaterias(materiasData);
        setPeriodos(periodosData);
        setDocentes(docentesData);
      }
      
      setIsLoading(false);
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
        currentGrupo.id, 
        values
      );
      
      if (updated) {
        // Enrich updated grupo with additional info
        const materia = materias.find(m => m.id === updated.materia);
        const carrera = carreras.find(c => c.id === updated.carrera);
        const periodo = periodos.find(p => p.id === updated.periodo);
        const docente = docentes.find(d => d.id === updated.docente_asignado_directamente);
        
        const enrichedUpdated = {
          ...updated,
          materia_nombre: materia ? materia.nombre_materia : 'Desconocido',
          carrera_nombre: carrera ? carrera.nombre_carrera : 'Desconocido',
          periodo_nombre: periodo ? periodo.nombre : 'Desconocido',
          docente_nombre: docente ? `${docente.nombres} ${docente.apellidos}` : '---',
        };
        
        setGrupos(grupos.map(g => g.id === currentGrupo.id ? enrichedUpdated : g));
        handleCloseModal();
      }
    } else {
      // Create new grupo
      const created = await createItem<Grupo>(
        "scheduling/grupos/", 
        values
      );
      
      if (created) {
        // Enrich created grupo with additional info
        const materia = materias.find(m => m.id === created.materia);
        const carrera = carreras.find(c => c.id === created.carrera);
        const periodo = periodos.find(p => p.id === created.periodo);
        const docente = docentes.find(d => d.id === created.docente_asignado_directamente);
        
        const enrichedCreated = {
          ...created,
          materia_nombre: materia ? materia.nombre_materia : 'Desconocido',
          carrera_nombre: carrera ? carrera.nombre_carrera : 'Desconocido',
          periodo_nombre: periodo ? periodo.nombre : 'Desconocido',
          docente_nombre: docente ? `${docente.nombres} ${docente.apellidos}` : '---',
        };
        
        setGrupos([...grupos, enrichedCreated]);
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
    
    const success = await deleteItem("scheduling/grupos/", currentGrupo.id);
    
    if (success) {
      setGrupos(grupos.filter(g => g.id !== currentGrupo.id));
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
    { key: "materia_nombre", header: "Materia" },
    { key: "carrera_nombre", header: "Carrera" },
    { key: "periodo_nombre", header: "Periodo" },
    { key: "numero_estudiantes_estimado", header: "Estudiantes" },
    { 
      key: "turno_preferente", 
      header: "Turno",
      render: (row: Grupo) => getTurnoLabel(row.turno_preferente)
    },
    { key: "docente_nombre", header: "Docente asignado" },
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
                          <SelectItem key={carrera.id} value={carrera.id.toString()}>
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
                          <SelectItem key={materia.id} value={materia.id.toString()}>
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
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin asignación directa</SelectItem>
                        {docentes.map((docente) => (
                          <SelectItem key={docente.id} value={docente.id.toString()}>
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
