import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { apiClient } from '../services/api';
import AddressSelector, { AddressData } from '../components/delivery/AddressSelector';

interface DefaultAddressScreenProps {
  userId: string;
  onBack: () => void;
  onMenuOpen: () => void;
}

interface City {
  id: number;
  name: string;
  state: string;
}

interface AddressResponse {
  id?: number;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  referencePoint?: string | null;
  zipCode?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  city: City;
}

// Fallback para Sobral (caso nao consiga localizacao)
const FALLBACK_CENTER = {
  latitude: -3.6880,
  longitude: -40.3497,
};

const DefaultAddressScreen: React.FC<DefaultAddressScreenProps> = ({
  userId,
  onBack,
  onMenuOpen,
}) => {
  const insets = useSafeAreaInsets();

  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Estado do endereco (para o AddressSelector)
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Centro inicial do mapa
  const [initialCenter, setInitialCenter] = useState(FALLBACK_CENTER);
  const [centerReady, setCenterReady] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);
      
      // 1. Tenta carregar endereco padrao existente
      const existingAddress = await loadDefaultAddress();
      
      if (existingAddress) {
        // Usa o endereco existente como centro
        setInitialCenter({
          latitude: existingAddress.latitude,
          longitude: existingAddress.longitude,
        });
        setCenterReady(true);
      } else {
        // 2. Se nao tem endereco, tenta pegar localizacao do dispositivo
        await initializeFromDeviceLocation();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultAddress = async (): Promise<AddressResponse | null> => {
    try {
      const response = await apiClient.get('/addresses/me/default');

      if (response.data) {
        const addr: AddressResponse = response.data;
        
        // Monta o endereco formatado
        const formattedAddress = formatAddressFromResponse(addr);
        
        setAddress(formattedAddress);
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);
        setIsConfirmed(true); // Endereco existente ja esta confirmado
        setHasExistingAddress(true);
        
        return addr;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Usuario sem endereco padrao cadastrado');
        setHasExistingAddress(false);
      } else {
        console.error('Erro ao carregar endereco padrao:', error);
      }
      return null;
    }
  };

  const formatAddressFromResponse = (addr: AddressResponse): string => {
    const parts = [];
    
    if (addr.street) parts.push(addr.street);
    if (addr.number) parts.push(addr.number);
    if (addr.neighborhood) parts.push('- ' + addr.neighborhood);
    if (addr.city) parts.push(addr.city.name + ' - ' + addr.city.state);
    
    return parts.join(', ').replace(', -', ' -');
  };

  // Busca cidade pelo nome (extraido do endereco do Google)
  const searchCityByName = async (cityName: string, stateName?: string): Promise<number | null> => {
    try {
      // Limpa o nome da cidade (remove acentos e normaliza)
      const cleanCityName = cityName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      
      console.log('Buscando cidade:', cleanCityName, stateName);
      
      const response = await apiClient.get('/cities/search', {
        params: { q: cleanCityName }
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Se temos o estado, filtra pelo estado
        if (stateName) {
          const stateAbbr = getStateAbbreviation(stateName);
          const cityWithState = response.data.find((c: City) => 
            c.state.toUpperCase() === stateAbbr.toUpperCase()
          );
          if (cityWithState) {
            console.log('Cidade encontrada com estado:', cityWithState);
            return cityWithState.id;
          }
        }
        // Se nao tem estado ou nao encontrou, retorna a primeira
        console.log('Cidade encontrada:', response.data[0]);
        return response.data[0].id;
      }
      
      console.log('Cidade nao encontrada');
      return null;
    } catch (error: any) {
      console.error('Erro ao buscar cidade:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      throw error; // Propaga o erro para tratamento
    }
  };

  // Converte nome do estado para abreviacao
  const getStateAbbreviation = (stateName: string): string => {
    const states: { [key: string]: string } = {
      'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM',
      'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
      'goias': 'GO', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
      'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
      'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
      'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
      'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
    };
    
    const normalized = stateName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    // Se ja e uma abreviacao, retorna diretamente
    if (normalized.length === 2) {
      return normalized.toUpperCase();
    }
    
    return states[normalized] || stateName.toUpperCase();
  };

  const initializeFromDeviceLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setInitialCenter({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Usando localizacao fallback');
    } finally {
      setCenterReady(true);
    }
  };

  const handleAddressUpdate = (data: AddressData) => {
    setAddress(data.address);
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setIsConfirmed(data.confirmed || false);
  };

  const handleConfirmAndSave = async () => {
    // Valida se tem localizacao
    if (!latitude || !longitude) {
      Alert.alert('Atencao', 'Por favor, selecione um local no mapa.');
      return;
    }

    if (!address) {
      Alert.alert('Atencao', 'Por favor, selecione ou busque um endereco.');
      return;
    }

    // Marca como confirmado
    setIsConfirmed(true);
    
    // Salva no backend
    await saveAddress();
  };

  const saveAddress = async () => {
    try {
      setSaving(true);

      // Extrai informacoes do endereco formatado
      const addressParts = parseGoogleAddress(address);

      // Busca o ID da cidade pelo nome
      if (!addressParts.city) {
        Alert.alert('Erro', 'Nao foi possivel extrair a cidade do endereco. Por favor, selecione um endereco completo.');
        return;
      }

      const cityId = await searchCityByName(addressParts.city, addressParts.state);
      
      if (!cityId) {
        Alert.alert('Erro', `Cidade "${addressParts.city}" nao encontrada no sistema. Entre em contato com o suporte.`);
        return;
      }

      console.log('Cidade encontrada - ID:', cityId, 'Nome:', addressParts.city);

      const payload: any = {
        street: addressParts.street,
        number: addressParts.number || 'S/N',
        neighborhood: addressParts.neighborhood || 'Centro',
        latitude: latitude,
        longitude: longitude,
        cityId: cityId,
      };

      // Campos opcionais
      if (addressParts.complement) {
        payload.complement = addressParts.complement;
      }

      console.log('Salvando endereco:', payload);

      if (hasExistingAddress) {
        await apiClient.put('/addresses/me/default', payload);
      } else {
        await apiClient.post('/addresses/me/default', payload);
        setHasExistingAddress(true);
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao salvar endereco:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Nao foi possivel salvar o endereco. Tente novamente.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Parser simples para extrair partes do endereco do Google
  const parseGoogleAddress = (fullAddress: string): {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city?: string;
    state?: string;
  } => {
    const parts = fullAddress.split(',').map(p => p.trim());
    
    let street = '';
    let number = '';
    let neighborhood = '';
    let city = '';
    let state = '';

    if (parts.length >= 1) {
      const firstPart = parts[0];
      const numberMatch = firstPart.match(/^(.+?),?\s*(\d+[A-Za-z]?)$/);
      
      if (numberMatch) {
        street = numberMatch[1].trim();
        number = numberMatch[2];
      } else {
        street = firstPart;
      }
    }

    if (parts.length >= 2) {
      const secondPart = parts[1];
      
      if (/^\d+/.test(secondPart)) {
        const dashIndex = secondPart.indexOf('-');
        if (dashIndex > -1) {
          number = secondPart.substring(0, dashIndex).trim();
          neighborhood = secondPart.substring(dashIndex + 1).trim();
        } else {
          number = secondPart.trim();
        }
      } else if (secondPart.includes('-')) {
        const dashParts = secondPart.split('-').map(p => p.trim());
        neighborhood = dashParts[0];
      } else {
        neighborhood = secondPart;
      }
    }

    if (parts.length >= 3) {
      const thirdPart = parts[2];
      if (thirdPart.includes('-')) {
        const cityState = thirdPart.split('-').map(p => p.trim());
        city = cityState[0];
        state = cityState[1] || '';
      } else {
        city = thirdPart;
      }
    }

    return {
      street: street || fullAddress.split(',')[0] || 'Endereco',
      number: number || 'S/N',
      neighborhood: neighborhood || 'Centro',
      city,
      state,
    };
  };

  if (loading || !centerReady) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Endereco</Text>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuOpen}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* AddressSelector */}
      <View style={[styles.selectorContainer, { paddingBottom: insets.bottom }]}>
        <AddressSelector
          title="Meu Endereco"
          confirmModalTitle="Confirmar Endereco"
          address={address}
          latitude={latitude}
          longitude={longitude}
          isConfirmed={isConfirmed}
          initialCenter={initialCenter}
          onUpdate={handleAddressUpdate}
          onConfirmAndAdvance={handleConfirmAndSave}
        />
      </View>

      {/* Modal de Sucesso */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Sucesso!</Text>
            <Text style={styles.successMessage}>
              Seu endereco padrao foi {hasExistingAddress ? 'atualizado' : 'salvo'} com sucesso.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                onBack();
              }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f23',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  selectorContainer: {
    flex: 1,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DefaultAddressScreen;
