/**
 * Versão Web-friendly do LocationService
 * Usa a Geolocation API do navegador
 */

import { userLocationService } from './userLocationService';

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

class WebLocationService {
  private isTracking = false;
  private lastUpdate = 0;
  private updateInterval = 30000; // 30 segundos
  private watchId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Verifica se o navegador suporta geolocalização
   */
  isGeolocationSupported(): boolean {
    return 'navigator' in window && 'geolocation' in navigator;
  }

  /**
   * Solicita permissões de localização no navegador
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isGeolocationSupported()) {
        console.log('❌ Geolocalização não suportada neste navegador');
        return false;
      }

      // Testa se consegue obter localização
      const position = await this.getCurrentLocationPromise();
      console.log('✅ Permissões de localização concedidas');
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao solicitar permissões:', error.message);
      return false;
    }
  }

  /**
   * Converte getCurrentPosition em Promise
   */
  private getCurrentLocationPromise(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1 minuto
        }
      );
    });
  }

  /**
   * Inicia o tracking de localização
   */
  async startTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      if (this.isTracking) {
        // Tracking já está ativo
        return true;
      }

      // Inicia tracking contínuo
      this.startContinuousTracking();
      
      this.isTracking = true;
      console.log('🚀 Web location tracking iniciado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar tracking:', error);
      return false;
    }
  }

  /**
   * Para o tracking de localização
   */
  async stopTracking(): Promise<void> {
    try {
      // Para o watch
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      // Para o interval
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isTracking = false;
      console.log('⏹️ Web location tracking parado');
    } catch (error) {
      console.error('❌ Erro ao parar tracking:', error);
    }
  }

  /**
   * Obtém localização atual uma vez
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      if (!this.isGeolocationSupported()) {
        return null;
      }

      const position = await this.getCurrentLocationPromise();

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || undefined,
        timestamp: position.timestamp,
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter localização:', error.message);
      return null;
    }
  }

  /**
   * Inicia tracking contínuo usando watchPosition e setInterval
   */
  private startContinuousTracking(): void {
    // Opção 1: Usar watchPosition (mais eficiente)
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        this.updateUserLocation(locationData);
      },
      (error) => {
        console.error('❌ Erro no watchPosition:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000, // 30 segundos
      }
    );

    // Opção 2: Usar setInterval como backup (caso watchPosition falhe)
    this.intervalId = setInterval(async () => {
      if (this.isTracking) {
        const location = await this.getCurrentLocation();
        if (location) {
          await this.updateUserLocation(location);
        }
      }
    }, this.updateInterval);
  }

  /**
   * Atualiza localização do usuário no backend
   */
  async updateUserLocation(location: LocationData): Promise<LocationUpdateResponse> {
    try {
      // Evita updates muito frequentes
      const now = Date.now();
      if (now - this.lastUpdate < this.updateInterval) {
        return { success: true };
      }

      console.log(`📍 [WEB] Atualizando localização: ${location.latitude}, ${location.longitude}`);

      // Atualiza no backend
      const response = await userLocationService.updateCurrentUserLocation(
        location.latitude,
        location.longitude
      );

      if (response.success) {
        this.lastUpdate = now;
        console.log('✅ [WEB] Localização atualizada no backend');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.message || 'Erro ao atualizar localização' 
        };
      }
    } catch (error: any) {
      console.error('❌ [WEB] Erro ao atualizar localização:', error);
      return { 
        success: false, 
        error: 'Erro ao atualizar localização' 
      };
    }
  }

  /**
   * Configura intervalo de update (em milissegundos)
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(interval, 10000); // Mínimo 10 segundos
    console.log(`🔧 [WEB] Intervalo de update definido para ${this.updateInterval}ms`);
  }

  /**
   * Verifica se está fazendo tracking
   */
  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Testa a geolocalização uma vez (para debug)
   */
  async testGeolocation(): Promise<void> {
    try {
      console.log('🧪 [WEB] Testando geolocalização...');
      const location = await this.getCurrentLocation();
      
      if (location) {
        console.log('✅ [WEB] Teste bem-sucedido:', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        });
        
        // Testa update no backend
        const updateResult = await this.updateUserLocation(location);
        console.log('📡 [WEB] Resultado do update:', updateResult);
      } else {
        console.log('❌ [WEB] Não foi possível obter localização');
      }
    } catch (error) {
      console.error('❌ [WEB] Erro no teste:', error);
    }
  }
}

// Detecta se está rodando no web e cria instância apropriada
const isWeb = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export const webLocationService = isWeb ? new WebLocationService() : null;

// Para compatibilidade, exporta o serviço web como padrão quando no navegador
export const locationServiceForPlatform = isWeb ? webLocationService : null;

export default WebLocationService;