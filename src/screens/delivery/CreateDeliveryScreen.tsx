import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  Dimensions,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { deliveryService } from "../../services/deliveryService";
import { authService } from "../../services/authService";
import ENV from "../../config/env";

const { width, height } = Dimensions.get("window");

interface CreateDeliveryScreenProps {
  onBack: () => void;
  onSuccess?: (delivery: any) => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

type AddressType = "from" | "to";

export default function CreateDeliveryScreen({
  onBack,
  onSuccess,
}: CreateDeliveryScreenProps) {
  // Estados do formulário
  const [loading, setLoading] = useState(false);
  const [itemDescription, setItemDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  
  // Estados de localização
  const [fromLocation, setFromLocation] = useState<SelectedLocation | null>(null);
  const [toLocation, setToLocation] = useState<SelectedLocation | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  
  // Estados do modal de seleção de endereço
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<AddressType>("from");
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -3.7327,
    longitude: -38.5270,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedMarker, setSelectedMarker] = useState<{latitude: number; longitude: number} | null>(null);
  
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Busca previsões de endereço do Google Places
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setPredictions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${ENV.GOOGLE_MAPS_API_KEY}&language=pt-BR&components=country:br`
      );
      
      const data = await response.json();
      
      if (data.status === "OK") {
        setPredictions(data.predictions || []);
      } else {
        console.log("Google Places API error:", data.status);
        setPredictions([]);
      }
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
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

  // Busca detalhes do lugar selecionado (coordenadas)
  const getPlaceDetails = async (placeId: string): Promise<{lat: number; lng: number; address: string} | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${ENV.GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.result) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          address: data.result.formatted_address,
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar detalhes do lugar:", error);
      return null;
    }
  };

  // Busca endereço a partir de coordenadas (reverse geocoding)
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}&language=pt-BR`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.error("Erro no reverse geocoding:", error);
      return null;
    }
  };

  // Calcula distância entre dois pontos usando Google Directions API
  const calculateDistance = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Promise<number | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.routes && data.routes.length > 0) {
        const distanceMeters = data.routes[0].legs[0].distance.value;
        return distanceMeters / 1000; // Converte para km
      }
      return null;
    } catch (error) {
      console.error("Erro ao calcular distância:", error);
      return null;
    }
  };

  // Seleciona um endereço da lista de previsões
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setSearchLoading(true);
    
    const details = await getPlaceDetails(prediction.place_id);
    
    if (details) {
      const location: SelectedLocation = {
        address: details.address,
        latitude: details.lat,
        longitude: details.lng,
      };
      
      if (addressModalType === "from") {
        setFromLocation(location);
      } else {
        setToLocation(location);
      }
      
      // Anima o mapa para o local selecionado
      setSelectedMarker({ latitude: details.lat, longitude: details.lng });
      mapRef.current?.animateToRegion({
        latitude: details.lat,
        longitude: details.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
      
      setPredictions([]);
      setSearchQuery("");
    }
    
    setSearchLoading(false);
  };

  // Confirma seleção no mapa (toque longo ou marcador)
  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    setSelectedMarker({ latitude, longitude });
    
    // Busca endereço das coordenadas
    const address = await reverseGeocode(latitude, longitude);
    
    if (address) {
      const location: SelectedLocation = {
        address,
        latitude,
        longitude,
      };
      
      if (addressModalType === "from") {
        setFromLocation(location);
      } else {
        setToLocation(location);
      }
    }
  };

  // Confirma o endereço selecionado e fecha o modal
  const handleConfirmAddress = () => {
    const currentLocation = addressModalType === "from" ? fromLocation : toLocation;
    
    if (!currentLocation) {
      Alert.alert("Aviso", "Selecione um endereço antes de confirmar.");
      return;
    }
    
    setShowAddressModal(false);
    setSearchQuery("");
    setPredictions([]);
    setSelectedMarker(null);
  };

  // Abre modal para selecionar endereço
  const openAddressModal = (type: AddressType) => {
    setAddressModalType(type);
    setSearchQuery("");
    setPredictions([]);
    
    // Se já tem localização definida, centraliza nela
    const currentLocation = type === "from" ? fromLocation : toLocation;
    if (currentLocation) {
      setSelectedMarker({ latitude: currentLocation.latitude, longitude: currentLocation.longitude });
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      setSelectedMarker(null);
    }
    
    setShowAddressModal(true);
  };

  // Atualiza distância quando ambos os endereços estão definidos
  useEffect(() => {
    const updateDistance = async () => {
      if (fromLocation && toLocation) {
        const distance = await calculateDistance(
          { lat: fromLocation.latitude, lng: fromLocation.longitude },
          { lat: toLocation.latitude, lng: toLocation.longitude }
        );
        setDistanceKm(distance);
      } else {
        setDistanceKm(null);
      }
    };
    
    updateDistance();
  }, [fromLocation, toLocation]);

  // Formata número de telefone
  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Valida o formulário
  const validateForm = (): boolean => {
    if (!itemDescription.trim()) {
      Alert.alert("Erro", "Descrição do item é obrigatória");
      return false;
    }
    if (!recipientName.trim()) {
      Alert.alert("Erro", "Nome do destinatário é obrigatório");
      return false;
    }
    if (!recipientPhone.trim() || recipientPhone.replace(/\D/g, "").length < 10) {
      Alert.alert("Erro", "Telefone do destinatário é obrigatório (mínimo 10 dígitos)");
      return false;
    }
    if (!fromLocation) {
      Alert.alert("Erro", "Endereço de coleta é obrigatório");
      return false;
    }
    if (!toLocation) {
      Alert.alert("Erro", "Endereço de entrega é obrigatório");
      return false;
    }
    if (!totalAmount.trim() || isNaN(Number(totalAmount.replace(",", ".")))) {
      Alert.alert("Erro", "Valor total é obrigatório e deve ser um número");
      return false;
    }
    return true;
  };

  // Submete o formulário
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      
      if (!user || !user.id) {
        Alert.alert("Erro", "Usuário não autenticado");
        setLoading(false);
        return;
      }

      const deliveryData = {
        status: "PENDING",
        payments: [],
        client: user.id,
        itemDescription: itemDescription.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.replace(/\D/g, ""),
        fromAddress: fromLocation!.address,
        fromLatitude: fromLocation!.latitude,
        fromLongitude: fromLocation!.longitude,
        toAddress: toLocation!.address,
        toLatitude: toLocation!.latitude,
        toLongitude: toLocation!.longitude,
        totalAmount: totalAmount.replace(",", ".").trim(),
        distanceKm: distanceKm,
      };

      console.log("📦 Criando nova entrega:", deliveryData);
      
      const result = await deliveryService.createDelivery(deliveryData);

      if (result.success) {
        Alert.alert(
          "✅ Sucesso",
          "Entrega criada com sucesso! Um motoboy em breve irá aceitar sua solicitação.",
          [{ text: "OK", onPress: onBack }]
        );
        if (onSuccess && result.data) {
          onSuccess(result.data);
        }
      } else {
        Alert.alert("Erro", result.error || "Não foi possível criar a entrega");
      }
    } catch (error: any) {
      console.error("❌ Erro ao criar entrega:", error);
      Alert.alert("Erro", "Ocorreu um erro ao criar a entrega. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Renderiza item da lista de previsões
  const renderPredictionItem = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={styles.predictionItem}
      onPress={() => handleSelectPrediction(item)}
    >
      <Ionicons name="location-outline" size={20} color="#7c3aed" />
      <View style={styles.predictionTextContainer}>
        <Text style={styles.predictionMainText}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={styles.predictionSecondaryText}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Entrega</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Seção: Endereços */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Endereços</Text>
            
            {/* Endereço de Coleta */}
            <Text style={styles.label}>Local de Coleta *</Text>
            <TouchableOpacity
              style={[styles.addressButton, fromLocation && styles.addressButtonSelected]}
              onPress={() => openAddressModal("from")}
            >
              <Ionicons 
                name={fromLocation ? "checkmark-circle" : "location"} 
                size={24} 
                color={fromLocation ? "#10b981" : "#7c3aed"} 
              />
              <View style={styles.addressButtonText}>
                {fromLocation ? (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {fromLocation.address}
                  </Text>
                ) : (
                  <Text style={styles.addressPlaceholder}>
                    Toque para selecionar o endereço de coleta
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            {/* Endereço de Entrega */}
            <Text style={styles.label}>Local de Entrega *</Text>
            <TouchableOpacity
              style={[styles.addressButton, toLocation && styles.addressButtonSelected]}
              onPress={() => openAddressModal("to")}
            >
              <Ionicons 
                name={toLocation ? "checkmark-circle" : "flag"} 
                size={24} 
                color={toLocation ? "#10b981" : "#ef4444"} 
              />
              <View style={styles.addressButtonText}>
                {toLocation ? (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {toLocation.address}
                  </Text>
                ) : (
                  <Text style={styles.addressPlaceholder}>
                    Toque para selecionar o endereço de entrega
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Distância calculada */}
            {distanceKm !== null && (
              <View style={styles.distanceContainer}>
                <Ionicons name="car-outline" size={20} color="#6b7280" />
                <Text style={styles.distanceText}>
                  Distância estimada: {distanceKm.toFixed(2)} km
                </Text>
              </View>
            )}
          </View>

          {/* Seção: Informações do Item */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Informações do Item</Text>
            
            <Text style={styles.label}>Descrição do Item *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Caixa com documentos, Encomenda pequena..."
              placeholderTextColor="#9ca3af"
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
              maxLength={200}
            />
          </View>

          {/* Seção: Destinatário */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Destinatário</Text>
            
            <Text style={styles.label}>Nome do Destinatário *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#9ca3af"
              value={recipientName}
              onChangeText={setRecipientName}
              maxLength={100}
            />
            
            <Text style={styles.label}>Telefone do Destinatário *</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#9ca3af"
              value={recipientPhone}
              onChangeText={(text) => setRecipientPhone(formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {/* Seção: Valor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Valor</Text>
            
            <Text style={styles.label}>Valor Total (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#9ca3af"
              value={totalAmount}
              onChangeText={setTotalAmount}
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>

          {/* Botão de Enviar */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Criar Entrega</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Seleção de Endereço */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          {/* Header do Modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddressModal(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addressModalType === "from" ? "📍 Local de Coleta" : "🏁 Local de Entrega"}
            </Text>
            <TouchableOpacity
              onPress={handleConfirmAddress}
              style={styles.modalConfirmButton}
            >
              <Text style={styles.modalConfirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de Busca */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar endereço..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
            />
            {searchLoading && <ActivityIndicator size="small" color="#7c3aed" />}
            {searchQuery.length > 0 && !searchLoading && (
              <TouchableOpacity onPress={() => { setSearchQuery(""); setPredictions([]); }}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de Previsões */}
          {predictions.length > 0 && (
            <View style={styles.predictionsContainer}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={renderPredictionItem}
                keyboardShouldPersistTaps="handled"
                style={styles.predictionsList}
              />
            </View>
          )}

          {/* Mapa */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton
            >
              {selectedMarker && (
                <Marker
                  coordinate={selectedMarker}
                  draggable
                  onDragEnd={handleMapPress}
                >
                  <View style={[
                    styles.customMarker,
                    { backgroundColor: addressModalType === "from" ? "#7c3aed" : "#ef4444" }
                  ]}>
                    <Ionicons 
                      name={addressModalType === "from" ? "location" : "flag"} 
                      size={24} 
                      color="#fff" 
                    />
                  </View>
                </Marker>
              )}
            </MapView>

            {/* Dica de uso */}
            <View style={styles.mapHint}>
              <Ionicons name="information-circle" size={16} color="#6b7280" />
              <Text style={styles.mapHintText}>
                Toque no mapa ou arraste o marcador para ajustar a posição
              </Text>
            </View>
          </View>

          {/* Endereço Selecionado */}
          {(addressModalType === "from" ? fromLocation : toLocation) && (
            <View style={styles.selectedAddressContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.selectedAddressText} numberOfLines={2}>
                {(addressModalType === "from" ? fromLocation : toLocation)?.address}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    minHeight: 48,
  },
  addressButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    minHeight: 56,
  },
  addressButtonSelected: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  addressButtonText: {
    flex: 1,
    marginHorizontal: 12,
  },
  addressText: {
    fontSize: 14,
    color: "#1f2937",
  },
  addressPlaceholder: {
    fontSize: 14,
    color: "#9ca3af",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalBackButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#10b981",
    borderRadius: 6,
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    paddingVertical: 4,
  },
  predictionsContainer: {
    maxHeight: 200,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionsList: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  predictionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  predictionMainText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  customMarker: {
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapHint: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  mapHintText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
  },
  selectedAddressContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10b981",
    gap: 8,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
});
