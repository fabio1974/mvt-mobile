import { apiClient } from './api';

// Tipos
export interface ClientFromGroup {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  contractStatus: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
}

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Service
class ClientService {
  /**
   * Lista todos os clientes vinculados à organização do ORGANIZER
   */
  async getMyClients(): Promise<ApiResponse<ClientFromGroup[]>> {
    try {
      const response = await apiClient.get<ClientFromGroup[]>('/users/my-clients');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [ClientService] Erro ao buscar clientes:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar clientes',
      };
    }
  }

  /**
   * Busca clientes para adicionar ao grupo (typeahead)
   */
  async searchClients(search: string, limit: number = 10): Promise<ApiResponse<ClientSearchResult[]>> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit.toString());

      const response = await apiClient.get<ClientSearchResult[]>(
        `/users/search/clients?${params.toString()}`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [ClientService] Erro na busca:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar clientes',
      };
    }
  }

  /**
   * Adiciona um cliente ao grupo
   */
  async addClientToGroup(clientId: string): Promise<ApiResponse<ClientFromGroup>> {
    try {
      const response = await apiClient.post<ClientFromGroup>(`/users/my-clients/${clientId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [ClientService] Erro ao adicionar cliente:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao adicionar cliente',
      };
    }
  }

  /**
   * Remove um cliente do grupo
   */
  async removeClientFromGroup(clientId: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/users/my-clients/${clientId}`);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('❌ [ClientService] Erro ao remover cliente:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao remover cliente',
      };
    }
  }

  /**
   * Formata telefone para exibição
   */
  formatPhone(phone: string): string {
    if (!phone) return '';
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    // Formata: (XX) XXXXX-XXXX
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return phone;
  }

  /**
   * Formata documento (CPF/CNPJ)
   */
  formatDocument(doc: string | null): string {
    if (!doc) return 'N/A';
    const numbers = doc.replace(/\D/g, '');
    
    // CPF: 000.000.000-00
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }
    
    // CNPJ: 00.000.000/0000-00
    if (numbers.length === 14) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
    }
    
    return doc;
  }

  /**
   * Formata data (YYYY-MM-DD) para exibição (DD/MM/YYYY)
   */
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  /**
   * Retorna badge do status do contrato
   */
  getStatusInfo(status: ClientFromGroup['contractStatus']): { label: string; color: string } {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Ativo', color: '#10b981' };
      case 'SUSPENDED':
        return { label: 'Suspenso', color: '#f59e0b' };
      case 'CANCELLED':
        return { label: 'Cancelado', color: '#ef4444' };
      default:
        return { label: status, color: '#6b7280' };
    }
  }
}

export const clientService = new ClientService();
