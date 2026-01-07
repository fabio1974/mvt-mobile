import { apiClient } from './api';

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
}

export const bankAccountService = new BankAccountService();
export default BankAccountService;
