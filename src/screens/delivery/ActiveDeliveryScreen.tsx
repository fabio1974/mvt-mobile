import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { deliveryService } from "../../services/deliveryService";
import { deliveryPollingService, PendingDelivery } from "../../services/deliveryPollingService";
import { unifiedLocationService } from "../../services/unifiedLocationService";
import ENV from "../../config/env";

interface ActiveDeliveryScreenProps {
  deliveryId: string;
  onBack: () => void;
  onComplete: () => void;
}

const statusConfig = {
  PENDING: { color: '#fbbf24', icon: '⏳', label: 'Aguardando' },
  ACCEPTED: { color: '#3b82f6', icon: '✅', label: 'Aceita' },
  PICKED_UP: { color: '#8b5cf6', icon: '📦', label: 'Coletada' },
  IN_TRANSIT: { color: '#06b6d4', icon: '🚚', label: 'Em Trânsito' },
  COMPLETED: { color: '#10b981', icon: '✔️', label: 'Concluída' },
  CANCELLED: { color: '#ef4444', icon: '❌', label: 'Cancelada' }
};

export default function ActiveDeliveryScreen({
  deliveryId,
  onBack,
  onComplete,
}: ActiveDeliveryScreenProps) {
  const insets = useSafeAreaInsets();
  const [delivery, setDelivery] = useState<PendingDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [courierLocation, setCourierLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const mapRef = useRef<MapView>(null);
  const fullscreenMapRef = useRef<MapView>(null);

  useEffect(() => {
    loadDelivery();
    
    // Só atualiza localização do motoboy se a entrega não está concluída ou cancelada
    if (delivery?.status === 'COMPLETED' || delivery?.status === 'CANCELLED') {
      return;
    }
    
    // Função para atualizar localização do motoboy
    const updateCourierLocation = async () => {
      try {
        const location = await unifiedLocationService.getCurrentLocation();
        if (location) {
          setCourierLocation({
            latitude: location.latitude,
            longitude: location.longitude
          });
        }
      } catch (error) {
        console.log('⚠️ Erro ao obter localização do motoboy:', error);
      }
    };
    
    // Pega localização inicial
    updateCourierLocation();
    
    // Atualiza localização a cada 5 segundos
    const locationInterval = setInterval(updateCourierLocation, 5000);
    
    return () => clearInterval(locationInterval);
  }, [deliveryId, delivery?.status]);

  // Auto-zoom do mapa para mostrar todos os marcadores
  useEffect(() => {
    if (!delivery?.fromLatitude || !delivery?.fromLongitude || 
        !delivery?.toLatitude || !delivery?.toLongitude) {
      return;
    }

    const currentStatus = delivery.status || 'ACCEPTED';

    // Aguarda um momento para o mapa renderizar
    setTimeout(() => {
      const coordinates = [
        { latitude: delivery.fromLatitude, longitude: delivery.fromLongitude },
        { latitude: delivery.toLatitude, longitude: delivery.toLongitude },
      ];

      // Adiciona localização do motoboy se disponível e entrega ativa
      if (courierLocation && currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') {
        coordinates.push({
          latitude: courierLocation.latitude,
          longitude: courierLocation.longitude,
        });
      }

      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 500);
  }, [delivery, courierLocation]);

  // Auto-zoom para o mapa fullscreen quando abrir
  useEffect(() => {
    if (!fullscreenMap || !delivery?.fromLatitude || !delivery?.fromLongitude || 
        !delivery?.toLatitude || !delivery?.toLongitude) {
      return;
    }

    const currentStatus = delivery.status || 'ACCEPTED';

    setTimeout(() => {
      const coordinates = [
        { latitude: delivery.fromLatitude, longitude: delivery.fromLongitude },
        { latitude: delivery.toLatitude, longitude: delivery.toLongitude },
      ];

      if (courierLocation && currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED') {
        coordinates.push({
          latitude: courierLocation.latitude,
          longitude: courierLocation.longitude,
        });
      }

      fullscreenMapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 500);
  }, [fullscreenMap, delivery, courierLocation]);

  const loadDelivery = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Carregando detalhes da entrega ${deliveryId}...`);
      
      // 🔄 SINCRONIZA COM BACKEND PRIMEIRO (para garantir dados atualizados)
      try {
        const { deliveryService } = require('../../services/deliveryService');
        const backendResponse = await deliveryService.getDeliveryById(deliveryId);
        
        if (backendResponse.success && backendResponse.data) {
          console.log(`🌐 Dados do backend recebidos - Status: ${backendResponse.data.status}`);
          // Atualiza no storage com dados do backend
          await deliveryPollingService.updateDeliveryInStorage(deliveryId, backendResponse.data);
        }
      } catch (syncError) {
        console.log('⚠️ Falha ao sincronizar com backend (continuando com cache):', syncError);
      }
      
      // Busca do cache de entregas ativas
      const activeDeliveries = await deliveryPollingService.getMyActiveDeliveries(false);
      const found = activeDeliveries.find(d => d.id === deliveryId);
      
      if (found) {
        console.log(`✅ Entrega ${deliveryId} carregada do cache de ativas:`, found.status);
        console.log(`📦 Detalhes completos:`, JSON.stringify(found, null, 2));
        setDelivery(found);
      } else {
        console.error(`❌ Entrega ${deliveryId} não encontrada no cache de ativas`);
        Alert.alert(
          "Erro", 
          "Entrega não encontrada no cache de ativas. Tente atualizar a lista.",
          [{ text: "OK", onPress: () => onBack() }]
        );
      }
    } catch (error) {
      console.error("Erro ao carregar entrega:", error);
      Alert.alert("Erro", "Não foi possível carregar os detalhes da entrega");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string, confirmMessage: string) => {
    Alert.alert(
      "Confirmar Ação",
      confirmMessage,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setUpdating(true);
              
              const response = await deliveryService.updateDeliveryStatus(
                deliveryId,
                newStatus
              );

              if (response.success) {
                Alert.alert("Sucesso!", response.message || "Status atualizado");
                
                // Recarrega entrega
                await loadDelivery();
                
                // Se completou, volta para dashboard
                if (newStatus === 'COMPLETED') {
                  setTimeout(() => onComplete(), 1500);
                }
              } else {
                Alert.alert("Erro", response.error || "Não foi possível atualizar");
              }
            } catch (error) {
              console.error("Erro ao atualizar status:", error);
              Alert.alert("Erro", "Erro de conexão");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handlePickUp = async () => {
    Alert.alert(
      '📦 Confirmar Coleta',
      'Confirmar que você coletou o item no local de origem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              
              const response = await deliveryService.pickupDelivery(deliveryId);

              if (response.success) {
                Alert.alert("Sucesso!", response.message || "Item coletado");
                await loadDelivery();
              } else {
                Alert.alert("Erro", response.error || "Não foi possível coletar");
              }
            } catch (error) {
              console.error("Erro ao coletar:", error);
              Alert.alert("Erro", "Erro de conexão");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleStartTransit = async () => {
    Alert.alert(
      '🚚 Iniciar Viagem',
      'Iniciar a viagem para o destino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              
              const response = await deliveryService.startTransitDelivery(deliveryId);

              if (response.success) {
                Alert.alert("Sucesso!", response.message || "Em trânsito");
                await loadDelivery();
              } else {
                Alert.alert("Erro", response.error || "Não foi possível iniciar");
              }
            } catch (error) {
              console.error("Erro ao iniciar trânsito:", error);
              Alert.alert("Erro", "Erro de conexão");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    Alert.alert(
      '✅ Finalizar Entrega',
      'Confirmar que a entrega foi realizada com sucesso?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              
              const response = await deliveryService.completeDelivery(deliveryId);

              if (response.success) {
                Alert.alert("Sucesso!", response.message || "Entrega completada");
                setTimeout(() => onComplete(), 1500);
              } else {
                Alert.alert("Erro", response.error || "Não foi possível completar");
              }
            } catch (error) {
              console.error("Erro ao completar:", error);
              Alert.alert("Erro", "Erro de conexão");
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    Alert.prompt(
      "Cancelar Entrega",
      "Informe o motivo do cancelamento:",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar Cancelamento",
          style: "destructive",
          onPress: async (reason: string | undefined) => {
            try {
              setUpdating(true);
              
              const response = await deliveryService.cancelDelivery(
                deliveryId,
                reason || 'Sem motivo informado'
              );

              if (response.success) {
                Alert.alert(
                  "Entrega Cancelada",
                  "A entrega foi cancelada e voltou para o status PENDING.",
                  [{ text: "OK", onPress: () => onBack() }]
                );
              } else {
                Alert.alert("Erro", response.error || "Não foi possível cancelar");
              }
            } catch (error) {
              console.error("Erro ao cancelar:", error);
              Alert.alert("Erro", "Erro de conexão");
            } finally {
              setUpdating(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcula distância entre dois pontos usando fórmula de Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Arredonda para 1 casa decimal
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Carregando entrega...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Entrega não encontrada</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Função auxiliar para renderizar os marcadores e rotas do mapa
  const renderMapContent = () => {
    if (!delivery) return null;

    return (
      <>
        {/* Marcador de Origem */}
        <Marker
          coordinate={{
            latitude: delivery.fromLatitude,
            longitude: delivery.fromLongitude,
          }}
          title="Origem"
          description={delivery.pickupAddress}
        >
          <View style={styles.originMarker}>
            <Text style={styles.markerText}>📍</Text>
          </View>
        </Marker>
        
        {/* Marcador de Destino */}
        <Marker
          coordinate={{
            latitude: delivery.toLatitude,
            longitude: delivery.toLongitude,
          }}
          title="Destino"
          description={delivery.dropoffAddress}
        >
          <View style={styles.destinationMarker}>
            <Text style={styles.markerText}>🎯</Text>
          </View>
        </Marker>
        
        {/* Marcador do Motoboy - Só mostra se não está concluída/cancelada */}
        {courierLocation && currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED' && (
          <Marker
            coordinate={{
              latitude: courierLocation.latitude,
              longitude: courierLocation.longitude,
            }}
            title="🏍️ Você está aqui"
            description="Sua localização atual"
          >
            <View style={styles.courierMarker}>
              <Text style={styles.courierMarkerText}>🏍️</Text>
            </View>
          </Marker>
        )}
        
        {/* Linha da Rota Planejada (Origem → Destino) */}
        <Polyline
          coordinates={[
            {
              latitude: delivery.fromLatitude,
              longitude: delivery.fromLongitude,
            },
            {
              latitude: delivery.toLatitude,
              longitude: delivery.toLongitude,
            },
          ]}
          strokeColor="#94a3b8"
          strokeWidth={2}
          lineDashPattern={[10, 5]}
        />
        
        {/* Linha da Rota do Motoboy até o Próximo Ponto - Só mostra se não está concluída/cancelada */}
        {courierLocation && currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED' && (
          <Polyline
            coordinates={[
              {
                latitude: courierLocation.latitude,
                longitude: courierLocation.longitude,
              },
              // Se ainda não coletou, vai para origem. Senão, vai para destino
              currentStatus === 'ACCEPTED' 
                ? {
                    latitude: delivery.fromLatitude,
                    longitude: delivery.fromLongitude,
                  }
                : {
                    latitude: delivery.toLatitude,
                    longitude: delivery.toLongitude,
                  }
            ]}
            strokeColor="#e94560"
            strokeWidth={3}
          />
        )}
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Carregando entrega...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Entrega não encontrada</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = delivery.status || 'ACCEPTED';
  const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.ACCEPTED;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={[
          styles.header,
          Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight || 0 },
        ]}
      >
        <TouchableOpacity style={styles.headerBackButton} onPress={onBack}>
          <Text style={styles.headerBackButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED' 
            ? `Detalhes da Entrega #${delivery.id}` 
            : `Entrega Ativa #${delivery.id}`}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? insets.bottom + 20 : 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>

        {/* Mapa da Rota */}
        {delivery.fromLatitude && delivery.fromLongitude && 
         delivery.toLatitude && delivery.toLongitude && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>🗺️ Mapa da Rota #{delivery.id}</Text>
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={() => setFullscreenMap(true)}
              >
                <Text style={styles.expandButtonText}>⛶</Text>
              </TouchableOpacity>
            </View>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: (delivery.fromLatitude + delivery.toLatitude) / 2,
                longitude: (delivery.fromLongitude + delivery.toLongitude) / 2,
                latitudeDelta: Math.abs(delivery.fromLatitude - delivery.toLatitude) * 2 || 0.05,
                longitudeDelta: Math.abs(delivery.fromLongitude - delivery.toLongitude) * 2 || 0.05,
              }}
            >
              {renderMapContent()}
            </MapView>
          </View>
        )}

        {/* Informações da Entrega */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Detalhes da Entrega</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distância:</Text>
            <Text style={styles.infoValue}>
              {delivery.fromLatitude && delivery.fromLongitude && 
               delivery.toLatitude && delivery.toLongitude
                ? `${calculateDistance(
                    delivery.fromLatitude,
                    delivery.fromLongitude,
                    delivery.toLatitude,
                    delivery.toLongitude
                  )} km`
                : `${delivery.distance || 0} km`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valor:</Text>
            <Text style={[styles.infoValue, styles.valueHighlight]}>
              R$ {delivery.estimatedPayment?.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        {/* Endereços */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Origem</Text>
          <Text style={styles.address}>{delivery.pickupAddress}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Destino</Text>
          <Text style={styles.address}>{delivery.dropoffAddress}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Histórico</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Criada</Text>
              <Text style={styles.timelineDate}>{formatDate(delivery.createdAt)}</Text>
            </View>
          </View>

          {delivery.acceptedAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#3b82f6' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>✅ Aceita</Text>
                <Text style={styles.timelineDate}>{formatDate(delivery.acceptedAt)}</Text>
              </View>
            </View>
          )}

          {delivery.pickedUpAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#8b5cf6' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>📦 Coletada</Text>
                <Text style={styles.timelineDate}>{formatDate(delivery.pickedUpAt)}</Text>
              </View>
            </View>
          )}

          {delivery.inTransitAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#06b6d4' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>🚚 Em Trânsito</Text>
                <Text style={styles.timelineDate}>{formatDate(delivery.inTransitAt)}</Text>
              </View>
            </View>
          )}

          {delivery.completedAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#10b981' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>✔️ Concluída</Text>
                <Text style={styles.timelineDate}>{formatDate(delivery.completedAt)}</Text>
              </View>
            </View>
          )}

          {delivery.cancelledAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#ef4444' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>❌ Cancelada</Text>
                <Text style={styles.timelineDate}>{formatDate(delivery.cancelledAt)}</Text>
                {delivery.cancellationReason && (
                  <Text style={styles.timelineReason}>Motivo: {delivery.cancellationReason}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Botões de Ação */}
        {currentStatus !== 'COMPLETED' && currentStatus !== 'CANCELLED' && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>🎯 Ações</Text>

            {currentStatus === 'ACCEPTED' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                onPress={handlePickUp}
                disabled={updating}
              >
                <Text style={styles.actionButtonText}>
                  📦 Coletar Item
                </Text>
              </TouchableOpacity>
            )}

            {currentStatus === 'PICKED_UP' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#06b6d4' }]}
                onPress={handleStartTransit}
                disabled={updating}
              >
                <Text style={styles.actionButtonText}>
                  🚚 Iniciar Viagem
                </Text>
              </TouchableOpacity>
            )}

            {currentStatus === 'IN_TRANSIT' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={handleComplete}
                disabled={updating}
              >
                <Text style={styles.actionButtonText}>
                  ✔️ Entrega Realizada
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                ❌ Cancelar Entrega
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {updating && (
          <View style={styles.updatingOverlay}>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={styles.updatingText}>Atualizando...</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Mapa em Tela Cheia */}
      <Modal
        visible={fullscreenMap}
        animationType="slide"
        onRequestClose={() => setFullscreenMap(false)}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <StatusBar style="light" />
          
          {/* Header do Modal */}
          <View
            style={[
              styles.fullscreenHeader,
              Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight || 0 },
            ]}
          >
            <TouchableOpacity 
              style={styles.fullscreenCloseButton}
              onPress={() => setFullscreenMap(false)}
            >
              <Text style={styles.fullscreenCloseButtonText}>✕ Fechar</Text>
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>
              🗺️ Mapa Completo - Entrega #{delivery?.id}
            </Text>
          </View>

          {/* Mapa em Tela Cheia */}
          {delivery?.fromLatitude && delivery?.fromLongitude && 
           delivery?.toLatitude && delivery?.toLongitude && (
            <MapView
              ref={fullscreenMapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.fullscreenMap}
              initialRegion={{
                latitude: (delivery.fromLatitude + delivery.toLatitude) / 2,
                longitude: (delivery.fromLongitude + delivery.toLongitude) / 2,
                latitudeDelta: Math.abs(delivery.fromLatitude - delivery.toLatitude) * 2 || 0.05,
                longitudeDelta: Math.abs(delivery.fromLongitude - delivery.toLongitude) * 2 || 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
            >
              {renderMapContent()}
            </MapView>
          )}
        </SafeAreaView>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    marginBottom: 20,
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
  headerBackButton: {
    marginRight: 16,
  },
  headerBackButtonText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#262640",
    overflow: "hidden",
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  courierMarker: {
    backgroundColor: "#e94560",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 24,
  },
  originMarker: {
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationMarker: {
    backgroundColor: "#10b981",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
  },
  section: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#262640",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 14,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  valueHighlight: {
    color: "#10b981",
    fontWeight: "bold",
    fontSize: 16,
  },
  address: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#94a3b8",
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  timelineDate: {
    color: "#94a3b8",
    fontSize: 12,
  },
  timelineReason: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 40,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#374151",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  updatingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  updatingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 12,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  expandButton: {
    backgroundColor: "#374151",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  expandButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  fullscreenCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#374151",
    borderRadius: 8,
    marginRight: 16,
  },
  fullscreenCloseButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  fullscreenTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  fullscreenMap: {
    flex: 1,
  },
});
