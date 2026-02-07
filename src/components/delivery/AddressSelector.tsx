import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ENV from '../../config/env';
import AddressConfirmationModal from './AddressConfirmationModal';

// ============================================
// CONSTANTES ENCAPSULADAS (não expostas via props)
// ============================================
const THEME = {
  primary: '#7c3aed',
  success: '#10b981',
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  textPrimary: '#fff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// Zoom inicial do mapa (quanto menor o delta, mais zoom)
// Zoom 18 ≈ latitudeDelta 0.001
const INITIAL_ZOOM = {
  latitudeDelta: 0.001,
  longitudeDelta: 0.001,
};

const LABELS = {
  searchPlaceholder: 'Buscar endereço...',
  addressIcon: 'home-outline' as const,
  addressLabel: 'Endereço (edite abaixo se necessário):',
  addressHint: '💡 O número pode não aparecer no Google. Ajuste manualmente se precisar.',
  confirmButton: 'Confirmar este local',
  confirmedBadge: 'Local confirmado!',
  mapHint: '👆 Mova o mapa para posicionar o marcador no local desejado',
  loadingText: 'Carregando mapa...',
};

// ============================================
// TIPOS
// ============================================
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface AddressData {
  address: string;
  latitude: number | null;
  longitude: number | null;
  confirmed?: boolean;
}

interface AddressSelectorProps {
  // Títulos customizáveis
  title: string;
  confirmModalTitle: string;
  
  // Estado do endereço
  address: string;
  latitude: number | null;
  longitude: number | null;
  isConfirmed?: boolean;
  
  // Centro inicial do mapa (abstrai GPS)
  initialCenter: { latitude: number; longitude: number };
  
  // Callbacks
  onUpdate: (data: AddressData) => void;
  onConfirmAndAdvance?: () => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function AddressSelector({
  title,
  confirmModalTitle,
  address,
  latitude,
  longitude,
  isConfirmed = false,
  initialCenter,
  onUpdate,
  onConfirmAndAdvance,
}: AddressSelectorProps) {
  const insets = useSafeAreaInsets();
  
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{latitude: number; longitude: number} | null>(
    latitude && longitude ? { latitude, longitude } : initialCenter
  );
  const [currentAddress, setCurrentAddress] = useState(address);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAddressInputFocused, setIsAddressInputFocused] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(18); // DEBUG: zoom level
  // Flag: o usuário editou manualmente o texto do endereço (só via digitação)
  const [isAddressManuallyEdited, setIsAddressManuallyEdited] = useState(false);
  // Centro do mapa para o Marker - atualiza em tempo real
  const [mapCenter, setMapCenter] = useState(
    latitude && longitude ? { latitude, longitude } : initialCenter
  );

  // Refs
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  // Ref para saber se o usuário editou manualmente o texto (evita closure stale)
  const isAddressManuallyEditedRef = useRef(false);
  // Ref para pular as primeiras geocodificações da montagem (quando já tem endereço)
  const skipInitialGeocodeRef = useRef(!!(address && address.length > 0));

  // ============================================
  // EFEITOS
  // ============================================
  
  // Sincroniza a ref com o estado
  useEffect(() => {
    isAddressManuallyEditedRef.current = isAddressManuallyEdited;
  }, [isAddressManuallyEdited]);
  
  // Busca o endereço inicial APENAS quando não tiver endereço
  useEffect(() => {
    const initializeAddress = async () => {
      // Só executa uma vez
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      
      // Se já tem endereço, NÃO faz nada - preserva o estado existente
      if (address && address.length > 0) {
        console.log('📍 [AddressSelector] Endereço já existe, preservando:', address);
        return;
      }
      
      // Só busca endereço inicial se não tiver nenhum
      console.log('📍 [AddressSelector] Buscando endereço inicial para:', initialCenter);
      const addr = await reverseGeocode(initialCenter.latitude, initialCenter.longitude);
      if (addr) {
        console.log('✅ [AddressSelector] Endereço inicial encontrado:', addr);
        setCurrentAddress(addr);
        setSelectedMarker(initialCenter);
        onUpdate({
          address: addr,
          latitude: initialCenter.latitude,
          longitude: initialCenter.longitude,
          confirmed: false,
        });
      }
    };
    
    initializeAddress();
  }, []); // Removido dependências para executar apenas na montagem
  
  // Listener do teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  // Mapa de números para texto por extenso
  const numberToText: { [key: string]: string } = {
    '0': 'zero', '1': 'um', '2': 'dois', '3': 'três', '4': 'quatro',
    '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
    '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
    '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito', '19': 'dezenove',
    '20': 'vinte', '21': 'vinte e um', '22': 'vinte e dois', '23': 'vinte e três',
    '24': 'vinte e quatro', '25': 'vinte e cinco', '26': 'vinte e seis',
    '27': 'vinte e sete', '28': 'vinte e oito', '29': 'vinte e nove',
    '30': 'trinta', '31': 'trinta e um', '32': 'trinta e dois', '33': 'trinta e três',
    '34': 'trinta e quatro', '35': 'trinta e cinco', '36': 'trinta e seis',
    '37': 'trinta e sete', '38': 'trinta e oito', '39': 'trinta e nove',
    '40': 'quarenta', '50': 'cinquenta', '60': 'sessenta', '70': 'setenta',
    '80': 'oitenta', '90': 'noventa', '100': 'cem',
  };

  // Mapa inverso: texto para número
  const textToNumber: { [key: string]: string } = {};
  Object.entries(numberToText).forEach(([num, text]) => {
    textToNumber[text.toLowerCase()] = num;
  });

  // Converte números na query para texto por extenso
  const expandQueryWithTextNumbers = (query: string): string | null => {
    const numberRegex = /\b(\d{1,3})\b/g;
    let match;
    let expandedQuery = query;
    let hasNumber = false;
    
    while ((match = numberRegex.exec(query)) !== null) {
      const num = match[1];
      if (numberToText[num]) {
        hasNumber = true;
        expandedQuery = expandedQuery.replace(new RegExp(`\\b${num}\\b`), numberToText[num]);
      }
    }
    
    return hasNumber ? expandedQuery : null;
  };

  // Converte texto por extenso na query para números
  const expandQueryWithNumbers = (query: string): string | null => {
    const lowerQuery = query.toLowerCase();
    let expandedQuery = query;
    let hasText = false;
    
    // Ordena por tamanho decrescente para pegar "trinta e um" antes de "um"
    const sortedTexts = Object.keys(textToNumber).sort((a, b) => b.length - a.length);
    
    for (const text of sortedTexts) {
      if (lowerQuery.includes(text)) {
        hasText = true;
        expandedQuery = expandedQuery.replace(new RegExp(text, 'gi'), textToNumber[text]);
        break; // Só substitui o primeiro encontrado
      }
    }
    
    return hasText ? expandedQuery : null;
  };

  // Calcula a região inicial do mapa
  const getInitialRegion = (): Region => {
    if (latitude && longitude) {
      return {
        latitude,
        longitude,
        ...INITIAL_ZOOM,
      };
    }
    return {
      latitude: initialCenter.latitude,
      longitude: initialCenter.longitude,
      ...INITIAL_ZOOM,
    };
  };

  // Reverse geocoding
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}&language=pt-BR`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      return null;
    }
  };

  // Busca previsões de endereço do Google Places
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setPredictions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Prepara as queries (original + expandida)
      const queries = [query];
      const expandedText = expandQueryWithTextNumbers(query);
      const expandedNumber = expandQueryWithNumbers(query);
      
      if (expandedText) queries.push(expandedText);
      if (expandedNumber) queries.push(expandedNumber);
      
      // Faz todas as buscas em paralelo
      const allResults = await Promise.all(
        queries.map(async (q) => {
          let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            q
          )}&key=${ENV.GOOGLE_MAPS_API_KEY}&language=pt-BR&components=country:br`;
          
          // Usa o centro como referência para busca
          url += `&location=${initialCenter.latitude},${initialCenter.longitude}&radius=20000`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.status === 'OK') {
            return data.predictions || [];
          }
          return [];
        })
      );
      
      // Combina resultados e remove duplicados por place_id
      const seenIds = new Set<string>();
      const combinedResults: PlacePrediction[] = [];
      
      for (const results of allResults) {
        for (const prediction of results) {
          if (!seenIds.has(prediction.place_id)) {
            seenIds.add(prediction.place_id);
            combinedResults.push(prediction);
          }
        }
      }
      
      setPredictions(combinedResults.slice(0, 8)); // Limita a 8 resultados
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setPredictions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounce da busca
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 500);
  };

  // Busca detalhes do lugar
  const getPlaceDetails = async (placeId: string): Promise<{lat: number; lng: number; address: string} | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${ENV.GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          address: data.result.formatted_address,
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar detalhes do lugar:', error);
      return null;
    }
  };

  // Seleciona endereço da lista
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setSearchLoading(true);
    setPredictions([]);
    setSearchQuery('');
    
    const details = await getPlaceDetails(prediction.place_id);
    
    if (details) {
      setCurrentAddress(details.address);
      setSelectedMarker({ latitude: details.lat, longitude: details.lng });
      // Reseta o flag pois o usuário escolheu um endereço do Google
      setIsAddressManuallyEdited(false);
      
      onUpdate({
        address: details.address,
        latitude: details.lat,
        longitude: details.lng,
        confirmed: false,
      });
      
      // Anima o mapa para o local selecionado (mantém zoom 16)
      mapRef.current?.animateToRegion({
        latitude: details.lat,
        longitude: details.lng,
        ...INITIAL_ZOOM,
      }, 500);
    }
    
    setSearchLoading(false);
  };

  // Quando o mapa para de se mover, atualiza a posição
  const handleRegionChangeComplete = async (region: Region) => {
    const { latitude, longitude, latitudeDelta } = region;
    
    // Atualiza o centro do mapa para o Marker
    setMapCenter({ latitude, longitude });
    setIsMapMoving(false);
    
    // DEBUG: Calcula zoom aproximado a partir do latitudeDelta
    const zoom = Math.round(Math.log2(360 / latitudeDelta));
    setCurrentZoom(zoom);
    
    setSelectedMarker({ latitude, longitude });
    
    // Pula a(s) primeira(s) geocodificação(ões) da montagem se já tem endereço pré-preenchido
    if (skipInitialGeocodeRef.current) {
      skipInitialGeocodeRef.current = false;
      onUpdate({
        address: currentAddress,
        latitude: latitude,
        longitude: longitude,
        confirmed: false,
      });
      return;
    }
    
    // Se o usuário editou manualmente o texto, preserva o endereço
    if (isAddressManuallyEditedRef.current) {
      onUpdate({
        address: currentAddress,
        latitude: latitude,
        longitude: longitude,
        confirmed: false,
      });
    } else {
      // Busca endereço via Google reverseGeocode
      const addr = await reverseGeocode(latitude, longitude);
      if (addr) {
        setCurrentAddress(addr);
        onUpdate({
          address: addr,
          latitude: latitude,
          longitude: longitude,
          confirmed: false,
        });
      }
    }
  };

  // Confirma o endereço
  const handleConfirm = () => {
    onUpdate({
      address: currentAddress,
      latitude: selectedMarker?.latitude || null,
      longitude: selectedMarker?.longitude || null,
      confirmed: true,
    });
    setShowConfirmModal(false);
    if (onConfirmAndAdvance) {
      setTimeout(() => onConfirmAndAdvance(), 100);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <View style={styles.container}>
      {/* Header - esconde quando maximizado */}
      {!isMapMaximized && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      {/* Área principal com Mapa e Busca overlay - esconde quando editando endereço */}
      {!(isKeyboardVisible && isAddressInputFocused) && (
        <View style={[
          styles.mainContent, 
          { marginBottom: 4 },
          isMapMaximized && [styles.mainContentMaximized, { bottom: insets.bottom, marginBottom: 0 }]
        ]}>
        {/* Mapa */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            mapType={mapType}
            initialRegion={getInitialRegion()}
            onRegionChange={(region) => {
              if (!isConfirmed) {
                setIsMapMoving(true);
                setMapCenter({ latitude: region.latitude, longitude: region.longitude });
              }
            }}
            onRegionChangeComplete={isConfirmed ? undefined : handleRegionChangeComplete}
            onMapReady={() => {
              setMapReady(true);
              // Garante o zoom correto após o mapa estar pronto
              setTimeout(() => {
                const region = getInitialRegion();
                mapRef.current?.animateToRegion(region, 300);
                // Atualiza o indicador de zoom
                const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
                setCurrentZoom(zoom);
              }, 100);
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            minZoomLevel={14}
            maxZoomLevel={21}
            scrollEnabled={!isConfirmed}
            zoomEnabled={!isConfirmed}
            rotateEnabled={!isConfirmed}
            pitchEnabled={!isConfirmed}
          />

          {/* Bullet fixo no centro do mapa - sempre visível */}
          <View style={styles.centerMarkerOverlay} pointerEvents="none">
            <View style={[styles.redBulletCenter, isMapMoving && styles.redBulletMoving]} />
          </View>

          {/* Botão de Maximizar/Minimizar */}
          <TouchableOpacity
            style={styles.maximizeButton}
            onPress={() => setIsMapMaximized(!isMapMaximized)}
          >
            <Ionicons
              name={isMapMaximized ? 'contract' : 'expand'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Botão de Satélite */}
          <TouchableOpacity
            style={styles.satelliteButton}
            onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}
          >
            <Ionicons
              name={mapType === 'standard' ? 'globe-outline' : 'map-outline'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          {/* DEBUG: Indicador de Zoom */}
          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomIndicatorText}>Z: {currentZoom}</Text>
          </View>
        </View>

        {/* Barra de Busca flutuante sobre o mapa - esconde quando confirmado */}
        {!isConfirmed && (
          <View style={styles.searchOverlay}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder={LABELS.searchPlaceholder}
                placeholderTextColor={THEME.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchLoading && <ActivityIndicator size="small" color={THEME.primary} />}
              {searchQuery.length > 0 && !searchLoading && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de Previsões */}
            {predictions.length > 0 && (
              <View style={styles.predictionsContainer}>
                <ScrollView 
                  style={styles.predictionsScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {predictions.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      style={styles.predictionItem}
                      onPress={() => handleSelectPrediction(item)}
                    >
                      <Ionicons name="location-outline" size={20} color={THEME.primary} />
                      <View style={styles.predictionTextContainer}>
                        <Text style={styles.predictionMainText}>{item.structured_formatting?.main_text || ''}</Text>
                        <Text style={styles.predictionSecondaryText}>{item.structured_formatting?.secondary_text || ''}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Dica de uso no canto inferior - esconde quando confirmado */}
        {!isKeyboardVisible && !isConfirmed && (
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>{LABELS.mapHint}</Text>
          </View>
        )}
      </View>
      )}

      {/* Endereço Editável */}
      {currentAddress && !isMapMaximized && predictions.length === 0 && !isSearchFocused && (
        <View style={[styles.addressEditContainer, { marginBottom: isConfirmed ? Math.max(insets.bottom, 8) : 0 }]}>
          <View style={styles.addressEditHeader}>
            <Ionicons name={LABELS.addressIcon} size={18} color={THEME.success} />
            <Text style={styles.addressEditLabel}>
              {isConfirmed ? 'Endereço confirmado:' : LABELS.addressLabel}
            </Text>
          </View>
          <TextInput
            style={[styles.addressEditInput, isConfirmed && styles.addressEditInputDisabled]}
            value={currentAddress}
            onChangeText={(text) => {
              if (isConfirmed) return;
              setCurrentAddress(text);
              // Marca que o endereço foi editado manualmente
              setIsAddressManuallyEdited(true);
              if (selectedMarker) {
                onUpdate({
                  address: text,
                  latitude: selectedMarker.latitude,
                  longitude: selectedMarker.longitude,
                  confirmed: false,
                });
              }
            }}
            placeholder="Digite ou ajuste o endereço..."
            placeholderTextColor={THEME.textMuted}
            multiline
            numberOfLines={2}
            editable={!isConfirmed}
            onFocus={() => setIsAddressInputFocused(true)}
            onBlur={() => setIsAddressInputFocused(false)}
          />
        </View>
      )}

      {/* Botão de Confirmar Local */}
      {currentAddress && !isMapMaximized && predictions.length === 0 && !isConfirmed && !isSearchFocused && (
        <TouchableOpacity
          style={[styles.confirmButton, { marginBottom: Math.max(insets.bottom + 16, 24) }]}
          onPress={() => setShowConfirmModal(true)}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.confirmButtonText}>{LABELS.confirmButton}</Text>
        </TouchableOpacity>
      )}

      {/* Botao de Editar (quando confirmado) */}
      {isConfirmed && !isMapMaximized && !isSearchFocused && (
        <TouchableOpacity 
          style={[styles.changeButton, { marginBottom: Math.max(insets.bottom + 16, 24) }]}
          onPress={() => {
            // Anima o mapa para zoom 16
            if (mapRef.current && selectedMarker) {
              mapRef.current.animateToRegion({
                latitude: selectedMarker.latitude,
                longitude: selectedMarker.longitude,
                ...INITIAL_ZOOM,
              }, 300);
            }
            onUpdate({
              address: currentAddress,
              latitude: selectedMarker?.latitude || null,
              longitude: selectedMarker?.longitude || null,
              confirmed: false,
            });
          }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.changeButtonText}>Editar Endereço</Text>
        </TouchableOpacity>
      )}

      {/* Modal de Confirmação */}
      <AddressConfirmationModal
        visible={showConfirmModal}
        title={confirmModalTitle}
        markerColor={THEME.primary}
        selectedMarker={selectedMarker}
        currentAddress={currentAddress}
        onConfirm={handleConfirm}
        onAdjust={() => setShowConfirmModal(false)}
        onClose={() => setShowConfirmModal(false)}
      />
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainContentMaximized: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    zIndex: 1000,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  maximizeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  satelliteButton: {
    position: 'absolute',
    bottom: 64,
    right: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 116,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  zoomIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerMarkerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  redBulletCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  redBulletMoving: {
    transform: [{ scale: 1.3 }],
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  customMarkerMoving: {
    marginBottom: 76,
  },
  markerShadow: {
    position: 'absolute',
    bottom: '50%',
    marginBottom: -8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  searchOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 100,
    elevation: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.textPrimary,
  },
  predictionsContainer: {
    backgroundColor: THEME.surface,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.primary,
    overflow: 'hidden',
    maxHeight: 250,
  },
  predictionsScroll: {
    flexGrow: 0,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
    backgroundColor: THEME.surface,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 2,
  },
  predictionSecondaryText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  mapHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHintText: {
    fontSize: 11,
    color: '#1f2937',
    flex: 1,
  },
  addressEditContainer: {
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  addressEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressEditLabel: {
    fontSize: 13,
    color: THEME.success,
    fontWeight: '500',
  },
  addressEditInput: {
    backgroundColor: THEME.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: THEME.textPrimary,
    borderWidth: 1,
    borderColor: '#475569',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  addressEditInputDisabled: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderColor: THEME.success,
    color: THEME.textSecondary,
  },
  addressEditHint: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: THEME.primary,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  changeButton: {
    backgroundColor: THEME.primary,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changeButtonText: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.success,
  },
  confirmedBadgeText: {
    color: THEME.success,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  confirmedChangeText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
