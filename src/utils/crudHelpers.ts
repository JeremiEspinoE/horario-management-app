
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { AxiosError } from "axios";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchData<T>(endpoint: string): Promise<T[] | null> {
  try {
    const response = await client.get<PaginatedResponse<T> | T[]>(endpoint);
    
    // Check if response has pagination structure
    if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    
    return response.data as T[];
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error fetching data from ${endpoint}:`, axiosError);
    toast.error(`Error al cargar datos: ${axiosError.message}`);
    return null;
  }
}

export async function createItem<T>(endpoint: string, data: any): Promise<T | null> {
  try {
    const response = await client.post<T>(endpoint, data);
    toast.success("Registro creado exitosamente");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error creating item at ${endpoint}:`, axiosError);
    toast.error(`Error al crear: ${axiosError.message}`);
    return null;
  }
}

export async function updateItem<T>(endpoint: string, id: number | string, data: any): Promise<T | null> {
  try {
    const response = await client.put<T>(`${endpoint}${id}/`, data);
    toast.success("Registro actualizado exitosamente");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error updating item at ${endpoint}${id}/:`, axiosError);
    toast.error(`Error al actualizar: ${axiosError.message}`);
    return null;
  }
}

export async function deleteItem(endpoint: string, id: number | string): Promise<boolean> {
  try {
    await client.delete(`${endpoint}${id}/`);
    toast.success("Registro eliminado exitosamente");
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error deleting item at ${endpoint}${id}/:`, axiosError);
    toast.error(`Error al eliminar: ${axiosError.message}`);
    return false;
  }
}

export async function getItemById<T>(endpoint: string, id: number | string): Promise<T | null> {
  try {
    const response = await client.get<T>(`${endpoint}${id}/`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error fetching item at ${endpoint}${id}/:`, axiosError);
    toast.error(`Error al cargar datos: ${axiosError.message}`);
    return null;
  }
}
