import { apiClient } from './api';

export interface City {
  id: number;
  name: string;
  state: string;
}

export interface UserAddress {
  id: number;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  referencePoint?: string | null;
  zipCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  city: City;
}

export interface InitialCenter {
  latitude: number;
  longitude: number;
  source: 'user_address' | 'device_location' | 'fallback';
  address?: string; // Endereço formatado (se disponível)
}

// Fallback para Sobral (será substituído pelo location do dispositivo se disponível)
const FALLBACK_CENTER: InitialCenter = {
  latitude: -3.6880,
  longitude: -40.3497,
  source: 'fallback',
};

class UserAddressService {
  /**
   * Busca os endereços do usuário logado via GET /api/addresses/me
   */
  async getUserAddresses(): Promise<UserAddress[]> {
    try {
      console.log('📍 [UserAddressService] Buscando endereços do usuário...');
      const response = await apiClient.get<UserAddress[]>('/addresses/me');
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ [UserAddressService] Endereços recebidos:', response.data.length);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('❌ [UserAddressService] Erro ao buscar endereços:', error);
      return [];
    }
  }

  /**
   * Retorna o endereço padrão (isDefault: true) do usuário
   */
  getDefaultAddress(addresses: UserAddress[]): UserAddress | null {
    if (!addresses || addresses.length === 0) return null;
    
    // Busca o endereço com isDefault: true
    const defaultAddress = addresses.find(a => a.isDefault);
    if (defaultAddress) return defaultAddress;
    
    // Se não encontrar default, retorna o primeiro
    return addresses[0];
  }

  /**
   * Determina o centro inicial para o mapa baseado na seguinte prioridade:
   * 1. Endereço padrão (isDefault: true) do usuário - se tiver lat/lng
   * 2. Localização do dispositivo (passada como parâmetro)
   * 3. Fallback (Sobral)
   */
  async getInitialCenter(
    deviceLocation?: { latitude: number; longitude: number } | null
  ): Promise<InitialCenter> {
    try {
      // Busca endereços do usuário no backend
      const addresses = await this.getUserAddresses();
      
      if (addresses.length > 0) {
        // 1. Tenta usar o endereço padrão do usuário
        const defaultAddress = this.getDefaultAddress(addresses);
        if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
          const fullAddress = `${defaultAddress.street}, ${defaultAddress.number} - ${defaultAddress.neighborhood}, ${defaultAddress.city.name}/${defaultAddress.city.state}`;
          console.log('📍 [UserAddressService] Usando endereço padrão do usuário:', {
            address: fullAddress,
            lat: defaultAddress.latitude,
            lng: defaultAddress.longitude,
          });
          return {
            latitude: defaultAddress.latitude,
            longitude: defaultAddress.longitude,
            source: 'user_address',
            address: fullAddress,
          };
        }
      }
      
      // 2. Usa a localização do dispositivo se disponível
      if (deviceLocation && deviceLocation.latitude && deviceLocation.longitude) {
        console.log('📍 [UserAddressService] Usando localização do dispositivo:', deviceLocation);
        return {
          latitude: deviceLocation.latitude,
          longitude: deviceLocation.longitude,
          source: 'device_location',
        };
      }
      
      // 3. Fallback
      console.log('⚠️ [UserAddressService] Usando localização fallback (Sobral)');
      return FALLBACK_CENTER;
      
    } catch (error) {
      console.error('❌ [UserAddressService] Erro ao determinar centro inicial:', error);
      
      // Em caso de erro, ainda tenta usar device location
      if (deviceLocation && deviceLocation.latitude && deviceLocation.longitude) {
        return {
          latitude: deviceLocation.latitude,
          longitude: deviceLocation.longitude,
          source: 'device_location',
        };
      }
      
      return FALLBACK_CENTER;
    }
  }
}

export const userAddressService = new UserAddressService();
