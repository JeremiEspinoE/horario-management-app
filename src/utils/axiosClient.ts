
import axios from 'axios';

const client = axios.create({ 
  baseURL: 'http://localhost:8000/api/' 
});

client.interceptors.request.use(config => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Interceptor for handling token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried refreshing the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const refreshResponse = await axios.post('http://localhost:8000/api/auth/refresh/', {
          refresh: refreshToken
        });
        
        const { access } = refreshResponse.data;
        localStorage.setItem('accessToken', access);
        
        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If token refresh fails, clear auth data and reload
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default client;
