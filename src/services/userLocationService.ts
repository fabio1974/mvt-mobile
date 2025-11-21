import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserLocationUpdate {
  gpsLatitude: number;
  gpsLongitude: number;
  updatedAt?: string;
}

interface LocationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

class UserLocationService {
  /**
   * Atualiza localização do usuário atual
   */
  async updateCurrentUserLocation(
    latitude: number, 
    longitude: number
  ): Promise<LocationResponse> {
    try {
      // Obtém dados do usuário logado para pegar o ID
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        return {
          success: false,
          message: 'Usuário não logado',
        };
      }

      const user = JSON.parse(userData);
      const userId = user.id || user.userId; // Tenta ambos os campos

      if (!userId) {
        return {
          success: false,
          message: 'ID do usuário não encontrado',
        };
      }

      const updateData: UserLocationUpdate = {
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        updatedAt: new Date().toISOString(),
      };

      console.log(`📍 Atualizando localização do usuário ${userId}:`, updateData);

      // Usa o endpoint correto: PUT /api/users/{USER_ID}/location
      const response = await apiClient.put(`/users/${userId}/location`, updateData);
      
      console.log('✅ Localização atualizada com sucesso no backend');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar localização do usuário:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao atualizar localização',
      };
    }
  }

  /**
   * Atualiza localização de um usuário específico (para admins)
   */
  async updateUserLocation(
    userId: string,
    latitude: number, 
    longitude: number
  ): Promise<LocationResponse> {
    try {
      const updateData: UserLocationUpdate = {
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        updatedAt: new Date().toISOString(),
      };

      console.log(`📍 Atualizando localização do usuário ${userId} (admin):`, updateData);

      // Usa o endpoint correto: PUT /api/users/{USER_ID}/location
      const response = await apiClient.put(`/users/${userId}/location`, updateData);
      
      console.log('✅ Localização do usuário atualizada com sucesso (admin)');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar localização do usuário:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao atualizar localização',
      };
    }
  }

  /**
   * Obtém localização atual do usuário
   */
  async getCurrentUserLocation(): Promise<{ latitude?: number; longitude?: number; success: boolean }> {
    try {
      const response = await apiClient.get('/users/me');
      
      const { gpsLatitude, gpsLongitude } = response.data;
      
      return {
        latitude: gpsLatitude,
        longitude: gpsLongitude,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter localização do usuário:', error);
      
      return {
        success: false,
      };
    }
  }

  /**
   * Obtém usuários próximos (para entregadores)
   */
  async getNearbyUsers(
    latitude: number,
    longitude: number,
    radius: number = 5000 // metros
  ): Promise<LocationResponse> {
    try {
      const response = await apiClient.get('/users/nearby', {
        params: {
          latitude,
          longitude,
          radius,
        },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuários próximos:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar usuários próximos',
      };
    }
  }
}

// Exporta instância singleton
export const userLocationService = new UserLocationService();
export default UserLocationService;