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
}

class DeliveryService {
  private metadata: EntityMetadata | null = null;

  /**
   * Busca entregas COMPLETADAS do motoboy logado
   * Novo endpoint dedicado: /deliveries/courier/completed
   * Backend já ordena por completedAt DESC
   * NOTA: Este endpoint retorna array direto, não paginado
   * @param unpaidOnly - Se true, retorna apenas entregas não pagas
   */
  async getMyCompletedDeliveries(unpaidOnly: boolean = true): Promise<DeliveryResponse> {
    try {
      console.log(`✅ Buscando minhas entregas completadas (unpaidOnly=${unpaidOnly})...`);

      const params: any = {};
      if (unpaidOnly) {
        params.unpaidOnly = true;
      }

      const response = await apiClient.get<DeliveryEntity[]>('/deliveries/courier/completed', { params });
      
      const deliveries = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ ${deliveries.length} entregas completadas encontradas no backend`);
      console.log(`📋 IDs retornados:`, deliveries.map(d => d.id).join(', '));
      console.log(`📊 Status de cada entrega:`, deliveries.map(d => ({ id: d.id, status: d.status, courier: d.courier?.id })));
      
      return {
        success: true,
        data: deliveries
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar entregas completadas:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar entregas completadas'
      };
    }
  }

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
   * Aceita uma entrega
   * CONSTRAINT: Apenas 1 entrega ACCEPTED por vez
   */
  async acceptDelivery(deliveryId: string): Promise<DeliveryResponse> {
    try {
      console.log(`✋ Aceitando delivery ${deliveryId}...`);
      
      // 🔒 Bloqueia se o courier não tem conta bancária ATIVA persistida
      const { bankAccountService } = require('./bankAccountService');
      const hasActiveBank = await bankAccountService.getHasActiveBankAccount();
      if (!hasActiveBank) {
        return {
          success: false,
          error: 'Para aceitar corridas, cadastre e ative seus dados bancários. Abra o menu (botão no canto superior esquerdo) e toque em "Dados Bancários".'
        };
      }
      
      // 🔒 CONSTRAINT: Verifica se já existe entrega ACCEPTED
      const { deliveryPollingService } = require('./deliveryPollingService');
      const hasAcceptedDelivery = await deliveryPollingService.hasAcceptedDelivery();
      
      if (hasAcceptedDelivery) {
        console.warn('⚠️ Já existe uma entrega ACCEPTED. Você deve concluir ou cancelar a entrega atual antes de aceitar outra.');
        return {
          success: false,
          error: 'Você já tem uma entrega aceita. Conclua ou cancele ela antes de aceitar outra.'
        };
      }
      
      // Busca o usuário logado para pegar o courierId
      const { authService } = require('./authService');
      const user = await authService.getCurrentUser();
      
      if (!user || !user.id) {
        console.error('❌ Usuário não encontrado ou sem ID');
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }
      
      console.log(`📦 Enviando courierId: ${user.id}`);
      console.log(`📍 Endpoint: PATCH /deliveries/${deliveryId}/accept`);
      console.log(`👤 User completo:`, JSON.stringify(user, null, 2));
      console.log(`🔧 Body da requisição:`, { courierId: user.id });
      
      // Envia o courierId no body da requisição (PATCH)
      const response = await apiClient.patch<DeliveryEntity>(
        `/deliveries/${deliveryId}/accept`,
        { courierId: user.id }
      );
      
      console.log('✅ Delivery aceito com sucesso, status:', response.data.status);
      
      // Atualiza a entrega no storage local com o novo status
      await deliveryPollingService.updateDeliveryInStorage(deliveryId, response.data);
      
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
   * Marca entrega como coletada E em trânsito (IN_TRANSIT)
   * ⚠️ MUDANÇA: Agora pickup já seta status IN_TRANSIT direto (não há mais PICKED_UP)
   * Backend usa courier do token (sem body necessário)
   */
  async pickupDelivery(deliveryId: string): Promise<DeliveryResponse> {
    try {
      console.log(`📦 Coletando delivery ${deliveryId} e iniciando trânsito...`);
      
      // PATCH sem body - backend usa courier do token
      const response = await apiClient.patch<DeliveryEntity>(
        `/deliveries/${deliveryId}/pickup`
      );
      
      console.log('✅ Delivery coletado e em trânsito, status:', response.data.status);
      
      // Atualiza a entrega no storage local com os dados do backend
      const { deliveryPollingService } = require('./deliveryPollingService');
      await deliveryPollingService.updateDeliveryInStorage(deliveryId, response.data);
      
      return {
        success: true,
        data: response.data,
        message: 'Entrega coletada e em trânsito!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao coletar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao coletar entrega'
      };
    }
  }

  /**
   * @deprecated O endpoint /transit foi removido. Use pickupDelivery() que agora seta IN_TRANSIT direto.
   * Este método é mantido apenas para compatibilidade temporária.
   */
  async startTransitDelivery(deliveryId: string): Promise<DeliveryResponse> {
    console.warn('⚠️ startTransitDelivery() está deprecated. Use pickupDelivery() que agora inicia trânsito automaticamente.');
    // Redireciona para pickupDelivery (mantém compatibilidade)
    return this.pickupDelivery(deliveryId);
  }

  /**
   * Marca entrega como completada (COMPLETED)
   * Backend usa courier do token (sem body necessário)
   */
  async completeDelivery(deliveryId: string): Promise<DeliveryResponse> {
    try {
      console.log(`✅ Completando delivery ${deliveryId}...`);
      
      // PATCH sem body - backend usa courier do token
      const response = await apiClient.patch<DeliveryEntity>(
        `/deliveries/${deliveryId}/complete`
      );
      
      console.log('✅ Delivery completado com sucesso, status:', response.data.status);
      
      // Atualiza a entrega no storage local com os dados do backend
      const { deliveryPollingService } = require('./deliveryPollingService');
      await deliveryPollingService.updateDeliveryInStorage(deliveryId, response.data);
      
      // Invalida cache de entregas ativas (entrega não está mais ativa)
      await deliveryPollingService.invalidateActiveCache();
      console.log('🗑️ Cache de entregas ativas invalidado após completar entrega');
      
      return {
        success: true,
        data: response.data,
        message: 'Entrega completada com sucesso!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao completar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao completar entrega'
      };
    }
  }

  /**
   * Cancela uma entrega
   * Status volta para PENDING e remove courier
   */
  async cancelDelivery(deliveryId: string, reason: string): Promise<DeliveryResponse> {
    try {
      console.log(`❌ Cancelando delivery ${deliveryId}...`);
      
      if (!reason || reason.trim() === '') {
        return {
          success: false,
          error: 'Motivo do cancelamento é obrigatório'
        };
      }
      
      // PATCH com reason como query parameter
      const response = await apiClient.patch<DeliveryEntity>(
        `/deliveries/${deliveryId}/cancel`,
        null,
        {
          params: { reason }
        }
      );
      
      console.log('✅ Delivery cancelado com sucesso');
      
      // Remove do storage local (volta para PENDING sem courier)
      const { deliveryPollingService } = require('./deliveryPollingService');
      await deliveryPollingService.removeDeliveryFromStorage(deliveryId);
      
      // Invalida cache de entregas ativas (entrega não está mais ativa)
      await deliveryPollingService.invalidateActiveCache();
      console.log('🗑️ Cache de entregas ativas invalidado após cancelar entrega');
      
      return {
        success: true,
        data: response.data,
        message: 'Entrega cancelada com sucesso!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao cancelar delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao cancelar entrega'
      };
    }
  }

  /**
   * Atualiza status de uma entrega
   * @deprecated Use métodos específicos: pickupDelivery, startTransitDelivery, completeDelivery
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
   * Busca entregas ATIVAS do motoboy logado
   * Retorna: ACCEPTED, PICKED_UP, IN_TRANSIT
   * Filtrado pelo campo courier (motoboy)
   */
  async getMyActiveDeliveries(): Promise<DeliveryResponse> {
    try {
      console.log('🚚 Buscando minhas entregas ativas via /deliveries/courier/active ...');

      // Novo endpoint dedicado para entregas ativas do courier
      const response = await apiClient.get<any>('/deliveries/courier/active', {
        params: {
          // Mantemos ordenação e paginação quando suportado
          sort: 'acceptedAt,desc',
          size: 50,
        }
      });

      // Suporta resposta paginada (content) ou lista direta
      const rawList = Array.isArray(response.data?.content)
        ? response.data.content
        : (Array.isArray(response.data) ? response.data : []);

      console.log(`✅ ${rawList.length} entregas ativas encontradas`);

      return {
        success: true,
        data: rawList,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar entregas ativas (courier/active):', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar entregas ativas'
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

  /**
   * Cria uma nova entrega (usado por clientes CLIENT)
   * POST /deliveries
   */
  async createDelivery(deliveryData: {
    status: string;
    payments: any[];
    client: string;
    itemDescription: string;
    recipientName: string;
    recipientPhone: string;
    fromAddress: string;
    fromLatitude?: number | null;
    fromLongitude?: number | null;
    toAddress: string;
    toLatitude?: number | null;
    toLongitude?: number | null;
    totalAmount: string;
    distanceKm?: number | null;
  }): Promise<DeliveryResponse> {
    try {
      console.log('📦 Criando nova entrega via POST /deliveries...');
      console.log('📋 Dados:', JSON.stringify(deliveryData, null, 2));

      // Monta o corpo da requisição no formato esperado pela API
      const requestBody = {
        status: deliveryData.status || "PENDING",
        payments: deliveryData.payments || [],
        client: deliveryData.client,
        itemDescription: deliveryData.itemDescription,
        recipientName: deliveryData.recipientName,
        recipientPhone: deliveryData.recipientPhone,
        fromAddress: deliveryData.fromAddress,
        fromLatitude: deliveryData.fromLatitude,
        fromLongitude: deliveryData.fromLongitude,
        toAddress: deliveryData.toAddress,
        toLatitude: deliveryData.toLatitude,
        toLongitude: deliveryData.toLongitude,
        totalAmount: deliveryData.totalAmount,
        distanceKm: deliveryData.distanceKm,
      };

      const response = await apiClient.post<DeliveryEntity>('/deliveries', requestBody);

      console.log('✅ Entrega criada com sucesso!');
      console.log('📋 Entrega criada:', response.data);

      return {
        success: true,
        data: response.data,
        message: 'Entrega criada com sucesso!'
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar entrega:', error);
      console.error('❌ Response data:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro ao criar entrega'
      };
    }
  }

  /**
   * Busca entregas do cliente logado (CLIENT/CUSTOMER)
   * O backend identifica o usuário pelo token JWT
   */
  async getClientDeliveries(params?: {
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{
    success: boolean;
    data?: DeliveryEntity[];
    totalElements?: number;
    totalPages?: number;
    currentPage?: number;
    last?: boolean;
    error?: string;
  }> {
    try {
      const queryParams: any = {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
        sort: params?.sort ?? 'updatedAt,desc',
      };
      if (params?.status) queryParams.status = params.status;

      console.log('📋 [DeliveryService] Buscando entregas do cliente...', queryParams);

      const response = await apiClient.get<any>('/deliveries', { params: queryParams });

      const content = Array.isArray(response.data?.content) ? response.data.content
        : (Array.isArray(response.data) ? response.data : []);

      console.log(`✅ [DeliveryService] ${content.length} entregas encontradas (total: ${response.data?.totalElements ?? content.length})`);

      return {
        success: true,
        data: content,
        totalElements: response.data?.totalElements ?? content.length,
        totalPages: response.data?.totalPages ?? 1,
        currentPage: response.data?.number ?? 0,
        last: response.data?.last ?? true,
      };
    } catch (error: any) {
      console.error('❌ [DeliveryService] Erro ao buscar entregas do cliente:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao buscar entregas',
      };
    }
  }
}

// Exporta instância singleton
export const deliveryService = new DeliveryService();
export default DeliveryService;