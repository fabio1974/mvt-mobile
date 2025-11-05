import { apiClient } from './api';
import { MetadataResponse, EntityMetadata } from '../types/metadata';

/**
 * Serviço para buscar metadata das entidades do backend
 * Permite descobrir automaticamente a estrutura das entidades
 */
class MetadataService {
  private metadataCache: MetadataResponse | null = null;
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca todas as metadata do backend
   */
  async getMetadata(forceRefresh = false): Promise<MetadataResponse> {
    const now = Date.now();
    
    // Usa cache se disponível e não expirado
    if (!forceRefresh && this.metadataCache && (now - this.lastFetch < this.cacheDuration)) {
      console.log('📋 Usando metadata do cache');
      return this.metadataCache;
    }

    try {
      console.log('📡 Buscando metadata do backend...');
      const response = await apiClient.get<MetadataResponse>('/metadata');
      
      this.metadataCache = response.data;
      this.lastFetch = now;
      
      console.log('✅ Metadata carregada:', Object.keys(this.metadataCache));
      return this.metadataCache;
    } catch (error: any) {
      console.error('❌ Erro ao buscar metadata:', error);
      
      // Se tem cache antigo, usa ele
      if (this.metadataCache) {
        console.log('⚠️ Usando metadata cache antigo devido ao erro');
        return this.metadataCache;
      }
      
      throw error;
    }
  }

  /**
   * Busca metadata de uma entidade específica
   */
  async getEntityMetadata(entityName: string): Promise<EntityMetadata | null> {
    try {
      const metadata = await this.getMetadata();
      return metadata[entityName] || null;
    } catch (error) {
      console.error(`❌ Erro ao buscar metadata da entidade ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Lista todas as entidades disponíveis
   */
  async getAvailableEntities(): Promise<string[]> {
    try {
      const metadata = await this.getMetadata();
      return Object.keys(metadata);
    } catch (error) {
      console.error('❌ Erro ao listar entidades:', error);
      return [];
    }
  }

  /**
   * Busca metadata relacionada a entregas/corridas
   */
  async getDeliveryEntities(): Promise<{ [key: string]: EntityMetadata }> {
    try {
      const metadata = await this.getMetadata();
      const deliveryEntities: { [key: string]: EntityMetadata } = {};
      
      // Busca entidades relacionadas a delivery
      for (const [entityName, entityMeta] of Object.entries(metadata)) {
        const name = entityName.toLowerCase();
        if (
          name.includes('order') ||
          name.includes('delivery') ||
          name.includes('ride') ||
          name.includes('entrega') ||
          name.includes('corrida') ||
          name.includes('pedido')
        ) {
          deliveryEntities[entityName] = entityMeta;
        }
      }
      
      console.log('🚚 Entidades de delivery encontradas:', Object.keys(deliveryEntities));
      return deliveryEntities;
    } catch (error) {
      console.error('❌ Erro ao buscar entidades de delivery:', error);
      return {};
    }
  }

  /**
   * Limpa o cache de metadata
   */
  clearCache(): void {
    this.metadataCache = null;
    this.lastFetch = 0;
    console.log('🗑️ Cache de metadata limpo');
  }

  /**
   * Verifica se uma entidade existe
   */
  async entityExists(entityName: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata();
      return entityName in metadata;
    } catch (error) {
      return false;
    }
  }

  /**
   * Debug: imprime todas as entidades e seus campos
   */
  async debugPrintEntities(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      
      console.log('\n📋 === METADATA DEBUG ===');
      for (const [entityName, entityMeta] of Object.entries(metadata)) {
        console.log(`\n🏗️ Entidade: ${entityName}`);
        console.log(`   Label: ${entityMeta.label}`);
        console.log(`   Endpoint: ${entityMeta.endpoint}`);
        
        if (entityMeta.tableFields && entityMeta.tableFields.length > 0) {
          console.log(`   Campos da tabela (${entityMeta.tableFields.length}):`);
          entityMeta.tableFields.forEach(field => {
            console.log(`     - ${field.name}: ${field.type} (${field.label})`);
          });
        }
        
        if (entityMeta.formFields && entityMeta.formFields.length > 0) {
          console.log(`   Campos do form (${entityMeta.formFields.length}):`);
          entityMeta.formFields.forEach(field => {
            console.log(`     - ${field.name}: ${field.type} (${field.label})`);
          });
        }
      }
      console.log('\n📋 === FIM DEBUG ===\n');
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
  }
}

// Exporta instância singleton
export const metadataService = new MetadataService();
export default MetadataService;