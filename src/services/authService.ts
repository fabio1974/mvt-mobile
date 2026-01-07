import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from '../utils/errorLogger';
// import { crashlyticsService } from './crashlyticsService'; // Desabilitado para Expo Go

/**
 * Serviço de autenticação mock/desenvolvimento
 * Use este arquivo para simular respostas do backend durante desenvolvimento
 */

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
}

interface MockLoginResponse {
  success: boolean;
  data: {
    user: MockUser;
    token: string;
  };
  message?: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: MockUser;
  error?: string;
}

// Usuários mock para desenvolvimento
const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    name: 'Admin Zapi10',
    email: 'admin@zapi10.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'José Barros',
    email: 'jose.barros@zapi10.com',
    role: 'user'
  },
  {
    id: '3',
    name: 'Entregador',
    email: 'entregador@zapi10.com',
    role: 'COURIER'
  }
];

/**
 * Simula login para desenvolvimento
 * Credenciais de teste:
 * - admin@zapi10.com / 123456
 * - jose.barros@zapi10.com / 123456
 * - entregador@zapi10.com / 123456
 */
export const mockLogin = async (email: string, password: string): Promise<MockLoginResponse> => {
  console.log('🧪 Mock Login - Email:', email, 'Password:', password);
  
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Valida credenciais básicas
  if (password !== '123456') {
    return {
      success: false,
      data: null as any,
      message: 'Email ou senha incorretos'
    };
  }
  
  // Busca usuário
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return {
      success: false,
      data: null as any,
      message: 'Email ou senha incorretos'
    };
  }
  
  // Sucesso - gera token mock
  const token = `mock_token_${user.id}_${Date.now()}`;
  
  return {
    success: true,
    data: {
      user,
      token
    },
    message: 'Login realizado com sucesso!'
  };
};

/**
 * Simula validação de token para desenvolvimento
 */
export const mockValidateToken = async (): Promise<{ success: boolean; user?: MockUser }> => {
  console.log('🧪 Mock Token Validation');
  
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Para mock, sempre retorna sucesso com usuário padrão
  return {
    success: true,
    user: MOCK_USERS[1] // José Barros
  };
};

/**
 * Wrapper para usar mock ou API real baseado na configuração
 */
export class AuthService {
  // Toggle para usar mock ou API real
  private useMock = false; // Mude para false para usar API real
  
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('🔐 AuthService.login - Tentando login com:', { email, useMock: this.useMock });
    
    if (this.useMock) {
      const mockResult = await mockLogin(email, password);
      return {
        success: mockResult.success,
        token: mockResult.data?.token,
        user: mockResult.data?.user,
        error: mockResult.message
      };
    }

    try {
      console.log('📡 Fazendo chamada para API real...');

      
      const response = await apiClient.post<{
        type: string;
        token: string;
        username: string;
        user: {
          userId: string;
          email: string;
          name: string;
          role: string;
          gender?: string;
          organizationId: number;
          phone: string;
          cpf: string;
          address: string;
        };
      }>('/auth/login', {
        username: email, // O backend espera "username" mas vamos usar o email
        password,
      });

      console.log('✅ Resposta da API recebida:', response.status);

      const { token, user } = response.data;

      // Mapeia dados do backend para o formato esperado pelo app
      const mappedUser = {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        gender: user.gender
      };

      // Salva token e usuário
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
      await apiClient.setAuthToken(token);

      // Define usuário no Crashlytics (desabilitado para Expo Go)
      // crashlyticsService.setUser(mappedUser.id, mappedUser.email, mappedUser.name);

      return {
        success: true,
        token,
        user: mappedUser,
      };
    } catch (error: any) {
      console.error('❌ Erro no login real:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      console.error('❌ Message:', error.message);
      
      // Registra erro no Crashlytics (desabilitado para Expo Go)
      // crashlyticsService.recordError(error, `Login failed for email: ${email}`);
      // crashlyticsService.setAttribute('login_email', email);
      
      // Se der erro de rede, vamos tentar o mock como fallback
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.message.includes('Network Error')) {
        console.log('🔄 Erro de rede - usando mock como fallback');
        const mockResult = await mockLogin(email, password);
        return {
          success: mockResult.success,
          token: mockResult.data?.token,
          user: mockResult.data?.user,
          error: mockResult.message
        };
      }

      // Trata mensagem de erro específica
      let errorMessage = 'Erro ao fazer login';
      if (error.response?.data) {
        const serverMessage = error.response.data.message || error.response.data.error || error.response.data;
        
        if (serverMessage === "Invalid username or password" || 
            serverMessage.includes("Invalid username") ||
            serverMessage.includes("Invalid password")) {
          errorMessage = "Usuário ou senha inválidos";
        } else if (typeof serverMessage === 'string') {
          errorMessage = serverMessage;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
  
  async validateToken() {
    if (this.useMock) {
      console.log('🧪 Usando Mock Token Validation');
      return await mockValidateToken();
    } else {
      console.log('🌐 Validando token na API Real');
      const response = await apiClient.get('/auth/validate');
      return response.data;
    }
  }
  
  async logout() {
    if (this.useMock) {
      console.log('🧪 Mock Logout');
      return { success: true };
    } else {
      console.log('🌐 Logout na API Real');
      const response = await apiClient.post('/auth/logout');
      return response.data;
    }
  }
  
  /**
   * Alterna entre mock e API real
   */
  setUseMock(useMock: boolean) {
    this.useMock = useMock;
    console.log(`🔄 Auth Service: ${useMock ? 'Mock' : 'API Real'} ativado`);
  }
  
  /**
   * Retorna se está usando mock
   */
  isUsingMock(): boolean {
    return this.useMock;
  }
  
  /**
   * Retorna o usuário logado do AsyncStorage
   */
  async getCurrentUser(): Promise<MockUser | null> {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário atual:', error);
      return null;
    }
  }
  
  /**
   * Tenta fazer auto-login com credenciais salvas
   */
  async tryAutoLogin(): Promise<AuthResponse | null> {
    try {
      const savedEmail = await AsyncStorage.getItem("saved_email");
      const savedPassword = await AsyncStorage.getItem("saved_password");
      const keepLoggedIn = await AsyncStorage.getItem("keep_logged_in");

      if (savedEmail && savedPassword && keepLoggedIn === "true") {
        console.log("🔄 Tentando auto-login com credenciais salvas");
        return await this.login(savedEmail, savedPassword);
      }
      
      return null;
    } catch (error) {
      console.error("Erro no auto-login:", error);
      return null;
    }
  }
}

// Exporta instância singleton
export const authService = new AuthService();