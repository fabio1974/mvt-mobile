import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BankAccount {
  id?: string | number;
  bankCode: string;
  bankName?: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountType: 'CHECKING' | 'SAVINGS';
  automaticTransfer: boolean;
  transferInterval?: 'Daily' | 'Weekly' | 'Monthly';
  transferDay?: number;
  status: 'PENDING_VALIDATION' | 'ACTIVE' | 'INACTIVE';
  user?: {
    id: string;
  };
  validatedAt?: string;
}

export interface BankAccountResponse {
  success: boolean;
  data?: BankAccount | BankAccount[];
  error?: string;
}

const STORAGE_KEY_HAS_ACTIVE_BANK = 'has_active_bank_account';

class BankAccountService {
  /**
   * Busca contas bancárias do usuário logado
   */
  async getUserBankAccounts(userId: string): Promise<BankAccountResponse> {
    try {
      console.log(`🏦 Buscando contas bancárias do usuário ${userId}...`);
      
      const response = await apiClient.get<BankAccount[]>(
        `/bank-accounts/user/${userId}`
      );

      if (response.data) {
        const accounts = Array.isArray(response.data) 
          ? response.data 
          : [response.data];
        
        console.log(`✅ ${accounts.length} conta(s) bancária(s) encontrada(s)`);
        
        return {
          success: true,
          data: accounts,
        };
      }

      return {
        success: true,
        data: [],
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar contas bancárias:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar contas bancárias',
      };
    }
  }

  /**
   * Cria uma nova conta bancária
   */
  async createBankAccount(account: Omit<BankAccount, 'id'>): Promise<BankAccountResponse> {
    try {
      console.log('🏦 Criando nova conta bancária...', account);
      
      const response = await apiClient.post<BankAccount>(
        '/bank-accounts',
        account
      );

      if (response.data) {
        console.log('✅ Conta bancária criada com sucesso!', response.data);
        const isActive = response.data.status === 'ACTIVE';
        await this.setHasActiveBankAccount(isActive);
        
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: 'Erro ao criar conta bancária',
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar conta bancária:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao criar conta bancária',
      };
    }
  }

  /**
   * Atualiza uma conta bancária existente
   */
  async updateBankAccount(
    accountId: string | number,
    account: BankAccount
  ): Promise<BankAccountResponse> {
    try {
      console.log(`🏦 Atualizando conta bancária ${accountId}...`, account);
      
      const response = await apiClient.put<BankAccount>(
        `/bank-accounts/${accountId}`,
        account
      );

      if (response.data) {
        console.log('✅ Conta bancária atualizada com sucesso!', response.data);
        const isActive = response.data.status === 'ACTIVE';
        await this.setHasActiveBankAccount(isActive);
        
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: 'Erro ao atualizar conta bancária',
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar conta bancária:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao atualizar conta bancária',
      };
    }
  }

  /**
   * Deleta uma conta bancária
   */
  async deleteBankAccount(accountId: string | number): Promise<BankAccountResponse> {
    try {
      console.log(`🏦 Deletando conta bancária ${accountId}...`);
      
      const response = await apiClient.delete(
        `/bank-accounts/${accountId}`
      );

      console.log('✅ Conta bancária deletada com sucesso!');
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Erro ao deletar conta bancária:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao deletar conta bancária',
      };
    }
  }

  /**
   * Flag persistida indicando se o usuário tem conta bancária ATIVA
   */
  async setHasActiveBankAccount(value: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_HAS_ACTIVE_BANK, value ? 'true' : 'false');
  }

  async clearHasActiveBankAccount(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_HAS_ACTIVE_BANK);
  }

  async getHasActiveBankAccount(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_HAS_ACTIVE_BANK);
    return stored === 'true';
  }

  /**
   * Revalida no backend e persiste a flag de conta ATIVA
   */
  async refreshHasActiveBankAccount(userId: string): Promise<boolean> {
    const result = await this.getUserBankAccounts(userId);
    if (!result.success || !result.data) {
      await this.setHasActiveBankAccount(false);
      return false;
    }

    const accounts = Array.isArray(result.data) ? result.data : [result.data];
    const hasActive = accounts.some(acc => acc.status === 'ACTIVE');
    await this.setHasActiveBankAccount(hasActive);
    return hasActive;
  }
}

export const bankAccountService = new BankAccountService();
export default BankAccountService;
