import { apiClient } from './api';

// ============================================
// TIPOS
// ============================================

export type VehicleType = 'MOTORCYCLE' | 'CAR';

export type VehicleColor =
  | 'BRANCO' | 'PRETO' | 'PRATA' | 'CINZA'
  | 'VERMELHO' | 'AZUL' | 'VERDE' | 'AMARELO'
  | 'LARANJA' | 'MARROM' | 'BEGE' | 'DOURADO'
  | 'ROSA' | 'ROXO' | 'VINHO' | 'FANTASIA' | 'OUTROS';

export const VEHICLE_COLORS: { key: VehicleColor; label: string }[] = [
  { key: 'BRANCO', label: 'Branco' },
  { key: 'PRETO', label: 'Preto' },
  { key: 'PRATA', label: 'Prata' },
  { key: 'CINZA', label: 'Cinza' },
  { key: 'VERMELHO', label: 'Vermelho' },
  { key: 'AZUL', label: 'Azul' },
  { key: 'VERDE', label: 'Verde' },
  { key: 'AMARELO', label: 'Amarelo' },
  { key: 'LARANJA', label: 'Laranja' },
  { key: 'MARROM', label: 'Marrom' },
  { key: 'BEGE', label: 'Bege' },
  { key: 'DOURADO', label: 'Dourado' },
  { key: 'ROSA', label: 'Rosa' },
  { key: 'ROXO', label: 'Roxo' },
  { key: 'VINHO', label: 'Vinho' },
  { key: 'FANTASIA', label: 'Fantasia' },
  { key: 'OUTROS', label: 'Outros' },
];

export const COLOR_LABEL_MAP: Record<VehicleColor, string> = Object.fromEntries(
  VEHICLE_COLORS.map(c => [c.key, c.label])
) as Record<VehicleColor, string>;

export interface Vehicle {
  id: number;
  type: VehicleType;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year?: string;
  isActive: boolean;
  ownerName: string;
  ownerId: string;
}

export interface VehicleRequest {
  type: VehicleType;
  plate: string;
  brand: string;
  model: string;
  color: VehicleColor;
  year?: string;
}

interface VehicleServiceResponse<T = Vehicle> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// SERVICE
// ============================================

class VehicleService {
  /**
   * Lista todos os veículos ativos do motorista logado
   */
  async getMyVehicles(): Promise<VehicleServiceResponse<Vehicle[]>> {
    try {
      console.log('🚗 [VehicleService] Buscando meus veículos...');
      const response = await apiClient.get<Vehicle[]>('/vehicles/me');
      const vehicles = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ [VehicleService] ${vehicles.length} veículo(s) encontrado(s)`);
      console.log('📋 [VehicleService] Veículos:', JSON.stringify(vehicles.map(v => ({ id: v.id, plate: v.plate, isActive: v.isActive }))));
      return { success: true, data: vehicles };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao buscar veículos:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data || 'Erro ao buscar veículos',
      };
    }
  }

  /**
   * Cadastra um novo veículo
   */
  async createVehicle(data: VehicleRequest): Promise<VehicleServiceResponse> {
    try {
      console.log('🚗 [VehicleService] Cadastrando veículo...', data.plate);
      const response = await apiClient.post<Vehicle>('/vehicles', data);
      console.log('✅ [VehicleService] Veículo cadastrado:', response.data.id);
      return { success: true, data: response.data, message: 'Veículo cadastrado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao cadastrar veículo:', error);
      const status = error.response?.status;
      let errorMsg = 'Erro ao cadastrar veículo';
      if (status === 409) {
        // Conflict — placa duplicada, resposta pode ser string pura
        errorMsg = typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || 'Placa já cadastrada';
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Atualiza um veículo existente
   */
  async updateVehicle(id: number, data: VehicleRequest): Promise<VehicleServiceResponse> {
    try {
      console.log(`🚗 [VehicleService] Atualizando veículo ${id}...`);
      const response = await apiClient.put<Vehicle>(`/vehicles/${id}`, data);
      console.log('✅ [VehicleService] Veículo atualizado');
      return { success: true, data: response.data, message: 'Veículo atualizado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao atualizar veículo:', error);
      const status = error.response?.status;
      let errorMsg = 'Erro ao atualizar veículo';
      if (status === 403) {
        errorMsg = 'Você não tem permissão para editar este veículo';
      } else if (status === 409) {
        errorMsg = typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || 'Placa já cadastrada';
      } else if (status === 404) {
        errorMsg = 'Veículo não encontrado';
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Desativa um veículo (soft delete)
   */
  async deleteVehicle(id: number): Promise<VehicleServiceResponse<string>> {
    try {
      console.log(`🚗 [VehicleService] Desativando veículo ${id}...`);
      const response = await apiClient.delete(`/vehicles/${id}`);
      const msg = typeof response.data === 'string' ? response.data : 'Veículo desativado com sucesso';
      console.log('✅ [VehicleService]', msg);
      return { success: true, data: msg, message: msg };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao desativar veículo:', error);
      const status = error.response?.status;
      let errorMsg = 'Erro ao desativar veículo';
      if (status === 403) {
        errorMsg = 'Você não tem permissão para deletar este veículo';
      } else if (status === 404) {
        errorMsg = 'Veículo não encontrado';
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Define um veículo como ativo (apenas 1 por motorista)
   */
  async setActiveVehicle(id: number): Promise<VehicleServiceResponse> {
    try {
      console.log(`🚗 [VehicleService] Definindo veículo ${id} como ativo...`);
      const response = await apiClient.put<Vehicle>(`/vehicles/${id}/set-active`);
      console.log('✅ [VehicleService] Veículo ativo definido:', response.data.id);
      return { success: true, data: response.data, message: 'Veículo definido como ativo!' };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao definir veículo ativo:', error);
      const status = error.response?.status;
      let errorMsg = 'Erro ao definir veículo ativo';
      if (status === 400) {
        errorMsg = typeof error.response?.data === 'string'
          ? error.response.data
          : 'Não é possível definir um veículo inativo como ativo';
      } else if (status === 403) {
        errorMsg = 'Você não tem permissão para modificar este veículo';
      } else if (status === 404) {
        errorMsg = 'Veículo não encontrado';
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Reativa um veículo previamente desativado
   */
  async reactivateVehicle(id: number): Promise<VehicleServiceResponse> {
    try {
      console.log(`🚗 [VehicleService] Reativando veículo ${id}...`);
      const response = await apiClient.put<Vehicle>(`/vehicles/${id}/reactivate`);
      console.log('✅ [VehicleService] Veículo reativado:', response.data.id);
      return { success: true, data: response.data, message: 'Veículo reativado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [VehicleService] Erro ao reativar veículo:', error);
      const status = error.response?.status;
      let errorMsg = 'Erro ao reativar veículo';
      if (status === 403) {
        errorMsg = 'Você não tem permissão para reativar este veículo';
      } else if (status === 404) {
        errorMsg = 'Veículo não encontrado';
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Busca o veículo ativo do motorista logado
   */
  async getMyActiveVehicle(): Promise<VehicleServiceResponse<Vehicle | null>> {
    try {
      console.log('🚗 [VehicleService] Buscando veículo ativo...');
      const response = await apiClient.get<Vehicle>('/vehicles/me/active');
      console.log('✅ [VehicleService] Veículo ativo encontrado:', response.data.id);
      return { success: true, data: response.data };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { success: true, data: null };
      }
      console.error('❌ [VehicleService] Erro ao buscar veículo ativo:', error);
      return { success: false, error: 'Erro ao buscar veículo ativo' };
    }
  }
}

export const vehicleService = new VehicleService();
export default VehicleService;
