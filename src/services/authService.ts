import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from '../utils/errorLogger';
import { deliveryPollingService } from './deliveryPollingService';
import { bankAccountService } from './bankAccountService';
// import { crashlyticsService } from './crashlyticsService'; // Desabilitado para Expo Go

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

interface RegisterRequest {
  name: string;
  username: string;
  cpf: string;
  password: string;
  role: string;
}

interface RegisterErrorResponse extends AuthResponse {
  statusCode?: number;
}

/**
 * Serviço de autenticação
 */
export class AuthService {
  
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('🔐 AuthService.login - Tentando login com:', { email });
    
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
      
      // Limpeza inteligente de caches no login:
      // - Pendentes: remove > 1 dia
      // - Completadas: mantém apenas não-pagas
      // - Ativas: limpa tudo (recarrega do backend)
      await deliveryPollingService.cleanupCachesOnLogin();

      // Atualiza flag local de conta bancária ativa APENAS para COURIER e ORGANIZER
      // Clientes (CUSTOMER) não precisam de conta bancária
      if (mappedUser.role === 'courier' || mappedUser.role === 'organizer') {
        try {
          await bankAccountService.refreshHasActiveBankAccount(mappedUser.id);
        } catch (err) {
          console.warn('⚠️ Não foi possível atualizar flag de conta bancária ativa no login:', err);
        }
      }

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
    console.log('🌐 Validando token na API Real');
    const response = await apiClient.get('/auth/validate');
    return response.data;
  }

  /**
   * Registra um novo usuário
   */
  async register(data: RegisterRequest): Promise<RegisterErrorResponse> {
    console.log('📝 AuthService.register - Criando conta:', { username: data.username, role: data.role });

    try {
      const response = await apiClient.post<{ message: string }>('/auth/register', data);

      console.log('✅ Conta criada com sucesso:', response.status);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar conta:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);

      const statusCode = error.response?.status;
      let errorMessage = 'Erro ao criar conta';
      
      if (error.response?.data) {
        const serverMessage = error.response.data.message || error.response.data.error || error.response.data;

        if (typeof serverMessage === 'string') {
          if (serverMessage.includes('already exists') || serverMessage.includes('já cadastrado')) {
            errorMessage = serverMessage; // Usa mensagem completa do servidor
          } else if (serverMessage.includes('CPF')) {
            errorMessage = 'CPF inválido ou já cadastrado';
          } else {
            errorMessage = serverMessage;
          }
        }
      }

      return {
        success: false,
        error: errorMessage,
        statusCode,
      };
    }
  }

  /**
   * Reenvia email de confirmação para conta não confirmada
   */
  async resendConfirmation(email: string): Promise<{ message: string }> {
    console.log('📧 AuthService.resendConfirmation - Reenviando email:', email);

    try {
      const response = await apiClient.post<{ message: string }>('/auth/resend-confirmation', {
        username: email,
      });

      console.log('✅ Email de confirmação reenviado com sucesso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao reenviar email:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      throw error;
    }
  }

  /**
   * Envia email para recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    console.log('🔑 AuthService.forgotPassword - Enviando link de recuperação:', email);

    try {
      await apiClient.post('/auth/forgot-password', {
        email,
      });

      console.log('✅ Link de recuperação enviado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao enviar link de recuperação:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      throw error;
    }
  }
  
  async logout() {
    console.log('🌐 Logout na API Real');
    const response = await apiClient.post('/auth/logout');
    // Limpa flag local de conta bancária ativa
    await bankAccountService.clearHasActiveBankAccount();
    return response.data;
  }
  
  /**
   * Retorna o usuário logado do AsyncStorage
   */
  async getCurrentUser(): Promise<User | null> {
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