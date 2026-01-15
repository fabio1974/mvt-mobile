import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Serviço de polling para verificar novas entregas disponíveis
 * Usado quando app está em foreground (iOS não dispara listeners de push)
 */

export interface PendingDelivery {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  estimatedPayment: number;
  createdAt: string;
  status?: string;
  locallyRejected?: boolean;
  
  // Timestamps de mudança de status
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  
  // Campos dinâmicos do backend
  [key: string]: any;
}

interface PendingDeliveriesResponse {
  success: boolean;
  deliveries: PendingDelivery[];
}

class DeliveryPollingService {
  private onNewDeliveryCallback: ((delivery: PendingDelivery) => void | Promise<void>) | null = null;
  private cachedDeliveries: Map<string, PendingDelivery> = new Map();
  // Cache único para pendentes (com campo locallyRejected)
  private readonly STORAGE_KEY_PENDING_CACHE = 'my_pending_deliveries_cache';
  private readonly STORAGE_KEY_ACTIVE_CACHE = 'my_active_deliveries_cache';
  private readonly STORAGE_KEY_COMPLETED_CACHE = 'my_completed_deliveries_cache';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  private isInitialized = false;

  /**
   * Registra callback para quando encontrar nova entrega
   */
  setOnNewDelivery(callback: (delivery: PendingDelivery) => void | Promise<void>): void {
    this.onNewDeliveryCallback = callback;
    console.log('✅ Callback de nova entrega registrado (polling)');
  }

  /**
   * Inicializa o serviço carregando dados do AsyncStorage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Serviço de polling já inicializado');
      return;
    }

    console.log('🔄 Inicializando serviço de polling...');
    this.isInitialized = true;
    console.log('✅ Serviço de polling inicializado');
  }

  /**
   * Retorna IDs de entregas rejeitadas (do cache de pendentes)
   */
  async getRejectedDeliveryIds(): Promise<string[]> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        const rejectedIds = (cached.deliveries || [])
          .filter((d: any) => d.locallyRejected === true)
          .map((d: any) => String(d.id));
        console.log(`📋 IDs rejeitados no cache: ${rejectedIds.join(', ') || 'nenhum'}`);
        return rejectedIds;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar IDs rejeitados:', error);
      return [];
    }
  }

  /**
   * Verifica se uma entrega específica foi rejeitada
   */
  async isDeliveryRejected(deliveryId: string): Promise<boolean> {
    const normalizedId = String(deliveryId);
    const rejectedIds = await this.getRejectedDeliveryIds();
    return rejectedIds.includes(normalizedId);
  }

  /**
   * ===========================================================================
   * NOVOS MÉTODOS: ESTRATÉGIA HÍBRIDA
   * - PENDING: Sempre online, ordenado por mais recente
   * - ATIVAS: Cache 30min, filtrado por courier
   * - COMPLETADAS: Cache 30min, filtrado por courier
   * ===========================================================================
   */

  /**
   * Salva entregas com TTL no cache
   */
  private async saveDeliveriesWithTTL(
    key: string,
    deliveries: PendingDelivery[]
  ): Promise<void> {
    try {
      const cacheData = {
        timestamp: Date.now(),
        ttl: this.CACHE_TTL,
        data: deliveries,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Cache salvo: ${key} (${deliveries.length} entregas, TTL: 30min)`);
    } catch (error) {
      console.error(`❌ Erro ao salvar cache ${key}:`, error);
    }
  }

  /**
   * Carrega do cache se não expirou, senão retorna null
   */
  private async loadDeliveriesFromCache(
    key: string
  ): Promise<PendingDelivery[] | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        console.log(`📭 Nenhum cache encontrado: ${key}`);
        return null;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      const age = now - cacheData.timestamp;

      if (age > cacheData.ttl) {
        console.log(`⏰ Cache expirado: ${key} (${Math.floor(age / 60000)} minutos atrás)`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      console.log(`✅ Cache válido: ${key} (${cacheData.data.length} entregas, ${Math.floor((cacheData.ttl - age) / 60000)}min restantes)`);
      return cacheData.data;
    } catch (error) {
      console.error(`❌ Erro ao carregar cache ${key}:`, error);
      return null;
    }
  }

  /**
   * Busca entregas PENDING (sempre online, ordenado por mais recente)
   * Não usa cache - outros motoboys podem aceitar
   */
  async getPendingDeliveries(
    latitude?: number,
    longitude?: number,
    radiusKm?: number
  ): Promise<PendingDelivery[]> {
    try {
      console.log('🌐 Buscando entregas PENDING (endpoint) e mesclando com cache local...');

      // 1. Cache local (entregas pendentes com status de rejeição)
      const localPending = await this.getPendingFromCache();
      const localMap = new Map<string, any>();
      localPending.forEach((d: any) => {
        if (d && d.id) {
          // Preserva o estado locallyRejected do cache
          localMap.set(String(d.id), { ...d });
        }
      });
      
      // 2. IDs rejeitados (do cache único)
      const rejectedIds = await this.getRejectedDeliveryIds();
      console.log(`📋 IDs rejeitados: ${rejectedIds.join(', ') || 'nenhum'}`);
      
      const params: any = {
        size: 50,
        sort: 'createdAt,desc'
      };

      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
        if (radiusKm) params.radius = radiusKm;
      }
      
      // 3. Busca do backend
      const response = await apiClient.get<any>('/deliveries/courier/pendings', { params });
      const rawList = Array.isArray(response.data?.content)
        ? response.data.content
        : (Array.isArray(response.data) ? response.data : []);

      // 4. Merge: backend + cache local
      const mergedMap = new Map<string, any>();
      
      // Adiciona do backend (verifica se está rejeitada)
      (rawList || []).forEach((d: any) => {
        if (d && d.id) {
          const idStr = String(d.id);
          const isRejected = rejectedIds.includes(idStr);
          
          // Se já tem no cache local, usa o local (pode ter mais dados)
          if (localMap.has(idStr)) {
            mergedMap.set(idStr, {
              ...d,
              ...localMap.get(idStr),
              locallyRejected: isRejected || localMap.get(idStr)?.locallyRejected === true
            });
          } else {
            mergedMap.set(idStr, {
              ...d,
              id: d.id,
              pickupAddress: d.fromAddress || d.pickupAddress || 'Endereço não informado',
              dropoffAddress: d.toAddress || d.dropoffAddress || 'Endereço não informado',
              distance: d.distance || 0,
              estimatedPayment: d.totalAmount || d.estimatedPayment || 0,
              createdAt: d.createdAt,
              status: d.status || 'PENDING',
              locallyRejected: isRejected
            });
          }
        }
      });

      // Adiciona entregas que estão só no cache local (não vieram do backend)
      localMap.forEach((delivery, id) => {
        if (!mergedMap.has(id)) {
          mergedMap.set(id, delivery);
        }
      });

      const merged = Array.from(mergedMap.values());
      const rejectedCount = merged.filter(d => d.locallyRejected === true).length;
      console.log(`✅ ${merged.length} entregas PENDING únicas. ${rejectedCount} rejeitadas.`);
      return merged;
    } catch (error: any) {
      console.error('❌ Erro ao buscar entregas PENDING (courier/pendings):', error);
      // Fallback para cache local
      return await this.getPendingFromCache();
    }
  }

  /**
   * Busca entregas ATIVAS do motoboy
   * STORAGE-LOCAL-FIRST: Filtra do storage local primeiro
   * Fallback: Busca do backend se storage estiver vazio
   */
  async getMyActiveDeliveries(forceRefresh = false): Promise<PendingDelivery[]> {
    try {
      console.log('🔍 Buscando entregas ativas...');
      
      // 1️⃣ BUSCA DO STORAGE LOCAL (sempre primeiro)
      const allDeliveries = await this.loadAllDeliveriesFromStorage();
      
      // Filtra entregas ativas (ACCEPTED, PICKED_UP, IN_TRANSIT)
      const activeStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
      const activeFromStorage = allDeliveries.filter(d => 
        d.status && activeStatuses.includes(d.status.toUpperCase())
      );
      
      console.log(`📦 ${activeFromStorage.length} entregas ativas encontradas no storage local`);
      
      // Se encontrou no storage e não forçou refresh, retorna
      if (activeFromStorage.length > 0 && !forceRefresh) {
        return activeFromStorage;
      }
      
      // 2️⃣ FALLBACK: Busca do backend (apenas se storage vazio OU forceRefresh)
      if (activeFromStorage.length === 0 || forceRefresh) {
        console.log('🌐 Buscando entregas ativas do backend (filtrado por courier)...');
        const { deliveryService } = await import('./deliveryService');
        const response = await deliveryService.getMyActiveDeliveries();
        
        if (response.success && response.data) {
          const deliveries = Array.isArray(response.data) ? response.data : [response.data];
          const formatted: PendingDelivery[] = deliveries.map((d: any) => ({
            ...d,
            id: d.id,
            pickupAddress: d.fromAddress || d.pickupAddress || 'Endereço não informado',
            dropoffAddress: d.toAddress || d.dropoffAddress || 'Endereço não informado',
            distance: d.distance || 0,
            estimatedPayment: d.totalAmount || d.estimatedPayment || 0,
            createdAt: d.createdAt,
            status: d.status,
          }));
          
          // Salva no storage local
          for (const delivery of formatted) {
            await this.updateDeliveryInStorage(delivery.id, delivery);
          }
          
          console.log(`✅ ${formatted.length} entregas ativas do backend salvas no storage`);
          return formatted;
        }
      }
      
      // Se chegou aqui, retorna o que tem no storage (pode ser vazio)
      return activeFromStorage;
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar entregas ativas:', error);
      return [];
    }
  }

  /**
   * Busca entregas COMPLETADAS do motoboy (SEM cache - sempre atualizado)
   */
  async getMyCompletedDeliveries(forceRefresh = false): Promise<PendingDelivery[]> {
    try {
      console.log('🌐 Buscando entregas completadas do backend (unpaidOnly=true)...');
      const { deliveryService } = await import('./deliveryService');
      // Backend filtra entregas já pagas com unpaidOnly=true
      const response = await deliveryService.getMyCompletedDeliveries(true);
      
      if (response.success && response.data) {
        const deliveries = Array.isArray(response.data) ? response.data : [response.data];
        console.log(`✅ Backend retornou ${deliveries.length} entregas completadas (não pagas)`);
        console.log(`📋 IDs das entregas do backend:`, deliveries.map((d: any) => d.id).join(', '));
        
        const formatted: PendingDelivery[] = deliveries.map((d: any) => ({
          ...d,
          id: d.id,
          pickupAddress: d.fromAddress || d.pickupAddress || 'Endereço não informado',
          dropoffAddress: d.toAddress || d.dropoffAddress || 'Endereço não informado',
          distance: d.distance || 0,
          estimatedPayment: d.totalAmount || d.estimatedPayment || 0,
          createdAt: d.createdAt,
          status: d.status,
        }));

        return formatted;
      }
      
      console.log('⚠️ Backend não retornou dados de entregas completadas');
      return [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar entregas completadas:', error);
      return [];
    }
  }

  /**
   * Invalida cache de entregas ativas
   * Usar após aceitar/atualizar status de entrega
   */
  async invalidateActiveCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_ACTIVE_CACHE);
      console.log('🗑️ Cache de entregas ativas invalidado');
    } catch (error) {
      console.error('❌ Erro ao invalidar cache:', error);
    }
  }

  /**
   * Invalida cache de entregas completadas
   */
  async invalidateCompletedCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_COMPLETED_CACHE);
      console.log('🗑️ Cache de entregas completadas invalidado');
    } catch (error) {
      console.error('❌ Erro ao invalidar cache:', error);
    }
  }

  async saveActiveDelivery(delivery: any): Promise<void> {
    try {
      if (!delivery || !delivery.id) {
        console.warn('⚠️ Tentativa de salvar entrega inválida');
        return;
      }
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_ACTIVE_CACHE);
      const cached = cachedData ? JSON.parse(cachedData) : { deliveries: [], timestamp: 0 };
      const index = cached.deliveries.findIndex((d: any) => d.id === delivery.id);
      if (index >= 0) {
        cached.deliveries[index] = delivery;
      } else {
        cached.deliveries.push(delivery);
      }
      cached.timestamp = Date.now();
      await AsyncStorage.setItem(this.STORAGE_KEY_ACTIVE_CACHE, JSON.stringify(cached));
      console.log(`✅ Entrega ${delivery.id} salva no cache de ativas`);
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
    }
  }

  async savePendingDelivery(delivery: any): Promise<void> {
    try {
      if (!delivery || !delivery.id) return;
      
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      const cached = cachedData ? JSON.parse(cachedData) : { deliveries: [], timestamp: 0 };
      
      // 🔒 CONSTRAINT: Garante apenas UMA ocorrência por ID
      const existingIndex = cached.deliveries.findIndex((d: any) => d.id === delivery.id);
      
      if (existingIndex >= 0) {
        const existing = cached.deliveries[existingIndex];
        // Prioridade: rejeitada > não rejeitada
        // Se ambas rejeitadas ou ambas não rejeitadas, mantém a nova (mais recente)
        if (delivery.locallyRejected || !existing.locallyRejected) {
          cached.deliveries[existingIndex] = delivery;
          console.log(`♻️ Entrega ${delivery.id} atualizada no cache (substituiu duplicata)`);
        } else {
          console.log(`⏭️ Entrega ${delivery.id} já existe como rejeitada, mantendo versão rejeitada`);
        }
      } else {
        cached.deliveries.push(delivery);
        console.log(`⏳ Entrega ${delivery.id} salva em pendentes (nova)`);
      }
      
      cached.timestamp = Date.now();
      await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(cached));
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }

  async acceptDelivery(deliveryId: string, deliveryData: any): Promise<void> {
    try {
      // Remove do cache de pendentes se existir
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (pendingData) {
        const pendingCache = JSON.parse(pendingData);
        pendingCache.deliveries = pendingCache.deliveries.filter((d: any) => d.id !== deliveryId);
        await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
      }
      // Salva em ativas
      deliveryData.status = 'ACCEPTED';
      await this.saveActiveDelivery(deliveryData);
      console.log(`✅ Entrega ${deliveryId} aceita e salva em ativas`);
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }

  /**
   * Busca entregas do cache de pendentes (recebidas via push e marcadas localmente)
   */
  async getPendingFromCache(): Promise<any[]> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (!cachedData) {
        console.log('⏳ Nenhuma entrega pendente no cache local');
        return [];
      }
      const cached = JSON.parse(cachedData);
      console.log(`✅ ${cached.deliveries.length} entregas pendentes carregadas do cache local`);
      return cached.deliveries || [];
    } catch (error) {
      console.error('❌ Erro ao buscar pendentes do cache:', error);
      return [];
    }
  }

  /**
   * 🔒 CONSTRAINT: Verifica se já existe entrega ACCEPTED
   * Retorna true se existir pelo menos uma entrega com status ACCEPTED
   */
  /**
   * Verifica se o motoboy tem uma entrega ativa (em andamento).
   * 
   * MODO DE ENTREGA ATIVA:
   * - ✅ ACCEPTED: Entrega aceita pelo motoboy
   * - ✅ PICKED_UP: Mercadoria coletada
   * - ✅ IN_TRANSIT: Em trânsito para o destino
   * 
   * NÃO considera como ativa:
   * - ❌ PENDING: Ainda não aceita
   * - ❌ COMPLETED: Entrega concluída
   * - ❌ CANCELLED: Entrega cancelada
   * 
   * Quando há entrega ativa, o motoboy NÃO deve receber notificações
   * de novas entregas disponíveis.
   */
  async hasAcceptedDelivery(): Promise<boolean> {
    try {
      // 1️⃣ Verifica no cache de entregas ativas (local)
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_ACTIVE_CACHE);
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        const activeStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
        const activeDelivery = cached.deliveries?.find((d: any) => {
          const status = d.status?.toUpperCase();
          return activeStatuses.includes(status);
        });
        
        if (activeDelivery) {
          console.log(`🔒 Já existe entrega ativa no cache: #${activeDelivery.id} (${activeDelivery.status})`);
          return true;
        }
      }
      
      // 2️⃣ Fallback: Busca do backend (getMyActiveDeliveries)
      console.log('🌐 Verificando entregas ativas no backend...');
      const { deliveryService } = await import('./deliveryService');
      const response = await deliveryService.getMyActiveDeliveries();
      
      if (response.success && response.data) {
        const deliveries = Array.isArray(response.data) ? response.data : [response.data];
        const activeStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
        const activeDelivery = deliveries.find((d: any) => {
          const status = d.status?.toUpperCase();
          return activeStatuses.includes(status);
        });
        
        if (activeDelivery) {
          // Salva no cache local
          await this.saveActiveDelivery(activeDelivery);
          console.log(`🔒 Entrega ativa encontrada no backend: #${activeDelivery.id} (${activeDelivery.status})`);
          return true;
        }
      }
      
      console.log('✅ Nenhuma entrega ativa encontrada');
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar entrega ativa:', error);
      return false;
    }
  }

  /**
   * ===========================================================================
   * MÉTODOS ANTIGOS (MANTIDOS PARA COMPATIBILIDADE)
   * ===========================================================================
   */

  /**
   * @deprecated PENDING não usa cache - removido
   */
  private async saveDeliveries(deliveries: PendingDelivery[]): Promise<void> {
    console.warn('⚠️ saveDeliveries() está deprecated - PENDING não usa cache');
  }

  /**
   * Carrega TODAS as entregas do storage local (independente de status)
   * Usado para buscar entregas aceitas, ativas, etc.
   */
  async loadAllDeliveriesFromStorage(): Promise<PendingDelivery[]> {
    // Storage all_deliveries foi removido - sempre retorna vazio
    return [];
  }

  /**
   * @deprecated Use loadAllDeliveriesFromStorage() ou getPendingDeliveries()
   */
  async loadDeliveries(): Promise<PendingDelivery[]> {
    console.warn('⚠️ loadDeliveries() está deprecated - use loadAllDeliveriesFromStorage() ou getPendingDeliveries()');
    return this.loadAllDeliveriesFromStorage();
  }

  /**
   * @deprecated
   * Atualiza ou adiciona uma entrega no storage local
   */
  private async updateDelivery(delivery: PendingDelivery): Promise<void> {
    try {
      const deliveries = await this.loadAllDeliveriesFromStorage();
      const index = deliveries.findIndex(d => String(d.id) === String(delivery.id));
      
      if (index >= 0) {
        // Atualiza entrega existente
        deliveries[index] = delivery;
      } else {
        // Adiciona nova entrega
        deliveries.unshift(delivery); // Adiciona no início
      }
      
      await this.saveDeliveries(deliveries);
    } catch (error) {
      console.error('❌ Erro ao atualizar entrega:', error);
    }
  }

  /**
   * Remove entregas antigas do storage (mantém apenas últimas 100)
   */
  private async cleanOldDeliveries(): Promise<void> {
    try {
      const deliveries = await this.loadAllDeliveriesFromStorage();
      if (deliveries.length > 100) {
        const cleaned = deliveries.slice(0, 100);
        await this.saveDeliveries(cleaned);
        console.log(`🧹 Limpas ${deliveries.length - 100} entregas antigas`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar entregas antigas:', error);
    }
  }

  /**
   * Verifica a última entrega PENDING não rejeitada (mais recente por updatedAt)
   * Busca até 100 entregas e itera pela lista procurando a primeira não rejeitada
   * 🔒 CONSTRAINT: Não mostra popup se já existe entrega ACCEPTED
   * 🔒 CONSTRAINT: Não mostra popup se entrega já foi rejeitada no cache local
   */
  async checkLatestPendingDelivery(): Promise<void> {
    try {
      console.log('🔍 Verificando entregas pendentes (updatedAt desc)...');
      
      // Carrega IDs rejeitados do cache único
      const rejectedIds = await this.getRejectedDeliveryIds();
      console.log(`📋 IDs rejeitados no cache: ${rejectedIds.join(', ') || 'nenhum'}`);
      
      // 🔒 CONSTRAINT: Bloqueia silenciosamente se já existe entrega ACCEPTED
      const hasAccepted = await this.hasAcceptedDelivery();
      if (hasAccepted) {
        console.log('🔒 Já existe entrega ACCEPTED. Verificação bloqueada silenciosamente.');
        return;
      }
      
      // Busca PENDING do courier no endpoint dedicado
      const response = await apiClient.get<any>('/deliveries/courier/pendings', {
        params: {
          size: 100,
          sort: 'updatedAt,desc'
        }
      });

      // Aceita tanto paginação (content) quanto lista direta
      const deliveries = Array.isArray(response.data?.content)
        ? response.data.content
        : (Array.isArray(response.data) ? response.data : []);

      if (deliveries && deliveries.length > 0) {
        console.log(`📦 ${deliveries.length} entregas pendentes encontradas`);
        
        // Itera da mais recente para a mais antiga procurando a primeira não rejeitada
        let firstNonRejected = null;
        let rejectedCount = 0;
        
        for (const delivery of deliveries) {
          // Normaliza ID para string para comparação consistente
          const deliveryIdStr = String(delivery.id);
          if (rejectedIds.includes(deliveryIdStr)) {
            rejectedCount++;
            console.log(`⏭️ Entrega ${deliveryIdStr} - rejeitada anteriormente, pulando...`);
            continue;
          }
          
          // Encontrou a primeira não rejeitada
          firstNonRejected = delivery;
          console.log(`✅ Entrega não rejeitada encontrada: ID ${delivery.id}, updatedAt: ${delivery.updatedAt}`);
          break;
        }
        
        console.log(`📊 Resumo: ${deliveries.length} total, ${rejectedCount} rejeitadas, ${firstNonRejected ? '1 disponível' : '0 disponível'}`);
        
        // Se não encontrou nenhuma não rejeitada
        if (!firstNonRejected) {
          console.log('❌ Todas as entregas pendentes foram rejeitadas anteriormente');
          
          Alert.alert(
            "📦 Sem Entregas Disponíveis",
            `Todas as ${deliveries.length} entregas pendentes foram rejeitadas anteriormente.\n\nAguarde novas entregas ou limpe o histórico de rejeições.`,
            [{ text: "OK" }]
          );
          return;
        }

        // Converte para o formato esperado pelo popup
        const pendingDelivery: PendingDelivery = {
          ...firstNonRejected, // Mantém todos os campos do backend
          id: firstNonRejected.id,
          pickupAddress: firstNonRejected.fromAddress || firstNonRejected.pickupAddress || 'Endereço não informado',
          dropoffAddress: firstNonRejected.toAddress || firstNonRejected.dropoffAddress || 'Endereço não informado',
          distance: firstNonRejected.distance || 0,
          estimatedPayment: firstNonRejected.totalAmount || firstNonRejected.estimatedPayment || 0,
          createdAt: firstNonRejected.createdAt,
          status: firstNonRejected.status || 'PENDING',
          locallyRejected: false
        };

        // Chama callback para mostrar popup (permite aceitar/rejeitar)
        if (this.onNewDeliveryCallback) {
          console.log('🚀 Mostrando popup de nova entrega para aceitar/rejeitar');
          this.onNewDeliveryCallback(pendingDelivery);
        } else {
          console.warn('⚠️ Callback de nova entrega não registrado');
        }
      } else {
        console.log('✅ Nenhuma entrega pendente no momento');
        
        Alert.alert(
          "✅ Sem Entregas",
          "Não há novas entregas disponíveis no momento.\n\nTente novamente em alguns instantes.",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar última entrega pendente:', error.message);
    }
  }

  /**
   * Marca entrega como rejeitada no cache único de pendentes
   */
  async markAsRejected(deliveryId: string): Promise<void> {
    const normalizedId = String(deliveryId);
    console.log(`❌ Marcando entrega ${normalizedId} como rejeitada`);
    
    try {
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      const pendingCache = pendingData ? JSON.parse(pendingData) : { deliveries: [], timestamp: Date.now() };
      
      // Verifica se já existe no cache
      const existingIndex = (pendingCache.deliveries || []).findIndex(
        (d: any) => String(d.id) === normalizedId
      );
      
      if (existingIndex >= 0) {
        // Atualiza para rejeitada
        pendingCache.deliveries[existingIndex].locallyRejected = true;
        console.log(`♻️ Entrega ${normalizedId} atualizada para rejeitada no cache`);
      } else {
        // Adiciona como nova entrada rejeitada
        pendingCache.deliveries.push({
          id: normalizedId,
          locallyRejected: true,
          createdAt: new Date().toISOString()
        });
        console.log(`➕ Entrega ${normalizedId} adicionada como rejeitada no cache`);
      }
      
      pendingCache.timestamp = Date.now();
      await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
      
      const rejectedCount = pendingCache.deliveries.filter((d: any) => d.locallyRejected).length;
      console.log(`✅ Entrega ${normalizedId} marcada como rejeitada`);
      console.log(`📊 Total rejeitadas no cache: ${rejectedCount}`);
    } catch (error) {
      console.error('❌ Erro ao marcar como rejeitada:', error);
    }
  }

  /**
   * Remove marca de rejeição (motoboy se arrependeu)
   */
  async unmarkAsRejected(deliveryId: string): Promise<void> {
    const normalizedId = String(deliveryId);
    console.log(`✅ Removendo rejeição da entrega ${normalizedId}`);
    
    try {
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (pendingData) {
        const pendingCache = JSON.parse(pendingData);
        
        // Encontra a entrega e marca como não rejeitada (ou remove)
        const existingIndex = (pendingCache.deliveries || []).findIndex(
          (d: any) => String(d.id) === normalizedId
        );
        
        if (existingIndex >= 0) {
          pendingCache.deliveries[existingIndex].locallyRejected = false;
          console.log(`♻️ Entrega ${normalizedId} desmarcada como rejeitada`);
        }
        
        pendingCache.timestamp = Date.now();
        await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
      }
      
      console.log(`✅ Entrega ${normalizedId} disponível novamente`);
    } catch (error) {
      console.error('❌ Erro ao desmarcar rejeição:', error);
    }
  }

  /**
   * Remove uma entrega do storage local (útil quando deletada no backend)
   */
  async removeDeliveryFromStorage(deliveryId: string | number): Promise<void> {
    try {
      const id = String(deliveryId);
      console.log(`🗑️ Removendo entrega ${id} do storage local...`);
      
      // Remove do cache de pendentes
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (pendingData) {
        const pendingCache = JSON.parse(pendingData);
        pendingCache.deliveries = (pendingCache.deliveries || []).filter(
          (d: any) => String(d.id) !== id
        );
        await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
        console.log(`🗑️ Entrega ${id} removida do cache de pendentes`);
      }
    } catch (error) {
      console.error(`❌ Erro ao remover entrega ${deliveryId} do storage:`, error);
    }
  }

  /**
   * Atualiza uma entrega específica no storage local
   * Usado após aceitar/atualizar status de uma entrega
   */
  async updateDeliveryInStorage(deliveryId: string, updatedData: any): Promise<void> {
    try {
      console.log(`🔄 Atualizando entrega ${deliveryId} no storage local...`);
      
      // Carrega todas as entregas do storage
      const allDeliveries = await this.loadAllDeliveriesFromStorage();
      
      // Normaliza o deliveryId para string para comparação consistente
      const normalizedId = String(deliveryId);
      
      // Procura a entrega existente (compara tanto string quanto número)
      const existingIndex = allDeliveries.findIndex(d => String(d.id) === normalizedId);
      
      if (existingIndex >= 0) {
        // Atualiza a entrega existente mantendo campos mapeados
        allDeliveries[existingIndex] = {
          ...allDeliveries[existingIndex],
          ...updatedData,
          id: allDeliveries[existingIndex].id, // Mantém o ID original
          pickupAddress: updatedData.fromAddress || updatedData.pickupAddress || allDeliveries[existingIndex].pickupAddress,
          dropoffAddress: updatedData.toAddress || updatedData.dropoffAddress || allDeliveries[existingIndex].dropoffAddress,
          distance: updatedData.distance || allDeliveries[existingIndex].distance || 0,
          estimatedPayment: updatedData.totalAmount || updatedData.estimatedPayment || allDeliveries[existingIndex].estimatedPayment || 0,
          status: updatedData.status || allDeliveries[existingIndex].status,
        };
        
        console.log(`✅ Entrega ${deliveryId} atualizada no storage (status: ${updatedData.status})`);
      } else {
        // Se não existe, adiciona como nova entrega
        const newDelivery: PendingDelivery = {
          ...updatedData,
          id: deliveryId,
          pickupAddress: updatedData.fromAddress || updatedData.pickupAddress || 'Endereço não informado',
          dropoffAddress: updatedData.toAddress || updatedData.dropoffAddress || 'Endereço não informado',
          distance: updatedData.distance || 0,
          estimatedPayment: updatedData.totalAmount || updatedData.estimatedPayment || 0,
          createdAt: updatedData.createdAt,
          status: updatedData.status || 'PENDING',
          locallyRejected: false
        };
        
        allDeliveries.push(newDelivery);
        console.log(`✅ Entrega ${deliveryId} adicionada ao storage (status: ${updatedData.status})`);
      }
      
      // Remove duplicatas (garantia extra)
      const uniqueDeliveries = allDeliveries.reduce((acc: PendingDelivery[], current) => {
        const exists = acc.find(item => String(item.id) === String(current.id));
        if (!exists) {
          acc.push(current);
        } else {
          console.log(`⚠️ Duplicata removida: entrega ${current.id}`);
        }
        return acc;
      }, []);
      
      // Storage all_deliveries foi removido - método não faz nada
      console.warn('⚠️ updateDeliveryInStorage() - storage all_deliveries foi removido');
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar entrega ${deliveryId} no storage:`, error);
    }
  }

  /**
   * Limpa histórico de entregas rejeitadas (desmarcar todas como rejeitadas)
   */
  async clearRejectedHistory(): Promise<void> {
    try {
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (pendingData) {
        const pendingCache = JSON.parse(pendingData);
        // Desmarcar todas as entregas como rejeitadas
        (pendingCache.deliveries || []).forEach((d: any) => {
          d.locallyRejected = false;
        });
        await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
      }
      console.log('🧹 Histórico de entregas rejeitadas limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar histórico:', error);
    }
  }

  /**
   * Limpa TODOS os caches de entregas (ativas, concluídas, pendentes)
   * Deve ser chamado quando um novo usuário faz login
   */
  async clearAllDeliveryCaches(): Promise<void> {
    try {
      console.log('🧹 Limpando TODOS os caches de entregas...');
      
      // Limpa cache em memória
      this.cachedDeliveries.clear();
      
      // Limpa cache no AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEY_ACTIVE_CACHE),
        AsyncStorage.removeItem(this.STORAGE_KEY_COMPLETED_CACHE),
        AsyncStorage.removeItem(this.STORAGE_KEY_PENDING_CACHE),
        AsyncStorage.removeItem('deliveries'), // Cache principal de entregas (legado)
        AsyncStorage.removeItem('all_deliveries'), // Storage legado de entregas
        AsyncStorage.removeItem('rejected_deliveries'), // Legado - migração
      ]);
      
      console.log('✅ Todos os caches de entregas foram limpos com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar caches de entregas:', error);
    }
  }

  /**
   * Limpeza inteligente de caches no login:
   * - Pendentes: Remove entregas com createdAt > 1 dia
   * - Completadas: Mantém apenas entregas NÃO pagas (sem payments[].status === 'PAID')
   * - Ativas: Limpa tudo (será recarregado do backend)
   */
  async cleanupCachesOnLogin(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpeza inteligente de caches no login...');
      
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 1 dia em ms
      
      // 1. Limpar cache de PENDENTES (remover > 1 dia)
      const pendingData = await AsyncStorage.getItem(this.STORAGE_KEY_PENDING_CACHE);
      if (pendingData) {
        const pendingCache = JSON.parse(pendingData);
        const originalCount = (pendingCache.deliveries || []).length;
        
        pendingCache.deliveries = (pendingCache.deliveries || []).filter((d: any) => {
          if (!d.createdAt) return true; // Se não tem data, mantém
          const createdTime = new Date(d.createdAt).getTime();
          return createdTime > oneDayAgo; // Mantém se criada há menos de 1 dia
        });
        
        const removedPending = originalCount - pendingCache.deliveries.length;
        pendingCache.timestamp = Date.now();
        await AsyncStorage.setItem(this.STORAGE_KEY_PENDING_CACHE, JSON.stringify(pendingCache));
        console.log(`📋 Pendentes: ${removedPending} removidas (> 1 dia), ${pendingCache.deliveries.length} mantidas`);
      }
      
      // 2. Limpar cache de COMPLETADAS (manter apenas não pagas)
      const completedData = await AsyncStorage.getItem(this.STORAGE_KEY_COMPLETED_CACHE);
      if (completedData) {
        const completedCache = JSON.parse(completedData);
        const originalCount = (completedCache.deliveries || []).length;
        
        completedCache.deliveries = (completedCache.deliveries || []).filter((d: any) => {
          // Verifica se tem payments com status PAID
          const payments = d.payments || [];
          const isPaid = payments.some((p: any) => p.status === 'PAID');
          return !isPaid; // Mantém apenas se NÃO foi paga
        });
        
        const removedCompleted = originalCount - completedCache.deliveries.length;
        completedCache.timestamp = Date.now();
        await AsyncStorage.setItem(this.STORAGE_KEY_COMPLETED_CACHE, JSON.stringify(completedCache));
        console.log(`✅ Completadas: ${removedCompleted} pagas removidas, ${completedCache.deliveries.length} não-pagas mantidas`);
      }
      
      // 3. Limpar cache de ATIVAS (será recarregado do backend)
      await AsyncStorage.removeItem(this.STORAGE_KEY_ACTIVE_CACHE);
      console.log('🚚 Ativas: cache limpo (será recarregado do backend)');
      
      // 4. Limpar caches legados
      await Promise.all([
        AsyncStorage.removeItem('deliveries'),
        AsyncStorage.removeItem('all_deliveries'),
        AsyncStorage.removeItem('rejected_deliveries'),
      ]);
      
      // 5. Limpar cache em memória
      this.cachedDeliveries.clear();
      
      console.log('✅ Limpeza inteligente de caches concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza de caches:', error);
      // Em caso de erro, faz limpeza total como fallback
      await this.clearAllDeliveryCaches();
    }
  }

  /**
   * Força atualização do status de uma entrega específica no storage
   * Útil para corrigir inconsistências manualmente
   */
  async forceUpdateDeliveryStatus(deliveryId: string, newStatus: string): Promise<boolean> {
    try {
      console.log(`🔧 Forçando atualização da entrega ${deliveryId} para status ${newStatus}...`);
      
      const allDeliveries = await this.loadAllDeliveriesFromStorage();
      const normalizedId = String(deliveryId);
      const existingIndex = allDeliveries.findIndex(d => String(d.id) === normalizedId);
      
      if (existingIndex >= 0) {
        // Storage all_deliveries foi removido - método não atualiza
        console.warn('⚠️ forceUpdateDeliveryStatus() - storage all_deliveries foi removido');
        return false;
      } else {
        console.log(`❌ Entrega ${deliveryId} não encontrada no storage`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erro ao forçar atualização do status:`, error);
      return false;
    }
  }

  /**
   * Remove duplicatas do storage
   * Garante que cada delivery aparece apenas uma vez
   */
  async removeDuplicates(): Promise<number> {
    try {
      console.log('🧹 Removendo duplicatas do storage...');
      
      const allDeliveries = await this.loadAllDeliveriesFromStorage();
      const initialCount = allDeliveries.length;
      
      // Usa Map para garantir unicidade por ID
      const uniqueMap = new Map<string, PendingDelivery>();
      
      allDeliveries.forEach(delivery => {
        const normalizedId = String(delivery.id);
        
        if (uniqueMap.has(normalizedId)) {
          console.log(`⚠️ Duplicata encontrada e removida: entrega ${delivery.id} (status: ${delivery.status})`);
          
          // Se já existe, mantém a versão com status mais avançado
          const existing = uniqueMap.get(normalizedId)!;
          const statusOrder = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
          const existingOrder = statusOrder.indexOf(existing.status || 'PENDING');
          const currentOrder = statusOrder.indexOf(delivery.status || 'PENDING');
          
          if (currentOrder > existingOrder) {
            uniqueMap.set(normalizedId, delivery);
            console.log(`  → Mantida versão com status ${delivery.status} (mais recente)`);
          } else {
            console.log(`  → Mantida versão com status ${existing.status} (mais recente)`);
          }
        } else {
          uniqueMap.set(normalizedId, delivery);
        }
      });
      
      const uniqueDeliveries = Array.from(uniqueMap.values());
      const removedCount = initialCount - uniqueDeliveries.length;
      
      // Storage all_deliveries foi removido - método não salva
      console.warn('⚠️ removeDuplicateDeliveries() - storage all_deliveries foi removido');
      
      if (removedCount > 0) {
        console.log(`✅ ${removedCount} duplicata(s) identificada(s). Total: ${initialCount} → ${uniqueDeliveries.length} (não salvo)`);
      } else {
        console.log(`✅ Nenhuma duplicata encontrada`);
      }
      
      return removedCount;
    } catch (error) {
      console.error('❌ Erro ao remover duplicatas:', error);
      return 0;
    }
  }
}

export const deliveryPollingService = new DeliveryPollingService();
