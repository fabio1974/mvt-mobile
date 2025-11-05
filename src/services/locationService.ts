import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userLocationService } from './userLocationService';

// Nome da task de background
const LOCATION_TASK_NAME = 'background-location-task';

// Configurações de localização
const LOCATION_UPDATE_INTERVAL = 30000; // 30 segundos
const LOCATION_ACCURACY = Location.Accuracy.Balanced;
const LOCATION_DISTANCE_INTERVAL = 10; // metros

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

class LocationService {
  private isTracking = false;
  private lastUpdate = 0;
  private updateInterval = LOCATION_UPDATE_INTERVAL;

  /**
   * Solicita permissões de localização
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Solicita permissão para localização em foreground
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('❌ Permissão de localização negada');
        return false;
      }

      // Solicita permissão para localização em background
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('⚠️ Permissão de background negada - apenas foreground disponível');
      }

      console.log('✅ Permissões de localização concedidas');
      return true;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      return false;
    }
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

      // Verifica se já está fazendo tracking
      if (this.isTracking) {
        // Tracking já está ativo
        return true;
      }

      // Inicia tracking em foreground
      await this.startForegroundTracking();
      
      // Tenta iniciar tracking em background
      await this.startBackgroundTracking();

      this.isTracking = true;
      console.log('🚀 Location tracking iniciado');
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
      // Para background tracking
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('⏹️ Background tracking parado');
      }

      this.isTracking = false;
      console.log('⏹️ Location tracking parado');
    } catch (error) {
      console.error('❌ Erro ao parar tracking:', error);
    }
  }

  /**
   * Obtém localização atual uma vez
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_ACCURACY,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('❌ Erro ao obter localização:', error);
      return null;
    }
  }

  /**
   * Inicia tracking em foreground (quando app está aberto)
   */
  private async startForegroundTracking(): Promise<void> {
    // Implementação de foreground tracking com setInterval
    setInterval(async () => {
      if (this.isTracking) {
        const location = await this.getCurrentLocation();
        if (location) {
          await this.updateUserLocation(location);
        }
      }
    }, this.updateInterval);
  }

  /**
   * Inicia tracking em background
   */
  private async startBackgroundTracking(): Promise<void> {
    try {
      // Verifica se a task já está registrada
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Registra a task de background
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: LOCATION_ACCURACY,
        timeInterval: this.updateInterval,
        distanceInterval: LOCATION_DISTANCE_INTERVAL,
        foregroundService: {
          notificationTitle: 'Zapi10 - Localização',
          notificationBody: 'Atualizando sua localização para entregas',
        },
      });

      console.log('🔄 Background location tracking iniciado');
    } catch (error) {
      console.error('❌ Erro no background tracking:', error);
    }
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

      console.log(`📍 Atualizando localização: ${location.latitude}, ${location.longitude}`);

      // Atualiza no backend usando o serviço específico
      const response = await userLocationService.updateCurrentUserLocation(
        location.latitude,
        location.longitude
      );

      if (response.success) {
        this.lastUpdate = now;
        console.log('✅ Localização atualizada no backend');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.message || 'Erro ao atualizar localização' 
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar localização:', error);
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
    console.log(`🔧 Intervalo de update definido para ${this.updateInterval}ms`);
  }

  /**
   * Verifica se está fazendo tracking
   */
  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }
}

// Define a task de background
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    
    if (location) {
      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      try {
        // Atualiza localização em background
        await locationService.updateUserLocation(locationData);
      } catch (error) {
        console.error('❌ Erro ao atualizar localização em background:', error);
      }
    }
  }
});

// Exporta instância singleton
export const locationService = new LocationService();
export default LocationService;