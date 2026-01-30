import { apiClient } from './api';

export interface CourierSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CourierFromGroup {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  lastLocationUpdate?: string | null;
  isActive: boolean;
  linkedAt: string;
  pagarmeStatus?: string | null;
}

export interface GroupServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class GroupService {
  /**
   * Lista todos os motoboys do grupo do ORGANIZER logado
   */
  async getMyCouriers(): Promise<GroupServiceResponse<CourierFromGroup[]>> {
    try {
      console.log('👥 [GroupService] Buscando motoboys do grupo...');
      const response = await apiClient.get<CourierFromGroup[]>('/users/my-couriers');
      
      console.log('✅ [GroupService] Motoboys encontrados:', response.data?.length || 0);
      return {
        success: true,
        data: response.data || []
      };
    } catch (error: any) {
      console.error('❌ [GroupService] Erro ao buscar motoboys:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar motoboys'
      };
    }
  }

  /**
   * Busca motoboys disponíveis para adicionar ao grupo (typeahead)
   */
  async searchCouriers(search?: string, limit: number = 10): Promise<GroupServiceResponse<CourierSearchResult[]>> {
    try {
      console.log('🔍 [GroupService] Buscando motoboys para adicionar:', search || '(todos)');
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit.toString());
      
      const url = `/users/search/couriers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<CourierSearchResult[]>(url);
      
      console.log('✅ [GroupService] Resultados da busca:', response.data?.length || 0);
      return {
        success: true,
        data: response.data || []
      };
    } catch (error: any) {
      console.error('❌ [GroupService] Erro na busca:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro na busca'
      };
    }
  }

  /**
   * Adiciona um motoboy ao grupo do ORGANIZER
   */
  async addCourierToGroup(courierId: string): Promise<GroupServiceResponse<CourierFromGroup>> {
    try {
      console.log('➕ [GroupService] Adicionando motoboy ao grupo:', courierId);
      const response = await apiClient.post<CourierFromGroup>(`/users/my-couriers/${courierId}`);
      
      console.log('✅ [GroupService] Motoboy adicionado com sucesso');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ [GroupService] Erro ao adicionar motoboy:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao adicionar motoboy'
      };
    }
  }

  /**
   * Remove um motoboy do grupo do ORGANIZER
   */
  async removeCourierFromGroup(courierId: string): Promise<GroupServiceResponse<{ message: string }>> {
    try {
      console.log('🗑️ [GroupService] Removendo motoboy do grupo:', courierId);
      const response = await apiClient.delete<{ message: string }>(`/users/my-couriers/${courierId}`);
      
      console.log('✅ [GroupService] Motoboy removido com sucesso');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ [GroupService] Erro ao remover motoboy:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao remover motoboy'
      };
    }
  }

  /**
   * Verifica se um motoboy está online (última localização recente)
   */
  isOnline(courier: CourierFromGroup): boolean {
    if (!courier.lastLocationUpdate) return false;
    
    const lastUpdate = new Date(courier.lastLocationUpdate);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    // Considera online se última localização foi há menos de 5 minutos
    return diffMinutes < 5;
  }

  /**
   * Formata o tempo desde a última atualização de localização
   */
  formatLastSeen(lastLocationUpdate: string | null): string {
    if (!lastLocationUpdate) return 'Nunca visto';
    
    const lastUpdate = new Date(lastLocationUpdate);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  }
}

export const groupService = new GroupService();
