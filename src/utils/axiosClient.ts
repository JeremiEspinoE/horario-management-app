
import axios from 'axios';
import { toast } from 'sonner';

const client = axios.create({ 
  baseURL: 'http://localhost:8000/api/' 
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  console.error('Error with request:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle common errors
client.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Handle network errors
    if (!error.response) {
      toast.error('Error de conexión al servidor. Verifique su conexión a internet.');
      return Promise.reject(error);
    }
    
    // Handle specific HTTP errors
    switch (error.response.status) {
      case 401:
        toast.error('Sesión expirada o no autorizada. Por favor inicie sesión nuevamente.');
        // Optionally redirect to login
        // window.location.href = '/login';
        break;
      case 403:
        toast.error('No tiene permisos para realizar esta acción.');
        break;
      case 404:
        toast.error('El recurso solicitado no fue encontrado.');
        break;
      case 500:
        toast.error('Error interno del servidor. Por favor intente más tarde.');
        break;
      default:
        if (error.response.data && error.response.data.detail) {
          toast.error(`Error: ${error.response.data.detail}`);
        } else {
          toast.error('Ocurrió un error inesperado.');
        }
    }
    
    return Promise.reject(error);
  }
);

export default client;
