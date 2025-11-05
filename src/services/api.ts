import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL da API - configurar via .env em produção
// Para dispositivos físicos, usar IP da rede local
// Para simulador iOS, pode usar localhost ou 127.0.0.1
const API_URL = __DEV__ 
  ? 'http://192.168.1.254:8080/api' // IP do seu Mac na rede local
  : 'https://api.mvt.com.br/api'; // Production

// Função para detectar se está rodando no simulador ou dispositivo físico
const getApiUrl = () => {
  if (__DEV__) {
    // Para desenvolvimento, detecta automaticamente a plataforma
    
    // Opção 1: Localhost (funciona no simulador e navegador web)
    return 'http://localhost:8080/api';
    
    // Opção 2: IP da rede local (descomente para dispositivos físicos)
    // return 'http://192.168.1.254:8080/api';
    
    // Opção 3: Para emulador Android (descomente se estiver usando emulador)
    // return 'http://10.0.2.2:8080/api';
  }
  
  return 'https://api.mvt.com.br/api'; // Production
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - adiciona token de autenticação
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log apenas em desenvolvimento
        if (__DEV__) {
          console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - trata erros globalmente
    this.client.interceptors.response.use(
      (response) => {
        // Log apenas em desenvolvimento
        if (__DEV__) {
          console.log(`📥 API Response: ${response.config.url} - ${response.status}`);
        }
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        
        console.error(`❌ API Error: ${error.config?.url} - ${status}`, error.response?.data);

        // 401 - Token expirado ou inválido
        if (status === 401) {
          await this.handleUnauthorized();
        }

        // 403 - Acesso negado
        if (status === 403) {
          console.error('🚫 Acesso negado');
        }

        // 500 - Erro do servidor
        if (status === 500) {
          console.error('💥 Erro interno do servidor');
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized() {
    // Limpa token e redireciona para login
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    
    console.log('🔒 Token inválido - redirecionando para login');
    
    // TODO: Trigger navigation to login screen
    // This will be handled by the app's auth context
  }

  // ========== MÉTODOS HTTP ==========

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // ========== MÉTODOS UTILITÁRIOS ==========

  /**
   * Define o token de autenticação
   */
  async setAuthToken(token: string) {
    await AsyncStorage.setItem('auth_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove o token de autenticação
   */
  async clearAuthToken() {
    await AsyncStorage.removeItem('auth_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Retorna a URL base da API
   */
  getBaseURL(): string {
    return getApiUrl();
  }

  /**
   * Atualiza a URL base (útil para testes)
   */
  setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }
}

// Exporta instância singleton
export const apiClient = new ApiClient();

// Exporta classe para casos de uso avançados
export default ApiClient;
