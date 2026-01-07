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
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deliveryService } from "../../services/deliveryService";
import { deliveryPollingService } from "../../services/deliveryPollingService";
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

const statusConfig = {
  PENDING: { color: '#fbbf24', icon: '⏳', label: 'Aguardando' },
  ACCEPTED: { color: '#3b82f6', icon: '✅', label: 'Aceita' },
  PICKED_UP: { color: '#8b5cf6', icon: '📦', label: 'Coletada' },
  IN_TRANSIT: { color: '#06b6d4', icon: '🚚', label: 'Em Trânsito' },
  COMPLETED: { color: '#10b981', icon: '✔️', label: 'Concluída' },
  CANCELLED: { color: '#ef4444', icon: '❌', label: 'Cancelada' }
};

export default function AvailableRidesScreen({
  onRideSelect,
  onBack,
}: AvailableRidesScreenProps) {
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [selectedTab]); // Recarrega ao mudar aba

  // Verifica se há delivery ativa ao montar e quando muda a tab
  useEffect(() => {
    checkActiveDelivery();
  }, [selectedTab]);

  const checkActiveDelivery = async () => {
    const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
    setHasActiveDelivery(hasAccepted);
    console.log(`🔍 [AvailableRidesScreen] Delivery ativa detectada: ${hasAccepted}`);
  };

  const loadInitialData = async () => {
    setLoading(true);
    await getCurrentLocation();
    await loadDeliveries();
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

  /**
   * Carrega entregas baseado na aba selecionada
   * - PENDING: Sempre online
   * - ACTIVE: Cache 30min
   * - COMPLETED: Cache 30min
   */
  const loadDeliveries = async () => {
    try {
      let results: any[] = [];

      switch (selectedTab) {
        case 'pending':
          // PENDING → Sempre online, ordenado por mais recente
          results = await deliveryPollingService.getPendingDeliveries(
            userLocation?.latitude,
            userLocation?.longitude,
            5000 // 5km de raio
          );
          break;

        case 'active':
          // ATIVAS → Cache 30min
          results = await deliveryPollingService.getMyActiveDeliveries(false);
          break;

        case 'completed':
          // COMPLETADAS → Cache 30min
          results = await deliveryPollingService.getMyCompletedDeliveries(false);
          break;
      }

      setDeliveries(results);
      console.log(`✅ ${results.length} entregas carregadas (${selectedTab})`);
      
      // Verifica se há delivery ativa após carregar
      await checkActiveDelivery();
    } catch (error) {
      console.error('❌ Erro ao carregar entregas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as entregas');
    }
  };

  /**
   * Pull-to-Refresh
   * PENDING: Sempre busca online
   * ACTIVE/COMPLETED: Força refresh (ignora cache)
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      let results: any[] = [];

      switch (selectedTab) {
        case 'pending':
          // PENDING → Sempre busca do backend
          results = await deliveryPollingService.getPendingDeliveries(
            userLocation?.latitude,
            userLocation?.longitude,
            5000
          );
          break;

        case 'active':
          // ATIVAS → Força refresh (ignora cache)
          results = await deliveryPollingService.getMyActiveDeliveries(true);
          break;

        case 'completed':
          // COMPLETADAS → Força refresh
          results = await deliveryPollingService.getMyCompletedDeliveries(true);
          break;
      }

      setDeliveries(results);
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      Alert.alert('Erro', 'Não foi possível atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    Alert.alert(
      'Aceitar Entrega',
      'Confirma que deseja aceitar esta entrega?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Usa o mesmo método do popup (com courierId no body)
              const response = await deliveryService.acceptDelivery(deliveryId);

              if (response.success) {
                // Invalida cache de ativas (agora tem uma nova)
                await deliveryPollingService.invalidateActiveCache();
                
                // Atualiza estado de delivery ativa
                setHasActiveDelivery(true);
                
                Alert.alert('Sucesso!', 'Entrega aceita com sucesso!');
                
                // Abre tela da entrega ativa
                onRideSelect(deliveryId);
              } else {
                Alert.alert('Erro', response.error || 'Não foi possível aceitar a entrega');
              }
            } catch (error) {
              console.error('❌ Erro ao aceitar entrega:', error);
              Alert.alert('Erro', 'Erro de conexão ao aceitar entrega');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectDelivery = async (deliveryId: string) => {
    await deliveryPollingService.markAsRejected(deliveryId);
    Alert.alert('Entrega Rejeitada', 'Esta entrega não será mais exibida para você.');
    loadDeliveries(); // Recarrega lista
  };

  const handleUnrejectDelivery = async (deliveryId: string) => {
    await deliveryPollingService.unmarkAsRejected(deliveryId);
    Alert.alert('Sucesso', 'Entrega disponível novamente');
    loadDeliveries(); // Recarrega
  };

  const confirmAcceptDelivery = (deliveryId: string, delivery: DeliveryItem) => {
    const clientName = getDeliveryClientName(delivery);
    const value = getDeliveryValue(delivery);
    const address = getDeliveryAddress(delivery);

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
    const status = item.status || "PENDING";
    const isRejected = item.locallyRejected === true;
    
    // Configuração do status - Se rejeitada, mostra badge vermelha
    let statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    if (isRejected) {
      statusInfo = { color: '#ef4444', icon: '❌', label: 'Rejeitada' };
    }

    // Função para formatar data
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Determinar qual timestamp mostrar baseado no status
    const getRelevantTimestamp = () => {
      if (item.completedAt) return { label: "✔️ Concluída em:", date: formatDate(item.completedAt) };
      if (item.inTransitAt) return { label: "🚚 Em trânsito desde:", date: formatDate(item.inTransitAt) };
      if (item.pickedUpAt) return { label: "📦 Coletada em:", date: formatDate(item.pickedUpAt) };
      if (item.acceptedAt) return { label: "✅ Aceita em:", date: formatDate(item.acceptedAt) };
      if (item.createdAt) return { label: "📅 Criada em:", date: formatDate(item.createdAt) };
      return null;
    };

    const timestampInfo = getRelevantTimestamp();

    return (
      <View style={[styles.deliveryCard, isRejected && styles.deliveryCardRejected]}>
        {/* Badge de Status (mostra "Rejeitada" em vermelho se foi rejeitada localmente) */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusBadgeIcon}>{statusInfo.icon}</Text>
          <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
        </View>
        
        {/* ID da Entrega */}
        <View style={styles.deliveryIdBadge}>
          <Text style={styles.deliveryIdLabel}>ID:</Text>
          <Text style={styles.deliveryIdValue}>#{item.id}</Text>
        </View>
        
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryInfo}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.deliveryValue}>{value}</Text>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>{distance}</Text>
          </View>
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>📍 Endereço:</Text>
          <Text style={styles.address}>{address}</Text>
        </View>

        {/* Timestamp relevante */}
        {timestampInfo && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampLabel}>{timestampInfo.label}</Text>
            <Text style={styles.timestampDate}>{timestampInfo.date}</Text>
          </View>
        )}

        <View style={styles.actionContainer}>
          {/* Sempre mostra botão Ver Detalhes */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onRideSelect(item.id)}
          >
            <Text style={styles.viewButtonText}>👁️ Ver Detalhes</Text>
          </TouchableOpacity>

          {/* Esconde botões de ação se houver delivery ativa */}
          {!hasActiveDelivery && (
            <>
              {isRejected ? (
                // Se foi rejeitada, mostra botão para desfazer
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: "#10b981" }]}
                  onPress={async () => {
                    await deliveryPollingService.unmarkAsRejected(item.id);
                    Alert.alert("✅ Rejeição Removida", "Esta entrega voltou a estar disponível para você.");
                    await loadDeliveries();
                  }}
                >
                  <Text style={styles.acceptButtonText}>Desfazer Rejeição</Text>
                </TouchableOpacity>
              ) : (
                // Se não foi rejeitada E status é PENDING, mostra botão aceitar
                status === 'PENDING' && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => confirmAcceptDelivery(item.id, item)}
                  >
                    <Text style={styles.acceptButtonText}>Aceitar</Text>
                  </TouchableOpacity>
                )
              )}
            </>
          )}

          {/* Mostra aviso se houver delivery ativa */}
          {hasActiveDelivery && selectedTab === 'pending' && (
            <View style={styles.blockedContainer}>
              <Text style={styles.blockedText}>
                🔒 Você já tem uma entrega ativa
              </Text>
            </View>
          )}
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
      <View style={[
        styles.header,
        Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight || 0 }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Entregas Disponíveis</Text>
          <Text style={styles.headerSubtitle}>
            {deliveries.length} entrega{deliveries.length !== 1 ? "s" : ""}{" "}
            {selectedTab === 'pending' ? 'pendente' : selectedTab === 'active' ? 'ativa' : 'concluída'}{deliveries.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Abas de filtro */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
            ⏳ Pendentes
          </Text>
          {selectedTab === 'pending' && (
            <View style={styles.tabIndicator} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            🚚 Ativa
          </Text>
          {selectedTab === 'active' && (
            <View style={styles.tabIndicator} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
          onPress={() => setSelectedTab('completed')}
        >
          <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
            ✔️ Concluídas
          </Text>
          {selectedTab === 'completed' && (
            <View style={styles.tabIndicator} />
          )}
        </TouchableOpacity>
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
        contentContainerStyle={[styles.listContainer, Platform.OS === 'android' && { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Nenhuma entrega {selectedTab === 'pending' ? 'pendente' : selectedTab === 'active' ? 'ativa' : 'concluída'}</Text>
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 20,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {
    // Estilo aplicado quando a aba está ativa
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#e94560",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#e94560",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
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
  deliveryCardRejected: {
    backgroundColor: "#2a1a1e",
    borderColor: "#ef4444",
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  deliveryIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  deliveryIdLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginRight: 4,
  },
  deliveryIdValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#60a5fa",
    fontFamily: "monospace",
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
  timestampContainer: {
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  timestampLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  timestampDate: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
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
  blockedContainer: {
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blockedText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
