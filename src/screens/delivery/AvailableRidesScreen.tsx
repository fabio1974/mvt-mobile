import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { deliveryService } from "../../services/deliveryService";
import { unifiedLocationService } from "../../services/unifiedLocationService";

interface AvailableRidesScreenProps {
  onRideSelect: (deliveryId: string) => void;
  onBack: () => void;
}

interface DeliveryItem {
  id: string;
  [key: string]: any; // Dinâmico baseado na metadata
}

interface DeliveryEntity {
  id?: string;
  [key: string]: any;
}

export default function AvailableRidesScreen({
  onRideSelect,
  onBack,
}: AvailableRidesScreenProps) {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([getCurrentLocation(), loadAvailableDeliveries()]);
    setLoading(false);
  };

  const getCurrentLocation = async () => {
    try {
      const location = await unifiedLocationService.getCurrentLocation();
      if (location) {
        setUserLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        console.log("📍 Localização atual:", location);
      }
    } catch (error) {
      console.error("❌ Erro ao obter localização:", error);
    }
  };

  const loadAvailableDeliveries = async () => {
    try {
      console.log("🔍 Carregando entregas disponíveis...");

      const response = await deliveryService.getAvailableDeliveries(
        userLocation?.latitude,
        userLocation?.longitude,
        5000 // 5km de raio
      );

      if (response.success && Array.isArray(response.data)) {
        // Filtra apenas entregas que têm ID
        const validDeliveries = response.data.filter(
          (delivery: any) => delivery.id
        );
        setDeliveries(validDeliveries);
        console.log(`✅ ${validDeliveries.length} entregas carregadas`);
      } else {
        console.log("⚠️ Nenhuma entrega disponível");
        setDeliveries([]);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar entregas:", error);
      Alert.alert(
        "Erro",
        "Não foi possível carregar as entregas disponíveis. Tente novamente."
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableDeliveries();
    setRefreshing(false);
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      console.log(`✋ Tentando aceitar entrega ${deliveryId}...`);

      const response = await deliveryService.acceptDelivery(deliveryId);

      if (response.success) {
        Alert.alert(
          "Sucesso!",
          response.message || "Entrega aceita com sucesso!",
          [
            {
              text: "OK",
              onPress: () => {
                // Remove da lista e navega para detalhes
                setDeliveries((prev) =>
                  prev.filter((d) => d.id !== deliveryId)
                );
                onRideSelect(deliveryId);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Erro",
          response.error || "Não foi possível aceitar a entrega"
        );
      }
    } catch (error) {
      console.error("❌ Erro ao aceitar entrega:", error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    }
  };

  const confirmAcceptDelivery = (deliveryId: string, deliveryData: any) => {
    const clientName = getDeliveryClientName(deliveryData);
    const value = getDeliveryValue(deliveryData);
    const address = getDeliveryAddress(deliveryData);

    Alert.alert(
      "Aceitar Entrega",
      `Deseja aceitar esta entrega?\n\n` +
        `Cliente: ${clientName}\n` +
        `Valor: ${value}\n` +
        `Endereço: ${address}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          style: "default",
          onPress: () => handleAcceptDelivery(deliveryId),
        },
      ]
    );
  };

  // Funções helpers para extrair dados da entrega (baseado na metadata)
  const getDeliveryClientName = (delivery: any): string => {
    // Busca campos que podem conter nome do cliente
    return (
      delivery.clientName ||
      delivery.customerName ||
      delivery.userName ||
      delivery.client?.name ||
      delivery.user?.name ||
      "Cliente não informado"
    );
  };

  const getDeliveryValue = (delivery: any): string => {
    // Busca campos que podem conter valor
    const value =
      delivery.totalAmount ||
      delivery.value ||
      delivery.price ||
      delivery.amount ||
      delivery.total ||
      0;

    return typeof value === "number"
      ? `R$ ${value.toFixed(2).replace(".", ",")}`
      : `R$ ${value}`;
  };

  const getDeliveryAddress = (delivery: any): string => {
    // Busca campos que podem conter endereço de destino
    return (
      delivery.toAddress ||
      delivery.address ||
      delivery.deliveryAddress ||
      delivery.destination ||
      delivery.location ||
      "Endereço não informado"
    );
  };

  const getDeliveryDistance = (delivery: any): string => {
    // Se tiver coordenadas, calcula distância usando coordenadas de destino
    const lat =
      delivery.toLatitude || delivery.latitude || delivery.deliveryLatitude;
    const lng =
      delivery.toLongitude || delivery.longitude || delivery.deliveryLongitude;

    if (userLocation && lat && lng) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lng
      );
      return `${distance.toFixed(1)} km`;
    }
    return "-";
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const renderDeliveryItem = ({ item }: { item: DeliveryItem }) => {
    const clientName = getDeliveryClientName(item);
    const value = getDeliveryValue(item);
    const address = getDeliveryAddress(item);
    const distance = getDeliveryDistance(item);
    const status = item.status || "Disponível";

    return (
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryInfo}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.deliveryValue}>{value}</Text>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>{distance}</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>📍 Endereço:</Text>
          <Text style={styles.address}>{address}</Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onRideSelect(item.id)}
          >
            <Text style={styles.viewButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => confirmAcceptDelivery(item.id, item)}
          >
            <Text style={styles.acceptButtonText}>Aceitar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Carregando entregas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Entregas Disponíveis</Text>
          <Text style={styles.headerSubtitle}>
            {deliveries.length} entrega{deliveries.length !== 1 ? "s" : ""}{" "}
            próxima{deliveries.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Lista de entregas */}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#e94560"]}
            tintColor="#e94560"
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Nenhuma entrega disponível</Text>
            <Text style={styles.emptySubtitle}>
              Puxe para baixo para atualizar ou aguarde novas entregas chegarem
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  listContainer: {
    padding: 20,
  },
  deliveryCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#262640",
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  distanceContainer: {
    alignItems: "flex-end",
  },
  distance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  status: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  addressContainer: {
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: "#ffffff",
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#e94560",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
