import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { userLocationService } from './userLocationService';

// Nome da task de background
const LOCATION_TASK_NAME = 'background-location-task';

// Configurações de localização
const LOCATION_UPDATE_INTERVAL = 300000; // 5 minutos
const LOCATION_ACCURACY = Location.Accuracy.Balanced;
const LOCATION_DISTANCE_INTERVAL = 10; // metros

/**
 * Detecta se está rodando no Expo Go
 */
const isRunningInExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

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
  private useMockLocation = false;
  private mockLocationData: LocationData | null = null;
  private mockMovementEnabled = false;
  
  // Centro de Ubajara-CE (Praça da Matriz)
  private readonly UBAJARA_CENTER = {
    latitude: -3.8566,
    longitude: -40.9219
  };

  /**
   * Inicializa o serviço de localização
   * Tenta usar GPS real primeiro, mesmo no Expo Go
   */
  async initialize(): Promise<void> {
    if (isRunningInExpoGo()) {
      console.log('📱 Detectado Expo Go - tentando usar GPS real...');
      // Tenta solicitar permissão para GPS real
      const hasPermission = await this.requestPermissions();
      if (hasPermission) {
        console.log('✅ Permissão de GPS concedida - usando localização REAL no Expo Go');
        this.useMockLocation = false;
      } else {
        console.log('⚠️ Sem permissão de GPS - ativando mock como fallback');
        this.enableMockLocation(undefined, undefined, false);
      }
    } else {
      console.log('📱 Detectado app standalone - usando localização real');
    }
  }

  /**
   * Ativa modo mock de localização para desenvolvimento
   * Por padrão usa coordenadas de Ubajara-CE
   */
  enableMockLocation(latitude?: number, longitude?: number, enableMovement: boolean = false): void {
    this.useMockLocation = true;
    this.mockMovementEnabled = enableMovement;
    this.mockLocationData = {
      latitude: latitude || this.UBAJARA_CENTER.latitude,
      longitude: longitude || this.UBAJARA_CENTER.longitude,
      accuracy: 10,
      timestamp: Date.now()
    };
    console.log('🎭 Mock de localização ativado (Ubajara-CE):', this.mockLocationData);
    console.log(`📍 Movimento ${enableMovement ? 'ATIVADO' : 'DESATIVADO'}`);
  }

  /**
   * Desativa modo mock de localização
   */
  disableMockLocation(): void {
    this.useMockLocation = false;
    this.mockLocationData = null;
    this.mockMovementEnabled = false;
    console.log('✅ Mock de localização desativado');
  }

  /**
   * Verifica se está usando mock
   */
  isMockLocationEnabled(): boolean {
    return this.useMockLocation;
  }

  /**
   * Simula pequeno deslocamento (como um motoboy se movendo)
   * Varia entre 0-50 metros em direção aleatória
   */
  private simulateMovement(current: LocationData): LocationData {
    if (!this.mockMovementEnabled) {
      return current;
    }

    // Probabilidade de 30% de se mover (motoboy pode estar parado)
    if (Math.random() > 0.3) {
      return {
        ...current,
        timestamp: Date.now()
      };
    }

    // Pequeno deslocamento (0-50 metros)
    // 1 grau de latitude ≈ 111km, então 0.0001° ≈ 11 metros
    const maxDelta = 0.0005; // ~50 metros
    const deltaLat = (Math.random() - 0.5) * maxDelta;
    const deltaLng = (Math.random() - 0.5) * maxDelta;

    const newLocation = {
      latitude: current.latitude + deltaLat,
      longitude: current.longitude + deltaLng,
      accuracy: current.accuracy,
      timestamp: Date.now()
    };

    console.log('🚶 Mock: Simulando movimento leve:', {
      from: { lat: current.latitude.toFixed(6), lng: current.longitude.toFixed(6) },
      to: { lat: newLocation.latitude.toFixed(6), lng: newLocation.longitude.toFixed(6) },
      distance: '~' + Math.round(Math.sqrt(deltaLat**2 + deltaLng**2) * 111000) + 'm'
    });

    return newLocation;
  }

  /**
   * Solicita permissões de localização
   */
  async requestPermissions(forceRequest: boolean = false): Promise<boolean> {
    try {
      // Se está em modo mock e não está forçando, não precisa pedir permissões
      if (this.useMockLocation && !forceRequest) {
        console.log('🎭 Modo mock - pulando solicitação de permissões');
        return true;
      }
      
      console.log('📍 Verificando permissões de localização...');
      
      // Verifica permissões atuais
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Permissões de localização já concedidas');
        return true;
      }
      
      // Se estamos forçando ou não está em mock, solicita permissões
      if (forceRequest || !this.useMockLocation) {
        console.log('🔐 Solicitando permissões de localização...');
        const response = await Location.requestForegroundPermissionsAsync();
        status = response.status;
        
        if (status === 'granted') {
          console.log('✅ Permissões concedidas!');
          return true;
        } else {
          console.log('❌ Permissões negadas pelo usuário');
          return false;
        }
      }
      
      console.log('⚠️ Permissões de localização não concedidas - operando em modo restrito');
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
      return false;
    }
  }

  /**
   * Inicia o tracking de localização
   */
  async startTracking(): Promise<boolean> {
    try {
      // Se está em modo mock, não precisa de permissões
      if (this.useMockLocation) {
        console.log('🎭 Modo mock ativado - iniciando tracking sem permissões');
        
        // Verifica se já está fazendo tracking
        if (this.isTracking) {
          return true;
        }

        // Inicia tracking em foreground com mock
        await this.startForegroundTracking();
        this.isTracking = true;
        console.log('🚀 Location tracking iniciado (modo mock)');
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        // Em DEV, permite iniciar tracking mesmo sem permissões (usa fallback)
        if (__DEV__) {
          console.log('⚠️ Sem permissões mas em DEV - iniciando com fallback');
          if (!this.isTracking) {
            await this.startForegroundTracking();
            this.isTracking = true;
            console.log('🚀 Location tracking iniciado (modo fallback)');
          }
          return true;
        }
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
    // Se mock está ativado, retorna a localização mockada com movimento simulado
    if (this.useMockLocation && this.mockLocationData) {
      const simulatedLocation = this.simulateMovement(this.mockLocationData);
      // Atualiza para próxima chamada
      this.mockLocationData = simulatedLocation;
      return simulatedLocation;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('⚠️ Sem permissões - tentando usar localização padrão');
        // Se não tem permissão mas está em DEV, retorna coordenadas de Ubajara-CE como fallback
        if (__DEV__) {
          console.log('🎭 Usando localização padrão de Ubajara-CE');
          return {
            latitude: this.UBAJARA_CENTER.latitude,
            longitude: this.UBAJARA_CENTER.longitude,
            accuracy: 100,
            timestamp: Date.now()
          };
        }
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
      
      // Em desenvolvimento, retorna coordenadas de Ubajara-CE como fallback
      if (__DEV__) {
        console.log('🎭 Erro ao obter localização real - usando Ubajara-CE como fallback');
        return {
          latitude: this.UBAJARA_CENTER.latitude,
          longitude: this.UBAJARA_CENTER.longitude,
          accuracy: 100,
          timestamp: Date.now()
        };
      }
      
      return null;
    }
  }

  /**
   * Inicia tracking em foreground (quando app está aberto)
   */
  private async startForegroundTracking(): Promise<void> {
    // Faz a primeira atualização imediatamente
    console.log('📍 Fazendo primeira atualização de localização...');
    const initialLocation = await this.getCurrentLocation();
    if (initialLocation) {
      await this.updateUserLocation(initialLocation, true); // force update
      console.log('✅ Primeira localização enviada ao servidor');
    }
    
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
  async updateUserLocation(location: LocationData, forceUpdate: boolean = false): Promise<LocationUpdateResponse> {
    try {
      // Evita updates muito frequentes (exceto se forçado)
      const now = Date.now();
      if (!forceUpdate && now - this.lastUpdate < this.updateInterval) {
        return { success: true };
      }

      // Atualiza no backend usando o serviço específico
      const response = await userLocationService.updateCurrentUserLocation(
        location.latitude,
        location.longitude
      );

      if (response.success) {
        this.lastUpdate = now;
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