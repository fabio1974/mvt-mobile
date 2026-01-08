import { apiClient } from './api';

export interface Bank {
  code: string;
  name: string;
}

interface BanksResponse {
  success: boolean;
  data: Bank[];
  error?: string;
}

class BanksService {
  private banksCache: Bank[] | null = null;
  private cacheExpiry: number | null = null;
  private CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  async getBanks(forceRefresh: boolean = false): Promise<BanksResponse> {
    try {
      // Retorna cache se válido e não forçou refresh
      if (!forceRefresh && this.banksCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        console.log('🏦 Retornando bancos do cache');
        return {
          success: true,
          data: this.banksCache,
        };
      }

      console.log('🌐 Buscando bancos do servidor...');
      const response = await apiClient.get('/api/banks');

      if (Array.isArray(response.data)) {
        this.banksCache = response.data;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        console.log(`✅ ${response.data.length} bancos carregados com sucesso`);
        return {
          success: true,
          data: response.data,
        };
      }

      console.error('❌ Resposta inválida de bancos:', response.data);
      return {
        success: false,
        data: [],
        error: 'Formato de resposta inválido',
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar bancos:', error);
      
      // Se falhar, retorna cache antigo se disponível
      if (this.banksCache) {
        console.log('⚠️ Usando cache antigo de bancos');
        return {
          success: true,
          data: this.banksCache,
        };
      }

      return {
        success: false,
        data: [],
        error: error.message || 'Erro ao buscar lista de bancos',
      };
    }
  }

  // Limpa o cache
  clearCache() {
    this.banksCache = null;
    this.cacheExpiry = null;
    console.log('🧹 Cache de bancos limpo');
  }
}

export const banksService = new BanksService();
