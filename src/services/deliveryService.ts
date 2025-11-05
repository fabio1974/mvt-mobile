import { apiClient } from './api';
import { EntityMetadata, FieldMetadata } from '../types/metadata';

/**
 * Serviço para gerenciar entregas (delivery)
 * Usa metadata do backend para descobrir campos automaticamente
 */

interface DeliveryEntity {
  [key: string]: any; // Dinâmico baseado na metadata
}

interface DeliveryResponse {
  success: boolean;
  data?: DeliveryEntity | DeliveryEntity[];
  message?: string;
  error?: string;
}

interface DeliveryListResponse {
  content: DeliveryEntity[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class DeliveryService {
  private metadata: EntityMetadata | null = null;
  private lastMetadataFetch = 0;
  private metadataCacheDuration = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca metadata da entidade delivery
   */
  async getDeliveryMetadata(forceRefresh = false): Promise<EntityMetadata | null> {
    const now = Date.now();
    
    // Usa cache se disponível e não expirado
    if (!forceRefresh && this.metadata && (now - this.lastMetadataFetch < this.metadataCacheDuration)) {
      console.log('📋 Usando metadata de delivery do cache');
      return this.metadata;
    }

    try {
      console.log('📡 Buscando metadata de delivery...');
      const response = await apiClient.get<EntityMetadata>('/metadata/delivery');
      
      this.metadata = response.data;
      this.lastMetadataFetch = now;
      
      console.log('✅ Metadata de delivery carregada:', this.metadata);
      this.debugPrintFields();
      
      return this.metadata;
    } catch (error: any) {
      console.error('❌ Erro ao buscar metadata de delivery:', error);
      return null;
    }
  }

  /**
   * Debug: imprime os campos da entidade delivery
   */
  private debugPrintFields(): void {
    if (!this.metadata) return;

    console.log('\n🚚 === DELIVERY METADATA ===');
    console.log(`Label: ${this.metadata.label}`);
    console.log(`Endpoint: ${this.metadata.endpoint}`);
    
    if (this.metadata.tableFields?.length) {
      console.log('\n📋 Campos da Tabela:');
      this.metadata.tableFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type} ("${field.label}")`);
      });
    }
    
    if (this.metadata.formFields?.length) {
      console.log('\n📝 Campos do Formulário:');
      this.metadata.formFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type} ("${field.label}") ${field.required ? '[OBRIGATÓRIO]' : ''}`);
      });
    }
    console.log('🚚 === FIM DELIVERY METADATA ===\n');
  }

  /**
   * Busca deliveries disponíveis para o motoboy
   * Filtra por status e proximidade
   */
  async getAvailableDeliveries(
    latitude?: number,
    longitude?: number,
    radius?: number
  ): Promise<DeliveryResponse> {
    try {
      const params: any = {};
      
      // Adiciona filtros de localização se fornecidos
      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
        if (radius) params.radius = radius;
      }

      // Busca deliveries disponíveis (provavelmente status = 'PENDING' ou 'AVAILABLE')
      console.log('🔍 Buscando deliveries disponíveis...', params);
      
      const response = await apiClient.get<DeliveryListResponse>('/deliveries', {
        params: {
          ...params,
          // Adiciona filtros baseados no que descobrirmos na metadata
          status: 'PENDING', // ou o status correspondente a "disponível"
          size: 20, // limite de resultados
          sort: 'createdAt,desc' // mais recentes primeiro
        }
      });

      console.log(`✅ ${response.data.content.length} deliveries encontrados`);
      
      return {
        success: true,
        data: response.data.content
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar deliveries disponíveis:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar entregas'
      };
    }
  }

  /**
   * Aceita uma entrega
   */
  async acceptDelivery(deliveryId: string): Promise<DeliveryResponse> {
    try {
      console.log(`✋ Aceitando delivery ${deliveryId}...`);
      
      // Pode ser um PATCH para atualizar status ou um POST para aceitar
      const response = await apiClient.post<DeliveryEntity>(`/deliveries/${deliveryId}/accept`);
      
      console.log('✅ Delivery aceito com sucesso');
      
      return {
        success: true,
        data: response.data,
        message: 'Entrega aceita com sucesso!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao aceitar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao aceitar entrega'
      };
    }
  }

  /**
   * Rejeita uma entrega
   */
  async rejectDelivery(deliveryId: string, reason?: string): Promise<DeliveryResponse> {
    try {
      console.log(`❌ Rejeitando delivery ${deliveryId}...`);
      
      const payload = reason ? { reason } : {};
      const response = await apiClient.post<DeliveryEntity>(`/deliveries/${deliveryId}/reject`, payload);
      
      console.log('✅ Delivery rejeitado');
      
      return {
        success: true,
        data: response.data,
        message: 'Entrega rejeitada'
      };
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao rejeitar entrega'
      };
    }
  }

  /**
   * Atualiza status de uma entrega
   */
  async updateDeliveryStatus(
    deliveryId: string, 
    status: string, 
    additionalData?: any
  ): Promise<DeliveryResponse> {
    try {
      console.log(`🔄 Atualizando status do delivery ${deliveryId} para ${status}...`);
      
      const payload = {
        status,
        ...additionalData
      };
      
      const response = await apiClient.patch<DeliveryEntity>(`/deliveries/${deliveryId}/status`, payload);
      
      console.log('✅ Status atualizado com sucesso');
      
      return {
        success: true,
        data: response.data,
        message: 'Status atualizado!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao atualizar status'
      };
    }
  }

  /**
   * Busca delivery por ID
   */
  async getDeliveryById(deliveryId: string): Promise<DeliveryResponse> {
    try {
      console.log(`🔍 Buscando delivery ${deliveryId}...`);
      
      const response = await apiClient.get<DeliveryEntity>(`/deliveries/${deliveryId}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Entrega não encontrada'
      };
    }
  }

  /**
   * Busca deliveries do motoboy logado
   */
  async getMyDeliveries(status?: string): Promise<DeliveryResponse> {
    try {
      console.log('📋 Buscando minhas entregas...', { status });
      
      const params: any = {};
      if (status) params.status = status;
      
      const response = await apiClient.get<DeliveryListResponse>('/deliveries/my', {
        params
      });
      
      return {
        success: true,
        data: response.data.content
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar minhas entregas:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar entregas'
      };
    }
  }

  /**
   * Retorna campos importantes da metadata para a UI
   */
  async getImportantFields(): Promise<{
    statusField?: FieldMetadata;
    locationFields: FieldMetadata[];
    clientFields: FieldMetadata[];
    valueFields: FieldMetadata[];
  }> {
    const metadata = await this.getDeliveryMetadata();
    
    if (!metadata) {
      return { locationFields: [], clientFields: [], valueFields: [] };
    }

    const allFields = [
      ...(metadata.tableFields || []),
      ...(metadata.formFields || [])
    ];

    return {
      statusField: allFields.find(f => 
        f.name.toLowerCase().includes('status') || 
        f.name.toLowerCase().includes('estado')
      ),
      locationFields: allFields.filter(f => 
        f.name.toLowerCase().includes('address') ||
        f.name.toLowerCase().includes('endereco') ||
        f.name.toLowerCase().includes('location') ||
        f.name.toLowerCase().includes('latitude') ||
        f.name.toLowerCase().includes('longitude')
      ),
      clientFields: allFields.filter(f => 
        f.name.toLowerCase().includes('client') ||
        f.name.toLowerCase().includes('customer') ||
        f.name.toLowerCase().includes('usuario') ||
        f.name.toLowerCase().includes('user')
      ),
      valueFields: allFields.filter(f => 
        f.name.toLowerCase().includes('price') ||
        f.name.toLowerCase().includes('value') ||
        f.name.toLowerCase().includes('amount') ||
        f.name.toLowerCase().includes('valor') ||
        f.name.toLowerCase().includes('preco')
      )
    };
  }
}

// Exporta instância singleton
export const deliveryService = new DeliveryService();
export default DeliveryService;