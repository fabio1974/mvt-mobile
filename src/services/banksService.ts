import AsyncStorage from '@react-native-async-storage/async-storage';
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

interface CachedBanks {
  banks: Bank[];
  timestamp: number;
}

class BanksService {
  private banksCache: Bank[] | null = null;
  private cacheExpiry: number | null = null;
  private CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private CACHE_KEY = 'banks_cache';

  async getBanks(forceRefresh: boolean = false): Promise<BanksResponse> {
    try {
      // Tenta carregar do cache em memória primeiro
      if (!forceRefresh && this.banksCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        console.log('🏦 Retornando bancos do cache em memória');
        return {
          success: true,
          data: this.banksCache,
        };
      }

      // Se não tiver em memória, tenta carregar do AsyncStorage
      if (!forceRefresh && !this.banksCache) {
        const cachedData = await this.getFromAsyncStorage();
        if (cachedData) {
          console.log('💾 Retornando bancos do cache persistente (AsyncStorage)');
          this.banksCache = cachedData.banks;
          this.cacheExpiry = cachedData.timestamp + this.CACHE_DURATION;
          return {
            success: true,
            data: cachedData.banks,
          };
        }
      }

      // Cache expirou ou foi forçado refresh - busca do servidor
      console.log('🌐 Buscando bancos do servidor...');
      const response = await apiClient.get('/api/banks');

      if (Array.isArray(response.data)) {
        this.banksCache = response.data;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        
        // Salva no AsyncStorage para persistência
        await this.saveToAsyncStorage(response.data);
        
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
      
      // Se falhar, retorna cache antigo se disponível (memória)
      if (this.banksCache) {
        console.log('⚠️ Usando cache antigo em memória');
        return {
          success: true,
          data: this.banksCache,
        };
      }

      // Se também não tiver em memória, tenta AsyncStorage (mesmo expirado)
      const cachedData = await this.getFromAsyncStorage();
      if (cachedData) {
        console.log('⚠️ Usando cache expirado do AsyncStorage');
        this.banksCache = cachedData.banks;
        return {
          success: true,
          data: cachedData.banks,
        };
      }

      return {
        success: false,
        data: [],
        error: error.message || 'Erro ao buscar lista de bancos',
      };
    }
  }

  private async getFromAsyncStorage(): Promise<CachedBanks | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedBanks;
        // Verifica se o cache ainda é válido (< 7 dias)
        const isExpired = Date.now() - parsed.timestamp > this.CACHE_DURATION;
        if (!isExpired) {
          return parsed;
        }
        console.log('⏰ Cache do AsyncStorage expirou');
        return parsed; // Retorna mesmo expirado para fallback
      }
    } catch (error) {
      console.error('❌ Erro ao ler cache do AsyncStorage:', error);
    }
    return null;
  }

  private async saveToAsyncStorage(banks: Bank[]): Promise<void> {
    try {
      const data: CachedBanks = {
        banks,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
      console.log('💾 Cache de bancos salvo no AsyncStorage');
    } catch (error) {
      console.error('❌ Erro ao salvar cache no AsyncStorage:', error);
    }
  }

  // Limpa o cache (memória e AsyncStorage)
  async clearCache() {
    this.banksCache = null;
    this.cacheExpiry = null;
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log('🧹 Cache de bancos limpo (memória + AsyncStorage)');
    } catch (error) {
      console.error('❌ Erro ao limpar cache do AsyncStorage:', error);
    }
  }
}

export const banksService = new BanksService();
