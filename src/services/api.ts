import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

/**
 * Gera comando curl equivalente para debug
 */
const generateCurlCommand = (config: any): string => {
  const method = (config.method || 'get').toUpperCase();
  const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
  const headers = config.headers || {};
  
  let curl = `curl -X ${method} '${url}'`;
  
  // Adiciona headers
  Object.keys(headers).forEach(key => {
    if (headers[key] && key !== 'common' && key !== 'delete' && key !== 'get' && 
        key !== 'head' && key !== 'post' && key !== 'put' && key !== 'patch') {
      curl += ` \\\n  -H '${key}: ${headers[key]}'`;
    }
  });
  
  // Adiciona body (se houver)
  if (config.data) {
    const data = typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2);
    curl += ` \\\n  -d '${data}'`;
  }
  
  return curl;
};

// Função para detectar se está rodando no simulador ou dispositivo físico
const getApiUrl = () => {
  return ENV.API_URL;
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
    // Request interceptor - adiciona token de autenticação e loga requisições
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log detalhado em desenvolvimento
        if (__DEV__) {
          console.log('\n� =============== REQUEST ===============');
          console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
          console.log('📍 Base URL:', config.baseURL);
          console.log('📋 Headers:', JSON.stringify(config.headers, null, 2));
          if (config.data) {
            console.log('📦 Body:', typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2));
          }
          console.log('\n🔧 CURL Equivalente:');
          console.log(generateCurlCommand(config));
          console.log('========================================\n');
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - loga respostas e trata erros
    this.client.interceptors.response.use(
      (response) => {
        // Log detalhado em desenvolvimento
        if (__DEV__) {
          console.log('\n✅ =============== RESPONSE ===============');
          console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url}`);
          console.log('📊 Status:', response.status, response.statusText);
          console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
          console.log('📦 Data:', JSON.stringify(response.data, null, 2));
          console.log('=========================================\n');
        }
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        
        // Log detalhado do erro
        console.error('\n❌ =============== ERROR ===============');
        console.error(`🔴 ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.error('📊 Status:', status, error.response?.statusText);
        console.error('📋 Response Headers:', JSON.stringify(error.response?.headers, null, 2));
        console.error('📦 Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('💬 Error Message:', error.message);
        if (error.config?.data) {
          console.error('📤 Request Data:', typeof error.config.data === 'string' 
            ? error.config.data 
            : JSON.stringify(error.config.data, null, 2));
        }
        console.error('\n🔧 CURL para reproduzir:');
        console.error(generateCurlCommand(error.config));
        console.error('=======================================\n');

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
