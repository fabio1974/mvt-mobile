import { Platform } from 'react-native';
import { locationService } from './locationService';
import { webLocationService } from './webLocationService';

/**
 * Serviço unificado de localização que escolhe automaticamente
 * entre o serviço mobile (Expo Location) e web (Geolocation API)
 * baseado na plataforma atual
 */

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface LocationUpdateResponse {
  success: boolean;
  error?: string;
}

class UnifiedLocationService {
  private currentService: any = null;
  private initialized = false;

  constructor() {
    this.initializeService();
  }

  /**
   * Inicializa o serviço apropriado baseado na plataforma
   */
  private initializeService() {
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      this.currentService = webLocationService;
      console.log('🌐 Usando WebLocationService para plataforma web');
    } else {
      this.currentService = locationService;
      console.log('📱 Usando LocationService para plataforma mobile');
    }
  }

  /**
   * Inicializa configurações específicas do serviço
   * (mock automático no Expo Go, etc)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.currentService?.initialize) {
      await this.currentService.initialize();
    }

    this.initialized = true;
  }

  /**
   * Verifica se o serviço está disponível
   */
  isAvailable(): boolean {
    return this.currentService !== null;
  }

  /**
   * Retorna informações sobre a plataforma atual
   */
  getPlatformInfo(): { platform: string; service: string; available: boolean } {
    const isWeb = Platform.OS === 'web';
    return {
      platform: Platform.OS,
      service: isWeb ? 'WebLocationService' : 'LocationService',
      available: this.isAvailable(),
    };
  }

  /**
   * Solicita permissões de localização
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.currentService) {
      console.error('❌ Serviço de localização não disponível');
      return false;
    }

    try {
      return await this.currentService.requestPermissions();
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Inicia o tracking de localização
   */
  async startTracking(): Promise<boolean> {
    if (!this.currentService) {
      console.error('❌ Serviço de localização não disponível');
      return false;
    }

    try {
      const platformInfo = this.getPlatformInfo();
      console.log(`🚀 Iniciando tracking na plataforma: ${platformInfo.platform} usando ${platformInfo.service}`);
      
      return await this.currentService.startTracking();
    } catch (error) {
      console.error('❌ Erro ao iniciar tracking:', error);
      return false;
    }
  }

  /**
   * Para o tracking de localização
   */
  async stopTracking(): Promise<void> {
    if (!this.currentService) {
      console.log('⚠️ Serviço de localização não disponível para parar');
      return;
    }

    try {
      await this.currentService.stopTracking();
      console.log('⏹️ Tracking de localização parado');
    } catch (error) {
      console.error('❌ Erro ao parar tracking:', error);
    }
  }

  /**
   * Obtém localização atual
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.currentService) {
      console.error('❌ Serviço de localização não disponível');
      return null;
    }

    try {
      return await this.currentService.getCurrentLocation();
    } catch (error) {
      console.error('❌ Erro ao obter localização atual:', error);
      return null;
    }
  }

  /**
   * Configura intervalo de update
   */
  setUpdateInterval(interval: number): void {
    if (!this.currentService) {
      console.log('⚠️ Serviço de localização não disponível');
      return;
    }

    try {
      this.currentService.setUpdateInterval(interval);
    } catch (error) {
      console.error('❌ Erro ao configurar intervalo:', error);
    }
  }

  /**
   * Verifica se está fazendo tracking
   */
  isLocationTrackingActive(): boolean {
    if (!this.currentService) {
      return false;
    }

    try {
      return this.currentService.isLocationTrackingActive();
    } catch (error) {
      console.error('❌ Erro ao verificar status do tracking:', error);
      return false;
    }
  }

  /**
   * Atualiza localização no backend (método direto)
   */
  async updateUserLocation(location: LocationData): Promise<LocationUpdateResponse> {
    if (!this.currentService) {
      return { success: false, error: 'Serviço não disponível' };
    }

    try {
      return await this.currentService.updateUserLocation(location);
    } catch (error) {
      console.error('❌ Erro ao atualizar localização:', error);
      return { success: false, error: 'Erro ao atualizar localização' };
    }
  }

  /**
   * Testa a geolocalização em qualquer plataforma
   */
  async testGeolocation(): Promise<void> {
    console.log('🧪 Testando geolocalização...');
    
    try {
      const location = await this.getCurrentLocation();
      
      if (location) {
        console.log('✅ Localização obtida:', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        });
        console.log(`📍 Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}, Precisão: ${location.accuracy?.toFixed(0)}m`);
      } else {
        console.log('❌ Não foi possível obter localização');
      }
    } catch (error) {
      console.error('❌ Erro no teste de geolocalização:', error);
    }
  }

  /**
   * Força uma atualização de localização
   */
  async forceLocationUpdate(): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation();
      if (location) {
        const result = await this.updateUserLocation(location);
        return result.success;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao forçar atualização:', error);
      return false;
    }
  }

  /**
   * Retorna configurações recomendadas baseadas no role do usuário
   */
  getRecommendedSettings(userRole: string): { updateInterval: number; description: string } {
    switch (userRole?.toUpperCase()) {
      case 'COURIER':
        return {
          updateInterval: 15000, // 15 segundos
          description: 'Atualização frequente para entregadores'
        };
      case 'CLIENT':
        return {
          updateInterval: 60000, // 1 minuto
          description: 'Atualização moderada para clientes'
        };
      case 'ADMIN':
      case 'ORGANIZER':
        return {
          updateInterval: 120000, // 2 minutos
          description: 'Atualização básica para administradores'
        };
      default:
        return {
          updateInterval: 60000, // 1 minuto
          description: 'Atualização padrão'
        };
    }
  }

  /**
   * Aplica configurações otimizadas baseadas no role
   */
  optimizeForUserRole(userRole: string): void {
    const settings = this.getRecommendedSettings(userRole);
    this.setUpdateInterval(settings.updateInterval);
    console.log(`⚙️ Configurações aplicadas para ${userRole}: ${settings.description} (${settings.updateInterval}ms)`);
  }
}

// Exporta instância singleton que funciona em qualquer plataforma
export const unifiedLocationService = new UnifiedLocationService();

// Para compatibilidade, mantém exports individuais
export { locationService, webLocationService };

// Export default para importação simples
export default UnifiedLocationService;